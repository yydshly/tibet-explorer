import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildRailwayEngineeringScene } from '../src/scene/railwayEngineering';
import { buildNarrationAnnotations, type NarrationGuideState } from '../src/scene/narrationAnnotations';
import { railwayEngineeringState, railwayUnderstanding } from '../src/data/railwayUnderstanding';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: (text: string) => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() })); sprite.userData.labelText = text; return sprite; }, mineralTexture: () => new THREE.Texture() };
});
function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 250); camera.position.set(16, 12, 22); camera.lookAt(0, .2, 0); camera.setViewOffset(width, height, 0, height * .13, width, height); camera.updateMatrixWorld();
  const model = buildRailwayEngineeringScene({ renderer: { getSize: (value: THREE.Vector2) => value.set(width, height) }, camera });
  const props: TibetSceneProps = { scene: 'modern', step: 0, viewKey: 'M1', progress: 0, season: 3, layer: 'ground', selected: '', playing: false, cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props, camera };
}
function subject(model: ReturnType<typeof buildRailwayEngineeringScene>, id: string) { let result: THREE.Object3D | undefined; model.group.traverse(item => { if (item.userData.selectId === id && !item.userData.screenAnnotation) result = item; }); if (!result) throw new Error(`Missing ${id}`); return result; }
function inView(item: THREE.Object3D) { for (let parent: THREE.Object3D | null = item; parent; parent = parent.parent) if (!parent.visible) return false; return true; }
function snapshot(root: THREE.Object3D) { const values: unknown[] = []; root.traverse(item => { if (!inView(item)) return; values.push([item.name, ...item.position.toArray(), ...item.scale.toArray(), ...item.quaternion.toArray()]); const mesh = item as THREE.Mesh; if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array)); }); return values; }
function riskParts(model: ReturnType<typeof buildRailwayEngineeringScene>) {
  const sample = model.group.getObjectByName('rail-unmeasured-risk-sample')!;
  const meshes = sample.children.filter(item => item instanceof THREE.Mesh) as THREE.Mesh<THREE.BoxGeometry>[];
  return { sample, ice: meshes.find(item => item.geometry.parameters.width === 1.5)!, top: meshes.find(item => item.geometry.parameters.height === .2)! };
}
function volume(mesh: THREE.Mesh) { const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()); return size.x * size.y * size.z; }
function exchangeDots(model: ReturnType<typeof buildRailwayEngineeringScene>, color: number) {
  const dots: THREE.Mesh[] = []; subject(model, 'rail-air').traverse(item => { if (item instanceof THREE.Mesh && item.material instanceof THREE.MeshBasicMaterial && item.material.color.getHex() === color) dots.push(item); }); return dots;
}
function walker(model: ReturnType<typeof buildRailwayEngineeringScene>) {
  return subject(model, 'rail-lastmile').children.find(item => item instanceof THREE.Group && item.children.some(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry))!;
}

