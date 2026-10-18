"""Illustrative downhill paths on the archived DEM, not a watershed delineation.
No sink filling, fabricated tributaries, calibrated runoff or hydrological forecast.
"""
import json, struct, hashlib, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
raw=(root/'public/assets/terrain/tibet-regional-dem.int16').read_bytes()
z=struct.unpack('<'+'h'*(len(raw)//2),raw)
cols,rows=449,257
def coord(i): return [76+(i%cols)*25/448,38-(i//cols)*13/256]
river=json.loads((root/'src/data/yarlung-river.json').read_text(encoding='utf-8'))
course=[p for f in river['features'] for p in f['geometry']['coordinates'][0]]
# Raster cells traversed by the generalized source mainstem. These are only
# resolution-level receiving cells, never surveyed stream confluences.
receivers={}
for a,b in zip(course,course[1:]):
    steps=max(1,math.ceil(max(abs(a[0]-b[0])*448/25,abs(a[1]-b[1])*256/13)*4))
    for k in range(steps+1):
        t=k/steps;lon=a[0]+(b[0]-a[0])*t;lat=a[1]+(b[1]-a[1])*t
        c=round((lon-76)*448/25);r=round((38-lat)*256/13)
        if 0<=c<cols and 0<=r<rows: receivers[r*cols+c]=[lon,lat]
def downstream(i):
    c,r=i%cols,i//cols;best=None;slope=0
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if not(dx or dy) or not(0<=c+dx<cols and 0<=r+dy<rows):continue
            j=(r+dy)*cols+c+dx
            d=math.hypot(dx*25/448*math.cos(math.radians(coord(i)[1])),dy*13/256)
            s=(z[i]-z[j])/d
            if s>slope:best=j;slope=s
    return best
candidates=[]
for i in range(len(z)):
    lon,lat=coord(i)
    if not(88<lon<93 and 28.5<lat<31.5) or i in receivers:continue
    path=[i]
    for _ in range(45):
        j=downstream(path[-1])
        if j is None:break
        path.append(j)
        if j in receivers:break
    if path[-1] in receivers and len(path)>=4:candidates.append(path)
selected=[]
for path in sorted(candidates,key=len,reverse=True):
    lon,lat=coord(path[0])
    if all(math.dist([lon,lat],coord(p[0]))>.14 for p in selected):selected.append(path)
    if len(selected)==12:break
assert len(selected)==12
data={'source':'/assets/terrain/tibet-regional-dem.source.json','demSha256':hashlib.sha256(raw).hexdigest(),
 'method':'D8 steepest strictly descending neighbour; no sink filling; 12 illustrative paths ending in raster cells intersected by the archived generalized mainstem.',
 'scope':'教学计算路径，不是实测支流、正式流域边界、雨量或流量预测。下渗比例为对照设定；不表达土壤实测。',
 'paths':[{'indices':p,'coordinates':[coord(i) for i in p],'heights':[z[i] for i in p],'receiver':receivers[p[-1]]} for p in selected]}
(root/'src/data/runoff-reading.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Derived',len(selected),'paths; cell counts',[len(p) for p in selected])
