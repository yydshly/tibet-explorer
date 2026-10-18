"""Archive actual western-city OSM features and node-connected reading paths.

This is a reproducible source acquisition, not a navigation service. No line is
invented between a station node and the source road network. Historical dates
come from independent published records, never from the OSM edit timestamp.
Run with Python 3, no third-party modules. Existing raw snapshots are reused.
"""
from __future__ import annotations

import collections
import datetime
import gzip
import hashlib
import heapq
import json
import math
import pathlib
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'data' / 'regional-places'
CONFIG = {
    'shigatse': {
        'bbox': [88.845, 29.207, 88.957, 29.297],
        'landmarks': [
            {'id': 'shigatse-station', 'osm': 'node/7279526246', 'name': '日喀则站', 'role': 'station', 'sourceIds': ['regional-shigatse-station-osm', 'regional-lari-first-passenger']},
            {'id': 'tashilhunpo', 'osm': 'way/140501939', 'name': '扎什伦布寺现存范围', 'role': 'heritage', 'sourceIds': ['regional-tashilhunpo-osm', 'regional-tashilhunpo-1447']},
            {'id': 'shigatse-street-reference', 'osm': 'node/3004843702', 'name': '日喀则城区街道参考', 'role': 'city', 'sourceIds': ['regional-west-osm-acquisition']},
            {'id': 'shigatse-station-building', 'osm': 'way/361440116', 'name': '日喀则站站房现况', 'role': 'station-building', 'sourceIds': ['regional-west-osm-acquisition']},
            {'id': 'shigatse-west-station', 'osm': 'node/3740944757', 'name': '日喀则西站（货运参照）', 'role': 'freight-station', 'sourceIds': ['regional-west-osm-acquisition', 'regional-shigatse-station-life-2024']},
            {'id': 'tashilhunpo-gate-reference', 'osm': 'node/5011779078', 'name': '扎寺OSM门参照（不保证开放）', 'role': 'heritage-access-reference', 'sourceIds': ['regional-west-osm-acquisition']},
        ],
    },
    'shannan': {
        'bbox': [91.486, 29.223, 91.806, 29.35],
        'cityBBox': [91.73, 29.223, 91.806, 29.295],
        'landmarks': [
            {'id': 'shannan-station', 'osm': 'node/9087403304', 'name': '山南站', 'role': 'station', 'sourceIds': ['regional-shannan-station-osm', 'regional-shannan-passenger']},
            {'id': 'samye', 'osm': 'way/131280233', 'name': '桑耶寺现存范围', 'role': 'heritage', 'sourceIds': ['regional-samye-osm', 'regional-samye-history']},
            {'id': 'zedang-street-reference', 'osm': 'node/13770779650', 'name': '泽当街道参考', 'role': 'city', 'sourceIds': ['regional-west-osm-acquisition']},
            {'id': 'shannan-station-building', 'osm': 'way/957821150', 'name': '山南站站房现况', 'role': 'station-building', 'sourceIds': ['regional-west-osm-acquisition']},
        ],
    },
}


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8')


def distance(a, b):
    longitude = math.radians(b[0] - a[0])
    latitude = math.radians(b[1] - a[1])
    h = math.sin(latitude / 2) ** 2 + math.cos(math.radians(a[1])) * math.cos(math.radians(b[1])) * math.sin(longitude / 2) ** 2
    return 6371008.8 * 2 * math.asin(min(1, math.sqrt(h)))


def classify(tags):
    if 'highway' in tags:
        return 'road'
    if 'railway' in tags:
        return 'railway'
    if tags.get('natural') == 'water' or tags.get('waterway') == 'riverbank':
        return 'water'
    if 'waterway' in tags:
        return 'waterway'
    if 'building' in tags:
        return 'building'
    if 'landuse' in tags:
        return 'landuse'
    if 'leisure' in tags:
        return 'leisure'
    if 'natural' in tags:
        return 'natural'
    if tags.get('amenity') == 'place_of_worship' or 'historic' in tags:
        return 'heritage'
    if 'place' in tags or 'amenity' in tags or 'tourism' in tags or 'shop' in tags or tags.get('barrier') in {'gate', 'entrance'}:
        return 'place'
    return None


def signed_area(ring):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:])) / 2


def assemble_rings(members, ways):
    """Only join original endpoint-equal member ways; never fill a missing edge."""
    chains = []
    for member in members:
        ref = member.get('ref')
        if member.get('type') != 'way' or ref not in ways:
            return None
        chains.append(list(ways[ref]['nodes']))
    rings = []
    while chains:
        chain = chains.pop()
        while chain[0] != chain[-1]:
            for i, candidate in enumerate(chains):
                if chain[-1] == candidate[0]:
                    chain += candidate[1:]
                elif chain[-1] == candidate[-1]:
                    chain += list(reversed(candidate))[1:]
                elif chain[0] == candidate[-1]:
                    chain = candidate[:-1] + chain
                elif chain[0] == candidate[0]:
                    chain = list(reversed(candidate))[:-1] + chain
                else:
                    continue
                chains.pop(i)
                break
            else:
                return None
        rings.append(chain)
    return rings


