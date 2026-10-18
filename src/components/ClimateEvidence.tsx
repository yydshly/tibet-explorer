import {ArrowSquareOut,MapPin} from '@phosphor-icons/react';
import {silingCoEvidence} from '../data/climateEvidence';

export default function ClimateEvidence({progress,onSelect}:{progress:number;onSelect:(progress:number)=>void}){
 const evidence=silingCoEvidence,selected=progress<.5?0:1;
 const maximum=2500;
 return <section className="climate-evidence" aria-label="色林错真实研究数值比较">
  <p className="evidence-kind">{evidence.dataKindLabel} · {evidence.variable}</p><h2>{evidence.title}</h2>
  <p>{evidence.claim}</p>
  <figure><figcaption>湖面面积（{evidence.unit}）· 同一零点</figcaption><div className="evidence-zero">0<span>{maximum.toLocaleString()} {evidence.unit}</span></div>{evidence.records.map((record,index)=><button type="button" className={'evidence-observation'+(index===selected?' active':'')} key={record.year} aria-pressed={index===selected} aria-label={`选择${record.year}年研究数值`} onClick={()=>onSelect(index)}><span>{record.label}</span><div className="evidence-track"><i style={{width:`${record.value/maximum*100}%`}}/></div><strong>{record.value.toLocaleString()} <small>{evidence.unit}</small></strong></button>)}</figure>
  <div className="evidence-current" aria-live="polite"><strong>{evidence.records[selected].label} · {evidence.records[selected].value.toLocaleString()} {evidence.unit}</strong><p>{selected===0?'该研究开篇给出1976年的面积，没有在此处注明具体月日。':'研究文首注明2017年6月的湖面面积。它是该湖的研究数值，不能推广到全部西藏。'}</p></div>
  <p className="evidence-map-note"><MapPin size={14}/>地图标记是论文研究区包围范围的中心参照；没有生成两个年代的湖岸线。</p>
  <details><summary>这两个数值能说明什么</summary>{evidence.interpretation.map(item=><p key={item}>{item}</p>)}{evidence.limits.map(item=><p key={item}>{item}</p>)}</details>
  <a className="evidence-source" href={evidence.source.url} target="_blank" rel="noreferrer"><span>{evidence.source.authors} · {evidence.source.publicationYear}<small>{evidence.source.journal} {evidence.source.volume}：{evidence.source.pages} · {evidence.source.articleType}</small></span><ArrowSquareOut size={16}/></a>
 </section>;
}
