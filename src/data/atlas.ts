import {contemporaryCasesForStep} from './contemporaryCases';
import { chapters, sources, type Source } from './curriculum';
import { placeSources } from './placeProfiles';
import { atlasReferenceByHotspot, atlasVerifiedReference, verifiedPlaceReferences } from './placeProvenance';

export type AtlasThemeId = 'environment' | 'people' | 'history' | 'development';

export interface AtlasHotspot {
  id: string;
  title: string;
  longitude: number;
  latitude: number;
  mapLabel: string;
  locatorName: string;
  locatorKind: 'settlement-reference' | 'published-approximate-location';
  coordinateSourceId: string;
  coordinateSourceUrl: string;
  coordinateDecimalPlaces: 1;
  /** A place or regional entry point, never a surveyed object footprint. */
  locationNote: string;
  regionId: string;
  summary: string;
  whyHere: string;
  questionId: string;
  /** Alias consumed by the shared scene and existing chapter navigation. */
  stepId: string;
  chapterId: string;
  relatedQuestionIds: string[];
  sources: string[];
  period?: string;
  /** A source-backed material entry without a dedicated event reconstruction. */
  materialOnly?: boolean;
  detailParagraphs?: string[];
  themes: AtlasThemeId[];
}

export interface AtlasTheme {
  id: AtlasThemeId;
  title: string;
  kicker: string;
  question: string;
  summary: string;
  bridge: string;
  nextId: AtlasThemeId | null;
  hotspots: AtlasHotspot[];
}

const primaryAtlasEntries:Record<string,string>={K4:'lhasa-buildings',H2:'yarlung-polity',H4:'lhasa-institutions',R1:'yarlung-life',R2:'tholing-culture',R3:'southeast-clouds',M1:'lhasa-railway',M2:'nyingchi-living-place',M3:'lhasa-buildings',T1:'lhasa-buildings',T2:'lhasa-buildings',T3:'lhasa-buildings'};

type HotspotDraft = Omit<AtlasHotspot, 'stepId' | 'chapterId' | 'themes' | 'locationNote' | 'longitude' | 'latitude' | 'mapLabel' | 'locatorName' | 'locatorKind' | 'coordinateSourceId' | 'coordinateSourceUrl' | 'coordinateDecimalPlaces'>;

function hotspot(theme: AtlasThemeId, value: HotspotDraft): AtlasHotspot {
  const chapter = chapters.find(item => item.steps.some(step => step.id === value.questionId));
  if (!chapter) throw new Error(`Atlas question does not exist: ${value.questionId}`);
  const reference = atlasVerifiedReference(value.id), entry = atlasReferenceByHotspot[value.id];
  if (!reference || !entry) throw new Error(`Atlas location has no archived source: ${value.id}`);
  return {
    ...value,
    longitude: reference.longitude,
    latitude: reference.latitude,
    mapLabel: entry.mapLabel,
    locatorName: reference.name,
    locatorKind: reference.kind,
    coordinateSourceId: `locator-${reference.id}`,
    coordinateSourceUrl: reference.sourceUrl,
    coordinateDecimalPlaces: reference.displayDecimalPlaces,
    locationNote: `${entry.scope} ${reference.scope}`,
    relatedQuestionIds: [...new Set([value.questionId, ...value.relatedQuestionIds,...Object.entries(primaryAtlasEntries).filter(([,id])=>id===value.id).map(([step])=>step)])],
    sources: [...new Set([...value.sources,...(value.id==='lhasa-buildings'?['potala-spatial','potala-1994-evaluation']:[]),...(value.relatedQuestionIds.includes('P1')?['local-terrain']:[]),...Object.entries(primaryAtlasEntries).filter(([,id])=>id===value.id).flatMap(([step])=>contemporaryCasesForStep(step).flatMap(item=>item.sources.map(source=>source.id))), `locator-${reference.id}`])],
    stepId: value.questionId,
    chapterId: chapter.id,
    themes: [theme],
  };
}

