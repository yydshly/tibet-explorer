import type {SceneSettings} from './store';

/** Literal script anchors select existing qualitative model states.
 * These ranges are not timestamps or measurements. The recording owns time. */
export interface NarrationScenePhrase {
 token:string;
 targets:string[];
 title:string;
 explanation:string;
 settings?:Partial<SceneSettings>;
 from?:number;
 to?:number;
}
