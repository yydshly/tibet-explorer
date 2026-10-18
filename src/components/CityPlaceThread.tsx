import {ArrowRight} from '@phosphor-icons/react';
import {useState,type SyntheticEvent} from 'react';
import {cityPlaceThreadReading,type CityPlaceThreadStep,type CityPlaceEvidenceCheck,type CityPlaceThreadFeature} from '../data/cityPlaceThreads';
import type {CityAccessCityId} from '../lib/cityAccessState';
import {cityComparisonSources,type CityComparisonStageId} from '../data/cityComparison';
import {cityPlaceEvidenceSources} from '../data/cityPlaceEvidence';
import {regionalPlaceSources} from '../data/regionalPlaceSources';
import './CityPlaceThread.css';

function PlaceEvidenceCheck({check,onPause}:{check:CityPlaceEvidenceCheck;onPause?:()=>void}){
 const [answer,setAnswer]=useState<string>();
 const selected=check.choices.find(choice=>choice.id===answer);
 return <details className="city-place-check" onToggle={event=>{if(event.currentTarget.open)onPause?.();}}><summary>用证据试答</summary><p>{check.question}</p><div>{check.choices.map(choice=><button key={choice.id} type="button" aria-pressed={answer===choice.id} onClick={()=>{onPause?.();setAnswer(choice.id);}}>{choice.label}</button>)}</div>{selected&&<p role="status" className={selected.correct?'is-supported':'is-review'}>{selected.feedback}</p>}</details>;
}

export default function CityPlaceThread({cityId,stage,progress,onNavigate,onInspectFeature,selectedFeatureId,onPause}:{cityId:CityAccessCityId;stage:CityComparisonStageId;progress:number;onNavigate:(step:CityPlaceThreadStep)=>void;onInspectFeature?:(feature:CityPlaceThreadFeature)=>void;selectedFeatureId?:string;onPause?:()=>void}){
 const {thread,place,samePlace,active,current,next,evidence}=cityPlaceThreadReading(cityId,stage,progress);
 const sourceIds=[...new Set([...(thread.context?.sourceIds??[]),...(evidence?.sourceIds??[])])];
 const sourceRecords=[...cityPlaceEvidenceSources,...cityComparisonSources,...regionalPlaceSources];
 const sources=sourceIds.flatMap(id=>sourceRecords.find(source=>source.id===id)??[]);
 const pauseOnOpen=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)onPause?.();};
 return <section className="city-place-thread" aria-label={`${thread.name}的事件到观察线索`}>
  <p><strong>{samePlace?`沿${thread.name}看同一处地方`:`回到${thread.name}的地方线索`}</strong><span>{thread.regionalName}</span></p>
  <nav aria-label={`${thread.name}的四段认识`}>{thread.steps.map((step,index)=><button key={step.id} type="button" aria-current={active===step.id?'step':undefined} title={step.title} data-review-key={`place-thread-${cityId}-${step.id}`} onClick={()=>onNavigate(step)}><small>0{index+1}</small>{step.label}</button>)}</nav>
  <p className="city-place-thread-question">{samePlace?current.question:`当前材料在${place?.placeName??thread.regionalName}。${thread.name}的事件与观察可沿这四段继续。`}</p>
  {evidence&&onInspectFeature&&<div className="city-place-feature-controls" aria-label="在同一地图辨认材料中的对象">{evidence.features.map(feature=><button key={feature.id} type="button" aria-pressed={selectedFeatureId===feature.id} onClick={()=>onInspectFeature(feature)}>{feature.label.replace('（源图名柳吾大桥）','')}</button>)}{selectedFeatureId&&<p role="status">已在现状地图标出所选对象；讲解暂停，位置与有日期的材料分别对照。</p>}</div>}
  {evidence&&<div className="city-place-evidence" aria-label={`${thread.name}当前环节的证据线索`}><p className="city-place-evidence-time">{evidence.time}</p><p>{evidence.fact}</p><p className="city-place-evidence-look"><span>在图上找</span>{evidence.lookAt}</p><details onToggle={pauseOnOpen}><summary>为什么这样理解 · 资料与边界</summary>{thread.context&&<p><strong>{thread.context.title}</strong>{thread.context.text}</p>}<p><strong>连接原因</strong>{evidence.reason}</p>{evidence.datedFollowUp&&<p><strong>{evidence.datedFollowUp.title}</strong>{evidence.datedFollowUp.text}</p>}<p><strong>材料能说到哪里</strong>{evidence.limit}</p><div className="city-place-evidence-sources">{sources.map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={onPause}>{source.title}</a>)}</div></details>{evidence.check&&<PlaceEvidenceCheck key={`${cityId}-${active}`} check={evidence.check} onPause={onPause}/>}</div>}
  {next&&<button className="city-place-thread-next" type="button" data-review-key={`place-thread-${cityId}-next`} onClick={()=>onNavigate(next)}>{samePlace?`沿${thread.name}继续：`:`进入${thread.name}线索：`}{next.title}<ArrowRight size={12}/></button>}
 </section>;
}
