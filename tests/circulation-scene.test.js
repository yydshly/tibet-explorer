import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCirculationContextScene, circulationPosition, circulationSeason, circulationContextState, circulationDeflectionExample } from '../src/scene/circulationContext';
import { buildPlateauClimateScene, PLATEAU_CLIMATE_SCENE, plateauAirPose, plateauClimateCamera, plateauTerrainMetres, plateauTerrainPosition } from '../src/scene/plateauClimateScene';
import { plateauClimateState } from '../src/lib/plateauClimateState';
import { elevationDescriptors, sampleElevationMetres } from '../src/lib/elevationReading';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import { disposeTree } from '../src/scene/environment';
import { buildNarrationAnnotations } from '../src/scene/narrationAnnotations';
import { journeySteps } from '../src/data/journey';
import { visualGuideForCue } from '../src/data/visualGuidance';
import { narrationPhraseBindings } from '../src/lib/narrationPhraseGuide';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()) };
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function fixture(width = 1280, height = 720) {
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture());
  const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })));
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 250);
  camera.position.set(5, 36, 33); camera.lookAt(0, .7, 0); camera.updateMatrixWorld();
  const renderer = { getSize: value => value.set(width, height), capabilities: { getMaxAnisotropy: () => 8 } };
  const focus = vi.fn((position, target) => {
    camera.position.copy(target.clone().add(position.clone().sub(target).multiplyScalar(1 / Math.max(.42, Math.min(1, width / height)))));
    camera.lookAt(target); camera.updateMatrixWorld();
  });
  const model = buildCirculationContextScene({ renderer, camera, sun: new THREE.DirectionalLight(), focus, hasSavedView: () => false });
  await new Promise(resolve => setTimeout(resolve, 0));
  const props = { scene: 'atmosphere', step: 3, viewKey: 'C4', season: 1, layer: 'wind', progress: 0, playing: false, selected: '', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props, camera, focus };
}

function renderedState(root) {
  const values = [];
  root.traverse(object => {
    for (let node = object; node; node = node.parent) if (!node.visible) return;
    const mesh = object;
    values.push([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array));
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const coloured = material;
      values.push([material.opacity, coloured.color?.getHex(), coloured.emissiveIntensity]);
    }
  });
  return values;
}

function airPaths(root, kind) {
  return root.children.filter(child => child.userData.airPath === kind);
}

