import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildNarrationAnnotations, type NarrationGuideState } from '../src/scene/narrationAnnotations';
import type { TibetSceneProps } from '../src/scene/TibetScene';

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180);
  camera.position.set(0, 3, 12); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const model = new THREE.Group();
  const subject = (id: string, x: number) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.4, .7), new THREE.MeshBasicMaterial());
    object.position.x = x; object.userData.selectId = id; model.add(object); return object;
  };
  const first = subject('first', -2), second = subject('second', 2);
  const renderer = { getSize: (value: THREE.Vector2) => value.set(width, height) };
  const annotations = buildNarrationAnnotations(model, camera, renderer);
  const guide: NarrationGuideState = { cueId: 'C3-explain', progress: .5, active: true, beatId: 'expand', targets: ['first', 'second'], drawProgress: .8, relation: 'sequence', title: '同一气团', explanation: '比较同一气团上升前后的状态。' };
  const props: TibetSceneProps & { guide: NarrationGuideState } = { scene: 'atmosphere', step: 2, season: 1, layer: 'parcel', progress: .5, playing: true, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {}, guide };
  return { model, first, second, camera, annotations, props };
}

function snapshot(group: THREE.Group) {
  return group.children.filter(object => object.visible).map(object => {
    const line = object as unknown as { geometry: THREE.BufferGeometry; material: { color: THREE.Color; linewidth: number; resolution: THREE.Vector2 } };
    return { name: object.name, attributes: Object.fromEntries(Object.entries(line.geometry.attributes).map(([name, value]) => [name, Array.from(value.array)])), color: line.material.color.getHex(), linewidth: line.material.linewidth, resolution: line.material.resolution.toArray() };
  });
}

function visibleCount(group: THREE.Group) { return group.children.filter(object => object.visible).length; }

