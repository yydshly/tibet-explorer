import type {SceneSettings} from '../lib/store';
import type {SceneUnderstanding} from './sceneUnderstanding';

/** Authored seasonal conditions and reading stages, not a thermal engineering solver. */
export function railwayEngineeringState(progress:number,season:number){
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 return {progress:p,stage:p<.3?0:p<.68?1:2,cold:season===3,exchange:Math.max(0,Math.min(1,(p-.3)/.38)),operation:Math.max(0,Math.min(1,(p-.68)/.32))};
}

export function railwayUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined{
 if(stepId!=='M1')return;
 const state=railwayEngineeringState(settings.progress,settings.season);
 const objects=[
  {id:'rail-ground',name:'地基与冻土条件',explanation:'轨道下方的剖开区域帮助辨认土体、地下冰与承托关系。它没有对应某个真实工点，不能从这个几何模型读取冻土厚度、含冰量或工程尺寸。'},
  {id:'rail-ice',name:'地下冰与融化风险',explanation:'含冰地层受热后，冰融化可能改变地基体积和承载条件。模型中冰体缩小、试验块降低只表示风险机制，不是青藏铁路某处的实测沉降或预测。'},
  {id:'rail-rock',name:'块石路基与结构空隙',explanation:'块石之间保留空隙，使特定条件下的空气交换成为可能。青藏铁路冻土工程采用多种措施，选择还与地温、含冰情况、季节及具体工点有关，不能把一种通用构造当作全线设计。'},
  {id:'rail-air',name:'冷季条件下的热交换',explanation:'切到冷季条件，蓝色空气标记穿过块石空隙并离开，表示可利用冷空气的散热过程；暖季不播放同样的冷却。箭头和色彩不提供温度、风速或热通量。'},
  {id:'rail-track',name:'得到维护的主通道',explanation:'轨道仍需地基、结构与长期监测共同支撑。2006年全线通车是历史事件，工程原理模型没有还原真实铁路走向、线路坡度或全线安全状态。'},
  {id:'rail-operation',name:'运营服务与使用者',explanation:'车辆到达教学车站，说明线路建成以后还要有运营。真实出行需核对日期、班次、停站和服务条件；列车移动不自动证明每个社区都获得同样影响。'},
  {id:'rail-lastmile',name:'最后一段到达',explanation:'从站点到生活地点还要有可使用的接驳。画面中的步行者和接段解释这层关系，不是已核实的村道、耗时或服务覆盖率。'},
 ];
 const descriptions=[
  '从历史上的联系走到现代交通，先看线路必须落在哪些自然条件上。剖面把地面、地下冰与轨道放在一起：修成一条线，首先需要解决支承与长期维护问题。',
  state.cold?'在冷季教学条件下，空气标记穿过块石空隙，把散热关系显出来。它说明利用冷量需要合适的温度和结构条件；切到暖季，不能继续把同一气流看成必然冷却。':'暖季教学条件没有加入可利用的冷空气。旁侧含冰试验块出现融化和承托变化的风险示意；块石构造本身不能保证任何季节都以同样方式散热，具体表现需要观测与工程计算。',
  '把工程条件带回到达链条：列车进入节点以后，人还需要继续到达生活与访问地点。全线通车、实际运营、末端接驳和社会影响是连续问题，也分别需要相应资料。',
 ];
 const object=objects.find(item=>item.id===picked&&settings.selected===picked);
 return {title:object?.name||['先让主通道落到自然条件上',state.cold?'冷季：空隙中的空气怎样参与散热':'暖季：不能把通风等同于必然冷却','从可建设走向能够使用'][state.stage],explanation:object?.explanation||descriptions[state.stage],objects,lookFor:'在同一剖面比较冷季与暖季，再推进到运营和末端到达。把物理条件、开通事件与实际使用分开核对。',provenance:'冻土与可达条件教学模型 · 非实测地温、沉降、工点设计或当前班次',processLabel:'自然约束 → 条件下的工程措施 → 运营与接驳',stops:[{label:'冻土与支承',progress:.12},{label:'冷热条件对照',progress:.52},{label:'运营与接驳',progress:1}],hasProgress:true,allowsCutaway:false};
}
