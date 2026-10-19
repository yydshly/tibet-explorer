import {describe,it,expect} from 'vitest';
// @ts-expect-error Node is provided by the test runner.
import {readFileSync} from 'node:fs';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {pilotClosing} from '../src/data/pilotClosing';
import {narrationTimingAt} from '../src/lib/narrationTiming';

const json=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const cue=routePilotCues[3],clip=json('public/assets/audio/narration/cue-manifest.json').clips.find((c:any)=>c.cueId===cue.id&&c.text===cue.narration);
const timeline=json('public'+clip.subtitleUrl);
describe('the unchanged closing recording has visible explanatory evidence',()=>{
 it('leaves time for the existing public-life photo and source-boundary reading under actual native timing',()=>{
  const phases=new Map<string,number>();
  for(let seconds=0;seconds<clip.duration;seconds+=.1){const timing=narrationTimingAt(cue.narration,seconds,clip.duration,timeline);const phase=pilotClosing(cue.narration,timing.textProgress).phase;phases.set(phase,(phases.get(phase)??0)+.1);}
  expect(phases.get('life')).toBeGreaterThan(5);
  expect(phases.get('evidence')).toBeGreaterThan(5);
  expect(Math.max(...phases.values())).toBeLessThan(9);
  expect([...phases.keys()]).toEqual(['corridor','relief','access','life','evidence','whole']);
 });
 it('backward seek clears the later photograph and restores the same real river-section comparison',()=>{
  const at=(phrase:string,delta=1)=>pilotNarratedView(3,cue.narration,(cue.narration.indexOf(phrase)+delta)/cue.narration.length,.668);
  const relief=at('自然条件解释',3),access=at('建设、经营',3);
  expect(at('保存一个观察问题')).toMatchObject({placePhoto:'daily',photoReveal:1,photoFocus:3});
  expect(at('自然条件解释',3)).toEqual(relief);
  expect(at('自然条件解释',3).placePhoto).toBeUndefined();
  expect(at('建设、经营',3)).toEqual(access);
  expect(at('自然条件解释',8).sectionProgress).toBeGreaterThan(relief.sectionProgress!);
 });
});
