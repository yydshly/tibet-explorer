import {chapters} from '../data/curriculum';
import {learningStepIds} from '../data/learningOrder';
import {atlasLocationForStep,detailHash,type AtlasLocation} from './spatialJourney';

const params=(hash:string)=>new URLSearchParams(hash.split('?')[1]||'');
export const isGuidedJourney=(hash:string)=>params(hash).get('journey')==='guided';

/** A mainline route opens the explanation while retaining its real map context. */
export function guidedJourneyHash(chapterId:string,stepId:string,origin?:AtlasLocation):string{
 const base=['G1','G2'].includes(stepId)?`/learn/${chapterId}/${stepId}`:detailHash(chapterId,stepId,origin||atlasLocationForStep(stepId));
 return `${base}${base.includes('?')?'&':'?'}journey=guided`;
}

export function nextGuidedQuestion(stepId:string){
 const index=learningStepIds.indexOf(stepId),id=index<0?undefined:learningStepIds[index+1];
 if(!id)return undefined;
 const chapter=chapters.find(item=>item.steps.some(step=>step.id===id));
 const step=chapter?.steps.find(item=>item.id===id);
 return chapter&&step?{chapter,step}:undefined;
}

export function mainlineConnection(stepId:string):{context:string;next:string}{
 const index=learningStepIds.indexOf(stepId);
 const group=stepId.charAt(0);
 const contexts:Record<string,string>={
  G:'先保留地球与亚洲的整体，再解释这片高地的位置、形成与起伏。',
  C:'把已经认识的位置与地形带进来，分开理解热量、空气、水分和时间尺度。',
  E:'把气候与地形原理带回不同地区，比较条件，再看人的活动。',
  P:'用地形、水和时间解释景观；地方生活还需要具体的社会与历史材料。',
  K:'环境提供条件；建筑、工艺、信仰与生活还由交流、用途和历史共同塑造。',
  H:'把地方与文化带入时间线，分开阅读发生的事件与留下的证据。',
  R:'带着环境与历史的认识，理解水、交通、人员和知识怎样联系周边。',
  M:'从联系进入今天的生活，结合服务条件、地方差异和保护讨论发展。',
  T:'把前面的环境、文化与历史认识组织成主题路线，再查实际出行条件。',
 };
 const next=nextGuidedQuestion(stepId);
 const transitions:Record<string,string>={
  G1:'已经认识海陆、大气、冷暖与环流，接下来找到西藏，再看哪些条件在这里共同起作用。',
  G2:'知道外部联系以后，再追问高原与山系本身怎样形成。',
  G3:'形成原理说明了过程；接下来用真实高程阅读今天的起伏。',
  G4:'已有真实高差参照，接下来从地球跟随来流进入高原，在同一地形上看抬升、云雨与地区差异。',
  C4:'保留所选城市与地区的位置，把来路、地形和云雨认识接到水源、土地、通行与地方生活。',
  C5:'从空气中的水到地表去向，再分清一次天气的先后与多年气候背景。',
  E3:'水源要经过取用、携带和储存才接到生活；回到真实地形，辨认这些行动面对的空间条件。',
  K2:'1042年的行旅与译写解释交流；接下来用约12世纪早期的木经板，认识文本怎样被制作和保护。',
  K3:'载体需要保护，表演也需要人持续学习与实践；用藏戏资料认识参与者、场地和传承机会。',
  C9:'观测记录说明变化的证据；回到地区比较，避免用一处代表整个西藏。',
  E2:'地区条件不同，人的居住与生产又怎样利用并改变这些条件？',
  P3:'从地方生活继续看建筑、信仰、工艺与社区，避免把文化只归因于气候。',
  K4:'列入名录的日期不是文化起源年；接下来区分活动、实物与记录的时间，学习怎样从证据认识历史。',
  H4:'有了历史背景，再看今天西藏与周边的联系和共同议题。',
  R1:'水由汇流连接上下游，人的往来还需要通行、接待和交流；接下来读阿底峡与托林。',
  R2:'从具体交流行动走到共同环境，用色东普研究辨认过程、信息与响应责任。',
  R3:'联系怎样影响生活，还要进入交通、公共服务和生态保护的具体条件。',
  M1:'工程支撑通道，接下来用拉林铁路与彩门村访谈认识怎样进入居民生活。',
  M2:'从不同人的使用条件，继续看拉萨遗产如何照顾实物、历史环境与日常需要。',
  M3:'把环境、地方生活、历史与保护带进路线选择，让旅行成为一次有主题的认识。',
  T1:'先有自己的问题，再让前后两站共同推进认识；实际到达还需主通道、接驳和访问条件。',
  T2:'保留候选顺序与每站目的，补充已有条件和待核实事项，保存后从同一问题继续。',
 };
 return {context:contexts[group]||contexts.G,next:transitions[stepId]||(next?`沿着这个问题，继续认识：${next.step.question}`:index>=0?'整理这一程的认识，保留材料与自己的主题路线。':'从地球上的位置开始。')};
}
