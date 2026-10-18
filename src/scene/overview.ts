import * as THREE from 'three';
import { addMarker, curvedLine, disposeTree, GOLD, IVORY, label, line, mineralTexture, TEAL } from './environment';
import {verifiedPlaceReferences} from '../data/placeProvenance';
import type { SceneName, TibetSceneProps } from './TibetScene';

type Point={id:string;name:string;x:number;z:number};
// Approximate geographic placement establishes the regional scale; no administrative boundary is invented.
const project=(lon:number,lat:number)=>({x:(lon-87.5)*.91,z:(33.6-lat)*1.08});
const points:Point[]=['lhasa','nyingchi','shannan','shigatse','nagqu','ngari','chamdo'].map(id=>{const reference=verifiedPlaceReferences[id];return {id,name:reference.name.replace('城区参考','').replace('聚居地参考',''),...project(reference.longitude,reference.latitude)};});

function height(x:number,z:number){
  const highland=1.35*Math.exp(-((x+2)**2/130+(z+2.5)**2/55));
  const himalaya=1.35*Math.exp(-(((z-5.2+.35*Math.sin(x*.4))/1.02)**2))*Math.exp(-x*x/125);
  const range=.6*Math.exp(-(((z-1.5-.25*Math.sin(x*.7))/.85)**2));
  const folded=(.12+Math.abs(Math.sin(x*2.4+z*.9))*.28)*Math.max(.2,Math.exp(-(x*x+z*z)/180));
  return .25+highland+himalaya+range+folded;
}

function steleModel(){
  const group=new THREE.Group(),texture=mineralTexture();texture.repeat.set(1.5,2.5);
  const stone=new THREE.MeshStandardMaterial({color:0x909791,map:texture,bumpMap:texture,bumpScale:.045,roughness:.97});
  const box=(w:number,h:number,d:number,y:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),stone);m.position.y=y;m.castShadow=m.receiveShadow=true;group.add(m);return m;};
  const base=box(3.7,.24,3,.12);base.userData.guideId='history-stele-base';base.userData.guideAnchor=[0,.2,0];box(2.9,.4,2.25,.44);box(1.9,.25,1.45,.765);const body=box(1.15,4.35,.6,3.065);body.userData.guideId='history-stele-body';
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(.7,.84,.4,4),stone);crown.rotation.y=Math.PI/4;crown.position.y=5.45;group.add(crown);
  const title=label('823 年 · 立碑','#f1dcaa',2.6);title.position.set(0,6.25,0);group.add(title);
  const note=label('碑体结构示意 · 原碑文字见资料','#c9dbdc',5);note.position.set(0,-.35,1.4);group.add(note);
  [['碑身',1.7,3],['台座',2.4,.7]].forEach(([text,x,y])=>{const l=label(text as string,'#dce7e4',1.1);l.position.set(x as number,y as number,0);group.add(l);});
  return group;
}

