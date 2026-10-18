/** Evidence cards checked against the linked primary publications and custodial
 * records on 2026-10-15. They contain no inferred site coordinates, ancient
 * boundaries, reconstructed inscriptions or quantitative simulation inputs. */
export interface HumanHistoryEvidenceSource {
  title: string;
  url: string;
  /** Year of the cited publication/document, when known; not the event year. */
  year?: number;
  identity: string;
  perspective: string;
}

export interface HumanHistoryEvidence {
  id: string;
  stepIds: readonly string[];
  title: string;
  claim: string;
  materialType: string;
  location: string;
  time: string;
  whatItSupports: readonly string[];
  whatItDoesNotSupport: readonly string[];
  source: HumanHistoryEvidenceSource;
  questions: readonly string[];
}

const sources = {
  nwya: {
    title: 'Zhang等 · Science：尼阿底高海拔人类活动研究', url: 'https://pubmed.ncbi.nlm.nih.gov/30498126/', year: 2018,
    identity: '研究论文摘要；Science 362:1049–1051，DOI 10.1126/science.aat8824',
    perspective: '考古地层、测年与石器组合的研究解释；不是现代族群起源说明。',
  },
  agriculture: {
    title: 'Chen等 · Science：农业与距今3600年后的高原长期居住', url: 'https://pubmed.ncbi.nlm.nih.gov/25593179/', year: 2015,
    identity: '研究论文摘要；Science 347:248–250，DOI 10.1126/science.1259172；2014年先行在线发表',
    perspective: '以青藏高原东北部数据检验农牧经济与全年居住的关系，结论须保留研究地域。',
  },
  altitude: {
    title: '兰州大学西部环境教育部重点实验室 · 2014年第3期简报', url: 'https://wel.lzu.edu.cn/pdf/labjb_34.pdf', year: 2014,
    identity: '论文作者所在实验室的成果介绍；PDF第5页及第7—8页',
    perspective: '作者机构对研究的解释，包含地区差别；不能代替全部遗址原始记录。',
  },
  unesco: {
    title: 'UNESCO世界遗产中心 · 拉萨布达拉宫历史建筑群', url: 'https://whc.unesco.org/en/list/707/',
    identity: '世界遗产突出普遍价值说明、真实性与保护要求',
    perspective: '遗产价值与管理叙述；不是逐栋建筑实测图，也不是现今社区调查。',
  },
  metExchange: {
    title: '大都会艺术博物馆 · Tibet and India', url: 'https://www.metmuseum.org/exhibitions/listings/2014/tibet-and-india', year: 2014,
    identity: '博物馆专题展览说明与地区联系介绍',
    perspective: '以11—12世纪藏印佛教艺术和交流为主题，不代表所有宗教、族群与时期。',
  },
  metCover: {
    title: '大都会艺术博物馆 · 释迦牟尼、文殊与金刚手经板', url: 'https://www.metmuseum.org/art/collection/search/37610',
    identity: '馆藏对象记录；藏品号1987.407.6',
    perspective: '对一件木经板的定年、材料与用途解释，不是所有经书的统一形制。',
  },
  metPortrait: {
    title: '大都会艺术博物馆 · 阿底峡画像', url: 'https://www.metmuseum.org/art/collection/search/38006',
    identity: '馆藏对象记录；藏品号1993.479',
    perspective: '宗教肖像及其艺术史解释；不是1042年行旅现场的纪实影像。',
  },
  opera: {
    title: 'UNESCO非物质文化遗产 · 藏戏', url: 'https://ich.unesco.org/en/RL/tibetan-opera-00208', year: 2009,
    identity: '代表作名录项目00208及申报说明；2009年列入名录',
    perspective: '关于特定表演传统的遗产介绍，不能概括所有居民的日常生活。',
  },
  operaTransmission: {
    title: 'UNESCO · 藏戏列入名录决定4.COM 13.23', url: 'https://ich.unesco.org/en/Decisions/4.COM/13.23', year: 2009,
    identity: '政府间委员会2009年决定；R.3列明年轻实践者培训、研究与出版等拟议保护措施',
    perspective: '评审记录说明保护承诺和计划，不等于措施已完成或效果已量化。',
  },
  stele: {
    title: '中国国家博物馆 · 唐蕃会盟碑拓本', url: 'https://www.chnmuseum.cn/zp/zpml/gjwxbt/202008/t20200824_247157.shtml',
    identity: '馆藏拓本介绍；所述碑为823年立，页面没有给出拓印制作年代',
    perspective: '中国国家博物馆对材料及唐蕃关系的解释；碑文的关系用语应放回当时语境。',
  },
  fifthDalai: {
    title: '达赖喇嘛办公室 · 历代达赖喇嘛人物介绍', url: 'https://dalailama.com/the-dalai-lama/previous-dalai-lamas/previous-dalai-lama',
    identity: '宗教机构的人物历史介绍，第五世达赖喇嘛段',
    perspective: '具有该宗教机构的传记与政治历史叙述视角，应与其他史料对读。',
  },
  potalaPhases: {
    title: '鲁宾艺术博物馆 · Potala Palace', url: 'https://rubinmuseum.org/projecthimalayanart/essays/potala-palace/',
    identity: '建筑史研究者Natasha N. Kimmet撰写的博物馆专题论文',
    perspective: '艺术与建筑史解释，区分建筑阶段并讨论宗教和政治象征；不是古代建筑测绘复原。',
  },
  whitePaper1951: {
    title: '国务院新闻办公室 · 西藏和平解放60年', url: 'https://www.neac.gov.cn/seac/c100557/201107/1086353.shtml', year: 2011,
    identity: '2011年7月11日政府白皮书；国家民委网页于2015年转载',
    perspective: '中华人民共和国政府的官方历史叙述；应将可核对的日期、行为与其评价措辞分开。',
  },
  change1959: {
    title: '中国驻奥地利使馆 · 西藏历史', url: 'https://at.china-embassy.gov.cn/lmbf/rdwt/zgxz/200405/t20040513_2448400.htm', year: 2004,
    identity: '中国外交机构发布的历史介绍，记述1959年3月28日国务院命令',
    perspective: '中华人民共和国政府的历史叙述；本页是后来的介绍，并非国务院命令原件。',
  },
  establishment1965: {
    title: '国家民委 · 1965年西藏自治区成立', url: 'https://www.neac.gov.cn/seac/c100558/201509/1086366.shtml', year: 2015,
    identity: '政府机构的历史专题资料，分别记录会议、选举与庆祝活动',
    perspective: '官方机构史叙述；会议日期与制度名称可核对，不能据此推定所有地方体验一致。',
  },
  frus1951: {
    title: '美国国务院历史办公室 · 1951年9月6日涉藏政策备忘录', url: 'https://history.state.gov/historicaldocuments/frus1951v07p2/d185', year: 1951,
    identity: 'FRUS 1951卷VII第2部分，第185号文件；官员Perkins致Merchant的内部备忘录',
    perspective: '体现当时美国官员的情报、政策目标与判断，既非协议原文，也非中立的最终裁决。',
  },
  mongolSeal: {
    title: '深圳博物馆 · 大朝国师统领诸国僧尼中兴释教之印',
    url: 'https://www.shenzhenmuseum.com/webCollection/collectionDetail?exId=75439e253b2f46f3b1fd4bbd940af820&resId=21c09d86a28b4601b9db00a64b306e7e',
    identity: '博物馆具体展品目录；页面类别为“展览作品”，未说明现藏机构；不是1260年诏书原件。',
    perspective: '馆方转述学者将木印与八思巴国师联系的解释，同时保留是否为真印复制件的争议。',
  },
  lamaShuoTextile: {
    title: '故宫博物院 · 缂丝乾隆御笔喇嘛说卷', url: 'https://www.dpm.org.cn/collection/embroider/229855.html',
    identity: '故宫馆藏实物目录，文物号故00072800，清宫旧藏；材料是缂丝，不是纸本手稿或1793年章程原件。',
    perspective: '载体保存清代皇帝的政策表达，今天的馆方说明与文本本身需分开阅读，不能代表各地方群体的意见。',
  },
  gyantsePhotograph: {
    title: 'National Army Museum · Inside the British post near Gyantse, 1904',
    url: 'https://collection.nam.ac.uk/detail.php?acc=1953-06-30-2-58',
    identity: '历史摄影与现代馆藏目录；NAM.1953-06-30-2-58，馆方归于Major M. R. E. Ray，收藏状态为Study collection。',
    perspective: '拍摄者是英军军官，保留军队观看与记录的视角；照片所见与今天的馆藏事件说明不是同一种材料。',
  },
  phagmodruProfile: {
    title: '中国藏学研究中心 · 第15讲：大司徒绛曲坚赞',
    url: 'https://www.tibetology.ac.cn/2023-02/19/content_42264594.htm', year: 2023,
    identity: '研究机构网站刊载的书籍选编人物专题；标题标注张云主编，未列单篇作者，选编自《西藏历史55讲》。本轮核读该官方URL的完整检索缓存正文，原站直连未成功。',
    perspective: '从元代中央与地方制度联系解释人物活动，包含对人物和治理的评价；应将年代、行动与评价分开，继续对读原始文书及其他研究。',
  },
} satisfies Record<string, HumanHistoryEvidenceSource>;

