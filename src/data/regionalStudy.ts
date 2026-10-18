import {placeProfiles} from './placeProfiles';
import type {SceneSettings} from '../lib/store';
import type {SceneUnderstanding} from './sceneUnderstanding';
import {verifiedPlaceReferences} from './placeProvenance';

/** Published locality reference points; never a city's geometric centre or regional climate extent. */
export const regionalAnchors=[
  {id:'lhasa',title:'拉萨 · 城区参照'},
  {id:'nyingchi',title:'林芝 · 城区参照'},
  {id:'shannan',title:'山南 · 泽当参照'},
  {id:'shigatse',title:'日喀则 · 城区参照'},
  {id:'nagqu',title:'那曲 · 城区参照'},
  {id:'ngari',title:'阿里 · 狮泉河参照'},
  {id:'chamdo',title:'昌都 · 城区参照'},
].map(region=>{
  const reference=verifiedPlaceReferences[region.id];
  return {...region,longitude:reference.longitude,latitude:reference.latitude,
    coordinateSourceId:reference.sourceId,coordinateSourceUrl:reference.sourceUrl,
    locatorName:reference.name,displayDecimalPlaces:reference.displayDecimalPlaces};
});

export function regionPair(settings:SceneSettings):[string,string]{
  const primary=regionalAnchors.some(region=>region.id===settings.selected)?settings.selected:'nyingchi';
  const fallback=primary==='nyingchi'?'nagqu':'nyingchi';
  const comparison=regionalAnchors.some(region=>region.id===settings.compareRegion)&&settings.compareRegion!==primary?settings.compareRegion!:fallback;
  return [primary,comparison];
}

export function regionalUnderstanding(stepId:string,settings:SceneSettings):SceneUnderstanding|undefined{
  if(!['E1','E2'].includes(stepId))return;
  const [a,b]=regionPair(settings),left=placeProfiles.find(place=>place.id===a)!,right=placeProfiles.find(place=>place.id===b)!;
  return {title:stepId==='E2'?`${left.name}与${right.name}：放在同一底图中比较`:`先定位${left.name}，再与${right.name}对照`,
    explanation:'地形底图、方向和显示尺度保持相同，金色与青色分别标出两个地区入口。标记是城区附近定位点，不能代表整个行政地区的环境。沿同样的问题阅读地方材料，再回到空气、水汽与地形的解释。',
    lookFor:'先比较位置与地形，再读两地材料；保持同样的问题与资料口径。',
    provenance:'Mapzen高程网格 · 颜色为海拔 · 城镇参照来自Natural Earth／GeoNames · 不是地区气候统计',
    objects:[],processLabel:'',stops:[],allowsCutaway:false,hasProgress:false};
}
