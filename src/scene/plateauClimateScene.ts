import * as THREE from 'three';
import { GOLD, TEAL, label, latLon, line } from './environment';
import { loadElevationGrid, sampleElevationMetres, elevationDescriptors } from '../lib/elevationReading';
import { plateauClimateState, plateauParcelPosition, plateauAirResponse, type PlateauClimateStage } from '../lib/plateauClimateState';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; focus: (position: THREE.Vector3, target: THREE.Vector3) => void };
export const PLATEAU_CLIMATE_SCENE = { radius: 4, verticalExaggeration: 50, dataUrl: elevationDescriptors.regional.dataUrl, sourceUrl: elevationDescriptors.regional.sourceUrl } as const;
const { radius: R, verticalExaggeration: EXAGGERATION } = PLATEAU_CLIMATE_SCENE;
const meta = elevationDescriptors.regional;
const clamp = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smooth = (value: number, start: number, end: number) => THREE.MathUtils.smoothstep(value, start, end);
const inGrid = (lon: number, lat: number) => lon >= meta.west && lon <= meta.east && lat >= meta.south && lat <= meta.north;

/** Real metre elevations and teaching air clearance are kept separate. */
export function plateauTerrainMetres(grid: ArrayLike<number>, longitude: number, latitude: number) {
  return inGrid(longitude, latitude) ? sampleElevationMetres(grid, meta, longitude, latitude) : undefined;
}
export function plateauTerrainPosition(grid: ArrayLike<number> | undefined, longitude: number, latitude: number, clearanceMetres = 0) {
  const height = grid && inGrid(longitude, latitude) ? Math.max(0, sampleElevationMetres(grid, meta, longitude, latitude)) : 0;
  return latLon(latitude, longitude, R + (height + Math.max(0, clearanceMetres)) / 6371000 * R * EXAGGERATION + .002);
}

/** The authored parcel clears every intervening terrain sample. This is an
 * explanatory trajectory over a real grid, not a measured local wind path. */
export function plateauAirPose(grid: ArrayLike<number>, progress: number) {
  const point = plateauParcelPosition(progress); let highest = 0;
  for (let i = 0; i <= 100; i++) {
    const previous = plateauParcelPosition(clamp(progress) * i / 100);
    highest = Math.max(highest, sampleElevationMetres(grid, meta, previous.longitude, previous.latitude));
  }
  const terrainMetres = sampleElevationMetres(grid, meta, point.longitude, point.latitude);
  const teachingClearanceMetres = Math.max(1000, highest - terrainMetres + 1000) + 400 * smooth(progress, .35, .8);
  return { ...point, terrainMetres, teachingClearanceMetres, position: plateauTerrainPosition(grid, point.longitude, point.latitude, teachingClearanceMetres) };
}

export type PlateauSlopePoint = { longitude: number; latitude: number; metres: number };
/** Greedy 8-neighbour descent on this DEM. No channel or drainage topology is
 * inferred: stop at a local low point, at the data edge or after a short slope. */
export function plateauDownhillPath(grid: ArrayLike<number>, longitude: number, latitude: number, maximumSteps = 24): PlateauSlopePoint[] {
  if (!inGrid(longitude, latitude)) return [];
  const dx = (meta.east - meta.west) / (meta.columns - 1), dy = (meta.north - meta.south) / (meta.rows - 1);
  const first = { longitude, latitude, metres: sampleElevationMetres(grid, meta, longitude, latitude) }, points = [first];
  for (let step = 0; step < Math.max(0, Math.min(80, maximumSteps)); step++) {
    const current = points[points.length - 1]; let next: PlateauSlopePoint | undefined, bestSlope = 0;
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
      if (!x && !y) continue;
      const lon = current.longitude + x * dx, lat = current.latitude + y * dy; if (!inGrid(lon, lat)) continue;
      const metres = sampleElevationMetres(grid, meta, lon, lat), drop = current.metres - metres;
      const distance = Math.hypot(x * dx * Math.cos(lat * Math.PI / 180), y * dy);
      let monotonic = true, previous = current.metres;
      for (let sample = 1; sample <= 4; sample++) { const height = sampleElevationMetres(grid, meta, THREE.MathUtils.lerp(current.longitude, lon, sample / 4), THREE.MathUtils.lerp(current.latitude, lat, sample / 4)); if (height > previous + .01) monotonic = false; previous = height; }
      if (monotonic && drop > .1 && drop / distance > bestSlope) { bestSlope = drop / distance; next = { longitude: lon, latitude: lat, metres }; }
    }
    if (!next) break; points.push(next);
  }
  return points;
}

