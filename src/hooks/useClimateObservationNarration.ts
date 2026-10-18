import {useCallback,useEffect,useRef,useState} from 'react';
import {climateObservationNarrationStation,getClimateObservationNarration} from '../data/climateObservationNarration';
import {NarrationController,type NarrationState} from '../lib/narration';

const emptyAudio=():NarrationState=>({status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'});

/** An explicit observation recording owns only station attention and captions.
 * All three station values remain visible and fixed for the selected month.
 * The parent pauses the separate terrain director before entering this view. */
export function useClimateObservationNarration(options:{month:number;active:boolean}){
  const cue=getClimateObservationNarration(options.month);
  const [audio,setAudio]=useState<NarrationState>(emptyAudio),[playing,setPlaying]=useState(false),[voice,setVoiceState]=useState(true);
  const player=useRef<NarrationController|null>(null),latest=useRef({...options,cue});latest.current={...options,cue};
  const volume=useRef(voice);volume.current=voice;
  const pause=useCallback(()=>{player.current?.pause();setPlaying(false);},[]);

  useEffect(()=>{
    const controller=new NarrationController();player.current=controller;controller.setVolume(volume.current?1:0);
    let lastTick='',lastUpdateAt=-Infinity;
    const unsubscribe=controller.subscribe(state=>{
      const current=latest.current;
      if(state.cue&&(state.cue.id!==current.cue?.id||state.cue.text!==current.cue.narration||controller.snapshot.cue?.id!==state.cue.id))return;
      // A late loading resolution cannot start background narration on return.
      if(state.status==='playing'&&!current.active){controller.pause();return;}
      // Recording time remains the only presentation clock. Native word and
      // caption boundaries publish immediately; unchanged-word progress only
      // needs a readable 10Hz UI update instead of rerendering the whole atlas
      // on every audio RAF. This wall time throttles React, never scene timing.
      const timing=state.timing;
      const tick=JSON.stringify([state.status,state.cue?.id,state.duration,state.error,timing?.precision,timing?.timingLevel,
        timing?.activeTextStart,timing?.activeTextEnd,timing?.textStart,timing?.textEnd,timing?.caption]);
      const now=performance.now();
      if(tick===lastTick&&now-lastUpdateAt<100)return;
      lastTick=tick;lastUpdateAt=now;
      setAudio(state);setPlaying(state.status==='loading'||state.status==='playing');
    });
    return()=>{unsubscribe();controller.dispose();player.current=null;};
  },[]);
  useEffect(()=>{player.current?.stop();setAudio(emptyAudio());setPlaying(false);},[options.month]);
  useEffect(()=>{if(!options.active)pause();},[options.active,pause]);
  useEffect(()=>{player.current?.setVolume(voice?1:0);},[voice]);

  const playPause=useCallback(()=>{
    const current=latest.current,controller=player.current;
    if(!current.active||!current.cue||!controller)return;
    const state=controller.snapshot;
    if(state.status==='loading'||state.status==='playing'){pause();return;}
    if(state.cue?.id===current.cue.id&&state.cue.text===current.cue.narration&&['paused','error'].includes(state.status))void controller.resume();
    else void controller.start([{id:current.cue.id,text:current.cue.narration}]);
  },[pause]);
  const replay=useCallback(()=>{
    const current=latest.current;
    if(current.active&&current.cue)void player.current?.start([{id:current.cue.id,text:current.cue.narration}]);
  },[]);
  const setVoice=useCallback((value:boolean)=>{setVoiceState(value);player.current?.setVolume(value?1:0);},[]);
  const matches=cue&&audio.cue?.id===cue.id&&audio.cue.text===cue.narration;
  const currentAudio=matches?audio:emptyAudio(),timing=matches?audio.timing:undefined;
  return {
    supported:Boolean(cue),playing:playing&&options.active&&Boolean(cue),audio:currentAudio,timing,
    caption:timing?.caption??'',
    activeStationId:options.active?climateObservationNarrationStation(options.month,currentAudio):undefined,
    playPause,replay,pause,voice,setVoice,
  };
}
