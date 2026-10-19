import './LulangLifeStage.css';
import {ArrowLeft} from '@phosphor-icons/react';
import {lulangLifePhotos,lulangCookingState,lulangLifePhase,lulangLifePhases} from '../data/lulangLife';
import LulangProcessStage from './LulangProcessStage';
import type {PilotView} from '../data/routePilot';

type Props={view:PilotView;onChange:(v:Partial<PilotView>)=>void;onBack:()=>void};
export default function LulangLifeStage({view,onChange,onBack}:Props){
 const media=view.placeMedia??'map',cooking=lulangCookingState(view);
 if(media==='map')return null;
 const photo=media==='daily'?lulangLifePhotos.daily:lulangLifePhotos.town,focus=Math.max(0,Math.min(3,view.photoFocus??0)),feature=photo.features[focus-1];
 const process=media==='process';
 const change=(patch:Partial<PilotView>)=>onChange({placeMedia:'process',placeLens:'culture',servicesVisible:true,serviceFilter:'food',...patch});
 return <section className="lulang-life-stage" aria-label="鲁朗实景与制作观察" data-life-media={media} data-cooking-step={cooking.step} data-supply-blocked={!cooking.supply}>
  <header><span>{process?'工序与服务示意 · 非现场录像':`真实照片 · ${photo.date}`}</span><h2>{process?'从一锅制作，到持续服务':photo.title}</h2><p>{process?'制作、供货与接待要接得上，地方风味才能成为持续的服务。':photo.scope}</p></header>
  <div className="lulang-context-actions"><small>原线路位置</small><button onClick={onBack}><ArrowLeft size={13}/>返回原线原句</button><button onClick={()=>onChange({placeMedia:'map'})}>回到地图</button></div>
  {process?<>
   <nav className="lulang-process-phases" aria-label="鲁朗制作与服务观察">{lulangLifePhases.map(p=><button key={p.id} aria-pressed={lulangLifePhase(view)===p.id} onClick={()=>change({lifePhase:p.id,...(p.id!=='supply'?{cultureSupply:true}:{})})}>{p.title}</button>)}</nav>
   <LulangProcessStage view={view} onChange={onChange}/>
  </>:<>
   <div className="lulang-real-photo"><img src={photo.src} alt={`${photo.date}拍摄的${photo.title}`} draggable={false} style={{transform:focus?'scale(1.65)':'scale(1)',transformOrigin:feature?`${feature.x}% ${feature.y}%`:'50% 50%'}}/>{feature&&<div className="lulang-photo-reading"><strong>{feature.title}</strong><span>{feature.detail}</span></div>}</div>
   <nav className="lulang-photo-features" aria-label="实景局部观察"><button aria-pressed={focus===0} onClick={()=>onChange({photoFocus:0})}>看完整照片</button>{photo.features.map((f,i)=><button key={f.title} aria-pressed={focus===i+1} onClick={()=>onChange({photoFocus:i+1})}>{f.title}</button>)}</nav>
   <div className="lulang-photo-credit"><a href={photo.source} target="_blank" rel="noreferrer">{photo.author} · 原始来源</a><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a><span>仅作显示缩放；照片及显示裁切沿用原许可。</span></div>
  </>}
  {!process&&<nav className="lulang-media-switch" aria-label="鲁朗现场与过程"><button aria-pressed={media==='town'} onClick={()=>onChange({placeMedia:'town',photoFocus:0})}>河谷实拍 · 2024</button><button onClick={()=>change({lifePhase:'making',cultureSupply:true,cookingProgress:0})}>制作与供货示意</button><button aria-pressed={media==='daily'} onClick={()=>onChange({placeMedia:'daily',photoFocus:0})}>街边日常 · 2008</button></nav>}
 </section>;
}
