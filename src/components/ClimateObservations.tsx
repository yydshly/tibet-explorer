import {useId, useState,type ReactNode} from 'react';
import {
  climateNormalPeriod,climateNormalProvenance,climateObservationAxes,
  climateObservationReading,climateStations,getClimateObservationMonth,
} from '../data/climateObservations';
import './ClimateObservations.css';

export interface ClimateObservationsProps {
  /** Calendar month, 1–12. It is independent of the recording position. */
  month:number;
  onMonthChange:(month:number)=>void;
  compact?:boolean;
  active?:boolean;
  onInspect?:()=>void;
  onReturnToMechanism?:()=>void;
  playback?:ReactNode;
  activeStationId?:string;
}

export default function ClimateObservations({month,onMonthChange,compact=true,active=false,onInspect,onReturnToMechanism,playback,activeStationId}:ClimateObservationsProps) {
  const id=useId();
  const [expanded,setExpanded]=useState(!compact);
  const observations=getClimateObservationMonth(month);
  return <section className={`climate-observations${active?' is-active':''}`} aria-labelledby={`${id}-title`}>
    <header><span className="climate-observations-kicker">用观测检验印象</span><h2 id={`${id}-title`}>三站真实气候对照</h2><p>{climateNormalPeriod.startYear}—{climateNormalPeriod.endYear} · 同期气候标准值</p></header>
    <div className="climate-observation-month">
      <label htmlFor={`${id}-month`}>对照同一个月</label>
      <select id={`${id}-month`} value={month} onChange={event=>onMonthChange(Number(event.target.value))}>{Array.from({length:12},(_,index)=><option key={index} value={index+1}>{index+1}月</option>)}</select>
      <button type="button" aria-pressed={month===1} onClick={()=>onMonthChange(1)}>1月</button>
      <button type="button" aria-pressed={month===7} onClick={()=>onMonthChange(7)}>7月</button>
    </div>
    <p className="climate-observation-units">{month}月平均气温 / 月降水量均值<br/><span>降水条统一标尺：0—{climateObservationAxes.precipitationMaxMm} 毫米</span></p>
    {active&&playback}
    <div className="climate-observation-stations" aria-live="polite">{observations.map(({station,temperatureC,precipitationMm})=><article key={station.wmo} data-narrated={activeStationId===station.wmo?'true':undefined} className={`climate-observation-station station-${station.cityId}`}>
      <div className="climate-observation-row"><strong>{station.name}站</strong><span className="climate-observation-temperature">{temperatureC.toFixed(1)}<small> °C</small></span><span className="climate-observation-precipitation">{precipitationMm.toFixed(1)}<small> mm</small></span></div>
      <div className="climate-observation-bar" aria-hidden="true"><i style={{width:`${precipitationMm/climateObservationAxes.precipitationMaxMm*100}%`}}/></div>
      <small className="climate-observation-station-meta">WMO {station.wmo} · 站高 {station.heightM.toLocaleString('zh-CN')} 米</small>
    </article>)}</div>
    <p className="climate-observation-insight">{climateObservationReading(month)}</p>
    {onInspect&&!active&&<button type="button" className="climate-observation-map-action" onClick={onInspect}>在整体地图对照这个月</button>}
    {active&&onReturnToMechanism&&<button type="button" className="climate-observation-map-action" onClick={onReturnToMechanism}>返回地形机制</button>}
    <p className="climate-observation-scope">站点统计用于比较季节与地方差异；狮泉河站不代表整个阿里，林芝站不代表鲁朗。地图柱与降水条编码毫米，教学云雨仍解释过程。{active?'当前查阅观测，气流机制讲解暂停。':'选择月份后，在原地图查阅观测。'}</p>
    <button type="button" className="climate-observation-more" aria-expanded={expanded} aria-controls={`${id}-details`} onClick={()=>setExpanded(value=>!value)}>{expanded?'收起全年数据与来源':'查看全年数据与来源'}</button>
    {expanded&&<div id={`${id}-details`} className="climate-observation-details">
      <p>中国气象局国家气象信息中心提交 WMO，NOAA/NCEI 归档。三站所用气温、降水每个月的有效年数均为30；气候平均描述统计期，不能预报这次旅行的天气。</p>
      <p>气温为日平均气温的月均值，降水为月累计量的多年均值。站高和坐标为提交文件中的站点元数据，不能当作城区平均海拔或全域气候。</p>
      <div className="climate-observation-table-wrap"><table><caption>1991—2020 年各月气候标准值</caption><thead><tr><th scope="col">月</th>{climateStations.map(station=><th scope="col" key={station.wmo}>{station.name}<small>°C / mm</small></th>)}</tr></thead><tbody>{Array.from({length:12},(_,index)=><tr key={index} className={month===index+1?'is-selected':''}><th scope="row"><button type="button" aria-label={`在地图对照${index+1}月三站气候`} onClick={()=>onMonthChange(index+1)}>{index+1}</button></th>{climateStations.map(station=><td key={station.wmo}>{station.monthlyMeanTemperatureC[index].toFixed(1)} / {station.monthlyPrecipitationMm[index].toFixed(1)}</td>)}</tr>)}</tbody></table></div>
      <ul className="climate-observation-source-list">{climateStations.map(station=><li key={station.wmo}><a href={station.sourceUrl} target="_blank" rel="noreferrer">{station.name}站 · 原始 CSV</a><a href={station.archivePath} download>本地原件</a><small>{station.latitude.toFixed(5)}°N，{station.longitude.toFixed(5)}°E</small></li>)}</ul>
      <a href={climateNormalProvenance.overviewUrl} target="_blank" rel="noreferrer">WMO 标准值与归档说明</a><span> · </span><a href={`${climateNormalProvenance.countryNotesPath}#page=9`} target="_blank" rel="noreferrer">中国计算方法</a><span> · </span><a href={climateNormalProvenance.formatNotesPath} target="_blank" rel="noreferrer">参数与格式</a>
      <p className="climate-observation-archive-note">归档版本 {climateNormalProvenance.archiveVersion}，读取于 {climateNormalProvenance.retrievedOn}。原件和校验值随产品保留。</p>
    </div>}
  </section>;
}
