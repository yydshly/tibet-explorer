"""R07 only: continuous archived road after Tongmai, sourced terrain and dated life.
Run scripts/prepare-bomi-pixels.py first. Existing releases are read-only inputs.
"""
from pathlib import Path
import sys,json,hashlib,shutil,math
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/geo-deps'))
import rasterio,numpy as np
from rasterio.windows import from_bounds
from rasterio.warp import reproject
from rasterio.transform import from_origin
from rasterio.enums import Resampling
research=ROOT.parent/'review/g318-corridor-source-20261019'
gate=ROOT.parent/'review/g318-bomi-20261020'
out=ROOT/'public/assets/routes/g318-bomi';out.mkdir(parents=True,exist_ok=True)
pixels=json.loads((gate/'pixel-gate.json').read_text(encoding='utf-8'))
assert pixels['missingFraction']<=.000001 and pixels['status']=='native_windows_read_and_reprojected'
bbox=pixels['bbox'];cols,rows=1101,601
dx=(bbox[2]-bbox[0])/(cols-1);dy=(bbox[3]-bbox[1])/(rows-1)
transform=from_origin(bbox[0]-dx/2,bbox[3]+dy/2,dx,dy)
grid=np.full((rows,cols),-9999,dtype='float32');sources=[]
for f in sorted((research/'raw/rasters').iterdir()):
 with rasterio.open(f) as src:
  b=[max(bbox[0]-dx,src.bounds.left),max(bbox[1]-dy,src.bounds.bottom),min(bbox[2]+dx,src.bounds.right),min(bbox[3]+dy,src.bounds.top)]
  if b[0]>=b[2] or b[1]>=b[3]:continue
  window=from_bounds(*b,src.transform).round_offsets().round_lengths();native=src.read(1,window=window)
  assert np.all(np.isfinite(native)) and native.min()>0
  dest=np.full_like(grid,-9999)
  reproject(native,dest,src_transform=src.window_transform(window),src_crs=src.crs,dst_transform=transform,dst_crs='EPSG:4326',src_nodata=-9999,dst_nodata=-9999,resampling=Resampling.bilinear)
  valid=dest>0;grid[valid]=dest[valid]
  sources.append(dict(file=f.name,sha256OfPresentBytes=hashlib.sha256(f.read_bytes()).hexdigest(),nativeWindow=list(window.flatten()),shape=list(native.shape),completeObject=f.suffix=='.tif'))
assert np.all(grid>0)
np.rint(grid).astype('<i2').tofile(out/'terrain.int16')
for original,target in [('sentinel-R07.webp','sentinel-20251213.webp'),('sentinel-zhamu-native.webp','zhamu-20251213.webp')]:shutil.copy2(gate/original,out/target)
shutil.copy2(research/'images/bomi-overview-2008.jpg',out/'bomi-street-20080917.jpg')
chain=json.loads((research/'g318-source-chain.geojson').read_text(encoding='utf-8'));p=chain['properties']
incoming=json.loads((ROOT/'public/assets/routes/g318-tongmai/geometry.json').read_text(encoding='utf-8'))['route']
start=p['sourceNodeIds'].index(incoming['endNode']);coords=chain['geometry']['coordinates'][start:];ids=p['sourceNodeIds'][start:];ways=p['sourceWayIdsByEdge'][start:]
assert coords[0]==incoming['coordinates'][-1]
raw=json.loads((research/'raw/osm-corridor.json').read_text(encoding='utf-8'))
nodes={e['id']:e for e in raw['elements'] if e['type']=='node'};waymap={e['id']:e for e in raw['elements'] if e['type']=='way'}
for i,wid in enumerate(ways):
 ns=waymap[wid]['nodes'];assert any(ns[j:j+2]==ids[i:i+2] or ns[j:j+2]==ids[i:i+2][::-1] for j in range(len(ns)-1))
 assert coords[i]==[nodes[ids[i]]['lon'],nodes[ids[i]]['lat']]
