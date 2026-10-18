import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildEarthOrientation } from '../src/scene/earthOrientation';
import { earthOrientationLayers, geographicHierarchy, orientationObjects } from '../src/data/orientation';
import { disposeTree } from '../src/scene/environment';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()) };
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function fixture(width = 1280, height = 720) {
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture());
  const data = JSON.parse(readFileSync('public/assets/earth-context.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })));
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 250);
  camera.position.set(0, 5, -12); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const renderer = { getSize: value => value.set(width, height), capabilities: { getMaxAnisotropy: () => 8 } };
  const focus = vi.fn((position, target) => {
    camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld();
  });
  const model = buildEarthOrientation({ renderer, camera, sun: new THREE.DirectionalLight(), focus, hasSavedView: () => false });
  await new Promise(resolve => setTimeout(resolve, 0));
  const props = { scene: 'earth', step: 0, viewKey: 'G1', season: 1, layer: 'globe', progress: 0, playing: false, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  const kind = value => model.group.children.find(child => child.userData.kind === value);
  return { model, props, camera, focus, kind };
}

describe('地球入口的国家层级与环境背景', () => {
  it('沿真实球面范围依次靠近洲、国家和自治区，行政与自然范围分开', async () => {
    const { model, props, camera, kind } = await fixture();
    const distances = [];
    for (const layer of ['globe', 'asia', 'china', 'tibet']) {
      model.update({ ...props, layer }, 0, 0); distances.push(camera.position.length());
      expect(kind('china-reference').visible).toBe(layer !== 'globe');
      expect(kind('tibet-reference').visible).toBe(layer !== 'globe');
      expect(kind('physical-plateau-reference').visible).toBe(layer === 'tibet');
    }
    expect(distances.every((value, index) => index === 0 || value < distances[index - 1])).toBe(true);
    for (const key of ['china-reference', 'tibet-reference', 'physical-plateau-reference']) {
      const geometry = [];
      kind(key).traverse(node => { if (node.geometry) geometry.push(node.geometry); });
      expect(geometry.length).toBeGreaterThan(0);
      for (const value of geometry) {
        const positions = value.attributes.position;
        for (let i = 0; i < positions.count; i++) expect(new THREE.Vector3().fromBufferAttribute(positions, i).length()).toBeGreaterThan(3.65);
      }
    }
    expect(geographicHierarchy.find(value => value.id === 'asia')?.kind).toBe('洲');
    expect(geographicHierarchy.find(value => value.id === 'china')?.kind).toBe('国家');
    expect(geographicHierarchy.find(value => value.id === 'tibet')?.kind).toBe('省级行政区');
    disposeTree(model.group); model.dispose();
  });

  it('环境图层保留同一地球与西藏，纬线和五带不冒充地方气候图', async () => {
    const { model, props, kind } = await fixture();
    for (const layer of ['surroundings', 'latitude', 'zones', 'plateau', 'moisture']) {
      model.update({ ...props, viewKey: 'G2', layer }, 0, 0);
      expect(kind('tibet-reference').visible).toBe(true);
      expect(kind('latitude-grid').visible).toBe(['latitude', 'zones'].includes(layer));
      expect(kind('astronomical-latitude-zones').visible).toBe(layer === 'zones');
    }
    const latitude = earthOrientationLayers.G2.find(layer => layer.id === 'zones');
    expect(latitude.explanation).toContain('不是当地气候类型图');
    expect(orientationObjects.plateau.explanation).toContain('不能把它理解为西藏的上一级行政单位');
    disposeTree(model.group); model.dispose();
  });

  it.each([[1280, 720], [627, 650], [390, 620]])('窄屏也为国家、纬度与来向保留可选文字（%s × %s）', async (width, height) => {
    const { model, props } = await fixture(width, height);
    for (const layer of ['china', 'latitude', 'zones', 'moisture']) {
      model.update({ ...props, layer, progress: .6 }, 0, 0);
      const visible = [];
      model.group.traverse(node => {
        if (node instanceof THREE.Sprite && node.visible) {
          visible.push(node);
          expect(orientationObjects[node.userData.selectId]).toBeDefined();
          expect([...node.position.toArray(), ...node.scale.toArray()].every(Number.isFinite)).toBe(true);
        }
      });
      expect(visible.some(node => node.userData.selectId === 'tibet')).toBe(true);
      if (layer === 'china') expect(visible.some(node => node.userData.selectId === 'china')).toBe(true);
      if (layer === 'latitude') expect(visible.some(node => node.userData.selectId === 'earth-equator')).toBe(true);
      if (layer === 'zones') expect(visible.some(node => node.userData.selectId === 'earth-temperate')).toBe(true);
    }
    disposeTree(model.group); model.dispose();
  });

  it('真实国家边界随讲解写出，暂停保持笔迹，重播和切段清除上一条强调', async () => {
    const { model, props } = await fixture();
    const guide = { cueId: 'G1-explain', progress: .3, active: true, beatId: 'country', targets: ['china'], drawProgress: .35, relation: 'focus', title: '中国 · 国家', explanation: '从亚洲找到中国。' };
    const strokes = id => {
      const output = []; model.group.traverse(node => { if (node.userData.boundaryTarget === id) output.push(node); }); return output;
    };
    const counts = id => strokes(id).map(node => node.geometry.drawRange.count);
    model.update({ ...props, layer: 'china', playing: true, guide }, 1, .01);
    const drawn = counts('china'), full = strokes('china').reduce((sum, node) => sum + node.geometry.index.count, 0);
    expect(drawn.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(drawn.reduce((a, b) => a + b, 0)).toBeLessThan(full);
    const tip = model.group.children.find(node => node.userData.kind === 'narration-pen-tip');
    const penPosition = tip.position.toArray();
    model.update({ ...props, layer: 'china', playing: false, guide }, 987, .01);
    expect(counts('china')).toEqual(drawn); expect(tip.position.toArray()).toEqual(penPosition);
    model.update({ ...props, layer: 'china', guide: { ...guide, progress: 0, drawProgress: 0 } }, 999, .01);
    expect(counts('china').every(value => value === 0)).toBe(true);
    model.update({ ...props, layer: 'tibet', guide: { ...guide, cueId: 'G1-observe', beatId: 'region', targets: ['tibet'], drawProgress: .6 } }, 1001, .01);
    expect(strokes('china').every(node => !node.visible)).toBe(true);
    expect(counts('tibet').some(value => value > 0)).toBe(true);
    disposeTree(model.group); model.dispose();
  });

  it('洲与海洋采用开放的注意标记，不能生成未经来源支持的边界或交通路线', async () => {
    const { model, props } = await fixture();
    model.update({ ...props, layer: 'asia', guide: { cueId: 'G1-explain', progress: .2, active: true, beatId: 'continent-country', targets: ['asia', 'china'], drawProgress: .5, relation: 'sequence', title: '', explanation: '' } }, 0, 0);
    const boundaries = [], links = [], marks = [];
    model.group.traverse(node => {
      if (node.userData.boundaryTarget) boundaries.push(node.userData.boundaryTarget);
      if (node.userData.kind === 'narration-attention-link') links.push(node);
      if (node.userData.kind === 'narration-focus-bracket') marks.push(node);
    });
    expect(new Set(boundaries)).toEqual(new Set(['china', 'tibet', 'plateau']));
    expect(marks.length).toBeGreaterThan(0); expect(links.length).toBe(1);
    expect(links[0].userData.scope).toBe('presentation-guide-not-route');
    expect(links[0].geometry.drawRange.count).toBeGreaterThan(0);
    const state = links[0].geometry.drawRange.count;
    model.update({ ...props, layer: 'asia', playing: false, guide: { cueId: 'G1-explain', progress: .2, active: true, beatId: 'continent-country', targets: ['asia', 'china'], drawProgress: .5, relation: 'sequence', title: '', explanation: '' } }, 2000, 0);
    expect(links[0].geometry.drawRange.count).toBe(state);
    disposeTree(model.group); model.dispose();
  });

  it.each([[1280, 720], [390, 620]])('语音焦点优先保留可读的地理文字，水汽描线不使用墙上时钟（%s × %s）', async (width, height) => {
    const { model, props } = await fixture(width, height);
    const guide = { cueId: 'G2-observe', progress: .45, active: true, beatId: 'south-water', targets: ['indian-ocean'], drawProgress: .48, relation: 'focus', title: '', explanation: '' };
    model.update({ ...props, viewKey: 'G2', layer: 'moisture', guide }, 2, 0);
    const visible = [], flowInk = [];
    model.group.traverse(node => {
      if (node instanceof THREE.Sprite && node.visible && node.userData.selectId === 'indian-ocean') visible.push(node);
      if (node.userData.kind === 'narration-relationship-stroke' && node.userData.guideTarget === 'indian-ocean') flowInk.push(node);
    });
    expect(visible.length).toBeGreaterThan(0); expect(flowInk[0].geometry.drawRange.count).toBeGreaterThan(0);
    const snapshot = flowInk[0].geometry.drawRange.count;
    model.update({ ...props, viewKey: 'G2', layer: 'moisture', guide }, 100000, 0);
    expect(flowInk[0].geometry.drawRange.count).toBe(snapshot);
    disposeTree(model.group); model.dispose();
  });
});
