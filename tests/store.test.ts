import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectionUnderstanding } from '../src/data/connectionUnderstanding';
import { railwayUnderstanding } from '../src/data/railwayUnderstanding';
import { travelUnderstanding } from '../src/data/travelUnderstanding';
import {
  defaultSettings, emptyExploration, parseExploration, parseRoute, readExploration,
  resolveCultureTopicIndex, resolveHistoryPeriodIndex, settingsForStep,
  STORAGE_KEY, writeExploration,
} from '../src/lib/store';

afterEach(() => vi.unstubAllGlobals());

describe('探索状态恢复', () => {
  it.each(['{', '{"version":9}', 'null', '[]', '42'])('损坏或不支持的数据安全回到初始状态：%s', (raw) => {
    expect(parseExploration(raw)).toEqual(emptyExploration());
  });

  it('完整保留学习、收藏、路线、笔记与场景条件', () => {
    const value = emptyExploration();
    value.lastStep = 'C5';
    value.visited = ['G1', 'C5'];
    value.completed = ['G1'];
    value.bookmarks = ['C5'];
    value.route = ['lhasa-old-town', 'nyingchi-valley'];
    value.note = '比较山地云雨与河谷的生活条件。';
    value.travelDate = '2027-06-10';
    value.transport = '公共交通';
    value.scenes.C5 = { season: 3, layer: 'rain', progress: .8, selected: 'nyingchi', cutaway: true };
    expect(parseExploration(JSON.stringify(value))).toEqual(value);
  });

  it('地球定位与周边图层及已选择的地理对象能够保存和恢复', () => {
    const value = emptyExploration();
    value.scenes.G1 = { ...defaultSettings(), layer: 'asia', selected: 'china' };
    value.scenes.G2 = { ...defaultSettings(), layer: 'moisture', selected: 'indian-ocean' };
    const restored = parseExploration(JSON.stringify(value));
    expect(restored.scenes.G1).toEqual(value.scenes.G1);
    expect(restored.scenes.G2).toEqual(value.scenes.G2);
    value.scenes.G1.layer = 'tibet'; value.scenes.G1.selected = 'tibet';
    value.scenes.G2.layer = 'plateau'; value.scenes.G2.selected = 'plateau';
    expect(parseExploration(JSON.stringify(value)).scenes).toEqual(value.scenes);
  });

  it('藏戏场地、学习进度和三个实际对象可写入后恢复，未知选择仍被拒绝', () => {
    let raw: string | null = null;
    vi.stubGlobal('localStorage', { setItem: (_key: string, value: string) => { raw = value; }, getItem: () => raw });
    const value = emptyExploration();
    value.lastStep = 'K4';
    for (const layer of ['life', 'opera-stage']) for (const selected of ['opera-space', 'opera-performance', 'opera-learning']) {
      value.scenes.K4 = { ...defaultSettings(layer, selected), progress: .78 };
      expect(writeExploration(value)).toBe(true);
      expect(readExploration().scenes.K4).toEqual(value.scenes.K4);
      expect(resolveCultureTopicIndex(readExploration().scenes.K4, 'K4')).toBe(3);
    }
    value.scenes.K4.selected = 'opera-invented-mask';
    expect(parseExploration(JSON.stringify(value)).scenes.K4).toEqual({ ...value.scenes.K4, selected: '' });
  });

  it('去重并移除失效步骤和站点，避免进度被错误累计', () => {
    const value = parseExploration(JSON.stringify({
      version: 1, lastStep: 'deleted-step', visited: ['G1', null, 4, 'G1', 'C99'],
      completed: ['H3', 'H3', 'unknown'], bookmarks: ['C5', 'C5', 'unknown'],
      route: ['lhasa-old-town', 'lhasa-old-town', 'not-a-stop', 'tholing'],
    }));
    expect(value.lastStep).toBe('G1');
    expect(value.visited).toEqual(['G1', 'H3']);
    expect(value.completed).toEqual(['H3']);
    expect(value.bookmarks).toEqual(['C5']);
    expect(value.route).toEqual(['lhasa-old-town', 'tholing']);
  });

  it('钳制异常参数并移除未知图层与对象', () => {
    const value = parseExploration(JSON.stringify({ version: 1, scenes: {
      C5: { season: 99, progress: 9, cutaway: true, layer: 'not-a-layer', selected: '<script>' },
      G1: { season: -9, progress: -1 },
      C1: { season: 1.5, progress: null },
    } }));
    expect(value.scenes.C5).toEqual({ season: 3, progress: 1, cutaway: true, layer: 'terrain', selected: '' });
    expect(value.scenes.G1.season).toBe(0);
    expect(value.scenes.G1.progress).toBe(0);
    expect(value.scenes.C1.season).toBe(1);
    expect(value.scenes.C1.progress).toBe(.55);
  });

  it('拒绝场景数组、未知键和原型键，保留可用部分', () => {
    const value = parseExploration('{"version":1,"scenes":{"__proto__":{"season":3},"constructor":{},"H1":[],"C5":null,"G1":{"season":2,"layer":"terrain"}}}');
    expect(Object.keys(value.scenes)).toEqual(['G1']);
    expect(Object.getPrototypeOf(value.scenes)).toBe(Object.prototype);
    expect(value.scenes.G1.season).toBe(2);
    expect(parseExploration('{"version":1,"scenes":[]}').scenes).toEqual({});
  });

  it('验证真实日历日期并限制笔记长度', () => {
    expect(parseExploration('{"version":1,"travelDate":"2028-02-29"}').travelDate).toBe('2028-02-29');
    for (const date of ['2026-02-29', '2026-13-01', '2026-04-31', 'tomorrow', '2026-1-2']) {
      expect(parseExploration(JSON.stringify({ version: 1, travelDate: date })).travelDate).toBe('');
    }
    const value = parseExploration(JSON.stringify({ version: 1, note: '字'.repeat(10020), transport: 'unknown' }));
    expect(value.note).toHaveLength(10000);
    expect(value.transport).toBe('');
  });

  it('实际写入并读取最新完整记录', () => {
    let raw: string | null = null;
    const setItem = vi.fn((key: string, value: string) => { expect(key).toBe(STORAGE_KEY); raw = value; });
    vi.stubGlobal('localStorage', { setItem, getItem: () => raw });
    const value = { ...emptyExploration(), note: '最后一次修改', route: ['tholing'], travelDate: '2027-08-20' };
    expect(writeExploration(value)).toBe(true);
    expect(setItem).toHaveBeenCalledOnce();
    expect(readExploration()).toEqual(value);
  });

  it('存储不可用时返回失败，不报告保存成功', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new Error('Quota exceeded'); },
      getItem: () => { throw new Error('Storage unavailable'); },
    });
    expect(writeExploration(emptyExploration())).toBe(false);
    expect(readExploration()).toEqual(emptyExploration());
  });
});

