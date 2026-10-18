import {useId,useState,type FormEvent,type Dispatch,type SetStateAction} from 'react';
import type {CityAccessCityId} from '../lib/cityAccessState';
import {travelAccessSegments,travelAccessGeometry,type TravelAccessSegment} from '../data/travelAccessSegments';
import {travelAccessOutcomes,travelAccessCheckError,updateTravelAccessCheck,type TravelAccessCheck,type TravelAccessDrafts,type TravelAccessVerificationBook} from '../lib/travelAccessVerification';
import './TravelAccessSegments.css';

export interface TravelAccessSegmentsProps {
 cityId:CityAccessCityId;
 onInspect?:(segment:TravelAccessSegment)=>void;
 value?:TravelAccessVerificationBook;
 /** Explicit retain/remove only; typing and map inspection never call this. */
 onChange?:(next:TravelAccessVerificationBook)=>void;
 drafts?:TravelAccessDrafts;
 onDraftsChange?:Dispatch<SetStateAction<TravelAccessDrafts>>;
 onPause?:()=>void;
}
const blank=():TravelAccessCheck=>({travelDate:'',checkedOn:'',source:'',sourceUrl:'',outcome:'needs-confirmation',notes:''});
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

/** Keep the whole-map explanation in the existing director. This compact
 * companion adds real endpoints, source dates and separately saved checks. */
