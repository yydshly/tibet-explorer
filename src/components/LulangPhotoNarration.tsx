import {useEffect,useRef,useState} from 'react';
import {NarrationController,type NarrationState} from '../lib/narration';
import {lulangPhotoReadings,lulangPhotoFocus} from '../data/lulangPhotoNarration';
import type {LulangPhotoId} from '../data/lulangLife';
import NarrationCaption from './NarrationCaption';

export default function LulangPhotoNarration({photoId,onFocus}:{photoId:LulangPhotoId;onFocus:(focus:number)=>void}){
 const player=useRef<NarrationController|null>(null),[state,setState]=useState<NarrationState>();
 const reading=lulangPhotoReadings[photoId];
 useEffect(()=>{const controller=new NarrationController();player.current=controller;const off=controller.subscribe(setState);return()=>{off();controller.dispose();player.current=null;};},[]);
 useEffect(()=>{if(state?.status==='playing'&&state.timing)onFocus(lulangPhotoFocus(photoId,state.timing.textProgress));},[photoId,state?.status,state?.timing?.textProgress,onFocus]);
 const play=()=>{const controller=player.current;if(!controller)return;controller.setVolume(1);if(state?.status==='playing'){controller.pause();return;}if(state?.status==='paused')void controller.resume();else void controller.start([{id:`ROUTE-PHOTO-${photoId}`,text:reading.narration}]);};
 return <div className="lulang-photo-narration" aria-label="当前实景有声讲解">
  <div><button onClick={play} disabled={state?.status==='loading'}>{state?.status==='playing'?'暂停这处讲解':state?.status==='loading'?'正在准备声音…':state?.status==='paused'?'继续这处讲解':'听这处实景讲解'}</button><small>MiniMax讲解 · 非现场环境声 · 返回线路后停止</small></div>
  {state?.error?<p role="alert">{state.error}</p>:state?.timing?<p><NarrationCaption text={state.timing.caption} timing={state.timing}/></p>:<p>可自主观察，也可听讲解，画面标注会跟随声音。</p>}
 </div>;
}
