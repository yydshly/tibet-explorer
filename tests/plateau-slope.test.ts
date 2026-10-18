import { describe, expect, it } from 'vitest';
import { plateauDownhillPath, plateauSlopePointAt } from '../src/scene/plateauClimateScene';
import { elevationDescriptors, sampleElevationMetres } from '../src/lib/elevationReading';

const meta = elevationDescriptors.regional;
const gridWith = (height: (column: number, row: number) => number) => Float64Array.from({ length: meta.columns * meta.rows }, (_, index) => height(index % meta.columns, Math.floor(index / meta.columns)));

describe('terrain-derived slope water direction', () => {
  it('keeps each step and its intermediate samples downhill on the same metre grid', () => {
    const grid = gridWith((x, y) => 600 + x * 3 + y * 2), path = plateauDownhillPath(grid, 94.2, 29.3, 20);
    expect(path.length).toBe(21);
    for (let i = 1; i < path.length; i++) {
      const first = path[i - 1], second = path[i]; expect(second.metres).toBeLessThan(first.metres);
      let prior = first.metres;
      for (let fraction = .25; fraction <= 1; fraction += .25) {
        const value = sampleElevationMetres(grid, meta, first.longitude + (second.longitude - first.longitude) * fraction, first.latitude + (second.latitude - first.latitude) * fraction);
        expect(value).toBeLessThanOrEqual(prior + 1e-8); prior = value;
      }
    }
  });

  it('stops at a local low point or a flat surface without inventing a continuing river', () => {
    const x = 220, y = 128, grid = gridWith((column, row) => (column - x) ** 2 + (row - y) ** 2);
    const longitude = meta.west + x / (meta.columns - 1) * (meta.east - meta.west), latitude = meta.north - y / (meta.rows - 1) * (meta.north - meta.south);
    expect(plateauDownhillPath(grid, longitude, latitude)).toHaveLength(1);
    expect(plateauDownhillPath(gridWith(() => 4000), 94.2, 29.3)).toHaveLength(1);
    expect(plateauDownhillPath(grid, meta.east + 1, latitude)).toEqual([]);
  });

  it('returns the same water marker after pause, reverse and replay', () => {
    const grid = gridWith((x, y) => 700 + x * 4 + y), path = plateauDownhillPath(grid, 94.2, 29.3);
    const forward = plateauSlopePointAt(path, .78);
    plateauSlopePointAt(path, .12); plateauSlopePointAt(path, 1);
    expect(plateauSlopePointAt(path, .78)).toEqual(forward);
    expect(plateauSlopePointAt(path, 0)).toEqual(path[0]);
    expect(plateauSlopePointAt(path, 1)).toEqual(path.at(-1));
    expect(plateauSlopePointAt([], .4)).toBeUndefined();
  });
});
