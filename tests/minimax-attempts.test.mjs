import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {narrationPayload,prepareNarration,audioDirectory} from '../server/minimax-narration.mjs';

test('an uncertain synthesis POST gets one persisted retry; rerunning cannot reset its budget',async()=>{
 const text=`仅用于无网络恢复测试 ${randomUUID()}`;
 const hash=createHash('sha256').update(JSON.stringify(narrationPayload(text,{subtitles:true,subtitleType:'word'}))).digest('hex');
 const directory=fileURLToPath(new URL(`../.cache/narration-subtitle-probe/${hash}/`,import.meta.url));
 const originalFetch=globalThis.fetch,originalFile=process.env.MINIMAX_ENV_FILE,originalKey=process.env.MINIMAX_API_KEY;
 let posts=0;
 // Explicitly avoid reading any real local credential file. Every fetch is a
 // local stub that rejects before sending; no downloader can be reached.
 process.env.MINIMAX_ENV_FILE=fileURLToPath(new URL('../.cache/nonexistent-test-credentials',import.meta.url));
 process.env.MINIMAX_API_KEY='test-only-no-network';
 globalThis.fetch=async()=>{posts++;throw new TypeError('simulated connection interruption');};
 try{
  await assert.rejects(prepareNarration(text,{subtitles:true}),/远端完成情况未知/);
  assert.equal(posts,2);
  const record=JSON.parse(await fs.readFile(directory+'attempt.json','utf8'));
  assert.equal(record.attempts,2);assert.equal(record.state,'uncertain');assert.deepEqual(record.history.map(item=>item.outcome),['unknown','unknown']);
  await assert.rejects(prepareNarration(text,{subtitles:true}),/用尽一次.*有界重试/);
  assert.equal(posts,2);
  await fs.writeFile(directory+'attempt.json',JSON.stringify({...record,state:'posting',history:record.history.slice(0,1)}));
  await assert.rejects(prepareNarration(text,{subtitles:true}),/用尽一次.*有界重试/);
  const recovered=JSON.parse(await fs.readFile(directory+'attempt.json','utf8'));
  assert.equal(recovered.state,'uncertain');assert.equal(recovered.history.length,2);assert.equal(recovered.history[1].outcome,'unknown');assert.equal(posts,2);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalFile===undefined)delete process.env.MINIMAX_ENV_FILE;else process.env.MINIMAX_ENV_FILE=originalFile;
  if(originalKey===undefined)delete process.env.MINIMAX_API_KEY;else process.env.MINIMAX_API_KEY=originalKey;
  await fs.unlink(directory+'attempt.json').catch(()=>{});await fs.rmdir(directory).catch(()=>{});
 }
});

test('same-size MP3 corruption and sidecar binding changes cannot claim provider or cause a replacement POST',async()=>{
 const text=`仅用于缓存完整性测试 ${randomUUID()}`,payload=narrationPayload(text,{subtitles:true,subtitleType:'word'});
 const sha=value=>createHash('sha256').update(value).digest('hex'),id=sha(JSON.stringify(payload));
 const files={audio:path.join(audioDirectory,`${id}.mp3`),metadata:path.join(audioDirectory,`${id}.json`),subtitle:path.join(audioDirectory,`${id}.subtitles.json`)};
 const resume=fileURLToPath(new URL(`../.cache/narration-subtitle-probe/${id}/`,import.meta.url));
 // A synthetic byte fixture tests cache binding, never audio decoding/playback.
 const audio=Buffer.alloc(1024,17),cue={start:0,end:1,text,textStart:0,textEnd:text.length};
 const base={version:1,source:'MiniMax',audioSha256:sha(audio),textSha256:sha(text),model:payload.model,voice:payload.voice_setting.voice_id,duration:1,timingLevel:'word',cues:[cue],words:[cue]};
 const metadata={id,text,url:`/assets/audio/narration/${id}.mp3`,provider:'MiniMax',model:base.model,voice:base.voice,duration:1,bytes:audio.length,sha256:sha(audio),subtitleStatus:'provider',timingLevel:'word',subtitleUrl:`/assets/audio/narration/${id}.subtitles.json`};
 const write=async(sidecar=base,bytes=audio)=>{const raw=JSON.stringify(sidecar);await fs.writeFile(files.audio,bytes);await fs.writeFile(files.subtitle,raw);await fs.writeFile(files.metadata,JSON.stringify({...metadata,subtitleSha256:sha(raw)}));};
 const originalFetch=globalThis.fetch,originalFile=process.env.MINIMAX_ENV_FILE,originalKey=process.env.MINIMAX_API_KEY;let posts=0;
 process.env.MINIMAX_ENV_FILE=fileURLToPath(new URL('../.cache/nonexistent-test-credentials',import.meta.url));process.env.MINIMAX_API_KEY='test-only-no-network';
 globalThis.fetch=async()=>{posts++;throw new Error('No paid request is allowed for a damaged cache.');};
 try{
  await fs.mkdir(audioDirectory,{recursive:true});await write();
  assert.equal((await prepareNarration(text,{subtitles:true})).subtitleStatus,'provider');
  const corrupt=Buffer.from(audio);corrupt[512]^=1;await write(base,corrupt);
  await assert.rejects(prepareNarration(text,{subtitles:true}),/缓存未通过校验.*不能自动再次付费合成/);
  for(const changed of [{...base,model:'wrong-model'},{...base,voice:'wrong-voice'},{...base,duration:1.1},{...base,textSha256:'0'.repeat(64)},{...base,audioSha256:'0'.repeat(64)}]){
   await write(changed);await assert.rejects(prepareNarration(text,{subtitles:true}),/缓存未通过校验/);
  }
  assert.equal(posts,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalFile===undefined)delete process.env.MINIMAX_ENV_FILE;else process.env.MINIMAX_ENV_FILE=originalFile;
  if(originalKey===undefined)delete process.env.MINIMAX_API_KEY;else process.env.MINIMAX_API_KEY=originalKey;
  for(const file of Object.values(files))await fs.unlink(file).catch(()=>{});
  await fs.rmdir(resume).catch(()=>{});
 }
});
