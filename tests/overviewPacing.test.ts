// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';
import {cityLocalUsageState} from '../src/scene/cityLocalContinuity';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const beat=(id:string)=>overviewMainProgram.beats.find(b=>b.id===id)!;
function at(id:string,token:string){
 const b=beat(id),clip=manifest.clips.find((c:{cueId:string})=>c.cueId===b.recordingId);
 expect(clip.text).toBe(b.text);expect(clip.timingLevel).toBe('word');
 const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8')) as NarrationTimeline;
 const offset=b.text.indexOf(token);expect(offset).toBeGreaterThanOrEqual(0);
 const word=timeline.words!.find(w=>w.textEnd>offset)!;
 const time=word.start+(word.end-word.start)*.8;
 return {b,timing:narrationTimingAt(b.text,time,timeline.duration,timeline)};
}
describe('shortened mainline keeps causes visible on its new media clock',()=>{
 it('hands historical formation to documented protection, then to modern connectivity',()=>{
  const {b,timing}=at('OVERVIEW-history-origins','这些是营建');
  const view=overviewPresentation(b,0,timing),index=overviewMainProgram.beats.indexOf(b);
  expect(view.explanation).toContain('大昭寺供灯');expect(view.explanation).toContain('保护');
  expect(view.explanation).not.toContain('学习与实践');
  expect(view.props.overviewReturnMix).toBe(1);
  expect(overviewMainProgram.beats.slice(index+1,index+3).map(b=>b.id)).toEqual(['OVERVIEW-jokhang-protection','OVERVIEW-city-change']);
 });
 it('keeps a date separate from bridge restoration and crossing, without repeating the street detour',()=>{
  for(const [token,phase] of [['二〇〇六年','arrival'],['先拿掉柳梧大桥','missing'],['二〇〇七年四月三十日','opening'],['设施怎样变成生活里的机会','organization'],['最后回到全域','return']] as const){
   const {b,timing}=at('OVERVIEW-city-change',token);
   const p=overviewPresentation(b,0,timing),back=overviewPresentation(b,1,timing);
   expect(p.props.overviewCityChange).toEqual(back.props.overviewCityChange);
   expect(p.props.overviewCityChange?.phase).toBe(phase);
   expect(p.props.overviewBarkhor).toBeUndefined();
   if(token==='二〇〇七年四月三十日')expect(p.props.overviewCityChange?.bridge).toBe(0);
  }
  const {b,timing}=at('OVERVIEW-city-change','车辆跨过拉萨河');
  expect(overviewPresentation(b,0,timing).props.overviewCityChange?.bridge).toBe(1);
 });
 it('shows the named acquired footprint for uses, then returns to the whole region for Tholing',()=>{
  for(const [token,feature]of [['七世纪创建的大昭寺','lhasa-jokhang-outer-footprint'],['布达拉宫的礼仪','lhasa-potala-outer-footprint']] as const){
   const {b,timing}=at('OVERVIEW-history-origins',token);
   const p=overviewPresentation(b,1,timing);
   expect(p.props.cityLocalFeatureId).toBeUndefined();expect(cityLocalUsageState(p.props,'lhasa').objectKey).toBe(feature);expect(p.props.layer).toBe('atlas-city-comparison');expect(p.props.overviewReturnMix).toBe(0);
   expect(p.props.progress).toBe(overviewPresentation(b,0,timing).props.progress);
  }
  const {b,timing}=at('OVERVIEW-history-origins','再看西部托林');
  expect(overviewPresentation(b,0,timing).props.overviewReturnMix).toBe(1);
  expect(overviewPresentation(b,0,timing).props.overviewFocus).toBe('tholing-exchange');expect(overviewPresentation(b,0,timing).props.layer).toBe('atlas-overview');
  expect(overviewPresentation(b,1).props.overviewReturnMix).toBe(1);
 });
 it('retains original full explanations in a reachable depth programme while shortening the final chapter',()=>{
  const full=overviewDepthPrograms.find(p=>p.id==='modern-context')!;
  for(const id of ['OVERVIEW-city-change','OVERVIEW-regional-connections','OVERVIEW-regional-observation','OVERVIEW-conclusion'])expect(full.beats.some(b=>b.recordingId===id)).toBe(true);
  const modern=overviewMainProgram.chapters.at(-1)!;
  const seconds=modern.beats.reduce((sum,b)=>sum+manifest.clips.find((c:{cueId:string})=>c.cueId===b.recordingId).duration,0);
  expect(seconds).toBeLessThan(240);
  expect(modern.beats.filter(b=>b.id==='OVERVIEW-conclusion')).toHaveLength(1);
 });
});
