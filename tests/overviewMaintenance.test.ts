import {describe,it,expect} from 'vitest';
import {overviewMainProgram} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';
import type {NarrationTiming} from '../src/lib/narrationTiming';
const beat=overviewMainProgram.beats.find(b=>b.id==='OVERVIEW-protection')!;
const at=(token:string,offset=0)=>overviewPresentation(beat,.99,{textProgress:(beat.text.indexOf(token)+offset)/beat.text.length} as NarrationTiming);
describe('maintenance returns to visible documented processes',()=>{
 it('loads one identity before speaking, then revisits the existing protection action and returns',()=>{
  const river=at('雅鲁藏布江'),early=at('拉萨遗产保护'),later=at('还要照顾地方日常',6),back=at('维护责任',4);
  for(const view of [river,early,later,back])expect(view.sceneIdentity).toBe('atlas-local-context');
  expect(river.props.overviewRiver?.emphasized).toBe(true);
  expect(early.props.overviewPlaceAction).toMatchObject({caseId:'jokhang',separation:0});
  expect(early.props.overviewReturnMix).toBe(1);
  expect(later.props.overviewPlaceAction?.separation).toBeGreaterThan(.9);
  expect(later.props.overviewReturnMix).toBe(0);
  expect(back.props.overviewReturnMix).toBeGreaterThan(.9);
  expect(at('拉萨遗产保护')).toEqual(early);
 });
 it('keeps the report and present-day geometry attached to this recap without changing audio',()=>{
  expect(beat.sources.some(s=>s.url==='https://whc.unesco.org/document/5816')).toBe(true);
  expect(beat.sources.some(s=>s.url==='/data/local-places/lhasa.geojson')).toBe(true);
  expect(at('拉萨遗产保护').sourceScope).toContain('未复原');
 });
});
