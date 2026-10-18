export type LulangLens='landscape'|'life'|'culture';
import type {PilotView} from './routePilot';
export type LulangServiceFilter='all'|'food'|'lodging';
export const lulangLenses=[{id:'landscape' as const,title:'风景与河谷'},{id:'life' as const,title:'道路与生活'},{id:'culture' as const,title:'地方风味与经营'}];
export const lulangReadingWindow=[94.715,29.705,94.75,29.755] as const;
export const lulangRiverId='way/26406905';
export const lulangWoodId='way/969705523';
export const lulangOperationSource={title:'2017年度管委会材料：石锅鸡制作、供货与诚信经营记录',url:'https://www.linzhi.gov.cn/linzhi/zwgk/201809/3262f7e1fea64f5bb86efe6da8abe370.shtml',date:'2017年度材料，2018-09-10发布',scope:'当年制度和经营组织记录，不证明今天的经营状态，也不能定位当年商户。'};
export function lulangServiceFeedback(view:PilotView){
 const filter=view.serviceFilter??'all',culture=view.placeLens==='culture';
 if(culture&&filter==='lodging')return '当前只看淡蓝色住宿记录，用来和餐饮分布对照。2017年的石锅鸡材料解释餐饮组织，不证明这些住宿点当年的经营。';
 if(culture&&filter==='food')return '当前突出橙色餐饮记录。2017年材料说明地方风味还依赖制作、供货与经营组织；现状店铺不等于当年参与者。';
 if(culture)return '同时对照橙色餐饮与淡蓝色住宿记录。2017年材料解释地方风味的经营组织；现状点位不定位当年商户。';
 if(filter==='lodging')return '当前只看淡蓝色住宿记录。与餐饮位置和道路、建筑对照，查看服务怎样分布在谷地；点位不代表今天营业。';
 if(filter==='food')return '当前只看橙色餐饮记录。比较它们与道路和建筑的位置；未推断每家的经营状态或实际入口。';
 return '橙色为归档餐饮、淡蓝色为归档住宿；与现有道路和建筑对照，查看服务怎样分布在谷地。点位不代表今天营业。';
}