const environmentHotspots: AtlasHotspot[] = [
  hotspot('environment', {
    id: 'himalaya-relief', title: '喜马拉雅与高原起伏', regionId: 'shigatse',
    summary: '从西藏南侧山系进入造山过程，再回到今天的高原、山脊和河谷。形成模型解释挤压与增厚，地区高程地图说明今天高低怎样排列，两种画面回答不同问题。',
    whyHere: '先在完整高原中认出南缘山地，再打开剖面，才能知道局部模型解释的是哪类地形，以及它与周边高地的关系。',
    questionId: 'G4', relatedQuestionIds: ['G3', 'G4', 'C3'], sources: ['geography', 'tectonics', 'terrain-data', 'parcel-theory'],
  }),
  hotspot('environment', {
    id: 'plateau-energy', title: '西藏的热量与季节背景', regionId: 'lhasa',
    summary: '位置先给出北半球与纬度背景。随后拉远到地球，理解地轴、照射和季节，再看能量进入、反射、储存与散失；这些机制共同参与地方环境，不能直接换算为某地温度。',
    whyHere: '在地图上保留西藏，再切换到地球尺度的季节与能量演示。看完返回原处，继续追问高海拔与空气输送怎样改变地方条件。',
    questionId: 'C1', relatedQuestionIds: ['C1', 'C2'], sources: ['geography', 'seasons', 'energy-budget'],
  }),
  hotspot('environment', {
    id: 'southeast-clouds', title: '藏东南：水汽遇到山地', regionId: 'nyingchi',
    summary: '先沿印度洋、孟加拉湾方向找到夏季水汽与藏东南的联系，再走近山地，看抬升、冷却、成云和可能的降水。换季、一次天气和山地景观各有自己的时间与空间范围。',
    whyHere: '林芝与雅鲁藏布大峡谷提供具体地方背景。宏观输送解释水从哪里来，局部过程解释遇山以后怎样变化，返回地图才能比较它与藏北、西部的差异。',
    questionId: 'C5', relatedQuestionIds: ['C4', 'C5', 'C6', 'C7', 'P1'],
    sources: ['monsoon-moisture', 'winter-moisture', 'cloud-process', 'nyingchi-profile', 'weather'],
  }),
  hotspot('environment', {
    id: 'northern-plateau', title: '藏北：高地、湖盆与变化', regionId: 'nagqu',
    summary: '在同一高程底图上比较藏北与藏东南，再区分季节循环和多年变化。某处湖泊或冰川的变化需要自己的观测时期与变量，全球变暖机制帮助提问，不能代替当地证据。',
    whyHere: '藏北高地与湖盆使“西藏内部并不相同”成为可定位的问题。先看它与南侧河谷、东南山地的相对位置，再进入地区比较与多年变化的读图方法。',
    questionId: 'E2', relatedQuestionIds: ['E1', 'E2', 'C8', 'C9'], sources: ['geography', 'terrain-data', 'warming', 'weather', 'nagqu-grassland'],
  }),
  hotspot('environment', {
    id: 'zanda-landscape', title: '札达：土林与象泉河谷', regionId: 'ngari',
    summary: '在西部高地中找到象泉河谷与札达土林，先看地貌轮廓和周边水系，再追问形成过程。回到同一张地图，还能沿附近的托林、古格进入历史交流与今天的村镇生活。',
    whyHere: '一处景观有自己的周围环境。把土林、谷地和村镇放在同一地方，能够从自然形成问题继续走到人的使用与保护。',
    questionId: 'P2', relatedQuestionIds: ['P2'], sources: ['geography', 'ngari-valley', 'ngari-zanda'],
  }),
];

