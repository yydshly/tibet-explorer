import type { CityLifeCityId } from './cityLifeJourney';
import {cityLocalOsmSource} from './cityLocalSources';
import {cityPlaceEvidenceSources} from './cityPlaceEvidence';

export interface CityAccessPhase {
  label: string;
  text: string;
  narration: string;
}

export interface CityAccessChange {
  cityId: CityLifeCityId;
  eventDate: string;
  eventTitle: string;
  before: CityAccessPhase;
  access: CityAccessPhase;
  transfer: CityAccessPhase;
  life: CityAccessPhase;
  caseTitle: string;
  caseText: string;
  sourceIds: string[];
  scope: string;
  observationQuestions: [string, string, string];
}

/** Dated evidence for the four operable access phases, reviewed 2026-10-15.
 * The phase clock describes a mechanism, not elapsed travel time or a measured route.
 * Sources add no station, airport, village or historical city-boundary coordinates. */
export const cityAccessChanges: Record<CityLifeCityId, CityAccessChange> = {
  nyingchi: {
    cityId: 'nyingchi', eventDate: '2021-06-25', eventTitle: '拉林铁路开通：在公路、航空之外增加铁路',
    before: {
      label: '原有公路与航空',
      text: '林芝米林机场已于2006年9月1日通航；2021年彩门村访谈也明确当地已有公路和机场。铁路开通前的林芝并非没有交通，山谷和山岭仍是既有出行的地形背景。',
      narration: '先保留林芝的山谷与山岭。拉林铁路开通以前，这里已经有公路，米林机场也已在二〇〇六年通航。新铁路是在已有交通上增加选择。',
    },
    access: {
      label: '2021年6月25日增加铁路',
      text: '2021年6月25日拉林铁路开通运营，增加拉萨经山南至林芝的铁路联系。演示用桥面与穿山通道解释地面交通跨越地形的原理，不复原实际轨道。',
      narration: '二〇二一年六月二十五日，拉林铁路开通。列车增加了拉萨经山南到林芝的联系。看它怎样借助跨越和穿山的工程方式通过地形，公路和航空同时保留。',
    },
    transfer: {
      label: '到站仍需地方接续',
      text: '彩门村村委会主任普巴在2021年8月采访中提到机场、公路及附近岗嘎站的组合条件。乘客或物品到站之后，仍需地方接驳、装卸、管理与接待，才进入具体用途。',
      narration: '到站以后，人与物品还要接上地方服务。彩门村的普巴提到机场、公路和附近的岗嘎站。跟随同一件物品从主通道交到地方车辆，地形并没有消失。',
    },
    life: {
      label: '普巴与扎西：接待、求学和特产',
      text: '2021年彩门村访谈中，普巴谈景区管理与接待；首家民宿经营者扎西谈学生出行、特产寄售和待客。这些具名用途与期待说明新通道怎样被使用，不代表所有家庭已经获益。',
      narration: '再看生活用途。二〇二一年，普巴谈彩门村的接待管理，经营民宿的扎西谈学生出行和特产外销。这是具名用途与期待，不能推成每户已经实现的收益。',
    },
    caseTitle: '米林彩门村：多种交通与地方服务相接',
    caseText: '彩门村是米林的具名地方案例，不能把林芝城区参考点当成村址。2021年采访记录的是已有公路、航空与新增铁路的组合，以及居民的接待和寄售想法；未取得交通变化前后的家庭跟踪调查。',
    sourceIds: ['access-nyingchi-airport-2006', 'access-lalin-opening-2021', 'access-caimen-interviews-2021'],
    scope: '实际开通事件、采访和原有交通方式来自官方资料；高程是真实地理背景，桥隧、载物与交接为原理演示，不是实测轨道、岗嘎站、彩门村或寄递作业。无虚构时刻、运价、前后城市扩张或全体收益。',
    observationQuestions: [
      '谷地与山岭之间，跨越、穿山和地方道路分别解决哪一段通行？',
      '到达站点以后，还要经过哪些接驳、装卸和接待，才能进入地方生活？',
      '彩门村的寄售与接待想法，怎样与鲁朗的服务场所、工布文化介绍分开观察？',
    ],
  },
  lhasa: {
    cityId: 'lhasa', eventDate: '2006-07-01', eventTitle: '青藏铁路全线通车：增加铁路抵达与物资集散',
    before: {
      label: '原有公路与航空',
      text: '青藏铁路通车前，进出藏人员和物资已经依靠公路与航空。2006年的变化是拉萨接入铁路网络，不能把此前的拉萨画成没有道路、航空或城市生活的空白。',
      narration: '拉萨先保留河谷城市、公路和航空。青藏铁路通车前，人员和物资已经通过这些方式进出。接入铁路改变的是运输选择，城市不是在开通当天凭空出现。',
    },
    access: {
      label: '2006年7月1日接入铁路',
      text: '2006年7月1日青藏铁路全线通车。列车把人员和货物带到拉萨的铁路节点；抵达站场只是中间环节，尚不等于旅客已到目的地、物资已进入商店或家庭。',
      narration: '二〇〇六年七月一日，青藏铁路全线通车。列车把人员和货物送到拉萨的铁路节点。先看同一件物品抵达站场，此时它还没有进入商店和家庭。',
    },
    transfer: {
      label: '2007年4月30日：客站跨河进城',
      text: '2007年4月30日柳梧大桥通车，同期报道明确连接中心城区与柳梧新区。2019年洛桑赤列采访还记述村委会组织运输队：设施连通以后，接续需要具体人员组织。当前河流、道路与节点帮助理解站区跨河进城；拉萨西货场另作不同地点阅读。',
      narration: '客运接续看二〇〇七年四月三十日通车的柳梧大桥。在真实站区、道路与河流的位置上，看抵达怎样接到跨河进城。洛桑赤列的采访还提到村委会组织运输队，说明设施连通之后，地方使用仍需要人员与管理。拉萨西货场是另一处地点，下一环单独阅读。',
    },
    life: {
      label: '吴昊：从站场到日常物资',
      text: '2026年报道中，拉萨西站货运值班员吴昊描述货物由早期建设物资扩展到食品、百货、医药等品类。铁路集散、地方配送与使用共同参与生活变化，不能仅由开通日期计算价格或收入改善。',
      narration: '再单独读拉萨西货场。二〇二六年，货运值班员吴昊讲述货物扩展到食品、百货和医药。它与客站是不同位置，不能在客站复原货场作业。物资还要接上地方配送，才进入商店与家庭。',
    },
    caseTitle: '拉萨西站物资集散，与柳梧跨河接续',
    caseText: '2026年吴昊的具名采访解释物资用途；2019年柳梧采访则记载2007年桥梁接站与洛桑赤列参与组织运输队。两个地点与两组材料分别解释货运配送和客运接续，不把它们压成同一座站场或铁路单独造成的城市扩张。',
    sourceIds: ['city-local-osm-2026', 'access-lhasa-existing-modes-2015', 'event-liuwu-opening-2007', 'access-liuwu-bridge-2019', 'access-lhasa-west-logistics-2026'],
    scope: '开通、桥梁月份与具名叙述来自官方报道；当前OSM窗口显示客站、柳梧大桥与城区的地理关系，不是2006或2007年街区复原。交接为原理示意；拉萨西货场未在此客站窗口内，第四环另读其具名材料。',
    observationQuestions: [
      '铁路到站、跨河接续和进入城市，分别需要什么设施与工作？',
      '一件物资从货场到商店或家庭，除了列车还经历了哪些环节？',
      '从交通与地方服务接到历史建筑参访，为什么还要分别核实年代、用途与访问条件？',
    ],
  },
  ngari: {
    cityId: 'ngari', eventDate: '2010-07-01', eventTitle: '昆莎机场通航：在公路之外增加航空入口',
    before: {
      label: '2004年：昆莎至狮泉河已有柏油路',
      text: '吕新民口述的交通变迁材料记载，2004年G219狮泉河至昆莎段建成柏油路；民航局回顾也明确通航以前依托公路。原有道路先保留，2010年的航空再增加进入方式。现状道路位置不能视为2004年竣工线路。',
      narration: '阿里先保留地面联系。吕新民的口述材料记载，二〇〇四年狮泉河到昆莎这段二一九国道已建成柏油路。它早于机场通航。看清原有道路，才能理解后面增加航空选择时，哪些地面行程仍然存在。',
    },
    access: {
      label: '2010年7月1日昆莎通航',
      text: '2010年7月1日昆莎机场正式通航，增加通过航空进入阿里的方式。飞机越过地形并不代表目的地都能直达；地图上的地区入口不冒充机场真实位置。',
      narration: '二〇一〇年七月一日，昆莎机场正式通航。飞机增加了进入阿里的方式。看同一件行李随抵达过程落到地面，接下来还有机场之外的地方行程。',
    },
    transfer: {
      label: '落地后，沿公路进入狮泉河',
      text: '昆莎机场与狮泉河城区是不同位置。既有G219地面联系帮助理解落地之后的接续，实际道路记录与机场跑道分别定位；当前接驳、道路可通行性仍按出行日核验。札达托林属于另一县域，不混作这段机场进城。',
      narration: '下机以后，仍要把行李交给地面接续。昆莎机场与狮泉河城区分开，看既有公路怎样联系这两处地方。航空落地没有消除城外距离，实际接驳还需要车辆、服务与当日条件。札达托林在另一县域，另行安排。',
    },
    life: {
      label: '2017年：狮泉河河岸公共生活',
      text: '沿地面进入狮泉河以后，回到有资料的2017年一河两岸建设。2021采访说明绿化、文化休闲等用途；这些建设和日常管护使河岸可以承载不同活动。交通增加进入方式，公共空间建设改变地方使用，两者不能压成机场单独造成生活变化。',
      narration: '进入狮泉河，再回到同一条河与两岸空间。二〇一七年一河两岸建设增加了绿化、步行和休闲等用途，持续管护参与日常使用。交通让人进入地方，公共空间建设组织停留与活动，它们是不同年份、不同工作的共同参与。',
    },
    caseTitle: '昆莎抵达到狮泉河：道路、航空与河岸使用',
    caseText: '2004年道路、2010年通航和2017年公共空间建设分别解释地面联系、新增进入方式和地方活动。札达托林与札布让另有历史交流和经营材料；金珠德吉2006年开旅馆早于通航，仍保留在独立资料中，不作狮泉河案例。',
    sourceIds: ['city-local-osm-2026', 'event-gunsa-g219-2004-2025', 'access-ngari-airport-2010', 'access-ngari-existing-road-2020', 'city-spatial-shiquanhe-banks-2017', 'access-zaburang-life-2020', 'access-zaburang-start-2020'],
    scope: '公路、通航和河岸功能各有有日期的来源；飞行与行李交接为原理，当前源道路与机场位置帮助阅读空间，历史事件不生成旧城界。机场至狮泉河、狮泉河至札达分别理解；不把在建或规划新线当已通道路，不提供当前导航或地面时长。',
    observationQuestions: [
      '飞机越过地形以后，哪些地方行程依然需要沿地面完成？',
      '昆莎落地到狮泉河，实际地面接续和可达公共空间分别还要核实什么？',
      '公路、航空与河岸建设分别改变哪一环，为什么不能把生活变化归于单一开通事件？',
    ],
  },
};

