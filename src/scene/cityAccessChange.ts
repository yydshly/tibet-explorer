import * as THREE from 'three';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { GOLD, TEAL, disposeTree, label, line } from './environment';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';
import { cityAccessCities, cityAccessCityRange, cityAccessPhases } from '../lib/cityAccessState';
import { cityAccessChanges } from '../data/cityAccessChange';
import { buildCityGroundFunctions, type GroundStory } from './cityGroundFunctions';

export const CITY_ACCESS_IDS = cityAccessCities;
type City = typeof CITY_ACCESS_IDS[number];
export type CityAccessSettings = { layer: string; step: number; progress: number; cityLifeServices?: boolean; cityAccessTransfer?: boolean; cityAccessContext?: boolean; cityGroundStory?: GroundStory; cityGroundProgress?: number; cityGroundServices?: boolean; cityAccessGroundOnly?: boolean };
type Runtime = { camera: THREE.PerspectiveCamera; at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3; metres: (longitude: number, latitude: number) => number | undefined };
type Sample = { longitude: number; latitude: number; metres: number };
const names: Record<City, string> = { nyingchi: '林芝', lhasa: '拉萨', ngari: '阿里' };
const colors: Record<City, number> = { nyingchi: TEAL, lhasa: GOLD, ngari: 0xb8c5e5 };
const boundary = [...cityAccessPhases.map(value => value.at), 1];
const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));

/** Four authored explanations share the actual narration clock. No elapsed
 * duration, speed comparison or independent animation timer is introduced. */
export function cityAccessChangeState(settings: CityAccessSettings, city: City) {
  const index = CITY_ACCESS_IDS.indexOf(city), { start: from, end: to } = cityAccessCityRange(city);
  const progress = phase(clamp(settings.progress), from, to), beat = cityAccessPhases.reduce((latest, entry, i) => progress + 1e-9 >= entry.at ? i : latest, 0);
  const access = settings.cityLifeServices !== false, transfer = settings.cityAccessTransfer !== false;
  return { city, progress, beat, active: settings.progress >= from && (index === 2 || settings.progress < to), started: settings.progress >= from,
    access, transfer, ground: progress, crossing: phase(progress, boundary[1], boundary[2]), local: transfer ? phase(progress, boundary[2] + .035, boundary[3]) : 0,
    handoff: phase(progress, boundary[2], boundary[2] + .035), unloading: access && transfer ? phase(progress, boundary[3], 1) : 0,
    holder: !access ? 'existing-ground' : progress < .25 ? 'origin' : progress < .52 ? 'new-mode' : !transfer ? 'arrival' : progress < .76 ? 'local-vehicle' : 'use-end',
    beatProgress: phase(progress, boundary[beat], boundary[beat + 1]),
  };
}

/** East–west DEM cross-sections at archived town references. They are a
 * geographical reading, never actual road/rail/airport or station coordinates. */
export function sampleCityAccessTerrain(city: City, read: Runtime['metres'], count = 121): Sample[] {
  const ref = verifiedPlaceReferences[city], result: Sample[] = [];
  for (let index = 0; index < count; index++) {
    const longitude = ref.longitude - 1.2 + index / (count - 1) * 2.4, latitude = ref.latitude, metres = read(longitude, latitude);
    if (metres === undefined || !Number.isFinite(metres)) return [];
    result.push({ longitude, latitude, metres });
  }
  return result;
}

/** The source heights determine the profile; bridge and bore demonstrate
 * alternative crossings, with deliberately magnified display clearance. */
