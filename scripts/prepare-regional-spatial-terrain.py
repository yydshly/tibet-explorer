"""Archive traceable local elevation grids for the actual OSM place windows.

Sampling density is a display choice, not a claim of survey accuracy. No roads,
buildings, historical footprints or river boundaries are inferred from heights.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib
import json
import math
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/regional-places/terrain'
CACHE = ROOT / '.cache/grounded-terrain'
ZOOM, SIDE = 13, 385
WINDOWS = {
    'shigatse': ('日喀则站、城区与扎什伦布寺', [88.845,29.207,88.957,29.297]),
    'shannan': ('泽当、山南站与桑耶的连续河谷', [91.486,29.223,91.806,29.35]),
    'chamdo': ('昌都两河谷、桥梁与强巴林寺', [97.13,31.10,97.23,31.20]),
    'nagqu': ('那曲站、铁路用地与城区', [91.958,31.42,92.09,31.52]),
}


def pixels(lon, lat):
    n = (2 ** ZOOM) * 256
    return ((lon + 180) / 360 * n - .5,
            (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - .5)


def fetch(key):
    x, y = key
    url = f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{ZOOM}/{x}/{y}.png'
    path = CACHE / f'{ZOOM}-{x}-{y}.png'
    if not path.exists():
        request = Request(url, headers={'User-Agent': 'TibetExplorerEducationalResearch/1.0'})
        with urlopen(request, timeout=45) as response:
            raw = response.read()
        picture = Image.open(BytesIO(raw)).convert('RGB')
        if picture.size != (256, 256):
            raise ValueError(f'Unexpected source tile shape: {key}')
        path.write_bytes(raw)
    raw = path.read_bytes()
    return key, Image.open(BytesIO(raw)).convert('RGB'), {
        'url': url, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()
    }


def prepare(place_id, title, bbox):
    west, south, east, north = bbox
    x0, y0 = pixels(west, north)
    x1, y1 = pixels(east, south)
    keys = [(x, y) for y in range(math.floor(y0 / 256), math.floor((y1 + 1) / 256) + 1)
            for x in range(math.floor(x0 / 256), math.floor((x1 + 1) / 256) + 1)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(fetch, keys))
    tiles = {key: image for key, image, _ in results}

    def height(x, y):
        red, green, blue = tiles[(x // 256, y // 256)].getpixel((x % 256, y % 256))
        return red * 256 + green + blue / 256 - 32768

    values = []
    for row in range(SIDE):
        lat = north - (north - south) * row / (SIDE - 1)
        for col in range(SIDE):
            lon = west + (east - west) * col / (SIDE - 1)
            x, y = pixels(lon, lat)
            ix, iy = math.floor(x), math.floor(y)
            fx, fy = x - ix, y - iy
            a = height(ix, iy) * (1 - fx) + height(ix + 1, iy) * fx
            b = height(ix, iy + 1) * (1 - fx) + height(ix + 1, iy + 1) * fx
            values.append(round(a * (1 - fy) + b * fy))
    if min(values) < 0 or max(values) > 9000:
        raise ValueError(f'Unexpected Tibet elevation values in {place_id}')
    raw = struct.pack(f'<{len(values)}h', *values)
    (OUT / f'{place_id}.int16').write_bytes(raw)
    spacing = {
        'eastWest': round((east - west) * 111320 * math.cos(math.radians((north + south) / 2)) / (SIDE - 1), 1),
        'northSouth': round((north - south) * 111320 / (SIDE - 1), 1),
    }
    meta = {
        'id': place_id, 'title': title, 'accessedAt': datetime.now(timezone.utc).isoformat(),
        'bbox': bbox, 'boundsDegrees': {'west': west, 'south': south, 'east': east, 'north': north},
        'columns': SIDE, 'rows': SIDE, 'sourceZoom': ZOOM, 'displaySamplingMetres': spacing,
        'dataUrl': f'/data/regional-places/terrain/{place_id}.int16',
        'sourceUrl': f'/data/regional-places/terrain/{place_id}.source.json',
        'dataset': 'https://registry.opendata.aws/terrain-tiles/',
        'formatDocumentation': 'https://github.com/tilezen/joerd/blob/master/docs/formats.md',
        'attributionUrl': 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
        'attribution': 'Mapzen / Tilezen; SRTM and GMTED2010 terrain data courtesy of the US Geological Survey; ETOPO1 courtesy of NOAA.',
        'unit': 'metres above mean sea level', 'byteOrder': 'little-endian signed Int16',
        'processing': 'Terrarium RGB decode; bilinear pixel-centre resampling to a WGS84 longitude-latitude display grid; rounded to nearest metre.',
        'minimum': min(values), 'maximum': max(values), 'bytes': len(raw),
        'sha256': hashlib.sha256(raw).hexdigest(),
        'limitations': [
            'Display sample spacing is not survey accuracy; source terrain is a mosaic of datasets of different ages and resolutions.',
            'Acquisition time is the download date, not a terrain observation date or a historical reconstruction date.',
            'No measured buildings, road surfaces, engineered banks, present water levels or historical urban extents are encoded.',
            'Do not extrapolate outside these bounds. Horizontal enlargement and any vertical exaggeration must be labeled by the renderer.',
        ],
        'tiles': [item for _, _, item in results],
    }
    (OUT / f'{place_id}.source.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: meta[key] for key in ['id', 'minimum', 'maximum', 'bytes', 'displaySamplingMetres', 'sha256']}, ensure_ascii=False), flush=True)
    return meta


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    places = [prepare(place_id, *window) for place_id, window in WINDOWS.items()]
    manifest = {'schemaVersion': 1, 'provider': 'Mapzen Terrain Tiles', 'places': places}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
