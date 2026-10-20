import type {PilotView} from './routePilot';
import {lulangLifePhotos} from './lulangLife';
import type {LulangPhoto} from './lulangFieldMedia';
export type TravelPlace='sejila'|'lulang';
export const travelPlaceTitle={sejila:'色季拉 · 沿路看山',lulang:'鲁朗 · 风景里的生活'};
export const travelPositionKey=(place:TravelPlace)=>'tibet-explorer.travel-observation.'+place+'.v1';
export const travelCues=[
 {id:'TRAVEL-G318-sejila-road',title:'色季拉：道路与路边风景',stepId:'TRAVEL-G318',chapterId:'route-travel',narration:'沿原路上山，看道路怎样绕着山体前进。转到二零一五年的沿路实拍：道路弯入谷地，近处是积雪与低矮植被，两侧是林地山坡。道路和路边风景要放在一起看。回到地图，继续向高处前进。这是当时的记录，不代表今天路况。'},
 {id:'TRAVEL-G318-sejila-outlook',title:'色季拉：怎样理解一次远眺',stepId:'TRAVEL-G318',chapterId:'route-travel',narration:'换一张同日更宽的记录，看积雪坡面与云雾。这里值得留意的是高处的视野和天气变化。资料支持从色季拉远眺南迦巴瓦，但这两张照片没有清晰呈现远峰，也不能保证遇到日照金山。回到道路，向鲁朗谷地继续前进。'},
 {id:'TRAVEL-G318-lulang-landscape',title:'鲁朗：从林海到草地与生活',stepId:'TRAVEL-G318',chapterId:'route-travel',narration:'沿同一条来路进入鲁朗谷地。先看林海实拍，林地坡面和开敞地相邻。再看草地与放牧，牲畜出现在山林之间；围栏和通道也在画面里。风景同时是人使用的空间。这里值得慢下来，看林海、草地与村镇怎样共同构成一个地方。'},
 {id:'TRAVEL-G318-lulang-life',title:'鲁朗：河谷小镇与街边日常',stepId:'TRAVEL-G318',chapterId:'route-travel',narration:'看二零二四年的河谷实拍。河流穿过谷地，道路联系两侧空间，房屋分布其间。现代旅游小镇与传统村落要分别认识。再看二零零八年的街边日常：临街门面、桌球活动和共同停留，让我们看到地方怎样被使用。可以把村镇漫步或地方风味作为停留兴趣；具体开放与参与条件仍要核实。观察结束，回到原来的线路和语句。'},
] as const;
export const travelBeats=(place:TravelPlace)=>travelCues.slice(place==='sejila'?0:2,place==='sejila'?2:4).map(c=>({id:c.id,recordingId:c.id,text:c.narration,sceneIdentity:'travel-'+place}));
export const travelPhotos:Record<string,LulangPhoto>={
 road:{
  id:'road',title:'山谷中的道路与路边坡面',date:'2015-04-10',author:'ping lin',aspect:4/3,
  src:'/assets/routes/g318-travel/sejila-20150410-17.jpg',source:'https://commons.wikimedia.org/wiki/File:Bayi,_Nyingchi,_Tibet,_China_-_panoramio_(17).jpg',original:'https://upload.wikimedia.org/wikipedia/commons/c/c0/Bayi%2C_Nyingchi%2C_Tibet%2C_China_-_panoramio_%2817%29.jpg',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',coordinate:[94.634339,29.628414],
  scope:'2015年沿路照片，非连续行车视频或今日路况。描线仅帮助辨认照片中的道路，非道路测绘。',
  features:[{title:'道路弯入谷地',x:50,y:66,detail:'跟随照片中的道路弯线，观察道路与两侧坡面的空间关系。不能据此判断今日路宽或通行条件。'},{title:'路旁积雪与植被',x:36,y:83,detail:'近处开敞坡面有积雪与低矮植被；只是这次拍摄时的环境，不能代表全年。'},{title:'两侧林地山坡',x:78,y:54,detail:'林地位于道路两侧坡面。对照道路弯线与山坡，可见通行和沿途风景属于同一个空间。'}],
 },
 overlook:{
  id:'overlook',title:'上山途中回望谷地',date:'2015-04-10',author:'ping lin',aspect:4/3,
  src:'/assets/routes/g318-travel/sejila-20150410-10.jpg',source:'https://commons.wikimedia.org/wiki/File:Bayi,_Nyingchi,_Tibet,_China_-_panoramio_(10).jpg',original:'https://upload.wikimedia.org/wikipedia/commons/a/a1/Bayi%2C_Nyingchi%2C_Tibet%2C_China_-_panoramio_%2810%29.jpg',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',coordinate:[94.553122,29.561769],
  scope:'同日另一处沿路机位，展示回望谷地的视野；未展示路面近景，不是前一张照片连续转动的画面。',
  features:[{title:'谷地开敞空间',x:53,y:59,detail:'远处谷地较开敞；位置升高后，可以从两侧山坡之间看见谷底。'},{title:'近处林木',x:23,y:79,detail:'近处林木遮挡部分视野；这张照片有助于认识路边看出去的环境，但不是车窗连续录像。'},{title:'山腰云层',x:80,y:48,detail:'云层与山坡同框；不从单张照片推断长期气候。'}],
 },

 snow:{
  id:'snow',title:'近处经幡与积雪坡面',date:'2015-04-10',author:'ping lin',aspect:4/3,
  src:'/assets/routes/g318-travel/sejila-20150410-25.jpg',
  source:'https://commons.wikimedia.org/wiki/File:Bayi,_Nyingchi,_Tibet,_China_-_panoramio_(25).jpg',
  original:'https://upload.wikimedia.org/wikipedia/commons/f/f2/Bayi%2C_Nyingchi%2C_Tibet%2C_China_-_panoramio_%2825%29.jpg',
  license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',coordinate:[94.651603,29.610281],
  scope:'有日期的山地环境记录；未清晰呈现南迦巴瓦，不表示当前天气、开放或停车条件。',
  features:[{title:'近处经幡',x:56,y:48,detail:'经幡出现在近处空间；只指画面可见对象，不推断仪式与参与者。'},{title:'积雪坡面',x:80,y:85,detail:'积雪对应2015年4月10日这次记录，不能代表全年或今日路况。'},{title:'远处天空',x:32,y:14,detail:'远处天空云层明显；这张照片没有清晰远峰，不能当作日照金山。'}],
 },
 weather:{
  id:'weather',title:'同日的山地与云雾',date:'2015-04-10',author:'ping lin',aspect:4/3,
  src:'/assets/routes/g318-travel/sejila-20150410-27.jpg',
  source:'https://commons.wikimedia.org/wiki/File:Bayi,_Nyingchi,_Tibet,_China_-_panoramio_(27).jpg',
  original:'https://upload.wikimedia.org/wikipedia/commons/8/8c/Bayi%2C_Nyingchi%2C_Tibet%2C_China_-_panoramio_%2827%29.jpg',
  license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',coordinate:[94.651908,29.610383],
  scope:'同日另一机位的真实记录，不是实时天气变化或从前一张照片连续转动拍摄。',
  features:[{title:'积雪坡面',x:45,y:54,detail:'较宽画面显示积雪山地与远近层次，未核到具体坡面名称。'},{title:'山地云雾',x:46,y:25,detail:'云雾与山体同框；记录提示观看条件会限制可见范围，不模拟实时预报。'},{title:'近处经幡',x:70,y:81,detail:'保留原图可见的近处参照，不把两个机位拼成连续实拍。'}],
 },
 forest:lulangLifePhotos.forest,grazing:lulangLifePhotos.grazing,town:lulangLifePhotos.town,daily:lulangLifePhotos.daily,
};
export type TravelFrame={map:PilotView;photo?:string;focus:number;title:string;why:string;phase:string;roadRead?:number};
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const at=(text:string,p:number,token:string)=>p*text.length>=text.indexOf(token);
const between=(text:string,p:number,a:string,b:string)=>clamp((p*text.length-text.indexOf(a))/Math.max(1,text.indexOf(b)-text.indexOf(a)));
export function travelFrame(place:TravelPlace,index:number,p:number,anchor=.65,roadAnchor=.55):TravelFrame{
 const text=travelBeats(place)[index]?.text??travelBeats(place)[0].text;
 const map:PilotView={mode:'line',progress:anchor,height:2200,connections:false,lookBack:false,cameraPitch:38,routeContext:0,elevation:true};
 if(place==='sejila'){
  if(index===0){
   map.progress=roadAnchor*.7+roadAnchor*.3*between(text,p,'沿原路上山','转到二零一五');
   if(at(text,p,'回到地图')){map.progress=roadAnchor+(anchor-roadAnchor)*between(text,p,'回到地图','这是当时');return {map,title:'沿同一道路，继续向高处',why:'道路实拍与地图各有日期；回到地形中继续认识翻山的过程。',focus:-1,phase:'climb'};}
   if(at(text,p,'转到二零一五')){const focus=at(text,p,'两侧是林地')?2:at(text,p,'近处是积雪')?1:0;return {map:{...map,progress:roadAnchor},photo:'road',focus,roadRead:between(text,p,'转到二零一五','近处是积雪'),title:'道路与路边，是同一个风景',why:travelPhotos.road.features[focus].detail,phase:'road'};}
   return {map,title:'沿路升高，视野跟着改变',why:'先沿归档道路接近实拍机位，再看道路与路旁环境。机位附近定位不是精确配准。',focus:-1,phase:'climb'};
  }
  if(!at(text,p,'回到道路'))return {map,photo:'weather',focus:at(text,p,'与云雾')?1:0,title:'值得远眺，也要理解天气',why:'两张实拍均来自2015年4月10日。远峰与日照金山仍缺本轮可用影像，不把想象画成眼前景色。',phase:'weather'};
  map.progress=anchor+(1-anchor)*between(text,p,'回到道路','继续前进');map.cameraPitch=43;map.elevation=false;map.arrivalProgress=between(text,p,'回到道路','继续前进');
  return {map,title:'沿原路下到另一侧谷地',why:'继续沿同一归档道路接近鲁朗，下一段看林海、草地与村镇生活。',focus:-1,phase:'descend'};
 }
 const local:PilotView={mode:'place',progress:1,height:2300,connections:true,connectionProgress:1,lookBack:false,placeMedia:'map',placeLens:'life',servicesVisible:false,cameraPitch:54};
 if(index===0){
  if(!at(text,p,'林海实拍'))return {map:{...map,progress:.9+.1*between(text,p,'沿同一条来路','林海实拍'),elevation:false,arrivalProgress:1},title:'从道路，进入鲁朗谷地',why:'在同一谷地中逐步看清森林、开敞地与人的使用。',focus:-1,phase:'arrival'};
  const grazing=at(text,p,'再看草地与放牧'),photo=grazing?'grazing':'forest',focus=grazing?(at(text,p,'围栏和通道')?2:1):(at(text,p,'开敞地相邻')?1:0);
  return {map:{...local,placePhoto:photo},photo,focus,title:grazing?'风景，也是生活空间':'先看林海与开敞地',why:travelPhotos[photo].features[focus].detail,phase:photo};
 }
 const daily=at(text,p,'再看二零零八'),photo=daily?'daily':'town',focus=daily?(at(text,p,'共同停留')?2:at(text,p,'桌球活动')?1:0):(at(text,p,'房屋分布')?2:at(text,p,'道路联系')?1:0);
 if(at(text,p,'观察结束'))return {map:local,title:'带着停留理由，回到原线',focus:-1,why:'公共村镇空间、地方风味与工布文化各有资料范围；本体验不承诺未经核实的步道、入户或活动。',phase:'return'};
 return {map:{...local,placePhoto:photo},photo,focus,title:daily?'从街边日常，认识地方':'河流、道路与小镇',why:travelPhotos[photo].features[focus].detail,phase:photo};
}
export const travelStops={
 sejila:[{title:'我想看高差与远眺',reason:'比较沿路视野与天气条件；具体观景、停车和步行需按出行日期核实。'},{title:'我更想看翻山入谷',reason:'用连续道路和回望理解山体遮挡，再沿路进入鲁朗。'}],
 lulang:[{title:'我想慢看林海与草地',reason:'林地、草地与人的使用同处一景；活动范围以实际开放与许可为准。'},{title:'我想看村镇生活',reason:'观察公共街区与临街活动，区分现代小镇、传统村落及有日期的文化记录。'},{title:'我想体验地方风味',reason:'把地方饮食作为停留兴趣，不展开制作供货；服务和参与条件另行核实。'}],
};
