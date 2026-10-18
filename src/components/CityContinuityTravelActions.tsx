import {useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowRight,Check,MapPin,Plus} from '@phosphor-icons/react';
import type {Exploration} from '../lib/store';
import {appendCityContinuityTravel,appendCityContinuityTravelStop,appendCityContinuityTravelQuestion,cityContinuityTravelPlan,cityContinuityTravelEvidence,cityContinuityTravelQuestions,cityContinuityTravelCheck,cityContinuityTravelContext,cityTravelObservationSaved,cityTravelObservationFits,type CityContinuityTravelId,type CityTravelObservationLink,type CityTravelObservationQuestion} from '../lib/cityContinuityTravel';
import {cityTravelOrigin} from '../lib/cityTravelOrigin';
import {cityTravelObservationReviewTargets,type CityTravelReviewTarget} from '../lib/cityTravelReview';
import {cityLocalObservationNote,type CityLocalObservationPoint} from '../lib/cityLocalGeography';
import CityLocalObservationChoices from './CityLocalObservationChoices';
import TravelAccessSegments from './TravelAccessSegments';
import type {TravelAccessDrafts} from '../lib/travelAccessVerification';
import type {TravelAccessSegment} from '../data/travelAccessSegments';
import './CityContinuityTravelActions.css';

export type CityTravelChoices=Record<string,CityTravelObservationLink>;
export interface CityContinuityTravelActionsProps {
 cityId:CityContinuityTravelId;
 saved:Exploration;
 onSave:Dispatch<SetStateAction<Exploration>>;
 onTravel:()=>void;
 onPause?:()=>void;
 onReviewAccess?:(cityId:CityContinuityTravelId)=>void;
 onReviewProcess?:(target:CityTravelReviewTarget)=>void;
 choices?:CityTravelChoices;
 onChoicesChange?:Dispatch<SetStateAction<CityTravelChoices>>;
 localObservations?:Record<string,CityLocalObservationPoint>;
 onLocalObservationChange?:(stopId:string,point:CityLocalObservationPoint|undefined)=>void;
 originHash?:string;
 accessDrafts?:TravelAccessDrafts;
 onAccessDraftsChange?:Dispatch<SetStateAction<TravelAccessDrafts>>;
 onInspectAccess?:(segment:TravelAccessSegment)=>void;
}

/** Removed stops retain notes for recovery; retained text alone is not a saved candidate. */
export function cityTravelQuestionInPlan(saved:Exploration,stopId:string,question:CityTravelObservationQuestion|undefined,point?:CityLocalObservationPoint):boolean {
 return Boolean(question&&saved.route.includes(stopId)&&cityTravelObservationSaved(saved.stopNotes[stopId],question)&&(!point||saved.stopNotes[stopId]?.includes(cityLocalObservationNote(point))));
}

