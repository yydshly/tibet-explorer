import * as THREE from 'three';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { cityComparisonDownhill, type ComparisonPoint } from './cityComparison';
import { GOLD, TEAL, disposeTree, label, line } from './environment';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';
import type { TibetSceneProps } from './TibetScene';

type City = 'nyingchi' | 'lhasa' | 'ngari';
type Reading = (longitude: number, latitude: number) => number | undefined;
type Settings = Pick<TibetSceneProps, 'layer' | 'selected' | 'step' | 'progress' | 'communitySupport'>;
export type CityTerrainLifeRuntime = {
  camera: THREE.PerspectiveCamera;
  at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3;
  baseline: (longitude: number, latitude: number) => THREE.Vector3;
  metres: Reading;
};
const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));

export function cityTerrainLifeState(settings: Settings) {
  const requested = settings.selected.replace(/^city:/, '');
  const city: City = requested === 'lhasa' || requested === 'ngari' ? requested : 'nyingchi';
  const progress = clamp(settings.progress), maintained = settings.communitySupport !== 'individual';
  const travel = phase(progress, 0, .34), water = phase(progress, .34, .68), space = phase(progress, .68, 1);
  return { city, progress, beat: progress >= .68 ? 2 : progress >= .34 ? 1 : 0, maintained,
    travel, water, space, travelled: maintained ? travel : Math.min(travel, .45), taken: maintained ? phase(water, .25, 1) : 0,
    referenceId: city === 'nyingchi' ? 'lulang' : city,
  };
}

/** A DEM reading between places/through the town reference. This does not
 * represent the geometry, grade, travel time or condition of an actual road. */
export function sampleCityLifeTransect(city: City, read: Reading): ComparisonPoint[] {
  const reference = verifiedPlaceReferences[city];
  const start = city === 'nyingchi' ? reference : { longitude: reference.longitude - 1.05, latitude: reference.latitude - .55 };
  const end = city === 'nyingchi' ? verifiedPlaceReferences.lulang : { longitude: reference.longitude + 1.05, latitude: reference.latitude + .55 };
  const points: ComparisonPoint[] = [];
  for (let index = 0; index <= 100; index++) {
    const longitude = THREE.MathUtils.lerp(start.longitude, end.longitude, index / 100), latitude = THREE.MathUtils.lerp(start.latitude, end.latitude, index / 100);
    const metres = read(longitude, latitude); if (metres === undefined) return [];
    points.push({ longitude, latitude, metres });
  }
  return points;
}

/** Relative terrain reading in a coarse DEM window; never urban land use or
 * buildable/safe land. No area percentage or construction threshold is emitted. */
export function sampleCityLifeSpace(referenceId: string, read: Reading) {
  const ref = verifiedPlaceReferences[referenceId]; if (!ref) return undefined;
  const size = 31, raw: ComparisonPoint[] = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const longitude = ref.longitude - .9 + col / (size - 1) * 1.8, latitude = ref.latitude - .8 + row / (size - 1) * 1.6;
    const metres = read(longitude, latitude); if (metres === undefined) return undefined;
    raw.push({ longitude, latitude, metres });
  }
  const minimum = Math.min(...raw.map(point => point.metres)), maximum = Math.max(...raw.map(point => point.metres));
  const points = raw.map((point, index) => {
    const row = Math.floor(index / size), col = index % size;
    const left = raw[row * size + Math.max(0, col - 1)], right = raw[row * size + Math.min(size - 1, col + 1)];
    const low = raw[Math.max(0, row - 1) * size + col], high = raw[Math.min(size - 1, row + 1) * size + col];
    const dx = Math.max(1, (right.longitude - left.longitude) * 111320 * Math.cos(point.latitude * Math.PI / 180));
    const dz = Math.max(1, (high.latitude - low.latitude) * 111320);
    const slope = Math.hypot((right.metres - left.metres) / dx, (high.metres - low.metres) / dz);
    return { ...point, slope, lowGentle: (1 - (point.metres - minimum) / Math.max(1, maximum - minimum)) / (1 + slope * 14) };
  });
  return { referenceId, size, minimum, maximum, points };
}

