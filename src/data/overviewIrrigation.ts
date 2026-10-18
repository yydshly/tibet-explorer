/** Reported work and mapped features are separate evidence layers. */
export const irrigationCue={id:'OVERVIEW-shiquanhe-irrigation',title:'狮泉河：有灌渠，为什么还需要管护',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'狮泉河怎样用水？拉近看河流、灌渠与城镇。二〇二三年报道说，秋季少雨、蒸发大，护林员伦珠挡水开闸，次仁桑卓清渠巡护。先保留灌渠，停止供水。开闸并完成清渠，蓝色通水带推进，林地获得补水。关闭后停止补水，已送入的水保留。设施仍需管护，才能服务城镇周边绿化。渠线取自地图，水量与灌区仅为示意。回到全域，再问历史怎样塑造地方。'};
export const irrigationSources=[
 {title:'阿里地区行政公署转载西藏日报 · 2023-11-20',url:'https://www.al.gov.cn/info/1035/48267.htm',note:'伦珠挡水开闸、次仁桑卓清渠巡护；林地冬灌与城镇周边绿化。不是家庭供水调查。'},
 {title:'OSM现状狮泉河：归档灌渠、林地与城镇',url:'/data/local-places/shiquanhe.geojson',note:'way/307861096为有名治沙工程灌渠；way/1070107996为地图林地参照，不认定为报道中的作业地块。'},
 {title:'本段事实、解释与示意边界',url:'/data/shiquanhe-irrigation-evidence.json'},
 {title:'© OpenStreetMap contributors · ODbL',url:'https://www.openstreetmap.org/copyright'},
];
export const irrigationFeatureIds={canal:'way/307861096',forest:'way/1070107996',river:'way/154210514'} as const;
export interface IrrigationState {phase:'context'|'closed'|'supply'|'hold'|'return';progress:number;gate:boolean;cleared:boolean;delivered:number;flowing:boolean}
export const irrigationStages=[
 {token:'狮泉河怎样用水',phase:'context',title:'高原盆地 → 河流、城镇与灌渠'},
 {token:'先保留灌渠',phase:'closed',title:'有渠不等于持续供水'},
 {token:'开闸并完成清渠',phase:'supply',title:'设施与管护共同让补水发生'},
 {token:'关闭后',phase:'hold',title:'补水停止，已完成的补水保留'},
 {token:'回到全域',phase:'return',title:'自然条件 → 人的行动 → 地方历史'},
] as const;
export function irrigationFeedback(s:IrrigationState){return !s.gate?'闸门关闭：本次补水停止，已完成的补水保留。':!s.cleared?'仅开闸不够：设定渠段不通且尚未清理，补水未推进；这是功能假设。':s.delivered>=1?'本次示意补水完成；林地仍需要后续巡护。':'闸门打开且已清渠：可推进供水，观察补水结果增加。';}
export function advanceIrrigation(s:IrrigationState):IrrigationState {
 const amount=s.gate&&s.cleared?Math.min(1,s.delivered+.25):s.delivered;
 return {...s,phase:'supply',progress:1,delivered:amount,flowing:s.gate&&s.cleared&&s.delivered<1};
}
