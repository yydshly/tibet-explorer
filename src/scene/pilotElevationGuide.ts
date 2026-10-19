import * as THREE from 'three';

export const pilotElevationDatum=2500;
/** A cartographic profile curtain, NOT a wall, excavation or exaggerated DEM. */
export function createPilotElevationGuide(paths:number[][][],at:(p:readonly number[],offset?:number)=>THREE.Vector3){
 const group=new THREE.Group();
 for(const path of paths){
  const vertices:number[]=[];
  for(let i=1;i<path.length;i++){
   const a=at(path[i-1],10),b=at(path[i],10),a0=new THREE.Vector3(a.x,pilotElevationDatum/1000,a.z),b0=new THREE.Vector3(b.x,pilotElevationDatum/1000,b.z);
   vertices.push(...a.toArray(),...a0.toArray(),...b.toArray(),...b.toArray(),...a0.toArray(),...b0.toArray());
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const curtain=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xf3d89a,transparent:true,opacity:.2,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));curtain.renderOrder=5;group.add(curtain);
 }
 return group;
}

/** Height tint uses each rendered vertex's source DSM elevation, at height 1x.
 * The satellite image is retained underneath, not replaced by invented texture. */
export function pilotElevationMaterial(texture:THREE.Texture){
 const amount={value:0};
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.pilotElevationMix=amount;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float pilotSurfaceHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\npilotSurfaceHeight=position.y*1000.0;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform float pilotElevationMix;
varying float pilotSurfaceHeight;
vec3 pilotLinearColor(vec3 c){return pow((c+vec3(.055))/1.055,vec3(2.4));}
vec3 pilotHypsometry(float h){
 vec3 low=vec3(.24,.64,.58),mid=vec3(.72,.75,.44),high=vec3(.86,.59,.34),snow=vec3(.95,.91,.8);
 if(h<3500.0)return pilotLinearColor(mix(low,mid,clamp((h-2900.0)/600.0,0.0,1.0)));
 if(h<4500.0)return pilotLinearColor(mix(mid,high,(h-3500.0)/1000.0));
 return pilotLinearColor(mix(high,snow,clamp((h-4500.0)/800.0,0.0,1.0)));
}`).replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,pilotHypsometry(pilotSurfaceHeight),pilotElevationMix);');
 };
 material.customProgramCacheKey=()=> 'pilot-source-elevation-v1';
 return {material,amount};
}
