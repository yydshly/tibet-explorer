import {irrigationCue} from './overviewIrrigation';
import {historyOriginsCue} from './overviewEditorial';
import {overviewPacingCues} from './overviewPacing';
import {overviewPlaceActions,jokhangProtectionCue} from './overviewPlaceActions';
import {overviewCityChange} from './overviewCityChange';
import {overviewHistoryFrame} from './overviewHistoryFrame';
import {overviewMechanismCues} from './overviewMechanisms';
import {groundJourneyText,valleyJourneyText} from '../lib/groundJourney';
import {historySpaceStory} from './historySpaceStory';
/**
 * The complete overview has its own small set of linking recordings. Existing
 * lesson recordings are referenced unchanged by overviewJourney.ts. A recording
 * ID owns this exact text: changing the words requires fresh audio and timings.
 */
export interface OverviewNarrationCue {
  id: string;
  title: string;
  narration: string;
  stepId: 'OVERVIEW';
  chapterId: 'overview';
}

export const barkhorNarration = '先留在大昭寺周围，把建筑放回街区。七世纪创建的宗教场所，今天仍与广场、街巷和周边生活相连。沿现状步行街巷移动，能看到活动需要通行空间；再看广场与周边商业用地，同一街区承载着不同使用。二〇〇〇年，大昭寺作为扩展列入世界遗产。二〇二一年，世界遗产委员会要求广场管理照顾朝拜者，让祈祷通行不受游客干扰。这不是再造一座古城，而是理解保护怎样进入今天的生活：既要看建筑，也要看使用它的人和空间。接下来，仍在拉萨，看白宫和红宫的建设与用途。';

export const lhasaUrbanNarration = '把布达拉宫和大昭寺一起放回拉萨河谷。它们承接了不同历史用途，周围的城市却没有停在那些年代。先看一九八五年已经检出的聚居地，青色像元保留早期基底。推进到二〇〇〇年，保持同一视角，比较青色基底周围新增了哪些范围。再到二〇一五年，金色像元显示后来检出的空间。这里是三十米遥感估计，不是古代城界，也不是每栋房子的建成年份；不能把这些变化全部归因于铁路。再回到现状街区，读改变怎样进入生活。二〇〇五年世界遗产报告记述，布达拉宫广场扩展为公共休憩空间，也涉及住户和机构搬迁。大昭寺周围的八廓街则有供排水和街面改善的记录。保护、居住和参访因此要共同安排，不能只保存一个建筑外形。拉回河谷，老城、宫殿和跨河交通仍在同一座城市里。接下来回到全域，再看铁路抵达以后，怎样通过道路和桥梁接入生活。';

