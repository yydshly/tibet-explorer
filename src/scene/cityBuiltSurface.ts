import * as THREE from 'three';
import type {TibetSceneProps} from './TibetScene';

export interface BuiltCityGrid {
  id:string;
  bounds:{west:number;east:number;south:number;north:number};
  columns:number;
  rows:number;
  builtFractions:number[];
  sourceTiles:unknown[];
}
export interface BuiltSurfaceData {year:number;product:string;cellSizeDegrees:number;cities:BuiltCityGrid[]}

/** Original classified pixels are averaged within geographic cells, never expanded
 * into building footprints. No height or historical city limit is inferred. */
export function builtSurfaceCell(grid:BuiltCityGrid,index:number){
  const row=Math.floor(index/grid.columns),col=index%grid.columns;
  const width=(grid.bounds.east-grid.bounds.west)/grid.columns;
  const depth=(grid.bounds.north-grid.bounds.south)/grid.rows;
  return {west:grid.bounds.west+col*width,east:grid.bounds.west+(col+1)*width,
    north:grid.bounds.north-row*depth,south:grid.bounds.north-(row+1)*depth,
    fraction:grid.builtFractions[index]};
}

export function buildCityBuiltSurface(at:(lon:number,lat:number,offset?:number)=>THREE.Vector3,options:{enabled?:boolean}={}){
  const group=new THREE.Group();group.name='observed-built-surface-2021';group.visible=false;
  group.userData={source:'ESA WorldCover 2021 v200',kind:'aggregated-observation',scope:'Class 50 fractions, not buildings, city limits or present-day development'};
  let alive=true,data:BuiltSurfaceData|undefined,lastRelief:string|undefined;
  const meshes:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>[]=[];
  const color=new THREE.Color('#ff8463');
  function clear(){for(const mesh of meshes){for(const child of mesh.children){if(child instanceof THREE.Points){child.geometry.dispose();(child.material as THREE.PointsMaterial).dispose();}}mesh.geometry.dispose();mesh.material.dispose();group.remove(mesh);}meshes.length=0;}
  function rebuild(){
    if(!data)return;clear();
    for(const city of data.cities){
      const positions:number[]=[],colors:number[]=[],pointPositions:number[]=[],pointColors:number[]=[];
      for(let i=0;i<city.builtFractions.length;i++){
        const cell=builtSurfaceCell(city,i);if(!(cell.fraction>0))continue;
        const corners=[[cell.west,cell.north],[cell.east,cell.north],[cell.east,cell.south],[cell.west,cell.south]];
        pointPositions.push(...at((cell.west+cell.east)/2,(cell.north+cell.south)/2,.086).toArray());
        pointColors.push(color.r,color.g,color.b,cell.fraction);
        for(const k of [0,2,1,0,3,2]){
          positions.push(...at(corners[k][0],corners[k][1],.085).toArray());
          colors.push(color.r,color.g,color.b,cell.fraction);
        }
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
      const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(geometry,material);mesh.name=`observed-built-${city.id}`;mesh.renderOrder=18;
      mesh.userData={cityId:city.id,year:data.year,scope:'Colour opacity is the classified built fraction of each aggregation cell'};
      // Small screen-size sample symbols keep the actual tiny settlement windows
      // visible at the full-region scale. Their size is not a building footprint.
      const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pointPositions,3));pointGeometry.setAttribute('color',new THREE.Float32BufferAttribute(pointColors,4));
      const points=new THREE.Points(pointGeometry,new THREE.PointsMaterial({size:2.5,sizeAttenuation:false,vertexColors:true,transparent:true,depthTest:false,depthWrite:false}));
      points.renderOrder=19;points.userData.scope='Fixed-size geographic sample symbols, not footprint size';mesh.add(points);
      group.add(mesh);meshes.push(mesh);
    }
  }
  const ready=options.enabled===false?Promise.resolve():fetch('/assets/terrain/city-built-2021.json').then(response=>{if(!response.ok)throw new Error('Built surface source unavailable');return response.json();}).then((value:BuiltSurfaceData)=>{
    if(!alive)return;
    if(value.year!==2021||!Array.isArray(value.cities)||value.cities.some(city=>city.builtFractions.length!==city.columns*city.rows||city.builtFractions.some(f=>!Number.isFinite(f)||f<0||f>1)))throw new Error('Invalid built surface source');
    data=value;lastRelief=undefined;
  }).catch(()=>{group.userData.unavailable=true;});
  return {group,ready,
    update(settings:TibetSceneProps){
      if(options.enabled===false){group.visible=false;return;}
      const comparison=settings.layer==='atlas-city-comparison'&&settings.step===2&&settings.cityLifeFocus==='settlement';
      group.visible=Boolean(data)&&comparison&&settings.cityBuiltLayer!==false;
      if(!group.visible)return;
      const heights=data!.cities.map(city=>at((city.bounds.west+city.bounds.east)/2,(city.bounds.south+city.bounds.north)/2).y.toFixed(5)).join(':');
      const key=`${settings.layer}:${settings.comparisonRelief}:${heights}`;
      if(key!==lastRelief){rebuild();lastRelief=key;}
      for(const mesh of meshes)mesh.visible=comparison||settings.selected===`city:${mesh.userData.cityId}`;
    },
    dispose(){alive=false;clear();},
  };
}
