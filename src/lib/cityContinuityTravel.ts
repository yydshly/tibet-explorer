import {travelStops} from '../data/curriculum';
import {cityContinuityTravelStops,cityContinuitySources} from '../data/cityContinuity';
import {cityLifeSources} from '../data/cityLifeJourney';
import {cityAccessChanges,cityAccessSources} from '../data/cityAccessChange';
import {cityContinuityLessons} from '../data/cityContinuityLessons';
import type {Exploration} from './store';
import {cityTravelOrigin,cityTravelOriginFor} from './cityTravelOrigin';
import {cityLocalObservationNote,cityLocalityForStop,type CityLocalObservationPoint} from './cityLocalGeography';

export type CityContinuityTravelId='nyingchi'|'lhasa'|'ngari';
export type CityTravelObservationLink='before'|'access'|'transfer'|'life';
export interface CityTravelObservationQuestion {id:CityTravelObservationLink;label:string;question:string}

const observationLabels:Record<CityTravelObservationLink,string>={before:'地形与原有通行',access:'开通带来的选择',transfer:'到站或落地以后',life:'文化与生活使用'};
const observationQuestions:Record<string,Record<CityTravelObservationLink,string>>={
 'nyingchi-valley':{before:'山谷、坡面与越岭怎样影响原有通行？哪些限制在铁路开通后仍然存在？',access:'对照2021年开通材料，铁路增加了哪一种抵达选择？其他方式是否仍在使用？',transfer:'离开车站以后，去城区或我的实际观察点还要接上什么交通与服务？',life:'对读彩门村当年的具名访谈，学生出行、民宿接待与产品运输各需要哪些条件？'},
 'nyingchi-lulang':{before:'林芝至鲁朗涉及色季拉越岭；山口与高差怎样影响接续？',access:'铁路抵达林芝与前往鲁朗是两个环节；新入口改变了哪一环，哪一环仍需地面交通？',transfer:'从我的实际抵达点到鲁朗，需要分几段、换什么方式？按出行日期能核实到哪些信息？',life:'对照2016年服务场所材料，怎样区分旅游展示、持续的文化实践与今天的地方服务？'},
 'lhasa-river':{before:'河谷的平缓空间怎样影响通行与城市用地？山地与河流仍带来哪些约束？',access:'2006年增加铁路抵达方式后，原有公路与航空如何仍然参与城市联系？',transfer:'到站以后怎样跨过河流、接上城区？地图上的抵达与实际可用的接续有什么差别？',life:'货物、居民出行与用水服务需要哪些不同设施？哪些变化能从有日期的资料中核实？'},
 'lhasa-buildings':{before:'山地、河谷与历史建筑所在空间，怎样影响实际到访和停留？',access:'铁路增加抵达选择以后，能否直接推出遗产参访增加或生活改变？还缺什么证据？',transfer:'我选中的具体建筑从抵达点怎样接续？开放、预约与允许观察的位置要分别查什么？',life:'对照白宫的礼仪与居住、红宫的纪念和宗教用途，朝圣与遗产参访怎样共用今天的历史空间？'},
 'lhasa-old-town':{before:'老城的街巷、河谷与周围山地，怎样影响步行、交通与服务安排？',access:'新增抵达方式与老城实际变化之间，需要哪些有日期的地方材料来连接？',transfer:'进入老城之后，步行、停留与服务安排怎样尊重居民生活和朝圣活动？',life:'将文字材料、历史事件与今天使用分开记录，哪些变化能现场看见，哪些仍需查证？'},
 'shiquanhe-life':{before:'2004年狮泉河至昆莎G219柏油路与高地地形是什么关系？哪些地面联系早于通航？',access:'2010年昆莎通航增加了哪一种选择？为什么不等于替代公路或直接抵达每个县？',transfer:'从昆莎机场沿既有公路进入狮泉河，还要核实哪些地面接驳与公共可达位置？',life:'对照2017河岸公共空间材料，桥梁通行、步行停留与持续管护分别怎样支持生活？哪些变化不能由通航日期推出？'},
 tholing:{before:'札达与狮泉河跨县分布；地形与距离怎样影响我选择的观察顺序？',access:'金珠德吉2006年开办旅馆，早于2010年机场通航；这对解释地方经营变化提出了什么证据要求？',transfer:'从实际抵达点到札达托林，要核实哪些地面路段与访问条件？为什么不能当成同城短线？',life:'把11—12世纪交流材料、家庭经营报道与今天观察分开，哪些是延续，哪些变化仍需证据？'},
};
const observationChecks:Record<string,string>={
 'nyingchi-valley':'实际到站地点、允许停留的河谷观察点、当日接驳；现场天气与长期气候分开记录。',
 'nyingchi-lulang':'出行日期、色季拉越岭路况、分段接驳与鲁朗具体访问点；铁路开通不代替这些核验。',
 'lhasa-river':'实际到站地点、公共可达的河谷观察点与城区接续；不擅自进入取水或供水设施。',
 'lhasa-buildings':'选定具体遗产对象，分别核验开放、预约、到达与观察规则；不把多处压成已核验的单日安排。',
 'lhasa-old-town':'按日期核验访问与停留条件，尊重居民与朝圣活动；材料年代不等于当前开放规则。',
 'shiquanhe-life':'机场落地与地面接续、可达公共观察点；冬灌报道不等于设施开放或实时供水记录。',
 tholing:'札达跨县地面接续、具体访问对象与开放日期；历史交流材料不等于古道导航或当前经营状态。',
};

