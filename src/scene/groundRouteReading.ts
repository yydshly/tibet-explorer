import * as THREE from 'three';
import {label,GOLD,TEAL,line} from './environment';
import type {GroundJourneyState} from '../lib/groundJourney';

type Point=[number,number];
type Feature={id:string;properties:{tags:Record<string,string>};geometry:{type:string;coordinates:unknown}};
type Connection={coordinates:Point[];sourceWayIdsByEdge?:string[];endpointScope:string};
const edge=(a:Point,b:Point)=>[a.join(','),b.join(',')].sort().join('|');
// Reading widths and markers are screen aids. Every bend stays on the source
// geometry; no bridge deck height, tunnel depth or station-door link is inferred.
function ribbon(points:THREE.Vector3[],width:number,color:number,dashed=false){
 const vertices:number[]=[];
 for(let i=1;i<points.length;i++){
  if(dashed&&i%3===0)continue;
  const a=points[i-1],b=points[i],side=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(width/2);
  const quad=[a.clone().add(side),a.clone().sub(side),b.clone().add(side),b.clone().sub(side)];
  for(const k of [0,1,2,2,1,3])vertices.push(quad[k].x,quad[k].y,quad[k].z);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));mesh.renderOrder=6;return mesh;
}
/** Preserve source edges, including tunnel tags. A cursor is an observation
 * position, never a train, timetable or reconstructed engineering alignment. */
