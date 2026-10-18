import {createPlaceActionReading} from './placeActionReading';
import {bridgeRouteRange,cityChangeMotion} from '../lib/overviewCityChange';
import {createGroundRouteReading} from './groundRouteReading';
import * as THREE from 'three';
import { label, line, GOLD, TEAL, disposeTree } from './environment';
import { resolveCityLocalGeography } from '../lib/cityLocalGeography';
import { cityContinuityPartState } from '../lib/cityContinuityState';
import { cityAccessState } from '../lib/cityAccessState';
import { cityAccessChanges } from '../data/cityAccessChange';
import { cityContinuityLessons, type CityContinuityLessonStage } from '../data/cityContinuityLessons';
import type { TibetSceneProps } from './TibetScene';
import { cityLocalUsageState, cityLocalUsageCaption } from './cityLocalContinuity';
import { regionalTerrainColour } from './regionalTerrainSurface';
import { routeSampleSegment, routeLegFraction } from './routeArcLength';
import {createBarkhorSpatialReading} from './barkhorSpatialReading';
import {createLhasaUrbanReading} from './lhasaUrbanReading';

export type LocalPlaceId = 'lulang' | 'lhasa' | 'shiquanhe';
export type LocalBBox = [number, number, number, number];
export type LocalCoordinate = [number, number];
export type LocalFeature = { type: 'Feature'; id: string; properties: { name?: string; featureClass: string; tags: Record<string, string>; [key: string]: unknown }; geometry: { type: string; coordinates: unknown } };
export type LocalCollection = { type: 'FeatureCollection'; metadata: { id: LocalPlaceId; bbox: LocalBBox; acquiredAt: string; attribution: string; [key: string]: unknown }; features: LocalFeature[] };
export type LocalDEM = { id: LocalPlaceId; bbox: LocalBBox; columns: number; rows: number; dataUrl: string; minimum: number; maximum: number; displaySamplingMetres: { eastWest: number; northSouth: number }; sourceUrl?: string; imageryUrl?:string; geometryUrl?:string };
type Runtime = { maxAnisotropy?:number; camera: THREE.PerspectiveCamera; project: (longitude: number, latitude: number, elevation: number) => THREE.Vector3; metresPerUnit: number;regionalMetres?:(longitude:number,latitude:number)=>number|undefined;regionalReady?:Promise<unknown>; focus: (position: THREE.Vector3, target: THREE.Vector3, framing?: 'viewport' | 'local-place' | 'recorded') => void };
export const LOCAL_MAP_VERTICAL_EXAGGERATION = 1.8;
export const LOCAL_PLACE_IDS: readonly LocalPlaceId[] = ['lulang', 'lhasa', 'shiquanhe'];
const names = { lulang: '鲁朗', lhasa: '拉萨', shiquanhe: '狮泉河' };
const clamp = THREE.MathUtils.clamp;
const inside = (p: LocalCoordinate, b: LocalBBox) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
const featureName = (f: LocalFeature) => f.properties.tags['name:zh'] || f.properties.name?.replace(/\s*བ.*$/, '') || f.properties.tags.ref || '';
type MapStage=CityContinuityLessonStage|'development';
const stageFor = (step: number): MapStage => step === 3 ? 'history' : step===4?'development':step === 5 ? 'connections' : 'travel';
const mapState=(p:Pick<TibetSceneProps,'step'|'progress'>)=>{if(p.step!==4)return cityContinuityPartState(p.progress);const s=cityAccessState(p.progress);return {...s,partProgress:s.phaseProgress};};

/** Clip only for display. The archived collection, original vertices and IDs are
 * retained untouched; intersections do not extend missing OSM ways. */
export function clipLocalLine(points: LocalCoordinate[], bbox: LocalBBox): LocalCoordinate[][] {
  const output: LocalCoordinate[][] = []; let current: LocalCoordinate[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dy = b[1] - a[1]; let lo = 0, hi = 1, keep = true;
    const p = [-dx, dx, -dy, dy], q = [a[0] - bbox[0], bbox[2] - a[0], a[1] - bbox[1], bbox[3] - a[1]];
    for (let k = 0; k < 4; k++) { if (Math.abs(p[k]) < 1e-15) { if (q[k] < 0) keep = false; } else { const t = q[k] / p[k]; if (p[k] < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t); } }
    if (!keep || lo > hi) { if (current.length > 1) output.push(current); current = []; continue; }
    const from: LocalCoordinate = [a[0] + dx * lo, a[1] + dy * lo], to: LocalCoordinate = [a[0] + dx * hi, a[1] + dy * hi];
    if (current.length && Math.hypot(current.at(-1)![0] - from[0], current.at(-1)![1] - from[1]) > 1e-9) { output.push(current); current = []; }
    if (!current.length) current.push(from); current.push(to);
  }
  if (current.length > 1) output.push(current); return output;
}
export function clipLocalRing(ring: LocalCoordinate[], b: LocalBBox): LocalCoordinate[] {
  let result = ring.slice(0, ring.length > 1 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? -1 : undefined);
  for (const [axis, bound, sign] of [[0, b[0], 1], [0, b[2], -1], [1, b[1], 1], [1, b[3], -1]]) {
    const source = result; result = []; if (!source.length) break;
    for (let i = 0; i < source.length; i++) { const a = source[i], c = source[(i + 1) % source.length], ai = (a[axis] - bound) * sign >= 0, ci = (c[axis] - bound) * sign >= 0; if (ai) result.push(a); if (ai !== ci) { const t = (bound - a[axis]) / (c[axis] - a[axis]); result.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]); } }
  }
  return result;
}
export function sampleLocalMetres(grid: ArrayLike<number>, meta: LocalDEM, lon: number, lat: number) {
  if (grid.length !== meta.columns * meta.rows || !inside([lon, lat], meta.bbox)) return undefined;
  const [w, s, e, n] = meta.bbox, x = clamp((lon - w) / (e - w) * (meta.columns - 1), 0, meta.columns - 1), y = clamp((n - lat) / (n - s) * (meta.rows - 1), 0, meta.rows - 1), ix = Math.min(meta.columns - 2, Math.floor(x)), iy = Math.min(meta.rows - 2, Math.floor(y)), fx = x - ix, fy = y - iy;
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(grid[iy * meta.columns + ix], grid[iy * meta.columns + ix + 1], fx), THREE.MathUtils.lerp(grid[(iy + 1) * meta.columns + ix], grid[(iy + 1) * meta.columns + ix + 1], fx), fy);
}
/** The original fine samples remain unmodified. Only the displayed LOD joins
 * the two archived surfaces at the edge, where their resolutions differ. No
 * source is extrapolated and every road/object uses this same display surface. */
export function localDisplayMetres(grid:ArrayLike<number>,meta:LocalDEM,lon:number,lat:number,regional?:(lon:number,lat:number)=>number|undefined){
  const fine=sampleLocalMetres(grid,meta,lon,lat),coarse=regional?.(lon,lat);
  if(fine===undefined)return coarse;
  if(coarse===undefined)return fine;
  const [w,s,e,n]=meta.bbox,longitudeScale=111320*Math.cos((s+n)*Math.PI/360),width=(e-w)*longitudeScale,depth=(n-s)*111320;
  const edge=Math.min((lon-w)*longitudeScale,(e-lon)*longitudeScale,(lat-s)*111320,(n-lat)*111320),blend=THREE.MathUtils.smoothstep(edge,0,Math.min(width,depth)*.12);
  return THREE.MathUtils.lerp(coarse,fine,blend);
}
export function localFeatureAnchor(feature: LocalFeature): LocalCoordinate {
  if (feature.geometry.type === 'Point') return feature.geometry.coordinates as LocalCoordinate;
  const coordinates = feature.geometry.coordinates as LocalCoordinate[] | LocalCoordinate[][] | LocalCoordinate[][][], points = (feature.geometry.type === 'LineString' ? coordinates : feature.geometry.type === 'Polygon' ? coordinates[0] : (coordinates[0] as LocalCoordinate[][])[0]) as LocalCoordinate[];
  const bounds = new THREE.Box2().setFromPoints(points.map(p => new THREE.Vector2(p[0], p[1]))), c = bounds.getCenter(new THREE.Vector2()); return [c.x, c.y];
}
export function localDisplayedAnchor(feature:LocalFeature,bbox:LocalBBox):LocalCoordinate|undefined{
  if(feature.geometry.type==='Point'){const p=feature.geometry.coordinates as LocalCoordinate;return inside(p,bbox)?p:undefined;}
  if(feature.geometry.type==='LineString'){const parts=clipLocalLine(feature.geometry.coordinates as LocalCoordinate[],bbox),centre=[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2];return parts.flat().sort((a,b)=>Math.hypot(a[0]-centre[0],a[1]-centre[1])-Math.hypot(b[0]-centre[0],b[1]-centre[1]))[0];}
  const point=localFeatureAnchor(feature);if(inside(point,bbox))return point;return ringsFor(feature,bbox)[0]?.[0]?.[0];
}
/** Existing OSM tags locate objects. Dates/uses come from separate primary
 * material; no White/Red Palace boundary is inferred from the outer footprint. */
export function localMapTargets(data: LocalCollection, stage: MapStage, index: number) {
  const features = data.features, find = (predicate: (f: LocalFeature) => boolean) => features.find(f => predicate(f) && localDisplayedAnchor(f,data.metadata.bbox));
  if (data.metadata.id === 'lulang') return [find(f => f.id === 'way/401959070'), find(f => f.id === 'way/26406905'), find(f => f.id === 'way/1322496961'), find(f => f.id === 'way/1322390955')].filter(Boolean) as LocalFeature[];
  if (data.metadata.id === 'lhasa') return (stage === 'history' || stage==='connections'&&index===2||stage === 'travel' && index >= 1 ? [find(f => f.id === 'relation/2358701'), find(f => f.id === 'way/31475419')] : [find(f => f.id === 'way/122707268'), find(f => f.id === 'way/122707217'), find(f => f.id === 'way/408117841')]).filter(Boolean) as LocalFeature[];
  return [find(f => f.id==='way/154210514'),find(f=>f.id==='way/154210585'),find(f=>f.id==='way/978103852')].filter(Boolean) as LocalFeature[];
}

