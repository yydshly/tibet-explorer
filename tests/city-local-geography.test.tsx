import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {cityLocalObservationFeatureId,cityLocalObservationNote,cityLocalObservationPoints,resolveCityLocalGeography,type CityLocalityId} from '../src/lib/cityLocalGeography';
import {cityAccessPhaseProgress} from '../src/lib/cityAccessState';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';
import {captureCityTravelReview} from '../src/lib/cityTravelReview';
import {validateCityComparisonPosition} from '../src/hooks/useCityComparisonDirector';
import {appendCityContinuityTravel,appendCityContinuityTravelQuestion,cityContinuityTravelQuestions,cityTravelObservationNote} from '../src/lib/cityContinuityTravel';
import {cityTravelQuestionInPlan} from '../src/components/CityContinuityTravelActions';
import CityLocalContext from '../src/components/CityLocalContext';
import {emptyExploration,parseExploration} from '../src/lib/store';

const local=(id:CityLocalityId)=>JSON.parse(readFileSync(new URL(`../public/data/local-places/${id}.geojson`,import.meta.url),'utf8'));
const points=(id:CityLocalityId,stop:string)=>cityLocalObservationPoints(local(id),stop);

describe('真实地方窗口与历史材料分别定位',()=>{
 it('鲁朗观察同时覆盖河流、通道和实际服务地物，并保留酒店用地的原始分类',()=>{
  const choices=points('lulang','nyingchi-lulang');
  expect(choices.map(point=>point.featureId)).toEqual(['way/26406905','way/49209937','way/1322496961','way/1322390955']);
  expect(choices.find(point=>point.featureId==='way/1322496961')?.featureClass).toBe('landuse');
 });
 it('只给实际取得的地点展开局部，公共课堂与托林不借用邻城地图',()=>{
  expect(resolveCityLocalGeography('history',cityContinuityPartProgress('nyingchi',2))).toMatchObject({localityId:'lulang',referenceId:'lulang',eventTime:'2016'});
  expect(resolveCityLocalGeography('history',cityContinuityPartProgress('nyingchi',1))).toMatchObject({localityId:undefined,referenceId:'nyingchi'});
  expect(resolveCityLocalGeography('history',cityContinuityPartProgress('ngari',1))).toMatchObject({localityId:undefined,referenceId:'tholing'});
  expect(resolveCityLocalGeography('history',cityContinuityPartProgress('ngari',2))).toMatchObject({localityId:'shiquanhe',referenceId:'ngari'});
  expect(resolveCityLocalGeography('climate',0)).toBeUndefined();
 });
 it('拉萨客站/柳梧桥有真实局部，西货场第四环不送进客运站街区',()=>{
  expect(resolveCityLocalGeography('development',cityAccessPhaseProgress('lhasa','transfer'))).toMatchObject({localityId:'lhasa',eventTime:'2007年4月柳梧大桥'});
  const freight=resolveCityLocalGeography('development',cityAccessPhaseProgress('lhasa','life'))!;
  expect(freight.localityId).toBeUndefined();expect(freight.placeName).toContain('拉萨西货场');
  expect(freight.scope).toContain('不同位置');
  expect(resolveCityLocalGeography('development',cityAccessPhaseProgress('nyingchi','life'))?.localityId).toBeUndefined();
  expect(resolveCityLocalGeography('development',cityAccessPhaseProgress('ngari','access'))?.localityId).toBeUndefined();
  expect(resolveCityLocalGeography('connections',cityContinuityPartProgress('ngari',0))?.localityId).toBeUndefined();
 });
 it('狮泉河的联系、公共生活和观察保持本地，机场接续仍在地区范围读取',()=>{
  const airportTransfer=resolveCityLocalGeography('connections',cityContinuityPartProgress('ngari',1))!;
  expect(airportTransfer).toMatchObject({cityId:'ngari',referenceId:'ngari',eventTime:'2004／2010'});
  expect(airportTransfer.localityId).toBeUndefined();
  expect(airportTransfer.placeName).toContain('昆莎—狮泉河');
  expect(airportTransfer.scope).toContain('不把当前道路当2004年竣工图或出行日导航');
  for(const [stage,progress] of [
   ['connections',cityContinuityPartProgress('ngari',2)],
   ['development',cityAccessPhaseProgress('ngari','life')],
   ...[0,1,2].map(index=>['travel',cityContinuityPartProgress('ngari',index)] as const),
  ] as const){
   const place=resolveCityLocalGeography(stage,progress)!;
   expect(place).toMatchObject({cityId:'ngari',referenceId:'ngari',localityId:'shiquanhe'});
   expect(place.placeName).toContain('狮泉河');
   expect(place.sourceIds).toContain('city-spatial-shiquanhe-banks-2017');
   expect(place.scope).toMatch(/不把今天全部公园或步道归入2017年工程|不是2017工程边界/);
  }
  expect(resolveCityLocalGeography('history',cityContinuityPartProgress('ngari',0))).toMatchObject({referenceId:'tholing',localityId:undefined});
 });
 it('旅行读点来自已归档要素的原始顶点，保留日期、来源和窗口范围',()=>{
  for(const [id,stop] of [['lulang','nyingchi-lulang'],['lhasa','lhasa-river'],['shiquanhe','shiquanhe-life']] as const){
   const data=local(id),choices=cityLocalObservationPoints(data,stop);
   expect(choices.length).toBeGreaterThan(0);
   const [w,s,e,n]=data.metadata.bbox;
   for(const point of choices){
    const feature=data.features.find((item:{id:string})=>item.id===point.featureId);
    expect(feature).toBeDefined();expect(JSON.stringify(feature.geometry.coordinates)).toContain(JSON.stringify(point.coordinates));
    expect(point.coordinates[0]).toBeGreaterThanOrEqual(w);expect(point.coordinates[0]).toBeLessThanOrEqual(e);
    expect(point.coordinates[1]).toBeGreaterThanOrEqual(s);expect(point.coordinates[1]).toBeLessThanOrEqual(n);
    expect(point.acquiredAt).toBe(data.metadata.acquiredAt);expect(point.sourceUrl).toBe(feature.properties.osm_url);
   }
  }
  expect(points('lulang','nyingchi-lulang').map(point=>point.featureId)).toContain('way/26406905');
  expect(points('lhasa','lhasa-river').map(point=>point.featureId)).toContain('way/122707217');
  expect(points('lhasa','lhasa-buildings').map(point=>point.featureId)).toContain('way/31475419');
  expect(cityLocalObservationPoints(local('lulang'),'tholing')).toEqual([]);
  expect(cityLocalObservationPoints(local('shiquanhe'),'nyingchi-lulang')).toEqual([]);
 });
 it('事件年份和地图范围有独立说明，材料页不会声称现状为历史复原',()=>{
  const html=renderToStaticMarkup(createElement(CityLocalContext,{stage:'history',progress:cityContinuityPartProgress('nyingchi',2)}));
  expect(html).toContain('鲁朗');expect(html).toContain('事件／材料：2016');expect(html).toContain('不是2016年建成复原');
  expect(html).not.toContain('2026年建成');
 });
});

