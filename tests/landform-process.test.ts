import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildLandformProcessScene, landformHeight } from '../src/scene/landformProcess';
import { landformUnderstanding } from '../src/data/landformUnderstanding';
import { disposeTree } from '../src/scene/environment';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: (text: string) => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.labelText = text; return sprite; }, mineralTexture: () => new THREE.Texture() };
});

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180); camera.position.set(15, 12, 19); camera.lookAt(0, 1.4, 0); camera.updateMatrixWorld();
  const model = buildLandformProcessScene({ renderer: { getSize: (v: THREE.Vector2) => v.set(width, height) }, camera });
  const props: TibetSceneProps = { scene: 'landscape', step: 1, viewKey: 'P2', season: 1, layer: 'sediment', progress: 0, playing: false, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  const object = (id: string) => model.group.children.find(child => child.userData.selectId === id && !(child instanceof THREE.Sprite))!;
  return { model, props, object };
}
function visible(object: THREE.Object3D) { for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false; return true; }
function snapshot(root: THREE.Object3D) {
  const values: unknown[] = [];
  root.traverse(object => {
    if (!visible(object)) return;
    const mesh = object as THREE.Mesh;
    values.push([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array), { ...mesh.geometry.drawRange });
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) values.push([material.opacity, (material as THREE.MeshBasicMaterial).color?.getHex()]);
  }); return values;
}
function nearestHeight(geometry: THREE.BufferGeometry, x: number, z: number) {
  const position = geometry.attributes.position; let best = 0, distance = Infinity;
  for (let i = 0; i < position.count; i++) { const d = (position.getX(i) - x) ** 2 + (position.getZ(i) - z) ** 2; if (d < distance) { best = i; distance = d; } }
  return position.getY(best);
}

describe('a reversible qualitative fluvial process', () => {
  it('actually lowers the channel while raising the downstream deposit beside it', () => {
    const { model, props, object } = fixture(); const ground = object('landform-slope') as THREE.Mesh;
    model.update(props); const channelStart = nearestHeight(ground.geometry, 0, 0), fanStart = nearestHeight(ground.geometry, 1.8, 4.3);
    model.update({ ...props, progress: 1 });
    expect(nearestHeight(ground.geometry, 0, 0)).toBeLessThan(channelStart - .4);
    expect(nearestHeight(ground.geometry, 1.8, 4.3)).toBeGreaterThan(fanStart + .1);
    const reference = model.group.getObjectByName('initial-landform-reference') as THREE.Mesh;
    expect(nearestHeight(reference.geometry, 0, 0)).toBeCloseTo(channelStart + .035, 5);
    expect(landformHeight(0, 0, 1)).toBeLessThan(landformHeight(0, 0, 0));
    disposeTree(model.group);
  });

  it('keeps every actual water-path segment descending as incision and deposition develop', () => {
    const { model, props, object } = fixture(); const water = object('landform-channel') as THREE.Mesh;
    for (const progress of [0, .2, .52, .8, 1]) {
      model.update({ ...props, progress }); const positions = water.geometry.attributes.position;
      // Each cross-section has two equal-height banks; both banks descend downstream.
      for (let n = 0; n < positions.count; n+=2) {
        expect(positions.getY(n)).toBe(positions.getY(n+1));
        expect(positions.getX(n+1)).toBeGreaterThan(positions.getX(n));
        if(n>=2)for(const bank of [0,1])expect(positions.getY(n+bank)).toBeLessThan(positions.getY(n-2+bank));
      }
    }
    disposeTree(model.group);
  });

  it('moves material downstream independently of water droplets and reveals deposited material', () => {
    const { model, props, object } = fixture(); const sediment = object('landform-sediment'), fan = object('landform-deposit');
    model.update({ ...props, progress: .3 }); const early = sediment.children.map(child => child.position.z);
    model.update({ ...props, progress: .6 }); const later = sediment.children.map(child => child.position.z);
    expect(later.every((z, n) => z > early[n])).toBe(true); expect(sediment.visible).toBe(true);
    const earlyDeposits = fan.children.filter(child => child.visible).length;
    model.update({ ...props, progress: 1 }); expect(fan.children.filter(child => child.visible).length).toBeGreaterThan(earlyDeposits);
    model.update({ ...props, progress: 1, layer: 'terrain' });
    expect(object('landform-channel').visible).toBe(false); expect(sediment.visible).toBe(false);
    model.update({ ...props, progress: 1, layer: 'water' });
    expect(object('landform-channel').visible).toBe(true); expect(sediment.visible).toBe(false);
    disposeTree(model.group);
  });

  it('keeps the attention anchors on their changing ground instead of below the surface', () => {
    const { model, props, object } = fixture();
    for (const progress of [0, .52, 1]) {
      model.update({ ...props, progress });
      for (const id of ['landform-channel', 'landform-sediment', 'landform-deposit']) {
        const [x, y, z] = object(id).userData.guideAnchor;
        expect(y).toBeGreaterThan(landformHeight(x, z, progress)); expect(y - landformHeight(x, z, progress)).toBeLessThan(.3);
      }
    }
    disposeTree(model.group);
  });

  it('freezes at the same progress and restores all visible geometry after rewinding', () => {
    const { model, props } = fixture(); model.update({ ...props, progress: .52 }); const reference = snapshot(model.group);
    model.update({ ...props, progress: .52, playing: true }); expect(snapshot(model.group)).toEqual(reference);
    model.update({ ...props, progress: 1 }); model.update({ ...props, progress: .52 }); expect(snapshot(model.group)).toEqual(reference);
    model.update(props); const start = snapshot(model.group); model.update({ ...props, progress: 1 }); model.update(props); expect(snapshot(model.group)).toEqual(start);
    disposeTree(model.group);
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('has finite geometry and projected labels on %s × %s', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const progress of [0, .52, 1]) {
      model.update({ ...props, progress }); model.group.traverse(object => {
        expect([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (object as THREE.Mesh).geometry; if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      });
    }
    disposeTree(model.group);
  });

  it('labels the model as qualitative and releases shared textures and resources exactly once', () => {
    const { model, props } = fixture(); model.update(props);
    const texts = model.group.children.filter(child => child instanceof THREE.Sprite).map(child => child.userData.labelText as string);
    expect(texts.some(text => text.includes('不对应真实年份与侵蚀深度'))).toBe(true);
    const unit = landformUnderstanding('P2', { season: 1, layer: 'sediment', progress: 1, selected: '', cutaway: false })!;
    expect(unit.provenance).toContain('概念模型'); expect(unit.provenance).toContain('流量或年份'); expect(unit.explanation).toContain('地质与年代证据');
    const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
    model.group.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) resources.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { resources.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.add(value); } });
    let count = 0; resources.forEach(resource => resource.addEventListener('dispose', () => count++)); disposeTree(model.group); disposeTree(model.group);
    expect(count).toBe(resources.size); expect(model.group.children).toHaveLength(0);
  });
});
