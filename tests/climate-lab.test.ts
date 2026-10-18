// @ts-expect-error Node is used only in this test, never by the browser.
import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {climateLabCoordinates,climateLabAirState} from '../src/lib/climateLabProcess';
import {climateLabNarrationCues,climateLabNarratedProgress,type ClimateLabState} from '../src/data/climateLab';
import {sampleTerrainMetres} from '../src/scene/terrainReading';
import {buildClimateLabOverlay} from '../src/scene/climateLabOverlay';
import manifest from '../public/assets/audio/narration/cue-manifest.json';
vi.mock('../src/scene/environment',async original=>({...await original<typeof import('../src/scene/environment')>(),label:(text:string)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial());s.userData.text=text;return s;}}));
const state:ClimateLabState={stage:'air',progress:.5,moisture:'higher',city:'nyingchi',month:7,zoom:false,direction:'north-south'};
const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid=new Int16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const metres=(lon:number,lat:number)=>sampleTerrainMetres(grid,lon,lat);
describe('interactive climate-to-life chain',()=>{
 it('keeps the actual DEM unchanged while moisture changes clouds and rain',()=>{
  const points=Array.from({length:101},(_,i)=>{const c=climateLabCoordinates(state,i/100);return metres(c.longitude,c.latitude);});
  expect(Math.max(...points)-Math.min(...points)).toBeGreaterThan(2500);
  const peak=points.indexOf(Math.max(...points))/100;
  const wet=climateLabAirState(points,peak,'higher')!,dry=climateLabAirState(points,peak,'lower')!;
  expect(wet.ground).toBe(dry.ground);expect(wet.rain).toBeGreaterThan(dry.rain);expect(wet.cloud).toBeGreaterThan(dry.cloud);
 });
 it('updates rendered geometry and clears it for sourced statistics, with direct pick points',()=>{
  const scene=buildClimateLabOverlay({metres,at:(lon,lat,offset=0)=>new THREE.Vector3(lon-90,metres(lon,lat)/1000+offset,32-lat)});
  scene.update(state);const wet=scene.group.userData.cloud;scene.update({...state,moisture:'lower'});expect(scene.group.userData.cloud).toBeLessThan(wet);
  const picks:THREE.Object3D[]=[];scene.group.traverse(o=>{if(o.userData.selectId?.startsWith('lab-probe:'))picks.push(o);});expect(picks).toHaveLength(5);
  scene.update({...state,stage:'evidence'});expect(scene.group.visible).toBe(false);
  scene.update({...state,stage:'life',direction:'east-west'});expect(scene.group.visible).toBe(true);expect(scene.group.userData.groundMetres).toBeGreaterThan(0);
  scene.dispose();
 });
 it('does not extrapolate if elevation is unavailable',()=>{
  const scene=buildClimateLabOverlay({metres:()=>undefined,at:()=>new THREE.Vector3()});scene.update(state);expect(scene.group.visible).toBe(false);scene.dispose();
 });
 it('changes actual cloud visibility and rain geometry at a fixed parcel, with a matching attached annotation',()=>{
  const scene=buildClimateLabOverlay({metres,at:(lon,lat,offset=0)=>new THREE.Vector3(lon-90,metres(lon,lat)/1000+offset,32-lat)});
  const held={...state,progress:.60};let latest:import('../src/lib/climateLabProcess').ClimateLabReading|undefined;
  const snapshot=()=>{
   const clouds:THREE.Mesh[]=[],labels:THREE.Sprite[]=[],rain:THREE.LineSegments[]=[];
   scene.group.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial&&o.visible)clouds.push(o);if(o instanceof THREE.Sprite)labels.push(o);if(o instanceof THREE.LineSegments)rain.push(o);});
   return {clouds:clouds.length,rain:rain[0].geometry.drawRange.count,label:labels.find(l=>l.userData.text.includes('冷却'))};
  };
  scene.update(held,r=>latest=r);const wet=snapshot(),position=wet.label!.position.clone();
  expect(wet.rain).toBeGreaterThan(0);expect(wet.label?.userData.text).toContain('降水');
  scene.update({...held,moisture:'lower'},r=>latest=r);const dry=snapshot();
  expect(dry.clouds).toBeLessThan(wet.clouds);expect(dry.rain).toBe(0);expect(dry.label!.position).toEqual(position);
  expect(latest?.comparison?.higher.rain).toBeGreaterThan(latest?.comparison?.lower.rain??1);
  scene.update(held);expect(snapshot().rain).toBe(wet.rain);expect(snapshot().clouds).toBe(wet.clouds);
  scene.dispose();
 });
 it('uses independent exact native-word recordings and monotonic narrated parcel progress',()=>{
  for(const cue of climateLabNarrationCues){const clip=manifest.clips.find(c=>c.cueId===cue.id);expect(clip?.text).toBe(cue.narration);expect(clip?.timingLevel).toBe('word');let prior=0;for(let i=0;i<=100;i++){const p=climateLabNarratedProgress(cue.narration,i/100);expect(p).toBeGreaterThanOrEqual(prior);expect(p).toBeLessThanOrEqual(1);prior=p;}}
 });
});
