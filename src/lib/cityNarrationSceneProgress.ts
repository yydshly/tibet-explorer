import {cityLifeSceneToAudio,type CityLifeAudioSegment} from './cityLifeAudio';
import {narrationTimingForPlayback,type TimingPlayback} from './narrationTiming';

export interface CityNarrationSceneAnchor {token:string;at:number}
/** Existing scene thresholds, addressed by literal words in the existing
 * narration. These describe teaching motion, not travel speeds or new facts. */
export const cityNarrationSceneAnchors:Readonly<Record<string,readonly CityNarrationSceneAnchor[]>>={
 'CONT-connections-nyingchi-3':[
  {token:'再沿三一八国道',at:.5},
  {token:'回到同一片服务用地',at:.94},
  {token:'住宿、商业与经营者',at:.98},
 ],
 'ACCESS-lhasa-transfer':[
  {token:'看抵达',at:.02},
  {token:'跨河进城',at:.15},
  {token:'洛桑赤列',at:.8},
  {token:'拉萨西货场是另一处地点',at:.999},
 ],
 'CONT-connections-lhasa-2':[
  {token:'先看跨河',at:.02},
  {token:'柳梧大桥',at:.15},
  {token:'火车站与市区',at:.75},
  {token:'拉萨西货场',at:.999},
 ],
 'CONT-history-nyingchi-3':[
  // The dated work starts the life evidence. Keep it within approach; this
  // word must not prematurely turn a service parcel into a training site.
  {token:'二〇一七年',at:.35},
  {token:'道路让人经过',at:.44},
  {token:'住宿与接待',at:.58},
  {token:'图上是现状位置',at:.86},
 ],
 'CONT-history-lhasa-1':[
  {token:'再定位大昭寺',at:.44},
  {token:'承担宗教用途',at:.58},
  {token:'图上的轮廓',at:.86},
 ],
 'CONT-history-lhasa-2':[
  {token:'主持白宫建设',at:.44},
  {token:'礼仪、接见与居住',at:.58},
  {token:'把用途加到年代上',at:.86},
 ],
 'CONT-history-lhasa-3':[
  {token:'包含灵塔和宗教活动空间',at:.58},
  {token:'它与白宫用途不同',at:.86},
 ],
 'CONT-history-ngari-3':[
  {token:'二〇一七年',at:.44},
  {token:'绿化、步行与休闲',at:.58},
  {token:'现状地图',at:.86},
 ],
 'CONT-connections-lhasa-3':[
  {token:'大昭寺、白宫和红宫',at:.44},
  {token:'有不同用途',at:.58},
  {token:'二〇二五年',at:.86},
 ],
 'CONT-connections-ngari-3':[
  {token:'二〇一七年',at:.44},
  {token:'绿化、步行和休闲用途',at:.58},
  {token:'不同年份的建设',at:.86},
 ],
 'CONT-travel-nyingchi-2':[
  {token:'车辆怎样经过',at:.25},
  {token:'人在哪里停留',at:.44},
  {token:'住宿接待',at:.58},
  {token:'再读二〇一六年',at:.86},
 ],
 'CONT-travel-lhasa-2':[
  {token:'大昭寺的宗教活动',at:.44},
  {token:'白宫的礼仪与居住',at:.58},
  {token:'红宫的纪念用途',at:.75},
  {token:'把对象、年代和用途',at:.86},
 ],
 'CONT-travel-ngari-2':[
  {token:'桥梁通行',at:.25},
  {token:'步行停留与公共活动',at:.58},
  {token:'再回看二〇一七年',at:.86},
 ],
};

const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
/** Larger than the part-state 1e-9 tolerance even for the shortest clip range.
 * A completed final word must not advance places during the audio's tail pause. */
export const CITY_SCENE_END_MARGIN=1e-5;

function anchoredProgress(segment:CityLifeAudioSegment,textProgress:number):number{
 const plan=cityNarrationSceneAnchors[segment.id];if(!plan)return textProgress;
 const points=[{text:0,scene:0}];
 for(const anchor of plan){
  const offset=segment.text.indexOf(anchor.token),previous=points.at(-1)!;
  // Revised narration must never retain a partially matching movement plan.
  if(offset<=previous.text*segment.text.length||anchor.at<previous.scene||anchor.at>=1)return textProgress;
  points.push({text:offset/segment.text.length,scene:anchor.at});
 }
 points.push({text:1,scene:1});
 let index=0;while(index+1<points.length-1&&textProgress>=points[index+1].text)index++;
 const from=points[index],to=points[index+1],amount=clamp((textProgress-from.text)/(to.text-from.text));
 return from.scene+(to.scene-from.scene)*amount;
}

/** Pure display progress. Saved position, slider/seek semantics and queue
 * boundaries always remain the original recorded-audio fraction. Native words
 * only move physical teaching actions within their current recorded segment. */
export function cityNarrationSceneProgress(segments:readonly CityLifeAudioSegment[],rawProgress:number,audio:TimingPlayback):number{
 const raw=clamp(rawProgress),position=cityLifeSceneToAudio(segments,raw);if(!position)return raw;
 const {segment,fraction}=position,timing=narrationTimingForPlayback(segment.text,fraction,audio,segment.id);
 if(timing.precision!=='provider'||timing.timingLevel!=='word'||!Number.isFinite(timing.textProgress))return raw;
 const local=anchoredProgress(segment,clamp(timing.textProgress));
 const bounded=fraction<1?Math.min(local,1-CITY_SCENE_END_MARGIN):local;
 if(bounded===0)return segment.start;if(bounded===1)return segment.end;
 // The inverse nested city/part division must not round an exact .5 road-leg
 // anchor below its branch. This is machine precision, not extra motion time.
 return Math.min(segment.end,segment.start+(segment.end-segment.start)*bounded+Number.EPSILON);
}
