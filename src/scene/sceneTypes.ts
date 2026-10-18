import type {NarrationGuideState} from './narrationAnnotations';
import type {RegionalSpatialInfo} from './regionalSpatialTypes';
import type {OverviewShot} from '../lib/overviewShot';
import type {ClimateLabState} from '../data/climateLab';
import type {ClimateLabReading} from '../lib/climateLabProcess';

export type SceneName = 'earth'|'tectonics'|'sun'|'atmosphere'|'rain'|'climate'|'region'|'landscape'|'history'|'culture'|'connections'|'modern'|'travel';
export interface TibetSceneProps {
  rotationFlow?:import('../data/rotationFlow').RotationFlowState;
  narratedGeography?:import('../lib/narratedGeography').GeographyReading;
  scene: SceneName; step:number; season:number; layer:string; progress:number; playing:boolean;
  selected:string; cutaway:boolean; resetKey:number; onSelect:(id:string)=>void; onInteract:()=>void;
  airMoisture?:'higher'|'lower'; compareRegion?:string;readingFraction?:number;
  climateLab?:ClimateLabState;
  onGroundJourneyReading?:(reading:import('../lib/groundJourney').GroundReading)=>void;
  groundJourney?:import('../lib/groundJourney').GroundJourneyState;
  onClimateLabReading?:(reading:ClimateLabReading)=>void;
  livingSetting?:'valley'|'upland';communitySupport?:'individual'|'shared';
  comparisonRelief?:boolean;
  /** Macro overview uses one stage; optional detail never owns its media clock. */
  overviewMechanism?:import('../data/overviewMechanisms').OverviewMechanismState;
  overviewTopic?:'regions'|'life'|'history'|'culture'|'connections'|'observation';
  overviewFocus?:string;
  overviewFocusedProcess?:import('../lib/overviewFocusedProcesses').FocusedProcessState;
  overviewRiver?:import('../lib/overviewRiver').OverviewRiverState;
  overviewTitle?:string;
  overviewYear?:string;
  overviewPresentation?:boolean;
  overviewLocalContext?:boolean;
  overviewShot?:OverviewShot;
  overviewEvidenceWidth?:number;
  overviewReturnMix?:number;
  overviewIrrigation?:import('../data/overviewIrrigation').IrrigationState;
  overviewPlaceAction?:import('../data/overviewPlaceActions').PlaceActionState;
  overviewCityChange?:import('../data/overviewCityChange').CityChangeState;
  overviewVisit?:{phase:'context'|'crossing'|'organization'|'street'|'shared'|'return';progress:number;motion:number};
  overviewBarkhor?:{phase:'context'|'streets'|'uses'|'designation'|'protection'|'return';progress:number;motion:number};
  overviewUrban?:{phase:'context'|'baseline'|'middle'|'recent'|'plaza'|'barkhor'|'return';progress:number;year:number;showChange:boolean};
  /** Additional regional journeys share the recording's current cue and clock. */
  regionalCue?:number;
  regionalProcess?:boolean;
  regionalCloseView?:boolean;
  regionalFlowDirection?:'along-valley'|'across-ridge';
  regionalSpatialYear?:number;
  regionalAccessTransfer?:boolean;
  regionalGuide?:{title:string;reason:string;effect:string};
  onRegionalSpatialInfo?:(info:RegionalSpatialInfo)=>void;
  /** Manual inspection of sourced station normals, distinct from narrated weather mechanisms. */
  climateObservationMonth?:number;
  climateObservationStationId?:string;
  cityLifeFocus?:'mobility'|'water'|'settlement';
  cityLifeServices?:boolean;
  cityAccessTransfer?:boolean;
  cityLocalFeatureId?:string;
  cityBuiltLayer?:boolean;
  guide?:NarrationGuideState;
  viewKey?:string; routeRegions?:string[]; onReady?:()=>void; onError?:(message:string)=>void;
}
