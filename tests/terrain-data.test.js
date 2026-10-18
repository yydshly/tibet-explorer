import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sampleTerrainMetres, terrainProfileLongitude, TERRAIN_READING_META } from '../src/scene/terrainReading';

const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
const source = JSON.parse(readFileSync('public/assets/terrain/tibet-regional-dem.source.json', 'utf8'));

describe('实际地形数据的尺度与方向', () => {
  it('发布网格与源记录校验一致，单位为米并保留署名和处理限制', () => {
    expect(bytes.length).toBe(TERRAIN_READING_META.columns * TERRAIN_READING_META.rows * 2);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(source.grid.sha256);
    expect(source.grid.unit).toContain('metres');
    expect(source.sourceAttribution).toContain('Geological Survey');
    expect(source.processing.verticalExaggeration).toBe(TERRAIN_READING_META.verticalExaggeration);
    expect(source.tiles.length).toBe(54);
  });
  it('经纬采样从北向南、从西向东，不能把地区网格翻转', () => {
    const { west, east, south, north, columns } = TERRAIN_READING_META;
    expect(sampleTerrainMetres(grid, west, north)).toBe(grid[0]);
    expect(sampleTerrainMetres(grid, east, north)).toBe(grid[columns - 1]);
    expect(sampleTerrainMetres(grid, east, south)).toBe(grid[grid.length - 1]);
    expect(sampleTerrainMetres(grid, west, south)).toBe(grid[grid.length - columns]);
    expect(terrainProfileLongitude(0)).toBe(80);
    expect(terrainProfileLongitude(1)).toBe(98);
  });
  it('地区定位从同一高程网格读取，而非使用程序生成的山峰或峰顶高度', () => {
    expect(sampleTerrainMetres(grid, 88.2, 33.7)).toBeGreaterThan(4500);
    expect(sampleTerrainMetres(grid, 91.75, 29.27)).toBeGreaterThan(3000);
    expect(sampleTerrainMetres(grid, 91.75, 29.27)).toBeLessThan(4200);
    expect(sampleTerrainMetres(grid, 95.4, 29.4)).toBeLessThan(3000);
  });
});
