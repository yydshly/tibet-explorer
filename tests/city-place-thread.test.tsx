import {readFileSync} from 'node:fs';
import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import CityPlaceThread from '../src/components/CityPlaceThread';
import CityContinuityTravelActions from '../src/components/CityContinuityTravelActions';
import {cityPlaceThreads} from '../src/data/cityPlaceThreads';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {cityAccessState} from '../src/lib/cityAccessState';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {cityLocalObservationFeatureId,cityLocalObservationPoints,resolveCityLocalGeography} from '../src/lib/cityLocalGeography';
import {captureCityTravelReview,cityTravelObservationReviewTargets,type CityTravelChoiceMap} from '../src/lib/cityTravelReview';
import {cityContinuityTravelContext,cityContinuityTravelPlan} from '../src/lib/cityContinuityTravel';
import {validateCityComparisonPosition} from '../src/hooks/useCityComparisonDirector';
import {emptyExploration} from '../src/lib/store';

const cities=['nyingchi','lhasa','ngari'] as const;
type ButtonProps={children?:ReactNode;onClick?:()=>void;'data-review-key'?:string;'aria-current'?:string};
function elements(node:ReactNode):ReactElement<ButtonProps>[]{
 if(!isValidElement(node))return [];
 const element=node as ReactElement<ButtonProps>;
 return [element,...Children.toArray(element.props.children).flatMap(elements)];
}

describe('同一地方的事件、空间、生活与观察入口',()=>{
 it.each(cities)('%s的四按钮进入对应录音范围，保持城市与实际地方参照',cityId=>{
  const thread=cityPlaceThreads[cityId],onNavigate=vi.fn(),event=thread.steps[0];
  const tree=CityPlaceThread({cityId,stage:event.stage,progress:event.progress,onNavigate});
  const buttons=elements(tree).filter(element=>element.type==='button');
  expect(thread.steps.map(step=>step.id)).toEqual(['event','space','life','observe']);
  expect(onNavigate).not.toHaveBeenCalled();
  for(const step of thread.steps){
   const key=`place-thread-${cityId}-${step.id}`;
   const button=buttons.find(element=>element.props['data-review-key']===key);
   expect(button,key).toBeDefined();
   button!.props.onClick?.();
   expect(onNavigate).toHaveBeenLastCalledWith(step);
   const state=step.stage==='development'?cityAccessState(step.progress):cityContinuityPartState(step.progress);
   expect(state.cityId).toBe(cityId);
   const place=resolveCityLocalGeography(step.stage,step.progress)!;
   expect(place.cityId).toBe(cityId);
   expect(place.referenceId).toBe(cityId==='nyingchi'?'lulang':cityId==='lhasa'?'lhasa':'ngari');
   expect(place.localityId).toBe(cityId==='nyingchi'?'lulang':cityId==='lhasa'?'lhasa':step.id==='space'?undefined:'shiquanhe');
   const html=renderToStaticMarkup(createElement(CityPlaceThread,{cityId,stage:step.stage,progress:step.sceneProgress??step.progress,onNavigate}));
   const currentTag=html.match(/<button\b[^>]*aria-current="step"[^>]*>/)?.[0];
   expect(currentTag).toContain(`data-review-key="${key}"`);
   expect(html).toContain(step.question);
  }
  expect(onNavigate).toHaveBeenCalledTimes(4);
 });

 it('狮泉河观察留在本地河岸，托林保持独立历史与可选旅行入口',()=>{
  const observe=cityPlaceThreads.ngari.steps.find(step=>step.id==='observe')!;
  const state=cityContinuityPartState(observe.progress);
  expect(state).toMatchObject({cityId:'ngari',index:1});
  expect(cityContinuityLessons.travel.ngari[state.index].referenceId).toBe('ngari');
  expect(resolveCityLocalGeography(observe.stage,observe.progress)).toMatchObject({referenceId:'ngari',localityId:'shiquanhe'});
  const material=cityContinuityTravelContext('shiquanhe-life','life');
  expect(material.text).toMatch(/狮泉河.*2017年.*公共空间/);
  expect(material.sourceIds).toContain('city-spatial-shiquanhe-banks-2017');
  expect(material.sourceIds).not.toContain('city-life-tibet-india');
  const targets=cityTravelObservationReviewTargets('ngari','shiquanhe-life','life');
  expect(targets).toHaveLength(1);
  expect(targets[0]).toMatchObject({cityId:'ngari',stage:'history',key:'shiquanhe-life-life-history-2'});
  expect(resolveCityLocalGeography(targets[0].stage,targets[0].progress)).toMatchObject({referenceId:'ngari',localityId:'shiquanhe'});
  expect(cityContinuityTravelPlan('ngari').stopIds).toContain('tholing');
  expect(cityTravelObservationReviewTargets('ngari','tholing','life').every(target=>resolveCityLocalGeography(target.stage,target.progress)?.referenceId==='tholing')).toBe(true);
 });

 it.each(cities)('%s旅行回看按钮key可用于快照，纯渲染不保存计划或丢掉未保存选择',cityId=>{
  const stopId=cityId==='nyingchi'?'nyingchi-lulang':cityId==='lhasa'?'lhasa-buildings':'shiquanhe-life';
  const localityId=cityId==='nyingchi'?'lulang':cityId==='lhasa'?'lhasa':'shiquanhe';
  const data=JSON.parse(readFileSync(new URL(`../public/data/local-places/${localityId}.geojson`,import.meta.url),'utf8'));
  const point=cityLocalObservationPoints(data,stopId)[0];
  expect(point).toBeDefined();
  const thread=cityPlaceThreads[cityId],observe=thread.steps.find(step=>step.id==='observe')!;
  const position=validateCityComparisonPosition({stage:'travel',progress:observe.progress,services:false,transfer:false,voice:false,built:false});
  const choices:CityTravelChoiceMap={[stopId]:'life'},observations={[stopId]:point};
  const onSave=vi.fn(),onNavigate=vi.fn(),onReviewProcess=vi.fn(),saved=emptyExploration();
  const html=renderToStaticMarkup(createElement(CityPlaceThread,{cityId,stage:'travel',progress:position.progress,onNavigate}));
  const actionsHtml=renderToStaticMarkup(createElement(CityContinuityTravelActions,{cityId,saved,choices,localObservations:observations,onSave,onTravel:vi.fn(),onReviewProcess}));
  expect(actionsHtml).toContain(`name="city-travel-question-${stopId}" checked="" value="life"`);
  for(const step of thread.steps.filter(step=>step.stage!=='travel')){
   const key=`place-thread-${cityId}-${step.id}`;
   expect(html).toContain(`data-review-key="${key}"`);
   const snapshot=captureCityTravelReview(position,choices,{readingTop:940,pageTop:1250},key,{observations,active:point});
   expect(snapshot).toMatchObject({cityId,position,choices,focusKey:key,readingTop:940,pageTop:1250,localObservations:observations,activeLocalObservation:point});
   expect(snapshot.position).not.toBe(position);expect(snapshot.choices).not.toBe(choices);expect(snapshot.localObservations).not.toBe(observations);
   expect(cityLocalObservationFeatureId(snapshot.position.stage,snapshot.position.progress,snapshot.activeLocalObservation)).toBe(point.featureId);
   expect(cityLocalObservationFeatureId(step.stage,step.progress,snapshot.activeLocalObservation)).toBeUndefined();
  }
  expect(saved).toEqual(emptyExploration());
  for(const callback of [onSave,onNavigate,onReviewProcess])expect(callback).not.toHaveBeenCalled();
 });
});