type LocalRoute={coordinates:LocalCoordinate[];featureIds:string[];startGapMetres:number;endGapMetres:number;endpointScope:string;id?:string;sourceNodeIds?:number[];sourceWayIdsByEdge?:string[];gaps?:unknown[];endpointWithinTargetParcel?:boolean;legBreakIndex?:number;legIds?:string[]};
type ArchivedCorridor=LocalRoute&{id:string;cityId?:'nyingchi'|'lhasa'|'ngari';localityId?:LocalPlaceId;connected:boolean};
type Place = { id: LocalPlaceId; data: LocalCollection; dem: LocalDEM; grid: Int16Array; group: THREE.Group; toWorld: (p: LocalCoordinate, offset?: number) => THREE.Vector3; bounds: THREE.Box3; featureById: Map<string, LocalFeature>; highlights: THREE.Group; labels: THREE.Group; marker: THREE.Mesh; train:THREE.Group;car:THREE.Group;oldCar:THREE.Group; railPoints:THREE.Vector3[]; route?: THREE.Line; routePoints: THREE.Vector3[]; routeInfo?:LocalRoute;routeCache:Map<string,LocalRoute>;usage:THREE.Group;usageObjects:Map<string,THREE.Group>; lastKey: string };
function localVehicle(train=false){const group=new THREE.Group();group.userData.kind=train?'actual-map-visible-train':'actual-map-visible-local-vehicle';const material=new THREE.MeshStandardMaterial({color:train?0xc4d6d3:0xf0d299,roughness:.7});for(let i=0;i<(train?3:1);i++){const body=new THREE.Mesh(new THREE.BoxGeometry(train?.9:1.05,.42,.45),material);body.position.set(train?-i*1.05:0,.32,0);const window=new THREE.Mesh(new THREE.BoxGeometry(train?.65:.5,.15,.47),new THREE.MeshBasicMaterial({color:0x486c70}));window.position.copy(body.position).add(new THREE.Vector3(0,.08,0));group.add(body,window);for(const dx of [-.32,.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.5,8),new THREE.MeshBasicMaterial({color:0x263936}));wheel.rotation.x=Math.PI/2;wheel.position.set(body.position.x+dx,.12,0);group.add(wheel);}}return group;}
function pointAlong(points:THREE.Vector3[],progress:number){if(points.length<2)return {point:points[0]?.clone()??new THREE.Vector3(),direction:new THREE.Vector3(1,0,0)};const {index:i,fraction:f}=routeSampleSegment(points,progress);return {point:points[i-1].clone().lerp(points[i],f),direction:points[i].clone().sub(points[i-1]).normalize()};}
function appendTriangle(target: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) { for (const p of [a, b, c]) target.push(p.x, p.y, p.z); }
function geometry(positions: number[]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return g; }
function polygons(f: LocalFeature): LocalCoordinate[][][] { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates as LocalCoordinate[][]] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates as LocalCoordinate[][][] : []; }
function ringsFor(f: LocalFeature, bbox: LocalBBox) { return polygons(f).map(poly => poly.map(ring => clipLocalRing(ring, bbox)).filter(ring => ring.length >= 3)).filter(poly => poly.length); }
function polygonPositions(feature: LocalFeature, bbox: LocalBBox, toWorld: Place['toWorld'], heightMetres = 0, unit = 1) {
  const output: number[] = [];
  for (const poly of ringsFor(feature, bbox)) {
    const rings = poly.map(ring => ring.map(p => toWorld(p))), contour = rings[0].map(p => new THREE.Vector2(p.x, p.z)), holes = rings.slice(1).map(ring => ring.map(p => new THREE.Vector2(p.x, p.z))), flat = rings.flat(), roofY = toWorld(localFeatureAnchor(feature)).y + heightMetres * unit;
    const faces = THREE.ShapeUtils.triangulateShape(contour, holes);
    for (const face of faces) { const pts = face.map(i => flat[i].clone()); if (heightMetres) pts.forEach(p => p.y = roofY); appendTriangle(output, pts[0], pts[2], pts[1]); }
    if (heightMetres) for (const ring of rings) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], c = a.clone().setY(roofY), d = b.clone().setY(roofY); appendTriangle(output, a, b, c); appendTriangle(output, c, b, d); }
  }
  return output;
}
function ribbon(points: THREE.Vector3[], width: number, output: number[]) {
  for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], side = new THREE.Vector3(b.z - a.z, 0, a.x - b.x).normalize().multiplyScalar(width / 2); appendTriangle(output, a.clone().add(side), b.clone().add(side), a.clone().sub(side)); appendTriangle(output, a.clone().sub(side), b.clone().add(side), b.clone().sub(side)); }
}
function denseLine(points: LocalCoordinate[], toWorld: Place['toWorld'], offset: number) { const result: THREE.Vector3[] = []; for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], count = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * 96000, (b[1] - a[1]) * 111320) / 35)); for (let j = 0; j < count; j++) result.push(toWorld([THREE.MathUtils.lerp(a[0], b[0], j / count), THREE.MathUtils.lerp(a[1], b[1], j / count)], offset)); } result.push(toWorld(points.at(-1)!, offset)); return result; }

/** A route is assembled exclusively from shared OSM road nodes. No straight
 * connector is added across an unmapped courtyard or missing road. */
