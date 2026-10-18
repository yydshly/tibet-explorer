import { cityLifeSources, type CityLifeCityId } from './cityLifeJourney';
import { plateauClimateSources } from './plateauClimateJourney';
import { cityContinuityStages, cityContinuitySources } from './cityContinuity';
import {cityAccessNarrationCues} from '../lib/cityAccessAudio';
import {cityContinuityNarrationCues} from '../lib/cityContinuityAudio';
import {isCityContinuityLessonStage} from '../lib/cityContinuityState';

export type CityComparisonStageId = 'climate' | 'terrain' | 'mobility' | 'water' | 'settlement' | 'history' | 'development' | 'connections' | 'travel';
export const cityComparisonLabels = ['气候来流', '高程起伏', '怎样通行', '怎样用水', '城市空间', '文化历史', '现代发展', '周边联系', '旅行观察'];

export interface CityComparisonBeat {
  at: number;
  title: string;
  text: string;
  narration: string;
}

export interface CityComparisonStage {
  id: CityComparisonStageId;
  title: string;
  question: string;
  narration: string;
  bridge: string;
  scope: string;
  beats: [CityComparisonBeat, CityComparisonBeat, CityComparisonBeat];
  cityNotes: Record<CityLifeCityId, string>;
  sourceIds: string[];
}

function comparisonStage(stage: Omit<CityComparisonStage, 'narration'>): CityComparisonStage {
  return { ...stage, narration: stage.beats.map(beat => beat.narration).join('') };
}

/**
 * All three places stay on one terrain and share its elevation reference.
 * Air, cloud, movement and use-of-water effects illustrate processes; they are
 * not measured rainfall, road alignments, water networks or local forecasts.
 * Sources rechecked on 2026-10-15; no common-period climate normal is asserted.
 */
