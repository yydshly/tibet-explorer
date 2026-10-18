/** Regional processes stay on the real regional terrain; points are reading references. */
export type RegionalJourneyCityId = 'shigatse' | 'shannan' | 'chamdo' | 'nagqu';
export type RegionalJourneyStageId = 'environment' | 'life' | 'history' | 'connections';
export type RegionalJourneyAction = 'rain' | 'valley' | 'water' | 'settlement' | 'heritage' | 'rail' | 'road' | 'observe';
export interface RegionalJourneySource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  date?: string;
  supports: string[];
}
export interface RegionalJourneyPoint {
  id: string;
  name: string;
  coordinates: [number, number];
  kind: 'city' | 'river' | 'heritage' | 'station' | 'airport' | 'landscape';
  scopeNote: string;
  sourceIds: string[];
}
export interface RegionalJourneyCue {
  id: string;
  text: string;
  action: RegionalJourneyAction;
  /** An exact literal phrase in text; never a fabricated word timestamp. */
  anchor: string;
  pointIds: string[];
  sourceIds: string[];
}
export interface RegionalJourneyStage {
  id: RegionalJourneyStageId;
  title: string;
  question: string;
  summary: string;
  cues: RegionalJourneyCue[];
  /** Brief instructions for meaningful physical condition controls. */
  controls: string[];
}
export interface RegionalJourney {
  cityId: RegionalJourneyCityId;
  title: string;
  lead: string;
  terrainNote: string;
  overviewPosition: [number, number];
  sourceIds: string[];
  points: RegionalJourneyPoint[];
  stages: RegionalJourneyStage[];
}
