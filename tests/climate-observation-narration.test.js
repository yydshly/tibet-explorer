import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Real hook effect order and the actual NarrationController. Only the media
// device and React renderer are deterministic fixtures; no invented word times.
const harness=vi.hoisted(()=>{
  let slots=[],cursor=0,effects=[],dirty=false;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
  return {
    useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return[slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
    useRef(value){const index=cursor++;return slots[index]??={current:value};},
    useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
    useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
    render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>25)throw new Error('Observation hook did not settle');}while(dirty);return output;},
    reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
  };
});
vi.mock('react',()=>({...harness,useCallback:(callback,deps)=>harness.useMemo(()=>callback,deps)}));

import {useClimateObservationNarration} from '../src/hooks/useClimateObservationNarration';
import {climateObservationNarrationCues,climateObservationNarrationStation,getClimateObservationNarration} from '../src/data/climateObservationNarration';
import {narrationTimingAt,validateNarrationTimeline} from '../src/lib/narrationTiming';
import {refreshNarrationManifest} from '../src/lib/narration';

const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const clipFor=month=>manifest.clips.find(clip=>clip.cueId===getClimateObservationNarration(month).id);
const timelineFor=month=>JSON.parse(readFileSync(`public${clipFor(month).subtitleUrl}`,'utf8'));
const sourceAudio=(month,time)=>{
  const cue=getClimateObservationNarration(month),clip=clipFor(month);
  return{cue:{id:cue.id,text:cue.narration},timing:narrationTimingAt(cue.narration,time,clip.duration,timelineFor(month))};
};
class FakeAudio extends EventTarget{
  static instances=[];
  src='';preload='';currentTime=0;duration=0;volume=1;
  play=vi.fn(async()=>{});pause=vi.fn();load=vi.fn();
  constructor(){super();FakeAudio.instances.push(this);}
  removeAttribute(name){if(name==='src')this.src='';}
}
let options;
const render=()=>harness.render(useClimateObservationNarration,options);
const media=()=>FakeAudio.instances.at(-1);
const play=async()=>{render().playPause();await vi.waitFor(()=>expect(render().audio.status).toBe('playing'));return render();};

