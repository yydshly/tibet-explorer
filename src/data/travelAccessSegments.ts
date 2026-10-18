import type {CityAccessCityId} from '../lib/cityAccessState';
import {cityAccessCityRange,cityAccessPhaseProgress} from '../lib/cityAccessState';
import {cityContinuityPartProgress} from '../lib/cityContinuityState';
import {cityPlaceEvidenceSources} from './cityPlaceEvidence';
import {cityLifeSources} from './cityLifeJourney';

export interface TravelAccessSource {id:string;title:string;url:string;publishedOn:string;supports:string}
export interface TravelAccessInspect {
 cityId:CityAccessCityId;stage:'connections'|'development'|'history'|'travel';
 /** Existing recording position, not semantic scene progress or a new timer. */
 progress:number;featureId?:string;
}
export interface TravelAccessSegment {
 id:string;cityId:CityAccessCityId;from:string;to:string;road:string;
 routeId:string;startSourceNode:number;endSourceNode:number;
 fact:string;observe:string;geometryScope:string;pending:readonly string[];
 sources:readonly TravelAccessSource[];inspect:TravelAccessInspect;
}

const source=(id:string,publishedOn:string,supports:string):TravelAccessSource=>{
 const found=[...cityPlaceEvidenceSources,...cityLifeSources].find(item=>item.id===id);
 if(!found)throw new Error(`Missing access source: ${id}`);
 return {id,title:found.title,url:found.url,publishedOn,supports};
};
const part=(cityId:CityAccessCityId,index:number,fraction:number)=>{
 const start=cityContinuityPartProgress(cityId,index);
 const end=index<2?cityContinuityPartProgress(cityId,index+1):cityAccessCityRange(cityId).end;
 return start+(end-start)*fraction;
};

export const travelAccessGeometry={
 acquiredOn:'2026-10-15',
 manifestUrl:'/data/local-places/transport-corridors.manifest.json',
 credit:'© OpenStreetMap contributors · ODbL 1.0',
 scope:'现状原始道路节点与way链，不是历史竣工线，也不证明当前通行、车站出入口或游客访问权限。',
} as const;

/** Place-to-place reading segments use archived connected source nodes. Their
 * order is an observation proposal, never a verified day trip or navigation. */
