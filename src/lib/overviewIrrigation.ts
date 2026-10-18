import {irrigationCue,irrigationStages,irrigationFeedback,type IrrigationState} from '../data/overviewIrrigation';
import type {NarrationTiming} from './narrationTiming';
import type {OverviewPresentation} from './overviewScene';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function irrigationState(progress:number):IrrigationState{
 const text=irrigationCue.narration,pos=clamp(progress)*text.length;
 let i=0;while(i+1<irrigationStages.length&&pos>=text.indexOf(irrigationStages[i+1].token))i++;
 const stage=irrigationStages[i],start=text.indexOf(stage.token),end=i+1<irrigationStages.length?text.indexOf(irrigationStages[i+1].token):text.length;
 return {phase:stage.phase,progress:clamp((pos-start)/(end-start)),gate:i===2,cleared:i>=2,delivered:i<2?0:i===2?clamp((pos-start)/(end-start)):1,flowing:i===2};
}
export function irrigationPresentation(raw:number,timing?:NarrationTiming):OverviewPresentation{
 const s=irrigationState(timing?.textProgress??raw),stage=irrigationStages.find(v=>v.phase===s.phase)!;
 const t=s.phase==='context'?1-clamp(s.progress/.3):s.phase==='return'?s.progress:0;
 return {sceneIdentity:'atlas-local-context',props:{scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:5,season:1,progress:0,selected:'city:ngari',cutaway:false,overviewLocalContext:true,overviewTopic:'life',overviewIrrigation:s,overviewReturnMix:t*t*(3-2*t)},title:stage.title,explanation:s.phase==='context'?'盆地地形提供空间，秋季水分条件使林地仍需冬灌；2023年报道记录了设施与管护工作。':s.phase==='return'?'同样的自然条件，需要人的持续行动；再进入历史用途的形成。':irrigationFeedback(s),scale:s.phase==='context'?'西藏全域 → 狮泉河盆地':s.phase==='return'?'狮泉河盆地 → 西藏全域':'狮泉河 · 同一地形上的灌渠与城镇',year:'2023年报道 · 现状地图',sourceScope:'真实地形和OSM渠线；通水、补水量为原理示意。未测绘闸口与灌区，地图林地不认定为报道作业地块；不代表家庭用水或实测流向。'};
}
