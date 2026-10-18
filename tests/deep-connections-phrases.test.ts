import * as THREE from 'three';
import {describe,it,expect,vi} from 'vitest';
// @ts-expect-error Node-only fixture reading; the browser project has no Node ambient types.
import {readFileSync} from 'node:fs';
import {deepConnectionsPhrases} from '../src/data/deepConnectionsPhrases';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings} from '../src/lib/narrationPhraseGuide';
import {visualGuideForCue} from '../src/data/visualGuidance';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import {buildConnectionProcessesScene} from '../src/scene/connectionProcesses';
import {buildRailwayEngineeringScene} from '../src/scene/railwayEngineering';
import {buildDevelopmentSystemsScene} from '../src/scene/developmentSystems';
import {buildTravelUnderstandingScene} from '../src/scene/travelUnderstandingScene';
import type {TibetSceneProps} from '../src/scene/TibetScene';

vi.mock('../src/scene/environment',async importOriginal=>{
 const original=await importOriginal<typeof import('../src/scene/environment')>();
 return {...original,label:(text:string)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.Texture()}));sprite.userData.labelText=text;return sprite;},mineralTexture:()=>new THREE.Texture()};
});
const ids=['R1','R2','R3','M1','M2','M3','T1','T2','T3'];
const cues=ids.flatMap(id=>journeySteps[id].cues);
function guideAt(id:string,token:string,fraction=.5){
 const cue=cues.find(cue=>cue.id===id)!,phrase=narrationPhraseBindings(id,cue.narration).find(phrase=>phrase.token===token)!;
 expect(phrase,`${id}: ${token}`).toBeDefined();
 return visualGuideForCue(id,.01,true,{precision:'provider',textProgress:(phrase.textStart+(phrase.textEnd-phrase.textStart)*fraction)/cue.narration.length})!;
}
const shown=(object:THREE.Object3D)=>{for(let parent:THREE.Object3D|null=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;};
const settings=(guide:ReturnType<typeof guideAt>)=>({...guide.sceneSettings,progress:guide.sceneProgress!});
function fixture(kind:'connection'|'railway'|'development'|'travel',step=0,width=1280,height=720){
 const camera=new THREE.PerspectiveCamera(43,width/height,.1,180);camera.position.set(22,26,34);camera.lookAt(0,2,0);camera.updateMatrixWorld();
 const runtime={camera,renderer:{getSize:(v:THREE.Vector2)=>v.set(width,height)}};
 const model=kind==='connection'?buildConnectionProcessesScene(runtime):kind==='railway'?buildRailwayEngineeringScene(runtime):kind==='development'?buildDevelopmentSystemsScene(runtime):buildTravelUnderstandingScene(runtime);
 const props:TibetSceneProps={scene:kind==='connection'?'connections':kind==='travel'?'travel':'modern',step,season:3,layer:'water',selected:'',progress:0,cutaway:false,playing:false,resetKey:0,routeRegions:[],onSelect:()=>{},onInteract:()=>{}};
 return {camera,model,props};
}
const physicalSnapshot=(root:THREE.Object3D)=>{const state:unknown[]=[];root.traverse(object=>{state.push([object.name,object.visible,...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()]);const mesh=object as THREE.Mesh;if(mesh.geometry)state.push([mesh.geometry.drawRange.start,mesh.geometry.drawRange.count]);});return state;};

describe('recording-bound connections, modern development and travel depth',()=>{
 it('covers every literal range of all 36 original recordings, without replacing narration or inventing times',()=>{
  expect(cues).toHaveLength(36);expect(Object.keys(deepConnectionsPhrases)).toHaveLength(36);
  for(const cue of cues){const phrases=narrationPhraseBindings(cue.id,cue.narration);expect(phrases.length).toBeGreaterThanOrEqual(3);expect(phrases[0].textStart).toBe(0);expect(phrases.at(-1)!.textEnd).toBe(cue.narration.length);
   for(const [index,phrase]of phrases.entries()){expect(cue.narration.slice(phrase.textStart).startsWith(phrase.token),`${cue.id}: ${phrase.token}`).toBe(true);expect(phrase.textEnd).toBeGreaterThan(phrase.textStart);if(index)expect(phrase.textStart).toBe(phrases[index-1].textEnd);expect(phrase.targets.length).toBeGreaterThan(0);expect(phrase.targets.length).toBeLessThanOrEqual(2);}
  }
 });
 it('selects each phrase from that exact real MiniMax sidecar even when raw recording progress is .01',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  for(const cue of cues){const asset=manifest.clips.find((clip:{cueId:string})=>clip.cueId===cue.id);expect(asset.text).toBe(cue.narration);const timeline=JSON.parse(readFileSync('public'+asset.subtitleUrl,'utf8')) as NarrationTimeline;expect(timeline.timingLevel).toBe('word');expect(timeline.audioSha256).toBe(asset.sha256);
   for(const phrase of narrationPhraseBindings(cue.id,cue.narration)){
    const word=timeline.words!.find(word=>word.textStart>=phrase.textStart&&word.textEnd<=phrase.textEnd);expect(word,`${cue.id}: ${phrase.token}`).toBeDefined();
    const timing=narrationTimingAt(cue.narration,(word!.start+word!.end)/2,asset.duration,timeline),guide=visualGuideForCue(cue.id,.01,true,timing)!;
    expect(guide.title,`${cue.id}: ${phrase.token}`).toBe(phrase.title);expect(guide.timingPrecision).toBe('provider');expect(guide.progress).toBe(.01);
   }
  }
 });
 it('observation cues point out controls without operating progress, changing seasons, adding stops or saving',()=>{
  for(const cue of cues.filter(cue=>cue.role==='observe'))for(const phrase of deepConnectionsPhrases[cue.id]){const guide=guideAt(cue.id,phrase.token);expect(guide.sceneProgress).toBeUndefined();expect(guide.sceneSettings).toBeUndefined();}
 });
 it('every narrated mechanism targets a currently visible physical object with a real local Vector3 anchor',()=>{
  for(const id of ids){const kind=id.startsWith('R')?'connection':id==='M1'?'railway':id.startsWith('M')?'development':'travel',step=Number(id[1])-1,{model,props}=fixture(kind,step);
   for(const cue of journeySteps[id].cues)for(const phrase of deepConnectionsPhrases[cue.id])for(const part of [.01,.5,.99]){
    const guide=guideAt(cue.id,phrase.token,part),input={...props,...cue.settings,...guide.sceneSettings,progress:guide.sceneProgress??cue.settings.progress??0,guide};model.update(input);model.group.updateMatrixWorld(true);
    const renderable=(object:THREE.Object3D)=>{
     if(!shown(object)||object.userData.screenAnnotation||object instanceof THREE.Sprite||!(object instanceof THREE.Mesh||object instanceof THREE.Line))return false;
     const geometry=object.geometry,positions=geometry.attributes.position;if(!positions)return false;
     const materials=Array.isArray(object.material)?object.material:[object.material];if(!materials.some(material=>material.visible&&(!material.transparent||material.opacity>.015)))return false;
     const available=geometry.index?.count??positions.count,drawn=Math.max(0,Math.min(geometry.drawRange.count,available-geometry.drawRange.start));if(drawn<(object instanceof THREE.Mesh?3:2))return false;
     const box=new THREE.Box3().setFromObject(object);return !box.isEmpty()&&box.getSize(new THREE.Vector3()).length()>1e-5;
    };
    for(const target of guide.targets){let matched=false;model.group.traverse(object=>{if(object.userData.screenAnnotation||!shown(object)||(object.userData.guideId!==target&&object.userData.selectId!==target)||!(object.userData.guideAnchor instanceof THREE.Vector3))return;let physical=false;object.traverse(child=>{if(renderable(child))physical=true;});if(physical)matched=true;});expect(matched,`${cue.id}: ${phrase.token} @ ${part} → ${target}`).toBe(true);}
   }model.dispose();
  }
 });
 it('rain, slope water, confluence and actual carrying appear at their spoken mechanisms and can rewind',()=>{
  const {model,props}=fixture('connection');const lower=model.group.getObjectByName('water-0-lower')!,actor=model.group.getObjectByName('connection-water-user-0')!;
  const rain=guideAt('R1-explain','雨落到坡面后'),runoff=guideAt('R1-explain','一部分汇流进入支沟'),downstream=guideAt('R1-explain','再到干支流汇合处'),use=guideAt('R1-explain','和下游使用地点',.9);
  model.update({...props,...settings(rain)});const before=physicalSnapshot(model.group);expect(shown(lower)).toBe(false);
  model.update({...props,...settings(runoff)});expect(shown(model.group.getObjectByName('water-0-runoff')!)).toBe(true);expect(shown(lower)).toBe(false);
  model.update({...props,...settings(downstream)});expect(shown(lower)).toBe(true);expect(shown(actor)).toBe(false);
  model.update({...props,...settings(use)});expect(shown(actor)).toBe(true);expect(actor.position.x).toBeGreaterThan(3);
  model.update({...props,...settings(rain)});expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('the same carrier passes the fixed saddle, then the same cargo actually leaves it for the receiver',()=>{
  const {model,props}=fixture('connection',1),carrier=model.group.getObjectByName('connection-transport-carrier')!,cargo=model.group.getObjectByName('connection-transferred-cargo')!;
  const apply=(token:string,f=.5)=>model.update({...props,...settings(guideAt('R2-explain',token,f))});
  apply('载体先到坡脚',0);const before=physicalSnapshot(model.group),start=carrier.position.clone();apply('再通过有限通口',.5);expect(carrier.position.x).toBeCloseTo(0);expect(carrier.position.distanceTo(start)).toBeGreaterThan(8);
  apply('最后把物品交给另一侧的接收者',.99);expect(cargo.position.distanceTo(carrier.position)).toBeGreaterThan(2);expect(cargo.userData.guideId).toBe('connection-cargo');expect(cargo.userData.guideAnchor).toBeInstanceOf(THREE.Vector3);
  apply('载体先到坡脚',0);expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('the season phrase stops cold circulation in the same structure and visibly changes the warm risk sample',()=>{
  const {model,props}=fixture('railway'),risk=model.group.getObjectByName('rail-unmeasured-risk-sample')!,ice=risk.children.find(item=>item instanceof THREE.Mesh&&(item.geometry as THREE.BoxGeometry).parameters.width===1.5)!;
  const cold=guideAt('M1-explain','寒季外界比地基冷时',.9),warm=guideAt('M1-explain','暖季条件不同',.9);
  model.update({...props,...settings(cold)});const before=physicalSnapshot(model.group),coldIce=ice.scale.y;const blue:THREE.Mesh[]=[];model.group.traverse(object=>{if(object instanceof THREE.Mesh&&object.material instanceof THREE.MeshBasicMaterial&&object.material.color.getHex()===0x97e3e7)blue.push(object);});expect(blue.some(shown)).toBe(true);
  model.update({...props,...settings(warm)});expect(blue.some(shown)).toBe(false);expect(ice.scale.y).toBeLessThan(coldIce*.6);
  model.update({...props,...settings(cold)});expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('R3 moves the existing slope material before multi-position sampling and record comparison, without generating event readings',()=>{
  const {model,props}=fixture('connection',2),fragment=model.group.getObjectByName('connection-slope-fragment-0')!,observation=model.group.getObjectByName('connection-shared-observation')!,records=model.group.getObjectByName('connection-record-comparison')!;
  const startGuide=guideAt('R3-opening','西藏东南部色东普谷地'),movementGuide=guideAt('R3-opening','崩落物从坡面进入谷地',.9);
  model.update({...props,...settings(startGuide)});const before=physicalSnapshot(model.group),source=fragment.position.clone();expect(shown(observation)).toBe(false);
  model.update({...props,...settings(movementGuide)});expect(fragment.position.x).toBeGreaterThan(source.x+1);expect(fragment.position.y).toBeLessThan(source.y);expect(shown(records)).toBe(false);
  model.update({...props,...settings(guideAt('R3-explain','再加入观测和材料对读',.9))});expect(shown(observation)).toBe(true);expect(shown(records)).toBe(true);expect(model.group.getObjectByName('connection-channel-constriction')!.userData.settledFragments).toBe(14);
  model.update({...props,...settings(startGuide)});expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('M2 opens the facility with staff before a physical approach lets actual users move',()=>{
  const {model,props}=fixture('development',1),staff=model.group.getObjectByName('development-facility-staff')!,user=model.group.getObjectByName('development-user-a')!,path=model.group.getObjectByName('development-facility-approach')!.children[0];
  model.update({...props,...settings(guideAt('M2-explain','先看设施存在'))});const before=physicalSnapshot(model.group),start=user.position.clone();expect(shown(staff)).toBe(false);
  model.update({...props,...settings(guideAt('M2-explain','再加入人员与开放'))});expect(shown(staff)).toBe(true);expect(shown(path)).toBe(false);expect(user.position).toEqual(start);
  model.update({...props,...settings(guideAt('M2-explain','最后接上使用者能够走到的路',.9))});expect(shown(path)).toBe(true);expect(user.position.distanceTo(start)).toBeGreaterThan(3);expect(user.userData.guideId).toBe('development-users');
  model.update({...props,...settings(guideAt('M2-explain','先看设施存在'))});expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('M3 keeps the roof fixed while exposure is stopped, the actual sightline is blocked, then maintenance enters',()=>{
  const {model,props}=fixture('development',2),roof=model.group.getObjectByName('development-generic-shelter-roof')!,line=model.group.getObjectByName('development-sightline-before-obstruction')! as THREE.Line,worker=model.group.getObjectByName('development-maintenance-worker')!;
  model.update({...props,...settings(guideAt('M3-explain','保护实物的作用',.9))});const roofPosition=roof.position.clone(),workerStart=worker.position.clone();expect(shown(line)).toBe(false);
  model.update({...props,...settings(guideAt('M3-explain','与视线、历史环境的代价',.9))});expect(shown(line)).toBe(true);expect(roof.position).toEqual(roofPosition);expect(line.userData.guideAnchor).toBeInstanceOf(THREE.Vector3);const positions=line.geometry.attributes.position;expect(new THREE.Vector3().fromBufferAttribute(positions,0).distanceTo(new THREE.Vector3().fromBufferAttribute(positions,1))).toBeGreaterThan(1);
  model.update({...props,...settings(guideAt('M3-explain','模型保持同一活动',.9))});expect(worker.position.distanceTo(workerStart)).toBeGreaterThan(2);expect(roof.position).toEqual(roofPosition);model.dispose();
 });
 it('T2 moves different real scene entities in order, ends outside a still-unverified gate and rewinds',()=>{
  const {model,props}=fixture('travel',1),main=model.group.getObjectByName('travel-main-vehicle')!,feeder=model.group.getObjectByName('travel-feeder-vehicle')!,walker=model.group.getObjectByName('travel-arriving-person')!,gate=model.group.getObjectByName('travel-access-pending-gate')!;
  model.update({...props,...settings(guideAt('T2-explain','主车先到节点',0))});const before=physicalSnapshot(model.group),mainStart=main.position.clone();expect(shown(feeder)).toBe(false);expect(shown(walker)).toBe(false);
  model.update({...props,...settings(guideAt('T2-explain','接驳车辆再走另一段',.5))});const mainArrived=main.position.clone(),feederStart=feeder.position.clone();expect(main.position.distanceTo(mainStart)).toBeGreaterThan(6);expect(shown(feeder)).toBe(true);expect(shown(walker)).toBe(false);
  model.update({...props,...settings(guideAt('T2-explain','最后人物沿踏步走到入口外',1))});expect(main.position).toEqual(mainArrived);expect(feeder.position.distanceTo(feederStart)).toBeGreaterThan(1);expect(shown(walker)).toBe(true);expect(walker.position.z).toBeGreaterThan(gate.position.z);expect(gate.userData.status).toBe('unverified');expect(walker.userData.guideAnchor).toBeInstanceOf(THREE.Vector3);
  model.update({...props,...settings(guideAt('T2-explain','主车先到节点',0))});expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('T1 keeps one landscape while environment references unfold before the same roof opens to reveal use',()=>{
  const {model,props}=fixture('travel'),roof=model.group.getObjectByName('travel-building-roof')!,aid=model.group.getObjectByName('travel-environment-transect')!,courtyard=model.group.getObjectByName('travel-building-courtyard')!,ground=model.group.getObjectByName('travel-terrain-surface')! as THREE.Mesh;
  const initial=guideAt('T1-explain','同一片河谷保留山地、水路、人居与建筑');model.update({...props,...settings(initial)});const before=physicalSnapshot(model.group),height=roof.position.y,terrain=Array.from(ground.geometry.attributes.position.array);expect(shown(aid)).toBe(false);
  model.update({...props,...settings(guideAt('T1-explain','先读环境联系'))});expect(shown(aid)).toBe(true);expect(roof.position.y).toBe(height);expect(shown(courtyard)).toBe(false);
  model.update({...props,...settings(guideAt('T1-explain','再打开建筑观察入口和使用空间',.95))});expect(roof.position.y).toBeGreaterThan(height+1);expect(shown(courtyard)).toBe(true);expect(Array.from(ground.geometry.attributes.position.array)).toEqual(terrain);
  const holder=model.group.getObjectByName('travel-unwritten-source-holder')!;expect(shown(holder)).toBe(false);model.update({...props,...settings(guideAt('T1-explain','最后把有出处的材料放回来',.1))});const incoming=holder.position.clone();expect(shown(holder)).toBe(true);model.update({...props,...settings(guideAt('T1-explain','最后把有出处的材料放回来',.95))});expect(holder.position.distanceTo(incoming)).toBeGreaterThan(.7);expect(holder.userData.reconstruction).toBe(false);
  model.update({...props,...settings(initial)});expect(physicalSnapshot(model.group)).toEqual(before);model.dispose();
 });
 it('T3 physically opens separate source, condition and record objects while every status and notebook stays unverified/unsaved',()=>{
  const {model,props}=fixture('travel',2),conditions=model.group.getObjectByName('travel-conditions-desk')??model.group.children.find(item=>item.userData.selectId==='travel-conditions')!,record=model.group.children.find(item=>item.userData.selectId==='travel-record')!,book=model.group.getObjectByName('travel-unwritten-notebook')!;
  model.update({...props,...settings(guideAt('T3-explain','材料柜保留为什么去和相关认识'))});expect(shown(conditions)).toBe(false);expect(shown(record)).toBe(false);
  model.update({...props,...settings(guideAt('T3-explain','状态台提醒日期、交通与开放还要核实'))});expect(shown(conditions)).toBe(true);expect(shown(record)).toBe(false);
  model.update({...props,...settings(guideAt('T3-explain','笔记本等待自己的问题与新观察',.9))});expect(shown(record)).toBe(true);expect(book.userData.saved).toBe(false);expect(book.userData.travelCompleted).toBe(false);model.group.traverse(item=>{if(item.name==='travel-unverified-status-slot')expect(item.userData.verified).toBe(false);});expect(model.group.userData.travelState.candidateCount).toBe(0);model.dispose();
 });
 it.each([['connection',2],['railway',0],['development',2],['travel',1]] as const)('%s fits real anchored captions above the compact phone controls', (kind,step)=>{
  const {model,props,camera}=fixture(kind,step,390,371);model.update({...props,progress:.9});let count=0;
  model.group.traverse(object=>{if(object instanceof THREE.Sprite&&object.visible&&object.userData.screenAnnotation){count++;const y=(1-object.position.clone().project(camera).y)*371/2;expect(y).toBeGreaterThanOrEqual(79.99);expect(y).toBeLessThanOrEqual(266.01);}});expect(count).toBeGreaterThan(0);expect(count).toBeLessThanOrEqual(3);model.dispose();
 });
});
