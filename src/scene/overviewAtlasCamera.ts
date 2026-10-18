import * as THREE from 'three';
import type {OverviewShotCamera} from '../lib/overviewShot';

export interface OverviewAtlasCameraInput {
  camera: {fov:number;aspect:number};
  viewport: {width:number;height:number};
  /** The seven existing place references, on the same actual atlas terrain. */
  wholePoints: readonly THREE.Vector3[];
  resolve: (id:string)=>THREE.Vector3|undefined;
  shot: {cameraFrom:OverviewShotCamera;cameraTo:OverviewShotCamera;cameraMix:number};
  /** A source-word-driven presentation width. Changing it does not change any
   * geographic coordinate or start an independent camera transition. */
  evidenceWidth?: number;
  safeRect?:OverviewAtlasSafeRect;
  /** Optional oblique reading direction; existing atlas shots keep their default. */
  viewDirection?:THREE.Vector3;
}
export interface OverviewAtlasCameraPose {position:THREE.Vector3;target:THREE.Vector3}
export interface OverviewAtlasSafeRect {left:number;right:number;top:number;bottom:number}

const clamp=(value:number,min:number,max:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):min;
const finitePoint=(point:THREE.Vector3)=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z);

/** Screen space for the historical index, source image and real subtitles.
 * Tiny viewports use a finite fallback; desktop teaching dimensions retain the
 * exact top115/bottom125 offsets. This helper does not resize the viewport. */
export function overviewAtlasSafeRect(viewport:{width:number;height:number},evidenceWidth=0):OverviewAtlasSafeRect {
  const {width,height}=viewport;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
    throw new Error('总览地图需要有效的可视区域');
  const margin=Math.min(36,width*.1),top=Math.min(115,height*.32),bottom=height-Math.min(125,height*.33);
  const reserved=clamp(evidenceWidth,0,Math.max(0,width-margin*2-Math.min(80,width*.2)));
  return {left:margin+reserved,right:width-margin,top,bottom};
}

/** Pure geometric framing of the SAME complete map. A focus mildly moves the
 * reading centre; all seven references and their padded geographic bounds are
 * fitted back into the usable rectangle. The source-word camera mix owns the
 * motion. There is no renderer, Date, seconds, animation queue or view cache. */
export function overviewAtlasCamera(input:OverviewAtlasCameraInput):OverviewAtlasCameraPose {
  const {camera,viewport,wholePoints,resolve,shot}=input;
  if(!Number.isFinite(camera.fov)||camera.fov<=0||camera.fov>=170||!Number.isFinite(camera.aspect)||camera.aspect<=0)
    throw new Error('总览地图需要有效的透视参数');
  if(!wholePoints.length||wholePoints.some(point=>!finitePoint(point)))
    throw new Error('总览地图需要有效的整体地区参照');
  const rect=input.safeRect??overviewAtlasSafeRect(viewport,input.evidenceWidth);
  const bounds=new THREE.Box3().setFromPoints([...wholePoints]);
  // These are compositional padding in the existing atlas world, never a city
  // boundary, historical footprint or new geographical measurement.
  bounds.min.x-=.8;bounds.max.x+=.8;
  bounds.min.z-=.7;bounds.max.z+=.7;
  bounds.min.y=Math.min(0,bounds.min.y-.15);
  bounds.max.y=Math.max(1.3,bounds.max.y+.15);
  const wholeCentre=bounds.getCenter(new THREE.Vector3());
  const emphasizedCentre=(frame:OverviewShotCamera)=>{
    const focus=frame.focusIds.map(resolve).filter((point):point is THREE.Vector3=>!!point&&finitePoint(point));
    if(!focus.length)return wholeCentre.clone();
    const centre=new THREE.Box3().setFromPoints(focus).getCenter(new THREE.Vector3());
    // A remote or unavailable source must not cause an unbounded flight. A
    // valid locality outside the seven-place range still has a map annotation.
    centre.clamp(bounds.min,bounds.max);
    return wholeCentre.clone().lerp(centre,clamp(frame.amount,0,.24));
  };
  const centre=emphasizedCentre(shot.cameraFrom).lerp(emphasizedCentre(shot.cameraTo),clamp(shot.cameraMix,0,1));
  const direction=(input.viewDirection??new THREE.Vector3(0,1,.7)).clone().normalize();
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanX=tanY*camera.aspect;
  const xMin=rect.left/viewport.width*2-1,xMax=rect.right/viewport.width*2-1;
  const yMin=1-rect.bottom/viewport.height*2,yMax=1-rect.top/viewport.height*2;
  const centreX=(xMin+xMax)/2,centreY=(yMin+yMax)/2;
  const halfX=(xMax-xMin)/2,halfY=(yMax-yMin)/2;
  let distance=2;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const relative=new THREE.Vector3(x,y,z).sub(centre),depth=relative.dot(direction);
    const horizontal=relative.dot(right)/tanX,vertical=relative.dot(up)/tanY;
    // Exact perspective constraints for a target shifted into an asymmetric
    // screen rectangle. The depth terms keep near corners out of the image.
    distance=Math.max(distance,depth+.2,
      (-horizontal-xMin*depth)/halfX,(horizontal+xMax*depth)/halfX,
      (-vertical-yMin*depth)/halfY,(vertical+yMax*depth)/halfY);
  }
  distance*=1.04;
  // Move the optical target, not the terrain. The geographic reading centre
  // projects to the safe rectangle's centre even when a source image is open.
  const target=centre.clone()
    .addScaledVector(right,-centreX*distance*tanX)
    .addScaledVector(up,-centreY*distance*tanY);
  return {position:target.clone().addScaledVector(direction,distance),target};
}

