import {describe,it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {buildStoryAtlasScene,storyAtlasPosition,STORY_ATLAS_META} from '../src/scene/storyAtlas';
import {sampleRegionalSurfaceMetres} from '../src/scene/regionalTerrainSurface';
import {localDisplayMetres,sampleLocalMetres,LOCAL_MAP_VERTICAL_EXAGGERATION} from '../src/scene/cityLocalMap';
import {regionalTerrainMeta as meta} from '../src/data/terrainMetadata';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';
vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;}}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const at=(city,index,t)=>{const from=cityContinuityPartProgress(city,index),end=index===2?(city==='nyingchi'?.34:city==='lhasa'?.68:1):cityContinuityPartProgress(city,index+1);return from+(end-from)*t;};
const find=(root,kind)=>{const found=[];root.traverse(o=>{if(o.userData.kind===kind)found.push(o);});return found;};
const unit=47*111320*Math.cos(29.5*Math.PI/180)/STORY_ATLAS_META.width;
const readGrid=url=>{const bytes=readFileSync(`public${url}`);return Int16Array.from({length:bytes.length/2},(_,i)=>bytes.readInt16LE(i*2));};

describe('regional terrain remains underneath local and airport road cameras',()=>{
 it('samples the actual PlaneGeometry triangles rather than hovering over a bilinear saddle',()=>{
   const grid=new Int16Array(meta.columns*meta.rows);grid[0]=0;grid[1]=1000;grid[meta.columns]=2000;grid[meta.columns+1]=0;
   const sample=(x,y)=>sampleRegionalSurfaceMetres(grid,meta.west+x/(meta.columns-1)*(meta.east-meta.west),meta.north-y/(meta.rows-1)*(meta.north-meta.south));
   expect(sample(.25,.25)).toBeCloseTo(750,6);expect(sample(.75,.75)).toBeCloseTo(750,6);expect(sampleRegionalSurfaceMetres(grid,meta.west-.1,meta.north)).toBeUndefined();
 });
 it('joins fine-window display edges to the true regional surface while retaining original fine samples in the interior',()=>{
   const manifest=JSON.parse(readFileSync('public/assets/terrain/local-places/manifest.json','utf8')),regional=readGrid(meta.dataUrl),read=(lon,lat)=>sampleRegionalSurfaceMetres(regional,lon,lat);
   for(const place of manifest.places){const grid=readGrid(place.dataUrl),[w,s,e,n]=place.bbox,c=[(w+e)/2,(s+n)/2],original=grid[0];
     for(const p of [[w,c[1]],[e,c[1]],[c[0],s],[c[0],n]])expect(localDisplayMetres(grid,place,...p,read)).toBeCloseTo(read(...p),8);
     expect(localDisplayMetres(grid,place,...c,read)).toBe(sampleLocalMetres(grid,place,...c));expect(grid[0]).toBe(original);
   }
 });
 it('keeps a complete, visibly shaded real source mesh under both Nyingchi corridor legs, G219 and the Shiquanhe patch edge',async()=>{
   vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,load)=>{const texture=new THREE.Texture();load?.(texture);return texture;});
   vi.stubGlobal('fetch',vi.fn(async url=>{try{const bytes=readFileSync(`public${url}`);return {ok:true,json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}catch{return {ok:false};}}));
   const camera=new THREE.PerspectiveCamera(43,1280/720,.00001,300),model=buildStoryAtlasScene({camera,renderer:{getSize:v=>v.set(1280,720),capabilities:{getMaxAnisotropy:()=>8}},sun:new THREE.DirectionalLight(),hasSavedView:()=>false,focus:(p,t)=>{camera.position.copy(p);camera.lookAt(t);camera.updateMatrixWorld();}});
   await model.ready;const terrain=find(model.group,'sourced-dem')[0],geometryId=terrain.geometry.uuid,positions=terrain.geometry.attributes.position,colours=terrain.geometry.attributes.atlasTerrainColour,colourVersion=colours.version,originalColours=colours.array.slice();
   expect(positions.count).toBe(meta.columns*meta.rows);expect(terrain.geometry.attributes.atlasTerrainColour.count).toBe(positions.count);
   const background=model.group.children.find(o=>o instanceof THREE.Mesh&&o.material.depthWrite===false&&o.renderOrder===-10);expect(background).toBeDefined();expect(background.receiveShadow).toBe(false);expect(terrain.receiveShadow).toBe(false);
   const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <clipping_planes_fragment>\n#include <map_fragment>'};terrain.material.onBeforeCompile(shader);
   expect(shader.fragmentShader).toContain('mix(diffuseColor.rgb,atlasHeightTint,atlasLocalActive)');
   const props={scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:5,selected:'city:nyingchi',cityLifeServices:true,cityAccessTransfer:true,comparisonRelief:true,resetKey:0};
   for(const [city,index,t]of [['nyingchi',2,.25],['nyingchi',2,.75],['ngari',1,.5],['ngari',2,.8]]){
     model.update({...props,progress:at(city,index,t)},0,0);model.group.updateMatrixWorld(true);
     const place=find(model.group,'actual-local-geography').find(o=>o.visible),bbox=place.userData.bbox;
     expect(find(place,'actual-local-dem')[0].receiveShadow).toBe(false);
     expect(terrain.visible).toBe(true);expect(terrain.geometry.uuid).toBe(geometryId);expect(shader.uniforms.atlasLocalActive.value).toBe(1);expect(shader.uniforms.atlasOutsideStrength.value).toBe(0);
     expect(colours.version).toBe(colourVersion);
     const window=shader.uniforms.atlasLocalWindow.value,west=storyAtlasPosition(bbox[0],bbox[3]),east=storyAtlasPosition(bbox[2],bbox[1]);expect(window.x).toBeCloseTo(west.x,6);expect(window.z).toBeCloseTo(east.x,6);
     const route=find(place,'actual-osm-connected-use-path')[0];
     const event=place.userData.event,source=JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json','utf8')).routes;
     const ids=event.routeId==='mainling-s4-to-lulang-g318'?['mainling-airport-nyingchi-s4','nyingchi-lulang-g318']:[event.routeId];
     const coordinates=ids.flatMap((id,index)=>source.find(r=>r.id===id)?.coordinates.slice(index?1:0)??[]),road=route.geometry.attributes.position;expect(road.count).toBe(coordinates.length);
     let checked=0,maxOffset=0,maxHorizontalError=0;
     for(let i=0;i<coordinates.length;i+=Math.max(1,Math.floor(coordinates.length/35))){const [lon,lat]=coordinates[i];if(lon>=bbox[0]&&lon<=bbox[2]&&lat>=bbox[1]&&lat<=bbox[3])continue;
       const fx=(lon-meta.west)/(meta.east-meta.west)*(meta.columns-1),fy=(meta.north-lat)/(meta.north-meta.south)*(meta.rows-1),x=Math.min(meta.columns-2,Math.floor(fx)),y=Math.min(meta.rows-2,Math.floor(fy)),a=y*meta.columns+x,dx=fx-x,dy=fy-y;
       const surface=dx+dy<=1?positions.getY(a)+(positions.getY(a+1)-positions.getY(a))*dx+(positions.getY(a+meta.columns)-positions.getY(a))*dy:positions.getY(a+meta.columns+1)+(positions.getY(a+meta.columns)-positions.getY(a+meta.columns+1))*(1-dx)+(positions.getY(a+1)-positions.getY(a+meta.columns+1))*(1-dy);
       const expected=storyAtlasPosition(lon,lat);maxHorizontalError=Math.max(maxHorizontalError,Math.abs(road.getX(i)-expected.x),Math.abs(road.getZ(i)-expected.z));maxOffset=Math.max(maxOffset,Math.abs(road.getY(i)-surface-14/unit));checked++;
     }
     if(index!==2||city==='nyingchi')expect(checked).toBeGreaterThan(10);expect(maxOffset).toBeLessThan(1e-7);
     expect(maxHorizontalError).toBeLessThan(1e-6);
     expect(route.geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
     if(city==='ngari'&&index===1)expect(event.routeId).toBe('gunsa-airport-shiquanhe');
   }
   model.update({...props,step:4,progress:.68+.32*(.52+.24*.5)},0,0);const modern=find(model.group,'actual-local-geography').find(o=>o.visible);expect(modern.userData.localityId).toBe('shiquanhe');expect(modern.userData.event.routeId).toBe('gunsa-airport-shiquanhe');expect(modern.userData.event.transfer).toBe(true);
   model.update({...props,step:4,progress:.68+.32*(.52+.24*.5),cityAccessTransfer:false},0,0);expect(modern.userData.event.holder).toBe('arrival');
   expect(colours.array.every((value,index)=>value===originalColours[index])).toBe(true);
   model.dispose();
 });
});