describe('章节深链接', () => {
  it('保留有效章节步骤，首页不伪装成学习步骤', () => {
    expect(parseRoute('#/learn/climate/C5')).toEqual({ home: false, chapter: 'climate', step: 'C5' });
    expect(parseRoute('#/')).toEqual({ home: true, chapter: 'position', step: 'G1' });
  });
  it('修复错章或不存在的步骤，并过滤危险键', () => {
    expect(parseRoute('#/learn/history/C5')).toEqual({ home: false, chapter: 'history', step: 'H1' });
    expect(parseRoute('#/learn/history/H99').step).toBe('H1');
    expect(parseRoute('#/learn/__proto__/G1')).toEqual({ home: false, chapter: 'position', step: 'G1' });
  });
});

describe('历史与文化选中内容', () => {
  it('生活条件与组织选择独立恢复，非法设定不能变成场景条件',()=>{
    const saved=emptyExploration();
    saved.scenes.E3={...settingsForStep({id:'E3',scene:'region',layer:'terrain'}),livingSetting:'upland',communitySupport:'shared',progress:.6};
    saved.scenes.P3={...settingsForStep({id:'P3',scene:'region',layer:'terrain'}),livingSetting:'valley',communitySupport:'individual',progress:1};
    expect(parseExploration(JSON.stringify(saved)).scenes).toEqual(saved.scenes);
    const restored=parseExploration(JSON.stringify({version:1,scenes:{E3:{...saved.scenes.E3,livingSetting:'all-highlands',communitySupport:'best'}}}));
    expect(restored.scenes.E3.livingSetting).toBeUndefined();
    expect(restored.scenes.E3.communitySupport).toBeUndefined();
    expect(restored.scenes.E3.progress).toBe(.6);
  });
  it('初始水汽与两地比较一起保存，非法条件和地点不进入场景',()=>{
    const saved=emptyExploration();
    saved.scenes.C5={...defaultSettings('rain','cloud-condense'),progress:.74,airMoisture:'lower'};
    saved.scenes.E2={...defaultSettings('terrain','nyingchi'),compareRegion:'ngari'};
    expect(parseExploration(JSON.stringify(saved)).scenes).toEqual(saved.scenes);
    const invalid={...saved,scenes:{C5:{...saved.scenes.C5,airMoisture:'100%'},E2:{...saved.scenes.E2,compareRegion:'__proto__'}}};
    expect(parseExploration(JSON.stringify(invalid)).scenes.C5.airMoisture).toBeUndefined();
    expect(parseExploration(JSON.stringify(invalid)).scenes.E2.compareRegion).toBeUndefined();
  });
  it('形成、地形剖面与能量操作完整保存，返回后继续原来的条件', () => {
    const original = emptyExploration();
    original.scenes = {
      G3: { ...defaultSettings('crust', 'formation-crust'), progress: .61, cutaway: true },
      G4: { ...defaultSettings('relief', 'terrain-yarlung'), progress: .73, cutaway: true },
      C2: { ...defaultSettings('exchange', 'energy-atmosphere'), progress: .94 },
    };
    expect(parseExploration(JSON.stringify(original)).scenes).toEqual(original.scenes);
  });
  it.each([['H1', 0], ['H2', 1], ['H3', 1], ['H4', 8]] as const)('%s首次进入与其历史内容匹配', (id, index) => {
    const settings = settingsForStep({ id, scene: 'history', layer: 'settlements', selected: 'lhasa' });
    expect(resolveHistoryPeriodIndex(settings, id)).toBe(index);
    expect(settings.progress).toBe(id==='H2'?index/8:0);
    expect(resolveHistoryPeriodIndex(defaultSettings('routes', 'nagqu'), id)).toBe(index);
  });

  it.each([['K1', 0, 'architecture'], ['K2', 1, 'religion'], ['K3', 2, 'art'], ['K4', 3, 'life']] as const)('%s首次进入与其文化内容匹配', (id, index, layer) => {
    const settings = settingsForStep({ id, scene: 'culture', layer: 'settlements', selected: 'courtyard' });
    expect(resolveCultureTopicIndex(settings, id)).toBe(index);
    expect(settings.layer).toBe(layer);
    expect(settings.selected).toBe('');
    expect(settings.progress).toBe(0);
  });

  it('明确选择的时期或主题优先于步骤默认值', () => {
    expect(resolveHistoryPeriodIndex(defaultSettings('routes', 'qing'), 'H1')).toBe(6);
    expect(resolveCultureTopicIndex(defaultSettings('art', 'courtyard'), 'K4')).toBe(2);
    expect(resolveCultureTopicIndex(defaultSettings('routes', 'religion'), 'K1')).toBe(1);
  });

  it('不存在的步骤和原型名称只能回到有效索引', () => {
    for (const id of ['missing', '__proto__', 'constructor']) {
      expect(resolveHistoryPeriodIndex(defaultSettings(), id)).toBe(0);
      expect(resolveCultureTopicIndex(defaultSettings(), id)).toBe(0);
    }
  });
});

