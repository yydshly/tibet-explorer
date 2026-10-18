import * as THREE from 'three';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { GOLD, TEAL, label, line, disposeTree } from './environment';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';
import type { TibetSceneProps } from './TibetScene';

export const CITY_COMPARISON_IDS = ['nyingchi', 'lhasa', 'ngari'] as const;
/** Display-only exaggeration; all readings continue to use the original DEM. */
export const CITY_COMPARISON_VERTICAL_EXAGGERATION = 32;
type City = typeof CITY_COMPARISON_IDS[number];
type Reading = (longitude: number, latitude: number) => number | undefined;
export type CityComparisonRuntime = {
  camera: THREE.PerspectiveCamera;
  at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3;
  baseline: (longitude: number, latitude: number) => THREE.Vector3;
  metres: Reading;
  metresToWorld: (metres: number) => number;
};
type Settings = Pick<TibetSceneProps, 'layer' | 'step' | 'selected' | 'progress'> & { comparisonRelief?: boolean; cityLifeFocus?:'mobility'|'water'|'settlement'; cityLifeServices?:boolean; comparisonFocusByCity?:Partial<Record<City,'mobility'|'water'|'settlement'>>;comparisonQuietCaptions?:boolean;comparisonObservation?:boolean };
export type ComparisonPoint = { longitude: number; latitude: number; metres: number };
export type ComparisonCell = ComparisonPoint & { slope: number; relativeHeight: number; lowGentle: number };
const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));
const range = (index: number) => [index === 0 ? 0 : index === 1 ? .34 : .68, index === 0 ? .34 : index === 1 ? .68 : 1] as const;
const colors = { nyingchi: TEAL, lhasa: GOLD, ngari: 0xaebbdc };
const shortNames:Record<City,string>={nyingchi:'林芝',lhasa:'拉萨',ngari:'阿里'};

/** Three separate rows keep the eastern cities readable on a narrow map.
 * West-to-east row order also limits leader crossings. */
export function cityComparisonMobileCaptionBox(city:City,width:number,height:number,textWidth:number,textHeight=24):AtlasLabelBox{
  const row={ngari:0,lhasa:1,nyingchi:2}[city],lastY=Math.max(180,height-108),labelWidth=Math.min(width-24,textWidth);
  return {x:row===0?12+labelWidth/2:row===2?width-12-labelWidth/2:width/2,y:lastY-(2-row)*28,width:labelWidth,height:textHeight};
}

/** Authored regional beats share one clock. Earlier regions retain their result. */
export function cityComparisonState(settings: Settings, city: City) {
  const index = CITY_COMPARISON_IDS.indexOf(city), [start, end] = range(index), progress = phase(clamp(settings.progress), start, end);
  const stage = Math.min(2, Math.max(0, Math.round(settings.step || 0)));
  return { city, stage, progress, started: settings.progress >= start, active: settings.selected === `city:${city}`, relief: settings.comparisonRelief !== false,
    focus:settings.comparisonFocusByCity?.[city]??settings.cityLifeFocus??'mobility',services:settings.cityLifeServices!==false,
    travel: phase(progress, 0, .58), cloud: phase(progress, .42, .68), rain: phase(progress, .66, .86), runoff: phase(progress, .84, 1),
  };
}

/** Same angular sampling window at each town; this is not an equal-area map,
 * a city boundary, a construction assessment or a mapped land-use polygon. */
export function cityComparisonWindow(city: City, read: Reading, columns = 29, rows = 37) {
  const ref = verifiedPlaceReferences[city], width = 2.2, depth = 2.9;
  const raw: ComparisonPoint[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const longitude = ref.longitude - width / 2 + col / (columns - 1) * width;
    const latitude = ref.latitude - depth / 2 + row / (rows - 1) * depth;
    const metres = read(longitude, latitude);
    if (metres === undefined) return undefined;
    raw.push({ longitude, latitude, metres });
  }
  const minimum = Math.min(...raw.map(point => point.metres)), maximum = Math.max(...raw.map(point => point.metres));
  const cells: ComparisonCell[] = raw.map((point, index) => {
    const row = Math.floor(index / columns), col = index % columns;
    const left = raw[row * columns + Math.max(0, col - 1)], right = raw[row * columns + Math.min(columns - 1, col + 1)];
    const low = raw[Math.max(0, row - 1) * columns + col], high = raw[Math.min(rows - 1, row + 1) * columns + col];
    const dx = (right.longitude - left.longitude) * 111320 * Math.cos(point.latitude * Math.PI / 180), dz = (high.latitude - low.latitude) * 111320;
    const slope = Math.hypot((right.metres - left.metres) / Math.max(1, dx), (high.metres - low.metres) / Math.max(1, dz));
    const relativeHeight = (point.metres - minimum) / Math.max(1, maximum - minimum);
    // A continuous reading aid, not a suitability threshold or land-use claim.
    const lowGentle = (1 - relativeHeight) * (1 / (1 + slope * 14));
    return { ...point, slope, relativeHeight, lowGentle };
  });
  return { city, columns, rows, minimum, maximum, cells };
}

/** Authored inflow directions locate a mechanism, not a measured weather track. */
export function cityComparisonPathPoint(city: City, progress: number) {
  const ref = verifiedPlaceReferences[city], t = clamp(progress);
  if (city === 'nyingchi') return { longitude: ref.longitude - .45 + .45 * t + .23 * Math.sin(Math.PI * t), latitude: ref.latitude - 2.45 + 2.45 * t };
  if (city === 'lhasa') return { longitude: ref.longitude - .6 + .6 * t, latitude: ref.latitude - 2.25 + 2.25 * t };
  return { longitude: ref.longitude - 2.5 + 2.5 * t, latitude: ref.latitude - .8 + .8 * t + .15 * Math.sin(Math.PI * t) };
}

/** Keep air above every traversed real sample. Expansion uses gained height,
 * not frame time, horizontal distance, or a fabricated temperature reading. */
export function cityComparisonAirPose(city: City, progress: number, read: Reading, relief = true) {
  const point = cityComparisonPathPoint(city, progress), terrainMetres = read(point.longitude, point.latitude);
  if (terrainMetres === undefined) return undefined;
  const start = cityComparisonPathPoint(city, 0), startMetres = read(start.longitude, start.latitude);
  if (startMetres === undefined) return undefined;
  let highest = startMetres;
  for (let index = 0; index <= 120; index++) {
    const sample = cityComparisonPathPoint(city, clamp(progress) * index / 120);
    const metres = read(sample.longitude, sample.latitude); if (metres === undefined) return undefined;
    highest = Math.max(highest, metres);
  }
  const gainedMetres = relief ? Math.max(0, highest - startMetres) : 0;
  return { ...point, terrainMetres, highestMetres: highest, gainedMetres,
    expansion: 1 + Math.min(.8, gainedMetres / 5000),
    // Condensation strength is deliberately normalized as a mechanism, never
    // presented as precipitation or compared as city climate measurements.
    liftResponse: relief ? Math.min(1, gainedMetres / 1200) : 0,
  };
}

