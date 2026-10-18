import * as THREE from 'three';
import { cityContinuityLessons, type CityContinuityLessonStage } from '../data/cityContinuityLessons';
import { cityContinuityReferences } from '../data/cityContinuity';
import { cityAccessCityRange } from '../lib/cityAccessState';
import { cityContinuityPartState, cityContinuityPartStarts } from '../lib/cityContinuityState';
import { buildCityAccessChange, CITY_ACCESS_IDS, cityAccessCaptionBox, type CityAccessSettings } from './cityAccessChange';
import { GOLD, TEAL, label, line, disposeTree } from './environment';
import type { AtlasLabelBox } from '../lib/atlasLabelLayout';

type City = typeof CITY_ACCESS_IDS[number];
type Runtime = { camera: THREE.PerspectiveCamera; at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3; metres: (longitude: number, latitude: number) => number | undefined };
type Settings = Pick<CityAccessSettings, 'layer' | 'step' | 'progress' | 'cityLifeServices'>;
const names: Record<City, string> = { nyingchi: '林芝', lhasa: '拉萨', ngari: '阿里' };
const natureObservation: Record<City, string> = { nyingchi: '鲁朗河·G318·周边地物', lhasa: '拉萨河谷·河流与道路', ngari: '狮泉河·河流与两岸地物' };
const colors: Record<City, number> = { nyingchi: TEAL, lhasa: GOLD, ngari: 0xb8c5e5 };
const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));
const stageFor = (step: number): CityContinuityLessonStage => step === 3 ? 'history' : step === 5 ? 'connections' : 'travel';

/** Exact recorded part boundaries are shared with narration and controls. */
export function cityContinuityJourneyState(settings: Settings, city: City) {
  const current = cityContinuityPartState(settings.progress), range = cityAccessCityRange(city), local = phase(settings.progress, range.start, range.end);
  const index = cityContinuityPartStarts.reduce<number>((latest, start, i) => local + 1e-9 >= start ? i : latest, 0), from = cityContinuityPartStarts[index], to = cityContinuityPartStarts[index + 1] ?? 1;
  return { city, stage: stageFor(settings.step), index, local, partProgress: phase(local, from, to), active: current.cityId === city, started: settings.progress >= range.start, services: settings.cityLifeServices !== false };
}
export function cityContinuityAccessProgress(progress: number, stage: 'connections' | 'travel') {
  const source = cityContinuityPartState(progress), range = cityAccessCityRange(source.cityId);
  const local = stage === 'travel' ? .999 : source.local < .34 ? .25 + .27 * phase(source.local, 0, .34) : source.local < .68 ? .52 + .24 * phase(source.local, .34, .68) : .76 + .24 * phase(source.local, .68, 1);
  return range.start + (range.end - range.start) * local;
}

type Caption = { sprite: THREE.Sprite; leader: THREE.Line; text: string };
/** Historical and travel understanding now happens in the same terrain-bound
 * functional spaces. Sources are small annotations; no large cards/notebooks. */
