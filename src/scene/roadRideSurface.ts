import * as THREE from 'three';
import {pilotProfileSample} from './pilotTravelFrame';
import type {PilotProfilePoint} from './routePilotTerrainData';

/** Source-centreline ribbon; width/style are explicit illustration. Sampling
 * the same rendered DSM avoids claiming a surveyed or level engineered deck. */
export function roadRibbonVertices(profile:readonly PilotProfilePoint[],start:number,end:number,halfWidth:number,at:(p:readonly number[],offset?:number)=>THREE.Vector3){
 const vertices:number[]=[],indices:number[]=[],uv:number[]=[];
 const count=Math.ceil((end-start)/3);
 for(let i=0;i<=count;i++){
  const d=start+(end-start)*i/count,here=pilotProfileSample(profile,d),a=pilotProfileSample(profile,d-3),b=pilotProfileSample(profile,d+3);
  const mx=111320*Math.cos(here.coordinate[1]*Math.PI/180),dx=(b.coordinate[0]-a.coordinate[0])*mx,dz=(b.coordinate[1]-a.coordinate[1])*111320,length=Math.hypot(dx,dz)||1;
  for(const side of [-1,1]){
   const p=[here.coordinate[0]-dz/length*side*halfWidth/mx,here.coordinate[1]+dx/length*side*halfWidth/111320];
   vertices.push(...at(p,.45).toArray());uv.push((side+1)/2,(d-start)/12);
  }
  if(i<count){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
 }
 return {vertices,indices,uv};
}
export function createRoadRideSurface(profile:readonly PilotProfilePoint[],start:number,end:number,at:(p:readonly number[],offset?:number)=>THREE.Vector3){
 const data=roadRibbonVertices(profile,start,end,4,at),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));geometry.setIndex(data.indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0x424a4b,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 rideUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nrideUV=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 rideUV;').replace('#include <color_fragment>',`#include <color_fragment>
float edge=1.0-smoothstep(.008,.025,min(rideUV.x,1.0-rideUV.x));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.6,.61,.54),edge);
`);
 };
 material.customProgramCacheKey=()=> 'ride-schematic-road-v1';
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=2;return mesh;
}

/** Near-camera cartographic terrain colour replaces magnified 10m pixels.
 * No synthetic satellite detail, vegetation or relief is introduced. */
export function createRideTerrainMaterial(texture:THREE.Texture){
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 rideWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nrideWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 rideWorld;').replace('#include <map_fragment>',`#include <map_fragment>
float nearMix=1.0-smoothstep(.12,.55,distance(cameraPosition,rideWorld));
vec3 terrainInk=mix(vec3(.16,.20,.16),vec3(.30,.28,.23),clamp((rideWorld.y-4.2)/.45,0.0,1.0));
diffuseColor.rgb=mix(diffuseColor.rgb,terrainInk,nearMix);
`);
 };
 material.customProgramCacheKey=()=> 'ride-near-cartography-v1';return material;
}
