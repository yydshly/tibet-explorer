import {useEffect,useRef,useState} from 'react';
import {createDeferredModuleLoader} from '../lib/deferredModuleLoader';
import type {TibetSceneProps} from './sceneTypes';
export type {SceneName,TibetSceneProps} from './sceneTypes';

// Stable module/component identity preserves cameras and the media clock when
// props change. Only the requested scene factory is loaded inside the runtime.
const sceneRuntime=createDeferredModuleLoader(()=>import('./TibetSceneRuntime'));
function moduleTiming(name:string,viewKey:string,requestedViewKey=viewKey){
 try{
  const detail={viewKey,requestedViewKey};performance.mark(name,{detail});
  if(new URLSearchParams(window.location.search).get('diagnostics')==='performance')console.info('tibet-performance '+JSON.stringify({name,timestamp:performance.now(),detail}));
 }catch{/* Optional local diagnostics never block the scene. */}
}

/** Render text and navigation before the WebGL code is downloaded. Import
 * completion is deliberately not scene readiness: the runtime owns that signal. */
export default function TibetScene(props:TibetSceneProps){
 const latest=useRef(props);latest.current=props;
 const [runtime,setRuntime]=useState(()=>sceneRuntime.peek());
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(runtime)return;
  let active=true;
  const requested=latest.current.viewKey||latest.current.scene;
  moduleTiming('tibet:scene-module-request',requested);
  sceneRuntime.load().then(module=>{
   if(!active)return;
   moduleTiming('tibet:scene-module-ready',latest.current.viewKey||latest.current.scene,requested);
   setRuntime(module);
  },()=>{
   if(!active)return;
   setFailed(true);
   moduleTiming('tibet:scene-module-error',latest.current.viewKey||latest.current.scene,requested);
   latest.current.onError?.('三维场景暂时未能加载。介绍与章节仍可阅读，请重新加载场景。');
  });
  return()=>{active=false;};
 },[runtime,attempt]);
 if(runtime){const SceneRuntime=runtime.default;return <SceneRuntime {...props}/>;}
 return <div className="tibet-scene-placeholder" aria-busy={!failed} style={{width:'100%',height:'100%',minHeight:220,position:'relative',overflow:'hidden'}}>
  {failed&&!props.onError&&<div role="alert"><p>三维场景暂时未能加载，介绍仍可阅读。</p><button type="button" onClick={()=>{setFailed(false);setAttempt(value=>value+1);}}>重新加载场景</button></div>}
 </div>;
}
