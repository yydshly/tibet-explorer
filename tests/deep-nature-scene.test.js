import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings,narrationPhraseGuide} from '../src/lib/narrationPhraseGuide';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {buildFormationScene} from '../src/scene/formation';
import {buildEnergyBalanceScene} from '../src/scene/energyBalance';
import {buildAirHeightScene} from '../src/scene/airHeight';
import {buildMountainCloudScene} from '../src/scene/mountainCloud';
import {buildNarrationAnnotations} from '../src/scene/narrationAnnotations';
import {disposeTree} from '../src/scene/environment';

vi.mock('../src/scene/environment',async original=>({...await original(),label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),mineralTexture:()=>new THREE.Texture()}));
afterEach(()=>vi.unstubAllGlobals());
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
function guideAt(cueId,token){
 const cue=journeySteps[cueId.split('-')[0]].cues.find(item=>item.id===cueId),phrases=narrationPhraseBindings(cueId,cue.narration),phrase=phrases.find(item=>item.token===token);
 const asset=manifest.clips.find(item=>item.cueId===cueId),timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
 const center=(phrase.textStart+phrase.textEnd)/2,word=timeline.words.filter(item=>item.textStart>=phrase.textStart&&item.textEnd<=phrase.textEnd)
  .sort((a,b)=>Math.abs((a.textStart+a.textEnd)/2-center)-Math.abs((b.textStart+b.textEnd)/2-center))[0];
 const timing=narrationTimingAt(cue.narration,(word.start+word.end)/2,timeline.duration,timeline);
 return {...narrationPhraseGuide(cueId,cue.narration,.01,timing),drawProgress:1};
}
function fixture(builder,viewKey,width=390,height=360){
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{},fillStyle:''})})});
 const camera=new THREE.PerspectiveCamera(43,width/height,.1,180);camera.position.set(12,9,18);camera.lookAt(0,2.7,0);camera.updateMatrixWorld();
 const renderer={getSize:value=>value.set(width,height)},model=builder({renderer,camera});
 const props={scene:'atmosphere',viewKey,step:0,season:1,layer:'terrain',progress:0,playing:false,selected:'',cutaway:false,airMoisture:'higher',resetKey:0,onSelect:()=>{},onInteract:()=>{}};
 const annotations=buildNarrationAnnotations(model.group,camera,renderer);
 const apply=(cueId,token)=>{
  const guide=guideAt(cueId,token),current={...props,...guide.sceneSettings,progress:guide.sceneProgress??0,guide};
  model.update(current,0,0);annotations.update(current);return current;
 };
 return {model,props,annotations,apply,camera,renderer};
}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function snapshot(group){const result=[];group.traverse(object=>{
 if(!visible(object))return;
 result.push([object.id,...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()]);
 if(object.geometry)result.push([Array.from(object.geometry.attributes.position?.array??[]),object.geometry.drawRange.count]);
 if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])result.push([material.opacity,material.color?.getHex(),material.emissiveIntensity]);
});return result;}
function find(group,predicate){let found;group.traverse(object=>{if(!found&&predicate(object))found=object;});return found;}
function dispose(f){f.annotations.dispose();disposeTree(f.model.group);}

