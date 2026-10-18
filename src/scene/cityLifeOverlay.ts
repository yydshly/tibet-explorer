import * as THREE from 'three';
import { getCityLifeJourney } from '../data/cityLifeJourney';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { GOLD, TEAL, disposeTree, label, line } from './environment';
import { buildCityTerrainLife } from './cityTerrainLife';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';
import type { TibetSceneProps } from './TibetScene';

const cities = ['nyingchi', 'lhasa', 'ngari'] as const;
type City = typeof cities[number];
type Settings = Pick<TibetSceneProps, 'layer' | 'selected' | 'step' | 'progress' | 'communitySupport'>;
type Runtime = {
  camera: THREE.PerspectiveCamera;
  /** Same DEM, projection and vertical scale as the regional atlas. */
  at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3;
  baseline: (longitude: number, latitude: number) => THREE.Vector3;
  metres: (longitude: number, latitude: number) => number | undefined;
};
type ProfileSample = { longitude: number; latitude: number; metres: number };

const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));

/** The same authored clock drives the visible process, manual scrub and voice. */
export function cityLifeVisualState(settings: Settings) {
  const requested = settings.selected.replace(/^city:/, '');
  const city: City = cities.includes(requested as City) ? requested as City : 'nyingchi';
  const progress = clamp(settings.progress), stage = Math.min(2, Math.max(0, Math.round(settings.step || 0)));
  const beat = progress >= .68 ? 2 : progress >= .34 ? 1 : 0;
  const maintained = settings.communitySupport !== 'individual';
  return {
    city, progress, stage, beat, maintained,
    condition: phase(progress, 0, .34), facility: phase(progress, .34, .68),
    service: maintained ? phase(progress, .68, 1) : 0,
    transfer: maintained ? phase(progress, .34, 1) : Math.min(.47, phase(progress, .34, 1)),
  };
}

/** A true north–south sample through the sourced settlement reference, not a valley survey. */
export function cityLifeProfileSamples(city: string, read: Runtime['metres']): ProfileSample[] {
  const reference = verifiedPlaceReferences[city];
  if (!reference) return [];
  const samples: ProfileSample[] = [];
  for (let index = 0; index <= 80; index++) {
    const latitude = reference.latitude - 1.45 + index / 80 * 2.9;
    const metres = read(reference.longitude, latitude);
    if (metres !== undefined && Number.isFinite(metres)) samples.push({ longitude: reference.longitude, latitude, metres });
  }
  return samples;
}

type Caption = { text: string; color: string; sprite: THREE.Sprite; leader: THREE.Line };
type AnnotationRequest = { key: string; text: string; x: number; y: number; width?: number; color?: string; anchor?: THREE.Vector3 };

