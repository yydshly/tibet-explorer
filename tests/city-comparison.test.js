import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { cityComparisonAirPose, cityComparisonWindow, cityComparisonDownhill, cityComparisonState,cityComparisonMobility,cityComparisonLowSpaces, CITY_COMPARISON_IDS, CITY_COMPARISON_VERTICAL_EXAGGERATION } from '../src/scene/cityComparison';
import { buildStoryAtlasScene, STORY_ATLAS_META } from '../src/scene/storyAtlas';
import { TERRAIN_READING_META, sampleTerrainMetres } from '../src/scene/terrainReading';
import { disposeTree } from '../src/scene/environment';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import { cityAccessCityRange } from '../src/lib/cityAccessState';
import { storyAtlasTravelProcess } from '../src/scene/storyAtlas';

vi.mock('../src/scene/environment', async original => ({ ...await original(), label: text => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite;
} }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid = Int16Array.from({ length: bytes.length / 2 }, (_, i) => bytes.readInt16LE(i * 2));
const read = (lon, lat) => lon >= TERRAIN_READING_META.west && lon <= TERRAIN_READING_META.east && lat >= TERRAIN_READING_META.south && lat <= TERRAIN_READING_META.north ? sampleTerrainMetres(grid, lon, lat) : undefined;
const settings = { scene: 'region', viewKey: 'atlas', layer: 'atlas-city-comparison', step: 0, progress: 1, selected: 'city:ngari', comparisonRelief: true, resetKey: 0, season: 1, playing: false, cutaway: false };
const find = (root, kind) => { const results = []; root.traverse(item => { if (item.userData.kind === kind) results.push(item); }); return results; };
async function scene(width=1280,height=800,options={}) {
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => { const texture = new THREE.Texture(); onLoad?.(texture); return texture; });
  const boundaries = JSON.parse(readFileSync('public/assets/earth-context.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn(async url => url === STORY_ATLAS_META.boundaries ? { ok: true, json: async () => boundaries } : { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }));
  const camera = new THREE.PerspectiveCamera(43, width/height, .1, 300);
  const focus = vi.fn((position, target) => { camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld(); });
  const model = buildStoryAtlasScene({ camera, renderer: { getSize: value => value.set(width,height), capabilities: { getMaxAnisotropy: () => 8 } }, sun: new THREE.DirectionalLight(), focus, hasSavedView: () => false },options);
  await model.ready; return { model, focus,camera };
}

describe('three regions visibly compare on the continuous real atlas', () => {
  it('home keeps the real regional DEM but never fetches or builds unrelated fine places, corridors or airport references',async()=>{
    const {model}=await scene(1280,720,{localDetails:false});model.update({...settings,viewKey:'atlas-home',layer:'atlas-home',progress:0});
    expect(fetch.mock.calls.map(([url])=>url).sort()).toEqual([STORY_ATLAS_META.boundaries,STORY_ATLAS_META.elevation].sort());
    expect(find(model.group,'sourced-dem')).toHaveLength(1);expect(find(model.group,'city-reference').filter(o=>o.visible)).toHaveLength(7);
    expect(find(model.group,'actual-local-geography')).toHaveLength(0);expect(find(model.group,'actual-source-runway-centreline')).toHaveLength(0);
    model.update({...settings,step:5,progress:.9});expect(fetch.mock.calls).toHaveLength(2);model.dispose();
  });
  it('travel local-geography narration never resurrects unlocated wells or gates in the regional fallback',async()=>{
    const {model}=await scene(798,380);
    for(const city of CITY_COMPARISON_IDS){
      const range=cityAccessCityRange(city),progress=range.start+(range.end-range.start)*.17,p={...settings,step:6,progress,selected:`city:${city}`,cityLifeServices:true};
      expect(storyAtlasTravelProcess(p)).toBeUndefined();model.update(p);
      const comparison=find(model.group,'same-map-three-city-comparison')[0];expect(comparison.visible).toBe(false);
      model.update({...p,cityLifeServices:false});expect(comparison.visible).toBe(false);
    }
    model.dispose();
  });
  it('samples the same angular windows from real DEM and stops each conceptual slope line at a local low point', () => {
    for (const city of CITY_COMPARISON_IDS) {
      const window = cityComparisonWindow(city, read), ref = verifiedPlaceReferences[city];
      expect(window.cells).toHaveLength(29 * 37);
      expect(window.cells[0].longitude).toBeCloseTo(ref.longitude - 1.1);
      expect(window.cells.at(-1).latitude).toBeCloseTo(ref.latitude + 1.45);
      expect(window.cells.every(point => point.metres === read(point.longitude, point.latitude) && point.lowGentle >= 0 && point.lowGentle <= 1)).toBe(true);
      const start = window.cells.reduce((a, b) => a.metres > b.metres ? a : b), flow = cityComparisonDownhill(read, start.longitude, start.latitude);
      for (let i = 1; i < flow.length; i++) {
        expect(flow[i].metres).toBeLessThan(flow[i - 1].metres);
        let previous = flow[i - 1].metres;
        for (let t = .25; t <= 1; t += .25) {
          const metres = read(THREE.MathUtils.lerp(flow[i - 1].longitude, flow[i].longitude, t), THREE.MathUtils.lerp(flow[i - 1].latitude, flow[i].latitude, t));
          expect(metres).toBeLessThanOrEqual(previous + .001); previous = metres;
        }
      }
    }
    expect(cityComparisonWindow('lhasa', () => undefined)).toBeUndefined();
  });

  it('ties expansion to real uphill height and reverses the authored phases without hidden time', () => {
    for (const city of CITY_COMPARISON_IDS) for (const progress of [0, .2, .6, 1]) {
      const pose = cityComparisonAirPose(city, progress, read), flat = cityComparisonAirPose(city, progress, read, false);
      expect(pose.highestMetres).toBeGreaterThanOrEqual(pose.terrainMetres);
      expect(flat.terrainMetres).toBe(pose.terrainMetres);
      expect(flat.gainedMetres).toBe(0); expect(flat.expansion).toBe(1); expect(flat.liftResponse).toBe(0);
      expect(cityComparisonAirPose(city, progress, read)).toEqual(pose);
    }
    expect(cityComparisonState({ ...settings, progress: .34 }, 'nyingchi').progress).toBe(1);
    expect(cityComparisonState({ ...settings, progress: .34 }, 'lhasa').progress).toBe(0);
    expect(cityComparisonState({ ...settings, progress: .68 }, 'lhasa').progress).toBe(1);
    expect(cityComparisonState({ ...settings, progress: .68 }, 'ngari').progress).toBe(0);
  });

  it('keeps three real processes and seven cities together, lands rain on DEM, and restores the same terrain after teaching flattening', async () => {
    const { model, focus } = await scene();
    const terrain = find(model.group, 'sourced-dem')[0], originalHeight = terrain.geometry.attributes.position.getY(5000);
    model.update(settings);
    expect(terrain.geometry.attributes.position.getY(5000)).toBeCloseTo(originalHeight * CITY_COMPARISON_VERTICAL_EXAGGERATION / STORY_ATLAS_META.verticalExaggeration);
    expect(find(model.group, 'regional-comparison-process')).toHaveLength(3);
    expect(find(model.group, 'city-reference').filter(item => item.visible)).toHaveLength(7);
    const clouds = find(model.group, 'conditional-cloud-not-observed-weather'); expect(clouds.some(item => item.visible)).toBe(true);
    const rains = find(model.group, 'rain-landing-on-same-dem');
    for (const rain of rains) for (const landing of rain.userData.landings) expect(landing.metres).toBe(read(landing.longitude, landing.latitude));
    const callCount = focus.mock.calls.length;
    model.update({ ...settings, progress: .1, selected: 'city:nyingchi' });
    expect(focus.mock.calls).toHaveLength(callCount);
    expect(clouds[1].visible).toBe(false); expect(clouds[2].visible).toBe(false);
    model.update({ ...settings, comparisonRelief: false });
    expect(terrain.geometry.attributes.position.getY(5000)).toBeCloseTo(.025);
    expect(clouds.every(item => !item.visible)).toBe(true);
    expect(rains.every(item => !item.visible)).toBe(true);
    model.update({ ...settings, step: 1, comparisonRelief: false });
    for (const mast of find(model.group, 'common-sea-level-city-reference')) expect(mast.userData.metres).toBeGreaterThan(2500);
    model.update({ ...settings, layer: 'atlas-cities', comparisonRelief: false });
    expect(find(model.group, 'sourced-dem')[0]).toBe(terrain);
    expect(terrain.geometry.attributes.position.getY(5000)).toBeCloseTo(originalHeight);
    expect(find(model.group, 'same-map-three-city-comparison')[0].visible).toBe(false);
    model.dispose(); disposeTree(model.group);
  });

  it('makes profiles readable through the continuous surface and outlines connected DEM spaces without inventing city boundaries', async () => {
    const { model } = await scene(); model.update({ ...settings, step: 1 });
    const curtains = find(model.group, 'three-city-shared-zero-metre-curtain');
    expect(curtains).toHaveLength(3);
    for (const profile of find(model.group, 'three-city-same-window-dem-profile')) {
      const reference = verifiedPlaceReferences[profile.userData.city], samples = profile.userData.samples;
      expect(profile.userData.direction).toBe('west-east');
      expect(samples.every(point => point.latitude === reference.latitude && point.metres === read(point.longitude, point.latitude))).toBe(true);
      expect(samples.at(-1).longitude - samples[0].longitude).toBeCloseTo(2.2);
      expect(samples[40].longitude).toBeCloseTo(reference.longitude);
    }
    for (const baseline of find(model.group, 'three-city-sea-level-profile-baseline')) {
      const position = baseline.geometry.attributes.position;
      expect(Array.from({ length: position.count }, (_, index) => position.getY(index)).every(height => height === 0)).toBe(true);
      expect(Math.abs(position.getX(0) - position.getX(position.count - 1))).toBeGreaterThan(1);
    }
    for (const curtain of curtains) {
      expect(curtain.material.depthTest).toBe(false);
      const positions = curtain.geometry.attributes.position;
      const heights = Array.from({ length: positions.count }, (_, index) => positions.getY(index));
      expect(Math.min(...heights)).toBe(0);
      expect(Math.max(...heights)).toBeGreaterThan(.5);
    }
    model.update({ ...settings, step: 2,cityLifeFocus:'settlement' });
    for (const surface of find(model.group, 'dem-relative-low-and-gentle-reading')) {
      expect(surface.geometry.attributes.position.count).toBeGreaterThan(0);
      expect(surface.userData.quads.every(quad=>quad.score>=surface.userData.threshold)).toBe(true);
      expect(surface.userData.patches.every(patch=>patch.length>=3)).toBe(true);
      expect(surface.userData.scope).toContain('窗口内部');
      expect(surface.userData.scope).toContain('不是城市边界');
    }
    expect(find(model.group,'continuous-low-gentle-space-edge')).toHaveLength(3);
    expect(find(model.group, 'visible-sampled-downhill-on-dem').length).toBeGreaterThan(0);
    model.dispose(); disposeTree(model.group);
  });

  it('keeps trial routes on actual DEM with shared endpoints and reads route relief instead of claiming a road',()=>{
    for(const city of CITY_COMPARISON_IDS){
      const window=cityComparisonWindow(city,read),route=cityComparisonMobility(window,read),flat=cityComparisonMobility(window,read,false);
      for(const key of ['longitude','latitude','metres']){
        expect(route.points[0][key]).toBe(route.start[key]);expect(route.points.at(-1)[key]).toBe(route.end[key]);
        expect(route.straight[0][key]).toBe(route.start[key]);expect(route.straight.at(-1)[key]).toBe(route.end[key]);
      }
      expect(flat.start).toEqual(route.start);expect(flat.end).toEqual(route.end);
      expect(route.points.every(point=>point.metres===read(point.longitude,point.latitude))).toBe(true);
      expect(route.straight.every(point=>point.metres===read(point.longitude,point.latitude))).toBe(true);
      expect(route.heightRange).toBeCloseTo(Math.max(...route.points.map(p=>p.metres))-Math.min(...route.points.map(p=>p.metres)));
      expect(route.scope).toContain('不是实际道路');expect(route.heightRange).toBeGreaterThan(100);
      expect(route.points.length).toBeGreaterThan(10);
    }
  });

  it('derives low-gentle patch boundaries only between selected and unselected grid quads',()=>{
    for(const city of CITY_COMPARISON_IDS){
      const window=cityComparisonWindow(city,read),spaces=cityComparisonLowSpaces(window),edges=new Map();
      for(const quad of spaces.quads)for(let i=0;i<4;i++){
        const pair=[quad.corners[i],quad.corners[(i+1)%4]].sort((a,b)=>a-b).join(':');edges.set(pair,(edges.get(pair)||0)+1);
      }
      const expected=[...edges.values()].filter(count=>count===1).length;
      expect(spaces.edges).toHaveLength(expected);
      for(const pair of spaces.edges)for(const point of pair)expect(point.metres).toBe(read(point.longitude,point.latitude));
      expect(spaces.quads.length).toBeLessThan((window.columns-1)*(window.rows-1)*.4);
      expect(cityComparisonLowSpaces(window)).toEqual(spaces);
    }
  });

  it('switches all three regions together between mobility, water and space; stopping services leaves natural water intact',async()=>{
    const {model}=await scene();
    model.update({...settings,step:2,progress:.5,cityLifeFocus:'mobility'});
    const routes=find(model.group,'comparison-mobility-reading');expect(routes).toHaveLength(3);expect(routes.every(item=>item.visible)).toBe(true);
    expect(find(model.group,'dem-slope-cost-teaching-trial')).toHaveLength(3);
    expect(find(model.group,'same-endpoint-straight-reference')).toHaveLength(3);
    model.update({...settings,step:2,cityLifeFocus:'water',cityLifeServices:true});
    expect(routes.every(item=>!item.visible)).toBe(true);
    const flows=find(model.group,'visible-sampled-downhill-on-dem'),heights=flows.map(flow=>Array.from(flow.geometry.attributes.position.array));
    expect(flows.every(flow=>flow.visible)).toBe(true);
    const uses=find(model.group,'comparison-water-use-principle');expect(uses.every(use=>use.visible)).toBe(true);
    const groundwater=find(model.group,'groundwater-source-principle')[0];expect(groundwater.visible).toBe(true);
    const sourcePosition=groundwater.position.clone();
    expect(find(model.group,'human-water-use-not-real-network').filter(path=>path.visible)).toHaveLength(2);
    model.update({...settings,step:2,cityLifeFocus:'water',cityLifeServices:false});
    expect(find(model.group,'human-water-use-not-real-network').every(path=>!path.visible)).toBe(true);
    expect(find(model.group,'abstract-operated-gate').every(gate=>!gate.visible)).toBe(true);
    expect(groundwater.visible).toBe(true);expect(groundwater.position).toEqual(sourcePosition);
    expect(flows.map(flow=>Array.from(flow.geometry.attributes.position.array))).toEqual(heights);
    expect(flows.every(flow=>flow.visible)).toBe(true);
    model.update({...settings,step:2,cityLifeFocus:'settlement'});
    expect(find(model.group,'comparison-low-space-reading').every(item=>item.visible)).toBe(true);
    expect(uses.every(use=>!use.visible)).toBe(true);expect(flows.every(flow=>!flow.visible)).toBe(true);
    model.dispose();disposeTree(model.group);
  });

  it('keeps readable water sections attached to terrain and reverses lifting, gate opening and received water',async()=>{
    const {model}=await scene();
    const update=progress=>model.update({...settings,step:2,cityLifeFocus:'water',cityLifeServices:true,progress});
    update(.65);
    const sections=find(model.group,'terrain-attached-water-section');expect(sections).toHaveLength(3);
    const lhasa=sections.find(section=>section.userData.city==='lhasa'),ngari=sections.find(section=>section.userData.city==='ngari');
    for(const section of sections){
      const attached=section.parent;
      expect(attached.position).toEqual(attached.userData.terrainAnchor);
      expect(attached.userData.pixelWidth).toBeGreaterThanOrEqual(68);expect(attached.userData.pixelWidth).toBeLessThanOrEqual(100);
      expect(attached.scale.x).toBeGreaterThan(0);
    }
    const lhasaFlow=find(lhasa,'visible-water-transfer-body')[0],received=find(lhasa,'use-end-received-water')[0];
    const lateRange=lhasaFlow.geometry.drawRange.count,lateReceived=received.userData.received;
    const path=lhasaFlow.geometry.parameters.path;
    expect(path.getPointAt(.35).y).toBeGreaterThan(path.getPointAt(0).y+.5);
    expect(lateReceived).toBeGreaterThan(.5);
    update(.4);
    expect(lhasaFlow.geometry.drawRange.count).toBeLessThan(lateRange);
    expect(received.userData.received).toBeLessThan(lateReceived);
    update(.99);const gate=find(ngari.parent,'abstract-operated-gate')[0],openY=gate.position.y;
    const ngariReceived=find(ngari,'use-end-received-water')[0];expect(ngariReceived.userData.received).toBeGreaterThan(.5);
    update(.69);expect(gate.position.y).toBeLessThan(openY-.3);expect(ngariReceived.userData.received).toBe(0);
    const natural=find(model.group,'sampled-surface-descent-section')[0];
    expect(natural.userData.samples.length).toBeGreaterThan(1);
    for(const point of natural.userData.samples)expect(point.metres).toBe(read(point.longitude,point.latitude));
    model.dispose();disposeTree(model.group);
  });

  it('separates three real caption rectangles at 390px while retaining leaders and smaller comparison sections',async()=>{
    const width=390,height=366,{model,camera}=await scene(width,height);
    for(const progress of [.15,.5,.95]){
      model.update({...settings,step:2,cityLifeFocus:'water',progress});
      model.group.updateMatrixWorld(true);
      const captions=find(model.group,'city-comparison-caption').filter(item=>item.visible);
      expect(captions).toHaveLength(3);
      const focal=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
      const rectangles=captions.map(caption=>{
        const position=caption.getWorldPosition(new THREE.Vector3()),projected=position.clone().project(camera),depth=-position.clone().applyMatrix4(camera.matrixWorldInverse).z;
        const box={x:(projected.x+1)*width/2,y:(1-projected.y)*height/2,width:caption.scale.x*focal/depth,height:caption.scale.y*focal/depth};
        expect(box.x).toBeCloseTo(caption.userData.screenBox.x,5);expect(box.width).toBeCloseTo(caption.userData.screenBox.width,5);
        expect(box.x-box.width/2).toBeGreaterThanOrEqual(11.99);expect(box.x+box.width/2).toBeLessThanOrEqual(width-11.99);
        expect(box.height).toBeGreaterThanOrEqual(23.9);expect(box.y+box.height/2).toBeLessThan(height-90);
        expect(caption.userData.text).toContain({lhasa:'拉萨',nyingchi:'林芝',ngari:'阿里'}[caption.userData.city]);
        return box;
      });
      for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
        const a=rectangles[i],b=rectangles[j];
        expect(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2+3.9).toBe(true);
      }
      for(const leader of find(model.group,'city-comparison-caption-leader')){
        const points=leader.geometry.attributes.position,anchor=leader.userData.anchor;
        expect(new THREE.Vector3(points.getX(0),points.getY(0),points.getZ(0)).distanceTo(anchor)).toBeLessThan(.00001);
      }
      expect(find(model.group,'comparison-water-use-principle').map(group=>group.userData.pixelWidth).sort((a,b)=>a-b)).toEqual([50,50,68]);
    }
    model.dispose();disposeTree(model.group);
  });
});
