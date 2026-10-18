export interface OrientationLayer { id: string; label: string; title: string; explanation: string; lookFor: string }

/** Administrative belonging and physical geography are different readings of the same globe. */
export const geographicHierarchy = [
  { id: 'globe', name: '地球', kind: '共同环境', detail: '海洋、大陆与大气构成认识地方的整体背景。' },
  { id: 'asia', name: '亚洲', kind: '洲', detail: '西藏位于北半球、亚洲大陆。洲不是国家或行政区。' },
  { id: 'china', name: '中国', kind: '国家', detail: '西藏自治区属于中国。先看全国范围，再沿西南方向找目标。' },
  { id: 'southwest', name: '中国西南', kind: '方位', detail: '这里表示西藏在中国的方位；不是本图绘出的独立行政区。' },
  { id: 'tibet', name: '西藏自治区', kind: '省级行政区', detail: '本产品的地区认识目标。行政范围用于定位地区和组织统计。' },
] as const;

export const earthOrientationLayers: Record<string, OrientationLayer[]> = {
  G1: [
    { id: 'earth-system', label: '地球上有什么', title: '海洋、陆地与空气，是相连的生活环境', explanation: '蓝色海洋储存水和热量，陆地上有高山、平原和河流；空气包围地表。寒冷处能留下冰雪，适合的水热条件支持植物生长。先认清这些对象，再看热和水怎样在它们之间移动。', lookFor: '转动完整地球，找海洋、陆地、冰雪和植被；再看包围它们的大气。' },
    { id: 'earth-heating', label: '为什么有冷暖', title: '相同的一束阳光，为什么铺开的面积不同？', explanation: '地球是球体，阳光照到不同纬度时倾斜程度不同。照得较直，能量落在较小面积；照得斜，同一束能量分散得更开。这建立了低纬与高纬的冷暖背景，海陆和空气还会储存、交换与搬运热量。', lookFor: '沿光束看地表落点：对比照得较直和较斜时的覆盖面积，再看赤道与高纬位置。' },
    { id: 'earth-circulation', label: '风与水怎样走', title: '空气运动，把热量与水汽带到别处', explanation: '不均匀受热参与形成气压差，气压差推动空气运动，地球自转使运动方向偏转。海洋和陆地的水蒸发进入空气，随风到别处；湿空气抬升冷却，才可能凝结成云。会流动的空气，让各地的环境彼此相连。', lookFor: '跟随移动的空气，分辨上升、下沉和水平输送；再追踪水从地表进入空气。' },
    { id: 'earth-contrasts', label: '为什么各地不同', title: '把刚果、撒哈拉和高原放在同一个地球上比较', explanation: '刚果盆地的热带低地，热与水共同支持森林；撒哈拉所在的副热带，下沉空气不利于形成云雨；青藏高原则把地面抬到更高的位置，高度与山系又改变温度和空气经过的条件。位置、环流、海陆和地形，需要放在一起解释地方。', lookFor: '依次选择刚果盆地、撒哈拉和青藏高原，比较每处改变了什么条件，以及出现什么结果。' },
  ],
  G2: [
    { id: 'globe', label: '从地球定位', title: '把刚才的整体认识，带到西藏这个地方', explanation: '已经看见地球上的水、陆地与空气怎样联系，现在沿地球、亚洲、中国到西藏逐层靠近。每次只换一个尺度，同时保留海洋与大陆方向，便能继续追问外部环境怎样影响这里。', lookFor: '按“地球 → 亚洲 → 中国 → 西藏”切换；每次靠近都确认仍在原来的整体中。' },
    { id: 'asia', label: '亚洲 · 洲', title: '亚洲是洲：中国和西藏在亚洲的什么位置？', explanation: '亚洲大陆向南联系印度洋，向东面向太平洋。中国位于亚洲东部；西藏在中国西南。洲、国家、行政区属于不同层级：先辨认中国的范围，再进入国家尺度看目标的位置。', lookFor: '看亚洲大陆、南侧印度洋、东侧太平洋，以及其中的中国范围。' },
    { id: 'china', label: '中国 · 国家', title: '在中国范围内，沿西南方向找到西藏', explanation: '中国是西藏所属的国家。青色线与浅色面提供全国范围参照，金色面指出西藏自治区；“中国西南”标注帮助辨认方位。西藏是省级行政区，拉萨是其中的一座城市，不能用一个城市点代替整个地区。', lookFor: '对照中国和西藏两层范围；找到西南方位，再看西藏与拉萨的尺度差别。' },
    { id: 'tibet', label: '西藏 · 自治区', title: '走近西藏，保留国家背景，再分清自然高原', explanation: '西藏位于北半球、亚洲、中国西南，是中国的自治区。金色范围帮助认识今天的行政西藏；青绿色范围是青藏高原的概化自然背景，两者不相同。下一步把视野向周围展开，认识纬度、海陆、山系与空气水汽的外部联系。', lookFor: '金色是西藏行政参考，青绿色是自然高原示意，拉萨只是城市定位点。' },
    { id: 'surroundings', label: '海陆与山地', title: '南侧有海洋，中间隔着陆地与山系', explanation: '从印度洋向北，依次看南亚陆地、喜马拉雅与高原内部。海洋提供水汽，空气把它带向陆地；沿途山系会让空气抬升或绕行，谷地也能成为通道。西藏的环境，因此与边界以外的海陆和空气运动相连。', lookFor: '沿印度洋 → 南亚 → 喜马拉雅 → 高原查看连续空间，而不是只看西藏的轮廓。' },
    { id: 'latitude', label: '纬度位置', title: '从赤道向北看：纬度提供怎样的太阳背景？', explanation: '赤道把地球分为南北半球。西藏约在北纬27°—37°，位于北回归线以北；纬度参与影响太阳入射角和昼长，但不能独自解释这里的气温与降水。同一纬度的高原和低地仍可能很不同，还要看高度、海陆、环流和山地。', lookFor: '沿赤道、北回归线与西藏的纬度位置对照；下一层把它放进五带背景。' },
    { id: 'zones', label: '五带背景', title: '五带解释太阳背景，地方气候还要继续拆开', explanation: '回归线与极圈把球面分成热带、南北温带和南北寒带；西藏的纬度落在北温带。五带不是当地气候类型图，也不表示整片西藏温和：高海拔、季节环流、水汽和地形会共同改变地方环境。随后仍需进入具体机制与地区对照。', lookFor: '对照五带颜色和西藏位置；颜色表示天文纬度带，不是气温实测或气候分区。' },
    { id: 'plateau', label: '行政与自然', title: '同一个位置，可以用行政和自然两种范围认识', explanation: '西藏自治区用于今天的行政定位与地区统计；青藏高原则是跨越行政范围的自然地理对象，包含复杂山系、盆地与河谷。它们不是上下级行政关系。认识环境应沿自然过程观察，认识历史和文化还要结合具体时代、地点和材料。', lookFor: '保留西藏定位，同时对照金色行政范围和青绿色自然高原示意。' },
    { id: 'moisture', label: '空气与水汽', title: '空气和水汽怎样把外部环境带到高原？', explanation: '南侧海洋与西侧环流是两类外部联系；西风也可能携带水汽，不能一概当作干风。季节变化会改变输送背景，高度、山地和空气含水量再影响地方结果。这里的移动箭头只表示联系方向；季节、天气过程与长期气候变化要分别认识，不能用这条线推算降水。', lookFor: '拖动进度追踪两条来路；从整个亚洲背景，进入后面的环流、抬升和云雨细节。' },
  ],
};

