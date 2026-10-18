import { sources, type Source } from './curriculum';
import type { SceneSettings } from '../lib/store';

export interface PlaceObject {
  name: string;
  question: string;
  stepId: string;
  settings?: Partial<SceneSettings>;
}
export interface PlaceProfile {
  id: string;
  name: string;
  lead: string;
  sections: { title: string; paragraphs: string[]; sourceIds: string[] }[];
  objects: PlaceObject[];
  sourceIds: string[];
  sources: Source[];
}

export const placeSources: Source[] = [
  { id: 'lhasa-water-plan', title: '拉萨市人民政府 · 十四五水安全保障规划', url: 'https://www.lasa.gov.cn/lasa/wjzl/202204/0195f5cb1a964d6c9121791d618ed7e2.shtml', note: '2022年规划介绍拉萨河与不同地貌；规划目标和实际成效分别阅读。' },
  { id: 'yarlung-river', title: '西藏自治区外事办公室 · 雅鲁藏布江', url: 'https://wsb.xizang.gov.cn/xzjx/lyjd/201107/t20110713_100958.html', note: '河流、支流与河谷地理介绍；本文不把历史统计数值作为实时水量。' },
  { id: 'shannan-valley', title: '西藏自治区人民政府 · 山南河谷与地方文化', url: 'https://www.xizang.gov.cn/xwzx_406/dsdt/202605/t20260510_539364.html', note: '2026年地方报道中的雅砻河谷、扎西曲登社区等案例；不提供实时演出或访问信息。' },
  { id: 'shannan-heritage', title: '山南市乃东区人民政府 · 山南景区与文化对象介绍', url: 'https://www.naidong.gov.cn/zjnd/ndly/jdjs/202005/t20200508_56382.html', note: '2020年对象介绍，用于桑耶、雍布拉康等地点背景；其中旧交通与开放信息不作当前保证。' },
  { id: 'shigatse-survey', title: '西藏自治区文化和旅游厅 · 日喀则旅游资源普查介绍', url: 'https://wlt.xizang.gov.cn/xccx/lytg/202507/t20250728_492064.html', note: '2025年普查成果介绍，涵盖山系、河谷农业与遗产对象；不将宣传性语句作为年代证据。' },
  { id: 'shigatse-heritage', title: '日喀则市委 · 地区与历史建筑资料', url: 'https://rikaze.xzdw.gov.cn/rkzgk/jbqk/201201/t20120119_141109.html', note: '2012年地区资料提供萨迦、扎什伦布与江孜等对象入口；行政称谓和数量按发布时期理解。' },
  { id: 'nyingchi-profile', title: '林芝市人民政府 · 林芝自然与文化概览', url: 'https://www.linzhi.gov.cn/linzhi/zmlz/zmlz.shtml', note: '提供雅鲁藏布大峡谷、南迦巴瓦、工布文化等地域入口；页面数值不直接用作比较数据。' },
  { id: 'lulang-profile', title: '林芝市人民政府 · 鲁朗地方与小镇建设介绍', url: 'https://www.linzhi.gov.cn/xwzx_406/dsdt/201812/t20181216_22625.html', note: '2016年鲁朗建设与工布文化报道；历史建设状态与今天运营条件分开。' },
  { id: 'nagqu-grassland', title: '西藏自治区自然资源厅 · 那曲草原地理资料', url: 'https://zrzyt.xizang.gov.cn/dt/xzzrzygk/201907/t20190731_90636.html', note: '旧那曲县范围的2010年资料，不把气象数值推广为今天全市统一环境。' },
  { id: 'changtang-protection', title: '西藏自治区人民政府 · 羌塘保护与管护工作', url: 'https://www.xizang.gov.cn/xwzx_406/ztzl_416/gdzt/jsstwmxgd/mtjj_4437/202204/t20220419_294361.html', note: '2022年保护工作报道；用于理解草地、湿地和野生动物的管护，不代表开放或进入许可。' },
  { id: 'ngari-zanda', title: '阿里地区行政公署 · 札布让、古格与地方生活', url: 'https://www.al.gov.cn/info/1019/128537.htm', note: '2020年札达村庄案例，连接古格遗址、托林寺与土林；旧收入和接待数据不用于今天。' },
  { id: 'ngari-valley', title: '阿里地区行政公署 · 狮泉河管护与札达沙棘种植案例', url: 'https://www.al.gov.cn/info/1035/48267.htm', note: '2023年11月报道分别介绍狮泉河盆地林地灌溉管护，以及札达托林镇象泉河谷的沙棘种植；两处案例需分别定位，不提供土林成因证据，也不代表今天阿里全域成效。' },
  { id: 'chamdo-water', title: '西藏自治区自然资源厅 · 昌都水资源与三江地理', url: 'https://zrzyt.xizang.gov.cn/dt/xzzrzygk/201907/t20190731_90604.html', note: '提供金沙江、澜沧江、怒江在藏东的地理关系；不将旧水量统计作为今日观测。' },
  { id: 'chamdo-heritage', title: '昌都市人民政府 · 卡若遗址与强巴林寺等对象', url: 'https://www.changdu.gov.cn/cdrmzf/c100655/202005/07021629f1df4f8f9da0b49847d0c99e.shtml', note: '地方文物介绍提供遗址材料种类、寺院位置与年代；卡若年代采用该材料的范围表述。' },
  { id: 'chamdo-culture', title: '昌都市文化和旅游局（文物局）· 卡若地方观察入口', url: 'https://lyfz.changdu.gov.cn/cdslyj4/c101252/202503/085ff666427c4c8ebe6de8e1f19a5197.shtml', note: '2025年地方文旅资料，涵盖遗址、寺院、茶马城等不同观察方向；不替代当前访问核验。' },
];

