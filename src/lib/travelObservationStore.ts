import {validCorridorSnapshot,type CorridorSnapshot} from './corridorStore';
import type {TravelPlace} from '../data/travelObservation';
export const travelSessionKey='tibet-explorer.travel-return.v1';
export type TravelSession={version:1;place:TravelPlace;returnTo:CorridorSnapshot;wasManual?:boolean};
export function readTravelSession():TravelSession|undefined{
 try{const x=JSON.parse(localStorage.getItem(travelSessionKey)||'null');if(x?.version===1&&['sejila','lulang'].includes(x.place)&&validCorridorSnapshot(x.returnTo)&&(x.wasManual===undefined||typeof x.wasManual==='boolean'))return x;}catch{/* A return in memory remains available. */}
}
export function writeTravelSession(s:TravelSession|undefined){try{if(s)localStorage.setItem(travelSessionKey,JSON.stringify(s));else localStorage.removeItem(travelSessionKey);return true;}catch{return false;}}
