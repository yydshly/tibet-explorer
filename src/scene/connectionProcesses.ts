import * as THREE from 'three';
import { disposeTree, label, line, mineralTexture } from './environment';
import { connectionProcessState } from '../data/connectionUnderstanding';
import type { TibetSceneProps } from './TibetScene';

type Runtime={renderer:{getSize:(value:THREE.Vector2)=>THREE.Vector2};camera:THREE.PerspectiveCamera};
type Plan=readonly(readonly[number,number])[];
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const GOLD=0xe6c785,TEAL=0x82d0d8;
const smooth=(p:number,a:number,b:number)=>THREE.MathUtils.smoothstep(p,a,b);
const MAIN:Plan=[[-.25,-11],[.35,-7],[-.3,-3],[0,1],[-.3,5],[.35,9],[.2,12]];
const LEFT:Plan=[[-8,-8],[-4,-3.5],[0,1]];
const RIGHT:Plan=[[8,-8],[4,-3],[0,1]];

function segmentDistance(x:number,z:number,a:readonly[number,number],b:readonly[number,number]){
  const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
function channelDistance(x:number,z:number){
  let result=Infinity;for(const plan of [MAIN,LEFT,RIGHT])for(let i=1;i<plan.length;i++)result=Math.min(result,segmentDistance(x,z,plan[i-1],plan[i]));return result;
}
/** Author-defined continuous relief. Channel beds decline to the south of this local model. */
export function connectionBasinHeight(x:number,z:number){
  const bed=3.9-(THREE.MathUtils.clamp(z,-13,14)+11)*.145,d=Math.max(0,channelDistance(x,z)-.35);
  const radius=Math.sqrt((x/15)**2+((z+.5)/17)**2),outer=Math.exp(-((Math.max(0,radius-.75)/.55)**2));
  return bed+.16+(.46*d+.075*d*d)*(1+.1*Math.sin(x*.4+z*.22))*outer;
}
/** The saddle is lower than the same ridge on either side; it is not a real pass. */
export function connectionPassHeight(x:number,z:number){
  return .35+1.6*Math.exp(-((x/4)**2))+(3.8-3.2*Math.exp(-((z/1.25)**2)))*Math.exp(-((x/3.1)**2))+.28*Math.sin(z*.35)**2+.012*z*z;
}

function planSamples(plan:Plan,height:(x:number,z:number)=>number,offset=.08,count=100){
  const distances=plan.slice(1).map((point,i)=>Math.hypot(point[0]-plan[i][0],point[1]-plan[i][1])),total=distances.reduce((a,b)=>a+b,0);
  return Array.from({length:count+1},(_,n)=>{let remaining=total*n/count,index=0;while(index<distances.length-1&&remaining>distances[index])remaining-=distances[index++];const a=plan[index],b=plan[index+1],t=distances[index]?remaining/distances[index]:0,x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[1],b[1],t);return V(x,height(x,z)+offset,z);});
}
type Route={points:THREE.Vector3[];lengths:number[];total:number};
function route(points:THREE.Vector3[]):Route{
  let total=0;const lengths=[0];for(let i=1;i<points.length;i++){total+=points[i].distanceTo(points[i-1]);lengths.push(total);}return {points,lengths,total};
}
function at(path:Route,fraction:number,target=new THREE.Vector3()){
  const distance=THREE.MathUtils.clamp(fraction,0,1)*path.total;let index=1;while(index<path.lengths.length-1&&path.lengths[index]<distance)index++;
  const start=path.lengths[index-1],length=path.lengths[index]-start;return target.copy(path.points[index-1]).lerp(path.points[index],length>0?(distance-start)/length:0);
}
/** Greedy descent is performed on the authored surface, so slope water cannot climb. */
function descend(start:[number,number]){
  const points=[V(start[0],connectionBasinHeight(...start)+.085,start[1])];let x=start[0],z=start[1];
  for(let n=0;n<95;n++){
    const height=connectionBasinHeight(x,z);let bx=x,bz=z,best=height;
    for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,nx=x+Math.cos(angle)*.22,nz=z+Math.sin(angle)*.22,h=connectionBasinHeight(nx,nz);if(h<best-.0001&&Math.abs(nx)<15&&nz<12){best=h;bx=nx;bz=nz;}}
    if(bx===x&&bz===z)break;x=bx;z=bz;points.push(V(x,best+.085,z));
    if(channelDistance(x,z)<.16&&n>4)break;
  }return points;
}

