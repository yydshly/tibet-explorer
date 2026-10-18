import * as THREE from 'three';
import {GOLD,TEAL,disposeTree,label,line} from './environment';
import {clipLocalLine,clipLocalRing,localDisplayMetres,type LocalCollection,type LocalCoordinate,type LocalDEM,type LocalFeature} from './cityLocalMap';
import {regionalTerrainColour} from './regionalTerrainSurface';
import {routeSampleSegment} from './routeArcLength';
import type {TibetSceneProps} from './sceneTypes';
import type {RegionalJourneyCityId} from '../data/regionalJourneyTypes';
import type {RegionalSpatialInfo,SpatialRoute,SpatialRouteCollection,SpatialLandmark} from './regionalSpatialTypes';
import {decodeEvolutionYears,evolutionCellBounds,type RegionalEvolutionWindow} from '../lib/regionalEvolution';
import {batchRegionalNetwork} from './regionalNetworkBatch';
import {getRegionalJourney} from '../data/regionalJourney';
import {spatialAccessMotion} from '../lib/regionalSpatialState';
export {spatialHistoryYear} from '../lib/regionalSpatialState';

type Runtime={camera:THREE.PerspectiveCamera;project:(lon:number,lat:number,height:number)=>THREE.Vector3;metresPerUnit:number;regionalReady?:Promise<unknown>;regionalMetres:(lon:number,lat:number)=>number|undefined;focus:(p:THREE.Vector3,t:THREE.Vector3,framing?:'viewport'|'local-place')=>void};
export const REGIONAL_SPATIAL_RELIEF=1.8;
export function spatialRouteFor(city:string,routes:SpatialRoute[],cue:number){
 if(city==='nagqu'&&cue===1)return routes.find(route=>route.id==='nagqu-rail-yard'&&route.kind==='railway'&&route.coordinates.length>1);
 const roads=routes.filter(route=>route.kind!=='railway'&&route.coordinates.length>1);
 if(city==='chamdo')return (cue<2?roads.find(route=>route.id==='chamdo-airport-arrival')??roads.find(route=>route.id==='chamdo-airport-transfer'):undefined)??roads.find(route=>route.id==='chamdo-cross-river')??roads[0];
 if((city==='shigatse'&&cue>=2)||(city==='shannan'&&cue===3))return roads.find(route=>route.id.endsWith('station-heritage'))??roads[0];
 return roads.find(route=>route.id.endsWith('station-city'))??roads[0];
}
/** A regional reference never places an unlocated dance, festival or dig at a
 * convenient temple/station. Only the corresponding acquired object is used. */
