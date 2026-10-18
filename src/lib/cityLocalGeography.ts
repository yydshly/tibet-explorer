import type {CityComparisonStageId} from '../data/cityComparison';
import {cityContinuityLessons} from '../data/cityContinuityLessons';
import {cityAccessChanges} from '../data/cityAccessChange';
import {cityAccessState} from './cityAccessState';
import {cityContinuityPartState,isCityContinuityLessonStage} from './cityContinuityState';

export type CityLocalityId='lulang'|'lhasa'|'shiquanhe';
export const cityLocalityNames:Record<CityLocalityId,string>={lulang:'鲁朗',lhasa:'拉萨河谷与城区',shiquanhe:'狮泉河城区'};
export interface CityLocalGeographyResolution {localityId?:CityLocalityId;contextScale?:'corridor';referenceId:string;cityId:'nyingchi'|'lhasa'|'ngari';placeName:string;eventTime:string;scope:string;sourceIds:readonly string[]}

/** A reference without acquired local geometry stays at its real regional
 * locator. It must never borrow another town's streets as its event site. */
export function resolveCityLocalGeography(stage:CityComparisonStageId,progress:number):CityLocalGeographyResolution|undefined {
 if(stage==='development'){
  const state=cityAccessState(progress),change=cityAccessChanges[state.cityId];
  if(state.cityId==='lhasa')return state.index===3?{cityId:'lhasa',referenceId:'lhasa',placeName:'拉萨西货场材料（地区定位）',eventTime:'2026年采访',scope:'拉萨西货场与客运站是不同位置；本轮地方窗口未取得货场几何，不在客站街区复原食品、百货或医药装卸。',sourceIds:change.sourceIds}:{cityId:'lhasa',localityId:'lhasa',referenceId:'lhasa',placeName:'拉萨河谷与城区',eventTime:state.index===2?'2007年4月柳梧大桥':change.eventDate,scope:'当前地图可读客站、跨河与历史城区的相对位置；客运站、拉萨西货场和历史建筑分别理解，不以现状图复原2006或2007年的城市。',sourceIds:change.sourceIds};
  if(state.cityId==='nyingchi')return {cityId:'nyingchi',referenceId:'nyingchi',placeName:state.index>=2?'米林·彩门村交通材料（地区定位）':'林芝区域交通',eventTime:change.eventDate,scope:'本段保留林芝地区定位；鲁朗现状窗口不包含米林机场、岗嘎站或彩门村，不把它们放到鲁朗街区。',sourceIds:change.sourceIds};
  return state.index===3?{cityId:'ngari',localityId:'shiquanhe',referenceId:'ngari',placeName:'狮泉河河岸与城区',eventTime:'2017年公共空间材料',scope:'现状河岸与桥位帮助阅读公共生活；不把今天全部公园或步道归入2017年工程，机场与地面接续在地区范围分别定位。',sourceIds:change.sourceIds}:{cityId:'ngari',referenceId:'ngari',placeName:'昆莎—狮泉河交通接续（地区范围）',eventTime:change.eventDate,scope:'昆莎机场与狮泉河分别定位；精细城区窗口不覆盖整个机场接续，当前道路与2004年建设记录分别理解，不用规划新线代替既有路。',sourceIds:change.sourceIds};
 }
 if(!isCityContinuityLessonStage(stage))return undefined;
 const state=cityContinuityPartState(progress),part=cityContinuityLessons[stage][state.cityId][state.index],referenceId=part.referenceId;
 if(stage==='connections'&&state.cityId==='nyingchi'&&state.index===2)return {cityId:'nyingchi',localityId:'lulang',contextScale:'corridor',referenceId:'lulang',placeName:'米林—林芝—鲁朗道路接续',eventTime:'2020公路／2016—2017服务材料',scope:'先读米林机场外部道路经S4到林芝，再沿G318越岭至鲁朗；两链在同一原始道路节点交接。机场内部受限道路未纳入，终点也不是已核实访问入口。当前源道路与历史事件年份分别理解，完整路链见transport-corridors.manifest.json。',sourceIds:part.sourceIds};
 if(stage==='connections'&&state.cityId==='ngari'&&state.index<=1)return {cityId:'ngari',referenceId:'ngari',placeName:state.index===0?'阿里区域航空入口（地区定位）':'昆莎—狮泉河公路接续（地区范围）',eventTime:part.year??'2010',scope:'机场、既有公路与狮泉河城区分别定位；精细城区窗口不覆盖全部接续，不把当前道路当2004年竣工图或出行日导航。',sourceIds:part.sourceIds};
 const localityId:CityLocalityId|undefined=referenceId==='lulang'?'lulang':referenceId==='lhasa'?'lhasa':referenceId==='ngari'?'shiquanhe':undefined;
 const placeName=localityId?cityLocalityNames[localityId]:referenceId==='tholing'?'札达·托林（聚居地定位）':stage==='connections'&&state.index===1?'米林·彩门村材料（地区定位）':'林芝工布区域（地区定位）';
 const scope=!localityId?referenceId==='tholing'?'保留托林的真实聚居地定位与来源材料；本轮三处现状窗口不包含托林，不在狮泉河街区演示其现场。':'保留来源所指地区定位；本轮没有公共课堂或彩门村的现场地物，不能拿鲁朗窗口代替。':localityId==='lulang'?'现状窗口读鲁朗河、G318及小镇附近地物，不覆盖完整色季拉越岭；当前道路与建筑轮廓不是2016年建成复原。':localityId==='lhasa'?'现状窗口读河流、道路及历史对象的相对位置；不是7世纪、17世纪或铁路开通时的城市复原，也不定位地下取水设施。':'现状窗口读狮泉河城区河流、道路与周围地物；不是2017工程边界，也不定位2023年冬灌报道中的闸口。';
 return {cityId:state.cityId,localityId,referenceId,placeName,eventTime:part.year??'资料所记时期',scope,sourceIds:part.sourceIds};
}

