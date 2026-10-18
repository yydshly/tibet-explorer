// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {irrigationCue,irrigationStages,advanceIrrigation,irrigationFeatureIds} from '../src/data/overviewIrrigation';
import {irrigationState,irrigationPresentation} from '../src/lib/overviewIrrigation';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {createIrrigationReading} from '../src/scene/irrigationReading';
import manifest from '../public/assets/audio/narration/cue-manifest.json';
describe('sourced Shiquanhe irrigation case',()=>{
 it('replaces the generic Ngari reading within the duration budget and retains it in depth',()=>{
  const total=overviewMainProgram.beats.reduce((sum,b)=>sum+manifest.clips.find(c=>c.cueId===b.recordingId)!.duration,0);
  expect(total).toBeLessThanOrEqual(677.232);expect(overviewMainProgram.beats).toHaveLength(21);
  expect(overviewDepthPrograms.flatMap(p=>p.beats).some(b=>b.id==='LAB-life-ngari')).toBe(true);
 });
 it('samples native words reproducibly for forward playback and backward seeking',()=>{
  const clip=manifest.clips.find(c=>c.cueId===irrigationCue.id)!;
  expect(clip.text).toBe(irrigationCue.narration);expect(clip.timingLevel).toBe('word');
  const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
  for(const stage of [...irrigationStages,...irrigationStages].reverse()){
   const word=timeline.words.find((w:{textEnd:number})=>w.textEnd>clip.text.indexOf(stage.token));
   const timing=narrationTimingAt(clip.text,word.start+.8*(word.end-word.start),clip.duration,timeline);
   const p=irrigationPresentation(0,timing);expect(p.props.overviewIrrigation?.phase).toBe(stage.phase);
   expect(p).toEqual(irrigationPresentation(1,timing));expect(p.sceneIdentity).toBe('atlas-local-context');
  }
  expect(irrigationPresentation(0).props.overviewReturnMix).toBe(1);expect(irrigationPresentation(1).props.overviewReturnMix).toBe(1);
 });
 it('requires both conditions; closing does not erase delivered water or refill it',()=>{
  let s=irrigationState(0);s={...s,gate:true};expect(advanceIrrigation(s).delivered).toBe(0);
  s=advanceIrrigation({...s,cleared:true});expect(s.delivered).toBe(.25);
  const stopped=advanceIrrigation({...s,gate:false});expect(stopped.delivered).toBe(.25);expect(stopped.flowing).toBe(false);
  expect(advanceIrrigation({...stopped,gate:true,cleared:false}).delivered).toBe(.25);
 });
 it('keeps acquired canal/forest geometry while rendering different service states',()=>{
  const data=JSON.parse(readFileSync('public/data/local-places/shiquanhe.geojson','utf8'));
  expect(data.features.find((f:any)=>f.id===irrigationFeatureIds.canal).properties.tags.waterway).toBe('canal');
  expect(data.features.find((f:any)=>f.id===irrigationFeatureIds.forest).properties.tags.landuse).toBe('forest');
  const before=JSON.stringify(data);
  const r=createIrrigationReading(data,p=>new THREE.Vector3(p[0],0,p[1]),()=>new THREE.PlaneGeometry(1,1),10000);
  const pipe=r.group.children[0] as THREE.Mesh;const geometry=pipe.geometry;
  r.update({...irrigationState(0),gate:true,cleared:true,flowing:true,delivered:.5});expect(pipe.visible).toBe(true);
  const draw=geometry.drawRange.count;expect(draw).toBeGreaterThan(0);
  r.update({...irrigationState(0),gate:false,delivered:.5});expect(pipe.visible).toBe(false);
  expect((r.group.userData.reading).delivered).toBe(.5);expect(pipe.geometry).toBe(geometry);expect(JSON.stringify(data)).toBe(before);
 });
});
