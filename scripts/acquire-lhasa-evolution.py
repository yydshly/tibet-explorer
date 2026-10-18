"""Extract native Lhasa WSF pixels from the already archived official tile.
Reuse the regional extractor including original IDC bands; keep other windows unchanged.
"""
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('regional_evolution', root/'scripts/acquire-regional-evolution.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.OUT = root/'public/data/lhasa-evolution'
module.OUT.mkdir(parents=True, exist_ok=True)
sources = dict([module.download_tile('90_28')])
window = module.extract_window(('lhasa', '拉萨老城—布达拉宫—河谷观察窗', [91.04,29.615,91.14,29.675], ['90_28']), sources)
# The generic extractor has a regional URL prefix; this output is isolated.
window['dataUrl'] = '/data/lhasa-evolution/evolution-lhasa.years.bin'
window['confidenceUrl'] = '/data/lhasa-evolution/evolution-lhasa.idc.bin'
metadata = dict(product='DLR World Settlement Footprint Evolution v1',
    sourceUrl='https://eodata.dlr.de/en/datasets/wsf/wsf_evo',
    attribution='© DLR / EOC, CC BY 4.0', sourceResolutionMetres=30,
    retrievedAt=datetime.now(timezone.utc).isoformat(),
    method='Original pixels; no resampling, interpolation, gap filling or invented buildings. 1985 is left-censored; 0 means no detection/no data. IDC describes source-image consistency, not local accuracy. Heights are not encoded.',
    sourceTiles=list(sources.values()), window=window)
(module.OUT/'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