export const cityComparisonStages: CityComparisonStage[] = [
  comparisonStage({
    id: 'climate', title: '同在西藏，水汽和水热条件为什么不同',
    question: '把三地同时放在地图上，空气来路、山地和季节怎样改变条件？',
    beats: [
      {
        at: 0, title: '林芝：先看藏东南的水汽来路',
        text: '三地保持相同初始水汽条件，比较地形怎样改变空气。先看藏东南的夏季水汽来路，再跟随气团经过深谷与山脊。',
        narration: '把林芝、拉萨和阿里留在同一张地图上。夏季水汽可沿大峡谷进入藏东南，林芝先看这条来路。',
      },
      {
        at: .34, title: '拉萨：干湿季和抬升条件一起看',
        text: '拉萨有明显干湿季。观察空气抬升、冷却到可能成云的过程；来流含水与抬升条件共同参与，水汽不等于落地的雨。',
        narration: '同时看拉萨，高原河谷的干湿季明显。空气遇山抬升会冷却，但有水汽不等于一定下雨。',
      },
      {
        at: .68, title: '阿里：少雨背景不等于没有水汽',
        text: '阿里地方资料强调寒冷、少雨且分布不均。比较三地的条件组合，不把动画中的粒子多少读成雨量排名。',
        narration: '再看西部阿里，地方资料强调寒冷少雨。来流、山地和季节的组合不同，同在高原也会有不同的水热条件。',
      },
    ],
    cityNotes: {
      nyingchi: '藏东南有夏季水汽进入的通道，高山与深谷继续改变局地条件。',
      lhasa: '高原半干旱季风气候，干湿季明显；较平缓的河谷仍在高地。',
      ngari: '西部高地寒冷少雨，降水在地区内部也不均匀；少雨不等于无水汽。',
    },
    sourceIds: ['city-life-southeast-moisture', 'plateau-lhasa-climate', 'city-life-ngari-geography', 'plateau-parcel-theory', 'plateau-orographic-cloud'],
    bridge: '水汽经过的地面并不相同；下一段固定同一个海拔基准，看三地的高山、谷地与高原。',
    scope: '动画是相同初始水汽条件下的地形作用对照；雨滴数量不代表三地气候雨量排行。地方气候介绍来自各自资料，动画不是同期站点气候均值或某日风场，城区参照不代表全域。',
  }),
  comparisonStage({
    id: 'terrain', title: '用同一高程基准，读懂河谷与高原',
    question: '为什么地面看起来平缓，仍可能位于很高的地方？',
    beats: [
      {
        at: 0, title: '林芝：相邻的高山与深谷',
        text: '三地使用同一高程数据和显示尺度。先比较林芝周围谷底与山地的起伏，理解相邻地点也可能有很大的高差。',
        narration: '把三地留在同一块高程地面上，用同一个海拔基准读起伏。林芝的高山深谷，先让我们看到相邻地面的高差。',
      },
      {
        at: .34, title: '拉萨：谷底平缓，仍在高原',
        text: '把拉萨城区参照和周围山地同时保留。相对山坡较平缓，与离海平面有多高，是两个不同的问题。',
        narration: '拉萨城区位于较平缓的河谷，但谷底仍在高原上。把谷底与周围山地一起看，平缓就不再等于海拔低。',
      },
      {
        at: .68, title: '阿里：高地中还有湖盆与宽谷',
        text: '阿里包含湖盆、宽谷、山地与峡谷。保留三地的同一高度基准，再看水源、可用地面和通行分别面对什么条件。',
        narration: '阿里既有高地、湖盆，也有宽谷和峡谷。现在比较水源、可用土地和通行要跨越的地面，准备进入生活。',
      },
    ],
    cityNotes: {
      nyingchi: '高山与深谷相邻；城区参照只帮助定位，不能代替大峡谷或山峰。',
      lhasa: '城区处在相对平缓的河谷；谷底与周围山地都要放回同一海拔基准。',
      ngari: '湖盆、宽谷和山地共同组成西部高地，狮泉河只是地区阅读入口。',
    },
    sourceIds: ['comparison-terrain-grid', 'city-life-nyingchi-overview', 'city-life-lhasa-valley', 'city-life-ngari-geography'],
    bridge: '高差与水源是条件；把三地仍留在地图上，看道路、供水设施和水渠怎样让这些条件进入生活。',
    scope: '地面来自同一公开高程网格；读数是网格采样，不是城市平均海拔或地面测量。三地统一夸张倍率，不能由影像颜色推算高程或雨量。',
  }),
  comparisonStage({
    id: 'mobility', title: '山谷不是一条自动连通的道路',
    question: '把三地放在同一张地形上，通行需要面对哪些高差？',
    beats: [
      {
        at: 0, title: '林芝：谷地之间仍要面对山岭',
        text: '2022年文旅资料记述从林芝经色季拉山至鲁朗。金色试线随真实地形起伏，白线连接相同端点作参照，说明谷地之间仍有越岭高差；试线不是G318。',
        narration: '先看林芝周围的通行试线。白线只连接起点和终点，金线贴着真实高程，山岭带来的起伏就显出来了。林芝到鲁朗也要面对山地阻隔；这里演示高差，不把试线当成三一八国道。',
      },
      {
        at: .34, title: '拉萨：较缓的谷地与两侧山坡',
        text: '比较同一地面上的试线：距离短不等于地面平缓，谷地提供较缓空间，跨向山坡仍会增加高差。试线不包括地质、桥隧、用地等真实选线条件。',
        narration: '地图不换，接着看拉萨河谷。谷地相对平缓，跨向两侧山坡又会升高。试线让我们比较地面的起伏；真实道路还要考虑地质、桥隧和维护，不能只凭这条线选路。',
      },
      {
        at: .68, title: '阿里：盆地内通行与跨山联系分开看',
        text: '狮泉河周围的盆地只是阿里的一处地方。盆地内的相对平缓与跨地区面对的山地，需要分别认识；短试线不能代表整个阿里的交通难度。',
        narration: '再看西部的狮泉河。盆地里可以找到相对平缓的地面，走向周围高地又会改变通行条件。阿里还有湖盆和峡谷，不能用驻地周围这一条试线概括整个地区。',
      },
    ],
    cityNotes: {
      nyingchi: '高山深谷相邻，地方之间的往来要面对越岭问题。',
      lhasa: '较缓谷地提供空间，跨向两侧山坡仍有高差。',
      ngari: '盆地内与跨山联系分开看，驻地不能代表全地区。',
    },
    sourceIds: ['comparison-terrain-grid', 'city-life-sejila-route-2022', 'city-life-lulang-2016', 'city-life-lhasa-valley', 'city-life-ngari-geography'],
    bridge: '能抵达一个地方，还需要能取用的水。保持这张地形地图，继续追踪水往哪里去、怎样被使用。',
    scope: '白线与金线为相同端点的地形教学对照，不是实际道路或工程选线。粗网格只解释区域坡谷条件，不提供通行时间、坡度设计或道路安全判断。',
  }),
  comparisonStage({
    id: 'water', title: '水往低处走，城市用水还需要人的工作',
    question: '地表有水以后，三地怎样把水变成可以使用的条件？',
    beats: [
      { at: 0, title: '林芝：先看地表去向，再问怎样取用',
        text: '青色流点沿采样坡面下降，在局部低处停留。它解释重力作用下的地表去向；藏东南的水汽背景不能直接告诉我们每个聚落的取水方式。',
        narration: '仍看同一片地形。林芝附近的青色流点沿坡面下降，遇到局部低处便停下来。有水汽和地表水，还不能直接说明居民怎样取水；这段先分清水往哪里去，与人能否使用水。' },
      { at: .34, title: '拉萨：地下水要经过取供水设施',
        text: '2022年规划说当时中心城区主要使用地下水。取水提升是原理示意；关闭取用与管护后，水源条件仍保留，城市服务不会自动发生。',
        narration: '接着看拉萨的取水原理。二〇二二年规划说明，当时中心城区主要使用地下水。演示中的水向上提升，再进入取供水环节；关闭取用条件，水源仍在，却不等于已经服务居民。' },
      { at: .68, title: '阿里：伦珠的闸口操作与冬灌',
        text: '2023年狮泉河盆地报道记录护林员伦珠操作挡水板和闸口引水冬灌。对照闸控是否参与，理解自然水与按需取用之间的区别。',
        narration: '狮泉河盆地的例子是冬灌。二〇二三年报道记载护林员伦珠操作挡水板和闸口，把水引向林地。切换取用与管护，水源不变，引水过程却不同；示意没有还原当地水渠的位置和形状。' },
    ],
    cityNotes: { nyingchi: '沿真实坡面看下降；没有据此断言聚落使用哪种水源。', lhasa: '2022年材料中的地下水供水背景；提升与取供水为原理示意。', ngari: '2023年狮泉河冬灌案例；闸控与管护让水按需要被使用。' },
    sourceIds: ['comparison-terrain-grid', 'city-life-southeast-moisture', 'city-life-lhasa-water-2022', 'city-life-ngari-water-2023'],
    bridge: '通行与用水都离不开地形，却不由地形自动完成。接着看城市和聚落可以利用怎样的空间。',
    scope: '坡面下降由高程采样决定，不是完整水文模型或实测河网；取水、提升和闸控为原理示意，不是地下含水层、水井、管网或灌区测绘。关闭条件不是当地停水或渠系损坏的报告。',
  }),
  comparisonStage({
    id: 'settlement', title: '城市空间有地形条件，也有历史选择',
    question: '为什么城市常利用谷地，又为什么不能仅凭地形解释城市？',
    beats: [
      { at: 0, title: '林芝：山谷中的较缓空间',
        text: '绿色读低缓地形，赭色叠加2021年林芝城区参考窗口的建成地表比例。两层说明不同问题；这份城区窗口不覆盖鲁朗，不能拿来解释鲁朗小镇的范围。',
        narration: '把通行和用水的问题留在心里。林芝周围绿色的较缓空间被山地分开，赭色叠加二〇二一年建成地表分类。它包括建筑和道路，提供有年份的观测，不能把绿色地面直接当作城市。' },
      { at: .34, title: '拉萨：河谷提供空间，历史塑造用途',
        text: '把2021年建成地表与河谷地形叠看，再切回仅看地形。两者有空间联系，但城市为何形成不同用途，还需读大昭寺与布达拉宫的历史材料。',
        narration: '拉萨把河谷地形与有年份的建成地表叠在一起看。谷地提供空间，城市怎样使用它还要看历史。大昭寺与布达拉宫属于不同建设时期，接下来用具体人物和材料解释。' },
      { at: .68, title: '阿里：驻地盆地与札达历史分别定位',
        text: '狮泉河的盆地空间不代表整个阿里，札达托林是另一处历史地方。接下来保留三地整图，从林芝的保护、课堂与服务空间开始，再比较拉萨建设和阿里不同地方的历史用途。',
        narration: '阿里的狮泉河盆地也有相对低缓的地面，但绿色范围不是城市边界。札达托林是另一处历史地方。接下来保留三地整体，从林芝读人的行动，再比较拉萨与阿里的空间用途。' },
    ],
    cityNotes: { nyingchi: '山地之间的空间与鲁朗2016年建设，分开看自然条件和人的行动。', lhasa: '河谷承载城市；大昭寺、白宫与红宫的不同年代解释空间用途。', ngari: '狮泉河是生活案例；札达、托林是另一个有独立材料的历史入口。' },
    sourceIds: ['comparison-terrain-grid', 'comparison-built-2021', 'city-life-nyingchi-overview', 'city-life-lulang-2016', 'city-life-lhasa-valley', 'city-life-lhasa-heritage', 'city-life-potala-research', 'city-life-ngari-geography', 'city-life-tibet-india'],
    bridge: '继续保留这张地图，把可利用的空间接到人的选择：工布传习、拉萨历次建设与托林交流，各有具体人物和年代。',
    scope: '绿色为各窗口内部的相对低缓地形，阈值依各自样本计算，不能跨城比较建设适宜程度。赭色为ESA WorldCover 2021 v200类50原始像元在0.003度格内的比例，包含道路等人工地表；仅3个0.396度窗口，分类可能出错。它不是今天的城区、街区、建筑轮廓或用地规划，也不由自然环境决定文化。',
  }),
  ...cityContinuityStages,
];

