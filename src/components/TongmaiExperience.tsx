import {useCallback,useEffect,useState} from 'react';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import {tongmaiCues,tongmaiIdentity,tongmaiNarratedView,tongmaiPositionKey,tongmaiReasons,tongmaiWordFraction,type TongmaiView} from '../data/tongmaiJourney';
import {routePilotPath} from '../data/routePilot';
import TongmaiTerrain from '../scene/TongmaiTerrain';
import NarrationCaption from './NarrationCaption';
import './TongmaiExperience.css';

const beats=tongmaiCues.map(c=>({id:c.id,recordingId:c.id,text:c.narration,sceneIdentity:tongmaiIdentity}));
const controlsKey='tibet-explorer.tongmai-controls.v1';
const photoObjects=[
 {title:'旧桥桥面',reason:'2014记录中可见单车道桥面；不据此估计现在通行能力。',box:[40,48,59,25]},
 {title:'河流与两岸',reason:'河流位于桥下，两岸由桥面联系；照片只证明当时的画面。',box:[24,58,40,16]},
 {title:'可见施工背景',reason:'背景可见施工设施；不能单凭照片确定完整施工进度或人物身份。',box:[40,26,31,26]},
] as const;
function readView():TongmaiView|undefined{
 try{const s=JSON.parse(localStorage.getItem(controlsKey)||'null');if(s?.version===1&&Object.hasOwn(tongmaiReasons,s.view?.phase)&&Number.isFinite(s.view.progress)&&s.view.progress>=0&&s.view.progress<=1&&['both','river','bridge','tunnel'].includes(s.view.focus)&&typeof s.view.overhead==='boolean')return s.view;}catch{/* Controls are optional. */}
}
export default function TongmaiExperience(){
 const director=useOverviewDirector({beats,storageKey:tongmaiPositionKey});
 const [manual,setManual]=useState<TongmaiView|undefined>(readView),[cameraKey,setCameraKey]=useState(0),[sceneKey,setSceneKey]=useState(0),[photoReady,setPhotoReady]=useState(false),[photoError,setPhotoError]=useState(false),[photoObject,setPhotoObject]=useState<number>();
 const [reading,setReading]=useState({kilometres:0,total:0,elevation:0});
 const native=tongmaiNarratedView(director.beatIndex,director.timing?.textProgress??0),view=manual??native;
 const isPhoto=view.phase==='archive',isEnd=director.beatIndex===1&&director.raw>=1;
 const text=tongmaiCues[1].narration,tp=director.timing?.textProgress??0;
 const spokenObject=tp<tongmaiWordFraction(text,'河流和可见施工背景')?0:tp<tongmaiWordFraction(text,'可见施工背景')?1:2;
 const selected=photoObjects[photoObject??(manual?0:spokenObject)];
 const eventYear=manual?(isPhoto?2014:view.phase==='bridge'?2015:view.phase==='tunnel'?2016:0):director.beatIndex===1?(tp>=tongmaiWordFraction(text,'二零一六')?2016:tp>=tongmaiWordFraction(text,'二零一五')?2015:isPhoto?2014:0):0;
 const ready=useCallback(()=>director.onSceneReady(tongmaiIdentity),[director.onSceneReady]);
 const error=useCallback((message:string)=>director.onSceneError(tongmaiIdentity,message),[director.onSceneError]);
 const onRead=useCallback((r:typeof reading)=>setReading(r),[]);
 const orbit=useCallback(()=>{director.pause();setManual(current=>current??native);},[director.pause,native.phase,native.progress,native.overhead,native.focus]);
 useEffect(()=>{try{if(manual)localStorage.setItem(controlsKey,JSON.stringify({version:1,view:manual}));else localStorage.removeItem(controlsKey);}catch{/* Return to narration still works. */}},[manual]);
 // The historical photograph prepares with the terrain. It cannot be replaced
 // by unlicensed footage if decoding fails, and narration must not run past it.
 useEffect(()=>{const img=new Image();let active=true;img.onload=()=>{void img.decode().then(()=>{if(active)setPhotoReady(true);}).catch(()=>{if(active)setPhotoError(true);});};img.onerror=()=>{if(active)setPhotoError(true);};img.src='/assets/routes/g318-tongmai/tongmai-20140921.jpg';return()=>{active=false;};},[sceneKey]);
 const terrainReady=useCallback(()=>{if(photoReady)ready();},[photoReady,ready]);
 const [terrainLoaded,setTerrainLoaded]=useState(false);
 const loaded=useCallback(()=>{setTerrainLoaded(true);terrainReady();},[terrainReady]);
 useEffect(()=>{if(terrainLoaded&&photoReady)ready();if(photoError)error('旧桥记录未能加载，请重试资料。');},[terrainLoaded,photoReady,photoError,ready,error]);
 const change=(patch:Partial<TongmaiView>)=>{director.pause();setManual({...view,...patch});setCameraKey(k=>k+1);};
 const play=()=>{const returnToEnd=Boolean(manual)&&isEnd;setManual(undefined);setPhotoObject(undefined);setCameraKey(k=>k+1);if(!returnToEnd)director.playPause();};
 const select=(index:number)=>{setManual(undefined);setPhotoObject(undefined);setCameraKey(k=>k+1);director.select(index);};
 const reason=manual?(isPhoto?selected.reason:tongmaiReasons[view.phase]):tongmaiReasons[view.phase];
 const sceneState={'data-phase':view.phase,'data-focus':view.focus,'data-progress':view.progress,'data-manual':Boolean(manual),'data-raw':director.raw,'data-word-progress':director.timing?.textProgress??0,'data-timing-level':director.timing?.timingLevel??'waiting'};
 return <main className="tongmai-experience">
  <header className="tongmai-header"><a href={`#${routePilotPath}`}>← 返回鲁朗原线</a><div><strong>G318 · 鲁朗—通麦</strong><small>沿原路进峡谷，再看人怎样跨河穿山</small></div><a href="#/routes">线路入口</a></header>
  <div className="tongmai-body">
   <section className="tongmai-stage" {...sceneState} aria-label="连续道路与跨河观察">
    <TongmaiTerrain key={sceneKey} view={view} cameraKey={cameraKey} automatic={!manual} onReady={loaded} onError={error} onOrbit={orbit} onRead={onRead}/>
    <div className="tongmai-scene-title"><span>真实地形 · 高度1×</span><h1>{isPhoto?'从2014年旧桥记录，看见当时的连接':view.phase==='travel'?'离开鲁朗，路沿山谷继续':view.phase==='tunnel'?'桥跨河，隧道穿山':'山谷仍在，道路怎样接过去？'}</h1><small>{isPhoto?'历史实拍与现状地图分开阅读':'2025-12-13卫星资料 · GLO-30地表高程'}</small></div>
    {isPhoto&&<figure className="tongmai-photo"><div className="tongmai-photo-frame"><img src="/assets/routes/g318-tongmai/tongmai-20140921.jpg" alt="2014年通麦旧桥、河流、两岸及可见施工背景；不是新桥现状"/><svg viewBox="0 0 100 56.25" aria-hidden="true"><rect x={selected.box[0]} y={selected.box[1]*.5625} width={selected.box[2]} height={selected.box[3]*.5625}/><text x={selected.box[0]+.5} y={selected.box[1]*.5625-1}>{selected.title}</text></svg></div><figcaption>2014-09-21 · Zhangmoon618 · CC BY-SA 4.0 · <a href="https://commons.wikimedia.org/wiki/File:20140921_Tongmai_Bridge.jpg" target="_blank" rel="noreferrer">原图与许可 ↗</a></figcaption></figure>}
    <div className="tongmai-map-key"><span>青 · 河流</span><span>金／白 · 道路平面位置</span><span>虚线 · 隧道平面投影</span><small>不表示桥面或洞内高程</small></div>
    <div className="tongmai-caption"><small>{manual?'自由观察 · 原句已暂停':director.playing?'跟随有声讲述':'已暂停 · 可开始讲述'}</small><p>{manual?reason:<NarrationCaption text={director.timing?.caption||beats[director.beatIndex].text.split('。')[0]+'。'} timing={director.timing}/>}</p></div>
    {!director.ready&&<div className="tongmai-loading" role="status">{director.error||'正在准备真实地形、影像与旧桥记录…'}</div>}
   </section>
   <aside className="tongmai-reading">
    <p className="tongmai-eyebrow">整线中的接续段 · R05—R06</p><h2>{tongmaiCues[director.beatIndex].title}</h2>
    <nav aria-label="通麦认识顺序">{tongmaiCues.map((c,i)=><button key={c.id} aria-current={i===director.beatIndex?'step':undefined} onClick={()=>select(i)}>{i+1} · {i===0?'沿路进入峡谷':'跨河、穿山与真实事件'}</button>)}</nav>
    <section className="tongmai-controls" aria-label="位置与地形操作"><h3>同一条路，换位置与看向</h3><label>沿线位置 · {reading.kilometres.toFixed(1)} / {reading.total.toFixed(1)} km<input aria-label="鲁朗到通麦沿线位置" type="range" min="0" max="1" step=".001" value={view.progress} onChange={e=>change({phase:'travel',progress:Number(e.target.value),focus:'both'})}/></label><div><button onClick={()=>change({phase:'travel',progress:0,focus:'both'})}>鲁朗接续点</button><button onClick={()=>change({phase:'rivers',progress:.98,focus:'river'})}>看两河汇合</button></div><div><button aria-pressed={view.overhead} onClick={()=>change({overhead:true})}>俯视定位</button><button aria-pressed={!view.overhead} onClick={()=>change({overhead:false})}>斜看山谷</button></div></section>
    <section className="tongmai-controls" aria-label="工程与历史记录观察"><h3>从河谷条件，看连接方式</h3><div><button aria-pressed={view.focus==='bridge'&&!isPhoto} onClick={()=>change({phase:'bridge',focus:'bridge',progress:.98,overhead:false})}>看桥跨河</button><button aria-pressed={view.focus==='tunnel'} onClick={()=>change({phase:'tunnel',focus:'tunnel',progress:.94,overhead:true})}>看隧道位置</button></div><button onClick={()=>change({phase:'archive',focus:'bridge',progress:.98})}>观察2014旧桥记录</button>{isPhoto&&<div>{photoObjects.map((o,i)=><button key={o.title} aria-pressed={selected===o} onClick={()=>{change({phase:'archive'});setPhotoObject(i);}}>{o.title}</button>)}</div>}
     <ol className="tongmai-events"><li data-active={eventYear===2014}><strong>2014</strong><span>旧桥实拍记录</span></li><li data-active={eventYear===2015}><strong>2015年12月</strong><span>新桥通车</span></li><li data-active={eventYear===2016}><strong>2016年4月13日</strong><span>整段改建通车</span></li></ol><small>照片、事件日期与2026归档几何不是同一个时间。</small>
    </section>
    <p className="tongmai-reason" role="status">{reason}</p>{manual&&<button className="tongmai-primary" onClick={play}>{isEnd?'返回结束画面':'继续原句 · 恢复讲述画面'}</button>}
    <details><summary>资料、许可与范围</summary><p>原始主路接续节点7365874802，969个源节点／968条原始相邻边。这里不从鲁朗支路末端补画直线。</p><p>卫星原像元裁切来自2025-12-13，不是实时天气。地形显示采样约66米，原始GLO-30含树冠与建筑，不能当作道路纵断面。</p><p>通麦桥与飞石崖隧道使用归档平面几何；没有实测桥面或洞内高程，不做桥体细部和隧道内驾驶。</p><p><a href="/assets/routes/g318-tongmai/manifest.json" target="_blank" rel="noreferrer">数据、原图与许可台账 ↗</a></p><p><a href="https://www.xizang.gov.cn/xwzx_406/bmkx/202408/t20240806_428707.html" target="_blank" rel="noreferrer">通车节点的资料依据 ↗</a></p></details>
    {isEnd&&<div className="tongmai-end"><strong>这一段看到的变化</strong><p>跨河与穿山改变连接方式，地形约束仍在。</p><a href={`#${routePilotPath}`}>返回进入前的鲁朗原线 →</a><small>保留旧首段原位置与原句；波密段尚未制作。</small></div>}
   </aside>
  </div>
  <footer className="tongmai-player"><div><button className="tongmai-primary" disabled={!director.ready} onClick={play}>{director.playing?'暂停讲述':manual?(isEnd?'返回结束画面':'继续原句'):isEnd?'重看这一段':'有声播放'}</button><button onClick={()=>director.setVoice(!director.voice)}>{director.voice?'静音':'开启声音'}</button><span>{director.playing?(director.voice?'有声讲述中':'静音播放中'):'讲述已暂停'} · {Math.round(director.raw*100)}%</span><button onClick={()=>change({phase:'whole',focus:'both',overhead:false})}>回看本段</button></div><label>当前讲述进度<input aria-label="通麦讲述进度" type="range" min="0" max="1" step=".001" value={director.raw} onChange={e=>{setManual(undefined);setPhotoObject(undefined);setCameraKey(k=>k+1);director.seek(Number(e.target.value));}}/></label>{director.error&&<p role="alert">{director.error}<button onClick={()=>{director.retryScene();setTerrainLoaded(false);setPhotoReady(false);setPhotoError(false);setSceneKey(k=>k+1);}}>重新准备资料</button></p>}<small>含修改的Copernicus Sentinel数据（2025） · Copernicus GLO-30 · © OpenStreetMap contributors。虚拟观察不代表当前开放、停靠或安全条件。</small></footer>
 </main>;
}
