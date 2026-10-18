import type {NarrationTiming} from './narrationTiming';

/** A reading shot only changes how the existing world is read. It does not
 * create historical territory, a route, a camera timer or a second media clock. */
export type OverviewShotPhase = 'whole' | 'context' | 'evidence' | 'return';
export interface OverviewShotBeat {
  id?: string;
  recordingId: string;
  text: string;
  kind: 'journey' | 'atlas' | 'comparison' | 'orientation' | 'heritage';
  stepId?: string;
  topic?: string;
}
export interface OverviewShotCamera {
  /** Authored reading angle, not a change to the terrain or its height scale. */
  view?: 'relief' | 'plan';
  /** These are existing atlas reference IDs. Frame their combined geographic
   * bounds; primaryFocus is an annotation and must not initiate another flight. */
  focusIds: readonly string[];
  /** Conservative emphasis relative to the same complete regional map.
   * 0 is whole-region framing. It is not a distance in metres or a city extent. */
  amount: number;
}
export interface OverviewShot {
  id: string;
  phase: OverviewShotPhase;
  frame: 'whole' | 'context' | 'evidence';
  title: string;
  purpose: string;
  focusIds: readonly string[];
  primaryFocus?: string;
  amount: number;
  /** Progress inside the current literal source-text interval, never raw seek. */
  progress: number;
  textProgress: number;
  sourceToken?: string;
  cameraMode: 'source' | 'atlas';
  cameraFrom: OverviewShotCamera;
  cameraTo: OverviewShotCamera;
  cameraMix: number;
  clock: 'recording-text';
  timing: 'native-words' | 'provider-sentence' | 'estimated';
  /** User orbit/pan pauses narration; the renderer holds that actual view.
   * Resume/seek/reset are explicit actions, not an automatic orbit timeout. */
  manualPolicy: 'pause-and-hold';
}

interface ShotAnchor {
  view?: OverviewShotCamera['view'];
  /** Missing on the first anchor only: this is the clip's opening frame. */
  token?: string;
  phase: OverviewShotPhase;
  title: string;
  purpose: string;
  focusIds?: readonly string[];
  primaryFocus?: string;
  amount?: number;
}

const whole = (title: string, purpose: string): ShotAnchor => ({phase:'whole',title,purpose});
const context = (token:string,title:string,purpose:string,focusIds:readonly string[] = [],amount=.12):ShotAnchor =>
  ({token,phase:'context',title,purpose,focusIds,amount,...(focusIds.length===1?{primaryFocus:focusIds[0]}:{})});
const evidence = (token:string,title:string,purpose:string,focusIds:readonly string[] = [],amount=.24):ShotAnchor =>
  ({token,phase:'evidence',title,purpose,focusIds,amount,...(focusIds.length===1?{primaryFocus:focusIds[0]}:{})});
const back = (token:string,title:string,purpose:string):ShotAnchor => ({token,phase:'return',title,purpose});
const reading = (view:NonNullable<OverviewShotCamera['view']>, anchor:ShotAnchor):ShotAnchor => ({...anchor,view});

/** One context/evidence pair is enough for each macro historical clip. Dates
 * may change map annotations without forcing a succession of city flights. */
