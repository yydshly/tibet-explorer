/** Published years are discrete views; the recording's actual text position
 * selects them. No date or footprint is interpolated between epochs. */
export function spatialHistoryYear(text:string,textProgress:number,manual?:number){
 if(manual!==undefined&&[1985,2005,2015].includes(manual))return manual;
 const position=Math.max(0,Math.min(1,textProgress))*text.length;let year=1985;
 for(const candidate of [1985,2005,2015]){const index=text.indexOf(String(candidate));if(index>=0&&position>=index)year=candidate;}
 return year;
}

/** Arrival follows the acquired-road sentence. The later interview discusses
 * local use, rather than adding travel time to an already completed journey. */
export function spatialAccessMotion(cue:{id:string;text:string;anchor:string}|undefined,sceneProgress:number){
 const value=Math.max(0,Math.min(1,sceneProgress));
 if(!cue?.id.startsWith('REG-SPATIAL-')||!cue.id.endsWith('-access'))return Math.max(0,Math.min(1,(value-.15)/.73));
 const start=Math.max(0,cue.text.indexOf(cue.anchor)),end=cue.text.indexOf('。',start);
 if(end<=start)return value;
 return Math.max(0,Math.min(1,value*(cue.text.length-start)/(end+1-start)));
}