export function createGroundRouteReading(coordinates:Point[],features:Feature[],toWorld:(p:Point,offset?:number)=>THREE.Vector3,metresPerUnit:number,verticalExaggeration:number,connection?:Connection){
 if(coordinates.length<2)throw new Error('拉萨站前相连铁路资料缺失');
 const group=new THREE.Group(),sources=new Map<string,Feature>(),m=1/metresPerUnit;
 for(const feature of features)if(feature.geometry.type==='LineString'&&feature.properties.tags.railway==='rail'){
  const points=feature.geometry.coordinates as Point[];for(let i=1;i<points.length;i++)sources.set(edge(points[i-1],points[i]),feature);
 }
 const points=coordinates.map(p=>toWorld(p,9)),lengths=[0];
 const strokes:THREE.Line[]=[];
 for(let i=1;i<points.length;i++){
  const source=sources.get(edge(coordinates[i-1],coordinates[i]));if(!source)throw new Error('铁路出现无来源接续');
  const tunnel=source.properties.tags.tunnel==='yes';
  const material=tunnel?new THREE.LineDashedMaterial({color:0xeec887,dashSize:22*m,gapSize:15*m,depthTest:false,fog:false,toneMapped:false}):new THREE.LineBasicMaterial({color:TEAL,depthTest:false,fog:false,toneMapped:false});
  // Densify along the original segment to drape the reading on the DEM.
  const distance=Math.hypot((coordinates[i][0]-coordinates[i-1][0])*Math.cos(coordinates[i][1]*Math.PI/180),coordinates[i][1]-coordinates[i-1][1])*111320;
  lengths.push(lengths[i-1]+distance);
  const n=Math.max(1,Math.ceil(distance/25)),dense=Array.from({length:n+1},(_,k)=>toWorld([THREE.MathUtils.lerp(coordinates[i-1][0],coordinates[i][0],k/n),THREE.MathUtils.lerp(coordinates[i-1][1],coordinates[i][1],k/n)],9));
  const stroke=new THREE.Line(new THREE.BufferGeometry().setFromPoints(dense),material);stroke.computeLineDistances();stroke.renderOrder=5;
  stroke.userData={sourceId:source.id,tunnel,bridge:source.properties.tags.bridge==='yes',scope:tunnel?'隧道水平投影；非地表铁轨或工程纵断面':'真实中心线贴地阅读；非轨面测量'};strokes.push(stroke);group.add(stroke);
  if(!tunnel){
    const vertices:number[]=[],outlineVertices:number[]=[];
    for(let j=1;j<dense.length;j++){
      const a=dense[j-1],b=dense[j],side=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(24*m);
      const quad=[a.clone().add(side),a.clone().sub(side),b.clone().add(side),b.clone().sub(side)];
      for(const k of [0,1,2,2,1,3])vertices.push(quad[k].x,quad[k].y,quad[k].z);
      const outer=side.clone().multiplyScalar(36/24),outline=[a.clone().add(outer),a.clone().sub(outer),b.clone().add(outer),b.clone().sub(outer)];
      for(const k of [0,1,2,2,1,3])outlineVertices.push(outline[k].x,outline[k].y,outline[k].z);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const band=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:TEAL,side:THREE.DoubleSide,depthTest:false,fog:false,toneMapped:false}));band.renderOrder=4;band.userData.kind='readable-route-band-not-measured-width';stroke.userData.band=band;group.add(band);
    const outlineGeometry=new THREE.BufferGeometry();outlineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(outlineVertices,3));
    const outline=new THREE.Mesh(outlineGeometry,new THREE.MeshBasicMaterial({color:0x172b29,side:THREE.DoubleSide,depthTest:false,fog:false,toneMapped:false}));outline.renderOrder=3;outline.userData.kind='route-contrast-outline-not-measured-width';group.add(outline);
  }else{
    const band=ribbon(dense,48*m,0xeec887,true);band.userData.kind='dashed-tunnel-horizontal-projection';stroke.userData.band=band;group.add(band);
  }

 }
 const tunnelIndices=strokes.flatMap((stroke,i)=>stroke.userData.tunnel?[i]:[]);
 const tunnelMiddle=tunnelIndices.length?(lengths[tunnelIndices[0]]+lengths[tunnelIndices.at(-1)!+1])/2:0;
 const bridges:{start:number;end:number}[]=[];
 strokes.forEach((stroke,i)=>{if(!stroke.userData.bridge||lengths[i]>=tunnelMiddle)return;const previous=bridges.at(-1);if(previous?.end===lengths[i])previous.end=lengths[i+1];else bridges.push({start:lengths[i],end:lengths[i+1]});});
 const mainBridge=bridges.sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
 const bridgeMiddle=mainBridge?(mainBridge.start+mainBridge.end)/2:0;
 const total=lengths.at(-1)!;
 strokes.forEach((stroke,i)=>{const selectId=`ground-rail:${(lengths[i]+lengths[i+1])/2/total}`;stroke.userData.selectId=selectId;if(stroke.userData.band)stroke.userData.band.userData.selectId=selectId;});
 const cursor=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xfff3be,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));cursor.renderOrder=9;cursor.userData.kind='narration-reading-position-not-vehicle';group.add(cursor);
 const cursorRing=new THREE.Mesh(new THREE.RingGeometry(1.4,1.8,32),new THREE.MeshBasicMaterial({color:GOLD,side:THREE.DoubleSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));cursorRing.rotation.x=-Math.PI/2;cursorRing.renderOrder=8;group.add(cursorRing);
 const anchors:[string,Point][]=[['拉萨站 · 铁路抵达','way/122707268'],['柳梧大桥 · 跨越拉萨河','way/122707217']].flatMap(([name,id])=>{
  const feature=features.find(f=>f.id===id);if(!feature)return [];
  const coords=(feature.geometry.type==='Polygon'?(feature.geometry.coordinates as Point[][])[0]:feature.geometry.coordinates) as Point[];
  const bounds=new THREE.Box2().setFromPoints(coords.map(p=>new THREE.Vector2(...p))),centre=bounds.getCenter(new THREE.Vector2());
  return [[name,[centre.x,centre.y]] as [string,Point]];
 });
 const coordinateAt=(d:number):Point=>{let i=lengths.findIndex((length,k)=>k>0&&length>=d);if(i<1)i=lengths.length-1;const t=(d-lengths[i-1])/(lengths[i]-lengths[i-1]);return [THREE.MathUtils.lerp(coordinates[i-1][0],coordinates[i][0],t),THREE.MathUtils.lerp(coordinates[i-1][1],coordinates[i][1],t)];};
 if(mainBridge)anchors.push(['铁路桥段 · 跨越河流',coordinateAt(bridgeMiddle)]);
 if(tunnelIndices.length)anchors.push(['隧道 · 仅水平投影',coordinateAt(tunnelMiddle)]);
 // Use the archived, directional station-side road chain. Its start is a road
 // node, not a station entrance; retain the gap between rail and road.
 const roadGroup=new THREE.Group();roadGroup.userData={kind:'archived-station-city-connection',sourceWayIdsByEdge:connection?.sourceWayIdsByEdge,coordinates:connection?.coordinates,scope:connection?.endpointScope};group.add(roadGroup);
 const roadLengths=[0],roadStrokes:THREE.Mesh[]=[];
 if(connection){
  if(connection.coordinates.length<2||connection.sourceWayIdsByEdge?.length!==connection.coordinates.length-1)throw new Error('道路接续缺少逐段来源');
  for(let i=1;i<connection.coordinates.length;i++){
   const a=connection.coordinates[i-1],b=connection.coordinates[i],distance=Math.hypot((b[0]-a[0])*Math.cos(b[1]*Math.PI/180),b[1]-a[1])*111320,n=Math.max(1,Math.ceil(distance/25));
   roadLengths.push(roadLengths[i-1]+distance);
   const dense=Array.from({length:n+1},(_,k)=>toWorld([THREE.MathUtils.lerp(a[0],b[0],k/n),THREE.MathUtils.lerp(a[1],b[1],k/n)],12));
   const mesh=ribbon(dense,52*m,0xefb563);mesh.userData={sourceId:connection.sourceWayIdsByEdge[i-1],kind:'source-road-reading-not-traffic'};roadStrokes.push(mesh);roadGroup.add(mesh);
  }
  anchors.push(['道路接续 · 原始路端',connection.coordinates[0]],['对岸城区 · 原始路端',connection.coordinates.at(-1)!]);
 }
 const station=features.find(f=>f.id==='way/122707268'&&f.geometry.type==='Polygon');
 const stationOutline=station?ribbon((station.geometry.coordinates as Point[][])[0].map(p=>toWorld(p,12)),38*m,GOLD):undefined;
 if(stationOutline){stationOutline.userData={kind:'source-station-footprint',sourceId:station!.id};group.add(stationOutline);}
 const focusEnds=new THREE.Group();group.add(focusEnds);
 const endpoints=[mainBridge?[mainBridge.start,mainBridge.end]:[],tunnelIndices.length?[lengths[tunnelIndices[0]],lengths[tunnelIndices.at(-1)!+1]]:[]].map((ends,k)=>ends.map(d=>{
  const pin=new THREE.Mesh(new THREE.CylinderGeometry(18*m,18*m,160*m,12),new THREE.MeshBasicMaterial({color:k?0xeec887:TEAL,depthTest:false,fog:false,toneMapped:false}));pin.position.copy(toWorld(coordinateAt(d),80));pin.renderOrder=7;pin.userData={kind:'source-segment-endpoint-not-engineering-height',distance:d};focusEnds.add(pin);return pin;
 }));
 const tags=anchors.map(([name,point])=>{const sprite=label(name,'#f0e2b8'),leader=line([toWorld(point),toWorld(point,120)],GOLD,.75);sprite.onBeforeRender=()=>{};sprite.renderOrder=8;group.add(sprite,leader);return {sprite,leader,point};});
 const stops=[{id:'entry',title:'河谷入口',progress:0},{id:'crossing',title:'铁路跨河',progress:bridgeMiddle/total},{id:'tunnel',title:'山体与隧道',progress:tunnelMiddle/total},{id:'station',title:'站区抵达',progress:1}];
 group.userData={kind:'source-connected-railway-inspection',coordinates,lengths,stops,sourceIds:strokes.map(s=>s.userData.sourceId),scope:'当前OSM青藏线拉萨站前片段；不是拉林全线、历史路线或导航'};
 let cameraKey='';
 return {group,update(state:GroundJourneyState,camera:THREE.PerspectiveCamera,viewport:THREE.Vector2){
  const fractionProgress=THREE.MathUtils.clamp(state.progress,0,1),distance=state.railPhase==='river'?fractionProgress*bridgeMiddle:state.railPhase==='crossing'?bridgeMiddle:state.railPhase==='mountain'?bridgeMiddle+(tunnelMiddle-bridgeMiddle)*fractionProgress:state.railPhase==='approach'?fractionProgress*tunnelMiddle:state.railPhase==='tunnel'?tunnelMiddle:state.railPhase==='arrival'?tunnelMiddle+(total-tunnelMiddle)*fractionProgress:fractionProgress*total;
  let index=lengths.findIndex((v,i)=>i>0&&v>=distance);if(index<1)index=lengths.length-1;
  const fraction=(distance-lengths[index-1])/(lengths[index]-lengths[index-1]);
  const location:Point=[THREE.MathUtils.lerp(coordinates[index-1][0],coordinates[index][0],fraction),THREE.MathUtils.lerp(coordinates[index-1][1],coordinates[index][1],fraction)];
  const ground=toWorld(location,0);ground.y/=verticalExaggeration;
  // Source-node density varies. A short arc-length look-ahead avoids a camera
  // yaw jump at each vertex without smoothing or changing the railway itself.
  const sample=(d:number)=>{const clamped=THREE.MathUtils.clamp(d,0,total);let i=lengths.findIndex((v,k)=>k>0&&v>=clamped);if(i<1)i=lengths.length-1;return points[i-1].clone().lerp(points[i],(clamped-lengths[i-1])/(lengths[i]-lengths[i-1]));};
  const direction=sample(distance+180).sub(sample(distance-180));direction.y=0;direction.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),state.bearing*Math.PI/180);
  // The acquired image has 10m pixels. Keep at most ~1.5 screen pixels per
  // source pixel at the target plane, rather than enlarging a blurred patch.
  // This changes framing, never source resolution, terrain or railway geometry.
  const readableDistance=Math.min(6000,viewport.y*10/(2*Math.tan(camera.fov*Math.PI/360)*1.5));
  // At a source bridge/tunnel stop, an oblique overhead view makes its two
  // endpoints and the intervening river/mountain legible in the same frame.
  const inspectSegment=state.railPhase==='crossing'||state.railPhase==='tunnel'||state.lookAt==='crossing'||state.lookAt==='tunnel';
  const back=inspectSegment?state.height*2.2:state.height>=500?Math.max(state.height*.6,Math.sqrt(Math.max(0,readableDistance**2-state.height**2))):state.height>20?300:0;
  const position=ground.clone().add(new THREE.Vector3(0,state.height*m,0)).addScaledVector(direction,-back*m);
  // Look along the valley rather than into a few pixels immediately below the
  // camera. Height changes preserve a continuous viewing direction.
  const lead=state.stage&&state.railPhase?(['crossing','tunnel'].includes(state.railPhase)?0:1100*Math.sin(Math.PI*fractionProgress)):1100;
  const target=ground.clone().addScaledVector(direction,lead*m);target.y+=state.height<20?state.height*m*.8:0;
  if(state.lookAt){
    const prefix={station:'拉萨站',river:'柳梧大桥',crossing:'铁路桥段',tunnel:'隧道'}[state.lookAt];
    const anchor=anchors.find(([title])=>title.startsWith(prefix));
    if(anchor){target.copy(toWorld(anchor[1],0));target.y/=verticalExaggeration;}
  }else if(state.connectionMix){
    const anchor=anchors.find(([title])=>title.startsWith('柳梧大桥'));
    if(anchor){const river=toWorld(anchor[1],0);river.y/=verticalExaggeration;target.lerp(river,THREE.MathUtils.clamp(state.connectionMix,0,1));}
  }
  const focal=viewport.y/(2*Math.tan(camera.fov*Math.PI/360));
  const crossingFocus=state.railPhase==='crossing'||state.lookAt==='crossing',tunnelFocus=state.railPhase==='tunnel'||state.lookAt==='tunnel';
  let traceDistance=distance;
  if(state.railPhase&&state.traceProgress!==undefined){
   if(crossingFocus&&mainBridge)traceDistance=THREE.MathUtils.lerp(mainBridge.start,mainBridge.end,state.traceProgress);
   if(tunnelFocus&&tunnelIndices.length)traceDistance=THREE.MathUtils.lerp(lengths[tunnelIndices[0]],lengths[tunnelIndices.at(-1)!+1],state.traceProgress);
  }
  let cursorPoint=toWorld(coordinateAt(traceDistance),30);
  const roadAmount=state.lookAt==='river'?1:state.connectionMix??0,roadTotal=roadLengths.at(-1)!;
  roadGroup.visible=roadAmount>0&&state.returnMix<.05;
  roadStrokes.forEach((mesh,i)=>{const progress=THREE.MathUtils.clamp((roadAmount*roadTotal-roadLengths[i])/(roadLengths[i+1]-roadLengths[i]),0,1);mesh.geometry.setDrawRange(0,Math.floor(mesh.geometry.attributes.position.count*progress/6)*6);});
  if(roadAmount>0&&connection){
   const d=roadAmount*roadTotal;let i=roadLengths.findIndex((v,k)=>k>0&&v>=d);if(i<1)i=roadLengths.length-1;
   const t=(d-roadLengths[i-1])/(roadLengths[i]-roadLengths[i-1]),a=connection.coordinates[i-1],b=connection.coordinates[i];
   cursorPoint=toWorld([THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)],30);
  }
  cursor.position.copy(cursorPoint);cursor.visible=cursorRing.visible=state.height>50&&state.returnMix<.05;
  const world=cursorPoint.clone();world.y/=verticalExaggeration;
  const pixelUnit=world.distanceTo(camera.position)/focal;
  cursor.scale.set(6*pixelUnit,6*pixelUnit*verticalExaggeration,6*pixelUnit);cursorRing.position.copy(cursorPoint);cursorRing.scale.setScalar(8*pixelUnit);
  endpoints.forEach((pair,k)=>pair.forEach(pin=>pin.visible=state.returnMix<.05&&(k?tunnelFocus:crossingFocus)));
  if(stationOutline)stationOutline.visible=state.returnMix<.05&&(state.stage==='station'||state.stage==='city'||state.lookAt==='station'||state.lookAt==='river');
  strokes.forEach((stroke,i)=>{const color=lengths[i+1]<=traceDistance?GOLD:TEAL;(stroke.material as THREE.LineBasicMaterial).color.set(stroke.userData.tunnel?0xeec887:color);if(stroke.userData.band)stroke.userData.band.material.color.set(stroke.userData.tunnel?0xeec887:color);});
  group.userData.visualReading={traceDistance,roadAmount,roadTotal,connectionVisible:roadGroup.visible,crossingFocus,tunnelFocus};
  const occupied:{x:number;y:number}[]=[];
  tags.forEach(({sprite,leader,point},i)=>{
    const world=toWorld(point,75);world.y/=verticalExaggeration;
    const unit=world.distanceTo(camera.position)/focal,projected=world.clone().project(camera);
    const relevant=i===0||i===1&&(state.stage==='station'||roadAmount>0)||i===2&&(state.stage==='river'||crossingFocus||strokes[index-1].userData.bridge)||i===3&&(state.stage==='tunnel'||tunnelFocus||strokes[index-1].userData.tunnel)||i>=4&&roadAmount>0;
    sprite.visible=leader.visible=Boolean(relevant)&&state.returnMix<.05&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.78&&projected.y<.55&&projected.y>-.45;
    if(!sprite.visible)return;
    let y=projected.y+70/viewport.y;const x=projected.x*viewport.x/2;
    for(let attempt=0;attempt<3&&occupied.some(p=>Math.abs(p.x-x)<186&&Math.abs(p.y-y*viewport.y/2)<29);attempt++)y+=60/viewport.y;
    if(y>.62){sprite.visible=leader.visible=false;return;}
    occupied.push({x,y:y*viewport.y/2});projected.y=y;const display=projected.unproject(camera);display.y*=verticalExaggeration;
    sprite.position.copy(display);sprite.scale.set(180*unit,25*unit*verticalExaggeration,1);
    const linePoints=leader.geometry.attributes.position as THREE.BufferAttribute;const bottom=toWorld(point,9);linePoints.setXYZ(0,bottom.x,bottom.y,bottom.z);linePoints.setXYZ(1,display.x,display.y,display.z);linePoints.needsUpdate=true;leader.geometry.computeBoundingSphere();
  });
  const key=JSON.stringify([state,viewport.x,viewport.y]);const changed=key!==cameraKey;cameraKey=key;
  group.userData.reading={longitude:location[0],latitude:location[1],distanceMetres:distance,totalMetres:total,tunnel:strokes[index-1].userData.tunnel,bridge:strokes[index-1].userData.bridge,surfaceMetres:ground.y/m,height:state.height,stops};
  return {position,target,changed};
 }};
}
