// @ts-expect-error Test-only filesystem access.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {climateLabNarrationCues,climateLabNarratedProgress} from '../src/data/climateLab';
import {climateLabAirState,climateAirAnnotation} from '../src/lib/climateLabProcess';
import {overviewInteractionState,overviewInteractionPatch,overviewInteractionFeedback} from '../src/lib/overviewInteraction';
import {sampleTerrainMetres} from '../src/scene/terrainReading';
import {rotationFlowCue} from '../src/data/rotationFlow';
import {rotationNarratedState,rotationTargets} from '../src/lib/rotationFlow';
import {narrationTimingAt,type NarrationTiming} from '../src/lib/narrationTiming';
import {overviewMainProgram} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';

const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.length/2);
const heights=Array.from({length:101},(_,i)=>sampleTerrainMetres(grid,91.1,26.1+i/100*3.8));
const cue=climateLabNarrationCues[0],text=cue.narration;
const at=(token:string)=>{const index=text.indexOf(token);expect(index).toBeGreaterThanOrEqual(0);return overviewInteractionState(cue.id,text,{textProgress:index/text.length} as NarrationTiming)!;};
const read=(progress:number,moisture:'higher'|'lower'='higher')=>({...climateLabAirState(heights,progress,moisture)!,comparison:{higher:climateLabAirState(heights,progress,'higher')!,lower:climateLabAirState(heights,progress,'lower')!}});
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));

describe('rotation → Asian inflow → sourced terrain/cloud chain',()=>{
 it('introduces each Asian inflow at its own spoken anchor, then identifies the barrier',()=>{
  const state=(token:string)=>rotationNarratedState({textProgress:rotationFlowCue.narration.indexOf(token)/rotationFlowCue.narration.length} as NarrationTiming);
  expect(rotationTargets(state('回到亚洲'))).toEqual(['tibet']);
  expect(rotationTargets(state('西侧'))).toContain('central-asia');
  expect(rotationTargets(state('西侧'))).not.toContain('indian-ocean');
  expect(rotationTargets(state('南侧'))).toContain('indian-ocean');
  expect(state('南侧').westProgress).toBeGreaterThan(0);
  expect(state('空气携带水汽')).toMatchObject({arrivalStage:'terrain',westProgress:1,southProgress:1});
  expect(rotationTargets(state('空气携带水汽'))).toEqual(expect.arrayContaining(['himalaya','plateau']));
  const held=state('南侧');state('空气携带水汽');expect(state('南侧')).toEqual(held);
 });
 it('keeps the existing formation and DEM explanation between inflow and clouds',()=>{
  const beats=overviewMainProgram.beats,index=beats.findIndex(b=>b.recordingId===rotationFlowCue.id);
  expect(beats.slice(index,index+5).map(b=>b.id)).toEqual(['G1-observe','OVERVIEW-formation-entry','G3-explain','G4-explain','LAB-air-higher']);
  const arrival=overviewPresentation(beats[index],1,{textProgress:1} as NarrationTiming),entry=overviewPresentation(beats[index+1],0);
  expect(arrival.sceneIdentity).toBe(entry.sceneIdentity);expect(entry.props.layer).toBe(arrival.props.layer);
 });
 it('puts the entire spoken ascent/cloud sentence on rising terrain rather than the old downhill sample',()=>{
  // Regression evidence: old .313 position was 495m below an earlier crest.
  expect(read(.313).descending).toBe(true);
  const start=text.indexOf('抬升时'),end=text.indexOf('继续越过山地');
  for(let i=start;i<end;i+=.25){const p=climateLabNarratedProgress(text,i/text.length);expect(read(p).descending).toBe(false);}
  const lift=read(at('抬升时').progress),cloud=read(at('云逐渐增多').progress);
  expect(lift.cloud).toBe(0);expect(cloud.cloud).toBeGreaterThan(lift.cloud);
  expect(climateAirAnnotation(cloud)).toContain('凝结');
  expect(read(at('降水离开气团').progress).rain).toBeGreaterThan(.8);
  expect(read(at('背风侧').progress).descending).toBe(true);
 });
 it('keeps the same position/frame for moisture contrast, reports both outcomes, and does not promise rain at the start',()=>{
  const original=at('降水离开气团'),lower=overviewInteractionPatch(original,{moisture:'lower'});
  expect(lower.progress).toBe(original.progress);expect(lower.airFocus).toBe(original.airFocus);
  const a=read(original.progress),b=read(lower.progress,'lower');
  expect(b.ground).toBe(a.ground);expect(b.lift).toBe(a.lift);expect(b.cloud).toBeLessThan(a.cloud);expect(b.rain).toBeLessThan(a.rain);
  expect(overviewInteractionFeedback({...lower,progress:0},read(0,'lower'))).toContain('两种条件都尚未成云');
  expect(overviewInteractionFeedback(lower,b)).toContain('同一位置的抬升不变');
  expect(at('降水离开气团')).toEqual(original);
 });
 it('reconstructs the actual native word timeline deterministically, including reverse seeks',()=>{
  for(const c of [cue,rotationFlowCue]){
   const clip=manifest.clips.find((r:{cueId:string;text:string})=>r.cueId===c.id&&r.text===c.narration);
   expect(clip.timingLevel).toBe('word');const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
   const readAt=(seconds:number)=>{const timing=narrationTimingAt(c.narration,seconds,clip.duration,timeline);return c.id===cue.id?overviewInteractionState(c.id,c.narration,timing)!:rotationNarratedState(timing);};
   let progress=0;
   for(const word of timeline.words){const t=(word.start+word.end)/2,s=readAt(t);readAt(clip.duration);expect(readAt(t)).toEqual(s);
    if(c.id===cue.id){expect(s.progress).toBeGreaterThanOrEqual(progress);progress=s.progress;}
   }
  }
 });
});
