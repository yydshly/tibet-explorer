import {buildManuscriptStudy} from './manuscriptStudy';
import {buildOperaPractice} from './operaPractice';
import * as THREE from 'three';
import { disposeTree, label, landscapeHorizon, line, mineralTexture } from './environment';
import { culturalProcessState } from '../data/culturalUnderstanding';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: { getSize: (value: THREE.Vector2) => THREE.Vector2 }; camera: THREE.PerspectiveCamera };
const V = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);
const phase = (p:number,start:number,end:number) => THREE.MathUtils.smoothstep(p,start,end);

/** A detailed spatial explanation of a courtyard, not a reconstruction of a named monument. */
export function buildCourtyardScene(runtime?:Runtime){
  const group=new THREE.Group();group.add(landscapeHorizon());
  const texture=mineralTexture();texture.repeat.set(2.6,2);
  const white=new THREE.MeshStandardMaterial({color:0xe5dfcf,map:texture,bumpMap:texture,bumpScale:.025,roughness:.96});
  const stone=new THREE.MeshStandardMaterial({color:0x9b9c8e,map:texture,bumpMap:texture,bumpScale:.04,roughness:.97});
  const wood=new THREE.MeshStandardMaterial({color:0x4a3021,map:texture,bumpMap:texture,bumpScale:.02,roughness:.8});
  const red=new THREE.MeshStandardMaterial({color:0x8f4535,map:texture,bumpMap:texture,bumpScale:.023,roughness:.92});
  const dark=new THREE.MeshStandardMaterial({color:0x17252a,roughness:.68});
  const ochre=new THREE.MeshStandardMaterial({color:0xb2934e,roughness:.82});
  const teal=new THREE.MeshStandardMaterial({color:0x456b69,roughness:.9});
  const box=(w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=group)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const groundGeometry=new THREE.PlaneGeometry(140,140,80,80);groundGeometry.rotateX(-Math.PI/2);
  const groundPosition=groundGeometry.attributes.position;
  for(let i=0;i<groundPosition.count;i++){const x=groundPosition.getX(i),z=groundPosition.getZ(i),edge=THREE.MathUtils.smoothstep(Math.max(Math.abs(x),Math.abs(z)),7,18);groundPosition.setY(i,-.2+edge*(Math.sin(x*.21)*Math.sin(z*.17)*.35));}
  groundGeometry.computeVertexNormals();
  const ground=new THREE.Mesh(groundGeometry,new THREE.MeshStandardMaterial({color:0x777e68,map:texture,bumpMap:texture,bumpScale:.045,roughness:1}));ground.receiveShadow=true;group.add(ground);
  const foundation=new THREE.Group();foundation.name='culture-foundation';foundation.userData.selectId='culture-base';foundation.userData.guideAnchor=V(0,.2,2.5);group.add(foundation);
  box(11.5,.3,10,stone,0,-.05,0,foundation);
  for(let x=-3;x<=3;x++)for(let z=5;z<12;z++)box(.94,.035,.94,stone,x,.005,z,foundation);
  const courtyard=new THREE.Group();courtyard.userData.selectId='courtyard';courtyard.userData.guideAnchor=V(0,.25,.9);group.add(courtyard);
  for(let x=-5;x<5;x++)for(let z=-4;z<4;z++){
    const tileMat=new THREE.MeshStandardMaterial({color:new THREE.Color(0xa5a797).multiplyScalar(.85+((x*11+z*7+52)%9)*.025),map:texture,roughness:1});
    box(.965,.07,.965,tileMat,x+.5,.15,z+.5,courtyard);
  }
  const hall=new THREE.Group();hall.name='culture-hall';hall.userData.selectId='hall';hall.userData.guideAnchor=V(0,1.6,-2.65);group.add(hall);
  const sides=new THREE.Group();sides.name='culture-walls';sides.userData.selectId='materials';group.add(sides);
  const front=new THREE.Group();group.add(front);
  // Tapered plaster walls and repeated timber openings establish rooms rather than solid cubes.
  box(10,2.35,2,white,0,1.35,-3.7,hall);
  box(10.1,.42,2.12,red,0,2.73,-3.7,hall);
  [-4.5,4.5].forEach(x=>{box(1.5,2.3,6.3,white,x,1.32,.25,sides);box(1.55,.4,6.4,red,x,2.67,.25,sides);});
  // Keep a real opening in the generic front wall so users enter through a gap.
  [-2.98,2.98].forEach(x=>{box(4.04,1.85,.8,white,x,1.1,3.75,front);box(4.08,.4,.92,red,x,2.22,3.75,front);});
  box(2.1,.28,.92,wood,0,2.2,3.75,front);
  const timber=new THREE.Group();timber.name='culture-timber';timber.userData.selectId='materials';timber.userData.guideAnchor=V(-2.2,2,-2.35);group.add(timber);
  const rooves=new THREE.Group();rooves.name='culture-roofs';group.add(rooves);
  const trim=(w:number,x:number,z:number,y:number,parent:THREE.Object3D)=>{
    box(w,.16,.45,wood,x,y,z,parent);box(w+.13,.08,.52,ochre,x,y-.13,z,parent);box(w+.18,.055,.56,teal,x,y-.2,z,parent);
    for(let i=0;i<Math.floor(w/.28);i++)box(.09,.16,.62,wood,x-w/2+.14+i*.28,y-.14,z,parent);
  };
  trim(10.55,0,-2.65,2.91,timber);
  [-4,4].forEach(x=>{const beams=new THREE.Group();beams.position.set(x,0,.2);beams.rotation.y=Math.PI/2;trim(6.5,0,0,2.86,beams);timber.add(beams);});
  box(10.55,.15,2.75,wood,0,3.05,-3.5,rooves);
  [-4.5,4.5].forEach(x=>box(2.15,.14,6.8,wood,x,2.98,.2,rooves));
  for(let x=-3.7;x<=3.7;x+=1.48){
    box(.18,2.25,.18,wood,x,1.32,-2.37,timber);box(.42,.22,.38,wood,x,2.39,-2.37,timber);
    box(.24,.18,.25,ochre,x,2.15,-2.37,timber);box(.26,.18,.26,stone,x,.3,-2.37,timber);
    box(1.35,.1,1.15,wood,x,2.75,-2.05,timber);
  }
  [-3.6,3.6].forEach(x=>{for(let z=-.8;z<=2.7;z+=1.2){box(.18,2.2,.18,wood,x,1.29,z,timber);box(.42,.18,.4,wood,x,2.4,z,timber);box(.27,.2,.27,stone,x,.3,z,timber);}});
  const window=(x:number,y:number,z:number,parent:THREE.Object3D,angle=0)=>{
    const frame=new THREE.Group();frame.position.set(x,y,z);frame.rotation.y=angle;parent.add(frame);
    box(.72,1.03,.12,wood,0,0,0,frame);box(.5,.79,.13,dark,0,0,.025,frame);
    [-.16,0,.16].forEach(dx=>box(.035,.78,.17,ochre,dx,0,.075,frame));[-.22,0,.22].forEach(dy=>box(.5,.035,.17,wood,0,dy,.075,frame));
    box(.97,.16,.22,wood,0,.56,.06,frame);box(.85,.075,.24,ochre,0,-.55,.07,frame);
    trim(.95,0,.03,.74,frame);
  };
  [-3.9,-2.6,2.6,3.9].forEach(x=>window(x,1.42,-2.67,hall));
  [-4.5,4.5].forEach(x=>[-1.6,.4,2.1].forEach(z=>window(x+(x<0?.76:-.76),1.42,z,sides,x<0?Math.PI/2:-Math.PI/2)));
  // Entrance portal, lintels and tiered timber roof.
  box(1.6,1.96,.22,wood,0,1.25,-2.64,hall);box(1.28,1.74,.24,dark,0,1.17,-2.6,hall);
  [-.45,0,.45].forEach(x=>box(.035,1.67,.29,ochre,x,1.17,-2.56,hall));
  trim(2.25,0,-2.47,2.4,hall);
  for(let i=0;i<4;i++)box(2.55+i*.22,.1,1.2-i*.15,stone,0,.23+i*.1,-2.13+i*.15,hall);
  const upper=new THREE.Group();hall.add(upper);
  box(4.8,1.45,2.7,red,0,3.82,-3.75,upper);
  [-1.35,0,1.35].forEach(x=>window(x,3.86,-2.37,upper));
  trim(5.05,0,-2.2,4.65,upper);
  box(5.2,.13,3.2,wood,0,4.8,-3.7,upper);
  // Roof edging and small finials, rather than a gold slab.
  [-2.45,2.45].forEach(x=>[-5,-2.35].forEach(z=>{const cap=new THREE.Mesh(new THREE.CylinderGeometry(.095,.15,.4,10),ochre);cap.position.set(x,5.03,z);upper.add(cap);const orb=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),ochre);orb.position.set(x,5.28,z);upper.add(orb);}));
  for(let i=0;i<24;i++)box(.07,.12,.16,wood,-2.42+i*.21,4.66,-2.18,upper);
  // Wall buttresses, banding and stone joints support closer inspection.
  [-4.95,-2.45,2.45,4.95].forEach(x=>box(.18,2.36,.16,stone,x,1.35,-2.65,hall));
  for(let i=0;i<5;i++)box(10,.018,.025,stone,0,.38+i*.42,-2.68,hall);
  // A few neighbouring vernacular volumes situate the explanation in a place; this is not a surveyed street.
  const surroundings=new THREE.Group();surroundings.name='culture-neighbouring-context';group.add(surroundings);
  [[-9,-6,.76],[8.8,-8,.72],[-8.5,4,.57]].forEach(([x,z,s])=>{
    const neighbour=new THREE.Group();neighbour.position.set(x,-.17,z);neighbour.scale.setScalar(s);surroundings.add(neighbour);
    box(4,2.45,3.7,white,0,1.22,0,neighbour);box(4.12,.32,3.85,red,0,2.58,0,neighbour);box(4.3,.1,4.05,wood,0,2.8,0,neighbour);
    [-1.1,1.1].forEach(dx=>window(dx,1.65,1.87,neighbour));box(.8,1.6,.12,wood,0,.9,1.9,neighbour);
  });
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.23,.27,.48,16),wood);barrel.position.set(2.4,.5,1.5);courtyard.add(barrel);
  const bench=box(1.55,.13,.43,wood,-2.8,.56,-1.3,courtyard);[-3.35,-2.25].forEach(x=>box(.11,.3,.32,wood,x,.36,-1.3,courtyard));bench.userData.selectId='courtyard';
  const textObject=new THREE.Group();textObject.name='culture-workspace';textObject.userData.selectId='culture-text';textObject.userData.guideAnchor=V(0,1,0);textObject.position.set(.4,0,.4);group.add(textObject);
  const parchment=new THREE.MeshStandardMaterial({color:0xdacba7,map:texture,roughness:.98});
  box(2.1,.15,1.2,wood,0,.75,0,textObject);[-.75,.75].forEach(x=>box(.13,.55,.7,wood,x,.41,0,textObject));
  const incoming=new THREE.Group();incoming.name='culture-incoming-carrier';incoming.userData.selectId='culture-text';incoming.userData.guideId='culture-incoming';incoming.userData.guideAnchor=V(0,.18,0);textObject.add(incoming);
  for(let i=0;i<6;i++)box(.87,.018,.65,parchment,0,i*.022,0,incoming);
  box(.97,.045,.7,wood,0,-.03,0,incoming);
  const comparedPages=new THREE.Group();comparedPages.name='culture-compared-pages';comparedPages.userData.selectId='culture-learning';textObject.add(comparedPages);
  [-.48,.48].forEach(x=>box(.75,.018,.7,parchment,x,.87,.04,comparedPages));
  // Blank faces deliberately carry no fabricated script, quotations or sacred motifs.
  const stylus=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.48,8),ochre);stylus.name='culture-writing-tool';stylus.rotation.z=.7;comparedPages.add(stylus);
  const useCarrier=new THREE.Group();useCarrier.name='culture-practice-carrier';useCarrier.userData.selectId='culture-text';useCarrier.userData.guideId='culture-carrier';useCarrier.userData.guideAnchor=V(0,1.03,0);group.add(useCarrier);
  for(let i=0;i<4;i++)box(.65,.025,.45,parchment,0,.95+i*.025,0,useCarrier);
  const person=(parent:THREE.Object3D,name:string,color:THREE.Material)=>{
    const body=new THREE.Group();body.name=name;parent.add(body);
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,.55,12),color);torso.position.y=.57;body.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.14,14,10),stone);head.position.y=.99;body.add(head);
    [-.08,.08].forEach(x=>box(.09,.3,.11,dark,x,.2,0,body));
    const hands=new THREE.Group();body.add(hands);[-.2,.2].forEach(x=>box(.065,.36,.065,color,x,.62,.1,hands));
    return body;
  };
  const learners=new THREE.Group();learners.name='culture-learning-work';learners.userData.selectId='culture-learning';learners.userData.guideAnchor=V(.4,1,.4);group.add(learners);
  const teacher=person(learners,'culture-teacher',teal),learner=person(learners,'culture-learner',red);
  const manuscript=buildManuscriptStudy(wood,parchment),craftObject=manuscript.group;group.add(craftObject);
  const opera=buildOperaPractice();group.add(opera.group);

  const uses=new THREE.Group();uses.name='culture-daily-use';uses.userData.selectId='culture-use';uses.userData.guideAnchor=V(.6,1,.6);group.add(uses);
  const visitor=person(uses,'culture-entering-user',teal),colleague=person(uses,'culture-collaborating-user',red);

  type Callout={steps:number[];id:string;text:string;anchor:()=>THREE.Vector3;show:(stage:number)=>boolean;sprite:THREE.Sprite;leader:THREE.Line};
  const callouts:Callout[]=[];
  const callout=(steps:number[],id:string,text:string,anchor:()=>THREE.Vector3,show:(stage:number)=>boolean=()=>true)=>{
    const sprite=label(text,'#ecdcae',2.8),leader=line([V(0,0,0),V(0,0,0)],0xc6d5c7,.65);sprite.userData.selectId=id;sprite.userData.screenAnnotation=true;sprite.onBeforeRender=()=>{};sprite.renderOrder=16;(leader.material as THREE.LineBasicMaterial).depthTest=false;leader.renderOrder=15;group.add(sprite,leader);callouts.push({steps,id,text,anchor,show,sprite,leader});
  };
  callout([0],'culture-base','基底与围合',()=>V(1.8,.3,2.65));
  callout([0],'materials','柱 → 梁 → 覆盖',()=>V(-2.2,2.8,-2.2),stage=>stage>=1);
  callout([0],'culture-use','通行与停留',()=>visitor.position.clone().add(V(0,1.1,0)),stage=>stage===2);
  callout([1],'culture-text','空白载体 · 不仿造原文',()=>incoming.getWorldPosition(V(0,0,0)).add(V(0,.2,0)),stage=>stage<2);
  callout([1],'culture-learning','对照、译写与地方学习',()=>V(.4,1.15,.4),stage=>stage>=1);
  callout([1],'hall','知识进入空间使用',()=>V(0,1.5,-2.5),stage=>stage===2);
  callout([1],'culture-carrier','整理后的载体 · 带入使用',()=>useCarrier.position.clone().add(V(0,1.03,0)),stage=>stage===2);
  callout([2],'culture-craft','木护板与空白书页 · 关系示意',()=>V(-.8,1.6,.8));
  callout([2],'culture-craft','整理书页，再合拢护板',()=>V(-.8,2.6,.8),stage=>stage>=1);
  callout([3],'opera-performance','金色：讲述 · 青色：表演与示范',()=>opera.group.getObjectByName('opera-narrator')!.getWorldPosition(V(0,0,0)).add(V(0,.9,0)));
  callout([3],'opera-learning','珊瑚色：学习者 · 从观看到参与',()=>opera.group.getObjectByName('opera-learner')!.getWorldPosition(V(0,0,0)).add(V(0,.9,0)));
  const note=label('通用过程模型 · 无寺院、原作或民俗复原','#bfcfc3',5.8);note.name='culture-source-note';note.onBeforeRender=()=>{};group.add(note);
  const viewport=new THREE.Vector2(),projected=new THREE.Vector3(),screen=new THREE.Vector3();let disposed=false;
  return {group,update:(p:TibetSceneProps,_time=0,_dt=0)=>{
    if(disposed)return;
    const state=culturalProcessState(p.step,p.progress),step=state.step,progress=state.progress,stage=state.stage;
    group.userData.culturalState=state;
    surroundings.visible=step<2&&(step!==0||stage===2);
    const cut=p.cutaway||p.layer==='section'||step===1||step===2;
    const wall=step===0?state.wallCompletion:1,frame=step===0?state.frameCompletion:1,roof=step===0?state.roofCompletion:1;
    hall.visible=sides.visible=wall>.001;hall.scale.y=sides.scale.y=Math.max(.001,wall);
    front.visible=!cut&&wall>.001;front.scale.y=Math.max(.001,wall);
    timber.visible=frame>.001;timber.scale.y=Math.max(.001,frame);
    rooves.visible=!cut&&roof>.001;rooves.position.y=(1-roof)*1.8;
    upper.visible=step!==0||progress>=.52;upper.scale.y=step===0?Math.max(.001,phase(progress,.52,.68)):1;
    sides.children.forEach(object=>{object.visible=!cut||object.position.x>=0;});
    if(step>=2){hall.visible=sides.visible=front.visible=timber.visible=rooves.visible=upper.visible=courtyard.visible=false;}else courtyard.visible=true;
    foundation.visible=step!==3;
    opera.group.visible=step===3;opera.update(progress,p.layer==='opera-stage'?'stage':'circle');
    // Screen-space callouts below share the same collision layout as other culture topics.
    opera.group.traverse(object=>{if(object instanceof THREE.Sprite)object.visible=false;});
    textObject.visible=step===1;comparedPages.visible=step===1&&stage>=1;learners.visible=step===1&&stage>=1;useCarrier.visible=step===1&&stage===2;
    incoming.position.copy(V(0,.93,3.8).lerp(V(-.47,.93,0),state.incomingText));incoming.visible=step===1&&stage<2;
    stylus.position.set(-.2+Math.sin(state.localLearning*Math.PI*2)*.22,1.13,.14+state.localLearning*.18);
    teacher.position.copy(V(-1.1,0,.3).lerp(V(-.8,0,-2.15),state.practice));teacher.rotation.y=step===1&&stage===2?Math.PI:0;
    learner.position.copy(V(.65,0,1.45).lerp(V(.45,0,-2.05),state.practice));learner.rotation.y=step===1&&stage===2?Math.PI:0;
    learners.userData.guideAnchor.copy(learner.position).add(V(0,.95,0));
    useCarrier.position.copy(V(.4,0,.4).lerp(V(.1,0,-2.35),state.practice));
    craftObject.visible=step===2;
    manuscript.update(progress);
    uses.visible=step===0&&stage===2;
    const walking=state.practice;
    visitor.position.copy(V(0,0,5.6).lerp(step===0?V(0,0,-1.9):V(.75,0,.8),walking));
    colleague.position.copy(V(-2.8,0,-1.3).lerp(V(2.2,0,.6),step===3?state.cooperation:state.practice));
    visitor.rotation.y=stage>=1&&step===3?Math.PI/2:Math.PI;colleague.rotation.y=-Math.PI/2;
    bench.visible=step!==3;
    wood.emissive.set(p.selected==='materials'||p.selected==='culture-craft'?0x21160d:0);red.emissive.set(p.selected==='hall'||p.selected==='culture-learning'?0x190a05:0);
    if(!runtime){callouts.forEach(item=>{item.sprite.visible=item.leader.visible=false;});note.visible=false;return;}
    group.updateWorldMatrix(true,true);runtime.renderer.getSize(viewport);runtime.camera.updateMatrixWorld();if(viewport.x<2||viewport.y<2)return;
    const mobile=viewport.x<600,compact=viewport.y<480,pixelHeight=mobile?21:25,focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),top=compact?83:Math.min(110,viewport.y*.21),bottom=Math.max(top+pixelHeight,viewport.y-(compact?100:290)),noteY=compact?viewport.y-83:Math.max(35,viewport.y-285),noteWidth=Math.min(viewport.x-24,360),occupied:{x:number;y:number;w:number}[]=[84,125,166].map(y=>({x:viewport.x-35,y,w:58}));
    occupied.push({x:viewport.x/2,y:noteY,w:noteWidth});
    const activeTargets=p.guide?.active?new Set(p.guide.targets):undefined,relevant=(item:Callout)=>!!activeTargets?.has(item.id)||item.id==='culture-craft'&&!![...(activeTargets??[])].some(id=>id.startsWith('manuscript-'))||item.id==='culture-text'&&!!activeTargets?.has('culture-incoming');let displayed=0;
    for(const item of [...callouts].sort((a,b)=>Number(relevant(b))-Number(relevant(a)))){
      item.sprite.position.set(0,0,0);item.sprite.scale.set(1,1,1);
      const resetPositions=item.leader.geometry.attributes.position as THREE.BufferAttribute;resetPositions.array.fill(0);resetPositions.needsUpdate=true;
      item.sprite.visible=item.leader.visible=item.steps.includes(step)&&item.show(stage);if(!item.sprite.visible)continue;
      if(compact&&displayed>=3||activeTargets&&!relevant(item)&&displayed>=2){item.sprite.visible=item.leader.visible=false;continue;}
      const anchor=item.anchor();projected.copy(anchor).project(runtime.camera);if(projected.z< -1||projected.z>1||Math.abs(projected.x)>1.05||Math.abs(projected.y)>1.05){item.sprite.visible=item.leader.visible=false;continue;}
      const width=Math.min(viewport.x-28,item.text.length*(mobile?10:11)+24),ax=(projected.x+1)*viewport.x/2,ay=(1-projected.y)*viewport.y/2;
      const x=THREE.MathUtils.clamp(ax,width/2+12,viewport.x-width/2-12);let y=THREE.MathUtils.clamp(ay-22,top,bottom),found=false;
      for(const candidate of [y,...Array.from({length:Math.max(1,Math.floor((bottom-top)/(pixelHeight+8))+1)},(_,i)=>top+i*(pixelHeight+8))])if(!occupied.some(box=>Math.abs(x-box.x)<(width+box.w)/2+6&&Math.abs(candidate-box.y)<pixelHeight+7)){y=candidate;found=true;break;}
      if(!found){item.sprite.visible=item.leader.visible=false;continue;}occupied.push({x,y,w:width});displayed++;
      screen.set(x/viewport.x*2-1,1-y/viewport.y*2,projected.z).unproject(runtime.camera);item.sprite.position.copy(screen);const h=pixelHeight*screen.distanceTo(runtime.camera.position)/focal;item.sprite.scale.set(h*width/pixelHeight,h,1);
      const positions=item.leader.geometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,anchor.x,anchor.y,anchor.z);positions.setXYZ(1,screen.x,screen.y,screen.z);positions.needsUpdate=true;item.leader.geometry.computeBoundingSphere();
    }
    note.visible=step!==3;screen.set(0,1-noteY/viewport.y*2,.55).unproject(runtime.camera);note.position.copy(screen);const h=20*screen.distanceTo(runtime.camera.position)/focal;note.scale.set(h*noteWidth/20,h,1);
  },dispose:()=>{if(disposed)return;disposed=true;disposeTree(group);}};
}
