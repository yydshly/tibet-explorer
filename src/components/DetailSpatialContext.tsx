import { useEffect, useId, useState } from 'react';
import { ArrowUUpLeft, MapPin } from '@phosphor-icons/react';
import { getAtlasTheme } from '../data/atlas';
import {getCityOverview} from '../data/cityOverview';
import {regionalAnchors} from '../data/regionalStudy';
import type { AtlasLocation } from '../lib/spatialJourney';
import './DetailSpatialContext.css';

type Position = [number, number];
type Polygon = { type: 'Polygon'; coordinates: Position[][] };
type MultiPolygon = { type: 'MultiPolygon'; coordinates: Position[][][] };
type Geometry = Polygon | MultiPolygon;
interface EarthContext { china: Geometry; tibet: Geometry; plateau: Geometry }
export interface DetailSpatialContextProps { origin: AtlasLocation; onReturn: () => void; compact?:boolean }

let mapRequest: Promise<EarthContext> | undefined;
function loadMap(): Promise<EarthContext> {
  if (!mapRequest) {
    mapRequest = fetch('/assets/earth-context.json').then(response => {
      if (!response.ok) throw new Error('Spatial context map could not load');
      return response.json() as Promise<EarthContext>;
    }).catch(error => { mapRequest = undefined; throw error; });
  }
  return mapRequest;
}

// A north-up equirectangular regional locator. All boundary vertices come from
// earth-context.json; the fixed geographic projection is shared by its pin.
function project(longitude: number, latitude: number): Position {
  return [150 + (longitude - 90) * 5.5 * Math.cos(32 * Math.PI / 180), 46 - (latitude - 32) * 5.5];
}

function geometryPath(geometry: Geometry): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map(polygon => polygon.map(ring => ring.map(([longitude, latitude], index) => {
    const [x, y] = project(longitude, latitude);
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z').join(' ')).join(' ');
}

export default function DetailSpatialContext({ origin, onReturn,compact=false }: DetailSpatialContextProps) {
  const [map, setMap] = useState<EarthContext>();
  const [mapFailed, setMapFailed] = useState(false);
  const clipId = `detail-spatial-${useId().replace(/:/g, '')}`;
  const theme = getAtlasTheme(origin.themeId);
  // Preserve the user's actual material entry, including multiple entries that
  // lead to the same question. Never replace it with the question's default pin.
  const hotspot = theme?.hotspots.find(point => point.id === origin.hotspotId);
  const city=origin.view==='cities'&&origin.cityId?getCityOverview(origin.cityId):undefined;
  const anchor=city?regionalAnchors.find(item=>item.id===city.id):hotspot;
  const point = anchor ? project(anchor.longitude, anchor.latitude) : undefined;

  useEffect(() => {
    let active = true;
    loadMap().then(data => { if (active) setMap(data); }).catch(() => { if (active) setMapFailed(true); });
    return () => { active = false; };
  }, []);

  return <section className={'detail-spatial-context'+(compact?' compact-spatial-context':'')} aria-label="当前详细演示的整体地图来路">
    <div className="detail-spatial-path"><span>地球</span><i>›</i><span>亚洲</span><i>›</i><span>中国</span><i>›</i><strong>西藏</strong><small>整体 → 当前细节</small></div>
    <div className="detail-spatial-map">
      {map ? <svg viewBox="0 0 300 82" role="img" aria-label={`中国西南的西藏自治区与自然高原位置${city?`，来自${city.name}总览`:hotspot ? `，当前入口：${hotspot.title}` : ''}`}>
        <defs><clipPath id={clipId}><rect width="300" height="82" rx="4" /></clipPath></defs>
        <g clipPath={`url(#${clipId})`}>
          <path className="detail-map-china" d={geometryPath(map.china)} fillRule="evenodd" />
          <path className="detail-map-plateau" d={geometryPath(map.plateau)} fillRule="evenodd" />
          <path className="detail-map-tibet" d={geometryPath(map.tibet)} fillRule="evenodd" />
          <text className="detail-map-country" x="225" y="16">中国西南</text>
          <path className="detail-map-direction" d="M17 27H65M60 24L65 27L60 30" />
          <text className="detail-map-label" x="15" y="19">西侧来流方向</text>
          <path className="detail-map-direction" d="M169 79L161 68M161 73L161 68L166 70" />
          <text className="detail-map-label" x="175" y="77">南亚 · 印度洋方向</text>
          <path className="detail-map-north" d="M283 53V34M280 39L283 34L286 39" />
          <text className="detail-map-label" x="280" y="29">北</text>
          {point && <g className="detail-map-point"><circle cx={point[0]} cy={point[1]} r="6.2" /><circle cx={point[0]} cy={point[1]} r="2.5" /></g>}
        </g>
      </svg> : <div className="detail-spatial-map-status">{mapFailed ? '定位地图暂未加载；可返回整体继续。' : '正在定位到整体地图…'}</div>}
    </div>
    <div className="detail-spatial-legend"><span><i className="detail-legend-tibet" />西藏自治区</span><span><i className="detail-legend-plateau" />自然高原概化范围</span><a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/" target="_blank" rel="noreferrer" title="Natural Earth概化参考；非测绘边界">Natural Earth</a></div>
    <div className="detail-spatial-place"><MapPin size={13} /><strong>{city?`从${city.name}总览延伸`:hotspot?.title || '已保存的地图入口'}</strong><button type="button" onClick={onReturn}><ArrowUUpLeft size={13} />{city?`返回${city.name}总览`:'返回整体地图'}</button></div>
    {city?<p className="detail-context-note">这段专题用于解释相关原因。具体案例地点和材料范围见下文；返回后保留{city.name}的阅读维度。</p>:hotspot&&<details className="detail-spatial-why"><summary>为什么从这里进入这段演示</summary><p>{hotspot.whyHere}</p><small>{hotspot.locationNote} 来流箭头只说明周边方位。</small></details>}
  </section>;
}