export function cityContinuityTravelQuestions(stopId:string):CityTravelObservationQuestion[]{
 const questions=observationQuestions[stopId];
 return questions?(Object.keys(observationLabels) as CityTravelObservationLink[]).map(id=>({id,label:observationLabels[id],question:questions[id]})):[];
}

export function cityContinuityTravelCheck(stopId:string):string{return observationChecks[stopId]||'按日期核验实际观察点、分段交通与访问条件。';}

/** A stop's cultural question must recall that place's material, not another
 * generic transport outcome. Selecting it still does not save or mark a visit. */
export function cityContinuityTravelContext(stopId:string,link:CityTravelObservationLink){
 const cityId=(Object.keys(plans) as CityContinuityTravelId[]).find(id=>plans[id].stopIds.some(value=>value===stopId));
 if(!cityId)return {title:'地方观察',text:'先选择想理解的地方和问题。',sourceIds:[] as string[]};
 const access=cityAccessChanges[cityId][link];
 if(link!=='life')return {title:access.label,text:access.text,sourceIds:cityAccessChanges[cityId].sourceIds};
 const selected=stopId==='lhasa-buildings'?[cityContinuityLessons.history.lhasa[1],cityContinuityLessons.history.lhasa[2]]:
  stopId==='lhasa-old-town'?[cityContinuityLessons.connections.lhasa[2]]:
  stopId==='nyingchi-lulang'?[cityContinuityLessons.history.nyingchi[2],cityContinuityLessons.history.nyingchi[1]]:
  stopId==='tholing'?[cityContinuityLessons.history.ngari[1],{title:'札布让金珠德吉：经营早于通航',text:'2020年具名采访记录金珠德吉与丈夫2006年已开办家庭旅馆，早于2010年昆莎通航。它是札布让的独立地方经营材料，不是狮泉河现场，也不能将经营变化单独归于机场。',sourceIds:['access-zaburang-start-2020','access-zaburang-life-2020']}]:
  stopId==='shiquanhe-life'?[cityContinuityLessons.travel.ngari[0],cityContinuityLessons.history.ngari[2]]:[];
 if(!selected.length)return {title:access.label,text:access.text,sourceIds:cityAccessChanges[cityId].sourceIds};
 return {title:selected.map(part=>part.title).join(' · '),text:selected.map(part=>part.text).join('\n'),sourceIds:[...new Set(selected.flatMap(part=>part.sourceIds))]};
}

export function cityTravelObservationNote(question:CityTravelObservationQuestion):string{return `【交通认识 · ${question.label}】${question.question}`;}

export function cityTravelObservationSaved(note:string|undefined,question:CityTravelObservationQuestion):boolean{return Boolean(note?.includes(question.question));}

export function cityTravelObservationFits(note:string|undefined,question:CityTravelObservationQuestion,point?:CityLocalObservationPoint):boolean{
 const lines=[note??''];if(!cityTravelObservationSaved(note,question))lines.push(cityTravelObservationNote(question));
 if(point){const text=cityLocalObservationNote(point);if(!note?.includes(text))lines.push(text);}
 return lines.filter(Boolean).join('\n').length<=1500;
}

const plans={
 nyingchi:{title:'林芝：从河谷到鲁朗',stopIds:['nyingchi-valley','nyingchi-lulang'],purpose:'先用林芝河谷理解生活条件，再在鲁朗追问文化传习与旅游服务怎样相遇。',scope:'林芝城区与鲁朗是分开的区域观察点，之间涉及色季拉山。这里保存研读和观察顺序；路段、接驳与停留需另行核验。'},
 lhasa:{title:'拉萨：从河谷到历史城区',stopIds:['lhasa-river','lhasa-buildings','lhasa-old-town'],purpose:'把供水、城市空间与不同年代的建筑和文字材料放在一起阅读，观察继承与今天的使用。',scope:'河谷观察、遗产建筑与老城材料分别准备。站名指向观察区域和问题；不等同景区精确定位，也不把多个遗产点压成单日行程。'},
 ngari:{title:'阿里：先看狮泉河，另选札达历史',stopIds:['shiquanhe-life','tholing'],purpose:'先把狮泉河的道路接续、河岸建设与公共生活观察完整；如需延伸历史，再另选札达托林，分别记录不同地方的材料与问题。',scope:'狮泉河与札达托林是不同地方，是否加入第二站由本人决定；跨县研读顺序不能作为同城短线或已核验的驾车线路。'},
} as const;

export function cityContinuityTravelPlan(cityId:CityContinuityTravelId) {
 const plan=plans[cityId];
 return {...plan,stops:plan.stopIds.flatMap(id=>travelStops.find(stop=>stop.id===id)??[])};
}

