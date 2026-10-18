import {GlobeHemisphereEast,ArrowRight} from '@phosphor-icons/react';
import {atlasThemes,atlasThemeForStep,type AtlasThemeId} from '../data/atlas';

/** A lesson's knowledge stage can differ from the map material used to enter it. */
export function spatialJourneyActive(stepId:string,mainline:boolean,originTheme?:AtlasThemeId):'earth'|AtlasThemeId{
 if(!mainline)return originTheme||atlasThemeForStep(stepId)?.id||'earth';
 if(['G1','G2'].includes(stepId))return 'earth';
 if(/^[RMT]\d+$/.test(stepId))return 'development';
 if(/^H\d+$/.test(stepId))return 'history';
 if(/^K\d+$/.test(stepId)||['E3','P3'].includes(stepId))return 'people';
 return atlasThemeForStep(stepId)?.id||'earth';
}

export default function SpatialJourneyNav({active,onEarth,onTheme}:{active:'earth'|AtlasThemeId;onEarth:()=>void;onTheme:(id:AtlasThemeId)=>void}){
 return <nav className="spatial-journey" aria-label="从地球到西藏的完整认识路径">
  <button type="button" className={active==='earth'?'active':''} aria-current={active==='earth'?'step':undefined} onClick={onEarth}><GlobeHemisphereEast size={17}/><span>01</span>地球上的位置</button>
  {atlasThemes.map((theme,index)=><div key={theme.id}><ArrowRight size={12}/><button type="button" className={active===theme.id?'active':''} aria-current={active===theme.id?'step':undefined} onClick={()=>onTheme(theme.id)}><span>{String(index+2).padStart(2,'0')}</span>{theme.title}</button></div>)}
 </nav>;
}