export const humanHistoryEvidence: readonly HumanHistoryEvidence[] = [
  {
    id:'potala-phases-and-use',stepIds:['K1'],title:'白宫与红宫：同一建筑群的不同时代与用途',
    claim:'ICOMOS评估记述1645年起的重建、1648年以白宫为核心的建筑，以及桑结嘉措组织红宫建设、1694年完成。UNESCO将红宫放在白宫以西、较高处。',
    materialType:'世界遗产评估与价值说明',location:'拉萨红山上的布达拉宫；不是大昭寺或罗布林卡的施工记录',
    time:'1645—1648、1694为事件节点；所引评估为1994年材料',
    whatItSupports:['建筑群由不同阶段累积，不能把7世纪来历当成所有现存形制的建造年代。','人物、使用功能与空间位置共同参与理解建筑。'],
    whatItDoesNotSupport:['没有逐栋实测尺寸、门窗数量、室内平面或施工过程几何。','不能由体量图推定真实开放入口、游览线路或当前使用状态。'],
    source:{title:'ICOMOS · Potala Palace, Lhasa 707（1994年评估）',url:'https://whc.unesco.org/document/154063',year:1994,identity:'世界遗产咨询机构评估文件；第5—6页历史与描述',perspective:'遗产评估叙述；并非当时施工日志或建筑测绘。'},
    questions:['白宫与红宫的年代及用途怎样分别核对？','为什么建筑特征图和施工复原需要不同证据？'],
  },
  {
    id: 'nwya-devu-activity', stepIds: ['H1', 'H2'], title: '来过这里，与全年定居是两种问题',
    claim: '2018年尼阿底研究报告约距今4万至3万年、近4600米高海拔的石叶工具组合。',
    materialType: '遗址地层、测年与石器研究', location: '尼阿底遗址；青藏高原高海拔地区', time: '约距今4万—3万年；论文发表于2018年',
    whatItSupports: ['古人类当时曾在这一高海拔环境活动，并使用石叶技术。'],
    whatItDoesNotSupport: ['不能只由这组活动证据断定全年永久定居、现代族群身份或连续居住至今。'], source: sources.nwya,
    questions: ['材料记录的是一次活动、反复使用，还是全年居住？', '要证明全年居住，还需要什么不同证据？'],
  },
  {
    id: 'northeast-agropastoral-settlement', stepIds: ['E3', 'H1', 'H2'], title: '气候条件之外，还有生产技术的改变',
    claim: 'Chen等以高原东北部数据讨论：约距今3600个校正历年后，新的农牧经济帮助人群在更高海拔全年生活。',
    materialType: '考古研究论文摘要', location: '青藏高原东北部研究样本；不是整个西藏自治区', time: '约距今3600 cal BP以后；2015年卷期发表',
    whatItSupports: ['环境约束与生计技术应一起解释，不能把定居只归因于气候变暖。'],
    whatItDoesNotSupport: ['不能把3600 cal BP当作全高原第一次有人、所有地区同时定居或所有农牧文化起源的日期。'], source: sources.agriculture,
    questions: ['一项新技术怎样改变同一环境中的生活可能？', '研究地点与今天选择的地方是不是同一范围？'],
  },
  {
    id: 'altitude-context-and-crops', stepIds: ['E3', 'H1', 'H2'], title: '2500米是研究中的比较，不是全藏定居线',
    claim: '作者实验室介绍：早期东北部粟黍村落多在2500米以下；同时列出东南部卡若约3000米的例子。研究还将大麦、小麦与羊等资源的利用变化，和高海拔生计联系起来。',
    materialType: '作者机构研究简报', location: '高原东北部与东南部卡若的地区对照', time: '分地区讨论史前阶段；简报发表于2014年',
    whatItSupports: ['作物耐寒性、纬度和地方条件需要共同考虑；大麦及农牧结合提供了适应途径。'],
    whatItDoesNotSupport: ['不能从海拔单值推出全高原作物适生区、产量、定居日期或一个社区的现实生活。'], source: sources.altitude,
    questions: ['换到纬度不同的地区，同一海拔还意味着相同条件吗？', '哪些是作物遗存，哪些是研究者提出的解释？'],
  },
  {
    id: 'jokhang-space-material', stepIds: ['P3', 'K1'], title: '先认空间关系，再问怎样使用',
    claim: 'UNESCO说明大昭寺以木与石建造，入口、庭院和佛殿与周边僧舍、库房组成空间关系。',
    materialType: '建筑遗产说明', location: '拉萨大昭寺', time: '现存遗产整体及历史累积；不是单一年代复原',
    whatItSupports: ['将进入、集会、居住和储藏等用途与空间位置一起观察。'],
    whatItDoesNotSupport: ['没有实测图便不能把概念庭院尺寸、房间数量和参观动线说成大昭寺真实布局。'], source: sources.unesco,
    questions: ['同一个庭院连接了哪些不同用途？', '模型表达的关系与真实建筑记录有哪些差别？'],
  },
  {
    id: 'potala-material-function', stepIds: ['K1', 'H4'], title: '材料与用途，要对应到具体部位',
    claim: 'UNESCO记述布达拉宫的夯土与石砌围墙；白宫有仪典、会见与私人空间，红宫有历代达赖喇嘛灵塔。',
    materialType: '建筑遗产说明', location: '拉萨布达拉宫白宫、红宫及附属空间', time: '遗产说明中的建筑整体；各部位有不同营建阶段',
    whatItSupports: ['同一建筑群同时有不同材料、空间与制度用途。'],
    whatItDoesNotSupport: ['材料清单本身不能证明全部厚墙都为御寒，也不能给出墙体传热量或真实构造尺寸。'], source: sources.unesco,
    questions: ['这一部位的材料与这一用途，是否来自同一份记录？', '若要解释保温与承重，还需要哪些调查或物理条件？'],
  },
  {
    id: 'norbulingka-landscape-use', stepIds: ['P3', 'H4'], title: '景观里的意义，来自具体人的使用',
    claim: 'UNESCO将罗布林卡介绍为18世纪营建的夏宫园林，并说明宫殿、寺院和亭阁融入园林布局。',
    materialType: '园林与建筑遗产说明', location: '拉萨罗布林卡', time: '18世纪营建；后续使用与保护需另查相应材料',
    whatItSupports: ['景观形态与历史用途可以一起阅读。'],
    whatItDoesNotSupport: ['不能由过去的夏宫用途推定今天全部空间的使用，也不能把园林意义归结为单一气候原因。'], source: sources.unesco,
    questions: ['自然场地怎样被组织成有用途的园林？', '过去的功能与今天的保护要求相同吗？'],
  },
  {
    id: 'atisha-1042-place-sequence', stepIds: ['K2', 'H2'], title: '1042年的人物行旅，先核对节点',
    claim: '大都会博物馆介绍阿底峡1042年入藏前停留加德满都，随后到西藏西部托林，后来进入西藏中部。',
    materialType: '博物馆地区交流说明', location: '加德满都—托林—西藏中部；仅为材料提及节点', time: '1042年入藏；后续节点没有在该段逐一给出日期',
    whatItSupports: ['人物、学习和地方机构之间存在可核对的交流联系。'],
    whatItDoesNotSupport: ['节点顺序不是逐日行程，不支持精确山路、旅行速度、道路宽度或现代国界投射。'], source: sources.metExchange,
    questions: ['目前知道的是到过哪里，还是确切走过哪一条路？', '哪些地方、文本和人员共同参与了交流？'],
  },
  {
    id: 'translation-and-new-expression', stepIds: ['K2', 'K3'], title: '交流不是内容原样搬运',
    claim: '2014年展览介绍11—12世纪教师往来与文本翻译，指出北印度贝叶写本对西藏绘画表达的影响。',
    materialType: '博物馆艺术史专题', location: '北印度与西藏的学习、翻译和艺术联系', time: '11—12世纪；2014年展览说明',
    whatItSupports: ['具体人物、文本、学习机构和艺术形式共同参与知识传播。'],
    whatItDoesNotSupport: ['不能由寒冷或海拔直接推出某种宗教，更不能让这一时期的交流代表所有地方传统。'], source: sources.metExchange,
    questions: ['翻译、学习和制作各改变了什么？', '相似形式能否单独证明同一宗教意义？'],
  },
  {
    id: 'wooden-manuscript-cover', stepIds: ['K3', 'H2'], title: '从一件木经板读材料与用途',
    claim: '大都会馆藏1987.407.6定为约12世纪早期西藏木经板，保留红色颜料痕迹；馆方说明成对木板保护脆弱书页。',
    materialType: '有编号的馆藏木作记录', location: '对象记录归属西藏；并未给出可定位的出土地', time: '约12世纪早期；1987是入藏编号的一部分，不能当作制作年',
    whatItSupports: ['保护书页的用途与木作、图像表达可以在同一对象中相连。'],
    whatItDoesNotSupport: ['不支持复制未知原书正文、把此件指定给阿底峡，或将馆藏木板画成所有地方经书的统一样式。'], source: sources.metCover,
    questions: ['材料、用途和图像分别有哪些记录？', '哪些部分可从实物核对，哪些还没有证据？'],
  },
  {
    id: 'atisha-portrait-not-event-photo', stepIds: ['K2', 'K3', 'H2'], title: '画像年代，与人物事件年代分开',
    claim: '大都会馆藏阿底峡画像1993.479定为12世纪早中期，材料记作布上胶彩和金；人物1042年入藏是更早的事件。',
    materialType: '有编号的馆藏绘画记录', location: '对象记录归属西藏；不据画像生成行旅现场', time: '作品：12世纪早中期；相关人物事件：1042年',
    whatItSupports: ['后来的宗教画像可以表达对人物的记忆与宗教身份。'],
    whatItDoesNotSupport: ['不是1042年的现场记录，画中符号也不能当作人物实际旅行装备或面貌测量。'], source: sources.metPortrait,
    questions: ['画的是谁，与画在什么时候，是同一个问题吗？', '人物记忆怎样通过后来的作品被表达？'],
  },
  {
    id: 'tibetan-opera-practice', stepIds: ['P3', 'K4'], title: '文化有实践者，也有使用的场地',
    claim: 'UNESCO藏戏介绍列举广场、寺院以及当代舞台等演出场地，并说明主要戏剧情节由一位讲述者叙述、表演者呈现，歌舞和杂技参与配合。',
    materialType: '非物质文化遗产项目说明', location: '项目所涉及的青藏高原藏戏实践场所；不指定某一社区', time: '2009年列入名录；该年不是藏戏创始时间',
    whatItSupports: ['叙述、表演和配合各有作用，文化内容通过参与者的协作成为一次实践。', '同一传统存在不同场地；观察场地怎样容纳表演，是理解文化使用的一种入口。'],
    whatItDoesNotSupport: ['该页没有给出固定圆形看台、观众座位、演员数量或精确走位，模型布局不能当作普遍规制。', '列举场地不等于给出从广场到剧场的统一历史顺序，也不能概括所有居民的全年生活。'], source: sources.opera,
    questions: ['谁负责讲述，谁把故事呈现出来，哪些角色提供配合？', '切换场地时，哪些关系保留，哪些需要另查具体演出资料？'],
  },
  {
    id: 'opera-performance-sequence', stepIds: ['K4'], title: '表演有前后，也有不同的行动',
    claim: 'UNESCO项目说明把祈祷仪式放在开场，主要戏剧放在中间，并以祝福结束；它还记述用树木、彩纸、水及道具标识表演中心。',
    materialType: '非遗项目对表演结构与空间标识的概述', location: '藏戏项目所介绍的表演实践；没有指定一场演出的时间与地点', time: '2009年列入名录的项目说明；不据此推定各段持续时间',
    whatItSupports: ['开场、主要戏剧和结束承担不同作用，可以把讲解对应到同一场地中的不同阶段。'],
    whatItDoesNotSupport: ['不提供具体剧目的台词、唱腔、仪式动作或完整编舞；一般角色移动不能冒充这些内容。', '场地中心的说明不等于原场地测绘，也不能据此推导固定人数、尺寸或观众排列。'], source: sources.opera,
    questions: ['这一阶段是在准备、讲演故事，还是结束祝福？', '哪些内容由文字资料明确记录，哪些需要查看一场有身份和日期的演出记录？'],
  },
  {
    id: 'opera-transmission-and-care', stepIds: ['K4'], title: '保护传统，还要看怎样传给后来的人',
    claim: 'UNESCO 2009年列入名录决定的R.3条列出年轻实践者培训、研究与出版等拟议保护措施，记录社区、实践者及有关机构支持传承的承诺。',
    materialType: '非遗列入名录决定与保护承诺材料', location: '藏戏项目相关实践者、社区与保护组织；不是某个培训班的调查', time: '2009年决定；措施实施结果需另行核查',
    whatItSupports: ['文化的继续需要实践者与学习机会；培训、研究和记录是该决定具体提出的保护方向。'],
    whatItDoesNotSupport: ['保护计划不等于执行完成，也不提供当下传承人数、满意度或成效的量化结果。', '一般的示范与练习模型不能重建某位传承人的教学法、具体课堂或已证实的学习结果。'], source: sources.operaTransmission,
    questions: ['记录写的是保护承诺，还是已发生的结果？', '要判断一次学习和代际传承的实际效果，需要哪些有时间、地点和参与者的资料？'],
  },
  {
    id: 'alliance-event-821-822', stepIds: ['H2', 'H3'], title: '会盟是事件，先把时间放准确',
    claim: '国博拓本介绍把所纪念的唐蕃会盟置于长庆元年至二年，即821—822年。',
    materialType: '馆藏拓本的事件背景说明', location: '唐蕃会盟相关历史地点；此条不依据现代地图复原现场', time: '会盟事件：821—822年',
    whatItSupports: ['事件发生先于用碑刻纪念，可以在时间线上分开观察。'],
    whatItDoesNotSupport: ['不能仅凭这一页面补出每次会盟的精确场址、人物动作或全部谈判过程。'], source: sources.stele,
    questions: ['这条日期描述的是事件，还是制作一件材料？', '事件之后，怎样留下可阅读的记录？'],
  },
  {
    id: 'stele-inscription-823', stepIds: ['H3', 'K3', 'H2'], title: '823年立碑，文字留下了什么',
    claim: '国博说明会盟碑立于823年，以藏汉两种文字记载盟文及会盟参与者的职衔、姓名。',
    materialType: '碑刻内容与立碑年代的馆藏说明', location: '唐蕃会盟碑；地图只承担材料定位', time: '立碑：823年；并非会盟全部发生于这一年',
    whatItSupports: ['双语记载把事件、参与者和记录行为连接起来。'],
    whatItDoesNotSupport: ['不应编造可释读碑文或用现代国界替代碑文所处时代的政治关系。'], source: sources.stele,
    questions: ['碑刻记录了哪些类型的信息？', '为什么要把立碑年与会盟年分开？'],
  },
  {
    id: 'rubbing-as-mediated-record', stepIds: ['H3', 'H2'], title: '今天阅读的是拓本介绍',
    claim: '国博这一馆藏页面的材料身份是唐蕃会盟碑拓本；页面未交代这件拓本的具体拓印年份。',
    materialType: '馆藏拓本及其现代目录记录', location: '国博馆藏记录；原碑与拓本属于不同材料环节', time: '拓印年份未在该页给出；页面路径中的年份不代替材料定年',
    whatItSupports: ['原碑、拓印记录、馆藏目录与今天的解释需要逐层区分。'],
    whatItDoesNotSupport: ['不能把823年自动写成拓本制作年，也不能把程序生成石碑称为馆藏原物。'], source: sources.stele,
    questions: ['我们正在看原碑、拓本，还是对材料的文字介绍？', '缺失的材料日期应当怎样显示？'],
  },
  {
    id: 'political-node-1642', stepIds: ['H2'], title: '1642年的政治节点在日喀则',
    claim: '达赖喇嘛办公室的人物介绍记述，五世达赖喇嘛1642年在日喀则取得宗教与政治领导地位。',
    materialType: '宗教机构人物历史介绍', location: '日喀则；不等于1645年拉萨的建筑现场', time: '1642年政治节点',
    whatItSupports: ['政治安排与建筑营建应分开日期、地点和行动。'],
    whatItDoesNotSupport: ['不能由传记一句概述绘制精确管辖边界，或让所有地区、机构在同一年拥有相同状态。'], source: sources.fifthDalai,
    questions: ['这一条讲的是领导地位、营建，还是具体管理范围？', '宗教机构传记的叙述，应怎样与其他材料对读？'],
  },
  {
    id: 'potala-building-1645', stepIds: ['H2', 'H4'], title: '1645年开工，是另一种历史行动',
    claim: '同一人物介绍记载1645年讨论并开始在拉萨红山营建布达拉宫。',
    materialType: '宗教机构人物历史介绍', location: '拉萨红山；与1642年日喀则政治节点分开', time: '1645年开始营建；不等于现存整体在这一年全部完成',
    whatItSupports: ['把营建行为放回人物、机构和城市空间的变化中。'],
    whatItDoesNotSupport: ['不能据开工年份一次性显示完整宫殿，也不能将现存整体作为7世纪原貌。'], source: sources.fifthDalai,
    questions: ['开工、分期完成与今天可见的整体有什么差别？', '哪些构造需要额外建筑调查才能复原？'],
  },
  {
    id: 'potala-construction-phases', stepIds: ['H4'], title: '同一建筑还有不同营建阶段',
    claim: '鲁宾博物馆建筑史专题将白宫主要营建列为1645—1648年，红宫列为1690—1694年。',
    materialType: '有署名的建筑史研究', location: '拉萨布达拉宫白宫与红宫', time: '该专题采用的阶段：1645—1648年、1690—1694年',
    whatItSupports: ['今天的整体汇集了不同阶段，可在同一位置比较营建时序。'],
    whatItDoesNotSupport: ['年份范围不提供各年的几何模型或工程进度，也不能在不知道施工次序时逐层伪造复原。'], source: sources.potalaPhases,
    questions: ['同一地点在两个阶段，增加了哪类用途？', '时间轴知道到哪一步，几何复原证据又知道到哪一步？'],
  },
  {
    id: 'mongol-preceptor-seal-identity', stepIds: ['H2'], title: '一方国师印，也有需要保留的鉴定争议',
    claim: '深圳博物馆展品目录将这方木印与八思巴国师的历史联系起来，同时说明是否为真印复制件尚存争议；研究关联不等于原件身份已经确定。',
    materialType: '有鉴定争议的木质印章展品目录', location: '网页未说明制作地、出土地或现藏机构；不据此生成遗址坐标',
    time: '馆方宽泛编目为元（1206—1368）；1260年为封授国师的历史关联，不是现存木印的确定制作年',
    whatItSupports: ['从具体实物目录提出称号、印信、文字和授权怎样关联的问题，并辨认研究仍保留哪些争议。'],
    whatItDoesNotSupport: ['不能把1260年写成这方木印的确切制作年，也不能把展品页面直接写成“深圳博物馆藏”。', '不由一方印章推定所有地区的制度实行方式、实际成效或精确历史边界。'], source: sources.mongolSeal,
    questions: ['文物的历史关联，与原件或复制件的身份，是同一种判断吗？', '还需要哪些出土、流传或文书材料核对使用情境？'],
  },
  {
    id: 'qing-lama-shuo-textile', stepIds: ['H2'], title: '1792年的文本，不等于缂织载体的精确制作年',
    claim: '故宫这件缂丝卷保存清代皇帝关于藏传佛教事务的文字表达；馆方将《喇嘛说》写作联系到1792年及金奔巴制度，需要区分文本写作、缂织载体和制度实际运行。',
    materialType: '清宫旧藏缂丝文本卷的馆藏目录', location: '清宫旧藏，现由北京故宫博物院编目；不是拉萨地方现场记录',
    time: '文本写作：1792年；本件载体编目：清乾隆，未给出独立确认的精确缂织年份',
    whatItSupports: ['同一政策文本可以通过不同物质载体保存，文本、制作与收藏需要分层阅读。'],
    whatItDoesNotSupport: ['不是《钦定藏内善后章程二十九条》原件、1792年纸本手稿或金瓶实物。', '不能由御制文本推断所有地方按相同方式实施，也不能据此判断地方接受程度或生活结果。'], source: sources.lamaShuoTextile,
    questions: ['1792年描述的是文本写作，还是眼前物品的制作？', '知道了政策如何表述，研究地方运行还需要什么材料？'],
  },
  {
    id: 'gyantse-1904-military-photograph', stepIds: ['H2'], title: '1904年江孜：一张军队视角的照片',
    claim: 'National Army Museum将这张江孜附近英军营地照片归于军官M. R. E. Ray于1904年拍摄，并将远处建筑辨认为宗堡；照片是特定观看角度的记录，不能代表全部战事和居民经历。',
    materialType: '历史照片及其博物馆馆藏目录', location: '江孜附近英军营地；没有核实摄影机坐标；现藏英国National Army Museum',
    time: '照片拍摄年：1904；目录说明中的7月6日是攻占宗堡的事件日期，不能自动当作照片拍摄日',
    whatItSupports: ['将记录者、拍摄年份与营地和宗堡的可见关系对应起来，再与其他来源对读。'],
    whatItDoesNotSupport: ['不能独立还原战斗全过程、伤亡或当地居民的完整经历，也不据此补画战术路线。', 'Study collection是收藏状态，不能据此宣称原照目前正在对外展出。'], source: sources.gyantsePhotograph,
    questions: ['摄影者在什么位置、以什么身份记录？', '照片直接可见的内容，与馆方后来补充的事件背景，哪些相同、哪些不同？'],
  },
  {
    id: 'phagmodru-jangchub-1358-profile', stepIds: ['H2'], title: '14世纪地方组织变化：先分清人物节点与后世研究',
    claim: '该人物专题记述1358年元顺帝赐封绛曲坚赞为“大司徒”，将这一节点放在帕木竹巴与萨迦地方势力变动的背景下。这里阅读的是后世研究的转述。',
    materialType: '研究机构人物专题／后世研究', location: '帕木竹巴及乃东、贡嘎等地方组织背景；该页未提供1358年封赐的具体现场',
    time: '历史节点：1358年（该专题记述）；网页发布：2023年2月19日；专题实际写作年与选编书出版年未在该页给出',
    whatItSupports: ['为14世纪地方政治组织变化提供一个可继续查证的人物节点，区分职衔、授权与地方运行。'],
    whatItDoesNotSupport: ['该页不是1358年诏书原件、印章原物或《朗氏家族史》原卷，本轮未检视这些原件。', '不能由人物评价直接断言全部地方治理成效，也不能用单一14世纪案例概括14—17世纪所有地区的制度、社会与宗教变化。'], source: sources.phagmodruProfile,
    questions: ['1358年、2023年分别描述什么，实际写作年代是否已经知道？', '若要核实封授与地方运行，还需要哪些文书版本、机构记录或地方材料？'],
  },
  {
    id: 'agreement-beijing-1951', stepIds: ['H2', 'H4'], title: '1951年的协议，地点在北京',
    claim: '2011年国务院新闻办公室白皮书记述，中央人民政府与西藏地方政府于1951年5月23日在北京签订十七条协议。',
    materialType: '政府白皮书中的历史记述', location: '北京签约；并非拉萨某建筑内发生的事件', time: '事件：1951年5月23日；白皮书：2011年',
    whatItSupports: ['将协议、参与机构和签订地点作为一个独立节点核对。'],
    whatItDoesNotSupport: ['白皮书不是协议原件；不能据一个节点概括其后所有政策、地方反应或整段社会变化。'], source: sources.whitePaper1951,
    questions: ['日期、地点与发布机构可以怎样分别核对？', '当时文件与后来回顾，对同一事件各记录什么？'],
  },
  {
    id: 'institutional-change-1959', stepIds: ['H2', 'H4'], title: '1959年先核对命令与机构变化',
    claim: '中国使馆历史介绍记述，1959年3月28日国务院宣布解散西藏地方政府，由西藏自治区筹备委员会行使其职权。',
    materialType: '政府外交机构的历史介绍', location: '命令针对西藏地方政府机构；不据此给全部行动指定同一地点', time: '机构变化：1959年3月28日；本页发布于2004年',
    whatItSupports: ['政府机构及职权的变更与后续改革，应作为具体历史行动分别追问。'],
    whatItDoesNotSupport: ['后来的介绍不是命令原件，也不能以单一日期代表所有改革完成、所有人的经历或事件的全部解释。'], source: sources.change1959,
    questions: ['命令写明了哪一个机构的职权转移？', '制度节点之外，还缺哪些地方与个人层面的材料？'],
  },
  {
    id: 'autonomous-region-1965', stepIds: ['H2', 'H4'], title: '1965年自治区成立，与前两次节点分开',
    claim: '国家民委专题记述1965年9月1—9日拉萨召开的第一届人民代表大会，及自治区成立、选举与庆祝活动。',
    materialType: '政府机构历史专题记录', location: '拉萨；此条不是1951年北京签约的同一现场', time: '1965年9月会议；专题页面发表于2015年',
    whatItSupports: ['1951年协议、1959年机构变更和1965年自治区成立是不同阶段。'],
    whatItDoesNotSupport: ['不能把会议开幕、选举、庆祝当作同一日，也不能从这一节点倒画之前所有时期的行政边界。'], source: sources.establishment1965,
    questions: ['会议、选举与成立庆祝分别是什么行动？', '现代行政地图能说明哪些历史问题，又不能说明哪些？'],
  },
  {
    id: 'us-policy-memorandum-1951', stepIds: ['H2', 'H4'], title: '不同文件，也记录不同主体的目标',
    claim: '1951年9月6日美国官员内部备忘录讨论其对涉藏协议的判断与政策选择，后来收入FRUS档案。',
    materialType: '当时政府内部政策备忘录的档案刊本', location: '华盛顿的政策讨论；并非西藏地方现场调查', time: '文件日期：1951年9月6日；不同于5月23日协议签订',
    whatItSupports: ['比较不同主体在同一时期记录什么、掌握什么信息、希望采取什么政策。'],
    whatItDoesNotSupport: ['官员意见与政策建议不是已执行行动，更不能当成中立终审或协议全文。'], source: sources.frus1951,
    questions: ['作者是在记录所见、提出判断，还是建议行动？', '同一年份的文件为什么可能提出不同问题？'],
  },
];

