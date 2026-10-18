import type {CityComparisonPosition,CityComparisonPresentation} from '../hooks/useCityComparisonDirector';
import type {CityTravelObservationLink,CityContinuityTravelId} from './cityContinuityTravel';
import {cityContinuityTravelPlan} from './cityContinuityTravel';
import {cityAccessChanges} from '../data/cityAccessChange';
import {cityAccessPhaseProgress} from './cityAccessState';
import {cityContinuityPartProgress,type CityContinuityLessonStage} from './cityContinuityState';
import {cityContinuityLessons} from '../data/cityContinuityLessons';
import type {CityLocalObservationPoint} from './cityLocalGeography';

export type CityTravelChoiceMap=Record<string,CityTravelObservationLink>;
export interface CityTravelReviewSnapshot {
 cityId:CityContinuityTravelId;
 position:CityComparisonPosition;
 presentation?:CityComparisonPresentation;
 choices:CityTravelChoiceMap;
 readingTop:number;
 pageTop:number;
 focusKey?:string;
 localObservations?:Record<string,CityLocalObservationPoint>;
 activeLocalObservation?:CityLocalObservationPoint;
}

export interface CityTravelReviewTarget {cityId:CityContinuityTravelId;stage:'development'|CityContinuityLessonStage;progress:number;sceneProgress?:number;label:string;key:string}

/** Return to the actual process attached to this stop's material. A cultural
 * use is not redirected to a generic freight example just because both are
 * grouped under life questions. */
export function cityTravelObservationReviewTargets(cityId:CityContinuityTravelId,stopId:string,link:CityTravelObservationLink):CityTravelReviewTarget[]{
 if(!cityContinuityTravelPlan(cityId).stops.some(stop=>stop.id===stopId))return [];
 const access=(phase:CityTravelObservationLink,label?:string):CityTravelReviewTarget=>({cityId,stage:'development',progress:cityAccessPhaseProgress(cityId,phase),label:label??`回看${cityAccessChanges[cityId][phase].label}`,key:`${stopId}-${link}-development-${phase}`});
 const part=(stage:CityContinuityLessonStage,index:number,label?:string):CityTravelReviewTarget=>({cityId,stage,progress:cityContinuityPartProgress(cityId,index),label:label??`回看${cityContinuityLessons[stage][cityId][index].title}`,key:`${stopId}-${link}-${stage}-${index}`});
 if(link!=='life')return [access(link)];
 if(stopId==='lhasa-buildings')return [part('history',1,'回看白宫礼仪与居住'),part('history',2,'回看红宫纪念与宗教用途')];
 if(stopId==='lhasa-old-town')return [part('connections',2,'回看历史用途与访问管理')];
 if(stopId==='nyingchi-lulang')return [part('history',2),part('history',1,'回看工布服饰的讲解与参与')];
 if(stopId==='tholing')return [part('history',0,'回看托林教师交流'),part('history',1,'回看学习与翻译')];
 if(stopId==='shiquanhe-life')return [part('history',2)];
 return [access('life',cityId==='nyingchi'?'回看彩门村接待与寄售':'回看物资怎样进入城市生活')];
}

/** A temporary in-memory detour, separate from saved observation notes. The
 * caller restores this snapshot explicitly rather than overwriting it at entry. */
export function captureCityTravelReview(position:CityComparisonPosition,choices:CityTravelChoiceMap,scroll:{readingTop:number;pageTop:number},focusKey?:string,local?:{observations:Record<string,CityLocalObservationPoint>;active?:CityLocalObservationPoint}):CityTravelReviewSnapshot {
 const cityId=position.progress>=.68?'ngari':position.progress>=.34?'lhasa':'nyingchi';
 return {cityId,position:{...position},choices:{...choices},readingTop:Number.isFinite(scroll.readingTop)?Math.max(0,scroll.readingTop):0,pageTop:Number.isFinite(scroll.pageTop)?Math.max(0,scroll.pageTop):0,...(focusKey?{focusKey}:{}),...(local?{localObservations:{...local.observations},activeLocalObservation:local.active}:{})};
}
