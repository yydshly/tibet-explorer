import {useCallback,useEffect,useRef,useState} from 'react';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import {corridorBeats,corridorPath,corridorPositionKey,corridorNarratedView,corridorShot,corridorShots,corridorTransitions,type CorridorEdit,type CorridorView} from '../data/corridorJourney';
import {corridorPhoto,corridorObservations,savedCorridorObservation,corridorObservationFor,corridorPlanMarkdown} from '../data/corridorObservation';
import {readCorridorNote,writeCorridorNote,type CorridorNote,type CorridorSnapshot} from '../lib/corridorStore';
import {usePilotFieldImages} from '../hooks/usePilotFieldImages';
import {lulangMediaFeedback} from '../data/lulangLife';
import {tongmaiReasons} from '../data/tongmaiJourney';
import {bomiReasons} from '../data/bomiJourney';
import CorridorStage from './CorridorStage';
import NarrationCaption from './NarrationCaption';
import './CorridorExperience.css';

export default function CorridorExperience(){
 const director=useOverviewDirector({beats:corridorBeats,storageKey:corridorPositionKey});
 const [note,setNote]=useState(readCorridorNote),[manual,setManual]=useState<CorridorView>(),[edit,setEdit]=useState<CorridorEdit>(),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
 const [high,setHigh]=useState(.5),[loadedSurface,setLoadedSurface]=useState(''),[imagesReady,setImagesReady]=useState(false),[cameraKey,setCameraKey]=useState(0),[status,setStatus]=useState(''),[resumeIntent,setResumeIntent]=useState(false);
 const fields=usePilotFieldImages(true),planMode=new URLSearchParams(location.hash.split('?')[1]||'').get('plan')==='1';
 const [restoreInitial]=useState(()=>planMode||!readCorridorNote().returnPending?undefined:readCorridorNote().returnTo),hydrated=useRef(false),lastLine=useRef<CorridorSnapshot|undefined>(note.lineReturn);
 const p=director.timing?.textProgress??0,native=corridorNarratedView(director.beatIndex,p,high),view=manual??native,shot=corridorShot(director.beatIndex,p),photo=corridorPhoto(view),isEnd=director.beatIndex===8&&director.raw>=1;
 const snapshot=():CorridorSnapshot=>({beatIndex:director.beatIndex,raw:director.raw,view:structuredClone(view)});
 if(director.beatIndex===2&&!manual&&!planMode)lastLine.current=snapshot();
 useEffect(()=>{if(director.beatIndex===3&&!note.lineReturn&&lastLine.current){const next={...readCorridorNote(),lineReturn:lastLine.current};writeCorridorNote(next);setNote(next);}},[director.beatIndex,note.lineReturn]);
 useEffect(()=>{if(hydrated.current)return;hydrated.current=true;if(restoreInitial){director.select(restoreInitial.beatIndex);director.seek(restoreInitial.raw);setManual(restoreInitial.view);const next={...readCorridorNote(),returnPending:false};writeCorridorNote(next);setNote(next);}},[restoreInitial,director.select,director.seek]);
 useEffect(()=>{let alive=true;const abort=new AbortController();setLoadError('');void Promise.all([
  fetch('/assets/routes/g318-corridor/edit.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('整线编排资料未载入');return r.json();}).then(x=>{if(alive)setEdit(x);}),
  Promise.all(['/assets/routes/g318-tongmai/tongmai-20140921.jpg','/assets/routes/g318-bomi/bomi-street-20080917.jpg'].map(src=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{void img.decode().then(resolve,reject);};img.onerror=()=>reject(Error('既有实拍未载入'));img.src=src;}))).then(()=>{if(alive)setImagesReady(true);}),
 ]).catch(e=>{if(alive&&!abort.signal.aborted)setLoadError(e instanceof Error?e.message:'资料准备失败');});return()=>{alive=false;abort.abort();};},[retry]);
 const onReady=useCallback((kind:CorridorView['kind'])=>setLoadedSurface(kind),[]),onHigh=useCallback((n:number)=>setHigh(old=>old===n?old:n),[]);
 const onError=useCallback((s:string)=>{setLoadError(s);director.pause();setResumeIntent(false);},[director.pause]);
 useEffect(()=>{
  if(!edit||loadedSurface!==view.kind||!imagesReady||!fields.ready||loadError||planMode)return;
  director.onSceneReady(corridorBeats[director.beatIndex].sceneIdentity);
  if(resumeIntent&&!manual){setResumeIntent(false);if(!isEnd)director.playPause();}
 },[edit,loadedSurface,view.kind,imagesReady,fields.ready,loadError,planMode,resumeIntent,manual,isEnd,director.beatIndex,director.onSceneReady,director.playPause]);
 // Only the standalone invitation back to Lulang is omitted in this new edit.
 // Its original recording and original scene are not changed.
 useEffect(()=>{
  if(!edit||director.beatIndex!==5||!director.playing||manual)return;
  const remaining=(edit.durations[5]*edit.tongmaiEnd-director.audio.currentTime)*1000;
  const next=()=>{director.select(6);director.playPause();};
  // Schedule from the actual media tick so a coarse UI progress update does
  // not have to cross into the omitted standalone return invitation first.
  if(remaining<=0){next();return;}
  const timer=setTimeout(next,remaining);return()=>clearTimeout(timer);
 },[edit,director.beatIndex,director.audio?.currentTime,director.playing,manual,director.select,director.playPause]);
 const persist=(next:CorridorNote)=>{setNote(next);const ok=writeCorridorNote(next);setStatus(ok?'已保存到当前浏览器。':'当前浏览器未能保存，请先导出或复制笔记。');return ok;};
 const change=(v:CorridorView)=>{director.pause();setResumeIntent(false);setManual(v);setCameraKey(k=>k+1);};
 const angle=(overhead:boolean)=>{
  if(view.kind==='overview')change({...view,overhead});
  else if(view.kind==='pilot')change({...view,value:{...view.value,placeMedia:'map',placePhoto:undefined,photoOverlay:undefined,cameraPitch:overhead?78:42,elevation:overhead,lookBack:overhead?false:!view.value.lookBack}});
  else if(view.kind==='tongmai')change({...view,value:{...view.value,phase:view.value.phase==='archive'?'bridge':view.value.phase,overhead}});
  else change({...view,value:{...view.value,phase:view.value.phase==='photo'?'valley':view.value.phase,overhead}});
 };
 const select=(index:number,raw=0)=>{director.pause();setResumeIntent(false);setManual(undefined);setCameraKey(k=>k+1);director.select(index);if(raw)director.seek(raw);};
 const play=()=>{if(director.wantsPlayback){director.pause();return;}if(isEnd&&manual){setManual(undefined);setCameraKey(k=>k+1);return;}setManual(undefined);setCameraKey(k=>k+1);if(isEnd){select(0);setResumeIntent(true);return;}if(edit&&director.beatIndex===5&&director.raw>=edit.tongmaiEnd)director.select(6);setResumeIntent(true);};
 const restore=(target:CorridorSnapshot)=>{director.pause();setResumeIntent(false);director.select(target.beatIndex);director.seek(target.raw);setManual(target.view);setCameraKey(k=>k+1);};
 const enterLulang=()=>{persist({...readCorridorNote(),lineReturn:snapshot()});change(corridorObservations[1].view);};
 const backLine=()=>{const target=note.lineReturn??lastLine.current;if(target)restore(target);};
 const openPlan=(capture:boolean)=>{const next={...readCorridorNote(),returnTo:snapshot(),returnPending:true,observation:capture?corridorObservationFor(view):readCorridorNote().observation??corridorObservationFor(view),observationView:capture?structuredClone(view):readCorridorNote().observationView??structuredClone(view)};director.pause();setResumeIntent(false);if(persist(next)){setLoadedSurface('');location.hash=corridorPath+'?plan=1';}};
 const returnPlan=()=>{if(!persist({...note,returnPending:false}))return;if(note.returnTo)restore(note.returnTo);location.hash=corridorPath;};
 const exportPlan=()=>{const url=URL.createObjectURL(new Blob([corridorPlanMarkdown(note)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='G318-林芝波密-观察计划.md';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('已导出对象、问题、笔记和资料出处。');};
 const reason=photo?(photo.features[photo.focus]?.detail??photo.scope):view.kind==='pilot'?(lulangMediaFeedback(view.value)??(view.value.lookBack?'原位置回望：位置不变，山体遮挡与来路进入视野。':'沿同一条道路改变位置；高差是地表采样，不能作桥面或停车标高。')):view.kind==='tongmai'?tongmaiReasons[view.value.phase]:view.kind==='bomi'?bomiReasons[view.value.phase]:'五个参照位置共用真实来路；金色强调当前阅读对象，不表示实时车辆。';
 const observation=savedCorridorObservation(note),savedPhoto=corridorPhoto(observation.view),visibleReady=!!edit&&loadedSurface===view.kind&&imagesReady&&fields.ready&&!loadError;
 const shotLabels=['整线定位','城市河谷','翻山高差','鲁朗空间','鲁朗人文','峡谷接续','通麦桥隧','波密街道','整线回看'];
 const duration=edit?.durations[director.beatIndex]??1,end=director.beatIndex===5?edit?.tongmaiEnd??1:1;
 const elapsed=edit?edit.durations.slice(0,director.beatIndex).reduce((sum,n,i)=>sum+(i===5?n*edit.tongmaiEnd:n),0)+Math.min(director.raw,end)*duration:0;
 if(planMode)return <main className="corridor-plan"><header><span>G318整线 · 观察计划</span><button onClick={returnPlan}>保存并返回原画面原句</button></header><h1>把问题带走，也保留来路。</h1><p>保存对象与返回目标分别保留；此页不生成按日出行安排。</p><section><h2>{observation.title}</h2>{savedPhoto&&<figure><img src={savedPhoto.src} alt={savedPhoto.title}/><figcaption>{savedPhoto.date} · {savedPhoto.author} · {savedPhoto.license}</figcaption></figure>}<p>观察问题：{observation.question}</p><p><a href={observation.source} target="_blank" rel="noreferrer">资料原出处 ↗</a>{savedPhoto&&<> · <a href={savedPhoto.licenseUrl} target="_blank" rel="noreferrer">影像许可 ↗</a></>}</p><p className="corridor-boundary">{observation.boundary}</p></section><label>我的问题与笔记<textarea aria-label="整线观察笔记" maxLength={4000} rows={7} value={note.text} onChange={e=>setNote({...note,text:e.target.value})}/></label><div className="corridor-actions"><button onClick={()=>{if(!note.text.includes(observation.question)&&note.text.length+observation.question.length+2<=4000)setNote({...note,text:note.text+(note.text?'\n\n':'')+observation.question});}}>带入观察问题</button><button onClick={()=>persist(note)}>保存计划</button><button onClick={exportPlan}>导出Markdown</button><button className="corridor-primary" onClick={returnPlan}>保存并返回原画面原句</button></div><p role="status">{status}</p><p>返回目标：整线录音段{(note.returnTo?.beatIndex??0)+1} · 原句{Math.round((note.returnTo?.raw??0)*100)}%。从其他画面打开笔记时，保存对象不会被覆盖。</p></main>;
 return <main className="corridor-experience"><header><a href="#/routes">← 线路入口</a><div><strong>G318 · 林芝—波密</strong><small>林芝 → 色季拉山地 → 鲁朗 → 通麦 → 波密</small></div><button onClick={()=>openPlan(false)}>我的观察计划</button></header>
  <div className="corridor-layout"><section className="corridor-stage" aria-label="G318完整认识主线" data-beat={director.beatIndex} data-shot={corridorShots[shot][0]} data-raw={director.raw} data-word-progress={p} data-manual={!!manual} data-view={JSON.stringify(view)} data-timing-level={director.timing?.timingLevel??'waiting'}>
   {edit&&<CorridorStage key={retry} view={view} edit={edit} cameraKey={cameraKey} manual={!!manual} onReady={onReady} onError={onError} onHigh={onHigh}/>}
   <div className="corridor-scene-title"><small>{photo?`${photo.date} · 有日期的实拍`:view.kind==='overview'?'三段既有高程／影像 · 整线对照':'2025-12-13影像 · 地表高度1×'}</small><h1>{photo?.title??(view.kind==='overview'?'先把地方，放回同一条来路。':corridorShots[shot][1])}</h1></div>
   {view.kind==='bomi'&&view.value.phase==='culture'&&<div className="corridor-evidence">波卓：波密县域文字线索<br/><small>不是所示街道的表演现场；起源传说不作史实。</small></div>}
   {view.kind==='bomi'&&view.value.phase==='life'&&<div className="corridor-evidence">2023年扎木镇文字材料<br/><small>农业、林下资源、旅游服务；乡镇范围不等于这条街。</small></div>}
   <div className="corridor-caption"><small>{manual?'自由观察 · 原句已暂停':director.playing?(director.voice?'跟随有声讲述':'静音播放'):'已暂停'}</small><p>{manual?reason:<NarrationCaption text={director.timing?.caption||corridorBeats[director.beatIndex].text.split('。')[0]+'。'} timing={director.timing}/>}</p></div>
   {!visibleReady&&<div className="corridor-loading" role="status">{loadError||fields.error||'正在接续真实线路与既有画面…'}{(loadError||fields.error)&&<button onClick={()=>{director.retryScene();setLoadedSurface('');setLoadError('');fields.retry();setRetry(n=>n+1);}}>重试资料</button>}</div>}
  </section><aside className="corridor-reading"><p className="corridor-eyebrow">完整认识主线 · 九镜约4分37秒</p><h2>{corridorShots[shot][1]}</h2><nav aria-label="整线九镜">{corridorShots.map((s,i)=><button key={s[0]} aria-label={`${s[0]} · ${s[1]}`} aria-current={shot===i?'step':undefined} onClick={()=>select(s[3],i===4?edit?.lulangCultureRaw??0:0)}><span>{s[0]}</span><small>{shotLabels[i]}</small></button>)}</nav><p className="corridor-handoff">{corridorTransitions[shot]}</p>
   <section className="corridor-controls"><h3>暂停，看清一个关系</h3>
    {view.kind==='overview'?<><div>{['城市河谷','沿线高差','鲁朗生活','通麦桥隧','波密街道'].map((name,i)=><button key={name} aria-pressed={view.focus===i} onClick={()=>change({...view,focus:i,read:1})}>{name}</button>)}</div><button onClick={()=>change({...view,focus:-1,read:1,overhead:!view.overhead})}>{view.overhead?'斜看整线':'俯视整线'}</button></>:<>
     <label>同一路段的位置<input aria-label="完整主线沿线位置" type="range" min="0" max="1" step=".001" value={view.value.progress} onChange={e=>change(view.kind==='pilot'?{...view,value:{...view.value,mode:'line',progress:Number(e.target.value),photoOverlay:undefined,placeMedia:'map'}}:view.kind==='tongmai'?{...view,value:{...view.value,phase:'travel',progress:Number(e.target.value)}}:{...view,value:{...view.value,phase:'travel',progress:Number(e.target.value)}})}/></label>
     <div><button onClick={()=>angle(true)}>俯视与高差</button><button onClick={()=>angle(false)}>斜看／回望</button></div>
    </>}
    {photo&&<div>{photo.features.map((f,i)=><button key={f.title} aria-pressed={photo.focus===i} onClick={()=>change(view.kind==='pilot'?{...view,value:{...view.value,photoFocus:i+1}}:view.kind==='tongmai'?{...view,object:i as 0|1|2}:view.kind==='bomi'?{...view,value:{...view.value,photoObject:i as 0|1|2}}:view)}>{f.title}</button>)}</div>}
    {view.kind==='pilot'&&<div>{view.value.mode!=='place'&&<button onClick={enterLulang}>进入鲁朗实拍 · 保留原线</button>}{note.lineReturn&&<button onClick={backLine}>返回进入前的原线原句</button>}</div>}
    {manual&&<p className="corridor-reason" role="status">{reason}</p>}{manual&&<button className="corridor-primary" onClick={play}>{isEnd?'返回结束画面':'继续原句'}</button>}
   </section>
   {shot===8&&<section className="corridor-controls"><h3>带走一个问题 · 可选</h3><p>可回看的既有对象；选择会暂停原句。</p><div>{corridorObservations.slice(1).map(o=><button key={o.id} onClick={()=>change(o.view)}>{o.title}</button>)}</div><button className="corridor-primary" onClick={()=>openPlan(true)}>保存当前观察问题</button></section>}
   <button className="corridor-capture" onClick={()=>openPlan(true)}>带当前对象进入观察计划</button><p role="status">{status}</p>
   <details><summary>资料范围与本版收口</summary><p>复用三段原始道路、高程、2025冬季影像及已核准的免费无水印实拍。林芝—鲁朗末端是地方支路；下一段明确从真实国道节点接续，不画直线补路。色季拉山地标的是沿线高样本，非山口实测值。</p><p>2008鲁朗与波密街景、2014旧桥、2024鲁朗航拍各有年代；工布新年及波卓文字资料不冒充照片中的活动。桥面、洞内、当前路况和实地停靠仍未测定。</p><p><a href="/project-review/index.html#corridor-delivery">交付、来源与限制 ↗</a> · <a href="/assets/routes/g318-corridor/edit.json">时长与原路参照 ↗</a></p><p>本入口独立保存播放与笔记，六章和三个独立路段保持冻结。自动讲述不包含操作、笔记编辑及加载等待。</p></details>
   {isEnd&&<div className="corridor-end"><strong>整线讲述结束。</strong><p>可直接结束，也可带走自己的问题；返回不会从头开始。</p><button onClick={()=>{select(0);setResumeIntent(true);}}>重看整线 · 保留笔记</button></div>}
  </aside></div>
  <footer className="corridor-player"><div><button className="corridor-primary" disabled={!visibleReady} onClick={play}>{director.wantsPlayback?'暂停讲述':manual?(isEnd?'返回结束画面':'继续原句'):isEnd?'重看整线':director.voice?'有声播放整线':'静音播放整线'}</button><button onClick={()=>director.setVoice(!director.voice)}>{director.voice?'静音':'开启声音'}</button><span>{Math.floor((isEnd?Math.round(elapsed):elapsed)/60)}:{String((isEnd?Math.round(elapsed):Math.floor(elapsed))%60).padStart(2,'0')} / 4:37 · {director.playing?(director.voice?'有声讲述中':'静音播放中'):'已暂停'}</span><button onClick={()=>openPlan(false)}>打开已保存计划</button></div><label>当前原句进度<input aria-label="整线原句进度" type="range" min="0" max={end} step=".001" value={Math.min(director.raw,end)} onChange={e=>{setResumeIntent(false);setManual(undefined);setCameraKey(k=>k+1);director.seek(Number(e.target.value));}}/></label>{director.error&&<p role="alert">{director.error}</p>}<small>含修改的Copernicus Sentinel数据（2025） · Copernicus GLO-30 · © OpenStreetMap contributors。金线为阅读强调，非实时车辆／导航。</small></footer>
 </main>;
}
