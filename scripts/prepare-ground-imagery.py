"""Reproducible, georeferenced Lhasa observation assets; no synthetic pixels.

Requires rasterio, numpy, Pillow, requests. The public source rasters are read
with HTTP range requests. Pixel centres / mesh vertices share EPSG:4326.
"""
import sys, json, hashlib, math
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/geo-deps'))
import numpy as np
import rasterio
from rasterio.vrt import WarpedVRT
from rasterio.transform import from_bounds, from_origin
from rasterio.enums import Resampling
from PIL import Image

OUT = ROOT / 'public/assets/terrain/lhasa-ground'
OUT.mkdir(parents=True, exist_ok=True)
BBOX = [90.98, 29.54, 91.20, 29.75]
item = json.loads((ROOT/'qa/imagery-ground-20261017/sentinel-item.json').read_text())
url = item['assets']['visual']['href']
width, height = 2130, 2340
cols, rows = 705, 757
dx, dy = (BBOX[2]-BBOX[0])/(cols-1), (BBOX[3]-BBOX[1])/(rows-1)
# DEM samples lie ON mesh vertices; imagery bounds describe pixel edges.
transform = from_origin(BBOX[0]-dx/2, BBOX[3]+dy/2, dx, dy)
dem = np.zeros((rows, cols), dtype=np.float32)
sources = []
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT=90):
    print('Reading Sentinel-2 crop', flush=True)
    with rasterio.open(url) as src, WarpedVRT(src, crs='EPSG:4326', transform=from_bounds(*BBOX,width,height), width=width, height=height, resampling=Resampling.bilinear) as vrt:
        rgb = vrt.read([1,2,3])
        invalid = float(np.mean(np.all(rgb == 0, axis=0)))
        if invalid > .001: raise RuntimeError(f'Image missing data: {invalid}')
    Image.fromarray(rgb.transpose(1,2,0)).save(OUT/'sentinel-20251126.webp', quality=92, method=6)
    for east in ['090','091']:
        key = f'Copernicus_DSM_COG_10_N29_00_E{east}_00_DEM'
        source = f'https://copernicus-dem-30m.s3.amazonaws.com/{key}/{key}.tif'
        sources.append(source)
        print('Reading',key,flush=True)
        with rasterio.open(source) as src, WarpedVRT(src, crs='EPSG:4326', transform=transform, width=cols, height=rows, resampling=Resampling.bilinear, nodata=-9999) as vrt:
            data = vrt.read(1)
            valid = data > 0
            dem[valid] = data[valid]
if np.any(dem <= 0): raise RuntimeError('DEM contains uncovered cells')
grid=np.rint(dem).astype('<i2'); grid.tofile(OUT/'lhasa.int16')
meta = dict(id='lhasa', bbox=BBOX, columns=cols, rows=rows, minimum=int(grid.min()), maximum=int(grid.max()), dataUrl='/assets/terrain/lhasa-ground/lhasa.int16', sourceUrl='/assets/terrain/lhasa-ground/manifest.json', geometryUrl='/assets/terrain/lhasa-ground/lhasa.geojson', imageryUrl='/assets/terrain/lhasa-ground/sentinel-20251126.webp', displaySamplingMetres=dict(eastWest=round(dx*111320*math.cos(math.radians(29.645)),2),northSouth=round(dy*111320,2)))
manifest = dict(places=[meta], accessedAt='2026-10-17', imagery=dict(itemId=item['id'],capturedAt=item['properties']['datetime'],source=url,sourcePixelMetres=10,width=width,height=height,bbox=BBOX,crs='EPSG:4326',processing='True colour TCI; bilinear reprojection, crop, WebP quality92. No generated imagery.',nodataFraction=invalid,attribution='Contains modified Copernicus Sentinel data (2025); COG conversion by Element 84',license='https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice'), elevation=dict(dataset='Copernicus DEM GLO-30 Public (DSM)',sources=sources,nativeSpacing='1 arc second, approximately 30m',verticalDatum='EGM2008',processing='Bilinear sampling to EPSG:4326 mesh vertices; rounded metres, Int16 little endian',attribution='produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved',license='https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model',scope='Surface elevations include vegetation/buildings; not surveyed railway or tunnel elevations.'), files={p.name:dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.iterdir() if p.suffix in ['.webp','.int16']})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'sentinel-item.json').write_text(json.dumps(item,indent=2),encoding='utf-8')
print(json.dumps(dict(minimum=meta['minimum'],maximum=meta['maximum'],missing=invalid,files=manifest['files'])),flush=True)
