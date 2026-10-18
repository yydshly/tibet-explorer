import * as THREE from 'three';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {buildEarth,buildTerrainScene} from '../src/scene/TibetSceneRuntime';
import {longTermEnergyState} from '../src/lib/longTermEnergyState';
import {disposeTree,latLon} from '../src/scene/environment';
import {readFileSync} from 'node:fs';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings,narrationPhraseGuide} from '../src/lib/narrationPhraseGuide';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {sceneUnderstanding} from '../src/data/sceneUnderstanding';
import {defaultSettings} from '../src/lib/store';

vi.mock('../src/scene/environment',async original=>({...await original(),label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),mineralTexture:()=>new THREE.Texture(),landscapeHorizon:()=>new THREE.Group(),addMarker:(parent,id,_text,x,y,z)=>{const group=new THREE.Group();group.position.set(x,y,z);group.userData.selectId=id;parent.add(group);return group;}}));
beforeEach(()=>{
 const ctx={createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4)}),putImageData:()=>{},createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}};
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})});
 vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,loaded)=>{const texture=new THREE.Texture();loaded?.(texture);return texture;});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function props(patch={}){return {scene:'climate',viewKey:'C8',step:7,season:1,layer:'forcing',progress:.1,playing:false,selected:'',cutaway:false,resetKey:0,onSelect:()=>{},onInteract:()=>{},...patch};}
function find(root,id){let found;root.traverse(object=>{if(!found&&object.userData.guideId===id)found=object;});return found;}
function native(cueId,token){
 const cue=journeySteps[cueId.split('-')[0]].cues.find(cue=>cue.id===cueId),phrase=narrationPhraseBindings(cueId,cue.narration).find(phrase=>phrase.token===token);
 const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8')),asset=manifest.clips.find(clip=>clip.cueId===cueId),timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
 const words=timeline.words.filter(word=>word.textStart>=phrase.textStart&&word.textEnd<=phrase.textEnd),word=words[Math.floor(words.length/2)],timing=narrationTimingAt(cue.narration,(word.start+word.end)/2,timeline.duration,timeline);
 const guide=narrationPhraseGuide(cueId,cue.narration,.01,timing);return props({...guide.sceneSettings,progress:guide.sceneProgress??.5,guide});
}
function energySnapshot(model){const packet=model.group.getObjectByName('climate-energy-packets'),energy=model.group.getObjectByName('climate-energy-pathways'),ice=model.group.getObjectByName('climate-ice-reference');return {
 packet:Array.from(packet.geometry.attributes.position.array),phase:energy.userData.explanationPhase,
 arrows:energy.children.filter(object=>object instanceof THREE.ArrowHelper).map(arrow=>[arrow.line.scale.y,arrow.cone.position.y,arrow.line.material.opacity,...arrow.position.toArray()]),
 ice:Array.from(ice.geometry.attributes.position.array),iceVisible:ice.visible,responseVisible:model.group.getObjectByName('climate-response-references').visible,
 };}

