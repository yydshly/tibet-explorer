import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildLivingLandscapeScene } from '../src/scene/livingLandscape';
import { livingLandscapeState, livingUnderstanding, livingSourceIds, type LivingScenarioSettings } from '../src/data/livingUnderstanding';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 250);
  camera.position.set(17, 13, 22); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
  const model = buildLivingLandscapeScene({ renderer: { getSize: (value: THREE.Vector2) => value.set(width, height) }, camera });
  const props: TibetSceneProps & Pick<LivingScenarioSettings, 'livingSetting' | 'communitySupport'> = { scene: 'region', step: 2, viewKey: 'E3', season: 1, layer: 'settlements', progress: .12, playing: false, selected: 'shannan', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {}, livingSetting: 'valley', communitySupport: 'individual' };
  return { model, props };
}

function inView(object: THREE.Object3D) {
  for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false;
  return true;
}
function geometrySnapshot(root: THREE.Object3D) {
  const values: unknown[] = [];
  root.traverse(object => {
    if (!inView(object)) return;
    const mesh = object as THREE.Mesh;
    values.push([object.visible, ...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) values.push(Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)])), mesh.geometry.drawRange);
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) values.push([material.opacity, (material as THREE.MeshBasicMaterial).color?.getHex()]);
  });
  return values;
}

