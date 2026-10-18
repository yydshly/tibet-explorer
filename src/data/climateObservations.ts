import archive from '../../public/data/climate-normals-1991-2020/stations.json';

export type ClimateObservationCityId = 'nyingchi' | 'lhasa' | 'ngari';
export interface ClimateStationNormal {
  cityId: ClimateObservationCityId;
  name: string;
  sourceName: string;
  wmo: string;
  latitude: number;
  longitude: number;
  heightM: number;
  monthlyMeanTemperatureC: readonly number[];
  monthlyPrecipitationMm: readonly number[];
  annualMeanTemperatureC: number;
  annualPrecipitationMm: number;
  temperatureYears: readonly number[];
  precipitationYears: readonly number[];
  sourceUrl: string;
  archivePath: string;
  sha256: string;
}

export const climateNormalPeriod = archive.period;
export const climateNormalProvenance = {
  archiveVersion:archive.archiveVersion,
  retrievedOn:archive.retrievedOn,
  provider:archive.provider,
  overviewUrl:'https://www.ncei.noaa.gov/products/wmo-climate-normals',
  countryNotesPath:'/data/climate-normals-1991-2020/Explanatory_Information_Region2.pdf',
  formatNotesPath:'/data/climate-normals-1991-2020/WMO_Normals_9120_Format_and_Parameters.pdf',
};
export const climateStations: readonly ClimateStationNormal[] = archive.stations as ClimateStationNormal[];

// Fixed across every station and month. These scales only encode the observed
// station statistics; do not feed them into conceptual cloud/rain particles.
export const climateObservationAxes = {precipitationMaxMm:150,temperatureMinC:-15,temperatureMaxC:20} as const;

export function getClimateObservationMonth(month:number) {
  if (!Number.isInteger(month) || month<1 || month>12) throw new RangeError('Climate observation month must be an integer from 1 to 12');
  return climateStations.map(station=>({station,temperatureC:station.monthlyMeanTemperatureC[month-1],precipitationMm:station.monthlyPrecipitationMm[month-1]}));
}

export function climateObservationReading(month:number):string {
  const rows=getClimateObservationMonth(month);
  const east=rows[0],central=rows[1],west=rows[2];
  if(central.precipitationMm>east.precipitationMm) return `${month}月，拉萨站降水量均值${central.precipitationMm.toFixed(1)}毫米，略高于林芝站的${east.precipitationMm.toFixed(1)}毫米；狮泉河站为${west.precipitationMm.toFixed(1)}毫米。不能把东西差异理解成每个月固定的递减顺序。`;
  return `${month}月，林芝站降水量均值${east.precipitationMm.toFixed(1)}毫米，拉萨站${central.precipitationMm.toFixed(1)}毫米，狮泉河站${west.precipitationMm.toFixed(1)}毫米。换一个月，对照干湿季与三地差异；这些统计本身不能单独证明地形作用。`;
}
