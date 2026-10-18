import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {atlasHotspots} from '../src/data/atlas';
import {regionalAnchors} from '../src/data/regionalStudy';
import {verifiedPlaceReferences} from '../src/data/placeProvenance';
import {buildStoryAtlasScene,STORY_ATLAS_META,storyAtlasPosition} from '../src/scene/storyAtlas';
import {disposeTree,GOLD,TEAL} from '../src/scene/environment';

vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;
}}));
const disposals=[];
afterEach(()=>{for(const dispose of disposals.splice(0))dispose();vi.restoreAllMocks();vi.unstubAllGlobals();});

const find=(root,kind)=>{const result=[];root.traverse(item=>{if(item.userData.kind===kind)result.push(item);});return result;};
const physicallyVisible=object=>{
  for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return false;
  const materials=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
  return materials.every(material=>material.visible&&(!material.transparent||material.opacity>.015));
};
const baseProps={scene:'region',viewKey:'atlas',layer:'atlas-overview',step:0,season:1,
  progress:0,playing:false,selected:'',cutaway:false,resetKey:0,overviewPresentation:true,
  overviewTopic:'regions',onSelect:()=>{},onInteract:()=>{}};

async function fixture({elevationFailure,requireElevation=true,awaitReady=true}={}){
  const requests=[];
  const bytes=readFileSync(`public${STORY_ATLAS_META.elevation}`);
  const boundaries=JSON.parse(readFileSync(`public${STORY_ATLAS_META.boundaries}`,'utf8'));
  vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,loaded)=>{
    const texture=new THREE.Texture();loaded?.(texture);return texture;
  });
  vi.stubGlobal('fetch',vi.fn(async url=>{
    requests.push(String(url));
    if(url===STORY_ATLAS_META.boundaries)return {ok:true,json:async()=>boundaries};
    if(url===STORY_ATLAS_META.elevation){
      if(elevationFailure==='http')return{ok:false,status:404};
      if(elevationFailure==='network')throw new TypeError('Failed to fetch terrain');
      const length=bytes.byteLength-(elevationFailure==='truncated'?2:0);
      return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+length)};
    }
    // A whole-map model must not fetch any local streets, buildings or imagery.
    throw new Error(`Unexpected whole-map data request: ${url}`);
  }));
  const viewport={width:1280,height:760},camera=new THREE.PerspectiveCamera(43,viewport.width/viewport.height,.1,300);
  const focus=vi.fn((position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();});
  const model=buildStoryAtlasScene({camera,renderer:{getSize:v=>v.set(viewport.width,viewport.height),
    capabilities:{getMaxAnisotropy:()=>8}},sun:new THREE.DirectionalLight(),focus,hasSavedView:()=>false},
    {localDetails:false,overviewMesh:true,requireElevation});
  disposals.push(()=>{model.dispose();disposeTree(model.group);});
  if(awaitReady){await model.ready;model.update(baseProps,0,0);}
  return {model,camera,focus,requests};
}

