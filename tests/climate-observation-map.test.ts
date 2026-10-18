import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {climateStations,getClimateObservationMonth} from '../src/data/climateObservations';
import {buildClimateObservationMap,CLIMATE_PRECIPITATION_CHART_UNITS_PER_MM,climatePrecipitationChartHeight} from '../src/scene/climateObservationMap';

vi.mock('../src/scene/environment',async original=>({...await original<typeof import('../src/scene/environment')>(),label:(text:string)=>{
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;
}}));
afterEach(()=>vi.restoreAllMocks());

function objectsWithKind<T extends THREE.Object3D>(root:THREE.Object3D,kind:string):T[]{
  const objects:T[]=[];root.traverse(object=>{if(object.userData.kind===kind)objects.push(object as T);});return objects;
}
const isActuallyVisible=(object:THREE.Object3D):boolean=>object.visible&&(!object.parent||isActuallyVisible(object.parent));
type Bar=THREE.Mesh<THREE.CylinderGeometry,THREE.MeshBasicMaterial>;
type Base=THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
const size=new THREE.Vector2(1440,900);

function scene(){
  const camera=new THREE.PerspectiveCamera(43,size.x/size.y,.1,300);
  camera.position.set(3,14,15);camera.lookAt(0,.3,0);camera.updateMatrixWorld();
  // Deliberately varying map height catches accidental replacement of a terrain
  // sample by station elevation metadata or a climate-controlled surface.
  const at=vi.fn((longitude:number,latitude:number,offset=0)=>new THREE.Vector3((longitude-87)*.65,.5+(longitude-80)*.025+(latitude-30)*.04+offset,(31-latitude)*.65));
  return {map:buildClimateObservationMap({camera,at}),camera,at};
}

function trackResources(root:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  root.traverse(object=>{
    const mesh=object as THREE.Mesh;
    // Three.js sprites all share one global quad. It is not an owned geometry
    // of this layer; test the actual chart/marker/leader resources here.
    if(mesh.geometry&&!(object instanceof THREE.Sprite))geometries.add(mesh.geometry);
    if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);
  });
  return [...geometries,...materials].map(resource=>vi.spyOn(resource,'dispose'));
}

