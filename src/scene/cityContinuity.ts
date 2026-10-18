import * as THREE from 'three';
import { cityContinuityReferences, cityContinuitySceneCues } from '../data/cityContinuity';
import { GOLD, TEAL, disposeTree, label, line } from './environment';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';
import type { TibetSceneProps } from './TibetScene';
import { buildCityAccessChange } from './cityAccessChange';
import { buildCityContinuityJourney } from './cityContinuityJourney';

export const CITY_CONTINUITY_IDS = ['nyingchi', 'lhasa', 'ngari'] as const;
export const CITY_CONTINUITY_STAGES = ['history', 'development', 'connections', 'travel'] as const;
type City = typeof CITY_CONTINUITY_IDS[number];
type Stage = typeof CITY_CONTINUITY_STAGES[number];
type Settings = Pick<TibetSceneProps, 'layer' | 'step' | 'progress'> & { cityLifeServices?: boolean; cityAccessTransfer?: boolean };
type Runtime = {
  camera: THREE.PerspectiveCamera;
  at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3;
  metres: (longitude: number, latitude: number) => number | undefined;
};
type Sample = { longitude: number; latitude: number; metres: number };
type ReferenceId = keyof typeof cityContinuityReferences;
const names: Record<City, string> = { nyingchi: '林芝', lhasa: '拉萨', ngari: '阿里' };
const colors: Record<City, number> = { nyingchi: TEAL, lhasa: GOLD, ngari: 0xb8c5e5 };
const mobileCueLabels:Record<Stage,Record<City,readonly[string,string,string]>>={
  history:{nyingchi:['2006·工布保护','2026·公共课堂','2006/2026·工布传习'],lhasa:['7世纪·大昭寺','1645—48·白宫','7—17世纪·历次建设'],ngari:['1042·阿底峡与托林','11—12世纪·交流','1042·托林交流']},
  development:{nyingchi:['2016·鲁朗服务','2021·拉林开通','2021·地方使用'],lhasa:['2006·铁路抵达','2021·区域联系','2025·保护访问'],ngari:['2010·航空入口','进入后·地面接续','2020·札达经营']},
  connections:{nyingchi:['区域铁路联系','色季拉越岭','通道接上服务'],lhasa:['更大铁路网络','地方使用','访问管理'],ngari:['狮泉河与托林','航空→地面接续','今昔分开阅读']},
  travel:{nyingchi:['山谷观察','鲁朗通行与服务','接驳待核验'],lhasa:['河谷与取水','建筑年代','分别核验访问'],ngari:['狮泉河管护','托林交流与经营','跨县接驳待核验']},
};
const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));

/** Voice, map, manual scrubbing and the before/after control use one clock.
 * A date layer is an archive period, never a building height or city extent. */
export function cityContinuityState(settings: Settings, city: City) {
  const index = CITY_CONTINUITY_IDS.indexOf(city), start = index === 0 ? 0 : index === 1 ? .34 : .68, end = index === 0 ? .34 : index === 1 ? .68 : 1;
  const progress = phase(clamp(settings.progress), start, end), beat = progress < .34 ? 0 : progress < .68 ? 1 : 2;
  const stage = CITY_CONTINUITY_STAGES[Math.max(0, Math.min(3, Math.round(settings.step) - 3))];
  return { city, stage, progress, beat, started: settings.progress >= start, active: settings.progress >= start && (index === 2 || settings.progress < end), services: settings.cityLifeServices !== false };
}

const routeIds: Record<Stage, Record<City, ReferenceId[]>> = {
  history: { nyingchi: ['nyingchi'], lhasa: ['lhasa'], ngari: ['tholing'] },
  development: { nyingchi: ['lhasa', 'shannan', 'nyingchi'], lhasa: ['lhasa', 'shannan', 'nyingchi'], ngari: ['lhasa', 'ngari', 'tholing'] },
  connections: { nyingchi: ['lhasa', 'shannan', 'nyingchi', 'lulang'], lhasa: ['lhasa', 'shannan', 'nyingchi'], ngari: ['lhasa', 'ngari', 'tholing'] },
  travel: { nyingchi: ['nyingchi', 'lulang'], lhasa: ['lhasa'], ngari: ['ngari', 'tholing'] },
};

/** These vertices are geographically interpolated directions / stop order.
 * They are deliberately not a road, railway alignment or historical itinerary. */
export function cityContinuityRoute(stage: Stage, city: City, read: Runtime['metres'], samplesPerLeg = 48): Sample[] {
  const refs = routeIds[stage][city].map(id => cityContinuityReferences[id]);
  if (refs.length === 1) {
    const ref = refs[0], metres = read(ref.lon, ref.lat);
    return metres === undefined ? [] : [{ longitude: ref.lon, latitude: ref.lat, metres }];
  }
  const result: Sample[] = [];
  for (let leg = 0; leg < refs.length - 1; leg++) for (let index = leg === 0 ? 0 : 1; index <= samplesPerLeg; index++) {
    const t = index / samplesPerLeg, longitude = THREE.MathUtils.lerp(refs[leg].lon, refs[leg + 1].lon, t), latitude = THREE.MathUtils.lerp(refs[leg].lat, refs[leg + 1].lat, t), metres = read(longitude, latitude);
    if (metres === undefined || !Number.isFinite(metres)) return [];
    result.push({ longitude, latitude, metres });
  }
  return result;
}

