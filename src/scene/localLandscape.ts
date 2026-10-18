import * as THREE from 'three';
import {elevationPose} from '../lib/elevationReading';
import {buildElevationProbe} from './elevationProbe';
import {disposeTree,label,line} from './environment';
import {TERRAIN_READING_META,sampleTerrainMetres} from './terrainReading';
import {localLandscapeMeta as meta,localLandscapeStage} from '../data/localLandscape';
import {verifiedPlaceReferences} from '../data/placeProvenance';
import {subjectCallouts} from './subjectCallouts';
import type {TibetSceneProps} from './TibetScene';
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const overview=TERRAIN_READING_META,unit=(overview.east-overview.west)*111320*Math.cos(31.5*Math.PI/180)/80;
export function localLandscapePosition(lon:number,lat:number,metres=0){return V((lon-88.5)*111320*Math.cos(31.5*Math.PI/180)/unit,metres*meta.verticalExaggeration/unit,(31.5-lat)*111320/unit);}
export function sampleLocalLandscape(grid:ArrayLike<number>,lon:number,lat:number){
 if(grid.length!==meta.columns*meta.rows)throw new Error('Invalid local terrain grid');
 const b=meta.boundsDegrees,x=THREE.MathUtils.clamp((lon-b.west)/(b.east-b.west)*(meta.columns-1),0,meta.columns-1),y=THREE.MathUtils.clamp((b.north-lat)/(b.north-b.south)*(meta.rows-1),0,meta.rows-1),ix=Math.min(meta.columns-2,Math.floor(x)),iy=Math.min(meta.rows-2,Math.floor(y)),fx=x-ix,fy=y-iy;
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(grid[iy*meta.columns+ix],grid[iy*meta.columns+ix+1],fx),THREE.MathUtils.lerp(grid[(iy+1)*meta.columns+ix],grid[(iy+1)*meta.columns+ix+1],fx),fy);
}
type Runtime={renderer:{getSize:(v:THREE.Vector2)=>THREE.Vector2};camera:THREE.PerspectiveCamera;focus:(position:THREE.Vector3,target:THREE.Vector3)=>void;hasSavedView:(key:string)=>boolean};
export function buildLocalLandscapeScene(runtime:Runtime){
 const group=new THREE.Group();group.name='source-based-local-landscape';const abort=new AbortController();let alive=true,grid:Int16Array|null=null,lastStage=-1,lastProfile=-1,localSurface:THREE.Mesh|null=null,fullIndices:Uint32Array|null=null,clippedColumn=-2,sectionOpen=false;
 const material=new THREE.MeshStandardMaterial({color:0xb3c2bf,vertexColors:true,roughness:.98,side:THREE.DoubleSide});
 const overviewGroup=new THREE.Group(),localGroup=new THREE.Group();overviewGroup.userData.selectId='local-overview';localGroup.userData.selectId='local-window';group.add(overviewGroup,localGroup);
 const readingProbe=buildElevationProbe(group,'local-probe',runtime);readingProbe.group.visible=false;
 const anchors:Record<string,THREE.Vector3>={};
 const pointSubject=(id:string,color:number)=>{const g=new THREE.Group();g.userData.selectId=id;g.userData.guideAnchor=V(0,.06,0);const marker=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color}));g.add(marker);group.add(g);anchors[id]=g.position;return g;};
 const town=pointSubject('local-town',0xffdc88),high=pointSubject('local-slope',0xffd590),low=pointSubject('local-valley',0x91e2e5);
 const profile=line(Array.from({length:meta.rows},()=>V(0,0,0)),0xf1d18b,1);profile.userData.selectId='local-profile';group.add(profile);
 const profileWall=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:0xba9b70,side:THREE.DoubleSide,transparent:true,opacity:.72,roughness:1}));group.add(profileWall);
 const outline=line(Array.from({length:5},()=>V(0,0,0)),0xf2ce7d,1);outline.userData.selectId='local-window';group.add(outline);
 const status=label('正在读取林芝局部高程…','#d7e6df'),note=label('Mapzen高程 · 局部约0.4 km · 高度×2 · 颜色为海拔','#d4ddd1');status.onBeforeRender=note.onBeforeRender=()=>{};group.add(status,note);
 const callouts=subjectCallouts(group,[
  {id:'local-window',text:'林芝局部数据窗口',anchor:V(0,0,0),show:()=>lastStage===0},
  {id:'local-town',text:'林芝 · 城区参照',anchor:town.position,show:()=>!!grid&&lastStage>=1},
  {id:'local-slope',text:'当前切线 · 较高处',anchor:high.position,show:()=>!!grid&&lastStage===2},
  {id:'local-valley',text:'当前切线 · 较低处',anchor:low.position,show:()=>!!grid&&lastStage===2},
  {id:'local-profile',text:'至0 m参考面 · 不表示地下地层',anchor:V(0,0,0),show:()=>!!grid&&lastStage===2&&sectionOpen},
 ]);
 function meshFor(data:Int16Array,b:{west:number;east:number;south:number;north:number},columns:number,rows:number,excludeLocal=false){
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(columns*rows*3),colors=new Float32Array(positions.length),indices:number[]=[],color=new THREE.Color();
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const index=row*columns+col,lon=THREE.MathUtils.lerp(b.west,b.east,col/(columns-1)),lat=THREE.MathUtils.lerp(b.north,b.south,row/(rows-1)),point=localLandscapePosition(lon,lat,data[index]);positions.set(point.toArray(),index*3);const ratio=THREE.MathUtils.clamp(data[index]/8000,0,1);color.setHSL(.30-ratio*.22,.28,.23+ratio*.42).convertSRGBToLinear();colors.set([color.r,color.g,color.b],index*3);
   if(row<rows-1&&col<columns-1){const local=meta.boundsDegrees,inside=excludeLocal&&lon>=local.west&&lon+(b.east-b.west)/(columns-1)<=local.east&&lat<=local.north&&lat-(b.north-b.south)/(rows-1)>=local.south;if(!inside)indices.push(index,index+columns,index+1,index+1,index+columns,index+columns+1);}}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.name=excludeLocal?'regional-context-grid':'nyingchi-local-grid';return mesh;
 }
 const ready=Promise.all([fetch(overview.dataUrl,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('整体高程不可用');return r.arrayBuffer();}),fetch(meta.dataUrl,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('局部高程不可用');return r.arrayBuffer();}),fetch('/assets/earth-context.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('地理范围不可用');return r.json();})]).then(([coarse,local,boundaries])=>{
  if(!alive)return;const regional=new Int16Array(coarse);grid=new Int16Array(local);if(regional.length!==overview.columns*overview.rows||grid.length!==meta.columns*meta.rows)throw Error('高程网格不完整');
  overviewGroup.add(meshFor(regional,overview,overview.columns,overview.rows,true));localSurface=meshFor(grid,meta.boundsDegrees,meta.columns,meta.rows);localGroup.add(localSurface);fullIndices=new Uint32Array(localSurface.geometry.index!.array);localSurface.geometry.index!.setUsage(THREE.DynamicDrawUsage);
  const rings=boundaries.tibet.type==='MultiPolygon'?boundaries.tibet.coordinates.flat():boundaries.tibet.coordinates;
  for(const ring of rings){const path=line(ring.map(([lon,lat]:number[])=>localLandscapePosition(lon,lat,sampleTerrainMetres(regional,lon,lat)+100)),0xd4c899,.7);path.name='source-based-tibet-reference';group.add(path);}
  const origin=localLandscapePosition(93.8,29.1,1200),north=new THREE.ArrowHelper(V(0,0,-1),origin,.65,0xc7ddda,.16,.09),northText=label('北','#c7ddda');northText.position.copy(origin).add(V(0,.12,-.8));northText.scale.set(.22,.12,1);northText.onBeforeRender=()=>{};group.add(north,northText);
  const ref=verifiedPlaceReferences.nyingchi;town.position.copy(localLandscapePosition(ref.longitude,ref.latitude,sampleLocalLandscape(grid,ref.longitude,ref.latitude)+50));
  const center=localLandscapePosition(94.375,29.65,sampleLocalLandscape(grid,94.375,29.65));localGroup.userData.guideAnchor=center.clone();overviewGroup.userData.guideAnchor=localLandscapePosition(88.5,31.5,4500);callouts.entries[0].anchor.copy(center);
  const b=meta.boundsDegrees,corners=[[b.west,b.north],[b.east,b.north],[b.east,b.south],[b.west,b.south],[b.west,b.north]];const a=outline.geometry.attributes.position as THREE.BufferAttribute;corners.forEach(([lon,lat],i)=>a.setXYZ(i,...localLandscapePosition(lon,lat,sampleLocalLandscape(grid!,lon,lat)+90).toArray()));a.needsUpdate=true;outline.geometry.computeBoundingSphere();status.visible=false;group.userData.dataReady=true;lastStage=-1;
 }).catch(error=>{if(!alive||error.name==='AbortError')return;status.userData.error=error.message;group.userData.dataError=true;throw error;});
 const viewport=new THREE.Vector2();let disposed=false;
 return {group,ready,update:(p:TibetSceneProps)=>{
  if(disposed)return;const stage=localLandscapeStage(p.progress);group.userData.stage=stage;
  if(grid&&stage!==lastStage){const initial=lastStage===-1;lastStage=stage;if(!initial||!runtime.hasSavedView('P1')){const center=localLandscapePosition(94.375,29.65,sampleLocalLandscape(grid,94.375,29.65));runtime.focus(stage===0?V(34,61,65):center.clone().add(V(5.3,4.4,6.7)),stage===0?V(0,.7,0):center);}}
  const reading=elevationPose('P1',p,p.guide);if(grid&&reading?.profile){const metres=sampleLocalLandscape(grid,reading.longitude,reading.latitude);readingProbe.update(localLandscapePosition(reading.longitude,reading.latitude,metres+20),true);readingProbe.group.userData.sourceMetres=metres;readingProbe.group.userData.coordinates=[reading.longitude,reading.latitude];}else readingProbe.group.visible=false;
  high.visible=low.visible=profile.visible=stage===2&&!!grid;sectionOpen=stage===2&&p.cutaway;profileWall.visible=profile.visible&&p.cutaway;outline.visible=!!grid;
  const longitude=93.86+THREE.MathUtils.clamp((p.progress-.68)/.32,0,1)*1.02;
  callouts.entries[4].anchor.copy(localLandscapePosition(Math.min(95,longitude+.18),29.25,0));
  if(grid&&localSurface&&fullIndices){const column=stage===2&&p.cutaway?Math.floor((longitude-meta.boundsDegrees.west)/(meta.boundsDegrees.east-meta.boundsDegrees.west)*(meta.columns-1)):meta.columns-1;if(column!==clippedColumn){clippedColumn=column;const index=localSurface.geometry.index!;if(column===meta.columns-1){(index.array as Uint32Array).set(fullIndices);localSurface.geometry.setDrawRange(0,fullIndices.length);}else{const target=index.array as Uint32Array;let offset=0;for(let row=0;row<meta.rows-1;row++)for(let c=0;c<column;c++){const i=row*meta.columns+c;target[offset++]=i;target[offset++]=i+meta.columns;target[offset++]=i+1;target[offset++]=i+1;target[offset++]=i+meta.columns;target[offset++]=i+meta.columns+1;}localSurface.geometry.setDrawRange(0,offset);}index.needsUpdate=true;}}
  if(grid&&stage===2&&Math.abs(longitude-lastProfile)>.00005){lastProfile=longitude;const a=profile.geometry.attributes.position as THREE.BufferAttribute,points:number[]=[],indices:number[]=[];let min=Infinity,max=-Infinity,minPoint=V(0,0,0),maxPoint=V(0,0,0);
   for(let row=0;row<meta.rows;row++){const lat=THREE.MathUtils.lerp(meta.boundsDegrees.north,meta.boundsDegrees.south,row/(meta.rows-1)),height=sampleLocalLandscape(grid,longitude,lat),point=localLandscapePosition(longitude,lat,height+15);a.setXYZ(row,...point.toArray());points.push(point.x,point.y,point.z,point.x,0,point.z);if(height<min){min=height;minPoint.copy(point);}if(height>max){max=height;maxPoint.copy(point);}if(row<meta.rows-1){const j=row*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
   a.needsUpdate=true;profile.geometry.computeBoundingSphere();profile.userData.guideAnchor=localLandscapePosition(longitude,29.65,sampleLocalLandscape(grid,longitude,29.65));profileWall.geometry.dispose();profileWall.geometry=new THREE.BufferGeometry();profileWall.geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));profileWall.geometry.setIndex(indices);profileWall.geometry.computeVertexNormals();high.position.copy(maxPoint);low.position.copy(minPoint);group.userData.profile={longitude,minimum:Math.round(min),maximum:Math.round(max)};callouts.setText('local-slope',`切线较高 · 约${Math.round(max/10)*10} m`);callouts.setText('local-valley',`切线较低 · 约${Math.round(min/10)*10} m`);
  }
  runtime.renderer.getSize(viewport);callouts.update(runtime.camera,runtime.renderer,p.guide?.active?p.guide.targets[0]:p.selected,viewport.x<600?100:270);runtime.camera.updateMatrixWorld();const focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2)));
  note.visible=viewport.x>=600||viewport.y>=500;
  for(const [sprite,y,pixels,width] of [[note,viewport.y-245,18,Math.min(viewport.x-25,480)],[status,170,22,Math.min(viewport.x-25,360)]] as const){const position=V(0,1-y/viewport.y*2,.5).unproject(runtime.camera),height=pixels*position.distanceTo(runtime.camera.position)/focal;sprite.position.copy(position);sprite.scale.set(height*width/pixels,height,1);}
 },dispose:()=>{if(disposed)return;disposed=true;alive=false;abort.abort();disposeTree(group);}};
}
