import {describe,it,expect} from 'vitest';
import {pilotSpatialStory,pilotReturnTravel} from '../src/data/pilotSpatialStory';
import {pilotNarratedView,routePilotCues} from '../src/data/routePilot';
const local=routePilotCues[2].narration,at=(word:string,add=1)=>pilotNarratedView(2,local,(local.indexOf(word)+add)/local.length,.668);
describe('continuous route/place reading',()=>{
 it('uses the original spoken objects to connect river, road, buildings and public life',()=>{
  expect(pilotSpatialStory(at('看道路'))).toMatchObject({focus:'access',photo:true});
  expect(pilotSpatialStory(at('房屋'))).toMatchObject({focus:'settlement',photo:true});
  expect(pilotSpatialStory(at('街边日常'))).toMatchObject({focus:'life',photo:true});
  expect(pilotSpatialStory(at('竞赛'))).toMatchObject({focus:'regional',scope:'地区文化资料，未定位为鲁朗现场'});
  expect(pilotSpatialStory({...at('看道路'),placeMedia:'map'})).toMatchObject({focus:'relief',photo:false});
 });
 it('reveals the same valley on descent and follows the local source branch back before closing',()=>{
  const text=routePilotCues[1].narration;
  expect(pilotNarratedView(1,text,(text.indexOf('继续向鲁朗')-1)/text.length,.668).arrivalProgress).toBe(0);
  expect(pilotNarratedView(1,text,1,.668)).toMatchObject({progress:1,arrivalProgress:1});
  expect(at('再回到刚才',0)).toMatchObject({connectionProgress:1,returnProgress:0});
  const end=pilotNarratedView(2,local,1,.668);expect(end).toMatchObject({connectionProgress:0,returnProgress:1});
  expect(pilotSpatialStory(end)).toMatchObject({returning:true,title:'沿地方道路，接回国道来路'});
 });
 it('keeps grassland observations at landscape scale instead of treating livestock as a road reference',()=>{
  expect(pilotSpatialStory(at('草地与放牧'))).toMatchObject({focus:'relief',title:'林地与草地 → 生产生活'});
  expect(pilotSpatialStory({...at('草地与放牧'),placePhoto:'meadow'})).toMatchObject({focus:'relief',title:'溪流与草地 → 使用空间'});
 });
 it('returns monotonically along source route distance, ending at the exact paused origin',()=>{
  let previous=1;for(let elapsed=0;elapsed<=2200;elapsed+=100){const frame=pilotReturnTravel(1,.668,elapsed);expect(frame.progress).toBeLessThanOrEqual(previous);expect(frame.progress).toBeGreaterThanOrEqual(.668);previous=frame.progress;}
  expect(pilotReturnTravel(1,.668,0)).toEqual({progress:1,lift:0,done:false});
  expect(pilotReturnTravel(1,.668,3000).progress).toBe(.668);
  expect(pilotReturnTravel(1,.668,3000).lift).toBeCloseTo(0);expect(pilotReturnTravel(1,.668,3000).done).toBe(true);
 });
});
