import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import manifest from '../public/data/regional-places/evolution-manifest.json';
import {decodeEvolutionYears,decodeEvolutionConfidence,evolutionCellBounds,evolutionCellCenter,evolutionCountAt,evolutionDetectedAt,evolutionConfidenceBand} from '../src/lib/regionalEvolution';

const payload=url=>readFileSync(new URL(`../public${url}`,import.meta.url));
const arrayBuffer=buffer=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');

describe('four regions retain real DLR original-pixel settlement detections',()=>{
 it('archives all official original tiles with stable source bytes and explicit censored-date limits',()=>{
  expect(manifest.windows.map(w=>w.id)).toEqual(['shigatse','shannan','chamdo','nagqu']);
  expect(manifest.license).toBe('CC BY 4.0');expect(manifest.firstYearLeftCensored).toBe(true);
  expect(manifest.limitations.join(' ')).toMatch(/not the construction year/);
  expect(manifest.limitations.join(' ')).toMatch(/does not establish.*transport caused/);
  expect(manifest.limitations.join(' ')).toMatch(/cannot show.*2021/);
  for(const source of manifest.sourceTiles){
   const bytes=payload(source.file);expect(bytes.byteLength).toBe(source.bytes);expect(digest(bytes)).toBe(source.sha256);
   expect(source.url).toMatch(/^https:\/\/download.geoservice.dlr.de\/WSF_EVO\/files\/WSFevolution_v1_/);
  }
 });
 for(const window of manifest.windows)it(`${window.id}: original cells, epoch counts and actual IDC bands are conserved`,()=>{
  const bytes=payload(window.dataUrl);expect(digest(bytes)).toBe(window.sha256);
  const years=decodeEvolutionYears(arrayBuffer(bytes),window);
  expect(years).toHaveLength(window.rows*window.columns);
  for(const [year,count] of Object.entries(window.cumulativePixelCounts))expect(evolutionCountAt(years,Number(year))).toBe(count);
  const first=evolutionCellBounds(window,0),last=evolutionCellBounds(window,years.length-1);
  expect(first.west).toBeCloseTo(window.bounds.west,10);expect(first.north).toBeCloseTo(window.bounds.north,10);
  expect(last.east).toBeCloseTo(window.bounds.east,10);expect(last.south).toBeCloseTo(window.bounds.south,10);
  expect(evolutionCellCenter(window,0)[0]).toBeGreaterThan(first.west);
  const confidenceBytes=payload(window.confidenceUrl);expect(digest(confidenceBytes)).toBe(window.confidenceSha256);
  const confidence=decodeEvolutionConfidence(arrayBuffer(confidenceBytes),window);
  for(const year of window.confidenceYears){
   const band=evolutionConfidenceBand(confidence,window,year),expected=window.confidenceByYear[String(year)];
   expect(band).toHaveLength(years.length);
   for(let score=0;score<=6;score++){
    let count=0;for(let i=0;i<years.length;i++)if(evolutionDetectedAt(years[i],year)&&band[i]===score)count++;
    expect(count).toBe(score===0?expected.noScorePixels:expected.scoreCounts[String(score)]);
   }
  }
  expect(evolutionConfidenceBand(confidence,window,2006)).toBeUndefined();
 });
 it('zero never enters the detected population and corrupt/past-boundary pixels are rejected',()=>{
  const window=manifest.windows[0];expect(evolutionDetectedAt(0,2015)).toBe(false);expect(evolutionDetectedAt(1985,1984)).toBe(false);
  expect(()=>evolutionCellBounds(window,-1)).toThrow();expect(()=>evolutionCellBounds(window,window.rows*window.columns)).toThrow();
  const bytes=arrayBuffer(payload(window.dataUrl));new DataView(bytes).setUint16(0,1970,true);
  expect(()=>decodeEvolutionYears(bytes,window)).toThrow(/invalid detection year/);
 });
});
