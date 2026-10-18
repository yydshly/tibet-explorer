/**
 * An authored explanation over sourced terrain, not a regional weather model.
 * Place IDs reuse the archived town locators in placeProvenance.ts. They do not
 * locate meteorological stations, research samples or climate-zone boundaries.
 */
export type PlateauClimateStageId = 'arrival' | 'uplift' | 'cloud' | 'regions' | 'life';
export type PlateauClimatePlaceId = 'nyingchi' | 'lhasa' | 'ngari';

export interface PlateauClimateSource {
  id: string;
  title: string;
  url: string;
  note: string;
  checkedOn: string;
}

export interface PlateauClimateStage {
  id: PlateauClimateStageId;
  title: string;
  question: string;
  explanation: string;
  lookFor: string;
  interaction: string;
  feedback: string;
  bridge: string;
  sourceIds: string[];
  scope: string;
  preferredStepId: string;
}

export interface PlateauClimatePlace {
  id: PlateauClimatePlaceId;
  title: string;
  locatorId: PlateauClimatePlaceId;
  setting: string;
  climateExplanation: string;
  visibleDifference: string;
  lifeConnection: string;
  scope: string;
  sourceIds: string[];
  detailStepIds: string[];
}

const checkedOn = '2026-10-15';

export const plateauClimateSources: PlateauClimateSource[] = [
  {
    id: 'plateau-global-circulation',
    title: 'NOAA · 全球大气环流',
    url: 'https://www.noaa.gov/jetstream/global/global-atmospheric-circulations',
    note: '一般环流原理；不均匀受热、自转及海陆分布共同参与。球面箭头是平均关系示意，不是当日风场。',
    checkedOn,
  },
  {
    id: 'plateau-monsoon-path',
    title: '中科院地球环境所 · 藏东南夏季水汽路径研究（2025）',
    url: 'https://ieexa.cas.cn/news/kydt/202506/t20250606_7798567.html',
    note: '研究团队对2025年论文的介绍；结合示踪采样和1940—2020年夏季再分析，支持印度洋、孟加拉湾与藏东南的水汽联系。不能外推为全年或所有地区的一条固定路径。',
    checkedOn,
  },
  {
    id: 'plateau-moisture-regional-study',
    title: '中科院青藏高原所 · 季风水汽输送与区域差异（2024）',
    url: 'https://itpcas.cas.cn/new_kycg/new_kyjz/202412/t20241218_7502963.html',
    note: '研究团队总结水汽追踪、再分析和观测成果，区分西风、印度季风分支及高原内部水汽。开场仅采用来源及空间差异的定性认识，不重绘论文的降水趋势或份额。',
    checkedOn,
  },
  {
    id: 'plateau-westerly-everest',
    title: '中科院青藏高原所 · 春末西风水汽跨越喜马拉雅（2026）',
    url: 'https://itpcas.cas.cn/new_kycg/new_kyjz/202606/t20260612_8228168.html',
    note: '介绍2022年5月珠峰北坡高空气球平台观测及相关模型；西风可携带水汽跨越山脉。春末个案不能代表全年所有西风过程，动画也未导入其观测风场。',
    checkedOn,
  },
  {
    id: 'plateau-winter-lulang',
    title: '中科院青藏高原所 · 鲁朗冬春水汽垂直输送（2026）',
    url: 'https://itpcas.cas.cn/new_kycg/new_kyjz/202605/t20260509_8198819.html',
    note: '冬春相对静稳、无强对流条件下的浮空艇观测和模型研究，区分高空西风水汽与局地水汽。不能把水汽输入等同降雨，也不能直接扩展为全年天气。',
    checkedOn,
  },
  {
    id: 'plateau-ali-isotopes',
    title: 'Li et al. · 亚东与阿里降水同位素研究（2026）',
    url: 'https://acp.copernicus.org/articles/26/6407/2026/',
    note: 'Atmospheric Chemistry and Physics，doi:10.5194/acp-26-6407-2026；2021年5月至2023年9月两个站点事件尺度观测。阿里也受季风水汽及季节转换影响；站点不等于整个阿里地区，未导入其气象数值。',
    checkedOn,
  },
  {
    id: 'plateau-terrain-grid',
    title: 'Mapzen / Tilezen · 公开高程瓦片',
    url: 'https://registry.opendata.aws/terrain-tiles/',
    note: '本地tibet-regional-dem为76—101°E、25—38°N的449×257米制网格，约5—6公里抽样。本节球面高差显示50倍；数据来源文件中的40倍为原区域图显示设置。高程能支持地形，不能自行给出风速、降水或植被。',
    checkedOn,
  },
  {
    id: 'plateau-parcel-theory',
    title: 'NOAA · 上升空气团的变化',
    url: 'https://www.noaa.gov/jetstream/upperair/parcel-theory',
    note: '理想空气团上升时膨胀冷却，达到饱和后可凝结。示意气团的温度变化不能充当实测环境温度剖面或城市天气。',
    checkedOn,
  },
  {
    id: 'plateau-cloud-growth',
    title: 'NOAA GFDL · 凝结、云滴增长与降水',
    url: 'https://www.gfdl.noaa.gov/clouds-and-convection/',
    note: '水汽被风输送，冷却后可凝结为云滴或冰晶；粒子继续增长才能形成降水。水汽、云和到达地面的雨是不同状态。',
    checkedOn,
  },
  {
    id: 'plateau-orographic-cloud',
    title: 'UCAR · 山地如何促使云形成',
    url: 'https://scied.ucar.edu/learning-zone/clouds/clouds-form-mountains',
    note: '山地抬升、冷却与成云的一般机制。真实气流还可能绕行，不能把山系画成完全阻断所有水汽的墙。',
    checkedOn,
  },
  {
    id: 'plateau-weather-climate',
    title: 'NOAA · 天气与气候',
    url: 'https://www.noaa.gov/explainers/what-s-difference-between-climate-and-weather',
    note: '一次天气过程与长期气候统计分别阅读。动画不构成三地的长期气温、降水比较数据。',
    checkedOn,
  },
  {
    id: 'plateau-nyingchi-overview',
    title: '林芝市人民政府 · 林芝概况',
    url: 'https://www.linzhi.gov.cn/linzhi/zmlz/zmlz.shtml',
    note: '支持藏东南位置、森林、雅鲁藏布大峡谷、南迦巴瓦与地方文化背景。此处不提取页面未统一统计期的面积、人口或气候数字。',
    checkedOn,
  },
  {
    id: 'plateau-lhasa-climate',
    title: '拉萨市人民政府 · 城市与气候概览',
    url: 'https://www.lasa.gov.cn/lasa/cssy/cs.shtml',
    note: '支持高原半干旱季风气候、干湿季明显和雨季集中的概括；网页未明确全部数值的共同统计期，所以不采用其数值作跨地区排名。',
    checkedOn,
  },
  {
    id: 'plateau-lhasa-valley',
    title: 'NASA · 拉萨河谷三维影像',
    url: 'https://science.nasa.gov/earth/earth-observatory/lhasa-tibet-40334/',
    note: '2005年11月24日ASTER影像，2009年发布；可观察城市、较平缓河谷及周围山地关系。为假彩色历史影像，不能当作当前城市建设、当季植被或气候统计。',
    checkedOn,
  },
  {
    id: 'plateau-ngari-geography',
    title: '阿里地区行政公署 · 自然地理',
    url: 'https://www.al.gov.cn/zjal/zrdl.htm',
    note: '介绍北部高原湖盆、中部高山宽谷、南部高山峡谷，以及寒冷、少雨和内部差异。以狮泉河镇定位区域入口，不将城区点当作全部自然区。',
    checkedOn,
  },
  {
    id: 'plateau-ngari-water-use',
    title: '阿里地区行政公署 · 狮泉河盆地管护与灌溉案例（2023）',
    url: 'https://www.al.gov.cn/info/1035/48267.htm',
    note: '2023年11月20日转载地方报道，包含噶尔县城附近林地冬灌和护林员工作。用于说明水利设施与持续管护；不把报道成效外推全阿里，也不重建未测绘的水渠。',
    checkedOn,
  },
];

