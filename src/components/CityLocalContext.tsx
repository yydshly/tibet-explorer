import type {CityComparisonStageId} from '../data/cityComparison';
import {resolveCityLocalGeography} from '../lib/cityLocalGeography';
import {useCityLocalData} from '../hooks/useCityLocalData';
import './CityLocalContext.css';
import type {SyntheticEvent} from 'react';

export default function CityLocalContext({stage,progress,onPause}:{stage:CityComparisonStageId;progress:number;onPause?:()=>void}){
 const place=resolveCityLocalGeography(stage,progress),{metadata}=useCityLocalData(place?.localityId);
 if(!place)return null;
 const pauseOnReading=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)onPause?.();};
 return <div className="city-local-context" aria-label="当前地方与资料范围"><p><strong>{place.placeName}</strong><span>{place.contextScale==='corridor'?'地区道路接续':place.localityId?'局部现状资料':'地区定位与材料'}</span></p><small>事件／材料：{place.eventTime}{metadata?` · OSM获取 ${metadata.acquiredAt.slice(0,10)}`:''}</small>{place.contextScale==='corridor'?<small className="city-local-window">源道路跨出城镇资料窗；全程接续与镇内地物分别读。</small>:metadata&&<small className="city-local-window" aria-label="现状地物资料窗口">东经 {metadata.bbox[0].toFixed(3)}°—{metadata.bbox[2].toFixed(3)}°<br/>北纬 {metadata.bbox[1].toFixed(3)}°—{metadata.bbox[3].toFixed(3)}°<br/>资料窗非完整市域；金框只提示地方位置。</small>}<details onToggle={pauseOnReading}><summary>这个地方，地图与事件怎样对应</summary><p>{place.scope}</p><p>城镇窗口内使用局部高程；外部地形背景采用约5–6公里的区域采样网格，不能据此读取道路坡度或设施海拔。</p>{metadata&&place.contextScale!=='corridor'&&<p>现状提取不代表事件发生时的地图；建筑轮廓不保证当前用途与开放。定位框为可读的放大符号，不表示相机当前视野或城市边界。</p>}</details>{(metadata||place.sourceIds.includes('city-local-osm-2026'))&&<a className="city-local-attribution" href={metadata?.copyrightUrl??'https://www.openstreetmap.org/copyright'} target="_blank" rel="noreferrer" onClick={onPause}>© OpenStreetMap contributors · ODbL</a>}</div>;
}
