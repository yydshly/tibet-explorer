import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {elevationDescriptors,elevationPose,sampleElevationMetres,loadElevationGrid} from '../src/lib/elevationReading';
import {journeyMotionProgress} from '../src/lib/journeyMotion';
import {getJourneyStep} from '../src/data/journey';
import {earthOrientationLayers} from '../src/data/orientation';
import {visualGuideForCue} from '../src/data/visualGuidance';
import {narrationPhraseBindings} from '../src/lib/narrationPhraseGuide';
import {buildTerrainReadingScene,sampleTerrainMetres} from '../src/scene/terrainReading';
import {defaultSettings,emptyExploration,parseExploration} from '../src/lib/store';
import {disposeTree} from '../src/scene/environment';
import {solarAtLatitude,dayForSeason} from '../src/lib/science';
import {terrainContrastStops} from '../src/lib/terrainContrast';
vi.mock('../src/scene/environment',async original=>({...await original(),label:()=>new THREE.Sprite(new THREE.SpriteMaterial())}));
const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16');
const grid=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2);
afterEach(()=>vi.unstubAllGlobals());
const settings={...defaultSettings('relief'),selected:'',progress:(88.5-80)/18};
describe('讲述、米制图表与3D地形读取同一对象',()=>{
 it('双线性插值保持东西、南北与真实米单位，坏网格不补数字',()=>{
  const meta={west:0,east:1,south:0,north:1,rows:2,columns:2};
  expect(sampleElevationMetres([1000,3000,5000,7000],meta,0,1)).toBe(1000);
  expect(sampleElevationMetres([1000,3000,5000,7000],meta,1,0)).toBe(7000);
  expect(sampleElevationMetres([1000,3000,5000,7000],meta,.5,.5)).toBe(4000);
  expect(()=>sampleElevationMetres([1,2],meta,.5,.5)).toThrow();
 });
 it('新的公共读数与原3D采样器从同一发布数据得到一致的高度',()=>{
  for(const [lon,lat] of [[88.2,33.7],[86.8,28.2],[91.75,29.27],[88.5,26.4],[94,34]])expect(sampleElevationMetres(grid,elevationDescriptors.regional,lon,lat)).toBeCloseTo(sampleTerrainMetres(grid,lon,lat),8);
 });
 it('沿同一89度剖面依次读低地、山地网格高点与高原，讲述标记和三处对照不漂移',()=>{
  const cue=getJourneyStep('G4').cues[1],stops=terrainContrastStops(grid);
  for(const [index,phrase]of narrationPhraseBindings(cue.id,cue.narration).slice(0,3).entries())for(const part of [.01,.99]){
   const textProgress=(phrase.textStart+(phrase.textEnd-phrase.textStart)*part)/cue.narration.length,guide=visualGuideForCue(cue.id,.01,true,{textProgress,precision:'provider'}),current={...settings,...cue.settings,...guide.sceneSettings};
   const guided=elevationPose('G4',current,guide),manual=elevationPose('G4',current);
   expect(guided.longitude).toBe(89);
   expect(guided.latitude).toBeCloseTo(stops[index].latitude,10);
   expect(manual.longitude).toBe(guided.longitude);
   expect(manual.latitude).toBeCloseTo(guided.latitude,10);
   expect(sampleElevationMetres(grid,elevationDescriptors.regional,guided.longitude,guided.latitude)).toBeCloseTo(stops[index].metres,8);
  }
 });
 it('进入观察段保留解释结束时的经纬读点，避免突然跳回另一条线',()=>{
  const journey=getJourneyStep('G4'),explain=journey.cues[1];let endSettings={...settings,...explain.settings};for(const frame of explain.keyframes??[])endSettings={...endSettings,...frame.settings};
  const end=elevationPose('G4',endSettings,visualGuideForCue(explain.id,1,true)),observe=elevationPose('G4',{...endSettings,...journey.cues[2].settings},visualGuideForCue(journey.cues[2].id,0,true));expect(observe.longitude).toBeCloseTo(end.longitude);expect(observe.latitude).toBeCloseTo(end.latitude);
 });
 it('讲述里的方位读点按实际目标切换，不把单点叫作地区平均值或山峰测量',()=>{
  const pose=elevationPose('G4',{...settings,layer:'terrain'},visualGuideForCue('G4-opening',.4,true));
  expect(pose.points).toHaveLength(2);expect(pose.points.map(point=>point.name)).toEqual(['喜马拉雅山系参考点','高原内部参考点']);expect(pose.profile).toBe(false);
 });
 it('手动读点改变纬度；讲述激活时服从讲述时钟，暂停重读不漂移',()=>{
  const south=elevationPose('G4',{...settings,readingFraction:0}),north=elevationPose('G4',{...settings,readingFraction:1});expect(south.latitude).toBe(25);expect(north.latitude).toBe(38);
  const guide=visualGuideForCue('G4-explain',.4,true),p={...settings,readingFraction:.9};expect(elevationPose('G4',p,guide)).toEqual(elevationPose('G4',p,guide));expect(elevationPose('G4',p,guide).fraction).not.toBe(.9);
 });
 it('林芝局部的读点与高程线共用同一经度和范围，不误用整片高原的坐标',()=>{
  const pose=elevationPose('P1',{...settings,progress:.86,readingFraction:.25});expect(pose.longitude).toBeCloseTo(94.43375);expect(pose.latitude).toBeCloseTo(29.325);expect(pose.profile).toBe(true);
 });
 it('3D金色读点真的沿真实地表移动，其位置和源数值均与图表一致',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})));
  const context=new Proxy({createLinearGradient:()=>({addColorStop:()=>{}})},{get:(target,key)=>key in target?target[key]:()=>{}});vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>context})});
  const camera=new THREE.PerspectiveCamera(43,1.6,.1,180);camera.position.set(20,12,26);camera.lookAt(0,1,0);camera.updateMatrixWorld();
  const model=buildTerrainReadingScene({camera,renderer:{getSize:v=>v.set(1280,800)},sun:new THREE.DirectionalLight(),focus:()=>{},hasSavedView:()=>false});
  await new Promise(resolve=>setTimeout(resolve,0));const probe=model.group.children.find(child=>child.userData.guideId==='terrain-probe');
  const props={...settings,scene:'region',viewKey:'G4',step:3,season:1,cutaway:false,playing:false,resetKey:0,onSelect:()=>{},onInteract:()=>{}};
  model.update({...props,readingFraction:.2},0,0);const first=probe.userData.guideAnchor.clone();
  model.update({...props,readingFraction:.7},1,1);const pose=elevationPose('G4',{...props,readingFraction:.7});expect(probe.visible).toBe(true);expect(probe.userData.coordinates).toEqual([pose.longitude,pose.latitude]);expect(probe.userData.guideAnchor.z).toBeLessThan(first.z);expect(probe.userData.sourceMetres).toBeCloseTo(sampleElevationMetres(grid,elevationDescriptors.regional,pose.longitude,pose.latitude),8);
  model.dispose();disposeTree(model.group);
 });
 it('失败的加载不会缓存虚构数值，重试可以读取正确网格',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}).mockResolvedValueOnce({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});vi.stubGlobal('fetch',fetcher);
  await expect(loadElevationGrid('regional')).rejects.toThrow();const actual=await loadElevationGrid('regional');expect(actual.length).toBe(grid.length);expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('手动读点可以保存恢复，超界和非法值会被处理',()=>{
  const data=emptyExploration();data.scenes.G4={...settings,readingFraction:.24};expect(parseExploration(JSON.stringify(data)).scenes.G4.readingFraction).toBe(.24);
  data.scenes.G4.readingFraction=3;expect(parseExploration(JSON.stringify(data)).scenes.G4.readingFraction).toBe(1);data.scenes.G4.readingFraction='bad';expect(parseExploration(JSON.stringify(data)).scenes.G4.readingFraction).toBeUndefined();
 });
 it('夏至、冬至讲述实际切换同一地点的季节，入口依次定位国家与地区',()=>{
  const cue=getJourneyStep('C1').cues[1];expect(cue.settings.season).toBe(1);expect(cue.keyframes.find(frame=>frame.at===.58).settings.season).toBe(3);
  expect(solarAtLatitude(29.65,dayForSeason(1)).dayLength).toBeGreaterThan(solarAtLatitude(29.65,dayForSeason(3)).dayLength);
  const entry=getJourneyStep('G2').cues[0];expect(entry.settings.layer).toBe('globe');expect(entry.keyframes.map(frame=>frame.settings.layer)).toEqual(['asia','china','tibet']);for(const frame of entry.keyframes)expect(earthOrientationLayers.G2.map(layer=>layer.id)).toContain(frame.settings.layer);
 });
 it('延迟开始的过程在起始段保持条件，回拖仍确定，其他过程维持原来的线性进度',()=>{
  const motion={from:.2,to:.8,startAt:.7};expect(journeyMotionProgress(motion,.4)).toBe(.2);expect(journeyMotionProgress(motion,.85)).toBeCloseTo(.5);expect(journeyMotionProgress(motion,.4)).toBe(.2);expect(journeyMotionProgress({from:.2,to:.8},.5)).toBeCloseTo(.5);expect(journeyMotionProgress(motion,1)).toBe(.8);
 });
});
