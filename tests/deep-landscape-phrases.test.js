import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {deepLandscapePhrases} from '../src/data/deepLandscapePhrases';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings,narrationPhraseGuide} from '../src/lib/narrationPhraseGuide';
import {narrationTimingAt,validateNarrationTimeline} from '../src/lib/narrationTiming';
import {livingLandscapeState} from '../src/data/livingUnderstanding';
import {buildLivingLandscapeScene} from '../src/scene/livingLandscape';
import {buildLandformProcessScene} from '../src/scene/landformProcess';
import {buildLocalLandscapeScene,sampleLocalLandscape,localLandscapePosition} from '../src/scene/localLandscape';
import {elevationPose,elevationDescriptors,sampleElevationMetres} from '../src/lib/elevationReading';
import {settingsForStep} from '../src/lib/store';
import {disposeTree} from '../src/scene/environment';

vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.labelText=text;return sprite;},mineralTexture:()=>new THREE.Texture()}));
afterEach(()=>vi.unstubAllGlobals());
const ids=['E1','E2','E3','P1','P2','P3'],cues=ids.flatMap(id=>journeySteps[id].cues);
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex'),recordings=new Map();
const base={scene:'region',step:2,viewKey:'E3',season:1,layer:'settlements',progress:0,selected:'',cutaway:false,playing:false,resetKey:0,onSelect:()=>{},onInteract:()=>{},livingSetting:'valley',communitySupport:'individual'};
function recording(cueId){
 if(recordings.has(cueId))return recordings.get(cueId);
 const cue=cues.find(cue=>cue.id===cueId),asset=manifest.clips.find(asset=>asset.cueId===cueId);
 expect(asset.text).toBe(cue.narration);
 expect(sha(readFileSync(`public${asset.url}`)),`${cueId}: actual MP3 SHA`).toBe(asset.sha256);
 const raw=readFileSync(`public${asset.subtitleUrl}`);expect(sha(raw),`${cueId}: original subtitle SHA`).toBe(asset.subtitleSha256);
 const timeline=validateNarrationTimeline(JSON.parse(raw.toString('utf8')),asset,sha(cue.narration));expect(timeline?.timingLevel,cueId).toBe('word');
 const value={cue,timeline,asset};recordings.set(cueId,value);return value;
}
/** Use a real provider word nearest the desired source-text location. No test
 * invents a timestamp or substitutes recording length for spoken position. */
