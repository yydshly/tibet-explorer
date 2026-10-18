import {cityComparisonLabels,cityComparisonNarrationCues,cityComparisonStages,type CityComparisonStageId} from '../data/cityComparison';
import type {CityLifeAudioSegment} from './cityLifeAudio';
import {cityAccessCityRange,type CityAccessCityId} from './cityAccessState';

export type CityComparisonContinuation=
 |{kind:'segment';stage:CityComparisonStageId;progress:number;label:string;segmentId:string;cityId:'nyingchi'|'lhasa'|'ngari'}
 |{kind:'stage';stage:CityComparisonStageId;progress:0;label:string}
 |{kind:'complete';label:string};

const cityIds=['nyingchi','lhasa','ngari'] as const;
const cityNames={nyingchi:'林芝',lhasa:'拉萨',ngari:'阿里'};
const cityAt=(progress:number)=>cityIds[progress>=.68?2:progress>=.34?1:0];

/** Compare another region at the same local process phase. Keeping just an
 * absolute percent would cross different city windows; restarting at zero
 * would throw away the comparison the learner was making. */
export function cityComparisonFocusProgress(progress:number,targetCity:CityAccessCityId):number {
 const value=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const currentRange=cityAccessCityRange(cityAt(value)),targetRange=cityAccessCityRange(targetCity);
 const local=Math.min(1-1e-8,Math.max(0,(value-currentRange.start)/(currentRange.end-currentRange.start)));
 return targetRange.start+(targetRange.end-targetRange.start)*local;
}

/** Manual continuation follows the same recorded parts as playback. A topic
 * change is offered only after its last real part, irrespective of city count. */
export function cityComparisonContinuation(stage:CityComparisonStageId,progress:number,segments:readonly CityLifeAudioSegment[]):CityComparisonContinuation {
 const value=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const currentIndex=segments.reduce((last,segment,index)=>value+1e-10>=segment.start?index:last,0);
 const next=segments[currentIndex+1];
 if(next){
  const cityId=cityAt(next.start),currentCity=cityAt(value);
  const title=cityComparisonNarrationCues.find(cue=>cue.id===next.id)?.title;
  const label=cityId!==currentCity?`继续看${cityNames[cityId]}`:title?`继续：${title}`:`继续${cityNames[cityId]}下一段`;
  return {kind:'segment',stage,progress:next.start,label,segmentId:next.id,cityId};
 }
 const stageIndex=cityComparisonStages.findIndex(item=>item.id===stage),nextStage=cityComparisonStages[stageIndex+1];
 if(nextStage)return {kind:'stage',stage:nextStage.id,progress:0,label:`继续看${cityComparisonLabels[stageIndex+1]} · 从林芝开始`};
 return {kind:'complete',label:'整理这一程的观察计划'};
}
