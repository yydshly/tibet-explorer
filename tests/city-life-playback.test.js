import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Real hook effect ordering with deterministic media events; no canvas or
// wall-clock fallback can stand in for the actual recorded clip's progress.
const hooks=vi.hoisted(()=>{
 let slots=[],cursor=0,effects=[],dirty=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 return {
  useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return [slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
  useRef(value){const index=cursor++;return (slots[index]??={current:value});},
  useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
  useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
  render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>25)throw new Error('City life hook did not settle');}while(dirty);return output;},
  reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
 };
});
const audio=vi.hoisted(()=>{
 const idle=()=>({status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'});
 const instances=[];
 class Controller {
  snapshot=idle();listeners=new Set();queue=[];volume=1;autoReady=true;
  constructor(options={}){this.options=options;instances.push(this);}
  emit(patch){this.snapshot={...this.snapshot,...patch};this.listeners.forEach(listener=>listener(this.snapshot));}
  subscribe(listener){this.listeners.add(listener);listener(this.snapshot);return()=>this.listeners.delete(listener);}
  loaded(){this.emit({status:'playing',duration:100});}
  start=vi.fn(queue=>{this.queue=queue.map(cue=>({...cue}));const cue=this.queue[0];this.emit({...idle(),status:'loading',cue,cueIndex:0,cueCount:queue.length,timing:undefined});this.options.onCue?.(cue,0);if(this.autoReady)this.loaded();});
  pause=vi.fn(()=>{if(['playing','loading'].includes(this.snapshot.status))this.emit({status:'paused'});});
  stop=vi.fn(()=>{this.queue=[];this.emit(idle());});
  resume=vi.fn(()=>this.emit({status:'playing'}));
  seek=vi.fn(seconds=>{const progress=Math.max(0,Math.min(1,seconds/this.snapshot.duration));this.emit({currentTime:seconds,progress});this.options.onProgress?.(progress,this.snapshot);});
  setVolume=vi.fn(value=>{this.volume=value;});
  dispose(){this.stop();this.listeners.clear();}
  nextCue(){const index=this.snapshot.cueIndex+1,cue=this.queue[index];if(!cue)throw new Error('No next actual clip');this.emit({status:'loading',cue,cueIndex:index,currentTime:0,duration:0,progress:0,timing:undefined});this.options.onCue?.(cue,index);this.loaded();this.options.onProgress?.(0,this.snapshot);}
  finishQueue(){const cue=this.queue.at(-1);this.emit({status:'ended',cue,cueIndex:this.queue.length-1,currentTime:100,duration:100,progress:1});this.options.onProgress?.(1,this.snapshot);this.options.onEnded?.(this.snapshot);}
  late(cueId){const state={...idle(),cue:{id:cueId,text:'旧片段'},status:'ended',duration:100,progress:1};this.options.onCue?.(state.cue,0);this.options.onProgress?.(1,state);this.options.onEnded?.(state);this.listeners.forEach(listener=>listener(state));}
 }
 return {instances,Controller};
});
vi.mock('react',()=>({...hooks,useCallback:(callback,deps)=>hooks.useMemo(()=>callback,deps)}));
vi.mock('../src/lib/narration',()=>({NarrationController:audio.Controller}));
import {useCityLifeDirector} from '../src/hooks/useCityLifeDirector';
import {cityLifeNarrationSegments} from '../src/data/cityLifeJourney';
import {cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {narrationSentence} from '../src/lib/narrationSentence';

let options;
const render=()=>hooks.render(useCityLifeDirector,options);
const controller=()=>audio.instances.at(-1);
beforeEach(()=>{
 const saved=new Map();audio.instances.length=0;
 options={cityId:'lhasa',active:true,ready:true,facet:'environment',onStage:vi.fn()};
 vi.useFakeTimers({toFake:['setInterval','clearInterval','performance']});
 vi.stubGlobal('localStorage',{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)});
 vi.stubGlobal('window',{setInterval:globalThis.setInterval});
});
afterEach(()=>{hooks.reset();vi.unstubAllGlobals();vi.useRealTimers();});

describe('单城阅读使用真实录音时钟与同一段字幕',()=>{
 it('静音只改变音量，计时器不推进；实际片段逐一接管并在末片后进入生活',()=>{
  let director=render();director.setVoice(false);director=render();director.playPause();director=render();
  const segments=cityLifeNarrationSegments('lhasa','environment');
  expect(controller().queue).toEqual(segments.map(({id,text})=>({id,text})));
  expect(controller().volume).toBe(0);
  vi.advanceTimersByTime(60000);director=render();expect(director).toMatchObject({progress:0,playing:true,voice:false});
  for(let index=0;index<segments.length;index++){
   if(index){controller().nextCue();director=render();}
   expect(director).toMatchObject({stage:'environment',progress:segments[index].start,playing:true,voice:false,currentSentence:narrationSentence(segments[index].text,0)});
   expect(director.audio.cue.text).toBe(segments[index].text);
  }
  controller().finishQueue();director=render();
  expect(director).toMatchObject({stage:'life',progress:0,playing:true,voice:false});
  expect(controller().queue).toEqual(cityLifeNarrationSegments('lhasa','life').map(({id,text})=>({id,text})));
 });
 it('段中声音开关保留队列、seek、实际时间和播放位置',()=>{
  let director=render();director.playPause();director=render();vi.advanceTimersByTime(150);controller().seek(41);director=render();
  const progress=director.progress,queue=controller().queue,cue=controller().snapshot.cue.id;
  const starts=controller().start.mock.calls.length,stops=controller().stop.mock.calls.length,seeks=controller().seek.mock.calls.length;
  for(const voice of [false,true,false]){director.setVoice(voice);director=render();expect(director).toMatchObject({progress,playing:true,voice});expect(controller().volume).toBe(voice?1:0);expect(controller().queue).toBe(queue);expect(controller().snapshot.cue.id).toBe(cue);}
  expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().stop).toHaveBeenCalledTimes(stops);expect(controller().seek).toHaveBeenCalledTimes(seeks);
 });
 it('loading中开关声音不清除待定位；元数据到达后仍seek至手动选择的位置',()=>{
  let director=render();controller().autoReady=false;director.setProgress(.5);director=render();director.playPause();director=render();
  expect(director.audio.status).toBe('loading');const cue=controller().snapshot.cue.id;
  director.setVoice(false);director=render();expect(controller().snapshot.cue.id).toBe(cue);expect(director.progress).toBe(.5);
  const position=cityLifeSceneToAudio(cityLifeNarrationSegments('lhasa','environment'),.5);
  controller().loaded();director=render();
  expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(position.fraction*100,10));expect(director).toMatchObject({progress:.5,playing:true,voice:false});
 });
 it('场景尚未ready时暂停媒体且拒绝进度，ready后续播同一录音而非重建队列',()=>{
  let director=render();director.playPause();director=render();const starts=controller().start.mock.calls.length;
  options={...options,ready:false};director=render();expect(controller().snapshot.status).toBe('paused');
  vi.advanceTimersByTime(200);controller().seek(70);director=render();expect(director).toMatchObject({progress:0,playing:false});
  options={...options,ready:true};director=render();expect(director.playing).toBe(true);expect(controller().start).toHaveBeenCalledTimes(starts);
 });
 it('静音媒体失败同样停止；重试保留原队列及场景而非启动估算时钟',()=>{
  let director=render();director.setVoice(false);director=render();director.playPause();director=render();
  controller().emit({status:'error',error:'录音暂时不可用'});director=render();const progress=director.progress,starts=controller().start.mock.calls.length;
  vi.advanceTimersByTime(60000);director=render();expect(director).toMatchObject({progress,playing:false,voice:false});expect(director.audio.error).toBe('录音暂时不可用');
  director.playPause();director=render();expect(controller().resume).toHaveBeenCalled();expect(controller().start).toHaveBeenCalledTimes(starts);
 });
 it('静音拖到另一片后从真实相应片段及fraction恢复，暂停不接受迟到进度',()=>{
  let director=render();director.setVoice(false);director=render();director.playPause();director=render();director.setProgress(.81);director=render();
  const position=cityLifeSceneToAudio(cityLifeNarrationSegments('lhasa','environment'),.81);
  expect(director).toMatchObject({progress:.81,playing:false});expect(director.currentSentence).toBe(narrationSentence(position.segment.text,position.fraction));
  director.playPause();director=render();expect(controller().queue[0]).toEqual({id:position.segment.id,text:position.segment.text});expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(position.fraction*100,10));
  director.pause();director=render();controller().late(position.segment.id);director=render();expect(director).toMatchObject({progress:.81,playing:false});
 });
 it('同一stage内旧片段的cue、字幕、进度和结束事件不能覆盖新片段或跳段',()=>{
  let director=render();director.playPause();director=render();const oldId=controller().snapshot.cue.id;
  director.setProgress(.5);director=render();director.playPause();director=render();const cue=controller().snapshot.cue.id;
  controller().late(oldId);director=render();expect(director).toMatchObject({stage:'environment',progress:.5,playing:true});expect(director.audio.cue.id).toBe(cue);
  const nonFinal={...controller().snapshot,status:'ended',progress:1};controller().options.onEnded(nonFinal);director=render();expect(director.stage).toBe('environment');
 });
 it('前一城市/主题迟到回调不能覆盖新目标或推进历史',()=>{
  let director=render();director.playPause();director=render();const oldId=controller().snapshot.cue.id;
  director.selectStage('history',true);director=render();options={...options,facet:'history'};director=render();
  controller().late(oldId);director=render();expect(director).toMatchObject({stage:'history',progress:0,playing:true});
  options={...options,cityId:'ngari'};director=render();controller().late('CITY-lhasa-history-3');director=render();
  expect(director).toMatchObject({cityId:'ngari',stage:'history',progress:0,playing:false});
 });
 it('只有同片同fraction的真实字幕能接管显示，手动seek立即回落当前片的估算短句',()=>{
  let director=render();director.playPause();director=render();vi.advanceTimersByTime(150);controller().seek(41);director=render();
  const timing={caption:'提供方时间范围内的一句',spokenText:'提供方时间范围内的一句',textStart:2,textEnd:13,textProgress:.4,precision:'provider'};
  controller().emit({timing});director=render();
  expect(director.currentSentence).toBe(timing.caption);expect(director.narrationTiming).toEqual(timing);
  const word={...timing,timingLevel:'word',activeTextStart:2,activeTextEnd:3,textProgress:.41};
  controller().emit({timing:word});director=render();expect(director.narrationTiming.activeTextStart).toBe(2);
  controller().emit({timing:{...word,activeTextStart:3,activeTextEnd:4,textProgress:.42}});director=render();expect(director.narrationTiming).toMatchObject({activeTextStart:3,textProgress:.42});
  director.setProgress(.81);director=render();const position=cityLifeSceneToAudio(cityLifeNarrationSegments('lhasa','environment'),.81);
  expect(director.currentSentence).toBe(narrationSentence(position.segment.text,position.fraction));expect(director.narrationTiming.precision).toBe('estimated');
 });
 it('单城也独立返回物理进度，持久化仍保留原始媒体位置',()=>{
  let director=render();director.setProgress(.5);director=render();director.playPause();director=render();
  const segments=cityLifeNarrationSegments('lhasa','environment'),position=cityLifeSceneToAudio(segments,director.progress),raw=director.progress;
  controller().emit({timing:{caption:'同一实际片段的词',spokenText:'词',textStart:0,textEnd:8,textProgress:.8,precision:'provider',timingLevel:'word'}});director=render();
  expect(director.progress).toBe(raw);expect(director.sceneProgress).toBeCloseTo(position.segment.start+(position.segment.end-position.segment.start)*.8,12);
  director.setProgress(.1);director=render();expect(director).toMatchObject({progress:.1,sceneProgress:.1,playing:false});
 });
});
