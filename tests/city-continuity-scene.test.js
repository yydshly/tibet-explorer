import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildCityContinuity, cityContinuityState, cityContinuityRoute, cityContinuityCaptionBox, cityContinuityEngineering, CITY_CONTINUITY_IDS, CITY_CONTINUITY_STAGES } from '../src/scene/cityContinuity';
import { cityContinuityReferences } from '../src/data/cityContinuity';
import { cityContinuityLessons } from '../src/data/cityContinuityLessons';
import { cityContinuityPartProgress } from '../src/lib/cityContinuityState';
import { cityAccessCityRange } from '../src/lib/cityAccessState';
import { TERRAIN_READING_META, sampleTerrainMetres } from '../src/scene/terrainReading';
vi.mock('../src/scene/environment', async original => ({ ...await original(), label: text => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite; } }));
const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16'),grid=Int16Array.from({length:bytes.length/2},(_,index)=>bytes.readInt16LE(index*2));
const read=(lon,lat)=>lon>=TERRAIN_READING_META.west&&lon<=TERRAIN_READING_META.east&&lat>=TERRAIN_READING_META.south&&lat<=TERRAIN_READING_META.north?sampleTerrainMetres(grid,lon,lat):undefined;
const settings={layer:'atlas-city-comparison',step:3,progress:1,cityLifeServices:true};
const find=(root,kind)=>{const items=[];root.traverse(item=>{if(item.userData.kind===kind)items.push(item);});return items;};
const visible=object=>{let item=object;while(item){if(!item.visible)return false;item=item.parent;}return true;};
const local=(city,t)=>{const r=cityAccessCityRange(city);return r.start+(r.end-r.start)*t;};
function scene(width=798,height=380){const camera=new THREE.PerspectiveCamera(43,width/height,.1,300);camera.position.set(88,65,30);camera.lookAt(88,0,-31);camera.updateMatrixWorld();const at=(lon,lat,offset=.055)=>new THREE.Vector3(lon,Math.max(.025,(read(lon,lat)??0)/1800)+offset,-lat);return{model:buildCityContinuity({camera,at,metres:read}),camera,at,size:new THREE.Vector2(width,height)};}

