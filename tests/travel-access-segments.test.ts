// @ts-expect-error Node-only fixture reading; browser project has no Node ambient types.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {travelAccessSegments,travelAccessGeometry} from '../src/data/travelAccessSegments';
import {travelAccessSegmentIds,sanitizeTravelAccessBook,updateTravelAccessCheck,validTravelAccessDate,travelAccessCheckError,type TravelAccessCheck} from '../src/lib/travelAccessVerification';
import {cityAccessState} from '../src/lib/cityAccessState';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {resolveCityLocalGeography} from '../src/lib/cityLocalGeography';

const manifest=JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json','utf8'));
const segments=Object.values(travelAccessSegments).flat();
const check:TravelAccessCheck={travelDate:'2026-10-30',checkedOn:'2026-10-16',source:'本人联系接待方的有日期记录',sourceUrl:'https://example.org/dated-record',outcome:'needs-confirmation',notes:'接车地点已询问，入口仍待确认。'};

describe('real access segments keep source geometry and date boundaries',()=>{
 it('uses archived connected endpoints without filling airport or visit gaps',()=>{
  expect(segments.map(item=>item.id).sort()).toEqual([...travelAccessSegmentIds].sort());
  for(const segment of segments){
   const route=manifest.routes.find((item:{id:string})=>item.id===segment.routeId);
   expect(route,segment.id).toBeDefined();expect(route.connected).toBe(true);
   expect(segment.startSourceNode).toBe(route.sourceNodeIds[0]);
   expect(segment.endSourceNode).toBe(route.sourceNodeIds.at(-1));
   expect(route.cityId).toBe(segment.cityId);
   expect(route.gaps.length).toBeGreaterThan(0);
   expect(segment.pending.length).toBeGreaterThan(0);
   expect(segment.geometryScope.length).toBeGreaterThan(20);
   for(const source of segment.sources){expect(validTravelAccessDate(source.publishedOn)).toBe(true);expect(new URL(source.url).hostname).toMatch(/gov\.cn$/);}
  }
  expect(travelAccessGeometry.acquiredOn).toBe(manifest.acquiredAt.slice(0,10));
  const airport=manifest.routes.find((route:{id:string})=>route.id==='mainling-airport-nyingchi-s4');
  expect(airport.featureIds).not.toContain('way/388082790');
  expect(airport.gaps[0].sourceTag).toBe('access=no');
 });
 it('joins S4/G318 and Kunsha/river streets only at their common original node',()=>{
  expect(travelAccessSegments.nyingchi[0].endSourceNode).toBe(travelAccessSegments.nyingchi[1].startSourceNode);
  expect(travelAccessSegments.ngari[0].endSourceNode).toBe(travelAccessSegments.ngari[1].startSourceNode);
  expect(travelAccessSegments.lhasa[1].startSourceNode).toBe(travelAccessSegments.lhasa[0].startSourceNode);
  expect(travelAccessSegments.lhasa[1].geometryScope).toContain('目的地选择');
 });
 it('seeks existing city recordings and focuses only actual same-locality features',()=>{
  for(const segment of segments){
   const target=segment.inspect;
   expect(target.progress).toBeGreaterThanOrEqual(0);expect(target.progress).toBeLessThan(1);
   const state=target.stage==='development'?cityAccessState(target.progress):cityContinuityPartState(target.progress);
   expect(state.cityId,segment.id).toBe(segment.cityId);
   if(target.featureId){
    const locality=resolveCityLocalGeography(target.stage,target.progress)?.localityId;
    expect(locality).toBeDefined();
    const data=JSON.parse(readFileSync(`public/data/local-places/${locality}.geojson`,'utf8'));
    expect(data.features.some((feature:{id:string})=>feature.id===target.featureId),segment.id).toBe(true);
   }
  }
 });
});

describe('personal access checks are distinct from source/event verification',()=>{
 it('retains valid dated personal notes without promoting them to platform status',()=>{
  const saved=sanitizeTravelAccessBook({'mainling-nyingchi-s4':check,unknown:check});
  expect(Object.keys(saved)).toEqual(['mainling-nyingchi-s4']);
  expect(saved['mainling-nyingchi-s4'].outcome).toBe('needs-confirmation');
  expect(travelAccessCheckError(check,'2026-10-16')).toBeUndefined();
  expect(travelAccessCheckError({...check,checkedOn:'2026-10-17'},'2026-10-16')).toContain('晚于今天');
 });
 it('rejects invented dates, malformed record shapes and executable links',()=>{
  expect(validTravelAccessDate('2024-02-29')).toBe(true);
  for(const date of ['2026-02-29','2026-13-01','2026-10-161','2026-2-01'])expect(validTravelAccessDate(date)).toBe(false);
  for(const input of [null,[],true,'record'])expect(sanitizeTravelAccessBook(input)).toEqual({});
  for(const invalid of [{...check,travelDate:'2026-02-29'},{...check,checkedOn:'2026-10-16extra'},{...check,source:''},{...check,sourceUrl:'javascript:alert(1)'},{...check,sourceUrl:'file:///secret'},{...check,outcome:'verified'}])expect(sanitizeTravelAccessBook({'mainling-nyingchi-s4':invalid})).toEqual({});
  expect(sanitizeTravelAccessBook({'mainling-nyingchi-s4':{...check,sourceUrl:''}})['mainling-nyingchi-s4']).toBeDefined();
 });
 it('limits imported note lengths and preserves other places on explicit save/remove',()=>{
  const imported=sanitizeTravelAccessBook({'mainling-nyingchi-s4':{...check,source:'s'.repeat(700),notes:'n'.repeat(1000)}});
  expect(imported['mainling-nyingchi-s4'].source).toHaveLength(600);expect(imported['mainling-nyingchi-s4'].notes).toHaveLength(800);
  const second=updateTravelAccessCheck(imported,'gunsa-shiquanhe-road',{...check,outcome:'reported-unavailable'});
  expect(Object.keys(second)).toHaveLength(2);expect(imported['gunsa-shiquanhe-road']).toBeUndefined();
  expect(updateTravelAccessCheck(second,'gunsa-shiquanhe-road',undefined)).toEqual(imported);
  expect(updateTravelAccessCheck(second,'unknown',check)).toEqual(second);
 });
});
