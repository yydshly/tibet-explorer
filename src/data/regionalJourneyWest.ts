import { verifiedPlaceReferences } from './placeProvenance';
import type { RegionalJourney, RegionalJourneySource } from './regionalJourneyTypes';

/** Checked 2026-10-16. Modern geometry is never presented as an ancient city plan. */
export const westernRegionalSources: RegionalJourneySource[] = [
  {
    id: 'regional-orographic-nasa', title: 'NASA GPM · 山地怎样影响降水', publisher: 'NASA',
    url: 'https://gpm.nasa.gov/resources/faq/what-effect-do-mountainous-orographic-regions-have-measuring-precipitation',
    supports: ['湿空气沿坡抬升、冷却与降水的一般机制。', '不是西藏某次风场、降水量或水汽路径的观测。'],
  },
  {
    id: 'regional-shigatse-geography', title: '日喀则地区概况 · 地形与气候分区', publisher: '日喀则市委网站', date: '2012-01-19',
    url: 'https://rikaze.xzdw.gov.cn/rkzgk/jbqk/201201/t20120119_141109.html',
    supports: ['喜马拉雅南北及北部高原的区域气候差异、干湿季。', '年楚河与雅鲁藏布江河谷、农业和历史对象背景；旧行政名称按发表时期理解。'],
  },
  {
    id: 'regional-nyangchu-water-2024', title: '年楚河流域春灌供用水洽商会', publisher: '西藏自治区人民政府／西藏日报', date: '2024-04-15',
    url: 'https://www.xizang.gov.cn/xwzx_406/bmkx/202404/t20240415_412095.html',
    supports: ['2024年春灌4月2日开始，满拉与冲巴湖水库联合供水。', '按下游作物需水和蓄水状况组织供水、排查渠道和监测取水；不是天然河流即可自动灌溉。'],
  },
  {
    id: 'regional-nyangchu-ecology', title: '年楚河流域综合规划环评公示', publisher: '西藏自治区水利厅', date: '2018-10-18',
    url: 'https://slt.xizang.gov.cn/zwgk/tzgg/201810/t20181018_222564.html',
    supports: ['年楚河是雅鲁藏布江支流；农业、城市和河流生态用水需要共同管理。', '规划提出的未来目标不作为已经实现的成效。'],
  },
  {
    id: 'regional-tashilhunpo-1447', title: '扎什伦布寺传承近600年', publisher: '西藏自治区文化和旅游厅', date: '2024-02-01',
    url: 'https://wlt.xizang.gov.cn/ztzl_69/tuanjie/202402/t20240201_401903.html',
    supports: ['1447年根敦朱巴创建扎什伦布寺；四世班禅之后寺院与班禅驻锡的联系。', '金册金印、画像和碑刻等具体材料支撑制度与交往史；不由寺院颜色推断历史。'],
  },
  {
    id: 'regional-tashilhunpo-museum', title: '扎什伦布寺珍品首次外展', publisher: '澳门特别行政区政府新闻局／澳门艺术博物馆', date: '2024年第157期',
    url: 'https://www.gcs.gov.mo/news/detail/zh-hans/M24AXmEhH0',
    supports: ['1713年清康熙帝册封五世班禅为班禅额尔德尼、赐金册金印。', '寺院作为佛学、艺术与文化中心，勉拉顿珠在此创作、著述与授徒。'],
  },
  {
    id: 'regional-lari-first-passenger', title: '拉日铁路首趟客车16日发出', publisher: '西藏自治区人民政府', date: '2014-08-18',
    url: 'https://www.xizang.gov.cn/xwzx_406/bmkx/201812/t20181216_20122.html',
    supports: ['正文记载2014年8月15日开通运营、8月16日首趟客车；本讲解使用后一个明确事件。', '铁路沿拉萨河、雅鲁藏布江方向联系两城；当年时刻票价不代表当前。', '地方接驳与服务参与交通影响，不据此推算现代城市扩张面积。'],
  },
  {
    id: 'regional-shannan-geography', title: '山南自然地理', publisher: '山南市政府办公室', date: '2023-11-13',
    url: 'https://shannan.gov.cn/zjsn/sngk/zrdl/201812/t20181221_7854.html',
    supports: ['高原季风背景、干湿季分明、降水主要集中6至9月。', '南部边缘、东南低海拔与沿江一带有差异；不把市域摘要当每个站点的气候值。'],
  },
  {
    id: 'regional-samye-landscape', title: '桑耶镇：“种”出来的高原生态绿色小镇', publisher: '西藏自治区文化和旅游厅', date: '2018-07-20',
    url: 'https://wlt.xizang.gov.cn/xwzx_69/wlyw/dsdt/201807/t20180720_120274.html',
    supports: ['雅鲁藏布江沿岸桑耶镇的风沙、长期植树和防沙治沙实践。', '桑耶寺779年建成；古代寺院与当代生态建设属于不同时间层。'],
  },
  {
    id: 'regional-samye-history', title: '桑耶寺 · 地点、年代与文化联系', publisher: '西藏自治区外事办公室', date: '2024-02-26',
    url: 'https://wsb.xizang.gov.cn/xzjx/lyjd/201107/t20110713_100947.html',
    supports: ['位于雅鲁藏布江北岸扎囊县；资料叙述762年兴建、779年建成。', '赤松德赞主持建寺和邀请不同地区僧人讲经；藏、汉、印建筑艺术联系。', '本产品不把现存建筑复原为8世纪实景。'],
  },
  {
    id: 'regional-zaxi-opera-history', title: '美丽乡村：千百年的“约定”', publisher: '山南市旅游发展局', date: '2021-05-14',
    url: 'https://www.shannan.gov.cn/zjsn/snly/jdjs/202105/t20210514_81512.html',
    supports: ['雅砻扎西雪巴藏戏1987年恢复、1996年参加雪顿节并吸纳女演员。', '来源自己标注的唐东杰布故事属于传说，本脚本不把它作为确切创立年代。'],
  },
  {
    id: 'regional-zaxi-opera-living', title: '古村落焕发新光彩 · 扎西曲登社区', publisher: '山南市应急管理局／西藏日报', date: '2025-01-15',
    url: 'https://yjj.shannan.gov.cn/xwzx/snyw/202501/t20250115_146017.html',
    supports: ['社区位于雅砻河畔；藏戏排练、文化广场、民宿与日常空间相联系。', '当次采访说明实践，不推断所有居民的收入或把表演时段当实时安排。'],
  },
  {
    id: 'regional-lalin-open', title: '青藏铁路精神述评 · 拉林铁路开通日期', publisher: '中华人民共和国国防部／新华社', date: '2021',
    url: 'https://www.mod.gov.cn/gfbw/jmsd/4900083.html',
    supports: ['2021年6月25日拉林铁路建成通车；不以设计时速当全程平均速度。'],
  },
  {
    id: 'regional-shannan-passenger', title: '拉林铁路：列车轰鸣进山南', publisher: '山南市旅游发展局', date: '2021-06-30',
    url: 'https://lyfzj.shannan.gov.cn/zjsn/lyfw/202106/t20210630_84634.html',
    supports: ['开通时山南站、铁路跨江穿山和旅客接续的报道。', '采访中的卓玛因工作每周往返山南与拉萨；这是个人案例，不代表所有居民通勤。'],
  },
  {
    id: 'regional-shannan-freight-2026', title: '拉林铁路山南站正式开通货运业务', publisher: '西藏自治区党委网站／西藏日报', date: '2026-09-27',
    url: 'https://www.xzdw.gov.cn/xwzx/qnyw/202609/t20260927_698445.html',
    supports: ['截至2026年9月27日报道，山南站近日开通货运业务；未给具体首发日。', '开办初期可承接生活物资、建材等普通货物；2021年客运开通不等于当年已有这项货运服务。'],
  },
  {
    id: 'regional-west-city-locators', title: '既有城区参考坐标 · Natural Earth／GeoNames', publisher: 'Natural Earth／GeoNames',
    url: 'https://www.geonames.org/1279498/zedang.html',
    supports: ['城区参考读取项目归档atlas-place-references.json：日喀则Natural Earth ne_id 1159149873；泽当GeoNames 1279498。', '聚居地参考点不等于行政边界、车站或寺院地点。'],
  },
  {
    id: 'regional-tashilhunpo-osm', title: 'OpenStreetMap · 扎什伦布寺地方参考', publisher: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/way/140501939',
    supports: ['OSM way 140501939的包围盒中心作阅读参考：88.8700343°E、29.2683211°N。', '查询镜像数据时点2026-05-31；不显示为寺院边界、复原模型或访问入口。'],
  },
  {
    id: 'regional-shigatse-station-osm', title: 'OpenStreetMap · 日喀则站地方参考', publisher: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/node/7279526246',
    supports: ['OSM车站节点7279526246：88.912155°E、29.2238621°N。', '查询镜像数据时点2026-05-31；不以城市点替代车站，未提供站场、道路或铁路测绘线路。'],
  },
  {
    id: 'regional-samye-osm', title: 'OpenStreetMap · 桑耶寺地方参考', publisher: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/way/131280233',
    supports: ['OSM way 131280233的包围盒中心作阅读参考：91.5023777°E、29.3266407°N。', '查询镜像数据时点2026-05-31；不定位8世纪建筑边界或访客入口。'],
  },
  {
    id: 'regional-shannan-station-osm', title: 'OpenStreetMap · 山南站地方参考', publisher: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/node/9087403304',
    supports: ['直接读取OSM API节点9087403304版本5：91.7556747°E、29.2499495°N。', '节点编辑时点2025-10-31；参考点不等于完整站场或车站接驳道路。'],
  },
];