/** Local surface descent on the sampled grid, stopping at the first low point.
 * The intermediate checks prevent drawing a shortcut across an uphill ridge. */
export function cityComparisonDownhill(read: Reading, longitude: number, latitude: number, steps = 28): ComparisonPoint[] {
  const metres = read(longitude, latitude); if (metres === undefined) return [];
  const points: ComparisonPoint[] = [{ longitude, latitude, metres }], dx = 25 / 448, dy = 13 / 256;
  for (let step = 0; step < Math.min(60, Math.max(0, steps)); step++) {
    const current = points[points.length - 1]; let best: ComparisonPoint | undefined, bestGrade = 0;
    for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
      if (!xx && !yy) continue;
      const lon = current.longitude + xx * dx, lat = current.latitude + yy * dy, height = read(lon, lat); if (height === undefined) continue;
      let previous = current.metres, monotonic = true;
      for (let i = 1; i <= 4; i++) { const value = read(THREE.MathUtils.lerp(current.longitude, lon, i / 4), THREE.MathUtils.lerp(current.latitude, lat, i / 4)); if (value === undefined || value > previous + .001) monotonic = false; previous = value ?? previous; }
      const drop = current.metres - height, grade = drop / Math.hypot(xx * dx * Math.cos(lat * Math.PI / 180), yy * dy);
      if (monotonic && drop > .1 && grade > bestGrade) { bestGrade = grade; best = { longitude: lon, latitude: lat, metres: height }; }
    }
    if (!best) break; points.push(best);
  }
  return points;
}

type WindowData = NonNullable<ReturnType<typeof cityComparisonWindow>>;
const groundDistance=(a:ComparisonPoint,b:ComparisonPoint)=>Math.hypot((b.longitude-a.longitude)*111320*Math.cos((a.latitude+b.latitude)*Math.PI/360),(b.latitude-a.latitude)*111320);

/** Same two trial endpoints, with a distance + sampled-slope cost. This is a
 * reproducible teaching line, never a surveyed road or a passability assessment. */
export function cityComparisonMobility(window:WindowData,read:Reading,relief=true){
  const {cells,columns,rows}=window,row=Math.floor(rows/2),start=row*columns+2,end=row*columns+columns-3;
  const costs=new Float64Array(cells.length).fill(Infinity),previous=new Int32Array(cells.length).fill(-1),visited=new Uint8Array(cells.length);
  costs[start]=0;
  for(let iteration=0;iteration<cells.length;iteration++){
    let current=-1,best=Infinity;
    for(let index=0;index<cells.length;index++)if(!visited[index]&&costs[index]<best){best=costs[index];current=index;}
    if(current<0||current===end)break;
    visited[current]=1;
    const r=Math.floor(current/columns),c=current%columns;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if((!dx&&!dy)||r+dy<0||r+dy>=rows||c+dx<0||c+dx>=columns)continue;
      const next=(r+dy)*columns+c+dx;if(visited[next])continue;
      const a=cells[current],b=cells[next],distance=groundDistance(a,b);
      const midpoint=read((a.longitude+b.longitude)/2,(a.latitude+b.latitude)/2);if(midpoint===undefined)continue;
      const grade=relief?Math.max(Math.abs(midpoint-a.metres),Math.abs(b.metres-midpoint))/(distance/2):0;
      // The coefficient is a declared illustrative cost, not a transport model.
      const cost=costs[current]+distance*(1+grade*grade*600);
      if(cost<costs[next]){costs[next]=cost;previous[next]=current;}
    }
  }
  if(!Number.isFinite(costs[end]))return undefined;
  const indices:number[]=[];
  for(let at=end;at>=0;at=previous[at]){indices.unshift(at);if(at===start)break;}
  if(indices[0]!==start)return undefined;
  const sample=(a:ComparisonPoint,b:ComparisonPoint,divisions:number)=>Array.from({length:divisions},(_,index)=>{
    const t=index/divisions,longitude=THREE.MathUtils.lerp(a.longitude,b.longitude,t),latitude=THREE.MathUtils.lerp(a.latitude,b.latitude,t),metres=read(longitude,latitude);
    return metres===undefined?undefined:{longitude,latitude,metres};
  });
  const raw=indices.flatMap((index,i)=>i<indices.length-1?sample(cells[index],cells[indices[i+1]],4):[cells[index]]);
  const direct=sample(cells[start],cells[end],100).concat(cells[end]);
  if(raw.some(point=>!point)||direct.some(point=>!point))return undefined;
  const points=raw as ComparisonPoint[],straight=direct as ComparisonPoint[];
  const minimum=Math.min(...points.map(point=>point.metres)),maximum=Math.max(...points.map(point=>point.metres));
  return {points,straight,minimum,maximum,heightRange:maximum-minimum,start:cells[start],end:cells[end],cost:costs[end],indices,
    scope:'同端点、距离与坡度代价的地形教学试线；不是实际道路、最优路线或可通行性结论'};
}

/** Connected patches in the upper 35% of this window's relative low/gentle
 * reading. This local ranking has no construction or urban-boundary meaning. */
