import {describe,it,expect} from 'vitest';
import before from '../qa/mainline-editorial-20261018/before.json';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {understandingChecks} from '../src/data/overviewLearning';
describe('editorial completeness and usable understanding checks',()=>{
 it('never loses an original recording when shortening the main programme',()=>{
  const all=[...overviewMainProgram.beats,...overviewDepthPrograms.flatMap(p=>p.beats)];
  for(const old of before.chapters.flatMap(c=>c.beats))expect(all.some(b=>b.id===old.id&&b.recordingId===old.recordingId),old.id).toBe(true);
 });
 it('every chapter offers an actionable revisit in the main programme',()=>{
  for(const c of overviewMainProgram.chapters){const check=understandingChecks[c.id];expect(check,c.id).toBeDefined();expect(c.beats.some(b=>b.id===check.revisit),check.revisit).toBe(true);}
 });
});
