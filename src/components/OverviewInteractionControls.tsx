import {climateLabPlaces,type ClimateLabState} from '../data/climateLab';
import {getClimateObservationMonth} from '../data/climateObservations';
import {placeSources} from '../data/placeProfiles';
import {climateAirAppearance,type ClimateLabReading} from '../lib/climateLabProcess';
import './OverviewInteractionControls.css';

interface Props {
 sharedGuide?:boolean;state:ClimateLabState;reading?:ClimateLabReading;manual:boolean;station?:string;resumeTitle:string;
 onChange:(patch:Partial<ClimateLabState>)=>void;onCity:(id:string)=>void;onResume:()=>void;
}
export default function OverviewInteractionControls({state,reading,manual,station,resumeTitle,onChange,onCity,onResume,sharedGuide}:Props){
 const comparisonSource=manual&&state.stage==='life'?placeSources.find(s=>s.id===(state.city==='lhasa'?'lhasa-water-plan':state.city==='ngari'?'ngari-valley':'')):undefined;
 return <section className="overview-interaction" aria-label="本段地图操作" data-interaction-stage={state.stage}>
  <strong>{state.stage==='air'?'动手验证：同一地形，不同水汽':state.stage==='evidence'?'动手对照：三站的冬夏差异':`动手观察：${climateLabPlaces[state.city].name}与周边`}</strong>
  {!sharedGuide&&<p>{state.stage==='air'?'先拖动气团，停在一处，再减少水汽。看抬升高度不变时云雨怎样改变。':state.stage==='evidence'?'切换月份，三站始终使用同一柱高比例。真实气候并非每个月都从东向西递减。':'切换剖面方向、移动探针，比较地面连续性。放大时保留全域定位窗。'}</p>}
  {state.stage==='air'&&<div role="group" aria-label="气团水汽条件">{(['higher','lower'] as const).map(value=><button key={value} aria-pressed={state.moisture===value} onClick={()=>onChange({moisture:value})}>{value==='higher'?'较多水汽':'较少水汽'}</button>)}</div>}
  {state.stage==='air'&&reading?.comparison&&<table aria-label="同一位置的水汽对照"><caption>同一地形、同一位置 · 原理示意结果</caption><tbody>{(['higher','lower'] as const).map(mode=><tr key={mode} data-active={state.moisture===mode}><th>{mode==='higher'?'较多水汽':'较少水汽'}{state.moisture===mode?'（画面中）':''}</th><td>{climateAirAppearance(reading.comparison![mode])}</td></tr>)}</tbody></table>}
  {state.stage==='evidence'&&<><div role="group" aria-label="对照月份">{[7,1].map(month=><button key={month} aria-pressed={state.month===month} onClick={()=>onChange({month})}>{month}月 · {month===7?'夏季':'冬季'}</button>)}</div><table><caption>1991—2020 · 站点常年值</caption><thead><tr><th>站点</th><th>气温 °C</th><th>降水 mm</th></tr></thead><tbody>{getClimateObservationMonth(state.month).map(row=><tr key={row.station.wmo} data-active={station===row.station.wmo}><th>{row.station.name}</th><td>{row.temperatureC.toFixed(1)}</td><td>{row.precipitationMm.toFixed(1)}</td></tr>)}</tbody></table></>}
  {state.stage==='life'&&<><div role="group" aria-label="同图比较地区">{Object.entries(climateLabPlaces).map(([id,place])=><button key={id} aria-pressed={state.city===id} onClick={()=>onCity(id)}>{id==='ngari'?'阿里·狮泉河':place.name}</button>)}</div><div role="group" aria-label="地形剖面方向"><button aria-pressed={state.direction==='north-south'} onClick={()=>onChange({direction:'north-south'})}>南北剖面</button><button aria-pressed={state.direction==='east-west'} onClick={()=>onChange({direction:'east-west'})}>东西剖面</button><button onClick={()=>onChange({zoom:!state.zoom})}>{state.zoom?'回到整体':'放大地区'}</button></div></>}
  {state.stage!=='evidence'&&<label>{state.stage==='air'?'拖动气团越山':'移动高程探针'}<input aria-label={state.stage==='air'?'气团位置':'高程探针位置'} type="range" min={0} max={1} step={.005} value={state.progress} onChange={e=>onChange({progress:Number(e.target.value)})}/><small>{reading?`当前地面样本 ≈${Math.round(reading.ground/10)*10}米`:'正在读取高程'} · 金线不是道路</small></label>}
  <p className="interaction-boundary">{state.stage==='air'?'真实高程＋原理示意；云雨不是预报。':state.stage==='evidence'?'实测统计只代表站点；不能单独证明地形因果。':'青色：观察窗内相对较低、较缓的样本；不是街区、耕地或适建范围。高程约5—6公里采样。'}</p>
  {comparisonSource&&<small>当前对照依据：<a href={comparisonSource.url} target="_blank" rel="noreferrer">{comparisonSource.title}</a></small>}
  {!sharedGuide&&(manual?<><small>主线停在「{resumeTitle}」，对照不会跳过后续讲述。</small><button className="interaction-resume" onClick={onResume}>恢复原条件，从暂停处继续</button></>:<small>操作会暂停语音；下方播放键继续整条主线。</small>)}
 </section>;
}
