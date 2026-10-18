import {elevationDescriptors, sampleElevationMetres} from './elevationReading';
import type {ElevationDescriptor} from './elevationReading';
import type {SceneSettings} from './store';

export const TERRAIN_CONTRAST_LONGITUDE = 89;
export type TerrainContrastStop = {
  id: 'lowland' | 'mountain' | 'interior';
  title: string;
  latitude: number;
  metres: number;
};

/** A shared meridian, not a travel route or a survey of any summit. */
export function terrainContrastStops(grid: ArrayLike<number>, meta: ElevationDescriptor = elevationDescriptors.regional): TerrainContrastStop[] {
  // Bilinear sampling is piecewise linear along a fixed longitude. Its maximum
  // within this interval therefore lies on a grid row or interval boundary.
  const candidates = [27, 29];
  for (let row = 0; row < meta.rows; row++) {
    const latitude = meta.north - row / (meta.rows - 1) * (meta.north - meta.south);
    if (latitude > 27 && latitude < 29) candidates.push(latitude);
  }
  const read = (latitude: number) => sampleElevationMetres(grid, meta, TERRAIN_CONTRAST_LONGITUDE, latitude);
  const mountainLatitude = candidates.reduce((best, latitude) => read(latitude) > read(best) ? latitude : best);
  return [
    {id: 'lowland', title: '山前低地', latitude: 26, metres: read(26)},
    {id: 'mountain', title: '山地高点', latitude: mountainLatitude, metres: read(mountainLatitude)},
    {id: 'interior', title: '高原内部', latitude: 33, metres: read(33)},
  ];
}

export function terrainContrastSettings(stop: TerrainContrastStop): Partial<SceneSettings> {
  const meta = elevationDescriptors.regional;
  return {
    layer: 'relief', progress: (TERRAIN_CONTRAST_LONGITUDE - 80) / 18,
    readingFraction: (stop.latitude - meta.south) / (meta.north - meta.south),
    selected: '', cutaway: false,
  };
}

export function selectedTerrainContrastStop(stops: TerrainContrastStop[], settings: SceneSettings) {
  if (settings.layer !== 'relief' || Math.abs(settings.progress - .5) > .0001) return undefined;
  const meta = elevationDescriptors.regional;
  const latitude = meta.south + (settings.readingFraction ?? .5) * (meta.north - meta.south);
  return stops.find(stop => Math.abs(stop.latitude - latitude) < .005);
}

export const formatTerrainMetres = (metres: number) => (Math.round(metres / 50) * 50).toLocaleString('zh-CN');
