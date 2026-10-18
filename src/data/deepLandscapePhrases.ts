import type {NarrationScenePhrase} from '../lib/narrationScenePhrase';
const p=(token:string,targets:string[],title:string,explanation:string,from?:number,to=from,settings?:NarrationScenePhrase['settings']):NarrationScenePhrase=>({token,targets,title,explanation,from,to,settings});
/** Every anchor belongs to the unchanged, recorded script. Model ranges are
 * qualitative operations or sourced terrain readings, never invented dates. */
export const deepLandscapePhrases:Record<string,NarrationScenePhrase[]>={
 'E1-opening':[
  p('前面认识了',['nyingchi'],'先保留整片高原','带着相同问题定位地区，城区点不代替行政区。'),
  p('从藏东南的林芝进入',['nyingchi'],'林芝 · 藏东南的入口','真实高程与城区参照使用同一经纬坐标。',undefined,undefined,{selected:'nyingchi',compareRegion:''}),
  p('再看高原腹地的那曲',['nagqu','ngari'],'再看那曲与阿里','保留全域，只改变当前关注的地区。',undefined,undefined,{selected:'nagqu',compareRegion:'ngari'}),
  p('一个行政地区也有不同高度和坡面',['nagqu','nyingchi'],'地区内部也有高低差','一个读点不能代表全部山地、坡向和谷地。'),
 ],
 'E1-explain':[
  p('高度、来流、水汽与山谷方向',['nyingchi','nagqu'],'共同海平面 · 读两个高程样点','竖线读取源网格高程；高度不等于气温或雨量。',undefined,undefined,{selected:'nyingchi',compareRegion:'nagqu'}),
  p('它们的组合随地区改变',['nyingchi','ngari'],'换地区 · 保留同一底图','位置和起伏改变，气候变量仍要分别查资料。',undefined,undefined,{selected:'nyingchi',compareRegion:'ngari'}),
  p('画面使用同一高程网格',['nyingchi','ngari'],'同源高程 · 同一高度基准','两根读点竖线对应这份网格，没有替地区计算平均。'),
  p('温度、降水和植被还需对应资料',['nyingchi'],'地形能说明什么','地形颜色只有海拔含义，不能凭颜色推算全部环境。'),
 ],
 'E1-observe':[
  p('请选择那曲',['nyingchi','nagqu'],'自己换地点 · 比较相同问题','操作暂停讲解；保留底图、单位和读点的尺度。'),
  p('问的仍是同一个问题',['nagqu','ngari'],'把位置接到水热问题','地区介绍要与同一地点、时期和变量相互核对。'),
  p('城区标记是地区入口',['nagqu'],'一个点不是一个地区','竖线是网格样点高程，城区点只负责定位。'),
 ],
 'E1-bridge':[
  p('看到差异以后',['nagqu','nyingchi'],'保留两地 · 再检查比较方法','不同位置能提出问题，尚未自动解释气候差异。'),
  p('下一步固定问题与观察主题',['nagqu','nyingchi'],'固定变量、时期与范围','用同一问题读资料，避免把不同尺度混为一谈。'),
 ],
 'E2-opening':[
  p('刚才看到了地区不同',['nagqu','nyingchi'],'先固定两地和相同底图','相同高度基准有助于辨认地形。'),
  p('如果要比较冷暖或水分',['nagqu','nyingchi'],'冷暖、水分需要各自资料','高程竖线不是气温柱，也不是降水量。'),
  p('这里保留同一观察层',['nagqu','nyingchi'],'地点可以变 · 问题要保持','地图、照片与统计具有不同资料范围。'),
 ],
 'E2-explain':[
  p('一个谷地的当天温度',['nagqu','nyingchi'],'当天与多年平均不能混比','图上两地只定位地形，不画未取得的气温数据。'),
  p('不同海拔地点',['nagqu','nyingchi'],'共同基准 · 看源高程读点','两根竖线来自各自经纬样点，均以海平面为基准。'),
  p('颜色表示网格海拔',['nagqu','nyingchi'],'海拔颜色只有一个变量','位置、高差与地方材料相互参照，气候另查同口径记录。'),
  p('可靠气候比较还需同口径资料',['nagqu','nyingchi'],'先说明范围 · 才能解释差异','没有用两个城市点代替整个地区的统计。'),
 ],
 'E2-observe':[
  p('请保持地点甲为那曲',['nagqu','nyingchi'],'固定甲 · 自己改变乙','保留同一张高程地图，比较条件可逆。'),
  p('先读位置、山地与谷地',['nagqu','ngari'],'读地形之后再读地方材料','这里没有由地形推出气温或降水数值。'),
  p('气候数值需要来源',['nagqu','ngari'],'来源、统计期、单位要配套','模型中的海拔配色不替代这些资料。'),
 ],
 'E2-bridge':[
  p('地区比较不只是自然知识',['nagqu','nyingchi'],'从差异走向生活条件','环境为生活提供条件，不能直接决定文化。'),
  p('下一步沿水源',['lhasa'],'带着水源、土地与通行问题','接下来明确切换到条件模型，再认识人的组织和选择。',undefined,undefined,{selected:'lhasa',compareRegion:''}),
 ],
 'E3-opening':[
  p('刚才已经比较真实地形',['living-slope'],'从真实地区进入条件对照','这一幅场地只解释关系，不重建真实村落。',0,0),
  p('有水路、较缓地面和坡地',['living-water','living-land'],'先认水、缓地与坡地','水源与地面保留，取用还没有发生。',0,0),
  p('它们提供机会与限制',['living-slope','living-land'],'条件不会自行变成生活','房屋、生产与组织还需要人的行动。',0,0),
 ],
 'E3-explain':[
  p('沿同一坡面看取水',['living-water'],'先找水源与容器','同一个容器接续取水、携水和储水。',.28,.30,{selected:'living-water'}),
  p('人物先在水源旁把容器装水',['living-water','living-transfer'],'在水源旁装水','容器里的水先增加；储水处尚未收到这次水。',.30,.40,{selected:'living-water'}),
  p('再带着水走向用水处',['living-access'],'沿坡面携水到用水处','水随同一个容器移动，需要人的劳动和通行。',.40,.72,{selected:'living-access'}),
  p('水没有自行流向高处',['living-access'],'保持到达位置','携水是人的行动，不能画成自然水流爬坡。',.72,.72),
  p('走到以后，抬起容器',['living-transfer'],'抵达后再抬起容器','先完成携水，再准备倒入。',.72,.76,{selected:'living-houses'}),
  p('把水倒进储水构件',['living-transfer'],'同一份水转入储水处','可见水束接在容器与储水构件之间。',.76,.88),
  p('携带的水减少，储水增加',['living-transfer','living-houses'],'携水减少 · 储水增加','这是同一次转移，不是在目的地凭空生成水。',.88,.94),
  p('山坡和水源都保持原样',['living-slope','living-houses'],'自然条件保留 · 使用需要组织','不变的是山坡与水源，接续它们的是设施和劳动。',.94,.94),
  p('真实地方还要核对',['living-water'],'回到具体地方还要查资料','季节、水质、土壤和使用权利不能由模型给出。',.94,.94),
 ],
 'E3-observe':[
  p('请保留河谷条件',['living-slope','living-water'],'固定自然 · 只改变组织','操作由自己完成，环境与原始水源不会变。'),
  p('看山坡、水源有没有变',['living-access','living-water'],'比较设施与共同通行','共同与分别使用的构件不同，模型不给组织方式评分。'),
  p('而是说明相同环境',['living-houses'],'环境之外仍有选择','具体社区怎样安排，需要对应调查材料。'),
 ],
 'E3-bridge':[
  p('条件模型让我们看见了',['living-water','living-houses'],'水源到生活的接续已经可见','保持同一份水与使用目的，再回到地区证据。'),
  p('下一步回到真实高程',['living-slope'],'回到真实山川 · 找到空间来路','下一段在整体地图中找到林芝局部，避免失去方位。'),
 ],
 'P1-opening':[
  p('从河谷生活的条件回到真实地形',['local-overview'],'先回到西藏整体地形','局部与整体共享经纬坐标和方向。',.12,.12),
  p('金色框标出局部数据范围',['local-window'],'金色框 · 林芝局部窗口','窗口是真实数据范围，外面保留整体山系。',.12,.12),
  p('接下来靠近同一坐标',['local-window'],'同坐标靠近 · 范围不会跳走','约400米是显示抽样，不是测绘精度。',.12,.12),
 ],
 'P1-explain':[
  p('镜头沿金色数据窗口靠近林芝周边',['local-window'],'从整体靠近同一块地面','沿窗口进入局部，保留完整地形的来路。',.12,.50),
  p('较密的高程网格显出山地起伏',['local-town','local-window'],'靠近以后 · 辨认真实起伏','城区点只定位；周围高度来自源网格。',.50,.50),
  p('颜色代表海拔',['local-window'],'海拔配色 · 高度显示×2','颜色没有编码气温、雨量、植被或道路。',.50,.50),
  p('继续进入南北剖面',['local-profile'],'固定南北方向 · 展开高程线','剖面表示地面高度，不表示地下地层。',.68,.72,{cutaway:true}),
  p('切线向东西移动',['local-profile','local-probe'],'同一方向 · 改变切线位置','源网格重新给出这条线的高低样本。',.72,1),
  p('它们是这条线上读到的样本',['local-slope','local-valley'],'较高与较低 · 都是当前线上的样本','不把网格点称为峰顶测量或完整河道。',1,1),
 ],
 'P1-observe':[
  p('请移动高程切线',['local-profile','local-slope','local-valley'],'自己移动切线 · 比较高低组合','操作可逆；原始高程和南北方向保持一致。'),
  p('可以展开高程切面',['local-profile'],'切面是地面高度读法','从地表延伸到参考面，不是地下岩层资料。'),
  p('城区点只帮助定位',['local-town','local-window'],'近看仍要保留范围','局部山地不能代表整个林芝地区。'),
 ],
 'P1-bridge':[
  p('公开高程说明今天哪里高',['local-profile','local-window'],'高程回答形态 · 成因另需材料','数据描述今天的地面，不自动给出地貌年代。'),
  p('下面会明确换成概念河谷',['local-valley'],'从真实形态转向一般过程','下一幅解释汇水、侵蚀、搬运与堆积，非地方历史复原。'),
 ],
 'P2-opening':[
  p('刚才用真实高程',['landform-slope'],'先说明场景身份','现在换成概念河谷，真实地点的资料仍分开阅读。',0,0),
  p('先找坡面、河道和较低处',['landform-slope'],'先认高低 · 保留初始轮廓','三个位置提供过程发生的空间背景。',0,0),
  p('模型不对应某条真实峡谷',['landform-slope'],'没有侵蚀米数或形成年份','进度只是解释顺序，不能当作地质时间。',0,0),
 ],
 'P2-explain':[
  p('沿水路看物质进入河道并向下移动',['landform-channel','landform-sediment'],'水路先接上物质搬运','水与物质分别显示，流向都沿同一河谷向低处。',.20,.45),
  p('同时比较谷地局部下切',['landform-channel','landform-slope'],'下切 · 比较初始轮廓','保留浅色初始轮廓，地表下切才能被对照看见。',.45,.60),
  p('继续推进',['landform-channel'],'搬运继续 · 地形还是同一片','后面的低处堆积接在搬运之后。',.60,.60),
  p('一部分物质在较低处堆积',['landform-deposit'],'物质到低处 · 逐渐堆积','堆积与水的移动不是同一个对象。',.66,.90),
  p('地表出现更平缓的空间',['landform-deposit'],'地面随堆积改变','这是定性过程，没有测定厚度或年代。',.90,1),
  p('移动的水、被搬运的物质和改变的地形',['landform-channel','landform-sediment','landform-deposit'],'三种对象 · 分开观察','粒子数不代表真实流量或含沙量。',1,1),
 ],
 'P2-observe':[
  p('请把过程退回初始地形',['landform-slope'],'自己回拖 · 与初始轮廓比较','回拖恢复相同地表与物质位置，不产生另一个计时器。'),
  p('分别观察水路、河谷轮廓和物质位置',['landform-channel','landform-sediment','landform-deposit'],'看水、物质和轮廓是否一起恢复','相似外形的成因仍要用岩石、测绘与年代研究。'),
  p('不能把这个动画的速度',['landform-slope'],'动画速度不是侵蚀速率','解释阶段不能代替实测过程。'),
 ],
 'P2-bridge':[
  p('汇水、侵蚀与堆积',['landform-channel','landform-deposit'],'自然过程留下空间条件','物质变化有其来路，人的使用还要另作解释。'),
  p('下一步回到生活场地',['landform-slope'],'从空间条件走向人的行动','地名、信仰与地方记忆，需要具体材料和参与者。'),
 ],
 'P3-opening':[
  p('地表过程留下了',['living-slope'],'条件留下以后 · 再问怎样使用','现在的场地只解释条件与行动，不复原地方历史。',0,0),
  p('现在保留水、坡地与缓地',['living-water','living-land'],'先认不变的水与地形','取水、通行和储水还没有展开。',0,0),
  p('场景不是某个真实村落',['living-slope'],'真实地方的材料另读','地区入口不能让模型替居民编写历史。',0,0),
 ],
 'P3-explain':[
  p('先在水源旁取水',['living-water','living-transfer'],'先装水 · 容器收到水','先看自然水源，再看人的取用。',.28,.40,{selected:'living-water'}),
  p('再沿通行段把水带到生活空间',['living-access'],'沿通行段携水 · 需要劳动','水随同一容器经过坡面，不自行爬坡。',.40,.72,{selected:'living-access'}),
  p('最后倒入储水容器',['living-transfer','living-houses'],'到达以后再倒入','同一份携水减少，储水随转移增加。',.74,.94,{selected:'living-houses'}),
  p('水怎样可被使用',['living-houses','living-access'],'水源变成可用的水 · 还需设施与安排','自然条件仍保留，使用关系由行动接续。',.94,.94),
  p('可以保持同一地形',['living-access','living-houses'],'组织方式可以比较','按自己的操作选择分别或共同使用，模型不替方式评分。',.94,.94),
  p('地名、故事与信仰的意义',['living-memory'],'意义还需要人、年代与材料','空白记录处不代写社区故事。',.94,1,{selected:'living-memory'}),
 ],
 'P3-observe':[
  p('请选择地方记忆的记录桌',['living-memory'],'从空白记录处提出问题','自己选择、再读材料；动画没有写下故事。'),
  p('可以继续问谁在使用空间',['living-houses','living-memory'],'谁使用 · 怎样建造、学习与维护','具体解释要有参与者、年代和资料。'),
  p('下一段先从院落与厅堂',['living-houses'],'从生活空间接到文化实践','自然条件之外，继续研究建造、交流和维护。'),
 ],
 'P3-bridge':[
  p('环境解释了部分机会与限制',['living-slope','living-houses'],'条件与人的选择一起认识','文化还要看创造、交流与历史。'),
  p('接下来在同一院落里',['living-houses','living-memory'],'下一段进入建筑与使用','先读构造和空间，再核对具体建筑的来历。'),
 ],
};
