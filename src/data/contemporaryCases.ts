import type { SceneSettings } from '../lib/store';

/** Retrieved on 2026-10-15. These cases authorize explanations and questions,
 * not surveyed geometry, live services, forecasts or a historical route trace. */
export interface ContemporaryCaseSource {
  id: string;
  title: string;
  url: string;
  year: number;
  identity: string;
  scope: string;
  access: 'full-text' | 'publisher-indexed-text';
}

export interface ContemporaryCaseEvent {
  title: string;
  date: string;
  /** Distinguishes an event, an observation interval and publication/review. */
  dateMeaning: string;
  place: string;
  sourceIds: readonly string[];
  status: 'event' | 'observation' | 'publication' | 'proposal';
}

export interface ContemporaryCase {
  id: string;
  stepIds: readonly string[];
  title: string;
  question: string;
  why: string;
  howEvidence: readonly string[];
  location: string;
  time: string;
  person?: { name: string; role: string; sourceIds: readonly string[] };
  namedEvents: readonly ContemporaryCaseEvent[];
  sources: readonly ContemporaryCaseSource[];
  whatItSupports: readonly string[];
  whatItDoesNotSupport: readonly string[];
  operation: { prompt: string; observe: string; feedback: string; limit: string };
  nextQuestion: { stepId: string; question: string; bridge: string };
  /** A teaching state, not a measured value or the case's reconstructed site. */
  studyTarget?: Partial<SceneSettings>;
}

