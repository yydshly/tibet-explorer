import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {estimatedNarrationTiming,getNarrationTimeline,narrationTimingAt,narrationTimingForPlayback,refreshNarrationTimelines,validateNarrationTimeline,type NarrationTimeline} from '../src/lib/narrationTiming';
import realWordManifest from '../public/assets/audio/narration/cue-manifest.json';
import realK1Words from '../public/assets/audio/narration/6e659428dfa39b68900e6e4700d2be0dcefe37992213f21712badeb48aa6bb04.subtitles.json';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings,narrationPhraseGuide} from '../src/lib/narrationPhraseGuide';

const text='先看海洋。再看陆地。';
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
let textSha='';
const asset={text,duration:10,model:'speech-2.8-hd',voice:'voice',sha256:'a'.repeat(64),subtitleUrl:'/assets/audio/narration/test.subtitle.json'};
const timeline=():NarrationTimeline=>({version:1,source:'MiniMax',audioSha256:asset.sha256,textSha256:textSha,model:asset.model,voice:asset.voice,duration:10,cues:[
 {start:.2,end:7,text:text.slice(0,5),textStart:0,textEnd:5},
 {start:8,end:9.6,text:text.slice(5),textStart:5,textEnd:10},
]});
beforeEach(async()=>{refreshNarrationTimelines();textSha=await sha(text);});
afterEach(()=>vi.unstubAllGlobals());

