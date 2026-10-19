import {describe,it,expect} from 'vitest';
// @ts-expect-error Node belongs to the runner.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node belongs to the runner.
import {createHash} from 'node:crypto';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {lulangCookingState,lulangMediaFeedback,lulangLifePhase,lulangLifeRecord,lulangSelectedPhoto,lulangDisplayView,lulangDisplayPhotos} from '../src/data/lulangLife';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {lulangFootage,lulangFootagePlayer,lulangFootageFeedback,selectedLulangFootage} from '../src/data/lulangFootage';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
describe('dated real photographs and separately illustrated process',()=>{
 it('retains historical publisher URLs without treating meal footage as cooking or supplier evidence',()=>{
  for(const f of lulangFootage){const url=new URL(lulangFootagePlayer(f.id));expect(url.origin).toBe('https://player.bilibili.com');expect(url.searchParams.get('bvid')).toBe(f.bvid);expect(url.searchParams.get('autoplay')).toBe('0');expect(url.searchParams.get('danmaku')).toBe('0');expect(f.scope).toContain('未');}
  expect(lulangFootageFeedback({footageId:'dining-2023'})).toContain('不是厨房或供货');
  expect(selectedLulangFootage({} as any).id).toBe('dining-2023');
 });
 it('keeps asset hashes, licenses and camera coordinates within the local area and discloses gaps',()=>{
  const ledger=json('public/data/lulang-life-media.json');
  expect(ledger.photos).toHaveLength(7);expect(ledger.fieldAudit.regionalPhotoIds).toEqual(['customs','target']);
  for(const asset of [...ledger.photos,ledger.illustration])expect(createHash('sha256').update(readFileSync('public'+asset.src)).digest('hex')).toBe(asset.sha256);
  for(const p of ledger.photos){expect(p.license).toMatch(/^CC BY/);if(p.kind==='video-still'){expect(p.coordinate).toBeUndefined();expect(p.scope).toContain('未核实');}else{expect(p.coordinate[0]).toBeGreaterThan(94.30);expect(p.coordinate[0]).toBeLessThan(94.82);expect(p.coordinate[1]).toBeGreaterThan(29.51);expect(p.coordinate[1]).toBeLessThan(29.81);}}
  expect(ledger.illustration.kind).toContain('非现场影像');expect(ledger.gaps.length).toBeGreaterThan(0);expect(ledger.rejectedMedia).toHaveLength(3);
 });
 it('keeps the macro journey on native words, without automatic cooking or third-party playback',()=>{
  const cue=routePilotCues[2],clip=json('public/assets/audio/narration/cue-manifest.json').clips.find((c:any)=>c.cueId===cue.id),timeline=json('public'+clip.subtitleUrl);
  expect(clip.duration).toBeLessThanOrEqual(45.792);expect(clip.text).toBe(cue.narration);
  const states=Array.from({length:Math.ceil(clip.duration*20)},(_,i)=>{const timing=narrationTimingAt(cue.narration,i/20,clip.duration,timeline);return {at:timing.textProgress*cue.narration.length,view:pilotNarratedView(2,cue.narration,timing.textProgress)};});
  for(const [photo,token] of [['forest','对照林海实拍'],['town','进入二零二四'],['grazing','草地与放牧'],['daily','街边日常']] as const){const first=states.find(s=>s.view.placePhoto===photo);expect(first).toBeDefined();expect(first!.at).toBeGreaterThanOrEqual(cue.narration.indexOf(token));}
  expect(states.some(s=>s.view.placeMedia==='process'||s.view.placeMedia==='record'||s.view.servicesVisible)).toBe(false);
  expect(pilotNarratedView(2,cue.narration,0)).toMatchObject({placeMedia:'map',cultureSupply:true,cookingProgress:0});
  expect(pilotNarratedView(2,cue.narration,cue.narration.indexOf('开敞地')/cue.narration.length)).toMatchObject({placePhoto:'forest',photoFocus:2});
  const daily=states.find(s=>s.view.placeMedia==='daily')!.view;expect(lulangSelectedPhoto(daily).id).toBe('daily');
  expect(states.some(s=>s.view.placePhoto==='customs'||s.view.photoOverlay==='customs'||s.view.placePhoto==='target')).toBe(false);
  for(const [token,focus] of [['看门面',1],['门前活动',2],['共同停留',3]] as const)expect(pilotNarratedView(2,cue.narration,(cue.narration.indexOf(token)+token.length)/cue.narration.length)).toMatchObject({placePhoto:'daily',photoFocus:focus});
 });
 it('recovers legacy marked images and unverified players to reviewed clean photographs',()=>{
  const original={...pilotNarratedView(2,routePilotCues[2].narration,.6),placePhoto:'customs' as const,placeMedia:'town' as const,photoOverlay:'target' as const,photoFocus:3};
  expect(lulangDisplayPhotos.map(p=>p.id)).toEqual(['forest','meadow','grazing','town','daily']);
  expect(lulangDisplayView(original)).toMatchObject({placePhoto:'daily',placeMedia:'daily',photoFocus:0,photoOverlay:undefined});
  expect(lulangSelectedPhoto(original).id).toBe('daily');
  expect(lulangDisplayView({...original,placeMedia:'record',footageId:'aerial-2022'})).toMatchObject({placePhoto:'town',placeMedia:'town'});
 });
 it('retains the optional food illustration and source distinction outside the default journey',()=>{
  const view={...pilotNarratedView(2,routePilotCues[2].narration,0),placeMedia:'process' as const,placeLens:'culture' as const,cookingProgress:.3,lifePhase:'making' as const};
  expect(lulangCookingState(view).step).toBe(1);expect(lulangLifeRecord(view).text).toContain('炒制');
  const gap={...view,cultureSupply:false};
  expect(lulangLifePhase(gap)).toBe('supply');expect(lulangMediaFeedback(gap)).toContain('已做好的菜不会凭空消失');
  expect(lulangLifePhase({...gap,cultureSupply:true})).toBe('making');
 });
});
