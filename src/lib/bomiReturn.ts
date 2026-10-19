import {bomiPhaseNames,type BomiView} from '../data/bomiJourney';
export const bomiControlsKey='tibet-explorer.bomi-observation.v1';
export type BomiReturn={beatIndex:number;raw:number;view:BomiView};
export type BomiObservation={version:1;view?:BomiView;lineReturn?:BomiReturn;skipLocal:boolean};
export function validBomiView(v:unknown):v is BomiView{
 if(!v||typeof v!=='object')return false;const x=v as BomiView;
 return Object.hasOwn(bomiPhaseNames,x.phase)&&Number.isFinite(x.progress)&&x.progress>=0&&x.progress<=1&&typeof x.overhead==='boolean'&&['both','river','road','town','mountain'].includes(x.focus)&&[0,1,2].includes(x.photoObject);
}
function validReturn(v:unknown):v is BomiReturn{if(!v||typeof v!=='object')return false;const x=v as BomiReturn;return [0,1,2].includes(x.beatIndex)&&Number.isFinite(x.raw)&&x.raw>=0&&x.raw<=1&&validBomiView(x.view);}
export function readBomiObservation():BomiObservation{
 try{const x=JSON.parse(localStorage.getItem(bomiControlsKey)||'null');if(x?.version===1)return {version:1,view:validBomiView(x.view)?x.view:undefined,lineReturn:validReturn(x.lineReturn)?x.lineReturn:undefined,skipLocal:x.skipLocal===true};}catch{/* No saved observation. */}
 return {version:1,skipLocal:false};
}
export function saveBomiObservation(x:BomiObservation){try{localStorage.setItem(bomiControlsKey,JSON.stringify(x));return true;}catch{return false;}}
