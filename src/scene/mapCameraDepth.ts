import type * as THREE from 'three';

/** One fixed microscopic near plane loses metre-scale road/ground separation
 * when the same map camera pulls back to a 50–120 km regional corridor. Keep
 * depth precision relative to its actual orbit distance, including manual zoom
 * and every intermediate frame of the geographic camera transition. */
export function localMapNearPlane(distance:number){
  return Math.max(.00001,Number.isFinite(distance)?Math.max(0,distance)*.01:.00001);
}
export function updateLocalMapDepth(camera:THREE.PerspectiveCamera,target:THREE.Vector3){
  const next=localMapNearPlane(camera.position.distanceTo(target));
  if(Math.abs(camera.near-next)>next*.005){camera.near=next;camera.updateProjectionMatrix();}
}
