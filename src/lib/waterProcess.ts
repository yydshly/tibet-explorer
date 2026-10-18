/** Authored qualitative stages. These fractions are animation cues, never
 * measured humidity, pressure, droplet size, duration or runoff volume. */
export type AirMoisture = 'higher' | 'lower';
const clamp = (n:number) => Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const smooth = (p:number,a:number,b:number) => {const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};

export function mountainCloudState(progress:number,airMoisture:AirMoisture='higher') {
 const p=clamp(progress),lifting=smooth(p,.2,.56);
 const condensation=airMoisture==='lower'?smooth(p,.57,.7)*.18:smooth(p,.43,.61);
 const growth=airMoisture==='lower'?0:smooth(p,.6,.72);
 const precipitation=airMoisture==='lower'?0:smooth(p,.65,.83);
 return {progress:p,airMoisture,lifting,condensation,growth,precipitation,
  runoff:precipitation*smooth(p,.82,1),parcelPosition:clamp(p/.67),parcelScale:1+lifting*.52,cooling:lifting};
}
export function cloudPhase(progress:number,airMoisture:AirMoisture='higher') {
 const p=mountainCloudState(progress,airMoisture).progress;
 if(p<.2)return {id:'inflow',title:'先看进入山地的空气'};
 if(p<.43)return {id:'lift',title:'迎坡抬升：膨胀与冷却'};
 if(p<.62)return {id:'condensation',title:airMoisture==='lower'?'同样抬升，凝结更晚、更少':'达到条件，水汽凝结成云滴'};
 if(p<.82)return {id:'precipitation',title:airMoisture==='lower'?'少量云滴没有发展成地面降水':'云滴还需增长，才形成降水'};
 return {id:'runoff',title:airMoisture==='lower'?'没有本次降水，就没有新增坡面汇水':'一部分沿坡汇流，一部分进入土壤'};
}
export function waterProcessReading(progress:number,airMoisture:AirMoisture='higher') {
 const s=mountainCloudState(progress,airMoisture);
 return {state:s,
  air:s.lifting===0?'空气带着水汽到来':s.lifting<1?'同一空气团上升、膨胀、冷却':'已抬升到较高处，体积更大',
  cloud:s.condensation===0?'水仍为气态；尚未成云':airMoisture==='lower'?'凝结较晚，只有少量云滴':'部分气态水凝结为云滴',
  rain:s.precipitation===0?(s.growth>0?'云滴正在增长，尚未降雨':'尚无本次降雨'):s.runoff===0?'较大水滴下落，尚未显示坡面汇水':'水到地表，出现汇流与入渗',
  comparison:airMoisture==='lower'?'同样抬升；较少水汽情景没有本次地面降水':'固定山体与进度，可换较少水汽作对照'};
}
