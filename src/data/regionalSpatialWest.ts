import type { RegionalJourneySource } from './regionalJourneyTypes';

/** Additional dated evidence checked against primary institutional pages on
 * 2026-10-16. Current OSM geometry does not supply a construction year. */
export const westernRegionalSpatialSources: RegionalJourneySource[] = [
  {
    id: 'regional-west-osm-acquisition', title: '日喀则、山南现况街道、铁路、河流与建筑原始要素', publisher: 'OpenStreetMap contributors', date: '2026-10-16',
    url: 'https://www.openstreetmap.org/copyright',
    supports: ['直接归档OSM主API城市窗，保留源节点、way与relation ID、编辑时点、原始XML SHA及ODbL许可。', '源节点相接的道路链只供读图；不补车站和寺院中心到源道路端点的空缺，不声明公交实走线路、历史边界、通行许可或实时服务。'],
  },
  {
    id: 'regional-shigatse-lastmile-2024', title: '切实提升道路运输行业服务质效', publisher: '西藏自治区人民政府／西藏日报', date: '2024-08-07',
    url: 'https://www.xizang.gov.cn/xwzx_406/dsdt/202408/t20240807_428969.html',
    supports: ['日喀则交通运输局的2024年报道记载，扎寺旅游专线由火车站至扎什伦布寺，途经黑龙江路、上海路。', '这是有日期的接驳组织案例。报道没有逐站坐标或完整线形，不将当前OSM最短道路链冒充该公交线，也不展示当年票价为当前价格。'],
  },
  {
    id: 'regional-shigatse-station-life-2024', title: '最美守护，一切为了旅客 · 拉日铁路通车十年', publisher: '西藏自治区人民政府／西藏日报', date: '2024-08-30',
    url: 'https://www.xizang.gov.cn/xwzx_406/dsdt/202408/t20240830_433578.html',
    supports: ['市民次旺回忆通车前去拉萨探亲依靠大巴或自驾；2021年复兴号为另一层变化。', '首批站内客运职工边巴穷达介绍周边群众在车站就业、开商铺、旅游与物流中的参与；这是采访，不是每户收入统计。', '文章照片明确区分日喀则西货运站与日喀则客站，不能把客站站房当货场。'],
  },
  {
    id: 'regional-tashilhunpo-spatial-history', title: '扎什伦布寺 · 扩建与不同殿堂的使用', publisher: '西藏自治区外事办公室', date: '2024-02-26',
    url: 'https://wsb.xizang.gov.cn/xzjx/lyjd/201107/t20110713_100950.html',
    supports: ['寺院依山坡布局；大经堂前讲经场承载讲经与辩经。', '资料记载四世班禅时期大经堂由一层扩至三层，1914年九世班禅曲吉尼玛主持修建强巴佛殿。', '这些是建筑使用与增建记录，没有可比历史总平面；现况寺院范围不等于任何一个早期年代的范围，不在未定位的具体殿堂上虚造历史边界。'],
  },
  {
    id: 'regional-shannan-station-front-2020', title: '市住建局重点项目进展情况', publisher: '山南市住房和城乡建设局', date: '2020-09-21',
    url: 'https://www.shannan.gov.cn/zjsn/csjs/202009/t20200921_67883.html',
    supports: ['在拉林铁路开通之前，报道记载火车站站前广场4条道路正在进行地下管网、人行地下通道和水稳层施工。', '该报道是建设进展，不能当竣工日期；显示现况站房和道路说明接续需要配套，不把原文中的4条路任意对应到4个OSM要素。'],
  },
  {
    id: 'regional-shannan-bus-adjustment-2026', title: '山南市城市公交线路优化试运行公告', publisher: '山南市人民政府／山南网', date: '2026-09-23',
    url: 'https://www.shannan.gov.cn/xwzx/tggs/202609/t20260923_177122.html',
    supports: ['公告把线路重叠、场站不足与运营效率作为调整背景，记载格桑路线路由12条精简至7条等试运行安排。', '站后接续依赖持续组织，不是铁路一通即自动解决；公告不提供可直接复制的逐站GeoJSON，图上道路不充当当前公交路线。'],
  },
  {
    id: 'regional-shannan-freight-application-2026', title: '对市二届人大九次会议第34号（道类001号）建议的答复', publisher: '山南市发展和改革委员会', date: '2026-05-07',
    url: 'https://fgw.shannan.gov.cn/zwgk/wgkzl/fwgk/202605/t20260507_168644.html',
    supports: ['5月答复记录4月2日申请研究开办山南站货运、4月14日企业回复后继续向国铁集团申请。', '与9月开办报道一起区分申请、开办和2021年客运三个阶段；申请本身不代表当时货运已经运营。'],
  },
];

export type WesternRegionalSpatialCase = {
  id: string; cityId: 'shigatse' | 'shannan'; date: string; title: string;
  change: string; life: string; geometry: string; observation: string;
  featureIds: string[]; routeId?: string; sourceIds: string[];
};

