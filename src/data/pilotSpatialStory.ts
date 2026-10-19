import type {PilotView} from './routePilot';
export type PilotSpatialFocus='relief'|'river'|'access'|'settlement'|'life'|'regional';
/** Semantic comparison, NOT a registration of photo pixels to map features. */
export function pilotSpatialStory(view:PilotView){
 let focus:PilotSpatialFocus='relief';
 if(view.mode==='place'){
  if(view.placeMedia==='map'&&view.placePhoto)focus='relief';
  else if(view.placePhoto==='customs'||view.placePhoto==='target')focus='regional';
  else if(view.placePhoto==='daily')focus='life';
  else if(view.placePhoto==='town')focus=view.photoFocus===3?'settlement':view.photoFocus===2?'access':'river';
  else if(view.placeLens!=='landscape')focus='access';
 }
 const returning=(view.returnProgress??0)>0;
 const labels:Record<PilotSpatialFocus,string>={relief:'两侧坡面 → 谷地',river:'河流穿过谷地',access:'国道 → 地方道路',settlement:'道路接入现状聚落',life:'聚落空间 → 街边生活',regional:'鲁朗区位 → 工布地区资料'};
 return {focus,returning,title:returning?'沿地方道路，接回国道来路':labels[focus],photo:view.mode==='place'&&['town','daily'].includes(view.placeMedia??''),scope:focus==='regional'?'地区文化资料，未定位为鲁朗现场':'地图与实拍为同类空间对照，非逐点配准'};
}
export function pilotReturnTravel(from:number,to:number,elapsed:number){
 const t=Math.max(0,Math.min(1,elapsed/2200)),ease=t*t*(3-2*t);
 return {progress:from+(to-from)*ease,lift:Math.sin(Math.PI*t)*3.5,done:t===1};
}
