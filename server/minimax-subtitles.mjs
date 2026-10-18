import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import {createHash} from 'node:crypto';

export class SubtitleError extends Error {constructor(message,{retryable=false}={}){super(message);this.status=502;this.retryable=retryable;}}
export const subtitleDownloadLimit=256*1024;
export const trustedSubtitleHost='minimax-algeng-chat-tts.oss-cn-wulanchabu.aliyuncs.com';
const officialSpeechEndpoints=new Set(['https://api.minimax.cn/v1/t2a_v2','https://api.minimaxi.com/v1/t2a_v2','https://api.minimax.io/v1/t2a_v2']);
function ipv6Words(address){
 const halves=address.toLowerCase().split('::'),left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
 return (halves.length===1?left:[...left,...Array(8-left.length-right.length).fill('0'),...right]).map(word=>parseInt(word,16));
}
export function isSubtitleProxyAddress(address){
 if(net.isIP(address)===4){const [a,b]=address.split('.').map(Number);return a===198&&(b===18||b===19);}
 if(net.isIP(address)===6&&!address.includes('.')){const [a,b,c]=ipv6Words(address);return a===0x2001&&b===2&&c===0;}
 return false;
}

/** Only globally routable addresses may receive provider subtitle GETs. */
export function isPublicSubtitleAddress(address){
 if(net.isIP(address)===4){
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===0||b===168)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
 }
 if(net.isIP(address)===6){
  const value=address.toLowerCase();
  // Strict global-unicast 2000::/3 only; no mapped IPv4, 6to4, Teredo,
  // documentation, unique-local, loopback, unspecified or link-local ranges.
  if(value.includes('.'))return false;
  const words=ipv6Words(value);
  const [first,second]=words;
  return first>=0x2000&&first<=0x3fff&&first!==0x2002&&!(first===0x2001&&(second<0x200||second===0xdb8));
 }
 return false;
}

export function subtitleDownloadURL(value){
 let url;try{url=new URL(value);}catch{throw new SubtitleError('字幕下载地址无效。');}
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.hash)throw new SubtitleError('字幕下载仅接受无凭据的标准 HTTPS 地址。');
 const host=url.hostname.replace(/^\[|\]$/g,'');
 if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||net.isIP(host))throw new SubtitleError('字幕下载地址不能使用本机、私网或裸 IP。');
 return url;
}

/** Resolve once inside the HTTPS connection's lookup, then pin that public IP.
 * No credential, cookie, redirect or second fetch is used for this download. */
