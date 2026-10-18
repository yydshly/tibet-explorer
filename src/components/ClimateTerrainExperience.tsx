import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import TibetScene from '../scene/TibetScene';
import NarrationCaption from './NarrationCaption';
import {climateLabCue,climateLabPlaces,climateLabNarratedProgress,type ClimateLabState,type ClimateLabStage,type ClimateLabCity} from '../data/climateLab';
import {getClimateObservationMonth,climateObservationReading,climateNormalProvenance} from '../data/climateObservations';
import {climateObservationNarrationStation} from '../data/climateObservationNarration';
import {useExplorationNarration} from '../hooks/useExplorationNarration';
import type {ClimateLabReading} from '../lib/climateLabProcess';
import './ClimateTerrainExperience.css';

const stages:[ClimateLabStage,string,string][]=[['air','气流遇到地形','改变条件，看过程'],['evidence','地区气候差异','用真实数据检验'],['life','条件怎样进入生活','放大地方，再回到全域']];
const initial:ClimateLabState={stage:'air',progress:0,moisture:'higher',city:'nyingchi',month:7,zoom:false,direction:'north-south'};
export default function ClimateTerrainExperience({onReturn,onHistory}:{onReturn:()=>void;onHistory:()=>void}){
 const [state,setState]=useState(initial),[ready,setReady]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[manual,setManual]=useState(false);
 const [reading,setReading]=useState<ClimateLabReading>();
 const controls=useRef<HTMLElement|null>(null);
 useEffect(()=>{controls.current?.scrollTo({top:0});},[state.stage]);
 const onReading=useCallback((value:ClimateLabReading)=>setReading(value),[]);
 const cue=climateLabCue(state),narration=useExplorationNarration(cue,ready);
 const progress=manual||!narration.timing?state.progress:climateLabNarratedProgress(cue.narration,narration.timing.textProgress);
 const textPosition=(narration.timing?.textProgress??0)*cue.narration.length;
 const zoom=state.stage==='life'&&!manual&&narration.timing?textPosition>=cue.narration.indexOf('再沿同一张地图拉近')&&textPosition<cue.narration.indexOf('回到全域'):state.zoom;
 const display=useMemo(()=>({...state,progress,zoom}),[state,progress,zoom]);
 const station=state.stage==='evidence'&&narration.audio?climateObservationNarrationStation(state.month,narration.audio):undefined;
 const change=(patch:Partial<ClimateLabState>)=>{narration.stop();setManual(true);setState(current=>({...current,progress,...patch}));};
 const stage=(next:ClimateLabStage)=>change({stage:next,progress:0,zoom:false});
 const onReady=useCallback(()=>{setReady(true);setError('');},[]);
 const onError=useCallback((message:string)=>{setReady(false);setError(message);},[]);
 const select=(id:string)=>{
  if(id.startsWith('lab-probe:')){change({progress:Number(id.split(':')[1])});return;}
  const city=id.replace(/^(city:|atlas:)/,'');if(city in climateLabPlaces)change({stage:'life',city:city as ClimateLabCity,zoom:true,progress:0});
 };
 const feedback=state.stage==='air'?(progress<.15?'气团仍在南侧。向前拖动，观察真实地形怎样改变气团高度。':progress<.6?(state.moisture==='higher'?'地形抬升空气，冷却为凝结创造条件。比较同一位置下的多水汽与少水汽。':'地形不变、空气仍抬升；水汽减少后，示意云雨明显减少。'):state.moisture==='higher'?'越山过程中的冷却与水分损失，能参与形成地区差异；不能单独解释所有气候。':'高地不变不代表云雨不变。来流的水汽条件也是原因。'):
  state.stage==='evidence'?climateObservationReading(state.month):climateLabPlaces[state.city].reason;
 const selectedPlace=climateLabPlaces[state.city];
 const observedFeedback=state.stage==='air'&&reading?`${reading.phase}。${state.moisture==='lower'?'同一地形减少水汽后，示意云雨较少。':'保持位置，切换较少水汽进行对照。'}`:feedback;
 const caption=manual||!narration.timing?observedFeedback:narration.timing.caption;
 return <main className="climate-lab" data-lab-stage={state.stage} data-lab-progress={progress.toFixed(3)} data-lab-moisture={state.moisture}>
  <header><button onClick={()=>{narration.stop();onReturn();}}>← 返回整场演示</button><strong>从空气到生活</strong><span>看见原因 · 亲手对照</span></header>
  <nav className="lab-stages" aria-label="交互认识顺序">{stages.map(([id,title,note],i)=><button key={id} aria-current={state.stage===id?'step':undefined} onClick={()=>stage(id)}><b>0{i+1}</b><span>{title}<small>{note}</small></span></button>)}</nav>
  <div className="lab-layout">
   <section className="lab-map" aria-label="同一真实地形上的交互演示">
    <TibetScene key={revision} scene="region" viewKey="atlas" layer="atlas-overview" step={0} season={1} progress={progress} selected={state.stage==='life'?`city:${state.city}`:''} cutaway={false} playing={narration.playing} resetKey={revision} overviewPresentation overviewTopic="regions" climateLab={display} onClimateLabReading={onReading} climateObservationMonth={state.stage==='evidence'?state.month:undefined} climateObservationStationId={station} onReady={onReady} onError={onError} onInteract={narration.pause} onSelect={select}/>
    <div className="lab-map-heading"><strong>{zoom&&state.stage==='life'?`${selectedPlace.name}及周边 · 区域放大`:'西藏与周边 · 保留整体关系'}</strong><span>{state.stage==='air'?'青色：气团与云雨示意　金色：真实高程剖线':state.stage==='evidence'?'气象站常年值 · 1991—2020 · 统一统计柱比例':'金色：真实高程采样　青色：较低较缓样本'}</span>{state.stage==='air'&&reading&&<small>地面高程样本 ≈{Math.round(reading.ground/10)*10}米 · 气团大小为显示符号</small>}</div>
    {zoom&&state.stage==='life'&&<div className="lab-locator"><span>全域定位 · 金点为当前地区</span><div className="lab-minimap-space" aria-label="同一地图的全域定位窗"/><button onClick={()=>change({zoom:false})}>拉回整体地图</button><small>同一高程网格 · 约5—6公里采样<br/>用于区域认识，不用于街区判读</small></div>}
    {(!ready||error)&&<div className="lab-loading" role="status">{error||'正在准备真实高程…'}{error&&<button onClick={()=>{setError('');setRevision(v=>v+1);}}>重试场景</button>}</div>}
    <div className="lab-caption" aria-live="polite"><span>{manual?'你的操作结果':narration.playing?'讲解与场景同步':'先动手观察，也可以播放讲解'}</span><p>{manual?<>{caption}</>:<NarrationCaption text={caption} timing={narration.timing}/>}</p></div>
   </section>
   <aside ref={controls} className="lab-controls">
    <p className="lab-eyebrow">{stages.find(s=>s[0]===state.stage)![2]}</p>
    <h1>{state.stage==='air'?'同一座山，水汽改变会怎样？':state.stage==='evidence'?'真实气候是否总是向西变干？':selectedPlace.question}</h1>
    {state.stage==='air'&&<><p>沿真实高程剖面移动气团，再保持位置比较两种水汽条件。</p><div className="lab-choice" role="group" aria-label="气团初始水汽">{(['higher','lower'] as const).map(value=><button key={value} aria-pressed={state.moisture===value} onClick={()=>change({moisture:value,progress})}>{value==='higher'?'较多水汽':'较少水汽'}</button>)}</div></>}
    {state.stage==='evidence'&&<><p>先看共同尺度，再切换冬夏。柱高表示月降水量均值，和地形高度是两个不同量。</p><div className="lab-choice" aria-label="气候月份">{[1,7].map(month=><button key={month} aria-pressed={state.month===month} onClick={()=>change({month})}>{month}月 · {month===1?'冬季':'夏季'}</button>)}</div><table><caption>气象站标准值 · 不代表市域平均</caption><thead><tr><th>站点</th><th>气温 °C</th><th>降水 mm</th></tr></thead><tbody>{getClimateObservationMonth(state.month).map(row=><tr key={row.station.wmo} data-active={station===row.station.wmo}><th>{row.station.name}</th><td>{row.temperatureC.toFixed(1)}</td><td>{row.precipitationMm.toFixed(1)}</td></tr>)}</tbody></table></>}
    {state.stage==='life'&&<><p>点选地方后沿原地图拉近。移动探针，比较地形高差，再判断哪些生活问题需要人的建设与维护。</p><div className="lab-choice" aria-label="放大地区">{Object.entries(climateLabPlaces).map(([id,place])=><button key={id} aria-pressed={state.city===id&&zoom} onClick={()=>change({city:id as ClimateLabCity,zoom:true,progress:0})}>{place.name}</button>)}</div><div className="lab-choice" aria-label="地形剖面方向"><button aria-pressed={state.direction==='north-south'} onClick={()=>change({direction:'north-south'})}>南北剖面</button><button aria-pressed={state.direction==='east-west'} onClick={()=>change({direction:'east-west'})}>东西剖面</button></div><button className="lab-whole" onClick={()=>change({zoom:!zoom})}>{zoom?'回到全域比较':'放大当前地区'}</button></>}
    {state.stage!=='evidence'&&<label className="lab-scrub">{state.stage==='air'?'拖动气团越过地形':'移动真实高程探针'}<input aria-label={state.stage==='air'?'气团位置':'高程探针位置'} type="range" min={0} max={1} step={.005} value={progress} onChange={event=>change({progress:Number(event.target.value)})}/><span>{Math.round(progress*100)}% · 可点击地图剖线上的采样点</span></label>}
    <p className="lab-readout">{state.stage!=='evidence'&&reading?`当前高程样本 ≈${Math.round(reading.ground/10)*10}米 · 沿剖线读取，不是测站高度`:''}</p><div className="lab-audio"><button disabled={!ready} onClick={()=>{if(manual){setState(s=>({...s,progress:0}));setManual(false);}narration.play();}}>{narration.loading?'准备讲解…':narration.playing?'暂停讲解':'播放当前条件讲解'}</button><button aria-label={narration.voice?'关闭声音':'开启声音'} aria-pressed={narration.voice} onClick={()=>narration.setVoice(!narration.voice)}>{narration.voice?'声音开':'声音关'}</button></div>{narration.audio?.error&&<p role="alert">{narration.audio.error}</p>}
    <div className="lab-evidence"><strong>{state.stage==='evidence'?'真实观测统计':'真实地形 + 明示的原理/观察示意'}</strong><p>{state.stage==='air'?'Mapzen 高程，垂直显示放大16倍。南北选线用于教学，不是实测风轨迹；气团、凝结阈值和雨滴为定性示意，无预测雨量。':state.stage==='evidence'?'NOAA NCEI归档的WMO三站标准值。统计不直接证明地形因果；不是今天的天气。':'青色样本：窗口内较低40%，且相邻约0.1度采样高差≤250米。此筛选不是城市范围、耕地或建设适宜性评价。'}</p><details onToggle={e=>{if(e.currentTarget.open)narration.pause();}}><summary>查看资料与边界</summary><a href="/assets/terrain/tibet-regional-dem.source.json" target="_blank" rel="noreferrer">高程数据来源与采样信息</a><a href="https://forecast.weather.gov/glossary.php?word=OROGRAPHIC" target="_blank" rel="noreferrer">美国国家气象局：地形抬升原理</a><a href={climateNormalProvenance.overviewUrl} target="_blank" rel="noreferrer">WMO气候标准值归档</a><a href="https://www.al.gov.cn/info/1035/48267.htm" target="_blank" rel="noreferrer">2023年狮泉河林地灌溉与管护报道</a><a href="https://www.lasa.gov.cn/lasa/wjzl/202204/0195f5cb1a964d6c9121791d618ed7e2.shtml" target="_blank" rel="noreferrer">2022年拉萨水利规划</a></details></div>
    <button className="lab-next" onClick={()=>{if(state.stage==='air')stage('evidence');else if(state.stage==='evidence')stage('life');else{narration.stop();onHistory();}}}>{state.stage==='air'?'用真实数据检验地区差异 →':state.stage==='evidence'?'这些条件怎样进入生活 →':'带着人的行动，继续历史主线 →'}</button>
   </aside>
  </div>
 </main>;
}




