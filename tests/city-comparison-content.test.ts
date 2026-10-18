import { describe, expect, it } from 'vitest';
import { cityComparisonNarrationCues, cityComparisonSources, cityComparisonStages } from '../src/data/cityComparison';
import { getCityLifeJourney } from '../src/data/cityLifeJourney';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import { cityAccessChanges } from '../src/data/cityAccessChange';
import { cityAccessCities, cityAccessPhases } from '../src/lib/cityAccessState';
import { cityContinuityLessons } from '../src/data/cityContinuityLessons';
import { isCityContinuityLessonStage } from '../src/lib/cityContinuityState';

describe('三地同图比较的资料与同步说明', () => {
  it('九段保留三城结构，历史联系旅行各九条、现代发展十二条，合计五十四条独立录音', () => {
    expect(cityComparisonStages.map(stage => stage.id)).toEqual(['climate', 'terrain', 'mobility', 'water', 'settlement', 'history', 'development', 'connections', 'travel']);
    expect(cityComparisonNarrationCues).toHaveLength(54);
    expect(new Set(cityComparisonNarrationCues.map(cue => cue.id)).size).toBe(54);
    for (const stage of cityComparisonStages) {
      expect(stage.beats.map(beat => beat.at)).toEqual([0, .34, .68]);
      expect(stage.narration).toBe(stage.beats.map(beat => beat.narration).join(''));
      expect(stage.narration.length).toBeGreaterThanOrEqual(100);
      expect(stage.narration.length).toBeLessThanOrEqual(stage.id === 'development' ? 12 * 115 : isCityContinuityLessonStage(stage.id) ? 9 * 90 : 300);
      stage.beats.forEach((beat, index) => {
        expect(beat.narration.trim()).not.toBe('');
        expect(beat.text.trim()).not.toBe('');
        if (stage.id === 'development') {
          const cityId = cityAccessCities[index];
          const spoken = cityAccessPhases.map(phase => {
            const narration = cityAccessChanges[cityId][phase.id].narration;
            expect(cityComparisonNarrationCues.find(cue => cue.id === `ACCESS-${cityId}-${phase.id}`)).toMatchObject({
              narration, stepId: 'COMPARE-development', chapterId: 'comparison',
            });
            return narration;
          });
          expect(beat.narration).toBe(spoken.join(''));
          expect(cityComparisonNarrationCues.some(cue => cue.id === `COMPARE-development-${index + 1}`)).toBe(false);
        } else if(isCityContinuityLessonStage(stage.id)) {
          const parts=cityContinuityLessons[stage.id][cityAccessCities[index]];
          expect(beat.narration).toBe(parts.map(part=>part.narration).join(''));
          for(const part of parts){
            expect(cityComparisonNarrationCues.find(cue=>cue.id===part.id)).toMatchObject({
              title:part.title,narration:part.narration,stepId:`COMPARE-${stage.id}`,chapterId:'comparison',
            });
            expect(part.sourceIds.every(id=>stage.sourceIds.includes(id))).toBe(true);
          }
          expect(cityComparisonNarrationCues.some(cue=>cue.id===`COMPARE-${stage.id}-${index+1}`)).toBe(false);
        } else {
          expect(cityComparisonNarrationCues.find(cue => cue.id === `COMPARE-${stage.id}-${index + 1}`)).toMatchObject({
            narration: beat.narration, title: beat.title, stepId: `COMPARE-${stage.id}`, chapterId: 'comparison',
          });
        }
      });
    }
  });

  it('每段包含三地可解析的城市参照与至少两条已注册资料', () => {
    const sources = new Map(cityComparisonSources.map(source => [source.id, source]));
    expect(sources.size).toBe(cityComparisonSources.length);
    const used = new Set<string>();
    for (const stage of cityComparisonStages) {
      expect(Object.keys(stage.cityNotes).sort()).toEqual(['lhasa', 'ngari', 'nyingchi']);
      for (const [cityId, note] of Object.entries(stage.cityNotes)) {
        expect(verifiedPlaceReferences[cityId]?.kind).toBe('settlement-reference');
        expect(getCityLifeJourney(cityId)).toBeDefined();
        expect(note.trim()).not.toBe('');
      }
      expect(new Set(stage.sourceIds).size).toBeGreaterThanOrEqual(2);
      for (const id of stage.sourceIds) {
        used.add(id);
        expect(sources.has(id), id).toBe(true);
        expect(new URL(sources.get(id)!.url).protocol).toBe('https:');
        expect(sources.get(id)!.note.trim()).not.toBe('');
      }
    }
    expect([...used].sort()).toEqual(cityComparisonSources.map(source => source.id).sort());
  });

  it('动态实验保留共同初始条件，不把雨滴数量伪装成三地的气候排行', () => {
    const climate = cityComparisonStages[0];
    expect(climate.scope).toContain('相同初始水汽条件');
    expect(climate.beats[0].text).toContain('相同初始水汽条件');
    expect(climate.scope).toContain('雨滴数量不代表三地气候雨量排行');
    expect(climate.scope).toContain('不是同期站点气候均值或某日风场');
    expect(climate.narration).toMatch(/夏季水汽.*藏东南/);
    expect(climate.narration).toMatch(/拉萨.*干湿季明显/);
    expect(climate.narration).toContain('有水汽不等于一定下雨');
    expect(climate.cityNotes.ngari).toContain('少雨不等于无水汽');
  });

  it('同一高程基准区分谷底与海拔，不制造城市均值或小尺度测绘精度', () => {
    const terrain = cityComparisonStages[1];
    expect(terrain.narration).toContain('同一个海拔基准');
    expect(terrain.beats[1].narration).toContain('平缓就不再等于海拔低');
    expect(terrain.scope).toContain('同一公开高程网格');
    expect(terrain.scope).toContain('三地统一夸张倍率');
    expect(terrain.scope).toContain('不是城市平均海拔或地面测量');
    expect(cityComparisonSources.find(source => source.id === 'comparison-terrain-grid')!.note).toMatch(/粗网格采样.*不是.*城区平均高程/);
  });

  it('通行、用水、空间分开讲清，并保留真实资料的适用范围', () => {
    const mobility = cityComparisonStages.find(stage => stage.id === 'mobility')!;
    const water = cityComparisonStages.find(stage => stage.id === 'water')!;
    const settlement = cityComparisonStages.find(stage => stage.id === 'settlement')!;
    expect(mobility.scope).toContain('不是实际道路或工程选线');
    expect(mobility.beats[0].narration).toMatch(/林芝.*高程.*山岭.*鲁朗/);
    expect(water.beats[1].narration).toMatch(/二〇二二年.*当时.*地下水.*提升/);
    expect(water.beats[2].text).toMatch(/2023年.*狮泉河.*伦珠.*冬灌/);
    expect(water.scope).toContain('不是地下含水层、水井、管网或灌区测绘');
    expect(settlement.beats[1].narration).toMatch(/拉萨.*河谷.*历史.*大昭寺.*布达拉宫/);
    expect(settlement.beats[2].narration).toContain('札达托林是另一处历史地方');
    expect(settlement.beats[2].narration).toContain('接下来保留三地整体，从林芝');
    expect(settlement.scope).toContain('不由自然环境决定文化');
  });

  it('旁白每拍与正在比较的地区对应，不新增没有共同口径的气候数字', () => {
    for (const stage of cityComparisonStages) {
      expect(stage.beats[0].narration).toContain('林芝');
      expect(stage.beats[1].narration).toContain('拉萨');
      expect(stage.beats[2].narration).toMatch(/阿里|狮泉河/);
      const learnerText = [stage.narration, ...stage.beats.map(beat => beat.text), ...Object.values(stage.cityNotes)].join('');
      expect(learnerText).not.toMatch(/\d[\d.,—–～~]*\s*(?:米|毫米|℃|°C|平方公里|km²|mm\b|%)/i);
      expect(learnerText).not.toMatch(/(?:年均气温|年降水量|湿度|水汽通量)\s*[为是：:]/);
    }
  });
});
