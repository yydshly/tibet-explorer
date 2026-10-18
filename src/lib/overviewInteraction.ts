import {climateLabCue,climateLabNarratedProgress,type ClimateLabState} from '../data/climateLab';
import {climateObservationNarrationStation} from '../data/climateObservationNarration';
import {climateObservationReading} from '../data/climateObservations';
import type {NarrationTiming} from './narrationTiming';
import {climateAirAppearance,type ClimateLabReading} from './climateLabProcess';

export const overviewInteractionStates:Readonly<Record<string,ClimateLabState>>=Object.fromEntries([
 {stage:'air',moisture:'higher'},
 {stage:'evidence',month:7},{stage:'evidence',month:1},
 {stage:'life',city:'nyingchi'},{stage:'life',city:'lhasa'},{stage:'life',city:'ngari'},
].map(patch=>{
 const state:ClimateLabState={progress:0,moisture:'higher',city:'nyingchi',month:7,zoom:false,direction:'north-south',...patch} as ClimateLabState;
 return [climateLabCue(state).id,state];
}));

/** The main director's exact word clock owns both camera and probe. Manual
 * state is a paused snapshot, never a second narration or simulation clock. */
export function overviewInteractionState(id:string,text:string,timing?:NarrationTiming):ClimateLabState|undefined {
 const initial=overviewInteractionStates[id];if(!initial)return;
 // Stabilize exact word boundaries after normalized-offset multiplication.
 const at=timing?.textProgress??0,position=Math.round(at*text.length*1e7)/1e7;
 const enter=text.indexOf('再沿同一张地图拉近'),leave=text.indexOf('回到全域');
 const land=text.indexOf('青色地面标出');
 const probe=text.indexOf('移动探针'),turn=text.indexOf('切换剖面方向');
 const life=initial.stage==='life'&&probe>=0&&turn>probe&&land>turn;
 const progress=life?(position<probe?0:position<turn?(position-probe)/(turn-probe):position<land?(position-turn)/(land-turn):1):climateLabNarratedProgress(text,at);
 // Focus uses the same spoken-word position as the parcel. Manual snapshots
 // preserve it across moisture changes; no timer or moisture-dependent camera.
 const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
 const approach=text.indexOf('沿剖面向北移动'),close=text.indexOf('抬升时'),returnAt=text.indexOf('实际结果还受'),wholeAt=text.indexOf('现在保持同一地形');
 const airFocus=initial.stage==='air'&&approach>=0&&close>approach&&returnAt>close&&wholeAt>returnAt
  ?smooth((position-approach)/(close-approach))*(1-smooth((position-returnAt)/(wholeAt-returnAt))):undefined;
 const closeLife=text.indexOf('先看地面起伏'),afterReturn=text.indexOf('，',leave);
 const lifeFocus=life&&enter>=0&&closeLife>enter&&leave>closeLife
  ?smooth((position-enter)/(closeLife-enter))*(1-smooth((position-leave)/Math.max(1,(afterReturn>leave?afterReturn:leave+5)-leave))):undefined;
 return {...initial,progress,airFocus,lifeFocus,direction:life&&position>=turn?'east-west':'north-south',landReveal:land>=0?Math.max(0,Math.min(1,(position-land)/18)):0,zoom:initial.stage==='life'&&enter>=0&&leave>enter&&position>=enter&&position<leave};
}
/** Manual zoom overrides the recorded mix; a probe/direction comparison keeps it. */
export function overviewInteractionPatch(state:ClimateLabState,patch:Partial<ClimateLabState>):ClimateLabState {
 return {...state,landReveal:state.stage==='life'?1:0,...patch,
  ...(state.stage==='life'&&patch.zoom!==undefined?{lifeFocus:patch.zoom?1:0}:{})};
}
export function overviewInteractionStation(state:ClimateLabState,text:string,id:string,timing?:NarrationTiming){
 return state.stage==='evidence'?climateObservationNarrationStation(state.month,{cue:{id,text},timing}):undefined;
}
export function overviewInteractionFeedback(state:ClimateLabState,reading?:ClimateLabReading){
 if(state.stage==='evidence')return climateObservationReading(state.month);
 if(state.stage==='air'){
  if(!reading)return '沿金色剖面移动气团，等高程读数出现后保持位置，对照水汽条件。';
  const bothClear=reading.comparison&&reading.comparison.higher.cloud===0&&reading.comparison.lower.cloud===0;
  return `${reading.phase}。${bothClear?'此处两种条件都尚未成云，切换不会出现云雨差异；继续向山地移动。':`${climateAirAppearance(reading)}。同一位置的抬升不变；较少水汽需要更多冷却才可能凝结。`}`;
 }
 const reason=state.city==='nyingchi'?'沿谷与跨山面对不同高差；实际通行还需道路与桥梁。':state.city==='lhasa'?'较缓地面提供聚居条件；用水与通行还需设施和组织。':'盆地内也有高差；林地灌溉需要设施和持续管护。';
 return `${state.direction==='north-south'?'南北':'东西'}剖面${reading?`当前样本约${Math.round(reading.ground/10)*10}米`:'来自真实高程'}。${reason}`;
}
export function overviewInteractionReason(state:ClimateLabState){
 return state.stage==='air'?'先改变水汽与气团位置，再用观测资料检查真实地区差异。':state.stage==='evidence'?'先比较同一统计尺度下的冬夏，再放大地区，读通行、用水与生活条件。':state.city==='nyingchi'?'从全域进入林芝读沿谷与跨山，再回到全域比较拉萨。':state.city==='lhasa'?'河谷提供条件，设施和组织才让条件进入生活；回到全域，再看狮泉河的例子。':'三地比较后回到全域：自然条件不能独自解释文化，接下来考察人的历史行动。';
}
