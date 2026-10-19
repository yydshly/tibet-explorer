import {useCallback,useEffect,useState} from 'react';
import {lulangLifePhotos,type LulangPhotoId} from '../data/lulangLife';
export const pilotNativePhotoIds:readonly LulangPhotoId[]=['forest','town','grazing','daily','customs'];
/** Prepare only this pilot's existing narrated photos during the approach.
 * A cold direct entry waits for these pixels before the local media clock runs. */
export function usePilotFieldImages(active:boolean){
 const [loaded,setLoaded]=useState<ReadonlySet<string>>(()=>new Set()),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const markLoaded=useCallback((id:string)=>setLoaded(previous=>previous.has(id)?previous:new Set([...previous,id])),[]);
 useEffect(()=>{
  if(!active||typeof Image==='undefined')return;let alive=true;const images:HTMLImageElement[]=[];
  for(const id of pilotNativePhotoIds){
   if(loaded.has(id))continue;const photo=lulangLifePhotos[id],img=new Image();images.push(img);
   img.onload=()=>{void img.decode().then(()=>{if(alive)markLoaded(id);}).catch(()=>{if(alive)setError(`实景未能载入：${photo.title}`);});};
   img.onerror=()=>{if(alive)setError(`实景未能载入：${photo.title}`);};img.src=photo.src;
  }
  return()=>{alive=false;images.forEach(img=>{img.onload=null;img.onerror=null;});};
  // Loaded IDs do not restart in-flight preparation; a deliberate retry does.
 },[active,revision,markLoaded]);
 const retry=()=>{setError('');setRevision(n=>n+1);};
 return {loaded,markLoaded,error,retry,ready:pilotNativePhotoIds.every(id=>loaded.has(id))};
}
