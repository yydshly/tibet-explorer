import * as THREE from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {lulangCultureState} from '../data/lulangCulture';
import type {PilotView} from '../data/routePilot';

/** Reading symbols, with NO geographic size or supplier coordinates.
 * The only measured anchor is an existing OSM restaurant record. */
export function createLulangCultureSymbols(){
 const group=new THREE.Group();group.renderOrder=15;
 const materials:LineMaterial[]=[];
 const line=(positions:number[],color:number,width=3)=>{
  const geometry=new LineGeometry();geometry.setPositions(positions);
  const material=new LineMaterial({color,linewidth:width,transparent:true,depthTest:false,depthWrite:false});materials.push(material);
  const shape=new Line2(geometry,material);shape.renderOrder=15;shape.frustumCulled=false;group.add(shape);return shape;
 };
 const arcPoint=(t:number)=>new THREE.Vector3(Math.cos(t*Math.PI*2-Math.PI/2),0,Math.sin(t*Math.PI*2-Math.PI/2));
 const colors=[0xffd283,0x71dce8,0xb6e3a1];
 const arcs=colors.map((color,i)=>line(Array.from({length:33},(_,j)=>arcPoint((i+j/32)/3).toArray()).flat(),color));
 const outputs=[new THREE.Vector3(-1.75,0,-1.45),new THREE.Vector3(1.75,0,-1.45)];
 const outputsLines=outputs.map(p=>line([0,0,0,...p.toArray()],0xffe8ac,2));
 const halo=line(Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return[Math.cos(a)*.28,0,Math.sin(a)*.28];}).flat(),0xffe8ac,3);
 const token=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),new THREE.MeshBasicMaterial({color:0xfff0b5,depthTest:false}));token.renderOrder=17;group.add(token);
 const serviceTokens=outputs.map(()=>{const token=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:0xffe8ac,depthTest:false}));token.renderOrder=17;group.add(token);return token;});
 const labels=[
  {title:'制作要求 · 2017记录',position:arcPoint(1/6).multiplyScalar(1.4)},
  {title:'供货组织 · 关系示意',position:arcPoint(.5).multiplyScalar(1.4)},
  {title:'诚信经营 · 2017记录',position:arcPoint(5/6).multiplyScalar(1.4)},
  {title:'日常饮食 · 功能示意',position:outputs[0]},
  {title:'旅游接待 · 功能示意',position:outputs[1]},
 ];
 const update=(view:PilotView,anchor:THREE.Vector3,radius:number)=>{
  const state=lulangCultureState(view);group.visible=state.active;group.position.copy(anchor);group.scale.setScalar(radius);
  const revealed=state.step===3?3:state.step+1;
  arcs.forEach((shape,i)=>{
   const missing=i===1&&!state.supply;
   shape.material.color.setHex(missing?0xc0a8a0:colors[i]);
   shape.material.opacity=missing?.18:i<revealed?.95:.12;
   shape.material.linewidth=i===state.step?4:2.5;
   shape.geometry.instanceCount=missing?6:32;
  });
  // No second timer. Manual scrubbing, pause and reverse use the same value.
  const travel=Math.min(1,state.progress/.75),stop=state.supply?travel:Math.min(travel,1/3);
  token.position.copy(arcPoint(stop));token.visible=state.progress<.75||!state.supply;
  outputsLines.forEach(shape=>{shape.visible=state.step===3;shape.material.opacity=state.serviceReady?.8:.12;});
  halo.visible=state.serviceReady;halo.scale.setScalar(.9+(state.progress-.75)*1.5);
  serviceTokens.forEach((token,i)=>{token.visible=state.serviceReady;token.position.copy(outputs[i]).multiplyScalar(Math.max(0,(state.progress-.75)/.25));});
  group.updateMatrixWorld(true);
  return labels.map((label,i)=>({title:i===1&&!state.supply?'供货缺口 · 假设移去':label.title,position:group.localToWorld(label.position.clone()),visible:state.active&&(i<3?i<revealed:i>=3&&state.step===3),muted:i>=3&&!state.serviceReady||i===1&&!state.supply}));
 };
 return {group,arcs,token,halo,outputsLines,serviceTokens,update,setResolution:(w:number,h:number)=>materials.forEach(m=>m.resolution.set(w,h))};
}
