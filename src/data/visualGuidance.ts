import { journeySteps } from './journey';
import {earthNarrationBeats,earthNarrationMoment,type EarthNarrationTiming} from '../lib/earthNarrationState';
import {narrationPhraseBindings,narrationPhraseGuide} from '../lib/narrationPhraseGuide';
import type {SceneSettings} from '../lib/store';

/** Attention follows the narration clock, independently of the model's scientific process slider. */
export interface VisualGuideState {
  cueId: string;
  progress: number;
  active: boolean;
  beatId: string;
  targets: string[];
  drawProgress: number;
  relation: 'focus' | 'sequence' | 'compare';
  title: string;
  explanation: string;
  phraseId?:string;action?:string;actionProgress?:number;textProgress?:number;timingPrecision?:'provider'|'estimated';comparison?:string;
  textStart?:number;textEnd?:number;sceneProgress?:number;sceneSettings?:Partial<SceneSettings>;
}

export interface VisualGuideBeat {
  at: number;
  targets: string[];
  relation: VisualGuideState['relation'];
  title: string;
  explanation: string;
  textStart?:number;textEnd?:number;
}
type StepBeats = VisualGuideBeat[][];
const b = (at: number, targets: string[], title: string, explanation: string,
  relation: VisualGuideState['relation'] = targets.length > 1 ? 'sequence' : 'focus'): VisualGuideBeat =>
  ({ at, targets, title, explanation, relation });

/**
 * Reuses the evidence and scope of the existing curriculum and narration, without
 * introducing measured values, historic journeys or reconstructed inscriptions.
 * Selectable IDs are used wherever available. The small set in
 * visualGuideNarrationAnchors names renderer-provided conceptual anchors; these
 * are attention targets, not measured locations or additional historical facts.
 */
export const visualGuideNarrationAnchors = {
  earth: 'The whole existing globe; no new geographic boundary.',
  'heat-equator':'Equal-width sunlight footprint at equator, geometric illustration.',
  'heat-highlatitude':'Equal-width sunlight footprint at 60 degrees, not measured temperature.',
  'circulation-rise':'Mean schematic low-latitude rising branch.',
  'circulation-upper':'Mean schematic upper-air branch.',
  'circulation-sink':'Mean schematic descending branch.',
  'circulation-return':'Schematic surface return and deflection, not observed wind.',
  'history-stele-body': 'The existing uninscribed conceptual stele body.',
  'sun-source': 'The existing solar illumination source; geometry demonstration.',
  'solar-axis': 'The existing inclined axis; no atmospheric or weather measurements.',
  'solar-earth': 'The existing Earth sphere in the solar geometry scene.',
  'climate-surface': 'The existing conceptual climate model surface.',
  'terrain-snow': 'A high vertex of the same existing seasonal terrain mesh; no measured snow depth or local climate record.',
  'terrain-surface': 'A lower vertex of the same existing terrain mesh, retained while the authored seasonal colours change.',
  'atlas:siling-co-study': 'The actual map pin for the published study-envelope centre reference; not a shoreline or measured lake centre.',
  'climate-atmosphere': 'The existing conceptual atmosphere/energy exchange objects.',
  'climate-space': 'The existing outward energy path; no measured flux magnitude.',
  'context-terrain': 'The existing conceptual context surface, not surveyed elevation.',
  'context-river': 'The existing conceptual water-path group, not a measured river network.',
  'context-settlements': 'The existing settlement-reference group, not historical reconstruction.',
  'context-links': 'The existing node relations, not actual road or ancient journey geometry.',
  'context-railway': 'The existing conceptual railway relationship, not a rail alignment.',
  'context-flow': 'The existing schematic downstream flow relationship.',
  'context-neighbours': 'The existing schematic outside relationships, not border geometry.',
  'travel-route': 'Only the route made from the user’s actual selected stops; empty stays empty.',
} as const;

