import {routeArcLengths} from './routeArcLength';
export type PilotTerrainMeta={bbox:number[];columns:number;rows:number};
export type PilotProfilePoint={distance:number;elevation:number;coordinate:number[]};
export type PilotTerrainContext={profile:PilotProfilePoint[];total:number;highestIndex:number;connectionStartIndex:number;connectionLength:number};
/** Same diagonal and north-to-south vertex order as the rendered PlaneGeometry. */
export function pilotElevationSampler(meta:PilotTerrainMeta,grid:Int16Array){
 const [w,s,e,n]=meta.bbox;
 return (lon:number,lat:number)=>{
  const x=Math.max(0,Math.min(meta.columns-1,(lon-w)/(e-w)*(meta.columns-1))),y=Math.max(0,Math.min(meta.rows-1,(n-lat)/(n-s)*(meta.rows-1)));
  const ix=Math.min(meta.columns-2,Math.floor(x)),iy=Math.min(meta.rows-2,Math.floor(y)),fx=x-ix,fy=y-iy;
  const a=grid[iy*meta.columns+ix],b=grid[iy*meta.columns+ix+1],c=grid[(iy+1)*meta.columns+ix+1],d=grid[(iy+1)*meta.columns+ix];
  return fx+fy<=1?a+(b-a)*fx+(d-a)*fy:c+(d-c)*(1-fx)+(b-c)*(1-fy);
 };
}
export function pilotTerrainContext(meta:PilotTerrainMeta,grid:Int16Array,route:{coordinates:number[][];sourceWayIdsByEdge:string[]},place:{features:any[]}):PilotTerrainContext{
 const [w,s,e,n]=meta.bbox,mx=111320*Math.cos((s+n)/2*Math.PI/180),mz=111320;
 const sample=pilotElevationSampler(meta,grid),points=route.coordinates.map(p=>({x:(p[0]-(w+e)/2)*mx,y:0,z:((s+n)/2-p[1])*mz})),lengths=routeArcLengths(points);
 const profile=route.coordinates.map((coordinate,i)=>({coordinate,distance:lengths.cumulative[i],elevation:sample(coordinate[0],coordinate[1])}));
 let highestIndex=0;for(let i=1;i<profile.length;i++)if(profile[i].elevation>profile[highestIndex].elevation)highestIndex=i;
 const tags=new Map(place.features.filter(f=>f.properties.featureClass==='road').map(f=>[f.id,f.properties.tags]));
 let connectionStartIndex=route.coordinates.length-1;
 while(connectionStartIndex>0){const t=tags.get(route.sourceWayIdsByEdge[connectionStartIndex-1]);if(!t||t.ref==='G318'||!['tertiary','service'].includes(t.highway))break;connectionStartIndex--;}
 return {profile,total:lengths.total,highestIndex,connectionStartIndex,connectionLength:lengths.total-lengths.cumulative[connectionStartIndex]};
}
export function profilePosition(clientX:number,left:number,width:number){return Math.max(0,Math.min(1,(clientX-left)/Math.max(1,width)));}
