import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
// @ts-expect-error Node belongs to the runner, not the browser type surface.
import {readFileSync} from 'node:fs';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {lulangCultureState,lulangCultureFeedback,lulangCultureReferences} from '../src/data/lulangCulture';
import {createLulangCultureSymbols} from '../src/scene/lulangCultureSymbols';
import {lulangPlaceData} from '../src/scene/lulangPlaceData';
import {narrationTimingAt} from '../src/lib/narrationTiming';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));

describe('grounded Lulang culture reading and explicitly hypothetical process',()=>{
 it('uses native recording words to reveal preparation, supply, care and service, including reverse seek',()=>{
  const cue=routePilotCues[2],clip=json('public/assets/audio/narration/cue-manifest.json').clips.find((c:any)=>c.cueId===cue.id),timeline=json('public'+clip.subtitleUrl);
  const readings=Array.from({length:Math.ceil(clip.duration*20)},(_,i)=>{const timing=narrationTimingAt(cue.narration,i/20,clip.duration,timeline);return {at:timing.textProgress*cue.narration.length,state:lulangCultureState(pilotNarratedView(2,cue.narration,timing.textProgress))};});
  for(const [step,token] of [[1,'供货组织'],[2,'商户诚信管理'],[3,'食物成为']] as const){const first=readings.find(r=>r.state.step===step);expect(first).toBeDefined();expect(first!.at).toBeGreaterThanOrEqual(cue.narration.indexOf(token));}
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
 it('changes actual Three annotation geometry when the hypothetical supply link is removed, never changing the mapped anchor',()=>{
  const view={...pilotNarratedView(2,routePilotCues[2].narration,1),cultureProgress:1};
  const symbols=createLulangCultureSymbols(),anchor=new THREE.Vector3(1,3.5,2);
  const complete=symbols.update(view,anchor,.4);expect(symbols.group.visible).toBe(true);expect(symbols.halo.visible).toBe(true);expect(symbols.serviceTokens.every(p=>p.visible)).toBe(true);expect(symbols.arcs[1].geometry.instanceCount).toBe(32);
  const missing=symbols.update({...view,cultureSupply:false},anchor,.4);expect(symbols.group.position.toArray()).toEqual(anchor.toArray());expect(symbols.halo.visible).toBe(false);expect(symbols.serviceTokens.every(p=>!p.visible)).toBe(true);expect(symbols.arcs[1].geometry.instanceCount).toBe(6);expect(missing[1].title).toContain('假设');expect(complete[3].visible).toBe(true);expect(missing[3].muted).toBe(true);
  expect(lulangCultureFeedback({...view,cultureSupply:false})).toContain('归档餐饮点仍保留');
  symbols.update({...view,placeLens:'life'},anchor,.4);expect(symbols.group.visible).toBe(false);
  symbols.group.traverse((object:any)=>{object.geometry?.dispose();object.material?.dispose();});
 });
});
