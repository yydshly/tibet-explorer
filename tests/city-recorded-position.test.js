import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';

// Exercise the real hook, recording loader, native validation and semantic
// mapping. Only React scheduling and the physical media element are isolated.
const harness=vi.hoisted(()=>{
 let slots=[],cursor=0,effects=[],dirty=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 return {
  useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return [slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
  useRef(value){const index=cursor++;return slots[index]??={current:value};},
  useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
  useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
  render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>25)throw new Error('Saved comparison did not settle');}while(dirty);return output;},
  reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
 };
});
vi.mock('react',()=>({...harness,useCallback:(callback,deps)=>harness.useMemo(()=>callback,deps)}));

import {cityComparisonAudioSegments,cityComparisonStorageKey,useCityComparisonDirector} from '../src/hooks/useCityComparisonDirector';
import {refreshNarrationManifest} from '../src/lib/narration';
import {readCityRecordedPresentation} from '../src/lib/cityRecordedPresentation';
import {cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {cityComparisonContinuation} from '../src/lib/cityComparisonContinuation';
import {cityPlaceThreads,cityPlaceThreadReading} from '../src/data/cityPlaceThreads';

class FakeAudio extends EventTarget {
 static instances=[];
 src='';preload='';currentTime=0;duration=0;volume=1;
 play=vi.fn(async()=>{});pause=vi.fn();load=vi.fn();
 constructor(){super();FakeAudio.instances.push(this);}
 removeAttribute(name){if(name==='src')this.src='';}
}
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const responseFor=url=>({ok:true,headers:new Headers(),text:async()=>readFileSync(`public${url}`,'utf8')});
const active={active:true,ready:true};
const render=(options=active)=>harness.render(useCityComparisonDirector,options);
let saved,fetchMock;
function seed(city='lhasa',id='life'){
 const step=cityPlaceThreads[city].steps.find(item=>item.id===id);
 const value={stage:step.stage,progress:step.progress,voice:false,relief:true,services:true,built:true,transfer:true};
 saved.set(cityComparisonStorageKey,JSON.stringify(value));
 return {step,position:value};
}
function deferSidecar(){
 let release;
 const waiting=new Promise(resolve=>{release=resolve;});
 fetchMock.mockImplementation(url=>url.endsWith('cue-manifest.json')?Promise.resolve({ok:true,json:async()=>manifest}):waiting.then(()=>responseFor(url)));
 return release;
}
const native=async()=>{let director;await vi.waitFor(()=>{director=render();expect(director.narrationTiming).toMatchObject({precision:'provider',timingLevel:'word'});});return director;};
const completeOriginal=position=>readCityRecordedPresentation(cityComparisonAudioSegments(position.stage),position.progress);

beforeEach(()=>{
 saved=new Map();FakeAudio.instances=[];refreshNarrationManifest();
 vi.stubGlobal('localStorage',{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)});
 vi.stubGlobal('Audio',FakeAudio);
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 fetchMock=vi.fn(async url=>url.endsWith('cue-manifest.json')?{ok:true,json:async()=>manifest}:responseFor(url));
 vi.stubGlobal('fetch',fetchMock);
});
afterEach(()=>{harness.reset();vi.unstubAllGlobals();});

