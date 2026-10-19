import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import {normalizeMiniMaxSubtitles} from '../server/minimax-subtitles.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const probe = process.env.FFPROBE_PATH || 'D:/26project/26audio_and_video_project/ffmpeg-n6.1.3-win64-gpl-shared-6.1/bin/ffprobe.exe';
async function content(file) {
  const result = await build({ entryPoints: [path.join(root, file)], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { chapters } = await content('src/data/curriculum.ts'), { getJourneyStep } = await content('src/data/journey.ts');
const { cityLifeNarrationCues } = await content('src/data/cityLifeJourney.ts');
const { cityComparisonNarrationCues } = await content('src/data/cityComparison.ts');
const { climateObservationNarrationCues } = await content('src/data/climateObservationNarration.ts');
const { regionalJourneyNarrationCues } = await content('src/data/regionalJourney.ts');
const { climateLabNarrationCues } = await content('src/data/climateLab.ts');
const { overviewNarrationCues } = await content('src/data/overviewNarration.ts');
const { routePilotCues } = await content('src/data/routePilot.ts');
const { lulangPhotoNarrationCues } = await content('src/data/lulangPhotoNarration.ts');
const { gatewayNarrationCues } = await content('src/data/routeGatewayNarration.ts');
const expected = [...chapters.flatMap(chapter => chapter.steps.flatMap(step => getJourneyStep(step.id).cues)), ...cityLifeNarrationCues, ...cityComparisonNarrationCues,...climateObservationNarrationCues,...regionalJourneyNarrationCues,...overviewNarrationCues,...climateLabNarrationCues,...routePilotCues,...lulangPhotoNarrationCues,...gatewayNarrationCues];
const manifest = JSON.parse(await fs.readFile(path.join(root, 'public/assets/audio/narration/cue-manifest.json'), 'utf8'));
const requireWord=process.argv.includes('--require-word');
const expectedIds=new Set(expected.map(cue=>cue.id)),manifestIds=new Set(manifest.clips.map(clip=>clip.cueId));
const manifestErrors=[];
if(manifestIds.size!==manifest.clips.length||manifest.clips.length!==expected.length||manifest.clips.some(clip=>!expectedIds.has(clip.cueId)))manifestErrors.push('cue manifest coverage or duplicate identity mismatch');
const checks = [];
for (const cue of expected) {
  const clip = manifest.clips.find(item => item.cueId === cue.id);
  const errors = [];
  if (!clip) { checks.push({ cueId: cue.id, pass: false, errors: ['missing audio'] }); continue; }
  if (clip.text !== cue.narration.trim()) errors.push('text mismatch');
  if (!/^[\da-f]{64}$/.test(clip.id)) throw new Error('Invalid asset identity.');
  const file = path.join(root, 'public/assets/audio/narration', `${clip.id}.mp3`);
  const bytes = await fs.readFile(file);
  if (bytes.length !== clip.bytes || createHash('sha256').update(bytes).digest('hex') !== clip.sha256) errors.push('asset checksum mismatch');
  const media = JSON.parse(execFileSync(probe, ['-v', 'error', '-show_entries', 'format=duration,size', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', file], { encoding: 'utf8' }));
  const stream = media.streams[0], duration = Number(media.format.duration);
  if (stream?.codec_name !== 'mp3' || stream.sample_rate !== '32000' || stream.channels !== 1) errors.push('audio format mismatch');
  if (!(duration > 0) || Math.abs(duration - clip.duration) > .15) errors.push('duration mismatch');
  let timingLevel='legacy-estimated',timedWords=0;
  if(clip.subtitleStatus==='provider'){
    try{
      if(clip.subtitleUrl!==`/assets/audio/narration/${clip.id}.subtitles.json`)throw new Error('subtitle path mismatch');
      const raw=await fs.readFile(path.join(root,'public/assets/audio/narration',`${clip.id}.subtitles.json`));
      if(raw.length>262144||createHash('sha256').update(raw).digest('hex')!==clip.subtitleSha256)throw new Error('subtitle checksum mismatch');
      const timeline=JSON.parse(raw);
      if(timeline.version!==1||timeline.source!=='MiniMax'||timeline.audioSha256!==clip.sha256||timeline.textSha256!==createHash('sha256').update(clip.text).digest('hex')||timeline.model!==clip.model||timeline.voice!==clip.voice||!Number.isFinite(timeline.duration)||Math.abs(timeline.duration-clip.duration)>.001)throw new Error('subtitle recording binding mismatch');
      if(!['word','sentence'].includes(timeline.timingLevel))throw new Error('subtitle timing level mismatch');
      // Re-run the same source/time checks using this canonical file's exact data.
      const rows=timeline.cues.map(cue=>({text:cue.text,text_begin:cue.textStart,text_end:cue.textEnd,time_begin:cue.start*1000,time_end:cue.end*1000,
        timestamped_words:timeline.words?.filter(word=>word.textStart>=cue.textStart&&word.textEnd<=cue.textEnd).map(word=>({word:word.text,word_begin:word.textStart,word_end:word.textEnd,time_begin:word.start*1000,time_end:word.end*1000}))}));
      const normalized=normalizeMiniMaxSubtitles(rows,{text:clip.text,audioSha256:clip.sha256,model:clip.model,voice:clip.voice,duration:clip.duration,subtitleType:timeline.timingLevel});
      if(timeline.words&&normalized.words.length!==timeline.words.length)throw new Error('subtitle words outside provider blocks');
      timingLevel=timeline.timingLevel;timedWords=timeline.words?.length??0;
    }catch(error){errors.push(error.message);}
  }else if(clip.subtitleUrl||clip.subtitleSha256)errors.push('legacy clip unexpectedly references native subtitles');
  checks.push({ cueId: cue.id, pass: errors.length === 0, duration, bytes: bytes.length,timingLevel,timedWords, errors });
}
const nativeWordClips=checks.filter(check=>check.timingLevel==='word'&&check.pass).length;
const nativeWordComplete=nativeWordClips===expected.length&&!(manifest.subtitleUpgradeFailures||[]).length;
const report = { checkedAt: new Date().toISOString(), provider: 'MiniMax', model: manifest.model, voice: manifest.voice, expected: expected.length, checked: checks.length, passed: checks.filter(check => check.pass).length,nativeWordClips,nativeWordComplete,requireWord,nativeSentenceClips:checks.filter(check=>check.timingLevel==='sentence').length,legacyEstimatedClips:checks.filter(check=>check.timingLevel==='legacy-estimated').length,subtitleUpgradeFailures:manifest.subtitleUpgradeFailures||[],manifestErrors,timedWords:checks.reduce((sum,check)=>sum+(check.timedWords||0),0), durationSeconds: checks.reduce((sum, check) => sum + (check.duration || 0), 0), bytes: checks.reduce((sum, check) => sum + (check.bytes || 0), 0), pass: checks.every(check => check.pass)&&!manifestErrors.length&&(!requireWord||nativeWordComplete), checks };
await fs.mkdir(path.join(root, 'qa'), { recursive: true });
await fs.writeFile(path.join(root, 'qa/narration-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, checks: undefined }));
if (!report.pass) process.exitCode = 1;

