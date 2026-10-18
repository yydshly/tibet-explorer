import {describe,it,expect} from 'vitest';
import manifest from '../public/assets/audio/narration/cue-manifest.json';
import {overviewMainProgram,overviewDepthPrograms,overviewPrograms,overviewEditorialDecisions} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';
import {overviewShot} from '../src/lib/overviewShot';

describe('six-question editorial programme',()=>{
 it('gives every mechanism beat one ordered purpose and keeps the living bridge in the whole map',()=>{
  const environment=overviewMainProgram.chapters.find(c=>c.id==='environment')!;
  expect(environment.stages!.flatMap(s=>s.beatIds)).toEqual(environment.beats.map(b=>b.id));
  const living=overviewMainProgram.chapters.find(c=>c.id==='living')!;
  expect(living.beats.map(b=>b.id)).toEqual(['LAB-life-nyingchi','LAB-life-lhasa','LAB-life-ngari']);
  const beat=living.beats[2];
  expect(beat.sources.some(s=>s.url==='https://www.al.gov.cn/info/1035/48267.htm')).toBe(true);
  for(const raw of [0,.25,.5,.75,1])expect(overviewPresentation(beat,raw).sceneIdentity).toBe('atlas-overview');
 });
 it('keeps moved recordings reachable and includes a bounded animated street example in the main story',()=>{
  for(const decision of overviewEditorialDecisions)expect(Boolean(decision.mainChapter)||decision.depthPrograms.length>0,decision.id).toBe(true);
  expect(overviewMainProgram.chapters).toHaveLength(6);
  expect(overviewMainProgram.beats[0].id).toBe('G1-opening');
  expect(overviewMainProgram.beats.at(-1)!.id).toBe('OVERVIEW-conclusion');
  expect(overviewMainProgram.beats.filter(b=>b.kind==='heritage'||b.kind==='comparison').map(b=>b.id)).toEqual([]);
  expect(overviewDepthPrograms.find(p=>p.id==='place-protection')!.beats.some(b=>b.id==='OVERVIEW-place-actions')).toBe(true);
  const access=overviewDepthPrograms.find(p=>p.id==='lhasa-access')!.beats;
  const transfer=access.findIndex(b=>b.id==='ACCESS-lhasa-transfer');
  expect(access[transfer+1].id).toBe('ACCESS-lhasa-life');
 });
 it('retains exact original native-word media for every main and depth recording',()=>{
  for(const program of overviewPrograms){
   expect(new Set(program.beats.map(b=>b.id)).size).toBe(program.beats.length);
   for(const beat of program.beats){
    const clip=manifest.clips.find((c:{cueId:string;text:string})=>c.cueId===beat.recordingId&&c.text===beat.text);
    expect(clip,beat.id).toBeDefined();expect(clip?.timingLevel,beat.id).toBe('word');
    for(const raw of [0,.25,.75,1])expect(()=>overviewShot(beat,raw)).not.toThrow();
   }
  }
 });
 it('keeps whole-region narration except the explicit sourced ground journey',()=>{
  for(const beat of overviewMainProgram.beats.filter(b=>b.kind==='atlas'&&!['OVERVIEW-valley-journey','OVERVIEW-city-change','OVERVIEW-history-origins','OVERVIEW-jokhang-protection'].includes(b.id))){
   const p=overviewPresentation(beat,.5);
   expect(p.sceneIdentity).toBe('atlas-overview');
   expect(p.props.overviewLocalContext).not.toBe(true);
  }
  const local=overviewDepthPrograms.find(p=>p.id==='lhasa-space')!.beats;
  expect(local.every(b=>overviewPresentation(b,0).sceneIdentity==='atlas-local-context')).toBe(true);
 });
});
