import { describe, expect, it } from 'vitest';
import { chapters, cultureTopics, historyPeriods, regions, sources, travelStops } from '../src/data/curriculum';
import { emptyExploration, parseExploration, parseRoute, settingsForStep } from '../src/lib/store';

const expectedChapters = [
  ['position', 'G', 4], ['climate', 'C', 9], ['regions', 'E', 3],
  ['landscapes', 'P', 3], ['history', 'H', 4], ['culture', 'K', 4],
  ['connections', 'R', 3], ['modern', 'M', 3], ['travel', 'T', 3],
] as const;

describe('完整认识主线的内容契约', () => {
  it('九章按认识顺序覆盖36个独立步骤，没有遗漏或重复', () => {
    expect(chapters.map((chapter) => chapter.id)).toEqual(expectedChapters.map(([id]) => id));
    expect(chapters.flatMap((chapter) => chapter.steps)).toHaveLength(36);
    expectedChapters.forEach(([id, prefix, count], index) => {
      const chapter = chapters[index];
      expect(chapter.id).toBe(id);
      expect(chapter.number).toBe(index + 1);
      expect(chapter.steps.map((step) => step.id)).toEqual(Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`));
    });
    expect(new Set(chapters.flatMap((chapter) => chapter.steps.map((step) => step.id))).size).toBe(36);
  });

  it('章节和步骤具有实质介绍、观察、操作、衔接与知识结论', () => {
    for (const chapter of chapters) {
      expect(chapter.question.length).toBeGreaterThan(10);
      expect(chapter.intro.length).toBeGreaterThan(30);
      expect(chapter.bridge.length).toBeGreaterThan(20);
      expect(chapter.details.length).toBeGreaterThanOrEqual(2);
      for (const detail of chapter.details) {
        expect(detail.title.trim()).not.toBe('');
        expect(detail.paragraphs.join('').length).toBeGreaterThan(80);
      }
      for (const step of chapter.steps) {
        expect(step.summary.length, step.id).toBeGreaterThanOrEqual(50);
        expect(step.explanation.join('').length, step.id).toBeGreaterThan(100);
        expect(step.observe.length, step.id).toBeGreaterThan(10);
        expect(step.action.length, step.id).toBeGreaterThan(10);
        expect(step.takeaway.length, step.id).toBeGreaterThan(10);
        expect(step.sources.length, step.id).toBeGreaterThan(0);
        expect(parseRoute(`#/learn/${chapter.id}/${step.id}`)).toEqual({ home: false, chapter: chapter.id, step: step.id });
      }
    }
  });

  it('七地域均能跳到真实存在的章节步骤，主题站点覆盖七地域', () => {
    const expectedRegions = ['lhasa', 'shannan', 'shigatse', 'nyingchi', 'nagqu', 'ngari', 'chamdo'];
    expect(regions.map((region) => region.id)).toEqual(expectedRegions);
    for (const region of regions) {
      expect(region.description.length, region.id).toBeGreaterThan(50);
      expect(region.question.length, region.id).toBeGreaterThan(10);
      const target = chapters.find((chapter) => chapter.id === region.chapterId);
      expect(target?.steps.some((step) => step.id === region.stepId), region.id).toBe(true);
    }
    expect([...new Set(travelStops.map((stop) => stop.region))].sort()).toEqual([...expectedRegions].sort());
    expect(new Set(travelStops.map((stop) => stop.id)).size).toBe(travelStops.length);
    for (const stop of travelStops) {
      expect(regions.some((region) => region.id === stop.region)).toBe(true);
      expect(stop.question.length, stop.id).toBeGreaterThan(10);
      expect(stop.description.length, stop.id).toBeGreaterThan(50);
    }
  });

  it('历史覆盖九阶段，文化覆盖建筑、信仰、艺术和日常实践', () => {
    expect(historyPeriods.map((period) => period.id)).toEqual(['prehistoric', 'empire', 'revival', 'yuan', 'local', 'ganden', 'qing', 'early-modern', 'contemporary']);
    expect(cultureTopics.map((topic) => topic.id)).toEqual(['architecture', 'religion', 'art', 'life']);
    for (const material of [...historyPeriods, ...cultureTopics]) {
      expect(material.summary.length, material.id).toBeGreaterThan(20);
      expect(material.detail.length, material.id).toBeGreaterThan(80);
      expect(material.sourceIds.length, material.id).toBeGreaterThan(0);
    }
  });

  it('全部来源引用可解析到唯一的HTTPS资料入口', () => {
    const sourceIds = new Set(sources.map((source) => source.id));
    expect(sourceIds.size).toBe(sources.length);
    const references = [
      ...chapters.flatMap((chapter) => chapter.steps.flatMap((step) => step.sources)),
      ...historyPeriods.flatMap((period) => period.sourceIds),
      ...cultureTopics.flatMap((topic) => topic.sourceIds),
    ];
    for (const id of references) expect(sourceIds.has(id), `missing source ${id}`).toBe(true);
    for (const source of sources) {
      const url = new URL(source.url);
      expect(url.protocol, source.id).toBe('https:');
      expect(url.hostname, source.id).not.toBe('example.com');
      expect(source.title.trim(), source.id).not.toBe('');
      expect(source.note?.length, source.id).toBeGreaterThan(10);
    }
  });

  it('保存恢复支持每个当前步骤、地区、文化主题和旅行站点', () => {
    const value = emptyExploration();
    value.visited = chapters.flatMap((chapter) => chapter.steps.map((step) => step.id));
    value.completed = [...value.visited];
    value.bookmarks = [...value.visited];
    value.route = travelStops.map((stop) => stop.id);
    for (const chapter of chapters) {
      for (const step of chapter.steps) value.scenes[step.id] = settingsForStep(step);
    }
    value.lastStep = 'T3';
    expect(parseExploration(JSON.stringify(value))).toEqual(value);
    for (const region of regions) {
      value.scenes[region.stepId].selected = region.id;
      expect(parseExploration(JSON.stringify(value)).scenes[region.stepId].selected).toBe(region.id);
    }
  });
});
