import type {CityAccessCityId} from '../lib/cityAccessState';
import {cityContinuityPartProgress,cityContinuityPartState} from '../lib/cityContinuityState';
import {cityAccessPhaseProgress,cityAccessState} from '../lib/cityAccessState';
import {resolveCityLocalGeography} from '../lib/cityLocalGeography';
import type {CityComparisonStageId} from './cityComparison';
import {regionalPlaceEvidence} from './regionalPlaceEvidence';
import {cityPlaceRecordingEntryFraction as entryFraction} from '../lib/cityPlaceRecordingEntry';

export type CityPlaceThreadStepId='event'|'space'|'life'|'observe';
export interface CityPlaceThreadFeature {id:string;label:string;role:'geography'|'arrival'|'crossing'|'heritage'|'service'|'public-space'}
export interface CityPlaceEvidenceCheck {
 question:string;
 choices:readonly {id:string;label:string;correct:boolean;feedback:string}[];
}
export interface CityPlaceThreadEvidence {
 time:string;
 fact:string;
 reason:string;
 lookAt:string;
 limit:string;
 sourceIds:readonly string[];
 features:readonly CityPlaceThreadFeature[];
 datedFollowUp?:{title:string;text:string};
 check?:CityPlaceEvidenceCheck;
}
export interface CityPlaceThreadStep {
 id:CityPlaceThreadStepId;
 label:string;
 title:string;
 question:string;
 stage:'history'|'development'|'connections'|'travel';
 /** Original recording fraction for playback, storage and review return. */
 progress:number;
 /** Optional paused display anchor; never substitute this for media time. */
 sceneProgress?:number;
 evidence?:CityPlaceThreadEvidence;
}
export interface CityPlaceThread {
 name:string;regionalName:string;summary:string;steps:readonly CityPlaceThreadStep[];
 context?:{title:string;text:string;sourceIds:readonly string[]};
}

/** Seek inside an existing recorded clip. The scene, caption and recording
 * retain their one media clock; a thread does not invent a second timeline. */
function part(cityId:CityAccessCityId,index:number,fraction=0){
 const start=cityContinuityPartProgress(cityId,index);
 const end=index<2?cityContinuityPartProgress(cityId,index+1):cityId==='nyingchi'?.34:cityId==='lhasa'?.68:1;
 return start+(end-start)*fraction;
}

const lhasaTransferStart=cityAccessPhaseProgress('lhasa','transfer');
const lhasaTransferRange=cityAccessPhaseProgress('lhasa','life')-lhasaTransferStart;
// ACCESS-lhasa-transfer's own MiniMax word sidecar: “洛桑赤列” begins at
// 11.089234257805686 s in the 23.328 s recording (audio SHA 4bb05a97…f94ffbb7).
// Enter 1 ms inside that real word. The .8 semantic anchor is display-only;
// treating .8/.85 as a raw seek skips the interview and reaches the caveat.
const lhasaOrganizationRaw=lhasaTransferStart+lhasaTransferRange*entryFraction('lhasa-life');
const lhasaOrganizationDisplay=lhasaTransferStart+lhasaTransferRange*.8+Number.EPSILON;

/** A local sequence inside the wider three-region comparison. These are
 * dated uses of contemporary geography, never fabricated old city extents. */
