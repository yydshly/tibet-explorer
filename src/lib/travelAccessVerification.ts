/** Deliberately independent of scene/data imports: persisted personal records
 * do not pull the curriculum and geography into store initialization. */
export const travelAccessSegmentIds=[
 'mainling-nyingchi-s4','nyingchi-sejila-lulang','lulang-local-services',
 'lhasa-station-liuwu-city','lhasa-jokhang-approach',
 'gunsa-shiquanhe-road','shiquanhe-riverside-observation',
] as const;
export const travelAccessOutcomes=[
 {id:'needs-confirmation',label:'仍待确认'},
 {id:'reported-available',label:'本人记录：该日可用'},
 {id:'reported-unavailable',label:'本人记录：该日不可用'},
] as const;
export type TravelAccessOutcome=typeof travelAccessOutcomes[number]['id'];
export interface TravelAccessCheck {travelDate:string;checkedOn:string;source:string;sourceUrl?:string;outcome:TravelAccessOutcome;notes:string}
export type TravelAccessVerificationBook=Record<string,TravelAccessCheck>;
/** Form drafts allow empty fields, never pass straight to persistent storage. */
export type TravelAccessDrafts=Record<string,TravelAccessCheck>;
const text=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
export function validTravelAccessDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T00:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validTravelAccessSourceUrl(value:string):boolean {
 if(!value.trim())return true;
 try {const url=new URL(value);return ['http:','https:'].includes(url.protocol);}catch{return false;}
}
/** A personal dated note is not system verification. Travel may be in the
 * future; a claimed actual check date cannot be after the supplied today. */
export function travelAccessCheckError(value:TravelAccessCheck,today?:string):string|undefined {
 if(!validTravelAccessDate(value.travelDate))return '请填写这条记录适用的出行日期。';
 if(!validTravelAccessDate(value.checkedOn))return '请填写实际核验日期。';
 if(today&&value.checkedOn>today)return '核验日期不能晚于今天。';
 if(typeof value.source!=='string'||!value.source.trim())return '请注明核验出处，例如有日期的公告或实际联系记录。';
 if(!validTravelAccessSourceUrl(value.sourceUrl??''))return '出处链接请使用完整的 http 或 https 地址，也可以留空。';
 if(!travelAccessOutcomes.some(item=>item.id===value.outcome))return '请选择记录结论。';
 return;
}
export function sanitizeTravelAccessBook(value:unknown):TravelAccessVerificationBook {
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const input=value as Record<string,unknown>,book:TravelAccessVerificationBook={};
 for(const id of travelAccessSegmentIds){
  const raw=input[id];if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const record=raw as Record<string,unknown>;
  const entry:TravelAccessCheck={travelDate:text(record.travelDate,32),checkedOn:text(record.checkedOn,32),source:text(record.source,600),sourceUrl:text(record.sourceUrl,1200),outcome:record.outcome as TravelAccessOutcome,notes:text(record.notes,800)};
  if(!travelAccessCheckError(entry))book[id]=entry;
 }
 return book;
}
/** Preserve records for the other places when explicitly saving/removing one. */
export function updateTravelAccessCheck(book:TravelAccessVerificationBook,segmentId:string,check:TravelAccessCheck|undefined):TravelAccessVerificationBook {
 const next=sanitizeTravelAccessBook(book);
 if(!travelAccessSegmentIds.some(id=>id===segmentId))return next;
 if(check&&!travelAccessCheckError(check))next[segmentId]={...check,source:check.source.trim().slice(0,600),sourceUrl:check.sourceUrl?.trim().slice(0,1200)??'',notes:check.notes.trim().slice(0,800)};
 else if(!check)delete next[segmentId];
 return next;
}