export function buildCityContinuityJourney(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'cultural-spatial-use-to-connections'; group.userData.kind = 'city-continuity-meaningful-journey'; group.visible = false;
  const access = buildCityAccessChange(runtime); group.add(access.group); const size = new THREE.Vector2(), captions = new Map<City, Caption>();
  const frames = CITY_ACCESS_IDS.map(city => { const root = new THREE.Group(); root.userData = { kind: 'journey-regional-frame', city }; group.add(root); return { city, root }; });
  const ngariReferences = ['ngari', 'tholing'].map(id => {
    const root = new THREE.Group(), point = new THREE.Mesh(new THREE.OctahedronGeometry(.08), new THREE.MeshBasicMaterial({ color: id === 'ngari' ? GOLD : TEAL, depthTest: false })), sprite = label(id === 'ngari' ? '狮泉河·生活入口' : '托林·札达交流'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 47; point.renderOrder = 36;
    root.add(point, sprite); root.userData = { kind: 'journey-distinct-ngari-locality', referenceId: id, scope: '已归档聚居地点；不定位机场、寺院或跨县路线' }; group.add(root); return { id, root, point, sprite };
  });
  const project = (point: THREE.Vector3) => { const p = point.clone().project(runtime.camera); return { x: (p.x + 1) * size.x / 2, y: (1 - p.y) * size.y / 2, z: p.z }; };
  const writeLine = (object: THREE.Line, a: THREE.Vector3, b: THREE.Vector3) => { const attr = object.geometry.attributes.position as THREE.BufferAttribute; attr.setXYZ(0, a.x, a.y, a.z); attr.setXYZ(1, b.x, b.y, b.z); attr.needsUpdate = true; object.geometry.computeBoundingSphere(); };
  function caption(city: City, text: string, anchor: THREE.Vector3, active: boolean) {
    let item = captions.get(city);
    if (!item || item.text !== text) { if (item) { group.remove(item.sprite, item.leader); item.sprite.material.map?.dispose(); item.sprite.material.dispose(); item.leader.geometry.dispose(); (item.leader.material as THREE.Material).dispose(); } const sprite = label(text, active ? '#f3e4b7' : '#d3ddd3'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 48; sprite.userData = { kind: 'journey-synchronized-regional-caption', city, text }; const leader = line([anchor, anchor], colors[city], .45); (leader.material as THREE.Material).depthTest = false; group.add(sprite, leader); item = { sprite, leader, text }; captions.set(city, item); }
    const compact = size.x <= 900, p = project(anchor), width = Math.min(compact ? 248 : 282, text.length * (compact ? 10 : 11) + 20), box = compact ? cityAccessCaptionBox(city, size.x, size.y, width) : { x: THREE.MathUtils.clamp(p.x, 346 + width / 2 + 12, size.x - width / 2 - 15), y: THREE.MathUtils.clamp(p.y + (active ? 62 : 35), 115, Math.max(115, size.y - 220)), width, height: 24 };
    item.sprite.position.set(box.x / size.x * 2 - 1, 1 - box.y / size.y * 2, .5).unproject(runtime.camera); const depth = -item.sprite.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z, focal = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))); item.sprite.scale.set(box.width * depth / focal, box.height * depth / focal, 1); item.sprite.userData.screenBox = box; item.leader.userData = { kind: 'journey-real-reference-leader', city, anchor: anchor.clone() }; writeLine(item.leader, anchor, item.sprite.position);
  }
  return {
    group,
    occupied(settings: Settings, viewport: THREE.Vector2): AtlasLabelBox[] { if (settings.layer !== 'atlas-city-comparison' || ![3, 5, 6].includes(settings.step)) return []; return CITY_ACCESS_IDS.map(city => cityAccessCaptionBox(city, viewport.x, viewport.y, Math.min(248, viewport.x - 24))); },
    update(settings: Settings, viewport: THREE.Vector2) {
      group.visible = settings.layer === 'atlas-city-comparison' && [3, 5, 6].includes(settings.step); if (!group.visible) return; size.copy(viewport); const stage = stageFor(settings.step), mobile = size.x < 520;
      access.update({ layer: settings.layer, step: 4, progress: stage === 'history' ? settings.progress : cityContinuityAccessProgress(settings.progress, stage), cityLifeServices: stage === 'history' ? settings.cityLifeServices : true, cityAccessTransfer: stage === 'travel' || settings.cityLifeServices !== false, cityAccessContext: true, cityGroundStory: stage, cityGroundProgress: settings.progress, cityGroundServices: settings.cityLifeServices !== false, cityAccessGroundOnly: stage === 'history' || stage === 'travel' && cityContinuityPartState(settings.progress).index < 2 }, size);
      for (const frame of frames) {
        const state = cityContinuityJourneyState(settings, frame.city), part = cityContinuityLessons[stage][frame.city][state.index], reference = cityContinuityReferences[part.referenceId], anchor = runtime.at(reference.lon, reference.lat, .15);
        frame.root.position.copy(anchor); frame.root.userData = { ...frame.root.userData, state, referenceId: reference.id, lessonId: part.id, sourceIds: part.sourceIds, partTitle: part.title, terrainAnchor: anchor.clone() };
        const text = stage === 'history' ? `${part.year ?? ''}·${part.title.replace(/^.*?：/, '')}` : stage === 'connections' ? ['区域抵达', '地方接续', '进入具体用途'][state.index] : [natureObservation[frame.city], '对照文化历史用途', '检查接续与访问'][state.index];
        caption(frame.city, `${names[frame.city]}·${text}`, anchor, state.active);
      }
      for (const item of ngariReferences) {
        item.root.visible = cityContinuityPartState(settings.progress).cityId === 'ngari'; if (!item.root.visible) continue;
        const ref = cityContinuityReferences[item.id], anchor = runtime.at(ref.lon, ref.lat, .16); item.root.position.copy(anchor); item.root.userData.terrainAnchor = anchor.clone();
        item.sprite.visible = item.id === 'tholing';
        const focal = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), depth = -anchor.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z, unit = depth / Math.max(1, focal); item.point.scale.setScalar(unit * 4 / .08);
        const p = project(anchor), width = mobile ? 86 : 112, height = mobile ? 17 : 19, x = THREE.MathUtils.clamp(p.x - (item.id === 'tholing' ? 65 : 0), (size.x > 900 ? 346 : 0) + width / 2 + 12, size.x - width / 2 - 12), y = 110;
        const world = V(x / size.x * 2 - 1, 1 - y / size.y * 2, p.z).unproject(runtime.camera); item.sprite.position.copy(world.sub(anchor)); item.sprite.scale.set(width * unit, height * unit, 1);
      }
    },
    dispose() { access.dispose(); disposeTree(group); captions.clear(); },
  };
}
