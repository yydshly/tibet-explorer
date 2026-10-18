import {describe,it,expect} from 'vitest';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings,narrationPhraseGuide} from '../src/lib/narrationPhraseGuide';

const cue=journeySteps.G2.cues[0];
const guide=(text=cue.narration)=>narrationPhraseGuide(cue.id,text,.02,{textProgress:.55,precision:'provider'});

describe('compiled literal narration bindings remain isolated from playback and readers',()=>{
 it('keeps complete script text and cue identity separate, including legacy text',()=>{
  const original=narrationPhraseBindings(cue.id,cue.narration),prefix='旧版前言。';
  const shifted=narrationPhraseBindings(cue.id,prefix+cue.narration);
  expect(shifted.map(phrase=>phrase.textStart)).toEqual(original.map(phrase=>phrase.textStart+prefix.length));
  expect(shifted.at(-1)!.textEnd).toBe(prefix.length+cue.narration.length);
  expect(narrationPhraseBindings(cue.id,'这段旧录音没有当前文本锚点。')).toEqual([]);
  expect(narrationPhraseBindings('legacy-G2-opening',cue.narration)).toEqual([]);
  expect(narrationPhraseBindings(cue.id,cue.narration)).toEqual(original);
 });
 it('does not let exported bindings or guide results mutate the authored future state',()=>{
  const original=guide(),copy=narrationPhraseBindings(cue.id,cue.narration);
  copy[0].textStart=999;copy[0].token='changed';copy[0].targets.push('changed');copy[0].settings!.layer='changed';
  original!.targets.push('changed');original!.sceneSettings!.layer='changed';
  const replay=guide();
  expect(replay!.targets).not.toContain('changed');expect(replay!.sceneSettings!.layer).not.toBe('changed');
  const restored=narrationPhraseBindings(cue.id,cue.narration);
  expect(restored[0].textStart).toBe(0);expect(restored[0].token).toBe('现在知道');expect(restored[0].settings!.layer).toBe('globe');
 });
 it('recompiles safely after many script revisions without changing deterministic seek and replay',()=>{
  const before=guide();
  for(let index=0;index<260;index++)narrationPhraseGuide(cue.id,`${index}。${cue.narration}`,index/260);
  expect(guide()).toEqual(before);
  const end=guide(cue.narration+'末尾保留。');
  expect(end).toBeDefined();expect(guide()).toEqual(before);
 });
});