describe('landscape to living conditions', () => {
  it.each(['individual','shared'] as const)('actually fills, carries and pours water under %s organization without creating water at the destination',support=>{
    const {model,props}=fixture(),water=model.group.getObjectByName('living-carried-water-0')!;
    const update=(progress:number)=>model.update({...props,progress,communitySupport:support});
    update(.28);expect(water.visible).toBe(false);
    const source=model.group.getObjectByName('living-water-user-0')!.position.clone();
    update(.4);expect(water.visible).toBe(true);
    expect(model.group.getObjectByName('living-water-user-0')!.position).toEqual(source);
    let levels:THREE.Object3D[]=[];model.group.traverse(o=>{if(o.name==='living-stored-water-level')levels.push(o);});
    expect(levels.every(o=>!o.visible)).toBe(true);
    update(.6);expect(model.group.getObjectByName('living-water-user-0')!.position.distanceTo(source)).toBeGreaterThan(.5);
    update(.84);expect(water.visible).toBe(true);expect(levels.every(o=>o.visible)).toBe(true);
    const state=livingLandscapeState({...props,progress:.84,communitySupport:support});expect(state.carriedWater+state.storedWater).toBeCloseTo(1);
    model.group.traverse(o=>{if(o.name==='living-pouring-water'&&o.visible){const p=(o as THREE.Line).geometry.attributes.position;expect(p.getY(0)).toBeGreaterThan(p.getY(1));}});
    update(1);expect(water.visible).toBe(false);expect(levels.every(o=>o.visible)).toBe(true);
    update(.28);expect(water.visible).toBe(false);expect(levels.every(o=>!o.visible)).toBe(true);model.dispose();
  });
  it('first shows natural conditions, then actual use paths, and finally the organized living space', () => {
    const { model, props } = fixture();
    const terrain = model.group.getObjectByName('living-natural-relief')!, water = model.group.getObjectByName('living-natural-water')!;
    const access = model.group.getObjectByName('living-using-paths')!, houses = model.group.getObjectByName('living-households')!;
    const actor = model.group.getObjectByName('living-water-user-0')!;
    model.update(props);
    expect(inView(terrain)).toBe(true); expect(inView(water)).toBe(true); expect(inView(access)).toBe(false); expect(inView(houses)).toBe(false);
    model.update({ ...props, progress: .5 }); const intermediate = actor.position.clone();
    expect(inView(access)).toBe(true); expect(inView(actor)).toBe(true); expect(inView(houses)).toBe(true);
    const privatePath = access.children[0].children[0] as THREE.Mesh;
    expect(privatePath.geometry.drawRange.count).toBeGreaterThan(0); expect(privatePath.geometry.drawRange.count).toBeLessThan(privatePath.geometry.index!.count);
    model.update({ ...props, progress: 1 });
    expect(inView(houses)).toBe(true); expect(actor.position.distanceTo(intermediate)).toBeGreaterThan(.5); expect(privatePath.geometry.drawRange.count).toBe(privatePath.geometry.index!.count);
    expect(inView(model.group.getObjectByName('living-working-plots')!)).toBe(true); expect(inView(model.group.getObjectByName('living-livestock-route')!)).toBe(true);
    model.dispose();
  });

  it('holds natural relief, water and usable land exactly fixed when organization changes', () => {
    const { model, props } = fixture();
    model.update({ ...props, progress: 1 });
    const names = ['living-natural-relief', 'living-natural-water', 'living-usable-ground'];
    const nature = names.map(name => geometrySnapshot(model.group.getObjectByName(name)!));
    const homes = [0, 1].map(n => model.group.getObjectByName(`living-home-${n}`)!.position.clone());
    const firstUser = model.group.getObjectByName('living-water-user-0')!.position.clone();
    model.update({ ...props, progress: 1, communitySupport: 'shared' });
    expect(names.map(name => geometrySnapshot(model.group.getObjectByName(name)!))).toEqual(nature);
    expect([0, 1].map(n => model.group.getObjectByName(`living-home-${n}`)!.position)).toEqual(homes);
    expect(inView(model.group.getObjectByName('living-common-water-point')!)).toBe(true);
    expect(inView(model.group.getObjectByName('living-common-space')!)).toBe(true);
    expect(inView(model.group.getObjectByName('living-separate-storage')!)).toBe(true);
    expect(model.group.getObjectByName('living-water-user-0')!.position.distanceTo(firstUser)).toBeCloseTo(0);
    // The same destination is reached by a different route/intake, not moved with organization.
    model.update({...props,progress:.5,communitySupport:'shared'});const sharedMid=model.group.getObjectByName('living-water-user-0')!.position.clone();
    model.update({...props,progress:.5,communitySupport:'individual'});expect(sharedMid.distanceTo(model.group.getObjectByName('living-water-user-0')!.position)).toBeGreaterThan(.2);
    model.update({...props,progress:1,communitySupport:'shared'});
    let boards = 0; model.group.traverse(object => { if (object.name === 'living-common-walkway-board' && inView(object)) boards++; }); expect(boards).toBeGreaterThan(20);
    model.dispose();
  });

  it('changes only author-defined environmental conditions and restores them on return', () => {
    const { model, props } = fixture();
    model.update({ ...props, progress: 1 });
    const terrain = model.group.getObjectByName('living-natural-relief')!, water = model.group.getObjectByName('living-natural-water')!;
    const originalTerrain = geometrySnapshot(terrain), originalWater = geometrySnapshot(water);
    model.update({ ...props, progress: 1, livingSetting: 'upland' });
    expect(geometrySnapshot(terrain)).not.toEqual(originalTerrain); expect(geometrySnapshot(water)).not.toEqual(originalWater);
    expect(model.group.userData.livingState.support).toBe('individual');
    model.update({ ...props, progress: 1, livingSetting: 'valley' });
    expect(geometrySnapshot(terrain)).toEqual(originalTerrain); expect(geometrySnapshot(water)).toEqual(originalWater);
    model.dispose();
  });

  it('keeps the source water surface facing upwards and progressing downhill in both settings', () => {
    const { model, props } = fixture();
    for (const livingSetting of ['valley', 'upland'] as const) {
      model.update({ ...props, livingSetting });
      const geometry = (model.group.getObjectByName('living-water-ribbon')! as THREE.Mesh).geometry;
      const normal = geometry.attributes.normal, positions = geometry.attributes.position;
      for (let n = 0; n < normal.count; n++) expect(normal.getY(n)).toBeGreaterThan(.8);
      for (let n = 2; n < positions.count; n += 2) expect(positions.getY(n)).toBeLessThan(positions.getY(n - 2));
    }
    model.dispose();
  });

  it('opens a separate evidence question for memory without fabricating a historical village', () => {
    const { model, props } = fixture(); const memory = model.group.getObjectByName('living-evidence-question')!;
    model.update({ ...props, progress: 1 }); expect(inView(memory)).toBe(false);
    model.update({ ...props, viewKey: 'P3', progress: .5 }); expect(inView(memory)).toBe(false);
    model.update({ ...props, viewKey: 'P3', progress: 1 }); expect(inView(memory)).toBe(true);
    const explanation = livingUnderstanding('P3', { ...props, progress: 1 })!;
    expect(explanation.explanation).toContain('具体人的实践与材料'); expect(explanation.provenance).toContain('非真实村落');
    model.dispose();
  });

  it.each(['individual', 'shared'] as const)('freezes use and restores it exactly for %s organization', communitySupport => {
    const { model, props } = fixture();
    model.update({ ...props, communitySupport, progress: .52 }, 0, 0); const reference = geometrySnapshot(model.group);
    model.update({ ...props, communitySupport, progress: .52, playing: true }, 999, 200); expect(geometrySnapshot(model.group)).toEqual(reference);
    model.update({ ...props, communitySupport, progress: 1 }, 999, 200);
    model.update({ ...props, communitySupport, progress: .52 }, 999, 200); expect(geometrySnapshot(model.group)).toEqual(reference);
    model.dispose();
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('keeps all transforms finite and captions readable on %s × %s', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const livingSetting of ['valley', 'upland'] as const) for (const progress of [.12, .5, 1]) {
      model.update({ ...props, livingSetting, progress, viewKey: 'P3', communitySupport: 'shared' });
      let labels = 0;
      model.group.traverse(object => {
        expect([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (object as THREE.Mesh).geometry;
        if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        if (object instanceof THREE.Sprite && object.visible) { labels++; expect(object.scale.y).toBeGreaterThan(0); }
      });
      expect(labels).toBeGreaterThan(1); expect(labels).toBeLessThanOrEqual(width < 600 ? 4 : 5);
    }
    model.dispose();
  });

  it('keeps shared materials alive across condition rebuilds and releases final resources once', () => {
    const { model, props } = fixture(); model.update(props);
    const terrain = model.group.getObjectByName('living-terrain-surface')! as THREE.Mesh;
    const materials = new Set<THREE.Material>(); model.group.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material); });
    let materialDisposals = 0; materials.forEach(material => material.addEventListener('dispose', () => materialDisposals++));
    model.update({ ...props, livingSetting: 'upland' }); model.update({ ...props, livingSetting: 'valley' });
    expect(materialDisposals).toBe(0);
    const geometryDisposed = vi.fn(); terrain.geometry.addEventListener('dispose', geometryDisposed);
    model.dispose(); model.dispose();
    expect(materialDisposals).toBe(materials.size); expect(geometryDisposed).toHaveBeenCalledOnce(); expect(model.group.children).toHaveLength(0);
  });
});

