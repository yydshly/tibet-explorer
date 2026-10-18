import type { KeyboardEvent } from 'react';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { regionalLocatorOutline } from '../data/regionalLocatorOutline';
import './RegionalJourneyLocator.css';

const VIEW = { west: 77.2, north: 37.1, scale: 9.2 } as const;
const project = (longitude: number, latitude: number) => [
  (longitude - VIEW.west) * VIEW.scale,
  (VIEW.north - latitude) * VIEW.scale,
] as const;
// Label displacements are screen-space typography, never displaced place points.
const references = [
  { id: 'ngari', name: '阿里', dx: 8, dy: -5, align: 'start' },
  { id: 'shigatse', name: '日喀则', dx: -6, dy: 13, align: 'end' },
  { id: 'lhasa', name: '拉萨', dx: -3, dy: -8, align: 'middle' },
  { id: 'shannan', name: '山南', dx: 4, dy: 20, align: 'middle' },
  { id: 'nyingchi', name: '林芝', dx: 6, dy: 12, align: 'middle' },
  { id: 'nagqu', name: '那曲', dx: 5, dy: -7, align: 'start' },
  { id: 'chamdo', name: '昌都', dx: 5, dy: -5, align: 'start' },
].map(item => {
  const reference = verifiedPlaceReferences[item.id];
  const [x, y] = project(reference.longitude, reference.latitude);
  return { ...item, x, y, reference };
});
const outline = regionalLocatorOutline.map(ring => ring.map(([longitude, latitude], index) => {
  const [x, y] = project(longitude, latitude);
  return `${index === 0 ? 'M' : 'L'}${x.toFixed(3)},${y.toFixed(3)}`;
}).join(' ') + ' Z').join(' ');

/** A genuine geographic overview retained while the main camera reads a region.
 * It intentionally has no frame purporting to represent a measured camera view. */
export default function RegionalJourneyLocator({ cityId, onSelect }: {
  cityId: string;
  onSelect: (cityId: string) => void;
}) {
  const selectWithKeyboard = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onSelect(id);
    }
  };
  return <aside className="regional-journey-locator" aria-label="西藏七市地全域位置参照" title="Natural Earth概览轮廓；城区点来自Natural Earth与GeoNames。光圈只标出所选城区，非市界、观察区边界或相机视野。">
    <div className="regional-locator-heading"><strong>全域位置参照</strong><span aria-label="北方朝上">北 ↑</span></div>
    <svg viewBox="0 0 218 104" aria-label="西藏七市地地理位置，可点选城市">
      <path className="regional-locator-outline" d={outline} fillRule="evenodd" />
      {references.map(item => {
        const selected = item.id === cityId;
        return <g key={item.id} className={`regional-locator-place${selected ? ' is-selected' : ''}`} role="button" tabIndex={0} aria-label={`查看${item.name}的认识主线`} aria-pressed={selected} onClick={event => { event.stopPropagation(); onSelect(item.id); }} onKeyDown={event => selectWithKeyboard(event, item.id)}>
          <title>{item.reference.name}；{item.reference.scope}</title>
          <circle className="regional-locator-hit" cx={item.x} cy={item.y} r={10} />
          {selected && <circle className="regional-locator-halo" cx={item.x} cy={item.y} r={6} />}
          <circle className="regional-locator-dot" cx={item.x} cy={item.y} r={selected ? 2.5 : 1.8} />
          <text x={item.x + item.dx} y={item.y + item.dy} textAnchor={item.align as 'start' | 'end' | 'middle'}>{item.name}</text>
        </g>;
      })}
    </svg>
    <p>概览范围 · 城区点非市界</p>
  </aside>;
}
