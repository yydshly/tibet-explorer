import {atlasThemes,atlasThemeForStep,atlasHotspotForStep,getAtlasTheme,type AtlasThemeId} from '../data/atlas';
import type {Step} from '../data/curriculum';
import type {SceneSettings} from './store';
import {cityOverviewFacets,getCityOverview,type CityOverviewFacetId} from '../data/cityOverview';

export interface AtlasLocation {themeId:AtlasThemeId;hotspotId:string;questionId:string;view?:'cities'|'topics';cityId?:string;facet?:CityOverviewFacetId;compare?:boolean}

function overviewParams(location:AtlasLocation):string{
 const params=new URLSearchParams();
 if(location.view)params.set('view',location.view);
 if(location.view==='cities'&&location.cityId)params.set('city',location.cityId);
 if(location.view==='cities'&&location.facet)params.set('facet',location.facet);
 if(location.view==='cities'&&location.compare!==undefined)params.set('compare',location.compare?'1':'0');
 return params.toString();
}

export function cityAtlasLocation(cityId='lhasa',facet:CityOverviewFacetId='position',compare?:boolean):AtlasLocation{
 return {...atlasLocationForStep('G4')!,view:'cities',cityId:getCityOverview(cityId)?.id||'lhasa',facet,...(compare===undefined?{}:{compare})};
}

/** Match a regional source before opening a shared question with several places. */
export function cityTopicLocation(stepId:string,cityId:string,facet:CityOverviewFacetId,compare=false):AtlasLocation{
 const local=atlasThemes.flatMap(theme=>theme.hotspots.filter(point=>point.regionId===cityId&&point.relatedQuestionIds.includes(stepId)).map(point=>({themeId:theme.id,hotspotId:point.id,questionId:stepId})))[0];
 return {...(local||atlasLocationForStep(stepId)||cityAtlasLocation(cityId,facet)),view:'cities',cityId,facet,compare};
}

export function atlasLocationForStep(stepId:string):AtlasLocation|undefined{
 const theme=atlasThemeForStep(stepId),hotspot=atlasHotspotForStep(stepId);
 return theme&&hotspot?{themeId:theme.id,hotspotId:hotspot.id,questionId:stepId}:undefined;
}

export function atlasHash(location:AtlasLocation):string{
 const query=overviewParams(location);
 return `/atlas/${location.themeId}/${location.hotspotId}/${location.questionId}${query?`?${query}`:''}`;
}

// Old topic links enter through their map context. Only an explicit detail
// route opens a local model, so a bookmark cannot strand a newcomer in a cutout.
export function parseAtlasLocation(hash:string):AtlasLocation|undefined{
 const parts=hash.replace(/^#?\/?/,'').split('?')[0].split('/');
 if(parts[0]==='learn'&&parts[3]!=='detail')return atlasLocationForStep(parts[2]);
 if(parts[0]!=='atlas')return undefined;
 const theme=getAtlasTheme(parts[1])||atlasThemes[0];
 const hotspot=theme.hotspots.find(item=>item.id===parts[2])||theme.hotspots[0];
 const questionId=hotspot.relatedQuestionIds.includes(parts[3])?parts[3]:hotspot.questionId;
 const params=new URLSearchParams(hash.split('?')[1]||'');
 const view=params.get('view'),cityId=params.get('city')||'',facet=params.get('facet')||'';
 const location:AtlasLocation={themeId:theme.id,hotspotId:hotspot.id,questionId};
 if(view==='topics')return {...location,view};
 if(view==='cities')return {...location,view,cityId:getCityOverview(cityId)?.id||hotspot.regionId,facet:cityOverviewFacets.find(item=>item.id===facet)?.id||'position',...(['0','1'].includes(params.get('compare')||'')?{compare:params.get('compare')==='1'}:{})};
 return location;
}

export function detailHash(chapterId:string,stepId:string,origin?:AtlasLocation):string{
 const context=origin||atlasLocationForStep(stepId);
 const query=context?overviewParams(context):'';
 return `/learn/${chapterId}/${stepId}/detail${context?`?from=${context.themeId}/${context.hotspotId}/${context.questionId}${query?`&${query}`:''}`:''}`;
}

export function detailOrigin(hash:string,stepId:string):AtlasLocation|undefined{
 const params=new URLSearchParams(hash.split('?')[1]||''),from=params.get('from');
 return (from?parseAtlasLocation(`#/atlas/${from}?${params}`):undefined)||atlasLocationForStep(stepId);
}

export function settingsFromAtlas(step:Step,current:SceneSettings,origin:AtlasLocation,previousHotspot?:string):SceneSettings{
 const point=getAtlasTheme(origin.themeId)?.hotspots.find(item=>item.id===origin.hotspotId);
 if(['E3','P1','P2','P3','R1','R2','R3','T1','T2','T3'].includes(step.id))return current;
 if(!point||previousHotspot===origin.hotspotId||!['region','landscape','connections','travel'].includes(step.scene))return current;
 const compareRegion=current.compareRegion===point.regionId?(point.regionId==='nyingchi'?'nagqu':'nyingchi'):current.compareRegion;
 return {...current,selected:point.regionId,...(compareRegion?{compareRegion}:{})};
}
