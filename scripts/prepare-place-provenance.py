"""Extract traceable locator records; never infer a monument coordinate from a city.

This optional data-preparation script does not alter atlas.ts. The source snapshot,
feature identifiers, original coordinates and raw selected records are retained.
"""
import hashlib
import io
import json
import pathlib
import urllib.request
import zipfile
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'atlas-place-references.json'
NE_COMMIT = '789c9904087846cc3361302857aa2e76b0ae71ff'
NE_URL = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{NE_COMMIT}/geojson/ne_10m_populated_places_simple.geojson'
GN_URL = 'https://download.geonames.org/export/dump/CN.zip'


def read(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'TibetExplorer-source-verification/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        value = response.read()
        return value, response.headers.get('Last-Modified')


ne_bytes, ne_modified = read(NE_URL)
gn_bytes, gn_modified = read(GN_URL)
ne_ids = {1159150879, 1159149873, 1159146955, 1159146957, 1159146959, 1159130125, 1159140703}
gn_ids = {'1279498', '1279715', '1279865', '1280003', '1280517', '1280678', '1280737', '1281119', '1281650', '8067345', '13512708'}
natural_earth = [feature for feature in json.loads(ne_bytes)['features'] if feature['properties']['ne_id'] in ne_ids]
geonames, regional_candidates = [], []
with zipfile.ZipFile(io.BytesIO(gn_bytes)) as archive:
    for raw in archive.open('CN.txt'):
        original = raw.decode('utf8').rstrip('\r\n')
        row = original.split('\t')
        if len(row) != 19:
            continue
        if row[0] in gn_ids:
            geonames.append({
                'geonameId': row[0], 'name': row[1], 'asciiName': row[2],
                'alternateNames': row[3].split(','), 'latitude': float(row[4]), 'longitude': float(row[5]),
                'featureClass': row[6], 'featureCode': row[7], 'countryCode': row[8],
                'admin1': row[10], 'admin2': row[11], 'modified': row[18],
                'recordUrl': f'https://www.geonames.org/{row[0]}/',
                'originalTsv': original,
            })
        if row[6] not in ['L', 'T', 'H']:
            continue
        latitude, longitude = float(row[4]), float(row[5])
        if not (26 < latitude < 38 and 77 < longitude < 100):
            continue
        names = ' '.join(row[1:4]).lower()
        if any(name in names for name in ['qiangtang', 'changtang', 'himalaya', 'yarlung']):
            regional_candidates.append({'id': row[0], 'name': row[1], 'ascii': row[2], 'latitude': latitude, 'longitude': longitude, 'class': row[6], 'code': row[7], 'originalTsv': original})

if {str(record['geonameId']) for record in geonames} != gn_ids:
    raise RuntimeError('A selected GeoNames feature disappeared; review before accepting changed data.')
if {record['properties']['ne_id'] for record in natural_earth} != ne_ids:
    raise RuntimeError('A selected Natural Earth feature disappeared.')

output = {
    'retrievedAt': datetime.now(timezone.utc).isoformat(),
    'purpose': 'Published settlement reference points and a separately published approximate archaeological location. These do not locate monuments, excavation squares, railway platforms, tourism access or representative climate stations.',
    'sources': [
        {'id': 'natural-earth-populated-places', 'url': NE_URL, 'commit': NE_COMMIT,
         'descriptionUrl': 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
         'license': 'Public domain', 'licenseUrl': 'https://www.naturalearthdata.com/about/terms-of-use/',
         'bytes': len(ne_bytes), 'sha256': hashlib.sha256(ne_bytes).hexdigest(), 'lastModified': ne_modified,
         'coordinateField': 'geometry.coordinates (longitude, latitude); do not substitute the distinct legacy property columns.'},
        {'id': 'geonames-cn', 'url': GN_URL, 'license': 'CC BY 4.0', 'attribution': 'GeoNames',
         'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/', 'documentationUrl': 'https://download.geonames.org/export/dump/readme.txt',
         'bytes': len(gn_bytes), 'sha256': hashlib.sha256(gn_bytes).hexdigest(), 'lastModified': gn_modified,
         'coordinateField': 'longitude and latitude from original tab-separated WGS84 records; a gazetteer reference, not a surveyed city or heritage boundary.'},
    ],
    'naturalEarth': natural_earth, 'geoNames': geonames,
    'regionalCandidatesNotApproved': regional_candidates,
    'publishedResearchLocations': [{
        'id': 'nwya-devu-published-approximate', 'longitude': 88.8, 'latitude': 31.5, 'decimalPlacesInSource': 1,
        'sourceTitle': 'Zhang et al. (2024), A Cold Habitat: Mapping Blade Assemblages Between the Siberian Altai and the Tibetan Plateau During MIS 3',
        'sourceUrl': 'https://link.springer.com/article/10.1007/s41982-024-00175-1', 'sourceSection': 'Background, paragraph beginning The site of Nwya Devu',
        'doi': '10.1007/s41982-024-00175-1',
        'scope': 'Approximate position published to one decimal place; not an excavation coordinate or visitor-access point.',
        'institutionalContextUrl': 'https://www.ivpp.cas.cn/xwdt/kyjz/201812/t20181205_5207281.html',
    }],
}
OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps({'output': str(OUT), 'naturalEarthRecords': len(natural_earth), 'geoNamesRecords': len(geonames), 'geonamesArchiveSha256': hashlib.sha256(gn_bytes).hexdigest(), 'regionalCandidates': regional_candidates}, ensure_ascii=True))
