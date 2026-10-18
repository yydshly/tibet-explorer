import { describe, expect, it } from 'vitest';
// @ts-expect-error Node-only source fixtures run in Vitest; app types exclude Node.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { routeArcLengths, routeLegFraction, routeSampleSegment } from '../src/scene/routeArcLength';
import { localDisplayMetres, LOCAL_MAP_VERTICAL_EXAGGERATION, type LocalDEM } from '../src/scene/cityLocalMap';
import { storyAtlasPosition, STORY_ATLAS_META } from '../src/scene/storyAtlas';
import { sampleRegionalSurfaceMetres } from '../src/scene/regionalTerrainSurface';
import { regionalTerrainMeta } from '../src/data/terrainMetadata';

type SourceRoute = { id: string; localityId?: string; cityId?: string; coordinates: [number, number][] };
const routes = JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json', 'utf8')).routes as SourceRoute[];
const first = routes.find(route => route.id === 'mainling-airport-nyingchi-s4')!;
const second = routes.find(route => route.id === 'nyingchi-lulang-g318')!;
const linked = { id: 'mainling-s4-to-lulang-g318', localityId: 'lulang', coordinates: [...first.coordinates, ...second.coordinates.slice(1)] };
const localDEMs = JSON.parse(readFileSync('public/assets/terrain/local-places/manifest.json', 'utf8')).places as LocalDEM[];
const readGrid = (url: string) => { const bytes = readFileSync(`public${url}`); return Int16Array.from({ length: bytes.length / 2 }, (_, i) => bytes.readInt16LE(i * 2)); };
const regional = readGrid(regionalTerrainMeta.dataUrl);
const localGrids = new Map(localDEMs.map(meta => [meta.id, readGrid(meta.dataUrl)]));
const unit = (STORY_ATLAS_META.east - STORY_ATLAS_META.west) * 111320 * Math.cos(29.5 * Math.PI / 180) / STORY_ATLAS_META.width;
function sourcePoints(route: SourceRoute) {
  const id = route.localityId ?? (route.cityId === 'ngari' ? 'shiquanhe' : 'lulang');
  const meta = localDEMs.find(meta => meta.id === id)!;
  return route.coordinates.map(([lon, lat]) => {
    const metres = localDisplayMetres(localGrids.get(meta.id)!, meta, lon, lat, (x, y) => sampleRegionalSurfaceMetres(regional, x, y)) ?? meta.minimum;
    return storyAtlasPosition(lon, lat, (metres * LOCAL_MAP_VERTICAL_EXAGGERATION + 14) / unit);
  });
}
function oldSegment(points: THREE.Vector3[], progress: number) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
  const distance = lengths.at(-1)! * THREE.MathUtils.clamp(progress, 0, 1);
  const index = Math.max(1, lengths.findIndex(length => length >= distance));
  return { index, fraction: (distance - lengths[index - 1]) / Math.max(1e-12, lengths[index] - lengths[index - 1]) };
}
function pose(points: THREE.Vector3[], sample: { index: number; fraction: number }) {
  if (points.length < 2) return { point: points[0]?.clone() ?? new THREE.Vector3(), direction: new THREE.Vector3(1, 0, 0) };
  return { point: points[sample.index - 1].clone().lerp(points[sample.index], sample.fraction), direction: points[sample.index].clone().sub(points[sample.index - 1]).normalize() };
}

describe('immutable source-route arc lengths', () => {
  it.each([...routes, linked])('preserves actual DEM-attached sample positions, headings and reversible boundaries: $id', route => {
    const points = sourcePoints(route), before = points.map(point => point.toArray());
    const { cumulative, total } = routeArcLengths(points);
    const boundaries = [1, Math.floor(points.length / 2), points.length - 1].map(index => cumulative[index] / total);
    const progressValues = [0, .001, .37, .95, 1, .76, .2, -.4, 1.8, ...boundaries, ...boundaries.map(value => value - 1e-12), ...boundaries.map(value => value + 1e-12)];
    for (const progress of progressValues) {
      const actual = routeSampleSegment(points, progress), expected = oldSegment(points, progress);
      expect(actual).toEqual(expected);
      expect(pose(points, actual)).toEqual(pose(points, expected));
    }
    expect(points.map(point => point.toArray())).toEqual(before);
  });

  it.each([
    { name: 'empty', route: [] }, { name: 'one point', route: [new THREE.Vector3(1, 2, 3)] },
    { name: 'coincident', route: [new THREE.Vector3(1, 2, 3), new THREE.Vector3(1, 2, 3)] },
    { name: 'repeated boundaries', route: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(2, 0, 0), new THREE.Vector3(2, 0, 0), new THREE.Vector3(2, 3, 0)] },
  ])('preserves $name routes', ({ route }) => {
    expect(routeArcLengths(route).total).toBeGreaterThanOrEqual(0);
    for (const progress of [0, 1, .4, .9, .1, -.2, 1.5, -Infinity, Infinity]) {
      const actual = routeSampleSegment(route, progress);
      const expected = route.length < 2 ? { index: 0, fraction: 0 } : oldSegment(route, progress);
      expect(actual).toEqual(expected);
      expect(pose(route, actual)).toEqual(pose(route, expected));
    }
  });

  it('shares a numeric-only measurement by route-array identity and drops no new strong route reference into its value', () => {
    const points = [new THREE.Vector3(), new THREE.Vector3(1, 2, 3)];
    const original = routeArcLengths(points);
    expect(routeArcLengths(points)).toBe(original);
    expect(routeArcLengths(points.slice())).not.toBe(original);
    expect(Object.keys(original).sort()).toEqual(['cumulative', 'total']);
    expect(original.cumulative).toBeInstanceOf(Float64Array);
    expect([...original.cumulative]).toEqual([0, Math.sqrt(14)]);
    const replacement = points.map(point => point.clone()); replacement[1].y += 1;
    expect(routeArcLengths(replacement).total).not.toBe(original.total);
    expect(original.total).toBe(Math.sqrt(14));
  });

  it('does not reread unchanged source coordinates during repeated paused, forward and reverse sampling', () => {
    let reads = 0;
    const points = Array.from({ length: 200 }, (_, i) => ({ get x() { reads++; return i; }, get y() { reads++; return i % 7; }, get z() { reads++; return i % 11; } }));
    routeArcLengths(points); const afterPreparation = reads;
    for (const progress of [0, .2, .2, .9, .1, 1, .5, 0]) { routeSampleSegment(points, progress); routeLegFraction(points, 40); }
    expect(afterPreparation).toBeGreaterThan(0);
    expect(reads).toBe(afterPreparation);
  });

  it('retains the exact real S4/G318 leg handover fraction and does not round or simplify the source route', () => {
    const points = sourcePoints(linked), leg = first.coordinates.length - 1;
    let total = 0, firstLeg = 0;
    for (let i = 1; i < points.length; i++) { const length = points[i].distanceTo(points[i - 1]); total += length; if (i <= leg) firstLeg += length; }
    expect(points).toHaveLength(1682);
    expect(leg).toBe(535);
    expect(routeLegFraction(points, leg)).toBe(firstLeg / Math.max(total, 1e-12));
    expect(routeLegFraction([], leg)).toBe(0);
    expect(routeLegFraction([new THREE.Vector3()], leg)).toBe(0);
    expect(routeLegFraction(points, -1)).toBe(0);
    expect(routeLegFraction(points, points.length + 1)).toBe(1);
  });
});
