import {getExistingNarrationAsset} from './narration';
import {cityLifeSceneToAudio,type CityLifeAudioSegment} from './cityLifeAudio';
import {cityNarrationSceneProgress} from './cityNarrationSceneProgress';
import {getNarrationTimeline,narrationTimingAt,type NarrationTiming} from './narrationTiming';

export interface CityRecordedPresentation {
 cueId:string;text:string;rawProgress:number;sceneProgress:number;narrationTiming:NarrationTiming;
}

/** Recover a paused reading from the exact existing recording. This is a
 * read-only derivation of raw media position, never another stored clock. */
export async function readCityRecordedPresentation(segments:readonly CityLifeAudioSegment[],rawProgress:number):Promise<CityRecordedPresentation|undefined>{
 const position=cityLifeSceneToAudio(segments,rawProgress);if(!position)return;
 try{
  const {segment,fraction}=position,asset=await getExistingNarrationAsset(segment.id,segment.text);
  // The legacy playback lookup trims text. Native UTF-16 offsets need the
  // identical original string, including leading/trailing whitespace.
  if(!asset||asset.text!==segment.text)return;
  // The shared loader verifies sidecar bytes, text/audio SHA, model, voice,
  // duration and UTF-16 spans. A sentence/estimated timeline cannot restore
  // the literal word-owned physical state.
  const timeline=await getNarrationTimeline(asset);
  if(timeline?.timingLevel!=='word')return;
  const timing=narrationTimingAt(segment.text,fraction*asset.duration,asset.duration,timeline);
  if(timing.precision!=='provider'||timing.timingLevel!=='word')return;
  const sceneProgress=cityNarrationSceneProgress(segments,rawProgress,{cue:{id:segment.id,text:segment.text},progress:fraction,timing});
  return {cueId:segment.id,text:segment.text,rawProgress,sceneProgress,narrationTiming:timing};
 }catch{
  // Offline/unavailable evidence leaves the ordinary paused reading usable.
  // Actual playback can retry the original timeline loader separately.
  return;
 }
}
