import {useEffect, useMemo, useState} from 'react';
import {elevationDescriptors, loadElevationGrid} from '../lib/elevationReading';
import {formatTerrainMetres, selectedTerrainContrastStop, terrainContrastSettings, terrainContrastStops} from '../lib/terrainContrast';
import type {SceneSettings} from '../lib/store';
import './TerrainContrast.css';

export default function TerrainContrast({settings, onChange}: {settings: SceneSettings; onChange: (patch: Partial<SceneSettings>) => void}) {
  const [grid, setGrid] = useState<Int16Array>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void loadElevationGrid('regional').then(value => {if (active) setGrid(value);}).catch(() => {if (active) setFailed(true);});
    return () => {active = false;};
  }, []);
  const stops = useMemo(() => grid ? terrainContrastStops(grid) : [], [grid]);
  const selected = selectedTerrainContrastStop(stops, settings);
  const ceiling = stops.length ? Math.max(6000, Math.ceil(Math.max(...stops.map(stop => stop.metres)) / 1000) * 1000) : 6000;
  const y = (metres: number) => 111 - metres / ceiling * 83;
  const selectedIndex = stops.findIndex(stop => stop.id === selected?.id);
  const feedback = !selected ? '依次点三处，让主场景的金色读点从低地越过山地，进入高原。'
    : selected.id === 'lowland' ? '先记住低地的高度。接下来向北，看地面怎样升高。'
    : selected.id === 'mountain' ? '这是本剖面 27–29°N 之间的网格高点。继续向北，地面会降回低地吗？'
    : `越过山地，33°N 的读点仍比低地高约 ${formatTerrainMetres(stops[2].metres - stops[0].metres)} m。高原内部并没有回到低地高度。`;
  return <section className="terrain-contrast" aria-label="低地、山地与高原的同尺度对比">
    <header><span>先建立高低的感觉</span><small>同一条 89°E 剖面</small></header>
    <h2>从低地走上高原，不只看一座山</h2>
    {!grid ? <p>{failed ? '高程数据暂不可读，暂不显示对比数字。' : '正在读取主场景使用的真实高程网格…'}</p> : <>
      <svg viewBox="0 0 282 145" role="img" aria-label={`同一海平面和高度刻度：${stops.map(stop => `${stop.title}约${formatTerrainMetres(stop.metres)}米`).join('，')}`}>
        <title>三处高程共用一个零米基线；柱高使用原始米值</title>
        {[0, ceiling / 2, ceiling].map(value => <g key={value} className="terrain-contrast-axis"><line x1="35" x2="274" y1={y(value)} y2={y(value)}/><text x="31" y={y(value) + 3} textAnchor="end">{value}</text></g>)}
        <text x="3" y="13" className="terrain-contrast-unit">m</text>
        {stops.map((stop, index) => <g key={stop.id} className={selectedIndex === index ? 'is-current' : ''}>
          <rect x={57 + index * 79} y={y(stop.metres)} width="29" height={Math.max(.7, 111 - y(stop.metres))} rx="2"/>
          <text x={71.5 + index * 79} y={y(stop.metres) - 7} textAnchor="middle" className="terrain-contrast-value">{formatTerrainMetres(stop.metres)}</text>
          <text x={71.5 + index * 79} y="128" textAnchor="middle" className="terrain-contrast-place">{index + 1} {stop.title}</text>
          <text x={71.5 + index * 79} y="141" textAnchor="middle" className="terrain-contrast-coordinate">{stop.latitude.toFixed(2)}°N</text>
        </g>)}
      </svg>
      <div className="terrain-contrast-stops" aria-label="在主场景中依次比较">
        {stops.map((stop, index) => <button key={stop.id} type="button" aria-pressed={selected?.id === stop.id} onClick={() => onChange(terrainContrastSettings(stop))}><span>{index + 1}</span>{stop.title}</button>)}
      </div>
      <p className="terrain-contrast-feedback" aria-live="polite">{feedback}</p>
      <p className="terrain-contrast-source">0 m 统一基线 · {elevationDescriptors.regional.gridSpacingKm} 网格读数<br/>山地高点为剖面采样值，非峰顶测量。<a href={elevationDescriptors.regional.sourceUrl} target="_blank" rel="noreferrer">高程来源与处理</a></p>
    </>}
  </section>;
}
