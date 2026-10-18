// @ts-expect-error Test fixture filesystem access only.
import {readFileSync} from 'node:fs';
import {describe,it,expect,vi} from 'vitest';
import * as THREE from 'three';
import river from '../src/data/yarlung-river.json';
import {overviewBeats} from '../src/data/overviewJourney';
import {overviewRiverState,yarlungReadingCoordinates} from '../src/lib/overviewRiver';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import {buildOverviewRiverReading} from '../src/scene/overviewRiverReading';
vi.mock('../src/scene/environment',async original=>({...await original<typeof import('../src/scene/environment')>(),label:()=>new THREE.Sprite(new THREE.SpriteMaterial())}));
const beat=overviewBeats.find(b=>b.id==='OVERVIEW-protection')!;
describe('spoken river has a sourced visible course',()=>{
 it('joins only shared source endpoints and preserves archived geometry',()=>{
  expect(JSON.parse(readFileSync('public/data/hydrography/yarlung-river.geojson','utf8'))).toEqual(river);
  const raw=JSON.parse(readFileSync('qa/yarlung-sync-20261017/natural-earth-rivers.geojson','utf8'));
  river.features.forEach((feature,i)=>{
   expect(raw.features.find((f:typeof feature)=>f.properties.name===feature.properties.name)).toEqual(feature);
   if(i)expect(river.features[i-1].geometry.coordinates[0].at(-1)).toEqual(feature.geometry.coordinates[0][0]);
  });
  expect(yarlungReadingCoordinates).toHaveLength(river.features.reduce((n,f)=>n+f.geometry.coordinates[0].length,0)-3);
 });
 it('uses native word timing for emphasis, de-emphasis and backward seeks',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const clip=manifest.clips.find((c:{cueId:string})=>c.cueId===beat.id);
  expect(clip.text).toBe(beat.text);
  const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8')) as NarrationTimeline;
  const sample=(token:string)=>{
   const word=timeline.words!.find(w=>w.textEnd>beat.text.indexOf(token))!,time=(word.start+word.end)/2;
   return overviewPresentation(beat,.99,narrationTimingAt(beat.text,time,timeline.duration,timeline)).props.overviewRiver!;
  };
  const before=sample('把镜头'),active=sample('下游使用'),after=sample('羌塘的生态管护');
  expect(before).toEqual({reveal:0,emphasized:false});
  expect(active.emphasized).toBe(true);expect(active.reveal).toBeGreaterThan(0);
  expect(after).toBeUndefined();
  expect(sample('下游使用')).toEqual(active);
  expect(overviewRiverState('OVERVIEW-conclusion',beat.text,.5)).toBeUndefined();
 });
 it('actually changes visible 3D line geometry at the same clock and clears other chapters',()=>{
  const model=buildOverviewRiverReading(new THREE.PerspectiveCamera(),(lon,lat,h=0)=>new THREE.Vector3(lon,h,lat));
  const size=new THREE.Vector2(900,700),read=model.group.children[2] as THREE.Mesh<THREE.InstancedBufferGeometry>;
  model.update({reveal:.6,emphasized:true},size);
  expect(model.group.visible).toBe(true);expect(read.visible).toBe(true);
  expect(read.geometry.instanceCount).toBe(Math.floor((yarlungReadingCoordinates.length-1)*.6));
  model.update({reveal:1,emphasized:false},size);expect(read.visible).toBe(false);
  model.update({reveal:.2,emphasized:true},size);expect(read.geometry.instanceCount).toBe(Math.floor((yarlungReadingCoordinates.length-1)*.2));
  model.update(undefined,size);expect(model.group.visible).toBe(false);
 });
});
