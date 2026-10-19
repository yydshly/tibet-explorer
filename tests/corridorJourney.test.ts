import {describe,it,expect,vi,afterEach} from 'vitest';
// @ts-expect-error Node belongs to Vitest.
import {readFileSync} from 'node:fs';
import {corridorBeats,corridorShots,corridorNarratedView,corridorShot} from '../src/data/corridorJourney';
import {corridorPhoto,corridorPlanMarkdown,savedCorridorObservation} from '../src/data/corridorObservation';
import {readCorridorNote,writeCorridorNote,corridorNoteKey} from '../src/lib/corridorStore';
import {narrationTimingAt} from '../src/lib/narrationTiming';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
afterEach(()=>vi.unstubAllGlobals());
describe('complete corridor editorial contract',()=>{
 it('retains source-node markers, reuses seven exact recordings and stays inside every approved shot budget',()=>{
  const e=json('public/assets/routes/g318-corridor/edit.json'),source=json('public/project-review/corridor-evidence/g318-source-chain.geojson'),manifest=json('public/assets/audio/narration/cue-manifest.json');
  for(const m of e.markers){expect(m.coordinate).toEqual(source.geometry.coordinates[m.index]);expect(m.sourceNode).toBe(source.properties.sourceNodeIds[m.index]);}
  expect(e.markers.map((m:any)=>m.index)).toEqual([...e.markers.map((m:any)=>m.index)].sort((a,b)=>a-b));
  corridorShots.forEach((s,i)=>expect(e.shotSeconds[i]).toBeLessThanOrEqual(s[4]));expect(e.totalSeconds).toBeLessThan(410);expect(e.totalSeconds).toBeCloseTo(276.9692307692,6);
  const assets=corridorBeats.map(b=>manifest.clips.find((c:any)=>c.cueId===b.recordingId&&c.text===b.text));expect(assets.every(a=>a?.timingLevel==='word')).toBe(true);
  expect(corridorBeats.filter(b=>b.recordingId.includes('corridor-'))).toHaveLength(2);expect(corridorBeats.map(b=>b.recordingId)).not.toContain('ROUTE-G318-return');expect(corridorBeats.map(b=>b.recordingId)).not.toContain('ROUTE-G318-bomi-return');
 });
 it('locates R03/R04 and the R06 trim in native source words, without cutting the recordings',()=>{
  const e=json('public/assets/routes/g318-corridor/edit.json'),manifest=json('public/assets/audio/narration/cue-manifest.json');
  for(const [index,phrase,raw] of [[3,'认识人文',e.lulangCultureRaw],[5,'看完这段',e.tongmaiEnd]] as const){
   const b=corridorBeats[index],a=manifest.clips.find((c:any)=>c.cueId===b.recordingId),t=json('public'+a.subtitleUrl),word=t.words.find((w:any)=>w.textStart<=b.text.indexOf(phrase)&&w.textEnd>b.text.indexOf(phrase));expect(raw*a.duration).toBeCloseTo(word.start,8);
  }
  expect(corridorShot(3,0)).toBe(3);expect(corridorShot(3,1)).toBe(4);
 });
 it('revisits all five geographical roles on the actual closing word clock, including reverse seeks',()=>{
  const b=corridorBeats[8],m=json('public/assets/audio/narration/cue-manifest.json'),a=m.clips.find((c:any)=>c.cueId===b.recordingId),t=json('public'+a.subtitleUrl),terms=['林芝','色季拉','鲁朗','通麦','波密'];
  for(const i of [0,1,2,3,4,4,3,2,1,0]){const at=b.text.indexOf(terms[i]),w=t.words.find((w:any)=>w.textStart<=at&&w.textEnd>at),timing=narrationTimingAt(b.text,w.end-.00001,a.duration,t);expect(corridorNarratedView(8,timing.textProgress)).toMatchObject({kind:'overview',focus:i});}
  expect(corridorNarratedView(8,1)).toMatchObject({focus:-1,read:1});
 });
 it('keeps the actual captured photograph/object separate from later return targets and exports its provenance',()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  const view=corridorNarratedView(3,.26),photo=corridorPhoto(view);expect(photo).toBeDefined();
  const note={version:1 as const,returnPending:false,text:'比较河流与道路。',observation:'lulang-river',observationView:view,returnTo:{beatIndex:8,raw:.55,view:corridorNarratedView(8,.6)}};
  expect(writeCorridorNote(note)).toBe(true);expect(readCorridorNote()).toEqual(note);expect(savedCorridorObservation(note).source).toBe(photo!.source);
  const md=corridorPlanMarkdown(note);expect(md).toContain(photo!.source);expect(md).toContain(photo!.date);expect(md).toContain(photo!.license);expect(md).toContain('比较河流与道路。');expect(md).toContain('55.000%');
  values.set(corridorNoteKey,JSON.stringify({...note,returnTo:{...note.returnTo,raw:Infinity},observationView:{kind:'bomi',value:{phase:'invalid'}}}));expect(readCorridorNote().returnTo).toBeUndefined();expect(readCorridorNote().observationView).toBeUndefined();
 });
});