describe('主题计划与现代联系过程恢复', () => {
  it('将每站问题与顺序、日期和交通意向实际写入后读回', () => {
    let raw: string | null = null;
    vi.stubGlobal('localStorage', { setItem: (_key: string, value: string) => { raw = value; }, getItem: () => raw });
    const value = emptyExploration();
    value.lastStep = 'T3'; value.route = ['lhasa-buildings', 'lhasa-old-town', 'nyingchi-valley'];
    value.stopNotes = { 'lhasa-buildings': '观察入口、使用与材料的关系。', 'lhasa-old-town': '回看地方生活的具体资料。', 'nyingchi-valley': '继续查当天接驳与季节条件。' };
    value.travelDate = '2027-05-18'; value.transport = '混合交通'; value.note = '知识上的顺序仍需转成真实安排。';
    expect(writeExploration(value)).toBe(true); expect(readExploration()).toEqual(value);
    expect(readExploration().route.slice(0, 2)).toEqual(['lhasa-buildings', 'lhasa-old-town']);
  });

  it('只接受已知站点的字符串备注，逐站截断过长内容', () => {
    const result = parseExploration('{"version":1,"stopNotes":{"lhasa-buildings":"保留","not-a-stop":"移除","sakya":7,"tholing":null,"changtang":{"text":"对象不能当笔记"},"__proto__":"移除","constructor":"移除"}}');
    expect(result.stopNotes).toEqual({ 'lhasa-buildings': '保留' }); expect(Object.getPrototypeOf(result.stopNotes)).toBe(Object.prototype);
    const long = parseExploration(JSON.stringify({ version: 1, stopNotes: { 'lhasa-old-town': '字'.repeat(1520), 'nyingchi-valley': '短备注' } }));
    expect(long.stopNotes['lhasa-old-town']).toHaveLength(1500); expect(long.stopNotes['nyingchi-valley']).toBe('短备注');
    for (const value of [[], '全部通过', 42, null]) expect(parseExploration(JSON.stringify({ version: 1, stopNotes: value })).stopNotes).toEqual({});
  });

  it('清除重复站点和未知项时保留同一地区的不同站及原有顺序', () => {
    const result = parseExploration(JSON.stringify({ version: 1, route: ['nyingchi-valley', 'lhasa-buildings', 'not-a-stop', 'lhasa-old-town', 'lhasa-buildings'], stopNotes: { 'lhasa-old-town': '两处同城站分别提问。' } }));
    expect(result.route).toEqual(['nyingchi-valley', 'lhasa-buildings', 'lhasa-old-town']); expect(result.stopNotes['lhasa-old-town']).toBe('两处同城站分别提问。');
  });

  it.each([1, 3])('M1恢复季节%s及暖冷条件下的全部教学对象', season => {
    const base = { ...settingsForStep({ id: 'M1', scene: 'modern', layer: 'ground' }), season, progress: .52 };
    for (const item of railwayUnderstanding('M1', base)!.objects) {
      const value = emptyExploration(); value.scenes.M1 = { ...base, selected: item.id };
      expect(parseExploration(JSON.stringify(value)).scenes.M1).toEqual(value.scenes.M1);
    }
  });

  it('联系与旅游所有新教学对象均能恢复，未知对象仍被拒绝', () => {
    const base = { ...defaultSettings(), progress: .74 };
    for (const id of ['R1', 'R2', 'R3', 'T1', 'T2', 'T3']) {
      const unit = (id.startsWith('R') ? connectionUnderstanding : travelUnderstanding)(id, base)!;
      for (const item of unit.objects) {
        const value = emptyExploration(); value.scenes[id] = { ...base, selected: item.id };
        expect(parseExploration(JSON.stringify(value)).scenes[id]).toEqual(value.scenes[id]);
      }
    }
    const value = emptyExploration(); value.scenes.R3 = { ...base, layer: 'cooperation', selected: 'not-an-observation' };
    expect(parseExploration(JSON.stringify(value)).scenes.R3).toEqual({ ...value.scenes.R3, selected: '' });
  });

  it('初次进入铁路、联系与旅行时从过程起点开始，而不伪造候选站', () => {
    const railway = settingsForStep({ id: 'M1', scene: 'modern', layer: 'transport', selected: 'lhasa' });
    expect(railway).toMatchObject({ season: 3, layer: 'ground', progress: 0, selected: '' });
    for (const id of ['R1', 'R2', 'R3', 'T1', 'T2', 'T3']) expect(settingsForStep({ id, scene: id[0] === 'R' ? 'connections' : 'travel', layer: 'terrain', selected: 'lhasa' })).toMatchObject({ progress: 0, selected: '' });
    expect(emptyExploration().route).toEqual([]); expect(emptyExploration().stopNotes).toEqual({});
  });
});
