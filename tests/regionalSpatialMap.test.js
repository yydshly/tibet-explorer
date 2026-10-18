import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {buildRegionalSpatialMap,REGIONAL_SPATIAL_RELIEF,spatialHistoryYear,spatialRouteFor,regionalSpatialLandmark,regionalSpatialUnlocatedLabel} from '../src/scene/regionalSpatialMap';
import {localDisplayMetres} from '../src/scene/cityLocalMap';
import {decodeEvolutionYears,evolutionCellBounds} from '../src/lib/regionalEvolution';
import evolution from '../public/data/regional-places/evolution-manifest.json';
import terrain from '../public/data/regional-places/terrain/manifest.json';

vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;
}}));

const cities=['shigatse','shannan','chamdo','nagqu'];
const files=new Map();
const file=url=>{if(!files.has(url))files.set(url,readFileSync(new URL(`../public${url}`,import.meta.url)));return files.get(url);};
const buffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const json=url=>JSON.parse(file(url).toString('utf8'));
const response=url=>({ok:true,json:async()=>json(url),arrayBuffer:async()=>buffer(file(url))});
const kind=(root,value)=>{const nodes=[];root.traverse(object=>{if(object.userData.kind===value)nodes.push(object);});return nodes;};
const visible=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
const settings=(extra={})=>({scene:'region',layer:'atlas-regional-journey',selected:'city:shigatse',step:2,regionalCue:3,regionalCloseView:true,regionalSpatialYear:1985,regionalProcess:true,regionalAccessTransfer:true,progress:0,season:1,playing:false,cutaway:false,resetKey:0,onSelect:()=>{},onInteract:()=>{},...extra});

function fixture(city,options={}){
 const camera=new THREE.PerspectiveCamera(43,1.6,.01,300);camera.position.set(2,20,20);camera.lookAt(2,7,0);camera.updateMatrixWorld();
 const focus=vi.fn((position,target)=>{camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();});
 const project=(lon,lat,height)=>new THREE.Vector3((lon-90)*96.4,height,-(lat-30)*111.32);
 const regionalMetres=options.regionalMetres??(()=>3500);
 const model=buildRegionalSpatialMap({camera,project,metresPerUnit:1000,regionalMetres,regionalReady:options.regionalReady,focus},city);
 const meta=terrain.places.find(item=>item.id===city),raw=file(meta.dataUrl),grid=new Int16Array(raw.length/2);
 for(let i=0;i<grid.length;i++)grid[i]=raw.readInt16LE(i*2);
 const at=(p,offset=0)=>project(p[0],p[1],(localDisplayMetres(grid,meta,p[0],p[1],regionalMetres)*REGIONAL_SPATIAL_RELIEF+offset)/1000);
 return {model,focus,meta,grid,at,size:new THREE.Vector2(1280,800)};
}
afterEach(()=>vi.unstubAllGlobals());

