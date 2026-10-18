import * as THREE from 'three';
import { cityContinuityReferences } from '../data/cityContinuity';
import { cityContinuityLessons } from '../data/cityContinuityLessons';
import { cityAccessChanges } from '../data/cityAccessChange';
import { cityAccessCities, cityAccessCityRange } from '../lib/cityAccessState';
import { cityContinuityPartStarts, cityContinuityPartState } from '../lib/cityContinuityState';
import { GOLD, TEAL, label, line, disposeTree } from './environment';

type City = typeof cityAccessCities[number];
export type GroundStory = 'history' | 'development' | 'connections' | 'travel';
type Runtime = { camera: THREE.PerspectiveCamera; at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3; metres: (longitude: number, latitude: number) => number | undefined };
type CaseId = 'culture' | 'lulang' | 'lhasa-history' | 'tholing' | 'ngari-river' | 'nyingchi-use' | 'lhasa-use' | 'ngari-use';
type Settings = { story: GroundStory; progress: number; services: boolean; transfer?: boolean };
const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z), clamp = (x: number) => THREE.MathUtils.clamp(Number.isFinite(x) ? x : 0, 0, 1), phase = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
const colors: Record<City, number> = { nyingchi: TEAL, lhasa: GOLD, ngari: 0xb8c5e5 };
const specs: Record<CaseId, { city: City; reference: string; roles: readonly [string, string, string]; kind: string }> = {
  culture: { city: 'nyingchi', reference: 'nyingchi', roles: ['已有文化活动', '讲解与剪纸实践', '共同参与与传习'], kind: 'public-cultural-participation' },
  lulang: { city: 'nyingchi', reference: 'lulang', roles: ['经过与接驳', '停留与接待', '住宿·步行商业'], kind: 'lulang-stop-reception-service' },
  'lhasa-history': { city: 'lhasa', reference: 'lhasa', roles: ['宗教活动', '礼仪·接见·居住', '纪念·宗教用途'], kind: 'lhasa-distinct-use-spaces' },
  tholing: { city: 'ngari', reference: 'tholing', roles: ['教师与学习', '写本学习与翻译', '知识继续使用'], kind: 'tholing-learning-and-translation' },
  'ngari-river': { city: 'ngari', reference: 'ngari', roles: ['沿河步行', '两岸绿化', '休闲与地方使用'], kind: 'shiquanhe-riverside-public-use' },
  'nyingchi-use': { city: 'nyingchi', reference: 'nyingchi', roles: ['地方接续入口', '接待与寄售', '特产与求学用途'], kind: 'nyingchi-reception-and-goods-use' },
  'lhasa-use': { city: 'lhasa', reference: 'lhasa', roles: ['货物装卸', '地方配送', '食品·百货·医药'], kind: 'lhasa-goods-distribution' },
  'ngari-use': { city: 'ngari', reference: 'tholing', roles: ['已有地方接待', '地面接续到达', '接待与存放使用'], kind: 'existing-local-reception-not-airport-effect' },
};
export function cityGroundCase(story: GroundStory, city: City, index: number): CaseId {
  if (story === 'development') return city === 'nyingchi' ? 'nyingchi-use' : city === 'lhasa' ? 'lhasa-use' : 'ngari-use';
  if (city === 'nyingchi') return story === 'history' ? index === 2 ? 'lulang' : 'culture' : story === 'connections' ? index === 2 ? 'lulang' : 'nyingchi-use' : index === 0 ? 'culture' : 'lulang';
  if (city === 'lhasa') return story === 'history' || index > 0 && story === 'travel' || index === 2 && story === 'connections' ? 'lhasa-history' : 'lhasa-use';
  return story === 'history' ? index === 2 ? 'ngari-river' : 'tholing' : story === 'travel' ? index === 0 ? 'ngari-river' : index === 1 ? 'tholing' : 'ngari-use' : 'ngari-use';
}
export function cityGroundFunctionState(settings: Settings, city: City) {
  const range = cityAccessCityRange(city), local = phase(settings.progress, range.start, range.end), index = cityContinuityPartStarts.reduce<number>((last, from, i) => local + 1e-9 >= from ? i : last, 0), part = phase(local, cityContinuityPartStarts[index], cityContinuityPartStarts[index + 1] ?? 1), active = cityContinuityPartState(settings.progress).cityId === city;
  const id = cityGroundCase(settings.story, city, index), enabled = settings.story === 'travel' || settings.services && settings.transfer !== false;
  const motion = settings.story === 'development' ? phase(local, .76, 1) : part;
  const role = id === 'lhasa-history' && settings.story === 'history' ? index : id === 'culture' && settings.story === 'history' ? index : id === 'tholing' && settings.story === 'history' ? index : Math.min(2, Math.floor(motion * 3));
  return { city, id, local, index, part, active, enabled, role, motion: enabled ? motion : 0, observation: settings.story === 'travel' && settings.services && index > 0, quietContext: settings.story === 'travel' && index === 0 };
}

