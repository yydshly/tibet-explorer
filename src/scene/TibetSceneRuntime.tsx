import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addMarker, createTerrain, curvedLine, disposeTree, GOLD, IVORY, label, landscapeHorizon, latLon, line, makeStars, mineralTexture, places, TEAL, terrainHeight } from './environment';
import {buildNarrationAnnotations,type NarrationGuideState} from './narrationAnnotations';
import {connectionCameraViews} from '../data/connectionUnderstanding';
import {localMapNearPlane,updateLocalMapDepth} from './mapCameraDepth';
import {longTermEnergyState} from '../lib/longTermEnergyState';

export type {SceneName,TibetSceneProps} from './sceneTypes';
import type {SceneName,TibetSceneProps} from './sceneTypes';

type CameraView={scene:SceneName;position:THREE.Vector3;target:THREE.Vector3;viewport?:THREE.Vector2;homeFramingDistance?:number;earthFramingAspect?:number;processFramingAspect?:number};
// In-memory only: retain an explored view when a chapter or the scene component is revisited.
const cameraViewCache=new Map<string,CameraView>();
type SceneModel = { group:THREE.Group; update:(props:TibetSceneProps,time:number,dt:number)=>void; ready?:Promise<unknown>; renderOverlay?:(world:THREE.Scene)=>void; dispose?:()=>void };
type Runtime = {
  renderer:THREE.WebGLRenderer; world:THREE.Scene; camera:THREE.PerspectiveCamera; controls:OrbitControls;
  model:SceneModel|null; sun:THREE.DirectionalLight; stars:THREE.Points; initialPosition:THREE.Vector3; initialTarget:THREE.Vector3;homeFramingDistance?:number;
  annotations?:ReturnType<typeof buildNarrationAnnotations>;
  earthFramingAspect?:number;
  processFramingAspect?:number;
  localMapDepth?:boolean;
  transition?:{started:number;duration:number;from:THREE.Vector3;to:THREE.Vector3;fromTarget:THREE.Vector3;toTarget:THREE.Vector3};
};
type MapRuntime={renderer:THREE.WebGLRenderer;camera:THREE.PerspectiveCamera;sun:THREE.DirectionalLight;hasSavedView:(key:string)=>boolean;isActive:()=>boolean;focus:(position:THREE.Vector3,target:THREE.Vector3,framing?:'viewport'|'local-place'|'recorded')=>void};
type SceneFactory=(props:TibetSceneProps,runtime:Runtime,mapRuntime:MapRuntime)=>SceneModel;
// Cache code, never scene instances or their WebGL resources. Imports are started
// only for the active scene; the home map still loads its real Three.js model.
const sceneFactories=new Map<string,SceneFactory>();
const pendingFactories=new Map<string,Promise<SceneFactory>>();
const sceneLoaders:Record<string,()=>Promise<SceneFactory>>={
  'story-atlas':()=>import('./storyAtlas').then(module=>(props,_runtime,map)=>module.buildStoryAtlasScene(map,{localDetails:props.overviewLocalContext||props.viewKey!=='atlas-home'&&props.layer!=='atlas-regional-journey'&&props.layer!=='atlas-overview',overviewMesh:props.viewKey==='atlas-home',requireElevation:props.layer==='atlas-overview'||props.overviewLocalContext,macroOverviewLocal:props.overviewLocalContext,irrigationView:Boolean(props.overviewIrrigation),groundView:Boolean(props.groundJourney),regionalCityId:props.layer==='atlas-regional-journey'?props.selected.replace(/^city:/,'') as 'shigatse'|'shannan'|'chamdo'|'nagqu':undefined})),
  'terrain-reading':()=>import('./terrainReading').then(module=>(props,_runtime,map)=>module.buildTerrainReadingScene(map,{regional:['E1','E2'].includes(props.viewKey||'')})),
  'local-landscape':()=>import('./localLandscape').then(module=>(_props,_runtime,map)=>module.buildLocalLandscapeScene(map)),
  'potala-study':()=>import('./palaceStudy').then(module=>(_props,_runtime,map)=>module.buildPalaceStudyScene(map)),
  'plateau-climate':()=>import('./plateauClimateScene').then(module=>(_props,_runtime,map)=>module.buildPlateauClimateScene(map)),
  'energy-balance':()=>import('./energyBalance').then(module=>(_props,_runtime,map)=>module.buildEnergyBalanceScene(map)),
  'air-height':()=>import('./airHeight').then(module=>(_props,_runtime,map)=>module.buildAirHeightScene(map)),
  'mountain-cloud':()=>import('./mountainCloud').then(module=>(_props,_runtime,map)=>module.buildMountainCloudScene(map)),
  'connection-processes':()=>import('./connectionProcesses').then(module=>(_props,_runtime,map)=>module.buildConnectionProcessesScene(map)),
  'travel-understanding':()=>import('./travelUnderstandingScene').then(module=>(_props,_runtime,map)=>module.buildTravelUnderstandingScene(map)),
  'railway-engineering':()=>import('./railwayEngineering').then(module=>(_props,_runtime,map)=>module.buildRailwayEngineeringScene(map)),
  'development-systems':()=>import('./developmentSystems').then(module=>(_props,_runtime,map)=>module.buildDevelopmentSystemsScene(map)),
  'living-landscape':()=>import('./livingLandscape').then(module=>(_props,_runtime,map)=>module.buildLivingLandscapeScene(map)),
  'landform-process':()=>import('./landformProcess').then(module=>(_props,_runtime,map)=>module.buildLandformProcessScene(map)),
  'history-inquiry':()=>import('./historyInquiry').then(module=>(_props,_runtime,map)=>module.buildHistoryInquiryScene(map)),
  earth:()=>import('./earthOrientation').then(module=>(_props,runtime,map)=>module.buildEarthOrientation({...map,focus:(position,target)=>{
    if(!map.isActive())return;
    const aspect=earthFitAspect(runtime.camera.aspect),framed=earthFramedPosition(position,target,1,aspect);
    runtime.earthFramingAspect=aspect;runtime.controls.minDistance=4.15;runtime.controls.maxDistance=20/aspect;
    runtime.initialPosition.copy(framed);runtime.initialTarget.copy(target);moveCamera(runtime,framed,target);
  }})),
  tectonics:()=>import('./formation').then(module=>(_props,_runtime,map)=>module.buildFormationScene(map)),
  culture:()=>import('./culture').then(module=>(_props,_runtime,map)=>module.buildCourtyardScene(map)),
  overview:()=>import('./overview').then(module=>props=>module.buildOverviewScene(props.scene)),
};
const builtInFactories:Partial<Record<string,SceneFactory>>={sun:(_props,runtime)=>buildEarth(true,runtime),terrain:(props,runtime)=>buildTerrainScene(props.scene,runtime)};
function loadSceneFactory(key:string){
  const cached=sceneFactories.get(key);if(cached)return Promise.resolve(cached);
  const pending=pendingFactories.get(key);if(pending)return pending;
  const request=sceneLoaders[key]().then(factory=>{sceneFactories.set(key,factory);pendingFactories.delete(key);return factory;},error=>{pendingFactories.delete(key);throw error;});
  pendingFactories.set(key,request);return request;
}
const performanceDiagnosticsEnabled=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('diagnostics')==='performance';
function recordSceneTiming(name:string,detail:Record<string,unknown>){
  // Diagnostics require an explicit real URL parameter. Nothing is uploaded.
  try{
    const timestamp=performance.now();performance.mark(name,{startTime:timestamp,detail});
    if(!performanceDiagnosticsEnabled)return;
    const payload:Record<string,unknown>={name,timestamp,detail};
    if(name==='tibet:scene-frame-window'){
      payload.sceneTimings=(performance.getEntriesByType('mark') as PerformanceMark[]).filter(entry=>entry.name!=='tibet:scene-frame-window'&&entry.name.startsWith('tibet:scene-')&&entry.detail?.viewKey===detail.viewKey).slice(-6).map(entry=>({name:entry.name,timestamp:entry.startTime,detail:entry.detail}));
      payload.javaScriptResources=(performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(entry=>/\.m?js(?:$|\?)/.test(entry.name)).slice(-64).map(entry=>({name:new URL(entry.name).pathname,origin:new URL(entry.name).origin,startTime:entry.startTime,requestStart:entry.requestStart,responseStart:entry.responseStart,responseEnd:entry.responseEnd,duration:entry.duration,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize,decodedBodySize:entry.decodedBodySize}));
      const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
      if(navigation)payload.navigation={type:navigation.type,startTime:navigation.startTime,duration:navigation.duration,requestStart:navigation.requestStart,responseStart:navigation.responseStart,responseEnd:navigation.responseEnd,domContentLoadedEventEnd:navigation.domContentLoadedEventEnd,loadEventEnd:navigation.loadEventEnd,transferSize:navigation.transferSize,encodedBodySize:navigation.encodedBodySize,decodedBodySize:navigation.decodedBodySize};
      payload.sizeBasis='Browser transferSize includes HTTP overhead; encodedBodySize is the body actually served, with compression only when the server applies it. Build gzip estimates are separate. Zero transferSize may indicate a cached or restricted timing entry.';
    }
    console.info('tibet-performance '+JSON.stringify(payload));
  }catch{/* User Timing and optional diagnostics must never interrupt rendering. */}
}
function markSceneTiming(name:string,viewKey:string){recordSceneTiming(name,{viewKey});}
const has=(layer:string,...terms:string[])=>terms.some(t=>layer.toLowerCase().includes(t));
const specializedScenes:Record<string,string>={'atlas-home':'story-atlas',atlas:'story-atlas','atlas-arrival':'story-atlas','climate-evidence':'story-atlas',G4:'terrain-reading',P1:'local-landscape',P2:'landform-process',E3:'living-landscape',P3:'living-landscape',H1:'history-inquiry',H2:'history-inquiry',H3:'history-inquiry',H4:'history-inquiry',C2:'energy-balance',C3:'air-height',C4:'plateau-climate',C5:'mountain-cloud',C6:'mountain-cloud',E1:'regional-study',E2:'regional-study',R1:'connection-basin',R2:'connection-pass',R3:'connection-issues',T1:'travel-understanding',T2:'travel-understanding',T3:'travel-understanding',M1:'railway-engineering',M2:'development-systems',M3:'development-systems'};
const processMaximum=(key?:string)=>key==='P1'?180:key==='K1'?75:['atlas','atlas-arrival','climate-evidence'].includes(key??'')?130:key==='C4'?82:['R1','R3'].includes(key??'')?65:['G4','E1','E2'].includes(key??'')?65:key==='G3'?32:40;
const isOverview=(name:SceneName)=>['region','history','connections','modern','travel'].includes(name);

function moveCamera(runtime:Runtime,position:THREE.Vector3,target:THREE.Vector3,immediate=false){
  if(immediate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){runtime.transition=undefined;restoreCamera(runtime,position,target);return;}
  runtime.transition={started:performance.now(),duration:1050,from:runtime.camera.position.clone(),to:position.clone(),fromTarget:runtime.controls.target.clone(),toTarget:target.clone()};
}

function restoreCamera(runtime:Runtime,position:THREE.Vector3,target:THREE.Vector3){
  const damping=runtime.controls.enableDamping,rotating=runtime.controls.autoRotate;
  // Flush residual orbit inertia before restoring a saved position.
  runtime.controls.autoRotate=false;runtime.controls.enableDamping=false;runtime.controls.update();
  runtime.camera.position.copy(position);runtime.controls.target.copy(target);runtime.controls.update();
  runtime.controls.enableDamping=damping;runtime.controls.autoRotate=rotating;
}

const earthFitAspect=(aspect:number)=>Math.max(.42,Math.min(1,aspect));
function earthFramedPosition(position:THREE.Vector3,target:THREE.Vector3,fromAspect:number,toAspect:number){
  const offset=position.clone().sub(target),radius=3.65;
  // Preserve angular direction and the user's relative zoom as horizontal
  // field of view changes. The tangent distance determines globe screen size.
  const ratio=earthFitAspect(fromAspect)/earthFitAspect(toAspect);
  const distance=Math.sqrt(radius*radius+Math.max(.1,offset.lengthSq()-radius*radius)*ratio*ratio);
  return target.clone().add(offset.normalize().multiplyScalar(distance));
}

function processFramedPosition(position:THREE.Vector3,target:THREE.Vector3,fromAspect:number,toAspect:number){
  // A conceptual transect needs both moving sides visible on narrow displays.
  // Keep the direction and the user's relative zoom when the viewport changes.
  return target.clone().add(position.clone().sub(target).multiplyScalar(earthFitAspect(fromAspect)/earthFitAspect(toAspect)));
}

function frameHome(runtime:Runtime,width:number,height:number,zoomScale?:number){
  if(width<1||height<1)return;
  const mobile=width<=600,tablet=width<=900;
  const radius=mobile?Math.min(width*.35,height*.205,150):tablet?Math.min(width*.28,height*.26,210):Math.min(height*.42,width*.253,390);
  const centerX=mobile?Math.min(width*.64,width-radius-8):tablet?width*.65:width*.723;
  const centerY=mobile?height*.58:tablet?height*.61:height*.43;
  const focalLength=height/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2)));
  const distance=Math.sqrt(3.65**2+(focalLength*3.65/radius)**2);
  const currentOffset=runtime.camera.position.clone().sub(runtime.controls.target);
  const ratio=zoomScale??(runtime.homeFramingDistance?currentOffset.length()/runtime.homeFramingDistance:1);
  const direction=currentOffset.lengthSq()>0?currentOffset.normalize():new THREE.Vector3(0,2.8,-10.8).normalize();
  runtime.homeFramingDistance=distance;
  runtime.camera.setViewOffset(width,height,width/2-centerX,height/2-centerY,width,height);
  runtime.controls.minDistance=distance*.72;runtime.controls.maxDistance=distance*2.1;
  runtime.initialTarget.set(0,0,0);runtime.initialPosition.set(0,2.8,-10.8).normalize().multiplyScalar(distance);
  restoreCamera(runtime,runtime.controls.target.clone().addScaledVector(direction,distance*ratio),runtime.controls.target.clone());
}