describe('saved raw position restores its native paused presentation',()=>{
 it.each(Object.entries(cityPlaceThreads).flatMap(([city,thread])=>thread.steps.map(step=>[city,step.id])))('%s/%s refresh restores the exact source words and selected local step',async(city,id)=>{
  const {position}=seed(city,id);let director=render();
  expect(director).toMatchObject({...position,playing:false,audio:{status:'idle',cue:null}});
  director=await native();
  expect(director.getPosition()).toEqual(position);
  expect(cityPlaceThreadReading(city,director.stage,director.sceneProgress).active).toBe(id);
  const source=cityLifeSceneToAudio(cityComparisonAudioSegments(position.stage),position.progress).segment;
  expect(source.text.slice(director.narrationTiming.textStart,director.narrationTiming.textEnd)).toBe(director.currentSentence);
  expect(JSON.parse(saved.get(cityComparisonStorageKey))).toEqual(position);
  expect(JSON.parse(saved.get(cityComparisonStorageKey))).not.toHaveProperty('sceneProgress');
  expect(director.continuation).toEqual(cityComparisonContinuation(position.stage,position.progress,cityComparisonAudioSegments(position.stage)));
  expect(FakeAudio.instances[0].src).toBe('');expect(FakeAudio.instances[0].play).not.toHaveBeenCalled();
  expect(fetchMock.mock.calls.every(([url,init])=>url!=='/api/narration'&&init?.method!=='POST')).toBe(true);
 });

 it.each(['nyingchi','lhasa'])('%s life initially has the wrong raw-only step; verified words repair it without changing that raw',async city=>{
  const {position}=seed(city);let director=render();
  expect(cityPlaceThreadReading(city,director.stage,director.sceneProgress).active).not.toBe('life');
  director=await native();
  expect(cityPlaceThreadReading(city,director.stage,director.sceneProgress).active).toBe('life');
  expect(director.sceneProgress).not.toBe(position.progress);expect(director.progress).toBe(position.progress);
 });

 it('waits for the first real entry when the comparison initially mounts inactive',async()=>{
  seed('nyingchi');let director=render({active:false,ready:false});
  expect(fetchMock).not.toHaveBeenCalled();
  director=render({active:true,ready:false});director=await native();
  expect(director.playing).toBe(false);expect(cityPlaceThreadReading('nyingchi',director.stage,director.sceneProgress).active).toBe('life');
  expect(FakeAudio.instances[0].play).not.toHaveBeenCalled();
 });

 it.each(['seek','same-raw-seek','select','review','pause','condition'])('a late read cannot overwrite an explicit %s action',async action=>{
  const {position}=seed();const release=deferSidecar();let director=render();
  await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  const display=position.progress+.01;
  if(action==='seek')director.setProgress(.52);
  if(action==='same-raw-seek')director.setProgress(position.progress);
  if(action==='select')director.selectStage('history',false,.42);
  if(action==='review')director.restorePosition(position,{sceneProgress:display});
  if(action==='pause')director.pause();
  if(action==='condition')director.setServices(false);
  director=render();const before=director.getPresentation(),raw=director.getPosition();
  release();await completeOriginal(position);director=render();
  expect(director.getPosition()).toEqual(raw);expect(director.getPresentation()).toEqual(before);
  expect(director.audio.status).toBe('idle');expect(FakeAudio.instances[0].play).not.toHaveBeenCalled();
 });

 it('real playback takes ownership and seeks raw recording seconds after a pending restore',async()=>{
  const {position}=seed();const release=deferSidecar();let director=render();
  await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  director.playPause();director=render();expect(director.audio.status).toBe('loading');
  release();await completeOriginal(position);
  await vi.waitFor(()=>{director=render();expect(director.audio.status).toBe('playing');});
  const target=cityLifeSceneToAudio(cityComparisonAudioSegments(position.stage),position.progress),asset=manifest.clips.find(item=>item.cueId===target.segment.id);
  expect(FakeAudio.instances[0].currentTime).toBeCloseTo(target.fraction*asset.duration,9);
  expect(director.progress).toBe(position.progress);expect(director.audio.cue.id).toBe(target.segment.id);
  director.pause();director=render();expect(director.narrationTiming).toMatchObject({precision:'provider',timingLevel:'word'});
  expect(director.currentSentence).toBe('洛桑赤列的采访还提到村委会组织运输队，');
 });

 it('discarded unmounted reads do not modify a later entry',async()=>{
  const {position}=seed();const release=deferSidecar();render();
  await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  harness.reset();seed('ngari','event');let director=render();
  const raw=director.getPosition();release();await completeOriginal(position);director=await native();
  expect(director.getPosition()).toEqual(raw);expect(cityPlaceThreadReading('ngari',director.stage,director.sceneProgress).active).toBe('event');
 });

 it('an inactive view discards completion and can recover the unchanged position on re-entry',async()=>{
  const {position}=seed();const release=deferSidecar();let director=render();
  await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  render({active:false,ready:true});release();await completeOriginal(position);
  director=render({active:false,ready:true});expect(director.narrationTiming.precision).toBe('estimated');
  director=render();director=await native();expect(director.progress).toBe(position.progress);
 });

 it('a voice preference change preserves the eligible raw reading and never starts sound',async()=>{
  const {position}=seed();const release=deferSidecar();let director=render();
  await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  director.setVoice(true);render();release();await completeOriginal(position);director=await native();
  expect(director.getPosition()).toEqual({...position,voice:true});expect(FakeAudio.instances[0].play).not.toHaveBeenCalled();
 });

 it('retries an unavailable sidecar on a later activation without turning it into a media error',async()=>{
  seed();fetchMock.mockImplementation(async url=>url.endsWith('cue-manifest.json')?{ok:true,json:async()=>manifest}:{ok:false});
  let director=render();await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  await completeOriginal(director.getPosition());director=render();expect(director.audio.error).toBeNull();expect(director.narrationTiming.precision).toBe('estimated');
  render({active:false,ready:true});fetchMock.mockImplementation(async url=>url.endsWith('cue-manifest.json')?{ok:true,json:async()=>manifest}:responseFor(url));
  render();director=await native();expect(director.currentSentence).toBe('洛桑赤列的采访还提到村委会组织运输队，');
 });
});

