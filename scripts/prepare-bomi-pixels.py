"""One bounded native-pixel gate for the approved R07 Tongmai–Bomi footprint."""
from pathlib import Path
import sys, json, math, hashlib, subprocess, os
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/geo-deps'))
import requests, tifffile, rasterio
import numpy as np
from rasterio.warp import transform_bounds, reproject
from rasterio.windows import from_bounds, Window
from rasterio.transform import from_bounds as raster_bounds
from rasterio.enums import Resampling
from PIL import Image

OUT=ROOT.parent/'review/g318-bomi-20261020'
OUT.mkdir(exist_ok=True)
URL='https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/46/R/FU/2025/12/S2C_46RFU_20251213_0_L2A/TCI.tif'
BBOX=[95.045,29.79,95.82,30.145]
cache=OUT/'FU-native-window.sparse.tif'
def get_bytes(a,b):
    r=requests.get(URL,headers={'Range':f'bytes={a}-{b}','Accept-Encoding':'identity'},timeout=(10,35))
    r.raise_for_status()
    if r.status_code!=206 or not r.headers.get('Content-Range','').startswith(f'bytes {a}-{b}/') or len(r.content)!=b-a+1:
        raise ValueError('Source range response did not match requested original bytes')
    return a,r.content


width,height=4200,2200
rgb=np.zeros((3,height,width),dtype='uint8')
records=[]
for tile in ('FU','GU'):
    URL=f'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/46/R/{tile}/2025/12/S2C_46R{tile}_20251213_0_L2A/TCI.tif'
    cache=OUT/(tile+'-native-window.sparse.tif')
    cached=cache.exists() and '--cached' in sys.argv
    if cached:
        with cache.open('rb') as f: header=f.read(524288)
    else:
        response=requests.get(URL,headers={'Range':'bytes=0-524287','Accept-Encoding':'identity'},timeout=(10,35))
        response.raise_for_status()
        assert response.status_code==206 and len(response.content)==524288
        header=response.content
        length=int(response.headers['Content-Range'].split('/')[-1])
        with cache.open('wb'): pass
        if os.name=='nt': subprocess.run(['fsutil','sparse','setflag',str(cache)],check=True,stdout=subprocess.DEVNULL)
        with cache.open('r+b') as f:
            f.truncate(length);f.seek(0);f.write(header)
    with tifffile.TiffFile(cache) as tf:
        page=tf.pages[0]
        offsets=page.dataoffsets;counts=page.databytecounts
        tw,th=page.tilewidth,page.tilelength
    with rasterio.open(cache) as src:
        bounds=transform_bounds('EPSG:4326',src.crs,*BBOX,densify_pts=41)
        raw=from_bounds(*bounds,src.transform)
        col,row=max(0,math.floor(raw.col_off)-3),max(0,math.floor(raw.row_off)-3)
        endcol,endrow=min(src.width,math.ceil(raw.col_off+raw.width)+3),min(src.height,math.ceil(raw.row_off+raw.height)+3)
        win=Window(col,row,endcol-col,endrow-row)
        across=math.ceil(src.width/tw)
        indices=[y*across+x for y in range(row//th,(endrow-1)//th+1) for x in range(col//tw,(endcol-1)//tw+1)]
        transform=src.window_transform(win);crs=src.crs
    jobs=[(int(offsets[i]),int(offsets[i]+counts[i]-1)) for i in indices]
    print(tile,'Reading',len(jobs),'native blocks /',sum(b-a+1 for a,b in jobs),'original bytes',flush=True)
    if not cached:
        with ThreadPoolExecutor(max_workers=4) as pool,cache.open('r+b') as f:
            for start,content in pool.map(lambda p:get_bytes(*p),jobs):
                f.seek(start);f.write(content)
    with rasterio.open(cache) as src:
        native=src.read([1,2,3],window=win)
    dest=np.zeros_like(rgb)
    for band in range(3):
        reproject(native[band],dest[band],src_transform=transform,src_crs=crs,dst_transform=raster_bounds(*BBOX,width,height),dst_crs='EPSG:4326',resampling=Resampling.bilinear)
    valid=np.any(dest!=0,axis=0);rgb[:,valid]=dest[:,valid]
    if tile=='GU':
        local_bbox=[95.738,29.828,95.81,29.883]
        local=np.zeros((3,640,720),dtype='uint8')
        for band in range(3):
            reproject(native[band],local[band],src_transform=transform,src_crs=crs,dst_transform=raster_bounds(*local_bbox,720,640),dst_crs='EPSG:4326',resampling=Resampling.bilinear)
        local_black=float(np.mean(np.all(local==0,axis=0)))
        print('Local retained all-black fraction',local_black,'count',int(np.sum(np.all(local==0,axis=0))),flush=True)
        assert local_black<0.0001
        Image.fromarray(local.transpose(1,2,0)).save(OUT/'sentinel-zhamu-native.webp',quality=94,method=6)
    records.append(dict(url=URL,item=f'S2C_46R{tile}_20251213_0_L2A',nativeWindow=list(win.flatten()),nativeBlocks=len(indices),sourceBytesRead=sum(b-a+1 for a,b in jobs)+len(header)))
missing=float(np.mean(np.all(rgb==0,axis=0)))
assert missing<=0.000001,missing
print("Retained all-black source pixels",np.argwhere(np.all(rgb==0,axis=0)).tolist(),flush=True)
image=OUT/'sentinel-R07.webp'
Image.fromarray(rgb.transpose(1,2,0)).save(image,quality=92,method=6)
record=dict(status='native_windows_read_and_reprojected',sources=records,date='2025-12-13',bbox=BBOX,sourcePixelMetres=10,output=[width,height],missingFraction=missing,sha256=hashlib.sha256(image.read_bytes()).hexdigest(),localCrop=dict(bbox=local_bbox,output=[720,640],sourcePixelMetres=10,allBlackFraction=local_black,sha256=hashlib.sha256((OUT/'sentinel-zhamu-native.webp').read_bytes()).hexdigest()),scope='Only this R07 view; sparse local source caches are NOT complete source rasters; no cloud/shadow or current-weather claim')
(OUT/'pixel-gate.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps(record),flush=True)
