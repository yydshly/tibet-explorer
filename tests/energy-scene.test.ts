import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildEnergyBalanceScene } from '../src/scene/energyBalance';
import { disposeTree } from '../src/scene/environment';
import type { TibetSceneProps } from '../src/scene/TibetScene';

// The geometric model and transforms run unchanged. Canvas labels and the
// generated texture are substituted because these invariants do not need GL.
vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180);
  camera.position.set(12, 9, 17); camera.lookAt(0, 2.8, 0); camera.updateMatrixWorld();
  const renderer = { getSize: (value: THREE.Vector2) => value.set(width, height) } as THREE.WebGLRenderer;
  const model = buildEnergyBalanceScene({ renderer, camera });
  const props: TibetSceneProps = { scene: 'atmosphere', step: 1, season: 1, layer: 'energy', progress: 0, playing: false, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props };
}

function snapshot(root: THREE.Object3D) {
  const values: unknown[] = [];
  root.traverse(object => {
    // Only rendered state matters when a previous phase has been hidden.
    for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    const mesh = object as THREE.Mesh;
    values.push([object.visible, ...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) {
      const positions = mesh.geometry.attributes.position;
      values.push(Array.from(positions.array), [mesh.geometry.drawRange.start, mesh.geometry.drawRange.count]);
    }
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const coloured = material as THREE.MeshStandardMaterial;
        values.push([material.opacity, coloured.color?.getHex(), coloured.emissive?.getHex(), coloured.emissiveIntensity]);
      }
    }
  });
  return values;
}

describe('operable energy scene', () => {
  it.each([[1280, 720], [621, 620], [390, 620]])('keeps finite geometry and label transforms at %s × %s', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const progress of [0, .43, .69, 1, 0]) {
      model.update({ ...props, progress, cutaway: true }, 2, .016);
      model.group.traverse(object => {
        const mesh = object as THREE.Mesh;
        expect([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        if (mesh.geometry) expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      });
    }
    disposeTree(model.group);
  });

  it('freezes at fixed progress and restores the initial view after scrubbing back', () => {
    const { model, props } = fixture();
    model.update(props, 0, 0); const initial = snapshot(model.group);
    model.update({ ...props, progress: .69, playing: true }, 10, .5); const active = snapshot(model.group);
    model.update({ ...props, progress: .69, playing: false }, 1000, 20);
    expect(snapshot(model.group)).toEqual(active);
    model.update({ ...props, progress: 1 }, 1200, 20);
    model.update(props, 1400, 20);
    expect(snapshot(model.group)).toEqual(initial);
    disposeTree(model.group);
  });

  it('separates absorption and exchange and provides usable object selection IDs', () => {
    const { model, props } = fixture();
    const visiblePaths = () => model.group.children.filter(child => child.children.some(node => node instanceof THREE.Points) && child.visible);
    model.update({ ...props, progress: 1, layer: 'absorption' }, 0, 0);
    const absorption = visiblePaths().map(path => path.userData.selectId);
    expect(absorption).toContain('energy-sunlight'); expect(absorption).not.toContain('energy-space');
    model.update({ ...props, progress: 1, layer: 'exchange' }, 0, 0);
    const exchange = visiblePaths().map(path => path.userData.selectId);
    expect(exchange).toContain('energy-space'); expect(exchange).toContain('energy-atmosphere'); expect(exchange).not.toContain('energy-sunlight');
    for (const id of ['energy-sunlight', 'energy-surface', 'energy-atmosphere', 'energy-space']) {
      const objects: THREE.Object3D[] = []; model.group.traverse(object => { if (object.userData.selectId === id) objects.push(object); });
      expect(objects.length).toBeGreaterThan(0);
    }
    let disposed = 0; model.group.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.addEventListener('dispose', () => disposed++); });
    disposeTree(model.group); expect(model.group.children).toHaveLength(0); expect(disposed).toBeGreaterThan(20);
  });
});