describe('narration attention drawings', () => {
  it('draws real object brackets progressively, then connects subjects with a directional arrow', () => {
    const { annotations, props } = fixture();
    annotations.update({ ...props, guide: { ...props.guide, drawProgress: 0 } });
    expect(visibleCount(annotations.group)).toBe(0);
    annotations.update({ ...props, guide: { ...props.guide, drawProgress: .14 } });
    const early = visibleCount(annotations.group); expect(early).toBeGreaterThan(0);
    annotations.update({ ...props, guide: { ...props.guide, drawProgress: 1 } });
    expect(visibleCount(annotations.group)).toBeGreaterThan(early);
    expect(annotations.group.userData.targetIds).toEqual(['first', 'second']);
    // Four brackets plus a pin per target, one guide line plus its arrow.
    expect(visibleCount(annotations.group)).toBe(12);
    annotations.dispose();
  });

  it('freezes at the same narration progress and restores identical drawings on replay or cue changes', () => {
    const { annotations, props } = fixture();
    annotations.update(props); const initial = snapshot(annotations.group);
    annotations.update({ ...props, playing: false }); expect(snapshot(annotations.group)).toEqual(initial);
    annotations.update({ ...props, guide: { ...props.guide, cueId: 'another-cue', beatId: 'another-beat', drawProgress: 1 } });
    annotations.update(props); expect(snapshot(annotations.group)).toEqual(initial);
    annotations.update({ ...props, guide: { ...props.guide, drawProgress: .1 } });
    annotations.update(props); expect(snapshot(annotations.group)).toEqual(initial);
    annotations.dispose();
  });

  it('does not draw ghosts for hidden parents, invisible materials, label-only or missing subjects', () => {
    const { model, first, second, annotations, props } = fixture();
    const hidden = new THREE.Group(); hidden.visible = false; hidden.add(first); model.add(hidden);
    (second.material as THREE.MeshBasicMaterial).transparent = true; (second.material as THREE.MeshBasicMaterial).opacity = 0;
    const label = new THREE.Sprite(new THREE.SpriteMaterial()); label.userData.selectId = 'label-only'; model.add(label);
    annotations.update({ ...props, guide: { ...props.guide, targets: ['first', 'second', 'label-only', 'missing'], drawProgress: 1 } });
    expect(visibleCount(annotations.group)).toBe(0);
    hidden.visible = true;
    annotations.update({ ...props, guide: { ...props.guide, targets: ['first'], drawProgress: 1 } });
    expect(visibleCount(annotations.group)).toBe(5);
    annotations.update({ ...props, guide: { ...props.guide, active: false } }); expect(annotations.group.visible).toBe(false);
    annotations.dispose();
  });

  it('uses explicit local anchors in transformed models and excludes screen annotation groups', () => {
    const { model, first, annotations, props } = fixture();
    model.position.set(1, .3, 0); first.userData.guideAnchor = [0, .7, 0];
    const screen = new THREE.Group(); screen.userData.selectId = 'first'; screen.userData.screenAnnotation = true;
    const stray = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()); stray.position.x = 30; screen.add(stray); model.add(screen);
    annotations.update({ ...props, guide: { ...props.guide, targets: ['first'], drawProgress: 1 } });
    const dot = annotations.group.children[4] as unknown as { geometry: THREE.BufferGeometry };
    const coordinates = dot.geometry.attributes.instanceStart;
    const average = new THREE.Vector3();
    for (let n = 0; n < coordinates.count; n++) average.add(new THREE.Vector3().fromBufferAttribute(coordinates, n));
    average.divideScalar(coordinates.count);
    expect(average.distanceTo(new THREE.Vector3(-1, 1, 0))).toBeLessThan(.01);
    annotations.dispose();
  });

  it('distinguishes comparisons from directional sequences and individual focuses', () => {
    const { annotations, props } = fixture();
    annotations.update({ ...props, guide: { ...props.guide, relation: 'compare', drawProgress: 1 } });
    expect(visibleCount(annotations.group)).toBe(11);
    annotations.update({ ...props, guide: { ...props.guide, relation: 'focus', drawProgress: 1 } });
    expect(visibleCount(annotations.group)).toBe(10);
    annotations.dispose();
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('preserves pixel width and finite bounded marks at %s × %s', (width, height) => {
    const { annotations, props, camera } = fixture(width, height);
    annotations.update({ ...props, guide: { ...props.guide, targets: ['first'], drawProgress: 1 } });
    expect(visibleCount(annotations.group)).toBe(5);
    for (const object of annotations.group.children.filter(object => object.visible)) {
      const line = object as unknown as { geometry: THREE.BufferGeometry; material: { linewidth: number; resolution: THREE.Vector2 } };
      expect(line.material.resolution.toArray()).toEqual([width, height]);
      expect(line.material.linewidth).toBeLessThanOrEqual(3.6);
      for (const attribute of Object.values(line.geometry.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    const bracket = annotations.group.children[0] as unknown as { geometry: THREE.BufferGeometry };
    const attribute = bracket.geometry.attributes.instanceStart, points: THREE.Vector3[] = [];
    for (let n = 0; n < attribute.count; n++) points.push(new THREE.Vector3().fromBufferAttribute(attribute, n).project(camera));
    const horizontalExtent = Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x));
    expect(horizontalExtent * width / 2).toBeLessThan(13);
    annotations.dispose();
  });

  it('disposes each owned resource once, removes the overlay, and leaves model resources intact', () => {
    const { first, annotations, props } = fixture();
    annotations.update(props);
    let geometryDisposals = 0, materialDisposals = 0;
    const modelDispose = vi.fn(); first.geometry.addEventListener('dispose', modelDispose);
    for (const object of annotations.group.children) {
      const line = object as unknown as { geometry: THREE.BufferGeometry; material: THREE.Material };
      line.geometry.addEventListener('dispose', () => geometryDisposals++); line.material.addEventListener('dispose', () => materialDisposals++);
    }
    const count = annotations.group.children.length;
    annotations.dispose(); annotations.dispose(); annotations.update(props);
    expect(geometryDisposals).toBe(count); expect(materialDisposals).toBe(count);
    expect(annotations.group.children).toHaveLength(0); expect(annotations.group.visible).toBe(false); expect(modelDispose).not.toHaveBeenCalled();
  });
});