describe('railway natural constraints, engineering conditions and actual access', () => {
  it('shows no cooling markers in the warm-season explanation and changes the risk sample volume and support', () => {
    const { model, props } = fixture(); model.update({ ...props, season: 1, progress: .3 }); model.group.updateMatrixWorld(true);
    const { ice, top } = riskParts(model), before = volume(ice), supported = top.getWorldPosition(new THREE.Vector3()).y;
    const coldDots = exchangeDots(model, 0x97e3e7), heatDots = exchangeDots(model, 0xe9aa6a); expect(coldDots.length).toBeGreaterThan(0);
    model.update({ ...props, season: 1, progress: .65 }); model.group.updateMatrixWorld(true);
    expect(coldDots.every(dot => !inView(dot))).toBe(true); expect(heatDots.some(inView)).toBe(true);
    expect(volume(ice)).toBeLessThan(before * .6); expect(top.getWorldPosition(new THREE.Vector3()).y).toBeLessThan(supported - .1);
    expect(railwayUnderstanding('M1', { ...props, season: 1, progress: .65 })!.explanation).toContain('暖季'); model.dispose();
  });

  it('moves air through visible rock gaps only under the cold-season teaching conditions', () => {
    const { model, props } = fixture(); model.update({ ...props, progress: .35 }); model.group.updateMatrixWorld(true);
    const coldDots = exchangeDots(model, 0x97e3e7), heatDots = exchangeDots(model, 0xe9aa6a), start = coldDots.map(dot => dot.position.clone());
    const { ice, top } = riskParts(model), initialIce = volume(ice), supported = top.position.y;
    expect(coldDots.every(inView)).toBe(true); expect(heatDots.every(dot => !inView(dot))).toBe(true);
    expect(inView(subject(model, 'rail-rock'))).toBe(true);
    model.update({ ...props, progress: .65 }); model.group.updateMatrixWorld(true);
    expect(coldDots.some((dot, n) => dot.position.distanceTo(start[n]) > 1)).toBe(true); expect(volume(ice)).toBeCloseTo(initialIce); expect(top.position.y).toBe(supported);
    expect(railwayUnderstanding('M1', { ...props, progress: .65 })!.explanation).toContain('冷季'); model.dispose();
  });

  it('retains a readable exposed ice risk sample from the default viewing position', () => {
    const { model, props, camera } = fixture(); model.update({ ...props, season: 1, progress: .6 }); model.group.updateMatrixWorld(true);
    const { ice } = riskParts(model), bounds = new THREE.Box3().setFromObject(ice), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3()), raycaster = new THREE.Raycaster();
    const targets = [center.clone(), ...[-.48, .48].flatMap(x => [-.48, .48].map(z => center.clone().add(new THREE.Vector3(size.x * x, 0, size.z * z))))];
    const solid: THREE.Mesh[] = []; model.group.traverse(item => { if (item instanceof THREE.Mesh && inView(item)) solid.push(item); });
    const firstHits = targets.map(target => { const direction = target.clone().sub(camera.position); raycaster.set(camera.position, direction.normalize()); return raycaster.intersectObjects(solid, false)[0]; });
    const visiblePoints = firstHits.filter(hit => hit?.object === ice);
    expect(visiblePoints.length, `Volume changes must be visible. First-hit materials: ${firstHits.map(hit => hit ? ((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial).color?.getHexString() : 'none').join(', ')}`).toBeGreaterThan(0); model.dispose();
  });

  it('only brings the train, station and last segment into the final operating stage, then actually moves users', () => {
    const { model, props } = fixture(); const train = model.group.getObjectByName('rail-teaching-vehicle')!, station = subject(model, 'rail-operation'), access = subject(model, 'rail-lastmile'), pedestrian = walker(model);
    model.update({ ...props, progress: .12 }); expect(inView(train)).toBe(false); expect(inView(station)).toBe(false); expect(inView(access)).toBe(false);
    model.update({ ...props, progress: .52 }); expect(inView(subject(model, 'rail-air'))).toBe(true); expect(inView(train)).toBe(false);
    model.update({ ...props, progress: .68 }); const startTrain = train.position.clone(), startWalker = pedestrian.position.clone(); expect(inView(train)).toBe(true); expect(inView(station)).toBe(true); expect(inView(access)).toBe(true); expect(inView(subject(model, 'rail-air'))).toBe(false);
    model.update({ ...props, progress: 1 }); expect(train.position.distanceTo(startTrain)).toBeGreaterThan(8); expect(pedestrian.position.distanceTo(startWalker)).toBeGreaterThan(3); expect(model.group.userData.railwayState.operation).toBeCloseTo(1);
    model.dispose();
  });

  it('keeps each arriving pedestrian over the currently visible physical access segment', () => {
    const { model, props } = fixture(); const access = subject(model, 'rail-lastmile'), path = access.children.find(item => item instanceof THREE.Mesh)! as THREE.Mesh, pedestrian = walker(model);
    for (const progress of [.70, .76, .86, 1]) {
      model.update({ ...props, progress }); model.group.updateMatrixWorld(true);
      const foot = path.worldToLocal(pedestrian.getWorldPosition(new THREE.Vector3())), bounds = path.geometry.boundingBox ?? (path.geometry.computeBoundingBox(), path.geometry.boundingBox)!;
      expect(foot.x).toBeGreaterThanOrEqual(bounds.min.x - .18); expect(foot.x).toBeLessThanOrEqual(bounds.max.x + .18);
      expect(foot.z, `Access path must grow from the departure end, before the walker at progress ${progress}`).toBeGreaterThanOrEqual(bounds.min.z - .18); expect(foot.z).toBeLessThanOrEqual(bounds.max.z + .18);
    } model.dispose();
  });

  it('finishes the train arrival before the pedestrian starts the last segment', () => {
    const { model, props } = fixture(); const train = model.group.getObjectByName('rail-teaching-vehicle')!, pedestrian = walker(model);
    model.update({ ...props, progress: .68 }); const walkStart = pedestrian.position.clone(), trainStart = train.position.clone();
    model.update({ ...props, progress: .82 }); expect(pedestrian.position).toEqual(walkStart); expect(train.position.distanceTo(trainStart)).toBeGreaterThan(5);
    model.update({ ...props, progress: .90 }); const trainArrived = train.position.clone(); expect(pedestrian.position.distanceTo(walkStart)).toBeGreaterThan(.2);
    model.update({ ...props, progress: 1 }); expect(train.position).toEqual(trainArrived); expect(pedestrian.position.distanceTo(walkStart)).toBeGreaterThan(3); model.dispose();
  });

  it.each([1, 3])('freezes seasonal process %s with fixed progress and restores the same physical state after rewind', season => {
    const { model, props } = fixture(); const input = { ...props, season, progress: .54 }; model.update(input); const before = snapshot(model.group);
    model.update({ ...input, playing: true }); expect(snapshot(model.group)).toEqual(before);
    model.update({ ...input, progress: 1 }); model.update(input); expect(snapshot(model.group)).toEqual(before);
    model.update({ ...input, season: season === 1 ? 3 : 1 }); model.update(input); expect(snapshot(model.group)).toEqual(before); model.dispose();
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('keeps finite labels and geometry on %s × %s', (width, height) => {
    const { model, props, camera } = fixture(width, height);
    for (const progress of [.12, .52, 1]) for (const season of [1, 3]) {
      model.update({ ...props, progress, season }); let count = 0;
      model.group.traverse(item => {
        expect([...item.position.toArray(), ...item.scale.toArray(), ...item.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (item as THREE.Mesh).geometry; if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        if (item instanceof THREE.Sprite && item.visible) { expect(item.scale.y).toBeGreaterThan(0); if (item.userData.screenAnnotation) { count++; const y = (1 - item.position.clone().project(camera).y) * height / 2; expect(y).toBeGreaterThanOrEqual(111.99); expect(y).toBeLessThanOrEqual(height - 249); } }
      }); expect(count).toBeGreaterThan(0);
    } model.dispose();
  });

  it.each([[627, 620], [390, 540]])('does not cover process captions with the model scope note on %s × %s', (width, height) => {
    const { model, props, camera } = fixture(width, height); model.update({ ...props, progress: 1 });
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const boxes: { text: string; x: number; y: number; width: number; height: number }[] = [];
    model.group.traverse(item => {
      if (!(item instanceof THREE.Sprite) || !item.visible) return;
      const center = item.position.clone().project(camera), edgeX = item.position.clone().addScaledVector(right, item.scale.x / 2).project(camera), edgeY = item.position.clone().addScaledVector(up, item.scale.y / 2).project(camera);
      boxes.push({ text: item.userData.labelText ?? '', x: (center.x + 1) * width / 2, y: (1 - center.y) * height / 2, width: Math.abs(edgeX.x - center.x) * width, height: Math.abs(edgeY.y - center.y) * height });
    });
    for (let n = 0; n < boxes.length; n++) for (let m = n + 1; m < boxes.length; m++) {
      const a = boxes[n], b = boxes[m], overlapX = (a.width + b.width) / 2 - Math.abs(a.x - b.x), overlapY = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
      expect(overlapX > 1 && overlapY > 1, `Overlapping labels: ${a.text} / ${b.text}`).toBe(false);
    } model.dispose();
  });

  it('matches process text and selectable material explanations without making a numerical forecast', () => {
    const { model, props } = fixture();
    for (const season of [1, 3]) for (const progress of [.12, .52, 1]) {
      const unit = railwayUnderstanding('M1', { ...props, season, progress })!; model.update({ ...props, season, progress });
      expect(unit.hasProgress).toBe(true); expect(unit.provenance).toContain('非实测'); expect(unit.stops.map(stop => stop.progress)).toEqual([.12, .52, 1]);
      for (const item of unit.objects) expect(subject(model, item.id).userData.guideAnchor).toBeInstanceOf(THREE.Vector3);
    }
    expect(railwayUnderstanding('M1', { ...props, selected: 'rail-ice' }, 'rail-ice')!.explanation).toContain('不是青藏铁路某处的实测沉降或预测'); expect(railwayUnderstanding('T1', props)).toBeUndefined();
    expect(railwayEngineeringState(Number.NaN, 3)).toMatchObject({ progress: 0, stage: 0, cold: true }); model.dispose();
  });

  it('anchors the same rail-ice guide to exposed ground ice first, then the visible heat-disturbance sample', () => {
    const { model, props, camera } = fixture(), renderer = { getSize: (value: THREE.Vector2) => value.set(1280, 720) };
    const annotations = buildNarrationAnnotations(model.group, camera, renderer);
    const guide: NarrationGuideState = { cueId: 'M1-explain', progress: .5, active: true, beatId: 'ice-support', targets: ['rail-ice'], drawProgress: 1, relation: 'focus', title: '热扰动样块', explanation: '核对可见含冰对象。' };
    const matches: THREE.Object3D[] = []; model.group.traverse(item => { if (item.userData.selectId === 'rail-ice' && !item.userData.screenAnnotation) matches.push(item); });
    const risk = model.group.getObjectByName('rail-unmeasured-risk-sample')!, frozen = matches.find(item => item !== risk)!;
    const pinpoint = () => {
      const dot = annotations.group.children[4] as unknown as { visible: boolean; geometry: THREE.BufferGeometry }; expect(dot.visible).toBe(true);
      const starts = dot.geometry.attributes.instanceStart, center = new THREE.Vector3();
      for (let n = 0; n < starts.count; n++) center.add(new THREE.Vector3().fromBufferAttribute(starts, n)); return center.divideScalar(starts.count);
    };
    model.update({ ...props, progress: .12 }); annotations.update({ ...props, progress: .12, guide });
    expect(inView(risk)).toBe(false); expect(inView(frozen)).toBe(true);
    const early = pinpoint(); expect(early.distanceTo(frozen.localToWorld((frozen.userData.guideAnchor as THREE.Vector3).clone()))).toBeLessThan(.01);
    model.update({ ...props, progress: .52 }); annotations.update({ ...props, progress: .52, guide });
    expect(inView(risk)).toBe(true); const sample = pinpoint(); expect(sample.distanceTo(risk.localToWorld((risk.userData.guideAnchor as THREE.Vector3).clone()))).toBeLessThan(.01); expect(sample.distanceTo(early)).toBeGreaterThan(3);
    model.update({ ...props, progress: .12 }); annotations.update({ ...props, progress: .12, guide }); expect(pinpoint().distanceTo(early)).toBeLessThan(.01);
    annotations.dispose(); model.dispose();
  });

  it('disposes shared textures/materials and every geometry exactly once, and ignores updates afterwards', () => {
    const { model, props } = fixture(); model.update({ ...props, progress: 1 });
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    model.group.traverse(item => { const mesh = item as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(material); Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }); } });
    const calls = [...geometries, ...materials, ...textures].map(resource => vi.spyOn(resource, 'dispose')); model.dispose(); model.dispose(); calls.forEach(call => expect(call).toHaveBeenCalledTimes(1)); expect(model.group.children).toHaveLength(0); model.update(props); expect(model.group.children).toHaveLength(0);
  });
});
