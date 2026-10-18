import { historyPeriods } from '../data/curriculum';
import './OverviewHistoryLine.css';

const shortNames: Record<string, string> = {
  prehistoric: '早期活动', empire: '吐蕃与交往', revival: '重组与复兴',
  yuan: '元朝与萨迦', local: '地方政治', ganden: '甘丹颇章',
  qing: '清代制度', 'early-modern': '战争与治理', contemporary: '制度与生活',
};
const periodLabels = new Map(historyPeriods.map(period => [period.label.replace(/\s/g, '').replace(/[‐‑‒–―−-]/g, '—'), period.id]));

/** Resolve only the presentation's sourced period labels or named event years.
 * Ranges spanning several periods stay unselected: equal display spacing never
 * becomes an invented, proportionate chronology or a historical boundary. */
export function overviewHistoryPeriodId(year?: string): string | undefined {
  const normalized = year?.trim().replace(/\s/g, '').replace(/[‐‑‒–―−-]/g, '—');
  if (!normalized) return undefined;
  const exact = periodLabels.get(normalized);
  if (exact) return exact;
  if (/^约?4万—3万年前$/.test(normalized)) return 'prehistoric';
  if (/^821—823年?$/.test(normalized)) return 'empire';
  if (/^7世纪$/.test(normalized)) return 'empire';
  if (/^(1645—1648|1690—1694)年?$/.test(normalized)) return 'ganden';
  if (/^1042年?$/.test(normalized)) return 'revival';
  if (/^1904年?$/.test(normalized)) return 'early-modern';
  if (/^(?:1951|1959|1965)(?:年)?(?:[、，,／/与和—](?:1951|1959|1965)(?:年)?)*$/.test(normalized)) return 'contemporary';
  return undefined;
}

/** A persistent, non-interactive sequence keeps the long view while narration
 * locates a specific event. It does not seek recordings or draw past borders. */
export default function OverviewHistoryLine({ year, topic,compact=false,inline=false }: { year?: string; topic?: string;compact?:boolean;inline?:boolean }) {
  if (topic !== 'history' && topic !== 'culture') return null;
  const activeId = overviewHistoryPeriodId(year);
  const activeIndex=historyPeriods.findIndex(period=>period.id===activeId);
  const start=Math.max(0,Math.min(activeIndex-1,historyPeriods.length-3));
  const visiblePeriods=compact?activeIndex<0?[]:historyPeriods.slice(start,start+3):historyPeriods;
  return <aside className={`overview-history-line${compact?' is-compact':''}${inline?' is-inline':''}`} aria-label={compact?'当前历史位置与前后参照':'历史时期顺序索引，等距仅表示先后'}>
    <div className="overview-history-line-heading"><strong>{compact?'历史位置':'历史顺序索引'}</strong><span>{compact?'只强调当前讲述；完整顺序可展开':'等距表示先后，不表示历时长短'}</span></div>
    {visiblePeriods.length===0?<p className="overview-history-context">{topic==='culture'?'回到人的行动：使用空间 · 学习交流 · 持续传承':'先建立历史问题：人群活动 → 组织与交流 → 地方生活'}</p>:<ol>
      {visiblePeriods.map(period => <li key={period.id} aria-current={activeId === period.id ? 'step' : undefined} title={`${period.label} · ${period.title}`}>
        <span>{period.label}</span><strong>{shortNames[period.id] ?? period.title}</strong>
      </li>)}
    </ol>}
  </aside>;
}