const stepBeats: Record<string, StepBeats> = {
  G1: [
    [b(0,['earth-ocean'],'先认识海洋','海洋储存热量和水；水汽把海洋与陆地联系起来。'),b(.25,['earth-land'],'再看大陆与地形','陆地有低地、山地和高原，地表并不是同样平坦。'),b(.5,['earth-air'],'大气包围整个地球','空气搬运热和水；蓝色外层只示意大气位置。'),b(.76,['earth-ice'],'冰雪也是水的储存','冰雪、海洋与陆地通过水循环相连。')],
    [b(0,['heat-equator','heat-highlatitude'],'同样宽的两束阳光','比较低纬与高纬：先固定光束宽度，再看地面的接收范围。','compare'),b(.45,['heat-equator','heat-highlatitude'],'倾斜照射让光铺得更开','高纬光斑更长，同一份能量分散到更大面积。','compare')],
    [b(0,['circulation-rise'],'空气在低纬附近上升','受热差异参与建立压力差，上升与周围空气补充相连。'),b(.25,['circulation-upper'],'热和水分随空气输送','空气在高处向外移动，地球不是一格格互不相通的地方。'),b(.5,['circulation-sink'],'别处的下沉与回流','下沉压缩增温，通常不利于凝结成云。'),b(.75,['circulation-return'],'自转改变地面风向','图上为平均环流原理，海陆、季节和地形会使实际流动更复杂。')],
    [b(0,['compare-equator'],'刚果盆地：热带低地','把低纬热量、空气上升与水循环联系到湿润环境。'),b(.36,['compare-desert'],'撒哈拉：副热带干燥地区','温暖不等于多雨：大尺度下沉与其他地区条件共同参与干燥。'),b(.72,['compare-plateau'],'青藏高原：还必须加入高度','纬度不是全部原因。接下来在亚洲、中国找到西藏，并对比低地与高原。')],
  ],
  G2: [
    [b(0,['earth'],'带着地球环境找到目标','完整地球上的海陆与大气是共同背景。'),b(.2,['asia'],'亚洲是洲','先辨认洲的尺度，再逐层找到国家与地区。'),b(.45,['china'],'中国是国家','西藏自治区属于中国，沿全国范围找到西南方向。'),b(.72,['china','tibet'],'中国西南的西藏','行政范围与自然高原是不同的范围。','compare')],
    [b(0,['indian-ocean'],'海洋为水汽提供来源','水分经蒸发进入空气，再由气流输送。'),b(.38,['himalaya','plateau'],'山系改变空气经过的条件','山地可能使空气抬升或绕行，不是一堵完全封闭的墙。'),b(.72,['central-asia'],'也要看西侧的来流','西风也能输送水汽，不能统一理解成干风。')],
    [b(0,['earth-tropic','tibet'],'纬度只提供一部分背景','同在回归线以北，也不能直接得出相同的气温和降水。','compare'),b(.45,['himalaya','plateau'],'高山与广阔高原是两种尺度','沿低地—山系—内部高地对比，才能理解高原的高与大。','compare')],
    [b(0,['tibet','plateau'],'把行政范围和自然范围分清','地方统计与自然过程使用的范围不完全相同。','compare'),b(.5,['himalaya','plateau'],'下一步追问这片高地如何形成','先用形成原理认识长期过程，再用真实高程对比今天的低地与高原。')],
  ],
  G3: [
    [b(0,['formation-india','formation-eurasia'],'辨认两侧的相向运动','地壳剖面提取汇聚关系，进度不是地质年份。'),
      b(.52,['formation-crust'],'把今天高地接回形成问题','内部变形需要与地表高度分开观察，不能只想象整块地面同时升高。')],
    [b(0,['formation-india','formation-eurasia'],'水平汇聚使地壳缩短','先沿两侧物质标记看间距，再看内部如何变形。'),
      b(.26,['formation-crust'],'地层弯曲，地壳增厚','地表上隆与向下增厚相关，但不等于同一个高度数值。'),
      b(.64,['formation-crust','formation-surface'],'内部变形与地表作用并行','抬升、侵蚀和区域差异共同参与，模型没有给出实际厚度与年代。','compare')],
    [b(0,['formation-crust'],'从侧面读弯曲层次','回拖可比较同一剖面前后，转动可分清内部与表面。'),
      b(.45,['formation-crust','formation-surface'],'把地壳与地表分开读','看见变形关系后，真实地区何时抬升仍要回到地质研究。','compare')],
    [b(0,['formation-surface'],'高地内部仍有起伏','形成高原不等于形成一块平板，山脊与谷地各有空间关系。'),
      b(.48,['formation-surface'],'从形成原因回到今天地形','下一段换用公开高程读今天的高差；当前概念剖面不代替真实地形。')],
  ],
  G4: [
    [b(0,['terrain-interior'],'先给高原找一个参照','同一幅地形里保留南侧低地、喜马拉雅与高原内部。'),b(.4,['terrain-himalaya','terrain-interior'],'越过山地，不等于回到低地','高山与广阔高地是不同对象；下一段沿同一剖面直接读数。','compare')],
    [b(0,['terrain-probe'],'① 山前低地：约50米','89°E、26°N的读点接近海平面，先把这一高度记住。'),b(.2,['terrain-probe'],'② 山地高点：约5300米','这是所选剖面27—29°N之间的网格高点，不是山峰峰顶测量。'),b(.43,['terrain-probe'],'③ 高原内部：仍约4950米','沿同一经度到33°N，地面仍比低地高很多：高原不只是一座高山。')],
    [b(0,['terrain-interior','terrain-himalaya'],'切面显示高程，不是岩层','剖切和转动分别帮助读高度与方向；地下构造属于另一类证据。','compare'),
      b(.48,['terrain-himalaya','terrain-interior'],'沿保留的高差提出气候问题','空气与水进入山地后会受地形影响，接下来要具体解释怎样发生。')],
    [b(0,['terrain-himalaya','terrain-interior'],'带着高差，追踪空气的来路','南侧低地、喜马拉雅与高原内部，构成空气进入山地时面对的环境。','compare'),
      b(.44,['terrain-yarlung','terrain-southeast'],'下一步：气流来到这片高原','从完整地球沿来流走近同一片山地，观察抬升、云雨，再比较地方生活。','compare')],
  ],
  C1: [
    [b(0,['lhasa'],'固定已认识的地点','现在解释季节的照射差异；城市标记是太阳几何的纬度参照。'),b(.48,['sun-source','solar-earth'],'同一地点，观察冬夏条件','太阳与地球的几何关系参与一年照射变化，固定地点便于比较。')],
    [b(0,['solar-axis'],'先看倾斜地轴与同一地点','固定拉萨纬度，保持比较对象相同。'),b(.3,['sun-source','lhasa'],'夏至：正午太阳较高、白昼较长','先保留夏至画面和日长数值，随后自动切到冬至比较。'),b(.58,['sun-source','lhasa'],'冬至：同一地点转为较低太阳高度和较短日长','场景与计算同时换到冬至；地方气温还需要地表、大气与输送背景。')],
    [b(0,['lhasa','solar-earth'],'保持地点再切换季节','相同位置与视角让冬夏比较有共同参照。'),b(.49,['solar-axis','sun-source'],'季节循环与多年变暖分开','这里的一年几何变化不是长期气候趋势。')],
    [b(0,['sun-source','solar-earth'],'收到阳光以后还会散失能量','温度不能只由输入判断，还要看储存和输出。'),b(.48,['solar-earth'],'从照射进入能量收支','下一段缩小到地表与空气，把路径和参与对象逐一接起来。')],
  ],
  C2: [
    [b(0,['energy-sunlight','energy-surface'],'沿进入路径找到地表','太阳短波进入后，一部分被反射，另一部分可被吸收。'),b(.45,['energy-surface','energy-atmosphere'],'分清参与能量交换的对象','先认对象与方向，再读收支；真实过程可以同时进行。','compare')],
    [b(0,['energy-surface'],'吸收后有储存，也有分配','地表状态改变，并通过不同路径交换能量。'),b(.26,['energy-surface','energy-atmosphere'],'地表与空气之间持续交换','长波、空气热交换和蒸发参与其中，箭头不是实测通量。'),b(.68,['energy-atmosphere','energy-space'],'向外散失，也有向下交换','大气参与吸收和发射，不能当作只阻挡一个方向的盖子。')],
    [b(0,['energy-sunlight','energy-surface'],'回拖比较进入与吸收','回退解释阶段不会改变能量路径的物理身份。'),b(.43,['energy-surface','energy-atmosphere','energy-space'],'认清共同收支','温度来自输入、储存、输出与输送共同作用，不能只看阳光。')],
    [b(0,['energy-surface','energy-atmosphere'],'保留地表与空气尺度','能量收支已解释热量路径，接下来问高度如何参与。'),b(.5,['energy-atmosphere'],'从能量进入空气的垂直变化','空气团的运动过程与环境的实际温度分布要分别理解。')],
  ],
  C3: [
    [b(0,['height-low','height-high'],'先找较低处与较高处','高差建立垂直参照，不自动生成某处精确气温。','compare'),b(.54,['height-parcel','height-environment'],'空气团与周围环境分开','一个物体的运动过程，与周围空气的观测状态不是同一件事。','compare')],
    [b(0,['height-parcel'],'跟随同一团空气上升','进入较低气压环境后，空气可以膨胀并冷却。'),b(.38,['height-parcel','height-environment'],'过程不代替环境观测','周围温度分布还受天气、云、湿度与地表影响。','compare'),b(.75,['height-high'],'高度模型提供原理参照','当前没有某地某日的实测温度，颜色不作为温度读数。')],
    [b(0,['height-low','height-high'],'同一坡面比较高低位置','转动与切层帮助把地形高差和空气移动相互联系。','compare'),b(.5,['height-parcel'],'再看空气怎样沿坡移动','比较地区冷暖还需地点、日期与统计范围，不能用模型印象代替。')],
    [b(0,['height-parcel'],'上升把温度接到空气运动','已认识局地上升，接下来还要问空气从哪里来。'),b(.5,['height-environment'],'由局地高差退回环流背景','气候问题需要在山坡机制与更大海陆背景之间来回联系。')],
  ],
  C4: [
    [b(0,['circulation-ocean'],'完整地球保留海陆来路','先把全球空气运动接到亚洲的海洋、大陆与季节背景。'),b(.4,['circulation-south','circulation-west'],'沿来路靠近高原','两条方向线是季节联系，不是测量的风场。','compare'),b(.75,['circulation-plateau'],'同一个地球，读出高原起伏','真实高程与原理气流各有身份，但共享地理位置。')],
    [b(0,['cloud-inflow'],'跟踪同一气团','先找山体南侧的较低处，再跟随同一气团。'),b(.3,['cloud-lift'],'沿真实高差抬升','气团上升、膨胀并冷却，实际空气也可能绕行。'),b(.75,['cloud-lift'],'地形是条件，抬升不是降雨','先固定地形，再比较水汽条件。')],
    [b(0,['cloud-inflow'],'空气携带的是气态水','水汽符号并不代表已有云滴。'),b(.4,['cloud-condense'],'冷却后满足条件才成云','云滴出现与降雨到地面分别展开。'),b(.68,['cloud-precipitation'],'云滴增长，降水才可能发生','变化是原理过程，不是雨量读数。'),b(.87,['cloud-runoff'],'水到地面，沿坡向低处流动','地表去向仍受地形控制；真实可用水还要查地方条件。')],
    [b(0,['nyingchi'],'先看藏东南的位置与河谷','水汽来路、通道和高度共同参与地区环境。'),b(.34,['lhasa'],'再看拉萨河谷与周边高地','城市参照点不代表整个行政区。'),b(.66,['ngari'],'西部地区也有多种水汽来源','不能以风向单独判断全年干湿。')],
    [b(0,['circulation-plateau'],'城市仍在这片地形中','保留地区位置，带着水源、土地与通行问题继续。'),b(.5,['cloud-runoff'],'环境条件要接上人的实践','设施、组织、历史和选择共同形成生活。')],
  ],
  C5: [
    [b(0,['cloud-inflow'],'空气来到山地附近','有来流不等于下雨；初始水汽只是其中一个条件。'),b(.5,['cloud-lift'],'地形可能抬升空气','从没有云雨的起点逐步展开，才能辨认缺少哪一个环节。')],
    [b(0,['cloud-lift'],'沿坡上升并膨胀冷却','同一空气团随过程移动，先找抬升发生在哪里。'),b(.45,['cloud-condense'],'合适条件下形成云滴或冰晶','凝结形成云，不表示已经有降水抵达地面。'),b(.65,['cloud-precipitation'],'放大观察云滴增长与合并','较大水滴开始下落；示意没有真实滴径或雨量。'),b(.84,['cloud-runoff'],'随讲述展开地表去向','雨水沿坡汇流，切面里的箭头表示部分入渗；不是流域预测。')],
    [b(0,['cloud-lift'],'固定山体，只换初始水汽','空气仍会抬升，用同一进度才便于比较条件改变后的结果。'),b(.42,['cloud-condense','cloud-precipitation'],'比较成云与地面降水','本设定的较少水汽未形成地面降水，不能据此推广所有天气。','compare')],
    [b(0,['cloud-lift','cloud-condense','cloud-precipitation'],'把整条条件链连起来','地形参与云雨形成，但这个概念过程不是某一天的实况。'),b(.55,['cloud-precipitation'],'接下来还要读发生时间','真实天气需同时说明日期、地点与观测变量。')],
  ],
  C6: [
    [b(0,['cloud-inflow'],'同一地形，空气状态会变','现在从机制转向一次过程的前后，而不是改变山体。'),b(.47,['cloud-lift'],'先从来流起点认识先后','云与降水将在后续阶段出现；真实事件必须补充对应时刻的资料。')],
    [b(0,['cloud-inflow','cloud-lift'],'先看空气到达与抬升','同一解释顺序里，不同对象不必同时出现。'),b(.42,['cloud-condense'],'再看云逐步发展','成云是中间状态，需要与到达和降水分别辨认。'),b(.65,['cloud-precipitation'],'找到增长后的水滴下落','暂停和回拖同时改变雨滴与过程文字；不提供实况钟点。'),b(.86,['cloud-runoff'],'水到地表，继续读去向','切换到汇流与入渗，真实天气还需要对应时刻的观测。')],
    [b(0,['cloud-lift'],'从抬升位置推进到成云','暂停和推进便于辨认哪些对象开始出现。'),b(.44,['cloud-lift'],'回拖再推进，看改变了什么','过程进度是解释顺序；证据还需要时间、变量与测量范围。')],
    [b(0,['cloud-precipitation'],'一次天气只是一个短时状态','不能由一次天气推断全年情况。'),b(.48,['cloud-lift'],'保留地方，扩大到一年循环','下一段把时间尺度扩大，区分天气与重复的季节背景。')],
  ],
  C7: [
    [b(0,['climate-surface'],'同地一年，比较季节背景','固定地点与地形，避免把不同地方误当成同一地方的时间变化。'),b(.5,['climate-surface'],'季节背景与逐日天气分开','季节示意不把每一天压成四种固定天气。')],
    [b(0,['climate-surface'],'冬夏照射与表面状态','同一位置的背景会重复变化，地方还受海拔和坡向影响。'),b(.5,['climate-surface'],'重复背景不保证当天状态','某日是否下雪或降雨仍需当时天气资料。')],
    [b(0,['climate-surface'],'保持地点再切换冬夏','相同地点与显示尺度使比较更有意义。'),b(.5,['climate-surface'],'把季节示意接回资料问题','后续检验需要相同地点与口径，不能把模型积雪当作记录。')],
    [b(0,['climate-surface'],'一年循环也有长期背景','季节会重复，多年背景仍可能变化。'),b(.5,['climate-surface'],'下一段改问长期驱动','时间尺度改变后，解释要从季节几何转向能量扰动与系统响应。')],
  ],
  C8: [
    [b(0,['climate-surface','climate-atmosphere'],'从一年重复转到多年背景','现代全球变暖的驱动问题与季节循环不同，需要回到能量收支。'),b(.52,['climate-surface'],'先理解驱动，再读地方响应','高原上的冰雪、水与生态不是同一种对象，响应也需要分别研究。')],
    [b(0,['climate-atmosphere','climate-space'],'驱动改变向外散失的条件','温室气体影响能量交换条件，系统还会继续调整。'),b(.5,['climate-surface'],'响应有不同时间与反馈','概念箭头不提供某处冰川的变化量；地方变化还需要观测证据。')],
    [b(0,['climate-surface','climate-atmosphere','climate-space'],'区分最初驱动与后续响应','沿能量方向复述关系，先说明参与对象，再讨论地方结果。'),b(.5,['climate-surface'],'一次暖天气不代表长期趋势','时间尺度与资料范围必须对应问题。')],
    [b(0,['climate-surface'],'机制以后还需要地方证据','下一段在整体地图找色林错，使用有年份的已发表面积记录。'),b(.5,['climate-surface'],'证据先核对对象、年份和单位','两期状态能说明差异，变化原因还需独立证据。')],
  ],
  C9: [
    [b(0,['atlas:siling-co-study'],'先定位色林错研究区','标记用于研究区定位；画面没有重建两期湖岸。'),b(.49,['atlas:siling-co-study'],'再读同一湖泊的已发表面积','比较变量是湖面面积，数值来自现有研究资料。')],
    [b(0,['atlas:siling-co-study'],'两期面积使用相同单位与零点','共同基准让柱形可比较，年份与资料身份必须同时保留。'),b(.52,['atlas:siling-co-study'],'两期状态之间不补造年份','已经发表的汇总值不等于本产品重算原始影像，也不提供中间轨迹。')],
    [b(0,['atlas:siling-co-study'],'固定湖泊，分别选择两期','操作切换的是研究记录，不是模拟湖岸运动。'),b(.5,['atlas:siling-co-study'],'面积变化与原因判断分开','面积不等于体积；归因和预测还需要其他独立资料。')],
    [b(0,['atlas:siling-co-study'],'保留证据能够支持的范围','地点、年份和变量共同决定结论适用到哪里。'),b(.5,['atlas:siling-co-study'],'回到地区差异时沿用同样口径','下一个问题继续把机制、地形和不同地方材料放在一起。')],
  ],
  E1: [
    [b(0,['nyingchi'],'先从藏东南定位一个入口','城区点不是整个地区的气候范围，同一区域也有不同坡面与高度。'),b(.46,['nyingchi','nagqu','ngari'],'用共同问题比较不同地方','读位置与地形之后，再问高度、来流和水汽怎样组合。','compare')],
    [b(0,['nyingchi','nagqu'],'同一高程底图读地形','颜色表示海拔，不同时表示温度、雨量和植被。','compare'),b(.5,['nyingchi'],'地形和地方材料相互参照','一处谷地不能概括全部林芝，其他环境变量需对应资料。')],
    [b(0,['nyingchi','nagqu'],'切换地点，保留同一问题','改变地点时保持底图与观察主题，才不会悄悄更换比较内容。','compare'),b(.5,['nagqu','ngari'],'城市参照帮助进入地区材料','定位点是阅读入口，高程抽样和城镇参照各有范围。','compare')],
    [b(0,['nagqu','nyingchi'],'差异要有公平的比较基准','地点、时期、变量与统计口径都要对应，不能只看两种画面。','compare'),b(.5,['nagqu','nyingchi'],'下一段固定条件再做对照','同一种变量和适用时期让差异判断可检验。','compare')],
  ],
  E2: [
    [b(0,['nagqu'],'先说明正在比较什么','温度、水分与地形是不同变量，所用时期与范围要一致。'),b(.5,['nagqu'],'地点改变，问题保持','先保留地点甲与同一高程底图，再确认当前地点乙；地形参照不能替代气候统计。')],
    [b(0,['nagqu','nyingchi'],'同时定位两地','相同显示尺度便于读高低与相对位置，海拔颜色不是气温。','compare'),b(.52,['nagqu','nyingchi'],'当天与多年平均不可直接混比','资料时间、地点高度和统计范围必须说明。','compare')],
    [b(0,['nagqu','nyingchi'],'固定地点甲，再改变地点乙','固定一端和底图可以减少比较条件变化。','compare'),b(.5,['nagqu','ngari'],'同样的问题读另一个地区','城区位置帮助找材料，不提供整个行政区的气候数值。','compare')],
    [b(0,['nagqu','nyingchi'],'从自然差异提出生活问题','环境提供水热、地形和通道条件，但不能直接推算社会和文化。','compare'),b(.5,['lhasa'],'把问题落到水源与聚落','接下来辨认可能条件，再研究技术、组织和人的历史选择。')],
  ],
  E3: [
    [b(0,['living-water','living-land'],'先找水与较缓地面','自然条件提供机会与限制，还没有决定怎样建造、使用和组织。','compare'),b(.48,['living-slope','living-land'],'同一场地也有不同起伏','这是对照条件，不把模型设定当作山南或真实社区的环境。','compare')],
    [b(0,['living-water'],'有水源，还要接到使用地点','水的存在提供前提，取用需要通行、设施和人的行动。'),b(.08,['living-water','living-access'],'先在水源旁把容器装水','容器从空到有水；地形与水源没有改变。'),b(.18,['living-access'],'水随人沿坡移动','携水需要人的劳动，水没有自行爬向高处。'),b(.44,['living-houses','living-transfer'],'到用水处，再倒入储水容器','携水减少、储水增加；生活联系由设施与人的行动组织。')],
    [b(0,['living-slope','living-water'],'固定没有改变的自然条件','接下来只切换使用组织，先保留坡地和水源作为共同参照。','compare'),b(.43,['living-access','living-houses'],'比较改变的是设施与使用联系','当前先读分别使用的联系；切到共同组织以后，再看取水点、通行和储水如何改变。')],
    [b(0,['living-water','living-access','living-houses'],'自然与人的行动已经接续','条件模型说明需要检查哪些关系，不能代替真实地方的调查。'),b(.55,['living-slope','living-land'],'把问题重新带回真实山川','下一段换用公开高程，继续读高低与谷地；当前几何仍是条件设定。','compare')],
  ],
  P1: [
    [b(0,['local-overview'],'先保留西藏与周边的整体','高程概览给出大范围来路，局部窗口没有替换整个高原。'),b(.48,['local-window'],'金色框内接入更密的林芝网格','窗口与周围地形共享经纬位置，显示间距不是测绘精度。')],
    [b(0,['local-overview','local-window'],'从完整地形找到局部窗口','整体与局部的来源抽样不同，显示范围与垂直夸张都明确保留。','compare'),b(.3,['local-window'],'沿同一坐标靠近林芝山地','颜色表示海拔，没有从颜色推出植被、天气或生活类型。'),b(.48,['local-town','local-window'],'城区点只提供位置参照','周围山地来自公开网格，城区点不是全部地区或一处景点入口。','compare'),b(.7,['local-profile','local-slope','local-valley'],'移动南北线，比较实际网格高低','较高与较低样本随同一条切线计算，没有命名峰顶或完整河网。','compare')],
    [b(0,['local-profile'],'固定方向，再换一条切线','同一基准上的高差可以比较；切面不是地下地质资料。'),b(.48,['local-slope','local-valley'],'同时读较高与较低样本','采样位置与整片地形一起阅读，不把一处概括为全地区。','compare')],
    [b(0,['local-window','local-profile'],'高程描述今天可见的起伏','形态的形成还需要地质、年代与其他观测材料。','compare'),b(.5,['local-valley'],'下一段明确切换到地貌原理','概念河谷解释汇水和物质变化，不重演林芝或札达的真实历史。')],
  ],
  P2: [
    [b(0,['landform-slope'],'先保留初始河谷轮廓','坡面、河道与低处的相对位置，为比较形成过程建立共同参照。'),b(.5,['landform-slope'],'概念河谷先回答一般关系','它不对应真实峡谷，没有侵蚀米数或形成年份。')],
    [b(0,['landform-channel'],'沿水路找下移方向','水的移动与被搬运的物质要分别观察。'),b(.25,['landform-sediment','landform-channel'],'物质进入河道并被搬运','粒子提供方向参照，不表示含沙量或真实流量。'),b(.5,['landform-slope','landform-channel'],'比较改变的谷地轮廓','同一地表逐步局部下切，时间进度只组织解释。','compare'),b(.72,['landform-deposit'],'较低处逐渐出现堆积','搬运与堆积改变空间，具体地方的成因仍需地质和测绘证据。')],
    [b(0,['landform-channel','landform-deposit'],'回拖比较水路与低处堆积','固定同一河谷，检查轮廓与物质位置分别怎样改变。','compare'),b(.46,['landform-slope','landform-sediment'],'形态与形成证据分别核对','动画速度不是侵蚀速率，相似外形也可能有不同来历。','compare')],
    [b(0,['landform-channel','landform-deposit'],'过程留下可继续使用的空间','自然作用解释条件，人的取用、协作与意义需要继续研究。'),b(.52,['landform-slope'],'从自然条件进入人的实践','模型没有解释地名、信仰和地方记忆，下一段用生活关系提出这些问题。')],
  ],
  P3: [
    [b(0,['living-water','living-land'],'保留水与可利用的地面','自然过程留下条件，怎样取用还需要设施与人的选择。','compare'),b(.48,['living-slope'],'模型不替真实地方编写历史','具体地区材料提供入口，山坡几何不是任何真实村落的复原。')],
    [b(0,['living-water'],'先认自然水源条件','使用关系尚未展开，水源不会自行组织生活。'),b(.32,['living-access','living-work'],'取用、通行与工作接起来','共用构件组织行动，也需要维护与规则。'),b(.72,['living-houses','living-shared'],'生活与共同设施同时出现','自然条件保持相同，人的设施与安排可以改变。','compare'),b(.86,['living-memory'],'意义需要具体参与者与材料','空白记录处没有代写地名、故事或信仰，下一步要查地方证据。')],
    [b(0,['living-memory'],'从空白记录处提出文化问题','模型没有替社区写下故事，记录需要使用者、时期与资料。'),b(.46,['living-houses','living-memory'],'由使用走向建造、学习与维护','生活空间提出具体问题，接下来沿真实材料认识文化实践。')],
    [b(0,['living-access','living-houses'],'环境与人的行动共同进入认识','条件解释部分机会与限制，文化还需要创造、交流与历史选择。'),b(.5,['living-memory'],'带着证据问题走近布达拉宫','下一段在拉萨红山的建筑案例中，分清特征、人物与年代。')],
  ],
  K1: [
    [b(0,['palace-hill','palace-terrace'],'先把建筑放回拉萨红山','山体与台地提供空间关系，特征图没有测量坡度和基础尺寸。','compare'),b(.48,['palace-white','palace-red'],'再辨认白宫与红宫','形体表达有出处的相对关系，不提供室内平面或真实门窗数。','compare')],
    [b(0,['palace-white','palace-red'],'先辨认位置与不同使用','红宫偏西且较高；具体用途依据遗产材料，不能只凭颜色推断。','compare'),b(.3,['palace-history','palace-white'],'1645—1648：重建、白宫与迁入','五世达赖喇嘛与白宫的来历由评估材料支撑，不是施工动画。','compare'),b(.6,['palace-history','palace-red'],'1694：桑结嘉措组织的红宫建设','红宫完成与白宫重建分开阅读，人物与纪念用途进入同一建筑群。','compare'),b(.83,['palace-hill','palace-white','palace-red'],'把环境、用途与历史一起解释','山地参与形成条件；人物、工艺和时代选择同样不能省略。','compare')],
    [b(0,['palace-white','palace-red'],'展开体量，再分别选择分区','形体拆开是观察方式，没有揭开未知房间或仿造测绘细节。','compare'),b(.48,['palace-hill','palace-terrace'],'把分区重新接回山体与进入空间','院落构造另有原理视角；它不冒充布达拉宫的结构剖面。','compare')],
    [b(0,['palace-history'],'建筑也是累积的历史材料','人物、功能与后续变化参与解释今天看到的建筑。'),b(.5,['palace-white','palace-red'],'带着证据问题继续认识交流','下一段转到托林材料与通用学习模型，地域和模型身份分别标明。','compare')],
  ],
  K2: [
    [b(0,['courtyard'],'从具体建筑转向交流原理','布达拉宫案例之后，换用通用院落解释交流；它不复原任何人的历史课堂。'),b(.32,['culture-text'],'空白载体与接收它的工作桌','载体用于解释知识传递，没有古代经文或假定的真实行程。'),b(.72,['culture-text'],'具体人物与年代另由史料核对','阿底峡与托林等真实材料在旁边提供入口，模型没有复原历史课堂。')],
    [b(0,['culture-text'],'先让载体来到同一桌面','传入提供起点，接下来还要看谁怎样理解和使用。'),b(.35,['culture-learning'],'译写、选择与地方学习','对照页和学习者同时加入，传播不是把外来形式原样搬进建筑。'),b(.73,['hall'],'整理后的载体走向空间实践','使用者把学习带进厅堂前，当地语言、传统与组织继续塑造实践。')],
    [b(0,['culture-text','culture-learning'],'选择工作桌，再核对真实交流材料','同一桌面帮助区分载体与学习过程，史料提供人物、年代和作品身份。'),b(.5,['culture-text'],'行程年代与后来作品年代分别读','已有材料形成于不同时刻，不能由模型连线代替完整传播史。')],
    [b(0,['culture-learning','hall'],'知识通过使用者进入空间','交流和学习之后，具体文字、图像与构造仍需相应作品资料。'),b(.5,['culture-text'],'下一段用真实经板认识载体保护','拆开木护板与书页；真实物品的图像、材料与年代由馆藏记录核对。')],
  ],
  K3: [
    [b(0,['culture-craft'],'先对照约12世纪早期的真实木经板','馆藏1987.407.6提供年代、材料与用途；旁边原图不是模型生成。'),b(.5,['culture-craft'],'把护板与书页的保护关系展开','两块护板和空白页只是原理，不补造这件藏品的原配书册。')],
    [b(0,['culture-craft'],'先辨认护板与分散的书页','上板悬置，下板承托；书页没有未知经文。'),b(.32,['culture-craft'],'书页逐步整理、对齐并叠放','载体的制作与整理参与文本流传，模型不提供实物叶数。'),b(.68,['culture-craft'],'上方木护板合拢，书页得到覆盖','用途可由关系演示理解；雕刻内容与颜料痕迹要对照真实馆藏。')],
    [b(0,['culture-craft'],'回拖展开，再推进到合拢','比较同一组护板与书页，图像与材料身份另由原物记录核对。'),b(.5,['culture-craft'],'制作年代和入藏编号分别读','约12世纪早期是馆方定年；1987.407.6是藏品号。')],
    [b(0,['culture-craft'],'文本也通过载体制作与保护留下来','从交流和学习接到可保存的物件，仍需人的使用和照料。'),b(.5,['culture-craft'],'继续问谁实践、怎样学习与传承','日常实践提出历史问题，物品制作与今天记录各有年代。')],
  ],
  K4: [
    [b(0,['opera-space'],'物件保存之后，还需要人的实践','藏戏资料连接讲述、表演、观看和不同场地。'),b(.38,['opera-performance'],'金色讲述者 · 青色表演角色','颜色帮助辨认分工，不指定真实服饰或演员。'),b(.7,['opera-space'],'空间关系示意，不规定统一排布','角色数量和圆形安排是教学设计；没有复原具体演出。')],
    [b(0,['opera-performance'],'讲述与表演共同表达内容','不同角色在同一空间配合，具体唱腔与动作回到真实记录。'),b(.2,['opera-learning'],'学习者走近示范位置','珊瑚色角色从观看进入学习关系，注意他与示范者的距离。'),b(.53,['opera-learning'],'从观看到参与，需要实践机会','进入练习位置并不代表已经掌握技能，示范者仍在场。'),b(.76,['opera-learning'],'保护措施与实施成效分别核对','2009年决定提出培训等措施，效果还需要后续教学与调查记录。')],
    [b(0,['opera-space'],'换场地，固定同一组参与者','切换正面舞台关系，比较观看方向和活动位置。'),b(.47,['opera-performance','opera-learning'],'学习与配合的需要仍然存在','布局比较不代表传统必然消失，也不是场地演变年表。','compare')],
    [b(0,['opera-learning'],'文化需要具体人持续实践','取水、建造、交流、制作和学习接成认识人的线索。'),b(.48,['opera-space'],'2009年是列入名录年，不是起源年','接下来用历史材料区分活动、实物与后来记录的年代。')],
  ],
  H1: [
    [b(0,['history-context'],'先把发现放回位置与层次','剖面解释情境怎样关联，未复原尼阿底真实地层。'),b(.48,['history-context'],'证据需要发现位置、样本与年代','一件物体无法独自解释整个人群的历史，先建立可检查的关联。')],
    [b(0,['history-context'],'打开情境，再关联材料','层次逐渐展开，器物要和具体发现情境一起阅读。'),b(.43,['history-tool','history-dating'],'器物接到样本与研究记录','尼阿底活动研究与其他地区的全年生活研究，各有地点、时期与结论范围。'),b(.73,['history-inference'],'活动、定居与族群判断分开','高海拔活动证据不自动证明全年定居或现代族群来源。')],
    [b(0,['history-inference'],'换问题，检查证据是否足够','灰色材料位表示仍需核查，不是模型替历史补造答案。'),b(.46,['history-tool','history-dating','history-inference'],'结论要沿材料与方法逐级核对','活动、全年生活与族群问题需要不同证据，不能直接跨越。')],
    [b(0,['history-context','history-dating'],'材料给历史认识建立来路','先读证据怎样关联，再把问题带进更长的历史前后。'),b(.52,['history-inference'],'变化有不同材料与节奏','下一段分别研究政治、知识信仰与生活，不能假设它们同时改变。')],
  ],
  H2: [
    [b(0,['history-periods'],'九个材料夹只排列前后','间距不表示历时相等，模型也没有重建古代疆域。'),b(.51,['history-politics','history-knowledge','history-practice'],'同一时期保留三个问题','政治组织、知识信仰与日常生活各有材料，分期提供方向而非统一答案。','compare')],
    [b(0,['history-politics','history-knowledge','history-practice'],'把同一时期展开为三条线索','政治、知识与生活的变化可以有不同发生时间。','compare'),b(.39,['history-knowledge','history-politics'],'交流与组织变化分别核对','人物、文本与制度的关联，需要各自的地点和证据。','compare'),b(.66,['history-politics','history-practice'],'政治节点与建筑活动不合并','已有材料中的不同年份和发生地，应分别保留，不能合成一件事。','compare')],
    [b(0,['history-periods'],'换时期，保留同一组问题','选择十至十二世纪以后，继续用三类线索读材料。'),b(.46,['history-politics','history-knowledge','history-practice'],'延续与变化可以同时出现','分期帮助定位，不能替代人物、事件与地方经验的证据。','compare')],
    [b(0,['history-periods'],'从全史找到具体案例的前后','时期索引已经建立来路，接下来深入会盟的材料链。'),b(.49,['history-knowledge'],'再问材料怎样保存和传递','下一段分开事件、立碑、复制与今天的研究，不把材料日期合并。')],
  ],
  H3: [
    [b(0,['history-event'],'先读821年与822年的会盟事件','时间卡表示两个事件节点，不是路线或领土图。'),b(.43,['history-stele-body'],'再读823年立碑的载体时间','无字碑体解释材料保存，没有复刻原碑尺寸、装饰与文字。'),b(.74,['history-event','history-stele-body'],'事件日期与材料日期分别保留','行动与保存载体不是同一对象，也不必形成于同一时刻。','compare')],
    [b(0,['history-event','history-stele-body'],'事件记录进入物质载体','碑刻把文字记录以材料形式保存，原文需要真实资料核对。'),b(.34,['history-stele-body','history-rubbing'],'复制材料从碑刻关系中展开','拓本有自己的制作与保存情境，不能沿用立碑年份作为复制日期。'),b(.73,['history-rubbing','history-reading'],'今天的认识还经过馆藏和研究','复制、原文与说明相互参照，空白模型不替代真实文字。')],
    [b(0,['history-rubbing','history-reading'],'选择拓本，再读真实材料说明','馆藏记录帮助确认原碑、事件与复制材料各自的身份。'),b(.47,['history-stele-body','history-rubbing'],'立碑与拓本不是同一时间形成','模型解释保存与复制机制，具体原文和拓本年代需回到来源。','compare')],
    [b(0,['history-rubbing','history-reading'],'材料怎样成为今天可读的历史','会盟案例建立了事件、载体、复制与解读的认识链。'),b(.5,['history-reading'],'把分层核对的方法带进近现代','文件、事件、实施与地方生活还需分别研究，不能由单一年份自动推出经历。')],
  ],
  H4: [
    [b(0,['history-document'],'先分开1951、1959与1965的材料','协议、机构变化与行政建制不是同一种文件或事件。'),b(.4,['history-document','history-institution'],'材料性质与制度层次分别确认','阅读入口不改变事件地点，1951年协议签订地点仍应按材料核对。'),b(.75,['history-household'],'社会经历需要自己的证据','生活单元保持不变，模型不按年份伪造家庭变化。')],
    [b(0,['history-document'],'制度文件确认具体节点','先核对材料是什么，再研究它和其他层次的关系。'),b(.28,['history-institution'],'从制度展开到地方组织与实施','实体层次逐步分开，联系表示需要核对的问题。'),b(.51,['history-household'],'地方生活需要具体调查与时期','同一房屋没有随文件年份增减，实际经历仍需调查、统计和文献。'),b(.73,['history-inference'],'从节点到影响，还有证据要补齐','文件、实施与不同人的经验不能直接跨尺度推断。')],
    [b(0,['history-document','history-institution'],'切换节点，再比较材料身份','发生地点、来源性质与能够支持的判断要分别核查。','compare'),b(.48,['history-household','history-inference'],'家庭经历不能由一份制度材料代替','政府文件、学术研究与社区经验有各自语境，规划与实际影响也要分开。')],
    [b(0,['history-document','history-household'],'把环境、文化与历史的解释放在一起','不同尺度的材料可以相互联系，也不能互相替代。','compare'),b(.51,['history-inference'],'带着涉及谁、何时与何种证据继续','下一段把整条认识带回周边联系和今天的发展。')],
  ],
  R1: [
    [b(0,['connection-ridge'],'把上下游放回连续山地','山脊、坡面与低处保留在同一场地，水的联系需要先有高低背景。'),b(.45,['connection-rain','connection-ridge'],'来水进入山地环境','降水只是来水的一部分；雨滴表示方向，不表示雅鲁藏布江各水源的实测贡献。')],
    [b(0,['connection-ridge'],'先保留分水与汇水的地形背景','原理地形没有复刻真实流域边界，山脊与坡面用于解释水向哪里移动。'),b(.28,['connection-runoff','connection-tributary'],'坡面来水进入支流和干流','沿坡向低处汇集，水路的接续与蓝色粒子数量是不同信息。'),b(.68,['connection-confluence','connection-downstream'],'汇合以后仍沿同一高差向下','干支流汇合把上游过程接到下游；来源比例与时序仍需同步观测。'),b(.86,['connection-downstream','connection-use'],'水到低处，人还要取用和搬运','取用者的移动接续自然水路，房屋位置不意味着水会自行向上流。')],
    [b(0,['connection-ridge','connection-runoff'],'回拖比较来水的起点','先认山脊与坡面，再推进看水路接续；回拖不会改变完整地形。'),b(.4,['connection-confluence','connection-downstream'],'比较汇合前后与上下游','流向可以从高差解释，雨雪、冻土和冰川贡献要由各自记录研究。'),b(.75,['connection-use'],'把水路与人的劳动分开看','搬运实体解释怎样取用，不报告真实取水量、供水条件或流量。')],
    [b(0,['connection-tributary','connection-downstream'],'同一流域连接不同地方','共同来水与上下游使用把自然问题接到人的关系，具体影响仍要有时期和资料。'),b(.5,['connection-use','connection-ridge'],'由水的联系转向人的通行','人要越过地形并得到接应，下一段把通行机会与实际交换条件分开。')],
  ],
  R2: [
    [b(0,['connection-pass'],'先认同一山口的两侧','山口模型解释局部通行约束，没有复刻阿底峡的道路或具体行程。'),b(.48,['connection-foothill','connection-carrier'],'地形机会仍需要人的行动','人物与载体先到坡脚，真实传播还需要动机、接应、学习和材料。')],
    [b(0,['connection-carrier','connection-foothill'],'载体先从一侧到坡脚','移动需要沿可以通行的地面组织，不能由两个节点直接补出古道。'),b(.34,['connection-carrier','connection-pass'],'有限通口约束通过方式','同一载体经过低口，地形、运输技术与补给条件共同参与通行。'),b(.7,['connection-transfer','connection-organization'],'到另一侧还要接应和转交','货物、接收者与记录桌把到达接到交换；空白载体不冒充历史文本。')],
    [b(0,['connection-foothill','connection-pass'],'退回坡脚，再看通过山口','地形不随阶段改变，回拖用来比较人的到达与通过过程。'),b(.48,['connection-transfer','connection-organization'],'核对转交，而不是只看线路','节点材料能支持部分历史联系，具体路线和传播过程需要分别寻找证据。')],
    [b(0,['connection-transfer'],'交换包含接收、使用与选择','载体通过以后，人的学习、翻译与地方实践仍不能由路径代替。'),b(.5,['connection-pass','connection-organization'],'由通行条件进入共同事务','同一地形联系不同参与者，下一段继续问谁使用、谁观测、怎样协作。')],
  ],
  R3: [
    [b(0,['connection-slope','connection-water'],'把坡面物料与上下游放在一起','真实色东普案例提出了问题；眼前原理坡料不代表崩塌形状、体积或速度。'),b(.48,['connection-upstream'],'一个取用者只提供一个视角','坡面与河道相连，但单一位置无法覆盖所有依赖与影响，也不能预先判定是否堵江。')],
    [b(0,['connection-slope'],'先保留高处的同一批坡料','料块尚在原位，接下来只展开一种可能关系，并不声称每次崩塌都会进入河道。'),b(.34,['connection-slope','connection-ecology','connection-downstream'],'坡料向低处移动，也把下游纳入问题','物料沿现有地形下降；生态与人的依赖不因关注而增减，水面也没有模拟水位响应。'),b(.7,['connection-obstruction','connection-observation'],'到河形成窄口，还要区分过程与判断','本设定的窄口是实体关系；现实坡面变化、到河与是否阻塞仍需多点同期记录核对。'),b(.84,['connection-records','connection-observation'],'让记录相互对读，而非由一信号推全程','空白记录板提示需要研究资料，不能由几何窄口推出真实水位、灾情或预警结果。')],
    [b(0,['connection-slope','connection-obstruction'],'回拖追踪同一批坡料从高处到河槽','窄口由实际到河料块构成，回拖会把它们带回坡面，没有额外生成堆积物。','compare'),b(.4,['connection-ecology','connection-downstream'],'物理联系仍需明确涉及哪些对象','真实影响需要位置、范围和时期；模型没有计算任何一方的损益或改变水面高度。','compare'),b(.75,['connection-observation','connection-records'],'将坡面、河道与记录分别核对','日期、变量与方法决定材料能支持什么判断，教学场景不替真实研究发出预警。')],
    [b(0,['connection-water','connection-records'],'自然过程需要与人的使用和观测合看','具体案例把过程、证据与协作组织接起来，地理位置才成为可以研究的关系。'),b(.5,['connection-ridge','connection-observation'],'将持续观测问题带到高原工程','下一段转向含冰地层与铁路工程，仍要把原理解释和长期监测分开。')],
  ],
  M1: [
    [b(0,['rail-track','rail-ground'],'铁路必须落在具体地层条件上','开通日期可以核实，线路与地层的教学剖面不代表真实工点或工程尺寸。'),b(.48,['rail-ground','rail-ice'],'把地面与含冰地层一起看','地层热条件参与工程问题；青藏高原和铁路联系超出西藏自治区范围。')],
    [b(0,['rail-ground','rail-ice'],'先分开地表与地下含冰条件','地下剖开用于解释承托与热条件，不是实测冻土厚度或沉降预测。'),b(.3,['rail-rock','rail-air'],'块石空隙在合适条件下参与散热','冷暖季空气与地层的热条件不同，概念颗粒没有温度数值或散热效率。'),b(.68,['rail-track','rail-operation','rail-lastmile'],'工程之后，还要接上运营与末端到达','热条件需要持续观测；开通事件也不能代替当前停站、班次与接驳资料。')],
    [b(0,['rail-rock','rail-air'],'固定块石构造，比较冷暖条件','切换季节改变热交换情境，模型没有改变真实年份、气象记录或工程方案。','compare'),b(.46,['rail-ice','rail-air'],'热扰动样块提示承托风险','样块变化只解释热条件关系，不表示实际地层沉降量或可用寿命。'),b(.77,['rail-rock'],'再推进，才进入运营与接驳阶段','当前仍停在热条件阶段；真实地温、沉降和服务状态都需要对应日期的资料。')],
    [b(0,['rail-operation','rail-lastmile'],'网络继续接到人的生活地点','同一教学场景把列车停靠与末端步行分开，实际到达还需现实服务条件。'),b(.5,['rail-lastmile'],'从交通网络走向家庭与公共服务','下一段用具名访谈提出使用问题，再拆开设施、人员与人的到达条件。')],
  ],
  M2: [
    [b(0,['development-facility'],'开通事件不能代替使用经验','拉林铁路历史报道与具名访谈提供具体入口，通用设施没有复原彩门村。'),b(.5,['development-facility','development-community'],'不同人的需求还要分别研究','受访者的期待与使用不能自动代表所有居民，模型继续拆开实际使用条件。','compare')],
    [b(0,['development-facility'],'先认空间中已经有的设施','设施存在是起点，不能单由建筑推断使用情况。'),b(.35,['development-staff'],'再加入人员与开放条件','建筑需要实际运行，才有条件提供相应服务。'),b(.7,['development-lastmile','development-community'],'继续问使用者能否到达','路程、交通与个人条件影响实际使用；模型不报告真实覆盖人口。')],
    [b(0,['development-facility','development-staff'],'回拖比较人员与开放是否具备','同一设施保留，回到中间阶段可以看见还缺少到达接段。'),b(.5,['development-lastmile','development-community'],'人的实际使用还需要自己的证据','具名访谈、家庭调查和地区统计尺度不同，不能相互代替。')],
    [b(0,['development-facility','development-community'],'设施进入生活以后仍要持续维护','使用经验把建设条件接到具体人，也带来文化、生态与维护问题。'),b(.5,['development-staff','development-lastmile'],'从能否使用进入收益和影响评估','下一段借拉萨遗产保护材料，继续分开措施、状态与实际结果。')],
  ],
  M3: [
    [b(0,['development-activity','development-benefit'],'同一项活动先提出使用与收益问题','拉萨遗产材料提供具体案例，中央活动平台没有复原任何真实保护工程。'),b(.5,['development-community'],'遗产还与维护者和使用者有关','保存建筑外观不能代替历史环境、日常使用与长期维护的材料。')],
    [b(0,['development-benefit'],'保护措施回应需求，也会带来影响','真实措施的目的、实施状态与结果需要分别阅读，不能只看收益。'),b(.34,['development-ecology'],'把环境对象和维护问题加入','环境对象没有随关注而改善；具体影响必须由范围、方法与材料判断。'),b(.7,['development-community'],'地方生活与历史环境也要纳入','报告、建议与已经完成的行动属于不同状态，不把拟议调整写成既成事实。')],
    [b(0,['development-benefit'],'回拖到只展开收益的问题','保持同一活动，再逐项加入此前遗漏的关系，不改变原有实体来假造效果。'),b(.48,['development-ecology','development-community'],'范围完整仍不等于评估结论','对照拉萨案例核对措施、材料、环境和使用者，模型没有合成一个总分。','compare')],
    [b(0,['development-activity','development-community'],'将自然、人文与维护接回地方问题','发展与保护的解释需要具体对象、证据与人的经验，接下来由问题选择探索地点。'),b(.5,['development-benefit','development-community'],'让每个候选地点回答一个问题','认识顺序可以保存，实际访问还要独立检查日期、服务与条件。')],
  ],
  T1: [
    [b(0,['travel-landform','travel-water'],'先把探索问题放回整体环境','同一教学河谷保留山、水与生活空间，不把拉萨、山南和林芝挤成一个真实地点。'),b(.48,['travel-settlement','travel-heritage'],'由使用与建筑选择想研究的关系','实际地点承接不同问题，候选应能回到前面建立的机制和材料。')],
    [b(0,['travel-landform','travel-water'],'先读山地与水的共同背景','环境条件用于提出问题，气候规律不能由一次天气或模型水色代替。'),b(.34,['travel-water','travel-settlement'],'把环境接到人的使用空间','自然条件并未决定全部生活方式，还需询问设施、组织与地方选择。'),b(.68,['travel-heritage'],'打开建筑，再问空间怎样被使用','屋顶逐步抬起让入口与院内关系可读，模型没有复原任何真实遗产。'),b(.85,['travel-heritage','travel-question'],'将用途与材料问题留下来','观察目的要能对应证据，空白问题桌不会自动生成真实地方的历史。')],
    [b(0,['travel-question'],'先保存自己的问题与候选','记录由实际输入形成，模型中的建筑与空白桌不自动算作已经选择的站点。'),b(.5,['travel-heritage','travel-question'],'每个候选都能回到一个认识入口','跨地区知识联系可以保留，但距离与行程不能由主题相似直接合并。')],
    [b(0,['travel-question','travel-heritage'],'用为什么去决定前后认识顺序','让前后地点补充同一问题，观察目的和材料入口应一起保存。'),b(.5,['travel-landform'],'知识顺序还需要真实到达条件','下一段保留整体河谷，单独拆开主通道、接驳与入口访问条件。')],
  ],
  T2: [
    [b(0,['travel-landform','travel-corridor'],'把知识顺序放回到达条件','历史开通报道提供区域联系背景，不保证任何日期都能直达每个候选地点。'),b(.5,['travel-corridor'],'主通道只是一段出行条件','教学道路和车辆解释接续关系，没有提供真实道路、班次或耗时。')],
    [b(0,['travel-corridor'],'先沿主通道到达节点','载体的前进解释一段联系，真实服务仍需要日期、票务与使用条件。'),b(.34,['travel-transfer'],'转乘与接驳是另一组条件','不同载体接续另一段路，接驳并不因主通道开通而自动存在。'),b(.7,['travel-lastmile'],'最后步行到入口外，访问仍待核实','道路与人的到达不等于获准进入，闸口保持未核实状态。')],
    [b(0,['travel-candidates'],'候选数量只随实际选择变化','添加、删除和重排实际站点及问题，示例A与B不会算进个人候选。'),b(.5,['travel-corridor','travel-transfer','travel-lastmile'],'按接续关系逐段核实访问条件','知识顺序可以调整，服务、道路、预约与开放仍需逐段检查。')],
    [b(0,['travel-candidates'],'把顺序、问题和出处一起保留','实际候选来自用户输入，空计划不被示意道路变成已经安排的行程。'),b(.5,['travel-lastmile'],'未核实的入口条件也要保存','保护建议或历史开通材料不能替代当前访问许可，下一段分别整理知识、条件与个人记录。')],
  ],
  T3: [
    [b(0,['travel-candidates'],'先确认自己选择的地点与问题','实际候选承接前面的认识目的，示意地形不替用户补出站点和旅行经历。'),b(.5,['travel-evidence'],'知识、条件与观察需要不同身份','材料柜先保留为什么这样认识；出行条件和个人经历还要分别填写。')],
    [b(0,['travel-evidence'],'认识材料先保留出处与问题','打开的是通用材料柜，不是出土文物或某件真实馆藏；具体知识沿来源继续核对。'),b(.34,['travel-conditions'],'日期、交通和开放另列待核实项','状态桌加入以后仍保留未知，没有由动画自动确认服务或访问许可。'),b(.7,['travel-record'],'个人笔记由自己的观察填写','打开空白笔记不等于已经旅行，也不自动生成景点体验或旅行记录。')],
    [b(0,['travel-conditions','travel-candidates'],'保存日期、意向与未核实事项','实际候选顺序和条件应可以继续编辑，保存成功不代表交通或预约已核验。'),b(.5,['travel-record','travel-evidence'],'个人记录仍能回到知识出处','导出与恢复保留问题、来源和自己的备注，不将未完成项改写为事实。')],
    [b(0,['travel-evidence','travel-record'],'从新观察回到相应章节与资料','个人记录可以支持或修正原解释，仍需区分观察范围与可推广的结论。'),b(.5,['travel-candidates','travel-record'],'让自己的问题接续整条认识主线','环境、人的历史与当代选择已经相接，下一次从保留的问题继续补充。')],
  ],
};

