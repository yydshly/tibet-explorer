import {lulangCultureReferences,lulangCultureState} from '../data/lulangCulture';
import {createLulangCultureSymbols} from './lulangCultureSymbols';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {routeArcLengths,routeSampleSegment} from './routeArcLength';
import {pilotConnectionProgress,type PilotView} from '../data/routePilot';
import {pilotElevationSampler,pilotTerrainContext,type PilotTerrainContext} from './routePilotTerrainData';
import {lulangPlaceData} from './lulangPlaceData';
import type {LulangLens} from '../data/lulangPlace';

type Coord=readonly number[];
type Meta={bbox:number[];columns:number;rows:number;imagery:{url:string};elevation:{url:string};geometry:{route:string;place:string}};
export type PilotReading={distance:number;total:number;elevation:number;longitude:number;latitude:number;highProgress:number;highCoordinate:number[]};
type Props={view:PilotView;cameraKey:number;onReady:()=>void;onError:(s:string)=>void;onInteract:()=>void;onReading:(s:PilotReading)=>void;onContext:(s:PilotTerrainContext)=>void};
const base='/assets/routes/g318/';
/** A separate instance preserves the frozen overview renderer and its state.
 * All route bends, footprint vertices and image pixels come from source data. */
export default function PilotRouteTerrain(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const el=host.current!;let alive=true,frame=0,resize:ResizeObserver|undefined;
  let renderer:THREE.WebGLRenderer|undefined,controls:OrbitControls|undefined,scene:THREE.Scene|undefined;
  const abort=new AbortController();
  const read=async(url:string)=>{const r=await fetch(url,{signal:abort.signal});if(!r.ok)throw Error(`资料未能加载：${url}`);return r;};
  void (async()=>{
   const meta=await (await read(base+'manifest.json')).json() as Meta;
   const [bytes,route,place]=await Promise.all([read(meta.elevation.url).then(r=>r.arrayBuffer()),read(meta.geometry.route).then(r=>r.json()),read(meta.geometry.place).then(r=>r.json())]);
   if(!alive)return;
   const grid=new Int16Array(meta.columns*meta.rows),dv=new DataView(bytes);
   if(bytes.byteLength!==grid.length*2)throw Error('高程文件长度与来源记录不一致');
   for(let i=0;i<grid.length;i++)grid[i]=dv.getInt16(i*2,true);
   const [west,south,east,north]=meta.bbox,lat0=(south+north)/2,lon0=(west+east)/2;
   const mx=111320*Math.cos(lat0*Math.PI/180),mz=111320;
   const sample=pilotElevationSampler(meta,grid),context=pilotTerrainContext(meta,grid,route,place);
   const local=lulangPlaceData(place,sample,route.coordinates.at(-1));context.lulang=local;
   const at=(p:Coord,offset=0)=>new THREE.Vector3((p[0]-lon0)*mx/1000,(sample(p[0],p[1])+offset)/1000,(lat0-p[1])*mz/1000);
   const coords=route.coordinates as number[][],flat=coords.map(p=>({x:(p[0]-lon0)*mx,y:0,z:(lat0-p[1])*mz}));
   const lengths=routeArcLengths(flat),total=lengths.total;
   const high=context.highestIndex,branchStart=context.connectionStartIndex;
   const highProgress=lengths.cumulative[high]/total;
   const along=(p:number)=>{const s=routeSampleSegment(flat,p),a=coords[s.index-1],b=coords[s.index];return [THREE.MathUtils.lerp(a[0],b[0],s.fraction),THREE.MathUtils.lerp(a[1],b[1],s.fraction)];};
   renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xb0c2c4);el.append(renderer.domElement);
   scene=new THREE.Scene();scene.background=new THREE.Color(0xabbfc2);
   const camera=new THREE.PerspectiveCamera(46,1,.03,500);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=140;controls.maxPolarAngle=Math.PI*.47;
   let held=false,lastCameraKey=-1;
   controls.addEventListener('start',()=>{held=true;latest.current.onInteract();});
   scene.add(new THREE.AmbientLight(0xffffff,2.1));const sun=new THREE.DirectionalLight(0xffffff,1.2);sun.position.set(-30,50,10);scene.add(sun);
   const texture=await new THREE.TextureLoader().loadAsync(meta.imagery.url);if(!alive){texture.dispose();return;}
   texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   const geometry=new THREE.PlaneGeometry((east-west)*mx/1000,(north-south)*mz/1000,meta.columns-1,meta.rows-1);geometry.rotateX(-Math.PI/2);
   const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<grid.length;i++)positions.setY(i,grid[i]/1000);positions.needsUpdate=true;geometry.computeVertexNormals();
   const terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}));scene.add(terrain);
   const lineMaterials:LineMaterial[]=[];
   const stroke=(owner:THREE.Object3D,paths:Coord[][],color:number,width:number,offset=12)=>{
    // Disjoint feature edges remain disjoint. Never connect separate OSM ways.
    const g=new LineGeometry();const joined:number[]=[];
    if(paths.length===1){for(const p of paths[0])joined.push(...at(p,offset).toArray());g.setPositions(joined);}
    else return undefined;
    const mat=new LineMaterial({color,linewidth:width,depthTest:false,depthWrite:false,transparent:true,opacity:.95});lineMaterials.push(mat);
    const l=new Line2(g,mat);l.renderOrder=8;l.frustumCulled=false;owner.add(l);return l;
   };
   const trunkOutline=stroke(scene,[coords.slice(0,branchStart+1)],0x0a252b,7),trunkLine=stroke(scene,[coords.slice(0,branchStart+1)],0x6adce1,3.4);
   const approach=new THREE.Group();scene.add(approach);stroke(approach,[coords.slice(branchStart)],0x0a252b,7);stroke(approach,[coords.slice(branchStart)],0xffd786,3.4);
   const town=new THREE.Group();scene.add(town);const built=new THREE.Group();town.add(built);
   const nature=new THREE.Group();scene.add(nature);const river=new THREE.Group();scene.add(river);
   const riverLines=local.riverPaths.map(path=>stroke(river,[path],0x65d7f0,4,18));
   for(const path of local.woodPaths)stroke(nature,[path],0x95d99b,2,18);
   stroke(nature,[local.section.map(p=>p.coordinate)],0xfff1d0,2,20);
   const serviceGroup=new THREE.Group();scene.add(serviceGroup);
   const serviceLayers=(['food','lodging'] as const).map(kind=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(local.services.filter(s=>s.kind===kind).flatMap(s=>at(s.coordinate,30).toArray()),3));const material=new THREE.PointsMaterial({color:kind==='food'?0xffbf68:0x9cbdff,size:7,sizeAttenuation:false,depthTest:false,transparent:true});const points=new THREE.Points(g,material);points.renderOrder=12;serviceGroup.add(points);return {kind,points};});
   const serviceSample=(kind:'food'|'lodging')=>local.services.filter(s=>s.kind===kind).sort((a,b)=>Math.hypot(a.coordinate[0]-local.riverPoint[0],a.coordinate[1]-local.riverPoint[1])-Math.hypot(b.coordinate[0]-local.riverPoint[0],b.coordinate[1]-local.riverPoint[1]))[0];
   const foodSample=serviceSample('food'),lodgingSample=serviceSample('lodging');
   const cultureReferences=lulangCultureReferences(local.services,local.riverPoint);
   const cultureSymbols=createLulangCultureSymbols();scene.add(cultureSymbols.group);
   const cultureLabels=Array.from({length:5},()=>{const div=document.createElement('div');div.className='pilot-culture-label';div.hidden=true;el.append(div);return div;});
   const townLines:number[]=[],footprints:number[]=[],landuse:number[]=[];
   const inside=(p:Coord)=>p[0]>=west&&p[0]<=east&&p[1]>=south&&p[1]<=north;
   // Omit source edges without full DEM support. Never clamp an out-of-bounds
   // road onto the last terrain column and create a fictitious edge route.
   const edges=(out:number[],line:Coord[],offset:number)=>{for(let i=1;i<line.length;i++)if(inside(line[i-1])&&inside(line[i]))out.push(...at(line[i-1],offset).toArray(),...at(line[i],offset).toArray());};
   for(const f of place.features){
    const type=f.properties.featureClass,c=f.geometry.coordinates;
    if(f.geometry.type==='LineString'&&type==='road')edges(townLines,c,14);
    if(f.geometry.type==='Polygon'&&['building','landuse','water'].includes(type))for(const ring of c)edges(type==='building'?footprints:landuse,ring,15);
   }
   const segments=(ps:number[],color:number,opacity=1)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity}));l.renderOrder=9;built.add(l);};
   segments(townLines,0xffda87);segments(footprints,0xf5ecce,.85);segments(landuse,0x9be5d3,.8);
   // Terminal roads are classified by archived source-way tags, never a guessed
   // kilometre cut. The moving head is a reading cursor, not historic building.
   const branch=coords.slice(branchStart),branchFlat=flat.slice(branchStart),trace=stroke(town,[branch],0xffd786,6,24);
   const junction=new THREE.Mesh(new THREE.RingGeometry(.045,.062,28),new THREE.MeshBasicMaterial({color:0xffd786,side:THREE.DoubleSide,depthTest:false}));junction.rotation.x=-Math.PI/2;junction.position.copy(at(coords[branchStart],28));scene.add(junction);
   const cursor=new THREE.Mesh(new THREE.SphereGeometry(.025,14,8),new THREE.MeshBasicMaterial({color:0xffebad,depthTest:false}));cursor.renderOrder=11;scene.add(cursor);
   const pointSpecs:{title:string;coordinate:number[];local:boolean;lenses?:LulangLens[];category?:'food'|'lodging'}[]=[{title:'林芝附近 · 源道路起点',coordinate:coords[0],local:false},{title:'色季拉山地 · 沿线高程样本',coordinate:coords[high],local:false},{title:'G318 → 地方接续',coordinate:coords[branchStart],local:false},{title:'鲁朗 · 现状建筑与地块',coordinate:coords.at(-1)!,local:true},
    {title:'鲁朗河 · 源河段',coordinate:local.riverPoint,local:false,lenses:['landscape','life']},
    ...(local.woodPaths.length?[{title:'地图林地边线',coordinate:local.woodPaths.flat().reduce((a,b)=>Math.hypot(a[0]-local.riverPoint[0],a[1]-local.riverPoint[1])<Math.hypot(b[0]-local.riverPoint[0],b[1]-local.riverPoint[1])?a:b),local:false,lenses:['landscape'] as LulangLens[]}]:[]),
    ...(foodSample?[{title:'石锅鸡餐饮 · 地图记录',coordinate:foodSample.coordinate,local:false,lenses:['life','culture'] as LulangLens[],category:'food' as const}]:[]),
    ...(lodgingSample?[{title:'住宿 · 地图记录',coordinate:lodgingSample.coordinate,local:false,lenses:['life','culture'] as LulangLens[],category:'lodging' as const}]:[])];
   const pins=pointSpecs.map((p,index)=>{const pin=new THREE.Mesh(new THREE.SphereGeometry(.02,12,8),new THREE.MeshBasicMaterial({color:0xffe4a4,depthTest:false}));pin.position.copy(at(p.coordinate,30));scene!.add(pin);const div=document.createElement('div');div.className='pilot-map-label';div.textContent=p.title;const leader=document.createElement('div');leader.className='pilot-map-leader';el.append(leader,div);return {pin,div,leader,index,local:p.local,lenses:p.lenses,category:p.category};});
   const size=new THREE.Vector2();const fit=()=>{const w=el.clientWidth,h=el.clientHeight;renderer!.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();lineMaterials.forEach(m=>m.resolution.set(w,h));cultureSymbols.setResolution(w,h);size.set(w,h);};resize=new ResizeObserver(fit);resize.observe(el);fit();
   let readingKey='',traceKey=-1;const desiredTarget=new THREE.Vector3(),desiredPosition=new THREE.Vector3();let initialized=false;
   const render=()=>{
    if(!alive)return;const state=latest.current.view;
    if(latest.current.cameraKey!==lastCameraKey){lastCameraKey=latest.current.cameraKey;held=false;}
    const localProgress=pilotConnectionProgress(state),lens=state.placeLens??'life',probe=state.sectionProgress??.5,filter=state.serviceFilter??'all';const culture=lulangCultureState(state),reference=cultureReferences[Math.min(cultureReferences.length-1,Math.max(0,Math.trunc(state.cultureSample??0)))]?.record??foodSample;let coordinate=along(state.progress);const position=at(coordinate,25);
    if(state.mode==='place'){
     const s=routeSampleSegment(branchFlat,localProgress),a=branch[s.index-1],b=branch[s.index],head=[THREE.MathUtils.lerp(a[0],b[0],s.fraction),THREE.MathUtils.lerp(a[1],b[1],s.fraction)];
     coordinate=head;position.copy(at(head,25));
     const key=Math.round(localProgress*1000);if(trace&&key!==traceKey){traceKey=key;const ps=branch.slice(0,s.index).concat([head]),previous=trace.geometry;trace.geometry=new LineGeometry();trace.geometry.setPositions(ps.flatMap(p=>at(p,24).toArray()));previous.dispose();}
     if(lens==='landscape'){coordinate=[THREE.MathUtils.lerp(local.section[0].coordinate[0],local.section.at(-1)!.coordinate[0],probe),local.riverPoint[1]];position.copy(at(coordinate,30));}
     else if(culture.active&&reference){coordinate=reference.coordinate;position.copy(at(coordinate,30));}
    }
    cursor.position.copy(position);cursor.scale.setScalar(Math.max(.4,camera.position.distanceTo(position)*.013));
    approach.visible=state.mode!=='place';town.visible=state.mode==='place'&&lens!=='landscape'&&localProgress>0;built.visible=localProgress>=.65;junction.visible=state.mode==='place';nature.visible=state.mode==='place'&&lens==='landscape';serviceGroup.visible=state.mode==='place'&&lens!=='landscape'&&state.servicesVisible!==false;
    river.visible=state.mode==='place';const naturalReading=state.mode==='place'&&lens==='landscape';if(trunkLine){trunkLine.material.color.setHex(naturalReading?0xa8ada3:0x6adce1);trunkLine.material.opacity=naturalReading?.4:.95;}if(trunkOutline)trunkOutline.material.opacity=naturalReading?.3:.95;
    for(const line of riverLines)if(line){line.material.opacity=naturalReading?.95:.38;line.material.linewidth=naturalReading?4:2.5;}
    for(const layer of serviceLayers)layer.points.visible=filter==='all'||filter===layer.kind;
    if(state.mode==='whole'){
     desiredTarget.set(0,3.7,0);const width=(east-west)*mx/1000,depth=(north-south)*mz/1000,tan=Math.tan(camera.fov*Math.PI/360),distance=Math.max(width/(2*tan*camera.aspect),depth/(2*tan))*1.45;
     desiredPosition.copy(desiredTarget).add(new THREE.Vector3(0,1,.75).normalize().multiplyScalar(distance));
    }else if(state.mode==='place'){
     const centre=at(lens==='landscape'?local.riverPoint:lens==='culture'&&reference?reference.coordinate:coords.at(-1)!);desiredTarget.copy(centre);const altitude=Math.max(state.height/1000,size.y*.01/(5*Math.tan(camera.fov*Math.PI/360)));desiredPosition.copy(centre).add(new THREE.Vector3(0,altitude,altitude*1.25));
    }else{
     const ahead=at(along(Math.min(1,state.progress+220/total))),behind=at(along(Math.max(0,state.progress-220/total))),direction=ahead.sub(behind);direction.y=0;direction.normalize();if(state.lookBack)direction.negate();
     desiredTarget.copy(position).addScaledVector(direction,.85);desiredTarget.y+=.08;
     desiredPosition.copy(position).addScaledVector(direction,-state.height/1000*.8);desiredPosition.y+=state.height/1000;
    }
    if(!initialized){camera.position.copy(desiredPosition);controls!.target.copy(desiredTarget);initialized=true;}
    else if(!held){camera.position.lerp(desiredPosition,.13);controls!.target.lerp(desiredTarget,.13);}
    const eyeLon=camera.position.x*1000/mx+lon0,eyeLat=lat0-camera.position.z*1000/mz;
    if(eyeLon>=west&&eyeLon<=east&&eyeLat>=south&&eyeLat<=north)camera.position.y=Math.max(camera.position.y,sample(eyeLon,eyeLat)/1000+.2);
    controls!.update();
    const occupied:{x:number;y:number;w:number}[]=[];
    for(const {pin,div,leader,index,local:localOnly,lenses,category} of pins){
     if(category==='food'&&foodSample){pin.position.copy(at(culture.active&&reference?reference.coordinate:foodSample.coordinate,30));div.textContent=culture.active?'参照餐饮 · 归档位置':'石锅鸡餐饮 · 地图记录';}
     const p=pin.position.clone().project(camera),x=(p.x+1)*size.x/2,y=(1-p.y)*size.y/2;
     const relevant=(!culture.active||Boolean(category))&&(!lenses||state.mode==='place'&&lenses.includes(lens))&&(!category||serviceGroup.visible&&(filter==='all'||category===filter))&&(!localOnly||town.visible&&built.visible);
     const show=relevant&&p.z>-1&&p.z<1&&x>15&&x<size.x-15&&y>130&&y<size.y-105;
     pin.visible=relevant;
     div.hidden=!show;leader.hidden=!show;
     if(show){
      const w=div.offsetWidth,offset=state.mode==='place'?(index===2?-130:localOnly?130:category==='food'?(culture.active?-220:-120):category==='lodging'?120:0):0,lx=Math.max(w/2+12,Math.min(size.x-w/2-12,x+offset));let ly=y-32;
      for(let i=0;i<5&&occupied.some(o=>Math.abs(o.y-ly)<34&&Math.abs(o.x-lx)<(w+o.w)/2+8);i++)ly-=36;
      if(ly<140)ly=y+36;occupied.push({x:lx,y:ly,w});
      div.style.left=`${lx}px`;div.style.top=`${ly}px`;
      const dy=ly-y,dx=lx-x;leader.style.left=`${x}px`;leader.style.top=`${y}px`;leader.style.width=`${Math.hypot(dx,dy)}px`;leader.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
     }
     pin.scale.setScalar(Math.max(1,camera.position.distanceTo(pin.position)*.01));
    }
    const cultureAnchor=at(reference?.coordinate??local.riverPoint,80);
    const symbolReadings=cultureSymbols.update(state,cultureAnchor,camera.position.distanceTo(cultureAnchor)*.095);
    symbolReadings.forEach((label,i)=>{const div=cultureLabels[i],p=label.position.clone().project(camera),x=(p.x+1)*size.x/2,y=(1-p.y)*size.y/2;const show=label.visible&&p.z>-1&&p.z<1&&y>145&&y<size.y-105;div.hidden=!show;if(show){div.textContent=label.title;div.dataset.muted=String(label.muted);const w=div.offsetWidth;div.style.left=`${Math.max(w/2+15,Math.min(size.x-w/2-15,x))}px`;div.style.top=`${y}px`;}});
    renderer!.render(scene!,camera);
    const key=`${Math.round(state.progress*1000)}:${state.mode}:${Math.round(localProgress*1000)}:${lens}:${Math.round(probe*1000)}:${state.cultureSample??0}`;
    if(key!==readingKey){readingKey=key;latest.current.onReading({distance:state.mode==='place'?total-context.connectionLength*(1-localProgress):state.progress*total,total,elevation:sample(coordinate[0],coordinate[1]),longitude:coordinate[0],latitude:coordinate[1],highProgress,highCoordinate:coords[high]});}
    frame=requestAnimationFrame(render);
   };
   latest.current.onContext(context);latest.current.onReady();render();
  })().catch(e=>{if(alive&&e.name!=='AbortError')latest.current.onError(e.message||'线路场景未能加载');});
  return()=>{alive=false;abort.abort();cancelAnimationFrame(frame);resize?.disconnect();controls?.dispose();scene?.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of materials)if(m){(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}});renderer?.dispose();el.replaceChildren();};
 },[]);
 return <div ref={host} className="pilot-terrain" role="img" aria-label="真实卫星影像与高程上的G318林芝至鲁朗道路，可旋转缩放"/>;
}
