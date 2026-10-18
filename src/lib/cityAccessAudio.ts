import {cityAccessChanges} from '../data/cityAccessChange';
import {cityAccessCities,cityAccessPhases,cityAccessCityRange} from './cityAccessState';
import type {CityLifeAudioSegment} from './cityLifeAudio';

/** Each actual clip owns one visible process, rather than an estimated word cue. */
export const cityAccessAudioSegments:CityLifeAudioSegment[]=cityAccessCities.flatMap(cityId=>{
 const change=cityAccessChanges[cityId],range=cityAccessCityRange(cityId);
 return cityAccessPhases.map((phase,index)=>({
  id:`ACCESS-${cityId}-${phase.id}`,text:change[phase.id].narration,
  start:range.start+(range.end-range.start)*phase.at,
  end:index===cityAccessPhases.length-1?range.end:range.start+(range.end-range.start)*cityAccessPhases[index+1].at,
 }));
});
const cityNames={nyingchi:'林芝',lhasa:'拉萨',ngari:'阿里'};
export const cityAccessNarrationCues=cityAccessAudioSegments.map((segment,index)=>{
 const cityId=cityAccessCities[Math.floor(index/cityAccessPhases.length)],phase=cityAccessPhases[index%cityAccessPhases.length];
 return {id:segment.id,title:`${cityNames[cityId]} · ${cityAccessChanges[cityId][phase.id].label}`,stepId:'COMPARE-development',chapterId:'comparison',narration:segment.text};
});