export interface CityLocalManifestPlace {id:CityLocalityId;acquiredAt:string;bbox:[number,number,number,number];file:string;attribution:string;copyrightUrl?:string;featureCounts?:Record<string,number>}
export interface CityLocalManifest {schemaVersion:number;attribution:string;places:CityLocalManifestPlace[]}
export interface CityLocalObservationPoint {localityId:CityLocalityId;featureId:string;name:string;featureClass:string;coordinates:[number,number];acquiredAt:string;sourceUrl:string}
/** An observation remains pending across a review, but never highlights a
 * different locality or a historical/transport process during that detour. */
export function cityLocalObservationFeatureId(stage:CityComparisonStageId,progress:number,point:CityLocalObservationPoint|undefined):string|undefined {
 return stage==='travel'&&point?.localityId===resolveCityLocalGeography(stage,progress)?.localityId?point?.featureId:undefined;
}
export const cityLocalityForStop:Record<string,CityLocalityId|undefined>={'nyingchi-lulang':'lulang','lhasa-river':'lhasa','lhasa-buildings':'lhasa','lhasa-old-town':'lhasa','shiquanhe-life':'shiquanhe'};
const priorities:Record<CityLocalityId,string[]>={lulang:['way/26406905','way/49209937','way/1322496961','way/1322390955'],lhasa:['way/408117841','way/122707217','way/122707268','way/31475419','relation/2358701'],shiquanhe:['way/154210514','way/154210585','way/978103852','way/904011648']};

/** Pick actual source vertices within the downloaded window, never an invented
 * visit entrance or an interpolated navigation stop. */
export function cityLocalObservationPoints(collection:unknown,stopId:string):CityLocalObservationPoint[]{
 const data=collection as {metadata?:CityLocalManifestPlace;features?:Array<{id?:string;properties?:{name?:string;featureClass?:string;osm_url?:string;tags?:Record<string,string>};geometry?:{type?:string;coordinates?:unknown}}>};
 const id=cityLocalityForStop[stopId],metadata=data?.metadata;if(!id||!metadata||metadata.id!==id||!Array.isArray(data.features)||!Array.isArray(metadata.bbox))return [];
 const [west,south,east,north]=metadata.bbox;
 const vertex=(value:unknown):[number,number]|undefined=>{if(!Array.isArray(value))return; if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number'){return value[0]>=west&&value[0]<=east&&value[1]>=south&&value[1]<=north?[value[0],value[1]]:undefined;}for(const child of value){const found=vertex(child);if(found)return found;}return;};
 const points=data.features.flatMap(feature=>{const properties=feature.properties,tags=properties?.tags??{},name=tags['name:zh']??properties?.name??tags.name,kind=properties?.featureClass??(tags.waterway?'waterway':tags.highway?'road':tags.building?'building':'place'),coordinates=vertex(feature.geometry?.coordinates);if(!feature.id||!name||!coordinates||!['road','waterway','water','building','place','railway','leisure','landuse'].includes(kind))return []; if(stopId==='lhasa-buildings'&&!/布达拉|大昭/.test(name))return [];if(stopId==='lhasa-river'&&!['waterway','water','road','railway'].includes(kind)&&tags.railway!=='station')return [];return [{localityId:id,featureId:feature.id,name,featureClass:kind,coordinates,acquiredAt:metadata.acquiredAt,sourceUrl:properties?.osm_url??`https://www.openstreetmap.org/${feature.id}`}];});
 points.sort((a,b)=>{const pa=priorities[id].indexOf(a.featureId),pb=priorities[id].indexOf(b.featureId);return (pa<0?100:pa)-(pb<0?100:pb);});
 const seen=new Set<string>();return points.filter(point=>{const key=`${point.featureClass}:${point.name}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,4);
}
export function cityLocalObservationNote(point:CityLocalObservationPoint):string{return `【地图观察参照】${cityLocalityNames[point.localityId]} · ${point.name}（${point.featureId}）；OSM获取${point.acquiredAt.slice(0,10)}。这是地理要素读点，非已核验的访问入口。`;}
