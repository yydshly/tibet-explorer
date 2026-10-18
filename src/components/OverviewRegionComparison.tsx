import comparison from '../data/region-comparison.json';
import {placeProfiles} from '../data/placeProfiles';
import type {GeographyCity} from '../lib/narratedGeography';
import './OverviewRegionComparison.css';

export default function OverviewRegionComparison({active,selected,manual,onChoose,onWhole,onResume}:{active:readonly string[];selected?:string;manual:boolean;onChoose:(id:GeographyCity)=>void;onWhole:()=>void;onResume:()=>void}){
 const place=comparison.places.find(p=>p.id===selected),profile=placeProfiles.find(p=>p.id===selected);
 return <section className="region-compare" aria-label="七市地同尺度地形对照">
  <strong>把七处地形放在同一把尺上</strong>
  <p>每条都是聚居地参照点两侧共100公里的东西剖面；纵轴统一0—8000米。点击一地，在原地图走近。</p>
  <div className="region-compare-actions"><button onClick={onWhole}>回看七地整体</button>{manual&&<button onClick={onResume}>返回原句继续</button>}</div>
  <div className="region-compare-axis"><span>西 ← 100 km → 东</span><span>点：聚居地参照</span></div>
  {comparison.places.map(p=>{
   const mid=p.points[10].metres,y=(m:number)=>60-m/8000*56;
   const path=p.points.map((v,i)=>`${i?'L':'M'}${4+i*9.6},${y(v.metres)}`).join(' ');
   return <button key={p.id} className="region-compare-row" aria-pressed={selected===p.id} data-narrated={active.includes(p.id)} onClick={()=>onChoose(p.id as GeographyCity)} aria-label={`走近${p.name}并比较地形`}>
    <span>{p.name}<small>参照点约{Math.round(mid/100)*100} m</small></span>
    <svg viewBox="0 0 230 68" role="img" aria-label={`${p.name}100公里同尺度高程剖面，参照点粗网格约${Math.round(mid/100)*100}米`}>
     {[0,4000,8000].map(v=><g key={v}><path d={`M4 ${y(v)}H196`} className="region-grid"/><text x="199" y={y(v)+3}>{v}</text></g>)}
     <path d={`${path} L196,60 L4,60Z`} className="region-fill"/><path d={path} className="region-profile"/><circle cx="100" cy={y(mid)} r="3"/>
    </svg>
   </button>;
  })}
  <small>高的是参考点还是周围山地？谷底低于两侧，不等于这里海拔低。粗网格约5—6 km，不能读街道、建筑或整个行政地区的平均状况。</small>
  {place&&profile&&<div role="status"><strong>{place.name} · 聚居地与周边</strong><p>{profile.sections[0].paragraphs[0]}</p><p>先看同尺度起伏，再解释通行、用水与聚居；地形不直接决定文化或发展优势。</p></div>}
  <details><summary>数据与口径</summary><p>{comparison.method}</p><a href={comparison.source} target="_blank" rel="noreferrer">归档高程来源</a> · <a href={comparison.locators} target="_blank" rel="noreferrer">聚居地参照来源</a>{profile?.sources.map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
 </section>;
}