const plans:Readonly<Record<string,readonly ShotAnchor[]>> = {
 'OVERVIEW-city-change-core':[
  whole('已有生活接入新通道','先认同一河谷中的站区、河流与城市。'),
  context('二〇〇六年','到站不等于进城','铁路抵达之后还要跨河接续。',['lhasa'],.12),
  context('先拿掉柳梧大桥','检验连接作用','保留现状底图，只比较这一座桥。',['lhasa'],.12),
  context('二〇〇七年四月三十日','同一桥位接通两岸','语音接桥，画面恢复桥面和车辆通行。',['lhasa'],.12),
  context('设施怎样变成生活里的机会','连通还要人的组织','采访记录购车、运输队与调度。',['lhasa'],.12),
  back('最后回到全域','从个案回到不同地区','比较抵达方式，再沿真实地形观察通行。'),
 ],
 'OVERVIEW-regional-connections-core':[
  whole('一座桥之后，比较地区联系','各地抵达方式有别，地方接续仍然必要。'),
  reading('plan',context('先看东南部','俯看铁路、河流与三个地区','俯视辨认线路与河道的位置；金色沿来源线路推进。',['lhasa','shannan','nyingchi'],.08)),
  reading('plan',context('再看西部','俯看机场与城镇接续','先辨跑道，再沿已归档的道路观察接续。',['ngari'],.08)),
  back('方式不同','抵达以后还需要什么','站区、机场与地方生活之间仍需接续。'),
  context('现在回到拉萨河谷','进入实际地形核对','下一段读山体、河流与站区。',['lhasa'],.08),
 ],
 'OVERVIEW-observation-close':[
  whole('把认识转成观察任务','先问条件和变化，再选择地方。'),
  reading('relief',context('去林芝','斜看东南部山地与河谷','先读山地起伏，再问水热怎样影响地方使用。',['nyingchi'],.08)),
  reading('plan',context('到山南','俯看南部河谷城市的相对位置','三地共同入镜；各自历史需回到具体材料，不画成旅游线路。',['shannan','lhasa','shigatse'],.08)),
  reading('relief',context('看昌都','斜看峡谷与跨山条件','金色地区为当前观察对象；地形条件不等于实际道路。',['chamdo'],.08)),
  reading('relief',context('看那曲与阿里','保持斜视，对照北部与西部高地','保持同一角度，用相同的用水、通行问题对照两个地区。',['nagqu','ngari'],.08)),
  back('每次都问','说明条件、变化与原因','用一个具体地方复述，未理解处再深入。'),
 ],
  'OVERVIEW-history-origins':[whole('从条件转向历史行动','地形解释条件，营建与交流解释用途。'),context('先看拉萨','营建与用途','宗教活动与政治用途不能由地形直接推出。',['lhasa'],.08),context('再看西部托林','人物与知识交流','定位托林，不绘制未经核实的古道。',['tholing-exchange'],.08),back('这些是营建','由形成追问延续','回到共同问题：文化怎样继续进入后来的生活。')],
  'OVERVIEW-culture-continuity':[whole('形成以后，怎样延续','保留整体背景，开始读学习与实践。'),evidence('学习者靠近示范者','从观看到参与机会','同一位学习者改变位置，表示学习机会，不代表学会。',[],0),back('把学习与实践放回全域','已有生活接向现代变化','从文化持续使用转向新交通怎样接入地方。')],
  'OVERVIEW-water-service':[
    whole('由三地条件进入共同的用水问题','地图保留地理背景，功能窗解释取用过程；不把示意设施安在虚构位置。'),
    evidence('打开取水通道','水必须通过设施转移','源端、通道与储水端同步变化，区分资源与服务。',[],0),
    evidence('关闭通道','停止补水，已有储水保留','通道开闭改变补水条件，不凭空改变已存的水。',[],0),
    back('回到三地','人的行动接向历史问题','功能示意退场，回到地区差异与人的选择。'),
  ],
  'OVERVIEW-culture-actions':[
    whole('历史联系之后，追问怎样延续','全域仍在，真实文物与功能说明各自标明。'),
    evidence('把功能示意展开','保存是可观察的动作','分开书页与木板，整理后合拢，解释用途。',[],0),
    evidence('再以藏戏为例','物件保存接到人的实践','同一参与者从观看靠近示范，再加入练习。',[],0),
    back('把物件保存和人的参与放回全域','再把用途放回实际地方','从保存和参与进入有来源的街区空间。'),
  ],
  'OVERVIEW-shiquanhe-irrigation':[whole('从盆地条件进入用水','同一地图定位狮泉河与城镇周边。'),evidence('先保留灌渠','有渠不等于供水','真实渠线保留，功能对照停止补水。'),evidence('开闸并完成清渠','设施还需管护','通水带与补水效果共同变化，非流量或灌区测量。'),evidence('关闭后','停止补水，已有结果保留','通道开关不改变已经完成的补水。'),back('回到全域','人的行动接向历史','自然条件需要人的组织与持续劳动。')],
  'OVERVIEW-jokhang-protection':[whole('从历史形成转向持续使用','从全域进入同一拉萨地图。'),evidence('先看原有关系','供灯与木构共处','记录支持使用关系，不支持古代灯位复原。'),evidence('现在分开供灯与木构','供灯继续，活动空间改变','多数灯光退出木构，寺前亮起；防火思路不等于测量风险。'),back('最后退回全域','已有生活接向新交通','回到同一河谷和全域，进入下一章。')],
  'OVERVIEW-place-actions':[whole('从全域进入活动空间','在同一地图读有据的保护与公共使用事件。'),evidence('先看大昭寺','供灯与木构的关系','灯光为用途示意，不是历史内部分布。'),evidence('现在分开供灯与木构','活动延续，空间重新安排','多数灯光从建筑退去，寺前供灯示意亮起。'),evidence('再沿同一座城市','公共空间与搬迁同看','沿同一城市移到布达拉宫广场。'),evidence('让使用活动进入广场','行走与停留共同使用空间','活动在真实现状地面展开，非人数或搬迁路线。'),back('最后退回河谷','已有用途接向交通','从地方回到全域，继续现代联系。')],
  'OVERVIEW-history-space':[
    whole('从全域进入历史用途的具体例子','先保留全域，再沿同一地图进入拉萨河谷。'),
    evidence('大昭寺创建于','读现状街区中的历史场所','先把始建年代和当前地物分开，再解释通行与使用。'),
    evidence('接着沿步行街巷','沿街面看活动怎样展开','街面与移动标记一起按讲述展开，不以标签替代过程。'),
    evidence('再把周边商业用地','同一街区中的不同使用','通行、广场与建筑共同呈现空间关系。'),
    evidence('二〇二一年','保护如何面对持续使用','依据委员会管理要求观察广场与通行，不声称实施成效。'),
    back('最后退回拉萨河谷','回到整体，接向现代联系','局部使用问题接回已有城市，再讨论交通抵达。'),
  ],
  'OVERVIEW-living-comparison':[
    whole('把地区差异接到生活','在同一地图上比较条件与人的使用，不为每个地方另开模型。'),
    context('山南与拉萨的河谷','从土地读聚居条件','保持七市地同图，河谷提供可能而不是自动产生城市。',[],0),
    context('林芝与昌都的山地河谷','从高差读通行条件','在相同全域尺度比较沿谷与跨山，不生成未经核实的道路。',[],0),
    context('再看阿里','从水源读设施与维护','地区参照只定位案例背景，没有取得的灌渠位置与流量不作重建。',[],0),
    back('回到全域','回到共同生活问题','自然条件还要经过建设、使用与维护，人的行动接续历史解释。'),
  ],
  'OVERVIEW-regional-connections':[
    whole('带着已有地方认识现代联系','保留全域，比较不同地区怎样获得新的抵达选择。'),
    context('先看东南部','东南部：铁路联系','拉萨、山南与林芝和现状轨道、河道共同入镜；源数据线路含桥隧水平投影。',['lhasa','shannan','nyingchi'],.08),
    context('再看西部','西部：航空抵达','仍保留全域，转读阿里通航事件，不进入机场孤立模型。',['ngari'],.06),
    back('方式不同','回到各地共同的使用问题','把开通、接续、服务与受益条件分别理解。'),
  ],
  'OVERVIEW-regional-observation':[
    whole('用整条主线组织观察','不再以拉萨单个街区代替西藏，保留七市地共同视野。'),
    context('去林芝','跨地区比较同一组问题','地形、生活与历史分别回答什么？地图保持全域，不按地名逐点飞行。',[],0),
    back('比较以后再回到全域','把局部认识接回整体','这是学习顺序，具体行程另需核实交通与访问条件。'),
  ],
  'OVERVIEW-position':[
    whole('先从完整地球找到西藏','先逐层定位目标，再解释外部条件。'),
    context('镜头靠近亚洲','完整地球 → 亚洲 → 中国 → 西藏','由原地球定位层连续靠近，洲、国家和自治区分别标注。'),
    evidence('青藏高原则是','分开自然高地与行政范围','同一个世界中比较两种空间对象，不把两条边线当成同一范围。'),
    back('位置确定以后','保留周围海陆与大气','位置建立来路，下一步解释整体环境怎样运行。'),
  ],
  'OVERVIEW-formation-entry':[
    whole('把全球来流接回已定位的高地','先认回亚洲高地，避免从全球环流突然跳入剖面。'),
    context('现在回到亚洲','在低地与海洋之间找回高原','原地球场景保留亚洲、低地和海洋的共同背景。'),
    evidence('接下来的剖面','明确即将改变的问题和尺度','剖面解释运动、变形与增厚，真实地形留待后面核对。'),
    back('看懂原理以后','约定回到今天的真实高程','形成解释以后会回到实际地面，而不把概念剖面当作古代复原。'),
  ],
  'OVERVIEW-history-entry':[
    whole('从自然条件转向人的历史行动','地形不能直接解释城市中心和文化，接下来加入时间、行动和材料。'),
  ],
  'OVERVIEW-evidence-reading':[
    whole('让两件真实材料停留可读','暂缓年代推进，用博物馆断代与可观察细节阅读材料。'),
    evidence('眼前的阿底峡画像','看教师身份，再读经页保存与工艺','实物以馆方身份展示，不能因历史背景在托林就给作品补造精确制作地点。',[],0),
    back('保存、学习与工艺联系在一起','把实物读到的关系接回多样文化','两件馆藏说明具体问题，不代替全部地方文化。'),
  ],
  'OVERVIEW-heritage-entry':[
    whole('先保留历史长线与完整地图','现在按问题读拉萨例证，回到早期年代不代表顺时历史继续。'),
    context('先在全图确认它所在的河谷','从全域定位拉萨河谷','先建立整体与局部的关系，再由实际地方地图接续。',['lhasa'],.2),
    evidence('再沿今天的真实地图','接下来读有资料的年代与用途','现状地图定位大昭寺和布达拉宫，不复原过去城市。',['lhasa-buildings'],.24),
  ],
  'OVERVIEW-heritage-return':[
    whole('从建筑回到河谷，再回到全域','把局部用途放回城市背景，收束这个地方例证。'),
    back('再回到西藏全域','把局部发现接回整体','保留已有城市与生活，再讨论现代交通怎样接入。'),
  ],
  'G1-opening':[
    whole('先认清地球的组成','先建立海洋、陆地、空气等共同对象，后面才有解释地方的基础。'),
    context('它们彼此相连','把对象接成同一个系统','仍保留完整地球，跟踪水与热怎样联系地表和空气。'),
  ],
  'G2-opening':[
    whole('从地球逐层定位','先确认目标的来路，再分别读取洲、国家和自治区。'),
    context('先找到亚洲这个洲','亚洲 → 中国 → 西藏','保持海陆背景，空间层级由原场景逐词展开。'),
    back('逐层靠近时','保留目标周围的海陆','靠近目标以后，周围环境仍是解释条件的一部分。'),
  ],
  'G2-observe':[
    whole('位置不等于环境结论','纬度只建立背景，不能直接给整个地区贴上气候标签。'),
    context('现在把目光','从纬度转向相邻高差','先知道高地与低地怎样相邻，后面再解释高度与空气。'),
  ],
  'G1-explain':[
    whole('回到地球解释共同原理','目标已定位，现在从相同阳光怎样落在球面上解释冷暖背景。'),
    evidence('照得较直时','比较同一能量的分布面积','原球面光束负责演示；镜头不另建太阳模型。'),
    back('这建立了冷暖背景','把照射接回完整环境','还需要海陆储热和空气、水的输送，才能继续认识地方。'),
  ],
  'G1-observe':[
    whole('空气在同一地球上循环','由受热差异接到空气运动，避免把风画成凭空出现的线。'),
    evidence('看上升','跟踪上升、输送、下沉与返回','原全球环流场景连续展示同一套关系。'),
    back('这是大尺度平均关系','带着来流背景回看亚洲高地','平均环流给出背景，地形会继续改变局地过程。'),
  ],
  'G3-opening':[
    whole('从已定位的高地提出形成问题','先认回今天的高地，再改变尺度阅读地下过程。'),
    context('这里把空间转成地壳剖面','从地理位置进入地壳剖面','剖面解释形成关系，画面阶段不代表真实地质年份。'),
  ],
  'G3-explain':[
    whole('保留相向运动的整体关系','先辨认两侧的运动，再读局部变形。'),
    evidence('地壳缩短','观察变形与增厚','原剖面负责连续变化，不能用相机移动代替物理过程。'),
  ],
  'G3-bridge':[
    whole('把形成过程接回今天','结束地质过程，保留形成问题与今天起伏的区别。'),
    back('回到今天的山脊','回到同一高地的山脊、盆地与河谷','下一幅真实高程回答今天高低怎样排列。'),
  ],
  'G4-opening':[
    whole('先看连续的整片地面','南侧低地、山系和高原内部共用一片真实地形。'),
    context('沿同一条南北线','整体地形 → 同一条剖面','有了整体位置，沿同一方向比较才不会把孤峰当高原。'),
  ],
  'G4-explain':[
    whole('共用同一海平面基准','所有样点来自同一公开高程格网。'),
    evidence('这个样点只有约五十米','跟随真实样点读取高度','原读数标记依次对应低地、山系与高原内部。'),
    back('你看到的不是一座山峰','把读数还原成整体很高的地面','局部样点用于理解全域地面，不代替连续地形。'),
  ],
  'C4-arrival':[
    whole('从完整地球跟着来流靠近','已有的全球关系在亚洲还受海陆与季节影响。'),
    context('跟着镜头靠近高原','来流背景 → 同一高原','镜头由原连续地球场景负责，印度洋与亚洲仍有来路。'),
  ],
  'C4-uplift':[
    whole('地球与同一片高差仍在','不换孤立山块，沿真实起伏读取空气过程。'),
    evidence('靠近山坡','抬升 → 膨胀 → 冷却','跟踪同一示意气团，原过程变化与词进度一致。'),
    back('实际空气也可能绕行','把一条解释路径放回可能条件','示意不是所有来流的唯一实况路径。'),
  ],
  'C4-cloud':[
    whole('保持山体，改变水汽认识','同样的地形不自动产生同样的降水。'),
    evidence('起初气团带着气态水','气态水 → 云滴 → 地面降水','原云雨机制显示物态与条件，而非只换文字。'),
    back('这段演示解释条件','回到条件组合','云与雨分开理解，后面才能比较地区差异。'),
  ],
  'C4-regions':[
    whole('把镜头拉回同一高原','局地过程已建立，再比较地区条件的组合。'),
    context('依次看林芝、拉萨和阿里','三地都保留在整体背景中','逐词强调位置，不把一个市区等同整个行政区。'),
    back('不能用单一风向','回到全域比较','来流、地形和水汽共同参与差异，后面接实际生活。'),
  ],
  'OVERVIEW-regional-system':[
    whole('一张图保留七市地','先看到全域，行政入口与自然区域分别认识。'),
    reading('plan',context('中南部的拉萨','俯看中南部河谷与城市分布','先看河道与三处聚居地的相对位置；观察窗不是行政边界。',['lhasa','shigatse','shannan'],.08)),
    reading('relief',context('东部昌都','斜看东部与东南部山谷','保持整体地形，对照两地高差与河道，不把它们连成同一条谷地。',['chamdo','nyingchi'],.08)),
    reading('relief',context('北部那曲','同一角度，比较北部与西部高地','保持刚才的斜视尺度，高原内部也有盆地和宽谷。',['nagqu','ngari'],.08)),
    back('七市地帮助找到入口','自然环境跨过行政入口','回到整体后，继续用共同问题读生活。'),
  ],
  'OVERVIEW-life-conditions':[
    whole('把全域差异接到三个生活问题','先保留水、土地和通行的共同问题。'),
    context('河谷较缓的地面','土地、水与通行在同一地面中','同时保留南部河谷和东南山地的来路。',['yarlung-life','lhasa','nyingchi'],.12),
    evidence('水源还要经过取用和维护','从自然条件读到使用环节','不把河流存在直接当作自来水供应，不添加未取得的管网。',['yarlung-life','lhasa','nyingchi'],.12),
    back('环境提供可能与限制','由自然条件转向人的行动','技术、交换与历史选择接续解释生活，气候不能代替文化史。'),
  ],
  'OVERVIEW-history-early':[
    whole('把同一片地面放进时间','现代地理只作参照，先辨认活动证据与政权史是不同问题。'),
    context('尼阿底研究','史前活动与后来的政治组织分层阅读','保留藏北、雅砻与拉萨的相对位置，不在每个年代飞往一座城。',
      ['nyade-evidence','yarlung-polity','lhasa-stele'],.12),
    evidence('唐蕃会盟碑','用可核对的碑刻读会盟与立碑','年代和材料身份明确以后，再局部强调拉萨的有证节点。',['lhasa-stele'],.24),
    back('八二三年立碑','由一项材料回到历史长线','碑刻回答一个具体事件，后面继续看地方力量与交流的变化。'),
  ],
  'OVERVIEW-history-middle':[
    whole('吐蕃以后，各地继续变化','继续读政治重组与宗教交流，避免把上一政权当作永久背景。'),
    context('十至十二世纪','先看不同地方的关系范围','托林、萨迦与山南保留在同一张现代定位地图中。',
      ['tholing-exchange','shigatse','shannan'],.12),
    evidence('阿底峡在一〇四二年','托林例证：教师、译者与文本','定位公开资料支持的交流节点，不补画未取得的精确古道。',['tholing-exchange'],.24),
    back('十三至十四世纪','回到制度与地方力量的整体变化','后续元朝与萨迦、帕竹的变化由时间线说明，镜头不逐词追城。'),
  ],
  'OVERVIEW-history-modern':[
    whole('沿历史顺序进入近现代','政治组织、建筑空间与地方经历分别阅读。'),
    context('十七世纪','拉萨在全域中的政治空间','先建立年代与城市关系，保留周围地区。',['lhasa'],.12),
    evidence('拉萨政治与建筑空间','在城市中读政治与建筑的联系','强调有证地方，今天的建筑形制不等于当时完整现场。',['lhasa-institutions'],.24),
    back('清代的驻藏大臣和噶厦','回到长线，再读近现代节点','1904、1951、1959、1965分别定位材料，不把北京协议钉在拉萨或江孜。'),
  ],
  'OVERVIEW-culture':[
    whole('历史长线之后，问文化怎样形成','改变提问方式，从年代转到建筑使用、知识交流与持续参与。'),
    context('建筑组织宗教、礼仪和日常用途','空间与人的使用联系起来','同时保留拉萨与托林的全域关系，不把文化等同一座建筑。',['lhasa-buildings','tholing-culture'],.12),
    evidence('学习与翻译','学习、翻译、艺术与传习','在同一地区关系框架内读人的行动，不为每个名词单开模型。',['lhasa-buildings','tholing-culture'],.12),
    back('拉萨建筑、托林交流和地方传习','从具体实践回到多样文化','托林只定位其有证交流，地方节庆和藏戏不能被固定在托林或拉萨一处。'),
  ],
  'CONT-history-lhasa-1':[
    whole('从全域进入拉萨这个例证','回到早先世纪是按问题读案例，不是历史时间线倒退。'),
    context('辨认河流、道路和老城','先读河谷城市，再定位对象','由原地方地图保留真实河流、道路和今天的街区关系。'),
    evidence('再定位大昭寺','建筑的年代与宗教用途','原地方地图和用途标注负责演示，不替换成孤立建筑。'),
    back('不能把今天的建筑','保留现状与历史材料的区别','现状轮廓定位对象，不构成七世纪建筑复原。'),
  ],
  'CONT-history-lhasa-2':[
    whole('同一城市，比较另一个历史对象','沿已建立的城市背景继续读白宫。'),
    context('五世达赖喇嘛主持白宫建设','把建设年代与参与者放回城市','原局部地图负责相机，不另开地图计时。'),
    evidence('礼仪、接见与居住','用途解释空间需要','让具体用途成为画面内容，不只重复建筑名称。'),
  ],
  'CONT-history-lhasa-3':[
    whole('在同一城市辨认红宫','白宫与红宫建设时期和使用有区别。'),
    evidence('包含灵塔和宗教活动空间','从年代继续读纪念与宗教用途','原地方对象继续演示，镜头不剥离真实城市背景。'),
    back('今天抵达以后','历史用途接回今天的访问','从一个地方例证回到全域，再问新通道怎样接上已有城市。'),
  ],
  'OVERVIEW-barkhor-life':[
    context('先留在','在同一老城扩展视野','先保留刚才的大昭寺，再看广场和街道为何属于同一个问题。'),
    evidence('沿现状步行街巷移动','用真实街巷读取活动需要','活动标记沿现状道路变化，不把方向线当作城市历史。'),
    evidence('再看广场与周边商业用地','把建筑、开放空间与街区一起看','不同使用共处一地，保护不能只停留在建筑立面。'),
    evidence('二〇〇〇年','从列入遗产到保护使用活动','分清历史事件、管理要求与今天看到的空间。'),
    back('接下来，仍在拉萨','街区 → 同一拉萨河谷','拉回城市尺度，再接白宫与红宫，避免跨地点突然跳镜。'),
  ],
  'OVERVIEW-lhasa-urban-change':[
    context('把布达拉宫','从历史地标退到同一河谷','先把已有对象同时放回城市，再对照可测量的空间变化。'),
    evidence('先看一九八五年','固定尺度，对照三个时期','实际遥感像元改变，两个历史地标持续定位。'),
    evidence('再回到现状街区','从扩展范围读回地方生活','报告中的广场和生活改善定位到真实地方，不编造旧住宅和管线。'),
    back('拉回河谷','空间变化 → 城市生活 → 交通接续','先回河谷再回全域，让现代通道接上已有的城市。'),
  ],
  'OVERVIEW-connections':[
    whole('从历史回到今天的全域联系','已有地方先保留，再看现代联系增加了什么选择。'),
    context('公路、铁路和航空','不同通道与流域共同构成来路','地理联系不等于已取得的历史线路或现行时刻表。',['lhasa-railway','shannan'],.12),
    evidence('接下来用拉萨的铁路与跨河接续','选择一个完整的抵达与接续例证','从区域通道进入同一城市的真实地面关系。',['lhasa'],.24),
  ],
  'ACCESS-lhasa-access':[
    whole('保留已有城市，再看新增铁路','开通改变抵达选择，城市生活并非从通车当天开始。'),
    context('列车把人员和货物','区域通道 → 铁路节点','原局部地图保留站区、河流与城市的真实空间关系。'),
    evidence('先看同一件物品抵达站场','到站仍是中间环节','同一件物品由原过程演示，抵达不等于已进入商店和家庭。'),
  ],
  'ACCESS-lhasa-transfer':[
    whole('从到站继续看跨河进城','抵达之后仍需道路、桥梁和组织接续。'),
    evidence('在真实站区、道路与河流的位置上','同一地区，读跨河接续','实际地方地图负责相机与过程，不另画一条抽象方向线。'),
    context('洛桑赤列的采访','设施连通 → 人员与管理','采访支持地方组织这一环，不能推算所有家庭收益。'),
    back('拉萨西货场是另一处地点','区分客运站区和货场','接下来单独读货运材料，不把另一个地点画在当前客站。'),
  ],
  'ACCESS-lhasa-life':[
    whole('单独读拉萨西货场材料','地点、日期与实际用途分别核对，客站不是货场。'),
    evidence('吴昊讲述货物扩展','有日期的具名用途','品类和配送来自报道，不在客站复原未取得的货场作业。'),
    back('物资还要接上地方配送','从具名生活用途回到全域联系','抵达、配送与使用共同参与生活，接下来回到全域维护议题。'),
  ],
  'OVERVIEW-protection':[
    whole('把拉萨例证重新放回全域','局部接续说明使用环节，整体还包括共同维护。'),
    reading('plan',context('雅鲁藏布江','沿干流辨认上游与下游','青色保留干流，随后读坡面降水、下渗与汇流；坡向是高程教学计算。',['shannan'],.1)),
    reading('relief',context('雨落在坡面','从降雨读到坡面汇水','雨水分成下渗与直接汇流；同一地形比较条件，不预测水量。',['shannan'],.16)),
    reading('relief',context('羌塘','回看北部与西部高地','先保留那曲与阿里背景，再读黄晨巡护和移除迁徙阻隔的材料；机制不等于实测位置或生态成效。',['nagqu','ngari'],.1)),
    evidence('拉萨遗产保护','回到已认识的大昭寺空间','同一地图进入前例，供灯与木构分开，活动仍然保留。',['lhasa'],.12),
    back('理解周边和战略价值','把联系读成条件与责任','回到全域，用共同依赖、使用条件和维护解释价值。'),
  ],
  'OVERVIEW-observation':[
    whole('把认识顺序变成观察方法','旅游观察先有问题，再选择可核实的地点和材料。'),
    context('先在全图确认位置与来路','由整体问到山川、城市与使用','地图保留多个地方，不把认识顺序画成已核验的出行线路。',['shannan','lhasa','nyingchi'],.08),
    back('每一站都在回答问题','局部发现接回整体认识','停留在整体地图，再选择一个问题深入。'),
  ],
  'OVERVIEW-city-change':[
    whole('历史街区与新连接','从全域进入同一河谷，比较站区、河流和城区。'),
    context('二〇〇六年','到站不等于进城','铁路到达和跨河接续分开解释。',['lhasa'],.12),
    context('先拿掉柳梧大桥','比较这一条连接','只拿掉真实跨河段，其他现状地物保留。',['lhasa'],.12),
    context('二〇〇七年四月三十日','新桥接通两岸','桥面接回，车辆沿真实相连道路通过。',['lhasa'],.12),
    context('设施怎样变成生活里的机会','设施与人的组织','具名采访补上购车、运输队与调度。',['lhasa'],.12),
    context('到已知路端停下','接入已有用途','在源路端停止，转读历史街区。',['lhasa'],.12),
    back('最后回到全域','一个案例回到整体','再比较其他地区的来路。'),
  ],
  'OVERVIEW-lived-city':[
    context('把前面的认识','从全域回到同一拉萨河谷','把历史建筑和现代抵达放在同一座城市里，不再换一套观察对象。'),
    evidence('沿归档的现状道路前进','从站区跨河，再沿城市道路接续','同一个移动标志沿真实节点前进；交通提供抵达，车辆和组织把设施变成服务。'),
    evidence('到已知路端停下','到达之后，观察历史街区的使用','路端不是寺院入口；转向街区本身的通行、宗教活动与商业用途。'),
    evidence('二〇二五年','从看建筑转向理解共同使用','委员会决定与现状街巷对读，解释为什么参访还涉及管理与尊重。'),
    back('最后拉回河谷与全域','把局部观察接回整条认识','交通、历史与生活各解释一环，再回到完整地图。'),
  ],
  'OVERVIEW-valley-journey':[
    whole('把前面的环境与生活认识放回真实地点','先知道河谷在整体中的位置，再沿线路观察接续。'),
    evidence('从西藏全图','进入拉萨河谷','同一坐标系拉近，认出山体、河流与城市。'),
    evidence('沿线向前看','在谷地中前进','沿真实相连铁路节点移动，看河流如何进入视野。'),
    evidence('停在跨河段','桥梁接起两岸','停在源数据的桥段；平面走向不等于桥面高度。'),
    evidence('继续往站区方向','山体与地下通行','沿线接近有来源的隧道，辨别地表遮挡和地下走向。'),
    evidence('再沿线到拉萨站','抵达还需要接续','站场与周围街区同图，不把铁路抵达等同于到达生活目的地。'),
    evidence('转向柳梧大桥','跨河道路联系城市','以实际桥位引导视线，理解站区与河对岸的联系。'),
    back('最后回到西藏全图','从地方重新理解整体','地形、交通工程和地方接续各起作用，再接到共同维护。'),
  ],
  'OVERVIEW-ground-rail':[
    whole('从全域找到真实线路片段','先把青藏线拉萨站前片段定位，明确它不是刚才介绍的拉林全线。'),
    evidence('从全域拉近','从全域走进同一河谷','保持真实坐标，下降到局部高程；观察铁路与河流、站区的空间关系。'),
    evidence('镜头降低','沿线移动，看地形遮挡','视点沿相连原始铁路节点移动；不是给地图换一张配图。'),
    evidence('虚线标出','停在有来源的隧道段','虚线只表达地下线段的水平走向，地表高程不能测出隧道深度。'),
    evidence('再升高俯看','从抵达回看城市接续','抬高视点，把站区、道路与跨河联系一起观察。'),
    back('回到全域','带着地方关系回到整体','局部解释通行条件，再回到各地区通道的使用与维护。'),
  ],
  'OVERVIEW-conclusion':[
    whole('回到完整地图保留认识顺序','位置、环境、生活、历史、文化与今天共同解释地方。'),
    back('下一步可以沿任何一个问题深入','完整认识继续通向有目的的深入','后续局部问题随时可以回到整体，不自动拼成短途旅行。'),
  ],
};

