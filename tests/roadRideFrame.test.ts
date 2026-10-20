import {describe,it,expect} from 'vitest';
// @ts-expect-error Node types belong to Vitest.
import {readFileSync} from 'node:fs';
import {roadRideFrame,roadRideSegment} from '../src/scene/roadRideFrame';
import {pilotTerrainContext,pilotElevationSampler} from '../src/scene/routePilotTerrainData';
import {travelPhotos,travelBeats} from '../src/data/travelObservation';
import {roadRibbonVertices} from '../src/scene/roadRideSurface';
import {roadRideBeats,rideFraction,rideSeekTarget} from '../src/data/roadRideNarration';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {Vector3} from 'three';
const json=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
describe('source-road continuous observation',()=>{
 it('stays on the archived road, keeps physical height and reverses without changing position',()=>{
  const meta=json('public/assets/routes/g318/manifest.json'),buffer=readFileSync('public'+meta.elevation.url),grid=new Int16Array(meta.columns*meta.rows);
  for(let i=0;i<grid.length;i++)grid[i]=buffer.readInt16LE(i*2);
  const route=json('public'+meta.geometry.route),context=pilotTerrainContext(meta,grid,route,json('public'+meta.geometry.place));
  const camera=travelPhotos.road.coordinate!,nearest=context.profile.reduce((a,b)=>Math.hypot(a.coordinate[0]-camera[0],a.coordinate[1]-camera[1])<Math.hypot(b.coordinate[0]-camera[0],b.coordinate[1]-camera[1])?a:b);
  const segment=roadRideSegment(context.profile,nearest.distance/context.total);
  expect(segment.length).toBeCloseTo(1800);expect(segment.end).toBeCloseTo(nearest.distance);
  const terrain=pilotElevationSampler(meta,grid);
  const ribbon=roadRibbonVertices(context.profile,segment.start,segment.end,4,(p,offset=0)=>new Vector3(p[0]*96700,(terrain(p[0],p[1])+offset),p[1]*111320));
  expect(ribbon.indices.every(i=>i>=0&&i<ribbon.vertices.length/3)).toBe(true);
  for(let i=0;i<ribbon.vertices.length;i+=6){
   const v=ribbon.vertices;
   expect(Math.hypot(v[i]-v[i+3],v[i+2]-v[i+5])).toBeCloseTo(8,1);
   expect(v[i+1]-terrain(v[i]/96700,v[i+2]/111320)).toBeCloseTo(.45,4);
  }
  let previous:number[]|undefined;
  for(let d=segment.start;d<=segment.end;d+=10){
   const a=roadRideFrame(context.profile,d/context.total,'forward'),b=roadRideFrame(context.profile,d/context.total,'back');
   expect(a.here).toEqual(b.here);expect(a.eyeCoordinate).toEqual(a.here.coordinate);expect(a.eyeHeight).toBe(12);
   expect(Number.isFinite(terrain(...a.eyeCoordinate as [number,number]))).toBe(true);
   if(previous)expect(Math.hypot((a.here.coordinate[0]-previous[0])*96700,(a.here.coordinate[1]-previous[1])*111320)).toBeLessThan(10.2);
   previous=a.here.coordinate;
  }
  expect(roadRideFrame(context.profile,nearest.distance/context.total,'overview').eyeHeight).toBe(500);
 });
 it('has continuous native-word distance across all four recordings and supports inverse distance selection',()=>{
  const manifest=json('public/assets/audio/narration/cue-manifest.json');let previous=0;
  for(const [i,beat] of roadRideBeats.entries()){
   const asset=manifest.clips.find((a:any)=>a.cueId===beat.recordingId&&a.text===beat.text),timeline=json('public'+asset.subtitleUrl);
   expect(asset.timingLevel).toBe('word');
   for(const word of timeline.words){
    const timing=narrationTimingAt(beat.text,(word.start+word.end)/2,asset.duration,timeline),fraction=rideFraction(i,timing.textProgress),inverse=rideSeekTarget(fraction);
    expect(fraction).toBeGreaterThanOrEqual(previous);expect(inverse.index).toBe(i);expect(inverse.textProgress).toBeCloseTo(timing.textProgress,6);previous=fraction;
   }
  }
  expect(rideFraction(3,1)).toBe(1);expect(rideSeekTarget(1)).toEqual({index:3,textProgress:1});
 });
 it('uses the exact existing native word boundary for real-image arrival, not a guessed time fraction',()=>{
  const beat=travelBeats('sejila')[0],manifest=json('public/assets/audio/narration/cue-manifest.json');
  const asset=manifest.clips.find((a:any)=>a.cueId===beat.recordingId&&a.text===beat.text),timeline=json('public'+asset.subtitleUrl);
  const offset=beat.text.indexOf('转到二零一五'),word=timeline.words.find((w:any)=>w.textStart<=offset&&w.textEnd>offset);
  expect(word).toBeDefined();expect(word.start).toBeGreaterThan(0);expect(word.start).toBeLessThan(asset.duration);
 });
});
