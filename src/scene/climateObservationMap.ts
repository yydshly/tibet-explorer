import * as THREE from 'three';
import {getClimateObservationMonth,climateObservationAxes} from '../data/climateObservations';
import {disposeTree,label,line,TEAL} from './environment';
import {placeAtlasLabel,type AtlasLabelBox} from '../lib/atlasLabelLayout';

/** A common chart scale above the map, never metres of terrain or rain depth. */
export const CLIMATE_PRECIPITATION_CHART_UNITS_PER_MM=.014;
export function climatePrecipitationChartHeight(mm:number){
 return Number.isFinite(mm)&&mm>=0?mm*CLIMATE_PRECIPITATION_CHART_UNITS_PER_MM:0;
}
type Reading=ReturnType<typeof getClimateObservationMonth>[number];
type Item={reading:Reading;group:THREE.Group;bar:THREE.Mesh<THREE.CylinderGeometry,THREE.MeshBasicMaterial>;base:THREE.Mesh;labels:THREE.Sprite[];leader:THREE.Line;ruler:THREE.LineSegments;anchor:THREE.Vector3};

/** Statistics live at the published weather-station coordinates on the SAME
 * regional map. No precipitation value enters the conceptual cloud model. */
export function buildClimateObservationMap(runtime:{camera:THREE.PerspectiveCamera;at:(lon:number,lat:number,offset?:number)=>THREE.Vector3}){
 const group=new THREE.Group();group.visible=false;group.userData={kind:'sourced-climate-normal-comparison',period:'1991–2020',scope:'气象站月标准值；统一图表柱比例，非地形高度、天气或市域平均'};
 const viewport=new THREE.Vector2();let month:number|undefined,items:Item[]=[];
 const clear=()=>{disposeTree(group);items=[];};
 const screen=(sprite:THREE.Sprite,x:number,y:number,width:number,height:number)=>{
  sprite.position.set(x/viewport.x*2-1,1-y/viewport.y*2,.5).unproject(runtime.camera);
  const depth=-sprite.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z,focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2)));
  sprite.scale.set(width*depth/focal,height*depth/focal,1);sprite.updateMatrixWorld();
 };
 return {group,
  update(selectedMonth:number|undefined,size:THREE.Vector2,activeStationId?:string,exploration=false){
   const active=typeof selectedMonth==='number'&&Number.isInteger(selectedMonth)&&selectedMonth>=1&&selectedMonth<=12;
   group.visible=active;if(!active)return;
   viewport.copy(size);
   if(month!==selectedMonth){
    clear();month=selectedMonth;
    items=getClimateObservationMonth(month!).map(reading=>{
     const place=new THREE.Group(),anchor=runtime.at(reading.station.longitude,reading.station.latitude,.11);
     const color=reading.station.cityId==='lhasa'?0xe8c77e:reading.station.cityId==='ngari'?0xb4aae0:TEAL;
     const bar=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,1,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82,depthTest:false}));
     bar.renderOrder=55;bar.userData={kind:'station-month-precipitation-chart',stationId:reading.station.wmo,month,precipitationMm:reading.precipitationMm,units:'mm',unitsPerMm:CLIMATE_PRECIPITATION_CHART_UNITS_PER_MM};
     const base=new THREE.Mesh(new THREE.RingGeometry(.09,.14,24),new THREE.MeshBasicMaterial({color:0xe8c77e,side:THREE.DoubleSide,depthTest:false}));base.rotation.x=-Math.PI/2;base.renderOrder=56;
     base.userData={kind:'published-weather-station-location',longitude:reading.station.longitude,latitude:reading.station.latitude};
     const texts=[`${reading.station.name}站 · ${reading.station.wmo}`,`${reading.temperatureC.toFixed(1)}°C · ${reading.precipitationMm.toFixed(1)} mm`];
     const labels=texts.map(text=>{const sprite=label(text,'#eaf5e5');sprite.onBeforeRender=()=>{};sprite.renderOrder=60;sprite.userData={kind:'station-observation-caption',text,month,stationId:reading.station.wmo};return sprite;});
     const leader=line([anchor,anchor],0xb3e3d2,.8);(leader.material as THREE.LineBasicMaterial).depthTest=false;leader.renderOrder=58;
     const marks=[new THREE.Vector3(.2,0,0),new THREE.Vector3(.2,climatePrecipitationChartHeight(climateObservationAxes.precipitationMaxMm),0)];
     for(let mm=0;mm<=climateObservationAxes.precipitationMaxMm;mm+=50){const y=climatePrecipitationChartHeight(mm);marks.push(new THREE.Vector3(.16,y,0),new THREE.Vector3(.25,y,0));}
     const ruler=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(marks),new THREE.LineBasicMaterial({color:0xd5e7dc,transparent:true,opacity:.52,depthTest:false}));ruler.renderOrder=54;ruler.userData={kind:'station-common-precipitation-axis',maximumMm:150,tickMm:50,units:'mm',scope:'统一统计图表标尺，非地理垂直尺度'};
     place.add(bar,base,leader,ruler,...labels);group.add(place);return {reading,group:place,bar,base,labels,leader,ruler,anchor};
    });
    group.userData.month=month;
   }
   const occupied:AtlasLabelBox[]=[];
   for(const item of items){
    const speaking=activeStationId===item.reading.station.wmo;
    item.group.userData.activeStation=speaking;item.bar.material.opacity=activeStationId?(speaking?1:.36):.82;
    item.base.scale.setScalar(speaking?1.65:1);
    item.labels.forEach(sprite=>sprite.material.color.set(speaking?0xffe4a3:0xffffff));
    item.anchor.copy(runtime.at(item.reading.station.longitude,item.reading.station.latitude,.11));
    const height=climatePrecipitationChartHeight(item.reading.precipitationMm);
    item.bar.visible=height>0;item.bar.position.copy(item.anchor).add(new THREE.Vector3(0,height/2,0));item.bar.scale.y=height;item.base.position.copy(item.anchor);
    item.ruler.position.copy(item.anchor);
    const top=item.anchor.clone().add(new THREE.Vector3(0,height+.08,0)),p=top.clone().project(runtime.camera);
    const valid=p.z>=-1&&p.z<=1;
    const width=Math.min(exploration?155:190,size.x-30),blockHeight=exploration?48:58,minX=!exploration&&size.x>900?335:8;
    const anchorX=(p.x+1)*size.x/2,anchorY=(1-p.y)*size.y/2;
    // Keep both eastern stations distinct, with leaders to their real anchors.
    const preferredY=anchorY+(item.reading.station.cityId==='lhasa'?34:-40);
    const box=valid?placeAtlasLabel({anchorX:Math.max(minX+width/2,anchorX),anchorY:preferredY,width,height:blockHeight,viewportWidth:size.x,minY:exploration?110:190,maxY:exploration?Math.max(180,size.y-120):Math.max(220,size.y-250),occupied,selected:true}):undefined;
    item.labels.forEach(s=>s.visible=Boolean(box));item.leader.visible=Boolean(box);
    if(!box)continue;
    occupied.push({...box,width,height:blockHeight});
    item.labels.forEach((sprite,index)=>screen(sprite,box.x,box.y+(index-.5)*27,width,26));
    item.group.userData.screenBox={...box,width,height:blockHeight};
    const a=item.leader.geometry.attributes.position as THREE.BufferAttribute;
    a.setXYZ(0,top.x,top.y,top.z);a.setXYZ(1,item.labels[1].position.x,item.labels[1].position.y,item.labels[1].position.z);a.needsUpdate=true;item.leader.geometry.computeBoundingSphere();
   }
  },
  dispose(){clear();},
 };
}
