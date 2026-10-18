import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';

// The actual hook and NarrationController run against a deterministic media
// element. Provider timings below are read from the published recording files.
const harness=vi.hoisted(()=>{
 let slots=[],cursor=0,effects=[],dirty=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 return {
  useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return[slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
  useRef(value){const index=cursor++;return slots[index]??={current:value};},
  useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
  useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
  render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>30)throw new Error('Regional journey hook did not settle');}while(dirty);return output;},
  reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
 };
});
vi.mock('react',()=>({...harness,useCallback:(callback,deps)=>harness.useMemo(()=>callback,deps)}));

import {useRegionalJourneyDirector} from '../src/hooks/useRegionalJourneyDirector';
import {getRegionalJourney} from '../src/data/regionalJourney';
import {refreshNarrationManifest} from '../src/lib/narration';
import {narrationTimingAt,validateNarrationTimeline} from '../src/lib/narrationTiming';
import {regionalCueSceneProgress} from '../src/lib/regionalJourneyState';
import {createHash} from 'node:crypto';

const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const journey=getRegionalJourney('shigatse');
const cueAt=(stage='environment',index=0)=>journey.stages.find(part=>part.id===stage).cues[index];
const clipFor=cue=>manifest.clips.find(clip=>clip.cueId===cue.id&&clip.text===cue.text);
const timelineFor=cue=>JSON.parse(readFileSync(`public${clipFor(cue).subtitleUrl}`,'utf8'));
const key=city=>`tibet-explorer.regional-journey.v1.${city}`;

class FakeAudio extends EventTarget {
 static instances=[];
 src='';preload='';currentTime=0;duration=0;volume=1;
 play=vi.fn(async()=>{});pause=vi.fn();load=vi.fn();
 constructor(){super();FakeAudio.instances.push(this);}
 removeAttribute(name){if(name==='src')this.src='';}
}
let options,saved;
const render=()=>harness.render(useRegionalJourneyDirector,options);
const media=()=>FakeAudio.instances.at(-1);
const play=async()=>{render().playPause();await vi.waitFor(()=>expect(render().audio.status).toBe('playing'));return render();};
const tick=seconds=>{media().currentTime=seconds;media().dispatchEvent(new Event('timeupdate'));return render();};
const actualWord=cue=>{
 const timeline=timelineFor(cue),offset=cue.text.indexOf(cue.anchor);
 const word=timeline.words.find(word=>word.textEnd>offset&&word.textStart<=offset)||timeline.words[Math.floor(timeline.words.length/2)];
 return{time:word.start+Math.min(.001,(word.end-word.start)/2),word,timeline,clip:clipFor(cue)};
};