describe('acquired regional city space preserves source geometry while its own media position drives effects',()=>{
 it.each(cities)('%s loads only its own collection, keeps every native DEM sample and renders exact 30m detection cells',async city=>{
  const calls=[];vi.stubGlobal('fetch',vi.fn(async(url,options)=>{calls.push([url,options.signal]);return response(url);}));
  const source=json(`/data/regional-places/${city}.geojson`),snapshot=JSON.stringify(source),f=fixture(city),info=[];
  await f.model.ready;expect(f.model.group.userData.ready).toBe(true);expect(f.model.group.userData.error).toBeUndefined();
  expect(calls.filter(([url])=>url.endsWith('.geojson')).map(([url])=>url)).toEqual([`/data/regional-places/${city}.geojson`,...(city==='chamdo'?['/data/regional-places/chamdo-bangda.geojson']:[])]);
  expect(new Set(calls.map(([,signal])=>signal)).size).toBe(1);
  const state=settings({selected:`city:${city}`,onRegionalSpatialInfo:value=>info.push(value)});f.model.update(state,f.size);
  expect(f.model.active().bbox).toEqual(f.meta.bbox);
  const surface=kind(f.model.group,'regional-fine-source-dem')[0];
  expect(surface.geometry.attributes.position.count).toBe(f.meta.columns*f.meta.rows);
  expect(surface.geometry.index.count).toBe((f.meta.columns-1)*(f.meta.rows-1)*6);
  const middle=Math.floor(f.meta.rows/2)*f.meta.columns+Math.floor(f.meta.columns/2);
  const lon=f.meta.bbox[0]+(f.meta.bbox[2]-f.meta.bbox[0])*Math.floor(f.meta.columns/2)/(f.meta.columns-1),lat=f.meta.bbox[3]-(f.meta.bbox[3]-f.meta.bbox[1])*Math.floor(f.meta.rows/2)/(f.meta.rows-1);
  expect(surface.geometry.attributes.position.getY(middle)).toBeCloseTo(f.at([lon,lat]).y,5);
  const window=evolution.windows.find(item=>item.id===city),years=decodeEvolutionYears(buffer(file(window.dataUrl)),window);
  const baselineIndex=years.findIndex(year=>year===1985),pixel=evolutionCellBounds(window,baselineIndex);
  const overlays=kind(f.model.group,'actual-wsf-first-detection-pixels');
  expect(overlays.reduce((sum,mesh)=>sum+mesh.userData.pixelCount,0)).toBe(window.cumulativePixelCounts['1985']);
  const baseline=overlays.find(mesh=>mesh.userData.baseline),first=f.at([pixel.west,pixel.north],8);
  expect(baseline.geometry.attributes.position.getX(0)).toBeCloseTo(first.x,4);expect(baseline.geometry.attributes.position.getY(0)).toBeCloseTo(first.y,5);expect(baseline.geometry.attributes.position.getZ(0)).toBeCloseTo(first.z,4);
  expect(new THREE.Color(baseline.material.color).getHexString()).toBe('71d8dc');
  const terrainBefore=Array.from(surface.geometry.attributes.position.array);
  const footprints=kind(f.model.group,'acquired-building-footprint'),footprintBefore=footprints.map(mesh=>[mesh.userData.featureId,Array.from(mesh.geometry.attributes.position.array)]);
  f.model.update({...state,regionalSpatialYear:2015},f.size);
  expect(kind(f.model.group,'actual-wsf-first-detection-pixels').reduce((sum,mesh)=>sum+mesh.userData.pixelCount,0)).toBe(window.detectedPixels);
  expect(kind(f.model.group,'actual-wsf-first-detection-pixels').find(mesh=>!mesh.userData.baseline).material.color.getHex()).toBe(0xf0b85d);
  f.model.update({...state,regionalSpatialYear:2005},f.size);
  expect(kind(f.model.group,'actual-wsf-first-detection-pixels').reduce((sum,mesh)=>sum+mesh.userData.pixelCount,0)).toBe(window.cumulativePixelCounts['2005']);
  f.model.update(state,f.size);
  expect(kind(f.model.group,'actual-wsf-first-detection-pixels').reduce((sum,mesh)=>sum+mesh.userData.pixelCount,0)).toBe(window.cumulativePixelCounts['1985']);
  expect(Array.from(surface.geometry.attributes.position.array)).toEqual(terrainBefore);
  expect(footprints.map(mesh=>[mesh.userData.featureId,Array.from(mesh.geometry.attributes.position.array)])).toEqual(footprintBefore);
  expect(JSON.stringify(json(`/data/regional-places/${city}.geojson`))).toBe(snapshot);
  expect(info.at(-1).pixels).toBe(window.cumulativePixelCounts['1985']);
  f.model.dispose();
 });

 it.each(cities)('%s uses acquired connected road points, reverses the same carrier, and holds arrival when transfer is off',async city=>{
  vi.stubGlobal('fetch',vi.fn(async url=>response(url)));const f=fixture(city);await f.model.ready;
  const routes=[...json(`/data/regional-places/${city}-routes.json`).routes,...(city==='chamdo'?json('/data/regional-places/chamdo-airport-routes.json').routes:[])],chosen=spatialRouteFor(city,routes,2),snapshot=JSON.stringify(chosen);
  const state=settings({selected:`city:${city}`,step:3,regionalCue:2,regionalSpatialYear:undefined,progress:.85});f.model.update(state,f.size);
  const carrier=kind(f.model.group,'same-carrier-on-acquired-road')[0],trace=kind(f.model.group,'actual-shared-node-road-route')[0],late=carrier.position.clone();
  expect(visible(carrier)).toBe(true);expect(trace.userData.routeId).toBe(chosen.id);expect(trace.geometry.attributes.position.count).toBe(chosen.coordinates.length);
  const first=f.at(chosen.coordinates[0],5),last=f.at(chosen.coordinates.at(-1),5),positions=trace.geometry.attributes.position;
  expect(positions.getX(0)).toBeCloseTo(first.x,4);expect(positions.getZ(0)).toBeCloseTo(first.z,4);expect(positions.getX(positions.count-1)).toBeCloseTo(last.x,4);expect(positions.getY(positions.count-1)).toBeCloseTo(last.y,5);
  f.model.update({...state,progress:.2},f.size);expect(carrier.position.equals(late)).toBe(false);
  f.model.update(state,f.size);expect(carrier.position.equals(late)).toBe(true);
  f.model.update({...state,regionalAccessTransfer:false},f.size);expect(carrier.position.x).toBeCloseTo(first.x,9);expect(carrier.position.z).toBeCloseTo(first.z,9);expect(carrier.userData.holder).toBe('已暂停地方接续');
  expect(visible(kind(f.model.group,'source-road-end-use')[0])).toBe(false);
  f.model.update({...state,progress:1},f.size);expect(carrier.position.x).toBeCloseTo(last.x,9);expect(carrier.position.z).toBeCloseTo(last.z,9);expect(visible(kind(f.model.group,'source-road-end-use')[0])).toBe(true);
  f.model.update({...state,regionalProcess:false},f.size);expect(visible(carrier)).toBe(false);expect(f.model.group.visible).toBe(true);
  expect(JSON.stringify(chosen)).toBe(snapshot);
  f.model.update({...state,regionalCloseView:false},f.size);expect(f.model.active()).toBeUndefined();expect(f.model.group.visible).toBe(false);
  f.model.dispose();
 });

 it('requires the exact original detection values, rather than merely a compatible binary length',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>{
   if(url.includes('shigatse.years.bin'))return {ok:true,arrayBuffer:async()=>{const raw=buffer(file(url));new DataView(raw).setUint16(0,1986,true);return raw;}};
   return response(url);
  }));const f=fixture('shigatse'),info=[];await f.model.ready;f.model.update(settings({onRegionalSpatialInfo:value=>info.push(value)}),f.size);
  expect(f.model.group.userData.error).toMatch(/detection counts/);expect(f.model.group.visible).toBe(false);expect(f.model.active()).toBeUndefined();expect(info.at(-1).status).toBe('error');f.model.dispose();
 });

 it('disposal aborts its own pending requests and ignores late JSON, errors, geometry and status publication',async()=>{
  const pending=[],signals=[],info=[];vi.stubGlobal('fetch',vi.fn((url,options)=>{signals.push(options.signal);return new Promise(resolve=>pending.push(()=>resolve(response(url))));}));
  const f=fixture('nagqu');expect(pending).toHaveLength(4);f.model.dispose();expect(signals.every(signal=>signal.aborted)).toBe(true);
  pending.forEach(resolve=>resolve());await f.model.ready;f.model.update(settings({onRegionalSpatialInfo:value=>info.push(value)}),f.size);
  expect(f.model.group.children).toHaveLength(0);expect(f.model.group.visible).toBe(false);expect(f.model.group.userData.error).toBeUndefined();expect(info).toEqual([]);f.model.dispose();
 });

 it('a missing optional airport extract preserves the acquired Chamdo city/bridge without inventing an airport link',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>url.includes('airport-routes')?{ok:false}:response(url)));
  const f=fixture('chamdo');await f.model.ready;f.model.update(settings({step:3,regionalCue:0,regionalSpatialYear:undefined}),f.size);
  expect(f.model.group.userData.ready).toBe(true);expect(f.model.group.userData.routeId).toBe('chamdo-cross-river');expect(f.model.group.userData.error).toBeUndefined();
  expect(kind(f.model.group,'acquired-area').some(mesh=>mesh.userData.collectionId==='chamdo-bangda')).toBe(false);f.model.dispose();
 });

 it('binary requests also share the owned cancellation signal and cannot construct after late completion',async()=>{
  const pending=[],signals=[];vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
   signals.push(options.signal);
   return url.endsWith('.bin')||url.endsWith('.int16')?{ok:true,arrayBuffer:()=>new Promise(resolve=>pending.push(()=>resolve(buffer(file(url)))))}:response(url);
  }));
  const f=fixture('shigatse');for(let tick=0;tick<8&&pending.length<2;tick++)await Promise.resolve();
  expect(pending).toHaveLength(2);f.model.dispose();expect(signals.every(signal=>signal.aborted)).toBe(true);pending.forEach(resolve=>resolve());await f.model.ready;
  expect(f.model.group.children).toHaveLength(0);expect(f.model.group.userData.ready).toBeUndefined();expect(f.model.group.userData.error).toBeUndefined();
 });

 it('the airport arrival direction is independently sourced, rather than a reversed one-way departure road',()=>{
  const routes=json('/data/regional-places/chamdo-airport-routes.json').routes,arrival=spatialRouteFor('chamdo',routes,0),departure=routes.find(route=>route.id==='chamdo-airport-transfer');
  expect(arrival.id).toBe('chamdo-airport-arrival');expect(arrival.coordinates).not.toEqual([...departure.coordinates].reverse());
  expect(arrival.startGapMetres).toBe(departure.endGapMetres);expect(arrival.endGapMetres).toBe(departure.startGapMetres);
 });

 it('history cue targets use the declared place, leaving unlocated festivals, dances and the Karuo dig unassigned',()=>{
  const expected={shigatse:['way/140501939','way/140501939','way/140501939'],shannan:['way/131280233','way/131280233',undefined],chamdo:[undefined,'way/449021629',undefined],nagqu:[undefined,undefined,undefined]};
  for(const city of cities){const {landmarks}=json(`/data/regional-places/${city}-routes.json`);for(let cue=0;cue<3;cue++)expect(regionalSpatialLandmark(city,2,cue,landmarks)?.featureId).toBe(expected[city][cue]);expect(regionalSpatialLandmark(city,2,3,landmarks)).toBeUndefined();}
  expect(regionalSpatialUnlocatedLabel('chamdo',2,0)).toContain('未取得遗址');expect(regionalSpatialUnlocatedLabel('nagqu',2,0)).toContain('不定位赛场');
 });

 it('Qambaling is its acquired place-class polygon; Karuo and Guozhuang never highlight that unrelated object',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>response(url)));const f=fixture('chamdo');await f.model.ready;
  const heritage=kind(f.model.group,'acquired-area').find(mesh=>mesh.userData.featureId==='way/449021629');expect(heritage.geometry.attributes.position.count).toBeGreaterThan(0);
  const info=[],state=settings({regionalCue:1,regionalSpatialYear:undefined,onRegionalSpatialInfo:value=>info.push(value)});f.model.update(state,f.size);expect(heritage.material.emissive.getHex()).not.toBe(0);expect(info.at(-1).featureId).toBe('way/449021629');
  for(const regionalCue of [0,2]){f.model.update({...state,regionalCue},f.size);expect(heritage.material.emissive.getHex()).toBe(0);expect(info.at(-1).featureId).toBeUndefined();}
  f.model.dispose();
 });

 it('Nagqu logistics reads actual siding geometry, labels freight scope and never animates unverified unloading',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>response(url)));const f=fixture('nagqu');await f.model.ready;
  const state=settings({step:3,regionalCue:1,regionalSpatialYear:undefined,progress:1});f.model.update(state,f.size);
  const route=json('/data/regional-places/nagqu-routes.json').routes.find(item=>item.id==='nagqu-rail-yard'),trace=kind(f.model.group,'actual-shared-node-road-route')[0],carrier=kind(f.model.group,'same-carrier-on-acquired-road')[0];
  expect(trace.userData.routeId).toBe(route.id);expect(trace.geometry.attributes.position.count).toBe(route.coordinates.length);expect(carrier.userData.mode).toBe('freight-reading');expect(carrier.userData.holder).toContain('非客运或物流园边界');expect(visible(kind(f.model.group,'source-road-end-use')[0])).toBe(false);
  const restrictions=[...kind(f.model.group,'acquired-network-line'),...kind(f.model.group,'acquired-network-batch')].filter(line=>line.userData.restricted);expect(restrictions.length).toBeGreaterThan(0);expect(restrictions.every(line=>line.material instanceof THREE.LineDashedMaterial&&line.material.opacity===.25)).toBe(true);
  f.model.update({...state,regionalAccessTransfer:false},f.size);expect(carrier.userData.progress).toBe(0);expect(carrier.userData.holder).toContain('已暂停货运');f.model.dispose();
 });

 it('Shannan cargo evidence cannot turn its passenger building or city road into a surveyed freight yard',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>response(url)));const f=fixture('shannan');await f.model.ready;const info=[];f.model.update(settings({step:3,regionalCue:1,regionalSpatialYear:undefined,onRegionalSpatialInfo:value=>info.push(value)}),f.size);
  expect(visible(kind(f.model.group,'same-carrier-on-acquired-road')[0])).toBe(false);expect(info.at(-1).featureId).toBeUndefined();expect(info.at(-1).routeTitle).toBeUndefined();expect(info.at(-1).phase).toContain('客站不作货场');f.model.dispose();
 });

 it('fine geometry waits for global elevations so boundary blending is fixed once, and bounds include actual high peaks',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>response(url)));let finish,available=false;const regionalReady=new Promise(resolve=>{finish=resolve;}),f=fixture('shigatse',{regionalReady,regionalMetres:()=>available?3500:undefined});
  for(let tick=0;tick<25;tick++)await Promise.resolve();expect(f.model.group.userData.ready).toBeUndefined();expect(kind(f.model.group,'regional-fine-source-dem')).toHaveLength(0);available=true;finish();await f.model.ready;
  f.model.update(settings(),f.size);const mesh=kind(f.model.group,'regional-fine-source-dem')[0];expect(f.model.active().bounds.min.y).toBe(mesh.geometry.boundingBox.min.y);expect(f.model.active().bounds.max.y).toBe(mesh.geometry.boundingBox.max.y);expect(mesh.geometry.attributes.position.getY(0)).toBeCloseTo(3500*REGIONAL_SPATIAL_RELIEF/1000,6);f.model.dispose();
 });

 it('missing global elevations retain Chamdo core terrain while airport/corridor geometry never falls back to sea level',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>response(url)));const f=fixture('chamdo',{regionalMetres:()=>undefined});await f.model.ready;expect(f.model.group.userData.ready).toBe(true);
  const info=[];f.model.update(settings({step:3,regionalCue:0,regionalSpatialYear:undefined,onRegionalSpatialInfo:value=>info.push(value)}),f.size);expect(f.model.group.visible).toBe(true);expect(kind(f.model.group,'regional-fine-source-dem')).toHaveLength(1);expect(kind(f.model.group,'acquired-area').some(mesh=>mesh.userData.collectionId==='chamdo-bangda')).toBe(false);expect(kind(f.model.group,'actual-shared-node-road-route')).toHaveLength(0);expect(info.at(-1).error).toContain('高程缺失');expect(info.at(-1).phase).toContain('外围接续暂不显示');f.model.dispose();
 });

 it('the source-word position chooses discrete years without interpolating or confusing earlier dates',()=>{
  const text='1985年是序列起点。到2005年，再到2015年。';
  expect(spatialHistoryYear(text,0)).toBe(1985);expect(spatialHistoryYear(text,(text.indexOf('2005')+.1)/text.length)).toBe(2005);expect(spatialHistoryYear(text,1)).toBe(2015);expect(spatialHistoryYear(text,.9,1985)).toBe(1985);expect(spatialHistoryYear(text,0,1994)).toBe(1985);
 });
});