function native(cueId,token,local=.5){
 const {cue,timeline}=recording(cueId),bindings=narrationPhraseBindings(cueId,cue.narration),index=bindings.findIndex(binding=>binding.token===token),binding=bindings[index];
 expect(binding,`${cueId}: ${token}`).toBeDefined();
 const target=binding.textStart+(binding.textEnd-binding.textStart)*local;
 const words=timeline.words.filter(word=>word.textStart>=binding.textStart&&word.textEnd<=binding.textEnd&&/[\p{L}\p{N}]/u.test(word.text));
 const word=words.sort((a,b)=>Math.abs((a.textStart+a.textEnd)/2-target)-Math.abs((b.textStart+b.textEnd)/2-target))[0];expect(word).toBeDefined();
 const seconds=(word.start+word.end)/2,timing=narrationTimingAt(cue.narration,seconds,timeline.duration,timeline),guide=narrationPhraseGuide(cueId,cue.narration,.01,timing);
 expect(guide.phraseId).toBe(binding.phraseId);
 const stepId=cueId.split('-')[0],step=ids.indexOf(stepId)%3,scene=stepId.startsWith('P')?'landscape':'region';
 const settings=bindings.slice(0,index+1).reduce((settings,item)=>({...settings,...item.settings}),{...base,...settingsForStep({id:stepId,layer:cue.settings.layer??'terrain',scene}),...cue.settings,step,scene,viewKey:stepId});
 return {cue,timeline,binding,timing,guide,seconds,props:{...settings,...guide.sceneSettings,progress:guide.sceneProgress??settings.progress,guide}};
}
function runtime(width=1280,height=720){const camera=new THREE.PerspectiveCamera(43,width/height,.1,250);camera.position.set(17,13,22);camera.lookAt(0,1,0);camera.updateMatrixWorld();return {camera,renderer:{getSize:v=>v.set(width,height)},focus:(position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();},hasSavedView:()=>false};}
function shown(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function subject(root,id){let found;root.traverse(object=>{if(!found&&!(object instanceof THREE.Sprite)&&(object.userData.selectId===id||object.userData.guideId===id))found=object;});return found;}
function snapshot(root){const result=[];root.traverse(object=>{if(!shown(object))return;result.push([object.name,...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()]);if(object.geometry)result.push(Array.from(object.geometry.attributes.position.array),{...object.geometry.drawRange});});return result;}
function nearestHeight(geometry,x,z){const p=geometry.attributes.position;let at=0,distance=Infinity;for(let i=0;i<p.count;i++){const d=(p.getX(i)-x)**2+(p.getZ(i)-z)**2;if(d<distance){distance=d;at=i;}}return p.getY(at);}
function stored(root){const levels=[];root.traverse(object=>{if(object.name==='living-stored-water-level')levels.push(object);});return levels;}
function bytesResponse(url){const bytes=readFileSync(`public${url}`);return {ok:true,json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}

describe('deeper regional and landscape phrases drive actual recorded processes',()=>{
 it('covers all 24 unchanged scripts with literal contiguous source ranges, not equal-time chapters',()=>{
  expect(cues).toHaveLength(24);expect(Object.keys(deepLandscapePhrases).sort()).toEqual(cues.map(cue=>cue.id).sort());
  for(const cue of cues){const bindings=narrationPhraseBindings(cue.id,cue.narration);expect(bindings.length,cue.id).toBe(deepLandscapePhrases[cue.id].length);expect(bindings[0].textStart).toBe(0);expect(bindings.at(-1).textEnd).toBe(cue.narration.length);
   for(const [index,binding]of bindings.entries()){expect(cue.narration.slice(binding.textStart).startsWith(binding.token)).toBe(true);expect(binding.textEnd).toBeGreaterThan(binding.textStart);expect(binding.targets.length).toBeGreaterThan(0);expect(binding.targets.length).toBeLessThanOrEqual(3);if(index)expect(binding.textStart).toBe(bindings[index-1].textEnd);}
  }
 });
 it.each(cues.map(cue=>[cue.id]))('%s matches its actual MP3, original sidecar and every native spoken anchor',cueId=>{
  const {cue}=recording(cueId);
  for(const binding of narrationPhraseBindings(cueId,cue.narration)){const state=native(cueId,binding.token);expect(state.guide.textProgress).toBe(state.timing.textProgress);expect(state.guide.progress).toBe(.01);expect(state.guide.title).toBe(binding.title);if(binding.from!==undefined){expect(state.guide.sceneProgress).toBeGreaterThanOrEqual(Math.min(binding.from,binding.to));expect(state.guide.sceneProgress).toBeLessThanOrEqual(Math.max(binding.from,binding.to));}}
 });
 it('leaves every user observation cue under manual scene control',()=>{
  for(const cue of cues.filter(cue=>cue.id.endsWith('-observe')))for(const binding of deepLandscapePhrases[cue.id]){const state=native(cue.id,binding.token);expect(binding.settings).toBeUndefined();expect(binding.from).toBeUndefined();expect(state.guide.sceneSettings).toBeUndefined();expect(state.guide.sceneProgress).toBeUndefined();}
 });
 it('E1/E2 compare sourced places without using altitude colour as unprovided temperature or rain',()=>{
  const a=native('E1-explain','高度、来流、水汽与山谷方向'),b=native('E1-explain','它们的组合随地区改变');
  expect(a.props.selected).toBe('nyingchi');expect(a.props.compareRegion).toBe('nagqu');expect(b.props.selected).toBe('nyingchi');expect(b.props.compareRegion).toBe('ngari');expect(a.guide.sceneProgress).toBeUndefined();
  const comparison=native('E2-explain','颜色表示网格海拔');expect(comparison.props.selected).toBe('nagqu');expect(comparison.props.compareRegion).toBe('nyingchi');expect(comparison.props.layer).toBe('terrain');expect(comparison.guide.explanation).toContain('气候');
 });
 it.each(['individual','shared'])('E3 fills the same container, carries it and transfers water into storage with %s organization',communitySupport=>{
  const model=buildLivingLandscapeScene(runtime()),carrier=model.group.getObjectByName('living-water-user-0'),held=model.group.getObjectByName('living-carried-water-0'),bucket=model.group.getObjectByName('living-bucket-0');
  const update=(token,local=.5)=>{const state=native('E3-explain',token,local);model.update({...state.props,communitySupport});return {...state,physical:livingLandscapeState({...state.props,communitySupport})};};
  update('沿同一坡面看取水',.1);const origin=carrier.position.clone();expect(held.visible).toBe(false);expect(stored(model.group).every(level=>!level.visible)).toBe(true);
  const fill=update('人物先在水源旁把容器装水',.9);expect(held.visible).toBe(true);expect(fill.physical.fill).toBeGreaterThan(.8);expect(fill.physical.pour).toBe(0);expect(carrier.position).toEqual(origin);expect(stored(model.group).every(level=>!level.visible)).toBe(true);const heldBefore=held.position.y;
  const moving=update('再带着水走向用水处',.6);const along=carrier.position.clone();expect(along.distanceTo(origin)).toBeGreaterThan(.5);expect(moving.physical.carriedWater).toBe(1);expect(moving.physical.storedWater).toBe(0);
  update('水没有自行流向高处');const arrived=carrier.position.clone(),lowBucket=bucket.position.y;expect(arrived.distanceTo(along)).toBeGreaterThan(.2);
  update('走到以后，抬起容器',.8);expect(carrier.position).toEqual(arrived);expect(bucket.position.y).toBeGreaterThan(lowBucket);
  const transfer=update('把水倒进储水构件',.6);expect(carrier.position).toEqual(arrived);expect(transfer.physical.pour).toBeGreaterThan(0);expect(transfer.physical.pour).toBeLessThan(1);expect(held.position.y).toBeLessThan(heldBefore);expect(stored(model.group).every(level=>level.visible)).toBe(true);
  const storedDuring=stored(model.group).map(level=>level.position.y);let streams=0;model.group.traverse(object=>{if(object.name==='living-pouring-water'&&shown(object)){streams++;const positions=object.geometry.attributes.position;expect(positions.getY(0)).toBeGreaterThan(positions.getY(1));}});expect(streams).toBeGreaterThan(0);expect(transfer.physical.carriedWater+transfer.physical.storedWater).toBeCloseTo(1,12);
  const later=update('携带的水减少，储水增加',.9);expect(later.physical.carriedWater).toBeLessThan(transfer.physical.carriedWater);expect(stored(model.group).every((level,index)=>level.position.y>storedDuring[index])).toBe(true);
  model.update({...moving.props,communitySupport});expect(carrier.position).toEqual(along);expect(stored(model.group).every(level=>!level.visible)).toBe(true);expect(held.visible).toBe(true);model.dispose();
 });
 it('P3 reuses the same fill→carry→store mechanism and keeps blank memory separate from invented history',()=>{
  const model=buildLivingLandscapeScene(runtime()),actor=model.group.getObjectByName('living-water-user-0'),memory=model.group.getObjectByName('living-evidence-question');
  const fill=native('P3-explain','先在水源旁取水',.7);model.update(fill.props);const start=actor.position.clone();expect(livingLandscapeState(fill.props).fill).toBeGreaterThan(.5);expect(livingLandscapeState(fill.props).pour).toBe(0);expect(shown(memory)).toBe(false);
  const carrying=native('P3-explain','再沿通行段把水带到生活空间',.6);model.update(carrying.props);const midway=actor.position.clone(),reference=snapshot(model.group);expect(midway.distanceTo(start)).toBeGreaterThan(.5);expect(stored(model.group).every(level=>!level.visible)).toBe(true);
  const pouring=native('P3-explain','最后倒入储水容器',.6);model.update(pouring.props);const water=livingLandscapeState(pouring.props);expect(water.pour).toBeGreaterThan(.2);expect(water.pour).toBeLessThan(1);expect(water.carriedWater+water.storedWater).toBeCloseTo(1);expect(stored(model.group).every(level=>level.visible)).toBe(true);
  model.update(native('P3-explain','地名、故事与信仰的意义').props);expect(shown(memory)).toBe(true);model.update(carrying.props);expect(snapshot(model.group)).toEqual(reference);model.update({...carrying.props,playing:true});expect(snapshot(model.group)).toEqual(reference);model.dispose();
 });
 it('P2 native phrases lower the actual channel before raising actual downstream deposits and rewind every mesh',()=>{
  const model=buildLandformProcessScene(runtime()),ground=subject(model.group,'landform-slope'),water=subject(model.group,'landform-channel'),sediment=subject(model.group,'landform-sediment'),deposit=subject(model.group,'landform-deposit');
  const initial=native('P2-opening','先找坡面、河道和较低处');model.update(initial.props);const channelStart=nearestHeight(ground.geometry,0,0),depositStart=nearestHeight(ground.geometry,1.8,4.3);
  const moving=native('P2-explain','沿水路看物质进入河道并向下移动',.2);model.update(moving.props);const earlierMaterial=sediment.children.map(child=>child.position.z);
  const incision=native('P2-explain','同时比较谷地局部下切',.8);model.update(incision.props);const reference=snapshot(model.group),fanBeforeDeposit=nearestHeight(ground.geometry,1.8,4.3);expect(nearestHeight(ground.geometry,0,0)).toBeLessThan(channelStart-.4);expect(fanBeforeDeposit).toBeLessThanOrEqual(depositStart);expect(shown(deposit)).toBe(false);expect(sediment.children.every((child,index)=>child.position.z>earlierMaterial[index])).toBe(true);
  model.update(native('P2-explain','继续推进').props);expect(shown(deposit)).toBe(false);
  const depositional=native('P2-explain','一部分物质在较低处堆积',.9);model.update(depositional.props);expect(shown(deposit)).toBe(true);expect(deposit.children.filter(child=>child.visible).length).toBeGreaterThan(10);expect(nearestHeight(ground.geometry,1.8,4.3)).toBeGreaterThan(fanBeforeDeposit+.1);
  const path=water.geometry.attributes.position;for(let i=2;i<path.count;i+=2)expect(path.getY(i)).toBeLessThan(path.getY(i-2));
  const initialOutline=model.group.getObjectByName('initial-landform-reference');expect(nearestHeight(initialOutline.geometry,0,0)).toBeCloseTo(channelStart+.035,5);
  model.update(incision.props);expect(snapshot(model.group)).toEqual(reference);model.update({...incision.props,playing:true});expect(snapshot(model.group)).toEqual(reference);disposeTree(model.group);
 });
 it('P1 guided elevation readings follow the real source position and 3D probe, never the fixed raw audio fraction',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>bytesResponse(url)));
  const model=buildLocalLandscapeScene(runtime());await model.ready;
  const bytes=readFileSync(`public${elevationDescriptors.local.dataUrl}`),grid=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2),probe=subject(model.group,'local-probe');
  const update=local=>{const state=native('P1-explain','切线向东西移动',local);model.update(state.props);const pose=elevationPose('P1',state.props,state.guide);return {...state,pose};};
  const first=update(.2),firstPoint=probe.userData.guideAnchor.clone();expect(first.guide.progress).toBe(.01);expect(first.pose.profile).toBe(true);expect(first.pose.fraction).toBeCloseTo((first.guide.sceneProgress-.68)/.32,12);expect(first.pose.fraction).toBeGreaterThan(.1);expect(probe.userData.coordinates).toEqual([first.pose.longitude,first.pose.latitude]);
  const metres=sampleElevationMetres(grid,elevationDescriptors.local,first.pose.longitude,first.pose.latitude);expect(probe.userData.sourceMetres).toBeCloseTo(metres,8);expect(metres).toBeCloseTo(sampleLocalLandscape(grid,first.pose.longitude,first.pose.latitude),8);expect(firstPoint.distanceTo(localLandscapePosition(first.pose.longitude,first.pose.latitude,metres+20))).toBeLessThan(1e-8);
  const later=update(.8);expect(later.pose.longitude).toBeGreaterThan(first.pose.longitude);expect(later.pose.latitude).toBeGreaterThan(first.pose.latitude);expect(probe.userData.guideAnchor.distanceTo(firstPoint)).toBeGreaterThan(.1);expect(probe.userData.coordinates).toEqual([later.pose.longitude,later.pose.latitude]);
  const back=update(.2);expect(back.pose).toEqual(first.pose);expect(probe.userData.guideAnchor).toEqual(firstPoint);model.dispose();
 });
});
