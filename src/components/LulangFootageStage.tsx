import {ArrowLeft} from '@phosphor-icons/react';
import {lulangFootage,selectedLulangFootage} from '../data/lulangFootage';
import type {PilotView} from '../data/routePilot';
import './LulangFootageStage.css';

type Props={view:PilotView;onChange:(v:Partial<PilotView>)=>void;onBack:()=>void};
export default function LulangFootageStage({view,onChange,onBack}:Props){
 const video=selectedLulangFootage(view);
 return <section className="lulang-footage-stage" aria-label="鲁朗真实原片观察">
  <header><span>真实发布记录 · 原声与片内字幕</span><h2>{video.title}</h2><small>{video.publisher} · {video.published}发布</small></header>
  <div className="lulang-footage-return"><button onClick={()=>onChange({placeMedia:'town',placePhoto:video.id==='aerial-2022'?'town':'customs',placeLens:video.id==='aerial-2022'?'life':'culture',photoFocus:0,servicesVisible:false})}><ArrowLeft size={13}/>回到地方观察</button><button onClick={onBack}>返回原线路原句</button></div>
  <nav aria-label="已核对的鲁朗原片">{[...lulangFootage].reverse().map(f=><button key={f.id} aria-pressed={video.id===f.id} onClick={()=>onChange({footageId:f.id})}>{f.id==='aerial-2022'?'山林与聚落 · 2022':f.id==='dining-2023'?'地方风味 · 2023':'集体宴饮活动 · 2026'}</button>)}</nav>
  <div className="lulang-publisher-player"><p>本版只展示已核实免费使用、原画面无水印的素材。这份原片保留为外部出处，不在应用内播放。</p><a href={video.source} target="_blank" rel="noreferrer">前往原发布页 ↗</a></div>
  <small>外部页面保留发布方自己的画面与标识，不属于本版内置素材。</small>
 </section>;
}
