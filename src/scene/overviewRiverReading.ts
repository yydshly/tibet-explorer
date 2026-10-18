import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {label,line} from './environment';
import {placeAtlasLabel,type AtlasLabelBox} from '../lib/atlasLabelLayout';
import {yarlungReadingCoordinates,type OverviewRiverState} from '../lib/overviewRiver';

/** Actual generalized river centerlines on the existing regional DEM. The gold
 * reveal belongs to narration, never a simulated water parcel or measured speed. */
export function buildOverviewRiverReading(camera:THREE.PerspectiveCamera,at:(lon:number,lat:number,offset?:number)=>THREE.Vector3){
 const group=new THREE.Group();group.visible=false;group.userData.kind='sourced-yarlung-reading';
 const coordinates=yarlungReadingCoordinates;
 const positions=coordinates.flatMap(([lon,lat])=>at(lon,lat,.075).toArray());
 const make=(color:number,width:number,order:number)=>{
  const geometry=new LineGeometry();geometry.setPositions(positions);
  const material=new LineMaterial({color,linewidth:width,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const object=new Line2(geometry,material);object.renderOrder=order;object.frustumCulled=false;group.add(object);return object;
 };
 const outline=make(0x08262c,7,30),course=make(0x68d5e4,4,31),read=make(0xffdb85,4,32);
 // A short sequence travels along the archived course, showing downstream
 // order rather than assigning velocity, discharge or an invented basin edge.
 const distances=[0];coordinates.slice(1).forEach((p,i)=>distances.push(distances[i]+Math.hypot((p[0]-coordinates[i][0])*Math.cos(p[1]*Math.PI/180),p[1]-coordinates[i][1])));
 const pointAt=(fraction:number)=>{const d=fraction*distances.at(-1)!;let i=distances.findIndex((v,k)=>k>0&&v>=d);if(i<1)i=distances.length-1;const t=(d-distances[i-1])/(distances[i]-distances[i-1]);return at(THREE.MathUtils.lerp(coordinates[i-1][0],coordinates[i][0],t),THREE.MathUtils.lerp(coordinates[i-1][1],coordinates[i][1],t),.12);};
 const movement=new THREE.Group();movement.userData.kind='downstream-order-not-hydrological-simulation';group.add(movement);
 const parcels=Array.from({length:7},(_,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:i?0x7ceafa:0xffe5a2,depthTest:false,depthWrite:false,toneMapped:false}));mesh.renderOrder=36;movement.add(mesh);return mesh;});
 const origin=label('上游 → 沿干流向下游联系','#c6f5ff');origin.onBeforeRender=()=>{};origin.renderOrder=37;group.add(origin);
 const originLeader=line([new THREE.Vector3(),new THREE.Vector3()],0xffdb85,.9);originLeader.renderOrder=36;(originLeader.material as THREE.LineBasicMaterial).depthTest=false;group.add(originLeader);
 const name=label('雅鲁藏布江 · 干流联系','#d6fbff'),leader=line([new THREE.Vector3(),new THREE.Vector3()],0x89e2ee,.95);
 name.onBeforeRender=()=>{};name.renderOrder=35;leader.renderOrder=34;(leader.material as THREE.LineBasicMaterial).depthTest=false;group.add(name,leader);
 const anchorCoordinate=coordinates.reduce((best,p)=>Math.abs(p[0]-91.3)+Math.abs(p[1]-29.25)<Math.abs(best[0]-91.3)+Math.abs(best[1]-29.25)?p:best);
 const downstreamCoordinate=coordinates.reduce((best,p)=>Math.abs(p[0]-90.5)+Math.abs(p[1]-26.4)<Math.abs(best[0]-90.5)+Math.abs(best[1]-26.4)?p:best);
 const downstreamName=label('下游 · 布拉马普特拉河','#b2e9ee');downstreamName.onBeforeRender=()=>{};downstreamName.renderOrder=35;group.add(downstreamName);
 let previous='';
 return {group,update(state:OverviewRiverState|undefined,viewport:THREE.Vector2){
  group.visible=Boolean(state);if(!state)return;
  const key=positions.length+':'+at(...coordinates[0],.075).y;
  if(previous!==key){const values=coordinates.flatMap(([lon,lat])=>at(lon,lat,.075).toArray());for(const stroke of [outline,course,read])stroke.geometry.setPositions(values);previous=key;}
  for(const stroke of [outline,course,read])stroke.material.resolution.copy(viewport);
  outline.material.opacity=state.emphasized?.95:.5;course.material.opacity=state.emphasized?1:.45;
  read.visible=state.emphasized;read.geometry.instanceCount=Math.floor((coordinates.length-1)*state.reveal);
  movement.visible=state.emphasized;
  const screenFocal=viewport.y/(2*Math.tan(camera.fov*Math.PI/360));
  parcels.forEach((mesh,i)=>{const fraction=state.reveal-i*.025;mesh.visible=fraction>=0&&fraction<=1;if(!mesh.visible)return;mesh.position.copy(pointAt(fraction));mesh.scale.setScalar((i?4:7)*mesh.position.distanceTo(camera.position)/screenFocal);});
  const current=pointAt(state.reveal),currentScreen=current.clone().project(camera),currentUnit=current.distanceTo(camera.position)/screenFocal;
  origin.visible=state.emphasized&&currentScreen.z>-1&&currentScreen.z<1&&Math.abs(currentScreen.x)<.7&&Math.abs(currentScreen.y)<.65;
  const anchor=at(...anchorCoordinate,.075),projected=anchor.clone().project(camera),focal=viewport.y/(2*Math.tan(camera.fov*Math.PI/360)),unit=anchor.distanceTo(camera.position)/focal;
  name.visible=leader.visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.85&&Math.abs(projected.y)<.8;
  if(name.visible){projected.y-=72/viewport.y;name.position.copy(projected.unproject(camera));name.scale.set(208*unit,27*unit,1);name.material.opacity=state.emphasized?1:.7;
   const a=leader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,anchor.x,anchor.y,anchor.z);a.setXYZ(1,name.position.x,name.position.y,name.position.z);a.needsUpdate=true;leader.geometry.computeBoundingSphere();}
  const downstream=at(...downstreamCoordinate,.075),screen=downstream.clone().project(camera),downUnit=downstream.distanceTo(camera.position)/focal;
  downstreamName.visible=screen.z>-1&&screen.z<1&&Math.abs(screen.x)<.7&&screen.y>-.7&&screen.y<.7;
  if(downstreamName.visible){screen.x+=170/viewport.x;screen.y-=30/viewport.y;downstreamName.position.copy(screen.unproject(camera));downstreamName.scale.set(186*downUnit,24*downUnit,1);downstreamName.material.opacity=state.emphasized?.9:.6;}
  // Read the moving focus without laying its text over the fixed river names.
  // Leaders move in screen space; all geographic anchors remain unchanged.
  const occupied:AtlasLabelBox[]=[name,downstreamName].flatMap((sprite,i)=>{
   if(!sprite.visible)return [];const p=sprite.position.clone().project(camera);
   return [{x:(p.x+1)*viewport.x/2,y:(1-p.y)*viewport.y/2,width:i?186:208,height:27}];
  });
  const placed=origin.visible?placeAtlasLabel({anchorX:(currentScreen.x+1)*viewport.x/2,anchorY:(1-currentScreen.y)*viewport.y/2,width:215,height:26,viewportWidth:viewport.x,minY:115,maxY:viewport.y-135,occupied,selected:true}):null;
  origin.visible=originLeader.visible=Boolean(placed);
  if(placed){origin.position.set(placed.x/viewport.x*2-1,1-placed.y/viewport.y*2,currentScreen.z).unproject(camera);origin.scale.set(215*currentUnit,26*currentUnit,1);
   const a=originLeader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,current.x,current.y,current.z);a.setXYZ(1,origin.position.x,origin.position.y,origin.position.z);a.needsUpdate=true;originLeader.geometry.computeBoundingSphere();}
  group.userData={...group.userData,reveal:state.reveal,emphasized:state.emphasized,source:'/data/hydrography/yarlung-river.geojson',scope:'概览干流而非流域边界；移动色点为下游次序示意，非实测水团、流速、流量或河宽'};
 }};
}
