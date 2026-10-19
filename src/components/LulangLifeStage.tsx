import './LulangLifeStage.css';
import {ArrowLeft} from '@phosphor-icons/react';
import {lulangSelectedPhoto,lulangCookingState,lulangLifePhase,lulangLifePhases,type LulangPhotoId} from '../data/lulangLife';
import LulangProcessStage from './LulangProcessStage';
import LulangFootageStage from './LulangFootageStage';
import LulangPhotoNarration from './LulangPhotoNarration';
import type {PilotView} from '../data/routePilot';

type Props={view:PilotView;onChange:(v:Partial<PilotView>)=>void;onBack:()=>void;manual?:boolean;spatial?:boolean;interactionKey?:number;onPhotoFocus?:(focus:number)=>void;onPhotoReady?:(id:string)=>void};
export default function LulangLifeStage({view,onChange,onBack,manual,spatial,interactionKey,onPhotoFocus,onPhotoReady}:Props){
 const media=view.placeMedia??'map',cooking=lulangCookingState(view);
 if(media==='map')return null;
 if(media==='record')return <LulangFootageStage view={view} onChange={onChange} onBack={onBack}/>;
 const photo=lulangSelectedPhoto(view),focus=Math.max(0,Math.min(3,view.photoFocus??0)),feature=photo.features[focus-1],aspect=photo.aspect??1.5;
 const frame={transform:focus?`scale(${photo.kind==='video-still'?1:1.35})`:'scale(1)',transformOrigin:feature?`${feature.x}% ${feature.y}%`:'50% 50%'};
 const process=media==='process';
 const change=(patch:Partial<PilotView>)=>onChange({placeMedia:'process',placeLens:'culture',servicesVisible:true,serviceFilter:'food',...patch});
 return <section className="lulang-life-stage" aria-label="鲁朗实景与地方生活观察" data-spatial={spatial===true} data-life-media={media} data-cooking-step={cooking.step} data-supply-blocked={!cooking.supply}>
  <header><span>{process?'饮食专题 · 工序示意，非现场录像':photo.kind==='video-still'?`工布地区资料 · 新闻静帧 · ${photo.date}`:`鲁朗实景 · ${photo.date}`}</span><h2>{process?'地方风味 · 自选近看':photo.title}</h2><p>{process?'这是饮食专题，返回生活观察后接回原线路。':spatial?(photo.kind==='video-still'?'工布地区资料，场地未核实为鲁朗。':'实拍与地图非同次拍摄、非逐点配准。'):photo.scope}</p></header>
  <div className="lulang-context-actions"><small>{photo.coordinate?'来源照片机位':'鲁朗区位参照 · 影像未定位'}</small><button onClick={onBack}><ArrowLeft size={13}/>返回原线原句</button><button onClick={()=>onChange({placeMedia:'map',placePhoto:photo.coordinate?photo.id as LulangPhotoId:undefined})}>{photo.coordinate?'在地形定位照片':'回到鲁朗地图'}</button></div>
  {process?<>
   <nav className="lulang-process-phases" aria-label="鲁朗制作与服务观察">{lulangLifePhases.map(p=><button key={p.id} aria-pressed={lulangLifePhase(view)===p.id} onClick={()=>change({lifePhase:p.id,...(p.id!=='supply'?{cultureSupply:true}:{})})}>{p.title}</button>)}</nav>
   <LulangProcessStage view={view} onChange={onChange}/>
  </>:<>
   <div className="lulang-real-photo"><img key={photo.id} src={photo.src} alt={`${photo.date}来源记录：${photo.title}`} onLoad={()=>onPhotoReady?.(photo.id)} draggable={false} style={frame}/><svg className="lulang-photo-marks" viewBox={`0 0 1000 ${1000/aspect}`} aria-hidden={spatial?undefined:true} style={frame}>{photo.features.map((f,i)=><g key={f.title} role={spatial?'button':undefined} tabIndex={spatial?0:undefined} aria-label={spatial?`在同一地形观察${f.title}`:undefined} onClick={()=>{if(spatial)onChange({photoFocus:i+1});}} onKeyDown={e=>{if(spatial&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onChange({photoFocus:i+1});}}} className={focus===i+1?'is-current':''}><circle cx={f.x*10} cy={f.y*10/aspect} r={focus===i+1?13:7}/>{focus===i+1&&<><path d={`M${f.x*10} ${f.y*10/aspect} l35 ${f.y<35?40:-28} h100`}/><text x={Math.min(850,f.x*10+40)} y={f.y*10/aspect+(f.y<35?64:-36)}>{f.title}</text></>}</g>)}</svg></div>
   <div className="lulang-photo-credit"><a href={photo.source} target="_blank" rel="noreferrer">{photo.author} · 原始来源</a><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a><span>仅作显示缩放与裁切；图片沿用原许可。</span></div>
   {manual&&!spatial&&onPhotoFocus&&<LulangPhotoNarration key={`${photo.id}:${interactionKey}`} photoId={photo.id as LulangPhotoId} onFocus={onPhotoFocus}/>}
  </>}
 </section>;
}