describe('deeper native phrases manipulate actual 3D objects at phone scene dimensions',()=>{
 it('G3 shortens and deforms the same section, then moves actual erosion symbols without replacing the landform',()=>{
  const f=fixture(buildFormationScene,'G3'),first=f.apply('G3-explain','相向运动');
  for(const [id,direction]of [['formation-india',1],['formation-eurasia',-1]]){
   const arrow=find(f.model.group,object=>object.userData.guideId===id),actual=arrow.localToWorld(arrow.userData.guideAnchor.clone());
   expect(actual.distanceTo(arrow.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(direction,0,0)))).toBeLessThan(1e-9);
  }
  const crust=find(f.model.group,object=>object.userData.guideId==='formation-crust'),surface=find(f.model.group,object=>object.userData.guideId==='formation-surface');
  const old=Array.from(crust.geometry.attributes.position.array),topId=surface.id,early=surface.userData.guideAnchor.clone();
  const thick=f.apply('G3-explain','缩短、变形并增厚');
  expect(Array.from(crust.geometry.attributes.position.array)).not.toEqual(old);expect(surface.userData.guideAnchor.y).toBeGreaterThan(early.y);
  expect(thick.layer).toBe('crust');expect(thick.cutaway).toBe(true);
  const erode=f.apply('G3-explain','山地抬升时侵蚀仍在进行');
  expect(erode.layer).toBe('surface');expect(erode.cutaway).toBe(false);expect(surface.id).toBe(topId);
  expect(find(f.model.group,object=>object instanceof THREE.Points&&object.userData.selectId==='formation-surface')?.parent.visible).toBe(true);
  const active=snapshot(f.model.group);f.model.update({...erode,playing:false},900,80);expect(snapshot(f.model.group)).toEqual(active);
  f.model.update(first,1500,80);expect(Array.from(crust.geometry.attributes.position.array)).toEqual(old);
  dispose(f);
 });
 it('C2 real source words extend the energy paths and restore the same positions after pause and backward seek',()=>{
  const f=fixture(buildEnergyBalanceScene,'C2'),incoming=f.apply('C2-opening','现在先沿金色路径');
  const initial=snapshot(f.model.group),paths=()=>f.model.group.children.filter(object=>object.children.some(child=>child instanceof THREE.Points)&&object.visible);
  expect(paths().map(item=>item.userData.selectId)).not.toContain('energy-space');
  f.apply('C2-explain','空气热交换和蒸发');
  expect(paths().some(item=>item.userData.selectId==='energy-atmosphere'&&item.children[0].geometry.drawRange.count>2)).toBe(true);
  const last=f.apply('C2-explain','既向外，也向地表交换');
  expect(paths().some(item=>item.userData.selectId==='energy-space')).toBe(true);
  const current=snapshot(f.model.group);f.model.update({...last,playing:false},1800,100);expect(snapshot(f.model.group)).toEqual(current);
  f.model.update(incoming,2400,100);expect(snapshot(f.model.group)).toEqual(initial);
  dispose(f);
 });
 it('C3 native cooling words move and expand the actual parcel while the environmental reference remains fixed',()=>{
  const f=fixture(buildAirHeightScene,'C3');f.apply('C3-explain','空气上升进入较低气压环境');
  const parcel=f.model.group.getObjectByName('height-moving-parcel'),env=f.model.group.getObjectByName('height-fixed-environment');
  const low=parcel.position.clone(),small=parcel.scale.x,environment=snapshot(env),before=snapshot(f.model.group);
  const high=f.apply('C3-explain','可以膨胀并冷却');expect(parcel.position.y).toBeGreaterThan(low.y);expect(parcel.scale.x).toBeGreaterThan(small);expect(snapshot(env)).toEqual(environment);
  const active=snapshot(f.model.group);f.model.update({...high,playing:false},900,80);expect(snapshot(f.model.group)).toEqual(active);
  f.apply('C3-explain','空气上升进入较低气压环境');expect(snapshot(f.model.group)).toEqual(before);
  dispose(f);
 });
 it('C6 brings actual cloud and precipitation bodies in only after their spoken conditions, then follows real model runoff',()=>{
  const f=fixture(buildMountainCloudScene,'C6');f.apply('C6-explain','再沿坡上升');
  const terrain=f.model.group.getObjectByName('fixed-mountain-rear'),positions=Array.from(terrain.geometry.attributes.position.array);
  const cloud=f.model.group.getObjectByName('conditional-cloud'),rain=f.model.group.getObjectByName('conditional-precipitation');
  expect(cloud.visible).toBe(false);expect(rain.visible).toBe(false);
  f.apply('C6-explain','继续推进，满足凝结条件后');expect(cloud.visible).toBe(true);expect(rain.visible).toBe(false);
  f.apply('C6-explain','云滴增长以后才有降水');expect(rain.visible).toBe(true);
  const ground=f.apply('C6-explain','水到地表后再汇流或入渗');expect(f.model.group.getObjectByName('added-surface-runoff').visible).toBe(true);
  expect(Array.from(terrain.geometry.attributes.position.array)).toEqual(positions);const active=snapshot(f.model.group);
  f.model.update({...ground,playing:false},900,80);expect(snapshot(f.model.group)).toEqual(active);
  f.apply('C6-explain','再沿坡上升');expect(cloud.visible).toBe(false);expect(rain.visible).toBe(false);
  dispose(f);
 });
 it.each([
  [buildFormationScene,'G3','G3-explain','缩短、变形并增厚','formation-crust'],
  [buildEnergyBalanceScene,'C2','C2-opening','现在先沿金色路径','energy-sunlight'],
  [buildAirHeightScene,'C3','C3-explain','可以膨胀并冷却','height-parcel'],
  [buildMountainCloudScene,'C6','C6-explain','水到地表后再汇流或入渗','cloud-runoff'],
 ])('%s/%s resolves current annotation to a real visible Vector3-anchored body at 390 × 360',(builder,id,cueId,token,target)=>{
  const f=fixture(builder,id);f.apply(cueId,token);
  const entity=find(f.model.group,object=>object.userData.guideId===target&&object.userData.guideAnchor instanceof THREE.Vector3&&visible(object)&&!object.userData.screenAnnotation);
  expect(entity).toBeDefined();expect(entity.userData.guideAnchor.toArray().every(Number.isFinite)).toBe(true);
  expect(f.annotations.group.children.filter(object=>object.visible).length).toBeGreaterThanOrEqual(5);
  const labels=[];f.model.group.traverse(object=>{if(object instanceof THREE.Sprite&&object.userData.screenAnnotation&&visible(object)){
   expect(object.userData.selectId).toBe(target);const screen=object.position.clone().project(f.camera);labels.push([(screen.x+1)*195,(1-screen.y)*180]);
  }});
  expect(labels.length).toBeGreaterThan(0);for(const [x,y]of labels){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(390);expect(y).toBeGreaterThanOrEqual(109);expect(y).toBeLessThanOrEqual(256);}
  dispose(f);
 });
});
