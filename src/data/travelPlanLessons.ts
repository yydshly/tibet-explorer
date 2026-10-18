/** The inline return and exported plan must reopen the same substantive question. */
import {cityContinuityTravelStops} from './cityContinuity';
export const travelPlanLessons:Readonly<Record<string,string>>={
 'lhasa-old-town':'K4','lhasa-buildings':'K1','yarlung-valley':'E3',sakya:'H2',
 'nyingchi-valley':'C5',changtang:'M2',tholing:'K2','chamdo-valleys':'R2',
 ...Object.fromEntries(cityContinuityTravelStops.map(stop=>[stop.id,stop.lessonId])),
};
