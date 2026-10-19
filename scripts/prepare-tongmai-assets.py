"""Prepare ONLY R05/R06 from archived source nodes and verified native pixels.

Run after scripts/prepare-tongmai-pixels.py has passed its bounded pixel gate.
The large research source rasters remain outside the public product.
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
gate=ROOT.parent/'review/g318-tongmai-20261020'
out=ROOT/'public/assets/routes/g318-tongmai'
out.mkdir(parents=True,exist_ok=True)
pixels=json.loads((gate/'pixel-gate.json').read_text(encoding='utf-8'))
assert pixels['missingFraction']<=0.000001 and pixels['status']=='native_windows_read_and_reprojected'
bbox=pixels['bbox'];cols,rows=641,761
dx=(bbox[2]-bbox[0])/(cols-1);dy=(bbox[3]-bbox[1])/(rows-1)
transform=from_origin(bbox[0]-dx/2,bbox[3]+dy/2,dx,dy)
grid=np.full((rows,cols),-9999,dtype='float32');source_files=[]
for f in sorted((research/'raw/rasters').iterdir()):
    with rasterio.open(f) as src:
        w,s,e,n=max(bbox[0]-dx,src.bounds.left),max(bbox[1]-dy,src.bounds.bottom),min(bbox[2]+dx,src.bounds.right),min(bbox[3]+dy,src.bounds.top)
        if w>=e or s>=n: continue
        window=from_bounds(w,s,e,n,src.transform).round_offsets().round_lengths()
        native=src.read(1,window=window)
        assert np.all(np.isfinite(native)) and native.min()>0
        dest=np.full_like(grid,-9999)
        reproject(native,dest,src_transform=src.window_transform(window),src_crs=src.crs,dst_transform=transform,dst_crs='EPSG:4326',src_nodata=-9999,dst_nodata=-9999,resampling=Resampling.bilinear)
        valid=dest>0;grid[valid]=dest[valid]
        source_files.append(dict(file=f.name,sourceSha256=hashlib.sha256(f.read_bytes()).hexdigest(),nativeWindow=list(window.flatten()),nativeShape=list(native.shape),completeObject=f.suffix=='.tif'))
assert np.all(grid>0),int(np.sum(grid<=0))
np.rint(grid).astype('<i2').tofile(out/'terrain.int16')
shutil.copy2(gate/'sentinel-R05-R06.webp',out/'sentinel-20251213.webp')
shutil.copy2(research/'images/tongmai-2014.jpg',out/'tongmai-20140921.jpg')
chain=json.loads((research/'g318-source-chain.geojson').read_text(encoding='utf-8'))
p=chain['properties'];start=p['sourceNodeIds'].index(7365874802);end=2100
coords=chain['geometry']['coordinates'][start:end+1]
nodeids=p['sourceNodeIds'][start:end+1];wayids=p['sourceWayIdsByEdge'][start:end]
raw=json.loads((research/'raw/osm-corridor.json').read_text(encoding='utf-8'))
nodes={e['id']:e for e in raw['elements'] if e['type']=='node'}
ways={e['id']:e for e in raw['elements'] if e['type']=='way'}
for i,wayid in enumerate(wayids):
    ids=ways[wayid]['nodes']
    assert any(ids[j:j+2]==nodeids[i:i+2] or ids[j:j+2]==list(reversed(nodeids[i:i+2])) for j in range(len(ids)-1))
    for j in (i,i+1):
        n=nodes[nodeids[j]];assert coords[j]==[n['lon'],n['lat']]
route=dict(coordinates=coords,sourceNodeIds=nodeids,sourceWayIdsByEdge=wayids,wayTags={str(i):ways[i].get('tags',{}) for i in set(wayids)},startNode=7365874802,endNode=nodeids[-1])
audit=json.loads((research/'geometry-audit.json').read_text(encoding='utf-8'))
def inside(p):return bbox[0]<=p[0]<=bbox[2] and bbox[1]<=p[1]<=bbox[3]
water=[]
for group in ('lulang','layue','yigong','parlung'):
    for wid in audit['waterways'][group]['sourceWays']:
        way=ways[int(wid.split('/')[1])];parts=[];part=[]
        for nid in way['nodes']:
            n=nodes[nid];xy=[n['lon'],n['lat']]
            if inside(xy):part.append(xy)
            else:
                if len(part)>1:parts.append(part)
                part=[]
        if len(part)>1:parts.append(part)
        for line in parts:water.append(dict(id=wid,group=group,name={'lulang':'鲁朗河','layue':'拉月曲','yigong':'易贡藏布','parlung':'帕隆藏布'}[group],coordinates=line))
(out/'geometry.json').write_text(json.dumps(dict(route=route,water=water,confluence=dict(node=289310112,coordinate=[95.06396,30.0960196]),bridgeWay=539990326,tunnelWay=624160737),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
meta=dict(id='g318-lulang-tongmai-r05-r06',preparedOn='2026-10-20',bbox=bbox,columns=cols,rows=rows,verticalExaggeration=1,
    imagery=dict(url='/assets/routes/g318-tongmai/sentinel-20251213.webp',**pixels),
    elevation=dict(url='/assets/routes/g318-tongmai/terrain.int16',dataset='Copernicus GLO-30 DSM',nativeSpacingMetres=30,displaySampleMetres=[round(dx*111320*math.cos(math.radians(29.9)),1),round(dy*111320,1)],minimum=int(grid.min()),maximum=int(grid.max()),sourceCrops=source_files,scope='All actual production-view native source windows decoded. DSM is surface, not road/bridge/tunnel survey. Two source objects remain partial; this crop only was verified.'),
    geometry=dict(url='/assets/routes/g318-tongmai/geometry.json',source='/project-review/corridor-evidence/g318-source-chain.geojson',acquiredOn='2026-10-19',nodes=len(coords),edges=len(coords)-1,allOriginalAdjacentSourceEdges=True,scope='Actual main-road join, never snapped from pilot service-road endpoint; original source edges, no invented connection.'),
    photo=dict(url='/assets/routes/g318-tongmai/tongmai-20140921.jpg',date='2014-09-21',author='Zhangmoon618',license='CC BY-SA 4.0',licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/',source='https://commons.wikimedia.org/wiki/File:20140921_Tongmai_Bridge.jpg',scope='Dated old bridge and visible construction background; not new bridge/current conditions. No watermark observed in reviewed full frame.'),
    sources=[dict(title='西藏自治区政府：一路守护幸福接力',url='https://www.xizang.gov.cn/xwzx_406/bmkx/202408/t20240806_428707.html',scope='2015年12月新桥通车；2016-04-13整段改建通车。'),dict(title='© OpenStreetMap contributors',url='https://www.openstreetmap.org/copyright'),dict(title='Copernicus GLO-30',url='https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'),dict(title='Copernicus Sentinel许可',url='https://cds.climate.copernicus.eu/licences/ec-sentinel')],
    limits=['Winter2025 image, not current weather; snow and shadow retained, not generated.','Projected bridge/tunnel lines locate sourced plan geometry, not measured deck or tunnel elevations.','No reconstructed historical road or drive inside tunnels; no current road-opening/parking guarantee.'],
    files={f.name:dict(bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest()) for f in out.iterdir() if f.name!='manifest.json'})
(out/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(nodes=len(coords),edges=len(coords)-1,terrain=[cols,rows],range=[int(grid.min()),int(grid.max())],files=meta['files']),ensure_ascii=False))