export function buildEarth(isSun:boolean, runtime:Runtime):SceneModel {
  const group=new THREE.Group(), planet=new THREE.Group();group.add(planet);
  const radius=isSun?2.7:3.65;
  const earthMaterial=new THREE.MeshStandardMaterial({color:0xbacfd3,roughness:.88,metalness:.02});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),earthMaterial);earth.castShadow=true;earth.receiveShadow=true;earth.userData.guideId='solar-earth';planet.add(earth);
  earth.userData.guideAnchor=new THREE.Vector3(0,0,radius);
  let alive=true;
  new THREE.TextureLoader().load('/assets/earth-blue-marble.jpg',texture=>{
    if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,runtime.renderer.capabilities.getMaxAnisotropy());earthMaterial.map=texture;earthMaterial.color.set(0xffffff);earthMaterial.needsUpdate=true;
  },undefined,()=>{earthMaterial.color.set(0x24798a);});
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.035,64,48),new THREE.ShaderMaterial({
    uniforms:{glow:{value:new THREE.Color(0x4faddd)}},vertexShader:'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader:'uniform vec3 glow; varying vec3 n; varying vec3 v; void main(){float a=pow(1.0-max(dot(n,v),0.0),3.0); gl_FragColor=vec4(glow,a*.55);}',transparent:true,depthWrite:false,side:THREE.FrontSide,
  }));planet.add(atmosphere);
  const grids=new THREE.Group();
  for(let lat=-75;lat<=75;lat+=15){const pts=[];for(let lon=-180;lon<=180;lon+=3)pts.push(latLon(lat,lon,radius+.025));grids.add(line(pts,lat===0?GOLD:0x79b8c5,lat===0?.7:.25));}
  for(let lon=0;lon<360;lon+=30){const pts=[];for(let lat=-90;lat<=90;lat+=2)pts.push(latLon(lat,lon,radius+.025));grids.add(line(pts,0x79b8c5,.21));}planet.add(grids);
  const zones=new THREE.Group();
  const bands=[[-90,-66.56,0x8ba7c9],[-66.56,-23.44,0x70b9a2],[-23.44,23.44,0xddb869],[23.44,66.56,0x70b9a2],[66.56,90,0x8ba7c9]];
  bands.forEach(([low,high,color])=>{const g=new THREE.SphereGeometry(radius+.04,72,16,0,Math.PI*2,THREE.MathUtils.degToRad(90-high),THREE.MathUtils.degToRad(high-low));zones.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.2,depthWrite:false})));});
  [-66.56,-23.44,0,23.44,66.56].forEach(lat=>{const pts=[];for(let lon=-180;lon<=180;lon+=2)pts.push(latLon(lat,lon,radius+.05));zones.add(line(pts,GOLD,.8));});planet.add(zones);
  const tibetPosition=latLon(29.65,91.1,radius+.07);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.07,16,12),new THREE.MeshBasicMaterial({color:GOLD}));dot.position.copy(tibetPosition);dot.userData.selectId='lhasa';planet.add(dot);
  dot.userData.guideId='lhasa';dot.userData.guideAnchor=new THREE.Vector3();
  const pin=label('西藏 · 拉萨','#f5d995',1.65);pin.position.copy(tibetPosition).multiplyScalar(1.13);pin.userData.selectId='lhasa';planet.add(pin);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.11,.135,40),new THREE.MeshBasicMaterial({color:GOLD,side:THREE.DoubleSide}));ring.position.copy(tibetPosition);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tibetPosition.clone().normalize());planet.add(ring);
  const axis=line([new THREE.Vector3(0,-radius*1.25,0),new THREE.Vector3(0,radius*1.25,0)],0xecd6a0,.8,true);axis.userData.guideId='solar-axis';planet.add(axis);
  axis.userData.guideAnchor=new THREE.Vector3(0,radius*1.25,0);
  const sunBall=new THREE.Mesh(new THREE.SphereGeometry(.62,32,24),new THREE.MeshBasicMaterial({color:0xffdc8a}));sunBall.userData.guideId='sun-source';group.add(sunBall);
  sunBall.userData.guideAnchor=new THREE.Vector3();
  const rays=new THREE.Group();group.add(rays);
  for(let i=-2;i<=2;i++){const arrow=new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(7,i*.5,0),4.2,0xf0d49a,.25,.12);rays.add(arrow);}
  const sunLabel=label('太阳照射','#ffe7b4',1.8);group.add(sunLabel);
  const sunLeader=line([new THREE.Vector3(),new THREE.Vector3()],GOLD,.6);group.add(sunLeader);
  const solarViewport=new THREE.Vector2(),solarLabelPosition=new THREE.Vector3();
  const orbitPts=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2;orbitPts.push(new THREE.Vector3(Math.cos(a)*7.4,0,Math.sin(a)*7.4));}
  const orbit=line(orbitPts,0x456978,.5,true);group.add(orbit);
  let previous='';
  return {group,dispose:()=>{alive=false;},update:(p,time,dt)=>{
    const key=[p.layer,p.season,isSun].join('|');
    if(key!==previous){previous=key;
      grids.visible=isSun||has(p.layer,'latitude','grid','纬线','范围');zones.visible=!isSun&&has(p.layer,'zones','五带');axis.visible=isSun||has(p.layer,'sun','太阳');
      sunBall.visible=isSun;rays.visible=isSun;sunLabel.visible=isSun;orbit.visible=false;
      if(isSun){planet.rotation.z=THREE.MathUtils.degToRad(23.44);const angle=[Math.PI/2,Math.PI,Math.PI*1.5,0][p.season%4];sunBall.position.set(Math.cos(angle)*7.4,0,Math.sin(angle)*7.4);runtime.sun.position.copy(sunBall.position);sunLabel.position.copy(sunBall.position).add(new THREE.Vector3(0,1,0));
        rays.children.forEach((object,i)=>{const arrow=object as THREE.ArrowHelper;const start=sunBall.position.clone().add(new THREE.Vector3(0,(i-2)*.42,0));arrow.position.copy(start);arrow.setDirection(start.clone().multiplyScalar(-1).normalize());arrow.setLength(4.25,.22,.12);});
      } else {planet.rotation.z=0;runtime.sun.position.set(-6,7,-10);}
    }
    // Keep the same geographic reference while comparing seasonal illumination.
    if(isSun)planet.rotation.y=0;
    // The sphere's attention point stays on its camera-facing surface, after
    // the tilted planet transform. It must never resolve to the sphere centre.
    planet.updateWorldMatrix(true,false);
    earth.userData.guideAnchor.copy(planet.worldToLocal(runtime.camera.position.clone())).normalize().multiplyScalar(radius);
    // Geographic reference and labels remain stable when audio is paused.
    ring.scale.setScalar(1);
    const worldPin=pin.getWorldPosition(new THREE.Vector3()),center=planet.getWorldPosition(new THREE.Vector3());
    const facing=worldPin.clone().sub(center).normalize().dot(runtime.camera.position.clone().sub(center).normalize())>.08;pin.visible=dot.visible=ring.visible=facing;
    sunLeader.visible=isSun;
    if(isSun){
      runtime.renderer.getSize(solarViewport);
      solarLabelPosition.copy(sunBall.position).add(new THREE.Vector3(0,1,0)).project(runtime.camera);
      const x=THREE.MathUtils.clamp((solarLabelPosition.x+1)*solarViewport.x/2,55,solarViewport.x-55);
      const y=THREE.MathUtils.clamp((1-solarLabelPosition.y)*solarViewport.y/2,110,Math.max(110,solarViewport.y-145));
      solarLabelPosition.set(x/solarViewport.x*2-1,1-y/solarViewport.y*2,solarLabelPosition.z).unproject(runtime.camera);sunLabel.position.copy(solarLabelPosition);
      const points=sunLeader.geometry.attributes.position as THREE.BufferAttribute;
      points.setXYZ(0,sunBall.position.x,sunBall.position.y,sunBall.position.z);points.setXYZ(1,solarLabelPosition.x,solarLabelPosition.y,solarLabelPosition.z);points.needsUpdate=true;sunLeader.geometry.computeBoundingSphere();
    }
  }};
}

function addBuilding(parent:THREE.Group,x:number,z:number,scale=1,red=false){
  const group=new THREE.Group();group.position.set(x,terrainHeight(x,z),z);group.scale.setScalar(scale);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.45,.4,.45),new THREE.MeshStandardMaterial({color:red?0x8d3e32:0xe0d9bf,roughness:.95}));wall.position.y=.2;wall.castShadow=true;group.add(wall);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(.5,.07,.5),new THREE.MeshStandardMaterial({color:0x54382f,roughness:.8}));roof.position.y=.43;group.add(roof);
  const door=new THREE.Mesh(new THREE.PlaneGeometry(.1,.2),new THREE.MeshStandardMaterial({color:0x20313a}));door.position.set(0,.14,.226);group.add(door);parent.add(group);return group;
}

