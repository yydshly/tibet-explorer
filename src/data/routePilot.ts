import {pilotNarratedCamera} from './routePilotCamera';
import type {LulangLens,LulangServiceFilter} from './lulangPlace';
import type {LulangLifePhase,LulangPhotoId} from './lulangLife';
import type {LulangFootageId} from './lulangFootage';
export const routePilotPath='/routes/g318-east/nyingchi-lulang';
export const pilotScriptVersions=['1','1','5','1'] as const;
export const pilotResumeAliases={'ROUTE-G318-lulang':'ROUTE-G318-lulang'};
export const routePilotIdentity='g318-real-corridor-v1';
export const routePilotSources=[
 {title:'本段范围、实景覆盖与收口记录',url:'/project-review/g318-closeout.html'},
 {title:'实景照片、公开活动原片与使用边界',url:'/data/lulang-life-media.json'},
 {title:'林芝市旅游发展局：2018年鲁朗工布新年活动记录',url:'https://wlj.linzhi.gov.cn/lzslyfzwyh/c103820/201811/b61aecd556d74753bdfb26b2210c73de.shtml'},
 {title:'林芝市政府：G318林芝段地理',url:'https://www.linzhi.gov.cn/linzhi/zmlz/201812/bc6ff62e851d4e97bd808c157857485c.shtml'},
 {title:'2016年10月：鲁朗小镇试运营报道',url:'https://www.linzhi.gov.cn/xwzx_406/dsdt/201812/t20181216_22625.html'},
 {title:'鲁朗管委会2017年部门决算与运营记录',url:'https://www.linzhi.gov.cn/linzhi/zwgk/201809/3262f7e1fea64f5bb86efe6da8abe370.shtml'},
 {title:'2022年鲁朗建设、工布文化与地方生活报道',url:'https://linzhi.gov.cn/linzhi/xwzx/202206/dcd23620a58d45558ba4c351d58b17a3.shtml'},
 {title:'本段影像、高程、原始道路与许可',url:'/assets/routes/g318/manifest.json'},
 {title:'三个观察位置：源节点、问题与进入条件',url:'/assets/routes/g318/observations.json'},
 {title:'鲁朗河谷、餐饮住宿记录与2017年材料对应',url:'/data/lulang-place-reading.json'},
];
export const routePilotCues=[
 {id:'ROUTE-G318-orientation',title:'先认路线：从城区到山地',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'这次沿真实的三一八国道，从林芝城区附近向东，进入鲁朗。青色线保留地图原有的道路转折，这段归档道路约七十二公里，不是城市之间的直线。先看起点周围的河谷和建成区，再看道路怎样走向山地。底图来自二零二五年十二月十三日的真实卫星影像，白色和阴影包含当时的积雪与日照条件，不能当作全年景观。现在沿道路前进，观察谷地、坡面与视野怎样随着位置改变。'},
 {id:'ROUTE-G318-mountains',title:'沿路观察：高差怎样改变视野',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'沿道路向山地前进。线路连续转弯，身边地面逐渐抬高；道路绕行和山体遮挡，都能在真实地形上对应。停在山地观察点，比较回望和向前的视野。这里按沿线高程样本选择观察位置，不是实测山口标高，也不是建议停车的位置。高处较开阔的视野，并不说明所有方向都没有遮挡。继续向鲁朗方向，道路进入另一侧谷地。地形、季节与水热共同参与风景形成，这一张冬季影像不能独立证明植被和气候的全部原因。接下来进入鲁朗，看过境道路怎样接向地方生活。'},
 {id:'ROUTE-G318-lulang',title:'进入鲁朗：风景、聚落与地方生活',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'先看鲁朗河与两侧地形，比较谷底和坡面。对照林海实拍，森林与开敞地交错。进入二零二四年的河谷实拍，看道路和房屋。回到地图，先看国道，再展开地方接续，建筑轮廓随之出现。再看草地与放牧，以及街边日常：风景也是生产和停留的空间。认识人文，再对照工布地区的响箭影像：竞赛、服饰和共同参与，连接起节庆生活。鲁朗公开资料也记录了响箭和歌舞。影像拍摄场地未核实为鲁朗，不能当作本地现场。带着问题，再回到刚才的道路。'},
 {id:'ROUTE-G318-return',title:'带着问题回到线路',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'把地方重新放回线路。林芝附近的谷地、沿途高差与鲁朗的生活空间，属于同一段真实道路上的不同观察尺度。自然条件解释可能面对什么，建设、经营与共同维护继续解释地方怎样被使用。保存一个观察问题，再回到原来的路段和语句。地图上的观察点用于阅读资料，不代表已经核实的实地停靠、酒店入口或开放条件。这一段到这里结束，保留整条线路的来路。'},
];

