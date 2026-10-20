import {useEffect,useRef,useState} from 'react';
import type {PilotTerrainContext} from '../scene/routePilotTerrainData';
import {roadRideFrame,roadRideSegment,type RoadRideLook} from '../scene/roadRideFrame';
import {useOverviewDirector} from './useOverviewDirector';
import {roadRideBeats,rideFraction,rideSeekTarget} from '../data/roadRideNarration';
import {getExistingNarrationAsset} from '../lib/narration';
import {getNarrationTimeline,narrationTimingAt,type NarrationTimeline} from '../lib/narrationTiming';

/** A single native audio clock owns distance, captions and arrival. Exploring
 * another view does not move the location or let speech run on a second clock. */
export function useRoadRide(context:PilotTerrainContext|undefined,anchor:number|undefined,onArrive:()=>void){
 const director=useOverviewDirector({beats:roadRideBeats,storageKey:'tibet-explorer.road-ride-position.v2'});
 const [active,setActive]=useState(false),[look,setLook]=useState<RoadRideLook>('forward'),[intent,setIntent]=useState(false);
 const [timelines,setTimelines]=useState<NarrationTimeline[]>([]),[error,setError]=useState('');
 const autoAdvance=useRef(false),arrival=useRef(onArrive);arrival.current=onArrive;
 const segment=context&&anchor!==undefined?roadRideSegment(context.profile,anchor):undefined;
 const timeline=timelines[director.beatIndex];
 const timing=director.timing??(timeline?narrationTimingAt(director.beat.text,director.raw*timeline.duration,timeline.duration,timeline):undefined);
 const total=segment?.total??1,fraction=rideFraction(director.beatIndex,timing?.textProgress??0);
 const distance=segment?segment.start+segment.length*fraction:0;
 useEffect(()=>{
  let alive=true;
  void Promise.all(roadRideBeats.map(async beat=>{const asset=await getExistingNarrationAsset(beat.id,beat.text);if(!asset)throw Error('沿路语音尚未就绪');const t=await getNarrationTimeline(asset);if(!t?.words?.length)throw Error('沿路逐词时间尚未就绪');return t;})).then(t=>{if(alive)setTimelines(t);}).catch(e=>{if(alive)setError(e.message);});
  return()=>{alive=false;};
 },[]);
 const ready=!!segment&&timelines.length===4;
 useEffect(()=>{
  if(!active||!ready)return;
  director.onSceneReady('road-ride');
  if(intent){setIntent(false);director.playPause();}
 },[active,ready,intent,director.onSceneReady,director.playPause]);
 useEffect(()=>{
  if(active&&autoAdvance.current&&director.beatIndex===3&&director.raw>=1){autoAdvance.current=false;setActive(false);director.pause();arrival.current();}
 },[active,director.beatIndex,director.raw,director.pause]);
 useEffect(()=>{const hide=()=>{if(document.hidden){autoAdvance.current=false;setIntent(false);director.pause();}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[director.pause]);
 const start=()=>{if(!ready)return;director.pause();director.select(0);director.seek(0);setLook('forward');setActive(true);autoAdvance.current=true;setIntent(true);};
 const stop=()=>{autoAdvance.current=false;setIntent(false);director.pause();setActive(false);};
 const setRunning=(run:boolean)=>{autoAdvance.current=run;setIntent(run);if(!run)director.pause();};
 const seek=(metres:number)=>{
  if(!segment||!timelines.length)return;setRunning(false);
  const target=rideSeekTarget((metres-segment.start)/segment.length),timeline=timelines[target.index],offset=target.textProgress*roadRideBeats[target.index].text.length;
  const word=timeline.words!.find(w=>w.textEnd>offset)??timeline.words!.at(-1)!;
  const second=target.textProgress>=1?timeline.duration:word.start+(word.end-word.start)*Math.max(0,Math.min(1,(offset-word.textStart)/(word.textEnd-word.textStart)));
  director.select(target.index);director.seek(second/timeline.duration);
 };
 return {active,running:director.wantsPlayback,distance,look,segment,start,stop,seek,setLook,setRunning,ready,error:error||director.error,progress:distance/total,
  timing,voice:director.voice,setVoice:director.setVoice,beatIndex:director.beatIndex,
  sample:context?roadRideFrame(context.profile,distance/total,look):undefined};
}