def acquire(city, config):
    OUT.mkdir(parents=True, exist_ok=True)
    raw_path = OUT / f'{city}-source.osm.gz'
    provenance_path = OUT / f'{city}-source.json'
    bbox = config['bbox']
    source_url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join(map(str, bbox))
    if raw_path.exists() and provenance_path.exists():
        raw = gzip.decompress(raw_path.read_bytes())
        archived = json.loads(provenance_path.read_text(encoding='utf8'))
        # File digests describe the completed collection externally. Never
        # embed the preceding output digest into its own next regeneration.
        provenance = {key: archived[key] for key in ['id', 'acquiredAt', 'sourceUrl', 'query', 'rawFile', 'rawBytes', 'rawSha256']}
        if hashlib.sha256(raw).hexdigest() != provenance['rawSha256']:
            raise RuntimeError(f'Archived source checksum mismatch: {city}')
    else:
        request = urllib.request.Request(source_url, headers={'User-Agent': 'TibetExplorer-geographic-evidence/1.0 (source acquisition)'})
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read()
        # gzip mtime=0 keeps the archived compressed file reproducible.
        raw_path.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
        provenance = {
            'id': city, 'acquiredAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'sourceUrl': source_url, 'query': {'api': '/api/0.6/map', 'bbox': bbox},
            'rawFile': raw_path.name, 'rawBytes': len(raw), 'rawSha256': hashlib.sha256(raw).hexdigest(),
        }
        dump(provenance_path, provenance)
    xml = ET.fromstring(raw)
    nodes, ways, relations = {}, {}, []
    for element in xml:
        tags = {tag.get('k'): tag.get('v') for tag in element.findall('tag')}
        if element.tag == 'node':
            nodes[element.get('id')] = {'position': [float(element.get('lon')), float(element.get('lat'))], 'tags': tags, 'element': element}
        elif element.tag == 'way':
            ways[element.get('id')] = {'nodes': [nd.get('ref') for nd in element.findall('nd')], 'tags': tags, 'element': element}
        elif element.tag == 'relation':
            relations.append((element, tags))

    features, omitted = [], []

    def properties(element, tags, cls):
        ident = int(element.get('id'))
        return {'osm_type': element.tag, 'osm_id': ident, 'osm_version': int(element.get('version', '1')),
                'osm_timestamp': element.get('timestamp'), 'osm_url': f'https://www.openstreetmap.org/{element.tag}/{ident}',
                'osmType': element.tag, 'osmId': ident,
                'name': tags.get('name:zh') or tags.get('name') or tags.get('ref') or '', 'featureClass': cls, 'tags': tags}

    def add(element, tags, cls, geometry, extra=None):
        props = properties(element, tags, cls)
        if extra:
            props.update(extra)
        features.append({'type': 'Feature', 'id': f'{element.tag}/{element.get("id")}', 'properties': props, 'geometry': geometry})

    for record in nodes.values():
        cls = classify(record['tags'])
        if cls:
            add(record['element'], record['tags'], cls, {'type': 'Point', 'coordinates': record['position']})
    for ident, record in ways.items():
        cls, refs, tags = classify(record['tags']), record['nodes'], record['tags']
        if not cls:
            continue
        if any(ref not in nodes for ref in refs):
            omitted.append({'id': f'way/{ident}', 'reason': 'Missing referenced source nodes; no completion invented.'})
            continue
        coordinates = [nodes[ref]['position'] for ref in refs]
        closed = len(refs) > 3 and refs[0] == refs[-1]
        area = closed and (cls not in ['road', 'railway', 'waterway'] or tags.get('area') == 'yes' or tags.get('railway') == 'platform')
        if area:
            ring = coordinates if signed_area(coordinates) >= 0 else list(reversed(coordinates))
            geometry = {'type': 'Polygon', 'coordinates': [ring]}
        else:
            geometry = {'type': 'LineString', 'coordinates': coordinates}
        add(record['element'], tags, cls, geometry, {'nodeIds': list(map(int, refs))})
    # Relations with incomplete geometry are recorded as missing, never drawn as
    # one fabricated polygon. Complete single-outer multipolygons are supported.
    for element, tags in relations:
        cls = classify(tags)
        if not cls or tags.get('type') not in ['multipolygon', 'boundary']:
            continue
        members = list(element.findall('member'))
        outer = assemble_rings([m for m in members if m.get('role') in ['', 'outer']], ways)
        inner = assemble_rings([m for m in members if m.get('role') == 'inner'], ways)
        if not outer or inner is None or len(outer) != 1 or any(ref not in nodes for ring in outer + inner for ref in ring):
            omitted.append({'id': f'relation/{element.get("id")}', 'reason': 'Incomplete or multi-outer relation; omitted rather than inventing missing members or hole ownership.'})
            continue
        rings = []
        for index, ring in enumerate(outer + inner):
            coordinates = [nodes[ref]['position'] for ref in ring]
            if (signed_area(coordinates) >= 0) != (index == 0):
                coordinates.reverse()
            rings.append(coordinates)
        add(element, tags, cls, {'type': 'Polygon', 'coordinates': rings}, {'memberWayIds': [int(m.get('ref')) for m in members if m.get('type') == 'way']})

    landmarks = []
    feature_index = {f['id']: f for f in features}
    for item in config['landmarks']:
        feature = feature_index.get(item['osm'])
        if not feature:
            raise RuntimeError(f'Missing required actual landmark {city} {item["osm"]}')
        geometry = feature['geometry']
        if geometry['type'] == 'Point':
            position = geometry['coordinates']
        else:
            points = geometry['coordinates'] if geometry['type'] == 'LineString' else geometry['coordinates'][0]
            position = [(min(p[0] for p in points) + max(p[0] for p in points)) / 2, (min(p[1] for p in points) + max(p[1] for p in points)) / 2]
        landmarks.append({'id': item['id'], 'featureId': item['osm'], 'name': item['name'], 'coordinates': position, 'role': item['role'], 'sourceIds': item['sourceIds']})

    metadata = {'schemaVersion': 1, **provenance, 'bbox': bbox, 'cityBBox': config.get('cityBBox', bbox),
                'coordinateSystem': 'WGS84 longitude, latitude (EPSG:4326)',
                'attribution': '© OpenStreetMap contributors', 'license': 'ODbL-1.0',
                'licenseUrl': 'https://opendatacommons.org/licenses/odbl/1-0/', 'copyrightUrl': 'https://www.openstreetmap.org/copyright',
                'geometryScope': 'Current OSM database extract. Whole intersecting ways retained; renderer clips by bbox. Not a historical city plan, surveyed elevation, property boundary or approved itinerary.',
                'sourceDateKind': 'acquisition datetime; per-feature timestamp is last OSM edit, never construction date',
                'featureCounts': dict(collections.Counter(f['properties']['featureClass'] for f in features)),
                'omitted': omitted,
                'gaps': ['Unmapped features remain absent.', 'No historical construction footprints, measured building heights, guaranteed public access, schedules or driving times.', 'Features may extend outside bbox because API returns whole intersecting ways.'],
                }
    collection = {'type': 'FeatureCollection', 'metadata': metadata, 'features': features}
    file = OUT / f'{city}.geojson'
    dump(file, collection)
    metadata['file'] = file.name
    metadata['bytes'] = file.stat().st_size
    metadata['sha256'] = hashlib.sha256(file.read_bytes()).hexdigest()
    dump(provenance_path, metadata)
    return collection, landmarks, nodes, ways