export const plateauClimateStages: PlateauClimateStage[] = [
  {
    id: 'arrival', title: '风把远处的水汽带过来',
    question: '地球上的空气运动，怎样联系到西藏？',
    explanation: '先保留亚洲与南侧海洋。夏季，印度洋及孟加拉湾方向的水汽能随环流进入藏东南；西风也能携带水汽，高原内部的蒸发还会补充水分。季节和来流高度不同，到达这里的条件也会改变。',
    lookFor: '看海洋、喜马拉雅和高原的相对位置；辨认南侧来路与西侧来流。',
    interaction: '切换夏季与冬季背景，比较来流方向和经过的位置。',
    feedback: '改变的是来流背景，真实地形保持不变；有水汽来到这里，仍要继续看能否形成云雨。',
    bridge: '空气的来路有了，接下来跟着它进入山地。',
    sourceIds: ['plateau-global-circulation', 'plateau-monsoon-path', 'plateau-moisture-regional-study', 'plateau-westerly-everest', 'plateau-winter-lulang'],
    scope: '季节背景与方向是有研究支持的概念表达；没有导入某日三维风场或实测水汽通量。',
    preferredStepId: 'C4',
  },
  {
    id: 'uplift', title: '同一团空气，遇到真实山地',
    question: '低地、山脊和高原怎样改变空气的经过方式？',
    explanation: '先从南侧低地走向山系，再看高原内部。随地面抬升的空气团进入较低气压环境，膨胀并冷却；实际气流也可能绕过山体，沿谷地进入别处。高差和山系排列一起影响路径。',
    lookFor: '把移动的空气团、下方地形和高程读数对在一起，观察上升发生在哪里。',
    interaction: '回拖到低处，再推进到山地；比较同一团空气的高度与状态。',
    feedback: '山地把路径抬高，空气团随之冷却；仅有抬升，尚不能保证成云或下雨。',
    bridge: '继续追踪这团空气里的水，看冷却以后发生什么。',
    sourceIds: ['plateau-terrain-grid', 'plateau-parcel-theory', 'plateau-orographic-cloud'],
    scope: '地面起伏来自公开高程；空气团路径与状态是解释原理的示意，不是沿该线路的气象观测。',
    preferredStepId: 'C3',
  },
  {
    id: 'cloud', title: '从水汽，到云，再到落地的雨',
    question: '为什么有的空气越山成云，有的仍然没有下雨？',
    explanation: '空气冷却到足够接近饱和时，水汽才能凝结为细小云滴或冰晶。形成云以后，粒子还要继续增长，才可能落到地面成为降水。初始水分不同，同一段抬升也会产生不同结果。',
    lookFor: '依次辨认青色水汽标记、白色云滴，以及落向地面的蓝色降水标记。',
    interaction: '保持山地不变，对比较干与较湿的来流，再回拖凝结和降雨过程。',
    feedback: '湿度条件与抬升共同决定过程；水汽到来、出现云、雨落到地面不是同一件事。',
    bridge: '把这些条件放回不同地方，就能解释西藏内部为什么不一样。',
    sourceIds: ['plateau-parcel-theory', 'plateau-cloud-growth', 'plateau-orographic-cloud'],
    scope: '干湿对比是定性教学情景，不提供湿度、云量或降雨量预测，也不表示整片迎风坡总在下雨。',
    preferredStepId: 'C5',
  },
  {
    id: 'regions', title: '林芝、拉萨、阿里，条件怎样不同',
    question: '都在西藏，为什么不能套用同一种环境解释？',
    explanation: '林芝从藏东南的高山深谷和森林进入；拉萨从高原河谷、干湿季与季节降水进入；阿里从西部湖盆、宽谷和寒冷少雨的背景进入。三地面对的来流、高度与地形组合不同，行政区内部也继续存在差异。',
    lookFor: '每次只换一个地区，保留全域地形和同样的水热问题。',
    interaction: '选择三地，比较位置、地形与有出处的气候说明。',
    feedback: '地区标记定位城区或驻地，气候介绍覆盖相应地域；高差由地形起伏和米制读数读取，底图颜色不是降水或气温。',
    bridge: '环境差异如何进入生活？继续看水、土地和通行怎样被使用。',
    sourceIds: ['plateau-monsoon-path', 'plateau-moisture-regional-study', 'plateau-nyingchi-overview', 'plateau-lhasa-climate', 'plateau-ngari-geography', 'plateau-ali-isotopes', 'plateau-weather-climate'],
    scope: '三地材料是定性地区介绍，不是同一统计期的气候排行；一次模拟云雨不能证明长期气候差异。',
    preferredStepId: 'E1',
  },
  {
    id: 'life', title: '从水与地面，走进城市和生活',
    question: '自然条件怎样成为生活条件，又有哪些事要靠人来完成？',
    explanation: '河谷给聚居和通行提供较平缓的空间，水源、温度与地表条件影响生产和用水。拉萨的河谷城市、林芝的森林与城镇、狮泉河盆地的灌溉管护展示不同关系。设施、劳动、交换与历史继续决定人怎样使用这些条件。',
    lookFor: '沿同一张区域地图看水源、地形与城市参照，再读地方的人如何组织用水和生活。',
    interaction: '保留所选地区，打开它的环境与生活介绍；返回时继续同一个问题。',
    feedback: '自然提供可能与限制，生活方式、文化和城市历史还需要具体人的行动与材料解释。',
    bridge: '带着所选城市进入地方生活、文化与历史，继续追问这些安排怎样形成。',
    sourceIds: ['plateau-lhasa-valley', 'plateau-nyingchi-overview', 'plateau-ngari-water-use'],
    scope: '地图上不生成未经调查的农田、村庄或水渠；地方案例说明具体关系，不由降水量推出文化或族群。',
    preferredStepId: 'E3',
  },
];

