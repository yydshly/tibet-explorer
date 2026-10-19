import {useCallback} from 'react';
import PilotRouteTerrain,{type PilotReading} from '../scene/PilotRouteTerrain';
import TongmaiTerrain from '../scene/TongmaiTerrain';
import BomiTerrain from '../scene/BomiTerrain';
import CorridorOverview from '../scene/CorridorOverview';
import {corridorPhoto} from '../data/corridorObservation';
import type {CorridorView,CorridorEdit} from '../data/corridorJourney';
import './TongmaiExperience.css';
import './BomiExperience.css';
type Props={view:CorridorView;edit:CorridorEdit;cameraKey:number;manual:boolean;onReady:(s:CorridorView['kind'])=>void;onError:(s:string)=>void;onHigh:(n:number)=>void};
const noop=()=>{};
export default function CorridorStage({view,edit,cameraKey,manual,onReady,onError,onHigh}:Props){
 const ready=useCallback(()=>onReady(view.kind),[onReady,view.kind]);
 const read=useCallback((r:PilotReading)=>onHigh(r.highProgress),[onHigh]);
 const photo=corridorPhoto(view),feature=photo?.features[photo.focus];
 return <div className="corridor-visual" data-kind={view.kind} data-photo={!!photo} data-photo-object={feature?.title??'none'}>
  <div className="corridor-map-surface" key={view.kind}>
   {view.kind==='overview'?<CorridorOverview view={view} edit={edit} onReady={ready} onError={onError}/>:view.kind==='pilot'?<PilotRouteTerrain view={view.value} cameraKey={cameraKey} playing={!manual} fieldReveal={0} onReady={ready} onError={onError} onInteract={noop} onReading={read} onContext={noop}/>:view.kind==='tongmai'?<TongmaiTerrain view={view.value} cameraKey={cameraKey} automatic={!manual} onReady={ready} onError={onError} onOrbit={noop} onRead={noop}/>:<BomiTerrain view={view.value} cameraKey={cameraKey} automatic={!manual} onReady={ready} onError={onError} onOrbit={noop} onRead={noop}/>}
  </div>
  {photo&&<figure className="corridor-photo"><div style={{aspectRatio:photo.aspect}}><img src={photo.src} alt={`${photo.date} · ${photo.title}`}/><svg viewBox={`0 0 1000 ${1000/photo.aspect}`} aria-hidden="true">{feature&&<g>{feature.box?<rect x={feature.box[0]*10} y={feature.box[1]*10/photo.aspect} width={feature.box[2]*10} height={feature.box[3]*10/photo.aspect}/>:<circle cx={feature.x*10} cy={feature.y*10/photo.aspect} r="24"/>}<text x={Math.min(740,feature.box?feature.box[0]*10:feature.x*10+35)} y={Math.max(55,Math.min(1000/photo.aspect-40,(feature.box?feature.box[1]*10/photo.aspect:feature.y*10/photo.aspect)-12))}>{feature.title}</text></g>}</svg></div><figcaption>{photo.date} · {photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · <a href={photo.source} target="_blank" rel="noreferrer">原图出处 ↗</a></figcaption></figure>}
 </div>;
}