const water: ContemporaryCaseSource = {
  id: 'itpcas-hydrological-network-2022',
  title: '中国科学院青藏高原研究所 · BAMS：青藏高原最大流域的多圈层水文变化观测',
  url: 'https://itpcas.cas.cn/new_kycg/new_kyjz/202204/t20220426_6439458.html', year: 2022,
  identity: '论文第一作者所在研究所的成果说明，2022-04-26；链接原论文DOI 10.1175/BAMS-D-21-0217.1。',
  scope: '覆盖流域的观测网络；径流组分比较另限奴下站以上流域、1981—2016年模型结果。', access: 'full-text',
};
const atisha: ContemporaryCaseSource = {
  id: 'met-atisha-place-sequence-2014', title: '大都会艺术博物馆 · Tibet and India: Buddhist Traditions and Transformations',
  url: 'https://www.metmuseum.org/exhibitions/listings/2014/tibet-and-india', year: 2014,
  identity: '博物馆专题展览说明和地图图注，属于后世研究与策展解释。',
  scope: '11—12世纪藏印佛教交流与艺术；图注给出阿底峡1042年入藏、加德满都与托林等节点，没有逐段古道。', access: 'full-text',
};
const sedongpu: ContemporaryCaseSource = {
  id: 'yang-sedongpu-ews-2023', title: 'Yang等 · 色东普冰岩崩塌与堵江的预警系统',
  url: 'https://nhess.copernicus.org/articles/23/3015/2023/', year: 2023,
  identity: '原始研究全文；Natural Hazards and Earth System Sciences 23:3015—3029，2023-09-08发表，DOI 10.5194/nhess-23-3015-2023。',
  scope: '色东普谷地监测系统及其记录的事件，阈值是当地经验值；非全流域预报系统。', access: 'full-text',
};
const railwayResearchHistory: ContemporaryCaseSource = {
  id: 'cas-frozen-ground-research-2024', title: '中国科学院 · 筑梦高原 情牵天路',
  url: 'https://www.cas.cn/zt/sszt/75yq/zlzq/202409/t20240913_5031700.shtml', year: 2024,
  identity: '中国科学报李晨阳采访纪实，中科院网站发布；正文日期2024-03-04，不能取URL的9月路径作发表日期。',
  scope: '程国栋、赖远明、马巍等人的技术研究与工程回顾，含北麓河试验和长期监测；不是设计图或实时性能数据。', access: 'full-text',
};
const seasonalRock: ContemporaryCaseSource = {
  id: 'mei-crushed-rock-monitoring-2021', title: 'Mei等 · 青藏铁路块石路基的热状况与沉降特征',
  url: 'https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.795894/full', year: 2021,
  identity: '原始研究全文，Frontiers in Earth Science，2021-12-09；DOI 10.3389/feart.2021.795894。',
  scope: '开心岭两类块石路基的2006—2018年地温与变形监测；包括缺测与插补说明，不能外推全线或永续效果。', access: 'full-text',
};
const originalCoolingReview: ContemporaryCaseSource = {
  id: 'ma-cheng-wu-cooling-review-2009', title: '马巍、程国栋、吴青柏 · Construction on permafrost foundations',
  url: 'https://www.sciencedirect.com/science/article/abs/pii/S0165232X09001335', year: 2009,
  identity: '原研究团队综述，Cold Regions Science and Technology 59:3—11，DOI 10.1016/j.coldregions.2009.07.007；本轮出版社检索正文可读，直接打开返回403。',
  scope: '摘要与出版社索引可读的4.2.1节阐述寒暖季块石换热差异；未声称读到付费全文或导入原始监测值。', access: 'publisher-indexed-text',
};
const lalinOpening: ContemporaryCaseSource = {
  id: 'bomi-lalin-opening-2021', title: '波密县人民政府 · 拉林铁路正式开通运营',
  url: 'https://www.bomi.gov.cn/bmx/xwzx/202106/a320365e780047a6a07eba587fb4215a.shtml', year: 2021,
  identity: '地方政府事件报道，2021-06-29发布，记述6月25日开通；不是现行铁路时刻表。',
  scope: '拉萨经山南至林芝的已开通通道与开通初期服务。', access: 'full-text',
};
const caimen: ContemporaryCaseSource = {
  id: 'milin-caimen-interviews-2021', title: '米林政府 · 拉林铁路开通为米林带来新时尚',
  url: 'https://www.milin.gov.cn/mlx/xwzx/202108/c430e14e3d454de9a3b75c73a48df2a6.shtml', year: 2021,
  identity: '2021-08-12地方政府报道，含彩门村村委会主任普巴与经营民宿的村民扎西受访表述。',
  scope: '报道时称米林县扎西绕登乡彩门村；是地方发展报道和具名访谈，不是社区全样本或因果评估。', access: 'full-text',
};
const pala: ContemporaryCaseSource = {
  id: 'cwru-pala-fieldwork-account-2009', title: '凯斯西储大学 · Voices from Tibet',
  url: 'https://case.edu/artsci/artsci-fall-2009/tibet.html', year: 2009,
  identity: '研究者所在大学2009年秋冬刊访谈，介绍Goldstein与Beall的社区田野工作；非调查原始数据全文。',
  scope: '区分Pala牧民1986—1988年田野和其后回访，与文中另述1997—2007年农民社区研究；观点保留研究者身份和当时日期。', access: 'full-text',
};
const heritage: ContemporaryCaseSource = {
  id: 'unesco-potala-soc-2025', title: 'UNESCO · 拉萨布达拉宫历史建筑群2025年保护状况',
  url: 'https://whc.unesco.org/fr/soc/4764/', year: 2025,
  identity: 'UNESCO世界遗产中心官方保护状况页，法文全文；区分缔约国2024-11-30报告和2025年世界遗产中心/咨询机构分析。',
  scope: '布达拉宫、大昭寺、罗布林卡的保护与管理；报告进展、分析意见和拟议整改不是同一种证据。', access: 'full-text',
};