describe('living explanations keep conditions distinct from culture and evidence', () => {
  it('exposes meaningful operations and an independently readable bridge into culture', () => {
    expect(livingSourceIds.E3).toContain('society'); expect(livingSourceIds.P3).toContain('unesco');
    const settings: LivingScenarioSettings = { season: 1, layer: 'settlements', progress: 1, selected: '', cutaway: false, livingSetting: 'upland', communitySupport: 'shared' };
    const unit = livingUnderstanding('P3', settings)!;
    expect(unit.hasProgress).toBe(true); expect(unit.stops).toHaveLength(3); expect(unit.objects.some(object => object.id === 'living-memory')).toBe(true);
    expect(unit.explanation).toContain('地形与水源没有改变'); expect(unit.explanation).toContain('不给组织方式算分');
    const natural = livingUnderstanding('E3', { ...settings, progress: .12 })!;
    expect(natural.explanation).toContain('不表示高地一定缺水');
    expect(livingUnderstanding('C3', settings)).toBeUndefined(); expect(livingLandscapeState({ ...settings, progress: Number.NaN }).stage).toBe(0);
  });

  it('selects the visible object explanation while retaining comparison and source limits', () => {
    const settings: LivingScenarioSettings = { season: 1, layer: 'settlements', progress: 1, selected: 'living-houses', cutaway: false };
    const unit = livingUnderstanding('E3', settings, 'living-houses')!;
    expect(unit.title).toContain('生活空间'); expect(unit.explanation).toContain('不复原'); expect(unit.explanation).toContain('真实调查'); expect(unit.stops[2].progress).toBe(1);
  });
});
