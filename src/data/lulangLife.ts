import type {PilotView} from './routePilot';

export const lulangCookingSource={title:'2022年地方标准公开解读',date:'2022-07-04',url:'https://lz.xzdw.gov.cn/zdgz_762/202207/t20220704_258968.html'};
export const lulangLifePhotos={
 town:{id:'town',title:'河流、道路与聚落',date:'2024-09-22',author:'Zhangmoon618',src:'/assets/routes/g318/lulang-life/town-20240922.jpg',source:'https://commons.wikimedia.org/wiki/File:Lulang_Town.jpg',original:'https://upload.wikimedia.org/wikipedia/commons/f/f9/Lulang_Town.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',coordinate:[94.729430,29.730239],scope:'真实航拍照片；不是街景漫游，也不是2017年的空间复原。',features:[{title:'河流',x:51,y:65,detail:'河流穿过谷地，房屋与道路分布在两侧。'},{title:'道路',x:72,y:70,detail:'道路顺着谷地延伸，支路与跨河连接可在照片中辨认。'},{title:'房屋',x:43,y:47,detail:'可辨认建筑群和开敞空间；照片本身不能确认每栋建筑的经营用途。'}]},
 daily:{id:'daily',title:'街边的日常一刻',date:'2008-09-18',author:'reurinkjan',src:'/assets/routes/g318/lulang-life/street-life-20080918.jpg',source:'https://commons.wikimedia.org/wiki/File:Pocket_billiards,_%E0%BD%A6%E0%BE%92%E0%BE%B2%E0%BD%BC%E0%BD%98%E0%BC%8B%E0%BD%A6%E0%BE%9F%E0%BD%BA%E0%BD%82%E0%BD%A6%E0%BC%8B%E0%BD%A6%E0%BE%A4%E0%BD%BC%E0%BC%8B%E0%BD%A3%E0%BD%BC%E0%BC%8D.jpg',original:'https://upload.wikimedia.org/wikipedia/commons/9/9d/Pocket_billiards%2C_%E0%BD%A6%E0%BE%92%E0%BE%B2%E0%BD%BC%E0%BD%98%E0%BC%8B%E0%BD%A6%E0%BE%9F%E0%BD%BA%E0%BD%82%E0%BD%A6%E0%BC%8B%E0%BD%A6%E0%BE%A4%E0%BD%BC%E0%BC%8B%E0%BD%A3%E0%BD%BC%E0%BC%8D.jpg',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/',coordinate:[94.726722,29.733056],scope:'2008年的生活记录，不能证明2017年供货制度或后来的经营成效；不推断照片中人的职业、身份。',features:[{title:'临街门面',x:36,y:31,detail:'柜中物品、门窗与屋檐构成临街界面；不推断店铺名称和当下营业情况。'},{title:'门前活动',x:47,y:66,detail:'桌球活动发生在门前空间，呈现当时日常活动的一刻。'},{title:'相邻空间',x:78,y:45,detail:'停留、交谈和门前活动在相邻空间中发生；不把人物标为商户或游客。'}]},
} as const;
export const lulangCookingSteps=[
 {title:'初加工',short:'备料与焯水',detail:'按2022年公开解读，以鲜鸡初加工、焯水作为前段。图中器具和食材是工序插画。'},
 {title:'炒制',short:'炒锅处理',detail:'原料经炒制，再接入后续煮制。不是把所有过程都画成在石锅里完成。'},
 {title:'煮熟',short:'压力锅煮制',detail:'公开解读记有转入高压锅煮熟的环节。此处只说明工序，不提供家庭操作或时间温度指导。'},
 {title:'石锅煨煮',short:'接到餐饮服务',detail:'煮熟后再移入石锅煨煮。制作之后还有订餐、明码标价和接待等服务环节。'},
] as const;
export const lulangCookingIllustration={src:'/assets/routes/g318/lulang-life/cooking-process-illustration.png',kind:'AI生成工序插画，非现场影像',source:lulangCookingSource.url};
export type LulangLifePhase='making'|'supply'|'service';
export const lulangLifePhases=[{id:'making',title:'看制作接续'},{id:'supply',title:'比较供货条件'},{id:'service',title:'看经营与接待'}] as const;
export function lulangNarratedLifePhase(text:string,textProgress:number):LulangLifePhase{
 const at=Math.max(0,Math.min(1,textProgress))*text.length;
 if(at>=text.indexOf('恢复联系'))return 'making';
 if(at>=text.indexOf('移去供货条件'))return 'supply';
 if(at>=text.indexOf('商户诚信管理'))return 'service';
 return at>=text.indexOf('供货组织')?'supply':'making';
}
/** One presentation choice for both the scene and the side reading. */
export function lulangLifePhase(view:PilotView):LulangLifePhase{
 if(view.cultureSupply===false)return 'supply';
 return view.lifePhase??((view.cultureProgress??0)<.25?'making':(view.cultureProgress??0)<.5?'supply':'service');
}
export function lulangLifeRecord(view:PilotView){
 const phase=lulangLifePhase(view);
 if(phase==='supply')return {date:'2017年度记录',text:'引进土鸡养殖企业，组织统一供应。材料未给出供应商位置或运输线路。',url:'https://www.linzhi.gov.cn/linzhi/zwgk/201809/3262f7e1fea64f5bb86efe6da8abe370.shtml'};
 if(phase==='service')return {date:'2017年度记录 · 2022公开解读',text:'2017年记有商户诚信经营承诺；2022年解读说明订餐、接待、明码标价等服务要求。两份材料不能证明每家店的实际成效。',url:lulangCookingSource.url};
 return {date:'2022年公开解读',text:`当前观察：${lulangCookingSteps[lulangCookingState(view).step].title}。初加工、炒制、煮熟后，才转入石锅煨煮。`,url:lulangCookingSource.url};
}
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
export function lulangCookingProgress(text:string,progress:number){
 const at=clamp(progress)*text.length,anchors=['初加工','炒制','煮熟','石锅煨煮','不是现场录像'].map(t=>text.indexOf(t));
 if(anchors.some(n=>n<0))return 0;
 for(let i=0;i<4;i++)if(at<anchors[i+1])return clamp((i+Math.max(0,(at-anchors[i])/(anchors[i+1]-anchors[i])))/4);
 return 1;
}
export function lulangCookingState(view:PilotView){
 const requested=clamp(view.cookingProgress??0),supply=view.cultureSupply!==false,progress=supply?requested:0;
 return {requested,supply,progress,step:Math.min(3,Math.floor(progress*4)),ready:supply&&progress>=.75};
}
export function lulangMediaFeedback(view:PilotView){
 if(view.mode!=='place'||!view.placeMedia||view.placeMedia==='map')return;
 if(view.placeMedia==='process'){
  const state=lulangCookingState(view),phase=lulangLifePhase(view);
  if(!state.supply)return '对照假设：下一锅的原料未接入，备料等待。已做好的菜不会凭空消失；不模拟库存耗尽时间，也不表示真实停业。';
  if(phase==='supply')return '供货先接到备料，再接入制作。2017年材料支持统一供应的组织记录；画面不代表供应商的位置、运量或真实运输路线。';
  if(phase==='service')return '把制作接到服务：确认订餐、明示菜价、安排接待。2017诚信经营记录与2022服务要求分别注明日期，不把规则当成已经实现的经营效果。';
  return lulangCookingSteps[state.step].detail;
 }
 const photo=lulangLifePhotos[view.placeMedia],focus=Math.trunc(view.photoFocus??0);
 return focus>0?photo.features[Math.min(2,focus-1)].detail:photo.scope;
}
