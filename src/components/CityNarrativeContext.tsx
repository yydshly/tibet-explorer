import type {CityComparisonStageId} from '../data/cityComparison';
import {cityComparisonSources} from '../data/cityComparison';
import {cityPlaceEvidenceSources} from '../data/cityPlaceEvidence';
import {regionalPlaceSources} from '../data/regionalPlaceSources';
import {cityNarrativeContextFor} from '../data/cityNarrativeContext';
import type {CityAccessCityId} from '../lib/cityAccessState';
import type {SyntheticEvent} from 'react';
import './CityNarrativeContext.css';

export interface CityNarrativeContextProps {
 stage:CityComparisonStageId;cityId:CityAccessCityId;sceneProgress:number;onPause?:()=>void;
}

/** A short location/time/relationship guide beside the current recorded
 * explanation. Opening extra reading pauses rather than substituting audio. */
export default function CityNarrativeContext({stage,cityId,sceneProgress,onPause}:CityNarrativeContextProps){
 const context=cityNarrativeContextFor(stage,cityId,sceneProgress);
 if(!context)return null;
 const sourceRecords=[...cityComparisonSources,...cityPlaceEvidenceSources,...regionalPlaceSources];
 const links=(ids:readonly string[])=>[...new Set(ids)].flatMap(id=>sourceRecords.find(source=>source.id===id)??[]);
 const pauseOnOpen=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)onPause?.();};
 return <aside className="city-narrative-context" aria-label="这段材料的地方、年代与衔接" data-relation={context.relation}>
  <p className="city-narrative-context-place"><strong>{context.place}</strong><span>{context.period}</span></p>
  <p className="city-narrative-context-orientation"><span>{context.relationLabel}</span>{context.orientation}</p>
  <details key={context.cueId} onToggle={pauseOnOpen}>
   <summary>接下来为何继续 · 资料</summary><p>{context.next}</p>
   <div className="city-narrative-context-sources">{links(context.sourceIds).map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={onPause}>{source.title}</a>)}</div>
  </details>
  {context.reading&&<details className="city-narrative-context-reading" key={`reading:${cityId}`} onToggle={pauseOnOpen}>
   <summary>{context.reading.title}<small>不在当前录音</small></summary><p>{context.reading.text}</p><p className="city-narrative-context-reading-scope">{context.reading.scope}</p>
   <div className="city-narrative-context-sources">{links(context.reading.sourceIds).map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={onPause}>{source.title}</a>)}</div>
  </details>}
 </aside>;
}
