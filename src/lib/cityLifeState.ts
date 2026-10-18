import {getCityLifeJourney, type CityLifeStageId} from '../data/cityLifeJourney';

export const cityLifeStageOrder: CityLifeStageId[] = ['environment','life','history'];
export const clampCityProgress = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function cityLifeBeat(cityId: string, stage: CityLifeStageId, progress: number) {
  const part = getCityLifeJourney(cityId)?.stages.find(item => item.id === stage);
  return part?.beats.filter(item => item.at <= clampCityProgress(progress)).at(-1) ?? part?.beats[0];
}
export interface CityLifeStagePosition {progress:number;maintained:boolean}
export interface CityLifePosition {
  cityId:string;stage:CityLifeStageId;progress:number;maintained:boolean;voice:boolean;
  stagePositions:Partial<Record<CityLifeStageId,CityLifeStagePosition>>;
  lastEnvironmentStage:'environment'|'life';
}
/** Keep the old top-level fields readable while remembering each visited stage. */
export function rememberCityLifePosition(position:CityLifePosition):CityLifePosition {
  return {...position,stagePositions:{...position.stagePositions,[position.stage]:{progress:position.progress,maintained:position.maintained}},
    lastEnvironmentStage:position.stage==='history'?position.lastEnvironmentStage:position.stage};
}
export function validateCityLifePosition(cityId:string, value:unknown, initialStage:CityLifeStageId='environment'):CityLifePosition {
  const record = value && typeof value === 'object' ? value as Partial<CityLifePosition> : {};
  const stagePositions:CityLifePosition['stagePositions']={};
  for(const stage of cityLifeStageOrder){
    const saved=record.stagePositions?.[stage];
    if(saved&&typeof saved==='object')stagePositions[stage]={progress:clampCityProgress(Number(saved.progress??0)),maintained:saved.maintained!==false};
  }
  return rememberCityLifePosition({cityId,stage:cityLifeStageOrder.includes(record.stage as CityLifeStageId)?record.stage!:initialStage,
    progress:clampCityProgress(Number(record.progress ?? 0)), maintained:record.maintained !== false, voice:record.voice !== false,
    stagePositions,lastEnvironmentStage:record.lastEnvironmentStage==='life'?'life':'environment'});
}

/** Explicit chapter selection restarts; route/facet navigation restores a snapshot. */
export function cityLifeStagePosition(position:CityLifePosition,stage:CityLifeStageId,restart=false):CityLifePosition {
  const saved=rememberCityLifePosition(position),snapshot=restart?undefined:saved.stagePositions[stage];
  return rememberCityLifePosition({...saved,stage,progress:snapshot?.progress??0,maintained:snapshot?.maintained??true});
}
export function cityLifeFacetPosition(position:CityLifePosition,facet:string):CityLifePosition {
  if(facet==='history'&&position.stage!=='history')return cityLifeStagePosition(position,'history');
  if(facet==='environment'&&position.stage==='history')return cityLifeStagePosition(position,position.lastEnvironmentStage);
  return position;
}
