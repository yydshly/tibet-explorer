import {lazy,Suspense,useEffect,useState} from 'react';
import ReferenceHome from './components/ReferenceHome';
import type {EntryAction} from './lib/entryAction';
import './app.css';
const StudyApp=lazy(()=>import('./App.tsx'));
const Overview=lazy(()=>import('./components/OverviewExperience'));
const ObservationPlanPage=lazy(()=>import('./components/ObservationPlanPage'));

// The product opens on the demonstration; the catalogue remains an optional route.
function entryHash(){
  if(!location.hash||/^#\/?(?:\?|$)/.test(location.hash)){
    history.replaceState(history.state,'',`${location.pathname}${location.search}#/overview?start=1`);
  }
  return location.hash;
}
const initialHash=entryHash();

/** Home can render without evaluating the complete course/director graph.
 * Optional tools retain the original application's navigation and storage. */
export default function Entry(){
  const [hash,setHash]=useState(initialHash),[action,setAction]=useState<EntryAction>(),[returnToOverview,setReturnToOverview]=useState(false);
  const overview=/^#?\/?overview(?:\?|$)/.test(hash),home=/^#\/home(?:\?|$)/.test(hash);
  useEffect(()=>{const changed=()=>{setHash(entryHash());setAction(undefined);window.scrollTo({top:0});};addEventListener('hashchange',changed);return()=>removeEventListener('hashchange',changed);},[]);
  useEffect(()=>{if(overview)try{localStorage.setItem('tibet-explorer.last-visit.v1','/overview');}catch{/* Storage is optional. */}},[overview]);
  const resume=(()=>{try{return localStorage.getItem('tibet-explorer.last-visit.v1')||'';}catch{return '';}})();
  const study=(next:EntryAction)=>{if(overview)setReturnToOverview(true);setAction(next);};
  return <Suspense fallback={<main className="app" aria-busy="true"><p role="status">正在准备这一部分…</p></main>}>
    {/^#\/observation-plan(?:\?|$)/.test(hash)?<ObservationPlanPage/>:action||!home&&!overview?<StudyApp initialAction={action} initialOverviewReturn={returnToOverview}/>:overview?
      <Overview onHome={()=>{location.hash='/home';}} onDetail={value=>study({kind:'detail',value})} onDirectory={()=>study({kind:'drawer',value:'contents'})} onMap={()=>study({kind:'city',value:'lhasa'})}/>
      :<ReferenceHome onStartEarth={()=>{location.hash='/overview?start=1';}} onContinue={()=>{location.hash=resume||'/overview';}} hasResume={Boolean(resume)}
        onCity={value=>study({kind:'city',value})} onTheme={value=>study({kind:'theme',value})} onDirectory={()=>study({kind:'drawer',value:'contents'})}
        onModels={()=>study({kind:'drawer',value:'models'})} onSaved={()=>study({kind:'drawer',value:'saved'})} onRecognitionNavigate={value=>study({kind:'recognition',value})}/>}
  </Suspense>;
}
