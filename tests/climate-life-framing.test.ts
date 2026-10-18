// @ts-expect-error Test-only filesystem access.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {climateLabNarrationCues,climateLabLifeFocus} from '../src/data/climateLab';
import {overviewInteractionState,overviewInteractionPatch} from '../src/lib/overviewInteraction';
import type {NarrationTiming} from '../src/lib/narrationTiming';
import {climateLifeFramePoints,climateLifeCamera} from '../src/scene/climateLifeCamera';
import {storyAtlasPosition,STORY_ATLAS_META} from '../src/scene/storyAtlas';
import {sampleTerrainMetres,TERRAIN_READING_META} from '../src/scene/terrainReading';

const bytes=readFileSync(`public${TERRAIN_READING_META.dataUrl}`);
const dem=new Int16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const metresPerUnit=(STORY_ATLAS_META.east-STORY_ATLAS_META.west)*111320*Math.cos(THREE.MathUtils.degToRad((STORY_ATLAS_META.south+STORY_ATLAS_META.north)/2))/STORY_ATLAS_META.width;
const point=(lon:number,lat:number,offset:number)=>storyAtlasPosition(lon,lat,
 Math.max(.025,sampleTerrainMetres(dem,lon,lat)/metresPerUnit*STORY_ATLAS_META.verticalExaggeration)+offset);

describe.each(['LAB-life-nyingchi','LAB-life-lhasa'])('%s uses the narration clock for the same-map journey',id=>{
 const cue=climateLabNarrationCues.find(c=>c.id===id)!;
 const state=(index:number)=>overviewInteractionState(id,cue.narration,{textProgress:index/cue.narration.length} as NarrationTiming)!;
 const at=(token:string)=>{const index=cue.narration.indexOf(token);expect(index).toBeGreaterThanOrEqual(0);return state(index);};
 it('approaches, holds comparisons and returns continuously without an independent timer',()=>{
  expect(climateLabLifeFocus(state(0))).toBe(0);
  const enter=cue.narration.indexOf('再沿同一张地图拉近'),close=cue.narration.indexOf('先看地面起伏');
  expect(climateLabLifeFocus(state((enter+close)/2))).toBeCloseTo(.5);
  for(const token of ['先看地面起伏','移动探针','切换剖面方向','青色地面标出','回到全域'])expect(climateLabLifeFocus(at(token))).toBe(1);
  const leave=cue.narration.indexOf('回到全域'),end=cue.narration.indexOf('，',leave);
  expect(climateLabLifeFocus(state((leave+end)/2))).toBeCloseTo(.5);
  expect(climateLabLifeFocus(state(end))).toBe(0);
  const held=at('移动探针');at('回到全域');expect(at('移动探针')).toEqual(held);
  for(const boundary of [enter,close,leave,end])expect(Math.abs(climateLabLifeFocus(state(boundary+1e-4))-climateLabLifeFocus(state(boundary-1e-4)))).toBeLessThan(.0001);
 });
 it('manual return overrides recorded framing while probe/direction comparisons retain it',()=>{
  const original=at('移动探针'),saved={...original};
  expect(climateLabLifeFocus(overviewInteractionPatch(original,{zoom:false}))).toBe(0);
  expect(climateLabLifeFocus(overviewInteractionPatch(original,{zoom:true}))).toBe(1);
  expect(climateLabLifeFocus(overviewInteractionPatch(original,{direction:'east-west',progress:.7}))).toBe(1);
  expect(original).toEqual(saved);
  expect(at('移动探针')).toEqual(saved);
 });
 it.each([[567,610],[1100,650]])('keeps both real DEM transects and probe label inside the frame at %s × %s',(width,height)=>{
  const original=at('移动探针'),points=climateLifeFramePoints(original,point);
  expect(climateLifeFramePoints({...original,direction:'east-west',progress:.8},point)).toEqual(points);
  const camera=new THREE.PerspectiveCamera(43,width/height,.01,1000);
  const pose=climateLifeCamera({camera,viewport:{width,height}},points);
  camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
  for(const p of points){
   const q=p.clone().project(camera),x=(q.x+1)*width/2,y=(1-q.y)*height/2;
   expect(x).toBeGreaterThanOrEqual(30);expect(x).toBeLessThanOrEqual(width-30);
   expect(y).toBeGreaterThanOrEqual(105);expect(y).toBeLessThanOrEqual(height-135);
   expect(q.z).toBeGreaterThan(-1);expect(q.z).toBeLessThan(1);
  }
 });
});
