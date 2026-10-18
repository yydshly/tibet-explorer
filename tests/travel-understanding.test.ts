import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildTravelUnderstandingScene } from '../src/scene/travelUnderstandingScene';
import { travelCandidateRegions, travelEvidenceSourceIds, travelJourneyState, travelUnderstanding } from '../src/data/travelUnderstanding';
import type { TibetSceneProps } from '../src/scene/TibetScene';
import { sources } from '../src/data/curriculum';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: (text: string) => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() })); sprite.userData.labelText = text; return sprite; }, mineralTexture: () => new THREE.Texture() };
});
function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 250); camera.position.set(17, 13, 23); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
  const model = buildTravelUnderstandingScene({ renderer: { getSize: (value: THREE.Vector2) => value.set(width, height) }, camera });
  const props: TibetSceneProps = { scene: 'travel', step: 0, viewKey: 'T1', progress: 0, season: 1, layer: 'terrain', selected: '', playing: false, cutaway: false, resetKey: 0, routeRegions: [], onSelect: () => {}, onInteract: () => {} };
  return { model, props, camera };
}
function inView(object: THREE.Object3D) { for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false; return true; }
function snapshot(group: THREE.Object3D) {
  const values: unknown[] = [];
  group.traverse(object => {
    if (!inView(object)) return;
    values.push([object.name, ...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array));
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) values.push([material.opacity, (material as THREE.MeshStandardMaterial).color?.getHex()]);
  }); return values;
}
function object(model: ReturnType<typeof buildTravelUnderstandingScene>, name: string) { return model.group.getObjectByName(name)!; }
function shownPieces(model: ReturnType<typeof buildTravelUnderstandingScene>, name: string) { return object(model, name).children.filter(inView).length; }

