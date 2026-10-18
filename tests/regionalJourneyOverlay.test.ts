import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Node fixture reads run only in Vitest; product code has browser ambient types.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { regionalJourneys } from '../src/data/regionalJourney';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import { buildRegionalJourneyOverlay, regionalJourneyAirPoint, regionalJourneyAirPose, regionalJourneyVisualState, REGIONAL_JOURNEY_CITIES, sampleRegionalJourneyProfile, sampleRegionalJourneyWindow } from '../src/scene/regionalJourneyOverlay';
import { sampleTerrainMetres, TERRAIN_READING_META } from '../src/scene/terrainReading';
import { disposeTree } from '../src/scene/environment';
import type { RegionalJourneyAction } from '../src/data/regionalJourneyTypes';

vi.mock('../src/scene/environment', async original => ({ ...await original<typeof import('../src/scene/environment')>(), label: (text: string) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite;
} }));
afterEach(() => { vi.restoreAllMocks(); });
const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid = new Int16Array(bytes.length / 2);
for (let index = 0; index < grid.length; index++) grid[index] = bytes.readInt16LE(index * 2);
const read = (lon: number, lat: number) => lon < TERRAIN_READING_META.west || lon > TERRAIN_READING_META.east || lat < TERRAIN_READING_META.south || lat > TERRAIN_READING_META.north ? undefined : sampleTerrainMetres(grid, lon, lat);
const kinds = (root: THREE.Object3D, kind: string) => {
  const found: THREE.Object3D[] = []; root.traverse(node => { if (node.userData.kind === kind) found.push(node); }); return found;
};
const effectiveVisibility = (object: THREE.Object3D) => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
};
const findAction = (action: RegionalJourneyAction) => {
  for (const journey of regionalJourneys) for (let step = 0; step < journey.stages.length; step++) {
    const regionalCue = journey.stages[step].cues.findIndex(cue => cue.action === action);
    if (regionalCue >= 0) return { layer: 'atlas-regional-journey', selected: `city:${journey.cityId}`, step, regionalCue, progress: .95, regionalProcess: true };
  }
  throw new Error(`No authored ${action} cue`);
};
const fixture = () => {
  const camera = new THREE.PerspectiveCamera(43, 1.6, .1, 300); camera.position.set(91, 20, 45); camera.lookAt(91, 0, 30); camera.updateMatrixWorld();
  const baseline = (lon: number, lat: number) => new THREE.Vector3(lon, 0, lat);
  const model = buildRegionalJourneyOverlay({ camera, baseline, metres: read, metresToWorld: metres => metres / 5000,
    at: (lon, lat, offset = 0) => new THREE.Vector3(lon, (read(lon, lat) ?? 0) / 5000 + offset, lat) });
  return { model, size: new THREE.Vector2(1280, 800) };
};

