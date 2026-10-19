import {describe,it,expect} from 'vitest';
// @ts-expect-error Node is provided by the test runner.
import {readFileSync} from 'node:fs';
import {pilotNarratedView,routePilotCues} from '../src/data/routePilot';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {pilotSpatialStory} from '../src/data/pilotSpatialStory';

const json=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const manifest=json('public/assets/audio/narration/cue-manifest.json');
const recordings=routePilotCues.map(c=>{const clip=manifest.clips.find((r:any)=>r.cueId===c.id&&r.text===c.narration);return {...clip,timeline:json('public'+clip.subtitleUrl)};});
const time=(i:number,phrase:string)=>recordings[i].timeline.words.find((w:any)=>w.textStart>=routePilotCues[i].narration.indexOf(phrase)).start;
const view=(i:number,seconds:number)=>pilotNarratedView(i,routePilotCues[i].narration,narrationTimingAt(routePilotCues[i].narration,seconds,recordings[i].duration,recordings[i].timeline).textProgress,.668);

describe('other G318 cues use their actual word clock to show the object being explained',()=>{
 it('reads the original road turns only while explaining the source line, then clears that trace on reverse seek',()=>{
  const start=time(0,'青色线保留'),end=time(0,'先看起点周围');
  expect(view(0,start-.1).routeRead).toBeUndefined();
  const early=view(0,start+1),late=view(0,end-.2);
  expect(early.mode).toBe('whole');expect(early.routeContext).toBeGreaterThan(0);expect(late.routeContext).toBe(1);
  expect(early.routeRead).toBeGreaterThan(0);expect(late.routeRead).toBeGreaterThan(early.routeRead!);
  expect(view(0,end+.1).routeRead).toBeUndefined();expect(view(0,start-.1).routeRead).toBeUndefined();
 });
 it('actually turns forward at the same high sample and leaves time to complete the turn before pulling out',()=>{
  const back=time(1,'比较回望'),forward=time(1,'向前的视野'),wide=time(1,'不是实测山口标高');
  expect(view(1,back)).toMatchObject({progress:.668,lookBack:true,routeContext:0});
  expect(view(1,forward+.1)).toMatchObject({progress:.668,lookBack:false,routeContext:0});
  expect(wide-forward).toBeGreaterThan(3); // Existing renderer allows at most60 degrees per second.
  expect(view(1,wide+1.5).routeContext).toBeGreaterThan(.9);
  expect(view(1,back)).toMatchObject({progress:.668,lookBack:true,routeContext:0});
 });
 it('looks into the already sourced winter mountain area at the matching mention, without claiming a seasonal simulation',()=>{
  const reading=view(0,time(0,'不能当作全年景观')-.1);
  expect(reading.mapFocus).toBeCloseTo(.668);expect(reading.mapFocusWeight).toBe(1);expect(reading.mapZoom).toBeLessThan(.4);
  expect(view(0,time(0,'现在沿道路前进')-.1).mapFocusWeight).toBe(0);
 });
 it('marks river, road and houses in order, while retaining the already correct grazing object',()=>{
  expect(view(2,time(2,'进入二零二四')+.1)).toMatchObject({placePhoto:'town',photoFocus:1});
  expect(view(2,time(2,'看道路')+.1)).toMatchObject({placePhoto:'town',photoFocus:2});
  expect(view(2,time(2,'房屋')+.1)).toMatchObject({placePhoto:'town',photoFocus:3});
  expect(view(2,time(2,'放牧')+.1)).toMatchObject({placePhoto:'grazing',photoFocus:2});
 });
 it('returns to the complete daily photo for the documentary boundary instead of inventing a festival scene',()=>{
  expect(view(2,time(2,'共同停留')+.1)).toMatchObject({placePhoto:'daily',photoFocus:3});
  const record=view(2,time(2,'鲁朗公开资料')+.1);
  expect(record).toMatchObject({placePhoto:'daily',photoFocus:0});
  expect(pilotSpatialStory(record)).toMatchObject({title:'当前画面：2008年街边日常',scope:'2018年工布新年另有文字记录 · 当前未展示节庆现场'});
 });
});
