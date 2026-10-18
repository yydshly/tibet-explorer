import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {buildCityBuiltSurface,builtSurfaceCell} from '../src/scene/cityBuiltSurface';
import data from '../public/assets/terrain/city-built-2021.json';
import provenance from '../public/assets/terrain/city-built-2021.source.json';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';

describe('2021建成地表来自原分类窗口与比例汇总', () => {
  it('观测格沿真实经纬方向贴地，保持原比例透明度，离开三城比较即隐藏',async()=>{
    vi.stubGlobal('fetch',async()=>({ok:true,json:async()=>data}));
    let terrainHeight=3;
    const model=buildCityBuiltSurface((lon,lat,offset=0)=>new THREE.Vector3(lon,terrainHeight+offset,-lat));
    try{
      await model.ready;
      const settings={layer:'atlas-city-comparison',step:2,cityLifeFocus:'settlement',progress:1,selected:'city:nyingchi',comparisonRelief:true,cityBuiltLayer:true};
      model.update(settings);
      expect(model.group.visible).toBe(true);
      const mesh=model.group.getObjectByName('observed-built-nyingchi');
      const first=data.cities[0].builtFractions.findIndex(value=>value>0),cell=builtSurfaceCell(data.cities[0],first);
      expect(mesh.geometry.attributes.position.getX(0)).toBeCloseTo(cell.west,4);
      expect(mesh.geometry.attributes.position.getZ(0)).toBeCloseTo(-cell.north,4);
      expect(mesh.geometry.attributes.color.getW(0)).toBeCloseTo(cell.fraction,6);
      terrainHeight=0;model.update({...settings,comparisonRelief:false});
      expect(model.group.getObjectByName('observed-built-nyingchi').geometry.attributes.position.getY(0)).toBeCloseTo(.085,5);
      model.update({...settings,cityBuiltLayer:false});expect(model.group.visible).toBe(false);
      model.update({...settings,layer:'atlas-city-life'});expect(model.group.visible).toBe(false);
    }finally{model.dispose();vi.unstubAllGlobals();}
  });
  it('三个窗口与核实聚居地及地图行列方向一致，不充当城市边界', () => {
    expect(data.year).toBe(2021);
    expect(data.product).toBe('ESA WorldCover v200');
    expect(data.classValue).toBe(50);
    expect(data.rowOrder).toBe('north-to-south');
    expect(data.columnOrder).toBe('west-to-east');
    expect(data.cities.map(city => city.id)).toEqual(['nyingchi', 'lhasa', 'ngari']);
    for (const city of data.cities) {
      const reference = verifiedPlaceReferences[city.id];
      const source = provenance.sourceWindows.find(window => window.reference.id === city.id);
      expect(source.bounds).toEqual(city.bounds);
      expect(source.reference.longitude).toBe(reference.longitude);
      expect(source.reference.latitude).toBe(reference.latitude);
      expect(reference.longitude).toBeGreaterThan(city.bounds.west);
      expect(reference.longitude).toBeLessThan(city.bounds.east);
      expect(reference.latitude).toBeGreaterThan(city.bounds.south);
      expect(reference.latitude).toBeLessThan(city.bounds.north);
      expect(city.bounds.east - city.bounds.west).toBeCloseTo(city.columns * data.cellSizeDegrees, 8);
      expect(city.bounds.north - city.bounds.south).toBeCloseTo(city.rows * data.cellSizeDegrees, 8);
      expect(source.sourceWindowTransform[2]).toBeCloseTo(city.bounds.west, 8);
      expect(source.sourceWindowTransform[5]).toBeCloseTo(city.bounds.north, 8);
      expect(source.sourceWindowTransform[4]).toBeLessThan(0);
      expect(city.builtFractions).toHaveLength(city.columns * city.rows);
    }
    expect(provenance.scope).toMatch(/not today's built extent, city boundary, building footprint\/height/);
    expect(provenance.applicationScope).toMatch(/does not cover Lulang.*2021 observation-year/);
  });

  it('按像元比例守恒，不把一个建成像元膨胀为整个格子', () => {
    for (const city of data.cities) {
      const source = provenance.sourceWindows.find(window => window.reference.id === city.id);
      const pixelsPerCell = source.aggregationBlockPixels.reduce((a, b) => a * b, 1);
      expect(city.builtFractions.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
      expect(city.builtFractions.filter(value => value > 0 && value < 1).length).toBe(source.nonBinaryFractionCells);
      expect(source.nonBinaryFractionCells).toBeGreaterThan(0);
      expect(city.builtFractions.filter(value => value > 0).length).toBe(source.builtCellsPositive);
      const rebuiltCount = city.builtFractions.reduce((sum, value) => sum + value, 0) * pixelsPerCell;
      // JSON rounds each fraction to six decimals. The only allowed discrepancy is that rounding.
      expect(Math.abs(rebuiltCount - source.sourceBuiltPixels)).toBeLessThanOrEqual(
        city.builtFractions.length * .0000005 * pixelsPerCell + 1e-6,
      );
      expect(source.sourceNativeClasses).not.toContain(0);
    }
  });

  it('记录官方瓦片、实际小窗口和原像元校验，不把缩略图或概念着色充作分类', () => {
    expect(provenance.license).toBe('CC BY 4.0');
    expect(data.attribution).toBe(provenance.attribution);
    expect(provenance.sourceUrl).toBe('https://esa-worldcover.org/en/data-access');
    for (const city of data.cities) {
      const source = provenance.sourceWindows.find(window => window.reference.id === city.id);
      expect(city.sourceTiles).toEqual([source.url]);
      expect(source.url).toMatch(/^https:\/\/esa-worldcover\.s3\.eu-central-1\.amazonaws\.com\/v200\/2021\/map\/ESA_WorldCover_10m_2021_v200_N\d+E\d+_Map\.tif$/);
      expect(source.httpRangeStatus).toBe(206);
      expect(source.httpContentRange).toMatch(/^bytes 0-15\//);
      expect(source.windowPixelSha256).toMatch(/^[a-f0-9]{64}$/);
      const totalTilePixels = source.sourceDimensions[0] * source.sourceDimensions[1];
      expect(source.sourcePixelsRead / totalTilePixels).toBeLessThan(.03);
      expect(source.sourceWindowPixels[2] * source.sourceWindowPixels[3]).toBe(source.sourcePixelsRead);
    }
    const payload = readFileSync(new URL('../public/assets/terrain/city-built-2021.json', import.meta.url));
    expect(createHash('sha256').update(payload).digest('hex')).toBe(provenance.outputSha256);
  });
});
