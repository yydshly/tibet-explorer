import { sources, type Source } from './curriculum';
import { placeSources } from './placeProfiles';

export type CityOverviewFacetId = 'position' | 'environment' | 'history' | 'today';
export interface CityOverviewFacet {
  title: string;
  paragraphs: string[];
  sourceIds: string[];
  stepIds: string[];
}
export interface CityOverview {
  id: string;
  name: string;
  administrativeName: string;
  administrativeType: '地级市' | '地区';
  locatorName: string;
  positionLabel: string;
  summary: string;
  naturalSetting: string;
  /** Geographic or cultural relationships to read together, not navigable routes. */
  connections: string[];
  facets: Record<CityOverviewFacetId, CityOverviewFacet>;
}

const overviewSources: Source[] = [
  { id: 'tibet-administrative-2026', title: '西藏自治区民政厅 · 2026年上半年行政区划代码', url: 'https://mzt.xizang.gov.cn/zxzx/tzgg/202607/t20260729_551733.html', note: '2026年7月29日发布，行政区划口径截至2026年6月30日；六个地级市和阿里地区。' },
  { id: 'tibet-regional-overview', title: '西藏自治区人民政府 · 认识西藏', url: 'https://www.xizang.gov.cn/rsxz/', note: '自治区位置、首府和六市一地区概览；2026年10月15日核对。' },
  { id: 'city-commerce-plan-2022', title: '西藏自治区商务厅 · 七市地商贸空间布局', url: 'https://swt.xizang.gov.cn/xwzx/swyw/202206/t20220611_302545.html', note: '2022年6月11日发布的“十四五”商务规划介绍；用于理解不同城市的规划角色，不作为今天设施建成或运营的证明。' },
];
export const cityOverviewSources: Source[] = [...sources, ...placeSources, ...overviewSources];

export const cityOverviewFacets: { id: CityOverviewFacetId; title: string; question: string }[] = [
  { id: 'position', title: '位置与区域', question: '这座城市在哪里，怎样放回西藏全域？' },
  { id: 'environment', title: '地形与环境', question: '山川、水热和生活空间怎样相互联系？' },
  { id: 'history', title: '人文与历史', question: '哪些地方和材料留下了不同年代的变化？' },
  { id: 'today', title: '发展与联系', question: '城市怎样联系周围地区，今天值得观察什么？' },
];

export const cityOverviewContext = {
  title: '先认识西藏的城市与区域',
  summary: '西藏自治区包括拉萨、日喀则、山南、林芝、昌都、那曲六个地级市和阿里地区。先在同一张地图中辨认中南部河谷、东部高山峡谷、北部与西部高原，再逐地认识环境、历史和发展。',
  scaleNote: '城市级介绍涵盖城区与所辖区域；地图圆点定位城区或行政驻地，图上暂不显示市地行政边界。河流、山系与自然分区可以跨越行政边界。',
  sourceIds: ['tibet-administrative-2026', 'tibet-regional-overview', 'geography'],
  arrangements: [
    { title: '中南部河谷', ids: ['lhasa', 'shigatse', 'shannan'], description: '联系拉萨河、年楚河、雅砻河与雅鲁藏布江，认识河谷城市和周围山地。' },
    { title: '东部与东南部', ids: ['chamdo', 'nyingchi'], description: '沿三江高山峡谷与雅鲁藏布大峡谷，比较通行条件、水汽和地方文化。' },
    { title: '北部与西部', ids: ['nagqu', 'ngari'], description: '从藏北高原走向阿里，认识草地、湖盆、河谷和跨区域的历史联系。' },
  ],
};

function facet(title: string, paragraphs: string[], sourceIds: string[], stepIds: string[]): CityOverviewFacet {
  return { title, paragraphs, sourceIds, stepIds };
}

