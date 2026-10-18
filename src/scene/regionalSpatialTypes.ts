import type {RegionalJourneyCityId} from '../data/regionalJourneyTypes';
export type SpatialCoordinate=[number,number];
export interface SpatialRoute {id:string;title:string;kind?:string;coordinates:SpatialCoordinate[];featureIds:string[];sourceNodeIds?:number[];sourceWayIdsByEdge?:string[];startGapMetres:number;endGapMetres:number;geometryLengthMetres?:number;geometryLengthMeters?:number;endpointScope:string;startFeatureId?:string;endFeatureId?:string;startReference?:SpatialLandmark;endReference?:SpatialLandmark}
export interface SpatialLandmark {id:string;featureId:string;name:string;coordinates:SpatialCoordinate;role:string;sourceIds:string[]}
export interface SpatialRouteCollection {routes:SpatialRoute[];landmarks:SpatialLandmark[]}
export interface RegionalSpatialInfo {cityId:RegionalJourneyCityId;status:'loading'|'ready'|'error';active:boolean;error?:string;year?:number;pixels?:number;phase?:string;routeTitle?:string;routeKind?:string;routeMetres?:number;startGap?:number;endGap?:number;bbox?:number[];acquiredAt?:string;roadCount?:number;buildingCount?:number;featureId?:string;featureName?:string}
