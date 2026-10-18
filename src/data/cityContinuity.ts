import type { CityComparisonStage } from './cityComparison';
import { cityLifeSources, type CityLifeCityId } from './cityLifeJourney';
import { verifiedPlaceReferences } from './placeProvenance';
import {cityAccessChanges,cityAccessSources} from './cityAccessChange';
import {cityAccessPhases} from '../lib/cityAccessState';
import {cityContinuityLessons,cityContinuityLessonSources} from './cityContinuityLessons';
import {cityAccessCities} from '../lib/cityAccessState';
import {isCityContinuityLessonStage} from '../lib/cityContinuityState';

/** Cultural and modern events are dated evidence, not generated city geometry.
 * References below come only from the archived gazetteers used by the atlas.
 * Reviewed 2026-10-15. Historical opening dates never imply a current service. */
export type CityContinuityStageId = 'history' | 'development' | 'connections' | 'travel';

function stage(value: Omit<CityComparisonStage, 'narration'>): CityComparisonStage {
  const lesson=isCityContinuityLessonStage(value.id)?cityContinuityLessons[value.id]:undefined;
  const beats:CityComparisonStage['beats']=lesson?value.beats.map((beat,index)=>({...beat,narration:lesson[cityAccessCities[index]].map(part=>part.narration).join('')})) as CityComparisonStage['beats']:value.beats;
  const sourceIds=[...new Set([...value.sourceIds,...(lesson?Object.values(lesson).flatMap(parts=>parts.flatMap(part=>part.sourceIds)):[])])];
  return { ...value,beats,sourceIds,narration:beats.map(beat=>beat.narration).join('') };
}

const locationSourceIds = ['natural-earth-populated-places', 'geonames-cn'];