export default function TravelAccessSegments({cityId,onInspect,value={},onChange,drafts:controlledDrafts,onDraftsChange,onPause}:TravelAccessSegmentsProps){
 const uid=useId();
 const [localDrafts,setLocalDrafts]=useState<TravelAccessDrafts>({});
 const [activeId,setActiveId]=useState<string>();
 const [feedback,setFeedback]=useState<{id:string;text:string}>();
 const drafts=controlledDrafts??localDrafts;
 const setDraft=(id:string,patch:Partial<TravelAccessCheck>)=>{
  onPause?.();
  const setDrafts=onDraftsChange??setLocalDrafts;
  setDrafts(previous=>({...previous,[id]:{...(previous[id]??value[id]??blank()),...patch}}));
  if(feedback?.id===id)setFeedback(undefined);
 };
 const save=(event:FormEvent,id:string,check:TravelAccessCheck)=>{
  event.preventDefault();onPause?.();const error=travelAccessCheckError(check,today());
  if(error){setFeedback({id,text:error});return;}
  onChange?.(updateTravelAccessCheck(value,id,check));
  setFeedback({id,text:'已保留本人记录；它只适用于所填日期，不代表平台核实或后续日期仍可用。'});
 };
 return <section className="travel-access-segments" aria-label="真实道路接续与出行核验">
  <div className="travel-access-heading"><span>把认识接到到访前</span><h3>逐段看真实接续</h3></div>
  <p className="travel-access-intro">先辨认道路与地形，再核实自己的接驳和访问条件。以下是观察次序与源图端点，未组成已核验的一日行程。</p>
  <ol>{travelAccessSegments[cityId].map((segment,index)=>{
   const record=value[segment.id],draft=drafts[segment.id]??record??blank(),prefix=`${uid}-${segment.id}`;
   const summary=record?`${record.travelDate} · ${travelAccessOutcomes.find(item=>item.id===record.outcome)?.label??'本人记录'}`:'出行日条件待核实';
   return <li key={segment.id} data-access-segment={segment.id}>
    <div className="travel-access-route"><span aria-hidden="true">{index+1}</span><div><b>{segment.from}</b><i aria-hidden="true">↓</i><b>{segment.to}</b><small>{segment.road}</small></div></div>
    <div className="travel-access-status"><span>{summary}</span>{onInspect&&<button type="button" data-review-key={`access-segment-${segment.id}`} aria-pressed={activeId===segment.id} onClick={()=>{onPause?.();setActiveId(segment.id);onInspect(segment);}}>在地图回看</button>}</div>
    <details onToggle={event=>{if(event.currentTarget.open)onPause?.();}}>
     <summary>看懂这一段 · 资料与待核实项</summary>
     <p>{segment.fact}</p><p className="travel-access-observe"><b>对应观察</b>{segment.observe}</p>
     <div className="travel-access-pending"><b>仍需按出行日核实</b><ul>{segment.pending.map(item=><li key={item}>{item}</li>)}</ul></div>
     <details className="travel-access-source-detail"><summary>端点范围和有日期的依据</summary>
      <p>{segment.geometryScope}</p>
      <p><a href={travelAccessGeometry.manifestUrl} target="_blank" rel="noreferrer" onClick={onPause}>源图获取 {travelAccessGeometry.acquiredOn} · 原始道路链</a><small>{travelAccessGeometry.credit}</small></p>
      <p>{travelAccessGeometry.scope}</p>
      <ul>{segment.sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" onClick={onPause}>{source.title}</a><small>资料发布日期 {source.publishedOn}</small><p>{source.supports}</p></li>)}</ul>
      <p className="travel-access-source-limit">本轮核对的是资料所述事件、道路联系和源图节点；当前路况、服务与开放状态仍未知。</p>
     </details>
     {record&&<div className="travel-access-record"><b>已保留的本人记录</b><p>适用 {record.travelDate} · 核验 {record.checkedOn}</p><p>{record.source}{record.sourceUrl&&<> · <a href={record.sourceUrl} target="_blank" rel="noreferrer" onClick={onPause}>出处链接</a></>}</p>{record.notes&&<p>{record.notes}</p>}</div>}
     {onChange&&<details className="travel-access-check"><summary>{record?'补充或修改本人核验记录':'记录我核实到的情况'}</summary>
      <form onSubmit={event=>save(event,segment.id,draft)} noValidate>
       <div className="travel-access-dates"><label htmlFor={`${prefix}-travel`}>适用出行日期<input id={`${prefix}-travel`} type="date" value={draft.travelDate} onInput={event=>setDraft(segment.id,{travelDate:event.currentTarget.value})} onChange={event=>setDraft(segment.id,{travelDate:event.currentTarget.value})}/></label><label htmlFor={`${prefix}-checked`}>实际核验日期<input id={`${prefix}-checked`} type="date" max={today()} value={draft.checkedOn} onInput={event=>setDraft(segment.id,{checkedOn:event.currentTarget.value})} onChange={event=>setDraft(segment.id,{checkedOn:event.currentTarget.value})}/></label></div>
       <label htmlFor={`${prefix}-source`}>核验出处<input id={`${prefix}-source`} type="text" maxLength={600} value={draft.source} placeholder="公告标题、发布单位或实际联系记录" onChange={event=>setDraft(segment.id,{source:event.target.value})}/></label>
       <label htmlFor={`${prefix}-url`}>出处链接（可留空）<input id={`${prefix}-url`} type="url" maxLength={1200} value={draft.sourceUrl??''} placeholder="https://…" onChange={event=>setDraft(segment.id,{sourceUrl:event.target.value})}/></label>
       <label htmlFor={`${prefix}-outcome`}>本人记录的结论<select id={`${prefix}-outcome`} value={draft.outcome} onChange={event=>setDraft(segment.id,{outcome:event.target.value as TravelAccessCheck['outcome']})}>{travelAccessOutcomes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
       <label htmlFor={`${prefix}-notes`}>说明具体核实了什么<textarea id={`${prefix}-notes`} rows={3} maxLength={800} value={draft.notes} placeholder="例如核实了接车地点，住宿入口仍待确认。" onChange={event=>setDraft(segment.id,{notes:event.target.value})}/></label>
       <p className="travel-access-record-scope">这是本人核验笔记。未填项目、日期变化或后续调整，仍需再核实；填写不会自动保存。</p>
       <div className="travel-access-record-actions"><button type="submit">保留这条本人记录</button>{record&&<button type="button" onClick={()=>{setDraft(segment.id,{});onChange(updateTravelAccessCheck(value,segment.id,undefined));setFeedback({id:segment.id,text:'已移除这条保存记录，当前填写内容仍作为未保存草稿保留。'});}}>移除保存记录</button>}</div>
      </form>
     </details>}
     {feedback?.id===segment.id&&<p className="travel-access-feedback" role="status">{feedback.text}</p>}
    </details>
   </li>;
  })}</ol>
 </section>;
}
