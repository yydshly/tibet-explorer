import { cityAccessState } from '../lib/cityAccessState';
import { cityContinuityPartState } from '../lib/cityContinuityState';
import type { LocalPlaceId } from './cityLocalMap';

export type LocalUsagePhase='approach'|'arrival'|'use'|'observe';
export type LocalTransportContext='existing-road'|'rail-arrival'|'station-transfer'|'airport-city-road'|'geography';
export const LOCAL_USAGE_BOUNDARIES=[0,.44,.58,.86,1] as const;
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const phase=(value:number,from:number,to:number)=>clamp((value-from)/(to-from));

/** A use is read on a contemporary sourced object. The clock never draws a
 * historical footprint, grants access, saves a question or creates traffic. */
export function cityLocalUsageState(settings:{step:number;progress:number;cityLifeServices?:boolean;cityAccessTransfer?:boolean},place:LocalPlaceId){
  const access=settings.step===4?cityAccessState(settings.progress):undefined,part=cityContinuityPartState(settings.progress),progress=access?.phaseProgress??part.partProgress,index=access?.index??part.index;
  const observing=settings.step===6,enabled=settings.cityLifeServices!==false,transfer=settings.cityAccessTransfer!==false;
  const beat:LocalUsagePhase=progress<.44?'approach':progress<.58?'arrival':progress<.86?'use':'observe';
  const useReading=settings.step===3||settings.step===4&&place==='shiquanhe'&&index===3||settings.step===5&&index===2||settings.step===6&&index>0;
  const transportContext:LocalTransportContext=place==='lhasa'&&settings.step===4
    ?index===0?'existing-road':index===1?'rail-arrival':'station-transfer'
    :place==='lhasa'&&settings.step===5&&index<2?index===0?'rail-arrival':'station-transfer'
    :place==='shiquanhe'&&(settings.step===4&&index===2||settings.step===5&&index===1)?'airport-city-road':'geography';
  const corridorLeg=settings.step===5&&place==='lulang'&&index===2?(progress<.5?'mainling-s4':'nyingchi-g318'):undefined;
  const objectKey=place==='lulang'?'lulang-service-landuse':place==='shiquanhe'?'shiquanhe-river-and-banks':settings.step===3&&index>0?'lhasa-potala-outer-footprint':'lhasa-jokhang-outer-footprint';
  return {place,objectKey,step:settings.step,index,progress,beat,enabled,transfer,observing,useReading,transportContext,corridorLeg,
    approach:phase(progress,0,.44),arrival:phase(progress,.44,.58),use:phase(progress,.58,.86),observe:phase(progress,.86,1),
    motion:useReading?phase(progress,0,.44):progress,
    activity:enabled&&transfer?phase(progress,.44,.86):0,
    observation:observing&&enabled,
    geometryScope:'现状地理对象；用途阅读不改变年代、轮廓或入口许可',
  };
}

export function cityLocalUsageCaption(place:LocalPlaceId,state:ReturnType<typeof cityLocalUsageState>,purpose?:string){
  // Transport remains transport throughout its clip. Its late local progress
  // must not inherit a historical-use label from the shared four-part clock.
  if(!state.useReading){
    if(!state.enabled)return state.observing?'保留地方空间 · 收起观察':state.step===5?'停在已知抵达端 · 暂停地方接续':state.transportContext==='existing-road'||state.transportContext==='rail-arrival'||state.transportContext==='station-transfer'?'保留既有道路 · 新方式未加入':'保留现状地物 · 暂停交通阅读';
    if(state.transportContext==='existing-road')return '保留既有道路 · 地面方式仍在';
    if(state.transportContext==='rail-arrival')return state.progress<1?'列车沿已有轨道 · 接近客站':'列车抵达客站 · 地方接续另读';
    if(state.transportContext==='station-transfer')return !state.transfer?'停在客站抵达端 · 跨河接续未加入':state.progress<.15?'客站抵达端 · 交给地方车辆':'地方车辆 · 沿柳梧桥跨河接续';
    if(state.transportContext==='airport-city-road')return !state.transfer?'停在机场外道路起点 · 接续未加入':state.progress<1?'G219既有道路 · 接向狮泉河':'G219接到滨河道路 · 不补访问入口';
    return place==='lulang'?'读取鲁朗河与G318周边地物':place==='lhasa'?'读取河流、客站与公共路网':'读取河流与两岸现状道路';
  }
  if(!state.enabled)return state.observing?'保留地方空间 · 收起观察':'保留现状地物 · 暂停用途阅读';
  if(!state.transfer)return '停在已知抵达端 · 接续未加入';
  if(state.corridorLeg)return state.corridorLeg==='mainling-s4'?'米林机场外部道路 · S4接续':'林芝到鲁朗 · G318越岭';
  if(state.beat==='approach')return place==='lulang'?'沿已记录道路接近':place==='lhasa'?'辨认公共路网与对象':'沿现状道路接近河岸';
  if(state.beat==='arrival')return '已知路端停留 · 不补入口';
  if(state.beat==='use')return purpose??(place==='lulang'?'住宿与商业用途':place==='lhasa'?'历史对象的不同用途':'两岸步行与休闲用途');
  return state.observing?'同一地方 · 选择观察对象':'保留这个对象 · 带入下一问';
}