export const cityContinuityStages: CityComparisonStage[] = [
  stage({
    id: 'history', title: '同一片地形，怎样累积不同的文化与历史',
    question: '环境留下条件，哪些具体的人与事件改变了地方的使用？',
    beats: [
      { at: 0, title: '林芝：公共文化课堂与鲁朗服务空间',
        text: '2006年工布新年进入自治区级非遗名录；2026年6月，林芝市图书馆与藏东南文化遗产博物馆组织工布服饰讲解及亲子实践。保护节点不是节日起源年代。再换到2016年试营业的鲁朗，区分文化实践与住宿、商业等现代服务空间。',
        narration: '林芝的山谷没有自动生成工布文化。二〇〇六年，工布新年进入保护名录；二〇二六年，图书馆与博物馆把服饰讲解带进家庭实践。文化通过人的组织与学习延续。' },
      { at: .34, title: '拉萨：7世纪与17世纪的不同建设',
        text: '大昭寺创建于7世纪。建筑史研究将白宫建设置于1645—1648年，联系五世达赖喇嘛；红宫于1690—1694年在桑结嘉措主持下建设。用途、组织和工匠参与塑造城市，今天的建筑并非同一时期一次完成。',
        narration: '拉萨先看七世纪创建的大昭寺。再看五世达赖喇嘛时期的白宫，建于一六四五至一六四八年；桑结嘉措主持的红宫在一六九四年完成。不同用途与历次建设，共同改变城市空间。' },
      { at: .68, title: '阿里：托林交流与狮泉河公共生活',
        text: '大都会艺术博物馆的策展研究记述阿底峡1042年入藏并到托林；11—12世纪的学习与翻译参与文化传播。托林在札达，与狮泉河是不同地点；狮泉河2017年“一河两岸”竣工则涉及绿化与文化休闲用途，分别理解不同时期的地方空间。',
        narration: '阿里的历史先从狮泉河转向札达的托林。博物馆研究记述阿底峡一〇四二年入藏并到托林。十一至十二世纪，教师、翻译与艺术交流参与塑造文化；年代材料不能变成一条凭空绘出的古道。' },
    ],
    cityNotes: {
      nyingchi: '2006年保护、2026年课堂与2016年鲁朗服务是不同事件；传习与现代接待分别解释空间用途。',
      lhasa: '7世纪、1645—1648年、1690—1694年分开阅读；人物、用途与施工共同形成历史空间。',
      ngari: '1042年及11—12世纪材料指向托林交流；2017年河岸建设在另一处狮泉河，不能合成同城历史。',
    },
    sourceIds: ['city-life-gongbo-protection-2021', 'city-life-gongbo-learning-2026', 'city-life-lhasa-heritage', 'city-life-potala-research', 'city-life-tibet-india', ...locationSourceIds],
    bridge: '地方生活仍在变化。保留三个地区，对照拉萨2006年、林芝2021年的铁路与阿里2010年的航空入口：新增通道以后，怎样接到城市和人的日常使用？',
    scope: '真实高程保留地理背景；地面功能层按资料解释学习、礼仪、接待与河岸休闲，局部放大且无建筑比例，不是实测城界、场地平面、工程边界或历史建筑复原。聚居地参照不定位寺宫、场馆或服务设施；不由气候推导宗教文化。',
  }),
  stage({
    id: 'development', title: '开通前后：从原有交通，到新增方式与地方生活',
    question: '铁路或航空抵达之后，为什么还要经过接续，才能改变具体使用？',
    beats: [
      {at:0,title:'林芝：原有公路航空，加入2021年铁路',text:cityAccessChanges.nyingchi.caseText,narration:cityAccessPhases.map(phase=>cityAccessChanges.nyingchi[phase.id].narration).join('')},
      {at:.34,title:'拉萨：铁路到站、跨河接续与物资使用',text:cityAccessChanges.lhasa.caseText,narration:cityAccessPhases.map(phase=>cityAccessChanges.lhasa[phase.id].narration).join('')},
      {at:.68,title:'阿里：公路、航空接续到狮泉河公共生活',text:cityAccessChanges.ngari.caseText,narration:cityAccessPhases.map(phase=>cityAccessChanges.ngari[phase.id].narration).join('')},
    ],
    cityNotes: {
      nyingchi: '保留原有公路与航空；新增铁路还要经过地方接续，才进入普巴与扎西谈到的具体用途。',
      lhasa: '2006年接入铁路，2007年柳梧桥接站区与市区；货场装卸与地方配送继续进入日常物资使用。',
      ngari: '2004年公路、2010年航空与2017年河岸建设分别参与抵达和使用；札达另作独立地方阅读。',
    },
    sourceIds: [...cityAccessSources.map(source=>source.id),...locationSourceIds],
    bridge: '有通道还不等于任何地方都能直达；下一段把区域连接、地面接续与地方访问放在同一张地图上检查。',
    scope: '事件日期来自官方记录；动画中的桥隧、飞行和服务接续为原理示意，不复原铁路、航线、机场或村庄。未导入前后城市扩张、家庭收入或因果评估数据，不从事件自动推出生活改善幅度。',
  }),
  stage({
    id: 'connections', title: '从相连到能使用，周边联系还需要哪些环节',
    question: '地图上有联系，为什么实际抵达与地方使用还要继续追问？',
    beats: [
      { at: 0, title: '林芝：区域铁路与越岭公路是不同的联系',
        text: '2021年拉林铁路报道支持拉萨—山南—林芝的地区顺序；林芝至鲁朗的2022年资料则涉及G318色季拉越岭。保留两种方向，再区分主通道和到地方的接续，不能把泽当聚居地点当作实际轨道必经点。',
        narration: '林芝向西，通过二〇二一年开通的铁路联系山南与拉萨；去鲁朗则涉及色季拉越岭。把两种方向同时放回地形。主通道、地方接续与服务时间一起可用，联系才能进入具体生活。' },
      { at: .34, title: '拉萨：外部抵达以后，还要接上城市使用',
        text: '青藏铁路把拉萨接入更大网络，拉林铁路延伸区域联系。到达城市只是开始，住宿、学习、遗产访问和朝圣活动需要不同服务。2025年世界遗产决定所谈访问管理，不能被一条“通达”线替代。',
        narration: '拉萨联系更大的铁路网络，也联系山南与林芝。进入城市以后，学习、住宿、遗产参访和朝圣有不同需求。地图上的抵达标记还要经过地方服务这一环，不能越过保护和使用条件直接到终点。' },
      { at: .68, title: '阿里：从昆莎地面接续，到狮泉河河岸使用',
        text: '先分清昆莎机场与狮泉河城区，2004公路与2010航空说明不同抵达环节，再把2017河岸公共空间带回同一地方。实际道路位置、事件年份和用途证据分别说明，札达历史另选入口阅读。',
        narration: '阿里从昆莎到狮泉河继续沿地面接续，再回到同一处河岸公共生活。公路、航空与公共空间建设各有年份和参与者。' },
    ],
    cityNotes: {
      nyingchi: '拉萨—山南—林芝是地区联系顺序；林芝—鲁朗越岭属于另一组具体交通材料。',
      lhasa: '网络抵达与城市内服务分别展开；关掉服务示意后，自然地形和历史事件仍然存在。',
      ngari: '昆莎落地仍需公路进狮泉河；河岸公共空间与管护解释抵达之后的具体生活。托林另在札达。',
    },
    sourceIds: ['continuity-lalin-opening-2021', 'city-life-sejila-route-2022', 'continuity-qinghai-tibet-2006', 'continuity-unesco-decision-2025', 'continuity-ngari-airport-2010', 'city-life-tibet-india', ...locationSourceIds],
    bridge: '把真实联系变成自己的观察问题；最后选择一组候选地点，保留目的、日期与待核验条件，再进入可编辑的计划。',
    scope: '方向与聚居地连线表达区域联系，不是可导航道路、实测铁轨、现行航线或阿底峡古道。山南的泽当参照只标识地区，不表示列车通过该坐标；未核验当前班次、票价、道路通行或跨境条件。',
  }),
  stage({
    id: 'travel', title: '带着同一个问题，把认识保存成可以继续的路线',
    question: '怎样让每一站延续前面的认识，并保留实际安排中的未知？',
    beats: [
      { at: 0, title: '林芝候选：山谷、色季拉越岭与鲁朗',
        text: '可先保留林芝山谷问题，再把鲁朗列为候选：沿途高差怎样影响通行，2016年的服务场所怎样利用地方环境，工布文化又怎样被介绍？这是学习顺序；实际观察点、越岭路况、交通和访问条件按日期另核实。',
        narration: '林芝的候选路线，从山谷问题接到鲁朗。带着色季拉越岭与二〇一六年小镇服务的材料，观察环境怎样进入通行和地方使用。把观察目的保存下来，实际路况、接驳和访问日期留待核实。' },
      { at: .34, title: '拉萨候选：河谷城市与不同年代的遗产',
        text: '可把拉萨河谷与历史建筑组成一组候选：先理解城市所在的地面与取水问题，再对照大昭寺和布达拉宫的不同年代。具体遗产应分别选择并核验入口、开放及预约，不把多个对象压成已验证的单日安排。',
        narration: '拉萨先从河谷与取水问题进入城市，再对照历史建筑的年代和用途。大昭寺与布达拉宫分别核验访问安排。候选顺序可以修改，每一站保存为什么去、看什么，以及还不知道的条件。' },
      { at: .68, title: '阿里候选：先完成狮泉河，再另选跨县历史观察',
        text: '先围绕狮泉河的道路接续、河岸公共空间与用水管护形成同一地方的问题。需要继续了解托林交流与札布让经营时，另选跨县一站，分别保留材料年代、观察目的和待核实条件。',
        narration: '阿里的观察先留在狮泉河，把道路、河岸与日常使用接在一起；托林和札布让另选跨县一站，继续历史认识。' },
    ],
    cityNotes: {
      nyingchi: '林芝山谷→鲁朗：观察高差、地方服务与文化介绍；路线需核验色季拉越岭与访问条件。',
      lhasa: '拉萨河谷→所选历史建筑：从自然与生活进入年代和用途；每个访问对象分别核验。',
      ngari: '狮泉河先观察道路、桥位与河岸生活；札达托林作为可选跨县历史站，分别安排。',
    },
    sourceIds: ['city-life-sejila-route-2022', 'city-life-lulang-2016', 'city-life-gongbo-learning-2026', 'city-life-lhasa-valley', 'city-life-lhasa-water-2022', 'city-life-lhasa-heritage', 'city-life-potala-research', 'city-life-ngari-geography', 'city-life-ngari-water-2023', 'city-life-tibet-india', 'city-life-zanda-life-2020', ...locationSourceIds],
    bridge: '保存的是你实际选择的候选与问题；进入计划后可以删改、排序和补充，回来继续对照原地图与资料。',
    scope: '候选学习路线由本产品按问题组织，不是来源发布的官方游程。无默认天数、当前服务保证或已完成旅行记录；历史开通、地点参照与知识顺序均不能代替出行日的核验。',
  }),
];

