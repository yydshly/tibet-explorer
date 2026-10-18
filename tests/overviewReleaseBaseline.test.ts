// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node is test-only.
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {overviewMainProgram} from '../src/data/overviewProgram';
import baseline from '../public/project-review/release-baseline.json';
import manifest from '../public/assets/audio/narration/cue-manifest.json';

it('freezes the approved six chapters, exact recordings and total duration independently of local replacements',()=>{
 expect(overviewMainProgram.chapters.map(c=>({id:c.id,title:c.title,beats:c.beats.map(b=>b.id)}))).toEqual(baseline.chapters);
 expect(overviewMainProgram.beats).toHaveLength(baseline.beatCount);
 const actual=overviewMainProgram.beats.map(b=>{
  const clip=manifest.clips.find(c=>c.cueId===b.recordingId&&c.text===b.text)!;
  expect(clip).toBeDefined();expect(clip.timingLevel).toBe('word');
  const subtitleHash=createHash('sha256').update(readFileSync(`public${clip.subtitleUrl}`)).digest('hex');
  expect(subtitleHash).toBe(clip.subtitleSha256);
  return {beatId:b.id,recordingId:b.recordingId,duration:clip.duration,textSha256:createHash('sha256').update(b.text).digest('hex'),subtitleSha256:subtitleHash};
 });
 expect(actual).toEqual(baseline.clips);
 expect(actual.reduce((s,b)=>s+b.duration,0)).toBeCloseTo(baseline.seconds,6);
});
