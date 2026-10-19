import type {PilotProfilePoint} from './routePilotTerrainData';
type Point={x:number;y:number;z:number};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
/** Interpolate only along consecutive archived road nodes, using source arc length. */
export function pilotProfileSample(profile:readonly PilotProfilePoint[],distance:number){
 const d=clamp(distance,0,profile.at(-1)!.distance);let lo=0,hi=profile.length-1;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(profile[mid].distance<d)lo=mid;else hi=mid;}
 const a=profile[lo],b=profile[hi],f=clamp((d-a.distance)/Math.max(.0001,b.distance-a.distance));
 return {coordinate:a.coordinate.map((v,i)=>v+(b.coordinate[i]-v)*f),elevation:a.elevation+(b.elevation-a.elevation)*f,distance:d};
}
/** A broad road chord avoids steering at every small OSM bend. Target is ON
 * the road rather than extrapolated through a hillside. This is a map flight. */
export function pilotTravelFrame(profile:readonly PilotProfilePoint[],progress:number,lookBack=false,metresPerLongitude=111320*Math.cos(29.66*Math.PI/180)){
 const total=profile.at(-1)!.distance,d=clamp(progress)*total;
 const behind=pilotProfileSample(profile,d-850),here=pilotProfileSample(profile,d),ahead=pilotProfileSample(profile,d+1250);
 const vector=(a:typeof here,b:typeof here)=>({x:(b.coordinate[0]-a.coordinate[0])*metresPerLongitude,z:-(b.coordinate[1]-a.coordinate[1])*111320});
 const headingVector=vector(behind,ahead),incoming=vector(behind,here),outgoing=vector(here,ahead);
 const bend=Math.abs(Math.atan2(incoming.x*outgoing.z-incoming.z*outgoing.x,incoming.x*outgoing.x+incoming.z*outgoing.z));
 const lead=clamp(1250-bend*220,650,1250),target=pilotProfileSample(profile,d+(lookBack?-lead:lead));
 return {here,target,heading:Math.atan2(-headingVector.x,-headingVector.z)+(lookBack?Math.PI:0),bend,lead};
}
/** Lift the virtual eye only when a sampled DSM ridge crosses the sightline.
 * Units are scene kilometres. Terrain itself stays at true height1x. */
export function pilotSightlineHeight(eye:Point,target:Point,elevation:(x:number,z:number)=>number|undefined){
 let height=eye.y;
 for(let i=0;i<=12;i++){
  const t=i/14,x=eye.x+(target.x-eye.x)*t,z=eye.z+(target.z-eye.z)*t,ground=elevation(x,z);
  if(ground!==undefined)height=Math.max(height,(ground+.08-target.y*t)/(1-t));
 }
 return height;
}
