import {routePilotCues,pilotScriptVersions,pilotNarratedView} from '../data/routePilot';
import type {PilotView} from '../data/routePilot';
import {lulangFootage} from '../data/lulangFootage';
import {lulangLifePhotos} from '../data/lulangLife';
export const PILOT_POSITION_KEY='tibet-explorer.route-g318.position.v1';
export const PILOT_NOTE_KEY='tibet-explorer.route-g318.observation.v1';
export type PilotReturn={beatIndex:number;raw:number;voice:boolean;view:PilotView;scriptVersion?:string};
export type PilotNote={version:1;note:string;returnTo?:PilotReturn;lineReturn?:PilotReturn;skipPlaceOnce?:boolean};
const clamp=(n:unknown,a=0,b=1)=>typeof n==='number'&&Number.isFinite(n)?Math.max(a,Math.min(b,n)):a;
function cameraSnapshot(view:any):Partial<PilotView>{
 const result:Partial<PilotView>={};
 for(const [key,min,max] of [['cameraPitch',20,82],['cameraBearing',-180,180],['mapZoom',.15,2],['mapFocus',0,1],['mapFocusWeight',0,1]] as const){if(typeof view[key]==='number'&&Number.isFinite(view[key]))result[key]=clamp(view[key],min,max);}
 if(typeof view.elevation==='boolean')result.elevation=view.elevation;
 return result;
}
function mediaSnapshot(view:any):Partial<PilotView>{
 return {...(Object.hasOwn(lulangLifePhotos,view.placePhoto)?{placePhoto:view.placePhoto}:{}),...(Object.hasOwn(lulangLifePhotos,view.photoOverlay)?{photoOverlay:view.photoOverlay}:{}),...(typeof view.photoReveal==='number'?{photoReveal:clamp(view.photoReveal)}:{}),placeMedia:['map','town','process','daily','record'].includes(view.placeMedia)?view.placeMedia:'map',...(lulangFootage.some(f=>f.id===view.footageId)?{footageId:view.footageId}:{}),photoFocus:Math.trunc(clamp(view.photoFocus??0,0,3)),cookingProgress:clamp(view.cookingProgress??0),...(['making','supply','service'].includes(view.lifePhase)?{lifePhase:view.lifePhase}:{})};
}
function snapshot(v:any):PilotReturn|undefined{
 if(!v||!Number.isInteger(v.beatIndex)||v.beatIndex<0||v.beatIndex>=routePilotCues.length||!v.view||!['whole','line','place'].includes(v.view.mode))return;
 if(v.beatIndex===2&&v.scriptVersion!==pilotScriptVersions[2])return {beatIndex:2,raw:0,voice:v.voice!==false,scriptVersion:pilotScriptVersions[2],view:pilotNarratedView(2,routePilotCues[2].narration,0)};
 return {beatIndex:v.beatIndex,raw:clamp(v.raw),voice:v.voice!==false,scriptVersion:pilotScriptVersions[v.beatIndex],view:{mode:v.view.mode,progress:clamp(v.view.progress),height:clamp(v.view.height,2500,6500),connections:v.view.connections===true,lookBack:v.view.lookBack===true,...cameraSnapshot(v.view),...(v.view.mode==='place'?{...mediaSnapshot(v.view),connectionProgress:clamp(v.view.connectionProgress??(v.view.connections?1:0)),placeLens:['landscape','life','culture'].includes(v.view.placeLens)?v.view.placeLens:'life',sectionProgress:clamp(v.view.sectionProgress??.5),serviceFilter:['all','food','lodging'].includes(v.view.serviceFilter)?v.view.serviceFilter:'all',servicesVisible:v.view.servicesVisible!==false,cultureProgress:clamp(v.view.cultureProgress??pilotNarratedView(2,routePilotCues[2].narration,0).cultureProgress),cultureSupply:v.view.cultureSupply!==false,cultureSample:Math.trunc(clamp(v.view.cultureSample??0,0,2))}:{})}};
}
export function readPilotNote():PilotNote{
 try{const v=JSON.parse(localStorage.getItem(PILOT_NOTE_KEY)||'null');return {version:1,note:typeof v?.note==='string'?v.note.slice(0,2000):'',returnTo:snapshot(v?.returnTo),lineReturn:snapshot(v?.lineReturn),skipPlaceOnce:v?.skipPlaceOnce===true};}catch{return {version:1,note:''};}
}
export function writePilotNote(note:PilotNote){try{localStorage.setItem(PILOT_NOTE_KEY,JSON.stringify(note));return true;}catch{return false;}}
