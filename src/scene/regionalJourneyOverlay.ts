import * as THREE from 'three';
import { getRegionalJourney } from '../data/regionalJourney';
import type { RegionalJourneyAction, RegionalJourneyCityId, RegionalJourneyPoint } from '../data/regionalJourneyTypes';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { regionalTerrainMeta } from '../data/terrainMetadata';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';
import { cityComparisonDownhill, type ComparisonPoint } from './cityComparison';
import { GOLD, TEAL, disposeTree, label, line } from './environment';
import {regionalJourneyAnnotations} from '../data/regionalJourneyAnnotations';

export const REGIONAL_JOURNEY_CITIES = ['shigatse', 'shannan', 'chamdo', 'nagqu'] as const;
export type RegionalFlowDirection = 'along-valley' | 'across-ridge';
type Read = (longitude: number, latitude: number) => number | undefined;
export type RegionalJourneyOverlaySettings = {
  layer: string; selected: string; step: number; progress: number;
  regionalCue?: number; regionalProcess?: boolean; season?: number; regionalFlowDirection?: RegionalFlowDirection;
};
export type RegionalJourneyOverlayRuntime = {
  camera: THREE.PerspectiveCamera;
  /** Existing regional DEM and its existing vertical exaggeration. */
  at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3;
  baseline: (longitude: number, latitude: number) => THREE.Vector3;
  metres: Read;
  metresToWorld: (metres: number) => number;
};
type TerrainCell = ComparisonPoint & { lowGentle: number };
type TerrainWindow = { columns: number; rows: number; cells: TerrainCell[]; minimum: number; maximum: number };
const clamp = (n: number) => THREE.MathUtils.clamp(Number.isFinite(n) ? n : 0, 0, 1);
const phase = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const colors: Record<RegionalJourneyCityId, number> = { shigatse: GOLD, shannan: 0x8ee1ab, chamdo: 0x7bdbe8, nagqu: 0xb7b4ef };

/** Cue-relative media progress is supplied by the director. No clock runs here. */
export function regionalJourneyVisualState(settings: RegionalJourneyOverlaySettings) {
  const requested = settings.selected.replace(/^city:/, '');
  const city: RegionalJourneyCityId = REGIONAL_JOURNEY_CITIES.includes(requested as RegionalJourneyCityId) ? requested as RegionalJourneyCityId : 'shigatse';
  const journey = getRegionalJourney(city), stage = Math.max(0, Math.min(3, Math.round(settings.step || 0)));
  const cues = journey?.stages[stage]?.cues ?? [], cue = Math.max(0, Math.min(cues.length - 1, Math.round(settings.regionalCue || 0)));
  const progress = clamp(settings.progress);
  return { city, stage, cue, progress, enabled: settings.regionalProcess !== false, cold: settings.season === 3, season: settings.season === 3 ? 3 : 1,
    flowDirection: settings.regionalFlowDirection === 'along-valley' ? 'along-valley' as const : 'across-ridge' as const,
    action: cues[cue]?.action ?? 'valley' as RegionalJourneyAction, pointIds: cues[cue]?.pointIds ?? [],
    advance: phase(progress, 0, .72), settle: phase(progress, .45, 1) };
}

/** An explicit cross-section on the original coarse regional DEM. Not a road. */
export function sampleRegionalJourneyProfile(city: RegionalJourneyCityId, read: Read): ComparisonPoint[] {
  const ref = verifiedPlaceReferences[city], eastWest = city === 'chamdo' || city === 'nagqu';
  const points: ComparisonPoint[] = [];
  for (let index = 0; index <= 100; index++) {
    const t = index / 100;
    const longitude = ref.longitude + (eastWest ? -1.45 + 2.9 * t : 0);
    const latitude = ref.latitude + (eastWest ? 0 : -1.65 + 3.05 * t);
    const metres = read(longitude, latitude);
    if (metres === undefined || !Number.isFinite(metres)) return [];
    points.push({ longitude, latitude, metres });
  }
  return points;
}

