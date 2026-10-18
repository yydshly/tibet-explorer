import { describe, expect, it } from 'vitest';
import { climateEvidenceSources, silingCoEvidence } from '../src/data/climateEvidence';

describe('published Siling Co evidence', () => {
  it('keeps only the two states published in the cited research, without interpolated dates', () => {
    expect(silingCoEvidence.records.map(({ year, value }) => [year, value])).toEqual([[1976, 1667], [2017, 2389]]);
    expect(silingCoEvidence.unit).toBe('km²');
    expect(silingCoEvidence.records[0].date).toBe('1976');
    expect(silingCoEvidence.records[1].date).toBe('2017-06');
    expect(silingCoEvidence.records.every(record => record.uncertainty === null)).toBe(true);
  });
  it('preserves publication identity and keeps location provenance separate from area provenance', () => {
    expect(silingCoEvidence.source.doi).toBe('10.1016/j.scib.2019.02.016');
    expect(silingCoEvidence.source.articleType).toBe('News & Views');
    const sourceIds = climateEvidenceSources.map(source => source.id);
    for (const record of silingCoEvidence.records) expect(sourceIds).toContain(record.sourceId);
    expect(sourceIds).toContain(silingCoEvidence.locationReference.sourceId);
    expect(silingCoEvidence.locationReference.sourceId).not.toBe(silingCoEvidence.records[0].sourceId);
    expect(silingCoEvidence.dataKind).toBe('published-research-summary');
  });
  it('marks the map locator as a derived reference, with no fabricated shoreline geometry', () => {
    const location = silingCoEvidence.locationReference;
    expect(location.longitude).toBeCloseTo(88.95, 5);
    expect(location.latitude).toBeCloseTo(31.758333333, 5);
    expect(location.limitation).toContain('不是实测中心点');
    expect(silingCoEvidence).not.toHaveProperty('shorelines');
    expect(silingCoEvidence).not.toHaveProperty('volume');
  });
});