describe('the overview remains one sourced regional map',()=>{
  it.each(['http','network','truncated'])('blocks continuous narration readiness when the real DEM has a %s failure',async elevationFailure=>{
    const {model,requests}=await fixture({elevationFailure,awaitReady:false});
    await expect(model.ready).rejects.toThrow('Atlas elevation required for the continuous overview');
    model.update(baseProps,0,0);
    expect(requests).toContain(STORY_ATLAS_META.elevation);
    expect(physicallyVisible(find(model.group,'sourced-dem')[0])).toBe(false);
  });

  it('keeps the legacy atlas fallback when strict overview elevation readiness is not requested',async()=>{
    const {model}=await fixture({elevationFailure:'http',requireElevation:false});
    await expect(model.ready).resolves.toBeUndefined();
    model.update({...baseProps,layer:'atlas-cities',selected:'city:shigatse'},0,0);
    expect(physicallyVisible(find(model.group,'sourced-dem')[0])).toBe(false);
    expect(find(model.group,'city-reference').filter(physicallyVisible)).toHaveLength(7);
  });

  it('renders shipped terrain and administrative context without requesting the three local detail collections',async()=>{
    const {model,requests}=await fixture();
    expect(requests.sort()).toEqual([STORY_ATLAS_META.boundaries,STORY_ATLAS_META.elevation].sort());
    const terrain=find(model.group,'sourced-dem')[0];
    expect(physicallyVisible(terrain)).toBe(true);
    const heights=Array.from(terrain.geometry.attributes.position.array).filter((_,index)=>index%3===1);
    expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(.3);
    expect(terrain.material.map).toBeInstanceOf(THREE.Texture);
    const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <map_fragment>'};
    terrain.material.onBeforeCompile(shader);
    const mask=shader.uniforms.atlasRegionMask.value;
    expect(mask).toBeInstanceOf(THREE.DataTexture);
    expect(mask.image.data.some(value=>value>0)).toBe(true);
    expect(mask.image.data.some(value=>value===0)).toBe(true);
    expect(shader.uniforms.atlasOutsideStrength.value).toBe(1);
    expect(shader.uniforms.atlasLocalActive.value).toBe(0);
    for(const kind of ['china-boundary','tibet-boundary']){
      const border=find(model.group,kind)[0];expect(border.visible).toBe(true);
      const lines=[];border.traverse(item=>{if(item instanceof THREE.Line&&physicallyVisible(item))lines.push(item);});
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.some(line=>line.geometry.attributes.position.count>3)).toBe(true);
    }
    for(const kind of ['real-local-place-geography','city-continuity-overlay','city-life-overlay','same-map-three-city-comparison'])
      for(const object of find(model.group,kind))expect(physicallyVisible(object)).toBe(false);
  });

  it('keeps all seven located city meshes while a selected history point gets its own visible label',async()=>{
    const {model,camera,focus}=await fixture();
    const initialCalls=focus.mock.calls.length,initialCamera=camera.position.clone();
    for(const id of ['nyade-evidence','lhasa-stele','tholing-exchange']){
      const source=atlasHotspots.find(point=>point.id===id);expect(source).toBeDefined();
      model.update({...baseProps,overviewTopic:'history',overviewFocus:id,overviewTitle:source.title,
        overviewYear:id==='lhasa-stele'?'821—823年':undefined,selected:`point:${id}`,progress:.65},0,0);
      const pin=find(model.group,'atlas-hotspot').find(pin=>pin.userData.selectId===`atlas:${id}`);
      expect(physicallyVisible(pin)).toBe(true);
      expect(pin.material.color.getHex()).toBe(GOLD);
      const projectedSource=storyAtlasPosition(source.longitude,source.latitude);
      expect(pin.position.x).toBeCloseTo(projectedSource.x,6);expect(pin.position.z).toBeCloseTo(projectedSource.z,6);
      const selectedLabels=model.group.children.filter(item=>item instanceof THREE.Sprite&&item.visible&&
        item.userData.screenAnnotation&&item.userData.selectId===`atlas:${id}`);
      expect(selectedLabels).toHaveLength(1);
      expect(selectedLabels[0].userData.text).toBe(source.mapLabel);
      const cities=find(model.group,'city-reference').filter(physicallyVisible);
      expect(cities).toHaveLength(7);
      for(const city of regionalAnchors){
        const cityPin=cities.find(pin=>pin.userData.cityId===city.id),reference=verifiedPlaceReferences[city.id];
        expect(cityPin).toBeDefined();expect(cityPin.userData.selectId).toBe(`city:${city.id}`);
        expect(cityPin.userData.reference.longitude).toBe(reference.longitude);
        expect(cityPin.userData.reference.latitude).toBe(reference.latitude);
        const location=storyAtlasPosition(reference.longitude,reference.latitude);
        expect(cityPin.position.x).toBeCloseTo(location.x,6);expect(cityPin.position.z).toBeCloseTo(location.z,6);
        const projected=cityPin.position.clone().project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);expect(Math.abs(projected.y)).toBeLessThan(1);
      }
      expect(focus).toHaveBeenCalledTimes(initialCalls);expect(camera.position).toEqual(initialCamera);
    }
    model.update({...baseProps,overviewTopic:'history',overviewFocus:undefined,overviewYear:'1951—1965年',selected:''},0,0);
    expect(find(model.group,'atlas-hotspot').filter(physicallyVisible)).toHaveLength(0);
    for(const cityPin of find(model.group,'city-reference'))expect(cityPin.material.color.getHex()).toBe(TEAL);
    expect(focus).toHaveBeenCalledTimes(initialCalls);
  });

  it('treats historical years as reading context, preserving all source terrain and modern outlines',async()=>{
    const {model,camera,focus}=await fixture();
    const terrain=find(model.group,'sourced-dem')[0],terrainVertices=terrain.geometry.attributes.position.array.slice();
    const lines=[];
    for(const kind of ['china-boundary','tibet-boundary'])find(model.group,kind)[0].traverse(item=>{
      if(item instanceof THREE.Line)lines.push({object:item,positions:item.geometry.attributes.position.array.slice()});
    });
    const childIds=model.group.children.map(child=>child.uuid),calls=focus.mock.calls.length;
    camera.position.add(new THREE.Vector3(.3,.4,.2));camera.lookAt(storyAtlasPosition(88,32));camera.updateMatrixWorld();
    const manuallyAdjusted=camera.position.clone();
    for(const year of ['约4万—3万年前','7世纪','821—823年','1042年','1645—1648年','1951—1965年']){
      model.update({...baseProps,overviewTopic:'history',overviewYear:year,overviewTitle:`阅读${year}`,
        selected:'point:lhasa-stele',overviewFocus:'lhasa-stele',progress:.87},0,0);
      expect(terrain.geometry.attributes.position.array).toEqual(terrainVertices);
      for(const line of lines)expect(line.object.geometry.attributes.position.array).toEqual(line.positions);
      expect(model.group.children.map(child=>child.uuid)).toEqual(childIds);
      expect(camera.position).toEqual(manuallyAdjusted);expect(focus).toHaveBeenCalledTimes(calls);
    }
    // Changing topic and focal material also preserves the user's orbit.
    model.update({...baseProps,overviewTopic:'culture',selected:'city:shigatse',overviewFocus:'shigatse'},0,0);
    expect(camera.position).toEqual(manuallyAdjusted);expect(focus).toHaveBeenCalledTimes(calls);
    expect(terrain.geometry.attributes.position.array).toEqual(terrainVertices);
  });

  it('preserves ordinary atlas topics, seven-city mode and the existing physical comparison layer',async()=>{
    const {model,requests}=await fixture();
    const terrain=find(model.group,'sourced-dem')[0],geometry=terrain.geometry;
    model.update({...baseProps,layer:'atlas-history',selected:'lhasa-stele'},0,0);
    expect(find(model.group,'atlas-hotspot').find(pin=>pin.userData.selectId==='atlas:lhasa-stele').visible).toBe(true);
    model.update({...baseProps,layer:'atlas-cities',selected:'city:shigatse'},0,0);
    expect(find(model.group,'city-reference').filter(physicallyVisible)).toHaveLength(7);
    expect(find(model.group,'atlas-hotspot').filter(physicallyVisible)).toHaveLength(0);
    model.update({...baseProps,layer:'atlas-city-comparison',step:0,selected:'city:lhasa',progress:.5,
      comparisonRelief:true,cityLifeServices:true,cityAccessTransfer:true,cityBuiltLayer:true},0,0);
    const comparison=find(model.group,'same-map-three-city-comparison')[0];
    expect(physicallyVisible(comparison)).toBe(true);
    const parcels=find(comparison,'three-city-dem-clearing-parcel');
    expect(parcels.filter(physicallyVisible)).toHaveLength(3);
    expect(parcels.every(parcel=>parcel.geometry.attributes.position.count>0)).toBe(true);
    expect(terrain.geometry).toBe(geometry);expect(physicallyVisible(terrain)).toBe(true);
    model.update(baseProps,0,0);
    expect(physicallyVisible(comparison)).toBe(false);
    expect(find(model.group,'city-reference').filter(physicallyVisible)).toHaveLength(7);
    expect(requests.sort()).toEqual([STORY_ATLAS_META.boundaries,STORY_ATLAS_META.elevation].sort());
  });
});
