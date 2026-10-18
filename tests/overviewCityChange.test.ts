// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {overviewCityChange} from '../src/data/overviewCityChange';
import {bridgeRouteRange,cityChangeMotion} from '../src/lib/overviewCityChange';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

describe('dated events explain a source-derived change of connectivity',()=>{
 const beat=overviewDepthPrograms.find(p=>p.id==='modern-context')!.beats.find(b=>b.recordingId===overviewCityChange.id)!;
 it('is between the historical street and the regional transport comparison',()=>{
  const ids=overviewMainProgram.beats.map(b=>b.id),i=ids.indexOf(beat.id);
  expect(ids.slice(i-1,i+2)).toEqual(['OVERVIEW-culture-continuity',beat.id,'OVERVIEW-regional-connections']);
 });
 it('derives the actual river crossing from source edges, never an arbitrary percentage',()=>{
  const archive=JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json','utf8'));
  const route=archive.routes.find((r:{id:string})=>r.id==='lhasa-station-liuwu-jokhang-approach');
  const points=route.coordinates.map(([x,y]:number[])=>new Vector3(x,0,y));
  const range=bridgeRouteRange(points,route.sourceWayIdsByEdge);
  expect(range.start).toBeGreaterThan(0);expect(range.end).toBeLessThan(1);
  expect(route.coordinates[range.first]).toEqual([91.0836243,29.6368862]);
  const closed={phase:'missing' as const,progress:1,bridge:0,motion:1};
  expect(cityChangeMotion(closed,range)).toBe(range.start);
  expect(cityChangeMotion({...closed,phase:'opening',bridge:1},range)).toBeCloseTo(range.end);
  expect(cityChangeMotion({...closed,phase:'organization',bridge:1},range)).toBe(1);
  expect(()=>bridgeRouteRange(points,[])).toThrow('源节点');
 });
 it('uses fresh native words, supports backward seeking, and returns to the whole region',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const clip=manifest.clips.find((c:{cueId:string})=>c.cueId===beat.id);
  expect(clip.text).toBe(beat.text);expect(clip.timingLevel).toBe('word');
  const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8')) as NarrationTimeline;
  for(const [token,phase] of [['二〇〇六年','arrival'],['先拿掉柳梧大桥','missing'],['二〇〇七年四月三十日','opening'],['设施怎样变成生活里的机会','organization'],['到已知路端停下','street'],['最后回到全域','return'],['先拿掉柳梧大桥','missing']] as const){
   const offset=beat.text.indexOf(token),word=timeline.words!.find(w=>w.textEnd>offset)!;
   const time=word.start+(word.end-word.start)*.8;
   const view=overviewPresentation(beat,1,narrationTimingAt(beat.text,time,timeline.duration,timeline));
   expect(view.props.overviewCityChange?.phase).toBe(phase);
   expect(view.sceneIdentity).toBe('atlas-local-context');
   if(phase==='missing')expect(view.props.overviewCityChange?.bridge).toBe(0);
  }
  // A date alone must not open the bridge or send the vehicle across it.
  const atWords=(token:string)=>{const offset=beat.text.indexOf(token),word=timeline.words!.find(w=>w.textEnd>offset)!;return overviewPresentation(beat,1,narrationTimingAt(beat.text,word.start,timeline.duration,timeline)).props.overviewCityChange!;};
  expect(atWords('二〇〇七年四月三十日').bridge).toBe(0);
  expect(atWords('现在接回同一位置的桥面').motion).toBe(0);
  expect(atWords('设施怎样变成生活里的机会').bridge).toBe(1);
  expect(atWords('这是单独检验新桥作用').motion).toBe(1);
  expect(atWords('不能把整片城市的增长').motion).toBe(1);
  expect(overviewPresentation(beat,0).props.overviewReturnMix).toBe(1);
  expect(overviewPresentation(beat,1).props.overviewReturnMix).toBe(1);
  expect(()=>overviewPresentation({...beat,text:beat.text+'改'},0)).toThrow('原文不一致');
 });
});