describe('remaining solar, seasonal and long-term energy scenes',()=>{
 it('solar anchors identify the real Sun, north-axis endpoint, Lhasa and the camera-facing Earth surface',()=>{
  const camera=new THREE.PerspectiveCamera(43,390/360,.1,180);camera.position.set(8,5,-13);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const renderer={getSize:v=>v.set(390,360),capabilities:{getMaxAnisotropy:()=>8}},model=buildEarth(true,{camera,renderer,sun:new THREE.DirectionalLight()});
  for(const season of [1,3,1]){
   model.update(props({scene:'sun',viewKey:'C1',season,layer:'solar'}),0,0);
   const earth=find(model.group,'solar-earth'),axis=find(model.group,'solar-axis'),sun=find(model.group,'sun-source'),lhasa=find(model.group,'lhasa');
   for(const object of [earth,axis,sun,lhasa])expect(object.userData.guideAnchor).toBeInstanceOf(THREE.Vector3);
   expect(earth.userData.guideAnchor.length()).toBeCloseTo(2.7,10);expect(axis.userData.guideAnchor.toArray()).toEqual([0,2.7*1.25,0]);expect(sun.userData.guideAnchor.toArray()).toEqual([0,0,0]);
   const surface=earth.localToWorld(earth.userData.guideAnchor.clone()),center=earth.getWorldPosition(new THREE.Vector3());
   expect(surface.clone().sub(center).normalize().dot(camera.position.clone().sub(center).normalize())).toBeCloseTo(1,10);
   expect(lhasa.position.distanceTo(latLon(29.65,91.1,2.77))).toBeLessThan(1e-9);
  }
  model.dispose();disposeTree(model.group);
 });
 it('C7 uses two actual vertices of one unchanged terrain mesh while its existing seasonal colours differ',()=>{
  const model=buildTerrainScene('climate'),surface=find(model.group,'climate-surface'),snow=find(model.group,'terrain-snow'),land=find(model.group,'terrain-surface');
  const coordinates=Array.from(surface.geometry.attributes.position.array),hasVertex=point=>{
   const position=surface.geometry.attributes.position;for(let i=0;i<position.count;i++)if(point.distanceTo(new THREE.Vector3().fromBufferAttribute(position,i))<1e-9)return true;return false;
  };
  model.update(native('C7-explain','从夏至切到冬至'),0,0);const summer=Array.from(surface.geometry.attributes.color.array);
  model.update(native('C7-explain','观察同一山地表面与照射背景的变化'),100,.1);const winter=Array.from(surface.geometry.attributes.color.array);
  expect(winter).not.toEqual(summer);expect(Array.from(surface.geometry.attributes.position.array)).toEqual(coordinates);
  expect(hasVertex(snow.userData.guideAnchor)).toBe(true);expect(hasVertex(land.userData.guideAnchor)).toBe(true);expect(snow.userData.guideAnchor.y).toBeGreaterThan(land.userData.guideAnchor.y);
  model.update(native('C7-explain','从夏至切到冬至'),500,.1);expect(Array.from(surface.geometry.attributes.color.array)).toEqual(summer);
  disposeTree(model.group);
 });
 it('C8 native driver, adjustment and response phrases alter actual arrows while all ice and land geometry stays fixed',()=>{
  const model=buildTerrainScene('climate'),surface=find(model.group,'climate-surface'),land=Array.from(surface.geometry.attributes.position.array);
  model.update(native('C8-explain','温室气体改变地球向外散失能量的条件'),0,0);const driver=energySnapshot(model);
  model.update(native('C8-explain','系统需要调整到新的收支状态'),20,.5);const adjust=energySnapshot(model);
  model.update(native('C8-explain','冰雪、海洋和陆地各有不同响应时间'),40,.5);const response=energySnapshot(model);
  expect(driver.phase).toBe('driver');expect(adjust.phase).toBe('adjustment');expect(response.phase).toBe('response');
  expect(driver.arrows).not.toEqual(adjust.arrows);expect(adjust.arrows).not.toEqual(response.arrows);
  // Incoming reference is unchanged; exchange/return paths change on the
  // explanatory state. No plotted glacier contraction is attributed to it.
  expect(driver.arrows.slice(0,3)).toEqual(response.arrows.slice(0,3));expect(response.ice).toEqual(driver.ice);expect(response.ice).toEqual(adjust.ice);
  expect(driver.responseVisible).toBe(false);expect(response.responseVisible).toBe(true);expect(response.iceVisible).toBe(true);
  expect(Array.from(surface.geometry.attributes.position.array)).toEqual(land);
  const target=find(model.group,'climate-space'),arrows=model.group.getObjectByName('climate-energy-pathways').children.filter(object=>object.name==='climate-outgoing-energy'),state=longTermEnergyState(native('C8-explain','冰雪、海洋和陆地各有不同响应时间').progress);
  expect(target.userData.guideAnchor.distanceTo(arrows[2].position.clone().addScaledVector(new THREE.Vector3(-.12,1,0).normalize(),state.outgoingLength))).toBeLessThan(1e-9);
  disposeTree(model.group);
 });
 it('C8 energy packets remain on their actual arrow paths and are deterministic through pause and backwards replay',()=>{
  const model=buildTerrainScene('climate'),start=props({progress:.2});model.update(start,0,0);const first=energySnapshot(model);
  const last=props({progress:.8,playing:true});model.update(last,100,.5);const end=energySnapshot(model);model.update({...last,playing:false},5000,100);expect(energySnapshot(model)).toEqual(end);
  model.update(start,8000,100);expect(energySnapshot(model)).toEqual(first);
  const energy=model.group.getObjectByName('climate-energy-pathways'),incoming=energy.children.filter(object=>object.name==='climate-incoming-energy'),outgoing=energy.children.filter(object=>object.name==='climate-outgoing-energy'),state=longTermEnergyState(.2),packet=model.group.getObjectByName('climate-energy-packets').geometry.attributes.position;
  for(const i of [0,20,59,60,80,119]){
   const down=i<60,arrow=(down?incoming:outgoing)[i%3],direction=new THREE.Vector3(...(down?[.15,-1,0]:[-.12,1,0])).normalize(),phase=(i/20+.2*.8)%1,length=down?4.6:state.outgoingLength;
   expect(new THREE.Vector3().fromBufferAttribute(packet,i).distanceTo(arrow.position.clone().addScaledVector(direction,phase*length))).toBeLessThan(5e-7);
  }
  disposeTree(model.group);
 });
 it('energy display-state ranges are bounded, reversible, and have no inferred physical units',()=>{
  const start=longTermEnergyState(.1),driver=longTermEnergyState(.35),adjust=longTermEnergyState(.65),response=longTermEnergyState(.8);
  expect(start.incomingLength).toBe(response.incomingLength);expect(driver.outgoingLength).toBeLessThan(start.outgoingLength);expect(adjust.outgoingLength).toBeGreaterThan(driver.outgoingLength);
  expect(response.returnLength).toBeGreaterThan(start.returnLength);expect(response.surfaceAttention).toBeGreaterThan(driver.surfaceAttention);
  expect(longTermEnergyState(.1)).toEqual(start);expect(longTermEnergyState(NaN)).toEqual(longTermEnergyState(0));
  expect(Object.keys(response).some(key=>/temperature|flux|year|metre/i.test(key))).toBe(false);
 });
 it('C8 manual phase feedback changes at the same driver/adjustment/response boundaries as the 3D state',()=>{
  const settings={...defaultSettings('forcing'),progress:.1};
  for(const [progress,phase,title]of [[.349999,'driver','驱动：'],[.35,'adjustment','收支调整：'],[.649999,'adjustment','收支调整：'],[.65,'response','响应参照：']]){
   const reading=sceneUnderstanding('C8',{...settings,progress});
   expect(longTermEnergyState(progress).phase).toBe(phase);expect(reading.title.startsWith(title)).toBe(true);
   expect(reading.hasProgress).toBe(true);expect(reading.allowsCutaway).toBe(false);expect(reading.objects).toEqual([]);
   expect(reading.provenance).toContain('无通量或温度计算');expect(reading.provenance).toContain('非真实冰川变化');
  }
 });
 it('C8 exposed manual stops drive the existing actual 3D paths, preserve fixed land/ice and reversibly return to the first state',()=>{
  const settings={...defaultSettings('forcing'),progress:.1},reading=sceneUnderstanding('C8',settings),model=buildTerrainScene('climate');
  expect(reading.processLabel).toBe('驱动 → 收支调整 → 响应参照');expect(reading.stops.map(stop=>stop.progress)).toEqual([.1,.5,.8]);
  const snapshots=reading.stops.map(stop=>{
   const manual={...settings,progress:stop.progress};model.update(props(manual),0,0);
   const snapshot=energySnapshot(model),feedback=sceneUnderstanding('C8',manual);
   expect(snapshot.phase).toBe(longTermEnergyState(stop.progress).phase);expect(feedback.title).toContain(stop.label==='驱动'?'驱动':stop.label==='收支调整'?'收支调整':'响应参照');
   return snapshot;
  });
  expect(snapshots[0].arrows).not.toEqual(snapshots[1].arrows);expect(snapshots[1].arrows).not.toEqual(snapshots[2].arrows);
  expect(snapshots[0].ice).toEqual(snapshots[2].ice);
  model.update(props({...settings,progress:reading.stops[0].progress}),4000,100);expect(energySnapshot(model)).toEqual(snapshots[0]);
  disposeTree(model.group);
 });
 it.each([[390,330],[390,280],[430,340]])('C8 mobile %s × %s projects at most three 22px labels inside the viewport without changing the physical process',(width,height)=>{
  const camera=new THREE.PerspectiveCamera(43,width/height,.1,180);camera.position.set(18,15,27);camera.lookAt(0,3,1);camera.setViewOffset(width,height,0,height*.13,width,height);camera.updateMatrixWorld();
  const renderer={getSize:value=>value.set(width,height)},model=buildTerrainScene('climate',{camera,renderer}),reference=buildTerrainScene('climate');
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  for(const token of ['温室气体改变地球向外散失能量的条件','系统需要调整到新的收支状态','冰雪、海洋和陆地各有不同响应时间','眼前箭头用于理解能量关系']){
   const p=native('C8-explain',token);model.update(p,100,.5);reference.update(p,100,.5);
   // The replaced legacy response-label group is intentionally hidden. Compare
   // the actual particles, arrow state and fixed ice geometry independently.
   const {responseVisible:_oldLabelsA,...physicalA}=energySnapshot(model),{responseVisible:_oldLabelsB,...physicalB}=energySnapshot(reference);expect(physicalA).toEqual(physicalB);
   const holder=model.group.getObjectByName('climate-compact-energy-labels'),labels=holder.children.filter(object=>object instanceof THREE.Sprite&&object.visible);
   expect(holder.visible).toBe(true);expect(labels.length).toBeGreaterThanOrEqual(1);expect(labels.length).toBeLessThanOrEqual(3);
   expect(model.group.getObjectByName('climate-energy-pathways').children.filter(object=>object instanceof THREE.Sprite).some(object=>object.visible)).toBe(false);
   expect(model.group.getObjectByName('climate-response-references').visible).toBe(false);
   const rectangles=labels.map(sprite=>{
    const center=sprite.position.clone().project(camera),world=sprite.position.clone(),xs=[],ys=[];
    for(const x of [-1,1])for(const y of [-1,1]){const point=world.clone().addScaledVector(right,sprite.scale.x*x/2).addScaledVector(up,sprite.scale.y*y/2).project(camera);xs.push((point.x+1)*width/2);ys.push((1-point.y)*height/2);}
    const box={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
    expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);expect(box.bottom-box.top).toBeCloseTo(22,7);
    const cy=(1-center.y)*height/2;expect(cy).toBeGreaterThanOrEqual(83-1e-8);expect(cy).toBeLessThanOrEqual(height-100+1e-8);
    return box;
   });
   for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
    const a=rectangles[i],b=rectangles[j];expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true);
   }
   for(const target of p.guide.targets)if(['climate-atmosphere','climate-space'].includes(target))expect(labels.some(sprite=>sprite.userData.kind===`energy-label-${target==='climate-space'?'outgoing':'air'}`)).toBe(true);
  }
  disposeTree(model.group);disposeTree(reference.group);
 });
});