const peopleHotspots: AtlasHotspot[] = [
  hotspot('people', {
    id: 'yarlung-life', title: '山南：河谷与地方生活', regionId: 'shannan',
    summary: '沿雅鲁藏布江与雅砻河谷，辨认水、土地、聚落和通行的关系。自然条件提供生活背景；生产技术、交换、社区组织与人的选择，继续塑造地方生活。',
    whyHere: '把环境中的河谷接到真实生活问题：人怎样使用水与土地，又怎样通过劳动和组织改变使用方式。由此进入文化，而不让气候直接决定文化。',
    questionId: 'E3', relatedQuestionIds: ['E3', 'P3'], sources: ['yarlung-river', 'shannan-valley', 'society'],
  }),
  hotspot('people', {
    id: 'lhasa-buildings', title: '拉萨：建筑怎样被使用', regionId: 'lhasa',
    summary: '从拉萨河谷进入历史建筑群，把院落、殿堂、材料与使用者联系起来。现存建筑、始建叙述和后续扩建要分别认识，概念院落帮助读结构，真实形制仍以遗产材料为准。',
    whyHere: '建筑处在城市和历史之中。先定位拉萨，再走近空间与用途。由这里延伸的藏戏案例讨论跨地方的表演与学习关系；城区点不代表演出场地或某个传承社区。',
    questionId: 'K1', relatedQuestionIds: ['K1','K4'], sources: ['unesco', 'lhasa-water-plan','opera-practice','opera-transmission'],
  }),
  hotspot('people', {
    id: 'tholing-culture', title: '托林：信仰、翻译与艺术', regionId: 'ngari',
    summary: '11—12世纪的藏印交流涉及教师、译者、文本、艺术作品与赞助。由托林进入信仰和艺术，既看外部知识怎样传入，也看地方怎样解释、制作与创造。',
    whyHere: '托林让宗教与艺术有具体的地域入口。自然通行条件只是背景，具体交流还依靠人物、文本、机构和历史行动；节点关系不等于精确古代道路。',
    questionId: 'K2', relatedQuestionIds: ['K2', 'K3'], sources: ['met-exchange', 'met-art', 'ngari-zanda'], period: '11—12世纪及其后续传承',
  }),
  hotspot('people', {
    id: 'nagqu-community', title: '那曲：草地上的生活安排', regionId: 'nagqu',
    summary: '从草地、水源与季节变化进入牧业生活，再看技术、交换、家庭与社会组织。社区研究需要具体地点和调查日期，不能把现代人的生活当作一幅永远不变的传统风貌。',
    whyHere: '地图先提供藏北环境，再把问题交给生活资料：谁在使用空间，怎样安排工作，哪些实践在延续或改变。环境与文化由此建立联系，人的行动仍然清楚可见。',
    questionId: 'E3', relatedQuestionIds: ['E3','K4'], sources: ['nagqu-grassland', 'society', 'history-overview'],
  }),
];