describe('保留的环流原理场景：来向与水汽的空间演示', () => {
  it('地区定位保留东西和南北方向，高程来自同一发布网格', async () => {
    expect(circulationPosition(48, 58).x).toBe(-16);
    expect(circulationPosition(123, 0).x).toBe(16);
    expect(circulationPosition(88, 33).z).toBeLessThan(circulationPosition(75, 12).z);
    const { model, props } = await fixture(); model.update(props, 0, 0);
    const nodes = []; model.group.traverse(node => { if (node.userData.kind === 'sourced-terrain') nodes.push(node); });
    expect(nodes).toHaveLength(1); expect(nodes[0].visible).toBe(true);
    const positions = nodes[0].geometry.attributes.position;
    expect(positions.count).toBe(129 * 73);
    const heights = Array.from({ length: positions.count }, (_, i) => positions.getY(i));
    expect(Math.max(...heights)).toBeGreaterThan(1.8); expect(Math.max(...heights)).toBeLessThan(3);
    expect(Math.min(...heights)).toBeGreaterThan(0);
    disposeTree(model.group); model.dispose();
  });

  it.each([[1280, 720], [627, 650], [390, 620]])('暂停与回拖在 %s × %s 中冻结并恢复路径', async (width, height) => {
    const { model, props } = await fixture(width, height);
    model.update(props, 0, 0); const initial = renderedState(model.group);
    model.update({ ...props, progress: .72, playing: true }, 20, .5); const active = renderedState(model.group);
    expect(active).not.toEqual(initial);
    model.update({ ...props, progress: .72, playing: false }, 999, 8); expect(renderedState(model.group)).toEqual(active);
    model.update({ ...props, progress: 1 }, 1200, 10);
    model.update(props, 1600, 20); expect(renderedState(model.group)).toEqual(initial);
    model.group.traverse(node => {
      expect([...node.position.toArray(), ...node.scale.toArray(), ...node.quaternion.toArray()].every(Number.isFinite)).toBe(true);
      const mesh = node;
      if (mesh.geometry) expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    });
    disposeTree(model.group); model.dispose();
  });

  it('空气来向和水汽标记分层，冬季西侧仍可显示水汽，春秋保留转换解释', async () => {
    const { model, props } = await fixture();
    model.update({ ...props, progress: .7, layer: 'wind' }, 0, 0);
    const points = (path) => path.children.filter(child => child instanceof THREE.Points);
    const west = airPaths(model.group, 'west')[0], south = airPaths(model.group, 'south')[0];
    expect(points(west)[0].visible).toBe(true); expect(points(west)[1].visible).toBe(false);
    model.update({ ...props, progress: .7, layer: 'water', season: 1 }, 0, 0);
    expect(points(west)[1].visible).toBe(true); expect(points(south)[1].visible).toBe(true);
    model.update({ ...props, progress: .7, layer: 'water', season: 3 }, 0, 0);
    expect(points(west)[1].visible).toBe(true); expect(points(south)[0].visible).toBe(false); expect(points(south)[1].visible).toBe(false);
    expect(circulationSeason(0)).toBe('transition'); expect(circulationSeason(2)).toBe('transition');
    expect(circulationContextState(2, 'wind', .7).explanation).toContain('不能由一个日期标签确定');
    expect(circulationContextState(3, 'water', .7).explanation).toContain('冬季不等于所有地区干燥');
    disposeTree(model.group); model.dispose();
  });

  it('海陆原理案例方向可改变，手动取景不会被进度或季节反复抢回', async () => {
    const { model, props, focus, camera } = await fixture();
    model.update({ ...props, progress: .7, layer: 'circulation', season: 1 }, 0, 0);
    const cell = airPaths(model.group, 'cell')[0], arrow = cell.children.find(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry);
    const summer = arrow.position.clone();
    camera.position.add(new THREE.Vector3(2, 0, 0)); const manuallyMoved = camera.position.clone();
    model.update({ ...props, progress: .7, layer: 'circulation', season: 3 }, 200, 3);
    expect(arrow.position.distanceTo(summer)).toBeGreaterThan(.3);
    expect(focus).toHaveBeenCalledTimes(1); expect(camera.position).toEqual(manuallyMoved);
    const ids = new Set(); model.group.traverse(node => { if (node.userData.selectId) ids.add(node.userData.selectId); });
    for (const id of ['circulation-ocean', 'circulation-land', 'circulation-plateau', 'circulation-south', 'circulation-west']) expect(ids.has(id)).toBe(true);
    disposeTree(model.group); model.dispose();
  });

  it('冬夏原理案例相对各自前进方向都向右偏，高程范围明确标为显示框', async () => {
    for (const season of ['summer', 'winter']) {
      const { forceStart, forceEnd, points } = circulationDeflectionExample(season);
      const forward = forceEnd.clone().sub(forceStart); forward.y = 0;
      const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
      for (let i = 1; i < points.length; i++) {
        const reference = forceStart.clone().lerp(forceEnd, i / (points.length - 1));
        expect(points[i].clone().sub(reference).dot(right)).toBeGreaterThan(0);
      }
    }
    const { model, props } = await fixture(); model.update(props, 0, 0);
    const extent = model.group.children.find(node => node.userData.kind === 'elevation-display-extent');
    expect(extent).toBeDefined(); expect(extent.geometry.attributes.position.count).toBeGreaterThan(128);
    const positions = extent.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) expect(positions.getY(i)).toBeGreaterThan(.035);
    disposeTree(model.group); model.dispose();
  });
});

