import {chapters} from '../data/curriculum';
import type {CityComparisonStageId} from '../data/cityComparison';
import {getCityOverview} from '../data/cityOverview';
import {isTopicJourney,recognitionStepIds} from './topicJourney';
import {atlasHash,cityAtlasLocation,detailOrigin,parseAtlasLocation} from './spatialJourney';
import {guidedJourneyHash} from './guidedJourney';
import {parseRoute} from './store';

export type RecognitionQuestionId='earth'|'position'|'climate'|'life'|'history'|'connections'|'travel';
export interface RecognitionNavigation {
  hash:string;
  label:string;
  kind:'introduction'|'comparison'|'map'|'return';
  comparisonStage?:CityComparisonStageId;
}
export interface RecognitionQuestion {
  id:RecognitionQuestionId;
  label:string;
  question:string;
  carry:string;
  reason:string;
  stepIds:readonly string[];
  entryStepId?:string;
  comparisonStage?:CityComparisonStageId;
}

/** These are the questions already shared by the introduction, city map and
 * detailed topics. They do not constitute another completion/progress store. */
export const recognitionQuestions:readonly RecognitionQuestion[]=[
  {id:'earth',label:'地球与整体环境',question:'地球上有什么，空气与水怎样运行？',carry:'海陆、受热、空气与水的输送，为理解地方差异提供背景。',reason:'带着整体环境的认识，在地球上找到西藏与周边。',stepIds:['G1','C1','C2','C6','C7','C8'],entryStepId:'G1'},
  {id:'position',label:'位置与高原形成',question:'西藏在哪里，今天的高原怎样形成？',carry:'保留亚洲、中国、西藏与周边，再用形成原理和真实高程认识这片高地。',reason:'知道位置与高差以后，追踪空气来到这里怎样被山地改变。',stepIds:['G2','G3','G4'],entryStepId:'G2'},
  {id:'climate',label:'气候与地区差异',question:'同在高原，为什么各地的环境不同？',carry:'将来流、抬升、云雨和地表起伏放回同一地图，比较不同地区的条件。',reason:'把气候与地形带进通行、取水和城市空间，认识条件怎样进入生活。',stepIds:['C3','C4','C5','C9','E1','E2','P1','P2'],comparisonStage:'climate'},
  {id:'life',label:'城市与地方生活',question:'地形和水怎样影响通行、用水与城市？',carry:'三地保留同一地形参照，区分自然条件、设施、组织与人的选择。',reason:'生活并非只由环境决定；继续用具体人物、实物和事件理解文化与历史。',stepIds:['E3','P3'],comparisonStage:'mobility'},
  {id:'history',label:'文化与历史',question:'人的行动怎样留下文化和地方历史？',carry:'从具体地点、人物、事件与材料认识交流和改变，把日期与证据相互核对。',reason:'带着地方历史，看铁路、机场和周边联系怎样进入今天的城市生活。',stepIds:['K1','K2','K3','K4','H1','H2','H3','H4'],comparisonStage:'history'},
  {id:'connections',label:'今天与周边联系',question:'通道开通以后，怎样接上地方与生活？',carry:'将工程、实际接续、使用与保护分开阅读，再用具体地方材料讨论影响。',reason:'把前面的认识转成现场能观察的问题，再核实实际到达与访问条件。',stepIds:['R1','R2','R3','M1','M2','M3'],comparisonStage:'development'},
  {id:'travel',label:'带着理解去观察',question:'到具体地方看什么，怎样核实才能到达？',carry:'观察地形、道路、公共空间与文化用途，保留问题、出处及待核实条件。',reason:'回看支撑问题的环境与历史材料，让观察继续完善自己的认识。',stepIds:['T1','T2','T3'],comparisonStage:'travel'},
];

