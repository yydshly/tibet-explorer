import {useCallback,useEffect,useRef,useState} from 'react';
import {NarrationController,getExistingNarrationAsset,type NarrationState} from '../lib/narration';
import {getNarrationTimeline,narrationTimingAt,type NarrationTiming} from '../lib/narrationTiming';

export interface OverviewDirectorBeat {id:string;recordingId:string;text:string;sceneIdentity:string}
export interface OverviewDirectorOptions {beats:readonly OverviewDirectorBeat[];storageKey?:string;resumeAliases?:Readonly<Record<string,string>>}
type Position={beatId:string;recordingId:string;text:string;raw:number;voice:boolean};
type Presentation={beatId:string;recordingId:string;text:string;raw:number;timing:NarrationTiming};
const DEFAULT_STORAGE_KEY='tibet-explorer.overview-position.v1';
const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
const emptyAudio=():NarrationState=>({status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'});
const positionAt=(beat:OverviewDirectorBeat,voice=true,raw=0):Position=>({beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw,voice});
export function readOverviewPosition(options:OverviewDirectorOptions):Position {
 const first=options.beats[0];if(!first)throw new Error('Overview requires at least one recorded beat.');
 try{
  const saved=JSON.parse(localStorage.getItem(options.storageKey||DEFAULT_STORAGE_KEY)||'null');
  const beat=options.beats.find(item=>item.id===saved?.beatId&&item.recordingId===saved.recordingId&&item.text===saved.text);
  const replacement=options.resumeAliases?.[saved?.beatId],migrated=replacement?options.beats.find(item=>item.id===replacement):undefined;
  // A new script begins at its own start. Never reuse the fraction of a
  // different recording, or silently send an edited chapter back to Earth.
  return beat?positionAt(beat,saved.voice!==false,clamp(Number(saved.raw))):positionAt(migrated??first,saved?.voice!==false);
 }catch{return positionAt(first);}
}

/** A single media clock owns the entire overview. Raw recording fractions are
 * the only persisted/seek positions; semantic scene motion belongs to callers. */
export function useOverviewDirector(options:OverviewDirectorOptions){
 const [position,setPosition]=useState(()=>readOverviewPosition(options));
 const [audio,setAudio]=useState(emptyAudio),[presentation,setPresentation]=useState<Presentation>();
 const [wantsPlayback,setWantsPlayback]=useState(false),[readyIdentity,setReadyIdentity]=useState(''),[sceneError,setSceneError]=useState('');
 const [playRequest,setPlayRequest]=useState(0);
 const latest=useRef(options);latest.current=options;
 const current=useRef(position);current.current=position;
 const player=useRef<NarrationController|null>(null),running=useRef(false),readyRef=useRef(''),sceneErrorRef=useRef('');
 const revision=useRef(0),prepared=useRef(''),pendingSeek=useRef<{beatId:string;recordingId:string;text:string;raw:number}|undefined>(undefined);
 const lastAudioTick=useRef(''),lastProgressAt=useRef(0);
 const beatIndex=Math.max(0,options.beats.findIndex(item=>item.id===position.beatId&&item.recordingId===position.recordingId&&item.text===position.text));
 const beat=options.beats[beatIndex];
 const currentBeat=useCallback(()=>latest.current.beats.find(item=>item.id===current.current.beatId&&item.recordingId===current.current.recordingId&&item.text===current.current.text)??latest.current.beats[0],[]);
 const commit=useCallback((next:Position)=>{current.current=next;setPosition(next);},[]);
 const setIntent=useCallback((value:boolean)=>{running.current=value;setWantsPlayback(value);},[]);
 const setSceneState=useCallback((identity:string,error='')=>{readyRef.current=identity;sceneErrorRef.current=error;setReadyIdentity(identity);setSceneError(error);},[]);
 const pause=useCallback(()=>{revision.current++;setIntent(false);player.current?.pause();},[setIntent]);
 const changeBeat=useCallback((index:number,run:boolean)=>{
  const beats=latest.current.beats,target=beats[Math.max(0,Math.min(beats.length-1,Math.trunc(Number.isFinite(index)?index:0)))];
  revision.current++;setIntent(false);pendingSeek.current=undefined;prepared.current='';lastAudioTick.current='';
  player.current?.stop();setPresentation(undefined);
  if(target.sceneIdentity!==currentBeat().sceneIdentity)setSceneState('');
  // Selecting another sentence on the failed same model cannot repair it.
  // Keep the error/retry affordance until an actual rebuild becomes ready.
  commit(positionAt(target,current.current.voice));setIntent(run);setPlayRequest(value=>value+1);
 },[commit,currentBeat,setIntent,setSceneState]);
 const select=useCallback((index:number)=>changeBeat(index,false),[changeBeat]);
 const ended=useRef((_:NarrationState)=>{});
 ended.current=state=>{
  const selected=currentBeat();
  if(!running.current||readyRef.current!==selected.sceneIdentity||state.cue?.id!==selected.recordingId||state.cue.text!==selected.text)return;
  const index=latest.current.beats.findIndex(item=>item.id===selected.id);
  if(index+1<latest.current.beats.length)changeBeat(index+1,true);
  else{pendingSeek.current=undefined;commit({...current.current,raw:1});setIntent(false);}
 };

 useEffect(()=>{
  const controller=new NarrationController({
   onProgress:(raw,state)=>{
    const selected=currentBeat();
    if(pendingSeek.current||state.cue?.id!==selected.recordingId||state.cue.text!==selected.text||state.duration<=0)return;
    // Loading or an old ended event never overwrites a saved nonzero seek.
    if(!['playing','paused','ended'].includes(state.status))return;
    const now=performance.now();if(state.status==='playing'&&raw<1&&now-lastProgressAt.current<100)return;
    lastProgressAt.current=now;commit({...current.current,raw:clamp(raw)});
   },
   onEnded:state=>ended.current(state),
  });
  player.current=controller;controller.setVolume(current.current.voice?1:0);
  const unsubscribe=controller.subscribe(state=>{
   const selected=currentBeat();
   if(state.cue&&(state.cue.id!==selected.recordingId||state.cue.text!==selected.text))return;
   const pending=pendingSeek.current;
   // A load can finish after Pause. Hydrate the original seek before exposing
   // its timing, without ever resuming the newly loaded media.
   if(state.duration>0&&pending&&pending.beatId===selected.id&&pending.recordingId===state.cue?.id&&pending.text===state.cue.text){
    pendingSeek.current=undefined;controller.seek(state.duration*pending.raw);return;
   }
   const tick=`${state.status}:${state.cue?.id}:${state.duration}:${Math.floor(state.currentTime*10)}:${state.timing?.precision}:${state.timing?.timingLevel}:${state.timing?.activeTextStart}:${state.timing?.activeTextEnd}:${state.error}`;
   if(tick!==lastAudioTick.current){lastAudioTick.current=tick;setAudio(state);}
   if(state.status==='error'||state.status==='paused'&&state.error)setIntent(false);
  });
  return()=>{revision.current++;running.current=false;unsubscribe();controller.dispose();player.current=null;};
 },[commit,currentBeat,setIntent]);

 useEffect(()=>{
  const controller=player.current,selected=currentBeat();if(!controller)return;
  if(!wantsPlayback||!running.current||readyIdentity!==selected.sceneIdentity||sceneErrorRef.current){controller.pause();return;}
  const key=`${selected.id}\u0000${selected.recordingId}\u0000${selected.text}`;
  if(prepared.current!==key||controller.snapshot.status==='idle'||controller.snapshot.status==='ended'){
   prepared.current=key;pendingSeek.current={beatId:selected.id,recordingId:selected.recordingId,text:selected.text,raw:current.current.raw};
   lastProgressAt.current=0;setPresentation(undefined);
   void controller.start([{id:selected.recordingId,text:selected.text}]);
  }else if(controller.snapshot.status==='error'){
   // Retrying a failed media source reloads the clip. Restore its real raw
   // position just as on initial load; a retry must not silently rewind it.
   pendingSeek.current={beatId:selected.id,recordingId:selected.recordingId,text:selected.text,raw:current.current.raw};
   void controller.resume();
  }else if(controller.snapshot.status==='paused')void controller.resume();
 },[wantsPlayback,readyIdentity,position.beatId,position.recordingId,position.text,playRequest,currentBeat]);

 useEffect(()=>{try{localStorage.setItem(options.storageKey||DEFAULT_STORAGE_KEY,JSON.stringify({version:1,...position}));}catch{/* Playback remains usable without storage. */}},[position,options.storageKey]);
 useEffect(()=>{
  if(running.current)return;
  const selected=beat,raw=position.raw,token=revision.current;
  if(audio.cue?.id===selected.recordingId&&audio.cue.text===selected.text&&audio.timing&&Math.abs(audio.progress-raw)<1e-7)return;
  let active=true;
  void(async()=>{
   const asset=await getExistingNarrationAsset(selected.recordingId,selected.text);
   if(!asset||asset.text!==selected.text)return;
   const timeline=await getNarrationTimeline(asset);
   const now=current.current;
   if(!active||revision.current!==token||running.current||now.beatId!==selected.id||now.recordingId!==selected.recordingId||now.text!==selected.text||now.raw!==raw||timeline?.timingLevel!=='word')return;
   setPresentation({beatId:selected.id,recordingId:selected.recordingId,text:selected.text,raw,timing:narrationTimingAt(selected.text,asset.duration*raw,asset.duration,timeline)});
  })();
  return()=>{active=false;};
 },[beat.id,beat.recordingId,beat.text,position.raw,audio.cue?.id,audio.progress,audio.timing,wantsPlayback]);

 const seek=useCallback((raw:number)=>{
  pause();setPresentation(undefined);lastAudioTick.current='';const value=clamp(raw),selected=currentBeat();
  commit({...current.current,raw:value});
  const controller=player.current;
  if(controller?.snapshot.cue?.id===selected.recordingId&&controller.snapshot.cue.text===selected.text){
   if(controller.snapshot.duration>0){pendingSeek.current=undefined;controller.seek(controller.snapshot.duration*value);}
   else pendingSeek.current={beatId:selected.id,recordingId:selected.recordingId,text:selected.text,raw:value};
  }else{pendingSeek.current=undefined;prepared.current='';controller?.stop();}
 },[pause,currentBeat,commit]);
 const playPause=useCallback(()=>{
  if(running.current){pause();return;}
  const selected=currentBeat(),index=latest.current.beats.findIndex(item=>item.id===selected.id);
  if(current.current.raw>=1){changeBeat(index===latest.current.beats.length-1?0:index,true);return;}
  revision.current++;setPresentation(undefined);setIntent(true);setPlayRequest(value=>value+1);
 },[pause,currentBeat,changeBeat,setIntent]);
 const replay=useCallback(()=>changeBeat(latest.current.beats.findIndex(item=>item.id===currentBeat().id),true),[changeBeat,currentBeat]);
 const setVoice=useCallback((voice:boolean)=>{player.current?.setVolume(voice?1:0);commit({...current.current,voice});},[commit]);
 const onSceneReady=useCallback((identity:string)=>{if(identity===currentBeat().sceneIdentity)setSceneState(identity);},[currentBeat,setSceneState]);
 const onSceneError=useCallback((identity:string,message:string)=>{
  if(identity!==currentBeat().sceneIdentity)return;pause();setSceneState('',message||'当前场景暂时未能准备好，请重试。');
 },[currentBeat,pause,setSceneState]);
 const retryScene=useCallback(()=>{pause();pendingSeek.current=undefined;prepared.current='';player.current?.stop();setSceneState('');},[pause,setSceneState]);
 const sameRecording=audio.cue?.id===beat.recordingId&&audio.cue.text===beat.text;
 const matching=sameRecording&&Math.abs(audio.progress-position.raw)<.015;
 const timing=matching?audio.timing:presentation?.beatId===beat.id&&presentation.recordingId===beat.recordingId&&presentation.text===beat.text&&presentation.raw===position.raw?presentation.timing:undefined;
 const ready=readyIdentity===beat.sceneIdentity&&!sceneError;
 const error=sceneError||(audio.cue?.id===beat.recordingId&&audio.cue.text===beat.text?audio.error:null)||'';
 return{beatIndex,beat,raw:position.raw,voice:position.voice,audio,timing,playing:wantsPlayback&&ready&&sameRecording&&audio.status==='playing',wantsPlayback,ready,error,select,playPause,pause,seek,replay,setVoice,onSceneReady,onSceneError,retryScene};
}
export type OverviewDirector=ReturnType<typeof useOverviewDirector>;