describe('four regional journeys keep processes on the same real elevation data', () => {
  it.each(REGIONAL_JOURNEY_CITIES)('%s reads its distinct cross-section and terrain window from unchanged metre samples', city => {
    const snapshot = new Int16Array(grid), profile = sampleRegionalJourneyProfile(city, read), window = sampleRegionalJourneyWindow(city, read)!;
    expect(profile).toHaveLength(101); expect(window.cells).toHaveLength(29 * 27);
    expect(profile.every(point => point.metres === read(point.longitude, point.latitude))).toBe(true);
    expect(window.cells.every(point => point.metres === read(point.longitude, point.latitude))).toBe(true);
    expect(window.maximum - window.minimum).toBeGreaterThan(300);
    const ref = verifiedPlaceReferences[city];
    if (city === 'chamdo' || city === 'nagqu') expect(profile.every(p => p.latitude === ref.latitude)).toBe(true);
    else expect(profile.every(p => p.longitude === ref.longitude)).toBe(true);
    expect(sampleRegionalJourneyProfile(city, () => undefined)).toEqual([]);
    expect(sampleRegionalJourneyWindow(city, () => undefined)).toBeUndefined();
    expect(Array.from(grid)).toEqual(Array.from(snapshot));
  });

  it.each(REGIONAL_JOURNEY_CITIES)('%s accumulated air lift never tunnels through an earlier real ridge', city => {
    let lastHigh = -Infinity;
    for (let index = 0; index <= 20; index++) {
      const pose = regionalJourneyAirPose(city, index / 20, read)!;
      expect(pose.highestMetres).toBeGreaterThanOrEqual(pose.terrainMetres);
      expect(pose.highestMetres + .001).toBeGreaterThanOrEqual(lastHigh);
      expect(pose.gainedMetres).toBeGreaterThanOrEqual(0);
      expect(pose.terrainMetres).toBe(read(pose.longitude, pose.latitude));
      lastHigh = pose.highestMetres;
    }
    expect(regionalJourneyAirPose(city, .5, () => undefined)).toBeUndefined();
  });

  it('cue selection drives physical action; backward seeking reverses the same DEM probe with no private clock', () => {
    const { model, size } = fixture(), settings = findAction('valley');
    expect(regionalJourneyVisualState(settings).action).toBe('valley');
    model.update({ ...settings, progress: .85 }, size);
    const probe = kinds(model.group, 'regional-real-dem-probe')[0], late = probe.position.clone(), lateSample = probe.userData.sample;
    expect(lateSample.metres).toBe(read(lateSample.longitude, lateSample.latitude));
    model.update({ ...settings, progress: .15 }, size); expect(probe.position.equals(late)).toBe(false);
    model.update({ ...settings, progress: .85 }, size); expect(probe.position.equals(late)).toBe(true);
    expect(kinds(model.group, 'regional-city-reference-height')).toHaveLength(4);
    model.update({ ...settings, layer: 'atlas-cities' }, size); expect(model.group.visible).toBe(false);
    model.dispose(); disposeTree(model.group);
  });

  it('flow strictly descends actual sampled slopes; process comparison hides effects without moving terrain or source pins', () => {
    const { model, size } = fixture(), settings = findAction('water'); model.update(settings, size);
    const flows = kinds(model.group, 'regional-dem-downhill-process-not-river');
    expect(flows.length).toBeGreaterThan(0);
    for (const flow of flows) {
      const samples = flow.userData.samples as { longitude: number; latitude: number; metres: number }[];
      for (let i = 0; i < samples.length; i++) {
        expect(samples[i].metres).toBe(read(samples[i].longitude, samples[i].latitude));
        if (i) expect(samples[i].metres).toBeLessThan(samples[i - 1].metres);
      }
      expect(effectiveVisibility(flow)).toBe(true);
    }
    const land = kinds(model.group, 'regional-relative-low-gentle-reading')[0] as THREE.Mesh;
    const vertices = Array.from(land.geometry.attributes.position.array), samples = flows.map(flow => JSON.stringify(flow.userData.samples));
    model.update({ ...settings, regionalProcess: false }, size);
    expect(flows.every(flow => !effectiveVisibility(flow))).toBe(true);
    expect(Array.from(land.geometry.attributes.position.array)).toEqual(vertices);
    expect(flows.map(flow => JSON.stringify(flow.userData.samples))).toEqual(samples);
    model.update(settings, size); expect(flows.every(effectiveVisibility)).toBe(true);
    model.dispose(); disposeTree(model.group);
  });

  it('transport nodes keep exact supplied locations and never displace nearby stations to stretch a schematic link', () => {
    const { model, size } = fixture(), settings = findAction('rail'); model.update(settings, size);
    const links = kinds(model.group, 'regional-transport-relationship-not-route') as THREE.Mesh[];
    expect(links.length).toBe(1); expect(links[0].userData.scope).toContain('不提供');
    const pins = kinds(model.group, 'regional-source-place-locator').filter(pin => pin.visible);
    expect(pins.length).toBeGreaterThan(0);
    for (const pin of pins) {
      const point = pin.userData.point, cap = pin.children.find(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry)!;
      expect(cap.position.x).toBe(point.coordinates[0]); expect(cap.position.z).toBe(point.coordinates[1]);
    }
    model.update({ ...settings, regionalProcess: false }, size); expect(effectiveVisibility(links[0])).toBe(false);
    model.dispose(); disposeTree(model.group);
  });

  it('season comparison changes declared moisture and tint conditions while retaining exactly the same real terrain and lift', () => {
    const { model, size } = fixture(), settings = findAction('rain'); model.update({ ...settings, season: 1 }, size);
    const parcel = kinds(model.group, 'regional-uplift-principle-air-parcel')[0] as THREE.Mesh;
    const clouds = kinds(model.group, 'regional-condensation-principle') as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[];
    const position = parcel.position.clone(), warmClouds = clouds.map(cloud => cloud.material.opacity);
    expect(warmClouds.some(opacity => opacity > 0)).toBe(true);
    const land = kinds(model.group, 'regional-relative-low-gentle-reading')[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const vertices = Array.from(land.geometry.attributes.position.array);
    model.update({ ...settings, season: 3 }, size);
    expect(parcel.position.equals(position)).toBe(true);
    expect(Array.from(land.geometry.attributes.position.array)).toEqual(vertices);
    clouds.forEach((cloud, i) => expect(cloud.material.opacity).toBeCloseTo(warmClouds[i] * .3));
    expect(land.userData.seasonalTintIsIllustrative).toBe(true); expect(model.group.userData.state.season).toBe(3);
    model.update({ ...settings, season: 1 }, size);
    clouds.forEach((cloud, i) => expect(cloud.material.opacity).toBeCloseTo(warmClouds[i]));
    model.dispose(); disposeTree(model.group);
  });

  it.each(['along-valley', 'across-ridge'] as const)('Chamdo %s compares a distinct real-terrain axis with conservative accumulated lift', direction => {
    const reference = verifiedPlaceReferences.chamdo;
    let highest = -Infinity;
    for (let index = 0; index <= 40; index++) {
      const p = index / 40, point = regionalJourneyAirPoint('chamdo', p, direction), air = regionalJourneyAirPose('chamdo', p, read, direction)!;
      if (direction === 'along-valley') expect(point.longitude).toBe(reference.longitude);
      else expect(point.latitude).toBe(reference.latitude);
      expect(air.terrainMetres).toBe(read(point.longitude, point.latitude));
      expect(air.highestMetres).toBeGreaterThanOrEqual(air.terrainMetres);
      expect(air.highestMetres + 1e-7).toBeGreaterThanOrEqual(highest);
      highest = air.highestMetres;
      if (p < 1) expect(point).not.toEqual(regionalJourneyAirPoint('chamdo', p, direction === 'along-valley' ? 'across-ridge' : 'along-valley'));
    }
    expect(regionalJourneyAirPoint('chamdo', 1, direction)).toEqual({ longitude: reference.longitude, latitude: reference.latitude });
  });

  it('direction comparison leaves other regional trajectories unchanged', () => {
    const along = regionalJourneyAirPose('chamdo', 1, read, 'along-valley')!, across = regionalJourneyAirPose('chamdo', 1, read, 'across-ridge')!;
    expect(Math.abs(along.highestMetres - across.highestMetres)).toBeGreaterThan(1);
    for (const city of ['shigatse', 'shannan', 'nagqu'] as const) for (const p of [0, .25, .7, 1]) {
      expect(regionalJourneyAirPoint(city, p, 'along-valley')).toEqual(regionalJourneyAirPoint(city, p, 'across-ridge'));
      expect(regionalJourneyAirPose(city, p, read, 'along-valley')).toEqual(regionalJourneyAirPose(city, p, read, 'across-ridge'));
    }
  });

  it('direction control redraws a clearly hypothetical terrain-based air trace without changing word progress; seek is reversible', () => {
    const { model, size } = fixture(), journey = regionalJourneys.find(item => item.cityId === 'chamdo')!;
    const step = journey.stages.findIndex(stage => stage.cues.some(cue => cue.action === 'rain'));
    const regionalCue = journey.stages[step].cues.findIndex(cue => cue.action === 'rain');
    const settings = { layer: 'atlas-regional-journey', selected: 'city:chamdo', step, regionalCue, progress: .52 };
    model.update({ ...settings, regionalFlowDirection: 'along-valley' }, size);
    const parcel = kinds(model.group, 'regional-uplift-principle-air-parcel')[0], along = parcel.position.clone();
    const trace = kinds(model.group, 'regional-hypothetical-air-path')[0] as THREE.Mesh;
    expect(trace.userData.scope).toContain('不是实测风场'); expect(trace.userData.direction).toBe('along-valley');
    expect(effectiveVisibility(trace)).toBe(true); expect(trace.userData.samples.every((sample: { highestMetres: number; terrainMetres: number }) => sample.highestMetres >= sample.terrainMetres)).toBe(true);
    model.update({ ...settings, regionalFlowDirection: 'across-ridge' }, size);
    expect(parcel.position.equals(along)).toBe(false); expect(model.group.userData.state.progress).toBe(.52);
    const across = parcel.position.clone(), acrossTrace = kinds(model.group, 'regional-hypothetical-air-path')[0] as THREE.Mesh, count = acrossTrace.geometry.drawRange.count;
    expect(acrossTrace.userData.direction).toBe('across-ridge');
    model.update({ ...settings, progress: .15, regionalFlowDirection: 'across-ridge' }, size);
    expect(parcel.position.equals(across)).toBe(false); expect(acrossTrace.geometry.drawRange.count).toBeLessThan(count);
    model.update({ ...settings, regionalFlowDirection: 'across-ridge' }, size);
    expect(parcel.position.equals(across)).toBe(true); expect(acrossTrace.geometry.drawRange.count).toBe(count);
    model.update({ ...settings, regionalFlowDirection: 'along-valley' }, size); expect(parcel.position.equals(along)).toBe(true);
    model.dispose(); disposeTree(model.group);
  });
});
