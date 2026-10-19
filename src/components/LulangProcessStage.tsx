import {ArrowRight,Package,PauseCircle,CheckCircle} from '@phosphor-icons/react';
import {lulangCookingIllustration,lulangCookingState,lulangCookingSteps,lulangLifePhase,lulangLifeRecord,lulangMediaFeedback} from '../data/lulangLife';
import type {PilotView} from '../data/routePilot';
import './LulangProcessStage.css';

type Props={view:PilotView;onChange:(patch:Partial<PilotView>)=>void};
/** Crops the existing illustration, never a new kitchen or documentary frame. */
function Utensil({step}:{step:number}){
 return <div className="lulang-utensil"><img src={lulangCookingIllustration.src} alt={`工序插画近看：${lulangCookingSteps[step].title}`} draggable={false} style={{transform:`translate(${-step*25}%,-50%)`}}/></div>;
}
export default function LulangProcessStage({view,onChange}:Props){
 const phase=lulangLifePhase(view),cooking=lulangCookingState(view),record=lulangLifeRecord(view);
 const step=cooking.step,within=Math.min(1,cooking.progress*4-step),last=step===3;
 const change=(patch:Partial<PilotView>)=>onChange({placeMedia:'process',placeLens:'culture',servicesVisible:true,serviceFilter:'food',...patch});
 return <div className="lulang-process-observation" data-process-phase={phase} data-supply-blocked={!cooking.supply}>
  <div className="lulang-process-scene" aria-label={phase==='making'?'制作工序近看':phase==='supply'?'供货接到备料的条件对照':'一锅菜接到餐饮服务的示意'}>
   {phase==='making'?<>
    <div className="lulang-utensil-focus"><span className="lulang-current-step">{String(step+1).padStart(2,'0')} / 04 · {lulangCookingSteps[step].short}</span><Utensil step={step}/><div className="lulang-work-sweep" style={{width:`${within*100}%`}}/></div>
    <div className="lulang-process-connection"><small>看清工序怎样接续</small><h3>{lulangCookingSteps[step].title}</h3><p>{['鲜鸡初加工、焯水后，捞出备用。','炒锅处理之后，再接入煮制。','煮熟后转入石锅，不是在石锅内完成全部工序。','转入石锅煨煮，再接到餐饮服务。'][step]}</p><div className="lulang-next-stage"><ArrowRight size={21}/><span>{last?'下一步 · 经营与接待':`接下来 · ${lulangCookingSteps[step+1].title}`}</span></div><button onClick={()=>last?change({lifePhase:'service'}):change({cookingProgress:(step+1.5)/4})}>{last?'看怎样接待':'接到下一道工序'}</button></div>
   </>:phase==='supply'?<>
    <div className="lulang-supply-origin"><Package size={47} weight="duotone"/><strong>{cooking.supply?'组织供货':'供货条件移去'}</strong><span>2017年记录</span></div>
    <div className="lulang-supply-transfer" aria-label={cooking.supply?'原料条件接到备料':'下一锅原料未接入'}><div className="lulang-supply-track"/><span className="lulang-supply-parcel"><Package size={23}/></span>{!cooking.supply&&<div className="lulang-supply-gate"><PauseCircle size={29}/><strong>下一锅<br/>备料等待</strong></div>}<small>{cooking.supply?'接到备料':'缺口在这里'}</small></div>
    <div className="lulang-supply-destination"><Utensil step={0}/><strong>{cooking.supply?'原料接入，再开始制作':'下一锅尚未开始'}</strong></div>
   </>:<>
    <div className="lulang-service-table"><div className="lulang-table-surface"/><Utensil step={3}/><span>制作接到一餐服务</span></div>
    <div className="lulang-service-order" aria-label="2022年公开解读中的服务环节示意"><span>服务要求示意 · 非商户实单</span><h3>风味之外，还要接得上</h3><p><CheckCircle size={18}/><span><strong>订餐确认</strong>人数、时间、忌口</span></p><p><CheckCircle size={18}/><span><strong>菜谱公开</strong>明码标价，记录点菜</span></p><p><CheckCircle size={18}/><span><strong>到店接待</strong>安排桌次，说明等候</span></p><small>2017：商户诚信承诺<br/>2022：制作与服务要求</small></div>
   </>}
  </div>
  {phase==='making'?<><nav className="lulang-cooking-steps" aria-label="制作工序">{lulangCookingSteps.map((s,i)=><button key={s.title} aria-pressed={step===i} onClick={()=>change({lifePhase:'making',cookingProgress:(i+.5)/4})}><span>{i+1}</span>{s.title}</button>)}</nav><label className="lulang-process-scrub">拖动看工序接续<input aria-label="制作工序进度" type="range" min="0" max="1" step=".01" value={cooking.requested} onChange={e=>change({cookingProgress:Number(e.target.value)})}/></label></>:phase==='supply'?<div className="lulang-supply-comparison"><button aria-pressed={cooking.supply} onClick={()=>change({cultureSupply:true,lifePhase:'supply'})}>接上供货条件</button><button aria-pressed={!cooking.supply} onClick={()=>change({cultureSupply:false})}>移去供货条件</button><button disabled={!cooking.supply} onClick={()=>change({lifePhase:'making',cookingProgress:0})}>看原料怎样进入制作 →</button></div>:<button className="lulang-service-to-daily" onClick={()=>change({placeMedia:'daily',photoFocus:0})}>回到真实生活记录 · 2008年照片 →</button>}
  <p className="lulang-process-cause">{lulangMediaFeedback(view)}</p>
  <div className="lulang-process-evidence"><a href={record.url} target="_blank" rel="noreferrer">依据：{record.date}</a><small>AI工序插画与功能示意；不是现场影像、供应路线或经营成效。划线仅表示讲解进度，不表示火候或制作时间。</small></div>
 </div>;
}
