// @ts-expect-error Test-only source archive verification.
import {readFileSync} from 'node:fs';
import {describe,it,expect,vi} from 'vitest';
import * as THREE from 'three';
import data from '../public/data/narrated-geography.json';
import {overviewMainProgram,overviewPrograms} from '../src/data/overviewProgram';
import {narratedGeographyPlans,narratedGeographyState} from '../src/lib/narratedGeography';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import {buildNarratedGeographyReading,buildMountainReading} from '../src/scene/narratedGeographyReading';
vi.mock('../src/scene/environment',async original=>({...await original<typeof import('../src/scene/environment')>(),label:()=>new THREE.Sprite(new THREE.SpriteMaterial())}));
describe('the main programme shows the places and relations it names',()=>{
 it('redrapes windows and route bands after terrain loads or height scale changes without moving longitude/latitude',()=>{
  let height=0;const at=(lon:number,lat:number,h=0)=>new THREE.Vector3(lon,height+h,lat);
  const model=buildNarratedGeographyReading(new THREE.PerspectiveCamera(),at),size=new THREE.Vector2(900,700);
  const state={progress:.4,rivers:true,title:'',relation:'',kind:'rail' as const,cities:['lhasa' as const]};
  model.update(state,size);
  const window=model.group.children.find(c=>c.userData.cityId==='lhasa')!;
  const patch=(window.children[0] as THREE.Mesh).geometry.getAttribute('position');
  const x=patch.getX(0),z=patch.getZ(0);
  const rail=model.group.children.find(c=>c.userData.kind==='source-connected-lhasa-nyingchi-rail')!;
  for(const next of [3,.3375,3,0]){
   height=next;model.update(state,size);
   expect(patch.getY(0)).toBeCloseTo(next+.025,5);
   expect(patch.getX(0)).toBe(x);expect(patch.getZ(0)).toBe(z);
   const start=(rail.children[0] as THREE.Mesh).geometry.getAttribute('instanceStart');
   expect(start.getY(0)).toBeCloseTo(next+.09,5);
  }
 });
 it('preserves every displayed rail edge and never connects disconnected source nodes',()=>{
  const raw=JSON.parse(readFileSync('qa/narrated-geography-20261017/lalin-area-osm.json','utf8'));
  const byId=new Map<number,{nodes:number[];geometry:{lon:number;lat:number}[]}>(raw.elements.map((w:{id:number})=>[w.id,w]));
  expect(data.railParts.length).toBeGreaterThan(300);
  data.railParts.forEach((part,index)=>{
   const way=byId.get(part.wayId)!;expect(way).toBeDefined();
   part.nodeIds.forEach((node,i)=>{const j=way.nodes.indexOf(node);expect(j).toBeGreaterThanOrEqual(0);expect(part.coordinates[i]).toEqual([way.geometry[j].lon,way.geometry[j].lat]);if(i)expect(Math.abs(j-way.nodes.indexOf(part.nodeIds[i-1]))).toBe(1);});
   if(index)expect(data.railParts[index-1].nodeIds.at(-1)).toBe(part.nodeIds[0]);
  });
  expect(data.railParts.some(p=>p.tags.tunnel==='yes')).toBe(true);
  expect(data.railParts.some(p=>p.tags.bridge==='yes')).toBe(true);
  expect(data.stations.map(s=>s.tags.name).sort()).toEqual(['山南','拉萨','林芝'].sort());
 });
 it('binds all new readings to actual native words, preserving raw-independent backward seeks',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  for(const [id,stops] of Object.entries(narratedGeographyPlans)){
   const beat=overviewPrograms.flatMap(p=>p.beats).find(b=>b.recordingId===id)!;expect(beat,id).toBeDefined();
   const clip=manifest.clips.find((c:{cueId:string})=>c.cueId===id),timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8')) as NarrationTimeline;
   expect(clip.text).toBe(beat.text);let previous=-1;
   for(const stop of stops){
    const offset=beat.text.indexOf(stop.token);expect(offset).toBeGreaterThan(previous);previous=offset;
    const word=timeline.words!.find(w=>w.textEnd>offset)!,time=word.start+(word.end-word.start)*.8;
    const timing=narrationTimingAt(beat.text,time,timeline.duration,timeline),a=overviewPresentation(beat,.01,timing),b=overviewPresentation(beat,.99,timing);
    expect(a.props.narratedGeography).toEqual(b.props.narratedGeography);
    if(id==='OVERVIEW-history-origins'&&stop.token==='再看西部托林'){
     // The shipped V1.2 exchange process replaced this earlier locator overlay.
     expect(a.props.narratedGeography).toBeUndefined();expect(a.props.overviewFocusedProcess?.kind).toBe('exchange');
     expect(a.props.overviewFocusedProcess).toEqual(b.props.overviewFocusedProcess);
    }else expect(a.props.narratedGeography).toMatchObject({kind:stop.kind,cities:stop.cities});
   }
  }
  expect(narratedGeographyState('OVERVIEW-conclusion','',undefined)).toBeUndefined();
 });
 it('changes draped surface windows and source railway geometry, not only labels',()=>{
  const at=(lon:number,lat:number,h=0)=>new THREE.Vector3(lon,Math.sin(lon)+Math.cos(lat)+h,lat),camera=new THREE.PerspectiveCamera(),size=new THREE.Vector2(900,700);
  const model=buildNarratedGeographyReading(camera,at),base={progress:.4,rivers:true,title:'',relation:''};
  model.update({...base,kind:'rail',cities:['lhasa','shannan','nyingchi']},size);
  expect(model.group.children.filter(c=>c.visible&&c.userData.kind==='dem-observation-window')).toHaveLength(3);
  const rail=model.group.children.find(c=>c.userData.kind==='source-connected-lhasa-nyingchi-rail')!;
  expect(rail.visible).toBe(true);expect(rail.children.filter(c=>c.type==='LineSegments2')).toHaveLength(3);
  model.update({...base,kind:'regions',cities:['nagqu','ngari']},size);
  expect(rail.visible).toBe(false);expect(model.group.children.filter(c=>c.visible&&c.userData.kind==='dem-observation-window')).toHaveLength(2);
  model.update(undefined,size);expect(model.group.visible).toBe(false);
  const mountain=buildMountainReading(at);mountain.update(true,.5);
  const surface=mountain.group.children[0] as THREE.Mesh;
  expect(surface.geometry.index!.count).toBeGreaterThan(300);
  const heights=surface.geometry.attributes.position;expect(heights.getY(0)).not.toBe(heights.getY(100));
  const fullCount=surface.geometry.index!.count;
  mountain.update(true,.5,88);
  expect(surface.geometry.index!.count).toBeLessThan(fullCount);
  expect(Array.from(surface.geometry.index!.array).every(index=>heights.getX(index)<=88)).toBe(true);
  mountain.update(true,.5);expect(surface.geometry.index!.count).toBe(fullCount);
  mountain.update(false,0);expect(mountain.group.visible).toBe(false);
 });
 it('uses the same 100 km comparison transect on the map and restores archived windows outside the comparison',()=>{
  const model=buildNarratedGeographyReading(new THREE.PerspectiveCamera(),(lon,lat,h=0)=>new THREE.Vector3(lon,h,lat)),size=new THREE.Vector2(900,700);
  const state={kind:'regions' as const,cities:['nyingchi' as const],rivers:true,progress:1,title:'',relation:''};
  model.update({...state,compareProfiles:true},size);
  const window=model.group.children.find(c=>c.userData.cityId==='nyingchi')!,section=window.children[2] as THREE.Line;
  const positions=section.geometry.getAttribute('position');expect(positions.count).toBe(21);
  const width=(positions.getX(20)-positions.getX(0))*111.32*Math.cos(positions.getZ(0)*Math.PI/180);
  expect(width).toBeCloseTo(100,1);
  model.update(state,size);expect(section.geometry.getAttribute('position').count).toBe(61);
 });
});