describe('实际地图参照仍遵守显式保存与回看合同',()=>{
 it('只加整组不隐存读点，显式保存才追加；重复保存/移除恢复不改原笔记',()=>{
  const point=points('lulang','nyingchi-lulang')[0],question=cityContinuityTravelQuestions('nyingchi-lulang').find(item=>item.id==='life')!;
  const original={...emptyExploration(),route:['nyingchi-lulang'],stopNotes:{'nyingchi-lulang':'自己写的笔记\n','lhasa-buildings':''}};
  const grouped=appendCityContinuityTravel(original,'nyingchi');
  expect(grouped.stopNotes['nyingchi-lulang']).toBe(original.stopNotes['nyingchi-lulang']);
  const saved=appendCityContinuityTravelQuestion(grouped,'nyingchi','nyingchi-lulang','life',undefined,point);
  expect(saved.stopNotes['nyingchi-lulang']).toBe(original.stopNotes['nyingchi-lulang']+'\n'+cityTravelObservationNote(question)+'\n'+cityLocalObservationNote(point));
  expect(saved.stopNotes['lhasa-buildings']).toBe('');expect(saved.completed).toEqual([]);expect(saved.visited).toEqual([]);
  expect(cityTravelQuestionInPlan(saved,'nyingchi-lulang',question,point)).toBe(true);
  expect(appendCityContinuityTravelQuestion(saved,'nyingchi','nyingchi-lulang','life',undefined,point)).toBe(saved);
  const removed={...saved,route:saved.route.filter(stop=>stop!=='nyingchi-lulang')};
  expect(cityTravelQuestionInPlan(removed,'nyingchi-lulang',question,point)).toBe(false);
  const restored=appendCityContinuityTravelQuestion(removed,'nyingchi','nyingchi-lulang','life',undefined,point);
  expect(restored.stopNotes).toEqual(saved.stopNotes);expect(parseExploration(JSON.stringify(restored))).toEqual(restored);
 });
 it('已有问题可追加新地图参照，不重写问题；拒绝别城要素与超长笔记',()=>{
  const saved=appendCityContinuityTravelQuestion(emptyExploration(),'lhasa','lhasa-buildings','life');
  const point=points('lhasa','lhasa-buildings')[0],question=cityContinuityTravelQuestions('lhasa-buildings').find(item=>item.id==='life')!;
  expect(cityTravelQuestionInPlan(saved,'lhasa-buildings',question,point)).toBe(false);
  const after=appendCityContinuityTravelQuestion(saved,'lhasa','lhasa-buildings','life',undefined,point);
  expect(after.stopNotes['lhasa-buildings']).toBe(saved.stopNotes['lhasa-buildings']+'\n'+cityLocalObservationNote(point));
  expect(appendCityContinuityTravelQuestion(saved,'lhasa','lhasa-buildings','life',undefined,points('lulang','nyingchi-lulang')[0])).toBe(saved);
  const full={...saved,stopNotes:{...saved.stopNotes,'lhasa-buildings':'笔'.repeat(1490)}};
  expect(appendCityContinuityTravelQuestion(full,'lhasa','lhasa-buildings','life',undefined,point)).toBe(full);
 });
 it('回看快照保留尚未保存的地图选择，返回同地方恢复实际feature高亮',()=>{
  const point=points('lhasa','lhasa-buildings')[0],position=validateCityComparisonPosition({stage:'travel',progress:cityContinuityPartProgress('lhasa',1),services:false});
  const pending={'lhasa-buildings':point},snapshot=captureCityTravelReview(position,{'lhasa-buildings':'life'},{readingTop:940,pageTop:1250},'building-life',{observations:pending,active:point});
  delete (pending as Partial<typeof pending>)['lhasa-buildings'];
  expect(snapshot.localObservations?.['lhasa-buildings']).toEqual(point);expect(snapshot.activeLocalObservation).toEqual(point);
  expect(snapshot.choices['lhasa-buildings']).toBe('life');expect(snapshot.readingTop).toBe(940);
  expect(cityLocalObservationFeatureId(snapshot.position.stage,snapshot.position.progress,snapshot.activeLocalObservation)).toBe(point.featureId);
  expect(cityLocalObservationFeatureId('history',snapshot.position.progress,snapshot.activeLocalObservation)).toBeUndefined();
  expect(cityLocalObservationFeatureId('travel',cityContinuityPartProgress('ngari',0),snapshot.activeLocalObservation)).toBeUndefined();
  expect(emptyExploration().route).toEqual([]);
 });
});
