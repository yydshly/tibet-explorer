import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { atlasHotspots } from '../src/data/atlas';
import { silingCoEvidence } from '../src/data/climateEvidence';
import { regionalAnchors } from '../src/data/regionalStudy';
import { buildStoryAtlasScene, STORY_ATLAS_META, storyAtlasHasElevation, storyAtlasPosition, storyAtlasTheme } from '../src/scene/storyAtlas';
import { disposeTree } from '../src/scene/environment';
import { placeAtlasLabel } from '../src/lib/atlasLabelLayout';

vi.mock('../src/scene/environment', async original => ({ ...await original(), label: text => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite;
} }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('continuous story atlas', () => {
  it('keeps labels near their real map pin instead of displacing history to another region', () => {
    const options = { anchorX: 300, anchorY: 330, width: 82, height: 23, viewportWidth: 580, minY: 120, maxY: 510, selected: false };
    const nearby = placeAtlasLabel({ ...options, occupied: [] });
    expect(Math.hypot(nearby.x - options.anchorX, nearby.y - options.anchorY)).toBeLessThanOrEqual(75);
    const crowded = placeAtlasLabel({ ...options, occupied: [{ x: 300, y: 330, width: 220, height: 180 }] });
    expect(crowded).toBeNull();
    // A point above the safe map area must not acquire a misleading label
    // hundreds of pixels away inside the visible map.
    expect(placeAtlasLabel({ ...options, anchorY: 25, occupied: [] })).toBeNull();
  });

  it('keeps map projection, north and the real elevation footprint distinct', () => {
    expect(storyAtlasPosition(80, 30).x).toBeLessThan(storyAtlasPosition(90, 30).x);
    expect(storyAtlasPosition(90, 35).z).toBeLessThan(storyAtlasPosition(90, 25).z);
    expect(storyAtlasHasElevation(91.13, 29.65)).toBe(true);
    expect(storyAtlasHasElevation(108.94, 34.34)).toBe(false);
    expect(storyAtlasHasElevation(90, 20)).toBe(false);
    expect(storyAtlasTheme('atlas-history')).toBe('history');
    expect(storyAtlasTheme('untrusted')).toBe('environment');
  });

  it('loads the shipped terrain and geographic outlines, then changes topics on one map', async () => {
    const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
    const boundaries = JSON.parse(readFileSync('public/assets/earth-context.json', 'utf8'));
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      const texture = new THREE.Texture(); onLoad?.(texture); return texture;
    });
    vi.stubGlobal('fetch', vi.fn(async url => url === STORY_ATLAS_META.boundaries
      ? { ok: true, json: async () => boundaries }
      : { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }));
    const camera = new THREE.PerspectiveCamera(43, 1.6, .1, 180);
    camera.position.set(0, .4, 0).add(new THREE.Vector3(0, 58, 39).setLength(70)); camera.lookAt(0, .4, 0); camera.updateMatrixWorld();
    const focus = vi.fn();
    const viewport = { width: 960, height: 640 };
    const model = buildStoryAtlasScene({ camera, renderer: { getSize: value => value.set(viewport.width, viewport.height), capabilities: { getMaxAnisotropy: () => 8 } },
      // StrictMode or a previous visit can already have a cache entry. The
      // scene still establishes a useful reset view before the owner restores it.
      sun: new THREE.DirectionalLight(), focus, hasSavedView: () => true });
    const terrain = model.group.children.find(object => object.userData.kind === 'sourced-dem');
    await vi.waitFor(() => expect(terrain.visible).toBe(true));
    await vi.waitFor(() => expect(model.group.children.some(object => object.userData.kind === 'tibet-boundary')).toBe(true));
    expect(terrain.geometry.attributes.position.getY(5000)).toBeGreaterThan(0);
    expect(model.group.children.some(object => object.userData.kind === 'dem-coverage')).toBe(true);
    const environment = atlasHotspots.find(item => item.themes.includes('environment'));
    const history = atlasHotspots.find(item => item.themes.includes('history'));
    const props = { scene: 'region', viewKey: 'atlas:environment', season: 1, layer: 'atlas-environment', progress: .5, selected: environment.id, cutaway: false };
    model.update(props, 0, 0);
    expect(focus).toHaveBeenCalledTimes(1);
    const firstPin = model.group.children.find(object => object.userData.kind === 'atlas-hotspot' && object.userData.selectId === `atlas:${environment.id}`);
    expect(firstPin.visible).toBe(true);
    const base = model.group.children.find(object => object.geometry?.attributes.position.count === 4);
    model.update({ ...props, viewKey: 'atlas:history', layer: 'atlas-history', selected: history.id }, 0, 0);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(model.group.children.includes(base)).toBe(true);
    expect(model.group.children.find(object => object.userData.kind === 'atlas-hotspot' && object.userData.selectId === `atlas:${history.id}`).visible).toBe(true);
    for (const [width, height] of [[960, 640], [580, 676], [390, 480]]) {
      viewport.width = width; viewport.height = height;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      camera.position.set(0, .4, 0).add(new THREE.Vector3(0, 58, 39).setLength(70 / Math.min(1, camera.aspect)));
      camera.lookAt(0, .4, 0); camera.updateMatrixWorld();
      for (const point of atlasHotspots) {
      model.update({ ...props, layer: `atlas-${point.themes[0]}`, selected: point.id }, 0, 0);
      const selectedLabel = model.group.children.find(object => object instanceof THREE.Sprite && object.userData.screenAnnotation && object.userData.selectId === `atlas:${point.id}` && object.visible);
      expect(selectedLabel, `selected material ${point.id} has a nearby readable label at ${width}×${height}`).toBeDefined();
      expect(selectedLabel.userData.text).toBe(point.mapLabel);
      const locatedPin=model.group.children.find(object=>object.userData.kind==='atlas-hotspot'&&object.userData.selectId===`atlas:${point.id}`);
      expect(locatedPin.userData.reference.longitude).toBe(point.longitude);
      expect(locatedPin.userData.reference.latitude).toBe(point.latitude);
      const mapPosition=storyAtlasPosition(point.longitude,point.latitude);
      expect(locatedPin.position.x).toBeCloseTo(mapPosition.x);
      expect(locatedPin.position.z).toBeCloseTo(mapPosition.z);
      for (const object of model.group.children) {
        if (!(object instanceof THREE.Sprite) || !object.userData.screenAnnotation || !object.visible) continue;
        const pin = model.group.children.find(candidate => candidate.userData.kind === 'atlas-hotspot' && candidate.userData.selectId === object.userData.selectId);
        if (!pin) continue;
        const annotation = object.position.clone().project(camera), location = pin.position.clone().project(camera);
        const distance = Math.hypot((annotation.x - location.x) * width / 2, (annotation.y - location.y) * height / 2);
        expect(distance).toBeLessThanOrEqual(point.id === object.userData.selectId.slice(6) ? 88.01 : 75.01);
      }
      }
    }
    const studyPin=model.group.children.find(object=>object.userData.kind==='atlas-hotspot'&&object.userData.selectId==='atlas:siling-co-study');
    expect(studyPin.visible).toBe(false);
    model.update({...props,viewKey:'climate-evidence',selected:'siling-co-study'},0,0);
    expect(studyPin.visible).toBe(true);
    expect(studyPin.userData.reference.longitude).toBe(silingCoEvidence.locationReference.longitude);
    expect(studyPin.userData.reference.latitude).toBe(silingCoEvidence.locationReference.latitude);
    model.update(props,0,0);expect(studyPin.visible).toBe(false);
    for (const object of model.group.children) expect([...object.position.toArray(), ...object.scale.toArray()].every(Number.isFinite)).toBe(true);
    model.dispose(); disposeTree(model.group);
  });

  it('keeps all seven sourced city references on one map; selection highlights without a local camera jump', async () => {
    const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
    const boundaries=JSON.parse(readFileSync('public/assets/earth-context.json','utf8'));
    vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,onLoad)=>{
      const texture=new THREE.Texture();onLoad?.(texture);return texture;
    });
    vi.stubGlobal('fetch',vi.fn(async url=>url===STORY_ATLAS_META.boundaries
      ?{ok:true,json:async()=>boundaries}
      :{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}));
    const viewport={width:960,height:640},camera=new THREE.PerspectiveCamera(43,viewport.width/viewport.height,.1,300);
    const focus=vi.fn((position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();});
    const model=buildStoryAtlasScene({camera,renderer:{getSize:value=>value.set(viewport.width,viewport.height),capabilities:{getMaxAnisotropy:()=>8}},sun:new THREE.DirectionalLight(),focus,hasSavedView:()=>false});
    await model.ready;
    const terrain=model.group.children.find(object=>object.userData.kind==='sourced-dem');
    const shader={uniforms:{},fragmentShader:'#include <map_fragment>'};
    terrain.material.onBeforeCompile(shader);
    const regionalMask=shader.uniforms.atlasRegionMask.value;
    expect(regionalMask).toBeInstanceOf(THREE.DataTexture);
    expect(regionalMask.flipY).toBe(false);
    expect(regionalMask.image.width).toBe(1024);
    const releaseMask=vi.spyOn(regionalMask,'dispose');
    const borders=model.group.children.filter(object=>['china-boundary','tibet-boundary'].includes(object.userData.kind));
    const props={scene:'region',viewKey:'atlas:cities',season:1,layer:'atlas-cities',progress:.5,selected:'city:lhasa',cutaway:false,resetKey:0};
    let expectedFocuses=0;
    for(const [width,height] of [[960,640],[580,676],[390,480]]){
      viewport.width=width;viewport.height=height;camera.aspect=width/height;camera.updateProjectionMatrix();
      model.update(props);expectedFocuses++;
      expect(shader.uniforms.atlasOutsideStrength.value).toBe(1);
      expect(model.group.children.find(object=>object.userData.text==='高程覆盖框').visible).toBe(false);
      expect(focus).toHaveBeenCalledTimes(expectedFocuses);
      expect(focus.mock.calls.at(-1)[2]).toBe('viewport');
      const pins=model.group.children.filter(object=>object.userData.kind==='city-reference'&&object.visible);
      expect(pins).toHaveLength(regionalAnchors.length);
      expect(model.group.children.filter(object=>object.userData.kind==='atlas-hotspot'&&object.visible)).toHaveLength(0);
      for(const city of regionalAnchors){
        const pin=pins.find(object=>object.userData.selectId===`city:${city.id}`);
        expect(pin,city.id).toBeDefined();
        const projected=pin.position.clone().project(camera),sourcePosition=storyAtlasPosition(city.longitude,city.latitude);
        expect(Math.abs(projected.x),`${city.id} remains horizontally visible at ${width}`).toBeLessThan(1);
        expect(Math.abs(projected.y),`${city.id} remains vertically visible at ${height}`).toBeLessThan(1);
        expect(pin.position.x).toBeCloseTo(sourcePosition.x);expect(pin.position.z).toBeCloseTo(sourcePosition.z);
        expect(pin.userData.reference.sourceId).toBe(city.coordinateSourceId);
        model.update({...props,selected:`city:${city.id}`});
        expect(focus).toHaveBeenCalledTimes(expectedFocuses);
        const selectedLabels=model.group.children.filter(object=>object instanceof THREE.Sprite&&object.userData.screenAnnotation&&object.visible&&object.userData.selectId===`city:${city.id}`);
        expect(selectedLabels,`${city.id} selected label is visible at ${width}×${height}`).toHaveLength(1);
        expect(selectedLabels[0].userData.text).toBe(city.title);
        const labelPoint=selectedLabels[0].position.clone().project(camera);
        expect(Math.abs(labelPoint.x)).toBeLessThan(1);expect(Math.abs(labelPoint.y)).toBeLessThan(1);
        const labels=model.group.children.filter(object=>object instanceof THREE.Sprite&&object.userData.screenAnnotation&&object.visible&&object.userData.cityId);
        expect(labels.length).toBeGreaterThanOrEqual(width<600?2:4);
        if(width<600)expect(labels.length).toBeLessThanOrEqual(4);
      }
    }
    const fittedPosition=camera.position.clone(),fittedTarget=focus.mock.calls.at(-1)[1].clone();
    camera.position.add(new THREE.Vector3(5,-2,3));camera.lookAt(new THREE.Vector3(7,0,0));camera.updateMatrixWorld();
    const manuallyMoved=camera.position.clone();
    model.update({...props,selected:'city:ngari'});
    expect(focus).toHaveBeenCalledTimes(expectedFocuses);expect(camera.position).toEqual(manuallyMoved);
    model.update({...props,selected:'city:ngari',resetKey:1});expectedFocuses++;
    expect(focus).toHaveBeenCalledTimes(expectedFocuses);
    expect(focus.mock.calls.at(-1)[2]).toBe('viewport');
    expect(camera.position.distanceTo(fittedPosition)).toBeLessThan(1e-6);
    expect(focus.mock.calls.at(-1)[1].distanceTo(fittedTarget)).toBeLessThan(1e-6);
    model.update({...props,selected:'city:shannan',resetKey:1});
    expect(focus).toHaveBeenCalledTimes(expectedFocuses);
    for(const pin of model.group.children.filter(object=>object.userData.kind==='city-reference')){
      const projected=pin.position.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);expect(Math.abs(projected.y)).toBeLessThan(1);
    }
    const history=atlasHotspots.find(point=>point.themes.includes('history'));
    model.update({...props,viewKey:'atlas:history',layer:'atlas-history',selected:history.id});
    expect(shader.uniforms.atlasOutsideStrength.value).toBe(.4);
    expectedFocuses++; // Topic canvas uses its full width; its sidebar is outside it.
    expect(focus).toHaveBeenCalledTimes(expectedFocuses);
    expect(model.group.children.find(object=>object.userData.kind==='atlas-hotspot'&&object.userData.selectId===`atlas:${history.id}`).visible).toBe(true);
    expect(model.group.children.includes(terrain)).toBe(true);expect(terrain.visible).toBe(true);
    expect(borders.every(border=>model.group.children.includes(border)&&border.visible)).toBe(true);
    model.update({...props,resetKey:1});expectedFocuses++;
    expect(focus).toHaveBeenCalledTimes(expectedFocuses);expect(focus.mock.calls.at(-1)[2]).toBe('viewport');
    model.dispose();model.dispose();expect(releaseMask).toHaveBeenCalledTimes(1);disposeTree(model.group);
  });

  it('refits topic maps after the real viewport arrives and on reset without jumping between topics',async()=>{
    const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
    const boundaries=JSON.parse(readFileSync('public/assets/earth-context.json','utf8'));
    vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,onLoad)=>{const texture=new THREE.Texture();onLoad?.(texture);return texture;});
    vi.stubGlobal('fetch',vi.fn(async url=>url===STORY_ATLAS_META.boundaries
      ?{ok:true,json:async()=>boundaries}
      :{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}));
    const viewport={width:300,height:150},camera=new THREE.PerspectiveCamera(43,2,.1,300);
    const focus=vi.fn((position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();});
    const model=buildStoryAtlasScene({camera,renderer:{getSize:value=>value.set(viewport.width,viewport.height),capabilities:{getMaxAnisotropy:()=>8}},sun:new THREE.DirectionalLight(),focus,hasSavedView:()=>true});
    await model.ready;
    const history=atlasHotspots.find(point=>point.themes.includes('history'));
    const props={scene:'region',viewKey:'atlas',season:1,layer:'atlas-history',progress:0,selected:history.id,cutaway:false,resetKey:0};
    model.update(props);expect(focus).toHaveBeenCalledTimes(1);
    const initialTarget=focus.mock.calls.at(-1)[1].clone();
    viewport.width=998;viewport.height=606;camera.aspect=viewport.width/viewport.height;camera.updateProjectionMatrix();
    model.update(props);expect(focus).toHaveBeenCalledTimes(2);expect(focus.mock.calls.at(-1)[2]).toBe('viewport');
    expect(focus.mock.calls.at(-1)[1].distanceTo(initialTarget)).toBeGreaterThan(.1);
    const cityPixels=regionalAnchors.map(city=>(storyAtlasPosition(city.longitude,city.latitude).project(camera).x+1)*viewport.width/2);
    expect(Math.max(...cityPixels)-Math.min(...cityPixels)).toBeGreaterThan(viewport.width*.55);
    const fittedPosition=camera.position.clone(),fittedTarget=focus.mock.calls.at(-1)[1].clone();
    camera.position.add(new THREE.Vector3(2,1,3));camera.lookAt(fittedTarget);camera.updateMatrixWorld();
    const manuallyAdjusted=camera.position.clone();
    const environment=atlasHotspots.find(point=>point.themes.includes('environment'));
    model.update({...props,layer:'atlas-environment',selected:environment.id});
    expect(focus).toHaveBeenCalledTimes(2);expect(camera.position).toEqual(manuallyAdjusted);
    model.update({...props,resetKey:1});expect(focus).toHaveBeenCalledTimes(3);
    expect(camera.position.distanceTo(fittedPosition)).toBeLessThan(1e-6);
    viewport.width=390;viewport.height=480;camera.aspect=viewport.width/viewport.height;camera.updateProjectionMatrix();
    model.update({...props,resetKey:1});expect(focus).toHaveBeenCalledTimes(4);
    const portraitPosition=camera.position.clone();
    model.update({...props,resetKey:1,layer:'atlas-development'});
    expect(focus).toHaveBeenCalledTimes(4);expect(camera.position).toEqual(portraitPosition);
    model.dispose();disposeTree(model.group);
  });
});