export const plateauClimatePlaces: PlateauClimatePlace[] = [
  {
    id: 'nyingchi', title: '林芝 · 藏东南高山深谷', locatorId: 'nyingchi',
    setting: '东南部的森林、深谷与高山相邻。',
    climateExplanation: '印度洋及孟加拉湾方向的夏季水汽与藏东南有联系，深谷、山系和高差参与组织输送与抬升。湿润谷地和高山的条件可以很不同，不能用一片森林概括整个林芝。',
    visibleDifference: '先看东南位置与山谷起伏，再联系水汽来路；高差由地形起伏和米制读数读取。',
    lifeConnection: '森林、水系与河谷共同构成城镇及周边生活的环境。认识工布文化还要继续看地方实践和历史交流。',
    scope: '图点为林芝城区参考，不是雅鲁藏布大峡谷、降雨站或整个林芝行政边界。',
    sourceIds: ['plateau-monsoon-path', 'plateau-nyingchi-overview', 'plateau-winter-lulang'],
    detailStepIds: ['P1', 'E1', 'E3'],
  },
  {
    id: 'lhasa', title: '拉萨 · 高原河谷城市', locatorId: 'lhasa',
    setting: '城区位于较平缓的拉萨河谷，周围仍有高山。',
    climateExplanation: '拉萨的地方资料强调高原半干旱季风气候、干湿季明显与雨季集中。河谷较平缓不等于接近海平面；高度、外部来流与周围山系需要一起看。',
    visibleDifference: '把城区参考点与周围山地放在同一地形中，分清地面相对平缓和绝对海拔。',
    lifeConnection: '河流和较平缓的土地为城市生活提供条件。供水、交通与公共服务需要人的建设与维护，城市形成还要回看历史机构和交流。',
    scope: '拉萨城区参考不代表全市山地与湖盆；气候概览未提供统一的跨地区统计口径。',
    sourceIds: ['plateau-lhasa-climate', 'plateau-lhasa-valley'],
    detailStepIds: ['G4', 'E3', 'H3'],
  },
  {
    id: 'ngari', title: '阿里 · 西部高地与湖盆河谷', locatorId: 'ngari',
    setting: '北部湖盆、中部宽谷和南部峡谷共同组成西部高地。',
    climateExplanation: '阿里自然地理资料强调寒冷、降水稀少且分布不均。站点研究同时发现季风与西风季节转换带来的水汽影响，所以不能把西部说成只有干燥西风、没有水汽的地方。',
    visibleDifference: '保留西部位置，辨认高地与不同谷地；再对照来流季节及地方材料。',
    lifeConnection: '狮泉河盆地的灌溉与管护案例说明：有河水还需要引水、设施和持续劳动，才能服务具体地块与生活。',
    scope: '图点为狮泉河镇参考；阿里研究站与全地区不是同一空间对象，动画不还原实际灌溉渠道。',
    sourceIds: ['plateau-ngari-geography', 'plateau-ali-isotopes', 'plateau-ngari-water-use'],
    detailStepIds: ['E2', 'E3', 'R2'],
  },
];

export const plateauClimateSeasons = [
  {
    id: 'summer', value: 1, title: '夏季季风背景',
    explanation: '南侧海洋水汽与高原南部、东南部的联系更突出；西风和高原内部水汽仍可能参与。',
    sourceIds: ['plateau-monsoon-path', 'plateau-moisture-regional-study', 'plateau-ali-isotopes'],
  },
  {
    id: 'winter', value: 3, title: '冬季西风背景',
    explanation: '关注西风来流和高空水汽；局地蒸发与混合也参与。西风可以带水，水汽到达也可能没有降水。',
    sourceIds: ['plateau-winter-lulang', 'plateau-westerly-everest'],
  },
] as const;

export function getPlateauClimateStage(id: string): PlateauClimateStage {
  return plateauClimateStages.find(stage => stage.id === id) || plateauClimateStages[0];
}

export function getPlateauClimatePlace(id: string): PlateauClimatePlace {
  return plateauClimatePlaces.find(place => place.id === id) || plateauClimatePlaces[0];
}

export function getPlateauClimateSources(ids: readonly string[]): PlateauClimateSource[] {
  return ids.flatMap(id => {
    const source = plateauClimateSources.find(item => item.id === id);
    return source ? [source] : [];
  });
}
