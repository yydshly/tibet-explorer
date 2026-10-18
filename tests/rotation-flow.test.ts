// @ts-expect-error Test-only filesystem access.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {rotationFlowCue} from '../src/data/rotationFlow';
import {rotationSample,ROTATION_MODEL,rotationNarratedState,rotationManualState,rotationTargets} from '../src/lib/rotationFlow';
import {buildRotationFlow,RotationCurve,rotationFlowCamera} from '../src/scene/rotationFlow';
import {latLon} from '../src/scene/environment';
import {narrationTimingAt,type NarrationTiming} from '../src/lib/narrationTiming';
import {overviewMainProgram,overviewDepthPrograms} from '../src/data/overviewProgram';
import {overviewPresentation} from '../src/lib/overviewScene';

const text=rotationFlowCue.narration;
const at=(token:string)=>{const index=text.indexOf(token);expect(index).toBeGreaterThanOrEqual(0);return rotationNarratedState({textProgress:index/text.length} as NarrationTiming);};
describe('controlled angular-momentum experiment on the existing Earth',()=>{
 it.each(['north','south'] as const)('preserves axial momentum and identical meridional motion (%s)',direction=>{
  const a=ROTATION_MODEL.radiusMetres,omega=ROTATION_MODEL.omega;
  for(let i=0;i<=100;i++){
   const t=i/100,s=rotationSample(t,true,direction),off=rotationSample(t,false,direction),c=Math.cos(s.latitude*Math.PI/180);
   expect((omega*a*c+s.zonal)*a*c/s.momentum).toBeCloseTo(1,12);
   expect(off.latitude).toBe(s.latitude);expect(off.meridional).toBe(s.meridional);
   expect(off.deltaLongitude).toBeCloseTo(0,12);expect(off.zonal).toBeCloseTo(0,12);
   if(i){expect(s.deltaLongitude*(direction==='north'?1:-1)).toBeGreaterThan(0);expect(s.zonal*s.meridional).toBeGreaterThan(0);}
   // dλ/dt must give the same eastward relative speed as conservation.
   if(i>0&&i<100){const dt=1e-5,left=rotationSample(t-dt,true,direction),right=rotationSample(t+dt,true,direction);
    expect((right.longitude-left.longitude)*Math.PI/180/(2*dt*ROTATION_MODEL.durationSeconds)*a*c).toBeCloseTo(s.zonal,5);}
  }
 });
 it('shows equal angular progress with a longer low-latitude arc',()=>{
  expect(Math.cos(20*Math.PI/180)).toBeGreaterThan(Math.cos(40*Math.PI/180));
  expect(rotationSample(0).zonal).toBeCloseTo(0,10);
 });
 it('reconstructs native-word stages and reverse seeks without a wall clock',()=>{
  expect(at('先看同一地球').phase).toBe('latitude');
  expect(at('让空气向北移动')).toMatchObject({phase:'baseline',enabled:false,progress:0});
  expect(at('加入自转')).toMatchObject({phase:'rotation',enabled:true,progress:0});
  expect(at('向南时')).toMatchObject({phase:'direction',direction:'south',progress:0});
  const north=at('来到更高纬度');at('回到亚洲');expect(at('来到更高纬度')).toEqual(north);
  expect(rotationNarratedState().phase).toBe('pressure');
  expect(rotationTargets(at('空气携带水汽'))).toContain('plateau');
 });
 it('manual conditions keep the recorded position intact and preserve comparison progress',()=>{
  const original=at('来到更高纬度'),snapshot={...original};
  const off=rotationManualState(original,{enabled:false});
  const on=rotationManualState(off,{enabled:true});
  expect(on.progress).toBe(original.progress);expect(off.progress).toBe(on.progress);
  expect(rotationManualState(on,{direction:'south'}).progress).toBe(on.progress);
  expect(rotationFlowCamera(off)).toEqual(rotationFlowCamera(on));
  expect(original).toEqual(snapshot);expect(at('来到更高纬度')).toEqual(original);
 });
 it.each(['north','south'] as const)('trail segments and moving body share model time, not arc length (%s)',direction=>{
  const curve=new RotationCurve(3.78,true,direction),geometry=new THREE.TubeGeometry(curve,180,.035,8,false);
  for(const index of [0,30,90,150,180]){
   const t=index/180,s=rotationSample(t,true,direction),expected=latLon(s.latitude,s.longitude,3.78);
   expect(curve.getPointAt(t).distanceTo(expected)).toBeLessThan(1e-10);
   const a=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index*9),b=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index*9+4);
   expect(a.add(b).multiplyScalar(.5).distanceTo(expected)).toBeLessThan(1e-6);
  }
  geometry.dispose();
 });
 it('hides the experiment before showing separate Asia relationships and restores on backward seek',()=>{
  const model=buildRotationFlow(3.65),state=rotationManualState(at('来到更高纬度'),{progress:.65});
  model.update(state);expect(model.group.visible).toBe(true);
  const anchor=model.anchor('rotation-parcel')!.clone();
  const s=rotationSample(.65);expect(anchor.distanceTo(latLon(s.latitude,s.longitude,3.78))).toBeLessThan(1e-9);
  model.update(at('回到亚洲'));expect(model.group.visible).toBe(false);
  model.update(state);expect(model.group.visible).toBe(true);expect(model.anchor('rotation-parcel')).toEqual(anchor);
  model.update(rotationManualState(state,{enabled:false}));expect(model.anchor('rotation-parcel')!.distanceTo(anchor)).toBeGreaterThan(.1);
  model.group.traverse(object=>{const m=object as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();});
 });
 it.each([[567,610],[1100,650]])('keeps both directions visible in the same close frame at %s × %s',(width,height)=>{
  const pose=rotationFlowCamera(rotationManualState(at('来到更高纬度'),{}));
  const camera=new THREE.PerspectiveCamera(43,width/height,.1,1000);
  const offset=pose.position.clone().sub(pose.target),fit=Math.max(.42,Math.min(1,width/height));
  camera.position.copy(pose.target).add(offset.clone().normalize().multiplyScalar(Math.sqrt(3.65**2+Math.max(.1,offset.lengthSq()-3.65**2)/fit**2)));
  camera.lookAt(pose.target);camera.updateMatrixWorld();
  for(const direction of ['north','south'] as const)for(const enabled of [true,false])for(let i=0;i<=100;i++){
   const s=rotationSample(i/100,enabled,direction),p=latLon(s.latitude,s.longitude,3.78).project(camera);
   expect(Math.abs(p.x)).toBeLessThan(.85);expect(p.y).toBeLessThan(.65);expect(p.y).toBeGreaterThan(-.6);expect(p.z).toBeLessThan(1);
  }
 });
 it('binds the replacement to actual MiniMax words, leaves 21 slots, and retains the original in depth',()=>{
  const beat=overviewMainProgram.beats.find(b=>b.id==='G1-observe')!;
  expect(beat.recordingId).toBe(rotationFlowCue.id);expect(overviewMainProgram.beats).toHaveLength(21);
  const next=overviewMainProgram.beats[overviewMainProgram.beats.indexOf(beat)+1];
  expect(next.id).toBe('OVERVIEW-formation-entry');
  const continued=overviewPresentation(next,0);
  expect(continued.sceneIdentity).toBe('journey:G1');
  expect(continued.props).toMatchObject({scene:'earth',viewKey:'G1',layer:'moisture'});
  expect(continued.props.guide?.targets).toContain('plateau');
  expect(overviewDepthPrograms.some(p=>p.beats.some(b=>b.recordingId==='G1-observe'))).toBe(true);
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  const clip=manifest.clips.find((c:{cueId:string;text:string})=>c.cueId===rotationFlowCue.id&&c.text===text);
  expect(clip.timingLevel).toBe('word');const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
  const phases=new Set();
  for(const word of timeline.words){const timing=narrationTimingAt(text,(word.start+word.end)/2,clip.duration,timeline),presentation=overviewPresentation(beat,.99,timing),s=presentation.props.rotationFlow!;
   expect(presentation.sceneIdentity).toBe('journey:G1');expect(s).toEqual(rotationNarratedState(timing));phases.add(s.phase);
   expect(presentation.props.layer).toBe(s.phase==='arrival'?'moisture':'earth-circulation');
  }
  expect(phases.size).toBe(7);
 });
});