/** Same angular reading window, never city extent or mapped land use. */
export function sampleRegionalJourneyWindow(city: RegionalJourneyCityId, read: Read): TerrainWindow | undefined {
  const ref = verifiedPlaceReferences[city], columns = 29, rows = 27, raw: ComparisonPoint[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const longitude = ref.longitude - 1.3 + 2.6 * col / (columns - 1), latitude = ref.latitude - 1.15 + 2.3 * row / (rows - 1);
    const metres = read(longitude, latitude);
    if (metres === undefined || !Number.isFinite(metres)) return undefined;
    raw.push({ longitude, latitude, metres });
  }
  const minimum = Math.min(...raw.map(p => p.metres)), maximum = Math.max(...raw.map(p => p.metres));
  const cells = raw.map((point, index) => {
    const row = Math.floor(index / columns), col = index % columns;
    const west = raw[row * columns + Math.max(0, col - 1)], east = raw[row * columns + Math.min(columns - 1, col + 1)];
    const south = raw[Math.max(0, row - 1) * columns + col], north = raw[Math.min(rows - 1, row + 1) * columns + col];
    const dx = Math.max(1, (east.longitude - west.longitude) * 111320 * Math.cos(point.latitude * Math.PI / 180));
    const dz = Math.max(1, (north.latitude - south.latitude) * 111320);
    const slope = Math.hypot((east.metres - west.metres) / dx, (north.metres - south.metres) / dz);
    return { ...point, lowGentle: (1 - (point.metres - minimum) / Math.max(1, maximum - minimum)) / (1 + slope * 14) };
  });
  return { columns, rows, cells, minimum, maximum };
}

/** This locates an uplift mechanism. It is not a reconstructed weather track. */
export function regionalJourneyAirPoint(city: RegionalJourneyCityId, fraction: number, direction: RegionalFlowDirection = 'across-ridge') {
  const ref = verifiedPlaceReferences[city], p = clamp(fraction);
  if (city === 'chamdo') return direction === 'along-valley'
    ? { longitude: ref.longitude, latitude: ref.latitude - 1.35 * (1 - p) }
    : { longitude: ref.longitude + 1.35 * (1 - p), latitude: ref.latitude };
  if (city === 'nagqu') return { longitude: ref.longitude - 1.3 * (1 - p), latitude: ref.latitude - .7 * (1 - p) };
  return { longitude: ref.longitude - .4 * (1 - p), latitude: ref.latitude - 1.65 * (1 - p) };
}

/** Never put an air parcel inside a higher ridge already traversed. */
export function regionalJourneyAirPose(city: RegionalJourneyCityId, fraction: number, read: Read, direction: RegionalFlowDirection = 'across-ridge') {
  const p = clamp(fraction), start = regionalJourneyAirPoint(city, 0, direction), startMetres = read(start.longitude, start.latitude);
  if (startMetres === undefined || !Number.isFinite(startMetres)) return undefined;
  let highestMetres = startMetres;
  const end = regionalJourneyAirPoint(city, 1, direction), breaks = [0, p];
  // A straight path crosses bilinearly interpolated DEM cells. Split at the
  // exact source-cell edges, then include any quadratic interior maximum.
  // Regridding the prefix at each progress could lose a previously read peak.
  const edges = (a: number, b: number, minimum: number, maximum: number, count: number) => {
    if (a === b) return;
    const spacing = (maximum - minimum) / (count - 1);
    for (let i = Math.max(0, Math.ceil((Math.min(a, b) - minimum) / spacing)); i < count && minimum + i * spacing <= Math.max(a, b); i++) {
      const t = (minimum + i * spacing - a) / (b - a); if (t > 0 && t < p) breaks.push(t);
    }
  };
  edges(start.longitude, end.longitude, regionalTerrainMeta.west, regionalTerrainMeta.east, regionalTerrainMeta.columns);
  edges(start.latitude, end.latitude, regionalTerrainMeta.south, regionalTerrainMeta.north, regionalTerrainMeta.rows);
  breaks.sort((a, b) => a - b);
  const valueAt = (t: number) => { const point = regionalJourneyAirPoint(city, t, direction); return read(point.longitude, point.latitude); };
  for (let i = 0; i < breaks.length - 1; i++) {
    const a = breaks[i], b = breaks[i + 1], h0 = valueAt(a), hm = valueAt((a + b) / 2), h1 = valueAt(b);
    if (h0 === undefined || hm === undefined || h1 === undefined || ![h0, hm, h1].every(Number.isFinite)) return undefined;
    highestMetres = Math.max(highestMetres, h0, hm, h1);
    const quadratic = 2 * (h1 + h0 - 2 * hm), linear = h1 - h0 - quadratic, extremum = quadratic < -1e-9 ? -linear / (2 * quadratic) : -1;
    if (extremum > 0 && extremum < 1) {
      const peak = valueAt(THREE.MathUtils.lerp(a, b, extremum)); if (peak === undefined || !Number.isFinite(peak)) return undefined;
      highestMetres = Math.max(highestMetres, peak);
    }
  }
  const point = regionalJourneyAirPoint(city, p, direction), terrainMetres = read(point.longitude, point.latitude)!;
  const gainedMetres = Math.max(0, highestMetres - startMetres);
  return { ...point, terrainMetres, highestMetres, gainedMetres, expansion: 1 + Math.min(.65, gainedMetres / 4000), response: clamp(gainedMetres / 1400) };
}

