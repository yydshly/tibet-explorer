// @ts-expect-error Audit artifacts are written only by the Node test runner.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {overviewMainProgram} from '../src/data/overviewProgram';
it('exports every main recording and native source for the geography screen audit',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
 const clips=overviewMainProgram.chapters.flatMap(chapter=>chapter.beats.map(beat=>{
  const clip=manifest.clips.find((c:{cueId:string})=>c.cueId===beat.recordingId);
  expect(clip.text).toBe(beat.text);
  return {chapter:chapter.title,id:beat.id,recordingId:beat.recordingId,title:beat.title,text:beat.text,duration:clip.duration,subtitleUrl:clip.subtitleUrl};
 }));
 mkdirSync('qa/narrated-geography-20261017',{recursive:true});
 writeFileSync('qa/narrated-geography-20261017/inventory.json',JSON.stringify(clips,null,2));
 expect(clips.length).toBe(26);
});
