import {cityContinuityLessons} from '../data/cityContinuityLessons';
import {cityAccessCities,cityAccessCityRange} from './cityAccessState';
import {cityContinuityLessonStages,cityContinuityPartProgress,type CityContinuityLessonStage} from './cityContinuityState';
import type {CityLifeAudioSegment} from './cityLifeAudio';

export function cityContinuityAudioSegments(stage:CityContinuityLessonStage):CityLifeAudioSegment[]{
 return cityAccessCities.flatMap(cityId=>cityContinuityLessons[stage][cityId].map((part,index)=>({
  id:part.id,text:part.narration,start:cityContinuityPartProgress(cityId,index),
  end:index===2?cityAccessCityRange(cityId).end:cityContinuityPartProgress(cityId,index+1),
 })));
}

export const cityContinuityNarrationCues=cityContinuityLessonStages.flatMap(stage=>cityAccessCities.flatMap(cityId=>
 cityContinuityLessons[stage][cityId].map(part=>({id:part.id,title:part.title,narration:part.narration,stepId:`COMPARE-${stage}`,chapterId:'comparison'}))
));
