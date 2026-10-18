import type {NarrationTiming} from '../lib/narrationTiming';

/** These two scripts read the exact archived station normals; they do not
 * substitute a region, a forecast or a rainfall animation for observations. */
export const climateObservationNarrationCues = [
  {
    id:'OBS-CLIMATE-1',month:1,title:'一月：同在高原，冬季条件仍不同',stepId:'OBS-CLIMATE',chapterId:'observations',
    narration:'以下是一九九一至二零二零年一月气候标准值，不是今天的天气。林芝站月平均气温一点一摄氏度，月降水量均值二毫米。拉萨站负零点三摄氏度、零点九毫米。狮泉河站负十一点七摄氏度、一点六毫米。三站都在高原，但冬季温度和降水并不相同。统计只代表站点，不能概括市域或整个阿里。',
    focusEndToken:'三站都在高原',
  },
  {
    id:'OBS-CLIMATE-7',month:7,title:'七月：用真实数据检验东西差异',stepId:'OBS-CLIMATE',chapterId:'observations',
    narration:'以下是一九九一至二零二零年七月气候标准值，不是当天预报。林芝站月平均气温十六点五摄氏度，月降水量均值一百三十七点四毫米。拉萨站也是十六点五摄氏度，降水一百四十点五毫米。狮泉河站十五摄氏度，降水二十二点九毫米。这个月拉萨略多于林芝，东西之间不是每月固定递减。统计只代表站点，不能概括全域。',
    focusEndToken:'这个月拉萨略多于林芝',
  },
] as const;

export type ClimateObservationNarrationCue=typeof climateObservationNarrationCues[number];
export function getClimateObservationNarration(month:number):ClimateObservationNarrationCue|undefined {
  return climateObservationNarrationCues.find(cue=>cue.month===month);
}

/** A source word's exclusive range, not an equal-duration segment or estimated
 * character clock, owns attention. Word spans can include punctuation. A gap
 * retains that real word and therefore never anticipates the next station. */
export function climateObservationNarrationStation(month:number,audio:{cue:{id:string;text:string}|null;timing?:NarrationTiming}):string|undefined {
  const cue=getClimateObservationNarration(month),timing=audio.timing;
  if(!cue||audio.cue?.id!==cue.id||audio.cue.text!==cue.narration||timing?.precision!=='provider'||timing.timingLevel!=='word'||
    !Number.isInteger(timing.activeTextStart)||!Number.isInteger(timing.activeTextEnd))return;
  const end=timing.activeTextEnd!;
  if(end<=0||end>cue.narration.length||timing.activeTextStart!<0||timing.activeTextStart!>=end)return;
  const boundaries=[
    {start:cue.narration.indexOf('林芝站'),station:'56312'},
    {start:cue.narration.indexOf('拉萨站'),station:'55591'},
    {start:cue.narration.indexOf('狮泉河站'),station:'55228'},
    {start:cue.narration.indexOf(cue.focusEndToken),station:undefined},
  ];
  return boundaries.filter(boundary=>boundary.start>=0&&boundary.start<end).at(-1)?.station;
}
