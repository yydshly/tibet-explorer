// @ts-expect-error Node-only fixture reading; the browser project has no Node ambient types.
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {cityComparisonSources} from '../src/data/cityComparison';
import {cityPlaceThreads,cityPlaceThreadReading} from '../src/data/cityPlaceThreads';
import {cityAccessChanges} from '../src/data/cityAccessChange';
import {cityPlaceEvidenceSources} from '../src/data/cityPlaceEvidence';
import {cityAccessState,cityAccessPhaseProgress} from '../src/lib/cityAccessState';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

describe('拉萨的同地证据链与空间边界',()=>{
 const thread=cityPlaceThreads.lhasa;
 it('环境、历史建设、跨河接续、运输组织与观察分别有可追溯材料',()=>{
  expect(thread.context?.sourceIds).toContain('city-life-lhasa-valley');
  expect(thread.context?.text).toContain('2005年');
  const sourceIds=[...(thread.context?.sourceIds??[]),...thread.steps.flatMap(step=>step.evidence?.sourceIds??[])];
  for(const id of sourceIds)expect([...cityPlaceEvidenceSources,...cityComparisonSources].find(source=>source.id===id),id).toBeDefined();
  expect(thread.steps[0].evidence?.sourceIds).toContain('city-life-potala-research');
  expect(thread.steps[1].evidence?.sourceIds).toContain('event-liuwu-opening-2007');
  expect(thread.steps[2].evidence?.sourceIds).toContain('place-liuwu-local-interview-2019');
  expect(thread.steps[3].evidence?.sourceIds).toContain('continuity-unesco-decision-2025');
 });

 it('每个聚焦对象都来自同一已归档OSM窗口，不添加家、工地或历史边界',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/data/local-places/lhasa.geojson',import.meta.url),'utf8'));
  const features=new Map(data.features.map((feature:{id:string;properties:{featureClass:string}})=>[feature.id,feature]));
  for(const step of thread.steps)for(const feature of step.evidence?.features??[])expect(features.has(feature.id),feature.id).toBe(true);
  const crossing=features.get('way/122707217') as {properties:{name:string;tags:{bridge:string}}};
  expect(crossing.properties.name).toBe('柳吾大桥');
  expect(crossing.properties.tags.bridge).toBe('yes');
  expect(thread.steps[1].evidence?.features.find(feature=>feature.id==='way/122707217')?.label).toContain('源图名柳吾大桥');
 });

 it('生活入口仍在已录制的洛桑赤列接续片段内，未跳往另一处货场',()=>{
  const step=thread.steps.find(item=>item.id==='life')!,state=cityAccessState(step.progress);
  expect(state).toMatchObject({cityId:'lhasa',phase:'transfer'});
  expect(step.stage).toBe('development');
  // Raw time is the actual first name word; .8 is a separate display anchor.
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const asset=manifest.clips.find((item:{cueId:string})=>item.cueId==='ACCESS-lhasa-transfer');
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(timeline.audioSha256).toBe(asset.sha256);
  expect(asset.sha256).toBe('4bb05a97632b5bc1ec654b24b70df204d585756a39773d9982bbb4c6f94ffbb7');
  expect(asset.duration).toBe(23.328);
  const nameOffset=asset.text.indexOf('洛桑赤列'),word=timeline.words!.find(item=>item.textStart<=nameOffset&&nameOffset<item.textEnd)!;
  expect(word.start).toBeCloseTo(11.089234257805686,12);
  expect(state.phaseProgress).toBeCloseTo((word.start+.001)/asset.duration,12);
  expect(state.phaseProgress*asset.duration).toBeLessThan(word.end);
  expect(state.phaseProgress).toBeLessThan(1);
  const caption=narrationTimingAt(asset.text,state.phaseProgress*asset.duration,asset.duration,timeline);
  expect(caption.caption).toBe('洛桑赤列的采访还提到村委会组织运输队，');
  expect(caption.spokenText).toBe(word.text);
  expect(cityAccessState(step.sceneProgress!).phaseProgress).toBeCloseTo(.8,12);
  expect(cityAccessChanges.lhasa.transfer.narration).toContain('洛桑赤列');
  expect(cityAccessChanges.lhasa.transfer.narration).toContain('组织运输队');
  expect(cityPlaceThreadReading('lhasa',step.stage,step.sceneProgress!)).toMatchObject({samePlace:true,active:'life'});
  const freight=cityPlaceThreadReading('lhasa','development',cityAccessPhaseProgress('lhasa','life')+.005);
  expect(freight.place?.placeName).toContain('拉萨西货场');
  expect(freight.samePlace).toBe(false);
  expect(freight.evidence).toBeUndefined();
 });

 it('访问管理片段对应观察用途，不能套用运输队的生活材料',()=>{
  const position=cityContinuityPartProgress('lhasa',2)+.04;
  const reading=cityPlaceThreadReading('lhasa','connections',position);
  expect(reading.active).toBe('observe');
  expect(reading.evidence?.sourceIds).toContain('continuity-unesco-decision-2025');
  expect(reading.evidence?.sourceIds).not.toContain('place-liuwu-local-interview-2019');
 });

 it('保留前后测量、因果归因与当前行程的不同证据缺口',()=>{
  expect(thread.steps[1].evidence?.limit).toMatch(/未取得.*实测路网.*同口径/);
  expect(thread.steps[2].evidence?.limit).toMatch(/不是家庭连续追踪或铁路单独因果评估/);
  expect(thread.steps[3].evidence?.limit).toMatch(/当前线路.*按日期另查/);
  for(const step of thread.steps){
   const check=step.evidence?.check;
   expect(check?.choices.filter(choice=>choice.correct)).toHaveLength(1);
   expect(check?.choices.every(choice=>choice.feedback.length>15)).toBe(true);
  }
 });
});
