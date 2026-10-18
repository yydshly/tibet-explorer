import type {NarrationScenePhrase} from '../lib/narrationScenePhrase';
import type {SceneSettings} from '../lib/store';

/** Literal phrases belong to the existing recording. Fractions are reversible
 * explanation coordinates in the existing physical models, never audio times,
 * geological ages, meteorological observations or interpolated lake years. */
const p=(token:string,targets:string[],title:string,explanation:string,settings?:Partial<SceneSettings>,from?:number,to=from):NarrationScenePhrase=>({token,targets,title,explanation,settings,from,to});
const plates={layer:'plates',cutaway:true},crust={layer:'crust',cutaway:true},surface={layer:'surface',cutaway:false};
const energy={layer:'energy',cutaway:false},rain={layer:'rain',cutaway:false},water={layer:'water',cutaway:true};
export const deepNaturePhrases:Record<string,NarrationScenePhrase[]>={
 'G3-opening':[
  p('上一幅地球',['formation-surface'],'位置之后 · 转为地壳剖面','保留这片亚洲高地的来路，概念剖面说明关系，今天高程要另读源数据。',plates,0,0),
  p('这里把空间转成地壳剖面',['formation-india','formation-eurasia'],'印度板块与欧亚板块 · 看两侧','沿同一剖面分别辨认两侧，再看相向运动的箭头。',plates,0,.05),
  p('画面进度表示解释阶段',['formation-crust'],'解释阶段 · 没有地质年份刻度','剖面停在起点；这里没有推定某处的形成年份或运动速率。',plates,.05,.05),
 ],
 'G3-explain':[
  p('相向运动',['formation-india','formation-eurasia'],'相向运动 · 两侧距离缩短','追踪两侧物质标记和剖面宽度，先看缩短，不让整块地面直接升高。',plates,.05,.2),
  p('缩短、变形并增厚',['formation-crust'],'缩短、弯曲与增厚 · 同一地壳','前侧层界弯曲、剖面底部加深，显示变形与增厚同时展开。',crust,.2,.56),
  p('地表也会改变',['formation-surface'],'地表响应 · 高处并非同时抬升','跟随同一变形表面，山地与内部高地在不同阶段形成起伏。',crust,.56,.68),
  p('高原各部分经历不同的形成阶段',['formation-surface'],'各部分不同 · 不能当成同步整体升高','保留剖面与不同位置的地表，让局部变化与整块抬升分开。',crust,.68,.8),
  p('山地抬升时侵蚀仍在进行',['formation-surface'],'抬升同时 · 侵蚀与搬运','原山体不换场景；沟谷与沿坡搬运符号在后段随变形继续展开。',surface,.8,.92),
  p('请沿剖面看层次怎样弯曲',['formation-crust'],'回到层界 · 弯曲而非整块升高','再露出同一地壳层界，比较已经变形的层次与起始轮廓。',crust,.92,1),
 ],
 'G3-observe':[
  p('现在可以拖动过程进度',['formation-crust'],'侧面观察 · 同一剖面可回拖','手动回拖先比较两侧位置，再推进到地壳与地表变化。'),
  p('先看相向运动',['formation-india','formation-eurasia'],'先辨两侧 · 再辨层界与地表','两侧与层界保留在同一模型，操作进度不对应真实年份。'),
  p('这个模型帮助辨认关系',['formation-crust'],'研究边界 · 量与年代还需资料','这里不计算某地实际抬升年代、米数或速率。'),
 ],
 'G3-bridge':[
  p('地质过程留下了高地',['formation-surface'],'形成以后 · 地表仍有起伏','保持已经变形的表面，山脊与沟谷不是一块平板。',surface,1,1),
  p('接下来结束地质时间的观察',['formation-surface'],'回到今天 · 下一段读真实高程','当前概念构造过程结束，接着在整体地形上读山脊、盆地和河谷。',surface,1,1),
  p('它们的高度、起伏与方向',['formation-surface'],'高度与方向 · 接到空气、水和通行','形成解释给出关系；具体环境还要回到今天的地理位置和源高程。',surface,1,1),
 ],
 'C1-opening':[
  p('刚才已经认识',['solar-earth'],'保留地方来路 · 进入照射问题','继续使用完整地球，季节解释建立在已经认识的位置与地形之上。',{layer:'solar',season:1}),
  p('先看同一地点为什么有冬夏照射变化',['solar-axis','sun-source'],'固定地点 · 比较冬夏的几何条件','地轴与照射方向在同一地球上，先固定拉萨附近参照。',{layer:'solar',season:1,selected:'lhasa'}),
  p('观察地球与太阳',['solar-earth','sun-source'],'地球与太阳 · 先看相对方向','季节切换改变照射方向，画面距离不能当作真实天体比例。',{layer:'solar',season:1}),
 ],
 'C1-explain':[
  p('地轴的倾斜',['solar-axis'],'地轴倾斜 · 季节几何背景','辨认倾斜地轴，再把同一纬度的太阳高度和日长联系起来。',{layer:'solar',season:1}),
  p('夏至时',['solar-earth','sun-source'],'夏至 · 拉萨纬度太阳较高、白昼较长','切到夏至的真实已有太阳几何状态，参照地点保持不变。',{layer:'solar',season:1,selected:'lhasa'}),
  p('冬至则相反',['solar-earth','sun-source'],'冬至 · 同一地点比较','只切季节，地轴、地球与拉萨参照保持同一组对象。',{layer:'solar',season:3,selected:'lhasa'}),
  p('侧边数值是太阳几何计算',['solar-earth'],'几何数值 · 不能当作真实气温','保留冬至状态；当地温度还受地表、大气与输送影响。',{layer:'solar',season:3}),
 ],
 'C1-observe':[
  p('请切换到冬至',['solar-earth','sun-source'],'亲手比较 · 保留同一地点','切换季节后比较日长和照射方向，操作不更换地点或视角。'),
  p('这里的一年变化来自',['solar-axis'],'一年循环 · 轨道与倾斜几何','这段解释一年中重复的照射变化，不能据此判断多年变暖。'),
  p('不能由太阳更远或更近来简单解释',['solar-earth','sun-source'],'季节原因 · 不是距离的简单替代','继续辨认同一纬度的几何条件，模型距离不表示天文实测。'),
 ],
 'C1-bridge':[
  p('知道夏冬照射不同以后',['solar-earth'],'照射不同 · 还要理解收支','保留冬至地球，照射条件并不直接等于地方气温。',{layer:'solar',season:3}),
  p('地球不断接收阳光',['solar-earth','sun-source'],'能量进入 · 为什么没有一直升温','从太阳照射转问吸收、储存和散失，而不是再换一个地方。',{layer:'solar',season:3}),
  p('下一步回到地表与空气之间',['solar-earth'],'下一段 · 地表与空气的能量交换','接下来把尺度收进地表与空气，追踪进入、交换和向外的路径。',{layer:'solar',season:3}),
 ],
 'C2-opening':[
  p('刚才的季节比较',['energy-sunlight'],'照射之后 · 先看进入路径','先从没有展开全部交换的起点，辨认太阳短波来源。',energy,0,.07),
  p('现在先沿金色路径',['energy-sunlight'],'太阳短波 · 来到地表与空气','金色路径从太阳方向展开，箭头端点随同一进度移动。',energy,.07,.14),
  p('一部分被反射',['energy-sunlight'],'反射 · 一部分能量离开','先见空气附近与地表反射的去向，再加入吸收储存。',energy,.14,.3),
  p('另一部分被吸收',['energy-surface','energy-atmosphere'],'吸收 · 地表与空气参与','地表储存颜色开始改变；颜色不是温度或通量读数。',energy,.3,.47),
  p('画面逐层展开',['energy-surface'],'逐层解释 · 真实过程同时进行','保留进入、反射和吸收对象，解释阶段不是过程轮流停止。',energy,.47,.52),
 ],
 'C2-explain':[
  p('吸收以后',['energy-surface'],'吸收以后 · 地表储存状态改变','保持已吸收阶段，地表体积中的储存示意可从侧面辨认。',{layer:'energy',cutaway:true},.28,.52),
  p('再通过长波',['energy-surface','energy-atmosphere'],'地表长波 · 向空气传递','从地表发出长波，路径与进入的金色短波有不同方向和颜色。',energy,.52,.57),
  p('空气热交换和蒸发',['energy-atmosphere'],'热交换与蒸发 · 也搬运能量','青色路径从地表和水面向空气展开，补全地表交换途径。',energy,.57,.78),
  p('大气参与吸收与发射',['energy-atmosphere'],'大气吸收并发射 · 追踪去向','保持同一空气层，长波路径从被吸收的位置继续向外与向下。',energy,.78,.84),
  p('既向外，也向地表交换',['energy-space','energy-atmosphere'],'向太空与向地表 · 两个去向','向外和返回地表的长波路径一起展开，方向与收支相互对应。',energy,.84,1),
  p('沿新增路径认识收支',['energy-space','energy-surface'],'共同收支 · 不能从箭头读通量','保留全部路径；箭头宽度、储存颜色没有当地测量单位。',energy,1,1),
 ],
 'C2-observe':[
  p('可以把过程退到进入与反射',['energy-sunlight'],'回拖进入与反射 · 看路径先后','回拖会同时恢复路径、储存和标签，画面时间不累积。'),
  p('再展开吸收、储存和交换',['energy-surface','energy-atmosphere'],'再推进 · 补全共同收支','沿同一地表和空气层推进；选择对象可读它参与的路径。'),
  p('画面阶段用于逐层解释',['energy-surface','energy-space'],'解释顺序 · 不是实际停开顺序','在真实环境中这些过程可同时发生，画面只逐层拆开关系。'),
 ],
 'C2-bridge':[
  p('能量收支让我们知道',['energy-surface','energy-atmosphere'],'温度来自收支 · 阳光只是来源之一','保留完成的交换与向外路径，认识温度还需考虑总收支。',{layer:'exchange',cutaway:false},1,1),
  p('西藏还有一个突出的条件：高度',['energy-atmosphere'],'加入高度 · 下一步看空气','不把阳光直接换算成温度；接下来沿山坡追踪同一空气团。',{layer:'exchange',cutaway:false},1,1),
  p('下一步保留地表与空气这个尺度',['energy-surface','energy-atmosphere'],'相邻尺度 · 从交换走向高差','继续使用地表与空气的尺度，把高度过程与实际观测分开。',{layer:'exchange',cutaway:false},1,1),
 ],
 'C3-opening':[
  p('我们已经知道',['height-low','height-high'],'同一山坡 · 先辨认高低','保留地表与周围空气参照，起点气团位于较低一侧。',{layer:'temperature'},0,0),
  p('现在沿山坡从低处走向高处',['height-parcel'],'沿坡上升 · 相邻高低有空间距离','同一气团沿坡移动并逐渐膨胀，地形与周围参照保持固定。',{layer:'temperature'},0,.6),
  p('高海拔地方常有较低温度',['height-high','height-environment'],'常较冷 · 不是自动生成精确气温','高度参照与颜色只帮助认识关系，没有地点、日期对应的气温。',{layer:'temperature'},.6,.6),
  p('先辨认高度方向',['height-parcel','height-environment'],'气团与周围 · 两类状态分开','保持移动空气团与固定环境参照，下一段专看膨胀冷却。',{layer:'temperature'},.6,.6),
 ],
 'C3-explain':[
  p('空气上升进入较低气压环境',['height-parcel'],'同一气团上升 · 周围气压降低','从起点沿坡抬升，指向气团的压力箭头随高度逐渐缩短。',{layer:'parcel'},0,.4),
  p('可以膨胀并冷却',['height-parcel'],'膨胀与冷却 · 追踪同一团空气','气团体积增大、颜色变化；没有计算真实体积、气压或温度。',{layer:'parcel'},.4,1),
  p('周围空气的垂直温度分布',['height-environment'],'周围空气分布 · 另一种观测状态','移动气团停在高处，固定环境参照保留；两者不能当作同一温度曲线。',{layer:'parcel'},1,1),
  p('云、湿度、地表和天气',['height-environment','height-parcel'],'环境还受多条件影响 · 仍需观测','保持同一地形和高处气团，不能由定性颜色读取某处今天气温。',{layer:'parcel'},1,1),
 ],
 'C3-observe':[
  p('请转动山坡',['height-low','height-high'],'同一山坡 · 转动比较高低','保留低处、高处与周围空气参照，手动旋转不换地点。'),
  p('再切换到气流层',['height-parcel'],'切换沿坡运动 · 看空气路径','由用户切换到气流层，沿坡路径与移动空气团共同可见。'),
  p('以后说一个地区更冷时',['height-environment'],'回到资料 · 注明地点与日期','山坡示意提供原理，地区温度判断需要对应位置、时间与统计范围。'),
 ],
 'C3-bridge':[
  p('上升空气把温度问题',['height-parcel'],'从膨胀冷却 · 接到空气来路','保持高处气团与已展开的沿坡路径，继续追问空气从哪里来。',{layer:'wind'},.8,1),
  p('但空气从哪里来',['height-parcel','height-environment'],'局地过程之外 · 还需环流背景','同一山坡只能说明局地抬升，远处来流要放回季节与海陆联系。',{layer:'wind'},1,1),
  p('下一步从局地高差退回',['height-environment'],'拉远认识 · 先看风，再看水汽','后续来流不是这条局地路径的实况延长线，要重新辨认地区尺度。',{layer:'wind'},1,1),
 ],
 'C6-opening':[
  p('刚才认识云雨机制',['cloud-inflow'],'同一山体 · 改问短时先后','从尚未成云降雨的来流状态开始，不换山体就能比较前后。',rain,.1,.1),
  p('地形可以保持相同',['cloud-lift'],'山体固定 · 空气状态会变化','同一来流与山坡保留在场，之后由进度依次展开抬升和云雨。',rain,.1,.15),
  p('这里用同一山体的概念过程',['cloud-inflow'],'原理阅读 · 没有当地实况钟点','当前只有概念顺序，真实事件还需要日期、位置与相应观测。',rain,.15,.15),
 ],
 'C6-explain':[
  p('先看携水汽的空气到达',['cloud-inflow'],'到达 · 此时水仍是气态','气团与水汽符号沿来流进入，云滴和本次降雨尚未出现。',rain,.1,.2),
  p('再沿坡上升',['cloud-lift'],'沿坡抬升 · 同一空气团继续移动','固定山体，金色气团沿坡向上，不能把来流与降雨同时显示。',rain,.2,.36),
  p('空气膨胀冷却',['cloud-lift'],'膨胀冷却 · 凝结前的条件','气团变大、定性颜色变冷；这时还没有跳到地面降雨。',rain,.36,.43),
  p('继续推进，满足凝结条件后',['cloud-condense'],'条件满足 · 云滴逐渐出现','白色云团和云滴随后出现，有云仍不等于下雨。',rain,.43,.6),
  p('云滴增长以后才有降水',['cloud-condense','cloud-precipitation'],'先增长 · 再看较大水滴下落','放大滴增长后，降水符号才向同一山体表面落下。',rain,.6,.82),
  p('水到地表后再汇流或入渗',['cloud-runoff'],'雨到地表 · 接到汇流和入渗','保留原山体并展开剖切，让地表与入渗去向接在降水以后。',water,.82,1),
  p('暂停、回拖会同时停住',['cloud-runoff'],'共同进度 · 停住或回退同一过程','气团、云滴、降雨和坡面水共用进度，不由墙上时间继续运行。',water,1,1),
 ],
 'C6-observe':[
  p('请把进度停在云开始出现的位置',['cloud-condense'],'暂停成云 · 对比下一阶段','先用进度滑块停在成云阶段，再推进到地面降水，观察对象变化。'),
  p('当前进度只是解释顺序',['cloud-lift','cloud-condense'],'进度是解释顺序 · 没有钟点','保持手动选择的状态，不能为画面补出实况发生时间。'),
  p('阅读真实天气时',['cloud-condense'],'核对观测 · 时间、变量与范围','真实事件的证据应来自对应观测，这个山坡模型不替代天气记录。'),
 ],
 'C6-bridge':[
  p('一次天气告诉我们',['cloud-condense','cloud-precipitation'],'短时状态 · 不能代表全年','保留后段云雨与山体，这只是理解一次过程的阅读尺度。',{layer:'water'},.95,.95),
  p('下一步仍固定一个地方',['cloud-lift'],'固定地方 · 扩大到一年','接下来继续在同一山地比较季节，不能把不同地方当成不同时间。',{layer:'water'},.95,.95),
  p('这样就能区分',['cloud-condense'],'天气与季节 · 两种时间问题','一次状态与一年重复背景有不同资料要求，章节沿这个问题衔接。',{layer:'water'},.95,.95),
 ],
 'C7-opening':[
  p('现在从短时天气',['climate-surface'],'同一地形 · 由短时扩大到一年','保留同一山地与视角，先看夏季地表，再比较冬季状态。',{layer:'season',season:1},.5,.5),
  p('夏季、冬季的照射和环流背景不同',['climate-surface'],'夏冬对照 · 背景条件重复改变','同一地形切到冬季积雪与地表状态，不搬到另一地区比较。',{layer:'season',season:3},.5,.5),
  p('这里比较的是季节条件',['climate-surface'],'季节示意 · 不是四张逐日实况','停留在冬季状态；某天具体云雨仍须对应天气资料。',{layer:'season',season:3},.5,.5),
 ],
 'C7-explain':[
  p('从夏至切到冬至',['terrain-snow','terrain-surface'],'先保留夏至 · 同一山地与视角','先显示夏季地表，随后切换同一模型的冬季状态。',{layer:'season',season:1},.5,.5),
  p('观察同一山地表面与照射背景的变化',['terrain-snow','terrain-surface'],'切到冬至 · 高处积雪与地表对照','同一山地进入冬季积雪与地表状态，位置和地形没有改变。',{layer:'season',season:3},.5,.5),
  p('不同海拔和坡向',['climate-surface'],'同一季节 · 高低与坡向仍有差异','高处、低处保留在一个模型，不能把季节条件当成整区一致。',{layer:'season',season:3},.5,.5),
  p('季节为天气提供重复的背景',['climate-surface'],'重复背景 · 不保证当天雪雨','季节模型不能给某天承诺下雪、无雨或具体温度。',{layer:'season',season:3},.5,.5),
 ],
 'C7-observe':[
  p('请切换回夏至',['terrain-snow','terrain-surface'],'亲手换季 · 地形和位置保持','由用户切回夏至比较，再回到冬至；不自动覆盖手动季节。'),
  p('选择固定地点的目的',['climate-surface'],'固定地点 · 避免混淆时间与空间','比较的是同一模型的季节状态，不把另一地方当作早晚时期。'),
  p('记录你看到的是季节示意',['climate-surface'],'示意之后 · 用同口径资料检验','真实变化需要相同地点、变量和口径的季节资料。'),
 ],
 'C7-bridge':[
  p('春夏秋冬会重复出现',['climate-surface'],'季节会重复 · 长期背景还可能改变','回到夏季地表，保留同一高原对象，再改变认识的时间尺度。',{layer:'season',season:1},.5,.5),
  p('下一步离开一年循环',['climate-surface'],'多年尺度 · 转问能量驱动','接下来讨论多年能量背景，不能把夏冬变化直接当作全球变暖。',{layer:'season',season:1},.5,.5),
  p('我们先看能量扰动与系统响应',['climate-surface'],'先驱动、再响应 · 最后查证据','不同问题对应不同过程与资料，后面用有年份的研究记录核对。',{layer:'season',season:1},.5,.5),
 ],
 'C8-opening':[
  p('季节循环源于',['climate-surface'],'时间尺度改变 · 多年背景','保留高原地表，先把一年循环与多年气候背景分开。',{layer:'forcing'},.1,.1),
  p('现代全球变暖主要与人类活动增加温室气体有关',['climate-atmosphere'],'最初驱动 · 温室气体改变散失条件','沿向外与大气交换的路径理解能量条件，动画没有当地变暖测量值。',{layer:'forcing'},.1,.35),
  p('我们先回到能量收支',['climate-space','climate-atmosphere'],'回到收支 · 再问高原响应','先追踪能量的进入、向外与交换，不用冰雪外形单独反推原因。',{layer:'forcing'},.35,.35),
 ],
 'C8-explain':[
  p('温室气体改变地球向外散失能量的条件',['climate-atmosphere','climate-space'],'驱动 · 改变向外散失的条件','向外长波与大气交换共同可见，保留太阳进入路径作为收支参照。',{layer:'forcing'},.1,.35),
  p('系统需要调整到新的收支状态',['climate-atmosphere','climate-surface'],'系统调整 · 收支与储存状态改变','沿共同能量路径继续推进，调整是响应而非另一个太阳季节。',{layer:'forcing'},.35,.65),
  p('冰雪、海洋和陆地各有不同响应时间',['climate-surface'],'响应不同 · 不能假定同时变化','保留系统背景，定性响应阶段没有真实年份、当地变化量或预测。',{layer:'forcing'},.65,.8),
  p('眼前箭头用于理解能量关系',['climate-space'],'原理解释 · 地方变化量还需证据','停住完整能量关系，不能从箭头宽度或方向读出某处冰川变化量。',{layer:'forcing'},.8,.8),
 ],
 'C8-observe':[
  p('请从侧面辨认',['climate-space','climate-atmosphere'],'进入、向外与交换 · 分别辨认','转动同一场景读方向，不把一场暖天气直接当作多年趋势。'),
  p('想一想哪一部分属于最初驱动',['climate-atmosphere'],'最初驱动 · 能量散失条件改变','沿向外长波和大气交换路径辨认驱动，不给出当地定量结论。'),
  p('把这两层分开',['climate-surface'],'再看响应 · 用具体对象和资料检验','响应与驱动分开以后，才进入有地点、有年份的变化研究。'),
 ],
 'C8-bridge':[
  p('理解驱动机制以后',['climate-atmosphere'],'原理之后 · 还需具体资料','保持能量关系，不让概念动画替代地方观测。',{layer:'forcing'},.8,.8),
  p('下一步在地图找到色林错',['climate-surface'],'下一段 · 定位同一湖泊','将认识转到真实地点和研究报告，不能由这里的箭头直接推出湖面变化。',{layer:'forcing'},.8,.8),
  p('先核对对象、日期、单位与资料身份',['climate-space'],'先核对口径 · 原因还需独立证据','对象、日期、单位对齐后才比较数值，两个状态不能单独证明原因。',{layer:'forcing'},.8,.8),
 ],
 'C9-opening':[
  p('先在西藏整体地图找到色林错',['atlas:siling-co-study'],'整体地图 · 色林错研究区参照','标记是研究区范围中心参照，不是湖岸线或精确面积轮廓。',{layer:'change'},0,0),
  p('朱立平等二〇一九年的研究总结报告',['atlas:siling-co-study'],'研究来源 · 2019年发表汇总','先核对研究与变量，柱形表示论文汇总的湖面面积。',{layer:'change'},0,0),
  p('一九七六年湖面面积',['atlas:siling-co-study'],'1976年 · 1667平方公里','先读取1976年发表汇总面积，单位是平方公里。',{layer:'change'},0,0),
  p('二〇一七年为',['atlas:siling-co-study'],'2017年6月 · 2389平方公里','选择第二个已发表状态；不把进度解释为中间年份。',{layer:'change'},1,1),
  p('这里比较的是湖面面积',['atlas:siling-co-study'],'比较变量 · 面积并非体积','保留同一研究区与两期面积，不推算水量。',{layer:'change'},1,1),
 ],
 'C9-explain':[
  p('两条柱形共用零点',['atlas:siling-co-study'],'共同零点 · 同一平方公里单位','两条柱形按同一单位读取，后一期报告面积较大。',{layer:'change'},1,1),
  p('原文注明二〇一七年为六月',['atlas:siling-co-study'],'2017年6月 · 日期有明确范围','第二期有月份，另一时期不能擅自补上具体月日。',{layer:'change'},1,1),
  p('一九七六年在该段没有具体月日',['atlas:siling-co-study'],'1976年 · 原文该段未给月日','回到1976年已发表状态，保留资料中的日期限制。',{layer:'change'},0,0),
  p('这些是已发表研究的汇总数值',['atlas:siling-co-study'],'资料身份 · 论文汇总、没有中间期','产品没有处理原始影像，也没有补出连续变化或中间年份。',{layer:'change'},0,0),
 ],
 'C9-observe':[
  p('请先选择一九七六年',['atlas:siling-co-study'],'手动选择两期 · 不插值年份','用1976年和2017年按钮比较同一零点与单位，保留整体地图。'),
  p('然后打开研究原文核对',['atlas:siling-co-study'],'核对原文 · 日期与资料身份','论文汇总、影像处理和现场测量是不同资料身份。'),
  p('湖面面积不等于湖水体积',['atlas:siling-co-study'],'证据边界 · 面积不能单独证明原因','两个已发表状态支持面积差异，不单独支持原因、体积或未来预测。'),
 ],
 'C9-bridge':[
  p('这个案例让我们把地点',['atlas:siling-co-study'],'地点、年份、变量 · 放在一起','保持色林错研究区与两期柱形，让证据口径接回地图位置。',{layer:'change'},1,1),
  p('气候章节建立了热量',['atlas:siling-co-study'],'回看机制 · 证据与原理互相参照','机制解释与研究记录各有作用，不能相互替代。',{layer:'change'},1,1),
  p('接下来回到西藏内部',['atlas:siling-co-study'],'从一个案例 · 回到地区比较','下一段比较林芝、那曲和阿里，继续在整体地理中组合条件。',{layer:'change'},1,1),
 ],
};