describe('read-only native evidence boundaries',()=>{
 it('rejects text with the same trim but a different original UTF-16 offset base',async()=>{
  const {position}=seed();
  const segments=cityComparisonAudioSegments(position.stage).map(segment=>segment.id==='ACCESS-lhasa-transfer'?{...segment,text:` ${segment.text} `}:segment);
  expect(await readCityRecordedPresentation(segments,position.progress)).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(fetchMock.mock.calls[0][0]).toBe('/assets/audio/narration/cue-manifest.json');
 });
 it('missing or revised manifest text never posts a synthesis request',async()=>{
  const {position}=seed();fetchMock.mockResolvedValue({ok:true,json:async()=>({clips:manifest.clips.filter(item=>item.cueId!=='ACCESS-lhasa-transfer')})});
  expect(await completeOriginal(position)).toBeUndefined();expect(fetchMock).toHaveBeenCalledTimes(1);
  refreshNarrationManifest();fetchMock.mockResolvedValue({ok:true,json:async()=>({clips:manifest.clips.map(item=>item.cueId==='ACCESS-lhasa-transfer'?{...item,text:'内容修改后'}:item)})});
  expect(await completeOriginal(position)).toBeUndefined();expect(fetchMock.mock.calls.every(([url])=>url!=='/api/narration')).toBe(true);
 });
 it.each(['sidecar-sha','audio-sha','text-sha','voice','model','sentence-only'])('rejects %s instead of inventing a paused native pose',async kind=>{
  const {position}=seed();const asset=manifest.clips.find(item=>item.cueId==='ACCESS-lhasa-transfer');
  const sidecar=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
  const changed={...asset};
  if(kind==='sidecar-sha')changed.subtitleSha256='0'.repeat(64);
  if(kind==='audio-sha')changed.sha256='0'.repeat(64);
  if(kind==='voice')changed.voice='wrong-voice';
  if(kind==='model')changed.model='wrong-model';
  if(kind==='text-sha')sidecar.textSha256='0'.repeat(64);
  if(kind==='sentence-only'){sidecar.timingLevel='sentence';delete sidecar.words;}
  if(kind==='text-sha'||kind==='sentence-only')delete changed.subtitleSha256;
  fetchMock.mockImplementation(async url=>url.endsWith('cue-manifest.json')?{ok:true,json:async()=>({clips:[changed]})}:{ok:true,headers:new Headers(),text:async()=>JSON.stringify(sidecar)});
  expect(await completeOriginal(position)).toBeUndefined();
  expect(FakeAudio.instances.flatMap(item=>item.play.mock.calls)).toHaveLength(0);
  expect(fetchMock.mock.calls.every(([url,init])=>url!=='/api/narration'&&init?.method!=='POST')).toBe(true);
 });
});
