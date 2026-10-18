import {describe,expect,it} from 'vitest';
import {cityComparisonStages,cityComparisonLabels} from '../src/data/cityComparison';
import {cityComparisonAudioSegments,validateCityComparisonPosition} from '../src/hooks/useCityComparisonDirector';
import {cityComparisonContinuation,cityComparisonFocusProgress} from '../src/lib/cityComparisonContinuation';
import {captureCityTravelReview,cityTravelObservationReviewTargets} from '../src/lib/cityTravelReview';
import {cityAccessCities,cityAccessCityRange,cityAccessState} from '../src/lib/cityAccessState';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';

describe('手动继续使用实际配音顺序，不跳过其他地方',()=>{
 it('每个主题从当前段只到下一实际段；三地最后一段才转下一主题',()=>{
  for(const [stageIndex,stage] of cityComparisonStages.entries()){
   const segments=cityComparisonAudioSegments(stage.id);
   for(const [index,segment] of segments.entries()){
    for(const progress of [segment.start,(segment.start+segment.end)/2]){
     const next=cityComparisonContinuation(stage.id,progress,segments);
     expect(next.label).not.toMatch(/ACCESS-|CONT-|COMPARE-/);
     if(index<segments.length-1){
      expect(next).toMatchObject({kind:'segment',stage:stage.id,progress:segments[index+1].start,segmentId:segments[index+1].id});
     }else if(stageIndex<cityComparisonStages.length-1){
      expect(next).toEqual({kind:'stage',stage:cityComparisonStages[stageIndex+1].id,progress:0,label:`继续看${cityComparisonLabels[stageIndex+1]} · 从林芝开始`});
     }else expect(next.kind).toBe('complete');
    }
   }
  }
 });
 it('历史先走完林芝内部三段再到拉萨；现代发展先走四环再到第二城',()=>{
  const history=cityComparisonAudioSegments('history');
  expect(history).toHaveLength(9);
  expect(cityComparisonContinuation('history',0,history)).toMatchObject({kind:'segment',cityId:'nyingchi',progress:history[1].start});
  expect(cityComparisonContinuation('history',history[2].start,history)).toMatchObject({kind:'segment',cityId:'lhasa',progress:.34,label:'继续看拉萨'});
  const development=cityComparisonAudioSegments('development');
  expect(development).toHaveLength(12);
  expect(cityComparisonContinuation('development',development[2].start,development)).toMatchObject({kind:'segment',cityId:'nyingchi',progress:development[3].start});
  expect(cityComparisonContinuation('development',development[3].start,development)).toMatchObject({kind:'segment',cityId:'lhasa',progress:.34});
 });
 it('旅行回看快照独立保留城市、精确进度、未保存选择和两种滚动位置',()=>{
  const position=validateCityComparisonPosition({stage:'travel',progress:.873,services:false,voice:false});
  const choices={'tholing':'life' as const,'shiquanhe-life':'transfer' as const};
  const captured=captureCityTravelReview(position,choices,{readingTop:1260,pageTop:2840});
  expect(captured).toEqual({cityId:'ngari',position,choices,readingTop:1260,pageTop:2840});
  position.progress=.1;choices.tholing='life';delete (choices as Partial<typeof choices>)['shiquanhe-life'];
  expect(captured.position.progress).toBe(.873);
  expect(captured.choices['shiquanhe-life']).toBe('transfer');
  expect(captureCityTravelReview(validateCityComparisonPosition({stage:'travel'}),{}, {readingTop:NaN,pageTop:-20})).toMatchObject({readingTop:0,pageTop:0});
 });
 it('切换地方保留相同局部进度，因此四环交通与三环历史不会跳回首环',()=>{
  for(const originalCity of cityAccessCities){
   const range=cityAccessCityRange(originalCity);
   for(const local of [0,.2,.34,.52,.68,.87,.999]){
    const progress=range.start+(range.end-range.start)*local;
    for(const target of cityAccessCities){
     const next=cityComparisonFocusProgress(progress,target),targetRange=cityAccessCityRange(target);
     expect(next).toBeGreaterThanOrEqual(targetRange.start);expect(next).toBeLessThan(targetRange.end);
     expect((next-targetRange.start)/(targetRange.end-targetRange.start)).toBeCloseTo(local,10);
     expect(cityAccessState(next).index).toBe(cityAccessState(progress).index);
     expect(cityContinuityPartState(next).index).toBe(cityContinuityPartState(progress).index);
    }
   }
  }
  expect(cityAccessState(cityComparisonFocusProgress(1,'nyingchi')).cityId).toBe('nyingchi');
  expect(cityContinuityPartState(cityComparisonFocusProgress(1,'lhasa')).cityId).toBe('lhasa');
 });
 it('同地旅行用途回到实际历史环节而非统一货运入口，具体目标保留返回焦点',()=>{
  const lhasa=cityTravelObservationReviewTargets('lhasa','lhasa-buildings','life');
  expect(lhasa.map(target=>[target.stage,cityContinuityPartState(target.progress).index])).toEqual([['history',1],['history',2]]);
  expect(lhasa.map(target=>target.label)).toEqual(['回看白宫礼仪与居住','回看红宫纪念与宗教用途']);
  const lulang=cityTravelObservationReviewTargets('nyingchi','nyingchi-lulang','life')[0];
  expect(lulang).toMatchObject({cityId:'nyingchi',stage:'history',label:`回看${cityContinuityLessons.history.nyingchi[2].title}`});
  expect(cityContinuityPartState(lulang.progress).index).toBe(2);
  const tholing=cityTravelObservationReviewTargets('ngari','tholing','life');
  expect(tholing.map(target=>cityContinuityPartState(target.progress).index)).toEqual([0,1]);
  const shiquanhe=cityTravelObservationReviewTargets('ngari','shiquanhe-life','life')[0];
  expect(cityContinuityPartState(shiquanhe.progress).index).toBe(2);
  const transfer=cityTravelObservationReviewTargets('lhasa','lhasa-buildings','transfer')[0];
  expect(transfer.stage).toBe('development');expect(cityAccessState(transfer.progress)).toMatchObject({cityId:'lhasa',phase:'transfer'});
  expect(cityTravelObservationReviewTargets('ngari','lhasa-buildings','life')).toEqual([]);
  const snapshot=captureCityTravelReview(validateCityComparisonPosition({stage:'travel',progress:.6}),{'lhasa-buildings':'life'},{readingTop:420,pageTop:860},lhasa[0].key);
  expect(snapshot.focusKey).toBe(lhasa[0].key);expect(snapshot.choices['lhasa-buildings']).toBe('life');expect(snapshot.position.progress).toBe(.6);
 });
});
