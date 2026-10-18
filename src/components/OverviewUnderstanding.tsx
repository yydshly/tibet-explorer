import {useState} from 'react';
import {understandingChecks} from '../data/overviewLearning';
const key=(id:string)=>`tibet-understanding.20261018.${id}`;
function initial(id:string){try{const value=JSON.parse(localStorage.getItem(key(id))||'{}');return {answer:typeof value.answer==='string'?value.answer.slice(0,1600):'',verdict:value.verdict==='clear'||value.verdict==='unclear'?value.verdict:''};}catch{return {answer:'',verdict:''};}}
export default function OverviewUnderstanding({chapterId,onPause,onRevisit}:{chapterId:string;onPause:()=>void;onRevisit:(id:string)=>void}){
 const check=understandingChecks[chapterId];const [record,setRecord]=useState(()=>initial(chapterId));const [hint,setHint]=useState(false);const [saved,setSaved]=useState(false);
 if(!check)return null;
 const save=(verdict:string)=>{const next={...record,verdict};setRecord(next);try{localStorage.setItem(key(chapterId),JSON.stringify({...next,hintSeen:hint}));setSaved(true);}catch{setSaved(false);}};
 return <details className="overview-understanding" onToggle={e=>{if(e.currentTarget.open)onPause();}}>
  <summary>理解检查：我能解释变化和原因吗？</summary>
  <p>{check.prompt}</p><label>先用自己的话说明<textarea value={record.answer} maxLength={1600} rows={4} placeholder="我看到……发生了变化，因为……；资料还不能说明……" onChange={e=>{setRecord({...record,answer:e.target.value,verdict:''});setSaved(false);}}/></label>
  <button onClick={()=>setHint(v=>!v)}>{hint?'收起核对要点':'写完后查看核对要点'}</button>
  {hint&&<ul>{check.points.map(point=><li key={point}>{point}</li>)}</ul>}
  <div><button disabled={!record.answer.trim()} aria-pressed={record.verdict==='clear'} onClick={()=>save('clear')}>我能说明</button><button aria-pressed={record.verdict==='unclear'} onClick={()=>save('unclear')}>还不清楚</button><button onClick={()=>onRevisit(check.revisit)}>回看关键演示</button></div>
  <small role="status">{saved?'已保存在本机。自评不是自动判分，也不代表理解已验收。':'记录只保存在本机；可跳过，不影响主线。'}</small>
 </details>;
}
