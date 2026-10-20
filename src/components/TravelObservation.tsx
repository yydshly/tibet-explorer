import {useCallback,useEffect,useRef,useState} from 'react';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import PilotRouteTerrain from '../scene/PilotRouteTerrain';
import type {PilotTerrainContext} from '../scene/routePilotTerrainData';
import {travelBeats,travelFrame,travelPhotos,travelPlaceTitle,travelPositionKey,travelStops,type TravelFrame} from '../data/travelObservation';
import type {TravelSession} from '../lib/travelObservationStore';
import NarrationCaption from './NarrationCaption';
import {useRoadRide} from '../hooks/useRoadRide';
import RoadRideControls from './RoadRideControls';
import {getExistingNarrationAsset} from '../lib/narration';
import {getNarrationTimeline} from '../lib/narrationTiming';
import './TravelObservation.css';

const noop=()=>{};
export default function TravelObservation({session,onReturn}:{session:TravelSession;onReturn:(resume:boolean)=>void}){
 const {place}=session,director=useOverviewDirector({beats:travelBeats(place),storageKey:travelPositionKey(place)});
 const stageRef=useRef<HTMLElement>(null);
 const revealStage=()=>{const stage=stageRef.current;if(stage&&(stage.getBoundingClientRect().top<0||stage.getBoundingClientRect().top>window.innerHeight*.25))stage.scrollIntoView({block:'start',behavior:'instant'});};
 const [photoPositions,setPhotoPositions]=useState<Record<string,number>>({}),[anchor,setAnchor]=useState(.65),[sceneReady,setSceneReady]=useState(false),[imagesReady,setImagesReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [manual,setManual]=useState<TravelFrame>(),[cameraKey,setCameraKey]=useState(0),[choice,setChoice]=useState<number>(),[intent,setIntent]=useState(false);
 const [terrainContext,setTerrainContext]=useState<PilotTerrainContext>(),[photoEntry,setPhotoEntry]=useState<number>();
 const enterRoadPhoto=()=>{director.pause();director.select(0);director.seek(photoEntry!);setManual(undefined);setCameraKey(k=>k+1);setIntent(true);revealStage();};
 const ride=useRoadRide(terrainContext,photoPositions.road,enterRoadPhoto);
 useEffect(()=>{if(ride.active)setCameraKey(k=>k+1);},[ride.active,ride.look,ride.running]);
 const p=director.timing?.textProgress??0,native=travelFrame(place,director.beatIndex,p,anchor,photoPositions.road),baseFrame=manual??native;
 const frame:TravelFrame=ride.active?{map:{...baseFrame.map,mode:'line',progress:ride.progress,elevation:false,routeContext:0,arrivalProgress:0,placeMedia:'map'},phase:'ride',focus:-1,title:ride.look==='overview'?'升高，看清道路怎样绕山':'沿真实道路，连续观察',why:ride.sample&&ride.sample.grade>.015?'地表采样总体上升，沿道路转弯继续接近实拍机位。':ride.sample&&ride.sample.grade<-.015?'这一小段地表采样下降；上山路线也会有局部起伏。':'沿道路前进，观察山坡如何遮挡和打开视野。'}:baseFrame;
 const photo=frame.photo?travelPhotos[frame.photo]:undefined,feature=photo&&frame.focus>=0?photo.features[frame.focus]:undefined;
 const ready=sceneReady&&imagesReady&&!error,ended=director.beatIndex===1&&director.raw>=1;
 useEffect(()=>{if(error)ride.stop();},[error]);
 useEffect(()=>{
  if(place!=='sejila')return;let alive=true;
  const beat=travelBeats('sejila')[0];
  void getExistingNarrationAsset(beat.recordingId,beat.text).then(async asset=>{
   if(!asset)return;const timeline=await getNarrationTimeline(asset),offset=beat.text.indexOf('转到二零一五');
   const word=timeline?.words?.find(w=>w.textStart<=offset&&w.textEnd>offset);
   if(alive&&word)setPhotoEntry(word.start/asset.duration);
  }).catch(()=>{});
  return()=>{alive=false;};
 },[place]);
 useEffect(()=>{
  let alive=true;const images:HTMLImageElement[]=[];setImagesReady(false);setError('');
  const ids=place==='sejila'?['road','overlook','snow','weather']:['forest','grazing','town','daily'];
  void Promise.all(ids.map(id=>new Promise<void>((resolve,reject)=>{
   const img=new Image();images.push(img);img.onload=()=>{void img.decode().then(resolve,reject);};img.onerror=()=>reject(Error('实景未能载入，请重试。'));img.src=travelPhotos[id].src;
  }))).then(()=>{if(alive)setImagesReady(true);}).catch(e=>{if(alive){setError(e instanceof Error?e.message:'实景未能载入');director.pause();}});
  return()=>{alive=false;images.forEach(img=>{img.onload=null;img.onerror=null;});};
 },[place,retry,director.pause]);
 const onReady=useCallback(()=>setSceneReady(true),[]);
 const onError=useCallback((message:string)=>{setError(message);setIntent(false);director.onSceneError('travel-'+place,message);},[place,director.onSceneError]);
 const onContext=useCallback((context:PilotTerrainContext)=>{
  const positions:Record<string,number>={};
  for(const id of ['road','overlook','snow','weather']){
   const camera=travelPhotos[id].coordinate!;let nearest=0;
   for(let i=1;i<context.profile.length;i++){const a=context.profile[i].coordinate,b=context.profile[nearest].coordinate;if(Math.hypot(a[0]-camera[0],a[1]-camera[1])<Math.hypot(b[0]-camera[0],b[1]-camera[1]))nearest=i;}
   positions[id]=context.profile[nearest].distance/context.total;
  }
  setPhotoPositions(positions);setAnchor(positions.snow);
  setTerrainContext(context);
 },[]);
 useEffect(()=>{
  if(!ready)return;director.onSceneReady('travel-'+place);
  if(intent&&!manual){setIntent(false);director.playPause();}
 },[ready,place,intent,manual,director.onSceneReady,director.playPause]);
 const play=()=>{
  if(ride.active){ride.setRunning(!ride.running);setCameraKey(k=>k+1);return;}
  if(director.wantsPlayback){director.pause();setIntent(false);return;}
  revealStage();
  if(ended&&manual){setManual(undefined);setCameraKey(k=>k+1);setIntent(false);return;}
  setManual(undefined);setCameraKey(k=>k+1);
  if(ended){director.select(0);director.seek(0);}
  setIntent(true);
 };
 const observe=(next:TravelFrame)=>{ride.stop();director.pause();setIntent(false);setManual(next);setCameraKey(k=>k+1);revealStage();};
 const selectBeat=(index:number)=>{ride.stop();director.pause();setIntent(false);setManual(undefined);director.select(index);setCameraKey(k=>k+1);revealStage();};
 const back=(resume:boolean)=>{ride.stop();director.pause();setIntent(false);onReturn(resume);};
 const startRide=()=>{director.pause();setIntent(false);ride.setVoice(director.voice);ride.start();setCameraKey(k=>k+1);revealStage();};
 const cancelRide=()=>{ride.stop();setCameraKey(k=>k+1);revealStage();};
 return <main className="travel-observation">
  <header><button onClick={()=>back(false)}>← 返回原线原句</button><div><small>沿G318的一次可选停留</small><strong>{travelPlaceTitle[place]}</strong></div><button onClick={()=>back(true)}>继续原线讲述 →</button></header>
  <div className="travel-layout"><section ref={stageRef} className="travel-stage" aria-label={travelPlaceTitle[place]} data-place={place} data-ride={ride.active} data-ride-beat={ride.active?ride.beatIndex:undefined} data-ride-timing={ride.active?ride.timing?.timingLevel:undefined} data-ride-distance={ride.active?ride.distance:undefined} data-beat={director.beatIndex} data-raw={director.raw} data-phase={frame.phase} data-photo={frame.photo??'none'} data-focus={frame.focus} data-manual={!!manual} data-timing-level={director.timing?.timingLevel??'waiting'}>
   <div className={'travel-map'+(photo?' travel-map-locator':'')}><PilotRouteTerrain key={retry} view={frame.map} rideLook={ride.active?ride.look:undefined} rideEnd={ride.active?ride.segment?.end:undefined} cameraKey={cameraKey} playing={ride.active?ride.running:director.playing&&!manual} fieldReveal={0} onReady={onReady} onError={onError} onInteract={()=>{director.pause();setIntent(false);ride.setRunning(false);}} onReading={noop} onContext={onContext}/>{photo&&<small>同一线路 · 机位附近定位</small>}</div>
   {photo&&<figure className="travel-photo" key={frame.photo}><div style={{aspectRatio:photo.aspect??1.5}}><img src={photo.src} alt={photo.title}/>{feature&&<svg viewBox={'0 0 1000 '+1000/(photo.aspect??1.5)} aria-hidden="true">{frame.photo==='road'&&<path className="travel-road-trace" pathLength={1} style={{strokeDashoffset:manual?0:1-(frame.roadRead??1)}} d="M 1000 548 L 790 535 L 650 531 Q 554 528 513 504 Q 480 479 460 461 Q 450 447 465 437 Q 480 426 454 420 L 448 414"/>}<circle cx={feature.x*10} cy={feature.y*10/(photo.aspect??1.5)} r="22"/><path d={'M '+feature.x*10+' '+feature.y*10/(photo.aspect??1.5)+' l '+(feature.x>60?-90:90)+' -48'}/><text x={feature.x>60?Math.max(25,feature.x*10-310):Math.min(700,feature.x*10+75)} y={Math.max(45,feature.y*10/(photo.aspect??1.5)-58)}>{feature.title}</text></svg>}</div><figcaption>{photo.date} · {photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · <a href={photo.source} target="_blank" rel="noreferrer">原图出处 ↗</a><br/>{photo.scope}</figcaption></figure>}
   <div className="travel-title"><small>{photo?'有日期的真实影像':'真实地形与原道路 · 2025冬季底图'}</small><h1>{frame.title}</h1></div>
   {ride.active&&<div className="road-ride-inset"><strong>{((ride.segment!.end-ride.distance)/1000).toFixed(2)} km → 实拍机位附近</strong><span>地表约 {Math.round(ride.sample!.here.elevation/10)*10} m · {ride.look==='overview'?'升高观察':'视点抬高12 m'} · 加速演示</span><div>{(['forward','back','overview'] as const).map((look,i)=><button key={look} aria-pressed={ride.look===look} onClick={()=>{ride.setLook(look);setCameraKey(k=>k+1);}}>{['向前','回望','升高'][i]}</button>)}</div></div>}
   <div className="travel-caption"><small>{ride.active?'MiniMax沿路讲述 · 路面宽度8 m为示意 · 近处地形着色':manual?'自主观察 · 讲述已暂停':director.playing?'MiniMax有声讲述 · 标注随语句变化':'可以自主观察，也可以播放讲述'}</small><p>{ride.active?<NarrationCaption text={ride.timing?.caption||'准备沿路讲述…'} timing={ride.timing}/>:manual?frame.why:<NarrationCaption text={director.timing?.caption||director.beat.text.split('。')[0]+'。'} timing={director.timing}/>}</p></div>
   {!ready&&<div className="travel-loading" role="status">{error||'正在准备同一线路与真实影像…'}{error&&<button onClick={()=>{director.retryScene();setSceneReady(false);setRetry(n=>n+1);}}>重试资料</button>}</div>}
  </section><aside className="travel-reading">
   <p className="travel-kicker">{place==='sejila'?'沿路上山 → 道路与路边 → 天气记录 → 入谷':'进入谷地 → 林海草地 → 小镇与日常'}</p>
   <h2>{place==='sejila'?'这一站，值得留意什么？':'为什么在鲁朗慢下来？'}</h2>
   <p>{place==='sejila'?'视野随道路升降与山体遮挡改变。远眺是一种有天气条件的期待。':'风景、公共生活与地方文化共同构成停留价值。小镇与传统村落分别认识。'}</p>
   <div className="travel-beats">{travelBeats(place).map((b,i)=><button key={b.id} aria-pressed={director.beatIndex===i} onClick={()=>selectBeat(i)}>{i+1} · {travelCuesTitle(b.recordingId)}</button>)}</div>
   {place==='sejila'&&<section><h3>先走一段，再看实拍</h3>{ride.active&&terrainContext?<RoadRideControls ride={ride} context={terrainContext} onPhoto={()=>{ride.stop();enterRoadPhoto();}} onCancel={cancelRide}/>:<><p>沿实拍机位前约1.8 km的归档道路连续前进，看看山坡、转弯与视野怎样变化。分段讲述随行进同步，可随时暂停回望；不改变整线原讲述长度。</p><button className="travel-primary" disabled={!ready||photoEntry===undefined||!terrainContext||!ride.ready} onClick={startRide}>沿路前进，到实拍处</button><p className="travel-boundary">三维空间演示，非司机视角：地形网格约45 m，视点抬高12 m；8 m路宽为示意，近处以地形着色替代放大影像；无实测路面和近景设施。到达后衔接有日期的原实拍与语音。</p></>}</section>}
   <section><h3>停下来，看一个关系</h3><div className="travel-actions">
    <button onClick={()=>observe({...frame,photo:undefined,focus:-1,phase:'map',title:'回到同一线路与地形',map:{...frame.map,placeMedia:'map',photoOverlay:undefined,cameraPitch:50},why:'实拍与底图各有日期，定位到机位附近；没有把照片与地形当作像素配准。'})}>地图与位置</button>
    <button onClick={()=>observe({...frame,photo:undefined,focus:-1,phase:'relief',title:'斜看地形与来路',map:{...frame.map,elevation:true,cameraPitch:30,lookBack:!frame.map.lookBack},why:'同一路段回望，山体遮挡与道路转折进入视野；高程为地表采样。'})}>斜看／回望</button>
   </div>
   <div className="travel-actions">{(place==='sejila'?['road','overlook','snow','weather']:['forest','grazing','town','daily']).map(id=><button key={id} aria-pressed={frame.photo===id} onClick={()=>{const selected=travelPhotos[id];observe({...travelFrame(place,id==='weather'||id==='town'||id==='daily'?1:0,1,anchor),photo:id,focus:0,phase:id,title:selected.title,why:selected.scope,map:place==='sejila'?{...frame.map,mode:'line',progress:photoPositions[id]??anchor}:{...frame.map,mode:'place',progress:1,placeMedia:'map',placePhoto:id as 'forest'|'grazing'|'town'|'daily',connections:true,connectionProgress:1,servicesVisible:false}});}}>{travelPhotos[id].title}</button>)}</div>
   {photo&&<div className="travel-actions">{photo.features.map((f,i)=><button key={f.title} aria-pressed={frame.focus===i} onClick={()=>observe({...frame,focus:i,why:f.detail})}>{f.title}</button>)}</div>}
   {manual&&<p role="status" className="travel-feedback">{frame.why}</p>}
   {manual&&<button className="travel-primary" onClick={play}>{ended?'返回这处结束画面':'继续这处讲述'}</button>}
   </section>
   <section><h3>我为什么想停留</h3>{travelStops[place].map((s,i)=><button className="travel-interest" key={s.title} aria-pressed={choice===i} onClick={()=>{ride.setRunning(false);director.pause();setIntent(false);setChoice(i);}}>{s.title}</button>)}{choice!==undefined&&<p role="status" className="travel-feedback">{travelStops[place][choice].reason}</p>}</section>
   <p className="travel-boundary">{place==='sejila'?'本轮沿路实拍没有清晰远峰或日照金山，也不是连续行车录像。观景点、停车与最后步行接入仍需核实。':'复用2008、2014、2024等有日期影像；它们不是同一机位的前后对照。没有未获准节庆视频，也不承诺入户或活动。'}</p>
   <a href="/project-review/index.html#travel-access-gate" target="_blank" rel="noreferrer">入口、素材和资料依据 ↗</a>
   <p>返回目标：整线第{session.returnTo.beatIndex+1}段 · 原句{(session.returnTo.raw*100).toFixed(1)}%。</p>
   {ended&&!ride.active&&<div className="travel-complete"><strong>这处观察已结束。</strong><p>可以继续自由观察，或回到进入前的原线原句。</p><button onClick={()=>back(true)}>返回并继续原线</button></div>}
  </aside></div>
  <footer><div><button className="travel-primary" disabled={!ready} onClick={play}>{ride.active?(ride.running?'暂停前进':'继续前进'):director.wantsPlayback?'暂停这处讲述':manual?(ended?'返回这处结束画面':'继续这处讲述'):ended?'重看这处':director.voice?'有声看这一处':'静音看这一处'}</button><button onClick={()=>{director.setVoice(!director.voice);ride.setVoice(!director.voice);}}>{director.voice?'静音':'开启声音'}</button><span>{ride.active?'沿路 '+(ride.beatIndex+1)+' / 4':(director.beatIndex+1)+' / 2'} · {ride.active?(ride.running?'沿路前进中':'沿路观察已暂停'):director.playing?'讲述中':manual?'自主观察':'已暂停'}</span><button onClick={()=>back(false)}>返回原线原句</button></div><label>当前讲述位置<input aria-label="地方体验原句进度" disabled={ride.active} type="range" min="0" max="1" step=".001" value={director.raw} onChange={e=>{setIntent(false);setManual(undefined);director.seek(Number(e.target.value));setCameraKey(k=>k+1);}}/></label>{(director.error||ride.error)&&<p role="alert">{director.error||ride.error}</p>}<small>真实影像与原理阅读分开 · 无现场环境声 · 含修改的Copernicus Sentinel数据（2025）、GLO-30 · © OpenStreetMap contributors</small></footer>
 </main>;
}
function travelCuesTitle(id:string){return id.endsWith('road')?'道路与路边风景':id.endsWith('outlook')?'天气与远眺':id.endsWith('landscape')?'林海与草地':'小镇与街边生活';}
