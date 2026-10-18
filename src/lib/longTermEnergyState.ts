/** Visual explanation stages only: no radiative flux, temperature, calendar
 * time or local ice response is calculated from these display parameters. */
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const smooth=(value:number,start:number,end:number)=>{const t=clamp((value-start)/(end-start));return t*t*(3-2*t);};
export function longTermEnergyState(progress:number){
 const p=clamp(progress),driver=smooth(p,.1,.35),adjustment=smooth(p,.35,.65),response=smooth(p,.65,.8);
 return {phase:p<.35?'driver' as const:p<.65?'adjustment' as const:'response' as const,
  driver,adjustment,response,
  // An unchanged incoming reference and changing outgoing/return paths make
  // the causal distinction visible. Length/opacity are not flux magnitudes.
  incomingLength:4.6,outgoingLength:4*(1-driver*.25+adjustment*.16),
  outgoingOpacity:.85-driver*.3+adjustment*.24,
  returnLength:.65+driver*1.25+adjustment*.7,
  returnOpacity:.25+driver*.35+adjustment*.3,
  shellOpacity:.045+driver*.06+adjustment*.025,
  surfaceAttention:adjustment*.1+response*.035,
  showResponseObjects:response>0,
 };
}
