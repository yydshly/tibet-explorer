import * as THREE from 'three';
import {irrigationFeatureIds,type IrrigationState} from '../data/overviewIrrigation';
import type {LocalCollection,LocalCoordinate,LocalFeature} from './cityLocalMap';
/** Source geometry stays unchanged. Blue coverage explains service, not a survey. */
export function createIrrigationReading(data:LocalCollection,toWorld:(p:LocalCoordinate,offset?:number)=>THREE.Vector3,polygon:(f:LocalFeature,height:number)=>THREE.BufferGeometry,metresPerUnit:number){
 const group=new THREE.Group();group.name='shiquanhe-irrigation-reading';
 const find=(id:string)=>{const f=data.features.find(f=>f.id===id);if(!f)throw new Error(`Missing irrigation reference: ${id}`);return f;};
 const canal=find(irrigationFeatureIds.canal),forest=find(irrigationFeatureIds.forest);
 // Reverse the acquired node sequence for readability only; no measured flow direction is claimed.
 const coords=[...(canal.geometry.coordinates as LocalCoordinate[]).slice(0,5)].reverse();
 const points:THREE.Vector3[]=[];
 for(let i=0;i<coords.length-1;i++)for(let j=0;j<12;j++)points.push(toWorld([THREE.MathUtils.lerp(coords[i][0],coords[i+1][0],j/12),THREE.MathUtils.lerp(coords[i][1],coords[i+1][1],j/12)],8));
 points.push(toWorld(coords.at(-1)!,8));
 const path=new THREE.CurvePath<THREE.Vector3>();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));
 const pipe=new THREE.TubeGeometry(path,points.length,9/metresPerUnit,6,false);
 const water=new THREE.Mesh(pipe,new THREE.MeshBasicMaterial({color:0x38daf2,transparent:true,opacity:.95,depthTest:false}));water.renderOrder=65;group.add(water);
 const floor=new THREE.Mesh(polygon(forest,0),new THREE.MeshBasicMaterial({color:0x38daf2,transparent:true,opacity:.12,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));floor.renderOrder=60;group.add(floor);
 // Fill over the acquired forest footprint is a service-result symbol, not an actual irrigated parcel.
 const wet={value:0};const box=new THREE.Box3().setFromBufferAttribute(floor.geometry.getAttribute('position') as THREE.BufferAttribute);
 floor.material.onBeforeCompile=shader=>{shader.uniforms.delivered=wet;shader.uniforms.wetMin={value:box.min.x};shader.uniforms.wetMax={value:box.max.x};shader.vertexShader='varying float wetX;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwetX=position.x;');shader.fragmentShader='varying float wetX;uniform float delivered;uniform float wetMin;uniform float wetMax;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=step((wetX-wetMin)/max(.000001,wetMax-wetMin),delivered);');};floor.material.customProgramCacheKey=()=> 'irrigation-result-v1';
 group.userData={sourceIds:irrigationFeatureIds,scope:'渠线与林地参照来自OSM；通水方向、补水量与服务归属仅作功能对照，未标定闸口'};
 return {group,update(s:IrrigationState|undefined){group.visible=Boolean(s);if(!s)return;
  water.visible=s.flowing&&s.gate&&s.cleared;
  pipe.setDrawRange(0,Math.floor((pipe.index?.count??0)*Math.max(.02,s.delivered)/6)*6);
  wet.value=s.delivered;floor.material.opacity=s.delivered>0?.8:0;
  group.userData.reading={...s};
 }};
}