export function cityComparisonLowSpaces(window:WindowData){
  const {columns,rows,cells}=window;
  const quads=Array.from({length:(columns-1)*(rows-1)},(_,index)=>{
    const row=Math.floor(index/(columns-1)),col=index%(columns-1),corner=row*columns+col;
    const corners=[corner,corner+1,corner+columns+1,corner+columns];
    return {index,row,col,corners,score:corners.reduce((sum,i)=>sum+cells[i].lowGentle,0)/4};
  });
  const scores=quads.map(quad=>quad.score).sort((a,b)=>a-b),threshold=scores[Math.floor(scores.length*.65)];
  const candidates=new Set(quads.filter(quad=>quad.score>=threshold).map(quad=>quad.index)),patches:number[][]=[];
  while(candidates.size){
    const first=candidates.values().next().value!,queue=[first],patch:number[]=[];candidates.delete(first);
    for(let cursor=0;cursor<queue.length;cursor++){
      const index=queue[cursor],q=quads[index];patch.push(index);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        if(q.col+dx<0||q.col+dx>=columns-1||q.row+dy<0||q.row+dy>=rows-1)continue;
        const next=(q.row+dy)*(columns-1)+q.col+dx;if(candidates.delete(next))queue.push(next);
      }
    }
    if(patch.length>=3)patches.push(patch);
  }
  const selected=new Set(patches.flat()),edges:[ComparisonPoint,ComparisonPoint][]=[];
  for(const index of selected){
    const q=quads[index];
    for(const [edge,dx,dy] of [[0,0,-1],[1,1,0],[2,0,1],[3,-1,0]]){
      const nr=q.row+dy,nc=q.col+dx;
      if(nr>=0&&nr<rows-1&&nc>=0&&nc<columns-1&&selected.has(nr*(columns-1)+nc))continue;
      edges.push([cells[q.corners[edge]],cells[q.corners[(edge+1)%4]]]);
    }
  }
  return {quads:quads.filter(q=>selected.has(q.index)),edges,patches,threshold,
    scope:'窗口内部相对低缓连续片区；不是城市边界、土地用途或可建设用地'};
}

type Caption = { text: string; sprite: THREE.Sprite; leader: THREE.Line };
type MobilityData=NonNullable<ReturnType<typeof cityComparisonMobility>>;
type WaterDetail={root:THREE.Group;mechanism:THREE.Group;receiver:THREE.Group;wheel:THREE.Group;fill:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;flow:THREE.Mesh<THREE.TubeGeometry,THREE.MeshBasicMaterial>;points:THREE.Vector3[];ground:THREE.Mesh};
type CityModel = {
  city: City; root: THREE.Group; atmosphere: THREE.Group; terrain: THREE.Group; life: THREE.Group;
  parcel: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>; cloud: THREE.Group; rain: THREE.InstancedMesh;
  path: THREE.Line; pathPoints: ComparisonPoint[]; arrow: THREE.Mesh; probe: THREE.Line; baseline: THREE.Line;
  profile?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; curtain?: THREE.Mesh;
  profilePoints: ComparisonPoint[]; profilePointer: THREE.Mesh;
  lowland?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; window?: WindowData;
  mobility:THREE.Group;waterUse:THREE.Group;settlement:THREE.Group;
  corridor?:THREE.Mesh<THREE.TubeGeometry,THREE.MeshBasicMaterial>;direct?:THREE.Line;mobilityData?:MobilityData;
  traveller:THREE.Mesh;crossing:THREE.Line;spaceOutline?:THREE.LineSegments;
  source:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;servicePath:THREE.Line;serviceBead:THREE.Mesh;gate:THREE.Mesh<THREE.BoxGeometry,THREE.MeshBasicMaterial>;servicePoints:THREE.Vector3[];
  waterDetail?:WaterDetail;
  runoff: { trace: THREE.Line; tube?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; bead: THREE.Mesh; points: ComparisonPoint[] }[];
  ready: boolean; relief?: boolean;
};

