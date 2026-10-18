import type {RegionalJourneyCue,RegionalJourneyStageId} from '../data/regionalJourneyTypes';
import type {NarrationTiming} from './narrationTiming';
export const regionalStageOrder:RegionalJourneyStageId[]=['environment','life','history','connections'];
export const regionalStageLabels=['地形气候','城市生活','文化历史','现代联系'];
export const clampRegionalProgress=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
export const regionalFacetStage=(facet:string):RegionalJourneyStageId=>facet==='history'?'history':facet==='today'?'connections':'environment';
export const regionalStageFacet=(stage:RegionalJourneyStageId)=>stage==='history'?'history':stage==='connections'?'today':'environment';
export type RegionalJourneyPosition={stage:RegionalJourneyStageId;cue:number;raw:number;voice:boolean};
export function readRegionalPosition(value:unknown,facet:string):RegionalJourneyPosition{
 const initial=regionalFacetStage(facet),v=value as (Partial<RegionalJourneyPosition>&{version?:number})|null;
 const compatible=Boolean(v&&regionalStageOrder.includes(v.stage!)&&regionalStageFacet(v.stage!)===regionalStageFacet(initial));
 const stage=compatible?v!.stage!:initial;
 const lastCue=stage==='history'||stage==='connections'?3:2;
 const storedCue=Math.max(0,Math.floor(Number(v?.cue)||0));
 // Before version 2, cue 2 was the observation recording. Preserve its raw
 // recording position when inserting the new source-road explanation ahead.
 const cue=stage==='connections'&&v?.version!==2&&storedCue===2?3:storedCue;
 return {stage,cue:compatible?Math.min(lastCue,cue):0,raw:compatible?clampRegionalProgress(Number(v?.raw)||0):0,voice:v?.voice!==false};
}
/** Actual recording text, rather than elapsed media fractions, owns the
 * mechanism. A provider word remains just inside its phrase during silence. */
export function regionalCueSceneProgress(cue:RegionalJourneyCue,timing:NarrationTiming|undefined,raw:number){
 if(raw>=1)return 1;
 if(!timing)return raw===0?0:clampRegionalProgress(raw);
 const start=cue.text.indexOf(cue.anchor);
 const textPosition=timing.textProgress*cue.text.length;
 return clampRegionalProgress((textPosition-Math.max(0,start))/Math.max(1,cue.text.length-Math.max(0,start)));
}
