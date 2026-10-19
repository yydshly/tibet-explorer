import type {PilotView} from './routePilot';

/** Links to the publisher-controlled player only; no downloaded/re-edited copies. */
export const lulangFootage=[
 {id:'dining-2023',bvid:'BV1Rc41177Jx',title:'到店用餐：石锅、餐桌与就餐说明',publisher:'惠泽夫妇深度自驾游',published:'2023-03-16',duration:324,source:'https://www.bilibili.com/video/BV1Rc41177Jx/',observed:'已核对开头的餐桌加热石锅、餐具与作者就餐说明。',scope:'作者标注在鲁朗用餐；拍摄日期、店铺坐标未独立核实。不是厨房全流程，也不是供货记录。',rights:'作者注明禁止未经授权转载；仅使用平台提供的原播放器，不下载、改剪或再分发。'},
 {id:'banquet-2026',bvid:'BV1RSJi6VEL5',title:'集体接待：鲁朗石锅宴发布记录',publisher:'西藏日报',published:'2026-10-17',duration:16,source:'https://www.bilibili.com/video/BV1RSJi6VEL5/',observed:'可对照集体围桌、石锅与就餐活动的现场画面。',scope:'发布于2026年，具体拍摄日期未核实；活动场面不代表普通餐厅的日常经营，也不能证明2017年制度成效。',rights:'原发布账号与原播放器保留；未获得下载、改剪或再分发许可。'},
] as const;
export type LulangFootageId=typeof lulangFootage[number]['id'];
export const lulangPlayerDocumentation='https://player.bilibili.com/';
export function selectedLulangFootage(view:Pick<PilotView,'footageId'>){return lulangFootage.find(f=>f.id===view.footageId)??lulangFootage[0];}
export function lulangFootagePlayer(id:LulangFootageId){
 const video=lulangFootage.find(f=>f.id===id)??lulangFootage[0];
 return `https://player.bilibili.com/player.html?bvid=${video.bvid}&autoplay=0&muted=0&danmaku=0&refer=0`;
}
export function lulangFootageFeedback(view:Pick<PilotView,'footageId'>){
 const video=selectedLulangFootage(view);
 return `原讲述已暂停。${video.id==='dining-2023'?'对照石锅、餐具和就餐场面；不是厨房或供货记录。':'对照集体围桌与接待场面；不是普通餐厅的日常经营记录。'}看完可接回原句。`;
}
