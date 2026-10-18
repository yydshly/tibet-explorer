export type ProgressMotion={from:number;to:number;startAt?:number;via?:{at:number;value:number}[]};
/** A held starting condition and the later movement both use the narration clock. */
export function journeyMotionProgress(motion:ProgressMotion,clock:number){
 const start=Math.max(0,Math.min(.999,motion.startAt??0)),t=Number.isFinite(clock)?Math.max(0,Math.min(1,(clock-start)/(1-start))):0;
 // Authored sentence beats share the audio clock. No second animation timer.
 if(motion.via?.length){
  const points=[{at:0,value:motion.from},...motion.via.filter(p=>p.at>0&&p.at<1&&Number.isFinite(p.value)).sort((a,b)=>a.at-b.at),{at:1,value:motion.to}];
  const right=points.findIndex(p=>p.at>=t);
  if(right<=0)return points[0].value;
  const a=points[right-1],b=points[right];return a.value+(b.value-a.value)*(t-a.at)/(b.at-a.at);
 }
 return motion.from+(motion.to-motion.from)*t;
}
