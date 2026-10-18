import { verifiedPlaceReferences } from './placeProvenance';
import type { RegionalJourney, RegionalJourneySource } from './regionalJourneyTypes';

/** Checked 2026-10-16. A reading reference never substitutes for a measured heritage site. */
export const easternRegionalSources: RegionalJourneySource[] = [
  {
    id: 'regional-east-locators', title: 'Natural Earth · 公开聚居地参考点',
    url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
    publisher: 'Natural Earth', date: '本项目已归档的公开地名记录，核对于2026-10-16',
    supports: ['昌都、那曲城区定位沿用本项目归档记录；不定位河流交汇、寺院、车站、村庄或行政边界。'],
  },
  {
    id: 'regional-chamdo-landform', title: '昌都地貌',
    url: 'https://lyfz.changdu.gov.cn/cdslyj4/c101494/202005/d5050a4a0fff4295946d47b07fe016f5.shtml',
    publisher: '昌都市文化和旅游局（市文物局）', date: '2025-11-20',
    supports: ['藏东近南北向山脉与金沙江、澜沧江、怒江平行岭谷；水流切割参与山原峡谷地貌形成。', '只采用定性地貌描述，不以概览网格复原某次地质运动或精细峡谷。'],
  },
  {
    id: 'regional-east-uplift-cloud', title: 'Cloud Development · Orographic lifting and cloud formation',
    url: 'https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm',
    publisher: 'NOAA · 美国国家气象局', date: '2026-10-16核对',
    supports: ['空气被地形抬升后膨胀冷却，达到凝结条件可形成云；凝结成云不等于必然产生降水。', '仅支撑一般过程，不提供昌都实测风场或降水。'],
  },
  {
    id: 'regional-chamdo-climate', title: '昌都市生态文明建设规划（2019—2025年）· 自然环境现状',
    url: 'https://sthj.changdu.gov.cn/hjbhj/c102635/202005/5ba2bc9039a74b5794d308b6c07d0105.shtml',
    publisher: '昌都市生态环境局', date: '2020年公开的规划文本',
    supports: ['现状分析记述夏季较湿、冬季干冷，近南北向岭谷有利于暖湿气流输送，并存在明显垂直变化。', '规划中的目标与项目不当作已完成结果；动画不模拟某日风场或给出局地雨量。'],
  },
  {
    id: 'regional-chamdo-confluence', title: '历史沿革 · 两河汇合处',
    url: 'https://www.changdu.gov.cn/cdrmzf/c100654/202005/d351a91d4bfe401d8e7e61dfe88da63f.shtml',
    publisher: '昌都市人民政府', date: '2026-02-27',
    supports: ['昂曲与扎曲在昌都汇成澜沧江；城市名称与汇流位置的关系。', '不把城区参考点当作水文断面，不用名称推定城市起源年代。'],
  },
  {
    id: 'regional-chamdo-city-space', title: '昌都——两河口的藏东重镇',
    url: 'https://zrzy.changdu.gov.cn/gtzyj/c101252/201008/e4951e5184a6480d8b753f656203b4df.shtml',
    publisher: '昌都市自然资源局', date: '2010年公开资料',
    supports: ['文章描述城市山地围合、河谷平地有限，河流分隔的片区通过桥梁相连。', '只说明该文记录的地形与连接关系，不将2010年片区描述当作今天建设边界。'],
  },
  {
    id: 'regional-chamdo-karuo', title: '四川大学考古学专业六十周年专栏（四）：记卡若遗址的发掘',
    url: 'https://sum.scu.edu.cn/info/1091/1584.htm',
    publisher: '四川大学博物馆，陈显丹研究员回忆', date: '2020-11-03',
    supports: ['参加发掘者的回忆：遗址在昌都东南澜沧江西岸卡若村；1979年童恩正带领学生参与发掘的具体情境。', '卡若材料须与地点和发掘情境联系，不能复原未经测量的史前村庄全貌。'],
  },
  {
    id: 'regional-chamdo-heritage', title: '名胜古迹 · 卡若遗址与强巴林寺',
    url: 'https://www.changdu.gov.cn/cdrmzf/c100655/202005/07021629f1df4f8f9da0b49847d0c99e.shtml',
    publisher: '昌都市人民政府', date: '2026年页面核对',
    supports: ['卡若遗址年代约距今4000—5000年，材料包括房屋遗迹、石器、骨器、陶片、动物骨骼和粟。', '强巴林寺位于两水交汇附近，地方资料记述1437—1444年修建；始建年代不等于现存建筑全部年代。'],
  },
  {
    id: 'regional-chamdo-guozhuang', title: '西藏自治区昌都市文化旅游专题展 · 昌都锅庄舞',
    url: 'https://lyfz.changdu.gov.cn/cdslyj4/c101252/202311/eee3f02806634172a74dc45569c97cb2.shtml',
    publisher: '昌都市文化和旅游局（市文物局）', date: '2023-11',
    supports: ['节日、庆典、婚嫁中的圆圈歌舞以及农区、牧区、寺庙锅庄的区别；2006年列入首批国家级非遗名录。', '不把景观或气候直接解释为某种舞蹈的成因，也不据认定年份判断起源。'],
  },
  {
    id: 'regional-chamdo-bangda', title: '昌都邦达机场通航30周年',
    url: 'https://lyfz.changdu.gov.cn/cdslyj4/c101255/202504/453e35fd90784ecf9528c6dc7376e797.shtml',
    publisher: '昌都市文化和旅游局，来源昌都发布', date: '2025-04-29',
    supports: ['1995年4月28日正式通航，首条航线成都—昌都；机场位于八宿县邦达草原，距昌都市区约126公里。', '只用历史通航日期与机场—城区尺度，不提供当前航班、道路用时或通行保证。'],
  },
  {
    id: 'regional-chamdo-airport-locator', title: 'Qamdo Bangda Airport（ZUBD/BPX）· Facility data',
    url: 'https://ourairports.com/airports/ZUBD/', publisher: 'OurAirports 开放机场数据库', date: '记录显示2008-06-17更新；2026-10-16核对',
    supports: ['机场位置参考30.553600°N、97.108299°E；公开数据库参考点，并非官方航行资料或跑道测绘。', '只采用位置字段，不采用评论区跑道、航班或世界纪录说法。'],
  },
  {
    id: 'regional-chamdo-observation', title: '这份二日游攻略，带你畅游昌都',
    url: 'https://lyfz.changdu.gov.cn/cdslyj4/c101252/202504/67bd17eb08c84a3aa71f4151b9af740b.shtml',
    publisher: '昌都市文化和旅游局（市文物局）', date: '2025-04',
    supports: ['官方文旅资料列出茶马广场、昌都市博物馆、滨果观景台、强巴林寺、卡若遗址，记述市区经G214前往卡若。', '用于有目的的观察顺序，不把旧攻略当作当前开放、路况或可驾驶导航。'],
  },
  {
    id: 'regional-nagqu-landform', title: '那曲草原土地',
    url: 'https://zrzyt.xizang.gov.cn/dt/xzzrzygk/201907/t20190731_90636.html',
    publisher: '西藏自治区自然资源厅', date: '正文2010-08-14',
    supports: ['旧那曲县位于唐古拉与念青唐古拉山脉之间；低温、季节与高海拔是地方草地生长条件。', '旧地区描述中西部多丘陵盆地，东部多高山峡谷；不套用旧统计数字或行政范围说明今天全市统一气候。'],
  },
  {
    id: 'regional-nagqu-weather', title: '那曲气候背景分析',
    url: 'https://www.weather.com.cn/cityintro/101140601.shtml',
    publisher: '中国天气网（中国气象局）', date: '页面未列统计期；2026-10-16核对',
    supports: ['冬季寒冷、夏季不热、多风，降水主要在暖季；降水存在空间差异。', '页面不同段落年雨量口径不一，产品不采用数值，不冒充1991—2020年气候正常值。'],
  },
  {
    id: 'regional-nagqu-station', title: '那曲高寒气候环境观测研究站综合立体观测数据集（2014—2024年）',
    url: 'https://www.ncdc.ac.cn/portal/metadata/ae33e686-2282-4063-a5d5-d2b26cbd7583',
    publisher: '国家冰川冻土沙漠科学数据中心', date: '数据时段2014—2024年，2026-10-16核对',
    supports: ['那曲气候环境站本部位于罗玛镇，资料公布31.37°N、91.90°E、海拔4509米；研究能量与水循环。', '点仅为该气候环境站，不与其他那曲生态站混同；未导入观测序列，不在动画中制造实测气温、风速或降水。'],
  },
  {
    id: 'regional-nagqu-new-life', title: '搬新家、科学放牧……去那曲草原看牧民们的新生活',
    url: 'https://nynct.xizang.gov.cn/xwzx/xzsn/202508/t20250801_493074.html',
    publisher: '西藏自治区农业农村厅，来源央视新闻客户端', date: '2025-08-01',
    supports: ['杭嘉新村毗邻那曲高速出口，集中居住配套水电暖和网络，村民以草场与牦牛入股合作社。', '聂荣县嘎确牧场2020年起收购合作社畜产品加工外销；两个地点分开，不以局部个案概括全市。'],
  },
  {
    id: 'regional-nagqu-race', title: '赛马会（恰青赛马会）· 国家级非遗项目',
    url: 'https://www.ihchina.cn/art/detail/id/23700.html',
    publisher: '中国非物质文化遗产网 · 中国非物质文化遗产保护中心', date: '2021年第五批扩展项目',
    supports: ['传统牧民节会，通常在8月举行，包含赛马、说唱、歌舞、交换；不同县区群众参与传承。', '项目说明区分17—18世纪集训、后来阅兵赛马与今天节会；2021年是名录认定而非起源年份，格萨尔故事是民间传说。'],
  },
  {
    id: 'regional-nagqu-rail', title: '青藏铁路简介',
    url: 'https://jtt.xizang.gov.cn/xxgk/fdzdgknr/jggk/jtgk/201611/t20161130_233601.html',
    publisher: '西藏自治区交通运输厅', date: '2016-11-30',
    supports: ['青藏铁路2006年7月1日全线通车，线路经过那曲至当雄、拉萨。', '不把概念联系动画当作铁路测绘线、当前时刻表或运输时耗。'],
  },
  {
    id: 'regional-nagqu-logistics', title: '青藏铁路那曲物流中心竣工典礼暨入驻企业签字仪式',
    url: 'https://www.xizang.gov.cn/xwzx_406/bmkx/201812/t20181216_16004.html',
    publisher: '西藏自治区人民政府', date: '正文2009-08-18',
    supports: ['2009年8月17日物流中心举行竣工典礼及企业签字仪式，资料记述散装堆装、综合物流、产品加工等功能。', '采用完成事件与功能关系，不把2020年运量预测当作实测成果，也不绘制未经导入的园区边界。'],
  },
  {
    id: 'regional-nagqu-expressway', title: '拉萨至那曲行车时间缩短至3小时',
    url: 'https://www.xizang.gov.cn/xwzx_406/dsdt/202108/t20210823_256138.html',
    publisher: '西藏自治区人民政府，来源西藏商报', date: '2021-08-23',
    supports: ['2021年8月21日那曲至羊八井段开放试运行，接通那曲—拉萨高速。', '报道提供当时国道与高速出行对照；产品只采用通车事件，时间不是今天行程保证。'],
  },
];

