import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Exercise actual hook effects in batch order. Media events are explicit, so
// elapsed wall time cannot masquerade as recorded speech or scene progress.
const hooks=vi.hoisted(()=>{
 let slots=[],cursor=0,effects=[],dirty=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 return {
  useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return [slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
  useRef(value){const index=cursor++;return (slots[index]??={current:value});},
  useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
  useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
  render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>25)throw new Error('Journey hook did not settle');}while(dirty);return output;},
  reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
 };
});
const audio=vi.hoisted(()=>{
 const idle=()=>({status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'});
 const instances=[];
 class Controller {
  snapshot=idle();listeners=new Set();queue=[];volume=1;autoReady=true;wantsPlayback=false;
  constructor(options={}){this.options=options;instances.push(this);}
  emit(patch){this.snapshot={...this.snapshot,...patch};this.listeners.forEach(listener=>listener(this.snapshot));}
  subscribe(listener){this.listeners.add(listener);listener(this.snapshot);return()=>this.listeners.delete(listener);}
  loaded(){this.emit({status:this.wantsPlayback?'playing':'paused',duration:100});}
  start=vi.fn(queue=>{this.wantsPlayback=true;this.queue=queue.map(cue=>({...cue}));const cue=this.queue[0];this.emit({...idle(),status:'loading',cue,cueIndex:0,cueCount:queue.length});this.options.onCue?.(cue,0);if(this.autoReady)this.loaded();});
  pause=vi.fn(()=>{this.wantsPlayback=false;if(['playing','loading'].includes(this.snapshot.status))this.emit({status:'paused'});});
  stop=vi.fn(()=>{this.wantsPlayback=false;this.queue=[];this.emit(idle());});
  resume=vi.fn(()=>{this.wantsPlayback=true;this.emit({status:this.snapshot.duration?'playing':'loading'});});
  seek=vi.fn(seconds=>{const progress=Math.max(0,Math.min(1,seconds/this.snapshot.duration));this.emit({currentTime:seconds,progress});this.options.onProgress?.(progress,this.snapshot);});
  setVolume=vi.fn(value=>{this.volume=value;});
  dispose(){this.stop();this.listeners.clear();}
  finish(){this.wantsPlayback=false;this.emit({status:'ended',currentTime:100,duration:100,progress:1});this.options.onProgress?.(1,this.snapshot);this.options.onEnded?.(this.snapshot);}
  late(cue){const state={...idle(),cue,status:'ended',duration:100,progress:1};this.options.onCue?.(cue,0);this.options.onProgress?.(1,state);this.options.onEnded?.(state);this.listeners.forEach(listener=>listener(state));}
 }
 return {instances,Controller};
});
vi.mock('react',()=>({...hooks,useCallback:(callback,deps)=>hooks.useMemo(()=>callback,deps)}));
vi.mock('../src/lib/narration',()=>({NarrationController:audio.Controller}));
import {useJourneyDirector} from '../src/hooks/useJourneyDirector';
import {getJourneyStep} from '../src/data/journey';
import {journeyMotionProgress} from '../src/lib/journeyMotion';
import {narrationSentence} from '../src/lib/narrationSentence';

let options,scene;
const render=()=>hooks.render(useJourneyDirector,options);
const controller=()=>audio.instances.at(-1);
const queueFor=cue=>[{id:cue.id,text:cue.narration}];
beforeEach(()=>{
 const saved=new Map();audio.instances.length=0;scene={};
 options={stepId:'G1',home:false,voice:true,autoContinue:true,stopForObservation:false,blocked:false,request:null,apply:vi.fn(patch=>Object.assign(scene,patch)),finish:vi.fn()};
 vi.useFakeTimers({toFake:['setInterval','clearInterval','performance']});
 vi.stubGlobal('localStorage',{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)});
 vi.stubGlobal('window',{setInterval:globalThis.setInterval});
});
afterEach(()=>{hooks.reset();vi.unstubAllGlobals();vi.useRealTimers();});

describe('全球入口真实录音、字幕与场景的播放契约',()=>{
 it('静音沿实际音频进度；只流逝时间不推进，原文完整交给播放器',()=>{
  options={...options,voice:false};let director=render();director.start();director=render();
  const cue=getJourneyStep('G1').cues[0];expect(controller().queue).toEqual(queueFor(cue));expect(controller().volume).toBe(0);
  vi.advanceTimersByTime(60000);director=render();expect(director).toMatchObject({cueIndex:0,progress:0,playing:true});expect(scene.progress).toBe(cue.motion.from);
  controller().seek(43);director=render();expect(director.progress).toBeCloseTo(.43,12);expect(scene.progress).toBeCloseTo(journeyMotionProgress(cue.motion,.43),12);
  expect(director.currentSentence).toBe(narrationSentence(cue.narration,.43));
 });
 it('段中mute与开声只改音量，不重启、不归零、不重置scene或队列',()=>{
  let director=render();director.start();director=render();vi.advanceTimersByTime(150);controller().seek(47);director=render();
  const progress=director.progress,queue=controller().queue,source=controller().snapshot.cue,sceneAt={...scene};
  const starts=controller().start.mock.calls.length,stops=controller().stop.mock.calls.length,applies=options.apply.mock.calls.length;
  for(const voice of [false,true,false]){options={...options,voice};director=render();expect(director).toMatchObject({progress,playing:true});expect(controller().volume).toBe(voice?1:0);expect(controller().queue).toBe(queue);expect(controller().snapshot.cue).toBe(source);expect(scene).toEqual(sceneAt);}
  expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().stop).toHaveBeenCalledTimes(stops);expect(options.apply).toHaveBeenCalledTimes(applies);
 });
 it('加载中mute与blocked不偷跑；解除blocked后接续同cue而不是重置',()=>{
  let director=render();controller().autoReady=false;director.start();director=render();expect(director.audio.status).toBe('loading');
  const cue=director.cue,starts=controller().start.mock.calls.length;
  options={...options,voice:false,blocked:true};director=render();expect(director.playing).toBe(false);expect(controller().volume).toBe(0);
  controller().loaded();vi.advanceTimersByTime(60000);controller().seek(50);director=render();expect(director.progress).toBe(0);expect(scene.progress).toBe(cue.motion.from);
  options={...options,blocked:false};director=render();expect(director.playing).toBe(true);expect(controller().resume).toHaveBeenCalled();expect(controller().start).toHaveBeenCalledTimes(starts);
  vi.advanceTimersByTime(150);controller().seek(51);director=render();expect(director.progress).toBeCloseTo(.51,12);expect(controller().queue).toEqual(queueFor(cue));
 });
 it('暂停拒绝进度与结束回调，恢复时保留原cue和当前位置',()=>{
  let director=render();director.start();director=render();vi.advanceTimersByTime(150);controller().seek(37);director=render();
  const source=controller().snapshot.cue,starts=controller().start.mock.calls.length,sceneAt={...scene};
  director.pause();director=render();vi.advanceTimersByTime(50000);controller().late(source);director=render();
  expect(director).toMatchObject({cueIndex:0,progress:.37,mode:'paused',playing:false});expect(scene).toEqual(sceneAt);
  director.start();director=render();expect(director).toMatchObject({cueIndex:0,progress:.37,playing:true});expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().resume).toHaveBeenCalled();
 });
 it('选新cue后旧cue迟到的字幕、进度和结束不能改变新目标',()=>{
  let director=render();director.start();director=render();const old=controller().snapshot.cue;
  director.selectCue(2,true);director=render();const expected=getJourneyStep('G1').cues[2],sceneAt={...scene},starts=controller().start.mock.calls.length;
  controller().late(old);director=render();expect(director).toMatchObject({cueIndex:2,progress:0,playing:true});expect(director.audio.cue.id).toBe(expected.id);expect(controller().queue).toEqual(queueFor(expected));expect(scene).toEqual(sceneAt);expect(controller().start).toHaveBeenCalledTimes(starts);
 });
 it('跨到G2后拒绝G1迟到回调，完整讲稿仍与目标cue一一对应',()=>{
  let director=render();director.start();director=render();const old=controller().snapshot.cue;
  options={...options,stepId:'G2'};director=render();director.start();director=render();controller().late(old);director=render();
  expect(director).toMatchObject({cueIndex:0,progress:0,playing:true});expect(director.cue).toBe(getJourneyStep('G2').cues[0]);expect(controller().queue).toEqual(queueFor(director.cue));expect(director.audio.cue.id).toBe(director.cue.id);
 });
 it('同currentTime桶内的原生字幕换句也通知；手动换cue不显示旧字幕',()=>{
  let director=render();director.start();director=render();vi.advanceTimersByTime(150);controller().seek(41);director=render();
  const timing={caption:'同次录音的第一句',spokenText:'同次录音的第一句',textStart:0,textEnd:9,textProgress:.4,precision:'provider'};
  controller().emit({timing});director=render();expect(director.currentSentence).toBe(timing.caption);expect(director.narrationTiming).toEqual(timing);
  const next={...timing,caption:'同currentTime桶内的下一句',spokenText:'同currentTime桶内的下一句',textStart:9,textEnd:25,textProgress:.5};
  controller().emit({timing:next});director=render();expect(director.currentSentence).toBe(next.caption);expect(director.narrationTiming.precision).toBe('provider');
  director.selectCue(1);director=render();expect(director.currentSentence).toBe(narrationSentence(director.cue.narration,0));expect(director.narrationTiming.precision).toBe('estimated');
 });
 it('全程静音由真实ended逐段推进，末段才交给下一问题；队列从未截断原文',()=>{
  options={...options,voice:false};let director=render();director.start();director=render();const cues=getJourneyStep('G1').cues;
  for(let index=0;index<cues.length;index++){
   expect(director).toMatchObject({cueIndex:index,progress:0,playing:true});expect(controller().queue).toEqual(queueFor(cues[index]));expect(controller().volume).toBe(0);
   controller().finish();director=render();
  }
  expect(director).toMatchObject({cueIndex:cues.length-1,progress:1,mode:'paused',playing:false});expect(options.finish).toHaveBeenCalledExactlyOnceWith(true);expect(controller().start).toHaveBeenCalledTimes(cues.length);
 });
 it('静音错误同样暂停，恢复同一cue而非用估算时间越过失败',()=>{
  options={...options,voice:false};let director=render();director.start();director=render();const cue=director.cue,starts=controller().start.mock.calls.length;
  controller().emit({status:'error',error:'录音暂时不可用'});director=render();vi.advanceTimersByTime(60000);director=render();
  expect(director).toMatchObject({cueIndex:0,progress:0,mode:'paused',playing:false});expect(director.audio.error).toBe('录音暂时不可用');
  director.start();director=render();expect(controller().resume).toHaveBeenCalled();expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().queue).toEqual(queueFor(cue));
 });
 it('定位随实际讲到的亚洲、中国和西藏切换，录音百分比不能提前覆盖层级',()=>{
  options={...options,stepId:'G2'};let director=render();director.start();director=render();const text=director.cue.narration;
  for(const [token,layer,selected] of [['再找到中国这个国家','china','china'],['最后沿中国西南','tibet','tibet'],['先找到亚洲这个洲','asia','asia']]){
   vi.advanceTimersByTime(150);const start=text.indexOf(token),timing={caption:token,spokenText:token,textStart:start,textEnd:start+token.length,textProgress:(start+.1)/text.length,precision:'provider',timingLevel:'word'};
   controller().emit({progress:.06,currentTime:6,timing});controller().options.onProgress(.06,controller().snapshot);director=render();
   expect(scene).toMatchObject({layer,selected});expect(director.progress).toBe(.06);expect(director.currentSentence).toBe(token);
  }
 });
 it('云雨实体进度随真实短语推进并可回退，不按整段录音百分比跳阶段',()=>{
  options={...options,stepId:'C4'};let director=render();director.selectCue(2,true);director=render();const text=director.cue.narration;
  for(const [token,min,max] of [['满足条件才凝结成云滴',.4,.55],['才可能有降水到达地面',.62,.86],['随后水沿坡面',.86,1],['起初气团带着气态水',.05,.25]]){
   vi.advanceTimersByTime(150);const start=text.indexOf(token),timing={caption:token,spokenText:token,textStart:start,textEnd:start+token.length,textProgress:(start+.1)/text.length,precision:'provider',timingLevel:'word'};
   controller().emit({progress:.05,currentTime:5,timing});controller().options.onProgress(.05,controller().snapshot);director=render();
   expect(scene.progress).toBeGreaterThanOrEqual(min);expect(scene.progress).toBeLessThan(max);expect(director.progress).toBe(.05);
  }
 });
});