beforeEach(()=>{
 options={cityId:'shigatse',facet:'environment',ready:true,onStage:vi.fn()};saved=new Map();FakeAudio.instances=[];refreshNarrationManifest();
 vi.stubGlobal('localStorage',{getItem:id=>saved.get(id)??null,setItem:(id,value)=>saved.set(id,value)});
 vi.stubGlobal('Audio',FakeAudio);vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('fetch',vi.fn(async url=>{
  if(url==='/assets/audio/narration/cue-manifest.json')return{ok:true,json:async()=>manifest};
  if(typeof url!=='string'||!/^\/assets\/audio\/narration\/[a-f0-9]{64}\.subtitles\.json$/.test(url))throw new Error(`Unexpected regional recording request ${String(url)}`);
  const raw=readFileSync(`public${url}`,'utf8');return{ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>raw,json:async()=>JSON.parse(raw)};
 }));
});
afterEach(()=>{harness.reset();refreshNarrationManifest();vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('regional journey actual recording lifecycle',()=>{
 it('uses an exact MP3/native-word pair rather than attaching a new script to old audio',()=>{
  const cue=cueAt(),clip=clipFor(cue),timeline=timelineFor(cue);
  expect(clip).toBeDefined();expect(clip.text).toBe(cue.text);expect(clip.subtitleStatus).toBe('provider');expect(clip.timingLevel).toBe('word');
  const audio=readFileSync(`public${clip.url}`),sidecar=readFileSync(`public${clip.subtitleUrl}`);
  expect(createHash('sha256').update(audio).digest('hex')).toBe(clip.sha256);
  expect(createHash('sha256').update(sidecar).digest('hex')).toBe(clip.subtitleSha256);
  expect(validateNarrationTimeline(timeline,clip,createHash('sha256').update(cue.text).digest('hex'))).toBeDefined();
 });

 it('restores a paused exact word, caption and terrain without starting playback or synthesis',async()=>{
  const cue=cueAt(),source=actualWord(cue),raw=source.time/source.clip.duration;
  saved.set(key('shigatse'),JSON.stringify({stage:'environment',cue:0,raw,voice:false}));
  let director=render();expect(director.playing).toBe(false);expect(media().play).not.toHaveBeenCalled();
  await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));director=render();
  const timing=narrationTimingAt(cue.text,source.time,source.clip.duration,source.timeline);
  expect(director.raw).toBe(raw);expect(director.timing).toEqual(timing);expect(director.caption).toBe(timing.caption);
  expect(director.sceneProgress).toBe(regionalCueSceneProgress(cue,timing,raw));expect(media().volume).toBe(0);
  expect(media().play).not.toHaveBeenCalled();expect(fetch.mock.calls.every(([url])=>url!=='/api/narration')).toBe(true);
 });

 it('pause, raw seek and play resume the same actual recording position and synchronized scene',async()=>{
  let director=await play();const cue=cueAt(),source=actualWord(cue);
  director=tick(source.time);expect(director.timing.precision).toBe('provider');
  const raw=director.raw,caption=director.caption,sceneProgress=director.sceneProgress,sourceUrl=media().src;
  director.pause();director=render();expect(director.playing).toBe(false);expect(director.raw).toBe(raw);expect(director.caption).toBe(caption);expect(director.sceneProgress).toBe(sceneProgress);
  director=await play();expect(media().src).toBe(sourceUrl);expect(media().currentTime).toBe(source.time);
  const seekRaw=.6327;director.seek(seekRaw);director=render();expect(director.playing).toBe(false);expect(director.raw).toBeCloseTo(seekRaw,10);
  expect(media().currentTime).toBeCloseTo(source.clip.duration*seekRaw,10);
  const seekCaption=director.caption;director=await play();expect(director.raw).toBeCloseTo(seekRaw,10);expect(director.caption).toBe(seekCaption);
  expect(JSON.parse(saved.get(key('shigatse'))).raw).toBeCloseTo(seekRaw,10);
 });

 it('pausing a saved nonzero position during loading restores that exact source word without rewinding or autoplay',async()=>{
  const cue=cueAt(),clip=clipFor(cue),raw=.6327;let deliver;
  const normalFetch=fetch;
  vi.stubGlobal('fetch',vi.fn(url=>url===clip.subtitleUrl?new Promise(resolve=>{deliver=resolve;}):normalFetch(url)));
  saved.set(key('shigatse'),JSON.stringify({version:2,stage:'environment',cue:0,raw,voice:false}));
  render().playPause();
  await vi.waitFor(()=>expect(render().audio.status).toBe('loading'));
  await vi.waitFor(()=>expect(deliver).toBeTypeOf('function'));
  render().pause();let director=render();
  expect(director.raw).toBe(raw);expect(director.playing).toBe(false);expect(media().play).not.toHaveBeenCalled();
  const sidecar=readFileSync(`public${clip.subtitleUrl}`,'utf8');
  deliver({ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>sidecar});
  await vi.waitFor(()=>expect(render().audio.duration).toBe(clip.duration));
  await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));director=render();
  const expected=narrationTimingAt(cue.text,raw*clip.duration,clip.duration,timelineFor(cue));
  expect(director.audio.cue.id).toBe(cue.id);expect(director.audio.cue.text).toBe(clip.text);expect(media().src).toBe(clip.url);
  expect(director.audio.progress).toBe(0);expect(director.raw).toBe(raw);expect(director.timing).toEqual(expected);
  expect(director.caption).toBe(expected.caption);expect(director.sceneProgress).toBe(regionalCueSceneProgress(cue,expected,raw));
  expect(JSON.parse(saved.get(key('shigatse'))).raw).toBe(raw);expect(director.playing).toBe(false);
  expect(media().play).not.toHaveBeenCalled();expect(fetch.mock.calls.every(([url])=>url!=='/api/narration')).toBe(true);
  director=await play();
  expect(media().src).toBe(clip.url);expect(media().currentTime).toBeCloseTo(raw*clip.duration,10);expect(director.raw).toBeCloseTo(raw,10);expect(director.caption).toBe(expected.caption);
 });

 it('plays the real remaining cue queue and reaches stage end without pretending the next stage played',async()=>{
  await play();expect(render().cue.id).toBe(cueAt('environment',0).id);
  for(const index of [1,2]){
   media().dispatchEvent(new Event('ended'));
   await vi.waitFor(()=>expect(render().audio.status).toBe('playing'));
   expect(render().cue.id).toBe(cueAt('environment',index).id);expect(media().src).toBe(clipFor(cueAt('environment',index)).url);
  }
  media().dispatchEvent(new Event('ended'));let director=render();expect(director.raw).toBe(1);expect(director.playing).toBe(false);expect(director.stage.id).toBe('environment');
  director.next();director=render();expect(director.stage.id).toBe('life');expect(director.cue.id).toBe(cueAt('life').id);expect(director.raw).toBe(0);expect(director.playing).toBe(false);
  expect(options.onStage).toHaveBeenLastCalledWith('life');
 });

 it('explicit stage selection clears the old source; a late old media event cannot advance the new stage',async()=>{
  let director=await play();tick(8);director=render();const calls=media().play.mock.calls.length;
  director.select('history',1);director=render();
  expect(director.stage.id).toBe('history');expect(director.cue.id).toBe(cueAt('history',1).id);expect(director.raw).toBe(0);expect(director.playing).toBe(false);expect(media().src).toBe('');
  media().dispatchEvent(new Event('ended'));media().dispatchEvent(new Event('timeupdate'));director=render();
  expect(director.stage.id).toBe('history');expect(director.cue.id).toBe(cueAt('history',1).id);expect(media().play).toHaveBeenCalledTimes(calls);
  await play();expect(media().src).toBe(clipFor(cueAt('history',1)).url);
 });

 it('process and season operations pause at the current real word; voice preference survives selection',async()=>{
  let director=await play();const source=actualWord(cueAt());director=tick(source.time);director.setVoice(false);director=render();
  const raw=director.raw,caption=director.caption;
  director.toggleProcess();director=render();expect(director.playing).toBe(false);expect(director.process).toBe(false);expect(director.raw).toBe(raw);expect(director.caption).toBe(caption);
  director.changeSeason(3);director=render();expect(director.season).toBe(3);expect(director.raw).toBe(raw);expect(director.caption).toBe(caption);expect(media().volume).toBe(0);
  director.select('life');director=render();expect(director.voice).toBe(false);expect(director.season).toBe(1);expect(director.process).toBe(true);expect(director.playing).toBe(false);
  director=await play();expect(media().volume).toBe(0);expect(director.audio.cue.id).toBe(cueAt('life').id);
 });

 it('unmounting stops the old city and late events cannot leak into a newly mounted city',async()=>{
  await play();tick(7);const oldMedia=media(),oldCalls=oldMedia.play.mock.calls.length;
  harness.reset();expect(oldMedia.src).toBe('');expect(oldMedia.pause).toHaveBeenCalled();
  options={...options,cityId:'chamdo'};let director=render();expect(director.journey.cityId).toBe('chamdo');expect(director.raw).toBe(0);expect(director.playing).toBe(false);
  oldMedia.currentTime=11;oldMedia.dispatchEvent(new Event('timeupdate'));oldMedia.dispatchEvent(new Event('ended'));director=render();
  expect(director.journey.cityId).toBe('chamdo');expect(director.cue.id).toBe(getRegionalJourney('chamdo').stages[0].cues[0].id);expect(director.raw).toBe(0);expect(oldMedia.play).toHaveBeenCalledTimes(oldCalls);expect(media().play).not.toHaveBeenCalled();
 });

 it('late paused hydration cannot overwrite an explicit cue selection or seek',async()=>{
  const cue=cueAt(),clip=clipFor(cue);let deliver;
  const normalFetch=fetch;
  vi.stubGlobal('fetch',vi.fn(url=>url===clip.subtitleUrl?new Promise(resolve=>{deliver=resolve;}):normalFetch(url)));
  saved.set(key('shigatse'),JSON.stringify({stage:'environment',cue:0,raw:.58,voice:true}));render();
  await vi.waitFor(()=>expect(deliver).toBeTypeOf('function'));
  render().select('life',1);render().seek(.37);let director=render();
  const selectedId=director.cue.id;expect(selectedId).toBe(cueAt('life',1).id);
  const raw=readFileSync(`public${clip.subtitleUrl}`,'utf8');deliver({ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>raw});
  await vi.waitFor(()=>expect(render().timing?.precision).toBe('provider'));director=render();
  expect(director.cue.id).toBe(selectedId);expect(director.raw).toBe(.37);expect(director.timing).toEqual(narrationTimingAt(director.cue.text,.37*clipFor(director.cue).duration,clipFor(director.cue).duration,timelineFor(director.cue)));
  expect(director.playing).toBe(false);expect(media().play).not.toHaveBeenCalled();
 });
});
