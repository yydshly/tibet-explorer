import {cityAccessCities,cityAccessCityRange,type CityAccessCityId} from './cityAccessState';

export const cityContinuityLessonStages=['history','connections','travel'] as const;
export type CityContinuityLessonStage=typeof cityContinuityLessonStages[number];
export const cityContinuityPartStarts=[0,.34,.68] as const;
export type CityContinuityPartIndex=0|1|2;
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));

export function isCityContinuityLessonStage(stage:string):stage is CityContinuityLessonStage{
 return cityContinuityLessonStages.some(value=>value===stage);
}

/** The same exact intervals belong to the recorded audio, map objects and controls. */
export function cityContinuityPartState(progress:number){
 const value=clamp(progress),cityId=cityAccessCities[value>=.68?2:value>=.34?1:0];
 const range=cityAccessCityRange(cityId),local=clamp((value-range.start)/(range.end-range.start));
 const index=cityContinuityPartStarts.reduce<number>((latest,start,i)=>local+1e-9>=start?i:latest,0) as CityContinuityPartIndex;
 const start=cityContinuityPartStarts[index],end=cityContinuityPartStarts[index+1]??1;
 return {cityId,index,local,partProgress:clamp((local-start)/(end-start))};
}

export function cityContinuityPartProgress(cityId:CityAccessCityId,index:number){
 const range=cityAccessCityRange(cityId),part=Math.min(2,Math.max(0,Math.trunc(Number.isFinite(index)?index:0)));
 return range.start+(range.end-range.start)*cityContinuityPartStarts[part];
}
