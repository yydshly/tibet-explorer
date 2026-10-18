export const cityAccessCities=['nyingchi','lhasa','ngari'] as const;
export type CityAccessCityId=typeof cityAccessCities[number];
export const cityAccessPhases=[
 {id:'before',at:0,label:'开通前已有方式'},
 {id:'access',at:.25,label:'加入新的通道'},
 {id:'transfer',at:.52,label:'到站后怎样接续'},
 {id:'life',at:.76,label:'进入城市与生活'},
] as const;
export type CityAccessPhaseId=typeof cityAccessPhases[number]['id'];
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function cityAccessCityRange(cityId:CityAccessCityId){
 const index=cityAccessCities.indexOf(cityId);
 return {start:index===0?0:index===1?.34:.68,end:index===0?.34:index===1?.68:1};
}
/** Shared by exact recorded-clip intervals, scene phases and manual controls. */
export function cityAccessState(progress:number){
 const value=clamp(progress),cityId=cityAccessCities[value>=.68?2:value>=.34?1:0],range=cityAccessCityRange(cityId);
 const local=clamp((value-range.start)/(range.end-range.start));
 const index=cityAccessPhases.reduce((latest,phase,i)=>local+1e-9>=phase.at?i:latest,0);
 const phase=cityAccessPhases[index],end=cityAccessPhases[index+1]?.at??1;
 return {cityId,local,phase:phase.id,index,phaseProgress:clamp((local-phase.at)/(end-phase.at))};
}
export function cityAccessPhaseProgress(cityId:CityAccessCityId,phaseId:CityAccessPhaseId){
 const range=cityAccessCityRange(cityId),phase=cityAccessPhases.find(item=>item.id===phaseId)!;
 // Seek to the same precise boundary used by the audio segment and scene.
 return range.start+(range.end-range.start)*phase.at;
}