describe('actual station precipitation charts stay on the complete map',()=>{
  it('retains all three station captions in the shorter exploration viewport',()=>{
    const {map,camera}=scene();camera.aspect=740/415;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    map.update(7,new THREE.Vector2(740,415),undefined,true);
    const visible=objectsWithKind<THREE.Sprite>(map.group,'station-observation-caption').filter(isActuallyVisible);
    expect(visible).toHaveLength(6);
    map.dispose();
  });
  it('moves narration attention between stations without changing any value, position or chart height',()=>{
    const {map}=scene();map.update(7,size);
    const bars=objectsWithKind<Bar>(map.group,'station-month-precipitation-chart');
    const positions=bars.map(bar=>bar.position.clone()),heights=bars.map(bar=>bar.scale.y);
    for(const station of climateStations){
      map.update(7,size,station.wmo);
      expect(bars.filter(bar=>bar.parent!.userData.activeStation)).toHaveLength(1);
      expect(bars.find(bar=>bar.userData.stationId===station.wmo)!.material.opacity).toBe(1);
      bars.forEach((bar,index)=>{expect(bar.position.equals(positions[index])).toBe(true);expect(bar.scale.y).toBe(heights[index]);});
    }
    map.update(7,size);expect(bars.every(bar=>!bar.parent!.userData.activeStation)).toBe(true);
    expect(bars.every(bar=>bar.material.opacity===.82)).toBe(true);map.dispose();
  });
  it('builds three genuinely visible cylinder bodies with both numeric captions and leads to the station positions',()=>{
    const {map}=scene();map.update(7,size);map.group.updateMatrixWorld(true);
    const bars=objectsWithKind<Bar>(map.group,'station-month-precipitation-chart');
    const bases=objectsWithKind<Base>(map.group,'published-weather-station-location');
    const captions=objectsWithKind<THREE.Sprite>(map.group,'station-observation-caption');
    expect(bars).toHaveLength(3);expect(bases).toHaveLength(3);expect(captions).toHaveLength(6);
    expect(bars.every(isActuallyVisible)).toBe(true);expect(bases.every(isActuallyVisible)).toBe(true);expect(captions.every(isActuallyVisible)).toBe(true);
    for(const bar of bars){
      expect(bar.geometry).toBeInstanceOf(THREE.CylinderGeometry);
      expect(bar.geometry.getAttribute('position').count).toBeGreaterThan(30);
      expect(bar.material.opacity).toBeGreaterThan(0);expect(bar.scale.y).toBeGreaterThan(0);
      const station=climateStations.find(station=>station.wmo===bar.userData.stationId)!;
      const ownCaptions=captions.filter(caption=>caption.userData.stationId===station.wmo);
      expect(ownCaptions.map(caption=>caption.userData.text)).toEqual([
        `${station.name}站 · ${station.wmo}`,
        `${station.monthlyMeanTemperatureC[6].toFixed(1)}°C · ${station.monthlyPrecipitationMm[6].toFixed(1)} mm`,
      ]);
      const leader=bar.parent!.children.find(object=>object instanceof THREE.Line) as THREE.Line;
      expect(isActuallyVisible(leader)).toBe(true);
      const points=leader.geometry.getAttribute('position');
      expect(new THREE.Vector3().fromBufferAttribute(points,0).distanceTo(new THREE.Vector3().fromBufferAttribute(points,1))).toBeGreaterThan(.01);
    }
    map.dispose();
  });

  it('anchors the bases to submitted station coordinates, not city pins or an assumed regional average elevation',()=>{
    const {map,at}=scene();map.update(7,size);
    const bases=objectsWithKind<Base>(map.group,'published-weather-station-location');
    for(const station of climateStations){
      const base=bases.find(base=>base.userData.longitude===station.longitude&&base.userData.latitude===station.latitude)!;
      expect(base).toBeDefined();
      expect(at).toHaveBeenCalledWith(station.longitude,station.latitude,.11);
      expect(base.position.toArray()).toEqual(at(station.longitude,station.latitude,.11).toArray());
      expect(base.rotation.x).toBeCloseTo(-Math.PI/2);
    }
    // Nyingchi's submitted weather station is not the city reference near 94.36E.
    expect(bases.find(base=>base.userData.longitude===94.47)).toBeDefined();
    map.dispose();
  });

  it('draws every source millimetre at the same absolute scale, including the July Lhasa/Nyingchi reversal',()=>{
    const {map,at}=scene();
    expect(CLIMATE_PRECIPITATION_CHART_UNITS_PER_MM).toBe(.014);
    for(const month of [1,7,12]){
      map.update(month,size);map.group.updateMatrixWorld(true);
      const bars=objectsWithKind<Bar>(map.group,'station-month-precipitation-chart');
      for(const {station,precipitationMm} of getClimateObservationMonth(month)){
        const bar=bars.find(bar=>bar.userData.stationId===station.wmo)!;
        const anchor=at(station.longitude,station.latitude,.11);
        const worldBox=new THREE.Box3().setFromObject(bar),extent=worldBox.getSize(new THREE.Vector3());
        expect(extent.y).toBeCloseTo(precipitationMm*.014,7);
        expect(worldBox.min.y).toBeCloseTo(anchor.y,7);
        expect(bar.userData).toMatchObject({month,precipitationMm,units:'mm',unitsPerMm:.014});
        expect(bar.scale.y/precipitationMm).toBeCloseTo(.014,10);
      }
      if(month===7){
        const lhasa=bars.find(bar=>bar.userData.stationId==='55591')!,nyingchi=bars.find(bar=>bar.userData.stationId==='56312')!;
        expect(lhasa.scale.y).toBeGreaterThan(nyingchi.scale.y);
        expect(lhasa.scale.y-nyingchi.scale.y).toBeCloseTo((140.5-137.4)*.014,10);
      }
    }
    expect(climatePrecipitationChartHeight(0)).toBe(0);
    expect(climatePrecipitationChartHeight(-1)).toBe(0);expect(climatePrecipitationChartHeight(NaN)).toBe(0);expect(climatePrecipitationChartHeight(Infinity)).toBe(0);
    map.dispose();
  });

  it('changes real January/July values while preserving all terrain anchors and returns exactly to January',()=>{
    const {map}=scene();map.update(1,size);
    const januaryAnchors=objectsWithKind<Base>(map.group,'published-weather-station-location').map(base=>base.position.toArray());
    const januaryHeights=objectsWithKind<Bar>(map.group,'station-month-precipitation-chart').map(bar=>bar.scale.y);
    const januaryTexts=objectsWithKind<THREE.Sprite>(map.group,'station-observation-caption').map(caption=>caption.userData.text);
    map.update(7,size);
    expect(objectsWithKind<Base>(map.group,'published-weather-station-location').map(base=>base.position.toArray())).toEqual(januaryAnchors);
    expect(objectsWithKind<Bar>(map.group,'station-month-precipitation-chart').map(bar=>bar.scale.y)).not.toEqual(januaryHeights);
    expect(objectsWithKind<THREE.Sprite>(map.group,'station-observation-caption').map(caption=>caption.userData.text)).toContain('15.0°C · 22.9 mm');
    map.update(1,size);
    expect(objectsWithKind<Base>(map.group,'published-weather-station-location').map(base=>base.position.toArray())).toEqual(januaryAnchors);
    expect(objectsWithKind<Bar>(map.group,'station-month-precipitation-chart').map(bar=>bar.scale.y)).toEqual(januaryHeights);
    expect(objectsWithKind<THREE.Sprite>(map.group,'station-observation-caption').map(caption=>caption.userData.text)).toEqual(januaryTexts);
    map.dispose();
  });

  it('shows no chart for an unselected or invalid month, including after a valid observation',()=>{
    const {map}=scene();
    for(const month of [undefined,0,13,7.5,NaN,Infinity]){
      expect(()=>map.update(month,size)).not.toThrow();expect(map.group.visible).toBe(false);expect(map.group.children).toHaveLength(0);
    }
    map.update(7,size);
    for(const month of [undefined,0,13,7.5,NaN]){
      map.update(month,size);expect(map.group.visible).toBe(false);
      expect(objectsWithKind<Bar>(map.group,'station-month-precipitation-chart').some(isActuallyVisible)).toBe(false);
    }
    map.dispose();
  });

  it('reuses an unchanged month after returning from the mechanism and releases every replaced geometry/material once',()=>{
    const {map}=scene();map.update(7,size);
    const originals=map.group.children.slice(),originalResources=trackResources(map.group);
    for(let index=0;index<4;index++){
      map.update(undefined,size);map.update(7,size);
      expect(map.group.children).toEqual(originals);expect(map.group.children).toHaveLength(3);
    }
    expect(originalResources.every(spy=>spy.mock.calls.length===0)).toBe(true);
    map.update(1,size);
    expect(originalResources.every(spy=>spy.mock.calls.length===1)).toBe(true);
    expect(originals.every(group=>group.parent===null)).toBe(true);
    const january=map.group.children.slice(),januaryResources=trackResources(map.group);
    map.update(7,size);
    expect(januaryResources.every(spy=>spy.mock.calls.length===1)).toBe(true);
    expect(january.every(group=>group.parent===null)).toBe(true);
    expect(objectsWithKind<Bar>(map.group,'station-month-precipitation-chart')).toHaveLength(3);
    const finalResources=trackResources(map.group);map.dispose();map.dispose();
    expect(map.group.children).toHaveLength(0);expect(finalResources.every(spy=>spy.mock.calls.length===1)).toBe(true);
  });
});
