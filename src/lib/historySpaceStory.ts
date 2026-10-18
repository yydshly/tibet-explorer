import {historySpaceStory} from '../data/historySpaceStory';
import {overviewHeritageLessons,overviewHeritagePresentation} from './overviewHeritageScene';
import type {OverviewPresentation} from './overviewScene';
import type {NarrationTiming} from './narrationTiming';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export const historySpaceStages=[
 {token:'带着历史问题',phase:'context',title:'从全域进入一个有据的街区',reason:'先找到拉萨河谷，再进入大昭寺周围，整体来路不会丢失。'},
 {token:'大昭寺创建于',phase:'context',title:'始建年代与现状空间分别看',reason:'七世纪创建是历史事实；当前建筑、广场和街巷是现状地物，不是七世纪复原。'},
 {token:'先看寺院与前方广场',phase:'context',title:'场所之外，还需要抵达和停留',reason:'寺院与前方广场一起进入画面，观察封闭建筑与开放空间怎样相邻。'},
 {token:'接着沿步行街巷',phase:'streets',title:'通行把建筑与街区接起来',reason:'青色街面沿归档道路逐段展开，金色标记沿同一段路径移动；断开的源线不会被补接。'},
 {token:'再把周边商业用地',phase:'uses',title:'同一街区承载多种使用',reason:'保留已展开的通行空间，再显示商业用地内的现状建筑；不把每栋建筑认定为商铺。'},
 {token:'二〇〇〇年',phase:'designation',title:'2000：列入是保护事件，不是建成年代',reason:'大昭寺扩展列入世界遗产，现状街区保持不变，不能按年份虚构街区生长。'},
 {token:'二〇二一年',phase:'protection',title:'2021：保护要求指向人的通行',reason:'广场和步行通道同时保留：要求照顾祈祷通行与参访之间的关系；不模拟管理措施已经落实。'},
 {token:'最后退回拉萨河谷',phase:'return',title:'街区 → 河谷 → 全域',reason:'把地方的形成、使用和保护带回整体，再理解交通怎样接入已有城市。'},
] as const;
export function historySpacePresentation(raw:number,timing?:NarrationTiming):OverviewPresentation{
 const text=historySpaceStory.narration,position=clamp(timing?.textProgress??raw)*text.length;
 let index=0;while(index+1<historySpaceStages.length&&position>=text.indexOf(historySpaceStages[index+1].token))index++;
 const stage=historySpaceStages[index],start=text.indexOf(stage.token),end=index+1<historySpaceStages.length?text.indexOf(historySpaceStages[index+1].token):text.length,progress=clamp((position-start)/Math.max(1,end-start));
 const lesson=overviewHeritageLessons[0],held=overviewHeritagePresentation({id:lesson.id,title:lesson.title,recordingId:lesson.id,text:lesson.narration},1);
 const returning=stage.phase==='return';
 return {...held,sceneIdentity:'atlas-local-context',props:{...held.props,overviewLocalContext:true,overviewTopic:'culture',overviewYear:undefined,
  overviewReturnMix:index===0?1-smooth(progress):returning?smooth((progress-.2)/.8):0,
  overviewBarkhor:{phase:stage.phase,progress:index===1||index===2?1:progress,motion:index<3?0:index===3?progress:1}},
  title:stage.title,explanation:stage.reason,year:index===5?'2000年列入':index===6?'2021年管理要求':undefined,
  scale:index===0?'西藏全域 → 拉萨河谷 → 街区':returning?'街区 → 拉萨河谷 → 西藏全域':'拉萨 · 大昭寺、广场与周围街区',
  sourceScope:'UNESCO建筑创建与列入资料、2021年44 COM 7B.20第7项；现状OSM地物。动画逐段释读空间关系，不是历史营建、真实客流或管理效果的模拟。'};
}
