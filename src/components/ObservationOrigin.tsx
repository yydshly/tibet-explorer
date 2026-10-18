import type {ObservationOrigin as Origin} from '../lib/overviewObservation';
import type {MouseEvent} from 'react';
import {observationReturnHash} from '../lib/overviewObservation';
export default function ObservationOrigin({origin,stopId,onReturn}:{origin:Origin|undefined;stopId:string;onReturn?:(event:MouseEvent<HTMLAnchorElement>)=>void}){
 if(!origin)return null;
 return <section className="observation-origin" aria-label="从主线带来的问题和资料"><p><strong>来自主线 · {origin.title}</strong></p><p>{origin.question}</p><details><summary>本次带来的资料 · {origin.sources.length}项</summary>{origin.sources.map((s,i)=><p key={`${s.url}:${i}`}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{s.note&&<small>{s.note}</small>}</p>)}</details><a className="drawer-button" href={`#${observationReturnHash(stopId)}`} onClick={onReturn}>回到原讲述 · {Math.round(origin.raw*100)}%</a></section>;
}