const historyHotspots: AtlasHotspot[] = [
  hotspot('history', {
    id: 'nyade-evidence', title: '尼阿底：早期人群活动', regionId: 'nagqu',
    summary: '尼阿底的石器、地层与测年，使高原早期人群活动成为可以研究的问题。2018年研究介绍采用距今约4万至3万年，2026年介绍采用约4.5万至3万年；应保留各自年代口径。',
    whyHere: '先回到藏北湖盆环境，再读人留下的材料。环境说明适应问题，石器与地层才支持人群活动的历史认识。',
    questionId: 'H1', relatedQuestionIds: ['H1'], sources: ['atlas-prehistory-2018', 'atlas-prehistory-2026'], period: '2018年报道约4万—3万年前；2026年报道约4.5万—3万年前',
    detailParagraphs: [
      '中科院古脊椎所2018年的研究介绍说明，团队用地层中的石英砂开展光释光测年，将所讨论的人群活动年代放在距今约4万至3万年。石器所处的原生层位与测年方法，是理解这一结论的关键。',
      '2026年同一研究所介绍石叶技术的新研究时，将遗址年代表述为约4.5万至3万年，并讨论技术来源的多种可能解释。两份材料各有研究问题与年代口径，不能拼成一个没有来源的新数值，也不能由活动证据直接确定现代族群身份。',
    ],
  }),
  hotspot('history', {
    id: 'yarlung-polity', title: '雅砻与拉萨：吐蕃的空间线索', regionId: 'shannan',
    summary: '以雅砻与拉萨的联系进入7—9世纪吐蕃时期，分别认识政治组织、战争、使节、联姻与文化交流。传说、建筑始建叙述和可核对的文献需要分别阅读。',
    whyHere: '同一片河谷既有自然生活条件，也有后来的政治历史。由具体地方进入时期全貌，再沿具名事件与材料追问变化，而不以地形推出政权历史。',
    questionId: 'H2', relatedQuestionIds: ['H2'], sources: ['history-overview', 'shannan-heritage'], period: '7—9世纪',
    detailParagraphs: [
      '国家民委的历史综述将雅砻与7世纪初松赞干布时期的政治组织变化相连，并记述定都逻娑，即今拉萨。这给雅砻—拉萨提供一条空间线索，现代底图中的点位并非当时政权范围的复原。',
      '该综述还分别介绍唐蕃联姻、使节、文化交流与战争。研究整个7—9世纪，应继续查找对应事件和材料；地方传说、建筑始建叙述与可核对文献具有不同的证据身份。',
    ],
  }),
  hotspot('history', {
    id: 'lhasa-stele', title: '唐蕃会盟：事件留下碑刻', regionId: 'lhasa',
    summary: '821—822年唐蕃会盟，823年立碑。藏汉两种文字记录盟文和参与者；将事件年代、立碑年代与今天可读的拓本对照，能建立地点、行动与材料之间的证据链。',
    whyHere: '在拉萨停到一个可以核对的历史对象前，辨认文字究竟记录什么。它说明一组具体事件，之后仍要回到更长时段研究关系怎样变化。',
    questionId: 'H3', relatedQuestionIds: ['H3'], sources: ['stele', 'atlas-stele-location'], period: '821—822年会盟；823年立碑',
    detailParagraphs: [
      '中国国家博物馆的《唐蕃会盟碑拓本》介绍将会盟置于长庆元年至二年，即821—822年，将立碑置于长庆三年，即823年。碑刻记载盟文，以及参加会盟人员的职衔与姓名。',
      '拉萨大昭寺前的碑刻可用地方官方材料定位；馆藏页面展示的是拓本材料。原碑、拓本和当前结构示意有不同身份，事件年代也应与材料形成时间分别阅读。',
    ],
  }),
  hotspot('history', {
    id: 'tholing-exchange', title: '1042年：阿底峡与托林联系', regionId: 'ngari',
    summary: '大都会博物馆的交流材料记载，阿底峡1042年前往西藏，曾经过加德满都，抵达西藏西部托林，后来进入中部地区。把它放回11—12世纪的学习、翻译与艺术交流。',
    whyHere: '从西部地方回看与南亚的知识联系。材料支持人物与地点节点，地图上的联系帮助理解方向；沿途精确道路仍需另有证据。',
    questionId: 'H2', relatedQuestionIds: ['H2'], sources: ['met-exchange'], period: '1042年；11—12世纪交流背景', materialOnly: true,
    detailParagraphs: [
      '大都会艺术博物馆《Tibet and India》展览材料明确记述：阿底峡在1042年前往西藏，经过加德满都后抵达西藏西部托林，后来进入中部地区。这里据此标出托林这一知识交流节点。',
      '展览把这个案例放在11—12世纪西藏与北印度佛教机构的交流中，介绍教师、学习者、文本和艺术形式之间的联系。人物曾到达的地点，并不构成每一段道路都已经查明的精确行程。',
      '本入口提供可核对的材料阅读。目前没有托林1042年事件的专门三维复原；需要更长时段背景时，可继续阅读全史时期索引。',
    ],
  }),
  hotspot('history', {
    id: 'gyantse-1904', title: '江孜：1904年军事行动', regionId: 'shigatse',
    summary: '西藏自治区文化和旅游厅的江孜材料记述了1904年英国军事行动与江孜宗山抗英战斗。把事件放回江孜的位置，并区分当年的战斗、后来修缮与今天的纪念展示，能够避免用现存外观代替历史现场。',
    whyHere: '从周边通行回到具体历史事件，理解地理位置为何进入政治与军事问题。山口和距离提供条件，事件结果仍需人物、制度和文献解释。',
    questionId: 'H4', relatedQuestionIds: ['H4'], sources: ['atlas-gyantse-1904'], period: '1904年', materialOnly: true,
    detailParagraphs: [
      '西藏自治区文化和旅游厅2025年9月发布的江孜历史城区文章，将1904年的宗山抗英战斗与江孜的城堡、街区等地方对象相连。此处保留具名事件和发生地点，不加入未经独立核对的伤亡数字或战场复原。',
      '同一文章继续介绍江孜历史城区、相关纪念场馆与保护规划。它同时包含历史叙述和当代保护介绍；今天的展陈、修缮状态不能直接视为1904年的现场形制。',
      '本入口提供事件材料与原文。现有拉萨建筑年代演示不是江孜战斗演示；若继续阅读该章节，应把它作为理解建筑、时间与材料关系的通用背景。',
    ],
  }),
  hotspot('history', {
    id: 'lhasa-institutions', title: '拉萨：制度与社会的转变', regionId: 'lhasa',
    summary: '拉萨的布达拉宫建筑与制度变化相连。人物机构资料记载1645年开始建设；现代制度史则要分别认识1951年协议、1959年政治冲突与改革、1965年自治区成立等节点，并核对各自地点与材料。',
    whyHere: '同一个地方跨越多个时期，适合比较政治机构、建筑用途和社区经验。时间线继续保留元、帕竹、清代及20世纪等阶段，当前地图只定位材料入口。',
    questionId: 'H4', relatedQuestionIds: ['H4'], sources: ['unesco', 'dalai-history', 'atlas-autonomy-2015', 'atlas-reform-2009'],
    period: '17世纪；20世纪中叶以来',
    detailParagraphs: [
      '达赖喇嘛办公室的人物历史介绍记述，五世达赖喇嘛在1642年于日喀则获得宗教与政治领导地位，并在1645年讨论和开始拉萨布达拉宫建设。1642年的地点应与拉萨建筑点位分开；这一机构叙述也应注明来源身份。',
      'UNESCO遗产资料说明布达拉宫、大昭寺与罗布林卡具有不同位置、功能及建筑历史。现存建筑包含后续扩建与维护，不宜当作7世纪或其他时期未经变化的外观。',
      '国务院新闻办公室白皮书记述1951年协议在北京签订，1959年原西藏地方政府被解散并推行改革，1965年西藏自治区成立。这些是不同的制度节点，不能都标作拉萨同一建筑里的事件；白皮书体现发布机构的历史叙述，社会生活变化仍需对应地方材料继续研究。',
    ],
  }),
];

