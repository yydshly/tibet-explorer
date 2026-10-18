import {useEffect,useRef,useState,type MouseEvent} from 'react';
import {readExploration,writeExploration,settingsForStep} from '../lib/store';
import {chapters,travelStops} from '../data/curriculum';
import {observationReturnHash} from '../lib/overviewObservation';
import ObservationOrigin from './ObservationOrigin';
import DrawerContent from './DrawerContent';
import './ObservationPlanPage.css';
export default function ObservationPlanPage(){
 const [saved,setSaved]=useState(readExploration),[status,setStatus]=useState(''),[ok,setOk]=useState(true);
 const latest=useRef(saved);latest.current=saved;
 const stopId=new URLSearchParams(location.hash.split('?')[1]||'').get('stop')||saved.route.find(id=>saved.overviewObservations?.[id])||'';
 const stop=saved.route.includes(stopId)?travelStops.find(s=>s.id===stopId):undefined,origin=saved.overviewObservations?.[stopId];
 const save=()=>{const success=writeExploration(latest.current);setOk(success);setStatus(success?'已保存到当前浏览器，可刷新后继续。':'保存失败；请用下方导出计划保留修改。');return success;};
 useEffect(()=>{const success=writeExploration(saved);setOk(success);setStatus(success?'已保存到当前浏览器，可刷新后继续。':'保存失败；请用下方导出计划保留修改。');},[saved]);
 const back=()=>{if(save())location.hash=origin?observationReturnHash(stopId):'/overview';};
 const chapter=chapters.find(c=>c.id==='travel')!,step=chapter.steps[0];
 return <main className="observation-plan-page"><header><a href="#/overview">西藏探索</a><span>把主线认识带回地方</span></header><h1>我的观察计划</h1><p>沿用已有候选地点与笔记。这是观察和研读计划，交通、开放与实际可达位置仍需按日期核实。</p>
  <div className="observation-plan-actions"><button onClick={save}>保存计划</button><button onClick={back}>保存并回到原讲述</button><span role="status">{status}</span></div>
  {stop&&<section className="observation-plan-focus"><h2>这次继续观察：{stop.name}</h2><ObservationOrigin origin={origin} stopId={stopId} onReturn={eventSafeReturn}/><label>我的观察问题与待核实事项<textarea aria-label="我的观察问题与待核实事项" rows={5} maxLength={1500} value={saved.stopNotes[stopId]??''} onChange={e=>{setStatus('正在保存…');setSaved(p=>({...p,route:[...new Set([...p.route,stopId])],stopNotes:{...p.stopNotes,[stopId]:e.target.value}}));}}/></label><small>原有笔记保留；上方主线问题和资料单独保存，不覆盖你的文字。</small></section>}
  <details className="observation-plan-full"><summary>编辑候选顺序、日期与交通 / 导出完整计划</summary><DrawerContent kind="travel" chapter={chapter} step={step} settings={settingsForStep(step)} saved={saved} setSaved={setSaved} navigate={()=>{}} open={kind=>{if(kind===null)back();}} notify={setStatus} feedback=""/></details>
  {!ok&&<p role="alert">当前修改尚未成功写入浏览器。</p>}
 </main>;
 function eventSafeReturn(event:MouseEvent<HTMLAnchorElement>){event.preventDefault();back();}
}
