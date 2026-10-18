import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {batchRegionalNetwork} from '../src/scene/regionalNetworkBatch';

const network=(points,id,material=new THREE.LineBasicMaterial({color:0xb6c4b6}),extra={})=>{
 const geometry=new THREE.BufferGeometry().setFromPoints(points.map(point=>new THREE.Vector3(...point)));
 const object=new THREE.Line(geometry,material);object.userData={kind:'acquired-network-line',featureId:id,collectionId:'actual-city',featureClass:'road',...extra};
 if(material instanceof THREE.LineDashedMaterial)object.computeLineDistances();return object;
};
const coords=object=>Array.from(object.geometry.attributes.position.array);
const sourceRange=(batch,id)=>batch.userData.sourceFeatures.find(source=>source.featureId===id);

describe('static regional networks batch source segments without inventing joins',()=>{
 it('preserves exact adjacent coordinate pairs and per-way buffer ranges, without a line between separate ways',()=>{
  const group=new THREE.Group(),a=network([[0,0,0],[1,2,3],[4,5,6]],'way/a'),b=network([[100,9,20],[101,10,30]],'way/b');group.add(a,b);
  const snapshot=[coords(a),coords(b)],result=batchRegionalNetwork(group),batch=group.children[0];
  expect(result).toEqual({batches:1,sourceLines:2,segments:3});expect(batch).toBeInstanceOf(THREE.LineSegments);
  expect(coords(batch)).toEqual([0,0,0,1,2,3,1,2,3,4,5,6,100,9,20,101,10,30]);
  expect(sourceRange(batch,'way/a')).toMatchObject({vertexStart:0,vertexCount:4,segmentStart:0,segmentCount:2,sourceVertexCount:3,collectionId:'actual-city',featureClass:'road'});
  expect(sourceRange(batch,'way/b')).toMatchObject({vertexStart:4,vertexCount:2,segmentStart:2,segmentCount:1});
  expect([coords(a),coords(b)]).toEqual(snapshot);expect(batchRegionalNetwork(group)).toEqual({batches:0,sourceLines:0,segments:0});
 });

 it('retains separate material, restriction, visibility and parent states plus native per-way dash phases',()=>{
  const group=new THREE.Group(),dashed=()=>new THREE.LineDashedMaterial({color:0x59615c,opacity:.25,transparent:true,dashSize:3,gapSize:2,scale:1.5});
  const a=network([[0,0,0],[3,0,0],[3,4,0]],'construction/a',dashed(),{restricted:true}),b=network([[20,0,0],[25,0,0]],'construction/b',dashed(),{restricted:true});
  const c=network([[0,0,20],[1,0,20]],'solid/a'),d=network([[0,0,25],[1,0,25]],'solid/b');
  const separate=network([[10,0,0],[11,0,0]],'construction/unrestricted',dashed(),{restricted:false});
  const hidden=network([[0,0,10],[1,0,10]],'hidden');hidden.visible=false;
  const child=new THREE.Group();child.add(network([[0,0,0],[1,0,0]],'child'));group.add(a,b,c,d,separate,hidden,child);
  const result=batchRegionalNetwork(group),batches=group.children.filter(object=>object instanceof THREE.LineSegments),dash=batches.find(object=>object.material instanceof THREE.LineDashedMaterial);
  expect(result.batches).toBe(2);expect(dash.material.opacity).toBe(.25);expect(dash.material.dashSize).toBe(3);expect(dash.material.gapSize).toBe(2);expect(dash.material.scale).toBe(1.5);
  expect(Array.from(dash.geometry.attributes.lineDistance.array)).toEqual([0,3,3,7,0,5]);expect(dash.userData.sourceFeatures.every(source=>source.restricted===true)).toBe(true);
  expect(separate.parent).toBe(group);expect(hidden.parent).toBe(group);expect(hidden.visible).toBe(false);expect(child.children).toHaveLength(1);
 });

 it('does not merge same-colour lines with differing depth/width, clipping planes or custom shaders',()=>{
  const group=new THREE.Group();for(let i=0;i<2;i++)group.add(network([[i,0,0],[i+1,0,0]],`base/${i}`));
  const width=network([[3,0,0],[4,0,0]],'wide',new THREE.LineBasicMaterial({color:0xb6c4b6,linewidth:2}));
  const depth=network([[4,0,0],[5,0,0]],'depth',new THREE.LineBasicMaterial({color:0xb6c4b6,depthTest:false}));
  const clipped=network([[5,0,0],[6,0,0]],'clip');clipped.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),1)];
  const shader=network([[6,0,0],[7,0,0]],'custom');shader.material.onBeforeCompile=()=>{};group.add(width,depth,clipped,shader);
  expect(batchRegionalNetwork(group).sourceLines).toBe(2);expect([width,depth,clipped,shader].every(line=>line.parent===group)).toBe(true);
 });

 it('keeps highlighted footprint meshes and changing routes untouched, including their shared resources',()=>{
  const world=new THREE.Scene(),group=new THREE.Group();world.add(group);
  const a=network([[0,0,0],[1,0,0]],'a'),b=network([[10,0,0],[11,0,0]],'b'),dynamic=new THREE.Line(b.geometry,b.material);dynamic.userData.kind='actual-shared-node-road-route';
  const footprint=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());footprint.userData={kind:'acquired-area',featureId:'temple'};
  const elsewhere=new THREE.Line(a.geometry,a.material);world.add(elsewhere);group.add(a,b,dynamic,footprint);
  const aGeometry=vi.spyOn(a.geometry,'dispose'),bGeometry=vi.spyOn(b.geometry,'dispose'),aMaterial=vi.spyOn(a.material,'dispose'),bMaterial=vi.spyOn(b.material,'dispose'),unchanged=coords(dynamic);
  batchRegionalNetwork(group);
  expect(dynamic.parent).toBe(group);expect(coords(dynamic)).toEqual(unchanged);expect(footprint.parent).toBe(group);
  expect(aGeometry).not.toHaveBeenCalled();expect(bGeometry).not.toHaveBeenCalled();expect(aMaterial).not.toHaveBeenCalled();expect(bMaterial).not.toHaveBeenCalled();
 });

 it('disposes only orphaned original geometry/material while the selected batch material and shared textures survive',()=>{
  const group=new THREE.Group(),a=network([[0,0,0],[1,0,0]],'a'),b=network([[2,0,0],[3,0,0]],'b'),texture=new THREE.Texture();a.material.map=b.material.map=texture;group.add(a,b);
  const ga=vi.spyOn(a.geometry,'dispose'),gb=vi.spyOn(b.geometry,'dispose'),ma=vi.spyOn(a.material,'dispose'),mb=vi.spyOn(b.material,'dispose'),tx=vi.spyOn(texture,'dispose');batchRegionalNetwork(group);
  expect(ga).toHaveBeenCalledOnce();expect(gb).toHaveBeenCalledOnce();expect(ma).not.toHaveBeenCalled();expect(mb).toHaveBeenCalledOnce();expect(tx).not.toHaveBeenCalled();expect(group.children[0].material).toBe(a.material);
 });

 it('preserves indexed order, transformed positions and vertex colours without modifying original buffers',()=>{
  const group=new THREE.Group();group.position.set(100,5,10);
  const a=network([[0,0,0],[1,0,0],[2,0,0]],'a',new THREE.LineBasicMaterial({color:0xffffff,vertexColors:true}));a.geometry.setIndex([2,0,1]);a.position.set(4,2,3);a.geometry.setAttribute('color',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1],3));
  const b=network([[10,0,0],[11,0,0]],'b',new THREE.LineBasicMaterial({color:0xffffff,vertexColors:true}));b.geometry.setAttribute('color',new THREE.Float32BufferAttribute([1,1,0,0,1,1],3));group.add(a,b);
  const before=coords(a);batchRegionalNetwork(group);const batch=group.children[0];expect(coords(batch).slice(0,12)).toEqual([6,2,3,4,2,3,4,2,3,5,2,3]);expect(Array.from(batch.geometry.attributes.color.array).slice(0,12)).toEqual([0,0,1,1,0,0,1,0,0,0,1,0]);expect(coords(a)).toEqual(before);
 });

 it.each(['shigatse','shannan','chamdo','nagqu'])('%s real source roads conserve every coordinate, way ID, gap and construction style',city=>{
  const source=JSON.parse(readFileSync(new URL(`../public/data/regional-places/${city}.geojson`,import.meta.url),'utf8')),group=new THREE.Group(),expected=new Map();
  for(const feature of source.features){if(feature.geometry.type!=='LineString'||!['road','railway','waterway'].includes(feature.properties.featureClass))continue;
   const restricted=feature.properties.tags.highway==='construction'||['no','private'].includes(feature.properties.tags.access),material=restricted?new THREE.LineDashedMaterial({color:0x59615c,opacity:.25,dashSize:3,gapSize:2}):new THREE.LineBasicMaterial({color:feature.properties.featureClass==='railway'?0xe1cfac:0xb6c4b6});
   const line=network(feature.geometry.coordinates.map(([x,z])=>[x,0,z]),feature.id,material,{restricted,collectionId:city,featureClass:feature.properties.featureClass});group.add(line);expected.set(feature.id,coords(line));
  }
  const result=batchRegionalNetwork(group);expect(result.batches).toBeLessThanOrEqual(4);expect(result.sourceLines).toBeGreaterThan(100);
  const seen=new Set();for(const batch of group.children){if(batch.userData.kind!=='acquired-network-batch')continue;const positions=coords(batch);for(const source of batch.userData.sourceFeatures){const original=expected.get(source.featureId),range=positions.slice(source.vertexStart*3,(source.vertexStart+source.vertexCount)*3),pairs=[];for(let i=3;i<original.length;i+=3)pairs.push(...original.slice(i-3,i),...original.slice(i,i+3));expect(range).toEqual(pairs);expect(source.collectionId).toBe(city);expect(source.segmentCount).toBe(original.length/3-1);seen.add(source.featureId);}}
  expect(seen.size).toBe(expected.size);
 });
});
