import {splitNarrationSentences} from './narrationSentence';

/** Provider times belong to this exact recording; text offsets use UTF-16. */
export interface NarrationTimedCue {start:number;end:number;text:string;textStart:number;textEnd:number}
export interface NarrationTimeline {
 version:1;source:'MiniMax';audioSha256:string;textSha256:string;model:string;voice:string;duration:number;cues:NarrationTimedCue[];
 timingLevel?:'sentence'|'word';words?:NarrationTimedCue[];
}
export interface NarrationTiming {
 caption:string;spokenText:string;textStart:number;textEnd:number;textProgress:number;precision:'provider'|'estimated';
 timingLevel?:'sentence'|'word'|'estimated';
 /** Actual provider word, retained through its following pause until the next
  * word starts. Caption-relative highlighting must intersect this source span. */
 activeTextStart?:number;activeTextEnd?:number;
}
export interface TimingPlayback {
 cue:{id:string;text:string}|null;progress:number;timing?:NarrationTiming;
}
const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

export function estimatedNarrationTiming(text:string,fraction:number):NarrationTiming {
 const progress=clamp(fraction),parts=splitNarrationSentences(text),weights=parts.map(part=>Array.from(part).filter(char=>!/\s/u.test(char)).length),total=weights.reduce((sum,value)=>sum+value,0);
 let cursor=0,cumulative=0;
 for(let index=0;index<parts.length;index++){
  const caption=parts[index],textStart=Math.max(cursor,text.indexOf(caption,cursor));cumulative+=weights[index];
  if(progress<cumulative/total||index===parts.length-1)return {caption,spokenText:caption,textStart,textEnd:textStart+caption.length,textProgress:progress,precision:'estimated',timingLevel:'estimated'};
  cursor=textStart+caption.length;
 }
 return {caption:'',spokenText:'',textStart:0,textEnd:0,textProgress:progress,precision:'estimated',timingLevel:'estimated'};
}

type CaptionRange={text:string;textStart:number;textEnd:number};
const wordCaptions=new WeakMap<NarrationTimeline,{text:string;ranges:CaptionRange[]}>();
function captionRanges(text:string,timeline:NarrationTimeline):CaptionRange[]{
 const cached=wordCaptions.get(timeline);if(cached?.text===text)return cached.ranges;
 let cursor=0;
 const ranges=splitNarrationSentences(text).map(part=>{
  const textStart=text.indexOf(part,cursor),textEnd=textStart+part.length;cursor=textEnd;
  return {text:part,textStart,textEnd};
 });
 wordCaptions.set(timeline,{text,ranges});return ranges;
}
function lastStarted<T>(items:readonly T[],value:number,start:(item:T)=>number):number{
 let low=0,high=items.length-1,result=-1;
 while(low<=high){const mid=(low+high)>>>1;if(start(items[mid])<=value){result=mid;low=mid+1;}else high=mid-1;}
 return result;
}

/** The media time selects real word ranges, including silent gaps. Only motion
 * inside a word is interpolated; readable captions retain original text ranges.
 * Legacy sentence-only timelines still estimate motion inside each sentence. */
export function narrationTimingAt(text:string,seconds:number,duration:number,timeline?:NarrationTimeline):NarrationTiming {
 if(!timeline?.cues.length)return estimatedNarrationTiming(text,duration>0?seconds/duration:0);
 const time=Number.isFinite(seconds)?Math.max(0,seconds):0;
 const words=timeline.timingLevel==='word'?timeline.words:undefined;
 if(words?.length){
  const index=lastStarted(words,time,word=>word.start);
  if(index<0)return {caption:'',spokenText:'',textStart:0,textEnd:0,textProgress:0,precision:'provider',timingLevel:'word'};
  const word=words[index],part=clamp((time-word.start)/(word.end-word.start));
  // Text ends are exclusive. During the pause after a word, using its exact
  // textEnd would select the next semantic phrase while that phrase is still
  // silent. Keep the reading just inside the actual last word; only the next
  // real word start, or the recording's ended position, crosses the boundary.
  const position=time>=timeline.duration?text.length:part>=1?word.textEnd-1e-7:word.textStart+(word.textEnd-word.textStart)*part;
  const captionPosition=part>=1?word.textEnd-1e-7:position;
  const ranges=captionRanges(text,timeline),range=ranges[Math.max(0,lastStarted(ranges,captionPosition,range=>range.textStart))];
  return {caption:range?.text??word.text,spokenText:word.text,textStart:range?.textStart??word.textStart,textEnd:range?.textEnd??word.textEnd,
   textProgress:clamp(position/Math.max(1,text.length)),precision:'provider',timingLevel:'word',activeTextStart:word.textStart,activeTextEnd:word.textEnd};
 }
 const index=lastStarted(timeline.cues,time,cue=>cue.start);
 if(index<0)return {caption:'',spokenText:'',textStart:0,textEnd:0,textProgress:0,precision:'provider',timingLevel:'sentence'};
 const cue=timeline.cues[index],part=clamp((time-cue.start)/Math.max(.001,cue.end-cue.start));
 return {caption:cue.text,spokenText:cue.text,textStart:cue.textStart,textEnd:cue.textEnd,
  textProgress:clamp((cue.textStart+(cue.textEnd-cue.textStart)*part)/Math.max(1,text.length)),precision:'provider',timingLevel:'sentence'};
}