const flat = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: true, side: THREE.DoubleSide });
function box(parent: THREE.Object3D, w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color)); m.position.set(x, y, z); m.renderOrder = 29; parent.add(m); return m; }
type Zone = { root: THREE.Group; floor: THREE.Mesh; gate: THREE.Group; flaps: THREE.Group[]; movable: THREE.Group; receiver: THREE.Group; cargo: THREE.Group; workpiece: THREE.Group; scissors: THREE.Group; roof: THREE.Group; marker: THREE.Mesh; u: number; v: number };
type Model = { id: CaseId; root: THREE.Group; content: THREE.Group; zones: Zone[]; actors: THREE.Group[]; signature: string; span: number; lon: number; lat: number; unit: number; entry: THREE.Vector3; output: THREE.Vector3; label?: THREE.Sprite; labelText: string; roleLabels: THREE.Sprite[]; pin: THREE.Mesh; scopeLeader: THREE.Line };
export function cityGroundCaseEvidence(id: CaseId) {
  const spec = specs[id];
  if (id.endsWith('-use')) return { sourceRefs: cityAccessChanges[spec.city].sourceIds, lessonIds: [] as string[] };
  const indices = id === 'culture' || id === 'tholing' ? [0, 1] : id === 'lulang' || id === 'ngari-river' ? [2] : [0, 1, 2], parts = indices.map(index => cityContinuityLessons.history[spec.city][index]);
  return { sourceRefs: [...new Set(parts.flatMap(part => part.sourceIds))], lessonIds: parts.map(part => part.id) };
}

/** Spatial use mechanisms share the actual terrain, fixed geographic axes and
 * one audio clock. The authored footprint is a functional reading window,
 * never a measured city boundary, palace plan, river channel or facility site. */
