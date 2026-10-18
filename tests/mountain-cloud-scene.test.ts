import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMountainCloudScene, mountainCloudState } from '../src/scene/mountainCloud';
import { disposeTree } from '../src/scene/environment';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});
afterEach(() => vi.unstubAllGlobals());

function fixture(width = 1280, height = 720) {
  // Only the texture drawing surface is stubbed: actual Three geometry,
  // transforms, visibility, particles, annotations and disposal still run.
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: () => {}, fillStyle: '' }) }) });
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180);
  camera.position.set(10, 8, 17); camera.lookAt(0, 2.3, 0); camera.updateMatrixWorld();
  const renderer = { getSize: (vector: THREE.Vector2) => vector.set(width, height) } as THREE.WebGLRenderer;
  const model = buildMountainCloudScene({ renderer, camera });
  const props: TibetSceneProps & { airMoisture: 'higher' | 'lower' } = { scene: 'rain', viewKey: 'C5', step: 4, season: 1, layer: 'rain', progress: 0, airMoisture: 'higher', playing: false, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props };
}

function snapshot(group: THREE.Object3D) {
  const result: unknown[] = [];
  group.traverse(object => {
    for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    result.push([...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()]);
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) result.push([Array.from(mesh.geometry.attributes.position.array), mesh.geometry.drawRange.count]);
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) result.push([material.opacity, (material as THREE.MeshBasicMaterial).color?.getHex()]);
  });
  return result;
}

describe('mountain cloud comparison', () => {
  it('shows condensation before precipitation, and keeps low-moisture lift without this ground precipitation', () => {
    const { model, props } = fixture();
    model.update({ ...props, progress: .56 }, 0, 0);
    expect(model.group.getObjectByName('conditional-cloud')?.visible).toBe(true);
    expect(model.group.getObjectByName('conditional-precipitation')?.visible).toBe(false);
    const ground = model.group.getObjectByName('fixed-mountain-front') as THREE.Mesh;
    const before = Array.from(ground.geometry.attributes.position.array);
    model.update({ ...props, progress: 1, layer: 'water' }, 10, .5);
    expect(model.group.getObjectByName('conditional-precipitation')?.visible).toBe(true);
    expect(model.group.getObjectByName('added-surface-runoff')?.visible).toBe(true);
    const parcel = model.group.getObjectByName('rising-parcel')!;
    const position = parcel.position.clone(), scale = parcel.scale.clone();
    model.update({ ...props, progress: 1, layer: 'water', airMoisture: 'lower' }, 100, 10);
    expect(parcel.position).toEqual(position); expect(parcel.scale).toEqual(scale);
    expect(Array.from(ground.geometry.attributes.position.array)).toEqual(before);
    expect(model.group.getObjectByName('conditional-cloud')?.visible).toBe(true);
    expect(model.group.getObjectByName('conditional-precipitation')?.visible).toBe(false);
    expect(model.group.getObjectByName('added-surface-runoff')?.visible).toBe(false);
    expect(mountainCloudState(1, 'lower').condensation).toBeLessThan(mountainCloudState(1, 'higher').condensation);
    disposeTree(model.group);
  });

  it('freezes and reversibly scrubs the whole process, independent of wall time', () => {
    const { model, props } = fixture();
    model.update(props, 0, 0); const initial = snapshot(model.group);
    model.update({ ...props, progress: .9, layer: 'water', cutaway: true, playing: true }, 5, .2); const active = snapshot(model.group);
    model.update({ ...props, progress: .9, layer: 'water', cutaway: true }, 900, 80);
    expect(snapshot(model.group)).toEqual(active);
    model.update({ ...props, progress: 1, airMoisture: 'lower' }, 1000, 100);
    model.update(props, 2000, 100);
    expect(snapshot(model.group)).toEqual(initial);
    disposeTree(model.group);
  });

  it.each([[1280, 720], [621, 620], [390, 620]])('keeps finite geometry and annotations at %s × %s', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const progress of [0, .3, .57, .72, .95, 1, 0]) for (const airMoisture of ['higher', 'lower'] as const) {
      model.update({ ...props, progress, airMoisture, cutaway: true, layer: 'water' }, 0, 0);
      model.group.traverse(object => {
        expect([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (object as THREE.Mesh).geometry;
        if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      });
    }
    disposeTree(model.group);
  });

  it('preserves the five clickable concepts and releases geometric resources', () => {
    const { model } = fixture(), ids = new Set<string>();
    let disposed = 0;
    model.group.traverse(object => { if (object.userData.selectId) ids.add(object.userData.selectId); (object as THREE.Mesh).geometry?.addEventListener('dispose', () => disposed++); });
    for (const id of ['cloud-inflow', 'cloud-lift', 'cloud-condense', 'cloud-precipitation', 'cloud-runoff']) expect(ids.has(id)).toBe(true);
    disposeTree(model.group); expect(model.group.children).toHaveLength(0); expect(disposed).toBeGreaterThan(15);
  });
});
