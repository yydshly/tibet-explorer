import * as THREE from 'three';
import { regionalTerrainMeta } from '../data/terrainMetadata';

/** Read the exact triangles drawn from the archived metre grid. Bilinear
 * sampling can sit above a saddle-shaped mesh cell, so moving road symbols
 * must use this surface interpolation rather than float between its corners. */
export function sampleRegionalSurfaceMetres(grid: ArrayLike<number>, longitude: number, latitude: number) {
  const b = regionalTerrainMeta;
  if (grid.length !== b.columns * b.rows || longitude < b.west || longitude > b.east || latitude < b.south || latitude > b.north) return undefined;
  const x = (longitude - b.west) / (b.east - b.west) * (b.columns - 1), y = (b.north - latitude) / (b.north - b.south) * (b.rows - 1);
  const ix = Math.min(b.columns - 2, Math.floor(x)), iy = Math.min(b.rows - 2, Math.floor(y)), fx = x - ix, fy = y - iy;
  const a = grid[iy * b.columns + ix], d = grid[iy * b.columns + ix + 1], c = grid[(iy + 1) * b.columns + ix + 1], lower = grid[(iy + 1) * b.columns + ix];
  return fx + fy <= 1 ? a + (d - a) * fx + (lower - a) * fy : c + (lower - c) * (1 - fx) + (d - c) * (1 - fy);
}

/** Shared cartographic height colours make the same real DEM readable at a
 * street/corridor camera distance where the global NASA raster is subpixel. */
const stops = [[0, 0x687d6b], [2800, 0x748774], [4000, 0x999a78], [4500, 0xafa48a], [5500, 0xc4ba9f], [8000, 0xe2dfca]] as const;
// Decode sRGB stops once, rather than performing six colour-space conversions
// and allocating two Color objects for every DEM vertex on every relief change.
const stopColours=stops.map(([,hex])=>new THREE.Color(hex));
export function regionalTerrainColour(metres: number, result = new THREE.Color()) {
  let index = 1;
  while (index < stops.length - 1 && metres > stops[index][0]) index++;
  const a = stops[index - 1], b = stops[index];
  // Cartographic surfaces share the scene's bright ambient lighting and ACES
  // exposure. Reserve headroom so real slope normals and height colours remain
  // readable instead of saturating the whole airport corridor to cream white.
  return result.copy(stopColours[index-1]).lerp(stopColours[index], THREE.MathUtils.clamp((metres - a[0]) / (b[0] - a[0]), 0, 1)).multiplyScalar(.55);
}
