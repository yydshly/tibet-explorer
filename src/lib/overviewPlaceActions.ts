import {overviewPlaceActions,jokhangProtectionCue,type PlaceActionState} from '../data/overviewPlaceActions';
import {overviewHeritageLessons,overviewHeritagePresentation} from './overviewHeritageScene';
import type {NarrationTiming} from './narrationTiming';
import type {OverviewPresentation} from './overviewScene';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export const placeActionStages=[
 {token:'从西藏全域',phase:'context',title:'全域 → 河谷 → 活动空间',reason:'历史不仅解释建筑年代，也解释今天的活动为何这样安排。'},
 {token:'先看大昭寺',phase:'lamps',title:'2005年记录：多数供灯迁出木构',reason:'金色灯光只说明供灯与建筑的关系；这是监测报告所见，不是已知的工程竣工日期。'},
 {token:'现在分开供灯与木构',phase:'separate',title:'活动延续，供灯空间重新安排',reason:'建筑上多数灯光退去，寺前独立示意亮起。解释火源与木构分开，不计算火灾风险；未取得供灯室测绘。'},
 {token:'再沿同一座城市',phase:'square',title:'2005年记录：公共空间与搬迁同看',reason:'报告记载142户、9家机构搬迁与广场公共休憩用途。现状轮廓不能倒推原住户位置或搬迁去向。'},
 {token:'让使用活动进入广场',phase:'public',title:'公共地面承载行走与停留',reason:'活动符号在现状广场内展开，说明公共使用。数量、路径与速度均为示意，不是客流调查或搬迁模拟。'},
 {token:'最后退回河谷',phase:'return',title:'局部变化 → 城市 → 全域',reason:'保护与公共使用改变生活的安排；下一步看新交通怎样接入这些已有用途。'},
] as const;
export const jokhangProtectionStages=[
 {token:'回到拉萨',phase:'context',title:'全域 → 拉萨 → 大昭寺',reason:'接续营建与交流：已有场所怎样在保护中继续被使用？'},
 {token:'先看原有关系',phase:'lamps',title:'调整前的关系：供灯与木构共处',reason:'只对照报告所述的使用关系，不复原2005年室内灯位。'},
 {token:'现在分开供灯与木构',phase:'separate',title:'报告记录的调整：多数供灯转至寺前',reason:'多数灯光退出木构，寺前供灯示意亮起；供灯活动保留，火源与木构分开。'},
 {token:'最后退回全域',phase:'return',title:'活动延续，空间调整 → 现代联系',reason:'回到同一河谷和全域：新交通接入的是已有历史用途与生活。'},
] as const;
export function placeActionState(textProgress:number,core=false):PlaceActionState {
 const text=core?jokhangProtectionCue.narration:overviewPlaceActions.narration,pos=clamp(textProgress)*text.length;
 const stages=core?jokhangProtectionStages:placeActionStages;
 let i=0;while(i+1<stages.length&&pos>=text.indexOf(stages[i+1].token))i++;
 const stage=stages[i],start=text.indexOf(stage.token),end=i+1<stages.length?text.indexOf(stages[i+1].token):text.length;
 const progress=clamp((pos-start)/(end-start));
 const separateStart=text.indexOf('现在分开供灯与木构'),separateEnd=text.indexOf(core?'供灯继续':'活动仍然延续');
 return {phase:stage.phase,progress,separation:clamp((pos-separateStart)/(separateEnd-separateStart)),activity:core||i<4?0:clamp(progress*3),...(core?{caseId:'jokhang' as const}:{})};
}
export function placeActionPresentation(raw:number,timing?:NarrationTiming,core=false):OverviewPresentation {
 const state=placeActionState(timing?.textProgress??raw,core),stage=(core?jokhangProtectionStages:placeActionStages).find(s=>s.phase===state.phase)!;
 const first=overviewHeritageLessons[0],held=overviewHeritagePresentation({id:first.id,title:first.title,recordingId:first.id,text:first.narration},1);
 return {...held,sceneIdentity:'atlas-local-context',props:{...held.props,overviewLocalContext:true,overviewTopic:'culture',overviewYear:undefined,
 overviewPlaceAction:state,overviewReturnMix:state.phase==='context'?1-smooth(state.progress):state.phase==='return'?smooth((state.progress-.2)/.8):0,
 overviewUrban:{phase:state.phase==='context'?'context':state.phase==='return'?'return':['square','public'].includes(state.phase)?'plaza':'barkhor',progress:state.phase==='lamps'?state.progress:state.phase==='square'||state.phase==='return'?state.progress:1,year:2005,showChange:false}},
 title:stage.title,explanation:stage.reason,year:'2005年监测记录',scale:state.phase==='context'?'西藏全域 → 拉萨河谷':state.phase==='return'?'拉萨河谷 → 西藏全域':'同一张拉萨地图 · 历史场所与公共生活',
 sourceScope:'UNESCO / ICOMOS 2005年报告第3页；地物为现状OSM。供灯空间仅示意寺前关系；未复原木构内部分区、半地下室、消防通道或搬迁前后的地块。活动标记非人数、路线、速度或风险测量。'};
}
