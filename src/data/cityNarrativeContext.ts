import type {CityComparisonStageId} from './cityComparison';
import {cityContinuityLessons} from './cityContinuityLessons';
import {cityAccessChanges} from './cityAccessChange';
import {regionalPlaceEvidence} from './regionalPlaceEvidence';
import {cityAccessState,type CityAccessCityId} from '../lib/cityAccessState';
import {cityContinuityPartState,isCityContinuityLessonStage} from '../lib/cityContinuityState';

export type CityNarrativeRelation='comparison'|'same-place'|'different-place'|'look-back'|'observation';
export interface CityNarrativeReading {
 title:string;text:string;sourceIds:readonly string[];scope:string;
}
export interface CityNarrativeContextValue {
 cueId:string;cityId:CityAccessCityId;referenceId:string;place:string;period:string;
 relation:CityNarrativeRelation;relationLabel:string;orientation:string;next:string;
 sourceIds:readonly string[];reading?:CityNarrativeReading;
}
type AuthoredContext=Pick<CityNarrativeContextValue,'place'|'period'|'relation'|'relationLabel'|'orientation'|'next'>;

/** Relationships describe the authored sequence of materials, not the user's
 * actual previous navigation, a travel itinerary or an animated historical year. */
const history:Record<CityAccessCityId,readonly [AuthoredContext,AuthoredContext,AuthoredContext]>={
 nyingchi:[
  {place:'林芝 · 工布地区保护材料',period:'2006年保护节点 · 2021年答复',relation:'comparison',relationLabel:'案例对照，不是逐年年表',orientation:'先读保护行动，再读传习怎样发生；认定年份不是文化起源。',next:'下一份材料转到2026年课堂，对照保护之后怎样通过讲解与参与传习。'},
  {place:'林芝 · 工布文化课堂材料',period:'2026年6月活动',relation:'comparison',relationLabel:'同一文化问题，换一份材料',orientation:'讲解与家庭参与说明传习；本图没有课堂的实际场地定位。',next:'接着换到鲁朗，回看2016—2017年的服务建设，比较另一类人的行动。'},
  {place:'林芝市 · 鲁朗河谷',period:'2016年试运营 · 2017年服务记录',relation:'different-place',relationLabel:'换到鲁朗，回看建设案例',orientation:'本主题对读2026年课堂与2016年建设；是换地案例，不是时间倒演或同一现场。',next:'沿鲁朗可继续读机场—林芝—越岭接续；按主题播放则转到拉萨建筑材料。'},
 ],
 lhasa:[
  {place:'拉萨 · 大昭寺用途材料',period:'7世纪创建 · 现存建筑历次增修另读',relation:'comparison',relationLabel:'同城分对象，对照年代与用途',orientation:'先读大昭寺，再读布达拉宫；同一城市里的对象并非一次建成。',next:'接着读17世纪白宫的礼仪与居住用途，不把始建年代套给全部现存构件。'},
  {place:'拉萨 · 布达拉宫白宫材料',period:'1645—1648年建设',relation:'different-place',relationLabel:'同城换到布达拉宫',orientation:'从大昭寺转到白宫，比较人物、年代和用途；当前轮廓只作位置参照。',next:'接着仍读布达拉宫，区分红宫的纪念与宗教用途。'},
  {place:'拉萨 · 布达拉宫红宫材料',period:'1690—1694年建设',relation:'same-place',relationLabel:'同一建筑群，区分建设与用途',orientation:'白宫与红宫分别理解；用途演示不重建17世纪宫殿和城界。',next:'沿拉萨可继续读铁路与跨河接续；按主题播放则转到另一地区的托林交流。'},
 ],
 ngari:[
  {place:'阿里札达 · 托林交流材料',period:'1042年人物联系',relation:'different-place',relationLabel:'不同地方：托林交流与狮泉河生活',orientation:'托林与狮泉河是不同地方；此处读教师交流，不借用狮泉河街区作现场。',next:'继续读11—12世纪学习与翻译的背景，材料没有逐段古道。'},
  {place:'阿里札达 · 托林交流背景',period:'11—12世纪学习与翻译',relation:'same-place',relationLabel:'同一交流问题，展开知识传播',orientation:'教师、文本与翻译解释传播；聚居地定位不等于寺院、出土点或古道。',next:'接着回到狮泉河2017年公共空间材料，明确换地方，也换历史问题。'},
  {place:'阿里 · 狮泉河河岸与城区',period:'2017年河岸工程 · 2021年采访',relation:'different-place',relationLabel:'离开托林，回到狮泉河',orientation:'这里解释公共空间怎样被使用；与托林教师交流分别有地点和年代。',next:'沿狮泉河可回看2004公路、2010航空接续；按主题播放则从林芝进入现代发展。'},
 ],
};

