// @ts-expect-error Test-only filesystem access.
import {readFileSync} from 'node:fs';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {describe,it,expect} from 'vitest';
import manifest from '../public/assets/audio/narration/cue-manifest.json';
import {overviewPlaceActions,jokhangProtectionCue} from '../src/data/overviewPlaceActions';
import {placeActionState,placeActionPresentation,placeActionStages,jokhangProtectionStages} from '../src/lib/overviewPlaceActions';
import type {NarrationTiming} from '../src/lib/narrationTiming';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
const at=(token:string)=>overviewPlaceActions.narration.indexOf(token)/overviewPlaceActions.narration.length;
describe('documented changes to activity and public space',()=>{
 it('keeps an exact independent word-timed recording and old detail accessible',()=>{
 const clip=manifest.clips.find(c=>c.cueId===overviewPlaceActions.id)!;expect(clip.text).toBe(overviewPlaceActions.narration);expect(clip.timingLevel).toBe('word');
 expect(overviewMainProgram.beats.some(b=>b.id===overviewPlaceActions.id)).toBe(false);
 expect(overviewDepthPrograms.find(p=>p.id==='place-protection')!.beats[0].id).toBe(overviewPlaceActions.id);
 expect(overviewDepthPrograms.flatMap(p=>p.beats).some(b=>b.id==='OVERVIEW-history-space')).toBe(true);
 });
 it('only moves the majority of lamps at the literal command and holds the result',()=>{
 for(const stage of placeActionStages)expect(at(stage.token)).toBeGreaterThanOrEqual(0);
 expect(placeActionState(at('现在分开供灯与木构')-.001).separation).toBe(0);
 expect(placeActionState(at('活动仍然延续')).separation).toBe(1);
 expect(placeActionState(at('我们没有取得')).separation).toBe(1);
 expect(placeActionState(at('让使用活动进入广场')-.001).activity).toBe(0);
 });
 it('uses actual provider word timestamps at each spoken phase, including backward seeks',()=>{
 const clip=manifest.clips.find(c=>c.cueId===overviewPlaceActions.id)!;
 const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
 expect(timeline.timingLevel).toBe('word');
 for(const stage of [...placeActionStages,...placeActionStages].reverse()){
 const offset=overviewPlaceActions.narration.indexOf(stage.token);
 const word=timeline.words.find((w:{textEnd:number})=>w.textEnd>offset);
 const timing=narrationTimingAt(overviewPlaceActions.narration,word.start+(word.end-word.start)*.85,timeline.duration,timeline);
 expect(placeActionPresentation(.99,timing).props.overviewPlaceAction?.phase).toBe(stage.phase);
 }
 });
 it('native words control geometry independently of raw progress, returning to the same whole',()=>{
 const timing={textProgress:at('活动仍然延续')} as NarrationTiming;
 expect(placeActionPresentation(.1,timing).props).toEqual(placeActionPresentation(.9,timing).props);
 expect(placeActionPresentation(0).props.overviewReturnMix).toBe(1);
 expect(placeActionPresentation(1).props.overviewReturnMix).toBe(1);
 expect(placeActionPresentation(0,timing).props.overviewUrban?.phase).toBe('barkhor');
 });
});

describe('mainline documented protection case',()=>{
 it('replaces the generic practice clip without extending the show, retaining the original in depth',()=>{
  const chapter=overviewMainProgram.chapters.find(c=>c.id==='human-history')!;
  expect(chapter.beats.map(b=>b.id)).toEqual(['OVERVIEW-history-origins',jokhangProtectionCue.id]);
  const replacement=manifest.clips.find(c=>c.cueId===jokhangProtectionCue.id&&c.text===jokhangProtectionCue.narration)!;
  const original=manifest.clips.find(c=>c.cueId==='OVERVIEW-culture-continuity')!;
  expect(replacement.duration).toBeLessThanOrEqual(original.duration);
  expect(overviewMainProgram.beats).toHaveLength(21);
  expect(overviewDepthPrograms.find(p=>p.id==='culture-practice')!.beats.some(b=>b.id==='OVERVIEW-culture-continuity')).toBe(true);
 });
 it('uses the new native word clock and reversibly separates lamps only at the spoken comparison',()=>{
  const clip=manifest.clips.find(c=>c.cueId===jokhangProtectionCue.id)!;
  expect(clip.text).toBe(jokhangProtectionCue.narration);expect(clip.timingLevel).toBe('word');
  const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
  for(const stage of [...jokhangProtectionStages,...jokhangProtectionStages].reverse()){
   const offset=clip.text.indexOf(stage.token),word=timeline.words.find((w:{textEnd:number})=>w.textEnd>offset);
   const timing=narrationTimingAt(clip.text,word.start+(word.end-word.start)*.85,timeline.duration,timeline);
   const p=placeActionPresentation(0,timing,true);
   expect(p.props.overviewPlaceAction?.phase).toBe(stage.phase);
   expect(p.props.overviewPlaceAction?.caseId).toBe('jokhang');
   expect(p.props.overviewPlaceAction).toEqual(placeActionPresentation(1,timing,true).props.overviewPlaceAction);
   expect(p.props.overviewPlaceAction?.activity).toBe(0);
  }
  const at=(token:string)=>clip.text.indexOf(token)/clip.text.length;
  expect(placeActionState(at('现在分开供灯与木构')-.001,true).separation).toBe(0);
  expect(placeActionState(at('供灯继续'),true).separation).toBe(1);
  expect(placeActionPresentation(0,undefined,true).props.overviewReturnMix).toBe(1);
  expect(placeActionPresentation(1,undefined,true).props.overviewReturnMix).toBe(1);
 });
});
