import { chapters } from './curriculum';
import { learningStepIds } from './learningOrder';
import type { SceneSettings } from '../lib/store';

export type CueRole = 'opening' | 'explain' | 'observe' | 'bridge';
export type JourneySegmentId = 'earth-to-place' | 'people-and-culture' | 'connections-and-change' | 'continue-exploring';
export interface JourneyInteraction {
  kind: 'view' | 'season' | 'layer' | 'progress' | 'selection' | 'cutaway' | 'condition' | 'comparison' | 'record' | 'route';
  instruction: string;
  success: string;
  /** A user action target, rather than a state applied on entering the cue. */
  target?: Partial<SceneSettings>;
}
export interface JourneyCue {
  id: string;
  role: CueRole;
  title: string;
  narration: string;
  settings: Partial<SceneSettings>;
  motion?: { field: 'progress'; from: number; to: number; durationMs: number; startAt?:number;via?:{at:number;value:number}[] };
  keyframes?: { at: number; settings: Partial<SceneSettings> }[];
  interaction?: JourneyInteraction;
}
export interface JourneyTransition {
  fromScale: string;
  toScale: string;
  fromTime: string;
  toTime: string;
  reason: string;
}
export interface JourneyStep {
  stepId: string;
  chapterId: string;
  segmentId: JourneySegmentId;
  location: string;
  scale: string;
  timeContext: string;
  cues: JourneyCue[];
  nextStepId: string | null;
  transition: JourneyTransition | null;
}
export interface JourneySegment {
  id: JourneySegmentId;
  number: number;
  title: string;
  question: string;
  introduction: string;
  chapterIds: string[];
  entryStepId: string;
  exitStepId: string;
  summary: string;
  nextReason: string;
}
export interface ChapterSummary {
  chapterId: string;
  title: string;
  narration: string;
  learned: string[];
  sourceStepIds: string[];
  nextStepId: string | null;
  nextReason: string;
}

export const journeySegments: JourneySegment[] = [
  { id: 'earth-to-place', number: 1, title: '从地球走进西藏', question: '这里的位置，怎样参与形成环境与景观？', introduction: '先在地球上找到方向，再逐层认识阳光、空气、水与地形怎样共同运转。最后走进不同地区与具体景观，把宏观原理落到可观察的地方。', chapterIds: ['position', 'climate', 'regions', 'landscapes'], entryStepId: 'G1', exitStepId: 'P3', summary: '西藏的环境来自不同尺度、不同时间的过程共同作用。纬度提供热量背景，高度与起伏影响空气、水和通行；各地区的条件组合不同，山川还承载着人的生活。', nextReason: '已经看见生活的水源、土地与通道，接下来要用人的行动和留下的材料，解释这里怎样形成社会与历史。' },
  { id: 'people-and-culture', number: 2, title: '从人的实践走进历史', question: '人怎样生活与创造，这些实践又怎样走到今天？', introduction: '先沿河谷聚落走近建筑、信仰、作品与日常，认识使用空间的人。再带着文化中的具体问题回看人群活动、历史全貌、会盟碑与制度变化，把人物、年代、材料和地方相互联系。', chapterIds: ['culture', 'history'], entryStepId: 'K1', exitStepId: 'H4', summary: '自然提供条件，社会与文化由具体人群的行动持续形成。先看人的生活、交流与创造，再用考古、文字和建筑材料研究它们的历史变化；文化不是气候的直接结果，历史解释需要年代与证据。', nextReason: '地方生活与历史始终连着更大范围。接下来沿水系、通道和交流关系拉远，认识周边联系与当代变化。' },
  { id: 'connections-and-change', number: 3, title: '把地方放回更大联系', question: '西藏怎样联系周边，并持续发生变化？', introduction: '先沿流域和通道理解跨区域联系，再把战略意义落到具体议题。通过交通、城乡生活与保护行动，辨认当代变化影响谁、在什么条件下发生。', chapterIds: ['connections', 'modern'], entryStepId: 'R1', exitStepId: 'M3', summary: '地方价值来自真实的生态、交通、文化和治理关系。基础设施带来新的可能，实际影响还取决于服务、需求与人的选择；发展和保护都需要解释对象、条件与长期维护。', nextReason: '理解这些关系以后，可以把感兴趣的问题落到地点，形成能够保存、修改和继续深入的探索计划。' },
  { id: 'continue-exploring', number: 4, title: '带着理解继续探索', question: '接下来想看什么，怎样让每一站都有认识目的？', introduction: '回看自己的关注，把地点连成主题路线，再补充日期、交通和需要核实的条件。保存的不只是站点，而是每站的问题、前后联系与可以继续的知识入口。', chapterIds: ['travel'], entryStepId: 'T1', exitStepId: 'T3', summary: '完整认识给探索建立方向。一个问题可以连接不同地区，一个地方也可以连接自然、历史与文化；保存计划与观察记录，让下一次打开产品时继续推进同一条认识线。', nextReason: '从自己的计划返回对应章节，或带着观察问题走向现场；新的见闻再接回原来的解释与资料。' },
];

type CueInput = Omit<JourneyCue, 'id' | 'role'> & {role?:CueRole};
type StepInput = { location: string; scale: string; timeContext: string; cues: CueInput[] };
const roles: CueRole[] = ['opening', 'explain', 'observe', 'bridge'];
const interaction = (kind: JourneyInteraction['kind'], instruction: string, success: string, target?: Partial<SceneSettings>): JourneyInteraction => ({ kind, instruction, success, ...(target ? { target } : {}) });
const motion = (from: number, to: number): NonNullable<JourneyCue['motion']> => ({ field: 'progress', from, to, durationMs: 16000 });

