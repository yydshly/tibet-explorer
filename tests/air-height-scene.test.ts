import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildAirHeightScene } from '../src/scene/airHeight';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180);
  camera.position.set(12, 8, 18); camera.lookAt(0, 2.8, 0); camera.updateMatrixWorld();
  const renderer = { getSize: (value: THREE.Vector2) => value.set(width, height) } as THREE.WebGLRenderer;
  const model = buildAirHeightScene({ renderer, camera });
  const props: TibetSceneProps = { scene: 'atmosphere', step: 2, season: 1, layer: 'parcel', progress: 0, playing: false, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props };
}

function snapshot(root: THREE.Object3D) {
  const values: unknown[] = [];
  root.traverse(object => {
    for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    const mesh = object as THREE.Mesh;
    values.push([object.visible, ...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array), [mesh.geometry.drawRange.start, mesh.geometry.drawRange.count]);
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) values.push([material.opacity, (material as THREE.MeshBasicMaterial).color?.getHex()]);
  });
  return values;
}

describe('operable air height scene', () => {
  it('lifts and expands the same parcel while leaving the environmental reference stationary', () => {
    const { model, props } = fixture();
    model.update(props, 0, 0);
    const parcel = model.group.getObjectByName('height-moving-parcel')!, environment = model.group.getObjectByName('height-fixed-environment')!;
    const start = parcel.position.clone(), startScale = parcel.scale.x, reference = snapshot(environment);
    const shell = parcel.children[0] as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>; const startColor = shell.material.color.getHex();
    model.update({ ...props, progress: 1 }, 20, 1);
    expect(parcel.position.y).toBeGreaterThan(start.y); expect(parcel.position.x).toBeGreaterThan(start.x); expect(parcel.scale.x).toBeGreaterThan(startScale);
    expect(shell.material.color.getHex()).not.toBe(startColor); expect(snapshot(environment)).toEqual(reference);
    const pressure = model.group.getObjectByName('height-surrounding-pressure')!;
    expect(pressure.children[0].scale.x).toBeLessThan(1);
    model.dispose();
  });

  it('freezes at fixed progress and returns all visible state when scrubbed back', () => {
    const { model, props } = fixture(); model.update(props, 0, 0); const initial = snapshot(model.group);
    model.update({ ...props, progress: .6, playing: true }, 10, .5); const active = snapshot(model.group);
    model.update({ ...props, progress: .6, playing: false }, 1000, 20); expect(snapshot(model.group)).toEqual(active);
    model.update({ ...props, progress: 1 }, 1200, 20); model.update(props, 1400, 20); expect(snapshot(model.group)).toEqual(initial);
    model.dispose();
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('keeps finite geometry and annotation transforms at %s × %s', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const layer of ['temperature', 'parcel', 'wind']) for (const progress of [0, .55, 1, 0]) {
      model.update({ ...props, layer, progress, cutaway: true }, 2, .016);
      model.group.traverse(object => {
        expect([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      });
    }
    model.dispose();
  });

  it('provides separate selectable subjects, exposes only terrain in the section, and disposes resources', () => {
    const { model, props } = fixture();
    for (const id of ['height-low', 'height-high', 'height-parcel', 'height-environment']) {
      const objects: THREE.Object3D[] = []; model.group.traverse(object => { if (object.userData.selectId === id) objects.push(object); }); expect(objects.length).toBeGreaterThan(0);
    }
    model.update(props, 0, 0); expect(model.group.getObjectByName('height-terrain-section')!.visible).toBe(false);
    model.update({ ...props, cutaway: true }, 0, 0); expect(model.group.getObjectByName('height-terrain-section')!.visible).toBe(true);
    let disposed = 0; model.group.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.addEventListener('dispose', () => disposed++); });
    model.dispose(); expect(model.group.children).toHaveLength(0); expect(disposed).toBeGreaterThan(20);
  });
});
