import {useMemo} from 'react';
import {lulangLenses,lulangOperationSource,type LulangServiceFilter} from '../data/lulangPlace';
import {lulangCultureSteps,lulangCultureState,lulangCultureReferences} from '../data/lulangCulture';
import type {PilotView} from '../data/routePilot';
import type {LulangPlaceData} from '../scene/lulangPlaceData';

type Props={view:PilotView;data?:LulangPlaceData;onChange:(p:Partial<PilotView>)=>void};
export default function LulangPlaceControls({view,data,onChange}:Props){
 const lens=view.placeLens??'life',probe=view.sectionProgress??.5,filter=view.serviceFilter??'all';
 const chart=useMemo(()=>{if(!data)return;const heights=data.section.map(p=>p.elevation),low=Math.floor(Math.min(...heights)/100)*100,high=Math.ceil(Math.max(...heights)/100)*100+100;return {low,high,path:data.section.map((p,i)=>`${i?'L':'M'}${20+p.distance/2600*270},${95-(p.elevation-low)/(high-low)*70}`).join(' ')};},[data]);
 const point=data?.section[Math.round(probe*64)],food=data?.services.filter(p=>p.kind==='food'),lodging=data?.services.filter(p=>p.kind==='lodging');
 const references=useMemo(()=>data?lulangCultureReferences(data.services,data.riverPoint):[],[data]);
 const culture=lulangCultureState(view),referenceIndex=Math.min(references.length-1,Math.max(0,Math.trunc(view.cultureSample??0)));
 const sample=(kind:'food'|'lodging')=>data?.services.filter(s=>s.kind===kind).sort((a,b)=>Math.hypot(a.coordinate[0]-data.riverPoint[0],a.coordinate[1]-data.riverPoint[1])-Math.hypot(b.coordinate[0]-data.riverPoint[0],b.coordinate[1]-data.riverPoint[1]))[0];
 const example=lens==='culture'&&filter!=='lodging'?references[referenceIndex]?.record:sample(filter==='lodging'?'lodging':'food');
 const processChange=(patch:Partial<PilotView>)=>onChange({serviceFilter:'food',servicesVisible:true,...patch});
 const filters=<div className="pilot-service-filters" aria-label="归档服务位置对照">{(['all','food','lodging'] as LulangServiceFilter[]).map((key,i)=><button key={key} aria-pressed={view.servicesVisible!==false&&filter===key} onClick={()=>onChange({serviceFilter:key,servicesVisible:true})}>{['共同看','餐饮记录','住宿记录'][i]}</button>)}</div>;
 const records=<><output>资料窗口：{food?.length??0}处餐饮记录 · {lodging?.length??0}处住宿记录</output><small>橙色为归档餐饮，淡蓝色为归档住宿。点位始终保留，不模拟开业停业。</small>{example&&<small>地图参照：<a href={`https://www.openstreetmap.org/${example.id}`} target="_blank" rel="noreferrer">{filter==='lodging'?'一处住宿归档记录':'所选餐饮归档记录'}</a>。不是2017年事件定位，营业与入口未独立核实。</small>}</>;
 return <section className="pilot-local-reading" aria-label="鲁朗风景生活与地方风味观察">
  <nav aria-label="鲁朗观察角度">{lulangLenses.map(l=><button key={l.id} aria-pressed={lens===l.id} onClick={()=>onChange({placeLens:l.id,connections:l.id!=='landscape',connectionProgress:l.id==='landscape'?0:1,serviceFilter:l.id==='culture'?'food':'all',servicesVisible:l.id!=='landscape',...(l.id==='culture'?{cultureProgress:0,cultureSupply:true,cultureSample:0}:{})})}>{l.title}</button>)}</nav>
  {lens==='landscape'?<>
   <p>沿蓝色鲁朗河记录看谷地，再沿白色剖面比较两侧起伏。绿色边线是一处归档林地范围。</p>
   {chart&&data&&<><svg viewBox="0 0 310 120" role="img" aria-label="鲁朗河段东西向2.6公里地表剖面"><path d={chart.path} className="local-section"/><path d="M155 18V98" className="river-axis"/><path d={`M${20+probe*270} 18V98`} className="probe-axis"/><text x="20" y="13">{chart.high} m</text><text x="20" y="108">西侧</text><text x="155" y="116" textAnchor="middle">河段样本</text><text x="290" y="108" textAnchor="end">东侧</text><text x="20" y="94">{chart.low} m</text></svg><label>移动剖面观察点<input aria-label="鲁朗河谷剖面位置" type="range" min="0" max="1" step=".015625" value={probe} onChange={e=>onChange({sectionProgress:Number(e.target.value)})}/></label><output>{probe<.48?'西侧':probe>.52?'东侧':'河段位置'} · 地表约{Math.round((point?.elevation??0)/10)*10} m</output><small>同一DSM采样，非河床实测；剖面两轴比例不同。冬季影像不独立证明树种或全年水热。</small></>}
  </>:lens==='culture'?<>
   <div className="pilot-culture-controls">
    <strong>让地方风味接到持续服务</strong><small>地图点：归档位置 ｜ 虚线标识与环线：经营示意</small>
    <nav aria-label="鲁朗经营关系步骤">{lulangCultureSteps.map((step,i)=><button key={step.short} aria-pressed={culture.active&&culture.step===i} onClick={()=>processChange({cultureProgress:i===3?1:(i+.5)/4})}>{i+1} · {step.title}</button>)}</nav>
    <label>拖动经营过程<input aria-label="鲁朗经营关系进度" type="range" min="0" max="1" step=".01" value={culture.progress} onChange={e=>processChange({cultureProgress:Number(e.target.value)})}/></label>
    <div className="pilot-culture-compare" role="group" aria-label="供货联系原理示意对照"><button aria-pressed={culture.active&&culture.supply} onClick={()=>processChange({cultureSupply:true})}>按材料连起来</button><button aria-pressed={culture.active&&!culture.supply} onClick={()=>processChange({cultureSupply:false})}>假设移去供货联系</button></div>
    <div className="pilot-culture-record"><span>真实记录 · 2017年度</span><p>{lulangCultureSteps[culture.step].record}</p><a href={lulangOperationSource.url} target="_blank" rel="noreferrer">查看原始材料</a></div>
    {references.length>0&&<div className="pilot-culture-reference"><span>地图参照 · {references[referenceIndex]?.label}</span><div><button disabled={referenceIndex<=0} onClick={()=>processChange({cultureSample:referenceIndex-1})}>上一处</button><output>{referenceIndex+1} / {references.length}</output><button disabled={referenceIndex>=references.length-1} onClick={()=>processChange({cultureSample:referenceIndex+1})}>下一处</button></div></div>}
    <small>环线无地理尺度；移去联系是理解依赖的假设，不表示真实停业、供应路线或成效。参照点不是当年参与者。</small>
   </div>
   <details className="pilot-culture-records"><summary>归档餐饮、住宿与地图记录</summary>{filters}{records}</details>
  </>:<><p>先看道路接入，再对照现状餐饮和住宿记录，辨认服务怎样分布在同一谷地。</p>{filters}{records}</>}
 </section>;
}
