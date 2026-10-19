import {describe,it,expect} from 'vitest';
// @ts-expect-error Node belongs to the runner.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node belongs to the runner.
import {createHash} from 'node:crypto';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {lulangCookingState,lulangMediaFeedback} from '../src/data/lulangLife';
import {narrationTimingAt} from '../src/lib/narrationTiming';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
describe('dated real photographs and separately illustrated process',()=>{
 it('keeps asset hashes, licenses and camera coordinates within the local area and discloses gaps',()=>{
  const ledger=json('public/data/lulang-life-media.json');
  expect(ledger.photos.map((p:any)=>p.date)).toEqual(['2024-09-22','2008-09-18']);
  for(const asset of [...ledger.photos,ledger.illustration])expect(createHash('sha256').update(readFileSync('public'+asset.src)).digest('hex')).toBe(asset.sha256);
  for(const p of ledger.photos){expect(p.license).toMatch(/^CC BY/);expect(p.coordinate[0]).toBeGreaterThan(94.715);expect(p.coordinate[0]).toBeLessThan(94.75);expect(p.coordinate[1]).toBeGreaterThan(29.705);expect(p.coordinate[1]).toBeLessThan(29.755);}
  expect(ledger.illustration.kind).toContain('非现场影像');expect(ledger.gaps.length).toBeGreaterThan(0);expect(ledger.rejectedMedia).toHaveLength(3);
 });
 it('uses exact recording words for photos, cooking and supply comparisons, including reverse seeking',()=>{
  const cue=routePilotCues[2],clip=json('public/assets/audio/narration/cue-manifest.json').clips.find((c:any)=>c.cueId===cue.id),timeline=json('public'+clip.subtitleUrl);
  expect(clip.duration).toBeLessThanOrEqual(47.736);expect(clip.text).toBe(cue.narration);
  const states=Array.from({length:Math.ceil(clip.duration*20)},(_,i)=>{const timing=narrationTimingAt(cue.narration,i/20,clip.duration,timeline);return {at:timing.textProgress*cue.narration.length,view:pilotNarratedView(2,cue.narration,timing.textProgress)};});
  for(const [media,token] of [['town','现在看二零二四'],['process','再看餐饮'],['daily','最后看二零零八']] as const){const first=states.find(s=>s.view.placeMedia===media);expect(first).toBeDefined();expect(first!.at).toBeGreaterThanOrEqual(cue.narration.indexOf(token));}
  const gap=states.find(s=>s.view.cultureSupply===false)!;expect(gap.at).toBeGreaterThanOrEqual(cue.narration.indexOf('移去供货条件'));expect(lulangCookingState(gap.view).ready).toBe(false);
  expect(states.find(s=>s.at>cue.narration.indexOf('恢复联系'))!.view.cultureSupply).toBe(true);
  expect(pilotNarratedView(2,cue.narration,0)).toMatchObject({placeMedia:'map',cultureSupply:true,cookingProgress:0});
  const daily=states.find(s=>s.view.placeMedia==='daily')!.view;expect(lulangMediaFeedback(daily)).toContain('不能证明2017');
 });
});
