/** Published research values, not raw satellite pixels or a field survey. */
export const climateEvidenceSources = [
  {
    id: 'siling-co-study',
    title: 'Zhu et al.（2019）· 色林错地区不同时间尺度的气候与湖泊环境变化',
    url: 'https://doi.org/10.1016/j.scib.2019.02.016',
    note: 'Science Bulletin 64(7), 422–424；研究团队 News & Views。第422页开篇报告1976与2017的湖面面积，2017面积同时标注为6月。',
  },
  {
    id: 'siling-co-cas-summary',
    title: '中国科学院青藏高原研究所 · 色林错研究介绍（2019-08-30）',
    url: 'https://www.itpcas.cas.cn/new_kycg/new_kyjz/202007/t20200718_5637293.html',
    note: '研究团队机构发布的成果介绍，明确列出1976年1667平方公里、2017年2389平方公里。网页路径中的2020不是文章或观测年份。',
  },
  {
    id: 'siling-co-location-study',
    title: '郝贵斌等（2016）· 色林错湖面积时空变化研究',
    url: 'https://www.dqxxkx.cn/article/2016/1560-8999/1560-8999-18-6-833.shtml',
    note: '地球信息科学学报18(6), 833–846，DOI 10.3724/SP.J.1047.2016.00833。仅用第2.1节公开研究区经纬范围作定位参照；不将该文数值混入2019年的两期面积比较。',
  },
] as const;

export interface ClimateEvidenceRecord {
  year: number;
  value: number;
  label: string;
  date: string;
  datePrecision: 'year' | 'month';
  uncertainty: number | null;
  sourceId: string;
}

const bounds = { west: 88 + 33 / 60, east: 89 + 21 / 60, south: 31 + 34 / 60, north: 31 + 57 / 60 };

export const silingCoEvidence = {
  id: 'siling-co-area-1976-2017',
  stepId: 'C9',
  title: '色林错：用有年份的研究数值比较湖面',
  claim: '朱立平等2019年的研究总结报告：色林错湖面面积由1976年的1667平方公里增至2017年的2389平方公里。',
  variable: '湖面面积',
  unit: 'km²',
  dataKind: 'published-research-summary',
  dataKindLabel: '已发表研究汇总数值',
  records: [
    { year: 1976, value: 1667, label: '1976年', date: '1976', datePrecision: 'year', uncertainty: null, sourceId: 'siling-co-study' },
    { year: 2017, value: 2389, label: '2017年（文中注明6月）', date: '2017-06', datePrecision: 'month', uncertainty: null, sourceId: 'siling-co-study' },
  ] satisfies ClimateEvidenceRecord[],
  scope: {
    place: '西藏色林错（Serling Co / Siling Co）',
    spatial: '该研究所指的色林错湖面，不代表全西藏湖泊、冰川或整个流域的面积。',
    temporal: '1976年与2017年两个已发表状态；2017湖面面积在文首注明为6月，1976未在该段给出具体月日。',
    precision: '保留研究开篇与机构介绍采用的整数平方公里口径。该段未给这两值的不确定度；null不代表误差为零。',
  },
  source: {
    ...climateEvidenceSources[0],
    authors: 'Liping Zhu, Junbo Wang, Jianting Ju, et al.',
    publicationYear: 2019,
    journal: 'Science Bulletin',
    volume: '64(7)',
    pages: '422–424',
    articleType: 'News & Views',
    doi: '10.1016/j.scib.2019.02.016',
    bodyLocation: '第422页，开篇第一段；同段同时给出2017年6月的面积。',
    publisherPdfUrl: 'https://www.sciengine.com/doi/pdf/584BB31B46C14A10895B67D5A606873A',
    metadataUrl: 'https://pubmed.ncbi.nlm.nih.gov/36659789/',
    checkedOn: '2026-10-15',
  },
  locationReference: {
    label: '公开论文研究区范围的中心参照',
    bounds,
    longitude: (bounds.west + bounds.east) / 2,
    latitude: (bounds.south + bounds.north) / 2,
    sourceId: 'siling-co-location-study',
    derivation: '郝贵斌等（2016）第2.1节给出31°34′–31°57′N、88°33′–89°21′E；这里仅计算该包围范围中心用于远景定位。',
    limitation: '不是实测中心点、当前湖岸边界或面积统计的几何输入；不据此生成1976/2017湖形。',
  },
  interpretation: [
    '先在整体地图找到色林错的研究区，再以同一零点和平方公里单位比较两条柱形。2017年的报告面积大于1976年。',
    '两条柱形表达两个已发表面积值。它们不包含湖岸几何，因此不能让合成湖形或冰川边界跟着数值变化。',
    '面积差异提出进一步的水量平衡问题。降水、径流与蒸发怎样参与，需要相应观测和研究，不能仅凭这两个面积值归因。',
  ],
  limits: [
    '只有两个年份；不补出中间年份、不播放连续年表、不推算未来。',
    '湖面面积、湖水体积、湖水位、温度和冰川面积是不同变量。',
    '不是原始观测数据下载，也不是本产品重新处理卫星影像所得的结果。',
    '不同研究的日期、湖区定义与提取方法可能不同；不混合数值拼成一个时间序列。',
    '该案例说明一处湖泊在给定时期的变化，不能外推所有湖泊或全西藏。',
  ],
} as const;

export const climateEvidence = [silingCoEvidence] as const;
