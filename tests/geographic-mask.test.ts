import {describe,expect,it} from 'vitest';
import sourceBoundaries from '../public/assets/earth-context.json';
import {rasterizeGeographicMask,type GeographicMask,type GeographicPolygon} from '../src/scene/geographicMask';
import {regionalAnchors} from '../src/data/regionalStudy';

function sample(mask:GeographicMask,longitude:number,latitude:number){
 const [west,south,east,north]=mask.bounds;
 if(longitude<west||longitude>east||latitude<south||latitude>north)return 0;
 const x=Math.min(mask.width-1,Math.floor((longitude-west)/(east-west)*mask.width));
 const y=Math.min(mask.height-1,Math.floor((latitude-south)/(north-south)*mask.height));
 return mask.data[y*mask.width+x];
}
const rectangle=(w:number,s:number,e:number,n:number)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];

describe('source-derived administrative map mask',()=>{
 it('preserves holes, disconnected polygons and south-to-north sampling regardless of ring winding',()=>{
  const mask=rasterizeGeographicMask({type:'MultiPolygon',coordinates:[
   [rectangle(0,0,10,10),rectangle(3,3,7,7).reverse()],
   [rectangle(15,12,20,18)],
  ]},256,256);
  expect(sample(mask,1,1)).toBe(255);
  expect(sample(mask,5,5)).toBe(0);
  expect(sample(mask,17,15)).toBe(255);
  expect(sample(mask,12,12)).toBe(0);
  expect(sample(mask,17,3)).toBe(0);
  expect(mask.data.slice(0,mask.width).every(value=>value===0)).toBe(true);
 });
 it('derives the real regional silhouette from the shipped Natural Earth layer',()=>{
  const boundaries=sourceBoundaries as {tibet:GeographicPolygon};
  const mask=rasterizeGeographicMask(boundaries.tibet);
  for(const city of regionalAnchors)expect(sample(mask,city.longitude,city.latitude),city.title).toBe(255);
  expect(sample(mask,85,23)).toBe(0);
  expect(sample(mask,110,36)).toBe(0);
  expect(sample(mask,90,40)).toBe(0);
  expect(mask.data.some(value=>value===0)).toBe(true);
  expect(mask.data.some(value=>value===255)).toBe(true);
 });
 it('rejects invalid extents rather than making an invented region',()=>{
  expect(()=>rasterizeGeographicMask({type:'Polygon',coordinates:[]})).toThrow();
  expect(()=>rasterizeGeographicMask({type:'Polygon',coordinates:[rectangle(0,0,0,10)]})).toThrow();
 });
});