const developmentHotspots: AtlasHotspot[] = [
  hotspot('development', {
    id: 'lhasa-railway', title: '拉萨：铁路接入更大网络', regionId: 'lhasa',
    summary: '2006年7月1日青藏铁路全线通车，为交通史提供一个明确节点。把拉萨与沿线地区放进网络，再研究服务、成本、使用与生态维护，才能理解实际可达性怎样变化。',
    whyHere: '从历史中的通道走到现代交通，在同一张地图上比较联系的方式。线路存在、历史开通、某日班次与社会影响是四类不同信息。',
    questionId: 'M1', relatedQuestionIds: ['M1'], sources: ['railway', 'statistics-2025'], period: '2006年7月1日全线通车',
  }),
  hotspot('development', {
    id: 'chamdo-connections', title: '昌都：河谷与地区交换', regionId: 'chamdo',
    summary: '金沙江、澜沧江与怒江组成藏东不同流域，河谷与山口影响通行选择。借昌都的地方材料比较历史交换和现代交通，分清知识、货物与人员的节点联系，以及真正得到核实的道路。',
    whyHere: '地形不只塑造景观，也提出补给、过山和组织交换的问题。由河谷回到网络，能够继续讨论周边联系，而不把一条线直接解释为战略结论。',
    questionId: 'R2', relatedQuestionIds: ['R2'], sources: ['chamdo-water', 'chamdo-culture', 'met-exchange', 'railway'],
  }),
  hotspot('development', {
    id: 'changtang-stewardship', title: '羌塘：水、草地与共同维护', regionId: 'nagqu',
    summary: '羌塘保护范围跨那曲与阿里，草地、湿地、野生动物与人的生产使用同一空间。2022年的管护报道提供具体行动入口；流域又让水的储存、输送与使用超出一个地区。',
    whyHere: '先回到自然范围，再问保护由谁实施、与什么生活相连、影响需要怎样记录。把生态价值与维护责任放在具体地方，能接续环境主线。',
    questionId: 'M3', relatedQuestionIds: ['M3', 'R1'], sources: ['changtang-protection', 'water', 'society'], period: '2022年管护材料；其他变化另查对应时期',
  }),
  hotspot('development', {
    id: 'nyingchi-living-place', title: '林芝地区：新通道与地方生活', regionId: 'nyingchi',
    summary: '2021年拉林铁路开通后，米林彩门村的具名采访把交通、民宿、学生出行与产品外销联系起来。地区统计、地方访谈与牧民社区田野有不同范围和年代，需要对照使用，不能把期待当成所有家庭已经实现的成效。',
    whyHere: '从景观和文化返回仍在生活的地方，认识发展改变谁的工作与空间。把兴趣保存成主题问题与候选路线，前后站点沿认识目标衔接，实际行程再核实交通与开放。',
    questionId: 'M2', relatedQuestionIds: ['M2', 'T1', 'T2', 'T3'], sources: ['milin-caimen-interviews-2021','bomi-lalin-opening-2021','cwru-pala-fieldwork-account-2009','statistics-2025'],
    period: '地方建设历史材料、2025年统计与2025—2035年规划',
  }),
  hotspot('development', {
    id: 'shigatse-neighbours', title: '日喀则：周边与公共事务', regionId: 'shigatse',
    summary: '把南侧山地、谷地、通行和地方生活放回周边关系，分别讨论交通、生态、边境事务与公共服务。战略意义需要说明议题、主体、时期、成本和责任，不能从“位置重要”直接推出结论。',
    whyHere: '日喀则提供认识西藏南侧山地与地区联系的入口。先有地理位置与具体地方，再查相应历史和政策材料，国家关系与地方经验才不会混成一句口号。',
    questionId: 'R3', relatedQuestionIds: ['R3'], sources: ['geography', 'shigatse-survey', 'history-overview', 'diplomatic-1951', 'tourism-plan'],
  }),
];

