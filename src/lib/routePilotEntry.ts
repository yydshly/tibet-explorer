import {routePilotCues,routePilotPath} from '../data/routePilot';
import {PILOT_POSITION_KEY,readPilotNote} from './routePilotStore';
export const pilotStartPath=routePilotPath+'?start=1';
export function readPilotEntry(){
 const note=readPilotNote();
 try{
  const position=JSON.parse(localStorage.getItem(PILOT_POSITION_KEY)||'null');
  const index=routePilotCues.findIndex(c=>c.id===position?.beatId&&c.id===position.recordingId&&c.narration===position.text);
  if(index>=0&&typeof position.raw==='number'&&Number.isFinite(position.raw)&&(position.raw>0||index>0||note.returnTo))return {beatIndex:index,title:routePilotCues[index].title,raw:Math.max(0,Math.min(1,position.raw)),hasObservation:!!note.returnTo};
 }catch{/* An unavailable cursor never blocks starting the route. */}
 if(note.returnTo)return {beatIndex:note.returnTo.beatIndex,title:routePilotCues[note.returnTo.beatIndex].title,raw:note.returnTo.raw,hasObservation:true};
}
