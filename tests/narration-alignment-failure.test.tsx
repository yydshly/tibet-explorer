import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {NarrationController,refreshNarrationManifest} from '../src/lib/narration';
import NarrationAlignmentNotice,{narrationAlignmentUnavailable} from '../src/components/NarrationAlignmentNotice';

class FixtureAudio extends EventTarget {
 static current:FixtureAudio;src='';preload='';currentTime=0;duration=0;volume=1;
 constructor(){super();FixtureAudio.current=this;}
 pause(){}async play(){}load(){this.currentTime=0;this.duration=0;}
 removeAttribute(name:string){if(name==='src')this.src='';}
}
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const asset=manifest.clips.find((item:{cueId:string})=>item.cueId==='CONT-history-nyingchi-3');
const rawTimeline=readFileSync(`public${asset.subtitleUrl}`,'utf8');
let controller:NarrationController;
beforeEach(()=>{refreshNarrationManifest();vi.stubGlobal('Audio',FixtureAudio);vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});controller=new NarrationController();});
afterEach(()=>{controller.dispose();vi.unstubAllGlobals();});

describe('native word sidecar failure stays distinct from audio playback failure',()=>{
 it('shows a transparent estimate notice after a failed actual sidecar, then clears after a successful retry',async()=>{
  let attempt=0;
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('cue-manifest.json')?{ok:true,json:async()=>manifest}:{ok:++attempt>1,headers:new Headers(),text:async()=>rawTimeline}));
  await controller.start([{id:asset.cueId,text:asset.text}]);
  const audio=FixtureAudio.current;audio.duration=asset.duration;audio.currentTime=10.463;audio.dispatchEvent(new Event('timeupdate'));
  expect(controller.snapshot).toMatchObject({status:'playing',error:null,timing:{precision:'estimated'}});
  expect(narrationAlignmentUnavailable(controller.snapshot)).toBe(true);
  const html=renderToStaticMarkup(createElement(NarrationAlignmentNotice,{unavailable:narrationAlignmentUnavailable(controller.snapshot)}));
  expect(html).toContain('逐字同步资料暂不可用');expect(html).not.toContain('录音无法播放');
  audio.dispatchEvent(new Event('error'));expect(controller.snapshot.status).toBe('error');expect(narrationAlignmentUnavailable(controller.snapshot)).toBe(false);
  await controller.resume();audio.duration=asset.duration;audio.currentTime=10.463;audio.dispatchEvent(new Event('timeupdate'));
  expect(controller.snapshot).toMatchObject({status:'playing',error:null,timing:{precision:'provider',timingLevel:'word'}});expect(narrationAlignmentUnavailable(controller.snapshot)).toBe(false);expect(attempt).toBe(2);
 });
});
