import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {climateNormalPeriod,climateObservationAxes,climateObservationReading,climateStations,getClimateObservationMonth} from '../src/data/climateObservations';

describe('same-period station climate observations',()=>{
  it('uses three distinct named stations, rather than regional means or a substituted nearby airport',()=>{
    expect(climateNormalPeriod).toEqual({startYear:1991,endYear:2020});
    expect(climateStations.map(station=>[station.cityId,station.name,station.wmo,station.heightM])).toEqual([
      ['nyingchi','林芝','56312',3001],['lhasa','拉萨','55591',3650],['ngari','狮泉河','55228',4280],
    ]);
    expect(climateStations.map(station=>station.longitude)).toEqual([94.47,91.12972222,80.08]);
  });

  for(const station of climateStations){
    it(`preserves ${station.wmo} exact source bytes, 12 month rows and actual 30-year coverage`,()=>{
      const filename=station.archivePath.split('/').at(-1);
      const bytes=readFileSync(new URL(`../public/data/climate-normals-1991-2020/${filename}`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(station.sha256);
      const raw=bytes.toString('utf8');
      expect(raw).toContain('Climate Normals for 1991-2020');
      expect(station.sourceUrl).toContain('/0253808/4.4/data/0-data/Region-2-WMO-Normals-9120/China/CSV/');
      const lines=raw.split(/[\r\n]+/);
      const values=(parameter,calculation)=>{
        const line=lines.find(line=>line.startsWith(`${station.wmo},${parameter},${calculation},`));
        expect(line).toBeDefined();
        return line.split(',').slice(4,17).map(Number);
      };
      // Compare every published cell, not a rounded third-party climatogram.
      expect(values(5,'Mean')).toEqual([...station.monthlyMeanTemperatureC,station.annualMeanTemperatureC]);
      expect(values(1,'Sum')).toEqual([...station.monthlyPrecipitationMm,station.annualPrecipitationMm]);
      expect(values(5,'NOY')).toEqual(Array(13).fill(30));
      expect(values(1,'NOY')).toEqual(Array(13).fill(30));
      expect(station.temperatureYears).toEqual(Array(12).fill(30));
      expect(station.precipitationYears).toEqual(Array(12).fill(30));
    });
  }

  it('uses a 1-based calendar month and preserves a counterexample to a fixed east-to-west rainfall ranking',()=>{
    const july=getClimateObservationMonth(7);
    expect(july.map(row=>[row.temperatureC,row.precipitationMm])).toEqual([[16.5,137.4],[16.5,140.5],[15,22.9]]);
    expect(getClimateObservationMonth(1).map(row=>[row.temperatureC,row.precipitationMm])).toEqual([[1.1,2],[-.3,.9],[-11.7,1.6]]);
    expect(getClimateObservationMonth(12).map(row=>row.precipitationMm)).toEqual([.7,.7,.6]);
    expect(climateObservationReading(7)).toContain('不能把东西差异理解成每个月固定的递减顺序');
  });

  it('rejects unknown months rather than shifting or silently clamping the scientific record',()=>{
    for(const month of [0,13,7.5,NaN,Infinity])expect(()=>getClimateObservationMonth(month)).toThrow(RangeError);
  });

  it('uses a fixed mm scale that contains every month and station without per-city normalization',()=>{
    expect(climateObservationAxes.precipitationMaxMm).toBe(150);
    for(const station of climateStations){
      expect(station.monthlyPrecipitationMm).toHaveLength(12);
      expect(station.monthlyMeanTemperatureC).toHaveLength(12);
      for(const value of station.monthlyPrecipitationMm){expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(150);}
      for(const value of station.monthlyMeanTemperatureC){expect(value).toBeGreaterThanOrEqual(-15);expect(value).toBeLessThanOrEqual(20);}
    }
  });
});
