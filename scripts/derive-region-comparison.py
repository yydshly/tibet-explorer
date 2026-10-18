"""Same 100 km west-east transects from the archived DEM, not city elevations."""
import hashlib, json, math, struct
from pathlib import Path

root = Path(__file__).resolve().parent.parent
raw = (root / 'public/assets/terrain/tibet-regional-dem.int16').read_bytes()
grid = struct.unpack('<' + str(len(raw)//2) + 'h', raw)
locators = json.loads((root / 'public/assets/atlas-place-references.json').read_text(encoding='utf-8'))
places = [('lhasa','拉萨',1159150879),('shigatse','日喀则',1159149873),('shannan','山南·泽当','1279498'),('nyingchi','林芝',1159146957),('chamdo','昌都',1159146959),('nagqu','那曲',1159146955),('ngari','阿里·狮泉河','1280003')]
def sample(lon,lat):
    x=(lon-76)/25*448;y=(38-lat)/13*256
    ix=int(x);iy=int(y);fx=x-ix;fy=y-iy
    a=grid[iy*449+ix];b=grid[iy*449+ix+1];c=grid[(iy+1)*449+ix+1];d=grid[(iy+1)*449+ix]
    return a+(b-a)*fx+(d-a)*fy if fx+fy<=1 else c+(d-c)*(1-fx)+(b-c)*(1-fy)
rows=[]
for id,name,key in places:
    if isinstance(key,int):
        item=next(p for p in locators['naturalEarth'] if p['properties']['ne_id']==key)
        lon,lat=item['geometry']['coordinates']
    else:
        item=next(p for p in locators['geoNames'] if str(p['geonameId'])==key)
        lon,lat=item['longitude'],item['latitude']
    points=[]
    for i in range(21):
        offset=-50+i*5; x=lon+offset/(111.32*math.cos(math.radians(lat)))
        points.append({'km':offset,'longitude':x,'latitude':lat,'metres':round(sample(x,lat),3)})
    rows.append({'id':id,'name':name,'longitude':lon,'latitude':lat,'points':points})
out={'demSha256':hashlib.sha256(raw).hexdigest(),'source':'/assets/terrain/tibet-regional-dem.source.json','locators':'/assets/atlas-place-references.json','lengthKm':100,'axisMetres':[0,8000],'method':'聚居地参考点东西各50km，间隔5km；与地图相同的三角网插值。中点值为粗网格采样，不是城区官方海拔、地区平均或山峰实测。','places':rows}
(root/'src/data/region-comparison.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
