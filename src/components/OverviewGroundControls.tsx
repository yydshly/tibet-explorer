import type {GroundJourneyState,GroundReading} from '../lib/groundJourney';
export default function OverviewGroundControls({state,reading,manual,onChange,onResume,sharedGuide}:{sharedGuide?:boolean;state:GroundJourneyState;reading?:GroundReading;manual:boolean;onChange:(patch:Partial<GroundJourneyState>)=>void;onResume:()=>void}){
 const shownProgress=state.railPhase&&reading?reading.distanceMetres/reading.totalMetres:state.progress;
 const move=(delta:number)=>onChange({progress:Math.max(0,Math.min(1,shownProgress+delta/(reading?.totalMetres??7820))),lookAt:undefined});
 const stage=state.stage&&({whole:'带着环境与生活问题出发',valley:'全图 → 拉萨河谷',river:'铁路怎样跨过河流',tunnel:'山体遮挡与地下通行',station:'抵达站区，还需要接续',city:'跨河道路怎样联系城市',return:'回到全图，理解共同维护'}[state.stage]);
 return <section className="overview-ground-controls" aria-label="沿真实铁路观察地形">
  <strong>沿铁路走进真实拉萨河谷</strong>
  <p>{manual?'自由观察 · 原讲解位置已保留':stage??'青藏线站前片段 · 跟随主线'}<br/>可直接点选图中线路；前后移动观察同一河谷。</p>
  <div className="ground-source-stops" role="group" aria-label="真实线路观察节点">{reading?.stops?.map(stop=><button key={stop.id} aria-pressed={Math.abs(shownProgress-stop.progress)<.015&&state.lookAt!=='river'} onClick={()=>onChange({progress:stop.progress,height:stop.id==='station'?1600:1100,bearing:0,lookAt:stop.id==='entry'?undefined:stop.id as 'station'|'crossing'|'tunnel'})}>{stop.title}</button>)}</div>
  <div role="group" aria-label="沿线观察任务">
   <button aria-label="沿线路后退500米" onClick={()=>move(-500)}>← 后退500米</button>
   <button aria-label="沿线路前进500米" onClick={()=>move(500)}>前进500米 →</button>
   <button aria-pressed={state.lookAt==='river'} onClick={()=>onChange({progress:1,height:1800,bearing:0,lookAt:'river'})}>看跨河接城</button>
  </div>
  <label>沿线移动 {Math.round(shownProgress*100)}%<input aria-label="铁路沿线观察位置" type="range" min="0" max="1" step=".002" value={shownProgress} onChange={e=>onChange({progress:Number(e.target.value),lookAt:undefined})}/></label>
  <div role="group" aria-label="地形观察高度">{[[700,'沿线看山'],[1600,'看线路与城市'],[2800,'俯看河谷']] .map(([height,title])=><button key={height} aria-pressed={state.height===height} onClick={()=>onChange({height:Number(height)})}>{title}</button>)}</div>
  <label>转头观察 {Math.round(state.bearing)}°<input aria-label="沿线观察朝向" type="range" min="-150" max="150" step="5" value={state.bearing} onChange={e=>onChange({bearing:Number(e.target.value),lookAt:undefined})}/></label>
  <output>{reading?`已观察约 ${(reading.distanceMetres/1000).toFixed(2)} / ${(reading.totalMetres/1000).toFixed(2)} 公里 · ${reading.tunnel?'隧道水平投影':reading.bridge?'桥梁水平走向':'地表线路位置'}`:'正在准备真实线路…'}</output>
  {reading?.surfaceMetres!==undefined&&<small>地表海拔约{Math.round(reading.surfaceMetres)}米 · {reading.longitude.toFixed(3)}°E / {reading.latitude.toFixed(3)}°N（不是轨面高程）</small>}
  <small>2025‑11‑26 真彩影像 · 10米源像元 · 高程约30米 / 高度1×。默认使用河谷和街区尺度；继续放大不会产生街景细节。</small>
  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a>
  <a href="/assets/terrain/lhasa-ground/manifest.json" target="_blank" rel="noreferrer">影像与高程：Copernicus · 日期、范围和完整署名</a>
  {manual&&!sharedGuide&&<button onClick={onResume}>返回讲述位置，继续主线 →</button>}
 </section>;
}