export function buildCityGroundFunctions(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'regional-ground-use-processes'; group.userData.kind = 'city-ground-functional-processes';
  const models = (Object.keys(specs) as CaseId[]).map(id => {
    const root = new THREE.Group(), content = new THREE.Group(), pin = new THREE.Mesh(new THREE.OctahedronGeometry(.07), flat(colors[specs[id].city])), scopeLeader = line([V(0, 0), V(0, 0)], colors[specs[id].city], .4); root.add(content); group.add(root, pin, scopeLeader); (scopeLeader.material as THREE.Material).depthTest = false;
    root.userData = { kind: 'ground-use-case', caseId: id, city: specs[id].city, referenceId: specs[id].reference, functionKind: specs[id].kind, scope: '真实高程上的作者功能阅读窗口；非测绘城界、建筑平面、真实设施位置、古道或河道' }; pin.userData = { kind: 'ground-use-archived-place-pin', referenceId: specs[id].reference }; scopeLeader.userData.kind = 'ground-functional-window-reference-leader';
    return { id, root, content, pin, scopeLeader, zones: [], actors: [], signature: '', span: 0, lon: 0, lat: 0, unit: 1, entry: V(0, 0), output: V(0, 0), labelText: '', roleLabels: [] } as Model;
  });
  const size = new THREE.Vector2(), selected = new Map<City, Model>();
  const project = (p: THREE.Vector3) => { const q = p.clone().project(runtime.camera); return { x: (q.x + 1) * size.x / 2, y: (1 - q.y) * size.y / 2, z: q.z }; };
  const geo = (model: Model, u: number, v: number, offset = .065) => runtime.at(model.lon + u * model.span, model.lat + v * model.span * .42, offset);
  function fit(model: Model, width: number) {
    const ref = cityContinuityReferences[specs[model.id].reference], anchor = runtime.at(ref.lon, ref.lat, .07), p = project(anchor), east = project(runtime.at(ref.lon + .05, ref.lat, .07)), north = project(runtime.at(ref.lon, ref.lat + .05, .07));
    const perLon = Math.max(1, Math.abs(east.x - p.x) / .05), perLat = Math.max(1, Math.abs(north.y - p.y) / .05);
    const left = size.x > 900 ? 358 : 12, right = size.x - 14, top = size.x < 520 ? 100 : 96, bottom = size.y < 500 ? size.y - 135 : size.y - 240;
    const cx = THREE.MathUtils.clamp(p.x, left + width / 2 + 6, Math.max(left + width / 2 + 6, right - width / 2 - 6)), cy = THREE.MathUtils.clamp(p.y, top + 32, Math.max(top + 32, bottom - 22));
    // This is an authored function window near the real place reference. Its
    // small offset keeps the overview legible; the actual reference pin stays.
    const lon = ref.lon + THREE.MathUtils.clamp((cx - p.x) / perLon, -.8, .8), lat = ref.lat + THREE.MathUtils.clamp((p.y - cy) / perLat, -.8, .8);
    const coverage = Math.min((lon - 76) / .94, (101 - lon) / .94, (lat - 25) / .22, (38 - lat) / .22), maximum = Math.min(8, coverage);
    let span = THREE.MathUtils.clamp(width / perLon / 1.82, .14, maximum);
    for (let pass = 0; pass < 4; pass++) {
      const samples = [-.91, -.64, 0, .64, .91].flatMap(u => [-.44, 0, .46].map(v => project(runtime.at(lon + u * span, lat + v * span * .42, .07)).x)), actual = Math.max(...samples) - Math.min(...samples);
      if (actual < 1) break; span = THREE.MathUtils.clamp(span * width / actual, .14, maximum);
    }
    return { lon, lat, span, anchor };
  }
  function rebuild(model: Model, width: number) {
    const fitted = fit(model, width), ref = cityContinuityReferences[specs[model.id].reference], metres = runtime.metres(fitted.lon, fitted.lat); if (metres === undefined) return false;
    const depth = -fitted.anchor.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z, focal = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), unit = depth / Math.max(1, focal) * (size.x < 520 ? 28 : size.y < 500 ? 38 : 42);
    const signature = `${fitted.lon.toFixed(4)}:${fitted.lat.toFixed(4)}:${fitted.span.toFixed(4)}:${unit.toFixed(4)}:${metres.toFixed(1)}`;
    model.pin.position.copy(fitted.anchor); model.pin.scale.setScalar(depth / Math.max(1, focal) * 4 / .07);
    if (model.signature === signature) return true;
    model.signature = signature; model.lon = fitted.lon; model.lat = fitted.lat; model.span = fitted.span; model.unit = unit; disposeTree(model.content); model.zones = []; model.actors = [];
    const baselineSamples = Array.from({ length: 17 }, (_, x) => Array.from({ length: 9 }, (_, y) => geo(model, -.91 + x / 16 * 1.82, -.44 + y / 8 * .9))).flat(), caseBaseline = Math.max(...baselineSamples.map(point => point.y)) + unit * .14;
    for (let index = 0; index < 3; index++) {
      const u = (index - 1) * .64, v = index === 1 ? .18 : -.16, root = new THREE.Group(), positions: number[] = [], samples: { lon: number; lat: number; metres: number }[] = [];
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 14; xx++) {
        const corners = [[xx / 14, yy / 8], [(xx + 1) / 14, yy / 8], [xx / 14, (yy + 1) / 8], [(xx + 1) / 14, (yy + 1) / 8]];
        const points = corners.map(([x, y]) => { const lon = model.lon + (u + (x - .5) * .54) * model.span, lat = model.lat + (v + (y - .5) * .56) * model.span * .42, value = runtime.metres(lon, lat); samples.push({ lon, lat, metres: value ?? 0 }); return runtime.at(lon, lat, .07); });
        for (const n of [0, 1, 2, 1, 3, 2]) positions.push(points[n].x, points[n].y, points[n].z);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); const floor = new THREE.Mesh(geometry, flat([0x7d9f9c, 0xb9a36b, 0x7caa82][index], .27)); floor.renderOrder = 23; floor.userData = { kind: 'terrain-following-functional-use-face', caseId: model.id, role: specs[model.id].roles[index], samples, scope: '作者功能面，不是实测建筑、城市用地或河道边界' }; model.content.add(floor, root);
      const actualCentre = geo(model, u, v), baseline = model.id === 'ngari-river' ? actualCentre.y + unit * .1 : caseBaseline;
      root.position.copy(actualCentre).setY(baseline); root.scale.setScalar(unit);
      if (model.id !== 'ngari-river') {
        const deckGeometry = geometry.clone(), attr = deckGeometry.attributes.position as THREE.BufferAttribute; for (let n = 0; n < attr.count; n++) attr.setY(n, baseline); attr.needsUpdate = true;
        const deck = new THREE.Mesh(deckGeometry, flat([0x4d9f9e, 0xb58c45, 0x6e985f][index], .8)); deck.renderOrder = 24; deck.userData = { kind: 'source-height-use-baseline-not-built-platform', roleIndex: index, sourceSamples: samples, baseline, scope: '局部放大用途基准面，不代表城市改平、真实广场或新增平台；真实地形持续保留' }; model.content.add(deck);
        for (const [du, dv] of [[-.24, -.23], [.24, -.23], [-.24, .23], [.24, .23]]) { const ground = geo(model, u + du, v + dv, .065), top = ground.clone().setY(baseline), support = line([ground, top], colors[specs[model.id].city], .3); support.userData = { kind: 'use-baseline-real-height-reference', ground: ground.clone(), baseline }; model.content.add(support); }
      }
      const gate = new THREE.Group(); gate.position.set(-.78, 0, 0); gate.rotation.y = Math.PI / 2; root.add(gate); box(gate, .06, .55, .07, 0xd4c89a, -.33, .27); box(gate, .06, .55, .07, 0xd4c89a, .33, .27); const flaps = [-1, 1].map(sign => { const flap = new THREE.Group(); flap.position.x = sign * .32; box(flap, .32, .08, .035, GOLD, -sign * .16, .32); gate.add(flap); return flap; }); gate.userData = { kind: 'ground-use-operable-entry', role: specs[model.id].roles[index] };
      const movable = new THREE.Group(), receiver = new THREE.Group(), cargo = new THREE.Group(), workpiece = new THREE.Group(), scissors = new THREE.Group(), roof = new THREE.Group(); root.add(movable, receiver, cargo, workpiece, scissors, roof);
      // Open activity surfaces and use equipment, never conjectural facades.
      box(receiver, 1.1, .12, .65, 0x8f9b86, .1, .15, -.15); box(receiver, .92, .05, .54, 0xd7ccb1, .1, .25, -.15); receiver.userData.kind = 'ground-functional-reception-or-working-surface';
      if (model.id === 'lhasa-history') {
        disposeTree(receiver); receiver.userData = { kind: 'lhasa-distinct-purpose-space', purpose: specs[model.id].roles[index], scope: '宗教、礼仪居住、纪念活动的空间原理；不是寺宫平面、立面或真实位置' };
        box(receiver, 1.12, .035, .88, index === 0 ? 0xbabfa4 : index === 1 ? 0xd9d1ba : 0xb88373, 0, .05);
        if (index === 1) { box(receiver, .035, .28, .8, 0xc9c3ab, .15, .2); box(receiver, .5, .08, .45, 0x9fae9f, .4, .12); box(receiver, .56, .025, .65, GOLD, -.3, .1); }
        else { const focus = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, index === 0 ? .23 : .5, 12), flat(index === 0 ? GOLD : 0xc4b68b)); focus.position.set(.1, index === 0 ? .19 : .32, -.18); focus.userData.kind = 'activity-focus-not-religious-object-reconstruction'; receiver.add(focus); }
      } else if (model.id === 'ngari-river') {
        disposeTree(receiver); receiver.userData = { kind: 'riverside-walk-greening-use', scope: '沿河通行、绿化和休闲功能示意，不定位河道、亲水平台或廊架' };
        box(receiver, 1.25, .025, .3, 0xbfc5ae, 0, .05, .15);
        if (index > 0) for (const x of [-.4, 0, .4]) { const green = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), flat(0x7ca575)); green.scale.set(1, .35, .85); green.position.set(x, .1, -.22); receiver.add(green); }
      } else if (model.id === 'lhasa-use' && index === 2 || model.id === 'nyingchi-use' && index === 2) {
        disposeTree(receiver); receiver.userData.kind = 'daily-goods-storage-and-use-space';
        for (const x of [-.5, .5]) box(receiver, .045, .82, .045, 0x9ea791, x, .42, -.15);
        for (const y of [.16, .45, .74]) box(receiver, 1.05, .04, .45, 0xd3c9a6, 0, y, -.15);
        [0xa6c7a1, 0xc6ad83, 0xa8bbd5].forEach((color, n) => box(receiver, .2, .2, .22, color, -.3 + n * .3, .57, -.13));
      } else if (model.id === 'lulang' && index === 2 || model.id === 'ngari-use' && index === 2) {
        disposeTree(receiver); receiver.userData.kind = 'reception-rest-and-luggage-use-space';
        for (const x of [-.32, .32]) { box(receiver, .42, .13, .85, 0xa3b3a0, x, .12, -.1); box(receiver, .38, .025, .75, 0xd8d1b7, x, .21, -.1); }
      }
      box(cargo, .29, .28, .28, GOLD, 0, .18); box(cargo, .025, .3, .29, 0x99783e, 0, .18); cargo.userData = { kind: 'ground-visible-use-material', caseId: model.id, role: index };
      box(workpiece, .7, .025, .42, 0xe4dfc9, .1, .3, -.15); box(workpiece, .27, .026, .38, 0xe4dfc9, .55, .3, -.15); workpiece.userData.kind = 'blank-working-material-not-original-text-or-pattern';
      const scissorA = box(scissors, .5, .025, .035, 0xb6c7be, .15, .35, -.15), scissorB = box(scissors, .5, .025, .035, 0xb6c7be, .15, .37, -.15); scissorA.rotation.y = .4; scissorB.rotation.y = -.4; scissors.userData.kind = 'blank-paper-cutting-action';
      for (const x of [-.55, .55]) for (const z of [-.4, .4]) box(roof, .035, .72, .035, 0x9b9d7e, x, .37, z); for (let n = 0; n < 6; n++) box(roof, .08, .035, .9, 0xc2bb90, -.5 + n * .2, .74, 0); roof.userData.kind = 'open-shade-and-stay-use-principle';
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .025, 30), flat(colors[specs[model.id].city], .22)); marker.position.set(0, .04, 0); marker.renderOrder = 31; root.add(marker);
      root.userData = { kind: 'ground-use-activity-zone', role: specs[model.id].roles[index], caseId: model.id, longitude: model.lon + u * model.span, latitude: model.lat + v * model.span * .42, displayLift: unit * .12, enlargedFunctionalObjects: true };
      model.zones.push({ root, floor, gate, flaps, movable, receiver, cargo, workpiece, scissors, roof, marker, u, v });
    }
    if (model.id !== 'ngari-river') for (let index = 0; index < 2; index++) {
      const a = geo(model, model.zones[index].u, model.zones[index].v).setY(caseBaseline + .01), b = geo(model, model.zones[index + 1].u, model.zones[index + 1].v).setY(caseBaseline + .01), side = b.clone().sub(a).cross(V(0, 1)).normalize().multiplyScalar(unit * .22), vertices: number[] = [];
      for (const p of [a.clone().add(side), b.clone().add(side), a.clone().sub(side), b.clone().add(side), b.clone().sub(side), a.clone().sub(side)]) vertices.push(p.x, p.y, p.z);
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); const passage = new THREE.Mesh(geometry, flat(0xc6b783, .6)); passage.userData = { kind: 'ground-visible-use-passage', scope: '用途空间的可达关系原理，不是测绘道路、古道或廊道' }; model.content.add(passage);
    }
    model.entry.copy(geo(model, -.94, -.16, .15)); model.output.copy(geo(model, .64, -.16, .15));
    const readActor = new THREE.Group(); box(readActor, .37, .035, .24, 0xe4dfc9); box(readActor, .15, .037, .24, 0xc7d2b6, .25); readActor.userData = { kind: 'ground-continuous-learning-material', caseId: model.id, scope: '学习材料过程，空白无原文；不表示文物、人物或古代行程' }; model.content.add(readActor); readActor.scale.setScalar(unit); model.actors.push(readActor);
    model.root.userData = { ...model.root.userData, sourceReference: { id: ref.id, lon: ref.lon, lat: ref.lat }, readingWindow: { lon: model.lon, lat: model.lat, span: model.span }, groundAligned: true, displayUnit: unit };
    const attr = model.scopeLeader.geometry.attributes.position as THREE.BufferAttribute, dest = geo(model, 0, 0, .07); attr.setXYZ(0, fitted.anchor.x, fitted.anchor.y, fitted.anchor.z); attr.setXYZ(1, dest.x, dest.y, dest.z); attr.needsUpdate = true; model.scopeLeader.geometry.computeBoundingSphere(); return true;
  }
  const pathPoint = (model: Model, t: number) => {
    const points = [{ u: -1.03, v: model.zones[0].v, y: model.zones[0].root.position.y }, ...model.zones.map(zone => ({ u: zone.u, v: zone.v, y: zone.root.position.y }))], n = clamp(t) * 3, index = Math.min(2, Math.floor(n)), a = points[index], b = points[index + 1], f = n - index;
    const point = geo(model, THREE.MathUtils.lerp(a.u, b.u, f), THREE.MathUtils.lerp(a.v, b.v, f), .14); point.y = Math.max(point.y, THREE.MathUtils.lerp(a.y, b.y, f)) + model.unit * .4; return point;
  };
  return {
    group,
    delivery(city: City, fraction: number) { const model = selected.get(city); return model ? { position: pathPoint(model, fraction), entry: model.entry.clone(), output: model.output.clone(), unit: model.unit, referenceId: specs[model.id].reference, caseId: model.id } : undefined; },
    update(settings: Settings, viewport: THREE.Vector2) {
      size.copy(viewport); const states = cityAccessCities.map(city => cityGroundFunctionState(settings, city)); selected.clear();
      const visible = new Set<CaseId>(states.map(state => state.id));
      // Earlier localities remain visible when a chapter turns to another place.
      if (settings.story === 'history' || settings.story === 'travel') { visible.add('culture'); visible.add('tholing'); if (settings.story === 'travel') { visible.add('lulang'); visible.add('ngari-river'); } }
      for (const model of models) {
        const spec = specs[model.id], state = states.find(item => item.city === spec.city)!, current = state.id === model.id; model.root.visible = model.pin.visible = model.scopeLeader.visible = visible.has(model.id); if (!model.root.visible) { if (model.label) model.label.visible = false; model.roleLabels.forEach(sprite => sprite.visible = false); continue; }
        const width = state.active && current ? size.x < 520 ? 166 : size.y < 500 ? 220 : 285 : size.x < 520 ? 45 : 72;
        model.content.visible = rebuild(model, width); if (!model.content.visible) continue; if (current) selected.set(spec.city, model);
        const motion = current ? state.motion : 0, activeRole = state.observation ? state.index : state.role;
        const lesson = settings.story === 'development' ? undefined : cityContinuityLessons[settings.story][spec.city][state.index];
        const evidence = cityGroundCaseEvidence(model.id);
        model.root.userData = { ...model.root.userData, story: settings.story, state, current, active: state.active && current, sourceRefs: current && lesson ? [...new Set([...evidence.sourceRefs, ...lesson.sourceIds])] : evidence.sourceRefs, lessonId: current ? lesson?.id : undefined, contextLessonIds: evidence.lessonIds, referenceId: spec.reference };
        model.content.children.forEach(child => { const mesh = child as THREE.Mesh, material = mesh.material as THREE.MeshBasicMaterial | undefined; if (!material) return; if (child.userData.kind === 'source-height-use-baseline-not-built-platform') material.opacity = current && state.active && !state.quietContext ? state.enabled ? .88 : .22 : .13; if (child.userData.kind === 'ground-visible-use-passage') material.opacity = current && state.active && state.enabled && !state.quietContext ? .8 : .12; });
        model.zones.forEach((zone, index) => {
          const added = settings.story === 'history' && ['lhasa-history', 'culture', 'tholing'].includes(model.id) ? index <= state.index : true, open = current && state.enabled && added, amount = open ? .3 + phase(motion, .12, .5) * .7 : 0;
          zone.floor.material = zone.floor.material as THREE.MeshBasicMaterial; (zone.floor.material as THREE.MeshBasicMaterial).opacity = added ? current ? index === activeRole && (settings.story !== 'travel' || state.observation) && state.enabled ? .7 : state.enabled ? .39 : .13 : .13 : .1;
          zone.root.traverse(child => { const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (material) material.opacity = current && state.active ? state.enabled || settings.story === 'travel' ? child.parent === zone.roof ? .55 : 1 : .35 : .16; });
          zone.flaps.forEach((flap, i) => flap.rotation.y = (i === 0 ? -1 : 1) * amount * Math.PI / 2); zone.gate.userData.open = amount; zone.gate.userData.enabled = open;
          const cultural = model.id === 'culture', learning = model.id === 'tholing', services = model.id === 'lulang' || model.id.endsWith('-use');
          zone.receiver.visible = added; zone.workpiece.visible = (cultural || learning) && added; zone.scissors.visible = cultural && index === 1 && state.index >= 1; zone.roof.visible = services && index > 0 && added;
          zone.roof.scale.y = .25 + amount * .75; zone.workpiece.scale.x = 1 + phase(motion, .2, .65) * .35; zone.workpiece.children[1].position.x = .55 + (cultural ? phase(motion, .48, .8) * .35 : 0);
          zone.scissors.children.forEach((blade, n) => blade.rotation.y = (n ? -1 : 1) * (.16 + Math.sin(phase(motion, .25, .75) * Math.PI * 2) * .22));
          zone.cargo.visible = false; zone.cargo.userData.stored = services && index === 2 && motion >= .9 && state.enabled;
          zone.marker.visible = current && state.active && !state.quietContext && (settings.story === 'travel' ? state.observation : state.enabled) && index === activeRole; zone.marker.scale.setScalar(1 + phase(motion, .2, .8) * .5);
          zone.root.userData = { ...zone.root.userData, enabled: open, added, entryOpen: amount, stored: zone.cargo.userData.stored, sourceRefs: model.root.userData.sourceRefs };
          if (state.quietContext) { zone.root.traverse(child => { const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (material) material.opacity = .12; }); zone.scissors.visible = false; (zone.floor.material as THREE.MeshBasicMaterial).opacity = .12; }
        });
        for (const actor of model.actors) { actor.visible = current && state.enabled && !state.quietContext && (model.id === 'culture' || model.id === 'tholing' || settings.story === 'travel'); actor.position.copy(pathPoint(model, motion)); actor.rotation.y = learningOrientation(model.id, motion); actor.userData.progress = motion; actor.userData.holder = motion < .34 ? 'entry-or-learning' : motion < .68 ? 'working-or-transfer' : 'local-use'; }
        const text = spec.roles[Math.min(2, activeRole)] + (size.x < 520 ? '' : ' · 局部放大');
        if (model.labelText !== text || !model.label) { if (model.label) { model.label.removeFromParent(); model.label.material.map?.dispose(); model.label.material.dispose(); } model.label = label(text, '#f0e5c8'); model.label.onBeforeRender = () => {}; model.label.renderOrder = 46; model.label.userData = { kind: 'ground-functional-short-label', text, caseId: model.id }; group.add(model.label); model.labelText = text; }
        const target = geo(model, model.zones[activeRole].u, model.zones[activeRole].v, .12), p = project(target), w = size.x < 520 ? 126 : Math.min(190, text.length * 11), h = size.x < 520 ? 18 : 21, left = size.x > 900 ? 346 : 0, x = THREE.MathUtils.clamp(p.x, left + w / 2 + 12, size.x - w / 2 - 12), y = THREE.MathUtils.clamp(p.y - 26, 102, Math.max(102, size.y < 500 ? size.y - 165 : size.y - 245));
        model.label.position.set(x / size.x * 2 - 1, 1 - y / size.y * 2, p.z).unproject(runtime.camera); const depth = -model.label.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z, focal = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))); model.label.scale.set(w * depth / focal, h * depth / focal, 1); model.label.visible = state.active && current; model.label.userData.screenBox = { x, y, width: w, height: h };
        model.label.visible &&= size.x < 520 && !state.quietContext;
        model.zones.forEach((zone, index) => {
          let sprite = model.roleLabels[index]; if (!sprite) { sprite = label(spec.roles[index], '#eee4c8'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 47; sprite.userData = { kind: 'ground-use-object-label', caseId: model.id, role: spec.roles[index] }; model.roleLabels[index] = sprite; group.add(sprite); }
          sprite.visible = current && state.active && !state.quietContext && size.x >= 520 && zone.root.userData.added && (model.id !== 'ngari-river' || index === activeRole); if (!sprite.visible) return;
          const q = project(zone.root.position.clone().add(V(0, model.unit * .25))), width = Math.min(132, spec.roles[index].length * 10 + 18), height = 18, labelX = THREE.MathUtils.clamp(q.x, (size.x > 900 ? 346 : 0) + width / 2 + 10, size.x - width / 2 - 10), labelY = THREE.MathUtils.clamp(q.y + (index === 1 ? -27 : 25), 103, Math.max(103, size.y < 500 ? size.y - 152 : size.y - 238));
          sprite.position.set(labelX / size.x * 2 - 1, 1 - labelY / size.y * 2, q.z).unproject(runtime.camera); const d = -sprite.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z; sprite.scale.set(width * d / focal, height * d / focal, 1); sprite.userData.screenBox = { x: labelX, y: labelY, width, height };
        });
      }
    },
    dispose() { disposeTree(group); selected.clear(); },
  };
}
function learningOrientation(id: CaseId, motion: number) { return id === 'tholing' ? Math.sin(motion * Math.PI) * .6 : 0; }