type Caption = { text: string; sprite: THREE.Sprite; leader: THREE.Line };
type Flow = { points: ComparisonPoint[]; tube?: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; bead: THREE.Mesh };

export function buildCityTerrainLife(runtime: CityTerrainLifeRuntime) {
  const group = new THREE.Group(); group.userData.kind = 'city-life-process-on-shared-dem'; group.visible = false;
  const travelGroup = new THREE.Group(), waterGroup = new THREE.Group(), spaceGroup = new THREE.Group(); group.add(travelGroup, waterGroup, spaceGroup);
  const captions = new Map<string, Caption>(), viewport = new THREE.Vector2();
  const material = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
  const routeRoot = new THREE.Group(); travelGroup.add(routeRoot);
  const traveller = new THREE.Mesh(new THREE.ConeGeometry(.09, .24, 10), material(GOLD)); traveller.userData.kind = 'terrain-transect-progress-marker'; traveller.renderOrder = 25; travelGroup.add(traveller);
  const elevationProbe = line([new THREE.Vector3(), new THREE.Vector3()], GOLD, .68, true);
  (elevationProbe.material as THREE.LineDashedMaterial).depthTest = false; elevationProbe.renderOrder = 21; travelGroup.add(elevationProbe);
  const casePin = new THREE.Mesh(new THREE.RingGeometry(.11, .16, 36), material(TEAL)); casePin.rotation.x = -Math.PI / 2; casePin.renderOrder = 23;
  casePin.userData.kind = 'city-life-sourced-case-reference'; group.add(casePin);
  const flows: Flow[] = Array.from({ length: 3 }, () => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), material(0x9bfae6)); bead.renderOrder = 24; waterGroup.add(bead);
    return { points: [], bead };
  });
  // Below-ground geometry is a labelled x-ray principle at the reading area,
  // not an aquifer boundary, measured depth, borehole location or supply pipe.
  const extraction = new THREE.Group(); extraction.userData.kind = 'underground-extraction-principle-not-well-location'; waterGroup.add(extraction);
  const below = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .08, 28), material(0x63bec7, .32)); below.renderOrder = 17; extraction.add(below);
  const liftAxis = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .9, 16), material(TEAL, .34)); liftAxis.position.y = -.25; liftAxis.renderOrder = 18; extraction.add(liftAxis);
  const liftBead = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 8), material(TEAL)); liftBead.renderOrder = 25; liftBead.userData.kind = 'groundwater-principle-lift-marker'; extraction.add(liftBead);
  const useMarker = new THREE.Mesh(new THREE.TorusGeometry(.14, .018, 6, 36), material(GOLD)); useMarker.rotation.x = -Math.PI / 2; useMarker.renderOrder = 26; extraction.add(useMarker);
  // A small opening barrier illustrates organization of use. It is deliberately
  // tagged as an unlocated symbol and never added to a road/channel dataset.
  const taking = new THREE.Group(); taking.userData.kind = 'water-use-principle-not-mapped-facility'; waterGroup.add(taking);
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(.09, .3, .44), material(GOLD)); barrier.renderOrder = 25; barrier.userData.kind = 'principle-taking-opening'; taking.add(barrier);
  const takenBead = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), material(TEAL)); takenBead.renderOrder = 26; taking.add(takenBead);
  const landRoot = new THREE.Group(); spaceGroup.add(landRoot);
  let currentCity: City | undefined, ready = false;
  let route: ComparisonPoint[] = [], routeTube: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | undefined;
  let space: ReturnType<typeof sampleCityLifeSpace>, land: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined;
  let waterAnchor = new THREE.Vector3();

  const setLine = (object: THREE.Line, a: THREE.Vector3, b: THREE.Vector3) => {
    const p = object.geometry.attributes.position as THREE.BufferAttribute; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; object.geometry.computeBoundingSphere();
  };
  const pointOn = (points: ComparisonPoint[], fraction: number, offset = .1) => {
    const cursor = clamp(fraction) * (points.length - 1), first = points[Math.floor(cursor)], second = points[Math.min(points.length - 1, Math.floor(cursor) + 1)];
    const longitude = THREE.MathUtils.lerp(first.longitude, second.longitude, cursor % 1), latitude = THREE.MathUtils.lerp(first.latitude, second.latitude, cursor % 1);
    return { longitude, latitude, metres: runtime.metres(longitude, latitude)!, position: runtime.at(longitude, latitude, offset) };
  };
  const tube = (points: ComparisonPoint[], color: number, radius: number, opacity = 1) => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i++) curve.add(new THREE.LineCurve3(runtime.at(points[i].longitude, points[i].latitude, .085), runtime.at(points[i + 1].longitude, points[i + 1].latitude, .085)));
    const result = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, radius, 6, false), material(color, opacity)); result.renderOrder = 22; return result;
  };
  const build = (city: City) => {
    ready = false; currentCity = city; route = sampleCityLifeTransect(city, runtime.metres);
    const referenceId = city === 'nyingchi' ? 'lulang' : city; space = sampleCityLifeSpace(referenceId, runtime.metres);
    if (!route.length || !space) return;
    disposeTree(routeRoot); disposeTree(landRoot);
    const ghost = line(route.map(point => runtime.at(point.longitude, point.latitude, .065)), GOLD, .3, true);
    (ghost.material as THREE.LineDashedMaterial).depthTest = false; ghost.renderOrder = 19;
    routeRoot.add(ghost); routeTube = tube(route, GOLD, .07); routeTube.userData = { kind: 'real-dem-trial-transect-not-road', samples: route }; routeRoot.add(routeTube);
    const ref = verifiedPlaceReferences[referenceId]; casePin.position.copy(runtime.at(ref.longitude, ref.latitude, .13)); casePin.userData.reference = ref;
    // The steep-to-low paths start in the sampled local terrain. Their identity
    // remains separate from the sourced winter-irrigation/urban-supply case.
    const high = [...space.points].sort((a, b) => b.metres - a.metres);
    flows.forEach((flow, i) => {
      if (flow.tube) { waterGroup.remove(flow.tube); flow.tube.geometry.dispose(); flow.tube.material.dispose(); flow.tube = undefined; }
      const seed = high[Math.floor(high.length * (.06 + i * .11))];
      flow.points = cityComparisonDownhill(runtime.metres, seed.longitude, seed.latitude, 28);
      if (flow.points.length > 1) { flow.tube = tube(flow.points, TEAL, .055, .86); flow.tube.userData = { kind: 'natural-dem-descent-not-channel', samples: flow.points }; waterGroup.add(flow.tube); }
    });
    const end = flows[0].points.at(-1) ?? route.at(-1)!;
    waterAnchor = runtime.at(end.longitude, end.latitude, .12); taking.position.copy(waterAnchor);
    taking.userData.scope = '采样坡面旁的取用条件原理，不标实际水渠、河道或设施';
    extraction.position.copy(runtime.at(ref.longitude, ref.latitude, .04)); below.position.y = -.72;
    extraction.userData.scope = '地下水取供水原理；位置与深度无测绘含义';
    const scores = space.points.map(point => point.lowGentle).sort((a, b) => a - b), lowScore = scores[Math.floor(scores.length * .1)], highScore = scores[Math.floor(scores.length * .9)];
    const positions: number[] = [], colors: number[] = [], gold = new THREE.Color(0xcc9d41), green = new THREE.Color(0x32dda2);
    for (let row = 0; row < space.size - 1; row++) for (let col = 0; col < space.size - 1; col++) {
      const index = row * space.size + col;
      for (const id of [index, index + 1, index + space.size, index + 1, index + space.size + 1, index + space.size]) {
        const sample = space.points[id], position = runtime.at(sample.longitude, sample.latitude, .06);
        const color = gold.clone().lerp(green, clamp((sample.lowGentle - lowScore) / Math.max(.001, highScore - lowScore)));
        const y = Math.floor(id / space.size), x = id % space.size, fade = clamp(Math.min(x, y, space.size - 1 - x, space.size - 1 - y) / 3);
        positions.push(position.x, position.y, position.z); colors.push(color.r, color.g, color.b, fade);
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    const landMaterial = material(0xffffff, .67); landMaterial.vertexColors = true; landMaterial.side = THREE.DoubleSide;
    land = new THREE.Mesh(geometry, landMaterial); land.renderOrder = 15;
    land.userData = { kind: 'relative-terrain-space-not-city-boundary', samples: space.points, scope: '窗口内相对低位缓坡，不是城市边界或建设适宜性' }; landRoot.add(land);
    ready = true;
  };

  const projected = (point: THREE.Vector3) => { const p = point.clone().project(runtime.camera); return { x: (p.x + 1) * viewport.x / 2, y: (1 - p.y) * viewport.y / 2, z: p.z }; };
  const safeY = () => viewport.y - (viewport.x > 900 ? 220 : 115);
  const writeCaption = (key: string, text: string, anchor: THREE.Vector3, dx: number, dy: number) => {
    let item = captions.get(key);
    if (item?.text !== text) {
      if (item) { group.remove(item.sprite, item.leader); item.sprite.material.map?.dispose(); item.sprite.material.dispose(); item.leader.geometry.dispose(); (item.leader.material as THREE.Material).dispose(); }
      const sprite = label(text, '#e7e6cf'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 40; sprite.userData = { kind: 'terrain-life-caption', text };
      const leader = line([anchor, anchor], GOLD, .6); (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 38;
      item = { text, sprite, leader }; captions.set(key, item); group.add(sprite, leader);
    }
    const p = projected(anchor), image = item.sprite.material.map?.image as { width?: number; height?: number } | undefined;
    const aspect = (image?.width ?? Math.max(240, text.length * 52 + 64)) / (image?.height ?? 96);
    const width = Math.min(viewport.x < 520 ? 190 : 265, aspect * 21), height = width / aspect;
    const x = THREE.MathUtils.clamp(p.x + dx, (viewport.x > 900 ? 348 : 10) + width / 2, viewport.x - width / 2 - 12), y = THREE.MathUtils.clamp(p.y + dy, 110, Math.max(110, safeY()));
    item.sprite.position.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, .5).unproject(runtime.camera);
    const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), scale = item.sprite.position.distanceTo(runtime.camera.position) / focal;
    item.sprite.scale.set(width * scale, height * scale, 1); item.sprite.visible = item.leader.visible = p.z >= -1 && p.z <= 1;
    setLine(item.leader, anchor, item.sprite.position);
  };
  return {
    group,
    occupied(settings: Settings, size: THREE.Vector2): AtlasLabelBox[] {
      if (settings.layer !== 'atlas-city-life' || settings.step !== 1) return [];
      viewport.copy(size); const state = cityTerrainLifeState(settings), ref = verifiedPlaceReferences[state.referenceId], point = projected(runtime.at(ref.longitude, ref.latitude, .15));
      return [{ x: point.x, y: Math.min(safeY(), point.y + 42), width: 220, height: 25 }];
    },
    update(settings: Settings, size: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-city-life' && settings.step === 1; if (!group.visible) return;
      viewport.copy(size); const state = cityTerrainLifeState(settings);
      if (currentCity !== state.city || !ready) build(state.city);
      if (!ready || !route.length || !space || !routeTube || !land) return;
      for (const item of captions.values()) item.sprite.visible = item.leader.visible = false;
      group.userData.state = state;
      const ref = verifiedPlaceReferences[state.referenceId], caseAt = runtime.at(ref.longitude, ref.latitude, .15);
      const current = pointOn(route, state.travelled, .14), after = pointOn(route, Math.min(1, state.travelled + .015), .14), before = pointOn(route, Math.max(0, state.travelled - .015), .14);
      traveller.position.copy(current.position); traveller.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), after.position.clone().sub(before.position).normalize());
      traveller.userData = { kind: 'terrain-transect-progress-marker', sample: current, maintained: state.maintained };
      routeTube.geometry.setDrawRange(0, Math.floor((routeTube.geometry.index?.count ?? 0) * Math.max(.02, state.travel) / 3) * 3);
      routeTube.material.opacity = state.beat === 0 ? 1 : .38; traveller.visible = state.beat === 0;
      setLine(elevationProbe, runtime.baseline(current.longitude, current.latitude), current.position); elevationProbe.visible = state.beat === 0;
      waterGroup.visible = state.water > 0 || state.beat === 1; spaceGroup.visible = state.beat === 2;
      extraction.visible = state.city === 'lhasa'; taking.visible = state.city !== 'lhasa';
      for (const flow of flows) {
        const visible = state.city !== 'lhasa' && state.water > 0 && flow.points.length > 1;
        flow.bead.visible = visible;
        if (flow.tube) { flow.tube.visible = visible; flow.tube.geometry.setDrawRange(0, Math.floor((flow.tube.geometry.index?.count ?? 0) * state.water / 3) * 3); }
        if (visible) flow.bead.position.copy(pointOn(flow.points, state.water, .12).position);
      }
      // Natural downhill direction is unchanged by maintenance. Only the
      // explicitly schematic taking/lifting operation responds to this switch.
      barrier.rotation.y = state.maintained ? state.taken * Math.PI * .43 : 0;
      taking.userData.taken = state.taken; takenBead.position.set(.12 + state.taken * .45, .1, 0); takenBead.visible = state.taken > 0;
      liftBead.position.set(0, -.7 + state.taken * .92, 0); useMarker.position.y = .24; useMarker.material.opacity = .15 + state.taken * .85;
      extraction.userData.taken = state.taken; extraction.userData.sourceDepthIsSchematic = true;
      land.geometry.setDrawRange(0, Math.floor(land.geometry.attributes.position.count * Math.max(.02, state.space) / 3) * 3);
      if (state.beat === 0) {
        writeCaption('trial', '地形试线 · 非公路', caseAt, 0, 42);
        writeCaption('height', `当前约 ${Math.round(current.metres / 50) * 50} m`, current.position, -105, -42);
        if (!state.maintained && state.travel > .45) writeCaption('travel-stop', '组织维护对照 · 暂停推进', current.position, 100, -12);
      } else if (state.beat === 1) {
        if (state.city === 'lhasa') {
          writeCaption('groundwater', '地下取水原理 · 非井位', extraction.position, 90, -40);
          writeCaption('water-operation', state.maintained ? '取供水需设施与管护' : '取供水管护中断对照', extraction.position, -100, 48);
        } else {
          writeCaption('downhill', '采样坡面去向 · 非渠网', caseAt, 0, -42);
          writeCaption('taking', state.maintained ? '管护取用原理' : '取用组织中断对照', waterAnchor, 90, 45);
        }
      } else {
        writeCaption('space', '绿：相对低缓 · 金：较高陡', caseAt, 0, -44);
        writeCaption('space-scope', '地形读法 · 非城市边界', caseAt, 0, 43);
      }
      if (state.city === 'nyingchi') writeCaption('case', '鲁朗镇 · 案例参照', caseAt, 125, 12);
    },
    dispose() { captions.clear(); },
  };
}