def point_in_ring(point, ring):
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > point[1]) != (b[1] > point[1]) and point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def road_graph(nodes, ways, avoid_rings=()):
    graph = collections.defaultdict(list)
    # A reading path uses public motor-road geometry and source oneway tags;
    # it is not a turn-restriction aware driving or public-transit itinerary.
    allowed = {'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'service', 'living_street'}
    for ident, way in ways.items():
        tags = way['tags']
        if tags.get('highway') not in allowed or tags.get('access') in {'no', 'private'} or tags.get('motor_vehicle') in {'no', 'private'}:
            continue
        for start, end in zip(way['nodes'], way['nodes'][1:]):
            if start not in nodes or end not in nodes:
                continue
            # Unknown admission/vehicle access inside a religious compound is
            # not filled in by a missing OSM access tag. Reading routes stop
            # on acquired exterior roads, never inside a temple polygon.
            a, b = nodes[start]['position'], nodes[end]['position']
            midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
            if any(point_in_ring(a, ring) or point_in_ring(b, ring) or point_in_ring(midpoint, ring) for ring in avoid_rings):
                continue
            length = distance(nodes[start]['position'], nodes[end]['position'])
            if tags.get('oneway') != '-1':
                graph[start].append((end, length, ident))
            if tags.get('oneway') not in ['yes', '1', 'true'] and tags.get('junction') != 'roundabout':
                graph[end].append((start, length, ident))
    return graph


def shortest(graph, start, end, nodes, preferred_names=None):
    costs, queue, previous = {start: 0.0}, [(0.0, start)], {}
    while queue:
        cost, node = heapq.heappop(queue)
        if cost != costs[node]:
            continue
        if node == end:
            chain, feature_ids = [end], []
            while node != start:
                node, way = previous[node]
                chain.append(node)
                feature_ids.append('way/' + way)
            return list(reversed(chain)), list(dict.fromkeys(reversed(feature_ids)))
        for target, length, way in graph[node]:
            if cost + length < costs.get(target, math.inf):
                costs[target], previous[target] = cost + length, (node, way)
                heapq.heappush(queue, (cost + length, target))
    return None


def nearest(nodes, candidates, point, limit=100):
    return sorted(((distance(nodes[node]['position'], point), node) for node in candidates), key=lambda row: row[0])[:limit]


def build_routes(city, collection, landmarks, nodes, ways):
    temple = next(f for f in collection['features'] if f['id'] == landmarks[1]['featureId'])
    graph = road_graph(nodes, ways, [temple['geometry']['coordinates'][0]])
    # Initially choose the nearest network nodes. If a component is isolated,
    # record that gap rather than silently snapping hundreds of metres away.
    station, heritage, city_reference = landmarks[0], next((p for p in landmarks if p['role'] == 'heritage-access-reference'), landmarks[1]), landmarks[2]
    routes = []
    pairs = [(station, heritage, 'station-heritage', '日喀则站外道路—扎寺外围' if city == 'shigatse' else '山南站外道路—雅江跨江道路—桑耶外围'),
             (station, city_reference, 'station-city', '日喀则站外道路—城区街道' if city == 'shigatse' else '山南站外道路—泽当街道'),
             (city_reference, heritage, 'city-heritage', '日喀则城区街道—扎寺外围' if city == 'shigatse' else '泽当街道—雅江跨江道路—桑耶外围')]
    for origin, destination, suffix, title in pairs:
        start_candidates = nearest(nodes, graph, origin['coordinates'], 40)
        end_candidates = nearest(nodes, graph, destination['coordinates'], 60)
        combinations = sorted(((a[0] + b[0], a, b) for a in start_candidates for b in end_candidates), key=lambda row: row[0])
        selected = None
        for _, start, end in combinations:
            if start[0] > 600 or end[0] > 800:
                continue
            path = shortest(graph, start[1], end[1], nodes)
            if path:
                selected = (start, end, path)
                break
        if not selected:
            continue
        start, end, (chain, feature_ids) = selected
        coordinates = [nodes[node]['position'] for node in chain]
        routes.append({'id': city + '-' + suffix, 'title': title,
                       'coordinates': coordinates, 'sourceNodeIds': list(map(int, chain)), 'featureIds': feature_ids,
                       'startGapMetres': round(start[0], 1), 'endGapMetres': round(end[0], 1),
                       'geometryLengthMetres': round(sum(distance(a, b) for a, b in zip(coordinates, coordinates[1:])), 1),
                       'startReference': origin, 'endReference': destination,
                       'endpointScope': 'Route starts and stops at actual OSM exterior-road nodes, excluding temple-compound interiors. Distances to station/heritage references are explicitly unconnected gaps, not invented access roads. A mapped gate reference does not establish public admission or current opening; a heritage centroid is not a gate.',
                       'scope': 'Shortest connected current public motor-road geometry honoring oneway/access tags. Not a bus service route, turn-restriction-aware navigation or proof of public admission. No driving times.',
                       'sourceIds': ['regional-west-osm-acquisition'],
                       'roadNames': list(dict.fromkeys(ways[f.split('/')[1]]['tags'].get('name:zh') or ways[f.split('/')[1]]['tags'].get('name') or ways[f.split('/')[1]]['tags'].get('ref') or '(unnamed source road)' for f in feature_ids)),
                       })
    output = {'id': city, 'acquiredAt': collection['metadata']['acquiredAt'], 'bbox': CONFIG[city]['bbox'],
              'routes': routes, 'landmarks': landmarks,
              'scope': 'Current connected source geometry and explicit endpoint gaps; never historical alignments, current bus instructions or bookable itineraries.'}
    dump(OUT / f'{city}-routes.json', output)
    return output


if __name__ == '__main__':
    summaries = []
    for city, config in CONFIG.items():
        collection, landmarks, nodes, ways = acquire(city, config)
        routes = build_routes(city, collection, landmarks, nodes, ways)
        summary = {'id': city, 'features': len(collection['features']), 'counts': collection['metadata']['featureCounts'], 'routes': [{key: route[key] for key in ['id', 'geometryLengthMetres', 'startGapMetres', 'endGapMetres', 'roadNames']} for route in routes['routes']]}
        summaries.append(summary)
        print(json.dumps(summary, ensure_ascii=True), flush=True)
    dump(OUT / 'west-sources.json', {'schemaVersion': 1, 'attribution': '© OpenStreetMap contributors; ODbL-1.0', 'places': [json.loads((OUT / f'{city}-source.json').read_text(encoding='utf8')) for city in CONFIG]})