export const travelAccessSegments:Record<CityAccessCityId,readonly TravelAccessSegment[]>={
 nyingchi:[
  {id:'mainling-nyingchi-s4',cityId:'nyingchi',from:'米林机场外部道路节点',to:'林芝城区附近道路节点',road:'S4及已归档连接道路',
   routeId:'mainling-airport-nyingchi-s4',startSourceNode:3912826232,endSourceNode:8539730136,
   fact:'2020年道路发布与养护检查均记载S4林芝—米林机场联系；机场落地后，进入林芝仍有地面一段。',
   observe:'先在整张地图辨认机场与林芝的间隔，再看道路如何沿地形接入城区。',
   geometryScope:'源图中access=no的机场内部接段已排除；起点是机场外部道路节点，不是航站楼出口。S306另有独立源链，没有改名为S4。',
   pending:['航站楼至允许上车位置的实际接续','出行日车辆、道路通行与运营安排'],
   sources:[source('event-mainling-s4-2020','2020-12-16','道路名称及所连地点。旧限速不作当前指引。'),source('event-mainling-s4-maintenance-2020','2020-10-23','养护检查与管护工作；不是今天的路况。')],
   inspect:{cityId:'nyingchi',stage:'connections',progress:part('nyingchi',2,.2)}},
  {id:'nyingchi-sejila-lulang',cityId:'nyingchi',from:'同一个林芝道路交接节点',to:'鲁朗服务用地旁道路节点',road:'G318 · 色季拉越岭—鲁朗',
   routeId:'nyingchi-lulang-g318',startSourceNode:8539730136,endSourceNode:12237649787,
   fact:'2022年文旅资料记述从林芝沿G318经色季拉山到鲁朗；到林芝与继续越岭到鲁朗，是不同环节。',
   observe:'沿同一实存路链看山谷、山岭与高差，再找经过与停留分别需要什么条件。',
   geometryScope:'此链与上一段共享原始节点8539730136。终点落在现状商业服务用地的道路上，不是酒店大门；不是2016年的道路或建设复原。',
   pending:['出行日越岭道路和天气条件','允许停车、步行与进入服务场所的位置'],
   sources:[source('city-life-sejila-route-2022','2022-07-19','林芝—色季拉山—鲁朗的G318空间次序；未核实当日路况。')],
   inspect:{cityId:'nyingchi',stage:'connections',progress:part('nyingchi',2,.64)}},
  {id:'lulang-local-services',cityId:'nyingchi',from:'鲁朗G318桥位道路节点',to:'小镇商业服务用地内道路节点',road:'G318局部及实际连接的服务道路',
   routeId:'lulang-g318-hotel-approach',startSourceNode:624468783,endSourceNode:12237649787,
   fact:'2017年度工作记录列出商户进驻、家庭旅馆培训与服务管理。道路提供经过条件，住宿与接待再组织停留。',
   observe:'对照鲁朗河、G318和服务用地，追问谁提供接待、经营与持续管护。',
   geometryScope:'图中是商业用地，不把整块地标成一栋建筑。当前服务道路不证明游客入口、营业或预约条件。',
   pending:['本人拟访问场所的营业与预约条件','公开可达的入口和观察位置'],
   sources:[source('event-lulang-services-2017','2018-09-10','2017年度的运营、培训与管理工作；不证明今天仍按同样方式经营。')],
   inspect:{cityId:'nyingchi',stage:'travel',progress:part('nyingchi',1,.65),featureId:'way/1322496961'}},
 ],
 lhasa:[
  {id:'lhasa-station-liuwu-city',cityId:'lhasa',from:'拉萨客站侧道路节点',to:'布达拉宫广场旁北京中路节点',road:'站区道路—柳梧大桥—北岸城区道路',
   routeId:'lhasa-station-liuwu-north-bank',startSourceNode:2653434677,endSourceNode:5055844023,
   fact:'2007年4月30日柳梧大桥通车，连接中心城区与柳梧新区；2019年具名采访补充村民车辆与运输队的组织。',
   observe:'在同一河谷依次找客站、河流、大桥与城区，区分到站、跨河和进城服务。',
   geometryScope:'现状道路链遵循源图北向桥面。起终点均不是已核实的车站门或参访入口；拉萨西货场是另一个地点。',
   pending:['客站实际允许出站及接车位置','出行日接驳线路、车辆与道路条件'],
   sources:[source('event-liuwu-opening-2007','2007-05-01','前一日通车及连接两岸的事实。'),source('place-liuwu-local-interview-2019','2019-10-02','具体运输行动和调度组织；不代表全部家庭的收益。'),source('place-lhasa-bus-adjustment-2024','2024-06-20','有日期的线路调整记录；不能直接当作今日公交方案。')],
   inspect:{cityId:'lhasa',stage:'development',progress:cityAccessPhaseProgress('lhasa','transfer')+.014,featureId:'way/122707217'}},
  {id:'lhasa-jokhang-approach',cityId:'lhasa',from:'拉萨客站侧道路节点',to:'大昭寺附近北京东路节点',road:'同一跨河关系，继续到历史城区附近',
   routeId:'lhasa-station-liuwu-jokhang-approach',startSourceNode:2653434677,endSourceNode:5055843787,
   fact:'当前道路帮助辨认客站与历史城区的联系。建筑年代与用途另读历史材料，抵达附近也不等于已进入允许参访的位置。',
   observe:'把跨河接续的问题接到建筑用途：哪些是现状可见关系，哪些需要有日期的历史材料？',
   geometryScope:'这是从客站出发的另一条源链，和上一项是目的地选择，不是把两条全长首尾相接。路链停在北京东路节点，没有补画寺院入场通道。',
   pending:['本人拟访问地点的开放、预约与允许进入位置','接驳后最后一段的实际步行条件'],
   sources:[source('place-liuwu-local-interview-2019','2019-10-02','站区、跨河与城区的空间联系；不提供寺院入口。')],
   inspect:{cityId:'lhasa',stage:'travel',progress:part('lhasa',1,.55),featureId:'relation/2358701'}},
 ],
 ngari:[
  {id:'gunsa-shiquanhe-road',cityId:'ngari',from:'昆莎机场外部道路节点',to:'狮泉河滨河北路交接节点',road:'G219及实际连接的城区道路',
   routeId:'gunsa-airport-shiquanhe',startSourceNode:3912821934,endSourceNode:3130936715,
   fact:'吕新民口述记载G219狮泉河—昆莎段2004年建成柏油路。公路早于2010年通航，航空增加选择以后仍需落地接续。',
   observe:'保持昆莎与狮泉河分开，追问原有公路、航空入口和城市接续分别承担什么。',
   geometryScope:'起点在源图外部道路，未连接机坪或航站楼门；现状路链不是2004年的竣工图，札达托林不在这段同城接续中。',
   pending:['航站楼至允许上车位置的接续','出行日地面车辆、道路条件和目的地访问安排'],
   sources:[source('event-gunsa-g219-2004-2025','2025-08-05','有身份的历史口述，支持2004年道路事件；不提供当前服务。'),{id:'access-ngari-airport-2010',title:'民航局 · 阿里昆莎机场通航（2010）',url:'https://www.caac.gov.cn/XWZX/MHYW/201007/t20100702_12709.html',publishedOn:'2010-07-02',supports:'记载2010年7月1日通航；不采用旧航班、路时或收益预期作为今天条件。'}],
   inspect:{cityId:'ngari',stage:'connections',progress:part('ngari',1,.45)}},
  {id:'shiquanhe-riverside-observation',cityId:'ngari',from:'同一滨河北路交接节点',to:'狮泉河城区河岸街道节点',road:'滨河北路等已归档连通街道',
   routeId:'shiquanhe-riverside-streets',startSourceNode:3130936715,endSourceNode:7641308609,
   fact:'2017年河岸建设材料涉及绿化、文化与休闲用途。交通负责进入地方，公共空间建设与持续管护提供另一类生活条件。',
   observe:'对照河流、街道和公共活动条件，区分机场通航与河岸建设各自支持的变化。',
   geometryScope:'与机场路链共享原始交接节点。它是街道链，不是连续专用滨河步道或2017年工程边界；缺失的步道不补画。',
   pending:['允许停留和步行的具体公共位置','当日设施开放、沿河通行与管护情况'],
   sources:[source('city-spatial-shiquanhe-banks-2017','2021-10-12','采访回顾2017年工程和河岸用途；不建立机场单独造成公共空间的因果。')],
   inspect:{cityId:'ngari',stage:'travel',progress:part('ngari',1,.55),featureId:'way/154210514'}},
 ],
};

export {travelAccessOutcomes,sanitizeTravelAccessBook,travelAccessCheckError,updateTravelAccessCheck,validTravelAccessDate} from '../lib/travelAccessVerification';
export type {TravelAccessCheck,TravelAccessOutcome,TravelAccessVerificationBook,TravelAccessDrafts} from '../lib/travelAccessVerification';
