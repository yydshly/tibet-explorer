import * as THREE from 'three';
import {label,line,mineralTexture} from './environment';
import type {TibetSceneProps} from './TibetScene';
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export function landformHeight(x:number,z:number,progress:number){
 const p=THREE.MathUtils.clamp(progress,0,1),ridge=1.7*Math.exp(-((x/7.5)**2))+.16*(7-z),channel=Math.exp(-(((x-.65*Math.sin(z*.35))/.85)**2));
 const incision=THREE.MathUtils.smoothstep(p,.05,.6)*.8*channel*Math.exp(-(((z-1)/7)**2)),deposit=THREE.MathUtils.smoothstep(p,.6,1)*.58*(1-channel)*Math.exp(-((x/2.5)**2+((z-4.3)/1.65)**2));
 return .28+ridge+.3*Math.sin(x*.55)**2-incision+deposit;
}
/** Reversible qualitative process, not a model of a measured Tibetan valley. */
export function buildLandformProcessScene(runtime:{renderer:{getSize:(v:THREE.Vector2)=>THREE.Vector2};camera:THREE.PerspectiveCamera}){
 const group=new THREE.Group();group.name='landform-material-process';
 const texture=mineralTexture();texture.repeat.set(5,5);
 const geometry=new THREE.PlaneGeometry(18,15,100,86);geometry.rotateX(-Math.PI/2);
 const ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xb3a17e,map:texture,bumpMap:texture,bumpScale:.035,roughness:1,side:THREE.DoubleSide}));ground.userData.selectId='landform-slope';ground.userData.guideAnchor=[-4,2,0];ground.receiveShadow=true;group.add(ground);
 const referenceGeometry=geometry.clone();const reference=new THREE.Mesh(referenceGeometry,new THREE.MeshBasicMaterial({color:0xb7d1cc,wireframe:true,transparent:true,opacity:.13,depthWrite:false}));reference.name='initial-landform-reference';group.add(reference);
 const bed=new THREE.Mesh(new THREE.BoxGeometry(18,.3,15),new THREE.MeshStandardMaterial({color:0x615a4d,roughness:1}));bed.position.y=-.05;group.add(bed);
 const pathGeometry=new THREE.BufferGeometry();pathGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(101*2*3),3));
 const waterIndices:number[]=[];for(let i=0;i<100;i++){const a=i*2;waterIndices.push(a,a+1,a+2,a+1,a+3,a+2);}pathGeometry.setIndex(waterIndices);
 const water=new THREE.Mesh(pathGeometry,new THREE.MeshBasicMaterial({color:0x46aaba,transparent:true,opacity:.88,side:THREE.DoubleSide}));water.userData.selectId='landform-channel';water.userData.guideAnchor=[0,1.3,0];group.add(water);
 const drops=Array.from({length:12},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:0xb2edf1}));group.add(m);return m;});
 const sediments=new THREE.Group();sediments.userData.selectId='landform-sediment';sediments.userData.guideAnchor=[0,1.5,1.3];group.add(sediments);
 const stones=Array.from({length:16},(_,i)=>{const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.12+i%3*.025,0),new THREE.MeshStandardMaterial({color:0x746247,roughness:1}));sediments.add(m);return m;});
 const fan=new THREE.Group();fan.userData.selectId='landform-deposit';fan.userData.guideAnchor=[0,1.7,4.3];group.add(fan);
 const materialMarks=Array.from({length:35},(_,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.07,7,5),new THREE.MeshStandardMaterial({color:0xc8b084,roughness:1}));const a=i*2.399,r=.35+Math.sqrt(i/35)*1.7;m.position.set(Math.cos(a)*r,0,4.3+Math.sin(a)*r*.6);fan.add(m);return m;});
 const captions=[['landform-slope','坡面汇水',V(-4,2.8,-2)],['landform-channel','河道下切',V(0,2.7,-1)],['landform-sediment','水与物质分开观察',V(.7,2.2,1.8)],['landform-deposit','低处堆积 · 不是实测地貌',V(0,2,4.7)]].map(([id,text,anchor])=>{const sprite=label(text as string,'#e8dab9');sprite.userData.selectId=id;sprite.onBeforeRender=()=>{};sprite.userData.screenAnnotation=true;const leader=line([anchor as THREE.Vector3,anchor as THREE.Vector3],0x8fc5c8,.6);group.add(sprite,leader);return {sprite,leader,anchor:anchor as THREE.Vector3,text:text as string};});
 const note=label('同一概念河谷 · 进度不对应真实年份与侵蚀深度','#aec7c9');group.add(note);
 const viewport=new THREE.Vector2();let previous=-1;
 return {group,update:(p:TibetSceneProps)=>{
  const progress=THREE.MathUtils.clamp(p.progress,0,1);group.userData.processProgress=progress;
  if(progress!==previous){previous=progress;const a=geometry.attributes.position,b=referenceGeometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);a.setY(i,landformHeight(x,z,progress));b.setY(i,landformHeight(x,z,0)+.035);}a.needsUpdate=b.needsUpdate=true;geometry.computeVertexNormals();referenceGeometry.computeBoundingSphere();geometry.computeBoundingSphere();
   const w=pathGeometry.attributes.position;for(let i=0;i<101;i++){const z=-7+i/100*14,x=.65*Math.sin(z*.35),h=landformHeight(x,z,progress)+.1,width=.15+progress*.07;w.setXYZ(i*2,x-width,h,z);w.setXYZ(i*2+1,x+width,h,z);}w.needsUpdate=true;pathGeometry.computeBoundingSphere();
  }
  water.visible=p.layer!=='terrain';sediments.visible=p.layer==='sediment'&&progress>.2;fan.visible=progress>.6;reference.visible=progress>.05;
  drops.forEach((m,i)=>{const fraction=(i/12+progress*.8)%1,z=-7+fraction*14,x=.65*Math.sin(z*.35);m.position.set(x,landformHeight(x,z,progress)+.14,z);m.visible=water.visible;});
  stones.forEach((m,i)=>{const fraction=THREE.MathUtils.clamp((progress-.2)*1.3+i/16*.16,0,1),z=-5.5+fraction*10,x=.65*Math.sin(z*.35)+(i%3-1)*.12;m.position.set(x,landformHeight(x,z,progress)+.15,z);m.rotation.set(i*.3+progress,i*.4,progress*.3);});
  materialMarks.forEach((m,i)=>{m.position.y=landformHeight(m.position.x,m.position.z,progress)+.08;m.visible=i<Math.floor(THREE.MathUtils.smoothstep(progress,.6,1)*35);});
  water.userData.guideAnchor=[0,landformHeight(0,0,progress)+.13,0];sediments.userData.guideAnchor=[.4,landformHeight(.4,1.3,progress)+.2,1.3];fan.userData.guideAnchor=[1.4,landformHeight(1.4,4.3,progress)+.15,4.3];
  
  ground.userData.guideAnchor=[-4,landformHeight(-4,0,progress)+.15,0];
  runtime.renderer.getSize(viewport);runtime.camera.updateMatrixWorld();
  const focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),pixelHeight=viewport.x<600?22:25;
  const mobile=viewport.x<600,occupied:{x:number;y:number;w:number}[]=[],top=mobile?83:110,bottom=Math.max(top+pixelHeight,viewport.y-(mobile?100:230));let count=0;
  const ordered=[...captions].sort((a,b)=>Number(!!p.guide?.active&&p.guide.targets.includes(b.sprite.userData.selectId))-Number(!!p.guide?.active&&p.guide.targets.includes(a.sprite.userData.selectId)));
  ordered.forEach(c=>{
   const id=c.sprite.userData.selectId,subject=id==='landform-channel'?water:id==='landform-sediment'?sediments:id==='landform-deposit'?fan:ground;
   c.sprite.visible=c.leader.visible=subject.visible&&count<(mobile?3:4);if(!c.sprite.visible)return;
   c.anchor.y=landformHeight(c.anchor.x,c.anchor.z,progress)+.25;
   const projected=c.anchor.clone().project(runtime.camera),ax=(projected.x+1)*viewport.x/2,ay=(1-projected.y)*viewport.y/2,w=Math.min(viewport.x-24,c.text.length*(viewport.x<600?10:11)+20),x=THREE.MathUtils.clamp(ax,w/2+10,viewport.x-w/2-10);
   let y=THREE.MathUtils.clamp(ay-30,top,bottom),found=false;
   for(const cy of [y,...Array.from({length:Math.max(1,Math.floor((bottom-top)/(pixelHeight+8))+1)},(_,j)=>top+j*(pixelHeight+8))])if(!occupied.some(b=>Math.abs(x-b.x)<(w+b.w)/2+5&&Math.abs(cy-b.y)<pixelHeight+7)){y=cy;found=true;break;}
   if(!found){c.sprite.visible=c.leader.visible=false;return;}occupied.push({x,y,w});count++;
   const position=V(x/viewport.x*2-1,1-y/viewport.y*2,projected.z).unproject(runtime.camera);c.sprite.position.copy(position);const h=pixelHeight*position.distanceTo(runtime.camera.position)/focal;c.sprite.scale.set(h*w/pixelHeight,h,1);
   const a=c.leader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,c.anchor.x,c.anchor.y,c.anchor.z);a.setXYZ(1,position.x,position.y,position.z);a.needsUpdate=true;c.leader.geometry.computeBoundingSphere();
  });

  note.visible=viewport.x>=600||viewport.y>=500;
  runtime.renderer.getSize(viewport);runtime.camera.updateMatrixWorld();const pt=V(0,1-(viewport.y-205)/viewport.y*2,.5).unproject(runtime.camera);note.position.copy(pt);
 }};
}
