import {describe,it,expect} from 'vitest';
// @ts-expect-error Node is provided by Vitest, not the browser type environment.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node is provided by Vitest, not the browser type environment.
import {createHash} from 'node:crypto';
import {tongmaiCues,tongmaiNarratedView,tongmaiWordFraction} from '../src/data/tongmaiJourney';
import {narrationTimingAt} from '../src/lib/narrationTiming';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const root='public/assets/routes/g318-tongmai/',meta=json(root+'manifest.json'),geo=json(root+'geometry.json');
describe('bounded actual Lulang–Tongmai extension',()=>{
 it('starts at the original main-road junction, preserves every archived source edge and never snaps from the pilot branch',()=>{
  const source=json('public/project-review/corridor-evidence/g318-source-chain.geojson'),i=source.properties.sourceNodeIds.indexOf(7365874802),r=geo.route;
  expect(r.coordinates).toEqual(source.geometry.coordinates.slice(i,i+r.coordinates.length));
  expect(r.sourceNodeIds).toEqual(source.properties.sourceNodeIds.slice(i,i+r.coordinates.length));
  expect(r.sourceWayIdsByEdge).toEqual(source.properties.sourceWayIdsByEdge.slice(i,i+r.coordinates.length-1));
  expect(r.sourceNodeIds[0]).toBe(7365874802);expect(r.coordinates).toHaveLength(969);
  expect(r.sourceWayIdsByEdge).toContain(539990326);expect(r.sourceWayIdsByEdge).toContain(624160737);
  expect(r.wayTags['539990326'].bridge).toBe('yes');expect(r.wayTags['624160737'].tunnel).toBe('yes');
 });
 it('keeps the actual confluence in both original river paths, with no invented joining geometry',()=>{
  const point=geo.confluence.coordinate;
  for(const group of ['yigong','parlung'])expect(geo.water.filter((r:any)=>r.group===group).some((r:any)=>r.coordinates.some((p:number[])=>p.every((v,i)=>v===point[i])))).toBe(true);
  expect(geo.confluence.node).toBe(289310112);
 });
 it('has a complete valid production elevation grid and truthful image crop with immutable original photo',()=>{
  for(const [name,item] of Object.entries<any>(meta.files)){const bytes=readFileSync(root+name);expect(bytes.length).toBe(item.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256);}
  const grid=readFileSync(root+'terrain.int16');expect(grid.length).toBe(meta.columns*meta.rows*2);for(let i=0;i<grid.length;i+=2)if(grid.readInt16LE(i)<=0)throw Error('Missing elevation');
  expect(meta.verticalExaggeration).toBe(1);expect(meta.imagery.sources).toHaveLength(2);expect(meta.imagery.missingFraction).toBeLessThan(1e-6);
  expect(meta.photo.license).toBe('CC BY-SA 4.0');expect(meta.photo.date).toBe('2014-09-21');
  expect(meta.files['tongmai-20140921.jpg'].sha256).toBe('10c91a1f6a15bbe588e8c993a3dd0a87576cccd4880125b3ac8a71359bf0721e');
 });
 it('drives historical photograph, bridge and tunnel views from the corresponding real recording words, including backward seeks',()=>{
  const manifest=json('public/assets/audio/narration/cue-manifest.json');
  const checks=[['先认清易贡藏布','rivers'],['现在看二零一四','archive'],['回到有来源','bridge'],['再看飞石崖隧道','tunnel'],['拉回峡谷','whole']] as const;
  const cue=tongmaiCues[1],clip=manifest.clips.find((c:any)=>c.cueId===cue.id&&c.text===cue.narration);expect(clip?.timingLevel).toBe('word');
  const timeline=json('public'+clip.subtitleUrl);
  for(const [phrase,phase] of [...checks,...checks.slice().reverse()]){
   const index=cue.narration.indexOf(phrase),word=timeline.words.find((w:any)=>w.textEnd>index&&w.textStart<=index);
   expect(word,phrase).toBeDefined();const time=word.end-.00001;
   const timing=narrationTimingAt(cue.narration,time,clip.duration,timeline);
   expect(tongmaiNarratedView(1,timing.textProgress).phase,phrase).toBe(phase);
  }
  for(const c of tongmaiCues){const asset=manifest.clips.find((a:any)=>a.cueId===c.id&&a.text===c.narration);expect(asset?.timingLevel).toBe('word');}
  expect(tongmaiCues.reduce((sum,c)=>sum+manifest.clips.find((x:any)=>x.cueId===c.id).duration,0)).toBeLessThanOrEqual(100);
 });
 it('finishes the original-node approach before inspecting the crossing rather than teleporting between places',()=>{
  const text=tongmaiCues[0].narration;
  const views=['镜头沿','再拉高视野','来到通麦附近'].map(p=>tongmaiNarratedView(0,tongmaiWordFraction(text,p)+.00001));
  expect(views[0].progress).toBeLessThan(views[1].progress);expect(views[1].progress).toBeLessThan(views[2].progress);expect(views[2]).toMatchObject({phase:'whole',progress:.98});
 });
});
