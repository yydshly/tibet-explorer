import {describe,it,expect,vi,afterEach} from 'vitest';
// @ts-expect-error Node is provided by Vitest, not the browser type environment.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node is provided by Vitest, not the browser type environment.
import {createHash} from 'node:crypto';
import {bomiCues,bomiNarratedView,type BomiView} from '../src/data/bomiJourney';
import {bomiControlsKey,readBomiObservation,saveBomiObservation} from '../src/lib/bomiReturn';
import {narrationTimingAt} from '../src/lib/narrationTiming';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const root='public/assets/routes/g318-bomi/',meta=json(root+'manifest.json'),geo=json(root+'geometry.json');
afterEach(()=>vi.unstubAllGlobals());
describe('R07 Tongmai–Bomi original-road and dated-place handoff',()=>{
 it('continues from exactly the frozen Tongmai endpoint through original source edges to the Zhamu vicinity',()=>{
  const old=json('public/assets/routes/g318-tongmai/geometry.json'),source=json('public/project-review/corridor-evidence/g318-source-chain.geojson'),r=geo.route;
  const i=source.properties.sourceNodeIds.indexOf(r.sourceNodeIds[0]);
  expect(i).toBe(2100);expect(r.sourceNodeIds[0]).toBe(old.route.sourceNodeIds.at(-1));expect(r.coordinates[0]).toEqual(old.route.coordinates.at(-1));
  expect(r.coordinates).toEqual(source.geometry.coordinates.slice(i));expect(r.sourceNodeIds).toEqual(source.properties.sourceNodeIds.slice(i));
  expect(r.sourceWayIdsByEdge).toEqual(source.properties.sourceWayIdsByEdge.slice(i));expect(r.coordinates).toHaveLength(1064);
  expect(geo.place.node).toBe(766963429);expect(r.sourceNodeIds.at(-1)).toBe(841510013);
  expect(geo.place.coordinate).not.toEqual(r.coordinates.at(-1));
 });
 it('verifies actual production bytes, valid elevation, bounded imagery and the unchanged free dated original',()=>{
  for(const [name,item] of Object.entries<any>(meta.files)){const bytes=readFileSync(root+name);expect(bytes.length).toBe(item.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256);}
  const grid=readFileSync(root+'terrain.int16');expect(grid.length).toBe(meta.columns*meta.rows*2);for(let i=0;i<grid.length;i+=2)if(grid.readInt16LE(i)<=0)throw Error('Missing source elevation');
  expect(meta.verticalExaggeration).toBe(1);expect(meta.imagery.date).toBe('2025-12-13');expect(meta.imagery.missingFraction).toBe(0);
  expect(meta.localImagery.allBlackFraction).toBeGreaterThan(0);expect(meta.localImagery.allBlackFraction).toBeLessThan(1e-5);
  expect(meta.photo).toMatchObject({date:'2008-09-17',author:'reurinkjan',license:'CC BY 2.0',width:999,height:664});
  expect(meta.files['bomi-street-20080917.jpg'].sha256).toBe('a7e3abfc526fd166aaacb8a0ddff1e534591ff39ea509c47ba9b9707cdfb55f1');
  expect(meta.sources.map((s:any)=>s.date)).toEqual(['2023-07-04','2020-08-27']);
 });
 it('changes route/valley views and street objects at the actual native words in both seek directions, within the R07 ceiling',()=>{
  const manifest=json('public/assets/audio/narration/cue-manifest.json');let duration=0;
  const checks=[
   [['真实弯道中',{phase:'travel'}],['先俯视',{phase:'valley',overhead:true,focus:'river'}],['再斜看',{phase:'valley',overhead:false,focus:'mountain'}]],
   [['先看行人',{phase:'photo',photoObject:0}],['车辆与临街建筑',{phase:'photo',photoObject:1}],['临街建筑',{phase:'photo',photoObject:2}],['回到河谷',{phase:'life'}],['波卓',{phase:'culture'}]],
   [['回到进入前',{phase:'valley'}],['再回看',{phase:'whole'}]],
  ] as const;
  bomiCues.forEach((cue,i)=>{
   const asset=manifest.clips.find((c:any)=>c.cueId===cue.id&&c.text===cue.narration);expect(asset?.timingLevel).toBe('word');duration+=asset.duration;
   const timeline=json('public'+asset.subtitleUrl);
   for(const [phrase,expected] of [...checks[i],...checks[i].slice().reverse()]){
    const index=cue.narration.indexOf(phrase),word=timeline.words.find((w:any)=>w.textEnd>index&&w.textStart<=index);expect(word,phrase).toBeDefined();
    const timing=narrationTimingAt(cue.narration,word.end-.00001,asset.duration,timeline);
    expect(bomiNarratedView(i,timing.textProgress),phrase).toMatchObject(expected);
   }
  });expect(duration).toBeCloseTo(48.744,3);expect(duration).toBeLessThanOrEqual(50);
 });
 it('preserves a mid-route observation origin independently and rejects corrupt saved framing',()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  const origin:BomiView={phase:'travel',progress:.427,overhead:true,focus:'both',photoObject:0};
  const state={version:1 as const,view:{...origin,phase:'photo' as const,photoObject:2 as const},lineReturn:{beatIndex:0,raw:.381,view:origin},skipLocal:true};
  expect(saveBomiObservation(state)).toBe(true);expect(readBomiObservation()).toEqual(state);expect(values.has(bomiControlsKey)).toBe(true);
  values.set(bomiControlsKey,JSON.stringify({...state,view:{...origin,progress:NaN},lineReturn:{...state.lineReturn,raw:2}}));
  expect(readBomiObservation()).toEqual({version:1,view:undefined,lineReturn:undefined,skipLocal:true});
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
  expect(readBomiObservation()).toEqual({version:1,skipLocal:false});expect(saveBomiObservation(state)).toBe(false);
 });
});
