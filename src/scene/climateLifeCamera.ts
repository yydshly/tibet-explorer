import * as THREE from 'three';
import type {ClimateLabState} from '../data/climateLab';
import {climateLabCoordinates} from '../lib/climateLabProcess';
import {overviewAtlasCamera,type OverviewAtlasCameraInput} from './overviewAtlasCamera';

/** Frame both directions together so changing the probe/direction does not
 * masquerade as a change in terrain. Points are the existing DEM samples;
 * the extra corners only reserve room for the existing probe label. */
export function climateLifeFramePoints(state:ClimateLabState,at:(lon:number,lat:number,offset:number)=>THREE.Vector3){
 const points:THREE.Vector3[]=[];
 for(const direction of ['north-south','east-west'] as const){
  for(let i=0;i<=100;i++){
   const c=climateLabCoordinates({...state,direction},i/100),point=at(c.longitude,c.latitude,.04);
   points.push(point,point.clone().add(new THREE.Vector3(0,.65,0)),
    point.clone().add(new THREE.Vector3(-3.2,.2,0)),point.clone().add(new THREE.Vector3(-.8,.5,0)));
  }
 }
 return points;
}

export function climateLifeCamera(input:Pick<OverviewAtlasCameraInput,'camera'|'viewport'>,points:THREE.Vector3[]){
 const {width,height}=input.viewport;
 return overviewAtlasCamera({...input,wholePoints:points,
  safeRect:{left:Math.min(30,width*.1),right:width-Math.min(30,width*.1),top:Math.min(105,height*.25),bottom:height-Math.min(135,height*.3)},
  resolve:()=>undefined,shot:{cameraFrom:{focusIds:[],amount:0},cameraTo:{focusIds:[],amount:0},cameraMix:0},
  viewDirection:new THREE.Vector3(.85,1,.8)});
}
