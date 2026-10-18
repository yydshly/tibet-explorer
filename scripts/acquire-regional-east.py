"""Acquire current OSM city geometry and route evidence, without invented links.

Raw source XML, its SHA and node/way versions are archived. Re-running reuses
that exact snapshot unless --refresh is supplied. Historical events are separate
evidence; OSM editing timestamps never stand for construction dates.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, heapq, importlib.util, json, math
from pathlib import Path
import urllib.request, urllib.parse
from datetime import datetime, timezone
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/regional-places'
RAW = ROOT / 'qa/regional-spatial-continuity/raw-east'
CONFIG = {
    'chamdo': {'name': 'Chamdo', 'bbox': [97.13, 31.10, 97.23, 31.20]},
    'nagqu': {'name': 'Nagqu', 'bbox': [91.958, 31.42, 92.09, 31.52]},
    'chamdo-bangda': {'name': 'Bangda airport exterior', 'bbox': [97.08, 30.52, 97.14, 30.59], 'includeAirport': True},
    'chamdo-airport-corridor': {'name':'Actual road network between Chamdo and Bangda','bbox':[97.0,30.50,97.65,31.20], 'overpass':True},
}

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf8')

def acquire(place):
    c = CONFIG[place]; p = RAW / (place+'-map.osm')
    query=None
    if c.get('overpass'):
        w,s,e,n=c['bbox'];query=f'[out:xml][timeout:90];way[highway~"^(trunk|primary|secondary|motorway|trunk_link|primary_link|secondary_link|motorway_link)$"]({s},{w},{n},{e});(._;>;);out meta;'
        url='https://overpass-api.de/api/interpreter?data='+urllib.parse.quote(query)
    else:
        url = 'https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str, c['bbox']))
    if not p.exists() or ARGS.refresh:
        request = urllib.request.Request(url, headers={'User-Agent': 'TibetExplorerRegionalSource/1.0 (educational one-off archive)'})
        with urllib.request.urlopen(request, timeout=100) as response:
            raw = response.read()
            p.write_bytes(raw)
            dump(RAW/(place+'-response.json'), {'url':url,'status':response.status,'headers':dict(response.headers),'acquiredAt':datetime.now(timezone.utc).isoformat(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
    spec=importlib.util.spec_from_file_location('osm_source_converter', ROOT/'qa/place-grounding/prepare-osm-places.py')
    converter=importlib.util.module_from_spec(spec); spec.loader.exec_module(converter)
    converter.OUT=OUT
    report=converter.convert(place,c,p)
    path=OUT/(place+'.geojson'); fc=json.loads(path.read_text(encoding='utf8'))
    import xml.etree.ElementTree as ET
    tree=ET.parse(p).getroot(); ways={int(e.attrib['id']):[int(n.attrib['ref']) for n in e.findall('nd')] for e in tree.findall('way')}
    for f in fc['features']:
        props=f['properties']; props['osmType']=props['osm_type']; props['osmId']=props['osm_id']
        if props['osm_type']=='way':
            props['sourceNodeIds']=ways[props['osm_id']]; props['nodeIds']=ways[props['osm_id']]
            # A mapped closed worship/heritage perimeter is an area reference,
            # not a building volume or a reconstruction of its founding period.
            if f['geometry']['type']=='LineString' and ways[props['osm_id']][0]==ways[props['osm_id']][-1] and props['tags'].get('amenity') in ['place_of_worship','school','hospital']:
                f['geometry']={'type':'Polygon','coordinates':[converter.orient_ring(f['geometry']['coordinates'],True)]}
    data_meta=tree.find('meta');data_timestamp=data_meta.attrib.get('osm_base') if data_meta is not None else None
    fc['metadata'].update({'sourceUrl':url,'query':query,'dataTimestamp':data_timestamp,'rawSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourceSnapshot':f'qa/regional-spatial-continuity/raw-east/{p.name}', 'sourceDateKind':'acquisition date; OSM timestamp is edit time, never construction date'})
    dump(path,fc)
    report['bbox']=c['bbox']; report['sourceUrl']=url;report['query']=query;report['dataTimestamp']=data_timestamp
    report['geometryCounts']=dict(Counter(f['geometry']['type'] for f in fc['features']))
    report['rawXml']=f'../../../qa/regional-spatial-continuity/raw-east/{p.name}'
    report['outputBytes']=path.stat().st_size; report['outputSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    return report

def metres(a,b):
    return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111320

def anchor(f):
    g=f['geometry'];p=g['coordinates']
    if g['type']=='Point':return p
    if g['type']=='Polygon':p=p[0]
    if g['type']=='MultiPolygon':p=p[0][0]
    return [(min(x[0] for x in p)+max(x[0] for x in p))/2,(min(x[1] for x in p)+max(x[1] for x in p))/2]

def graph(features, kind='road'):
    nodes={};edges={}
    for f in features:
        p=f['properties'];t=p['tags'];g=f['geometry']
        if g['type']!='LineString' or p['featureClass']!=kind or t.get('access') in ['private','no']:continue
        if kind=='road' and t.get('highway') in ['footway','steps','path','cycleway','pedestrian','construction','proposed','track']:continue
        if kind=='railway' and t.get('railway')!='rail':continue
        coords=g['coordinates'];ids=p.get('sourceNodeIds',[])
        if len(coords)!=len(ids):raise ValueError('source node identity missing')
        for n,c in zip(ids,coords):nodes[n]=c;edges.setdefault(n,{})
        for i in range(1,len(ids)):
            a,b=ids[i-1:i+1];weight=metres(coords[i-1],coords[i]);oneway=t.get('oneway')
            if kind!='road' or oneway!='-1':edges[a][b]=(weight,f['id'])
            if kind!='road' or oneway not in ['yes','1','true']:edges[b][a]=(weight,f['id'])
    return nodes,edges

def route(features, identifier,title,start,end,kind='road',**extra):
    nodes,edges=graph(features,kind)
    a=min(nodes,key=lambda n:metres(start,nodes[n]));b=min(nodes,key=lambda n:metres(end,nodes[n]))
    dist={a:0};prev={};todo=[(0,a)]
    while todo:
        value,current=heapq.heappop(todo)
        if current==b:break
        if value!=dist[current]:continue
        for other,(length,feature) in edges[current].items():
            proposed=value+length
            if proposed<dist.get(other,float('inf')):dist[other]=proposed;prev[other]=(current,feature);heapq.heappush(todo,(proposed,other))
    if b not in dist:
        return {'id':identifier,'title':title,'connected':False,'coordinates':[],'featureIds':[],'sourceNodeIds':[],'startGapMetres':metres(start,nodes[a]),'endGapMetres':metres(end,nodes[b]),'endpointScope':'原始OSM节点网络不连通，未补线。',**extra}
    ids=[b];ways=[]
    while ids[0]!=a:
        last,way=prev[ids[0]];ids.insert(0,last);ways.insert(0,way)
    return {'id':identifier,'title':title,'kind':kind,'connected':True,'coordinates':[nodes[n] for n in ids],'featureIds':list(dict.fromkeys(ways)),'sourceNodeIds':ids,'sourceWayIdsByEdge':ways,'geometryLengthMeters':round(dist[b],2),'startGapMetres':round(metres(start,nodes[a]),2),'endGapMetres':round(metres(end,nodes[b]),2),'endpointScope':'仅沿相同原始OSM节点相连的已绘道路/轨道；与地物参照之间的端点距离明确保留，未补出入口或跨越缺段。不是核验过的驾驶、铁路作业或步行导航。',**extra}

def routes_for(place):
    data=json.loads((OUT/(place+'.geojson')).read_text(encoding='utf8'));features=data['features'];byid={f['id']:f for f in features}
    def mark(i,name,role,sources):
        return {'id':i.replace('/','-'),'featureId':i,'name':name,'coordinates':anchor(byid[i]),'role':role,'sourceIds':sources+['regional-east-current-osm']}
    if place=='chamdo':
        heritage=anchor(byid['way/449021629']);town=anchor(byid['node/6343074962']);bridge=byid['way/1179902329']['geometry']['coordinates'];start=max([bridge[0],bridge[-1]],key=lambda p:metres(p,heritage));sichuan=byid['way/145393632']['geometry']['coordinates'];sichuan_start=max([sichuan[0],sichuan[-1]],key=lambda p:metres(p,heritage))
        routes=[route(features,'chamdo-cross-river','四川桥—强巴林寺周边已绘公路',sichuan_start,heritage,startFeatureId='way/145393632',endFeatureId='way/449021629'),route(features,'chamdo-maocaoba-heritage','马草坝大桥—强巴林寺周边已绘公路',start,heritage,startFeatureId='way/1179902329',endFeatureId='way/449021629'),route(features,'chamdo-city-services','城关镇政府—强巴林寺周边已绘道路',town,heritage,startFeatureId='node/6343074962',endFeatureId='way/449021629')]
        landmarks=[mark('way/449021629','强巴林寺现状围墙范围','heritage',['regional-chamdo-heritage']),mark('way/145393632','四川桥 · 实际跨河道路段','bridge',['regional-chamdo-city-space']),mark('way/1179902329','马草坝大桥 · 实际桥面道路','bridge',['regional-chamdo-city-space']),mark('node/6343074962','城关镇政府 · 城市服务参照','service',['regional-east-locators'])]
    elif place=='nagqu':
        station=anchor(byid['way/28446086']);town=anchor(byid['node/5201247413']);school=anchor(byid['node/3134532593']);railend=byid['way/257845498']['geometry']['coordinates'][0];railstart=byid['way/257845481']['geometry']['coordinates'][0]
        routes=[route(features,'nagqu-station-city','那曲站周边已绘道路—城区服务点',station,town,startFeatureId='way/28446086',endFeatureId='node/5201247413'),route(features,'nagqu-station-school','那曲站周边已绘道路—学校参照',station,school,startFeatureId='way/28446086',endFeatureId='node/3134532593'),route(features,'nagqu-rail-yard','青藏线—那曲已绘铁路侧线',railstart,railend,'railway',startFeatureId='way/257845481',endFeatureId='way/257845498')]
        landmarks=[mark('node/7296275987','那曲站 · 原始车站点','station',['regional-nagqu-rail']),mark('way/28446086','那曲站现状站房轮廓','station-building',['regional-nagqu-rail']),mark('way/852980006','站场铁路用地 · 非物流园界','rail-yard',['regional-nagqu-logistics']),mark('node/5201247413','那曲市政府 · 城区服务参照','service',['regional-east-locators']),mark('node/3134532593','那曲县中学 · 已绘学校参照','school',['regional-east-locators'])]
    else:return
    output={'schemaVersion':1,'cityId':place,'acquiredAt':data['metadata']['acquiredAt'],'attribution':data['metadata']['attribution'],'scope':'现状地物与相连OSM节点网络。几何与历史事件分别引用；不复原过去建筑或将交通事件当成空间扩张的单一原因。','routes':routes,'landmarks':landmarks}
    dump(OUT/(place+'-routes.json'),output)
    print(json.dumps({'city':place,'routes':[{k:r[k] for k in ['id','connected','startGapMetres','endGapMetres']} for r in routes]}),flush=True)

def airport_route():
    names=['chamdo','chamdo-bangda','chamdo-airport-corridor']
    if not all((OUT/(name+'.geojson')).exists() for name in names):return
    collections=[json.loads((OUT/(name+'.geojson')).read_text(encoding='utf8')) for name in names]
    byid={f['id']:f for data in collections for f in data['features']}
    result=route(list(byid.values()),'chamdo-airport-transfer','昌都城区—邦达机场周边实际相连道路',anchor(byid['node/6343074962']),anchor(byid['way/388083392']),startFeatureId='node/6343074962',endFeatureId='way/388083392')
    arrival=route(list(byid.values()),'chamdo-airport-arrival','邦达机场周边—昌都城区实际相连道路',anchor(byid['way/388083392']),anchor(byid['node/6343074962']),startFeatureId='way/388083392',endFeatureId='node/6343074962')
    for current in [result,arrival]:
        current['sourceCollections']=[name+'.geojson' for name in names]
        current['endpointScope']='原始共享节点相连的现状道路到航站楼周边已绘道路端点；城区参照端约24米、航站楼参照端约51米缺距未补线。未核验出入口、道路权限、当天通行或用时，不表示1995年公路线形。'
        current['legBreaks']=[]
        last=None
        for i,way in enumerate(current.get('sourceWayIdsByEdge',[])):
            tags=byid[way]['properties']['tags'];ref=tags.get('ref') or tags.get('highway')
            if ref!=last:current['legBreaks'].append({'startEdge':i,'sourceWayId':way,'sourceRef':tags.get('ref'),'sourceHighway':tags.get('highway'),'name':tags.get('name')});last=ref
    metadata={'schemaVersion':1,'cityId':'chamdo','acquiredAt':collections[2]['metadata']['acquiredAt'],'bbox':CONFIG['chamdo-airport-corridor']['bbox'],'attribution':'Copyright OpenStreetMap contributors; ODbL 1.0','routes':[result,arrival],'landmarks':[{'id':'bangda-airport-current-perimeter','featureId':'way/101968188','name':'邦达机场 · 现状围场轮廓','coordinates':anchor(byid['way/101968188']),'role':'airport','sourceIds':['regional-chamdo-bangda','regional-east-current-osm']},{'id':'bangda-terminal-current-reference','featureId':'way/388083392','name':'邦达现状航站楼轮廓参考','coordinates':anchor(byid['way/388083392']),'role':'airport-terminal','sourceIds':['regional-east-current-osm']}]}
    dump(OUT/'chamdo-airport-routes.json',metadata)
    print(json.dumps({'id':result['id'],'connected':result['connected'],'geometryLengthMeters':result.get('geometryLengthMeters'),'nodes':len(result['coordinates']),'ways':len(result['featureIds'])}),flush=True)

def validate():
    """Verify shipped vertices and every route edge against archived IDs."""
    import xml.etree.ElementTree as ET
    coordinates={};ways={};snapshots=[]
    for place in CONFIG:
        path=OUT/(place+'.geojson');raw=RAW/(place+'-map.osm')
        if not path.exists() or not raw.exists():continue
        data=json.loads(path.read_text(encoding='utf8'));tree=ET.parse(raw).getroot()
        source_nodes={int(e.attrib['id']):[float(e.attrib['lon']),float(e.attrib['lat'])] for e in tree.findall('node')}
        source_coordinates={tuple(p) for p in source_nodes.values()};count=0
        def check(value):
            nonlocal count
            if isinstance(value[0],(int,float)):
                assert tuple(value) in source_coordinates, (place,value);count+=1
            else:
                for child in value:check(child)
        for f in data['features']:
            check(f['geometry']['coordinates'])
            if f['properties']['osm_type']=='way':ways[f['id']]=f
        coordinates.update(source_nodes)
        assert hashlib.sha256(raw.read_bytes()).hexdigest()==data['metadata']['rawSha256']
        snapshots.append({'id':place,'features':len(data['features']),'verticesVerified':count,'rawSha256':data['metadata']['rawSha256'],'outputSha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    results=[]
    for filename in ['chamdo-routes.json','nagqu-routes.json','chamdo-airport-routes.json']:
        path=OUT/filename
        if not path.exists():continue
        for r in json.loads(path.read_text(encoding='utf8'))['routes']:
            ids=r['sourceNodeIds'];assert len(ids)==len(r['coordinates'])
            for i,n in enumerate(ids):assert coordinates[n]==r['coordinates'][i]
            for i,source in enumerate(r.get('sourceWayIdsByEdge',[])):
                way=ways[source];ns=way['properties']['sourceNodeIds'];a,b=ids[i:i+2]
                pairs=list(zip(ns,ns[1:]));forward=(a,b) in pairs;backward=(b,a) in pairs
                assert forward or backward,(r['id'],a,b,source)
                if r['kind']=='road':
                    oneway=way['properties']['tags'].get('oneway');assert not(oneway=='-1' and forward);assert not(oneway in ['yes','1','true'] and backward)
            results.append({'id':r['id'],'connected':r['connected'],'nodes':len(ids),'edgesVerified':len(ids)-1,'ways':len(r['featureIds']),'geometryLengthMeters':r.get('geometryLengthMeters'),'startGapMetres':r['startGapMetres'],'endGapMetres':r['endGapMetres']})
    dump(ROOT/'qa/regional-spatial-continuity/east-connectivity-validation.json',{'checkedAt':datetime.now(timezone.utc).isoformat(),'status':'passed','method':'Every shipped vertex equals an archived OSM node coordinate; every route edge follows consecutive original node IDs in the cited source way and respects source one-way tags. No endpoint connector was added.','snapshots':snapshots,'routes':results})

def main():
    OUT.mkdir(parents=True,exist_ok=True); RAW.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        records=list(pool.map(acquire, ARGS.places))
    existing_path=OUT/'east-sources.json'
    existing=json.loads(existing_path.read_text(encoding='utf8')).get('places',[]) if existing_path.exists() else []
    merged={r['id']:r for r in existing}
    merged.update({r['id']:r for r in records})
    dump(existing_path,{'schemaVersion':1,'attribution':'Copyright OpenStreetMap contributors; ODbL 1.0','places':list(merged.values())})
    for place in ARGS.places:routes_for(place)
    airport_route()
    validate()
    print(json.dumps([{'id':r['id'],'bytes':r['outputBytes'],'counts':r['featureCounts']} for r in records]),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('places',nargs='*',default=list(CONFIG));parser.add_argument('--refresh',action='store_true');ARGS=parser.parse_args();main()
