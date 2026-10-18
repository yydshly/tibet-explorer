import * as THREE from 'three';
import {line} from './environment';
/** A measured-height reference, not a borehole or geological column. */
export function buildElevationProbe(parent:THREE.Group,id:string,runtime?:{camera:THREE.PerspectiveCamera;renderer:{getSize:(v:THREE.Vector2)=>THREE.Vector2}}){
 const group=new THREE.Group();group.name=id;group.userData.guideId=id;parent.add(group);
 const geometry=new THREE.SphereGeometry(.105,16,12),material=new THREE.MeshBasicMaterial({color:0xffdf87,depthTest:false});
 const marker=new THREE.Mesh(geometry,material);marker.renderOrder=23;group.add(marker);
 const halo=new THREE.Mesh(new THREE.RingGeometry(.15,.20,40),new THREE.MeshBasicMaterial({color:0xffdf87,side:THREE.DoubleSide,transparent:true,opacity:.85,depthTest:false}));halo.rotation.x=-Math.PI/2;halo.renderOrder=22;group.add(halo);
 const contrast=new THREE.Mesh(new THREE.RingGeometry(.13,.25,40),new THREE.MeshBasicMaterial({color:0x071923,side:THREE.DoubleSide,depthTest:false}));contrast.renderOrder=21;group.add(contrast);const size=new THREE.Vector2();
 const ruler=line([new THREE.Vector3(),new THREE.Vector3()],0xf3d591,.78);(ruler.material as THREE.LineBasicMaterial).depthTest=false;ruler.renderOrder=22;group.add(ruler);
 return {group,update:(point:THREE.Vector3,visible:boolean)=>{group.visible=visible;if(!visible)return;marker.position.copy(point);halo.position.copy(point);contrast.position.copy(point);if(runtime){runtime.renderer.getSize(size);runtime.camera.updateMatrixWorld();const depth=Math.max(.1,-point.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z),focal=Math.max(1,size.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2)))),scale=6*depth/focal/.105;marker.scale.setScalar(scale);halo.scale.setScalar(scale);contrast.scale.setScalar(scale);halo.quaternion.copy(runtime.camera.quaternion);contrast.quaternion.copy(runtime.camera.quaternion);}group.userData.guideAnchor=point.clone();const positions=ruler.geometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,point.x,0,point.z);positions.setXYZ(1,point.x,point.y,point.z);positions.needsUpdate=true;ruler.geometry.computeBoundingSphere();group.userData.height=point.y;}};
}
