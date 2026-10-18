import {useCallback,useEffect,useRef,useState} from 'react';
import {NarrationController,type NarrationState} from '../lib/narration';
type Cue={id:string;narration:string};
/** Each selected experiment owns its exact recording. Interaction stops it;
 * a new condition cannot inherit late words from an older audio request. */
export function useExplorationNarration(cue:Cue,ready:boolean){
 const [audio,setAudio]=useState<NarrationState>(),[voice,setVoice]=useState(true);
 const player=useRef<NarrationController|null>(null),latest=useRef({cue,ready});latest.current={cue,ready};
 useEffect(()=>{
  const controller=new NarrationController();player.current=controller;
  let tick='',at=0;
  const off=controller.subscribe(state=>{
   const current=latest.current;
   if(!state.cue||state.cue.id!==current.cue.id||state.cue.text!==current.cue.narration)return;
   const next=`${state.status}:${state.timing?.activeTextEnd}:${state.error}`;
   if(next===tick&&performance.now()-at<100)return;tick=next;at=performance.now();setAudio(state);
  });return()=>{off();controller.dispose();player.current=null;};
 },[]);
 const stop=useCallback(()=>{player.current?.stop();setAudio(undefined);},[]);
 const pause=useCallback(()=>player.current?.pause(),[]);
 useEffect(()=>{if(!ready)pause();},[ready,pause]);
 useEffect(()=>{stop();},[cue.id,cue.narration,stop]);
 useEffect(()=>{player.current?.setVolume(voice?1:0);},[voice]);
 const play=useCallback(()=>{
  const current=latest.current;if(!current.ready)return;
  const p=player.current;if(!p)return;
  if(p.snapshot.status==='playing'||p.snapshot.status==='loading'){p.pause();return;}
  if(p.snapshot.status==='paused'&&p.snapshot.cue?.id===current.cue.id)void p.resume();
  else void p.start([{id:current.cue.id,text:current.cue.narration}]);
 },[]);
 const matches=audio?.cue?.id===cue.id&&audio.cue.text===cue.narration;
 return {audio:matches?audio:undefined,timing:matches?audio?.timing:undefined,playing:matches&&audio?.status==='playing',loading:matches&&audio?.status==='loading',play,pause,stop,voice,setVoice};
}