const usedSourceIds = new Set(cityContinuityStages.flatMap(value => value.sourceIds));
const continuitySourceRecords: { id: string; title: string; url: string; note: string }[] = [
  ...cityContinuityLessonSources,
  ...cityAccessSources,
  ...cityLifeSources.filter(source => usedSourceIds.has(source.id)),
  { id: 'continuity-lalin-opening-2021', title: '波密县政府 · 拉林铁路开通事件（2021）', url: 'https://www.bomi.gov.cn/bmx/xwzx/202106/a320365e780047a6a07eba587fb4215a.shtml', note: '2021-06-29报道记述6月25日开通，明确拉萨经山南到林芝。只采用历史事件和地区顺序，不采用开通初期车次、票务或旅行时间作为当前服务。' },
  { id: 'continuity-caimen-interviews-2021', title: '米林政府 · 彩门村普巴、扎西访谈（2021）', url: 'https://www.milin.gov.cn/mlx/xwzx/202108/c430e14e3d454de9a3b75c73a48df2a6.shtml', note: '2021-08-12地方发展报道，含普巴和民宿经营者扎西的具名表述，涉及接待、学生出行和产品外销的用途与期待；不是家庭全样本、当前经营状态或铁路单独影响的因果评估。林芝城区点不冒充米林彩门村。' },
  { id: 'continuity-qinghai-tibet-2006', title: '西藏交通厅 · 青藏铁路全线通车（2006年事件）', url: 'https://jtt.xizang.gov.cn/xxgk/fdzdgknr/jggk/jtgk/201611/t20161130_233601.html', note: '2016年发布的历史介绍记载2006-07-01全线通车。网页直读本轮回落到站点模板，官方域名索引正文可核对事件；未把旧首发城市或时刻当作现行服务。' },
  { id: 'continuity-unesco-decision-2025', title: 'UNESCO · 拉萨历史建筑群决定47 COM 7B.66（2025）', url: 'https://whc.unesco.org/en/decisions/8790', note: '世界遗产委员会正式决定，区分已报告进展与仍待审查的保护工作；第7段谈访问管理、监测及尊重朝圣活动。决定不是今天开放预约规则，也不代表全部保护要求已经完成。' },
  { id: 'continuity-ngari-airport-2010', title: '民航局 · 阿里昆莎机场通航（2010）', url: 'https://www.caac.gov.cn/XWZX/MHYW/201007/t20100702_12709.html', note: '2010-07-02原始通航报道记载7月1日正式通航及当时经拉萨的航空联系。只取事件、方式与地点关系，不把旧航班、空中时间、距离或收益预期当作当前条件；不定位机场几何或将机场独立归因为札布让经营变化。' },
  { id: 'natural-earth-populated-places', title: 'Natural Earth · 已归档聚居地参考', url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/', note: '沿用atlas-place-references.json已归档原始geometry坐标与版本。林芝、拉萨仅为聚居地参考，非文物、车站、机场、行政范围或访问入口；不从图示反推新坐标。' },
  { id: 'geonames-cn', title: 'GeoNames · 已归档中国聚居地参考', url: 'https://download.geonames.org/export/dump/readme.txt', note: '沿用已归档鲁朗、泽当、狮泉河、托林WGS84聚居地点；不是国家测绘、真实道路或寺院遗址范围。GeoNames，CC BY 4.0；具体原始记录与坐标见atlas-place-references.json。' },
];

// Shared geographic evidence can be required by both access and continuity
// parts. Register one record per stable source identity in the combined list.
export const cityContinuitySources=[...new Map(continuitySourceRecords.filter(source=>usedSourceIds.has(source.id)).map(source=>[source.id,source])).values()];

export const cityContinuityReferences: Record<string, { id: string; name: string; lat: number; lon: number; scope: string; sourceIds: string[] }> = Object.fromEntries(
  ['nyingchi', 'lulang', 'lhasa', 'shannan', 'ngari', 'tholing'].map(id => {
    const value = verifiedPlaceReferences[id];
    return [id, { id, name: value.name, lat: value.latitude, lon: value.longitude, scope: value.scope, sourceIds: [value.sourceId] }];
  }),
);

export interface CityContinuitySceneCue { at: number; label: string; referenceId: string; year: string }
const cues = (first: Omit<CityContinuitySceneCue, 'at'>, second: Omit<CityContinuitySceneCue, 'at'>, third: Omit<CityContinuitySceneCue, 'at'>): [CityContinuitySceneCue, CityContinuitySceneCue, CityContinuitySceneCue] => [{ at: 0, ...first }, { at: .34, ...second }, { at: .68, ...third }];

/** Local times within each city's actual spoken clip; labels do not add geometry. */
export const cityContinuitySceneCues: Record<CityContinuityStageId, Record<CityLifeCityId, [CityContinuitySceneCue, CityContinuitySceneCue, CityContinuitySceneCue]>> = {
  history: {
    nyingchi: cues({ label: '工布新年保护节点', referenceId: 'nyingchi', year: '2006' }, { label: '图书馆与博物馆课堂', referenceId: 'nyingchi', year: '2026' }, { label: '鲁朗增加地方服务空间', referenceId: 'lulang', year: '2016' }),
    lhasa: cues({ label: '大昭寺创建', referenceId: 'lhasa', year: '7世纪' }, { label: '五世达赖喇嘛与白宫', referenceId: 'lhasa', year: '1645—1648' }, { label: '桑结嘉措与红宫', referenceId: 'lhasa', year: '1690—1694' }),
    ngari: cues({ label: '阿底峡与托林', referenceId: 'tholing', year: '1042' }, { label: '教师、翻译与艺术交流', referenceId: 'tholing', year: '11—12世纪' }, { label: '狮泉河河岸公共生活', referenceId: 'ngari', year: '2017' }),
  },
  development: {
    nyingchi: cues({ label: '鲁朗增加服务场所', referenceId: 'lulang', year: '2016' }, { label: '拉林铁路开通', referenceId: 'nyingchi', year: '2021' }, { label: '彩门村用途与期待·地区入口', referenceId: 'nyingchi', year: '2021' }),
    lhasa: cues({ label: '青藏铁路全线通车', referenceId: 'lhasa', year: '2006' }, { label: '经山南联系林芝', referenceId: 'lhasa', year: '2021' }, { label: '遗产保护与访问管理', referenceId: 'lhasa', year: '2025' }),
    ngari: cues({ label: '昆莎通航·地区入口', referenceId: 'ngari', year: '2010' }, { label: '既有公路接续狮泉河', referenceId: 'ngari', year: '2004／2010' }, { label: '狮泉河公共生活', referenceId: 'ngari', year: '2017' }),
  },
  connections: {
    nyingchi: cues({ label: '林芝—山南—拉萨区域联系', referenceId: 'shannan', year: '2021' }, { label: '去鲁朗涉及色季拉越岭', referenceId: 'lulang', year: '2022资料' }, { label: '主通道还需地方服务', referenceId: 'nyingchi', year: '原理对照' }),
    lhasa: cues({ label: '接入更大铁路网络', referenceId: 'lhasa', year: '2006／2021' }, { label: '地方使用需求不同', referenceId: 'lhasa', year: '原理对照' }, { label: '访问管理仍需衔接', referenceId: 'lhasa', year: '2025资料' }),
    ngari: cues({ label: '昆莎航空入口', referenceId: 'ngari', year: '2010' }, { label: '既有公路接续狮泉河', referenceId: 'ngari', year: '2004／2010' }, { label: '河岸公共生活', referenceId: 'ngari', year: '2017' }),
  },
  travel: {
    nyingchi: cues({ label: '林芝山谷问题', referenceId: 'nyingchi', year: '候选观察' }, { label: '鲁朗通行与地方服务', referenceId: 'lulang', year: '2016资料' }, { label: '保留问题·核验接驳', referenceId: 'lulang', year: '日期待填' }),
    lhasa: cues({ label: '拉萨河谷与取水', referenceId: 'lhasa', year: '候选观察' }, { label: '建筑年代与用途', referenceId: 'lhasa', year: '历史材料' }, { label: '逐处核验访问安排', referenceId: 'lhasa', year: '日期待填' }),
    ngari: cues({ label: '狮泉河用水与管护', referenceId: 'ngari', year: '2023资料' }, { label: '同一处河岸公共生活', referenceId: 'ngari', year: '2017资料' }, { label: '保存本地问题·另选跨县站', referenceId: 'ngari', year: '日期待填' }),
  },
};

export interface CityContinuityTravelStop {
  id: string; name: string; region: string; theme: string; question: string; description: string;
  lessonId: string; observationNote: string; cityId: CityLifeCityId; sourceIds: string[];
}

/** Additional stops only: the existing valley, Lhasa heritage and Tholing stops remain. */
export const cityContinuityTravelStops: CityContinuityTravelStop[] = [
  { id: 'nyingchi-lulang', name: '鲁朗越岭与地方服务', region: 'nyingchi', theme: '综合', cityId: 'nyingchi', lessonId: 'E3',
    question: '色季拉越岭与2016年服务场所怎样接到地方生活？',
    description: '把鲁朗与林芝城区分开，结合2016年小镇试运营和2022年经色季拉山的资料观察通行、服务与地方文化介绍。候选知识顺序不是已核验道路；按日期另查越岭路况、接驳、具体观察点与访问条件。',
    observationNote: '记录沿途地形怎样改变通行，再区分地方文化实践与小镇风格再现；待核实出行日期、路况、接驳和开放。',
    sourceIds: ['city-life-lulang-2016', 'city-life-sejila-route-2022'] },
  { id: 'lhasa-river', name: '拉萨河谷与城市用水', region: 'lhasa', theme: '自然', cityId: 'lhasa', lessonId: 'G4',
    question: '河谷的平缓地面与居民实际用水之间，还需要哪些设施和工作？',
    description: '用公开高程与NASA2005年历史影像认识河谷和周围山地，再对照2022年拉萨水安全规划中的地下水和供水保障。仅选可达且允许停留的实际观察点，不定位水井或供水设施，也不把旧影像当作当前城界。',
    observationNote: '分别记录地形、水源和取用服务；接到历史建筑时再问用途与年代，现场观察与历史资料分开。',
    sourceIds: ['city-life-lhasa-valley', 'city-life-lhasa-water-2022'] },
  { id: 'shiquanhe-life', name: '狮泉河的道路、河岸与公共生活', region: 'ngari', theme: '综合', cityId: 'ngari', lessonId: 'E3',
    question: '公路、航空与河岸建设分别怎样参与通行、停留和公共生活？',
    description: '先对读2004公路、2010通航与2017河岸建设，沿当前桥位、河流和公共空间提出观察，再将2023冬灌管护作为不同用途阅读。今天的地物不等于工程边界；接驳和公共可达位置按日期核实。托林和札布让另作跨县一站。',
    observationNote: '分别记录地面接续、河岸停留与公共活动；对照各自事件年代，用水管护另问，不把全部变化归于机场。',
    sourceIds: ['city-local-osm-2026','event-gunsa-g219-2004-2025','access-ngari-airport-2010','city-spatial-shiquanhe-banks-2017','city-life-ngari-water-2023','city-life-ngari-geography'] },
];
