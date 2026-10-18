import {ArrowRight,BookOpenText} from '@phosphor-icons/react';
import {regions} from '../data/curriculum';
import {placeProfiles} from '../data/placeProfiles';
import {regionPair} from '../data/regionalStudy';
import type {SceneSettings} from '../lib/store';

export default function RegionComparison({settings,onChange,onRelated}:{settings:SceneSettings;onChange:(patch:Partial<SceneSettings>)=>void;onRelated:(id:string,patch?:Partial<SceneSettings>)=>void}){
  const [primary,comparison]=regionPair(settings);
  const choosePrimary=(id:string)=>onChange({selected:id,compareRegion:id===comparison?primary:comparison});
  return <section className="region-comparison" aria-label="用同一问题比较两个地区">
    <h2>把原理带回两个地方</h2>
    <div className="comparison-selectors">
      <label><i className="region-a"/>地点 A<select aria-label="比较地点 A" value={primary} onChange={event=>choosePrimary(event.target.value)}>{regions.map(region=><option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
      <label><i className="region-b"/>地点 B<select aria-label="比较地点 B" value={comparison} onChange={event=>onChange({compareRegion:event.target.value})}>{regions.map(region=><option key={region.id} value={region.id} disabled={region.id===primary}>{region.name}</option>)}</select></label>
    </div>
    <p className="comparison-purpose">城区点用于地区入口，金色 A 与青色 B 同域定位。底图颜色表示海拔；比较气温、降水数值还需同一统计期资料。</p>
    <div className="comparison-cards">{[primary,comparison].map((id,index)=>{
      const place=placeProfiles.find(place=>place.id===id)!;
      return <article key={id} className={index===0?'comparison-a':'comparison-b'}>
        <h3>{index===0?'A':'B'} · {place.name}</h3>
        <p>{place.sections[0].paragraphs[0]}</p>
        <details><summary><BookOpenText size={13}/>进一步认识{place.name}</summary><p>{place.lead}</p>{place.sections.slice(1).map(section=><div key={section.title}><h4>{section.title}</h4>{section.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</div>)}
          <div className="comparison-object-links">{place.objects.map(object=><button key={object.name} type="button" onClick={()=>onRelated(object.stepId,object.settings)}>{object.name}<ArrowRight size={13}/></button>)}</div>
        </details>
        <details className="comparison-sources"><summary>地方材料与范围说明</summary>{place.sources.map(source=><p key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><small>{source.note}</small></p>)}</details>
      </article>;
    })}</div>
    <button className="text-button comparison-back-to-process" type="button" onClick={()=>onRelated('C4')}>回到环流与水汽，检验来路怎样影响地方<ArrowRight size={14}/></button>
  </section>;
}
