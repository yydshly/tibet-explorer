import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {regionalTerrainColour} from '../src/scene/regionalTerrainSurface';

const stops=[[0,0x687d6b],[2800,0x748774],[4000,0x999a78],[4500,0xafa48a],[5500,0xc4ba9f],[8000,0xe2dfca]];
const original=metres=>{let i=1;while(i<stops.length-1&&metres>stops[i][0])i++;const a=stops[i-1],b=stops[i];return new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),THREE.MathUtils.clamp((metres-a[0])/(b[0]-a[0]),0,1)).multiplyScalar(.55);};
describe('cached terrain palette preserves the accepted display exactly',()=>{
 it('matches every real regional source sample and fractional/edge heights with a reused output',()=>{
   const bytes=readFileSync('public/assets/terrain/tibet-regional-dem.int16'),scratch=new THREE.Color();let maximumError=0;
   const check=metres=>{const expected=original(metres),actual=regionalTerrainColour(metres,scratch);maximumError=Math.max(maximumError,Math.abs(expected.r-actual.r),Math.abs(expected.g-actual.g),Math.abs(expected.b-actual.b));};
   for(let i=0;i<bytes.length;i+=2)check(bytes.readInt16LE(i));for(const h of [-300,0,2799.75,2800,3999.5,4000,4500,5500,7999.75,8000,10000])check(h);expect(maximumError).toBe(0);
 });
 it('returns independent default results and never mutates cached stops while reusing a caller result',()=>{
   const first=regionalTerrainColour(4000),saved=first.clone(),second=regionalTerrainColour(4000);expect(first).not.toBe(second);second.set(0xffffff);expect(first).toEqual(saved);
   const scratch=new THREE.Color();expect(regionalTerrainColour(8000,scratch)).toBe(scratch);for(const h of [0,6000,2800,10000])regionalTerrainColour(h,scratch);expect(regionalTerrainColour(4000)).toEqual(saved);
 });
});
