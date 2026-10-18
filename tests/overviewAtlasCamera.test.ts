// @ts-expect-error Test-only filesystem access; browser code never imports Node.
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {describe,expect,it} from 'vitest';
import {regionalAnchors} from '../src/data/regionalStudy';
import {atlasHotspots} from '../src/data/atlas';
import {overviewBeats} from '../src/data/overviewJourney';
import {overviewShot} from '../src/lib/overviewShot';
import {storyAtlasPosition,STORY_ATLAS_META} from '../src/scene/storyAtlas';
import {sampleTerrainMetres,TERRAIN_READING_META} from '../src/scene/terrainReading';
import {overviewAtlasCamera,overviewAtlasSafeRect,overviewReturnCamera,overviewReadingDirection,type OverviewAtlasCameraInput} from '../src/scene/overviewAtlasCamera';

const bytes=readFileSync(`public${TERRAIN_READING_META.dataUrl}`);
const dem=new Int16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const metresPerUnit=(STORY_ATLAS_META.east-STORY_ATLAS_META.west)*111320*Math.cos(THREE.MathUtils.degToRad((STORY_ATLAS_META.south+STORY_ATLAS_META.north)/2))/STORY_ATLAS_META.width;
const point=(longitude:number,latitude:number)=>storyAtlasPosition(longitude,latitude,
  sampleTerrainMetres(dem,longitude,latitude)/metresPerUnit*STORY_ATLAS_META.verticalExaggeration+.18);
const wholePoints=regionalAnchors.map(item=>point(item.longitude,item.latitude));
const places=new Map([...regionalAnchors,...atlasHotspots].map(item=>[item.id,point(item.longitude,item.latitude)]));
const whole={focusIds:[],amount:0};
const shot={cameraFrom:whole,cameraTo:whole,cameraMix:1};
const base=(width=950,height=490):OverviewAtlasCameraInput=>({
  camera:{fov:43,aspect:width/height},viewport:{width,height},wholePoints,
  resolve:id=>places.get(id),shot,evidenceWidth:0,
});

