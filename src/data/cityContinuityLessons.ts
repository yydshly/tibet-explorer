import type {CityLifeCityId} from './cityLifeJourney';
import {cityLocalOsmSource} from './cityLocalSources';
import {cityPlaceEvidenceSources} from './cityPlaceEvidence';

export type CityContinuityLessonStage = 'history' | 'connections' | 'travel';
export interface CityContinuityLessonPart {
  id: string;
  title: string;
  text: string;
  narration: string;
  sourceIds: string[];
  referenceId: string;
  year?: string;
}

/** Each part owns an actual recorded clip and a distinct visible operation.
 * Town references locate the reading region only. No pictured text, clothing,
 * building or service is an excavated object or surveyed local reconstruction.
 * Sources rechecked 2026-10-15; dates describe the cited period, not current access. */
export const cityContinuityLessons: Record<CityContinuityLessonStage, Record<CityLifeCityId, readonly [CityContinuityLessonPart, CityContinuityLessonPart, CityContinuityLessonPart]>> = {
  history: {
    nyingchi: [
      {
        id: 'CONT-history-nyingchi-1', title: '2006年：保护已有的工布新年', referenceId: 'nyingchi', year: '2006',
        text: '2021年林芝政府答复记载，工布新年在2006年列入首批自治区级非遗名录。工布涉及巴宜、米林、工布江达一带，地方文化不能缩成一个城区点；名录记录保护行动，不确定节日起源。',
        narration: '先在林芝看文化怎样被保护。二〇〇六年，工布新年进入自治区级非遗名录。工布涉及巴宜、米林和工布江达一带，这个年份记录保护行动，不是节日从此诞生。',
        sourceIds: ['city-life-gongbo-protection-2021'],
      },
      {
        id: 'CONT-history-nyingchi-2', title: '2026年：讲服饰，也让家庭参与', referenceId: 'nyingchi', year: '2026',
        text: '2026年6月13日，市图书馆与藏东南文化遗产博物馆联合组织工布文化活动：工作人员讲服饰历史和形制，家庭参与剪纸等实践。知识经由讲解、制作和共同参与进入家庭生活。',
        narration: '再看二〇二六年六月，林芝图书馆和博物馆联合举办工布文化活动。工作人员讲服饰历史与形制，亲子家庭参与剪纸和制作。把讲解接到参与，才能看见传习的过程。',
        sourceIds: ['city-life-gongbo-learning-2026'],
      },
      {
        id: 'CONT-history-nyingchi-3', title: '2016年鲁朗：增加住宿与商业服务空间', referenceId: 'lulang', year: '2016',
        text: '鲁朗小镇于2016年10月1日试营业。现状河流、G318与服务用地帮助辨认空间关系，2015设计记录说明酒店、商业街、民居及文教等不同功能。2017年度工作记录还列出商户进驻、家庭旅馆培训与图书分馆：经过需要道路，停留还需住宿、接待和经营管护。今天的轮廓不等于2016建成测绘，现代旅游建设与持续的工布文化实践分别理解。',
        narration: '鲁朗先辨认河流、三一八国道和服务用地。二〇一六年小镇试运营，二〇一七年又有商户进驻和家庭旅馆培训的记录。道路让人经过，住宿与接待把经过接成停留。图上是现状位置，不是当年逐栋建成的复原。',
        sourceIds: ['city-local-osm-2026', 'city-life-lulang-2016', 'city-spatial-lulang-design-2015', 'city-spatial-lulang-opening-2017', 'event-lulang-services-2017', 'city-life-gongbo-protection-2021'],
      },
    ],
    lhasa: [
      {
        id: 'CONT-history-lhasa-1', title: '7世纪：大昭寺与老城的宗教用途', referenceId: 'lhasa', year: '7世纪',
        text: 'UNESCO将大昭寺创建置于7世纪，说明它位于拉萨老城并承担佛教宗教用途。先保留河谷城市，再加入这个有年代和用途的历史对象；始建年代不等于全部现存构件都属于同一时期。',
        narration: '先在拉萨现状地图中辨认河流、道路和老城，再定位大昭寺。大昭寺创建于七世纪，承担宗教用途。图上的轮廓帮助理解位置，不能把今天的建筑全部放回七世纪。',
        sourceIds: ['city-local-osm-2026', 'city-life-lhasa-heritage'],
      },
      {
        id: 'CONT-history-lhasa-2', title: '1645—1648年：白宫的礼仪与居住', referenceId: 'lhasa', year: '1645—1648',
        text: '建筑史研究将五世达赖喇嘛主持的白宫建设置于1645—1648年；UNESCO说明其中的礼仪大厅、接见与居住用途。建设时期和活动需要一起解释空间，不把山地条件直接当作建筑历史。',
        narration: '再到一六四五至一六四八年，五世达赖喇嘛主持白宫建设。礼仪、接见与居住有不同需要，也就需要相应空间。把用途加到年代上，才能继续理解拉萨的历史城市。',
        sourceIds: ['city-local-osm-2026', 'city-life-potala-research', 'city-life-lhasa-heritage'],
      },
      {
        id: 'CONT-history-lhasa-3', title: '1690—1694年：红宫的纪念与宗教用途', referenceId: 'lhasa', year: '1690—1694',
        text: '研究记述桑结嘉措主持1690—1694年红宫建设，红宫包含宗教活动空间和灵塔。白宫、红宫的用途与建设时期有区别；交通增加抵达方式以后，参访仍需理解这些用途以及今天的保护管理。',
        narration: '拉萨的红宫由桑结嘉措主持，在一六九〇至一六九四年建设，包含灵塔和宗教活动空间。它与白宫用途不同。今天抵达以后，参访仍要理解不同对象的历史与使用。',
        sourceIds: ['city-local-osm-2026', 'city-life-potala-research', 'city-life-lhasa-heritage', 'continuity-unesco-decision-2025'],
      },
    ],
    ngari: [
      {
        id: 'CONT-history-ngari-1', title: '1042年：先从狮泉河换到托林', referenceId: 'tholing', year: '1042',
        text: '先把阿里的生活入口狮泉河与札达托林分开。大都会艺术博物馆图注记载，阿底峡1042年入藏，先停留加德满都，再赴西部托林。材料支持人物与地点联系，没有提供逐段古道。',
        narration: '阿里先换到札达的托林。博物馆材料记载，阿底峡一〇四二年入藏，先停留加德满都，再到托林。具体教师把交流带入地方，狮泉河的生活案例仍是另一处地点。',
        sourceIds: ['city-life-tibet-india'],
      },
      {
        id: 'CONT-history-ngari-2', title: '11—12世纪：文本经过学习与翻译', referenceId: 'tholing', year: '11—12世纪',
        text: 'Met专题说明11—12世纪的教师往来、求学与翻译活动。北印度贝叶写本经学者翻译，参与知识传播；不声称它是托林出土或现藏文物。保留托林真实聚居地定位与来源材料；本轮没有托林地物几何，不拿狮泉河街区、假写本或示意空间冒充事件现场。',
        narration: '阿里的历史还要放回十一至十二世纪的交流。北印度贝叶写本经学者翻译，把知识带入新的语言环境。这里保留托林的真实地点定位和材料，不能拿狮泉河街区代作托林现场。',
        sourceIds: ['city-life-tibet-india'],
      },
      {
        id: 'CONT-history-ngari-3', title: '2017年狮泉河：河岸怎样进入公共生活', referenceId: 'ngari', year: '2017',
        text: '从札达托林回到狮泉河。西藏文旅厅2021年具名采访记述，2017年“一河两岸”工程竣工，城区段景观与河堤两岸绿化结合文化、休闲等用途。步行与停留需要地方空间建设及管护；这些功能记录不提供真实工程边界，也不说明此前河岸不可使用。',
        narration: '再从托林回到狮泉河，先看河流与两岸道路的实际位置。二〇一七年一河两岸工程竣工，绿化、步行与休闲增强了公共生活功能。现状地图不等于工程边界，也不表示此前河岸不能使用。',
        sourceIds: ['city-local-osm-2026', 'city-spatial-shiquanhe-banks-2017', 'city-life-ngari-water-2023'],
      },
    ],
  },
  connections: {
    nyingchi: [
      {
        id: 'CONT-connections-nyingchi-1', title: '区域入口：铁路联系山南与拉萨', referenceId: 'nyingchi', year: '2021',
        text: '2021年6月25日开通的拉林铁路增加拉萨经山南至林芝的联系。先读地区之间的进入方式，再保留林芝原有公路与航空；这个区域入口并不定位车站和轨道。',
        narration: '回到林芝，先看区域入口。二〇二一年开通的拉林铁路联系山南和拉萨，公路与航空也仍然存在。区域之间能够相连，是进入地方生活的第一环。',
        sourceIds: ['continuity-lalin-opening-2021', 'access-nyingchi-airport-2006'],
      },
      {
        id: 'CONT-connections-nyingchi-2', title: '地方接续：米林彩门村的具名材料', referenceId: 'nyingchi', year: '2021材料',
        text: '换到米林彩门村材料。2021年普巴提到附近岗嘎站、机场与公路，扎西谈学生出行和特产寄售。主通道需接上当地接驳、管理与接待，才可能用于具体生活；林芝城区参考不是村址。',
        narration: '在林芝，再换到米林彩门村。普巴谈附近车站、机场和公路，扎西谈学生出行与特产寄售。把主通道交给地方接驳和接待，区域联系才可能进入这些具名用途。',
        sourceIds: ['access-caimen-interviews-2021'],
      },
      {
        id: 'CONT-connections-nyingchi-3', title: '具体目的地：去鲁朗还要理解越岭', referenceId: 'lulang', year: '2016／2022材料',
        text: '航空入口在米林，2020道路发布明确S4连接米林机场与林芝；继续去鲁朗，2022文旅资料说明G318经色季拉越岭。机场、林芝与鲁朗不是同一点。道路解决经过，2016试运营与2017运营记录中的住宿、商业和接待再组织停留；路线地理不代替出行日的接驳与访问核验。',
        narration: '去鲁朗分两段。米林机场先经公路联系林芝，二〇二〇年资料记作省道四号；再沿三一八国道，经色季拉越岭到鲁朗。回到同一片服务用地，住宿、商业与经营者把经过接成停留。机场抵达与小镇接待各有一环。',
        sourceIds: ['city-local-osm-2026', 'event-mainling-s4-2020', 'event-mainling-s4-maintenance-2020', 'city-life-sejila-route-2022', 'city-life-lulang-2016', 'event-lulang-services-2017'],
      },
    ],
    lhasa: [
      {
        id: 'CONT-connections-lhasa-1', title: '区域入口：2006年与2021年的铁路联系', referenceId: 'lhasa', year: '2006／2021',
        text: '2006年青藏铁路全线通车，2021年拉林铁路增加拉萨经山南到林芝的联系。区域网络说明进入城市的方式；货物和乘客抵达站场以后仍有各自的地方安排。',
        narration: '拉萨的区域入口，先读二〇〇六年青藏铁路，再看二〇二一年联系山南和林芝的拉林铁路。列车把人和物带到铁路节点，后面的城市使用仍有各自的安排。',
        sourceIds: ['city-local-osm-2026', 'continuity-qinghai-tibet-2006', 'continuity-lalin-opening-2021'],
      },
      {
        id: 'CONT-connections-lhasa-2', title: '地方接续：跨河与配送是不同环节', referenceId: 'lhasa', year: '2007／2026材料',
        text: '2007年4月柳梧大桥连通客运站区与市区；当前河流与道路地图帮助辨认客站跨河进城的空间关系。拉萨西货场的装卸、集散和配送属于另一处材料，本轮不在客站复原货场作业。',
        narration: '拉萨的地方接续先看跨河。二〇〇七年，柳梧大桥连通火车站与市区。用当前道路和河流辨认客站进城的关系；拉萨西货场的装卸配送是另一处材料，不在客站这里复原。',
        sourceIds: ['city-local-osm-2026', 'access-liuwu-bridge-2019', 'access-lhasa-west-logistics-2026'],
      },
      {
        id: 'CONT-connections-lhasa-3', title: '具体访问：历史用途与今天的管理', referenceId: 'lhasa', year: '2025材料',
        text: '历史建筑保留宗教、礼仪、居住和纪念等不同用途。UNESCO2025年决定第7条讨论访问管理，并鼓励尊重朝圣访问。进入城市以后，应分别理解访问对象、活动和安排，不能只画一条抵达线。',
        narration: '再从拉萨的城市服务接到具体访问。大昭寺、白宫和红宫有不同用途，朝圣与参访也有不同需要。二〇二五年世界遗产决定继续关注访问管理，抵达后还要尊重地方使用。',
        sourceIds: ['city-local-osm-2026', 'city-life-lhasa-heritage', 'city-life-potala-research', 'continuity-unesco-decision-2025'],
      },
    ],
    ngari: [
      {
        id: 'CONT-connections-ngari-1', title: '区域入口：在原有公路上增加航空', referenceId: 'ngari', year: '2010',
        text: '2010年昆莎通航为阿里增加航空入口；民航局回顾明确此前已有公路联系。保留西部高地和原有地面方式，再读航空加入的条件。狮泉河参考只承担地区定位，不冒充机场。',
        narration: '阿里先保留公路，再加入二〇一〇年昆莎通航的航空入口。飞过地形增加一种抵达方式，原来的地面行程仍然存在。地图用狮泉河帮助定位地区。',
        sourceIds: ['access-ngari-airport-2010', 'access-ngari-existing-road-2020'],
      },
      {
        id: 'CONT-connections-ngari-2', title: '地方接续：昆莎机场到狮泉河仍需公路', referenceId: 'ngari', year: '2004／2010',
        text: '吕新民口述材料记载，G219狮泉河至昆莎段在2004年建成柏油路；昆莎机场2010年通航是在已有地面联系上增加航空。现在的道路记录帮助辨认机场到城镇的空间间隔，不能当作2004年竣工线或出行日接驳保证。札达托林属于另外的县域，不并入这段同城接续。',
        narration: '昆莎落地后，继续沿地面联系狮泉河。吕新民口述记载，二〇〇四年这段二一九国道已建成柏油路，早于二〇一〇年通航。飞机增加抵达方式，乘客仍要沿公路进城。现状道路位置不等于当年的竣工图。',
        sourceIds: ['city-local-osm-2026', 'access-ngari-airport-2010', 'event-gunsa-g219-2004-2025'],
      },
      {
        id: 'CONT-connections-ngari-3', title: '具体使用：抵达狮泉河，再看河岸公共生活', referenceId: 'ngari', year: '2017／2021材料',
        text: '回到狮泉河同一片河流、桥位和城区。2021采访回顾2017一河两岸工程增加绿化、文化休闲等功能；机场与公路说明怎样进入地方，河岸建设与持续管护说明怎样组织公共生活。两组事件分别有依据，不能把公共空间变化单独归于机场。现状公园、步道不全部等于2017工程。',
        narration: '抵达狮泉河，回到同一条河、桥位与两岸空间。二〇一七年一河两岸建设增加绿化、步行和休闲用途。交通解决怎样来到这里，公共空间与管护组织停留和使用。不同年份的建设各有作用，不能全部归给机场。',
        sourceIds: ['city-local-osm-2026', 'city-spatial-shiquanhe-banks-2017', 'event-gunsa-g219-2004-2025', 'access-ngari-airport-2010'],
      },
    ],
  },
  travel: {
    nyingchi: [
      {
        id: 'CONT-travel-nyingchi-1', title: '自然问题：鲁朗河谷与G318局部', referenceId: 'lulang', year: '2022材料／候选观察',
        text: '从全域找到鲁朗，再用当前OSM记录的鲁朗河、G318局部与周围真实高程提出通行问题。窗口只含小镇附近，不覆盖完整色季拉越岭；实际要素读点不是已核验停车、步行或访问入口。',
        narration: '林芝的地方观察先从鲁朗这处窗口开始，辨认鲁朗河、三一八国道和周围地形。这里只包含小镇附近的一段，不覆盖完整的色季拉越岭。把路与河谷的问题记下来，再核实完整行程和实际可停留的地点。',
        sourceIds: ['city-local-osm-2026', 'city-life-sejila-route-2022'],
      },
      {
        id: 'CONT-travel-nyingchi-2', title: '有日期的用途：鲁朗服务与工布传习', referenceId: 'lulang', year: '2016／2026材料',
        text: '继续留在鲁朗，把2016试运营与2017商户进驻、家庭旅馆培训等记录放在当前服务用地旁对读。观察经过、停留与经营使用各需哪些空间和工作；林芝2026工布服饰课堂作为另一地点的文化传习材料保留，不把旅游风格再现当作古代原貌。',
        narration: '观察留在鲁朗，对照道路、河谷和同一处服务用地。车辆怎样经过，人在哪里停留，住宿接待需要哪些工作？再读二〇一六年试运营和二〇一七年旅馆培训的记录。林芝的工布课堂在另一地点，不能混作小镇现场。',
        sourceIds: ['city-local-osm-2026', 'city-life-lulang-2016', 'event-lulang-services-2017', 'city-life-gongbo-learning-2026'],
      },
      {
        id: 'CONT-travel-nyingchi-3', title: '保存自己的问题，再核实接驳与访问', referenceId: 'lulang', year: '候选观察',
        text: '从彩门村的交通用途材料继续追问：主通道到地方服务还差哪一段？只把本人选定的候选站和问题存入计划，保留可编辑顺序、备注及地图返回。路况、接驳、天气和具体访问日期另核实。',
        narration: '最后保存自己的观察问题：从主通道到地方服务，还需要什么接续？把选中的林芝或鲁朗候选站加入计划，继续修改顺序和备注；路况、接驳与访问日期留待核实。',
        sourceIds: ['city-local-osm-2026', 'access-caimen-interviews-2021', 'city-life-sejila-route-2022'],
      },
    ],
    lhasa: [
      {
        id: 'CONT-travel-lhasa-1', title: '自然问题：河谷空间与实际用水', referenceId: 'lhasa', year: '2005／2022材料',
        text: '用当前河流、道路和客站附近联系认识河谷空间，再对照2022年规划所记地下水与取供水保障。自然河流、地下水源和居民实际取水分别记录；本图不定位水井，OSM道路节点也不是已核验访问入口。',
        narration: '拉萨先从河流、道路和客站附近的联系读起，再对照二〇二二年的取供水资料。河谷空间、自然水源和居民实际取水是不同问题。本图不定位地下水井，观察地点仍需选择允许到达的位置。',
        sourceIds: ['city-local-osm-2026', 'city-life-lhasa-valley', 'city-life-lhasa-water-2022'],
      },
      {
        id: 'CONT-travel-lhasa-2', title: '历史用途：分别读大昭寺、白宫和红宫', referenceId: 'lhasa', year: '7／17世纪材料',
        text: '把7世纪大昭寺、1645—1648年白宫与1690—1694年红宫分别阅读。对应宗教、礼仪居住和纪念等用途，先提出历史问题，再选择具体访问对象；知识顺序不等于已验证的一日安排。',
        narration: '再把拉萨的历史问题带进候选访问。大昭寺的宗教活动、白宫的礼仪与居住、红宫的纪念用途，需要分别理解。把对象、年代和用途写在一起，不把不同建筑压成同一次建设。',
        sourceIds: ['city-local-osm-2026', 'city-life-lhasa-heritage', 'city-life-potala-research'],
      },
      {
        id: 'CONT-travel-lhasa-3', title: '保存问题：交通接续、预约和地方使用', referenceId: 'lhasa', year: '2025材料／候选观察',
        text: 'UNESCO2025年决定讨论访问管理并尊重朝圣活动。保存本人所选河谷或历史建筑问题，分别核实交通接续、开放与预约；候选可以删改和排序，委员会决定不能代替出行日的规则。',
        narration: '最后把拉萨的观察问题存进计划。铁路抵达以后，还要接上地方交通，分别核实开放与预约。世界遗产材料提醒我们尊重朝圣和地方使用；保存的是观察目的，安排仍可修改。',
        sourceIds: ['city-local-osm-2026', 'continuity-unesco-decision-2025', 'access-liuwu-bridge-2019'],
      },
    ],
    ngari: [
      {
        id: 'CONT-travel-ngari-1', title: '自然问题：狮泉河的用水与管护', referenceId: 'ngari', year: '2023材料',
        text: '先辨认狮泉河城区当前河流和两岸道路，再分别对读2017年公共空间与2023年伦珠冬灌巡护材料。当前水系并未定位冬灌闸口；公共生活、实际取水与管护是不同问题，观察点另核验可达与停留条件。',
        narration: '狮泉河先辨认河流和两岸道路，再把二〇一七年的公共空间材料与二〇二三年的冬灌管护报道分开阅读。河岸活动与实际取水各需要不同条件，现状地图不定位报道中的闸口。分别记录公共生活和用水管护的问题。',
        sourceIds: ['city-local-osm-2026', 'city-life-ngari-geography', 'city-life-ngari-water-2023', 'city-spatial-shiquanhe-banks-2017'],
      },
      {
        id: 'CONT-travel-ngari-2', title: '同一处地方：河岸空间怎样被使用', referenceId: 'ngari', year: '2017／2021材料',
        text: '继续留在狮泉河，把当前桥位、河流和可辨认的公共空间与2017年河岸工程材料对读。记录步行、休闲与日常通行的不同需要；现场所见不能直接确定每条步道的建设年份，也不能据现状公园边界倒画工程范围。托林教师与翻译材料保留在独立的历史入口。',
        narration: '观察先留在狮泉河。沿同一片河岸，辨认桥梁通行、步行停留与公共活动，再回看二〇一七年材料支持哪些用途。今天看见的公园和步道，不能全部标成那一年建成。托林的教师与翻译交流，另选历史入口继续。',
        sourceIds: ['city-local-osm-2026', 'city-spatial-shiquanhe-banks-2017', 'city-life-tibet-india'],
      },
      {
        id: 'CONT-travel-ngari-3', title: '保存狮泉河问题，另行选择跨县历史观察', referenceId: 'ngari', year: '2004／2010／2017材料',
        text: '将2004公路、2010航空与2017河岸公共空间各自支持的变化写入狮泉河观察问题，再按日期核实真实接驳、可达位置与停留条件。托林和札布让另作可选跨县研读：金珠德吉2006年已开旅馆，早于2010通航，不能把地方经营全部归给机场。',
        narration: '保存狮泉河问题时，分开写清公路、航空和河岸建设各改变了什么，再核实日期与接驳。托林和札布让另选跨县一站，那里的教师交流和家庭经营有自己的年代，不能与狮泉河压成同一处地方或一条短线。',
        sourceIds: ['city-local-osm-2026', 'event-gunsa-g219-2004-2025', 'city-spatial-shiquanhe-banks-2017', 'access-zaburang-start-2020', 'access-ngari-airport-2010', 'geonames-cn'],
      },
    ],
  },
};

/** Primary design/construction records explain uses, not surveyed geometry. */
export const cityContinuityLessonSources: {id:string;title:string;url:string;note:string}[] = [
  cityLocalOsmSource,
  ...cityPlaceEvidenceSources,
  { id: 'city-spatial-lulang-design-2015', title: '北京大学深圳研究生院 · 鲁朗规划设计团队施工期记录（2015）', url: 'https://news.pkusz.edu.cn/info/1002/2333.htm', note: '2015-11-09设计团队原发布记录酒店、商业街、民居、政府和文教等功能及施工期状态。用于理解经过、停留、接待与公共用途，不能将设计/建设计划当作全部建成结果；未导入规划图或测绘几何，不据此生成真实街区边界。' },
  { id: 'city-spatial-lulang-opening-2017', title: '西藏自治区文旅厅 · 鲁朗小镇试营业与服务功能（2017）', url: 'https://wlt.xizang.gov.cn/xwzx_69/wlyw/dsdt/201703/t20170321_115958.html', note: '2017-03-21官方报道回顾2016-10-01试营业及住宿、步行商业等服务功能。用于已发生的试营业事件，区别于2015施工期预计日期；不提供今天营业状态、游客收益统计或当地文化起源。' },
];