export function regionalSpatialLandmark(city:string,step:number,cueIndex:number,landmarks:SpatialLandmark[]):SpatialLandmark|undefined {
 const cue=getRegionalJourney(city)?.stages[step]?.cues[cueIndex];
 if(!cue)return;
 if(step===2){
  if(cueIndex===3)return;
  const declared=landmarks.find(item=>item.role==='heritage'&&cue.pointIds.includes(item.id));
  if(declared)return declared;
  if(city==='chamdo'&&cue.id==='chamdo-history-2')return landmarks.find(item=>item.featureId==='way/449021629');
  return;
 }
 if(step===3&&city==='nagqu'&&cueIndex===1)return landmarks.find(item=>item.role==='rail-yard');
 if(step===3&&city==='shannan'&&cueIndex===1)return;
 if(step===3&&city==='chamdo'&&cueIndex<2)return landmarks.find(item=>item.role==='airport-terminal');
 return landmarks.find(item=>item.role==='station-building')??landmarks.find(item=>item.role==='station');
}
export function regionalSpatialUnlocatedLabel(city:string,step:number,cue:number){
 if(step===2){
  if(city==='chamdo'&&cue===0)return '卡若材料 · 未取得遗址实测范围';
  if(city==='chamdo'&&cue===2)return '锅庄传承 · 不定位表演场所';
  if(city==='shannan'&&cue===2)return '藏戏恢复 · 未定位具体社区';
  if(city==='nagqu'&&cue<3)return '恰青赛马会 · 不定位赛场';
 }
 if(step===3&&city==='shannan'&&cue===1)return '货运开办 · 未定位装卸区';
 return '现况城市与区域材料';
}
function polygonGeometry(feature:LocalFeature,bbox:[number,number,number,number],at:(p:LocalCoordinate,offset?:number)=>THREE.Vector3,roof=0){
 const polys=feature.geometry.type==='Polygon'?[feature.geometry.coordinates as LocalCoordinate[][]]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates as LocalCoordinate[][][]:[];
 const vertices:number[]=[];
 for(const poly of polys){const rings=poly.map(ring=>clipLocalRing(ring,bbox)).filter(ring=>ring.length>=3);if(!rings.length)continue;
  const world=rings.map(ring=>ring.map(p=>at(p,1))),flat=world.flat(),faces=THREE.ShapeUtils.triangulateShape(world[0].map(p=>new THREE.Vector2(p.x,p.z)),world.slice(1).map(r=>r.map(p=>new THREE.Vector2(p.x,p.z))));
  for(const face of faces)for(const i of [face[0],face[2],face[1]])vertices.push(flat[i].x,flat[i].y+roof,flat[i].z);
  if(roof)for(const ring of world)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];for(const p of [a,b,a.clone().add(new THREE.Vector3(0,roof,0)),a.clone().add(new THREE.Vector3(0,roof,0)),b,b.clone().add(new THREE.Vector3(0,roof,0))])vertices.push(p.x,p.y,p.z);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
/** Only the selected city loads. All features retain original coordinates/IDs;
 * the historical layer is independent observed pixels, never dated OSM edits. */
export function buildRegionalSpatialMap(runtime:Runtime,city:RegionalJourneyCityId|undefined){
 const group=new THREE.Group();group.name='regional-acquired-city-space';group.visible=false;group.userData.kind='regional-acquired-city-space';
 const abort=new AbortController();let alive=true,data:LocalCollection|undefined,dem:LocalDEM|undefined,grid:Int16Array|undefined,evolution:RegionalEvolutionWindow|undefined,years:Uint16Array|undefined,routes:SpatialRouteCollection|undefined,error='';
 let airport:LocalCollection|undefined;
 let current=false,lastCamera='',lastYear=0,lastRoute='',lastPublish='',route:SpatialRoute|undefined,peripheralError='';
 const buildings=new THREE.Group(),roads=new THREE.Group(),water=new THREE.Group(),land=new THREE.Group(),changes=new THREE.Group(),movement=new THREE.Group(),annotations=new THREE.Group();group.add(land,water,roads,buildings,changes,movement,annotations);
 const bounds=new THREE.Box3(),viewport=new THREE.Vector2();const featureMeshes=new Map<string,THREE.Mesh>();const captionCache=new Map<string,{sprite:THREE.Sprite;leader:THREE.Line;text:string}>();
 const carrier=new THREE.Mesh(new THREE.BoxGeometry(1.4,.9,1),new THREE.MeshStandardMaterial({color:GOLD,roughness:.6}));carrier.userData.kind='same-carrier-on-acquired-road';movement.add(carrier);
 const service=new THREE.Mesh(new THREE.RingGeometry(.8,1,24),new THREE.MeshBasicMaterial({color:TEAL,side:THREE.DoubleSide,depthTest:false}));service.rotation.x=-Math.PI/2;service.userData.kind='source-road-end-use';movement.add(service);
 let trace:THREE.Line|undefined,routeContext:THREE.Line|undefined;let routeWorld:THREE.Vector3[]=[];let evolutionMeshes:THREE.Mesh[]=[];
 const json=async(url:string)=>{const response=await fetch(url,{signal:abort.signal});if(!alive)return;if(!response.ok)throw new Error(`资料读取失败：${url}`);const value=await response.json();return alive?value:undefined;};
 const binary=async(url:string)=>{const response=await fetch(url,{signal:abort.signal});if(!alive)return;if(!response.ok)throw new Error(`资料读取失败：${url}`);const value=await response.arrayBuffer();return alive?value:undefined;};
 const read=(lon:number,lat:number)=>dem&&grid?localDisplayMetres(grid,dem,lon,lat,runtime.regionalMetres):runtime.regionalMetres(lon,lat);
 const supported=(p:LocalCoordinate)=>Number.isFinite(read(p[0],p[1]));
 const at=(p:LocalCoordinate,offset=0)=>{const metres=read(p[0],p[1]);if(!Number.isFinite(metres))throw new Error('地点高程资料不可用，未以海拔零代替');return runtime.project(p[0],p[1],(metres!*REGIONAL_SPATIAL_RELIEF+offset)/runtime.metresPerUnit);};
 const optional=(url:string)=>json(url).catch(()=>undefined);
 const ready=!city?Promise.resolve():Promise.all([json(`/data/regional-places/${city}.geojson`),json(`/data/regional-places/${city}-routes.json`),json('/data/regional-places/terrain/manifest.json'),json('/data/regional-places/evolution-manifest.json'),...(city==='chamdo'?[optional('/data/regional-places/chamdo-airport-routes.json'),optional('/data/regional-places/chamdo-bangda.geojson')]:[])]).then(async(values)=>{
  if(!alive)return;data=values[0];routes=values[1];dem=values[2]?.places.find((item:{id:string})=>item.id===city);evolution=values[3]?.windows.find((item:{id:string})=>item.id===city);
  if(values[4]?.routes&&values[5]?.features){routes={routes:[...(routes?.routes??[]),...values[4].routes],landmarks:[...(routes?.landmarks??[]),...(values[4].landmarks??[])]};airport=values[5];}
  if(!data?.features||!routes?.routes||!dem||!evolution)throw new Error('地方资料结构不完整');
  const [heightBytes,yearBytes]=await Promise.all([binary(dem.dataUrl),binary(evolution.dataUrl)]);if(!alive||!heightBytes||!yearBytes)return;
  if(heightBytes.byteLength!==dem.columns*dem.rows*2)throw new Error('地方高程格网大小不匹配');
  const heights=new DataView(heightBytes);grid=new Int16Array(dem.columns*dem.rows);for(let i=0;i<grid.length;i++)grid[i]=heights.getInt16(i*2,true);
  years=decodeEvolutionYears(yearBytes,evolution);
  await runtime.regionalReady;if(!alive)return;
  build();group.userData.ready=true;
 }).catch(reason=>{if(alive){error=reason instanceof Error?reason.message:'地方资料暂不可用';group.userData.error=error;}});
 function build(){
  if(!data||!dem||!grid)return;const b=dem.bbox,nx=dem.columns,ny=dem.rows,positions:number[]=[],colors:number[]=[],indices:number[]=[];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const lon=b[0]+(b[2]-b[0])*x/(nx-1),lat=b[3]-(b[3]-b[1])*y/(ny-1),m=read(lon,lat)??0,p=at([lon,lat]);positions.push(p.x,p.y,p.z);const c=regionalTerrainColour(m);colors.push(c.r,c.g,c.b);if(x<nx-1&&y<ny-1){const i=y*nx+x;indices.push(i,i+nx,i+1,i+1,i+nx,i+nx+1);}}
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geom.setIndex(indices);geom.computeVertexNormals();geom.computeBoundingBox();const terrain=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));terrain.userData={kind:'regional-fine-source-dem',source:dem.dataUrl,columns:nx,rows:ny,verticalExaggeration:REGIONAL_SPATIAL_RELIEF};land.add(terrain);
  bounds.copy(geom.boundingBox!);
  if(airport){const b=airport.metadata.bbox;if(![[b[0],b[1]],[b[2],b[3]]].every(p=>supported(p as LocalCoordinate))){airport=undefined;peripheralError='区域高程缺失，机场外围与长距离接续暂不显示';}}
  for(const collection of [data,...(airport?[airport]:[])])for(const f of collection.features){
   const c=f.properties.featureClass,polygon=['Polygon','MultiPolygon'].includes(f.geometry.type),isBuilding=c==='building';
   const heritage=routes?.landmarks.some(item=>item.featureId===f.id&&item.role==='heritage');
   if(polygon&&(isBuilding||heritage||['water','landuse','heritage','leisure','airport'].includes(c))){
    const raw=parseFloat(f.properties.tags.height||''),metres=isBuilding?(Number.isFinite(raw)&&raw>0?Math.min(raw,100):8):0;
    const mat=new THREE.MeshStandardMaterial({color:isBuilding?0xc4beaa:c==='water'?0x347987:c==='heritage'||heritage?0xd4ae6c:c==='landuse'?0x686c56:0x58745b,roughness:.9,transparent:!isBuilding,opacity:isBuilding?1:.55,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(polygonGeometry(f,collection.metadata.bbox,at,metres/runtime.metresPerUnit),mat);mesh.userData={kind:isBuilding?'acquired-building-footprint':'acquired-area',featureId:f.id,collectionId:collection.metadata.id,heightScope:isBuilding&&!(Number.isFinite(raw)&&raw>0)?'8m统一显示高度，非实测':undefined};(isBuilding?buildings:c==='water'?water:land).add(mesh);featureMeshes.set(f.id,mesh);
   }else if(f.geometry.type==='LineString'&&['road','railway','waterway','river','airport'].includes(c)){
    const restricted=c==='road'&&(f.properties.tags.highway==='construction'||['no','private'].includes(f.properties.tags.access));
    for(const part of clipLocalLine(f.geometry.coordinates as LocalCoordinate[],collection.metadata.bbox)){const object=line(part.map(p=>at(p,c==='road'?3:2)),restricted?0x59615c:c==='road'?0xb6c4b6:c==='railway'?0xe1cfac:c==='airport'?0xa9bebd:0x69bbca,restricted?.25:c==='road'?.72:.9,restricted);object.userData={kind:'acquired-network-line',featureId:f.id,featureClass:c,collectionId:collection.metadata.id,restricted,scope:restricted?'源图标记施工或限制进入，非已开放道路':undefined};(c==='waterway'||c==='river'?water:roads).add(object);}
   }
  }
  group.userData.networkBatch=batchRegionalNetwork(roads);
 }
 function rebuildYear(year:number){
  if(!evolution||!years)return;disposeTree(changes);evolutionMeshes=[];
  const batches=[[],[]] as number[][];const e=evolution;
  for(let i=0;i<years.length;i++){const detected=years[i];if(detected<1985||detected>year)continue;const {west:w,east:e,north:n,south:s}=evolutionCellBounds(evolution,i);const corners=[[w,n],[e,n],[e,s],[w,s]] as LocalCoordinate[];const batch=batches[detected===1985?0:1];for(const id of [0,2,1,0,3,2])batch.push(...at(corners[id],8).toArray());}
  batches.forEach((batch,index)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(batch,3));const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:index===0?TEAL:0xf0b85d,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.8}));mesh.renderOrder=30;mesh.userData={kind:'actual-wsf-first-detection-pixels',year,baseline:index===0,source:e.dataUrl,pixelCount:batch.length/18};changes.add(mesh);evolutionMeshes.push(mesh);});lastYear=year;
 }
 function setRoute(next:SpatialRoute|undefined){
  route=next;routeWorld=next?.coordinates.map(p=>at(p,5))??[];
  for(const object of [trace,routeContext])if(object){movement.remove(object);object.geometry.dispose();(object.material as THREE.Material).dispose();}trace=routeContext=undefined;
  if(routeWorld.length>1){
   routeContext=line(routeWorld,TEAL,.8);routeContext.userData={kind:'actual-route-geographic-context',routeId:next!.id};routeContext.renderOrder=31;movement.add(routeContext);
   trace=line(routeWorld,GOLD,1);trace.userData={kind:'actual-shared-node-road-route',routeId:next!.id,sourceNodeIds:next!.sourceNodeIds,sourceFeatureIds:next!.featureIds};trace.renderOrder=32;movement.add(trace);
  }lastRoute=next?.id??'';
 }
 function frame(p:TibetSceneProps){
  if(!dem)return;let box=bounds.clone();
  // A route or observed-pixel window selects the view, never an invented city limit.
  if(p.step===3&&routeWorld.length>1)box.setFromPoints(routeWorld);
  else if(p.step===2&&p.regionalCue===3&&evolution){const corners=[[evolution.bounds.west,evolution.bounds.south],[evolution.bounds.east,evolution.bounds.north]] as LocalCoordinate[];if(corners.every(supported)){box.setFromPoints(corners.map(p=>at(p)));box.min.y=bounds.min.y;box.max.y=bounds.max.y;}}
  else if(p.step===2&&routes){const heritage=regionalSpatialLandmark(city!,p.step,p.regionalCue??0,routes.landmarks);if(heritage&&supported(heritage.coordinates)){const c=at(heritage.coordinates),r=city==='shannan'?2700:city==='chamdo'?1900:2500;box.set(c.clone().add(new THREE.Vector3(-r/runtime.metresPerUnit,-200/runtime.metresPerUnit,-r/runtime.metresPerUnit)),c.clone().add(new THREE.Vector3(r/runtime.metresPerUnit,350/runtime.metresPerUnit,r/runtime.metresPerUnit)));}}
  const wide=viewport.x>900;
  box.expandByScalar(350/runtime.metresPerUnit);const centre=box.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(0,1.25,1).normalize(),up=new THREE.Vector3(0,direction.z,-direction.y),right=new THREE.Vector3(1,0,0),sidebar=wide?338:0,top=wide?170:95,bottom=Math.max(top+100,viewport.y-(wide?230:105)),tan=Math.tan(runtime.camera.fov*Math.PI/360),tanX=tan*viewport.x/viewport.y*Math.max(80,(viewport.x-sidebar-65)/2)/(viewport.x/2),tanY=tan*Math.max(60,(bottom-top)/2)/(viewport.y/2);let distance=.01;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).sub(centre),depth=v.dot(direction);distance=Math.max(distance,Math.abs(v.x)/tanX+depth,Math.abs(v.dot(up))/tanY+depth);}
  const target=centre.clone().addScaledVector(up,-(1-(top+bottom)/viewport.y)*distance*tan).addScaledVector(right,-sidebar/viewport.x*distance*tan*viewport.x/viewport.y);runtime.focus(target.clone().addScaledVector(direction,distance*1.05),target,'local-place');
 }
 function caption(slot:number,text:string,anchor:THREE.Vector3){
  let entry=captionCache.get(String(slot));if(entry?.text!==text){if(entry){annotations.remove(entry.sprite,entry.leader);disposeTree(new THREE.Group().add(entry.sprite,entry.leader));}const sprite=label(text,'#f0e7c5');sprite.onBeforeRender=()=>{};sprite.renderOrder=45;const leader=line([anchor,anchor],GOLD,.6);(leader.material as THREE.LineBasicMaterial).depthTest=false;entry={sprite,leader,text};captionCache.set(String(slot),entry);annotations.add(sprite,leader);}
  const wide=viewport.x>900,left=wide?350:12,width=Math.min(340,text.length*13+30),x=left+width/2,y=(wide?180:115)+slot*29,point=new THREE.Vector3(THREE.MathUtils.clamp(x,left+width/2,viewport.x-width/2-15)/viewport.x*2-1,1-y/viewport.y*2,.5).unproject(runtime.camera),focal=viewport.y/(2*Math.tan(runtime.camera.fov*Math.PI/360)),scale=point.distanceTo(runtime.camera.position)/focal;
  entry.sprite.position.copy(point);entry.sprite.scale.set(width*scale,22*scale,1);entry.sprite.visible=entry.leader.visible=true;const attr=entry.leader.geometry.attributes.position as THREE.BufferAttribute;attr.setXYZ(0,anchor.x,anchor.y,anchor.z);attr.setXYZ(1,point.x,point.y,point.z);attr.needsUpdate=true;entry.leader.geometry.computeBoundingSphere();
 }
 return {group,ready,
  active(){return current&&dem?{bounds,bbox:dem.bbox}:undefined;},
  update(p:TibetSceneProps,size:THREE.Vector2){
   viewport.copy(size);current=Boolean(alive&&group.userData.ready&&city&&data&&dem&&grid&&p.layer==='atlas-regional-journey'&&p.regionalCloseView&&p.step>=2);group.visible=current;
   const publish=(info:RegionalSpatialInfo)=>{const key=JSON.stringify(info);if(key!==lastPublish&&alive){lastPublish=key;p.onRegionalSpatialInfo?.(info);}};
   if(!city)return;if(!current){lastCamera='';publish({cityId:city,status:error?'error':group.userData.ready?'ready':'loading',active:false,error:error||undefined});return;}
   const historySupported=evolution&&supported([evolution.bounds.west,evolution.bounds.south])&&supported([evolution.bounds.east,evolution.bounds.north]);
   const spatialHistory=Boolean(historySupported&&p.step===2&&(p.regionalCue===3||p.regionalSpatialYear!==undefined)),year=p.regionalSpatialYear??1985;
   buildings.visible=!spatialHistory;changes.visible=spatialHistory&&p.regionalProcess!==false;if(spatialHistory&&lastYear!==year)rebuildYear(year);
   const candidate=p.step===3?spatialRouteFor(city,routes!.routes,p.regionalCue??0):undefined,routeSupported=candidate?.coordinates.every(supported),nextRoute=routeSupported?candidate:undefined;
   if(candidate&&!routeSupported)peripheralError='区域高程缺失，外围接续暂不显示';
   if(nextRoute?.id!==lastRoute)setRoute(nextRoute);
   const cameraKey=`${p.step}:${p.regionalCue}:${size.x}:${size.y}:${p.resetKey}`;if(lastCamera!==cameraKey){lastCamera=cameraKey;frame(p);}
   const freight=city==='nagqu'&&p.step===3&&p.regionalCue===1,unlocatedFreight=city==='shannan'&&p.step===3&&p.regionalCue===1;
   movement.visible=p.step===3&&!unlocatedFreight&&p.regionalProcess!==false;const transfer=p.regionalAccessTransfer!==false,motion=transfer?spatialAccessMotion(getRegionalJourney(city)?.stages[p.step]?.cues[p.regionalCue??0],p.progress):0;
   let holder=p.step===2?spatialHistory?`截至${year}年聚居检出`:'历史材料与现况地图对照，未复原旧城':transfer?'抵达后等待地方接续':'已暂停地方接续';carrier.visible=movement.visible&&routeWorld.length>1;
   if(carrier.visible){const pose=routeSampleSegment(routeWorld,motion),a=routeWorld[pose.index-1],b=routeWorld[pose.index];carrier.position.copy(a).lerp(b,pose.fraction);carrier.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);const focal=size.y/(2*Math.tan(runtime.camera.fov*Math.PI/360)),scale=carrier.position.distanceTo(runtime.camera.position)/focal*8;carrier.scale.setScalar(scale);carrier.position.y+=scale;holder=!transfer?'已暂停地方接续':motion===0?'实际道路起点 · 端点缺段保留':motion>=1?'实际道路末端 · 地方使用':'沿原始相连道路接续';carrier.userData={...carrier.userData,routeId:route?.id,holder,progress:motion,sourceWayIds:route?.featureIds};}
   if(freight){holder=transfer?'货运读图沿现状侧线 · 非客运或物流园边界':'已暂停货运侧线读图';carrier.userData={...carrier.userData,holder,mode:'freight-reading',notLogisticsParkBoundary:true};}else carrier.userData.mode='road-transfer-reading';
   if(unlocatedFreight)holder='未取得货运装卸区边界，客站不作货场';
   if(peripheralError&&!routeSupported)holder=peripheralError;
   if(trace)trace.geometry.setDrawRange(0,Math.max(2,Math.round(routeWorld.length*motion)));service.visible=movement.visible&&!freight&&motion>=1&&routeWorld.length>1;if(service.visible){service.position.copy(routeWorld.at(-1)!);const k=carrier.scale.x;service.scale.setScalar(k*2);}
   for(const mesh of featureMeshes.values()){const material=mesh.material as THREE.MeshStandardMaterial;material.emissive?.set(0x000000);}
   const declaredLandmark=regionalSpatialLandmark(city,p.step,p.regionalCue??0,routes!.landmarks),landmark=declaredLandmark&&supported(declaredLandmark.coordinates)?declaredLandmark:undefined;
   const focused=landmark&&featureMeshes.get(landmark.featureId);if(focused)(focused.material as THREE.MeshStandardMaterial).emissive.set(0x6f5121).multiplyScalar(.3+.5*p.progress);
   for(const entry of captionCache.values())entry.sprite.visible=entry.leader.visible=false;
   const anchor=landmark?at(landmark.coordinates,18):bounds.getCenter(new THREE.Vector3());
   if(spatialHistory){caption(0,`截至${year}年已检出 · ${evolution?.cumulativePixelCounts[String(year)]??0}像元`,anchor);caption(1,'青：1985已检出 · 金：后续首次检出',anchor);caption(2,'30米遥感像元 ≠ 建筑建成年份',anchor);}
   else if(p.step===3&&route&&!unlocatedFreight){
    if(city==='chamdo'&&(p.regionalCue??0)<2&&route.id==='chamdo-airport-arrival'){
     caption(0,'邦达机场 · 长途到达入口',routeWorld[0]);caption(1,'昌都城区 · 仍需地面接续',routeWorld.at(-1)!);caption(2,'青：源道路全程 · 金：当前接续',carrier.position);
    }else{caption(0,route.title,routeWorld[0]??anchor);caption(1,city==='shigatse'&&p.regionalCue===1?'客站后接续 · 货运另在日喀则西站':holder,carrier.visible?carrier.position:anchor);caption(2,freight?'现况轨道参照 · 非2009年工程范围':`端点未连约${Math.round(route.startGapMetres)}/${Math.round(route.endGapMetres)}米`,routeWorld.at(-1)??anchor);}
   }
   else{caption(0,landmark?.name??regionalSpatialUnlocatedLabel(city,p.step,p.regionalCue??0),anchor);caption(1,unlocatedFreight?'报道记述站对侧 · 不绘制货场范围':peripheralError||p.regionalGuide?.title||(landmark?'现状轮廓定位历史事件':'地区背景保留 · 材料未定位建筑'),anchor);caption(2,unlocatedFreight?'现况客站建筑不作货场':p.regionalGuide?.effect??'建筑未标高度时统一8米显示',anchor);}
   group.userData={...group.userData,cityId:city,spatialHistory,year,routeId:route?.id,holder,historicalOSMGeometryChanged:false,peripheralUnavailable:peripheralError||undefined};
   publish({cityId:city,status:'ready',active:true,error:peripheralError||undefined,year:spatialHistory?year:undefined,pixels:spatialHistory?evolution?.cumulativePixelCounts[String(year)]:undefined,phase:holder,routeTitle:p.step===3&&!unlocatedFreight?route?.title:undefined,routeKind:route?.kind,routeMetres:route?.geometryLengthMetres??route?.geometryLengthMeters,startGap:route?.startGapMetres,endGap:route?.endGapMetres,bbox:dem!.bbox,acquiredAt:data!.metadata.acquiredAt,roadCount:data!.features.filter(f=>f.properties.featureClass==='road').length,buildingCount:data!.features.filter(f=>f.properties.featureClass==='building').length,featureId:landmark?.featureId,featureName:landmark?.name??(spatialHistory?'原始遥感检出窗口':regionalSpatialUnlocatedLabel(city,p.step,p.regionalCue??0))});
  },
  dispose(){if(!alive)return;alive=false;abort.abort();disposeTree(group);captionCache.clear();featureMeshes.clear();current=false;},
 };
}
