import * as THREE from 'three';
import {latLon,line,GOLD,TEAL} from './environment';
import {rotationSample,ROTATION_MODEL} from '../lib/rotationFlow';
import type {RotationFlowState} from '../data/rotationFlow';
import {overviewReturnCamera} from './overviewAtlasCamera';

export function rotationFlowCamera(state:RotationFlowState){
 const whole={position:latLon(26,70,14.5),target:new THREE.Vector3()};
 const target=latLon(30,72,1.8),close={position:target.clone().add(latLon(30,72,7)),target};
 const reading=overviewReturnCamera(whole,close,state.cameraMix);
 return overviewReturnCamera(reading,{position:latLon(25,88,13.2),target:new THREE.Vector3()},Math.min(1,state.arrivalProgress*2));
}

/** Tube segments follow equal MODEL TIME, not arc length, so the revealed
 * trail ends at the same moving parcel when eastward speed changes. */
export class RotationCurve extends THREE.Curve<THREE.Vector3>{
 constructor(readonly radius:number,readonly enabled:boolean,readonly direction:RotationFlowState['direction']){super();}
 getPoint(t:number,target=new THREE.Vector3()) {const s=rotationSample(t,this.enabled,this.direction);return target.copy(latLon(s.latitude,s.longitude,this.radius));}
 getPointAt(t:number,target=new THREE.Vector3()){return this.getPoint(t,target);}
 getTangentAt(t:number,target=new THREE.Vector3()){return this.getTangent(t,target);}
}

/** Lives on the existing textured Earth. Geometry is a declared idealized
 * angular-momentum experiment, not a route bringing a real parcel to Tibet. */
