/**
 * Nine sourced explanations share the regional map. Lines express relationships,
 * not surveyed roads, pipes or historical itineraries. The maintenance switch
 * compares teaching conditions; it does not report a real service interruption.
 * Sources were checked on 2026-10-15. Town references locate reading areas only.
 */
export type CityLifeCityId = 'nyingchi' | 'lhasa' | 'ngari';
export type CityLifeStageId = 'environment' | 'life' | 'history';

export interface CityLifeBeat {
  at: number;
  title: string;
  text: string;
}

export interface CityLifeStage {
  id: CityLifeStageId;
  title: string;
  question: string;
  narration: string;
  beats: CityLifeBeat[];
  sourceIds: string[];
  bridge: string;
  scope: string;
}

export interface CityLifeJourney {
  cityId: CityLifeCityId;
  title: string;
  summary: string;
  lifeChain: [string, string, string];
  maintenanceFeedback: { maintained: string; unmaintained: string };
  historyMilestones: {
    date: string;
    title: string;
    text: string;
    referenceId: string;
    sourceIds: string[];
  }[];
  stages: CityLifeStage[];
}

export const cityLifeSources: { id: string; title: string; url: string; note: string }[] = [
  {
    id: 'city-life-southeast-moisture',
    title: '中科院地球环境所 · 藏东南夏季水汽来路研究（2025）',
    url: 'https://www.ieecas.cn/news/kydt/202506/t20250606_7798567.html',
    note: '研究团队介绍示踪采样与1940—2020年夏季再分析，支持印度洋、孟加拉湾经雅鲁藏布峡谷与藏东南的水汽联系；不是全林芝全年统一风场。',
  },
  {
    id: 'city-life-nyingchi-overview',
    title: '林芝市人民政府 · 林芝概况',
    url: 'https://www.linzhi.gov.cn/linzhi/zmlz/zmlz.shtml',
    note: '用于藏东南位置、森林、大峡谷、高山与工布文化背景；不采用页面未统一统计期的气候、人口或面积数字。',
  },
  {
    id: 'city-life-lulang-2016',
    title: '官方地方资料 · 鲁朗小镇与318国道（2016）',
    url: 'https://www.linzhi.gov.cn/xwzx_406/dsdt/201812/t20181216_22625.html',
    note: '正文日期2016-10-02，记载鲁朗位置、318国道东西联系和小镇试运营。其民居包含不同地区风格的再现，不能当作古代原貌；当年状态不等于今天班次、通行或经营条件。',
  },
  {
    id: 'city-life-sejila-route-2022',
    title: '西藏自治区文旅厅 · 林芝经色季拉山至鲁朗（2022）',
    url: 'https://wlt.xizang.gov.cn/xwzx_69/wlyw/dsdt/202207/t20220719_314644.html',
    note: '2022-07-19资料记述从林芝市区沿G318途经色季拉山、鲁朗再至波密，支持越岭与地方联系；不提供道路测绘、当前路况或通行保证。',
  },
  {
    id: 'city-life-sejila-project-2023',
    title: '西藏自治区交通厅 · G318色季拉山越岭工程公告（2023）',
    url: 'https://jtt.xizang.gov.cn/xxgk/fdzdgknr/zbgg/202311/t20231106_384359.html',
    note: '2023-11-06招标公告说明鲁朗至林芝越岭项目及穿越色季拉山的隧道设计；建设计划不能当作已通车结果，文字路线不能替代工程几何。演示试线未冒充既有G318或该新线。',
  },
  {
    id: 'city-life-gongbo-protection-2021',
    title: '林芝市政府 · 工布新年保护传承提案答复（2021）',
    url: 'https://linzhi.gov.cn/linzhi/xwzx/202108/01d4547746164fb4becd1eb26ffefaac.shtml',
    note: '2021-08-10答复说明工布地域、2006年自治区级非遗认定，以及传承人和社区演出队的参与；认定年份不是节日的起源年份，不由地方传说补造历史年代。',
  },
  {
    id: 'city-life-gongbo-learning-2026',
    title: '林芝市政府 · 图书馆与博物馆的工布文化活动（2026）',
    url: 'https://linzhi.gov.cn/linzhi/xwzx/202606/ae69ea9e68094a1baa1a000f9bc1ea8e.shtml',
    note: '2026-06-16报道6月13日活动：市图书馆与藏东南文化遗产博物馆讲解工布服饰并组织亲子实践；支持当代传习案例，不代表全部工布文化历史。',
  },
  {
    id: 'city-life-lhasa-valley',
    title: 'NASA · 拉萨河谷三维影像',
    url: 'https://science.nasa.gov/earth/earth-observatory/lhasa-tibet-40334/',
    note: '2005-11-24 ASTER影像，2009年发布；支持较平缓河谷、城区与周围山地的空间关系。原图是假彩色历史影像，不是当前城市边界或建设实况。',
  },
  {
    id: 'city-life-lhasa-water-2022',
    title: '拉萨市人民政府 · 十四五水安全保障规划（2022）',
    url: 'https://www.lasa.gov.cn/lasa/wjzl/202204/0195f5cb1a964d6c9121791d618ed7e2.shtml',
    note: '2022-04-07发布。现状分析称当时中心城区主要使用地下水，并区分水源、工程、供水保障和管护；规划目标不能当作今天已完成结果。模型不还原取水点、管网或供水能力。',
  },
  {
    id: 'city-life-lhasa-heritage',
    title: 'UNESCO · 拉萨历史建筑群与大昭寺',
    url: 'https://whc.unesco.org/en/list/707/',
    note: '采用大昭寺7世纪创建、老城位置以及建筑与宗教用途的说明；始建年代与现存建筑历次增修分开。布达拉宫17世纪建设采用独立建筑史研究核对。',
  },
  {
    id: 'city-life-potala-research',
    title: '鲁宾艺术博物馆 · Natasha N. Kimmet布达拉宫研究（2023）',
    url: 'https://rubinmuseum.org/projecthimalayanart/essays/potala-palace/',
    note: '艺术史与建筑研究者署名文章：白宫1645—1648年、红宫1690—1694年，以及五世达赖喇嘛、桑结嘉措、工匠与使用功能；地图只标拉萨城区参照，不新增建筑测绘位置。',
  },
  {
    id: 'city-life-ngari-geography',
    title: '阿里地区行政公署 · 自然地理',
    url: 'https://www.al.gov.cn/zjal/zrdl.htm',
    note: '介绍北部高原湖盆、中部高山宽谷、南部高山峡谷，以及少雨和分布不均；狮泉河镇用于区域定位，不能代表整个阿里地区。',
  },
  {
    id: 'city-life-ngari-water-2023',
    title: '阿里地区行政公署 · 狮泉河盆地灌溉与管护（2023）',
    url: 'https://www.al.gov.cn/info/1035/48267.htm',
    note: '2023-11-20报道噶尔县城附近护林员伦珠操作水渠闸口冬灌，以及林地巡护；同文还有札达象泉河谷沙棘案例，两处地点分别阅读。没有导入水渠测绘或实测用水量。',
  },
  {
    id: 'city-life-tibet-india',
    title: '大都会艺术博物馆 · 西藏与印度（2014）',
    url: 'https://www.metmuseum.org/exhibitions/listings/2014/tibet-and-india',
    note: '专题说明11—12世纪教师、学习、翻译与艺术交流；地图图注记载阿底峡1042年入藏、加德满都与托林等节点，不给出每一段古道或行程。',
  },
  {
    id: 'city-life-zanda-life-2020',
    title: '阿里地区行政公署 · 古格遗址旁札布让村庄（2020）',
    url: 'https://www.al.gov.cn/info/1019/128537.htm',
    note: '2020-07-30报道将札布让组定位在札达县托林镇、古格遗址脚下，介绍金珠德吉经营家庭旅馆。只采用人物、地点和生活活动，不把旧收入或接待量用于今天。',
  },
];

