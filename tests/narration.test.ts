import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrationController, getNarrationAsset, refreshNarrationManifest } from '../src/lib/narration';

class FakeAudio extends EventTarget {
  static current: FakeAudio;
  src = ''; preload = ''; currentTime = 0; duration = 0; volume = 1;
  play = vi.fn(async () => {}); pause = vi.fn(); load = vi.fn();
  constructor() { super(); FakeAudio.current = this; }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
}
const manifest = (clips: unknown[] = []) => ({ ok: true, json: async () => ({ clips }) });
const asset = (text = '第一段', url = '/a.mp3') => ({ ok: true, json: async () => ({ id: 'hash', text, url, duration: 10, provider: 'MiniMax', model: 'speech-2.8-hd' }) });
const nextTurn = () => new Promise(resolve => setTimeout(resolve, 0));
let controller: NarrationController;
beforeEach(() => {
  refreshNarrationManifest();
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  controller = new NarrationController();
});
afterEach(() => { controller.dispose(); vi.unstubAllGlobals(); });

describe('MiniMax narration lifecycle', () => {
  it('does not play a response that finishes after leaving a scene', async () => {
    let resolveAudio!: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveAudio = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockReturnValueOnce(pending));
    const start = controller.start([{ id: 'cancel', text: '第一段' }]);
    await nextTurn(); controller.stop(); resolveAudio(asset()); await start;
    expect(controller.snapshot.status).toBe('idle'); expect(FakeAudio.current.play).not.toHaveBeenCalled();
  });
  it('a late play promise from an old cue cannot pause the new cue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockResolvedValueOnce(asset()).mockResolvedValueOnce(asset('第二段', '/b.mp3')));
    let resolvePlay!: () => void;
    FakeAudio.current.play.mockImplementationOnce(() => new Promise<void>(resolve => { resolvePlay = resolve; }));
    const first = controller.start([{ id: 'old-play', text: '第一段' }]);
    await nextTurn();
    await controller.start([{ id: 'new-play', text: '第二段' }]);
    const pauses = FakeAudio.current.pause.mock.calls.length;
    resolvePlay(); await first;
    expect(FakeAudio.current.pause.mock.calls.length).toBe(pauses); expect(controller.snapshot.cue?.id).toBe('new-play'); expect(controller.snapshot.status).toBe('playing');
  });
  it('keeps pause effective while a new audio clip is being generated', async () => {
    let resolveAudio!: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveAudio = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockReturnValueOnce(pending));
    const start = controller.start([{ id: 'pause-loading', text: '第一段' }]);
    await nextTurn(); controller.pause(); resolveAudio(asset()); await start;
    expect(controller.snapshot.status).toBe('paused'); expect(FakeAudio.current.play).not.toHaveBeenCalled();
    await controller.resume(); expect(controller.snapshot.status).toBe('playing');
  });
  it('resuming during generation waits for the real audio source', async () => {
    let resolveAudio!: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveAudio = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockReturnValueOnce(pending));
    const start = controller.start([{ id: 'resume-loading', text: '第一段' }]);
    await nextTurn(); controller.pause(); await controller.resume();
    expect(FakeAudio.current.play).not.toHaveBeenCalled();
    resolveAudio(asset()); await start; expect(FakeAudio.current.play).toHaveBeenCalledOnce();
  });
  it('reports actual audio time and finishes a single cue without advancing a scene', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockResolvedValueOnce(asset()));
    await controller.start([{ id: 'clock', text: '第一段' }]);
    const audio = FakeAudio.current; audio.duration = 10; audio.currentTime = 4;
    audio.dispatchEvent(new Event('timeupdate'));
    expect(controller.snapshot.progress).toBe(.4);
    audio.dispatchEvent(new Event('ended'));
    expect(controller.snapshot.status).toBe('ended'); expect(controller.snapshot.progress).toBe(1); expect(controller.snapshot.cue?.id).toBe('clock');
  });
  it('uses a static asset only when its recorded text matches the current cue', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(manifest([{ id: 'hash', cueId: 'match', text: '第一段', url: '/prebuilt.mp3', duration: 10 }])).mockResolvedValueOnce(asset('修改后的文字'));
    vi.stubGlobal('fetch', fetchMock);
    expect((await getNarrationAsset('match', '第一段')).url).toBe('/prebuilt.mp3');
    await getNarrationAsset('match', '修改后的文字');
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(fetchMock.mock.calls[1][0]).toBe('/api/narration');
  });
  it('can retry a failed generation and does not fall back to browser speech', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockResolvedValueOnce({ ok: false, json: async () => ({ error: '稍后重试' }) }).mockResolvedValueOnce(asset()));
    await controller.start([{ id: 'retry', text: '第一段' }]); expect(controller.snapshot.status).toBe('error');
    await controller.resume(); expect(controller.snapshot.status).toBe('playing');
  });
  it('ignores previous media events while the next cue is waiting for its own recording', async () => {
    let resolveAudio!: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveAudio = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(manifest()).mockResolvedValueOnce(asset()).mockReturnValueOnce(pending));
    await controller.start([{ id: 'previous-media', text: '第一段' }]);
    const start = controller.start([{ id: 'pending-media', text: '第二段' }]);
    await nextTurn();
    const audio = FakeAudio.current; audio.duration = 10; audio.currentTime = 9;
    audio.dispatchEvent(new Event('loadedmetadata')); audio.dispatchEvent(new Event('timeupdate')); audio.dispatchEvent(new Event('error'));
    expect(controller.snapshot).toMatchObject({status:'loading',cue:{id:'pending-media'},currentTime:0,duration:0,progress:0});
    resolveAudio(asset('第二段','/next.mp3')); await start;
    expect(controller.snapshot.status).toBe('playing'); expect(audio.src).toBe('/next.mp3');
  });
  it('cancels subtitle preparation together with its recording when the user leaves', async () => {
    let resolveSubtitle!: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveSubtitle = resolve; });
    const recording={id:'subtitle-cancel',cueId:'subtitle-cancel',text:'第一段',url:'/prepared.mp3',duration:10,model:'speech-2.8-hd',voice:'voice',sha256:'a'.repeat(64),subtitleUrl:'/assets/audio/narration/cancel.subtitles.json'};
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(manifest([recording])).mockReturnValueOnce(pending));
    const start=controller.start([{id:recording.cueId,text:recording.text}]); await nextTurn();
    controller.stop();resolveSubtitle({ok:true,headers:new Headers(),text:async()=>'{"version":1}'});await start;
    expect(controller.snapshot.status).toBe('idle');expect(FakeAudio.current.src).toBe('');expect(FakeAudio.current.play).not.toHaveBeenCalled();
  });
  it('drives captions from the exact recording words and commits the final phrase on ended',async()=>{
    const text='先看海洋。再看陆地。';
    const textSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('');
    const recording={id:'word-clock',cueId:'word-clock',text,url:'/word.mp3',duration:10,model:'speech-2.8-hd',voice:'voice',sha256:'a'.repeat(64),subtitleUrl:'/assets/audio/narration/word.subtitles.json'};
    const timeline={version:1,source:'MiniMax',timingLevel:'word',audioSha256:recording.sha256,textSha256,model:recording.model,voice:recording.voice,duration:10,cues:[{start:.5,end:9.5,text,textStart:0,textEnd:10}],words:[{start:.5,end:6,text:text.slice(0,5),textStart:0,textEnd:5},{start:8,end:9.5,text:text.slice(5),textStart:5,textEnd:10}]};
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(manifest([recording])).mockResolvedValueOnce({ok:true,headers:new Headers(),text:async()=>JSON.stringify(timeline)}));
    await controller.start([{id:recording.cueId,text}]);const audio=FakeAudio.current;audio.duration=10;audio.currentTime=6.8;audio.dispatchEvent(new Event('timeupdate'));
    expect(controller.snapshot.progress).toBeCloseTo(.68,12);expect(controller.snapshot.timing).toMatchObject({caption:'先看海洋。',precision:'provider',timingLevel:'word'});
    expect(controller.snapshot.timing!.textProgress).toBeLessThan(.5);expect(controller.snapshot.timing!.textProgress).toBeCloseTo(.5,7);
    audio.dispatchEvent(new Event('ended'));
    expect(controller.snapshot).toMatchObject({status:'ended',progress:1,currentTime:10,timing:{caption:'再看陆地。',textProgress:1,activeTextStart:5,activeTextEnd:10}});
  });
});
