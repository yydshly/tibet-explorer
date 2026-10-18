import { describe, expect, it } from 'vitest';
import { chapters, regions, sources } from '../src/data/curriculum';
import { atlasHotspotForStep, atlasHotspots, atlasSources, atlasThemeForStep, atlasThemes, getAtlasTheme } from '../src/data/atlas';
import { contemporaryCases, contemporaryCasesForStep } from '../src/data/contemporaryCases';
import { atlasReferenceByHotspot, atlasVerifiedReference } from '../src/data/placeProvenance';
import records from '../public/assets/atlas-place-references.json';
import { atlasHash, atlasLocationForStep, detailHash, detailOrigin, parseAtlasLocation } from '../src/lib/spatialJourney';

describe('以整体地图组织认识西藏', () => {
  it('从环境到人文、事件与今天形成连续主线，仍能进入九章36问题', () => {
    expect(atlasThemes.map(theme => theme.id)).toEqual(['environment', 'people', 'history', 'development']);
    expect(atlasThemes.map(theme => theme.nextId)).toEqual(['people', 'history', 'development', null]);
    const allSteps = chapters.flatMap(chapter => chapter.steps);
    expect(allSteps).toHaveLength(36);
    expect(atlasThemeForStep('G1')).toBeUndefined();
    expect(atlasThemeForStep('G2')).toBeUndefined();
    expect(atlasThemeForStep('unknown')).toBeUndefined();
    for (const step of allSteps.filter(step => !['G1', 'G2'].includes(step.id))) {
      const theme = atlasThemeForStep(step.id);
      const hotspot = atlasHotspotForStep(step.id);
      expect(theme, step.id).toBeDefined();
      expect(hotspot?.relatedQuestionIds, step.id).toContain(step.id);
      expect(theme?.hotspots, step.id).toContain(hotspot);
    }
    expect(atlasThemeForStep('K1')?.id).toBe('people');
    expect(atlasThemeForStep('H3')?.id).toBe('history');
    expect(atlasThemeForStep('M1')?.id).toBe('development');
  });

  it('每个地图入口链接真实章节、解释为何到这里，并提供可解析的证据来源', () => {
    const sourceIds = new Set(atlasSources.map(source => source.id));
    const ids = atlasHotspots.map(hotspot => hotspot.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of atlasThemes) {
      expect(theme.hotspots.length).toBeGreaterThanOrEqual(4);
      expect(theme.hotspots.length).toBeLessThanOrEqual(6);
      expect(getAtlasTheme(`atlas-${theme.id}`)).toBe(theme);
      for (const hotspot of theme.hotspots) {
        expect(hotspot.themes).toContain(theme.id);
        const chapter = chapters.find(item => item.id === hotspot.chapterId);
        expect(chapter?.steps.some(step => step.id === hotspot.questionId), hotspot.id).toBe(true);
        expect(hotspot.stepId).toBe(hotspot.questionId);
        expect(hotspot.relatedQuestionIds, `${hotspot.id} must offer its own detail question`).toContain(hotspot.questionId);
        expect(hotspot.summary.length, hotspot.id).toBeGreaterThan(50);
        expect(hotspot.whyHere.length, hotspot.id).toBeGreaterThan(35);
        expect(hotspot.locationNote.length, hotspot.id).toBeGreaterThan(15);
        expect(hotspot.longitude).toBeGreaterThanOrEqual(76);
        expect(hotspot.longitude).toBeLessThanOrEqual(101);
        expect(hotspot.latitude).toBeGreaterThanOrEqual(25);
        expect(hotspot.latitude).toBeLessThanOrEqual(38);
        expect(hotspot.sources.length).toBeGreaterThan(0);
        for (const sourceId of hotspot.sources) expect(sourceIds.has(sourceId), sourceId).toBe(true);
      }
    }
    expect([...new Set(atlasHotspots.map(hotspot => hotspot.regionId))].sort()).toEqual(regions.map(region => region.id).sort());
  });

  it('同一历史问题的替代材料入口都有详情，直接访问仍使用稳定主入口', () => {
    const tholing = atlasHotspots.find(hotspot => hotspot.id === 'tholing-exchange')!;
    const gyantse = atlasHotspots.find(hotspot => hotspot.id === 'gyantse-1904')!;
    expect(tholing.relatedQuestionIds).toContain('H2');
    expect(gyantse.relatedQuestionIds).toContain('H4');
    expect(atlasHotspotForStep('H2')?.id).toBe('yarlung-polity');
    expect(atlasHotspotForStep('H4')?.id).toBe('lhasa-institutions');
  });

  it('具名事件材料不冒充通用场景的专门复原，六历史入口都有独立可读内容', () => {
    expect(atlasHotspots.filter(hotspot => hotspot.materialOnly).map(hotspot => hotspot.id)).toEqual(['tholing-exchange', 'gyantse-1904']);
    for (const hotspot of getAtlasTheme('history')!.hotspots) {
      expect(hotspot.detailParagraphs?.length, hotspot.id).toBeGreaterThanOrEqual(2);
      expect(hotspot.detailParagraphs?.join('').length, hotspot.id).toBeGreaterThan(100);
    }
    expect(atlasHotspots.find(hotspot => hotspot.id === 'tholing-exchange')?.sources).toEqual(['met-exchange', 'locator-tholing']);
    expect(atlasHotspots.find(hotspot => hotspot.id === 'gyantse-1904')?.sources).toEqual(['atlas-gyantse-1904', 'locator-gyantse']);
    const prehistory = atlasHotspots.find(hotspot => hotspot.id === 'nyade-evidence')!;
    expect(prehistory.period).toContain('2018');
    expect(prehistory.period).toContain('2026');
    expect(prehistory.period).toContain('4.5万');
    const institutions = atlasHotspots.find(hotspot => hotspot.id === 'lhasa-institutions')!;
    expect(institutions.detailParagraphs?.join('')).toContain('1642年于日喀则');
    expect(institutions.detailParagraphs?.join('')).toContain('1951年协议在北京');
    expect(new Set(atlasSources.map(source => source.id)).size).toBe(atlasSources.length);
  });

  it('具名历史事件、材料年代与现代节点彼此区分', () => {
    const stele = atlasHotspots.find(hotspot => hotspot.id === 'lhasa-stele')!;
    expect(stele.period).toContain('821—822');
    expect(stele.period).toContain('823');
    expect(stele.sources).toContain('stele');
    expect(atlasHotspots.find(hotspot => hotspot.id === 'tholing-exchange')?.period).toContain('1042');
    expect(atlasHotspots.find(hotspot => hotspot.id === 'gyantse-1904')?.period).toContain('1904');
    expect(atlasHotspots.find(hotspot => hotspot.id === 'lhasa-railway')?.period).toContain('2006年7月1日');
    expect(atlasHotspots.find(hotspot => hotspot.id === 'lhasa-institutions')?.summary).toContain('1951');
    expect(atlasThemes.find(theme => theme.id === 'people')?.summary).toContain('人的行动');
  });

  it('后半程旧书签从案例相关地区进入，并保持原问题直至详情返回', () => {
    const expectedEntries = [
      ['R1', 'connections', 'people', 'yarlung-life', 'shannan'],
      ['R2', 'connections', 'people', 'tholing-culture', 'ngari'],
      ['R3', 'connections', 'environment', 'southeast-clouds', 'nyingchi'],
      ['M1', 'modern', 'development', 'lhasa-railway', 'lhasa'],
      ['M2', 'modern', 'development', 'nyingchi-living-place', 'nyingchi'],
      ['M3', 'modern', 'people', 'lhasa-buildings', 'lhasa'],
      ['T1', 'travel', 'people', 'lhasa-buildings', 'lhasa'],
      ['T2', 'travel', 'people', 'lhasa-buildings', 'lhasa'],
      ['T3', 'travel', 'people', 'lhasa-buildings', 'lhasa'],
    ];
    for (const [stepId, chapterId, themeId, hotspotId, regionId] of expectedEntries) {
      const location = parseAtlasLocation(`#/learn/${chapterId}/${stepId}`)!;
      const point = atlasHotspotForStep(stepId)!;
      expect(location, stepId).toEqual({ themeId, hotspotId, questionId: stepId });
      expect(location).toEqual(atlasLocationForStep(stepId));
      expect(point.regionId, stepId).toBe(regionId);
      expect(point.materialOnly, stepId).not.toBe(true);
      expect(chapters.find(chapter => chapter.id === chapterId)?.steps.find(step => step.id === stepId)).toBeDefined();
      expect(point.relatedQuestionIds, stepId).toContain(stepId);
      // Shared regional entries have their own default question. The caller's
      // R/M/T question must survive rather than silently becoming E3, C5 or K1.
      const detail = detailHash(chapterId, stepId, location);
      expect(detail.split('?')[0]).toBe(`/learn/${chapterId}/${stepId}/detail`);
      expect(parseAtlasLocation(detail)).toBeUndefined();
      expect(detailOrigin(detail, stepId)).toEqual(location);
      expect(parseAtlasLocation(atlasHash(detailOrigin(detail, stepId)!))).toEqual(location);
    }
    expect(atlasHotspotForStep('unknown')).toBeUndefined();
  });

  it('明确选择的替代入口仍能返回原处，稳定主入口不抹去用户的地图来路', () => {
    const explicitOrigins = [
      { themeId: 'development' as const, hotspotId: 'changtang-stewardship', questionId: 'R1' },
      { themeId: 'development' as const, hotspotId: 'chamdo-connections', questionId: 'R2' },
      { themeId: 'development' as const, hotspotId: 'shigatse-neighbours', questionId: 'R3' },
      { themeId: 'development' as const, hotspotId: 'nyingchi-living-place', questionId: 'T2' },
    ];
    for (const origin of explicitOrigins) {
      const chapter = chapters.find(item => item.steps.some(step => step.id === origin.questionId))!;
      expect(parseAtlasLocation(atlasHash(origin))).toEqual(origin);
      expect(detailOrigin(detailHash(chapter.id, origin.questionId, origin), origin.questionId)).toEqual(origin);
      expect(atlasHotspotForStep(origin.questionId)?.id).not.toBe(origin.hotspotId);
    }
  });

  it('案例扩充复用20个已归档入口，不把案例地点或模型几何另造为坐标', () => {
    expect(atlasHotspots).toHaveLength(20);
    expect(new Set(atlasHotspots.map(point => point.id)).size).toBe(20);
    expect(Object.keys(atlasReferenceByHotspot).sort()).toEqual(atlasHotspots.map(point => point.id).sort());
    // Read the archived raw records independently of the runtime locator helper.
    const zetang = records.geoNames.find(record => record.geonameId === '1279498')!;
    const tholing = records.geoNames.find(record => record.geonameId === '1279865')!;
    const nyingchi = records.naturalEarth.find(record => record.properties.ne_id === 1159146957)!;
    const lhasa = records.naturalEarth.find(record => record.properties.ne_id === 1159150879)!;
    const positions: Record<string, number[]> = {
      R1: [Number(zetang.originalTsv.split('\t')[5]), Number(zetang.originalTsv.split('\t')[4])],
      R2: [Number(tholing.originalTsv.split('\t')[5]), Number(tholing.originalTsv.split('\t')[4])],
      R3: nyingchi.geometry.coordinates,
      M2: nyingchi.geometry.coordinates,
      M3: lhasa.geometry.coordinates,
      T1: lhasa.geometry.coordinates,
      T2: lhasa.geometry.coordinates,
      T3: lhasa.geometry.coordinates,
    };
    for (const [stepId, coordinates] of Object.entries(positions)) {
      const point = atlasHotspotForStep(stepId)!;
      expect([point.longitude, point.latitude], stepId).toEqual(coordinates);
      expect(point.locatorKind).toBe('settlement-reference');
      expect(point.coordinateDecimalPlaces).toBe(1);
      const source = atlasSources.filter(item => item.id === point.coordinateSourceId);
      expect(source).toHaveLength(1);
      expect(source[0].url).toBe(point.coordinateSourceUrl);
      expect(point.sources).toContain(point.coordinateSourceId);
      expect(point.locationNote).toContain(atlasVerifiedReference(point.id)!.scope);
    }
  });

  it('林芝生活入口保留城市参照身份，彩门村和Pala资料不能取得虚假村址', () => {
    const point = atlasHotspotForStep('M2')!;
    expect(point.locatorName).toBe('林芝城区参考');
    expect(point.coordinateSourceId).toBe('locator-nyingchi');
    expect(point.coordinateSourceId).not.toBe('locator-lulang');
    expect(point.locationNote).toContain('彩门村在米林');
    expect(point.locationNote).toMatch(/不表示村址、铁路站址或田野调查家庭/);
    const communityCases = contemporaryCasesForStep('M2');
    expect(communityCases.map(item => item.id).sort()).toEqual(['lalin-caimen-local-use', 'pala-household-service-experience']);
    for (const item of communityCases) {
      expect(item).not.toHaveProperty('longitude');
      expect(item).not.toHaveProperty('latitude');
      expect(item).not.toHaveProperty('coordinates');
      expect(item).not.toHaveProperty('geometry');
    }
  });

  it('每个R/M/T主入口能找到本段全部案例来源，链接和材料边界在两级来源目录中一致', () => {
    const allSteps = chapters.flatMap(chapter => chapter.steps);
    const caseSources = new Map<string, (typeof contemporaryCases)[number]['sources'][number]>();
    for (const item of contemporaryCases) for (const source of item.sources) {
      const previous = caseSources.get(source.id);
      if (previous) expect(source, `conflicting source id: ${source.id}`).toEqual(previous);
      caseSources.set(source.id, source);
    }
    for (const stepId of ['R1', 'R2', 'R3', 'M1', 'M2', 'M3', 'T1', 'T2', 'T3']) {
      const point = atlasHotspotForStep(stepId)!;
      const step = allSteps.find(item => item.id === stepId)!;
      const selectedCases = contemporaryCasesForStep(stepId);
      expect(selectedCases.length, stepId).toBeGreaterThan(0);
      for (const item of selectedCases) for (const source of item.sources) {
        expect.soft(point.sources, `${stepId}: ${source.id}`).toContain(source.id);
        // Sources for the entire card are available through the global source
        // registry. A question may cite a narrower subset directly.
        const chapterSource = sources.filter(candidate => candidate.id === source.id);
        const atlasSource = atlasSources.filter(candidate => candidate.id === source.id);
        expect(chapterSource, source.id).toHaveLength(1);
        expect(atlasSource, source.id).toHaveLength(1);
        expect(atlasSource[0]).toEqual(chapterSource[0]);
        expect(atlasSource[0].url, source.id).toBe(source.url);
        expect(atlasSource[0].title, source.id).toBe(source.title);
        expect(atlasSource[0].note, source.id).toContain(source.identity);
        expect(atlasSource[0].note, source.id).toContain(source.scope);
      }
      // At least one case-specific source is reachable directly from its
      // question, in addition to the complete source list on the map entry.
      const relevantIds = new Set(selectedCases.flatMap(item => item.sources.map(source => source.id)));
      expect(step.sources.some(id => relevantIds.has(id)), stepId).toBe(true);
    }
    for (const source of caseSources.values()) {
      const url = new URL(source.url);
      expect(url.protocol, source.id).toBe('https:');
      expect(url.username).toBe('');
      expect(url.password).toBe('');
      expect(url.hostname).not.toMatch(/(^|\.)example\.(com|org|net)$/);
    }
  });
});