export function buildTerrainScene(name:SceneName,viewportRuntime?:{camera:THREE.PerspectiveCamera;renderer:{getSize:(value:THREE.Vector2)=>THREE.Vector2}}):SceneModel {
  const group=new THREE.Group(),terrain=createTerrain(name!=='tectonics');terrain.surface.userData.guideId=name==='landscape'?'context-terrain':'climate-surface';terrain.surface.userData.guideAnchor=new THREE.Vector3(0,terrainHeight(0,0),0);group.add(terrain.group);
  const surfacePositions=terrain.surface.geometry.attributes.position;
  // Attention-only children sample the actual displayed mesh. Neither is a
  // new measured place, a snow-depth reading or an extra selectable POI.
  let snowIndex=0,landIndex=0,landDistance=Infinity;
  for(let index=0;index<surfacePositions.count;index++){
    const x=surfacePositions.getX(index),z=surfacePositions.getZ(index),h=surfacePositions.getY(index);
    if(Math.abs(x)<7&&Math.abs(z)<6&&h>surfacePositions.getY(snowIndex))snowIndex=index;
    const distance=(x+2)**2+(z-4.5)**2;
    if(distance<landDistance){landDistance=distance;landIndex=index;}
  }
  const snowAnchor=new THREE.Object3D(),landAnchor=new THREE.Object3D();
  snowAnchor.userData.guideId='terrain-snow';snowAnchor.userData.guideAnchor=new THREE.Vector3().fromBufferAttribute(surfacePositions,snowIndex);
  landAnchor.userData.guideId='terrain-surface';landAnchor.userData.guideAnchor=new THREE.Vector3().fromBufferAttribute(surfacePositions,landIndex);
  terrain.surface.add(snowAnchor,landAnchor);
  terrain.surface.userData.guideAnchor.copy(landAnchor.userData.guideAnchor);
  if(name!=='tectonics')group.add(landscapeHorizon());
  terrain.river.userData.guideId='context-river';terrain.river.userData.guideAnchor=[0,terrainHeight(0,3)+.2,3];
  const overlays=new THREE.Group();group.add(overlays);
  const sea=new THREE.Group();group.add(sea);
  const seaMesh=new THREE.Mesh(new THREE.PlaneGeometry(63,19),new THREE.MeshStandardMaterial({color:0x2d7e91,roughness:.27,metalness:.23,transparent:true,opacity:.92}));seaMesh.rotation.x=-Math.PI/2;seaMesh.position.set(0,-.1,19);sea.add(seaMesh);
  const seaTitle=label('海洋水汽来源 · 方位示意','#c8e5eb',4.6);seaTitle.position.set(-3.5,1.25,8.8);sea.add(seaTitle);
  for(let i=0;i<12;i++){const pts=[];for(let j=0;j<=80;j++)pts.push(new THREE.Vector3(-20+j*.5,-.06,11+i*.65+Math.sin(j*.3+i)*.08));sea.add(line(pts,0x94cad6,.15));}
  const markers:THREE.Group[]=[];
  const flowPaths:THREE.CatmullRomCurve3[]=[];
  const flowLines=new THREE.Group();overlays.add(flowLines);
  const clouds=new THREE.Group();overlays.add(clouds);
  const cloudCanvas=document.createElement('canvas');cloudCanvas.width=128;cloudCanvas.height=128;const cloudCtx=cloudCanvas.getContext('2d')!;
  const gradient=cloudCtx.createRadialGradient(64,64,3,64,64,63);gradient.addColorStop(0,'rgba(237,246,248,.95)');gradient.addColorStop(.4,'rgba(223,236,240,.7)');gradient.addColorStop(1,'rgba(210,228,236,0)');cloudCtx.fillStyle=gradient;cloudCtx.fillRect(0,0,128,128);
  const cloudTexture=new THREE.CanvasTexture(cloudCanvas),cloudMaterial=new THREE.SpriteMaterial({map:cloudTexture,color:0xf2f7f7,transparent:true,opacity:.55,depthWrite:false});
  for(let i=0;i<64;i++){const c=new THREE.Sprite(cloudMaterial);const x=-5+(i%10)*.6,z=.5+Math.floor(i/10)*.27;c.scale.set(1.35+(i%3)*.2,1.1,1);c.position.set(x,terrainHeight(x,z)+1.05+(i%3)*.12,z);clouds.add(c);}
  const configureFlow=(fromWest:boolean)=>{
    disposeTree(flowLines);flowPaths.length=0;
    for(let j=0;j<5;j++){
      const pts=[];for(let i=0;i<9;i++){const z=fromWest?-3+j*.8+Math.sin(i*.4)*.3:11-i*2.05,x=fromWest?-8+i*2:-3.8+j*.95+Math.sin(i*.45)*.3;pts.push(new THREE.Vector3(x,terrainHeight(x,z)+.7+Math.sin(i/8*Math.PI)*.7,z));}
      const path=curvedLine(pts,TEAL,.018);flowPaths.push(path.curve);flowLines.add(path.mesh);
      const point=path.curve.getPoint(.48),tangent=path.curve.getTangent(.48);flowLines.add(new THREE.ArrowHelper(tangent,point,.8,TEAL,.24,.13));
    }
  };
  configureFlow(false);let flowFromWest=false;
  const flowArray=new Float32Array(220*3),flowGeo=new THREE.BufferGeometry();flowGeo.setAttribute('position',new THREE.BufferAttribute(flowArray,3));
  const flowDots=new THREE.Points(flowGeo,new THREE.PointsMaterial({color:0xefcf89,size:.065,transparent:true,opacity:.88,depthWrite:false}));overlays.add(flowDots);
  const rainArray=new Float32Array(700*3),rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArray,3));
  const rainPoints=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x87d3eb,size:.035,transparent:true,opacity:.65,depthWrite:false}));overlays.add(rainPoints);
  const runoffPath:THREE.Vector3[]=[];
  for(let i=0;i<=90;i++){const z=-6.8+i/90*13.6,x=.7+Math.sin(z*.55)*1.5;runoffPath.push(new THREE.Vector3(x,terrainHeight(x,z)+.14,z));}
  const runoffCurve=new THREE.CatmullRomCurve3(runoffPath),runoffArray=new Float32Array(150*3),runoffGeo=new THREE.BufferGeometry();runoffGeo.setAttribute('position',new THREE.BufferAttribute(runoffArray,3));
  const runoffDots=new THREE.Points(runoffGeo,new THREE.PointsMaterial({color:0x80c9ff,size:.075,transparent:true,opacity:.95,depthWrite:false}));overlays.add(runoffDots);
  const runoffLabel=label('地表径流 · 液态水','#a2d7ff',2.8);runoffLabel.position.set(1.6,terrainHeight(1.6,4.5)+.65,4.5);overlays.add(runoffLabel);
  const glacierGeometry=new THREE.PlaneGeometry(1,1,28,60);glacierGeometry.rotateX(-Math.PI/2);
  const glacier=new THREE.Mesh(glacierGeometry,new THREE.MeshStandardMaterial({color:0xc3e5ef,roughness:.4,metalness:.06,side:THREE.DoubleSide}));glacier.castShadow=true;glacier.receiveShadow=true;overlays.add(glacier);
  glacier.name='climate-ice-reference';glacier.userData.kind='conceptual-ice-reference-not-observation';
  const glacierLines=new THREE.Group();overlays.add(glacierLines);
  const makeBoundary=(end:number,color:number,dashed:boolean)=>{const points=[];for(let i=0;i<=60;i++){const z=-3+i/60*(end+3),x=.7+Math.sin(z*.55)*1.5,width=.32+.45*(1-i/60);points.push(new THREE.Vector3(x-width,terrainHeight(x-width,z)+.16,z));}for(let i=60;i>=0;i--){const z=-3+i/60*(end+3),x=.7+Math.sin(z*.55)*1.5,width=.32+.45*(1-i/60);points.push(new THREE.Vector3(x+width,terrainHeight(x+width,z)+.16,z));}points.push(points[0]);return line(points,color,.95,dashed);};
  glacierLines.add(makeBoundary(4.7,IVORY,true),makeBoundary(2.4,TEAL,false));
  const boundaryLabelA=label('时期 A · 边界示意','#f0eddd',2.3);boundaryLabelA.position.set(1,terrainHeight(1,4.7)+.8,4.7);glacierLines.add(boundaryLabelA);
  const boundaryLabelB=label('时期 B · 边界示意','#a4ecef',2.3);boundaryLabelB.position.set(3,terrainHeight(3,2.4)+.8,2.4);glacierLines.add(boundaryLabelB);
  const settlement=new THREE.Group();settlement.userData.guideId='context-settlements';settlement.userData.guideAnchor=[-3,terrainHeight(-3,3)+.6,3];overlays.add(settlement);
  const historicalGroups:THREE.Group[]=[];
  places.forEach((p,index)=>{const marker=addMarker(overlays,p.id,p.name,p.x,terrainHeight(p.x,p.z)+.05,p.z,index===0?GOLD:TEAL);markers.push(marker);
    const houses=new THREE.Group();settlement.add(houses);historicalGroups.push(houses);
    for(let j=0;j<7;j++)addBuilding(houses,p.x+(j%3-1)*.38,p.z+(Math.floor(j/3)-1)*.38,j===0?1.2:.55,j===0);
  });
  const routes=new THREE.Group();overlays.add(routes);const routeCurves:THREE.CatmullRomCurve3[]=[];
  places.slice(1).forEach(p=>{const a=places[0],start=new THREE.Vector3(a.x,terrainHeight(a.x,a.z)+.2,a.z),end=new THREE.Vector3(p.x,terrainHeight(p.x,p.z)+.2,p.z),mid=start.clone().lerp(end,.5);mid.y=Math.max(start.y,end.y)+2.3;const path=curvedLine([start,mid,end],GOLD,.027);path.mesh.userData.selectId=p.id;routes.add(path.mesh);routeCurves.push(path.curve);});
  const traveler=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),new THREE.MeshBasicMaterial({color:0xffe6a1}));routes.add(traveler);
  const travelLines=new THREE.Group();overlays.add(travelLines);
  const travelMoving=new THREE.Mesh(new THREE.SphereGeometry(.14,16,12),new THREE.MeshBasicMaterial({color:0xffedb0}));overlays.add(travelMoving);
  const travelCurves:{curve:THREE.CatmullRomCurve3;length:number}[]=[];let lastTravelKey='',travelLength=0;
  const updateTravelRoute=(orderedIds:string[])=>{
    disposeTree(travelLines);travelCurves.length=0;travelLength=0;
    const ordered=orderedIds.map(id=>places.find(place=>place.id===id)!).filter(Boolean);
    for(let i=1;i<ordered.length;i++){
      const a=ordered[i-1],b=ordered[i],start=new THREE.Vector3(a.x,terrainHeight(a.x,a.z)+.25,a.z),end=new THREE.Vector3(b.x,terrainHeight(b.x,b.z)+.25,b.z),mid=start.clone().lerp(end,.5);mid.y=Math.max(start.y,end.y)+2.2;
      const path=curvedLine([start,mid,end],GOLD,.045);path.mesh.userData.selectId=b.id;path.mesh.userData.fromRegion=a.id;path.mesh.userData.toRegion=b.id;travelLines.add(path.mesh);
      const length=path.curve.getLength();travelCurves.push({curve:path.curve,length});travelLength+=length;
      travelLines.add(new THREE.ArrowHelper(path.curve.getTangent(.58),path.curve.getPoint(.58),.65,GOLD,.2,.12));
    }
    const sequence=new Map<string,number[]>();ordered.forEach((place,index)=>sequence.set(place.id,[...(sequence.get(place.id)||[]),index+1]));
    sequence.forEach((numbers,id)=>{const p=places.find(place=>place.id===id)!;const order=label(numbers.join(' / '),'#ffe3a2',.65+numbers.length*.22);order.position.set(p.x+.65,terrainHeight(p.x,p.z)+.7,p.z+.1);order.userData.selectId=id;travelLines.add(order);});
  };
  const transport=new THREE.Group();overlays.add(transport);
  for(let i=0;i<20;i++){const x=-7+i*.7,z=4.8+Math.sin(i*.25)*.3,y=terrainHeight(x,z);const pier=new THREE.Mesh(new THREE.CylinderGeometry(.035,.06,.5,6),new THREE.MeshStandardMaterial({color:0x959d9b}));pier.position.set(x,y+.25,z);transport.add(pier);}
  const trainPts=[];for(let i=0;i<60;i++){const x=-7+i/59*13.3,z=4.8+Math.sin(i/59*19*.25)*.3;trainPts.push(new THREE.Vector3(x,terrainHeight(x,z)+.55,z));}const rail=curvedLine(trainPts,0xb5beb9,.045);transport.add(rail.mesh);
  const train=new THREE.Mesh(new THREE.BoxGeometry(.35,.12,.13),new THREE.MeshStandardMaterial({color:0xe7d5b4,metalness:.4,roughness:.4}));transport.add(train);
  const plates=new THREE.Group();overlays.add(plates);
  const plateMatA=new THREE.MeshStandardMaterial({color:0x9a5c43,roughness:1}),plateMatB=new THREE.MeshStandardMaterial({color:0x435f6a,roughness:1});
  const plateA=new THREE.Mesh(new THREE.BoxGeometry(8.8,.75,13.8),plateMatA);plateA.position.set(-4.5,-1.65,0);const plateB=new THREE.Mesh(new THREE.BoxGeometry(8.8,.75,13.8),plateMatB);plateB.position.set(4.5,-1.65,0);plates.add(plateA,plateB);
  plates.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-6,-1.2,7.2),3,GOLD,.5,.3),new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(6,-1.2,7.2),3,TEAL,.5,.3));
  const india=label('印度板块 · 相向运动','#efca9c',2.7);india.position.set(-4.6,-.55,7.2);plates.add(india);const eurasia=label('欧亚板块 · 变形与增厚','#b9e6ee',2.9);eurasia.position.set(4.4,-.55,7.2);plates.add(eurasia);
  const geologicalLayers=new THREE.Group();plates.add(geologicalLayers);
  for(let j=0;j<6;j++){const pts=[];for(let i=0;i<=120;i++){const x=-9+i/120*18,y=-1.0+j*.16+Math.sin(x*.8)*Math.exp(-x*x/12)*.6;pts.push(new THREE.Vector3(x,y,7.03));}geologicalLayers.add(line(pts,[0xb8946d,0x796a5a,0xd0b089][j%3],.9));}
  const terrainLabels=new THREE.Group();overlays.add(terrainLabels);
  [['山脉与高原',-3,-1],['河谷与水系',2,4],['高原内部',4,-5]].forEach(([text,x,z])=>{const l=label(text as string,'#e8ece4',2);l.position.set(x as number,terrainHeight(x as number,z as number)+.9,z as number);terrainLabels.add(l);});
  const atmosphereLabels=new THREE.Group();overlays.add(atmosphereLabels);
  [['水汽输送',-4,5,2.4],['抬升与冷却',-3,0,4.8],['云雨形成',-1,1,4.1]].forEach(([text,x,z,y])=>{const l=label(text as string,'#bdebef',2);l.position.set(x as number,y as number,z as number);atmosphereLabels.add(l);});
  const rainProcessLabels=new THREE.Group();overlays.add(rainProcessLabels);
  const vaporLabel=label('水汽随气流输送','#efd89f',2.7);vaporLabel.position.set(-4,2.4,5);rainProcessLabels.add(vaporLabel);
  const condensationLabel=label('抬升冷却 · 逐步凝云','#d8eef0',3);condensationLabel.position.set(-3,4.8,0);rainProcessLabels.add(condensationLabel);
  const rainfallLabel=label('云滴增长 · 降雨','#a8d7f1',2.7);rainfallLabel.position.set(-1,4.1,1);rainProcessLabels.add(rainfallLabel);
  const snowfallLabel=label('冰晶增长 · 降雪','#f0f6ff',2.7);snowfallLabel.position.set(-1,4.1,1);rainProcessLabels.add(snowfallLabel);
  const windLabel=label('气流方向','#a5e4e6',2);windLabel.position.set(-3,3,3);overlays.add(windLabel);
  const energy=new THREE.Group();energy.name='climate-energy-pathways';energy.userData.guideId='climate-atmosphere';energy.userData.guideAnchor=new THREE.Vector3(0,5.3,0);overlays.add(energy);
  const spaceAnchor=new THREE.Object3D();spaceAnchor.userData.guideId='climate-space';spaceAnchor.userData.guideAnchor=new THREE.Vector3();energy.add(spaceAnchor);
  const incomingDirection=new THREE.Vector3(.15,-1,0).normalize();
  const incomingArrows=[-4,-1,2].map(x=>{const arrow=new THREE.ArrowHelper(incomingDirection,new THREE.Vector3(x,7,3.8),4.6,GOLD,.4,.2);arrow.name='climate-incoming-energy';energy.add(arrow);return arrow;});
  const outgoingDirection=new THREE.Vector3(-.12,1,0).normalize();
  const outgoingArrows=[-2,1,4].map(x=>{const arrow=new THREE.ArrowHelper(outgoingDirection,new THREE.Vector3(x,terrainHeight(x,3)+.5,3),4,0xe6a08b,.4,.2);arrow.name='climate-outgoing-energy';energy.add(arrow);return arrow;});
  const inLabel=label('太阳短波进入','#f1d89b',2.5);inLabel.position.set(-4,7.6,3.8);energy.add(inLabel);
  const outLabel=label('地表长波散失','#edb8a8',2.5);outLabel.position.set(3,6.2,3);energy.add(outLabel);
  const atmosphereShell=new THREE.Mesh(new THREE.PlaneGeometry(16,11),new THREE.MeshBasicMaterial({color:0x7fc5d2,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}));atmosphereShell.rotation.x=-Math.PI/2;atmosphereShell.position.y=5.3;energy.add(atmosphereShell);
  const shellLabel=label('大气参与能量交换','#b8e3e7',3);shellLabel.position.set(3,5.5,-4.5);energy.add(shellLabel);
  const greenhouseReturn=new THREE.ArrowHelper(new THREE.Vector3(.1,-1,0).normalize(),new THREE.Vector3(4.5,5.2,4.3),2.6,0xe5ad91,.3,.15);energy.add(greenhouseReturn);
  greenhouseReturn.name='climate-return-energy';
  const energyScope=label('定性能量关系 · 不表示通量或当地变化量','#c4d1cb',4.6);energyScope.position.set(0,8.4,0);energy.add(energyScope);
  const responseReferences=new THREE.Group();responseReferences.name='climate-response-references';overlays.add(responseReferences);
  const iceResponse=label('冰雪 · 响应时间仍需观测','#dce9eb',3);iceResponse.position.copy(snowAnchor.userData.guideAnchor).add(new THREE.Vector3(0,.7,0));responseReferences.add(iceResponse);
  const landResponse=label('陆地与水 · 响应不必同时','#c4ddd5',3.2);landResponse.position.copy(landAnchor.userData.guideAnchor).add(new THREE.Vector3(0,.65,0));responseReferences.add(landResponse);
  const oceanResponse=label('海洋响应 · 需独立观测','#bedfe6',2.8);oceanResponse.position.set(-3.5,1.25,11);responseReferences.add(oceanResponse);
  // Only C8's narrow viewport uses this bounded layout. The objects and energy
  // clock remain the existing ones; these leaders read their actual geometry.
  const compactEnergyLabels=new THREE.Group();compactEnergyLabels.name='climate-compact-energy-labels';compactEnergyLabels.visible=false;overlays.add(compactEnergyLabels);
  const energyLabelDefinitions=[
    {id:'incoming',text:'太阳短波进入',kind:'incoming'},
    {id:'climate-space',text:'长波向太空',kind:'outgoing'},
    {id:'climate-atmosphere',text:'大气吸收与再发射',kind:'air'},
    {id:'climate-surface',text:'陆地与水 · 固定参照',kind:'land'},
    {id:'climate-surface',text:'冰雪 · 响应时间需观测',kind:'ice'},
    {id:'ocean',text:'海洋 · 响应时间不同',kind:'ocean'},
  ].map(definition=>{
    const anchor=new THREE.Vector3(),sprite=label(definition.text,'#e1e9da'),leader=line([anchor.clone(),anchor.clone()],0xaac9c3,.7);
    sprite.onBeforeRender=()=>{};sprite.userData.screenAnnotation=true;sprite.userData.kind=`energy-label-${definition.kind}`;sprite.renderOrder=31;
    leader.renderOrder=30;compactEnergyLabels.add(sprite,leader);return {...definition,anchor,sprite,leader};
  });
  const energyViewport=new THREE.Vector2(),energyProjected=new THREE.Vector3(),energyScreen=new THREE.Vector3(),energyViewPoint=new THREE.Vector3();
  function layoutCompactEnergy(p:TibetSceneProps,forcing:boolean,state:ReturnType<typeof longTermEnergyState>){
    if(!viewportRuntime)return;
    const {camera,renderer}=viewportRuntime;renderer.getSize(energyViewport);
    const compact=forcing&&energyViewport.x<550&&energyViewport.x>0&&energyViewport.y>0;
    compactEnergyLabels.visible=compact;
    inLabel.visible=outLabel.visible=shellLabel.visible=energyScope.visible=!compact;
    responseReferences.visible=forcing&&state.showResponseObjects&&!compact;
    if(!compact)return;
    camera.updateMatrixWorld();
    const targets=p.guide?.active?p.guide.targets:[],response=state.showResponseObjects;
    energyLabelDefinitions[0].anchor.copy(incomingArrows[0].position).addScaledVector(incomingDirection,state.incomingLength*.55);
    energyLabelDefinitions[1].anchor.copy(spaceAnchor.userData.guideAnchor);
    energyLabelDefinitions[2].anchor.copy(energy.userData.guideAnchor);
    energyLabelDefinitions[3].anchor.copy(landAnchor.userData.guideAnchor);
    energyLabelDefinitions[4].anchor.fromBufferAttribute(glacierGeometry.attributes.position,Math.floor(glacierGeometry.attributes.position.count/2));
    energyLabelDefinitions[5].anchor.set(-3.5,seaMesh.position.y,11);
    const priority=(item:typeof energyLabelDefinitions[number])=>(targets.includes(item.id)?100:0)+(response?(item.kind==='land'?24:item.kind==='ice'?23:item.kind==='ocean'?22:0):item.kind==='incoming'?23:item.kind==='outgoing'?22:item.kind==='air'?21:0);
    const pixel=22,top=83,bottom=Math.max(top,energyViewport.y-100),focal=energyViewport.y/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    const occupied=[82,122,162].map(y=>({x:energyViewport.x-35,y,w:65}));let count=0;
    for(const item of [...energyLabelDefinitions].sort((a,b)=>priority(b)-priority(a))){
      item.sprite.visible=item.leader.visible=false;
      if(count===3||(!response&&['ice','ocean'].includes(item.kind))||(!response&&item.kind==='land'&&!targets.includes(item.id)))continue;
      energyProjected.copy(item.anchor).project(camera);if(energyProjected.z< -1||energyProjected.z>1)continue;
      const width=Math.min(energyViewport.x-28,item.text.length*11+22),initialX=THREE.MathUtils.clamp((energyProjected.x+1)*energyViewport.x/2,width/2+12,energyViewport.x-width/2-12),initialY=THREE.MathUtils.clamp((1-energyProjected.y)*energyViewport.y/2-24,top,bottom);
      let best:{x:number;y:number;cost:number}|undefined;
      for(const x of [initialX,width/2+12,energyViewport.x/2,energyViewport.x-width/2-12])for(const y of [initialY,...Array.from({length:Math.floor((bottom-top)/31)+1},(_,index)=>top+index*31)]){
        if(y<top||y>bottom||occupied.some(box=>Math.abs(x-box.x)<(width+box.w)/2+7&&Math.abs(y-box.y)<pixel+7))continue;
        const cost=(x-initialX)**2+(y-initialY)**2;if(!best||cost<best.cost)best={x,y,cost};
      }
      if(!best)continue;
      occupied.push({x:best.x,y:best.y,w:width});count++;
      energyScreen.set(best.x/energyViewport.x*2-1,1-best.y/energyViewport.y*2,energyProjected.z).unproject(camera);
      item.sprite.position.copy(energyScreen);const depth=-energyViewPoint.copy(energyScreen).applyMatrix4(camera.matrixWorldInverse).z,height=pixel*depth/focal;item.sprite.scale.set(height*width/pixel,height,1);item.sprite.visible=item.leader.visible=true;
      const points=item.leader.geometry.attributes.position as THREE.BufferAttribute;points.setXYZ(0,item.anchor.x,item.anchor.y,item.anchor.z);points.setXYZ(1,energyScreen.x,energyScreen.y,energyScreen.z);points.needsUpdate=true;item.leader.geometry.computeBoundingSphere();
    }
  }
  const arrowOpacity=(arrow:THREE.ArrowHelper,opacity:number)=>{for(const object of [arrow.line,arrow.cone]){const material=object.material as THREE.Material;material.transparent=true;material.opacity=opacity;}};
  const energyArray=new Float32Array(120*3),energyColors=new Float32Array(120*3),energyGeometry=new THREE.BufferGeometry();
  for(let i=0;i<120;i++){new THREE.Color(i<60?GOLD:0xe6a08b).toArray(energyColors,i*3);}
  energyGeometry.setAttribute('position',new THREE.BufferAttribute(energyArray,3));energyGeometry.setAttribute('color',new THREE.BufferAttribute(energyColors,3));
  const energyDots=new THREE.Points(energyGeometry,new THREE.PointsMaterial({size:.085,vertexColors:true,transparent:true,opacity:.9,depthWrite:false}));energyDots.name='climate-energy-packets';energy.add(energyDots);
  const altitude=new THREE.Group();overlays.add(altitude);
  altitude.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(5,.7,3),5.4,TEAL,.35,.2));
  [['较低处',1.2],['较高处',5.6]].forEach(([text,y])=>{const l=label(text as string,'#c0e6e6',1.6);l.position.set(6,y as number,3);altitude.add(l);});
  const historyPeriodGroup=new THREE.Group();overlays.add(historyPeriodGroup);
  const historyLabels=['史前活动材料','吐蕃时期材料','分散与重组材料','蒙古元朝与萨迦','地方政治变化','甘丹颇章时期','清代制度与社会','20世纪前期','20世纪中叶以来'].map(text=>{const l=label(text,'#efd698',3.8);l.position.set(0,5.8,0);historyPeriodGroup.add(l);return l;});
  const eventRelations=new THREE.Group();overlays.add(eventRelations);
  const eventLhasa=addMarker(eventRelations,'lhasa','拉萨 · 会盟',-.5,terrainHeight(-.5,3)+.1,3,GOLD);
  const eventChangan=addMarker(eventRelations,'event-changan','长安 · 会盟',6,terrainHeight(6,-3.5)+.1,-3.5,TEAL);
  delete eventChangan.userData.selectId;
  const eventStart=eventLhasa.position.clone().add(new THREE.Vector3(0,.7,0)),eventEnd=eventChangan.position.clone().add(new THREE.Vector3(0,.7,0));
  const eventMid=eventStart.clone().lerp(eventEnd,.5);eventMid.y=5.2;eventRelations.add(curvedLine([eventStart,eventMid,eventEnd],GOLD,.035).mesh);
  const relationNote=label('事件关系示意 · 非精确道路','#e5d6b1',4);relationNote.position.set(2.5,5.8,0);eventRelations.add(relationNote);
  const event821=label('821年 · 长安会盟','#efd49b',3.3);event821.position.set(6,terrainHeight(6,-3.5)+1.8,-3.5);eventRelations.add(event821);
  const event822=label('822年 · 拉萨会盟','#efd49b',3.3);event822.position.set(-.5,terrainHeight(-.5,3)+1.8,3);eventRelations.add(event822);
  const stele=new THREE.Group();overlays.add(stele);
  const stoneDetail=mineralTexture();stoneDetail.repeat.set(1.8,3);
  const stone=new THREE.MeshStandardMaterial({color:0x8c958f,map:stoneDetail,bumpMap:stoneDetail,bumpScale:.055,roughness:.98});
  const stonePart=(geometry:THREE.BufferGeometry,y:number)=>{const mesh=new THREE.Mesh(geometry,stone);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;stele.add(mesh);return mesh;};
  stonePart(new THREE.BoxGeometry(3.5,.32,2.8),.16);stonePart(new THREE.BoxGeometry(2.7,.45,2.1),.545);stonePart(new THREE.BoxGeometry(1.8,.32,1.4),.93);
  stonePart(new THREE.BoxGeometry(1.15,4.25,.56),3.17);stonePart(new THREE.CylinderGeometry(.72,.82,.4,4,1),5.48).rotation.y=Math.PI/4;
  const steleTitle=label('碑体结构示意 · 原碑文字见资料','#e9e2cd',6.3);steleTitle.position.set(0,6.25,0);stele.add(steleTitle);
  const steleDate=label('823年 · 立碑','#efd39b',2.4);steleDate.position.set(0,.9,2);stele.add(steleDate);
  const stoneBodyLabel=label('碑身','#dce7e4',1.2);stoneBodyLabel.position.set(1.45,3.3,0);stele.add(stoneBodyLabel);
  const stoneBaseLabel=label('台座','#dce7e4',1.2);stoneBaseLabel.position.set(2.4,.7,.3);stele.add(stoneBaseLabel);
  let previous='',lastProgress=-1,animationTime=0;
  const tempPoint=new THREE.Vector3();
  function updateGlacier(progress:number){const a=glacierGeometry.attributes.position;const end=4.7-progress*2.3;for(let i=0;i<a.count;i++){const row=Math.floor(i/29),col=i%29,t=row/60,z=-3+t*(end+3),width=.32+.45*(1-t),x=.7+Math.sin(z*.55)*1.5+(col/28*2-1)*width;a.setXYZ(i,x,terrainHeight(x,z)+.11+Math.sin(col/28*Math.PI)*.1,z);}a.needsUpdate=true;glacierGeometry.computeVertexNormals();}
  // A fixed conceptual reference may be pointed out during forcing, but C8
  // must never turn its explanatory progress into an invented glacier retreat.
  updateGlacier(0);
  return {group,update:(p,time,dt)=>{
    if(p.playing)animationTime+=dt;
    const orderedRegions=name==='travel'?(p.routeRegions||[]).map(id=>places.find(place=>place.id===id||place.name===id)?.id).filter((id,index,array):id is string=>!!id&&id!==array[index-1]):[];
    const travelKey=orderedRegions.join('>');
    if(name==='travel'&&travelKey!==lastTravelKey){lastTravelKey=travelKey;updateTravelRoute(orderedRegions);}
    const key=[p.layer,p.season,p.cutaway,p.selected,p.step,travelKey].join('|');
    if(key!==previous){previous=key;
      const historyEvent=name==='history'&&p.step===2,steleObject=historyEvent&&p.layer==='object';
      terrain.group.visible=!steleObject;
      terrain.setSeason(p.season,p.layer);terrain.sides.visible=p.cutaway||name==='tectonics'||has(p.layer,'section','剖');
      terrain.trees.visible=!has(p.layer,'temperature','温度')&&name!=='tectonics'&&name!=='climate';
      const showEnergy=(name==='atmosphere'&&has(p.layer,'energy','能量'))||(name==='climate'&&has(p.layer,'forcing','原因'));
      sea.visible=name==='rain'||(name==='atmosphere'&&!showEnergy&&!has(p.layer,'temperature','温度'));
      const climateScene=name==='rain'||(name==='atmosphere'&&!showEnergy);
      const west=p.season===3||has(p.layer,'westerlies','西风');if(west!==flowFromWest){flowFromWest=west;configureFlow(west);}
      const onlyWind=has(p.layer,'wind','westerlies','风'),vaporLayer=name==='atmosphere'&&has(p.layer,'water','水汽'),surfaceWater=name!=='atmosphere'&&has(p.layer,'water','水系','径流');
      flowLines.visible=climateScene&&!has(p.layer,'temperature','温度')&&!surfaceWater;flowDots.visible=flowLines.visible&&!onlyWind;
      clouds.visible=climateScene&&!onlyWind&&!surfaceWater&&!vaporLayer&&!has(p.layer,'temperature','温度');rainPoints.visible=clouds.visible&&(name==='rain'||p.step>0);
      cloudMaterial.opacity=p.season===3?.18:.47;
      rainPoints.material.color.set(p.season===3?0xf0f6ff:0x87c9f2);rainPoints.material.size=p.season===3?.07:.035;rainPoints.material.opacity=.65;rainGeo.setDrawRange(0,700);
      runoffDots.visible=surfaceWater;runoffLabel.visible=surfaceWater;windLabel.visible=climateScene&&onlyWind;
      glacier.visible=name==='climate'&&!has(p.layer,'temperature','温度','forcing','原因','season');glacierLines.visible=glacier.visible&&!has(p.layer,'snow','积雪');
      settlement.visible=['region','history','connections','modern','travel'].includes(name)&&!steleObject||(name==='landscape'&&p.layer==='settlements');
      if(name==='landscape')historicalGroups.forEach((houses,i)=>{houses.visible=i===0;});
      const visibleMarkers=['region','history','connections','modern','travel'].includes(name)&&!historyEvent;markers.forEach(m=>{m.visible=visibleMarkers;const selected=m.userData.selectId===p.selected;m.scale.setScalar(selected?1.2:1);m.traverse(object=>{if(object instanceof THREE.Mesh&&object.material instanceof THREE.MeshStandardMaterial)object.material.emissiveIntensity=selected?1.3:.4;});});
      routes.visible=['connections','history','modern'].includes(name)&&!historyEvent&&!has(p.layer,'water','水系','ecology','生态');
      travelLines.visible=name==='travel'&&travelCurves.length>0;travelMoving.visible=travelLines.visible;
      travelLines.children.forEach(child=>{if(child instanceof THREE.Mesh){const material=child.material as THREE.MeshBasicMaterial;material.opacity=!p.selected||child.userData.fromRegion===p.selected||child.userData.toRegion===p.selected?1:.6;}});
      transport.visible=name==='modern'||(name==='connections'&&has(p.layer,'transport','交通'));
      plates.visible=name==='tectonics';terrainLabels.visible=['region','landscape','tectonics'].includes(name);atmosphereLabels.visible=name==='atmosphere'&&climateScene&&!onlyWind&&!surfaceWater&&!vaporLayer&&!has(p.layer,'temperature','温度');
      energy.visible=showEnergy;greenhouseReturn.visible=name==='climate'||p.step>0;altitude.visible=name==='atmosphere'&&has(p.layer,'temperature','温度');historyPeriodGroup.visible=name==='history'&&!historyEvent;
      const showStele=historyEvent&&(p.layer==='event-823'||p.layer==='object');
      eventRelations.visible=historyEvent&&!showStele;event821.visible=p.layer!=='event-822';event822.visible=p.layer==='event-822';eventChangan.scale.setScalar(p.layer==='event-822'?.88:1.15);eventLhasa.scale.setScalar(p.layer==='event-822'?1.15:.88);
      stele.visible=showStele;stele.scale.setScalar(steleObject?1.18:.78);stele.position.set(0,steleObject?0:terrainHeight(0,1),steleObject?0:1);
      terrain.river.visible=!has(p.layer,'temperature','温度');
      terrain.river.scale.set(1,has(p.layer,'water','水系')?1.06:1,1);
      ((terrain.river as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(surfaceWater?0x3d9feb:0x71b8c6);
      routes.children.forEach((child,index)=>{if(child instanceof THREE.Mesh && child!==traveler){const mat=child.material as THREE.MeshBasicMaterial;mat.color.set(has(p.layer,'culture','文化')?0xcd9cde:GOLD);mat.opacity=p.selected&&places[index+1]?.id!==p.selected?.toLowerCase()?.trim()?.replace('route-','')?.replace('region-','')?.trim()? .36:.9;}});
    }
    // Process controls reveal separate water-cycle states, rather than showing the outcome from the start.
    const showingVapor=name==='atmosphere'&&has(p.layer,'water','水汽');
    rainProcessLabels.visible=showingVapor||(name==='rain'&&!has(p.layer,'wind','westerlies','风','water','水系','径流','temperature','温度'));
    if(showingVapor){vaporLabel.visible=true;condensationLabel.visible=false;rainfallLabel.visible=false;snowfallLabel.visible=false;}
    if(name==='rain'){
      const fullProcess=rainProcessLabels.visible,condensation=THREE.MathUtils.smoothstep(p.progress,.33,.66),precipitation=THREE.MathUtils.smoothstep(p.progress,.66,1);
      clouds.visible=fullProcess&&p.progress>=.33;cloudMaterial.opacity=(p.season===3?.4:.52)*condensation;
      rainPoints.visible=fullProcess&&p.progress>.66;rainPoints.material.opacity=.2+.55*precipitation;rainGeo.setDrawRange(0,Math.round(100+600*precipitation));
      vaporLabel.visible=true;condensationLabel.visible=p.progress>=.33;rainfallLabel.visible=p.progress>.66&&p.season!==3;snowfallLabel.visible=p.progress>.66&&p.season===3;
    }
    if(Math.abs(lastProgress-p.progress)>.002){lastProgress=p.progress;
      if(name==='climate'&&!has(p.layer,'forcing','原因','season'))updateGlacier(p.progress);
      if(name==='tectonics'){
        plateA.position.x=-5.25+p.progress*.75;plateB.position.x=5.25-p.progress*.75;geologicalLayers.scale.y=.55+p.progress*.65;
        const positions=terrain.surface.geometry.attributes.position;
        for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),edge=Math.sin(Math.PI*(x+9)/18)*Math.sin(Math.PI*(z+7)/14);positions.setY(i,terrain.heights[i]-(1-p.progress)*Math.max(0,terrain.heights[i]-1)*edge*(.33+.1*Math.sin(x*.6)));}
        positions.needsUpdate=true;terrain.surface.geometry.computeVertexNormals();
      }
      // Historical time selects a source-reading state; the schematic modern base is not falsely rebuilt as ancient cities.
      if(name==='history'){const period=Math.min(8,Math.round(p.progress*8));historyLabels.forEach((l,index)=>{l.visible=index===period;});}
      if(name==='modern')historicalGroups.forEach(houses=>{houses.children.forEach((house,i)=>house.visible=i<Math.ceil(2+p.progress*5));});
    }
    if(flowDots.visible){for(let i=0;i<220;i++){const path=flowPaths[i%5];const phase=(i/220+animationTime*(p.season===3?.045:.09)+p.progress*.4)%1;path.getPoint(phase,tempPoint);flowArray[i*3]=tempPoint.x;flowArray[i*3+1]=tempPoint.y+Math.sin(i*7)*.15;flowArray[i*3+2]=tempPoint.z;}flowGeo.attributes.position.needsUpdate=true;}
    if(rainPoints.visible){for(let i=0;i<700;i++){const snow=p.season===3,x=-5.5+(Math.sin(i*78.233)*.5+.5)*6,z=.4+(Math.sin(i*31.73)*.5+.5)*2.3,ground=terrainHeight(x,z);const falling=1-((i*.731+animationTime*(snow?.38:1.5)+p.progress*.5)%1);rainArray[i*3]=x+(snow?Math.sin(animationTime*.7+i)*.12:0);rainArray[i*3+1]=ground+.1+falling*1.35;rainArray[i*3+2]=z;}rainGeo.attributes.position.needsUpdate=true;}
    if(runoffDots.visible){for(let i=0;i<150;i++){runoffCurve.getPoint((i/150+animationTime*.045+p.progress*.25)%1,tempPoint);runoffArray[i*3]=tempPoint.x;runoffArray[i*3+1]=tempPoint.y;runoffArray[i*3+2]=tempPoint.z;}runoffGeo.attributes.position.needsUpdate=true;}
    if(clouds.visible)clouds.position.x=p.playing?Math.sin(animationTime*.13)*.22:clouds.position.x;
    const forcing=name==='climate'&&has(p.layer,'forcing','原因'),energyState=longTermEnergyState(p.progress);
    responseReferences.visible=forcing&&energyState.showResponseObjects;
    if(forcing){
      energy.userData.explanationPhase=energyState.phase;
      incomingArrows.forEach(arrow=>{arrow.setLength(energyState.incomingLength,.4,.2);arrowOpacity(arrow,.9);});
      outgoingArrows.forEach(arrow=>{arrow.setLength(energyState.outgoingLength,.4,.2);arrowOpacity(arrow,energyState.outgoingOpacity);});
      greenhouseReturn.visible=true;greenhouseReturn.setLength(energyState.returnLength,.3,.15);arrowOpacity(greenhouseReturn,energyState.returnOpacity);
      (atmosphereShell.material as THREE.MeshBasicMaterial).opacity=energyState.shellOpacity;
      terrain.surface.material.emissive.set(0x674029);terrain.surface.material.emissiveIntensity=energyState.surfaceAttention;
      glacier.visible=energyState.showResponseObjects;glacierLines.visible=false;
      sea.visible=energyState.showResponseObjects;seaTitle.visible=false;
      spaceAnchor.userData.guideAnchor.copy(outgoingArrows[2].position).addScaledVector(outgoingDirection,energyState.outgoingLength);
    }else{
      terrain.surface.material.emissiveIntensity=0;seaTitle.visible=true;
      spaceAnchor.userData.guideAnchor.copy(outgoingArrows[2].position).addScaledVector(outgoingDirection,4);
    }
    if(energy.visible){for(let i=0;i<120;i++){const down=i<60,phase=(i/20+p.progress*.8)%1,arrow=(down?incomingArrows:outgoingArrows)[i%3],length=down?4.6:forcing?energyState.outgoingLength:4;tempPoint.copy(arrow.position).addScaledVector(down?incomingDirection:outgoingDirection,phase*length);tempPoint.toArray(energyArray,i*3);}energyGeometry.attributes.position.needsUpdate=true;}
    layoutCompactEnergy(p,forcing,energyState);
    if(routes.visible){const selectedIndex=Math.max(0,places.findIndex(place=>place.id===p.selected)-1);const curve=routeCurves[selectedIndex%routeCurves.length];curve.getPoint((p.progress*.95+animationTime*.045)%1,traveler.position);}
    if(travelMoving.visible&&travelLength>0){
      const phase=p.playing?(p.progress+animationTime*.035)%1:THREE.MathUtils.clamp(p.progress,0,.999999);
      let remaining=phase*travelLength;
      for(let i=0;i<travelCurves.length;i++){const segment=travelCurves[i];if(remaining<=segment.length||i===travelCurves.length-1){segment.curve.getPointAt(THREE.MathUtils.clamp(remaining/segment.length,0,1),travelMoving.position);break;}remaining-=segment.length;}
    }
    if(transport.visible){const t=(p.progress*.9+animationTime*.035)%1;rail.curve.getPoint(t,train.position);rail.curve.getTangent(t,tempPoint);train.rotation.y=-Math.atan2(tempPoint.z,tempPoint.x);}
  }};
}

