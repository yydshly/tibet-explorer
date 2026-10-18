import {climateLabPlaces,type ClimateLabState} from '../data/climateLab';
export interface ClimateLabReading {ground:number;lift:number;phase:string;cloud:number;rain:number;comparison?:Record<'higher'|'lower',{cloud:number;rain:number}>;}
/** Qualitative appearance of this teaching overlay, never observed cloud cover/mm. */
export function climateAirAppearance(value:{cloud:number;rain:number}){
 return `${value.cloud===0?'尚未成云':value.cloud<.35?'少量云':value.cloud<.75?'云增多':'云明显增多'} · ${Math.round(value.rain*120)===0?'无示意雨迹':value.rain<.35?'少量示意雨迹':'示意雨迹明显'}`;
}
export function climateAirAnnotation(value:ClimateLabReading){
 return value.phase.startsWith('背风下沉')?'背风下沉 · 增温、云雨减弱':Math.round(value.rain*120)>0?'抬升冷却 · 凝结与降水':value.cloud>0?'抬升冷却 · 水汽开始凝结':value.lift>400?'正在抬升 · 尚未成云':'接近山地 · 观察水汽条件';
}
export const clamp01=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
export function climateLabCoordinates(state:ClimateLabState,fraction:number){
 const t=clamp01(fraction);
 if(state.stage==='air')return {longitude:91.1,latitude:26.1+t*3.8};
 const place=climateLabPlaces[state.city];
 return {longitude:place.longitude+(state.direction==='east-west'?(t-.5)*2.4:0),latitude:place.latitude+(state.direction==='north-south'?(t-.5)*2.4:0)};
}
/** Teaching contrast only: thresholds/opacity have no weather forecast units. */
export function climateLabAirState(elevations:readonly number[],progress:number,moisture:'higher'|'lower'){
 const p=clamp01(progress),index=Math.min(elevations.length-1,Math.round(p*(elevations.length-1)));
 if(!elevations.length||elevations.some(v=>!Number.isFinite(v)))return undefined;
 const ground=elevations[index],lift=Math.max(0,ground-elevations[0]);
 const maximum=Math.max(...elevations.slice(0,index+1)),descending=maximum-ground>450;
 const cloud=clamp01((lift-(moisture==='higher'?700:3100))/2200)*(moisture==='higher'?1:.24)*(descending?Math.exp(-(maximum-ground)/2000):1);
 const rain=clamp01((cloud-.3)/.7)*(descending?.35:1);
 return {ground,lift,cloud,rain,descending,phase:descending?'背风下沉 · 增温、相对湿度可能降低':cloud>.3?'抬升冷却 · 云与降水形成条件':cloud>0?'抬升冷却 · 水汽开始凝结':lift>400?'正在抬升 · 冷却不等于已经下雨':'来流接近地形 · 先比较水汽条件'};
}