/** Cue IDs and role order come from the same source as the actual MiniMax audio. */
export const visualGuidePlans: Readonly<Record<string, readonly VisualGuideBeat[]>> = Object.fromEntries(
  Object.values(journeySteps).flatMap(step => step.cues.map((cue, index) =>
    [cue.id,step.stepId==='G1'?earthNarrationBeats(cue.id,cue.narration).map(beat=>({...beat,relation:beat.targets.length>1?'compare':'focus'})):narrationPhraseBindings(cue.id,cue.narration).length?narrationPhraseBindings(cue.id,cue.narration):stepBeats[step.stepId][index]])),
);

/** Deterministic for seek, pause and replay; no Date/performance/rAF clock is used. */
export function visualGuideForCue(cueId: string, progress: number, active = true,timing?:EarthNarrationTiming): VisualGuideState | undefined {
  const beats = visualGuidePlans[cueId];
  if (!beats?.length) return undefined;
  const p = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress));
  if(cueId.startsWith('G1-')){const cue=journeySteps.G1.cues.find(cue=>cue.id===cueId),moment=cue&&earthNarrationMoment(cueId,cue.narration,p,timing);if(moment)return {cueId,progress:p,active,beatId:moment.phraseId,targets:moment.targets,relation:moment.relation,drawProgress:Math.min(1,moment.progress/.65),title:moment.title,explanation:moment.explanation,phraseId:moment.phraseId,action:moment.action,actionProgress:moment.progress,textProgress:moment.textProgress,timingPrecision:moment.timingPrecision,comparison:moment.comparison};}
  const stepId=cueId.split('-')[0];const cue=journeySteps[stepId]?.cues.find(cue=>cue.id===cueId),phrase=cue&&narrationPhraseGuide(cueId,cue.narration,p,timing);if(phrase)return {...phrase,active};
  let index = 0;
  while (index + 1 < beats.length && p >= beats[index + 1].at) index++;
  const beat = beats[index], end = beats[index + 1]?.at ?? 1;
  const localProgress = (p - beat.at) / (end - beat.at);
  return {
    cueId, progress: p, active, beatId: `${cueId}:${index}`,
    targets: [...beat.targets], relation: beat.relation,
    drawProgress: Math.max(0, Math.min(1, localProgress / .65)),
    title: beat.title, explanation: beat.explanation,
  };
}
