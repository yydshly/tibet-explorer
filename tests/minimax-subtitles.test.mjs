import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {downloadMiniMaxSubtitle,downloadMiniMaxSubtitleWithRetry,isPublicSubtitleAddress,isSubtitleProxyAddress,subtitleDownloadURL,trustedSubtitleHost,normalizeMiniMaxSubtitles} from '../server/minimax-subtitles.mjs';
import {narrationPayload} from '../server/minimax-narration.mjs';

function transport({body='[]',status=200,headers={},stall=false}={}){
 const calls=[];
 const request=(url,options,respond)=>{
  const req=new EventEmitter();let response;
  calls.push({url,options});req.destroy=()=>response?.destroy();
  req.end=()=>{
   if(stall)return;
   options.lookup(url.hostname,{all:true},(error,addresses)=>{
    if(error){queueMicrotask(()=>req.emit('error',error));return;}
    calls.at(-1).addresses=addresses;
    response=Readable.from(Array.isArray(body)?body.map(value=>Buffer.from(value)):[Buffer.from(body)]);
    response.statusCode=status;response.headers=headers;respond(response);
   });
  };
  return req;
 };
 return {request,calls};
}
const publicLookup=async()=>[{address:'93.184.216.34',family:4}];

test('download URL rejects credentials, literal IPs, local names, insecure ports and redirects before any network request',()=>{
 for(const value of ['http://example.org/sub.json','https://user:secret@example.org/sub.json','https://127.0.0.1/a','https://2130706433/a','https://8.8.8.8/a','https://[::ffff:127.0.0.1]/a','https://localhost/a','https://a.local/a','https://example.org:444/a','https://example.org/a#fragment'])assert.throws(()=>subtitleDownloadURL(value));
 assert.equal(subtitleDownloadURL('https://example.org/sub.json?signature=sample').hostname,'example.org');
});

