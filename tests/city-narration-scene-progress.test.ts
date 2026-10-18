import {describe,expect,it} from 'vitest';
import {cityNarrationSceneAnchors,cityNarrationSceneProgress,CITY_SCENE_END_MARGIN} from '../src/lib/cityNarrationSceneProgress';
import {cityComparisonAudioSegments} from '../src/hooks/useCityComparisonDirector';
import {cityLifeSceneToAudio,type CityLifeAudioSegment} from '../src/lib/cityLifeAudio';
import {cityAccessState} from '../src/lib/cityAccessState';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {cityLocalUsageState} from '../src/scene/cityLocalContinuity';
import type {NarrationTiming,TimingPlayback} from '../src/lib/narrationTiming';

const allSegments=(['history','development','connections','travel'] as const).flatMap(stage=>cityComparisonAudioSegments(stage));
const segmentFor=(id:string)=>allSegments.find(segment=>segment.id===id)!;
const rawAt=(segment:CityLifeAudioSegment,fraction:number)=>segment.start+(segment.end-segment.start)*fraction;
function playback(segment:CityLifeAudioSegment,fraction:number,textProgress:number):TimingPlayback{
 const timing:NarrationTiming={caption:segment.text,spokenText:segment.text,textStart:0,textEnd:segment.text.length,textProgress,precision:'provider',timingLevel:'word'};
 return {cue:{id:segment.id,text:segment.text},progress:fraction,timing};
}
function atToken(id:string,token:string,fraction=.41){
 const segment=segmentFor(id),segments=cityComparisonAudioSegments(id.startsWith('ACCESS-')?'development':id.includes('-connections-')?'connections':id.includes('-history-')?'history':'travel');
 const audio=playback(segment,fraction,segment.text.indexOf(token)/segment.text.length),raw=rawAt(segment,fraction);
 return {raw,scene:cityNarrationSceneProgress(segments,raw,audio),segment,segments,audio};
}

