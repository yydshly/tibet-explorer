import type { RegionalJourneySource } from './regionalJourneyTypes';

/** Spatial geometry and dated social evidence are separate. These reports do
 * not identify a surveyed construction footprint or establish causal growth. */
export const easternSpatialSources: RegionalJourneySource[] = [
  {
    id: 'regional-chamdo-update2025', title: '昌都：留住“烟火气” 焕发“新活力”',
    url: 'https://swj.changdu.gov.cn/cdsswj/c101255/202504/59f313e34baf4d24b130e26198f2cef1.shtml',
    publisher: '昌都市商务局，来源西藏日报，记者贡秋曲措', date: '2025-04-29',
    supports: ['四川桥片区更新配套项目2024年9月开工；报道当时仍在建设。夏通街居民多加描述窄巷会车困难，幸福横街商户卓玛讲述施工期间临时用水协调。', '文章没有提供项目红线、居民住宅坐标或完工复测；现状四川桥和街区参考点不能冒充更新范围。'],
  },
  {
    id: 'regional-chamdo-road2025', title: 'G214线加卡至邦达机场段新改建工程可研批复',
    url: 'https://lyfz.changdu.gov.cn/cdslyj4/c101255/202506/1542e015a65e4f33b35b0625ab18f5e7.shtml',
    publisher: '昌都市文化和旅游局（市文物局）', date: '2025-06',
    supports: ['2025年6月11日获可行性研究报告批复；缩短里程、用时是项目预期，不能写成已通车效果。', '机场接续采用采集时OSM相连节点道路；没有地图连接的机场入口不补线。'],
  },
  {
    id: 'regional-nagqu-logistics2015', title: '青藏铁路那曲物流中心建设基本情况',
    url: 'https://swt.xizang.gov.cn/xxgk/yqjs/201905/t20190517_73037.html',
    publisher: '西藏自治区商务厅', date: '正文2015-12-28，栏目迁移路径2019-05',
    supports: ['记述2009年建成后当地货运由公路型向铁路型转变；2010—2013年年吞吐量约20—30万吨，2014年51.8万吨。2015年60万吨为当时预测，不采用作实绩。', '文字说明运输组织和设施用途，不能据此定位整个园区、每个仓库、装卸口或认定某一住宅的变化原因。'],
  },
  {
    id: 'regional-nagqu-logistics-location', title: '那曲物流中心将建成南亚陆路通道桥头堡',
    url: 'https://www.xizang.gov.cn/xwzx_406/bmkx/201812/t20181216_13402.html',
    publisher: '西藏自治区人民政府', date: '正文2008-09-09，2018年归档路径',
    supports: ['建设期说明项目位于那曲镇西南、以那曲火车站为中心，分综合物流、散堆装、加工等区。', '这是建设期定位与规划用途；当前OSM铁路用地和侧线是独立现状资料，不是官方物流园区边界。'],
  },
  {
    id: 'regional-nagqu-station-life2025', title: '那曲火车站：海拔4513米的春运温情',
    url: 'https://www.xizang.gov.cn/xwzx_406/dsdt/202501/t20250115_457405.html',
    publisher: '西藏自治区人民政府，来源西藏商报，通讯员金耀勋、记者张琳', date: '2025-01-15',
    supports: ['报道那曲站客流类型包含旅游、学生、务工、公务，候车室提供宣传与志愿服务。', '客流数字是春运预测，不当作实际客流；道路至城区服务点只是已绘节点连接，不是上述旅客的实录轨迹。'],
  },
  {
    id: 'regional-east-current-osm', title: '四地空间接续 · 昌都和那曲现状OSM采集档案',
    url: 'https://www.openstreetmap.org/copyright', publisher: 'OpenStreetMap contributors · ODbL 1.0', date: '2026-10-16采集',
    supports: ['原始OSM节点、道路、河流、桥梁、站房与用地轮廓保留版本、时间与原始ID；采集窗口及SHA见本地east-sources.json。', '道路路径仅取原始共享节点连通的网络；显式保留至地物参照的端点缺距，不补缺路，不保证当日通行。编辑日期不是建成年；缺失建筑高度只能统一示意。'],
  },
];

export const easternSpatialCases = {
  chamdo: {
    currentGeometry: ['way/449021629', 'way/145393632', 'way/1179902329', 'way/101968188', 'way/388083392'],
    routeIds: ['chamdo-cross-river', 'chamdo-maocaoba-heritage', 'chamdo-city-services', 'chamdo-airport-transfer', 'chamdo-airport-arrival'],
    history: { date: '1437—1444年', event: '地方史料记述强巴林寺修建', change: '寺院长期参与两河口城市的宗教与文化生活；现状围墙只定位今天的地物。', sourceIds: ['regional-chamdo-heritage'], limit: '不将现存墙、殿宇或街道都追溯到始建年代。' },
    development: { date: '1995-04-28', event: '邦达机场正式通航，首航成都—昌都', change: '增加长途航空联系，同时仍需机场到城区的地面接续。', sourceIds: ['regional-chamdo-bangda'], limit: '机场独立于城区；地图缺段、机场入口和当天交通不从通航事件中推定。' },
    livedCase: { date: '2025-04-29报道', people: '夏通街居民多加；幸福横街商户卓玛', change: '前者讲窄巷会车，后者讲施工临时用水：道路与管网更新直接涉及居民出行和经营。', sourceIds: ['regional-chamdo-update2025'], limit: '材料没有住宅或店铺坐标，不能把话语挂到某栋现状建筑。建设进度停留在报道日期。' },
  },
  nagqu: {
    currentGeometry: ['node/7296275987', 'way/28446086', 'way/852980006', 'way/257845498'],
    routeIds: ['nagqu-station-city', 'nagqu-station-school', 'nagqu-rail-yard'],
    history: { date: '2006-07-01', event: '青藏铁路全线开通运营', change: '将那曲接入长途铁路网络；站房和城区之间仍由实际城市道路接续。', sourceIds: ['regional-nagqu-rail'], limit: '现状道路不是2006年完整路网；车站不等于全市或物流园。' },
    development: { date: '2009-08-17', event: '那曲物流中心举行竣工运营典礼', change: '铁路到达后仍需装卸、仓储、加工和分送。2015年商务厅材料记录了当地运输组织的变化。', sourceIds: ['regional-nagqu-logistics', 'regional-nagqu-logistics2015'], limit: '已绘铁路用地只作为站场地理，不是物流中心官方边界；不把1985—2015遥感检出变化单归因铁路。' },
    livedCase: { date: '2025-01-15报道', people: '那曲站工作人员与旅游、学生、务工等旅客', change: '站内服务承接不同客流，站外道路仍将站房接回城市生活。学校路径是地理观察对照，不是受访旅客实际轨迹。', sourceIds: ['regional-nagqu-station-life2025'], limit: '不以春运预测数字代替实测，不提供当前班次或到校承诺。' },
  },
} as const;
