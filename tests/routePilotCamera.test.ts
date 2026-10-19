import {describe,it,expect} from 'vitest';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {pilotNarratedCamera} from '../src/data/routePilotCamera';

describe('narrated route camera',()=>{
 it('waits for the spoken object before moving to it, and restores exactly on reverse seek',()=>{
  const text=routePilotCues[0].narration,start=text.indexOf('先看起点周围');
  const before=pilotNarratedCamera(0,text,(start-1)/text.length,.668);
  expect(before.mapFocusWeight).toBe(0);expect(before.mapZoom).toBe(1);
  const settled=pilotNarratedCamera(0,text,(start+7)/text.length,.668);
  expect(settled.mapFocusWeight).toBeGreaterThan(.9);expect(settled.mapZoom).toBeLessThan(.4);
  expect(pilotNarratedCamera(0,text,(start-1)/text.length,.668)).toEqual(before);
 });
 it('shows height comparisons only at the corresponding native phrases and retains the actual route position',()=>{
  const text=routePilotCues[1].narration,at=(word:string,delta=0)=>pilotNarratedView(1,text,(text.indexOf(word)+delta)/text.length,.668);
  expect(at('身边地面逐渐抬高',-1).elevation).toBe(false);
  expect(at('身边地面逐渐抬高',1).elevation).toBe(true);
  expect(at('停在山地观察点')).toMatchObject({progress:.668,lookBack:true,elevation:true});
  expect(at('继续向鲁朗',1)).toMatchObject({elevation:false,lookBack:false});
  const local=routePilotCues[2].narration;
  expect(pilotNarratedView(2,local,(local.indexOf('两侧地形')+2)/local.length)).toMatchObject({elevation:true,placeLens:'landscape'});
  expect(pilotNarratedView(2,local,(local.indexOf('深色坡面')+2)/local.length)).toMatchObject({elevation:false,placeLens:'landscape'});
  expect(pilotNarratedView(2,local,(local.indexOf('切到生活空间')+2)/local.length)).toMatchObject({elevation:false,placeLens:'life'});
 });
 it('pulls back from the same Lulang area to the whole route in the closing sentence',()=>{
  const text=routePilotCues[3].narration;
  expect(pilotNarratedView(3,text,0)).toMatchObject({mode:'whole',mapFocus:1,mapFocusWeight:1,mapZoom:.23});
  expect(pilotNarratedView(3,text,(text.indexOf('沿途高差')+1)/text.length)).toMatchObject({mode:'whole',mapFocusWeight:0,mapZoom:1});
 });
});
