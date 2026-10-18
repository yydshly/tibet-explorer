import {useEffect,useState} from 'react';
import type {CityLocalityId,CityLocalManifest,CityLocalManifestPlace} from '../lib/cityLocalGeography';

const cache=new Map<string,Promise<unknown>>();
function read(path:string){let promise=cache.get(path);if(!promise){promise=fetch(path).then(response=>{if(!response.ok)throw new Error('地方地图资料暂未读取成功');return response.json();}).catch(error=>{cache.delete(path);throw error;});cache.set(path,promise);}return promise;}
export function useCityLocalData(localityId:CityLocalityId|undefined,geometry=false){
 const path=localityId?(geometry?`/data/local-places/${localityId}.geojson`:'/data/local-places/manifest.json'):undefined;
 const [state,setState]=useState<{path?:string;data?:unknown;error?:string}>({});
 useEffect(()=>{let cancelled=false;if(path)void read(path).then(data=>{if(!cancelled)setState({path,data});},error=>{if(!cancelled)setState({path,error:error instanceof Error?error.message:'地方地图资料暂未读取成功'});});return()=>{cancelled=true;};},[path]);
 const current=state.path===path?state:undefined;
 const manifest=current?.data as CityLocalManifest|undefined;
 const metadata:CityLocalManifestPlace|undefined=geometry?(current?.data as {metadata?:CityLocalManifestPlace}|undefined)?.metadata:manifest?.places?.find(place=>place.id===localityId);
 return {data:current?.data,metadata,error:current?.error,loading:Boolean(path&&!current)};
}
