import type {OverviewPresentation} from './overviewScene';
import {rotationFlowCue,type RotationFlowState} from '../data/rotationFlow';
import {rotationDescription,rotationTargets} from './rotationFlow';

export function rotationPresentation(state:RotationFlowState):OverviewPresentation{
 const arrival=state.phase==='arrival',title=({pressure:'先有推动空气的气压差',latitude:'同一角速度，不同向东速度',baseline:'先去掉自转项，建立参照',rotation:!state.enabled?'去掉自转：保留相同南北运动':state.direction==='south'?'向南：相对地面向西右偏':'向北：相对地面向东右偏',direction:'前进方向变了，右侧也随之改变',limits:'这次对照说明什么',arrival:'从水平偏转，转向高地的影响'} as const)[state.phase];
 const explanation=rotationDescription(state);
 return {sceneIdentity:'journey:G1',title,explanation,
  scale:arrival?'亚洲与西藏 · 来流联系':state.cameraMix>.5?'北半球 · 地面参照下的气流对照':'完整地球 · 纬度与自转',
  sourceScope:'原理模型：指定20°N与40°N之间的南北运动，忽略摩擦与东西向力矩；并非实测风场或真实西藏来流。',
  props:{scene:'earth',viewKey:'G1',layer:arrival?'moisture':'earth-circulation',step:0,season:1,progress:state.progress,selected:'',cutaway:false,rotationFlow:state,
   guide:{active:true,cueId:rotationFlowCue.id,beatId:state.phase,phraseId:`${rotationFlowCue.id}:${state.phase}`,targets:rotationTargets(state),progress:state.progress,drawProgress:arrival?Math.min(1,state.arrivalProgress*3):1,relation:'compare',title,explanation}},
 };
}
