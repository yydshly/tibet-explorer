import {build} from 'vite';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

// Measure actual static import closures, not just the largest emitted chunk.
// Usage: node scripts/measure-build.mjs qa/event-continuity/performance-baseline.json
const output=path.resolve(process.argv[2]||'qa/event-continuity/performance-build.json');
let chunks=[],outputDir;
await build({build:{manifest:true},plugins:[{
 name:'measure-delivered-javascript',
 configResolved(config){outputDir=path.resolve(config.root,config.build.outDir);},
 generateBundle(_options,bundle){
  chunks=Object.values(bundle).filter(item=>item.type==='chunk').map(chunk=>({
   file:chunk.fileName,entry:chunk.isEntry,dynamicEntry:chunk.isDynamicEntry,
   facade:chunk.facadeModuleId?.replaceAll('\\','/').split('/tibet-explorer/').at(-1)||null,
   bytes:Buffer.byteLength(chunk.code),gzipBytes:gzipSync(chunk.code).length,
   sha256:createHash('sha256').update(chunk.code).digest('hex'),
   imports:chunk.imports,dynamicImports:chunk.dynamicImports,
   modules:Object.entries(chunk.modules).map(([id,info])=>({
    id:id.replaceAll('\\','/').split('/tibet-explorer/').at(-1),renderedBytes:info.renderedLength,
   })).sort((a,b)=>b.renderedBytes-a.renderedBytes),
  }));
 },
}]});
// Later Vite plugins may finalize preload helpers in generateBundle. Read the
// written files so byte totals describe the assets the server actually serves.
await Promise.all(chunks.map(async chunk=>{
 const bytes=await readFile(path.join(outputDir,chunk.file));
 chunk.bytes=bytes.length;chunk.gzipBytes=gzipSync(bytes).length;
 chunk.sha256=createHash('sha256').update(bytes).digest('hex');
}));
const byFile=new Map(chunks.map(chunk=>[chunk.file,chunk]));
const closure=(files)=>{
 const visited=new Set();
 const visit=file=>{if(visited.has(file)||!byFile.has(file))return;visited.add(file);for(const next of byFile.get(file).imports)visit(next);};
 files.forEach(visit);
 const selected=[...visited].map(file=>byFile.get(file));
 return {files:[...visited],bytes:selected.reduce((total,item)=>total+item.bytes,0),gzipBytes:selected.reduce((total,item)=>total+item.gzipBytes,0)};
};
const entry=closure(chunks.filter(chunk=>chunk.entry).map(chunk=>chunk.file));
const dynamicEntries=chunks.filter(chunk=>chunk.dynamicEntry).map(chunk=>({facade:chunk.facade,...closure([chunk.file])}));
const homeScene=chunks.find(chunk=>chunk.facade==='src/scene/storyAtlas.ts');
const report={
 measuredAt:new Date().toISOString(),
 method:'Vite production chunks; UTF-8 bytes and per-file gzip; static imports recursively included; media/public assets excluded. Build metrics are not network timing or frame-rate measurements.',
 entryStaticClosure:entry,
 homeWithScene:homeScene?closure([...entry.files,homeScene.file]):entry,
 allJavaScript:{files:chunks.length,bytes:chunks.reduce((n,c)=>n+c.bytes,0),gzipBytes:chunks.reduce((n,c)=>n+c.gzipBytes,0)},
 dynamicEntries,chunks,
};
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,entryStaticClosure:report.entryStaticClosure,homeWithScene:report.homeWithScene,allJavaScript:report.allJavaScript},null,2));