/** Manual scene seeks must never display a stale sentence from another clip. */
export function narrationTimingForPlayback(text:string,fraction:number,audio:TimingPlayback,cueId:string):NarrationTiming {
 return audio.cue?.id===cueId&&audio.cue.text===text&&audio.timing&&Math.abs(audio.progress-clamp(fraction))<.025
  ?audio.timing:estimatedNarrationTiming(text,fraction);
}

type TimelineAsset={text:string;duration:number;model:string;voice?:string;sha256?:string;subtitleUrl?:string;subtitleSha256?:string};
const timelines=new Map<string,Promise<NarrationTimeline|undefined>>();
const hash=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
const speakable=(text:string)=>text.replace(/[\s\p{P}\p{S}]/gu,'');
const isTextBoundary=(text:string,index:number)=>!(index>0&&index<text.length&&/[\uD800-\uDBFF]/.test(text[index-1])&&/[\uDC00-\uDFFF]/.test(text[index]));
export function validateNarrationTimeline(value:unknown,asset:TimelineAsset,textSha256:string):NarrationTimeline|undefined {
 if(!value||typeof value!=='object'||!asset.sha256||!Number.isFinite(asset.duration)||asset.duration<=0)return undefined;
 const v=value as Partial<NarrationTimeline>;
 if(v.version!==1||v.source!=='MiniMax'||v.audioSha256!==asset.sha256||v.textSha256!==textSha256||v.model!==asset.model||asset.voice&&v.voice!==asset.voice||!Array.isArray(v.cues)||!v.cues.length||v.cues.length>2000||!Number.isFinite(v.duration)||Math.abs(v.duration!-asset.duration)>.05||v.timingLevel!==undefined&&v.timingLevel!=='sentence'&&v.timingLevel!=='word')return undefined;
 let end=0,textEnd=0;
 for(const cue of v.cues){
  if(!cue||!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.start<0||cue.start<end-.001||cue.end<=cue.start||cue.end>asset.duration+.12||!Number.isInteger(cue.textStart)||!Number.isInteger(cue.textEnd)||cue.textStart<textEnd||cue.textEnd<=cue.textStart||cue.textEnd>asset.text.length||!isTextBoundary(asset.text,cue.textStart)||!isTextBoundary(asset.text,cue.textEnd)||cue.text!==asset.text.slice(cue.textStart,cue.textEnd))return undefined;
  if(speakable(asset.text.slice(textEnd,cue.textStart)))return undefined;
  end=cue.end;textEnd=cue.textEnd;
 }
 if(speakable(asset.text.slice(textEnd)))return undefined;
 if(v.timingLevel==='word'){
  if(!Array.isArray(v.words)||!v.words.length||v.words.length>20000)return undefined;
  let wordEnd=0,wordTextEnd=0,cueIndex=0;
  for(const word of v.words){
   if(!word||!Number.isFinite(word.start)||!Number.isFinite(word.end)||word.start<0||word.start<wordEnd-1e-9||word.end<=word.start||word.end>asset.duration+.12||!Number.isInteger(word.textStart)||!Number.isInteger(word.textEnd)||word.textStart<wordTextEnd||word.textEnd<=word.textStart||word.textEnd>asset.text.length||!isTextBoundary(asset.text,word.textStart)||!isTextBoundary(asset.text,word.textEnd)||word.text!==asset.text.slice(word.textStart,word.textEnd)||speakable(asset.text.slice(wordTextEnd,word.textStart)))return undefined;
   while(cueIndex<v.cues.length&&v.cues[cueIndex].textEnd<=word.textStart)cueIndex++;
   const cue=v.cues[cueIndex];
   if(!cue||word.textStart<cue.textStart||word.textEnd>cue.textEnd||word.start<cue.start-.001||word.end>cue.end+.001)return undefined;
   wordEnd=word.end;wordTextEnd=word.textEnd;
  }
  if(speakable(asset.text.slice(wordTextEnd)))return undefined;
 }else if(v.words!==undefined)return undefined;
 return v as NarrationTimeline;
}
export function refreshNarrationTimelines(){timelines.clear();}
export async function getNarrationTimeline(asset:TimelineAsset):Promise<NarrationTimeline|undefined>{
 const url=asset.subtitleUrl;
 const base=import.meta.env.BASE_URL;
 const canonicalUrl=url&&base!=='/'&&url.startsWith(base)?`/${url.slice(base.length)}`:url;
 if(!url||!canonicalUrl||!/^\/assets\/audio\/narration\/[a-zA-Z0-9._-]+\.json$/.test(canonicalUrl)||!asset.sha256)return undefined;
 const key=JSON.stringify([url,asset.subtitleSha256,asset.sha256,asset.text,asset.duration,asset.model,asset.voice]);
 let pending=timelines.get(key);
 if(!pending){pending=(async()=>{
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
   if(!response.ok||Number(response.headers?.get('content-length')||0)>262144)return undefined;
   const raw=await response.text();if(new TextEncoder().encode(raw).byteLength>262144)return undefined;
   if(asset.subtitleSha256&&await hash(raw)!==asset.subtitleSha256)return undefined;
   return validateNarrationTimeline(JSON.parse(raw),asset,await hash(asset.text));
  }catch{return undefined;}
 })();timelines.set(key,pending);}
 const value=await pending;if(!value)timelines.delete(key);return value;
}
