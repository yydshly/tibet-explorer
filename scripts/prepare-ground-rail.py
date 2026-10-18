"""Rebuild the observation collection from archived OSM ways.

These IDs were discovered through shared endpoint node /ways responses from
api.openstreetmap.org on 2026-10-17. Do not add a straight connector if source
nodes cease to connect; the runtime graph and source-edge test must fail.
"""
from pathlib import Path
import json, hashlib, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
archive=ROOT/'qa/imagery-ground-20261017'
output=ROOT/'public/assets/terrain/lhasa-ground'
data=json.loads((ROOT/'public/data/local-places/lhasa.geojson').read_text(encoding='utf-8'))
data['metadata'].update(originalOsmWindow=data['metadata']['bbox'],bbox=[90.98,29.54,91.20,29.75],railAcquiredAt='2026-10-17',railSource='https://api.openstreetmap.org/api/0.6/',groundRouteStart=[91.0001435,29.638116],expandedScope='Expanded image/DSM window; only the Qingzang railway source-node chain is extended. Other OSM geometry retains its original acquisition scope.')
ids=['405934377','405934387','122707231','122707235','122707248','265383569','265383556','475966450','475966449','475966448','475966447','70517097']
existing={f['id'] for f in data['features']}
for ident in ids:
    source=ET.fromstring((archive/f'way-{ident}.osm').read_bytes())
    nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in source.findall('node')}
    way=source.find('way'); node_ids=[n.attrib['ref'] for n in way.findall('nd')]
    tags={t.attrib['k']:t.attrib['v'] for t in way.findall('tag')}
    if 'way/'+ident not in existing:
        data['features'].append(dict(type='Feature',id='way/'+ident,properties=dict(featureClass='railway',tags=tags,sourceNodeIds=node_ids,sourceVersion=way.attrib['version']),geometry=dict(type='LineString',coordinates=[nodes[n] for n in node_ids])))
data['features']=[f for f in data['features'] if f['properties']['featureClass']=='railway' or f['id'] in ['way/122707268','way/122707217']]
path=output/'lhasa.geojson'
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
manifest=output/'manifest.json'; meta=json.loads(manifest.read_text(encoding='utf-8'))
meta['railway']=dict(source='https://api.openstreetmap.org/api/0.6/',acquiredAt='2026-10-17',extendedWayIds=ids,archive='qa/imagery-ground-20261017/way-*.osm',attribution='© OpenStreetMap contributors',license='https://www.openstreetmap.org/copyright',scope='Connected source geometry; bridge/tunnel horizontal alignment, not surveyed track elevations or historic reconstruction.')
meta['files'][path.name]=dict(bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
manifest.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