/** Complete local terrain, material motion and participants; no real map or road geometry is implied. */
export function buildConnectionProcessesScene(runtime:Runtime){
  const group=new THREE.Group();group.name='connections-physical-processes';group.userData.scope='qualitative-process-not-measured-geography';
  const texture=mineralTexture();texture.repeat.set(7,7);
  const rock=new THREE.MeshStandardMaterial({color:0x9e9b85,map:texture,bumpMap:texture,bumpScale:.05,roughness:1});
  const bank=new THREE.MeshStandardMaterial({color:0xb2a58a,map:texture,roughness:1});
  const earth=new THREE.MeshStandardMaterial({color:0x7d765e,roughness:1}),wood=new THREE.MeshStandardMaterial({color:0x766044,roughness:.9});
  const plaster=new THREE.MeshStandardMaterial({color:0xd7cfb5,roughness:.93}),dark=new THREE.MeshStandardMaterial({color:0x314c50,roughness:.8});
  const amber=new THREE.MeshStandardMaterial({color:GOLD,roughness:.72}),teal=new THREE.MeshStandardMaterial({color:0x659ea5,roughness:.75});
  const plants=new THREE.MeshStandardMaterial({color:0x64866e,roughness:1}),paper=new THREE.MeshStandardMaterial({color:0xdcd2b1,roughness:.95});
  const waterMat=new THREE.MeshBasicMaterial({color:0x5aa5b7,transparent:true,opacity:.82,side:THREE.DoubleSide,depthWrite:false});
  const brightWater=new THREE.MeshBasicMaterial({color:0xc0e8eb});
  const scenes=Array.from({length:3},(_,i)=>{const item=new THREE.Group();item.name=`connection-scene-${i}`;group.add(item);return item;});
  type Subject={id:string;object:THREE.Group;step:number};const subjects:Subject[]=[];
  function subject(parent:THREE.Object3D,id:string,step:number,anchor:THREE.Vector3){const item=new THREE.Group();item.userData.selectId=id;item.userData.guideId=id;item.userData.guideAnchor=anchor;parent.add(item);subjects.push({id,object:item,step});return item;}
  function box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent:THREE.Object3D,radius:number,h:number,x:number,y:number,z:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,h,20),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function person(parent:THREE.Object3D,name:string,material:THREE.Material=teal){const item=new THREE.Group();item.name=name;parent.add(item);cylinder(item,.14,.5,0,.55,0,material);const head=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),plaster);head.position.y=.98;item.add(head);[-.09,.09].forEach(x=>box(item,.08,.28,.12,x,.18,0,dark));return item;}
  function house(parent:THREE.Object3D,x:number,z:number,H=connectionBasinHeight){const item=new THREE.Group();item.position.set(x,H(x,z)+.04,z);parent.add(item);box(item,1.5,1.15,1.4,0,.58,0,plaster);box(item,1.65,.16,1.55,0,1.23,0,wood);box(item,.35,.72,.035,0,.37,.72,dark);return item;}
  function bucket(parent:THREE.Object3D){const item=new THREE.Group();parent.add(item);cylinder(item,.16,.31,0,.2,0,wood);const surface=new THREE.Mesh(new THREE.CircleGeometry(.135,18),waterMat);surface.rotation.x=-Math.PI/2;surface.position.y=.36;item.add(surface);return item;}
  function terrain(parent:THREE.Object3D,H:(x:number,z:number)=>number,width:number,depth:number){
    const geometry=new THREE.PlaneGeometry(width,depth,128,118);geometry.rotateX(-Math.PI/2);const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3),color=new THREE.Color();
    for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),h=H(x,z);positions.setY(i,h);color.set(0x9c9a7f).lerp(new THREE.Color(0xc1b9a3),THREE.MathUtils.smoothstep(h,2.5,7.5));color.multiplyScalar(.93+.07*Math.sin(x*.7+z*.3)**2);color.toArray(colors,i*3);}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();const surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,map:texture,bumpMap:texture,bumpScale:.025,roughness:1,side:THREE.DoubleSide}));surface.receiveShadow=true;parent.add(surface);
    const edge:THREE.Vector3[]=[];for(let n=0;n<=60;n++)edge.push(V(-width/2+n/60*width,0,-depth/2));for(let n=1;n<=60;n++)edge.push(V(width/2,0,-depth/2+n/60*depth));for(let n=1;n<=60;n++)edge.push(V(width/2-n/60*width,0,depth/2));for(let n=1;n<=60;n++)edge.push(V(-width/2,0,depth/2-n/60*depth));
    const vertices:number[]=[],indices:number[]=[];edge.forEach((point,i)=>{vertices.push(point.x,H(point.x,point.z),point.z,point.x,-.08,point.z);if(i){const a=(i-1)*2,b=i*2;indices.push(a,a+1,b,b,a+1,b+1);}});const skirtGeometry=new THREE.BufferGeometry();skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));skirtGeometry.setIndex(indices);skirtGeometry.computeVertexNormals();const skirt=new THREE.Mesh(skirtGeometry,new THREE.MeshStandardMaterial({color:0x665e4d,roughness:1,side:THREE.DoubleSide}));parent.add(skirt);
    return surface;
  }
  type Flow={group:THREE.Group;mesh:THREE.Mesh<THREE.BufferGeometry>;dots:THREE.Mesh[];path:Route;kind:string};const flows:Flow[]=[];
  function flow(parent:THREE.Object3D,id:string,step:number,points:THREE.Vector3[],width:number,kind:string){
    const path=route(points),item=subject(parent,id,step,at(path,.55));const positions:number[]=[],indices:number[]=[];
    points.forEach((point,index)=>{const tangent=points[Math.min(index+1,points.length-1)].clone().sub(points[Math.max(0,index-1)]),normal=V(-tangent.z,0,tangent.x).normalize().multiplyScalar(width);positions.push(...point.clone().add(normal).toArray(),...point.clone().sub(normal).toArray());if(index){const a=(index-1)*2,b=index*2;indices.push(a,a+1,b,b,a+1,b+1);}});
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,waterMat);mesh.name=`water-${step}-${kind}`;item.add(mesh);mesh.renderOrder=2;
    const dots=Array.from({length:9},()=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(width>.1?.065:.04,9,7),brightWater);item.add(dot);return dot;});
    const record={group:item,mesh,dots,path,kind};flows.push(record);return record;
  }
  const basinTerrain=terrain(scenes[0],connectionBasinHeight,32,29);
  const basinReference=subject(scenes[0],'connection-ridge',0,V(-10,connectionBasinHeight(-10,-5)+.15,-5));basinReference.add(basinTerrain);
  const issueTerrain=terrain(scenes[2],connectionBasinHeight,32,29);const issueReference=subject(scenes[2],'connection-ridge',2,V(-10,connectionBasinHeight(-10,-5)+.15,-5));issueReference.add(issueTerrain);
  const ridgeLines:THREE.Line[]=[];
  for(const step of [0,2])for(const side of [-1,1]){
    const points=Array.from({length:70},(_,n)=>{const z=-11+n/69*22;let bestX=side*8,bestH=-Infinity;for(let j=0;j<=40;j++){const x=side*(7+j/40*8),h=connectionBasinHeight(x,z);if(h>bestH){bestH=h;bestX=x;}}return V(bestX,bestH+.08,z);});
    const ridge=line(points,GOLD,.55,true);ridge.name='conceptual-watershed-ridge';ridge.userData.selectId='connection-ridge';scenes[step].add(ridge);ridgeLines.push(ridge);
    if(side===-1)(step===0?basinReference:issueReference).userData.guideAnchor=points[18].clone();
  }
  const mainUpper:Plan=MAIN.slice(0,4),mainLower:Plan=MAIN.slice(3);
  for(const step of [0,2]){
    flow(scenes[step],'connection-tributary',step,planSamples(LEFT,connectionBasinHeight),.16,'left');flow(scenes[step],'connection-tributary',step,planSamples(RIGHT,connectionBasinHeight),.16,'right');
    flow(scenes[step],'connection-tributary',step,planSamples(mainUpper,connectionBasinHeight),.22,'upper');flow(scenes[step],step===0?'connection-downstream':'connection-water',step,planSamples(mainLower,connectionBasinHeight),.27,'lower');
    const confluence=subject(scenes[step],'connection-confluence',step,V(0,connectionBasinHeight(0,1)+.1,1));const pool=new THREE.Mesh(new THREE.CircleGeometry(.4,36),waterMat);pool.rotation.x=-Math.PI/2;pool.position.copy(confluence.userData.guideAnchor);pool.renderOrder=3;confluence.add(pool);confluence.name=`confluence-${step}`;
  }
  for(const start of [[-9.2,-4.8],[8.8,-4.5],[-4.2,-9]] as [number,number][]){const points=descend(start);flow(scenes[0],'connection-runoff',0,points,.045,'runoff');}
  const rain=subject(scenes[0],'connection-rain',0,V(-4,connectionBasinHeight(-4,-7)+3,-7));rain.name='connection-rainfall';
  const drops=Array.from({length:72},(_,n)=>{const drop=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.24,6),new THREE.MeshBasicMaterial({color:0xa6d9e6,transparent:true,opacity:.72}));drop.name='connection-rain-drop';rain.add(drop);const x=-7.5+(n%12)*1.3,z=-9+Math.floor(n/12)*.65;return {drop,x,z};});
  const taking=subject(scenes[0],'connection-use',0,V(4.4,connectionBasinHeight(4.4,8)+.9,8));taking.name='connection-basin-use';house(taking,4.4,8);house(taking,3.3,1.8);
  const waterUsers=[{source:V(.32,0,8.6),destination:V(3.9,0,8.3)},{source:V(.0,0,1.7),destination:V(2.8,0,2.1)}].map((item,index)=>{const actor=person(taking,`connection-water-user-${index}`),vessel=bucket(actor);vessel.position.set(.27,.3,0);return {...item,actor};});

  // R2: one continuous ridge, a narrow saddle and physical transfer at a node.
  const pass=subject(scenes[1],'connection-pass',1,V(0,connectionPassHeight(0,0)+.2,0));pass.add(terrain(scenes[1],connectionPassHeight,29,23));
  const foot=subject(scenes[1],'connection-foothill',1,V(-4,connectionPassHeight(-4,.8)+.3,.8));cylinder(foot,.58,.12,-4,connectionPassHeight(-4,.8)+.08,.8,earth);
  const corridor=subject(scenes[1],'connection-corridor',1,V(0,connectionPassHeight(0,0)+.12,0));corridor.name='connection-pass-corridor';
  const passPlan:Plan=[[-10,2.2],[-4,.8],[0,0],[4.6,1.15]];const passPoints=planSamples(passPlan,connectionPassHeight,.08,78);
  for(let i=0;i<passPoints.length;i+=2){const point=passPoints[i],next=passPoints[Math.min(i+1,passPoints.length-1)],board=box(corridor,.62,.08,.3,point.x,point.y,point.z,wood);board.rotation.y=Math.atan2(next.x-point.x,next.z-point.z);}
  const carrier=subject(scenes[1],'connection-carrier',1,V(0,.9,0));carrier.name='connection-transport-carrier';
  box(carrier,.8,.18,1.15,0,.6,0,wood);[-.47,.47].forEach(x=>{const wheel=cylinder(carrier,.25,.10,x,.27,0,dark);wheel.rotation.z=Math.PI/2;wheel.name='connection-cart-wheel';});const driver=person(carrier,'connection-cart-user',teal);driver.position.z=-.9;
  const transfer=subject(scenes[1],'connection-transfer',1,V(6,connectionPassHeight(6,1.5)+.9,1.5));transfer.name='connection-transfer-place';
  const nodeH=connectionPassHeight(6,1.5);box(transfer,1.5,.14,1.1,6,nodeH+.52,1.5,wood);[-.55,.55].forEach(dx=>box(transfer,.1,.47,.8,6+dx,nodeH+.25,1.5,wood));
  const receiver=person(transfer,'connection-receiving-user',amber);
  const porter=person(transfer,'connection-node-porter',teal);
  const cargo=box(scenes[1],.55,.4,.5,0,0,0,bank);cargo.name='connection-transferred-cargo';cargo.userData.selectId='connection-transfer';cargo.userData.guideId='connection-cargo';cargo.userData.guideAnchor=V(0,.2,0);
  const organization=subject(scenes[1],'connection-organization',1,V(7.9,connectionPassHeight(7.9,3.6)+.9,3.6));organization.name='connection-node-organization';
  const orgH=connectionPassHeight(7.9,3.6);box(organization,1.4,.13,.9,7.9,orgH+.7,3.6,wood);box(organization,1.1,.035,.65,7.9,orgH+.79,3.6,paper);[-.5,.5].forEach(dx=>box(organization,.1,.66,.65,7.9+dx,orgH+.35,3.6,wood));house(scenes[1],9.4,4.2,connectionPassHeight);house(scenes[1],-10,4.6,connectionPassHeight);

  // R3: one possible slope-to-channel relation, never a reconstruction or a runout solver.
  const slope=subject(scenes[2],'connection-slope',2,V(-7.3,connectionBasinHeight(-7.3,2.4)+.6,2.4));slope.name='connection-slope-material';
  const sourceGeometry=new THREE.PlaneGeometry(2,2.5,12,16);sourceGeometry.rotateX(-Math.PI/2);
  const sourcePositions=sourceGeometry.attributes.position;
  for(let i=0;i<sourcePositions.count;i++){const x=sourcePositions.getX(i)-7.5,z=sourcePositions.getZ(i)+2.6;sourcePositions.setXYZ(i,x,connectionBasinHeight(x,z)+.026,z);}
  sourceGeometry.computeVertexNormals();const sourceBed=new THREE.Mesh(sourceGeometry,bank);sourceBed.name='connection-authored-source-bed';slope.add(sourceBed);
  const movingMaterial=new THREE.Group();movingMaterial.name='connection-moving-material';slope.add(movingMaterial);
  const obstruction=subject(scenes[2],'connection-obstruction',2,V(-.43,connectionBasinHeight(-.43,3.2)+.6,3.2));obstruction.name='connection-channel-constriction';
  obstruction.userData.modelScope='one-possible-narrowing-not-every-collapse-or-a-flood-prediction';
  // The same finite set of chunks moves and settles. No fragments spawn at the river.
  const fragments=Array.from({length:14},(_,index)=>{
    const column=index%4,row=Math.floor(index/4),radius=.24+(index%3)*.035;
    const geometry=new THREE.IcosahedronGeometry(1,0);geometry.scale(radius,.21+(index%2)*.035,radius*.9);geometry.rotateY(index*.73);geometry.computeBoundingBox();geometry.translate(0,-geometry.boundingBox!.min.y,0);geometry.computeBoundingBox();
    const material=new THREE.Mesh(geometry,index%3===0?bank:rock);material.name=`connection-slope-fragment-${index}`;material.castShadow=material.receiveShadow=true;
    const start=V(-7.0-column*.33,0,1.80+row*.43),end=V(-.65+column*.10,0,2.75+row*.43);
    const bounds=geometry.boundingBox!;
    // The whole bounding footprint stays above the authored surface. This deliberately
    // simple placement makes no claims about friction, momentum or real landslide speed.
    const supportedY=(x:number,z:number)=>{let highest=-Infinity;for(let a=0;a<=4;a++)for(let b=0;b<=4;b++)highest=Math.max(highest,connectionBasinHeight(x+THREE.MathUtils.lerp(bounds.min.x,bounds.max.x,a/4),z+THREE.MathUtils.lerp(bounds.min.z,bounds.max.z,b/4)));return highest+.025;};
    material.userData.selectId='connection-slope';material.userData.authorDefinedFragment=true;
    return {material,start,end,supportedY,from:.32+index*.003,to:.64+index*.003};
  });
  fragments.forEach(fragment=>movingMaterial.add(fragment.material));

  // Participants and observations remain separate from the qualitative obstruction.
  const upstream=subject(scenes[2],'connection-upstream',2,V(2.8,connectionBasinHeight(2.8,-4)+.9,-4));upstream.name='connection-upstream-perspective';house(upstream,3.8,-4.3);
  const upstreamUser=person(upstream,'connection-upstream-user',amber);const upstreamBucket=bucket(upstreamUser);upstreamBucket.position.set(.25,.3,0);
  const ecology=subject(scenes[2],'connection-ecology',2,V(-1.2,connectionBasinHeight(-1.2,6.3)+.5,6.3));ecology.name='connection-riverbank-ecology';
  for(let n=0;n<24;n++){const x=-.9-(n%6)*.25,z=5.1+Math.floor(n/6)*.6,y=connectionBasinHeight(x,z);cylinder(ecology,.027,.42+(n%3)*.14,x,y+.2,z,plants);const leaf=new THREE.Mesh(new THREE.ConeGeometry(.12,.4,7),plants);leaf.position.set(x+.06,y+.4,z);leaf.rotation.z=.35;ecology.add(leaf);}
  const downstream=subject(scenes[2],'connection-downstream',2,V(4.4,connectionBasinHeight(4.4,8)+.9,8));downstream.name='connection-downstream-perspective';house(downstream,4.4,8);
  const downstreamUser=person(downstream,'connection-downstream-user');const downstreamBucket=bucket(downstreamUser);downstreamBucket.position.set(.25,.3,0);
  const observation=subject(scenes[2],'connection-observation',2,V(.9,connectionBasinHeight(.9,7)+1,7));observation.name='connection-shared-observation';
  const sampling=([-4.5,7.0] as const).map((z,index)=>{const x=index?.4:.0,y=connectionBasinHeight(x,z),station=new THREE.Group();station.position.set(x,y,z);observation.add(station);const staff=cylinder(station,.035,1.5,.5,.8,0,plaster);staff.name='unmeasured-observation-staff';for(let n=0;n<8;n++)box(station,.17,.025,.055,.5,.2+n*.17,.04,dark);const observer=person(station,`connection-observer-${index}`);observer.position.set(1.0,0,.25);const bottle=cylinder(station,.065,.3,.1,.2,0,teal);bottle.name='connection-sampling-container';return {station,bottle};});
  const slopeReference=new THREE.Group();slopeReference.name='connection-slope-reference';slopeReference.position.set(-5.8,connectionBasinHeight(-5.8,1.2),1.2);observation.add(slopeReference);
  cylinder(slopeReference,.045,1.05,0,.53,0,plaster);box(slopeReference,.46,.18,.26,.13,1.13,0,dark);box(slopeReference,.08,.08,.08,.38,1.13,0,teal);
  const records=subject(scenes[2],'connection-records',2,V(0,connectionBasinHeight(0,4.5)+1.1,4.5));records.name='connection-record-comparison';
  const boards=[-1,1].map((side,index)=>{const x=side*1.3,z=4.5,y=connectionBasinHeight(x,z);box(records,1.2,.12,1.3,x,y+.76,z,wood);for(const dx of [-.42,.42])for(const dz of [-.42,.42]){const floor=connectionBasinHeight(x+dx,z+dz),height=Math.max(.12,y+.7-floor);box(records,.085,height,.085,x+dx,floor+height/2,z+dz,wood);}const board=new THREE.Group();board.position.set(x,y+.88,z);records.add(board);box(board,1.08,.08,1.18,0,0,0,paper);for(let n=0;n<3;n++)box(board,.25,.035,.25,-.32+n*.32,.07,0,index===0?teal:amber);board.name=`connection-blank-record-${index}`;return board;});
  const information=Array.from({length:2},(_,index)=>{const token=box(scenes[2],.19,.07,.19,0,0,0,index?amber:teal);token.name='connection-information-token';return token;});

  type Caption={id:string;text:string;step:number;subject:THREE.Object3D;anchor:THREE.Vector3;show:(stage:number,p:number)=>boolean;sprite:THREE.Sprite;leader:THREE.Line};const captions:Caption[]=[];
  function caption(step:number,id:string,text:string,item:THREE.Object3D,show:Caption['show']=()=>true,anchor?:THREE.Vector3){const sprite=label(text,'#eadfbf'),leader=line([V(0,0,0),V(0,0,0)],0xa9c5be,.58);sprite.userData.selectId=id;sprite.userData.screenAnnotation=true;sprite.onBeforeRender=()=>{};sprite.renderOrder=31;(leader.material as THREE.LineBasicMaterial).depthTest=false;leader.renderOrder=30;group.add(sprite,leader);captions.push({id,text,step,subject:item,anchor:anchor??item.userData.guideAnchor,show,sprite,leader});}
  caption(0,'connection-ridge','山脊分水 · 概念参照',basinReference,stage=>stage===0);
  caption(0,'connection-rain','先看雨水进入山地',rain,(_,p)=>p<.38);
  caption(0,'connection-tributary','坡面 → 支流 → 干流',flows[0].group,stage=>stage===1);
  caption(0,'connection-confluence','干支流在这里汇合',scenes[0].getObjectByName('confluence-0')!,stage=>stage>=1);
  caption(0,'connection-downstream','沿同一高差继续向下',flows[3].group,stage=>stage===2);
  caption(0,'connection-use','取水还需要人的到达与劳动',taking,stage=>stage===2);
  caption(1,'connection-pass','较低但有限的山口',pass);
  caption(1,'connection-foothill','先抵达坡脚',foot,stage=>stage===0);
  caption(1,'connection-carrier','同一载体通过通口',carrier,stage=>stage===1);
  caption(1,'connection-transfer','到达节点，再交接',transfer,stage=>stage===2);
  caption(1,'connection-organization','交换还需要组织与记录',organization,stage=>stage===2);
  caption(2,'connection-slope','同一批坡料：沿高差进入河槽',slope,stage=>stage<2);
  caption(2,'connection-obstruction','本设定的窄口 · 是否堵江须核对记录',obstruction,(_,p)=>p>=.64);
  caption(2,'connection-upstream','先保留上游的使用视角',upstream,stage=>stage<2);
  caption(2,'connection-ecology','同一水系中的生态对象',ecology,stage=>stage>=1);
  caption(2,'connection-downstream','下游使用也要纳入',downstream,stage=>stage===1);
  caption(2,'connection-observation','坡面与河道：分开核对位置、时刻、变量',observation,stage=>stage===2);
  caption(2,'connection-records','对读日期、变量与方法',records,stage=>stage===2);
  const note=label('原理模型 · 无真实流量、古道、监测读数或影响评分','#bbcec8');note.name='connection-source-note';note.onBeforeRender=()=>{};note.renderOrder=32;group.add(note);
  const issueNote=label('非色东普复原 · 一种可能关系 · 无体积、水位响应或预测','#bbcec8');issueNote.name='connection-issue-scope-note';issueNote.onBeforeRender=()=>{};issueNote.renderOrder=32;group.add(issueNote);
  const focusRing=new THREE.Mesh(new THREE.TorusGeometry(.75,.036,9,64),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:.85}));focusRing.rotation.x=-Math.PI/2;focusRing.name='connection-attention-ring';group.add(focusRing);
  const viewport=new THREE.Vector2(),screen=new THREE.Vector3(),projected=new THREE.Vector3();let disposed=false;
  function visible(item:THREE.Object3D){for(let current:THREE.Object3D|null=item;current;current=current.parent)if(!current.visible)return false;return true;}
  return {group,update:(p:TibetSceneProps,_time=0,_dt=0)=>{
    if(disposed)return;const state=connectionProcessState(p.step,p.progress),progress=state.progress,step=state.step,stage=state.stage;group.userData.connectionState=state;scenes.forEach((scene,i)=>scene.visible=i===step);
    for(const item of flows){
      const itemStep=item.group.parent===scenes[0]?0:2;
      const extent=itemStep===2?1:item.kind==='runoff'?state.runoff:item.kind==='lower'?state.downstream:state.tributaries;
      item.group.visible=extent>.001;const segments=item.path.points.length-1;item.mesh.geometry.setDrawRange(0,Math.floor(segments*extent)*6);
      // Point to already revealed water, not the unreached end of a hidden river.
      at(item.path,extent*.55,item.group.userData.guideAnchor as THREE.Vector3);
      item.dots.forEach((dot,n)=>{const fraction=itemStep===2?(n/item.dots.length+progress*.38)%1:extent*(n+1)/item.dots.length;at(item.path,fraction,dot.position);dot.visible=extent>.02;});
    }
    for(const which of [0,2])scenes[which].getObjectByName(`confluence-${which}`)!.visible=which===2||progress>=.64;
    rain.visible=progress>.02;drops.forEach(({drop,x,z},n)=>{const y=connectionBasinHeight(x,z),fall=(n/drops.length+progress*2.2)%1;drop.position.set(x,y+.14+(1-fall)*3.7,z);});
    taking.visible=progress>=.84;waterUsers.forEach(({actor,source,destination})=>{actor.position.copy(source).lerp(destination,state.using);actor.position.y=connectionBasinHeight(actor.position.x,actor.position.z)+.08;actor.rotation.y=Math.atan2(destination.x-source.x,destination.z-source.z);});
    const start=V(-10,0,2.2),footpoint=V(-4,0,.8),passpoint=V(0,0,0),transferpoint=V(4.6,0,1.15);
    carrier.position.copy(stage===0?start.lerp(footpoint,state.foothill):state.passage<.5?footpoint.lerp(passpoint,state.passage*2):passpoint.lerp(transferpoint,(state.passage-.5)*2));carrier.position.y=connectionPassHeight(carrier.position.x,carrier.position.z)+.08;
    carrier.rotation.y=stage===0?Math.atan2(6,-1.4):state.passage<.5?Math.atan2(4,-.8):Math.atan2(6,1.5);carrier.children.forEach(child=>{if(child.name==='connection-cart-wheel')child.rotation.x=-progress*13;});
    receiver.position.copy(V(9,0,2.6).lerp(V(7.1,0,1.7),smooth(progress,.68,.86)));receiver.position.y=connectionPassHeight(receiver.position.x,receiver.position.z)+.05;receiver.rotation.y=-Math.PI/2;
    porter.visible=stage===2;porter.position.copy(V(4.85,0,1.75).lerp(V(6.25,0,2.1),smooth(progress,.68,.86)));porter.position.y=connectionPassHeight(porter.position.x,porter.position.z)+.05;porter.rotation.y=Math.PI/2;
    const carried=carrier.position.clone().add(V(0,.9,0)),table=V(6,nodeH+.81,1.5),held=porter.position.clone().add(V(-.25,.8,-.6)),received=receiver.position.clone().add(V(-.25,.72,0));
    cargo.position.copy(progress<.89?carried.lerp(held,smooth(progress,.68,.72)).lerp(table,smooth(progress,.84,.89)):table.lerp(received,smooth(progress,.94,1)));organization.visible=stage===2;
    movingMaterial.clear();obstruction.clear();let settled=0;
    for(const fragment of fragments){
      const t=smooth(progress,fragment.from,fragment.to),arrived=t===1,position=fragment.start.clone().lerp(fragment.end,t);
      position.y=fragment.supportedY(position.x,position.z);fragment.material.position.copy(position);fragment.material.userData.selectId=arrived?'connection-obstruction':'connection-slope';
      (arrived?obstruction:movingMaterial).add(fragment.material);if(arrived)settled++;
    }
    obstruction.visible=settled>0;obstruction.userData.settledFragments=settled;
    upstreamUser.position.copy(V(.0,0,-4.5).lerp(V(2.9,0,-4.1),smooth(progress,0,.32)));upstreamUser.position.y=connectionBasinHeight(upstreamUser.position.x,upstreamUser.position.z)+.08;upstreamUser.rotation.y=Math.PI/2;
    ecology.visible=downstream.visible=stage>=1;downstreamUser.position.copy(V(.3,0,8.5).lerp(V(4,0,8.2),state.widerView));downstreamUser.position.y=connectionBasinHeight(downstreamUser.position.x,downstreamUser.position.z)+.08;downstreamUser.rotation.y=Math.PI/2;
    observation.visible=records.visible=stage===2;sampling.forEach(({bottle},index)=>{bottle.position.y=.15+state.observation*.8;bottle.rotation.z=state.observation*(index?-.15:.15);});
    boards.forEach((board,index)=>{board.rotation.z=(1-state.comparison)*(index?-.75:.75);});
    information.forEach((token,index)=>{token.visible=stage===2;const source=sampling[index].bottle.getWorldPosition(V(0,0,0)),destination=boards[index].position.clone().add(V(0,.13,0));token.position.copy(source).lerp(destination,state.comparison);});
    ridgeLines.forEach(ridge=>{(ridge.material as THREE.LineBasicMaterial).opacity=p.layer==='terrain'?.85:.35;});
    group.updateWorldMatrix(true,true);const defaults=step===0?p.layer==='terrain'?basinReference:p.layer==='settlements'&&stage===2?taking:stage===0?rain:stage===1?flows[0].group:flows[3].group:step===1?p.layer==='terrain'?pass:p.layer==='transport'&&stage===2?transfer:carrier:p.layer==='cooperation'&&stage===2?records:p.layer==='ecology'&&stage>=1?ecology:stage===2?obstruction:slope;
    const selected=subjects.find(item=>item.step===step&&item.id===p.selected&&visible(item.object));const focused=selected?.object??defaults;const anchor=focused.localToWorld((focused.userData.guideAnchor as THREE.Vector3).clone());focusRing.position.set(anchor.x,(step===1?connectionPassHeight:connectionBasinHeight)(anchor.x,anchor.z)+.08,anchor.z);group.userData.focusId=focused.userData.selectId;
    runtime.renderer.getSize(viewport);runtime.camera.updateMatrixWorld();if(viewport.x<2||viewport.y<2)return;
    const mobile=viewport.x<600,compact=viewport.y<520,px=mobile?22:25,focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),top=compact?80:112,bottom=Math.max(top+px,viewport.y-(compact?105:295)),noteY=Math.max(35,viewport.y-267),noteW=Math.min(viewport.x-24,440),occupied:{x:number;y:number;w:number}[]=[84,125,166].map(y=>({x:viewport.x-35,y,w:58}));if(!compact)occupied.push({x:viewport.x/2,y:noteY,w:noteW});let count=0;
    const priority=(id:string)=>p.guide?.active&&p.guide.targets.includes(id)?2:id===p.selected?1:0;
    for(const item of [...captions].sort((a,b)=>priority(b.id)-priority(a.id))){
      item.sprite.position.set(0,0,0);item.sprite.scale.set(1,1,1);const a=item.leader.geometry.attributes.position as THREE.BufferAttribute;a.array.fill(0);a.needsUpdate=true;
      item.sprite.visible=item.leader.visible=false;if(item.step!==step||!visible(item.subject)||!item.show(stage,progress)||count>=(mobile?3:4))continue;
      const world=item.subject.localToWorld(item.anchor.clone());projected.copy(world).project(runtime.camera);if(projected.z< -1||projected.z>1||Math.abs(projected.x)>1.05||Math.abs(projected.y)>1.05)continue;
      const w=Math.min(viewport.x-26,item.text.length*(mobile?9.5:10.5)+24),ax=(projected.x+1)*viewport.x/2,ay=(1-projected.y)*viewport.y/2,x=THREE.MathUtils.clamp(ax,w/2+11,viewport.x-w/2-11);let y=THREE.MathUtils.clamp(ay-24,top,bottom),found=false;
      for(const cy of [y,...Array.from({length:Math.max(1,Math.floor((bottom-top)/(px+8))+1)},(_,n)=>top+n*(px+8))])if(!occupied.some(box=>Math.abs(x-box.x)<(w+box.w)/2+6&&Math.abs(cy-box.y)<px+7)){y=cy;found=true;break;}
      if(!found)continue;occupied.push({x,y,w});count++;item.sprite.visible=item.leader.visible=true;screen.set(x/viewport.x*2-1,1-y/viewport.y*2,projected.z).unproject(runtime.camera);item.sprite.position.copy(screen);const h=px*screen.distanceTo(runtime.camera.position)/focal;item.sprite.scale.set(h*w/px,h,1);a.setXYZ(0,world.x,world.y,world.z);a.setXYZ(1,screen.x,screen.y,screen.z);a.needsUpdate=true;item.leader.geometry.computeBoundingSphere();
    }
    note.visible=!compact&&step!==2;issueNote.visible=!compact&&step===2;const activeNote=step===2?issueNote:note;screen.set(0,1-noteY/viewport.y*2,.55).unproject(runtime.camera);activeNote.position.copy(screen);const h=19*screen.distanceTo(runtime.camera.position)/focal;activeNote.scale.set(h*noteW/19,h,1);
  },dispose:()=>{if(disposed)return;disposed=true;disposeTree(group);}};
}