/** Explanations stay attached to the existing map; none of these nodes locates a facility. */
export function buildCityLifeOverlay(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'city-life-on-regional-atlas';
  group.userData.kind = 'city-life-overlay'; group.visible = false;
  const environment = new THREE.Group(), history = new THREE.Group();
  group.add(environment, history);
  const captions = new Map<string, Caption>();
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3();
  let profileCity = '', profileReady = false;
  let profile: ProfileSample[] = [];
  const profileRoot = new THREE.Group(); environment.add(profileRoot);
  let profileTrace: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | undefined;
  const scan = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 10), new THREE.MeshBasicMaterial({ color: GOLD, depthTest: false }));
  scan.userData.kind = 'actual-dem-profile-probe'; scan.renderOrder = 29; environment.add(scan);
  const probe = line([new THREE.Vector3(), new THREE.Vector3()], GOLD, .9);
  probe.userData.kind = 'metre-reference'; environment.add(probe);
  const columns = cities.map(city => {
    const mast = line([new THREE.Vector3(), new THREE.Vector3()], TEAL, .65);
    mast.userData.kind = 'city-real-elevation'; mast.userData.cityId = city;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 8), new THREE.MeshBasicMaterial({ color: TEAL }));
    cap.userData.kind = 'city-real-elevation-cap';
    environment.add(mast, cap); return { city, mast, cap };
  });

  const terrainLife = buildCityTerrainLife(runtime); group.add(terrainLife.group);
  const flatMaterial = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest: false, depthWrite: false });
  const historyMarker = new THREE.Mesh(new THREE.RingGeometry(.16, .22, 40), flatMaterial(GOLD, .95));
  historyMarker.rotation.x = -Math.PI / 2; historyMarker.userData.kind = 'history-material-place-reference'; historyMarker.renderOrder = 30; history.add(historyMarker);
  const writeLine = (object: THREE.Line, a: THREE.Vector3, b: THREE.Vector3) => {
    const values = object.geometry.attributes.position as THREE.BufferAttribute;
    values.setXYZ(0, a.x, a.y, a.z); values.setXYZ(1, b.x, b.y, b.z); values.needsUpdate = true;
    object.geometry.computeBoundingSphere();
  };
  const screenPoint = (x: number, y: number, depth = .5) => new THREE.Vector3(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, depth).unproject(runtime.camera);
  const project = (point: THREE.Vector3) => {
    projected.copy(point).project(runtime.camera);
    return { x: (projected.x + 1) * viewport.x / 2, y: (1 - projected.y) * viewport.y / 2, depth: projected.z };
  };
  const focal = () => viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
  const caption = ({ key, text, x, y, width, color, anchor }: AnnotationRequest) => {
    let item = captions.get(key);
    const textColor = color ?? '#e9e5d0';
    if (item?.text !== text || item.color !== textColor) {
      if (item) { group.remove(item.sprite, item.leader); item.sprite.material.map?.dispose(); item.sprite.material.dispose(); item.leader.geometry.dispose(); (item.leader.material as THREE.Material).dispose(); }
      const sprite = label(text, textColor); sprite.onBeforeRender = () => {}; sprite.renderOrder = 42;
      sprite.userData.screenAnnotation = true; sprite.userData.kind = 'city-life-caption'; sprite.userData.text = text; sprite.userData.color = textColor;
      const leader = line([new THREE.Vector3(), new THREE.Vector3()], 0xd9c993, .56);
      (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 31;
      item = { text, color: textColor, sprite, leader }; captions.set(key, item); group.add(sprite, leader);
    }
    // Preserve the canvas aspect ratio: forcing a fixed width stretched short
    // Chinese captions into oversized banners on the compact regional canvas.
    const image = item.sprite.material.map?.image as { width?: number; height?: number } | undefined;
    const aspect = (image?.width ?? Math.max(240, text.length * 52 + 64)) / (image?.height ?? 96);
    const actualWidth = Math.min(aspect * 21, width ?? Infinity, viewport.x - 36);
    const actualHeight = actualWidth / aspect;
    const safeLeft = viewport.x > 900 ? 340 : 12;
    const xx = THREE.MathUtils.clamp(x, safeLeft + actualWidth / 2, viewport.x - actualWidth / 2 - 12);
    const yy = THREE.MathUtils.clamp(y, 100, Math.max(100, viewport.y - (viewport.x > 900 ? 210 : 95)));
    item.sprite.position.copy(screenPoint(xx, yy));
    const unit = item.sprite.position.distanceTo(runtime.camera.position) / focal();
    item.sprite.scale.set(actualWidth * unit, actualHeight * unit, 1); item.sprite.visible = true; item.sprite.updateMatrixWorld();
    item.leader.visible = Boolean(anchor);
    if (anchor) writeLine(item.leader, anchor, item.sprite.position);
  };
  const rebuildProfile = (city: City) => {
    disposeTree(profileRoot); profile = cityLifeProfileSamples(city, runtime.metres); profileCity = city; profileReady = profile.length > 1;
    if (!profileReady) { profileTrace = undefined; return; }
    const points = profile.map(point => runtime.at(point.longitude, point.latitude, .07));
    const ghost = line(points, TEAL, .32); ghost.userData.kind = 'real-dem-transect';
    ghost.userData.samples = profile; profileRoot.add(ghost);
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let index = 0; index < points.length - 1; index++) curve.add(new THREE.LineCurve3(points[index], points[index + 1]));
    profileTrace = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, .038, 5, false), flatMaterial(GOLD));
    profileTrace.userData.kind = 'progressive-real-dem-profile'; profileTrace.renderOrder = 28; profileRoot.add(profileTrace);
    // The curtain's floor is sea level, with exactly the map's vertical scale.
    const vertices: number[] = [];
    for (let index = 0; index < points.length - 1; index++) {
      const a = points[index], b = points[index + 1];
      const lowA = runtime.baseline(profile[index].longitude, profile[index].latitude);
      const lowB = runtime.baseline(profile[index + 1].longitude, profile[index + 1].latitude);
      for (const point of [a, lowA, b, b, lowA, lowB]) vertices.push(point.x, point.y, point.z);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    const material = flatMaterial(TEAL, .16); material.side = THREE.DoubleSide;
    const curtain = new THREE.Mesh(geometry, material); curtain.userData.kind = 'sea-level-referenced-profile-curtain'; profileRoot.add(curtain);
  };
  const layout = () => {
    const left = viewport.x > 900 ? 352 : 18, right = viewport.x - 70;
    return { left, right, center: (left + right) / 2, width: right - left,
      y: Math.max(170, Math.min(viewport.y - 155, viewport.y * .66)) };
  };

  return {
    group,
    /** Reserve the explanatory band before city callout placement. */
    occupied(settings: Settings, size: THREE.Vector2): AtlasLabelBox[] {
      if (settings.layer !== 'atlas-city-life' || settings.step === 0) return [];
      if (settings.step === 1) return terrainLife.occupied(settings, size);
      viewport.copy(size); const box = layout();
      return [{ x: box.center, y: box.y + 8, width: box.width, height: 132 }];
    },
    update(settings: Settings, size: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-city-life'; terrainLife.update(settings, size); if (!group.visible) return;
      viewport.copy(size);
      const state = cityLifeVisualState(settings), journey = getCityLifeJourney(state.city);
      if (!journey) { group.visible = false; return; }
      for (const item of captions.values()) item.sprite.visible = item.leader.visible = false;
      environment.visible = state.stage === 0; history.visible = state.stage === 2;
      group.userData.state = state;
      const reference = verifiedPlaceReferences[state.city];
      const box = layout();
      if (state.stage === 0) {
        if (profileCity !== state.city || (!profileReady && runtime.metres(reference.longitude, reference.latitude) !== undefined)) rebuildProfile(state.city);
        if (!profileReady) { scan.visible = probe.visible = false; return; }
        scan.visible = probe.visible = true;
        const point = profile[Math.min(profile.length - 1, Math.floor(state.progress * (profile.length - 1)))];
        scan.position.copy(runtime.at(point.longitude, point.latitude, .1)); scan.userData.sample = point;
        writeLine(probe, runtime.baseline(point.longitude, point.latitude), scan.position);
        if (profileTrace) profileTrace.geometry.setDrawRange(0, Math.floor((profileTrace.geometry.index?.count ?? 0) * Math.max(.02, state.progress) / 3) * 3);
        for (const column of columns) {
          const place = verifiedPlaceReferences[column.city], metres = runtime.metres(place.longitude, place.latitude);
          column.mast.visible = column.cap.visible = metres !== undefined;
          if (metres === undefined) continue;
          const top = runtime.at(place.longitude, place.latitude, .07); writeLine(column.mast, runtime.baseline(place.longitude, place.latitude), top);
          column.cap.position.copy(top); column.mast.userData.metres = metres;
          const screen = project(top);
          if (column.city === state.city && screen.depth > -1 && screen.depth < 1) caption({ key: `height-${column.city}`, text: `城区参考点约 ${Math.round(metres / 50) * 50} m`, x: screen.x, y: screen.y + 36, width: 195, anchor: top, color: '#f4d894' });
        }
        caption({ key: 'probe', text: `剖面读数 · 约 ${Math.round(point.metres / 50) * 50} m`, x: box.right - 100, y: 125, width: 205, anchor: scan.position, color: '#f4d894' });
        caption({ key: 'profile-scope', text: '南北真实高程剖面 · 高差 ×16', x: box.center, y: viewport.y - (viewport.x > 900 ? 220 : 109), width: Math.min(285, box.width) });
      } else if (state.stage === 1) {
        // Ground processes are updated by terrainLife on the same DEM.
      } else {
        const events = journey.historyMilestones, current = events[Math.min(state.beat, events.length - 1)];
        if (!current) return;
        const place = verifiedPlaceReferences[current.referenceId] ?? reference;
        const anchor = runtime.at(place.longitude, place.latitude, .16); historyMarker.position.copy(anchor);
        historyMarker.scale.setScalar(1 + phase(state.progress, state.beat === 0 ? 0 : state.beat === 1 ? .34 : .68, state.beat === 0 ? .34 : state.beat === 1 ? .68 : 1));
        historyMarker.userData.reference = place; historyMarker.userData.material = current;
        const screen = project(anchor);
        // The selected city is already named by the atlas. Only introduce a
        // second locality when the evidence actually moves elsewhere, keeping
        // its callout above the timeline's scope band.
        if (viewport.x >= 520 && current.referenceId !== state.city) caption({ key: 'history-place', text: place.name, x: screen.x,
          y: Math.min(screen.y - 45, box.y - 100), anchor, width: 180, color: '#f4d894' });
        const gap = box.width / 3;
        for (let index = 0; index < Math.min(3, events.length); index++) {
          const event = events[index], active = index === state.beat, reached = index <= state.beat;
          caption({ key: `date-${index}`, text: event.date, x: box.left + gap * (index + .5), y: box.y - 26, width: Math.min(180, gap - 8), color: active ? '#f4d894' : reached ? '#bcd9d0' : '#88958d' });
          if (viewport.x >= 520 || active) caption({ key: `event-${index}`, text: event.title,
            x: viewport.x < 520 ? box.center : box.left + gap * (index + .5), y: box.y + 5,
            width: viewport.x < 520 ? box.width : Math.min(230, gap - 8), color: active ? '#f4d894' : reached ? '#c9d5c8' : '#88958d' });
        }
        caption({ key: 'history-scope', text: '材料逐段累积 · 地点为聚居地参照', x: box.center, y: box.y - 64, width: Math.min(324, box.width), anchor });
        const short = state.city === 'ngari' ? '从狮泉河生活转向托林的历史材料' : state.city === 'lhasa' ? '不同年代的建设、使用与保护' : '地方实践 → 传习与文物记录';
        caption({ key: 'history-cause', text: short, x: box.center, y: box.y + 46, width: Math.min(350, box.width), color: '#b7d9cc' });
      }
    },
    dispose() { terrainLife.dispose(); captions.clear(); },
  };
}

