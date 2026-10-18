import {cityContinuityLessons} from '../data/cityContinuityLessons';
import {cityContinuityPartState,isCityContinuityLessonStage} from './cityContinuityState';
import type {CityComparisonStageId} from '../data/cityComparison';

const questions={
 history:{nyingchi:'这些地方用途已经有自己的来路。新增交通怎样接上停留、接待和文化参与？',lhasa:'礼仪、居住和纪念用途各不相同。今天的抵达怎样接上这些空间与访问安排？',ngari:'把历史交流与今天生活分开，区域入口又怎样接上具体地方的使用？'},
 connections:{nyingchi:'把机场至林芝、色季拉越岭与鲁朗停留分开，分别留下什么观察问题？',lhasa:'抵达历史城市以后，怎样把具体建筑的用途和访问条件带进观察？',ngari:'沿同一处狮泉河河岸，怎样区分交通抵达、公共空间建设与持续管护？'},
 travel:{nyingchi:'选择林芝河谷或鲁朗，把地形、服务或文化问题写到对应的一站。',lhasa:'选择河谷、具体历史建筑或老城，把要看的用途与访问问题分开保存。',ngari:'先完成狮泉河的交通、河岸与生活问题；如需托林历史，再另选跨县一站。'},
} as const;

/** UI guidance recalls the actual authored part instead of asserting another
 * event or flattening all regions into the same generic card. */
export function cityContinuityBridge(stage:CityComparisonStageId,progress:number){
 if(!isCityContinuityLessonStage(stage))return undefined;
 const state=cityContinuityPartState(progress),parts=cityContinuityLessons[stage][state.cityId],part=parts[state.index];
 const next=parts[state.index+1];
 const question=next?stage==='history'?`接着对照“${next.title}”，看不同事件留下什么用途。`:stage==='connections'?state.index===0?'主通道抵达以后，还需要怎样的地方交接？':'交接接到哪个具体地方，最终服务什么用途？':state.index===0?'带着同一地方的环境问题，再看文化和历史用途。':'把要看的用途与尚待核实的条件，保存到对应的候选站。':questions[stage][state.cityId];
 return {cityId:state.cityId,index:state.index,referenceId:part.referenceId,title:part.title,question,sourceIds:part.sourceIds,atLocalEnd:state.index===2};
}
