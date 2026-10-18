import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {buildCityLocalMap} from '../src/scene/cityLocalMap';
import {storyAtlasPosition,STORY_ATLAS_META} from '../src/scene/storyAtlas';

vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;}}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

const manifest=JSON.parse(readFileSync('public/assets/terrain/local-places/manifest.json','utf8'));
const corridors=JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json','utf8'));
function sourceResponse(url){
  const bytes=readFileSync(`public${url}`);
  return {ok:true,json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
}
function setup(options={localityId:'lhasa'},override){
  const fetch=vi.fn(async url=>override?.(url)??sourceResponse(url));vi.stubGlobal('fetch',fetch);
  const camera=new THREE.PerspectiveCamera(43,950/490,.00001,300),size=new THREE.Vector2(950,490);
  const model=buildCityLocalMap({camera,project:storyAtlasPosition,
    metresPerUnit:(STORY_ATLAS_META.east-STORY_ATLAS_META.west)*111320*Math.cos(29.5*Math.PI/180)/STORY_ATLAS_META.width,
    focus:(position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();}},options);
  return {model,fetch,size};
}

describe('scoped local map preload on the same regional world',()=>{
  it('reads only Lhasa OSM and fine DEM while retaining original source nodes and route geometry',async()=>{
    const {model,fetch,size}=setup();await model.ready;
    const urls=fetch.mock.calls.map(([url])=>url),meta=manifest.places.find(place=>place.id==='lhasa');
    expect([...model.places.keys()]).toEqual(['lhasa']);
    expect(urls).toEqual(expect.arrayContaining(['/assets/terrain/local-places/manifest.json','/data/local-places/transport-corridors.manifest.json','/data/local-places/lhasa.geojson',meta.dataUrl]));
    for(const other of manifest.places.filter(place=>place.id!=='lhasa')){
      expect(urls).not.toContain(`/data/local-places/${other.id}.geojson`);expect(urls).not.toContain(other.dataUrl);
    }
    expect(urls).toEqual(expect.arrayContaining(['/data/lhasa-evolution/manifest.json','/data/lhasa-evolution/evolution-lhasa.years.bin']));
    expect(urls).toHaveLength(6);
    model.update({scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:4,season:1,
      progress:.34+.34*(.52+.24*.7),selected:'city:lhasa',cutaway:false,playing:false,
      overviewPresentation:true,cityLifeServices:true,cityAccessTransfer:true,resetKey:0,onInteract:()=>{},onSelect:()=>{}},size);
    const place=model.active(),source=corridors.routes.find(route=>route.id==='lhasa-station-liuwu-north-bank');
    expect(place.id).toBe('lhasa');expect(place.routeInfo.coordinates).toEqual(source.coordinates);
    expect(place.routeInfo.sourceNodeIds).toEqual(source.sourceNodeIds);
    expect(place.routeInfo.sourceWayIdsByEdge).toEqual(source.sourceWayIdsByEdge);
    expect(place.data.metadata.bbox).toEqual(meta.bbox);model.dispose();
  });

  it('keeps the default three-place acquisition contract',async()=>{
    const {model,fetch}=setup({});await model.ready;
    expect([...model.places.keys()].sort()).toEqual(['lhasa','lulang','shiquanhe']);
    const urls=fetch.mock.calls.map(([url])=>url);
    for(const place of manifest.places){expect(urls).toContain(`/data/local-places/${place.id}.geojson`);expect(urls).toContain(place.dataUrl);}
    model.dispose();
  });

  it.each(['/data/lhasa-evolution/manifest.json','/data/lhasa-evolution/evolution-lhasa.years.bin'])('does not release narration readiness without required spatial-change evidence: %s',async missing=>{
    const {model}=setup({localityId:'lhasa'},url=>url===missing?{ok:false}:undefined);
    await expect(model.ready).rejects.toThrow('拉萨真实局部地理资料未就绪');
    expect(model.group.userData.failures).toContain('lhasa-evolution');model.dispose();
  });

  it('rejects an unknown explicit locality without silently loading the default places',async()=>{
    const {model,fetch}=setup({localityId:'unknown-locality'});
    await expect(model.ready).rejects.toThrow('未知的局部地理资料范围：unknown-locality');
    expect(fetch).not.toHaveBeenCalled();expect(model.places.size).toBe(0);model.dispose();
  });

  it.each(['manifest','osm','identity','dem','corridors'])('rejects missing or mismatched required %s in a scoped example',async failure=>{
    const {model}=setup({localityId:'lhasa'},url=>{
      if(failure==='manifest'&&url==='/assets/terrain/local-places/manifest.json')return {ok:true,json:async()=>({...manifest,places:manifest.places.filter(place=>place.id!=='lhasa')})};
      if(failure==='osm'&&url==='/data/local-places/lhasa.geojson')return {ok:false};
      if(failure==='identity'&&url==='/data/local-places/lhasa.geojson')return {ok:true,json:async()=>{const data=JSON.parse(readFileSync(`public${url}`,'utf8'));return {...data,metadata:{...data.metadata,id:'lulang'}};}};
      if(failure==='dem'&&url===manifest.places.find(place=>place.id==='lhasa').dataUrl)return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};
      if(failure==='corridors'&&url==='/data/local-places/transport-corridors.manifest.json')return {ok:true,json:async()=>({routes:corridors.routes.filter(route=>route.cityId!=='lhasa')})};
    });
    await expect(model.ready).rejects.toThrow('拉萨真实局部地理资料未就绪（lhasa）');
    expect(model.group.userData.failures).toContain(failure==='corridors'?'transport-corridors':'lhasa');
    model.dispose();
  });

  it('retains the older default fallback and disabled no-fetch behavior',async()=>{
    const {model}=setup({},url=>url==='/data/local-places/lhasa.geojson'?{ok:false}:undefined);
    await expect(model.ready).resolves.toBeUndefined();
    expect([...model.places.keys()].sort()).toEqual(['lulang','shiquanhe']);model.dispose();
    const disabled=setup({enabled:false,localityId:'lhasa'});await disabled.model.ready;
    expect(disabled.fetch).not.toHaveBeenCalled();expect(disabled.model.places.size).toBe(0);disabled.model.dispose();
  });
});