export const cityOverviews: CityOverview[] = [
  {
    id: 'lhasa', name: '拉萨', administrativeName: '拉萨市', administrativeType: '地级市', locatorName: '拉萨城区', positionLabel: '中南部 · 拉萨河谷',
    summary: '从自治区首府认识河谷城市：水与土地承载生活，历史机构、文化遗产和区域服务共同塑造今天的拉萨。',
    naturalSetting: '拉萨河谷、当雄—羊八井盆地与周围山地湖盆', connections: ['拉萨河—雅鲁藏布江水系', '拉萨老城与历史建筑群', '首府与周边城镇'],
    facets: {
      position: facet('从自治区首府看城区与全市', ['拉萨是西藏自治区首府，城区位于拉萨河谷。全市还包括当雄—羊八井盆地、山地与湖盆，城区和周围区域需要放在一起认识。'], ['tibet-regional-overview', 'lhasa-water-plan'], ['G1', 'G2']),
      environment: facet('河谷提供生活空间，山地带来差异', ['拉萨河连接雅鲁藏布江水系，河谷较平缓的土地与水源参与生产、聚居和通行。周围高差、不同地貌和水源条件，使同一市内的生活环境呈现差异。'], ['lhasa-water-plan', 'yarlung-river'], ['G4', 'E1', 'E3']),
      history: facet('用老城、碑刻与建筑读城市变化', ['唐蕃会盟碑和布达拉宫、大昭寺、罗布林卡分别提供文字、建筑与城市生活的历史入口。会盟碑联系821—822年会盟与823年立碑，现存建筑则包含不同时期的建设和使用。'], ['stele', 'unesco'], ['H3', 'K1']),
      today: facet('遗产城市也是区域服务中心', ['拉萨河治理、城市服务与遗产保护发生在同一座生活中的城市。2022年商务规划以中心城区为核心布局商贸与物流；可结合规划、河流和老城，继续观察城市服务怎样连接周围地区。'], ['lhasa-water-plan', 'unesco', 'city-commerce-plan-2022'], ['R2', 'T1']),
    },
  },
  {
    id: 'shigatse', name: '日喀则', administrativeName: '日喀则市', administrativeType: '地级市', locatorName: '日喀则城区', positionLabel: '西南部 · 河谷与喜马拉雅',
    summary: '把年楚河谷的城市与农业、喜马拉雅山地、萨迦和江孜等历史中心放在一起，认识日喀则的多重联系。',
    naturalSetting: '雅鲁藏布江与年楚河河谷、喜马拉雅山地及南侧沟谷', connections: ['年楚河—雅鲁藏布江', '萨迦、江孜与扎什伦布寺', '吉隆等南侧沟谷'],
    facets: {
      position: facet('从河谷城区展开到西南部山地', ['日喀则的空间同时包含雅鲁藏布江、年楚河河谷与喜马拉雅山地。先辨认河谷城市，再看高山和吉隆等南侧沟谷，可以理解全市不同地方之间的关系。'], ['shigatse-survey', 'yarlung-river'], ['G2', 'G4']),
      environment: facet('高山冰雪与农业河谷共同组成地方', ['山地高差影响气温、水分与通行条件，河谷水源和土地则参与青稞等生产。珠穆朗玛峰是一处重要山地对象；认识全市环境，还要对照河谷、山坡与南侧沟谷。'], ['shigatse-survey', 'yarlung-river'], ['C3', 'C5', 'P2']),
      history: facet('多个地方中心留下不同历史线索', ['萨迦连接地方机构、蒙古元朝关系与艺术材料；扎什伦布寺联系班禅相关历史，江孜还有白居寺、宗山等对象。把这些地方分别放回年代与用途，才能看见区域历史的变化。'], ['shigatse-heritage', 'history-overview', 'met-art'], ['H2']),
      today: facet('河谷生产、区域服务与南向联系', ['2022年商务规划以桑珠孜区为中心，提出与江孜、白朗、拉孜等地协同，并联系面向南亚的商贸。地方认识可同时观察河谷生产、交通服务和遗产维护，再由具体资料讨论发展变化。'], ['city-commerce-plan-2022', 'shigatse-survey'], ['R2', 'T1']),
    },
  },
  {
    id: 'shannan', name: '山南', administrativeName: '山南市', administrativeType: '地级市', locatorName: '泽当城区', positionLabel: '南部 · 雅鲁藏布江与雅砻河',
    summary: '从泽当与两条河的关系进入山南，连接河谷生活、早期历史中心、寺院建筑和今天的地方文化。',
    naturalSetting: '雅鲁藏布江中游、雅砻河谷与南侧喜马拉雅山地', connections: ['雅砻河—雅鲁藏布江', '泽当、桑耶与雍布拉康', '河谷聚落与南侧山地'],
    facets: {
      position: facet('用两条河认识山南', ['山南位于西藏南部，泽当是认识城市生活的参照。雅砻河与雅鲁藏布江中游把河谷聚落联系起来，向南又可认识喜马拉雅山地和沟谷。'], ['yarlung-river', 'shannan-valley', 'shannan-heritage'], ['G2', 'G4']),
      environment: facet('河谷、湖泊和山地提供不同条件', ['河流、水源与谷地土地参与农业、聚居和地方往来。山南还包含湖泊和山地，比较这些环境有助于理解水热、高差与生活安排怎样相互影响。'], ['yarlung-river', 'shannan-valley'], ['E1', 'E3', 'P3']),
      history: facet('从雅砻历史线索读地方中心变化', ['雍布拉康与桑耶寺为早期历史、宗教和建筑提供具体入口，后来帕竹政治又呈现地方中心与制度关系的变化。以各自的文物、文献和现存建筑为材料，可以把不同历史时期连起来。'], ['shannan-heritage', 'history-overview', 'phagmodru'], ['H2']),
      today: facet('把城市服务、河谷生产和文化放在一起', ['2022年商务规划围绕乃东及周边地区提出藏中南商贸和冷链物流联系。扎西曲登社区的藏戏实践与河谷生产、水生态，提供认识当代山南的地方入口。'], ['city-commerce-plan-2022', 'shannan-valley', 'yarlung-river'], ['R2', 'T1']),
    },
  },
  {
    id: 'nyingchi', name: '林芝', administrativeName: '林芝市', administrativeType: '地级市', locatorName: '林芝城区', positionLabel: '东南部 · 高山深谷与森林',
    summary: '从藏东南城市与山谷认识林芝：雅鲁藏布大峡谷和南迦巴瓦解释环境差异，工布文化与城镇发展补充人的历史。',
    naturalSetting: '雅鲁藏布大峡谷、南迦巴瓦周围高山深谷与森林景观', connections: ['雅鲁藏布大峡谷与南迦巴瓦', '鲁朗与工布地方文化', '藏东与藏中南地区'],
    facets: {
      position: facet('在藏东南找到林芝与周围山谷', ['林芝位于藏东南，城区是进入周围河谷和城镇的参照。雅鲁藏布大峡谷、南迦巴瓦与鲁朗等地方共同组成认识区域的空间线索。'], ['nyingchi-profile', 'lulang-profile'], ['G2', 'P1']),
      environment: facet('输送、抬升和高度共同参与水热差异', ['来自外部的空气与水汽遇到复杂山地，地形抬升和高度变化参与云雨及环境差异。林芝的森林、谷地和高山应结合具体位置与坡面理解，再把局部演示放回这片区域。'], ['nyingchi-profile', 'moisture'], ['C4', 'C5', 'E1']),
      history: facet('地方文化在生活和交流中形成', ['工布文化连接地方服饰、音乐、节庆与社区实践，鲁朗提供居住、牧场和森林相邻的具体入口。自然环境提供材料与生活背景，历史交流和人的组织继续解释文化形成。'], ['nyingchi-profile', 'lulang-profile'], []),
      today: facet('城镇联系与生态旅游一起观察', ['2022年商务规划把林芝放在连接藏东与藏中南地区的商贸物流关系中。结合鲁朗建设资料，可继续观察城镇服务、旅游活动、社区生活与森林河谷保护的关系。'], ['city-commerce-plan-2022', 'lulang-profile', 'nyingchi-profile'], ['R2', 'T1']),
    },
  },
  {
    id: 'nagqu', name: '那曲', administrativeName: '那曲市', administrativeType: '地级市', locatorName: '那曲城区', positionLabel: '北部 · 高原草地与湖盆',
    summary: '以那曲认识藏北高原，把草地、水源、城镇服务与牧业安排联系起来，再从考古材料阅读更早的人群活动。',
    naturalSetting: '藏北草地、湖盆、山地与水源共同组成的高原环境', connections: ['藏北草地与湖盆', '羌塘的跨区域保护', '青藏地区联系'],
    facets: {
      position: facet('从藏北城市进入周围高原', ['那曲是认识藏北高原的城市入口，城区周边处在唐古拉与念青唐古拉山系之间。把城市放回草地、湖盆和水源的关系中，才能理解城区与广大所辖区域的不同尺度。'], ['nagqu-grassland', 'geography'], ['G2', 'G4']),
      environment: facet('高度、季节与水源影响生活安排', ['高海拔、低温和季节变化为生产与通行带来条件和限制，草地与水源也影响活动安排。认识具体地方时，可比较地形、可用水与季节，再讨论技术和服务怎样改变使用条件。'], ['nagqu-grassland', 'society'], ['C3', 'E2', 'E3']),
      history: facet('把史前活动与今天生活分开读、连起来想', ['尼阿底的石器与地层为高海拔人群活动提供证据，其中一部分活动可追溯至距今约4万至3万年。今天的牧业生活还要结合具体社区、生产技术、季节安排与交换研究。'], ['prehistory', 'prehistory-2026', 'society'], ['H1']),
      today: facet('生产、生态管护与区域服务相互联系', ['羌塘保护区跨那曲与阿里，生态管护把草地、湿地和野生动物放在跨区域尺度中认识。2022年商务规划提出连接青藏地区的物流节点角色，可继续研究交通服务与地方生活的联系。'], ['changtang-protection', 'city-commerce-plan-2022', 'railway'], ['R2', 'T1']),
    },
  },
  {
    id: 'chamdo', name: '昌都', administrativeName: '昌都市', administrativeType: '地级市', locatorName: '昌都城区', positionLabel: '东部 · 三江高山峡谷',
    summary: '从三江和高山峡谷认识昌都的区域位置，再把河流交汇的城市、史前遗址、交换历史和跨省联系放在同一地图中。',
    naturalSetting: '金沙江、澜沧江、怒江流域与藏东高山峡谷', connections: ['金沙江、澜沧江、怒江流域', '昂曲与扎曲交汇', '四川、云南、青海联系'],
    facets: {
      position: facet('在藏东三江之间辨认城市与流域', ['昌都位于藏东高山峡谷区域，金沙江、澜沧江和怒江组织不同流域。城区附近的昂曲与扎曲交汇提供局部参照，周围区域则需要结合多条河谷与山地一起阅读。'], ['chamdo-water', 'chamdo-heritage'], ['G2', 'G4']),
      environment: facet('沿谷与跨山形成不同空间条件', ['纵向河谷提供沿线活动的空间，横向跨山则面对高差与山口。把河流、坡面和聚落放在一起，能够解释环境为什么影响通行，以及交通工程为何需要具体选线。'], ['chamdo-water', 'geography'], ['P2', 'R2']),
      history: facet('遗址、寺院和交换留下不同年代的材料', ['卡若遗址提供新石器时代房屋、器物与生产材料，强巴林寺则连接后来宗教建筑与城市空间。茶马相关地方资料补充交换历史，让史前生活、后来的机构与今天城市有各自的证据入口。'], ['chamdo-heritage', 'chamdo-culture'], ['H2']),
      today: facet('藏东城市联系周围省区', ['2022年商务规划以卡若区和昌都经开区为核心，提出加强与四川、云南、青海的商贸往来。结合山地通行和文化遗产，可观察城市服务怎样连接周围地区，以及新的联系怎样改变地方活动。'], ['city-commerce-plan-2022', 'chamdo-culture'], ['R2', 'T1']),
    },
  },
  {
    id: 'ngari', name: '阿里', administrativeName: '阿里地区', administrativeType: '地区', locatorName: '狮泉河镇', positionLabel: '西部 · 高原、湖盆与河谷',
    summary: '以狮泉河定位阿里，再展开西部高原、札达河谷、古格与托林的历史联系，理解区域服务、遗产与生态维护。',
    naturalSetting: '西部高原、湖盆、山地与札达象泉河谷', connections: ['狮泉河与藏西北城镇联系', '象泉河谷与札达土林', '古格、托林与藏印交流'],
    facets: {
      position: facet('阿里是地区，以狮泉河作为定位参照', ['阿里位于西藏西部，行政类型是地区，狮泉河镇是地图上的驻地参照。认识全域还要展开湖盆、山地和河谷，并把札达等具体地方放回西部空间。'], ['tibet-administrative-2026', 'geography', 'ngari-zanda'], ['G2', 'G4']),
      environment: facet('从狮泉河盆地看水怎样被取用和维护', ['2023年地方报道记录了噶尔县护林员通过水渠闸口为林地灌溉，并在入秋降水减少时进行冬灌。这里把气候条件接到了具体生活：水要经过引流、调配和持续管护，才能被利用。先在狮泉河定位这个案例，再比较札达河谷等不同地方，不能用一个盆地代表整个阿里的环境。'], ['ngari-valley'], ['E2', 'E3']),
      history: facet('把古格与托林放回知识交流网络', ['古格遗址与托林联系地方政治、宗教和艺术；11—12世纪藏印交流涉及教师、译者、文本、作品与赞助。由具体地方进入这些材料，能够理解远距离联系怎样参与文化形成。'], ['ngari-zanda', 'met-exchange', 'met-art'], ['K2', 'H2']),
      today: facet('区域服务、村镇生活与遗产维护', ['2022年商务规划提出面向藏西北的商贸、物流与旅游消费服务方向。札布让村庄提供遗产与村镇生活案例，2023年狮泉河盆地的灌溉管护报道则说明环境维护需要设施和持续工作。先分清这两处地点，再比较不同的地方机会；规划与当年报道都不直接等于今天的成效。'], ['city-commerce-plan-2022', 'ngari-zanda', 'ngari-valley'], ['R2', 'T1']),
    },
  },
];

export function getCityOverview(id: string): CityOverview | undefined {
  return cityOverviews.find(city => city.id === id);
}
