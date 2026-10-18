import {rotationFlowCue,rotationFlowSources} from './rotationFlow';
import {irrigationCue,irrigationSources} from './overviewIrrigation';
import {historyOriginsCue} from './overviewEditorial';
import {overviewCityChangeCore,overviewRegionalConnectionsCore,overviewObservationClose} from './overviewPacing';
import {overviewPlaceActions,jokhangProtectionCue} from './overviewPlaceActions';
import {overviewCityChange,cityChangeSources} from './overviewCityChange';
import {overviewHistoryFrame} from './overviewHistoryFrame';
import {overviewMechanismCues,overviewMechanismSources} from './overviewMechanisms';
import {overviewBeats as archive,overviewChapters as archiveChapters,overviewSourceNotes,type OverviewBeat,type OverviewMoment} from './overviewJourney';
import {overviewNarrationCues} from './overviewNarration';
import {placeSources} from './placeProfiles';
import {climateLabCue} from './climateLab';
import {overviewInteractionStates} from '../lib/overviewInteraction';
import {narratedGeographyPlans} from '../lib/narratedGeography';
import {historySpaceStory} from './historySpaceStory';

// chapterId remains the original renderer context. Editorial chapters group
// recordings independently, so moving a recording never changes its clock/model.
export type ProgramBeat=OverviewBeat & {overviewScope?:'whole'};
export interface ProgramChapter {
 id:string;title:string;question:string;premise:string;conclusion:string;nextQuestion:string;scale:string;beats:ProgramBeat[];
 stages?:{title:string;reason:string;beatIds:string[]}[];
}
export interface OverviewProgram {id:string;title:string;chapters:ProgramChapter[];beats:ProgramBeat[]}
function source(id:string):OverviewBeat {
 const beat=archive.find(item=>item.id===id);if(!beat)throw new Error(`Missing editorial recording: ${id}`);return beat;
}
const whole=(...ids:string[]):ProgramBeat[]=>ids.map(id=>({...source(id),overviewScope:'whole'}));
function interactive(id:string):ProgramBeat {
 const state=overviewInteractionStates[id],cue=id==='LAB-life-lhasa'?overviewNarrationCues.find(c=>c.id==='OVERVIEW-life-lhasa')!:climateLabCue(state);
 return {id,recordingId:cue.id,text:cue.narration,title:cue.title,chapterId:'regions',kind:'atlas',topic:state.stage==='life'?'life':'regions',overviewScope:'whole',detailStepId:state.stage==='life'?'E3':'C4',sources:[
  {title:'真实高程：来源、采样与显示尺度',url:'/assets/terrain/tibet-regional-dem.source.json',note:'约5—6公里区域采样；显示高差放大16倍，不能判读街道和管网。'},
  ...(state.stage==='air'?[{title:'美国国家气象局：地形抬升',url:'https://forecast.weather.gov/glossary.php?word=OROGRAPHIC',note:'气团、凝结阈值和云雨为定性原理示意，不是实测风场或预测雨量。'}]:[]),
  ...(state.stage==='evidence'?[{title:'NOAA NCEI：WMO 1991—2020气候标准值',url:'https://www.ncei.noaa.gov/products/wmo-climate-normals',note:'归档三站月平均资料，不代表市域或实时天气。'},{title:'本地归档：三站原始数据与来源',url:'/data/climate-normals-1991-2020/stations.json'}]:[]),
  ...(state.stage==='life'?overviewSourceNotes.life:[]),
  ...placeSources.filter(s=>state.stage==='life'&&(state.city==='lhasa'?s.id==='lhasa-water-plan':state.city==='ngari'?s.id==='ngari-valley':false)),
 ]};
}
function linking(id:string,topic:'connections'|'observation'|'life',moments:OverviewMoment[]):ProgramBeat {
 const cue=overviewNarrationCues.find(item=>item.id===id);if(!cue)throw new Error(id);
 return {id,recordingId:id,text:cue.narration,title:cue.title,chapterId:topic==='life'?'regions':topic,kind:'atlas',topic,moments,
  sources:overviewSourceNotes[topic],detailStepId:topic==='life'?'E3':topic==='connections'?'M1':'T1',overviewScope:'whole'};
}
function mechanism(id:string):ProgramBeat {
 const cue=overviewMechanismCues.find(c=>c.id===id)!;const water=id==='OVERVIEW-water-service';
  const sources=overviewMechanismSources[water?'water':'culture'].filter(s=>id!=='OVERVIEW-culture-continuity'||s.url.includes('unesco.org'));
  return {id,recordingId:id,title:cue.title,text:cue.narration,kind:'atlas',chapterId:'regions',topic:water?'life':'culture',overviewScope:'whole',detailStepId:water?'E3':'K3',sources:[...sources,...(water?placeSources.filter(s=>s.id==='lhasa-water-plan'):[])]};
}
function historicalFrame():ProgramBeat {
 const cue=overviewHistoryFrame;return {id:cue.id,recordingId:cue.id,title:cue.title,text:cue.narration,kind:'atlas',chapterId:'history',topic:'history',overviewScope:'whole',detailStepId:'H2',sources:[...overviewSourceNotes.historyEarly,...overviewSourceNotes.historyMiddle,...overviewSourceNotes.historyModern],moments:[
 {token:'尼阿底研究',title:'活动证据：不能直接推出全年定居',explanation:'研究年代属于有范围的遗址材料，不代表整个高原的统一历史。',focus:'nyade-evidence',year:'距今约4万—3万年'},
 {token:'七至九世纪',title:'吐蕃时期：事件与材料对读',explanation:'政治中心、战争与交往需要历史材料说明；地形只提供空间背景。',focus:'lhasa',year:'7—9世纪'},
 {token:'一〇四二年',title:'1042：西部托林的交流线索',explanation:'人物到达地点不等于已经知道全部行旅路线。',focus:'tholing-exchange',year:'1042年'},
 {token:'十七世纪',title:'拉萨政治空间与近现代制度变化',explanation:'事件有各自背景；现状地图不冒充历史城市或古代疆域。',focus:'lhasa',year:'17—20世纪'},
 {token:'这些线索说明',title:'由历史方向转向人的具体行动',explanation:'下面通过材料功能、学习参与与街区使用解释文化延续，而不是由地形推出文化。'},
 ]};
}
const historyOrigins:ProgramBeat={id:historyOriginsCue.id,recordingId:historyOriginsCue.id,title:historyOriginsCue.title,text:historyOriginsCue.narration,kind:'atlas',chapterId:'history',topic:'history',overviewScope:'whole',detailStepId:'H2',sources:[{title:'UNESCO · 大昭寺的创建与布达拉宫用途',url:'https://whc.unesco.org/en/list/707/',note:'只采用有据的创建和用途，不把现状几何当作古代测绘。'},{title:'The Met · Tibet and India 展览：阿底峡与托林',url:'https://www.metmuseum.org/exhibitions/listings/2014/tibet-and-india',note:'Map of the Region说明1042年行旅经加德满都到西部托林；不据此重建古道，也不把画像年代当事件年代。'}],moments:[
 {token:'先看拉萨',title:'营建与用途：宗教、礼仪、接见和居住',explanation:'地方用途由历史行动与制度解释，地形只提供空间条件。',focus:'lhasa'},
 {token:'再看西部托林',title:'1042：人物与知识交流进入地方',explanation:'托林在西部札达；不是现代生活案例中的狮泉河。地图定位，不补画行旅路线。',focus:'tholing-exchange',year:'1042年'},
 {token:'这些是营建',title:'回到全域：形成与延续是两个问题',explanation:'案例说明营建、使用和交流；文化延续还涉及后来的保护与持续使用。'},
]};
const placeActions:ProgramBeat={id:overviewPlaceActions.id,recordingId:overviewPlaceActions.id,title:overviewPlaceActions.title,text:overviewPlaceActions.narration,kind:'heritage',chapterId:'history',topic:'culture',sources:overviewPlaceActions.sources,detailStepId:'K1'};
const jokhangProtection:ProgramBeat={...placeActions,id:jokhangProtectionCue.id,recordingId:jokhangProtectionCue.id,title:jokhangProtectionCue.title,text:jokhangProtectionCue.narration,sources:[...placeActions.sources,{title:'本段证据边界：原文核对与示意范围',url:'/data/jokhang-protection-evidence.json',note:'报告所见、解释与未知信息分列；不将2005年情况直接当作今天现状。'}],kind:'atlas',overviewScope:'whole'};
const oldHistorySpace:ProgramBeat={id:historySpaceStory.id,recordingId:historySpaceStory.id,title:historySpaceStory.title,text:historySpaceStory.narration,kind:'heritage',chapterId:'history',topic:'culture',sources:historySpaceStory.sources,detailStepId:'K1'};
const oldCityChange:ProgramBeat={id:overviewCityChange.id,recordingId:overviewCityChange.id,title:overviewCityChange.title,text:overviewCityChange.narration,kind:'atlas',chapterId:'history',topic:'connections',sources:cityChangeSources,detailStepId:'M1'};
const cityChange:ProgramBeat={...oldCityChange,recordingId:overviewCityChangeCore.id,title:overviewCityChangeCore.title,text:overviewCityChangeCore.narration};
const rotationFlow:ProgramBeat={...source('G1-observe'),recordingId:rotationFlowCue.id,title:rotationFlowCue.title,text:rotationFlowCue.narration,overviewScope:'whole',sources:rotationFlowSources};
const irrigation:ProgramBeat={...interactive('LAB-life-ngari'),id:irrigationCue.id,recordingId:irrigationCue.id,title:irrigationCue.title,text:irrigationCue.narration,sources:irrigationSources};
const chapters:ProgramChapter[]=[
 {id:'location',title:'地球上的西藏',question:'西藏在地球的哪里，周围有什么？',
  premise:'先认识海洋、陆地和大气，再沿亚洲、中国、西藏逐层定位。',
  conclusion:'行政归属告诉我们在哪里；高原与周围海陆的位置提供解释环境的起点。',
  nextQuestion:'知道位置以后，全球空气和水来到这片高地，会发生什么？',scale:'地球 → 亚洲 → 中国 → 西藏',
  stages:[{title:'认识地球',reason:'先有海陆与大气的整体背景。',beatIds:['G1-opening']},{title:'逐层定位',reason:'分开洲、国家、自治区与自然高原。',beatIds:['OVERVIEW-position']}],
  beats:whole('G1-opening','OVERVIEW-position')},
 {id:'environment',title:'空气遇到高原',question:'地形怎样改变来到这里的空气与水？',
  premise:'先解释全球来流，再读高地的形成与今天的高差，最后跟踪抬升、冷却和云雨。',
  conclusion:'气候不能只凭纬度或高度判断；来流、水汽、季节与地形共同作用。',
  nextQuestion:'共同机制遇到不同地形和来路，为什么各地区呈现不同条件？',scale:'全球过程 → 高原形成 → 真实地形 → 来流变化',
  stages:[
   {title:'来流',reason:'先解释空气为什么搬运热与水。',beatIds:['G1-explain','G1-observe']},
   {title:'高地',reason:'再认识来流要遇到的高地及真实高差。',beatIds:['OVERVIEW-formation-entry','G3-explain','G4-explain']},
   {title:'云雨',reason:'亲手移动气团，保持地形不变，对照水汽条件。',beatIds:['LAB-air-higher']},
  ],
  beats:[...whole('G1-explain'),rotationFlow,...whole('OVERVIEW-formation-entry','G3-explain','G4-explain'),interactive('LAB-air-higher')]},
 {id:'differences',title:'同在西藏，为何不同',question:'各地区的环境有哪些共同点和差别？',
  premise:'保留同一高原，先对照林芝、拉萨与阿里，再把七市地放回共同的区域背景。',
  conclusion:'用东部与东南部、中南部、北部与西部作比较入口；自然差异跨越行政线。',
  nextQuestion:'这些差异具体怎样进入用水、土地利用和通行？',scale:'同一全域地图 · 七市地对照',
  stages:[{title:'夏季对照',reason:'先用同一尺度的真实站点资料比较。',beatIds:['OBS-CLIMATE-7']},{title:'冬季核对',reason:'季节变化防止把一次比较当成全年。',beatIds:['OBS-CLIMATE-1']},{title:'回到七市地',reason:'站点是入口，自然差异跨越行政线。',beatIds:['OVERVIEW-regional-system']}],
  beats:[interactive('OBS-CLIMATE-7'),interactive('OBS-CLIMATE-1'),...whole('OVERVIEW-regional-system')]},
 {id:'living',title:'环境怎样进入生活',question:'自然条件怎样变成城市与日常生活？',
  premise:'带着各地差异，用土地、水和通行三个共同问题理解聚居与生活。',
  conclusion:'有较缓的地面、有水、有通道，都不等于已经获得服务；还需要设施、劳动与组织。',
  nextQuestion:'环境解释了条件，城市中心、信仰与文化又是怎样在历史中形成的？',scale:'区域差异 → 共同生活问题 → 全域',
  stages:[{title:'比较地形',reason:'同图进入三地，对照起伏、连续地面与用水条件。',beatIds:['LAB-life-nyingchi','LAB-life-lhasa']},{title:'设施与管护',reason:'狮泉河案例：真实渠线之上比较供水条件，区分有水、有渠与持续使用。',beatIds:[irrigationCue.id]}],
  beats:[interactive('LAB-life-nyingchi'),interactive('LAB-life-lhasa'),irrigation]},
 {id:'human-history',title:'人怎样塑造地方',question:'人的行动怎样形成地方历史与文化？',
  premise:'刚才比较了三地的自然条件和人的建设。现在回到全域，把生活放进时间，认识城市用途、知识交流和文化实践。',
  conclusion:'营建与交流帮助解释地方怎样形成；保护调整活动空间，供灯仍可延续。拉萨与托林提供具体线索，完整年代与更多地区保留在专题。',
  nextQuestion:'已有的地方与生活，怎样接入今天的新通道与更广泛联系？',scale:'全域背景 → 营建与交流 → 保护与持续使用 → 现代变化',
  stages:[{title:'怎样形成',reason:'从营建、用途和跨地区交流认识地方，避免把地形当作文化成因。',beatIds:[historyOrigins.id]},{title:'怎样延续',reason:'用大昭寺有据的供灯调整，看活动如何在保护中继续；再接向现代交通。',beatIds:[jokhangProtectionCue.id]}],
  beats:[historyOrigins,jokhangProtection]},
 {id:'today',title:'今天怎样联系与观察',question:'现代联系改变了什么，我们该怎样观察？',
  premise:'已有场所与文化继续被使用。先看新桥怎样接入城市，再回全域比较不同地区的交通，最后带着问题观察地方。',
  conclusion:'交通增加选择，接续和组织决定怎样使用；观察要把地形、历史与今天生活一起核对。',
  nextQuestion:'先用这六个问题解释一个地方，再选择需要深入的专题。',scale:'全域联系 → 地方使用 → 观察后回到整体',
  stages:[{title:'怎样改变',reason:'新连接进入已有城市；设施、服务与人的组织要分开理解。',beatIds:[cityChange.id]},{title:'地区联系',reason:'先比较不同地区获得的抵达方式。',beatIds:['OVERVIEW-regional-connections']},{title:'实际地形',reason:'沿真实线路读穿山、跨河与站区。',beatIds:['OVERVIEW-valley-journey']},{title:'维护与使用',reason:'上下游与地方用途使抵达接向持续生活。',beatIds:['OVERVIEW-protection']},{title:'带回整体',reason:'把同一组问题用于其他地区，再回顾整条认识。',beatIds:['OVERVIEW-conclusion']}],
  beats:[cityChange,{...linking(overviewRegionalConnectionsCore.id,'connections',[
   {token:'先看东南部',title:'东南部 · 拉萨—山南—林芝',explanation:'2021年6月25日开通事件；地区联系不等于精确铁轨或当前班次。',focus:'nyingchi',year:'2021年'},
   {token:'再看西部',title:'西部 · 阿里新增航空抵达',explanation:'2010年7月1日昆莎机场通航；地区参照点不是机场位置。',focus:'ngari',year:'2010年'},
   {token:'方式不同',title:'共同问题 · 抵达之后怎样使用',explanation:'到达节点、地方接续和实际服务分别理解；开通不等于人人同等受益。'},
   {token:'现在回到拉萨河谷',title:'带着通行问题进入真实河谷',explanation:'下一段沿实际铁路看山体、河流与站区；不是城市间的直线。',focus:'lhasa'},
  ]),id:'OVERVIEW-regional-connections'},{...linking('OVERVIEW-valley-journey','connections',[]),sources:[{title:'OSM相连铁路与城市地物（归档）',url:'/assets/terrain/lhasa-ground/lhasa.geojson',note:'青藏线拉萨站前片段；原始相连节点与桥隧标签，非历史路线。'},{title:'Sentinel-2影像与Copernicus GLO-30高程',url:'/assets/terrain/lhasa-ground/manifest.json',note:'2025-11-26真彩影像，10米源像元；约30米地表高程，非街景或轨面测量。'},{title:'© OpenStreetMap contributors · ODbL',url:'https://www.openstreetmap.org/copyright'}]},...whole('OVERVIEW-protection'),{...linking(overviewObservationClose.id,'observation',[
   {token:'先在全图选地方',title:'先有问题，再选地方',explanation:'每次局部观察都从全域位置与来路开始。'},
   {token:'去林芝',title:'比较环境与地方使用',explanation:'林芝、河谷城市、昌都、那曲与阿里回应同一组问题；这不是连续旅行路线。'},
   {token:'每次都问',title:'分清自然条件与人的改变',explanation:'对照地形、水热、历史用途与今天生活。'},
   {token:'比较以后再回到全域',title:'回到整体解释异同',explanation:'观察顺序不是可订行程；交通与访问条件按日期核实。'},
  ]),id:'OVERVIEW-conclusion'}]},
];
const program=(id:string,title:string,input:ProgramChapter[]):OverviewProgram=>{
 const chapters=input.map(chapter=>({...chapter,beats:chapter.beats.map(beat=>!narratedGeographyPlans[beat.recordingId]&&beat.recordingId!=='G1-opening'?beat:{...beat,sources:[...beat.sources,
  {title:'画面中的山系、河流、现状轨道与跑道：来源及几何',url:'/data/narrated-geography.json',note:'OSM现状相连节点与跑道；Natural Earth概览河道与山系参照。高程窗不是城市边界，金色推进不代表实际速度。'},
  {title:'Natural Earth · 自然地理范围（概略参照）',url:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/',note:'山系多边形用于定位，并非精密地质边界；1:1000万比例尺，不是10米精度。'},
  ...(['OVERVIEW-regional-connections','OVERVIEW-regional-connections-core'].includes(beat.recordingId)?[{title:'西藏自治区文旅厅 · 2021年拉林铁路开通与沿线地区',url:'https://wlt.xizang.gov.cn/xwzx_69/wlyw/dsdt/202106/t20210625_248183.html',note:'开通事件与沿线地区依据；不以当年列车时间代表当前班次。'},{title:'© OpenStreetMap contributors · ODbL',url:'https://www.openstreetmap.org/copyright'}]:[]),
 ]})}));
 return {id,title,chapters,beats:chapters.flatMap(c=>c.beats)};
};
export const overviewMainProgram=program('main','六个问题，完整认识西藏',chapters);

function depth(id:string,title:string,question:string,ids:(string|ProgramBeat)[]):OverviewProgram {
 return program(id,title,[{id,title,question,premise:'这是主线之外的进一步阅读，保留原始讲述、资料和演示。',
  conclusion:'把这个具体例子放回主线，避免把一个地方或一项材料当成全部西藏。',nextQuestion:'返回六个问题，继续刚才的认识。',scale:'带着整体问题进入专题',beats:ids.map(item=>typeof item==='string'?source(item):item)}]);
}
export const overviewDepthPrograms=[
 depth('modern-context','现代联系与观察：完整案例','通道、街区使用与地区观察怎样互相补充？',[oldCityChange,linking('OVERVIEW-regional-connections','connections',[]),linking('OVERVIEW-regional-observation','observation',[]),...whole('OVERVIEW-conclusion')]),
 depth('conditions-use','高程与用水：从条件到使用','怎样把地形与实际服务分开？',[...whole('G4-opening','G4-explain'),interactive('LAB-life-ngari'),mechanism('OVERVIEW-water-service')]),
 depth('culture-practice','物件与传习：文化如何持续','保存物件与组织学习分别做了什么？',[mechanism('OVERVIEW-culture-actions'),mechanism('OVERVIEW-culture-continuity')]),
 depth('place-protection','拉萨保护与公共空间','保护怎样改变活动与公共使用？',[placeActions]),
 depth('history-context','历史与文化：补充阅读','怎样区分历史线索、文化概览与功能案例？',[...whole('OVERVIEW-history-entry'),historicalFrame(),'OVERVIEW-history-early','OVERVIEW-history-middle','OVERVIEW-history-modern','OVERVIEW-culture','OVERVIEW-life-conditions']),
 depth('living-context','生活条件：七市地放在一起看','地区差异怎样进入土地、通行和用水？',[{...linking('OVERVIEW-living-comparison','life',[
  {token:'山南与拉萨的河谷',title:'河谷土地提供可能',explanation:'聚居与耕作还需要建设、生产和组织。',focus:'shannan'},
  {token:'林芝与昌都的山地河谷',title:'沿谷与跨山面对不同高差',explanation:'比较地形条件；方向线不是实际道路。',focus:'chamdo'},
  {token:'再看阿里',title:'林地灌溉需要设施与维护',explanation:'2023年狮泉河林地案例，不是全阿里家庭供水。',focus:'ngari'},
  {token:'回到全域',title:'自然条件与人的行动',explanation:'自然条件需要经过建设、使用和维护才能进入生活。'},
 ]),sources:[...overviewSourceNotes.life,...placeSources.filter(s=>['lhasa-water-plan','chamdo-water','ngari-valley'].includes(s.id))]}]),
 depth('air-process','地形与云雨：分步观察','来流怎样经历抬升、凝结和地区差异？',['G1-observe','C4-arrival','C4-uplift','C4-cloud','C4-regions']),
 depth('formation','高原形成：完整过程','地壳怎样变形，为什么不能把高原理解成一块被顶起的平板？',archiveChapters.find(c=>c.id==='formation')!.beats.map(b=>b.id)),
 depth('objects','历史材料：怎样阅读实物','事件年代、物件年代与图像表现怎样区分？',['OVERVIEW-evidence-reading']),
 depth('lhasa-space','拉萨：建筑、街区与空间变化','历史用途怎样进入今天的城市空间？',[oldHistorySpace,'OVERVIEW-heritage-entry','CONT-history-lhasa-1','OVERVIEW-barkhor-life','CONT-history-lhasa-2','CONT-history-lhasa-3','OVERVIEW-lhasa-urban-change','OVERVIEW-heritage-return']),
 depth('lhasa-access','拉萨：铁路、跨河与货场接续','到达车站以后，交通怎样进入生活？',['OVERVIEW-connections','ACCESS-lhasa-access','ACCESS-lhasa-transfer','ACCESS-lhasa-life','OVERVIEW-protection']),
 depth('lhasa-observation','拉萨：一次街区观察','怎样同时理解抵达、历史用途与持续使用？',['OVERVIEW-lived-city']),
];
export const overviewPrograms=[overviewMainProgram,...overviewDepthPrograms];

// Every old recording has an explicit destination. This list powers the audit,
// keeping moved material accessible instead of silently deleting its evidence.
export const overviewEditorialDecisions=archive.map(beat=>({id:beat.id,title:beat.title,
 action:overviewMainProgram.beats.some(b=>b.id===beat.id)?'保留并合并到核心问题':'移入深入专题',
 mainChapter:chapters.find(c=>c.beats.some(b=>b.id===beat.id))?.id,
 depthPrograms:overviewDepthPrograms.filter(p=>p.beats.some(b=>b.id===beat.id)).map(p=>p.id),
}));
