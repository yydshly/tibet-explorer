import { describe, expect, it } from 'vitest';
import { contemporaryCases, contemporaryCasesForStep } from '../src/data/contemporaryCases';
import { parseExploration } from '../src/lib/store';

const get = (id: string) => {
  const item = contemporaryCases.find(candidate => candidate.id === id);
  if (!item) throw new Error(`Missing case ${id}`);
  return item;
};

describe('后半程的地方、人物与事件案例', () => {
  it('每个联系、发展与旅行问题都能取到适用案例，未知问题不借用案例', () => {
    expect(contemporaryCases.length).toBeGreaterThanOrEqual(6);
    expect(new Set(contemporaryCases.map(item => item.id)).size).toBe(contemporaryCases.length);
    for (const stepId of ['R1', 'R2', 'R3', 'M1', 'M2', 'M3', 'T1', 'T2', 'T3']) {
      const selected = contemporaryCasesForStep(stepId);
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.every(item => item.stepIds.includes(stepId))).toBe(true);
    }
    expect(contemporaryCasesForStep('G1')).toEqual([]);
    expect(contemporaryCasesForStep('unknown')).toEqual([]);
  });

  it('人物与事件均回指本卡的来源，日期与材料身份分开', () => {
    for (const item of contemporaryCases) {
      for (const key of ['title', 'question', 'why', 'location', 'time'] as const) expect(item[key].trim()).not.toBe('');
      for (const paragraphs of [item.howEvidence, item.whatItSupports, item.whatItDoesNotSupport]) expect(paragraphs.length).toBeGreaterThan(0);
      const sourceIds = new Set(item.sources.map(source => source.id));
      expect(sourceIds.size).toBe(item.sources.length);
      for (const source of item.sources) {
        expect(new URL(source.url).protocol).toBe('https:');
        expect(source.identity.trim()).not.toBe('');
        expect(source.scope.trim()).not.toBe('');
        expect(source.year).toBeLessThanOrEqual(2026);
      }
      expect(item.namedEvents.length).toBeGreaterThan(0);
      for (const event of item.namedEvents) {
        expect(event.dateMeaning.trim()).not.toBe(''); expect(event.place.trim()).not.toBe('');
        expect(event.sourceIds.length).toBeGreaterThan(0);
        expect(event.sourceIds.every(id => sourceIds.has(id))).toBe(true);
      }
      if (item.person) expect(item.person.sourceIds.every(id => sourceIds.has(id))).toBe(true);
      for (const paragraph of Object.values(item.operation)) expect(paragraph.trim()).not.toBe('');
      expect(item.nextQuestion.bridge.trim()).not.toBe('');
      expect(item).not.toHaveProperty('coordinates'); expect(item).not.toHaveProperty('geometry');
    }
  });

  it('水源归因保留奴下以上与模型时间范围，不把教学水流冒充仪器记录', () => {
    const item = get('yarlung-observation-to-components');
    expect(item.location).toContain('奴下');
    expect(item.whatItDoesNotSupport.join()).toContain('1981—2016');
    expect(item.howEvidence.join()).toContain('水文模型');
    expect(item.operation.limit).toContain('概念流域');
  });

  it('历史节点和监测事件保留证据精度，不创建虚构路线或普适预警', () => {
    const exchange = get('atisha-tholing-evidenced-exchange');
    expect(exchange.namedEvents[0].date).toBe('1042年');
    expect(exchange.location).toContain('加德满都—托林');
    expect(exchange.whatItDoesNotSupport.join()).toContain('精确古道');
    const risk = get('sedongpu-observation-response-chain');
    expect(risk.time).toContain('2018');
    expect(risk.namedEvents.find(event => event.status === 'event')?.date).toBe('2021-03-22');
    expect(risk.whatItDoesNotSupport.join()).toContain('直接气象触发');
    expect(risk.operation.limit).toContain('未重演');
  });

  it('铁路保护保留人物、地点和季节条件，以及监测仍需继续的边界', () => {
    const item = get('qinghai-tibet-permafrost-cooling');
    expect(item.person?.name).toContain('程国栋'); expect(item.person?.name).toContain('马巍');
    expect(item.location).toContain('北麓河试验地在青海');
    expect(item.namedEvents.some(event => event.date === '2006-07-01')).toBe(true);
    expect(item.howEvidence.join()).toMatch(/寒季.*暖季.*对流弱/);
    expect(item.whatItDoesNotSupport.join()).toContain('永久阻止融化');
    expect(item.sources.find(source => source.id.includes('2009'))?.access).toBe('publisher-indexed-text');
    expect(item.sources.find(source => source.id.includes('2024'))?.identity).toContain('2024-03-04');
  });

  it('具名受访者、田野观察与地区成效没有混为一类', () => {
    const village = get('lalin-caimen-local-use');
    expect(village.person?.name).toBe('普巴、扎西');
    expect(village.namedEvents.some(event => event.date === '2021-06-25')).toBe(true);
    expect(village.whatItDoesNotSupport.join()).toContain('所有居民');
    expect(village.whatItDoesNotSupport.join()).toContain('因果成效');
    const fieldwork = get('pala-household-service-experience');
    expect(fieldwork.namedEvents[0].date).toBe('1986—1988年');
    expect(fieldwork.sources[0].year).toBe(2009);
    expect(fieldwork.whatItDoesNotSupport.join()).toContain('1997—2007年农民');
    expect(fieldwork.whatItDoesNotSupport.join()).toContain('2026年调查');
  });

  it('保护报告、拟议措施和个人候选路线保持各自状态', () => {
    const protection = get('lhasa-heritage-protection-and-use');
    expect(protection.namedEvents.some(event => event.status === 'proposal')).toBe(true);
    expect(protection.location).toContain('碑棚例子具体在大昭寺');
    expect(protection.whatItDoesNotSupport.join()).toContain('拟议工作');
    const itinerary = get('lhasa-shannan-nyingchi-learning-corridor');
    expect(itinerary.howEvidence.join()).toContain('产品的候选学习顺序');
    expect(itinerary.whatItDoesNotSupport.join()).toContain('当前班次');
    expect(itinerary.operation.feedback).toContain('待核实');
    expect(itinerary).not.toHaveProperty('durationDays');
    expect(itinerary).not.toHaveProperty('timetable');
  });

  it('教学状态可经现有进度存储恢复，不携带未经支持的科学测量', () => {
    for (const item of contemporaryCases) {
      if (!item.studyTarget) continue;
      expect(item.studyTarget.progress).toBeGreaterThanOrEqual(0);
      expect(item.studyTarget.progress).toBeLessThanOrEqual(1);
      const stepId = item.stepIds[0];
      const settings = { season: 1, layer: 'terrain', selected: '', progress: 0, cutaway: false, ...item.studyTarget };
      const restored = parseExploration(JSON.stringify({ version: 1, scenes: { [stepId]: settings } }));
      expect(restored.scenes[stepId]).toEqual(settings);
    }
  });
});
