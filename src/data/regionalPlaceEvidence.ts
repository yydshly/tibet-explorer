import type {CityPlaceThread} from './cityPlaceThreads';
import {cityContinuityPartProgress} from '../lib/cityContinuityState';
import {cityPlaceRecordingEntryFraction as entryFraction} from '../lib/cityPlaceRecordingEntry';

/** The four entries seek inside existing recordings. Additional dated reading
 * stays in evidence disclosures; it is not silently inserted into old audio. */
function part(cityId:'nyingchi'|'ngari',index:number,fraction:number){
 const start=cityContinuityPartProgress(cityId,index);
 const end=index<2?cityContinuityPartProgress(cityId,index+1):cityId==='nyingchi'?.34:1;
 return start+(end-start)*fraction;
}

// Entries belong to these exact original MiniMax recordings, not to their
// semantic scene fractions. Enter 1 ms inside the actual first relevant word.
// CONT-history-nyingchi-3 (SHA d53d4a55…8e7cfb0dc), 17.676 s:
// “二〇一七年” starts at 5.087179487179487 s, before merchant/training work.
const lulangTrainingEntry=part('nyingchi',2,entryFraction('nyingchi-life'));
const lulangTrainingDisplay=part('nyingchi',2,.35)+Number.EPSILON;
// CONT-connections-ngari-3 (SHA 18f943b8…72da608), 18.756 s:
// “公共空间与管护” starts at 11.569230769230769 s. The former .65 seek
// started inside “公共”, dropping the beginning of this lived-use sentence.
const shiquanhePublicUseEntry=part('ngari',2,entryFraction('ngari-life'));