function profile(value: Omit<PlaceProfile, 'sourceIds' | 'sources'>): PlaceProfile {
  const sourceIds = [...new Set(value.sections.flatMap(section => section.sourceIds))];
  const records = [...sources, ...placeSources];
  return { ...value, sourceIds, sources: sourceIds.flatMap(id => { const source = records.find(item => item.id === id); return source ? [source] : []; }) };
}

export const placeProfiles: PlaceProfile[] = [
  profile({ id: 'lhasa', name: '拉萨', lead: '从拉萨河谷走进老城，再进入碑刻与历史建筑。拉萨适合把水与土地、政治和宗教机构、文字材料及今天的生活连在一起认识。', sections: [
    { title: '位置与自然：城市之外还有山地', paragraphs: ['拉萨城区位于拉萨河谷，拉萨河联系雅鲁藏布江水系。拉萨行政范围还包括当雄—羊八井盆地、山地与湖盆环境，不能用城区代表全域。河谷较平缓的土地、水源与周围高差，为生产、聚居和通行提供条件；城市形成还需要历史与人的组织来解释。'], sourceIds: ['lhasa-water-plan'] },
    { title: '历史文化：事件、建筑与文字相互参照', paragraphs: ['唐蕃会盟碑连接821—822年会盟与823年立碑，藏汉文字让事件留下具体材料。布达拉宫、大昭寺和罗布林卡组成世界遗产，年代与功能各不相同。布达拉宫现存建筑包含17世纪以来的建设，不能直接当作7世纪城市外观；看建筑时同时读建设、用途与后续变化。'], sourceIds: ['stele', 'unesco'] },
    { title: '今天的价值：生活空间也是保护空间', paragraphs: ['历史对象仍处在一座生活中的城市。遗产保护、城市服务和拉萨河治理可以放在同一地方理解：保护什么，居民怎样使用空间，变化影响谁？规划文件说明目标，不能代替实施结果；寺院、家庭、街道与公共空间也不宜用一种旅游印象概括。'], sourceIds: ['unesco', 'lhasa-water-plan'] },
    { title: '观察顺序：河谷—材料—建筑', paragraphs: ['先在地图辨认拉萨河与城区，再围绕会盟碑核对事件和材料年代，最后比较不同建筑的布局与用途。现场记录可分成“实际看到的部位”和“资料给出的解释”。访问前另核对开放、预约与现场规定，带着问题回来继续原来的历史与文化章节。'], sourceIds: ['stele', 'unesco'] },
  ], objects: [
    { name: '拉萨河与城市条件', question: '水源、土地与通道怎样参与城市生活？', stepId: 'E3', settings: { selected: 'lhasa', layer: 'settlements' } },
    { name: '唐蕃会盟碑', question: '事件与文字材料怎样对应？', stepId: 'H3', settings: { selected: 'empire', progress: .125, layer: 'object' } },
    { name: '拉萨历史建筑群', question: '现存形制、建设年代与用途有什么联系？', stepId: 'H4', settings: { selected: 'ganden', progress: .625 } },
  ] }),
  profile({ id: 'shannan', name: '山南', lead: '沿雅鲁藏布江与雅砻河进入山南，把河谷生活、早期历史线索、寺院建筑和当代文化实践放在一条认识线上。', sections: [
    { title: '位置与自然：两条河怎样组织地方', paragraphs: ['山南位于西藏南部，雅鲁藏布江中游与雅砻河谷是重要认识入口。雅砻河汇入雅鲁藏布江，两河交汇附近形成河谷土地；南侧还有喜马拉雅山地与深切沟谷。同在山南，谷地、湖泊和山地条件并不相同，泽当附近的生活空间不能代表全部地区。'], sourceIds: ['yarlung-river', 'shannan-valley'] },
    { title: '历史文化：地方线索需要各自年代', paragraphs: ['雅砻相关历史可与雍布拉康、桑耶寺等对象一起提出问题：地方中心怎样变化，宗教与建筑怎样发展？传说、始建叙述、文书和现存遗存属于不同材料，不能混成一条未经核实的年表。后来帕竹政治的变化，也说明山南并非只属于早期历史。'], sourceIds: ['shannan-heritage', 'history-overview', 'phagmodru'] },
    { title: '今天的价值：文化仍在社区中实践', paragraphs: ['扎西曲登社区的藏戏实践提供一个具体入口：文化由谁学习、表演和传承，怎样参与社区生活？河谷还联系农业、城市和水生态。认识今天的山南，可以同时讨论地方文化、生产与环境维护，而不是把历史对象和日常生活分成互不相干的清单。'], sourceIds: ['shannan-valley', 'yarlung-river'] },
    { title: '观察顺序：从河谷走到使用者', paragraphs: ['先辨认雅砻河谷与聚落，再选择雍布拉康或桑耶相关资料，比较对象位置、布局、年代与使用方式。涉及社区实践时，记录具体地方与采集时间。自然条件解释生活背景，人的选择和历史材料继续解释变化；真实访问安排仍需按日期核实。'], sourceIds: ['shannan-heritage', 'shannan-valley'] },
  ], objects: [
    { name: '雅砻河谷与地方生活', question: '水源、土地与历史线索怎样联系？', stepId: 'P3', settings: { selected: 'shannan', layer: 'settlements' } },
    { name: '桑耶与雍布拉康建筑问题', question: '布局、材料与用途怎样放回历史？', stepId: 'K1', settings: { layer: 'architecture', selected: 'courtyard', cutaway: true } },
    { name: '帕竹与地方政治变化', question: '地方中心和制度关系怎样随时期改变？', stepId: 'H2', settings: { selected: 'local', progress: .5 } },
  ] }),
  profile({ id: 'shigatse', name: '日喀则', lead: '从年楚河与雅鲁藏布江河谷走向喜马拉雅山地，再以萨迦、江孜与扎什伦布寺认识地方制度、艺术和生活。', sections: [
    { title: '位置与自然：高山和生产河谷相邻', paragraphs: ['日喀则的认识不能只有珠穆朗玛峰。喜马拉雅山地与雅鲁藏布江、年楚河河谷共同构成空间，高山冰雪和河谷农业呈现不同条件。河谷水源、日照与土地参与青稞等生产，山地又影响通行。吉隆等南侧沟谷提供不同环境入口，不能由一座山峰推断全市气候。'], sourceIds: ['shigatse-survey', 'yarlung-river'] },
    { title: '历史文化：从寺院和文书进入关系', paragraphs: ['萨迦适合研究蒙古元朝关系、地方机构与艺术材料；扎什伦布寺连接班禅相关历史与建筑，江孜的白居寺、宗山等对象又有自己的时期。它们的外观、功能与历史各不相同，研究要把具体人物、文本和对象放在一起，而不只记一串寺院名称。'], sourceIds: ['shigatse-heritage', 'history-overview', 'met-art'] },
    { title: '今天的价值：生产、通道与遗产维护', paragraphs: ['山地景观、河谷生产和历史遗产给地方提供多种价值，也联系交通、旅游与保护。观察道路或文化利用时，继续问谁能够使用、哪些社区受影响、对象如何维护。普查和规划可以说明资源与方向，开放条件、运营状态和实际效果仍需要分别核对。'], sourceIds: ['shigatse-survey', 'tourism-plan'] },
    { title: '观察顺序：把自然与制度放回同地', paragraphs: ['先看年楚河谷与聚落的空间关系，再选萨迦或江孜的具体对象阅读年代与用途。比较山地与河谷时保持相同问题，比较建筑时说明不同历史背景。每站保留一条自然问题和一条人文问题，再按实际交通与访问资料组织计划。'], sourceIds: ['shigatse-survey', 'shigatse-heritage'] },
  ], objects: [
    { name: '年楚河谷与山地地貌', question: '流水、地形与生活空间怎样联系？', stepId: 'P2', settings: { selected: 'shigatse', layer: 'water' } },
    { name: '萨迦的制度与艺术线索', question: '人物、文书与地方机构怎样共同作用？', stepId: 'H2', settings: { selected: 'yuan', progress: .375 } },
    { name: '江孜与扎什伦布建筑观察', question: '不同对象的布局、年代与使用怎样比较？', stepId: 'K1', settings: { layer: 'architecture', selected: 'hall', cutaway: false } },
  ] }),
  profile({ id: 'nyingchi', name: '林芝', lead: '从雅鲁藏布大峡谷、南迦巴瓦和鲁朗走近藏东南，把水汽、地形与生态连接到工布文化和地方生活。', sections: [
    { title: '位置与自然：不能用湿润谷地概括全域', paragraphs: ['林芝位于藏东南，雅鲁藏布大峡谷、南迦巴瓦峰与周围山谷形成显著高差。空气输送、地形抬升和高度共同参与水热差异，森林与山地景观也要结合具体坡面观察。林芝包含高山、河谷与不同地方，某处湿润低谷不能代表整个行政地区。'], sourceIds: ['nyingchi-profile', 'moisture'] },
    { title: '历史文化：生态背景与地方创造相连', paragraphs: ['工布文化提供认识林芝的具体方向，服饰、音乐、节庆与社区实践都有地方语境。鲁朗还可以把工布文化与居住、牧场和森林放在一起研究。环境提供材料和生活背景，但文化的形成还涉及历史交流、人的组织与创造，不由降水量直接决定。'], sourceIds: ['nyingchi-profile', 'lulang-profile'] },
    { title: '今天的价值：森林河谷与生活一起维护', paragraphs: ['林芝的生态与旅游价值联系森林、水系和地方文化，也涉及城镇建设与交通。鲁朗小镇建设的历史报道可帮助提出问题：设施怎样改变活动，旅游与社区生活怎样相互作用？建设目标、当年状态与今天实际情况需要分开阅读，不能只凭宣传画面判断影响。'], sourceIds: ['lulang-profile', 'nyingchi-profile'] },
    { title: '观察顺序：沿云雨问题进入具体谷地', paragraphs: ['先回看山地云雨原理，再在大峡谷或鲁朗等具体资料中辨认高度、坡面、植被与聚落。把现场天气和长期环境分开记录，也写下当地使用空间的方式。选择可达且允许停留的观察点，访问条件单独核实；回来后把见闻接回气候和文化解释。'], sourceIds: ['nyingchi-profile', 'lulang-profile', 'weather'] },
  ], objects: [
    { name: '雅鲁藏布大峡谷与山地云雨', question: '输送与抬升怎样共同参与环境差异？', stepId: 'C5', settings: { layer: 'rain', season: 1, progress: 0 } },
    { name: '南迦巴瓦与周围地形', question: '一处山地景观怎样放回周围水系？', stepId: 'P1', settings: { selected: 'nyingchi', layer: 'terrain' } },
    { name: '延伸：文化怎样被实践', question: '以藏戏资料理解学习和参与；不将案例指定为鲁朗社区调查。', stepId: 'K4', settings: { layer: 'life', selected: 'opera-space' } },
  ] }),
  profile({ id: 'nagqu', name: '那曲', lead: '从藏北草原与水源进入那曲，再以尼阿底考古和牧业生活问题认识高海拔地方的人与环境。自然区域和行政范围分别理解。', sections: [
    { title: '位置与自然：高原腹地的草地与水', paragraphs: ['那曲提供进入藏北高原的入口，城镇周边处在唐古拉与念青唐古拉山系之间。草地、湖盆、山地和水源共同组成环境；低温、季节变化与高海拔条件影响生产安排。旧那曲县的气象描述有自身范围，不能作为今天全市各处相同的温度与降水。'], sourceIds: ['nagqu-grassland', 'geography'] },
    { title: '历史与生活：史前材料不能代替今天社区', paragraphs: ['尼阿底遗址的石器与地层为研究高海拔人群活动提供证据，相关研究将一部分活动放在距今约4万至3万年。今天的牧业安排则要研究草地、水、季节移动、技术与交换。两者属于不同时间，不能从石器直接推断现代族群或把社区生活说成从未改变。'], sourceIds: ['prehistory', 'prehistory-2026', 'society'] },
    { title: '今天的价值：生产与野生动物的共同空间', paragraphs: ['羌塘自然保护区跨那曲与阿里，草地、湿地和野生动物保护让自然范围越过行政入口。认识管护时，可以问生产、生态与人员组织怎样协调；道路和服务又怎样参与今天的生活。保护工作报道说明特定时期的行动，不代表所有区域都可进入或参观。'], sourceIds: ['changtang-protection', 'railway'] },
    { title: '观察顺序：先读环境，再读人留下的证据', paragraphs: ['先在地图辨认草地、水源与生活空间，继续通过尼阿底材料区分活动、长期定居和族群判断。了解社区应注明具体地点、访谈时期与使用语境。遗址和自然保护区是知识入口，并不默认是开放旅游站点；可把阅读问题保存到自己的探索记录。'], sourceIds: ['prehistory', 'changtang-protection', 'society'] },
  ], objects: [
    { name: '藏北高原环境比较', question: '高度、水热与地形怎样形成条件组合？', stepId: 'E2', settings: { selected: 'nagqu', layer: 'temperature' } },
    { name: '尼阿底的石器与活动证据', question: '材料支持活动、定居还是其他判断？', stepId: 'H1', settings: { selected: 'prehistoric', progress: 0 } },
    { name: '草地、水源与生活安排', question: '环境条件怎样被技术和组织使用？', stepId: 'E3', settings: { selected: 'nagqu', layer: 'settlements' } },
  ] }),
  profile({ id: 'ngari', name: '阿里', lead: '以札达土林、象泉河谷、古格遗址与托林为线索，把西部地方的地貌、历史交流和今天的村镇生活连起来。', sections: [
    { title: '位置与自然：西部高地也有河谷', paragraphs: ['阿里位于西藏西部，札达提供一条具体认识线：土林的起伏与象泉河谷、托林和周围村镇处在同一地方。看土林先辨认轮廓、层次与地表水的关系，成因还需对应地质资料。西部高原也有湖盆、山地与不同谷地，不能只用干燥荒凉概括全域。'], sourceIds: ['geography', 'ngari-zanda'] },
    { title: '历史文化：远方的知识怎样进入地方', paragraphs: ['古格遗址与托林连接地方政治、宗教和艺术问题。11—12世纪藏印交流涉及教师、译者、文本、作品与赞助，托林可作为其中的重要材料入口。关系节点说明知识联系，不能自动还原某个人物的精确道路；具体作品仍应辨认年代、用途与来源。'], sourceIds: ['met-exchange', 'met-art', 'ngari-zanda'] },
    { title: '今天的价值：遗址生活与另一个地方的管护', paragraphs: ['古格遗址脚下札布让村庄的报道，将家庭旅馆等活动与历史景观连在一起。另一个案例在狮泉河盆地：2023年报道记录了噶尔县林地的水渠灌溉与日常管护，说明生态维护还需要取水设施和人的持续工作。两地分别提供文化保护、生活机会和环境维护的观察入口；当年收入、接待或建设状态不直接代表今天。'], sourceIds: ['ngari-zanda', 'ngari-valley'] },
    { title: '观察顺序：地貌—作品—社区', paragraphs: ['先读札达土林与河谷的位置，再由托林、古格的真实资料追问艺术与交流，最后看札布让村庄的生活案例。若要比较用水与生态维护，再单独定位狮泉河盆地，避免把两地材料合成一个地点。记录一条自然形成问题和一条历史文化问题。长距离探索可以分多次完成，路线、开放和适用手续需按日期核实，不由知识连线推算行程。'], sourceIds: ['ngari-zanda', 'met-exchange', 'ngari-valley'] },
  ], objects: [
    { name: '札达土林与河谷地貌', question: '轮廓与周围地形、水系怎样相连？', stepId: 'P2', settings: { selected: 'ngari', layer: 'terrain' } },
    { name: '托林与藏印交流', question: '教师、译者与作品怎样进入地方？', stepId: 'K2', settings: { layer: 'religion', selected: 'hall' } },
    { name: '古格艺术与作品阅读', question: '材料、形式、年代与使用语境怎样对应？', stepId: 'K3', settings: { layer: 'art', selected: 'materials' } },
  ] }),
  profile({ id: 'chamdo', name: '昌都', lead: '沿藏东三江与高山峡谷走进昌都，再以卡若遗址、强巴林寺和地方交换认识自然通行与历史生活怎样相连。', sections: [
    { title: '位置与自然：纵向河谷与横向山地', paragraphs: ['昌都位于藏东高山峡谷区域，金沙江、澜沧江和怒江组织不同流域。河谷可以提供沿线通行条件，横向跨山却会面对高差与山口。水系、坡面和聚落要一起观察；一条谷地不等于一条已经建成的道路，整个昌都也不能用一个城市河岸代表。'], sourceIds: ['chamdo-water', 'geography'] },
    { title: '历史文化：遗址与寺院属于不同时间', paragraphs: ['卡若遗址提供新石器时代房屋、石器、骨器、陶片与作物等材料，地方介绍将其年代放在距今约4000—5000年。强巴林寺位于昂曲与扎曲两水交汇附近，连接15世纪以来的宗教建筑问题。史前生产、后来寺院和今天城市要用不同材料分别研究。'], sourceIds: ['chamdo-heritage'] },
    { title: '今天的价值：交流节点与文化维护', paragraphs: ['茶马城、卡若等地方入口使交换历史和今天的城市生活可以相互参照，周围河流与山地又参与交通和生态问题。认识昌都的价值，需要把遗产保护、文化实践、服务与地区联系放在具体对象上；地名中保留的交换线索，不等于已经证实每一条古道。'], sourceIds: ['chamdo-culture', 'chamdo-water'] },
    { title: '观察顺序：河流交汇到历史材料', paragraphs: ['先辨认城市附近水系与山地，读卡若材料中的年代、生产与建筑证据，再比较强巴林寺的空间与用途。把看见的地形、真实文物信息和后来的解释分别记录，最后回到通道章节研究交流。候选站点仍需核对访问、交通和现场规定，不承诺遗址即时开放。'], sourceIds: ['chamdo-heritage', 'chamdo-culture'] },
  ], objects: [
    { name: '三江与山地通道', question: '谷地怎样提供通行条件，又怎样被社会连接？', stepId: 'R2', settings: { selected: 'chamdo', layer: 'routes' } },
    { name: '卡若与尼阿底的证据对读', question: '不同遗址怎样分别支持活动、生产与生活的认识？', stepId: 'H1', settings: { selected: 'prehistoric', progress: 0 } },
    { name: '强巴林寺的建筑问题', question: '布局、用途与历史怎样一起理解？', stepId: 'K1', settings: { layer: 'architecture', selected: 'hall', cutaway: true } },
  ] }),
];

export function getPlaceProfile(id: string): PlaceProfile | undefined {
  return placeProfiles.find(place => place.id === id);
}
