import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildHistoryInquiryScene } from '../src/scene/historyInquiry';
import { historyUnderstanding } from '../src/data/historyUnderstanding';
import { historyPeriods } from '../src/data/curriculum';
import { disposeTree } from '../src/scene/environment';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: (text: string) => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.labelText = text; return sprite; }, mineralTexture: () => new THREE.Texture() };
});

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180); camera.position.set(16, 12, 20); camera.lookAt(0, 1.2, 0); camera.updateMatrixWorld();
  const model = buildHistoryInquiryScene({ renderer: { getSize: (v: THREE.Vector2) => v.set(width, height) }, camera });
  const props: TibetSceneProps = { scene: 'history', step: 0, viewKey: 'H1', season: 1, layer: 'activity', progress: 0, playing: false, selected: 'prehistoric', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  const scene = (index: number) => model.group.getObjectByName(`history-inquiry-${index}`)!;
  const object = (index: number, id: string) => { let found: THREE.Object3D | undefined; scene(index).traverse(child => { if (!found && child.userData.selectId === id && !(child instanceof THREE.Sprite)) found = child; }); return found!; };
  return { model, props, scene, object };
}
function visible(object: THREE.Object3D) { for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false; return true; }
function snapshot(root: THREE.Object3D) {
  const values: unknown[] = [];
  root.traverse(object => {
    if (!visible(object)) return;
    const mesh = object as THREE.Mesh;
    values.push([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array));
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) values.push([material.opacity, (material as THREE.MeshBasicMaterial).color?.getHex()]);
  }); return values;
}

