"""Rebuild narrated geography from archived, unmodified public responses.
No gap filling: railway routing uses identical OSM node IDs only.
"""
import json, pathlib, math, heapq, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
QA=ROOT/'qa/narrated-geography-20261017'
read=lambda p:json.loads(p.read_text(encoding='utf8'))
osm=read(QA/'lalin-area-osm.json')
ways=[e for e in osm['elements'] if e['type']=='way' and e.get('tags',{}).get('usage')=='main' and not e['tags'].get('service')]
nodes={n:(p['lon'],p['lat']) for w in ways for n,p in zip(w['nodes'],w['geometry'])}
def distance(a,b):
 return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111320
graph={}
for w in ways:
 for a,b in zip(w['nodes'],w['nodes'][1:]):
  graph.setdefault(a,[]).append((b,distance(nodes[a],nodes[b]),w['id']))
  graph.setdefault(b,[]).append((a,distance(nodes[a],nodes[b]),w['id']))
stations=[e for e in osm['elements'] if e['type']=='node' and e.get('tags',{}).get('name') in ['拉萨','山南','林芝']]
station=lambda name:next(e for e in stations if e['tags']['name']==name)
nearest=lambda s:min(nodes,key=lambda n:distance(nodes[n],(s['lon'],s['lat'])))
start,end=nearest(station('拉萨')),nearest(station('林芝'))
queue=[(0,start)];cost={start:0};prev={}
while queue:
 d,n=heapq.heappop(queue)
 if n==end:break
 if d!=cost[n]:continue
 for m,weight,w in graph[n]:
  if d+weight<cost.get(m,float('inf')):
   cost[m]=d+weight;prev[m]=(n,w);heapq.heappush(queue,(d+weight,m))
if end not in cost:
 # Parallel station tracks need not be connected in a mainline-only extract.
 # Select the nearest reachable SOURCE node, never snap the disconnected track.
 s=station('林芝');end=min(cost,key=lambda n:distance(nodes[n],(s['lon'],s['lat'])))
 assert distance(nodes[end],(s['lon'],s['lat']))<500,'No sourced track near arrival station'
route=[end];edgeways=[]
while route[-1]!=start:
 n,w=prev[route[-1]];route.append(n);edgeways.append(w)
route.reverse();edgeways.reverse();byid={w['id']:w for w in ways}
parts=[]
for i,w in enumerate(edgeways):
 if not parts or parts[-1]['wayId']!=w:parts.append({'wayId':w,'tags':byid[w]['tags'],'nodeIds':[route[i]],'coordinates':[nodes[route[i]]]})
 parts[-1]['nodeIds'].append(route[i+1]);parts[-1]['coordinates'].append(nodes[route[i+1]])
ne=read(ROOT/'qa/yarlung-sync-20261017/natural-earth-rivers.geojson')
physical=read(QA/'natural-earth-physical-regions.geojson')
mountain=next(f for f in physical['features'] if f['properties']['NAME']=='HIMALAYAS')
rivers=[f for f in ne['features'] if f['properties']['name'] in ['Maquan','Yarlung','Dihang','Shiquan','Za','Lancang','Nu','Nile']]
airport=read(ROOT/'public/data/local-places/gunsa-airport.geojson')
runway=next(f for f in airport['features'] if f['id']=='way/154378695')
data={'metadata':{'retrievedAt':'2026-10-17','osmSource':'https://overpass-api.de/api/interpreter','osmCopyright':'https://www.openstreetmap.org/copyright','osmLicense':'ODbL-1.0','riversSource':'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/','mountainSource':'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/','naturalEarthLicense':'Public domain','scope':'Present-day source geometry. Natural Earth 1:10 million generalized rivers and approximate physical-region polygon, not 10m accuracy or watershed boundaries. Railway edges share original OSM node IDs; includes shared Lhasa approach, no station-door connectors, no historical reconstruction or live service claims. Highlighted city terrain windows are observation samples, not urban boundaries.','railSourceSha256':hashlib.sha256((QA/'lalin-area-osm.json').read_bytes()).hexdigest(),'railEndpointOffsetMetres':{name:round(distance(nodes[start if name=='拉萨' else end],(station(name)['lon'],station(name)['lat'])),1) for name in ['拉萨','林芝']},'railLengthMetres':round(cost[end]),'railCount':len(parts)},'himalaya':mountain,'rivers':rivers,'railParts':parts,'stations':stations,'gunsaRunway':runway,'airportConnection':next(r for r in read(ROOT/'public/data/local-places/transport-corridors.manifest.json')['routes'] if r['id']=='gunsa-airport-shiquanhe')}
target=ROOT/'public/data/narrated-geography.json'
target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Connected source railway:',len(parts),'ways,',len(route),'vertices,',round(cost[end]/1000,1),'km; bytes',target.stat().st_size)