export const atlasThemes: AtlasTheme[] = [
  {
    id: 'environment', title: '环境怎样形成', kicker: '01 · 地球环境进入西藏',
    question: '从海陆、热量与空气，到高原、河谷和地方差异，发生了什么？',
    summary: '从完整地球建立亚洲—中国—西藏的位置，再保留周边与高原全景，沿山地、水汽和湖盆走入具体过程。地图回答“在哪里”，演示回答“怎样发生”，返回地图比较这些条件怎样组合。',
    bridge: '环境已经有了空间与机制。沿河谷和草地继续，看人怎样使用水、土地与通道，并通过技术、组织和交流创造多样生活。',
    nextId: 'people', hotspots: environmentHotspots,
  },
  {
    id: 'people', title: '人怎样生活与创造', kicker: '02 · 从环境走到人文',
    question: '同一片高原上，人怎样生活、交流，并形成多样文化？',
    summary: '回到完整西藏地图，从山南河谷、拉萨建筑、阿里交流和藏北生活走近使用者。环境提供条件，人的行动、技术、信仰与制度塑造文化；真实作品与生活材料继续解释细节。',
    bridge: '生活和文化不断变化。接下来沿地点与材料进入时间，把早期人群活动、具名事件与制度变化放回各自的年代。',
    nextId: 'history', hotspots: peopleHotspots,
  },
  {
    id: 'history', title: '事件怎样改变地方', kicker: '03 · 在地图上走进时间',
    question: '哪些人、事件与材料，能说明西藏怎样走到今天？',
    summary: '以考古、会盟碑、交流人物、建筑与近现代事件为地图入口。地图定位发生的地方，时间线保留九个阶段，文物与文献说明证据；政治组织、宗教文化和普通生活需要相互参照。',
    bridge: '历史带来了今天的制度、生活和交往。把时间继续推近，研究交通、生态、公共服务与文旅利用怎样改变地方，又需要怎样维护。',
    nextId: 'development', hotspots: historyHotspots,
  },
  {
    id: 'development', title: '今天怎样联系与发展', kicker: '04 · 从历史走向今天',
    question: '通道、生态与生活怎样相连，地方价值怎样被使用与维护？',
    summary: '在同一张地图上比较铁路网络、藏东河谷、羌塘管护与地方社区。历史开通、年度统计、建设报道和未来规划分别阅读，把周边关系与发展价值落在具体议题，最后形成自己的认识与探索路线。',
    bridge: '带着已理解的问题继续探索：从地图选地方，把观察目标与来源保留下来，安排可修改的候选路线，再把新见闻接回环境、人文与历史。',
    nextId: null, hotspots: developmentHotspots,
  },
];

