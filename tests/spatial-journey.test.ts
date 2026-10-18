import {describe,it,expect} from 'vitest';
import {atlasThemes} from '../src/data/atlas';
import {chapters} from '../src/data/curriculum';
import {atlasHash,atlasLocationForStep,parseAtlasLocation,detailHash,detailOrigin,settingsFromAtlas} from '../src/lib/spatialJourney';
import {settingsForStep,emptyExploration} from '../src/lib/store';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SpatialJourneyNav,{spatialJourneyActive} from '../src/components/SpatialJourneyNav';
import {guidedJourneyHash} from '../src/lib/guidedJourney';
import StoryAtlasExperience from '../src/components/StoryAtlasExperience';

describe('whole map and local explanation continuity',()=>{
 it('starts a geographical detail at the map place and preserves manual conditions when reopening that place',()=>{
  const step=chapters.find(ch=>ch.id==='regions')!.steps.find(item=>item.id==='E3')!;
  const origin={themeId:'people' as const,hotspotId:'yarlung-life',questionId:'E3'};
  expect(settingsFromAtlas(step,settingsForStep(step),origin)).toEqual(settingsForStep(step)); // Context stays in the locator; the condition model is not a surveyed town.
  const explored={...settingsForStep(step),selected:'ngari',season:3,progress:.82};
  expect(settingsFromAtlas(step,explored,origin,'yarlung-life')).toEqual(explored);
  const pair=chapters.find(ch=>ch.id==='regions')!.steps.find(item=>item.id==='E2')!;
  const result=settingsFromAtlas(pair,{...settingsForStep(pair),compareRegion:'nagqu'},atlasLocationForStep('E2')!);
  expect(result.selected).toBe('nagqu');expect(result.compareRegion).not.toBe(result.selected);
 });
 it('routes all old deep links to the corresponding whole map before a local model',()=>{
  for(const chapter of chapters)for(const step of chapter.steps){
   const location=parseAtlasLocation(`#/learn/${chapter.id}/${step.id}`);
   if(['G1','G2'].includes(step.id))expect(location).toBeUndefined();
   else {expect(location?.questionId).toBe(step.id);expect(location).toEqual(atlasLocationForStep(step.id));}
   expect(parseAtlasLocation(detailHash(chapter.id,step.id))).toBeUndefined();
  }
 });
 it('returns to the actual material entry even when several places share one question',()=>{
  for(const theme of atlasThemes)for(const point of theme.hotspots)for(const questionId of point.relatedQuestionIds){
   const origin={themeId:theme.id,hotspotId:point.id,questionId};
   const chapter=chapters.find(item=>item.steps.some(step=>step.id===questionId))!;
   expect(detailOrigin(detailHash(chapter.id,questionId,origin),questionId)).toEqual(origin);
   expect(parseAtlasLocation(atlasHash(origin))).toEqual(origin);
  }
 });
 it('normalizes unavailable themes, places and questions to a usable map entry',()=>{
  const expected={themeId:atlasThemes[0].id,hotspotId:atlasThemes[0].hotspots[0].id,questionId:atlasThemes[0].hotspots[0].questionId};
  expect(parseAtlasLocation('#/atlas/removed/unknown/invalid')).toEqual(expected);
  const point=atlasThemes[2].hotspots[2];
  expect(parseAtlasLocation(`#/atlas/history/${point.id}/C9`)?.questionId).toBe(point.questionId);
  expect(parseAtlasLocation('#/')).toBeUndefined();
 });
 it('uses the current mainline knowledge stage while retaining its different material origin',()=>{
  const origin={themeId:'people' as const,hotspotId:'tholing-culture',questionId:'R2'};
  const hash=guidedJourneyHash('connections','R2',origin);
  expect(detailOrigin(hash,'R2')).toEqual(origin);
  const active=spatialJourneyActive('R2',true,detailOrigin(hash,'R2')?.themeId);
  const html=renderToStaticMarkup(createElement(SpatialJourneyNav,{active,onEarth:()=>{},onTheme:()=>{}}));
  const current=[...html.matchAll(/<button\b[^>]*aria-current="step"[^>]*>([\s\S]*?)<\/button>/g)];
  expect(current).toHaveLength(1); expect(current[0][1]).toContain('05'); expect(current[0][1]).toContain('今天怎样联系与发展');
  expect(spatialJourneyActive('R2',false,origin.themeId)).toBe('people');
  expect(detailOrigin(hash,'R2')).toEqual(origin);
 });
 it('keeps explicitly chosen map themes active outside the mainline, including cross-theme questions',()=>{
  const origin={themeId:'history' as const,hotspotId:'tholing-exchange',questionId:'H2'};
  const hash=detailHash('history','H2',origin);
  expect(spatialJourneyActive('H2',false,detailOrigin(hash,'H2')?.themeId)).toBe('history');
  expect(spatialJourneyActive('R3',false,'environment')).toBe('environment');
  for(const id of ['R1','R2','R3','M1','M2','M3','T1','T2','T3'])expect(spatialJourneyActive(id,true,'people'),id).toBe('development');
  expect(spatialJourneyActive('K1',true,'environment')).toBe('people'); expect(spatialJourneyActive('H2',true,'people')).toBe('history');
  expect(spatialJourneyActive('G1',true,'development')).toBe('earth'); expect(spatialJourneyActive('C5',true,'people')).toBe('environment');
 });
 it('preserves the return to the original plan as secondary depth below the city introduction',()=>{
  const location={themeId:'people' as const,hotspotId:'yarlung-life',questionId:'E3'},saved=emptyExploration();
  saved.route=['lhasa-buildings','yarlung-valley','nyingchi-valley']; saved.stopNotes={'yarlung-valley':'回看以后继续这个问题。'};
  const title=chapters.find(chapter=>chapter.id==='travel')!.steps.find(step=>step.id==='T2')!.title;
  const html=renderToStaticMarkup(createElement(StoryAtlasExperience,{location,saved,onDetail:()=>{},onEarth:()=>{},onDirectory:()=>{},onSaved:()=>{},onTravel:()=>{},onReturn:()=>{},returnTitle:title}));
  const returns=[...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].filter(button=>button[1].replace(/<[^>]*>/g,'').includes(`回到原问题：${title}`));
  expect(returns).toHaveLength(1); expect(returns[0][0]).toContain('type="button"'); expect(returns[0][1]).toContain(`回到原问题：${title}`);
  expect(html.indexOf(returns[0][0])).toBeGreaterThan(html.indexOf('<h1>山南</h1>'));
  expect(html).toContain('七市地在西藏与周边的整体位置'); expect(html).toContain('泽当城区');
  expect(saved.route).toEqual(['lhasa-buildings','yarlung-valley','nyingchi-valley']); expect(saved.stopNotes['yarlung-valley']).toBe('回看以后继续这个问题。');
 });
 it('does not invent a return destination for an ordinary map visit',()=>{
  const html=renderToStaticMarkup(createElement(StoryAtlasExperience,{location:{themeId:'people',hotspotId:'yarlung-life',questionId:'E3'},saved:emptyExploration(),onDetail:()=>{},onEarth:()=>{},onDirectory:()=>{},onSaved:()=>{},onTravel:()=>{},returnTitle:'没有对应动作的旧标题'}));
  const returnButtons=[...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].filter(button=>button[1].replace(/<[^>]*>/g,'').includes('回到原问题'));
  expect(returnButtons).toHaveLength(0); expect(html).not.toContain('没有对应动作的旧标题');
 });
});
