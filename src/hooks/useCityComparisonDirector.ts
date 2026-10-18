import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {cityComparisonStages,type CityComparisonStageId} from '../data/cityComparison';
import {cityLifeAudioToScene,cityLifeSceneToAudio,type CityLifeAudioSegment} from '../lib/cityLifeAudio';
import {clampCityProgress} from '../lib/cityLifeState';
import {NarrationController,type NarrationState} from '../lib/narration';
import {cityAccessAudioSegments} from '../lib/cityAccessAudio';
import {cityComparisonContinuation} from '../lib/cityComparisonContinuation';
import {cityContinuityAudioSegments} from '../lib/cityContinuityAudio';
import {isCityContinuityLessonStage} from '../lib/cityContinuityState';
import {narrationTimingForPlayback,type NarrationTiming} from '../lib/narrationTiming';
import {cityNarrationSceneProgress} from '../lib/cityNarrationSceneProgress';
import {readCityRecordedPresentation} from '../lib/cityRecordedPresentation';

export const cityComparisonStorageKey='tibet-explorer.city-comparison.v1';
export interface CityComparisonPosition {
  stage:CityComparisonStageId;
  progress:number;
  voice:boolean;
  relief:boolean;
  services:boolean;
  built:boolean;
  transfer:boolean;
}
/** Ephemeral display state for an unsaved review detour, never a stored seek. */
export interface CityComparisonPresentation {sceneProgress:number;narrationTiming?:NarrationTiming}
type RestoredPresentation={stage:CityComparisonStageId;progress:number;value:CityComparisonPresentation};
function compatiblePresentation(position:CityComparisonPosition,value:CityComparisonPresentation):CityComparisonPresentation|undefined{
 if(!Number.isFinite(value.sceneProgress)||value.sceneProgress<0||value.sceneProgress>1)return;
 const segments=cityComparisonAudioSegments(position.stage),source=cityLifeSceneToAudio(segments,position.progress),scene=cityLifeSceneToAudio(segments,value.sceneProgress);
 if(!source||scene?.segment.id!==source.segment.id)return;
 const timing=value.narrationTiming;
 if(timing&&(!Number.isInteger(timing.textStart)||!Number.isInteger(timing.textEnd)||timing.textStart<0||timing.textEnd<timing.textStart||timing.textEnd>source.segment.text.length||timing.caption!==source.segment.text.slice(timing.textStart,timing.textEnd)||!Number.isFinite(timing.textProgress)||timing.textProgress<0||timing.textProgress>1))return;
 return {sceneProgress:value.sceneProgress,narrationTiming:timing?{...timing}:undefined};
}
export function validateCityComparisonPosition(value:unknown):CityComparisonPosition {
  const record=value&&typeof value==='object'?value as Partial<Omit<CityComparisonPosition,'stage'>>&{stage?:string}:{};
  return {
    stage:record.stage==='life'?'mobility':cityComparisonStages.find(stage=>stage.id===record.stage)?.id??'climate',
    progress:clampCityProgress(Number(record.progress??0)),
    voice:record.voice!==false,
    relief:record.relief!==false,
    services:record.services!==false,
    built:record.built!==false,
    transfer:record.transfer!==false,
  };
}
export function cityComparisonAudioSegments(stageId:CityComparisonStageId):CityLifeAudioSegment[] {
  if(stageId==='development')return cityAccessAudioSegments;
  if(isCityContinuityLessonStage(stageId))return cityContinuityAudioSegments(stageId);
  const stage=cityComparisonStages.find(item=>item.id===stageId)!;
  return stage.beats.map((beat,index)=>({
    id:`COMPARE-${stageId}-${index+1}`,text:beat.narration,
    start:beat.at,end:stage.beats[index+1]?.at??1,
  }));
}
function readPosition():CityComparisonPosition {
  try{return validateCityComparisonPosition(JSON.parse(localStorage.getItem(cityComparisonStorageKey)||'null'));}
  catch{return validateCityComparisonPosition(null);}
}
/** An explicit new entry starts its subject; ordinary returns keep readPosition. */
export function saveCityComparisonEntry(stage:CityComparisonStageId,progress=0){
  const next={...readPosition(),stage,progress:clampCityProgress(progress),relief:true,services:true,built:true,transfer:true};
  try{localStorage.setItem(cityComparisonStorageKey,JSON.stringify(next));}catch{/* In-memory reading remains available. */}
  return next;
}
const emptyAudio:NarrationState={status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'};
type PendingSeek={cueId:string;fraction:number};
type Options={active:boolean;ready:boolean};

/** One clock for the three places, with a real recorded clip for each comparison beat. */
export function useCityComparisonDirector(options:Options){
  const [position,setPosition]=useState(readPosition);
  const [playing,setPlaying]=useState(false),[audio,setAudio]=useState(emptyAudio);
  const [playRequest,setPlayRequest]=useState(0);
  const [,publishPresentation]=useState(0);
  const player=useRef<NarrationController|null>(null),prepared=useRef(''),pendingSeek=useRef<PendingSeek|null>(null);
  const restoredPresentation=useRef<RestoredPresentation|null>(null);
  const initialPosition=useRef(position),restorationRevision=useRef(0);
  const latest=useRef(options);latest.current=options;
  const current=useRef(position);current.current=position;
  const running=useRef(playing);running.current=playing;
  const updateAt=useRef(0);
  const segments=useMemo(()=>cityComparisonAudioSegments(position.stage),[position.stage]);
  const segmentsRef=useRef(segments);segmentsRef.current=segments;
  const stageKey=`COMPARE-${position.stage}`;

  const pause=useCallback(()=>{
    restorationRevision.current++;
    running.current=false;player.current?.pause();setPlaying(false);
  },[]);
  const selectStage=useCallback((stage:CityComparisonStageId,run=false,progress=0)=>{
    restorationRevision.current++;
    restoredPresentation.current=null;
    running.current=false;player.current?.stop();prepared.current='';pendingSeek.current=null;
    current.current={...current.current,stage,progress:clampCityProgress(progress),relief:true,services:true,built:true,transfer:true};
    setPosition(current.current);
    // A same-topic replay while already playing still owns a fresh queue.
    // This is an action revision, never an independent animation clock.
    setPlayRequest(request=>request+1);
    running.current=run;setPlaying(run);
  },[]);
  const getPosition=useCallback(()=>({...current.current}),[]);
  const restorePosition=useCallback((value:CityComparisonPosition,presentation?:CityComparisonPresentation)=>{
    restorationRevision.current++;
    running.current=false;player.current?.stop();prepared.current='';pendingSeek.current=null;
    current.current=validateCityComparisonPosition(value);
    const display=presentation&&compatiblePresentation(current.current,presentation);
    restoredPresentation.current=display?{stage:current.current.stage,progress:current.current.progress,value:display}:null;
    setPosition(current.current);setPlaying(false);
  },[]);
  const advance=useRef(()=>{});
  advance.current=()=>{
    const index=cityComparisonStages.findIndex(stage=>stage.id===current.current.stage);
    const next=cityComparisonStages[index+1];
    if(next)selectStage(next.id,true);
    else{
      running.current=false;setPlaying(false);
      current.current={...current.current,progress:1};setPosition(current.current);
    }
  };

  useEffect(()=>{
    const controller=new NarrationController({
      onCue:cue=>{
        const segment=segmentsRef.current.find(item=>item.id===cue.id);
        if(!segment||player.current?.snapshot.cue?.id!==cue.id||!running.current||!latest.current.active||!latest.current.ready||pendingSeek.current)return;
        restoredPresentation.current=null;
        updateAt.current=0;
        setPosition(previous=>({...previous,progress:segment.start}));
      },
      onProgress:(fraction,state)=>{
        const progress=cityLifeAudioToScene(segmentsRef.current,state.cue?.id??'',fraction);
        if(progress===undefined||player.current?.snapshot.cue?.id!==state.cue?.id||!running.current||!latest.current.active||!latest.current.ready||pendingSeek.current)return;
        restoredPresentation.current=null;
        const now=performance.now();if(fraction<1&&now-updateAt.current<100)return;updateAt.current=now;
        setPosition(previous=>({...previous,progress}));
      },
      onEnded:state=>{
        if(running.current&&latest.current.active&&latest.current.ready&&player.current?.snapshot.cue?.id===state.cue?.id&&segmentsRef.current.at(-1)?.id===state.cue?.id)advance.current();
      },
    });
    player.current=controller;
    controller.setVolume(current.current.voice?1:0);
    let lastAudioTick='';
    const unsubscribe=controller.subscribe(state=>{
      if(state.cue&&(!segmentsRef.current.some(segment=>segment.id===state.cue?.id)||controller.snapshot.cue?.id!==state.cue.id))return;
      const tick=`${state.status}:${state.cue?.id}:${Math.floor(state.progress*100)}:${state.timing?.precision}:${state.timing?.textStart}:${state.timing?.textEnd}:${state.timing?.activeTextStart}:${state.timing?.activeTextEnd}:${state.error}`;
      if(tick!==lastAudioTick){lastAudioTick=tick;setAudio(state);}
      const seek=pendingSeek.current;
      if(state.status==='playing'&&state.duration>0&&seek&&seek.cueId===state.cue?.id){
        pendingSeek.current=null;controller.seek(state.duration*seek.fraction);
      }
      if(state.status==='error'||state.status==='paused'&&state.error){
        running.current=false;setPlaying(false);
      }
    });
    return()=>{unsubscribe();controller.dispose();player.current=null;};
  },[]);

  useEffect(()=>{
    // First entry may mount inactive while another atlas mode is visible.
    // Only the unmodified saved position is eligible; explicit actions and
    // exact in-memory travel-review snapshots always take precedence.
    const origin=initialPosition.current,currentPosition=current.current;
    if(!options.active||restorationRevision.current!==0||running.current||restoredPresentation.current||origin.stage!==currentPosition.stage||origin.progress!==currentPosition.progress)return;
    const revision=restorationRevision.current,stage=origin.stage,progress=origin.progress;
    const source=cityLifeSceneToAudio(segmentsRef.current,progress)?.segment;
    if(!source)return;
    let cancelled=false;
    void readCityRecordedPresentation(segmentsRef.current,progress).then(value=>{
      const now=current.current,media=player.current?.snapshot;
      if(cancelled||!value||!latest.current.active||restorationRevision.current!==revision||running.current||restoredPresentation.current||now.stage!==stage||now.progress!==progress||media?.status!=='idle'||media.cue||value.cueId!==source.id||value.text!==source.text||value.rawProgress!==progress)return;
      const display=compatiblePresentation(now,value);
      if(!display)return;
      restoredPresentation.current={stage,progress,value:display};
      publishPresentation(value=>value+1);
    });
    return()=>{cancelled=true;};
  },[options.active]);
  useEffect(()=>{if(!options.active){running.current=false;player.current?.pause();setPlaying(false);}},[options.active]);
  useEffect(()=>{player.current?.setVolume(position.voice?1:0);},[position.voice]);
  useEffect(()=>{
    const controller=player.current;if(!controller)return;
    if(!playing||!running.current||!options.active||!options.ready){controller.pause();return;}
    if(prepared.current!==stageKey||controller.snapshot.status==='idle'||controller.snapshot.status==='ended'){
      const start=cityLifeSceneToAudio(segments,current.current.progress)!;
      prepared.current=stageKey;pendingSeek.current={cueId:start.segment.id,fraction:start.fraction};
      updateAt.current=0;void controller.start(start.queue);
    }else if(controller.snapshot.status==='paused'||controller.snapshot.status==='error')void controller.resume();
  },[playing,options.active,options.ready,stageKey,segments,playRequest]);
  useEffect(()=>{try{localStorage.setItem(cityComparisonStorageKey,JSON.stringify(position));}catch{/* The comparison remains usable without storage. */}},[position]);

  const setProgress=(value:number)=>{
    restoredPresentation.current=null;
    pause();const progress=clampCityProgress(value);
    current.current={...current.current,progress};setPosition(current.current);
    const controller=player.current,start=cityLifeSceneToAudio(segments,progress)!;
    if(prepared.current===stageKey&&controller?.snapshot.cue?.id===start.segment.id){
      pendingSeek.current={cueId:start.segment.id,fraction:start.fraction};
      if(controller.snapshot.duration)controller.seek(controller.snapshot.duration*start.fraction);
    }else{controller?.stop();prepared.current='';pendingSeek.current=null;}
  };
  const replay=()=>selectStage(current.current.stage,true);
  const replaySegment=()=>{
    // The learner may have inspected another city or paused mid-phrase. Rewind
    // the actual current recording, not its semantic display anchor or topic.
    const segment=cityLifeSceneToAudio(segmentsRef.current,current.current.progress)?.segment;
    if(segment)selectStage(current.current.stage,true,segment.start);
  };
  const playPause=()=>{
    restorationRevision.current++;
    if(running.current){pause();return;}
    if(current.current.progress>=1){replay();return;}
    if(!current.current.relief||!current.current.services||!current.current.built||!current.current.transfer){
      // Resume the learner's actual city/recording position after a manual
      // comparison. Only the explicit replay action restarts the whole topic.
      current.current={...current.current,relief:true,services:true,built:true,transfer:true};
      setPosition(current.current);
    }
    running.current=true;setPlaying(true);
  };
  const setVoice=(voice:boolean)=>{
    current.current={...current.current,voice};
    player.current?.setVolume(voice?1:0);setPosition(current.current);
  };
  const setRelief=(relief:boolean)=>{
    pause();current.current={...current.current,relief};setPosition(current.current);
  };
  const setServices=(services:boolean)=>{
    pause();current.current={...current.current,services};setPosition(current.current);
  };
  const setBuilt=(built:boolean)=>{
    pause();current.current={...current.current,built};setPosition(current.current);
  };
  const setTransfer=(transfer:boolean)=>{
    pause();current.current={...current.current,transfer};setPosition(current.current);
  };
  const sentencePosition=cityLifeSceneToAudio(segments,position.progress);
  const restored=restoredPresentation.current;
  const presentation=restored?.stage===position.stage&&restored.progress===position.progress?restored.value:undefined;
  const narrationTiming=presentation?.narrationTiming??(sentencePosition?narrationTimingForPlayback(sentencePosition.segment.text,sentencePosition.fraction,audio,sentencePosition.segment.id):undefined);
  const currentSentence=narrationTiming?.caption??'';
  const sceneProgress=presentation?.sceneProgress??cityNarrationSceneProgress(segments,position.progress,audio);
  const getPresentation=():CityComparisonPresentation=>({sceneProgress,narrationTiming:narrationTiming?{...narrationTiming}:undefined});
  const continuation=cityComparisonContinuation(position.stage,position.progress,segments);
  const continueReading=()=>{
    if(continuation.kind==='segment')setProgress(continuation.progress);
    else if(continuation.kind==='stage')selectStage(continuation.stage);
    else pause();
  };
  return {...position,sceneProgress,playing:playing&&options.active&&options.ready,audio,currentSentence,narrationTiming,continuation,continueReading,getPosition,getPresentation,restorePosition,selectStage,setProgress,pause,playPause,replay,replaySegment,setVoice,setRelief,setServices,setBuilt,setTransfer};
}
