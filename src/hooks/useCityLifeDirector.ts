import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {cityLifeNarrationSegments,getCityLifeJourney,type CityLifeStageId} from '../data/cityLifeJourney';
import {NarrationController,type NarrationState} from '../lib/narration';
import {cityLifeStageOrder,clampCityProgress,validateCityLifePosition,rememberCityLifePosition,cityLifeStagePosition,cityLifeFacetPosition,type CityLifePosition} from '../lib/cityLifeState';
import {cityLifeAudioToScene,cityLifeSceneToAudio} from '../lib/cityLifeAudio';
import {narrationTimingForPlayback} from '../lib/narrationTiming';
import {cityNarrationSceneProgress} from '../lib/cityNarrationSceneProgress';

const storageKey=(id:string)=>`tibet-explorer.city-life.v1.${id}`;
function readPosition(id:string,initialStage:CityLifeStageId):CityLifePosition {
  try{return validateCityLifePosition(id,JSON.parse(localStorage.getItem(storageKey(id))||'null'),initialStage);}
  catch{return validateCityLifePosition(id,null,initialStage);}
}
type Options={cityId:string;active:boolean;ready:boolean;facet:'position'|'environment'|'history'|'today';onStage:(stage:CityLifeStageId)=>void};
const emptyAudio:NarrationState={status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'};
type PendingSeek={cueId:string;fraction:number};

/** The regional atlas, text and audio share this reversible progress. */
export function useCityLifeDirector(options:Options){
  const [position,setPosition]=useState(()=>readPosition(options.cityId,options.facet==='history'?'history':'environment'));
  const [playing,setPlaying]=useState(false),[audio,setAudio]=useState(emptyAudio);
  const player=useRef<NarrationController|null>(null),prepared=useRef(''),pendingSeek=useRef<PendingSeek|null>(null);
  const latest=useRef(options);latest.current=options;
  const current=position.cityId===options.cityId?position:readPosition(options.cityId,options.facet==='history'?'history':'environment');
  const currentRef=useRef(current);currentRef.current=current;
  const running=useRef(playing);running.current=playing;
  const updateAt=useRef(0);
  const previousRoute=useRef<Pick<Options,'cityId'|'active'|'facet'>|null>(null);
  const pendingStageRoute=useRef<{cityId:string;stage:CityLifeStageId}|null>(null);
  const part=getCityLifeJourney(options.cityId)?.stages.find(item=>item.id===current.stage);
  const stageKey=`CITY-${options.cityId}-${current.stage}`;
  const segments=useMemo(()=>cityLifeNarrationSegments(options.cityId,current.stage),[options.cityId,current.stage]);
  const segmentsRef=useRef(segments);segmentsRef.current=segments;

  const commit=useCallback((next:CityLifePosition)=>{
    const remembered=rememberCityLifePosition(next);currentRef.current=remembered;setPosition(remembered);
  },[]);
  const updatePosition=useCallback((patch:Partial<Pick<CityLifePosition,'progress'|'maintained'|'voice'>>)=>{
    commit({...currentRef.current,...patch});
  },[commit]);

  const pause=useCallback(()=>{running.current=false;player.current?.pause();setPlaying(false);},[]);
  const selectStage=useCallback((stage:CityLifeStageId,run=false)=>{
    running.current=false;
    player.current?.stop();prepared.current='';pendingSeek.current=null;
    const base=currentRef.current.cityId===latest.current.cityId?currentRef.current:readPosition(latest.current.cityId,stage);
    const next=cityLifeStagePosition(base,stage,true),targetFacet=stage==='history'?'history':'environment';
    pendingStageRoute.current=!latest.current.active||latest.current.facet!==targetFacet?{cityId:latest.current.cityId,stage}:null;
    commit(next);
    // This explicit selection may precede the hash change while the director is
    // inactive. Persist its intent, but never persist passive inactive renders.
    try{localStorage.setItem(storageKey(next.cityId),JSON.stringify(next));}catch{/* The route still opens the selected stage. */}
    running.current=run;setPlaying(run);latest.current.onStage(stage);
  },[commit]);
  const advance=useRef(()=>{});
  advance.current=()=>{
    const index=cityLifeStageOrder.indexOf(currentRef.current.stage);
    if(index<2)selectStage(cityLifeStageOrder[index+1],true);
    else{running.current=false;setPlaying(false);updatePosition({progress:1});}
  };
  useEffect(()=>{
    const controller=new NarrationController({onCue:cue=>{
      const segment=segmentsRef.current.find(item=>item.id===cue.id);
      if(!segment||player.current?.snapshot.cue?.id!==cue.id||!running.current||!latest.current.active||!latest.current.ready||pendingSeek.current!==null)return;
      updateAt.current=0;
      updatePosition({progress:segment.start});
    },onProgress:(progress,state)=>{
      const sceneProgress=cityLifeAudioToScene(segmentsRef.current,state.cue?.id??'',progress);
      if(sceneProgress===undefined||player.current?.snapshot.cue?.id!==state.cue?.id||!running.current||!latest.current.active||!latest.current.ready||pendingSeek.current!==null)return;
      const now=performance.now();if(progress<1&&now-updateAt.current<100)return;updateAt.current=now;
      updatePosition({progress:sceneProgress});
    },onEnded:state=>{
      if(running.current&&latest.current.active&&latest.current.ready&&player.current?.snapshot.cue?.id===state.cue?.id&&segmentsRef.current.at(-1)?.id===state.cue?.id)advance.current();
    }});
    player.current=controller;
    controller.setVolume(currentRef.current.voice?1:0);
    let lastAudioTick='';
    const unsubscribe=controller.subscribe(state=>{
      if(state.cue&&(!segmentsRef.current.some(item=>item.id===state.cue?.id)||controller.snapshot.cue?.id!==state.cue.id))return;
      const tick=`${state.status}:${state.cue?.id}:${Math.floor(state.progress*100)}:${state.timing?.precision}:${state.timing?.textStart}:${state.timing?.textEnd}:${state.timing?.activeTextStart}:${state.timing?.activeTextEnd}:${state.error}`;
      if(tick!==lastAudioTick){lastAudioTick=tick;setAudio(state);}
      const seek=pendingSeek.current;
      if(state.status==='playing'&&state.duration>0&&seek&&seek.cueId===state.cue?.id){pendingSeek.current=null;controller.seek(state.duration*seek.fraction);}
      if(state.status==='error'||state.status==='paused'&&state.error){running.current=false;setPlaying(false);}
    });
    return()=>{unsubscribe();controller.dispose();player.current=null;};
  },[updatePosition]);
  // A facet change is navigation, not a replay. Re-entering from comparison
  // also reads fresh storage because its entry action can write the target city.
  useEffect(()=>{
    const previous=previousRoute.current;previousRoute.current={cityId:options.cityId,active:options.active,facet:options.facet};
    if(!options.active){pause();return;}
    const pending=pendingStageRoute.current;
    if(pending?.cityId===options.cityId){
      const expected=pending.stage==='history'?'history':'environment';
      if(options.facet===expected)pendingStageRoute.current=null;
      // An explicit selectStage owns the short interval before hashchange.
      return;
    }
    pendingStageRoute.current=null;
    const entering=!previous?.active||previous.cityId!==options.cityId;
    const base=entering?readPosition(options.cityId,options.facet==='history'?'history':'environment'):currentRef.current;
    const next=cityLifeFacetPosition(base,options.facet);
    if(entering||next.stage!==currentRef.current.stage){
      pause();player.current?.stop();prepared.current='';pendingSeek.current=null;commit(next);
    }
  },[options.active,options.cityId,options.facet,pause,commit]);
  useEffect(()=>{player.current?.setVolume(current.voice?1:0);},[current.voice]);
  useEffect(()=>{
    const controller=player.current;if(!controller||!part||!segments.length)return;
    if(!playing||!running.current||!options.active||!options.ready){controller.pause();return;}
    if(prepared.current!==stageKey||controller.snapshot.status==='idle'||controller.snapshot.status==='ended'){
      const position=cityLifeSceneToAudio(segments,currentRef.current.progress)!;
      prepared.current=stageKey;pendingSeek.current={cueId:position.segment.id,fraction:position.fraction};
      updateAt.current=0;
      void controller.start(position.queue);
    }else if(controller.snapshot.status==='paused'||controller.snapshot.status==='error')void controller.resume();
  },[playing,options.active,options.ready,stageKey,part,segments]);
  useEffect(()=>{
    if(!options.active||position.cityId!==options.cityId||position!==currentRef.current)return;
    try{localStorage.setItem(storageKey(position.cityId),JSON.stringify(position));}catch{/* Reading remains available. */}
  },[position,options.cityId,options.active]);

  const setProgress=(value:number)=>{pause();const progress=clampCityProgress(value);updatePosition({progress});
    const controller=player.current,position=cityLifeSceneToAudio(segments,progress);
    if(position&&prepared.current===stageKey&&controller?.snapshot.cue?.id===position.segment.id){
      pendingSeek.current={cueId:position.segment.id,fraction:position.fraction};
      if(controller.snapshot.duration)controller.seek(controller.snapshot.duration*position.fraction);
    }else{controller?.stop();prepared.current='';pendingSeek.current=null;}};
  const replay=()=>selectStage(currentRef.current.stage,true);
  const playPause=()=>{if(playing){pause();return;}if(!current.maintained||current.progress>=1){replay();return;}running.current=true;setPlaying(true);};
  const setVoice=(voice:boolean)=>{player.current?.setVolume(voice?1:0);updatePosition({voice});};
  const setMaintained=(maintained:boolean)=>{pause();updatePosition({maintained});};
  const sentencePosition=cityLifeSceneToAudio(segments,current.progress);
  const narrationTiming=sentencePosition?narrationTimingForPlayback(sentencePosition.segment.text,sentencePosition.fraction,audio,sentencePosition.segment.id):undefined;
  const currentSentence=narrationTiming?.caption??'';
  const sceneProgress=cityNarrationSceneProgress(segments,current.progress,audio);
  return {...current,sceneProgress,playing:playing&&options.active&&options.ready,part,audio,currentSentence,narrationTiming,pause,selectStage,setProgress,setMaintained,setVoice,playPause,replay};
}
