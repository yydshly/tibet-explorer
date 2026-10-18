import {describe,it,expect} from 'vitest';
import {journeySteps} from '../src/data/journey';
import {earthNarrationBeats,earthNarrationMoment} from '../src/lib/earthNarrationState';
import {visualGuideForCue} from '../src/data/visualGuidance';
describe('G1 literal narration phrases own attention and process together',()=>{
 it('every authored transition starts at an actual phrase in the unchanged recording text',()=>{
  for(const cue of journeySteps.G1.cues){const beats=earthNarrationBeats(cue.id,cue.narration);expect(beats.length).toBeGreaterThan(4);for(const beat of beats){expect(cue.narration.indexOf(beat.token)).toBeGreaterThanOrEqual(0);expect(beat.at).toBe(cue.narration.indexOf(beat.token)/cue.narration.length);const state=earthNarrationMoment(cue.id,cue.narration,beat.at)!;expect(state.action).toBe(beat.action);expect(state.targets).toEqual(beat.targets);expect(state.targets.length).toBeLessThanOrEqual(2);}}
 });
 it('uses canonical text position instead of a conflicting old audio-quarter boundary',()=>{const cue=journeySteps.G1.cues[2],textProgress=(cue.narration.indexOf('才可能成云')+2)/cue.narration.length,state=visualGuideForCue(cue.id,.1,true,{textProgress,precision:'provider'})!;expect(state.action).toBe('cloud');expect(state.targets).toEqual(['circulation-cloud']);expect(state.progress).toBe(.1);expect(state.timingPrecision).toBe('provider');expect(state.actionProgress).toBeGreaterThan(0);});
 it('reverses and repeats the same phrase without changing the recording text or returning mutable shared arrays',()=>{const cue=journeySteps.G1.cues[0],a=earthNarrationMoment(cue.id,cue.narration,.62)!;earthNarrationMoment(cue.id,cue.narration,.9);expect(earthNarrationMoment(cue.id,cue.narration,.62)).toEqual(a);a.targets.push('bad');expect(earthNarrationMoment(cue.id,cue.narration,.62)!.targets).not.toContain('bad');expect(earthNarrationMoment('unknown',cue.narration,.5)).toBeUndefined();});
});
