import type {Exploration} from './store';
export interface ObservationOrigin {
 programId:string;beatId:string;recordingId:string;text:string;raw:number;voice:boolean;
 title:string;question:string;sources:{title:string;url:string;note?:string}[];
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const safeUrl=(v:unknown):v is string=>typeof v==='string'&&v.length<2048&&(/^https:\/\//.test(v)||/^\/(?!\/)/.test(v));
export function sanitizeObservationOrigins(value:unknown):Record<string,ObservationOrigin>{
 if(!record(value))return {};
 return Object.fromEntries(Object.entries(value).slice(0,40).flatMap(([id,v])=>{
  if(!record(v)||!['programId','beatId','recordingId','text','title','question'].every(k=>typeof v[k]==='string')||!Number.isFinite(v.raw))return [];
  const sources=Array.isArray(v.sources)?v.sources.slice(0,30).flatMap(s=>record(s)&&typeof s.title==='string'&&safeUrl(s.url)?[{title:s.title.slice(0,300),url:s.url,...(typeof s.note==='string'?{note:s.note.slice(0,1000)}:{})}]:[]):[];
  return [[id,{programId:String(v.programId).slice(0,100),beatId:String(v.beatId).slice(0,120),recordingId:String(v.recordingId).slice(0,120),text:String(v.text).slice(0,10000),title:String(v.title).slice(0,300),question:String(v.question).slice(0,1500),raw:Math.max(0,Math.min(1,Number(v.raw))),voice:v.voice!==false,sources}]];
 }));
}
/** Existing user order and notes win, including intentionally blank notes. */
export function appendOverviewObservation(previous:Exploration,stopId:string,origin:ObservationOrigin):Exploration{
 return {...previous,route:[...new Set([...previous.route,stopId])],stopNotes:{...previous.stopNotes,...(!Object.hasOwn(previous.stopNotes,stopId)?{[stopId]:origin.question}:{})},overviewObservations:{...previous.overviewObservations,[stopId]:origin}};
}
export const observationReturnHash=(stopId:string)=>`/overview?returnStop=${encodeURIComponent(stopId)}`;
