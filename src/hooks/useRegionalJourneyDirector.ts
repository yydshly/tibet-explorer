import {useCallback,useEffect,useRef,useState} from 'react';
import {getRegionalJourney,type RegionalJourneyStageId} from '../data/regionalJourney';
import {NarrationController,getExistingNarrationAsset,type NarrationState} from '../lib/narration';
import {getNarrationTimeline,narrationTimingAt,type NarrationTiming} from '../lib/narrationTiming';
import {clampRegionalProgress,readRegionalPosition,regionalCueSceneProgress,regionalFacetStage,regionalStageFacet,regionalStageOrder,type RegionalJourneyPosition} from '../lib/regionalJourneyState';

const emptyAudio=():NarrationState=>({status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'});
const storageKey=(city:string)=>`tibet-explorer.regional-journey.v1.${city}`;
function read(city:string,facet:string){try{return readRegionalPosition(JSON.parse(localStorage.getItem(storageKey(city))||'null'),facet);}catch{return readRegionalPosition(null,facet);}}
type Options={cityId:string;facet:string;ready:boolean;onStage:(stage:RegionalJourneyStageId)=>void};
/** One recording clock for captions, terrain motion and seek. No silent timer. */
export function useRegionalJourneyDirector(options:Options){
 const [position,setPosition]=useState(()=>read(options.cityId,options.facet)),[audio,setAudio]=useState(emptyAudio),[process,setProcess]=useState(true),[season,setSeason]=useState(1);
 const [presentation,setPresentation]=useState<{id:string;raw:number;timing:NarrationTiming}>();
 const [flowDirection,setFlowDirection]=useState<'along-valley'|'across-ridge'>('across-ridge');
 const player=useRef<NarrationController|null>(null),current=useRef(position),latest=useRef(options),revision=useRef(0),running=useRef(false),pending=useRef<{id:string;raw:number}|undefined>(undefined),lastTick=useRef('');
 current.current=position;latest.current=options;
 const journey=getRegionalJourney(options.cityId)!;
 const stage=journey.stages.find(item=>item.id===position.stage)!,cue=stage.cues[position.cue];
 const commit=useCallback((next:RegionalJourneyPosition)=>{current.current=next;setPosition(next);},[]);
 const pause=useCallback(()=>{revision.current++;running.current=false;player.current?.pause();},[]);
 const select=useCallback((stageId:RegionalJourneyStageId,cueIndex=0)=>{
  revision.current++;running.current=false;pending.current=undefined;player.current?.stop();setPresentation(undefined);setProcess(true);setSeason(1);setFlowDirection('across-ridge');
  const last=getRegionalJourney(latest.current.cityId)!.stages.find(item=>item.id===stageId)!.cues.length-1;
  commit({...current.current,stage:stageId,cue:Math.max(0,Math.min(last,cueIndex)),raw:0});latest.current.onStage(stageId);
 },[commit]);
 const playAt=useRef((_:RegionalJourneyPosition)=>{});
 playAt.current=(next:RegionalJourneyPosition)=>{
  const part=getRegionalJourney(latest.current.cityId)!.stages.find(item=>item.id===next.stage)!;
  revision.current++;setPresentation(undefined);setProcess(true);setSeason(1);setFlowDirection('across-ridge');running.current=true;
  pending.current={id:part.cues[next.cue].id,raw:next.raw};
  void player.current?.start(part.cues.slice(next.cue).map(item=>({id:item.id,text:item.text})));
 };
 useEffect(()=>{
  const controller=new NarrationController({onCue:item=>{
   const part=getRegionalJourney(latest.current.cityId)!.stages.find(stage=>stage.id===current.current.stage)!;
   const index=part.cues.findIndex(cue=>cue.id===item.id);
   if(index>=0&&running.current)commit({...current.current,cue:index,raw:pending.current?.id===item.id?pending.current.raw:0});
  },onEnded:()=>{
   running.current=false;pending.current=undefined;commit({...current.current,raw:1});
  }});
  player.current=controller;controller.setVolume(current.current.voice?1:0);
  const unsubscribe=controller.subscribe(state=>{
   const seek=pending.current;
   if(state.status==='playing'&&state.duration>0&&seek&&seek.id===state.cue?.id){pending.current=undefined;controller.seek(state.duration*seek.raw);return;}
   const part=getRegionalJourney(latest.current.cityId)!.stages.find(stage=>stage.id===current.current.stage)!;
   const index=part.cues.findIndex(cue=>cue.id===state.cue?.id);
   if(state.cue&&index<0)return;
   // A paused load can publish its duration/native timeline before the first
   // word starts. Its empty active-word fields must not hide that readiness.
   const tick=`${state.status}:${state.cue?.id}:${state.duration}:${Math.floor(state.progress*20)}:${state.timing?.precision}:${state.timing?.timingLevel}:${state.timing?.activeTextStart}:${state.timing?.activeTextEnd}:${state.error}`;
   if(tick===lastTick.current)return;lastTick.current=tick;
   setAudio(state);
   if(index>=0&&!pending.current&&(state.status==='playing'||state.status==='paused'||state.status==='ended'))commit({...current.current,cue:index,raw:state.progress});
   if(state.status==='error')running.current=false;
  });
  return()=>{revision.current++;running.current=false;unsubscribe();controller.dispose();player.current=null;};
 },[commit]);
 const lastFacet=useRef(options.facet);
 useEffect(()=>{
  if(lastFacet.current===options.facet)return;lastFacet.current=options.facet;
  const requested=regionalFacetStage(options.facet);
  if(regionalStageFacet(current.current.stage)!==regionalStageFacet(requested))select(requested);
 },[options.facet,select]);
 useEffect(()=>{try{localStorage.setItem(storageKey(options.cityId),JSON.stringify({...position,version:2}));}catch{/* Reading does not depend on storage. */}},[position,options.cityId]);
 // A paused re-entry reads only the exact published recording. Stale reads
 // cannot replace a later explicit action, cue, city or raw seek.
 useEffect(()=>{
  if(audio.cue?.id===cue.id&&audio.timing&&Math.abs(audio.progress-position.raw)<.015)return;
  const token=revision.current,raw=position.raw;let alive=true;
  void (async()=>{
   const asset=await getExistingNarrationAsset(cue.id,cue.text);
   if(!asset||asset.text!==cue.text)return;
   const timeline=await getNarrationTimeline(asset);
   if(alive&&token===revision.current&&current.current.raw===raw&&!running.current&&timeline)setPresentation({id:cue.id,raw,timing:narrationTimingAt(cue.text,raw*asset.duration,asset.duration,timeline)});
  })();
  return()=>{alive=false;};
 },[cue.id,cue.text,position.raw,audio.cue?.id,audio.progress,audio.timing]);
 const matching=audio.cue?.id===cue.id&&Math.abs(audio.progress-position.raw)<.015;
 const timing=matching?audio.timing:presentation&&presentation.id===cue.id&&presentation.raw===position.raw?presentation.timing:undefined;
 const playing=audio.status==='playing'||audio.status==='loading';
 const playPause=()=>{
  if(playing){pause();return;}if(!latest.current.ready)return;
  if(audio.cue?.id===cue.id&&audio.status==='paused'&&!audio.error&&position.raw<1){revision.current++;setProcess(true);setSeason(1);setFlowDirection('across-ridge');running.current=true;void player.current?.resume();}
  else playAt.current({...current.current,raw:position.raw>=1?0:position.raw});
 };
 const seek=(raw:number)=>{
  pause();const value=clampRegionalProgress(raw);setPresentation(undefined);
  commit({...current.current,raw:value});
  const controller=player.current;
  if(controller&&controller.snapshot.cue?.id===cue.id&&controller.snapshot.duration>0)controller.seek(value*controller.snapshot.duration);
  else{pending.current=undefined;player.current?.stop();}
 };
 const setVoice=(voice:boolean)=>{player.current?.setVolume(voice?1:0);commit({...current.current,voice});};
 const toggleProcess=()=>{pause();setProcess(value=>!value);};
 const next=()=>{const index=regionalStageOrder.indexOf(position.stage);if(index<3)select(regionalStageOrder[index+1]);};
 const changeSeason=(value:number)=>{pause();setSeason(value===3?3:1);};
 const changeFlowDirection=(value:'along-valley'|'across-ridge')=>{pause();setFlowDirection(value);};
 return {...position,journey,stage,cue,audio,timing,playing,process,season,changeSeason,flowDirection,changeFlowDirection,sceneProgress:regionalCueSceneProgress(cue,timing,position.raw),caption:timing?.caption||cue.text.split(/[。；]/u)[0]+'。',pause,select,playPause,seek,setVoice,toggleProcess,next,replay:()=>playAt.current({...current.current,raw:0})};
}
export type RegionalJourneyDirector=ReturnType<typeof useRegionalJourneyDirector>;
