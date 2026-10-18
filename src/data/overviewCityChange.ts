export const overviewCityChange={
 id:'OVERVIEW-city-change',title:'一座新桥怎样改变城市联系',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'历史街区已有自己的用途，新的交通怎样进入它的生活？先回到全域，再进入拉萨河谷，把南岸站区、拉萨河与北岸城区放在一起。二〇〇六年七月一日，青藏铁路通车，拉萨站把区域抵达带到柳梧。但到站，还不等于接上对岸城市。先拿掉柳梧大桥这条连接，看车辆停在南岸的接桥位置。这是单独检验新桥作用，不是说当时没有其他道路或渡河方式。二〇〇七年四月三十日，柳梧大桥通车。现在接回同一位置的桥面，车辆跨过拉萨河，继续沿城市道路前进。改变的是站区与城区之间的连接关系，不能把整片城市的增长都归因于一座桥。设施怎样变成生活里的机会？二〇一九年，柳梧当地人洛桑赤列的采访记录：村民购车，村委会组织运输队，他参与车辆调度。连通提供条件，车辆、劳动与组织才把条件变成服务。画面沿现状相连道路演示接续，不复原当年车流或运输队的具体线路。到已知路端停下，再看大昭寺周围的街巷与广场。新来的参访活动进入的，是已有宗教和日常用途的地方；交通方便不等于可以占用所有空间。最后回到全域：历史改变的不只是建筑外形，还包括地方怎样相连、人怎样参与。带着这个问题，再比较东南部铁路与阿里航空的不同来路。',
};
export const cityChangeSources=[
 {title:'2007年5月1日通车报道：柳梧大桥于4月30日通车',url:'https://www.xizang.gov.cn/zwgk/ldzc/ldhd/201901/t20190117_54666.html',note:'正文日期与归档URL年份不同；报道支持新桥连接中心城区与柳梧，不证明全部城市增长的因果。'},
 {title:'2019年柳梧采访：洛桑赤列与运输组织',url:'https://lwxq.lasa.gov.cn/lwxqgwh/lwyw/201910/56d71493c7f54244bb05018ceee8db2b.shtml',note:'铁路2006年开通、站区位于南岸；具名采访记录购车、运输队与调度。未推广为所有居民的收益。'},
 {title:'现状相连道路、桥梁与源节点归档',url:'/data/local-places/transport-corridors.manifest.json',note:'连接对照只移除柳梧大桥跨河段；没有复原2006年路网、旧渡口或历史城市轮廓。车辆为教学标志。'},
 {title:'UNESCO：历史建筑群及地方用途',url:'https://whc.unesco.org/en/list/707/'},
];
export interface CityChangeState {phase:'context'|'arrival'|'missing'|'opening'|'organization'|'street'|'return';progress:number;bridge:number;motion:number}