export const orientationSources = [
  { title: '西藏自治区人民政府 · 基本概况', url: 'https://shb.xizang.gov.cn/zjxz/jbgk/201707/t20170721_241650.html', note: '行政地理位置与经纬度范围；图上用约27°—37°N帮助辨认纬度。' },
  { title: 'NOAA · 纬度与五条重要纬线', url: 'https://oceanservice.noaa.gov/facts/latitude.html', note: '纬度、赤道、回归线与极圈的背景。五带不等同地方气候分类。' },
  { title: 'NOAA · 气候系统', url: 'https://www.noaa.gov/education/resource-collections/climate', note: '海洋、陆地、太阳和大气共同参与气候；气候由统计描述。' },
  { title: 'NASA · 地球的海洋、地表与大气', url: 'https://science.nasa.gov/earth/facts/', note: '支持地球要素介绍。大气光晕、冰雪和植被强调用于辨认对象；不是大气厚度、即时积雪或植被调查。' },
  { title: 'NASA · 地球能量收支', url: 'https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/', note: '支持太阳能输入、地表与空气交换及向外散失。照射斑和颜色解释几何与过程，不对应当地实测温度或能量通量。' },
  { title: 'NOAA · 全球大气环流', url: 'https://www.noaa.gov/jetstream/global/global-atmospheric-circulations', note: '不均匀受热、自转与海陆分布共同参与环流。三圈与副热带下沉是大尺度平均概念，动画不是某日风场或真实粒子轨迹。' },
  { title: 'NOAA GFDL · 云与对流', url: 'https://www.gfdl.noaa.gov/clouds-and-convection/', note: '支持蒸发、水汽输送、凝结与降水的区别。湿空气上升可能成云；形成降水还需要云滴或冰晶增长。' },
  { title: 'NASA · 刚果盆地的云与森林', url: 'https://science.nasa.gov/earth/earth-observatory/cloudy-congo-river-basin-144608/', note: '2018年11月5日航天员照片与解释，支持赤道附近森林、热湿空气上升成云的案例；不代表全年每天都下雨。' },
  { title: 'NASA · 刚果雨林的干季', url: 'https://science.nasa.gov/earth/earth-observatory/a-longer-dry-season-in-the-congo-rainforest-145253/', note: '2019年介绍1980—2015年研究，说明雨林也存在干湿季。开场没有导入该研究的变化数值或把它作为现在的天气。' },
  { title: 'NASA · 非洲植被与降雨对照', url: 'https://science.nasa.gov/earth/earth-observatory/vegetation-and-rainfall-in-the-sahel-7277/', note: '采用2004年月份影像与1998—2005年资料说明撒哈拉、萨赫勒和刚果森林的空间与季节差异。开场的三地标记是选例位置，不是精确气候分区。' },
  { title: 'UCAR · 气候为何随地点不同', url: 'https://scied.ucar.edu/activity/climate-variability-card-shuffle', note: '支持纬度、海拔、海陆与季节影响地方气候；山地通常较邻近低地凉，不能仅凭海拔推算某地某时的气温。' },
  { title: 'UCAR · 山地如何促使云形成', url: 'https://scied.ucar.edu/learning-zone/clouds/clouds-form-mountains', note: '支持迎风抬升、冷却与凝结的条件关系；示意不代表所有坡面都有同样降水。' },
  { title: '中科院地球环境所 · 藏东南夏季水汽来路研究', url: 'https://ieexa.cas.cn/news/kydt/202506/t20250606_7798567.html', note: '2025年研究结合1940—2020年夏季再分析，支持印度洋、孟加拉湾与藏东南的联系；不是全西藏全年统一路径。' },
] as const;

