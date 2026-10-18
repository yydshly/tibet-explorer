// @ts-expect-error Node-only fixture reading; the browser project has no Node ambient types.
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {regionalPlaceEvidence} from '../src/data/regionalPlaceEvidence';
import {regionalPlaceSources} from '../src/data/regionalPlaceSources';
import {cityComparisonSources} from '../src/data/cityComparison';
import {cityPlaceEvidenceSources} from '../src/data/cityPlaceEvidence';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {resolveCityLocalGeography} from '../src/lib/cityLocalGeography';
import {cityComparisonAudioSegments} from '../src/hooks/useCityComparisonDirector';
import {cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {cityNarrationSceneProgress} from '../src/lib/cityNarrationSceneProgress';
import {cityPlaceThreadReading} from '../src/data/cityPlaceThreads';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

type SourceFeature={id:string;properties:{featureClass:string;tags:Record<string,string>};geometry:{type:string}};

describe('鲁朗、狮泉河的同地证据链',()=>{
 it.each([
  {city:'nyingchi',cue:'CONT-history-nyingchi-3',token:'二〇一七年',seconds:5.087179487179487,duration:17.676,sha:'d53d4a555c7f20b562cd16fa923edcbb3ebddb714a2f61a2850480b8e7cfb0dc',caption:'二〇一七年又有商户进驻和家庭旅馆培训的记录。'},
  {city:'ngari',cue:'CONT-connections-ngari-3',token:'公共空间与管护',seconds:11.569230769230769,duration:18.756,sha:'18f943b83cf265f5dca04d04af2468cb21b8d232aa67ec223ec5cf9df72da608',caption:'公共空间与管护组织停留和使用。'},
 ] as const)('$city生活入口从真实工作或公共使用句首词进入，暂停锚点不能替代媒体时间',testCase=>{
  const life=regionalPlaceEvidence[testCase.city].steps.find(step=>step.id==='life')!;
  const segments=cityComparisonAudioSegments(life.stage),position=cityLifeSceneToAudio(segments,life.progress)!;
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===testCase.cue);
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(position.segment.id).toBe(testCase.cue);
  expect(asset.duration).toBe(testCase.duration);expect(asset.sha256).toBe(testCase.sha);expect(timeline.audioSha256).toBe(asset.sha256);
  const offset=asset.text.indexOf(testCase.token),word=timeline.words!.find(item=>item.textStart<=offset&&offset<item.textEnd)!;
  expect(word.start).toBeCloseTo(testCase.seconds,12);
  const seconds=position.fraction*asset.duration;
  expect(seconds).toBeCloseTo(word.start+.001,12);expect(seconds).toBeLessThan(word.end);
  const timing=narrationTimingAt(asset.text,seconds,asset.duration,timeline);
  expect(timing.caption).toBe(testCase.caption);expect(timing.spokenText).toBe(word.text);
  const sceneProgress=cityNarrationSceneProgress(segments,life.progress,{cue:{id:testCase.cue,text:asset.text},progress:position.fraction,timing});
  expect(cityPlaceThreadReading(testCase.city,life.stage,life.sceneProgress??life.progress).active).toBe('life');
  expect(cityPlaceThreadReading(testCase.city,life.stage,sceneProgress).active).toBe('life');
  expect(cityLifeSceneToAudio(segments,sceneProgress)?.segment.id).toBe(testCase.cue);
 });
 it.each(['nyingchi','ngari'] as const)('%s环境与四段材料能找到实际来源，额外阅读不冒充旧录音',cityId=>{
  const thread=regionalPlaceEvidence[cityId];
  const sources=[...cityComparisonSources,...cityPlaceEvidenceSources,...regionalPlaceSources];
  expect(thread.context?.text).toBeTruthy();
  for(const id of [...(thread.context?.sourceIds??[]),...thread.steps.flatMap(step=>step.evidence?.sourceIds??[])]){
   const source=sources.find(item=>item.id===id);
   expect(source,id).toBeDefined();expect(source?.url,id).toMatch(/^https:/);
  }
  expect(thread.steps.map(step=>step.id)).toEqual(['event','space','life','observe']);
  for(const step of thread.steps){
   expect(step.evidence?.fact).toBeTruthy();expect(step.evidence?.reason).toBeTruthy();
   expect(step.evidence?.lookAt).toBeTruthy();expect(step.evidence?.limit).toBeTruthy();
   const state=cityContinuityPartState(step.progress),clip=cityContinuityLessons[step.stage as 'history'|'connections'|'travel'][cityId][state.index];
   expect(state.cityId).toBe(cityId);
   expect(clip.referenceId).toBe(cityId==='nyingchi'?'lulang':'ngari');
   expect(state.partProgress).toBeGreaterThan(0);expect(state.partProgress).toBeLessThan(1);
   expect(resolveCityLocalGeography(step.stage,step.progress)?.referenceId).toBe(clip.referenceId);
  }
  const check=thread.steps.find(step=>step.evidence?.check)?.evidence?.check;
  expect(check).toBeDefined();expect(check?.choices.filter(choice=>choice.correct)).toHaveLength(1);
  expect(check?.choices.every(choice=>choice.feedback.length>20)).toBe(true);
 });

 it('seek仍落在小镇运营、既有公路和河岸用途的原录音中，没有借入彩门或托林现场',()=>{
  for(const step of regionalPlaceEvidence.nyingchi.steps){
   const state=cityContinuityPartState(step.progress);
   expect(state.index).toBe(step.id==='observe'?1:2);
   const clip=cityContinuityLessons[step.stage as 'history'|'connections'|'travel'].nyingchi[state.index];
   expect(clip.narration).toContain('鲁朗');
  }
  const ngari=regionalPlaceEvidence.ngari;
  const event=ngari.steps.find(step=>step.id==='event')!,space=ngari.steps.find(step=>step.id==='space')!,life=ngari.steps.find(step=>step.id==='life')!;
  expect(cityContinuityPartState(event.progress).index).toBe(2);
  expect(cityContinuityPartState(space.progress).index).toBe(1);
  expect(cityContinuityPartState(life.progress).index).toBe(2);
  expect(cityContinuityLessons.connections.ngari[1].narration).toContain('二〇〇四年');
  expect(cityContinuityLessons.connections.ngari[2].narration).toContain('不能全部归给机场');
  expect(resolveCityLocalGeography(space.stage,space.progress)?.localityId).toBeUndefined();
  expect(life.evidence?.limit).toContain('机场单独因果评估');
  expect(ngari.steps.find(step=>step.id==='observe')?.evidence?.limit).toContain('不是已验证连续亲水步道');
 });

 it.each(['nyingchi','ngari'] as const)('%s的标注对应已归档OSM原way及真实地物类别',cityId=>{
  const place=cityId==='nyingchi'?'lulang':'shiquanhe';
  const data=JSON.parse(readFileSync(new URL(`../public/data/local-places/${place}.geojson`,import.meta.url),'utf8'));
  const raw=readFileSync(new URL(`../qa/place-grounding/raw/${place}-map.osm`,import.meta.url),'utf8') as string;
  const features=new Map<string,SourceFeature>(data.features.map((feature:SourceFeature)=>[feature.id,feature]));
  for(const step of regionalPlaceEvidence[cityId].steps)for(const reference of step.evidence?.features??[]){
   const feature=features.get(reference.id)!;
   expect(feature,reference.id).toBeDefined();
   const [,id]=reference.id.split('/');
   expect(raw,new URL(`https://www.openstreetmap.org/${reference.id}`).href).toMatch(new RegExp(`<way\\b[^>]*\\bid=["']${id}["']`));
   if(reference.role==='geography')expect(feature.properties.tags.waterway).toBe('river');
   if(reference.role==='arrival')expect(feature.properties.tags.highway).toBeTruthy();
   if(reference.role==='crossing')expect(feature.properties.tags.bridge).toBe('yes');
   if(reference.role==='service'){
    expect(feature.properties.featureClass).toBe('landuse');expect(feature.properties.tags.landuse).toBe('commercial');
    expect(feature.properties.tags.building).toBeUndefined();
   }
   if(reference.role==='public-space')expect(feature.properties.tags.leisure).toBe('park');
  }
 });

 it('服务用地、建设年份和采访地点各自有明确边界，不从现状轮廓推前后城界或家庭收益',()=>{
  const lulang=regionalPlaceEvidence.nyingchi,ngari=regionalPlaceEvidence.ngari;
  expect(lulang.steps[0].evidence?.time).toContain('2016-10-01试运营');
  expect(lulang.steps[2].evidence?.time).toContain('2018-09-10发布');
  expect(lulang.steps[2].evidence?.limit).toContain('不把酒店商业用地认作家庭旅馆或培训现场');
  expect(lulang.steps[2].evidence?.limit).toContain('家庭连续追踪');
  expect(ngari.context?.sourceIds).toContain('regional-shiquanhe-city-making-2021');
  expect(ngari.context?.text).toContain('另一地点');
  expect(ngari.steps[0].evidence?.limit).toContain('不是2017工程边界');
  expect(ngari.steps[3].evidence?.datedFollowUp?.text).toContain('未取得讲堂位置');
  expect(regionalPlaceSources.find(source=>source.id==='regional-shiquanhe-city-making-2021')?.note).toContain('具名回忆');
 });
});