export async function downloadMiniMaxSubtitle(value,{request=https.request,lookup=dns.lookup,timeoutMs=15000,maxBytes=subtitleDownloadLimit,sourceEndpoint}={}){
 const url=subtitleDownloadURL(value);
 // This host was observed in an actual official T2A response. The exception
 // covers only this machine's known Fake-IP proxy ranges and keeps TLS/SNI.
 const allowProxy=url.hostname===trustedSubtitleHost&&officialSpeechEndpoints.has(sourceEndpoint);
 return new Promise((resolve,reject)=>{
  let settled=false,req;
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result);};
  const timer=setTimeout(()=>{finish(new SubtitleError('字幕下载超时。',{retryable:true}));req?.destroy();},timeoutMs);
  const publicLookup=(hostname,options,callback)=>{
   Promise.resolve().then(()=>lookup(hostname,{all:true,verbatim:true})).then(records=>{
    if(!Array.isArray(records)||!records.length||records.some(record=>!isPublicSubtitleAddress(record.address)&&!(allowProxy&&isSubtitleProxyAddress(record.address)))){
     const error=new SubtitleError('字幕下载域名未解析为公网地址。');
     error.diagnostic={hostname,addresses:Array.isArray(records)?records.map(({address,family})=>({address,family})):[]};throw error;
    }
    const family=typeof options==='number'?options:options?.family;
    const selected=family===4||family===6?records.filter(record=>record.family===family):records;
    if(!selected.length)throw new SubtitleError('字幕下载域名没有可用的公网地址。');
    if(options?.all)callback(null,selected);else callback(null,selected[0].address,selected[0].family);
   }).catch(error=>callback(error instanceof SubtitleError?error:new SubtitleError('字幕下载域名解析失败。',{retryable:true})));
  };
  try{
   req=request(url,{method:'GET',agent:false,rejectUnauthorized:true,headers:{Accept:'application/json'},lookup:publicLookup},response=>{
    if(response.statusCode!==200){response.destroy();finish(new SubtitleError('字幕下载未返回成功结果；不接受重定向。',{retryable:response.statusCode>=500&&response.statusCode<600}));return;}
    const length=response.headers['content-length'];
    if(length!==undefined&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){response.destroy();finish(new SubtitleError('字幕文件超过允许大小。'));return;}
    const encoding=response.headers['content-encoding'];
    if(encoding&&encoding!=='identity'){response.destroy();finish(new SubtitleError('字幕下载返回了不支持的内容编码。'));return;}
    const chunks=[];let total=0;
    response.on('data',chunk=>{
     total+=chunk.length;if(total>maxBytes){response.destroy();req.destroy();finish(new SubtitleError('字幕文件超过允许大小。'));return;}
     chunks.push(Buffer.from(chunk));
    });
    response.on('end',()=>{
     try{const raw=Buffer.concat(chunks);if(!raw.length)throw new Error();finish(null,{raw,value:JSON.parse(raw.toString('utf8'))});}
     catch{finish(new SubtitleError('字幕文件不是有效 JSON。'));}
    });
    response.on('error',()=>finish(new SubtitleError('字幕下载中断。',{retryable:true})));
   });
   req.on('error',error=>finish(error instanceof SubtitleError?error:new SubtitleError('字幕下载连接失败。',{retryable:/^(?:ECONN|ETIMEDOUT|EAI_AGAIN|EHOST|ENET)/.test(error.code||'')})));req.end();
  }catch{finish(new SubtitleError('字幕下载连接失败。'));}
 });
}

/** Retry only transient GET failures, always reusing the same preserved URL.
 * No retry path can issue a synthesis POST or relax transport validation. */
export async function downloadMiniMaxSubtitleWithRetry(value,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),...options}={}){
 const delays=[1000,3000,5000];
 for(let attempt=0;;attempt++){
  try{return await downloadMiniMaxSubtitle(value,options);}
  catch(error){if(!error.retryable||attempt>=delays.length)throw error;await wait(delays[attempt]);}
 }
}

const sha256=value=>createHash('sha256').update(value).digest('hex');
const ignorable=value=>!value.replace(/[\s\p{P}\p{S}]/gu,'');

/** The observed non-streaming provider file is an array, not a guessed wrapper.
 * Source text (not pronounce_text) proves every offset before publication. */