const comparisonOrder:CityComparisonStageId[]=['climate','terrain','mobility','water','settlement','history','development','connections','travel'];
const comparisonQuestion:Record<CityComparisonStageId,RecognitionQuestionId>={climate:'climate',terrain:'climate',mobility:'life',water:'life',settlement:'life',history:'history',development:'connections',connections:'connections',travel:'travel'};
const comparisonNames:Record<CityComparisonStageId,string>={climate:'气候来流',terrain:'高程起伏',mobility:'怎样通行',water:'怎样用水',settlement:'城市空间',history:'文化历史',development:'现代发展',connections:'周边联系',travel:'旅行观察'};
const comparisonReasons:Record<CityComparisonStageId,string>={
  climate:'空气经过的地面也不同；接着用共同海拔基准比较三地起伏。',
  terrain:'高差需要面对，通道需要建设；接着看山地怎样影响通行。',
  mobility:'能够通行，还要取得可用的水；接着比较三地取水与用水条件。',
  water:'通行与水源共同进入居住安排；接着看河谷与城市空间。',
  settlement:'相同地形并不会自动产生同一种文化；接着读具体人的行动与历史材料。',
  history:'可沿当前地方继续；按主题播放则逐地对照，再从林芝进入交通发展。',
  development:'主通道到达之后还需要接续；接着分清区域联系与实际地方通行。',
  connections:'带着已知通道和地方用途，继续组织可核实的观察问题。',
  travel:'观察遇到新问题时，回到同一地方的环境和历史解释核对。',
};
const allSteps=chapters.flatMap(chapter=>chapter.steps.map(step=>({chapter,step})));
const comparisonCities=new Set(['nyingchi','lhasa','ngari']);
const questionForStep=(stepId:string)=>recognitionQuestions.find(question=>question.stepIds.includes(stepId));
const questionForFacet=(facet:string|undefined):RecognitionQuestionId=>facet==='history'?'history':facet==='today'?'connections':facet==='environment'?'climate':'position';
const cleanHash=(hash:string)=>hash.replace(/^#/,'');

/** Comparison stages deliberately share an atlas hash. A snapshot return to
 * that map and a next-stage seek are different actions and must both survive. */
export function sameRecognitionDestination(first:RecognitionNavigation|undefined,second:RecognitionNavigation|undefined):boolean {
  return Boolean(first&&second&&first.kind===second.kind&&first.comparisonStage===second.comparisonStage&&cleanHash(first.hash)===cleanHash(second.hash));
}

function stepTarget(id:string,label?:string):RecognitionNavigation {
  const item=allSteps.find(item=>item.step.id===id)!;
  return {hash:guidedJourneyHash(item.chapter.id,id),label:label||item.step.title,kind:'introduction'};
}

/** A three-city continuation keeps the chosen place. The other four regions
 * stay in their actual overview instead of silently becoming Nyingchi. */
export function recognitionQuestionTarget(questionId:RecognitionQuestionId,cityId='nyingchi'):RecognitionNavigation {
  const question=recognitionQuestions.find(item=>item.id===questionId)!;
  if(question.entryStepId)return stepTarget(question.entryStepId,question.label);
  const chosen=getCityOverview(cityId)?.id||'nyingchi';
  const facet=questionId==='history'?'history':questionId==='connections'||questionId==='travel'?'today':'environment';
  if(!comparisonCities.has(chosen))return {hash:atlasHash(cityAtlasLocation(chosen,facet,false)),label:`${getCityOverview(chosen)!.name} · ${question.label}`,kind:'map'};
  return {hash:atlasHash(cityAtlasLocation(chosen,'environment',true)),label:question.label,kind:'comparison',comparisonStage:question.comparisonStage};
}

function comparisonTarget(stage:CityComparisonStageId,cityId:string):RecognitionNavigation {
  return {hash:atlasHash(cityAtlasLocation(comparisonCities.has(cityId)?cityId:'nyingchi','environment',true)),label:`三地同图：${comparisonNames[stage]}`,kind:'comparison',comparisonStage:stage};
}

export interface RecognitionRouteInput {
  hash:string;
  /** Pass the director's actual stage; it is deliberately not guessed from G4
   * in the atlas URL, which is shared by every comparison stage. */
  comparisonStage?:CityComparisonStageId;
  cityId?:string;
  /** Supply an existing exploration/review return. The component never saves
   * an origin or invents playback state. `kind: return` lets the host restore it. */
  returnContext?:Omit<RecognitionNavigation,'kind'>;
}
export interface RecognitionRouteState {
  mode:'home'|'introduction'|'comparison'|'city'|'topic-map'|'detail';
  question?:RecognitionQuestion;
  place:string;
  cityId?:string;
  modeLabel:string;
  focus:string;
  role:string;
  returnTarget?:RecognitionNavigation;
  next?:RecognitionNavigation;
  nextReason:string;
}

export function resolveRecognitionRoute(input:RecognitionRouteInput):RecognitionRouteState {
  const hash=cleanHash(input.hash),route=parseRoute(hash),atlas=parseAtlasLocation(hash);
  const isDetail=/^\/?learn\/[^/]+\/[^/]+\/detail(?:\?|$)/.test(hash);
  const origin=!route.home?detailOrigin(hash,route.step):undefined;
  const cityId=input.cityId||atlas?.cityId||origin?.cityId||'nyingchi';
  const city=getCityOverview(cityId),place=city?.name||'西藏';
  const explicitReturn=input.returnContext?{...input.returnContext,kind:'return' as const}:undefined;
  if(route.home&&!atlas)return {mode:'home',place:'西藏',modeLabel:'整体认识来路',focus:'从地球整体到具体地方，让每个专题回答同一条来路上的问题。',role:'开篇建立共同背景；三地同图比较地方；深入专题解释原因，之后回到原来的地图。',returnTarget:explicitReturn,next:stepTarget('G1','从地球开始'),nextReason:'先认海陆与空气怎样运行，再逐层找到西藏。'};

  if(atlas?.view==='cities'){
    const comparison=input.comparisonStage&&comparisonCities.has(cityId)&&atlas.compare!==false?input.comparisonStage:undefined;
    const question=recognitionQuestions.find(item=>item.id===(comparison?comparisonQuestion[comparison]:questionForFacet(atlas.facet)))!;
    const nextStage=comparison?comparisonOrder[comparisonOrder.indexOf(comparison)+1]:undefined;
    const nextQuestion=recognitionQuestions[recognitionQuestions.findIndex(item=>item.id===question.id)+1];
    return {mode:comparison?'comparison':'city',question,place,cityId,modeLabel:comparison?`三地同图 · ${comparisonNames[comparison]}`:`${place}与周边 · 地区阅读`,focus:question.question,
      role:comparison?'当前主题在同一地图比较林芝、拉萨、阿里；局部放大仍要保留区域来路。':'先保留城市与周边的整体，再选择环境、历史和今天；具体原理可按问题深入。',returnTarget:explicitReturn,
      next:nextStage?comparisonTarget(nextStage,cityId):nextQuestion?recognitionQuestionTarget(nextQuestion.id,cityId):recognitionQuestionTarget('climate',cityId),
      nextReason:comparison?comparisonReasons[comparison]:question.reason};
  }

  const stepId=route.home?atlas!.questionId:route.step;
  const item=allSteps.find(item=>item.step.id===stepId)!;
  const question=questionForStep(stepId)!;
  const introductory=recognitionStepIds.includes(stepId as typeof recognitionStepIds[number])&&!isTopicJourney(hash)&&origin?.view!=='cities';
  const mode:RecognitionRouteState['mode']=atlas?'topic-map':introductory?'introduction':'detail';
  const introIndex=recognitionStepIds.indexOf(stepId as typeof recognitionStepIds[number]);
  const nextIntro=recognitionStepIds[introIndex+1];
  const inferredReturn=mode==='detail'&&isDetail&&origin?{hash:atlasHash(origin),label:origin.view==='cities'?`回到${place}与周边的整体地图`:'回到这个问题的整体地图',kind:'return' as const}:undefined;
  const returnTarget=explicitReturn||inferredReturn;
  const next=mode==='introduction'?(nextIntro?stepTarget(nextIntro):comparisonTarget('climate',cityId)):returnTarget||recognitionQuestionTarget(question.id,cityId);
  const nextReason=mode==='introduction'?(stepId==='G1'?'把海陆与空气的整体认识带到亚洲、中国和西藏。':stepId==='G2'?'找到位置与外部联系后，继续追问这片高地怎样形成。':stepId==='G3'?'形成原理说明过程；接着用真实高程认识今天的高差。':stepId==='G4'?'有了真实高差参照，接着跟随气流进入高原，解释抬升与云雨。':'把来流与地形原理放回三地同图，继续比较环境怎样进入生活。'):
    `把「${item.step.title}」的认识带回整体地图，继续追问：${question.question}`;
  return {mode,question,place:origin?.cityId?place:'西藏',cityId:origin?.cityId,modeLabel:mode==='introduction'?'开篇 · 地球到高原':mode==='topic-map'?'整体地图 · 专题来路':`深入专题 · ${item.chapter.shortTitle}`,focus:item.step.question,
    role:mode==='introduction'?'这段建立共同背景；后面在同一地区地图连接气候、生活、历史与今天。':mode==='topic-map'?'地图说明专题位于哪里；进入演示解释原因，再回到同一地点。':`这段展开「${question.label}」里的一个问题；它的结果要带回地方比较。`,returnTarget,next,nextReason};
}
