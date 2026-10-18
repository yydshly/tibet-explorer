import {cityLocalityForStop,cityLocalObservationPoints,type CityLocalObservationPoint} from '../lib/cityLocalGeography';
import {useCityLocalData} from '../hooks/useCityLocalData';
import './CityLocalContext.css';

export default function CityLocalObservationChoices({stopId,selected,onSelect}:{stopId:string;selected?:CityLocalObservationPoint;onSelect:(point:CityLocalObservationPoint|undefined)=>void}){
 const locality=cityLocalityForStop[stopId],{data,loading,error}=useCityLocalData(locality,true),points=data?cityLocalObservationPoints(data,stopId):[];
 if(!locality)return null;
 return <div className="city-local-observation-choices"><p>对应图上的实际要素</p>{loading?<small>正在读取当地河流、道路与地物记录…</small>:error?<small>{error}；仍可保存文字观察问题。</small>:<div>{points.map(point=><button key={point.featureId} type="button" title={`OSM ${point.featureId}`} aria-pressed={selected?.featureId===point.featureId} onClick={()=>onSelect(point)}><strong>{point.name}</strong><small>{point.featureClass==='road'?'道路':point.featureClass==='waterway'||point.featureClass==='water'?'水系':point.featureClass==='building'?'建筑轮廓':point.featureClass==='landuse'?'用地记录':'地理要素'} · 地图参照</small></button>)}</div>}{selected&&<button className="city-local-clear-selection" type="button" onClick={()=>onSelect(undefined)}>取消这次地图参照</button>}<small>选择只在图上定位；明确保存问题后才追加参照。读点不是访问入口，当前经营与开放另核实。</small></div>;
}