async function plateauFixture(width = 1280, height = 720) {
  const canvasContext = new Proxy({ clearRect: vi.fn(), strokeText: vi.fn(), fillText: vi.fn() }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => canvasContext }) });
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_, onLoad) => {
    const texture = new THREE.Texture(); onLoad?.(texture); return texture;
  });
  const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const grid = new Int16Array(buffer);
  const context = JSON.parse(readFileSync('public/assets/earth-context.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, arrayBuffer: async () => buffer, json: async () => String(url).includes('earth-context') ? context : {} })));
  const camera = new THREE.PerspectiveCamera(43, width / height, .01, 250);
  const focus = vi.fn((position, target) => { camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld(); });
  const renderer = { getSize: value => value.set(width, height), capabilities: { getMaxAnisotropy: () => 8 } };
  const model = buildPlateauClimateScene({ renderer, camera, focus }); await model.ready;
  const props = { scene: 'atmosphere', step: 3, viewKey: 'C4', season: 1, layer: 'arrival', progress: 0, playing: false, selected: 'nyingchi', airMoisture: 'higher', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props, grid, camera, focus, renderer };
}

function findNode(root, predicate) {
  let found; root.traverse(node => { if (!found && predicate(node)) found = node; }); return found;
}

describe('C4 在同一地球上把真实地形、空气过程与地方连接', () => {
  it.each([[1280, 720], [390, 620]])('实际讲稿短句在 %s × %s 中找到可见实体，标记不依赖文字精灵', async (width, height) => {
    const { model, props, camera, renderer, grid } = await plateauFixture(width, height);
    const annotations = buildNarrationAnnotations(model.group, camera, renderer);
    const phraseProps = (cueId, token, layer) => {
      const cue = journeySteps.C4.cues.find(item => item.id === cueId);
      const phrase = narrationPhraseBindings(cueId, cue.narration).find(item => item.token === token);
      expect(phrase, `${cueId}: ${token}`).toBeDefined();
      const textProgress = (phrase.textStart + (phrase.textEnd - phrase.textStart) * .7) / cue.narration.length;
      const guide = { ...visualGuideForCue(cueId, .01, true, { textProgress, precision: 'provider' }), drawProgress: 1 };
      return { ...props, layer, ...guide.sceneSettings, progress: guide.sceneProgress ?? props.progress, guide };
    };
    const cases = [
      ['C4-arrival', '地球上的空气循环', 'arrival', 'circulation-ocean'],
      ['C4-arrival', '夏季南侧水汽联系', 'arrival', 'circulation-south'],
      ['C4-arrival', '西侧系统也能携带水汽', 'arrival', 'circulation-west'],
      ['C4-arrival', '先记住来路', 'arrival', 'circulation-plateau'],
      ['C4-uplift', '跟随藏东南方向', 'uplift', 'cloud-inflow'],
      ['C4-uplift', '沿高差上升', 'uplift', 'cloud-lift'],
      ['C4-cloud', '满足条件才凝结成云滴', 'cloud', 'cloud-condense'],
      ['C4-cloud', '才可能有降水到达地面', 'cloud', 'cloud-precipitation'],
      ['C4-cloud', '随后水沿坡面', 'cloud', 'cloud-runoff'],
      ['C4-regions', '林芝、', 'regions', 'nyingchi'],
      ['C4-regions', '拉萨和', 'regions', 'lhasa'],
      ['C4-regions', '阿里的位置', 'regions', 'ngari'],
      ['C4-life', '现在保留', 'life', 'circulation-plateau'],
    ];
    for (const [cue, token, layer, target] of cases) {
      const state = phraseProps(cue, token, layer);
      model.update(state); annotations.update(state);
      expect(state.guide.targets, `${cue}: ${token}`).toContain(target);
      expect(annotations.group.children.filter(node => node.visible), `${cue}: ${token} -> ${target}`).toHaveLength(5);
      for (const node of annotations.group.children.filter(node => node.visible)) {
        expect(Object.values(node.geometry.attributes).every(attribute => Array.from(attribute.array).every(Number.isFinite))).toBe(true);
      }
    }
    // Whole-surface targets have a geographic point, not the sphere's centre
    // or the rectangular DEM bounds. Neither becomes a selectable fake POI.
    const ocean = findNode(model.group, node => node.userData.guideId === 'circulation-ocean');
    const plateau = findNode(model.group, node => node.userData.guideId === 'circulation-plateau');
    expect(ocean.userData.guideAnchor.length()).toBe(PLATEAU_CLIMATE_SCENE.radius);
    expect(ocean.userData.selectId).toBeUndefined();
    expect(plateau.userData.guideAnchor.distanceTo(plateauTerrainPosition(grid, 87, 34.5))).toBeLessThan(1e-9);
    const flow = phraseProps('C4-cloud', '随后水沿坡面', 'cloud');
    model.update(flow); annotations.update(flow);
    const runoff = findNode(model.group, node => node.userData.guideId === 'cloud-runoff');
    const dot = annotations.group.children[4].geometry.attributes.instanceStart;
    const center = new THREE.Vector3();
    for (let index = 0; index < dot.count; index++) center.add(new THREE.Vector3().fromBufferAttribute(dot, index));
    center.divideScalar(dot.count);
    expect(center.distanceTo(runoff.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-6);
    // Moisture comparison hides the real bodies and therefore their guides.
    for (const [token, target] of [['满足条件才凝结成云滴', 'cloud-condense'], ['才可能有降水到达地面', 'cloud-precipitation'], ['随后水沿坡面', 'cloud-runoff']]) {
      const dry = { ...phraseProps('C4-cloud', token, 'cloud'), airMoisture: 'lower' };
      model.update(dry); annotations.update(dry);
      expect(dry.guide.targets).toEqual([target]);
      expect(annotations.group.children.some(node => node.visible)).toBe(false);
    }
    annotations.dispose(); disposeTree(model.group); model.dispose();
  });

  it('五段保留同一个球面高程实体，米制读值与垂直夸张分别表达', async () => {
    const { model, props, grid } = await plateauFixture();
    const relief = findNode(model.group, node => node.userData.kind === 'real-dem-on-same-earth');
    expect(model.group.userData.dataReady).toBe(true); expect(relief.children).toHaveLength(1);
    const geometry = relief.children[0].geometry;
    for (const layer of ['arrival', 'uplift', 'cloud', 'regions', 'life']) {
      model.update({ ...props, layer, progress: .72 });
      expect(findNode(model.group, node => node.userData.kind === 'real-dem-on-same-earth')).toBe(relief);
      expect(relief.children[0].geometry).toBe(geometry); expect(relief.visible).toBe(true);
    }
    for (const [longitude, latitude] of [[89, 26], [89, 28.046875], [89, 33], [94, 29]]) {
      const metres = sampleElevationMetres(grid, elevationDescriptors.regional, longitude, latitude);
      expect(plateauTerrainMetres(grid, longitude, latitude)).toBe(metres);
      const radius = plateauTerrainPosition(grid, longitude, latitude).length();
      expect(radius).toBeCloseTo(PLATEAU_CLIMATE_SCENE.radius + Math.max(0, metres) / 6371000 * PLATEAU_CLIMATE_SCENE.radius * PLATEAU_CLIMATE_SCENE.verticalExaggeration + .002, 9);
    }
    expect(plateauTerrainMetres(grid, 60, 20)).toBeUndefined();
    disposeTree(model.group); model.dispose();
  });

  it('靠近地球的镜头连续，局部过程共用视角且气团始终高于公开地形', async () => {
    const { model, grid } = await plateauFixture();
    const before = plateauClimateCamera('arrival', .55 - 1e-6), after = plateauClimateCamera('arrival', .55 + 1e-6);
    expect(before.position.distanceTo(after.position)).toBeLessThan(.001);
    expect(before.target.distanceTo(after.target)).toBeLessThan(.001);
    const uplift = plateauClimateCamera('uplift', 1), cloud = plateauClimateCamera('cloud', 0);
    expect(uplift.position.distanceTo(cloud.position)).toBeLessThan(1e-9);
    expect(uplift.target.distanceTo(cloud.target)).toBeLessThan(1e-9);
    const regions = plateauClimateCamera('regions', 1), life = plateauClimateCamera('life', 0);
    expect(regions.position.distanceTo(life.position)).toBeLessThan(1e-9);
    for (let i = 0; i <= 30; i++) expect(plateauClimateCamera('arrival', i / 30).position.length()).toBeGreaterThan(PLATEAU_CLIMATE_SCENE.radius);
    for (let i = 0; i <= 30; i++) {
      const pose = plateauAirPose(grid, i / 30);
      expect(pose.terrainMetres).toBe(sampleElevationMetres(grid, elevationDescriptors.regional, pose.longitude, pose.latitude));
      expect(pose.position.length()).toBeGreaterThan(plateauTerrainPosition(grid, pose.longitude, pose.latitude).length());
      expect(pose.teachingClearanceMetres).toBeGreaterThan(0);
    }
    disposeTree(model.group); model.dispose();
  });

  it.each([[1280, 720], [390, 620]])('云雨在 %s × %s 中由同一进度可回退，水汽对照保持地形与抬升路径', async (width, height) => {
    const { model, props } = await plateauFixture(width, height);
    const cloud = findNode(model.group, node => node.userData.guideAnchor === 'cloud-condense' && node instanceof THREE.Group);
    const rain = findNode(model.group, node => node.userData.guideAnchor === 'cloud-precipitation' && node instanceof THREE.LineSegments);
    const parcel = findNode(model.group, node => node.userData.selectId === 'cloud-lift');
    model.update({ ...props, layer: 'cloud', progress: .15 });
    expect(cloud.visible).toBe(false); expect(rain.visible).toBe(false);
    model.update({ ...props, layer: 'cloud', progress: .5 });
    expect(cloud.visible).toBe(true); expect(rain.visible).toBe(false);
    model.update({ ...props, layer: 'cloud', progress: 1, playing: true }, 10, .1);
    expect(rain.visible).toBe(true);
    const wet = renderedState(model.group), position = parcel.position.clone();
    model.update({ ...props, layer: 'cloud', progress: 1, playing: false }, 999, 5);
    expect(renderedState(model.group)).toEqual(wet);
    model.update({ ...props, layer: 'cloud', progress: 1, airMoisture: 'lower' });
    expect(cloud.visible).toBe(false); expect(rain.visible).toBe(false); expect(parcel.position).toEqual(position);
    model.update({ ...props, layer: 'cloud', progress: .5 });
    expect(cloud.visible).toBe(true); expect(rain.visible).toBe(false);
    model.update({ ...props, layer: 'cloud', progress: 1 });
    expect(renderedState(model.group)).toEqual(wet);
    disposeTree(model.group); model.dispose();
  });

  it('三地采用已核验聚居地位置，生活段保留选择，原理背景不等于实况天气', async () => {
    const { model, props, grid } = await plateauFixture();
    for (const selected of ['nyingchi', 'lhasa', 'ngari']) {
      model.update({ ...props, layer: 'regions', selected });
      const marker = findNode(model.group, node => node.userData.selectId === selected && node.geometry instanceof THREE.SphereGeometry);
      const reference = verifiedPlaceReferences[selected];
      expect(marker.visible).toBe(true);
      expect(marker.position.distanceTo(plateauTerrainPosition(grid, reference.longitude, reference.latitude, 140))).toBeLessThan(1e-9);
      model.update({ ...props, layer: 'life', selected, progress: .8 });
      expect(marker.visible).toBe(true);
      expect(plateauClimateState({ ...props, layer: 'life', selected }).city).toBe(selected);
      expect(findNode(model.group, node => node.userData.kind === 'city-ground-section-not-route').visible).toBe(true);
    }
    expect(plateauClimateState({ ...props, season: 3 }).explanation).toContain('西风也可能携带水汽');
    expect(plateauClimateState({ ...props, layer: 'cloud', airMoisture: 'lower' }).explanation).toContain('定性对照');
    disposeTree(model.group); model.dispose();
  });
});
