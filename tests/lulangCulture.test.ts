import {describe,it,expect} from 'vitest';
// @ts-expect-error Node belongs to the runner, not the browser type surface.
import {readFileSync} from 'node:fs';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {lulangCultureState,lulangCultureFeedback,lulangCultureReferences} from '../src/data/lulangCulture';
import {lulangCookingState} from '../src/data/lulangLife';
import {lulangPlaceData} from '../src/scene/lulangPlaceData';
import {narrationTimingAt} from '../src/lib/narrationTiming';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));

describe('grounded Lulang culture reading and explicitly hypothetical process',()=>{
 it('uses native recording words to reveal preparation, supply, care and service, including reverse seek',()=>{
  const cue=routePilotCues[2],clip=json('public/assets/audio/narration/cue-manifest.json').clips.find((c:any)=>c.cueId===cue.id),timeline=json('public'+clip.subtitleUrl);
  const readings=Array.from({length:Math.ceil(clip.duration*20)},(_,i)=>{const timing=narrationTimingAt(cue.narration,i/20,clip.duration,timeline);return {at:timing.textProgress*cue.narration.length,state:lulangCultureState(pilotNarratedView(2,cue.narration,timing.textProgress))};});
  for(const [step,token] of [[1,'供货组织'],[2,'商户诚信管理'],[3,'恢复联系']] as const){const first=readings.find(r=>r.state.step===step);expect(first).toBeDefined();expect(first!.at).toBeGreaterThanOrEqual(cue.narration.indexOf(token));}
  const end=pilotNarratedView(2,cue.narration,1);expect(lulangCultureState(end)).toMatchObject({step:3,serviceReady:true});
  const start=pilotNarratedView(2,cue.narration,0);expect(lulangCultureState(start)).toMatchObject({active:false,step:0,serviceReady:false});
 });
 it('only selects existing restaurant records and leaves all source objects unchanged',()=>{
  const place=json('public/assets/routes/g318/lulang.geojson'),before=JSON.stringify(place);
  const data=lulangPlaceData(place,()=>3380,[94.73,29.73]);
  const references=lulangCultureReferences(data.services,data.riverPoint);
  expect(references).toHaveLength(3);expect(new Set(references.map(r=>r.record.id)).size).toBe(3);
  for(const r of references){expect(r.record.kind).toBe('food');expect(r.record.coordinate).toEqual(place.features.find((f:any)=>f.id===r.record.id).geometry.coordinates);}
  expect(JSON.stringify(place)).toBe(before);
 });
 it('holds preparation/output when supply is removed and preserves progress for restoration',()=>{
  const view={...pilotNarratedView(2,routePilotCues[2].narration,1),cookingProgress:.9};
  expect(lulangCookingState(view)).toMatchObject({step:3,ready:true});
  expect(lulangCookingState({...view,cultureSupply:false})).toMatchObject({requested:.9,progress:0,step:0,ready:false});
  expect(lulangCookingState({...view,cultureSupply:true})).toMatchObject({progress:.9,ready:true});
  expect(lulangCultureFeedback({...view,cultureSupply:false})).toContain('归档餐饮点仍保留');
 });
});
