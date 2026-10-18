import { describe, expect, it } from 'vitest';
import { foundationCellPoint, sunlightIntersection } from '../src/scene/earthFoundations';

describe('globe foundation geometry', () => {
  it('intersects both equally wide light bundles with the same spherical surface', () => {
    for (const latitude of [0, 60]) for (const offset of [-.23, 0, .23]) {
      const point = sunlightIntersection(latitude, offset, .23);
      expect(point.length()).toBeCloseTo(3.65, 8);
      expect(point.y).toBeCloseTo(3.65 * Math.sin(latitude * Math.PI / 180) + offset, 8);
    }
  });

  it('spreads the same incoming cross section across a larger high-latitude footprint', () => {
    const arc = (latitude: number) => sunlightIntersection(latitude, -.23, 0).angleTo(sunlightIntersection(latitude, .23, 0)) * 3.65;
    expect(arc(60) / arc(0)).toBeGreaterThan(1.9);
    expect(arc(60) / arc(0)).toBeLessThan(2.2);
  });

  it('separates ascent, upper transport, descent and return in the mean-cell diagram', () => {
    const points = [0, .25, .5, .75, 1].map(progress => foundationCellPoint('hadley', 1, progress));
    expect(points[1].length()).toBeGreaterThan(points[0].length());
    expect(points[2].length()).toBeCloseTo(points[1].length(), 8);
    expect(points[2].y).toBeGreaterThan(points[1].y);
    expect(points[3].length()).toBeLessThan(points[2].length());
    expect(points[4].distanceTo(points[0])).toBeLessThan(1e-8);
  });

  it('keeps all mean cells continuous, above the surface and deterministic when revisited', () => {
    for (const cell of ['hadley', 'ferrel', 'polar'] as const) for (const hemisphere of [1, -1] as const) {
      for (const boundary of [.25, .5, .75]) expect(foundationCellPoint(cell, hemisphere, boundary - 1e-7).distanceTo(foundationCellPoint(cell, hemisphere, boundary + 1e-7))).toBeLessThan(.0001);
      for (const progress of [0, .12, .36, .61, .89, 1]) {
        const before = foundationCellPoint(cell, hemisphere, progress);
        foundationCellPoint(cell, hemisphere, 1 - progress);
        expect(foundationCellPoint(cell, hemisphere, progress).toArray()).toEqual(before.toArray());
        expect(before.length()).toBeGreaterThan(3.65);
      }
    }
  });

  it('mirrors the latitude and keeps the corresponding north/south circulation height', () => {
    for (const cell of ['hadley', 'ferrel', 'polar'] as const) for (const progress of [.1, .4, .6, .9]) {
      const north = foundationCellPoint(cell, 1, progress), south = foundationCellPoint(cell, -1, progress);
      expect(north.y).toBeCloseTo(-south.y, 8);
      expect(north.length()).toBeCloseTo(south.length(), 8);
    }
  });
});