const usedSourceIds = new Set(cityComparisonStages.flatMap(stage => stage.sourceIds));

const comparisonSourceRecords: { id: string; title: string; url: string; note: string }[] = [
  ...cityContinuitySources,
  {id:'comparison-built-2021', title:'ESA WorldCover 2021 v200 · 三城建成地表分类',url:'https://esa-worldcover.org/en/data-access',note:'2021年10米遥感分类，原class50像元按36×36汇总为0.003度格内比例，未膨胀或生成建筑。仅林芝城区、拉萨、狮泉河三个0.396度窗口，非行政边界、当前城界或建设适宜性；建成类别包括建筑、道路等人工地表，分类可能出错。CC BY 4.0，出处和处理方法随数据归档。'},
  ...cityLifeSources.filter(source => usedSourceIds.has(source.id)),
  ...plateauClimateSources.filter(source => usedSourceIds.has(source.id)),
  {
    id: 'comparison-terrain-grid', title: 'Mapzen / Tilezen · 三地共用的公开高程网格',
    url: 'https://registry.opendata.aws/terrain-tiles/',
    note: '三地复用本地tibet-regional-dem公开高程网格，原始高程单位为米，并使用同一显示倍率。粗网格采样不是城区平均高程、建筑测绘或精确河谷剖面；本说明不复用其他场景的夸张倍率。',
  },
];

export const cityComparisonSources = [...new Map(comparisonSourceRecords.map(source => [source.id, source])).values()];

export function getCityComparisonStage(id: CityComparisonStageId): CityComparisonStage {
  return cityComparisonStages.find(stage => stage.id === id)!;
}

export const cityComparisonNarrationCues = cityComparisonStages.flatMap(stage => stage.id==='development'?cityAccessNarrationCues:isCityContinuityLessonStage(stage.id)?cityContinuityNarrationCues.filter(cue=>cue.stepId===`COMPARE-${stage.id}`):stage.beats.map((beat, index) => ({
  id: `COMPARE-${stage.id}-${index + 1}`,
  title: beat.title,
  narration: beat.narration,
  stepId: `COMPARE-${stage.id}`,
  chapterId: 'comparison',
})));
