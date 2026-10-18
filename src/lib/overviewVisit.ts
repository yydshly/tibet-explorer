import {overviewNarrationCues} from '../data/overviewNarration';
import type {OverviewPresentation,OverviewSceneBeat} from './overviewScene';
import type {NarrationTiming} from './narrationTiming';
import {cityAccessPhaseProgress} from './cityAccessState';

export function overviewVisitPresentation(beat:OverviewSceneBeat,raw:number,timing?:NarrationTiming):OverviewPresentation{
 const cue=overviewNarrationCues.find(c=>c.id==='OVERVIEW-lived-city')!;
 if(beat.text!==cue.narration)throw new Error('城市观察录音与原文不一致');
 const position=Math.max(0,Math.min(1,timing?.textProgress??raw))*beat.text.length;
 const phases=[
  {token:'把前面的认识',phase:'context',title:'带着历史与交通，重看同一座城市',reason:'先保留全域来路，再同时辨认站区、跨河位置与历史城市。'},
  {token:'沿归档的现状道路前进',phase:'crossing',title:'过桥以后，还有城市道路接续',reason:'同一移动标志沿归档相连道路前进；桥梁把两岸联系起来，城市内的下一段并不会因此消失。'},
  {token:'洛桑赤列的采访',phase:'organization',title:'设施需要车辆、劳动与组织',reason:'2019年具名采访记录购车与运输调度。保留同一道路过程，读服务如何通过人的行动持续发生，不定位采访者住所或推断普遍收益。'},
  {token:'到已知路端停下',phase:'street',title:'从城市接续，读回老城的实际使用',reason:'车辆停在源数据路端；街区活动另沿已归档步行街巷呈现，不补画从路端进入寺院的未知路段。'},
  {token:'二〇二五年',phase:'shared',title:'参访空间也是持续使用的生活空间',reason:'2025年委员会鼓励尊重朝圣活动的广场管理。活动标记与现状街巷一起显示使用关系，不模拟实际人数或已实施的管理分区。'},
  {token:'最后拉回河谷与全域',phase:'return',title:'把进入方式、形成历史和今天用途合起来',reason:'回到同一河谷与全域，形成观察问题；这不是已经核验接驳、入口与预约的一日行程。'},
 ] as const;
 let i=0;while(i+1<phases.length&&position>=beat.text.indexOf(phases[i+1].token))i++;
 const part=phases[i],start=beat.text.indexOf(part.token),end=i+1<phases.length?beat.text.indexOf(phases[i+1].token):beat.text.length;
 const progress=Math.max(0,Math.min(1,(position-start)/(end-start))),smooth=(t:number)=>t*t*(3-2*t);
 const motion=i===0?0:i===1?progress*.55:i===2?.55+progress*.45:1;
 const mix=i===0?1-smooth(progress):i===5?smooth(progress):0;
 const streets=i>=3;
 return {sceneIdentity:'atlas-local-context',props:{scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:4,season:1,
  progress:cityAccessPhaseProgress('lhasa','transfer')+.001,selected:'city:lhasa',cutaway:false,comparisonRelief:true,cityLifeServices:true,cityAccessTransfer:true,cityBuiltLayer:false,
  overviewTopic:'observation',overviewLocalContext:true,overviewReturnMix:mix,overviewVisit:{phase:part.phase,progress,motion},
  overviewBarkhor:streets?{phase:i===3?'uses':'protection',progress:i===3?progress:1,motion:i===3?progress:i===4?1-progress*.5:.5}:undefined},
  title:part.title,explanation:part.reason,scale:'西藏全域 → 拉萨站与跨河接续 → 老城使用 → 全域',year:i===4?'2025年管理决定':undefined,
  sourceScope:'2019年柳梧具名采访及2025年UNESCO决定；现状OSM节点、街巷与建筑用于空间阅读。运动为教学标记，不是历史复原、客流数据或已核验的旅游导航。'};
}