export function cityAccessRailSection(samples: Sample[]) {
  if (samples.length < 65) return undefined;
  const minimum = Math.min(...samples.map(point => point.metres)), maximum = Math.max(...samples.map(point => point.metres));
  const natural = samples.map((sample, index) => new THREE.Vector3(-2.15 + index / (samples.length - 1) * 2.85, .22 + (sample.metres - minimum) / Math.max(100, maximum - minimum) * 1.03, 0));
  const half = 8; let valley = 17, ridge = natural.length - 20, bestValley = -Infinity, bestRidge = -Infinity;
  for (let index = half + 3; index < natural.length - half - 3; index++) {
    const score = (natural[index - half].y + natural[index + half].y) / 2 - natural[index].y;
    if (score > bestValley) { valley = index; bestValley = score; }
  }
  for (let index = half + 3; index < natural.length - half - 3; index++) {
    if (Math.abs(index - valley) < half * 2 + 6) continue;
    const score = natural[index].y - (natural[index - half].y + natural[index + half].y) / 2;
    if (score > bestRidge) { ridge = index; bestRidge = score; }
  }
  const rail = natural.map(point => point.clone()), bridge = { from: valley - half, to: valley + half, centre: valley, deckY: Math.max(...natural.slice(valley - half, valley + half + 1).map(point => point.y)) + .11 }, tunnel = { from: ridge - half, to: ridge + half, centre: ridge };
  for (let index = bridge.from; index <= bridge.to; index++) rail[index].y = bridge.deckY;
  for (const index of [bridge.from - 1, bridge.to + 1]) rail[index].y = (natural[index].y + bridge.deckY) / 2;
  for (let index = tunnel.from; index <= tunnel.to; index++) rail[index].lerpVectors(natural[tunnel.from], natural[tunnel.to], (index - tunnel.from) / (tunnel.to - tunnel.from));
  return { samples, minimum, maximum, natural, rail, bridge, tunnel };
}

export function cityAccessPoint(points: THREE.Vector3[], progress: number) {
  const position = clamp(progress) * Math.max(0, points.length - 1), index = Math.min(points.length - 2, Math.floor(position));
  return points[index].clone().lerp(points[index + 1], position - index);
}

type Section = NonNullable<ReturnType<typeof cityAccessRailSection>>;
const material = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
function box(width: number, height: number, depth: number, color: number, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color)); object.position.set(x, y, z); object.renderOrder = 32; return object;
}
function stroke(points: THREE.Vector3[], color: number, radius = .018, opacity = 1) {
  const path = new THREE.CurvePath<THREE.Vector3>(); for (let index = 0; index < points.length - 1; index++) path.add(new THREE.LineCurve3(points[index], points[index + 1]));
  const object = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(24, points.length * 2), radius, 5, false), material(color, opacity)); object.renderOrder = 26; return object;
}
function vehicle(kind: 'car' | 'train' | 'plane', color: number) {
  const group = new THREE.Group(); group.userData.kind = kind === 'train' ? 'access-visible-train' : kind === 'plane' ? 'access-visible-aircraft' : 'access-visible-ground-vehicle';
  if (kind === 'plane') {
    group.add(box(.68, .11, .13, color), box(.25, .025, .65, color, -.04, .015), box(.14, .17, .025, color, -.24, .07), box(.1, .025, .3, color, -.25, .02));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.075, .2, 8), material(color)); nose.rotation.z = -Math.PI / 2; nose.position.x = .39; group.add(nose);
  } else {
    for (let index = 0; index < (kind === 'train' ? 3 : 1); index++) {
      const x = kind === 'train' ? -index * .3 : 0, width = kind === 'train' ? .27 : .42;
      group.add(box(width, .18, .16, color, x, .14), box(width * .7, .055, .17, 0xcde3de, x, .18));
      if (kind === 'car') group.add(box(.17, .1, .16, color, .12, .27));
      for (const dx of [-width * .3, width * .3]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.048, .048, .19, 8), material(0x142d31)); wheel.rotation.x = Math.PI / 2; wheel.position.set(x + dx, .035, 0); group.add(wheel); }
    }
  }
  group.renderOrder = 34; return group;
}
function baggage(city: City) {
  const group = new THREE.Group(); group.userData = { kind: 'access-same-journey-or-goods-marker', city, scope: '同一个出行/货物标志的交接，不是收益、客流或人物模型' };
  group.add(box(.17, .15, .14, GOLD, 0, .11));
  if (city === 'ngari') group.add(box(.07, .035, .04, GOLD, 0, .205));
  else group.add(box(.018, .15, .15, 0xa37a40, 0, .11));
  return group;
}
type Model = { city: City; anchor: THREE.Vector3; panel: THREE.Group; infrastructure: THREE.Group; annotations: THREE.Group; newMode: THREE.Group; oldCar: THREE.Group; localCar: THREE.Group; parcel: THREE.Group; endpoint: THREE.Group; arrival: THREE.Group; leader: THREE.Line; section?: Section; signature: string; annotationKey: string };
type Caption = { sprite: THREE.Sprite; leader: THREE.Line; text: string };
const cues: Record<City, readonly string[]> = { nyingchi: ['原有公路与航空', '2021·增加铁路', '到站后地方接续', '彩门村用途与期待'], lhasa: ['原有公路与航空', '2006·接入铁路', '装卸与地方运输', '食品·百货·医药'], ngari: ['2010前·公路进入', '2010·昆莎通航', '下机后地面接续', '札达·2006已开旅馆'] };
export function cityAccessCaptionBox(city: City, width: number, height: number, textWidth: number): AtlasLabelBox {
  const row = { ngari: 0, lhasa: 1, nyingchi: 2 }[city], w = Math.min(width - 24, textWidth);
  return { x: row === 0 ? 12 + w / 2 : row === 2 ? width - 12 - w / 2 : width / 2, y: Math.max(174, height - 108) - (2 - row) * 28, width: w, height: 24 };
}

