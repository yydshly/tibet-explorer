import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {regionalSpatialNarration} from '../src/data/regionalSpatialNarration';
import {regionalCueSceneProgress} from '../src/lib/regionalJourneyState';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {spatialAccessMotion,spatialHistoryYear} from '../src/lib/regionalSpatialState';
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
function actual(cue){
 const asset=manifest.clips.find(item=>item.cueId===cue.id&&item.text===cue.text);
 expect(asset).toBeDefined();
 const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
 return {asset,timeline,at:time=>narrationTimingAt(cue.text,time,asset.duration,timeline)};
}
describe('source words own regional observation and arrival',()=>{
 it.each(Object.keys(regionalSpatialNarration))('%s reaches the acquired road end before its dated lived case, and reverses on a native seek',city=>{
  const cue=regionalSpatialNarration[city].connections,{asset,timeline,at}=actual(cue),end=cue.text.indexOf('。')+1;
  const later=timeline.words.find(word=>word.textStart>=end),early=timeline.words.find(word=>word.textStart>2&&word.textEnd<end/2);
  expect(later).toBeDefined();expect(early).toBeDefined();
  const motion=time=>spatialAccessMotion(cue,regionalCueSceneProgress(cue,at(time),time/asset.duration));
  expect(motion(later.start+.001)).toBe(1);
  const before=motion(early.start+.001);expect(before).toBeGreaterThan(0);expect(before).toBeLessThan(1);
  expect(motion(later.start+.001)).toBe(1);expect(motion(early.start+.001)).toBe(before);
 });
 it.each(Object.keys(regionalSpatialNarration))('%s selects each published epoch on its actual spoken year',city=>{
  const cue=regionalSpatialNarration[city].history,{timeline,at}=actual(cue);
  for(const year of [1985,2005,2015]){
   const start=cue.text.indexOf(String(year)),word=timeline.words.find(word=>word.textStart<=start&&word.textEnd>start);
   expect(word).toBeDefined();expect(spatialHistoryYear(cue.text,at(word.end-.001).textProgress)).toBe(year);
  }
 });
});