export const westernRegionalSpatialCases: WesternRegionalSpatialCase[] = [
  {
    id: 'shigatse-temple-use', cityId: 'shigatse', date: '1447年创建；后续分期增建', title: '依山寺院不是一次建成的整块城市',
    change: '四世班禅时期大经堂增层，1914年又修建强巴佛殿。不同人物和时期增加殿堂与使用能力。',
    life: '讲经、辩经、学习与礼拜需要不同空间，也让寺院成为持续使用的文化中心。',
    geometry: '只显示取得的现况寺院范围及内部已绘建筑。没有具体古殿定位时，说明全寺事件，不把任意现况建筑点名为某古殿。',
    observation: '观察依山布局与周边街道，再以现场说明核对具体殿堂及年代；现存范围不能倒推1447年的范围。',
    featureIds: ['way/140501939'], sourceIds: ['regional-tashilhunpo-1447', 'regional-tashilhunpo-spatial-history'],
  },
  {
    id: 'shigatse-station-transfer', cityId: 'shigatse', date: '2014年8月16日 → 2024年接续记录', title: '铁路到南侧车站，街道继续完成到城与到寺',
    change: '铁路增加城际方式；到站后还要经过站前、黑龙江路与上海路等城市道路。2024年报道记载专线把火车站接到扎寺。',
    life: '次旺的探亲出行与边巴穷达对车站就业、商铺、旅游和物流的采访，说明时间选择与工作机会需要运输组织才能落到生活。',
    geometry: '现况站房、实际铁路与道路同图。源道路链起端距车站节点75.2米，终端距OSM门参照53.8米，寺院范围内道路不纳入演示，这些空缺不连补线；门要素不保证开放，也不是旅游专线逐站轨迹。',
    observation: '先区分铁路到达和站后接续，再看历史中心的街道联系；具体公交与访问按出行日期核实。',
    featureIds: ['node/7279526246', 'way/361440116', 'way/254694646', 'way/254694770', 'way/140501939'], routeId: 'shigatse-station-heritage',
    sourceIds: ['regional-lari-first-passenger', 'regional-shigatse-lastmile-2024', 'regional-shigatse-station-life-2024', 'regional-west-osm-acquisition'],
  },
  {
    id: 'shannan-front-and-city', cityId: 'shannan', date: '2020年配套施工 → 2021年6月25日铁路开通', title: '从站房、站前路到泽当街道才构成接续',
    change: '2020年进展报道记录站前道路、地下管网和人行地下通道施工；2021年客运开通增加城际到达。道路配套与铁路是分工关系。',
    life: '开通采访中卓玛因工作每周往返山南与拉萨，出站仍需地面接续。这个具名案例说明一种变化，不代表全体居民通勤。',
    geometry: '现况山南站站房、站外道路至格桑路和英雄路的实际节点链约1.947千米；图中两个端点与参考中心仍有169.8米、89.4米空缺，不画成已经核实的出口通道。',
    observation: '在整体谷地中辨认车站、城区街道与雅鲁藏布江；不要因寺院与城区同在山南就误以为步行即可接续。',
    featureIds: ['node/9087403304', 'way/957821150'], routeId: 'shannan-station-city',
    sourceIds: ['regional-shannan-station-front-2020', 'regional-shannan-passenger', 'regional-lalin-open', 'regional-west-osm-acquisition'],
  },
  {
    id: 'shannan-culture-and-crossing', cityId: 'shannan', date: '779年建寺；现况道路只供今天读图', title: '泽当与桑耶相隔河谷，道路和桥梁决定如何接近',
    change: '桑耶寺位于江北，泽当城区与山南站在另一组空间中；现况道路经过跨江设施与沿谷道路，不能用两点直线替代。',
    life: '文化讲经、社区传承与现代来访并非同一时期的活动。交通提供接近条件，不能由道路的存在推断古代路线或文化起源。',
    geometry: '实际OSM节点链从城区道路经过雅江特大桥所在way/582948902及G4219、S5道路到桑耶外围，约35.561千米。链与寺院参考中心173.8米留空；不是8世纪路线或当日导航。',
    observation: '沿同一张地图区分城区、河流、桥梁与江北寺院，再核对现代接续；现场识读历史材料时分别注明事件年代。',
    featureIds: ['way/131280233', 'way/582948902'], routeId: 'shannan-city-heritage',
    sourceIds: ['regional-samye-history', 'regional-west-osm-acquisition'],
  },
  {
    id: 'shannan-separate-freight', cityId: 'shannan', date: '2026年4月申请 → 9月开办报道', title: '客运开通与货运开办是两次能力变化',
    change: '5月答复仍处申请阶段，9月报道记载近日开办货运业务；不能把2021年铁路客运当作全部运输功能同时具备。',
    life: '普通生活物资、建材等货物的装卸与分拨涉及货场和道路，作用不同于旅客出站。',
    geometry: '现况铁路与站房可定位，但没有核实货运装卸边界，不能把客站建筑当作货场。',
    observation: '区分客运到达、城市接续与货运装卸，分别查证设施、开办日期和当日服务。',
    featureIds: ['node/9087403304'], sourceIds: ['regional-shannan-freight-application-2026', 'regional-shannan-freight-2026'],
  },
];
