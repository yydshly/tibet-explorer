import {describe,it,expect} from 'vitest';
import {overviewMainProgram} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';
import {overviewInteractionState,overviewInteractionStation} from '../src/lib/overviewInteraction';
import type {NarrationTiming} from '../src/lib/narrationTiming';
const timing=(text:string,token:string):NarrationTiming=>{const i=text.indexOf(token);expect(i).toBeGreaterThanOrEqual(0);return {caption:token,spokenText:token,textStart:i,textEnd:i+token.length,activeTextStart:i,activeTextEnd:i+token.length,textProgress:i/text.length,precision:'provider',timingLevel:'word'};};
describe('interaction inside the continuous overview',()=>{
 it('runs climate, station evidence, three regions and history on the same loaded map',()=>{
  const beats=overviewMainProgram.beats;
  const start=beats.findIndex(b=>b.id==='LAB-air-higher'),end=beats.findIndex(b=>b.id==='OVERVIEW-history-entry');
  expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
  const chain=beats.slice(start,end+1);
  expect(chain.filter(b=>b.id.startsWith('LAB-life-')).map(b=>b.id)).toEqual(['LAB-life-nyingchi','LAB-life-lhasa','LAB-life-ngari']);
  for(const b of chain)expect(overviewPresentation(b,0).sceneIdentity,b.id).toBe('atlas-overview');
  expect(overviewPresentation(beats[end],.5).props.climateLab).toBeUndefined();
 });
 it.each(['nyingchi','lhasa','ngari'])('keeps %s on the whole map, zooms at its own words and returns before history',city=>{
  const beat=overviewMainProgram.beats.find(b=>b.id===`LAB-life-${city}`)!;
  expect(overviewInteractionState(beat.id,beat.text)?.zoom).toBe(false);
  const enter=timing(beat.text,'再沿同一张地图拉近'),exit=timing(beat.text,'回到全域');
  expect(overviewInteractionState(beat.id,beat.text,enter)?.zoom).toBe(true);
  expect(overviewInteractionState(beat.id,beat.text,exit)?.zoom).toBe(false);
  // Raw media time cannot override a different native word position.
  expect(overviewPresentation(beat,.99,enter).props.climateLab?.zoom).toBe(true);
  expect(overviewPresentation(beat,.1,exit).props.climateLab?.zoom).toBe(false);
  expect(overviewInteractionState(beat.id,beat.text,enter)?.landReveal).toBe(0);
  expect(overviewInteractionState(beat.id,beat.text,exit)?.landReveal).toBe(1);
  expect(overviewInteractionState(beat.id,beat.text,enter)?.direction).toBe('north-south');
  const turn=timing(beat.text,'切换剖面方向');
  expect(overviewInteractionState(beat.id,beat.text,turn)?.direction).toBe('east-west');
  expect(overviewInteractionState(beat.id,beat.text,turn)?.progress).toBe(0);
  const ground=timing(beat.text,'青色地面标出');
  expect(overviewInteractionState(beat.id,beat.text,ground)?.progress).toBe(1);
  expect(overviewInteractionState(beat.id,beat.text,exit)?.progress).toBe(1);
 });
 it('does not reuse station highlighting after a manual month comparison',()=>{
  const beat=overviewMainProgram.beats.find(b=>b.id==='OBS-CLIMATE-7')!;
  const t=timing(beat.text,'拉萨站');
  const state=overviewInteractionState(beat.id,beat.text,t)!;
  expect(overviewInteractionStation(state,beat.text,beat.id,t)).toBeDefined();
  expect(overviewInteractionStation({...state,month:1},beat.text,beat.id,t)).toBeUndefined();
 });
});
