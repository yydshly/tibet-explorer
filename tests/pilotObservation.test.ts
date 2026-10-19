import {describe,it,expect} from 'vitest';
import {pilotObservation,appendPilotQuestion,pilotPlanMarkdown} from '../src/lib/pilotObservation';
import type {PilotNote,PilotReturn} from '../src/lib/routePilotStore';
const origin:PilotReturn={beatIndex:2,raw:.438,voice:true,scriptVersion:'6',view:{mode:'place',progress:1,height:3000,connections:true,lookBack:false,placeMedia:'town',placePhoto:'town',photoFocus:2}};
describe('evidence carried into the route observation plan',()=>{
 it('exports the saved evidence even when the current return position is back in the mountains',()=>{
  const note:PilotNote={version:1,note:'河流问题',observation:origin,returnTo:{...origin,beatIndex:1,raw:.43,view:{mode:'line',progress:.668,height:3000,connections:false,lookBack:false}}};
  const md=pilotPlanMarkdown(note);expect(md).toContain('当前对象：道路');expect(md).toContain('Lulang_Town.jpg');expect(md).toContain('观察记录位置：进入鲁朗');expect(md).not.toContain('观察记录位置：沿路观察');
 });
 it('carries the actual selected object, photograph date and license without asserting a historical reconstruction',()=>{
  const result=pilotObservation(origin)!;
  expect(result.title).toBe('河流、道路与聚落 · 道路');expect(result.selected?.title).toBe('道路');
  expect(result.photo?.date).toBe('2024-09-22');expect(result.sources.some(s=>s.title==='CC BY-SA 4.0')).toBe(true);
  expect(result.boundary).toContain('不是2017年的空间复原');expect(result.returnDescription).toContain('44%');
 });
 it('does not put excluded footage or watermarked regional stills back into a plan',()=>{
  for(const placePhoto of ['customs','target'] as const){
   const result=pilotObservation({...origin,view:{...origin.view,placePhoto}})!;
   expect(result.photo?.id).toBe('daily');expect(result.photo?.src).not.toMatch(/customs|target/);expect(result.selected).toBeUndefined();
  }
 });
 it('appends a question once without altering, truncating or replacing the existing user note',()=>{
  const before='原有文字  \n',question='河流与道路怎样相邻？',next=appendPilotQuestion(before,question);
  expect(next).toBe(before+'\n\n'+question);expect(appendPilotQuestion(next,question)).toBe(next);
  const full='甲'.repeat(1998);expect(appendPilotQuestion(full,question)).toBe(full);expect(appendPilotQuestion('',question)).toBe(question);
 });
 it('exports the note, actual source/rights and evidence boundary, including old notes without an origin',()=>{
  const note:PilotNote={version:1,note:'我还需要核实桥与支路的关系。',returnTo:origin};
  const md=pilotPlanMarkdown(note);expect(md).toContain(note.note);expect(md).toContain('Lulang_Town.jpg');expect(md).toContain('CC BY-SA 4.0');expect(md).toContain('当前对象：道路');expect(md).toContain('原讲述44%');expect(md).not.toContain('127.0.0.1');
  expect(pilotPlanMarkdown({version:1,note:'旧版笔记'})).toContain('旧版笔记');
  expect(pilotObservation(undefined)).toBeUndefined();
 });
});