describe('travel as a continuation of understanding', () => {
  it('keeps one continuous setting while environment aids and the physical building interior unfold', () => {
    const { model, props } = fixture(); model.update(props);
    const ground = object(model, 'travel-terrain-surface') as THREE.Mesh, startTerrain = Array.from(ground.geometry.attributes.position.array), roof = object(model, 'travel-building-roof');
    const closedRoof = roof.position.y;
    expect(inView(object(model, 'travel-environment-transect'))).toBe(false); expect(inView(object(model, 'travel-building-courtyard'))).toBe(false);
    model.update({ ...props, progress: .5 });
    expect(inView(object(model, 'travel-environment-transect'))).toBe(true);
    const posts = object(model, 'travel-environment-transect').children.filter(inView); expect(posts.length).toBeGreaterThan(2); expect(posts.length).toBeLessThan(10);
    expect(roof.position.y).toBe(closedRoof);
    model.update({ ...props, progress: 1 });
    expect(roof.position.y - closedRoof).toBeGreaterThan(1); expect(inView(object(model, 'travel-building-courtyard'))).toBe(true); expect(inView(object(model, 'travel-observation-record'))).toBe(true);
    expect(Array.from(ground.geometry.attributes.position.array)).toEqual(startTerrain);
    expect(object(model, 'travel-generic-building').userData.reconstruction).toBe(false);
    model.dispose();
  });

  it('moves the main vehicle, then a separate feeder vehicle, then a pedestrian instead of jumping sites', () => {
    const { model, props } = fixture(); const main = object(model, 'travel-main-vehicle'), feeder = object(model, 'travel-feeder-vehicle'), walker = object(model, 'travel-arriving-person');
    model.update({ ...props, step: 1, progress: 0 }); const start = main.position.clone();
    expect(shownPieces(model, 'travel-main-road')).toBe(0); expect(inView(feeder)).toBe(false); expect(inView(walker)).toBe(false);
    model.update({ ...props, step: 1, progress: .25 }); expect(main.position.distanceTo(start)).toBeGreaterThan(3); const partial = shownPieces(model, 'travel-main-road'); expect(partial).toBeGreaterThan(0); expect(partial).toBeLessThan(52);
    model.update({ ...props, step: 1, progress: .33 }); const arrivedMain = main.position.clone(), feederStart = feeder.position.clone();
    expect(inView(feeder)).toBe(true); expect(shownPieces(model, 'travel-main-road')).toBe(52);
    model.update({ ...props, step: 1, progress: .64 }); expect(main.position).toEqual(arrivedMain); expect(feeder.position.distanceTo(feederStart)).toBeGreaterThan(1); expect(inView(walker)).toBe(false);
    model.update({ ...props, step: 1, progress: .69 }); const walkerStart = walker.position.clone(); expect(inView(walker)).toBe(true); expect(shownPieces(model, 'travel-final-footway')).toBeLessThan(15);
    model.update({ ...props, step: 1, progress: 1 }); expect(walker.position.distanceTo(walkerStart)).toBeGreaterThan(1); expect(shownPieces(model, 'travel-final-footway')).toBe(15);
    const gate = object(model, 'travel-access-pending-gate'); expect(walker.position.z).toBeGreaterThan(gate.position.z + .2); expect(gate.userData.status).toBe('unverified'); expect(gate.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    model.dispose();
  });

  it('keeps the same terrain and location geometry across observation and the access lesson', () => {
    const { model, props } = fixture(); model.update({ ...props, progress: 1 });
    const nature = snapshot(object(model, 'travel-continuous-relief')), buildingPosition = object(model, 'travel-generic-building').position.clone(), homes = snapshot(object(model, 'travel-local-use'));
    model.update({ ...props, step: 1, progress: 1 }); expect(snapshot(object(model, 'travel-continuous-relief'))).toEqual(nature); expect(snapshot(object(model, 'travel-local-use'))).toEqual(homes); expect(object(model, 'travel-generic-building').position).toEqual(buildingPosition);
    model.dispose();
  });

  it('opens tangible evidence, then an unverified status panel, then an unwritten notebook', () => {
    const { model, props } = fixture(); model.update({ ...props, step: 2, progress: 0 });
    const drawer = object(model, 'travel-source-drawer'); const start = drawer.position.z;
    expect(inView(object(model, 'travel-evidence-desk'))).toBe(true); expect(inView(object(model, 'travel-conditions-desk'))).toBe(false); expect(inView(object(model, 'travel-personal-record-desk'))).toBe(false);
    model.update({ ...props, step: 2, progress: .5 });
    expect(drawer.position.z).toBeGreaterThan(start + .3); expect(inView(object(model, 'travel-date-status-panel'))).toBe(true); expect(inView(object(model, 'travel-personal-record-desk'))).toBe(false);
    const tilted = object(model, 'travel-date-status-panel').rotation.x;
    model.update({ ...props, step: 2, progress: 1 });
    expect(object(model, 'travel-date-status-panel').rotation.x).toBeGreaterThan(tilted); expect(inView(object(model, 'travel-unwritten-notebook'))).toBe(true); expect(object(model, 'travel-notebook-cover').rotation.z).toBeGreaterThan(2.5);
    const notebook = object(model, 'travel-unwritten-notebook'); expect(notebook.userData.saved).toBe(false); expect(notebook.userData.travelCompleted).toBe(false);
    const slots: THREE.Object3D[] = []; model.group.traverse(item => { if (item.name === 'travel-unverified-status-slot') slots.push(item); }); expect(slots).toHaveLength(3); expect(slots.every(slot => slot.userData.verified === false)).toBe(true);
    expect(object(model, 'travel-undated-calendar').userData.date).toBeNull(); model.dispose();
  });

  it('counts actual selected stops without deduplicating two sites in one region or adding example stations', () => {
    const { model, props } = fixture(); model.update({ ...props, step: 1, progress: 1 });
    expect(object(model, 'travel-actual-candidate-tokens').children).toHaveLength(0); expect(model.group.userData.travelState.candidateCount).toBe(0);
    const routeRegions = ['lhasa', 'lhasa', 'nyingchi', 'not-a-region']; model.update({ ...props, step: 1, progress: 1, routeRegions });
    expect(object(model, 'travel-actual-candidate-tokens').children).toHaveLength(3); expect(model.group.userData.travelState.candidates).toEqual(['lhasa', 'lhasa', 'nyingchi']); expect(model.group.userData.travelState.isActualItineraryVerified).toBe(false);
    model.update({ ...props, step: 2, progress: 1, routeRegions: [] }); expect(object(model, 'travel-actual-candidate-tokens').children).toHaveLength(0);
    expect(travelCandidateRegions(routeRegions)).toEqual(['lhasa', 'lhasa', 'nyingchi']); model.dispose();
  });

  it.each([0, 1, 2])('freezes and exactly restores the visible physical process in T%s', step => {
    const { model, props } = fixture(); const input = { ...props, step, progress: .54, routeRegions: ['lhasa', 'lhasa'] };
    model.update(input, 0, 0); const reference = snapshot(model.group);
    model.update({ ...input, playing: true }, 999, 100); expect(snapshot(model.group)).toEqual(reference);
    model.update({ ...input, progress: 1 }, 1000, 100); model.update(input, 2000, 100); expect(snapshot(model.group)).toEqual(reference); model.dispose();
  });

  it('lets the learner change the observation focus without manufacturing a different place', () => {
    const { model, props } = fixture(); model.update({ ...props, progress: 1, layer: 'water' }); const geometry = snapshot(object(model, 'travel-continuous-relief')); expect(model.group.userData.focusId).toBe('travel-water');
    model.update({ ...props, progress: 1, layer: 'settlements' }); expect(model.group.userData.focusId).toBe('travel-settlement'); expect(snapshot(object(model, 'travel-continuous-relief'))).toEqual(geometry);
    model.update({ ...props, progress: 1, selected: 'travel-heritage' }); expect(model.group.userData.focusId).toBe('travel-heritage');
    model.update({ ...props, step: 1, progress: .12, selected: 'travel-lastmile' }); expect(model.group.userData.focusId).toBe('travel-corridor'); model.dispose();
  });

  it('keeps the river facing upward and flowing downhill rather than traversing arbitrary terrain elevations', () => {
    const { model, props } = fixture(); model.update(props);
    const geometry = (object(model, 'travel-water-ribbon') as THREE.Mesh).geometry;
    for (let n = 0; n < geometry.attributes.normal.count; n++) expect(geometry.attributes.normal.getY(n)).toBeGreaterThan(.8);
    for (let n = 2; n < geometry.attributes.position.count; n += 2) expect(geometry.attributes.position.getY(n)).toBeLessThan(geometry.attributes.position.getY(n - 2)); model.dispose();
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('keeps finite geometry and reserves the main controls at %s × %s', (width, height) => {
    const { model, props, camera } = fixture(width, height);
    for (const step of [0, 1, 2]) for (const progress of [0, .5, 1]) {
      model.update({ ...props, step, progress, routeRegions: ['lhasa', 'lhasa'] }); let captions = 0;
      model.group.traverse(item => {
        expect([...item.position.toArray(), ...item.scale.toArray(), ...item.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (item as THREE.Mesh).geometry; if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        if (item instanceof THREE.Sprite && item.visible && item.userData.screenAnnotation) {
          captions++; const point = item.position.clone().project(camera), y = (1 - point.y) * height / 2; expect(y).toBeGreaterThanOrEqual(111.99); expect(y).toBeLessThanOrEqual(height - 250); expect(item.scale.y).toBeGreaterThan(0);
        }
      }); expect(captions).toBeGreaterThan(0); expect(captions).toBeLessThanOrEqual(width < 600 ? 3 : 4);
    } model.dispose();
  });

  it('pairs every stage with its process explanation, material scope and actual candidate feedback', () => {
    const { props, model } = fixture();
    for (const [index, id] of ['T1', 'T2', 'T3'].entries()) {
      const units = [0, .5, 1].map(progress => travelUnderstanding(id, { ...props, progress }, '', ['lhasa', 'lhasa'])!);
      expect(new Set(units.map(unit => unit.title)).size).toBe(3); expect(units.every(unit => unit.hasProgress && unit.provenance.includes('非真实道路'))).toBe(true);
      expect(units[0].stops.map(stop => stop.progress)).toEqual([.12, .5, 1]);
      if (index > 0) expect(units[2].explanation).toContain('2个候选站');
      for (const sourceId of travelEvidenceSourceIds[id as keyof typeof travelEvidenceSourceIds]) expect(sources.some(source => source.id === sourceId)).toBe(true);
      for (const intro of units[0].objects) { let found = false; model.group.traverse(item => { if (item.userData.selectId === intro.id && !item.userData.screenAnnotation) found = true; }); expect(found).toBe(true); }
    }
    const selected = travelUnderstanding('T2', { ...props, progress: 1, selected: 'travel-lastmile' }, 'travel-lastmile')!; expect(selected.title).toBe('步行到达与访问入口'); expect(selected.explanation).toContain('只走到入口外');
    expect(travelUnderstanding('T2', props)!.explanation).toContain('没有已选候选站'); expect(travelUnderstanding('G1', props)).toBeUndefined();
    expect(travelJourneyState(Number.NaN, Number.NaN).stage).toBe(0); model.dispose();
  });

  it('releases replaced labels promptly and shared geometry/materials exactly once at final disposal', () => {
    const { model, props } = fixture(); model.update({ ...props, step: 1, routeRegions: [] });
    let sprite: THREE.Sprite | undefined; model.group.traverse(item => { if (item instanceof THREE.Sprite && item.userData.selectId === 'travel-candidates') sprite = item; });
    const oldMaterial = sprite!.material, oldTexture = oldMaterial.map!, materialDisposal = vi.spyOn(oldMaterial, 'dispose'), textureDisposal = vi.spyOn(oldTexture, 'dispose');
    model.update({ ...props, step: 1, routeRegions: ['lhasa', 'lhasa'] }); expect(materialDisposal).toHaveBeenCalledTimes(1); expect(textureDisposal).toHaveBeenCalledTimes(1);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    model.group.traverse(item => { const mesh = item as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(material); Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }); } });
    const calls = [...geometries, ...materials, ...textures].map(resource => vi.spyOn(resource, 'dispose'));
    model.dispose(); model.dispose(); calls.forEach(call => expect(call).toHaveBeenCalledTimes(1)); expect(model.group.children).toHaveLength(0); model.update(props); expect(model.group.children).toHaveLength(0);
  });
});
