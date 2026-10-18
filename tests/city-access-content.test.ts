import { describe, expect, it } from 'vitest';
import { cityAccessChanges, cityAccessSources } from '../src/data/cityAccessChange';
import {cityLocalOsmSource} from '../src/data/cityLocalSources';

const cities = ['nyingchi', 'lhasa', 'ngari'] as const;
const phases = ['before', 'access', 'transfer', 'life'] as const;

describe('开通事件、实际交接与具名地方用途的内容契约', () => {
  it('三城各有四段独立旁白，开通前、加入方式、地方交接和用途均可单独阅读', () => {
    expect(Object.keys(cityAccessChanges).sort()).toEqual([...cities].sort());
    for (const cityId of cities) {
      const value = cityAccessChanges[cityId];
      expect(value.cityId).toBe(cityId);
      const narration = new Set<string>();
      for (const phase of phases) {
        expect(value[phase].label.trim()).not.toBe('');
        expect(value[phase].text.length).toBeGreaterThan(45);
        expect(value[phase].narration.length).toBeGreaterThan(35);
        expect(value[phase].narration.length).toBeLessThan(115);
        narration.add(value[phase].narration);
      }
      expect(narration.size).toBe(4);
    }
  });

  it('事件回到官方发布，现状地理另核OSM来源与许可，不补造精准设施坐标', () => {
    const sources = new Map(cityAccessSources.map(source => [source.id, source]));
    expect(sources.size).toBe(cityAccessSources.length);
    const used = new Set(Object.values(cityAccessChanges).flatMap(value => value.sourceIds));
    expect([...used].sort()).toEqual([...sources.keys()].sort());
    for (const id of used) {
      const source = sources.get(id)!;
      expect(source, id).toBeDefined();
      const url = new URL(source.url);
      expect(url.protocol).toBe('https:');
      if(id===cityLocalOsmSource.id){
        expect(source).toEqual(cityLocalOsmSource);
        expect(url.hostname).toBe('www.openstreetmap.org');
        expect(url.pathname).toBe('/copyright');
        expect(source.note).toMatch(/原始Map API.*WGS84/);
        expect(source.note).toContain('/data/local-places/manifest.json');
        expect(source.note).toContain('获取日期不是建设日期');
        expect(source.note).toContain('ODbL 1.0');
      }else expect(url.hostname.endsWith('.gov.cn')).toBe(true);
      expect(source.title.trim()).not.toBe('');
      expect(source.note.length).toBeGreaterThan(45);
    }
    for (const value of Object.values(cityAccessChanges)) {
      expect(value).not.toHaveProperty('lat');
      expect(value).not.toHaveProperty('lon');
      expect(value).not.toHaveProperty('route');
      expect(value.scope).toMatch(/原理/);
    }
  });

  it('历史开通以前的已有方式必须保留，日期不能变成当前班次或从零开始的城市', () => {
    expect(cities.map(id => cityAccessChanges[id].eventDate)).toEqual(['2021-06-25', '2006-07-01', '2010-07-01']);
    expect(cityAccessChanges.nyingchi.before.text).toMatch(/2006年9月1日.*公路和机场/);
    expect(cityAccessChanges.lhasa.before.text).toContain('已经依靠公路与航空');
    expect(cityAccessChanges.ngari.before.text).toMatch(/2004年G219狮泉河至昆莎段建成柏油路.*通航以前依托公路.*2010/);
    expect(cityAccessChanges.ngari.before.text).toContain('现状道路位置不能视为2004年竣工线路');
    expect(cityAccessChanges.ngari.sourceIds).toContain('event-gunsa-g219-2004-2025');
    const modeOpenings=cityAccessSources.filter(source=>source.id.startsWith('access-')&&/opening|airport/.test(source.id));
    expect(modeOpenings).toHaveLength(3);
    expect(modeOpenings.every(source => /旧|当前|之前/.test(source.note))).toBe(true);
  });

  it('林芝具名访谈保留用途与期待，地区入口不能冒充彩门村', () => {
    const value = cityAccessChanges.nyingchi;
    expect(value.transfer.text).toMatch(/普巴.*2021.*岗嘎站/);
    expect(value.life.text).toMatch(/普巴.*扎西.*用途与期待/);
    expect(value.life.text).toContain('不代表所有家庭已经获益');
    expect(value.caseText).toContain('不能把林芝城区参考点当成村址');
    expect(value.transfer.narration).toContain('从主通道交到地方车辆');
  });

  it('拉萨分别解释货场配送和2007年客运跨河接续，不用单期城界伪造城市前后扩张', () => {
    const value = cityAccessChanges.lhasa;
    expect(value.transfer.text).toMatch(/2007年4月30日柳梧大桥通车.*中心城区与柳梧新区/);
    expect(value.transfer.text).toMatch(/洛桑赤列.*村委会组织运输队.*站区跨河进城/);
    expect(value.transfer.text).toMatch(/拉萨西货场.*不同地点/);
    expect(value.life.narration).toContain('不能在客站复原货场作业');
    expect(value.life.text).toMatch(/2026.*吴昊.*食品、百货、医药/);
    expect(value.caseText).toContain('两个地点与两组材料');
    expect(value.caseText).toContain('洛桑赤列');
    expect(value.sourceIds).toEqual(expect.arrayContaining(['event-liuwu-opening-2007','access-liuwu-bridge-2019','access-lhasa-west-logistics-2026','city-local-osm-2026']));
    expect(value.scope).toMatch(/当前OSM.*不是2006或2007年街区复原/);
    expect(value.scope).toContain('拉萨西货场未在此客站窗口内');
  });

  it('阿里沿2004公路、2010通航与2017河岸建设解释同一地方，札达经营另作独立材料', () => {
    const value = cityAccessChanges.ngari;
    expect(value.caseText).toMatch(/2004年道路、2010年通航和2017年公共空间建设/);
    expect(value.transfer.text).toMatch(/昆莎机场与狮泉河城区是不同位置.*既有G219.*出行日核验/);
    expect(value.transfer.text).toMatch(/札达托林.*另一县域.*不混作.*机场进城/);
    expect(value.life.text).toMatch(/狮泉河.*2017年一河两岸.*2021采访.*绿化、文化休闲.*日常管护/);
    expect(value.life.text).toContain('不能压成机场单独造成生活变化');
    expect(value.life.text).not.toMatch(/金珠德吉|札布让/);
    expect(value.caseText).toMatch(/金珠德吉2006年开旅馆早于通航.*独立资料.*不作狮泉河案例/);
    expect(value.sourceIds).toEqual(expect.arrayContaining(['event-gunsa-g219-2004-2025','access-ngari-airport-2010','city-spatial-shiquanhe-banks-2017','access-zaburang-start-2020']));
    expect(value.scope).toMatch(/历史事件不生成旧城界.*不提供当前导航或地面时长/);
  });

  it('旅行观察问题继续追问地形、交接和文化用途，不给未经核验的直达承诺', () => {
    for (const value of Object.values(cityAccessChanges)) {
      expect(value.observationQuestions).toHaveLength(3);
      expect(value.observationQuestions.every(question => question.endsWith('？'))).toBe(true);
      expect(value.observationQuestions[0]).toMatch(/地形|山岭|跨河|地面/);
      expect(value.observationQuestions[1]).toMatch(/接驳|货场|接续/);
      expect(value.observationQuestions[2]).toMatch(/文化|历史|河岸建设.*生活变化/);
      expect(value.observationQuestions.join('')).not.toMatch(/保证直达|当天必达|无需预约/);
    }
  });
});
