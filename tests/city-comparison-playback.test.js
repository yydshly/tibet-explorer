import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {readFileSync} from 'node:fs';

// Run actual hook effects in React's effect-batch order. Audio and timers stay
// deterministic without a canvas, media device or extra DOM dependency.
const harness = vi.hoisted(() => {
  let slots = [], cursor = 0, effects = [], dirty = false;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  return {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, next => {
        const value = typeof next === 'function' ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useRef(value) { const index = cursor++; return (slots[index] ??= { current: value }); },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) {
        const previous = slots[index]; slots[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
    render(hook, options) {
      let output, passes = 0;
      do {
        dirty = false; cursor = 0; effects = [];
        output = hook(options); effects.forEach(effect => effect());
        if (++passes > 25) throw new Error('Comparison hook did not settle');
      } while (dirty);
      return output;
    },
    reset() { slots.forEach(slot => slot?.cleanup?.()); slots = []; cursor = 0; effects = []; dirty = false; },
  };
});

const audio = vi.hoisted(() => {
  const idle = () => ({ status: 'idle', cue: null, cueIndex: -1, cueCount: 0, currentTime: 0, duration: 0, progress: 0, error: null, provider: 'MiniMax' });
  const instances = [];
  class MockNarrationController {
    snapshot = idle(); listeners = new Set(); queue = []; volume=1;
    constructor(options = {}) { this.options = options; instances.push(this); }
    emit(patch) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(listener => listener(this.snapshot)); }
    subscribe(listener) { this.listeners.add(listener); listener(this.snapshot); return () => this.listeners.delete(listener); }
    start = vi.fn(queue => {
      this.queue = queue.map(cue => ({ ...cue }));
      const cue = this.queue[0];
      this.emit({ ...idle(), status: 'loading', cue, cueIndex: 0, cueCount: queue.length, timing:undefined });
      this.options.onCue?.(cue, 0);
      // Duration is the mocked asset's loaded metadata, not a scene duration.
      this.emit({ status: 'playing', duration: 100 });
    });
    pause = vi.fn(() => {
      if (this.snapshot.status === 'playing' || this.snapshot.status === 'loading') this.emit({ status: 'paused' });
    });
    stop = vi.fn(() => { this.queue = []; this.emit(idle()); });
    resume = vi.fn(() => this.emit({ status: 'playing' }));
    seek = vi.fn(seconds => {
      const progress = Math.max(0, Math.min(1, seconds / this.snapshot.duration));
      this.emit({ currentTime: seconds, progress });
      this.options.onProgress?.(progress, this.snapshot);
    });
    setVolume=vi.fn(value=>{this.volume=value;});
    dispose() { this.stop(); this.listeners.clear(); }
    nextCue() {
      const index=this.snapshot.cueIndex+1,cue=this.queue[index];
      if(!cue)throw new Error('No next actual clip');
      // Match NarrationController.loadCue: publish the new snapshot before onCue.
      this.emit({status:'loading',cue,cueIndex:index,currentTime:0,duration:0,progress:0,timing:undefined});
      this.options.onCue?.(cue,index);
      this.emit({status:'playing',duration:100});
      this.options.onProgress?.(0,this.snapshot);
    }
    finishQueue() {
      // The real controller emits onEnded only after the last queued clip.
      const cue = this.queue.at(-1);
      this.emit({ status: 'ended', cue, cueIndex: this.queue.length - 1, currentTime: 100, duration: 100, progress: 1 });
      this.options.onProgress?.(1, this.snapshot);
      this.options.onEnded?.(this.snapshot);
    }
    late(cueId) {
      // Deliver an already-captured callback after navigation, without replacing
      // the current controller queue or pretending old media became current.
      const state = { ...idle(), cue: { id: cueId, text: '旧片段' }, status: 'ended', duration: 100, progress: 1 };
      this.options.onCue?.(state.cue, 2);
      this.options.onProgress?.(1, state);
      this.options.onEnded?.(state);
      this.listeners.forEach(listener => listener(state));
    }
  }
  return { instances, MockNarrationController };
});

vi.mock('react', () => ({ ...harness, useCallback: (callback, deps) => harness.useMemo(() => callback, deps) }));
vi.mock('../src/lib/narration', () => ({ NarrationController: audio.MockNarrationController }));

import { useCityComparisonDirector } from '../src/hooks/useCityComparisonDirector';
import { cityComparisonAudioSegments } from '../src/hooks/useCityComparisonDirector';
import { cityAccessPhaseProgress } from '../src/lib/cityAccessState';
import {captureCityTravelReview} from '../src/lib/cityTravelReview';
import {cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {narrationSentence} from '../src/lib/narrationSentence';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {cityPlaceThreads,cityPlaceThreadReading} from '../src/data/cityPlaceThreads';
import {narrationTimingAt} from '../src/lib/narrationTiming';

const options = { active: true, ready: true };
const render = () => harness.render(useCityComparisonDirector, options);
const controller = () => audio.instances.at(-1);
const sentenceAt=(stage,progress)=>{
  const position=cityLifeSceneToAudio(cityComparisonAudioSegments(stage),progress);
  return narrationSentence(position.segment.text,position.fraction);
};

describe('重听当前录音段与整主题重播分开',()=>{
  it.each(['history','development','connections','travel'])('%s中重听保持当前城市、录音与静音偏好，播放中也重新建立队列',stage=>{
    for(const progress of [.19,.54,.85])for(const run of [false,true]){
      let director=render();director.selectStage(stage,run,progress);director=render();
      director.setVoice(false);director=render();director.setTransfer(false);director=render();
      if(run){director.playPause();director=render();}
      const segment=cityLifeSceneToAudio(cityComparisonAudioSegments(stage),progress).segment;
      const starts=controller().start.mock.calls.length;
      director.replaySegment();director=render();
      expect(director).toMatchObject({stage,progress:segment.start,voice:false,transfer:true,playing:true});
      expect(controller().start).toHaveBeenCalledTimes(starts+1);
      expect(controller().queue[0]).toEqual({id:segment.id,text:segment.text});
      expect(controller().volume).toBe(0);expect(controller().seek).toHaveBeenLastCalledWith(0);
    }
  });
  it('旅行结束后仍可重听最后一个地方的段落；整主题重播才回到林芝',()=>{
    let director=render();director.selectStage('travel',false,1);director=render();
    const last=cityComparisonAudioSegments('travel').at(-1);
    director.replaySegment();director=render();
    expect(director).toMatchObject({stage:'travel',progress:last.start,playing:true});
    expect(controller().queue[0].id).toBe(last.id);
    director.replay();director=render();
    expect(director.progress).toBe(0);expect(controller().queue[0].id).toBe('CONT-travel-nyingchi-1');
  });
});

beforeEach(() => {
  const saved = new Map();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  vi.stubGlobal('localStorage', { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) });
  vi.stubGlobal('window', { setInterval: globalThis.setInterval });
  audio.instances.length = 0;
});
afterEach(() => { harness.reset(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('三城比较从文化历史到现代与旅行的真实 hook 调度', () => {
  it('城市空间最后一片结束后连续进入历史、发展、周边联系和旅行，旅行末尾停在100%', () => {
    let director = render();
    director.selectStage('settlement', true, .9); director = render();
    expect(controller().queue.map(cue => cue.id)).toEqual(['COMPARE-settlement-3']);
    expect(director).toMatchObject({ stage: 'settlement', progress: .9, playing: true });

    for (const stage of ['history', 'development', 'connections', 'travel']) {
      controller().finishQueue(); director = render();
      expect(director).toMatchObject({ stage, progress: 0, playing: true });
      expect(controller().queue.map(cue => cue.id)).toEqual(cityComparisonAudioSegments(stage).map(segment => segment.id));
      expect(controller().queue).toEqual(cityComparisonAudioSegments(stage).map(({id,text})=>({id,text})));
      expect(director.currentSentence).toBe(narrationSentence(controller().queue[0].text,0));
    }
    const starts = controller().start.mock.calls.length;
    controller().finishQueue(); director = render();
    expect(director).toMatchObject({ stage: 'travel', progress: 1, playing: false });
    expect(controller().start).toHaveBeenCalledTimes(starts);
    expect(director.currentSentence).toBe(narrationSentence(controller().queue.at(-1).text,1));
  });

  it('前一段迟到的 cue、进度和结束回调不能覆盖或跳过新阶段', () => {
    let director = render();
    director.selectStage('history', true); render();
    controller().finishQueue(); director = render();
    expect(director.stage).toBe('development');
    const currentSentence = director.currentSentence, starts = controller().start.mock.calls.length;
    controller().late('CONT-history-ngari-3'); director = render();
    expect(director).toMatchObject({ stage: 'development', progress: 0, playing: true, currentSentence });
    expect(controller().start).toHaveBeenCalledTimes(starts);
    expect(director.audio.cue.id).toBe('ACCESS-nyingchi-before');

    director.selectStage('travel', false, .69); director = render();
    controller().late('ACCESS-ngari-life'); director = render();
    expect(director).toMatchObject({ stage: 'travel', progress: .69, playing: false });
  });

  it.each(['history', 'development', 'connections', 'travel'])('%s 手动选第三城69%时保持暂停，播放直接定位该真实片段', stage => {
    let director = render();
    director.selectStage(stage, false, .69); director = render();
    expect(director).toMatchObject({ stage, progress: .69, playing: false });
    expect(controller().start).not.toHaveBeenCalled();
    expect(director.currentSentence).toBe(sentenceAt(stage,.69));

    director.playPause(); director = render();
    const segments=cityComparisonAudioSegments(stage),index=segments.reduce((last,segment,i)=>.69>=segment.start?i:last,0);
    const segment=segments[index];
    expect(controller().queue.map(cue => cue.id)).toEqual(segments.slice(index).map(value=>value.id));
    expect(controller().queue).toEqual(segments.slice(index).map(({id,text})=>({id,text})));
    expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(100 * ((.69 - segment.start) / (segment.end-segment.start)), 10));
    expect(director).toMatchObject({ stage, progress: .69, playing: true });
    expect(director.audio.cue.id).toBe(segment.id);
  });

  it('关闭服务后普通播放恢复完整作者条件，保留阿里的原始录音位置', () => {
    let director = render();
    director.selectStage('development', false, .69); director = render();
    director.setServices(false); director = render();
    director.setRelief(false); director = render();
    director.setBuilt(false); director = render();
    director.setTransfer(false); director = render();
    expect(director).toMatchObject({ progress: .69, services: false, relief: false, built: false, transfer:false, playing: false });

    director.playPause(); director = render();
    expect(director).toMatchObject({ stage: 'development', progress: .69, services: true, relief: true, built: true, transfer:true, playing: true });
    expect(controller().queue[0].id).toBe('ACCESS-ngari-before');
    const position=cityLifeSceneToAudio(cityComparisonAudioSegments('development'),.69);
    expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(100*position.fraction,10));
  });

  it('仅关闭地方接续也会暂停；普通播放在拉萨同一片段恢复条件与现有媒体',()=>{
    let director=render();
    const progress=cityAccessPhaseProgress('lhasa','transfer')+.01;
    director.selectStage('development',true,progress);director=render();
    const starts=controller().start.mock.calls.length,stops=controller().stop.mock.calls.length;
    director.setTransfer(false);director=render();
    expect(director).toMatchObject({stage:'development',transfer:false,playing:false});
    director.playPause();director=render();
    expect(director).toMatchObject({stage:'development',progress,transfer:true,playing:true});
    expect(controller().queue[0].id).toBe('ACCESS-lhasa-transfer');
    expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().stop).toHaveBeenCalledTimes(stops);expect(controller().resume).toHaveBeenCalledOnce();
  });

  it.each([
    ['lhasa',.56,'setRelief'],['lhasa',.56,'setServices'],['lhasa',.56,'setBuilt'],['lhasa',.56,'setTransfer'],
    ['ngari',.91,'setRelief'],['ngari',.91,'setServices'],['ngari',.91,'setBuilt'],['ngari',.91,'setTransfer'],
  ])('%s / raw %s 的 %s 对照后普通播放不会跳回林芝',(_city,progress,control)=>{
    let director=render();director.selectStage('connections',false,progress);director=render();
    director.setVoice(false);director=render();director[control](false);director=render();
    director.playPause();director=render();
    const selected=cityLifeSceneToAudio(cityComparisonAudioSegments('connections'),progress);
    expect(director).toMatchObject({stage:'connections',progress,playing:true,voice:false,relief:true,services:true,built:true,transfer:true});
    expect(controller().snapshot.cue.id).toBe(selected.segment.id);expect(controller().volume).toBe(0);
    expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(100*selected.fraction,10));
    expect(director.getPosition().progress).toBe(progress);
  });

  it('普通播放恢复操作条件时保留原生词姿态，独立重播仍从主题开头',()=>{
    const segment=cityComparisonAudioSegments('development').find(item=>item.id==='ACCESS-lhasa-transfer');
    const fraction=.55,progress=segment.start+(segment.end-segment.start)*fraction;
    let director=render();director.selectStage('development',true,progress);director=render();
    const token='洛桑赤列',textStart=segment.text.indexOf(token);
    const timing={caption:'洛桑赤列的采访还提到村委会组织运输队，',spokenText:token,textStart,textEnd:segment.text.indexOf('说明设施'),textProgress:textStart/segment.text.length,precision:'provider',timingLevel:'word',activeTextStart:textStart,activeTextEnd:textStart+token.length};
    controller().emit({timing});director=render();const sceneProgress=director.sceneProgress;
    director.setTransfer(false);director=render();director.playPause();director=render();
    expect(director).toMatchObject({progress,sceneProgress,playing:true,transfer:true,narrationTiming:timing});
    expect(controller().snapshot.cue.id).toBe(segment.id);
    director.replay();director=render();
    expect(director).toMatchObject({stage:'development',progress:0,playing:true});expect(controller().queue[0].id).toBe('ACCESS-nyingchi-before');
  });

  it('拉萨生活入口普通播放从真实人名首词开始，暂停展示锚点不覆盖媒体seek或旅行返回raw',()=>{
    const step=cityPlaceThreads.lhasa.steps.find(item=>item.id==='life');
    const position=cityLifeSceneToAudio(cityComparisonAudioSegments(step.stage),step.progress);
    const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
    const asset=manifest.clips.find(item=>item.cueId===position.segment.id);
    const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
    const seconds=position.fraction*asset.duration,timing=narrationTimingAt(asset.text,seconds,asset.duration,timeline);
    expect(timing.caption).toBe('洛桑赤列的采访还提到村委会组织运输队，');
    let director=render();director.selectStage('travel',false,.867);director=render();
    const snapshot=captureCityTravelReview(director.getPosition(),{'shiquanhe-life':'life'},{readingTop:940,pageTop:1350});
    director.restorePosition({...director.getPosition(),stage:step.stage,progress:step.progress},{sceneProgress:step.sceneProgress});director=render();
    expect(director).toMatchObject({progress:step.progress,sceneProgress:step.sceneProgress,playing:false});
    expect(cityPlaceThreadReading('lhasa',step.stage,director.sceneProgress).active).toBe('life');
    director.playPause();director=render();
    expect(controller().snapshot.cue.id).toBe('ACCESS-lhasa-transfer');
    expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(100*position.fraction,10));
    controller().emit({timing});director=render();
    expect(director.currentSentence).toBe(timing.caption);expect(director.progress).toBeCloseTo(step.progress,12);
    expect(cityPlaceThreadReading('lhasa',step.stage,director.sceneProgress).active).toBe('life');
    director.restorePosition(snapshot.position);director=render();
    expect(director).toMatchObject({stage:'travel',progress:.867,playing:false});expect(snapshot.position.progress).toBe(.867);
  });

  it.each([
    ['nyingchi','CONT-history-nyingchi-3','二〇一七年又有商户进驻和家庭旅馆培训的记录。'],
    ['ngari','CONT-connections-ngari-3','公共空间与管护组织停留和使用。'],
  ])('%s生活按钮暂停、播放和旅行返回都保留真实录音入口，原生词不会回退到事件', (cityId,cueId,caption)=>{
    const step=cityPlaceThreads[cityId].steps.find(item=>item.id==='life');
    const position=cityLifeSceneToAudio(cityComparisonAudioSegments(step.stage),step.progress);
    const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
    const asset=manifest.clips.find(item=>item.cueId===position.segment.id);
    const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
    const timing=narrationTimingAt(asset.text,position.fraction*asset.duration,asset.duration,timeline);
    expect(position.segment.id).toBe(cueId);expect(timing.caption).toBe(caption);
    let director=render();director.selectStage('travel',false,.867);director=render();
    const snapshot=captureCityTravelReview(director.getPosition(),{}, {readingTop:940,pageTop:1350});
    director.restorePosition({...director.getPosition(),stage:step.stage,progress:step.progress},{sceneProgress:step.sceneProgress??step.progress});director=render();
    expect(director.playing).toBe(false);
    expect(cityPlaceThreadReading(cityId,step.stage,director.sceneProgress).active).toBe('life');
    director.playPause();director=render();
    expect(controller().snapshot.cue.id).toBe(cueId);
    expect(controller().seek).toHaveBeenLastCalledWith(expect.closeTo(100*position.fraction,10));
    controller().emit({timing});director=render();
    expect(director.currentSentence).toBe(caption);expect(director.progress).toBeCloseTo(step.progress,12);
    expect(cityPlaceThreadReading(cityId,step.stage,director.sceneProgress).active).toBe('life');
    director.pause();director=render();expect(director.currentSentence).toBe(caption);
    director.restorePosition(snapshot.position);director=render();
    expect(director).toMatchObject({stage:'travel',progress:.867,playing:false});
  });

  it('现代发展内部手动换环以后，旧环节迟到的字幕、进度和结束不能回退或跳过整段',()=>{
    let director=render();
    director.selectStage('development',true,cityAccessPhaseProgress('lhasa','access')+.002);director=render();
    expect(controller().snapshot.cue.id).toBe('ACCESS-lhasa-access');
    const target=cityAccessPhaseProgress('lhasa','transfer')+.005;
    director.setProgress(target);director=render();
    director.playPause();director=render();
    expect(controller().snapshot.cue.id).toBe('ACCESS-lhasa-transfer');
    const currentSentence=director.currentSentence,starts=controller().start.mock.calls.length;
    controller().late('ACCESS-lhasa-access');director=render();
    expect(director).toMatchObject({stage:'development',progress:target,playing:true,currentSentence});
    expect(director.audio.cue.id).toBe('ACCESS-lhasa-transfer');
    expect(controller().start).toHaveBeenCalledTimes(starts);
  });

  it('真实新片段按十二环逐一接管字幕与场景，最后一片结束才进入周边联系',()=>{
    let director=render();
    director.selectStage('development',true);director=render();
    const segments=cityComparisonAudioSegments('development');
    for(let index=0;index<segments.length;index++){
      if(index>0){controller().nextCue();director=render();}
      const segment=segments[index];
      expect(director).toMatchObject({stage:'development',playing:true,currentSentence:narrationSentence(segment.text,0)});
      expect(director.progress).toBeCloseTo(segment.start,12);
      expect(director.audio.cue.id).toBe(segment.id);
      expect(director.audio.cue.text).toBe(segment.text);
    }
    controller().finishQueue();director=render();
    expect(director).toMatchObject({stage:'connections',progress:0,playing:true});
    expect(controller().snapshot.cue.id).toBe('CONT-connections-nyingchi-1');
  });

  it('静音沿真实录音时钟播放、暂停和拖动，单独推进计时器不能替代媒体进度', () => {
    let director = render();
    director.setVoice(false); director = render();
    director.selectStage('connections', false, .69); director = render();
    director.playPause(); director = render();
    expect(controller().volume).toBe(0);
    expect(controller().snapshot.cue.id).toBe('CONT-connections-ngari-1');
    expect(controller().start).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000); director = render();
    expect(director.progress).toBe(.69);
    controller().seek(50);director=render();
    expect(director.progress).toBeGreaterThan(.69);
    expect(director.playing).toBe(true);
    expect(cityLifeSceneToAudio(cityComparisonAudioSegments('connections'),director.progress).fraction).toBeCloseTo(.5,12);
    expect(director.currentSentence).toBe(narrationSentence(controller().snapshot.cue.text,.5));

    director.pause(); director = render();
    const pausedAt = director.progress;
    vi.advanceTimersByTime(5000); director = render();
    expect(director).toMatchObject({ progress: pausedAt, playing: false });

    director.setProgress(.35); director = render();
    expect(director).toMatchObject({ progress: .35, playing: false });
    expect(director.currentSentence).toBe(sentenceAt('connections',.35));
    director.playPause(); director=render();
    expect(controller().snapshot.cue.id).toBe('CONT-connections-lhasa-1');
    vi.advanceTimersByTime(1000);controller().seek(50);director = render();
    expect(director.progress).toBeGreaterThan(.35);

    director.selectStage('travel', true, .99); director=render();
    expect(controller().volume).toBe(0);
    expect(controller().snapshot.cue.id).toBe('CONT-travel-ngari-3');
    vi.advanceTimersByTime(60000);director=render();
    expect(director).toMatchObject({stage:'travel',progress:.99,playing:true});
    controller().finishQueue();director=render();
    expect(director).toMatchObject({ stage: 'travel', progress: 1, playing: false, voice: false });
    expect(controller().start).toHaveBeenCalledTimes(3);
  });

  it('播放中开关声音仅改变响度，真实片段、进度、seek与队列都连续',()=>{
    let director=render();director.selectStage('history',true);director=render();
    vi.advanceTimersByTime(150);controller().seek(37);director=render();
    const progress=director.progress,cue=controller().snapshot.cue.id,queue=controller().queue;
    const starts=controller().start.mock.calls.length,stops=controller().stop.mock.calls.length,seeks=controller().seek.mock.calls.length;
    director.setVoice(false);director=render();
    expect(director).toMatchObject({progress,playing:true,voice:false});
    expect(controller().volume).toBe(0);expect(controller().snapshot.cue.id).toBe(cue);expect(controller().queue).toBe(queue);
    expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().stop).toHaveBeenCalledTimes(stops);expect(controller().seek).toHaveBeenCalledTimes(seeks);
    controller().nextCue();director=render();
    expect(director).toMatchObject({stage:'history',progress:cityComparisonAudioSegments('history')[1].start,playing:true,voice:false});
    expect(director.currentSentence).toBe(narrationSentence(cityComparisonAudioSegments('history')[1].text,0));
    const currentProgress=director.progress;
    director.setVoice(true);director=render();
    expect(director).toMatchObject({progress:currentProgress,playing:true,voice:true});
    expect(controller().volume).toBe(1);expect(controller().snapshot.cue.id).toBe('CONT-history-nyingchi-2');
    expect(controller().start).toHaveBeenCalledTimes(starts);expect(controller().stop).toHaveBeenCalledTimes(stops);
  });

  it('全程静音仍由真实跨片与末尾事件进入下一主题，并拦截旧片段迟到回调',()=>{
    let director=render();director.setVoice(false);director=render();
    director.selectStage('development',true);director=render();
    const segments=cityComparisonAudioSegments('development');
    for(let index=0;index<segments.length;index++){
      if(index){controller().nextCue();director=render();}
      expect(director).toMatchObject({progress:segments[index].start,currentSentence:narrationSentence(segments[index].text,0),playing:true,voice:false});
      expect(controller().snapshot.cue.text).toBe(segments[index].text);
      expect(controller().volume).toBe(0);
    }
    controller().finishQueue();director=render();
    expect(director).toMatchObject({stage:'connections',progress:0,playing:true,voice:false});
    expect(controller().snapshot.cue.id).toBe('CONT-connections-nyingchi-1');
    controller().late('ACCESS-ngari-life');director=render();
    expect(director).toMatchObject({stage:'connections',progress:0,playing:true,voice:false});
  });

  it('静音媒体准备失败同样暂停，不通过独立计时器继续场景',()=>{
    let director=render();director.setVoice(false);director=render();director.playPause();director=render();
    controller().emit({status:'error',error:'录音暂时不可用'});director=render();
    const progress=director.progress;
    vi.advanceTimersByTime(60000);director=render();
    expect(director).toMatchObject({progress,playing:false,voice:false});
    expect(director.audio.error).toBe('录音暂时不可用');
  });

  it('同片真实句级字幕在同百分比桶内也及时更新，跨片手动seek不能沿用旧字幕',()=>{
    let director=render();director.selectStage('history',true);director=render();
    vi.advanceTimersByTime(150);controller().seek(41);director=render();
    const timing={caption:'本次录音对应的真实短句',spokenText:'本次录音对应的真实短句',textStart:3,textEnd:15,textProgress:.4,precision:'provider'};
    controller().emit({timing});director=render();
    expect(director.currentSentence).toBe(timing.caption);expect(director.narrationTiming).toEqual(timing);
    const next={...timing,caption:'同一百分比内的下一句',spokenText:'同一百分比内的下一句',textStart:15,textEnd:25,textProgress:.5};
    controller().emit({timing:next});director=render();expect(director.currentSentence).toBe(next.caption);
    const word={...next,timingLevel:'word',activeTextStart:16,activeTextEnd:17,textProgress:.52};
    controller().emit({timing:word});director=render();expect(director.narrationTiming.activeTextStart).toBe(16);
    controller().emit({timing:{...word,activeTextStart:17,activeTextEnd:18,textProgress:.55}});director=render();expect(director.narrationTiming).toMatchObject({activeTextStart:17,textProgress:.55});
    director.setProgress(.69);director=render();
    expect(director.currentSentence).toBe(sentenceAt('history',.69));expect(director.narrationTiming.precision).toBe('estimated');
  });

  it('原生词只改变独立物理进度，raw seek、快照与继续仍属于实际录音时间',()=>{
    const segments=cityComparisonAudioSegments('connections'),segment=segments[2],fraction=.41,raw=segment.start+(segment.end-segment.start)*fraction;
    let director=render();director.selectStage('connections',true,raw);director=render();
    const textProgress=segment.text.indexOf('再沿三一八国道')/segment.text.length;
    controller().emit({timing:{caption:'再沿三一八国道',spokenText:'再',textStart:segment.text.indexOf('再沿三一八国道'),textEnd:segment.text.indexOf('再沿三一八国道')+7,textProgress,precision:'provider',timingLevel:'word'}});director=render();
    expect(director.progress).toBeCloseTo(raw,12);expect(cityContinuityPartState(director.sceneProgress).partProgress).toBeCloseTo(.5,10);
    expect(director.getPosition().progress).toBeCloseTo(raw,12);expect(director.getPosition()).not.toHaveProperty('sceneProgress');
    const snapshot=director.getPosition();director.restorePosition(snapshot);director=render();expect(director.progress).toBeCloseTo(raw,12);expect(director.sceneProgress).toBe(director.progress);
  });

  it.each(['history','development','connections'])('%s 手动继续逐片保留三地，最后一片才进入下一主题',stage=>{
    let director=render();director.selectStage(stage);director=render();
    const segments=cityComparisonAudioSegments(stage);
    for(let index=0;index<segments.length;index++){
      expect(director).toMatchObject({stage,progress:segments[index].start,playing:false});
      expect(director.currentSentence).toBe(narrationSentence(segments[index].text,0));
      if(index<segments.length-1){
        expect(director.continuation).toMatchObject({kind:'segment',progress:segments[index+1].start,segmentId:segments[index+1].id});
        director.continueReading();director=render();
      }
    }
    expect(director.continuation.kind).toBe('stage');
    const next=director.continuation.stage;director.continueReading();director=render();
    expect(director).toMatchObject({stage:next,progress:0,playing:false});
    expect(controller().start).not.toHaveBeenCalled();
  });

  it('旅行回看后精确恢复原城市环节和操作条件，保持暂停并拒绝发展片段迟到回调',()=>{
    let director=render();director.selectStage('travel',false,.867);director=render();
    director.setServices(false);director=render();
    director.setVoice(false);director=render();
    const original=director.getPosition();
    const snapshot=captureCityTravelReview(original,{tholing:'transfer'},{readingTop:1190,pageTop:2450});
    director.selectStage('development',true,.69);director=render();
    director.restorePosition(snapshot.position);director=render();
    expect(director).toMatchObject({...original,playing:false});
    expect(director.getPosition()).toEqual(original);
    expect(director.currentSentence).toBe(sentenceAt('travel',.867));
    controller().late('ACCESS-ngari-life');director=render();
    expect(director).toMatchObject({stage:'travel',progress:.867,services:false,voice:false,playing:false});
    expect(snapshot).toMatchObject({cityId:'ngari',choices:{tholing:'transfer'},readingTop:1190,pageTop:2450});
    expect(controller().queue).toEqual([]);
  });

  const nativeTravelView=()=>{
    const segment=cityComparisonAudioSegments('travel')[4],fraction=.41,progress=segment.start+(segment.end-segment.start)*fraction;
    let director=render();director.selectStage('travel',true,progress);director=render();
    const token='红宫的纪念用途',textStart=segment.text.indexOf(token);
    const timing={caption:token,spokenText:'红宫',textStart,textEnd:textStart+token.length,textProgress:textStart/segment.text.length,precision:'provider',timingLevel:'word',activeTextStart:textStart,activeTextEnd:textStart+2};
    controller().emit({timing});director=render();director.pause();director=render();
    return {director,position:director.getPosition(),presentation:director.getPresentation(),segment};
  };

  it('原生词旅行→回看→返回同时恢复地图动作和字幕，不把presentation写入raw快照',()=>{
    const original=nativeTravelView();let director=original.director;
    expect(original.presentation.sceneProgress).not.toBe(original.position.progress);
    expect(original.position).not.toHaveProperty('sceneProgress');expect(original.position).not.toHaveProperty('narrationTiming');
    director.selectStage('development',true,.69);director=render();
    director.restorePosition(original.position,original.presentation);director=render();
    expect(director).toMatchObject({...original.position,playing:false,sceneProgress:original.presentation.sceneProgress,currentSentence:original.presentation.narrationTiming.caption});
    expect(director.narrationTiming).toEqual(original.presentation.narrationTiming);expect(director.audio.status).toBe('idle');expect(controller().queue).toEqual([]);
    controller().late('ACCESS-ngari-life');director=render();expect(director.getPresentation()).toEqual(original.presentation);
    director.setVoice(false);director=render();director.setServices(false);director=render();director.setTransfer(false);director=render();
    expect(director.getPresentation()).toEqual(original.presentation);expect(director.getPosition()).toMatchObject({stage:'travel',progress:original.position.progress,voice:false,services:false,transfer:false});
  });

  it('恢复后真实录音重新定位并接管词级场景；旧字幕快照不冻结继续播放',()=>{
    const original=nativeTravelView();let director=original.director;
    director.selectStage('development',false,.69);director=render();director.restorePosition(original.position,original.presentation);director=render();
    director.playPause();director=render();expect(controller().queue[0]).toEqual({id:original.segment.id,text:original.segment.text});
    const token='把对象、年代和用途',textStart=original.segment.text.indexOf(token);
    const timing={caption:token,spokenText:'把对象',textStart,textEnd:textStart+token.length,textProgress:textStart/original.segment.text.length,precision:'provider',timingLevel:'word'};
    controller().emit({timing});director=render();
    expect(director.currentSentence).toBe(token);expect(director.narrationTiming).toEqual(timing);expect(director.sceneProgress).toBeGreaterThan(original.presentation.sceneProgress);
    expect(director.progress).toBeCloseTo(original.position.progress,12);
    vi.advanceTimersByTime(150);controller().seek(72);director=render();expect(director.progress).toBeGreaterThan(original.position.progress);
  });

  it('显式seek、select和replay使恢复的presentation失效，声音及暂停不使其失效',()=>{
    const original=nativeTravelView();let director=original.director;
    director.restorePosition(original.position,original.presentation);director=render();director.pause();director=render();director.setVoice(false);director=render();
    expect(director.getPresentation()).toEqual(original.presentation);
    director.setProgress(original.position.progress);director=render();expect(director.sceneProgress).toBe(original.position.progress);expect(director.narrationTiming.precision).toBe('estimated');
    director.restorePosition(original.position,original.presentation);director=render();director.selectStage('travel',false,original.position.progress);director=render();expect(director.sceneProgress).toBe(original.position.progress);
    director.restorePosition(original.position,original.presentation);director=render();director.replay();director=render();expect(director).toMatchObject({stage:'travel',progress:0,sceneProgress:0,playing:true});
  });

  it('恢复只接受当前stage/raw片段的presentation，并隔离外部对象修改',()=>{
    const original=nativeTravelView();let director=original.director;
    director.restorePosition({...original.position,stage:'history'},original.presentation);director=render();expect(director.narrationTiming.precision).toBe('estimated');
    director.restorePosition(original.position,{...original.presentation,sceneProgress:.9});director=render();expect(director.sceneProgress).toBe(original.position.progress);
    director.restorePosition(original.position,original.presentation);director=render();const copy=director.getPresentation();copy.narrationTiming.caption='外部修改';
    expect(director.currentSentence).toBe(original.presentation.narrationTiming.caption);director.setVoice(false);director=render();expect(director.currentSentence).toBe(original.presentation.narrationTiming.caption);
  });
});