const shigatse = verifiedPlaceReferences.shigatse;
const shannan = verifiedPlaceReferences.shannan;
const terrainNote = '共用Mapzen真实区域高程，网格间距约5—6千米；高差放大用于读地形，不能识别城市街区或田块。水汽、用水和通行效果为原理示意，地点符号只作阅读参考。';

export const westernRegionalJourneys: RegionalJourney[] = [
  {
    cityId: 'shigatse', title: '日喀则：河谷生产怎样联系历史中心与铁路',
    lead: '保留喜马拉雅与雅鲁藏布江的整体背景，沿年楚河谷理解用水、聚居、寺院中心和现代通行。',
    terrainNote, overviewPosition: [shigatse.longitude, shigatse.latitude],
    sourceIds: ['regional-shigatse-geography', 'regional-nyangchu-water-2024', 'regional-nyangchu-ecology', 'regional-tashilhunpo-1447', 'regional-tashilhunpo-museum', 'regional-lari-first-passenger', 'regional-orographic-nasa', 'regional-west-city-locators', 'regional-tashilhunpo-osm', 'regional-shigatse-station-osm'],
    points: [
      { id: 'shigatse-city', name: '日喀则城区参考', coordinates: [shigatse.longitude, shigatse.latitude], kind: 'city', scopeNote: shigatse.scope, sourceIds: ['regional-west-city-locators'] },
      { id: 'tashilhunpo', name: '扎什伦布寺参考', coordinates: [88.8700343, 29.2683211], kind: 'heritage', scopeNote: 'OSM现存寺院要素中心，只标地点；不是1447年建筑范围。', sourceIds: ['regional-tashilhunpo-osm', 'regional-tashilhunpo-1447'] },
      { id: 'shigatse-station', name: '日喀则站参考', coordinates: [88.912155, 29.2238621], kind: 'station', scopeNote: 'OSM车站节点，只表示现代站点位置；不是铁路实际线形或站场边界。', sourceIds: ['regional-shigatse-station-osm', 'regional-lari-first-passenger'] },
    ],
    stages: [
      {
        id: 'environment', title: '喜马拉雅北侧，怎样形成生产河谷', question: '为什么日喀则不能只用一座雪山或一种气候概括？',
        summary: '先看南侧高山与年楚河谷的相对位置，再观察湿空气抬升与干湿季，最后把用水问题交给生活。',
        controls: ['对照水汽较多与较少时的云雨变化。', '保持真实高程，比较河谷与周围山坡。'],
        cues: [
          { id: 'shigatse-environment-1', action: 'valley', anchor: '把视线从喜马拉雅山地移到年楚河谷', pointIds: ['shigatse-city'], sourceIds: ['regional-shigatse-geography'], text: '把视线从喜马拉雅山地移到年楚河谷。日喀则城区与农业河谷同高山相邻，较平缓的谷地为耕作、聚居和往来提供条件。这里比较的是地形位置，城区参考点不代表整个日喀则市的气候。' },
          { id: 'shigatse-environment-2', action: 'rain', anchor: '湿空气沿坡上升', pointIds: ['shigatse-city'], sourceIds: ['regional-orographic-nasa', 'regional-shigatse-geography'], text: '湿空气沿坡上升，冷却后更容易凝结成云；但有山并不保证每次都下雨，还要有足够水汽和适合的天气条件。日喀则南北地形和区域气候存在差异，画面展示抬升原理，不重放某一天的实测降雨。' },
          { id: 'shigatse-environment-3', action: 'water', anchor: '雨季与春季用水并不同时', pointIds: ['shigatse-city'], sourceIds: ['regional-shigatse-geography', 'regional-nyangchu-water-2024'], text: '雨季与春季用水并不同时。地方资料记载这里干湿季分明，农田却在春灌时就需要供水。让云雨淡去后继续看河谷：河里有水只是起点，怎样蓄、怎样送、何时分配，才会进入农田和居民的生活。' },
        ],
      },
      {
        id: 'life', title: '河水怎样成为生产与生活的条件', question: '同一条河怎样同时服务农田、城市与河流生态？',
        summary: '用年楚河春灌的真实调度案例，把水源、组织与河谷生活连接起来；不绘制未经定位的灌渠田块。',
        controls: ['观察供水条件改变后，水源到生产空间的关系。', '对照用水与保留河流生态水量的需要。'],
        cues: [
          { id: 'shigatse-life-1', action: 'water', anchor: '先把水源与用水空间联系起来', pointIds: ['shigatse-city'], sourceIds: ['regional-nyangchu-water-2024'], text: '先把水源与用水空间联系起来。2024年年楚河流域春灌从4月2日开始，由满拉、冲巴湖两座水库联合供水。它说明农业依靠季节性的调蓄和管理；图上的流动表示供需关系，不是已测绘的灌渠线路。' },
          { id: 'shigatse-life-2', action: 'settlement', anchor: '平缓土地与供水条件共同参与聚居', pointIds: ['shigatse-city'], sourceIds: ['regional-shigatse-geography', 'regional-nyangchu-ecology'], text: '平缓土地与供水条件共同参与聚居，河谷因此同时承载生产和城市生活。把视角保持在区域尺度，观察水源、谷地和城区的相对关系；这里不把示意生产带当成真实田块，也不据此推算哪一年城市扩大了多少。' },
          { id: 'shigatse-life-3', action: 'water', anchor: '用水还需要给河流留下空间', pointIds: ['shigatse-city'], sourceIds: ['regional-nyangchu-ecology'], text: '用水还需要给河流留下空间。年楚河流域规划把农田、城市与生态流量放在一起管理，取水越多并不自动等于生活越好。自然条件提供基础，分配与组织决定人怎样使用它；接下来再看河谷中的历史中心。' },
        ],
      },
      {
        id: 'history', title: '河谷之上，历史中心由人和制度形成', question: '哪些真实事件让日喀则成为重要的宗教与文化中心？',
        summary: '1447年创建、班禅驻锡与1713年册封分别放回自己的时期，结合具体文物说明交往与传承。',
        controls: ['按年代观察同一地方的制度联系。', '把历史地点与现代车站放回同一河谷背景。'],
        cues: [
          { id: 'shigatse-history-1', action: 'heritage', anchor: '1447年，根敦朱巴创建扎什伦布寺', pointIds: ['tashilhunpo'], sourceIds: ['regional-tashilhunpo-1447'], text: '1447年，根敦朱巴创建扎什伦布寺。山地和河谷解释它所处的环境，创建、扩建和宗教组织则要用历史材料解释。现在标出的是现存寺院的地方参考，年代变化表达事件先后，不把今天的建筑群倒推成最初原貌。' },
          { id: 'shigatse-history-2', action: 'heritage', anchor: '1713年的金册金印', pointIds: ['tashilhunpo'], sourceIds: ['regional-tashilhunpo-1447', 'regional-tashilhunpo-museum'], text: '1713年的金册金印，把寺院历史连向更广的制度关系。康熙帝册封五世班禅为班禅额尔德尼；相关文物与驻锡传统说明日喀则的重要性由具体人物、制度和交流积累而来，不能只用河谷优越这一条原因概括。' },
          { id: 'shigatse-history-3', action: 'heritage', anchor: '创作、著述与授徒', pointIds: ['tashilhunpo'], sourceIds: ['regional-tashilhunpo-museum'], text: '创作、著述与授徒，让文化在地方持续形成。澳门艺术博物馆的展览资料记载，勉拉顿珠曾在扎什伦布寺创作并传授艺术。观察寺院时也要问作品怎样学习、保存和交流，再把这些历史联系接到今天的城市通行。' },
        ],
      },
      {
        id: 'connections', title: '铁路到站之后，怎样继续进入地方', question: '现代交通改变了哪一段联系，哪些接续仍需要道路完成？',
        summary: '以2014年首趟客车为明确事件，区别城际运输、站后接驳和地方观察；不把阅读连线当铁路测绘。',
        controls: ['对照铁路通车前后的运输方式。', '保留到站后接续，组织河谷—城市—遗产的观察顺序。'],
        cues: [
          { id: 'shigatse-connections-1', action: 'rail', anchor: '2014年8月16日，首趟拉日铁路客车', pointIds: ['shigatse-station', 'shigatse-city'], sourceIds: ['regional-lari-first-passenger'], text: '2014年8月16日，首趟拉日铁路客车从拉萨驶向日喀则，城际往来增加了铁路这一种方式。真实车站在城区南侧，车站、城区与寺院是不同地点；运输演示表示联系改变，连接的示意轨迹不等于真实铁路线路。' },
          { id: 'shigatse-connections-2', action: 'road', anchor: '到站以后仍然需要地面接续', pointIds: ['shigatse-station', 'shigatse-city', 'tashilhunpo'], sourceIds: ['regional-lari-first-passenger', 'regional-shigatse-station-osm', 'regional-tashilhunpo-osm'], text: '到站以后仍然需要地面接续。旅客和生活物资从车站进入城区，再联系周围乡镇，接驳、装卸和城市服务都参与变化。保持原来的山地和河谷不变，比较交通条件；不能把铁路开通直接画成已经证实的城市扩张范围。' },
          { id: 'shigatse-connections-3', action: 'observe', anchor: '把观察顺序串成河谷、车站和寺院', pointIds: ['shigatse-city', 'shigatse-station', 'tashilhunpo'], sourceIds: ['regional-nyangchu-water-2024', 'regional-tashilhunpo-museum', 'regional-lari-first-passenger'], text: '把观察顺序串成河谷、车站和寺院：先问水怎样进入生产，再看现代到达与接续，最后用文物核对历史关系。这是一条认识地方的观察线索，不是已经核实班次与路况的旅行行程；具体访问仍要按出行日期查证。' },
        ],
      },
    ],
  },
  {
    cityId: 'shannan', title: '山南：两河生活、文化传承与新的交通节点',
    lead: '从雅鲁藏布江与雅砻河谷的整体关系进入泽当，再读桑耶、社区藏戏与现代铁路。',
    terrainNote, overviewPosition: [shannan.longitude, shannan.latitude],
    sourceIds: ['regional-shannan-geography', 'regional-samye-landscape', 'regional-samye-history', 'regional-zaxi-opera-history', 'regional-zaxi-opera-living', 'regional-lalin-open', 'regional-shannan-passenger', 'regional-shannan-freight-2026', 'regional-orographic-nasa', 'regional-west-city-locators', 'regional-samye-osm', 'regional-shannan-station-osm'],
    points: [
      { id: 'shannan-city', name: '泽当聚居地参考', coordinates: [shannan.longitude, shannan.latitude], kind: 'city', scopeNote: shannan.scope, sourceIds: ['regional-west-city-locators'] },
      { id: 'samye', name: '桑耶寺参考', coordinates: [91.5023777, 29.3266407], kind: 'heritage', scopeNote: 'OSM现存寺院要素中心；不是8世纪建筑范围或访问入口。', sourceIds: ['regional-samye-osm', 'regional-samye-history'] },
      { id: 'shannan-station', name: '山南站参考', coordinates: [91.7556747, 29.2499495], kind: 'station', scopeNote: 'OSM车站节点；客运站点、货场和城区有各自空间，节点不代表整个站场。', sourceIds: ['regional-shannan-station-osm', 'regional-shannan-passenger'] },
    ],
    stages: [
      {
        id: 'environment', title: '两河谷地，为什么仍有干湿差异', question: '河谷有水，是否就意味着周围每个地方都湿润？',
        summary: '在整体地形上区分河谷、山坡与季节，接到水源组织和防风治沙，避免把山南说成一种气候。',
        controls: ['观察水汽经过山地时的抬升与云雨。', '对照湿季与少雨条件下的谷地。'],
        cues: [
          { id: 'shannan-environment-1', action: 'valley', anchor: '沿雅鲁藏布江找到泽当与雅砻河谷', pointIds: ['shannan-city'], sourceIds: ['regional-shannan-geography', 'regional-zaxi-opera-living'], text: '沿雅鲁藏布江找到泽当与雅砻河谷。谷地较平缓的空间、水源与周围山坡放在一起，才能理解聚居和生产；山南也包含南侧高山和更低的沟谷，泽当这个参考地点不能代替整个市域的环境。' },
          { id: 'shannan-environment-2', action: 'rain', anchor: '让湿空气遇山上升', pointIds: ['shannan-city'], sourceIds: ['regional-orographic-nasa', 'regional-shannan-geography'], text: '让湿空气遇山上升，观察冷却、云和雨的变化。山南地方资料记载降水主要集中在六月到九月，不同高度和位置又有差别。动画用来理解抬升与水汽条件，不表示每条沟谷都有同样风向和降水量。' },
          { id: 'shannan-environment-3', action: 'water', anchor: '少雨与多风时再看宽谷', pointIds: ['shannan-city', 'samye'], sourceIds: ['regional-shannan-geography', 'regional-samye-landscape'], text: '少雨与多风时再看宽谷，河流附近也会面临风沙和用水问题。桑耶镇长期植树治沙的地方记录，说明有水并不等于环境会自动适合生活；河谷提供基础，人的管理继续改变地表条件和日常安排。' },
        ],
      },
      {
        id: 'life', title: '生产、治沙与社区文化共用一片谷地', question: '地方生活怎样同时使用并维护河谷环境？',
        summary: '从水土条件进入桑耶治沙与雅砻河畔的社区实践，文化由持续学习和组织传承，不由自然环境自动生成。',
        controls: ['对照水源、谷地生活空间与外围山坡。', '观察维护条件改变时生活空间怎样受影响。'],
        cues: [
          { id: 'shannan-life-1', action: 'water', anchor: '把水、谷地土地与生活空间一起观察', pointIds: ['shannan-city'], sourceIds: ['regional-shannan-geography', 'regional-zaxi-opera-living'], text: '把水、谷地土地与生活空间一起观察，农业和聚落需要的不只是降雨总量，还包括水出现的时间、可以利用的土地与维护。这里显示的是供水和生活的原理关系，不绘制尚未取得真实资料的田块、渠道或社区边界。' },
          { id: 'shannan-life-2', action: 'settlement', anchor: '桑耶的变化包含长期植树治沙', pointIds: ['samye'], sourceIds: ['regional-samye-landscape'], text: '桑耶的变化包含长期植树治沙。2018年的地方报道记录居民持续种植、管理树木，把受风沙影响的环境逐步改善。保持河谷地形不变，再观察维护条件对生活空间的影响；绿化效果是过程示意，不是同一地块的历史复原。' },
          { id: 'shannan-life-3', action: 'settlement', anchor: '雅砻河畔还有持续排练藏戏的社区', pointIds: ['shannan-city'], sourceIds: ['regional-zaxi-opera-living'], text: '雅砻河畔还有持续排练藏戏的社区。2025年对扎西曲登的报道，把文化广场、排练、民宿与居民生活放在一起。自然环境提供生活背景，传承仍需要学习者、表演者和社区组织；泽当参考点不充当这个社区的精确定位。' },
        ],
      },
      {
        id: 'history', title: '建寺、交流与藏戏恢复，各有自己的年代', question: '怎样用真实事件理解文化形成，而不是把传说当成同一条年表？',
        summary: '以8世纪桑耶建寺和20世纪藏戏恢复为两组真实材料，分别解释制度、交流、参与者与传承。',
        controls: ['按事件先后观察同一河谷中的文化联系。', '区分历史事件与今天仍在使用的地方。'],
        cues: [
          { id: 'shannan-history-1', action: 'heritage', anchor: '779年建成的桑耶寺', pointIds: ['samye'], sourceIds: ['regional-samye-history'], text: '779年建成的桑耶寺，提供理解吐蕃时期宗教制度的具体入口。官方介绍记载赤松德赞主持建寺，并邀请不同地区僧人讲经。先辨认雅鲁藏布江北岸的地点，再核对事件年代；现在的地形与寺院符号不复原当时的建筑。' },
          { id: 'shannan-history-2', action: 'heritage', anchor: '藏、汉、印的建筑艺术联系', pointIds: ['samye'], sourceIds: ['regional-samye-history'], text: '藏、汉、印的建筑艺术联系，说明文化形成包含人的来往与知识传播。寺院资料中的僧人讲经、建筑和文物需要分别阅读；山川解释通行与生活的条件，却不能单独解释宗教制度和艺术选择。文化不是从海拔直接推导出来的。' },
          { id: 'shannan-history-3', action: 'heritage', anchor: '1987年，雅砻扎西雪巴藏戏恢复', pointIds: ['shannan-city'], sourceIds: ['regional-zaxi-opera-history'], text: '1987年，雅砻扎西雪巴藏戏恢复；地方资料还记载1996年参加雪顿节并吸纳女演员。这些具体变化说明传承需要组织和新的参与者。把它同桑耶建寺分开计时，才能看清不同历史过程，而不是把千年文化说成始终不变。' },
        ],
      },
      {
        id: 'connections', title: '客运、货运与地方观察分步接续', question: '铁路开通以后，工作往返、生活物资和文化观察分别怎样联系起来？',
        summary: '区分2021年客运开通和2026年山南站货运开办，把到站接续与地方生活连起来，不凭铁路日期推断所有发展。',
        controls: ['对照有无铁路时的城际运输方式。', '到站后继续观察城区、桑耶与河谷，连线只表达阅读顺序。'],
        cues: [
          { id: 'shannan-connections-1', action: 'rail', anchor: '2021年6月25日，拉林铁路开通', pointIds: ['shannan-station', 'shannan-city'], sourceIds: ['regional-lalin-open', 'regional-shannan-passenger'], text: '2021年6月25日，拉林铁路开通，山南增加了铁路客运联系。当时采访中的卓玛因工作每周往返山南与拉萨，铁路改变了她的出行选择。这个个人案例能说明一种生活变化，不能代替对所有居民或通勤时间的统计。' },
          { id: 'shannan-connections-2', action: 'rail', anchor: '2026年九月的报道又记录了货运变化', pointIds: ['shannan-station'], sourceIds: ['regional-shannan-freight-2026'], text: '2026年九月的报道又记录了货运变化：山南站近日开办货运业务，初期可承接生活物资和建材等普通货物。客运到达与货物装卸是不同能力，不能把2021年通车直接说成山南站那时已经拥有今天的全部货运功能。' },
          { id: 'shannan-connections-3', action: 'observe', anchor: '从山南站继续观察谷地生活与桑耶', pointIds: ['shannan-station', 'shannan-city', 'samye'], sourceIds: ['regional-shannan-passenger', 'regional-samye-history', 'regional-zaxi-opera-living'], text: '从山南站继续观察谷地生活与桑耶，先看现代到达怎样接到城区，再问河谷怎样被使用、历史材料怎样保存，最后了解仍在练习的地方文化。画面串起观察问题，地面接续仍需道路；不把这条观察顺序当成实测旅游线路。' },
        ],
      },
    ],
  },
];
