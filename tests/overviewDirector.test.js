import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';

// Actual hook/controller, actual published MP3 identities and native-word
// sidecars. Only browser media and React scheduling are deterministic doubles.
const harness=vi.hoisted(()=>{
 let slots=[],cursor=0,effects=[],dirty=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 return {
  useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return[slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
  useRef(value){const index=cursor++;return slots[index]??={current:value};},
  useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
  useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
  render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>35)throw new Error('Overview hook did not settle');}while(dirty);return output;},
  reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
 };
});
vi.mock('react',()=>({...harness,useCallback:(callback,deps)=>harness.useMemo(()=>callback,deps)}));
import {useOverviewDirector} from '../src/hooks/useOverviewDirector';
import {getJourneyStep} from '../src/data/journey';
import {refreshNarrationManifest} from '../src/lib/narration';
import {narrationTimingAt} from '../src/lib/narrationTiming';

const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const source=(step,index)=>getJourneyStep(step).cues[index];
const recordedBeat=(step,index,id,sceneIdentity=step)=>({id,recordingId:source(step,index).id,text:source(step,index).narration,sceneIdentity});
const beats=[recordedBeat('G1',0,'earth'),recordedBeat('G1',1,'heating'),recordedBeat('G2',0,'position'),recordedBeat('G1',2,'return-earth')];
const clipFor=beat=>manifest.clips.find(clip=>(clip.cueId===beat.recordingId||clip.id===beat.recordingId)&&clip.text===beat.text);
const timelineFor=beat=>JSON.parse(readFileSync(`public${clipFor(beat).subtitleUrl}`,'utf8'));
class FakeAudio extends EventTarget {
 static instances=[];
 src='';preload='';currentTime=0;duration=0;volume=1;
 play=vi.fn(async()=>{});pause=vi.fn();load=vi.fn();
 constructor(){super();FakeAudio.instances.push(this);}
 removeAttribute(name){if(name==='src')this.src='';}
}
const KEY='qa.overview.director';
let options,saved;
const render=()=>harness.render(useOverviewDirector,options);
const media=()=>FakeAudio.instances.at(-1);
const waitPlaying=async index=>{await vi.waitFor(()=>{expect(render().beatIndex).toBe(index);expect(render().playing).toBe(true);});return render();};
const start=async()=>{render().onSceneReady(beats[0].sceneIdentity);render().playPause();return waitPlaying(0);};
const ended=()=>{media().dispatchEvent(new Event('ended'));return render();};
const tick=seconds=>{media().currentTime=seconds;media().dispatchEvent(new Event('timeupdate'));return render();};
const sidecarResponse=url=>{const raw=readFileSync(`public${url}`,'utf8');return{ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>raw,json:async()=>JSON.parse(raw)};};