/** Shared explicit playback fraction, independent of frame time. */
export function plateauSlopePointAt(points: PlateauSlopePoint[], progress: number): PlateauSlopePoint | undefined {
  if (!points.length) return;
  const scaled = clamp(progress) * (points.length - 1), index = Math.min(points.length - 1, Math.floor(scaled));
  const first = points[index], second = points[Math.min(points.length - 1, index + 1)], t = scaled - index;
  return { longitude: THREE.MathUtils.lerp(first.longitude, second.longitude, t), latitude: THREE.MathUtils.lerp(first.latitude, second.latitude, t), metres: THREE.MathUtils.lerp(first.metres, second.metres, t) };
}

/** Continuous camera path: the geographical object never changes or detaches. */
export function plateauClimateCamera(stage: PlateauClimateStage, progress: number) {
  if (stage === 'uplift' || stage === 'cloud') {
    const normal = latLon(28.1, 94.4, 1), north = new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize(), east = latLon(0, 184.4, 1);
    const target = normal.clone().multiplyScalar(R + .105);
    return { position: target.clone().addScaledVector(normal, .85).addScaledVector(north, -.85).addScaledVector(east, .24), target };
  }
  const normal = latLon(31, 89, 1), north = new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize(), east = latLon(0, 179, 1);
  const target = normal.clone().multiplyScalar(R + .1);
  const regional = target.clone().addScaledVector(normal, 1.45).addScaledVector(north, -1.62).addScaledVector(east, .46);
  if (stage !== 'arrival') return { position: regional, target };
  const t = clamp(progress), global = latLon(12, 67, 14.5), asia = latLon(23, 86, 7.4);
  if (t < .55) return { position: global.lerp(asia, smooth(t, 0, .55)), target: new THREE.Vector3() };
  const close = smooth(t, .55, 1);
  return { position: asia.lerp(regional, close), target: new THREE.Vector3().lerp(target, close) };
}

type Callout = { id: string; sprite: THREE.Sprite; leader: THREE.Line; pin: THREE.Mesh; width: number; offset: [number, number]; anchor: () => THREE.Vector3; visible: (state: ReturnType<typeof plateauClimateState>) => boolean; selectable: boolean };
type OutlineGeometry = { type: string; coordinates: number[][][] | number[][][][] };