export const regionalPlaceEvidence:Record<'nyingchi'|'ngari',CityPlaceThread>={
 nyingchi:{
  name:'鲁朗',regionalName:'林芝市 · 鲁朗河谷',
  summary:'山路经过河谷，停留还需要住宿、经营和管理。分别读试运营、地方接续和人的工作，再形成自己的观察问题。',
  context:{title:'从气候、地形接到鲁朗',text:'藏东南的水汽与山地解释环境条件；G318经色季拉山联系林芝与鲁朗。河谷里怎样接待和停留，还取决于有日期的建设、经营与服务安排。林芝城区、米林机场和彩门村各是另一处地方。',sourceIds:['city-life-southeast-moisture','city-life-sejila-route-2022','city-life-lulang-2016']},
  steps:[
   {id:'event',label:'事件',title:'2016年试运营：增加服务用途',question:'山路经过鲁朗以后，哪些有日期的建设让人可以继续停留？',stage:'history',progress:part('nyingchi',2,entryFraction('nyingchi-event')),evidence:{
    time:'2016-10-01试运营 · 2017-03-28运营记录',
    fact:'2016年报道记小镇开始试运营；管委会2017年度记录分别列出酒店、商业街、商户进驻和已交付组团整改。道路之外，接待还需要可使用的地方。',
    reason:'地形和公路说明人怎样经过；建设、交付与经营说明经过之后怎样停留，二者不能互相代替。',
    lookAt:'先找鲁朗河与G318，再辨认源图中的酒店商业用地，比较道路经过与服务用地停留的位置。',
    limit:'现状用地不是2016年建成范围；试运营、2017年运营和今天经营分开，不表示此前没有居民或旅馆，也没有通车前后家庭追踪。',
    sourceIds:['city-life-lulang-2016','event-lulang-services-2017','city-local-osm-2026'],
    features:[{id:'way/26406905',label:'鲁朗河',role:'geography'},{id:'way/49209937',label:'G318现状路段',role:'arrival'},{id:'way/1322496961',label:'酒店商业用地（非建筑）',role:'service'}],
   }},
   {id:'space',label:'空间',title:'米林—林芝—鲁朗：两段接续',question:'飞机落地以后，为什么还没有到鲁朗？',stage:'connections',progress:part('nyingchi',2,entryFraction('nyingchi-space')),evidence:{
    time:'2020年道路记录 × 2022年越岭材料',
    fact:'米林政府2020年养护记录明确S4米林机场专用公路；2022年文旅材料记从林芝沿G318经色季拉山到鲁朗。机场、林芝城区和鲁朗是不同地点。',
    reason:'航空增加区域入口，公路接续才把入口连到具体目的地；越岭的地形条件与到镇后的接待各需要理解。',
    lookAt:'在整体地图跟随机场外道路到林芝，再沿真实G318链到鲁朗；局部只辨认鲁朗河、镇旁路段与服务用地。',
    limit:'机场内部受限接段没有补画；源道路不是2020或2022历史线路复原，也不保证今天接驳、通行或酒店入口。',
    sourceIds:['event-mainling-s4-maintenance-2020','city-life-sejila-route-2022','city-local-osm-2026'],
    features:[{id:'way/49209937',label:'鲁朗附近G318',role:'arrival'},{id:'way/26406905',label:'鲁朗河谷参照',role:'geography'},{id:'way/1322496961',label:'到镇后的服务用地',role:'service'}],
   }},
   {id:'life',label:'生活',title:'2017年：商户进驻与旅馆培训',question:'有了房屋和道路，哪些人的工作把它们接到持续服务？',stage:'history',progress:lulangTrainingEntry,sceneProgress:lulangTrainingDisplay,evidence:{
    time:'2017年度工作 · 2018-09-10发布',
    fact:'管委会记录商户进驻、功能组团整改；广东第八批援藏工作队、管委会与培训机构共同开展农牧民家庭旅馆培训。住宿接待需要经营和服务工作。',
    reason:'建成空间提供条件，经营者的劳动、学习及管理继续组织实际使用。培训记录说明具体行动，不能直接证明每户收益。',
    lookAt:'留在同一河流、道路和服务用地，观察到达转为停留；用地可定位，培训活动的实际场地未取得。',
    limit:'不把酒店商业用地认作家庭旅馆或培训现场；旧商户数和收入不作当前数据，现有材料没有同口径家庭连续追踪或交通单独收益评估。',
    sourceIds:['event-lulang-services-2017','city-local-osm-2026'],
    features:[{id:'way/1322496961',label:'服务用地位置参照',role:'service'},{id:'way/49209937',label:'经过与到镇的道路',role:'arrival'}],
    check:{question:'什么材料补上“房屋和道路怎样进入生活”的中间环节？',choices:[
     {id:'parcel',label:'只看今天的酒店用地轮廓',correct:false,feedback:'轮廓能定位空间，不能说明谁经营、怎样培训，也不能确定2017年的收入改变。'},
     {id:'work',label:'商户进驻、整改与家庭旅馆培训记录',correct:true,feedback:'对。这些记录补上人的工作；还需家庭连续材料，才能进一步判断实际影响与差异。'},
    ]},
   }},
   {id:'observe',label:'观察',title:'从地方服务接到自己的观察',question:'今天可以辨认什么，哪些变化和出行条件要另查？',stage:'travel',progress:part('nyingchi',1,entryFraction('nyingchi-observe')),evidence:{
    time:'现状地图观察 × 2016—2017材料 × 出行日核验',
    fact:'在鲁朗对照河流、G318与服务用地，分别提出经过、停留和接待问题。2016试运营与2017培训说明不同环节；林芝工布课堂仍是另一地点的文化材料。',
    reason:'把同一处地物与有日期的行动对应，才能由环境进入生活，再问文化如何被学习和使用。',
    lookAt:'选一个实际地物，写一个问题：道路怎样到服务用地？经营需要哪些工作？再核实允许停留、访问和接驳的位置。',
    limit:'这是一组观察顺序，不是已核验的旅行安排；没有酒店入口、培训场地或工布课堂现场定位，天气、接驳与经营要按出行日另查。',
    sourceIds:['city-local-osm-2026','city-life-lulang-2016','event-lulang-services-2017','city-life-gongbo-learning-2026'],
    features:[{id:'way/26406905',label:'河谷观察',role:'geography'},{id:'way/49209937',label:'通行观察',role:'arrival'},{id:'way/1322496961',label:'服务用途观察',role:'service'}],
   }},
  ],
 },
 ngari:{
  name:'狮泉河',regionalName:'阿里地区 · 狮泉河城区与昆莎接续',
  summary:'先读盆地生活，再分开公路、航空与河岸建设的年份。抵达、接续和公共使用各有不同的设施、工作及证据。',
  context:{title:'从盆地环境接到人的建城行动',text:'阿里的高地、宽谷与水源条件并不相同。2021年具名回忆记1965年狮泉河建设、1966年地委和专署机关迁驻；自然条件与行政、建设行动分别解释。托林的11—12世纪教师交流属于另一地点。',sourceIds:['city-life-ngari-geography','regional-shiquanhe-city-making-2021','city-life-tibet-india']},
  steps:[
   {id:'event',label:'事件',title:'2017年：河岸增加公共用途',question:'同一条河怎样通过地方建设进入公共生活？',stage:'history',progress:part('ngari',2,entryFraction('ngari-event')),evidence:{
    time:'2017年工程竣工 · 2021年采访回顾',
    fact:'2021年文旅报道回顾“一河两岸”工程2017年竣工，记城区河段景观、河堤绿化与文化休闲等功能。天然河流与公共使用之间还有建设行动。',
    reason:'河流提供空间条件；河岸建设和持续管护，继续组织步行、停留与公共活动，不由自然环境直接产生。',
    lookAt:'先辨认河流、桥和两岸街道，再对照当前公共空间的位置，观察通行与停留需要不同位置。',
    limit:'当前公园、桥与道路不是2017工程边界；没有逐段建成年代和通车前后城市边界，不表示此前河岸不可使用。',
    sourceIds:['city-spatial-shiquanhe-banks-2017','city-local-osm-2026'],
    features:[{id:'way/154210514',label:'狮泉河',role:'geography'},{id:'way/154210585',label:'狮泉河大桥',role:'crossing'},{id:'way/904011648',label:'现状文化广场（非工程边界）',role:'public-space'}],
   }},
   {id:'space',label:'空间',title:'2004公路，再增加2010航空',question:'昆莎机场通航以后，为什么仍要沿公路到狮泉河？',stage:'connections',progress:part('ngari',1,entryFraction('ngari-space')),evidence:{
    time:'2004年G219路面建设 → 2010-07-01通航',
    fact:'吕新民口述记2004年狮泉河至昆莎段建成柏油路；民航局同期报道记昆莎机场2010年7月1日通航。航空是在已有地面联系上增加入口。',
    reason:'飞机解决区域抵达的一环；机场与城镇之间仍有地理间隔，公路和具体接驳继续承担进城。',
    lookAt:'先在整体地图分开昆莎机场与狮泉河，跟随当前G219源道路到滨河北路，再进入城区河流和桥位。',
    limit:'当前道路不是2004竣工图；没有出行日班次或门到门接驳保证，不以旧空中时间和旧地面行程计算效率倍数。',
    sourceIds:['event-gunsa-g219-2004-2025','access-ngari-airport-2010','city-local-osm-2026'],
    features:[{id:'way/154210514',label:'进城后的河流参照',role:'geography'},{id:'way/154210585',label:'城区跨河参照',role:'crossing'}],
   }},
   {id:'life',label:'生活',title:'抵达以后，公共空间怎样被使用',question:'公路、航空与河岸建设，分别改变生活的哪个环节？',stage:'connections',progress:shiquanhePublicUseEntry,evidence:{
    time:'2004公路 · 2010航空 · 2017河岸建设',
    fact:'公路、航空分别支持到达与接续；2017年河岸工程材料支持绿化和文化休闲用途。2023年伦珠冬灌巡护是另一类用水与劳动材料。',
    reason:'来到地方、使用公共空间和取水管护分别需要设施与工作。它们可以相接理解，不能全归为机场的单独效果。',
    lookAt:'保持同一条河、桥位和公共空间，比较经过与停留；用水报道另读操作，不把图上的河流当成报道中的闸口。',
    limit:'未取得机场单独因果评估、同口径家庭追踪或每个公园的建设年份；现状文化广场也不等同2017河岸工程。',
    sourceIds:['event-gunsa-g219-2004-2025','access-ngari-airport-2010','city-spatial-shiquanhe-banks-2017','city-life-ngari-water-2023','city-local-osm-2026'],
    features:[{id:'way/154210514',label:'河流与公共生活参照',role:'geography'},{id:'way/154210585',label:'跨河通行',role:'crossing'},{id:'way/904011648',label:'文化广场现状位置',role:'public-space'}],
    check:{question:'哪种解释与三组有日期的材料相符？',choices:[
     {id:'airport',label:'机场开通独自造成此后的全部变化',correct:false,feedback:'现有材料没有分离航空的单独效果；2004公路早于通航，2017河岸建设另有用途和行动。'},
     {id:'separate',label:'公路接续、航空抵达、河岸使用各改变一环',correct:true,feedback:'对。分清年份与作用，再用人的使用材料连接，才能解释变化而不把相关性当成单一因果。'},
    ]},
   }},
   {id:'observe',label:'观察',title:'同一河岸观察，跨县历史另选',question:'哪些问题留在狮泉河，哪些需要另外到托林阅读？',stage:'travel',progress:part('ngari',1,entryFraction('ngari-observe')),evidence:{
    time:'当前地物 × 有日期的建设材料 × 出行日核验',
    fact:'在狮泉河对读河流、桥与公共空间，分别记录通行、步行停留与管护问题。托林教师交流和札布让家庭经营另有地点、年代与材料。',
    reason:'空间关系连续，观察问题才有来路；跨县进入另一段历史前，需要先改变地点和问题，不能压成同一处现场。',
    lookAt:'记录一个实际地物及它对应的问题，再区分材料年份、今天所见和需核实的可达位置；托林由独立历史入口继续。',
    limit:'滨河北路源链是街道，不是已验证连续亲水步道；河岸材料不保证访问条件。接驳、允许停留与跨县行程需按日期另查。',
    sourceIds:['city-local-osm-2026','city-spatial-shiquanhe-banks-2017','city-life-tibet-india','event-gunsa-g219-2004-2025'],
    features:[{id:'way/154210514',label:'河岸环境问题',role:'geography'},{id:'way/154210585',label:'跨河通行问题',role:'crossing'},{id:'way/904011648',label:'公共空间使用问题',role:'public-space'}],
    datedFollowUp:{title:'地方文化也有具体传习 · 2021年采访',text:'采访中的米玛次仁退休后开办“象雄记忆”摄影讲堂、义务培养摄影人才。它补充狮泉河的当代传习行动；本图未取得讲堂位置，也不能据此推定古代象雄文化的地理边界。'},
   }},
  ],
 },
};