beforeEach(()=>{
 options={beats,storageKey:KEY};saved=new Map();FakeAudio.instances=[];refreshNarrationManifest();
 vi.stubGlobal('localStorage',{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)});
 vi.stubGlobal('Audio',FakeAudio);vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('fetch',vi.fn(async url=>{
  if(url==='/assets/audio/narration/cue-manifest.json')return{ok:true,json:async()=>manifest};
  if(typeof url!=='string'||!/^\/assets\/audio\/narration\/[a-f0-9]{64}\.subtitles\.json$/.test(url))throw new Error(`Unexpected overview recording request ${String(url)}`);
  return sidecarResponse(url);
 }));
});
afterEach(()=>{harness.reset();refreshNarrationManifest();vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('continuous overview recorded director',()=>{
 it('waits for the current actual scene, rejecting old ready callbacks, before any audio',async()=>{
  let director=render();expect(director.ready).toBe(false);expect(director.playing).toBe(false);
  director.playPause();director=render();expect(director.wantsPlayback).toBe(true);expect(media().play).not.toHaveBeenCalled();
  director.onSceneReady('G2');director=render();expect(director.ready).toBe(false);expect(media().play).not.toHaveBeenCalled();
  director.onSceneReady('G1');await waitPlaying(0);expect(media().src).toBe(clipFor(beats[0]).url);
 });

 it('plays the whole sequence, reuses only consecutive ready identities, and replays after completion',async()=>{
  await start();ended();await waitPlaying(1);expect(render().ready).toBe(true);
  let director=ended();expect(director.beatIndex).toBe(2);expect(director.wantsPlayback).toBe(true);expect(director.ready).toBe(false);expect(director.playing).toBe(false);
  const calls=media().play.mock.calls.length;director.onSceneReady('G1');director=render();expect(media().play).toHaveBeenCalledTimes(calls);
  director.onSceneReady('G2');await waitPlaying(2);
  director=ended();expect(director.beatIndex).toBe(3);expect(director.ready).toBe(false);expect(director.wantsPlayback).toBe(true);
  // An identity seen earlier is not a permanently ready scene.
  expect(media().src).toBe('');director.onSceneReady('G1');await waitPlaying(3);
  director=ended();expect(director.raw).toBe(1);expect(director.wantsPlayback).toBe(false);expect(director.playing).toBe(false);
  director.playPause();await waitPlaying(0);expect(render().raw).toBe(0);expect(media().src).toBe(clipFor(beats[0]).url);
 });

 it('Pause while waiting for a scene cancels the pending autoplay and selection stays paused',async()=>{
  await start();ended();await waitPlaying(1);let director=ended();expect(director.beatIndex).toBe(2);
  director.pause();director=render();director.onSceneReady('G2');director=render();
  expect(director.ready).toBe(true);expect(director.wantsPlayback).toBe(false);expect(director.playing).toBe(false);expect(media().src).toBe('');
  director.playPause();await waitPlaying(2);render().select(0);director=render();
  expect(director.beatIndex).toBe(0);expect(director.raw).toBe(0);expect(director.wantsPlayback).toBe(false);expect(director.ready).toBe(false);
  director.onSceneReady('G1');director=render();expect(director.ready).toBe(true);expect(director.playing).toBe(false);expect(media().src).toBe('');
  media().dispatchEvent(new Event('ended'));expect(render().beatIndex).toBe(0);
 });

 it('hydrates a restored original raw word position without POST, playback, or semantic fraction storage',async()=>{
  const beat=beats[2],clip=clipFor(beat),timeline=timelineFor(beat),word=timeline.words[Math.floor(timeline.words.length*.6)],seconds=word.start+.001,raw=seconds/clip.duration;
  saved.set(KEY,JSON.stringify({version:1,beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw,voice:false}));
  let director=render();expect(director.beatIndex).toBe(2);expect(director.raw).toBe(raw);expect(media().volume).toBe(0);
  await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));director=render();
  expect(director.timing).toEqual(narrationTimingAt(beat.text,seconds,clip.duration,timeline));expect(media().play).not.toHaveBeenCalled();expect(director.wantsPlayback).toBe(false);
  expect(fetch.mock.calls.every(([url])=>url!=='/api/narration')).toBe(true);
  const stored=JSON.parse(saved.get(KEY));expect(stored.raw).toBe(raw);expect(stored.recordingId).toBe(beat.recordingId);expect(stored.text).toBe(beat.text);expect(stored).not.toHaveProperty('sceneProgress');
  director.onSceneReady('G2');render().playPause();await waitPlaying(2);expect(media().currentTime).toBeCloseTo(seconds,9);expect(render().raw).toBeCloseTo(raw,10);
 });

 it('pausing during load keeps the original raw seek and never resumes when data arrives',async()=>{
  const beat=beats[0],clip=clipFor(beat),raw=.6327;let deliver;
  const normalFetch=fetch;
  vi.stubGlobal('fetch',vi.fn(url=>url===clip.subtitleUrl?new Promise(resolve=>{deliver=resolve;}):normalFetch(url)));
  saved.set(KEY,JSON.stringify({beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw,voice:true}));
  render().onSceneReady('G1');render().playPause();
  await vi.waitFor(()=>expect(render().audio.status).toBe('loading'));await vi.waitFor(()=>expect(deliver).toBeTypeOf('function'));
  render().pause();expect(render().raw).toBe(raw);deliver(sidecarResponse(clip.subtitleUrl));
  await vi.waitFor(()=>expect(render().audio.duration).toBe(clip.duration));
  await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));
  const director=render();expect(director.raw).toBeCloseTo(raw,10);expect(director.playing).toBe(false);expect(director.wantsPlayback).toBe(false);expect(media().play).not.toHaveBeenCalled();expect(media().currentTime).toBeCloseTo(raw*clip.duration,9);
  expect(director.timing).toEqual(narrationTimingAt(beat.text,raw*clip.duration,clip.duration,timelineFor(beat)));
  director.playPause();await waitPlaying(0);expect(media().currentTime).toBeCloseTo(raw*clip.duration,9);
 });

 it('seek pauses the same recording, preserves the exact raw position, and replay restarts its segment',async()=>{
  await start();tick(12);let director=render();director.setVoice(false);director=render();director.seek(.4287);director=render();
  const clip=clipFor(beats[0]);expect(director.raw).toBeCloseTo(.4287,10);expect(director.wantsPlayback).toBe(false);expect(media().currentTime).toBeCloseTo(clip.duration*.4287,9);expect(media().volume).toBe(0);
  director.playPause();await waitPlaying(0);expect(media().currentTime).toBeCloseTo(clip.duration*.4287,9);
  render().replay();await waitPlaying(0);expect(render().raw).toBe(0);expect(media().currentTime).toBe(0);expect(media().volume).toBe(0);
 });

 it('scene errors stop playback and retry waits for a new ready signal and explicit play',async()=>{
  await start();tick(9);const raw=render().raw;render().onSceneError('G2','old error');expect(render().playing).toBe(true);
  render().onSceneError('G1','真实地形未能读取');let director=render();expect(director.error).toBe('真实地形未能读取');expect(director.ready).toBe(false);expect(director.wantsPlayback).toBe(false);expect(director.raw).toBe(raw);
  director.retryScene();director=render();expect(director.error).toBe('');expect(director.ready).toBe(false);expect(director.raw).toBe(raw);
  director.onSceneReady('G1');director=render();expect(director.ready).toBe(true);expect(director.wantsPlayback).toBe(false);expect(director.playing).toBe(false);
  director.playPause();await waitPlaying(0);expect(render().raw).toBeCloseTo(raw,10);
 });

 it('retrying a failed recording directly preserves its original raw position',async()=>{
  await start();const clip=clipFor(beats[0]),seconds=clip.duration*.5837;
  tick(seconds);const raw=render().raw;
  media().dispatchEvent(new Event('error'));let director=render();
  expect(director.error).toBeTruthy();expect(director.wantsPlayback).toBe(false);expect(director.raw).toBeCloseTo(raw,10);
  // A real audio.load() resets the source clock when retrying the failed URL.
  media().load.mockImplementation(()=>{media().currentTime=0;});
  director.playPause();await waitPlaying(0);
  expect(media().currentTime).toBeCloseTo(seconds,9);expect(render().raw).toBeCloseTo(raw,10);expect(render().error).toBe('');
 });

 it('selecting a different sentence on the same failed model retains the retry affordance',async()=>{
  await start();render().onSceneError('G1','三维显示中断');render().select(1);
  let director=render();expect(director.beatIndex).toBe(1);expect(director.error).toBe('三维显示中断');expect(director.ready).toBe(false);expect(director.wantsPlayback).toBe(false);
  director.retryScene();director=render();expect(director.error).toBe('');expect(director.ready).toBe(false);
  director.onSceneReady('G1');director=render();expect(director.ready).toBe(true);expect(director.wantsPlayback).toBe(false);
 });

 it('discarded saved text/recording identities cannot attach an old raw position or timing',async()=>{
  saved.set(KEY,JSON.stringify({beatId:beats[2].id,recordingId:beats[0].recordingId,text:beats[2].text,raw:.7,voice:true}));
  let director=render();expect(director.beatIndex).toBe(0);expect(director.raw).toBe(0);
  await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));
  expect(render().timing).toEqual(narrationTimingAt(beats[0].text,0,clipFor(beats[0]).duration,timelineFor(beats[0])));
  expect(media().play).not.toHaveBeenCalled();expect(fetch.mock.calls.every(([url])=>url!=='/api/narration')).toBe(true);
 });

 it('late hydration and old media events cannot overwrite a later beat or survive unmount',async()=>{
  const clip=clipFor(beats[0]);let deliver;const normalFetch=fetch;
  vi.stubGlobal('fetch',vi.fn(url=>url===clip.subtitleUrl?new Promise(resolve=>{deliver=resolve;}):normalFetch(url)));
  render();await vi.waitFor(()=>expect(deliver).toBeTypeOf('function'));render().select(2);render().seek(.37);
  deliver(sidecarResponse(clip.subtitleUrl));await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));
  expect(render().beatIndex).toBe(2);expect(render().raw).toBe(.37);expect(render().timing).toEqual(narrationTimingAt(beats[2].text,.37*clipFor(beats[2]).duration,clipFor(beats[2]).duration,timelineFor(beats[2])));
  const old=media();harness.reset();old.currentTime=5;old.dispatchEvent(new Event('timeupdate'));old.dispatchEvent(new Event('ended'));
  expect(old.src).toBe('');expect(old.play).not.toHaveBeenCalled();let director=render();expect(director.beatIndex).toBe(2);expect(director.raw).toBe(.37);expect(director.wantsPlayback).toBe(false);
 });
});