/** Narration refers to the current real scene's objects; no cue claims a surveyed or historical reconstruction. */
const scripts: Record<string, StepInput> = {
  G1: { location: '完整地球 · 海陆与大气 · 三地对照', scale: '全球环境与地区差异', timeContext: '一般气候背景 · 概念过程', cues: [
    { title: '先认清地球上有什么', narration: '先看整个地球。蓝色海洋储存水和热量，陆地上有高山、平原和河流。空气包围地表；寒冷处能留下冰雪，适合的水热条件支持植物生长。它们彼此相连：水会蒸发进入空气，空气又把热和水带到别处。先认清这些对象，再看这个整体怎样运行。', settings: { layer: 'earth-system', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '同一束阳光，为什么有冷暖差别', narration: '看两束同样宽的阳光落在球面上。照得较直时，能量落在较小面积；照得斜时，同一束能量分散得更开。全年平均看，低纬得到的太阳能较多，高纬较少。这建立了冷暖背景，但当地多热，还要看海陆怎样存热，以及空气和水怎样把热搬走。', settings: { layer: 'earth-heating', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '空气为什么流动，又带着什么走', narration: '地表受热不均，参与形成气压差，空气便在气压差推动下流动。看上升、向外输送、下沉与返回怎样连起来；地球自转还使运动方向偏转。空气同时搬运热量与水汽：水从地表蒸发，随风移动，湿空气上升冷却时才可能成云。这是大尺度平均关系。', settings: { layer: 'earth-circulation', selected: '', progress: 0 }, motion: motion(0, 1), interaction: interaction('progress', '回拖过程，先辨认空气怎样走，再看它怎样联系热量与水分。', '已经把空气运动与热量、水汽输送连起来。') },
    { title: '把三种地方放在一起，才看得出原因', narration: '先看赤道附近的刚果盆地。热与水共同支持森林，湿空气上升时容易成云。再看撒哈拉：这里阳光也充足，但副热带下沉空气不利于云雨，地表干旱。最后看青藏高原：它并不在极地，高海拔却使环境常比邻近低地寒冷，山系还改变空气来路。接下来带着这些差别，到亚洲找到西藏。', settings: { layer: 'earth-contrasts', selected: 'compare-equator', progress: 0 }, motion: motion(0, 1), keyframes: [{ at: .36, settings: { selected: 'compare-desert' } }, { at: .72, settings: { selected: 'compare-plateau' } }] },
  ] },
  G2: { location: '地球 · 亚洲 · 中国 · 西藏与周边', scale: '从全球关系到亚洲高地', timeContext: '今天的地理位置 · 季节来路背景', cues: [
    { title: '把整个地球的认识，带到西藏', narration: '现在知道地方差异需要看阳光、空气、水和地形。我们仍从完整地球出发，先找到亚洲这个洲，再找到中国这个国家，最后沿中国西南找到西藏自治区。拉萨只是其中一座城市。逐层靠近时，海洋与大陆仍留在周围，让目标始终有来路。', settings: { layer: 'globe', selected: '', progress: 0 }, keyframes: [{ at: .2, settings: { layer: 'asia', selected: 'asia' } }, { at: .45, settings: { layer: 'china', selected: 'china' } }, { at: .72, settings: { layer: 'tibet', selected: 'tibet' } }] },
    { title: '水汽来自远处，还要经过山地', narration: '从西藏向南看，依次是喜马拉雅、南亚陆地和印度洋。海洋的水蒸发进入空气，夏季环流能把部分水汽带向藏东南；西侧来流也可能携带水汽。途中山系让空气抬升或绕行，谷地又提供通道。所以，西藏的环境不能只从边界以内寻找原因。', settings: { layer: 'surroundings', selected: '', progress: 0 }, motion: motion(0, 1), keyframes: [{ at: .35, settings: { layer: 'moisture', selected: '' } }] },
    { title: '纬度相近，站得高低仍会改变环境', narration: '西藏在赤道以北，属于北温带的纬度范围。但北温带不代表处处温和：同样的纬度背景下，高地常比邻近低地冷。现在把目光从纬线转向青藏高原，看南侧低地与高地的相邻位置。空气来到这里，还要面对地面高度和山系排列的变化。', settings: { layer: 'latitude', selected: '', progress: 0 }, keyframes: [{ at: .2, settings: { layer: 'zones', selected: '' } }, { at: .58, settings: { layer: 'plateau', selected: 'plateau' } }], interaction: interaction('view', '在纬度背景和高原范围之间对照，找到高地南侧的陆地与海洋。', '已经把纬度背景与高地所在的位置分开认识。') },
    { title: '看清是哪一片高地，再问它怎样形成', narration: '青藏高原是跨越行政范围的自然高地，西藏自治区是今天的行政范围，两者不能画上等号。我们已经知道这片高地处在怎样的海陆和空气来路中。接下来追问：地面为什么会这样高？再回到真实高程，把南侧低地、喜马拉雅和高原内部放在同一个剖面里比较。', settings: { layer: 'plateau', selected: 'plateau' } },
  ] },
  G3: { location: '亚洲高地 · 地壳剖面示意', scale: '大陆与地壳剖面', timeContext: '漫长地质过程 · 无对应测年', cues: [
    { title: '从今天地形回看形成过程', narration: '上一幅地球告诉我们高原在哪里，现在要问它怎样形成。这里把空间转成地壳剖面，用概念过程观察印度板块与欧亚板块的相向运动。画面进度表示解释阶段，不能当成真实地质年份。', settings: { layer: 'plates', progress: 0, cutaway: true } },
    { title: '变形、增厚与抬升', narration: '相向运动使一些地壳缩短、变形并增厚，地表也会改变。高原各部分经历不同的形成阶段，山地抬升时侵蚀仍在进行。请沿剖面看层次怎样弯曲，把这个过程与一次简单的整体升高区别开。', settings: { layer: 'crust', progress: 0, selected: '', cutaway: true }, motion: motion(0, .8) },
    { title: '从侧面读剖面', narration: '现在可以拖动过程进度，并从侧面观察地层与板块。先看相向运动，再看变形与地表起伏。这个模型帮助辨认关系，具体地区什么时候抬升、抬升多少，仍需要岩石、年代和地质研究来回答。', settings: { layer: 'crust', progress: .8, selected: '', cutaway: true }, interaction: interaction('progress', '把过程退到起点，再推进到后段，从侧面比较剖面。', '已经区分板块运动、地壳增厚与地表变化。', { progress: 1 }) },
    { title: '回到今天的高原内部', narration: '地质过程留下了高地，却没有把地面做成一块平板。接下来结束地质时间的观察，回到今天的山脊、盆地和河谷。它们的高度、起伏与方向，将参与影响空气、水和人们的通行。', settings: { layer: 'surface', progress: 1, selected: '', cutaway: false } },
  ] },
  G4: { location: '西藏 · 山系与河谷概览', scale: '高原内部', timeContext: '今天的地形关系', cues: [
    { title: '把低地、山系与高原放在同一张图里', narration: '从形成过程回到今天，先把整片地形留在眼前。南侧低地、喜马拉雅和更北的高原内部，是连续的地面。只看一座山，难以感觉这片地方究竟有多高；接下来沿同一条南北线，从低地走过山系，再进入高原内部，用共同的海平面基准比较。', settings: { layer: 'terrain', selected: '', progress: .5, readingFraction: (26-25)/13, cutaway: false } },
    { title: '走过山系以后，地面为什么仍然这么高', narration: '从南侧低地开始，这个样点只有约五十米。沿同一条线向北，穿过喜马拉雅，较高样点约五千三百米。继续走进高原内部，所选样点仍接近五千米。你看到的不是一座山峰独自高起，而是内部也维持很高的地面。读数来自同一份高程网格，立体显示把高差作了夸张。', settings: { layer: 'relief', selected: '', progress: .5, readingFraction: (26-25)/13, cutaway: false }, keyframes: [{ at: .2, settings: { readingFraction: (28.046875-25)/13 } }, { at: .43, settings: { readingFraction: (33-25)/13 } }] },
    { title: '带着周边方向读一段山谷', narration: '可以移动南北剖面的位置，再转动地形比较山脊、坡面与较低处。展开剖切时，切面表示地形高程，不是地下岩层。保留南侧海洋与高原内部的方向，继续问：空气和水来到这里可能遇到什么？', settings: { layer: 'relief', selected: '', progress: .5, readingFraction:(33-25)/13, cutaway: true }, interaction: interaction('progress', '移动南北剖面的经度，比较山系、高原内部与谷地的高差。', '已经把周边方向与不同位置的地形高差接在一起。') },
    { title: '把真实高差带回空气与水的来路', narration: '现在已经比较过低地、山系和高原内部的真实高差。接下来保留地球与亚洲的整体背景，跟随气流靠近同一片高原，看山地怎样参与抬升、冷却和云雨形成。再比较林芝、拉萨和阿里的条件，把认识接到城市、水源与生活。', settings: { layer: 'terrain', selected: '', cutaway: false } },
  ] },
  C1: { location: '地球 · 拉萨纬度参照', scale: '地球与太阳照射', timeContext: '一年四季 · 理想太阳几何', cues: [
    { title: '已有了地方背景，现在解释影响', narration: '刚才已经认识西藏的位置、外部联系与地形背景。现在沿这些问题解释影响怎样发生，而不是重新走一遍入口。先看同一地点为什么有冬夏照射变化：固定拉萨附近的位置，观察地球与太阳，再把这个解释接回高原环境。', settings: { layer: 'solar', season: 1, selected: 'lhasa' } },
    { title: '倾斜地轴与季节照射', narration: '地轴的倾斜，使一年中太阳照射方向和昼夜长短发生变化。夏至时，拉萨纬度的正午太阳更高、白昼更长；冬至则相反。侧边数值是太阳几何计算，真实气温还受地表、大气和热量输送影响。', settings: { layer: 'solar', season: 1, selected: 'lhasa' }, keyframes:[{at:.58,settings:{season:3}}] },
    { title: '在同一个地点切换冬夏', narration: '请切换到冬至，保留同一地点和观察角度，比较昼夜分界、照射方向与日长。这里的一年变化来自地球绕太阳运行的几何条件，不能由太阳更远或更近来简单解释，也不是多年变暖的时间线。', settings: { layer: 'solar', season: 1 }, interaction: interaction('season', '切换到“冬至”，比较同一地点的照射与日长。', '已经区分季节照射与实际气温。', { season: 3 }) },
    { title: '接收阳光后还发生什么', narration: '知道夏冬照射不同以后，还要问一个更基础的问题：地球不断接收阳光，为什么没有一直越晒越热？下一步回到地表与空气之间，看能量怎样进入、被储存和交换，又怎样离开。', settings: { layer: 'solar', season: 3 } },
  ] },
  C2: { location: '高原地表 · 能量交换示意', scale: '地表与大气', timeContext: '一般能量过程', cues: [
    { title: '从照射进入热量收支', narration: '刚才的季节比较说明照射条件，但温度还要看接收与散失。现在先沿金色路径看阳光来到地表与空气：一部分被反射，另一部分被吸收。画面逐层展开来源、经过的对象与去向，真实过程会同时进行。', settings: { layer: 'energy', progress: .18, selected: '', cutaway: false } },
    { title: '地表、大气与向外散失', narration: '吸收以后，地表储存状态改变，再通过长波、空气热交换和蒸发分配能量。大气参与吸收与发射，既向外，也向地表交换。沿新增路径认识收支；箭头宽度和储存颜色不表示真实通量或温度。', settings: { layer: 'energy', progress: .28, selected: '', cutaway: false }, motion: motion(.28, 1) },
    { title: '读清进入与离开的方向', narration: '可以把过程退到进入与反射，再展开吸收、储存和交换。从侧面辨认地表与空气，点击对象看它参与哪条路径。画面阶段用于逐层解释，并不代表这些过程轮流停止；认识温度，需要把它们放回共同收支。', settings: { layer: 'energy', progress: 1, selected: '', cutaway: true }, interaction: interaction('progress', '回拖到进入与反射，再推进过程，辨认地表、大气与向外的路径。', '已经用收支而非单一照射解释温度。') },
    { title: '高处为什么常常更冷', narration: '能量收支让我们知道温度不是阳光的简单复制。西藏还有一个突出的条件：高度。下一步保留地表与空气这个尺度，沿高差观察空气和温度的关系，也辨认哪些判断需要实际观测支持。', settings: { layer: 'exchange', progress: 1, selected: '', cutaway: false } },
  ] },
  C3: { location: '高原山坡 · 高度参照', scale: '地表与空气剖面', timeContext: '一般空气过程 · 无实测温度', cues: [
    { title: '高度带来怎样的变化', narration: '我们已经知道温度来自能量收支，现在沿山坡从低处走向高处。高海拔地方常有较低温度，但海拔并不是一个自动生成精确气温的数字。先辨认高度方向，再把同一空气团的上升与周围空气的状态分开。', settings: { layer: 'temperature', progress: 0, selected: '', cutaway: false }, motion:motion(0,.6) },
    { title: '上升空气与环境状态', narration: '空气上升进入较低气压环境，可以膨胀并冷却；周围空气的垂直温度分布，却是另一种需要观测的状态。云、湿度、地表和天气都会参与其中。画面用高度参照帮助理解，不提供某处今天的真实气温。', settings: { layer: 'parcel', progress: 0, selected: '', cutaway: false }, motion: motion(0, 1) },
    { title: '沿同一山坡观察高差', narration: '请转动山坡，比较较低处与较高处的位置，再切换到气流层，观察空气可以怎样沿地形移动。以后说一个地区更冷时，还应注明地点、日期和统计范围，不能只用一次山坡印象代替资料。', settings: { layer: 'temperature' }, interaction: interaction('layer', '从“高度与周围”切到“沿坡运动”，比较地形与空气移动。', '已经分开高度参照、空气过程与实际温度资料。', { layer: 'wind' }) },
    { title: '空气为什么移动到这里', narration: '上升空气把温度问题接到了空气运动。但空气从哪里来，为什么会有风，又怎样把水汽带到高原？下一步从局地高差退回季节与环流背景，先看风，再把风与它携带的水分区分。', settings: { layer: 'wind', progress: .8, selected: '' } },
  ] },
  C4: { location: '同一地球 · 亚洲来流 · 高原与城市', scale: '完整地球连续靠近真实高程', timeContext: '季节背景与云雨原理 · 非实况天气', cues: [
    { title: '从完整地球跟着来流进入亚洲', role:'opening', narration: '地球上的空气循环，来到亚洲后还会遇到海陆与季节的影响。保留印度洋和亚洲大陆，跟着镜头靠近高原。夏季南侧水汽联系较突出，西侧系统也能携带水汽。先记住来路，再看同一片真实地形怎样改变空气的运动。', settings:{layer:'arrival',season:1,progress:0,selected:'nyingchi',airMoisture:'higher',cutaway:false},motion:motion(0,1) },
    { title: '真实高差怎样参与改变空气运动', role:'explain', narration: '现在地球仍在脚下，眼前起伏来自公开高程。跟随藏东南方向的示意气团：靠近山坡，沿高差上升；进入较低气压环境后，气团膨胀并冷却。实际空气也可能绕行，不能把这一条解释路径当作所有来流。地形提供条件，水汽与空气状态还会改变结果。', settings:{layer:'uplift',progress:0,selected:'nyingchi',airMoisture:'higher'},motion:motion(0,1) },
    { title: '同一片地形上，从水汽走到云和雨', role:'explain', narration: '山体不变，再看水汽。起初气团带着气态水，抬升冷却后，满足条件才凝结成云滴。云滴继续增长，才可能有降水到达地面，随后水沿坡面向低处流动。暂停并改成较少水汽，比较同样抬升为什么没有相同的云雨；这段演示解释条件，不预测当地雨量。', settings:{layer:'cloud',progress:0,selected:'nyingchi',airMoisture:'higher'},motion:motion(0,1) },
    { title: '林芝、拉萨与阿里，差别来自条件组合', role:'observe', narration: '把镜头拉回同一高原，依次看林芝、拉萨和阿里的位置。藏东南的水汽联系、山地通道与较低河谷，和内部高地、西部地区的条件不同。拉萨的河谷位置也不等于整个行政区的环境。阿里仍会受到季风和西侧系统影响；不能用单一风向，给一个地区判定全年干湿。', settings:{layer:'regions',progress:0,selected:'nyingchi'},motion:motion(0,1),keyframes:[{at:.34,settings:{selected:'lhasa'}},{at:.66,settings:{selected:'ngari'}}],interaction:interaction('selection','选择拉萨，比较它与林芝、阿里的来路、高差和河谷条件，再核对地方材料。','已经在同一张地形上比较地区条件，而不是只记住干湿标签。',{selected:'lhasa'}) },
    { title: '保留城市位置，把环境接到生活', role:'bridge', narration: '现在保留所选城市或地区驻地的位置。环境让我们继续问：水源和可用土地在哪里，沿什么谷地通行，生活怎样适应季节？这些条件并不自动决定人的生活。进入城市图鉴，继续看实际地方的设施、组织、历史与选择，再把自然和人文联系起来。', settings:{layer:'life',progress:0},motion:motion(0,1) },
  ] },
  C5: { location: '山地 · 迎风坡与河谷', scale: '山坡与空气过程', timeContext: '云雨机制 · 非真实天气事件', cues: [
    { title: '输送之后，还缺哪些条件', narration: '上一步认识了空气如何携带水汽，现在走近山坡。湿润空气遇到地形时可能被抬升，但并非每次来流都会下雨。我们先从没有云雨的起点看起，逐步加入冷却、凝结和降落的条件。', settings: { layer: 'rain', progress: 0, airMoisture: 'higher', selected: '', cutaway: false } },
    { title: '从气流到云，再到降水', narration: '金色轮廓跟踪同一团空气，青点只是不可见水汽的符号。现在沿坡上升，进入较低气压环境，空气膨胀并冷却。继续冷却到合适条件，部分水汽凝结成白色云滴。成云以后还要增长，放大处能看到小滴合并；较大水滴才开始下落。水到地表以后，再沿坡汇流，部分进入土壤。', settings: { layer: 'rain', progress: 0, airMoisture: 'higher', selected: '', cutaway: false }, motion: motion(0, 1), keyframes:[{at:.84,settings:{layer:'water',cutaway:true}}] },
    { title: '同一山体，比较初始水汽条件', narration: '现在保持同一山体与后段进度，把初始水汽切到较少，再比较云滴与降水。空气仍会抬升，却在本设定里没有形成地面降水。可以回拖观察条件怎样接起来：有来流、有云，都不等于已经下雨。', settings: { layer: 'water', progress: 1, airMoisture: 'higher', selected: '' }, interaction: interaction('condition', '保持同一进度，将初始水汽切到“较少”，比较成云与降水结果。', '已经区分同一抬升过程与不同水汽条件产生的结果。', { airMoisture: 'lower' }) },
    { title: '原理怎样用于认识一次天气', narration: '这个过程说明山地如何参与云雨，却没有报告某日某处真实下了多少雨。下一步保留同一山地，转到一次天气的时间尺度，学习怎样阅读来流、云发展和降水的前后，避免把示意当成实况。', settings: { layer: 'water', progress: 1, airMoisture: 'higher', selected: '' } },
  ] },
  C6: { location: '同一山地 · 天气过程阅读', scale: '局地山地', timeContext: '短时天气过程 · 当前为概念示意', cues: [
    { title: '天气有它的发生时间', narration: '刚才认识云雨机制，现在换一种提问：一次天气在短时间里怎样改变？地形可以保持相同，空气与云雨状态却会变化。这里用同一山体的概念过程练习阅读顺序，真实事件还要有日期、地点与对应观测。', settings: { layer: 'rain', progress: .1, airMoisture: 'higher', selected: '' } },
    { title: '前后状态不一定同时出现', narration: '先看携水汽的空气到达，再沿坡上升，空气膨胀冷却。继续推进，满足凝结条件后才出现云滴。云滴增长以后才有降水，水到地表后再汇流或入渗。暂停、回拖会同时停住空气团、云滴、雨和文字；这里的先后是原理解释，没有当地实况钟点。', settings: { layer: 'rain', progress: .1 }, motion: motion(.1, .95), keyframes:[{at:.86,settings:{layer:'water',cutaway:true}}] },
    { title: '暂停在一个前后变化上', narration: '请把进度停在云开始出现的位置，再推到降水阶段，比较哪些对象改变了。当前进度只是解释顺序，没有钟点或观测年份。阅读真实天气时，应同时核对资料时间、变量和测量范围，才能把画面变成证据。', settings: { layer: 'rain', progress: .4 }, interaction: interaction('progress', '退回成云阶段，比较后再推进到降水后段。', '已经辨认一次过程的先后与资料时间的必要性。', { progress: .9 }) },
    { title: '从一次过程扩大到一年', narration: '一次天气告诉我们一个短时状态，不能代表全年。下一步仍固定一个地方，把时间扩大到春夏秋冬：照射、积雪与输送背景怎样重复改变？这样就能区分某次天气和季节规律这两种问题。', settings: { layer: 'rain', progress: .95 } },
  ] },
  C7: { location: '同一山地 · 季节比较', scale: '山地与河谷', timeContext: '一年季节循环 · 非逐日实况', cues: [
    { title: '同地一年，才看得到季节', narration: '现在从短时天气走向一年循环，保持同一地形和视角。夏季、冬季的照射和环流背景不同，积雪与生态也可能呈现季节变化。这里比较的是季节条件，不是把每一天的天气压缩成四张固定画面。', settings: { layer: 'season', season: 1, progress: .5 } },
    { title: '重复背景与当天状态', narration: '从夏至切到冬至，观察同一山地表面与照射背景的变化。不同海拔和坡向还会造成地方差异。季节为天气提供重复的背景，却不能保证某天一定下雪或无雨，具体日期仍要返回相应的天气资料。', settings: { layer: 'season', season: 3, progress: .5 } },
    { title: '固定地点，亲手比较冬夏', narration: '请切换回夏至，比较高处积雪与低处地表，再回看冬至状态。选择固定地点的目的，是避免把空间差别误认成时间变化。记录你看到的是季节示意，之后再用相同地点、相同口径的资料检验它。', settings: { layer: 'season', season: 3 }, interaction: interaction('season', '切换到“夏至”，比较同一地方的季节示意。', '已经区分一年循环与某日天气。', { season: 1 }) },
    { title: '一年循环以外，还有长期改变', narration: '春夏秋冬会重复出现，但气候的长期背景也可能改变。下一步离开一年循环，转到多年尺度：现代全球变暖为什么发生？我们先看能量扰动与系统响应，再学习如何读冰雪等对象的变化证据。', settings: { layer: 'season', season: 1 } },
  ] },
  C8: { location: '高原 · 长期驱动与响应示意', scale: '全球机制与高原对象', timeContext: '多年气候背景 · 概念驱动', cues: [
    { title: '时间变长，问题也改变', narration: '季节循环源于照射几何的重复变化，现在讨论的是多年气候背景。现代全球变暖主要与人类活动增加温室气体有关。我们先回到能量收支，理解系统为什么改变，再问高原上的冰雪、水与生态如何响应。', settings: { layer: 'forcing', season: 1, progress: .1 } },
    { title: '驱动与响应不是同一件事', narration: '温室气体改变地球向外散失能量的条件，系统需要调整到新的收支状态。冰雪、海洋和陆地各有不同响应时间，也存在反馈。眼前箭头用于理解能量关系，不能由这个动画直接读出某处冰川的变化量。', settings: { layer: 'forcing', progress: .1 }, motion: motion(.1, .8) },
    { title: '沿能量方向复述一遍', narration: '请从侧面辨认进入、向外与大气交换的方向，想一想哪一部分属于最初驱动，哪一部分属于后来的响应。把这两层分开，再去观察具体对象，才不会由一场暖天气就推断长期气候趋势。', settings: { layer: 'forcing', progress: .8 }, interaction: interaction('view', '观察能量交换方向，辨认驱动与响应；观察完成后继续。', '已经用多年能量背景理解长期变化。') },
    { title: '用什么证据判断变化', narration: '理解驱动机制以后，还需要具体资料认识地方变化。下一步在地图找到色林错，比较有年份的湖面面积研究记录。先核对对象、日期、单位与资料身份，再看两期数值的差异；原因仍需要独立证据。', settings: { layer: 'forcing', progress: .8 } },
  ] },
  C9: { location: '西藏 · 色林错研究区定位', scale: '整体地图到同一湖泊的面积记录', timeContext: '1976年与2017年6月 · 2019年发表研究汇总', cues: [
    { title: '先在整体地图找到色林错', narration: '先在西藏整体地图找到色林错，再读有年份的研究数值。朱立平等二〇一九年的研究总结报告：一九七六年湖面面积为一千六百六十七平方公里，二〇一七年为两千三百八十九平方公里。这里比较的是湖面面积。', settings: { layer: 'change', progress: 0 } },
    { title: '用共同零点比较两个已发表状态', narration: '两条柱形共用零点与平方公里单位，后一期报告面积更大。原文注明二〇一七年为六月，一九七六年在该段没有具体月日。这些是已发表研究的汇总数值，不是本产品处理原始影像所得，也不能补出中间年份。', settings: { layer: 'change', progress: 0 }, keyframes: [{ at: .52, settings: { progress: 1 } }] },
    { title: '亲手选择两期面积并核对原文', narration: '请先选择一九七六年，再选择二〇一七年，保留同一湖泊与相同单位，比较柱形和报告数值。然后打开研究原文核对日期与资料身份。湖面面积不等于湖水体积，这两个状态也不能单独证明原因或预测未来。', settings: { layer: 'change', progress: 0 }, interaction: interaction('progress', '先选择“1976年”，再选择“2017年”，比较同一零点的湖面面积柱形。', '已经把地点、年份、变量与已发表研究来源对应起来。', { progress: 1 }) },
    { title: '带着证据口径回到地区差异', narration: '这个案例让我们把地点、年份和研究数值放在一起，也看见证据支持到哪里。气候章节建立了热量、空气、水与时间的联系。接下来回到西藏内部，比较林芝、那曲和阿里等地方，继续追问条件怎样组合成不同环境。', settings: { layer: 'change', progress: 1 } },
  ] },
  E1: { location: '西藏 · 林芝、那曲与阿里', scale: '地区对照', timeContext: '今天的区域环境 · 概念表达', cues: [
    { title: '从共同机制看不同地方', narration: '前面认识了影响温度和降水的条件，现在用它们读地区差异。从藏东南的林芝进入，再看高原腹地的那曲与西部阿里。一个行政地区也有不同高度和坡面，因此先把名字与内部环境分开理解。', settings: { layer: 'terrain', selected: 'nyingchi', season: 1 } },
    { title: '把条件组合放回地形', narration: '高度、来流、水汽与山谷方向共同参与环境形成；它们的组合随地区改变。画面使用同一高程网格与城区定位点。地形可一起读，温度、降水和植被还需对应资料；一处谷地不能代替整个林芝。', settings: { layer: 'terrain', selected: 'nyingchi' } },
    { title: '切换地区，保留同一问题', narration: '请选择那曲，再回到林芝或阿里，保持地形观察层，比较它们的位置与地方介绍。问的仍是同一个问题：这里有哪些水热和地形条件？城区标记是地区入口，高程作了概览抽样，不能用一个点代表全域。', settings: { layer: 'terrain', selected: 'nyingchi' }, interaction: interaction('selection', '选择“那曲”，比较位置与地区介绍，再按需回看林芝。', '已经把共同原理落到不同地区的条件组合。', { selected: 'nagqu' }) },
    { title: '怎样让比较真正成立', narration: '看到差异以后，还要确认比较是否公平。下一步固定问题与观察主题，检查地点、时期和资料口径有没有变化。这样我们才能解释两地的不同，而不是让两张漂亮但条件不同的照片替我们下判断。', settings: { layer: 'terrain', selected: 'nagqu', compareRegion: 'nyingchi' } },
  ] },
  E2: { location: '西藏 · 同主题地区比较', scale: '地区对照', timeContext: '相同口径的比较问题 · 无实测年份', cues: [
    { title: '比较前先说清在比什么', narration: '刚才看到了地区不同，现在把问题收紧：如果要比较冷暖或水分，应先选同一种变量和适用时期。地图、照片与统计都有自己的范围。这里保留同一观察层，练习让地点改变，而问题不悄悄改变。', settings: { layer: 'terrain', selected: 'nagqu', season: 1 } },
    { title: '位置、年份与口径要对应', narration: '一个谷地的当天温度，不能直接和全地区多年平均相比；不同海拔地点，也要把高度说明。颜色表示网格海拔，没有气温或雨量。两地同时定位帮助读地形，地方材料帮助提出问题；可靠气候比较还需同口径资料。', settings: { layer: 'terrain', selected: 'nagqu', compareRegion: 'nyingchi' } },
    { title: '两地同时定位，保留同一问题', narration: '请保持地点甲为那曲，将地点乙从林芝改为阿里，仍在同一高程底图上比较。先读位置、山地与谷地，再用同样的问题阅读地方材料。气候数值需要来源、统计期和单位，不能由海拔配色直接算出。', settings: { layer: 'terrain', selected: 'nagqu', compareRegion: 'nyingchi' }, interaction: interaction('comparison', '把地点 B 改为“阿里”，保留地点 A、同一底图和相同问题。', '已经在同一范围中比较两个地方及其资料口径。', { compareRegion: 'ngari' }) },
    { title: '环境还会怎样进入生活', narration: '地区比较不只是自然知识，也为理解生活建立条件。下一步沿水源、平缓土地和通道寻找聚落：这些地方给人提供哪些可能？人的技术、组织和历史选择又怎样改变可能，不能由气候直接推算文化。', settings: { layer: 'locations', selected: 'lhasa' } },
  ] },
  E3: { location: '地区背景 · 生活条件对照', scale: '河谷与高地设定到生活空间', timeContext: '教学条件 · 非历史村落复原', cues: [
    { title: '从水与地形走到使用条件', narration: '刚才已经比较真实地形与地区材料。现在把生活条件单独展开：同一个概念场地里，有水路、较缓地面和坡地。它们提供机会与限制，还没有决定房屋怎么建、生产怎样组织。模型不是山南或任何真实村落。', settings: { layer: 'terrain', selected: '', progress: 0, livingSetting: 'valley', communitySupport: 'individual' } },
    { title: '水源怎样接到工作与生活', narration: '沿同一坡面看取水。人物先在水源旁把容器装水，再带着水走向用水处；水没有自行流向高处。走到以后，抬起容器，把水倒进储水构件，携带的水减少，储水增加。山坡和水源都保持原样，设施、劳动和组织把自然条件接到生活。真实地方还要核对季节、水质、土壤和使用权利。', settings: { layer: 'water', selected: '', progress: .28 }, motion: {...motion(.28,1),via:[{at:.16,value:.4},{at:.42,value:.72},{at:.68,value:.94}]},keyframes:[{at:0,settings:{selected:'living-water'}},{at:.18,settings:{selected:'living-access'}},{at:.44,settings:{selected:'living-houses'}}] },
    { title: '固定自然条件，只改变组织', narration: '请保留河谷条件，把分别使用改为共同组织。看山坡、水源有没有变，取水点、共用通行和储水构件又怎样改变。这个对照不评判哪种组织一定更好，也不表示真实社区采用了这些安排，而是说明相同环境仍有人可以选择和协作的空间。', settings: { layer: 'settlements', selected: '', progress: 1, communitySupport: 'individual' }, interaction: interaction('condition', '固定环境，切换“共同组织”，比较自然条件与设施使用。', '已经把环境约束与人的组织选择分开。', { communitySupport: 'shared' }) },
    { title: '把生活问题带回真实山川', narration: '条件模型让我们看见了自然与人的行动怎样接续，但还不能代替具体地方。下一步回到真实高程，沿山脊、河谷和较低处建立景观来路，再看地表过程怎样留下可被使用的空间。', settings: { layer: 'settlements', progress: 1 } },
  ] },
  P1: { location: '林芝城区周边 · 公开高程', scale: '整体地形到同坐标局部', timeContext: '地区概览与约0.4公里显示网格 · 高度×2', cues: [
    { title: '先在整片高原上找到林芝', narration: '从河谷生活的条件回到真实地形，先在西藏与周边找到林芝。金色框标出局部数据范围；外面仍保留整体山系。接下来靠近同一坐标中的山地与低处，约四百米的显示采样会更细，但这不是测绘精度，也没有自动得到河网或道路。', settings: { layer: 'terrain', selected: '', progress: .12, cutaway: false } },
    { title: '同一坐标靠近，再移动剖面', narration: '镜头沿金色数据窗口靠近林芝周边，较密的高程网格显出山地起伏。颜色代表海拔，高度统一放大两倍。继续进入南北剖面，切线向东西移动，较高处和较低处随网格重新计算。它们是这条线上读到的样本，不是命名山峰的峰顶测量，也不是完整河流。', settings: { layer: 'terrain', selected: '', progress: 0, cutaway: false }, motion: motion(0, 1) },
    { title: '换一条切线，看起伏怎样组合', narration: '请移动高程切线，再转动视野，比较同一方向上的高低组合。可以展开高程切面，但不要把它当作地下地层。城区点只帮助定位，局部山地也不能代表整个林芝地区。把方向、范围和数据口径保留下来，近看才不会失去来路。', settings: { layer: 'terrain', selected: '', progress: .86, cutaway: false }, interaction: interaction('progress', '移动南北高程切线，对照较高与较低样本。', '已经在同一方向与基准下比较局部高差。') },
    { title: '高程给出形态，形成还需要原因', narration: '公开高程说明今天哪里高、哪里低；为什么形成这些起伏，还需要地质与年代材料。下面会明确换成概念河谷，解释汇水、侵蚀、搬运和堆积。真实地点与一般原理互相核对，而不是把一段动画当成林芝或札达的地貌历史。', settings: { layer: 'terrain', selected: '', cutaway: false, progress: .86 } },
  ] },
  P2: { location: '地貌原理 · 同一概念河谷', scale: '坡面、河道与低处堆积', timeContext: '解释阶段 · 无实测年表', cues: [
    { title: '固定轮廓，先找高低关系', narration: '刚才用真实高程看了山地与谷地。现在用同一概念河谷拆开形成过程：先找坡面、河道和较低处，保留它们的相对位置。模型不对应某条真实峡谷，也没有设置侵蚀米数或形成年份。', settings: { layer: 'terrain', selected: '', progress: 0 } },
    { title: '水、物质和地表一起变化', narration: '沿水路看物质进入河道并向下移动，同时比较谷地局部下切。继续推进，一部分物质在较低处堆积，地表出现更平缓的空间。移动的水、被搬运的物质和改变的地形是三个对象；粒子数量不表示真实流量或含沙量。', settings: { layer: 'sediment', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '回拖，检查轮廓与材料的位置', narration: '请把过程退回初始地形，再推进到堆积阶段，分别观察水路、河谷轮廓和物质位置。相似外形可以有不同来历，具体地方还需要岩石、测绘与年代证据；不能把这个动画的速度当成真实侵蚀速率。', settings: { layer: 'sediment', selected: '', progress: 1 }, interaction: interaction('progress', '退回“初始地形”，再比较侵蚀和堆积。', '已经把形态、过程与地方证据分开。', { progress: 0 }) },
    { title: '自然过程留下空间，人继续使用它', narration: '汇水、侵蚀与堆积帮助解释自然空间，但不会自动解释聚落名字、信仰或地方记忆。下一步回到生活场地，看人怎样取用、协作和记录，再从这些问题走近建筑与文化。', settings: { layer: 'sediment', progress: 1 } },
  ] },
  P3: { location: '地方背景 · 生活与记忆入口', scale: '水土条件到人的空间实践', timeContext: '条件与历史材料分别阅读', cues: [
    { title: '同一片山川，进入人的使用', narration: '地表过程留下了可以继续研究的条件。现在保留水、坡地与缓地，逐步加入人的取用和生活联系。场景不是某个真实村落；山南等地区材料在旁边提供具体入口，不能拿模型替地方的人编造历史。', settings: { layer: 'terrain', progress: 0, selected: '', livingSetting: 'valley', communitySupport: 'shared' } },
    { title: '使用空间，也在组织人与人', narration: '先在水源旁取水，再沿通行段把水带到生活空间，最后倒入储水容器。水怎样可被使用，离不开设施、劳动与安排。可以保持同一地形，改换分别使用和共同组织；模型不会替组织方式评分。地名、故事与信仰的意义，还需要具体参与者、年代和材料解释。', settings: { layer: 'settlements', progress: .28 }, motion: {...motion(.28,1),via:[{at:.16,value:.4},{at:.42,value:.72},{at:.68,value:.94}]},keyframes:[{at:0,settings:{selected:'living-water'}},{at:.18,settings:{selected:'living-access'}},{at:.44,settings:{selected:'living-houses'}}] },
    { title: '从空白记录处提出文化问题', narration: '请选择地方记忆的记录桌。空白载体提醒我们：模型没有替社区写下故事。可以继续问谁在使用空间、怎样建造、怎样学习和维护，再对照真实材料。下一段先从院落与厅堂的构造和使用关系看起。', settings: { layer: 'settlements', selected: '', progress: 1 }, interaction: interaction('selection', '选择“地方记忆”，区分模型中的使用关系与需要材料的解释。', '已经从生活条件提出具体文化问题。', { selected: 'living-memory' }) },
    { title: '把人的行动带进建筑与文化', narration: '环境解释了部分机会与限制，文化还要看人的创造、交流和历史选择。接下来在同一院落里，从基底、墙体到梁柱与屋顶，再到人的通行、学习和维护，逐段认识空间怎样进入生活。', settings: { layer: 'settlements', progress: 1 } },
  ] },
  H1: { location: '尼阿底与农业研究 · 材料对照', scale: '发现情境到结论范围', timeContext: '史前活动与全年生活分别核对', cues: [
    { title: '先把发现放回情境', narration: '刚才从文化实践提出了历史问题，现在先拆开考古证据。模型的层次、器物和记录只说明怎样建立关联，不复原尼阿底的真实剖面。研究需要发现位置、层位、样本与年代，不能只凭一件物体讲出整个人群的历史。', settings: { layer: 'activity', selected: 'prehistoric', progress: 0 } },
    { title: '材料、年代与结论怎样接续', narration: '打开情境，再把器物与研究记录关联。尼阿底二零一八年研究支持约四万至三万年前的高海拔活动；活动不自动等于全年定居。另一项农业研究讨论高原东北部特定时期的全年生活，地域、样本和结论不能混在一起。', settings: { layer: 'activity', selected: 'prehistoric', progress: 0 }, motion: motion(0, 1) },
    { title: '改变问题，检查证据是否足够', narration: '请把问题切到全年定居，或现代族群来源，再对照研究材料能支持与不能支持的内容。看见活动证据，并不能直接回答所有后续问题。灰色材料位提示仍需核查，不是模型替历史补出的一段空白。', settings: { layer: 'activity', selected: 'prehistoric', progress: 1 }, interaction: interaction('layer', '切到“全年定居？”，对照证据与结论范围。', '已经把活动、定居与族群问题分开。', { layer: 'settlement' }) },
    { title: '证据进入历史前后，仍有不同变化', narration: '材料让我们知道可以怎样认识过去，接下来把具体问题放进全史前后。政治组织、知识信仰与生产生活有不同的证据和节奏，不会在每一个时期节点同时改变。', settings: { layer: 'activity', selected: 'prehistoric', progress: 1 } },
  ] },
  H2: { location: '全史材料 · 三条并行线索', scale: '时期索引与不同变化层次', timeContext: '九时期按前后排列 · 非等时刻度', cues: [
    { title: '时期先提供方向，再展开问题', narration: '从史前证据退回更长的时间，九个材料夹按先后排列。间距不表示历时相等，今天的地图也没有重建古代疆域。选一个时期，继续分别问政治组织、知识信仰和日常生活发生了什么。', settings: { layer: 'chronology', selected: 'empire', progress: .125 } },
    { title: '三种变化不会同时发生', narration: '把同一时期的材料展开为三条线索。人物和文本的交流、政治组织的重组、建筑和生产活动，可以有不同的发生时间。比如一六四二年的政治节点与一六四五年的建筑活动，需要分别核对地点和材料，不能合成一件事。', settings: { layer: 'overlap', selected: 'revival', progress: .25 }, keyframes: [{at:.62,settings:{selected:'ganden',progress:.625}}] },
    { title: '换时期，保留同样的三个问题', narration: '请选择十至十二世纪，保留政治、知识和生活这三个问题，再读具体交流材料。相邻时期既有延续，也有新的组织和参与者。历史分期帮助定位，不能替代人物、事件与地方的证据。', settings: { layer: 'overlap', selected: 'ganden', progress: .625 }, interaction: interaction('selection', '选择“10—12世纪”，比较同一时期的三条材料线索。', '已经用同一组问题比较时期，而非只记朝代。', { selected: 'revival', progress: .25 }) },
    { title: '从全史进入一个可核对的材料链', narration: '全史给出了来路。下面缩到唐蕃会盟，分开事件发生、立碑保存和后来拓本复制的时间，看今天的历史认识怎样经过材料的传递和研究。', settings: { layer: 'chronology', selected: 'empire', progress: .125 } },
  ] },
  H3: { location: '唐蕃会盟 · 事件与载体材料', scale: '事件、碑刻、拓本与研究', timeContext: '821、822年会盟 · 823年立碑', cues: [
    { title: '事件日期与材料日期先分开', narration: '从全史进入一个具体案例。八二一年长安会盟、八二二年拉萨会盟，与八二三年立碑要分开阅读。时间卡表示事件，不是路线图；无字碑体表示载体，也没有复刻原碑的尺寸、装饰或文字。', settings: { layer: 'event-821', selected: 'empire', progress: 0 } },
    { title: '记录怎样经过碑刻和复制保存', narration: '事件留下文字记录，碑刻以物质形式保存，后来又可以产生拓本等复制材料。模型把载体逐步展开，帮助区分这些关系。现存馆藏拓本的制作日期需要另查，不能把八二三年立碑直接当成拓本的年代。', settings: { layer: 'event-821', selected: 'empire', progress: 0 }, motion: motion(0, 1), keyframes: [{at:.25,settings:{layer:'event-822'}},{at:.5,settings:{layer:'event-823'}}] },
    { title: '对照载体与真实材料说明', narration: '请展开复制关系并选择拓本，阅读馆藏说明怎样记录原碑、事件和材料身份。空白纸与碑只解释保存机制，原文表述必须回到真实材料核对。理解传播过程，并不等于已经知道所有文字的含义。', settings: { layer: 'object', selected: 'empire', progress: 1 }, interaction: interaction('view', '选择拓本与材料说明，比较事件、立碑和复制材料。', '已经区分事件与保存、复制、解读的层次。') },
    { title: '制度变化也要分材料和生活层次', narration: '会盟案例说明了事件怎样成为今天可读的材料。进入近现代制度变化时，也要分开文件、事件、实施和地方生活，不能从一个年份自动推出所有人的经历。', settings: { layer: 'object', selected: 'empire', progress: 1 } },
  ] },
  H4: { location: '近现代材料 · 制度与地方经验', scale: '文件事件到实施和生活', timeContext: '1951、1959、1965分别核对', cues: [
    { title: '文件先说明一个具体节点', narration: '从会盟的材料链进入近现代，先把一九五一年、一九五九年和一九六五年分别放进材料夹。协议、机构变化、行政建制与社会经历不是同一种对象。材料入口在拉萨，也不能把一九五一年北京签订协议的地点移到拉萨。', settings: { layer: 'event-1951', selected: 'contemporary', progress: 0 } },
    { title: '从制度文件走向实施与地方', narration: '模型把制度、地方组织和家庭生活分成不同层次，逐步展开需要核对的联系。文件能够确认节点，怎样实施、哪些地方和人群经历了什么，还要补充对应调查、统计和文献。房屋保持不变，不用建筑增减伪造社会成效。', settings: { layer: 'event-1951', selected: 'contemporary', progress: 0 }, motion: motion(0, 1), keyframes:[{at:.32,settings:{layer:'event-1959'}},{at:.68,settings:{layer:'event-1965'}}] },
    { title: '换材料，结论不能直接跨尺度', narration: '请在三个节点之间切换，比较材料性质、发生地点和能够支持的判断。政府文件、学术研究和社区经验各有身份与语境；一份制度材料不能自动代表每个家庭的经历，规划与实际影响也需要分开。', settings: { layer: 'event-1965', selected: 'contemporary', progress: 1 }, interaction: interaction('layer', '切回“1951文件”，核对地点、性质与结论范围。', '已经把事件、制度与地方经验分别核对。', { layer: 'event-1951' }) },
    { title: '环境、文化与历史一起带向周边', narration: '从水土条件到生活组织，从建造、交流和维护到历史证据，我们已经建立了相互联系、又不能互相替代的解释。接下来把这条认识带回周边联系与今天的发展，继续问涉及谁、何时发生、需要什么资料。', settings: { layer: 'event-1965', selected: 'contemporary', progress: 1 } },
  ] },
  K1: { location: '拉萨红山 · 布达拉宫建筑特征', scale: '山体、白宫与红宫的相对关系', timeContext: '1645—1648与1694的有证节点 · 非施工复原', cues: [
    { title: '从河谷生活，走到红山上的建筑', narration: '从河谷生活需要的水、通行和空间，来到拉萨红山上的布达拉宫。先看山体、台地与建筑如何相接，再分清白宫与红宫。这是依据遗产资料组织的建筑特征图，窗数、尺寸和阶梯没有实测，不能拿它替代精确建筑模型。', settings: { layer: 'architecture', selected: '', progress: .12, cutaway: false } },
    { title: '位置、用途与年代一起解释建筑', narration: '白宫的仪典、居住与接见空间，和偏西、更高处的红宫，需要分别认识。评估文件记述一六四五年开始重建，三年后以白宫为核心的建筑完成，五世达赖喇嘛迁入；桑结嘉措组织红宫建设，一六九四年完成。人物、纪念与用途参与塑造建筑，不能只由山地或气候解释，也不能把七世纪来历当成全部现存形制的建造年代。', settings: { layer: 'architecture', selected: '', progress: .5, cutaway: false }, keyframes: [{at:.3,settings:{progress:1}}] },
    { title: '展开关系，再分别选择白宫与红宫', narration: '请展开体量关系，再分别选择白宫与红宫。镜头、文字和标注会对应所选分区；分开的形体只帮助看山体与建筑之间的相对关系，并不揭开未知室内。也可以切到院落构造原理，看一般的墙体、梁柱与覆盖如何配合，再回到真实建筑材料。', settings: { layer: 'architecture', selected: '', progress: 1, cutaway: false }, interaction: interaction('cutaway', '展开体量关系，分别选择白宫与红宫。', '已经把建筑空间、使用和不同年代联系起来。', { cutaway: true }) },
    { title: '从建筑的来历继续问交流怎样发生', narration: '同一建筑群可以留下不同时代、用途和参与者的痕迹。接下来从拉萨的建筑材料转向托林的交流材料，用有证人物和文本解释知识怎样传递；院落中的译写与学习模型只拆开一般机制，不冒充托林寺或阿底峡的真实课堂。', settings: { layer: 'architecture', progress: 1, cutaway: false, selected: '' } },
  ] },
  K2: { location: '藏印交流材料 · 译写与学习模型', scale: '载体到地方实践', timeContext: '1042年等案例另由真实材料说明', cues: [
    { title: '交流需要载体和参与者', narration: '建筑已经给出了使用空间，现在让空白文本载体来到工作桌。它代表可以传递的知识，不是古代经文，也没有假定一条真实行程。旁边阿底峡与托林等材料，提供具体人物、地点和时代的核对入口。', settings: { layer: 'religion', selected: 'culture-text', progress: 0, cutaway: false } },
    { title: '传入以后，还要译写和地方学习', narration: '同一桌面增加对照页，学习者参与译写、选择和理解，再把整理后的载体带向厅堂前。交流不是把外来形式原样搬入建筑；当地语言、传统、组织与参与者继续塑造实践。这个过程模型不复原阿底峡的一堂课。', settings: { layer: 'religion', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '把一般机制与具体史料对照', narration: '请选择文本工作桌，再阅读真实交流材料的年代、人物与作品身份。1042年的行程材料和后来绘制的画像不是同一时间形成。分开传入、学习与使用，才能避免把一条连线当成完整的宗教传播史。', settings: { layer: 'religion', selected: '', progress: .52 }, interaction: interaction('selection', '选择“文本载体与工作桌”，对照真实交流材料。', '已经把传播机制与历史案例的证据分开。', { selected: 'culture-text' }) },
    { title: '知识也通过物件与工艺留下来', narration: '交流与译写让知识进入新的语言和使用环境，文本还需要制作、保护和传下去。下一段从一件真实木经板出发，拆开护板与书页的关系。材料、用途和图像要分别核对，模型里的空白页不会冒充未知原文。', settings: { layer: 'religion', selected: '', progress: 1 } },
  ] },
  K3: { location: '制作与艺术材料 · 书页保护原理', scale: '护板、书页与真实馆藏', timeContext: '约12世纪早期馆藏 · 原理模型不复刻原作', cues: [
    { title: '从真实木经板认识文本载体', narration: '刚才看了阿底峡与托林的交流材料，现在看一件约十二世纪早期的西藏木经板，大都会藏品号一九八七点四零七点六。馆方说明成对木护板保护脆弱书页。画面把保护关系展开：两块护板，中间是空白书页；它没有复原这件原物的另一块板、原配书册或宗教图像。', settings: { layer: 'art', selected: 'culture-craft', progress: 0, cutaway: true } },
    { title: '整理书页，再由护板保护', narration: '先辨认下方护板与散开的书页。推进以后，空白页逐步对齐、叠放，护板承托书页。上方护板随后降下，书页被收在两板之间。文本传播不只有内容，也需要制作和保护载体；实物上的雕刻图像和红色颜料痕迹，由馆藏原图核对，不能从这个原理模型猜出意义。', settings: { layer: 'art', selected: 'culture-craft', progress: 0, cutaway: true }, motion: motion(0, 1) },
    { title: '展开与合拢，对照实物和原理', narration: '请退回展开护板，再推进到合拢，观察书页什么时候可见、什么时候得到覆盖。真实经板属于约十二世纪早期；一九八七是入藏编号的一部分，不是制作年代。模型解释用途，馆藏资料解释这件物品的身份，两者一起帮助认识文化怎样留下材料。', settings: { layer: 'art', selected: 'culture-craft', progress: 1, cutaway: true }, interaction: interaction('progress', '退回“展开护板”，再整理书页并合拢。', '已经把保护用途、馆藏身份与模型分别核对。', { progress: 0 }) },
    { title: '从保存载体，继续看使用与传承', narration: '知识经过交流和学习，也依靠物质载体的制作与保护留下来。有些文化还需要人持续实践。下一段以藏戏为例，看讲述者、表演者和观看者怎样配合，学习者又怎样获得参与的机会；再进入历史，追问行动、实物与今天记录各自的年代。', settings: { layer: 'art', selected: '', progress: 1 } },
  ] },
  K4: { location: '藏戏材料 · 表演与学习关系', scale: '同一组角色，不同场地安排', timeContext: '2009年列入名录 · 不等于传统起源年', cues: [
    { title: '从保存物件，到人的持续实践', narration: '木经板帮助保存书页，表演传统还需要人继续实践。以联合国教科文组织的藏戏资料为例，先辨认金色的讲述者、青色的表演角色和外围的观看者。藏戏可以在广场、寺院，也可以在舞台演出。画面只比较空间关系，圆形排布和角色数量是教学安排，不是每场藏戏的固定样式。', settings: { layer: 'life', selected: 'opera-space', progress: .18, cutaway: false } },
    { title: '观看怎样接到学习和参与', narration: '先看讲述与表演的配合，内容由参与者共同表达。现在注意珊瑚色的学习者：他离开观看位置，走近示范者，再进入共同的练习空间。位置变化使观看接到参与机会，但不能把走进场内当成已经学会。二零零九年的列入名录决定提出年轻实践者培训、研究和出版等保护措施；实际怎样教学、效果如何，还要看具体记录。', settings: { layer: 'life', selected: '', progress: 0, cutaway: false }, motion: {...motion(0,1),via:[{at:.2,value:.32},{at:.53,value:.68},{at:.72,value:1}]}, keyframes: [{at:0,settings:{selected:'opera-performance'}},{at:.2,settings:{selected:'opera-learning'}}] },
    { title: '换场地，保留同一组参与者', narration: '请切换到正面舞台关系，比较同一组角色的观看方向和活动位置。学习者与示范者仍然在场，舞台也没有让文化自动消失。开放与正面两种画面只是空间比较，不是一条从落后走向先进的年表。再回拖到观看阶段，看参与机会怎样逐步建立。', settings: { layer: 'life', selected: '', progress: 1 }, interaction: interaction('layer', '切换到“正面舞台关系”，比较角色与观看方向。', '已经比较场地变化，并保留学习与参与的条件。', { layer: 'opera-stage' }) },
    { title: '把实践的问题带进历史', narration: '从环境中的取水、建造，到交流、书页保护，再到表演与学习，我们看见了不同的生活条件和人的行动。文化的来路还需要历史材料解释。二零零九年是藏戏列入名录的年份，不是它的起源年。接下来先看考古怎样留下活动证据，再区分事件、实物和后来记录各自的年代。', settings: { selected: '', progress: 1, cutaway: false } },
  ] },
  R1: { location: '雅鲁藏布江案例 · 上下游联系', scale: '同一流域中的过程与使用', timeContext: '观测网络2017年起 · 原理进度非年份', cues: [
    { title: '历史事件之后，还要看共同环境', narration: '历史事件让我们认识了制度与地方，水的联系则穿过不同地区。以雅鲁藏布江为例，降雨、冰雪消融与土壤地下水过程都参与来水。先把完整山地、支沟和干流放在一起，再看这些地方为什么需要共同理解上游与下游。', settings: { layer: 'terrain', selected: '', progress: .18 } },
    { title: '从坡面到干流，需要连续的过程', narration: '雨落到坡面后，一部分汇流进入支沟，再到干支流汇合处和下游使用地点。王磊团队自二〇一七年起加强雅鲁藏布江多圈层同期监测，把气象、径流、冰川与地温等资料联系起来。看见水路，只能说明方向；水源贡献还要由观测和模型判断。', settings: { layer: 'water', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '亲手追溯水从哪里来、往哪里去', narration: '请把阶段退回山地来水，再推进到干支汇合与下游使用。留意水沿高差连接，取用者仍要把水带到生活空间。对照雅鲁藏布江案例，分别问雨量、水位、冰雪和地下过程需要什么记录，不把教学颗粒当成实测水量。', settings: { layer: 'settlements', selected: '', progress: 1 }, interaction: interaction('progress', '退回“山地来水”，再沿干支汇合观察到下游使用。', '已经把来源、汇流与使用接在同一流域中。', { progress: .18 }) },
    { title: '自然的联系，还要接到人的往来', narration: '同一流域让不同地方共享来水和变化，人的联系却还要有出行、接待、交换与学习。接下来从阿底峡到托林的有证节点出发，看自然通口怎样成为机会，而具体行动又怎样让交流真正发生。', settings: { layer: 'water', selected: '', progress: 1 } },
  ] },
  R2: { location: '阿底峡与托林 · 通道和交流材料', scale: '山口条件到具体行动者', timeContext: '1042年入藏 · 不复原逐段古道', cues: [
    { title: '阿底峡与托林：有通口，还要有人往来', narration: '大都会博物馆的交流资料记述，阿底峡一〇四二年入藏前停留加德满都，随后来到西藏西部托林，后来进入中部。这些是有材料支持的地点节点。先看山口怎样约束通行，再问人为什么出发、谁接待、怎样学习与翻译。', settings: { layer: 'terrain', selected: '', progress: .18 } },
    { title: '抵达、通过与交接是不同条件', narration: '载体先到坡脚，再通过有限通口，最后把物品交给另一侧的接收者。地形只是其中一层；运输技术、补给和组织决定联系怎样继续。历史上的教师、文本与艺术交流，也要从实际行动和留下的材料认识，不能只靠地图上出现一条线。', settings: { layer: 'routes', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '固定山口，比较哪一段还没有接上', narration: '请退回抵达坡脚，再观察通过通口与节点交接。地形保持不变，改变的是载体和人的行动。对照阿底峡材料，区分已经知道的停留节点和仍缺乏依据的路段；这里的通用路径帮助理解条件，没有代替那段真实历史。', settings: { layer: 'transport', selected: '', progress: 1 }, interaction: interaction('progress', '选择“通过通口”，对照抵达与节点交接的不同条件。', '已经把自然通行与社会交换分开并联系起来。', { progress: .52 }) },
    { title: '从交流行动，走向共同承担的议题', narration: '交流需要具体参与者，跨区域公共问题也一样。水、道路和环境的变化会影响不同地方，谁观察、谁使用、谁需要响应，都要明确。下一段用色东普的真实研究，说明为什么重要位置必须落实为过程、证据与组织。', settings: { layer: 'transport', selected: '', progress: 1 } },
  ] },
  R3: { location: '色东普案例 · 共同环境与响应', scale: '坡面、河道、地方与资料链', timeContext: '2018年堵江背景 · 2023年预警研究', cues: [
    { title: '色东普：坡上的变化为什么影响下游', narration: '西藏东南部色东普谷地二〇一八年曾发生堵江。崩落物从坡面进入谷地，可能影响雅鲁藏布江、道路和居民。这里先用完整上下游场景辨认参与者：只看一个取用位置，无法理解共同环境中的全部问题。', settings: { layer: 'water', selected: '', progress: .18 } },
    { title: '多处证据，才能接上公共响应', narration: '加入生态与下游使用，再加入观测和材料对读。色东普研究把谷内振动、影像和河道水位联合起来，区分发生崩塌、到达河道与是否堵江。确认过程之后，还需要维护设施、传递信息和地方响应；单个信号不能替代整条判断链。', settings: { layer: 'cooperation', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '扩大关注范围，检查还缺什么材料', narration: '请从上游视角依次加入生态、下游和观测对读。不同位置的材料需要检查日期、变量和方法。空白记录板提醒我们去找证据；教学场景不发预警，也不给任何一方计算损益。位置的价值包含共同依赖，也包含维护与组织责任。', settings: { layer: 'cooperation', selected: '', progress: 1 }, interaction: interaction('progress', '回到“生态与下游”，辨认新增参与者，再展开观测对读。', '已经把议题范围、信息条件与组织责任连起来。', { progress: .52 }) },
    { title: '共同依赖的通道，也需要长期维护', narration: '从色东普看到，认识一处变化要把自然过程与人的行动相连。现代交通同样如此：线路穿过高原，地下的冰和土也会变化。接下来走到青藏铁路冻土工程，理解技术选择怎样回应环境，通车以后为什么仍需观测。', settings: { layer: 'cooperation', selected: '', progress: 1 } },
  ] },
  M1: { location: '青藏铁路案例 · 地基、工程与到达', scale: '地下过程到通道实际使用', timeContext: '2001年研究论证 · 2006年通车 · 条件对照', cues: [
    { title: '通向拉萨的铁路，先要面对地下的冰', narration: '二〇〇六年七月一日青藏铁路全线通车。把这件事放回环境，线路不仅经过高原表面，还依赖会随热量变化的含冰地层。北麓河试验地在青海，工程服务跨越青藏高原的联系；认识西藏，也需要看行政区以外的支撑条件。', settings: { layer: 'ground', selected: '', season: 3, progress: .12 } },
    { title: '程国栋的冷却思路，为什么要看季节', narration: '程国栋等研究者推动主动冷却路基的思路，马巍强调通车以后继续监测。块石保留空隙，寒季外界比地基冷时，空气对流可以带走热量；暖季条件不同，同样的冷却对流会减弱或停止。模型把这些条件展开，不把一种结构当成永久不变的答案。', settings: { layer: 'ground', selected: '', season: 3, progress: 0 }, motion: motion(0, 1), keyframes:[{at:.68,settings:{layer:'transport'}}] },
    { title: '切换冷暖条件，再看运营与接驳', narration: '请停在冷热条件对照，切到暖季，再回到冷季，看空气交换和含冰试验块怎样变化。最后推进到运营与接驳：工程支撑主通道，列车到站以后，人仍需要继续到达目的地。地温和沉降要查真实监测，班次与接驳则按日期另行核实。', settings: { layer: 'ground', selected: '', season: 3, progress: .52 }, interaction: interaction('season', '切到“暖季条件”，对照同一剖面，再推进到运营与接驳。', '已经把季节工程条件与实际使用条件分开核对。', { season: 1 }) },
    { title: '通道怎样进入具体人的日常', narration: '铁路把地方连进网络，居民是否用得上，还与服务、接驳和家庭处境有关。下一段到拉林铁路与彩门村，听有姓名、有日期的地方访谈，再用设施、人员和到达的过程，说明开通事件怎样接到生活问题。', settings: { layer: 'transport', selected: '', season: 3, progress: 1 } },
  ] },
  M2: { location: '拉林铁路与彩门村 · 设施和生活', scale: '区域通道到家庭使用条件', timeContext: '2021年开通与采访 · 不代表当前全村状态', cues: [
    { title: '彩门村：到站以后，人想怎样使用联系', narration: '二〇二一年六月二十五日拉林铁路开通，连接拉萨、山南与林芝。当年的彩门村采访中，普巴和扎西谈到交通、民宿、学生出行与特产外销。具名表述让我们看见具体用途与期待，还要继续问：哪些条件让这些联系真正进入生活？', settings: { layer: 'settlements', selected: '', progress: .12 } },
    { title: '设施、持续服务与实际到达缺一不可', narration: '先看设施存在，再加入人员与开放，最后接上使用者能够走到的路。学生、经营者和不同家庭的需求并不相同。一处设施或一条铁路提供条件，是否能够持续使用，还要核对时间、内容、费用和家庭经验，而不能只从建筑外观看成效。', settings: { layer: 'settlements', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '换一个家庭问题，资料也要跟着换', narration: '请退回人员与开放阶段，看看接段尚未补齐时，使用者还缺少什么。再对照彩门村访谈与有日期的牧民社区研究：采访、家庭调查和地区统计回答不同问题。既要看机会，也要看成本，不能把两位受访者代表全部居民。', settings: { layer: 'settlements', selected: '', progress: 1 }, interaction: interaction('progress', '选择“人员与开放”，再比较“到达与使用”，阅读两个地方案例。', '已经把空间设施、运营和家庭经验分别核对。', { progress: .52 }) },
    { title: '使用机会增加，还要看地方怎样维护', narration: '新的联系会带来不同用途，地方的文化、生态和日常也需要持续维护。接下来回到拉萨的布达拉宫、大昭寺和罗布林卡，用具体保护材料讨论：怎样让人继续使用地方，同时照顾实物、环境与长久价值。', settings: { layer: 'settlements', selected: '', progress: 1 } },
  ] },
  M3: { location: '拉萨遗产案例 · 保护、环境与使用', scale: '具体措施到多方影响', timeContext: '2024年报告与2025年保护分析', cues: [
    { title: '回到拉萨，看保护与使用的具体选择', narration: '布达拉宫、大昭寺和罗布林卡仍与今天的拉萨相连。联合国教科文组织二〇二五年保护资料同时讨论材料维护、历史环境和人的使用。发展与保护需要围绕具体对象判断，不能只看游客数量，也不能只保存一个建筑外观。', settings: { layer: 'transport', selected: '', progress: .12 } },
    { title: '同一措施可能保护实物，也改变环境', narration: '资料讨论大昭寺附近三座历史碑的保护棚：保护实物的作用与视线、历史环境的代价需要一起评估。模型保持同一活动，逐步加入收益、生态和地方生活。罗布林卡缓冲区调整在该资料中仍是拟议，报告、建议与完成结果要分别阅读。', settings: { layer: 'ecology', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '亲手把遗漏的对象加进同一讨论', narration: '请从收益问题开始，加入生态与地方生活，看原来没有纳入的对象是什么。再打开拉萨案例，分别核对措施、材料、环境和使用者。三个对象一起出现，是提问范围更完整，不表示模型已经算出保护成效或替所有人作出选择。', settings: { layer: 'ecology', selected: '', progress: 1 }, interaction: interaction('progress', '回到“加入生态”，再把“地方生活”纳入，核对拉萨保护案例。', '已经把使用、环境和维护责任放进同一问题。', { progress: .52 }) },
    { title: '把理解变成可以亲自观察的问题', narration: '从地球位置到环境，从生活文化到历史与今天，我们已经能用原因和材料认识地方。最后把这些认识带进探索：为什么去、希望看什么、前后两站怎样互相解释。候选路线从问题出发，实际交通和访问条件继续核实。', settings: { layer: 'settlements', selected: '', progress: 1 } },
  ] },
  T1: { location: '拉萨、山南、林芝 · 我的认识目的', scale: '具体地方与个人问题', timeContext: '已知材料与新的观察分开记录', cues: [
    { title: '带着问题，重新看一个地方', narration: '现在把这一程带回自己的观察。拉萨可以问历史建筑怎样使用，山南可以问河谷怎样参与生活，林芝可以问水汽、山地与新通道。先选希望理解的问题，再选择地方；旅行由此接上前面的环境、人物、事件和发展认识。', settings: { layer: 'culture', selected: '', progress: .12 } },
    { title: '从外观走到环境、使用与材料', narration: '同一片河谷保留山地、水路、人居与建筑。先读环境联系，再打开建筑观察入口和使用空间，最后把有出处的材料放回来。看见一种外观只是开始；当时天气、长期气候、建筑用途与历史年代，各需要不同证据。', settings: { layer: 'culture', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '留下自己的问题，再选相应候选地', narration: '请在我的问题里写下一个想继续理解的原因，也可以选择一组候选站。河谷、城市与新通道这条学习顺序连接拉萨、山南和林芝；阿底峡与托林则提供跨区域研读线。保存的是你的认识目的，远距离地方不必强排在同一天。', settings: { layer: 'culture', selected: '', progress: 1 }, interaction: interaction('record', '在“我还想继续理解什么”写下一个问题，再加入相关候选站。', '已经留下个人认识目的，可以据此组织前后站点。') },
    { title: '让前后两站真正互相解释', narration: '有了问题，下一步把候选站整理成自己的顺序。每站写清为什么关注、准备观察什么，再看前后关系是否推进认识。教学场景会说明主通道、换乘和访问入口的不同条件；真实出行安排仍要查相应日期的服务。', settings: { layer: 'routes', selected: '', progress: 1 } },
  ] },
  T2: { location: '我的候选站 · 从知识顺序到访问链', scale: '主通道、接驳与入口', timeContext: '2021通道背景与实际计划分开', cues: [
    { title: '主题顺序，不会自动变成实际行程', narration: '以拉萨、山南、林芝为例，二〇二一年开通报道支持这条区域通道，不能保证任何日期、每个目的地都能直达。候选顺序先表达知识怎样连接，接下来用同一河谷说明：从乘车到真正到访，中间还要接上哪些环节。', settings: { layer: 'routes', selected: '', progress: .12 } },
    { title: '从主通道，经过接驳，再到访问入口', narration: '主车先到节点，接驳车辆再走另一段，最后人物沿踏步走到入口外。每一段都有独立条件：是否开行、怎样换乘、能否到达、是否开放和需要预约。模型中的闸口保持待核实；到达入口不等于已经获准进入。', settings: { layer: 'transport', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '调整真实候选站，保留每站认识目的', narration: '请在候选顺序里至少加入两站，写下每站的问题，并尝试向前或向后移动。已选站数来自你实际加入的地方；教学示例不会自动算进计划。可以删减站点，让问题更清楚，再打开完整计划核对日期、交通与访问条件。', settings: { layer: 'routes', selected: '', progress: 1 }, interaction: interaction('route', '加入至少两站并调整前后顺序，为每站补充观察问题。', '已经形成保留每站认识目的的候选顺序。') },
    { title: '让计划能够检查，也能够回来修改', narration: '顺序有了，最后把材料出处、动态条件和个人记录一起保存。历史开通事件不会替代今天的班次，规划与保护建议也不代表访问条件已经通过。把已知和未知留在计划里，下次才能从同一个问题继续。', settings: { layer: 'transport', selected: '', progress: 1 } },
  ] },
  T3: { location: '我的主题探索计划 · 保存与继续', scale: '候选地点、出处、条件与记录', timeContext: '计划日期由个人填写 · 未自动核验出行', cues: [
    { title: '从完整认识，走到一份可继续的计划', narration: '这一程从地球位置出发，经历气候地形、生活文化、历史证据、周边联系和现代发展。现在把真正关心的站点和问题保留下来。认识出处、出行条件与个人观察是不同内容，保存时都要有自己的位置。', settings: { layer: 'culture', selected: '', progress: .12 } },
    { title: '认识有出处，条件有日期，记录属于自己', narration: '材料柜保留为什么去和相关认识，状态台提醒日期、交通与开放还要核实，笔记本等待自己的问题与新观察。空的状态没有被动画变成通过，空白纸也没有变成虚构游记。实际内容来自你填写与保存的计划。', settings: { layer: 'transport', selected: '', progress: 0 }, motion: motion(0, 1) },
    { title: '保存每站问题和已有条件，再检查恢复', narration: '请填写已有的日期、交通意向和每站待核实事项，保存当前计划，或打开完整计划导出。回来时检查顺序和问题是否仍在，再继续补资料。已经保存表示能够继续修改，不能替代逐段交通、预约与开放的核验。', settings: { layer: 'transport', selected: '', progress: 1 }, interaction: interaction('record', '填写计划条件或每站备注后保存，并检查候选顺序与观察目的。', '已经保留能够继续编辑和核对的个人计划。') },
    { title: '这一程告一段落，认识还能继续生长', narration: '你可以从任意一站回到对应章节，核对新材料，修正原来的解释。环境提供条件，人的行动与历史形成地方，今天的联系和发展又带来新的选择。带着有出处的问题去观察，回来把自己的记录接上，这张认识西藏的地图就能继续完善。', settings: { layer: 'transport', selected: '', progress: 1 } },
  ] },
};

const stepRecords = chapters.flatMap(chapter => chapter.steps.map(step => ({ chapter, step })));
const ordered = learningStepIds.map(id => {
  const record = stepRecords.find(({ step }) => step.id === id);
  if (!record) throw new Error(`Learning order contains an unknown question: ${id}`);
  return record;
});
export const journeySteps: Record<string, JourneyStep> = Object.fromEntries(ordered.map(({ chapter, step }, index) => {
  const script = scripts[step.id];
  const next = ordered[index + 1];
  const nextScript = next ? scripts[next.step.id] : null;
  const segment = journeySegments.find(value => value.chapterIds.includes(chapter.id))!;
  return [step.id, {
    stepId: step.id,
    chapterId: chapter.id,
    segmentId: segment.id,
    location: script.location,
    scale: script.scale,
    timeContext: script.timeContext,
    cues: script.cues.map((cue, cueIndex) => ({ ...cue, id: `${step.id}-${step.id==='C4'?cue.settings.layer:roles[cueIndex]}`, role: cue.role||roles[cueIndex] })),
    nextStepId: next?.step.id ?? null,
    transition: nextScript ? {
      fromScale: script.scale, toScale: nextScript.scale,
      fromTime: script.timeContext, toTime: nextScript.timeContext,
      reason: script.cues.at(-1)!.narration,
    } : null,
  } satisfies JourneyStep];
}));

export const chapterSummaries: Record<string, ChapterSummary> = {
  position: { chapterId: 'position', title: '已经从地球运转，认识到西藏高地', narration: '我们先认清地球的海陆与空气，看阳光怎样建立冷暖背景、空气怎样搬运热和水，再用不同地方对照这些条件。随后找到亚洲、中国和西藏，认识高原的外部来路、形成过程与真实高差。现在可以继续解释西藏的气候，也可以沿历史文化、城市联系与旅行专题深入。', learned: ['海陆、阳光、空气与水怎样相互联系', '地区差异来自纬度、海陆、环流和地形的组合', '从地球定位西藏，再用连续高程理解这片高地'], sourceStepIds: ['G1', 'G2', 'G3', 'G4'], nextStepId: 'C1', nextReason: '已有整体运行与地形参照，继续看这些条件怎样影响西藏各地。' },
  climate: { chapterId: 'climate', title: '已经连起热量、空气、水与时间', narration: '气候需要同时理解照射、能量收支、空气运动与水循环，地形和季节又参与改变地方条件。一次天气、一年循环和多年变化使用不同时间与资料；色林错两期面积记录让地点、年份与研究口径有了具体对应。接下来比较西藏内部的地区差异。', learned: ['照射与实际温度通过能量收支联系', '风、水汽、云与降水是有条件的过程链', '两期研究面积与时间、变量和资料身份对应'], sourceStepIds: ['C1', 'C4', 'C5', 'C7', 'C9'], nextStepId: 'E1', nextReason: '固定问题和资料口径，比较不同地方的条件组合。' },
  regions: { chapterId: 'regions', title: '已经把一般规律落到地方', narration: '林芝、那曲、阿里等地方的水热与地形条件组合不同，行政地区内部也有多样环境。公平比较先统一问题、时期和口径；自然为生活提供条件，人的行动继续改变使用方式。接下来走近具体景观。', learned: ['地区名称不能替代内部环境差异', '比较要保持问题与口径一致', '生活由条件、技术与组织共同形成'], sourceStepIds: ['E1', 'E2', 'E3'], nextStepId: 'P1', nextReason: '从地区到山川，再从形成与使用进入人的历史。' },
  landscapes: { chapterId: 'landscapes', title: '已经读懂景观与周围的联系', narration: '山川需要连同相邻地形、水系与形成证据一起理解，也承载生产、记忆与保护。自然条件这条线已经从地球落到河谷与聚落。接下来沿具体建筑、信仰、艺术与日常，研究人怎样使用空间并创造地方文化。', learned: ['局部景观要放回周围地形与水系', '通用过程还需要具体地点证据', '风景的意义也来自人的使用与记忆'], sourceStepIds: ['P1', 'P2', 'P3'], nextStepId: 'K1', nextReason: '由河谷聚落走到建筑与使用者，让环境背景接到人的实践。' },
  history: { chapterId: 'history', title: '已经找到时期、事件与材料的关系', narration: '沿文化中的问题回看历史，我们从有情境的证据进入，在全史中寻找前后。会盟与立碑年代要分开，现存建筑也有不同时间层。接下来将生活和事件放回流域、通道及周边联系，研究具体议题与影响。', learned: ['活动、定居与族群判断各需相应证据', '全史索引给事件建立前后', '事件、材料、现存形制与用途各有年代'], sourceStepIds: ['H1', 'H2', 'H3', 'H4'], nextStepId: 'R1', nextReason: '由生活与历史向外展开，理解跨地区水系、通行与公共事务。' },
  culture: { chapterId: 'culture', title: '已经把文化对象放回人的实践', narration: '文化形成与材料、用途、人物、文本、制度及地方创造相互联系。建筑、信仰、作品和日常实践有传承也有变化，不能由气候推算。接下来沿这些人的问题回看历史，用考古、文字和建筑证据解释变化。', learned: ['建筑与作品要结合用途、年代和语境', '传播包含翻译、选择与当地创造', '文化在具体社区的日常中传承与改变'], sourceStepIds: ['K1', 'K2', 'K3', 'K4'], nextStepId: 'H1', nextReason: '文化提出怎样走到今天的问题，历史用具体年代、事件与材料继续回答。' },
  connections: { chapterId: 'connections', title: '已经让战略价值有具体对象', narration: '西藏通过流域、通道、文化与治理联系周边，关系类型、时期与依据要分别说明。位置重要需要落实到受益、影响和约束条件。接下来认识近现代交通与生活怎样改变这些联系，并讨论发展与保护。', learned: ['流域与行政范围不同，上下游影响需要资料', '自然通行、历史关系与现代交通各有含义', '战略意义来自具体议题、对象与条件'], sourceStepIds: ['R1', 'R2', 'R3'], nextStepId: 'M1', nextReason: '从联系背景进入建设事件与真实社会影响。' },
  modern: { chapterId: 'modern', title: '已经把变化、影响与维护放在一起', narration: '交通开通、设施建设与规划目标都需要和实际使用、社会经验及影响区分。价值利用与生态文化保护需要长期维护。现在把整条认识线收回自己的问题，选择想继续了解的地方，形成探索与旅行成果。', learned: ['开通事件不自动等于所有社会指标变化', '总量、空间分布与个人体验分别阅读', '发展与保护都要说明对象、条件和维护'], sourceStepIds: ['M1', 'M2', 'M3'], nextStepId: 'T1', nextReason: '让学到的关系成为每个地点与站点的观察目的。' },
  travel: { chapterId: 'travel', title: '已经形成可以继续的探索成果', narration: '用问题选择地点，用前后联系组织主题路线，再保存日期、交通与待核实条件。知识路线与可执行行程不同，实地观察还可以回来检验和丰富原来的认识。你可以从自己的成果继续，也可以回到任何章节深入。', learned: ['每站保留为什么去与准备观察什么', '主题顺序还需实际交通和访问条件', '保存进度、问题与计划让下一次继续'], sourceStepIds: ['T1', 'T2', 'T3'], nextStepId: null, nextReason: '从保存的问题或路线返回对应章节，让新的观察接回旧认识。' },
};

export function getJourneyStep(stepId: string): JourneyStep {
  return journeySteps[stepId] ?? journeySteps.G1;
}

/** Exact targets allow the director to acknowledge a real user operation; view/record/route are UI events. */
export function matchesCueTarget(cue: JourneyCue, settings: SceneSettings): boolean {
  const target = cue.interaction?.target;
  if (!target || Object.keys(target).length === 0) return false;
  return Object.entries(target).every(([key, value]) => key === 'progress'
    ? Math.abs(settings.progress - (value as number)) <= .08
    : settings[key as keyof SceneSettings] === value);
}

