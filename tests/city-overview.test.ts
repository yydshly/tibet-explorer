import { describe, expect, it } from 'vitest';
import { chapters, regions } from '../src/data/curriculum';
import { cityOverviews, cityOverviewContext, cityOverviewFacets, cityOverviewSources, getCityOverview } from '../src/data/cityOverview';
import { regionalAnchors } from '../src/data/regionalStudy';

describe('城市级认识入口的资料和尺度', () => {
  it('对应现有七地域，保留六个地级市和阿里地区的区别', () => {
    expect(cityOverviews.map(city => city.id).sort()).toEqual(regions.map(region => region.id).sort());
    expect(new Set(cityOverviews.map(city => city.id)).size).toBe(7);
    expect(cityOverviews.filter(city => city.administrativeType === '地级市')).toHaveLength(6);
    expect(cityOverviews.filter(city => city.administrativeType === '地区').map(city => city.id)).toEqual(['ngari']);
    for (const city of cityOverviews) {
      expect(regionalAnchors.some(anchor => anchor.id === city.id), city.id).toBe(true);
      expect(city.administrativeName).toBe(`${city.name}${city.id === 'ngari' ? '地区' : '市'}`);
    }
    expect(getCityOverview('unknown-place')).toBeUndefined();
  });

  it('每个介绍面及全局行政口径都有可解析的来源', () => {
    const catalog = new Map(cityOverviewSources.map(source => [source.id, source]));
    expect(catalog.size).toBe(cityOverviewSources.length);
    const references = [...cityOverviewContext.sourceIds];
    for (const city of cityOverviews) {
      expect(Object.keys(city.facets).sort()).toEqual(cityOverviewFacets.map(facet => facet.id).sort());
      for (const facet of Object.values(city.facets)) {
        expect(facet.sourceIds.length, `${city.id}/${facet.title}`).toBeGreaterThan(0);
        references.push(...facet.sourceIds);
      }
    }
    for (const id of references) {
      const source = catalog.get(id);
      expect(source, id).toBeDefined();
      expect(new URL(source!.url).protocol, id).toBe('https:');
      expect(source!.title.trim(), id).not.toBe('');
    }
    const administrative = catalog.get('tibet-administrative-2026')!;
    expect(new URL(administrative.url).hostname).toBe('mzt.xizang.gov.cn');
    expect(administrative.note).toContain('2026年6月30日');
  });

  it('延伸专题可访问，并避开把其他地方的模型当作本地材料的链接', () => {
    const steps = new Set(chapters.flatMap(chapter => chapter.steps.map(step => step.id)));
    for (const city of cityOverviews) {
      for (const facet of Object.values(city.facets)) {
        expect(new Set(facet.stepIds).size).toBe(facet.stepIds.length);
        for (const id of facet.stepIds) expect(steps.has(id), `${city.id}/${id}`).toBe(true);
      }
    }
    expect(getCityOverview('shannan')!.facets.history.stepIds).not.toContain('K1');
    expect(getCityOverview('chamdo')!.facets.history.stepIds).not.toContain('H1');
    expect(getCityOverview('chamdo')!.facets.history.stepIds).not.toContain('R1');
    expect(getCityOverview('nyingchi')!.facets.history.stepIds).not.toContain('K4');
    expect(getCityOverview('ngari')!.facets.history.stepIds).not.toContain('K3');
    expect(getCityOverview('nagqu')!.facets.history.stepIds).toContain('H1');
    expect(getCityOverview('lhasa')!.facets.history.stepIds).toContain('K1');
  });

  it('定位点与全域介绍分开，尚未绘制的市地行政界不被宣称存在', () => {
    expect(cityOverviewContext.scaleNote).toContain('城区与所辖区域');
    expect(cityOverviewContext.scaleNote).toContain('城区或行政驻地');
    expect(cityOverviewContext.scaleNote).toContain('暂不显示市地行政边界');
    const arranged = cityOverviewContext.arrangements.flatMap(group => group.ids);
    expect(arranged.sort()).toEqual(cityOverviews.map(city => city.id).sort());
  });

  it('当前概览不带缺少统计口径的城市指标，发展角色明确保留规划年份', () => {
    for (const city of cityOverviews) {
      const prose = [city.summary, city.naturalSetting, ...Object.values(city.facets).flatMap(facet => facet.paragraphs)].join('');
      expect(prose, city.id).not.toMatch(/\d[\d.,—–～~]*\s*(?:米|毫米|℃|°C|万人|亿元|平方公里|km²|mm\b|%)/i);
      expect(prose, city.id).not.toMatch(/(?:GDP|人均收入|年均气温|年降水量|常住人口)\s*[为是：:]/i);
      expect(city, city.id).not.toHaveProperty('population');
      expect(city, city.id).not.toHaveProperty('gdp');
      expect(city, city.id).not.toHaveProperty('elevation');
      expect(city.facets.today.paragraphs.join(''), city.id).toContain('2022年商务规划');
      expect(city.facets.today.sourceIds, city.id).toContain('city-commerce-plan-2022');
    }
  });
});
