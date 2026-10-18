import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import CityComparisonReading from '../src/components/CityComparisonReading';
import CityAccessReading,{cityAccessFeedback} from '../src/components/CityAccessReading';
import CityContinuityReading,{cityContinuityFeedback} from '../src/components/CityContinuityReading';
import {cityComparisonAudioSegments,validateCityComparisonPosition,type useCityComparisonDirector} from '../src/hooks/useCityComparisonDirector';
import {cityComparisonContinuation} from '../src/lib/cityComparisonContinuation';
import {estimatedNarrationTiming,narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import type {CityComparisonStageId} from '../src/data/cityComparison';

type Director=ReturnType<typeof useCityComparisonDirector>;
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
function recordedDirector(stage:CityComparisonStageId,restored=false):Director{
 const segments=cityComparisonAudioSegments(stage),segment=segments[stage==='climate'?1:4];
 const asset=manifest.clips.find((clip:{cueId:string})=>clip.cueId===segment.id);
 const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
 const word=timeline.words!.filter(item=>/[\p{L}\p{N}]/u.test(item.text))[8],seconds=word.start+.001;
 const narrationTiming=narrationTimingAt(segment.text,seconds,asset.duration,timeline),fraction=seconds/asset.duration;
 const progress=segment.start+(segment.end-segment.start)*fraction,position=validateCityComparisonPosition({stage,progress});
 return {...position,sceneProgress:progress,playing:false,currentSentence:narrationTiming.caption,narrationTiming,
  audio:{status:restored?'idle':'paused',cue:restored?null:{id:segment.id,text:segment.text},cueIndex:0,cueCount:1,currentTime:restored?0:seconds,duration:restored?0:asset.duration,progress:restored?0:fraction,error:null,provider:'MiniMax',timing:restored?undefined:narrationTiming},
  continuation:cityComparisonContinuation(stage,progress,segments),continueReading:vi.fn(),getPosition:()=>position,getPresentation:()=>({sceneProgress:progress,narrationTiming}),restorePosition:vi.fn(),selectStage:vi.fn(),setProgress:vi.fn(),pause:vi.fn(),playPause:vi.fn(),replay:vi.fn(),replaySegment:vi.fn(),setVoice:vi.fn(),setRelief:vi.fn(),setServices:vi.fn(),setBuilt:vi.fn(),setTransfer:vi.fn()};
}
function comparison(director:Director,compact:boolean){return renderToStaticMarkup(createElement(CityComparisonReading,{director,compact,onFocus:vi.fn(),onCity:vi.fn()}));}
const readable=(html:string)=>html.replace(/<[^>]*>/g,'');

describe('rendered city readers retain only a compatible paused recording caption',()=>{
 it('keeps current operation feedback short while retaining the complete dated transport explanation in a disclosure',()=>{
  const original=recordedDirector('development',true);
  for(const change of [{services:false},{transfer:false,progress:.34+.34*.7}]){
   const director={...original,...change},feedback=cityAccessFeedback(director);
   expect(feedback.narrated).toBe(false);expect(feedback.text.length).toBeLessThanOrEqual(42);
   expect(feedback.detail).toBe(change.services===false?feedback.change.before.text:feedback.change.transfer.text);
   const html=renderToStaticMarkup(createElement(CityAccessReading,{director}));
   expect(html).toContain('<summary>展开这一环节的资料说明</summary>');expect(readable(html)).toContain(feedback.detail!);
   expect(comparison(director,true)).toContain(feedback.text);expect(html).not.toContain('<mark>');
  }
  for(const stage of ['history','connections','travel'] as const){
   const director={...recordedDirector(stage,true),services:false};
   expect(cityContinuityFeedback(director).text.length).toBeLessThanOrEqual(45);
  }
 });
 it.each(['climate','development','history','connections','travel'] as const)('%s pause and travel-return presentation retain the same native word in both readers',stage=>{
  for(const restored of [false,true]){
   const director=recordedDirector(stage,restored);
   for(const compact of [false,true]){
    const html=comparison(director,compact);
    expect(readable(html)).toContain(director.currentSentence);
    expect(html).toContain(`<mark>${director.narrationTiming!.spokenText}</mark>`);
    expect(html).toContain('data-alignment="recording-word"');
   }
  }
 });
 it.each(['development','history','connections','travel'] as const)('%s changed conditions and errors replace the retained word with operation feedback',stage=>{
  const original=recordedDirector(stage,true);
  const overrides:[Partial<Director>,string][]=[
   [{services:false},stage==='development'?'新增铁路或航空暂不参与':stage==='travel'?'当前观察焦点暂时收起':stage==='connections'?'地方车辆与用途入口还没有完成交接':'本段的参与、学习或地方使用暂不推进'],
   [{relief:false},'教学压平后，坡谷高差暂时消失'],
   [{audio:{...original.audio,status:'error',error:'当前录音无法载入，请重试。'}},'当前录音无法载入，请重试。'],
  ];
  if(stage==='connections'||stage==='development')overrides.push([{transfer:false,progress:stage==='development'?.34+.34*.7:original.progress},stage==='development'?'地方接续暂未参与':'地方交接尚未完成']);
  for(const [change,message] of overrides)for(const compact of [false,true]){
   const html=comparison({...original,...change},compact);
   expect(html).toContain(message);expect(html).not.toContain('<mark>');
  }
 });
 it('manual seek, a different clip, malformed native ranges and estimated paused captions use the existing static feedback',()=>{
  const native=recordedDirector('development');
  const cases:Director[]=[
   {...native,progress:native.progress+.025},
   {...native,audio:{...native.audio,cue:{id:'ACCESS-ngari-life',text:'另一段录音'}}},
   {...native,narrationTiming:{...native.narrationTiming!,activeTextEnd:native.narrationTiming!.textEnd+1}},
   {...native,narrationTiming:{...native.narrationTiming!,precision:'estimated',timingLevel:'estimated'}},
   {...native,narrationTiming:estimatedNarrationTiming('这不是当前的录音。',0),currentSentence:'这不是当前的录音。'},
  ];
  for(const director of cases){
   const feedback=cityAccessFeedback(director),html=renderToStaticMarkup(createElement(CityAccessReading,{director}));
   expect(feedback.narrated).toBe(false);expect(readable(html)).toContain(feedback.change[feedback.state.phase].text);expect(html).not.toContain('<mark>');
   expect(comparison(director,true)).not.toContain('<mark>');
  }
 });
 it('continuity estimated/stale return captions fall back without emphasizing words in a longer paragraph',()=>{
  for(const stage of ['history','connections','travel'] as const){
   const original=recordedDirector(stage,true);
   const director={...original,narrationTiming:{...original.narrationTiming!,precision:'estimated' as const,timingLevel:'estimated' as const}};
   const feedback=cityContinuityFeedback(director),html=renderToStaticMarkup(createElement(CityContinuityReading,{director}));
   expect(feedback.narrated).toBe(false);expect(readable(html)).toContain(feedback.part.text);expect(html).not.toContain('<mark>');
   expect(comparison(director,true)).not.toContain('<mark>');
   const stale={...original,progress:.7};
   expect(cityContinuityFeedback(stale).narrated).toBe(false);expect(comparison(stale,true)).not.toContain('<mark>');
  }
 });
});
