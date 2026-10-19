import {describe,it,expect} from 'vitest';
// @ts-expect-error Node belongs to the runner.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node belongs to the runner.
import {createHash} from 'node:crypto';
import {lulangPhotoReadings,lulangPhotoNarrationCues,lulangPhotoFocus} from '../src/data/lulangPhotoNarration';
import {lulangLifePhotos,type LulangPhotoId} from '../src/data/lulangLife';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {routePilotCues} from '../src/data/routePilot';
describe('optional real-photo voice binding',()=>{
 it('binds every displayed photo to verified audio and native word timing without extending the route beats',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
  expect(Object.keys(lulangPhotoReadings).sort()).toEqual(Object.keys(lulangLifePhotos).sort());
  for(const cue of lulangPhotoNarrationCues){
   const clip=manifest.clips.find((c:any)=>c.cueId===cue.id);expect(clip?.text).toBe(cue.narration);expect(clip.timingLevel).toBe('word');
   expect(createHash('sha256').update(readFileSync('public'+clip.url)).digest('hex')).toBe(clip.sha256);
   const timeline=JSON.parse(readFileSync('public'+clip.subtitleUrl,'utf8'));expect(timeline.audioSha256).toBe(clip.sha256);
   const id=cue.id.replace('ROUTE-PHOTO-','') as LulangPhotoId,reading=lulangPhotoReadings[id];
   for(const [token,focus] of reading.marks){
    const at=reading.narration.indexOf(token);expect(at).toBeGreaterThanOrEqual(0);
    const states=timeline.words.filter((w:any)=>w.textStart>=at&&w.textStart<at+token.length);
    expect(states.length).toBeGreaterThan(0);
    const time=states.at(-1).start+.001,timing=narrationTimingAt(cue.narration,time,clip.duration,timeline);
    expect(lulangPhotoFocus(id,timing.textProgress)).toBe(focus);
   }
  }
  expect(routePilotCues).toHaveLength(4);expect(routePilotCues.some(c=>c.id.startsWith('ROUTE-PHOTO'))).toBe(false);
  expect(routePilotCues.reduce((sum,c)=>sum+manifest.clips.find((a:any)=>a.cueId===c.id).duration,0)).toBeCloseTo(142.560,3);
 });
});
