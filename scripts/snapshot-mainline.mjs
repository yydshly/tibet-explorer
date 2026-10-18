import fs from 'node:fs/promises';
import {build} from 'esbuild';
const out=await build({entryPoints:['src/data/overviewProgram.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {overviewMainProgram:p}=await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const m=JSON.parse(await fs.readFile('public/assets/audio/narration/cue-manifest.json','utf8'));
try{await fs.access('qa/mainline-editorial-20261018/before.json');throw Error('Baseline already exists; never overwrite the original programme.');}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.writeFile('qa/mainline-editorial-20261018/before.json',JSON.stringify({chapters:p.chapters.map(c=>({id:c.id,title:c.title,beats:c.beats.map(b=>({id:b.id,recordingId:b.recordingId,title:b.title,duration:m.clips.find(x=>x.cueId===b.recordingId&&x.text===b.text)?.duration}))}))},null,2));
