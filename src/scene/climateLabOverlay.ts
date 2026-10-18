import * as THREE from 'three';
import {climateLabCoordinates,climateLabAirState} from '../lib/climateLabProcess';
import type {ClimateLabReading} from '../lib/climateLabProcess';
import {climateLabPlaces,type ClimateLabState} from '../data/climateLab';
import {disposeTree,label,line} from './environment';

type Runtime={at:(lon:number,lat:number,offset?:number)=>THREE.Vector3;metres:(lon:number,lat:number)=>number|undefined};
/** Everything stays on the acquired regional DEM. Atmosphere is explicitly a
 * teaching overlay; no geometry here represents surveyed facilities or roads. */
export function buildClimateLabOverlay(runtime:Runtime){
 const group=new THREE.Group();group.name='climate-terrain-interaction';group.visible=false;
 const insetCamera=new THREE.OrthographicCamera(-10.2,10.2,6.2,-6.2,.1,100);
 const centre=runtime.at(88,31,0);insetCamera.position.copy(centre).add(new THREE.Vector3(0,20,12));insetCamera.lookAt(centre);insetCamera.updateMatrixWorld();
 const insetPin=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),new THREE.MeshBasicMaterial({color:0xffd286,depthTest:false}));insetPin.visible=false;group.add(insetPin);
 let insetActive=false;
 const profileGroup=new THREE.Group(),airGroup=new THREE.Group(),landGroup=new THREE.Group();group.add(profileGroup,airGroup,landGroup);
 let key='',samples:{longitude:number;latitude:number;metres:number;point:THREE.Vector3}[]=[];
 const basic=(color:number,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false});
 const clearance=1.8;
 const parcel=new THREE.Mesh(new THREE.SphereGeometry(.25,20,14),basic(0x70dddc));airGroup.add(parcel);
 const airGeometry=new THREE.BufferGeometry();const airLine=new THREE.Line(airGeometry,new THREE.LineBasicMaterial({color:0x70dddc,transparent:true,opacity:.8}));airGroup.add(airLine);
 const vapour=Array.from({length:30},()=>{const sphere=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),basic(0x8ce9e7,.8));airGroup.add(sphere);return sphere;});
 const clouds=Array.from({length:18},(_,i)=>{const cloud=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),basic(0xe9f4f6,.85));cloud.scale.set(1.9,.7,1.1);cloud.userData.seed=i;airGroup.add(cloud);return cloud;});
 const rainPositions=new Float32Array(120*6),rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
 const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0x96dfff,transparent:true,opacity:.85}));airGroup.add(rain);
 const probe=new THREE.Mesh(new THREE.SphereGeometry(.095,14,10),basic(0xffd286));profileGroup.add(probe);
 const mast=line([new THREE.Vector3(),new THREE.Vector3()],0xffd286,.9);profileGroup.add(mast);
 let reading=label('真实高程采样','#fff0b1');reading.scale.set(2.4,.3,1);profileGroup.add(reading);let previousText='';
 let trace:THREE.Line|undefined;
 const picks=Array.from({length:5},(_,i)=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),basic(0xffd286,.75));dot.userData.selectId=`lab-probe:${i/4}`;profileGroup.add(dot);return dot;});
 const cells=new THREE.InstancedMesh(new THREE.PlaneGeometry(.063,.063),basic(0x69e1c3,.8),625);cells.rotation.x=-Math.PI/2;landGroup.add(cells);cells.frustumCulled=false;
 const dummy=new THREE.Object3D();
 function rebuild(state:ClimateLabState){
  const next=`${state.stage}:${state.city}:${state.direction}`;if(next===key&&samples.length)return;
  const result=Array.from({length:101},(_,i)=>{const c=climateLabCoordinates(state,i/100),m=runtime.metres(c.longitude,c.latitude);return m===undefined?undefined:{...c,metres:m,point:runtime.at(c.longitude,c.latitude,.04)};});
  if(result.some(s=>!s)){samples=[];return;}key=next;samples=result as typeof samples;
  if(trace){profileGroup.remove(trace);trace.geometry.dispose();(trace.material as THREE.Material).dispose();}
  trace=line(samples.map(s=>s.point),0xffd286,.95);trace.userData.kind='actual-dem-sampling-line-not-road';profileGroup.add(trace);
  picks.forEach((dot,i)=>dot.position.copy(samples[i*25].point));
  airGeometry.setFromPoints(samples.map(s=>s.point.clone().add(new THREE.Vector3(0,clearance,0))));
  if(state.stage==='life'){
   const place=climateLabPlaces[state.city],grid=Array.from({length:625},(_,i)=>{const lon=place.longitude+((i%25)/24-.5)*2.4,lat=place.latitude+(Math.floor(i/25)/24-.5)*2.4;return {lon,lat,m:runtime.metres(lon,lat)};});
   const heights=grid.flatMap(c=>c.m===undefined?[]:[c.m]).sort((a,b)=>a-b);const threshold=heights[Math.floor(heights.length*.4)]??0;let n=0;
   grid.forEach((c,i)=>{const right=grid[i%25===24?i-1:i+1],up=grid[i<600?i+25:i-25];if(c.m===undefined||right.m===undefined||up.m===undefined)return;
    if(c.m>threshold||Math.max(Math.abs(c.m-right.m),Math.abs(c.m-up.m))>250)return;
    const p=runtime.at(c.lon,c.lat,.06);dummy.position.set(p.x,-p.z,p.y);dummy.updateMatrix();cells.setMatrixAt(n++,dummy.matrix);
   });cells.count=n;cells.instanceMatrix.needsUpdate=true;landGroup.userData={kind:'relative-low-gentle-dem-samples',thresholdMetres:threshold,scope:'观察窗内较低40%且相邻0.1度样本高差不超过250m；非建设适宜性或耕地'};
  }
 }
 let readingKey='';
 return {group,update(state:ClimateLabState|undefined,onReading?:((reading:ClimateLabReading)=>void)){
  insetActive=!!state&&state.stage==='life'&&state.zoom;
  group.visible=!!state&&state.stage!=='evidence';if(!state||!group.visible)return;
  const locality=climateLabPlaces[state.city];insetPin.position.copy(runtime.at(locality.longitude,locality.latitude,.2));
  rebuild(state);if(!samples.length){group.visible=false;return;}
  const progress=Math.max(0,Math.min(1,state.progress)),index=Math.round(progress*100),sample=samples[index];
  airGroup.visible=state.stage==='air';landGroup.visible=state.stage==='life'&&(state.landReveal??1)>0;
  const value=climateLabAirState(samples.map(s=>s.metres),progress,state.moisture)!;
  const nextReading=JSON.stringify([state.stage,state.city,Math.round(value.ground),Math.round(value.lift),value.phase,Math.round(value.cloud*100),Math.round(value.rain*100)]);
  if(nextReading!==readingKey){readingKey=nextReading;onReading?.({ground:value.ground,lift:value.lift,phase:value.phase,cloud:value.cloud,rain:value.rain});}
  probe.position.copy(sample.point);const top=sample.point.clone().add(new THREE.Vector3(0,.65,0));
  const attr=mast.geometry.attributes.position as THREE.BufferAttribute;attr.setXYZ(0,...sample.point.toArray());attr.setXYZ(1,...top.toArray());attr.needsUpdate=true;mast.geometry.computeBoundingSphere();
  const text=`高程样本 ≈${Math.round(sample.metres/10)*10}米`;
  if(text!==previousText){previousText=text;profileGroup.remove(reading);reading.material.map?.dispose();reading.material.dispose();reading=label(text,'#fff0b1');reading.scale.set(2.4,.3,1);profileGroup.add(reading);}reading.position.copy(top).add(new THREE.Vector3(-2.0,-.3,0));
  reading.visible=state.stage==='life';
  parcel.position.copy(sample.point).add(new THREE.Vector3(0,clearance,0));parcel.material.color.set(value.descending?0xf1bc82:0x70dddc);parcel.scale.setScalar(1+value.lift/9000);
  vapour.forEach((dot,i)=>{dot.visible=i<(state.moisture==='higher'?30:9);const t=Math.max(0,progress-i*.009),s=samples[Math.round(t*100)];dot.position.copy(s.point).add(new THREE.Vector3(Math.sin(i*2.4)*.12,clearance+Math.cos(i*1.8)*.1,0));});
  clouds.forEach((cloud,i)=>{cloud.visible=value.cloud>i/23;cloud.position.copy(parcel.position).add(new THREE.Vector3(((i%6)-2.5)*.22,.27+Math.sin(i)*.05,(Math.floor(i/6)-1)*.22));cloud.material.opacity=value.cloud*.8;});
  const count=Math.round(value.rain*120);rainGeometry.setDrawRange(0,count*2);
  for(let i=0;i<count;i++){const x=parcel.position.x+Math.sin(i*31.7)*.5,z=parcel.position.z+Math.cos(i*12.3)*.25,y=parcel.position.y-((i*.137+progress*7)%1)*.8;rainPositions.set([x,y,z,x,y-.19,z],i*6);}rainGeometry.attributes.position.needsUpdate=true;rainGeometry.computeBoundingSphere();
  landGroup.scale.setScalar(1);cells.material.opacity=state.landReveal===undefined?.25+progress*.6:.8*state.landReveal;
  group.userData={kind:'climate-terrain-interaction',stage:state.stage,city:state.city,progress,groundMetres:sample.metres,cloud:value.cloud,rain:value.rain,moisture:state.moisture,scope:'高程为数据；气团、云雨、颜色和剖面选线为原理/观察示意'};
 },render(renderer:THREE.WebGLRenderer,world:THREE.Scene){
  if(!insetActive)return;
  const size=renderer.getSize(new THREE.Vector2()),width=180,height=110,x=size.x-198,y=size.y-110-height;
  const oldViewport=renderer.getViewport(new THREE.Vector4()),oldScissor=renderer.getScissor(new THREE.Vector4()),oldTest=renderer.getScissorTest(),auto=renderer.autoClear;
  const visibility=[profileGroup,airGroup,landGroup].map(o=>[o,o.visible] as const),sprites:THREE.Sprite[]=[];
  world.traverse(o=>{if(o instanceof THREE.Sprite&&o.visible){sprites.push(o);o.visible=false;}});
  try{visibility.forEach(([o])=>o.visible=false);insetPin.visible=true;renderer.autoClear=false;renderer.setScissorTest(true);renderer.setViewport(x,y,width,height);renderer.setScissor(x,y,width,height);renderer.clear(true,true,true);renderer.render(world,insetCamera);}
  finally{insetPin.visible=false;visibility.forEach(([o,v])=>o.visible=v);sprites.forEach(s=>s.visible=true);renderer.autoClear=auto;renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(oldTest);}
 },dispose(){disposeTree(group);}};
}
