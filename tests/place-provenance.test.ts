import {describe, expect, it} from 'vitest';
import records from '../public/assets/atlas-place-references.json';
import {atlasHotspots} from '../src/data/atlas';
import {atlasReferenceByHotspot, atlasVerifiedReference, verifiedPlaceReferences} from '../src/data/placeProvenance';
import {regionalAnchors} from '../src/data/regionalStudy';

describe('地点数据不能由效果图反推', () => {
  it('每个地图入口有可追溯参照，参照坐标与原始记录完全一致', () => {
    expect(Object.keys(atlasReferenceByHotspot).sort()).toEqual(atlasHotspots.map(point => point.id).sort());
    for (const point of atlasHotspots) {
      const reference = atlasVerifiedReference(point.id)!;
      expect(reference).toBeDefined();
      expect([point.longitude, point.latitude]).toEqual([reference.longitude, reference.latitude]);
      expect(point.locatorName).toBe(reference.name);
      expect(point.mapLabel).toBe(atlasReferenceByHotspot[point.id].mapLabel);
      expect(point.coordinateSourceUrl).toBe(reference.sourceUrl);
      expect(point.locationNote).toContain(reference.scope);
      if (reference.sourceId === 'natural-earth-populated-places') {
        const source = records.naturalEarth.find(record => String(record.properties.ne_id) === reference.featureId)!;
        expect([reference.longitude, reference.latitude]).toEqual(source.geometry.coordinates);
      } else if (reference.sourceId === 'geonames-cn') {
        const source = records.geoNames.find(record => record.geonameId === reference.featureId)!;
        const fields = source.originalTsv.split('\t');
        expect(reference.longitude).toBe(Number(fields[5]));
        expect(reference.latitude).toBe(Number(fields[4]));
        expect(source.featureClass).toBe('P');
      } else {
        const source = records.publishedResearchLocations.find(record => record.doi === reference.featureId)!;
        expect([reference.longitude, reference.latitude]).toEqual([source.longitude, source.latitude]);
        expect(reference.displayDecimalPlaces).toBe(source.decimalPlacesInSource);
      }
    }
  });

  it('七个地区与主地图读取相同的已归档参考点，不从作者画面取点', () => {
    expect(regionalAnchors).toHaveLength(7);
    for (const point of regionalAnchors) {
      const reference = verifiedPlaceReferences[point.id];
      expect([point.longitude, point.latitude]).toEqual([reference.longitude, reference.latitude]);
      expect(point.coordinateSourceUrl).toBe(reference.sourceUrl);
    }
    for (const id of ['lhasa-stele', 'lhasa-railway', 'lhasa-buildings']) {
      const point = atlasHotspots.find(hotspot => hotspot.id === id)!;
      expect(point.locatorName).toBe('拉萨城区参考');
      expect(point.locatorKind).toBe('settlement-reference');
      expect(point.mapLabel).toContain('材料');
    }
  });

  it('不把Natural Earth的旧Gar记录当作狮泉河，也不混用林芝/昌都旧属性坐标', () => {
    const oldGar = records.naturalEarth.find(record => record.properties.name === 'Gar')!;
    expect([verifiedPlaceReferences.ngari.longitude, verifiedPlaceReferences.ngari.latitude]).not.toEqual(oldGar.geometry.coordinates);
    for (const id of ['nyingchi', 'chamdo']) {
      const reference = verifiedPlaceReferences[id];
      const raw = records.naturalEarth.find(record => String(record.properties.ne_id) === reference.featureId)!;
      expect([reference.longitude, reference.latitude]).toEqual(raw.geometry.coordinates);
      expect(raw.geometry.coordinates).not.toEqual([raw.properties.longitude, raw.properties.latitude]);
    }
  });

  it('城市参照和研究约位保持不同身份，不补足不存在的精度', () => {
    expect(verifiedPlaceReferences['nwya-devu'].kind).toBe('published-approximate-location');
    expect(verifiedPlaceReferences['nwya-devu'].displayDecimalPlaces).toBe(1);
    for (const reference of Object.values(verifiedPlaceReferences).filter(item => item.id !== 'nwya-devu')) {
      expect(reference.kind).toBe('settlement-reference');
      expect(reference.scope).not.toContain('精确遗址坐标');
      expect(reference.sourceUrl).toMatch(/^https:/);
    }
  });
});
