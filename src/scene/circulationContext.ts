import * as THREE from 'three';
import { GOLD, TEAL, label, line } from './environment';
import { sampleTerrainMetres, TERRAIN_READING_META } from './terrainReading';
import type { TibetSceneProps } from './TibetScene';

type Runtime = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  focus: (position: THREE.Vector3, target: THREE.Vector3) => void;
  hasSavedView: (key: string) => boolean;
};
import {circulationSeason,type SeasonContext} from '../lib/circulationState';
export {circulationSeason,circulationPhase,circulationContextState} from '../lib/circulationState';
type Layer = 'circulation' | 'wind' | 'water';
type Callout = {
  id: string; text: string; anchor: THREE.Vector3; sprite: THREE.Sprite; leader: THREE.Line;
  offset: [number, number]; show: (layer: Layer, season: SeasonContext, progress: number) => boolean;
};

/** Source geometry and elevation are distinct from the conceptual air paths. */
export const CIRCULATION_CONTEXT_META = {
  west: 48, east: 123, south: 0, north: 58, width: 32,
  verticalExaggeration: 70,
  image: '/assets/earth-blue-marble.jpg',
  elevation: TERRAIN_READING_META.dataUrl,
  elevationAttribution: TERRAIN_READING_META.attribution,
  sourceUrls: [
    'https://www.noaa.gov/jetstream/global/global-atmospheric-circulations',
    'https://oceanservice.noaa.gov/education/tutorial_currents/04currents1.html',
    'https://ieexa.cas.cn/news/kydt/202506/t20250606_7798567.html',
    'https://itpcas.cas.cn/new_kycg/new_kyjz/202605/t20260509_8198819.html',
  ],
} as const;

const { west, east, south, north, width: WIDTH } = CIRCULATION_CONTEXT_META;
const METRES_PER_UNIT = (east - west) * 111320 * Math.cos(THREE.MathUtils.degToRad((south + north) / 2)) / WIDTH;
const DEPTH = (north - south) * 111320 / METRES_PER_UNIT;
const toHeight = (metres: number) => metres / METRES_PER_UNIT * CIRCULATION_CONTEXT_META.verticalExaggeration;
export function circulationPosition(longitude: number, latitude: number, height = 0) {
  return new THREE.Vector3((longitude - (west + east) / 2) / (east - west) * WIDTH, height,
    ((north + south) / 2 - latitude) / (north - south) * DEPTH);
}
const point = (longitude: number, latitude: number, height: number) => circulationPosition(longitude, latitude, height);
const curve = (points: THREE.Vector3[]) => new THREE.CatmullRomCurve3(points, false, 'centripetal');
const smooth = THREE.MathUtils.smoothstep;

/** Relative to a parcel's forward direction, positive displacement lies on
 * its right in the map's east/north frame. This is an illustrative comparison,
 * not an integration of measured pressure, velocity or the Coriolis force.
 */
export function circulationDeflectionExample(background: SeasonContext) {
  const summerStart = point(75, 12, .28), summerForceEnd = point(80, 24, .5);
  const forward = summerForceEnd.clone().sub(summerStart); forward.y = 0;
  const rightOffset = new THREE.Vector3(-forward.z, 0, forward.x).normalize().multiplyScalar(1.1);
  const forceStart = background === 'winter' ? summerForceEnd.clone().add(rightOffset) : summerStart;
  const forceEnd = background === 'winter' ? summerStart.clone().add(rightOffset) : summerForceEnd;
  const offset = background === 'winter' ? rightOffset.clone().negate() : rightOffset;
  const points = Array.from({ length: 7 }, (_, index) => {
    const t = index / 6; return forceStart.clone().lerp(forceEnd, t).addScaledVector(offset, t * t);
  });
  return { forceStart, forceEnd, rightOffset: offset, points };
}

