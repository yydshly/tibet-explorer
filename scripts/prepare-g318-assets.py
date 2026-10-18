"""Crop licensed public Sentinel/Copernicus rasters and retain source geometry."""
import sys,json,hashlib,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/geo-deps'))
import numpy as np
import rasterio
from rasterio.vrt import WarpedVRT
from rasterio.transform import from_bounds,from_origin
from rasterio.enums import Resampling
from PIL import Image

out=ROOT/'public/assets/routes/g318';out.mkdir(parents=True,exist_ok=True)
bbox=[94.30,29.51,94.82,29.81];cols,rows=1121,721;w,h=5000,3300
item=json.loads((out/'sentinel-item.json').read_text(encoding='utf-8'))
url=item['assets']['visual']['href'];dx=(bbox[2]-bbox[0])/(cols-1);dy=(bbox[3]-bbox[1])/(rows-1)
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_TIMEOUT=90):
 print('Reading G318 Sentinel crop',flush=True)
 with rasterio.open(url) as src,WarpedVRT(src,crs='EPSG:4326',transform=from_bounds(*bbox,w,h),width=w,height=h,resampling=Resampling.bilinear) as vrt:rgb=vrt.read([1,2,3])
 invalid=float(np.mean(np.all(rgb==0,axis=0)))
 if invalid>.001:raise RuntimeError(f'Image crop lacks coverage: {invalid}')
 Image.fromarray(rgb.transpose(1,2,0)).save(out/'sentinel-20251213.webp',quality=92,method=6)
 key='Copernicus_DSM_COG_10_N29_00_E094_00_DEM';demURL=f'https://copernicus-dem-30m.s3.amazonaws.com/{key}/{key}.tif'
 print('Reading G318 GLO-30 elevation',flush=True)
 with rasterio.open(demURL) as src,WarpedVRT(src,crs='EPSG:4326',transform=from_origin(bbox[0]-dx/2,bbox[3]+dy/2,dx,dy),width=cols,height=rows,resampling=Resampling.bilinear,nodata=-9999) as vrt:dem=vrt.read(1)
 if np.any(dem<=0):raise RuntimeError('DEM crop lacks coverage')
 grid=np.rint(dem).astype('<i2');grid.tofile(out/'terrain.int16')
manifest=json.loads((ROOT/'public/data/local-places/transport-corridors.manifest.json').read_text(encoding='utf-8'))
route=next(r for r in manifest['routes'] if r['id']=='nyingchi-lulang-g318')
(out/'route.json').write_text(json.dumps(route,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
local=json.loads((ROOT/'public/data/local-places/lulang.geojson').read_text(encoding='utf-8'))
(out/'lulang.geojson').write_text(json.dumps(local,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(out/'sentinel-item.json').write_text(json.dumps(item,indent=2),encoding='utf-8')
meta={'id':'g318-nyingchi-lulang','bbox':bbox,'columns':cols,'rows':rows,'verticalExaggeration':1,'accessedAt':'2026-10-19',
 'imagery':{'url':'/assets/routes/g318/sentinel-20251213.webp','source':url,'item':item['id'],'capturedAt':item['properties']['datetime'],'sourcePixelMetres':10,'width':w,'height':h,'missingFraction':invalid,'processing':'True-colour TCI; bilinear crop/reprojection, WebP92; no generated pixels','license':'https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice','attribution':'Contains modified Copernicus Sentinel data (2025); COG conversion by Element 84'},
 'elevation':{'url':'/assets/routes/g318/terrain.int16','source':demURL,'dataset':'Copernicus DEM GLO-30 DSM','nativeSpacing':'1 arc second, approximately30m','sampleMetres':{'eastWest':round(dx*111320*math.cos(math.radians(29.66)),2),'northSouth':round(dy*111320,2)},'verticalDatum':'EGM2008','minimum':int(grid.min()),'maximum':int(grid.max()),'processing':'Bilinear to mesh vertices; rounded metres; little-endian Int16','attribution':'Copernicus WorldDEM-30 © DLR e.V.2010–2014 and © Airbus Defence and Space GmbH2014–2018, provided by EU/ESA','license':'https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model','scope':'Surface elevation includes canopy/buildings, not surveyed road surface'},
 'geometry':{'route':'/assets/routes/g318/route.json','place':'/assets/routes/g318/lulang.geojson','source':'/data/local-places/transport-corridors.manifest.json','acquiredAt':manifest['acquiredAt'],'attribution':'© OpenStreetMap contributors','license':'https://www.openstreetmap.org/copyright','scope':'Original source-node chain and present-day footprints; endpoints are not verified public visitor entrances'},
 'limits':['Winter image from a single day, not current weather or all-season appearance','No street-view claim, no measured building heights or historic footprint reconstruction','Virtual map observation positions are not recommended roadside stopping points'],
 'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'files':meta['files'],'range':[int(grid.min()),int(grid.max())],'missing':invalid}),flush=True)