describe('recording-bound sentence timing',()=>{
 it('follows the provider sentence, including long pauses, rather than equal clip fractions',()=>{
  const at=narrationTimingAt(text,6.8,10,timeline());
  expect(at).toMatchObject({caption:'先看海洋。',precision:'provider',textStart:0,textEnd:5});
  expect(estimatedNarrationTiming(text,.68).caption).toBe('再看陆地。');
  expect(narrationTimingAt(text,7.5,10,timeline()).textProgress).toBe(.5);
  expect(narrationTimingAt(text,.1,10,timeline())).toMatchObject({caption:'',textProgress:0,precision:'provider'});
 });
 it('selects exact boundaries, seeks backwards, and holds the final real sentence',()=>{
  expect(narrationTimingAt(text,8,10,timeline()).caption).toBe('再看陆地。');
  expect(narrationTimingAt(text,9,10,timeline()).textProgress).toBeGreaterThan(.5);
  expect(narrationTimingAt(text,2,10,timeline()).caption).toBe('先看海洋。');
  expect(narrationTimingAt(text,10,10,timeline())).toMatchObject({caption:'再看陆地。',textProgress:1});
 });
 it('rejects a caption from another recording, text or scene seek',()=>{
  const native=narrationTimingAt(text,6,10,timeline()),audio={cue:{id:'cue',text},progress:.6,timing:native};
  expect(narrationTimingForPlayback(text,.6,audio,'cue')).toBe(native);
  expect(narrationTimingForPlayback(text,.6,audio,'other').precision).toBe('estimated');
  expect(narrationTimingForPlayback(text,.1,audio,'cue').precision).toBe('estimated');
  expect(narrationTimingForPlayback('修改后的讲述。',.6,audio,'cue').precision).toBe('estimated');
 });
 it('validates recording, text, voice, model and duration together',()=>{
  const value=timeline();expect(validateNarrationTimeline(value,asset,textSha)).toEqual(value);
  for(const patch of [{audioSha256:'b'.repeat(64)},{textSha256:'b'.repeat(64)},{model:'other'},{voice:'other'},{duration:12},{version:2},{source:'unknown'}])
   expect(validateNarrationTimeline({...value,...patch},asset,textSha)).toBeUndefined();
 });
 it('rejects overlapping time, skipped words, altered text and invalid source indices',()=>{
  const value=timeline();
  const invalid=[
   [{...value.cues[0],end:8.1},value.cues[1]],
   [value.cues[0],{...value.cues[1],end:Infinity}],
   [{...value.cues[0],text:'虚构字幕。'},value.cues[1]],
   [{...value.cues[0],textStart:-1},value.cues[1]],
   [value.cues[1]],
  ];
  invalid.forEach(cues=>expect(validateNarrationTimeline({...value,cues},asset,textSha)).toBeUndefined());
 });
 it('uses legacy estimates honestly without a provider sidecar',()=>{
  expect(narrationTimingAt(text,6,10)).toEqual(estimatedNarrationTiming(text,.6));
  expect(narrationTimingAt(text,NaN,0).precision).toBe('estimated');
 });
 it('locates repeated estimated captions at their actual weighted occurrence instead of the first equal string',()=>{
  const repeated='再看海洋。  再看海洋。';
  const first=estimatedNarrationTiming(repeated,.1),second=estimatedNarrationTiming(repeated,.75);
  expect(first.caption).toBe(second.caption);expect(first.textStart).toBe(0);expect(second.textStart).toBe(7);
  expect(repeated.slice(second.textStart,second.textEnd)).toBe(second.caption);
 });
 it('loads, checks and caches a local sidecar bound to the exact audio hash',async()=>{
  const raw=JSON.stringify(timeline()),fetch=vi.fn(async()=>({ok:true,headers:new Headers(),text:async()=>raw}));vi.stubGlobal('fetch',fetch);
  const withHash={...asset,subtitleSha256:await sha(raw)};
  expect(await getNarrationTimeline(withHash)).toEqual(timeline());
  expect(await getNarrationTimeline(withHash)).toEqual(timeline());expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('does not fetch remote or traversing subtitle URLs and rejects corrupt content',async()=>{
  const fetch=vi.fn(async()=>({ok:true,headers:new Headers(),text:async()=>JSON.stringify(timeline())}));vi.stubGlobal('fetch',fetch);
  for(const subtitleUrl of ['https://external.invalid/a.json','/assets/audio/narration/../private.json','/api/private'])
   expect(await getNarrationTimeline({...asset,subtitleUrl})).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  expect(await getNarrationTimeline({...asset,subtitleSha256:'c'.repeat(64)})).toBeUndefined();
 });
 it('retries a failed sidecar fetch and bounds its body size',async()=>{
  const raw=JSON.stringify(timeline()),fetch=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok:true,headers:new Headers(),text:async()=>raw});vi.stubGlobal('fetch',fetch);
  expect(await getNarrationTimeline(asset)).toBeUndefined();expect(await getNarrationTimeline(asset)).toEqual(timeline());
  refreshNarrationTimelines();fetch.mockResolvedValueOnce({ok:true,headers:new Headers({'content-length':'262145'}),text:vi.fn()});
  expect(await getNarrationTimeline(asset)).toBeUndefined();
 });
 it('does not reuse a cached sidecar across changed subtitle hashes, voice, model or duration bindings',async()=>{
  const raw=JSON.stringify(timeline()),fetch=vi.fn(async()=>({ok:true,headers:new Headers(),text:async()=>raw}));vi.stubGlobal('fetch',fetch);
  expect(await getNarrationTimeline(asset)).toEqual(timeline());
  for(const patch of [{voice:'other'},{model:'other'},{duration:12},{subtitleSha256:'f'.repeat(64)}])
   expect(await getNarrationTimeline({...asset,...patch})).toBeUndefined();
  expect(fetch).toHaveBeenCalledTimes(5);
 });
});

const wordText='海洋蒸发，水汽随风移动；湿空气上升冷却，才可能成云。';
function wordFixture(){
 const pieces=['海洋','蒸发','，','水汽','随风','移动','；','湿空气','上升','冷却','，','才可能','成云','。'];
 const times=[[.2,1.3],[1.8,2.1],[2.1,2.15],[4,4.6],[4.8,5],[5.1,5.3],[5.3,5.34],[7.8,8],[8.2,8.5],[8.6,9],[9,9.05],[11,11.7],[12.4,12.8],[12.8,12.9]];
 let offset=0;
 const words=pieces.map((part,index)=>{const textStart=offset;offset+=part.length;return {start:times[index][0],end:times[index][1],text:part,textStart,textEnd:offset};});
 const assetForWords={...asset,text:wordText,duration:14};
 const value:NarrationTimeline={...timeline(),duration:14,timingLevel:'word',cues:[{start:.1,end:13.5,text:wordText,textStart:0,textEnd:wordText.length}],words};
 return {value,asset:assetForWords};
}