audit=json.loads((research/'geometry-audit.json').read_text(encoding='utf-8'));water=[]
def inside(p):return bbox[0]<=p[0]<=bbox[2] and bbox[1]<=p[1]<=bbox[3]
for group in ('yigong','parlung'):
 for wid in audit['waterways'][group]['sourceWays']:
  way=waymap[int(wid.split('/')[1])];part=[]
  for nid in way['nodes']:
   xy=[nodes[nid]['lon'],nodes[nid]['lat']]
   if inside(xy):part.append(xy)
   else:
    if len(part)>1:water.append(dict(id=wid,group=group,name='帕隆藏布' if group=='parlung' else '易贡藏布',coordinates=part))
    part=[]
  if len(part)>1:water.append(dict(id=wid,group=group,name='帕隆藏布' if group=='parlung' else '易贡藏布',coordinates=part))
town=nodes[766963429]
geo=dict(route=dict(coordinates=coords,sourceNodeIds=ids,sourceWayIdsByEdge=ways,wayTags={str(i):waymap[i].get('tags',{}) for i in set(ways)},startNode=ids[0],endNode=ids[-1]),water=water,place=dict(name='扎木镇 · 波密县城驻地参照',node=766963429,coordinate=[town['lon'],town['lat']],scope='Town reference, not built-up boundary, attraction, entrance or photo registration'),incoming=dict(routePath='/routes/g318-east/lulang-tongmai',sharedNode=ids[0],coordinate=coords[0]))
(out/'geometry.json').write_text(json.dumps(geo,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
meta=dict(id='g318-tongmai-bomi-r07',preparedOn='2026-10-20',bbox=bbox,columns=cols,rows=rows,verticalExaggeration=1,
 imagery=dict(url='/assets/routes/g318-bomi/sentinel-20251213.webp',**pixels),
 localImagery=dict(url='/assets/routes/g318-bomi/zhamu-20251213.webp',**pixels['localCrop'],scope='Higher pixel density only; draped on the SAME display elevation surface. Not measured building detail.'),
 elevation=dict(url='/assets/routes/g318-bomi/terrain.int16',dataset='Copernicus GLO-30 DSM',nativeSpacingMetres=30,displaySampleMetres=[round(dx*111320*math.cos(math.radians(29.97)),1),round(dy*111320,1)],sources=sources,scope='Actual source windows decoded; display grid about68m. DSM is not road/bridge/tunnel elevation.'),
 geometry=dict(url='/assets/routes/g318-bomi/geometry.json',source='/project-review/corridor-evidence/g318-source-chain.geojson',acquiredOn='2026-10-19',nodes=len(coords),edges=len(coords)-1,allEdgesOriginal=True,incomingSharedNode=ids[0]),
 photo=dict(url='/assets/routes/g318-bomi/bomi-street-20080917.jpg',date='2008-09-17',author='reurinkjan',license='CC BY 2.0',source='https://commons.wikimedia.org/wiki/File:Pome_Dzong_(Tramog,_Bomi).jpg',licenseUrl='https://creativecommons.org/licenses/by/2.0/',width=999,height=664,scope='Dated whole street record. No observed watermark; no present-day/full-city/urban-growth or individual-building registration claim.'),
 sources=[dict(id='S07',title='扎木镇基本情况简介',date='2023-07-04',url='https://www.bomi.gov.cn/bmx/newxz/202012/ee7bcc2e5e7143c59d7f4725fa059033.shtml',scope='Town-level overview, not current urban statistics.'),dict(id='S08',title='波卓与传承人访谈',date='2020-08-27',url='https://www.bomi.gov.cn/bmx/xwzx/202009/4d01ce38b8c24dbe96f5b2022022091e.shtml',scope='County-level text only; legend not verified history; date ambiguity retained; no reused performance media or street-event location.')],
 licenses=dict(osm='https://www.openstreetmap.org/copyright',sentinel='https://cds.climate.copernicus.eu/licences/ec-sentinel',dem='https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'),
 limits=['Winter image, not live weather or multi-season climate evidence.','No exact bridge/tunnel/road elevation, old-road drive or generated historical city.','Photo2008, town record2023 and county culture text2020 have separate temporal/spatial scope.','No current traffic, stopping, opening or travel-time guarantee.'],
 files={f.name:dict(bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest()) for f in out.iterdir() if f.name!='manifest.json'})
(out/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(nodes=len(coords),edges=len(coords)-1,join=ids[0],terrain=[cols,rows],files=meta['files']),ensure_ascii=False))
