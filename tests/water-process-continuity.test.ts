import {describe,expect,it} from 'vitest';
import {journeyMotionProgress} from '../src/lib/journeyMotion';
import {journeySteps} from '../src/data/journey';
import {livingLandscapeState} from '../src/data/livingUnderstanding';
import {waterProcessReading,mountainCloudState} from '../src/lib/waterProcess';

describe('water process and the single narration clock',()=>{
 it('follows authored transport beats, holds after delivery, and scrubs backwards exactly',()=>{
  const cue=journeySteps.E3.cues[1],motion=cue.motion!;
  expect(livingLandscapeState({progress:journeyMotionProgress(motion,0)}).fill).toBe(0);
  expect(livingLandscapeState({progress:journeyMotionProgress(motion,.16)}).fill).toBe(1);
  expect(livingLandscapeState({progress:journeyMotionProgress(motion,.42)}).carry).toBe(1);
  expect(livingLandscapeState({progress:journeyMotionProgress(motion,.68)}).storedWater).toBe(1);
  expect(journeyMotionProgress(motion,.9)).toBeGreaterThanOrEqual(.94);
  expect(journeyMotionProgress(motion,.16)).toBeCloseTo(.4);
 });
 it('reads from the same cloud state, distinguishing gas, cloud, growth and ground water',()=>{
  expect(waterProcessReading(.3).cloud).toContain('气态');
  expect(mountainCloudState(.53).condensation).toBeGreaterThan(0);
  expect(mountainCloudState(.53).precipitation).toBe(0);
  expect(waterProcessReading(.63).rain).toContain('尚未降雨');
  expect(waterProcessReading(1).rain).toContain('地表');
  expect(mountainCloudState(1,'lower').runoff).toBe(0);
  expect(waterProcessReading(1,'lower').comparison).toContain('没有本次');
 });
 it.each(['C5','C6'])('%s actually opens the ground water layer when narration reaches surface transfer',id=>{
  const cue=journeySteps[id].cues[1],frame=cue.keyframes!.find(f=>f.settings.layer==='water')!;
  const p=journeyMotionProgress(cue.motion!,frame.at);
  expect(p).toBeGreaterThanOrEqual(.82);expect(frame.settings.cutaway).toBe(true);
 });
});
