import {afterEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chapters} from '../src/data/curriculum';
import {getJourneyStep} from '../src/data/journey';
import {guidedJourneyHash} from '../src/lib/guidedJourney';
import {cityAtlasLocation,detailHash,detailOrigin,parseAtlasLocation} from '../src/lib/spatialJourney';
import {parseRoute,settingsForStep} from '../src/lib/store';
import {captureExplorationOrigin,explorationReturnHash,isMainlineRoute,isTopicJourney,topicJourneyHash,topicNavigation,homeThemeDestination,recognitionEntrySettings,recognitionSteps,cityTopicOrigin} from '../src/lib/topicJourney';
import {atlasThemes} from '../src/data/atlas';
import {atlasHash} from '../src/lib/spatialJourney';
import PlateauClimateReading from '../src/components/PlateauClimateReading';

// Exercise the real app's end-of-narration controls without WebGL or an audio device.
vi.mock('../src/scene/TibetScene',()=>({default:()=>null}));
vi.mock('../src/hooks/useJourneyDirector',()=>({useJourneyDirector:({stepId}:{stepId:string})=>({
 cue:getJourneyStep(stepId).cues.at(-1)!,cueIndex:getJourneyStep(stepId).cues.length-1,progress:1,mode:'paused',playing:false,waiting:false,observed:false,
 audio:{status:'idle',error:null},start:()=>{},pause:()=>{},noteInteraction:()=>{},selectCue:()=>{},observeDone:()=>{},restore:()=>{},replay:()=>{},
})}));
// App.jsx is an older unused shell; production's main.jsx explicitly loads App.tsx.
const {default:App}=await vi.importActual<typeof import('../src/App')>('../src/App.tsx');

afterEach(()=>vi.unstubAllGlobals());
const chapter=(id:string)=>chapters.find(item=>item.id===id)!;
const renderAt=(hash:string)=>{vi.stubGlobal('location',{hash});return renderToStaticMarkup(createElement(App));};

