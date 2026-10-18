// Runs in Node only. No credential or provider response body enters the browser bundle.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { narrationAssetsMiddleware } from './narration-assets.mjs';
import {downloadMiniMaxSubtitleWithRetry,normalizeMiniMaxSubtitles,subtitleDownloadLimit} from './minimax-subtitles.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const audioDirectory = path.join(appRoot, 'public/assets/audio/narration');
const defaultEndpoint = 'https://api.minimax.cn/v1/t2a_v2';
const officialEndpoints = new Set([defaultEndpoint, 'https://api.minimaxi.com/v1/t2a_v2', 'https://api.minimax.io/v1/t2a_v2']);
const model = 'speech-2.8-hd';
const voice = 'Chinese (Mandarin)_Gentleman';
const jobs = new Map();
const lockDirectory = path.join(appRoot, '.cache/narration-locks');
let queue = Promise.resolve();
let requestedAt = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = value => createHash('sha256').update(value).digest('hex');

function parseEnv(content) {
  return Object.fromEntries(content.split(/\r?\n/).map(line => line.match(/^\s*(?:export\s+)?([A-Z_][A-Z_0-9]*)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(([, name, value]) => [name, value.replace(/^(['"])(.*)\1$/, '$2')]));
}

async function configuration() {
  // Reuse the machine-local configuration already used by the Xinjiang project.
  // Its contents stay in memory; only a boolean availability is exposed.
  const configFile = process.env.MINIMAX_ENV_FILE || 'F:/codex_project/.env.minimax';
  const local = await fs.readFile(configFile, 'utf8').then(parseEnv).catch(() => ({}));
  const apiKey = process.env.MINIMAX_API_KEY || local.MINIMAX_API_KEY;
  const base = process.env.MINIMAX_API_BASE || local.MINIMAX_API_BASE;
  const endpoint = base ? `${base.replace(/\/$/, '').replace(/\/v1$/, '')}/v1/t2a_v2` : defaultEndpoint;
  if (!officialEndpoints.has(endpoint)) throw new NarrationError('语音服务地址需要使用 MiniMax 官方接口。', 503);
  return { apiKey, endpoint };
}

export class NarrationError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

export function narrationPayload(text,{subtitles=false,subtitleType='sentence'}={}) {
  if (typeof text !== 'string' || !text.trim() || text.length > 1800) throw new NarrationError('每段讲述需要 1 至 1800 个字符。', 400);
  if(subtitles&&!['sentence','word'].includes(subtitleType))throw new NarrationError('字幕类型需要使用句级或词级。',400);
  return {
    model, text: text.trim(), stream: false, output_format: 'hex', language_boost: 'Chinese',
    ...(subtitles?{subtitle_enable:true,subtitle_type:subtitleType}:{}),
    voice_setting: { voice_id: voice, speed: 1.04, vol: 1, pitch: 0 },
    audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
    pronunciation_dict: { tone: ['西藏/(xi1)(zang4)', '吐蕃/(tu3)(bo1)', '雅鲁藏布/(ya3)(lu3)(zang4)(bu4)', '羌塘/(qiang1)(tang2)', '日喀则/(ri4)(ka1)(ze2)', '冈仁波齐/(gang1)(ren2)(bo1)(qi2)', '那曲/(na4)(qu1)', '青稞/(qing1)(ke1)'] },
  };
}

export async function narrationStatus() {
  const { apiKey } = await configuration();
  const manifest = await fs.readFile(path.join(audioDirectory, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => ({ clips: [] }));
  return { provider: 'MiniMax', model, voice, configured: Boolean(apiKey), cachedClips: manifest.clips.length };
}

async function readCached(hash) {
  try {
    const metadata = JSON.parse(await fs.readFile(path.join(audioDirectory, `${hash}.json`), 'utf8'));
    const audio=await fs.readFile(path.join(audioDirectory,`${hash}.mp3`));
    if(metadata.id!==hash||metadata.url!==`/assets/audio/narration/${hash}.mp3`||metadata.provider!=='MiniMax'||metadata.model!==model||metadata.voice!==voice||!Number.isFinite(metadata.duration)||metadata.duration<=0||audio.length!==metadata.bytes||audio.length<1024||sha256(audio)!==metadata.sha256)return null;
    if(metadata.subtitleStatus==='provider'){
      const raw=await fs.readFile(path.join(audioDirectory,`${hash}.subtitles.json`));
      if(raw.length>subtitleDownloadLimit||sha256(raw)!==metadata.subtitleSha256||metadata.subtitleUrl!==`/assets/audio/narration/${hash}.subtitles.json`)return null;
      const subtitle=JSON.parse(raw);
      if(subtitle.version!==1||subtitle.source!=='MiniMax'||subtitle.audioSha256!==metadata.sha256||subtitle.textSha256!==sha256(metadata.text)||subtitle.model!==metadata.model||subtitle.voice!==metadata.voice||!Number.isFinite(subtitle.duration)||Math.abs(subtitle.duration-metadata.duration)>.001||subtitle.timingLevel!==metadata.timingLevel||!['word','sentence'].includes(subtitle.timingLevel)||sha256(JSON.stringify(narrationPayload(metadata.text,{subtitles:true,subtitleType:subtitle.timingLevel})))!==hash)return null;
    }else if(sha256(JSON.stringify(narrationPayload(metadata.text)))!==hash)return null;
    return { ...metadata,subtitleStatus:metadata.subtitleStatus||'legacy-estimated', cached: true };
  } catch { return null; }
}

async function hasPublishedAudio(hash){
 const states=await Promise.all(['json','mp3','subtitles.json'].map(extension=>fs.access(path.join(audioDirectory,`${hash}.${extension}`)).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw new NarrationError('已有录音缓存无法检查；不能自动再次付费合成。');})));
 return states.some(Boolean);
}

async function atomic(file, value) {
  const temporary = `${file}.${process.pid}.writing`;
  await fs.writeFile(temporary, value);
  await fs.rename(temporary, file);
}

async function requestSynthesis(payload) {
  const { apiKey, endpoint } = await configuration();
  if (!apiKey) throw new NarrationError('MiniMax 语音暂未连接。已生成的讲述仍可播放。', 503);
  await sleep(Math.max(0, 6300 - (Date.now() - requestedAt)));
  requestedAt = Date.now();
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(75000), redirect:'error',
    });
  } catch { const error=new NarrationError('语音生成连接失败或超时，远端完成情况未知。');error.postConnectionFailure=true;throw error; }
  if (!response.ok) throw new NarrationError(`语音服务返回 HTTP ${response.status}，请稍后重试。`,response.status===429?429:502);
  const body = await response.json().catch(() => null);
  const code = body?.base_resp?.status_code;
  if (code === 1002 || code === 1039) throw new NarrationError('语音服务正在限流，请稍后重试。', 429);
  if (code !== 0 || body?.data?.status !== 2 || typeof body.data.audio !== 'string') throw new NarrationError(`语音服务暂未完成生成（${Number.isSafeInteger(code)?code:'未知状态'}）。`);
  if (!/^[\da-f]+$/i.test(body.data.audio) || body.data.audio.length % 2) throw new NarrationError('语音服务未返回有效音频。');
  const bytes = Buffer.from(body.data.audio, 'hex');
  if (bytes.length < 1024) throw new NarrationError('语音服务返回的音频过短。');
  const duration = Number(body.extra_info?.audio_length) / 1000;
  if (!(duration > 0) || !Number.isFinite(duration)) throw new NarrationError('语音服务未返回有效时长。');
  return {body,bytes,duration,sourceEndpoint:endpoint};
}

/** Explicit schema probe. A signed URL is private resumable state in .cache;
 * public assets and diagnostic output never include its query or credentials. */
async function stageNativeSynthesis(payload,hash,{retry=false}={}){
  const directory=path.join(appRoot,'.cache/narration-subtitle-probe',hash);
  await fs.mkdir(directory,{recursive:true});
  let existing;
  try{existing=JSON.parse(await fs.readFile(path.join(directory,'metadata.json'),'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw new NarrationError('已保存录音的恢复记录无法读取；不能自动再次付费合成。');}
  const parseRaw=raw=>{try{return JSON.parse(raw);}catch{throw new NarrationError('已保存字幕不是有效JSON；不能自动再次付费合成。');}};
  if(existing&&(existing.requestHash!==hash||existing.textSha256!==sha256(payload.text)||existing.model!==payload.model||existing.voice!==payload.voice_setting.voice_id))throw new NarrationError('已保存录音的请求绑定校验失败；不能自动再次付费合成。');
  if(existing?.subtitleState==='downloaded'){
    const audio=await fs.readFile(path.join(directory,'audio.mp3'));
    const raw=await fs.readFile(path.join(directory,'subtitle-source.json'));
    if(sha256(audio)!==existing.audioSha256||sha256(raw)!==existing.subtitleSha256)throw new NarrationError('已保存的同次音频或字幕校验失败；不能自动再次付费合成。');
    return {metadata:existing,bytes:audio,raw,value:parseRaw(raw),cached:true};
  }
  let base,downloadURL;
  const resumedURL=await fs.readFile(path.join(directory,'subtitle-download.url'),'utf8').catch(()=>null);
  const resumedAudio=await fs.readFile(path.join(directory,'audio.mp3')).catch(()=>null);
  const resumedRaw=await fs.readFile(path.join(directory,'subtitle-source.json')).catch(()=>null);
  if(!existing&&(resumedAudio||resumedURL||resumedRaw))throw new NarrationError('已保存录音缺少恢复绑定记录；不能自动再次付费合成。');
  if(existing?.requestHash===hash&&(resumedURL||resumedRaw)&&resumedAudio&&sha256(resumedAudio)===existing.audioSha256){base=existing;downloadURL=resumedURL;}
  else{
    if(existing&&!retry)throw new NarrationError('已存在未完成的字幕验证；不能自动再次付费合成。');
    if(!existing&&await hasPublishedAudio(hash))throw new NarrationError('已有录音缓存未通过校验，且缺少同次恢复记录；不能自动再次付费合成。');
    const attemptFile=path.join(directory,'attempt.json');let attempt;
    try{attempt=JSON.parse(await fs.readFile(attemptFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new NarrationError('语音请求尝试记录损坏；不能自动再次付费合成。');}
    if(attempt&&(attempt.requestHash!==hash||!Number.isSafeInteger(attempt.attempts)||attempt.attempts<0||!Array.isArray(attempt.history)))throw new NarrationError('语音请求尝试记录绑定无效。');
    attempt??={requestHash:hash,textSha256:sha256(payload.text),attempts:0,history:[]};
    if(attempt.state==='posting'){
      attempt={...attempt,state:'uncertain',history:[...attempt.history,{at:new Date().toISOString(),outcome:'unknown',message:'Previous process ended before the synthesis response was persisted; remote completion and billing are unknown.'}]};
      await atomic(attemptFile,JSON.stringify(attempt,null,2)+'\n');
    }
    if(['failed','received'].includes(attempt.state))throw new NarrationError('这段语音已有失败或完成记录，但缺少可恢复绑定；不能自动再次付费合成。');
    let synthesis;
    for(;;){
      if(attempt.attempts>=2)throw new NarrationError('这段语音请求已用尽一次连接失败后的有界重试；远端完成和计费情况未知，保留旧录音。');
      attempt={...attempt,attempts:attempt.attempts+1,state:'posting',startedAt:new Date().toISOString()};
      await atomic(attemptFile,JSON.stringify(attempt,null,2)+'\n');
      try{synthesis=await requestSynthesis(payload);break;}
      catch(error){
        attempt={...attempt,attempts:attempt.attempts-(error.status===429?1:0),state:error.status===429?'rejected':error.postConnectionFailure?'uncertain':'failed',history:[...attempt.history,{at:new Date().toISOString(),outcome:error.postConnectionFailure?'unknown':error.status===429?'rate-limit-rejected':'failed',message:error.message}]};
        await atomic(attemptFile,JSON.stringify(attempt,null,2)+'\n');
        if(error.postConnectionFailure&&attempt.attempts<2){await sleep(1000);continue;}
        throw error;
      }
    }
    const {body,bytes,duration,sourceEndpoint}=synthesis;
    downloadURL=typeof body.data.subtitle_file==='string'?body.data.subtitle_file:null;
    let downloadHost;try{downloadHost=new URL(downloadURL).hostname;}catch{}
    base={requestHash:hash,audioSha256:sha256(bytes),textSha256:sha256(payload.text),text:payload.text,model,voice,duration,bytes:bytes.length,downloadHost,sourceEndpoint,generatedAt:new Date().toISOString(),postAttempts:attempt.attempts,priorPostOutcomeUnknown:attempt.history.some(item=>item.outcome==='unknown')};
    await atomic(path.join(directory,'metadata.json'),JSON.stringify({...base,subtitleState:'pending'},null,2)+'\n');
    await atomic(path.join(directory,'audio.mp3'),bytes);
    await atomic(path.join(directory,'request.json'),JSON.stringify(payload,null,2)+'\n');
    if(!downloadURL)throw new NarrationError('语音服务未返回同次合成的字幕文件；音频已保留，不能自动重复合成。');
    const privateFile=path.join(directory,'subtitle-download.url');
    await fs.writeFile(privateFile+'.writing',downloadURL,{mode:0o600});await fs.rename(privateFile+'.writing',privateFile);
    await atomic(attemptFile,JSON.stringify({...attempt,state:'received',audioSha256:base.audioSha256},null,2)+'\n');
  }
  let subtitle;
  try{
    if(resumedRaw){if(resumedRaw.length>subtitleDownloadLimit)throw new NarrationError('已保存字幕文件超过允许大小。');subtitle={raw:resumedRaw,value:parseRaw(resumedRaw)};}
    else subtitle=await downloadMiniMaxSubtitleWithRetry(downloadURL,{sourceEndpoint:base.sourceEndpoint});
  }catch(error){
    const metadata={...base,subtitleState:'download-failed',error:error.message,...(error.diagnostic?{dns:error.diagnostic}:{})};
    await atomic(path.join(directory,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');throw error;
  }
  await atomic(path.join(directory,'subtitle-source.json'),subtitle.raw);
  const value=subtitle.value;
  const rows=Array.isArray(value)?value:[];
  const metadata={...base,subtitleState:'downloaded',subtitleBytes:subtitle.raw.length,subtitleSha256:sha256(subtitle.raw),shape:Array.isArray(value)?'array':value===null?'null':typeof value,topLevelKeys:value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value):[],rowCount:rows.length,rowKeys:rows[0]&&typeof rows[0]==='object'?Object.keys(rows[0]):[],ranges:rows.map(row=>row&&typeof row==='object'?Object.fromEntries(Object.entries(row).filter(([key,value])=>typeof value==='number')):{})};
  await atomic(path.join(directory,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
  return {metadata,bytes:await fs.readFile(path.join(directory,'audio.mp3')),raw:subtitle.raw,value:subtitle.value,cached:false};
}

export async function probeNarrationSubtitles(text,{retry=false,subtitleType='sentence'}={}){
 const payload=narrationPayload(text,{subtitles:true,subtitleType}),hash=sha256(JSON.stringify(payload));
 const job=queue.then(()=>withSynthesisLock(hash,async()=>{const staged=await stageNativeSynthesis(payload,hash,{retry});return {...staged.metadata,cached:staged.cached};},{reuseCache:false}));
 queue=job.catch(()=>{});return job;
}

async function synthesize(payload, hash) {
  const already = await readCached(hash);
  if (already) return already;
  await fs.mkdir(audioDirectory, { recursive: true });
  const native=payload.subtitle_enable?await stageNativeSynthesis(payload,hash):null;
  const {bytes,duration}=native?{bytes:native.bytes,duration:native.metadata.duration}:await requestSynthesis(payload);
  const subtitle=native?normalizeMiniMaxSubtitles(native.value,{text:payload.text,audioSha256:sha256(bytes),model,voice,duration,subtitleType:payload.subtitle_type}):null;
  const subtitleRaw=subtitle?JSON.stringify(subtitle,null,2)+'\n':null;
  if(subtitleRaw&&Buffer.byteLength(subtitleRaw)>subtitleDownloadLimit)throw new NarrationError('规范字幕文件超过允许大小；同次录音已保存，未重复合成。');
  const metadata = {
    id: hash, url: `/assets/audio/narration/${hash}.mp3`, text: payload.text,
    duration, bytes: bytes.length, sha256: sha256(bytes), provider: 'MiniMax', model, voice,
    sampleRate: 32000, channel: 1, generatedAt:native?.metadata.generatedAt||new Date().toISOString(),
    policy: '原创普通话合成讲述，使用系统音色。不是现场录音或历史人物声音。',
    subtitleStatus:subtitle?'provider':'legacy-estimated',
    ...(subtitle?{subtitleUrl:`/assets/audio/narration/${hash}.subtitles.json`,subtitleSha256:sha256(subtitleRaw),timingLevel:subtitle.timingLevel}:{}),
  };
  await atomic(path.join(audioDirectory, `${hash}.mp3`), bytes);
  if(subtitleRaw)await atomic(path.join(audioDirectory,`${hash}.subtitles.json`),subtitleRaw);
  await atomic(path.join(audioDirectory, `${hash}.json`), JSON.stringify(metadata, null, 2) + '\n');
  const manifestFile = path.join(audioDirectory, 'manifest.json');
  await withSynthesisLock('asset-manifest',async()=>{
    const previous = await fs.readFile(manifestFile, 'utf8').then(JSON.parse).catch(() => ({ clips: [] }));
    const clips = [...previous.clips.filter(clip => clip.id !== hash), metadata];
    await atomic(manifestFile, JSON.stringify({ provider: 'MiniMax', model, voice, policy: metadata.policy, clips }, null, 2) + '\n');
  });
  return { ...metadata, cached: false };
}

async function withSynthesisLock(hash, action,{reuseCache=true}={}) {
  // The pre-generation script and Vite may request the same cue concurrently.
  // A shared filesystem lock prevents a second paid request for that text.
  await fs.mkdir(lockDirectory, { recursive: true });
  const lockFile = path.join(lockDirectory, `${hash}.lock`);
  const started = Date.now();
  let handle;
  while (!handle) {
    try { handle = await fs.open(lockFile, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const cached = reuseCache&&/^[a-f0-9]{64}$/.test(hash)?await readCached(hash):null; if (cached) return cached;
      const lock = await fs.stat(lockFile).catch(() => null);
      const owner=await fs.readFile(lockFile,'utf8').then(JSON.parse).catch(()=>null);
      let alive=true;if(Number.isSafeInteger(owner?.pid)){try{process.kill(owner.pid,0);}catch(error){alive=error.code!=='ESRCH';}}
      if(!alive||!owner&&lock&&Date.now()-lock.mtimeMs>120000)await fs.unlink(lockFile).catch(()=>{});
      if (Date.now() - started > 130000) throw new NarrationError('这段讲述仍在准备中，请稍后重试。');
      await sleep(200);
    }
  }
  await handle.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));
  try { return await action(); }
  finally { await handle.close(); await fs.unlink(lockFile).catch(() => {}); }
}

export const withNarrationBatchLock=action=>withSynthesisLock('cue-manifest',action);

export async function prepareNarration(text,{subtitles=false,subtitleType='word'}={}) {
  const payload = narrationPayload(text,{subtitles:true,subtitleType});
  const hash = sha256(JSON.stringify(payload));
  const cached = await readCached(hash);
  if (cached) return cached;
  if(!subtitles&&!await hasPublishedAudio(hash)){const legacy=await readCached(sha256(JSON.stringify(narrationPayload(text))));if(legacy)return legacy;}
  if (jobs.has(hash)) return jobs.get(hash);
  if (jobs.size >= 12) throw new NarrationError('讲述正在准备中，请稍后再试。', 429);
  const job = queue.then(() => withSynthesisLock(hash, () => synthesize(payload, hash)));
  queue = job.catch(() => {});
  jobs.set(hash, job);
  try { return await job; } finally { jobs.delete(hash); }
}

async function requestBody(request) {
  let bytes = 0; const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 24000) throw new NarrationError('讲述请求过长。', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new NarrationError('讲述请求格式不正确。', 400); }
}

export function minimaxNarrationPlugin() {
  function attach(server) {
    server.middlewares.use('/assets/audio/narration', narrationAssetsMiddleware(audioDirectory));
    server.middlewares.use('/api/narration', async (request, response) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      try {
        const origin = request.headers.origin;
        if (origin && new URL(origin).host !== request.headers.host) throw new NarrationError('讲述请求来源不正确。', 403);
        if (request.method === 'GET') response.end(JSON.stringify(await narrationStatus()));
        else if (request.method === 'POST') response.end(JSON.stringify(await prepareNarration((await requestBody(request)).text)));
        else { response.statusCode = 405; response.end(JSON.stringify({ error: '不支持此讲述操作。' })); }
      } catch (error) {
        response.statusCode = error instanceof NarrationError ? error.status : 500;
        response.end(JSON.stringify({ error: error instanceof NarrationError ? error.message : '讲述准备失败，请稍后重试。' }));
      }
    });
  }
  return { name: 'tibet-minimax-narration', configureServer: attach, configurePreviewServer: attach };
}