export function buildRotationFlow(radius:number){
 const group=new THREE.Group();group.userData.kind='rotation-flow-experiment';
 const circles=new THREE.Group(),motion=new THREE.Group(),pressure=new THREE.Group();group.add(circles,motion,pressure);
 const r=radius+.09,longitude=ROTATION_MODEL.longitude;
 const arc=(lat:number,from:number,to:number,alt=r)=>Array.from({length:121},(_,i)=>latLon(lat,from+(to-from)*i/120,alt));
 const surfaceHeads=[20,40].map((lat,index)=>{
  circles.add(line(arc(lat,-180,180),index?0xaebfdf:GOLD,.5));
  const track=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc(lat,longitude-45,longitude)),120,.025,6,false),new THREE.MeshBasicMaterial({color:index?0xaebfdf:GOLD}));circles.add(track);
  const head=new THREE.Mesh(new THREE.ConeGeometry(.08,.22,12),new THREE.MeshBasicMaterial({color:index?0xaebfdf:GOLD}));circles.add(head);
  return {lat,track,head};
 });
 const axis=line([new THREE.Vector3(0,-radius-.45,0),new THREE.Vector3(0,radius+.45,0)],0xdbe5e8,.45,true);circles.add(axis);
 const pressurePath=new THREE.CatmullRomCurve3(Array.from({length:51},(_,i)=>latLon(20+20*i/50,longitude,r)));
 const pressureTube=new THREE.Mesh(new THREE.TubeGeometry(pressurePath,100,.025,8,false),new THREE.MeshBasicMaterial({color:GOLD}));pressure.add(pressureTube);
 const pressureHead=new THREE.Mesh(new THREE.ConeGeometry(.09,.25,12),new THREE.MeshBasicMaterial({color:GOLD}));pressure.add(pressureHead);
 const labels=[
  {id:'rotation-high',text:'较高气压 · 教学设定',latitude:20,longitude,offset:[-90,24] as [number,number]},
  {id:'rotation-low',text:'较低气压 · 推动向北运动',latitude:40,longitude,offset:[85,-28] as [number,number]},
  {id:'rotation-lower',text:'20°N · 圈更大，向东更快',latitude:20,longitude,offset:[-105,34] as [number,number]},
  {id:'rotation-upper',text:'40°N · 同角度，路程更短',latitude:40,longitude,offset:[90,-34] as [number,number]},
  {id:'rotation-parcel',text:'空气 · 当前运动方向',latitude:20,longitude,offset:[90,-28] as [number,number]},
  {id:'rotation-reference',text:'虚线 · 去掉自转项的路径',latitude:30,longitude,offset:[-105,28] as [number,number]},
  {id:'rotation-difference',text:'同纬度 · 相对地面的偏移',latitude:30,longitude,offset:[75,32] as [number,number]},
 ];
 const paths=new Map<string,{tube:THREE.Mesh<THREE.TubeGeometry,THREE.MeshBasicMaterial>;reference:THREE.Line}>();
 for(const direction of ['north','south'] as const)for(const enabled of [false,true]){
  const curve=new RotationCurve(r+.04,enabled,direction),tube=new THREE.Mesh(new THREE.TubeGeometry(curve,180,.035,8,false),new THREE.MeshBasicMaterial({color:enabled?TEAL:GOLD}));
  const reference=line(Array.from({length:181},(_,i)=>{const s=rotationSample(i/180,false,direction);return latLon(s.latitude,s.longitude,r+.015);}),0xd7e0e8,.65,true);
  tube.userData.kind='rotation-time-trail';tube.userData.mode=`${direction}:${enabled}`;
  motion.add(tube,reference);paths.set(`${direction}:${enabled}`,{tube,reference});
 }
 const parcel=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),new THREE.MeshStandardMaterial({color:TEAL,emissive:TEAL,emissiveIntensity:.4}));parcel.userData.kind='rotation-parcel';motion.add(parcel);
 const velocity=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.4,TEAL,.13,.08);motion.add(velocity);
 const difference=line(arc(30,longitude,longitude),0xe7b4f1,1);motion.add(difference);
 const ground=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),new THREE.MeshBasicMaterial({color:0xd7e0e8}));motion.add(ground);
 let latest:RotationFlowState|undefined,lastKey='';
 const setLine=(object:THREE.Line,points:THREE.Vector3[])=>{const attr=object.geometry.attributes.position as THREE.BufferAttribute;points.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,p.z));attr.needsUpdate=true;object.geometry.computeBoundingSphere();};
 return {group,labels,
  anchor(id:string){
   if(!latest)return undefined;
   if(id==='rotation-parcel')return parcel.position;
   if(id==='rotation-reference')return ground.position;
   if(id==='rotation-difference'){const s=rotationSample(latest.progress,latest.enabled,latest.direction);return latLon(s.latitude,longitude+s.deltaLongitude/2,r+.06);}
   if(id==='rotation-lower'||id==='rotation-upper')return surfaceHeads[id==='rotation-lower'?0:1].head.position;
   return undefined;
  },
  update(state:RotationFlowState|undefined){
   latest=state;group.visible=!!state&&state.phase!=='arrival';if(!state||!group.visible)return;
   const key=JSON.stringify(state);if(lastKey===key)return;lastKey=key;
   circles.visible=state.phase==='latitude';pressure.visible=state.phase==='pressure';motion.visible=!circles.visible&&!pressure.visible;
   const t=state.progress;
   pressureTube.geometry.setDrawRange(0,Math.max(0,Math.floor(t*100))*8*6);
   pressureHead.position.copy(pressurePath.getPoint(t));pressureHead.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),pressurePath.getTangent(t));
   for(const {lat,track,head} of surfaceHeads){
    const lon=longitude-45+45*state.latitudeProgress;
    track.geometry.setDrawRange(0,Math.floor(state.latitudeProgress*120)*6*6);
    head.position.copy(latLon(lat,lon,r));head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),latLon(lat,lon+.1,r).sub(head.position).normalize());
   }
   const s=rotationSample(t,state.enabled,state.direction),before=rotationSample(Math.max(0,t-.001),state.enabled,state.direction),after=rotationSample(Math.min(1,t+.001),state.enabled,state.direction);
   parcel.position.copy(latLon(s.latitude,s.longitude,r+.04));parcel.material.color.set(state.enabled?TEAL:GOLD);
   ground.position.copy(latLon(s.latitude,longitude,r+.015));
   velocity.position.copy(parcel.position);velocity.setDirection(latLon(after.latitude,after.longitude,r+.04).sub(latLon(before.latitude,before.longitude,r+.04)).normalize());velocity.setColor(state.enabled?TEAL:GOLD);
   for(const [key,p] of paths){const active=key===`${state.direction}:${state.enabled}`;p.tube.visible=active;p.reference.visible=active;p.tube.geometry.setDrawRange(0,Math.floor(t*180)*8*6);}
   setLine(difference,arc(s.latitude,longitude,s.longitude,r+.06));difference.visible=state.enabled&&t>.02;
   group.userData.state={...state};group.userData.sample=s;group.userData.kind='rotation-flow-experiment';
  },
 };
}
