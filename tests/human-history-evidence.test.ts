import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { humanHistoryEvidence, humanHistoryEvidenceForStep, humanHistoryEvidenceForPeriod, historyPeriodEvidenceIds, resolveHumanHistoryPeriodId } from '../src/data/humanHistoryEvidence';
import * as evidenceData from '../src/data/humanHistoryEvidence';
import { historyPeriods, sources } from '../src/data/curriculum';
import HumanHistoryEvidence from '../src/components/HumanHistoryEvidence';

const byId = (id: string) => {
  const item = humanHistoryEvidence.find(evidence => evidence.id === id);
  if (!item) throw new Error(`Missing evidence: ${id}`);
  return item;
};

describe('人文历史证据的范围与材料身份', () => {
  it('覆盖生活、景观、四个文化问题和四个历史问题，未知问题不借用不相关材料', () => {
    for (const step of ['E3', 'P3', 'K1', 'K2', 'K3', 'K4', 'H1', 'H2', 'H3', 'H4']) {
      const cards = humanHistoryEvidenceForStep(step);
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.stepIds.includes(step))).toBe(true);
    }
    expect(humanHistoryEvidenceForStep('C2')).toEqual([]);
    expect(humanHistoryEvidenceForStep('unknown')).toEqual([]);
  });

  it('每张卡都有直接来源、材料身份和支持范围，不附带推测的几何或坐标', () => {
    expect(new Set(humanHistoryEvidence.map(card => card.id)).size).toBe(humanHistoryEvidence.length);
    for (const card of humanHistoryEvidence) {
      for (const field of ['title', 'claim', 'materialType', 'location', 'time'] as const) expect(card[field].trim()).not.toBe('');
      for (const values of [card.whatItSupports, card.whatItDoesNotSupport, card.questions]) expect(values.length).toBeGreaterThan(0);
      expect(new URL(card.source.url).protocol).toBe('https:');
      expect(card.source.identity.trim()).not.toBe(''); expect(card.source.perspective.trim()).not.toBe('');
      expect(card).not.toHaveProperty('coordinates'); expect(card).not.toHaveProperty('geometry');
    }
  });

  it('高海拔活动不等于全年定居，3600 cal BP与2500米都保留地域范围', () => {
    const activity = byId('nwya-devu-activity'), settlement = byId('northeast-agropastoral-settlement'), altitude = byId('altitude-context-and-crops');
    expect(activity.claim).toContain('4万至3万');
    expect(activity.whatItDoesNotSupport.join()).toContain('全年永久定居');
    expect(settlement.location).toContain('东北部'); expect(settlement.claim).toContain('校正历年');
    expect(settlement.whatItDoesNotSupport.join()).toContain('所有地区同时');
    expect(altitude.claim).toContain('2500'); expect(altitude.claim).toContain('卡若约3000');
    expect(altitude.whatItDoesNotSupport.join()).toContain('产量');
  });

  it('交流节点、后来的画像与木经板各有身份，不补出精确行旅或经文', () => {
    const journey = byId('atisha-1042-place-sequence'), cover = byId('wooden-manuscript-cover'), portrait = byId('atisha-portrait-not-event-photo');
    expect(journey.claim).toMatch(/1042.*加德满都.*托林/);
    expect(journey.whatItDoesNotSupport.join()).toContain('精确山路');
    expect(cover.source.identity).toContain('1987.407.6'); expect(cover.whatItDoesNotSupport.join()).toContain('原书正文');
    expect(portrait.time).toContain('12世纪'); expect(portrait.time).toContain('1042');
    expect(portrait.whatItDoesNotSupport.join()).toContain('现场记录');
  });

  it('会盟事件、立碑与未知拓印日期分别阅读，不把网页路径年当作材料年代', () => {
    const event = byId('alliance-event-821-822'), stele = byId('stele-inscription-823'), rubbing = byId('rubbing-as-mediated-record');
    expect(event.time).toContain('821—822'); expect(stele.time).toContain('823');
    expect(stele.claim).toContain('藏汉'); expect(rubbing.time).toContain('未在该页给出');
    expect(rubbing.source.year).toBeUndefined(); expect(rubbing.source.identity).toContain('拓本');
    expect(rubbing.whatItDoesNotSupport.join()).toContain('823年自动写成拓本制作年');
  });

  it('1642与1645保留不同的行动地点，建筑分期不授权虚构逐年复原', () => {
    const political = byId('political-node-1642'), construction = byId('potala-building-1645'), phases = byId('potala-construction-phases');
    expect(political.location).toContain('日喀则'); expect(construction.location).toContain('拉萨红山');
    expect(political.source.identity).toContain('宗教机构');
    expect(phases.claim).toContain('1645—1648'); expect(phases.claim).toContain('1690—1694');
    expect(phases.whatItDoesNotSupport.join()).toContain('几何模型');
    expect(byId('potala-material-function').whatItDoesNotSupport.join()).toContain('全部厚墙都为御寒');
  });

  it('近现代节点保留独立日期、地点、文件身份和叙述主体', () => {
    const agreement = byId('agreement-beijing-1951'), change = byId('institutional-change-1959'), establishment = byId('autonomous-region-1965'), memo = byId('us-policy-memorandum-1951');
    expect(agreement.claim).toContain('1951年5月23日'); expect(agreement.location).toContain('北京'); expect(agreement.source.year).toBe(2011);
    expect(change.claim).toContain('1959年3月28日'); expect(change.source.perspective).toContain('并非国务院命令原件');
    expect(establishment.time).toContain('1965年9月'); expect(establishment.location).toContain('拉萨');
    expect(memo.time).toContain('1951年9月6日'); expect(memo.source.perspective).toContain('美国官员');
    expect(memo.whatItDoesNotSupport.join()).toContain('不是已执行行动');
  });

  it('元印保留复制件争议，封授年与现存对象的制作年不混同', () => {
    const seal = byId('mongol-preceptor-seal-identity');
    expect(seal.claim).toContain('复制件尚存争议'); expect(seal.time).toContain('不是现存木印的确定制作年');
    expect(seal.source.identity).toContain('展览作品'); expect(seal.location).toContain('未说明');
    expect(seal.whatItDoesNotSupport.join()).toContain('深圳博物馆藏'); expect(seal.source.year).toBeUndefined();
  });

  it('清代缂丝是有编号的文本载体，1792不充当精确缂织年或1793章程原件', () => {
    const textile = byId('qing-lama-shuo-textile');
    expect(textile.source.identity).toContain('故00072800'); expect(textile.time).toContain('文本写作：1792');
    expect(textile.time).toContain('未给出独立确认的精确缂织年份'); expect(textile.materialType).toContain('缂丝');
    expect(textile.whatItDoesNotSupport.join()).toContain('章程二十九条》原件'); expect(textile.source.perspective).toContain('皇帝的政策表达');
    expect(textile.source.year).toBeUndefined();
  });

  it('1904年照片保留军队记录视角，不把馆方事件日期当摄影日期', () => {
    const photo = byId('gyantse-1904-military-photograph');
    expect(photo.source.identity).toContain('1953-06-30-2-58'); expect(photo.source.perspective).toContain('英军军官');
    expect(photo.time).toContain('照片拍摄年：1904'); expect(photo.time).toContain('不能自动当作照片拍摄日');
    expect(photo.whatItDoesNotSupport.join()).toContain('当地居民'); expect(photo.whatItDoesNotSupport.join()).toContain('正在对外展出');
    expect(photo.source.year).toBeUndefined();
  });

  it('14世纪人物专题保留后世研究身份、具体节点及未核到的原件范围', () => {
    const profile = byId('phagmodru-jangchub-1358-profile');
    expect(profile.materialType).toContain('后世研究'); expect(profile.claim).toContain('专题记述1358');
    expect(profile.source.year).toBe(2023); expect(profile.time).toContain('网页发布：2023'); expect(profile.time).toContain('实际写作年');
    expect(profile.time).toContain('未在该页给出'); expect(profile.source.identity).toContain('张云主编'); expect(profile.source.identity).toContain('未列单篇作者');
    expect(profile.source.identity).toContain('完整检索缓存正文'); expect(profile.source.identity).toContain('原站直连未成功');
    expect(profile.source.perspective).toContain('制度联系'); expect(profile.whatItDoesNotSupport.join()).toContain('不是1358年诏书原件');
    expect(profile.whatItDoesNotSupport.join()).toContain('所有地区'); expect(profile.location).toContain('未提供');
  });
});

