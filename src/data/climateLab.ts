import {verifiedPlaceReferences} from './placeProvenance';
import {climateObservationNarrationCues} from './climateObservationNarration';

export type ClimateLabStage='air'|'evidence'|'life';
export type ClimateLabCity='nyingchi'|'lhasa'|'ngari';
export interface ClimateLabState {stage:ClimateLabStage;progress:number;moisture:'higher'|'lower';city:ClimateLabCity;month:number;zoom:boolean;direction:'north-south'|'east-west';landReveal?:number;airFocus?:number;lifeFocus?:number;}
/** Automatic frames carry the word-clock mix; standalone/manual views use zoom. */
export const climateLabLifeFocus=(state:ClimateLabState)=>state.stage==='life'
 ?Math.max(0,Math.min(1,state.lifeFocus??(state.zoom?1:0))):0;
export const climateLabPlaces={
 nyingchi:{name:'林芝',longitude:verifiedPlaceReferences.nyingchi.longitude,latitude:verifiedPlaceReferences.nyingchi.latitude,question:'山地起伏怎样限制连续可用的地面？',reason:'先读周围坡面与较低地带，再讨论聚居和沿谷通行；高程概览不能认定街道、可建设地块或安全路线。'},
 lhasa:{name:'拉萨',longitude:verifiedPlaceReferences.lhasa.longitude,latitude:verifiedPlaceReferences.lhasa.latitude,question:'河谷提供了土地，城市为什么还需要建设？',reason:'较缓地面只是条件。城市用水和通行仍需要设施、管理与劳动；2022年水利规划是规划材料，不表示所有工程已完成。'},
 ngari:{name:'狮泉河',longitude:verifiedPlaceReferences.ngari.longitude,latitude:verifiedPlaceReferences.ngari.latitude,question:'有水源，为什么还要灌溉与管护？',reason:'2023年报道记录狮泉河盆地林地灌溉和护林工作。它说明设施与持续劳动的重要性，不代表家庭供水调查或全阿里状况。'},
} as const;
export const climateLabNarrationCues=[
 {id:'LAB-air-higher',title:'较多水汽：从抬升到云雨',stepId:'CLIMATE-LAB',chapterId:'climate-lab',narration:'先保留西藏与周边的整体地图。金色地形剖线取自真实高程，青色气团和云雨是原理示意，不是实测风场。沿剖面向北移动，空气遇到高地后被迫抬升。抬升时空气膨胀冷却，足够湿润时水汽凝结，云逐渐增多。继续越过山地，部分水分可能以降水离开气团。背风侧下沉时空气增温，相对湿度可能降低。实际结果还受来流、季节和其他天气过程影响。现在保持同一地形，试着减少水汽，再用气象站资料检查地区差异。'},
 {id:'LAB-air-lower',title:'较少水汽：高山不保证降雨',stepId:'CLIMATE-LAB',chapterId:'climate-lab',narration:'现在保持同一片真实地形，只把示意气团的初始水汽调低。沿剖面向北移动，空气仍会遇到高地并抬升。抬升会冷却，但更干的空气通常需要更多冷却才达到凝结条件。继续越过山地，这个简化对照出现的云和降水更少。背风侧下沉时空气增温，相对湿度可能降低。因此，有高山不等于一定多雨。这不是林芝、拉萨或阿里的天气预测。下一步用一月和七月的气象站常年值，观察真实地区差异。'},
 ...(['nyingchi','lhasa','ngari'] as const).map(city=>({id:`LAB-life-${city}`,title:`${climateLabPlaces[city].name}：从地形读生活条件`,stepId:'CLIMATE-LAB',chapterId:'climate-lab',narration:city==='nyingchi'?'从全域定位林芝，再沿同一张地图拉近。先看地面起伏，金色剖线和读数来自高程网格，不是道路。移动探针，比较沿线高低变化；切换剖面方向，看到不同方向需要面对的高差。青色地面标出观察窗内相对较低、较缓的样本，不是城市边界或建设用地。山地河谷为生活提供不同条件，实际通行还需要道路、桥梁与维护。回到全域，与拉萨和狮泉河比较，然后再追问人的历史行动。':city==='lhasa'?'从全域定位拉萨，再沿同一张地图拉近。先看地面起伏，河谷嵌在周围山地之间。移动探针，比较沿线高低变化；切换剖面方向，看较缓地面能否连续。青色地面标出观察窗内相对较低、较缓的样本，不能据此认定街区或可建设地块。河谷提供可能，城市仍需要用水设施、交通和组织。二零二二年拉萨水利规划提供了理解这些需求的材料，规划不等于全部建成。回到全域，再进入城市用途与历史形成的问题。':'从全域定位狮泉河，再沿同一张地图拉近。先看地面起伏，高原盆地也有内部差异。移动探针，比较沿线高低变化；切换剖面方向，避免把整个阿里想成同一种地形。青色地面标出观察窗内相对较低、较缓的样本，不代表实际耕地。二零二三年的报道记录了狮泉河盆地林地灌溉与护林员的管护。这个案例说明水要通过设施和持续劳动进入使用，并不是全阿里家庭供水调查。回到全域，带着自然条件与人的行动两个问题继续认识历史。'})),
];
export function climateLabCue(state:ClimateLabState){
 return state.stage==='air'?climateLabNarrationCues.find(c=>c.id===`LAB-air-${state.moisture}`)!:state.stage==='life'?climateLabNarrationCues.find(c=>c.id===`LAB-life-${state.city}`)!:climateObservationNarrationCues.find(c=>c.month===state.month)!;
}
/** Literal text intervals, driven only by native-word position. */
export function climateLabNarratedProgress(text:string,textProgress:number){
 // Main narration follows actual portions of the archived 91.1E transect:
 // rising foothill samples 21–27, main ridge 60–61, lee descent 70–85.
 // These are presentation positions, NOT parcel speed or measured wind paths.
 // Generic fractional anchors previously put “抬升时” at sample31, a descent.
 if(text===climateLabNarrationCues[0].narration){
  const keys:[string,number][]=[['沿剖面向北移动',.05],['空气遇到高地',.19],['抬升时',.21],['足够湿润',.23],['云逐渐增多',.24],['继续越过山地',.27],['部分水分',.55],['降水离开气团',.60],['背风侧',.70],['实际结果还受',.85],['现在保持同一地形',1]];
  const anchors=[{at:0,value:0},...keys.map(([token,value])=>({at:text.indexOf(token)/text.length,value})),{at:1,value:1}];
  const t=Math.max(0,Math.min(1,textProgress));
  if(t===1)return 1;
  const index=Math.max(0,anchors.findIndex((a,i)=>i<anchors.length-1&&t>=a.at&&t<anchors[i+1].at));
  const a=anchors[index],b=anchors[index+1];return a.value+(b.value-a.value)*(t-a.at)/(b.at-a.at);
 }
 const tokens=['沿剖面向北移动','抬升','继续越过山地','背风侧','现在保持同一地形'];
 if(!text.includes('沿剖面向北移动'))return Math.max(0,Math.min(1,(textProgress-.12)/.67));
 const anchors=[{at:0,value:0},...tokens.map((token,i)=>({at:text.indexOf(token)/text.length,value:[.05,.28,.6,.83,1][i]})).filter(p=>p.at>0).sort((a,b)=>a.at-b.at),{at:1,value:1}];
 // Repeated "抬升" in introductory text must not reverse the parcel.
 let previous=0;for(const a of anchors){a.value=Math.max(previous,a.value);previous=a.value;}
 const index=Math.max(0,anchors.findIndex((a,i)=>i<anchors.length-1&&textProgress>=a.at&&textProgress<anchors[i+1].at));
 if(textProgress>=1)return 1;
 const a=anchors[index],b=anchors[index+1];return a.value+(b.value-a.value)*Math.max(0,Math.min(1,(textProgress-a.at)/(b.at-a.at)));
}

