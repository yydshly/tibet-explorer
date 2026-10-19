import {lulangCultureState,lulangCultureFeedback,lulangCultureSteps} from '../data/lulangCulture';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {usePilotFieldImages} from '../hooks/usePilotFieldImages';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import {routePilotCues,routePilotIdentity,routePilotPath,routePilotSources,pilotNarratedView,pilotConnectionProgress,pilotScriptVersions,pilotResumeAliases,type PilotView} from '../data/routePilot';
import {PILOT_POSITION_KEY,readPilotNote,writePilotNote,type PilotNote,type PilotReturn} from '../lib/routePilotStore';
import {pilotObservation,appendPilotQuestion,pilotPlanMarkdown} from '../lib/pilotObservation';
import PilotRouteTerrain,{type PilotReading} from '../scene/PilotRouteTerrain';
import type {PilotTerrainContext} from '../scene/routePilotTerrainData';
import PilotRouteProfile from './PilotRouteProfile';
import NarrationCaption from './NarrationCaption';
import LulangPlaceControls from './LulangPlaceControls';
import {lulangServiceFeedback} from '../data/lulangPlace';
import {pilotCameraPresets} from '../data/routePilotCamera';
import {pilotSpatialStory} from '../data/pilotSpatialStory';
import {pilotClosing} from '../data/pilotClosing';
import LulangLifeStage from './LulangLifeStage';
import LulangPhotoNarration from './LulangPhotoNarration';
import {lulangMediaFeedback,lulangDisplayView} from '../data/lulangLife';
import './RouteExperience.css';
import RouteGateway from './RouteGateway';
import {lazy,Suspense} from 'react';
import {tongmaiPath} from '../data/tongmaiJourney';
const TongmaiExperience=lazy(()=>import('./TongmaiExperience'));

