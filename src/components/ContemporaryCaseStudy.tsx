import {useState} from 'react';
import {ArrowSquareOut,Play} from '@phosphor-icons/react';
import {contemporaryCasesForStep} from '../data/contemporaryCases';
import type {SceneSettings} from '../lib/store';

export default function ContemporaryCaseStudy({stepId,onInspect,onDemonstrate}:{stepId:string;onInspect:()=>void;onDemonstrate:(settings:Partial<SceneSettings>)=>void}){
 const records=contemporaryCasesForStep(stepId),[selected,setSelected]=useState('');
 const primary=stepId.startsWith('T')?records.find(item=>item.id==='lhasa-shannan-nyingchi-learning-corridor'):undefined;
 const current=records.find(item=>item.id===selected)||primary||records[0];if(!current)return null;
 return <section className="case-study" aria-label="具体地方的人物事件与原因">
  <header><span>把原理带回具体地方</span><h2>{current.title}</h2></header>
  {records.length>1&&<label className="plan-field">对照一个真实案例<select aria-label="选择地方案例" value={current.id} onChange={event=>{onInspect();setSelected(event.target.value);}}>{records.map(record=><option key={record.id} value={record.id}>{record.title}</option>)}</select></label>}
  <div className="case-location"><span>{current.location}</span><span>{current.time}</span></div>
  {current.person&&<p><strong>{current.person.name}</strong> · {current.person.role}</p>}
  <p className="case-question">{current.question}</p><p>{current.why}</p>
  {current.studyTarget&&<button type="button" className="case-demo-button" onClick={()=>onDemonstrate({...current.studyTarget,selected:''})}><Play size={13}/>对照这一段演示</button>}
  <details key={`${current.id}-method`}><summary>从事件与材料，怎样走到这个解释</summary>
   {current.namedEvents.map(event=><div className="case-source" key={`${event.title}-${event.date}`}><h3>{event.date} · {event.title}</h3><p>{event.place}；{event.dateMeaning}</p><small>{event.status==='proposal'?'材料所述提案':event.status==='observation'?'观测或调查区间':event.status==='publication'?'资料发表或审议':'历史事件'}</small></div>)}
   {current.howEvidence.map(text=><p key={text}>{text}</p>)}
   <h3>演示中应看到什么</h3><p>{current.operation.prompt}</p><p>{current.operation.observe}</p><p>{current.operation.feedback}</p><small>{current.operation.limit}</small>
   <h3>资料支持到哪里</h3><ul>{current.whatItSupports.map(text=><li key={text}>{text}</li>)}</ul><h3>还不能直接推出</h3><ul>{current.whatItDoesNotSupport.map(text=><li key={text}>{text}</li>)}</ul>
  </details>
  <details key={`${current.id}-sources`}><summary>查看本案例的真实依据 · {current.sources.length}份</summary>{current.sources.map(source=><div className="case-source" key={source.id}><a href={source.url} target="_blank" rel="noreferrer" onClick={onInspect}>{source.title}<ArrowSquareOut size={12}/></a><small>{source.year}年资料 · {source.identity}</small><p>{source.scope}</p></div>)}</details>
  <p className="case-bridge">{current.nextQuestion.bridge}</p>
 </section>;
}
