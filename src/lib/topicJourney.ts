import {chapters,type Chapter} from '../data/curriculum';
import {guidedJourneyHash,isGuidedJourney} from './guidedJourney';
import {atlasLocationForStep,cityAtlasLocation,cityTopicLocation,detailHash,detailOrigin,type AtlasLocation} from './spatialJourney';
import {parseRoute} from './store';
import {settingsForStep} from './store';
import {getJourneyStep} from '../data/journey';

export type TopicGroup = 'nature'|'history'|'connections'|'travel';
export type HomeThemeDestination = {kind:'topic';stepId:string}|{kind:'atlas';location:AtlasLocation;comparisonStage:'history'|'development'|'travel'};
/** The visible outline and previous/next controls share this introductory route. */
export const recognitionStepIds=['G1','G2','G3','G4','C4'] as const;
export const recognitionSteps=recognitionStepIds.map(id=>{
 const chapter=chapters.find(item=>item.steps.some(step=>step.id===id))!;
 return {chapter,step:chapter.steps.find(step=>step.id===id)!};
});

/** Forward entry starts at the first explanation, not an old manual end state. */
export function recognitionEntrySettings(stepId:string){
 const entry=recognitionSteps.find(item=>item.step.id===stepId);
 if(!entry)return undefined;
 const first=getJourneyStep(stepId).cues[0];
 return {...settingsForStep(entry.step),...first.settings,...(first.motion?{progress:first.motion.from}:{})};
}
export interface ExplorationOrigin {
 stepId:string;
 cueIndex:number;
 waiting:boolean;
 atlas?:AtlasLocation;
 mainline:boolean;
 topicMode:boolean;
}

export const isTopicJourney=(hash:string)=>new URLSearchParams(hash.split('?')[1]||'').get('journey')==='topic';

/** Explicit topic entry takes precedence over the implicit globe-first introduction. */
export function isMainlineRoute(hash:string):boolean {
 if(isTopicJourney(hash))return false;
 const route=parseRoute(hash);
 return isGuidedJourney(hash)||(!route.home&&['G1','G2'].includes(route.step)&&!detailOrigin(hash,route.step)?.cityId);
}

export function topicJourneyHash(chapterId:string,stepId:string,origin?:AtlasLocation):string {
 const context=origin||atlasLocationForStep(stepId);
 const base=detailHash(chapterId,stepId,origin||(context?{...context,view:'topics'}:undefined));
 return `${base}${base.includes('?')?'&':'?'}journey=topic`;
}

/** Library/model links opened inside a city retain the same map, facet and comparison mode. */
export function cityTopicOrigin(stepId:string,origin?:AtlasLocation):AtlasLocation|undefined {
 if(origin?.view!=='cities')return undefined;
 const context=cityTopicLocation(stepId,origin.cityId||'lhasa',origin.facet||'position',origin.compare);
 // An omitted mode means the city's default comparison, not an explicit single-city visit.
 if(origin.compare===undefined)delete context.compare;
 return context;
}

export function captureExplorationOrigin(hash:string,stepId:string,cueIndex:number,waiting:boolean):ExplorationOrigin {
 return {stepId,cueIndex,waiting,atlas:detailOrigin(hash,stepId),mainline:isMainlineRoute(hash),topicMode:isTopicJourney(hash)};
}

export function explorationReturnHash(chapterId:string,origin:ExplorationOrigin):string {
 if(origin.topicMode)return topicJourneyHash(chapterId,origin.stepId,origin.atlas);
 if(origin.mainline)return guidedJourneyHash(chapterId,origin.stepId,origin.atlas);
 return detailHash(chapterId,origin.stepId,origin.atlas);
}

export function topicGroupForChapter(chapterId:string):TopicGroup {
 return ['history','culture'].includes(chapterId)?'history':['connections','modern'].includes(chapterId)?'connections':chapterId==='travel'?'travel':'nature';
}

/** Home cards open their subject; the complete library is a separate entrance. */
export function homeThemeDestination(group:TopicGroup):HomeThemeDestination {
 if(group==='nature')return {kind:'topic',stepId:'G1'};
 return {kind:'atlas',location:cityAtlasLocation('nyingchi','environment',true),comparisonStage:group==='history'?'history':group==='connections'?'development':'travel'};
}

/** The introductory route crosses chapters; other topics retain chapter boundaries. */
export function topicNavigation(chapter:Chapter,stepId:string) {
 const recognition=recognitionSteps.some(item=>item.step.id===stepId);
 const steps=recognition?recognitionSteps.map(item=>item.step):chapter.steps;
 const index=steps.findIndex(step=>step.id===stepId);
 return {previous:index>0?steps[index-1]:undefined,next:index>=0?steps[index+1]:undefined,group:topicGroupForChapter(chapter.id),recognition,position:index+1,total:steps.length};
}

export function completionActionLabel(chapter:Chapter,stepId:string,options:{topicMode:boolean;mainline:boolean;hasSpatialOrigin:boolean;lastQuestion:boolean}):string {
 if(options.topicMode){const next=topicNavigation(chapter,stepId).next;return next?`下一节：${next.title}`:'选择其他专题';}
 if(options.mainline&&stepId==='G4')return '选择接下来要看的专题';
 if(options.hasSpatialOrigin&&!options.mainline)return '返回整体地图';
 return options.lastQuestion?'整理这一程的认识':'进入下一问题';
}
