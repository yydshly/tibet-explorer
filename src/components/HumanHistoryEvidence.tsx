import {useState} from 'react';
import {ArrowSquareOut,Files} from '@phosphor-icons/react';
import {humanHistoryEvidenceForStep,resolveHumanHistoryPeriodId} from '../data/humanHistoryEvidence';
import {historyPeriods,sources} from '../data/curriculum';

export default function HumanHistoryEvidence({stepId,periodId,preferredEvidenceId,onInspect}:{stepId:string;periodId?:string;preferredEvidenceId?:string;onInspect:()=>void}){
 const period=stepId==='H2'?historyPeriods.find(item=>item.id===resolveHumanHistoryPeriodId(periodId)):undefined;
 const records=humanHistoryEvidenceForStep(stepId,periodId),[selections,setSelections]=useState<Record<string,string>>({});
 const context=`${stepId}:${period?.id??preferredEvidenceId??''}`,current=records.find(item=>item.id===selections[context])||records.find(item=>item.id===preferredEvidenceId)||records[0];
 if(!current){
  if(!period)return null;
  const backgroundSources=period.sourceIds.flatMap(id=>sources.find(source=>source.id===id)??[]);
  return <section className="human-evidence" aria-label="真实材料与解释范围">
   <header><Files size={15}/><h2>当前时期的材料</h2><small>专题材料待补</small></header>
   <strong>{period.label} · {period.title}</strong>
   <p className="material-claim">这个时期目前还没有已核对的专题材料卡。先由下列来源了解背景，不能用其他时期的材料代替。</p>
   <p className="evidence-purpose">这些是本时期的背景阅读入口，并不表示专题事件、文书或地方经验已经核实完整。</p>
   {backgroundSources.map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={onInspect}><span>{source.title}<small>{source.note??'背景资料 · 继续核对讨论范围与材料身份'}</small></span><ArrowSquareOut size={16}/></a>)}
  </section>;
 }
 return <section className="human-evidence" aria-label="真实材料与解释范围">
  <header><Files size={15}/><h2>用真实材料核对解释</h2><small>{records.length}份</small></header>
  <p className="evidence-purpose">{period&&<><b>{period.label} · {period.title}</b><br/></>}对照演示中的关系，再核对{period?'这个时期材料':'材料'}的地点、年代和身份。</p>
  <label>选择一份材料<select aria-label="选择真实材料" value={current.id} onChange={event=>{onInspect();setSelections(previous=>({...previous,[context]:event.target.value}));}}>{records.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
  <div className="material-identity"><span>{current.materialType}</span><span>{current.time}</span><span>{current.location}</span></div>
  <strong>{current.title}</strong><p className="material-claim">{current.claim}</p>
  <details key={current.id}><summary>这份材料支持什么，还不能回答什么</summary><div className="material-scope"><h3>可以支持的认识</h3><ul>{current.whatItSupports.map(text=><li key={text}>{text}</li>)}</ul><h3>不能直接推出</h3><ul>{current.whatItDoesNotSupport.map(text=><li key={text}>{text}</li>)}</ul><h3>来源身份与语境</h3><p>{current.source.identity}</p><p>{current.source.perspective}</p><h3>继续追问</h3><ul>{current.questions.map(text=><li key={text}>{text}</li>)}</ul></div></details>
  <a href={current.source.url} target="_blank" rel="noreferrer" onClick={onInspect}><span>{current.source.title}{current.source.year&&<small>{current.source.year}年资料 · 与事件年代分开</small>}</span><ArrowSquareOut size={16}/></a>
 </section>;
}
