import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {pilotElevationSampler} from './routePilotTerrainData';
import {pilotCorridorFrame} from './pilotTravelFrame';
import {routeArcLengths,routeSampleSegment} from './routeArcLength';
import type {BomiView} from '../data/bomiJourney';

type Coord=number[];
type Geometry={route:{coordinates:Coord[];sourceWayIdsByEdge:number[];wayTags:Record<string,{tunnel?:string;bridge?:string;name?:string}>};water:{group:string;name:string;coordinates:Coord[]}[];place:{coordinate:Coord;name:string}};
type Meta={bbox:number[];columns:number;rows:number;imagery:{url:string};elevation:{url:string};geometry:{url:string};localImagery:{url:string;bbox:number[]}};
type Props={view:BomiView;cameraKey:number;automatic:boolean;onReady:()=>void;onError:(s:string)=>void;onOrbit:()=>void;onRead:(r:{kilometres:number;total:number;elevation:number})=>void};
const base='/assets/routes/g318-bomi/';
/** R07 renderer is independent of the frozen Tongmai scene. Original route
 * nodes, dated pixels and the same sampled elevation surface remain distinct. */
export default function BomiTerrain(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const el=host.current!;let alive=true,frame=0,resize:ResizeObserver|undefined;
  let renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,controls:OrbitControls|undefined;
  const abort=new AbortController(),labels:HTMLDivElement[]=[],leaders:HTMLDivElement[]=[];
  const get=async(url:string)=>{const r=await fetch(url,{signal:abort.signal});if(!r.ok)throw Error('线路资料加载失败，请重试。');return r;};
  void(async()=>{
   const meta=await(await get(base+'manifest.json')).json() as Meta;
   const [bytes,geo,texture]=await Promise.all([get(meta.elevation.url).then(r=>r.arrayBuffer()),get(meta.geometry.url).then(r=>r.json()) as Promise<Geometry>,new THREE.TextureLoader().loadAsync(meta.imagery.url)]);
   if(!alive){texture.dispose();return;}
   if(bytes.byteLength!==meta.columns*meta.rows*2)throw Error('高程长度与来源不符。');
   const grid=new Int16Array(meta.columns*meta.rows),dv=new DataView(bytes);for(let i=0;i<grid.length;i++)grid[i]=dv.getInt16(i*2,true);
   const sample=pilotElevationSampler(meta,grid),[w,s,e,n]=meta.bbox,lon0=(w+e)/2,lat0=(s+n)/2,mx=111320*Math.cos(lat0*Math.PI/180);
   const at=(p:Coord,offset=0)=>new THREE.Vector3((p[0]-lon0)*mx/1000,(sample(p[0],p[1])+offset)/1000,(lat0-p[1])*111.32);
   const coords=geo.route.coordinates,flat=coords.map(p=>({x:(p[0]-lon0)*mx,y:0,z:(lat0-p[1])*111320})),lengths=routeArcLengths(flat);
   const along=(p:number)=>{const x=routeSampleSegment(flat,p),a=coords[x.index-1],b=coords[x.index];return a.map((v,i)=>THREE.MathUtils.lerp(v,b[i],x.fraction));};
   const town=geo.place.coordinate;
   renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.outputColorSpace=THREE.SRGBColorSpace;el.append(renderer.domElement);
   scene=new THREE.Scene();scene.background=new THREE.Color('#adc0c0');
   const camera=new THREE.PerspectiveCamera(46,1,.03,600);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1.8;controls.maxDistance=320;controls.maxPolarAngle=Math.PI*.43;
   let held=false,lastCameraKey=-1;controls.addEventListener('start',()=>{held=true;latest.current.onOrbit();});
   scene.add(new THREE.AmbientLight(0xffffff,2.6));const sun=new THREE.DirectionalLight(0xffffff,.65);sun.position.set(-30,70,20);scene.add(sun);
   texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   const geometry=new THREE.PlaneGeometry((e-w)*mx/1000,(n-s)*111.32,meta.columns-1,meta.rows-1);geometry.rotateX(-Math.PI/2);
   const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let i=0;i<grid.length;i++)positions.setY(i,grid[i]/1000);positions.needsUpdate=true;geometry.computeVertexNormals();
   scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0})));
   const localTexture=await new THREE.TextureLoader().loadAsync(meta.localImagery.url);
   if(!alive){localTexture.dispose();return;}
   localTexture.colorSpace=THREE.SRGBColorSpace;localTexture.anisotropy=texture.anisotropy;
   const lb=meta.localImagery.bbox,dx=(e-w)/(meta.columns-1),dy=(n-s)/(meta.rows-1);
   const x0=Math.ceil((lb[0]-w)/dx),x1=Math.floor((lb[2]-w)/dx),y0=Math.ceil((n-lb[3])/dy),y1=Math.floor((n-lb[1])/dy);
   const patch=[w+x0*dx,n-y1*dy,w+x1*dx,n-y0*dy];
   const localGeometry=new THREE.PlaneGeometry((patch[2]-patch[0])*mx/1000,(patch[3]-patch[1])*111.32,(x1-x0)*2,(y1-y0)*2);localGeometry.rotateX(-Math.PI/2);
   const lp=localGeometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<lp.count;i++){const lon=(patch[0]+patch[2])/2+lp.getX(i)*1000/mx,lat=(patch[1]+patch[3])/2-lp.getZ(i)/111.32;lp.setY(i,sample(lon,lat)/1000);}
   lp.needsUpdate=true;localGeometry.computeVertexNormals();
   localTexture.offset.set((patch[0]-lb[0])/(lb[2]-lb[0]),(patch[1]-lb[1])/(lb[3]-lb[1]));localTexture.repeat.set((patch[2]-patch[0])/(lb[2]-lb[0]),(patch[3]-patch[1])/(lb[3]-lb[1]));
   const localMesh=new THREE.Mesh(localGeometry,new THREE.MeshStandardMaterial({map:localTexture,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
   localMesh.position.set(((patch[0]+patch[2])/2-lon0)*mx/1000,0,(lat0-(patch[1]+patch[3])/2)*111.32);scene.add(localMesh);

   const materials:LineMaterial[]=[];
   const stroke=(path:Coord[],color:number,width:number,dashed=false,offset=22)=>{
    const g=new LineGeometry();g.setPositions(path.flatMap(p=>at(p,offset).toArray()));
    const m=new LineMaterial({color,linewidth:width,transparent:true,opacity:.95,depthTest:false,depthWrite:false,dashed,dashSize:.06,gapSize:.045});materials.push(m);
    const line=new Line2(g,m);line.computeLineDistances();line.renderOrder=6;line.frustumCulled=false;scene!.add(line);return line;
   };
   const riverLines=geo.water.map(r=>({line:stroke(r.coordinates,0x62dbde,3.5),group:r.group}));
   // Edges with equal engineering tags may form one stroke. Never connect
   // disjoint source ways or draw a tunnel as an above-ground solid road.
   let begin=0,kind='';
   const roadLines:{line:Line2;kind:string}[]=[];
   for(let i=0;i<=geo.route.sourceWayIdsByEdge.length;i++){
    const tags=geo.route.wayTags[String(geo.route.sourceWayIdsByEdge[i])],next=i===geo.route.sourceWayIdsByEdge.length?'end':tags?.tunnel==='yes'?'tunnel':tags?.bridge==='yes'?'bridge':'road';
    if(i===0)kind=next;
    if(next!==kind){roadLines.push({line:stroke(coords.slice(begin,i+1),kind==='bridge'?0xffd47e:kind==='tunnel'?0xe9d4f9:0xffeee0,kind==='bridge'?7:3.5,kind==='tunnel'),kind});begin=i;kind=next;}
   }
   const readLine=stroke(coords.slice(0,2),0xf5c96b,5),pin=new THREE.Mesh(new THREE.SphereGeometry(.055,16,10),new THREE.MeshBasicMaterial({color:0xffe2a2,depthTest:false}));pin.renderOrder=10;scene.add(pin);
   const nearest=(group:string,p:Coord)=>geo.water.filter(r=>r.group===group).flatMap(r=>r.coordinates).reduce((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])<Math.hypot(b[0]-p[0],b[1]-p[1])?a:b);
   const nearRiver=nearest('parlung',town);
   const references=[
    {text:'通麦 · 同一原路接续点',point:coords[0],scope:'whole'},
    {text:'扎木镇 · 县城驻地参照',point:town,scope:'town'},
    {text:'帕隆藏布',point:nearRiver,scope:'river'},
    {text:'G318 · 到达参照节点',point:coords.at(-1)!,scope:'road'},
   ];
   for(const r of references){const label=document.createElement('div');label.className='bomi-world-label';label.textContent=r.text;const leader=document.createElement('div');leader.className='bomi-world-leader';el.append(leader,label);labels.push(label);leaders.push(leader);}
   let previousRead=-1,lastReport=0;
   const target=new THREE.Vector3(),eye=new THREE.Vector3();
   resize=new ResizeObserver(()=>{if(!renderer)return;const width=el.clientWidth,height=el.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();for(const m of materials)m.resolution.set(width,height);});resize.observe(el);
   const draw=()=>{
    if(!alive||!renderer||!scene||!controls)return;
    const {view,cameraKey,automatic}=latest.current;
    if(cameraKey!==lastCameraKey){held=false;lastCameraKey=cameraKey;}
    const here=along(view.progress),readIndex=routeSampleSegment(flat,view.progress).index;
    if(readIndex!==previousRead){readLine.geometry.setPositions(coords.slice(0,Math.max(2,readIndex+1)).flatMap(p=>at(p,30).toArray()));previousRead=readIndex;}
    readLine.visible=view.phase==='travel';pin.position.copy(at(here,50));pin.visible=view.phase==='travel';
    if(!held){
     if(view.phase==='whole'){
      const fit=pilotCorridorFrame(coords.map(p=>at(p)),camera.aspect,view.overhead?78:50,0);target.copy(fit.target);eye.copy(fit.position);
     }else if(view.phase==='travel'){
      target.copy(at(along(Math.min(1,view.progress+.018))));const behind=at(along(Math.max(0,view.progress-.025))),ahead=at(along(Math.min(1,view.progress+.025))),heading=ahead.clone().sub(behind).setY(0).normalize();
      if(view.overhead)eye.copy(target).add(new THREE.Vector3(0,10,.3));else eye.copy(target).addScaledVector(heading,-5).add(new THREE.Vector3(3,6,0));
     }else{
      target.copy(at(view.focus==='river'?nearRiver:town));
      eye.copy(target).add(view.overhead?new THREE.Vector3(0,7,.35):view.focus==='mountain'?new THREE.Vector3(3.5,3.9,2.8):new THREE.Vector3(2.4,4,3.8));
     }
     if(camera.position.lengthSq()===0){camera.position.copy(eye);controls.target.copy(target);}
     else {const speed=automatic ? .055 : .11;camera.position.lerp(eye,speed);controls.target.lerp(target,speed);}
    }
    for(const r of riverLines)r.line.material.opacity=view.focus==='river'?1:.7;
    for(const r of roadLines){r.line.material.opacity=view.focus==='road'?1:.8;r.line.material.linewidth=view.focus==='road'?5:r.kind==='bridge'?5:3;}
    controls.update();renderer.render(scene,camera);
    const occupied:{x:number;y:number;width:number;height:number}[]=[];
    references.forEach((r,i)=>{
     const label=labels[i],local=view.phase!=='whole'&&view.phase!=='travel';
     const visible=r.scope==='whole'?!local:r.scope==='town'?true:local;
     const pt=at(r.point,60).project(camera),leader=leaders[i];label.hidden=!visible||pt.z>1||pt.z<0||Math.abs(pt.x)>.94||Math.abs(pt.y)>.86;leader.hidden=label.hidden;
     if(label.hidden)return;
     const anchorX=(pt.x+1)*el.clientWidth/2,anchorY=(1-pt.y)*el.clientHeight/2;
     let x=anchorX,y=anchorY;
     const width=label.offsetWidth,height=label.offsetHeight,minY=118,maxY=Math.max(minY,el.clientHeight-200);x=Math.max(width/2+10,Math.min(el.clientWidth-width/2-10,x));y=Math.max(minY,Math.min(maxY,y));
     for(let k=0;k<8&&occupied.some(b=>Math.abs(b.x-x)<(b.width+width)/2+5&&Math.abs(b.y-y)<(b.height+height)/2+4);k++){
      if(y-height-6>=minY)y-=height+6;else{x=Math.max(width/2+10,Math.min(el.clientWidth-width/2-10,x+width+12));y=maxY;}
     }
     label.style.left=`${x}px`;label.style.top=`${y}px`;occupied.push({x,y,width,height});
     const deltaX=anchorX-x,deltaY=anchorY-y;leader.style.left=`${x}px`;leader.style.top=`${y}px`;leader.style.width=`${Math.hypot(deltaX,deltaY)}px`;leader.style.transform=`rotate(${Math.atan2(deltaY,deltaX)}rad)`;
    });
    const now=performance.now();if(now-lastReport>200){lastReport=now;latest.current.onRead({kilometres:lengths.total*view.progress/1000,total:lengths.total/1000,elevation:sample(here[0],here[1])});}
    frame=requestAnimationFrame(draw);
   };
   latest.current.onReady();draw();
  })().catch(e=>{if(alive&&!abort.signal.aborted)latest.current.onError(e instanceof Error?e.message:'场景准备失败。');});
  return()=>{alive=false;abort.abort();cancelAnimationFrame(frame);resize?.disconnect();controls?.dispose();for(const label of [...labels,...leaders])label.remove();if(scene)scene.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats)if(mat){const tex=(mat as THREE.MeshStandardMaterial).map;tex?.dispose();mat.dispose();}});renderer?.dispose();renderer?.domElement.remove();};
 },[]);
 return <div className="bomi-terrain" ref={host} role="img" aria-label="通麦至波密：真实线路、帕隆藏布河谷和县城附近的三维地图"/>;
}
