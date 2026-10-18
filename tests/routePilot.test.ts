import {describe,it,expect} from 'vitest';
// @ts-expect-error Node is provided by the Vitest runner, not the browser types.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node is provided by the Vitest runner, not the browser types.
import {createHash} from 'node:crypto';
import {routePilotCues,pilotNarratedView} from '../src/data/routePilot';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {overviewMainProgram} from '../src/data/overviewProgram';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const root='public/assets/routes/g318/';
const meta=json(root+'manifest.json'),route=json(root+'route.json');
const cues=json('public/assets/audio/narration/cue-manifest.json');
describe('real G318 corridor and source boundaries',()=>{
 it('preserves original nodes, source edges and local geometry, with complete raster coverage',()=>{
  const source=json('public/data/local-places/transport-corridors.manifest.json').routes.find((r:any)=>r.id===route.id);
  expect(route).toEqual(source);expect(route.coordinates).toHaveLength(1147);expect(route.sourceWayIdsByEdge).toHaveLength(1146);
  expect(json(root+'lulang.geojson')).toEqual(json('public/data/local-places/lulang.geojson'));
  for(const [lon,lat] of route.coordinates){expect(lon).toBeGreaterThanOrEqual(meta.bbox[0]);expect(lon).toBeLessThanOrEqual(meta.bbox[2]);expect(lat).toBeGreaterThanOrEqual(meta.bbox[1]);expect(lat).toBeLessThanOrEqual(meta.bbox[3]);}
  for(const [name,file] of Object.entries<any>(meta.files)){const bytes=readFileSync(root+name);expect(bytes.length).toBe(file.bytes);expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(file.sha256);}
  const bytes=readFileSync(root+'terrain.int16');expect(bytes.length).toBe(meta.columns*meta.rows*2);
  let invalid=0;for(let i=0;i<bytes.length;i+=2)if(bytes.readInt16LE(i)<=0)invalid++;expect(invalid).toBe(0);
  expect(meta.imagery.missingFraction).toBeLessThan(.001);expect(meta.verticalExaggeration).toBe(1);
 });
 it('ties observations to source nodes, distinguishes sample height from a surveyed mountain pass, and dates history',()=>{
  const obs=json(root+'observations.json');expect(obs.points).toHaveLength(3);
  for(const p of obs.points){expect(p.coordinate).toEqual(route.coordinates[p.sourceNodeIndex]);expect(p.sourceNodeId).toBe(route.sourceNodeIds[p.sourceNodeIndex]);expect(p.scope).toContain('未核实');}
  expect(obs.points[1].surfaceElevationMetres).toBeGreaterThan(4500);expect(obs.points[1].surfaceElevationMetres).toBeLessThan(4600);
  expect(obs.points[1].progress).toBeGreaterThan(.6);expect(obs.method).toContain('不是色季拉山口实测');
  expect(obs.history.map((x:any)=>x.date)).toEqual(['2016-10-01','2017']);
 });
 it('has native-word recordings for all four cues while freezing the original six-chapter baseline',()=>{
  expect(overviewMainProgram.chapters).toHaveLength(6);expect(overviewMainProgram.beats).toHaveLength(21);
  expect(overviewMainProgram.beats.reduce((s,b)=>s+cues.clips.find((c:any)=>c.cueId===b.recordingId&&c.text===b.text).duration,0)).toBeCloseTo(750.024,3);
  for(const cue of routePilotCues){const clip=cues.clips.find((c:any)=>c.cueId===cue.id&&c.text===cue.narration);expect(clip?.timingLevel,cue.id).toBe('word');const words=json('public'+clip.subtitleUrl);expect(words.words.length).toBeGreaterThan(100);}
 });
});
describe('the recording owns the route, camera and local comparison',()=>{
 it('holds the actual high sample for the spoken comparison, then continues to the same endpoint',()=>{
  const text=routePilotCues[1].narration,at=(token:string)=>pilotNarratedView(1,text,text.indexOf(token)/text.length,.668);
  expect(at('停在山地观察点')).toMatchObject({mode:'line',progress:.668,lookBack:true});
  expect(at('这里按沿线')).toMatchObject({progress:.668,lookBack:false});
  expect(at('接下来进入鲁朗')).toMatchObject({progress:1});
 });
 it('opens actual local connections only at the matching native word, including reverse seek',()=>{
  const cue=routePilotCues[2],clip=cues.clips.find((c:any)=>c.cueId===cue.id),timeline=json('public'+clip.subtitleUrl);
  const readings=Array.from({length:451},(_,i)=>{const timing=narrationTimingAt(cue.narration,i/10,clip.duration,timeline);return {timing,view:pilotNarratedView(2,cue.narration,timing.textProgress)};});
  const first=readings.findIndex(x=>x.view.connections);expect(first).toBeGreaterThan(0);
  expect(readings[first].timing.textProgress*cue.narration.length).toBeGreaterThanOrEqual(cue.narration.indexOf('再展开地方接续'));
  expect(pilotNarratedView(2,cue.narration,0).connections).toBe(false);
 });
});
