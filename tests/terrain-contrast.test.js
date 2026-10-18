import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {elevationDescriptors, elevationPose, sampleElevationMetres} from '../src/lib/elevationReading';
import {TERRAIN_CONTRAST_LONGITUDE, selectedTerrainContrastStop, terrainContrastSettings, terrainContrastStops} from '../src/lib/terrainContrast';
import {defaultSettings} from '../src/lib/store';

const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
const meta = elevationDescriptors.regional;
const stops = terrainContrastStops(grid);

describe('同一条实际高程剖面中的低地—山地—高原对照', () => {
  it('三处高度由发布网格读取，山地高点从限定纬度范围查找而非假定山峰', () => {
    expect(stops.map(stop => stop.id)).toEqual(['lowland', 'mountain', 'interior']);
    expect(stops[0].latitude).toBe(26);
    expect(stops[2].latitude).toBe(33);
    expect(stops[1].latitude).toBeGreaterThanOrEqual(27);
    expect(stops[1].latitude).toBeLessThanOrEqual(29);
    for (const stop of stops) expect(stop.metres).toBe(sampleElevationMetres(grid, meta, TERRAIN_CONTRAST_LONGITUDE, stop.latitude));
    for (let latitude = 27; latitude <= 29; latitude += .001) expect(sampleElevationMetres(grid, meta, 89, latitude)).toBeLessThanOrEqual(stops[1].metres + .001);
    expect(stops[0].metres).toBeLessThan(500);
    expect(stops[2].metres).toBeGreaterThan(4000);
    expect(stops[1].metres).toBeGreaterThan(stops[2].metres);
  });

  it('每个按钮的状态补丁会把现有 G4 读点移动到对应经纬，切换过程保留同一剖面', () => {
    for (const stop of stops) {
      const settings = {...defaultSettings(), ...terrainContrastSettings(stop)};
      const pose = elevationPose('G4', settings);
      expect(pose.profile).toBe(true);
      expect(pose.longitude).toBe(89);
      expect(pose.latitude).toBeCloseTo(stop.latitude, 10);
      expect(settings.cutaway).toBe(false);
      expect(settings.selected).toBe('');
      expect(selectedTerrainContrastStop(stops, settings)?.id).toBe(stop.id);
      expect(sampleElevationMetres(grid, meta, pose.longitude, pose.latitude)).toBeCloseTo(stop.metres, 8);
    }
  });

  it('手动移出参考经纬后不继续宣称正在读取某个对照点；坏网格不补数字', () => {
    const settings = {...defaultSettings(), ...terrainContrastSettings(stops[0])};
    expect(selectedTerrainContrastStop(stops, {...settings, progress: .6})).toBeUndefined();
    expect(selectedTerrainContrastStop(stops, {...settings, readingFraction: .6})).toBeUndefined();
    expect(selectedTerrainContrastStop(stops, {...settings, layer: 'terrain'})).toBeUndefined();
    expect(() => terrainContrastStops([100, 100])).toThrow();
  });
});
