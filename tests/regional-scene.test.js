import {describe,expect,it,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {buildTerrainReadingScene,TERRAIN_READING_META,sampleTerrainMetres} from '../src/scene/terrainReading';
import {regionalAnchors} from '../src/data/regionalStudy';
import {disposeTree,GOLD,TEAL} from '../src/scene/environment';
import {regionPair} from '../src/data/regionalStudy';

vi.mock('../src/scene/environment',async original=>({...await original(),label:(text)=>{
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;
}}));
afterEach(()=>vi.unstubAllGlobals());

describe('同一高程网格上的地区对照',()=>{
  it('真实网格在七地区模式完成加载，两地点都可选且不会进入缺失河谷标签分支',async()=>{
    const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
    const context=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop:()=>{}}):()=>{}});
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>context})});
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})));
    const camera=new THREE.PerspectiveCamera(43,1.6,.1,180);camera.position.set(9,39,33);camera.lookAt(0,1.4,0);camera.updateMatrixWorld();
    const model=buildTerrainReadingScene({camera,renderer:{getSize:vector=>vector.set(870,522)},sun:new THREE.DirectionalLight(),focus:()=>{},hasSavedView:()=>false},{regional:true});
    const surface=model.group.children.find(object=>object.geometry?.attributes.position.count===TERRAIN_READING_META.rows*TERRAIN_READING_META.columns);
    await vi.waitFor(()=>expect(surface.visible).toBe(true));
    const props={scene:'region',viewKey:'E2',season:1,layer:'terrain',progress:.5,selected:'nyingchi',compareRegion:'nagqu',cutaway:false};
    model.update(props,0,0);
    const grid=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2),terrain=Array.from(surface.geometry.attributes.position.array),cameraMatrix=camera.matrixWorld.toArray();
    const probes=['terrain-probe','terrain-reference-height'].map(id=>model.group.children.find(child=>child.userData.guideId===id));
    for(const [index,id]of ['nyingchi','nagqu'].entries()){
      const point=regionalAnchors.find(item=>item.id===id),probe=probes[index];
      expect(probe.visible).toBe(true);expect(probe.userData.coordinates).toEqual([point.longitude,point.latitude]);
      expect(probe.userData.sourceMetres).toBeCloseTo(sampleTerrainMetres(grid,point.longitude,point.latitude),8);
      expect(probe.userData.guideAnchor).toBeInstanceOf(THREE.Vector3);
    }
    const pins=[];model.group.traverse(object=>{if(object instanceof THREE.Mesh&&['nyingchi','nagqu'].includes(object.userData.selectId))pins.push(object)});
    expect(pins).toHaveLength(2);expect(pins.map(pin=>pin.material.color.getHex())).toEqual(expect.arrayContaining([GOLD,TEAL]));
    expect(model.group.children.some(object=>object.userData.text?.includes('未能加载'))).toBe(false);
    model.update({...props,compareRegion:'ngari'},100,20);
    const ngari=regionalAnchors.find(item=>item.id==='ngari');expect(probes[1].userData.coordinates).toEqual([ngari.longitude,ngari.latitude]);
    expect(Array.from(surface.geometry.attributes.position.array)).toEqual(terrain);expect(camera.matrixWorld.toArray()).toEqual(cameraMatrix);
    expect(surface.geometry.attributes.position.count).toBe(TERRAIN_READING_META.rows*TERRAIN_READING_META.columns);
    model.dispose();disposeTree(model.group);
  });
  it('两个入口保持不同，失效保存值回到明确的默认对照',()=>{
    expect(regionPair({selected:'nyingchi',compareRegion:'nyingchi'})).toEqual(['nyingchi','nagqu']);
    expect(regionPair({selected:'missing',compareRegion:'missing'})).toEqual(['nyingchi','nagqu']);
    expect(regionPair({selected:'nagqu',compareRegion:'ngari'})).toEqual(['nagqu','ngari']);
  });
});