describe('historical inquiry through physical material relationships', () => {
  it('opens the H1 layered context before exposing the object and inference materials', () => {
    const { model, props, object } = fixture(); const cover = model.group.getObjectByName('history-context-cover')!, tool = object(0, 'history-tool');
    model.update(props); const coverStart = cover.position.clone(), toolStart = tool.position.clone();
    expect(visible(object(0, 'history-dating'))).toBe(false); expect(visible(object(0, 'history-inference'))).toBe(false);
    model.update({ ...props, progress: .5 });
    expect(cover.position.y).toBeGreaterThan(coverStart.y); expect(cover.position.x).toBeLessThan(coverStart.x); expect(tool.position.y).toBeGreaterThan(toolStart.y);
    expect(visible(object(0, 'history-dating'))).toBe(true); expect(visible(object(0, 'history-inference'))).toBe(false);
    model.update({ ...props, progress: 1 }); expect(visible(object(0, 'history-inference'))).toBe(true);
    const source = historyUnderstanding('H1', { season: 1, layer: 'activity', progress: 1, selected: '', cutaway: false })!;
    expect(source.explanation).toContain('活动'); expect(source.explanation).toContain('全年定居'); expect(source.provenance).toContain('无伪造');
    disposeTree(model.group);
  });

  it('makes different H1 inference questions visibly distinct rather than only changing metadata', () => {
    const { model, props, object } = fixture(); const inference = object(0, 'history-inference');
    model.update({ ...props, progress: 1, layer: 'activity' }); const activity = snapshot(inference);
    model.update({ ...props, progress: 1, layer: 'settlement' }); const settlement = snapshot(inference);
    model.update({ ...props, progress: 1, layer: 'identity' }); const identity = snapshot(inference);
    expect(settlement).not.toEqual(activity); expect(identity).not.toEqual(settlement);
    const unit = historyUnderstanding('H1', { season: 1, layer: 'identity', progress: 1, selected: '', cutaway: false })!;
    expect(unit.explanation).toContain('活动材料本身不足'); expect(unit.explanation).toContain('现代族群');
    disposeTree(model.group);
  });

  it('keeps the exposed-tool caption leader attached to the current object position', () => {
    const { model, props, scene, object } = fixture(); model.update({ ...props, progress: 1 });
    const center = object(0, 'history-tool').getWorldPosition(new THREE.Vector3());
    const starts: THREE.Vector3[] = [];
    scene(0).traverse(child => { if (child instanceof THREE.Line && visible(child)) starts.push(new THREE.Vector3().fromBufferAttribute(child.geometry.attributes.position, 0)); });
    expect(starts.some(start => start.distanceTo(center) < .6)).toBe(true);
    disposeTree(model.group);
  });

  it('presents nine ordered folders with an explicit non-duration reading and three parallel strands', () => {
    const { model, props, object } = fixture(); model.update({ ...props, step: 1, selected: 'empire' });
    const periods = object(1, 'history-periods'); expect(periods.children).toHaveLength(9);
    expect(periods.children.map(folder => folder.userData.selectId)).toEqual(historyPeriods.map(period => period.id));
    const texts: string[] = []; model.group.traverse(child => { if (child instanceof THREE.Sprite && visible(child)) texts.push(child.userData.labelText as string); });
    expect(texts.some(text => text?.includes('间距不代表历时'))).toBe(true);
    const strands = ['history-politics', 'history-knowledge', 'history-practice'].map(id => object(1, id));
    expect(strands.every(visible)).toBe(true); expect(new Set(strands.map(strand => strand.position.x)).size).toBe(3);
    const stacked = strands.map(snapshot); model.update({ ...props, step: 1, selected: 'empire', layer: 'overlap' });
    strands.forEach((strand, n) => expect(snapshot(strand)).not.toEqual(stacked[n]));
    disposeTree(model.group);
  });

  it('opens the same selected period that the accompanying explanation names, including fallback', () => {
    const { model, props } = fixture();
    for (const selected of ['revival', 'ganden', 'not-a-period']) {
      model.update({ ...props, step: 1, selected });
      const expected = historyPeriods.find(period => period.id === selected) || historyPeriods[1];
      const leaf = model.group.getObjectByName(`period-leaf-${expected.id}`)!;
      expect(leaf.position.y).toBeGreaterThan(.5);
      const unit = historyUnderstanding('H2', { season: 1, layer: 'routes', progress: .5, selected, cutaway: false })!;
      expect(unit.title).toContain(expected.label); expect(unit.hasProgress).toBe(false);
    }
    disposeTree(model.group);
  });

  it('separates H3 event cards, the stone carrier, later blank copying and present reading', () => {
    const { model, props, object } = fixture(); const stone = object(2, 'history-stele-body'), copy = object(2, 'history-rubbing'), reading = object(2, 'history-reading');
    model.update({ ...props, step: 2, layer: 'event-821' });
    expect(visible(stone)).toBe(true); expect(visible(copy)).toBe(false); expect(visible(reading)).toBe(false);
    model.update({ ...props, step: 2, layer: 'event-822', progress: .5 }); const copyMiddle = copy.position.clone();
    expect(visible(copy)).toBe(true); expect(visible(reading)).toBe(false);
    model.update({ ...props, step: 2, layer: 'event-823', progress: 1 });
    expect(copy.position.x).toBeGreaterThan(copyMiddle.x); expect(visible(reading)).toBe(true);
    const blank = model.group.getObjectByName('blank-copy-carrier') as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    expect(blank.material.map).toBeNull(); expect(model.group.getObjectByName('uninscribed-stone-carrier')).toBeDefined();
    const unit = historyUnderstanding('H3', { season: 1, layer: 'event-823', progress: .5, selected: '', cutaway: false })!;
    expect(unit.explanation).toContain('没有给现存拓本补造制作年代');
    disposeTree(model.group);
  });

  it('keeps H4 households exactly invariant while opening different dated document folders', () => {
    const { model, props, object } = fixture(); model.update({ ...props, step: 3, layer: 'event-1951', progress: 0 });
    const households = object(3, 'history-household'), unchanged = snapshot(households);
    for (const year of [1951, 1959, 1965]) for (const progress of [0, .5, 1]) {
      model.update({ ...props, step: 3, layer: `event-${year}`, progress });
      expect(snapshot(households)).toEqual(unchanged);
      const folder = model.group.getObjectByName(`historical-document-${year}`)!; expect(folder.children[1].position.y).toBeGreaterThan(.5);
      const unit = historyUnderstanding('H4', { season: 1, layer: `event-${year}`, progress, selected: '', cutaway: false })!;
      if (progress === 0) expect(unit.title).toContain(String(year));
    }
    disposeTree(model.group);
  });

  it.each([0, 1, 2, 3])('freezes and restores the visible materials of history scene %s on replay', step => {
    const { model, props } = fixture(); const active = { ...props, step, selected: step === 1 ? 'revival' : props.selected, progress: .5 };
    model.update(active); const initial = snapshot(model.group);
    model.update({ ...active, playing: true }); expect(snapshot(model.group)).toEqual(initial);
    model.update({ ...active, progress: 1 }); model.update(active); expect(snapshot(model.group)).toEqual(initial);
    disposeTree(model.group);
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('keeps materials and linked labels finite on %s × %s', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const step of [0, 1, 2, 3]) for (const progress of [0, .5, 1]) {
      model.update({ ...props, step, progress, selected: 'empire' }); let labels = 0;
      model.group.traverse(child => {
        expect([...child.position.toArray(), ...child.scale.toArray(), ...child.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (child as THREE.Mesh).geometry; if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        if (child instanceof THREE.Sprite && visible(child)) labels++;
      }); expect(labels).toBeGreaterThan(1);
    }
    disposeTree(model.group);
  });

  it('releases the shared material carriers and textures once when the scene is replaced', () => {
    const { model, props } = fixture(); model.update(props);
    const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
    model.group.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) resources.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { resources.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.add(value); } });
    let count = 0; resources.forEach(resource => resource.addEventListener('dispose', () => count++)); disposeTree(model.group); disposeTree(model.group);
    expect(count).toBe(resources.size); expect(model.group.children).toHaveLength(0);
  });
});
