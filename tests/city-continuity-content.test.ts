import { describe, expect, it } from 'vitest';
import { cityContinuityReferences, cityContinuitySceneCues, cityContinuitySources, cityContinuityStages, cityContinuityTravelStops } from '../src/data/cityContinuity';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import {cityAccessChanges} from '../src/data/cityAccessChange';
import {cityAccessCities,cityAccessPhases} from '../src/lib/cityAccessState';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {isCityContinuityLessonStage} from '../src/lib/cityContinuityState';

describe('文化历史到现代联系与旅行的真实材料', () => {
  it('四个连续问题保留三城摘要，历史联系旅行各城三段，现代发展各城四环均回到实际旁白', () => {
    expect(cityContinuityStages.map(stage => stage.id)).toEqual(['history', 'development', 'connections', 'travel']);
    for (const stage of cityContinuityStages) {
      expect(stage.beats.map(beat => beat.at)).toEqual([0, .34, .68]);
      expect(stage.narration).toBe(stage.beats.map(beat => beat.narration).join(''));
      expect(stage.narration.length).toBeGreaterThanOrEqual(100);
      expect(stage.narration.length).toBeLessThanOrEqual(stage.id === 'development' ? 12 * 115 : 9 * 90);
      if(stage.id==='development')stage.beats.forEach((beat,index)=>{
        expect(beat.narration).toBe(cityAccessPhases.map(phase=>cityAccessChanges[cityAccessCities[index]][phase.id].narration).join(''));
      });
      else if(isCityContinuityLessonStage(stage.id)){
        const lesson=cityContinuityLessons[stage.id];
        stage.beats.forEach((beat,index)=>{
          const parts=lesson[cityAccessCities[index]];
          expect(parts).toHaveLength(3);
          expect(beat.narration).toBe(parts.map(part=>part.narration).join(''));
          parts.forEach(part=>{
            expect(part.sourceIds.every(id=>stage.sourceIds.includes(id))).toBe(true);
            expect(cityContinuityReferences[part.referenceId]).toBeDefined();
          });
        });
      }
      expect(stage.beats[0].narration).toContain('林芝');
      expect(stage.beats[1].narration).toContain('拉萨');
      expect(stage.beats[2].narration).toMatch(/阿里|狮泉河/);
      expect(stage.question.trim()).not.toBe('');
      expect(stage.bridge.trim()).not.toBe('');
      expect(Object.keys(stage.cityNotes).sort()).toEqual(['lhasa', 'ngari', 'nyingchi']);
    }
  });

  it('全部事件、文字和坐标来源均可回到注册资料，没有新增无依据的精准遗址点', () => {
    const sources = new Map(cityContinuitySources.map(source => [source.id, source]));
    expect(sources.size).toBe(cityContinuitySources.length);
    expect(cityContinuitySources.filter(source=>source.id==='city-local-osm-2026')).toHaveLength(1);
    const used = new Set(cityContinuityStages.flatMap(stage => stage.sourceIds));
    expect([...used].sort()).toEqual([...sources.keys()].sort());
    for (const id of used) {
      expect(sources.has(id), id).toBe(true);
      expect(new URL(sources.get(id)!.url).protocol).toBe('https:');
      expect(sources.get(id)!.note.trim()).not.toBe('');
    }
    expect(Object.keys(cityContinuityReferences).sort()).toEqual(['lhasa', 'lulang', 'ngari', 'nyingchi', 'shannan', 'tholing']);
    for (const [id, ref] of Object.entries(cityContinuityReferences)) {
      const archived = verifiedPlaceReferences[id];
      expect(ref.lat).toBe(archived.latitude);
      expect(ref.lon).toBe(archived.longitude);
      expect(ref.sourceIds).toEqual([archived.sourceId]);
      expect(ref.scope).toBe(archived.scope);
      expect(ref.scope).toMatch(/参考|参照/);
    }
  });

  it('年代与地点没有被环境决定论、现代示意线或建成地表偷换', () => {
    const history = cityContinuityStages[0];
    expect(history.beats[0].text).toMatch(/2006.*2026/);
    expect(history.beats[0].text).toContain('不是节日起源年代');
    expect(history.beats[1].text).toMatch(/7世纪.*1645—1648.*五世达赖喇嘛.*1690—1694.*桑结嘉措/);
    expect(history.beats[2].text).toMatch(/阿底峡1042.*11—12世纪/);
    expect(history.beats[2].text).toContain('托林在札达，与狮泉河是不同地点');
    expect(history.scope).toContain('不由气候推导宗教文化');
    expect(cityContinuitySceneCues.history.ngari.map(cue=>cue.referenceId)).toEqual(['tholing','tholing','ngari']);
    expect(cityContinuitySceneCues.history.nyingchi[2]).toMatchObject({referenceId:'lulang',year:'2016'});
  });

  it('新通道先后与个人使用分开，不把历史开通或受访期待写成当前全民成效', () => {
    const development = cityContinuityStages[1];
    development.beats.forEach((beat,index)=>expect(beat.text).toBe(cityAccessChanges[cityAccessCities[index]].caseText));
    expect(development.cityNotes.nyingchi).toMatch(/原有公路与航空.*新增铁路.*普巴与扎西/);
    expect(cityAccessChanges.nyingchi.life.text).toContain('不代表所有家庭已经获益');
    expect(development.cityNotes.lhasa).toMatch(/2006.*2007.*货场装卸.*配送/);
    expect(cityAccessChanges.lhasa.life.text).toMatch(/2026.*吴昊.*食品、百货、医药/);
    expect(development.cityNotes.ngari).toMatch(/2004年公路、2010年航空与2017年河岸建设.*札达另作独立地方/);
    expect(cityAccessChanges.ngari.life.text).toMatch(/狮泉河.*2017年一河两岸.*公共空间建设.*不能压成机场单独造成生活变化/);
    expect(development.beats[2].text).toMatch(/金珠德吉2006年开旅馆早于通航.*独立资料.*不作狮泉河案例/);
    expect(development.scope).toContain('不从事件自动推出生活改善幅度');
    expect(cityContinuitySources.find(source => source.id === 'continuity-ngari-airport-2010')!.note).toContain('旧航班');
  });

  it('每个空间提示都能回到真实聚居地，并区分区域铁路与访问服务', () => {
    for (const value of Object.values(cityContinuitySceneCues)) {
      for (const list of Object.values(value)) {
        expect(list.map(cue => cue.at)).toEqual([0, .34, .68]);
        for (const cue of list) {
          expect(cityContinuityReferences[cue.referenceId], cue.referenceId).toBeDefined();
          expect(cue.label.trim()).not.toBe('');
          expect(cue.year.trim()).not.toBe('');
        }
      }
    }
    const connection = cityContinuityStages[2];
    expect(connection.beats[0].text).toContain('不能把泽当聚居地点当作实际轨道必经点');
    expect(connection.scope).toContain('不是可导航道路、实测铁轨、现行航线或阿底峡古道');
    expect(connection.scope).toContain('未核验当前班次');
    expect(cityContinuityLessons.history.ngari[0].text).toContain('没有提供逐段古道');
    expect(cityContinuityLessons.history.ngari[1].text).toContain('不声称它是托林出土或现藏文物');
    const ngari=cityContinuityLessons.connections.ngari;
    expect(ngari.map(part=>part.referenceId)).toEqual(['ngari','ngari','ngari']);
    expect(ngari[1].text).toContain('札达托林属于另外的县域');
    expect(ngari[1].text).toMatch(/2004年.*柏油路.*2010年通航/);
    expect(ngari[2].text).toMatch(/狮泉河同一片河流.*2017一河两岸.*机场与公路.*河岸建设与持续管护/);
    expect(ngari[2].text).toContain('不能把公共空间变化单独归于机场');
    expect(cityContinuitySceneCues.connections.ngari.map(cue=>cue.referenceId)).toEqual(['ngari','ngari','ngari']);
    expect(cityContinuitySceneCues.travel.ngari.map(cue=>cue.referenceId)).toEqual(['ngari','ngari','ngari']);
  });

  it('旅行只新增可编辑的三个候选，不把三地区自动拼成短线', () => {
    expect(cityContinuityTravelStops.map(stop => stop.id)).toEqual(['nyingchi-lulang', 'lhasa-river', 'shiquanhe-life']);
    expect(cityContinuityTravelStops.map(stop => stop.cityId)).toEqual(['nyingchi', 'lhasa', 'ngari']);
    for (const stop of cityContinuityTravelStops) {
      expect(stop.region).toBe(stop.cityId);
      expect(stop.description.length).toBeGreaterThan(60);
      expect(stop.question.endsWith('？')).toBe(true);
      expect(stop.observationNote.trim()).not.toBe('');
      expect(stop.sourceIds.every(id => cityContinuitySources.some(source => source.id === id))).toBe(true);
    }
    expect(cityContinuityStages[3].beats[2].text).toMatch(/先围绕狮泉河.*同一地方的问题.*托林.*札布让.*跨县/);
    expect(cityContinuityLessons.travel.ngari[2].referenceId).toBe('ngari');
    expect(cityContinuityStages[3].scope).toContain('不是来源发布的官方游程');
    expect(cityContinuityStages[3].scope).toContain('无默认天数');
    expect(cityContinuityStages[3].bridge).toContain('实际选择');
  });
});
