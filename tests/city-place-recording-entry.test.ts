// @ts-expect-error Node-only source fixtures; browser project has no Node ambient types.
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {cityPlaceThreads,cityPlaceThreadReading} from '../src/data/cityPlaceThreads';
import {cityPlaceRecordingEntries} from '../src/lib/cityPlaceRecordingEntry';
import {cityComparisonAudioSegments} from '../src/hooks/useCityComparisonDirector';
import {cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {cityNarrationSceneProgress} from '../src/lib/cityNarrationSceneProgress';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const cases=[
 ['nyingchi','event','鲁朗先辨认河流、三一八国道和服务用地。'],
 ['nyingchi','space','米林机场先经公路联系林芝，'],
 ['nyingchi','life','二〇一七年又有商户进驻和家庭旅馆培训的记录。'],
 ['nyingchi','observe','观察留在鲁朗，'],
 ['lhasa','event','先在拉萨现状地图中辨认河流、道路和老城，'],
 ['lhasa','space','客运接续看二〇〇七年四月三十日通车的柳梧大桥。'],
 ['lhasa','life','洛桑赤列的采访还提到村委会组织运输队，'],
 ['lhasa','observe','再把拉萨的历史问题带进候选访问。'],
 ['ngari','event','再从托林回到狮泉河，'],
 ['ngari','space','昆莎落地后，'],
 ['ngari','life','公共空间与管护组织停留和使用。'],
 ['ngari','observe','观察先留在狮泉河。'],
] as const;

describe('all twelve same-place buttons begin a complete original recorded clause',()=>{
 it.each(cases)('%s / %s preserves the source first word, its full caption and the same recorded scene', (cityId,stepId,caption)=>{
  const entry=cityPlaceRecordingEntries[`${cityId}-${stepId}`];
  const step=cityPlaceThreads[cityId].steps.find(item=>item.id===stepId)!;
  const segments=cityComparisonAudioSegments(step.stage),position=cityLifeSceneToAudio(segments,step.progress)!;
  expect(position.segment.id).toBe(entry.cueId);
  const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===entry.cueId);
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(timeline.audioSha256).toBe(asset.sha256);expect(asset.duration).toBe(entry.duration);
  const offset=asset.text.indexOf(entry.token),word=timeline.words!.find(item=>item.textStart<=offset&&offset<item.textEnd)!;
  expect(offset).toBeGreaterThanOrEqual(0);expect(word).toBeDefined();
  expect(word.start).toBeCloseTo(entry.seconds,12);
  const seconds=position.fraction*asset.duration;
  expect(seconds).toBeCloseTo(word.start+.001,11);expect(seconds).toBeLessThan(word.end);
  const timing=narrationTimingAt(asset.text,seconds,asset.duration,timeline);
  expect(timing.caption).toBe(caption);expect(timing.spokenText).toBe(word.text);
  // A visible whole clause must start on the word it displays, rather than
  // continuing half way through an earlier caption that happens to contain it.
  expect(timing.activeTextStart).toBe(timing.textStart);
  const audio={cue:{id:entry.cueId,text:asset.text},progress:position.fraction,timing};
  const sceneProgress=cityNarrationSceneProgress(segments,step.progress,audio);
  expect(cityPlaceThreadReading(cityId,step.stage,step.sceneProgress??step.progress).active).toBe(stepId);
  expect(cityPlaceThreadReading(cityId,step.stage,sceneProgress).active).toBe(stepId);
  expect(cityLifeSceneToAudio(segments,sceneProgress)?.segment.id).toBe(entry.cueId);
 });
});
