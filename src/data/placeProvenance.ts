import records from '../../public/assets/atlas-place-references.json';

export interface VerifiedPlaceReference {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  kind: 'settlement-reference' | 'published-approximate-location';
  sourceId: 'natural-earth-populated-places' | 'geonames-cn' | 'nwya-devu-2024';
  sourceUrl: string;
  featureId: string;
  displayDecimalPlaces: 1;
  scope: string;
}

function naturalEarth(id: string, name: string, featureId: number): VerifiedPlaceReference {
  const record = records.naturalEarth.find(feature => feature.properties.ne_id === featureId);
  if (!record) throw new Error(`Missing archived Natural Earth locator: ${featureId}`);
  const [longitude, latitude] = record.geometry.coordinates;
  return {
    id, name, longitude, latitude, kind: 'settlement-reference', sourceId: 'natural-earth-populated-places',
    sourceUrl: records.sources.find(source => source.id === 'natural-earth-populated-places')!.url,
    featureId: String(featureId), displayDecimalPlaces: 1,
    scope: 'Natural Earth公开聚居地参考点；用于认识城区相对位置，不代表行政中心、文物、车站、测站或整个地区。',
  };
}

function geoNames(id: string, name: string, featureId: string): VerifiedPlaceReference {
  const record = records.geoNames.find(feature => feature.geonameId === featureId);
  if (!record) throw new Error(`Missing archived GeoNames locator: ${featureId}`);
  return {
    id, name, longitude: record.longitude, latitude: record.latitude, kind: 'settlement-reference', sourceId: 'geonames-cn',
    sourceUrl: record.recordUrl, featureId, displayDecimalPlaces: 1,
    scope: 'GeoNames公开地名库WGS84聚居地参考；不是国家测绘成果，不定位寺院、遗址、景点边界或访问入口。',
  };
}

const nwya = records.publishedResearchLocations[0];
/** Source values are read from archived data, never reverse-engineered from an illustration. */
export const verifiedPlaceReferences: Record<string, VerifiedPlaceReference> = {
  lhasa: naturalEarth('lhasa', '拉萨城区参考', 1159150879),
  shigatse: naturalEarth('shigatse', '日喀则城区参考', 1159149873),
  nagqu: naturalEarth('nagqu', '那曲城区参考', 1159146955),
  nyingchi: naturalEarth('nyingchi', '林芝城区参考', 1159146957),
  chamdo: naturalEarth('chamdo', '昌都城区参考', 1159146959),
  shannan: geoNames('shannan', '泽当聚居地参考', '1279498'),
  ngari: geoNames('ngari', '狮泉河聚居地参考', '1280003'),
  tholing: geoNames('tholing', '托林镇参考', '1279865'),
  lulang: geoNames('lulang', '鲁朗镇参考', '1280678'),
  gyantse: geoNames('gyantse', '江孜镇参考', '1281119'),
  'nwya-devu': {
    id: 'nwya-devu', name: '尼阿底研究公布约位', longitude: nwya.longitude, latitude: nwya.latitude,
    kind: 'published-approximate-location', sourceId: 'nwya-devu-2024', sourceUrl: nwya.sourceUrl,
    featureId: nwya.doi, displayDecimalPlaces: 1,
    scope: '2024年研究正文公布到0.1°的约位；不表示发掘方格、文物保护范围或开放访问地点。',
  },
};