export const contemporaryCases: readonly ContemporaryCase[] = [
  {
    id: 'yarlung-observation-to-components', stepIds: ['R1'], title: '王磊团队：一条江，需要同时观测哪些变化？',
    question: '看见冰川，就能知道雅鲁藏布江的水从哪里来吗？',
    why: '降雨、积雪消融、冰川消融与土壤地下水过程进入同一流域，发生的季节和汇流时滞不同。上下游的联系要把这些过程放在同一空间和时间框架里。',
    howEvidence: ['研究团队自2017年起加强流域多圈层同期监测，把气象、径流、冰川、冻土和土壤植被资料联系起来。', '降水计、水位断面与地温探头测量不同对象；径流来源比例还需要水文模型比较，不能把某个探头当成全部水源的直接读数。'],
    location: '雅鲁藏布江流域；组分模型比较限奴下水文站以上流域', time: '2017年起建设观测网络；2022年研究发表',
    person: { name: '王磊', role: '中国科学院青藏高原研究所研究员，该BAMS论文第一作者和通讯作者', sourceIds: [water.id] },
    namedEvents: [
      { title: '多圈层同期监测网络建设', date: '2017年起', dateMeaning: '机构所述监测工作起点，不是完整时间序列的统一起年', place: '雅鲁藏布江流域', sourceIds: [water.id], status: 'observation' },
      { title: '多圈层水文观测研究在线发表', date: '2022-04-11', dateMeaning: '论文在线发表日期', place: '研究范围为雅鲁藏布江流域', sourceIds: [water.id], status: 'publication' },
    ], sources: [water],
    whatItSupports: ['上下游联系需要多种水源和地表过程共同解释。', '观测记录与模型归因是相互联系的两层证据。'],
    whatItDoesNotSupport: ['把奴下以上、1981—2016年的模拟组分推广为整条跨境河流任何时刻的比例。', '用教学水流推算实测流量、水质、当前灾情或跨境分水安排。'],
    operation: { prompt: '沿同一流域依次追踪降水、坡面汇水和河道，再问每种变化该由什么记录检验。', observe: '支流汇入后的联系保持连续，源头、水流经过处与下游接收处分别可指认。', feedback: '路径能说明联系方向；加入同期观测和模型，才有条件讨论水量来源。', limit: '当前3D为概念流域，不是雅鲁藏布江真实河网或可计算的径流模型。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'R2', question: '人和物沿通道往来时，除了地形，还需要什么？', bridge: '水的联系由汇流过程形成；人的联系还需要实际行动、知识和制度。' },
  },
  {
    id: 'atisha-tholing-evidenced-exchange', stepIds: ['R2', 'T1'], title: '阿底峡与托林：连接地点的是人、学习和翻译',
    question: '从“可以经过”到“发生交流”，中间有什么证据？',
    why: '山口和谷地提供通行条件，具体交流还需要有人出行、接待、学习与翻译。把历史人物的可证节点和留下的知识联系起来，才能解释文化为何发生变化。',
    howEvidence: ['大都会博物馆展览图注记述阿底峡1042年入藏，先在加德满都停留，再到西藏西部托林，后来到中部等地。', '该展览同时以经书翻译和艺术对象解释11—12世纪交流；这是后世博物馆研究，不能将其中图像当成出行现场。'],
    location: '加德满都—托林—西藏中部的有证节点；未复原逐段山路', time: '1042年入藏节点；11—12世纪交流背景；2014年展览说明',
    person: { name: '阿底峡（Atisha）', role: '博物馆图注记述的来藏佛教教师', sourceIds: [atisha.id] },
    namedEvents: [{ title: '阿底峡入藏与托林节点', date: '1042年', dateMeaning: '入藏年份；不是每个停留地点均有精确到达日', place: '经加德满都至托林，后至西藏中部', sourceIds: [atisha.id], status: 'event' }], sources: [atisha],
    whatItSupports: ['交流需要人物行动、教学与翻译，地方传统会选择和转化外来知识。', '有证地点可组织为学习顺序，并返回文化章节阅读材料。'],
    whatItDoesNotSupport: ['将节点连线称为阿底峡实走的精确古道，或给出逐日速度和国界。', '把今天铁路等同于千年前通道，把环境当成宗教文化的充分原因。'],
    operation: { prompt: '让通行链逐段接通，再将每一段与“有证节点”或“仍缺材料”对应。', observe: '主路、补给与接续条件协作，任一环节欠缺都使联系不完整。', feedback: '教学路径解释可达条件；阿底峡的行动须由人物和文本材料单独支持。', limit: '演示没有复原11世纪路网、路况、政治疆域或寺院布局。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'R3', question: '共同依赖的水、道路与环境，需要哪些协作？', bridge: '历史交流有具体行动者；当代跨区域议题也要识别观察者、管理者和受影响的人。' },
  },
  {
    id: 'sedongpu-observation-response-chain', stepIds: ['R3'], title: '色东普：从冰岩崩塌到下游公共风险',
    question: '坡上发生的变化，为什么需要河道与居民共同关注？',
    why: '崩落物进入谷地后可能形成泥石流并堵塞干流。风险会从坡面传到河道、道路和聚落；是否堵江、影响多大，需要多个位置的观测相互验证。',
    howEvidence: ['Yang等2023年原始研究将谷内振动与影像、谷口影像和河道水位记录组合，用于区分崩塌、到达河道与堵江。', '2021-03-22的事件损坏谷口监测设施；论文强调维护、地方经验阈值、交叉验证，以及政府和居民的响应能力。'],
    location: '西藏东南部色东普谷地、雅鲁藏布江及加拉（Gyala）附近监测点', time: '2018年已有堵江事件；2021—2022年监测案例；2023年论文',
    namedEvents: [
      { title: '冰岩崩塌与河道暂时堵塞', date: '2021-03-22', dateMeaning: '原始研究分析的事件日期，不是预测日期', place: '色东普谷地出口与雅鲁藏布江', sourceIds: [sedongpu.id], status: 'event' },
      { title: '预警系统及事件证据发表', date: '2023-09-08', dateMeaning: '论文发表日期', place: '研究区为色东普谷地', sourceIds: [sedongpu.id], status: 'publication' },
    ], sources: [sedongpu],
    whatItSupports: ['公共议题需要物理过程、多个位置的证据与组织响应一起考虑。', '观测崩塌、确认堵江、发出警报和启动响应是不同环节。'],
    whatItDoesNotSupport: ['看到振动就自动断定堵江，或将当地传感器阈值推广到整个高原。', '所有冰岩崩塌都由当天暴雨或高温触发；论文对所分析2022年小事件未发现直接气象触发。', '教学滑块具备实时监测、预报或疏散指令功能。'],
    operation: { prompt: '依次查看环境变化、经过的通道和受影响对象，再说明需要哪一方补充哪种信息。', observe: '同一变化影响多个对象；设施、社区与过程之间的连线表达依赖关系。', feedback: '多处证据确认过程，明确职责支持响应；一条“位置重要”的标语无法替代这条证据链。', limit: '当前场景是公共议题关系模型，未重演色东普真实崩塌体积、堵江范围或水位。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'M1', question: '跨越高原的铁路，怎样处理会变化的地基？', bridge: '共同依赖的通道需要持续维护；冻土铁路把环境变化与工程选择直接联系起来。' },
  },
  {
    id: 'qinghai-tibet-permafrost-cooling', stepIds: ['M1'], title: '程国栋、马巍与青藏铁路：地基为何需要季节性散热？',
    question: '2006年通车之前与之后，为什么都需要研究地下的冰？',
    why: '高含冰量冻土受热融化可能改变地基承托。研究者把目标从单纯延缓热传入转向控制热收支；通车后仍需监测地温与变形，按地点条件维护。',
    howEvidence: ['中科院采访纪实记录程国栋2001年提出主动冷却思路、北麓河等试验段、赖远明团队结构改进，以及马巍所述长期监测。青藏铁路于2006-07-01通车。', 'Mei等以开心岭两类实际块石结构2006—2018年监测比较效果。寒季上冷下暖可驱动孔隙空气对流散热；暖季空气稳定，对流弱，主要减少向下传热。'],
    location: '青藏铁路；北麓河试验地在青海，监测论文的比较地点为开心岭', time: '2001年技术论证；2006-07-01通车；2006—2018年所引监测区间',
    person: { name: '程国栋、马巍', role: '冻土工程研究者；程国栋提出冷却路基思路，马巍参与研究并强调通车后的动态观测', sourceIds: [railwayResearchHistory.id, originalCoolingReview.id] },
    namedEvents: [
      { title: '主动冷却路基技术论证', date: '2001-10-02', dateMeaning: '纪实所述中科院重大项目答辩日期', place: '中国科学院；后续试验含北麓河等段', sourceIds: [railwayResearchHistory.id], status: 'event' },
      { title: '青藏铁路正式通车运营', date: '2006-07-01', dateMeaning: '通车事件日期，不表示全线地基采用同一结构', place: '青藏铁路格尔木—拉萨段贯通', sourceIds: [railwayResearchHistory.id], status: 'event' },
      { title: '两类块石路基地温与变形比较', date: '2006—2018年', dateMeaning: '研究分析的监测区间；论文发表于2021年', place: '开心岭两处研究断面', sourceIds: [seasonalRock.id], status: 'observation' },
    ], sources: [railwayResearchHistory, seasonalRock, originalCoolingReview],
    whatItSupports: ['工程选择取决于含冰量、地温、季节温差、结构与维护，不能只看地表路线。', '块石可利用寒季自然冷量；“主动保护”的思路不等于全部设施靠电制冷。', '监测论文中结构效果有差别，保护措施与持续变化可以同时存在。'],
    whatItDoesNotSupport: ['块石全年以相同强度冷却、永久阻止融化，或全线使用统一尺寸结构。', '把北麓河研究点放在西藏自治区，或未经材料将人物固定到风火山。', '教学冰体变化或支承差异是某路段实测沉降、真实设计或列车安全评估。'],
    operation: { prompt: '对照有无通风块石的地基，并在寒季与暖季之间切换。', observe: '寒季满足外冷内暖时才强调散热对流；暖季停止同样的蓝色对流，观察承托与热扰动关系。', feedback: '结构改变热收支，但效果受条件和时间影响。通车以后，观测与维护仍是通达能力的一部分。', limit: '定性样块没有导入实测地温、沉降值或真实结构尺寸；不能比较工程方案的数值优劣。' },
    studyTarget: { progress: .52, season: 3, layer: 'ground' }, nextQuestion: { stepId: 'M2', question: '列车到站后，哪些条件让当地居民真正用得上？', bridge: '工程支撑主通道；接驳、服务与家庭处境决定怎样进入日常生活。' },
  },
  {
    id: 'lalin-caimen-local-use', stepIds: ['M2', 'T3'], title: '拉林铁路与彩门村：到站以后，地方怎样使用新联系？',
    question: '2021年开通的一条铁路，会以同样方式改变每个家庭吗？',
    why: '拉萨经山南至林芝的新铁路连接城市和沿线地点。彩门村访谈把交通与民宿经营、学生出行、地方产品外销联系起来；这些用途还依赖接驳、经营能力和具体服务。',
    howEvidence: ['2021-06-25拉林铁路开通，波密政府事件报道保留拉萨—山南—林芝顺序。', '米林政府2021年8月报道位于雅鲁藏布江旁的彩门村；普巴介绍村庄与机场、公路、铁路的联系，经营民宿的扎西谈到出行与特产外销期待。'],
    location: '拉萨—山南—林芝；彩门村（2021年报道：米林县扎西绕登乡）', time: '2021-06-25开通；2021-08-12地方访谈报道',
    person: { name: '普巴、扎西', role: '2021年报道中的彩门村村委会主任与经营民宿的村民；保留当时身份和受访语境', sourceIds: [caimen.id] },
    namedEvents: [
      { title: '拉林铁路正式开通运营', date: '2021-06-25', dateMeaning: '已发生开通事件，不是当前班次保证', place: '拉萨经山南至林芝', sourceIds: [lalinOpening.id], status: 'event' },
      { title: '彩门村居民谈交通与经营', date: '2021-08-12', dateMeaning: '报道发布日期；其中居民谈及的未来使用是期待', place: '彩门村', sourceIds: [caimen.id], status: 'publication' },
    ], sources: [lalinOpening, caimen],
    whatItSupports: ['同一通道可服务探亲、学习、经营与物流等不同需要。', '用具名当地人的表述补充网络和设施资料，再追问接驳与实际使用条件。'],
    whatItDoesNotSupport: ['将两位受访者代表全村、所有居民或今天的收入、满意度与机会。', '把政府报道中的增收叙述或未来期待当成铁路单独造成的因果成效。', '将开通初期班次、旅行时间、邻近车站或民宿状态当成当前可预订服务。'],
    operation: { prompt: '先接通主通道，再检查接驳、服务设施与使用条件，分别代入学生和经营者的问题。', observe: '从列车到站到地方使用，需要连续的服务链；设施出现与服务可用分开。', feedback: '居民期待说明用途；是否实现以及由谁实现，还需要有日期的使用记录或调查。', limit: '3D没有重建彩门村、机场或铁路站址，也不生成全村收益统计。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'M3', question: '联系带来使用机会时，地方价值如何继续被保护？', bridge: '使用机会增加，还要检查维护、文化与生态条件，不能用通行量单独评价地方。' },
  },
  {
    id: 'pala-household-service-experience', stepIds: ['M2'], title: 'Pala牧民社区：从设施走到家庭经验',
    question: '有了路与电话，怎样知道公共服务更容易使用？',
    why: '同一设施变化会经过家庭的成本、时间与选择才成为生活变化。研究者跟随季节生活和回访，比只拍到一幢学校或一辆车更接近实际使用。',
    howEvidence: ['大学2009年访谈介绍Goldstein与Beall在1986—1988年进入Pala牧民社区，使用全年田野、家庭调查、参与观察和生活史访谈。', '回访叙述认为交通和通信便利使家长更愿意让孩子去寄宿学校，也记录部分较贫困家庭购车购电话负债；两类经验需要同时阅读。'],
    location: 'Pala牧民社区，沿用来源名称；未补写行政县名、坐标或可参访村点', time: '1986—1988年初期田野；后续回访见2009年秋冬刊',
    person: { name: 'Melvyn C. Goldstein、Cynthia M. Beall', role: '社区田野研究者，与西藏社会科学院合作；本卡依据所在大学对研究的访谈介绍', sourceIds: [pala.id] },
    namedEvents: [
      { title: '跨季节牧民社区田野', date: '1986—1988年', dateMeaning: '初期田野区间，不是当前社区状态', place: 'Pala牧民社区', sourceIds: [pala.id], status: 'observation' },
      { title: '研究与回访的大学访谈报道', date: '2009年秋冬刊', dateMeaning: '回顾报道时间；不把文中的today解释为现在', place: '凯斯西储大学刊物，研究地点为西藏社区', sourceIds: [pala.id], status: 'publication' },
    ], sources: [pala],
    whatItSupports: ['公共服务需检查可接近性、家庭实际使用和不同群体的成本。', '家庭调查、访谈和参与观察各提供不同证据，基础设施图不能代替它们。'],
    whatItDoesNotSupport: ['把2009年介绍当成2026年调查，或把文中另述1997—2007年农民研究混入Pala牧民样本。', '将研究者解释当成随机试验证明的因果关系，或从一个社区概括全西藏。', '将研究社区自动加入可访问旅游路线。'],
    operation: { prompt: '保持同一公共设施，逐项核对通路、人员与使用条件，再想象不同家庭还缺哪种资料。', observe: '实体设施和“能持续用上”之间保留条件链。', feedback: '模型帮助提出调查问题；家庭真实经验要由有日期、有方法的记录回答。', limit: '人物模型不扮演具体受访者；本卡没有原始家庭数据、现实服务评分或社区参访安排。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'M3', question: '不同人的使用需求，怎样与保护责任一起讨论？', bridge: '把受影响者放回地方，才能讨论利益、成本与长期维护。' },
  },
  {
    id: 'lhasa-heritage-protection-and-use', stepIds: ['M3', 'T1'], title: '布达拉宫—大昭寺—罗布林卡：保护也有需要比较的选择',
    question: '保护实物、保留环境与继续使用，怎样同时考虑？',
    why: '建筑与材料需要维护，周围视线和历史环境也有价值；朝礼与游客的使用需要安排。保护措施本身也可能改变环境，因此需要监测、评估和调整。',
    howEvidence: ['UNESCO的2025年保护状况页区分缔约国2024年报告与咨询机构分析，涉及三处组成部分的监测、防火与维护。', '其中大昭寺附近三座历史碑的保护棚被评估为有保护作用，也影响视线与历史环境，因而提出减轻外观的整改。罗布林卡缓冲区边界调整当时仍属初步拟议。'],
    location: '拉萨：布达拉宫、大昭寺、罗布林卡；碑棚例子具体在大昭寺附近', time: '2024-11-30提交报告；2025年保护状况审议资料',
    namedEvents: [
      { title: '缔约国提交保护状况报告', date: '2024-11-30', dateMeaning: '报告提交日，不表示所列工作同日完成', place: '拉萨历史建筑群的保护管理', sourceIds: [heritage.id], status: 'publication' },
      { title: '三处组成部分的保护状况分析', date: '2025年', dateMeaning: 'UNESCO保护状况页年度', place: '布达拉宫、大昭寺、罗布林卡', sourceIds: [heritage.id], status: 'publication' },
      { title: '碑棚外观整改与缓冲区调整', date: '2025年资料所述拟议状态', dateMeaning: '提案或初步修改，不是已完成和最终获准的同义词', place: '大昭寺附近碑棚；罗布林卡缓冲区', sourceIds: [heritage.id], status: 'proposal' },
    ], sources: [heritage],
    whatItSupports: ['保护既关心实体材料，也关心历史环境、使用者和管理。', '同一措施可以有正面作用和代价，需要证据与后续检验。'],
    whatItDoesNotSupport: ['将报告所述进展、分析意见与拟议工作都标为独立核验完成。', '把大昭寺碑棚搬到布达拉宫模型，或据文字重建真实保护工程几何。', '以游客增长、主观满意度或教学滑块计算遗产保护成效；不提供现行预约名额和开放保证。'],
    operation: { prompt: '把使用空间与维护条件一起观察，分别说明材料、环境和使用者会受到什么影响。', observe: '对象保持完整，保护与使用条件可以逐项指认。', feedback: '保护并非封存一个外观；提出措施后仍要验证材料、环境和使用能否兼顾。', limit: '当前3D是关系演示，没有复原三处遗产、碑棚方案或模拟UNESCO评估结果。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'T1', question: '如果亲自观察，应该带着哪一个可检验的问题？', bridge: '把刚形成的问题带到真实候选地点，记录材料和条件，形成自己的认识路线。' },
  },
  {
    id: 'lhasa-shannan-nyingchi-learning-corridor', stepIds: ['T1', 'T2', 'T3'], title: '拉萨—山南—林芝：组织一条有问题的认识路线',
    question: '为什么把这些站放在前后，而不只是列出景点？',
    why: '拉萨可追问历史建筑如何保护与使用，沿雅鲁藏布江可追问地形和上下游联系，林芝一侧可继续问通道如何进入地方生活。站点各回答一部分，再把认识带回整张地图。',
    howEvidence: ['2021年开通报道支持拉萨经山南至林芝这一铁路区域通道；UNESCO资料支持在拉萨讨论具体遗产保护问题。', '本卡把已核实的地区联系与问题组织为产品的候选学习顺序；来源没有发布这条完整游程，也未核定每站接驳和开放。'],
    location: '拉萨—山南—林芝的地区联系；具体参访入口由个人候选站和后续核验确定', time: '铁路事件依据2021年；保护议题依据2025年；计划日期由使用者另填',
    namedEvents: [{ title: '可作为研究背景的铁路通道开通', date: '2021-06-25', dateMeaning: '历史开通事件；学习路线是产品组织，不是同时发布的官方行程', place: '拉萨经山南至林芝', sourceIds: [lalinOpening.id], status: 'event' }], sources: [lalinOpening, heritage],
    whatItSupports: ['先保存问题和候选地，再按实际日期补齐交通、接驳、预约与访问条件。', '站点顺序表达知识如何衔接；可以删改和重排，保留自己的观察目的。'],
    whatItDoesNotSupport: ['把主题连线当作精确铁路、公路轨迹，或保证同日完成和任意地点均能直接到达。', '把开通事件当成当前班次、车票、道路或遗产开放已经核实。', '替使用者编造已完成旅行、现场观察或调查记录。'],
    operation: { prompt: '选择自己真正感兴趣的候选站，为每站写一个观察问题，再调整前后关系。', observe: '已选站、观察目的和待核实条件随个人编辑保留。', feedback: '“已保存”表示计划可继续编辑；交通与访问未经核验时，仍应显示待核实。', limit: '此卡提供研究主题顺序，不提供可直接预订的行程、当前班次或景点承诺。' },
    studyTarget: { progress: 1 }, nextQuestion: { stepId: 'T3', question: '哪些已知、哪些仍未知，下一次从哪里继续？', bridge: '保留候选站、来源、问题和待核实事项，让认识可以从同一个地方继续。' },
  },
];

export function contemporaryCasesForStep(stepId: string): readonly ContemporaryCase[] {
  return contemporaryCases.filter(item => item.stepIds.includes(stepId));
}
