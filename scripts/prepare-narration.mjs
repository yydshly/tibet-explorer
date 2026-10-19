// Build-time MiniMax synthesis, using the same content module as the product.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { prepareNarration, audioDirectory,withNarrationBatchLock } from '../server/minimax-narration.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const only = option('--only');
const limit = Number(option('--limit') || 0);
const subtitles=args.includes('--subtitles');
const subtitleType=option('--subtitle-type')||'word';
if(!['sentence','word'].includes(subtitleType))throw new Error('Use --subtitle-type word or sentence.');
async function importContent(file) {
  const { outputFiles } = await build({ entryPoints: [path.join(root, file)], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const { chapters } = await importContent('src/data/curriculum.ts');
const journey = await importContent('src/data/journey.ts');
const { cityLifeNarrationCues } = await importContent('src/data/cityLifeJourney.ts');
const { cityComparisonNarrationCues } = await importContent('src/data/cityComparison.ts');
const { climateObservationNarrationCues } = await importContent('src/data/climateObservationNarration.ts');
const { regionalJourneyNarrationCues } = await importContent('src/data/regionalJourney.ts');
const { climateLabNarrationCues } = await importContent('src/data/climateLab.ts');
const { overviewNarrationCues } = await importContent('src/data/overviewNarration.ts');
const { routePilotCues } = await importContent('src/data/routePilot.ts');
const { lulangPhotoNarrationCues } = await importContent('src/data/lulangPhotoNarration.ts');
const { gatewayNarrationCues } = await importContent('src/data/routeGatewayNarration.ts');
const { tongmaiCues } = await importContent('src/data/tongmaiJourney.ts');
const { bomiCues } = await importContent('src/data/bomiJourney.ts');
const cues = [...chapters.flatMap(chapter => chapter.steps.flatMap(step => (journey.getJourneyStep(step.id)?.cues || []).map(cue => ({ ...cue, stepId: step.id, chapterId: chapter.id })))), ...cityLifeNarrationCues, ...cityComparisonNarrationCues,...climateObservationNarrationCues,...regionalJourneyNarrationCues,...overviewNarrationCues,...climateLabNarrationCues,...routePilotCues,...lulangPhotoNarrationCues,...gatewayNarrationCues,...tongmaiCues,...bomiCues];
const selected = cues.filter(cue => !only || cue.id === only || cue.stepId === only || only === cue.chapterId && ['cities','comparison','regional','overview'].includes(only));
if (!selected.length) throw new Error('No matching narration cue.');
// Native upgrades prioritize the opening, climate, and both city journeys.
const priority=cue=>cue.stepId==='G1'?0:cue.chapterId==='climate'?1:['cities','comparison'].includes(cue.chapterId)?2:3;
const ordered=subtitles&&!only?[...selected].sort((a,b)=>priority(a)-priority(b)):selected;
const batch = limit > 0 ? ordered.slice(0, limit) : ordered;
await withNarrationBatchLock(async()=>{
await fs.mkdir(audioDirectory, { recursive: true });
const manifestFile = path.join(audioDirectory, 'cue-manifest.json');
const previous = await fs.readFile(manifestFile, 'utf8').then(JSON.parse).catch(() => ({ clips: [] }));
const currentText = new Map(cues.map(cue => [cue.id, cue.narration.trim()]));
const clips = new Map(previous.clips.filter(clip => currentText.get(clip.cueId) === clip.text).map(clip => [clip.cueId,{...clip,subtitleStatus:clip.subtitleStatus||'legacy-estimated'}]));
const failures=new Map((previous.subtitleUpgradeFailures||[]).filter(item=>currentText.has(item.cueId)).map(item=>[item.cueId,item]));
async function saveManifest() {
  const ordered = cues.flatMap(cue => clips.has(cue.id) ? [clips.get(cue.id)] : []);
  const manifest = { provider: 'MiniMax', model: 'speech-2.8-hd', voice: 'Chinese (Mandarin)_Gentleman', contentCueCount: cues.length, generatedCueCount: ordered.length,nativeWordCueCount:ordered.filter(clip=>clip.subtitleStatus==='provider'&&clip.timingLevel==='word').length,subtitleUpgradeFailures:[...failures.values()], updatedAt: new Date().toISOString(), policy: '原创普通话合成讲述；系统音色，非现场录音和历史人物声音。', clips: ordered };
  await fs.writeFile(manifestFile + '.writing', JSON.stringify(manifest, null, 2) + '\n');
  await fs.rename(manifestFile + '.writing', manifestFile);
}
for (let index = 0; index < batch.length; index++) {
  const cue = batch[index];
  try {
    let asset;
    for (let attempt = 0; attempt < 4; attempt++) {
      try { asset = await prepareNarration(cue.narration,{subtitles,subtitleType}); break; }
      catch (error) {
        // A rejected rate-limited request has not produced an audio asset.
        if (error.status !== 429 || attempt === 3) throw error;
        console.log(`${cue.id}: rate limit; backing off for 30 seconds.`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    clips.set(cue.id, { ...asset, cueId: cue.id, title: cue.title, stepId: cue.stepId, chapterId: cue.chapterId });
    failures.delete(cue.id);
    await saveManifest();
    console.log(`${index + 1}/${batch.length} ${cue.id}: ${asset.duration.toFixed(2)}s ${asset.subtitleStatus}${asset.cached ? ' (cached)' : ''}`);
  } catch (error) {
    failures.set(cue.id,{cueId:cue.id,error:error.message,at:new Date().toISOString()});
    await saveManifest();
    // Errors from the provider are sanitized by the server module.
    console.error(`${cue.id}: ${error.message}`);
    process.exitCode = 1;if(!subtitles)break;
  }
}
console.log(`MiniMax narration: ${clips.size}/${cues.length} cue assets prepared; ${[...clips.values()].filter(clip=>clip.subtitleStatus==='provider'&&clip.timingLevel==='word').length} with native word timing.`);
if(failures.size)console.log(`Native subtitle upgrade failures: ${[...failures.keys()].join(', ')}`);
});

