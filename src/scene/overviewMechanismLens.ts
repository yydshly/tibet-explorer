import * as THREE from 'three';
import {buildManuscriptStudy} from './manuscriptStudy';
import {buildOperaPractice} from './operaPractice';
import {disposeTree,label} from './environment';
import {waterTransfer} from '../lib/overviewMechanisms';
import type {OverviewMechanismState} from '../data/overviewMechanisms';

/** A clearly separated functional lens over the persistent map, not a giant
 * installation placed at invented coordinates. It shares the narration clock. */
export function buildOverviewMechanismLens(){
 const world=new THREE.Scene();world.background=new THREE.Color(0x132c29);
 world.add(new THREE.HemisphereLight(0xfff7df,0x526b64,2.8));
 const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(3,8,7);world.add(sun);
 const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(8,8,12);camera.lookAt(0,1,0);
 const wood=new THREE.MeshStandardMaterial({color:0x94653c,roughness:.85});
 const paper=new THREE.MeshStandardMaterial({color:0xeee1be,roughness:.9});
 const manuscript=buildManuscriptStudy(wood,paper),practice=buildOperaPractice();world.add(manuscript.group,practice.group);
 const water=new THREE.Group();world.add(water);
 const stone=new THREE.MeshStandardMaterial({color:0x849990,transparent:true,opacity:.16,side:THREE.DoubleSide});
 const blue=new THREE.MeshStandardMaterial({color:0x24a6b9,emissive:0x145a64,emissiveIntensity:.35,roughness:.3});
 function box(parent:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
 for(const x of [-3.2,3.2]){
  box(water,2.4,.15,2.5,x,0,0,stone);
  for(const dx of [-1.18,1.18])box(water,.08,2.5,2.5,x+dx,1.25,0,stone);
  for(const z of [-1.2,1.2])box(water,2.4,2.5,.08,x,1.25,z,stone);
 }
 const source=box(water,2.2,1,2.2,-3.2,.5,0,blue),store=box(water,2.2,1,2.2,3.2,.5,0,blue);
 box(water,4,.1,.55,0,.12,0,stone);for(const z of [-.3,.3])box(water,4,.35,.08,0,.28,z,stone);
 const stream=box(water,4,.13,.45,0,.26,0,blue),gate=box(water,.16,.7,.66,-1.6,.5,0,wood);
 const parcel=box(water,.35,.18,.4,-1.8,.38,0,new THREE.MeshBasicMaterial({color:0xf5ce73}));
 const labels=[['水源端',-3.2],['储水端',3.2]] as const;
 for(const [text,x]of labels){const l=label(text);l.position.set(x,3,0);l.onBeforeRender=()=>{};l.scale.set(2,.55,1);water.add(l);}
 const bookCallouts=[['上护板','manuscript-upper-cover',2.5],['空白书页','manuscript-blank-leaf-6',-2.6],['下护板','manuscript-lower-cover',2.5]].map(([text,id,dx])=>{
  const anchor=manuscript.group.getObjectByName(String(id))!,sprite=label(String(text));
  const leader=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xdcd2a7,depthTest:false}));
  manuscript.group.add(sprite,leader);return {anchor,sprite,leader,dx:Number(dx),dy:id==='manuscript-upper-cover'?.5:id==='manuscript-lower-cover'?-.3:.16};
 });
 const viewport=new THREE.Vector4(),labelPosition=new THREE.Vector3();
 world.traverse(object=>{if(!(object instanceof THREE.Sprite))return;const texture=object.material.map;
  const canvas=texture?.image as HTMLCanvasElement|undefined;const ratio=canvas?canvas.width/canvas.height:4;
  object.onBeforeRender=(renderer,_scene,view)=>{renderer.getViewport(viewport);object.getWorldPosition(labelPosition);const focal=viewport.w/(2*Math.tan(THREE.MathUtils.degToRad((view as THREE.PerspectiveCamera).fov/2))),height=14*labelPosition.distanceTo(view.position)/Math.max(1,focal);object.scale.set(height*ratio,height,1);object.updateMatrixWorld();};
 });
 let state:OverviewMechanismState|undefined;
 return {
  update(next:OverviewMechanismState|undefined){state=next;if(!next)return;
   water.visible=next.kind==='water';manuscript.group.visible=next.kind==='manuscript';practice.group.visible=next.kind==='practice';
   manuscript.update(next.progress);practice.update(next.progress,'circle');
   for(const {anchor,sprite,leader,dx,dy}of bookCallouts){sprite.position.copy(anchor.position).add(new THREE.Vector3(dx,dy,0));const positions=leader.geometry.getAttribute('position') as THREE.BufferAttribute;positions.setXYZ(0,anchor.position.x,anchor.position.y,anchor.position.z);positions.setXYZ(1,sprite.position.x,sprite.position.y,sprite.position.z);positions.needsUpdate=true;leader.geometry.computeBoundingSphere();}
   const value=waterTransfer(next.progress,next.connected);
   source.scale.y=value.source*2.25;source.position.y=.13+source.scale.y/2;
   store.scale.y=Math.max(.015,value.stored*2.25);store.position.y=.13+store.scale.y/2;
   stream.visible=next.progress>0;stream.scale.x=Math.min(1,next.progress*5);stream.position.x=-2+2*stream.scale.x;
   gate.position.y=next.connected?1.15:.5;
   parcel.visible=value.flowing;parcel.position.x=-1.8+(next.progress*5%1)*3.6;
   world.userData.reading={kind:next.kind,...value,progress:next.progress};
  },
  render(renderer:THREE.WebGLRenderer){if(!state)return;
   const size=renderer.getSize(new THREE.Vector2()),w=Math.min(520,size.x-40),h=Math.min(295,size.y*.50),x=20,y=Math.max(122,(size.y-h)/2-25);
   if(w<160||h<100)return;
   const oldViewport=renderer.getViewport(new THREE.Vector4()),oldScissor=renderer.getScissor(new THREE.Vector4()),oldTest=renderer.getScissorTest(),auto=renderer.autoClear;
   camera.aspect=w/h;camera.position.set(state.kind==='practice'?9:5,state.kind==='practice'?10:5,state.kind==='practice'?13:8);camera.lookAt(0,1.5,0);camera.updateProjectionMatrix();
   try{renderer.autoClear=false;renderer.setScissorTest(true);renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.clear(true,true,true);renderer.render(world,camera);}
   finally{renderer.autoClear=auto;renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(oldTest);}
  },
  dispose(){disposeTree(world);},
 };
}