describe('历史、交通和旅行观察保留同一整体地图',()=>{
 it('never restores rejected function decks in any regional history, access or travel fallback',()=>{
  const {model,size}=scene();for(const step of [3,4,5,6])for(const city of CITY_CONTINUITY_IDS){model.update({...settings,step,progress:local(city,.95)},size);expect(find(model.group,'terrain-following-functional-use-face').filter(visible)).toHaveLength(0);expect(find(model.group,'ground-use-activity-zone').filter(visible)).toHaveLength(0);const enlarged=find(model.group,'city-access-terrain-attached-cutaway').filter(visible);expect(enlarged.length).toBeLessThanOrEqual(1);}model.dispose();
 });
 it('keeps the three region intervals deterministic and source geography unchanged',()=>{
  for(let i=0;i<4;i++)for(const city of CITY_CONTINUITY_IDS){const p={...settings,step:i+3,progress:.51},a=cityContinuityState(p,city);cityContinuityState({...p,progress:.99},city);expect(cityContinuityState(p,city)).toEqual(a);expect(a.stage).toBe(CITY_CONTINUITY_STAGES[i]);}
  for(const stage of CITY_CONTINUITY_STAGES)for(const city of CITY_CONTINUITY_IDS){const samples=cityContinuityRoute(stage,city,read);expect(samples.length).toBeGreaterThan(0);expect(samples.every(p=>p.metres===read(p.longitude,p.latitude))).toBe(true);expect(cityContinuityRoute(stage,city,()=>undefined)).toEqual([]);}
 });
 it('aligns all 27 actual recorded lesson parts to the correct locality, source and reversible cue',()=>{
  const {model,size}=scene();for(const [stage,step]of[['history',3],['connections',5],['travel',6]])for(const city of CITY_CONTINUITY_IDS)for(let index=0;index<3;index++){
   const progress=cityContinuityPartProgress(city,index)+1e-8;model.update({...settings,step,progress},size);const frame=find(model.group,'journey-regional-frame').find(o=>o.userData.city===city),part=cityContinuityLessons[stage][city][index];expect(frame.userData.lessonId).toBe(part.id);expect(frame.userData.referenceId).toBe(part.referenceId);expect(frame.userData.sourceIds).toEqual(part.sourceIds);
   const point=frame.position.clone();model.update({...settings,step,progress:1},size);model.update({...settings,step,progress},size);expect(frame.position).toEqual(point);
  }model.dispose();
 });
 it('shows distinct regional ground uses rather than large material cards or a travel notebook',()=>{
  const {model,size}=scene();model.update({...settings,step:3,progress:.66},size);let ground=find(model.group,'city-continuity-meaningful-journey')[0];const uses=find(ground,'lhasa-distinct-purpose-space');expect(uses.map(o=>o.userData.purpose)).toEqual(['宗教活动','礼仪·接见·居住','纪念·宗教用途']);
  model.update({...settings,step:3,progress:.32},size);expect(find(ground,'ground-use-case').find(o=>o.userData.caseId==='lulang').userData.current).toBe(true);
  model.update({...settings,step:3,progress:.99},size);expect(find(ground,'ground-use-case').find(o=>o.userData.caseId==='ngari-river').userData.current).toBe(true);
  for(const step of[3,5,6]){model.update({...settings,step,progress:.96},size);expect(find(ground,'journey-named-source-material')).toHaveLength(0);expect(find(ground,'journey-editable-question-carrier')).toHaveLength(0);expect(find(ground,'clock-synchronised-geographic-probe')).toHaveLength(0);}model.dispose();
 });
 it('history participation control preserves terrain and existing use surfaces while stopping activity and closing use entrances',()=>{
  const {model,size}=scene();model.update({...settings,progress:.63},size);const ground=find(model.group,'city-continuity-meaningful-journey')[0],active=find(ground,'ground-use-case').find(o=>o.userData.active),faces=find(active,'terrain-following-functional-use-face'),original=faces.map(o=>[...o.geometry.attributes.position.array]);expect(find(active,'ground-use-activity-zone').some(o=>o.userData.entryOpen>0)).toBe(true);
  model.update({...settings,progress:.63,cityLifeServices:false},size);expect(active.visible).toBe(true);expect(faces.every(o=>o.visible)).toBe(true);expect(faces.map(o=>[...o.geometry.attributes.position.array])).toEqual(original);expect(find(active,'ground-use-activity-zone').every(o=>o.userData.entryOpen===0)).toBe(true);model.dispose();
 });
 it('keeps one owned journey marker at the visible transfer end without restoring rejected functional decks',()=>{
  const {model,size}=scene();const access=model.group.children.find(o=>o.userData.kind==='city-access-change-on-regional-map');
  for(const city of CITY_CONTINUITY_IDS){model.update({...settings,step:4,progress:local(city,.6)},size);const parcel=find(access,'access-same-journey-or-goods-marker').find(o=>o.userData.city===city),id=parcel.uuid;expect(parcel.userData.holder).toBe('local-vehicle');model.update({...settings,step:4,progress:local(city,.999)},size);expect(parcel.uuid).toBe(id);expect(parcel.userData.holder).toBe('use-end');expect(parcel.userData.groundUseCase).toBeUndefined();expect(parcel.userData.destination).toBe('visible-local-transfer-end');expect(find(access,'access-use-carrier').find(o=>o.userData.city===city).visible).toBe(true);expect(find(access,'terrain-following-functional-use-face').filter(visible)).toHaveLength(0);expect(find(access,'ground-visible-use-material').filter(visible)).toHaveLength(0);expect(parcel.userData.worldPosition).toBeInstanceOf(THREE.Vector3);}
  model.dispose();
 });
 it('connections stop the same object at arrival if local services are disabled, while preserving all three regions and existing transport',()=>{
  const {model,size}=scene();for(const city of CITY_CONTINUITY_IDS){model.update({...settings,step:5,progress:local(city,.95)},size);const journey=find(model.group,'city-continuity-meaningful-journey')[0],parcel=find(journey,'access-same-journey-or-goods-marker').find(o=>o.userData.city===city);expect(parcel.userData.holder).toBe('use-end');model.update({...settings,step:5,progress:local(city,.95),cityLifeServices:false},size);expect(parcel.userData.holder).toBe('arrival');expect(find(journey,'access-existing-ground-vehicle').every(o=>o.visible)).toBe(true);expect(new Set(find(journey,'ground-use-case').filter(o=>o.visible).map(o=>o.userData.city)).size).toBe(3);}model.dispose();
 });
 it('travel observation off reaches the real integrated ground layer while the existing physical uses and transport remain',()=>{
  const {model,size}=scene();for(const city of CITY_CONTINUITY_IDS){const p={...settings,step:6,progress:local(city,.92)};model.update(p,size);const journey=find(model.group,'city-continuity-meaningful-journey')[0],active=find(journey,'ground-use-case').find(o=>o.userData.active);expect(active.userData.state.observation).toBe(true);const zones=find(active,'ground-use-activity-zone'),open=zones.map(o=>o.userData.entryOpen);model.update({...p,cityLifeServices:false},size);expect(active.userData.state.observation).toBe(false);expect(zones.map(o=>o.userData.entryOpen)).toEqual(open);expect(active.visible).toBe(true);expect(find(journey,'access-same-journey-or-goods-marker').find(o=>o.userData.city===city).userData.holder).toBe('use-end');}model.dispose();
 });
 it('retains distinct actual Shiquanhe/Tholing anchors and compact, separated caption rows in 390 and 798 layouts',()=>{
  for(const [width,height]of[[390,366],[798,380]]){const{model,size,at}=scene(width,height);model.update({...settings,progress:.98},size);const points=find(model.group,'journey-distinct-ngari-locality');expect(points).toHaveLength(2);for(const p of points){const ref=cityContinuityReferences[p.userData.referenceId];expect(p.position.distanceTo(at(ref.lon,ref.lat,.16))).toBeLessThan(.00001);}expect(points[0].position.distanceTo(points[1].position)).toBeGreaterThan(1);
   const boxes=find(model.group,'journey-synchronized-regional-caption').map(o=>o.userData.screenBox);expect(boxes).toHaveLength(3);for(const b of boxes){expect(b.x-b.width/2).toBeGreaterThanOrEqual(12);expect(b.x+b.width/2).toBeLessThanOrEqual(width-12);expect(b.y+b.height/2).toBeLessThan(height-70);}for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)expect(Math.abs(boxes[i].y-boxes[j].y)).toBeGreaterThanOrEqual(28);model.dispose();}
 });
 it('keeps the measured bridge/tunnel principle helper and source heights immutable',()=>{
  const{model,at}=scene(),samples=cityContinuityRoute('development','nyingchi',read),natural=samples.map(p=>at(p.longitude,p.latitude,.11)),original=natural.map(p=>p.clone()),engineering=cityContinuityEngineering(natural),{bridge,tunnel,points}=engineering;expect(natural).toEqual(original);for(let i=bridge.from;i<=bridge.to;i++)expect(points[i].y).toBeCloseTo(bridge.deckY,9);expect(points[tunnel.centre].y).toBeLessThan(natural[tunnel.centre].y);expect(points[0]).toEqual(natural[0]);expect(cityContinuityEngineering(natural.slice(0,20))).toBeUndefined();model.dispose();
 });
});
