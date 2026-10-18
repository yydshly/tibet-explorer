// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {overviewBeats} from '../src/data/overviewJourney';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

describe('one recorded city observation connects transport to living heritage',()=>{
 it('uses this recording’s native words and returns to the same whole-map context',()=>{
  const beat=overviewBeats.find(b=>b.id==='OVERVIEW-lived-city')!;
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const clip=manifest.clips.find((c:{cueId:string})=>c.cueId===beat.id);
  expect(clip.text).toBe(beat.text);expect(clip.timingLevel).toBe('word');
  const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8')) as NarrationTimeline;
  for(const [token,phase] of [['沿归档的现状道路前进','crossing'],['洛桑赤列的采访','organization'],['到已知路端停下','street'],['二〇二五年','shared'],['最后拉回河谷与全域','return']] as const){
   const offset=beat.text.indexOf(token),word=timeline.words!.find(w=>w.textEnd>offset)!,time=word.start+(word.end-word.start)*.8;
   const view=overviewPresentation(beat,time/timeline.duration,narrationTimingAt(beat.text,time,timeline.duration,timeline));
   expect(view.props.overviewVisit?.phase).toBe(phase);
   expect(view.sceneIdentity).toBe('atlas-local-context');
   if(phase==='street'||phase==='shared')expect(view.props.overviewVisit?.motion).toBe(1);
  }
  expect(overviewPresentation(beat,0).props.overviewReturnMix).toBe(1);
  expect(overviewPresentation(beat,1).props.overviewReturnMix).toBe(1);
  expect(overviewPresentation(overviewBeats.at(-1)!,0).sceneIdentity).toBe('atlas-local-context');
  expect(()=>overviewPresentation({...beat,text:beat.text+'改写'},.4)).toThrow('原文不一致');
 });
});
