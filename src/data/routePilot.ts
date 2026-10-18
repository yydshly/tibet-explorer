export const routePilotPath='/routes/g318-east/nyingchi-lulang';
export const routePilotIdentity='g318-real-corridor-v1';
export const routePilotSources=[
 {title:'林芝市政府：G318林芝段地理',url:'https://www.linzhi.gov.cn/linzhi/zmlz/201812/bc6ff62e851d4e97bd808c157857485c.shtml'},
 {title:'2016年10月：鲁朗小镇试运营报道',url:'https://www.linzhi.gov.cn/xwzx_406/dsdt/201812/t20181216_22625.html'},
 {title:'鲁朗管委会2017年部门决算与运营记录',url:'https://www.linzhi.gov.cn/linzhi/zwgk/201809/3262f7e1fea64f5bb86efe6da8abe370.shtml'},
 {title:'2022年鲁朗建设、工布文化与地方生活报道',url:'https://linzhi.gov.cn/linzhi/xwzx/202206/dcd23620a58d45558ba4c351d58b17a3.shtml'},
 {title:'本段影像、高程、原始道路与许可',url:'/assets/routes/g318/manifest.json'},
 {title:'三个观察位置：源节点、问题与进入条件',url:'/assets/routes/g318/observations.json'},
];
export const routePilotCues=[
 {id:'ROUTE-G318-orientation',title:'先认路线：从城区到山地',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'这次沿真实的三一八国道，从林芝城区附近向东，进入鲁朗。青色线保留地图原有的道路转折，这段归档道路约七十二公里，不是城市之间的直线。先看起点周围的河谷和建成区，再看道路怎样走向山地。底图来自二零二五年十二月十三日的真实卫星影像，白色和阴影包含当时的积雪与日照条件，不能当作全年景观。现在沿道路前进，观察谷地、坡面与视野怎样随着位置改变。'},
 {id:'ROUTE-G318-mountains',title:'沿路观察：高差怎样改变视野',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'沿道路向山地前进。线路连续转弯，身边地面逐渐抬高；道路绕行和山体遮挡，都能在真实地形上对应。停在山地观察点，比较回望和向前的视野。这里按沿线高程样本选择观察位置，不是实测山口标高，也不是建议停车的位置。高处较开阔的视野，并不说明所有方向都没有遮挡。继续向鲁朗方向，道路进入另一侧谷地。地形、季节与水热共同参与风景形成，这一张冬季影像不能独立证明植被和气候的全部原因。接下来进入鲁朗，看过境道路怎样接向地方生活。'},
 {id:'ROUTE-G318-lulang',title:'进入鲁朗：道路、生活与人的组织',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'现在在同一地形上靠近鲁朗。先看过境道路，再展开地方接续，服务道路与已记录的建筑、地块同时出现。道路把人带到附近，生活和服务还需要真实的连接、经营与维护。二零一六年的报道记录小镇试运营；二零一七年的部门决算又记录商街经营、地方产品展示、活动组织和沿线服务。画面仍是今天归档的地物与二零二五年的影像，不把它复原成当年的建筑外观。工布文化、地方产品和持续运营让这里具有生活与文化价值，不能只把鲁朗理解成一片好看的林海。你可以比较过境与地方接续，再回到刚才的道路继续。'},
 {id:'ROUTE-G318-return',title:'带着问题回到线路',chapterId:'route-pilot',stepId:'G318',sceneIdentity:routePilotIdentity,
 narration:'把地方重新放回线路。林芝附近的谷地、沿途高差与鲁朗的生活空间，属于同一段真实道路上的不同观察尺度。自然条件解释可能面对什么，建设、经营与共同维护继续解释地方怎样被使用。保存一个观察问题，再回到原来的路段和语句。地图上的观察点用于阅读资料，不代表已经核实的实地停靠、酒店入口或开放条件。这一段到这里结束，保留整条线路的来路。'},
];

export type PilotView={mode:'whole'|'line'|'place';progress:number;height:number;connections:boolean;lookBack:boolean;connectionProgress?:number};
export const pilotConnectionProgress=(view:PilotView)=>view.connections?Math.max(0,Math.min(1,view.connectionProgress??1)):0;
export function pilotNarratedView(index:number,text:string,textProgress:number,highPoint=.5):PilotView{
 const at=Math.max(0,Math.min(1,textProgress))*text.length;
 const part=(a:string,b:string)=>Math.max(0,Math.min(1,(at-text.indexOf(a))/Math.max(1,text.indexOf(b)-text.indexOf(a))));
 if(index===0){const t=part('现在沿道路前进','观察谷地');return {mode:at<text.indexOf('现在沿道路前进')?'whole':'line',progress:t*.12,height:3500,connections:false,lookBack:false};}
 if(index===1){
  const hold=at>=text.indexOf('停在山地观察点')&&at<text.indexOf('继续向鲁朗');
  const p=hold?highPoint:at<text.indexOf('停在山地观察点')?.12+(highPoint-.12)*part('沿道路向山地前进','停在山地观察点'):highPoint+(1-highPoint)*part('继续向鲁朗','接下来进入鲁朗');
  return {mode:'line',progress:p,height:hold?3000:3500,connections:false,lookBack:hold&&at<text.indexOf('这里按沿线')};
 }
 if(index===2)return {mode:'place',progress:1,height:2500,connections:at>=text.indexOf('再展开地方接续'),connectionProgress:part('再展开地方接续','地块同时出现'),lookBack:false};
 return {mode:'whole',progress:1,height:3500,connections:false,lookBack:false};
}
