import {build} from 'vite';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve,relative,dirname} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';

// Inspect Rollup's emitted graph without publishing or replacing dist. Chunk
// relocation alone is not a reduction: count the complete static import closure.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const outputIndex=process.argv.indexOf('--output');
const output=outputIndex<0?undefined:process.argv[outputIndex+1];
if(outputIndex>=0&&!output)throw new Error('--output requires a file path.');
const normalized=id=>relative(root,id).replaceAll('\\','/');
const moduleGraph=new Map();
const result=await build({root,configFile:resolve(root,'vite.config.mjs'),logLevel:'warn',build:{write:false},plugins:[{
 name:'inspect-entry-graph',
 generateBundle(){
  for(const id of this.getModuleIds()){
   const info=this.getModuleInfo(id);
   moduleGraph.set(id,{staticImporters:info?.importers.map(normalized)??[],dynamicImporters:info?.dynamicImporters.map(normalized)??[]});
  }
 }
}]});
// Use the returned output after every plugin's generateBundle hook has run.
// Vite may still replace preload maps after our inspection hook executes.
const outputs=Array.isArray(result)?result:[result];
const chunks=outputs.flatMap(value=>'output' in value?value.output:[]).filter(item=>item.type==='chunk');
if(!chunks.length)throw new Error('No production graph emitted.');
const byName=new Map(chunks.map(chunk=>[chunk.fileName,chunk]));
const closure=(entry,includeDynamic=false)=>{
 const visited=new Set();
 const visit=name=>{if(visited.has(name)||!byName.has(name))return;visited.add(name);const chunk=byName.get(name);[...chunk.imports,...(includeDynamic?chunk.dynamicImports:[])].forEach(visit);};
 visit(entry);return [...visited];
};
const bytes=names=>names.reduce((sum,name)=>sum+Buffer.byteLength(byName.get(name).code),0);
const gzipBytes=names=>names.reduce((sum,name)=>sum+gzipSync(byName.get(name).code).byteLength,0);
const entries=chunks.filter(chunk=>chunk.isEntry).map(chunk=>{
 const staticFiles=closure(chunk.fileName),reachableFiles=closure(chunk.fileName,true);
 return {file:chunk.fileName,staticFiles,staticBytes:bytes(staticFiles),staticGzipBytes:gzipBytes(staticFiles),reachableFiles,reachableBytes:bytes(reachableFiles),reachableGzipBytes:gzipBytes(reachableFiles)};
});
const initialNames=new Set(entries.flatMap(entry=>entry.staticFiles));
const modules=chunks.flatMap(chunk=>Object.entries(chunk.modules).filter(([,info])=>info.renderedLength>0).map(([id,info])=>({id:normalized(id),chunk:chunk.fileName,initial:initialNames.has(chunk.fileName),renderedLength:info.renderedLength,originalLength:info.originalLength,...moduleGraph.get(id)}))).sort((a,b)=>b.renderedLength-a.renderedLength);
const graph={schemaVersion:1,generatedAt:new Date().toISOString(),method:'Final Vite production output after all generateBundle hooks, write:false; minified emitted chunk UTF-8 bytes; per-file gzip; rendered module lengths are Rollup pre-minification attribution, not transfer bytes.',entries,totalJavaScriptBytes:bytes([...byName.keys()]),totalJavaScriptGzipBytes:gzipBytes([...byName.keys()]),chunks:chunks.map(chunk=>({file:chunk.fileName,entry:chunk.isEntry,dynamicEntry:chunk.isDynamicEntry,initial:initialNames.has(chunk.fileName),bytes:Buffer.byteLength(chunk.code),gzipBytes:gzipSync(chunk.code).byteLength,imports:chunk.imports,dynamicImports:chunk.dynamicImports,modules:Object.keys(chunk.modules).map(normalized)})).sort((a,b)=>b.bytes-a.bytes),modules};
if(output){const path=resolve(root,output);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(graph,null,2)+'\n');}
console.log(JSON.stringify({entries:graph.entries.map(({reachableFiles,...entry})=>({...entry,reachableFileCount:reachableFiles.length})),totalJavaScriptBytes:graph.totalJavaScriptBytes,totalJavaScriptGzipBytes:graph.totalJavaScriptGzipBytes,largestInitialModules:graph.modules.filter(module=>module.initial).slice(0,24),...(output?{output}:{} )},null,2));
