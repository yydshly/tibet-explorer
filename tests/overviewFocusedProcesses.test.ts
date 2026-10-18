// @ts-expect-error Test-only node IO.
import {readFileSync} from 'node:fs';
// @ts-expect-error Test-only node hashing.
import {createHash} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {focusedProcessState,focusedProcessFeedback} from '../src/lib/overviewFocusedProcesses';
import {buildOverviewFocusedReading} from '../src/scene/overviewFocusedReading';
import {overviewMainProgram} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import runoff from '../src/data/runoff-reading.json';
import before from '../public/project-review/release-baseline-v1.1.json';
import after from '../public/project-review/release-baseline.json';
vi.mock('../src/scene/environment',async original=>({...await original<typeof import('../src/scene/environment')>(),label:()=>new THREE.Sprite(new THREE.SpriteMaterial())}));
describe('bounded sourced processes',()=>{
 it('describes work in progress before claiming the visible result',()=>{
  expect(focusedProcessFeedback({kind:'exchange',progress:.6,enabled:true})).toContain('正在形成文本');
  expect(focusedProcessFeedback({kind:'stewardship',progress:.6,enabled:true})).toContain('开口尚未完成');
  expect(focusedProcessFeedback({kind:'runoff',progress:.12,enabled:true})).toContain('尚未分成');
  expect(focusedProcessFeedback({kind:'runoff',progress:.6,enabled:false})).toContain('沿DEM下降路径');
  expect(focusedProcessFeedback({kind:'runoff',progress:1,enabled:true})).toContain('4份到达干流所在网格');
 });
 it('changes exactly two recordings; preserves the other nineteen and chapter structure',()=>{
  expect(after.chapters).toEqual(before.chapters);expect(after.clips).toHaveLength(21);
  expect(after.clips.filter((c,i)=>JSON.stringify(c)!==JSON.stringify(before.clips[i])).map(c=>c.recordingId)).toEqual(['OVERVIEW-history-origins','OVERVIEW-protection']);
  expect(after.seconds-before.seconds).toBeCloseTo(48.6,6);
 });
 it('computes only adjacent descending DEM paths, retaining original heights and source hash',()=>{
  const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(runoff.demSha256);
  expect(runoff.paths).toHaveLength(12);
  for(const path of runoff.paths){
   expect(path.indices.length).toBeGreaterThanOrEqual(4);
   path.indices.forEach((index,i)=>{
    expect(path.heights[i]).toBe(bytes.readInt16LE(index*2));
    expect(path.coordinates[i]).toEqual([76+(index%449)*25/448,38-Math.floor(index/449)*13/256]);
    if(i){expect(path.heights[i]).toBeLessThan(path.heights[i-1]);expect(Math.abs(index%449-path.indices[i-1]%449)).toBeLessThanOrEqual(1);expect(Math.abs(Math.floor(index/449)-Math.floor(path.indices[i-1]/449))).toBeLessThanOrEqual(1);}
   });
   const end=path.coordinates.at(-1)!;expect(Math.abs(end[0]-path.receiver[0])).toBeLessThanOrEqual(25/448/2+.000001);expect(Math.abs(end[1]-path.receiver[1])).toBeLessThanOrEqual(13/256/2+.000001);
  }
 });
 it.each([
  ['OVERVIEW-history-origins','阿底峡撰写','exchange'],
  ['OVERVIEW-protection','再进入谷地','runoff'],
  ['OVERVIEW-protection','再移除妨碍','stewardship'],
 ])('uses regenerated native words for %s / %s and clears on departure',(id,token,kind)=>{
  const beat=overviewMainProgram.beats.find(b=>b.recordingId===id)!;
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const clip=manifest.clips.find((c:any)=>c.cueId===id&&c.text===beat.text);
  const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
  const word=timeline.words.find((w:any)=>w.textEnd>beat.text.indexOf(token));
  const timing=narrationTimingAt(beat.text,(word.start+word.end)/2,clip.duration,timeline);
  const presentation=overviewPresentation(beat,.01,timing);
  expect(presentation.props.overviewFocusedProcess?.kind).toBe(kind);
  expect(presentation.props.layer).toBe('atlas-overview');expect(presentation.props.overviewUrban).toBeUndefined();
  expect(focusedProcessState(id,beat.text,1)).toBeUndefined();
  expect(overviewPresentation(beat,.99,timing).props.overviewFocusedProcess).toEqual(presentation.props.overviewFocusedProcess);
 });
 it('changes actual documents, gate and moving geometry; resetting progress reverses all effects',()=>{
  const camera=new THREE.PerspectiveCamera(45,1.5,.1,1000);camera.position.set(90,30,50);
  const model=buildOverviewFocusedReading(camera,(x,z,y=0)=>new THREE.Vector3(x,y,z)),size=new THREE.Vector2(1000,700);
  model.update({kind:'exchange',progress:1,enabled:true},size);expect(model.group.userData.result).toEqual({writtenRows:8,translatedRows:8});
  model.update({kind:'exchange',progress:1,enabled:false},size);expect(model.group.userData.result.translatedRows).toBe(0);expect(model.group.userData.result.writtenRows).toBe(8);
  model.update({kind:'stewardship',progress:1,enabled:false},size);expect(model.group.userData.result).toEqual({opening:0,crossed:0});
  model.update({kind:'stewardship',progress:1,enabled:true},size);expect(model.group.userData.result).toEqual({opening:1,crossed:6});
  model.update({kind:'stewardship',progress:0,enabled:true},size);expect(model.group.userData.result).toEqual({opening:0,crossed:0});
  model.update({kind:'runoff',progress:1,enabled:false},size);expect(model.group.userData.result).toEqual({retained:4,direct:8,delivered:8});
  expect((model.group.children[2].children[0] as THREE.Line).geometry.attributes.instanceStart.count).toBe(runoff.paths[0].coordinates.length-1);
  const low=model.group.children[2].children.filter(c=>c instanceof THREE.Mesh&&c.geometry.type==='SphereGeometry'&&c.visible).length;
  const stroke=(model.group.children[2].children[0] as THREE.Line).geometry.attributes.instanceStart;
  model.update({kind:'runoff',progress:1,enabled:true},size);
  expect((model.group.children[2].children[0] as THREE.Line).geometry.attributes.instanceStart).toBe(stroke);expect(model.group.userData.result).toEqual({retained:8,direct:4,delivered:4});
  expect(model.group.children[2].children.filter(c=>c instanceof THREE.Mesh&&c.geometry.type==='SphereGeometry'&&c.visible)).toHaveLength(low-4);
  model.update({kind:'runoff',progress:.18,enabled:true},size);
  const rain=model.group.children[2].children.filter(c=>c instanceof THREE.Mesh&&c.geometry.type==='SphereGeometry') as THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>[];
  expect(rain).toHaveLength(12);rain.forEach(m=>{expect(m.visible).toBe(true);expect(m.material.color.getHex()).toBe(0x89e7ff);expect(m.material.opacity).toBe(1);});
  const labels=model.group.children[2].children.filter(c=>c instanceof THREE.Sprite);
  expect(labels.map(s=>s.visible)).toEqual([true,false,false]);
  model.update({kind:'runoff',progress:.6,enabled:false},size);expect(labels.map(s=>s.visible)).toEqual([false,true,false]);
  model.update({kind:'runoff',progress:1,enabled:false},size);expect(labels.map(s=>s.visible)).toEqual([false,true,true]);
  // The last source-to-mainstem snap can rise on the coarse DEM. Flow must stop
  // on the verified descending cell, not travel that cartographic connector.
  runoff.paths.forEach((path,i)=>{if(i>=4){const end=path.coordinates.at(-1)!;expect(rain[i].position.x).toBeCloseTo(end[0]);expect(rain[i].position.z).toBeCloseTo(end[1]);}});
  model.update(undefined,size);expect(model.group.visible).toBe(false);
 });
});
