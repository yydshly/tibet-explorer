import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {label,line} from './environment';
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
  const anchor=at(...anchorCoordinate,.075),projected=anchor.clone().project(camera),focal=viewport.y/(2*Math.tan(camera.fov*Math.PI/360)),unit=anchor.distanceTo(camera.position)/focal;
  name.visible=leader.visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.85&&Math.abs(projected.y)<.8;
  if(name.visible){projected.y-=72/viewport.y;name.position.copy(projected.unproject(camera));name.scale.set(208*unit,27*unit,1);name.material.opacity=state.emphasized?1:.7;
   const a=leader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,anchor.x,anchor.y,anchor.z);a.setXYZ(1,name.position.x,name.position.y,name.position.z);a.needsUpdate=true;leader.geometry.computeBoundingSphere();}
  const downstream=at(...downstreamCoordinate,.075),screen=downstream.clone().project(camera),downUnit=downstream.distanceTo(camera.position)/focal;
  downstreamName.visible=screen.z>-1&&screen.z<1&&Math.abs(screen.x)<.7&&screen.y>-.7&&screen.y<.7;
  if(downstreamName.visible){screen.x+=170/viewport.x;screen.y-=30/viewport.y;downstreamName.position.copy(screen.unproject(camera));downstreamName.scale.set(186*downUnit,24*downUnit,1);downstreamName.material.opacity=state.emphasized?.9:.6;}
  group.userData={...group.userData,reveal:state.reveal,emphasized:state.emphasized,source:'/data/hydrography/yarlung-river.geojson',scope:'概览河道；金色为讲解进度，非实测流速、流量或河宽'};
 }};
}
