import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {pilotElevationSampler} from './routePilotTerrainData';
import {pilotCorridorFrame} from './pilotTravelFrame';
import type {CorridorView,CorridorEdit} from '../data/corridorJourney';
type View=Extract<CorridorView,{kind:'overview'}>;
type Props={view:View;edit:CorridorEdit;onReady:()=>void;onError:(s:string)=>void};
/** A coarse whole-corridor composition of the SAME three existing source grids.
 * Unsupported outer space is left blank; no new terrain or place models. */
export default function CorridorOverview(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const el=host.current!,abort=new AbortController();let alive=true,frame=0,renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,resize:ResizeObserver|undefined;
  const labels:HTMLDivElement[]=[],leaders:HTMLDivElement[]=[];
  const get=async(p:string)=>{const r=await fetch(p,{signal:abort.signal});if(!r.ok)throw Error('整线资料未能准备，请重试。');return r;};
  void(async()=>{
   const dirs=['g318','g318-tongmai','g318-bomi'];
   const [patches,chain]=await Promise.all([Promise.all(dirs.map(async dir=>{
    const meta=await(await get(`/assets/routes/${dir}/manifest.json`)).json();
    const [buffer,texture]=await Promise.all([get(meta.elevation.url).then(r=>r.arrayBuffer()),new THREE.TextureLoader().loadAsync(meta.imagery.url)]);
    const grid=new Int16Array(meta.columns*meta.rows),bytes=new DataView(buffer);if(bytes.byteLength!==grid.length*2)throw Error('整线高程长度不符');for(let i=0;i<grid.length;i++)grid[i]=bytes.getInt16(i*2,true);
    return {meta,texture,sample:pilotElevationSampler(meta,grid)};
   })),get('/project-review/corridor-evidence/g318-source-chain.geojson').then(r=>r.json())]);
   if(!alive){patches.forEach(p=>p.texture.dispose());return;}
   renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.outputColorSpace=THREE.SRGBColorSpace;el.append(renderer.domElement);
   scene=new THREE.Scene();scene.background=new THREE.Color('#aebfc0');scene.add(new THREE.AmbientLight(0xffffff,2.4));const sun=new THREE.DirectionalLight(0xffffff,.8);sun.position.set(-20,50,10);scene.add(sun);
   const camera=new THREE.PerspectiveCamera(46,1,.03,900),lon0=95.02,lat0=29.83,mx=111.32*Math.cos(lat0*Math.PI/180);
   const inside=(p:number[],b:number[])=>p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];
   const sample=(p:number[])=>{const patch=patches.slice().reverse().find(x=>inside(p,x.meta.bbox));if(!patch)throw Error('原路超出既有高程范围');return patch.sample(p[0],p[1]);};
   const at=(p:number[],offset=0)=>new THREE.Vector3((p[0]-lon0)*mx,(sample(p)+offset)/1000,(lat0-p[1])*111.32);
   patches.forEach(({meta,texture,sample},owner)=>{
    const [w,s,e,n]=meta.bbox,xs=Array.from({length:Math.ceil((meta.columns-1)/4)+1},(_,i)=>Math.min(i*4,meta.columns-1)),ys=Array.from({length:Math.ceil((meta.rows-1)/4)+1},(_,i)=>Math.min(i*4,meta.rows-1));
    const vertices:number[]=[],uv:number[]=[],points:number[][]=[],indices:number[]=[];
    for(const row of ys)for(const col of xs){const lon=w+(e-w)*col/(meta.columns-1),lat=n-(n-s)*row/(meta.rows-1);points.push([lon,lat]);vertices.push((lon-lon0)*mx,sample(lon,lat)/1000,(lat0-lat)*111.32);uv.push(col/(meta.columns-1),1-row/(meta.rows-1));}
    const add=(a:number,b:number,c:number)=>{const center=[(points[a][0]+points[b][0]+points[c][0])/3,(points[a][1]+points[b][1]+points[c][1])/3];if(!patches.slice(owner+1).some(p=>inside(center,p.meta.bbox)))indices.push(a,b,c);};
    for(let y=0;y<ys.length-1;y++)for(let x=0;x<xs.length-1;x++){const a=y*xs.length+x,b=a+1,c=a+xs.length,d=c+1;add(a,c,b);add(b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();texture.colorSpace=THREE.SRGBColorSpace;scene!.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:texture,roughness:1})));
   });
   const coords=chain.geometry.coordinates as number[][];
   const material=new LineMaterial({color:0x86ebed,linewidth:3,depthTest:false,depthWrite:false}),gold=new LineMaterial({color:0xffd78a,linewidth:5,depthTest:false,depthWrite:false});
   const road=new LineGeometry();road.setPositions(coords.flatMap(p=>at(p,40).toArray()));const line=new Line2(road,material);line.frustumCulled=false;line.renderOrder=8;scene.add(line);
   const activeGeometry=new LineGeometry(),active=new Line2(activeGeometry,gold);active.frustumCulled=false;active.renderOrder=9;scene.add(active);
   for(const m of props.edit.markers){const label=document.createElement('div');label.className='corridor-world-label';label.textContent=m.name;const leader=document.createElement('div');leader.className='corridor-world-leader';el.append(leader,label);labels.push(label);leaders.push(leader);}
   const points=coords.map(p=>at(p)),target=new THREE.Vector3(),eye=new THREE.Vector3();let previous='';
   resize=new ResizeObserver(()=>{if(!renderer)return;const width=el.clientWidth,height=el.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();material.resolution.set(width,height);gold.resolution.set(width,height);});resize.observe(el);
   const draw=()=>{
    if(!alive||!renderer||!scene)return;const {view,edit}=latest.current,key=`${view.focus}:${Math.floor(view.read*coords.length)}`;
    if(key!==previous){const m=view.focus<0?undefined:edit.markers[view.focus],a=m?Math.max(0,m.index-180):0,b=m?Math.min(coords.length,m.index+181):Math.max(2,Math.ceil(coords.length*view.read));activeGeometry.setPositions(coords.slice(a,b).flatMap(p=>at(p,55).toArray()));previous=key;}
    const fit=pilotCorridorFrame(points,camera.aspect,view.overhead?78:49,0);target.copy(fit.target);eye.copy(fit.position);
    if(view.focus>=0){const anchor=at(edit.markers[view.focus].coordinate),delta=anchor.clone().sub(target).multiplyScalar(.28);target.add(delta);eye.add(delta);}
    if(camera.position.lengthSq()===0){camera.position.copy(eye);camera.lookAt(target);}else{camera.position.lerp(eye,.045);const looking=new THREE.Vector3();camera.getWorldDirection(looking);looking.multiplyScalar(camera.position.distanceTo(target)).add(camera.position);looking.lerp(target,.09);camera.lookAt(looking);}
    renderer.render(scene,camera);const occupied:{x:number;y:number;width:number;height:number}[]=[];
    edit.markers.forEach((m,i)=>{const p=at(m.coordinate,80).project(camera),label=labels[i],leader=leaders[i];label.hidden=p.z>1||Math.abs(p.x)>.98||Math.abs(p.y)>.9;leader.hidden=label.hidden;if(label.hidden)return;
     label.dataset.active=String(view.focus===i);const ax=(p.x+1)*el.clientWidth/2,ay=(1-p.y)*el.clientHeight/2,width=label.offsetWidth,height=label.offsetHeight;
     const x=Math.max(width/2+8,Math.min(el.clientWidth-width/2-8,ax));let y=Math.max(112,Math.min(el.clientHeight-160,ay));
     for(let k=0;k<7&&occupied.some(b=>Math.abs(b.x-x)<(b.width+width)/2+6&&Math.abs(b.y-y)<(b.height+height)/2+4);k++)y+=height+6;
     label.style.left=`${x}px`;label.style.top=`${y}px`;occupied.push({x,y,width,height});leader.style.left=`${x}px`;leader.style.top=`${y}px`;leader.style.width=`${Math.hypot(ax-x,ay-y)}px`;leader.style.transform=`rotate(${Math.atan2(ay-y,ax-x)}rad)`;
    });frame=requestAnimationFrame(draw);
   };latest.current.onReady();draw();
  })().catch(e=>{if(alive&&!abort.signal.aborted)latest.current.onError(e instanceof Error?e.message:'整线场景未能准备');});
  return()=>{alive=false;abort.abort();cancelAnimationFrame(frame);resize?.disconnect();for(const el of [...labels,...leaders])el.remove();scene?.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])if(mat){(mat as THREE.MeshStandardMaterial).map?.dispose();mat.dispose();}});renderer?.dispose();renderer?.domElement.remove();};
 },[]);
 return <div className="corridor-overview" ref={host} role="img" aria-label="林芝经色季拉山地、鲁朗、通麦至波密的真实整线路径；复用三段高程与影像"/>;
}
