import {describe,expect,it} from 'vitest';
import {regionalJourneys,regionalJourneySources,regionalJourneyNarrationCues} from '../src/data/regionalJourney';
import {readRegionalPosition,regionalCueSceneProgress,regionalStageOrder} from '../src/lib/regionalJourneyState';
import {regionalTerrainMeta} from '../src/data/terrainMetadata';
import type {NarrationTiming} from '../src/lib/narrationTiming';
import {regionalJourneyAnnotations} from '../src/data/regionalJourneyAnnotations';

describe('four regional journeys form sourced causal sequences on the shared terrain',()=>{
 it('preserves four distinct regions, all four stages and complete cue identities',()=>{
  expect(regionalJourneys.map(item=>item.cityId)).toEqual(['shigatse','shannan','chamdo','nagqu']);
  expect(regionalJourneyNarrationCues).toHaveLength(56);
  expect(new Set(regionalJourneyNarrationCues.map(item=>item.id)).size).toBe(56);
  expect(Object.keys(regionalJourneyAnnotations).sort()).toEqual(regionalJourneyNarrationCues.map(item=>item.id).sort());
  for(const annotation of Object.values(regionalJourneyAnnotations))for(const text of Object.values(annotation)){expect(text.length).toBeGreaterThan(3);expect(text.length).toBeLessThanOrEqual(20);}
  expect(new Set(regionalJourneySources.map(item=>item.id)).size).toBe(regionalJourneySources.length);
  const sources=new Set(regionalJourneySources.map(source=>source.id));
  for(const journey of regionalJourneys){
   expect(journey.stages.map(stage=>stage.id)).toEqual(regionalStageOrder);
   expect(journey.stages.map(stage=>[stage.id,stage.cues.length])).toEqual([['environment',3],['life',3],['history',4],['connections',4]]);
   expect(journey.stages[0].cues.map(cue=>cue.action)).toContain('rain');
   expect(journey.stages[1].cues.map(cue=>cue.action)).toContain('settlement');
   expect(journey.stages[2].cues.slice(0,3).every(cue=>cue.action==='heritage')).toBe(true);
   expect(journey.stages[2].cues.at(-1)?.action).toBe('settlement');
   expect(journey.stages[2].cues.at(-1)?.id).toBe(`REG-SPATIAL-${journey.cityId}-history`);
   expect(journey.stages[3].cues[2]?.id).toBe(`REG-SPATIAL-${journey.cityId}-access`);
   expect(journey.stages[3].cues.at(-1)?.action).toBe('observe');
   const points=new Set(journey.points.map(point=>point.id));
   for(const point of journey.points){
    expect(point.coordinates[0]).toBeGreaterThanOrEqual(regionalTerrainMeta.west);
    expect(point.coordinates[0]).toBeLessThanOrEqual(regionalTerrainMeta.east);
    expect(point.coordinates[1]).toBeGreaterThanOrEqual(regionalTerrainMeta.south);
    expect(point.coordinates[1]).toBeLessThanOrEqual(regionalTerrainMeta.north);
    expect(point.scopeNote.length).toBeGreaterThan(15);
    expect(point.sourceIds.length).toBeGreaterThan(0);
    expect(point.sourceIds.every(id=>sources.has(id))).toBe(true);
   }
   for(const stage of journey.stages)for(const cue of stage.cues){
    expect(cue.text.includes(cue.anchor)).toBe(true);
    expect(cue.anchor.length).toBeGreaterThan(3);
    expect(cue.pointIds.length).toBeGreaterThan(0);
    expect(cue.pointIds.every(id=>points.has(id))).toBe(true);
    expect(cue.sourceIds.length).toBeGreaterThan(0);
    expect(cue.sourceIds.every(id=>sources.has(id))).toBe(true);
   }
  }
  for(const source of regionalJourneySources){expect(source.url).toMatch(/^https:\/\//);expect(source.supports.length).toBeGreaterThan(0);}
 });
 it('a new facet cannot reuse a different recording raw position; life persists within the environment facet',()=>{
  expect(readRegionalPosition({stage:'history',cue:2,raw:.78,voice:false},'environment')).toEqual({stage:'environment',cue:0,raw:0,voice:false});
  expect(readRegionalPosition({stage:'life',cue:1,raw:.42,voice:false},'environment')).toEqual({stage:'life',cue:1,raw:.42,voice:false});
  expect(readRegionalPosition({stage:'missing',cue:99,raw:8},'today')).toEqual({stage:'connections',cue:0,raw:0,voice:true});
 });
 it('the native literal text position owns scene motion, not an unrelated media percentage',()=>{
  const cue=regionalJourneys[0].stages[0].cues[0],start=cue.text.indexOf(cue.anchor);
  const at=(offset:number):NarrationTiming=>({caption:'',spokenText:'',textStart:0,textEnd:cue.text.length,textProgress:offset/cue.text.length,precision:'provider',timingLevel:'word'});
  const before=regionalCueSceneProgress(cue,at(Math.max(0,start-1)),.8);
  const during=regionalCueSceneProgress(cue,at(start+(cue.text.length-start)*.5),.2);
  expect(before).toBe(0);expect(during).toBeCloseTo(.5);
  expect(regionalCueSceneProgress(cue,at(start),1)).toBe(1);
 });
 it('migrates the original observation recording without changing its raw fraction',()=>{
  expect(readRegionalPosition({stage:'connections',cue:2,raw:.731,voice:false},'today')).toEqual({stage:'connections',cue:3,raw:.731,voice:false});
  expect(readRegionalPosition({version:2,stage:'connections',cue:2,raw:.418},'today')).toEqual({stage:'connections',cue:2,raw:.418,voice:true});
 });
});