const development:Record<CityAccessCityId,readonly [AuthoredContext,AuthoredContext,AuthoredContext,AuthoredContext]>={
 nyingchi:[
  {place:'林芝地区 · 原有交通材料',period:'2021年铁路之前 · 2006年已有航空',relation:'look-back',relationLabel:'回看新增铁路之前',orientation:'保留已有公路与航空，后面才比较铁路增加的选择。',next:'继续读2021年6月25日铁路开通，再追问到站之后的地方接续。'},
  {place:'拉萨—山南—林芝 · 区域铁路联系',period:'2021年6月25日开通',relation:'same-place',relationLabel:'原有交通保留，增加一种方式',orientation:'先读地区间抵达；林芝城区参照不是某座车站或真实轨道。',next:'转到米林彩门村具名材料，问主通道怎样接到地方服务。'},
  {place:'林芝米林 · 彩门村材料',period:'2021年具名采访',relation:'different-place',relationLabel:'换到具体村庄，读地方接续',orientation:'彩门村不是林芝城区，也不是鲁朗；本图只保留地区定位。',next:'仍读普巴与扎西的用途和期待，区分具体行动与普遍收益。'},
  {place:'林芝米林 · 彩门村生活材料',period:'2021年用途与期待',relation:'same-place',relationLabel:'同一村庄，继续读人的使用',orientation:'这里的接待、出行与寄售材料不能移作鲁朗经营成果。',next:'沿鲁朗线索可以另读越岭与小镇服务；按主题播放接着对照拉萨。'},
 ],
 lhasa:[
  {place:'拉萨 · 原有公路与航空背景',period:'2006年铁路之前',relation:'look-back',relationLabel:'回看铁路加入之前',orientation:'历史城市和既有交通仍在；不是从开通当天才开始城市生活。',next:'继续读2006年铁路抵达，再把客运跨河与货运配送分开。'},
  {place:'拉萨 · 铁路节点材料',period:'2006年7月1日全线通车',relation:'same-place',relationLabel:'增加抵达方式，尚未进入用途端',orientation:'人和物到达铁路节点以后，还需要地方接续。',next:'下一段先读柳梧客运跨河与运输组织。'},
  {place:'拉萨 · 客站—柳梧跨河接续',period:'2007年4月30日大桥通车 · 2019年采访',relation:'same-place',relationLabel:'客运接续，加入人员与组织',orientation:'站区、桥梁与城区放在一起读；拉萨西货场属于另一处地点。',next:'接着单独转到拉萨西的2026年货运采访，不在客站复原装卸。'},
  {place:'拉萨西 · 货场采访材料',period:'2026年具名采访',relation:'different-place',relationLabel:'离开客站，另读货运用途',orientation:'这里解释货物与配送；当前地方窗口没有货场几何，不借客站街区替代。',next:'接着按区域入口、地方接续与具体访问重新检查联系。'},
 ],
 ngari:[
  {place:'昆莎—狮泉河 · G219公路材料',period:'2004年柏油路 · 2025年口述',relation:'look-back',relationLabel:'回看航空之前已有的公路',orientation:'从2017河岸案例回看原有交通，先分清各次建设的作用。',next:'继续读2010年通航，公路仍承担机场以外的行程。'},
  {place:'阿里 · 昆莎机场区域入口',period:'2010年7月1日通航',relation:'different-place',relationLabel:'增加航空入口，尚未到狮泉河',orientation:'机场与城区分开定位；落地后还有地面接续。',next:'沿源道路看城外间隔，不把机场移到城区或保证当天接驳。'},
  {place:'昆莎—狮泉河 · 地面接续',period:'2004／2010年材料 · 当代道路参照',relation:'same-place',relationLabel:'同一次抵达，继续地面行程',orientation:'公路联系与当日车辆服务分别理解；托林是另外的县域。',next:'回到狮泉河河岸，读2017年公共空间与持续管护。'},
  {place:'阿里 · 狮泉河河岸与城区',period:'2017年公共空间 · 2021年采访',relation:'same-place',relationLabel:'抵达以后，换问地方怎样使用',orientation:'交通与河岸建设各改变一环，不能全部归因于机场。',next:'接着按入口—接续—用途复查联系，再组织自己的观察问题。'},
 ],
};

