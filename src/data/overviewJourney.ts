import { getJourneyStep } from './journey';
import { chapters, sources as curriculumSources } from './curriculum';
import { cityOverviewSources } from './cityOverview';
import { cityContinuitySources } from './cityContinuity';
import { cityAccessChanges } from './cityAccessChange';
import { cityAccessAudioSegments } from '../lib/cityAccessAudio';
import { overviewNarrationCues } from './overviewNarration';
import {overviewHeritageLessons} from '../lib/overviewHeritageScene';
import {overviewHeritageObjects} from './overviewHeritageEvidence';

export type OverviewChapterId = 'earth' | 'position' | 'engine' | 'formation' | 'terrain' | 'airwater' | 'regions' | 'history' | 'connections' | 'observation';
export type OverviewTopic = 'regions' | 'life' | 'history' | 'culture' | 'connections' | 'observation';
export interface OverviewSource { title: string; url: string; note?: string }
export interface OverviewMoment {
  /** Exact, unique substring in this recording; native word timings own it. */
  token: string;
  title: string;
  explanation: string;
  /** An existing atlas hotspot or city ID, never an invented event coordinate. */
  focus?: string;
  year?: string;
}
export interface OverviewBeat {
  id: string;
  chapterId: OverviewChapterId;
  title: string;
  recordingId: string;
  text: string;
  kind: 'journey' | 'atlas' | 'comparison' | 'orientation' | 'heritage';
  stepId?: string;
  cueIndex?: number;
  comparisonStage?: 'development';
  segmentId?: string;
  topic?: OverviewTopic;
  moments?: OverviewMoment[];
  sources: OverviewSource[];
  detailStepId: string;
}
export interface OverviewChapter {
  id: OverviewChapterId;
  title: string;
  question: string;
  premise: string;
  conclusion: string;
  nextQuestion: string;
  scale: string;
  beats: OverviewBeat[];
}

const sourceRecords = [...curriculumSources, ...cityOverviewSources, ...cityContinuitySources];
const sourceById = new Map(sourceRecords.map(source => [source.id, source]));
const refs = (...ids: string[]): OverviewSource[] => ids.map(id => {
  const source = sourceById.get(id);
  if (!source) throw new Error(`Overview source missing: ${id}`);
  return { title: source.title, url: source.url, ...(source.note ? { note: source.note } : {}) };
});

/** Source identities and limitations stay next to the related overview, rather
 * than taking over the narration. Sources were checked on 2026-10-16. */
