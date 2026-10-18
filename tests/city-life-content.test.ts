import { describe, expect, it } from 'vitest';
import {
  cityLifeJourneys, cityLifeNarrationCues, cityLifeNarrationSegments, cityLifeSources, getCityLifeJourney,
} from '../src/data/cityLifeJourney';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';

const sourceCatalog = new Map(cityLifeSources.map(source => [source.id, source]));
const cities = ['nyingchi', 'lhasa', 'ngari'] as const;
const stageIds = ['environment', 'life', 'history'];
const stage = (cityId: string, stageId: string) => getCityLifeJourney(cityId)!.stages.find(item => item.id === stageId)!;

describe('城市环境、生活与历史使用同一条有据的认识线', () => {
  it('九段旁白分成27条连续音频，逐拍拼接完整保留原文且与场景一一对应', () => {
    expect(cityLifeJourneys.map(journey => journey.cityId)).toEqual(cities);
    expect(getCityLifeJourney('unknown-place')).toBeUndefined();
    expect(cityLifeNarrationSegments('unknown-place', 'environment')).toEqual([]);
    expect(cityLifeNarrationCues).toHaveLength(27);
    expect(new Set(cityLifeNarrationCues.map(cue => cue.id)).size).toBe(27);
    for (const journey of cityLifeJourneys) {
      expect(journey.stages.map(item => item.id)).toEqual(stageIds);
      expect(journey.lifeChain).toHaveLength(3);
      for (const item of journey.stages) {
        expect(item.beats.map(beat => beat.at)).toEqual([0, .34, .68]);
        expect(item.narration.length).toBeGreaterThanOrEqual(100);
        expect(item.narration.length).toBeLessThanOrEqual(300);
        expect(item.bridge.trim()).not.toBe('');
        for (const beat of item.beats) {
          expect(beat.title.trim()).not.toBe('');
          expect(beat.text.length).toBeGreaterThanOrEqual(40);
          expect(beat.text.length).toBeLessThanOrEqual(100);
        }
        const segments = cityLifeNarrationSegments(journey.cityId, item.id);
        expect(segments).toHaveLength(3);
        expect(segments.map(segment => segment.text).join('')).toBe(item.narration);
        expect(segments[0].start).toBe(0);
        expect(segments.at(-1)!.end).toBe(1);
        segments.forEach((segment, index) => {
          expect(segment.id).toBe(`CITY-${journey.cityId}-${item.id}-${index + 1}`);
          expect(segment.text.trim()).not.toBe('');
          expect(segment.start).toBe(item.beats[index].at);
          expect(segment.end).toBeGreaterThan(segment.start);
          if (index > 0) expect(segment.start).toBe(segments[index - 1].end);
          expect(cityLifeNarrationCues.find(cue => cue.id === segment.id)).toMatchObject({
            title: item.title, narration: segment.text, stepId: `CITY-${journey.cityId}`, chapterId: 'cities',
          });
        });
      }
    }
  });

  it('每段与每条历史材料都有可解析的一手资料，地图只引用已核实的聚居地', () => {
    expect(sourceCatalog.size).toBe(cityLifeSources.length);
    const allowedReferences = new Set(['nyingchi', 'lulang', 'lhasa', 'ngari', 'tholing']);
    const usedSources = new Set<string>();
    for (const journey of cityLifeJourneys) {
      for (const item of [...journey.stages, ...journey.historyMilestones]) {
        expect(item.sourceIds.length).toBeGreaterThan(0);
        for (const id of item.sourceIds) {
          usedSources.add(id);
          const source = sourceCatalog.get(id);
          expect(source, id).toBeDefined();
          expect(new URL(source!.url).protocol).toBe('https:');
          expect(source!.title.trim()).not.toBe('');
          expect(source!.note.trim()).not.toBe('');
        }
      }
      for (const milestone of journey.historyMilestones) {
        expect(allowedReferences.has(milestone.referenceId), milestone.title).toBe(true);
        const reference = verifiedPlaceReferences[milestone.referenceId];
        expect(reference, milestone.referenceId).toBeDefined();
        expect(reference.kind).toBe('settlement-reference');
        expect(milestone).not.toHaveProperty('longitude');
        expect(milestone).not.toHaveProperty('latitude');
      }
    }
    expect([...usedSources].sort()).toEqual(cityLifeSources.map(source => source.id).sort());
  });

  it('历史三拍与同顺序的材料对应，避免旁白讲一个对象而地图指向另一个', () => {
    const topics = {
      nyingchi: [/工布新年|2006/, /鲁朗|2016/, /服饰|2026/],
      lhasa: [/大昭寺|7世纪/, /白宫|1645/, /红宫|1694/],
      ngari: [/托林|11—12世纪/, /阿底峡|1042/, /札布让|2020/],
    };
    const spokenTopics = {
      nyingchi: [/二〇〇六年.*工布新年/, /二〇一六年.*鲁朗/, /二〇二六年.*工布服饰/],
      lhasa: [/大昭寺.*七世纪/, /十七世纪.*五世达赖喇嘛.*白宫/, /桑结嘉措.*红宫.*一六九四年/],
      ngari: [/札达.*托林.*十一至十二世纪/, /阿底峡.*一〇四二年.*托林/, /二〇二〇年.*古格.*金珠德吉/],
    };
    for (const cityId of cities) {
      const journey = getCityLifeJourney(cityId)!;
      const history = stage(cityId, 'history');
      const segments = cityLifeNarrationSegments(cityId, 'history');
      expect(journey.historyMilestones).toHaveLength(history.beats.length);
      journey.historyMilestones.forEach((milestone, index) => {
        expect(`${milestone.date}${milestone.title}${milestone.text}`).toMatch(topics[cityId][index]);
        expect(`${history.beats[index].title}${history.beats[index].text}`).toMatch(topics[cityId][index]);
        expect(segments[index].text).toMatch(spokenTopics[cityId][index]);
        for (const id of milestone.sourceIds) expect(history.sourceIds).toContain(id);
      });
    }
  });

  it('拉萨供水使用有年份的地下水材料，不将旧规划当作当前结果或河水直供', () => {
    const life = stage('lhasa', 'life');
    expect(life.narration).toMatch(/二〇二二年.*当时.*地下水/);
    expect(life.narration).toContain('地下取水向上提升的原理');
    expect(life.narration).toContain('取供水设施');
    expect(life.scope).toContain('现状与规划分别阅读');
    expect(life.scope).toMatch(/深度无比例.*未定位井口或管网/);
    expect(sourceCatalog.get('city-life-lhasa-water-2022')!.note).toContain('规划目标不能当作今天已完成结果');
    expect(sourceCatalog.get('city-life-lhasa-valley')!.note).toMatch(/2005.*历史影像.*不是当前/);
  });

  it('鲁朗地方联系与现代小镇有明确范围，不能变成实测道路或古代建筑复原', () => {
    const life = stage('nyingchi', 'life');
    expect(life.scope).toMatch(/不是318国道实测线形/);
    expect(life.scope).toMatch(/维护对照.*不代表真实停运/);
    const source = sourceCatalog.get('city-life-lulang-2016')!;
    expect(source.note).toContain('正文日期2016-10-02');
    expect(source.note).toMatch(/风格.*再现.*不能当作古代原貌/);
    expect(source.note).toMatch(/当年状态不等于今天/);
    expect(sourceCatalog.get('city-life-sejila-route-2022')!.note).toMatch(/2022.*色季拉山.*鲁朗/);
    expect(sourceCatalog.get('city-life-sejila-project-2023')!.note).toMatch(/2023.*建设计划不能当作已通车结果/);
    expect(stage('nyingchi', 'history').beats[0].text).toContain('不是节日从这一年才出现');
  });

  it('阿里生活的狮泉河与历史的札达分别定位，不从冬灌推导古格历史', () => {
    const life = stage('ngari', 'life');
    const history = stage('ngari', 'history');
    expect(life.narration).toMatch(/狮泉河盆地.*二〇二三年.*伦珠.*开闸.*林地.*不还原渠系/);
    expect(life.bridge).toMatch(/移到札达与托林/);
    expect(history.narration).toMatch(/^先离开狮泉河.*札达.*托林/);
    expect(history.beats[0].text).toContain('不能由狮泉河冬灌直接推导古格历史');
    expect(history.scope).toMatch(/托林镇参考点不等于托林寺、古格遗址或札布让村坐标/);
    expect(getCityLifeJourney('ngari')!.historyMilestones.every(item => item.referenceId === 'tholing')).toBe(true);
    expect(sourceCatalog.get('city-life-zanda-life-2020')!.note).toMatch(/2020-07-30.*不把旧收入或接待量用于今天/);
  });

  it('三城生活音频按通行、用水、空间分拍，原理动作与真实材料边界一致', () => {
    const topics = {
      nyingchi: [
        /地形试线.*高差.*色季拉越岭.*不是公路/,
        /水珠沿坡面下降.*自然过程.*不表示城镇供水/,
        /鲁朗窗口.*相对低缓.*二〇一六年.*水系、山景与村落/,
      ],
      lhasa: [
        /真实高程剖面.*谷底.*山地.*通行.*不是道路/,
        /地下取水向上提升.*二〇二二年.*当时.*地下水.*取供水设施/,
        /低缓空间.*七世纪大昭寺.*十七世纪布达拉.*历史/,
      ],
      ngari: [
        /狮泉河盆地.*高程剖面.*高差.*试线.*通行/,
        /闸口.*二〇二三年.*伦珠.*开闸.*林地.*不还原渠系/,
        /相对低缓.*管护.*另一处地方.*札达和托林/,
      ],
    };
    for (const cityId of cities) {
      const life = stage(cityId, 'life');
      const segments = cityLifeNarrationSegments(cityId, 'life');
      segments.forEach((segment, index) => {
        expect(segment.text).toMatch(topics[cityId][index]);
        expect(life.beats[index].title).toMatch([/通行/, /水/, /空间/][index]);
      });
      expect(life.scope).toMatch(/非道路|不是318国道实测线形/);
      expect(life.scope).toMatch(/非城界|不是市界/);
    }
  });

  it('环境不能直接决定文化，三地都用人物、组织或传习解释人的行动', () => {
    expect(stage('nyingchi', 'history').narration).toContain('工布文化不能由森林和雨量直接推出');
    expect(stage('nyingchi', 'history').narration).toMatch(/图书馆.*博物馆.*学习和参与/);
    expect(stage('lhasa', 'history').narration).toMatch(/五世达赖喇嘛.*桑结嘉措.*不能单靠气候或山地解释/);
    expect(stage('ngari', 'history').narration).toMatch(/教师、文本和艺术.*阿底峡.*金珠德吉/);
    for (const journey of cityLifeJourneys) {
      expect(journey.maintenanceFeedback.maintained).toContain('教学条件');
      expect(journey.maintenanceFeedback.unmaintained).toMatch(/教学条件|教学对照/);
      expect(journey.maintenanceFeedback.unmaintained).toMatch(/不是.*(?:实际|报告)/);
    }
  });

  it('来流和建设年代保留研究适用范围，不捏造城市统计值', () => {
    expect(sourceCatalog.get('city-life-southeast-moisture')!.note).toMatch(/1940—2020年夏季.*不是全林芝全年统一风场/);
    const palace = sourceCatalog.get('city-life-potala-research')!;
    expect(palace.note).toMatch(/白宫1645—1648年、红宫1690—1694年/);
    expect(stage('lhasa', 'history').scope).toMatch(/不生成.*精确坐标与复原模型/);
    const prose = cityLifeJourneys.flatMap(journey => [journey.summary, ...journey.stages.flatMap(item => [item.narration, ...item.beats.map(beat => beat.text)])]).join('');
    expect(prose).not.toMatch(/\d[\d.,—–～~]*\s*(?:米|毫米|℃|°C|万人|亿元|平方公里|km²|mm\b|%)/i);
    expect(prose).not.toMatch(/(?:GDP|人均收入|年均气温|年降水量|常住人口)\s*[为是：:]/i);
  });
});
