import type {NarrationState} from './narration';
import type {NarrationTiming} from './narrationTiming';
import {cityLifeSceneToAudio,type CityLifeAudioSegment} from './cityLifeAudio';

type CityReadingPlayback={
 progress:number;playing:boolean;currentSentence:string;narrationTiming?:NarrationTiming;
 audio?:Pick<NarrationState,'status'|'error'|'cue'|'progress'>;
 relief?:boolean;services?:boolean;transfer?:boolean;built?:boolean;
};

/** Pausing or returning from a review retains an exact recorded word, not an
 * estimated caption or a subtitle left over from a different clip/seek. */
export function cityReadingCaption(director:CityReadingPlayback,segments:readonly CityLifeAudioSegment[]):string|undefined{
 if(director.audio?.error||director.audio?.status==='error'||director.relief===false||director.services===false||director.transfer===false||director.built===false)return;
 const text=director.currentSentence,timing=director.narrationTiming;
 if(!text)return;
 // Older callers without timing keep their existing live-playback behaviour.
 if(!timing)return director.playing?text:undefined;
 const source=cityLifeSceneToAudio(segments,director.progress);
 if(!source||timing.caption!==text||!Number.isInteger(timing.textStart)||!Number.isInteger(timing.textEnd)||timing.textStart<0||timing.textEnd<=timing.textStart||timing.textEnd>source.segment.text.length||source.segment.text.slice(timing.textStart,timing.textEnd)!==text)return;
 const audio=director.audio;
 if(audio?.cue&&(audio.cue.id!==source.segment.id||audio.cue.text!==source.segment.text||Math.abs(audio.progress-source.fraction)>=.025))return;
 if(director.playing)return text;
 const start=timing.activeTextStart,end=timing.activeTextEnd;
 if(timing.precision!=='provider'||timing.timingLevel!=='word'||start===undefined||end===undefined||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>source.segment.text.length||end<=start||end<=timing.textStart||start>=timing.textEnd||source.segment.text.slice(start,end)!==timing.spokenText)return;
 return text;
}

/** Changed conditions and audio failures take priority over a retained word. */
export function cityReadingInterruption(director:Pick<CityReadingPlayback,'audio'|'relief'>):string|undefined{
 if(director.audio?.error)return director.audio.error;
 if(director.audio?.status==='error')return '讲解暂时中断。请重试这段录音，再继续对应的演示。';
 if(director.relief===false)return '教学压平后，坡谷高差暂时消失。切回真实起伏，对照同一地点；这是保留原始高程读数的教学操作。';
}
