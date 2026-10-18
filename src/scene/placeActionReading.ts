import * as THREE from 'three';
import type {LocalCollection,LocalCoordinate,LocalFeature} from './cityLocalMap';
import {localFeatureAnchor} from './cityLocalMap';
import type {PlaceActionState} from '../data/overviewPlaceActions';
/** Symbols describe documented uses. None of these positions are historical
 * candle locations, chamber surveys, relocation paths or visitor observations. */
export function createPlaceActionReading(data:LocalCollection,toWorld:(p:LocalCoordinate,offset?:number)=>THREE.Vector3,polygon:(f:LocalFeature,height:number)=>THREE.BufferGeometry){
 const group=new THREE.Group();group.name='documented-place-actions';group.visible=false;
 const find=(id:string)=>{const f=data.features.find(f=>f.id===id);if(!f)throw new Error(`Missing historical case locator ${id}`);return f;};
 const temple=find('relation/2358701'),front=find('way/177796787'),square=find('way/61818449');
 const templeAnchor=toWorld(localFeatureAnchor(temple),22),frontAnchor=toWorld(localFeatureAnchor(front),15);
 const lampGroup=new THREE.Group(),publicGroup=new THREE.Group();group.add(lampGroup,publicGroup);
 const lampMaterial=new THREE.MeshBasicMaterial({color:0xffc15e,depthTest:false});
 const lamps=Array.from({length:7},()=>{const m=new THREE.Mesh(new THREE.ConeGeometry(.7,2,8),lampMaterial);lampGroup.add(m);m.renderOrder=70;return m;});
 const outside=Array.from({length:6},()=>{const m=new THREE.Mesh(new THREE.ConeGeometry(.7,2,8),lampMaterial);lampGroup.add(m);m.renderOrder=70;return m;});

 const floor=new THREE.Mesh(polygon(square,0),new THREE.MeshBasicMaterial({color:0x26b4bd,transparent:true,opacity:.34,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));publicGroup.add(floor);floor.renderOrder=60;
 // Triangle centroids guarantee that all example activity remains on the
 // acquired surface, with no inferred old plots or streets between locations.
 const vertices=floor.geometry.getAttribute('position');const triangles:THREE.Vector3[][]=[];
 for(let i=0;i+2<vertices.count;i+=3){const tri=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(vertices,i+j));if(new THREE.Triangle(...tri as [THREE.Vector3,THREE.Vector3,THREE.Vector3]).getArea()>1e-10)triangles.push(tri);}
 const people=Array.from({length:12},(_,i)=>{const g=new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:i%2?0xffd885:0xeff9ef,depthTest:false});const body=new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,1.7,7),mat);body.position.y=1.1;const head=new THREE.Mesh(new THREE.SphereGeometry(.48,8,6),mat);head.position.y=2.35;g.add(body,head);g.traverse(o=>o.renderOrder=70);publicGroup.add(g);return g;});


 group.userData={kind:'source-backed-place-actions',featureIds:[temple.id,front.id,square.id],source:'https://whc.unesco.org/document/5816',scope:'现状地物定位；灯光、活动位置与大小仅为功能示意，不是历史测绘或人数'};
 return {group,update(state:PlaceActionState|undefined,scale:number){
 group.visible=Boolean(state);if(!state)return;
 lampGroup.visible=['lamps','separate'].includes(state.phase);publicGroup.visible=['square','public'].includes(state.phase);
 const separation=state.separation;
 lamps.forEach((m,i)=>{m.position.copy(templeAnchor);m.position.x+=(i-3)*scale*2.6;m.scale.setScalar(scale*(i===0?1:1-separation));});
 outside.forEach((m,i)=>{m.position.copy(frontAnchor);m.position.x+=(i-2.5)*scale*2.6;m.scale.setScalar(scale*separation);});

 people.forEach((p,i)=>{const tri=triangles[(i*7)%triangles.length];if(!tri)return;const move=i%2===0?.2+.55*state.progress:.45;const q=tri[0].clone().lerp(tri[1],move).lerp(tri[2],.3);p.position.copy(q);p.position.y+=scale;p.scale.setScalar(scale*state.activity);});

 group.userData.phase=state.phase;group.userData.separation=separation;group.userData.activity=state.activity;
 }};
}
