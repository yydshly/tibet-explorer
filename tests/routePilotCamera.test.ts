import {describe,it,expect} from 'vitest';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {pilotNarratedCamera} from '../src/data/routePilotCamera';

describe('narrated route camera',()=>{
 it('links the high point back to both valleys before descending, and retraces the same framing on seek',()=>{
  const text=routePilotCues[1].narration,view=(token:string,offset=0)=>pilotNarratedView(1,text,(text.indexOf(token)+offset)/text.length,.668);
  expect(view('不是实测山口标高',13)).toMatchObject({routeContext:1,progress:.668});
  expect(view('继续向鲁朗',-1).routeContext).toBe(.25);
  expect(view('继续向鲁朗',6).routeContext).toBe(1);
  expect(view('接下来进入鲁朗',14).routeContext).toBe(0);
  expect(view('不是实测山口标高',13)).toMatchObject({routeContext:1,progress:.668});
 });
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
  expect(pilotNarratedView(2,local,(local.indexOf('回到地图')+2)/local.length)).toMatchObject({elevation:false,placeLens:'life'});
 });
 it('recaps terrain, connections and visible public life instead of holding the whole map throughout closing',()=>{
  const text=routePilotCues[3].narration;
  const at=(word:string,delta=1)=>pilotNarratedView(3,text,(text.indexOf(word)+delta)/text.length,.668);
  expect(at('林芝附近的谷地')).toMatchObject({mode:'line',routeContext:1,elevation:true});
  expect(at('自然条件解释',4)).toMatchObject({mode:'place',placeLens:'landscape',elevation:true});
  expect(at('建设、经营',4)).toMatchObject({mode:'place',connections:true,servicesVisible:false});
  expect(at('建设、经营',4).connectionProgress).toBeGreaterThan(0);
  expect(at('保存一个观察问题')).toMatchObject({mode:'place',placePhoto:'daily',photoFocus:3,photoReveal:1});
  expect(at('地图上的观察点',12)).toMatchObject({mode:'line',routeContext:1,elevation:false});
  expect(pilotNarratedView(3,text,1)).toMatchObject({mode:'whole',mapFocusWeight:0,mapZoom:1});
 });
});