export const cityPlaceThreads:Record<CityAccessCityId,CityPlaceThread>={
 nyingchi:regionalPlaceEvidence.nyingchi,
 lhasa:{name:'拉萨',regionalName:'拉萨河谷 · 柳梧与老城',summary:'河谷提供空间；历史建设赋予不同用途。铁路到站以后，桥梁、运输组织与访问管理，继续把抵达接到生活。',
 context:{title:'从前面的河谷问题接过来',text:'NASA的2005年影像显示城区位于山地之间较平缓的河谷。自然空间提供条件；大昭寺、布达拉宫和后来的站区，各有不同年代与人的选择。',sourceIds:['city-life-lhasa-valley','city-life-lhasa-heritage','city-life-potala-research']},
 steps:[
  {id:'event',label:'事件',title:'先有历史城市，再增加铁路入口',question:'同一河谷里的大昭寺与布达拉宫，为什么不能当作一次建设？',stage:'history',progress:part('lhasa',0,entryFraction('lhasa-event')),evidence:{
   time:'7世纪 → 1645—1648／1690—1694年',
   fact:'大昭寺创建于7世纪；五世达赖喇嘛主持白宫建设，桑结嘉措主持红宫建设。宗教、礼仪居住与纪念用途分别积累。',
   reason:'河谷解释空间条件；具体人物、组织和使用需要，才继续解释建筑怎样形成。',
   lookAt:'先在整座河谷找大昭寺与布达拉宫，比较两处位置，再读各自年代与用途。',
   limit:'现状轮廓帮助定位，不能退回成7世纪或17世纪的建筑与城界；没有给出各时期城市扩展范围。',
   sourceIds:['city-life-lhasa-heritage','city-life-potala-research','city-local-osm-2026'],
   features:[{id:'way/408117841',label:'拉萨河',role:'geography'},{id:'relation/2358701',label:'大昭寺',role:'heritage'},{id:'way/31475419',label:'布达拉宫',role:'heritage'}],
   check:{question:'哪一组材料能说明建筑用途为什么不同？',choices:[
    {id:'height',label:'只比较山地高程',correct:false,feedback:'高程解释空间条件；它不能给出建设人物、年代或礼仪用途。'},
    {id:'dated-use',label:'建设年代、人物与用途材料',correct:true,feedback:'对。把建设行动与用途放回各自时期，才能区分同一河谷里的历史累积。'},
   ]},
  }},
  {id:'space',label:'空间',title:'2006年到站，2007年跨河接城',question:'铁路把人送到柳梧，为什么还需要跨河接续？',stage:'development',progress:lhasaTransferStart+lhasaTransferRange*entryFraction('lhasa-space'),evidence:{
   time:'2006-07-01铁路通车 → 2007-04-30大桥通车',
   fact:'拉萨站位于柳梧一侧，和老城区隔河。柳梧大桥增加站区与市区之间的直接联系，铁路到站与进城是两个环节。',
   reason:'到站改变区域抵达；跨河道路和后续运输，才把这个入口接到具体城市用途。',
   lookAt:'在同一地图依次辨认拉萨站、拉萨河、柳梧大桥和城区，不把拉萨西货场放到客站里。',
   limit:'材料支持开通日期和联系，未取得通车前后的实测路网、城市边界或同口径通行调查，不能计算城市扩张或效率倍数。',
   sourceIds:['event-liuwu-opening-2007','place-liuwu-local-interview-2019','city-local-osm-2026'],
   features:[{id:'way/122707268',label:'拉萨站（客运）',role:'arrival'},{id:'way/408117841',label:'拉萨河',role:'geography'},{id:'way/122707217',label:'柳梧大桥（源图名柳吾大桥）',role:'crossing'}],
   check:{question:'桥梁材料能支持哪一个结论？',choices:[
    {id:'connection',label:'站区与市区增加直接跨河联系',correct:true,feedback:'对。报道与当前地图共同解释联系；生活改变还要另读人的使用与组织。'},
    {id:'all-growth',label:'此后所有城市增长都由铁路造成',correct:false,feedback:'不能这样归因。建设、土地安排、运营与个人选择共同参与，现有材料没有分离铁路单独效果。'},
   ]},
  }},
  {id:'life',label:'生活',title:'从桥梁设施，接到洛桑赤列的运输组织',question:'道路接通以后，谁把运输变成持续的地方服务？',stage:'development',progress:lhasaOrganizationRaw,sceneProgress:lhasaOrganizationDisplay,evidence:{
   time:'2019年具名采访 · 回忆铁路建设及后续运输',
   fact:'洛桑赤列回忆部分村民购车接送乘客、拉运材料；村委成立柳梧运输队，他参与协调调度。设施之外还有车辆、劳动和组织。',
   reason:'交通提供机会，实际服务需要人的投资与协作。这说明一组具体行动，不能代替所有家庭的生活变化。',
   lookAt:'保持同一站区—跨河—城区关系，观察到站后的交接与移动；车辆和交接动作为原理示意，不定位采访者家或工地。',
   limit:'采访不是家庭连续追踪或铁路单独因果评估；不采用旧收入、旧车程与车队数量来计算收益。',
   sourceIds:['place-liuwu-local-interview-2019','place-lhasa-bus-adjustment-2024','city-local-osm-2026'],
   features:[{id:'way/122707268',label:'拉萨站',role:'arrival'},{id:'way/122707217',label:'跨河接续',role:'crossing'}],
   datedFollowUp:{title:'再读一份运营记录 · 2024年6月',text:'交通局公告调整多条公交路线；19路列有柳梧大桥、医院和罗布林卡等站名。它说明地方联系还需要站点与持续运营安排，不是今天的乘车指引。'},
   check:{question:'哪项材料补上“设施怎样进入生活”的中间环节？',choices:[
    {id:'line',label:'只画站区到城市的连线',correct:false,feedback:'连线只交代空间关系；它还没有说明车辆、劳动和协调由谁承担。'},
    {id:'organization',label:'具名运输行动与调度组织',correct:true,feedback:'对。它补上人的工作，同时仍需区分个体材料与普遍成效。'},
   ]},
  }},
  {id:'observe',label:'观察',title:'带着同一条空间线，分别观察与核验',question:'从站区跨河到历史城市，怎样区分今天所见、历史解释与出行安排？',stage:'travel',progress:part('lhasa',1,entryFraction('lhasa-observe')),evidence:{
   time:'当代地图观察 × 有日期材料 × 出行日核验',
   fact:'先观察站区、河流与跨河位置，再选择大昭寺或布达拉宫的年代和用途问题。UNESCO2025年决定继续关注访问管理与尊重朝圣活动。',
   reason:'能到城市，不等于已到允许访问的入口；参访也需要理解当地仍在发生的使用。',
   lookAt:'记下一个实际地物和一个问题：跨河接续怎样组织？这处建筑何时建设、用于什么？再分别核实允许访问的位置。',
   limit:'这是一组观察顺序，不是已经核验的一日行程。2024年公交调整只作运营记录；当前线路、接驳、预约和开放条件须按日期另查。',
   sourceIds:['continuity-unesco-decision-2025','place-lhasa-bus-adjustment-2024','city-life-lhasa-heritage','city-local-osm-2026'],
   features:[{id:'way/122707217',label:'跨河观察参照',role:'crossing'},{id:'relation/2358701',label:'大昭寺用途问题',role:'heritage'},{id:'way/31475419',label:'布达拉宫用途问题',role:'heritage'}],
   check:{question:'哪一项仍必须按自己的出行日期核验？',choices:[
    {id:'founding',label:'大昭寺的始建世纪',correct:false,feedback:'这是需要历史材料回答的问题；当天的交通与开放安排属于另一类核验。'},
    {id:'access',label:'接驳、开放、预约与允许访问的位置',correct:true,feedback:'对。历史与地图帮助形成问题，当前安排要按出行日期核实。'},
   ]},
  }},
 ]},
 ngari:regionalPlaceEvidence.ngari,
};