/** Pull back inside the same geographic world. At first the actual locality
 * stays under the optical target, so the viewer sees its surroundings emerge.
 * Only after the first 35% does the target move to the regional reading centre,
 * in proportion to the visible distance gained, keeping the locality in view.
 * Logarithmic distance handles the real street-to-region scale difference
 * without losing the local place in the first few spoken words. The caller's
 * exact source-word mix is the only clock; reverse seeking recomputes the pose. */
export function overviewReturnCamera(from:OverviewAtlasCameraPose,to:OverviewAtlasCameraPose,mix:number):OverviewAtlasCameraPose {
  if(!finitePoint(from.position)||!finitePoint(from.target)||!finitePoint(to.position)||!finitePoint(to.target))
    throw new Error('总览回看需要有效的相机位置');
  const fromOffset=from.position.clone().sub(from.target),toOffset=to.position.clone().sub(to.target);
  const fromDistance=fromOffset.length(),toDistance=toOffset.length();
  if(fromDistance<=0||toDistance<=0||!Number.isFinite(fromDistance)||!Number.isFinite(toDistance))
    throw new Error('总览回看需要有效的相机距离');
  const progress=clamp(mix,0,1);
  if(progress===0)return {position:from.position.clone(),target:from.target.clone()};
  if(progress===1)return {position:to.position.clone(),target:to.target.clone()};
  const smooth=(value:number)=>value*value*(3-2*value);
  const eased=smooth(progress);
  const distance=Math.exp(Math.log(fromDistance)+(Math.log(toDistance)-Math.log(fromDistance))*eased);
  const heldDistance=Math.exp(Math.log(fromDistance)+(Math.log(toDistance)-Math.log(fromDistance))*smooth(.35));
  const gainedDistance=toDistance-heldDistance;
  const targetProgress=progress<=.35?0:smooth(clamp(Math.abs(gainedDistance)>1e-9
    ?(distance-heldDistance)/gainedDistance:(progress-.35)/.65,0,1));
  const direction=fromOffset.divideScalar(fromDistance),endDirection=toOffset.divideScalar(toDistance);
  // A quaternion keeps even opposing valid directions on a unit sphere; a
  // plain Vector3 lerp could pass through the target and create a zero view.
  const rotation=new THREE.Quaternion().setFromUnitVectors(direction,endDirection);
  direction.applyQuaternion(new THREE.Quaternion().slerp(rotation,eased));
  const target=from.target.clone().lerp(to.target,targetProgress);
  return {position:target.clone().addScaledVector(direction,distance),target};
}
