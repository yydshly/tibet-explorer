import * as THREE from 'three';
import {decodeEvolutionYears,evolutionCellBounds,type RegionalEvolutionWindow} from '../lib/regionalEvolution';
import type {LocalCoordinate} from './cityLocalMap';

/** Original 30m pixels draped on the SAME measured terrain. No invented height,
 * parcel, construction animation or interpolation of missing detections. */
export function createLhasaUrbanReading(window:RegionalEvolutionWindow,buffer:ArrayBuffer,toWorld:(p:LocalCoordinate,offset?:number)=>THREE.Vector3){
  const years=decodeEvolutionYears(buffer,window),group=new THREE.Group();
  group.name='lhasa-observed-spatial-change';group.visible=false;
  const baseline:number[]=[],later:number[]=[],counts:number[]=[];
  for(let year=1985;year<=2015;year++){
    const positions=year===1985?baseline:later;
    for(let i=0;i<years.length;i++)if(years[i]===year){
      const b=evolutionCellBounds(window,i),corners:LocalCoordinate[]=[[b.west,b.north],[b.east,b.north],[b.east,b.south],[b.west,b.south]];
      const points=corners.map(p=>toWorld(p,5));
      for(const k of [0,2,1,0,3,2])positions.push(...points[k].toArray());
    }
    counts.push(later.length/3);
  }
  const meshes=[baseline,later].map((positions,i)=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:i?0xefb655:0x70c9bf,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
    mesh.userData={kind:'lhasa-native-wsf-pixels',baseline:i===0,source:window.dataUrl};group.add(mesh);return mesh;
  });
  // This is the acquired raster window, not an administrative or historical
  // city boundary. Sample each edge so the outline follows measured relief.
  const {west,east,north,south}=window.bounds;
  const corners:LocalCoordinate[]=[[west,north],[east,north],[east,south],[west,south],[west,north]];
  const outlinePoints:THREE.Vector3[]=[];
  for(let edge=0;edge<4;edge++){
    const steps=Math.ceil((edge%2?window.rows:window.columns)/8),a=corners[edge],b=corners[edge+1];
    for(let i=0;i<steps;i++)outlinePoints.push(toWorld([a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps],8));
  }
  outlinePoints.push(toWorld(corners[0],8));
  const dash=toWorld(corners[0]).distanceTo(toWorld(corners[1]))/55;
  const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(outlinePoints),new THREE.LineDashedMaterial({color:0xdce6dc,dashSize:dash,gapSize:dash*.65,transparent:true,opacity:.7}));
  outline.computeLineDistances();outline.userData={kind:'lhasa-observation-window',bounds:window.bounds};group.add(outline);
  group.userData={kind:'lhasa-observed-spatial-change',source:window.dataUrl,window,scope:'原始检出像元贴于实际地形；无建筑高度或古代城界'};
  return {group,update(year:number|undefined,showChange=true){
    group.visible=year!==undefined;if(year===undefined)return;
    const y=Math.max(1985,Math.min(2015,Math.floor(year))),count=showChange?counts[y-1985]:0;
    meshes[1].geometry.setDrawRange(0,count);
    group.userData.year=y;group.userData.visiblePixels=baseline.length/18+count/6;group.userData.showChange=showChange;
  }};
}
