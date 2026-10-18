import type {NarrationState} from '../lib/narration';
import './NarrationAlignmentNotice.css';

/** Manual reading before a recording starts is not an alignment failure. */
export function narrationAlignmentUnavailable(audio:Pick<NarrationState,'status'|'cue'|'timing'|'error'>):boolean{
 return Boolean(!audio.error&&audio.cue&&['playing','paused','ended'].includes(audio.status)&&audio.timing?.precision==='estimated');
}
export default function NarrationAlignmentNotice({unavailable}:{unavailable:boolean}){
 return unavailable?<p className="narration-alignment-notice" role="status">逐字同步资料暂不可用，文字与演示暂按录音进度估算。</p>:null;
}
