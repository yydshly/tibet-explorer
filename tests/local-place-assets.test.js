import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL(`../public/${path}`, import.meta.url));
const json = path => JSON.parse(read(path));
const geography = json('data/local-places/manifest.json');
const terrain = json('assets/terrain/local-places/manifest.json');

describe('archived local places and matching elevation coverage', () => {
  for (const place of terrain.places) {
    it(`${place.id} ships the complete height grid described by its source record`, () => {
      const bytes = read(place.dataUrl.replace(/^\//, ''));
      expect(bytes.length).toBe(place.columns * place.rows * 2);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(place.sha256);
      const values = Array.from({ length: place.columns * place.rows }, (_, index) => bytes.readInt16LE(index * 2));
      expect(Math.min(...values)).toBe(place.minimum);
      expect(Math.max(...values)).toBe(place.maximum);
      expect(place.minimum).toBeGreaterThan(3000);
      expect(place.maximum).toBeLessThan(6000);
      expect(place.tiles.length).toBeGreaterThan(0);
      expect(place.tiles.every(tile => tile.url.startsWith('https://elevation-tiles-prod.s3.amazonaws.com/terrarium/'))).toBe(true);
    });

    it(`${place.id} has a matching real map window and traceable feature identities`, () => {
      const source = geography.places.find(item => item.id === place.id);
      expect(source.bbox).toEqual(place.bbox);
      expect(source.license).toBe('ODbL-1.0');
      const collection = json(`data/local-places/${source.file}`);
      expect(collection.type).toBe('FeatureCollection');
      expect(new Set(collection.features.map(feature => feature.id)).size).toBe(collection.features.length);
      expect(collection.features.every(feature => /^(node|way|relation)\/\d+$/.test(feature.id)
        && feature.properties.osm_url === `https://www.openstreetmap.org/${feature.id}`
        && Number.isInteger(feature.properties.osm_version)
        && Number.isFinite(Date.parse(feature.properties.osm_timestamp)))).toBe(true);
      const counts = collection.features.reduce((result, feature) => {
        const kind = feature.properties.featureClass;
        result[kind] = (result[kind] ?? 0) + 1;
        return result;
      }, {});
      expect(counts).toEqual(source.featureCounts);
      // Complete ways may extend past the map request. The renderer must clip
      // to these bounds rather than stretching the local DEM to their extent.
      expect(source.geometryScope).toContain('Whole source ways retained');
      expect(source.missingCoverage.length).toBeGreaterThan(0);
    });
  }
});
