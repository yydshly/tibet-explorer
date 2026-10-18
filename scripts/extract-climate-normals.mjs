import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Extract only the archived country submission, never a weather API or rounded
// third-party climate table. Downloading a replacement archive is deliberate.
const directory = new URL('../public/data/climate-normals-1991-2020/', import.meta.url);
const sourceBase = 'https://www.nodc.noaa.gov/archive/arc0216/0253808/4.4/data/0-data/Region-2-WMO-Normals-9120/China/CSV/';
const definitions = [
  {cityId:'nyingchi',name:'林芝',file:'NYINGCHI_56312.csv'},
  {cityId:'lhasa',name:'拉萨',file:'LHASA_55591.csv'},
  {cityId:'ngari',name:'狮泉河',file:'SHIQUANHE_55228.csv'},
];
const degrees = text => {
  const [degree,minute,second,hemisphere] = text.split('|');
  return Number(((Number(degree)+Number(minute)/60+Number(second)/3600)*(['S','W'].includes(hemisphere)?-1:1)).toFixed(8));
};
const stations = [];
for (const definition of definitions) {
  const bytes = await readFile(new URL(definition.file,directory));
  const text = bytes.toString('utf8').replace(/^\uFEFF/,'');
  if (!text.startsWith('World Meteorological Organization Climate Normals for 1991-2020')) throw new Error('Unexpected climate period');
  const rows = text.split(/[\r\n]+/).filter(Boolean).map(line => line.split(',').map(value => value.trim()));
  if(!rows.some(row=>row[0]==='Country_Name'&&row[1]==='CHINA')) throw new Error('Unexpected country submission');
  if(!rows.some(row=>row[0]==='1'&&row[1]==='Precipitation_Total'&&row[2]==='mm') ||
    !rows.some(row=>row[0]==='5'&&row[1]==='Daily_Mean_Temperature'&&row[2]==='Deg_C')) throw new Error('Unexpected parameter units');
  const wmo = definition.file.split('_')[1].split('.')[0];
  const header = rows.find(row => row[0]===wmo && row[1].includes('|'));
  if (!header) throw new Error(`Missing station header: ${wmo}`);
  const extract = (parameter,calculation) => {
    const matches=rows.filter(row => row[0]===wmo && row[1]===String(parameter) && row[2]===calculation);
    if (matches.length!==1) throw new Error(`Ambiguous parameter ${parameter}/${calculation}: ${wmo}`);
    const calculationCode={Mean:'1',Sum:'4',NOY:'98'}[calculation];
    if(matches[0][3]!==calculationCode) throw new Error(`Unexpected calculation code: ${wmo}`);
    const values=matches[0].slice(4,17);
    if(values.length!==13 || values.some(value=>!value || !Number.isFinite(Number(value)))) throw new Error(`Missing climate values: ${wmo}`);
    return values.map(Number);
  };
  const temperature=extract(5,'Mean'),precipitation=extract(1,'Sum');
  const temperatureYears=extract(5,'NOY'),precipitationYears=extract(1,'NOY');
  if([...temperatureYears,...precipitationYears].some(years=>years!==30)) throw new Error(`Incomplete 30-year comparison: ${wmo}`);
  stations.push({cityId:definition.cityId,name:definition.name,sourceName:definition.file.split('_')[0],wmo,
    latitude:degrees(header[1]),longitude:degrees(header[2]),heightM:Number(header[3]),
    monthlyMeanTemperatureC:temperature.slice(0,12),monthlyPrecipitationMm:precipitation.slice(0,12),
    annualMeanTemperatureC:temperature[12],annualPrecipitationMm:precipitation[12],
    temperatureYears:temperatureYears.slice(0,12),precipitationYears:precipitationYears.slice(0,12),
    sourceUrl:sourceBase+definition.file,archivePath:'/data/climate-normals-1991-2020/'+definition.file,
    sha256:createHash('sha256').update(bytes).digest('hex')});
}
const manifest={period:{startYear:1991,endYear:2020},archiveVersion:'0253808/4.4',retrievedOn:'2026-10-16',provider:'China submission to WMO; archived by NOAA NCEI',stations};
await writeFile(new URL('stations.json',directory),JSON.stringify(manifest,null,2)+'\n','utf8');
console.log(`Extracted ${stations.length} stations from exact archived CSV files into ${fileURLToPath(new URL('stations.json',directory))}`);
