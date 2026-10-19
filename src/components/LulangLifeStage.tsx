import {Package,ForkKnife,PauseCircle,ArrowLeft} from '@phosphor-icons/react';
import {lulangLifePhotos,lulangCookingSteps,lulangCookingState,lulangCookingIllustration,lulangCookingSource} from '../data/lulangLife';
import {lulangOperationSource} from '../data/lulangPlace';
import type {PilotView} from '../data/routePilot';
import './LulangLifeStage.css';

type Props={view:PilotView;onChange:(v:Partial<PilotView>)=>void;onBack:()=>void};
export default function LulangLifeStage({view,onChange,onBack}:Props){
 const media=view.placeMedia??'map',cooking=lulangCookingState(view);
 if(media==='map')return null;
 const photo=media==='daily'?lulangLifePhotos.daily:lulangLifePhotos.town,focus=Math.max(0,Math.min(3,view.photoFocus??0)),feature=photo.features[focus-1];
 const process=media==='process';
 const change=(patch:Partial<PilotView>)=>onChange({placeMedia:'process',placeLens:'culture',servicesVisible:true,serviceFilter:'food',...patch});
 return <section className="lulang-life-stage" aria-label="鲁朗实景与制作观察" data-life-media={media} data-cooking-step={cooking.step} data-supply-blocked={!cooking.supply}>
  <header><span>{process?'工序示意 · 非现场录像':`真实照片 · ${photo.date}`}</span><h2>{process?'从原料到一锅汤':photo.title}</h2><p>{process?'制作、供货与接待要接得上，地方风味才能成为持续的服务。':photo.scope}</p></header>
  <div className="lulang-context-actions"><small>原线路位置</small><button onClick={onBack}><ArrowLeft size={13}/>返回原线原句</button><button onClick={()=>onChange({placeMedia:'map'})}>回到地图</button></div>
  {process?<>
   <div className="lulang-process-workspace">
    <div className="lulang-process-input" data-blocked={!cooking.supply}><Package size={24}/><strong>{cooking.supply?'原料条件已接入':'供货条件被移去'}</strong><span>{cooking.supply?'2017年有统一供货的记录':'假设对照 · 非真实断供记录'}</span></div>
    <div className="lulang-cooking-picture" aria-label={`工序插画：${lulangCookingSteps[cooking.step].title}${cooking.supply?'':'，供货缺口，后续待接续'}`}>
     <img src={lulangCookingIllustration.src} alt="AI绘制的四道工序：鲜鸡初加工、炒制、压力锅煮熟、转入石锅煨煮" draggable={false}/>
     <div className="lulang-cooking-window" style={{left:`calc(50% + ${(cooking.step-2)*.75} * var(--cooking-height))`}}/>
     {!cooking.supply&&<div className="lulang-process-block"><PauseCircle size={35}/><strong>备料未接上 · 后续工序等待</strong></div>}
    </div>
    <div className="lulang-process-output" data-ready={cooking.ready}><ForkKnife size={24}/><strong>{cooking.ready?'接到餐饮服务':'出餐待接续'}</strong><span>{cooking.ready?'订餐 · 明码标价 · 接待':'不是实际客源或经营量的模拟'}</span></div>
   </div>
   <nav className="lulang-cooking-steps" aria-label="制作工序">{lulangCookingSteps.map((s,i)=><button key={s.title} aria-pressed={cooking.step===i} onClick={()=>change({cookingProgress:(i+.5)/4})}><span>{i+1}</span>{s.title}</button>)}</nav>
   <div className="lulang-process-controls"><label>观察制作过程<input aria-label="制作工序进度" type="range" min="0" max="1" step=".01" value={cooking.requested} onChange={e=>change({cookingProgress:Number(e.target.value)})}/></label><button onClick={()=>change({cultureSupply:!cooking.supply})}>{cooking.supply?'移去供货条件':'恢复供货条件'}</button></div>
   <p className="lulang-process-feedback" role="status">{cooking.supply?lulangCookingSteps[cooking.step].detail:'拖动仍保留你的观察进度，但备料与后续出餐停在缺口。恢复供货后再对照；不表示鲁朗真实停业。'}</p>
   <div className="lulang-process-evidence"><a href={lulangOperationSource.url} target="_blank" rel="noreferrer">2017记录：统一供货、诚信经营</a><a href={lulangCookingSource.url} target="_blank" rel="noreferrer">2022解读：制作与服务工序</a><small>插画为AI生成说明素材，不是2017现场；供货比较为依赖关系示意，不代表供应路线或经营成效。</small></div>
  </>:<>
   <div className="lulang-real-photo"><img src={photo.src} alt={`${photo.date}拍摄的${photo.title}`} draggable={false} style={{transform:focus?'scale(1.65)':'scale(1)',transformOrigin:feature?`${feature.x}% ${feature.y}%`:'50% 50%'}}/>{feature&&<div className="lulang-photo-reading"><strong>{feature.title}</strong><span>{feature.detail}</span></div>}</div>
   <nav className="lulang-photo-features" aria-label="实景局部观察"><button aria-pressed={focus===0} onClick={()=>onChange({photoFocus:0})}>看完整照片</button>{photo.features.map((f,i)=><button key={f.title} aria-pressed={focus===i+1} onClick={()=>onChange({photoFocus:i+1})}>{f.title}</button>)}</nav>
   <div className="lulang-photo-credit"><a href={photo.source} target="_blank" rel="noreferrer">{photo.author} · 原始来源</a><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a><span>仅作显示缩放；照片及显示裁切沿用原许可。</span></div>
  </>}
  <nav className="lulang-media-switch" aria-label="鲁朗现场与过程"><button aria-pressed={media==='town'} onClick={()=>onChange({placeMedia:'town',photoFocus:0})}>河谷实拍 · 2024</button><button aria-pressed={process} onClick={()=>change({cookingProgress:0})}>制作与供货示意</button><button aria-pressed={media==='daily'} onClick={()=>onChange({placeMedia:'daily',photoFocus:0})}>街边日常 · 2008</button></nav>
 </section>;
}
