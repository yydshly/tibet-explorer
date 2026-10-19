import {lulangLifePhotos,lulangSelectedPhoto} from './lulangLife';
import {bomiPhotoObjects} from './bomiJourney';
import type {CorridorView} from './corridorJourney';
import type {CorridorNote} from '../lib/corridorStore';
export type CorridorPhoto={src:string;title:string;date:string;author:string;license:string;licenseUrl:string;source:string;scope:string;aspect:number;features:readonly {title:string;detail:string;x:number;y:number;box?:readonly number[]}[];focus:number};
const bridgeFeatures=[
 {title:'旧桥桥面',detail:'2014记录中的单车道桥；不推算当前通行能力。',box:[40,48,59,25],x:68,y:60},
 {title:'河流与两岸',detail:'桥下河流与两岸同框；只是当时画面。',box:[24,58,40,16],x:44,y:66},
 {title:'可见施工背景',detail:'可见施工设施，不能据一帧推完整进度。',box:[40,26,31,26],x:55,y:39},
] as const;
export function corridorPhoto(view:CorridorView):CorridorPhoto|undefined{
 if(view.kind==='pilot'&&view.value.mode==='place'){
  const v=view.value,id=v.photoOverlay??v.placePhoto;if(!id||v.photoOverlay&&(v.photoReveal??0)<=.05||!v.photoOverlay&&v.placeMedia==='map')return;
  const p=lulangSelectedPhoto({...v,placePhoto:id});return {...p,aspect:p.aspect??1.5,focus:Math.max(-1,(v.photoFocus??0)-1)};
 }
 if(view.kind==='tongmai'&&view.value.phase==='archive')return {src:'/assets/routes/g318-tongmai/tongmai-20140921.jpg',title:'通麦旧桥 · 有日期的跨河记录',date:'2014-09-21',author:'Zhangmoon618',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',source:'https://commons.wikimedia.org/wiki/File:20140921_Tongmai_Bridge.jpg',scope:'旧桥及施工背景，不是现状新桥或旧路复原。',aspect:16/9,features:[...bridgeFeatures],focus:view.object};
 if(view.kind==='bomi'&&view.value.phase==='photo')return {src:'/assets/routes/g318-bomi/bomi-street-20080917.jpg',title:'波密街道 · 共同使用的通行与交往空间',date:'2008-09-17',author:'reurinkjan',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/',source:'https://commons.wikimedia.org/wiki/File:Pome_Dzong_(Tramog,_Bomi).jpg',scope:'有年代的街景，不是今日全貌或波卓活动现场。',aspect:999/664,features:bomiPhotoObjects.map(o=>({title:o.title,detail:o.reason,box:o.box,x:o.box[0]+o.box[2]/2,y:o.box[1]+o.box[3]/2})),focus:view.value.photoObject};
}
const place=(id:'town'|'daily',focus:number):CorridorView=>({kind:'pilot',value:{mode:'place',progress:1,height:2500,connections:true,connectionProgress:1,lookBack:false,placeLens:id==='daily'?'culture':'life',placeMedia:id,placePhoto:id,photoFocus:focus,photoReveal:1}});
export const corridorObservations=[
 {id:'whole',title:'整线来路',question:'五个位置各让我们看清了什么？怎样通过同一道路联系？',view:{kind:'overview',focus:-1,read:1,overhead:false} as CorridorView,source:'/project-review/corridor-evidence/g318-source-chain.geojson',boundary:'原始道路与三段地表资料；不是实地停靠或当前路况。'},
 {id:'lulang-river',title:'鲁朗 · 河流与聚落',question:'河流、道路和房屋怎样分布在谷地里？',view:place('town',1),source:lulangLifePhotos.town.source,boundary:lulangLifePhotos.town.scope},
 {id:'lulang-road',title:'鲁朗 · 道路接续',question:'国道经过附近，地方道路怎样进入生活空间？',view:place('town',2),source:lulangLifePhotos.town.source,boundary:lulangLifePhotos.town.scope},
 {id:'lulang-life',title:'鲁朗 · 门前活动',question:'门面、活动和共同停留怎样在相邻空间中发生？',view:place('daily',2),source:lulangLifePhotos.daily.source,boundary:lulangLifePhotos.daily.scope},
 {id:'tongmai-bridge',title:'通麦 · 旧桥记录',question:'照片中的跨河关系与现状桥隧地图分别能说明什么？',view:{kind:'tongmai',value:{phase:'archive',progress:.98,overhead:false,read:1,focus:'bridge'},object:0} as CorridorView,source:'https://commons.wikimedia.org/wiki/File:20140921_Tongmai_Bridge.jpg',boundary:'2014旧桥照片与2015／2016事件、2026几何分开，不据此模拟城市或收入变化。'},
 {id:'bomi-people',title:'波密 · 街道上的行人',question:'行人、车辆和临街建筑怎样共同使用街道？',view:{kind:'bomi',value:{phase:'photo',progress:1,overhead:false,focus:'town',photoObject:0}} as CorridorView,source:'https://commons.wikimedia.org/wiki/File:Pome_Dzong_(Tramog,_Bomi).jpg',boundary:'2008街景；2023镇级材料和波卓县域文字不等于照片中的活动。'},
 {id:'bomi-frontage',title:'波密 · 临街建筑',question:'建筑临街界面与道路上的往来有什么关系？',view:{kind:'bomi',value:{phase:'photo',progress:1,overhead:false,focus:'town',photoObject:2}} as CorridorView,source:'https://commons.wikimedia.org/wiki/File:Pome_Dzong_(Tramog,_Bomi).jpg',boundary:'2008街景不能确认今日经营、城市增长或每栋建筑用途。'},
];
export const corridorObservation=(id?:string)=>corridorObservations.find(o=>o.id===id)??corridorObservations[0];
export function savedCorridorObservation(note:CorridorNote){const known=corridorObservation(note.observation),view=note.observationView??known.view,photo=corridorPhoto(view);if(!photo)return {...known,view};const feature=photo.features[photo.focus];return {...known,view,title:`${photo.title}${feature?' · '+feature.title:''}`,question:feature?`在这份记录中，${feature.title}与周围道路、地形或活动怎样联系？`:known.question,source:photo.source,boundary:photo.scope};}
export function corridorObservationFor(view:CorridorView){
 if(view.kind==='bomi'&&view.value.phase==='photo')return view.value.photoObject===2?'bomi-frontage':'bomi-people';
 if(view.kind==='tongmai'&&view.value.phase==='archive')return 'tongmai-bridge';
 if(view.kind==='pilot'&&view.value.mode==='place')return (view.value.photoOverlay??view.value.placePhoto)==='daily'?'lulang-life':view.value.photoFocus===2?'lulang-road':'lulang-river';
 return 'whole';
}
export function corridorPlanMarkdown(note:CorridorNote){const o=savedCorridorObservation(note),photo=corridorPhoto(o.view),t=note.returnTo;return `# G318整线观察计划\n\n林芝—色季拉山地—鲁朗—通麦—波密；资料观察，不是已核实的出行行程。\n\n## 保存的对象\n\n${o.title}\n\n观察问题：${o.question}\n\n${photo?`影像：${photo.date} · ${photo.author} · ${photo.license}\n\n许可：${photo.licenseUrl}\n\n`:''}来源：${o.source}\n\n资料边界：${o.boundary}\n\n## 我的笔记\n\n${note.text||'尚未填写。'}\n\n## 返回位置\n\n${t?`整线录音段${t.beatIndex+1}，原句进度${(t.raw*100).toFixed(3)}%；返回目标独立于保存的对象。`:'未记录返回目标。'}\n`;}