describe('topic routes, chapter boundaries and recoverable detours',()=>{
 it('向前进入认识章节时使用首段场景，形成过程从0开始且保留G4低地参照',()=>{
  expect(recognitionEntrySettings('G3')).toMatchObject({layer:'plates',progress:0,cutaway:true});
  expect(recognitionEntrySettings('G4')).toMatchObject({layer:'terrain',cutaway:false,readingFraction:1/13});
  expect(recognitionEntrySettings('C4')).toMatchObject({layer:'arrival',progress:0,selected:'nyingchi'});
  expect(recognitionEntrySettings('unknown')).toBeUndefined();
 });
 it('opens four distinct home subjects directly and keeps history and connections at whole-map scale',()=>{
  expect(homeThemeDestination('nature')).toEqual({kind:'topic',stepId:'G1'});
  const destinations=['history','connections','travel'].map(group=>homeThemeDestination(group as 'history'|'connections'|'travel'));
  for(const [index,destination] of destinations.entries()){
   expect(destination.kind).toBe('atlas');
   if(destination.kind!=='atlas')throw new Error('Expected a whole-map destination');
   expect(destination.location).toEqual(cityAtlasLocation('nyingchi','environment',true));
   expect(destination.comparisonStage).toBe(['history','development','travel'][index]);
   expect(parseAtlasLocation(atlasHash(destination.location))).toEqual(destination.location);
  }
  expect(new Set(['nature','history','connections','travel'].map(group=>JSON.stringify(homeThemeDestination(group as 'nature'|'history'|'connections'|'travel')))).size).toBe(4);
 });
 it('opens every topic directly with its stable content ID and explicit topic mode',()=>{
  for(const value of chapters)for(const step of value.steps){
   const hash=topicJourneyHash(value.id,step.id);
   expect(parseRoute(hash)).toEqual({home:false,chapter:value.id,step:step.id});
   expect(parseAtlasLocation(hash)).toBeUndefined();
   expect(isTopicJourney(hash)).toBe(true);
   expect(isMainlineRoute(hash)).toBe(false);
  }
 });

 it('keeps G1 and G2 topic entries separate from the recommended globe-first introduction',()=>{
  for(const stepId of ['G1','G2']){
   expect(isMainlineRoute(`/learn/position/${stepId}`)).toBe(true);
   expect(isMainlineRoute(guidedJourneyHash('position',stepId))).toBe(true);
   expect(isMainlineRoute(topicJourneyHash('position',stepId))).toBe(false);
   expect(renderAt(topicJourneyHash('position',stepId))).not.toContain('class="mainline-context"');
  }
 });

 it('restores topic mode, the actual material origin and the paused cue after an exploratory detour',()=>{
  const place={themeId:'history' as const,hotspotId:'tholing-exchange',questionId:'H2',view:'topics' as const};
  const start=topicJourneyHash('history','H2',place);
  const savedOrigin=captureExplorationOrigin(start,'H2',2,true);
  const restored=explorationReturnHash('history',savedOrigin);
  expect(restored).toBe(start);
  expect(savedOrigin).toMatchObject({stepId:'H2',cueIndex:2,waiting:true,topicMode:true,mainline:false});
  expect(detailOrigin(restored,'H2')).toEqual(place);
  expect(isTopicJourney(restored)).toBe(true);
  expect(parseAtlasLocation(restored)).toBeUndefined();
 });

 it('restores guided and city-detail visits without converting them into topic playback',()=>{
  const guided=guidedJourneyHash('climate','C5');
  const guidedOrigin=captureExplorationOrigin(guided,'C5',1,false);
  expect(explorationReturnHash('climate',guidedOrigin)).toBe(guided);
  expect(guidedOrigin).toMatchObject({mainline:true,topicMode:false});
  const city=cityAtlasLocation('ngari','history');
  const cityDetail=detailHash('position','G1',city);
  const cityOrigin=captureExplorationOrigin(cityDetail,'G1',2,true);
  expect(cityOrigin).toMatchObject({mainline:false,topicMode:false});
  expect(explorationReturnHash('position',cityOrigin)).toBe(cityDetail);
  expect(detailOrigin(explorationReturnHash('position',cityOrigin),'G1')).toEqual(city);
 });

 it('shares the recommended cross-chapter route while retaining other topic boundaries',()=>{
  expect(topicNavigation(chapter('position'),'G1')).toMatchObject({previous:undefined,next:{id:'G2'},group:'nature'});
  expect(topicNavigation(chapter('position'),'G4')).toMatchObject({previous:{id:'G3'},next:{id:'C4'},group:'nature',recognition:true});
  expect(topicNavigation(chapter('climate'),'C4')).toMatchObject({previous:{id:'G4'},next:undefined,group:'nature',recognition:true,position:5,total:5});
  expect(topicNavigation(chapter('culture'),'K4')).toMatchObject({next:undefined,group:'history'});
  expect(topicNavigation(chapter('connections'),'R3')).toMatchObject({next:undefined,group:'connections'});
  expect(topicNavigation(chapter('travel'),'T1')).toMatchObject({previous:undefined,next:{id:'T2'},group:'travel'});
  for(const value of chapters.filter(item=>item.id!=='position'))expect(topicNavigation(value,value.steps.at(-1)!.id).next).toBeUndefined();
 });

 it('takes the same five steps forwards and backwards in both recommended and topic modes',()=>{
  expect(recognitionSteps.map(item=>item.step.id)).toEqual(['G1','G2','G3','G4','C4']);
  for(const [index,{chapter,step}] of recognitionSteps.entries()){
   const navigation=topicNavigation(chapter,step.id);
   expect(navigation.previous?.id).toBe(recognitionSteps[index-1]?.step.id);
   expect(navigation.next?.id).toBe(recognitionSteps[index+1]?.step.id);
   for(const hash of [guidedJourneyHash(chapter.id,step.id),topicJourneyHash(chapter.id,step.id)]){
    const html=renderAt(hash);
    expect(html).toContain('从地球到地方的认识主线');
    if(navigation.previous)expect(html).toContain(`aria-label="上一步：${navigation.previous.title}"`);
   }
  }
 });

 it('keeps city/comparison detail returns distinct from the original C4 question',()=>{
  const original=captureExplorationOrigin(topicJourneyHash('climate','C4'),'C4',4,false);
  for(const compare of [true,false]){
   const city=cityAtlasLocation('lhasa','environment',compare);
   for(const [chapterId,stepId] of [['position','G4'],['climate','C4'],['culture','K1']]){
    const libraryOrigin=cityTopicOrigin(stepId,city)!;
    expect(libraryOrigin).toMatchObject({view:'cities',cityId:'lhasa',facet:'environment',compare});
    const detail=detailHash(chapterId,stepId,libraryOrigin);
    expect(detailOrigin(detail,stepId)).toEqual(libraryOrigin);
    expect(parseAtlasLocation(atlasHash(detailOrigin(detail,stepId)!))).toEqual(libraryOrigin);
    expect(renderAt(detail)).toContain('aria-label="返回城市与地区"');
   }
  }
  expect(cityTopicOrigin('C4')).toBeUndefined();
  expect(cityTopicOrigin('C4',{themeId:'history',hotspotId:'tholing-exchange',questionId:'H2',view:'topics'})).toBeUndefined();
  expect(original).toMatchObject({stepId:'C4',cueIndex:4,topicMode:true});
  expect(explorationReturnHash('climate',original)).toBe(topicJourneyHash('climate','C4'));
 });

 it('selects the city-specific historical material while retaining the chosen reading mode',()=>{
  for(const compare of [undefined,true,false]){
   const city=cityAtlasLocation('ngari','history',compare);
   for(const [stepId,chapterId,hotspotId] of [['H2','history','tholing-exchange'],['K2','culture','tholing-culture']]){
    const origin=cityTopicOrigin(stepId,city)!;
    expect(origin).toMatchObject({hotspotId,questionId:stepId,cityId:'ngari',facet:'history'});
    expect(origin.compare).toBe(compare);
    const restored=detailOrigin(detailHash(chapterId,stepId,origin),stepId)!;
    expect(restored).toEqual(origin);
    expect(parseAtlasLocation(atlasHash(restored))).toEqual(origin);
   }
  }
  const implicitComparison=cityTopicOrigin('C4',cityAtlasLocation('nyingchi','environment'))!;
  expect(implicitComparison.compare).toBeUndefined();
  expect(atlasHash(implicitComparison)).not.toContain('compare=0');
 });

 it('labels both playback and next controls with the next topic section despite an atlas origin',()=>{
  const next=chapter('climate').steps.find(step=>step.id==='C6')!;
  const html=renderAt(topicJourneyHash('climate','C5'));
  expect(html).toContain(`aria-label="下一节：${next.title}"`);
  const nextButton=html.match(/<button\b[^>]*class="gold-button next-step"[^>]*>([\s\S]*?)<\/button>/)?.[1];
  expect(nextButton).toContain(`下一节：${next.title}`);
  expect(html).not.toContain('aria-label="返回整体地图"');
 });

 it('keeps subject endings available while connecting terrain to inflow and three-city comparison',()=>{
  for(const [chapterId,stepId] of [['climate','C9'],['culture','K4'],['travel','T3']]){
   const html=renderAt(topicJourneyHash(chapterId,stepId));
   expect(html).toContain('aria-label="选择其他专题"');
   expect(html).not.toContain('aria-label="返回整体地图"');
  }
  for(const hash of [guidedJourneyHash('position','G4'),topicJourneyHash('position','G4')])expect(renderAt(hash)).toContain('aria-label="继续：气流来到高原"');
  const connected=renderAt(topicJourneyHash('climate','C4'));
  expect(connected).toContain('aria-label="同图对照林芝、拉萨与阿里"');
  expect(connected).toContain('从地球到地方的认识主线');
  const c4=chapter('climate').steps.find(step=>step.id==='C4')!;
  const life=renderToStaticMarkup(createElement(PlateauClimateReading,{settings:{...settingsForStep(c4),layer:'life'},onChange:()=>{},onStage:()=>{},onCity:()=>{}}));
  expect(life).toContain('同图对照林芝、拉萨与阿里');
  expect(life).toContain('同一张高程地图');
  const origin=captureExplorationOrigin(topicJourneyHash('climate','C4'),'C4',4,false);
  expect(origin.cueIndex).toBe(4);
  expect(explorationReturnHash('climate',origin)).toBe(topicJourneyHash('climate','C4'));
 });
});
