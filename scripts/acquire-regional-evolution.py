"""Archive official DLR WSF Evolution tiles and extract four original-pixel windows.

Reproduce from project root (existing local rasterio runtime, or install rasterio):
  python scripts/acquire-regional-evolution.py

No resampling, pixel aggregation, thresholding or gap filling is performed. WSF
is an estimated first settlement detection year, NOT a building construction
year. 1985 is left-censored. The 2015 settlement mask constrains earlier results.
Zero means no settlement detection/no data in this product, not proof of absence.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "qa/city-terrain-life/python-tools"))
import numpy as np
import rasterio
from rasterio.windows import Window, from_bounds
import certifi

OUT = ROOT / "public/data/regional-places"
ARCHIVE = OUT / "evolution-sources"
BASE = "https://download.geoservice.dlr.de/WSF_EVO/files"
WINDOWS = [
    ("shigatse", "日喀则城区—车站观察窗", [88.845, 29.207, 88.957, 29.297], ["88_28"]),
    ("shannan", "泽当城区—山南站观察窗", [91.73, 29.223, 91.805, 29.295], ["90_28"]),
    ("chamdo", "昌都城区两河谷观察窗", [97.13, 31.10, 97.23, 31.20], ["96_30"]),
    ("nagqu", "那曲城区—车站物流观察窗", [91.958, 31.42, 92.09, 31.52], ["90_30", "92_30"]),
]
CONFIDENCE_YEARS = [1985, 1990, 1995, 2000, 2005, 2010, 2015]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def download_tile(tile):
    name = f"WSFevolution_v1_{tile}.tif"
    target = ARCHIVE / name
    url = f"{BASE}/WSFevolution_v1_{tile}/{name}"
    headers = {}
    if not target.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "TibetExplorer-source-audit/1.0"})
        with urllib.request.urlopen(request, timeout=90) as response:
            if response.status != 200:
                raise RuntimeError(f"Unexpected source status {response.status}: {url}")
            raw = response.read(20_000_001)
            if len(raw) > 20_000_000:
                raise RuntimeError("Source tile exceeds 20 MB bounded archive budget")
            headers = dict(response.headers)
        target.write_bytes(raw)
        print(f"Archived {name}: {len(raw)} bytes", flush=True)
    raw = target.read_bytes()
    with rasterio.open(target) as ds:
        if ds.count != 1 or ds.crs.to_epsg() != 4326 or ds.dtypes != ("int32",):
            raise ValueError(f"Unexpected WSF source schema: {name}")
        info = dict(url=url, file=f"/data/regional-places/evolution-sources/{name}",
                    bytes=len(raw), sha256=sha(raw), crs=str(ds.crs),
                    dimensions=[ds.width, ds.height], transform=list(ds.transform)[:6],
                    noData=ds.nodata, dtype=ds.dtypes[0],
                    etag=headers.get("ETag"), lastModified=headers.get("Last-Modified"))
    return tile, info


def extract_window(spec, sources):
    city_id, label, bbox, tiles = spec
    source = sources[tiles[0]]
    with rasterio.open(ROOT / "public" / source["file"].lstrip("/")) as ds:
        floating = from_bounds(*bbox, ds.transform)
        # Expand by less than one native pixel at each boundary; never resample.
        left, top = math.floor(floating.col_off), math.floor(floating.row_off)
        right = math.ceil(floating.col_off + floating.width)
        bottom = math.ceil(floating.row_off + floating.height)
        window = Window(left, top, right - left, bottom - top)
        transform = ds.window_transform(window)
        west, south, east, north = rasterio.windows.bounds(window, ds.transform)
        columns, rows = right-left, bottom-top
        raw = np.full((rows, columns), -1, dtype=np.int32)
    # Tiles overlap slightly. At a seam select each pixel from the tile whose
    # nominal 2-degree core contains its centre. Never average overlapping years.
    longitudes = west + (np.arange(columns) + 0.5) * transform.a
    for tile in tiles:
        item = sources[tile]
        with rasterio.open(ROOT / "public" / item["file"].lstrip("/")) as ds:
            col_offset, row_offset = (~ds.transform) * (west, north)
            if abs(col_offset-round(col_offset)) > 1e-6 or abs(row_offset-round(row_offset)) > 1e-6:
                raise ValueError("Official tile grids are misaligned; refusing resampling")
            source_window = Window(round(col_offset), round(row_offset), columns, rows)
            native = ds.read(1, window=source_window, boundless=True, fill_value=-1)
            core_west = float(tile.split("_")[0])
            use = ((longitudes >= core_west) & (longitudes < core_west+2)) if len(tiles)>1 else np.ones(columns, dtype=bool)
            raw[:,use] = native[:,use]
    if np.any(raw < 0):
        raise ValueError("Extract includes uncovered source pixels")
    values = np.unique(raw)
    if np.any((values != 0) & ((values < 1985) | (values > 2015))):
        raise ValueError("Unexpected estimated detection year in original WSF pixels")
    payload = raw.astype("<u2", copy=False).tobytes(order="C")
    target = OUT / f"evolution-{city_id}.years.bin"
    target.write_bytes(payload)
    hist = [int(np.count_nonzero(raw == year)) for year in range(1985, 2016)]
    by_year = {str(year): int(np.count_nonzero((raw > 0) & (raw <= year)))
               for year in [1985, 1990, 1995, 2000, 2005, 2010, 2015]}
    confidence, confidence_sources = extract_confidence(tiles, transform, columns, rows, longitudes)
    confidence_payload = confidence.tobytes(order="C")
    confidence_target = OUT / f"evolution-{city_id}.idc.bin"
    confidence_target.write_bytes(confidence_payload)
    confidence_by_year = {}
    for i, year in enumerate(CONFIDENCE_YEARS):
        selected = (raw > 0) & (raw <= year)
        scores = confidence[i][selected]
        confidence_by_year[str(year)] = dict(
            detectedPixels=int(scores.size),
            scoreCounts={str(score): int(np.count_nonzero(scores == score)) for score in range(1, 7)},
            noScorePixels=int(np.count_nonzero(scores == 0)),
        )
    result = dict(id=city_id, label=label, sourceTiles=tiles, sourceUrls=[sources[t]["url"] for t in tiles],
                  requestedBbox=bbox, bounds=dict(west=west, south=south, east=east, north=north),
                  columns=int(raw.shape[1]), rows=int(raw.shape[0]),
                  transform=list(transform)[:6], sourceWindowPixels=[left, top, right-left, bottom-top],
                  pixelSizeDegrees=[abs(transform.a), abs(transform.e)],
                  dataUrl=f"/data/regional-places/{target.name}",
                  format="uint16-le-row-major-north-to-south", bytes=len(payload), sha256=sha(payload),
                  detectedPixels=int(np.count_nonzero(raw)), noDetectionOrNoDataPixels=int(np.count_nonzero(raw == 0)),
                  firstDetectionYearCounts=hist, cumulativePixelCounts=by_year,
                  confidenceAvailable=True, confidenceYears=CONFIDENCE_YEARS,
                  confidenceUrl=f"/data/regional-places/{confidence_target.name}",
                  confidenceFormat="uint8-year-major-row-major-north-to-south",
                  confidenceBytes=len(confidence_payload), confidenceSha256=sha(confidence_payload),
                  confidenceSources=confidence_sources, confidenceByYear=confidence_by_year,
                  confidenceNote="IDC表示生成聚居地估计时Landsat资料的一致性：1很低、2低、3中等、4尚可、5好、6很好；不是此城市的分类准确率或建筑年份置信区间。")
    print(f"{city_id}: {raw.shape[1]}x{raw.shape[0]}, {result['detectedPixels']} detected pixels, {by_year}", flush=True)
    return result


def extract_confidence(tiles, transform, columns, rows, longitudes):
    result = np.full((len(CONFIDENCE_YEARS), rows, columns), 255, dtype=np.uint8)
    archived_sources = []
    for tile in tiles:
        url = f"{BASE}/idcscore/IDC_Score_{tile}.tif"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"Range": "bytes=0-15"}), timeout=45) as response:
            if response.status != 206:
                raise RuntimeError("IDC server ignored bounded HTTP Range request")
            header = response.read(16)
            headers = dict(response.headers)
        with rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
            GDAL_HTTP_CONNECTTIMEOUT="30", GDAL_HTTP_TIMEOUT="60", GDAL_HTTP_MAX_RETRY="2",
            GDAL_HTTP_RETRY_DELAY="1", GDAL_CURL_CA_BUNDLE=certifi.where(), GDAL_CACHEMAX=64*1024*1024,
        ):
            with rasterio.open(url) as ds:
                if ds.count != 31 or ds.crs.to_epsg() != 4326:
                    raise ValueError("Unexpected IDC source schema")
                indexes = [year - 1985 + 1 for year in CONFIDENCE_YEARS]
                if any(ds.descriptions[index-1] != f"IDC_Score_{year}" for index,year in zip(indexes,CONFIDENCE_YEARS)):
                    raise ValueError("IDC band-year identity mismatch")
                col_offset, row_offset = (~ds.transform) * (transform.c, transform.f)
                if abs(col_offset-round(col_offset)) > 1e-6 or abs(row_offset-round(row_offset)) > 1e-6:
                    raise ValueError("IDC source grid differs from WSF original pixels")
                source_window = Window(round(col_offset), round(row_offset), columns, rows)
                native = ds.read(indexes, window=source_window, boundless=True, fill_value=255)
                core_west = float(tile.split("_")[0])
                use = ((longitudes >= core_west) & (longitudes < core_west+2)) if len(tiles)>1 else np.ones(columns,dtype=bool)
                result[:,:,use] = native[:,:,use]
                archived_sources.append(dict(url=url, bands=indexes, bandNames=[ds.descriptions[index-1] for index in indexes],
                                             sourceWindowPixels=list(source_window.flatten()),
                                             httpRangeStatus=206, httpContentRange=headers.get("Content-Range"),
                                             sourceHeaderSha256=sha(header), etag=headers.get("ETag"), lastModified=headers.get("Last-Modified")))
    if np.any(result > 6):
        raise ValueError("IDC extraction contains invalid/uncovered consistency scores")
    return result, archived_sources


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    sources = dict(ThreadPoolExecutor(4).map(download_tile, sorted(set(tile for spec in WINDOWS for tile in spec[3]))))
    windows = [extract_window(spec, sources) for spec in WINDOWS]
    product = dict(
        schemaVersion=1,
        product="DLR World Settlement Footprint Evolution v1", years=[1985, 2015],
        sourceUrl="https://geoservice.dlr.de/web/maps/eoc:wsfevolution",
        downloadUrl=f"{BASE}/", readmeUrl=f"{BASE}/WSFevolution_README.txt",
        methodologyUrl="https://doi.org/10.1553/giscience2021_01_s33",
        license="CC BY 4.0", licenseUrl="https://creativecommons.org/licenses/by/4.0/",
        attribution="© DLR / EOC — World Settlement Footprint Evolution, CC BY 4.0; original-pixel observation windows extracted for Tibet Explorer",
        retrievedAt=datetime.now(timezone.utc).isoformat(),
        sourceResolutionMetres=30, crs="EPSG:4326", firstYearLeftCensored=True,
        valueMeaning="1985–2015 = estimated first settlement detection year; 0 = no settlement detection/no data in this product",
        confidenceMeaning="Original IDC consistency bands for seven discrete years: 1 very low, 2 low, 3 moderate, 4 fair, 5 good, 6 very good; 0 no score. IDC is input-data consistency, not local classification accuracy.",
        method="Read original base-resolution int32 source pixels from five full official DLR tiles. Windows expanded outwards to native pixel edges. At Nagqu's 92° seam select each original pixel from the tile whose nominal 2° core contains its centre; tile grids align exactly. No resampling, aggregation, morphological filtering, interpolation, threshold or gap filling. Values 0/1985–2015 are losslessly encoded to little-endian uint16 binary, row-major, north-to-south.",
        limitations=[
            "1985 pixels were already detected at the beginning of the available series; their true development may be much earlier.",
            "The product assumes settlement growth and excludes locations outside its 2015 settlement reference mask; 0 is not proof that a place was unbuilt in a past year.",
            "The first-detection year is a remote-sensing estimate; it is not the construction year, urban boundary, building footprint/height or present-day settlement extent.",
            "Variable Landsat coverage affects temporal interpretation; no local classification accuracy is claimed. Seven original IDC consistency bands are provided without interpolating missing years.",
            "A spatial change alongside a railway/airport opening does not establish that transport caused that change. The product ends in 2015 and cannot show the 2021 Lhasa–Nyingchi railway opening's aftermath.",
            "These bounded study windows are not administrative city/prefecture boundaries or a reconstruction of medieval/twentieth-century city plans.",
        ],
        script="scripts/acquire-regional-evolution.py", python=sys.version.split()[0],
        rasterio=rasterio.__version__, numpy=np.__version__, sourceTiles=list(sources.values()), windows=windows,
    )
    (OUT / "evolution-manifest.json").write_text(json.dumps(product, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for name in ["WSFevolution_README.txt"]:
        target = ARCHIVE / name
        if not target.exists():
            with urllib.request.urlopen(f"{BASE}/{name}", timeout=45) as response:
                target.write_bytes(response.read())


if __name__ == "__main__":
    main()