export const overviewSourceNotes: Record<string, OverviewSource[]> = {
  regions: refs('tibet-administrative-2026', 'geography'),
  life: refs('geography', 'yarlung-river', 'shannan-valley', 'society'),
  historyEarly: refs('prehistory', 'history-overview', 'stele'),
  historyMiddle: refs('met-exchange', 'history-overview', 'phagmodru'),
  historyModern: [
    ...refs('dalai-history', 'history-overview', 'modern-history', 'diplomatic-1951'),
    { title: '西藏自治区政府 · 1951、1959与1965的制度节点', url: 'https://www.xizang.gov.cn/xwzx_406/ztzl_416/cxzt/xzzzqrmzffzyjzx/zxdt/xzzzqrmzffzyjzx_398/201911/t20191114_123465.html', note: '官方历史叙述；1951年协议签于北京，1959年冲突与随后改革、1965年自治区成立各有背景。与学术研究和当时外交材料对读，制度节点不代替全部地方社会经历。' },
  ],
  culture: refs('unesco', 'met-exchange', 'met-art', 'opera-practice', 'opera-transmission'),
  objects:overviewHeritageObjects.map(object=>({title:`Met · ${object.title} · ${object.accession}`,url:object.source,note:`${object.date}；馆方公开实物图像，CC0；物件年代与历史事件分别阅读。`})),
  connections: refs('railway', 'continuity-lalin-opening-2021', 'continuity-ngari-airport-2010', 'yarlung-river'),
  protection: [...refs('yarlung-river', 'changtang-protection', 'continuity-unesco-decision-2025'),
    {title:'UNESCO / ICOMOS · 2005年监测报告，第3页',url:'https://whc.unesco.org/document/5816',note:'回看前例：多数供灯迁出传统木构，寺前供灯继续；报告所见不是竣工日期，灯光为关系示意。'},
    {title:'大昭寺及寺前现状地物',url:'/data/local-places/lhasa.geojson',note:'仅用真实现状轮廓定位，不复原供灯室或历史灯位。'},
    {title:'Natural Earth · 河流中心线（1:1000万）',url:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/',note:'公共领域概览数据；10m 表示 1:1000万比例尺，不是10米精度。河道宽度和金色讲解进度是阅读符号，不表示实测河宽、流速或流量。'},
    {title:'当前画面的河道数据与处理记录',url:'/data/hydrography/yarlung-river.geojson',note:'保留 Maquan、Yarlung、Dihang、Brahmaputra 原始几何。仅沿端点相接的主部件展示，不连接分支；名称与上下游关系参照中科院地理所资料。'},
    {title:'中科院青藏高原所 · 雅鲁藏布江多圈层水文观测',url:'https://www.itpcas.ac.cn/new_kycg/new_kyjz/202204/t20220426_6439458.html',note:'上下游水文过程需要观测资料支持，画面中的概览河道不能用于推算水量。'},
  ],
  observation: refs('geography', 'unesco', 'tourism-plan'),
};

function lesson(chapterId: OverviewChapterId, stepId: string, cueIndex: number): OverviewBeat {
  const cue = getJourneyStep(stepId).cues[cueIndex];
  if (!cue) throw new Error(`Overview lesson cue missing: ${stepId}/${cueIndex}`);
  const step = chapters.flatMap(chapter => chapter.steps).find(item => item.id === stepId)!;
  return {
    id: cue.id, chapterId, title: cue.title, recordingId: cue.id, text: cue.narration,
    kind: 'journey', stepId, cueIndex, sources: refs(...step.sources), detailStepId: stepId,
  };
}
function macro(chapterId: OverviewChapterId, recordingId: string, topic: OverviewTopic, detailStepId: string,
  sourceKey: keyof typeof overviewSourceNotes, moments: OverviewMoment[]): OverviewBeat {
  const cue = overviewNarrationCues.find(item => item.id === recordingId);
  if (!cue) throw new Error(`Overview narration missing: ${recordingId}`);
  return { id: recordingId, chapterId, title: cue.title, recordingId, text: cue.narration, kind: 'atlas', topic,
    moments, sources: overviewSourceNotes[sourceKey], detailStepId };
}
function access(segmentId: string): OverviewBeat {
  const segment = cityAccessAudioSegments.find(item => item.id === segmentId);
  if (!segment) throw new Error(`Overview access recording missing: ${segmentId}`);
  const phase = segmentId.endsWith('-access') ? 'access' : segmentId.endsWith('-life')?'life':'transfer';
  return { id: segmentId, chapterId: 'connections', title: cityAccessChanges.lhasa[phase].label,
    recordingId: segmentId, text: segment.text, kind: 'comparison', comparisonStage: 'development', segmentId,
    sources: refs(...cityAccessChanges.lhasa.sourceIds), detailStepId: 'M1' };
}

function orientation(chapterId:OverviewChapterId,recordingId:string,title:string):OverviewBeat {
  const cue=overviewNarrationCues.find(item=>item.id===recordingId)!;
  const step=chapters.flatMap(chapter=>chapter.steps).find(item=>item.id==='G2')!;
  return {id:cue.id,chapterId,title,recordingId:cue.id,text:cue.narration,kind:'orientation',stepId:'G2',sources:refs(...step.sources),detailStepId:chapterId==='formation'?'G3':'G2'};
}
function heritage(index:number):OverviewBeat {
  const lesson=overviewHeritageLessons[index];
  return {id:lesson.id,chapterId:'history',title:lesson.title,recordingId:lesson.id,text:lesson.narration,kind:'heritage',topic:'culture',segmentId:lesson.id,sources:refs(...lesson.sourceIds),detailStepId:'K1'};
}
/** One authored overview. The full lesson library keeps its identifiers and
 * saved progress, but cannot silently choose the next beat of this sequence. */
export const overviewChapters: OverviewChapter[] = [
  {
    id: 'earth', title: '先看地球这个整体', question: '地球上有什么，它们怎样联系？',
    premise: '先认清海洋、陆地、空气、冰雪与植物，才有理解地方的共同背景。',
    conclusion: '陆地并不独立：水和热通过海洋、大气与地面彼此联系。',
    nextQuestion: '西藏位于这个地球的哪里？', scale: '完整地球',
    beats: [lesson('earth', 'G1', 0)],
  },
  {
    id: 'position', title: '从地球找到西藏', question: '西藏属于什么空间层级，周围有什么？',
    premise: '保留完整地球，按洲、国家、自治区逐层定位。',
    conclusion: '西藏在亚洲、中国西南；行政范围与青藏高原的自然范围分别认识。',
    nextQuestion: '同在地球上，热量与水为什么分配得不同？', scale: '地球 → 亚洲 → 中国 → 西藏',
    beats: [orientation('position','OVERVIEW-position','从完整地球逐层找到西藏')],
  },
  {
    id: 'engine', title: '地球环境怎样运行', question: '阳光怎样建立冷暖背景，空气怎样搬运热与水？',
    premise: '目标的位置已经明确，现在拉回全球解释共同原理。',
    conclusion: '受热不均、自转和海陆条件参与组织环流，空气输送热量与水汽。',
    nextQuestion: '这些来流为什么在亚洲遇到一片很高的地面？', scale: '全球过程，保留西藏定位',
    beats: [lesson('engine', 'G1', 1), lesson('engine', 'G1', 2)],
  },
  {
    id: 'formation', title: '这片高原怎样形成', question: '今天的高地来自怎样的地质过程？',
    premise: '位置与环流提供背景，地面本身还需要形成解释。',
    conclusion: '相向运动、地壳变形增厚与侵蚀长期共同作用，地区和阶段并不同步。',
    nextQuestion: '形成以后，今天的高原到底有多高、内部怎样起伏？', scale: '亚洲地壳过程 → 今天高地',
    beats: [orientation('formation','OVERVIEW-formation-entry','先回到亚洲高地，再进入剖面'),lesson('formation', 'G3', 0), lesson('formation', 'G3', 1), lesson('formation', 'G3', 3)],
  },
  {
    id: 'terrain', title: '用真实高程建立感觉', question: '为什么翻过高山，地面仍维持在很高的位置？',
    premise: '回到今天，低地、山系与高原内部共用同一海平面基准。',
    conclusion: '这是一片整体很高、内部仍有山脊和谷地的地面，而非一座孤立山峰。',
    nextQuestion: '空气和水来到这样的地面，会发生什么？', scale: '周边低地 → 喜马拉雅 → 高原内部',
    beats: [lesson('terrain', 'G4', 0), lesson('terrain', 'G4', 1)],
  },
  {
    id: 'airwater', title: '跟着来流看抬升与云雨', question: '山地怎样改变空气，什么条件下才形成云和雨？',
    premise: '全球来流与真实高差已经建立，现在跟踪同一团空气。',
    conclusion: '抬升冷却、水汽条件、凝结与粒子增长共同参与；水汽、云和降雨是不同状态。',
    nextQuestion: '同在西藏，为什么各地条件仍不一样？', scale: '完整地球靠近同一高原地形',
    beats: [lesson('airwater', 'C4', 0), lesson('airwater', 'C4', 1), lesson('airwater', 'C4', 2)],
  },
  {
    id: 'regions', title: '从全域差异走到城市生活', question: '不同地区怎样面对水、土地与通行？',
    premise: '把来流、地形和水汽放回全域，不把一个城市代替整个地区。',
    conclusion: '地形、水热和位置的组合形成不同条件；设施、劳动和组织使条件进入生活。',
    nextQuestion: '环境相连却不决定历史，人怎样形成文化与地方？', scale: '七市地同图 → 共同生活问题',
    beats: [
      lesson('regions', 'C4', 3),
      macro('regions', 'OVERVIEW-regional-system', 'regions', 'E1', 'regions', [
        { token: '拉萨、日喀则和山南', title: '中南部：河谷与生产', explanation: '保留拉萨河、年楚河、雅砻河与雅鲁藏布江的全域背景。', focus: 'shannan' },
        { token: '东部昌都和东南部林芝', title: '东部与东南部：高山峡谷', explanation: '同是东部，流域、谷地来路与水热条件仍有区别。', focus: 'chamdo' },
        { token: '北部那曲与西部阿里', title: '北部与西部：高原、湖盆和宽谷', explanation: '七市地是行政入口，自然环境跨越行政范围。', focus: 'nagqu' },
      ]),
      macro('regions', 'OVERVIEW-life-conditions', 'life', 'E3', 'life', [
        { token: '河谷较缓的地面', title: '土地：较缓空间提供可能', explanation: '地形说明高低起伏，城市用途还由建设与历史形成。', focus: 'yarlung-life' },
        { token: '水源还要经过取用和维护', title: '水：有水不等于已经供给', explanation: '自然水源到生活用水，中间还有取用、设施与劳动。', focus: 'lhasa' },
        { token: '越过山岭', title: '通行：高差需要工程与组织', explanation: '道路、桥隧、运营与持续维护共同支撑地方联系。', focus: 'nyingchi' },
      ]),
    ],
  },
  {
    id: 'history', title: '把人文放回历史长线', question: '哪些时期与行动，塑造了今天的地方和文化？',
    premise: '自然为生活提供条件；政治、信仰、交流与日常实践需要各自的时间和材料。',
    conclusion: '历史有延续也有重组；文化在建筑用途、学习、创造与持续参与中形成。',
    nextQuestion: '今天的新通道怎样接上这些已有城市与生活？', scale: '全域地图与时间线，定位有证节点',
    beats: [
      macro('history','OVERVIEW-history-entry','history','H1','historyEarly',[
        {token:'接下来把同一张地图放进时间',title:'环境说明条件，历史还需要人的行动',explanation:'先在完整地图建立时间顺序，再以有地点和年代的材料认识地方。'},
      ]),
      macro('history', 'OVERVIEW-history-early', 'history', 'H1', 'historyEarly', [
        { token: '尼阿底研究', title: '史前：高海拔活动证据', explanation: '采用2018年研究的约4万—3万年前口径；活动证据不等于全年定居。', focus: 'nyade-evidence', year: '约4万—3万年前' },
        { token: '七至九世纪', title: '吐蕃：政治组织与广泛交往', explanation: '雅砻与拉萨定位历史线索，不复原政权疆域。', focus: 'yarlung-polity', year: '7—9世纪' },
        { token: '唐蕃会盟碑', title: '会盟与立碑分别对应', explanation: '821—822年会盟，823年立碑；现存碑刻与拓本各有材料身份。', focus: 'lhasa-stele', year: '821—823年' },
      ]),
      macro('history', 'OVERVIEW-history-middle', 'history', 'H2', 'historyMiddle', [
        { token: '十至十二世纪', title: '地方重组与宗教复兴', explanation: '政治力量、寺院和交流网络继续变化，各地并非同步。', focus: 'ngari', year: '10—12世纪' },
        { token: '阿底峡在一〇四二年', title: '人物与知识交流', explanation: '博物馆资料记述1042年行旅与托林节点；不补画精确古道。', focus: 'tholing-exchange', year: '1042年' },
        { token: '十三至十四世纪', title: '元朝与萨迦：制度联系', explanation: '由具体机构、文书与地方材料认识制度联系；现代底图不代表历史边界。', focus: 'shigatse', year: '13—14世纪' },
        { token: '随后帕竹', title: '后续地方政治变化', explanation: '帕竹联系山南地方历史，不把它与萨迦合为同一个城市。', focus: 'shannan', year: '14—17世纪' },
      ]),
      macro('history', 'OVERVIEW-history-modern', 'history', 'H4', 'historyModern', [
        { token: '十七世纪', title: '甘丹颇章与拉萨空间', explanation: '政治组织与建筑用途建立联系，现存形制仍包含后续营建。', focus: 'lhasa-institutions', year: '17世纪' },
        { token: '清代的驻藏大臣和噶厦', title: '清代：制度与地方社会', explanation: '制度规定、实际执行与地方生活需要分层阅读。', focus: 'lhasa', year: '18—19世纪' },
        { token: '一九〇四年英国军事行动', title: '1904年：军事行动与江孜事件', explanation: '江孜提供军事行动的具体地方线索，今天的城堡与纪念展示不能代替当年现场。', focus: 'gyantse-1904', year: '1904年' },
        { token: '一九五一年协议', title: '近现代制度与地方经历', explanation: '1951年协议签于北京；1959年冲突与改革、1965年自治区成立分别核对。回到全图，不把多个事件钉在江孜或同一建筑。', year: '1951、1959、1965年' },
      ]),
      macro('history', 'OVERVIEW-culture', 'culture', 'K1', 'culture', [
        { token: '建筑组织宗教、礼仪和日常用途', title: '建筑：空间与用途', explanation: '从城市整体定位建筑，再读年代、参与者与具体用途。', focus: 'lhasa-buildings' },
        { token: '学习与翻译', title: '交流：知识在地方被理解与创造', explanation: '教师、译者、文本与赞助让交流成为持续实践。', focus: 'tholing-culture' },
        { token: '节庆与藏戏', title: '传承：持续参与、学习和使用', explanation: '文化也发生在社区、家庭与表演学习中，不能只等同于遗产建筑。' },
      ]),
      macro('history','OVERVIEW-evidence-reading','culture','K3','objects',[
        {token:'眼前的阿底峡画像',title:'分清事件年代与物件年代',explanation:'1042年是行旅时间；馆藏画像制作于12世纪前中期，不是当年现场。'},
        {token:'授课手势和手持经书',title:'从实物读教师身份的表现',explanation:'图像与馆方说明帮助辨认授课手势和文本；具体译事仍需其他材料。'},
        {token:'再看约十二世纪初的木经板',title:'一件物件里的保护用途与雕刻工艺',explanation:'木制封板保护长条经页，板面图像联系宗教艺术；它不是正文页。'},
        {token:'保存、学习与工艺联系在一起',title:'让一项材料回到多样的文化实践',explanation:'实物回答一个具体问题，不能代替全部地方、社区与传习活动。'},
      ]),
      macro('history','OVERVIEW-heritage-entry','culture','K1','culture',[
        {token:'现在暂时离开顺时排列',title:'从全史回到一个地方读用途',explanation:'这是带着历史线索研究建筑用途，不是把历史时间又向前推进。'},
        {token:'先在全图确认',title:'先找拉萨河谷，再走近建筑',explanation:'同一地图中保留城市与周边，随后靠近实际建筑整体轮廓。',focus:'lhasa'},
      ]),
      heritage(0),
      {id:'OVERVIEW-barkhor-life',chapterId:'history',title:'大昭寺到八廓街：活动、空间与保护',recordingId:'OVERVIEW-barkhor-life',text:overviewNarrationCues.find(cue=>cue.id==='OVERVIEW-barkhor-life')!.narration,kind:'heritage',topic:'culture',detailStepId:'K1',sources:[
        {title:'UNESCO · 拉萨历史建筑群',url:'https://whc.unesco.org/en/list/707/',note:'大昭寺7世纪创建，2000年作为扩展列入；不把现状街区当作7世纪复原。'},
        {title:'世界遗产委员会 · 2021年44 COM 7B.20决定',url:'https://whc.unesco.org/en/decisions/7738/',note:'第7项要求广场管理照顾朝拜与祈祷通行；这是管理要求，不是已落实成效的测量。'},
        {title:'后续材料 · 2023年45 COM 7B.155决定',url:'https://whc.unesco.org/en/decisions/8161/',note:'第7项肯定参访管理努力，同时要求监测并报告措施成效。此段不绘制没有取得的管理分区与人流数据。'},
        {title:'OpenStreetMap · 大昭寺广场',url:'https://www.openstreetmap.org/way/177796787',note:'使用已归档现状轮廓、步行街巷和商业用地；移动标记不表示人数、速度或古代路线。'},
      ]},
      heritage(1),heritage(2),
      {id:'OVERVIEW-lhasa-urban-change',chapterId:'history',title:'从历史地标到现代城市空间',recordingId:'OVERVIEW-lhasa-urban-change',text:overviewNarrationCues.find(cue=>cue.id==='OVERVIEW-lhasa-urban-change')!.narration,kind:'heritage',topic:'culture',detailStepId:'K1',sources:[
        {title:'DLR · World Settlement Footprint Evolution',url:'https://eodata.dlr.de/en/datasets/wsf/wsf_evo',note:'原始30米聚居地首次检出估计，1985—2015；不等于建筑年份。保留原始IDC一致性数据，未宣称拉萨局部精度。'},
        {title:'UNESCO · 2005年保护状况报告，第3页',url:'https://whc.unesco.org/document/5816',note:'报告第(vii)—(viii)节记载布达拉宫广场扩展、住户与机构搬迁，以及八廓街供排水、街面改善。没有原始改造前后测绘，不绘制过去地块或管网。'},
        {title:'OpenStreetMap · 布达拉宫广场现状地物',url:'https://www.openstreetmap.org/way/61818449',note:'现状位置不是2005年工程范围，也不能按此倒推搬迁住户的位置。'},
      ]},
      macro('history','OVERVIEW-heritage-return','culture','K1','culture',[
        {token:'再回到西藏全域',title:'把局部用途放回整个地区',explanation:'建筑的年代和用途解释既有城市；接下来问新通道怎样接入这些空间。'},
      ]),
    ],
  },
  {
    id: 'connections', title: '现代联系怎样进入生活', question: '有了新通道，还需要哪些环节，地方才能使用？',
    premise: '已有城市、社会与历史先保留，再看新方式增加了什么。',
    conclusion: '区域抵达、地方接续和实际使用各有条件；周边关系也意味着共同维护。',
    nextQuestion: '带着这些认识，到一个地方具体应该观察什么？', scale: '全域联系 → 拉萨接续例证 → 全域共同议题',
    beats: [
      macro('connections', 'OVERVIEW-connections', 'connections', 'M1', 'connections', [
        { token: '公路、铁路和航空', title: '交通：已有方式与新增选择', explanation: '通道的建设与开通是历史事件，实际使用还取决于运营与接续。', focus: 'lhasa-railway' },
        { token: '河流连接上下游', title: '流域：自然联系跨越地方', explanation: '水源、汇流与使用需要共同阅读，不由地图方向推算流量。', focus: 'shannan' },
        { token: '拉萨的铁路与跨河接续', title: '例证：从铁路节点进入城市', explanation: '接下来保持同一地区，先看到站，再看跨河接续。', focus: 'lhasa' },
      ]),
      access('ACCESS-lhasa-access'),
      access('ACCESS-lhasa-transfer'),
      access('ACCESS-lhasa-life'),
      macro('connections', 'OVERVIEW-protection', 'connections', 'R3', 'protection', [
        { token: '雅鲁藏布江', title: '沿河道认识上游与下游', explanation: '沿青色干流从西向东看，再看东部转向下游的联系。金色跟随讲解推进；水量和变化需要水文观测，不能从线条推算。' },
        { token: '羌塘的生态管护', title: '生态：跨那曲与阿里的共同空间', explanation: '草地、湿地与野生动物的保护涉及真实管护行动。', focus: 'changtang-stewardship' },
        { token: '拉萨遗产保护', title: '城市：维护遗产与地方日常', explanation: '访问、朝圣、居民使用与遗产保护需要共同考虑。', focus: 'lhasa-buildings' },
      ]),
    ],
  },
  {
    id: 'observation', title: '带着整体认识继续观察', question: '怎样让每一站接上前面的原因，而非只记地名？',
    premise: '先保留认识顺序，再把问题对应到具体地方与可核实材料。',
    conclusion: '位置、环境、生活、历史、文化与今天联系在同一张认识地图中。',
    nextQuestion: '选择一个问题深入，或保存有观察目的的路线。', scale: '回到全域，保留每个局部的来路',
    beats: [
      {...macro('observation','OVERVIEW-lived-city','observation','T1','observation',[]),sources:[
        ...refs('access-liuwu-bridge-2019','continuity-unesco-decision-2025','city-local-osm-2026'),
        {title:'OpenStreetMap · 柳梧大桥源地物',url:'https://www.openstreetmap.org/way/122707217',note:'沿已归档原始相连OSM节点演示接续；路端不是已核实的景区入口，移动符号不是公交线路、导航或历史行程。'},
      ]},
      macro('observation', 'OVERVIEW-conclusion', 'observation', 'T3', 'observation', [
        { token: '从地球找到西藏', title: '位置建立来路', explanation: '完整地球到亚洲、中国与西藏，始终保留尺度。' },
        { token: '人的行动怎样形成文化与历史', title: '条件与人的行动共同解释地方', explanation: '自然机制、历史材料与社会实践各有作用，不能互相替代。' },
        { token: '沿任何一个问题深入', title: '完整演示结束，局部认识继续', explanation: '从有目的的专题或观察路线继续，并随时回到全域。' },
      ]),
    ],
  },
];

export const overviewBeats: OverviewBeat[] = overviewChapters.flatMap(chapter => chapter.beats);
