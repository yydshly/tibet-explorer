import {cityAccessChanges} from '../data/cityAccessChange';
import {cityAccessPhases,cityAccessPhaseProgress,cityAccessState} from '../lib/cityAccessState';
import type {useCityComparisonDirector} from '../hooks/useCityComparisonDirector';
import './CityAccessReading.css';
import CityLocalContext from './CityLocalContext';
import NarrationCaption from './NarrationCaption';
import {cityAccessAudioSegments} from '../lib/cityAccessAudio';
import {cityReadingCaption,cityReadingInterruption} from '../lib/cityReadingCaption';
import type {SyntheticEvent} from 'react';

type Director=ReturnType<typeof useCityComparisonDirector>;
export function cityAccessFeedback(director:Pick<Director,'progress'|'services'|'transfer'|'playing'|'currentSentence'>&Partial<Pick<Director,'narrationTiming'|'audio'|'relief'|'built'>>){
 const state=cityAccessState(director.progress),change=cityAccessChanges[state.cityId],part=change[state.phase];
 if(!director.services)return {state,change,title:`开通前：${change.before.label}`,text:'新增铁路或航空暂不参与，原有地面方式仍保留。',detail:change.before.text,narrated:false};
 if(director.transfer===false&&state.index>=2)return {state,change,title:'已经抵达，地方接续暂未参与',text:'旅途或货物标志停在到达端。接上地方服务，再看它怎样进入城市。',detail:change.transfer.text,narrated:false};
 const interruption=cityReadingInterruption(director);
 if(interruption)return {state,change,title:director.relief===false?'操作对照：暂时压平地形':'讲解需要恢复',text:interruption,narrated:false};
 const caption=cityReadingCaption(director,cityAccessAudioSegments);
 return {state,change,title:part.label,text:caption??part.text,narrated:caption!==undefined};
}

export default function CityAccessReading({director}:{director:Director}){
 const feedback=cityAccessFeedback(director),{state,change,title,text,narrated}=feedback;
 const pauseOnReading=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)director.pause();};
 return <div className="city-access-reading">
  <p className="city-access-event"><span>建设事件</span><strong>{change.eventDate}</strong>{change.eventTitle}</p>
  <CityLocalContext stage="development" progress={director.sceneProgress} onPause={director.pause}/>
  <nav className="city-access-phases" aria-label="直接对照交通进入生活的四个环节">{cityAccessPhases.map((phase,index)=><button key={phase.id} type="button" aria-pressed={state.phase===phase.id} onClick={()=>director.setProgress(cityAccessPhaseProgress(state.cityId,phase.id))}><small>{index+1}</small>{phase.label}</button>)}</nav>
  <fieldset className="city-life-maintenance"><legend>原有交通保留，新增方式改变什么？</legend><div><button type="button" aria-pressed={!director.services} onClick={()=>director.setServices(false)}>开通前：原有方式</button><button type="button" aria-pressed={director.services} onClick={()=>director.setServices(true)}>开通后：加入新方式</button></div><p>同一地形和用途，对照不同方式；不把历史开通当作今天的班次。</p></fieldset>
  <fieldset className="city-life-maintenance"><legend>列车到站或飞机落地以后</legend><div><button type="button" aria-pressed={director.transfer===false} onClick={()=>director.setTransfer(false)}>暂停地方接续</button><button type="button" aria-pressed={director.transfer!==false} onClick={()=>director.setTransfer(true)}>接上地方服务</button></div><p>操作会暂停讲解。留意同一个旅途或货物标志，是否从到达端接到了用途端。</p></fieldset>
  <article className="city-life-current city-access-current" aria-live="polite"><p className="city-access-phase-label">{state.index+1} / 4 · {cityAccessPhases[state.index].label}</p><h2>{title}</h2><p><NarrationCaption text={text} timing={narrated?director.narrationTiming:undefined}/></p></article>
  {'detail' in feedback&&<details className="city-access-case" onToggle={pauseOnReading}><summary>展开这一环节的资料说明</summary><p>{feedback.detail}</p></details>}
  <details className="city-access-case" key={state.cityId} onToggle={pauseOnReading}><summary>{change.caseTitle}</summary><p>{change.caseText}</p></details>
  <details className="city-access-case" onToggle={pauseOnReading}><summary>这组资料与演示的范围</summary><p>{change.scope}</p></details>
 </div>;
}
