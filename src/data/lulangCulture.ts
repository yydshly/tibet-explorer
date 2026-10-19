import type {PilotView} from './routePilot';
import type {LulangService} from '../scene/lulangPlaceData';

export const lulangCultureSteps=[
 {title:'原料与制作',short:'制作要求',record:'2017年材料记载：制作制度要求使用活鸡，并禁用冻鸡。',reason:'风味并非一个店名：原料要求与制作规范，需要在经营中落实。'},
 {title:'把供货接上',short:'供货组织',record:'同一材料记载：引进养殖企业，组织统一供货。',reason:'把原料要求接到制作，还需要供货组织。青色联系只说明这种依赖，不是地理运输线。'},
 {title:'共同维护经营',short:'诚信经营',record:'同一材料记载：与商户签订诚信经营承诺。',reason:'一餐之外还要持续经营；共同遵守的规则连接了商户与地方服务。'},
 {title:'回到地方生活',short:'饮食与接待',record:'将当年的经营记录，与今天归档的餐饮位置放在一起阅读。',reason:'日常饮食与旅游接待是功能示意，不是客源统计。地方风味的延续包含制作、供货和持续经营。'},
] as const;

export const cultureClamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
/** Exact native-word text positions own the process, including reverse seeking. */
export function lulangNarratedCultureProgress(text:string,textProgress:number){
 const at=cultureClamp(textProgress)*text.length;
 const tokens=['制作规范','供货组织','商户诚信管理','食物成为','现状点位'];
 const anchors=tokens.map(token=>text.indexOf(token));
 if(anchors.some(n=>n<0))return 0;
 for(let i=0;i<4;i++)if(at<anchors[i+1])return cultureClamp((i+Math.max(0,(at-anchors[i])/(anchors[i+1]-anchors[i])))/4);
 return 1;
}

export function lulangCultureState(view:PilotView){
 const progress=cultureClamp(view.cultureProgress??0),step=Math.min(3,Math.floor(progress*4));
 const supply=view.cultureSupply!==false;
 return {progress,step,supply,active:view.mode==='place'&&view.placeLens==='culture'&&view.servicesVisible!==false&&view.serviceFilter!=='lodging',serviceReady:progress>=.75&&supply};
}

export function lulangCultureFeedback(view:PilotView){
 const state=lulangCultureState(view);
 if(!state.supply&&state.progress<.25)return '假设移去供货联系：当前仍在制作要求这一步；继续拖动，看示意怎样停在供货缺口。归档餐饮点仍保留，不表示真实停业。';
 if(!state.supply)return '假设移去供货联系：示意游标停在缺口，未连到饮食与接待。归档餐饮点仍保留；这不是实际停业、供货量或经营成效的判断。';
 return `${lulangCultureSteps[state.step].reason} 环线与移动光点是经营关系示意；地图点才是归档位置，不定位2017年参与者。`;
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
