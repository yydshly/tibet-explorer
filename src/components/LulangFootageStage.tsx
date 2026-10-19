import {ArrowLeft} from '@phosphor-icons/react';
import {lulangFootage,lulangFootagePlayer,selectedLulangFootage} from '../data/lulangFootage';
import type {PilotView} from '../data/routePilot';
import './LulangFootageStage.css';

type Props={view:PilotView;onChange:(v:Partial<PilotView>)=>void;onBack:()=>void};
export default function LulangFootageStage({view,onChange,onBack}:Props){
 const video=selectedLulangFootage(view);
 return <section className="lulang-footage-stage" aria-label="鲁朗真实原片观察">
  <header><span>真实发布记录 · 原声与片内字幕</span><h2>{video.title}</h2><small>{video.publisher} · {video.published}发布</small></header>
  <div className="lulang-footage-return"><button onClick={()=>onChange({placeMedia:'daily',placeLens:'culture',photoFocus:0,servicesVisible:false})}><ArrowLeft size={13}/>回到生活与人文</button><button onClick={onBack}>返回原线路原句</button></div>
  <nav aria-label="已核对的鲁朗原片">{[...lulangFootage].reverse().map(f=><button key={f.id} aria-pressed={video.id===f.id} onClick={()=>onChange({footageId:f.id})}>{f.id==='dining-2023'?'地方风味 · 2023':'集体宴饮活动 · 2026'}</button>)}</nav>
  <div className="lulang-publisher-player"><iframe key={video.id} src={lulangFootagePlayer(video.id)} title={`${video.publisher}：${video.title}`} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer"/><a href={video.source} target="_blank" rel="noreferrer">无法播放时，前往原发布页 ↗</a></div>
  <small>原片保留原声与片内字幕，片尾推荐不属于本段资料。点下方「恢复原条件并继续」接回原句；刷新后原片可能从头播放。</small>
 </section>;
}
