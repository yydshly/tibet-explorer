import {afterEach,describe,expect,it,vi} from 'vitest';
import {emptyExploration,parseExploration,readExploration,STORAGE_KEY,writeExploration} from '../src/lib/store';
import {travelAccessSegmentIds,updateTravelAccessCheck,type TravelAccessCheck} from '../src/lib/travelAccessVerification';

afterEach(()=>vi.unstubAllGlobals());

const check:TravelAccessCheck={travelDate:'2026-10-30',checkedOn:'2026-10-16',source:'本人记录的有日期公告与实际联系',sourceUrl:'https://example.org/dated-personal-record',outcome:'needs-confirmation',notes:'接驳集合位置、到达和访问分别确认。'};
function storage(){
 const values=new Map<string,string>();
 vi.stubGlobal('localStorage',{setItem:(key:string,value:string)=>values.set(key,value),getItem:(key:string)=>values.get(key)??null});
 return values;
}
const legacy=()=>({...emptyExploration(),route:['nyingchi-lulang','lhasa-river','shiquanhe-life'],note:'旧的总观察笔记',stopNotes:{'nyingchi-lulang':'先比较G318与河谷。','lhasa-river':'客站与跨河接续。','shiquanhe-life':'桥、河岸与公共用途。'},travelDate:'2026-10-30',transport:'混合交通'});

describe('dated personal access records survive Exploration persistence',()=>{
 it('saves all seven segment records across successive read/write cycles without replacing older route or notes',()=>{
  const values=storage(),before=legacy();expect(writeExploration(before)).toBe(true);
  for(const [index,id]of travelAccessSegmentIds.entries()){
   const current=readExploration(),record={...check,notes:`第${index+1}段个人记录。`,outcome:index%2?'reported-unavailable' as const:'needs-confirmation' as const};
   expect(writeExploration({...current,accessVerifications:updateTravelAccessCheck(current.accessVerifications??{},id,record)})).toBe(true);
   const restored=readExploration();
   expect(restored.accessVerifications?.[id]).toEqual(record);
   expect(Object.keys(restored.accessVerifications??{})).toHaveLength(index+1);
   expect(restored.route).toEqual(before.route);expect(restored.note).toBe(before.note);expect(restored.stopNotes).toEqual(before.stopNotes);
   expect(restored.travelDate).toBe(before.travelDate);expect(restored.transport).toBe(before.transport);
  }
  expect(JSON.parse(values.get(STORAGE_KEY)!).accessVerifications).toEqual(readExploration().accessVerifications);
 });
 it('imports the older save format without inventing access verification or losing its existing observations',()=>{
  const before=legacy(),restored=parseExploration(JSON.stringify(before));
  expect(restored.accessVerifications).toBeUndefined();
  expect(restored).toEqual(before);
 });
 it.each([
  ['invalid travel day',{travelDate:'2026-02-29'}],
  ['invalid actual check day',{checkedOn:'2026-04-31'}],
  ['malformed actual check date',{checkedOn:'2026-10-16extra'}],
  ['executable source URL',{sourceUrl:'javascript:alert(1)'}],
  ['executable source URL with whitespace/case',{sourceUrl:'  JaVaScRiPt:alert(1)  '}],
  ['local file source URL',{sourceUrl:'file:///private-record'}],
  ['invented platform verification outcome',{outcome:'system-verified'}],
 ])('rejects %s while preserving other valid records and pre-existing notes',(_name,invalid)=>{
  storage();
  const before=legacy(),input={...before,accessVerifications:{'mainling-nyingchi-s4':{...check,...invalid},'gunsa-shiquanhe-road':check}};
  const restored=parseExploration(JSON.stringify(input));
  expect(restored.accessVerifications).toEqual({'gunsa-shiquanhe-road':check});
  expect(writeExploration(restored)).toBe(true);expect(readExploration()).toEqual(restored);
  expect(restored.route).toEqual(before.route);expect(restored.note).toBe(before.note);expect(restored.stopNotes).toEqual(before.stopNotes);
 });
 it('drops unregistered or prototype record IDs, and removing one saved entry preserves the other places',()=>{
  storage();
  const imported=JSON.parse(JSON.stringify({'lulang-local-services':check,'gunsa-shiquanhe-road':check,unknown:check,constructor:check}));
  Object.defineProperty(imported,'__proto__',{value:check,enumerable:true});
  const restored=parseExploration(JSON.stringify({...legacy(),accessVerifications:imported}));
  expect(Object.keys(restored.accessVerifications??{})).toEqual(['lulang-local-services','gunsa-shiquanhe-road']);
  const next={...restored,accessVerifications:updateTravelAccessCheck(restored.accessVerifications!,'lulang-local-services',undefined)};
  expect(writeExploration(next)).toBe(true);
  expect(readExploration().accessVerifications).toEqual({'gunsa-shiquanhe-road':check});
  expect(restored.accessVerifications?.['lulang-local-services']).toEqual(check);
  expect(readExploration().stopNotes).toEqual(legacy().stopNotes);
  expect(Object.getPrototypeOf(readExploration().accessVerifications)).toBe(Object.prototype);
 });
});