test('public IP classifier refuses private, reserved, benchmark and expanded IPv6 documentation ranges',()=>{
 for(const value of ['0.0.0.0','10.0.0.1','127.0.0.1','100.64.0.1','169.254.169.254','172.31.1.1','192.168.0.1','192.0.2.1','198.18.3.12','2001:2::30a','2001:0db8:0000:0000:0000:0000:0000:0001','::ffff:8.8.8.8','::1','fc00::1','fe80::1'])assert.equal(isPublicSubtitleAddress(value),false,value);
 for(const value of ['93.184.216.34','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(isPublicSubtitleAddress(value),true,value);
 assert.equal(isSubtitleProxyAddress('198.18.3.12'),true);assert.equal(isSubtitleProxyAddress('2001:2::30a'),true);
 assert.equal(isSubtitleProxyAddress('2001:2:1::1'),false);assert.equal(isSubtitleProxyAddress('192.168.1.1'),false);
});

test('GET pins checked DNS addresses and never forwards Bearer, cookies or a permissive TLS configuration',async()=>{
 const fake=transport({body:'[{"text":"原生字幕"}]'});
 const result=await downloadMiniMaxSubtitle('https://example.org/sub.json',{request:fake.request,lookup:publicLookup});
 assert.deepEqual(result.value,[{text:'原生字幕'}]);
 const [{options,addresses}]=fake.calls;
 assert.deepEqual(options.headers,{Accept:'application/json'});assert.equal(options.method,'GET');assert.equal(options.agent,false);assert.equal(options.rejectUnauthorized,true);
 assert.deepEqual(addresses,[{address:'93.184.216.34',family:4}]);
});

test('DNS private or mixed answers are rejected even for the provider CDN; Fake-IP requires both exact host and official origin',async()=>{
 const proxy=async()=>[{address:'198.18.3.12',family:4},{address:'2001:2::30a',family:6}];
 const official={sourceEndpoint:'https://api.minimax.cn/v1/t2a_v2'};
 const run=(url,lookup,extra={})=>downloadMiniMaxSubtitle(url,{request:transport().request,lookup,...extra});
 await assert.rejects(run('https://example.org/a',proxy,official));
 await assert.rejects(run(`https://${trustedSubtitleHost}/a`,proxy));
 await assert.rejects(run(`https://${trustedSubtitleHost}/a`,proxy,{sourceEndpoint:'https://example.org/v1/t2a_v2'}));
 await assert.rejects(run(`https://${trustedSubtitleHost}/a`,async()=>[{address:'192.168.1.1',family:4}],official));
 await assert.rejects(run('https://example.org/a',async()=>[{address:'93.184.216.34',family:4},{address:'10.0.0.1',family:4}]));
 assert.deepEqual((await run(`https://${trustedSubtitleHost}/a`,proxy,official)).value,[]);
});

test('redirects, large declared or streamed bodies, unsupported encoding and invalid JSON are refused',async()=>{
 for(const options of [{status:302,headers:{location:'https://127.0.0.1/a'}},{headers:{'content-length':'300000'}},{body:['x'.repeat(140000),'x'.repeat(140000)]},{headers:{'content-encoding':'gzip'}},{body:'<html>not JSON</html>'}]){
  const fake=transport(options);
  await assert.rejects(downloadMiniMaxSubtitle('https://example.org/a',{request:fake.request,lookup:publicLookup}));
  assert.equal(fake.calls.length,1);
 }
});

test('a stalled download is bounded by an overall timer',async()=>{
 const fake=transport({stall:true});
 await assert.rejects(downloadMiniMaxSubtitle('https://example.org/a',{request:fake.request,lookup:publicLookup,timeoutMs:10}),/超时/);
});
test('transient GET retries are bounded; validation and 4xx responses are never retried',async()=>{
 const delays=[];let attempts=0;
 const request=(...args)=>transport({status:++attempts<3?503:200}).request(...args);
 assert.deepEqual((await downloadMiniMaxSubtitleWithRetry('https://example.org/a',{request,lookup:publicLookup,wait:async ms=>delays.push(ms)})).value,[]);
 assert.equal(attempts,3);assert.deepEqual(delays,[1000,3000]);
 for(const config of [{status:404},{status:429},{body:'not JSON'}]){
  const fake=transport(config);await assert.rejects(downloadMiniMaxSubtitleWithRetry('https://example.org/a',{request:fake.request,lookup:publicLookup,wait:async()=>assert.fail('must not retry')}));assert.equal(fake.calls.length,1);
 }
 const failed=transport({status:503}),waits=[];
 await assert.rejects(downloadMiniMaxSubtitleWithRetry('https://example.org/a',{request:failed.request,lookup:publicLookup,wait:async ms=>waits.push(ms)}));
 assert.equal(failed.calls.length,4);assert.deepEqual(waits,[1000,3000,5000]);
});

const binding={text:'甲，乙。',audioSha256:'a'.repeat(64),model:'speech-2.8-hd',voice:'voice',duration:2,subtitleType:'word'};
const source=()=>[{text:'甲，乙。',text_begin:0,text_end:4,time_begin:0,time_end:1900,timestamped_words:[
 {word:'甲',word_begin:0,word_end:1,time_begin:40,time_end:400},
 {word:'乙',word_begin:2,word_end:3,time_begin:1000,time_end:1600},
]}];
test('canonical word times retain real pauses, source gaps and exact same-audio binding',()=>{
 const result=normalizeMiniMaxSubtitles(source(),binding);
 assert.equal(result.timingLevel,'word');assert.equal(result.audioSha256,binding.audioSha256);assert.match(result.textSha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(result.words,[{start:.04,end:.4,text:'甲',textStart:0,textEnd:1},{start:1,end:1.6,text:'乙',textStart:2,textEnd:3}]);
 assert.equal(result.cues[0].end,1.9);assert.equal(result.duration,2);
});
test('normalizer refuses guessed wrappers, absent words, wrong text, missing letters, overlap and times beyond this MP3',()=>{
 const attempts=[()=>({data:source()}),()=>[],()=>[{...source()[0],timestamped_words:null}],()=>[{...source()[0],text:'伪造'}],()=>[{...source()[0],timestamped_words:source()[0].timestamped_words.slice(0,1)}],()=>[{...source()[0],timestamped_words:source()[0].timestamped_words.map((word,i)=>i?{...word,time_begin:300}:word)}],()=>[{...source()[0],time_end:3000}],()=>[{...source()[0],text_begin:-1}]];
 for(const attempt of attempts)assert.throws(()=>normalizeMiniMaxSubtitles(attempt(),binding));
});
test('provider codepoint indexes are converted only when every exact source slice proves the conversion',()=>{
 const text='甲😀乙';
 const rows=[{text,text_begin:0,text_end:3,time_begin:0,time_end:1900,timestamped_words:[{word:'甲',word_begin:0,word_end:1,time_begin:10,time_end:300},{word:'😀',word_begin:1,word_end:2,time_begin:400,time_end:700},{word:'乙',word_begin:2,word_end:3,time_begin:900,time_end:1800}]}];
 const result=normalizeMiniMaxSubtitles(rows,{...binding,text});
 assert.equal(result.providerIndexUnit,'unicode-codepoint');assert.deepEqual(result.words.map(word=>[word.textStart,word.textEnd]),[[0,1],[1,3],[3,4]]);
 const split=[{text,text_begin:0,text_end:4,time_begin:0,time_end:1900,timestamped_words:[{word:'甲',word_begin:0,word_end:1,time_begin:0,time_end:100},{word:'\ud83d',word_begin:1,word_end:2,time_begin:100,time_end:200},{word:'\ude00乙',word_begin:2,word_end:4,time_begin:200,time_end:1800}]}];
 assert.throws(()=>normalizeMiniMaxSubtitles(split,{...binding,text}));
});
test('sentence legacy mode remains explicit and no estimated words are invented',()=>{
 const result=normalizeMiniMaxSubtitles(source(),{...binding,subtitleType:'sentence'});
 assert.equal(result.timingLevel,'sentence');assert.equal(result.words,undefined);
});
test('dictionary phonemes with an identical exact source span retain one measured word boundary',()=>{
 const rows=source();rows[0].timestamped_words.splice(0,1,{word:'甲',word_begin:0,word_end:1,time_begin:40,time_end:180},{word:'甲',word_begin:0,word_end:1,time_begin:180,time_end:400});
 const result=normalizeMiniMaxSubtitles(rows,binding);
 assert.deepEqual(result.words[0],{start:.04,end:.4,text:'甲',textStart:0,textEnd:1});assert.equal(result.words.length,2);
 rows[0].timestamped_words[1].time_begin=100;assert.throws(()=>normalizeMiniMaxSubtitles(rows,binding));
});
test('observed sentence-end punctuation overrun is omitted without changing real words, provider blocks or full text',()=>{
 const rows=[{text:'原因。',text_begin:0,text_end:3,time_begin:18936,time_end:22725.342403628118,timestamped_words:[
  {word:'原',word_begin:0,word_end:1,time_begin:21900,time_end:22464.20512820513},
  {word:'因',word_begin:1,word_end:2,time_begin:22464.20512820513,time_end:22587.28205128205},
  {word:'。',word_begin:2,word_end:3,pronounce_word:'。',time_begin:22587.28205128205,time_end:22751.384615384617},
 ]}];
 const result=normalizeMiniMaxSubtitles(rows,{...binding,text:'原因。',duration:22.896});
 assert.equal(result.cues[0].text,'原因。');assert.equal(result.cues[0].end,rows[0].time_end/1000);assert.equal(result.words.length,2);assert.equal(result.words[1].end,rows[0].timestamped_words[1].time_end/1000);
 assert.equal(result.normalization.omittedPunctuation[0].reason,'outside-provider-cue');assert.equal(result.normalization.omittedPunctuation[0].end,rows[0].timestamped_words[2].time_end/1000);
 rows[0].timestamped_words[1].time_end=22751.384615384617;assert.throws(()=>normalizeMiniMaxSubtitles(rows,{...binding,text:'原因。',duration:22.896}));
});
test('legacy payload hash input is unchanged; subtitle upgrades alter only the two documented request fields',()=>{
 const legacy=narrationPayload('正文'),native=narrationPayload('正文',{subtitles:true,subtitleType:'word'});
 assert.equal(Object.hasOwn(legacy,'subtitle_enable'),false);
 const {subtitle_enable,subtitle_type,...same}=native;
 assert.equal(subtitle_enable,true);assert.equal(subtitle_type,'word');assert.deepEqual(same,legacy);
 assert.throws(()=>narrationPayload('正文',{subtitles:true,subtitleType:'word_streaming'}));
});
