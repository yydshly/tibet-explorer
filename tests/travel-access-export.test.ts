import {afterEach,describe,expect,it,vi} from 'vitest';
import {travelAccessRecordMarkdown} from '../src/lib/travelAccessExport';
import {travelAccessSegments} from '../src/data/travelAccessSegments';
import {sanitizeTravelAccessBook,type TravelAccessCheck} from '../src/lib/travelAccessVerification';

afterEach(()=>vi.unstubAllGlobals());
const check:TravelAccessCheck={travelDate:'2026-10-30',checkedOn:'2026-10-16',source:'本人于核验日查阅公告并联系接待方',sourceUrl:'https://example.org/my-dated-access-record',outcome:'needs-confirmation',notes:'出站后的集合位置已询问，最后访问入口仍需确认。'};

describe('travel export distinguishes personal checks from geography and itinerary',()=>{
 it('includes both dates, personal conclusion, provenance, notes and dated background for the actual segment',()=>{
  const segment=travelAccessSegments.nyingchi[0],markdown=travelAccessRecordMarkdown({[segment.id]:check}).join('\n');
  expect(markdown).toContain(`### ${segment.from} → ${segment.to}`);
  expect(markdown).toContain(`道路资料：${segment.road}`);
  expect(markdown).toContain(`适用出行日期：${check.travelDate}；实际核验日期：${check.checkedOn}`);
  expect(markdown).toContain('本人记录：仍待确认');
  expect(markdown).toContain(`核验出处：${check.source}`);expect(markdown).toContain(`出处链接：<${check.sourceUrl}>`);
  expect(markdown).toContain(`具体核实与待确认：${check.notes}`);
  for(const source of segment.sources)expect(markdown).toContain(`有日期的背景材料：[${source.title}](${source.url})（${source.publishedOn}）`);
  expect(markdown).toContain('本人核验记录（非平台核实）');
  expect(markdown).toContain('不证明后续日期仍可用，也不自动构成旅行安排');
  expect(markdown).not.toContain('平台已核实');
  expect(markdown).not.toContain('系统已核实');
 });
 it.each([
  ['reported-available','本人记录：该日可用'],
  ['reported-unavailable','本人记录：该日不可用'],
 ] as const)('retains %s as a dated personal statement, with no platform promotion', (outcome,label)=>{
  const markdown=travelAccessRecordMarkdown({'gunsa-shiquanhe-road':{...check,outcome}}).join('\n');
  expect(markdown).toContain(label);expect(markdown).not.toContain('本人记录：本人记录：');expect(markdown).toContain(check.travelDate);expect(markdown).toContain(check.checkedOn);
  expect(markdown).toContain('非平台核实');expect(markdown).toContain('不证明后续日期仍可用');
 });
 it('omits the complete record section when nothing valid is saved',()=>{
  expect(travelAccessRecordMarkdown(undefined)).toEqual([]);
  expect(travelAccessRecordMarkdown({})).toEqual([]);
  expect(travelAccessRecordMarkdown({unknown:check})).toEqual([]);
  expect(travelAccessRecordMarkdown({'gunsa-shiquanhe-road':{...check,sourceUrl:'javascript:alert(1)'}})).toEqual([]);
 });
 it('never exports a rejected executable URL record, including its notes, beside another valid personal record',()=>{
  const rejected={...check,source:'不应导出的出处',sourceUrl:'  JaVaScRiPt:alert(1)  ',notes:'不应导出的私人备注'};
  const input={'mainling-nyingchi-s4':rejected,'gunsa-shiquanhe-road':check};
  expect(sanitizeTravelAccessBook(input)).toEqual({'gunsa-shiquanhe-road':check});
  const markdown=travelAccessRecordMarkdown(input).join('\n'),invalidSegment=travelAccessSegments.nyingchi[0];
  expect(markdown).toContain(travelAccessSegments.ngari[0].from);
  expect(markdown).not.toContain(`### ${invalidSegment.from} → ${invalidSegment.to}`);
  expect(markdown).not.toContain(rejected.source);expect(markdown).not.toContain(rejected.notes);expect(markdown).not.toMatch(/javascript:/i);
 });
 it('exports an empty optional URL and notes honestly, without inventing a source link or an inspection result',()=>{
  const markdown=travelAccessRecordMarkdown({'lulang-local-services':{...check,sourceUrl:'',notes:''}}).join('\n');
  expect(markdown).toContain(`核验出处：${check.source}`);
  expect(markdown).not.toContain('出处链接：');
  expect(markdown).toContain('具体核实与待确认：未补充');expect(markdown).toContain('本人记录：仍待确认');
 });
 it('leaves records and selected stops/routes unchanged and performs no automatic persistence',()=>{
  const stored=JSON.stringify({route:['lhasa-river'],stopNotes:{'lhasa-river':'保留原问题'},note:'保留总笔记'});
  const setItem=vi.fn(),getItem=vi.fn(()=>stored);
  vi.stubGlobal('localStorage',{setItem,getItem});
  const record=Object.freeze({...check}),book=Object.freeze({'mainling-nyingchi-s4':record}),before=JSON.stringify(book);
  const lines=travelAccessRecordMarkdown(book);
  expect(lines.length).toBeGreaterThan(0);expect(JSON.stringify(book)).toBe(before);
  expect(setItem).not.toHaveBeenCalled();expect(getItem).not.toHaveBeenCalled();
  expect(stored).toBe(JSON.stringify({route:['lhasa-river'],stopNotes:{'lhasa-river':'保留原问题'},note:'保留总笔记'}));
  expect(lines.join('\n')).not.toContain('已保存站点');expect(lines.join('\n')).not.toContain('已生成路线');
 });
});
