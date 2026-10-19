import type {PilotView} from './routePilot';
import type {LulangService} from '../scene/lulangPlaceData';

export const lulangCultureSteps=[
 {title:'原料与制作',short:'制作要求',record:'2017年材料记载：制作制度要求使用活鸡，并禁用冻鸡。',reason:'工序插画按2022年公开解读展示初加工、炒制、煮熟和石锅煨煮；不复原2017年的具体厨房。'},
 {title:'把供货接上',short:'供货组织',record:'同一材料记载：引进养殖企业，组织统一供货。',reason:'原料要求接到制作，还需要供货组织。移去条件时，备料和后续工序等待；不虚构供应商位置。'},
 {title:'共同维护经营',short:'诚信经营',record:'同一材料记载：与商户签订诚信经营承诺。',reason:'一餐之外还要持续经营；共同遵守的规则连接了商户与地方服务。'},
 {title:'回到地方生活',short:'饮食与接待',record:'将当年的经营记录，与今天归档的餐饮位置放在一起阅读。',reason:'日常饮食与旅游接待是功能示意，不是客源统计。地方风味的延续包含制作、供货和持续经营。'},
] as const;

export const cultureClamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
/** Exact native-word text positions own the process, including reverse seeking. */
export function lulangNarratedCultureProgress(text:string,textProgress:number){
 const at=cultureClamp(textProgress)*text.length;
 const tokens=['制作规范','供货组织','商户诚信管理','恢复联系','最后看二零零八'];
 const anchors=tokens.map(token=>text.indexOf(token));
 if(anchors.some(n=>n<0))return 0;
 for(let i=0;i<4;i++)if(at<anchors[i+1])return cultureClamp((i+Math.max(0,(at-anchors[i])/(anchors[i+1]-anchors[i])))/4);
 return 1;
}

export function lulangCultureState(view:PilotView){
 const progress=cultureClamp(view.cultureProgress??0),step=Math.min(3,Math.floor(progress*4));
 const supply=view.cultureSupply!==false;
 return {progress,step,supply,active:view.mode==='place'&&view.placeMedia==='process'&&view.placeLens==='culture'&&view.servicesVisible!==false&&view.serviceFilter!=='lodging',serviceReady:progress>=.75&&supply};
}

export function lulangCultureFeedback(view:PilotView){
 const state=lulangCultureState(view);
 if(!state.supply)return '假设移去供货条件：备料和后续出餐停在缺口。恢复后再看制作接续。归档餐饮点仍保留，不表示真实停业。';
 return `${lulangCultureSteps[state.step].reason} 2017经营记录、2022工序解读与实拍照片分别标明日期，不互相冒充。`;
}

/** Existing records only: nearest the original river reference, then north/south. */
export function lulangCultureReferences(services:LulangService[],riverPoint:number[]){
 const food=services.filter(s=>s.kind==='food');
 const nearest=[...food].sort((a,b)=>Math.hypot(a.coordinate[0]-riverPoint[0],a.coordinate[1]-riverPoint[1])-Math.hypot(b.coordinate[0]-riverPoint[0],b.coordinate[1]-riverPoint[1]))[0];
 const byLatitude=[...food].sort((a,b)=>a.coordinate[1]-b.coordinate[1]);
 const candidates=[{label:'原线附近记录',record:nearest},{label:'北侧餐饮记录',record:byLatitude.at(-1)},{label:'南侧餐饮记录',record:byLatitude[0]}];
 const seen=new Set<string>();
 return candidates.filter((item):item is {label:string;record:LulangService}=>Boolean(item.record&&!seen.has(item.record.id)&&seen.add(item.record.id)));
}