export default function TibetSceneRuntime(props:TibetSceneProps){
  const containerRef=useRef<HTMLDivElement>(null),propsRef=useRef(props),runtimeRef=useRef<Runtime|null>(null);
  const [,refreshFactories]=useState(0),modelBuiltRef=useRef(false);
  const activeViewRef=useRef<{key:string;scene:SceneName}|null>(null),previousResetKey=useRef(props.resetKey);
  const cultureFocusRef=useRef(''),historyFocusRef=useRef(''),processFocusRef=useRef('');
  propsRef.current=props;
  useEffect(()=>{
    const container=containerRef.current;if(!container)return;
    modelBuiltRef.current=false;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{propsRef.current.onError?.('当前设备暂时无法启动三维场景，仍可继续阅读完整介绍。');return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setClearColor(0x071923);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;outline:none';renderer.domElement.setAttribute('aria-label','可旋转缩放的西藏三维认识场景');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;container.appendChild(renderer.domElement);
    const world=new THREE.Scene();world.background=new THREE.Color(0x0c1210);
    const camera=new THREE.PerspectiveCamera(43,1,.1,180);camera.position.set(10,9,13);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=4;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.88;controls.rotateSpeed=.55;controls.zoomSpeed=.75;controls.panSpeed=.6;
    const hemisphere=new THREE.HemisphereLight(0xd4e8f3,0x393b2e,1.7);world.add(hemisphere);
    const sun=new THREE.DirectionalLight(0xffe4bc,3.1);sun.position.set(-8,14,8);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;world.add(sun);
    const fill=new THREE.DirectionalLight(0x73adc1,.6);fill.position.set(8,5,-10);world.add(fill);
    const stars=makeStars();world.add(stars);
    const runtime:Runtime={renderer,world,camera,controls,sun,stars,model:null,initialPosition:camera.position.clone(),initialTarget:new THREE.Vector3()};runtimeRef.current=runtime;
    const resize=()=>{const width=container.clientWidth,height=container.clientHeight;if(width<1||height<1)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);if(['M1','M2','M3','E3','P3','P2','H1','H2','H3','H4','K1','K2','K3','K4','R1','R2','R3','T1','T2','T3'].includes(propsRef.current.viewKey||''))camera.setViewOffset(width,height,0,height*.13,width,height);if(propsRef.current.layer==='home'&&runtime.model)frameHome(runtime,width,height);else if(propsRef.current.scene==='earth'&&runtime.model&&runtime.earthFramingAspect!==undefined){const prior=runtime.earthFramingAspect,next=earthFitAspect(camera.aspect);if(Math.abs(prior-next)>.001){runtime.transition=undefined;restoreCamera(runtime,earthFramedPosition(camera.position,controls.target,prior,next),controls.target.clone());runtime.initialPosition.copy(earthFramedPosition(runtime.initialPosition,runtime.initialTarget,prior,next));runtime.earthFramingAspect=next;controls.maxDistance=20/next;}}else if(specializedScenes[propsRef.current.viewKey??'']!=='story-atlas'&&(propsRef.current.scene==='tectonics'||propsRef.current.scene==='sun'||propsRef.current.scene==='culture'||!!specializedScenes[propsRef.current.viewKey??''])&&runtime.model&&runtime.processFramingAspect!==undefined){const prior=runtime.processFramingAspect,next=earthFitAspect(camera.aspect);if(Math.abs(prior-next)>.001){runtime.transition=undefined;restoreCamera(runtime,processFramedPosition(camera.position,controls.target,prior,next),controls.target.clone());runtime.initialPosition.copy(processFramedPosition(runtime.initialPosition,runtime.initialTarget,prior,next));runtime.processFramingAspect=next;controls.maxDistance=processMaximum(propsRef.current.viewKey)/next;}}};
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    let userInteracting=false;
    const start=()=>{userInteracting=true;runtime.transition=undefined;renderer.domElement.style.opacity='1';controls.autoRotate=false;propsRef.current.onInteract();};
    const end=()=>{userInteracting=false;};controls.addEventListener('start',start);controls.addEventListener('end',end);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();raycaster.params.Line.threshold=.035;let downX=0,downY=0;
    const pointerDown=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY;};
    const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.params.Line.threshold=propsRef.current.groundJourney?camera.position.distanceTo(controls.target)*2*Math.tan(camera.fov*Math.PI/360)*7/rect.height:.035;raycaster.setFromCamera(pointer,camera);if(!runtime.model)return;const visible=(candidate:THREE.Object3D)=>{let ancestor:THREE.Object3D|null=candidate;while(ancestor){if(!ancestor.visible)return false;ancestor=ancestor.parent;}return true;};const groundTargets:THREE.Object3D[]=[];if(propsRef.current.groundJourney)runtime.model.group.traverse(object=>{if(String(object.userData.selectId??'').startsWith('ground-rail:')&&visible(object))groundTargets.push(object);});const hits=raycaster.intersectObjects(propsRef.current.groundJourney?groundTargets:runtime.model.group.children,!propsRef.current.groundJourney).filter(hit=>visible(hit.object));if(propsRef.current.groundJourney&&propsRef.current.groundJourney.returnMix<.05){const railway=hits.find(hit=>String(hit.object.userData.selectId??'').startsWith('ground-rail:'));if(railway){propsRef.current.onSelect(railway.object.userData.selectId);return;}}const annotation=hits.find(hit=>hit.object.userData.screenAnnotation&&hit.object.userData.selectId);if(annotation){propsRef.current.onSelect(annotation.object.userData.selectId);return;}for(const hit of hits){if(hit.object.userData.blocksSelection)return;let object:THREE.Object3D|null=hit.object;while(object){if(object.userData.selectId){propsRef.current.onSelect(object.userData.selectId);return;}object=object.parent;}}};
    const keyboard=(e:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();runtime.transition=undefined;renderer.domElement.style.opacity='1';propsRef.current.onInteract();const offset=camera.position.clone().sub(controls.target);if(e.key==='+'||e.key==='=')offset.multiplyScalar(.9);else if(e.key==='-')offset.multiplyScalar(1.1);else {const spherical=new THREE.Spherical().setFromVector3(offset);if(e.key==='ArrowLeft')spherical.theta-=.12;if(e.key==='ArrowRight')spherical.theta+=.12;if(e.key==='ArrowUp')spherical.phi=Math.max(.1,spherical.phi-.1);if(e.key==='ArrowDown')spherical.phi=Math.min(Math.PI-.1,spherical.phi+.1);offset.setFromSpherical(spherical);}camera.position.copy(controls.target).add(offset);controls.update();};
    const contextLost=(e:Event)=>{e.preventDefault();propsRef.current.onError?.('三维显示暂时中断。介绍与章节仍可使用，刷新后可以恢复场景。');};
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('keydown',keyboard);renderer.domElement.addEventListener('webglcontextlost',contextLost);
    let frame=0,last=performance.now(),renderedModel:SceneModel|null=null,wasAutomatic=false;
    let sampledModel:SceneModel|null=null,sampleWindows=0,sampleStart=0,samplePrevious=0,sampleViewKey='',sampleWidth=0,sampleHeight=0;
    const frameIntervals:number[]=[],sampleViewport=new THREE.Vector2();
    const groundSky=new THREE.Color(0x9eb8c5),atlasBackground=new THREE.Color(0x0c1210),groundFog=new THREE.Fog(groundSky,.04,.12);let groundBackground=false;let previousGroundFog:THREE.Fog|THREE.FogExp2|null=null;
    const animate=(_frameTime:number)=>{
      // Use the same monotonic clock as camera transitions, including embedded/offscreen browsers.
      const now=performance.now();
      frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;
      const current=propsRef.current;
      runtime.model?.update(current,now/1000,dt);
      if(current.groundJourney){
        if(!groundBackground)previousGroundFog=world.fog;const mix=current.groundJourney.returnMix;(world.background as THREE.Color).copy(atlasBackground).lerp(groundSky,1-mix);groundFog.color.copy(world.background as THREE.Color);groundFog.near=THREE.MathUtils.lerp(.04,26,mix);groundFog.far=THREE.MathUtils.lerp(.12,180,mix);world.fog=groundFog;groundBackground=true;
      }else if(groundBackground){(world.background as THREE.Color).copy(atlasBackground);if(world.fog===groundFog)world.fog=previousGroundFog;groundBackground=false;}

      // Geographic callouts keep their subject in view; globe rotation belongs
      // to the user's spatial exploration, not the narration playback clock.
      const guidedOrbit=false;
      const automatic=current.playing&&guidedOrbit&&!userInteracting&&!runtime.transition;
      if(wasAutomatic&&!automatic&&!userInteracting)restoreCamera(runtime,camera.position.clone(),controls.target.clone());
      controls.autoRotate=automatic;wasAutomatic=automatic;
      controls.autoRotateSpeed=current.scene==='earth'?.55:.32;
      if(runtime.transition){
        const transition=runtime.transition,t=THREE.MathUtils.clamp((now-transition.started)/transition.duration,0,1),ease=t*t*(3-2*t);
        const position=transition.from.clone().lerp(transition.to,ease),target=transition.fromTarget.clone().lerp(transition.toTarget,ease);
        restoreCamera(runtime,position,target);renderer.domElement.style.opacity=current.viewKey==='C4'?'1':String(.5+.5*THREE.MathUtils.smoothstep(t,0,.5));
        if(t===1){runtime.transition=undefined;renderer.domElement.style.opacity='1';}
      }
      controls.update(dt);if(runtime.localMapDepth)updateLocalMapDepth(camera,controls.target);runtime.annotations?.update(current);renderer.render(world,camera);runtime.model?.renderOverlay?.(world);
      if(runtime.model&&renderedModel!==runtime.model){renderedModel=runtime.model;markSceneTiming('tibet:scene-first-render',current.viewKey||current.scene);if(!runtime.model.ready&&!current.overviewPresentation)propsRef.current.onReady?.();}
      // Two bounded windows per model instance, entirely in the local browser.
      // These are visible RAF intervals, not GPU timings or a device benchmark.
      if(sampledModel!==runtime.model){sampledModel=runtime.model;sampleWindows=0;samplePrevious=0;frameIntervals.length=0;}
      if(runtime.model&&sampleWindows<2){
        const key=current.viewKey||current.scene;renderer.getSize(sampleViewport);
        if(document.visibilityState!=='visible'||key!==sampleViewKey||sampleViewport.x!==sampleWidth||sampleViewport.y!==sampleHeight){
          samplePrevious=0;frameIntervals.length=0;sampleViewKey=key;sampleWidth=sampleViewport.x;sampleHeight=sampleViewport.y;
        }
        if(document.visibilityState==='visible'){
          if(samplePrevious===0)sampleStart=now;
          else frameIntervals.push(now-samplePrevious);
          samplePrevious=now;
          if(frameIntervals.length===119){
            const sorted=[...frameIntervals].sort((a,b)=>a-b);sampleWindows++;
            recordSceneTiming('tibet:scene-frame-window',{viewKey:key,windowIndex:sampleWindows,sampleStartMs:sampleStart,sampleWindowMs:now-sampleStart,frameCount:120,intervalCount:frameIntervals.length,p50IntervalMs:sorted[Math.ceil(sorted.length*.5)-1],p95IntervalMs:sorted[Math.ceil(sorted.length*.95)-1],maxIntervalMs:sorted[sorted.length-1],viewportWidth:sampleWidth,viewportHeight:sampleHeight,pixelRatio:renderer.getPixelRatio(),visibility:'visible'});
            samplePrevious=0;frameIntervals.length=0;
          }
        }
      }
    };frame=requestAnimationFrame(animate);
    return()=>{const active=activeViewRef.current;if(active&&(active.key!=='P1'||runtime.model?.group.userData.dataReady))cameraViewCache.set(active.key,{scene:active.scene,position:(active.key.startsWith('story-atlas:')||active.key.startsWith('earth-foundation:')||active.key.startsWith('plateau-climate:'))&&runtime.transition?runtime.transition.to.clone():camera.position.clone(),target:(active.key.startsWith('story-atlas:')||active.key.startsWith('earth-foundation:')||active.key.startsWith('plateau-climate:'))&&runtime.transition?runtime.transition.toTarget.clone():controls.target.clone(),viewport:renderer.getSize(new THREE.Vector2()),homeFramingDistance:runtime.homeFramingDistance,earthFramingAspect:runtime.earthFramingAspect,processFramingAspect:runtime.processFramingAspect});cancelAnimationFrame(frame);observer.disconnect();controls.removeEventListener('start',start);controls.removeEventListener('end',end);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('keydown',keyboard);renderer.domElement.removeEventListener('webglcontextlost',contextLost);if(runtime.annotations){world.remove(runtime.annotations.group);runtime.annotations.dispose?.();}runtime.model?.dispose?.();sun.shadow.dispose();disposeTree(world);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();runtimeRef.current=null;};
  },[]);

  const home=props.layer==='home';
  const specializedStep=props.viewKey==='K1'&&props.layer!=='construction'?'potala-study':specializedScenes[props.viewKey??'']||'';
  const viewKey=props.viewKey??(home?'home':`${props.scene}:${props.step}`);
  const factoryKey=specializedStep.startsWith('connection-')?'connection-processes':specializedStep==='regional-study'?'terrain-reading':specializedStep||(['earth','tectonics','culture','sun'].includes(props.scene)?props.scene:isOverview(props.scene)?'overview':'terrain');
  const factory=sceneFactories.get(factoryKey)||builtInFactories[factoryKey];
  const modelVariant=specializedStep==='story-atlas'?(props.groundJourney?'macro-ground':props.overviewIrrigation?'macro-irrigation':props.overviewLocalContext?'macro-with-local':props.layer==='atlas-overview'?'macro-overview':props.layer==='atlas-regional-journey'?`regional:${props.selected}`:'standard'):'';
  useEffect(()=>{markSceneTiming('tibet:scene-request',viewKey);},[viewKey,specializedStep]);
  useEffect(()=>{
    if(factory)return;
    let active=true;
    loadSceneFactory(factoryKey).then(()=>{if(active)refreshFactories(value=>value+1);}).catch(()=>{
      if(active)propsRef.current.onError?.('当前场景暂时未能加载，可返回整体地图、继续阅读或重试。');
    });
    return()=>{active=false;};
  },[factoryKey,factory]);
  useEffect(()=>{
    const runtime=runtimeRef.current;if(!runtime)return;
    const first=!modelBuiltRef.current;
    const fromPosition=runtime.camera.position.clone(),fromTarget=runtime.controls.target.clone();
    if(runtime.annotations){runtime.world.remove(runtime.annotations.group);runtime.annotations.dispose?.();runtime.annotations=undefined;}
    if(runtime.model){runtime.world.remove(runtime.model.group);runtime.model.dispose?.();disposeTree(runtime.model.group);runtime.model=null;}
    if(!factory)return;runtime.localMapDepth=false;
    let active=true;
    const mapRuntime={renderer:runtime.renderer,camera:runtime.camera,sun:runtime.sun,hasSavedView:(key:string)=>cameraViewCache.has(key),isActive:()=>active&&runtimeRef.current===runtime,focus:(position:THREE.Vector3,target:THREE.Vector3,framing?:'viewport'|'local-place'|'recorded')=>{
      if(!active||runtimeRef.current!==runtime)return;
      const offset=position.clone().sub(target),baseline=offset.length()>30&&specializedStep!=='local-landscape'?target.clone().add(offset.setLength(specializedStep==='story-atlas'?70:specializedStep==='circulation-context'?58:50)):position;
      const aspect=earthFitAspect(runtime.camera.aspect),direct=framing==='viewport'||framing==='local-place'||framing==='recorded',framed=direct?position:processFramedPosition(baseline,target,1,aspect);
      runtime.localMapDepth=framing==='local-place'||framing==='recorded'&&position.distanceTo(target)<5;runtime.camera.near=runtime.localMapDepth?localMapNearPlane(position.distanceTo(target)):.1;runtime.camera.updateProjectionMatrix();
      runtime.processFramingAspect=direct?undefined:aspect;runtime.controls.minDistance=framing==='local-place'||framing==='recorded'?.002:specializedStep==='plateau-climate'?.45:specializedStep==='local-landscape'?1:10;runtime.controls.maxDistance=direct?Math.max(processMaximum(props.viewKey)/aspect,framed.distanceTo(target)*1.5):processMaximum(props.viewKey)/aspect;
      runtime.initialPosition.copy(framed);runtime.initialTarget.copy(target);if(framing==='recorded'){runtime.transition=undefined;runtime.renderer.domElement.style.opacity='1';restoreCamera(runtime,framed,target);}else moveCamera(runtime,framed,target);if(specializedStep==='plateau-climate'&&propsRef.current.layer==='arrival'&&runtime.transition)runtime.transition.duration=180;
    }};
    try{runtime.model=factory(props,runtime,mapRuntime);modelBuiltRef.current=true;}catch{
      active=false;propsRef.current.onError?.('当前场景暂时无法展开，仍可继续阅读完整介绍或重试。');return;
    }
    runtime.camera.clearViewOffset();if(props.scene==='culture'||specializedStep.startsWith('connection-')||specializedStep==='travel-understanding'||['railway-engineering','development-systems','living-landscape','landform-process','history-inquiry'].includes(specializedStep)){const size=runtime.renderer.getSize(new THREE.Vector2());runtime.camera.setViewOffset(size.x,size.y,0,size.y*.13,size.x,size.y);}runtime.homeFramingDistance=undefined;runtime.earthFramingAspect=undefined;runtime.processFramingAspect=undefined;
    runtime.world.add(runtime.model.group);
    if(props.scene!=='earth'&&(specializedStep!=='story-atlas'||props.viewKey==='climate-evidence')){runtime.annotations=buildNarrationAnnotations(runtime.model.group,runtime.camera,runtime.renderer);runtime.world.add(runtime.annotations.group);}
    const isGlobe=props.scene==='earth'||props.scene==='sun'||specializedStep==='plateau-climate';runtime.stars.visible=isGlobe;
    runtime.world.background=new THREE.Color(isGlobe||isOverview(props.scene)||props.scene==='tectonics'||specializedStep?0x0c1210:0x678a9c);
    runtime.world.fog=isGlobe||specializedStep||props.scene==='tectonics'?null:isOverview(props.scene)?new THREE.Fog(0x071923,26,48):new THREE.Fog(0x678a9c,23,65);
    runtime.controls.maxPolarAngle=isGlobe?Math.PI*.88:isOverview(props.scene)?Math.PI*.46:Math.PI*.49;
    if(props.scene==='earth'){
      runtime.camera.position.set(0,2.8,-10.8);runtime.controls.target.set(0,0,0);runtime.controls.minDistance=4.6;runtime.controls.maxDistance=19;
      if(home){runtime.model.group.position.set(0,0,0);runtime.controls.target.set(0,0,0);runtime.camera.position.set(0,2.8,-10.8);}
    }else if(props.scene==='sun'){runtime.controls.target.set(0,0,0);runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);runtime.camera.position.copy(processFramedPosition(new THREE.Vector3(12.5,7,-13.6),runtime.controls.target,1,runtime.processFramingAspect));runtime.controls.minDistance=5;runtime.controls.maxDistance=40/runtime.processFramingAspect;}
    else if(props.scene==='tectonics'){runtime.controls.target.set(0,-.5,.1);runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);runtime.camera.position.copy(processFramedPosition(new THREE.Vector3(10,6.6,17),runtime.controls.target,1,runtime.processFramingAspect));runtime.controls.minDistance=8;runtime.controls.maxDistance=32/runtime.processFramingAspect;runtime.controls.maxPolarAngle=Math.PI*.65;runtime.sun.position.set(-8,14,8);}
    else if(specializedStep==='plateau-climate'){runtime.camera.position.set(12,7,-12);runtime.controls.target.set(0,0,0);runtime.controls.minDistance=.45;runtime.controls.maxDistance=40;runtime.controls.maxPolarAngle=Math.PI*.98;runtime.camera.near=.015;runtime.camera.updateProjectionMatrix();runtime.sun.position.set(8,14,-12);}
    else if(specializedStep){
      const atlas=specializedStep==='story-atlas',terrain=specializedStep==='terrain-reading'||specializedStep==='regional-study',circulation=specializedStep==='circulation-context',cloud=specializedStep==='mountain-cloud';
      runtime.controls.target.set(0,atlas?.4:terrain?1.4:circulation?1.2:cloud?2.3:2.8,0);
      runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);
      const position=atlas?new THREE.Vector3(0,58,39):terrain?new THREE.Vector3(9,39,33):circulation?new THREE.Vector3(10,40,41):cloud?new THREE.Vector3(10,8,17):specializedStep==='development-systems'?new THREE.Vector3(12.8,10.4,16):new THREE.Vector3(12,8,18);
      if(specializedStep==='development-systems')runtime.controls.target.set(0,.8,0);
      if(specializedStep==='railway-engineering'){position.set(16,12,22);runtime.controls.target.set(0,.2,0);}
      if(specializedStep.startsWith('connection-')){const view=connectionCameraViews[props.viewKey as keyof typeof connectionCameraViews];position.set(...view.position);runtime.controls.target.set(...view.target);}
      if(specializedStep==='travel-understanding'){position.set(17,13,23);runtime.controls.target.set(0,1,0);}
      if(specializedStep==='living-landscape')position.set(17,13,22);
      if(specializedStep==='history-inquiry')position.set(13,12,19);
      if(specializedStep==='landform-process')position.set(12,11,18);
      if(specializedStep==='local-landscape'){position.set(34,61,65);runtime.controls.target.set(0,.7,0);runtime.camera.far=400;runtime.camera.updateProjectionMatrix();}
      if(specializedStep==='potala-study'){position.set(20,15,27);runtime.controls.target.set(1,4.2,0);}
      if(['living-landscape','history-inquiry','landform-process'].includes(specializedStep))runtime.controls.target.set(0,1,0);
      runtime.camera.position.copy(processFramedPosition(position,runtime.controls.target,1,runtime.processFramingAspect));
      runtime.controls.minDistance=specializedStep==='local-landscape'?1:terrain||circulation?10:8;runtime.controls.maxDistance=processMaximum(props.viewKey)/runtime.processFramingAspect;
      runtime.controls.maxPolarAngle=Math.PI*.64;runtime.sun.position.set(-8,14,8);
    }
    else if(props.scene==='culture'){const opera=props.viewKey==='K4';runtime.controls.target.set(0,opera?.6:1.6,opera?0:-1.3);runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);runtime.camera.position.copy(processFramedPosition(opera?new THREE.Vector3(7.2,7.8,12):new THREE.Vector3(7.2,5.8,10.5),runtime.controls.target,1,runtime.processFramingAspect));runtime.controls.minDistance=4;runtime.controls.maxDistance=40/runtime.processFramingAspect;runtime.sun.position.set(-8,14,8);}
    else if(isOverview(props.scene)){runtime.camera.position.set(0,24,17);runtime.controls.target.set(0,.8,0);runtime.controls.minDistance=12;runtime.controls.maxDistance=36;runtime.sun.position.set(-8,14,8);}
    else{
      const positions:Partial<Record<SceneName,[number,number,number]>>={tectonics:[13,8.5,15],landscape:[8,4.8,10.5],climate:[7,8,12.5],rain:[10,9.5,18]};
      runtime.camera.position.set(...(positions[props.scene]||[10,8,14]));runtime.controls.target.set(0,1.6,0);runtime.controls.minDistance=5;runtime.controls.maxDistance=29;runtime.sun.position.set(-8,14,8);
    }
    runtime.initialPosition.copy(runtime.camera.position);runtime.initialTarget.copy(runtime.controls.target);
    restoreCamera(runtime,fromPosition,fromTarget);moveCamera(runtime,runtime.initialPosition,runtime.initialTarget,first||home);
    runtime.model.update(propsRef.current,performance.now()/1000,0);
    if(home&&containerRef.current){runtime.transition=undefined;frameHome(runtime,containerRef.current.clientWidth,containerRef.current.clientHeight,1);}
    return()=>{active=false;};
  },[props.scene,home,specializedStep,factory,modelVariant]);

  useEffect(()=>{
    const runtime=runtimeRef.current,model=runtime?.model;if(!runtime||!model)return;
    let active=true,frame=0;
    const publish=()=>{
      if(!active||runtimeRef.current!==runtime||runtime.model!==model)return;
      // A new explanation starts once its opening view has settled. Subsequent
      // source-word camera movement remains part of the same playing recording.
      if(propsRef.current.overviewPresentation&&runtime.transition){frame=requestAnimationFrame(publish);return;}
      markSceneTiming('tibet:scene-data-ready',viewKey);propsRef.current.onReady?.();
    };
    Promise.resolve(model.ready).then(publish).catch(()=>{if(active&&runtimeRef.current===runtime&&runtime.model===model)propsRef.current.onError?.('当前场景的数据暂时未能读取，可返回整体地图或重试。');});
    return()=>{active=false;if(frame)cancelAnimationFrame(frame);};
  },[viewKey,specializedStep,factory,modelVariant]);
  useEffect(()=>{
    const runtime=runtimeRef.current;if(!runtime?.model)return;
    const cityAtlas=props.layer==='atlas-cities'||props.layer==='atlas-home'||props.layer==='atlas-city-life'||props.layer==='atlas-city-comparison';
    const atlas=specializedStep==='story-atlas';
    const foundation=props.scene==='earth'&&props.viewKey==='G1';
    const plateauClimate=specializedStep==='plateau-climate';
    // Old entries used a fixed, aspect-expanded distance. Cache only a settled
    // view or the transition destination: StrictMode can clean up while the
    // first fit is still moving away from the default Asia-wide camera.
    const cacheKey=foundation?'earth-foundation:G1:v1':plateauClimate?'plateau-climate:C4:v1':cityAtlas?props.layer:atlas?`story-atlas:${viewKey}:viewport-v3`:viewKey==='K1'?`${viewKey}:${specializedStep}`:viewKey;
    const saved=cameraViewCache.get(cacheKey);
    const sameAtlasViewport=!atlas||Boolean(saved?.viewport?.equals(runtime.renderer.getSize(new THREE.Vector2())));
    if(saved?.scene===props.scene&&!cityAtlas&&!foundation&&(!plateauClimate||props.layer!=='arrival')&&sameAtlasViewport){const earth=props.scene==='earth'&&!home,formation=!atlas&&(props.scene==='tectonics'||props.scene==='sun'||props.scene==='culture'||!!specializedStep),position=earth?earthFramedPosition(saved.position,saved.target,saved.earthFramingAspect??1,runtime.camera.aspect):formation?processFramedPosition(saved.position,saved.target,saved.processFramingAspect??1,runtime.camera.aspect):saved.position;if(earth){runtime.earthFramingAspect=earthFitAspect(runtime.camera.aspect);runtime.controls.maxDistance=20/runtime.earthFramingAspect;}if(formation){runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);runtime.controls.maxDistance=processMaximum(props.viewKey)/runtime.processFramingAspect;}moveCamera(runtime,position,saved.target,home);if(home&&containerRef.current)frameHome(runtime,containerRef.current.clientWidth,containerRef.current.clientHeight,saved.position.distanceTo(saved.target)/(saved.homeFramingDistance??runtime.homeFramingDistance??saved.position.distanceTo(saved.target)));}
    // A first step of the same scene keeps the existing view; a new scene already received its default above.
    activeViewRef.current={key:cacheKey,scene:props.scene};
    return()=>{
      const current=runtimeRef.current;
      if(current&&(cacheKey!=='P1'||current.model?.group.userData.dataReady))cameraViewCache.set(cacheKey,{scene:props.scene,position:(atlas||foundation||plateauClimate)&&current.transition?current.transition.to.clone():current.camera.position.clone(),target:(atlas||foundation||plateauClimate)&&current.transition?current.transition.toTarget.clone():current.controls.target.clone(),viewport:current.renderer.getSize(new THREE.Vector2()),homeFramingDistance:current.homeFramingDistance,earthFramingAspect:current.earthFramingAspect,processFramingAspect:current.processFramingAspect});
    };
  },[viewKey,props.scene,home,specializedStep,factory]);

  useEffect(()=>{
    if(previousResetKey.current===props.resetKey)return;previousResetKey.current=props.resetKey;
    const runtime=runtimeRef.current;if(!runtime)return;runtime.model?.update(propsRef.current,performance.now()/1000,0);moveCamera(runtime,runtime.initialPosition,runtime.initialTarget);
  },[props.resetKey]);

  useEffect(()=>{
    const runtime=runtimeRef.current;if(!runtime?.model||props.scene!=='history'||props.step!==2||specializedStep==='history-inquiry')return;
    const object=props.layer==='object'||props.layer==='event-823';runtime.controls.minDistance=object?5:12;
    const returning=historyFocusRef.current!==viewKey&&cameraViewCache.has(viewKey);historyFocusRef.current=viewKey;if(returning)return;
    const position=object?new THREE.Vector3(7.3,4.8,10.5):new THREE.Vector3(0,24,17),target=object?new THREE.Vector3(0,2.4,0):new THREE.Vector3(0,.8,0);
    runtime.controls.minDistance=object?5:12;runtime.initialPosition.copy(position);runtime.initialTarget.copy(target);moveCamera(runtime,position,target);
  },[props.scene,props.step,props.layer,viewKey,factory]);

  useEffect(()=>{
    const runtime=runtimeRef.current;if(!runtime?.model||props.scene!=='culture'||specializedStep==='potala-study')return;
    const returning=cultureFocusRef.current!==viewKey&&cameraViewCache.has(viewKey);cultureFocusRef.current=viewKey;if(returning)return;
    const focusCulture=(position:THREE.Vector3,target:THREE.Vector3)=>{runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);moveCamera(runtime,processFramedPosition(position,target,1,runtime.processFramingAspect),target);};
    if(viewKey==='K4')focusCulture(new THREE.Vector3(7.2,7.8,12),new THREE.Vector3(0,.6,0));
    else if(viewKey==='K3'||props.selected==='culture-craft')focusCulture(new THREE.Vector3(4.3,5.6,9),new THREE.Vector3(-.8,2,.8));
    else if(['culture-text','culture-learning'].includes(props.selected))focusCulture(new THREE.Vector3(5,5.5,8),new THREE.Vector3(.4,1.2,.4));
    else if(props.selected==='culture-maintenance')focusCulture(new THREE.Vector3(-.8,4.8,1.8),new THREE.Vector3(-2.8,.7,-1.3));
    else if(props.selected==='materials')focusCulture(new THREE.Vector3(1.4,3.9,5.5),new THREE.Vector3(-2.5,2.2,-2));
    else if(props.selected==='hall')focusCulture(new THREE.Vector3(3.9,4.4,7.4),new THREE.Vector3(0,2.6,-2.7));
    else if(props.selected==='courtyard')focusCulture(new THREE.Vector3(7.2,5.8,10.5),new THREE.Vector3(0,1.6,-1.3));
  },[props.scene,props.selected,viewKey,specializedStep,factory]);
  useEffect(()=>{
    const runtime=runtimeRef.current;if(!runtime?.model||specializedStep!=='living-landscape'||!props.selected.startsWith('living-'))return;
    const sourceX=props.livingSetting==='upland'?-4.3:-2.1;
    const target=props.selected==='living-water'?new THREE.Vector3(sourceX,.7,-1.8):props.selected==='living-houses'?new THREE.Vector3(3.4,1,-.2):new THREE.Vector3(.8,1,-.5);
    const position=target.clone().add(props.selected==='living-water'?new THREE.Vector3(5,5.5,8):props.selected==='living-houses'?new THREE.Vector3(-4.8,4.2,6.4):new THREE.Vector3(8,7,12));
    runtime.processFramingAspect=earthFitAspect(runtime.camera.aspect);
    moveCamera(runtime,processFramedPosition(position,target,1,runtime.processFramingAspect),target);
  },[props.selected,props.livingSetting,viewKey,specializedStep,factory]);
  const detailFocus=props.selected.startsWith('palace-')||props.selected.startsWith('connection-')||props.selected.startsWith('rail-')||props.selected.startsWith('travel-')||props.viewKey==='M3'&&props.selected.startsWith('development-')?props.selected:props.viewKey==='R2'&&props.progress>=.68?'connection-transfer':props.viewKey==='M1'&&props.progress>=.3&&props.progress<.68?'rail-rock':props.viewKey==='M3'&&props.progress>=.32?'development-activity':'';
  useEffect(()=>{
    const runtime=runtimeRef.current;if(!runtime?.model||!['connections','travel'].includes(props.scene)&&!['M1','M3','K1'].includes(props.viewKey||''))return;
    const previous=processFocusRef.current,token=`${viewKey}:${detailFocus}`;processFocusRef.current=token;
    if(previous.split(':')[0]!==viewKey&&cameraViewCache.has(viewKey))return;
    if(!detailFocus){if(previous.startsWith(`${viewKey}:`)&&previous!==token)moveCamera(runtime,runtime.initialPosition.clone(),runtime.initialTarget.clone());return;}
    runtime.model?.update(propsRef.current,performance.now()/1000,0);
    let subject:THREE.Object3D|undefined;
    runtime.model?.group.traverse(object=>{if(subject||object instanceof THREE.Sprite||object.userData.selectId!==detailFocus||!object.userData.guideAnchor)return;let parent:THREE.Object3D|null=object;while(parent){if(!parent.visible)return;parent=parent.parent;}subject=object;});
    if(detailFocus==='rail-ice')subject=runtime.model?.group.getObjectByName('rail-unmeasured-risk-sample')||subject;
    if(!subject)return;
    const object=subject as THREE.Object3D,anchor=object.userData.guideAnchor;
    const target=anchor instanceof THREE.Vector3?anchor.clone():Array.isArray(anchor)?new THREE.Vector3(...anchor as [number,number,number]):new THREE.Vector3();
    object.updateWorldMatrix(true,false);object.localToWorld(target);
    const distance=detailFocus==='rail-ice'||detailFocus==='connection-obstruction'?11:detailFocus==='connection-pass'||detailFocus==='connection-ridge'||detailFocus==='travel-landform'?30:16;
    const direction=(detailFocus==='connection-obstruction'?new THREE.Vector3(.55,.8,-1):new THREE.Vector3(.7,.62,.95)).normalize().multiplyScalar(distance),aspect=earthFitAspect(runtime.camera.aspect);
    runtime.processFramingAspect=aspect;moveCamera(runtime,processFramedPosition(target.clone().add(direction),target,1,aspect),target);
  },[props.scene,viewKey,detailFocus,factory]);
  return <div ref={containerRef} className="tibet-scene-canvas" style={{width:'100%',height:'100%',minHeight:220,position:'relative',overflow:'hidden'}} />;
}