export default function RouteExperience(){
 const route=location.hash.split('?')[0].replace(/^#/,'');
 if(route==='/routes')return <RouteGateway/>;
 if(route===tongmaiPath)return <Suspense fallback={<main className="pilot-experience" aria-busy="true">正在准备鲁朗—通麦接续…</main>}><TongmaiExperience/></Suspense>;
 return <PilotPlayback/>;
}
function PilotPlayback(){
 const [entryStart]=useState(()=>new URLSearchParams(location.hash.split('?')[1]||'').get('start')==='1');
 const entryReset=useRef(false),entryAutoplay=useRef(false);
 const beats=useMemo(()=>routePilotCues.map((c,i)=>({id:c.id,recordingId:c.id,text:c.narration,sceneIdentity:i>=2?routePilotIdentity+'-field':routePilotIdentity})),[]);
 const director=useOverviewDirector({beats,storageKey:PILOT_POSITION_KEY,resumeAliases:pilotResumeAliases});
 const initial=useMemo(()=>{const saved=readPilotNote();return entryStart?{...saved,returnTo:undefined,lineReturn:undefined,skipPlaceOnce:false}:saved;},[entryStart]),[note,setNote]=useState<PilotNote>(initial),[status,setStatus]=useState(''),[saveOK,setSaveOK]=useState(true);
 const [override,setOverride]=useState<PilotView|undefined>(initial.returnTo?.view),[lineReturn,setLineReturn]=useState<PilotReturn|undefined>(initial.lineReturn);
 const [reading,setReading]=useState<PilotReading>(),[context,setContext]=useState<PilotTerrainContext>(),[cameraKey,setCameraKey]=useState(0);
 const [returnFlightKey,setReturnFlightKey]=useState(0),[cameraTransit,setCameraTransit]=useState(false);
 const onTransit=useCallback((active:boolean)=>setCameraTransit(active),[]);
 const beat=beats[director.beatIndex],planMode=new URLSearchParams(location.hash.split('?')[1]||'').get('plan')==='1';
 const [terrainReady,setTerrainReady]=useState(false),fieldImages=usePilotFieldImages(director.beatIndex>=1);
 const native=pilotNarratedView(director.beatIndex,beat.text,director.timing?.textProgress??0,reading?.highProgress??.5),view=lulangDisplayView(override??native);
 const culture=lulangCultureState(view);
 const publisherVideo=view.mode==='place'&&view.placeMedia==='record';
 const manual=Boolean(override),lastLine=useRef<PilotReturn|undefined>(undefined);
 const closing=director.beatIndex===3&&!manual?pilotClosing(beat.text,director.timing?.textProgress??0,reading?.highProgress??.5):undefined;
 const highLook=director.beatIndex===1&&view.mode==='line'&&Math.abs(view.progress-(reading?.highProgress??.5))<.002&&(view.routeContext??0)<.1;
 const fieldObservation=manual&&view.mode==='place'&&(view.placeMedia==='town'||view.placeMedia==='daily');
 const snapshot=():PilotReturn=>({beatIndex:director.beatIndex,raw:director.raw,voice:director.voice,scriptVersion:pilotScriptVersions[director.beatIndex],view:{...view}});
 if(director.beatIndex<2&&!planMode)lastLine.current=snapshot();
 const persist=(next:PilotNote)=>{setNote(next);const ok=writePilotNote(next);setSaveOK(ok);setStatus(ok?'已保存到当前浏览器。':'保存失败，请先复制观察笔记；原讲述仍保留。');return ok;};
 useEffect(()=>{
  if(!entryStart||entryReset.current)return;entryReset.current=true;
  director.pause();director.select(0);director.setVoice(true);setOverride(undefined);setLineReturn(undefined);
  const next={...readPilotNote(),returnTo:undefined,lineReturn:undefined,skipPlaceOnce:false};writePilotNote(next);setNote(next);
  history.replaceState(history.state,'',`${location.pathname}${location.search}#${routePilotPath}`);
 },[entryStart,director.pause,director.select,director.setVoice]);
 useEffect(()=>{
  if(!entryStart||!entryReset.current||entryAutoplay.current||!director.ready)return;
  entryAutoplay.current=true;director.setVoice(true);director.playPause();
 },[entryStart,director.ready,director.setVoice,director.playPause]);
 useEffect(()=>{
  // Returning to the approach sentence must not automatically repeat the
  // already visited place. Explicit place selection starts a fresh visit.
  if(director.beatIndex===2&&note.skipPlaceOnce){
   const run=director.wantsPlayback,next={...readPilotNote(),skipPlaceOnce:false,lineReturn:undefined};
   setLineReturn(undefined);writePilotNote(next);setNote(next);director.select(3);if(run)director.playPause();return;
  }
  if(director.beatIndex===2&&!lineReturn&&lastLine.current){setLineReturn(lastLine.current);const next={...readPilotNote(),lineReturn:lastLine.current};writePilotNote(next);setNote(next);}
 },[director.beatIndex,lineReturn,note.skipPlaceOnce,director.wantsPlayback,director.select,director.playPause]);
 const onReady=useCallback(()=>{setTerrainReady(true);setCameraTransit(false);},[]);
 useEffect(()=>{if(!planMode&&terrainReady&&(director.beatIndex<2||fieldImages.ready))director.onSceneReady(beat.sceneIdentity);},[planMode,terrainReady,director.beatIndex,fieldImages.ready,beat.sceneIdentity,director.onSceneReady]);
 const onError=useCallback((s:string)=>director.onSceneError(beat.sceneIdentity,s),[beat.sceneIdentity,director.onSceneError]);
 const onReading=useCallback((r:PilotReading)=>setReading(r),[]);
 const onContext=useCallback((c:PilotTerrainContext)=>setContext(c),[]);
 const onInteract=useCallback(()=>director.pause(),[director.pause]);
 const change=(patch:Partial<PilotView>)=>{director.pause();setOverride({...view,routeRead:undefined,routeContext:0,arrivalProgress:undefined,returnProgress:undefined,...(view.mode==='place'?{photoOverlay:undefined,photoReveal:1}:{}),...patch});setCameraKey(k=>k+1);setStatus('观察已暂停原句；继续讲述时恢复原来的线路位置与条件。');};
 const play=()=>{if(!director.wantsPlayback)director.setVoice(true);setOverride(undefined);setCameraKey(k=>k+1);const next={...readPilotNote(),returnTo:undefined};writePilotNote(next);setNote(next);director.playPause();};
 const photoFocus=useCallback((focus:number)=>setOverride(previous=>previous&&previous.photoFocus!==focus?{...previous,photoFocus:focus}:previous),[]);
 const select=(i:number)=>{const next={...readPilotNote(),skipPlaceOnce:false,returnTo:undefined,lineReturn:undefined};writePilotNote(next);setNote(next);setLineReturn(undefined);setOverride(undefined);setCameraKey(k=>k+1);director.select(i);};
 const enterPlace=()=>{
  const original=snapshot();director.pause();setLineReturn(original);const next={...note,lineReturn:original,returnTo:undefined,skipPlaceOnce:false};persist(next);setOverride(undefined);setCameraKey(k=>k+1);director.select(2);director.setVoice(true);director.playPause();
 };
 const restore=(target:PilotReturn)=>{director.pause();director.select(target.beatIndex);director.seek(target.raw);director.setVoice(target.voice);setOverride(target.view);setCameraKey(k=>k+1);};
 const backToLine=()=>{
  const target=lineReturn??lastLine.current??{beatIndex:1,raw:0,voice:director.voice,view:pilotNarratedView(1,beats[1].text,0)};
  restore(target);setReturnFlightKey(k=>k+1);setLineReturn(undefined);persist({...note,lineReturn:undefined,returnTo:target,skipPlaceOnce:true});setStatus('已回到进入鲁朗前的原路段和原句。继续后接回整段总结，不重复地方讲述。');
 };
 const backToGateway=()=>{director.pause();if(persist({...readPilotNote(),returnTo:snapshot(),lineReturn}))location.hash='/routes';};
 const openPlan=(capture=true)=>{const target=snapshot();director.pause();if(persist({...note,observation:capture?target:note.observation??note.returnTo??target,returnTo:target,lineReturn})){setTerrainReady(false);director.retryScene();location.hash=routePilotPath+'?plan=1';}};
 const returnPlan=()=>{if(!persist(note))return;if(note.returnTo)restore(note.returnTo);location.hash=routePilotPath;};
 const exportPlan=()=>{
  const url=URL.createObjectURL(new Blob([pilotPlanMarkdown(note)],{type:'text/markdown;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download='G318-林芝鲁朗-观察计划.md';document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('已导出观察计划；文件保留笔记、资料边界和出处。');
 };
 const observation=planMode?pilotObservation(note.observation??note.returnTo):undefined;
 const km=reading?(view.progress*reading.total/1000).toFixed(1):'—';
 const connection=pilotConnectionProgress(view),branchMetres=Math.round((context?.connectionLength??0)*connection);
 const connectionReason=view.routeRead!==undefined?`金色沿归档道路原节点显露，当前读到约${Math.round(view.routeRead*100)}%；青色保留未读来路。这是顺序阅读，不是车辆位置或导航。`:view.mode==='place'?connection===0?'先读青色G318，金色圆环标出转入地方道路的实际节点。过境道路经过附近，进入地方还要继续接续。':connection<.65?`从国道接点沿金色地方道路读到约${branchMetres}米：观察转弯与地块的关系。金点表示阅读位置，不是车辆或历史施工。`:'地方道路、白色建筑轮廓与浅绿地块共同展开：国道经过附近，地方接续让道路进入聚落。接着看真实照片中的河流、房屋与街边生活。':view.mode==='whole'?'先把城区、山地与鲁朗放在一条真实道路中看；青色为国道来路，金色为已核对的末端地方接续。剖面与同一地形联动。':view.lookBack?'在同一位置回望：比较山体遮挡、道路绕行和刚经过的谷地。位置不变，观察方向改变。':`沿归档道路改变位置，地形与高程剖面同时对应${km}公里处；比较起点、山地与鲁朗的高低，再看道路如何绕行。高程是地表采样。`;
 const lens=view.placeLens??'life',sectionPoint=context?.lulang?.section[Math.round((view.sectionProgress??.5)*64)];
 const reason=lulangMediaFeedback(view)??(view.mode!=='place'?connectionReason:lens==='landscape'?`蓝线标出鲁朗河源河段，白线比较两侧地形；当前地表样本约${Math.round((sectionPoint?.elevation??reading?.elevation??0)/10)*10}米。移动观察点，比较河段与两侧的相对高低。绿色仅标原地图林地边线。`:culture.active?lulangCultureFeedback(view):view.servicesVisible?lulangServiceFeedback(view):lens==='culture'?'把地方生活放回同一河谷：2008年日常照片、2016年试运营报道与2018年工布新年文字记录各自有年代和范围；它们不是同一地点的历史前后对照。':connectionReason);
 const sceneReason=view.mode==='line'?`${km}公里处 · ${view.lookBack?'原位回望，比较山体遮挡与道路绕行。':'沿同一道路，比较谷地与坡面的高低。'}`:reason;
 const overlayId=view.photoOverlay??(view.placeMedia==='town'||view.placeMedia==='daily'?view.placePhoto??(view.placeMedia==='daily'?'daily':'town'):undefined);
 const photograph=view.mode==='place'&&view.placeMedia!=='record'&&view.placeMedia!=='process'&&Boolean(overlayId);
 const reveal=photograph&&overlayId&&fieldImages.loaded.has(overlayId)?Math.max(0,Math.min(1,view.photoOverlay?view.photoReveal??1:1)):0;
 const photoView: PilotView=overlayId?{...view,placePhoto:overlayId,placeMedia:overlayId==='daily'?'daily':'town'}:view;
 const spatial=pilotSpatialStory(view),placeStory=view.mode==='place'&&!publisherVideo&&view.placeMedia!=='process';
 const photoStyle={
  '--field-reveal':reveal,
  '--field-map-left':`calc(${reveal*100}% - ${reveal*282}px)`,'--field-map-top':`${reveal*16}px`,
  '--field-map-width':`calc(${(1-reveal)*100}% + ${reveal*262}px)`,'--field-map-height':`calc(${(1-reveal)*100}% + ${reveal*164}px)`,
  '--field-map-left-compact':`calc(${reveal*100}% - ${reveal*173}px)`,'--field-map-top-compact':`${reveal*13}px`,
  '--field-map-width-compact':`calc(${(1-reveal)*100}% + ${reveal*160}px)`,'--field-map-height-compact':`calc(${(1-reveal)*100}% + ${reveal*100}px)`,
 } as CSSProperties;
 if(planMode)return <main className="pilot-plan"><header><a href="#/overview">西藏探索</a><span>我的线路观察计划</span></header><h1>带着问题，回到同一段路。</h1><p>G318林芝—鲁朗 · 资料观察计划；实地交通、开放和进入条件仍需核实。</p>
  {observation&&<section className="pilot-plan-context" aria-label="本次观察与资料出处">
   {observation.photo&&<figure><div className="pilot-plan-photo"><img src={observation.photo.src} alt={`${observation.photo.date} · ${observation.photo.title}`}/>{observation.selected&&<span style={{left:`${observation.selected.x}%`,top:`${observation.selected.y}%`}}>{observation.selected.title}</span>}</div><figcaption>{observation.photo.date} · {observation.photo.author} · {observation.photo.license}</figcaption></figure>}
   <div><small>已保存的画面与对象</small><h2>{observation.title}</h2><p>{observation.selected?.detail}</p><p className="pilot-plan-question">{observation.question}</p><button disabled={note.note.includes(observation.question)||note.note.length+observation.question.length+(note.note?2:0)>2000} onClick={()=>persist({...note,note:appendPilotQuestion(note.note,observation.question)})}>将这个问题加入笔记</button><small className="pilot-plan-boundary">{observation.boundary}</small><nav aria-label="本次观察资料来源">{observation.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}</nav><small>观察记录位置：{observation.returnDescription}</small></div>
  </section>}
  <label>我的观察问题与笔记<textarea aria-label="线路观察笔记" maxLength={2000} rows={6} value={note.note} onChange={e=>persist({...note,note:e.target.value})}/></label><p>保留自己的观察和待核实事项。工布风俗现场仍未展示，文献记录与日常照片分别阅读。</p>{note.returnTo&&<p>保存并返回：{routePilotCues[note.returnTo.beatIndex].title} · 原讲述{Math.round(note.returnTo.raw*100)}%</p>}<div className="pilot-plan-actions"><button onClick={()=>persist(note)}>保存观察计划</button><button onClick={exportPlan}>导出观察计划</button><button onClick={returnPlan}>保存并返回原线</button></div><p role={saveOK?'status':'alert'}>{status}</p><Sources/></main>;
 return <main className="pilot-experience">
  <header className="pilot-header"><a href="#/overview">← 认识西藏</a><div><strong>G318 · 林芝—鲁朗</strong><small>川藏南线的一段 · 从整体进入地方</small></div><nav><a href="#/routes" onClick={event=>{event.preventDefault();backToGateway();}}>进藏线路 · 保留观察返回</a><button onClick={()=>openPlan(false)}>线路观察笔记</button></nav></header>
  <div className="pilot-body"><section className="pilot-stage" aria-label="G318真实沿线三维观察" data-closing-phase={closing?.phase} data-route-comparison={(director.beatIndex===1||closing?.phase==='corridor')&&view.mode==='line'} data-place-media={view.mode==='place'?(view.placeMedia??'map'):'map'} data-photo-frame={photograph} data-spatial-bridge={photograph} data-place-story={placeStory} data-camera-transit={cameraTransit} data-photo-reveal={reveal} data-photo-ready={reveal>.8} style={photoStyle}>
   <PilotRouteTerrain view={view} playing={director.playing} fieldReveal={reveal} returnFlightKey={returnFlightKey} onTransit={onTransit} cameraKey={cameraKey} onReady={onReady} onError={onError} onReading={onReading} onContext={onContext} onInteract={onInteract}/>
   {view.mode==='place'&&(photograph||view.placeMedia&&view.placeMedia!=='map')&&<LulangLifeStage view={photograph?photoView:view} spatial={photograph} onChange={change} onBack={backToLine} manual={manual} interactionKey={cameraKey} onPhotoFocus={photoFocus} onPhotoReady={fieldImages.markLoaded}/>}
   {fieldObservation&&photograph&&overlayId&&<LulangPhotoNarration key={`${overlayId}:${cameraKey}`} photoId={overlayId} onFocus={photoFocus}/>}
   {!director.ready&&!director.error&&<div className="pilot-loading" role="status">{fieldImages.error?<>{fieldImages.error}<button onClick={fieldImages.retry}>重新准备实景</button></>:director.beatIndex>=2&&terrainReady?'正在准备本段实景，完成后从原句继续…':'正在准备真实影像、高程与道路…'}</div>}
   {director.error&&<div className="pilot-loading" role="alert">{director.error}<button onClick={()=>location.reload()}>重新加载本段</button></div>}
   <div className="pilot-map-meta"><span>Sentinel-2 · 2025.12.13 · 10 m像元</span><span>GLO-30地表高程 · 高度1×</span></div>
   <div className="pilot-place-title"><span>{view.mode==='whole'?'整段来路':view.mode==='place'?'进入地方':'沿真实道路前进'}</span><h1>{view.mode==='place'?'鲁朗：山谷、聚落与人文':view.mode==='line'?`G318 · 第${km}公里`:'林芝—色季拉山地—鲁朗'}</h1></div>
   {closing&&view.mode!=='place'&&<div className="pilot-closing-reading"><strong>{closing.title}</strong><small>{closing.scope}</small></div>}
   {context&&(director.beatIndex===1||closing?.phase==='corridor')&&view.mode==='line'&&<div className="pilot-route-context" aria-label="翻山入谷的同一路径高程对照">
    {[0,context.highestIndex,context.profile.length-1].map((index,i)=><div key={index} data-current={i===(view.progress<(reading?.highProgress??.5)-.04?0:view.progress>(reading?.highProgress??.5)+.04?2:1)}><span>{['① 林芝附近谷地','↑ ② 沿线高地','↓ ③ 鲁朗谷地'][i]}</span><strong>{Math.round(context.profile[index].elevation/10)*10}<small> m</small></strong></div>)}
    <p>同一路径：谷地 → 高地 → 另一侧谷地 · 地表采样，非实测山口标高</p>
   </div>}
   {placeStory&&<div className="pilot-spatial-reading" data-spatial-focus={spatial.focus}><strong>{closing?.title??spatial.title}</strong><small>{closing?.scope??(photograph?spatial.scope:'沿现状源道路进入聚落 · 要素按讲述显露，非历史建设复原')}</small></div>}
   {view.mode==='line'&&(view.arrivalProgress??0)>0&&context&&<div className="pilot-descent-reading">沿线高点约{Math.round(context.profile[context.highestIndex].elevation/10)*10}m → 鲁朗末端约{Math.round(context.profile.at(-1)!.elevation/10)*10}m<small>同一路径的地表采样 · 两个高程标杆落在原地形上</small></div>}
   {highLook&&<div className="pilot-look-reading"><strong>同一观察位置 · {view.lookBack?'回望来路':'向前看鲁朗方向'}</strong><small>保持第{km}公里地表样本位置，只改变观察方向；不是道路实拍。</small></div>}
   {(view.mode==='line'||view.routeRead!==undefined)&&<div className="pilot-travel-key"><span>{view.routeRead===undefined?'金色：已读路段':'金色：正在顺着源道路阅读'}</span><span>青色：后续来路</span><small>{view.routeRead===undefined?'沿归档道路压缩推进 · 非行车实录':'展示原道路转折，不是城市间直线或行车实录'}</small></div>}
   {view.elevation&&<div className="pilot-elevation-key"><strong>同一地形 · 地表高程对照</strong><div className="pilot-height-ramp"/><div><span>2900 m</span><span>4000 m</span><span>5300 m</span></div><small>高度1× · 剖面下沿为2500 m共同基准<br/>DSM地表采样，非山口实测或城市平均海拔</small></div>}
   {culture.active&&<div className="pilot-culture-key"><strong>{culture.supply?'经营关系示意':'假设：移去供货联系'}</strong><span>工序为示意 · 实景照片独立标明日期</span><em>{lulangCultureSteps[culture.step].title}</em></div>}
   <div className="pilot-caption" hidden={fieldObservation} data-route-read={view.routeRead} data-route-look-back={view.lookBack} data-route-beat={beat.id} data-route-mode={view.mode} data-route-progress={view.progress} data-route-context={view.routeContext??0} data-route-manual={manual} data-route-connections={view.connections} data-route-connection-progress={connection} data-place-lens={view.placeLens} data-service-filter={view.serviceFilter} data-section-progress={view.sectionProgress} data-camera-pitch={view.cameraPitch} data-camera-bearing={view.cameraBearing} data-elevation={view.elevation===true}><small>{manual?'手动观察 · 原句已暂停':director.playing?'跟随讲述':'已暂停'}</small><p>{manual?sceneReason:<NarrationCaption text={director.timing?.caption||beat.text.split('。')[0]+'。'} timing={director.timing}/>}</p></div>
  </section><aside className="pilot-reading">
   <p className="pilot-eyebrow">沿途观察 · {director.beatIndex+1} / 4</p><h2>{routePilotCues[director.beatIndex].title}</h2>
   <details className="pilot-step-list"><summary>讲述顺序 · {director.beatIndex+1} / 4</summary><nav aria-label="本段认识顺序">{routePilotCues.map((b,i)=><button key={b.id} aria-current={director.beatIndex===i?'step':undefined} onClick={()=>select(i)}>{i+1} · {b.title}</button>)}</nav></details>
   <div className="pilot-camera-controls" role="group" aria-label="地图观察角度">{([['overhead','俯视线路'],['oblique','斜看山谷'],['relief','高程对照']] as const).map(([id,title])=><button key={id} aria-pressed={manual&&view.cameraPitch===pilotCameraPresets[id].cameraPitch} onClick={()=>change({...pilotCameraPresets[id],...(view.mode==='place'?{placeMedia:'map'}:{}),...(view.mode==='place'&&id==='relief'?{placeLens:'landscape',servicesVisible:false}:{})})}>{title}</button>)}</div>
   {director.beatIndex===3&&view.mode!=='place'&&lineReturn&&<button className="pilot-primary pilot-local-return" onClick={backToLine}>返回进入前的原线原句</button>}
   {context&&view.mode!=='place'&&<PilotRouteProfile context={context} progress={view.progress} onSelect={progress=>change({mode:'line',progress})}/>}
   {view.mode!=='place'?<section className="pilot-controls" aria-label="沿真实道路操作"><strong>位置改变，视野也改变</strong><label>沿线位置 · {km} km<input aria-label="G318沿线位置" type="range" min="0" max="1" step=".001" value={view.progress} onChange={e=>change({mode:'line',progress:Number(e.target.value)})}/></label><div><button onClick={()=>change({mode:'line',progress:0})}>城区出发</button><button onClick={()=>change({mode:'line',progress:reading?.highProgress??.5})}>山地对照</button><button onClick={()=>change({mode:'line',progress:1})}>鲁朗附近</button></div><div><button aria-pressed={view.lookBack} onClick={()=>change({mode:'line',lookBack:!view.lookBack})}>{view.lookBack?'向前看':'在原位回望'}</button><button onClick={()=>change({mode:'whole',mapZoom:1,mapFocusWeight:0})}>回看整段</button></div><button className="pilot-primary" onClick={enterPlace}>进入鲁朗 · 保留原路段</button></section>:<><button className="pilot-primary pilot-local-return" onClick={backToLine}>返回进入前的原线原句</button><LulangPlaceControls view={view} data={context?.lulang} onChange={change}/><details className="pilot-local-road" open={lens==='life'&&(!view.placePhoto||view.placePhoto==='town')}><summary>沿地方接续道路观察</summary><section className="pilot-controls" aria-label="鲁朗过境与地方接续对照"><strong>从来路到地方：一步步读连接</strong><ol className="pilot-local-stages"><li aria-current={connection===0?'step':undefined}>国道来路</li><li aria-current={connection>0&&connection<.65?'step':undefined}>地方接续</li><li aria-current={connection>=.65?'step':undefined}>建筑与生活空间</li></ol><label>地方接续 · {Math.round(connection*100)}%<input aria-label="地方接续观察进度" type="range" min="0" max="1" step=".01" value={connection} onChange={e=>change({placeMedia:'map',placePhoto:undefined,placeLens:'life',connections:Number(e.target.value)>0,connectionProgress:Number(e.target.value),servicesVisible:false})}/></label><div><button aria-pressed={!view.connections} onClick={()=>change({placeMedia:'map',placePhoto:undefined,placeLens:'life',connections:false,connectionProgress:0,servicesVisible:false})}>只看过境道路</button><button aria-pressed={view.connections} onClick={()=>change({placeMedia:'map',placePhoto:undefined,placeLens:'life',connections:true,connectionProgress:1,servicesVisible:false})}>展开地方接续</button></div><p>青：国道来路 · 金：来源标为地方/服务道路的末端接续 · 白：建筑轮廓。未复原2016年街区。</p></section></details></>}
   <div className="pilot-controls"><label>观察高度<input aria-label="沿线观察高度" type="range" min="2500" max="6500" step="100" value={Math.max(2500,view.height)} onChange={e=>change({height:Number(e.target.value),...(view.mode==='place'?{placeMedia:'map'}:{})})}/></label><small>卫星像元10m，限制近距离放大；不是街景。拖动地图旋转会暂停讲述。</small>{reading&&<output>当前位置地表样本约{Math.round(reading.elevation/10)*10}m · 总归档路长约{(reading.total/1000).toFixed(1)}km</output>}</div>
   <p className="pilot-reason" role="status">{reason}</p>{status&&<p role={saveOK?'status':'alert'}>{status}</p>}
   <Sources/>
  </aside></div>
  <footer className="pilot-player"><div><button className="pilot-primary" aria-label={director.playing?'暂停讲述':manual?'恢复原讲述并有声播放':'有声播放线路讲解'} onClick={play} disabled={!director.ready}>{director.playing?'暂停讲述':manual?'恢复原条件并继续':director.beatIndex===beats.length-1&&director.raw>=1?'重新沿线观察':'继续讲述'}</button>{publisherVideo?<span>原片音量在播放器内</span>:fieldObservation?<span>本处声音在画面内播放 / 暂停</span>:<button aria-label={director.voice?'静音浏览':'开启声音并播放讲解'} onClick={()=>{if(director.voice)director.setVoice(false);else{director.setVoice(true);if(!director.wantsPlayback)play();}}}>{director.voice?'静音浏览':'开启声音并播放'}</button>}<span className="pilot-sound-status">{publisherVideo?'原片独立声音':fieldObservation?'线路已暂停 · 可听当前实景':director.playing?(director.voice?'有声讲述中':'静音浏览中'):director.voice?'讲解已暂停 · 点击有声播放':'当前静音 · 点击开启声音'}</span><span>{Math.round(director.raw*100)}% · 讲述进度</span><button onClick={()=>openPlan()}>保存观察问题</button></div><label>当前语句进度<input aria-label="线路讲述进度" type="range" min="0" max="1" step=".001" value={director.raw} onChange={e=>{setOverride(undefined);setCameraKey(k=>k+1);director.seek(Number(e.target.value));}}/></label><small>含修改的Copernicus Sentinel数据（2025） · Copernicus GLO-30 · © OpenStreetMap contributors。地图观察位置不代表可停靠/开放条件。</small></footer>
 </main>;
}
function Sources(){return <details className="pilot-sources"><summary>真实资料、时间与展示边界</summary>{routePilotSources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}<p>冬季卫星影像不是实时天气。2016试运营、2017运营记录解释人的组织，不用现状建筑假造历史外观；路线末端不是核实的酒店入口或实地停靠建议。</p></details>;}