/** Resolve an authored local reading against the existing progress only.
 * Consumers may pass the director's semantic sceneProgress for 3D attention;
 * seeks must always retain each step's raw media progress above. */
export function cityPlaceThreadReading(cityId:CityAccessCityId,stage:CityComparisonStageId,progress:number){
 const thread=cityPlaceThreads[cityId],state=cityContinuityPartState(progress),place=resolveCityLocalGeography(stage,progress);
 const expectedReference=cityId==='nyingchi'?'lulang':cityId==='lhasa'?'lhasa':'ngari';
 const samePlace=place?.referenceId===expectedReference&&(cityId!=='lhasa'||place.localityId==='lhasa');
 const access=cityAccessState(progress);
 const active:CityPlaceThreadStepId|undefined=samePlace?(stage==='travel'?'observe':stage==='development'?(access.index===3||(cityId==='lhasa'&&access.index===2&&access.phaseProgress>=.8)?'life':'space'):stage==='connections'?(state.index===2&&cityId==='lhasa'?'observe':state.index===2&&cityId!=='nyingchi'?'life':'space'):cityId==='nyingchi'&&state.index===2&&state.partProgress>=.35?'life':'event'):undefined;
 const currentIndex=thread.steps.findIndex(step=>step.id===active),current=thread.steps[Math.max(0,currentIndex)];
 return {thread,place,samePlace,active,current,next:thread.steps[currentIndex+1],evidence:samePlace?current.evidence:undefined};
}
