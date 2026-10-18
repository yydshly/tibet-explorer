import type {NarrationTiming} from './narrationTiming';
export type GeographyCity='lhasa'|'shigatse'|'shannan'|'nyingchi'|'chamdo'|'nagqu'|'ngari';
export interface GeographyReading {kind:'regions'|'history'|'rail'|'airport'|'mountain';cities:GeographyCity[];rivers:boolean;progress:number;title:string;relation:string}
type Stop=Omit<GeographyReading,'progress'> & {token:string};
const region=(token:string,cities:GeographyCity[],title:string,relation:string):Stop=>({token,cities,title,relation,kind:'regions',rivers:true});
/** Literal recording text owns every change. Windows are terrain samples, not
 * city footprints. Historical locations never create invented travel routes. */
export const narratedGeographyPlans:Record<string,Stop[]>={
 'OVERVIEW-history-origins':[{...region('先看拉萨',['lhasa'],'营建与用途：放回拉萨河谷','地形定位，历史用途依照资料；不复原古代建筑或街道。'),kind:'history'},{...region('再看西部托林',['ngari'],'托林：人物与知识交流的地方','托林来源点用于定位；阿里城区仅作区域参照，不是人物目的地。'),kind:'history'},region('这些是营建',[],'形成以后，还要解释怎样延续','回到共同问题；不把年代当作空间变化的演示。')],
 'OVERVIEW-water-service':[region('狮泉河二〇二三年',['ngari'],'狮泉河：报道中的林地管护','地形窗定位狮泉河地区；功能窗不复原报道中的水渠。'),region('拉萨水利规划',['ngari','lhasa'],'具体案例与规划分别阅读','两地保留在同一全域背景；规划不等于已完成的建设。')],
 'G4-opening':[{token:'南侧低地',kind:'mountain',cities:[],rivers:false,title:'喜马拉雅：低地与高原之间的山系',relation:'浅金区域定位山系；南北高程剖面比较两侧地面，不把一根标柱当作整片山系。'}],
 'G4-explain':[{token:'沿同一条线向北',kind:'mountain',cities:[],rivers:false,title:'穿过山系，再进入高原内部',relation:'山系范围为概览参照，起伏和读数来自高程网格。'}],
 'OVERVIEW-regional-system':[
  region('中南部的拉萨',['lhasa','shigatse','shannan'],'中南部：城市与南部河谷','青色显示资料河道，金色显示各城区附近的真实地形观察窗；窗口不是城市边界。'),
  region('东部昌都',['chamdo','nyingchi'],'东部与东南部：比较峡谷来路','同图比较昌都与林芝附近的起伏和河流；河道与地形一起说明位置，不能把两地当成同一条谷地。'),
  region('北部那曲',['nagqu','ngari'],'北部与西部：高地也有起伏','对照两处真实高程窗口；聚居点只是区域入口，不代表整个那曲或阿里。'),
 ],
 'OVERVIEW-regional-connections':[
  {token:'先看东南部',kind:'rail',cities:['lhasa','shannan','nyingchi'],rivers:true,title:'沿实际轨道看拉萨—山南—林芝联系',relation:'橙色为OSM现状相连轨道，蓝色为概览河流；轨道绕行、跨河并穿山，不是三座城市间的直线。'},
  {token:'再看西部',kind:'airport',cities:['ngari'],rivers:true,title:'昆莎机场与狮泉河分处不同地点',relation:'OSM跑道与归档的道路接续片段同图，狮泉河为聚居地参照；道路形状不代表当前接驳班次或机场入口。'},
  region('方式不同',['ngari','lhasa','nyingchi'],'抵达节点与地方生活分别看','线路与机场回答在哪里抵达；进入社区还需要地面交通、服务与组织。'),
  region('把昌都的峡谷',['chamdo','nagqu','shigatse'],'回到地形：通道没有抹平高差','同时显示三地观察窗，对照峡谷、高地和河谷的真实起伏。'),
 ],
 'OVERVIEW-regional-observation':[
  region('去林芝',['nyingchi'],'林芝：先看山谷与水热来路','沿地形窗口观察谷地与河流，再将前面气候站资料与生活条件对照。'),
  region('到山南',['shannan','lhasa','shigatse'],'河谷城市：同一问题，多处对照','三处窗口与南部干流同图；不同城市有各自的河谷和历史，不代表一条已规划的旅游线路。'),
  region('看昌都',['chamdo'],'昌都：峡谷怎样约束通行','观察真实起伏与河流的位置，再问道路怎样穿行，不用方向线假装道路。'),
  region('看那曲与阿里',['nagqu','ngari'],'那曲与阿里：水与接续的条件','保留两地在全域中的位置，比较附近高地与河谷，不把高原画成平板。'),
  region('比较以后再回到全域',[],'把各地放回共同背景','保留河道与完整高原，局部观察接回整体认识；这里没有绘制旅游行程。'),
 ],
 'OVERVIEW-history-frame':[
  {...region('尼阿底研究',['nagqu'],'北部高地：早期活动证据','地图定位研究背景，不复原古代聚落。'),kind:'history'},
  {...region('七至九世纪',['shannan','lhasa'],'南部河谷：雅砻与拉萨','年代与事件需要材料，今日地形仅说明空间背景。'),kind:'history'},
  {...region('一〇四二年',['ngari'],'西部托林：人物到达的有证线索','现代阿里参照窗不代表托林遗址或阿底峡的全部路线。'),kind:'history'},
  {...region('十七世纪',['lhasa'],'拉萨：政治空间与制度变化','历史概览；现状地形不重建历史疆域或生活结果。'),kind:'history'},
  {...region('这些线索说明',[],'回到全域：准备读具体行动','环境、事件和文化用途需要不同材料解释。'),kind:'history'},
 ],
 'OVERVIEW-history-early':[
  {...region('尼阿底',['nagqu'],'早期活动：先确认北部高地','遗址位置来自研究；地形窗口只说明区域环境，不复原古代聚落。'),kind:'history'},
  {...region('雅砻与拉萨',['shannan','lhasa'],'雅砻与拉萨：两个地方共同入镜','保留南部河谷与两处地形背景；历史关系由材料说明，不画未经考证的古代道路。'),kind:'history'},
 ],
 'OVERVIEW-history-middle':[
  {...region('西藏西部托林',['ngari'],'西部托林：放回高原西部理解','托林的已有来源点与西部地形一起阅读；狮泉河只是今天的区域参照，不是阿底峡的目的地。'),kind:'history'},
  {...region('蒙古元朝与萨迦',['shigatse'],'萨迦：地区位置与制度联系分开','保留萨迦已有来源点与周围地形；画面不复原元代疆域或交通线。'),kind:'history'},
  {...region('随后帕竹',['shannan'],'山南：地方力量变化的空间背景','时间线与有据地点配合；今天的地形不是历史城市复原。'),kind:'history'},
 ],
 'OVERVIEW-history-modern':[{...region('拉萨政治',['lhasa'],'拉萨：河谷中的政治与城市空间','显示今天的地形和河流背景，历史用途与制度变化依照材料阅读。'),kind:'history'}],
 'OVERVIEW-culture':[
  {...region('拉萨建筑',['lhasa'],'拉萨建筑：地方用途与河谷背景','建筑用途由已有材料解释；地形说明位置，不推导信仰或文化的必然形成。'),kind:'history'},
  {...region('托林交流',['ngari'],'托林交流：回到西部的有据地点','东西部保持在同一张图中；不将文化交流画成未经核实的旅行路线。'),kind:'history'},
 ],
};
narratedGeographyPlans['OVERVIEW-regional-connections-core']=[...narratedGeographyPlans['OVERVIEW-regional-connections'].slice(0,3),region('现在回到拉萨河谷',['lhasa'],'从抵达方式，转到实际通行条件','下一段沿青藏线拉萨站前片段读山体、河流与站区，不是拉林全线。')];
narratedGeographyPlans['OVERVIEW-observation-close']=narratedGeographyPlans['OVERVIEW-regional-observation'];
export function narratedGeographyState(recordingId:string,text:string,timing?:NarrationTiming):GeographyReading|undefined {
 const stops=narratedGeographyPlans[recordingId];if(!stops||!timing)return;
 const position=timing.textProgress*text.length;
 let index=-1;for(let i=0;i<stops.length;i++)if(position>=text.indexOf(stops[i].token))index=i;
 if(index<0)return;
 const {token,...stop}=stops[index],start=text.indexOf(token),end=index+1<stops.length?text.indexOf(stops[index+1].token):text.length;
 return {...stop,progress:Math.max(0,Math.min(1,(position-start)/Math.max(1,end-start)))};
}
