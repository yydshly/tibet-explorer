import {useEffect,useRef,useState} from 'react';
import {ArrowRight,MapPin} from '@phosphor-icons/react';
import TibetScene from '../scene/TibetScene';
import {spatialPresentationFor} from '../data/spatialPresentation';

export default function SpatialArrival({stepId,title,onComplete}:{stepId:string;title:string;onComplete:()=>void}){
 const context=spatialPresentationFor(stepId),[progress,setProgress]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(false),[hold,setHold]=useState(false);
 const complete=useRef(onComplete);complete.current=onComplete;
 useEffect(()=>{if(!context){complete.current();return;}if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){complete.current();return;}},[stepId]);
 useEffect(()=>{if(!ready||hold||error)return;let frame=0;const start=performance.now();const animate=()=>{const value=Math.min(1,(performance.now()-start)/4000);setProgress(value);if(value>=1)complete.current();else frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);return()=>cancelAnimationFrame(frame);},[ready,hold,error]);
 if(!context)return null;
 return <section className="spatial-arrival" style={{opacity:Math.min(1,(1-progress)/.15)}} aria-label="从整体地图进入当前演示"><TibetScene scene="region" viewKey="atlas-arrival" step={0} season={1} layer={`atlas-${context.origin.themeId}`} progress={progress} playing={false} selected={context.point.id} cutaway={false} resetKey={0} onSelect={()=>setHold(true)} onInteract={()=>setHold(true)} onReady={()=>setReady(true)} onError={()=>setError(true)}/><div className="arrival-heading"><span><MapPin size={14}/>先看整体，再走近</span><h2>{context.point.title}</h2><p>{context.identity}</p></div><div className="arrival-caption"><small>{error?'整体地图暂未展开，可直接进入介绍。':ready?context.limit:'正在展开有来源的整体地图…'}</small><strong>{title}</strong><button className="gold-button" onClick={()=>complete.current()}>进入详细演示<ArrowRight size={16}/></button>{hold&&<span>已停留，可转动地图；进入后继续原问题。</span>}</div></section>;
}