describe('H2 时期与材料相互对应', () => {
  it('九个时期各有明确映射，所有映射都指向可打开的本问题材料', () => {
    expect(Object.keys(historyPeriodEvidenceIds)).toEqual(historyPeriods.map(period => period.id));
    for (const period of historyPeriods) {
      const ids = historyPeriodEvidenceIds[period.id as keyof typeof historyPeriodEvidenceIds];
      const cards = humanHistoryEvidenceForStep('H2', period.id);
      expect(cards.map(card => card.id)).toEqual(ids);
      expect(cards.every(card => card.stepIds.includes('H2'))).toBe(true);
      expect(cards.length).toBeGreaterThan(0);
    }
  });

  it('切换时期只取相应材料，14—17世纪仅提供已核读的人物专题', () => {
    expect(humanHistoryEvidenceForPeriod('prehistoric').map(card => card.id)).toContain('nwya-devu-activity');
    expect(humanHistoryEvidenceForPeriod('empire').map(card => card.id)).toContain('alliance-event-821-822');
    expect(humanHistoryEvidenceForPeriod('revival').map(card => card.id)).toContain('atisha-1042-place-sequence');
    expect(humanHistoryEvidenceForPeriod('yuan').map(card => card.id)).toEqual(['mongol-preceptor-seal-identity']);
    expect(humanHistoryEvidenceForPeriod('ganden').map(card => card.id)).toEqual(['political-node-1642', 'potala-building-1645']);
    expect(humanHistoryEvidenceForPeriod('qing').map(card => card.id)).toEqual(['qing-lama-shuo-textile']);
    expect(humanHistoryEvidenceForPeriod('early-modern').map(card => card.id)).toEqual(['gyantse-1904-military-photograph']);
    expect(humanHistoryEvidenceForPeriod('contemporary').map(card => card.id)).toContain('agreement-beijing-1951');
    expect(humanHistoryEvidenceForStep('H2', 'local').map(card => card.id)).toEqual(['phagmodru-jangchub-1358-profile']);
    expect(humanHistoryEvidenceForStep('H2', 'yuan').some(card => card.id.includes('1951'))).toBe(false);
  });

  it('缺省与未知时期和H2场景采用同一默认值，其他问题保持自己的材料', () => {
    expect(resolveHumanHistoryPeriodId()).toBe('empire'); expect(resolveHumanHistoryPeriodId('unknown')).toBe('empire');
    expect(resolveHumanHistoryPeriodId('local')).toBe('local');
    expect(humanHistoryEvidenceForStep('H2')).toEqual(humanHistoryEvidenceForStep('H2', 'empire'));
    expect(humanHistoryEvidenceForStep('H2', 'history-periods')).toEqual(humanHistoryEvidenceForStep('H2', 'empire'));
    expect(humanHistoryEvidenceForStep('K1', 'yuan')).toEqual(humanHistoryEvidenceForStep('K1'));
  });

  it('组件随时期显示对应材料与出处，不把后台全部材料列到每个时期', () => {
    const render = (periodId: string) => renderToStaticMarkup(createElement(HumanHistoryEvidence, { stepId: 'H2', periodId, onInspect: () => {} }));
    const yuan = render('yuan'), qing = render('qing'), earlyModern = render('early-modern');
    expect(yuan).toContain('13—14世纪'); expect(yuan).toContain('复制件尚存争议'); expect(yuan).not.toContain('1951年的协议');
    expect(qing).toContain('18—19世纪'); expect(qing).toContain('故00072800'); expect(qing).not.toContain('value="mongol-preceptor-seal-identity"');
    expect(earlyModern).toContain('20世纪前期'); expect(earlyModern).toContain('英军军官'); expect(earlyModern).toContain('collection.nam.ac.uk');
  });

  it('14—17世纪的实际页面显示研究身份，不将专题发布年当历史事件年', () => {
    const html = renderToStaticMarkup(createElement(HumanHistoryEvidence, { stepId: 'H2', periodId: 'local', onInspect: () => {} }));
    expect(html).toContain('14—17世纪'); expect(html).toContain('后世研究'); expect(html).toContain('历史节点：1358'); expect(html).toContain('网页发布：2023');
    expect(html).toContain('完整检索缓存正文'); expect(html).not.toContain('1951年的协议'); expect(html).not.toContain('1042年的人物行旅');
  });

  it('按当前年代或材料环节默认选中对应卡，保留其他卡对读且未知偏好不造成空白', () => {
    const selectedOptions = (stepId: string, preferredEvidenceId: string) => {
      const html = renderToStaticMarkup(createElement(HumanHistoryEvidence, { stepId, preferredEvidenceId, onInspect: () => {} }));
      const select = html.match(/<select\b[^>]*aria-label="选择真实材料"[^>]*>([\s\S]*?)<\/select>/);
      if (!select) throw new Error(`Missing material selector for ${stepId}/${preferredEvidenceId}`);
      const options = Array.from(select[1].matchAll(/<option\b([^>]*)>[\s\S]*?<\/option>/g)).map(match => ({
        value: match[1].match(/\bvalue="([^"]*)"/)?.[1],
        selected: /\bselected(?:\s|=|$)/.test(match[1]),
      }));
      return { values: options.map(option => option.value), selected: options.filter(option => option.selected).map(option => option.value) };
    };

    for (const [stepId, preferred] of [
      ['H4', 'agreement-beijing-1951'],
      ['H4', 'institutional-change-1959'],
      ['H4', 'autonomous-region-1965'],
      ['H3', 'stele-inscription-823'],
      ['H3', 'rubbing-as-mediated-record'],
    ]) {
      const actual = selectedOptions(stepId, preferred);
      // Matching text elsewhere is insufficient: the select must mark this option selected.
      expect(actual.selected).toEqual([preferred]);
      expect(actual.values).toEqual(humanHistoryEvidenceForStep(stepId).map(card => card.id));
      expect(actual.values.filter(value => value !== preferred).length).toBeGreaterThan(1);
    }
    for (const preferred of ['unknown-evidence', 'stele-inscription-823']) {
      const actual = selectedOptions('H4', preferred), records = humanHistoryEvidenceForStep('H4');
      expect(actual.selected).toEqual([records[0].id]);
      expect(actual.values).toEqual(records.map(card => card.id));
      expect(actual.values).not.toContain(preferred);
    }
  });

  it('将来材料缺失时仍显示缺口和本时期背景来源，不静默借用其他时期', () => {
    const retrieval = vi.spyOn(evidenceData, 'humanHistoryEvidenceForStep').mockReturnValue([]);
    try {
      const html = renderToStaticMarkup(createElement(HumanHistoryEvidence, { stepId: 'H2', periodId: 'local', onInspect: () => {} }));
      expect(html).toContain('14—17世纪'); expect(html).toContain('没有已核对的专题材料卡'); expect(html).toContain('不能用其他时期的材料代替');
      expect(html).not.toContain('<select'); expect(html).not.toContain('1951年的协议'); expect(html).not.toContain('1042年的人物行旅');
      const period = historyPeriods.find(item => item.id === 'local')!;
      for (const id of period.sourceIds) expect(html).toContain(sources.find(source => source.id === id)!.url);
      expect(renderToStaticMarkup(createElement(HumanHistoryEvidence, { stepId: 'C2', onInspect: () => {} }))).toBe('');
    } finally { retrieval.mockRestore(); }
  });
});
