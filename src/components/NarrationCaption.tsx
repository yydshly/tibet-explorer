import type {NarrationTiming} from '../lib/narrationTiming';
import './NarrationCaption.css';

type CaptionTiming=NarrationTiming&{activeTextStart?:number;activeTextEnd?:number};
/** Only a word supplied by the recording's own timing may receive emphasis. */
export default function NarrationCaption({text,timing}:{text:string;timing?:CaptionTiming}){
 const offset=timing?.caption?text.indexOf(timing.caption):-1;
 const start=timing?.activeTextStart,end=timing?.activeTextEnd;
 if(timing?.precision!=='provider'||offset<0||start===undefined||end===undefined||end<=timing.textStart||start>=timing.textEnd||end<=start)return <span aria-live="off" className="narration-caption-text">{text}</span>;
 const a=offset+Math.max(start,timing.textStart)-timing.textStart,b=offset+Math.min(end,timing.textEnd)-timing.textStart;
 return <span aria-live="off" className="narration-caption-text" data-alignment="recording-word">{text.slice(0,a)}<mark>{text.slice(a,b)}</mark>{text.slice(b)}</span>;
}
