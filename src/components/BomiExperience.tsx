import {useCallback,useEffect,useRef,useState} from 'react';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import {bomiCues,bomiIdentity,bomiPositionKey,bomiNarratedView,bomiReasons,bomiPhotoObjects,bomiFraction,type BomiView} from '../data/bomiJourney';
import {readBomiObservation,saveBomiObservation,type BomiReturn} from '../lib/bomiReturn';
import {tongmaiPath} from '../data/tongmaiJourney';
import BomiTerrain from '../scene/BomiTerrain';
import NarrationCaption from './NarrationCaption';
import './BomiExperience.css';

const beats=bomiCues.map(c=>({id:c.id,recordingId:c.id,text:c.narration,sceneIdentity:bomiIdentity}));
const photo='/assets/routes/g318-bomi/bomi-street-20080917.jpg';
export default function BomiExperience(){
 const director=useOverviewDirector({beats,storageKey:bomiPositionKey});
 const [initial]=useState(readBomiObservation);
 const [manual,setManual]=useState<BomiView|undefined>(initial.view),[lineReturn,setLineReturn]=useState<BomiReturn|undefined>(initial.lineReturn),[skipLocal,setSkipLocal]=useState(initial.skipLocal);
 const [cameraKey,setCameraKey]=useState(0),[sceneKey,setSceneKey]=useState(0),[terrainLoaded,setTerrainLoaded]=useState(false),[photoReady,setPhotoReady]=useState(false),[photoError,setPhotoError]=useState(false),[saveError,setSaveError]=useState(false);
 const [reading,setReading]=useState({kilometres:0,total:0,elevation:0});
 const word=director.timing?.textProgress??0;
 const native=bomiNarratedView(director.beatIndex,word);
 // The first words of the closing return to the actual saved approach view,
 // including a manually chosen earlier position; only then pull back.
 const closingOrigin=director.beatIndex===2&&word<bomiFraction(bomiCues[2].narration,'再回看')?lineReturn?.view:undefined;
 const view=manual??closingOrigin??native,isPhoto=view.phase==='photo',inPlace=['photo','life','culture'].includes(view.phase),isEnd=director.beatIndex===2&&director.raw>=1;
 const selected=bomiPhotoObjects[view.photoObject],lastLine=useRef<BomiReturn|undefined>(initial.lineReturn);
 const snapshot=():BomiReturn=>({beatIndex:director.beatIndex,raw:director.raw,view:{...view}});
 if(director.beatIndex===0&&!inPlace)lastLine.current=snapshot();
 useEffect(()=>{
  if(director.beatIndex!==1)return;
  if(skipLocal){const run=director.wantsPlayback;setSkipLocal(false);setManual(undefined);director.select(2);if(run)director.playPause();return;}
  if(!lineReturn&&lastLine.current)setLineReturn(lastLine.current);
 },[director.beatIndex,skipLocal,lineReturn,director.wantsPlayback,director.select,director.playPause]);
 useEffect(()=>{setSaveError(!saveBomiObservation({version:1,view:manual,lineReturn,skipLocal}));},[manual,lineReturn,skipLocal]);
 useEffect(()=>{
  let active=true;const img=new Image();img.onload=()=>{void img.decode().then(()=>{if(active)setPhotoReady(true);}).catch(()=>{if(active)setPhotoError(true);});};img.onerror=()=>{if(active)setPhotoError(true);};img.src=photo;return()=>{active=false;};
 },[sceneKey]);
 const onReady=useCallback(()=>setTerrainLoaded(true),[]),onRead=useCallback((r:typeof reading)=>setReading(r),[]);
 const onError=useCallback((s:string)=>director.onSceneError(bomiIdentity,s),[director.onSceneError]);
 useEffect(()=>{if(terrainLoaded&&photoReady)director.onSceneReady(bomiIdentity);if(photoError)onError('2008街道记录未能加载，请重试资料。');},[terrainLoaded,photoReady,photoError,director.onSceneReady,onError]);
 const onOrbit=useCallback(()=>{director.pause();setManual(current=>current??{...view});},[director.pause,view.phase,view.progress,view.overhead,view.focus,view.photoObject]);
 const change=(patch:Partial<BomiView>)=>{director.pause();setManual({...view,...patch});setCameraKey(k=>k+1);};
 const enterPlace=()=>{
  if(!inPlace)setLineReturn(snapshot());
  director.pause();setSkipLocal(false);director.select(1);setManual({...view,phase:'photo',progress:1,focus:'town',photoObject:0});setCameraKey(k=>k+1);
 };
 const backToLine=()=>{
  const origin=lineReturn??lastLine.current;if(!origin)return;
  director.pause();director.select(origin.beatIndex);director.seek(origin.raw);setManual({...origin.view});setSkipLocal(origin.beatIndex===0);setCameraKey(k=>k+1);
 };
 const play=()=>{
  const returnToEnd=Boolean(manual)&&isEnd;
  setManual(undefined);setCameraKey(k=>k+1);
  if(returnToEnd)return;
  if(skipLocal&&director.beatIndex===0&&director.raw>=1){setSkipLocal(false);director.select(2);director.playPause();return;}
  director.playPause();
 };
 const select=(i:number)=>{director.pause();setManual(undefined);setCameraKey(k=>k+1);setSkipLocal(false);if(i===0)setLineReturn(undefined);director.select(i);};
 const reason=isPhoto?selected.reason:bomiReasons[view.phase];
 return <main className="bomi-experience">
  <header className="bomi-header"><a href={`#${tongmaiPath}`}>← 回到通麦段</a><div><strong>G318 · 通麦—波密</strong><small>沿同一来路，进入河谷中的城镇生活</small></div><a href="#/routes">线路入口</a></header>
  <div className="bomi-body"><section className="bomi-stage" aria-label="通麦到波密连续线路与地方观察" data-phase={view.phase} data-progress={view.progress} data-focus={view.focus} data-overhead={view.overhead} data-manual={Boolean(manual)} data-beat={director.beatIndex} data-raw={director.raw} data-word-progress={word} data-photo-object={view.photoObject} data-timing-level={director.timing?.timingLevel??'waiting'}>
   <BomiTerrain key={sceneKey} view={view} cameraKey={cameraKey} automatic={!manual} onReady={onReady} onError={onError} onOrbit={onOrbit} onRead={onRead}/>
   <div className="bomi-scene-title"><span>{isPhoto?'2008街道实拍记录':'真实影像与地形 · 高度1×'}</span><h1>{view.phase==='travel'?'沿帕隆藏布河谷，去往波密':isPhoto?'山林背景里，一条被共同使用的街道':view.phase==='culture'?'山水与生活，也是文化表达的线索':view.phase==='whole'?'从通麦到波密，地方始终有来路':'先看河谷，再走近扎木镇'}</h1><small>{isPhoto?'整张原图 · 999×664 · 非今日全貌':'2025-12-13卫星资料 · GLO-30地表显示采样约68米'}</small></div>
   {isPhoto&&<figure className="bomi-photo"><div className="bomi-photo-frame"><img src={photo} alt="2008年波密县城街道：行人、车辆、临街建筑与后方山林，原图999乘664像素"/><svg viewBox="0 0 999 664" aria-hidden="true"><rect x={selected.box[0]*9.99} y={selected.box[1]*6.64} width={selected.box[2]*9.99} height={selected.box[3]*6.64}/><text x={selected.box[0]*9.99+4} y={selected.box[1]*6.64-6}>{selected.title}</text></svg></div><figcaption>2008-09-17 · reurinkjan · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a> · <a href="https://commons.wikimedia.org/wiki/File:Pome_Dzong_(Tramog,_Bomi).jpg" target="_blank" rel="noreferrer">原图与出处 ↗</a></figcaption></figure>}
   {!isPhoto&&<div className="bomi-map-key"><span>青 · 来源河线</span><span>白／金 · 归档道路</span><span>虚线 · 隧道平面位置</span><small>地表≠桥面／洞内高程</small></div>}
   {view.phase==='life'&&<div className="bomi-evidence"><strong>2023年 · 扎木镇文字材料</strong><span>农业、林下资源、旅游服务与运输联系</span><small>描述乡镇范围，不是所示街道的产业分布图或今日统计。</small></div>}
   {view.phase==='culture'&&<div className="bomi-evidence"><strong>波卓 · 波密县域文字线索</strong><span>以山水和生产生活表达祝愿</span><small>资料有出处；未定位到所示街道，也没有借用异地表演影像。</small></div>}
   <div className="bomi-caption"><small>{manual?'自由观察 · 原句已暂停':director.playing?'跟随有声讲述':'已暂停'}</small><p>{manual?reason:<NarrationCaption text={director.timing?.caption||beats[director.beatIndex].text.split('。')[0]+'。'} timing={director.timing}/>}</p></div>
   {!director.ready&&<div className="bomi-loading" role="status">{director.error||'正在准备原道路、河谷影像与有日期的街道记录…'}</div>}
  </section><aside className="bomi-reading"><p className="bomi-eyebrow">整线分镜 R07 · 风景进入城镇生活</p><h2>{bomiCues[director.beatIndex].title}</h2><nav aria-label="通麦到波密认识顺序">{['沿路到达','进入地方观察','回到来路'].map((title,i)=><button key={title} aria-current={director.beatIndex===i?'step':undefined} onClick={()=>select(i)}>{i+1} · {title}</button>)}</nav>
   <section className="bomi-controls" aria-label="沿原路观察"><h3>在同一条路上改变位置</h3><label>归档段约 {reading.kilometres.toFixed(1)} / {reading.total.toFixed(1)} km<input aria-label="通麦到波密沿线位置" type="range" min="0" max="1" step=".001" value={view.progress} onChange={e=>change({phase:'travel',progress:Number(e.target.value),focus:'both'})}/></label><div><button onClick={()=>change({phase:'travel',progress:0,focus:'both'})}>通麦接续点</button><button onClick={()=>change({phase:'valley',progress:1,focus:'town'})}>县城附近</button></div><div><button aria-pressed={view.overhead} onClick={()=>change({phase:isPhoto?'valley':view.phase,overhead:true})}>俯视路河</button><button aria-pressed={!view.overhead} onClick={()=>change({phase:isPhoto?'valley':view.phase,overhead:false,focus:'mountain'})}>斜看山谷</button></div><div><button onClick={()=>change({phase:'valley',progress:1,focus:'river'})}>看河流</button><button onClick={()=>change({phase:'valley',progress:1,focus:'road'})}>看来路</button></div><small>只改变位置、视角和注意对象；不模拟地形改造或实时车流。</small></section>
   <section className="bomi-controls" aria-label="进入地方与返回原线"><h3>让风景接到生活</h3><button className="bomi-primary" onClick={enterPlace}>进入县城街道记录 · 保留原线</button>{isPhoto&&<div>{bomiPhotoObjects.map((o,i)=><button key={o.title} aria-pressed={view.photoObject===i} onClick={()=>change({phase:'photo',photoObject:i as 0|1|2})}>{o.title}</button>)}</div>}{isPhoto&&<p className="bomi-question">{selected.question}</p>}{lineReturn&&<button onClick={backToLine}>返回进入前的原线原句</button>}<small>2008照片、2023乡镇材料、县域文化文字分开阅读；地图不逐栋配准照片。</small></section>
   <p className="bomi-reason" role="status">{reason}</p>{saveError&&<p role="alert">当前浏览器未能保存观察状态；本页仍可操作，请在离开前返回原线。</p>}{manual&&<button className="bomi-primary" onClick={play}>{isEnd?'返回结束画面':'恢复原条件并继续讲述'}</button>}
   <details><summary>人文资料与真实影像的边界</summary><p><a href="https://www.bomi.gov.cn/bmx/newxz/202012/ee7bcc2e5e7143c59d7f4725fa059033.shtml" target="_blank" rel="noreferrer">扎木镇基本情况 · 2023-07-04 ↗</a>：乡镇与县城建成区范围不同；不将材料人口或产业描述当作今日统计。</p><p><a href="https://www.bomi.gov.cn/bmx/xwzx/202009/4d01ce38b8c24dbe96f5b2022022091e.shtml" target="_blank" rel="noreferrer">波卓与传承人访谈 · 2020文字资料 ↗</a>：县域文化线索；起源叙述为传说，文内活动日期有歧义，本段不采用其活动年份或表演影像。</p><p>现有街景能支持对共享空间的观察，不能证明文化起源、城市增长或社会成效。保留免费原图与署名，没有去除水印或合成“历史现场”。</p><p><a href="/assets/routes/g318-bomi/manifest.json" target="_blank" rel="noreferrer">道路、地形、影像、许可与裁切记录 ↗</a></p></details>
   {isEnd&&<div className="bomi-end"><strong>本段结束 · 地方仍在来路中</strong><p>实际道路、河谷景观、街道记录与文化材料共同认识地方，各自保留依据。</p><a href={`#${tongmaiPath}`}>回到通麦段原讲述 →</a><small>六章和已完成路段保持；完整整线回看尚未在此制作。</small></div>}
  </aside></div>
  <footer className="bomi-player"><div><button className="bomi-primary" disabled={!director.ready} onClick={play}>{director.playing?'暂停讲述':manual?(isEnd?'返回结束画面':'恢复原句'):isEnd?'重看本段':director.voice?'有声播放':'静音播放'}</button><button onClick={()=>director.setVoice(!director.voice)}>{director.voice?'静音':'开启声音'}</button><span>{director.playing?(director.voice?'有声讲述中':'静音播放中'):'讲述已暂停'} · {Math.round(director.raw*100)}%</span><button onClick={()=>change({phase:'whole',focus:'both',overhead:false})}>回看本段</button></div><label>当前讲述进度<input aria-label="波密讲述进度" type="range" min="0" max="1" step=".001" value={director.raw} onChange={e=>{setManual(undefined);setCameraKey(k=>k+1);director.seek(Number(e.target.value));}}/></label>{director.error&&<p role="alert">{director.error}<button onClick={()=>{director.retryScene();setTerrainLoaded(false);setPhotoReady(false);setPhotoError(false);setSceneKey(k=>k+1);}}>重新准备资料</button></p>}<small>含修改的Copernicus Sentinel数据（2025） · Copernicus GLO-30 · © OpenStreetMap contributors。观察位置与归档路长不代表实时开放、停车或旅行耗时。</small></footer>
 </main>;
}
