// @ts-expect-error Node-only fixtures; the browser project has no Node ambient types.
import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {regionalPlaceEvidence} from '../src/data/regionalPlaceEvidence';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';
import {buildCityLocalMap,localDisplayedAnchor,type LocalPlaceId} from '../src/scene/cityLocalMap';
import {storyAtlasPosition,STORY_ATLAS_META} from '../src/scene/storyAtlas';
import {sampleTerrainMetres} from '../src/scene/terrainReading';
import type {TibetSceneProps} from '../src/scene/TibetScene';

vi.mock('../src/scene/environment',async original=>({...await original<typeof import('../src/scene/environment')>(),label:(text:string)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;}}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

const unit=(STORY_ATLAS_META.east-STORY_ATLAS_META.west)*111320*Math.cos(29.5*Math.PI/180)/STORY_ATLAS_META.width;
const size=new THREE.Vector2(1440,900);
const base:TibetSceneProps={scene:'region',layer:'atlas-city-comparison',step:3,season:1,progress:0,playing:false,resetKey:0,selected:'city:nyingchi',cutaway:false,cityLifeServices:true,onSelect:()=>{},onInteract:()=>{}};
async function localScene(regional=false){
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{try{const bytes=readFileSync(`public${url}`);return {ok:true,json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}catch{return {ok:false};}}));
 const camera=new THREE.PerspectiveCamera(43,size.x/size.y,.00001,300);
 const focus=vi.fn((position:THREE.Vector3,target:THREE.Vector3)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();});
 const bytes=regional?readFileSync('public/assets/terrain/tibet-regional-dem.int16'):undefined;
 const grid=bytes?Int16Array.from({length:bytes.length/2},(_,index)=>bytes.readInt16LE(index*2)):undefined;
 const model=buildCityLocalMap({camera,project:storyAtlasPosition,metresPerUnit:unit,focus,regionalMetres:grid?(lon,lat)=>sampleTerrainMetres(grid,lon,lat):undefined});await model.ready;
 return {model,camera};
}
const cases=[
 {city:'nyingchi',place:'lulang',manual:['way/26406905','way/401959070','way/1322496961'],context:['way/26406905','way/401959070','way/1322496961','way/1322390955']},
 {city:'ngari',place:'shiquanhe',manual:['way/154210514','way/154210585','way/904011648'],context:['way/154210514','way/154210585','way/978103852','way/904011648']},
] as const;
const corridors=JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json','utf8')) as {routes:{id:string;coordinates:number[][];sourceNodeIds:number[];featureIds:string[]}[]};
const partAt=(city:'nyingchi'|'ngari',index:number,fraction:number)=>{
 const start=cityContinuityPartProgress(city,index),end=index<2?cityContinuityPartProgress(city,index+1):city==='nyingchi'?.34:1;
 return start+(end-start)*fraction;
};
function assertEndpointLabels(model:Awaited<ReturnType<typeof localScene>>['model'],routeId:string){
 const place=model.active()!,info=place.routeInfo!,source=corridors.routes.find(route=>route.id===routeId)!;
 expect(source).toBeDefined();
 const labels=place.labels.children.filter(object=>object.userData.kind==='actual-local-route-endpoint-label');
 expect(labels).toHaveLength(2);
 const k=info.legBreakIndex,indices=k===undefined?[0,info.coordinates.length-1]:routeId==='mainling-airport-nyingchi-s4'?[0,k]:[k,info.coordinates.length-1];
 const expected=[{coordinate:source.coordinates[0],node:source.sourceNodeIds[0]},{coordinate:source.coordinates.at(-1),node:source.sourceNodeIds.at(-1)}];
 for(const [index,label]of labels.entries()){
  expect(label.userData.anchor).toEqual(expected[index].coordinate);
  expect(label.userData.sourceNodeId).toBe(expected[index].node);
  expect(label.userData.anchor).toEqual(info.coordinates[indices[index]]);
  expect(label.userData.sourceNodeId).toBe(info.sourceNodeIds![indices[index]]);
  expect(label.userData.routeId).toBe(info.id);
  expect(label.userData.sourceScope).toBe(info.endpointScope);
  expect(label.visible,`${routeId}: endpoint ${index} must be readable`).toBe(true);
  const leader=label.userData.labelLeader as THREE.Line;
  expect(leader.visible).toBe(true);
  const start=new THREE.Vector3().fromBufferAttribute(leader.geometry.attributes.position as THREE.BufferAttribute,0);
  expect(start.distanceTo(place.toWorld(label.userData.anchor,25))).toBeLessThan(.000001);
  const box=label.userData.screenBox as {x:number;y:number;width:number;height:number};
  expect(box.x-box.width/2).toBeGreaterThanOrEqual(348);expect(box.x+box.width/2).toBeLessThanOrEqual(size.x-14);
  expect(box.y-box.height/2).toBeGreaterThanOrEqual(79);expect(box.y+box.height/2).toBeLessThanOrEqual(size.y-202);
 }
 const follower=place.labels.children.find(object=>object.userData.routeFollower)!;
 expect(follower).toBeDefined();expect(follower.visible,`${routeId}: road following label must remain readable`).toBe(true);
 const visible=place.labels.children.filter(object=>object instanceof THREE.Sprite&&object.visible);
 expect(visible).toHaveLength(3);
 for(let a=0;a<visible.length;a++)for(let b=a+1;b<visible.length;b++){
  const first=visible[a].userData.screenBox,second=visible[b].userData.screenBox;
  expect(Math.abs(first.x-second.x)>=(first.width+second.width)/2+8||Math.abs(first.y-second.y)>=(first.height+second.height)/2+7,`${routeId}: endpoint/follower labels must not overlap`).toBe(true);
 }
 return labels.map(label=>({anchor:label.userData.anchor,node:label.userData.sourceNodeId,text:label.userData.displayText}));
}