describe('city physical process progress follows words without changing saved media time',()=>{
 it('keeps every literal plan in the existing full narration, ordered against existing scene thresholds',()=>{
  for(const [id,anchors] of Object.entries(cityNarrationSceneAnchors)){
   const segment=segmentFor(id);expect(segment,id).toBeDefined();
   let previousOffset=0,previousTarget=0;
   for(const anchor of anchors){const offset=segment.text.indexOf(anchor.token);expect(offset,`${id}: ${anchor.token}`).toBeGreaterThan(previousOffset);expect(anchor.at).toBeGreaterThanOrEqual(previousTarget);expect(anchor.at).toBeLessThan(1);previousOffset=offset;previousTarget=anchor.at;}
  }
 });
 it('switches S4 to G318 at the spoken road transition and reads service use at its own words',()=>{
  const id='CONT-connections-nyingchi-3',road=atToken(id,'再沿三一八国道');
  expect(cityContinuityPartState(road.scene)).toMatchObject({cityId:'nyingchi',index:2});
  const local=cityLocalUsageState({step:5,progress:road.scene},'lulang');
  expect(local.progress).toBeCloseTo(.5,10);expect(local.corridorLeg).toBe('nyingchi-g318');
  const use=atToken(id,'回到同一片服务用地');expect(cityContinuityPartState(use.scene).partProgress).toBeCloseTo(.94,10);
  const reception=atToken(id,'住宿、商业与经营者');expect(cityContinuityPartState(reception.scene).partProgress).toBeCloseTo(.98,10);
  const beforeAudio=playback(road.segment,.41,(road.segment.text.indexOf('再沿三一八国道')-1)/road.segment.text.length);
  const before=cityNarrationSceneProgress(road.segments,road.raw,beforeAudio);
  expect(cityLocalUsageState({step:5,progress:before},'lulang').corridorLeg).toBe('mainling-s4');
  expect(road.raw).toBe(rawAt(road.segment,.41));
 });
 it.each(['ACCESS-lhasa-transfer','CONT-connections-lhasa-2'])('%s aligns handoff and road movement without moving its raw seek interval',id=>{
  const token=id.startsWith('ACCESS')?'跨河进城':'柳梧大桥',result=atToken(id,token);
  const local=id.startsWith('ACCESS')?cityAccessState(result.scene).phaseProgress:cityContinuityPartState(result.scene).partProgress;
  expect(local).toBeCloseTo(.15,10);expect(result.scene).not.toBe(result.raw);
  expect(cityLifeSceneToAudio(result.segments,result.raw)?.segment.id).toBe(id);
  expect(cityLifeSceneToAudio(result.segments,result.scene)?.segment.id).toBe(id);
 });
 it.each([
  ['CONT-history-nyingchi-3','住宿与接待',.58],
  ['CONT-history-lhasa-1','承担宗教用途',.58],
  ['CONT-history-lhasa-2','礼仪、接见与居住',.58],
  ['CONT-history-lhasa-3','包含灵塔和宗教活动空间',.58],
  ['CONT-history-ngari-3','绿化、步行与休闲',.58],
  ['CONT-travel-nyingchi-2','住宿接待',.58],
  ['CONT-travel-lhasa-2','红宫的纪念用途',.75],
  ['CONT-travel-ngari-2','步行停留与公共活动',.58],
 ] as const)('%s reads the existing purpose when its literal words begin', (id,token,target)=>{
  const result=atToken(id,token);expect(cityContinuityPartState(result.scene).partProgress).toBeCloseTo(target,10);
 });
 it('holds the same word-derived physical pose through a pause and supports backwards seeking',()=>{
  const id='CONT-connections-nyingchi-3',result=atToken(id,'回到同一片服务用地',.7);
  const duringPause=cityNarrationSceneProgress(result.segments,rawAt(result.segment,.72),{...result.audio,progress:.72});
  expect(duringPause).toBeCloseTo(result.scene,12);
  const back=atToken(id,'再沿三一八国道',.4);
  expect(back.scene).toBeLessThan(result.scene);expect(cityContinuityPartState(back.scene).index).toBe(2);
 });
 it.each(['history','development','connections','travel'] as const)('%s keeps final-word tail pauses within every current city/part until real cue advance',stage=>{
  const segments=cityComparisonAudioSegments(stage);
  for(const segment of segments){
   const raw=rawAt(segment,.97),scene=cityNarrationSceneProgress(segments,raw,playback(segment,.97,1));
   expect(scene).toBeLessThan(segment.end);expect(scene).toBeCloseTo(segment.end-(segment.end-segment.start)*CITY_SCENE_END_MARGIN,12);
   expect(cityLifeSceneToAudio(segments,scene)?.segment.id).toBe(segment.id);
   if(stage==='development')expect(cityAccessState(scene)).toMatchObject({cityId:cityAccessState(raw).cityId,index:cityAccessState(raw).index});
   else expect(cityContinuityPartState(scene)).toMatchObject({cityId:cityContinuityPartState(raw).cityId,index:cityContinuityPartState(raw).index});
  }
 });
 it('only the actual new audio cue advances the displayed city after a tail pause',()=>{
  const segments=cityComparisonAudioSegments('history'),old=segments[2],next=segments[3];
  const oldScene=cityNarrationSceneProgress(segments,rawAt(old,.99),playback(old,.99,1));
  expect(cityContinuityPartState(oldScene).cityId).toBe('nyingchi');
  const nextScene=cityNarrationSceneProgress(segments,next.start,playback(next,0,0));expect(nextScene).toBe(next.start);expect(cityContinuityPartState(nextScene).cityId).toBe('lhasa');
  expect(cityNarrationSceneProgress(segments,next.start,playback(old,.99,1))).toBe(next.start);
 });
 it('rejects stale recordings, text, scene seeks and non-word estimates; manual identity remains unchanged',()=>{
  const result=atToken('CONT-travel-lhasa-2','红宫的纪念用途');
  const variants:TimingPlayback[]=[
   {...result.audio,cue:{id:'old',text:result.segment.text}},
   {...result.audio,cue:{id:result.segment.id,text:'旧文字'}},
   {...result.audio,progress:.1},
   {...result.audio,timing:{...result.audio.timing!,precision:'estimated'}},
   {...result.audio,timing:{...result.audio.timing!,timingLevel:'sentence'}},
   {...result.audio,timing:{...result.audio.timing!,textProgress:NaN}},
   {cue:null,progress:0},
  ];
  for(const audio of variants)expect(cityNarrationSceneProgress(result.segments,result.raw,audio)).toBe(result.raw);
 });
 it('unplanned word clips use their own exact segment range, retaining final whole-stage completion',()=>{
  const segments=cityComparisonAudioSegments('development'),segment=segments[0];
  const scene=cityNarrationSceneProgress(segments,rawAt(segment,.2),playback(segment,.2,.7));expect(scene).toBeCloseTo(rawAt(segment,.7),12);
  const last=segments.at(-1)!;expect(cityNarrationSceneProgress(segments,1,playback(last,1,1))).toBe(1);
 });
});
