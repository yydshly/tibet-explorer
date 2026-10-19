import type {PilotView} from './routePilot';
export type PilotSpatialFocus='relief'|'river'|'access'|'settlement'|'life'|'regional';
/** Semantic comparison, NOT a registration of photo pixels to map features. */
export function pilotSpatialStory(view:PilotView){
 let focus:PilotSpatialFocus='relief';
 if(view.mode==='place'){
  if(view.placeMedia==='map'&&view.placePhoto)focus='relief';
  else if(view.placePhoto==='customs'||view.placePhoto==='target')focus='regional';
  else if(view.placePhoto==='daily')focus='life';
  else if(view.placePhoto==='grazing'||view.placePhoto==='meadow')focus='relief';
  else if(view.placePhoto==='town')focus=view.photoFocus===3?'settlement':view.photoFocus===2?'access':'river';
  else if(view.placeLens!=='landscape')focus='access';
 }
 const returning=(view.returnProgress??0)>0;
 const labels:Record<PilotSpatialFocus,string>={relief:'两侧坡面 → 谷地',river:'河流穿过谷地',access:'国道 → 地方道路',settlement:'道路接入现状聚落',life:'聚落空间 → 街边生活',regional:'鲁朗区位 → 工布地区资料'};
 const cultureReading=focus==='life'&&view.placeLens==='culture';
 const documentary=cultureReading&&view.photoFocus===0;
 const title=documentary?'当前画面：2008年街边日常':cultureReading?'街边公共生活 · 工布风俗另见资料':focus==='relief'&&view.placeMedia!=='map'?(view.placePhoto==='grazing'?'林地与草地 → 生产生活':view.placePhoto==='meadow'?'溪流与草地 → 使用空间':labels[focus]):labels[focus];
 return {focus,returning,title:returning?'沿地方道路，接回国道来路':title,photo:view.mode==='place'&&['town','daily'].includes(view.placeMedia??''),scope:documentary?'2018年工布新年另有文字记录 · 当前未展示节庆现场':cultureReading?'日常实拍不代表节庆现场 · 风俗影像待补':focus==='regional'?'地区文化资料，未定位为鲁朗现场':'地图与实拍为同类空间对照，非逐点配准'};
}
export function pilotReturnTravel(from:number,to:number,elapsed:number){
 const t=Math.max(0,Math.min(1,elapsed/2200)),ease=t*t*(3-2*t);
 return {progress:from+(to-from)*ease,lift:Math.sin(Math.PI*t)*3.5,done:t===1};
}