export default function CityContinuityTravelActions({cityId,saved,onSave,onTravel,onPause,onReviewAccess,onReviewProcess,choices:controlledChoices,onChoicesChange,localObservations,onLocalObservationChange,originHash,accessDrafts,onAccessDraftsChange,onInspectAccess}:CityContinuityTravelActionsProps){
 const [localChoices,setLocalChoices]=useState<CityTravelChoices>({});
 const choices=controlledChoices??localChoices;
 const setChoices=onChoicesChange??setLocalChoices;
 const plan=cityContinuityTravelPlan(cityId);
 const added=plan.stops.filter(stop=>saved.route.includes(stop.id)).length;
 const allAdded=added===plan.stops.length;
 const savedHere=allAdded&&plan.stops.every(stop=>cityTravelOrigin(saved.stopOrigins?.[stop.id]));
 const evidence=[...new Map(plan.stops.flatMap(stop=>cityContinuityTravelEvidence(stop.id)).map(source=>[source.url,source])).values()];
 const currentOrigin=()=>originHash??(typeof window!=='undefined'?window.location.hash:undefined);
 const save=()=>{onPause?.();const origin=currentOrigin();onSave(previous=>appendCityContinuityTravel(previous,cityId,origin));};
 const saveStop=(stopId:string)=>{onPause?.();const origin=currentOrigin();onSave(previous=>appendCityContinuityTravelStop(previous,cityId,stopId,origin));};
 const saveQuestion=(stopId:string,link:CityTravelObservationLink)=>{onPause?.();const origin=currentOrigin();onSave(previous=>appendCityContinuityTravelQuestion(previous,cityId,stopId,link,origin,localObservations?.[stopId]));};
 return <section className="city-continuity-plan" aria-label={`${plan.title}的可编辑观察计划`}>
  <p className="city-continuity-kicker"><MapPin size={13} aria-hidden="true"/>把当前地方带走</p>
  <h3 tabIndex={-1}>{plan.title}</h3><p>{plan.purpose}</p>
  {onReviewAccess&&<button className="city-continuity-review-access" type="button" onClick={()=>{onPause?.();onReviewAccess(cityId);}}>回看这组交通变化<ArrowRight size={13} aria-hidden="true"/></button>}
  <p className="city-continuity-observation-intro">先选这一站要追问的环节，再把问题加入笔记。候选顺序沿用前面“地形与原有通行 → 开通选择 → 地方接续 → 文化和生活”的认识；保存问题不表示已经观察。</p>
  <ol>{plan.stops.map((stop,index)=>{
   const addedStop=saved.route.includes(stop.id);
   const savedStopHere=addedStop&&Boolean(cityTravelOrigin(saved.stopOrigins?.[stop.id]));
   const questions=cityContinuityTravelQuestions(stop.id);
   const selected=questions.find(question=>question.id===choices[stop.id]);
   const material=selected?cityContinuityTravelContext(stop.id,selected.id):undefined;
   const reviewTargets=selected&&onReviewProcess?cityTravelObservationReviewTargets(cityId,stop.id,selected.id):[];
   const point=localObservations?.[stop.id];
   const questionSaved=cityTravelQuestionInPlan(saved,stop.id,selected,point);
   const fits=!selected||cityTravelObservationFits(saved.stopNotes[stop.id],selected,point);
   return <li key={stop.id}><span>{index+1}</span><div className="city-continuity-stop">
    <strong>{stop.name}</strong><p>{stop.question}</p>{addedStop&&<small><Check size={12} aria-hidden="true"/>已在我的计划中</small>}
    <details className="city-continuity-observation" open={index===0||Boolean(choices[stop.id])||Boolean(point)}>
     <summary>带着哪一环去观察</summary>
     <fieldset><legend className="city-continuity-question-legend">为{stop.name}选择要保存的问题</legend>{questions.map(question=><label key={question.id} className={selected?.id===question.id?'is-selected':''}>
      <input type="radio" name={`city-travel-question-${stop.id}`} value={question.id} checked={selected?.id===question.id} onChange={()=>{onPause?.();setChoices(previous=>({...previous,[stop.id]:question.id}));}}/>
      <span><b>{question.label}</b><span>{question.question}</span></span>
     </label>)}</fieldset>
     {material&&<div className="city-continuity-question-material"><b>前面对应的地方材料 · {material.title}</b><p>{material.text}</p>{reviewTargets.length>0&&<div className="city-continuity-question-reviews">{reviewTargets.map(target=><button type="button" key={target.key} data-review-key={target.key} onClick={()=>{onPause?.();onReviewProcess?.(target);}}>{target.label}<ArrowRight size={12} aria-hidden="true"/></button>)}</div>}</div>}
     {onLocalObservationChange&&<CityLocalObservationChoices stopId={stop.id} selected={point} onSelect={value=>{onPause?.();onLocalObservationChange(stop.id,value);}}/>}
     <p className="city-continuity-check"><b>到访前待核验</b>{cityContinuityTravelCheck(stop.id)}</p>
     {selected&&<div className="city-continuity-question-save"><button type="button" disabled={Boolean(questionSaved)||!fits} onClick={()=>saveQuestion(stop.id,selected.id)}>{questionSaved?<Check size={13} aria-hidden="true"/>:<Plus size={13} aria-hidden="true"/>}{questionSaved?'这条问题已在本站笔记中':addedStop?'将所选问题加入本站笔记':'加入此站并保存所选问题'}</button><p role="status">{!fits?'本站笔记已接近1500字上限；请先在路线中整理笔记，再加入完整问题。':questionSaved?'原笔记与问题已保留，可在路线中继续编辑。':'只在点击后追加这条问题，不替换原笔记；整组添加不会补写已留空的笔记。'}</p></div>}
    </details>
    <button className="city-continuity-add-stop" type="button" disabled={savedStopHere} onClick={()=>saveStop(stop.id)}>{addedStop?<Check size={12} aria-hidden="true"/>:<Plus size={12} aria-hidden="true"/>}{savedStopHere?'本站已加入':addedStop?'保留本站地图入口':'只加入此站，稍后补问题'}</button>
   </div></li>;
  })}</ol>
  <TravelAccessSegments cityId={cityId} value={saved.accessVerifications} onChange={book=>onSave(previous=>({...previous,accessVerifications:book}))} drafts={accessDrafts} onDraftsChange={onAccessDraftsChange} onPause={onPause} onInspect={onInspectAccess}/>
  <p className="city-continuity-plan-scope">{plan.scope}</p>
  <details className="city-continuity-plan-evidence"><summary>核对地方资料 · {evidence.length}项</summary>{evidence.map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={onPause}>{source.title}</a>)}</details>
  <div className="city-continuity-plan-actions"><button type="button" disabled={savedHere||!plan.stops.length} onClick={save}>{savedHere?<Check size={14} aria-hidden="true"/>:<Plus size={14} aria-hidden="true"/>}{savedHere?'这组观察已加入':allAdded?'保留这组地图入口':'加入这组地方观察'}</button><button type="button" onClick={()=>{onPause?.();onTravel();}}>查看并调整已选路线<ArrowRight size={13} aria-hidden="true"/></button></div>
  <p className="city-continuity-plan-status" role="status">本组已加入 {added} / {plan.stops.length} 站。整组添加保留原有路线和已编辑或留空的问题，不会自动加入上面尚未保存的问题；可在旅行线路中修改、移除和调整顺序，关闭面板回到当前地图。</p>
 </section>;
}
