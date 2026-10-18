import {clampCityProgress} from './cityLifeState';

export interface CityLifeAudioSegment {id:string;text:string;start:number;end:number}

/** Scene progress belongs to a recorded clip, not a guessed spoken-word clock. */
export function cityLifeSceneToAudio(segments:readonly CityLifeAudioSegment[],progress:number){
  if(!segments.length)return undefined;
  const sceneProgress=clampCityProgress(progress);
  const index=segments.reduce((latest,segment,i)=>sceneProgress>=segment.start?i:latest,0);
  const segment=segments[index];
  const fraction=clampCityProgress((sceneProgress-segment.start)/(segment.end-segment.start));
  return {index,segment,fraction,queue:segments.slice(index).map(({id,text})=>({id,text}))};
}

/** A stale city's/stage's audio event must never move the current scene. */
export function cityLifeAudioToScene(segments:readonly CityLifeAudioSegment[],cueId:string,progress:number){
  const segment=segments.find(item=>item.id===cueId);
  return segment?segment.start+clampCityProgress(progress)*(segment.end-segment.start):undefined;
}
