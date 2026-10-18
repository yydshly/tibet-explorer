import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Vitest runs this Node-only fixture read; the browser project intentionally has no Node ambient types.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { cityLifeProfileSamples, cityLifeVisualState } from '../src/scene/cityLifeOverlay';
import { sampleCityLifeTransect, sampleCityLifeSpace, cityTerrainLifeState } from '../src/scene/cityTerrainLife';
import { buildStoryAtlasScene, STORY_ATLAS_META, storyAtlasPosition } from '../src/scene/storyAtlas';
import { sampleTerrainMetres, TERRAIN_READING_META } from '../src/scene/terrainReading';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import { getCityLifeJourney } from '../src/data/cityLifeJourney';
import { disposeTree } from '../src/scene/environment';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async original => ({ ...await original<typeof import('../src/scene/environment')>(), label: (text: string) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite;
} }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid = new Int16Array(bytes.length / 2);
for (let index = 0; index < grid.length; index++) grid[index] = bytes.readInt16LE(index * 2);
const read = (longitude: number, latitude: number) => longitude < TERRAIN_READING_META.west || longitude > TERRAIN_READING_META.east || latitude < TERRAIN_READING_META.south || latitude > TERRAIN_READING_META.north
  ? undefined : sampleTerrainMetres(grid, longitude, latitude);
const settings: TibetSceneProps = { scene: 'region', viewKey: 'atlas', layer: 'atlas-city-life', selected: 'city:nyingchi', step: 0,
  progress: 0, season: 1, cutaway: false, playing: false, resetKey: 0, communitySupport: 'shared', onSelect() {}, onInteract() {} };
const withKind = (root: THREE.Object3D, kind: string) => {
  const result: THREE.Object3D[] = [];
  root.traverse(object => { if (object.userData.kind === kind) result.push(object); }); return result;
};
async function scene() {
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
    const texture = new THREE.Texture<HTMLImageElement>(); onLoad?.(texture); return texture;
  });
  const boundaries = JSON.parse(readFileSync('public/assets/earth-context.json', 'utf8'));
  vi.stubGlobal('fetch', vi.fn(async url => url === STORY_ATLAS_META.boundaries
    ? { ok: true, json: async () => boundaries }
    : { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }));
  const camera = new THREE.PerspectiveCamera(43, 1.6, .1, 300);
  const focus = vi.fn((position: THREE.Vector3, target: THREE.Vector3) => { camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld(); });
  const model = buildStoryAtlasScene({ camera, renderer: { getSize: (value: THREE.Vector2) => value.set(1280, 800), capabilities: { getMaxAnisotropy: () => 8 } } as THREE.WebGLRenderer,
    sun: new THREE.DirectionalLight(), focus, hasSavedView: () => false });
  await model.ready; return { model, camera, focus };
}

