import {describe,it,expect} from 'vitest';
import {chapters} from '../src/data/curriculum';
import {learningStepIds} from '../src/data/learningOrder';
import {guidedJourneyHash,isGuidedJourney,nextGuidedQuestion,mainlineConnection} from '../src/lib/guidedJourney';
import {detailOrigin,parseAtlasLocation} from '../src/lib/spatialJourney';
import {parseRoute,settingsForStep} from '../src/lib/store';
import {settingsFromAtlas} from '../src/lib/spatialJourney';

describe('continuous causal journey and spatial detours',()=>{
 it('opens each mainline explanation without another required atlas selection',()=>{
  for(const chapter of chapters)for(const step of chapter.steps){
   const hash=guidedJourneyHash(chapter.id,step.id);
   expect(isGuidedJourney(hash)).toBe(true);
   expect(parseRoute(hash)).toEqual({home:false,chapter:chapter.id,step:step.id});
   expect(parseRoute(`#${hash}`).step).toBe(step.id);
   expect(parseAtlasLocation(hash)).toBeUndefined();
   if(!['G1','G2'].includes(step.id))expect(detailOrigin(hash,step.id)?.questionId).toBe(step.id);
  }
 });
 it('retains a specific alternative history material origin when adding journey parameters',()=>{
  const origin={themeId:'history' as const,hotspotId:'tholing-exchange',questionId:'H2'};
  expect(detailOrigin(guidedJourneyHash('history','H2',origin),'H2')).toEqual(origin);
  expect(detailOrigin('/learn/history/H2/detail?journey=guided&from=history/tholing-exchange/H2','H2')).toEqual(origin);
 });
 it('continues across environment, culture, history and today in the accepted order',()=>{
  expect(nextGuidedQuestion('G2')?.step.id).toBe('G3');
  expect(nextGuidedQuestion('P3')?.step.id).toBe('K1');
  expect(nextGuidedQuestion('K4')?.step.id).toBe('H1');
  expect(nextGuidedQuestion('H4')?.step.id).toBe('R1');
  expect(nextGuidedQuestion('R3')?.step.id).toBe('M1');
  expect(nextGuidedQuestion('T3')).toBeUndefined();
  expect(nextGuidedQuestion('unknown')).toBeUndefined();
 });
 it('keeps map exploration separate and supplies readable reason for every next question',()=>{
  expect(isGuidedJourney('#/atlas/environment/himalaya-relief/G3')).toBe(false);
  expect(isGuidedJourney('#/learn/position/G1?journey=other')).toBe(false);
  for(const id of learningStepIds){const link=mainlineConnection(id);expect(link.context.length).toBeGreaterThan(20);expect(link.next.length).toBeGreaterThan(15);}
 });
 it('keeps map geography outside the modern condition model and starts new users with the first condition',()=>{
  const modern=chapters.find(ch=>ch.id==='modern')!;
  for(const step of modern.steps){
   expect(settingsForStep(step)).toMatchObject({progress:0,selected:''});
   const current={...settingsForStep(step),selected:'development-service',progress:.7};
   expect(settingsFromAtlas(step,current,{themeId:'development',hotspotId:'lhasa-railway',questionId:'M1'})).toEqual(current);
  }
 });
});
