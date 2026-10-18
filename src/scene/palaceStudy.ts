import * as THREE from 'three';
import {disposeTree,label,line,mineralTexture} from './environment';
import {subjectCallouts} from './subjectCallouts';
import {palaceStudyStage} from '../data/palaceStudy';
import type {TibetSceneProps} from './TibetScene';
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Characteristic massing from heritage descriptions, deliberately without survey dimensions. */
export function palaceHillHeight(x:number,z:number){return .12+4.3*Math.exp(-((x/8.8)**2+(z/4.7)**2))+1.5*Math.exp(-(((x+3.2)/4.6)**2+((z+1.9)/3.4)**2));}
export function buildPalaceStudyScene(runtime:{renderer:{getSize:(v:THREE.Vector2)=>THREE.Vector2};camera:THREE.PerspectiveCamera}){
 const group=new THREE.Group();group.name='potala-source-based-characteristic-massing';group.userData.measuredReconstruction=false;
 const texture=mineralTexture();texture.repeat.set(3.8,3.8);
 const white=new THREE.MeshStandardMaterial({color:0xe4ddca,map:texture,bumpMap:texture,bumpScale:.018,roughness:.96});
 const red=new THREE.MeshStandardMaterial({color:0x843f30,map:texture,bumpMap:texture,bumpScale:.022,roughness:.94});
 const stone=new THREE.MeshStandardMaterial({color:0x9b8b71,map:texture,roughness:1}),earth=new THREE.MeshStandardMaterial({color:0x8c876b,map:texture,bumpMap:texture,bumpScale:.05,roughness:1});
 const timber=new THREE.MeshStandardMaterial({color:0x392e28,roughness:.89}),dark=new THREE.MeshStandardMaterial({color:0x13212a,roughness:.7}),gold=new THREE.MeshStandardMaterial({color:0xc5a663,metalness:.56,roughness:.45});
 const subject=(id:string,anchor:THREE.Vector3)=>{const object=new THREE.Group();object.userData.selectId=id;object.userData.guideId=id;object.userData.guideAnchor=anchor;group.add(object);return object;};
 const hill=subject('palace-hill',V(-5,3.2,2)),whitePalace=subject('palace-white',V(5,6.2,1.7)),redPalace=subject('palace-red',V(-1.8,8.4,-.5)),terrace=subject('palace-terrace',V(6,2.6,5.2)),history=subject('palace-history',V(1.2,6.5,1));
 const terrain=new THREE.PlaneGeometry(54,36,100,80);terrain.rotateX(-Math.PI/2);const positions=terrain.attributes.position;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),edge=THREE.MathUtils.smoothstep(Math.max(Math.abs(x)/20,Math.abs(z)/13),.5,1);positions.setY(i,palaceHillHeight(x,z)+(Math.sin(x*2.1)*Math.cos(z*1.6)*.10+Math.sin(x*.48+z*.63)*.15)*(1-edge));}terrain.computeVertexNormals();const hillMesh=new THREE.Mesh(terrain,earth);hillMesh.receiveShadow=true;hill.add(hillMesh);
 const boxes:THREE.Mesh[]=[];
 function block(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,taper=.94){
  const geometry=new THREE.BoxGeometry(w,h,d);const a=geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)>0){a.setX(i,a.getX(i)*taper);a.setZ(i,a.getZ(i)*taper);}geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);boxes.push(mesh);return mesh;
 }
 function windows(parent:THREE.Object3D,x:number,base:number,z:number,width:number,rows:number,columns:number){
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
   const px=x-width/2+(column+.5)*width/columns,py=base+row*.52;
   block(parent,.31,.36,.055,px,py,z,timber,1);block(parent,.19,.25,.065,px,py-.025,z+.016,dark,1);block(parent,.37,.065,.10,px,py+.21,z+.025,white,1);
  }
 }
 const whiteParts=[
  [5.5,4.8,4.2,4.0,4.4,.2], [3.6,3.8,3.3,8.2,3.25,1.0],
  [3.6,3.4,3.4,.3,4.4,1.3], [3.2,3.0,2.5,5.6,6.3,-.9],
  [4.6,1.25,3.2,4.1,7.4,-.4], [2.6,2.2,3.4,-5.8,3.9,.2],
 ];
 for(const [w,h,d,x,y,z] of whiteParts){block(whitePalace,w,h,d,x,y,z,white);block(whitePalace,w*1.01,.16,d*1.01,x,y+h/2-.08,z,timber,1);windows(whitePalace,x,y-h/2+.55,z+d/2+.035,w*.85,Math.max(2,Math.floor((h-.55)/.52)),Math.max(4,Math.floor(w/.6)));}
 const redParts=[ [5.2,4.7,4.2,-2.15,7.6,-.75], [2.6,3.0,3.5,-5.15,6.4,-1.0], [2.4,2.1,2.5,.6,7.7,-1.4] ];
 for(const [w,h,d,x,y,z] of redParts){block(redPalace,w,h,d,x,y,z,red);block(redPalace,w*1.02,.22,d*1.02,x,y+h/2-.04,z,timber,1);windows(redPalace,x,y-h/2+.75,z+d/2+.055,w*.78,Math.max(2,Math.floor((h-.7)/.64)),Math.max(4,Math.floor(w/.65)));}
 // Roof forms express a documented characteristic, not the number or arrangement of actual shrines.
 for(const [x,z,y,w] of [[-3.5,-.8,10.2,1.5],[-1.5,-.9,10.2,1.6],[.45,-1.5,8.95,1.25]] as const){
  block(redPalace,w,.22,1.55,x,y,z,gold,1);block(redPalace,w*.82,.3,1.3,x,y+.23,z,gold,.75);block(redPalace,w*.95,.13,1.45,x,y+.43,z,gold,1);
  const finial=new THREE.Mesh(new THREE.ConeGeometry(.11,.6,10),gold);finial.position.set(x,y+.79,z);redPalace.add(finial);
 }
 for(const [x,z,w] of [[5,4.1,10],[8,5.1,5],[-2,3.9,6],[-5.8,3.5,3]] as const){const y=palaceHillHeight(x,z);block(terrace,w,.48,1.45,x,y-.12,z,stone,1);block(terrace,w,.075,.12,x,y+.18,z+.64,white,1);}
 for(let i=0;i<22;i++){const t=i/21,x=9.7-Math.floor(i/8)*1.5+Math.sin(t*Math.PI*2)*1.1,z=9.3-t*4.5,y=palaceHillHeight(x,z);block(terrace,1.3,.16,.35,x,y+.03,z,stone,1);}
 // Trace the actual authored volumes rather than floating bounding boxes.
 const outlines:[THREE.LineSegments,number][]=[];
 [whitePalace,redPalace].forEach((parent,index)=>{for(const child of [...parent.children]){if(!(child instanceof THREE.Mesh))continue;const size=new THREE.Box3().setFromObject(child).getSize(V(0,0,0));if(size.x<1||size.y<1||size.z<1)continue;const edge=new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry),new THREE.LineBasicMaterial({color:index?0xe4bc78:0x85ced2,transparent:true,opacity:.55}));edge.position.copy(child.position);parent.add(edge);outlines.push([edge,index]);}});
 let stage=0,expanded=false,selection='';
 const callouts=subjectCallouts(group,[
  {id:'palace-hill',text:'红山：建筑依山组织',anchor:V(-6,3.2,2.8),show:()=>stage<2||selection==='palace-hill'},
  {id:'palace-white',text:'白宫 · 仪典、居住与接见',anchor:V(5.2,7.8,1.7),show:()=>stage===1||selection==='palace-white'},
  {id:'palace-red',text:'红宫 · 偏西、更高的分区',anchor:V(-2.1,10.6,-.5),show:()=>stage===1||selection==='palace-red'},
  {id:'palace-terrace',text:'台地与阶梯：回应高差',anchor:V(7,2.4,5.2),show:()=>stage===0},
  {id:'palace-history',text:'1645—1648 · 五世达赖喇嘛与白宫重建',anchor:V(5.2,6,2.5),show:()=>stage===2&&selection!=='palace-red'},
  {id:'palace-history',text:'1694 · 桑结嘉措组织红宫建设并完成',anchor:V(-2.2,8.8,1.5),show:()=>stage===2&&selection!=='palace-white'},
 ]);
 const note=label('布达拉宫特征体量与位置关系 · 非测绘、室内或历史施工复原','#d7daca');note.onBeforeRender=()=>{};group.add(note);const viewport=new THREE.Vector2();let disposed=false;
 return {group,update:(p:TibetSceneProps)=>{if(disposed)return;stage=palaceStudyStage(p.progress);selection=p.selected;expanded=p.cutaway;whitePalace.position.y=expanded?.65:0;redPalace.position.y=expanded?1.25:0;whitePalace.position.x=expanded?1:0;redPalace.position.x=expanded?-.6:0;
  outlines.forEach(([outline,index])=>{outline.visible=stage>=1&&(p.selected===(index?'palace-red':'palace-white')||p.selected==='palace-history');});
  runtime.renderer.getSize(viewport);const compact=viewport.y<480;
  callouts.entries[1].anchor.set(5.2+(expanded?1:0),7.8+(expanded?.65:0),1.7);callouts.entries[2].anchor.set(-2.1+(expanded?-.6:0),10.6+(expanded?1.25:0),-.5);callouts.update(runtime.camera,runtime.renderer,p.selected,compact?100:260);
  runtime.camera.updateMatrixWorld();const position=V(0,1-(viewport.y-(compact?83:235))/viewport.y*2,.5).unproject(runtime.camera),focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),height=17*position.distanceTo(runtime.camera.position)/focal;note.position.copy(position);note.scale.set(height*Math.min(viewport.x-25,560)/17,height,1);
  group.userData.stage=stage;group.userData.expanded=expanded;
 },dispose:()=>{if(disposed)return;disposed=true;disposeTree(group);}};
}
