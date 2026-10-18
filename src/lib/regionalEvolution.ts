/** Native WSF pixels retain estimated detection years, never building dates. */
export interface RegionalEvolutionWindow {
  id: string;
  label: string;
  bounds: {west:number;east:number;south:number;north:number};
  columns:number;
  rows:number;
  /** GDAL affine [pixelWidth, 0, west, 0, negativePixelHeight, north]. */
  transform:number[];
  dataUrl:string;
  bytes:number;
  sha256:string;
  detectedPixels:number;
  firstDetectionYearCounts:number[];
  cumulativePixelCounts:Record<string,number>;
  confidenceAvailable:boolean;
  confidenceYears?:number[];
  confidenceUrl?:string;
  confidenceBytes?:number;
  confidenceSha256?:string;
  confidenceByYear?:Record<string,{detectedPixels:number;scoreCounts:Record<string,number>;noScorePixels:number}>;
}

export function validateEvolutionWindow(window:RegionalEvolutionWindow):void {
  const {columns,rows,transform,bounds}=window;
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||columns*rows>2_000_000)
    throw new Error('Invalid WSF observation window dimensions');
  if(transform.length!==6||!transform.every(Number.isFinite)||transform[0]<=0||transform[4]>=0||transform[1]!==0||transform[3]!==0)
    throw new Error('Invalid WSF original-pixel affine transform');
  if(Math.abs(bounds.west-transform[2])>1e-8||Math.abs(bounds.north-transform[5])>1e-8||
     Math.abs(bounds.east-(transform[2]+columns*transform[0]))>1e-8||
     Math.abs(bounds.south-(transform[5]+rows*transform[4]))>1e-8)
    throw new Error('WSF bounds differ from original-pixel affine transform');
  if(window.bytes!==columns*rows*2||window.firstDetectionYearCounts.length!==31||
     window.firstDetectionYearCounts.some(n=>!Number.isInteger(n)||n<0)||
     window.firstDetectionYearCounts.reduce((a,b)=>a+b,0)!==window.detectedPixels)
    throw new Error('Invalid WSF detection-count metadata');
}

/** Decode LE explicitly; no host-endianness or implicit alignment assumptions. */
export function decodeEvolutionYears(buffer:ArrayBuffer,window:RegionalEvolutionWindow):Uint16Array {
  validateEvolutionWindow(window);
  if(buffer.byteLength!==window.bytes)throw new Error('WSF observation payload length mismatch');
  const view=new DataView(buffer),years=new Uint16Array(window.columns*window.rows),counts=new Uint32Array(31);
  for(let i=0;i<years.length;i++){
    const year=view.getUint16(i*2,true);
    if(year!==0&&(year<1985||year>2015))throw new Error('WSF observation contains an invalid detection year');
    years[i]=year;
    if(year)counts[year-1985]++;
  }
  if(counts.some((count,i)=>count!==window.firstDetectionYearCounts[i]))throw new Error('WSF observation detection counts differ from its provenance');
  return years;
}

export function evolutionCellBounds(window:RegionalEvolutionWindow,index:number){
  if(!Number.isInteger(index)||index<0||index>=window.columns*window.rows)throw new RangeError('WSF pixel index outside observation window');
  const row=Math.floor(index/window.columns),column=index%window.columns;
  const west=window.transform[2]+column*window.transform[0],north=window.transform[5]+row*window.transform[4];
  return {west,east:west+window.transform[0],north,south:north+window.transform[4]};
}

export function evolutionCellCenter(window:RegionalEvolutionWindow,index:number):[number,number]{
  const {west,east,north,south}=evolutionCellBounds(window,index);
  return [(west+east)/2,(north+south)/2];
}

/** False = not detected by this product/year, never proof of an unbuilt place. */
export function evolutionDetectedAt(firstDetectionYear:number,observationYear:number):boolean {
  return firstDetectionYear>=1985&&firstDetectionYear<=2015&&firstDetectionYear<=observationYear;
}

export function evolutionCountAt(years:Uint16Array,observationYear:number):number {
  let count=0;for(const firstYear of years)if(evolutionDetectedAt(firstYear,observationYear))count++;
  return count;
}

/** IDC bands are native input-data consistency, not classification accuracy. */
export function decodeEvolutionConfidence(buffer:ArrayBuffer,window:RegionalEvolutionWindow):Uint8Array {
  if(!window.confidenceAvailable||!window.confidenceYears?.length||buffer.byteLength!==window.confidenceBytes||
     buffer.byteLength!==window.columns*window.rows*window.confidenceYears.length)
    throw new Error('IDC consistency payload length/year mismatch');
  const values=new Uint8Array(buffer);
  if(values.some(value=>value>6))throw new Error('Invalid native IDC consistency score');
  return values;
}

/** No time interpolation: a non-archived year has no provided IDC band. */
export function evolutionConfidenceBand(values:Uint8Array,window:RegionalEvolutionWindow,year:number):Uint8Array|undefined {
  const band=window.confidenceYears?.indexOf(year)??-1;
  if(band<0)return undefined;
  const size=window.columns*window.rows;
  return values.subarray(band*size,(band+1)*size);
}