const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
const smooth=(value:number)=>{const t=clamp(value);return t*t*(3-2*t);};
const cameraFor=(anchor:ShotAnchor):OverviewShotCamera=>({focusIds:anchor.focusIds??[],amount:anchor.phase==='whole'||anchor.phase==='return'?0:clamp(anchor.amount??0),...(anchor.view?{view:anchor.view}:{})});

/** Pure text-clock sampling: no Date, performance, setTimeout, seconds or
 * mutations. Seeking back across an anchor exactly reconstructs the same shot.
 * The source mode leaves all existing globe/process/local-map camera ownership
 * intact. The atlas mode may frame the SAME terrain from cameraFrom to cameraTo
 * using cameraMix, while a user-manipulated paused camera remains untouched. */
export function overviewShot(beat:OverviewShotBeat,raw:number,timing?:NarrationTiming):OverviewShot {
  const sourceTiming=timing&&Number.isFinite(timing.textProgress)?timing:undefined;
  const textProgress=clamp(sourceTiming?.textProgress??raw);
  const anchors=plans[beat.recordingId]??[
    whole(beat.kind==='atlas'?'保留同一张整体地图':'沿原场景继续认识','先保留所在尺度，再按原讲述进入细节。'),
  ];
  const resolved=anchors.map((anchor,index)=>{
    const at=anchor.token===undefined&&index===0?0:anchor.token?beat.text.indexOf(anchor.token):-1;
    if(at<0||anchor.token&&beat.text.indexOf(anchor.token,at+1)>=0)
      throw new Error(`总览镜头锚点与原录音不一致：${beat.recordingId} / ${anchor.token??'opening'}`);
    return {...anchor,at};
  });
  for(let index=1;index<resolved.length;index++)if(resolved[index].at<resolved[index-1].at)
    throw new Error(`总览镜头锚点顺序不一致：${beat.recordingId}`);
  const position=textProgress*beat.text.length;
  let index=0;
  while(index+1<resolved.length&&position>=resolved[index+1].at)index++;
  const anchor=resolved[index],next=resolved[index+1]?.at??beat.text.length;
  const progress=clamp((position-anchor.at)/Math.max(1,next-anchor.at));
  const cameraFrom=cameraFor(resolved[Math.max(0,index-1)]),cameraTo=cameraFor(anchor);
  // The entrance occupies the first part of THIS spoken interval, then holds.
  // This fraction describes words, not seconds; pausing words pauses the move.
  const cameraMix=index===0?1:smooth(progress/.28);
  return {
    id:`${beat.recordingId}:${index}`,phase:anchor.phase,
    frame:anchor.phase==='whole'||anchor.phase==='return'?'whole':anchor.phase,
    title:anchor.title,purpose:anchor.purpose,
    focusIds:cameraTo.focusIds,...(anchor.primaryFocus?{primaryFocus:anchor.primaryFocus}:{}),
    amount:cameraFrom.amount+(cameraTo.amount-cameraFrom.amount)*cameraMix,
    progress,textProgress,...(anchor.token?{sourceToken:anchor.token}:{}),
    cameraMode:beat.kind==='atlas'?'atlas':'source',cameraFrom,cameraTo,cameraMix,
    clock:'recording-text',
    timing:sourceTiming?.precision==='provider'?(sourceTiming.timingLevel==='word'?'native-words':'provider-sentence'):'estimated',
    manualPolicy:'pause-and-hold',
  };
}
