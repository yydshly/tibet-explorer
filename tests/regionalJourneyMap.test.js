import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {buildStoryAtlasScene,STORY_ATLAS_META} from '../src/scene/storyAtlas';
import {TERRAIN_READING_META} from '../src/scene/terrainReading';
import {disposeTree} from '../src/scene/environment';
vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;}}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const find=(group,kind)=>{const result=[];group.traverse(item=>{if(item.userData.kind===kind)result.push(item);});return result;};
async function fixture(regionalCityId){
 const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16'),boundaries=JSON.parse(readFileSync('public/assets/earth-context.json','utf8'));
 vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,loaded)=>{const texture=new THREE.Texture();loaded?.(texture);return texture;});
 vi.stubGlobal('fetch',vi.fn(async url=>{
  if(url.startsWith('/data/regional-places/')){const data=readFileSync(`public${url}`);return {ok:true,json:async()=>JSON.parse(data.toString('utf8')),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};}
  return url===STORY_ATLAS_META.boundaries?{ok:true,json:async()=>boundaries}:{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 }));
 const camera=new THREE.PerspectiveCamera(43,1280/800,.1,300),focus=vi.fn((position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();});
 const model=buildStoryAtlasScene({camera,renderer:{getSize:value=>value.set(1280,800),capabilities:{getMaxAnisotropy:()=>8}},sun:new THREE.DirectionalLight(),focus,hasSavedView:()=>false},{localDetails:false,overviewMesh:false,regionalCityId});
 await model.ready;return {model,camera,focus};
}
const settings={scene:'region',viewKey:'atlas',layer:'atlas-regional-journey',selected:'city:chamdo',step:0,regionalCue:1,regionalProcess:true,progress:.65,season:1,playing:false,resetKey:0,cutaway:false};
describe('four regions use one continuous full-resolution map without unrelated local data',()=>{
 it('loads only the actual common DEM and boundaries while keeping every original regional mesh sample',async()=>{
  const {model}=await fixture();try{
   model.update(settings);
   expect(fetch.mock.calls.map(([url])=>url).sort()).toEqual([STORY_ATLAS_META.elevation,STORY_ATLAS_META.boundaries].sort());
   const terrain=find(model.group,'sourced-dem')[0];
   expect(terrain.geometry.attributes.position.count).toBe(TERRAIN_READING_META.columns*TERRAIN_READING_META.rows);
   expect(find(model.group,'regional-journey-overlay')[0].visible).toBe(true);
   expect(find(model.group,'city-reference').filter(item=>item.visible)).toHaveLength(7);
   expect(find(model.group,'actual-local-geography')).toHaveLength(0);
   model.update({...settings,step:3,regionalCue:0});expect(fetch.mock.calls).toHaveLength(2);
  }finally{model.dispose();disposeTree(model.group);}
 });
 it('approaches the region on the same untouched mesh and returns to all seven places',async()=>{
  const {model,camera,focus}=await fixture();try{
   model.update(settings);const far=camera.position.clone(),terrain=find(model.group,'sourced-dem')[0],positions=terrain.geometry.attributes.position.array.slice();
   model.update({...settings,regionalCloseView:true});expect(camera.position.equals(far)).toBe(false);expect(focus).toHaveBeenCalledTimes(2);
   expect(find(model.group,'sourced-dem')[0]).toBe(terrain);expect(terrain.geometry.attributes.position.array).toEqual(positions);
   model.update({...settings,regionalCloseView:false});expect(camera.position.distanceTo(far)).toBeLessThan(1e-8);
   expect(find(model.group,'city-reference').filter(item=>item.visible)).toHaveLength(7);
   expect(fetch.mock.calls).toHaveLength(2);
  }finally{model.dispose();disposeTree(model.group);}
 });
 it('leaves acquired history for environment on the same near-view without retaining local depth or relief',async()=>{
  const {model,focus}=await fixture('shigatse');try{
   const state={...settings,selected:'city:shigatse',regionalCloseView:true};
   model.update({...state,step:0});const surface=find(model.group,'sourced-dem')[0],original=surface.geometry.attributes.position.array.slice();
   model.update({...state,step:2,regionalCue:0});expect(focus.mock.calls.at(-1)[2]).toBe('local-place');
   const count=focus.mock.calls.length;model.update({...state,step:0});
   expect(focus.mock.calls.length).toBeGreaterThan(count);expect(focus.mock.calls.at(-1)[2]).not.toBe('local-place');
   expect(surface.geometry.attributes.position.array).toEqual(original);
   expect(find(model.group,'regional-acquired-city-space')[0].visible).toBe(false);
  }finally{model.dispose();disposeTree(model.group);}
 });
});