export function buildCirculationContextScene(runtime: Runtime) {
  const group = new THREE.Group(), terrainGroup = new THREE.Group(), gridGroup = new THREE.Group();
  group.add(terrainGroup, gridGroup);
  let alive = true, dem: Int16Array | null = null, loadFailed = false, previousLayer = '', previousView = '';
  const baseGeometry = new THREE.PlaneGeometry(WIDTH, DEPTH, 1, 1); baseGeometry.rotateX(-Math.PI / 2);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x688387, roughness: .94 });
  const base = new THREE.Mesh(baseGeometry, baseMaterial); base.receiveShadow = true; group.add(base);
  const setMapUV = (geometry: THREE.BufferGeometry, westBound: number, eastBound: number, southBound: number, northBound: number) => {
    const positions = geometry.attributes.position as THREE.BufferAttribute, uvs = geometry.attributes.uv as THREE.BufferAttribute;
    const minX = circulationPosition(westBound, 0).x, maxX = circulationPosition(eastBound, 0).x;
    const minZ = circulationPosition(0, northBound).z, maxZ = circulationPosition(0, southBound).z;
    for (let i = 0; i < positions.count; i++) {
      const longitude = THREE.MathUtils.lerp(westBound, eastBound, (positions.getX(i) - minX) / (maxX - minX));
      const latitude = THREE.MathUtils.lerp(northBound, southBound, (positions.getZ(i) - minZ) / (maxZ - minZ));
      uvs.setXY(i, (longitude + 180) / 360, (latitude + 90) / 180);
    }
    uvs.needsUpdate = true;
  };
  setMapUV(baseGeometry, west, east, south, north);
  const demColumns = 129, demRows = 73, bounds = TERRAIN_READING_META;
  const terrainWidth = (bounds.east - bounds.west) / (east - west) * WIDTH;
  const terrainDepth = (bounds.north - bounds.south) / (north - south) * DEPTH;
  const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, demColumns - 1, demRows - 1); terrainGeometry.rotateX(-Math.PI / 2);
  const terrainCenter = circulationPosition((bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2);
  terrainGeometry.translate(terrainCenter.x, 0, terrainCenter.z);
  setMapUV(terrainGeometry, bounds.west, bounds.east, bounds.south, bounds.north);
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0xd2d7c7, roughness: .94, side: THREE.DoubleSide });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial); terrain.visible = false; terrain.receiveShadow = true;
  terrain.userData.selectId = 'circulation-plateau'; terrain.userData.kind = 'sourced-terrain'; terrainGroup.add(terrain);
  const extentCoordinates: [number, number][] = [];
  for (let i = 0; i < 64; i++) extentCoordinates.push([THREE.MathUtils.lerp(bounds.west, bounds.east, i / 64), bounds.north]);
  for (let i = 0; i < 32; i++) extentCoordinates.push([bounds.east, THREE.MathUtils.lerp(bounds.north, bounds.south, i / 32)]);
  for (let i = 0; i < 64; i++) extentCoordinates.push([THREE.MathUtils.lerp(bounds.east, bounds.west, i / 64), bounds.south]);
  for (let i = 0; i <= 32; i++) extentCoordinates.push([bounds.west, THREE.MathUtils.lerp(bounds.south, bounds.north, i / 32)]);
  const extent = line(extentCoordinates.map(([longitude, latitude]) => point(longitude, latitude, .075)), TEAL, .6, true);
  extent.userData.kind = 'elevation-display-extent'; group.add(extent);
  new THREE.TextureLoader().load(CIRCULATION_CONTEXT_META.image, texture => {
    if (!alive) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, runtime.renderer.capabilities.getMaxAnisotropy());
    baseMaterial.map = terrainMaterial.map = texture; baseMaterial.color.set(0xffffff); terrainMaterial.color.set(0xd8e4d1);
    baseMaterial.needsUpdate = terrainMaterial.needsUpdate = true;
  });
  const terrainStatus = label('高原高程正在加载…', '#cfdbd8'); terrainStatus.onBeforeRender = () => {}; group.add(terrainStatus);
  const failedStatus = label('高程未加载 · 保留海陆位置，重进本节重试', '#e1bba1'); failedStatus.onBeforeRender = () => {}; failedStatus.visible = false; group.add(failedStatus);
  fetch(CIRCULATION_CONTEXT_META.elevation).then(response => {
    if (!response.ok) throw new Error('DEM unavailable'); return response.arrayBuffer();
  }).then(buffer => {
    if (!alive) return;
    if (buffer.byteLength !== bounds.columns * bounds.rows * 2) throw new Error('DEM invalid size');
    const bytes = new DataView(buffer); dem = new Int16Array(bounds.columns * bounds.rows);
    for (let i = 0; i < dem.length; i++) dem[i] = bytes.getInt16(i * 2, true);
    const positions = terrainGeometry.attributes.position as THREE.BufferAttribute;
    for (let row = 0; row < demRows; row++) for (let col = 0; col < demColumns; col++) {
      const longitude = THREE.MathUtils.lerp(bounds.west, bounds.east, col / (demColumns - 1));
      const latitude = THREE.MathUtils.lerp(bounds.north, bounds.south, row / (demRows - 1));
      positions.setY(row * demColumns + col, Math.max(.035, toHeight(sampleTerrainMetres(dem, longitude, latitude))));
    }
    positions.needsUpdate = true; terrainGeometry.computeVertexNormals(); terrainGeometry.computeBoundingSphere();
    const extentPositions = extent.geometry.attributes.position as THREE.BufferAttribute;
    extentCoordinates.forEach(([longitude, latitude], index) => extentPositions.setY(index, Math.max(.06, toHeight(sampleTerrainMetres(dem!, longitude, latitude))) + .065));
    extentPositions.needsUpdate = true; extent.computeLineDistances(); extent.geometry.computeBoundingSphere();
    terrain.visible = true; terrainStatus.visible = false;
  }).catch(() => { if (alive) { loadFailed = true; terrainStatus.visible = false; failedStatus.visible = true; } });

  for (const latitude of [0, 15, 30, 45]) gridGroup.add(line([point(west, latitude, .025), point(east, latitude, .025)], 0xc8d7cf, .17));
  for (const longitude of [60, 90, 120]) gridGroup.add(line([point(longitude, south, .025), point(longitude, north, .025)], 0xc8d7cf, .17));
  const latitudeLabels = [15, 30, 45].map(latitude => {
    const sprite = label(`${latitude}°N`, '#c2d4cf'); sprite.onBeforeRender = () => {}; group.add(sprite);
    return { sprite, anchor: point(west + .8, latitude, .06) };
  });
  const northArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), point(120, 49, .12), 2, 0xd8e2ce, .35, .2); group.add(northArrow);
  const northLabel = label('北', '#d8e2ce'); northLabel.onBeforeRender = () => {}; group.add(northLabel);
  const northAnchor = point(120, 55, .16);

  const heatPatch = (id: string, longitude: number, latitude: number, radius: number) => {
    const material = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .14, depthWrite: false });
    const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), material); patch.rotation.x = -Math.PI / 2; patch.position.copy(point(longitude, latitude, .065)); patch.userData.selectId = id; group.add(patch);
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - .025, radius + .025, 64), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(patch.position).add(new THREE.Vector3(0, .015, 0)); ring.userData.selectId = id; group.add(ring);
    return { patch, ring };
  };
  const ocean = heatPatch('circulation-ocean', 75, 12, 1.85), land = heatPatch('circulation-land', 80, 24, 1.55);
  const plateauLocator = heatPatch('circulation-plateau', 88, 33, 1.7); plateauLocator.patch.visible = false;
  plateauLocator.ring.position.y = 2.6; plateauLocator.ring.material.color.set(TEAL); plateauLocator.ring.material.opacity = .55;

  type AirPath = {
    kind: 'cell' | 'west' | 'south'; id: string; group: THREE.Group;
    summer: THREE.CatmullRomCurve3; winter: THREE.CatmullRomCurve3;
    line: THREE.Line; tube: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    winterTube?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    core: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    winterCore?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    air: THREE.Points; vapour: THREE.Points; tip: THREE.Mesh;
    airPositions: Float32Array; waterPositions: Float32Array;
    from: number; to: number;
  };
  const paths: AirPath[] = [];
  // Fixed-size glyphs remain legible on both dark ocean and bright satellite
  // terrain. Their size and halo identify objects; neither encodes an amount.
  const markerTexture = (ring: boolean) => {
    const size = 32, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      const offset = (y * size + x) * 4;
      const opacity = radius < .96 && (!ring || radius >= .46) ? 1 : 0;
      const bright = radius < .71 ? 255 : 13;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = bright;
      pixels[offset + 3] = opacity * 255;
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true; return texture;
  };
  const airMarker = markerTexture(false), waterMarker = markerTexture(true);
  const addPath = (id: string, kind: AirPath['kind'], points: THREE.Vector3[], from = 0, to = 1, winterPoints?: THREE.Vector3[]) => {
    const item = new THREE.Group(); item.userData.selectId = id; item.userData.airPath = kind; group.add(item);
    const summer = curve(points), winter = curve(winterPoints ?? points);
    const trace = line(summer.getPoints(160), 0xffdc8f, .95); trace.renderOrder = 3; item.add(trace);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(summer, 160, .13, 6, false), new THREE.MeshBasicMaterial({ color: 0x03202c, transparent: true, opacity: .78, depthWrite: false }));
    tube.renderOrder = 1; item.add(tube);
    const core = new THREE.Mesh(new THREE.TubeGeometry(summer, 160, .042, 6, false), new THREE.MeshBasicMaterial({ color: 0xffdc8f, transparent: true, opacity: .9, depthWrite: false }));
    core.renderOrder = 2; item.add(core);
    const winterTube = winterPoints ? new THREE.Mesh(new THREE.TubeGeometry(winter, 160, .13, 6, false), tube.material) : undefined;
    const winterCore = winterPoints ? new THREE.Mesh(new THREE.TubeGeometry(winter, 160, .042, 6, false), core.material) : undefined;
    if (winterTube) { winterTube.visible = false; winterTube.renderOrder = 1; item.add(winterTube); }
    if (winterCore) { winterCore.visible = false; winterCore.renderOrder = 2; item.add(winterCore); }
    const airPositions = new Float32Array(20 * 3), waterPositions = new Float32Array(20 * 3);
    const particles = (positions: Float32Array, color: number, size: number, map: THREE.Texture) => {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const object = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, map, transparent: true, opacity: 1, alphaTest: .1, depthWrite: false }));
      object.renderOrder = 5; item.add(object); return object;
    };
    const air = particles(airPositions, 0xffe8ae, 5.5, airMarker), vapour = particles(waterPositions, 0x76f7f2, 8, waterMarker);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.15, .44, 12), new THREE.MeshBasicMaterial({ color: 0xffe5a3 })); tip.renderOrder = 6; item.add(tip);
    paths.push({ kind, id, group: item, summer, winter, line: trace, tube, winterTube, core, winterCore, air, vapour, tip, airPositions, waterPositions, from, to });
  };
  // The principle loop is a sea/land comparison, not a sea-level pressure map
  // through the high plateau. Its curved lower branch illustrates rightward
  // deflection of a northward moving parcel in the Northern Hemisphere.
  const summerExample = circulationDeflectionExample('summer'), winterExample = circulationDeflectionExample('winter');
  const lowBranch = summerExample.points;
  addPath('circulation-land', 'cell', lowBranch, .28, .78, winterExample.points);
  const returnStart = lowBranch[lowBranch.length - 1], returnEnd = lowBranch[0];
  const returnBranch = [returnStart.clone(), returnStart.clone().setY(3.6), returnStart.clone().lerp(returnEnd, .5).setY(4), returnEnd.clone().setY(3.6), returnEnd.clone()];
  addPath('circulation-ocean', 'cell', returnBranch, .4, 1, [...returnBranch].reverse());
  addPath('circulation-west', 'west', [point(49, 38, 2), point(64, 37, 2.5), point(77, 34, 3.3), point(91, 33, 3.8), point(106, 31, 3.1)]);
  addPath('circulation-south', 'south', [point(69, 7, .35), point(77, 15, .5), point(84, 22, .65), point(93, 26, 1.1), point(96, 31, 2.7)]);
  addPath('circulation-south', 'south', [point(91, 11, .35), point(92, 20, .5), point(94, 26, 1), point(96, 31, 2.7)]);
  const pressureGradient = line([summerExample.forceStart, summerExample.forceEnd], 0xd4d7b9, .8, true); group.add(pressureGradient);
  const deflectionReference = line([summerExample.forceStart, summerExample.forceEnd], 0xd4d7b9, .5, true); group.add(deflectionReference);
  const pressureArrow = new THREE.Mesh(new THREE.ConeGeometry(.12, .3, 12), new THREE.MeshBasicMaterial({ color: 0xd4d7b9 })); group.add(pressureArrow);

  const callouts: Callout[] = [];
  const addCallout = (id: string, text: string, anchor: THREE.Vector3, offset: [number, number], show: Callout['show'], color = '#d5e0d5') => {
    const sprite = label(text, color), leader = line([anchor.clone(), anchor.clone()], id === 'circulation-plateau' ? TEAL : GOLD, .65);
    sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; sprite.onBeforeRender = () => {};
    sprite.renderOrder = 14; leader.renderOrder = 12; (leader.material as THREE.LineBasicMaterial).depthTest = false;
    group.add(sprite, leader); callouts.push({ id, text, anchor, offset, show, sprite, leader });
  };
  const external = (layer: Layer) => layer !== 'circulation';
  addCallout('circulation-ocean', '印度洋 · 海洋', point(76, 11, .1), [-35, 26], external);
  addCallout('circulation-land', '亚洲大陆 · 陆地', point(106, 42, .1), [30, -10], external);
  addCallout('circulation-plateau', '青藏高原 · 高地', point(88, 33, 2.6), [0, -28], () => true, '#a1e3df');
  addCallout('circulation-plateau', '虚线框 · 高程显示范围', point(100.8, 37.8, 2), [25, -20], () => true, '#b1d8d1');
  addCallout('circulation-west', '西侧来向 · 高度有别', point(68, 36, 2.7), [-35, -18], external, '#eed495');
  addCallout('circulation-south', '夏季南侧联系', point(93, 24, .8), [22, 25], (layer, season) => external(layer) && season === 'summer', '#eed495');
  addCallout('circulation-south', '南侧位置 · 地理参考', point(93, 24, .8), [22, 25], (layer, season) => external(layer) && season === 'winter');
  addCallout('circulation-south', '过渡季 · 来向会变化', point(93, 24, .8), [22, 25], (layer, season) => external(layer) && season === 'transition');
  addCallout('circulation-ocean', '海洋 · 变化较缓', point(75, 12, .1), [-25, 26], layer => layer === 'circulation', '#afdce1');
  addCallout('circulation-land', '大陆 · 相对更暖', point(80, 24, .1), [-25, -20], (layer, season, progress) => layer === 'circulation' && season === 'summer' && progress < .62, '#eeca93');
  addCallout('circulation-land', '大陆 · 相对更冷', point(80, 24, .1), [-25, -20], (layer, season, progress) => layer === 'circulation' && season === 'winter' && progress < .62, '#a9d8e4');
  addCallout('circulation-land', '海陆背景 · 转换中', point(80, 24, .1), [-25, -20], (layer, season, progress) => layer === 'circulation' && season === 'transition' && progress < .62);
  addCallout('circulation-land', '气压差方向 · 虚线', point(75, 21, .18), [-42, -25], (layer, _season, progress) => layer === 'circulation' && progress >= .28 && progress < .62);
  addCallout('circulation-land', '北半球 · 运动向右偏', point(80, 21, .4), [35, -8], (layer, _season, progress) => layer === 'circulation' && progress >= .62, '#f1d799');
  addCallout('circulation-south', '水汽可随空气移动', point(92, 20, .5), [20, 30], (layer, season) => layer === 'water' && season !== 'winter', '#9ee5df');
  addCallout('circulation-west', '西侧也可携带水汽', point(79, 34, 3.35), [20, 30], (layer, season) => layer === 'water' && season === 'winter', '#9ee5df');
  const legends = {
    circulation: label('金：空气　虚线：气压差参照 · 示意', '#d7e2d6'),
    wind: label('金：空气来向　概念路径非实测风场', '#d7e2d6'),
    water: label('金：空气　青：水汽标记 · 非降水量', '#d7e2d6'),
  };
  for (const sprite of Object.values(legends)) { sprite.onBeforeRender = () => {}; group.add(sprite); }
  const source = label('框内 Mapzen 高程×70 · 框外海陆底图', '#b9cccb'); source.onBeforeRender = () => {}; group.add(source);
  const transitionNote = label('春秋过渡：共同原理与路径比较，非确定来向', '#c5d5d0'); transitionNote.onBeforeRender = () => {}; group.add(transitionNote);
  const viewport = new THREE.Vector2(), screen = new THREE.Vector3(), projected = new THREE.Vector3(), tangent = new THREE.Vector3(), particlePoint = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), warm = new THREE.Color(0xe8b768), cool = new THREE.Color(0x76bed3);
  const screenSprite = (sprite: THREE.Sprite, x: number, y: number, width: number, height: number, depth = .55) => {
    screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, depth).unproject(runtime.camera); sprite.position.copy(screen);
    const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
    const h = height * screen.distanceTo(runtime.camera.position) / focal;
    sprite.scale.set(h * width / height, h, 1);
  };
  return {
    group,
    dispose: () => { alive = false; },
    update: (p: TibetSceneProps, _time: number, _dt: number) => {
      const layer: Layer = p.layer === 'wind' || p.layer === 'water' ? p.layer : 'circulation';
      const season = circulationSeason(p.season), progress = THREE.MathUtils.clamp(p.progress, 0, 1);
      runtime.renderer.getSize(viewport);
      const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const view = p.viewKey ?? `atmosphere:${p.step}`, restored = view !== previousView && runtime.hasSavedView(view);
      if (layer !== previousLayer || view !== previousView) {
        previousLayer = layer; previousView = view;
        if (!restored) {
          const target = new THREE.Vector3(0, .7, 0);
          runtime.focus(target.clone().add(new THREE.Vector3(layer === 'circulation' ? 3 : 5, 36, 33)), target);
        }
      }
      runtime.sun.position.set(-10, 20, -10);
      const emphasis = layer === 'circulation';
      const warmth = season === 'summer' ? 1 : season === 'winter' ? 0 : .5;
      land.patch.material.color.copy(cool).lerp(warm, warmth); land.ring.material.color.copy(land.patch.material.color);
      ocean.patch.material.color.copy(cool).lerp(warm, .45); ocean.ring.material.color.copy(ocean.patch.material.color);
      for (const item of [ocean, land]) {
        item.patch.material.opacity = emphasis ? .2 : .07;
        item.ring.material.opacity = p.selected === item.patch.userData.selectId ? .95 : emphasis ? .7 : .3;
        item.ring.scale.setScalar(p.selected === item.patch.userData.selectId ? 1.08 : 1);
      }
      plateauLocator.ring.material.opacity = p.selected === 'circulation-plateau' ? .95 : .45;
      if (dem) plateauLocator.ring.position.y = toHeight(sampleTerrainMetres(dem, 88, 33)) + .14;
      terrainMaterial.emissive.set(0x3a5954); terrainMaterial.emissiveIntensity = p.selected === 'circulation-plateau' ? .13 : 0;
      pressureGradient.visible = layer === 'circulation' && progress >= .28 && progress < .62;
      deflectionReference.visible = layer === 'circulation' && progress >= .62;
      const example = season === 'winter' ? winterExample : summerExample;
      for (const reference of [pressureGradient, deflectionReference]) {
        const positions = reference.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, example.forceStart.x, example.forceStart.y, example.forceStart.z);
        positions.setXYZ(1, example.forceEnd.x, example.forceEnd.y, example.forceEnd.z);
        positions.needsUpdate = true; reference.computeLineDistances(); reference.geometry.computeBoundingSphere();
      }
      pressureArrow.visible = pressureGradient.visible || deflectionReference.visible;
      pressureArrow.position.copy(example.forceEnd);
      tangent.copy(example.forceEnd).sub(example.forceStart).normalize(); pressureArrow.quaternion.setFromUnitVectors(up, tangent);
      for (const path of paths) {
        path.group.visible = layer === 'circulation' ? path.kind === 'cell' : path.kind !== 'cell';
        if (!path.group.visible) continue;
        const active = path.kind === 'cell' ? (season === 'winter' ? path.winter : path.summer) : path.summer;
        const phase = path.kind === 'cell' ? smooth(progress, path.from, path.to) : progress;
        const muted = path.kind === 'south' && season === 'winter', transition = season === 'transition' && path.kind !== 'cell';
        (path.line.material as THREE.LineBasicMaterial).opacity = muted ? .24 : transition ? .65 : .96;
        path.tube.material.opacity = muted ? .28 : transition ? .65 : .82;
        path.core.material.opacity = muted ? .22 : transition ? .55 : .9;
        path.tube.visible = !path.winterTube || season !== 'winter';
        if (path.winterTube) path.winterTube.visible = season === 'winter';
        path.core.visible = !path.winterCore || season !== 'winter';
        if (path.winterCore) path.winterCore.visible = season === 'winter';
        const positions = path.line.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i++) { active.getPoint(i / (positions.count - 1), particlePoint); positions.setXYZ(i, particlePoint.x, particlePoint.y, particlePoint.z); }
        positions.needsUpdate = true; path.line.geometry.computeBoundingSphere();
        // Traces and moving parcels use the same seasonal example. All moving
        // geometry uses shared progress, with no independent time accumulation.
        path.air.visible = path.tip.visible = !muted && (path.kind !== 'cell' || phase > 0);
        path.vapour.visible = layer === 'water' && !muted;
        (path.air.material as THREE.PointsMaterial).opacity = transition ? .76 : .98;
        (path.vapour.material as THREE.PointsMaterial).opacity = transition ? .78 : .98;
        active.getPoint(phase, path.tip.position); active.getTangent(phase, tangent); path.tip.quaternion.setFromUnitVectors(up, tangent.normalize());
        const arrowScale = focal > 0 ? 13 * path.tip.position.distanceTo(runtime.camera.position) / focal / .44 : 1;
        path.tip.scale.setScalar(arrowScale * (p.selected === path.id ? 1.15 : 1));
        for (let i = 0; i < 20; i++) {
          const at = Math.max(0, phase - i * .028);
          active.getPoint(at, particlePoint); particlePoint.toArray(path.airPositions, i * 3);
          // A distinct teal marker travels next to the parcel. It identifies
          // invisible vapour, not a cloud, raindrop or measured concentration.
          particlePoint.y += .035; particlePoint.toArray(path.waterPositions, i * 3);
        }
        for (const item of [path.air, path.vapour]) { item.geometry.attributes.position.needsUpdate = true; item.geometry.computeBoundingSphere(); }
      }
      runtime.renderer.getSize(viewport); if (viewport.x < 1 || viewport.y < 1) return;
      const mobile = viewport.x < 550, labelHeight = mobile ? 23 : 26;
      const minY = Math.min(110, viewport.y * .2), maxY = Math.max(minY, viewport.y - 293);
      const occupied: { x: number; y: number; width: number }[] = [84, 125, 166].map(y => ({ x: viewport.x - 35, y, width: 58 }));
      const ordered = [...callouts].sort((a, b) => Number(b.id === p.selected) - Number(a.id === p.selected));
      for (const item of ordered) {
        item.sprite.visible = item.leader.visible = false;
        if (!item.show(layer, season, progress)) continue;
        projected.copy(item.anchor).project(runtime.camera);
        if (projected.z < -1 || projected.z > 1) continue;
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        if (ax < -35 || ax > viewport.x + 35 || ay < -35 || ay > viewport.y + 35) continue;
        const width = Math.min(viewport.x - 28, item.text.length * (mobile ? 10 : 11) + 27);
        const initialX = THREE.MathUtils.clamp(ax + item.offset[0], width / 2 + 12, viewport.x - width / 2 - 12);
        const initialY = THREE.MathUtils.clamp(ay + item.offset[1], minY, maxY);
        let best: { x: number; y: number; cost: number } | null = null;
        for (const x of [initialX, width / 2 + 12, viewport.x / 2, viewport.x - width / 2 - 12]) for (let y = minY; y <= maxY; y += labelHeight + 7) {
          if (occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 7 && Math.abs(y - box.y) < labelHeight + 6)) continue;
          const cost = (x - initialX) ** 2 + (y - initialY) ** 2;
          if (!best || cost < best.cost) best = { x, y, cost };
        }
        if (!best) continue;
        occupied.push({ x: best.x, y: best.y, width }); item.sprite.visible = item.leader.visible = true;
        screenSprite(item.sprite, best.x, best.y, width, labelHeight, projected.z);
        const positions = item.leader.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z); positions.setXYZ(1, item.sprite.position.x, item.sprite.position.y, item.sprite.position.z);
        positions.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      for (const { sprite, anchor } of [...latitudeLabels, { sprite: northLabel, anchor: northAnchor }]) {
        projected.copy(anchor).project(runtime.camera); const x = (projected.x + 1) * viewport.x / 2, y = (1 - projected.y) * viewport.y / 2;
        sprite.visible = projected.z >= -1 && projected.z <= 1 && x > 15 && x < viewport.x - 35 && y >= minY && y <= maxY &&
          !occupied.some(box => Math.abs(x - box.x) < (box.width + 40) / 2 + 4 && Math.abs(y - box.y) < 25);
        if (sprite.visible) { screenSprite(sprite, x, y, sprite === northLabel ? 24 : 44, 20, projected.z); occupied.push({ x, y, width: 44 }); }
      }
      const footerY = Math.max(minY + 30, viewport.y - 247);
      for (const [key, sprite] of Object.entries(legends)) {
        sprite.visible = key === layer;
        if (sprite.visible) screenSprite(sprite, viewport.x / 2, footerY, Math.min(viewport.x - 24, 335), 21);
      }
      screenSprite(source, viewport.x / 2, footerY + 26, Math.min(viewport.x - 24, 355), mobile ? 19 : 21);
      transitionNote.visible = season === 'transition';
      screenSprite(transitionNote, viewport.x / 2, Math.max(minY + 20, footerY - 27), Math.min(viewport.x - 24, 335), mobile ? 19 : 21);
      if (!dem && !loadFailed) screenSprite(terrainStatus, viewport.x / 2, minY + 18, Math.min(viewport.x - 24, 210), 23);
      if (loadFailed) screenSprite(failedStatus, viewport.x / 2, minY + 18, Math.min(viewport.x - 24, 340), 21);
    },
  };
}
