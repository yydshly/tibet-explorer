import * as THREE from 'three';
import {label,line,mineralTexture,disposeTree} from './environment';
import {railwayEngineeringState} from '../data/railwayUnderstanding';
import type {TibetSceneProps} from './TibetScene';
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);

/** A qualitative cutaway and access chain, never an actual railway alignment. */
export function buildRailwayEngineeringScene(runtime:{renderer:{getSize:(v:THREE.Vector2)=>THREE.Vector2};camera:THREE.PerspectiveCamera}){
 const group=new THREE.Group(),texture=mineralTexture();texture.repeat.set(4,4);
 const soil=new THREE.MeshStandardMaterial({color:0x8f8065,map:texture,roughness:1}),rock=new THREE.MeshStandardMaterial({color:0xa9aa9b,map:texture,roughness:.95}),wood=new THREE.MeshStandardMaterial({color:0x65513e,roughness:.9}),metal=new THREE.MeshStandardMaterial({color:0x9cb0b2,metalness:.55,roughness:.45}),white=new THREE.MeshStandardMaterial({color:0xdfd7c4,roughness:.9}),blue=new THREE.MeshStandardMaterial({color:0x73bbcd,transparent:true,opacity:.88,roughness:.5}),gold=new THREE.MeshStandardMaterial({color:0xd4bb77,roughness:.6});
 const box=(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const subject=(id:string,position:THREE.Vector3,anchor:THREE.Vector3)=>{const g=new THREE.Group();g.userData.selectId=id;g.userData.guideId=id;g.userData.guideAnchor=anchor;g.position.copy(position);group.add(g);return g;};
 const ground=subject('rail-ground',V(0,0,0),V(-5,-.6,.5));
 box(ground,22,.35,14,0,-1.9,0,soil);
 const surface=new THREE.Shape();surface.moveTo(-11,-7);surface.lineTo(11,-7);surface.lineTo(11,7);surface.lineTo(-11,7);surface.closePath();
 const hole=new THREE.Path();hole.moveTo(-7,-1.2);hole.lineTo(-7,1.5);hole.lineTo(1,1.5);hole.lineTo(1,-1.2);hole.closePath();surface.holes.push(hole);
 const top=new THREE.Mesh(new THREE.ShapeGeometry(surface),soil);top.rotation.x=-Math.PI/2;top.position.y=-.03;ground.add(top);
 for(const z of [-5.5,5.5]){const mountain=new THREE.Mesh(new THREE.ConeGeometry(2.4,2.8,15),soil);mountain.scale.set(2,1,.65);mountain.position.set(z<0?-5:6,1.2,z);ground.add(mountain);}
 box(ground,8,.35,2.7,-3,-1.5,.15,rock);
 box(ground,8,.35,.7,-3,-.6,-.65,soil);box(ground,8,.16,2.7,-3,-.16,.15,soil);
 const risk=subject('rail-ice',V(-5,1.05,3.1),V(0,.2,0));const riskSoil=box(risk,2.2,.4,1.4,0,-.2,0,soil);const riskTop=box(risk,2.2,.2,1.4,0,.12,0,rock);box(risk,2.4,.15,1.6,0,-.95,0,wood);risk.name='rail-unmeasured-risk-sample';
 const riskIce=box(risk,1.5,.5,.9,.55,-.6,.65,blue);
 const frozen=subject('rail-ice',V(0,0,0),V(-3,-.9,.6));
 const ice=Array.from({length:10},(_,i)=>box(frozen,.48,.58,.5,-6.3+i*.7,-.95,.2+(i%2)*.55,blue));
 const blocks=subject('rail-rock',V(0,0,0),V(-2,.25,0));
 for(let i=0;i<12;i++)for(const z of [-.75,-.25,.25,.75]){const b=box(blocks,.46,.32,.36,-6.8+i*.62,.14,z,rock);b.rotation.y=(i%3-1)*.18;}
 box(blocks,8,.15,1.4,-3,.375,0,rock);
 const air=subject('rail-air',V(0,0,0),V(-1,.6,.6));
 const coldDots=Array.from({length:12},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.065,9,7),new THREE.MeshBasicMaterial({color:0x97e3e7}));air.add(m);return m;});
 const heatDots=Array.from({length:9},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.065,9,7),new THREE.MeshBasicMaterial({color:0xe9aa6a}));air.add(m);return m;});
 const rails=subject('rail-track',V(0,0,0),V(-2,.8,0));
 for(let i=0;i<40;i++)box(rails,.14,.1,1.2,-9+i*.47,.48,0,wood);
 for(const z of [-.4,.4])box(rails,18.8,.1,.07,.2,.58,z,metal);
 const station=subject('rail-operation',V(3.8,0,-2),V(0,1.2,0));box(station,3,.25,2.3,0,.1,0,rock);box(station,2.1,1.55,1.5,0,1,-.3,white);box(station,2.6,.18,2,0,1.88,-.3,wood);box(station,.5,.95,.07,0,.65,.48,wood);
 const train=new THREE.Group();rails.add(train);train.name='rail-teaching-vehicle';train.userData.guideId='rail-vehicle';train.userData.guideAnchor=V(0,.6,0);box(train,2.5,.7,.95,0,.55,0,white);box(train,2.25,.14,1.05,0,.98,0,gold);for(const x of [-.8,0,.8])for(const z of [-.49,.49])box(train,.44,.25,.03,x,.68,z,blue);train.position.y=.4;
 const access=subject('rail-lastmile',V(0,0,0),V(6,.5,3));
 const accessStart=V(4,.06,1),accessEnd=V(6.7,.06,4);
 const path=box(access,.7,.1,accessStart.distanceTo(accessEnd),0,.06,0,rock);path.rotation.y=Math.atan2(accessEnd.x-accessStart.x,accessEnd.z-accessStart.z);
 const destination=new THREE.Group();destination.position.set(7,0,4.7);access.add(destination);box(destination,1.8,1.3,1.5,0,.67,0,white);box(destination,2.1,.16,1.8,0,1.4,0,wood);box(destination,.45,.85,.04,0,.5,-.77,wood);
 const walker=new THREE.Group();access.add(walker);walker.userData.guideId='rail-walker';walker.userData.guideAnchor=V(0,.65,0);const body=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.6,10),gold);body.position.y=.65;walker.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),white);head.position.y=1.12;walker.add(head);for(const x of [-.09,.09])box(walker,.1,.35,.12,x,.2,0,wood);
 const captionDefs=[['rail-ground','剖开自然条件：地面与含冰地层',V(-4,-.5,.4)],['rail-rock','块石空隙：条件合适时参与散热',V(-2,.5,0)],['rail-ice','旁侧剖开样块：热扰动与承托风险',V(-4.45,.55,3.75)],['rail-operation','开通以后，还要有运营与停站',V(3.8,2,-2)],['rail-lastmile','从节点继续到生活地点',V(6,1.1,3.8)]] as const;
 const captions=captionDefs.map(([id,text,anchor],index)=>{const sprite=label(text,'#e6d7ac'),leader=line([anchor.clone(),anchor.clone()],0xa8c7c9,.6);sprite.onBeforeRender=()=>{};sprite.userData.screenAnnotation=true;sprite.userData.selectId=id;group.add(sprite,leader);return {id,index,sprite,leader,text,anchor};});
 const note=label('工程与到达链教学模型 · 无工点尺寸、沉降预测或当前班次','#bdd2d2');note.onBeforeRender=()=>{};group.add(note);const viewport=new THREE.Vector2();let disposed=false;
 return {group,update:(p:TibetSceneProps)=>{
  if(disposed)return;const state=railwayEngineeringState(p.progress,p.season);group.userData.railwayState=state;
  const thermal=state.exchange*(state.cold?0:1);riskTop.position.y=.12-thermal*.25;riskSoil.position.y=-.2-thermal*.25;riskIce.scale.y=1-thermal*.65;riskIce.position.y=-.85+.25*riskIce.scale.y;ice.forEach((m,i)=>m.scale.y=1-thermal*.13*(i%3)/2);
  risk.visible=state.stage>=1;blocks.visible=state.stage>=1;air.visible=state.stage===1;
  coldDots.forEach((m,i)=>{const t=(i/12+state.exchange*.9)%1;m.visible=state.cold;m.position.set(-6.4+t*7,.24+Math.sin(t*Math.PI)*.08,(i%3-1)*.48);});
  heatDots.forEach((m,i)=>{const t=(i/9+state.exchange*.7)%1;m.visible=!state.cold;m.position.set(-5+(i%3-1)*.5,1.5-t*1.4,3.1+(i%2)*.3);});
  station.visible=state.stage===2;train.visible=state.stage===2;train.position.x=-8+Math.min(1,state.operation/.55)*11;access.visible=state.stage===2;path.scale.z=Math.max(.001,state.operation);path.position.copy(accessStart).lerp(accessEnd,state.operation*.5);walker.position.copy(V(4,.1,1).lerp(V(6.7,.1,4),Math.max(0,(state.operation-.55)/.45)));
  frozen.visible=p.layer!=='transport'||state.stage<2;runtime.renderer.getSize(viewport);runtime.camera.updateMatrixWorld();const compact=viewport.y<520,focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),px=viewport.x<600?22:25,occupied:{x:number;y:number;w:number}[]=[];
  const priority=(id:string)=>p.guide?.active&&p.guide.targets.includes(id)?2:id===p.selected?1:0;let count=0;
  [...captions].sort((a,b)=>priority(b.id)-priority(a.id)).forEach(c=>{const i=c.index;c.sprite.visible=c.leader.visible=(!compact||count<3)&&(i===0||(i===1||i===2)&&state.stage>=1||i>=3&&state.stage===2);if(!c.sprite.visible)return;const projected=c.anchor.clone().project(runtime.camera);const w=Math.min(viewport.x-24,c.text.length*9+22),x=THREE.MathUtils.clamp((projected.x+1)*viewport.x/2,w/2+10,viewport.x-w/2-10),top=compact?80:112,bottom=Math.max(top+px,viewport.y-(compact?105:265));let y=THREE.MathUtils.clamp((1-projected.y)*viewport.y/2-25,top,bottom);
   let found=false;for(const candidate of [y,...Array.from({length:Math.max(1,Math.floor((bottom-top)/(px+8))+1)},(_,n)=>top+n*(px+8))])if(!occupied.some(o=>Math.abs(o.x-x)<(o.w+w)/2+8&&Math.abs(o.y-candidate)<px+7)){y=candidate;found=true;break;}if(!found){c.sprite.visible=c.leader.visible=false;return;}occupied.push({x,y,w});count++;const pos=V(x/viewport.x*2-1,1-y/viewport.y*2,projected.z).unproject(runtime.camera);c.sprite.position.copy(pos);const h=px*pos.distanceTo(runtime.camera.position)/focal;c.sprite.scale.set(h*w/px,h,1);const a=c.leader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,c.anchor.x,c.anchor.y,c.anchor.z);a.setXYZ(1,pos.x,pos.y,pos.z);a.needsUpdate=true;c.leader.geometry.computeBoundingSphere();
  });
  note.visible=!compact;const np=V(0,1-(viewport.y-285)/viewport.y*2,.5).unproject(runtime.camera);note.position.copy(np);const nh=18*np.distanceTo(runtime.camera.position)/focal;note.scale.set(nh*Math.min(viewport.x-24,470)/18,nh,1);
 },dispose:()=>{if(disposed)return;disposed=true;disposeTree(group);}};
}
