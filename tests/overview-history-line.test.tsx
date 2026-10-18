import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import OverviewHistoryLine, { overviewHistoryPeriodId } from '../src/components/OverviewHistoryLine';
import { historyPeriods } from '../src/data/curriculum';
import { overviewBeats } from '../src/data/overviewJourney';

describe('overview historical sequence', () => {
  it('limits main narration to current and neighboring periods while keeping the full sequence available', () => {
    const compact = renderToStaticMarkup(<OverviewHistoryLine compact topic="history" year="1042年" />);
    expect(compact.match(/<li /g)).toHaveLength(3);
    expect(compact.match(/aria-current="step"/g)).toHaveLength(1);
    expect(compact).toContain('10—12世纪');
    const neutral = renderToStaticMarkup(<OverviewHistoryLine compact topic="culture" />);
    expect(neutral).not.toContain('<ol>');
    expect(neutral).not.toContain('aria-current');
    const expanded = renderToStaticMarkup(<OverviewHistoryLine inline topic="history" year="1042年" />);
    expect(expanded.match(/<li /g)).toHaveLength(9);
  });
  it.each([
    ['约4万—3万年前', 'prehistoric'], ['7—9世纪', 'empire'], ['821—823年', 'empire'], ['10—12世纪', 'revival'],
    ['1042年', 'revival'], ['13—14世纪', 'yuan'], ['14—17世纪', 'local'],
    ['17世纪', 'ganden'], ['18—19世纪', 'qing'], ['1904年', 'early-modern'],
    ['1951', 'contemporary'], ['1959年', 'contemporary'], ['1965年', 'contemporary'],
    ['1951、1959、1965年', 'contemporary'], [' 13–14 世纪 ', 'yuan'],
  ])('maps the existing presentation label %s to its sourced period', (year, id) => {
    expect(overviewHistoryPeriodId(year)).toBe(id);
  });

  it('does not collapse overlapping century labels or uncertain ranges into an invented period', () => {
    expect(overviewHistoryPeriodId('14—17世纪')).toBe('local');
    expect(overviewHistoryPeriodId('17世纪')).toBe('ganden');
    for (const year of [undefined, '', '1904—1965年', '2026年', '全部历史', '1042—1642年']) expect(overviewHistoryPeriodId(year)).toBeUndefined();
  });

  it('retains all nine source periods in order and makes no unsourced media seek controls', () => {
    const markup = renderToStaticMarkup(<OverviewHistoryLine topic="history" year="13—14世纪" />);
    const selected = markup.match(/aria-current="step"/g) ?? [];
    expect(selected).toHaveLength(1);
    expect(markup).toContain('等距表示先后，不表示历时长短');
    expect(markup).not.toContain('<button');
    let last = -1;
    for (const period of historyPeriods) {
      const next = markup.indexOf(`${period.label} · ${period.title}`);
      expect(next).toBeGreaterThan(last);
      last = next;
    }
  });

  it('locates every current narrated historical date in the surrounding long sequence', () => {
    for (const beat of overviewBeats.filter(beat => beat.topic === 'history')) {
      for (const moment of beat.moments ?? []) {
        if (moment.year) expect(overviewHistoryPeriodId(moment.year), `${beat.id}: ${moment.year}`).toBeDefined();
      }
    }
    const markup = renderToStaticMarkup(<OverviewHistoryLine topic="history" year="821—823年" />);
    expect(markup).toContain('aria-current="step" title="7—9世纪');
  });

  it('shows culture as a whole sequence without assigning an absent year', () => {
    const culture = renderToStaticMarkup(<OverviewHistoryLine topic="culture" />);
    expect(culture).toContain('<ol>');
    expect(culture).not.toContain('aria-current');
    for (const topic of ['regions', 'life', 'connections', 'observation', undefined]) {
      expect(renderToStaticMarkup(<OverviewHistoryLine topic={topic} year="17世纪" />)).toBe('');
    }
  });
});
