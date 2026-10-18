import {regionalTerrainMeta,terrainReferencePoints} from '../data/terrainMetadata';
import localMeta from '../data/localTerrainMeta.json';
import {verifiedPlaceReferences} from '../data/placeProvenance';
import type {SceneSettings} from './store';
import type {VisualGuideState} from '../data/visualGuidance';
export type ElevationDescriptor={west:number;east:number;south:number;north:number;columns:number;rows:number;dataUrl:string;sourceUrl:string;verticalExaggeration:number;gridSpacingKm:string};
export const elevationDescriptors:{regional:ElevationDescriptor;local:ElevationDescriptor}={regional:regionalTerrainMeta,local:{...localMeta.boundsDegrees,columns:localMeta.columns,rows:localMeta.rows,dataUrl:localMeta.dataUrl,sourceUrl:localMeta.sourceUrl,verticalExaggeration:localMeta.verticalExaggeration,gridSpacingKm:'约0.4 km'}};
export const elevationDataset=(stepId:string)=>stepId==='G4'?'regional':stepId==='P1'?'local':undefined;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export function sampleElevationMetres(grid:ArrayLike<number>,meta:ElevationDescriptor,longitude:number,latitude:number){
 if(grid.length!==meta.columns*meta.rows)throw Error('高程网格长度与来源不一致');
 const x=clamp((longitude-meta.west)/(meta.east-meta.west))*(meta.columns-1),y=clamp((meta.north-latitude)/(meta.north-meta.south))*(meta.rows-1),ix=Math.min(meta.columns-2,Math.floor(x)),iy=Math.min(meta.rows-2,Math.floor(y)),fx=x-ix,fy=y-iy;
 const north=grid[iy*meta.columns+ix]*(1-fx)+grid[iy*meta.columns+ix+1]*fx,south=grid[(iy+1)*meta.columns+ix]*(1-fx)+grid[(iy+1)*meta.columns+ix+1]*fx;
 return north*(1-fy)+south*fy;
}
export type ElevationPose={longitude:number;latitude:number;fraction:number;profile:boolean;name:string;phase:string;points:{longitude:number;latitude:number;name:string}[]};
export function elevationPose(stepId:string,settings:Pick<SceneSettings,'layer'|'progress'|'selected'|'readingFraction'>,guide?:VisualGuideState):ElevationPose|undefined{
 const dataset=elevationDataset(stepId);if(!dataset)return;const meta=elevationDescriptors[dataset],active=guide?.active,clock=guide?.progress??0;
 const profile=stepId==='G4'?settings.layer==='relief':settings.progress>=.68;
 let longitude=stepId==='G4'?80+clamp(settings.progress)*18:93.86+clamp((settings.progress-.68)/.32)*1.02;
 let fraction=clamp(settings.readingFraction??.5),name='沿南北剖面读取',phase='手动拖动读点，核对同一位置的高度';
 if(active&&guide.cueId==='G4-explain'){
  // Narration and the comparison controls use the same authored three samples.
  // Reading the cue clock also makes seeking backward restore the earlier point.
  const authored=guide.sceneSettings?.readingFraction;
  const latitude=authored===undefined?(clock<.2?26:clock<.43?28.046875:33):meta.south+clamp(authored)*(meta.north-meta.south);
  longitude=89;fraction=(latitude-meta.south)/(meta.north-meta.south);
  phase=authored!==undefined?guide.explanation:clock<.2?'先记住山前低地的高度':clock<.43?'沿同一剖面来到山地高点':'越过山地，高原内部仍然很高';
 }else if(active&&guide.cueId==='P1-explain'&&profile){fraction=clamp(((guide.sceneProgress??settings.progress)-.68)/.32);phase='同一南北方向中，读点与真实高程线一起移动';}
 const latitude=meta.south+fraction*(meta.north-meta.south);
 if(profile)return {longitude,latitude,fraction,profile,name,phase,points:[{longitude,latitude,name:'当前剖面读点'}]};
 if(stepId==='G4'){
  const targets=active?guide.targets:[settings.selected];const points=terrainReferencePoints.filter(point=>targets.includes(point.id));const choices=points.length?points:[terrainReferencePoints[1]];
  const first=choices[0];return {longitude:first.longitude,latitude:first.latitude,fraction:(first.latitude-meta.south)/(meta.north-meta.south),profile:false,name:first.title,phase:'跟随讲述，读相应方位参考点的网格海拔',points:choices.map(point=>({...point,name:`${point.title}参考点`}))};
 }
 const town=verifiedPlaceReferences.nyingchi;longitude=town.longitude;name='林芝城区参考点';return {longitude,latitude:town.latitude,fraction:(town.latitude-meta.south)/(meta.north-meta.south),profile:false,name,phase:'先认局部窗口与城区参照，剖面阶段再沿线读数',points:[{longitude,latitude:town.latitude,name}]};
}
const requests=new Map<string,Promise<Int16Array>>();
/** Shared immutable data; leaving a reader drops its subscriber, not another reader's request. */
export function loadElevationGrid(dataset:'regional'|'local'){
 if(!requests.has(dataset)){const meta=elevationDescriptors[dataset];requests.set(dataset,fetch(meta.dataUrl).then(response=>{if(!response.ok)throw Error('高程数据暂不可读');return response.arrayBuffer();}).then(buffer=>{if(buffer.byteLength!==meta.columns*meta.rows*2)throw Error('高程数据不完整');const source=new DataView(buffer),grid=new Int16Array(meta.columns*meta.rows);for(let i=0;i<grid.length;i++)grid[i]=source.getInt16(i*2,true);return grid;}).catch(error=>{requests.delete(dataset);throw error;}));}return requests.get(dataset)!;
}