/** Three separate caption rows stay readable over a narrow regional map. */
export function cityContinuityCaptionBox(city: City, width: number, height: number, textWidth: number): AtlasLabelBox {
  const row = { ngari: 0, lhasa: 1, nyingchi: 2 }[city], w = Math.min(width - 24, textWidth);
  return { x: row === 0 ? 12 + w / 2 : row === 2 ? width - 12 - w / 2 : width / 2, y: Math.max(174, height - 108) - (2 - row) * 28, width: w, height: 24 };
}

type Mesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
type Caption = { text: string; sprite: THREE.Sprite; leader: THREE.Line };
type Model = {
  city: City; root: THREE.Group; history: THREE.Group; route: THREE.Group; engineered: THREE.Group;
  layers: Mesh[]; nodes: Mesh[]; epochs: THREE.Line; trace: THREE.Line; ribbon?: Mesh;
  periodLabels: THREE.Sprite[]; reference: Mesh;
  probe: Mesh; arrow: Mesh; arrival: Mesh; service: Mesh; profile?: THREE.Mesh; bridge?: THREE.Group; tunnel?: THREE.Group;
  samples: Sample[]; points: THREE.Vector3[]; naturalPoints: THREE.Vector3[]; path?: THREE.CurvePath<THREE.Vector3>;pathStops:number[];engineering?: Engineering; engineeringLabels:THREE.Sprite[];signature: string;
};
type EngineeringSpan={from:number;to:number;centre:number;start:THREE.Vector3;end:THREE.Vector3};
export type Engineering={points:THREE.Vector3[];bridge:EngineeringSpan&{deckY:number};tunnel:EngineeringSpan};

/** Keep the geography, but replace the crossing process. The chosen spans are
 * explanatory cuts on this actual DEM direction, never a surveyed alignment.
 * Bridge deck is level; the tunnel follows the chord through the sampled ridge. */
export function cityContinuityEngineering(natural:THREE.Vector3[]):Engineering|undefined{
  if(natural.length<64)return undefined;
  const n=natural.length,half=7;let valley=half,ridge=n-half-1,bestValley=-Infinity,bestRidge=-Infinity;
  for(let index=half+2;index<n-half-2;index++){
    if(Math.abs(index-48)<half+2)continue;
    const left=natural[index-half],right=natural[index+half],baseline=(left.y+right.y)/2,score=baseline-natural[index].y;
    if(score>bestValley){bestValley=score;valley=index;}
  }
  for(let index=half+2;index<n-half-2;index++){
    if(Math.abs(index-valley)<half*2+5)continue;
    if(Math.abs(index-48)<half+2)continue;
    const left=natural[index-half],right=natural[index+half],score=natural[index].y-(left.y+right.y)/2;
    if(score>bestRidge){bestRidge=score;ridge=index;}
  }
  const a=valley-half,b=valley+half,c=ridge-half,d=ridge+half;
  // The slight clearance exposes the structure at this regional scale. It is
  // a teaching exaggeration, not a claimed bridge clearance or approach grade.
  const deckY=Math.max(...natural.slice(a,b+1).map(point=>point.y))+.12;
  const start=natural[a].clone().setY(deckY),end=natural[b].clone().setY(deckY),tunnelStart=natural[c].clone(),tunnelEnd=natural[d].clone();
  const points=natural.map(point=>point.clone());
  for(let index=a;index<=b;index++)points[index].copy(start).lerp(end,(index-a)/(b-a));
  // Connecting slopes make one continuous path rather than a floating bridge.
  for(const index of [a-1,b+1]){
    const outer=natural[index+(index<a?-1:1)],inner=index<a?start:end;points[index].copy(outer).lerp(inner,.5);
  }
  for(let index=c;index<=d;index++)points[index].copy(tunnelStart).lerp(tunnelEnd,(index-c)/(d-c));
  return{points,bridge:{from:a,to:b,centre:valley,start,end,deckY},tunnel:{from:c,to:d,centre:ridge,start:tunnelStart,end:tunnelEnd}};
}
const flat = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
const tube = (points: THREE.Vector3[], color: number, radius: number) => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let index = 0; index < points.length - 1; index++) path.add(new THREE.LineCurve3(points[index], points[index + 1]));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(24, points.length * 2), radius, 5, false), flat(color, .9));
  mesh.renderOrder = 25; return mesh;
};
const writeLine = (object: THREE.Line, points: THREE.Vector3[]) => {
  const next=points.length>1?points:[new THREE.Vector3(),new THREE.Vector3()],attribute=object.geometry.attributes.position as THREE.BufferAttribute;
  if(attribute.count===next.length){next.forEach((point,index)=>attribute.setXYZ(index,point.x,point.y,point.z));attribute.needsUpdate=true;object.geometry.computeBoundingSphere();}
  else{object.geometry.dispose();object.geometry=new THREE.BufferGeometry().setFromPoints(next);}
  object.computeLineDistances();
};

/** All changes are overlays of the existing geographic DEM. There is no local
 * replacement model, camera jump, independent timer or fabricated city mesh. */
export function buildCityContinuity(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'city-history-to-travel-on-one-map'; group.userData.kind = 'city-continuity-overlay';
  const access = buildCityAccessChange(runtime), journey = buildCityContinuityJourney(runtime); group.add(access.group, journey.group);
  return {
    group,
    occupied(settings: Settings, size: THREE.Vector2): AtlasLabelBox[] {
      return settings.step === 4 ? access.occupied(settings, size) : journey.occupied(settings, size);
    },
    update(settings: Settings, size: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-city-comparison' && settings.step >= 3;
      access.update(settings, size); journey.update(settings, size);
    },
    dispose() { access.dispose(); journey.dispose(); disposeTree(group); },
  };
}