describe('regional reading and manual evidence inspection keep one geographic context',()=>{
 it.each(cases)('$place manual river/road/use selections retain all relevant mapped context without replaying historical use',async testCase=>{
  const {model,camera}=await localScene();
  try{
   const life=regionalPlaceEvidence[testCase.city].steps.find(step=>step.id==='life')!;
   const p={...base,step:life.stage==='connections'?5:3,progress:life.progress,selected:`city:${testCase.city}`};
   model.update(p,size);const place=model.active()!;
   expect(place.id).toBe(testCase.place);expect([...place.usageObjects.values()].some(object=>object.visible)).toBe(true);
   const terrain=place.group.children.find(object=>object.userData.kind==='actual-local-dem') as THREE.Mesh;
   const before=Array.from((terrain.geometry as THREE.BufferGeometry).attributes.position.array);
   for(const id of testCase.manual){
    model.update({...p,cityLocalFeatureId:id},size);
    expect(model.active()?.id).toBe(testCase.place);
    const selected=place.highlights.children.filter(object=>object.userData.kind==='actual-local-feature-focus'&&object.userData.selected);
    expect(selected.map(object=>object.userData.featureId)).toEqual([id]);
    expect([...place.usageObjects.values()].every(object=>!object.visible)).toBe(true);
    expect(place.group.userData.event.readingObjectFeatureId).toBeUndefined();
    expect(place.group.userData.event.historicalGeometryChanged).toBe(false);
    const frame=model.group.userData.cameraFrame as {localityId:LocalPlaceId;bounds:THREE.Box3};
    expect(frame.localityId).toBe(testCase.place);
    for(const contextId of testCase.context){
     const feature=place.featureById.get(contextId)!;expect(feature,contextId).toBeDefined();
     const anchor=localDisplayedAnchor(feature,place.data.metadata.bbox)!;expect(anchor,contextId).toBeDefined();
     const world=place.toWorld(anchor);expect(frame.bounds.containsPoint(world),`${testCase.place}: ${id} must retain ${contextId}`).toBe(true);
     const projected=world.clone().project(camera),x=(projected.x+1)*size.x/2,y=(1-projected.y)*size.y/2;
     expect(x,contextId).toBeGreaterThan(338);expect(x,contextId).toBeLessThan(size.x-35);
     expect(y,contextId).toBeGreaterThan(145);expect(y,contextId).toBeLessThan(size.y-180);
    }
    expect(Array.from((terrain.geometry as THREE.BufferGeometry).attributes.position.array)).toEqual(before);
   }
   // Leaving explicit inspection resumes the source-bound use demonstration.
   model.update(p,size);expect([...place.usageObjects.values()].some(object=>object.visible)).toBe(true);
  }finally{model.dispose();}
 });
 it('labels S4 and G318 at their actual source-node endpoints, and reverse seeking restores the same road/river geography',async()=>{
  const {model}=await localScene(true);
  try{
   const s4={...base,step:5,progress:partAt('nyingchi',2,.25)},g318={...s4,progress:partAt('nyingchi',2,.75)};
   model.update(s4,size);const place=model.active()!;expect(place.id).toBe('lulang');
   expect(place.routeInfo?.id).toBe('mainling-s4-to-lulang-g318');
   const sourceFeatures=JSON.stringify(place.data.features),terrain=place.group.children.find(object=>object.userData.kind==='actual-local-dem') as THREE.Mesh;
   const heights=Array.from(terrain.geometry.attributes.position.array),before=assertEndpointLabels(model,'mainling-airport-nyingchi-s4');
   const k=place.routeInfo!.legBreakIndex!;
   expect(before[1].anchor).toEqual(place.routeInfo!.coordinates[k]);expect(before[1].node).toBe(place.routeInfo!.sourceNodeIds![k]);
   model.update(g318,size);const later=assertEndpointLabels(model,'nyingchi-lulang-g318');
   expect(later[0].anchor).toEqual(before[1].anchor);expect(later[0].node).toBe(before[1].node);
   model.update(s4,size);expect(assertEndpointLabels(model,'mainling-airport-nyingchi-s4')).toEqual(before);
   expect(JSON.stringify(place.data.features)).toBe(sourceFeatures);expect(Array.from(terrain.geometry.attributes.position.array)).toEqual(heights);
  }finally{model.dispose();}
 });
 it('keeps G219 airport-exterior and riverside endpoints visible and source-bound on forward/reverse travel',async()=>{
  const {model}=await localScene(true);
  try{
   const p={...base,step:5,selected:'city:ngari',progress:partAt('ngari',1,.25)};
   model.update(p,size);const place=model.active()!;expect(place.id).toBe('shiquanhe');expect(place.routeInfo?.id).toBe('gunsa-airport-shiquanhe');
   const sourceFeatures=JSON.stringify(place.data.features),before=assertEndpointLabels(model,'gunsa-airport-shiquanhe');
   expect(before[0].text).toContain('机场外');
   model.update({...p,progress:partAt('ngari',1,.75)},size);expect(assertEndpointLabels(model,'gunsa-airport-shiquanhe')).toEqual(before);
   model.update(p,size);expect(assertEndpointLabels(model,'gunsa-airport-shiquanhe')).toEqual(before);
   expect(JSON.stringify(place.data.features)).toBe(sourceFeatures);expect(place.group.userData.event.historicalGeometryChanged).toBe(false);
  }finally{model.dispose();}
 });
});
