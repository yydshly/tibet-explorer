import river from '../data/yarlung-river.json';

export interface OverviewRiverState {reveal:number;emphasized:boolean}
/** These exact source parts share endpoints; never bridge separate river arms. */
export const yarlungReadingCoordinates=river.features.flatMap((feature,index)=>feature.geometry.coordinates[0].slice(index?1:0)) as [number,number][];
export function overviewRiverState(recordingId:string,text:string,textProgress:number):OverviewRiverState|undefined {
 if(recordingId!=='OVERVIEW-protection')return undefined;
 const start=text.indexOf('雅鲁藏布江'),end=text.indexOf('羌塘的生态管护'),at=textProgress*text.length;
 if(start<0||end<=start)return undefined;
 return {reveal:Math.max(0,Math.min(1,(at-start)/(end-start))),emphasized:at>=start&&at<end};
}
