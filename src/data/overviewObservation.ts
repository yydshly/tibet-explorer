import {overviewMainProgram,type ProgramBeat} from './overviewProgram';
import {travelStops} from './curriculum';
const choices=[
 {stopId:'lhasa-river',beatId:'OVERVIEW-valley-journey',question:'沿拉萨河谷观察：山体、河流、铁路与站区怎样相互制约？到站后怎样接入城市？把地图所见、资料所述与待核实的实际接驳分开记录。'},
 {stopId:'nyingchi-valley',beatId:'LAB-life-nyingchi',question:'在林芝比较沿谷与跨山的地形：较缓地面怎样影响通行和生活？现场天气与长期气候资料有什么不同？'},
 {stopId:'shiquanhe-life',beatId:'OVERVIEW-shiquanhe-irrigation',question:'狮泉河有河流和灌渠，为什么仍需要开闸、清渠与巡护？区分报道中的工作、现状地图和演示补水；实际可达观察点与设施访问条件另行核实。'},
 {stopId:'lhasa-old-town',beatId:'OVERVIEW-jokhang-protection',question:'大昭寺供灯空间调整改变了什么，又保留了什么活动？区分2005年报告、现状地物与原理示意，不把当年安排直接当作今日布置。'},
 {stopId:'lhasa-buildings',beatId:'OVERVIEW-history-origins',question:'在拉萨，营建与宗教、礼仪、居住等用途怎样组织地方空间？哪些有历史材料支持，哪些不能由今天的建筑轮廓推断？'},
] as const;
export function observationChoices(beat:ProgramBeat){
 const matches=choices.filter(c=>c.beatId===beat.id);
 const selected=matches.length?matches:beat.id==='LAB-life-lhasa'||beat.topic==='connections'?[choices[0]]:beat.id==='OVERVIEW-conclusion'?[...choices.slice(0,3)]:[];
 return selected.map(c=>({...c,place:travelStops.find(s=>s.id===c.stopId)!.name,sources:[...new Map([...(beat.id==='OVERVIEW-conclusion'?[]:beat.sources),...overviewMainProgram.beats.find(b=>b.id===c.beatId)!.sources].map(s=>[s.url,s])).values()]}));
}
