// @ts-expect-error Test-only native filesystem, absent from browser bundle.
import { readFileSync } from 'node:fs';
// @ts-expect-error Test-only native hashing, absent from browser bundle.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { overviewNarrationCues } from '../src/data/overviewNarration';
import { overviewHeritageMoments, overviewHeritageObjects, overviewHeritagePresentation } from '../src/data/overviewHeritageEvidence';
import { narrationTimingAt, type NarrationTimeline } from '../src/lib/narrationTiming';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const manifest = json('public/assets/audio/narration/cue-manifest.json');
const provenance = json('public/assets/overview-heritage/provenance.json');

describe('macro history reads actual public-domain objects on the original narration clock', () => {
  it('archives the museum public-domain identity, accession, original JPEG and SHA for each displayed object', () => {
    expect(provenance.license).toContain('CC0');
    expect(provenance.licenseUrl).toBe('https://www.metmuseum.org/hubs/open-access');
    expect(overviewHeritageObjects).toHaveLength(2);
    for (const object of overviewHeritageObjects) {
      const asset = provenance.assets.find((item: { accessionNumber: string }) => item.accessionNumber === object.accession);
      expect(asset).toBeDefined();
      const record = json(`public/assets/overview-heritage/${asset.recordFile}`);
      expect(record.isPublicDomain).toBe(true);
      expect(record.accessionNumber).toBe(object.accession);
      expect(record.objectURL).toBe(object.source);
      expect(record.primaryImageSmall).toBe(asset.imageUrl);
      expect(asset.imageUrl).toMatch(/^https:\/\/images\.metmuseum\.org\/CRDImages\/as\/web-large\//);
      expect(object.image).toBe(`/assets/overview-heritage/${asset.imageFile}`);
      const photograph = readFileSync(`public${object.image}`);
      expect(photograph[0]).toBe(0xff); expect(photograph[1]).toBe(0xd8);
      expect(photograph.length).toBe(asset.bytes);
      expect(createHash('sha256').update(photograph).digest('hex')).toBe(asset.imageSha256);
      expect(object.scope).toContain('未');
    }
  });

  it('keeps the represented 1042 journey distinct from the 12th-century portrait and the cover distinct from text pages', () => {
    const portrait = overviewHeritageObjects.find(item => item.id === 'atisha')!;
    const cover = overviewHeritageObjects.find(item => item.id === 'manuscript-cover')!;
    expect(portrait.date).toBe('12世纪前中期');
    expect(portrait.limit).toContain('不是当年行旅现场');
    expect(cover.limit).toContain('不是正文页');
    expect(cover.scope).toContain('未把制作地点钉到托林');
  });

  it('enters only at the real recorded token and returns to the complete map at the following subject', () => {
    for (const moment of overviewHeritageMoments) {
      const cue = overviewNarrationCues.find(item => item.id === moment.recordingId)!;
      const asset = manifest.clips.find((item: { cueId: string }) => item.cueId === cue.id);
      expect(asset.text).toBe(cue.narration);
      const timeline = json(`public${asset.subtitleUrl}`) as NarrationTimeline;
      expect(timeline.timingLevel).toBe('word');
      const start = cue.narration.indexOf(moment.token), end = cue.narration.indexOf(moment.until);
      expect(start).toBeGreaterThanOrEqual(0); expect(end).toBeGreaterThan(start);
      const word = timeline.words!.find(item => item.textEnd > start)!;
      const time = word.start + (word.end - word.start) * .9;
      const timing = narrationTimingAt(cue.narration, time, timeline.duration, timeline);
      const live = overviewHeritagePresentation(cue.id, cue.narration, timing.textProgress);
      expect(live?.moment.token).toBe(moment.token);
      expect(live?.object.id).toBe(moment.objectId);
      expect(overviewHeritagePresentation(cue.id, cue.narration, (start + .5) / cue.narration.length)?.moment).toBe(moment);
      expect(overviewHeritagePresentation(cue.id, cue.narration, (end + .1) / cue.narration.length)?.moment).not.toBe(moment);
      for (const rectangle of moment.rectangles ?? []) for (const value of rectangle) expect(value).toBeGreaterThan(0);
    }
    for (const id of ['OVERVIEW-history-middle', 'OVERVIEW-evidence-reading']) {
      const cue = overviewNarrationCues.find(item => item.id === id)!;
      expect(overviewHeritagePresentation(id, cue.narration, 0)).toBeUndefined();
      expect(overviewHeritagePresentation(id, cue.narration, 1)).toBeUndefined();
    }
  });

  it('is reversible on seek and rejects another script, nonfinite progress or unrelated recordings', () => {
    const cue = overviewNarrationCues.find(item => item.id === 'OVERVIEW-evidence-reading')!;
    const atisha = (cue.narration.indexOf('眼前的阿底峡画像') + 1) / cue.narration.length;
    const cover = (cue.narration.indexOf('再看约十二世纪初的木经板') + 1) / cue.narration.length;
    expect(overviewHeritagePresentation(cue.id, cue.narration, atisha)?.object.id).toBe('atisha');
    expect(overviewHeritagePresentation(cue.id, cue.narration, cover)?.object.id).toBe('manuscript-cover');
    expect(overviewHeritagePresentation(cue.id, cue.narration, atisha)?.object.id).toBe('atisha');
    expect(overviewHeritagePresentation(cue.id, cue.narration + '改写', cover)).toBeUndefined();
    for (const invalid of [NaN, Infinity, -1, 2]) expect(overviewHeritagePresentation(cue.id, cue.narration, invalid)).toBeUndefined();
    expect(overviewHeritagePresentation('OVERVIEW-history-modern', cue.narration, atisha)).toBeUndefined();
  });

  it('holds each object through a complete reading and fades only its outer source-word boundaries', () => {
    const cue = overviewNarrationCues.find(item => item.id === 'OVERVIEW-evidence-reading')!;
    const start = cue.narration.indexOf('眼前的阿底峡画像');
    const change = cue.narration.indexOf('授课手势和手持经书');
    const cover = cue.narration.indexOf('再看约十二世纪初的木经板');
    const finish = cue.narration.indexOf('保存、学习与工艺联系在一起');
    const at = (position: number) => overviewHeritagePresentation(cue.id, cue.narration, position / cue.narration.length);
    expect(at(start)?.presence).toBe(0);
    expect(at(start + 1)?.presence).toBeCloseTo(.15625);
    expect(at(start + 2)?.presence).toBeCloseTo(.5);
    expect(at(start + 4)?.presence).toBe(1);
    expect(at(change - .01)?.presence).toBe(1);
    expect(at(change + .01)?.presence).toBe(1);
    expect(at(change + .01)?.moment.rectangles).toHaveLength(2);
    expect(at(cover - 2)?.presence).toBeCloseTo(.5);
    expect(at(cover + 2)?.presence).toBeCloseTo(.5);
    expect(at(cover + 4)?.presence).toBe(1);
    expect(at(finish - 2)?.presence).toBeCloseTo(.5);
    expect(at(finish + .01)).toBeUndefined();
    const culture = overviewNarrationCues.find(item => item.id === 'OVERVIEW-culture')!;
    for (let part = 0; part <= 1; part += .025) expect(overviewHeritagePresentation(culture.id, culture.narration, part)).toBeUndefined();
  });
});
