import {describe,it,expect} from 'vitest';
// @ts-expect-error Node is supplied by Vitest.
import {readFileSync} from 'node:fs';
import {pilotTerrainContext} from '../src/scene/routePilotTerrainData';
import {pilotProfileSample,pilotTravelFrame,pilotSightlineHeight,pilotCorridorFrame} from '../src/scene/pilotTravelFrame';
import {PerspectiveCamera,Vector3} from 'three';
import {pilotNarratedView,routePilotCues} from '../src/data/routePilot';
const root='public/assets/routes/g318/',json=(name:string)=>JSON.parse(readFileSync(root+name,'utf8'));
const meta=json('manifest.json'),bytes=readFileSync(root+'terrain.int16'),grid=Int16Array.from({length:bytes.length/2},(_,i)=>bytes.readInt16LE(i*2));
const context=pilotTerrainContext(meta,grid,json('route.json'),json('lulang.geojson')),profile=context.profile,total=context.total;
const delta=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
describe('source-road travel framing',()=>{
 it('keeps every real road sample inside the corridor shot on narrow and wide viewports, at true height',()=>{
  const original=JSON.stringify(profile),mx=111320*Math.cos(29.66*Math.PI/180);
  const points=profile.map(p=>({x:(p.coordinate[0]-94.5)*mx/1000,y:p.elevation/1000,z:-(p.coordinate[1]-29.66)*111.32}));
  for(const aspect of [.55,1,1.8])for(const pitch of [35,42]){
   const frame=pilotCorridorFrame(points,aspect,pitch),camera=new PerspectiveCamera(46,aspect,.03,500);
   camera.position.set(frame.position.x,frame.position.y,frame.position.z);camera.lookAt(frame.target.x,frame.target.y,frame.target.z);camera.updateMatrixWorld();
   for(const p of points){const ndc=new Vector3(p.x,p.y,p.z).project(camera);expect(Math.abs(ndc.x)).toBeLessThan(.83);expect(Math.abs(ndc.y)).toBeLessThan(.83);expect(ndc.z).toBeGreaterThan(-1);expect(ndc.z).toBeLessThan(1);}
  }
  expect(JSON.stringify(profile)).toBe(original);
 });
 it('keeps the look-ahead target on consecutive archived nodes, including reverse travel and endpoints',()=>{
  for(const p of [0,.12,.3,.668,.9,1])for(const back of [false,true]){
   const f=pilotTravelFrame(profile,p,back),target=f.target;
   const i=profile.findIndex(x=>x.distance>=target.distance),a=profile[Math.max(0,i-1)],b=profile[i];
   const t=(target.distance-a.distance)/Math.max(.0001,b.distance-a.distance);
   expect(target.coordinate[0]).toBeCloseTo(a.coordinate[0]+(b.coordinate[0]-a.coordinate[0])*t,10);
   expect(target.coordinate[1]).toBeCloseTo(a.coordinate[1]+(b.coordinate[1]-a.coordinate[1])*t,10);
   expect(back?target.distance<=f.here.distance:target.distance>=f.here.distance).toBe(true);
  }
 });
 it('reduces repeated heading changes on the real winding source road',()=>{
  const mx=111320*Math.cos(29.66*Math.PI/180);let oldTurn=0,newTurn=0,oldPrevious=0,newPrevious=0;
  for(let d=1000;d<total-1500;d+=100){
   const a=pilotProfileSample(profile,d-220),b=pilotProfileSample(profile,d+220),oldHeading=Math.atan2(-(b.coordinate[0]-a.coordinate[0])*mx,(b.coordinate[1]-a.coordinate[1])*111320),next=pilotTravelFrame(profile,d/total).heading;
   if(d>1000){oldTurn+=delta(oldHeading,oldPrevious);newTurn+=delta(next,newPrevious);}oldPrevious=oldHeading;newPrevious=next;
  }
  expect(newTurn).toBeLessThan(oldTurn*.8);
 });
 it('lifts only the virtual eye to clear a DSM ridge without modifying the terrain',()=>{
  const eye={x:0,y:5,z:0},target={x:14,y:3,z:0},terrain=(x:number)=>x>=5&&x<=7?6:3;
  const height=pilotSightlineHeight(eye,target,x=>terrain(x));expect(height).toBeGreaterThan(eye.y);expect(eye.y).toBe(5);
  for(let i=0;i<=12;i++){const t=i/14;expect(height+(target.y-height)*t).toBeGreaterThanOrEqual(terrain(14*t)+.07999);}
  expect(pilotSightlineHeight(eye,target,()=>undefined)).toBe(5);
 });
 it('reverses the map/photo handoff on the same spoken clock without extending any cue',()=>{
  const text=routePilotCues[2].narration,at=(token:string,n=0)=>pilotNarratedView(2,text,(text.indexOf(token)+n)/text.length,.668);
  expect(at('对照林海实拍')).toMatchObject({photoOverlay:'forest',photoReveal:0});
  expect(at('对照林海实拍',3).photoReveal).toBeCloseTo(.5);expect(at('对照林海实拍',6).photoReveal).toBe(1);
  const returning=at('回到地图',3);expect(returning).toMatchObject({placeMedia:'map',photoOverlay:'town'});expect(returning.photoReveal).toBeCloseTo(.5);
  at('再回到刚才',9);expect(at('回到地图',3)).toEqual(returning);
  expect(at('再回到刚才',6)).toMatchObject({placePhoto:undefined,photoReveal:0});
 });
});
