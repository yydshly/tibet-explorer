import {lulangCultureState,lulangCultureFeedback,lulangCultureSteps} from '../data/lulangCulture';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import {routePilotCues,routePilotIdentity,routePilotPath,routePilotSources,pilotNarratedView,pilotConnectionProgress,pilotScriptVersions,pilotResumeAliases,type PilotView} from '../data/routePilot';
import {PILOT_POSITION_KEY,readPilotNote,writePilotNote,type PilotNote,type PilotReturn} from '../lib/routePilotStore';
import PilotRouteTerrain,{type PilotReading} from '../scene/PilotRouteTerrain';
import type {PilotTerrainContext} from '../scene/routePilotTerrainData';
import PilotRouteProfile from './PilotRouteProfile';
import NarrationCaption from './NarrationCaption';
import LulangPlaceControls from './LulangPlaceControls';
import {lulangServiceFeedback} from '../data/lulangPlace';
import {pilotCameraPresets} from '../data/routePilotCamera';
import LulangLifeStage from './LulangLifeStage';
import {lulangMediaFeedback} from '../data/lulangLife';
import './RouteExperience.css';

export default function RouteExperience(){
 const route=location.hash.split('?')[0].replace(/^#/,'');
 if(route==='/routes')return <main className="pilot-catalog"><header><a href="#/overview">← 认识西藏 · 六章</a><span>沿线路认识地方</span></header><p className="pilot-eyebrow">经典线路 · 第一段</p><h1>把刚认识的西藏，<br/>放进真实的山谷和道路。</h1><a className="pilot-route-card" href={`#${routePilotPath}`}><img src="/assets/routes/g318/sentinel-20251213.webp" alt="2025年12月13日林芝至鲁朗区域的真实卫星影像"/><div><span>G318 · 已开放一段</span><h2>林芝—色季拉山地—鲁朗</h2><p>沿约72公里归档道路前进，进入鲁朗，观察河谷、聚落与街边生活，区分地方传统和当代活动，再返回原线。</p><strong>开始沿线观察 →</strong></div></a><p>真实卫星影像与地表高程。路线位置与讲述同步；地图观察不提供实时导航或实地停靠保证。</p></main>;
 return <PilotPlayback/>;
}
function PilotPlayback(){
 const beats=useMemo(()=>routePilotCues.map(c=>({id:c.id,recordingId:c.id,text:c.narration,sceneIdentity:routePilotIdentity})),[]);
 const director=useOverviewDirector({beats,storageKey:PILOT_POSITION_KEY,resumeAliases:pilotResumeAliases});
 const initial=useMemo(readPilotNote,[]),[note,setNote]=useState<PilotNote>(initial),[status,setStatus]=useState(''),[saveOK,setSaveOK]=useState(true);
 const [override,setOverride]=useState<PilotView|undefined>(initial.returnTo?.view),[lineReturn,setLineReturn]=useState<PilotReturn|undefined>(initial.lineReturn);
 const [reading,setReading]=useState<PilotReading>(),[context,setContext]=useState<PilotTerrainContext>(),[cameraKey,setCameraKey]=useState(0);
 const beat=beats[director.beatIndex],planMode=new URLSearchParams(location.hash.split('?')[1]||'').get('plan')==='1';
 const native=pilotNarratedView(director.beatIndex,beat.text,director.timing?.textProgress??0,reading?.highProgress??.5),view=override??native;
 const culture=lulangCultureState(view);
 const publisherVideo=view.mode==='place'&&view.placeMedia==='record';
 const manual=Boolean(override),lastLine=useRef<PilotReturn|undefined>(undefined);
 const snapshot=():PilotReturn=>({beatIndex:director.beatIndex,raw:director.raw,voice:director.voice,scriptVersion:pilotScriptVersions[director.beatIndex],view:{...view}});
 if(director.beatIndex<2&&!planMode)lastLine.current=snapshot();
 const persist=(next:PilotNote)=>{setNote(next);const ok=writePilotNote(next);setSaveOK(ok);setStatus(ok?'已保存到当前浏览器。':'保存失败，请先复制观察笔记；原讲述仍保留。');return ok;};
 useEffect(()=>{
  // Returning to the approach sentence must not automatically repeat the
  // already visited place. Explicit place selection starts a fresh visit.
  if(director.beatIndex===2&&note.skipPlaceOnce){
   const run=director.wantsPlayback,next={...readPilotNote(),skipPlaceOnce:false,lineReturn:undefined};
   setLineReturn(undefined);writePilotNote(next);setNote(next);director.select(3);if(run)director.playPause();return;
  }
  if(director.beatIndex===2&&!lineReturn&&lastLine.current){setLineReturn(lastLine.current);const next={...readPilotNote(),lineReturn:lastLine.current};writePilotNote(next);setNote(next);}
 },[director.beatIndex,lineReturn,note.skipPlaceOnce,director.wantsPlayback,director.select,director.playPause]);
 const onReady=useCallback(()=>director.onSceneReady(routePilotIdentity),[director.onSceneReady]);
 const onError=useCallback((s:string)=>director.onSceneError(routePilotIdentity,s),[director.onSceneError]);
 const onReading=useCallback((r:PilotReading)=>setReading(r),[]);
 const onContext=useCallback((c:PilotTerrainContext)=>setContext(c),[]);
 const onInteract=useCallback(()=>director.pause(),[director.pause]);
 const change=(patch:Partial<PilotView>)=>{director.pause();setOverride({...view,...patch});setCameraKey(k=>k+1);setStatus('观察已暂停原句；继续讲述时恢复原来的线路位置与条件。');};
 const play=()=>{setOverride(undefined);setCameraKey(k=>k+1);const next={...readPilotNote(),returnTo:undefined};writePilotNote(next);setNote(next);director.playPause();};
 const select=(i:number)=>{const next={...readPilotNote(),skipPlaceOnce:false,returnTo:undefined,lineReturn:undefined};writePilotNote(next);setNote(next);setLineReturn(undefined);setOverride(undefined);setCameraKey(k=>k+1);director.select(i);};
 const enterPlace=()=>{
  const original=snapshot();director.pause();setLineReturn(original);const next={...note,lineReturn:original,returnTo:undefined,skipPlaceOnce:false};persist(next);setOverride(undefined);setCameraKey(k=>k+1);director.select(2);director.playPause();
 };
 const restore=(target:PilotReturn)=>{director.pause();director.select(target.beatIndex);director.seek(target.raw);director.setVoice(target.voice);setOverride(target.view);setCameraKey(k=>k+1);};
 const backToLine=()=>{
  const target=lineReturn??lastLine.current??{beatIndex:1,raw:0,voice:director.voice,view:pilotNarratedView(1,beats[1].text,0)};
  restore(target);setLineReturn(undefined);persist({...note,lineReturn:undefined,returnTo:target,skipPlaceOnce:true});setStatus('已回到进入鲁朗前的原路段和原句。继续后接回整段总结，不重复地方讲述。');
 };
 const openPlan=()=>{const target=snapshot();director.pause();if(persist({...note,returnTo:target,lineReturn})){director.retryScene();location.hash=routePilotPath+'?plan=1';}};
 const returnPlan=()=>{if(!persist(note))return;if(note.returnTo)restore(note.returnTo);location.hash=routePilotPath;};
 const km=reading?(view.progress*reading.total/1000).toFixed(1):'—';
 const connection=pilotConnectionProgress(view),branchMetres=Math.round((context?.connectionLength??0)*connection);
 const connectionReason=view.mode==='place'?connection===0?'先读青色G318，金色圆环标出转入地方道路的实际节点。过境道路经过附近，进入地方还要继续接续。':connection<.65?`从国道接点沿金色地方道路读到约${branchMetres}米：观察转弯与地块的关系。金点表示阅读位置，不是车辆或历史施工。`:'地方道路、白色建筑轮廓与浅绿地块共同展开：国道经过附近，地方接续让道路进入聚落。接着看真实照片中的河流、房屋与街边生活。':view.mode==='whole'?'先把城区、山地与鲁朗放在一条真实道路中看；青色为国道来路，金色为已核对的末端地方接续。剖面与同一地形联动。':view.lookBack?'在同一位置回望：比较山体遮挡、道路绕行和刚经过的谷地。位置不变，观察方向改变。':`沿归档道路改变位置，地形与高程剖面同时对应${km}公里处；比较起点、山地与鲁朗的高低，再看道路如何绕行。高程是地表采样。`;
 const lens=view.placeLens??'life',sectionPoint=context?.lulang?.section[Math.round((view.sectionProgress??.5)*64)];
 const reason=lulangMediaFeedback(view)??(view.mode!=='place'?connectionReason:lens==='landscape'?`蓝线标出鲁朗河源河段，白线比较两侧地形；当前地表样本约${Math.round((sectionPoint?.elevation??reading?.elevation??0)/10)*10}米。移动观察点，比较河段与两侧的相对高低。绿色仅标原地图林地边线。`:culture.active?lulangCultureFeedback(view):view.servicesVisible?lulangServiceFeedback(view):lens==='culture'?'把地方生活放回同一河谷：2008年日常照片、2016年试运营报道与2026年活动原片各自有年代和范围；它们不是同一地点的历史前后对照。':connectionReason);
 if(planMode)return <main className="pilot-plan"><header><a href="#/overview">西藏探索</a><span>我的线路观察计划</span></header><h1>带着问题，回到同一段路。</h1><p>G318林芝—鲁朗 · 保留线路位置、语句与观察条件。</p><label>我的观察问题与笔记<textarea aria-label="线路观察笔记" maxLength={2000} rows={8} value={note.note} onChange={e=>persist({...note,note:e.target.value})}/></label><p>建议观察：谷地与沿途高差怎样改变视野？进入鲁朗后，道路、聚落与日常生活有什么关系？哪些属于真实记录，哪些仍需现场观察？</p><div><button onClick={()=>persist(note)}>保存观察计划</button><button onClick={returnPlan}>保存并返回原线</button></div><p role={saveOK?'status':'alert'}>{status}</p><Sources/></main>;
 return <main className="pilot-experience">
  <header className="pilot-header"><a href="#/overview">← 认识西藏</a><div><strong>G318 · 林芝—鲁朗</strong><small>一条真实道路，三个观察尺度</small></div><nav><a href="#/routes">线路总览</a><button onClick={openPlan}>线路观察笔记</button></nav></header>
  <div className="pilot-body"><section className="pilot-stage" aria-label="G318真实沿线三维观察" data-place-media={view.mode==='place'?(view.placeMedia??'map'):'map'}>
   <PilotRouteTerrain view={view} cameraKey={cameraKey} onReady={onReady} onError={onError} onReading={onReading} onContext={onContext} onInteract={onInteract}/>
   {view.mode==='place'&&view.placeMedia&&view.placeMedia!=='map'&&<LulangLifeStage view={view} onChange={change} onBack={backToLine}/>}
   {!director.ready&&!director.error&&<div className="pilot-loading" role="status">正在准备真实影像、高程与道路…</div>}
   {director.error&&<div className="pilot-loading" role="alert">{director.error}<button onClick={()=>location.reload()}>重新加载本段</button></div>}
   <div className="pilot-map-meta"><span>Sentinel-2 · 2025.12.13 · 10 m像元</span><span>GLO-30地表高程 · 高度1×</span></div>
   <div className="pilot-place-title"><span>{view.mode==='whole'?'整段来路':view.mode==='place'?'进入地方':'沿真实道路前进'}</span><h1>{view.mode==='place'?'鲁朗：山谷、聚落与人文':view.mode==='line'?`G318 · 第${km}公里`:'林芝—色季拉山地—鲁朗'}</h1></div>
   {view.elevation&&<div className="pilot-elevation-key"><strong>同一地形 · 地表高程对照</strong><div className="pilot-height-ramp"/><div><span>2900 m</span><span>4000 m</span><span>5300 m</span></div><small>高度1× · 剖面下沿为2500 m共同基准<br/>DSM地表采样，非山口实测或城市平均海拔</small></div>}
   {culture.active&&<div className="pilot-culture-key"><strong>{culture.supply?'经营关系示意':'假设：移去供货联系'}</strong><span>工序为示意 · 实景照片独立标明日期</span><em>{lulangCultureSteps[culture.step].title}</em></div>}
   <div className="pilot-caption" data-route-beat={beat.id} data-route-mode={view.mode} data-route-progress={view.progress} data-route-manual={manual} data-route-connections={view.connections} data-route-connection-progress={connection} data-place-lens={view.placeLens} data-service-filter={view.serviceFilter} data-section-progress={view.sectionProgress} data-camera-pitch={view.cameraPitch} data-camera-bearing={view.cameraBearing} data-elevation={view.elevation===true}><small>{manual?'手动观察 · 原句已暂停':director.playing?'跟随讲述':'已暂停'}</small><p>{manual?reason:<NarrationCaption text={director.timing?.caption||beat.text.split('。')[0]+'。'} timing={director.timing}/>}</p></div>
  </section><aside className="pilot-reading">
   <p className="pilot-eyebrow">沿途观察 · {director.beatIndex+1} / 4</p><h2>{routePilotCues[director.beatIndex].title}</h2>
   <details className="pilot-step-list"><summary>讲述顺序 · {director.beatIndex+1} / 4</summary><nav aria-label="本段认识顺序">{routePilotCues.map((b,i)=><button key={b.id} aria-current={director.beatIndex===i?'step':undefined} onClick={()=>select(i)}>{i+1} · {b.title}</button>)}</nav></details>
   <div className="pilot-camera-controls" role="group" aria-label="地图观察角度">{([['overhead','俯视线路'],['oblique','斜看山谷'],['relief','高程对照']] as const).map(([id,title])=><button key={id} aria-pressed={manual&&view.cameraPitch===pilotCameraPresets[id].cameraPitch} onClick={()=>change({...pilotCameraPresets[id],...(view.mode==='place'?{placeMedia:'map'}:{}),...(view.mode==='place'&&id==='relief'?{placeLens:'landscape',servicesVisible:false}:{})})}>{title}</button>)}</div>
   {director.beatIndex===3&&lineReturn&&<button className="pilot-primary pilot-local-return" onClick={backToLine}>返回进入前的原线原句</button>}
   {context&&view.mode!=='place'&&<PilotRouteProfile context={context} progress={view.progress} onSelect={progress=>change({mode:'line',progress})}/>}
   {view.mode!=='place'?<section className="pilot-controls" aria-label="沿真实道路操作"><strong>位置改变，视野也改变</strong><label>沿线位置 · {km} km<input aria-label="G318沿线位置" type="range" min="0" max="1" step=".001" value={view.progress} onChange={e=>change({mode:'line',progress:Number(e.target.value)})}/></label><div><button onClick={()=>change({mode:'line',progress:0})}>城区出发</button><button onClick={()=>change({mode:'line',progress:reading?.highProgress??.5})}>山地对照</button><button onClick={()=>change({mode:'line',progress:1})}>鲁朗附近</button></div><div><button aria-pressed={view.lookBack} onClick={()=>change({mode:'line',lookBack:!view.lookBack})}>{view.lookBack?'向前看':'在原位回望'}</button><button onClick={()=>change({mode:'whole',mapZoom:1,mapFocusWeight:0})}>回看整段</button></div><button className="pilot-primary" onClick={enterPlace}>进入鲁朗 · 保留原路段</button></section>:<><button className="pilot-primary pilot-local-return" onClick={backToLine}>返回进入前的原线原句</button><LulangPlaceControls view={view} data={context?.lulang} onChange={change}/><details className="pilot-local-road" open={lens==='life'}><summary>沿地方接续道路观察</summary><section className="pilot-controls" aria-label="鲁朗过境与地方接续对照"><strong>从来路到地方：一步步读连接</strong><ol className="pilot-local-stages"><li aria-current={connection===0?'step':undefined}>国道来路</li><li aria-current={connection>0&&connection<.65?'step':undefined}>地方接续</li><li aria-current={connection>=.65?'step':undefined}>建筑与生活空间</li></ol><label>地方接续 · {Math.round(connection*100)}%<input aria-label="地方接续观察进度" type="range" min="0" max="1" step=".01" value={connection} onChange={e=>change({placeMedia:'map',placeLens:'life',connections:Number(e.target.value)>0,connectionProgress:Number(e.target.value),servicesVisible:false})}/></label><div><button aria-pressed={!view.connections} onClick={()=>change({placeMedia:'map',placeLens:'life',connections:false,connectionProgress:0,servicesVisible:false})}>只看过境道路</button><button aria-pressed={view.connections} onClick={()=>change({placeMedia:'map',placeLens:'life',connections:true,connectionProgress:1,servicesVisible:false})}>展开地方接续</button></div><p>青：国道来路 · 金：来源标为地方/服务道路的末端接续 · 白：建筑轮廓。未复原2016年街区。</p></section></details></>}
   <div className="pilot-controls"><label>观察高度<input aria-label="沿线观察高度" type="range" min="2500" max="6500" step="100" value={Math.max(2500,view.height)} onChange={e=>change({height:Number(e.target.value),...(view.mode==='place'?{placeMedia:'map'}:{})})}/></label><small>卫星像元10m，限制近距离放大；不是街景。拖动地图旋转会暂停讲述。</small>{reading&&<output>当前位置地表样本约{Math.round(reading.elevation/10)*10}m · 总归档路长约{(reading.total/1000).toFixed(1)}km</output>}</div>
   <p className="pilot-reason" role="status">{reason}</p>{status&&<p role={saveOK?'status':'alert'}>{status}</p>}
   <Sources/>
  </aside></div>
  <footer className="pilot-player"><div><button className="pilot-primary" onClick={play} disabled={!director.ready}>{director.playing?'暂停讲述':manual?'恢复原条件并继续':director.beatIndex===beats.length-1&&director.raw>=1?'重新沿线观察':'继续讲述'}</button>{publisherVideo?<span>原片音量在播放器内</span>:<button onClick={()=>director.setVoice(!director.voice)}>{director.voice?'关闭声音':'开启声音'}</button>}<span>{Math.round(director.raw*100)}% · 讲述进度</span><button onClick={openPlan}>保存观察问题</button></div><label>当前语句进度<input aria-label="线路讲述进度" type="range" min="0" max="1" step=".001" value={director.raw} onChange={e=>{setOverride(undefined);setCameraKey(k=>k+1);director.seek(Number(e.target.value));}}/></label><small>含修改的Copernicus Sentinel数据（2025） · Copernicus GLO-30 · © OpenStreetMap contributors。地图观察位置不代表可停靠/开放条件。</small></footer>
 </main>;
}
function Sources(){return <details className="pilot-sources"><summary>真实资料、时间与展示边界</summary>{routePilotSources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}<p>冬季卫星影像不是实时天气。2016试运营、2017运营记录解释人的组织，不用现状建筑假造历史外观；路线末端不是核实的酒店入口或实地停靠建议。</p></details>;}
