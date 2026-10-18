import {travelAccessSegments} from '../data/travelAccessSegments';
import {sanitizeTravelAccessBook,travelAccessOutcomes,type TravelAccessVerificationBook} from './travelAccessVerification';

/** Personal dated statements travel with the exported plan, separately from
 * sourced road geography and from the user's chosen observation stops. */
export function travelAccessRecordMarkdown(value:TravelAccessVerificationBook|undefined):string[]{
 const book=sanitizeTravelAccessBook(value);
 const segments=Object.values(travelAccessSegments).flat().filter(segment=>book[segment.id]);
 if(!segments.length)return [];
 return ['## 本人核验记录（非平台核实）','','以下是本人保留的日期适用记录，不证明后续日期仍可用，也不自动构成旅行安排。','',...segments.flatMap(segment=>{
  const check=book[segment.id];
  return [`### ${segment.from} → ${segment.to}`,'',`道路资料：${segment.road}`,`适用出行日期：${check.travelDate}；实际核验日期：${check.checkedOn}`,`本人记录：${travelAccessOutcomes.find(item=>item.id===check.outcome)?.label.replace(/^本人记录：/,'')??'仍待确认'}`,`核验出处：${check.source}`,...(check.sourceUrl?[`出处链接：<${check.sourceUrl}>`]:[]),`具体核实与待确认：${check.notes||'未补充'}`,'',...segment.sources.map(source=>`- 有日期的背景材料：[${source.title}](${source.url})（${source.publishedOn}）`),''];
 })];
}
