import {afterEach,describe,expect,it,vi} from 'vitest';
import {appendOverviewObservation,type ObservationOrigin} from '../src/lib/overviewObservation';
import {emptyExploration,parseExploration,readExploration,writeExploration} from '../src/lib/store';
import {overviewMainProgram} from '../src/data/overviewProgram';
import {observationChoices} from '../src/data/overviewObservation';
import {readOverviewPosition} from '../src/hooks/useOverviewDirector';
const beat=overviewMainProgram.beats.find(b=>b.id==='OVERVIEW-valley-journey')!;
const origin:ObservationOrigin={programId:'main',beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw:.437,voice:false,title:beat.title,question:'河流与铁路怎样影响通行？',sources:[...beat.sources]};
afterEach(()=>vi.unstubAllGlobals());
describe('mainline observation handoff',()=>{
 it('round trips exact narration and evidence through the existing plan storage, including edits',()=>{
  const memory=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)});
  const value=appendOverviewObservation(emptyExploration(),'lhasa-river',origin);
  expect(writeExploration(value)).toBe(true);expect(readExploration().overviewObservations?.['lhasa-river']).toEqual(origin);
  const edited={...readExploration(),stopNotes:{'lhasa-river':'我想核对站区跨河接续。'}};writeExploration(edited);
  expect(readExploration().stopNotes['lhasa-river']).toBe('我想核对站区跨河接续。');
  memory.set('return',JSON.stringify(origin));
  expect(readOverviewPosition({beats:[{...beat,sceneIdentity:'atlas-local-context'}],storageKey:'return'})).toMatchObject({raw:.437,voice:false});
 });
 it('preserves route order and user-authored or deliberately blank notes on repeated handoff',()=>{
  const previous={...emptyExploration(),route:['nyingchi-valley','lhasa-river'],stopNotes:{'lhasa-river':''}};
  const next=appendOverviewObservation(previous,'lhasa-river',origin);
  expect(next.route).toEqual(previous.route);expect(next.stopNotes).toEqual(previous.stopNotes);
  expect(appendOverviewObservation({...next,stopNotes:{'lhasa-river':'我的原有记录'}},'lhasa-river',origin).stopNotes['lhasa-river']).toBe('我的原有记录');
 });
 it('rejects invalid destinations and unsafe source URLs from persisted plans',()=>{
  const value=parseExploration(JSON.stringify({...emptyExploration(),overviewObservations:{unknown:origin,'lhasa-river':{...origin,raw:4,sources:[{title:'bad',url:'javascript:alert(1)'},...origin.sources]}}}));
  expect(value.overviewObservations?.unknown).toBeUndefined();expect(value.overviewObservations?.['lhasa-river'].raw).toBe(1);
  expect(value.overviewObservations?.['lhasa-river'].sources).toEqual(origin.sources);
 });
 it('the ending reuses three existing place questions and their actual source beats',()=>{
  const ending=overviewMainProgram.beats.find(b=>b.id==='OVERVIEW-conclusion')!;
  const options=observationChoices(ending);expect(options).toHaveLength(3);
  expect(options[0].sources).toEqual(beat.sources);
  for(const option of options){expect(option.sources.length).toBeGreaterThan(0);expect(option.question.length).toBeGreaterThan(20);}
 });
 it('reports failed storage instead of claiming a saved observation',()=>{
  vi.stubGlobal('localStorage',{setItem:()=>{throw Error('quota');}});
  expect(writeExploration(appendOverviewObservation(emptyExploration(),'lhasa-river',origin))).toBe(false);
 });
});