describe('source-word pullback from a real locality into the same whole map',()=>{
  const local={position:new THREE.Vector3(1.2,.53,-2.57),target:new THREE.Vector3(1.2,.5,-2.6)};
  const region=overviewAtlasCamera(base());

  it('preserves exact endpoints without mutating or returning the input vectors',()=>{
    const before={local:{position:local.position.toArray(),target:local.target.toArray()},region:{position:region.position.toArray(),target:region.target.toArray()}};
    const start=overviewReturnCamera(local,region,0),end=overviewReturnCamera(local,region,1);
    expect(start).toEqual(local);expect(end).toEqual(region);
    expect(start.position).not.toBe(local.position);expect(start.target).not.toBe(local.target);
    expect(end.position).not.toBe(region.position);expect(end.target).not.toBe(region.target);
    expect({local:{position:local.position.toArray(),target:local.target.toArray()},region:{position:region.position.toArray(),target:region.target.toArray()}}).toEqual(before);
  });

  it('shows surrounding geography before changing the geographic target',()=>{
    for(const mix of [.01,.16,.3,.35])expect(overviewReturnCamera(local,region,mix).target).toEqual(local.target);
    expect(overviewReturnCamera(local,region,.36).target.distanceTo(local.target)).toBeGreaterThan(0);
    expect(overviewReturnCamera(local,region,.7).target.distanceTo(region.target)).toBeLessThan(local.target.distanceTo(region.target));
    const midpoint=overviewReturnCamera(local,region,.5);
    const geometricMean=Math.sqrt(local.position.distanceTo(local.target)*region.position.distanceTo(region.target));
    expect(midpoint.position.distanceTo(midpoint.target)).toBeCloseTo(geometricMean,10);
  });

  it('reconstructs deterministic reverse seeks across the full street-to-region scale',()=>{
    const fractions=[0,.02,.18,.35,.5,.81,.97,1];
    const forward=fractions.map(mix=>overviewReturnCamera(local,region,mix));
    expect([...fractions].reverse().map(mix=>overviewReturnCamera(local,region,mix)).reverse()).toEqual(forward);
    let prior=0;
    for(let index=0;index<=200;index++){
      const pose=overviewReturnCamera(local,region,index/200),distance=pose.position.distanceTo(pose.target);
      expect([...pose.position.toArray(),...pose.target.toArray()].every(Number.isFinite)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(prior-1e-10);prior=distance;
    }
  });

  it('is continuous where the geographic target begins moving and at endpoints',()=>{
    for(const progress of [0,.35,.5,1]){
      const a=overviewReturnCamera(local,region,Math.max(0,progress-1e-7)),b=overviewReturnCamera(local,region,Math.min(1,progress+1e-7));
      expect(a.target.distanceTo(b.target)).toBeLessThan(.0001);
      expect(a.position.distanceTo(b.position)).toBeLessThan(.0001);
    }
  });

  it('keeps opposing directions finite instead of passing through a zero-length view',()=>{
    const a={position:new THREE.Vector3(0,0,1),target:new THREE.Vector3()},b={position:new THREE.Vector3(0,0,-1000),target:new THREE.Vector3()};
    const pose=overviewReturnCamera(a,b,.5);
    expect(pose.position.length()).toBeCloseTo(Math.sqrt(1000),10);
    expect(pose.position.distanceTo(pose.target)).toBeGreaterThan(0);
    expect(pose.position.toArray().every(Number.isFinite)).toBe(true);
  });

  it('keeps the locality visible while the view expands before moving to the whole-region centre',()=>{
    for(let index=0;index<=200;index++){
      const pose=overviewReturnCamera(local,region,index/200);
      const camera=new THREE.PerspectiveCamera(43,950/490,.00001,1000);
      camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
      const projected=local.target.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(.88);
      expect(Math.abs(projected.y)).toBeLessThan(.7);
      expect(projected.z).toBeGreaterThan(-1);expect(projected.z).toBeLessThan(1);
    }
  });

  it('keeps equal-distance valid camera poses finite without dividing by zero',()=>{
    const a={position:new THREE.Vector3(0,1,1),target:new THREE.Vector3()},b={position:new THREE.Vector3(1,1,1),target:new THREE.Vector3(1,0,0)};
    for(const progress of [0,.35,.36,.5,.8,1]){
      const pose=overviewReturnCamera(a,b,progress);
      expect([...pose.position.toArray(),...pose.target.toArray()].every(Number.isFinite)).toBe(true);
      expect(pose.position.distanceTo(pose.target)).toBeCloseTo(Math.sqrt(2),10);
    }
  });

  it('rejects invalid camera sources rather than silently inventing a view',()=>{
    expect(()=>overviewReturnCamera({...local,position:new THREE.Vector3(Number.NaN,0,0)},region,.5)).toThrow('相机位置');
    expect(()=>overviewReturnCamera({position:new THREE.Vector3(),target:new THREE.Vector3()},region,.5)).toThrow('相机距离');
    expect(overviewReturnCamera(local,region,-1)).toEqual(local);
    expect(overviewReturnCamera(local,region,2)).toEqual(region);
  });
});
const screen=(world:THREE.Vector3,input:OverviewAtlasCameraInput)=>{
  const pose=overviewAtlasCamera(input),camera=new THREE.PerspectiveCamera(input.camera.fov,input.camera.aspect,.01,1000);
  camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
  const projected=world.clone().project(camera);
  return {x:(projected.x+1)*input.viewport.width/2,y:(1-projected.y)*input.viewport.height/2,z:projected.z};
};
const wholeBox=new THREE.Box3().setFromPoints(wholePoints);
wholeBox.min.x-=.8;wholeBox.max.x+=.8;wholeBox.min.z-=.7;wholeBox.max.z+=.7;
wholeBox.min.y=Math.min(0,wholeBox.min.y-.15);wholeBox.max.y=Math.max(1.3,wholeBox.max.y+.15);
const corners:THREE.Vector3[]=[];
for(const x of [wholeBox.min.x,wholeBox.max.x])for(const y of [wholeBox.min.y,wholeBox.max.y])for(const z of [wholeBox.min.z,wholeBox.max.z])corners.push(new THREE.Vector3(x,y,z));
const assertVisible=(input:OverviewAtlasCameraInput)=>{
  const safe=overviewAtlasSafeRect(input.viewport,input.evidenceWidth);
  for(const world of [...wholePoints,...corners]){
    const p=screen(world,input);
    expect(p.x).toBeGreaterThanOrEqual(safe.left-1e-7);
    expect(p.x).toBeLessThanOrEqual(safe.right+1e-7);
    expect(p.y).toBeGreaterThanOrEqual(safe.top-1e-7);
    expect(p.y).toBeLessThanOrEqual(safe.bottom+1e-7);
    expect(p.z).toBeGreaterThan(-1);
    expect(p.z).toBeLessThan(1);
  }
};

describe('whole-map overview framing from the same source word progress',()=>{
  it('changes reading pitch visibly while preserving all regions, north and deterministic seeking',()=>{
    const frame=(view:'relief'|'plan')=>({focusIds:['lhasa','shannan','shigatse'],amount:.08,view});
    const sample=(mix:number)=>({...base(),shot:{cameraFrom:frame('relief'),cameraTo:frame('plan'),cameraMix:mix}});
    const a=overviewReadingDirection(sample(0).shot),b=overviewReadingDirection(sample(1).shot);
    expect(THREE.MathUtils.radToDeg(a.angleTo(b))).toBeCloseTo(38,8);
    for(const mix of [0,.05,.25,.5,.8,1]){
      const input=sample(mix);assertVisible(input);
      expect(overviewReadingDirection(input.shot).x).toBe(0);
      expect(overviewReadingDirection(input.shot).z).toBeGreaterThan(0);
      expect(overviewAtlasCamera(input)).toEqual(overviewAtlasCamera(sample(mix)));
    }
  });
  it('keeps all actual seven place references and padded world corners visible on both desktop stages',()=>{
    for(const [width,height]of [[950,490],[1280,700]])for(const evidenceWidth of [0,60,120,180,240]){
      const input={...base(width,height),evidenceWidth};
      expect(overviewAtlasSafeRect(input.viewport,evidenceWidth)).toEqual({left:36+evidenceWidth,right:width-36,top:115,bottom:height-125});
      assertVisible(input);
    }
  });

  it('retains the whole geographic context at every authored atlas shot and intermediate emphasis',()=>{
    for(const [width,height]of [[950,490],[1280,700]])for(const beat of overviewBeats.filter(item=>item.kind==='atlas')){
      for(const raw of [0,.2,.45,.72,.9,1]){
        const plan=overviewShot(beat,raw);
        for(const evidenceWidth of [0,240])assertVisible({...base(width,height),shot:plan,evidenceWidth});
      }
    }
  });

  it('moves the reading centre into the remaining screen without moving source geography',()=>{
    const original=wholePoints.map(point=>point.toArray());
    const closed=base(),open={...closed,evidenceWidth:240},centre=wholeBox.getCenter(new THREE.Vector3());
    const a=screen(centre,closed),b=screen(centre,open),rect=overviewAtlasSafeRect(open.viewport,240);
    expect(a.x).toBeCloseTo(closed.viewport.width/2,8);
    expect(b.x).toBeCloseTo((rect.left+rect.right)/2,8);
    expect(b.x-a.x).toBeCloseTo(120,8);
    expect(wholePoints.map(point=>point.toArray())).toEqual(original);
    assertVisible(open);
  });

  it('mildly emphasizes a place or group while keeping every other region visible',()=>{
    const original=base(),focused={...original,shot:{cameraFrom:whole,cameraTo:{focusIds:['tholing-exchange'],amount:.24},cameraMix:1}};
    expect(overviewAtlasCamera(focused).target.distanceTo(overviewAtlasCamera(original).target)).toBeGreaterThan(.01);
    assertVisible(focused);
    for(const focusIds of [['lhasa'],['lhasa-buildings','tholing-culture'],['nyade-evidence','yarlung-polity','lhasa-stele']]){
      assertVisible({...original,evidenceWidth:240,shot:{cameraFrom:whole,cameraTo:{focusIds,amount:.24},cameraMix:.5}});
    }
  });

  it('reconstructs exact poses for reverse word seeks and source-image width changes',()=>{
    const input=base(),positions=[0,.16,.48,.82,1];
    const sample=(mix:number)=>overviewAtlasCamera({...input,evidenceWidth:mix*240,
      shot:{cameraFrom:whole,cameraTo:{focusIds:['lhasa-buildings'],amount:.24},cameraMix:mix}});
    const forward=positions.map(sample);
    expect([...positions].reverse().map(sample).reverse()).toEqual(forward);
    const before=sample(.5-1e-7),after=sample(.5+1e-7);
    expect(before.position.distanceTo(after.position)).toBeLessThan(.0001);
    expect(before.target.distanceTo(after.target)).toBeLessThan(.0001);
  });

  it('preserves north/east orientation and works with the provided camera aspect rather than assuming one',()=>{
    for(const aspect of [1,1.5,950/490,2.4]){
      const input={...base(),camera:{fov:51,aspect},evidenceWidth:240};
      assertVisible(input);
      const centre=wholeBox.getCenter(new THREE.Vector3());
      const a=screen(centre,input),east=screen(centre.clone().add(new THREE.Vector3(.1,0,0)),input);
      const north=screen(centre.clone().add(new THREE.Vector3(0,0,-.1)),input);
      expect(east.x).toBeGreaterThan(a.x);
      expect(north.y).toBeLessThan(a.y);
    }
  });

  it('ignores unresolved evidence locations and limits excessive emphasis without a remote flight',()=>{
    const input=base(),fallback={...input,shot:{cameraFrom:whole,cameraTo:{focusIds:['not-acquired'],amount:.24},cameraMix:1}};
    expect(overviewAtlasCamera(fallback)).toEqual(overviewAtlasCamera(input));
    const restrained={...input,shot:{cameraFrom:whole,cameraTo:{focusIds:['ngari'],amount:.24},cameraMix:1}};
    const excessive={...restrained,shot:{...restrained.shot,cameraTo:{focusIds:['ngari'],amount:90}}};
    expect(overviewAtlasCamera(excessive)).toEqual(overviewAtlasCamera(restrained));
    const remote={...input,resolve:()=>new THREE.Vector3(1e9,1e9,1e9),shot:excessive.shot};
    assertVisible(remote);
    const malformed={...input,resolve:()=>new THREE.Vector3(Number.NaN,0,0),shot:excessive.shot};
    expect(overviewAtlasCamera(malformed)).toEqual(overviewAtlasCamera(input));
  });

  it('rejects missing required geography and invalid perspective instead of producing a false framing',()=>{
    const input=base();
    expect(()=>overviewAtlasCamera({...input,wholePoints:[]})).toThrow('整体地区参照');
    expect(()=>overviewAtlasCamera({...input,wholePoints:[new THREE.Vector3(0,Number.NaN,0)]})).toThrow('整体地区参照');
    expect(()=>overviewAtlasCamera({...input,camera:{fov:0,aspect:1}})).toThrow('透视参数');
    expect(()=>overviewAtlasCamera({...input,viewport:{width:0,height:490}})).toThrow('可视区域');
    expect(()=>overviewAtlasCamera({...input,camera:{fov:43,aspect:Number.NaN}})).toThrow('透视参数');
  });
});
