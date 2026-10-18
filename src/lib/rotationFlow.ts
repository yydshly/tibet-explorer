import {rotationFlowCue,type RotationFlowState,type RotationPhase} from '../data/rotationFlow';
import type {NarrationTiming} from './narrationTiming';

export const ROTATION_MODEL={startLatitude:20,endLatitude:40,longitude:62,durationSeconds:21600,omega:7.292115e-5,radiusMetres:6371000} as const;
const rad=Math.PI/180,clamp=(v:number)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
/** Axial angular momentum, with prescribed constant meridional speed and no
 * zonal torque. This is an analytical teaching experiment, NOT a wind field.
 * λ-λ0 = ΩT[cos²φ0 (tanφ-tanφ0)/(φ1-φ0) - t].
 * Both modes have the SAME latitude/time. No hand-drawn bend or added force. */
export function rotationSample(progress:number,enabled=true,direction:RotationFlowState['direction']='north'){
 const t=clamp(progress),{startLatitude,endLatitude,longitude,durationSeconds:T,omega:earthOmega,radiusMetres:a}=ROTATION_MODEL;
 const phi0=(direction==='north'?startLatitude:endLatitude)*rad,phi1=(direction==='north'?endLatitude:startLatitude)*rad;
 const phi=phi0+(phi1-phi0)*t,omega=enabled?earthOmega:0;
 const momentum=omega*a*a*Math.cos(phi0)**2;
 const zonal=omega*a*(Math.cos(phi0)**2/Math.cos(phi)-Math.cos(phi));
 const delta=omega*T*(Math.cos(phi0)**2*(Math.tan(phi)-Math.tan(phi0))/(phi1-phi0)-t);
 return {latitude:phi/rad,longitude:longitude+delta/rad,deltaLongitude:delta/rad,zonal,
  meridional:a*(phi1-phi0)/T,groundEastSpeed:omega*a*Math.cos(phi),momentum};
}

const plan:[string,RotationPhase][]=[['受热差异','pressure'],['先看同一地球','latitude'],['让空气向北移动','baseline'],['加入自转','rotation'],['右是相对','direction'],['这里固定','limits'],['回到亚洲','arrival']];
export function rotationNarratedState(timing?:NarrationTiming):RotationFlowState{
 const text=rotationFlowCue.narration,at=clamp(timing?.textProgress??0)*text.length;
 const start=(token:string)=>text.indexOf(token),interval=(a:string,b:string)=>clamp((at-start(a))/(start(b)-start(a)));
 let index=0;while(index+1<plan.length&&at>=start(plan[index+1][0])-1e-7)index++;
 const phase=plan[index][1];
 return {phase,progress:phase==='pressure'?interval('受热差异','先看同一地球'):phase==='baseline'?interval('让空气向北移动','加入自转'):phase==='rotation'?interval('加入自转','右是相对'):phase==='direction'&&at>=start('向南时')?interval('向南时','这里固定'):1,
  enabled:phase!=='baseline',direction:at>=start('向南时')?'south':'north',latitudeProgress:interval('先看同一地球','让空气向北移动'),
  cameraMix:smooth(interval('让空气向北移动','加入自转')),
  arrivalProgress:phase==='arrival'?clamp((at-start('回到亚洲'))/(text.length-start('回到亚洲'))):0};
}
export function rotationManualState(state:RotationFlowState,patch:Partial<Pick<RotationFlowState,'enabled'|'direction'|'progress'>>):RotationFlowState{
 return {...state,phase:'rotation',cameraMix:1,arrivalProgress:0,latitudeProgress:1,...patch,progress:clamp(patch.progress??state.progress)};
}
export function rotationFeedback(state:RotationFlowState){
 if(state.progress<.015)return '起点两条路径重合。向前拖动，再保持进度切换自转项。';
 if(!state.enabled)return '去掉自转项：同样的南北运动沿经线前进。虚线保留作参照；这不是让现实地球停止。';
 return state.direction==='north'?'向北移动：空气保留绕地轴的角动量，相对更高纬的地面向东超前。实线离开虚线，向前进方向右偏。':'向南移动：相对更低纬的地面，空气向东运动落后，路径向西偏；向南看，西侧仍是右侧。';
}
export function rotationDescription(state:RotationFlowState){
 return ({pressure:'气压差推动运动；自转改变运动的方向。',latitude:'低纬绕行圈更大；转过相同角度，低纬地面走过更长距离。',baseline:'同一个起点和南北运动，先去掉自转项建立参照。',rotation:rotationFeedback(state),direction:'右侧相对于前进方向；可切到向南对照。',limits:'固定南北运动、无东西向力矩；不是实际天气或完整环流模型。',arrival:'试验轨迹已经收起；西侧与南侧来流是另一层概念联系，接着读高原形成与抬升。'} as const)[state.phase];
}
export function rotationTargets(state:RotationFlowState):string[]{
 if(state.phase==='arrival')return ['central-asia','indian-ocean',state.arrivalProgress>.35?'plateau':'tibet'];
 if(state.phase==='pressure')return ['rotation-high','rotation-low'];
 if(state.phase==='latitude')return ['rotation-lower','rotation-upper'];
 return ['rotation-parcel','rotation-reference',...(state.enabled&&state.progress>.02?['rotation-difference']:[])];
}