/** No new media clock: resolve the same semantic scene progress already used
 * by 3D. A city mismatch is omitted instead of flashing another city's context. */
export function cityNarrativeContextFor(stage:CityComparisonStageId,cityId:CityAccessCityId,sceneProgress:number):CityNarrativeContextValue|undefined{
 if(stage==='development'){
  const state=cityAccessState(sceneProgress);if(state.cityId!==cityId)return;
  const current=development[cityId][state.index],change=cityAccessChanges[cityId];
  return {cueId:`ACCESS-${cityId}-${state.phase}`,cityId,referenceId:cityId,...current,sourceIds:change.sourceIds};
 }
 if(!isCityContinuityLessonStage(stage))return;
 const state=cityContinuityPartState(sceneProgress);if(state.cityId!==cityId)return;
 const part=cityContinuityLessons[stage][cityId][state.index];
 let current:AuthoredContext;
 if(stage==='history')current=history[cityId][state.index];
 else if(stage==='connections')current={
  place:part.referenceId==='lulang'?'米林—林芝—鲁朗 · 道路接续':cityId==='nyingchi'?(state.index===1?'林芝米林 · 彩门村材料':'拉萨—山南—林芝 · 区域联系'):cityId==='lhasa'?(state.index===2?'拉萨 · 历史建筑访问材料':state.index===1?'拉萨 · 客站跨河接续':'拉萨 · 区域铁路入口'):state.index<2?'昆莎—狮泉河 · 区域接续':'狮泉河 · 河岸公共使用',
  period:part.year??'有日期的联系材料',relation:state.index===0?'look-back':cityId==='nyingchi'||state.index===2?'different-place':'same-place',
  relationLabel:state.index===0?'回看已有材料，按环节检查联系':cityId==='nyingchi'?state.index===1?'换到彩门村，检查地方接续':'转到鲁朗，检查越岭与服务':cityId==='lhasa'?state.index===1?'仍在拉萨，分清客运接续':'从抵达接到历史建筑访问':state.index===1?'同一抵达链，接入地面行程':'进入狮泉河，换问公共使用',
  orientation:cityId==='nyingchi'?(state.index===2?'机场、林芝与鲁朗分开；这次按抵达顺序，不按建设年份推进。':state.index===1?'具名采访在彩门村；林芝城区参照不是村址，也不是鲁朗服务用地。':'先读地区铁路联系，后面再换到具体村庄与鲁朗。'):cityId==='lhasa'?'按入口、跨河、访问逐环检查；客站与货场材料仍分别阅读。':'按入口、地面接续、公共使用检查；年份不同，不表示单一事件造成全部变化。',
  next:state.index<2?'继续检查下一环节：地图相连以后，还缺什么才能实际使用？':'把联系和未知条件带到观察；同地继续与跨地区对照可以分别选择。',
 };
 else current={
  place:part.referenceId==='lulang'?'林芝市 · 鲁朗观察窗口':cityId==='lhasa'?'拉萨 · 河谷与历史对象观察':'阿里 · 狮泉河观察窗口',
  period:part.year??'候选观察',relation:'observation',relationLabel:'按观察问题重排，不是历史年表或已核验行程',
  orientation:cityId==='nyingchi'?'鲁朗地物对应鲁朗问题；林芝工布课堂仍是另一地点。':cityId==='lhasa'?'环境、年代、用途分别对应问题；具体对象的访问安排另核验。':'先留在狮泉河；托林与札布让属于另选的跨县历史观察。',
  next:state.index<2?'继续带着同一地方的来路，选择用途或需要核实的条件。':'只保存本人选定的问题与地点，再按日期核实接驳、可达和访问条件。',
 };
 const context=regionalPlaceEvidence.ngari.context;
 const reading=stage==='history'&&cityId==='ngari'&&context?{
  title:'扩展阅读：1965—1966年的狮泉河建城',text:context.text,
  sourceIds:['regional-shiquanhe-city-making-2021'],
  scope:'这是具名回忆的阅读补充，不在当前录音；保留现状地图，不重建旧城或迁移路线。',
 }:undefined;
 return {cueId:part.id,cityId,referenceId:part.referenceId,...current,sourceIds:part.sourceIds,reading};
}
