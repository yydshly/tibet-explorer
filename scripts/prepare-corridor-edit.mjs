// An editorial manifest only. All existing geometry/pixels/recordings are read-only.
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const load=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function moduleAt(p){const r=await build({entryPoints:[p],bundle:true,platform:'node',format:'esm',write:false});return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);}
const {corridorBeats,corridorShots}=await moduleAt('src/data/corridorJourney.ts'),{pilotTerrainContext}=await moduleAt('src/scene/routePilotTerrainData.ts');
const manifest=await load('public/assets/audio/narration/cue-manifest.json');
const assets=corridorBeats.map(b=>manifest.clips.find(c=>c.cueId===b.recordingId&&c.text===b.text));if(assets.some(a=>!a||a.timingLevel!=='word'))throw Error('Missing native recording');
const wordStart=async(i,phrase)=>{const a=assets[i],t=await load('public'+a.subtitleUrl),at=a.text.indexOf(phrase);if(at<0)throw Error('Missing phrase');const w=t.words.find(w=>w.textStart<=at&&w.textEnd>at);if(!w)throw Error('Missing native word');return w.start;};
const durations=assets.map(a=>a.duration),culture=await wordStart(3,'认识人文'),end=await wordStart(5,'看完这段');
const shotSeconds=[durations[0],durations[1],durations[2],culture,durations[3]-culture,durations[4],end,durations[6]+durations[7],durations[8]];
shotSeconds.forEach((s,i)=>{if(s>corridorShots[i][4])throw Error(`Shot ${corridorShots[i][0]} exceeds budget`);});
const m=await load('public/assets/routes/g318/manifest.json'),route=await load('public/assets/routes/g318/route.json'),place=await load('public/assets/routes/g318/lulang.geojson');
const bytes=await fs.readFile('public'+m.elevation.url),grid=new Int16Array(m.columns*m.rows);for(let i=0;i<grid.length;i++)grid[i]=bytes.readInt16LE(i*2);
const ctx=pilotTerrainContext(m,grid,route,place),source=await load('public/project-review/corridor-evidence/g318-source-chain.geojson'),ids=source.properties.sourceNodeIds;
const indices=[0,source.geometry.coordinates.findIndex(p=>p.every((v,i)=>v===route.coordinates[ctx.highestIndex][i])),ids.indexOf(7365874802),ids.indexOf(841483794),ids.length-1];
if(indices.some(i=>i<0))throw Error('Missing original route marker');
const names=['林芝城区附近','色季拉山地 · 沿线高样本','鲁朗 · 国道接续点','通麦 · 原路节点','波密 · 扎木镇附近'],roles=['城市河谷','高差与视野','谷地与生活','跨河与穿山','街道与交往'];
const result={version:1,source:'/project-review/corridor-evidence/g318-source-chain.geojson',durations,tongmaiEnd:end/durations[5],lulangCultureRaw:culture/durations[3],totalSeconds:shotSeconds.reduce((a,b)=>a+b,0),shotSeconds,markers:indices.map((index,i)=>({name:names[i],role:roles[i],coordinate:source.geometry.coordinates[index],sourceNode:ids[index],index})),
 policy:'Three existing terrain/image footprints only,overview downsampled from existing grids; no generated terrain beyond bounds. Existing recordings are unmodified. R03/R04 share one recording; R06 omits only its standalone return invitation. Old local closing clips are not repeated. Observation plans are optional and outside auto-play duration.'};
await fs.mkdir('public/assets/routes/g318-corridor',{recursive:true});await fs.writeFile('public/assets/routes/g318-corridor/edit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({totalSeconds:result.totalSeconds,shotSeconds}));