export function normalizeMiniMaxSubtitles(value,{text,audioSha256,model,voice,duration,subtitleType='word'}){
 const fail=()=>{throw new SubtitleError('字幕结构、原文索引或时间范围未通过校验；已保留同次录音以便恢复。');};
 if(typeof text!=='string'||!text.length||!/^[a-f0-9]{64}$/.test(audioSha256)||typeof model!=='string'||!model||typeof voice!=='string'||!voice||!Number.isFinite(duration)||duration<=0||!['sentence','word'].includes(subtitleType)||!Array.isArray(value)||!value.length||value.length>2000)fail();
 const rawWords=subtitleType==='word'?value.flatMap(row=>{
  if(!row||!Array.isArray(row.timestamped_words)||!row.timestamped_words.length)fail();
  return row.timestamped_words;
 }):[];
 if(rawWords.length>5000)fail();
 const raw=[...value.map(row=>({row,label:'text',begin:'text_begin',end:'text_end'})),...rawWords.map(row=>({row,label:'word',begin:'word_begin',end:'word_end'}))];
 const codepointOffsets=[0];for(const character of text)codepointOffsets.push(codepointOffsets.at(-1)+character.length);
 const boundary=index=>index===0||index===text.length||!(text.charCodeAt(index-1)>=0xd800&&text.charCodeAt(index-1)<=0xdbff&&text.charCodeAt(index)>=0xdc00&&text.charCodeAt(index)<=0xdfff);
 const matches=convert=>raw.every(({row,label,begin,end})=>row&&typeof row[label]==='string'&&row[label].length&&Number.isSafeInteger(row[begin])&&Number.isSafeInteger(row[end])&&row[begin]>=0&&row[end]>row[begin]&&convert(row[end])!==undefined&&boundary(convert(row[begin]))&&boundary(convert(row[end]))&&row[label]===text.slice(convert(row[begin]),convert(row[end])));
 const utf16=index=>index<=text.length?index:undefined;
 let convert=utf16,providerIndexUnit='utf16-compatible';
 if(!matches(convert)){convert=index=>codepointOffsets[index];providerIndexUnit='unicode-codepoint';if(!matches(convert))fail();}
 const omittedPunctuation=[];
 const timedWords=subtitleType==='word'?value.flatMap(row=>row.timestamped_words.filter(word=>{
  const punctuation=/^[\s\p{P}]+$/u.test(word.word)&&(word.pronounce_word===undefined||typeof word.pronounce_word==='string'&&!word.pronounce_word.replace(/[\s\p{P}]/gu,''));
  const finite=typeof word.time_begin==='number'&&typeof word.time_end==='number'&&Number.isFinite(word.time_begin)&&Number.isFinite(word.time_end)&&word.time_begin>=0&&word.time_end>=word.time_begin&&word.time_end<=duration*1000+120;
  const outside=word.time_begin<row.time_begin-1||word.time_end>row.time_end+1;
  if(punctuation&&finite&&(outside||word.time_end===word.time_begin)){
   omittedPunctuation.push({text:word.word,textStart:convert(word.word_begin),textEnd:convert(word.word_end),start:word.time_begin/1000,end:word.time_end/1000,providerCueStart:row.time_begin/1000,providerCueEnd:row.time_end/1000,reason:outside?'outside-provider-cue':'zero-duration'});return false;
  }
  return true;
 })):[];
 if(subtitleType==='word'&&!timedWords.length)fail();
 function entries(rows,label,begin,end){
  if(label==='word'){
   // A pronunciation dictionary can map several consecutive phoneme timings
   // onto one exact source word. Keep that word's measured first/last bounds;
   // never invent times for the individual source characters within it.
   const merged=[];let rawEnd=0;
   for(const row of rows){
    if(typeof row.time_begin!=='number'||typeof row.time_end!=='number'||!Number.isFinite(row.time_begin)||!Number.isFinite(row.time_end)||row.time_begin<0||row.time_begin<rawEnd-.000001||row.time_end<=row.time_begin||row.time_end>duration*1000+120)fail();
    rawEnd=row.time_end;const prior=merged.at(-1);
    if(prior&&prior[begin]===row[begin]&&prior[end]===row[end]&&prior[label]===row[label])prior.time_end=row.time_end;
    else merged.push({...row});
   }
   rows=merged;
  }
  let timeEnd=0,textEnd=0;
  const normalized=rows.map(row=>{
   const start=row.time_begin/1000,finish=row.time_end/1000,textStart=convert(row[begin]),nextTextEnd=convert(row[end]);
   if(typeof row.time_begin!=='number'||typeof row.time_end!=='number'||!Number.isFinite(start)||!Number.isFinite(finish)||start<0||start<timeEnd-1e-9||finish<=start||finish>duration+.12||textStart<textEnd||!ignorable(text.slice(textEnd,textStart)))fail();
   timeEnd=finish;textEnd=nextTextEnd;
   return {start,end:finish,text:row[label],textStart,textEnd:nextTextEnd};
  });
  if(!ignorable(text.slice(textEnd)))fail();
  return normalized;
 }
 const cues=entries(value,'text','text_begin','text_end');
 const words=rawWords.length?entries(timedWords,'word','word_begin','word_end'):undefined;
 if(words){
  let index=0;
  for(const word of words){
   while(index<cues.length-1&&word.textStart>=cues[index].textEnd)index++;
   const cue=cues[index];
   if(word.textStart<cue.textStart||word.textEnd>cue.textEnd||word.start<cue.start-.001||word.end>cue.end+.001)fail();
  }
 }
 return {version:1,audioSha256,textSha256:sha256(text),model,voice,duration,source:'MiniMax',timingLevel:words?'word':'sentence',indexUnit:'utf16',providerIndexUnit,cues,...(words?{words}:{}),...(omittedPunctuation.length?{normalization:{omittedPunctuation}}:{})};
}
