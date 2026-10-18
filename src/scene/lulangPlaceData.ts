import {lulangReadingWindow,lulangRiverId,lulangWoodId} from '../data/lulangPlace';
export type LulangService={id:string;name:string;coordinate:number[];kind:'food'|'lodging'};
export type LulangSectionPoint={coordinate:number[];elevation:number;distance:number};
export type LulangPlaceData={riverPoint:number[];riverPaths:number[][][];woodPaths:number[][][];services:LulangService[];section:LulangSectionPoint[]};
const inside=(p:number[])=>p[0]>=lulangReadingWindow[0]&&p[0]<=lulangReadingWindow[2]&&p[1]>=lulangReadingWindow[1]&&p[1]<=lulangReadingWindow[3];
// Keep only contiguous source edges supported by the local reading window.
function runs(path:number[][]){const out:number[][][]=[];let run:number[][]=[];for(const p of path){if(inside(p))run.push(p);else{if(run.length>1)out.push(run);run=[];}}if(run.length>1)out.push(run);return out;}
export function lulangPlaceData(place:{features:any[]},sample:(lon:number,lat:number)=>number,centre:number[]):LulangPlaceData{
 const river=place.features.find(f=>f.id===lulangRiverId),wood=place.features.find(f=>f.id===lulangWoodId);
 if(!river||!wood)throw Error('鲁朗河或林地来源记录缺失，无法对应地方讲述。');
 const riverPaths=runs(river.geometry.coordinates);
 const candidates=riverPaths.flat();if(!candidates.length)throw Error('鲁朗河资料不覆盖当前观察范围。');
 const lonScale=111320*Math.cos(centre[1]*Math.PI/180),riverPoint=candidates.reduce((a,b)=>Math.hypot((a[0]-centre[0])*lonScale,(a[1]-centre[1])*111320)<Math.hypot((b[0]-centre[0])*lonScale,(b[1]-centre[1])*111320)?a:b);
 const services=place.features.filter(f=>f.geometry.type==='Point'&&inside(f.geometry.coordinates)).flatMap(f=>{
  const tags=f.properties.tags,kind=tags.amenity==='restaurant'?'food':['hotel','guest_house'].includes(tags.tourism)?'lodging':undefined;
  return kind?[{id:f.id,name:f.properties.name,coordinate:f.geometry.coordinates,kind} as LulangService]:[];
 });
 const section=Array.from({length:65},(_,i)=>{const distance=i/64*2600,coordinate=[riverPoint[0]+(distance-1300)/lonScale,riverPoint[1]];return {coordinate,distance,elevation:sample(coordinate[0],coordinate[1])};});
 return {riverPoint,riverPaths,woodPaths:wood.geometry.coordinates.flatMap((ring:number[][])=>runs(ring)),services,section};
}