export const overviewNarrationCues: OverviewNarrationCue[] = [
  irrigationCue, overviewHistoryFrame, overviewCityChange, overviewPlaceActions, jokhangProtectionCue, historyOriginsCue, ...overviewPacingCues,
  ...overviewMechanismCues,
  historySpaceStory,
  {id:'OVERVIEW-valley-journey',title:'沿河谷理解：铁路怎样接入城市生活',narration:valleyJourneyText,stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-ground-rail',title:'走进河谷：沿真实铁路看抵达',narration:groundJourneyText,stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-life-lhasa',title:'拉萨：从地形读生活条件',narration:'从全域定位拉萨，再沿同一张地图拉近。先看地面起伏，河谷嵌在周围山地之间。移动探针，比较沿线高低变化；切换剖面方向，看较缓地面能否连续。青色地面标出观察窗内相对较低、较缓的样本，不能据此认定街区或可建设地块。河谷提供可能，城市仍需要用水设施、交通和组织。二零二二年拉萨水利规划提供了理解这些需求的材料，规划不等于全部建成。回到全域，接着看狮泉河：在不同环境中，水又怎样通过设施和劳动进入使用？',stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-living-comparison',title:'不同环境，怎样进入同样的生活问题',narration:'把地区差异接到生活。山南与拉萨的河谷，较缓土地为聚居和耕作提供空间；但建城仍需要人的组织。林芝与昌都的山地河谷，让沿谷与跨山面对不同高差，通行还需要道路和维护。再看阿里：二〇二三年的报道记录了狮泉河盆地林地灌溉与管护，水源通过设施和劳动才被使用。这个地方例证不能代表所有社区。回到全域，用土地、水和通行继续比较。',stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-regional-connections',title:'不同地方怎样接入现代联系',narration:'带着已有的城市和历史，回到全域看现代联系。先看东南部：二〇二一年六月二十五日，拉林铁路开通，把拉萨、山南和林芝放进新的铁路联系中。再看西部：二〇一〇年七月一日，阿里昆莎机场通航，增加了航空抵达的选择。方式不同，问题却相通：到站、落地以后，仍要接上当地道路、服务和人的组织。不能把开通直接等同于每个居民都已受益。把昌都的峡谷、那曲的高地和日喀则的河谷一起留在地图上，比较各地使用通道的条件。新的联系没有抹平地形，也没有取代原有生活；接下来还要看这些联系怎样被共同维护。',stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-regional-observation',title:'用同一组问题观察不同地区',narration:'最后，把整条认识变成观察方法。先在全图选地方，再带着问题走近。去林芝，观察山谷来路与水热条件；到山南、拉萨或日喀则，把河谷空间、历史用途与今天生活对照；看昌都，追问峡谷中的通行；看那曲与阿里，关注高地、用水与地方接续。每次都问：自然提供什么条件，人的行动又改变了什么？比较以后再回到全域，解释共同点和差别。这是认识顺序，不是一条连续旅游行程。实际交通、开放和预约，需要按出行日期核实。',stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-lived-city',title:'把历史与交通带回一次城市观察',narration:'把前面的认识落到一次拉萨观察。先从全域回到同一河谷，让车站、河流和老城同时出现。铁路把区域抵达接到柳梧，二〇〇七年开通的柳梧大桥，再把站区与市区直接联系起来。沿归档的现状道路前进，看跨河以后为什么仍有一段城市接续。洛桑赤列的采访补上了人的工作：村民购车，运输队协调调度，设施才成为具体服务。到已知路端停下，地图没有替我们核实寺院入口。再把视线移到大昭寺周围，前面读过的宗教用途、街巷通行与周边商业，在同一街区相遇。这里既是参访的地方，也是持续使用的生活空间。二〇二五年，世界遗产委员会继续强调大昭寺广场的管理应尊重朝圣活动。观察时要问，通行、停留与参访怎样相容，而不是把所有空地都看成游客空间。最后拉回河谷与全域：交通解释怎样进入，历史解释为何形成，现场观察继续核对今天怎样使用。实际接驳、开放和预约，按出行日期另查。',stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-lhasa-urban-change',title:'历史地标进入现代城市：空间变化与日常生活',narration:lhasaUrbanNarration,stepId:'OVERVIEW',chapterId:'overview'},
  {id:'OVERVIEW-barkhor-life',title:'大昭寺到八廓街：活动、空间与保护',narration:barkhorNarration,stepId:'OVERVIEW',chapterId:'overview'},
  {
    id: 'OVERVIEW-evidence-reading', title: '用真实实物，读学习、保存与工艺',
    narration: '先暂停向前推进，把文化放到两件真实材料旁。眼前的阿底峡画像，馆方断代为十二世纪前中期，晚于一〇四二年的行旅。授课手势和手持经书，表现的是教师身份。再看约十二世纪初的木经板：木板保护经页，雕刻承载图像。保存、学习与工艺联系在一起，但这两件馆藏不能代替全部地方文化。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-position', title: '从完整地球逐层找到西藏',
    narration: '先从完整地球找到西藏。镜头靠近亚洲，再辨认中国和中国西南的西藏自治区。洲、国家和自治区是不同的空间层级；青藏高原则是跨越行政范围的自然高地，不能把两条边线当成同一个对象。位置确定以后，再问这里怎样受到周围海陆和大气的影响。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-formation-entry', title: '从全球来流回到亚洲高地',
    narration: '位置与全球来流已经明确。现在回到亚洲，先把高原放在周围低地和海洋之间，再问这片高地怎样形成。接下来的剖面只解释相向运动、变形与增厚；它不是古代地表的复原。看懂原理以后，我们会回到今天的真实高程。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-history-entry', title: '从生活条件转向人的历史行动',
    narration: '地形能说明哪里较平、哪里有水，却不能直接解释一座城为何成为中心，或一种文化怎样形成。接下来把同一张地图放进时间：先看人群活动与历史长线，再沿真实材料走近地方。年代、人的行动和空间用途，需要一起阅读。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-heritage-entry', title: '带着历史长线，回到拉萨读建筑用途',
    narration: '历史长线已经建立。现在暂时离开顺时排列，回到拉萨这一个地方，读建筑怎样承接不同用途。先在全图确认它所在的河谷，再沿今天的真实地图辨认大昭寺和布达拉宫。我们比较的是有资料支持的年代与用途，不把现状轮廓当作过去城市的复原。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-heritage-return', title: '从建筑用途回到城市与全域',
    narration: '把镜头从建筑拉回拉萨河谷，再回到西藏全域。刚才看到，位置、年代与实际用途需要一起理解。今天的城市继承着已有空间，也在形成新的联系。接下来保留这些城市与生活，再看公路、铁路和航空怎样接入它们。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-regional-system', title: '一张地图读懂七市地',
    narration: '先把西藏全域留在眼前。中南部的拉萨、日喀则和山南，沿河谷认识城市与生产；东部昌都和东南部林芝，高山峡谷组织不同来路；北部那曲与西部阿里，又有高原、草地、湖盆和宽谷。七市地帮助找到入口，自然环境并不沿行政线整齐分开。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-life-conditions', title: '自然条件怎样接到城市生活',
    narration: '把各地放回水、土地和通行这三个问题。河谷较缓的地面给聚居与道路提供空间，水源还要经过取用和维护才能服务生活；越过山岭，又需要道路、桥隧和持续组织。环境提供可能与限制，人的技术、交换和历史选择，继续决定地方怎样生活。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-history-early', title: '从早期活动到吐蕃时期',
    narration: '现在把同一片地面放进时间。尼阿底研究支持距今约四万至三万年的高海拔人群活动。再到七至九世纪，雅砻与拉萨联系吐蕃政权的发展，战争、使节、联姻和交流同时进入历史。唐蕃会盟碑留下具体材料：八二一至八二二年会盟，八二三年立碑。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-history-middle', title: '交流、地方力量与制度重组',
    narration: '吐蕃王朝瓦解以后，地方力量和宗教传统继续变化。十至十二世纪的复兴与交流中，阿底峡在一〇四二年来到西藏西部托林，教师、译者和文本连接不同地方。十三至十四世纪，蒙古元朝与萨迦的制度联系成为重要线索；随后帕竹等地方力量又改变政治格局。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-history-modern', title: '从拉萨政治空间到近现代',
    narration: '十七世纪，甘丹颇章政权形成，拉萨政治与建筑空间继续变化。清代的驻藏大臣和噶厦进入制度史；二十世纪又经历一九〇四年英国军事行动、一九五一年协议、一九五九年冲突及改革、一九六五年自治区成立。每个节点都要再看地方经历。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-culture', title: '文化由什么形成，又怎样延续',
    narration: '有了历史方向，再把文化放回人的行动。建筑组织宗教、礼仪和日常用途；学习与翻译使知识进入新的语言，工艺和艺术留下作品，节庆与藏戏又需要持续参与。拉萨建筑、托林交流和地方传习各有来路，不能把一种建筑或一种信仰当作全部西藏文化。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-connections', title: '现代通道怎样接上已有地方',
    narration: '从历史来到今天，西藏仍与更大范围相连。公路、铁路和航空增加不同的进入方式，河流连接上下游，商品、人员与知识也不断往来。先看通道连向哪里，再看它怎样接上城市。接下来用拉萨的铁路与跨河接续，分清到达节点和真正进入生活。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-protection', title: '联系越广，越要理解共同维护',
    narration: '把镜头重新拉回全域。通道之外，流域、草地与历史城市同样联系不同地方。雅鲁藏布江让上游过程关系到下游使用，羌塘的生态管护跨越那曲与阿里，拉萨遗产保护还要照顾地方日常。理解周边和战略价值，要说清共同依赖、使用条件与维护责任。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
  {
    id: 'OVERVIEW-conclusion', title: '把整体认识留下，再选择深入',
    narration: '回到这张完整地图。我们从地球找到西藏，理解地形怎样参与改变空气与水，再看各地条件怎样进入生活，人的行动怎样形成文化与历史，现代联系又怎样带来新的选择。下一步可以沿任何一个问题深入，也可以保存观察路线，让局部发现继续接回整体认识。',
    stepId: 'OVERVIEW', chapterId: 'overview',
  },
];