/** Connections between these entries represent knowledge order, never surveyed roads or event routes. */
export const atlasHotspots: AtlasHotspot[] = atlasThemes.flatMap(theme => theme.hotspots);
export const atlasAdditionalSources: Source[] = [
  { id: 'atlas-prehistory-2018', title: '中科院古脊椎所 · 尼阿底遗址研究团队（2018）', url: 'https://ivpp.cas.cn/xwdt/kyjz/201812/t20181205_5207281.html', note: '研究团队的2018年成果介绍，活动年代采用该文约4万至3万年的表述；与2026年的年代口径分别阅读。' },
  { id: 'atlas-prehistory-2026', title: '中科院古脊椎所 · 尼阿底石叶技术研究（2026）', url: 'https://ivpp.cas.cn/xwdt/kyjz/202608/t20260831_8271082.html', note: '研究团队2026年成果介绍采用约4.5万至3万年，并给出技术来源的多种解释，不应改写成唯一迁徙路线。' },
  { id: 'atlas-stele-location', title: '西藏自治区文化和旅游厅 · 大昭寺前会盟碑的地方位置', url: 'https://wlt.xizang.gov.cn/ztzl_69/tuanjie/202206/t20220616_303285.html', note: '用于核对大昭寺前与八廓街的地方定位；会盟和立碑年代主要对读国家博物馆的拓本说明。' },
  { id: 'atlas-gyantse-1904', title: '西藏自治区文化和旅游厅 · 江孜1904年历史与城区保护', url: 'https://wlt.xizang.gov.cn/ztzl_69/red_lvyou/202509/t20250917_500339.html', note: '2025年9月的官方地方材料；本产品仅采用具名事件、地方对象与保护介绍，不引入伤亡统计或未经核实的战场复原。' },
  { id: 'atlas-autonomy-2015', title: '国务院新闻办公室 · 民族区域自治制度在西藏的成功实践（2015）', url: 'https://www.neac.gov.cn/seac/xwzx/201509/1002541.shtml', note: '国务院新闻办白皮书，由国家民委网站公布；用于制度节点及自治区成立的官方叙述，不代表每个社区的全部社会经验。' },
  { id: 'atlas-reform-2009', title: '国务院新闻办公室 · 西藏民主改革50年（2009）', url: 'https://wsb.xizang.gov.cn/xzjx/bps/201107/t20110713_100981.html', note: '西藏外事办公室转载的2009年白皮书，记述1951年协议与1959年制度变化；材料具有明确的发布机构与历史叙述立场。' },
];
export const atlasLocationSources: Source[] = Object.values(verifiedPlaceReferences).map(reference => ({
  id: `locator-${reference.id}`,
  title: `${reference.sourceId === 'natural-earth-populated-places' ? 'Natural Earth' : reference.sourceId === 'geonames-cn' ? 'GeoNames（CC BY 4.0）' : 'Zhang等（2024）'} · ${reference.name}`,
  url: reference.sourceUrl,
  note: `记录标识：${reference.featureId}。${reference.scope} 原始记录、版本与下载校验见本地atlas-place-references.json。`,
}));
export const atlasSources: Source[] = [...sources, ...placeSources, ...atlasAdditionalSources, ...atlasLocationSources];

export function getAtlasTheme(id: string): AtlasTheme | undefined {
  return atlasThemes.find(theme => theme.id === id || `atlas-${theme.id}` === id);
}

/** The entry globe retains its own hierarchy; all subsequent questions have a map context. */
export function atlasThemeForStep(stepId: string): AtlasTheme | undefined {
  if (stepId === 'G1' || stepId === 'G2') return undefined;
  const hotspot = atlasHotspots.find(item=>item.id===primaryAtlasEntries[stepId])||atlasHotspots.find(item => item.relatedQuestionIds.includes(stepId));
  return hotspot ? getAtlasTheme(hotspot.themes[0]) : undefined;
}

export function atlasHotspotForStep(stepId: string): AtlasHotspot | undefined {
  const theme = atlasThemeForStep(stepId);
  // A shared question can have several material entries; direct links use a
  // stable primary entry, while explicit origin.hotspotId retains a chosen one.
  const primaryEntry=primaryAtlasEntries;
  const primary = theme?.hotspots.find(item => item.id === primaryEntry[stepId]);
  if (primary) return primary;
  return theme?.hotspots.find(item => item.relatedQuestionIds.includes(stepId)) || theme?.hotspots[0];
}