export const cityLifeJourneys: CityLifeJourney[] = [
  {
    cityId: 'nyingchi', title: '林芝：山谷怎样接到生活与工布文化',
    summary: '从藏东南水汽与山地进入林芝，沿鲁朗的通行和服务认识地方联系，再用有年份的社区与公共文化活动理解工布文化怎样被传习。',
    lifeChain: ['通行与越岭', '坡面水流', '鲁朗低缓空间'],
    maintenanceFeedback: {
      maintained: '教学条件中，试线标记继续前行，管护取用示意口开启；天然坡面水流和鲁朗低缓地面不变。试线与取用口不代表真实道路或供水设施。',
      unmaintained: '教学对照让标记停在试线检查处，取用示意口关闭；天然坡面水流仍下降，地面保持原样。这不是林芝实际交通或供水中断。',
    },
    historyMilestones: [
      { date: '2006年', title: '工布新年的非遗认定', text: '2021年政府答复记载工布新年于2006年列入自治区级非遗项目名录。认定是保护节点，不能用来确定节日起源。', referenceId: 'nyingchi', sourceIds: ['city-life-gongbo-protection-2021'] },
      { date: '2016年', title: '鲁朗小镇试运营', text: '官方资料记载鲁朗小镇开始试运营，环境、道路与旅游服务形成新的联系；建筑风格再现不等于古代村落原貌。', referenceId: 'lulang', sourceIds: ['city-life-lulang-2016'] },
      { date: '2026年', title: '工布服饰进入公共文化课堂', text: '林芝市图书馆与藏东南文化遗产博物馆组织讲解和亲子实践，展示地方文化通过教学与参与继续传承。', referenceId: 'nyingchi', sourceIds: ['city-life-gongbo-learning-2026'] },
    ],
    stages: [
      {
        id: 'environment', title: '把林芝放回藏东南的山谷与来流',
        question: '水汽为什么容易联系到藏东南，同一地区又为何不同？',
        narration: '保留西藏整体，先看东南部的林芝。夏季，印度洋和孟加拉湾方向的水汽可沿大峡谷进入藏东南。来到同一片山地，山脊、深谷和高差又改变空气的经过条件。森林与高山相邻，城区只是地区入口。沿谷地继续追问，人们怎样在这些条件中通行和生活？',
        beats: [
          { at: 0, title: '从外部来路看藏东南', text: '先在整体地图认出林芝所在的东南方向，再联系印度洋和孟加拉湾的夏季水汽；这条关系不是某日的实际风场。' },
          { at: .34, title: '山脊与深谷继续改变条件', text: '水汽到达山地以后，仍要看高差、山谷和气流的组合。同一个地区的谷地与高山，不能用同一种水热条件概括。' },
          { at: .68, title: '由地区环境进入生活问题', text: '城区点帮助进入林芝，周围还有森林、山地与其他城镇。保留这些空间关系，下一步看通行怎样成为人的活动条件。' },
        ],
        sourceIds: ['city-life-southeast-moisture', 'city-life-nyingchi-overview'],
        bridge: '保留林芝和鲁朗，依次看越岭高差、坡面水流与低缓空间，再问这些条件怎样进入生活。',
        scope: '气流为来向示意，城区点不代表全域；不由地球影像颜色推算雨量或植被范围。',
      },
      {
        id: 'life', title: '从越岭高差、水流，到鲁朗的生活空间',
        question: '同一片地形，怎样分别影响通行、水流与聚居空间？',
        narration: '先从林芝城区向鲁朗读地形试线。山谷与山脊带来高差；三一八国道涉及色季拉越岭，试线不是公路。再看水珠沿坡面下降，说明高差怎样改变水流去向。这些水珠演示自然过程，并不表示城镇供水。最后看鲁朗窗口的相对低缓地面。二〇一六年小镇建设利用当地水系、山景与村落，继续接到人的生活安排。',
        beats: [
          { at: 0, title: '通行：越岭高差不能被谷地遮住', text: '标记从林芝城区参照向鲁朗沿高程试线前进，地形随山谷与山脊起伏。资料支持G318色季拉越岭，但这条试线不是公路或拟建隧道线。' },
          { at: .34, title: '水流：沿坡面下降不等于城市供水', text: '水珠沿真实高程的下坡路径下降。开关只改变旁边的管护取用示意口，天然水流仍继续；它说明取用需要人的行动，不定位供水设施。' },
          { at: .68, title: '空间：在鲁朗窗口读相对低缓地面', text: '绿色逐步显示鲁朗窗口内相对低缓处，不是市界或建设用地。2016年小镇建设资料说明当地水系、山景与村落被利用，再接到工布文化传习。' },
        ],
        sourceIds: ['city-life-lulang-2016', 'city-life-sejila-route-2022', 'city-life-sejila-project-2023'],
        bridge: '低缓地面提供条件，2016年的鲁朗建设是人的安排；接着用工布新年保护和服饰课堂，认识文化怎样被传习。',
        scope: '试线来自真实高程采样，不是318国道实测线形或2023拟建工程。坡面下降与取用口均非供水测绘；绿色是窗口内相对低缓，不是市界。维护对照不代表真实停运或交通预测。',
      },
      {
        id: 'history', title: '工布文化怎样在地方实践中延续',
        question: '同样的环境背景，为什么还要看人的传习与不同年代？',
        narration: '工布文化不能由森林和雨量直接推出。先看二〇〇六年，工布新年进入自治区级非遗名录，这是保护节点。再看二〇一六年的鲁朗，小镇建设给地方交流增加了新场所。到二〇二六年，林芝图书馆与博物馆把工布服饰带进亲子课堂。文化通过人的学习和参与继续传承。',
        beats: [
          { at: 0, title: '2006：保护已有的地方实践', text: '工布新年的名录认定说明社会怎样保护地方实践。它是有记录的保护节点，不是节日从这一年才出现的意思。' },
          { at: .34, title: '2016：鲁朗增加交流场所', text: '鲁朗小镇的试运营是现代建设事件。看地方服务和交流怎样变化，同时分清旅游小镇中的风格再现与历史原貌。' },
          { at: .68, title: '2026：通过教学继续传习', text: '图书馆与博物馆组织工布服饰讲解和家庭实践。自然环境提供背景，文化的延续还需要学习、组织与人的参与。' },
        ],
        sourceIds: ['city-life-gongbo-protection-2021', 'city-life-lulang-2016', 'city-life-gongbo-learning-2026'],
        bridge: '保留环境、生活、传习这三个问题，再比较拉萨：河谷城市又怎样累积自己的历史？',
        scope: '使用有年份的保护、建设与传习材料，不补造工布文化起源；林芝和鲁朗为聚居地参照。',
      },
    ],
  },
  {
    cityId: 'lhasa', title: '拉萨：河谷怎样承载城市与历史',
    summary: '从较平缓的高原河谷读城市空间，把自然水源与供水服务分开，再沿大昭寺、白宫与红宫的年代认识城市历史的累积。',
    lifeChain: ['河谷通行', '地下取水原理', '低缓城市空间'],
    maintenanceFeedback: {
      maintained: '教学条件中，标记沿河谷观察线前行，示意水点向上提升；低缓地面保持不变。提升说明取水需要设施和管护，不定位井口或管网。',
      unmaintained: '教学条件切换后，试线标记在检查处暂停，地下取水示意不再向上提升；地形仍在。这不是拉萨实际停水或交通故障的消息。',
    },
    historyMilestones: [
      { date: '7世纪', title: '大昭寺创建', text: 'UNESCO将大昭寺创建置于7世纪，并将其放在拉萨老城理解；始建年代不等于全部现存构件都属于同一时期。', referenceId: 'lhasa', sourceIds: ['city-life-lhasa-heritage'] },
      { date: '1645—1648年', title: '五世达赖喇嘛与白宫建设', text: '建筑史研究将白宫建设置于1645—1648年，联系五世达赖喇嘛及仪典、居住等使用需要。', referenceId: 'lhasa', sourceIds: ['city-life-potala-research'] },
      { date: '1690—1694年', title: '桑结嘉措与红宫建设', text: '研究说明桑结嘉措主持红宫建设，1694年完成。纪念、宗教活动与组织施工共同参与建筑形成。', referenceId: 'lhasa', sourceIds: ['city-life-potala-research'] },
    ],
    stages: [
      {
        id: 'environment', title: '河谷较平缓，仍在高原之上',
        question: '拉萨为什么能在高山之间形成较集中的城市空间？',
        narration: '沿整体地图来到拉萨，先把城区放回拉萨河谷。较平缓的谷地与周围山地形成对照，水与可用土地给聚居、生产和通行提供条件。平缓并不等于海拔低，也不等于全市都是同样的地貌。保留这层高差，再追问自然界的水怎样经过设施与人的工作，成为城市用水。',
        beats: [
          { at: 0, title: '先把城区放回河谷', text: '从完整区域靠近拉萨，比较谷地和周围山地。NASA历史三维影像支持这种空间关系，不提供今天的城市边界。' },
          { at: .34, title: '较平缓的土地仍在高地', text: '河谷的相对平缓为聚居和通行提供空间，但不等于接近海平面。城市空间与周围山地要同时保留在观察中。' },
          { at: .68, title: '从水源条件转向供水问题', text: '看到河谷和自然水，并不能知道居民怎样取水。继续追踪设施与管护，把环境条件接到能够使用的城市服务。' },
        ],
        sourceIds: ['city-life-lhasa-valley', 'city-life-lhasa-water-2022'],
        bridge: '保持拉萨的位置，先读河谷通行的高差，再看地下取水原理，最后把低缓空间接到城市历史。',
        scope: '高程与城区参照用于读地形；历史影像不代表今日城区，未绘制实测河道或取水口。',
      },
      {
        id: 'life', title: '河谷怎样接到通行、取水与城市空间',
        question: '较平缓的地面和自然水源，怎样经过人的安排参与城市生活？',
        narration: '先读拉萨河谷的真实高程剖面，比较谷底与两侧山地。较平缓地面提供通行空间，剖面线不是道路。再看地下取水向上提升的原理。二〇二二年规划说，当时中心城区主要使用地下水；水源仍需要取供水设施。最后保留城区与周围低缓空间。地形提供条件，七世纪大昭寺与十七世纪布达拉的建设，还要继续追问历史。',
        beats: [
          { at: 0, title: '通行：河谷与周围山地一起读', text: '标记沿真实高程剖面移动，比较谷底与两侧山地。剖面用来读高差，不是实际道路；切换组织条件时，地形不变，标记在教学检查处停下。' },
          { at: .34, title: '用水：从地下向上提升的原理', text: '2022年规划说当时中心城区主要使用地下水。观察示意水点向上提升，切换管护后提升停止；这是取水原理，不是实际井位、含水层深度或管网。' },
          { at: .68, title: '空间：低缓地面与历史建设分开解释', text: '保留拉萨城区参照，绿色显示窗口内相对低缓地面。它说明空间条件，不划定城区；7世纪大昭寺与17世纪布达拉的建设，还需要人物和年代材料。' },
        ],
        sourceIds: ['city-life-lhasa-valley', 'city-life-lhasa-water-2022', 'city-life-lhasa-heritage', 'city-life-potala-research'],
        bridge: '河谷和低缓地面提供空间；接着沿7世纪大昭寺、17世纪白宫与红宫的材料，认识人怎样继续塑造城市。',
        scope: '2022年文件的现状与规划分别阅读；地下取水为提升原理，深度无比例，未定位井口或管网。高程剖面非道路，低缓着色非城界；不模拟真实停水或当前供水状态。',
      },
      {
        id: 'history', title: '同一河谷，累积了不同年代的历史',
        question: '地形提供位置以后，哪些人和事件继续塑造拉萨？',
        narration: '留在拉萨河谷，把时间展开。大昭寺创建于七世纪，是认识早期宗教与老城的入口。再到十七世纪，五世达赖喇嘛推动白宫建设；随后桑结嘉措主持红宫，至一六九四年完成。今天看到的历史城市，是不同人物、用途和建设阶段累积而成，不能单靠气候或山地解释。',
        beats: [
          { at: 0, title: '7世纪：大昭寺与老城', text: '先读大昭寺的创建年代与宗教用途。地图保留拉萨城区参照，不能把这个点当作寺院坐标或全部古城范围。' },
          { at: .34, title: '1645—1648：白宫的建设', text: '白宫联系五世达赖喇嘛和当时的使用需求。山地提供空间背景，选择地点、组织工匠和安排用途还属于人的行动。' },
          { at: .68, title: '1694：红宫完成，历史继续累积', text: '桑结嘉措主持的红宫建设增加了新的纪念与宗教空间。同一河谷里的建筑有不同年代，不能合成一次建城事件。' },
        ],
        sourceIds: ['city-life-lhasa-heritage', 'city-life-potala-research'],
        bridge: '回到整体地图，再看阿里：较干冷的西部怎样用水，又怎样留下跨地区交流的历史？',
        scope: '年代来自遗产与建筑史材料；地图仅用拉萨城区参照，不生成大昭寺或布达拉宫的精确坐标与复原模型。',
      },
    ],
  },
  {
    cityId: 'ngari', title: '阿里：从狮泉河用水，到札达历史交流',
    summary: '在西部高地先认识狮泉河盆地的水与管护，再明确移到另一个地方——札达，用托林交流和古格遗址旁村庄材料连接历史与生活。',
    lifeChain: ['盆地通行', '闸口引水原理', '盆地聚居空间'],
    maintenanceFeedback: {
      maintained: '教学条件中，标记沿盆地观察线前行，管护取用示意口开启；天然坡面水流仍下降。开口对应引水动作，不是伦珠工作的闸口坐标。',
      unmaintained: '教学条件让标记停在检查处，取用示意口关闭；天然下坡水流和盆地地面不变。这是在比较操作作用，不是当地渠系损坏的报告。',
    },
    historyMilestones: [
      { date: '11—12世纪', title: '先把托林放入跨地区交流背景', text: '博物馆专题记述藏印教师、学习、翻译和艺术的密切联系；托林是西部交流的具体材料入口，和狮泉河管护案例分别定位。', referenceId: 'tholing', sourceIds: ['city-life-tibet-india'] },
      { date: '1042年', title: '阿底峡与托林的有证联系', text: '大都会博物馆图注记载阿底峡1042年入藏，并联系加德满都、托林等节点；材料没有给出逐段古道。', referenceId: 'tholing', sourceIds: ['city-life-tibet-india'] },
      { date: '2020年报道', title: '古格遗址旁的札布让生活', text: '报道中的金珠德吉在札布让经营家庭旅馆，让古格遗址和村庄生活进入同一个问题；托林镇点仅作札达地方入口。', referenceId: 'tholing', sourceIds: ['city-life-zanda-life-2020'] },
    ],
    stages: [
      {
        id: 'environment', title: '较干冷的西部，也有不同的河谷与水源',
        question: '阿里为什么不能只用干旱和荒凉两个词概括？',
        narration: '把地图退回西部整体，先用狮泉河找到阿里。这里有高原湖盆、宽谷和高山峡谷，降水较少，也分布不均。环境不同，能够取用的水和土地就要分别认识。现在靠近狮泉河盆地，保留周围高地，追问一个更具体的问题：河水怎样经过设施和劳动，被送到需要水的林地？',
        beats: [
          { at: 0, title: '西部高地有不同地貌', text: '先用狮泉河镇定位阿里，再展开湖盆、宽谷和山地。一个驻地参照不能代替整个地区的环境，西部也有内部差异。' },
          { at: .34, title: '少雨不等于完全没有水', text: '地方地理资料介绍降水稀少且分布不均，同时列出河流与湖泊。认识生活条件，还要看具体地方怎样接近和使用水。' },
          { at: .68, title: '靠近狮泉河盆地的用水案例', text: '先保留盆地和周围高地，下一段读护林员的实际工作。自然水源、取用设施和需要用水的地块，分别承担不同作用。' },
        ],
        sourceIds: ['city-life-ngari-geography', 'city-life-ngari-water-2023'],
        bridge: '固定在狮泉河盆地，先看高差与通行，再看报道中的开闸动作，最后读盆地的聚居空间。',
        scope: '狮泉河镇只定位阅读区域；不绘制实际林地边界，也不用驻地气候代表整个阿里。',
      },
      {
        id: 'life', title: '盆地高差、闸口用水与地方空间',
        question: '地形、水流和人的操作，各自怎样参与狮泉河的生活？',
        narration: '先读狮泉河盆地的高程剖面。谷地与周围高地相连，跨越坡面就要面对高差；试线用来观察通行条件。再看闸口怎样控制引水。二〇二三年的报道中，护林员伦珠开闸让水进入林地；这里演示动作，不还原渠系。最后看盆地中相对低缓的空间。用水与管护参与生活；接着移到另一处地方，札达和托林，再读历史。',
        beats: [
          { at: 0, title: '通行：盆地仍有需要跨越的高差', text: '观察标记沿狮泉河盆地的高程试线前进，比较周围高地与较低地面。试线揭示通行面对的高差，不是实际道路，也不定位某次运输。' },
          { at: .34, title: '用水：让取用口响应人的开闸动作', text: '2023年报道记载伦珠开闸引水冬灌。天然下坡水流保持不变，开关只控制旁边的管护取用示意口，区分自然水流与人的取用，不还原渠系。' },
          { at: .68, title: '空间：读狮泉河，再定位另一处历史地方', text: '绿色显示狮泉河窗口内相对低缓的地面，不是城界或林地范围。认识盆地生活后，地图还要明确移到札达与托林，才能接上另一处地方的历史。' },
        ],
        sourceIds: ['city-life-ngari-geography', 'city-life-ngari-water-2023'],
        bridge: '用水解释狮泉河的一个生活案例；进入历史前，先在同一地图明确移到札达与托林。',
        scope: '采用2023年冬灌动作与人物；高程试线非道路，下坡水流和取用口非渠系测绘，绿色非城界或林地。停用对照不是当地事故，狮泉河不等于札达托林。',
      },
      {
        id: 'history', title: '换到札达：托林交流与古格旁的生活',
        question: '离开狮泉河案例以后，怎样用另一处地方读历史？',
        narration: '先离开狮泉河，在同一地图找到札达的托林入口。十一至十二世纪，教师、文本和艺术联系着西藏与印度。博物馆材料记载阿底峡一〇四二年入藏，并与托林相联系。再看二〇二〇年报道，古格遗址旁的金珠德吉经营家庭旅馆。不同地点和年代，让交流、遗产与生活各有来路。',
        beats: [
          { at: 0, title: '先换地方，再换历史问题', text: '托林与札达是另一处阅读区域，不能由狮泉河冬灌直接推导古格历史。先把它放回11—12世纪跨地区交流的背景。' },
          { at: .34, title: '1042：从具体人物认识交流', text: '阿底峡与托林的关系有博物馆材料支撑。教师、文本和翻译让知识进入地方；地点关系仍不能确定每段古代道路。' },
          { at: .68, title: '2020：遗址旁仍有地方生活', text: '札布让村庄报道连接古格遗址与家庭旅馆经营者。历史遗产与生活选择可以一起读，旧收入和接待量不代表今天。' },
        ],
        sourceIds: ['city-life-tibet-india', 'city-life-zanda-life-2020'],
        bridge: '三地都已从环境接到人的行动。回到整体比较，再沿自己的问题进入文化、历史和周边联系。',
        scope: '托林镇参考点不等于托林寺、古格遗址或札布让村坐标；人物联系不是精确古道，报道日期不是遗址年代。',
      },
    ],
  },
];