beforeEach(()=>{
  options={month:7,active:true};FakeAudio.instances=[];refreshNarrationManifest();
  vi.stubGlobal('Audio',FakeAudio);vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.stubGlobal('fetch',vi.fn(async url=>{
    if(typeof url!=='string'||!/^\/assets\/audio\/narration\/(cue-manifest\.json|[a-f0-9]{64}\.subtitles\.json)$/.test(url))throw new Error(`Unexpected narration request ${String(url)}`);
    const raw=readFileSync(`public${url}`,'utf8');
    return{ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>JSON.parse(raw),text:async()=>raw};
  }));
});
afterEach(()=>{harness.reset();refreshNarrationManifest();vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('source-bound climate observation recordings',()=>{
  it.each([1,7])('%s月 is a new exact MP3/word-sidecar pair and a short current script',month=>{
    const cue=getClimateObservationNarration(month),clip=clipFor(month),timeline=timelineFor(month);
    expect(cue.narration.length).toBeLessThanOrEqual(180);expect(clip.text).toBe(cue.narration);
    expect(clip.subtitleStatus).toBe('provider');expect(clip.timingLevel).toBe('word');
    const mp3=readFileSync(`public${clip.url}`),raw=readFileSync(`public${clip.subtitleUrl}`);
    const textHash=createHash('sha256').update(cue.narration).digest('hex');
    expect(createHash('sha256').update(mp3).digest('hex')).toBe(clip.sha256);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(clip.subtitleSha256);
    expect(validateNarrationTimeline(timeline,clip,textHash)).toBeDefined();
    expect(timeline.audioSha256).toBe(clip.sha256);expect(timeline.textSha256).toBe(textHash);
    expect(timeline.words.length).toBeGreaterThan(50);
    expect(cue.narration).toContain('一九九一至二零二零年');expect(cue.narration).toContain('统计只代表站点');
  });

  it.each([1,7])('%s月 station attention changes on actual native word boundaries and keeps the prior station in a gap',month=>{
    const cue=getClimateObservationNarration(month),timeline=timelineFor(month);
    for(const [token,id,prior] of [['林芝站','56312',undefined],['拉萨站','55591','56312'],['狮泉河站','55228','55591']]){
      const offset=cue.narration.indexOf(token),index=timeline.words.findIndex(word=>word.textStart<=offset&&word.textEnd>offset),word=timeline.words[index];
      expect(word).toBeDefined();
      expect(climateObservationNarrationStation(month,sourceAudio(month,word.start-.00001))).toBe(prior);
      expect(climateObservationNarrationStation(month,sourceAudio(month,word.start))).toBe(id);
      const previous=timeline.words[index-1];
      if(previous&&word.start>previous.end){
        expect(climateObservationNarrationStation(month,sourceAudio(month,(previous.end+word.start)/2))).toBe(prior);
      }
    }
    const endOffset=cue.narration.indexOf(cue.focusEndToken),endWord=timeline.words.find(word=>word.textStart<=endOffset&&word.textEnd>endOffset);
    expect(climateObservationNarrationStation(month,sourceAudio(month,endWord.start-.00001))).toBe('55228');
    expect(climateObservationNarrationStation(month,sourceAudio(month,endWord.start))).toBeUndefined();
  });

  it('never invents station timing from estimated captions, a changed script, another month or unsupported month',()=>{
    const source=sourceAudio(7,12);
    expect(climateObservationNarrationStation(1,source)).toBeUndefined();
    expect(climateObservationNarrationStation(7,{...source,cue:{...source.cue,text:source.cue.text+'修订'}})).toBeUndefined();
    expect(climateObservationNarrationStation(7,{...source,timing:{...source.timing,precision:'estimated'}})).toBeUndefined();
    expect(climateObservationNarrationStation(7,{...source,timing:{...source.timing,timingLevel:'sentence'}})).toBeUndefined();
    expect(climateObservationNarrationStation(4,source)).toBeUndefined();
    expect(climateObservationNarrationCues).toHaveLength(2);
  });

  it('actual recording time drives both the visible sentence and station focus, including muted playback and pause',async()=>{
    let narration=await play();const recording=clipFor(7),timeline=timelineFor(7),cue=getClimateObservationNarration(7);
    narration.setVoice(false);narration=render();expect(media().volume).toBe(0);
    const offset=cue.narration.indexOf('拉萨站'),word=timeline.words.find(word=>word.textStart<=offset&&word.textEnd>offset);
    media().currentTime=word.start;media().dispatchEvent(new Event('timeupdate'));narration=render();
    expect(narration.activeStationId).toBe('55591');expect(narration.caption).toBe(narration.audio.timing.caption);
    expect(narration.timing).toEqual(narrationTimingAt(cue.narration,word.start,recording.duration,timeline));
    expect(narration.audio.currentTime).toBe(word.start);expect(narration.playing).toBe(true);
    narration.pause();narration=render();const caption=narration.caption;
    expect(narration.playing).toBe(false);expect(narration.activeStationId).toBe('55591');expect(render().caption).toBe(caption);
    narration.playPause();await vi.waitFor(()=>expect(render().audio.status).toBe('playing'));
    expect(render().activeStationId).toBe('55591');expect(media().currentTime).toBe(word.start);
  });

  it('throttles only unchanged-word progress to 100ms while publishing native station boundaries and pause immediately',async()=>{
    await play();
    const cue=getClimateObservationNarration(7),timeline=timelineFor(7);
    const namedWord=token=>timeline.words.find(word=>word.textStart<=cue.narration.indexOf(token)&&word.textEnd>cue.narration.indexOf(token));
    const first=namedWord('林芝站'),nextStation=namedWord('拉萨站');
    let wallTime=1000;vi.spyOn(performance,'now').mockImplementation(()=>wallTime);
    const tick=seconds=>{media().currentTime=seconds;media().dispatchEvent(new Event('timeupdate'));return render();};
    let narration=tick(first.start);const initial=narration.audio;
    expect(narration.activeStationId).toBe('56312');
    wallTime=1010;narration=tick(first.start+.01);expect(narration.audio).toBe(initial);
    wallTime=1099;narration=tick(first.start+.02);expect(narration.audio).toBe(initial);
    wallTime=1100;narration=tick(first.start+.03);expect(narration.audio).not.toBe(initial);
    expect(narration.audio.currentTime).toBe(first.start+.03);
    // One millisecond later in UI time, actual media reaches a different native
    // station word. That boundary bypasses throttling with its exact timestamp.
    wallTime=1101;narration=tick(nextStation.start);
    expect(narration.activeStationId).toBe('55591');expect(narration.audio.currentTime).toBe(nextStation.start);
    expect(narration.timing.activeTextStart).toBe(nextStation.textStart);
    wallTime=1102;narration.pause();narration=render();
    expect(narration.playing).toBe(false);expect(narration.audio.status).toBe('paused');expect(narration.activeStationId).toBe('55591');
  });

  it('month changes stop old media; unsupported months never offer a substitute recording',async()=>{
    await play();expect(media().src).toBe(clipFor(7).url);
    options.month=1;let narration=render();
    expect(narration.playing).toBe(false);expect(narration.caption).toBe('');expect(narration.activeStationId).toBeUndefined();expect(media().src).toBe('');
    // A late ended/timeupdate from the old source cannot expose July content.
    media().currentTime=22;media().dispatchEvent(new Event('timeupdate'));media().dispatchEvent(new Event('ended'));
    narration=render();expect(narration.audio.status).toBe('idle');expect(narration.playing).toBe(false);
    narration=await play();expect(media().src).toBe(clipFor(1).url);
    options.month=4;narration=render();const calls=media().play.mock.calls.length;
    expect(narration.supported).toBe(false);expect(narration.playing).toBe(false);expect(media().src).toBe('');
    narration.playPause();narration.replay();expect(media().play).toHaveBeenCalledTimes(calls);expect(render().caption).toBe('');
  });

  it('changing month while the old asset loads prevents its late MP3 and sidecar from becoming current',async()=>{
    let deliver;
    const original=fetch;
    vi.stubGlobal('fetch',vi.fn(url=>url==='/assets/audio/narration/cue-manifest.json'?new Promise(resolve=>{deliver=resolve;}):original(url)));
    render().playPause();expect(render().audio.status).toBe('loading');
    options.month=1;expect(render().audio.status).toBe('idle');
    deliver({ok:true,json:async()=>manifest});
    await vi.waitFor(()=>expect(fetch.mock.calls.some(([url])=>url===clipFor(7).subtitleUrl)).toBe(true));
    // Drain the actual crypto validation/microtasks while retaining the new month.
    await new Promise(resolve=>setTimeout(resolve,20));
    expect(render().audio.status).toBe('idle');expect(media().src).toBe('');expect(render().activeStationId).toBeUndefined();
    await play();expect(media().src).toBe(clipFor(1).url);expect(render().audio.cue.id).toBe('OBS-CLIMATE-1');
  });

  it('leaving pauses and hides attention; returning preserves the same recording time until explicitly replayed',async()=>{
    await play();media().currentTime=12;media().dispatchEvent(new Event('timeupdate'));const caption=render().caption;
    options.active=false;let narration=render();expect(narration.playing).toBe(false);expect(narration.activeStationId).toBeUndefined();
    expect(narration.audio.status).toBe('paused');expect(narration.caption).toBe(caption);
    const calls=media().play.mock.calls.length;narration.playPause();narration.replay();expect(media().play).toHaveBeenCalledTimes(calls);
    options.active=true;narration=render();expect(narration.playing).toBe(false);expect(narration.caption).toBe(caption);
    narration.playPause();await vi.waitFor(()=>expect(render().audio.status).toBe('playing'));expect(media().currentTime).toBe(12);
    media().dispatchEvent(new Event('ended'));narration=render();expect(narration.playing).toBe(false);expect(narration.activeStationId).toBeUndefined();
    narration.replay();await vi.waitFor(()=>expect(render().audio.status).toBe('playing'));expect(media().src).toBe(clipFor(7).url);
    expect(render().audio.progress).toBe(0);
  });
});
