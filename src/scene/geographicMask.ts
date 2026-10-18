/** Geographic membership only: no new geometry, land cover or height is inferred. */
export type GeographicPolygon = {type:'Polygon'|'MultiPolygon';coordinates:number[][][]|number[][][][]};
export type GeographicMask = {
  data:Uint8Array;width:number;height:number;
  /** Pixel rows run south to north, matching the atlas's equirectangular UVs. */
  bounds:readonly [west:number,south:number,east:number,north:number];
};

/** Rasterize source polygons with an even/odd scanline rule, including holes.
 * Polygons are unioned; ring winding does not affect administrative membership.
 * This local atlas does not cross the antimeridian. */
export function rasterizeGeographicMask(geometry:GeographicPolygon,width=1024,height=512):GeographicMask {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2)throw new Error('Invalid geographic mask size');
  const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
  const points=polygons.flat(2);
  if(!points.length||points.some(point=>point.length<2||!Number.isFinite(point[0])||!Number.isFinite(point[1])))throw new Error('Invalid geographic mask coordinates');
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const point of points){west=Math.min(west,point[0]);east=Math.max(east,point[0]);south=Math.min(south,point[1]);north=Math.max(north,point[1]);}
  if(east<=west||north<=south||east-west>180)throw new Error('Unsupported geographic mask extent');
  // Keep a clear border texel so clamp-to-edge sampling never extends a region.
  const padX=(east-west)/width,padY=(north-south)/height;
  west-=padX;east+=padX;south-=padY;north+=padY;
  const stepX=(east-west)/width,stepY=(north-south)/height,data=new Uint8Array(width*height);
  for(const polygon of polygons){
    for(let row=0;row<height;row++){
      const latitude=south+(row+.5)*stepY,intersections:number[]=[];
      for(const ring of polygon){
        for(let index=0,previous=ring.length-1;index<ring.length;previous=index++){
          const a=ring[previous],b=ring[index];
          if((a[1]>latitude)!==(b[1]>latitude))intersections.push(a[0]+(latitude-a[1])*(b[0]-a[0])/(b[1]-a[1]));
        }
      }
      intersections.sort((a,b)=>a-b);
      for(let index=0;index+1<intersections.length;index+=2){
        const first=Math.max(0,Math.ceil((intersections[index]-west)/stepX-.5));
        const last=Math.min(width-1,Math.floor((intersections[index+1]-west)/stepX-.5));
        if(last>=first)data.fill(255,row*width+first,row*width+last+1);
      }
    }
  }
  return {data,width,height,bounds:[west,south,east,north]};
}