/** DEM-attached explanatory cutaways stay on the overall map. Enlarged
 * vehicles and platforms are explicitly mechanisms, not surveyed facilities. */
export function buildCityAccessChange(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'rail-air-opening-before-after'; group.userData.kind = 'city-access-change-on-regional-map'; group.visible = false;
  const ground = buildCityGroundFunctions(runtime); group.add(ground.group);
  // Retained only as a legacy API for separate studies. Acquired locality
  // geography replaced these authored decks; regional fallbacks must not bring
  // the rejected three-use planes back onto the real map.
  ground.group.visible=false;ground.group.userData.presentationRetired=true;
  const captions = new Map<City, Caption>(), viewport = new THREE.Vector2();
  const models: Model[] = CITY_ACCESS_IDS.map(city => {
    const panel = new THREE.Group(), infrastructure = new THREE.Group(), annotations = new THREE.Group(), newMode = vehicle(city === 'ngari' ? 'plane' : 'train', colors[city]), oldCar = vehicle('car', 0x9ba8a2), localCar = vehicle('car', 0x79c7ab), parcel = baggage(city), endpoint = new THREE.Group(), arrival = new THREE.Group();
    panel.userData = { kind: 'city-access-terrain-attached-cutaway', city, scope: '地理高程断面与放大交通原理；非实测线路、站场、机场或城市重建' };
    oldCar.userData = { ...oldCar.userData, kind: 'access-existing-ground-vehicle', city }; localCar.userData = { ...localCar.userData, kind: 'access-local-transfer-vehicle', city }; newMode.userData.city = city;
    arrival.userData = { kind: 'access-arrival-platform-principle', city, scope: '抵达端原理，不定位实际车站或昆莎机场' };
    arrival.add(box(.35, .08, .44, 0x9bb8ad));
    if (city === 'ngari') { arrival.add(box(.52, .025, .22, 0xcbd2c1, 0, .04)); for (let i = 0; i < 4; i++) arrival.add(box(.05, .007, .025, GOLD, -.18 + i * .12, .055)); }
    else { arrival.add(box(.3, .1, .07, colors[city], 0, .18, -.13)); }
    endpoint.userData = { kind: 'access-use-carrier', city, scope: city === 'ngari' ? '札达另一处2020经营案例，不声称机场导致收益，非旅馆外观' : '资料所谈生活用途，不是建筑外观或经营增长' };
    endpoint.userData.caseScope=endpoint.userData.scope;
    if (city === 'ngari') { endpoint.add(box(.38, .06, .3, 0x9bb8ad),box(.025,.16,.3,0xb7c6b0,-.18,.08)); }
    else { endpoint.add(box(.36, .06, .3, 0x9bb8ad)); for (const x of [-.12, .1]) endpoint.add(box(.14, .14, .14, city === 'lhasa' ? 0xa0d0b2 : 0xc9b586, x, .11)); }
    annotations.userData = { kind: 'access-active-spatial-labels', city };
    panel.add(infrastructure, oldCar, newMode, localCar, arrival, endpoint, parcel, annotations); group.add(panel);
    const leader = line([new THREE.Vector3(), new THREE.Vector3()], colors[city], .55); (leader.material as THREE.Material).depthTest = false; leader.renderOrder = 22; leader.userData = { kind: 'access-map-anchor-leader', city }; group.add(leader);
    return { city, anchor: new THREE.Vector3(), panel, infrastructure, annotations, newMode, oldCar, localCar, parcel, endpoint, arrival, leader, signature: '', annotationKey: '' };
  });
  const updateLine = (object: THREE.Line, a: THREE.Vector3, b: THREE.Vector3) => { const attr = object.geometry.attributes.position as THREE.BufferAttribute; attr.setXYZ(0, a.x, a.y, a.z); attr.setXYZ(1, b.x, b.y, b.z); attr.needsUpdate = true; object.geometry.computeBoundingSphere(); };
  function rebuild(model: Model) {
    const samples = sampleCityAccessTerrain(model.city, runtime.metres); if (!samples.length) return false;
    const signature = samples.map(point => point.metres.toFixed(1)).join(','); if (signature === model.signature) return true;
    const section = cityAccessRailSection(samples); if (!section) return false;
    disposeTree(model.infrastructure); model.signature = signature; model.section = section;
    const { natural, rail, bridge, tunnel } = section, positions: number[] = [];
    for (let index = 0; index < natural.length - 1; index++) { const a = natural[index], b = natural[index + 1]; for (const p of [a, b, new THREE.Vector3(a.x, -.05, 0), b, new THREE.Vector3(b.x, -.05, 0), new THREE.Vector3(a.x, -.05, 0)]) positions.push(p.x, p.y, p.z - .04); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const profile = new THREE.Mesh(geometry, material(colors[model.city], .29)); profile.renderOrder = 23; profile.userData = { kind: 'access-real-dem-profile', city: model.city, samples, minimum: section.minimum, maximum: section.maximum, scope: '同城东西向地理高程断面；显示放大，非交通实测纵断面' }; model.infrastructure.add(profile);
    const road = stroke(natural.map((point, index) => point.clone().setZ(.04 + Math.sin(index / natural.length * Math.PI * 5) * .045)), 0xa0ada4, .025, .8); road.userData = { kind: 'access-existing-ground-reference', city: model.city, scope: '原有地面通行受高差约束的原理，不是历史路网' }; model.infrastructure.add(road);
    if (model.city !== 'ngari') {
      const track = stroke(rail, colors[model.city], .025); track.userData = { kind: 'access-traversed-rail-principle', city: model.city, rail, natural, bridge, tunnel }; model.infrastructure.add(track);
      const structure = new THREE.Group(); structure.userData = { kind: 'access-new-crossing-structures', city: model.city };
      const deck = stroke([rail[bridge.from], rail[bridge.to]], GOLD, .055); deck.userData = { kind: 'access-traversed-bridge-deck', city: model.city, ...bridge }; structure.add(deck);
      for (const index of [bridge.from, bridge.centre, bridge.to]) { const bottom = natural[index], pier = box(.035, Math.max(.01, bridge.deckY - bottom.y), .07, 0xbfc9af, bottom.x, (bridge.deckY + bottom.y) / 2); pier.userData = { kind: 'access-bridge-ground-support', city: model.city, ground: bottom.clone() }; structure.add(pier); }
      const bore = stroke([rail[tunnel.from], rail[tunnel.to]], 0xffba83, .044); bore.userData = { kind: 'access-traversed-ridge-bore', city: model.city, ...tunnel }; structure.add(bore);
      for (const point of [rail[tunnel.from], rail[tunnel.to]]) { const portal = new THREE.Mesh(new THREE.TorusGeometry(.115, .025, 6, 24), material(0xffba83)); portal.position.copy(point); portal.renderOrder = 29; structure.add(portal); }
      model.infrastructure.add(structure);
    } else {
      const flight = Array.from({ length: 49 }, (_, index) => {
        const t = index / 48, ground = cityAccessPoint(natural, t), base = THREE.MathUtils.lerp(natural[0].y + .045, natural.at(-1)!.y + .08, t);
        return new THREE.Vector3(ground.x, Math.max(ground.y + .045, base + Math.sin(t * Math.PI) * 1.55), .055);
      });
      const flightLine = line(flight, colors[model.city], .28, true); (flightLine.material as THREE.Material).depthTest = false; flightLine.userData = { kind: 'access-aviation-principle', city: model.city, points: flight, scope: '航空抵达机制，非航迹、高度或机场位置' }; model.infrastructure.add(flightLine);
    }
    const local = [new THREE.Vector3(.7, model.city === 'ngari' ? natural.at(-1)!.y + .08 : rail.at(-1)!.y, .06), new THREE.Vector3(1.05, .3, .06), new THREE.Vector3(1.4, .3, .06), new THREE.Vector3(1.8, .3, .06), new THREE.Vector3(2.05, .35, .06)];
    const localRoad = stroke(local, 0x79c7ab, .025, .7); localRoad.userData = { kind: 'access-local-connection-principle', city: model.city, points: local, scope: '入城/入地区后仍需地方运输；不画实际接驳线路' }; model.infrastructure.add(localRoad);
    if (model.city === 'lhasa') { const localBridge = box(.68, .045, .2, 0xb8ccb5, 1.37, .27, .04); localBridge.userData = { kind: 'access-local-river-bridge-principle', city: model.city, scope: '地方跨河接续原理，不定位柳梧大桥形制与位置' }; model.infrastructure.add(localBridge); const water = box(.48, .035, .27, TEAL, 1.37, .09, -.01); water.userData.kind = 'access-local-river-principle'; model.infrastructure.add(water); }
    model.arrival.position.set(.7, local[0].y, .04); model.endpoint.position.set(2.05, .35, .06);
    model.annotationKey = '';
    return true;
  }
  const project = (point: THREE.Vector3) => { const p = point.clone().project(runtime.camera); return { x: (p.x + 1) * viewport.x / 2, y: (1 - p.y) * viewport.y / 2, z: p.z }; };
  function spatialLabels(model: Model, state: ReturnType<typeof cityAccessChangeState>, pixelWidth: number) {
    model.annotations.visible = state.active;
    if (!model.annotations.visible || !model.section) return;
    const key = `${model.signature}:${state.beat}:${state.access}:${state.transfer}:${pixelWidth}`;
    if (key === model.annotationKey) return;
    model.annotationKey = key; disposeTree(model.annotations);
    const { minimum, maximum, bridge, tunnel, rail } = model.section;
    const add = (text: string, point: THREE.Vector3, anchor: THREE.Vector3 | undefined, width: number, kind = 'access-object-label') => {
      const sprite = label(text, '#f2ecd4'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 43; sprite.position.copy(point); sprite.scale.set(width * 4.5 / pixelWidth, (viewport.x < 520 ? 17 / .62 : 21) * 4.5 / pixelWidth, 1);
      sprite.userData = { kind, city: model.city, text, minimum, maximum, source: 'actual DEM samples', displayExaggerated: true };
      model.annotations.add(sprite);
      if (anchor) { const leader = line([anchor, point], colors[model.city], .6); (leader.material as THREE.Material).depthTest = false; leader.renderOrder = 40; model.annotations.add(leader); }
    };
    if (viewport.x < 520) {
      const text = !state.access || state.beat === 0 ? '原有地面通行' : state.beat === 1 ? model.city === 'ngari' ? '新增航空抵达' : '列车跨谷穿山' : !state.transfer ? '抵达·尚未接续' : state.beat === 2 ? '地方车辆接续' : '进入生活用途';
      const anchor = !state.access || state.beat === 0 ? model.section.natural[40] : state.beat === 1 ? model.city === 'ngari' ? new THREE.Vector3(-.2, 2, .055) : rail[bridge.centre] : state.beat === 2 ? new THREE.Vector3(1.3, .3, .06) : model.endpoint.position;
      add(text, new THREE.Vector3(state.beat < 2 ? -.45 : 1.05, state.beat < 2 ? 1.65 : 1.25, .15), anchor, 104);
      return;
    }
    add(`DEM 低 ${Math.round(minimum)}／高 ${Math.round(maximum)} m · 显示放大`, new THREE.Vector3(-.25, -.43, .15), undefined, 310, 'access-dem-minimum-maximum-label');
    if (!state.access || state.beat === 0) {
      const road = model.section.natural[Math.floor(model.section.natural.length * .3)];
      add('原有地面通行', road.clone().add(new THREE.Vector3(0, .4, .15)), road, 114);
    } else if (state.beat === 1) {
      if (model.city === 'ngari') add('新增航空抵达', new THREE.Vector3(-.65, 2.65, .15), new THREE.Vector3(-.65, 2.1, .055), 116);
      else {
        add('跨谷桥面', rail[bridge.centre].clone().add(new THREE.Vector3(0, .43, .15)), rail[bridge.centre], 88);
        add('岭下通道', rail[tunnel.centre].clone().add(new THREE.Vector3(0, -.37, .15)), rail[tunnel.centre], 88);
      }
    } else if (!state.transfer) {
      add('抵达后·接续未加入', model.arrival.position.clone().add(new THREE.Vector3(.18, .48, .15)), model.arrival.position, 156);
    } else if (state.beat === 2) {
      add(model.city === 'ngari' ? '下机后' : '到站后', model.arrival.position.clone().add(new THREE.Vector3(-.25, .42, .15)), model.arrival.position, 72);
      add(model.city === 'lhasa' ? '地方车·跨河接续' : '地方车辆接续', new THREE.Vector3(1.65, .85, .15), new THREE.Vector3(1.35, .3, .06), 132);
    } else {
      const text = model.city === 'lhasa' ? '地方接续端·用途见资料' : model.city === 'ngari' ? '地方接续端·访问另核实' : '地方接续端·用途见资料';
      add(text, new THREE.Vector3(1.55, 1, .15), model.endpoint.position, model.city === 'ngari' ? 148 : 132);
    }
  }
  function caption(model: Model, state: ReturnType<typeof cityAccessChangeState>) {
    const text = `${names[model.city]}·${!state.access ? '开通前·保留地面方式' : !state.transfer && state.progress >= .52 ? '已抵达·接续未加入' : cues[model.city][state.beat]}`;
    let item = captions.get(model.city);
    if (!item || item.text !== text) { if (item) { group.remove(item.sprite, item.leader); item.sprite.material.map?.dispose(); item.sprite.material.dispose(); item.leader.geometry.dispose(); (item.leader.material as THREE.Material).dispose(); } const sprite = label(text, state.active ? '#f3e4b7' : '#d4dfd5'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 45; sprite.userData = { kind: 'access-synchronized-caption', city: model.city, text }; const leader = line([model.anchor, model.anchor], colors[model.city], .5); (leader.material as THREE.Material).depthTest = false; item = { sprite, leader, text }; captions.set(model.city, item); group.add(sprite, leader); }
    const mobile = viewport.x < 520, p = project(model.anchor), width = mobile ? Math.min(248, text.length * 11 + 20) : Math.min(252, text.length * 11 + 22);
    const panel = project(model.panel.position);
    const b = mobile ? cityAccessCaptionBox(model.city, viewport.x, viewport.y, width) : { x: THREE.MathUtils.clamp(state.active ? panel.x : p.x + (model.city === 'nyingchi' ? 48 : model.city === 'lhasa' ? -52 : -12), viewport.x > 900 ? 346 + width / 2 : width / 2 + 12, viewport.x - width / 2 - 12), y: THREE.MathUtils.clamp(state.active ? panel.y + 68 : p.y + (model.city === 'lhasa' ? 90 : -78), 116, Math.max(116, viewport.y - 210)), width, height: 24 };
    item.sprite.position.set(b.x / viewport.x * 2 - 1, 1 - b.y / viewport.y * 2, .5).unproject(runtime.camera); const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), depth = -item.sprite.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z; item.sprite.scale.set(b.width * depth / focal, b.height * depth / focal, 1); item.sprite.userData.screenBox = b; item.leader.userData = { kind: 'access-caption-geographic-leader', city: model.city, anchor: model.anchor.clone() }; updateLine(item.leader, model.anchor, item.sprite.position); item.sprite.visible = item.leader.visible = p.z > -1 && p.z < 1;
  }
  return {
    group,
    frame(city: City) { return models.find(model => model.city === city)?.panel; },
    ground,
    occupied(settings: CityAccessSettings, size: THREE.Vector2): AtlasLabelBox[] { if (settings.layer !== 'atlas-city-comparison' || settings.step !== 4) return []; viewport.copy(size); return CITY_ACCESS_IDS.map(city => cityAccessCaptionBox(city, size.x, size.y, Math.min(248, size.x - 24))); },
    update(settings: CityAccessSettings, size: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-city-comparison' && settings.step === 4; if (!group.visible) return; viewport.copy(size);
      ground.update({ story: settings.cityGroundStory ?? 'development', progress: settings.cityGroundProgress ?? settings.progress, services: settings.cityGroundServices ?? settings.cityLifeServices !== false, transfer: settings.cityAccessTransfer }, size);ground.group.visible=false;
      if (settings.cityAccessGroundOnly) { models.forEach(model => { model.panel.visible = model.leader.visible = false; }); captions.forEach(item => item.sprite.visible = item.leader.visible = false); return; }
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(runtime.camera.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(runtime.camera.quaternion);
      for (const model of models) {
        const state = cityAccessChangeState(settings, model.city), ref = verifiedPlaceReferences[model.city]; model.anchor.copy(runtime.at(ref.longitude, ref.latitude, .14));
        const ready=rebuild(model);model.panel.userData.state=state;model.panel.userData.terrainAnchor=model.anchor.clone();model.panel.visible = state.active&&ready; model.leader.visible = state.active;
        if(!state.active){model.annotations.visible=false;model.newMode.visible=model.localCar.visible=false;const previous=captions.get(model.city);if(previous)previous.sprite.visible=previous.leader.visible=false;continue;}
        if (!model.section) continue; const section = model.section;
        const focal = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), depth = -model.anchor.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z, perPixel = depth / Math.max(1, focal), mobile = size.x < 520, pixelWidth = mobile ? state.active ? 160 : 52 : state.active ? Math.min(settings.cityAccessContext ? 300 : 340, size.x * .36) : settings.cityAccessContext ? 104 : 136;
        const p = project(model.anchor), desiredX = p.x + (mobile ? model.city === 'nyingchi' ? 24 : model.city === 'lhasa' ? -24 : -10 : model.city === 'nyingchi' ? 38 : model.city === 'lhasa' ? -45 : -15);
        const x = THREE.MathUtils.clamp(desiredX, (size.x > 900 ? 346 : 0) + pixelWidth * .69 + 14, size.x - pixelWidth * .53 - 18);
        const desiredY = p.y + (mobile ? -15 : state.active ? model.city === 'lhasa' ? 30 : -18 : model.city === 'lhasa' ? 18 : -13), mobileCaptionTop = cityAccessCaptionBox('ngari', size.x, size.y, 248).y - 12;
        const y = mobile ? THREE.MathUtils.clamp(desiredY, 110 + pixelWidth * .37, Math.max(110 + pixelWidth * .37, mobileCaptionTop - 10)) : THREE.MathUtils.clamp(desiredY, 118 + pixelWidth * .66, Math.max(118 + pixelWidth * .66, size.y - 288));
        model.panel.position.copy(model.anchor).addScaledVector(right, perPixel * (x - p.x)).addScaledVector(up, perPixel * (p.y - y));
        model.panel.quaternion.copy(runtime.camera.quaternion); model.panel.scale.set(perPixel * pixelWidth / 4.5, perPixel * pixelWidth / 4.5 * (mobile ? .62 : 1), perPixel * pixelWidth / 4.5); model.panel.userData = { ...model.panel.userData, state, pixelWidth, terrainAnchor: model.anchor.clone(), sourceHeightsUnchanged: section.samples.map(point => point.metres), sourcePhase: cityAccessPhases[state.beat].id, sourceLabel: cityAccessChanges[model.city][cityAccessPhases[state.beat].id].label, sourceIds: cityAccessChanges[model.city].sourceIds };
        model.panel.updateMatrixWorld(true); updateLine(model.leader, model.anchor, model.panel.localToWorld(new THREE.Vector3(0, -.05, 0))); model.leader.userData.anchor = model.anchor.clone();
        const old = cityAccessPoint(section.natural, state.ground); model.oldCar.position.copy(old).add(new THREE.Vector3(0, .035, .1)); model.oldCar.rotation.z = 0; model.oldCar.visible = true; model.oldCar.userData.progress = state.ground;
        const accessGeometry = model.infrastructure.children.filter(child => ['access-traversed-rail-principle', 'access-new-crossing-structures', 'access-aviation-principle'].includes(child.userData.kind)); accessGeometry.forEach(child => child.visible = state.access && state.progress >= .25);
        model.newMode.visible = state.access && state.progress >= .25;
        if (model.city === 'ngari') { const flight = model.infrastructure.children.find(child => child.userData.kind === 'access-aviation-principle')!.userData.points as THREE.Vector3[]; model.newMode.position.copy(cityAccessPoint(flight, state.crossing)); model.newMode.rotation.z = state.crossing > .62 && state.crossing < .98 ? -.22 : 0; }
        else { model.newMode.position.copy(cityAccessPoint(section.rail, state.crossing)).add(new THREE.Vector3(0, .045, .055)); model.newMode.rotation.z = 0; }
        model.newMode.userData.progress = state.crossing; model.newMode.userData.pathPoint = model.newMode.position.clone();
        const localRoad = model.infrastructure.children.find(child => child.userData.kind === 'access-local-connection-principle')!, local = localRoad.userData.points as THREE.Vector3[];
        local[0].y = model.arrival.position.y; const localPosition = cityAccessPoint(local, state.local); model.localCar.position.copy(localPosition).add(new THREE.Vector3(0, .035, .12)); model.localCar.visible = state.access && state.transfer && state.progress >= .52; model.localCar.userData.progress = state.local;
        localRoad.visible = state.access && state.transfer; model.infrastructure.children.filter(child => child.userData.kind === 'access-local-river-bridge-principle' || child.userData.kind === 'access-local-river-principle').forEach(child => child.visible = state.access && state.transfer);
        model.arrival.visible = state.access && state.progress >= .25; model.endpoint.visible = state.access&&state.transfer&&state.progress>=boundary[3]; model.endpoint.userData.reached = state.access && state.transfer && state.progress + 1e-9 >= boundary[3];model.endpoint.userData.scope='地方接续端示意，不是已核验的旅馆、用途建筑或实际道路终点';
        const origin = model.city === 'ngari' ? (model.infrastructure.children.find(child => child.userData.kind === 'access-aviation-principle')!.userData.points as THREE.Vector3[])[0] : section.rail[0].clone().add(new THREE.Vector3(0, .045, .055));
        let parcelPosition = state.holder === 'existing-ground' ? model.oldCar.position.clone() : state.holder === 'origin' ? origin.clone() : state.holder === 'new-mode' || state.holder === 'arrival' ? model.newMode.position.clone() : state.holder === 'local-vehicle' ? model.newMode.position.clone().lerp(model.localCar.position, state.handoff) : model.localCar.position.clone().lerp(model.endpoint.position, phase(state.unloading, 0, .18));
        model.parcel.position.copy(parcelPosition).add(new THREE.Vector3(0, .25, .2)); model.parcel.visible = true; model.parcel.userData.holder = state.holder; model.parcel.userData.localDelivered = state.unloading;
        // The one object remains in the visible transport mechanism. Missing
        // local route/service geometry cannot be replaced by an invisible or
        // invented functional district at another town.
        if(state.holder==='use-end'){model.parcel.userData.destination='visible-local-transfer-end';model.parcel.userData.groundUseCase=undefined;model.parcel.userData.groundReferenceId=undefined;model.panel.updateMatrixWorld(true);model.parcel.userData.worldPosition=model.panel.localToWorld(model.parcel.position.clone());}
        if (settings.cityAccessContext) { model.annotations.visible = false; const previous = captions.get(model.city); if (previous) previous.sprite.visible = previous.leader.visible = false; }
        else { spatialLabels(model, state, pixelWidth); caption(model, state); }
      }
    },
    dispose() { ground.dispose(); disposeTree(group); captions.clear(); },
  };
}
