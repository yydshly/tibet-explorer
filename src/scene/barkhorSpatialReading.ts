import * as THREE from 'three';
import type {LocalCollection,LocalCoordinate,LocalFeature} from './cityLocalMap';
import type {TibetSceneProps} from './sceneTypes';
import {routeSampleSegment} from './routeArcLength';

/** Selection is an observation window, not a heritage boundary or old route. */
export function barkhorStreetFeatures(data:LocalCollection){
  return data.features.filter(feature=>feature.geometry.type==='LineString'&&feature.properties.featureClass==='road'
    &&['footway','pedestrian','steps'].includes(feature.properties.tags.highway)
    &&!['no','private'].includes(feature.properties.tags.access)
    &&(feature.geometry.coordinates as LocalCoordinate[]).every(([x,y])=>x>=91.129&&x<=91.1344&&y>=29.651&&y<=29.6545));
}

/** All changing surfaces use acquired geometry. Markers describe movement,
 * not actual pilgrim tracks, numbers, speed or a designed management scheme. */
export function createBarkhorSpatialReading(data:LocalCollection,toWorld:(p:LocalCoordinate,offset?:number)=>THREE.Vector3,
  polygon:(feature:LocalFeature,height:number)=>THREE.BufferGeometry,buildings:(feature:LocalFeature)=>LocalFeature[],unit:number){
  const group=new THREE.Group();group.name='barkhor-spatial-reading';group.visible=false;
  const plaza=data.features.find(f=>f.id==='way/177796787'),retail=data.features.find(f=>f.id==='way/880932156');
  const streets=barkhorStreetFeatures(data);
  const paths=streets.map(feature=>(feature.geometry.coordinates as LocalCoordinate[]).map(point=>toWorld(point,4)));
  const streetGroup=new THREE.Group(),buildingGroup=new THREE.Group();group.add(streetGroup,buildingGroup);
  const roadMaterial=new THREE.MeshBasicMaterial({color:0x28d9cf,transparent:true,opacity:.95,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<paths.length;i++){
    const positions:number[]=[];const path=paths[i];
    for(let j=1;j<path.length;j++){
      const a=path[j-1],b=path[j],side=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(3*unit);
      const aa=a.clone().add(side),ab=a.clone().sub(side),ba=b.clone().add(side),bb=b.clone().sub(side);
      for(const point of [aa,ab,ba,ab,bb,ba])positions.push(point.x,point.y,point.z);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const mesh=new THREE.Mesh(geometry,roadMaterial);mesh.renderOrder=62;mesh.userData={sourceFeatureId:streets[i].id,kind:'acquired-pedestrian-street'};streetGroup.add(mesh);
  }
  const plazaMaterial=new THREE.MeshBasicMaterial({color:0x269caa,transparent:true,opacity:.32,depthTest:false,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4});
  if(plaza){const mesh=new THREE.Mesh(polygon(plaza,0),plazaMaterial);mesh.renderOrder=61;mesh.userData={sourceFeatureId:plaza.id,kind:'acquired-jokhang-plaza'};group.add(mesh);}
  const buildingMaterial=new THREE.MeshStandardMaterial({color:0xb45227,roughness:.95,transparent:true,opacity:0,depthWrite:false});
  const members=retail?buildings(retail).filter(f=>f.id!=='relation/2358701'&&f.properties.tags.building!=='temple'):[];
  const surfaces=members.map(feature=>polygon(feature,12)),total=surfaces.reduce((n,g)=>n+g.attributes.position.count*3,0),positions=new Float32Array(total);let offset=0;
  const featureRanges=surfaces.map((surface,index)=>{const source=surface.attributes.position,start=offset/3;for(let i=0;i<source.count;i++){positions[offset++]=source.getX(i);positions[offset++]=source.getY(i);positions[offset++]=source.getZ(i);}surface.dispose();return {featureId:members[index].id,start,count:source.count};});
  if(total){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,buildingMaterial);mesh.userData={featureRanges,kind:'retail-context-buildings',heightScope:'统一12米显示；非实测，非逐栋商铺认定'};buildingGroup.add(mesh);}
  const markers=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({color:0xffe5a2}),paths.length);
  markers.frustumCulled=false;group.add(markers);const transform=new THREE.Object3D();
  group.userData={kind:'barkhor-source-spatial-process',streetIds:streets.map(f=>f.id),plazaId:plaza?.id,retailId:retail?.id,buildingIds:members.map(f=>f.id),scope:'现状地物；标记为活动阅读，非人数速度、古代路线或实施成效'};
  return {group,update(reading:TibetSceneProps['overviewBarkhor'],markerScale:number){
    group.visible=Boolean(reading);if(!reading)return;
    const active=reading.phase!=='context';streetGroup.visible=markers.visible=active;
    const use=reading.phase==='uses'?reading.progress:['designation','protection','return'].includes(reading.phase)?1:0;
    buildingGroup.visible=use>0;buildingMaterial.opacity=.95*use;
    plazaMaterial.opacity=reading.phase==='protection'?.65:reading.phase==='uses'?.32+.18*use:.32;
    paths.forEach((points,index)=>{
      const fraction=Math.max(0,Math.min(1,reading.motion));const sample=routeSampleSegment(points,fraction);
      // Reveal the acquired street surface with the same reading clock as its
      // travelling marker. This is an explanation, not a historic road build.
      const street=streetGroup.children[index] as THREE.Mesh;
      street.geometry.setDrawRange(0,reading.phase==='streets'?Math.min(street.geometry.attributes.position.count,sample.index*6):street.geometry.attributes.position.count);
      transform.position.copy(points[sample.index-1]).lerp(points[sample.index],sample.fraction);
      transform.position.y+=markerScale*1.5;transform.scale.setScalar(markerScale);transform.updateMatrix();markers.setMatrixAt(index,transform.matrix);
    });markers.instanceMatrix.needsUpdate=true;
    group.userData.phase=reading.phase;group.userData.motion=reading.motion;group.userData.visibleStreetVertices=streetGroup.children.reduce((sum,object)=>sum+(object as THREE.Mesh).geometry.drawRange.count,0);
  }};
}