export function buildPlateauClimateScene(runtime: Runtime) {
  const group = new THREE.Group(); group.userData.kind = 'continuous-globe-plateau-climate'; group.userData.verticalExaggeration = EXAGGERATION;
  let alive = true, grid: Int16Array | undefined, texture: THREE.Texture | undefined;
  const material = new THREE.MeshStandardMaterial({ color: 0xb7c3b4, roughness: .98 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 96), material); earth.userData.blocksSelection = true; earth.userData.guideId = 'circulation-ocean'; earth.userData.guideAnchor = latLon(8, 79, R); group.add(earth);
  const reliefMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .98, transparent: true, vertexColors: true, side: THREE.DoubleSide });
  const relief = new THREE.Group(); relief.userData.kind = 'real-dem-on-same-earth'; relief.userData.guideId = 'circulation-plateau'; relief.userData.guideAnchor = plateauTerrainPosition(undefined, 87, 34.5); group.add(relief);
  const atmosphericRim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 72, 48), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-max(dot(n,v),0.),4.);gl_FragColor=vec4(.34,.65,.68,rim*.2);}',
    transparent: true, depthWrite: false,
  })); group.add(atmosphericRim);
  const localLight = new THREE.DirectionalLight(0xffedc9, 1.15); localLight.position.copy(latLon(55, 45, 10)); group.add(localLight);

  const surfacePoint = (lon: number, lat: number, clearance = 0) => plateauTerrainPosition(grid, lon, lat, clearance);
  const scope = new THREE.Group(); scope.userData.kind = 'source-geographic-boundary'; group.add(scope);
  const cityMarkers = ['nyingchi', 'lhasa', 'ngari'].map(id => {
    const ref = verifiedPlaceReferences[id];
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 10), new THREE.MeshBasicMaterial({ color: GOLD })); pin.userData.selectId = pin.userData.guideId = id; pin.userData.guideAnchor = new THREE.Vector3();
    const ring = new THREE.Mesh(new THREE.RingGeometry(.025, .032, 48), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false })); ring.userData.selectId = id;
    const stem = line([new THREE.Vector3(), new THREE.Vector3()], GOLD, .7); group.add(pin, ring, stem); return { id, ref, pin, ring, stem };
  });
  const heightReferences = cityMarkers.map(item => {
    const stem = line([new THREE.Vector3(), new THREE.Vector3()], GOLD, .6, true); (stem.material as THREE.LineDashedMaterial).depthTest = false; stem.renderOrder = 6;
    const base = new THREE.Mesh(new THREE.RingGeometry(.008, .011, 32), new THREE.MeshBasicMaterial({ color: 0xe0c996, transparent: true, opacity: .65, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    stem.userData.kind = 'same-sea-level-city-elevation-reference'; stem.userData.referenceUnit = 'metres-above-sea-level';
    group.add(stem, base); return { id: item.id, stem, base };
  });

  const contexts = new THREE.Group(); contexts.userData.kind = 'conceptual-seasonal-transport-context'; group.add(contexts);
  const paths: { id: string; locations: [number, number][]; line: THREE.Line; head: THREE.Mesh; curve?: THREE.CatmullRomCurve3 }[] = [];
  for (const item of [
    { id: 'circulation-south', color: TEAL, locations: [[76, -3], [84, 11], [91, 22], [94, 27], [94.6, 30]] as [number, number][] },
    { id: 'circulation-west', color: GOLD, locations: [[46, 37], [62, 36], [77, 34], [88, 33]] as [number, number][] },
  ]) {
    const path = line(Array.from({ length: 121 }, () => new THREE.Vector3()), item.color, .72);
    path.userData.guideAnchor = item.id; path.userData.selectId = item.id;
    const head = new THREE.Mesh(new THREE.ConeGeometry(.04, .13, 10), new THREE.MeshBasicMaterial({ color: item.color })); head.userData.guideId = item.id; head.userData.guideAnchor = new THREE.Vector3();
    contexts.add(path, head); paths.push({ ...item, line: path, head });
  }

  const process = new THREE.Group(); process.userData.kind = 'air-water-process-on-real-terrain'; group.add(process);
  const pathGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 161 }, () => new THREE.Vector3()));
  const airTrace = new THREE.Line(pathGeometry, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: .8 })); process.add(airTrace);
  airTrace.userData.guideAnchor = 'cloud-inflow';
  const parcelMaterial = new THREE.MeshBasicMaterial({ color: 0xf0c67a, transparent: true, opacity: .12, depthWrite: false });
  const parcel = new THREE.Mesh(new THREE.SphereGeometry(.022, 24, 18), parcelMaterial); parcel.userData.selectId = parcel.userData.guideAnchor = 'cloud-lift';
  parcel.userData.kind = 'terrain-following-conceptual-air-parcel';
  for (let axis = 0; axis < 3; axis++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.0225, .00045, 5, 64), new THREE.MeshBasicMaterial({ color: 0xf4ce79, transparent: true, opacity: .62, depthWrite: false }));
    if (axis === 1) ring.rotation.x = Math.PI / 2; if (axis === 2) ring.rotation.y = Math.PI / 2; parcel.add(ring);
  }
  process.add(parcel);
  const waterMolecules = Array.from({ length: 18 }, (_, i) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.0025, 8, 6), new THREE.MeshBasicMaterial({ color: TEAL }));
    const y = 1 - 2 * (i + .5) / 18, angle = i * 2.399963; dot.position.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle)).multiplyScalar(.014);
    parcel.add(dot); return dot;
  });
  // Explicit anchors belong to the actual moving geometry, in that object's
  // local coordinates. Legacy string guideAnchor fields remain on the traces
  // and selectable process objects for existing scene selection/readers.
  const airHead = new THREE.Mesh(new THREE.ConeGeometry(.009, .035, 10), new THREE.MeshBasicMaterial({ color: GOLD })); airHead.userData.guideId = 'cloud-inflow'; airHead.userData.guideAnchor = new THREE.Vector3(); process.add(airHead);
  const terrainProbe = new THREE.Mesh(new THREE.RingGeometry(.009, .013, 32), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, depthWrite: false })); terrainProbe.userData.kind = 'real-elevation-ground-probe'; process.add(terrainProbe);
  const clearanceLine = line([new THREE.Vector3(), new THREE.Vector3()], GOLD, .48, true); process.add(clearanceLine);
  const cloudGroup = new THREE.Group(); cloudGroup.userData.selectId = cloudGroup.userData.guideAnchor = 'cloud-condense'; process.add(cloudGroup);
  const cloudPuffs = Array.from({ length: 9 }, (_, i) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(.018, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe3ece9, transparent: true, opacity: .8, depthWrite: false }));
    puff.position.set(Math.sin(i * 2.4) * .027, Math.cos(i * 3.1) * .012, Math.cos(i * 2.4) * .025); cloudGroup.add(puff); return puff;
  });
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(42 * 6), 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0x81d6eb, transparent: true, opacity: .9 })); rain.userData.selectId = rain.userData.guideAnchor = 'cloud-precipitation'; process.add(rain);
  const wetSpots = Array.from({ length: 12 }, (_, i) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.012, 20), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: .4, depthWrite: false, side: THREE.DoubleSide })); disc.userData.guideAnchor = 'cloud-runoff'; process.add(disc); return { disc, longitudeOffset: Math.cos(i * 2.4) * .3, latitudeOffset: Math.sin(i * 2.4) * .25 };
  });
  const slopeFlows = [0, 14, 28].map(seed => {
    const trace = line([new THREE.Vector3(), new THREE.Vector3()], 0x58e0d0, .92); trace.userData.guideAnchor = 'cloud-runoff'; trace.userData.kind = 'sampled-downhill-slope-not-measured-channel';
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0x9bfff0 })); dot.userData.guideId = 'cloud-runoff'; dot.userData.guideAnchor = new THREE.Vector3();
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.004, .015, 8), new THREE.MeshBasicMaterial({ color: 0x85f5df }));
    process.add(trace, dot, tip); return { seed, trace, dot, tip, path: [] as PlateauSlopePoint[], key: '' };
  });

  // A ground-following section poses questions about land and access. It is
  // explicitly not a surveyed road, river, settlement footprint or supply link.
  const lifeSection = line(Array.from({ length: 65 }, () => new THREE.Vector3()), GOLD, .8);
  lifeSection.userData.kind = 'city-ground-section-not-route'; group.add(lifeSection);
  const callouts: Callout[] = [];
  const addCallout = (id: string, text: string, anchor: () => THREE.Vector3, visible: Callout['visible'], offset: [number, number], color = '#e7e9d8', selectable = false) => {
    const sprite = label(text, color, 2); sprite.onBeforeRender = () => {}; sprite.userData.screenAnnotation = true; sprite.renderOrder = 20;
    const leader = line([new THREE.Vector3(), new THREE.Vector3()], color === '#a7e5e0' ? TEAL : GOLD, .65); (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 19;
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.005, 10, 8), new THREE.MeshBasicMaterial({ color: GOLD }));
    if (selectable) { sprite.userData.selectId = id; pin.userData.selectId = id; }
    group.add(sprite, leader, pin); callouts.push({ id, sprite, leader, pin, width: text.length * 12 + 15, offset, anchor, visible, selectable });
  };
  addCallout('circulation-ocean', '印度洋 · 水汽来源背景', () => surfacePoint(79, 8), state => state.stage === 'arrival' && state.progress < .77, [-40, 25], '#a7e5e0');
  addCallout('circulation-west', '西侧来流 · 也可携带水汽', () => surfacePoint(62, 36, 900), state => state.stage === 'arrival' && state.progress < .77, [-42, -30]);
  addCallout('circulation-plateau', '青藏高原 · 高程垂直夸张 50×', () => surfacePoint(87, 34.5, 300), state => state.stage === 'arrival' || state.stage === 'uplift', [-30, -25]);
  addCallout('cloud-inflow', '空气来向 · 教学路径', () => surfacePoint(94, 26.2, 1000), state => state.stage === 'uplift', [-40, 28]);
  addCallout('cloud-lift', '同一气团 · 上升与膨胀', () => parcel.position.clone(), state => state.stage === 'uplift', [56, -18]);
  addCallout('terrain-reading', '地面海拔', () => { if (['regions', 'life'].includes(currentStage)) { const ref = verifiedPlaceReferences[currentCity]; return surfacePoint(ref.longitude, ref.latitude, 40); } return terrainProbe.position.clone(); }, state => ['uplift', 'cloud', 'regions', 'life'].includes(state.stage), [-120, -10], '#f1d69c');
  addCallout('cloud-condense', '凝结成云', () => cloudGroup.position.clone(), state => state.stage === 'cloud' && state.cloudAmount > .01, [110, -55], '#e5efef');
  addCallout('cloud-precipitation', '雨滴落地', () => cloudGroup.position.clone().multiplyScalar(.994), state => state.stage === 'cloud' && state.rainAmount > .05, [110, 55], '#a7e5e0');
  addCallout('cloud-runoff', '坡面去向 · 非实测河道', () => slopeFlows[0].dot.position.clone(), state => state.stage === 'cloud' && state.runoffAmount > .01, [-110, 65], '#a7e5e0');
  for (const item of cityMarkers) addCallout(item.id, item.id === 'ngari' ? '阿里 · 狮泉河聚居地参考' : item.id === 'lhasa' ? '拉萨 · 河谷城区参考' : '林芝 · 藏东南城区参考', () => item.pin.position.clone(), state => ['regions', 'life'].includes(state.stage) || state.stage === 'arrival' && state.progress > .82, item.id === 'ngari' ? [-50, -25] : item.id === 'lhasa' ? [0, 42] : [55, -20], '#eee1b9', true);
  addCallout('life-section', '地形剖面 · 非道路或水系', () => { const ref = verifiedPlaceReferences[currentCity]; return surfacePoint(ref.longitude, ref.latitude + .5, 100); }, state => state.stage === 'life', [24, -45]);
  addCallout('city-sea-level', '共同参照 · 海平面 0 m', () => { const ref = verifiedPlaceReferences[currentCity]; return latLon(ref.latitude, ref.longitude, R); }, state => state.stage === 'regions', [95, 55], '#d8ddc2');
  let currentCity = 'nyingchi', currentStage: PlateauClimateStage = 'arrival';
  const readingCallout = callouts.find(item => item.id === 'terrain-reading')!;
  const readingCanvas = document.createElement('canvas'); readingCanvas.width = 760; readingCanvas.height = 90;
  const readingContext = readingCanvas.getContext('2d')!, readingTexture = new THREE.CanvasTexture(readingCanvas); readingTexture.colorSpace = THREE.SRGBColorSpace;
  readingCallout.sprite.material.map?.dispose(); readingCallout.sprite.material.map = readingTexture; readingCallout.sprite.material.needsUpdate = true; readingCallout.width = 175;
  let lastReading = -Infinity, airSamples: THREE.Vector3[] = [], initialAirRadius: number = R;

  const ready = Promise.all([
    loadElevationGrid('regional'),
    new Promise<THREE.Texture>((resolve, reject) => new THREE.TextureLoader().load('/assets/earth-blue-marble.jpg', resolve, undefined, reject)),
    fetch('/assets/earth-context.json').then(response => response.ok ? response.json() : undefined).catch(() => undefined),
  ]).then(([loaded, image, reference]) => {
    if (!alive) { image.dispose(); return; }
    grid = loaded; texture = image; image.colorSpace = THREE.SRGBColorSpace; image.anisotropy = Math.min(8, runtime.renderer.capabilities.getMaxAnisotropy());
    relief.userData.guideAnchor.copy(surfacePoint(87, 34.5));
    material.map = image; material.color.set(0xffffff); material.needsUpdate = true; reliefMaterial.map = image;
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
    const nx = 280, ny = 160;
    for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
      const lon = THREE.MathUtils.lerp(meta.west, meta.east, x / nx), lat = THREE.MathUtils.lerp(meta.south, meta.north, y / ny);
      positions.push(...surfacePoint(lon, lat).toArray()); uvs.push((lon + 180) / 360, (lat + 90) / 180);
      // Fade the data coverage edge rather than pretending its rectangular
      // extent is a real vertical cliff. Every visible vertex keeps its metre value.
      const alpha = smooth(Math.min(lon - meta.west, meta.east - lon, lat - meta.south, meta.north - lat), 0, .55);
      colors.push(1, 1, 1, alpha);
      if (x < nx && y < ny) { const a = y * (nx + 1) + x, b = a + nx + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4)); geometry.setIndex(indices); geometry.computeVertexNormals();
    relief.add(new THREE.Mesh(geometry, reliefMaterial)); reliefMaterial.needsUpdate = true;
    airSamples = Array.from({ length: 161 }, (_, i) => plateauAirPose(loaded, i / 160).position);
    airTrace.geometry.setFromPoints(airSamples); initialAirRadius = plateauAirPose(loaded, .1).position.length();
    const boundary = reference?.tibet as OutlineGeometry | undefined;
    if (boundary) {
      const polygons = boundary.type === 'Polygon' ? [boundary.coordinates as number[][][]] : boundary.coordinates as number[][][][];
      for (const polygon of polygons) for (const ring of polygon) {
        const points = ring.map(([lon, lat]) => surfacePoint(lon, lat, 90)); if (points.length > 2) scope.add(line(points, 0xd8e1c8, .52));
      }
    }
    for (const path of paths) {
      const vertices = path.locations.map(([lon, lat]) => surfacePoint(lon, lat, 1600));
      // Resample the geographic curve before lifting each sample above terrain,
      // preventing a smooth chord from cutting through the globe or mountains.
      const coordinates = new THREE.CatmullRomCurve3(path.locations.map(([lon, lat]) => new THREE.Vector3(lon, lat, 0)));
      const points = Array.from({ length: 121 }, (_, i) => { const point = coordinates.getPoint(i / 120); return surfacePoint(point.x, point.y, 1800); });
      path.curve = new THREE.CatmullRomCurve3(points); path.line.geometry.setFromPoints(points); path.line.geometry.computeBoundingSphere();
      path.head.position.copy(vertices[0]);
    }
    group.userData.dataReady = true;
  });

  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screen = new THREE.Vector3(), normal = new THREE.Vector3(), tangent = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let previousStage = '', previousCity = '', previousArrival = -1, previousViewport = '', previousPathProgress = -1;
  return {
    group, ready,
    dispose() { alive = false; if (!grid) reliefMaterial.dispose(); if (texture && material.map !== texture) texture.dispose(); },
    update(p: TibetSceneProps) {
      const state = plateauClimateState(p); currentCity = state.city; currentStage = state.stage;
      runtime.renderer.getSize(viewport); const sizeKey = `${Math.round(viewport.x)}:${Math.round(viewport.y)}`;
      if (state.stage !== previousStage || state.city !== previousCity || sizeKey !== previousViewport || state.stage === 'arrival' && Math.abs(state.progress - previousArrival) > .003) {
        const pose = plateauClimateCamera(state.stage, state.progress); runtime.focus(pose.position, pose.target);
        previousStage = state.stage; previousCity = state.city; previousViewport = sizeKey; previousArrival = state.progress;
      }
      if (!grid) return;
      const processVisible = state.stage === 'uplift' || state.stage === 'cloud'; process.visible = processVisible;
      contexts.visible = state.stage === 'arrival' || state.stage === 'uplift' || state.stage === 'regions';
      scope.visible = state.stage === 'arrival' && state.progress > .52 || ['regions', 'life'].includes(state.stage);
      for (const path of paths) {
        const emphasized = path.id === 'circulation-west' || state.season !== 'winter';
        (path.line.material as THREE.LineBasicMaterial).opacity = emphasized ? .78 : .15; path.head.visible = emphasized;
        if (path.curve) { const at = (state.progress * .8 + (path.id === 'circulation-west' ? .12 : 0)) % 1; path.head.position.copy(path.curve.getPoint(at)); tangent.copy(path.curve.getTangent(at)).normalize(); path.head.quaternion.setFromUnitVectors(up, tangent); }
      }
      const pose = plateauAirPose(grid, state.parcelProgress);
      group.userData.parcelTerrainMetres = pose.terrainMetres; group.userData.parcelCoordinates = [pose.longitude, pose.latitude];
      const teachingLiftMetres = Math.max(0, (pose.position.length() - initialAirRadius) / (R / 6371000 * EXAGGERATION));
      const response = plateauAirResponse(teachingLiftMetres);
      parcel.position.copy(pose.position); parcel.scale.setScalar(response.expansion); parcelMaterial.color.set(0xe6be71).lerp(new THREE.Color(0xe9d8a5), response.cooling);
      const groundProbe = surfacePoint(pose.longitude, pose.latitude, 40); terrainProbe.position.copy(groundProbe); terrainProbe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), groundProbe.clone().normalize());
      clearanceLine.geometry.setFromPoints([groundProbe, pose.position]); clearanceLine.computeLineDistances();
      const reference = verifiedPlaceReferences[state.city];
      const readingHeight = ['regions', 'life'].includes(state.stage) ? sampleElevationMetres(grid, meta, reference.longitude, reference.latitude) : pose.terrainMetres;
      const roundedHeight = Math.round(readingHeight / 50) * 50;
      if (roundedHeight !== lastReading) {
        lastReading = roundedHeight; readingContext.clearRect(0, 0, 760, 90); readingContext.fillStyle = 'rgba(5,20,22,.88)'; readingContext.beginPath(); readingContext.roundRect(4, 4, 752, 82, 12); readingContext.fill(); readingContext.font = '500 40px "Microsoft YaHei",sans-serif'; readingContext.textAlign = 'center'; readingContext.textBaseline = 'middle'; readingContext.lineWidth = 8; readingContext.strokeStyle = 'rgba(5,13,9,.9)'; readingContext.fillStyle = '#f1d69c'; const text = `地面约 ${roundedHeight.toLocaleString('zh-CN')} m`; readingContext.strokeText(text, 380, 45); readingContext.fillText(text, 380, 45); readingTexture.needsUpdate = true;
      }
      waterMolecules.forEach((dot, index) => { dot.visible = state.moisture === 'higher' || index < 5; });
      if (previousPathProgress !== state.parcelProgress) {
        airTrace.geometry.setDrawRange(0, Math.max(2, Math.floor(state.parcelProgress * (airSamples.length - 1)) + 1)); airTrace.geometry.computeBoundingSphere(); previousPathProgress = state.parcelProgress;
      }
      tangent.copy(plateauAirPose(grid, Math.min(1, state.parcelProgress + .01)).position).sub(plateauAirPose(grid, Math.max(0, state.parcelProgress - .01)).position).normalize(); airHead.position.copy(pose.position); airHead.quaternion.setFromUnitVectors(up, tangent);
      cloudGroup.position.copy(pose.position).addScaledVector(pose.position.clone().normalize(), .012); cloudGroup.scale.setScalar(.35 + state.cloudAmount * 1.1); cloudGroup.visible = state.cloudAmount > .015;
      cloudPuffs.forEach((puff, index) => { puff.material.opacity = state.cloudAmount * (.55 + (index % 3) * .12); });
      rain.visible = state.rainAmount > .01;
      const drops = rain.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 42; i++) {
        const lon = pose.longitude + Math.cos(i * 2.399) * .31, lat = pose.latitude + Math.sin(i * 2.399) * .27;
        const ground = surfacePoint(lon, lat, 15), above = latLon(lat, lon, Math.max(pose.position.length() + .02, ground.length() + .04)), at = (state.progress * 4 + i / 42) % 1;
        const start = above.clone().lerp(ground, at), end = above.clone().lerp(ground, Math.min(1, at + .08));
        drops.setXYZ(i * 2, start.x, start.y, start.z); drops.setXYZ(i * 2 + 1, end.x, end.y, end.z);
      }
      drops.needsUpdate = true; rain.geometry.computeBoundingSphere(); (rain.material as THREE.LineBasicMaterial).opacity = state.rainAmount * .95;
      wetSpots.forEach(({ disc, longitudeOffset, latitudeOffset }, i) => {
        disc.visible = state.runoffAmount > .01; const position = surfacePoint(pose.longitude + longitudeOffset, pose.latitude + latitudeOffset, 35); disc.position.copy(position); disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize());
        disc.scale.setScalar((.45 + state.runoffAmount * 1.3) * (1 + (i % 3) * .15)); disc.material.opacity = state.runoffAmount * .4;
      });
      for (const flow of slopeFlows) {
        const visible = state.stage === 'cloud' && state.runoffAmount > .001;
        flow.trace.visible = flow.dot.visible = flow.tip.visible = visible; if (!visible) continue;
        const lon = pose.longitude + Math.cos(flow.seed * 2.399) * .31, lat = pose.latitude + Math.sin(flow.seed * 2.399) * .27;
        const key = `${lon.toFixed(6)}:${lat.toFixed(6)}`;
        if (key !== flow.key) {
          flow.key = key; flow.path = plateauDownhillPath(grid, lon, lat);
          const points: THREE.Vector3[] = [];
          for (let i = 0; i < flow.path.length - 1; i++) for (let part = 0; part < 4; part++) { const a = flow.path[i], b = flow.path[i + 1], t = part / 4; points.push(surfacePoint(THREE.MathUtils.lerp(a.longitude, b.longitude, t), THREE.MathUtils.lerp(a.latitude, b.latitude, t), 80)); }
          const last = flow.path[flow.path.length - 1]; if (last) points.push(surfacePoint(last.longitude, last.latitude, 80));
          flow.trace.geometry.dispose(); flow.trace.geometry = new THREE.BufferGeometry().setFromPoints(points.length > 1 ? points : [surfacePoint(lon, lat, 80), surfacePoint(lon, lat, 80)]);
        }
        const point = plateauSlopePointAt(flow.path, state.runoffAmount); if (!point) { flow.trace.visible = flow.dot.visible = flow.tip.visible = false; continue; }
        flow.dot.position.copy(surfacePoint(point.longitude, point.latitude, 100)); flow.tip.position.copy(flow.dot.position);
        const next = plateauSlopePointAt(flow.path, Math.min(1, state.runoffAmount + .02)), before = plateauSlopePointAt(flow.path, Math.max(0, state.runoffAmount - .02));
        if (next && before) { tangent.copy(surfacePoint(next.longitude, next.latitude, 100)).sub(surfacePoint(before.longitude, before.latitude, 100)).normalize(); if (tangent.lengthSq() > 0) flow.tip.quaternion.setFromUnitVectors(up, tangent); }
        flow.tip.visible = flow.path.length > 1;
        flow.trace.visible = flow.path.length > 1; flow.trace.geometry.setDrawRange(0, Math.max(2, Math.ceil(flow.trace.geometry.attributes.position.count * state.runoffAmount)));
      }
      const cityView = ['regions', 'life'].includes(state.stage) || state.stage === 'arrival' && state.progress > .82;
      for (const item of cityMarkers) {
        const position = surfacePoint(item.ref.longitude, item.ref.latitude, 140), ground = surfacePoint(item.ref.longitude, item.ref.latitude);
        item.pin.position.copy(position); item.ring.position.copy(ground).addScaledVector(ground.clone().normalize(), .002); item.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ground.clone().normalize());
        const selected = state.city === item.id; item.pin.scale.setScalar(selected ? 1.2 : .75); item.ring.scale.setScalar(selected ? 1.25 : .75); item.ring.material.opacity = selected ? .95 : .4;
        item.pin.visible = item.ring.visible = item.stem.visible = cityView; item.stem.geometry.setFromPoints([ground, position]);
        const heightReference = heightReferences.find(value => value.id === item.id)!;
        heightReference.stem.visible = heightReference.base.visible = state.stage === 'regions';
        const seaLevel = latLon(item.ref.latitude, item.ref.longitude, R);
        heightReference.stem.geometry.setFromPoints([seaLevel, ground]); heightReference.stem.computeLineDistances();
        (heightReference.stem.material as THREE.LineDashedMaterial).opacity = selected ? .95 : .4;
        heightReference.base.position.copy(seaLevel); heightReference.base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), seaLevel.clone().normalize());
      }
      lifeSection.visible = state.stage === 'life';
      if (lifeSection.visible) {
        const ref = verifiedPlaceReferences[state.city], positions = lifeSection.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i++) { const point = surfacePoint(ref.longitude, ref.latitude - .65 + i / (positions.count - 1) * 1.3, 90); positions.setXYZ(i, point.x, point.y, point.z); }
        positions.needsUpdate = true; lifeSection.geometry.computeBoundingSphere(); lifeSection.geometry.setDrawRange(0, Math.max(2, Math.floor(65 * (.2 + .8 * state.progress))));
      }
      runtime.camera.updateMatrixWorld();
      const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), mobile = viewport.x < 550, height = mobile ? 23 : 25;
      const occupied: { x: number; y: number; w: number }[] = [], cameraPosition = runtime.camera.position;
      const ordered = [...callouts].sort((a, b) => Number(b.id === state.city) - Number(a.id === state.city));
      for (const item of ordered) {
        item.sprite.visible = item.leader.visible = item.pin.visible = false;
        if (!item.visible(state)) continue;
        const anchor = item.anchor(); normal.copy(anchor).normalize();
        if (normal.dot(cameraPosition.clone().sub(anchor).normalize()) < -.03) continue;
        projected.copy(anchor).project(runtime.camera); if (projected.z > 1 || projected.z < -1) continue;
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        if (ax < -25 || ax > viewport.x + 25 || ay < -25 || ay > viewport.y + 25) continue;
        const width = Math.min(viewport.x - 28, item.width * (mobile ? .86 : 1)), minX = width / 2 + 12, maxX = viewport.x - width / 2 - 12, minY = mobile ? 70 : 110, maxY = Math.max(minY + 25, viewport.y - (mobile ? 145 : 235));
        const desiredX = THREE.MathUtils.clamp(ax + item.offset[0], minX, maxX), desiredY = THREE.MathUtils.clamp(ay + item.offset[1], minY, maxY);
        let best: { x: number; y: number; cost: number } | undefined;
        for (const x of [desiredX, minX, maxX]) for (let y = minY; y <= maxY; y += height + 6) {
          if (occupied.some(box => Math.abs(x - box.x) < (width + box.w) / 2 + 7 && Math.abs(y - box.y) < height + 5)) continue;
          const cost = (x - desiredX) ** 2 + (y - desiredY) ** 2; if (!best || cost < best.cost) best = { x, y, cost };
        }
        if (!best) continue;
        occupied.push({ ...best, w: width }); screen.set(best.x / viewport.x * 2 - 1, 1 - best.y / viewport.y * 2, projected.z).unproject(runtime.camera);
        item.sprite.position.copy(screen); const size = height * screen.distanceTo(runtime.camera.position) / focal; item.sprite.scale.set(size * width / height, size, 1);
        item.leader.geometry.setFromPoints([anchor, screen]); item.pin.position.copy(anchor); item.sprite.visible = item.leader.visible = true; item.pin.visible = item.selectable;
        item.sprite.material.opacity = item.selectable && state.city !== item.id ? .74 : 1;
      }
    },
  };
}
