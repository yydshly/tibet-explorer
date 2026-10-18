import {describe,expect,it} from 'vitest';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {cityContinuityAudioSegments,cityContinuityNarrationCues} from '../src/lib/cityContinuityAudio';
import {cityContinuityLessonStages,cityContinuityPartProgress,cityContinuityPartState} from '../src/lib/cityContinuityState';
import {cityAccessCities,cityAccessCityRange} from '../src/lib/cityAccessState';
import {cityLifeAudioToScene,cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {cityContinuityTravelContext,cityContinuityTravelEvidence} from '../src/lib/cityContinuityTravel';

describe('文化历史、联系与观察使用实际分段配音',()=>{
 it('每段独立录音连续覆盖同一地图进度，三个地区始终各有三段',()=>{
  expect(cityContinuityNarrationCues).toHaveLength(27);
  expect(new Set(cityContinuityNarrationCues.map(cue=>cue.id)).size).toBe(27);
  for(const stage of cityContinuityLessonStages){
   const segments=cityContinuityAudioSegments(stage);
   expect(segments).toHaveLength(9);expect(segments[0].start).toBe(0);expect(segments.at(-1)!.end).toBe(1);
   for(const [index,segment] of segments.entries()){
    const city=cityAccessCities[Math.floor(index/3)],part=cityContinuityLessons[stage][city][index%3];
    expect(segment.id).toBe(part.id);expect(segment.text).toBe(part.narration);
    expect(segment.end).toBeGreaterThan(segment.start);
    if(index<8)expect(segment.end).toBe(segments[index+1].start);
    expect(cityContinuityNarrationCues.find(cue=>cue.id===part.id)).toMatchObject({title:part.title,narration:part.narration,stepId:`COMPARE-${stage}`});
   }
  }
 });
 it('手动边界、音频内部位置和空间对象使用同一可逆时钟',()=>{
  for(const stage of cityContinuityLessonStages){
   const segments=cityContinuityAudioSegments(stage);
   for(const [cityIndex,city] of cityAccessCities.entries())for(let partIndex=0;partIndex<3;partIndex++){
    const boundary=cityContinuityPartProgress(city,partIndex),range=cityAccessCityRange(city);
    expect(boundary).toBeGreaterThanOrEqual(range.start);expect(boundary).toBeLessThan(range.end);
    expect(cityContinuityPartState(boundary)).toMatchObject({cityId:city,index:partIndex});
    expect(cityContinuityPartState(boundary).partProgress).toBeCloseTo(0,10);
    const id=cityContinuityLessons[stage][city][partIndex].id;
    expect(cityLifeSceneToAudio(segments,boundary)!.segment.id).toBe(id);
    for(const fraction of [0,.37,.99]){
     const progress=cityLifeAudioToScene(segments,id,fraction)!;
     expect(cityContinuityPartState(progress)).toMatchObject({cityId:city,index:partIndex});
     expect(cityContinuityPartState(progress).partProgress).toBeCloseTo(fraction,9);
     const seek=cityLifeSceneToAudio(segments,progress)!;
     expect(seek.segment.id).toBe(id);expect(seek.fraction).toBeCloseTo(fraction,9);
     expect(seek.queue.map(cue=>cue.id)).toEqual(segments.slice(cityIndex*3+partIndex).map(segment=>segment.id));
    }
    if(partIndex>0)expect(cityContinuityPartState(boundary-1e-7).index).toBe(partIndex-1);
   }
   expect(cityLifeSceneToAudio(segments,1)).toMatchObject({index:8,fraction:1});
   expect(cityContinuityPartState(1)).toMatchObject({cityId:'ngari',index:2,partProgress:1});
   expect(cityLifeAudioToScene(segments,'COMPARE-history-1',1)).toBeUndefined();
  }
 });
 it('旅行中的历史与用途问题返回本站材料，并且每项都有可查资料',()=>{
  const lhasa=cityContinuityTravelContext('lhasa-buildings','life');
  expect(lhasa.text).toMatch(/白宫.*礼仪/);expect(lhasa.text).toMatch(/红宫.*灵塔/);
  expect(lhasa.text).not.toContain('食品、百货、医药');
  const cases=[['nyingchi-lulang','服饰'],['lhasa-old-town','访问管理'],['shiquanhe-life','管护'],['tholing','翻译']] as const;
  for(const [stop,word] of cases){
   const context=cityContinuityTravelContext(stop,'life'),registered=new Set(cityContinuityTravelEvidence(stop).map(source=>source.id));
   expect(context.text).toContain(word);expect(context.sourceIds.length).toBeGreaterThan(0);
   for(const id of context.sourceIds)expect(registered.has(id),`${stop}: ${id}`).toBe(true);
  }
  expect(cityContinuityTravelContext('lhasa-buildings','access').text).toContain('2006');
 });
});