export const historyPeriodEvidenceIds = {
  prehistoric: ['nwya-devu-activity', 'northeast-agropastoral-settlement', 'altitude-context-and-crops'],
  empire: ['alliance-event-821-822', 'stele-inscription-823', 'rubbing-as-mediated-record'],
  revival: ['atisha-1042-place-sequence', 'atisha-portrait-not-event-photo', 'wooden-manuscript-cover'],
  yuan: ['mongol-preceptor-seal-identity'],
  local: ['phagmodru-jangchub-1358-profile'],
  ganden: ['political-node-1642', 'potala-building-1645'],
  qing: ['qing-lama-shuo-textile'],
  'early-modern': ['gyantse-1904-military-photograph'],
  contemporary: ['agreement-beijing-1951', 'institutional-change-1959', 'autonomous-region-1965', 'us-policy-memorandum-1951'],
} as const satisfies Record<string, readonly string[]>;
export type HumanHistoryPeriodId = keyof typeof historyPeriodEvidenceIds;

/** Match the H2 scene/description fallback; empty period mappings never borrow other material. */
export function resolveHumanHistoryPeriodId(periodId?: string): HumanHistoryPeriodId {
  return periodId && Object.hasOwn(historyPeriodEvidenceIds, periodId) ? periodId as HumanHistoryPeriodId : 'empire';
}

export function humanHistoryEvidenceForPeriod(periodId?: string): readonly HumanHistoryEvidence[] {
  const ids: readonly string[] = historyPeriodEvidenceIds[resolveHumanHistoryPeriodId(periodId)];
  return ids.flatMap(id => humanHistoryEvidence.find(evidence => evidence.id === id) ?? []);
}

export function humanHistoryEvidenceForStep(stepId: string, periodId?: string): readonly HumanHistoryEvidence[] {
  if (stepId === 'H2') return humanHistoryEvidenceForPeriod(periodId);
  return humanHistoryEvidence.filter(evidence => evidence.stepIds.includes(stepId));
}