type Caption = { text: string; sprite: THREE.Sprite; leader: THREE.Line };
type Flow = { points: ComparisonPoint[]; trace?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; bead: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> };
type PlacePin = { point: RegionalJourneyPoint; group: THREE.Group; halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; mast: THREE.Line; cap: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> };

/** All mechanisms remain attached to the unchanged whole regional map. */
export function buildRegionalJourneyOverlay(runtime: RegionalJourneyOverlayRuntime) {
  const group = new THREE.Group(); group.name = 'four-region-journey-on-shared-dem'; group.visible = false;
  group.userData.kind = 'regional-journey-overlay';
  const relief = new THREE.Group(), ground = new THREE.Group(), atmosphere = new THREE.Group(), sources = new THREE.Group(), access = new THREE.Group();
  group.add(relief, ground, atmosphere, sources, access);
  const viewport = new THREE.Vector2(), captions = new Map<string, Caption>();
  const material = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false });
  const profileRoot = new THREE.Group(), landRoot = new THREE.Group(); relief.add(profileRoot); ground.add(landRoot);
  const airPathRoot = new THREE.Group(); atmosphere.add(airPathRoot);
  const scan = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), material(GOLD)); scan.renderOrder = 33; scan.userData.kind = 'regional-real-dem-probe'; relief.add(scan);
  const ruler = line([new THREE.Vector3(), new THREE.Vector3()], GOLD, .85); ruler.renderOrder = 32; (ruler.material as THREE.LineBasicMaterial).depthTest = false; relief.add(ruler);
  const parcel = new THREE.Mesh(new THREE.SphereGeometry(.16, 18, 12), material(TEAL, .68)); parcel.renderOrder = 29; parcel.userData.kind = 'regional-uplift-principle-air-parcel'; atmosphere.add(parcel);
  const halo = new THREE.Mesh(new THREE.RingGeometry(.2, .25, 40), material(TEAL, .82)); halo.rotation.x = -Math.PI / 2; halo.renderOrder = 29; atmosphere.add(halo);
  const clouds = Array.from({ length: 7 }, (_, i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.1 + (i % 3) * .015, 12, 8), material(0xe9f4ee, 0)); mesh.renderOrder = 30; mesh.userData.kind = 'regional-condensation-principle'; atmosphere.add(mesh); return mesh;
  });
  const drops = Array.from({ length: 20 }, (_, i) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.011, .014, .12, 5), material(0xa0ecf4, .9)); mesh.renderOrder = 31; mesh.userData.kind = 'regional-rain-principle-not-observation'; atmosphere.add(mesh); return { mesh, phase: i / 20 };
  });
  const flowRoot = new THREE.Group(); ground.add(flowRoot);
  const flows: Flow[] = Array.from({ length: 4 }, () => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.065, 10, 8), material(0x9af8e6)); bead.renderOrder = 34; flowRoot.add(bead); return { points: [], bead };
  });
  const materialRings = Array.from({ length: 3 }, (_, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.18 + i * .075, .018, 6, 42), material(GOLD, .7)); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 31; ring.userData.kind = 'regional-historical-material-symbol-not-urban-footprint'; sources.add(ring); return ring;
  });
  const exchanges = Array.from({ length: 10 }, (_, i) => {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(.065, .065, .11), material(i % 2 ? GOLD : TEAL)); marker.renderOrder = 34; marker.userData.kind = 'regional-connection-exchange-symbol'; access.add(marker); return marker;
  });
  const accessSpan = new THREE.Group(); access.add(accessSpan);
  const pointRoot = new THREE.Group(); sources.add(pointRoot);
  const levelColumns = REGIONAL_JOURNEY_CITIES.map(city => {
    const mast = line([new THREE.Vector3(), new THREE.Vector3()], colors[city], .45); (mast.material as THREE.LineBasicMaterial).depthTest = false; mast.renderOrder = 20;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), material(colors[city], .75)); cap.renderOrder = 22;
    mast.userData = { kind: 'regional-city-reference-height', city }; group.add(mast, cap); return { city, mast, cap };
  });
  let currentCity: RegionalJourneyCityId | undefined, ready = false;
  let profile: ComparisonPoint[] = [], window: TerrainWindow | undefined;
  let profileTrace: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | undefined;
  let land: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined;
  let pins: PlacePin[] = [], currentAccessKey = '', accessCurve: THREE.QuadraticBezierCurve3 | undefined;
  let currentAirKey = '', airTrace: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | undefined;

  const writeLine = (object: THREE.Line, a: THREE.Vector3, b: THREE.Vector3) => {
    const buffer = object.geometry.attributes.position as THREE.BufferAttribute;
    buffer.setXYZ(0, a.x, a.y, a.z); buffer.setXYZ(1, b.x, b.y, b.z); buffer.needsUpdate = true; object.geometry.computeBoundingSphere();
  };
  const tube = (points: THREE.Vector3[], color: number, radius: number, opacity = 1) => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(24, points.length * 2), radius, 5, false), material(color, opacity)); mesh.renderOrder = 25; return mesh;
  };
  const sampleOn = (points: ComparisonPoint[], fraction: number, offset = .1) => {
    const at = clamp(fraction) * (points.length - 1), index = Math.floor(at), a = points[index], b = points[Math.min(index + 1, points.length - 1)];
    const longitude = THREE.MathUtils.lerp(a.longitude, b.longitude, at - index), latitude = THREE.MathUtils.lerp(a.latitude, b.latitude, at - index);
    return { longitude, latitude, metres: runtime.metres(longitude, latitude) ?? a.metres, position: runtime.at(longitude, latitude, offset) };
  };
  const setDraw = (mesh: THREE.Mesh<THREE.BufferGeometry>, p: number) => {
    const count = mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count;
    mesh.geometry.setDrawRange(0, Math.floor(count * clamp(p) / 3) * 3);
  };
  const build = (city: RegionalJourneyCityId) => {
    currentCity = city; ready = false;
    profile = sampleRegionalJourneyProfile(city, runtime.metres); window = sampleRegionalJourneyWindow(city, runtime.metres);
    if (profile.length < 2 || !window) return;
    disposeTree(profileRoot); disposeTree(landRoot); disposeTree(pointRoot); disposeTree(accessSpan); currentAccessKey = ''; accessCurve = undefined;
    disposeTree(airPathRoot); currentAirKey = ''; airTrace = undefined;
    const points = profile.map(p => runtime.at(p.longitude, p.latitude, .055));
    const ghost = line(points, colors[city], .28); ghost.userData.kind = 'regional-cross-section-on-real-dem'; profileRoot.add(ghost);
    profileTrace = tube(points, colors[city], .038, .92); profileTrace.userData = { kind: 'regional-scanned-real-dem-profile', samples: profile }; profileRoot.add(profileTrace);
    const vertices: number[] = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const a = points[i], b = points[i + 1], floorA = runtime.baseline(profile[i].longitude, profile[i].latitude), floorB = runtime.baseline(profile[i + 1].longitude, profile[i + 1].latitude);
      for (const p of [a, floorA, b, b, floorA, floorB]) vertices.push(p.x, p.y, p.z);
    }
    const curtainGeometry = new THREE.BufferGeometry(); curtainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const curtainMaterial = material(colors[city], .13); curtainMaterial.side = THREE.DoubleSide;
    const curtain = new THREE.Mesh(curtainGeometry, curtainMaterial); curtain.userData.kind = 'regional-sea-level-profile-curtain'; profileRoot.add(curtain);
    const positions: number[] = [], tint: number[] = [], lower = new THREE.Color(0x56dbb0), higher = new THREE.Color(0xc7a56b);
    const scores = window.cells.map(cell => cell.lowGentle).sort((a, b) => a - b);
    const lowScore = scores[Math.floor(scores.length * .1)], highScore = scores[Math.floor(scores.length * .9)];
    for (let row = 0; row < window.rows - 1; row++) for (let col = 0; col < window.columns - 1; col++) {
      const first = row * window.columns + col;
      for (const id of [first, first + 1, first + window.columns, first + 1, first + window.columns + 1, first + window.columns]) {
        const cell = window.cells[id], p = runtime.at(cell.longitude, cell.latitude, .075), color = higher.clone().lerp(lower, clamp((cell.lowGentle - lowScore) / Math.max(.001, highScore - lowScore)));
        const x = id % window.columns, y = Math.floor(id / window.columns), edge = clamp(Math.min(x, y, window.columns - 1 - x, window.rows - 1 - y) / 3);
        positions.push(p.x, p.y, p.z); tint.push(color.r, color.g, color.b, edge);
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(tint, 4));
    const landMaterial = material(0xffffff, .56); landMaterial.vertexColors = true; landMaterial.side = THREE.DoubleSide;
    land = new THREE.Mesh(geometry, landMaterial); land.renderOrder = 19; land.userData = { kind: 'regional-relative-low-gentle-reading', scope: '相同角度窗口内的相对地形读法，不是城市、耕地、草场或可建设用地边界', samples: window.cells }; landRoot.add(land);
    const high = [...window.cells].sort((a, b) => b.metres - a.metres);
    flows.forEach((flow, i) => {
      if (flow.trace) { flowRoot.remove(flow.trace); flow.trace.geometry.dispose(); flow.trace.material.dispose(); flow.trace = undefined; }
      const seed = high[Math.floor(high.length * (.08 + .13 * i))];
      flow.points = cityComparisonDownhill(runtime.metres, seed.longitude, seed.latitude, 28);
      if (flow.points.length > 1) {
        flow.trace = tube(flow.points.map(p => runtime.at(p.longitude, p.latitude, .095)), TEAL, .037, .87);
        flow.trace.userData = { kind: 'regional-dem-downhill-process-not-river', samples: flow.points }; flowRoot.add(flow.trace);
      }
    });
    pins = (getRegionalJourney(city)?.points ?? []).map(point => {
      const pin = new THREE.Group(), halo = new THREE.Mesh(new THREE.RingGeometry(.12, .17, 36), material(colors[city], .85)); halo.rotation.x = -Math.PI / 2; halo.renderOrder = 31;
      const mast = line([new THREE.Vector3(), new THREE.Vector3()], colors[city], .85); (mast.material as THREE.LineBasicMaterial).depthTest = false; mast.renderOrder = 30;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 8), material(colors[city])); cap.renderOrder = 33;
      pin.add(halo, mast, cap); pin.userData = { kind: 'regional-source-place-locator', point, scope: point.scopeNote }; pointRoot.add(pin);
      return { point, group: pin, halo, mast, cap };
    });
    ready = true;
  };
  const projected = (point: THREE.Vector3) => { const p = point.clone().project(runtime.camera); return { x: (p.x + 1) * viewport.x / 2, y: (1 - p.y) * viewport.y / 2, z: p.z }; };
  const captionBox = (slot: number, text: string) => {
    const left = viewport.x > 900 ? 350 : 12, right = viewport.x - 20, available = right - left;
    const width = Math.min(available, Math.max(190, Math.min(320, text.length * 15 + 30)));
    return { x: left + available * [0.28, .72, .5][slot], y: 190 + slot * 34, width, height: 25 };
  };
  const caption = (slot: number, text: string, anchor: THREE.Vector3) => {
    const key = `slot-${slot}`; let item = captions.get(key);
    if (item?.text !== text) {
      if (item) { group.remove(item.sprite, item.leader); item.sprite.material.map?.dispose(); item.sprite.material.dispose(); item.leader.geometry.dispose(); (item.leader.material as THREE.Material).dispose(); }
      const sprite = label(text, '#eee8cb'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 44; sprite.userData = { kind: 'regional-journey-caption', text, slot };
      const leader = line([anchor, anchor], GOLD, .55); leader.renderOrder = 40; (leader.material as THREE.LineBasicMaterial).depthTest = false;
      item = { text, sprite, leader }; captions.set(key, item); group.add(sprite, leader);
    }
    const p = projected(anchor), box = captionBox(slot, text), image = item.sprite.material.map?.image as { width?: number; height?: number } | undefined;
    const aspect = (image?.width ?? 400) / (image?.height ?? 96), width = Math.min(box.width, aspect * 20), height = width / aspect;
    const left = viewport.x > 900 ? 350 : 12, x = THREE.MathUtils.clamp(box.x, left + width / 2, viewport.x - width / 2 - 12);
    item.sprite.position.set(x / viewport.x * 2 - 1, 1 - box.y / viewport.y * 2, .5).unproject(runtime.camera);
    const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), scale = item.sprite.position.distanceTo(runtime.camera.position) / focal;
    item.sprite.scale.set(width * scale, height * scale, 1); item.sprite.visible = item.leader.visible = p.z > -1 && p.z < 1; writeLine(item.leader, anchor, item.sprite.position);
  };
  return {
    group,
    occupied(settings: RegionalJourneyOverlaySettings, size: THREE.Vector2): AtlasLabelBox[] {
      if (settings.layer !== 'atlas-regional-journey') return [];
      viewport.copy(size); return [0, 1, 2].map(slot => captionBox(slot, '区域过程标注与真实地形资料的适用范围说明'));
    },
    update(settings: RegionalJourneyOverlaySettings, size: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-regional-journey'; if (!group.visible) return;
      viewport.copy(size); const state = regionalJourneyVisualState(settings), journey = getRegionalJourney(state.city);
      for (const item of captions.values()) item.sprite.visible = item.leader.visible = false;
      if (!journey) { group.visible = false; return; }
      if (currentCity !== state.city || !ready) build(state.city);
      if (!ready || !profile.length || !window || !profileTrace || !land) return;
      group.userData.state = state; group.userData.sourceGrid = 'Mapzen regional DEM · 约5–6km · 同底图高差×16';
      const ref = verifiedPlaceReferences[state.city], centre = runtime.at(ref.longitude, ref.latitude, .11);
      const heightPoint = sampleOn(profile, state.progress, .12), profileAction = state.action === 'valley' || state.action === 'observe';
      relief.visible = state.enabled && (profileAction || state.action === 'rain' || state.action === 'road');
      ground.visible = state.enabled && (state.action === 'water' || state.action === 'settlement' || state.action === 'observe' || state.action === 'road');
      atmosphere.visible = state.enabled && state.action === 'rain';
      access.visible = state.enabled && (state.action === 'rail' || state.action === 'road');
      sources.visible = true;
      scan.position.copy(heightPoint.position); scan.userData.sample = heightPoint;
      writeLine(ruler, runtime.baseline(heightPoint.longitude, heightPoint.latitude), heightPoint.position); setDraw(profileTrace, Math.max(.02, state.progress));
      const landActive = state.action !== 'water'; landRoot.visible = landActive; setDraw(land, .1 + state.advance * .9);
      // A declared seasonal teaching tint, never inferred snow/grass coverage.
      land.material.color.setHex(state.cold ? 0xaebfdf : 0xffffff);
      land.userData.seasonalTintIsIllustrative = true;
      flowRoot.visible = state.action === 'water' || state.action === 'observe';
      for (const column of levelColumns) {
        const reference = verifiedPlaceReferences[column.city], metres = runtime.metres(reference.longitude, reference.latitude);
        column.mast.visible = column.cap.visible = metres !== undefined;
        if (metres === undefined) continue;
        const top = runtime.at(reference.longitude, reference.latitude, .07); writeLine(column.mast, runtime.baseline(reference.longitude, reference.latitude), top); column.cap.position.copy(top); column.mast.userData.metres = metres;
      }
      const activePins = pins.filter(pin => state.pointIds.includes(pin.point.id));
      pins.forEach(pin => {
        pin.group.visible = activePins.includes(pin); if (!pin.group.visible) return;
        const [lon, lat] = pin.point.coordinates, position = runtime.at(lon, lat, .13), cap = position.clone().add(new THREE.Vector3(0, .28 + state.settle * .15, 0));
        pin.halo.position.copy(position); pin.halo.scale.setScalar(1 + state.settle * .55); pin.cap.position.copy(cap); writeLine(pin.mast, position, cap);
      });
      const focusedPin = activePins[0], anchor = focusedPin ? focusedPin.cap.position : centre;
      materialRings.forEach((ring, i) => {
        ring.visible = state.enabled && state.action === 'heritage'; ring.position.copy(anchor).add(new THREE.Vector3(0, .035 + i * .115, 0));
        ring.material.opacity = .12 + .65 * phase(state.progress, i * .2, Math.min(1, .45 + i * .2));
        ring.scale.setScalar(.8 + phase(state.progress, 0, .8) * .3);
      });
      for (const flow of flows) {
        const shown = state.enabled && flowRoot.visible && flow.points.length > 1;
        flow.bead.visible = shown;
        if (flow.trace) { flow.trace.visible = shown; setDraw(flow.trace, state.advance); }
        if (shown) flow.bead.position.copy(sampleOn(flow.points, state.advance, .14).position);
      }
      if (state.action === 'rain') {
        const airKey = `${state.city}:${state.flowDirection}`;
        if (currentAirKey !== airKey) {
          disposeTree(airPathRoot); airTrace = undefined; currentAirKey = airKey;
          const samples = Array.from({ length: 81 }, (_, index) => regionalJourneyAirPose(state.city, index / 80, runtime.metres, state.flowDirection));
          if (samples.every(sample => sample !== undefined)) {
            const points = samples.map(sample => { const point = runtime.baseline(sample!.longitude, sample!.latitude); point.y += runtime.metresToWorld(sample!.highestMetres) + .36; return point; });
            const ghost = line(points, 0x78d6e0, .28); (ghost.material as THREE.LineBasicMaterial).depthTest = false; ghost.renderOrder = 23;
            ghost.userData = { kind: 'regional-hypothetical-air-path-context', direction: state.flowDirection, scope: '沿谷或横山的假设来流方向，读取原始高程；不是实测风场或已测绘风道' }; airPathRoot.add(ghost);
            airTrace = tube(points, 0x78d6e0, .026, .78);
            airTrace.userData = { kind: 'regional-hypothetical-air-path', direction: state.flowDirection, samples, scope: ghost.userData.scope }; airPathRoot.add(airTrace);
          }
        }
        if (airTrace) setDraw(airTrace, state.advance);
        const air = regionalJourneyAirPose(state.city, state.advance, runtime.metres, state.flowDirection);
        if (air) {
          const position = runtime.baseline(air.longitude, air.latitude); position.y += runtime.metresToWorld(air.highestMetres) + .36;
          parcel.position.copy(position); parcel.scale.setScalar(air.expansion); halo.position.copy(position); halo.scale.setScalar(air.expansion);
          // The cold comparison lowers an authored moisture-supply condition;
          // no rainfall amount, observed snow line or climate series is output.
          const cloud = air.response * phase(state.progress, .36, .72) * (state.cold ? .3 : 1);
          parcel.material.color.setHex(state.cold ? 0xaec9f1 : TEAL);
          clouds.forEach((mesh, i) => { mesh.position.copy(position).add(new THREE.Vector3(Math.sin(i * 2.4) * .24, .16 + (i % 2) * .08, Math.cos(i * 2.4) * .16)); mesh.material.opacity = cloud * .85; });
          const groundPoint = runtime.at(air.longitude, air.latitude, .1), rainfall = cloud * phase(state.progress, .64, .95);
          drops.forEach(({ mesh, phase: offset }, i) => {
            const t = (state.progress * 3 + offset) % 1; mesh.visible = rainfall > .02; mesh.material.opacity = rainfall * .9;
            mesh.position.copy(position).lerp(groundPoint, t).add(new THREE.Vector3(Math.sin(i * 2.4) * .2, 0, Math.cos(i * 2.4) * .15));
          });
          caption(0, `${state.city === 'chamdo' ? state.flowDirection === 'along-valley' ? '沿谷假设来流 · ' : '横山假设来流 · ' : ''}抬升约 ${Math.round(air.gainedMetres / 50) * 50} m`, parcel.position);
          caption(1, state.cold ? '冷季较少水汽条件对照 · 非预报' : '气团抬升 → 膨胀冷却 → 凝结条件', parcel.position);
          caption(2, state.enabled ? '冷暖条件为原理对照 · 非实测天气' : '过程关闭 · 真实地形保留', centre);
        }
      } else if (state.action === 'water') {
        caption(0, '水沿采样坡面下降 · 遇低点停止', flows[0].bead.visible ? flows[0].bead.position : centre);
        caption(1, '水的存在 ≠ 取供水设施已经到位', anchor);
        caption(2, '蓝线为坡面原理 · 非实际河渠网', centre);
      } else if (state.action === 'settlement') {
        caption(0, `真实地形窗口高差约 ${Math.round((window.maximum - window.minimum) / 50) * 50} m`, centre);
        caption(1, state.city === 'nagqu' ? '高地缓坡与草地生活还受季节约束' : '较低缓空间影响聚居与生产条件', centre);
        caption(2, state.cold ? '冷季配色为示意 · 非雪盖或植被图' : '绿：相对低缓 · 金：较高陡 · 非用途图', centre);
      } else if (state.action === 'heritage') {
        caption(0, focusedPin?.point.name ?? journey.title, anchor);
        caption(1, '材料按年代阅读 · 不是环境决定文化', centre);
        caption(2, '金环为材料累积符号 · 非古城范围', anchor);
      } else if (state.action === 'rail' || state.action === 'road') {
        const key = `${state.city}:${state.stage}:${state.cue}`;
        if (currentAccessKey !== key) {
          disposeTree(accessSpan); currentAccessKey = key;
          // The elevated link deliberately differs from a surveyed ground route.
          const start = activePins.length > 1 ? runtime.at(...activePins[1].point.coordinates, .18) : centre.clone();
          const end = focusedPin ? runtime.at(...focusedPin.point.coordinates, .18) : centre.clone();
          // Close or identical real references intentionally form a vertical
          // access loop. Do not displace a station to make an attractive arc.
          const midpoint = start.clone().lerp(end, .5).add(new THREE.Vector3(0, .65, 0)); accessCurve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
          const bridge = new THREE.Mesh(new THREE.TubeGeometry(accessCurve, 48, .025, 5, false), material(colors[state.city], .72)); bridge.userData = { kind: 'regional-transport-relationship-not-route', scope: '架空弧与移动方块表示接续关系，不提供铁路、公路、航路测绘或时刻表' }; bridge.renderOrder = 29; accessSpan.add(bridge);
        }
        exchanges.forEach((mesh, i) => {
          mesh.visible = Boolean(accessCurve) && state.progress > i / 24;
          if (!accessCurve) return;
          const t = (state.advance + i / exchanges.length) % 1; mesh.position.copy(accessCurve.getPoint(i % 2 ? 1 - t : t)); mesh.scale.setScalar(.65 + state.settle * .65);
        });
        caption(0, focusedPin?.point.name ?? '区域交通联系', anchor);
        caption(1, state.action === 'rail' ? '干线接入后仍需站城与公路接续' : '地形仍在 · 接续依赖公路与节点', centre);
        caption(2, '架空弧：联系原理 · 非真实线路', anchor);
      } else {
        caption(0, `采样高程约 ${Math.round(heightPoint.metres / 50) * 50} m`, heightPoint.position);
        caption(1, state.city === 'chamdo' || state.city === 'nagqu' ? '东西剖面 · 沿原区域高程读取' : '南北剖面 · 沿原区域高程读取', heightPoint.position);
        caption(2, '高差 ×16 · 格网约5–6km · 非道路', centre);
      }
      if (!state.enabled && state.action !== 'rain') caption(2, '过程关闭 · 真实地形与资料点保留', centre);
      // Place names, dates and the current causal claim belong to this exact
      // authored recording, rather than repeating generic history labels.
      const currentCue=journey.stages[state.stage].cues[state.cue];
      const annotation=regionalJourneyAnnotations[currentCue.id];
      if(annotation&&state.enabled){
        if(state.action==='heritage'||state.action==='rail'||state.action==='road'){
          caption(0,annotation.title,anchor);caption(1,annotation.reason,centre);caption(2,annotation.effect,anchor);
        }else if(state.action==='observe'){
          caption(1,annotation.reason,heightPoint.position);caption(2,annotation.effect,anchor);
        }else{
          caption(1,annotation.reason,state.action==='rain'?parcel.position:anchor);
          caption(2,annotation.effect,centre);
        }
      }
    },
    dispose() { captions.clear(); },
  };
}