export function buildCityComparison(runtime: CityComparisonRuntime) {
  const group = new THREE.Group(); group.userData.kind = 'same-map-three-city-comparison'; group.visible = false;
  const viewport = new THREE.Vector2(), dummy = new THREE.Object3D();
  const captions = new Map<string, Caption>();
  let captionSettings:Settings|undefined;
  const material = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const cities: CityModel[] = CITY_COMPARISON_IDS.map(city => {
    const root = new THREE.Group(); root.userData = { kind: 'regional-comparison-process', city, selectId: `city:${city}` };
    const atmosphere = new THREE.Group(), terrain = new THREE.Group(), life = new THREE.Group(); root.add(atmosphere, terrain, life); group.add(root);
    const mobility=new THREE.Group(),waterUse=new THREE.Group(),settlement=new THREE.Group();life.add(mobility,waterUse,settlement);
    mobility.userData={kind:'comparison-mobility-reading',city};waterUse.userData={kind:'comparison-water-use-principle',city,scope:'位置旁的取用原理，非实测设施、井深、管网或水渠'};settlement.userData={kind:'comparison-low-space-reading',city};
    const traveller=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),material(GOLD));traveller.material.depthTest=false;traveller.renderOrder=24;
    const crossing=line([new THREE.Vector3(),new THREE.Vector3()],GOLD,.8,true);(crossing.material as THREE.LineDashedMaterial).depthTest=false;crossing.renderOrder=21;crossing.userData.kind='trial-line-measured-height-range';mobility.add(traveller,crossing);
    const source=new THREE.Mesh(new THREE.CircleGeometry(.3,32),material(0x70bcd6,.3));source.rotation.x=-Math.PI/2;source.material.side=THREE.DoubleSide;source.material.depthTest=false;source.renderOrder=18;
    source.userData={kind:city==='lhasa'?'groundwater-source-principle':'surface-water-source-principle',scope:'原理图形，非实测含水层、河道或水源位置'};
    const servicePath=line([new THREE.Vector3(),new THREE.Vector3()],0x9fdfef,.9);(servicePath.material as THREE.LineBasicMaterial).depthTest=false;servicePath.renderOrder=22;servicePath.userData.kind='human-water-use-not-real-network';
    const serviceBead=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),material(0xc7f7f2));serviceBead.material.depthTest=false;serviceBead.renderOrder=24;
    const gate=new THREE.Mesh(new THREE.BoxGeometry(.045,.26,.28),material(GOLD,.65));gate.material.depthTest=false;gate.renderOrder=23;gate.userData.kind=city==='ngari'?'abstract-operated-gate':'abstract-supply-facility';waterUse.add(source,servicePath,serviceBead,gate);
    const parcel = new THREE.Mesh(new THREE.SphereGeometry(.2, 22, 14), material(0xe9ca8f, .12));
    parcel.userData.kind = 'three-city-dem-clearing-parcel'; parcel.renderOrder = 8;
    for (let axis = 0; axis < 3; axis++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.202, .007, 5, 44), material(GOLD, .8));
      if (axis === 1) ring.rotation.x = Math.PI / 2; if (axis === 2) ring.rotation.y = Math.PI / 2; ring.renderOrder = 9; parcel.add(ring);
    }
    for (let index = 0; index < 9; index++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), material(TEAL));
      dot.position.set(Math.cos(index * 2.4) * .13, Math.sin(index * 1.9) * .1, Math.sin(index * 2.4) * .13); dot.renderOrder = 10; parcel.add(dot);
    }
    const path = line(Array.from({ length: 121 }, () => new THREE.Vector3()), colors[city], .65);
    path.userData.kind = 'qualitative-inflow-on-real-dem'; atmosphere.add(path, parcel);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.07, .22, 10), material(colors[city])); atmosphere.add(arrow);
    const cloud = new THREE.Group(); cloud.userData.kind = 'conditional-cloud-not-observed-weather'; atmosphere.add(cloud);
    for (let index = 0; index < 7; index++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), material(0xf1f3e7, .85));
      puff.position.set(Math.sin(index * 2.4) * .3, Math.cos(index * 2.1) * .08, Math.cos(index * 2.4) * .22); puff.renderOrder = 11; cloud.add(puff);
    }
    const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(.018, .023, 1, 6), material(0x82e6e7, .9), 24);
    rain.userData.kind = 'rain-landing-on-same-dem'; rain.frustumCulled = false; rain.renderOrder = 12; atmosphere.add(rain);
    const probe = line([new THREE.Vector3(), new THREE.Vector3()], colors[city], .85, true); probe.userData.kind = 'common-sea-level-city-reference'; terrain.add(probe);
    (probe.material as THREE.LineDashedMaterial).depthTest = false; probe.renderOrder = 19;
    const baseline = line([new THREE.Vector3(), new THREE.Vector3()], colors[city], .58, true);
    (baseline.material as THREE.LineDashedMaterial).depthTest = false; baseline.renderOrder = 18;
    baseline.userData.kind = 'three-city-sea-level-profile-baseline'; terrain.add(baseline);
    const profilePointer = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), material(colors[city])); profilePointer.userData.kind = 'three-city-original-dem-reading'; terrain.add(profilePointer);
    profilePointer.material.depthTest = false; profilePointer.renderOrder = 21;
    const runoff = Array.from({ length: 3 }, () => {
      const trace = line([new THREE.Vector3(), new THREE.Vector3()], TEAL, .86);
      trace.userData.kind = 'sampled-local-downhill-not-river-or-channel';
      const bead = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 8), material(0x9df5e6)); life.add(trace, bead);
      bead.material.depthTest = false; bead.renderOrder = 22;
      return { trace, tube: undefined as THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | undefined, bead, points: [] as ComparisonPoint[] };
    });
    return { city, root, atmosphere, terrain, life, mobility,waterUse,settlement,traveller,crossing,source,servicePath,serviceBead,gate,servicePoints:[],parcel, cloud, rain, path, pathPoints: [], arrow, probe, baseline, profilePoints: [], profilePointer, runoff, ready: false };
  });
  const writeLine = (object: THREE.Line, points: THREE.Vector3[]) => {
    const values = object.geometry.attributes.position as THREE.BufferAttribute;
    if (values.count === points.length) { points.forEach((point, index) => values.setXYZ(index, point.x, point.y, point.z)); values.needsUpdate = true; object.geometry.computeBoundingSphere(); }
    else { object.geometry.dispose(); object.geometry = new THREE.BufferGeometry().setFromPoints(points); }
    object.computeLineDistances();
  };
  const buildWaterDetail=(model:CityModel)=>{
    if(model.waterDetail){model.waterUse.remove(model.waterDetail.root);disposeTree(model.waterDetail.root);}
    const root=new THREE.Group(),mechanism=new THREE.Group(),receiver=new THREE.Group(),wheel=new THREE.Group();
    root.userData={kind:'terrain-attached-water-section',city:model.city,scope:'贴附地区定位的局部原理切面；高度、源层、机构与接收端均非实测设施或地层'};
    root.add(mechanism,receiver);model.waterUse.add(root);
    const mesh=(geometry:THREE.BufferGeometry,color:number,opacity=1)=>{
      const object=new THREE.Mesh(geometry,material(color,opacity));object.material.depthTest=false;object.material.side=THREE.DoubleSide;object.renderOrder=26;return object;
    };
    const tube=(points:THREE.Vector3[],radius:number,color:number,opacity:number)=>{
      const curve=new THREE.CurvePath<THREE.Vector3>();for(let i=0;i<points.length-1;i++)curve.add(new THREE.LineCurve3(points[i],points[i+1]));
      return mesh(new THREE.TubeGeometry(curve,120,radius,8,false),color,opacity) as THREE.Mesh<THREE.TubeGeometry,THREE.MeshBasicMaterial>;
    };
    const p=(x:number,y:number,z=.045)=>new THREE.Vector3(x,y,z);
    let points:THREE.Vector3[],ground:THREE.Mesh;
    if(model.city==='nyingchi'){
      const sampled=model.runoff.reduce((a,b)=>a.points.length>b.points.length?a:b).points;
      const drop=Math.max(1,(sampled[0]?.metres??0)-(sampled.at(-1)?.metres??0));
      points=sampled.length>1?sampled.map((point,index)=>p(-.83+index/(sampled.length-1)*1.66,.08+(point.metres-sampled.at(-1)!.metres)/drop*.68)):[p(-.8,.1),p(.8,.1)];
      const shape=new THREE.Shape();shape.moveTo(-.83,-.12);for(const point of points)shape.lineTo(point.x,point.y);shape.lineTo(.83,-.12);shape.closePath();
      ground=mesh(new THREE.ShapeGeometry(shape),0x93784a,.65);ground.renderOrder=23;ground.userData={kind:'sampled-surface-descent-section',samples:sampled,scope:'窗口内真实DEM下坡采样，剖面横纵显示尺度不同；不是实测河道'};
      model.source.position.set(-.72,.65,0);model.source.scale.set(1,1,1);
    }else if(model.city==='lhasa'){
      ground=mesh(new THREE.PlaneGeometry(1.8,.7),0x7c6545,.65);ground.position.y=-.35;ground.renderOrder=23;
      points=[p(-.4,-.45),p(-.4,.48),p(.65,.48),p(.65,.16)];
      model.source.position.set(-.1,-.46,.02);model.source.scale.set(2.6,.48,1);
      const pipe=tube(points,.085,0x132b34,.95);pipe.renderOrder=25;mechanism.add(pipe);
      model.gate.position.set(-.4,.14,.08);model.gate.scale.set(4,.55,.25);
      wheel.position.set(-.4,.28,.12);
    }else{
      ground=mesh(new THREE.PlaneGeometry(1.8,.38),0x7c6545,.65);ground.position.y=-.08;ground.renderOrder=23;
      points=[p(-.83,.1),p(-.06,.1),p(.66,.1)];
      model.source.position.set(-.48,.09,.025);model.source.scale.set(1.2,.26,1);
      model.gate.position.set(0,.22,.07);model.gate.scale.set(2.7,1.4,.2);
      for(const x of [-.16,.16]){const post=mesh(new THREE.BoxGeometry(.055,.68,.07),0xd9a23e);post.position.set(x,.28,.06);mechanism.add(post);}
      const beam=mesh(new THREE.BoxGeometry(.37,.055,.07),0xd9a23e);beam.position.set(0,.62,.06);mechanism.add(beam);
      wheel.position.set(0,.75,.12);
    }
    root.add(ground);
    const groundEdge=line([p(-.88,0,.025),p(.88,0,.025)],0xd4bd83,.7);(groundEdge.material as THREE.LineBasicMaterial).depthTest=false;groundEdge.renderOrder=24;root.add(groundEdge);
    model.source.rotation.set(0,0,0);model.source.material.color.setHex(0x228fc9);model.source.material.opacity=.72;model.source.renderOrder=24;
    const ring=mesh(new THREE.TorusGeometry(.13,.026,8,28),0xf0b543);wheel.add(ring);
    for(const angle of [0,Math.PI/2]){const spoke=mesh(new THREE.BoxGeometry(.23,.035,.035),0xf0b543);spoke.rotation.z=angle;wheel.add(spoke);}
    wheel.userData.kind='reversible-water-control-wheel';mechanism.add(wheel);
    const basin=line([p(.43,.24),p(.43,-.12),p(.88,-.12),p(.88,.24)],0xd7bb70,.9);(basin.material as THREE.LineBasicMaterial).depthTest=false;basin.renderOrder=28;receiver.add(basin);
    const fill=mesh(new THREE.PlaneGeometry(.39,.3),0x32dfdc,.7) as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;fill.position.set(.655,.03,.07);fill.renderOrder=27;fill.userData.kind='use-end-received-water';receiver.add(fill);
    const flow=tube(points,.045,0x35e6ed,.95);flow.userData.kind='visible-water-transfer-body';flow.renderOrder=28;root.add(flow);
    model.servicePoints=points;writeLine(model.servicePath,points);model.servicePath.renderOrder=27;
    (model.servicePath.material as THREE.LineBasicMaterial).color.setHex(0x2b9dbc);
    (model.serviceBead.material as THREE.MeshBasicMaterial).color.setHex(0x43f5ef);model.serviceBead.renderOrder=30;
    model.gate.material.color.setHex(0xf3b43f);model.gate.renderOrder=29;
    model.waterDetail={root,mechanism,receiver,wheel,fill,flow,points,ground};
  };
  const surface = (point: Pick<ComparisonPoint, 'longitude' | 'latitude'>, offset = .07) => runtime.at(point.longitude, point.latitude, offset);
  const airborne = (city: City, t: number, relief: boolean) => {
    const pose = cityComparisonAirPose(city, t, runtime.metres, relief); if (!pose) return undefined;
    const point = runtime.at(pose.longitude, pose.latitude, .42);
    if (relief) point.y += runtime.metresToWorld(pose.highestMetres - pose.terrainMetres);
    return { ...pose, position: point };
  };
  const build = (model: CityModel, relief: boolean) => {
    const ref = verifiedPlaceReferences[model.city], window = cityComparisonWindow(model.city, runtime.metres);
    if (!window) return;
    model.window = window; model.profilePoints = [];
    for (let index = 0; index <= 80; index++) {
      // East–west sections expose their horizontal variation in the common
      // south-facing regional view, rather than pointing into the camera.
      const longitude = ref.longitude - 1.1 + index / 80 * 2.2, metres = runtime.metres(longitude, ref.latitude);
      if (metres !== undefined) model.profilePoints.push({ longitude, latitude: ref.latitude, metres });
    }
    const profilePoints = model.profilePoints.map(point => surface(point));
    writeLine(model.baseline, model.profilePoints.map(point => runtime.baseline(point.longitude, point.latitude)));
    if (model.profile) { model.terrain.remove(model.profile); model.profile.geometry.dispose(); model.profile.material.dispose(); }
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < profilePoints.length - 1; i++) curve.add(new THREE.LineCurve3(profilePoints[i], profilePoints[i + 1]));
    model.profile = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, .065, 6, false), material(colors[model.city]));
    model.profile.material.depthTest = false; model.profile.renderOrder = 20;
    model.profile.userData = { kind: 'three-city-same-window-dem-profile', city: model.city, direction: 'west-east', samples: model.profilePoints }; model.terrain.add(model.profile);
    if (model.curtain) { model.terrain.remove(model.curtain); disposeTree(model.curtain); }
    const triangles: number[] = [];
    for (let i = 0; i < profilePoints.length - 1; i++) {
      const a = profilePoints[i], b = profilePoints[i + 1], floorA = runtime.baseline(model.profilePoints[i].longitude, model.profilePoints[i].latitude), floorB = runtime.baseline(model.profilePoints[i + 1].longitude, model.profilePoints[i + 1].latitude);
      for (const point of [a, floorA, b, b, floorA, floorB]) triangles.push(point.x, point.y, point.z);
    }
    const curtainGeometry = new THREE.BufferGeometry(); curtainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(triangles, 3));
    const curtainMaterial = material(colors[model.city], .24); curtainMaterial.side = THREE.DoubleSide; curtainMaterial.depthTest = false;
    model.curtain = new THREE.Mesh(curtainGeometry, curtainMaterial); model.curtain.renderOrder = 17;
    model.curtain.userData.kind = 'three-city-shared-zero-metre-curtain'; model.curtain.userData.scope = '穿透地表读取0m至真实高程的剖面，不是悬浮地形或新建地面'; model.terrain.add(model.curtain);
    if(model.corridor){model.mobility.remove(model.corridor);model.corridor.geometry.dispose();model.corridor.material.dispose();}
    if(model.direct){model.mobility.remove(model.direct);model.direct.geometry.dispose();(model.direct.material as THREE.Material).dispose();}
    model.mobilityData=cityComparisonMobility(window,runtime.metres,relief);
    if(model.mobilityData){
      const route=model.mobilityData,curve=new THREE.CurvePath<THREE.Vector3>();
      for(let i=0;i<route.points.length-1;i++)curve.add(new THREE.LineCurve3(surface(route.points[i],.09),surface(route.points[i+1],.09)));
      model.corridor=new THREE.Mesh(new THREE.TubeGeometry(curve,180,.055,6,false),material(GOLD,.95));model.corridor.material.depthTest=false;model.corridor.renderOrder=22;
      model.corridor.userData={kind:'dem-slope-cost-teaching-trial',...route,city:model.city};
      model.direct=line(route.straight.map(point=>surface(point,.07)),0xdca78c,.58,true);(model.direct.material as THREE.LineDashedMaterial).depthTest=false;model.direct.renderOrder=19;
      model.direct.userData={kind:'same-endpoint-straight-reference',samples:route.straight,scope:'同端点地表直线参照，不是道路'};model.mobility.add(model.corridor,model.direct);
      const highest=route.points.reduce((a,b)=>a.metres>b.metres?a:b),top=surface(highest,.13),bottom=runtime.baseline(highest.longitude,highest.latitude);
      bottom.y+=relief?runtime.metresToWorld(route.minimum):.025;
      writeLine(model.crossing,[bottom,top]);model.crossing.userData={kind:'trial-line-measured-height-range',minimum:route.minimum,maximum:route.maximum,metres:route.heightRange,sample:highest};
    }
    // Only continuous relative-low/gentle patches are shaded; the rest of the
    // shared terrain stays visible. Their edge is not an urban boundary.
    if(model.lowland){model.settlement.remove(model.lowland);model.lowland.geometry.dispose();model.lowland.material.dispose();}
    if(model.spaceOutline){model.settlement.remove(model.spaceOutline);model.spaceOutline.geometry.dispose();(model.spaceOutline.material as THREE.Material).dispose();}
    const spaces=cityComparisonLowSpaces(window),positions:number[]=[];
    for(const quad of spaces.quads)for(const index of [0,1,3,1,2,3]){
      const point=surface(window.cells[quad.corners[index]],.065);positions.push(point.x,point.y,point.z);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    const colorMaterial=material(0x79d7a2,.27);colorMaterial.side=THREE.DoubleSide;colorMaterial.depthTest=false;
    model.lowland=new THREE.Mesh(geometry,colorMaterial);model.lowland.renderOrder=14;
    model.lowland.userData={kind:'dem-relative-low-and-gentle-reading',window,...spaces};model.settlement.add(model.lowland);
    const edgeGeometry=new THREE.BufferGeometry().setFromPoints(spaces.edges.flatMap(edge=>edge.map(point=>surface(point,.09))));
    const edgeMaterial=new THREE.LineBasicMaterial({color:0x75c69a,transparent:true,opacity:.4,depthTest:false,depthWrite:false});
    model.spaceOutline=new THREE.LineSegments(edgeGeometry,edgeMaterial);model.spaceOutline.renderOrder=21;
    model.spaceOutline.userData={kind:'continuous-low-gentle-space-edge',...spaces};model.settlement.add(model.spaceOutline);

    for (let i = 0; i < model.runoff.length; i++) {
      // Start at actual higher samples within this window, not at an invented
      // water intake. The descending dots explain gravity on this surface.
      const candidates = window.cells.filter(cell => cell.relativeHeight > .55);
      const start = candidates[Math.min(candidates.length - 1, Math.floor((i + 1) / 4 * candidates.length))] ?? window.cells[Math.floor(window.cells.length / 2)];
      const flow = model.runoff[i]; flow.points = relief ? cityComparisonDownhill(runtime.metres, start.longitude, start.latitude) : [start];
      writeLine(flow.trace, flow.points.map(point => surface(point, .085))); flow.trace.userData.samples = flow.points;
      if (flow.tube) { model.life.remove(flow.tube); flow.tube.geometry.dispose(); flow.tube.material.dispose(); flow.tube = undefined; }
      if (flow.points.length > 1) {
        const curve = new THREE.CurvePath<THREE.Vector3>();
        for (let index = 0; index < flow.points.length - 1; index++) curve.add(new THREE.LineCurve3(surface(flow.points[index], .095), surface(flow.points[index + 1], .095)));
        flow.tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .06, 5, false), material(0x91fff0, .94));
        flow.tube.material.depthTest = false; flow.tube.renderOrder = 21;
        flow.tube.userData = { kind: 'visible-sampled-downhill-on-dem', samples: flow.points }; model.life.add(flow.tube);
      }
    }
    buildWaterDetail(model);
    model.pathPoints = [];
    const flight: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const pose = airborne(model.city, i / 120, relief); if (!pose) continue;
      flight.push(pose.position); model.pathPoints.push({ longitude: pose.longitude, latitude: pose.latitude, metres: pose.terrainMetres });
    }
    if (flight.length > 1) writeLine(model.path, flight);
    model.ready = true; model.relief = relief;
  };
  const project = (point: THREE.Vector3) => {
    const p = point.clone().project(runtime.camera);
    return { x: (p.x + 1) * viewport.x / 2, y: (1 - p.y) * viewport.y / 2, z: p.z };
  };
  const caption = (key: string, text: string, anchor: THREE.Vector3, offset: [number, number] = [0, 42]) => {
    if(captionSettings?.comparisonQuietCaptions)return;
    const city=key.split('-')[0] as City,mobile=viewport.x<520;
    if(mobile){
      const currentIndex=(captionSettings?.progress??0)<.34?0:(captionSettings?.progress??0)<.68?1:2;
      const current=CITY_COMPARISON_IDS[currentIndex]===city;
      if(captionSettings?.step===2&&captionSettings.cityLifeFocus==='water'){
        text=city==='nyingchi'?(current?'下坡汇流，取用另需设施':'地表下降')
          :city==='lhasa'?(current?(captionSettings.cityLifeServices===false?'源仍在，提升暂停':'地下→提升→使用端'):'地下取水')
          :(current?(captionSettings.cityLifeServices===false?'水源仍在，闸控暂停':'开闸→使用端'):'闸控取水');
      }else if(captionSettings?.step===2&&captionSettings.cityLifeFocus==='settlement'&&!current)text='低缓片区';
      text=`${shortNames[city]} · ${text.replace('定位点约','约')}`;
    }
    let item = captions.get(key);
    if (item?.text !== text) {
      if (item) { group.remove(item.sprite, item.leader); item.sprite.material.map?.dispose(); item.sprite.material.dispose(); item.leader.geometry.dispose(); (item.leader.material as THREE.Material).dispose(); }
      const sprite = label(text, '#e4e9d6'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 42;
      const leader = line([anchor, anchor], 0xd0dbc1, .65); (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 40;
      sprite.userData.kind = 'city-comparison-caption'; sprite.userData.text = text;
      item = { text, sprite, leader }; captions.set(key, item); group.add(sprite, leader);
    }
    const p = project(anchor), image = item.sprite.material.map?.image as { width?: number; height?: number } | undefined;
    const aspect = (image?.width ?? Math.max(240, text.length * 52 + 64)) / (image?.height ?? 96);
    const width = Math.min(mobile?viewport.x-24:195, aspect * (mobile?24:21)), height = width / aspect;
    const minX = viewport.x > 900 ? 346 + width / 2 : width / 2 + 9;
    const box=mobile?cityComparisonMobileCaptionBox(city,viewport.x,viewport.y,width,height):undefined;
    const x = box?.x??THREE.MathUtils.clamp(p.x + offset[0], minX, viewport.x - width / 2 - 12);
    const y = box?.y??THREE.MathUtils.clamp(p.y + offset[1], 110, Math.max(110, viewport.y - (viewport.x > 900 ? 230 : 128)));
    item.sprite.position.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, .5).unproject(runtime.camera);
    const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), depth=-item.sprite.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z,unit = depth / focal;
    item.sprite.scale.set(width * unit, height * unit, 1); item.sprite.visible = item.leader.visible = p.z > -1 && p.z < 1;
    item.sprite.userData.screenBox={x,y,width,height};item.sprite.userData.city=city;item.leader.userData={kind:'city-comparison-caption-leader',city,anchor:anchor.clone()};
    const vertices = item.leader.geometry.attributes.position as THREE.BufferAttribute;
    vertices.setXYZ(0, anchor.x, anchor.y, anchor.z); vertices.setXYZ(1, item.sprite.position.x, item.sprite.position.y, item.sprite.position.z); vertices.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
  };
  return {
    group,
    occupied(settings: Settings, size: THREE.Vector2): AtlasLabelBox[] {
      if (settings.layer !== 'atlas-city-comparison' || settings.step > 2) return [];
      viewport.copy(size);
      if(viewport.x<520){
        const rows=CITY_COMPARISON_IDS.map(city=>cityComparisonMobileCaptionBox(city,viewport.x,viewport.y,viewport.x-24));
        if(settings.step!==2||settings.cityLifeFocus!=='water')return rows;
        return [...rows,...CITY_COMPARISON_IDS.map(city=>{const ref=verifiedPlaceReferences[city],p=project(runtime.at(ref.longitude,ref.latitude,.1));return{x:p.x,y:p.y,width:74,height:74};})];
      }
      return CITY_COMPARISON_IDS.map(city => {
        const ref = verifiedPlaceReferences[city], p = project(runtime.at(ref.longitude, ref.latitude, .1));
        const water=settings.step===2&&settings.cityLifeFocus==='water';
        return { x: p.x, y: p.y + (water?15:43), width: water?120:viewport.x < 520 ? 125 : 180, height: water?120:25 };
      });
    },
    update(settings: Settings, size: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-city-comparison' && settings.step <= 2; if (!group.visible) return;
      group.userData.observation=settings.comparisonObservation!==false;group.userData.quietCaptions=settings.comparisonQuietCaptions===true;
      viewport.copy(size);captionSettings=settings; for (const caption of captions.values()) caption.sprite.visible = caption.leader.visible = false;
      for (const model of cities) {
        const state = cityComparisonState(settings, model.city), ref = verifiedPlaceReferences[model.city];
        if (!model.ready || model.relief !== state.relief) build(model, state.relief);
        if (!model.ready || !model.window) continue;
        model.root.userData.state = state;
        model.atmosphere.visible = state.stage === 0; model.terrain.visible = state.stage === 1; model.life.visible = state.stage === 2;
        const town = runtime.at(ref.longitude, ref.latitude, .1), actualMetres = runtime.metres(ref.longitude, ref.latitude)!;
        if (state.stage === 0) {
          const pose = airborne(model.city, state.travel, state.relief); if (!pose) continue;
          model.parcel.position.copy(pose.position); model.parcel.scale.setScalar(pose.expansion);
          model.parcel.userData.pose = pose;
          (model.path.material as THREE.LineBasicMaterial).opacity = state.started ? .7 : .22;
          model.path.geometry.setDrawRange(0, Math.max(2, Math.round((model.pathPoints.length - 1) * Math.max(.12, state.travel)) + 1));
          const before = airborne(model.city, Math.max(0, state.travel - .01), state.relief), after = airborne(model.city, Math.min(1, state.travel + .01), state.relief);
          model.arrow.position.copy(pose.position); if (before && after) model.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), after.position.clone().sub(before.position).normalize());
          const condensation = state.cloud * pose.liftResponse;
          model.cloud.position.copy(pose.position).add(new THREE.Vector3(0, .12, 0)); model.cloud.visible = condensation > .03;
          model.cloud.scale.setScalar(.35 + condensation * .8); model.cloud.userData.condensation = condensation;
          model.rain.visible = state.rain > .01 && condensation > .05;
          const count = model.rain.visible ? Math.ceil(state.rain * 24) : 0; model.rain.count = count;
          const landings: { longitude: number; latitude: number; metres: number; y: number }[] = [];
          for (let index = 0; index < count; index++) {
            const longitude = pose.longitude + Math.cos(index * 2.4) * .27, latitude = pose.latitude + Math.sin(index * 2.4) * .23;
            const ground = runtime.at(longitude, latitude, .045), metres = runtime.metres(longitude, latitude); if (metres === undefined) continue;
            const top = Math.max(ground.y + .2, model.cloud.position.y - .06), fall = (state.rain * 2.3 + index * .618) % 1;
            const centre = THREE.MathUtils.lerp(top, ground.y + .04, fall), length = Math.min(.18, (centre - ground.y) * 1.5);
            dummy.position.set(ground.x, centre, ground.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, Math.max(.025, length), 1); dummy.updateMatrix(); model.rain.setMatrixAt(index, dummy.matrix);
            landings.push({ longitude, latitude, metres, y: ground.y });
          }
          model.rain.instanceMatrix.needsUpdate = true; model.rain.userData.landings = landings;
          const text = !state.started ? '相同起始水汽' : !state.relief ? '压平对照' : pose.gainedMetres < 1 ? '沿地形经过'
            : condensation > .05 ? (state.rain > .01 ? '云雨机制示意' : '膨胀与凝结') : '抬升冷却条件';
          caption(`${model.city}-process`, text, town, [model.city === 'lhasa' ? -25 : model.city === 'nyingchi' ? 25 : 0, 44]);
        } else if (state.stage === 1) {
          const floor = runtime.baseline(ref.longitude, ref.latitude);
          writeLine(model.probe, [floor, town]); model.probe.userData.metres = actualMetres;
          const count = model.profile?.geometry.index?.count ?? 0;
          model.profile?.geometry.setDrawRange(0, Math.floor(count * Math.max(.02, state.progress) / 3) * 3);
          model.curtain?.geometry.setDrawRange(0, Math.floor((model.curtain.geometry.attributes.position.count) * Math.max(.02, state.progress) / 3) * 3);
          const sample = model.profilePoints[Math.min(model.profilePoints.length - 1, Math.floor(state.progress * (model.profilePoints.length - 1)))];
          model.profilePointer.position.copy(surface(sample, .12)); model.profilePointer.userData.sample = sample;
          caption(`${model.city}-height`, `定位点约 ${Math.round(actualMetres / 50) * 50} m`, town, [model.city === 'lhasa' ? -36 : model.city === 'nyingchi' ? 36 : 0, 42]);
        } else {
          model.mobility.visible=state.focus==='mobility';model.waterUse.visible=state.focus==='water';model.settlement.visible=state.focus==='settlement';
          const emphasis=state.started?.4+.6*state.progress:.2;
          if(model.corridor)model.corridor.material.opacity=emphasis;
          if(model.direct)(model.direct.material as THREE.LineDashedMaterial).opacity=.16+emphasis*.35;
          model.crossing.visible=state.relief&&state.started&&settings.comparisonObservation!==false;
          if(model.mobilityData){
            const points=model.mobilityData.points,position=state.progress*(points.length-1),a=Math.floor(position),b=Math.min(points.length-1,a+1);
            const first=points[a],second=points[b];model.traveller.position.copy(runtime.at(THREE.MathUtils.lerp(first.longitude,second.longitude,position-a),THREE.MathUtils.lerp(first.latitude,second.latitude,position-a),.15));
            model.traveller.visible=state.started&&settings.comparisonObservation!==false;model.traveller.userData={kind:'trial-route-progress-probe',sample:first};
          }
          if(model.lowland){model.lowland.geometry.setDrawRange(0,Infinity);model.lowland.material.opacity=state.relief?.16+emphasis*.36:.04;}
          if(model.spaceOutline)(model.spaceOutline.material as THREE.LineBasicMaterial).opacity=state.relief?.12+emphasis*.24:.1;
          for (let index = 0; index < model.runoff.length; index++) {
            const flow = model.runoff[index], t = phase(state.progress, 0, .8);
            flow.trace.visible = state.focus==='water'&&state.relief&&flow.points.length>1;
            flow.bead.visible=flow.trace.visible&&state.started;
            (flow.trace.material as THREE.LineBasicMaterial).opacity=.15+emphasis*.65;
            if(flow.tube){flow.tube.visible=flow.trace.visible;flow.tube.geometry.setDrawRange(0,Infinity);flow.tube.material.opacity=.14+emphasis*.7;}
            if (!flow.trace.visible) continue;
            flow.trace.geometry.setDrawRange(0,Infinity);
            const position = t * (flow.points.length - 1), a = Math.floor(position), b = Math.min(flow.points.length - 1, a + 1);
            const first = flow.points[a], second = flow.points[b];
            flow.bead.position.copy(runtime.at(THREE.MathUtils.lerp(first.longitude, second.longitude, position - a), THREE.MathUtils.lerp(first.latitude, second.latitude, position - a), .12));
          }
          const hasUse=model.city!=='nyingchi',operation=state.services?phase(state.progress,.12,.9):0;
          const currentIndex=settings.progress<.34?0:settings.progress<.68?1:2,currentCity=CITY_COMPARISON_IDS[currentIndex],attention=settings.comparisonObservation===false?.45:model.city===currentCity?1:state.started?.65:.35;
          const pixelWidth=viewport.x<520?(model.city===currentCity?68:50):(model.city===currentCity?100:82);
          const focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),unit=town.distanceTo(runtime.camera.position)/Math.max(1,focal);
          model.waterUse.position.copy(town);model.waterUse.rotation.set(0,Math.atan2(runtime.camera.position.x-town.x,runtime.camera.position.z-town.z),0);
          model.waterUse.scale.setScalar(unit*pixelWidth/1.8);model.waterUse.userData.pixelWidth=pixelWidth;model.waterUse.userData.terrainAnchor=town.clone();
          model.source.visible=hasUse;model.source.material.opacity=.45+attention*.3;
          model.servicePath.visible=hasUse&&state.services;model.serviceBead.visible=state.started&&(!hasUse||state.services);
          model.gate.visible=hasUse&&state.services;model.gate.material.opacity=.6+attention*.35;
          (model.servicePath.material as THREE.LineBasicMaterial).opacity=.35+attention*.4;
          const detail=model.waterDetail;
          if(detail){
            const transfer=hasUse?operation:state.progress;
            detail.flow.visible=!hasUse||state.services;detail.flow.material.opacity=.45+attention*.5;
            detail.flow.geometry.setDrawRange(0,Math.floor((detail.flow.geometry.index?.count??0)*Math.max(.015,transfer)/3)*3);
            detail.mechanism.visible=hasUse&&state.services;detail.receiver.visible=hasUse&&state.services;
            detail.wheel.rotation.z=operation*Math.PI*4;
            const received=state.services?phase(state.progress,.62,1):0;
            detail.fill.scale.y=Math.max(.015,received);detail.fill.position.y=-.12+.15*received;
            detail.fill.visible=received>0;detail.fill.userData.received=received;
            model.serviceBead.position.copy(detail.flow.geometry.parameters.path.getPointAt(transfer));
            model.serviceBead.scale.setScalar(.85+attention*.3);
            model.gate.userData.operation=operation;model.gate.userData.services=state.services;
            if(model.city==='ngari')model.gate.position.y=.22+phase(operation,0,.35)*.38;
            detail.root.userData.progress=transfer;detail.root.userData.services=state.services;
          }
          model.waterUse.userData.services=state.services;
          const text=state.focus==='mobility'?!state.relief?'压平对照 · 同端点试线':`试线高差约 ${Math.round((model.mobilityData?.heightRange??0)/50)*50} m`
            :state.focus==='settlement'?!state.relief?'压平对照 · 起伏差异消失':'相对低缓片区 · 非城市边界'
            :model.city==='nyingchi'?'地表下降 ≠ 可直接取用':model.city==='lhasa'?state.services?'地下取水原理 · 非实测井':'地下水源仍在 · 取用暂停':state.services?'闸控输水原理 · 非实测渠':'水源仍在 · 闸控暂停';
          caption(`${model.city}-life`, text, town, [model.city === 'lhasa' ? -25 : model.city === 'nyingchi' ? 25 : 0,state.focus==='water'?68:44]);
        }
      }
    },
    dispose() { captions.clear(); },
  };
}