const accessSourceRecords: { id: string; title: string; url: string; note: string }[] = [
  cityLocalOsmSource,
  ...cityPlaceEvidenceSources,
  { id: 'access-nyingchi-airport-2006', title: '民航局 · 林芝米林机场通航日期（2012年回顾）', url: 'https://www.caac.gov.cn/XWZX/DFDT/201202/t20120208_22575.html', note: '2012-02-08原文明确2006-09-01通航，用于确认2021铁路之前已有航空。未采用旧航班计划、客流增速或收益预期。' },
  { id: 'access-lalin-opening-2021', title: '波密政府 · 拉林铁路正式开通运营（2021）', url: 'https://www.bomi.gov.cn/bmx/xwzx/202106/a320365e780047a6a07eba587fb4215a.shtml', note: '2021-06-29原始开通报道，记载6月25日事件及拉萨经山南至林芝。桥隧为原理，不采用旧车次与旅行时间作当前安排。' },
  { id: 'access-caimen-interviews-2021', title: '米林政府 · 彩门村普巴与扎西访谈（2021）', url: 'https://www.milin.gov.cn/mlx/xwzx/202108/c430e14e3d454de9a3b75c73a48df2a6.shtml', note: '2021-08-12原始具名访谈。普巴谈交通组合与接待管理，扎西谈学生出行、特产寄售与待客的用途/期待。非全体家庭样本、实际寄递流程或铁路单独因果评估；城区参考点不是彩门村。' },
  { id: 'access-lhasa-existing-modes-2015', title: '国家民委 · 青藏铁路通车前后交通材料（2015）', url: 'https://www.neac.gov.cn/seac/c100551/201509/1086186.shtml', note: '2015-09-02官方发布的西藏日报原始记者报道，明确2006-07-01通车及此前公路、航空方式；仅取事件与方式，不采用文中宏观增长、价格或全体收益作为单因效应。' },
  { id: 'access-liuwu-bridge-2019', title: '自治区政府 · 柳梧大桥与洛桑赤列访谈（2019）', url: 'https://www.xizang.gov.cn/xwzx_406/bmkx/201911/t20191114_122100.html', note: '正文署期2019-10-17，李斯睿、黄志武、格桑伦珠原始采访。记载柳梧大桥2007年4月通车、连接站区与市区；洛桑赤列谈出行及组织运输队。非桥梁测绘、城市前后边界或当前交通时长。' },
  { id: 'access-lhasa-west-logistics-2026', title: '拉萨政府 · 拉萨西站货场吴昊等具名采访（2026）', url: 'https://lasa.gov.cn/lasa/bmxw/202606/3bee653d968640c08d9a4add547a84ae.shtml', note: '2026-06-23发布，来源西藏商报。吴昊描述早期建设物资至食品、百货、医药等用途；多吉回忆初期地方配套。采用记者原始具名叙述，不把历史总量或与2018相比的成本数字当作2006开通效果。' },
  { id: 'access-ngari-airport-2010', title: '民航局 · 阿里昆莎机场通航（2010）', url: 'https://www.caac.gov.cn/XWZX/MHYW/201007/t20100702_12709.html', note: '2010-07-02原始报道记载7月1日通航。旧航空空中时间和旧地面行程口径不同，不制作效率倍数，也不采用当年航班作今日服务。' },
  { id: 'access-ngari-existing-road-2020', title: '民航局 · 昆莎通航十周年与原有公路（2020）', url: 'https://www.caac.gov.cn/PHONE/XWZX/HYDT/202007/t20200709_203505.html', note: '2020-07-01机构回顾，明确2010前依托公路、国道219联系。只取原有方式与2010事件，不采用地区增长、旅客量、笼统生活改善或当时航班作机场单独影响与当前条件。' },
  { id: 'access-zaburang-life-2020', title: '阿里行署 · 札布让金珠德吉家庭经营（2020）', url: 'https://www.al.gov.cn/info/1019/128537.htm', note: '2020-07-30地方原始具名报道，地点在札达托林镇札布让。采用家庭旅馆与个人经营，不采用全村收益、旧收入或床位数，更不从本文推断机场单独造成经营变化。' },
  { id: 'access-zaburang-start-2020', title: '阿里行署办公室 · 金珠德吉2006年开办旅馆（2020采访）', url: 'https://xsbgs.al.gov.cn/info/1008/18915.htm', note: '2020-10-22发布的学习强国原始采访记载她与丈夫2006年开办，早于2010机场通航。官方域名搜索索引可全文核对，直读本轮超时；不采用旧收益、设施规模和当前营业状态。' },
];

const usedAccessSources=new Set(Object.values(cityAccessChanges).flatMap(change=>change.sourceIds));
export const cityAccessSources=accessSourceRecords.filter(source=>usedAccessSources.has(source.id));
