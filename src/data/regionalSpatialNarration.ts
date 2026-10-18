import type { RegionalJourneyCityId, RegionalJourneyCue, RegionalJourneySource } from './regionalJourneyTypes';

/** Recording scripts frozen 2026-10-16. All three ASCII year phrases are
 * literal scene anchors; native words must belong to these exact recordings.
 * Current roads/structures stay references when a historical raster is shown. */
export const regionalSpatialNarration: Record<RegionalJourneyCityId, { history: RegionalJourneyCue; connections: RegionalJourneyCue }> = {
  shigatse: {
    history: {
      id: 'REG-SPATIAL-shigatse-history', action: 'settlement', anchor: '先看1985年日喀则的聚居检出',
      text: '先看1985年日喀则的聚居检出，再到2005年观察河谷中的分布，最后对照2015年。三十米网格来自卫星分析，1985年一档也包含更早聚居，早期少检出不表示古城不存在。今天的寺院与车站只作参照，检出年不是建房年，也不能单凭范围变化证明铁路造成扩张。',
      pointIds: ['shigatse-city', 'tashilhunpo', 'shigatse-station'],
      sourceIds: ['regional-wsf-evolution', 'regional-west-osm-acquisition'],
    },
    connections: {
      id: 'REG-SPATIAL-shigatse-access', action: 'road', anchor: '从日喀则站前路、黑龙江南路进入城区',
      text: '从日喀则站前路、黑龙江南路进入城区，再看上海路与扎什伦布寺的联系。2024年报道记载扎寺旅游专线，职工边巴穷达也讲到周边就业、商铺与物流。铁路到站还需城市服务接续；画面按真实道路读图，留下出口资料空缺，不冒充公交逐站轨迹。',
      pointIds: ['shigatse-station', 'shigatse-city', 'tashilhunpo'],
      sourceIds: ['regional-shigatse-lastmile-2024', 'regional-shigatse-station-life-2024', 'regional-west-osm-acquisition'],
    },
  },
  shannan: {
    history: {
      id: 'REG-SPATIAL-shannan-history', action: 'settlement', anchor: '先看1985年泽当的聚居检出',
      text: '先看1985年泽当的聚居检出，再到2005年比较谷地中的范围，最后对照2015年。三十米网格表示卫星估计的检出年，最早一档也包含更早聚居。拉林铁路2021年才开通，已超出这组资料时段，不能把这些变化说成通车后的结果。',
      pointIds: ['shannan-city', 'shannan-station'],
      sourceIds: ['regional-wsf-evolution', 'regional-lalin-open'],
    },
    connections: {
      id: 'REG-SPATIAL-shannan-access', action: 'road', anchor: '从山南站沿已绘道路接到格桑路、英雄路',
      text: '从山南站沿已绘道路接到格桑路、英雄路，再进入泽当街道。2020年站前配套仍在施工，2021年开通时，采访中的卓玛因工作每周往返拉萨。到站、出站与城市服务共同完成出行；这段真实道路保留出口资料空缺，不是当前公交导航。',
      pointIds: ['shannan-station', 'shannan-city'],
      sourceIds: ['regional-shannan-station-front-2020', 'regional-shannan-passenger', 'regional-west-osm-acquisition'],
    },
  },
  chamdo: {
    history: {
      id: 'REG-SPATIAL-chamdo-history', action: 'settlement', anchor: '先看1985年昌都的聚居检出',
      text: '先看1985年昌都的聚居检出，再到2005年比较两河谷地中的分布，最后对照2015年。三十米网格来自卫星分析，最早一档也包含更早聚居。它帮助观察建成空间怎样分布，却不是具体房屋的建造日期，也不能独自解释桥梁或机场带来的影响。',
      pointIds: ['chamdo'], sourceIds: ['regional-wsf-evolution', 'regional-chamdo-confluence'],
    },
    connections: {
      id: 'REG-SPATIAL-chamdo-access', action: 'road', anchor: '沿昌都真实街道与桥梁',
      text: '沿昌都真实街道与桥梁，观察两岸到寺院周边的接续。2024年四川桥片区更新开工；另有夏通街居民多加讲窄巷会车，幸福横街商户卓玛讲临时用水。道路、管网和组织共同影响出行与经营；现况地图不能定位两人的住房商铺，也不代表项目已经完工。',
      pointIds: ['chamdo'], sourceIds: ['regional-chamdo-update2025', 'regional-chamdo-city-space', 'regional-east-current-osm'],
    },
  },
  nagqu: {
    history: {
      id: 'REG-SPATIAL-nagqu-history', action: 'settlement', anchor: '先看1985年那曲的聚居检出',
      text: '先看1985年那曲的聚居检出，再到2005年比较城市与站场周边，最后对照2015年。三十米网格表示卫星估计检出年，1985年一档也包含更早聚居。今天的轨道只作位置参照，不能倒推旧路网，更不能把范围变化都归因于2006年铁路通车。',
      pointIds: ['nagqu'], sourceIds: ['regional-wsf-evolution', 'regional-nagqu-rail', 'regional-east-current-osm'],
    },
    connections: {
      id: 'REG-SPATIAL-nagqu-access', action: 'road', anchor: '先看那曲真实站房与站场轨道',
      text: '先看那曲真实站房与站场轨道，再沿已绘街道接入城市。2006年青藏铁路通车，2009年物流中心竣工，铁路运输还需装卸、分拨与公路配送才进入生活。客运与货运分开读，图中站场不是物流园边界，到城区的演示只走相连的源道路。',
      pointIds: ['nagqu'], sourceIds: ['regional-nagqu-rail', 'regional-nagqu-logistics', 'regional-nagqu-logistics2015', 'regional-nagqu-station-life2025', 'regional-east-current-osm'],
    },
  },
};

export const regionalSpatialNarrationSources: RegionalJourneySource[] = [{
  id: 'regional-wsf-evolution', title: 'World Settlement Footprint Evolution · 1985—2015年聚居检出',
  publisher: '德国航空航天中心 DLR／EOC', date: '1985—2015年 Landsat-5/7；2026-10-16采集城市窗',
  url: 'https://geoservice.dlr.de/web/maps/eoc:wsfevolution',
  supports: ['原始30米栅格的数值是估计聚居检出年，1985年档左删失，包含可能更早存在的聚居；0为无数据，不能解释为无人居住。', '1985、2005、2015年仅比较同一取得窗口的累积检出；不是历史宗地、房屋建成年、建筑高度或行政市域面积，不能单独建立交通事件与城市扩张的因果关系。', '原始像元、GeoTIFF来源、SHA与IDC资料一致性评分见本地evolution-manifest.json；IDC衡量影像资料条件，不是逐城市分类准确率。'],
}];