export const orientationObjects: Record<string, { name: string; explanation: string }> = {
  'earth-ocean': { name: '海洋 · 水与热量的储存处', explanation: '海洋覆盖地球的大部分表面，储存大量水与热量。水蒸发进入空气，空气运动把水汽带向别处；海洋因此参与影响远处陆地的环境。' },
  'earth-land': { name: '陆地 · 有高低起伏的表面', explanation: '大陆上有高山、高原、平原和河谷。它们承接阳光和降水，地面的高度与形态又影响空气、水流和生活条件。先认识大陆整体，再靠近具体地区。' },
  'earth-air': { name: '大气 · 会流动的空气', explanation: '空气包围地球。受热和气压差异参与空气运动，运动的空气把热量与水汽带向别处。浅蓝光晕帮助辨认大气的位置，显示厚度经过夸张。' },
  'earth-ice': { name: '冰雪 · 寒冷环境留下的水', explanation: '水在足够冷的条件下能以冰雪形式留在地表；它也会融化并参与水循环。这里用南极冰盖位置帮助辨认冰雪，不代表全球实时积雪范围。' },
  'earth-vegetation':{name:'植物 · 水热条件中的生命',explanation:'植物生长需要适合的热量与水分。刚果区域的球面影像是认识植被的例子，位置标记没有划定测绘森林边界，也不表示实时生长状态。'},
  'compare-equator': { name: '刚果盆地 · 热带低地', explanation: '这里靠近赤道，有广阔的热带森林。水分充足时，受热上升的湿空气冷却形成云，降水又把水送回地表。热量和水分一起参与森林环境的形成；雨林也有干湿季。' },
  'compare-desert': { name: '撒哈拉 · 副热带干旱区', explanation: '阳光充足不代表雨水充足。撒哈拉处在副热带干旱背景中，下沉空气在下降时增温，不利于水汽凝结和云雨发展。它与刚果森林的差别，提示我们还要看空气怎么运动、水从哪里来。' },
  'compare-plateau': { name: '青藏高原 · 广阔高地', explanation: '这片高地并不在极地，却常比邻近低地寒冷。地面海拔很高，山系还会改变空气与水汽经过的条件；因此同一纬度也能出现不同环境。接下来把它定位到亚洲、中国和西藏，再看高度怎样起作用。' },
  asia: { name: '亚洲 · 洲', explanation: '亚洲是洲。先在地球上找到亚洲大陆，再进入中国这个国家的范围，随后沿中国西南找到西藏。海洋与大陆内部保留在同一个整体中。' },
  china: { name: '中国 · 国家', explanation: '西藏自治区属于中国。青色线与浅色面是小比例尺全国定位参照；金色标出西藏，帮助看清它在中国西南的方位。这个图层用于地区认识，不是精密测绘。' },
  southwest: { name: '中国西南 · 方位参照', explanation: '“中国西南”说明西藏在全国的相对方向。这里使用定位点提示方位，没有把它画成一个统一边界的行政区；继续走近时，具体对象是西藏自治区。' },
  tibet: { name: '西藏自治区 · 省级行政区', explanation: '西藏是中国的自治区，本产品以它组织地区认识。行政范围与青藏高原的自然范围不同，拉萨这个城市点也不能代表整个西藏。' },
  plateau: { name: '青藏高原 · 自然地理单元', explanation: '青藏高原是自然地理对象，范围跨越行政区，不能把它理解为西藏的上一级行政单位。图上青绿色轮廓来自概化地理范围，用于说明自然背景，并非唯一科研划界。' },
  'earth-atmosphere': { name: '大气 · 包围地球的共同环境', explanation: '大气中的空气、水分和能量会移动，不以行政边界为终点。球面浅蓝光晕只帮助辨认大气所在位置，厚度和颜色经过夸张，不是大气厚度或浓度测量。' },
  'earth-equator': { name: '赤道 · 0°纬线', explanation: '赤道把地球分为南北半球。西藏位于北半球；纬度会影响太阳入射角与昼长背景，但认识实际温度和降水，还要加入海拔、环流、海陆和山地。' },
  'earth-tropic': { name: '北回归线 · 约23.44°N', explanation: '北回归线是太阳直射点向北到达的纬度界线。西藏约在27°—37°N，位于其北侧。它是天文地理参照，不能据此直接判断某天的气温或当地的气候类型。' },
  'earth-temperate': { name: '北温带 · 纬度带背景', explanation: '北回归线与北极圈之间是北温带。西藏落在这个纬度带，但高海拔和复杂地形让它的气候不能用“温和”概括；五带只提供太阳背景，并不是实测温度或气候分类地图。' },
  'indian-ocean': { name: '印度洋', explanation: '从亚洲南侧的海洋追问空气和水汽怎样来到高原。海洋位置提供来路背景，实际输送还取决于季节、环流和地形；并非一条连线就代表实际天气。' },
  'pacific-ocean': { name: '太平洋', explanation: '亚洲东侧的海洋是辨认大陆方位的重要参照。海陆分布参与组织大尺度环境，不能把所有海洋影响理解为直接到达西藏的一条路径。' },
  'east-asia': { name: '东亚 · 海陆背景', explanation: '向高原东侧看，陆地与海洋的分布构成另一方向的环境背景。认识这一侧的地形、季节环流和地方联系，有助于把高原放回整个亚洲，而不是只追踪南侧一条路径。' },
  'central-asia': { name: '中亚 · 大陆内部', explanation: '向大陆内部拉远，认识西侧与北侧的大尺度环境背景。西风与其水汽输送需要结合季节、高度和实际路径理解，不能一概称为干风。' },
  'indian-subcontinent': { name: '印度次大陆', explanation: '印度次大陆与高原南侧相邻。它的陆地位置、季节背景和向北的山地关系，为认识外部影响及板块形成过程提供空间参照。' },
  himalaya: { name: '喜马拉雅山系', explanation: '高原南缘的山系参与影响空气运动、地表水与通行。先认识它在哪里，再进入板块与地壳过程，理解山地和高原的长期形成。' },
  lhasa: { name: '拉萨 · 城市定位点', explanation: '拉萨是辨认西藏位置的城市参照。这个点不代表整个西藏或青藏高原，继续观察范围和周边才能建立完整方位。' },
};

export function orientationLayer(stepId: string, layerId: string): OrientationLayer | undefined {
  const layers = earthOrientationLayers[stepId];
  return layers?.find(layer => layer.id === layerId) || layers?.[0];
}
