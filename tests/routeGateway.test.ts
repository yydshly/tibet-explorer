import {describe,it,expect,vi} from 'vitest';
// @ts-expect-error Node belongs to the runner.
import {readFileSync} from 'node:fs';
import {gatewayNarrationCue,gatewayNarratedRoute} from '../src/data/routeGatewayNarration';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {readPilotEntry} from '../src/lib/routePilotEntry';
import {routePilotCues} from '../src/data/routePilot';
import {PILOT_POSITION_KEY,PILOT_NOTE_KEY} from '../src/lib/routePilotStore';
describe('route orientation and deliberate entry',()=>{
 it('selects the narrated corridor from the native word timeline, then comes back to the implemented pilot',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8')),clip=manifest.clips.find((c:any)=>c.cueId===gatewayNarrationCue.id);
  expect(clip.text).toBe(gatewayNarrationCue.narration);expect(clip.timingLevel).toBe('word');const timeline=JSON.parse(readFileSync('public'+clip.subtitleUrl,'utf8'));
  for(const [token,id] of [['川藏南线向西','g318'],['川藏北线','g317'],['青藏线','g109'],['经典新藏线','g219'],['滇藏线','g214'],['这一版先研究','g318']]){
   const at=clip.text.indexOf(token),word=timeline.words.find((w:any)=>w.textStart>=at);expect(word).toBeDefined();const timing=narrationTimingAt(clip.text,word.start+.005,clip.duration,timeline);expect(gatewayNarratedRoute(timing.textProgress)).toBe(id);
  }
 });
 it('ignores corrupt or obsolete saved narration and only offers a compatible resume',()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null});
  try{
   values.set(PILOT_POSITION_KEY,'{bad');expect(readPilotEntry()).toBeUndefined();
   values.set(PILOT_POSITION_KEY,JSON.stringify({beatId:routePilotCues[1].id,recordingId:routePilotCues[1].id,text:'old',raw:.5}));expect(readPilotEntry()).toBeUndefined();
   values.set(PILOT_POSITION_KEY,JSON.stringify({beatId:routePilotCues[1].id,recordingId:routePilotCues[1].id,text:routePilotCues[1].narration,raw:.43}));expect(readPilotEntry()).toMatchObject({beatIndex:1,raw:.43,hasObservation:false});
   values.set(PILOT_NOTE_KEY,JSON.stringify({returnTo:{beatIndex:1,raw:.43,voice:true,view:{mode:'line',height:3000,progress:.6}}}));expect(readPilotEntry()?.hasObservation).toBe(true);
  }finally{vi.unstubAllGlobals();}
 });
});