describe('city life remains on the sourced regional map', () => {
  it('samples actual metre elevations through each sourced town, without inventing climate readings', () => {
    for (const city of ['nyingchi', 'lhasa', 'ngari']) {
      const reference = verifiedPlaceReferences[city], profile = cityLifeProfileSamples(city, read);
      expect(profile).toHaveLength(81);
      expect(profile[40].longitude).toBe(reference.longitude);
      expect(profile[40].latitude).toBeCloseTo(reference.latitude, 10);
      expect(profile[40].metres).toBeCloseTo(sampleTerrainMetres(grid, reference.longitude, reference.latitude), 8);
      expect(profile.every(point => point.longitude === reference.longitude && point.metres === read(point.longitude, point.latitude))).toBe(true);
      expect(Math.max(...profile.map(point => point.metres)) - Math.min(...profile.map(point => point.metres))).toBeGreaterThan(300);
    }
    expect(cityLifeProfileSamples('unverified-place', read)).toEqual([]);
    expect(cityLifeProfileSamples('lhasa', () => undefined)).toEqual([]);
  });

  it('changes organization of travel and taking water without changing natural terrain, slope flow or space', async () => {
    const { model, focus } = await scene();
    const terrain = withKind(model.group, 'sourced-dem')[0];
    model.update({ ...settings, step: 1, progress: .3 });
    const marker = withKind(model.group, 'terrain-transect-progress-marker')[0];
    const complete = marker.position.clone(), calls = focus.mock.calls.length;
    model.update({ ...settings, step: 1, progress: .3, communitySupport: 'individual' });
    expect(marker.position.equals(complete)).toBe(false);
    expect(marker.userData.sample.metres).toBe(read(marker.userData.sample.longitude, marker.userData.sample.latitude));
    model.update({ ...settings, step: 1, progress: .3 });
    expect(marker.position.equals(complete)).toBe(true);
    model.update({ ...settings, step: 1, progress: .6 });
    const flows = withKind(model.group, 'natural-dem-descent-not-channel'), samples = flows.map(flow => JSON.stringify(flow.userData.samples));
    const opening = withKind(model.group, 'principle-taking-opening')[0];
    expect(opening.rotation.y).toBeGreaterThan(0);
    model.update({ ...settings, step: 1, progress: .6, communitySupport: 'individual' });
    expect(opening.rotation.y).toBe(0);
    expect(flows.map(flow => JSON.stringify(flow.userData.samples))).toEqual(samples);
    model.update({ ...settings, step: 1, progress: 1 });
    const land = withKind(model.group, 'relative-terrain-space-not-city-boundary')[0] as THREE.Mesh;
    const positions = Array.from(land.geometry.attributes.position.array), count = land.geometry.drawRange.count;
    model.update({ ...settings, step: 1, progress: 1, communitySupport: 'individual' });
    expect(Array.from(land.geometry.attributes.position.array)).toEqual(positions);
    expect(land.geometry.drawRange.count).toBe(count);
    model.update({ ...settings, step: 1, progress: .1 });
    expect(land.parent?.parent?.visible).toBe(false);
    model.update({ ...settings, step: 1, progress: 1 });
    expect(land.geometry.drawRange.count).toBe(count);
    expect(focus.mock.calls).toHaveLength(calls);
    expect(withKind(model.group, 'sourced-dem')[0]).toBe(terrain);
    expect(withKind(model.group, 'conceptual-life-relation')).toHaveLength(0);
    expect(cityLifeVisualState({ ...settings, progress: .339 }).beat).toBe(0);
    expect(cityTerrainLifeState({ ...settings, progress: .34 }).beat).toBe(1);
    expect(cityTerrainLifeState({ ...settings, progress: .68 }).beat).toBe(2);
    model.dispose(); disposeTree(model.group);
  });

  it('moves a real DEM reading backwards and moves Ngari history to sourced Tholing without replacing the atlas', async () => {
    const { model } = await scene();
    model.update({ ...settings, selected: 'city:ngari', progress: .9 });
    const terrain = withKind(model.group, 'sourced-dem')[0], probe = withKind(model.group, 'actual-dem-profile-probe')[0];
    const lateLatitude = probe.userData.sample.latitude;
    expect(probe.userData.sample.metres).toBe(read(probe.userData.sample.longitude, lateLatitude));
    model.update({ ...settings, selected: 'city:ngari', progress: .1 });
    expect(probe.userData.sample.latitude).toBeLessThan(lateLatitude);
    expect(probe.userData.sample.metres).toBe(read(probe.userData.sample.longitude, probe.userData.sample.latitude));
    model.update({ ...settings, selected: 'city:ngari', step: 2, progress: .34 });
    const history = withKind(model.group, 'history-material-place-reference')[0], reference = verifiedPlaceReferences.tholing;
    expect(history.userData.reference).toBe(reference);
    expect(history.userData.material.date).toBe('1042年');
    const place = storyAtlasPosition(reference.longitude, reference.latitude);
    expect(history.position.x).toBeCloseTo(place.x, 9);
    expect(history.position.z).toBeCloseTo(place.z, 9);
    expect(history.position.distanceTo(storyAtlasPosition(verifiedPlaceReferences.ngari.longitude, verifiedPlaceReferences.ngari.latitude))).toBeGreaterThan(.5);
    expect(withKind(model.group, 'sourced-dem')[0]).toBe(terrain);
    const cities = withKind(model.group, 'city-reference');
    expect(cities).toHaveLength(7);
    expect(cities.every(point => point.visible)).toBe(true);
    model.dispose(); disposeTree(model.group);
  });

  it('uses actual locations and distinct visible surface and underground water principles without a screen relationship diagram', async () => {
    const { model } = await scene();
    for (const city of ['nyingchi', 'lhasa', 'ngari'] as const) {
      const transect = sampleCityLifeTransect(city, read), space = sampleCityLifeSpace(city === 'nyingchi' ? 'lulang' : city, read)!;
      expect(transect).toHaveLength(101);
      expect(transect.every(point => point.metres === read(point.longitude, point.latitude))).toBe(true);
      expect(space.points.every(point => point.metres === read(point.longitude, point.latitude))).toBe(true);
      if (city === 'nyingchi') {
        expect(transect[0].longitude).toBe(verifiedPlaceReferences.nyingchi.longitude);
        expect(transect.at(-1)!.longitude).toBeCloseTo(verifiedPlaceReferences.lulang.longitude);
        expect(Math.max(...transect.map(point => point.metres))).toBeGreaterThan(Math.max(transect[0].metres, transect.at(-1)!.metres));
      }
      model.update({ ...settings, selected: `city:${city}`, step: 1, progress: .65 });
      const reference = verifiedPlaceReferences[city === 'nyingchi' ? 'lulang' : city], pin = withKind(model.group, 'city-life-sourced-case-reference')[0];
      expect(pin.userData.reference).toBe(reference);
      const place = storyAtlasPosition(reference.longitude, reference.latitude);
      expect(pin.position.x).toBeCloseTo(place.x); expect(pin.position.z).toBeCloseTo(place.z);
      const underground = withKind(model.group, 'underground-extraction-principle-not-well-location')[0];
      expect(underground.visible).toBe(city === 'lhasa');
      if (city === 'lhasa') {
        const bead = withKind(model.group, 'groundwater-principle-lift-marker')[0], lifted = bead.position.y;
        model.update({ ...settings, selected: `city:${city}`, step: 1, progress: .65, communitySupport: 'individual' });
        expect(bead.position.y).toBeLessThan(lifted);
        expect(underground.userData.sourceDepthIsSchematic).toBe(true);
      } else expect(withKind(model.group, 'natural-dem-descent-not-channel').some(object => object.visible)).toBe(true);
    }
    expect(withKind(model.group, 'life-node-backing')).toHaveLength(0);
    model.dispose(); disposeTree(model.group);
  });

  it('repaints unchanged history captions when their active beat changes, then restores them when rewound', async () => {
    const { model } = await scene(), events = getCityLifeJourney('nyingchi')!.historyMilestones;
    const dateCaption = (index: number) => withKind(model.group, 'city-life-caption').find(item => item.userData.text === events[index].date)!;
    model.update({ ...settings, step: 2, progress: 0 });
    const first = dateCaption(0), material = (first as THREE.Sprite).material, release = vi.spyOn(material, 'dispose');
    expect(first.userData.color).toBe('#f4d894');
    model.update({ ...settings, step: 2, progress: .7 });
    expect(dateCaption(2).userData.color).toBe('#f4d894');
    expect(dateCaption(0).userData.color).not.toBe('#f4d894');
    expect(dateCaption(0)).not.toBe(first);
    expect(release).toHaveBeenCalledOnce();
    model.update({ ...settings, step: 2, progress: 0 });
    expect(dateCaption(0).userData.color).toBe('#f4d894');
    expect(dateCaption(2).userData.color).not.toBe('#f4d894');
    model.dispose(); disposeTree(model.group);
  });
});
