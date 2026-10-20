import type {PilotProfilePoint} from './routePilotTerrainData';
import {pilotProfileSample} from './pilotTravelFrame';

export type RoadRideLook='forward'|'left'|'right'|'back'|'overview';
/** Virtual observation, not a surveyed road deck or driver-eye reconstruction.
 * Source chain owns position; the eye is deliberately 12m above the DSM. */
export function roadRideFrame(profile:readonly PilotProfilePoint[],progress:number,look:RoadRideLook){
 const total=profile.at(-1)!.distance,d=Math.max(0,Math.min(1,progress))*total;
 const here=pilotProfileSample(profile,d),before=pilotProfileSample(profile,d-65),after=pilotProfileSample(profile,d+65);
 const mx=111320*Math.cos(here.coordinate[1]*Math.PI/180);
 const heading=Math.atan2((after.coordinate[0]-before.coordinate[0])*mx,-(after.coordinate[1]-before.coordinate[1])*111320);
 const angle=heading+(look==='left'?Math.PI/2:look==='right'?-Math.PI/2:look==='back'?Math.PI:0);
 const step=(distance:number)=>[here.coordinate[0]+Math.sin(angle)*distance/mx,here.coordinate[1]-Math.cos(angle)*distance/111320];
 return {here,eyeCoordinate:look==='overview'?step(-350):here.coordinate,eyeHeight:look==='overview'?500:12,
  targetCoordinate:look==='overview'?pilotProfileSample(profile,d+220).coordinate:look==='forward'?pilotProfileSample(profile,d+65).coordinate:look==='back'?pilotProfileSample(profile,d-65).coordinate:step(350),
  targetHeight:look==='overview'?30:7,
  grade:(after.elevation-before.elevation)/Math.max(1,after.distance-before.distance)};
}
export function roadRideSegment(profile:readonly PilotProfilePoint[],anchor:number){
 const total=profile.at(-1)!.distance,end=Math.max(0,Math.min(1,anchor))*total,start=Math.max(0,end-1800);
 return {start,end,total,length:end-start,startHeight:pilotProfileSample(profile,start).elevation};
}