const cityCoordinates = (id: 'chamdo' | 'nagqu'): [number, number] => [verifiedPlaceReferences[id].longitude, verifiedPlaceReferences[id].latitude];

export const easternRegionalJourneys: RegionalJourney[] = [
  {
    cityId: 'chamdo', title: '昌都：平行岭谷怎样接到城市与交换',
    lead: '在同一张西藏地图读藏东岭谷，以两河口城区为入口，串起河谷生活、卡若材料、文化实践与机场接续。',
    terrainNote: '地形来自区域实测高程网格的概览抽样；来流、坡面过程和联系是原理演示。城区参考不定位寺院、遗址或两河交汇点，机场点不含跑道或道路几何。',
    overviewPosition: cityCoordinates('chamdo'),
    sourceIds: ['regional-east-locators', 'regional-east-uplift-cloud', 'regional-chamdo-landform', 'regional-chamdo-climate', 'regional-chamdo-confluence', 'regional-chamdo-city-space', 'regional-chamdo-karuo', 'regional-chamdo-heritage', 'regional-chamdo-guozhuang', 'regional-chamdo-bangda', 'regional-chamdo-airport-locator', 'regional-chamdo-observation'],
    points: [
      { id: 'chamdo', name: '昌都城区 · 河谷与历史材料入口', coordinates: cityCoordinates('chamdo'), kind: 'city', scopeNote: '沿用Natural Earth城区参考，不能定位两河交汇、卡若遗址、强巴林寺或城市边界。', sourceIds: ['regional-east-locators', 'regional-chamdo-confluence'] },
      { id: 'bangda-airport', name: '邦达机场 · 位置参考', coordinates: [97.108299, 30.553600], kind: 'airport', scopeNote: 'OurAirports公开位置参考；非官方航行图，不含跑道或机场—城区公路线形。', sourceIds: ['regional-chamdo-airport-locator', 'regional-chamdo-bangda'] },
    ],
    stages: [
      {
        id: 'environment', title: '先读三江与平行岭谷', question: '为什么藏东既有沿谷来流，又有跨山阻隔？',
        summary: '暖湿气流的来路、高差和坡向共同参与地方差异；三条大江各在自己的流域中。',
        controls: ['改变来流方向，比较沿谷与迎坡抬升。', '调节地形显示夸张，保留原始高程读数。'],
        cues: [
          { id: 'chamdo-environment-1', text: '保留西藏全图，把注意力移到东部的昌都。这里的山脉和河流多接近南北排列，金沙江、澜沧江、怒江分走不同河谷。先读山脊与谷底的高差，才能理解为什么沿谷和横向跨山面对不同条件。', action: 'valley', anchor: '这里的山脉和河流多接近南北排列', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-landform'] },
          { id: 'chamdo-environment-2', text: '再把暖湿来流放回这些岭谷。昌都生态规划的环境分析指出，近南北向谷地有利于暖湿空气输送；空气遇坡上升时会冷却，水汽充足才可能凝结成云。转动来流，比较沿谷经过与迎坡抬升的差别。', action: 'rain', anchor: '再把暖湿来流放回这些岭谷', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-climate', 'regional-east-uplift-cloud'] },
          { id: 'chamdo-environment-3', text: '同在昌都，低处河谷与高处山地不能共用一种气候。高度、坡向和来流改变水热组合，夏季与冬季也不同。现在让水珠沿网格坡面下降，追问这些河谷怎样提供生活空间，又怎样把不同岸边分开。', action: 'water', anchor: '水珠沿网格坡面下降', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-climate', 'regional-chamdo-landform'] },
        ],
      },
      {
        id: 'life', title: '河谷空间怎样被人连接', question: '有河、有平地，为什么还需要桥梁与服务组织？',
        summary: '有限谷地提供活动条件，跨河连接把自然条件转化为人的通行和城市服务。',
        controls: ['沿谷与跨坡试线对照高差，试线不冒充道路。', '开关联系示意，比较跨河服务需要人的设施与组织。'],
        cues: [
          { id: 'chamdo-life-1', text: '昌都的名字联系着水的汇合：昂曲与扎曲在城区附近汇成澜沧江。河谷较低处提供活动条件，两旁山坡又限制连续的平缓空间。地图的城区点只是阅读入口，不能把这个点当作河流交汇的精确位置。', action: 'settlement', anchor: '昂曲与扎曲在城区附近汇成澜沧江', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-confluence', 'regional-chamdo-city-space'] },
          { id: 'chamdo-life-2', text: '河流带来联系，也形成跨岸障碍。二〇一〇年的地方资料描述，昌都片区被河流分开，再由桥梁连接。保留地形，比较连接前后活动能否衔接；这解释桥梁的作用，不重建当年的桥位或今天城区边界。', action: 'road', anchor: '片区被河流分开，再由桥梁连接', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-city-space'] },
          { id: 'chamdo-life-3', text: '沿谷活动还要考虑坡面来水与季节。谷地不是自动安全、自动便利的建设地，通行、排水和服务都需要具体安排。把生活问题保留下来，再读卡若遗址的房屋、器物和粟：过去的人怎样利用这里，要让材料回答。', action: 'water', anchor: '沿谷活动还要考虑坡面来水与季节', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-climate', 'regional-chamdo-heritage'] },
        ],
      },
      {
        id: 'history', title: '从卡若材料到文化实践', question: '同一片山谷里，不同年代的人留下什么证据？',
        summary: '史前生活、寺院营建和今日传习有不同材料；环境提供条件，人的选择与交往形成历史。',
        controls: ['逐段选择史前材料、十五世纪营建和非遗保护。', '保持城区入口，比较材料年代与今天地形。'],
        cues: [
          { id: 'chamdo-history-1', text: '卡若遗址位于昌都东南的澜沧江西岸。地方资料把它的年代放在距今约四千至五千年，房屋、动物骨骼与粟提供生活证据。一九七九年童恩正带领学生参与发掘，让材料进入研究；示意不能替代史前村庄测绘。', action: 'heritage', anchor: '卡若遗址位于昌都东南的澜沧江西岸', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-karuo', 'regional-chamdo-heritage'] },
          { id: 'chamdo-history-2', text: '把年代向后推到十五世纪。昌都政府资料记述，强巴林寺于一四三七年至一四四四年修建，位置与两水交汇附近的城市相联系。寺院用途和营建属于新的历史阶段，不能由卡若遗址直接推出，也不能由气候直接解释。', action: 'heritage', anchor: '一四三七年至一四四四年修建', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-heritage'] },
          { id: 'chamdo-history-3', text: '文化还在人的参与中延续。昌都锅庄见于节日、庆典和婚嫁，农区、牧区与寺庙又各有类型；二〇〇六年进入首批国家级非遗名录。这是保护节点，不是舞蹈起源。由地方交往继续看，现代交通怎样扩大往来的范围。', action: 'heritage', anchor: '文化还在人的参与中延续', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-guozhuang'] },
        ],
      },
      {
        id: 'connections', title: '机场接续，再回到地方观察', question: '空中联系怎样真正接到河谷城市？',
        summary: '邦达通航增加远距离出入方式，落地后仍需地面接续；观察把交通、环境和历史材料接回同一个问题。',
        controls: ['比较机场联系与城区接续两个环节。', '依次观察河谷、博物馆材料与历史地点，核对当期访问条件。'],
        cues: [
          { id: 'chamdo-connections-1', text: '一九九五年四月二十八日，邦达机场正式通航，首条航线连接成都与昌都。远距离往来增加了航空选择，但机场不在昌都城区：它位于八宿县邦达草原。把两个位置同时留下，才看得见飞抵机场还不是抵达城市。', action: 'road', anchor: '一九九五年四月二十八日', pointIds: ['chamdo', 'bangda-airport'], sourceIds: ['regional-chamdo-bangda'] },
          { id: 'chamdo-connections-2', text: '二〇二五年通航纪念资料记述，邦达机场距昌都市区约一百二十六公里。人和行李落地以后，还要接续山地公路与城市服务。这里分开演示空中到达和地面接续；连接是关系示意，不提供实时航班或公路导航。', action: 'road', anchor: '还要接续山地公路与城市服务', pointIds: ['bangda-airport', 'chamdo'], sourceIds: ['regional-chamdo-bangda'] },
          { id: 'chamdo-connections-3', text: '现在把旅行变成观察：先在城区辨认河谷与跨河联系，再从博物馆材料读卡若生活，继续比较强巴林寺的年代和用途。官方文旅资料把这些地点联系起来；按当前开放与交通安排核对后，再回到地图解释看到的差异。', action: 'observe', anchor: '先在城区辨认河谷与跨河联系', pointIds: ['chamdo'], sourceIds: ['regional-chamdo-observation', 'regional-chamdo-heritage'] },
        ],
      },
    ],
  },
  {
    cityId: 'nagqu', title: '那曲：高寒草地怎样接到生活与交流',
    lead: '从藏北高地的季节和水热条件，进入具体牧业组织、恰青赛马会，再读铁路、公路与物流如何接续。',
    terrainNote: '城区点沿用公开聚居地参考；罗玛镇点仅定位气候环境站。草地状态、来流与服务联系是教学条件，不是实测植被分布、牧场边界或道路测绘。',
    overviewPosition: cityCoordinates('nagqu'),
    sourceIds: ['regional-east-locators', 'regional-nagqu-landform', 'regional-nagqu-weather', 'regional-nagqu-station', 'regional-nagqu-new-life', 'regional-nagqu-race', 'regional-nagqu-rail', 'regional-nagqu-logistics', 'regional-nagqu-expressway'],
    points: [
      { id: 'nagqu', name: '那曲城区 · 草地生活与交流入口', coordinates: cityCoordinates('nagqu'), kind: 'city', scopeNote: 'Natural Earth城区参考，不定位杭嘉新村、嘎确牧场、赛马场、那曲车站或物流园。', sourceIds: ['regional-east-locators'] },
      { id: 'nagqu-climate-station', name: '罗玛镇气候环境站 · 研究公布位置', coordinates: [91.90, 31.37], kind: 'landscape', scopeNote: '数据集公布到0.01°的站点位置；不是牧业村或全市气候代表范围，动画没有导入该站观测序列。', sourceIds: ['regional-nagqu-station'] },
    ],
    stages: [
      {
        id: 'environment', title: '开阔高地仍然是高海拔', question: '为什么平缓的草地，仍面对强烈季节限制？',
        summary: '相对平缓和海拔高低是两回事；低温、降水季节与不同地形共同改变草地条件。',
        controls: ['比较较平缓地面与共同海平面上的实际高程。', '切换暖季和冷季教学条件，观察水热与草地生长窗口。'],
        cues: [
          { id: 'nagqu-environment-1', text: '先把那曲放回藏北高原。地面显得开阔，不表示海拔低：相对起伏与相对海平面的高度是两件事。读高程柱，再沿地面看丘陵与盆地；高海拔与低温共同影响草地生长，不能因为看上去平坦就按低地理解。', action: 'valley', anchor: '先把那曲放回藏北高原', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-landform'] },
          { id: 'nagqu-environment-2', text: '把季节加入同一片地形。那曲气候资料说明冬季寒冷，夏季不热，降水集中在较暖时段。教学对照让水汽、云雨与地面生长条件一起变化，帮助理解可用牧草为什么有季节；它不代表某天或全市的实测天气。', action: 'rain', anchor: '把季节加入同一片地形', pointIds: ['nagqu', 'nagqu-climate-station'], sourceIds: ['regional-nagqu-weather', 'regional-nagqu-landform'] },
          { id: 'nagqu-environment-3', text: '那曲内部也有差别。旧地方地理资料区分中西部的丘陵盆地与东部高山峡谷，城区周边不能代表整个市域。罗玛镇气候环境站持续研究能量与水循环；要判断具体变化，仍需对应地点和时期的观测，再讨论人的安排。', action: 'valley', anchor: '那曲内部也有差别', pointIds: ['nagqu', 'nagqu-climate-station'], sourceIds: ['regional-nagqu-landform', 'regional-nagqu-station'] },
        ],
      },
      {
        id: 'life', title: '草场、住房与服务怎样接续', question: '草地给出条件，生活为什么还需要技术和组织？',
        summary: '生活空间与生产空间可通过合作和服务联系；以2025年两个不同地方案例说明人的选择。',
        controls: ['保留高地，比较生产、居住与服务环节能否接续。', '对照夏季草地条件与冷季补给问题，避免把示意当成真实牧场。'],
        cues: [
          { id: 'nagqu-life-1', text: '牧草、水源与季节影响生产安排，却不会自动决定今天怎样居住。先保持草地地形，再看住房、补给与服务的联系。把环节分开，才能理解放牧和城镇生活为什么可以同时存在，也能继续追问谁组织这些联系。', action: 'settlement', anchor: '牧草、水源与季节影响生产安排', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-landform', 'regional-nagqu-new-life'] },
          { id: 'nagqu-life-2', text: '二〇二五年的报道给出具体例子：色尼区杭嘉新村集中建设住房，配套水电暖与网络，村民把草场、牦牛入股合作社。生活服务与牧业生产因此可以分工衔接。这是报道中的村庄案例，城区标记不代表新村的真实位置。', action: 'settlement', anchor: '色尼区杭嘉新村集中建设住房', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-new-life'] },
          { id: 'nagqu-life-3', text: '同篇报道还介绍另一个地点：聂荣县嘎确牧场自二〇二〇年起收购合作社畜产品，进行加工并向外销售。从草地到产品，再到运输和购买者，中间增加了人的组织与技术。接下来回看节会，理解地方交流怎样积累文化。', action: 'road', anchor: '从草地到产品，再到运输和购买者', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-new-life'] },
        ],
      },
      {
        id: 'history', title: '恰青赛马会怎样成为共同节会', question: '环境之外，哪些制度与参与形成了地方文化？',
        summary: '把历史记述、名录认定和当代传承分开：文化由不同年代人的活动延续，不由草地直接推出。',
        controls: ['依次读历史记述、2021年认定与今天共同参与。', '保留全图，把节会作为区域交流材料，不虚构古代路线或赛场位置。'],
        cues: [
          { id: 'nagqu-history-1', text: '恰青赛马会不能只解释为草原上跑马。国家非遗项目说明，十七至十八世纪那曲有集训活动，后来有阅兵赛马；今天的节会还包括竞技、歌舞和交换。不同年代的组织与用途发生变化，文化的形成需要历史材料来说明。', action: 'heritage', anchor: '国家非遗项目说明', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-race'] },
          { id: 'nagqu-history-2', text: '二〇二一年，恰青赛马会作为第五批扩展项目列入国家级非遗名录。认定记录保护责任，不表示那一年才出现赛马。项目说明把藏北牧民和共同参与的群众列为传承保护者；节会靠人的学习、参与和组织延续。', action: 'heritage', anchor: '二〇二一年', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-race'] },
          { id: 'nagqu-history-3', text: '把视线留在那曲及周围地区。人们在节会相聚，竞技、说唱、购销与交流共同发生，草地背景和社会活动因此相连。图上只展示区域联系，不给每个县编造古道；再看铁路和公路，理解今天交流方式怎样增加。', action: 'heritage', anchor: '竞技、说唱、购销与交流共同发生', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-race'] },
        ],
      },
      {
        id: 'connections', title: '铁路、公路与观察如何衔接', question: '一条通道开通后，怎样真正接到生产和日常生活？',
        summary: '通道、换装加工与地面服务是不同环节；用完成事件连接当代生活，再回到有目的的观察。',
        controls: ['依次启用铁路到达、物流换装和地面接续教学环节。', '观察高程、生产与居住分工、文化活动，各自对应不同证据。'],
        cues: [
          { id: 'nagqu-connections-1', text: '二〇〇六年七月一日，青藏铁路全线通车，线路经过那曲。铁路增加远距离人员和货物联系，但货物不会从车厢自动进入牧业和家庭。保留高地，依次看铁路到达、换装与地方接续，才能理解通道如何产生生活作用。', action: 'rail', anchor: '二〇〇六年七月一日', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-rail'] },
          { id: 'nagqu-connections-2', text: '二〇〇九年八月十七日，那曲物流中心举行竣工典礼，资料列出物流、堆装和产品加工等功能。二〇二一年八月，那曲至拉萨高速全线接通。车站、物流和公路分工接续，不能把开通事件直接画成未经核实的城市扩张。', action: 'road', anchor: '二〇〇九年八月十七日', pointIds: ['nagqu'], sourceIds: ['regional-nagqu-logistics', 'regional-nagqu-expressway'] },
          { id: 'nagqu-connections-3', text: '旅行观察也按这条认识顺序进行：先读高程与当季草地条件，再通过当地公开展示了解牧业组织，最后把节会传承与交通接续对读。村庄、牧场和节会各有访问条件；不把全市当作随意穿行的草地，观察要回到具体资料。', action: 'observe', anchor: '先读高程与当季草地条件', pointIds: ['nagqu', 'nagqu-climate-station'], sourceIds: ['regional-nagqu-landform', 'regional-nagqu-new-life', 'regional-nagqu-race', 'regional-nagqu-rail'] },
        ],
      },
    ],
  },
];
