import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {climateLabNarrationCues} from '../src/data/climateLab';
import {overviewInteractionState} from '../src/lib/overviewInteraction';
import type {NarrationTiming} from '../src/lib/narrationTiming';
import {overviewAtlasCamera} from '../src/scene/overviewAtlasCamera';

const cue=climateLabNarrationCues.find(c=>c.id==='LAB-air-higher')!;
const at=(token:string)=>{
 const index=cue.narration.indexOf(token);expect(index).toBeGreaterThanOrEqual(0);
 return overviewInteractionState(cue.id,cue.narration,{textProgress:index/cue.narration.length} as NarrationTiming)!;
};
describe('cloud sequence keeps the same map and comparison frame',()=>{
 it('holds the local frame through cloud/rain words and returns before the next evidence chapter',()=>{
  expect(at('先保留').airFocus).toBe(0);
  for(const token of ['抬升时','云逐渐增多','部分水分','背风侧'])expect(at(token).airFocus).toBe(1);
  expect(at('现在保持同一地形').airFocus).toBe(0);
  const held=at('云逐渐增多');
  expect({...held,moisture:'lower'}.airFocus).toBe(held.airFocus);
  // Reverse seeking reconstructs the same framing, without a second clock.
  at('现在保持同一地形');expect(at('云逐渐增多')).toEqual(held);
 });
 it.each([[567,610],[1100,650]])('fits the ground and atmosphere into the readable rectangle at %s × %s',(width,height)=>{
  const points=Array.from({length:21},(_,i)=>new THREE.Vector3(0,Math.sin(i/20*Math.PI)*.9,1.9-i/20*3.8));
  const wholePoints=points.flatMap(p=>[p,p.clone().add(new THREE.Vector3(0,2.5,0))]);
  const camera=new THREE.PerspectiveCamera(43,width/height,.1,1000);
  const safeRect={left:30,right:width-30,top:100,bottom:height-135};
  const pose=overviewAtlasCamera({camera,viewport:{width,height},wholePoints,safeRect,resolve:()=>undefined,shot:{cameraFrom:{focusIds:[],amount:0},cameraTo:{focusIds:[],amount:0},cameraMix:0},viewDirection:new THREE.Vector3(1.15,1,.55)});
  camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
  for(const point of wholePoints){
   const screen=point.clone().project(camera),x=(screen.x+1)*width/2,y=(1-screen.y)*height/2;
   expect(x).toBeGreaterThan(safeRect.left);expect(x).toBeLessThan(safeRect.right);
   expect(y).toBeGreaterThan(safeRect.top);expect(y).toBeLessThan(safeRect.bottom);
  }
 });
});
