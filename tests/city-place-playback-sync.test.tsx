import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import CityComparisonReading from '../src/components/CityComparisonReading';
import {cityComparisonAudioSegments,type useCityComparisonDirector,validateCityComparisonPosition} from '../src/hooks/useCityComparisonDirector';
import {cityPlaceThreadReading,cityPlaceThreads} from '../src/data/cityPlaceThreads';
import {cityNarrationSceneProgress} from '../src/lib/cityNarrationSceneProgress';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import {cityComparisonContinuation} from '../src/lib/cityComparisonContinuation';
import type {CityComparisonStageId} from '../src/data/cityComparison';
import {cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {cityLocalUsageState} from '../src/scene/cityLocalContinuity';

type Director=ReturnType<typeof useCityComparisonDirector>;
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
function recorded(stage:CityComparisonStageId,id:string,seconds:number){
 const segments=cityComparisonAudioSegments(stage),segment=segments.find(item=>item.id===id)!;
 const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===id);
 const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
 const fraction=seconds/asset.duration,progress=segment.start+(segment.end-segment.start)*fraction;
 const timing=narrationTimingAt(segment.text,seconds,asset.duration,timeline);
 const audio={status:'playing' as const,cue:{id,text:segment.text},cueIndex:0,cueCount:1,currentTime:seconds,duration:asset.duration,progress:fraction,error:null,provider:'MiniMax' as const,timing};
 const sceneProgress=cityNarrationSceneProgress(segments,progress,audio);
 const position=validateCityComparisonPosition({stage,progress});
 const director={...position,playing:true,audio,sceneProgress,currentSentence:timing.caption,narrationTiming:timing,continuation:cityComparisonContinuation(stage,progress,segments),continueReading:vi.fn(),getPosition:()=>position,getPresentation:()=>({sceneProgress,narrationTiming:timing}),restorePosition:vi.fn(),selectStage:vi.fn(),setProgress:vi.fn(),pause:vi.fn(),playPause:vi.fn(),replay:vi.fn(),replaySegment:vi.fn(),setVoice:vi.fn(),setRelief:vi.fn(),setServices:vi.fn(),setBuilt:vi.fn(),setTransfer:vi.fn()} satisfies Director;
 return {director,segment,timeline};
}
const render=(director:Director,compact=false)=>renderToStaticMarkup(createElement(CityComparisonReading,{director,compact,onFocus:vi.fn(),onCity:vi.fn(),onThreadNavigate:vi.fn()}));
function currentKey(html:string){return html.match(/<button\b[^>]*aria-current="step"[^>]*>/)?.[0].match(/data-review-key="([^"]+)"/)?.[1];}
const plain=(html:string)=>html.replace(/<[^>]*>/g,'');

