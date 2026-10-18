import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {routeArcLengths,routeSampleSegment} from './routeArcLength';
import type {PilotView} from '../data/routePilot';

type Coord=readonly number[];
type Meta={bbox:number[];columns:number;rows:number;imagery:{url:string};elevation:{url:string};geometry:{route:string;place:string}};
export type PilotReading={distance:number;total:number;elevation:number;longitude:number;latitude:number;highProgress:number;highCoordinate:number[]};
type Props={view:PilotView;cameraKey:number;onReady:()=>void;onError:(s:string)=>void;onInteract:()=>void;onReading:(s:PilotReading)=>void};
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
   const [bytes,route,place]=await Promise.all([(await read(meta.elevation.url)).arrayBuffer(),read(meta.geometry.route).then(r=>r.json()),read(meta.geometry.place).then(r=>r.json())]);
   if(!alive)return;
   const grid=new Int16Array(meta.columns*meta.rows),dv=new DataView(bytes);
   if(bytes.byteLength!==grid.length*2)throw Error('高程文件长度与来源记录不一致');
   for(let i=0;i<grid.length;i++)grid[i]=dv.getInt16(i*2,true);
   const [west,south,east,north]=meta.bbox,lat0=(south+north)/2,lon0=(west+east)/2;
   const mx=111320*Math.cos(lat0*Math.PI/180),mz=111320;
   const sample=(lon:number,lat:number)=>{
    const x=THREE.MathUtils.clamp((lon-west)/(east-west)*(meta.columns-1),0,meta.columns-1),y=THREE.MathUtils.clamp((north-lat)/(north-south)*(meta.rows-1),0,meta.rows-1);
    const ix=Math.min(meta.columns-2,Math.floor(x)),iy=Math.min(meta.rows-2,Math.floor(y)),fx=x-ix,fy=y-iy;
    const a=grid[iy*meta.columns+ix],b=grid[iy*meta.columns+ix+1],c=grid[(iy+1)*meta.columns+ix+1],d=grid[(iy+1)*meta.columns+ix];
    return fx+fy<=1?a+(b-a)*fx+(d-a)*fy:c+(d-c)*(1-fx)+(b-c)*(1-fy);
   };
   const at=(p:Coord,offset=0)=>new THREE.Vector3((p[0]-lon0)*mx/1000,(sample(p[0],p[1])+offset)/1000,(lat0-p[1])*mz/1000);
   const coords=route.coordinates as number[][],flat=coords.map(p=>({x:(p[0]-lon0)*mx,y:0,z:(lat0-p[1])*mz}));
   const lengths=routeArcLengths(flat),total=lengths.total;
   let high=0;for(let i=1;i<coords.length;i++)if(sample(...coords[i].slice(0,2) as [number,number])>sample(...coords[high].slice(0,2) as [number,number]))high=i;
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
   stroke(scene,[coords],0x0a252b,7);stroke(scene,[coords],0x6adce1,3.4);
   const town=new THREE.Group();scene.add(town);
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
   const segments=(ps:number[],color:number,opacity=1)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity}));l.renderOrder=9;town.add(l);};
   segments(townLines,0xffda87);segments(footprints,0xf5ecce,.85);segments(landuse,0x9be5d3,.8);
   // Final archived service-road branch, not an invented hotel-door connector.
   let branchStart=coords.length-1;while(branchStart>0&&lengths.cumulative[branchStart]>total-1051.1)branchStart--;
   stroke(town,[coords.slice(branchStart)],0xffd786,6,24);
   const cursor=new THREE.Mesh(new THREE.SphereGeometry(.025,14,8),new THREE.MeshBasicMaterial({color:0xffebad,depthTest:false}));cursor.renderOrder=11;scene.add(cursor);
   const pointSpecs=[{title:'林芝附近 · 源道路起点',coordinate:coords[0],local:false},{title:'色季拉山地 · 沿线高程样本',coordinate:coords[high],local:false},{title:'鲁朗 · 地方观察',coordinate:coords.at(-1)!,local:false},{title:'地方接续 · 现状服务道路',coordinate:coords[Math.floor((branchStart+coords.length-1)/2)],local:true}];
   const pins=pointSpecs.map(p=>{const pin=new THREE.Mesh(new THREE.SphereGeometry(.02,12,8),new THREE.MeshBasicMaterial({color:0xffe4a4,depthTest:false}));pin.position.copy(at(p.coordinate,30));scene!.add(pin);const div=document.createElement('div');div.className='pilot-map-label';div.textContent=p.title;const leader=document.createElement('div');leader.className='pilot-map-leader';el.append(leader,div);return {pin,div,leader,local:p.local};});
   const size=new THREE.Vector2();const fit=()=>{const w=el.clientWidth,h=el.clientHeight;renderer!.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();lineMaterials.forEach(m=>m.resolution.set(w,h));size.set(w,h);};resize=new ResizeObserver(fit);resize.observe(el);fit();
   let readingKey='';const desiredTarget=new THREE.Vector3(),desiredPosition=new THREE.Vector3();let initialized=false;
   const render=()=>{
    if(!alive)return;const state=latest.current.view;
    if(latest.current.cameraKey!==lastCameraKey){lastCameraKey=latest.current.cameraKey;held=false;}
    const coordinate=along(state.progress),position=at(coordinate,25);
    cursor.position.copy(position);cursor.scale.setScalar(Math.max(.4,camera.position.distanceTo(position)*.013));
    town.visible=state.mode==='place'&&state.connections;
    if(state.mode==='whole'){
     desiredTarget.set(0,3.7,0);const width=(east-west)*mx/1000,depth=(north-south)*mz/1000,tan=Math.tan(camera.fov*Math.PI/360),distance=Math.max(width/(2*tan*camera.aspect),depth/(2*tan))*1.45;
     desiredPosition.copy(desiredTarget).add(new THREE.Vector3(0,1,.75).normalize().multiplyScalar(distance));
    }else if(state.mode==='place'){
     const centre=at(coords.at(-1)!);desiredTarget.copy(centre);const altitude=Math.max(state.height/1000,size.y*.01/(3*Math.tan(camera.fov*Math.PI/360)));desiredPosition.copy(centre).add(new THREE.Vector3(0,altitude,altitude*1.25));
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
    for(const {pin,div,leader,local} of pins){
     const p=pin.position.clone().project(camera),x=(p.x+1)*size.x/2,y=(1-p.y)*size.y/2;
     const show=(!local||town.visible)&&p.z>-1&&p.z<1&&x>15&&x<size.x-15&&y>130&&y<size.y-105;
     pin.visible=!local||town.visible;
     div.hidden=!show;leader.hidden=!show;
     if(show){
      const w=div.offsetWidth,lx=Math.max(w/2+12,Math.min(size.x-w/2-12,x));let ly=y-32;
      for(let i=0;i<5&&occupied.some(o=>Math.abs(o.y-ly)<34&&Math.abs(o.x-lx)<(w+o.w)/2+8);i++)ly-=36;
      if(ly<140)ly=y+36;occupied.push({x:lx,y:ly,w});
      div.style.left=`${lx}px`;div.style.top=`${ly}px`;
      const dy=ly-y,dx=lx-x;leader.style.left=`${x}px`;leader.style.top=`${y}px`;leader.style.width=`${Math.hypot(dx,dy)}px`;leader.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
     }
     pin.scale.setScalar(Math.max(1,camera.position.distanceTo(pin.position)*.01));
    }
    renderer!.render(scene!,camera);
    const key=`${Math.round(state.progress*1000)}:${state.mode}`;
    if(key!==readingKey){readingKey=key;latest.current.onReading({distance:state.progress*total,total,elevation:sample(coordinate[0],coordinate[1]),longitude:coordinate[0],latitude:coordinate[1],highProgress,highCoordinate:coords[high]});}
    frame=requestAnimationFrame(render);
   };
   latest.current.onReady();render();
  })().catch(e=>{if(alive&&e.name!=='AbortError')latest.current.onError(e.message||'线路场景未能加载');});
  return()=>{alive=false;abort.abort();cancelAnimationFrame(frame);resize?.disconnect();controls?.dispose();scene?.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of materials)if(m){(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}});renderer?.dispose();el.replaceChildren();};
 },[]);
 return <div ref={host} className="pilot-terrain" role="img" aria-label="真实卫星影像与高程上的G318林芝至鲁朗道路，可旋转缩放"/>;
}
