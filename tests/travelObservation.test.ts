import {describe,it,expect,vi,afterEach} from 'vitest';
// @ts-expect-error Node belongs to Vitest.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node belongs to Vitest.
import {createHash} from 'node:crypto';
import {travelCues,travelBeats,travelFrame,travelPhotos,travelPositionKey} from '../src/data/travelObservation';
import {readTravelSession,writeTravelSession,travelSessionKey} from '../src/lib/travelObservationStore';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {corridorNarratedView} from '../src/data/corridorJourney';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
afterEach(()=>vi.unstubAllGlobals());
describe('traveler observations within the frozen corridor',()=>{
 it('binds all new speech to native words and supports reverse-seek visual correspondence',()=>{
  const manifest=json('public/assets/audio/narration/cue-manifest.json');
  const cases=[
   ['sejila',0,'沿原路上山',undefined,-1],['sejila',0,'道路弯入谷地','road',0],['sejila',0,'近处是积雪','road',1],['sejila',0,'两侧是林地','road',2],['sejila',0,'回到地图',undefined,-1],
   ['sejila',1,'看积雪坡面','weather',0],['sejila',1,'与云雾','weather',1],['sejila',1,'回到道路',undefined,-1],
   ['lulang',0,'林海实拍','forest',0],['lulang',0,'开敞地相邻','forest',1],['lulang',0,'再看草地与放牧','grazing',1],
   ['lulang',1,'河流穿过','town',0],['lulang',1,'道路联系','town',1],['lulang',1,'房屋分布','town',2],['lulang',1,'临街门面','daily',0],['lulang',1,'桌球活动','daily',1],['lulang',1,'共同停留','daily',2],
  ] as const;
  for(const [place,index,phrase,photo,focus] of [...cases,...[...cases].reverse()]){
   const beat=travelBeats(place)[index],asset=manifest.clips.find((c:any)=>c.cueId===beat.id&&c.text===beat.text);
   expect(asset?.timingLevel).toBe('word');const timeline=json('public'+asset.subtitleUrl),at=beat.text.indexOf(phrase);
   expect(at).toBeGreaterThanOrEqual(0);const word=timeline.words.find((w:any)=>w.textStart<=at&&w.textEnd>at);
   const timing=narrationTimingAt(beat.text,word.end-.00001,asset.duration,timeline),frame=travelFrame(place,index,timing.textProgress,.66);
   expect(frame.photo,phrase).toBe(photo);expect(frame.focus,phrase).toBe(focus);
  }
 });
 it('reads the photographed road from the narration clock and reverses on seek',()=>{
  const text=travelBeats('sejila')[0].text;
  const start=(text.indexOf('转到二零一五')+.1)/text.length,end=(text.indexOf('近处是积雪')+.1)/text.length;
  expect(travelFrame('sejila',0,start,.7,.56).roadRead).toBeLessThan(.02);
  expect(travelFrame('sejila',0,end,.7,.56).roadRead).toBe(1);
  expect(travelFrame('sejila',0,start,.7,.56).map.progress).toBe(.56);
  expect(travelFrame('sejila',0,start,.7,.56).roadRead).toBeLessThan(.02);
 });
 it('archives exact licensed originals while keeping source dates and unverified conditions visible',()=>{
  const m=json('public/assets/routes/g318-travel/manifest.json');expect(m.photos).toHaveLength(4);
  for(const p of m.photos){
   expect(createHash('sha256').update(readFileSync('public'+p.src)).digest('hex')).toBe(p.sha256);
   expect(p.license).toBe('CC BY-SA 3.0');expect(p.author).toBe('ping lin');expect(p.date).toContain('2015-04-10');
  }
  const used=new Set<string>();
  for(const place of ['sejila','lulang'] as const)for(let i=0;i<2;i++)for(let p=0;p<=1;p+=.01){const frame=travelFrame(place,i,p,.66);if(frame.photo)used.add(frame.photo);expect(frame.map.progress).toBeGreaterThanOrEqual(0);expect(frame.map.progress).toBeLessThanOrEqual(1);}
  expect([...used].sort()).toEqual(['daily','forest','grazing','road','town','weather']);
  expect(travelPhotos.weather.scope).toContain('不是实时');expect(travelPhotos.snow.scope).toContain('未清晰呈现南迦巴瓦');
  expect(travelCues).toHaveLength(4);expect(travelPositionKey('lulang')).not.toContain('overview-position');
 });
 it('retains the exact entry view/raw through refresh and rejects invalid return targets',()=>{
  const values=new Map<string,string>([['tibet-explorer.overview-position.v1','frozen-six'],['tibet-explorer.corridor-position.v1','frozen-line']]);
  vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
  const target={beatIndex:2,raw:.37123,view:corridorNarratedView(2,.37123,.66)},session={version:1 as const,place:'sejila' as const,returnTo:target};
  expect(writeTravelSession(session)).toBe(true);expect(readTravelSession()).toEqual(session);
  values.set(travelSessionKey,JSON.stringify({...session,returnTo:{...target,raw:1.2}}));expect(readTravelSession()).toBeUndefined();
  writeTravelSession(session);writeTravelSession(undefined);expect(readTravelSession()).toBeUndefined();
  expect(values.get('tibet-explorer.overview-position.v1')).toBe('frozen-six');expect(values.get('tibet-explorer.corridor-position.v1')).toBe('frozen-line');
 });
});
