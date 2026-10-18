"""Create a source-traceable local display grid; never infer rivers or roads."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from io import BytesIO
import hashlib, json, math, struct
from datetime import date
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT.parent / 'tibet-research/data/local-terrain-tiles'
OUT = ROOT / 'public/assets/terrain'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
ZOOM, SIDE = 10, 321
B = dict(west=93.75, east=95.0, south=29.0, north=30.3)

def pixels(lon, lat):
    n = (2 ** ZOOM) * 256
    return ((lon + 180) / 360 * n - .5,
            (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - .5)

x0, y0 = pixels(B['west'], B['north'])
x1, y1 = pixels(B['east'], B['south'])
keys = [(x, y) for y in range(math.floor(y0 / 256), math.floor(y1 / 256) + 1)
        for x in range(math.floor(x0 / 256), math.floor(x1 / 256) + 1)]

def fetch(key):
    x, y = key
    url = f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{ZOOM}/{x}/{y}.png'
    path = CACHE / f'{ZOOM}-{x}-{y}.png'
    if not path.exists():
        request = Request(url, headers={'User-Agent': 'TibetExplorerEducationalResearch/1.0'})
        with urlopen(request, timeout=40) as response:
            raw = response.read()
        image = Image.open(BytesIO(raw)).convert('RGB')
        if image.size != (256, 256):
            raise ValueError(f'Unexpected tile shape {key}')
        path.write_bytes(raw)
    raw = path.read_bytes()
    image = Image.open(BytesIO(raw)).convert('RGB')
    return key, image, dict(url=url, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())

results = list(ThreadPoolExecutor(max_workers=4).map(fetch, keys))
tiles = {key: image for key, image, _ in results}

def height(x, y):
    r, g, b = tiles[(x // 256, y // 256)].getpixel((x % 256, y % 256))
    return r * 256 + g + b / 256 - 32768

values = []
for row in range(SIDE):
    lat = B['north'] - (B['north'] - B['south']) * row / (SIDE - 1)
    for col in range(SIDE):
        lon = B['west'] + (B['east'] - B['west']) * col / (SIDE - 1)
        x, y = pixels(lon, lat)
        ix, iy = math.floor(x), math.floor(y)
        fx, fy = x - ix, y - iy
        a = height(ix, iy) * (1-fx) + height(ix+1, iy) * fx
        b = height(ix, iy+1) * (1-fx) + height(ix+1, iy+1) * fx
        values.append(round(a * (1-fy) + b * fy))

raw = struct.pack(f'<{len(values)}h', *values)
(OUT / 'nyingchi-local-dem.int16').write_bytes(raw)
meta = dict(id='nyingchi-local', title='林芝城区周边的山地与河谷', accessed=str(date.today()),
    boundsDegrees=B, columns=SIDE, rows=SIDE, dataUrl='/assets/terrain/nyingchi-local-dem.int16',
    sourceUrl='/assets/terrain/nyingchi-local-dem.source.json',
    dataset='https://registry.opendata.aws/terrain-tiles/',
    formatDocumentation='https://github.com/tilezen/joerd/blob/master/docs/formats.md',
    attribution='Mapzen / Tilezen · USGS SRTM/GMTED、NOAA ETOPO1',
    sourceZoom=ZOOM, verticalExaggeration=2, gridSpacingKm=0.4,
    byteOrder='little-endian signed Int16', unit='metres above mean sea level',
    processing='Terrarium decode, bilinear pixel-centre sampling; uniform longitude-latitude grid; rounded to nearest metre.',
    sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw), minimum=min(values), maximum=max(values),
    limitations=['Display sampling around 0.4 km is not survey accuracy.',
      'No measured channel centrelines, buildings, roads, current water or vegetation are encoded.',
      'Colours represent elevation, not observed land cover. Heights are enlarged twice.',
      'Local and overview grids use different source zoom and sampling; their display footprints are identified separately.'],
    tiles=[item for _, _, item in results])
(OUT / 'nyingchi-local-dem.source.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT / 'src/data/localTerrainMeta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({key: meta[key] for key in ['title','bytes','minimum','maximum','sha256']}, ensure_ascii=False))
print(f'{len(results)} source tiles archived; {SIDE}×{SIDE} display samples.')
