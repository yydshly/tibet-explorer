// @ts-expect-error Test-only filesystem access.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createPlaceActionReading} from '../src/scene/placeActionReading';
import type {LocalFeature,LocalCoordinate} from '../src/scene/cityLocalMap';
const data=JSON.parse(readFileSync('public/data/local-places/lhasa.geojson','utf8'));
const polygon=(f:LocalFeature)=>{
 const rings=f.geometry.coordinates as LocalCoordinate[][];
 return new THREE.ShapeGeometry(new THREE.Shape(rings[0].map(([x,z])=>new THREE.Vector2(x,z)))).rotateX(Math.PI/2);
};
describe('activity changes use acquired places without rewriting geography',()=>{
 it('holds remaining temple activity, separates the majority, reverses deterministically and hides on exit',()=>{
 const before=JSON.stringify(data),reading=createPlaceActionReading(data,([x,z],y=0)=>new THREE.Vector3(x,y,z),polygon);
 const state={phase:'lamps' as const,progress:1,separation:0,activity:0};reading.update(state,.001);
 const group=reading.group.children[0];const first=group.children.map(o=>o.scale.x);
 expect(first.filter(n=>n>0)).toHaveLength(7);
 reading.update({...state,phase:'separate',separation:1},.001);
 expect(group.children.slice(0,7).filter(o=>o.scale.x>0)).toHaveLength(1);
 expect(group.children.slice(7).every(o=>o.scale.x>0)).toBe(true);
 reading.update(state,.001);expect(group.children.map(o=>o.scale.x)).toEqual(first);
 reading.update(undefined,.001);expect(reading.group.visible).toBe(false);expect(JSON.stringify(data)).toBe(before);
 });
 it('shows public use only when narrated and changes movement independently of the footprint',()=>{
 const reading=createPlaceActionReading(data,([x,z],y=0)=>new THREE.Vector3(x,y,z),polygon);
 const state={phase:'public' as const,progress:.2,separation:1,activity:1};reading.update(state,.001);
 const publicSpace=reading.group.children[1],surface=publicSpace.children[0] as THREE.Mesh;
 const geometry=Array.from(surface.geometry.getAttribute('position').array);
 const moving=publicSpace.children[1],stationary=publicSpace.children[2],a=moving.position.clone(),b=stationary.position.clone();
 reading.update({...state,progress:.8},.001);
 expect(moving.position.equals(a)).toBe(false);expect(stationary.position.equals(b)).toBe(true);
 expect(Array.from(surface.geometry.getAttribute('position').array)).toEqual(geometry);
 reading.update({...state,phase:'lamps'},.001);expect(publicSpace.visible).toBe(false);
 });
});
