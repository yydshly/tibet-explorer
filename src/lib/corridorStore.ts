import {type CorridorView} from '../data/corridorJourney';
import {validBomiView} from './bomiReturn';
import {isLulangDisplayPhoto} from '../data/lulangLife';
export const corridorNoteKey='tibet-explorer.corridor-note.v1';
export type CorridorSnapshot={beatIndex:number;raw:number;view:CorridorView};
export type CorridorNote={version:1;text:string;observation?:string;observationView?:CorridorView;returnPending?:boolean;returnTo?:CorridorSnapshot;lineReturn?:CorridorSnapshot};
const unit=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
export function validCorridorView(v:unknown):v is CorridorView{
 if(!v||typeof v!=='object')return false;const x=v as CorridorView;
 if(x.kind==='overview')return Number.isInteger(x.focus)&&x.focus>=-1&&x.focus<=4&&unit(x.read)&&typeof x.overhead==='boolean';
 if(x.kind==='bomi')return validBomiView(x.value);
 if(x.kind==='tongmai')return ['travel','rivers','archive','bridge','tunnel','whole'].includes(x.value?.phase)&&unit(x.value.progress)&&unit(x.value.read)&&typeof x.value.overhead==='boolean'&&['both','river','bridge','tunnel'].includes(x.value.focus)&&[0,1,2].includes(x.object);
 if(x.kind==='pilot'){const p=x.value;return !!p&&['whole','line','place'].includes(p.mode)&&unit(p.progress)&&Number.isFinite(p.height)&&p.height>0&&p.height<10000&&typeof p.lookBack==='boolean'&&typeof p.connections==='boolean'&&(!p.placePhoto||isLulangDisplayPhoto(p.placePhoto))&&(!p.photoOverlay||isLulangDisplayPhoto(p.photoOverlay))&&(!p.placeMedia||['map','town','daily'].includes(p.placeMedia))&&Object.values(p).every(y=>typeof y!=='number'||Number.isFinite(y));}
 return false;
}
export function validCorridorSnapshot(v:unknown):v is CorridorSnapshot{if(!v||typeof v!=='object')return false;const x=v as CorridorSnapshot;return Number.isInteger(x.beatIndex)&&x.beatIndex>=0&&x.beatIndex<=8&&unit(x.raw)&&validCorridorView(x.view);}
export function readCorridorNote():CorridorNote{try{const x=JSON.parse(localStorage.getItem(corridorNoteKey)||'null');if(x?.version===1)return {version:1,text:typeof x.text==='string'?x.text.slice(0,4000):'',observation:typeof x.observation==='string'?x.observation:undefined,returnPending:x.returnPending===true,observationView:validCorridorView(x.observationView)?x.observationView:undefined,returnTo:validCorridorSnapshot(x.returnTo)?x.returnTo:undefined,lineReturn:validCorridorSnapshot(x.lineReturn)?x.lineReturn:undefined};}catch{/* An unavailable store cannot block watching. */}return {version:1,text:''};}
export function writeCorridorNote(x:CorridorNote){try{localStorage.setItem(corridorNoteKey,JSON.stringify(x));return true;}catch{return false;}}