/** A source-backed town may introduce regional material, but must stay labelled as that town. */
export const atlasReferenceByHotspot: Record<string, { referenceId: string; mapLabel: string; scope: string }> = {
  'himalaya-relief': { referenceId: 'shigatse', mapLabel: '日喀则 · 南缘地形入口', scope: '用日喀则城区作地区参照；不把城区点说成喜马拉雅山峰位置。' },
  'plateau-energy': { referenceId: 'lhasa', mapLabel: '拉萨 · 热量与季节', scope: '城区提供位置参照，演示讨论一般原理，不是这个点的观测记录。' },
  'southeast-clouds': { referenceId: 'nyingchi', mapLabel: '林芝 · 东南水汽入口', scope: '林芝城区是地区参照；不定位某次降雨或雅鲁藏布大峡谷。' },
  'northern-plateau': { referenceId: 'nagqu', mapLabel: '那曲 · 高地湖盆入口', scope: '以城区进入藏北材料；不表示湖泊或冰川观测点。' },
  'zanda-landscape': { referenceId: 'tholing', mapLabel: '托林镇 · 札达地方入口', scope: '托林镇聚居地参照，不是土林景点、寺院或古格遗址坐标。' },
  'yarlung-life': { referenceId: 'shannan', mapLabel: '泽当 · 河谷生活', scope: '泽当聚居地参照，不代表整个山南或雅砻河流域范围。' },
  'lhasa-buildings': { referenceId: 'lhasa', mapLabel: '拉萨 · 建筑材料入口', scope: '城市参考点不表示布达拉宫、大昭寺或某座建筑。' },
  'tholing-culture': { referenceId: 'tholing', mapLabel: '托林镇 · 文化交流', scope: '镇的参考点不表示托林寺文物建筑的位置或范围。' },
  'nagqu-community': { referenceId: 'nagqu', mapLabel: '那曲 · 生活材料入口', scope: '城区点不表示社区调查样本位置或牧业活动范围。' },
  'nyade-evidence': { referenceId: 'nwya-devu', mapLabel: '尼阿底 · 研究公布约位', scope: '沿用研究正文到0.1°的约位，不细化为未经核对的遗址坐标。' },
  'yarlung-polity': { referenceId: 'shannan', mapLabel: '泽当 · 雅砻历史入口', scope: '泽当是城市参照，不代表雍布拉康、早期都城或政权边界。' },
  'lhasa-stele': { referenceId: 'lhasa', mapLabel: '拉萨 · 会盟碑材料', scope: '拉萨城区是阅读材料的地区入口，不是碑刻位置。' },
  'tholing-exchange': { referenceId: 'tholing', mapLabel: '托林镇 · 1042年材料', scope: '镇的参考点不表示阿底峡行程或11世纪寺院精确位置。' },
  'gyantse-1904': { referenceId: 'gyantse', mapLabel: '江孜镇 · 1904年材料', scope: '现有聚居地参考，不把今天的点当成军事行动、战场或历史城界。' },
  'lhasa-institutions': { referenceId: 'lhasa', mapLabel: '拉萨 · 制度变迁材料', scope: '城市参照，不表示布达拉宫或某个时期的机构地址。' },
  'lhasa-railway': { referenceId: 'lhasa', mapLabel: '拉萨 · 铁路联系材料', scope: '城区参照，不表示拉萨火车站、铁轨位置或当日运输服务。' },
  'chamdo-connections': { referenceId: 'chamdo', mapLabel: '昌都 · 河谷与交换', scope: '城区参照，不代表流域中心、考证古道或真实交通线。' },
  'changtang-stewardship': { referenceId: 'nagqu', mapLabel: '那曲 · 羌塘管护材料', scope: '以那曲城区进入地区材料；不是羌塘保护区位置、边界或管护站。' },
  'nyingchi-living-place': { referenceId: 'nyingchi', mapLabel: '林芝 · 地方生活材料', scope: '林芝城区作地区参照，彩门村在米林；此点不表示村址、铁路站址或田野调查家庭。' },
  'shigatse-neighbours': { referenceId: 'shigatse', mapLabel: '日喀则 · 周边事务', scope: '城区参照，不表示边境口岸、边界控制点或政策作用范围。' },
};

export function atlasVerifiedReference(hotspotId: string): VerifiedPlaceReference | undefined {
  const entry = atlasReferenceByHotspot[hotspotId];
  return entry ? verifiedPlaceReferences[entry.referenceId] : undefined;
}