export function cityContinuityTravelEvidence(stopId:string) {
 const stop=cityContinuityTravelStops.find(item=>item.id===stopId);
 const inheritedSources:Record<string,string[]>={
  'nyingchi-valley':['city-life-nyingchi-overview','city-life-southeast-moisture'],
  'nyingchi-lulang':['city-life-gongbo-learning-2026'],
  'lhasa-buildings':['city-life-lhasa-heritage','city-life-potala-research','continuity-unesco-decision-2025'],
  'lhasa-old-town':['city-life-lhasa-heritage','continuity-unesco-decision-2025'],
  tholing:['city-life-tibet-india','city-life-zanda-life-2020'],
 };
 const cityId=(Object.keys(plans) as CityContinuityTravelId[]).find(id=>plans[id].stopIds.some(value=>value===stopId));
 const accessSources=cityId?cityAccessChanges[cityId].sourceIds.flatMap(id=>cityAccessSources.find(source=>source.id===id)??[]):[];
 const materialSources=cityContinuityTravelQuestions(stopId).flatMap(question=>cityContinuityTravelContext(stopId,question.id).sourceIds);
 const placeSourceIds=[...new Set([...(stop?.sourceIds||[]),...(inheritedSources[stopId]||[]),...materialSources])];
 const placeSources=placeSourceIds.flatMap(id=>cityContinuitySources.find(source=>source.id===id)??cityLifeSources.find(source=>source.id===id)??cityAccessSources.find(source=>source.id===id)??[]);
 // Shared access material is the source of truth for the transport phases;
 // identical official pages should not appear twice under old and new IDs.
 return [...new Map([...placeSources,...accessSources].map(source=>[source.url,source])).values()];
}

/** Append to the existing plan. The learner's order, edits and intentionally blank notes win. */
function appendStops(previous:Exploration,cityId:CityContinuityTravelId,stopIds:readonly string[],origin?:string):Exploration {
 const stops=cityContinuityTravelPlan(cityId).stops.filter(stop=>stopIds.includes(stop.id));
 const route=[...new Set([...previous.route,...stops.map(stop=>stop.id)])];
 const stopNotes={...previous.stopNotes};
 const stopOrigins={...previous.stopOrigins};
 const returnHash=cityTravelOrigin(origin)||cityTravelOriginFor(cityId);
 for(const stop of stops){
  const authored=cityContinuityTravelStops.find(item=>item.id===stop.id);
  if(!Object.hasOwn(stopNotes,stop.id))stopNotes[stop.id]=authored?.observationNote||`观察问题：${stop.question}\n待核实：实际可达的观察位置、分段交通、开放与预约；把现场所见与有日期的资料分开。`;
  if(!Object.hasOwn(stopOrigins,stop.id))stopOrigins[stop.id]=returnHash;
 }
 if(route.length===previous.route.length&&route.every((id,index)=>id===previous.route[index])&&Object.keys(stopNotes).length===Object.keys(previous.stopNotes).length&&Object.keys(stopOrigins).length===Object.keys(previous.stopOrigins||{}).length)return previous;
 return {...previous,route,stopNotes,stopOrigins};
}

export function appendCityContinuityTravel(previous:Exploration,cityId:CityContinuityTravelId,origin?:string):Exploration {
 return appendStops(previous,cityId,cityContinuityTravelPlan(cityId).stopIds,origin);
}

/** A single-stop choice never adds the rest of its regional group. */
export function appendCityContinuityTravelStop(previous:Exploration,cityId:CityContinuityTravelId,stopId:string,origin?:string):Exploration {
 return appendStops(previous,cityId,[stopId],origin);
}

/** Only an explicit question action adds text, including to a deliberately blank note. */
export function appendCityContinuityTravelQuestion(previous:Exploration,cityId:CityContinuityTravelId,stopId:string,link:CityTravelObservationLink,origin?:string,point?:CityLocalObservationPoint):Exploration {
 if(!cityContinuityTravelPlan(cityId).stopIds.some(id=>id===stopId))return previous;
 const question=cityContinuityTravelQuestions(stopId).find(item=>item.id===link);
 if(!question)return previous;
 const existing=previous.stopNotes[stopId];
 // Preserve every existing character. If the complete new question cannot fit,
 // the editor must make room rather than silently truncating the learner's work.
 if(point&&cityLocalityForStop[stopId]!==point.localityId)return previous;
 if(!cityTravelObservationFits(existing,question,point))return previous;
 const appended=appendStops(previous,cityId,[stopId],origin);
 const pointText=point?cityLocalObservationNote(point):undefined;
 if(cityTravelObservationSaved(existing,question)&&(!pointText||existing?.includes(pointText)))return appended;
 const baseline=Object.hasOwn(previous.stopNotes,stopId)?existing:appended.stopNotes[stopId];
 const additions=[!cityTravelObservationSaved(baseline,question)?cityTravelObservationNote(question):'',pointText&&!baseline?.includes(pointText)?pointText:''].filter(Boolean);
 const next=[baseline??'',...additions].filter(Boolean).join('\n');
 if(next.length>1500)return previous;
 return {...appended,stopNotes:{...appended.stopNotes,[stopId]:next}};
}
