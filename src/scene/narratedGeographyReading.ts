import * as THREE from 'three';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import data from '../../public/data/narrated-geography.json';
import regionProfiles from '../data/region-comparison.json';
import {regionalAnchors} from '../data/regionalStudy';
import type {GeographyReading} from '../lib/narratedGeography';
import {label,line} from './environment';
type At=(lon:number,lat:number,offset?:number)=>THREE.Vector3;
type XY=readonly number[];
export function transportReadingCoordinates(kind:string):readonly XY[]{
 return kind==='airport'?[...data.gunsaRunway.geometry.coordinates,...data.airportConnection.coordinates]:kind==='rail'?data.railParts.flatMap(part=>part.coordinates):[];
}
export const himalayaRing=data.himalaya.geometry.coordinates[0];
export function insideHimalaya(x:number,y:number){
 let inside=false;const ring=himalayaRing;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
function surfacePatch(at:At,west:number,east:number,south:number,north:number,cols:number,rows:number,mask?:(x:number,y:number)=>boolean){
 const positions:number[]=[],colors:number[]=[],indices:number[]=[],colour=new THREE.Color();
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
  const lon=west+x/cols*(east-west),lat=south+y/rows*(north-south),p=at(lon,lat,.025);positions.push(...p.toArray());
  colour.set(0xdcc37c);colors.push(...colour.toArray());
 }
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  if(mask&&!mask(west+(x+.5)/cols*(east-west),south+(y+.5)/rows*(north-south)))continue;
  const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xf3ca69,transparent:true,opacity:.25,side:THREE.DoubleSide,depthTest:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
}
/** A physical-region reference draped on data, never a measured range boundary. */
export function buildMountainReading(at:At){
 const group=new THREE.Group();group.visible=false;let ready=false,previousCut:number|undefined;
 let original:number[]=[];
 return {group,update(show:boolean,progress:number,cutLongitude?:number){
  group.visible=show;if(!show)return;
  if(!ready){group.add(surfacePatch(at,76,97,26,36,130,60,insideHimalaya));
   const edgePoints:THREE.Vector3[]=[];
   for(let i=1;i<himalayaRing.length;i++){const a=himalayaRing[i-1],b=himalayaRing[i];if([a,b].every(p=>p[0]>=76&&p[0]<=101&&p[1]>=25&&p[1]<=38))edgePoints.push(at(a[0],a[1],.06),at(b[0],b[1],.06));}
   group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgePoints),new THREE.LineBasicMaterial({color:0xe7ca7d,transparent:true,opacity:.55})));ready=true;
   original=Array.from((group.children[0] as THREE.Mesh).geometry.index!.array);}
  if(previousCut!==cutLongitude){
   const geometry=(group.children[0] as THREE.Mesh).geometry,positions=geometry.getAttribute('position'),indices:number[]=[];
   if(cutLongitude===undefined)geometry.setIndex(original);
   else{const limit=at(cutLongitude,30).x;for(let i=0;i<original.length;i+=3)if(original.slice(i,i+3).every(index=>positions.getX(index)<=limit))indices.push(...original.slice(i,i+3));geometry.setIndex(indices);}
   previousCut=cutLongitude;
  }
  group.children[1].visible=cutLongitude===undefined;
  (group.children[0] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>).material.opacity=.2+.12*Math.min(1,progress*3);
  group.userData={kind:'sourced-himalaya-terrain-reading',source:data.metadata.mountainSource,scope:'Natural Earth概略山系范围；内部高度来自DEM，非山脊测线或精确地质边界'};
 }};
}
export function buildNarratedGeographyReading(camera:THREE.PerspectiveCamera,at:At){
 const group=new THREE.Group();group.visible=false;group.name='narrated-geographic-relations';
 const windows=new Map<string,THREE.Group>();let ready=false,compareProfiles=false;
 const redrape:(()=>void)[]=[];let terrainKey='';
 const lineObjects:LineSegments2[]=[],names:{sprite:THREE.Sprite;leader:THREE.Line;coordinate:XY;offset:[number,number];owner:THREE.Group}[]=[];
 const water=new THREE.Group(),rail=new THREE.Group(),airport=new THREE.Group();group.add(water,rail,airport);
 const waterRegions=new Map<string,THREE.Group>();
 function stroke(owner:THREE.Group,paths:readonly (readonly XY[])[],color:number,width:number,order:number){
  const geometry=new LineSegmentsGeometry();
  const refresh=()=>{const positions:number[]=[];for(const path of paths)for(let i=1;i<path.length;i++)positions.push(...at(path[i-1][0],path[i-1][1],.09).toArray(),...at(path[i][0],path[i][1],.09).toArray());geometry.setPositions(positions);};
  refresh();redrape.push(refresh);
  const material=new LineMaterial({color,linewidth:width,transparent:true,opacity:.9,depthTest:false,depthWrite:false,toneMapped:false});
  const object=new LineSegments2(geometry,material);object.frustumCulled=false;object.renderOrder=order;owner.add(object);lineObjects.push(object);return object;
 }
 function name(owner:THREE.Group,text:string,coordinate:XY,offset:[number,number]){const sprite=label(text,'#f4ecd4');sprite.onBeforeRender=()=>{};sprite.renderOrder=60;const leader=line([new THREE.Vector3(),new THREE.Vector3()],0xd6d9b3,.8);(leader.material as THREE.LineBasicMaterial).depthTest=false;leader.frustumCulled=false;leader.renderOrder=59;owner.add(sprite,leader);names.push({sprite,leader,coordinate,offset,owner});}
 let railRead:LineSegments2|undefined,airportRead:LineSegments2|undefined;
 let airportPath:number[][]=[];
 const transferMarker=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xffecb0,depthTest:false,depthWrite:false,toneMapped:false}));transferMarker.renderOrder=42;transferMarker.userData.kind='road-reading-position-not-vehicle';airport.add(transferMarker);
 function prepare(){
  for(const city of regionalAnchors){
   const root=new THREE.Group(),w=city.longitude-1,e=city.longitude+1,s=city.latitude-.55,n=city.latitude+.55;
   const patch=surfacePatch(at,w,e,s,n,30,20);root.add(patch);
   redrape.push(()=>{const positions=patch.geometry.getAttribute('position') as THREE.BufferAttribute;
    for(let y=0;y<=20;y++)for(let x=0;x<=30;x++){const point=at(w+x/30*(e-w),s+y/20*(n-s),.025);positions.setXYZ(y*31+x,point.x,point.y,point.z);}
    positions.needsUpdate=true;patch.geometry.computeBoundingSphere();});
   const border=[...Array.from({length:31},(_,i)=>[w+(e-w)*i/30,s]),...Array.from({length:21},(_,i)=>[e,s+(n-s)*i/20]),...Array.from({length:31},(_,i)=>[e-(e-w)*i/30,n]),...Array.from({length:21},(_,i)=>[w,n-(n-s)*i/20])];
   const boundary=line(border.map(p=>at(p[0],p[1],.04)),0xf1d8a0,.65);(boundary.material as THREE.LineBasicMaterial).depthTest=false;root.add(boundary);
   redrape.push(()=>{boundary.geometry.setFromPoints(border.map(p=>at(p[0],p[1],.04)));boundary.geometry.computeBoundingSphere();});
   const profilePoints=()=>compareProfiles?regionProfiles.places.find(p=>p.id===city.id)!.points.map(p=>at(p.longitude,p.latitude,.055)):Array.from({length:61},(_,i)=>at(w+(e-w)*i/60,city.latitude,.055));
   const profile=profilePoints();
   const section=line(profile,0xffe9ad,1);root.add(section);
   redrape.push(()=>{const old=section.geometry;section.geometry=new THREE.BufferGeometry().setFromPoints(profilePoints());old.dispose();section.geometry.computeBoundingSphere();});
   root.userData={cityId:city.id,kind:'dem-observation-window',bounds:[w,s,e,n],scope:'真实高程观察窗，不是城市边界、建设范围或古代聚落'};root.visible=false;windows.set(city.id,root);group.add(root);
  }
  for(const [id,sourceNames] of [['south',['Maquan','Yarlung','Dihang']],['east',['Za','Lancang','Nu']],['west',['Shiquan']]] as const){
   const owner=new THREE.Group();water.add(owner);waterRegions.set(id,owner);
   const rivers=data.rivers.filter(f=>(sourceNames as readonly string[]).includes(f.properties.name)).flatMap(f=>f.geometry.coordinates);
   stroke(owner,rivers,0x082c36,5,24);stroke(owner,rivers,0x63d4e3,2.3,25);
  }
  name(water,'雅鲁藏布江 · 概览河道',[91.62,29.26],[-95,40]);
  const railPaths=data.railParts.map(p=>p.coordinates);
  stroke(rail,railPaths,0x142522,8,29);stroke(rail,railPaths,0xf08b48,4.5,30);railRead=stroke(rail,railPaths,0xffe7a2,4.5,31);
  name(rail,'拉林铁路 · 现状轨道',[92.56,29.14],[110,36]);
  rail.userData={kind:'source-connected-lhasa-nyingchi-rail',source:'/data/narrated-geography.json',wayIds:data.railParts.map(p=>p.wayId),scope:'OSM现状轨道，桥隧均为水平投影，含拉萨共线接入；非2021年轨道复原或列车运行模拟'};
  const runway=data.gunsaRunway.geometry.coordinates as number[][];
  stroke(airport,[runway],0xf5d695,5,30);const center=runway[Math.floor(runway.length/2)];
  airportPath=data.airportConnection.coordinates.map(p=>[...p]);
  const distance=(p:number[])=>Math.hypot(p[0]-center[0],p[1]-center[1]);
  if(distance(airportPath[0])>distance(airportPath.at(-1)!))airportPath.reverse();
  stroke(airport,[airportPath],0x142522,8,28);stroke(airport,[airportPath],0x76c8cc,4,29);airportRead=stroke(airport,[airportPath],0xffd68b,4,31);
  name(airport,'昆莎机场 · 实际跑道位置',center,[70,40]);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.09,.12,32),new THREE.MeshBasicMaterial({color:0xffd995,side:THREE.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.copy(at(center[0],center[1],.1));airport.add(ring);
  redrape.push(()=>ring.position.copy(at(center[0],center[1],.1)));
  ready=true;
 }
 return {group,update(state:GeographyReading|undefined,viewport:THREE.Vector2){
  group.visible=Boolean(state)&&state?.kind!=='mountain';if(!group.visible||!state||viewport.x<1||viewport.y<1)return;
  compareProfiles=Boolean(state.compareProfiles);
  if(!ready)prepare();
  // DEM arrival and the existing macro/local height-scale switch must update
  // all geometry, not just the moving pins. Otherwise an oblique view exposes
  // old windows and routes under the new terrain, displaced from their labels.
  const key=String(compareProfiles)+regionalAnchors.map(city=>at(city.longitude,city.latitude).y).join(':');
  if(key!==terrainKey){redrape.forEach(refresh=>refresh());terrainKey=key;}
  for(const [id,root] of windows){root.visible=state.cities.includes(id as GeographyReading['cities'][number]);if(root.visible){const mesh=root.children[0] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;mesh.material.opacity=.23+.1*Math.min(1,state.progress*4);}}
  water.visible=state.rivers;rail.visible=state.kind==='rail';airport.visible=state.kind==='airport';
  for(const [id,owner] of waterRegions)owner.visible=!state.cities.length||state.cities.some(city=>id==='south'?['lhasa','shannan','shigatse','nyingchi'].includes(city):id==='east'?city==='chamdo':city==='ngari');
  for(const object of lineObjects)object.material.resolution.copy(viewport);
  if(railRead)railRead.geometry.instanceCount=Math.floor(data.railParts.reduce((n,p)=>n+p.coordinates.length-1,0)*Math.min(1,state.progress*1.5));
  const focal=viewport.y/(2*Math.tan(camera.fov*Math.PI/360));
  if(airportRead&&airportPath.length>1){
   const progress=Math.min(1,state.progress*1.5),t=progress*(airportPath.length-1),i=Math.min(airportPath.length-2,Math.floor(t)),mix=t-i,a=airportPath[i],b=airportPath[i+1];
   airportRead.geometry.instanceCount=Math.floor(t);
   transferMarker.position.copy(at(THREE.MathUtils.lerp(a[0],b[0],mix),THREE.MathUtils.lerp(a[1],b[1],mix),.14));
   transferMarker.scale.setScalar(7*transferMarker.position.distanceTo(camera.position)/focal);
  }
  for(const {sprite,leader,coordinate,offset,owner} of names){
   sprite.visible=false;leader.visible=false;if(!owner.visible)continue;
   // The airport phase needs an uncluttered western reading.
   if(owner===water&&!waterRegions.get('south')?.visible)continue;
   const anchor=at(coordinate[0],coordinate[1],.1),screen=anchor.clone().project(camera),px=(screen.x+1)*viewport.x/2+offset[0],py=(1-screen.y)*viewport.y/2+offset[1];
   if(screen.z<-1||screen.z>1||screen.x < -1.15||screen.x > 1.15||screen.y < -1.15||screen.y > 1.15)continue;
   const width=owner===rail?190:owner===airport?205:190,x=THREE.MathUtils.clamp(px,width/2+9,viewport.x-width/2-9);
   const y=THREE.MathUtils.clamp(py,75,Math.max(75,viewport.y-120));
   const target=new THREE.Vector3(x/viewport.x*2-1,1-y/viewport.y*2,screen.z).unproject(camera),unit=target.distanceTo(camera.position)/focal;
   sprite.visible=true;sprite.position.copy(target);sprite.scale.set(width*unit,24*unit,1);
   leader.visible=true;const points=leader.geometry.getAttribute('position') as THREE.BufferAttribute;points.setXYZ(0,anchor.x,anchor.y,anchor.z);points.setXYZ(1,target.x,target.y,target.z);points.needsUpdate=true;
  }
  group.userData={kind:'narrated-geographic-relations',mode:state.kind,cities:state.cities,progress:state.progress,source:'/data/narrated-geography.json'};
 }};
}
