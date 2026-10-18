// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {overviewMechanismCues} from '../src/data/overviewMechanisms';
import {overviewMechanismState,waterTransfer} from '../src/lib/overviewMechanisms';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {overviewNextReason} from '../src/data/overviewLogic';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

describe('mainline causal closures',()=>{
 it('orders every chapter and explains every mainline transition, retaining the actual local observation',()=>{
  for(const c of overviewMainProgram.chapters)expect(c.stages!.flatMap(s=>s.beatIds),c.id).toEqual(c.beats.map(b=>b.id));
  for(const b of overviewMainProgram.beats)expect(overviewNextReason[b.id],b.id).toBeTruthy();
  const ids=overviewMainProgram.beats.map(b=>b.id);
  expect(ids.indexOf('LAB-life-ngari')).toBeLessThan(ids.indexOf('OVERVIEW-history-origins'));
  expect(ids.indexOf('OVERVIEW-history-origins')).toBeLessThan(ids.indexOf('OVERVIEW-culture-continuity'));
  expect(ids.indexOf('OVERVIEW-city-change')).toBeGreaterThan(ids.indexOf('OVERVIEW-culture-continuity'));
  expect(ids.indexOf('OVERVIEW-city-change')).toBeLessThan(ids.indexOf('OVERVIEW-regional-connections'));
 });
 it('closing the channel never erases existing storage, and transfer conserves the schematic amount',()=>{
  for(const progress of [0,.1,.6,1]){
   const open=waterTransfer(progress,true),closed=waterTransfer(progress,false);
   expect(open.source+open.stored).toBeCloseTo(1);
   expect(closed.stored).toBe(open.stored);expect(closed.source).toBe(open.source);expect(closed.flowing).toBe(false);
  }
 });
 it('native words control material and practice actions, regardless of raw seek, and return clears the lens',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  for(const cue of overviewMechanismCues){
   const clip=manifest.clips.find((c:{cueId:string})=>c.cueId===cue.id);
   expect(clip.text).toBe(cue.narration);expect(clip.timingLevel).toBe('word');
   const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8')) as NarrationTimeline;
   const tokens=cue.id.endsWith('culture-continuity')?['学习者靠近示范者','再进入共同练习','把学习与实践放回全域']:cue.id.endsWith('water-service')?['左边有水','打开取水通道','关闭通道','回到三地']:['把功能示意展开','再整理叠放','最后合上两侧木板','学习者靠近示范者','再进入共同练习','把物件保存和人的参与放回全域'];
   for(const token of tokens){
    const offset=cue.narration.indexOf(token);expect(offset,token).toBeGreaterThanOrEqual(0);
    const word=timeline.words!.find(w=>w.textEnd>offset)!;
    const time=word.start+(word.end-word.start)*.8,timing=narrationTimingAt(cue.narration,time,timeline.duration,timeline);
    const a=overviewMechanismState(cue.id,cue.narration,0,timing),b=overviewMechanismState(cue.id,cue.narration,1,timing);
    expect(a).toEqual(b);
    if(token.startsWith('回到三地')||token.startsWith('把物件保存')||token.startsWith('把学习与实践'))expect(a).toBeUndefined();
    if(token==='关闭通道'){expect(a?.connected).toBe(false);expect(a?.progress).toBe(1);}
    if(token==='再整理叠放')expect(a?.progress).toBeLessThan(.62);
    if(token==='最后合上两侧木板')expect(a?.progress).toBeGreaterThanOrEqual(.62);
    if(token==='再进入共同练习'){expect(a?.kind).toBe('practice');expect(a?.progress).toBeGreaterThanOrEqual(.68);}
   }
   const beat=[...overviewMainProgram.beats,...overviewDepthPrograms.flatMap(p=>p.beats)].find(b=>b.id===cue.id)!;
   expect(overviewPresentation(beat,.4).sceneIdentity).toBe('atlas-overview');
   expect(overviewPresentation(beat,1).props.overviewMechanism).toBeUndefined();
   expect(()=>overviewMechanismState(cue.id,'changed',.5)).toThrow();
  }
 });
});