export function localRoadRoute(data: LocalCollection, from: LocalCoordinate, to: LocalCoordinate,kind:'road'|'railway'='road') {
  const nodes = new Map<string, { p: LocalCoordinate; edges: Map<string, number> }>(), key = (p: LocalCoordinate) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`, cos = Math.cos((data.metadata.bbox[1] + data.metadata.bbox[3]) / 2 * Math.PI / 180), distance = (a: LocalCoordinate, b: LocalCoordinate) => Math.hypot((a[0] - b[0]) * cos, a[1] - b[1]);
  for (const f of data.features) { if (f.geometry.type !== 'LineString' || f.properties.featureClass !== kind || f.properties.tags.access === 'private'||f.properties.tags.access==='no'||kind==='railway'&&f.properties.tags.railway!=='rail') continue; const points = f.geometry.coordinates as LocalCoordinate[],oneway=f.properties.tags.oneway; for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i]; if (!inside(a, data.metadata.bbox) || !inside(b, data.metadata.bbox)) continue; for (const p of [a, b]) if (!nodes.has(key(p))) nodes.set(key(p), { p, edges: new Map() });if(kind!=='road'||oneway!=='-1')nodes.get(key(a))!.edges.set(key(b), distance(a, b));if(kind!=='road'||!['yes','1','true'].includes(oneway))nodes.get(key(b))!.edges.set(key(a), distance(a, b)); } }
  const nearest = (p: LocalCoordinate) => [...nodes].reduce<[string, number]>((best, [id, n]) => { const d = distance(p, n.p); return d < best[1] ? [id, d] : best; }, ['', Infinity])[0], start = nearest(from), end = nearest(to); if (!start || !end) return [];
  const dist = new Map([[start, 0]]), previous = new Map<string, string>(), open = new Set([start]);
  while (open.size) { let current = '', minimum = Infinity; for (const id of open) if (dist.get(id)! < minimum) { current = id; minimum = dist.get(id)!; } open.delete(current); if (current === end) break; for (const [next, length] of nodes.get(current)!.edges) { const candidate = minimum + length; if (candidate < (dist.get(next) ?? Infinity)) { dist.set(next, candidate); previous.set(next, current); open.add(next); } } }
  if (!dist.has(end)) return []; const route = [end]; while (route[0] !== start) { const p = previous.get(route[0]); if (!p) return []; route.unshift(p); } return route.map(id => nodes.get(id)!.p);
}
export function localRoadRouteEvidence(data:LocalCollection,from:LocalCoordinate,to:LocalCoordinate,kind:'road'|'railway'='road'):LocalRoute{
  const coordinates=localRoadRoute(data,from,to,kind),key=(p:LocalCoordinate)=>p.map(v=>v.toFixed(7)).join(','),edge=(a:LocalCoordinate,b:LocalCoordinate)=>[key(a),key(b)].sort().join('|'),sources=new Map<string,string>();
  for(const f of data.features)if(f.geometry.type==='LineString'&&f.properties.featureClass===kind){const points=f.geometry.coordinates as LocalCoordinate[];for(let i=1;i<points.length;i++)sources.set(edge(points[i-1],points[i]),f.id);}
  const featureIds=[...new Set(coordinates.slice(1).map((p,i)=>sources.get(edge(coordinates[i],p))).filter(Boolean))] as string[],cos=Math.cos((data.metadata.bbox[1]+data.metadata.bbox[3])/2*Math.PI/180),distance=(a:LocalCoordinate,b:LocalCoordinate)=>Math.hypot((a[0]-b[0])*cos,a[1]-b[1])*111320;
  return {coordinates,featureIds,startGapMetres:coordinates.length?distance(from,coordinates[0]):Infinity,endGapMetres:coordinates.length?distance(to,coordinates.at(-1)!):Infinity,endpointScope:'只到原始相连OSM道路节点；与目标轮廓之间的缺段没有补线，不是已核验入口或导航'};
}
function ringContains(point:LocalCoordinate,ring:LocalCoordinate[]){let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
export function localBuildingsWithinFeature(data:LocalCollection,feature:LocalFeature){return data.features.filter(f=>f.properties.featureClass==='building'&&polygons(feature).some(poly=>ringContains(localFeatureAnchor(f),poly[0])&&!poly.slice(1).some(ring=>ringContains(localFeatureAnchor(f),ring))));}

export function buildCityLocalMap(runtime: Runtime,options:{enabled?:boolean;localityId?:LocalPlaceId;groundView?:boolean}={}) {
  const group = new THREE.Group(); group.name = 'real-local-place-geography'; group.userData.kind = 'real-local-place-geography'; group.visible = false;
  const sourceAbort = new AbortController();
  // A macro presentation can acquire one complete local example before its
  // camera approaches it. Default atlas callers still acquire all three.
  const scoped=options.localityId!==undefined,validScope=!scoped||LOCAL_PLACE_IDS.includes(options.localityId!),
    localityIds:readonly LocalPlaceId[]=scoped?(validScope?[options.localityId!]:[]):LOCAL_PLACE_IDS,
    loadSources=options.enabled!==false&&validScope,
    scopeCity=options.localityId==='lulang'?'nyingchi':options.localityId==='shiquanhe'?'ngari':options.localityId;
  const places = new Map<LocalPlaceId, Place>(),corridors=new Map<string,ArchivedCorridor>(), viewport = new THREE.Vector2(); let alive = true, current: Place | undefined, focusKey = '', reset: number | undefined, resetSuppressed = '', requested = '', resolution = '';
  const readJSON = async (url: string) => {
    const response = await fetch(url, { signal: sourceAbort.signal });
    // A resolved/cached response may arrive after disposal even when a custom
    // fetch ignores abort. Do not begin parsing a source that cannot be used.
    if (!alive) throw new Error('Local map disposed');
    if (!response.ok) throw new Error(`Unavailable ${url}`);
    return response.json();
  };
  const failures: string[] = [];
  const failureReasons=new Map<string,string>();
  const fail=(source:string,error:unknown)=>{if(alive){failures.push(source);failureReasons.set(source,error instanceof Error?error.message:String(error));}};
  const placesReady = !loadSources?Promise.resolve():readJSON(options.groundView?'/assets/terrain/lhasa-ground/manifest.json':'/assets/terrain/local-places/manifest.json').then(async (manifest: { places: LocalDEM[] }) => {
    if (!alive) return;
    await Promise.all(localityIds.map(async id => {
      try {
        const meta = manifest.places.find(p => p.id === id);
        if (!meta) throw new Error('Missing DEM metadata');
        if(!Number.isInteger(meta.columns)||!Number.isInteger(meta.rows)||meta.columns<2||meta.rows<2||!meta.dataUrl)throw new Error('Invalid local DEM metadata');
        const [data, response] = await Promise.all([
          readJSON(meta.geometryUrl??`/data/local-places/${id}.geojson`),
          fetch(meta.dataUrl, { signal: sourceAbort.signal }),
        ]);
        if (!alive) return;
        if(data.type!=='FeatureCollection'||data.metadata?.id!==id||!Array.isArray(data.features)||!data.features.length)throw new Error('Missing or mismatched local OSM collection');
        if (!response.ok) throw new Error('Missing DEM');
        const bytes = await response.arrayBuffer();
        if (!alive) return;
        if (bytes.byteLength !== meta.columns * meta.rows * 2) throw new Error('Bad local DEM size');
        const view = new DataView(bytes), grid = Int16Array.from({ length: meta.columns * meta.rows }, (_, i) => view.getInt16(i * 2, true));
        await runtime.regionalReady;
        if (!alive) return;
        let texture:THREE.Texture|undefined;
        if(options.groundView){
          if(!meta.imageryUrl)throw new Error('真实影像元数据缺失');
          // Readiness includes the actual texture, so narration cannot enter a
          // temporarily bare model. TextureLoader uses north-up image/UV pairs.
          texture=await new THREE.TextureLoader().loadAsync(meta.imageryUrl);
          texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(16,runtime.maxAnisotropy??4);
          if(!alive){texture.dispose();return;}
        }
        places.set(id, buildPlace(data as LocalCollection, meta, grid, texture));
      } catch(error) { fail(id,error); }
    }));
  }).catch(error => { fail('manifest',error); });
  const corridorsReady=!loadSources||options.groundView?Promise.resolve():readJSON('/data/local-places/transport-corridors.manifest.json').then((manifest:{routes:ArchivedCorridor[]})=>{
    if(!alive)return;
    for(const route of manifest.routes){
      if(scoped&&(route.localityId?route.localityId!==options.localityId:route.cityId!==scopeCity))continue;
      if(route.connected&&route.coordinates.length>1&&route.sourceNodeIds?.length===route.coordinates.length&&route.sourceWayIdsByEdge?.length===route.coordinates.length-1)corridors.set(route.id,route);
    }
    if(scoped&&!corridors.size)throw new Error(`Missing connected source corridors for ${options.localityId}`);
  }).catch(error=>{fail('transport-corridors',error);});
  const urbanReady=loadSources&&!options.groundView&&options.localityId==='lhasa'?Promise.all([placesReady,readJSON('/data/lhasa-evolution/manifest.json')]).then(async([,manifest])=>{
    const response=await fetch(manifest.window.dataUrl,{signal:sourceAbort.signal});if(!response.ok)throw new Error('拉萨空间变化原始像元不可用');
    const bytes=await response.arrayBuffer();if(!alive)return;const place=places.get('lhasa');if(!place)throw new Error('拉萨地形未就绪');
    const b=manifest.window.bounds,d=place.dem.bbox;if(b.west<d[0]||b.south<d[1]||b.east>d[2]||b.north>d[3])throw new Error('拉萨变化像元超出真实局部高程');
    const reading=createLhasaUrbanReading(manifest.window,bytes,place.toWorld);place.group.add(reading.group);place.group.userData.urban=reading;
  }).catch(error=>fail('lhasa-evolution',error)):Promise.resolve();
  const ready=Promise.all([placesReady,corridorsReady,urbanReady]).then(()=>{
    if(!alive||options.enabled===false||!scoped)return;
    if(!validScope)throw new Error(`未知的局部地理资料范围：${String(options.localityId)}`);
    // Explicitly scoped examples are required by their overview narration.
    // A missing acquired surface must not count as ready and start the clip.
    if(failures.length||!places.has(options.localityId!)){
      group.userData.failures=[...failures];
      const details=failures.map(id=>`${id}: ${failureReasons.get(id)}`).join('；');
      throw new Error(`${names[options.localityId!]}真实局部地理资料未就绪（${options.localityId}）：${details||'地方几何未建立'}`);
    }
  });
  function buildPlace(data: LocalCollection, dem: LocalDEM, grid: Int16Array, texture?:THREE.Texture): Place {
    const id = dem.id, bbox = data.metadata.bbox; if (JSON.stringify(bbox) !== JSON.stringify(dem.bbox)) throw new Error('Local source bounds disagree');
    const root = new THREE.Group(); root.userData = { kind: 'actual-local-geography', localityId: id, bbox, acquiredAt: data.metadata.acquiredAt, attribution: data.metadata.attribution, geometryScope: '现状OSM几何；历史事件单独释读', heightScope: '未标高度的建筑统一12米显示符号，不是实测高度', verticalExaggeration: LOCAL_MAP_VERTICAL_EXAGGERATION, displayLOD:'窗口边缘12%内与真实区域格网衔接；原始高程未改写',sourceData: data, dem }; root.visible = false; group.add(root);
    const centre: LocalCoordinate = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], cos = Math.cos(centre[1] * Math.PI / 180), m = 1 / runtime.metresPerUnit;
    // Regional terrain, fine terrain, roads and corridor camera MUST share the
    // exact same longitude/latitude transform, including its reference latitude.
    const displayMetres=(p:LocalCoordinate)=>(options.groundView?sampleLocalMetres(grid,dem,p[0],p[1]):localDisplayMetres(grid,dem,p[0],p[1],runtime.regionalMetres))??dem.minimum;
    const toWorld = (p: LocalCoordinate, offset = 1.1) => runtime.project(p[0],p[1],(displayMetres(p)*LOCAL_MAP_VERTICAL_EXAGGERATION+offset)*m);
    const terrain = new THREE.PlaneGeometry((bbox[2] - bbox[0]) * 111320 * cos * m, (bbox[3] - bbox[1]) * 111320 * m, dem.columns - 1, dem.rows - 1); terrain.rotateX(-Math.PI / 2); const attr = terrain.attributes.position as THREE.BufferAttribute, colours = new Float32Array(attr.count * 3),terrainColourScratch=new THREE.Color();
    for (let row = 0; row < dem.rows; row++) for (let col = 0; col < dem.columns; col++) { const i = row * dem.columns + col, p: LocalCoordinate = [THREE.MathUtils.lerp(bbox[0], bbox[2], col / (dem.columns - 1)), THREE.MathUtils.lerp(bbox[3], bbox[1], row / (dem.rows - 1))], w = toWorld(p, 0); attr.setXYZ(i, w.x, w.y, w.z); regionalTerrainColour(displayMetres(p),terrainColourScratch).toArray(colours,i*3); }
    terrain.setAttribute('color', new THREE.BufferAttribute(colours, 3)); terrain.computeVertexNormals(); terrain.computeBoundingSphere();
    // Satellite TCI already contains dated illumination; do not relight it with
    // the lesson's symbolic sun or multiply its colours by the altitude palette.
    const ground = new THREE.Mesh(terrain, texture?new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}):new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })); ground.userData = { kind: 'actual-local-dem', localityId: id, sourceUrl: dem.sourceUrl, imageryUrl:dem.imageryUrl,verticalExaggeration: LOCAL_MAP_VERTICAL_EXAGGERATION, sampleMetres: grid }; ground.receiveShadow = false; root.add(ground);
    // Join the two sourced LOD boundaries with a display skirt. Fine interior
    // samples stay untouched; this hides a mesh gap, not a measured cliff.
    if(options.groundView&&runtime.regionalMetres){
      const border:LocalCoordinate[]=[];
      for(let i=0;i<dem.columns;i++)border.push([THREE.MathUtils.lerp(bbox[0],bbox[2],i/(dem.columns-1)),bbox[3]]);
      for(let i=1;i<dem.rows;i++)border.push([bbox[2],THREE.MathUtils.lerp(bbox[3],bbox[1],i/(dem.rows-1))]);
      for(let i=dem.columns-2;i>=0;i--)border.push([THREE.MathUtils.lerp(bbox[0],bbox[2],i/(dem.columns-1)),bbox[1]]);
      for(let i=dem.rows-2;i>=0;i--)border.push([bbox[0],THREE.MathUtils.lerp(bbox[3],bbox[1],i/(dem.rows-1))]);
      const positions:number[]=[];
      for(let i=1;i<border.length;i++){
        const a=toWorld(border[i-1],0),b=toWorld(border[i],0);
        const c=runtime.project(...border[i-1],(runtime.regionalMetres(...border[i-1])??displayMetres(border[i-1]))*LOCAL_MAP_VERTICAL_EXAGGERATION*m);
        const d=runtime.project(...border[i],(runtime.regionalMetres(...border[i])??displayMetres(border[i]))*LOCAL_MAP_VERTICAL_EXAGGERATION*m);
        appendTriangle(positions,a,c,b);appendTriangle(positions,b,c,d);
      }
      const skirt=new THREE.Mesh(geometry(positions),new THREE.MeshStandardMaterial({color:regionalTerrainColour(dem.minimum,new THREE.Color()),roughness:1,side:THREE.DoubleSide}));
      skirt.userData.kind='fine-regional-lod-edge-skirt-not-measured-cliff';root.add(skirt);
    }
    const batches = new Map<string, number[]>(), palette: Record<string, number> = { building: 0xe0d8bd, landmark: 0xd9b57a, road: 0xe7d8ac, highway: 0xf3e9ca, bridge: 0xffd380, liuwuBridge: 0xffd380, railway: 0x6b5a4c, water: 0x4d9faa, green: 0x6c8860, landuse: 0xb5a68a }, push = (key: string, points: number[]) => { if (!batches.has(key)) batches.set(key, []); const batch=batches.get(key)!;for(const value of points)batch.push(value); };
    for (const feature of data.features) {
      if(options.groundView)continue; // Keep the acquired surface visible; route/labels are separate readings.
      const kind = feature.properties.featureClass, tags = feature.properties.tags;
      if (kind === 'building') { const declared = Number.parseFloat(tags.height || ''), symbolic = Number.isFinite(declared) && declared > 0 ? Math.min(150, declared) : 12; push(tags.historic || tags.building === 'palace' || tags.building === 'temple' ? 'landmark' : 'building', polygonPositions(feature, bbox, toWorld, symbolic, m)); }
      else if (['water', 'leisure', 'landuse', 'natural'].includes(kind)) push(kind === 'water' ? 'water' : kind === 'leisure' || tags.landuse === 'forest' || tags.natural === 'wood' ? 'green' : 'landuse', polygonPositions(feature, bbox, p => toWorld(p, kind === 'water' ? 2 : .5)));
      else if (feature.geometry.type === 'Polygon' && kind === 'road') push('road', polygonPositions(feature, bbox, p => toWorld(p, 2.2)));
      if (feature.geometry.type === 'LineString' && ['road', 'railway', 'waterway'].includes(kind)) { const bridge = tags.bridge === 'yes', wide = ['trunk', 'primary', 'secondary'].includes(tags.highway), key = kind === 'waterway' ? 'water' : kind === 'railway' ? 'railway' : bridge ? ['way/122707217','way/394728357'].includes(feature.id)?'liuwuBridge':'bridge' : wide ? 'highway' : 'road', width = kind === 'waterway' ? tags.waterway === 'river' ? 24 : 8 : kind === 'railway' ? 7 : wide ? 22 : ['footway', 'path', 'steps'].includes(tags.highway) ? 5 : 11; for (const part of clipLocalLine(feature.geometry.coordinates as LocalCoordinate[], bbox)) { const output: number[] = []; ribbon(denseLine(part, toWorld, bridge ? 7 : kind === 'waterway' ? 2 : 2.7), width * m, output); push(key, output); } }
    }
    for (const [key, positions] of batches) if (positions.length) { const mesh = new THREE.Mesh(geometry(positions), new THREE.MeshStandardMaterial({ color: palette[key], roughness: .92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); mesh.userData = { kind: 'actual-osm-geometry-batch', localityId: id, featureClass: key, displayWidthScope: '道路河流线宽为可读符号；原始中心线与面积轮廓保持', featureIds: key==='liuwuBridge'?['way/122707217','way/394728357']:data.features.filter(f => f.properties.featureClass === (key === 'highway' || key === 'bridge' ? 'road' : key)).map(f => f.id) }; root.add(mesh); }
    const highlights = new THREE.Group(), labels = new THREE.Group(),usage=new THREE.Group(), marker = new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: GOLD })),train=localVehicle(true),car=localVehicle(),oldCar=localVehicle();oldCar.userData.kind='actual-map-existing-ground-vehicle'; marker.userData.kind = 'actual-map-use-traveller'; usage.userData={kind:'actual-local-same-use-objects',localityId:id,scope:'当前真实要素的用途释读层，非历史新建几何'};root.add(highlights, labels,usage, marker,train,car,oldCar); const bounds = new THREE.Box3().setFromBufferAttribute(attr); const result: Place = { id, data, dem, grid, group: root, toWorld, bounds, featureById: new Map(data.features.map(f => [f.id, f])), highlights, labels, marker,train,car,oldCar,railPoints:[], routePoints: [],routeCache:new Map(),usage,usageObjects:new Map(), lastKey: '' };if(id==='lhasa'){const station=result.featureById.get('way/122707268');if(station)result.railPoints=localRoadRoute(data,[bbox[0]+.001,29.6202],localFeatureAnchor(station),'railway').map(p=>toWorld(p,12));}return result;
  }
  function clear(root: THREE.Group) { disposeTree(root); root.clear(); }
  function route(place:Place,id:string,from:LocalCoordinate,to:LocalCoordinate){let result=place.routeCache.get(id);if(!result){result=localRoadRouteEvidence(place.data,from,to);place.routeCache.set(id,result);}place.routeInfo=result;place.routePoints=result.coordinates.map(p=>place.toWorld(p,14));return result;}
  function archivedRoute(place:Place,id:string,regional=false){const source=corridors.get(id),city=place.id==='lulang'?'nyingchi':place.id==='shiquanhe'?'ngari':'lhasa';if(!source||(source.localityId?source.localityId!==place.id:!regional||source.cityId!==city)||!source.coordinates.every(p=>inside(p,place.data.metadata.bbox)||regional&&Number.isFinite(runtime.regionalMetres?.(p[0],p[1]))))return false;place.routeInfo=source;place.routePoints=source.coordinates.map(p=>place.toWorld(p,14));return true;}
  function linkedNyingchiRoute(place:Place){const a=corridors.get('mainling-airport-nyingchi-s4'),b=corridors.get('nyingchi-lulang-g318');if(!a||!b||a.sourceNodeIds?.at(-1)!==b.sourceNodeIds?.[0]||JSON.stringify(a.coordinates.at(-1))!==JSON.stringify(b.coordinates[0]))return false;const coordinates=[...a.coordinates,...b.coordinates.slice(1)];if(!coordinates.every(p=>inside(p,place.data.metadata.bbox)||Number.isFinite(runtime.regionalMetres?.(p[0],p[1]))))return false;place.routeInfo={id:'mainling-s4-to-lulang-g318',coordinates,featureIds:[...new Set([...a.featureIds,...b.featureIds])],sourceNodeIds:[...a.sourceNodeIds!,...b.sourceNodeIds!.slice(1)],sourceWayIdsByEdge:[...a.sourceWayIdsByEdge!,...b.sourceWayIdsByEdge!],startGapMetres:0,endGapMetres:0,endpointScope:`${a.endpointScope} ${b.endpointScope}`,gaps:[...(a.gaps??[]),...(b.gaps??[])],legBreakIndex:a.coordinates.length-1,legIds:[a.id,b.id],endpointWithinTargetParcel:b.endpointWithinTargetParcel};place.routePoints=coordinates.map(p=>place.toWorld(p,14));return true;}
  function usageObject(place:Place,feature:LocalFeature){
    let object=place.usageObjects.get(feature.id);if(object)return object;object=new THREE.Group();const members=feature.properties.featureClass==='landuse'?localBuildingsWithinFeature(place.data,feature):[],features=members.length?members:[feature],positions:number[]=[];
    for(const f of features){const body=polygonPositions(f,place.data.metadata.bbox,p=>place.toWorld(p,2.5),f.properties.featureClass==='building'?12:0,1/runtime.metresPerUnit);for(const v of body)positions.push(v);}
    if(positions.length){const g=geometry(positions),b=new THREE.Box3().setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute),uniforms={useReading:{value:0},useMinimum:{value:b.min.x},useMaximum:{value:b.max.x}},material=new THREE.MeshBasicMaterial({color:place.id==='shiquanhe'?0x8cbfa2:0xf0c56c,transparent:true,opacity:.74,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
      material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=`varying float sourceUseX;\n${shader.vertexShader}`;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','sourceUseX=(modelMatrix*vec4(transformed,1.0)).x;\n#include <project_vertex>');shader.fragmentShader=`varying float sourceUseX;\nuniform float useReading;\nuniform float useMinimum;\nuniform float useMaximum;\n${shader.fragmentShader}`;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float positionInSource=(sourceUseX-useMinimum)/max(0.0000001,useMaximum-useMinimum);
        float readAmount=1.0-smoothstep(useReading-0.035,useReading+0.035,positionInSource);
        diffuseColor.a*=readAmount;`);};material.customProgramCacheKey=()=> 'actual-local-use-reading-v1';const mesh=new THREE.Mesh(g,material);mesh.userData={kind:'same-real-footprint-use-reading',featureId:feature.id,sourceFeatureIds:features.map(f=>f.id),uniforms,scope:'光带依已有轮廓阅读用途；不动画创建现状建筑，也不定义历史边界'};object.add(mesh);
    }else if(feature.geometry.type==='LineString'){
      const coords=clipLocalLine(feature.geometry.coordinates as LocalCoordinate[],place.data.metadata.bbox)[0];if(coords){const points=denseLine(coords,place.toWorld,7),stroke=line(points,GOLD,.9);stroke.userData={kind:'same-real-river-use-reading',featureId:feature.id,sourcePoints:points,scope:'读取同一现状河流，非2017工程边界、水流速度或水位'};object.add(stroke);}
    }
    object.userData={kind:'same-real-local-use-object',localityId:place.id,featureId:feature.id,sourceFeatureIds:[feature.id,...members.map(f=>f.id)],geometryClass:feature.properties.featureClass,acquiredAt:place.data.metadata.acquiredAt,scope:members.length?'按现状商业用地图形筛选中心点在其内的建筑，不证明业权或2016建造年份':'现状要素的用途读取，非历史建成轮廓'};place.usage.add(object);place.usageObjects.set(feature.id,object);return object;
  }
  function setHighlights(place: Place, p: TibetSceneProps) {
    const state = mapState(p), stage = stageFor(p.step), usage=cityLocalUsageState(p,place.id),feature = p.cityLocalFeatureId ? place.featureById.get(p.cityLocalFeatureId) : undefined, targets = localMapTargets(place.data, stage, state.index),focusPhase=Math.min(2,Math.floor(state.partProgress*3)), key = `${stage}:${state.index}:${feature?.id ?? ''}:${focusPhase}:${usage.beat}:${usage.corridorLeg}:${Boolean(runtime.regionalMetres?.(place.dem.bbox[0],place.dem.bbox[1]))}`;
    const readingKey=`${key}:${p.overviewBarkhor?.phase??''}:${p.overviewUrban?.phase??''}:${p.overviewVisit?.phase??''}:${p.overviewCityChange?.phase??''}`;
    if (place.lastKey === readingKey) return; place.lastKey = readingKey; clear(place.highlights); clear(place.labels); place.routePoints = []; place.route = undefined;
    const natureIndex=place.id==='lulang'?[1,0,2][focusPhase]:place.id==='lhasa'?[2,1,0][focusPhase]:focusPhase;
    const primary = feature ?? (stage==='travel'&&state.index===0?targets[natureIndex]:place.id === 'lhasa' && stage === 'history' ? targets[state.index ? 1 : 0] : place.id === 'lulang' && (stage === 'history' || state.index === 1) ? targets[focusPhase===0?0:2] :place.id==='shiquanhe'&&stage==='history'?targets[0]: targets[0]);
    const contextual=place.id==='lhasa'&&(stage==='history'||stage==='travel'&&state.index===1)?[]:targets;
    const barkhorFocus=p.overviewBarkhor?(place.featureById.get(p.overviewBarkhor.phase==='uses'?'way/880932156':'way/177796787')):undefined;
    const urbanIds=p.overviewUrban?.phase==='plaza'?['way/61818449','way/31475419','relation/2358701']:p.overviewUrban?.phase==='barkhor'?(p.overviewPlaceAction?['relation/2358701','way/177796787']:['relation/2358701','way/880932156','way/31475419']):p.overviewUrban?.phase==='return'?['way/31475419','relation/2358701','way/122707268']:['way/31475419','relation/2358701'];
    const visitIds=p.overviewVisit&&['street','shared'].includes(p.overviewVisit.phase)?['relation/2358701','way/177796787','way/31475419']:p.overviewCityChange?['way/122707268','way/122707217','way/408117841','relation/2358701']:['way/122707268','way/122707217','relation/2358701'];
    const displayed = p.overviewVisit?visitIds.flatMap(id=>place.featureById.get(id)??[]):p.overviewUrban?urbanIds.flatMap(id=>place.featureById.get(id)??[]):[...new Map([...(barkhorFocus?[barkhorFocus]:[]),primary, ...contextual].filter(Boolean).map(f => [f!.id, f!])).values()].slice(0,stage==='travel'&&state.index===0?1:2);
    for (const f of displayed) {
      const positions = polygonPositions(f, place.data.metadata.bbox, q => place.toWorld(q, 18)); let item: THREE.Object3D;
      if (positions.length) item = new THREE.Mesh(geometry(positions), new THREE.MeshBasicMaterial({ color: f === primary ? GOLD : TEAL, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
      else if (f.geometry.type === 'LineString') { const parts = clipLocalLine(f.geometry.coordinates as LocalCoordinate[], place.data.metadata.bbox), points = parts[0] ? denseLine(parts[0], place.toWorld, 10) : []; item = line(points.length > 1 ? points : [place.toWorld(localFeatureAnchor(f)), place.toWorld(localFeatureAnchor(f))], f === primary ? GOLD : TEAL, .95); }
      else { item = new THREE.Mesh(new THREE.CylinderGeometry(20 / runtime.metresPerUnit, 20 / runtime.metresPerUnit, 5 / runtime.metresPerUnit, 20), new THREE.MeshBasicMaterial({ color: GOLD })); item.position.copy(place.toWorld(localFeatureAnchor(f), 20)); }
      // The street reading already has ground-level plaza and actual building
      // surfaces. A raised polygon wash would cover their roofs and flatten it.
      if(p.overviewBarkhor||p.overviewUrban||p.overviewVisit)item.visible=false;
      if(!p.overviewPlaceAction&&p.overviewUrban&&['plaza','barkhor'].includes(p.overviewUrban.phase)&&f.id===(p.overviewUrban.phase==='plaza'?'way/61818449':'way/177796787')){item.visible=true;}
      item.userData = { kind: 'actual-local-feature-focus', featureId: f.id, localityId: place.id, sourceTags: f.properties.tags, anchor: localFeatureAnchor(f), selected: f === feature, scope: '现状要素高亮，不定义历史工程边界' }; place.highlights.add(item);
      const text = featureName(f); if (!text) continue;let short=f.id==='way/31475419'&&stage==='history'?`布达拉宫 · ${state.index===1?'白宫':'红宫'}用途`:f.properties.tags.ref==='G318'?'G318 · 沪聂线':text.replace(/^林芝/,'').replace('鲁朗恒大艺术馆艺术馆','鲁朗恒大艺术馆').slice(0,15);const sourceAnchor=localDisplayedAnchor(f,place.data.metadata.bbox)??localFeatureAnchor(f),metres=sampleLocalMetres(place.grid,place.dem,sourceAnchor[0],sourceAnchor[1]);if(stage==='travel'&&state.index===0&&metres!==undefined)short+=` · ${Math.round(metres)}m`;
      if(p.overviewVisit){short=f.id==='way/122707268'?'拉萨站 · 区域抵达':f.id==='way/122707217'?(p.overviewCityChange?'柳梧大桥 · 2007年新连接':'柳梧大桥 · 跨河接城'):f.id==='way/408117841'?'拉萨河 · 站区与城区之间':f.id==='relation/2358701'?'大昭寺 · 历史与当下使用':f.id==='way/177796787'?'广场 · 朝圣与参访':'布达拉宫 · 同城历史参照';}
      else if(p.overviewPlaceAction){short=f.id==='relation/2358701'?'大昭寺 · 木构与供灯示意':f.id==='way/177796787'?'寺前独立供灯 · 位置示意':f.id==='way/61818449'?'现状广场 · 休憩活动示意':'布达拉宫 · 同城参照';}
      else if(p.overviewUrban){short=f.id==='way/31475419'?'布达拉宫 · 位置参照':f.id==='relation/2358701'?'大昭寺 · 老城位置':f.id==='way/61818449'?'广场 · 现状开放空间':f.id==='way/880932156'?'八廓街 · 生活与保护':'拉萨站 · 现状位置参照';}
      else if(p.overviewBarkhor){short=f.id==='way/177796787'?(p.overviewBarkhor.phase==='protection'?'广场 · 祈祷通行与参访':'大昭寺广场 · 开放空间'):f.id==='way/880932156'?'八廓街 · 现状商业用地':'大昭寺 · 7世纪创建';}
      else if(usage.useReading&&usage.beat!=='approach'&&f===primary&&!feature){if(place.id==='lulang'&&f.id==='way/1322496961')short=usage.beat==='arrival'?'服务用地 · 已知路端停靠':'服务用地 · 住宿与商业';else if(place.id==='lhasa')short=f.id==='way/31475419'?`${stage==='history'&&state.index===1?'白宫':stage==='history'&&state.index===2?'红宫':'历史'}用途 · 布宫整体轮廓`:'宗教用途 · 大昭寺轮廓';else if(place.id==='shiquanhe')short='两岸生活 · 现状河段';}
      const leader=line([place.toWorld(sourceAnchor,18),place.toWorld(sourceAnchor,18)],f===primary?GOLD:TEAL,.75);const sprite = label(short, f === primary ? '#ffe1a5' : '#e1eee0'); sprite.onBeforeRender = () => {}; sprite.userData = { kind: 'actual-local-feature-label', featureId: f.id, localityId: place.id, text,displayText:short, anchor:sourceAnchor,labelLeader:leader,primary:f===primary,sourceMetres:metres }; sprite.position.copy(place.toWorld(sourceAnchor,40)); sprite.renderOrder = 50; place.labels.add(sprite,leader);
    }
    if (place.id === 'lulang') {if(!(stage==='connections'&&state.index===2&&(linkedNyingchiRoute(place)||archivedRoute(place,'nyingchi-lulang-g318',true)))&&!archivedRoute(place,'lulang-g318-hotel-approach')){const road = place.featureById.get('way/401959070'), hotel = place.featureById.get('way/1322496961'); if (road && hotel) route(place,'lulang-g318-service-road-end',localFeatureAnchor(road),localFeatureAnchor(hotel));}}
    else if (place.id === 'lhasa') { const station = place.featureById.get('way/122707268'), bridge = place.featureById.get('way/122707217'); if (station && bridge) {const north=(bridge.geometry.coordinates as LocalCoordinate[]).reduce((a,b)=>a[1]>b[1]?a:b);if(usage.useReading&&primary){if(archivedRoute(place,primary.id==='way/31475419'?'lhasa-station-liuwu-north-bank':'lhasa-station-liuwu-jokhang-approach')){if(stage==='history'||stage==='travel'){place.routePoints=place.routePoints.slice(-8);}}else route(place,`lhasa-north-bank-${primary.id}`,north,localFeatureAnchor(primary));}else if(!archivedRoute(place,'lhasa-station-liuwu-north-bank'))route(place,'lhasa-station-liuwu-north-bank',localFeatureAnchor(station),north);} }
    else if (place.id === 'shiquanhe') {if(archivedRoute(place,'shiquanhe-riverside-streets'))place.group.userData.walkway={featureIds:place.routeInfo!.featureIds,riverFeatureId:'way/154210514',scope:'真实相连滨河北路；不是连续专用步道，也不等于2017工程边界'};else{const path = place.featureById.get('way/978103684'); if (path) {const part=clipLocalLine(path.geometry.coordinates as LocalCoordinate[], place.data.metadata.bbox)[0];if(part?.length>1){place.routePoints = denseLine(part, place.toWorld, 12);place.routeInfo={coordinates:part,featureIds:[path.id],startGapMetres:0,endGapMetres:0,endpointScope:'真实河流附近的孤立步行way；没有把不相连节点延长成连续河岸步道'};place.group.userData.walkway={featureId:path.id,riverFeatureId:'way/154210514',scope:'距现状河流约70米的真实步行way，未判定为2017工程边界'};}}}}
    if(p.overviewVisit&&!archivedRoute(place,'lhasa-station-liuwu-jokhang-approach')){place.routePoints=[];throw new Error('城市观察所需的归档接续道路缺失');}
    if(place.id==='shiquanhe'&&(stage==='connections'&&state.index===1||stage==='development'&&state.index===2))archivedRoute(place,'gunsa-airport-shiquanhe',true);
    if (place.routePoints.length > 1) { place.route = line(place.routePoints, GOLD, .9); place.route.userData = { kind: 'actual-osm-connected-use-path', localityId: place.id, scope: '按OSM相连节点演示移动，不是导航或已核实接待路线' }; place.highlights.add(place.route); }
    if(p.overviewVisit&&place.route){
      const vertices:number[]=[],points=place.routePoints;
      for(let i=1;i<points.length;i++){
        const a=points[i-1].clone(),b=points[i].clone();a.y+=8/runtime.metresPerUnit;b.y+=8/runtime.metresPerUnit;
        const side=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(35/runtime.metresPerUnit);
        const aa=a.clone().add(side),ab=a.clone().sub(side),ba=b.clone().add(side),bb=b.clone().sub(side);
        for(const v of [aa,ab,ba,ab,bb,ba])vertices.push(...v.toArray());
      }
      const stroke=new THREE.Mesh(geometry(vertices),new THREE.MeshBasicMaterial({color:GOLD,side:THREE.DoubleSide,depthWrite:false}));
      stroke.userData={kind:'city-observation-traversed-road',scope:'真实源道路中心线的放大阅读带，非道路宽度或历史线路'};
      place.route.add(stroke);place.route.userData.progressStroke=stroke;
    }
    if(place.routeInfo?.legIds||place.routeInfo?.id==='gunsa-airport-shiquanhe'){const text=usage.corridorLeg==='mainling-s4'?'S4接续 · 真实道路节点':usage.corridorLeg==='nyingchi-g318'?'G318越岭 · 到鲁朗':'G219 · 机场外部道路接续',sprite=label(text,'#ffdfa0'),leader=line([place.routePoints[0],place.routePoints[0]],GOLD,.8);sprite.onBeforeRender=()=>{};sprite.renderOrder=50;sprite.userData={kind:'actual-local-feature-label',text,displayText:text,anchor:place.routeInfo.coordinates[0],labelLeader:leader,routeFollower:true,routeId:place.routeInfo.id,sourceScope:place.routeInfo.endpointScope};place.labels.add(sprite,leader);}
    if(place.routeInfo?.legIds||place.routeInfo?.id==='gunsa-airport-shiquanhe'){
      const info=place.routeInfo,k=info.legBreakIndex,first=usage.corridorLeg==='mainling-s4';
      const indices=k===undefined?[0,info.coordinates.length-1]:first?[0,k]:[k,info.coordinates.length-1];
      const names=k===undefined?['昆莎机场外道路','狮泉河·滨河北路']:first?['米林机场外道路','林芝道路交接']:['林芝道路交接','鲁朗路端·非入口'];
      indices.forEach((index,i)=>{const anchor=info.coordinates[index],text=names[i],sprite=label(text,'#ffdfa0'),at=place.toWorld(anchor,25),leader=line([at,at],GOLD,.8);
        sprite.onBeforeRender=()=>{};sprite.renderOrder=50;sprite.userData={kind:'actual-local-route-endpoint-label',text,displayText:text,anchor,labelLeader:leader,routeId:info.id,sourceNodeId:info.sourceNodeIds?.[index],sourceScope:info.endpointScope,endpointPriority:2-i};place.labels.add(sprite,leader);
      });
      // At corridor distance the two actual endpoints and moving road reading
      // take precedence over objects in a much smaller destination window.
      place.labels.children.sort((a,b)=>(b.userData.endpointPriority??(b.userData.routeFollower?3:0))-(a.userData.endpointPriority??(a.userData.routeFollower?3:0)));
    }
    place.group.userData.primaryFeatureId = primary?.id;
    for(const object of place.usageObjects.values())object.visible=false;place.usage.userData.activeFeatureId=undefined;place.usage.userData.objectKey=undefined;
    if(usage.useReading&&!feature){const useFeature=place.id==='lulang'?place.featureById.get('way/1322496961'):place.id==='shiquanhe'?place.featureById.get('way/154210514'):primary;if(useFeature){const object=usageObject(place,useFeature);object.visible=true;place.usage.userData.activeFeatureId=useFeature.id;place.usage.userData.objectKey=`${place.id}:${useFeature.id}`;}}
  }
  function placeCamera(place: Place, p: TibetSceneProps) {
    const state = mapState(p),usage=cityLocalUsageState(p,place.id), bbox = place.data.metadata.bbox, stage = stageFor(p.step); let bounds = place.bounds.clone();
    if(place.id==='lulang'){
      // Approach the actual road/service cluster, not every high mountain at
      // the edge of the download. The source patch extends behind the camera.
      const objects=['way/401959070','way/1322496961','way/1322390955'].map(id=>place.featureById.get(id)).filter(Boolean) as LocalFeature[],points=objects.map(f=>place.toWorld(localFeatureAnchor(f)));
      if(points.length){bounds=new THREE.Box3().setFromPoints(points);bounds.expandByVector(new THREE.Vector3(950/runtime.metresPerUnit,90/runtime.metresPerUnit,650/runtime.metresPerUnit));}
    }
    if(place.id==='shiquanhe'){
      const objects=['way/154210585','way/1558909244','way/904011648'].map(id=>place.featureById.get(id)).filter(Boolean) as LocalFeature[],points=objects.map(f=>place.toWorld(localFeatureAnchor(f)));
      if(points.length){bounds=new THREE.Box3().setFromPoints(points);bounds.expandByVector(new THREE.Vector3(950/runtime.metresPerUnit,90/runtime.metresPerUnit,750/runtime.metresPerUnit));}
    }
    if (place.id === 'lhasa' && (stage === 'history' || stage === 'travel' && state.index === 1)) { const feature = place.featureById.get(stage === 'history' && state.index === 0 ? 'relation/2358701' : 'way/31475419'); if (feature) { const anchor = place.toWorld(localFeatureAnchor(feature)), radius = 1250 / runtime.metresPerUnit; bounds = new THREE.Box3(anchor.clone().add(new THREE.Vector3(-radius, -.001, -radius)), anchor.clone().add(new THREE.Vector3(radius, .003, radius))); } }
    if(p.cityLocalFeatureId&&place.featureById.has(p.cityLocalFeatureId)){
      // Manual evidence keeps the actual river/road/use cluster together. A
      // regional corridor below still owns its complete source-road framing.
      const context=place.id==='lhasa'?['way/122707268','way/122707217','relation/2358701','way/31475419']:place.id==='lulang'?['way/401959070','way/1322496961','way/26406905','way/1322390955']:['way/154210514','way/154210585','way/978103852','way/904011648'];
      const features=[...new Set([...context,p.cityLocalFeatureId])].flatMap(id=>place.featureById.get(id)??[]);
      const points=features.map(feature=>place.toWorld(localDisplayedAnchor(feature,bbox)??localFeatureAnchor(feature)));
      if(points.length){bounds=new THREE.Box3().setFromPoints(points);bounds.expandByVector(new THREE.Vector3(850/runtime.metresPerUnit,150/runtime.metresPerUnit,700/runtime.metresPerUnit));}
    }
    const regional=place.routeInfo?.id==='gunsa-airport-shiquanhe'||place.routeInfo?.id==='nyingchi-lulang-g318'||Boolean(place.routeInfo?.legIds);let geographicBounds:LocalBBox=bbox;
    if(regional&&place.routePoints.length>1){const k=place.routeInfo?.legBreakIndex,first=usage.corridorLeg==='mainling-s4',points=k!==undefined?(first?place.routePoints.slice(0,k+1):place.routePoints.slice(k)):place.routePoints,coords=k!==undefined?(first?place.routeInfo!.coordinates.slice(0,k+1):place.routeInfo!.coordinates.slice(k)):place.routeInfo!.coordinates;bounds=new THREE.Box3().setFromPoints(points);bounds.expandByVector(new THREE.Vector3(1700/runtime.metresPerUnit,300/runtime.metresPerUnit,1600/runtime.metresPerUnit));geographicBounds=[Math.min(...coords.map(p=>p[0])),Math.min(...coords.map(p=>p[1])),Math.max(...coords.map(p=>p[0])),Math.max(...coords.map(p=>p[1]))];}
    else if(usage.useReading&&!p.cityLocalFeatureId){
      const id=place.usage.userData.activeFeatureId as string|undefined,feature=id?place.featureById.get(id):undefined;let detail:THREE.Box3|undefined;
      if(place.id==='shiquanhe'){
        // The bridge and nearby real river give the use-reading its geographic
        // setting. This is a camera window, never an asserted project boundary.
        const bridge=place.featureById.get('way/154210585');if(bridge){const c=place.toWorld(localFeatureAnchor(bridge)),r=520/runtime.metresPerUnit;detail=new THREE.Box3(c.clone().add(new THREE.Vector3(-r,-.0005,-r*.55)),c.clone().add(new THREE.Vector3(r,.001,r*.55)));}
      }else if(feature){const points=ringsFor(feature,place.data.metadata.bbox).flat(2).map(p=>place.toWorld(p));if(points.length){detail=new THREE.Box3().setFromPoints(points);const margin=place.id==='lulang'?140:170;detail.expandByVector(new THREE.Vector3(margin/runtime.metresPerUnit,30/runtime.metresPerUnit,margin/runtime.metresPerUnit));}}
      if(detail){const approach=THREE.MathUtils.smoothstep(usage.progress,.22,.68);bounds.min.lerp(detail.min,approach);bounds.max.lerp(detail.max,approach);group.userData.useCamera={localityId:place.id,objectFeatureId:id,approach,sourceWindow:true};}
    }
    if(p.overviewBarkhor){
      const retail=place.featureById.get('way/880932156');
      if(retail){const points=ringsFor(retail,bbox).flat(2).map(point=>place.toWorld(point));const district=new THREE.Box3().setFromPoints(points);district.expandByScalar(95/runtime.metresPerUnit);
        const amount=p.overviewBarkhor.phase==='context'?THREE.MathUtils.smoothstep(p.overviewBarkhor.progress,0,.65):1;
        bounds.min.lerp(district.min,amount);bounds.max.lerp(district.max,amount);
        if(p.overviewBarkhor.phase==='return'){const city=district.clone(),palace=place.featureById.get('way/31475419');if(palace)city.expandByPoint(place.toWorld(localFeatureAnchor(palace)));city.expandByScalar(650/runtime.metresPerUnit);const mix=THREE.MathUtils.smoothstep(p.overviewBarkhor.progress,0,1);bounds.min.lerp(city.min,mix);bounds.max.lerp(city.max,mix);}
      }
    }
    if(p.overviewUrban){
      const phase=p.overviewUrban.phase,t=THREE.MathUtils.smoothstep(p.overviewUrban.progress,0,.35);
      const valley=new THREE.Box3().setFromPoints([[91.04,29.615],[91.14,29.675]].map(q=>place.toWorld(q as LocalCoordinate)));
      valley.min.y=Math.min(valley.min.y,place.toWorld([91.09,29.645]).y);valley.max.y=valley.min.y+350/runtime.metresPerUnit;
      const district=(ids:string[],margin:number)=>{const points=ids.flatMap(id=>{const f=place.featureById.get(id);return f?ringsFor(f,bbox).flat(2).map(q=>place.toWorld(q)):[];});const b=new THREE.Box3().setFromPoints(points);b.expandByVector(new THREE.Vector3(margin/runtime.metresPerUnit,60/runtime.metresPerUnit,margin/runtime.metresPerUnit));return b;};
      const palace=district(['way/31475419','way/61818449'],p.overviewPlaceAction?150:350),oldtown=p.overviewPlaceAction?district(['relation/2358701','way/177796787'],90):district(['way/880932156','relation/2358701'],300);
      let from=valley,to=valley;
      if(phase==='context'){from=bounds.clone();to=valley;}
      else if(phase==='plaza'){from=p.overviewPlaceAction?oldtown:valley;to=palace;}
      else if(phase==='barkhor'){from=p.overviewPlaceAction?valley:palace;to=oldtown;}
      else if(phase==='return'){from=p.overviewPlaceAction?palace:oldtown;to=valley;}
      bounds=from.clone();bounds.min.lerp(to.min,t);bounds.max.lerp(to.max,t);
      geographicBounds=[91.04,29.615,91.14,29.675];
    }
    if(p.overviewVisit){
      const phase=p.overviewVisit.phase,t=THREE.MathUtils.smoothstep(p.overviewVisit.progress,0,1);
      const valley=new THREE.Box3().setFromPoints([[91.04,29.615],[91.14,29.675]].map(q=>place.toWorld(q as LocalCoordinate)));
      valley.min.y=place.toWorld([91.09,29.645]).y;valley.max.y=valley.min.y+350/runtime.metresPerUnit;
      // Read a district within the same city, keeping Potala as a city reference.
      const district=new THREE.Box3().setFromPoints([[91.112,29.646],[91.138,29.664]].map(q=>place.toWorld(q as LocalCoordinate)));
      district.min.y=valley.min.y;district.max.y=valley.max.y;
      const amount=phase==='street'?t:phase==='shared'?1:phase==='return'?1-t:0;
      bounds=valley.clone();bounds.min.lerp(district.min,amount);bounds.max.lerp(district.max,amount);
      geographicBounds=[91.04,29.615,91.14,29.675];
    }
    // The overview player already lays its reading panel outside this canvas.
    // Reserving the old in-canvas sidebar again both shrank and offset the town.
    const overview = p.overviewPresentation === true, sidebar = overview ? 0 : viewport.x > 900 ? 338 : 0,
      top = overview ? 60 : viewport.y < 450 ? 70 : 155,
      bottom = overview ? Math.max(top + 1, viewport.y - 125) : Math.max(top + 155, viewport.y - (viewport.y < 450 ? 115 : 200));
    const centre = bounds.getCenter(new THREE.Vector3()), direction = new THREE.Vector3(0, 1.35, 1).normalize(), up = new THREE.Vector3(0, direction.z, -direction.y), right = new THREE.Vector3(1, 0, 0), halfWidth = Math.max(80, (viewport.x - sidebar - 70) / 2), halfHeight = Math.max(1, (bottom - top) / 2), tan = Math.tan(runtime.camera.fov * Math.PI / 360), tanX = tan * viewport.x / viewport.y * halfWidth / (viewport.x / 2), tanY = tan * halfHeight / (viewport.y / 2); let distance = .005;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) { const r = new THREE.Vector3(x, y, z).sub(centre), depth = r.dot(direction); distance = Math.max(distance, Math.abs(r.x) / tanX + depth, Math.abs(r.dot(up)) / tanY + depth); }
    // The main view approaches the town/river corridor; outer mountains may
    // extend offscreen. The full source window stays in the regional locator.
    // Fitting every high corner of a 5 km DEM into a 383px canvas made the real
    // street network smaller than the rejected symbolic plates.
    distance *= 1.02; const target = centre.clone().addScaledVector(up, -(1 - (top + bottom) / viewport.y) * distance * tan).addScaledVector(right, -sidebar / viewport.x * distance * tan * viewport.x / viewport.y);
    const position=target.clone().addScaledVector(direction,distance);
    group.userData.cameraFrame = { bbox,geographicBounds, bounds, localityId: place.id, screenUsableWidth: viewport.x - sidebar, distance, overviewPresentation: overview, screenArea: { left: sidebar, right: viewport.x, top, bottom },position:position.clone(),target:target.clone() }; runtime.focus(position, target, p.overviewBarkhor||p.overviewUrban||p.overviewVisit?'recorded':'local-place');
  }
  return { group, ready, places,
    active() { return current; },
    update(p: TibetSceneProps, size: THREE.Vector2) {
      if(options.enabled===false){group.visible=false;return;}
      viewport.copy(size); const supported = p.layer === 'atlas-city-comparison' && [3, 4, 5, 6].includes(p.step), stage = stageFor(p.step), state = mapState(p),resolved = supported ? resolveCityLocalGeography(stage, p.progress) : undefined;
      // The acquired airport road is a REGIONAL corridor, not geometry of the
      // airport inside the Shiquanhe town window. Its true endpoint shares the
      // riverside street node and can therefore use the same continuous world.
      const ngariCorridor=supported&&state.cityId==='ngari'&&(stage==='connections'&&state.index===1||stage==='development'&&state.index===2)&&corridors.has('gunsa-airport-shiquanhe');
      const id=(p.groundJourney?'lhasa':resolved?.localityId??(ngariCorridor?'shiquanhe':undefined)) as LocalPlaceId|undefined,cue = `${p.step}:${state.cityId}:${state.index}`;
      if (reset !== undefined && reset !== p.resetKey) resetSuppressed = cue; if (resetSuppressed && resetSuppressed !== cue) resetSuppressed = ''; reset = p.resetKey;
      requested = id ?? ''; current = id && (!resetSuppressed||p.groundJourney) ? places.get(id) : undefined; group.visible = Boolean(current); for (const place of places.values()) {place.group.visible = place === current;place.group.scale.y=p.groundJourney?1/LOCAL_MAP_VERTICAL_EXAGGERATION:1;place.group.userData.groundReading?.group && (place.group.userData.groundReading.group.visible=Boolean(p.groundJourney));for(const child of place.group.children)if(child.userData.featureClass==='railway')child.visible=!p.groundJourney;}
      group.userData = { ...group.userData, requestedLocalityId: requested, activeLocalityId: current?.id, failures: [...failures], sourceScope: 'OSM现状·历史用途分层，建筑缺高度统一符号，高程×1.8；细窗外为约5–6公里真实区域网格，不能读取道路坡度或设施海拔', resolver: resolved };
      if (!current) { focusKey = ''; return; }
      if(p.groundJourney){
        const place=current;
        if(!place.group.userData.groundReading){
          const data={...place.data,features:place.data.features.filter(f=>f.properties.featureClass!=='railway'||f.properties.tags.usage==='main')};
          const route=localRoadRouteEvidence(data,(place.data.metadata.groundRouteStart as LocalCoordinate|undefined)??[place.dem.bbox[0]+.001,29.6202],[91.0690419,29.6251928],'railway');
          const reading=createGroundRouteReading(route.coordinates,data.features,place.toWorld,runtime.metresPerUnit,LOCAL_MAP_VERTICAL_EXAGGERATION);
          place.group.userData.groundReading=reading;place.group.add(reading.group);
        }
        const reading=place.group.userData.groundReading;
        const pose=reading.update(p.groundJourney,runtime.camera,size);
        for(const object of [place.highlights,place.labels,place.usage,place.marker,place.train,place.car,place.oldCar])object.visible=false;
        if(place.route)place.route.visible=false;
        place.group.userData.placeActions?.update(undefined,1);place.group.userData.urban?.update(undefined);place.group.userData.barkhor?.update(undefined);
        group.userData.cameraFrame={...pose,geographicBounds:place.dem.bbox};
        if(pose.changed){runtime.focus(pose.position,pose.target,'recorded');p.onGroundJourneyReading?.(reading.group.userData.reading);}
        return;
      }
      setHighlights(current, p);const direction=cityLocalUsageState(p,current.id),cameraBeat=direction.useReading?Math.floor(direction.progress*14):0;
      // Only entry/return move this camera. Restating a stationary destination
      // every spoken word restarts the runtime fade and dims the street action.
      const barkhorCamera=p.overviewBarkhor&&['context','return'].includes(p.overviewBarkhor.phase)?Math.floor(p.overviewBarkhor.progress*100):0;
      const urbanCamera=p.overviewUrban&&['context','plaza','barkhor','return'].includes(p.overviewUrban.phase)?Math.floor(Math.min(.35,p.overviewUrban.progress)*200):0;
      const visitCamera=p.overviewVisit&&['street','return'].includes(p.overviewVisit.phase)?Math.floor(p.overviewVisit.progress*200):0;
      const key = `${current.id}:${cue}:${size.x}:${size.y}:${cameraBeat}:${current.routeInfo?.id}:${p.cityLocalFeatureId??''}:overview=${p.overviewPresentation===true}:barkhor=${p.overviewBarkhor?.phase??''}:${barkhorCamera}:urban=${p.overviewUrban?.phase??''}:${urbanCamera}:visit=${p.overviewVisit?.phase??''}:${visitCamera}`; if (focusKey !== key) { focusKey = key; placeCamera(current, p); }
      const usage=cityLocalUsageState(p,current.id),use = p.step !== 6 || state.index > 0, enabled = p.cityLifeServices !== false; current.highlights.visible = enabled; current.marker.visible = enabled && use && current.routePoints.length > 1;current.usage.visible=usage.useReading&&enabled&&!p.overviewUrban&&!p.overviewVisit;
      const lesson=stage==='development'?undefined:cityContinuityLessons[stage][state.cityId][state.index];current.group.userData.event = { lessonId: lesson?.id, sourceIds: lesson?.sourceIds??cityAccessChanges[state.cityId].sourceIds, partProgress: state.partProgress, enabled, physicalGeometryInvariant: true, routeScope: '现状路网上的使用演示，非历史路线与开通前后几何' };
      const focal = size.y / (2 * Math.tan(runtime.camera.fov * Math.PI / 360)),transfer=p.cityAccessTransfer!==false&&enabled,road=current.routePoints,rail=current.railPoints;
      if(p.overviewBarkhor&&!current.group.userData.barkhor){const place=current;const reading=createBarkhorSpatialReading(place.data,place.toWorld,(feature,height)=>geometry(polygonPositions(feature,place.data.metadata.bbox,q=>place.toWorld(q,4),height,1/runtime.metresPerUnit)),feature=>localBuildingsWithinFeature(place.data,feature),1/runtime.metresPerUnit);place.group.add(reading.group);place.group.userData.barkhor=reading;}
      if(p.overviewPlaceAction&&!current.group.userData.placeActions){const place=current;const reading=createPlaceActionReading(place.data,place.toWorld,(feature,height)=>geometry(polygonPositions(feature,place.data.metadata.bbox,q=>place.toWorld(q,5),height,1/runtime.metresPerUnit)));place.group.add(reading.group);place.group.userData.placeActions=reading;}
      (current.group.userData.placeActions as ReturnType<typeof createPlaceActionReading>|undefined)?.update(p.overviewPlaceAction,current.toWorld(p.overviewUrban?.phase==='plaza'?[91.117,29.654]:[91.132,29.652]).distanceTo(runtime.camera.position)/focal*5);
      const barkhor=current.group.userData.barkhor as ReturnType<typeof createBarkhorSpatialReading>|undefined;
      barkhor?.update(enabled?p.overviewBarkhor:undefined,current.toWorld([91.1315,29.653]).distanceTo(runtime.camera.position)/focal*2.3);
      const urban=current.group.userData.urban as ReturnType<typeof createLhasaUrbanReading>|undefined;
      const pixelView=Boolean(p.overviewUrban&&['baseline','middle','recent'].includes(p.overviewUrban.phase));
      urban?.update(pixelView?p.overviewUrban!.year:undefined,p.overviewUrban?.showChange);
      // Contemporary built/road geometry must not masquerade as the dated city.
      for(const child of current.group.children)if(child.userData.kind==='actual-osm-geometry-batch'){child.visible=!pixelView||['water','green','landmark'].includes(child.userData.featureClass);if(child.userData.featureClass==='liuwuBridge'){const mesh=child as THREE.Mesh<THREE.BufferGeometry>,amount=p.overviewCityChange?.bridge??1;mesh.geometry.setDrawRange(0,Math.floor(mesh.geometry.attributes.position.count*amount/6)*6);}}
      current.train.visible=current.car.visible=current.oldCar.visible=false;
      const setVehicle=(object:THREE.Group,points:THREE.Vector3[],progress:number,pixels:number)=>{if(points.length<2)return;const pose=pointAlong(points,progress),unit=pose.point.distanceTo(runtime.camera.position)/focal;object.position.copy(pose.point);object.rotation.y=-Math.atan2(pose.direction.z,pose.direction.x);object.scale.setScalar(unit*pixels);object.userData={...object.userData,progress,pathPoint:pose.point.clone(),scope:'真实OSM线上的放大交通符号，地表高程非实测轨面'};object.visible=true;};
      const regionalRoute=current.routeInfo?.id==='gunsa-airport-shiquanhe'||current.routeInfo?.id==='nyingchi-lulang-g318'||Boolean(current.routeInfo?.legIds);let holder='local-use',motion=regionalRoute?state.partProgress:usage.useReading?usage.motion:state.partProgress;
      const leg=current.routeInfo?.legBreakIndex;if(leg!==undefined){const fraction=routeLegFraction(road,leg);motion=state.partProgress<.5?fraction*state.partProgress*2:fraction+(1-fraction)*(state.partProgress-.5)*2;}
      if(current.id==='lhasa'&&(stage==='development'||stage==='connections')&&!usage.useReading){
        const accessPhase=stage==='development'?state.index:state.index===0?1:state.index===1?2:3;
        setVehicle(current.oldCar,road,state.partProgress,9); // Existing road mode remains in every comparison.
        if(enabled&&accessPhase>=1)setVehicle(current.train,rail,accessPhase===1?state.partProgress:1,10);
        if(accessPhase===0||!enabled){current.marker.position.copy(current.oldCar.position);holder='existing-road';current.marker.visible=true;}
        else if(accessPhase===1){current.marker.position.copy(current.train.position);holder='train';current.marker.visible=current.train.visible;}
        else{
          const arrival=rail.at(-1)??road[0];if(arrival){current.marker.position.copy(arrival);holder='arrival';current.marker.visible=true;}
          if(transfer&&road.length>1){motion=clamp((state.partProgress-.15)/.85,0,1);setVehicle(current.car,road,motion,13);const handoff=clamp(state.partProgress/.15,0,1);if(arrival)current.marker.position.copy(arrival).lerp(current.car.position,handoff);holder=handoff<1?'station-handoff':'local-vehicle';}
        }
      }else if(current.marker.visible){if(stage==='connections'&&usage.useReading&&current.id==='lhasa')motion=1;if(!transfer)motion=0;const pose=pointAlong(road,motion);current.marker.position.copy(pose.point);if(transfer&&(current.id==='lulang'||current.id==='lhasa'&&stage==='connections'||current.id==='shiquanhe'&&regionalRoute)){setVehicle(current.car,road,motion,13);holder=motion>=1?'known-road-end':'local-arrival';}else holder=!transfer?'arrival':current.id==='shiquanhe'?'riverside-street-observation':'existing-street-reading';}
      if(stage==='connections'&&!enabled&&road.length>1){current.marker.visible=true;current.marker.position.copy(road[0]);holder='arrival';}
      const markerDepth=current.marker.position.distanceTo(runtime.camera.position),markerUnit=markerDepth/focal;current.marker.position.y+=markerUnit*(holder==='train'?7:holder==='local-vehicle'||holder==='local-arrival'?8:5);current.marker.scale.setScalar(markerUnit*3.8);current.marker.userData={...current.marker.userData,partProgress:state.partProgress,holder,localityId:current.id,role:current.id==='shiquanhe'?'真实滨河道路上的空间阅读标志，不是已核验步行路线':'同一出行标志随列车、抵达与地方车交接'};
      current.group.userData.event={...current.group.userData.event,holder,transfer,activityProgress:motion,usage,routeId:current.routeInfo?.id,routeFeatureIds:current.routeInfo?.featureIds,endpointScope:current.routeInfo?.endpointScope,sourceNodeIds:current.routeInfo?.sourceNodeIds,sourceWayIdsByEdge:current.routeInfo?.sourceWayIdsByEdge,readingObjectKey:current.usage.userData.objectKey,readingObjectFeatureId:current.usage.userData.activeFeatureId,phaseCaption:cityLocalUsageCaption(current.id,usage),historicalGeometryChanged:false};
      const readAmount=regionalRoute?usage.activity*clamp((state.partProgress-.94)/.06,0,1):usage.activity;for(const object of current.usageObjects.values())if(object.visible){object.userData.state=usage;object.userData.eventSourceIds=current.group.userData.event.sourceIds;object.traverse(item=>{if(item.userData.kind==='same-real-footprint-use-reading'){item.userData.uniforms.useReading.value=readAmount;item.userData.readingProgress=readAmount;}if(item.userData.kind==='same-real-river-use-reading'){const count=item.userData.sourcePoints.length;(item as THREE.Line).geometry.setDrawRange(0,Math.max(2,Math.round(count*readAmount)));item.userData.readingProgress=readAmount;}});}
      // Geography stays constant. Participation becomes legible through actual
      // feature emphasis and a carrier entering the mapped service vicinity.
      for(const item of current.highlights.children){if(item.userData.kind!=='actual-local-feature-focus')continue;const material=(item as THREE.Mesh).material as THREE.MeshBasicMaterial;if(material&&'opacity'in material)material.opacity=item.userData.featureId===current.group.userData.primaryFeatureId?.toString()?.trim()? .18+.55*clamp((state.partProgress-.2)/.65,0,1):.25;}
      const overview = p.overviewPresentation === true,
        boxes:{x:number;y:number;width:number;height:number}[]=[],bottom=overview?size.y-125:size.y-(size.y<450?112:202),left=overview?12:size.x>900?348:12,
        labelTop=overview?60:65,labelMinimum=overview?72:90,
        insetWidth=overview?160:size.x<520?136:size.y<450?162:194,insetTop=overview?62:size.y<450?94:166,insetRight=overview?20:60;
      boxes.push({x:size.x-insetRight-insetWidth/2,y:insetTop+insetWidth*.57/2,width:insetWidth+10,height:insetWidth*.57+45});
      if(p.overviewCityChange&&road.length>1){const range=bridgeRouteRange(road,current.routeInfo?.sourceWayIdsByEdge??[]),q=pointAlong(road,cityChangeMotion(p.overviewCityChange,range)).point.project(runtime.camera);boxes.push({x:(q.x+1)*size.x/2,y:(1-q.y)*size.y/2,width:80,height:60});}
      if(p.overviewVisit&&!p.overviewCityChange)boxes.push({x:158,y:116,width:286,height:104});
      let explainedBox:{x:number;y:number;width:number;height:number}|undefined;const explainedId=current.usage.userData.activeFeatureId as string|undefined,explained=explainedId?current.featureById.get(explainedId):undefined;
      if(current.usage.visible&&explained){const sourceWorld=current.toWorld;const sourcePoints=ringsFor(explained,current.data.metadata.bbox).flat(2).map(q=>sourceWorld(q,20).project(runtime.camera)).filter(q=>q.z>-1&&q.z<1);if(sourcePoints.length){const xs=sourcePoints.map(q=>(q.x+1)*size.x/2),ys=sourcePoints.map(q=>(1-q.y)*size.y/2),x1=Math.min(...xs),x2=Math.max(...xs),y1=Math.min(...ys),y2=Math.max(...ys);explainedBox={x:(x1+x2)/2,y:(y1+y2)/2,width:x2-x1+12,height:y2-y1+12};boxes.push(explainedBox);current.usage.userData.screenBox=explainedBox;}}
      let shown = 0;for(const child of current.labels.children){if(!(child instanceof THREE.Sprite))continue;const sprite=child,leader=sprite.userData.labelLeader as THREE.Line,anchor=sprite.userData.routeFollower?current.marker.position.clone():current.toWorld(sprite.userData.anchor,25),projected=anchor.clone().project(runtime.camera),ax=(projected.x+1)*size.x/2,ay=(1-projected.y)*size.y/2,width=Math.min(190,sprite.userData.displayText.length*11+16);
        sprite.visible=leader.visible=false;if(projected.z<=-1||projected.z>=1||shown>=(p.overviewCityChange?4:regionalRoute||p.overviewUrban||p.overviewVisit?3:2)||ax<left-50||ax>size.x+50||ay<labelTop||ay>bottom+50)continue;
        const around=explainedBox?[[explainedBox.x-explainedBox.width/2-width/2-20-ax,0],[explainedBox.x+explainedBox.width/2+width/2+20-ax,0],[0,explainedBox.y-explainedBox.height/2-24-ay],[0,explainedBox.y+explainedBox.height/2+24-ay]]:[];
        const candidates=[...around,[-45,-25],[55,-24],[-55,25],[45,25],[-100,-48],[80,48]].map(([dx,dy])=>({x:clamp(ax+dx,left+width/2,size.x-width/2-14),y:clamp(ay+dy,labelMinimum,bottom-12),width,height:22}));const box=candidates.find(b=>!boxes.some(o=>Math.abs(o.x-b.x)<(o.width+b.width)/2+8&&Math.abs(o.y-b.y)<(o.height+b.height)/2+7));if(!box)continue;
        sprite.visible=leader.visible=true;const position=new THREE.Vector3(box.x/size.x*2-1,1-box.y/size.y*2,projected.z).unproject(runtime.camera),depth=-position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z,unit=depth/focal;sprite.position.copy(position);sprite.scale.set(width*unit,22*unit,1);sprite.userData.screenBox=box;const attr=leader.geometry.attributes.position as THREE.BufferAttribute;attr.setXYZ(0,anchor.x,anchor.y,anchor.z);attr.setXYZ(1,position.x,position.y,position.z);attr.needsUpdate=true;leader.geometry.computeBoundingSphere();boxes.push(box);shown++;
      }
      resolution = `${current.dem.displaySamplingMetres.eastWest}/${current.dem.displaySamplingMetres.northSouth}`; group.userData.displaySampling = resolution;
      if(p.overviewBarkhor){current.marker.visible=false;current.train.visible=current.car.visible=current.oldCar.visible=false;if(current.route)current.route.visible=false;}
      if(p.overviewVisit){
        current.usage.visible=false;current.train.visible=current.oldCar.visible=current.marker.visible=false;
        const moving=['context','crossing','organization'].includes(p.overviewVisit.phase);
        const change=p.overviewCityChange,range=change?bridgeRouteRange(road,current.routeInfo?.sourceWayIdsByEdge??[]):undefined;
        const visitMotion=change&&range?cityChangeMotion(change,range):p.overviewVisit.motion;
        current.car.visible=false;if(enabled&&(!change||!['context','arrival'].includes(change.phase)))setVehicle(current.car,road,visitMotion,change?22:13);
        if(change?.phase==='arrival'&&enabled)setVehicle(current.train,rail,change.progress,12);
        if(current.route&&range){(current.route as THREE.Line<THREE.BufferGeometry>).geometry.setDrawRange(0,change!.bridge<1?range.first+1:road.length);current.route.userData.bridgeAvailable=change!.bridge>=1;}
        if(current.route)current.route.visible=moving;
        const stroke=current.route?.userData.progressStroke as THREE.Mesh<THREE.BufferGeometry>|undefined;
        if(stroke&&road.length>1){const sample=routeSampleSegment(road,visitMotion);stroke.geometry.setDrawRange(0,Math.max(0,(sample.index-1)*6));}
        current.group.userData.visit={...p.overviewVisit,change:p.overviewCityChange,actualMotion:visitMotion,bridgeRange:range,routeId:current.routeInfo?.id,sourceNodeIds:current.routeInfo?.sourceNodeIds,endpoint:current.routeInfo?.coordinates.at(-1),scope:'现状道路接续至已知路端；不延伸至寺院入口'};
      }
      if(p.overviewUrban){current.usage.visible=false;current.marker.visible=false;current.train.visible=current.car.visible=current.oldCar.visible=false;if(current.route)current.route.visible=false;}
    },
    dispose() { if (!alive) return; alive = false; sourceAbort.abort(); disposeTree(group); places.clear(); corridors.clear(); current = undefined; },
  };
}