export type PilotView={arrivalProgress?:number;returnProgress?:number;mode:'whole'|'line'|'place';progress:number;height:number;connections:boolean;lookBack:boolean;connectionProgress?:number;placeLens?:LulangLens;sectionProgress?:number;serviceFilter?:LulangServiceFilter;servicesVisible?:boolean;cultureProgress?:number;cultureSupply?:boolean;cultureSample?:number;cameraPitch?:number;cameraBearing?:number;mapZoom?:number;mapFocus?:number;mapFocusWeight?:number;elevation?:boolean;placeMedia?:'map'|'town'|'process'|'daily'|'record';footageId?:LulangFootageId;placePhoto?:LulangPhotoId;photoOverlay?:LulangPhotoId;photoReveal?:number;photoFocus?:number;cookingProgress?:number;lifePhase?:LulangLifePhase};
export const pilotConnectionProgress=(view:PilotView)=>view.connections?Math.max(0,Math.min(1,view.connectionProgress??1)):0;
export function pilotNarratedView(index:number,text:string,textProgress:number,highPoint=.5):PilotView{
 return {...pilotNarratedBase(index,text,textProgress,highPoint),...pilotNarratedCamera(index,text,textProgress,highPoint)};
}
function pilotNarratedBase(index:number,text:string,textProgress:number,highPoint:number):PilotView{
 const rawAt=Math.max(0,Math.min(1,textProgress))*text.length,at=Math.abs(rawAt-Math.round(rawAt))<1e-10?Math.round(rawAt):rawAt;
 const part=(a:string,b:string)=>Math.max(0,Math.min(1,(at-text.indexOf(a))/Math.max(1,text.indexOf(b)-text.indexOf(a))));
 if(index===0){const t=part('现在沿道路前进','观察谷地');return {mode:at<text.indexOf('现在沿道路前进')?'whole':'line',progress:t*.12,height:3500,connections:false,lookBack:false};}
 if(index===1){
  const hold=at>=text.indexOf('停在山地观察点')&&at<text.indexOf('继续向鲁朗');
  const p=hold?highPoint:at<text.indexOf('停在山地观察点')?.12+(highPoint-.12)*part('沿道路向山地前进','停在山地观察点'):highPoint+(1-highPoint)*part('继续向鲁朗','接下来进入鲁朗');
  return {mode:'line',progress:p,arrivalProgress:part('继续向鲁朗','接下来进入鲁朗'),height:hold?3000:3500,connections:false,lookBack:hold&&at<text.indexOf('这里按沿线')};
 }
 if(index===2){
  const placeLens=at<text.indexOf('进入二零二四')?'landscape':at<text.indexOf('认识人文')?'life':'culture';
  const placeMedia=at>=text.indexOf('再回到刚才')?'map':at>=text.indexOf('街边日常')&&at<text.indexOf('认识人文')?'daily':at>=text.indexOf('草地与放牧')?'town':at>=text.indexOf('回到地图')?'map':at>=text.indexOf('对照林海实拍')?'town':'map';
  const placePhoto=placeMedia==='map'?undefined:at>=text.indexOf('认识人文')?'customs':at>=text.indexOf('街边日常')?'daily':at>=text.indexOf('草地与放牧')?'grazing':at>=text.indexOf('进入二零二四')?'town':'forest';
  const photoFocus=placePhoto==='forest'?(at>=text.indexOf('开敞地')?2:1):placePhoto==='town'?(at>=text.indexOf('房屋')?3:at>=text.indexOf('看道路')?2:0):placePhoto==='customs'?(at>=text.indexOf('共同参与')?3:at>=text.indexOf('服饰')?2:at>=text.indexOf('竞赛')?1:0):placePhoto==='daily'?2:placePhoto==='grazing'?2:0;
  const returnAt=text.indexOf('再回到刚才'),returnProgress=Math.max(0,Math.min(1,(at-returnAt)/Math.max(1,text.length-returnAt)));
  const ramp=(token:string)=>{const t=Math.max(0,Math.min(1,(at-text.indexOf(token))/6));return t*t*(3-2*t);};
  let photoOverlay:LulangPhotoId|undefined=placePhoto,photoReveal=placePhoto?1:0;
  if(placePhoto==='forest')photoReveal=ramp('对照林海实拍');
  if(placePhoto==='grazing')photoReveal=ramp('草地与放牧');
  if(placeMedia==='map'&&at>=text.indexOf('再回到刚才')){photoOverlay='customs';photoReveal=1-ramp('再回到刚才');}
  else if(placeMedia==='map'&&at>=text.indexOf('回到地图')){photoOverlay='town';photoReveal=1-ramp('回到地图');}
  return {mode:'place',progress:1,height:placeLens==='landscape'?3000:2500,connections:at>=text.indexOf('再展开地方接续'),connectionProgress:(1-returnProgress)*part('再展开地方接续','建筑轮廓'),returnProgress,lookBack:false,placeLens,sectionProgress:at<text.indexOf('两侧地形')?.5:part('两侧地形','对照林海实拍'),serviceFilter:'all',servicesVisible:false,cultureProgress:0,cultureSupply:true,cultureSample:0,placeMedia,placePhoto,photoOverlay,photoReveal,photoFocus,cookingProgress:0,lifePhase:'making'};
 }
 return {mode:'whole',progress:1,height:3500,connections:false,lookBack:false};
}
