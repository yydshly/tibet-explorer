import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {localMapNearPlane,updateLocalMapDepth} from '../src/scene/mapCameraDepth';

describe('geographic camera depth precision from streets to regional corridors',()=>{
 it('keeps real metre-scale road clearance distinct in a 24-bit depth buffer at corridor and local distances',()=>{
   const metresPerUnit=47*111320*Math.cos(29.5*Math.PI/180)/36,target=new THREE.Vector3(0,.06,0),camera=new THREE.PerspectiveCamera(43,1280/720,.00001,180),direction=new THREE.Vector3(0,1.35,1).normalize();
   const quantize=p=>Math.round((p.clone().project(camera).z+1)/2*(2**24-1));
   for(const distance of [2,1,.5,.03,.005]){
     camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld();updateLocalMapDepth(camera,target);
     expect(camera.near).toBeCloseTo(localMapNearPlane(distance),12);
     const ground=target.clone(),road=ground.clone().add(new THREE.Vector3(0,14/metresPerUnit,0));
     expect(Math.abs(quantize(ground)-quantize(road))).toBeGreaterThan(4);
     expect(road.clone().project(camera).z).toBeGreaterThan(-1);expect(ground.clone().project(camera).z).toBeLessThan(1);
   }
 });
 it('updates projection for paused manual zoom as well as camera transitions and safely bounds invalid/zero distances',()=>{
   const camera=new THREE.PerspectiveCamera(43,1,.00001,180),target=new THREE.Vector3();camera.position.set(0,2,0);updateLocalMapDepth(camera,target);const farNear=camera.near;
   camera.position.set(0,.02,0);updateLocalMapDepth(camera,target);expect(camera.near).toBeCloseTo(farNear/100,12);expect(localMapNearPlane(0)).toBe(.00001);expect(localMapNearPlane(NaN)).toBe(.00001);expect(localMapNearPlane(-1)).toBe(.00001);
 });
});
