// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node is test-only.
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import data from '../src/data/region-comparison.json';
import {sampleRegionalSurfaceMetres} from '../src/scene/regionalTerrainSurface';
import {verifiedPlaceReferences} from '../src/data/placeProvenance';
import {regionComparisonState} from '../src/lib/regionComparison';

describe('same-scale regional evidence',()=>{
 it('uses the archived metre grid and actual locality references, with equal transect lengths',()=>{
  const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(data.demSha256);
  const grid=Array.from({length:449*257},(_,i)=>bytes.readInt16LE(i*2));
  expect(data.places).toHaveLength(7);expect(data.axisMetres).toEqual([0,8000]);
  for(const p of data.places){
   expect(p.longitude).toBe(verifiedPlaceReferences[p.id].longitude);expect(p.latitude).toBe(verifiedPlaceReferences[p.id].latitude);
   expect(p.points).toHaveLength(21);
   for(const [i,s] of p.points.entries()){
    expect(s.km).toBe(-50+i*5);expect(s.latitude).toBe(p.latitude);
    expect((s.longitude-p.longitude)*111.32*Math.cos(p.latitude*Math.PI/180)).toBeCloseTo(s.km,7);
    expect(s.metres).toBeCloseTo(sampleRegionalSurfaceMetres(grid,s.longitude,s.latitude)!,2);
   }
  }
 });
 it('returns all seven regions to the same map without adding a route or inferred statistics',()=>{
  expect(regionComparisonState('nagqu')).toMatchObject({compareFocus:'nagqu',cities:['nagqu'],kind:'regions'});
  expect(regionComparisonState().compareFocus).toBeUndefined();expect(regionComparisonState().cities).toHaveLength(7);
 });
});