export function buildOverviewScene(name:SceneName){
  const group=new THREE.Group(),map=new THREE.Group();group.add(map);
  const geometry=new THREE.PlaneGeometry(100,80,240,190);geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position,colors=new Float32Array(pos.count*3),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),y=height(x,z);pos.setY(i,y);
    const moist=THREE.MathUtils.smoothstep(x,2,11)*THREE.MathUtils.smoothstep(z,0,7);
    c.set(0x9b9279).lerp(new THREE.Color(0x52765e),moist*.75).lerp(new THREE.Color(0xdfded1),THREE.MathUtils.smoothstep(y,2.25,3.2));
    c.multiplyScalar(.83+.12*Math.sin(x*3+z*2)**2);c.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
  const detail=mineralTexture();detail.repeat.set(15,12);
  const surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,map:detail,bumpMap:detail,bumpScale:.075,roughness:.97}));surface.receiveShadow=true;surface.userData.guideId='context-terrain';surface.userData.guideAnchor=[0,height(0,0),0];map.add(surface);
  // The same NASA Earth texture anchors the zoom from the globe to the regional view.
  // Elevation remains a conceptual physical model, not a digital elevation dataset.
  const uv=geometry.attributes.uv;
  for(let i=0;i<pos.count;i++){const lon=87.5+pos.getX(i)/.91,lat=33.6-pos.getZ(i)/1.08;uv.setXY(i,(lon+180)/360,(lat+90)/180);}
  uv.needsUpdate=true;let alive=true,earthTexture:THREE.Texture|null=null;
  new THREE.TextureLoader().load('/assets/earth-blue-marble.jpg',texture=>{if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;earthTexture=texture;surface.material.map=texture;surface.material.needsUpdate=true;});
  const cartography=new THREE.Group();map.add(cartography);
  for(let lat=0;lat<6;lat++){const z=-7+lat*3;cartography.add(line([new THREE.Vector3(-14,height(-14,z)+.045,z),new THREE.Vector3(14,height(14,z)+.045,z)],0xd5d8cd,.13,true));}
  for(let lon=0;lon<9;lon++){const x=-12+lon*3,pts=[];for(let j=0;j<=40;j++){const z=-8+j*.4;pts.push(new THREE.Vector3(x,height(x,z)+.045,z));}cartography.add(line(pts,0xd5d8cd,.11,true));}
  const water=new THREE.Group();water.userData.guideId='context-river';water.userData.guideAnchor=[0,height(0,4.3)+.1,4.3];map.add(water);
  const yarlung=[];for(let i=0;i<=100;i++){const x=-8+i/100*17,z=4.3+.3*Math.sin(x*.55)+Math.max(0,x-5)*.1;yarlung.push(new THREE.Vector3(x,height(x,z)+.065,z));}water.add(curvedLine(yarlung,0x75c1ce,.035).mesh);
  const physicalLabels=new THREE.Group();map.add(physicalLabels);
  [['喜马拉雅山脉',-8,5.8,3],['高原内部',-1,-4,2.8],['雅鲁藏布江',-4,5.2,3],['东南山地',12,5.6,2.3],['北',-12,-6.5,.9]].forEach(([text,x,z,w])=>{const l=label(text as string,'#d3dfdc',w as number);l.position.set(x as number,height(x as number,z as number)+.55,z as number);physicalLabels.add(l);});
  physicalLabels.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(-12,height(-12,-5)+.05,-5),1,IVORY,.25,.15));
  const nodeGroup=new THREE.Group();nodeGroup.userData.guideId='context-settlements';nodeGroup.userData.guideAnchor=[3,2,4];map.add(nodeGroup);
  const markers=points.map(p=>addMarker(nodeGroup,p.id,p.name,p.x,height(p.x,p.z)+.12,p.z,p.id==='lhasa'?GOLD:TEAL));
  // Callouts keep close southern places distinct without changing their geographic anchors.
  const callouts:Record<string,[number,number,number]>={lhasa:[-1.3,1.4,-1.5],shannan:[3.6,1.5,.7],nyingchi:[2.3,1.2,-.2],shigatse:[-.7,1.2,-.5],nagqu:[0,1.2,-.8]};
  markers.forEach(marker=>{marker.userData.guideAnchor=[0,.45,0];const offset=callouts[marker.userData.selectId];if(!offset)return;const endpoint=new THREE.Vector3(...offset);marker.children[3].position.copy(endpoint);marker.add(line([new THREE.Vector3(0,.65,0),endpoint.clone().add(new THREE.Vector3(0,-.18,0))],0xc6d6cf,.48));});
  const highlight=new THREE.Mesh(new THREE.RingGeometry(.5,.64,56),new THREE.MeshBasicMaterial({color:GOLD,side:THREE.DoubleSide,transparent:true,opacity:.72}));highlight.rotation.x=-Math.PI/2;map.add(highlight);
  const links=new THREE.Group();links.userData.guideId='context-links';links.userData.guideAnchor=[0,3,0];map.add(links);const linksCurves:THREE.CatmullRomCurve3[]=[];
  const link=(a:Point,b:Point,color=GOLD,thickness=.032)=>{const start=new THREE.Vector3(a.x,height(a.x,a.z)+.35,a.z),end=new THREE.Vector3(b.x,height(b.x,b.z)+.35,b.z),mid=start.clone().lerp(end,.5);mid.y+=1.25;const curve=curvedLine([start,mid,end],color,thickness);return curve;};
  const lhasa=points[0];points.slice(1).forEach(p=>{const relation=link(lhasa,p);relation.mesh.userData.selectId=p.id;links.add(relation.mesh);linksCurves.push(relation.curve);});
  const traveler=new THREE.Mesh(new THREE.SphereGeometry(.11,14,10),new THREE.MeshBasicMaterial({color:0xffe6ab}));links.add(traveler);
  const route=new THREE.Group();route.userData.guideId='travel-route';route.userData.guideAnchor=[1,3,2];map.add(route);let routeKey='',routeCurves:THREE.CatmullRomCurve3[]=[];
  const event=new THREE.Group();map.add(event);
  const changan:Point={id:'event-changan',name:'长安 · 方位关系示意',x:13,z:-7};
  const changanMark=addMarker(event,'event-changan',changan.name,changan.x,height(changan.x,changan.z),changan.z,TEAL);delete changanMark.userData.selectId;changanMark.userData.guideId='event-changan';changanMark.userData.guideAnchor=[0,.45,0];
  const lhasaMark=addMarker(event,'lhasa','拉萨 · 会盟',lhasa.x,height(lhasa.x,lhasa.z),lhasa.z,GOLD);
  const eventLink=link(lhasa,changan,GOLD,.05);event.add(eventLink.mesh);
  const eventTime=label('821 年 · 长安会盟','#efd89b',3.8);eventTime.position.set(4,5.7,-4.5);event.add(eventTime);
  const eventTimeLater=label('822 年 · 拉萨会盟','#efd89b',3.8);eventTimeLater.position.copy(eventTime.position);event.add(eventTimeLater);
  const stele=steleModel();stele.userData.guideId='history-stele';stele.userData.guideAnchor=[0,2.8,0];group.add(stele);
  const historyLabels=['史前活动材料','吐蕃时期材料','分散与重组材料','蒙古元朝与萨迦','地方政治变化','甘丹颇章时期','清代制度与社会','20世纪前期','20世纪中叶以来'].map(text=>{const l=label(text,'#efd698',3.8);l.position.set(0,4.5,-5.7);map.add(l);return l;});
  const railway=new THREE.Group();railway.userData.guideId='context-railway';railway.userData.guideAnchor=[4,3,-3];map.add(railway);const railwayPoints=[new THREE.Vector3(6,height(6,-8)+.12,-8),new THREE.Vector3(4.5,height(4.5,-3)+.12,-3),new THREE.Vector3(points[4].x,height(points[4].x,points[4].z)+.12,points[4].z),new THREE.Vector3(lhasa.x,height(lhasa.x,lhasa.z)+.12,lhasa.z)];
  const rail=curvedLine(railwayPoints,0xc5d2d2,.055);railway.add(rail.mesh);
  const train=new THREE.Mesh(new THREE.BoxGeometry(.4,.15,.14),new THREE.MeshStandardMaterial({color:0xdedbc4,metalness:.3,roughness:.45}));railway.add(train);
  const railLabel=label('青藏铁路 · 通道示意','#d8e4e3',3.4);railLabel.position.set(6,3.5,-4);railway.add(railLabel);
  const surroundingLinks=new THREE.Group();surroundingLinks.userData.guideId='context-neighbours';surroundingLinks.userData.guideAnchor=[13,3,-2];map.add(surroundingLinks);
  [{id:'central-asia',name:'中亚交流方向',x:-15,z:-4,from:'ngari'},{id:'south-asia',name:'南亚交流方向',x:1,z:11,from:'lhasa'},{id:'inland',name:'中国内地方向',x:15,z:-2,from:'chamdo'}].forEach(destination=>{
    const source=points.find(point=>point.id===destination.from)!;
    const path=link(source,destination,0xbaa6d7,.042);surroundingLinks.add(path.mesh);surroundingLinks.add(new THREE.ArrowHelper(path.curve.getTangent(.75),path.curve.getPoint(.75),.7,0xbaa6d7,.25,.13));
    const title=label(destination.name,'#d9cce9',3);title.position.set(destination.x,height(destination.x,destination.z)+.6,destination.z);surroundingLinks.add(title);
  });
  const downstream=new THREE.Group();downstream.userData.guideId='context-flow';downstream.userData.guideAnchor=[10.5,1.1,6.2];map.add(downstream);
  const riverExit=curvedLine([new THREE.Vector3(7,height(7,4.5)+.2,4.5),new THREE.Vector3(10.5,1.1,6.2),new THREE.Vector3(9.5,.7,12)],0x68d0de,.07);downstream.add(riverExit.mesh);
  const waterDirection=label('下游方向 · 流域关系示意','#a8e1e6',4);waterDirection.position.set(10,.9,10);downstream.add(waterDirection);
  const waterDots=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xc1f1f1}),32);downstream.add(waterDots);const waterDummy=new THREE.Object3D();
  const terrainColors=colors.slice();let previous='',animation=0;
  return {group,dispose:()=>{alive=false;if(earthTexture&&surface.material.map!==earthTexture)earthTexture.dispose();},update:(p:TibetSceneProps,time:number,dt:number)=>{
    if(p.playing)animation+=dt;
    const key=[p.layer,p.selected,p.step,p.season,p.routeRegions?.join('>')].join('|');
    if(key!==previous){previous=key;
      const eventStep=name==='history'&&p.step===2,object=eventStep&&(p.layer==='object'||p.layer==='event-823');
      map.visible=!object;stele.visible=object;event.visible=eventStep&&!object;nodeGroup.visible=!eventStep;
      stele.position.set(0,0,0);
      const topic=p.selected||'lhasa',selected=points.find(point=>point.id===topic)||(name==='history'&&p.step===0?points[4]:lhasa);
      highlight.visible=!eventStep;highlight.position.set(selected.x,height(selected.x,selected.z)+.08,selected.z);
      markers.forEach(m=>m.scale.setScalar(m.userData.selectId===topic?1.12:.92));
      physicalLabels.visible=!eventStep;
      eventTime.visible=p.layer!=='event-822';eventTimeLater.visible=p.layer==='event-822';
      lhasaMark.scale.setScalar(p.layer==='event-822'?1.15:.85);changanMark.scale.setScalar(p.layer==='event-822'?.85:1.15);
      links.visible=['history','connections','modern'].includes(name)&&!eventStep&&!['water','ecology'].includes(p.layer);
      railway.visible=name==='modern'||(name==='connections'&&p.layer==='transport');
      surroundingLinks.visible=name==='connections'&&['routes','culture'].includes(p.layer);
      downstream.visible=(name==='connections'&&['water','ecology'].includes(p.layer))||(name==='modern'&&p.layer==='ecology');
      water.visible=p.layer!=='temperature';
      surface.material.map=p.layer==='temperature'?null:earthTexture||detail;surface.material.needsUpdate=true;
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i);
        if(p.layer==='temperature')c.setHSL(.055+Math.min(1,y/3)*.54,.4,.44);
        else if(p.layer==='vegetation')c.set(0xb2a376).lerp(new THREE.Color(0x3e775c),THREE.MathUtils.smoothstep(x,0,12)*THREE.MathUtils.smoothstep(z,-1,7));
        else c.fromArray(terrainColors,i*3).lerp(new THREE.Color(0xdde3db),p.season===3?Math.max(0,(y-1.3)*.3):0);
        c.toArray(colors,i*3);
      }
      geometry.attributes.color.needsUpdate=true;
      const ordered=(p.routeRegions||[]).map(id=>points.find(point=>point.id===id)).filter((q,i,arr):q is Point=>!!q&&q.id!==arr[i-1]?.id),nextKey=ordered.map(q=>q.id).join('>');
      if(name==='travel'&&nextKey!==routeKey){routeKey=nextKey;disposeTree(route);routeCurves=[];for(let i=1;i<ordered.length;i++){const path=link(ordered[i-1],ordered[i],GOLD,.055);route.add(path.mesh);routeCurves.push(path.curve);route.add(new THREE.ArrowHelper(path.curve.getTangent(.55),path.curve.getPoint(.55),.55,GOLD,.18,.1));}
        ordered.forEach((q,i)=>{const n=label(`${i+1}`,'#ffe0a1',.75);n.position.set(q.x+.55,height(q.x,q.z)+1.25,q.z);route.add(n);});}
      route.visible=name==='travel'&&routeCurves.length>0;
    }
    historyLabels.forEach((l,i)=>{l.visible=name==='history'&&p.step!==2&&i===Math.min(8,Math.round(p.progress*8));});
    highlight.material.opacity=.66;
    if(downstream.visible){for(let i=0;i<32;i++){riverExit.curve.getPointAt((i/32+animation*.055+p.progress*.4)%1,waterDummy.position);waterDummy.updateMatrix();waterDots.setMatrixAt(i,waterDummy.matrix);}waterDots.instanceMatrix.needsUpdate=true;}
    const index=Math.max(0,points.findIndex(q=>q.id===p.selected)-1);
    if(links.visible&&linksCurves.length)linksCurves[index%linksCurves.length].getPoint((p.progress*.94+animation*.035)%1,traveler.position);
    if(route.visible&&routeCurves.length){traveler.visible=true;route.add(traveler);const overall=THREE.MathUtils.clamp(p.playing?(p.progress+animation*.025)%1:p.progress,0,.9999)*routeCurves.length;routeCurves[Math.floor(overall)].getPointAt(overall%1,traveler.position);}else if(traveler.parent===route){links.add(traveler);traveler.visible=true;}
    if(railway.visible){const t=(p.progress*.93+animation*.025)%1;rail.curve.getPointAt(t,train.position);const tangent=rail.curve.getTangentAt(t);train.rotation.y=-Math.atan2(tangent.z,tangent.x);}
  }};
}