export function getCityLifeJourney(cityId: string): CityLifeJourney | undefined {
  return cityLifeJourneys.find(journey => journey.cityId === cityId);
}

// Segment boundaries are authored at the actual change of subject. Separate
// recordings let audio completion, labels and the scene change together rather
// than estimating a historical date from the length of a whole paragraph.
const narrationBreaks: Record<CityLifeCityId, Record<CityLifeStageId, [string, string]>> = {
  nyingchi: {
    environment: ['来到同一片山地', '森林与高山相邻'],
    life: ['再看水珠沿坡面下降', '最后看鲁朗窗口'],
    history: ['再看二〇一六年', '到二〇二六年'],
  },
  lhasa: {
    environment: ['较平缓的谷地', '保留这层高差'],
    life: ['再看地下取水向上提升', '最后保留城区'],
    history: ['再到十七世纪', '随后桑结嘉措'],
  },
  ngari: {
    environment: ['环境不同', '现在靠近狮泉河盆地'],
    life: ['再看闸口怎样控制引水', '最后看盆地中'],
    history: ['博物馆材料记载', '再看二〇二〇年报道'],
  },
};

export function cityLifeNarrationSegments(cityId: string, stageId: CityLifeStageId) {
  const journey = getCityLifeJourney(cityId), stage = journey?.stages.find(item => item.id === stageId);
  if (!journey || !stage) return [];
  const breaks = narrationBreaks[journey.cityId][stageId].map(text => stage.narration.indexOf(text));
  if (breaks[0] <= 0 || breaks[1] <= breaks[0]) throw new Error(`Invalid city narration segments: ${cityId}/${stageId}`);
  const offsets = [0, ...breaks, stage.narration.length];
  return stage.beats.map((beat, index) => ({
    id: `CITY-${cityId}-${stageId}-${index + 1}`,
    text: stage.narration.slice(offsets[index], offsets[index + 1]),
    start: beat.at, end: stage.beats[index + 1]?.at ?? 1,
  }));
}

export const cityLifeNarrationCues = cityLifeJourneys.flatMap(journey => journey.stages.flatMap(stage =>
  cityLifeNarrationSegments(journey.cityId, stage.id).map(segment => ({
    id: segment.id, title: stage.title, narration: segment.text,
    stepId: `CITY-${journey.cityId}`, chapterId: 'cities',
  })),
));
