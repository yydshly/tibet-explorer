import {describe,it,expect} from 'vitest';
import manifest from '../public/assets/audio/narration/cue-manifest.json';
import {historySpaceStory} from '../src/data/historySpaceStory';
import {historySpaceStages,historySpacePresentation} from '../src/lib/historySpaceStory';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';
import type {NarrationTiming} from '../src/lib/narrationTiming';
const at=(token:string,amount=.5)=>{const index=historySpaceStages.findIndex(s=>s.token===token),start=historySpaceStory.narration.indexOf(token),end=index+1<historySpaceStages.length?historySpaceStory.narration.indexOf(historySpaceStages[index+1].token):historySpaceStory.narration.length;return {textProgress:(start+(end-start)*amount)/historySpaceStory.narration.length} as NarrationTiming;};
describe('history has a spatial animation in the main programme',()=>{
 it('uses an exact native-word recording and occupies the culture-to-modern transition',()=>{
  const clip=manifest.clips.find(c=>c.cueId===historySpaceStory.id)!;expect(clip.text).toBe(historySpaceStory.narration);expect(clip.timingLevel).toBe('word');
  const chapter=overviewMainProgram.chapters.find(c=>c.id==='human-history')!;
  expect(chapter.beats.map(b=>b.id)).toEqual(['OVERVIEW-history-origins','OVERVIEW-culture-continuity']);
  expect(overviewDepthPrograms.find(p=>p.id==='lhasa-space')!.beats[0].id).toBe(historySpaceStory.id);
  expect(chapter.stages!.flatMap(s=>s.beatIds)).toEqual(chapter.beats.map(b=>b.id));
 });
 it('moves from the whole map to streets, adds uses and returns on the single word clock',()=>{
  const beat=overviewDepthPrograms.flatMap(p=>p.beats).find(b=>b.id===historySpaceStory.id)!;
  expect(overviewPresentation(beat,0).props.overviewReturnMix).toBe(1);
  const streets=at('接着沿步行街巷');
  const a=overviewPresentation(beat,.01,streets),b=overviewPresentation(beat,.99,streets);
  expect(a.props).toEqual(b.props);expect(a.props.overviewBarkhor).toMatchObject({phase:'streets',motion:.5});expect(a.props.overviewReturnMix).toBe(0);
  expect(historySpacePresentation(0,at('再把周边商业用地')).props.overviewBarkhor?.phase).toBe('uses');
  expect(historySpacePresentation(1).props.overviewReturnMix).toBe(1);
  const next=overviewMainProgram.beats.find(b=>b.id==='OVERVIEW-city-change')!;
  expect(overviewPresentation(next,0).props.overviewBarkhor).toBeUndefined();
 });
});