describe('same-place evidence follows the exact recording display state',()=>{
 it('keeps Lulang dated-work evidence while the later road phrase retains its own physical action',()=>{
  const base=recorded('history','CONT-history-nyingchi-3',10.463);
  const samples=base.timeline.words!.filter(word=>word.start>=10.462&&word.start<=10.996);
  expect(samples.length).toBeGreaterThanOrEqual(4);
  for(const word of samples){
   const {director}=recorded('history',base.segment.id,word.start+.001);
   expect(director.currentSentence).toBe('道路让人经过，');
   expect(cityPlaceThreadReading('nyingchi','history',director.progress).active).toBe('life');
   expect(cityPlaceThreadReading('nyingchi','history',director.sceneProgress).active).toBe('life');
   expect(cityLocalUsageState({step:3,progress:director.sceneProgress},'lulang').beat).toBe('arrival');
   const html=render(director);expect(currentKey(html)).toBe('place-thread-nyingchi-life');
   expect(plain(html)).toContain(cityPlaceThreadReading('nyingchi','history',director.sceneProgress).evidence!.fact);
  }
 });
 it('shows Lhasa life evidence when the real interview sentence arrives before the raw-time threshold',()=>{
  const base=recorded('development','ACCESS-lhasa-transfer',13.839);
  const samples=base.timeline.words!.filter(word=>word.start>=12.6&&word.start<=13.839);
  expect(samples.length).toBeGreaterThan(2);
  for(const word of samples){
   const {director}=recorded('development',base.segment.id,word.start+.001);
   expect(cityPlaceThreadReading('lhasa','development',director.progress).active).toBe('space');
   const target=cityPlaceThreadReading('lhasa','development',director.sceneProgress);
   expect(target.active).toBe('life');expect(currentKey(render(director))).toBe('place-thread-lhasa-life');
   expect(plain(render(director))).toContain(target.evidence!.fact);
  }
 });
 it('switches Lhasa crossing evidence to transport organization exactly when the actual name starts',()=>{
  const base=recorded('development','ACCESS-lhasa-transfer',11.089);
  const offset=base.segment.text.indexOf('洛桑赤列');
  const word=base.timeline.words!.find(item=>item.textStart<=offset&&offset<item.textEnd)!;
  expect(word.start).toBeCloseTo(11.089234257805686,8);
  const {director:before}=recorded('development',base.segment.id,word.start-.001);
  const {director:at}=recorded('development',base.segment.id,word.start);
  expect(before.currentSentence).toBe('看抵达怎样接到跨河进城。');
  expect(currentKey(render(before))).toBe('place-thread-lhasa-space');
  expect(at.currentSentence).toBe('洛桑赤列的采访还提到村委会组织运输队，');
  expect(currentKey(render(at))).toBe('place-thread-lhasa-life');
  expect(at.narrationTiming!.spokenText).toBe(word.text);
  expect(cityLifeSceneToAudio(cityComparisonAudioSegments('development'),at.progress)?.segment.id).toBe(base.segment.id);
 });
 it('switches Lulang evidence at the actual 2017 work word without prematurely demonstrating accommodation use',()=>{
  const base=recorded('history','CONT-history-nyingchi-3',5.087);
  const offset=base.segment.text.indexOf('二〇一七年');
  const word=base.timeline.words!.find(item=>item.textStart<=offset&&offset<item.textEnd)!;
  const {director:before}=recorded('history',base.segment.id,word.start-.001);
  const {director:at}=recorded('history',base.segment.id,word.start);
  expect(currentKey(render(before))).toBe('place-thread-nyingchi-event');
  expect(currentKey(render(at))).toBe('place-thread-nyingchi-life');
  expect(at.currentSentence).toBe('二〇一七年又有商户进驻和家庭旅馆培训的记录。');
  expect(cityLocalUsageState({step:3,progress:at.sceneProgress},'lulang')).toMatchObject({beat:'approach',use:0});
  expect(at.narrationTiming!.spokenText).toBe(word.text);
 });
 it('keeps Lulang accommodation action on its later native phrase after the training evidence starts',()=>{
  const base=recorded('history','CONT-history-nyingchi-3',11.159);
  const offset=base.segment.text.indexOf('住宿与接待');
  const word=base.timeline.words!.find(item=>item.textStart<=offset&&offset<item.textEnd)!;
  const {director:before}=recorded('history',base.segment.id,word.start-.001);
  const {director:at}=recorded('history',base.segment.id,word.start);
  expect(currentKey(render(before))).toBe('place-thread-nyingchi-life');
  expect(currentKey(render(at))).toBe('place-thread-nyingchi-life');
  expect(cityLocalUsageState({step:3,progress:before.sceneProgress},'lulang').beat).toBe('arrival');
  expect(cityLocalUsageState({step:3,progress:at.sceneProgress},'lulang').beat).toBe('use');
  expect(at.currentSentence).toBe('住宿与接待把经过接成停留。');
 });
 it('each place button keeps its raw seek separate from an optional paused evidence anchor',()=>{
  for(const city of ['nyingchi','lhasa','ngari'] as const){
   for(const step of cityPlaceThreads[city].steps){
    expect(cityPlaceThreadReading(city,step.stage,step.sceneProgress??step.progress).active,`${city}/${step.id}`).toBe(step.id);
   }
  }
  const life=cityPlaceThreads.lhasa.steps.find(step=>step.id==='life')!;
  expect(cityLifeSceneToAudio(cityComparisonAudioSegments('development'),life.progress)?.segment.id).toBe('ACCESS-lhasa-transfer');
  const position=cityLifeSceneToAudio(cityComparisonAudioSegments('development'),life.progress)!;
  const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===position.segment.id);
  const {director}=recorded('development',position.segment.id,position.fraction*asset.duration);
  expect(director.currentSentence).toBe('洛桑赤列的采访还提到村委会组织运输队，');
  expect(currentKey(render(director))).toBe('place-thread-lhasa-life');
 });
 it.each(['paused','restored'] as const)('retains matching evidence, word caption and physical state on %s',mode=>{
  const {director:live}=recorded('development','ACCESS-lhasa-transfer',13.839);
  const director:Director={...live,playing:false,audio:mode==='restored'?{...live.audio,status:'idle',cue:null,currentTime:0,progress:0}: {...live.audio,status:'paused'}};
  expect(currentKey(render(director))).toBe('place-thread-lhasa-life');
  for(const compact of [false,true])expect(plain(render(director,compact))).toContain(live.currentSentence);
  expect(director.progress).toBe(live.progress);expect(director.getPosition().progress).toBe(live.progress);
  expect(director.getPresentation().sceneProgress).toBe(live.sceneProgress);
 });
 it('manual raw seeks retain their selected evidence without borrowing a different native pose',()=>{
  const {director:live}=recorded('history','CONT-history-nyingchi-3',10.463);
  const director:Director={...live,playing:false,sceneProgress:live.progress,narrationTiming:undefined,currentSentence:'',audio:{...live.audio,status:'idle',cue:null,progress:0}};
  expect(currentKey(render(director))).toBe('place-thread-nyingchi-life');
  const html=render(director);expect(plain(html)).toContain(cityPlaceThreadReading('nyingchi','history',director.progress).evidence!.fact);
  expect(director.setProgress).not.toHaveBeenCalled();expect(director.selectStage).not.toHaveBeenCalled();
 });
 it('discloses estimated timing only for an actual active recording, not native or unplayed manual fallback',()=>{
  const {director:native}=recorded('history','CONT-history-nyingchi-3',10.463);
  const message='逐字同步资料暂不可用，文字与演示暂按录音进度估算。';
  expect(render(native)).not.toContain(message);
  const estimated={...native.narrationTiming!,precision:'estimated' as const,timingLevel:'estimated' as const};
  const degraded:Director={...native,narrationTiming:estimated,audio:{...native.audio,timing:estimated}};
  expect(render(degraded)).toContain(message);
  const manual:Director={...degraded,playing:false,audio:{...degraded.audio,status:'idle',cue:null}};
  expect(render(manual)).not.toContain(message);
 });
});