describe('recording-bound word timing and readable original-text captions',()=>{
 it('uses exact word times and holds text position across long silent gaps, never distributing the large provider block evenly',()=>{
  const {value}=wordFixture();
  const gap=narrationTimingAt(wordText,3,14,value),laterGap=narrationTimingAt(wordText,3.9,14,value);
  expect(gap).toMatchObject({caption:'海洋蒸发，',spokenText:'，',precision:'provider',timingLevel:'word',activeTextStart:4,activeTextEnd:5});
  expect(gap.textProgress).toBeLessThan(5/wordText.length);expect(gap.textProgress).toBeCloseTo(5/wordText.length,7);expect(laterGap.textProgress).toBe(gap.textProgress);
  const inWord=narrationTimingAt(wordText,4.3,14,value);
  expect(inWord.textProgress).toBeCloseTo(6/wordText.length,12);expect(inWord.spokenText).toBe('水汽');expect(inWord).toMatchObject({activeTextStart:5,activeTextEnd:7});
  expect(narrationTimingAt(wordText,.1,14,value)).toMatchObject({caption:'',textProgress:0,timingLevel:'word'});
 });
 it('changes short captions inside the same provider block only when the corresponding words begin, and supports backwards seeking',()=>{
  const {value}=wordFixture();
  expect(value.cues).toHaveLength(1);
  for(const [seconds,caption] of [[1,'海洋蒸发，'],[4,'水汽随风移动；'],[7.8,'湿空气上升冷却，'],[11,'才可能成云。'],[2,'海洋蒸发，']] as const){
   const current=narrationTimingAt(wordText,seconds,14,value);
   expect(current.caption).toBe(caption);expect(wordText.slice(current.textStart,current.textEnd)).toBe(caption);
  }
  expect(narrationTimingAt(wordText,14,14,value)).toMatchObject({caption:'才可能成云。',textProgress:1});
 });
 it('uses inclusive word starts and exclusive text ends without progressing through the silent interval',()=>{
  const {value}=wordFixture();
  expect(narrationTimingAt(wordText,1.3,14,value).textProgress).toBeLessThan(2/wordText.length);
  expect(narrationTimingAt(wordText,1.3,14,value).textProgress).toBeCloseTo(2/wordText.length,7);
  expect(narrationTimingAt(wordText,1.79,14,value).textProgress).toBe(narrationTimingAt(wordText,1.3,14,value).textProgress);
  expect(narrationTimingAt(wordText,1.8,14,value).spokenText).toBe('蒸发');
  expect(narrationTimingAt(wordText,4-1e-6,14,value).caption).toBe('海洋蒸发，');
  expect(narrationTimingAt(wordText,4,14,value).caption).toBe('水汽随风移动；');
 });
 it('keeps actual K1 model meaning, caption and last word together through a real sentence-boundary pause until the next recorded word',async()=>{
  const cue=journeySteps.K1.cues.find(cue=>cue.id==='K1-explain')!,asset=realWordManifest.clips.find(clip=>clip.cueId===cue.id)!;
  expect(asset.text).toBe(cue.narration);
  const timeline=validateNarrationTimeline(realK1Words,asset,await sha(cue.narration))!;
  expect(timeline).toBeDefined();expect(timeline.timingLevel).toBe('word');
  const boundary=narrationPhraseBindings(cue.id,cue.narration).find(phrase=>phrase.token==='评估文件记述一六四五年')!;
  const nextIndex=timeline.words!.findIndex(word=>word.textStart===boundary.textStart),previous=timeline.words![nextIndex-1],next=timeline.words![nextIndex];
  expect(previous.text).toBe('。');expect(previous.textEnd).toBe(boundary.textStart);expect(next.start-previous.end).toBeGreaterThan(.3);
  const times=[previous.end,previous.end+(next.start-previous.end)*.5,next.start-1e-6];
  let held:number|undefined;
  for(const seconds of times){
   const timing=narrationTimingAt(cue.narration,seconds,timeline.duration,timeline),guide=narrationPhraseGuide(cue.id,cue.narration,seconds/timeline.duration,timing)!;
   expect(timing.spokenText).toBe(previous.text);expect(timing.activeTextStart).toBe(previous.textStart);expect(timing.activeTextEnd).toBe(previous.textEnd);
   expect(timing.caption).toBe('需要分别认识。');expect(timing.textEnd).toBe(boundary.textStart);expect(timing.textProgress*cue.narration.length).toBeLessThan(boundary.textStart);
   expect(guide.sceneSettings?.selected).toBe('palace-red');if(held!==undefined)expect(timing.textProgress).toBe(held);held=timing.textProgress;
  }
  const firstSpoken=narrationTimingAt(cue.narration,next.start,timeline.duration,timeline),firstGuide=narrationPhraseGuide(cue.id,cue.narration,.01,firstSpoken)!;
  expect(firstSpoken.spokenText).toBe('评');expect(firstSpoken.caption).toContain('评估文件');expect(firstGuide.phraseId).toBe(boundary.phraseId);expect(firstGuide.sceneSettings?.selected).toBe('palace-white');
  const rewound=narrationTimingAt(cue.narration,times[1],timeline.duration,timeline);expect(rewound.textProgress).toBe(held);expect(rewound.caption).toBe('需要分别认识。');
  const tail=timeline.words!.at(-1)!,beforeEnded=narrationTimingAt(cue.narration,Math.max(tail.end,timeline.duration-1e-6),timeline.duration,timeline);
  expect(beforeEnded.textProgress).toBeLessThan(1);expect(beforeEnded.activeTextStart).toBe(tail.textStart);expect(beforeEnded.activeTextEnd).toBe(tail.textEnd);
  const ended=narrationTimingAt(cue.narration,timeline.duration,timeline.duration,timeline);expect(ended.textProgress).toBe(1);expect(ended.caption).toBe(beforeEnded.caption);expect(ended.spokenText).toBe(tail.text);
 });
 it('validates all word and parent bindings, original coverage, non-overlap and duration limits',async()=>{
  const {value,asset:wordAsset}=wordFixture(),wordSha=await sha(wordText);value.textSha256=wordSha;
  expect(validateNarrationTimeline(value,wordAsset,wordSha)).toEqual(value);
  const words=value.words!;
  const invalid:Partial<NarrationTimeline>[]=[
   {words:undefined},{words:[]},{timingLevel:'sentence'},{audioSha256:'e'.repeat(64)},{textSha256:'e'.repeat(64)},{voice:'other'},{model:'other'},
   {words:[{...words[0],start:-.01},...words.slice(1)]},
   {words:[words[0],{...words[1],start:1.29},...words.slice(2)]},
   {words:[{...words[0],end:words[0].start},...words.slice(1)]},
   {words:[{...words[0],text:'湖泊'},...words.slice(1)]},
   {words:[{...words[0],textStart:.5},...words.slice(1)]},
   {words:[{...words[0],textEnd:Infinity},...words.slice(1)]},
   {words:[...words.slice(1)]},
   {words:[...words.slice(0,-1),{...words.at(-1)!,end:14.13}]},
   {words:[words[0],words[0],...words.slice(1)]},
   {cues:[{...value.cues[0],start:.5}]},
  ];
  for(const patch of invalid)expect(validateNarrationTimeline({...value,...patch},wordAsset,wordSha),JSON.stringify(patch)).toBeUndefined();
 });
 it('keeps UTF-16 ranges exact for rare Chinese, emoji, quotes and numbers; punctuation gaps are allowed but missing spoken characters are not',async()=>{
  const complex='“𠮷地🙂”海拔4.5千米；水汽，仍需冷却。';
  let offset=0;
  const words=Array.from(complex).map((part,index)=>{const textStart=offset;offset+=part.length;return {start:.2+index*.2,end:.3+index*.2,text:part,textStart,textEnd:offset};});
  const complexAsset={...asset,text:complex,duration:8},textSha256=await sha(complex);
  const value:NarrationTimeline={...timeline(),textSha256,duration:8,timingLevel:'word',cues:[{start:.1,end:7.5,text:complex,textStart:0,textEnd:complex.length}],words};
  expect(validateNarrationTimeline(value,complexAsset,textSha256)).toEqual(value);
  for(const word of words)expect(complex.slice(word.textStart,word.textEnd)).toBe(word.text);
  const emoji=words.findIndex(word=>word.text==='🙂'),rare=words.findIndex(word=>word.text==='𠮷');
  const cut=words.map((word,index)=>index===rare?{...word,text:complex.slice(word.textStart,word.textStart+1),textEnd:word.textStart+1}:word);
  expect(validateNarrationTimeline({...value,words:cut},complexAsset,textSha256)).toBeUndefined();
  const punctuationOmitted=words.filter(word=>!/[\p{P}\p{S}]/u.test(word.text));
  expect(validateNarrationTimeline({...value,words:punctuationOmitted},complexAsset,textSha256)).toBeDefined();
  expect(validateNarrationTimeline({...value,words:punctuationOmitted.filter(word=>word.text!=='水')},complexAsset,textSha256)).toBeUndefined();
  const emojiTime=words[emoji].start,caption=narrationTimingAt(complex,emojiTime,8,value);
  expect(caption.spokenText).toBe('🙂');expect(complex.slice(caption.textStart,caption.textEnd)).toBe(caption.caption);
 });
 it('keeps long unpunctuated captions readable while every caption retains its exact original range',()=>{
  const complex='同一地球上海洋储存水和热量大陆有山地平原与河流空气包围地表并把热量水汽带向不同地区随后再走向亚洲中国和西藏自治区';
  let offset=0;
  const words=Array.from(complex).map((part,index)=>{const textStart=offset;offset+=part.length;return {start:index*.2,end:index*.2+.1,text:part,textStart,textEnd:offset};});
  const value:NarrationTimeline={...timeline(),duration:20,timingLevel:'word',cues:[{start:0,end:19,text:complex,textStart:0,textEnd:complex.length}],words};
  const captions=new Set<string>();
  for(const word of words){const current=narrationTimingAt(complex,word.start,20,value);expect(complex.slice(current.textStart,current.textEnd)).toBe(current.caption);expect(Array.from(current.caption).length).toBeLessThanOrEqual(42);captions.add(current.caption);}
  expect(captions.size).toBeGreaterThan(1);
 });
 it('can wrap a single long source token without losing later text or inventing an extra provider word',()=>{
  const complex='同一片地表上的海洋陆地空气冰雪与植物相互联系水分通过蒸发进入空气并且随风移动在合适条件下湿空气上升冷却才可能凝结成云';
  const value:NarrationTimeline={...timeline(),duration:10,timingLevel:'word',cues:[{start:0,end:10,text:complex,textStart:0,textEnd:complex.length}],words:[{start:1,end:9,text:complex,textStart:0,textEnd:complex.length}]};
  const start=narrationTimingAt(complex,1,10,value),end=narrationTimingAt(complex,8.9,10,value);
  expect(start.textStart).toBe(0);expect(end.textStart).toBeGreaterThan(0);expect(end.textEnd).toBe(complex.length);
  expect(end).toMatchObject({activeTextStart:0,activeTextEnd:complex.length,timingLevel:'word'});
 });
 it('uses word timing only for the same recording and scene position, and preserves legacy sentence and estimated modes',()=>{
  const {value}=wordFixture(),native=narrationTimingAt(wordText,4.3,14,value),audio={cue:{id:'G1-observe',text:wordText},progress:4.3/14,timing:native};
  expect(narrationTimingForPlayback(wordText,4.3/14,audio,'G1-observe')).toBe(native);
  expect(narrationTimingForPlayback(wordText,.8,audio,'G1-observe').timingLevel).toBe('estimated');
  expect(narrationTimingForPlayback(wordText,4.3/14,audio,'other').precision).toBe('estimated');
  expect(narrationTimingAt(text,6,10,timeline()).timingLevel).toBe('sentence');
  expect(narrationTimingAt(text,6,10).timingLevel).toBe('estimated');
 });
});
