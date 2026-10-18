import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import * as THREE from 'three';
import {label,line} from './environment';
import {verifiedPlaceReferences} from '../data/placeProvenance';
import runoff from '../data/runoff-reading.json';
import type {FocusedProcessState} from '../lib/overviewFocusedProcesses';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const phase=(p:number,a:number,b:number)=>clamp((p-a)/(b-a));
/** Three bounded readings attached to the existing atlas; no independent scene,
 * wall clock, fabricated historic route, fence coordinate or weather forecast. */
export function buildOverviewFocusedReading(camera:THREE.PerspectiveCamera,at:(lon:number,lat:number,offset?:number)=>THREE.Vector3){
 const group=new THREE.Group();group.name='focused-processes';group.visible=false;
 const exchange=new THREE.Group(),steward=new THREE.Group(),water=new THREE.Group();group.add(exchange,steward,water);
 const material=(color:number)=>new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,toneMapped:false});
 const box=(parent:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.renderOrder=45;parent.add(m);return m;};
 const tag=(parent:THREE.Group,text:string,x:number,y:number,z:number,width:number)=>{const s=label(text,'#e8f8f8');s.onBeforeRender=()=>{};s.position.set(x,y,z);s.scale.set(width,.25,1);s.renderOrder=49;parent.add(s);return s;};
 const question=Array.from({length:3},(_,i)=>box(exchange,-1.6,.06+i*.035,.3-i*.24,.53,.025,.28,0x94e5ee));
 const source=box(exchange,0,.08,0,.85,.035,1.05,0xf0ddac),translated=box(exchange,1.55,.08,0,.85,.035,1.05,0x91e3de);
 const rows=Array.from({length:8},(_,i)=>box(exchange,0,.11,-.4+i*.11,.62,.009,.025,0x624b36));
 const translatedRows=Array.from({length:8},(_,i)=>box(exchange,1.55,.11,-.4+i*.11,.62,.009,.025,0x145957));
 rows.forEach(m=>m.renderOrder=46);translatedRows.forEach(m=>m.renderOrder=46);
 const nib=box(exchange,0,.22,-.4,.025,.22,.025,0xffd275);nib.rotation.z=-.4;
 tag(exchange,'降曲沃 · 提出问题',-1.55,.2,.9,1.65);tag(exchange,'阿底峡 · 撰写',0,.2,.9,1.4);tag(exchange,'格韦洛追 · 共同翻译',1.55,.2,.9,1.85);
 tag(exchange,'托林交流 · 活动放大示意',0,.2,-1.1,2.7);
 const transfer=box(exchange,0,.22,0,.4,.025,.5,0xffd275);
 const posts=Array.from({length:9},(_,i)=>box(steward,0,.22,-1.2+i*.3,.035,.44,.035,0xc8d5d3));
 const fence=new THREE.Group();steward.add(fence);
 const rails=Array.from({length:4},(_,i)=>box(fence,0,.09+i*.09,0,.025,.015,2.4,0xc8d5d3));
 // Split fixed side rails and movable central panels. Only the obstruction
 // opens; terrain and habitat colour never magically change after removal.
 rails.forEach(m=>{m.scale.z=.25;m.position.z=-.9;const right=m.clone();right.position.z=.9;fence.add(right);});
 const gate=new THREE.Group();steward.add(gate);
 for(let i=0;i<4;i++)box(gate,0,.09+i*.09,0,.03,.015,1.2,0xffc779);
 const animals=Array.from({length:6},(_,i)=>{const g=new THREE.Group();steward.add(g);const body=new THREE.Mesh(new THREE.SphereGeometry(.065,10,6),material(0xffdda0));body.scale.set(1.6,1,1);body.renderOrder=46;g.add(body);box(g,.08,.06,0,.045,.1,.035,0xffdda0);return g;});
 const patrol=new THREE.Mesh(new THREE.RingGeometry(.12,.16,28),material(0x7ce5ee));patrol.rotation.x=-Math.PI/2;patrol.renderOrder=48;steward.add(patrol);
 tag(steward,'巡护监测 → 识别阻隔 → 拆除',0,.2,-1.6,3.2);
 tag(steward,'阿里材料 · 围栏/动物位置为示意',0,.2,1.65,3.6);
 tag(steward,'同一侧',-1.35,.15,.95,1);tag(steward,'另一侧活动空间',1.25,.15,.95,1.65);
 const leader=line([new THREE.Vector3(),new THREE.Vector3()],0xffd275);(leader.material as THREE.LineBasicMaterial).depthTest=false;leader.renderOrder=43;group.add(leader);
 const waterLines=runoff.paths.map(path=>{const geometry=new LineGeometry();geometry.setPositions(Array(path.coordinates.length*3).fill(0));const l=new Line2(geometry,new LineMaterial({color:0x69dcec,linewidth:2.3,transparent:true,opacity:.9,depthTest:false,depthWrite:false}));l.renderOrder=40;l.frustumCulled=false;water.add(l);return l;});
 const drops=runoff.paths.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material(0x89e7ff));m.renderOrder=47;water.add(m);return m;});
 const retained=runoff.paths.map(()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.65,1,18),material(0xb3b3ff));m.rotation.x=-Math.PI/2;m.renderOrder=46;water.add(m);return m;});
 const waterLabels=[label('坡面降雨'),label('下渗 · 紫色圈'),label('干流所在网格')];waterLabels.forEach(s=>{s.onBeforeRender=()=>{};s.renderOrder=50;water.add(s);});
 const waterLeaders=waterLabels.map(()=>{const l=line([new THREE.Vector3(),new THREE.Vector3()],0xd8e8e5);(l.material as THREE.LineBasicMaterial).depthTest=false;l.renderOrder=44;water.add(l);return l;});
 // The generalized mainstem and DEM cells have different resolution. Keep their
 // registration separate: water stops at the descending path's terminal cell.
 // Never animate water across an arbitrary snap that can climb the coarse DEM.
 const receiverLinks=runoff.paths.map(()=>{const geometry=new LineGeometry();geometry.setPositions([0,0,0,0,0,0]);const l=new Line2(geometry,new LineMaterial({color:0xb8c1bf,linewidth:1.3,dashed:true,dashSize:.04,gapSize:.035,transparent:true,opacity:.7,depthTest:false,depthWrite:false}));l.renderOrder=39;l.frustumCulled=false;water.add(l);return l;});
 let waterPathKey='',waterPoints:THREE.Vector3[][]=[];
 const worldAt=(coords:number[],offset=.12)=>at(coords[0],coords[1],offset);
 return {group,update(state:FocusedProcessState|undefined,viewport:THREE.Vector2){
  group.visible=Boolean(state);if(!state)return;
  const p=clamp(state.progress),focal=viewport.y/(2*Math.tan(camera.fov*Math.PI/360));
  exchange.visible=state.kind==='exchange';steward.visible=state.kind==='stewardship';water.visible=state.kind==='runoff';leader.visible=!water.visible;
  if(!water.visible){
   const place=verifiedPlaceReferences[state.kind==='exchange'?'tholing':'ngari'],anchor=at(place.longitude,place.latitude,.2),unit=anchor.distanceTo(camera.position)/focal;
   const root=exchange.visible?exchange:steward;
   root.position.copy(anchor);root.scale.setScalar(unit*Math.min(70,(viewport.x-48)/6));
   // A labelled enlarged activity sits above its regional reference, with a
   // leader back to the unchanged town. It is not metric geographic geometry.
   root.position.y+=unit*90;
   const screen=root.position.clone().project(camera),marginX=Math.min(250,viewport.x/2-18),marginY=140;
   const px=THREE.MathUtils.clamp((screen.x+1)*viewport.x/2,marginX,viewport.x-marginX);
   const py=THREE.MathUtils.clamp((1-screen.y)*viewport.y/2,marginY,Math.max(marginY,viewport.y-190));
   screen.x=px/viewport.x*2-1;screen.y=1-py/viewport.y*2;root.position.copy(screen.unproject(camera));
   leader.geometry.setFromPoints([anchor,root.position]);
   group.userData.anchor=[place.longitude,place.latitude];
  }
  if(exchange.visible){
   const gather=phase(p,.22,.47),write=phase(p,.47,.72),translate=state.enabled?phase(p,.72,1):0;
   question.forEach((m,i)=>{m.position.x=-1.6+gather*1.3;m.position.z=(.3-i*.24)*(1-gather);m.material.opacity=1-gather*.75;});
   source.scale.setScalar(.15+.85*gather);source.visible=p>.23;rows.forEach((m,i)=>m.visible=write>i/8);
   nib.visible=write>0&&write<1;nib.position.z=-.4+write*.77;
   translated.visible=translate>0;translated.scale.x=Math.max(.01,translate);translatedRows.forEach((m,i)=>m.visible=translate>=(i+1)/8);
   transfer.visible=translate>0&&translate<1;transfer.position.x=translate*1.55;transfer.position.y=.22+Math.sin(translate*Math.PI)*.35;
   group.userData.result={writtenRows:rows.filter(m=>m.visible).length,translatedRows:translatedRows.filter(m=>m.visible).length};
  }else if(steward.visible){
   const open=state.enabled?phase(p,.5,.75):0,move=phase(p,.7,1);
   gate.position.y=open*.85;gate.rotation.x=open*Math.PI/2;gate.visible=open<1;
   posts.forEach((m,i)=>m.visible=!(i>2&&i<6&&open>.8));
   animals.forEach((m,i)=>{m.position.set(-1.25+Math.min(move*2.65,open>.95?2.65:.95),.1,-.43+i*.17);});
   patrol.position.set(-.2,.08,-1.2+phase(p,0,.5)*2.4);patrol.visible=p<.5;
   group.userData.result={opening:open,crossed:animals.filter(m=>m.position.x>0).length};
  }else{
   const keep=state.enabled?8:4,fall=phase(p,0,.28),flow=phase(p,.28,.88),delivery=phase(p,.88,1);
   const currentPoints=runoff.paths.map(path=>path.coordinates.map(c=>worldAt(c)));
   const key=currentPoints.flatMap(points=>points.map(point=>point.y)).join(',');
   if(key!==waterPathKey){
    waterPathKey=key;waterPoints=currentPoints;
    waterLines.forEach((stroke,i)=>{
     const points=waterPoints[i];stroke.geometry.setPositions(points.flatMap(point=>point.toArray()));
     receiverLinks[i].geometry.setPositions([...points[points.length-1].toArray(),...worldAt(runoff.paths[i].receiver).toArray()]);receiverLinks[i].computeLineDistances();
    });
   }
   runoff.paths.forEach((_path,i)=>{
    const points=waterPoints[i];
    waterLines[i].material.resolution.copy(viewport);waterLines[i].visible=p>.25;
    const link=receiverLinks[i];link.material.resolution.copy(viewport);link.visible=p>=.28;
    const start=points[0],retains=i<keep;
    const f=flow*(points.length-1),k=Math.min(points.length-2,Math.floor(f));
    const position=p<.28?start.clone().add(new THREE.Vector3(0,(1-fall)*1.2,0)):retains?start.clone().add(new THREE.Vector3(0,-flow*.35,0)):points[k].clone().lerp(points[k+1],f-k);
    const unit=position.distanceTo(camera.position)/focal;
    drops[i].material.color.setHex(0x89e7ff);drops[i].position.copy(position);drops[i].scale.setScalar(unit*(retains?4:5));drops[i].visible=!retains||flow<.8;drops[i].material.opacity=retains?1-flow:1;
    if(!retains){drops[i].material.color.setHex(delivery>.5?0xffdd88:0x89e7ff);drops[i].scale.multiplyScalar(1+delivery*.3);}
    retained[i].position.copy(start);retained[i].scale.setScalar(unit*(4+flow*4));retained[i].visible=retains&&p>.28;
   });
   const anchors=[drops[0].position,retained[0].position,waterPoints[8][waterPoints[8].length-1]];
   waterLabels.forEach((s,i)=>{
    s.visible=i===0?p<.28:i===1?p>=.28:p>=.88;waterLeaders[i].visible=s.visible;
    const anchor=anchors[i],pt=anchor.clone(),unit=pt.distanceTo(camera.position)/focal;
    pt.project(camera);pt.y+=(i===0?50:i===1?40:-42)/viewport.y*2;pt.x+=(i===1?-75:i===2?70:-50)/viewport.x*2;
    s.position.copy(pt.unproject(camera));s.scale.set(125*unit,24*unit,1);
    waterLeaders[i].geometry.setFromPoints([anchor,s.position]);
   });
   group.userData.result={retained:keep,direct:12-keep,delivered:p>=.99?12-keep:0};
  }
  group.userData={...group.userData,kind:state.kind,progress:p,enabled:state.enabled,scope:'source-backed-action / enlarged-mechanism-not-survey'};
 }};
}
