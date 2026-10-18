import type {RecognitionNavigation} from './recognitionRoute';
export type EntryAction={kind:'drawer';value:'contents'|'models'|'saved'}|{kind:'theme';value:'nature'|'history'|'connections'|'travel'}|{kind:'city';value:string}|{kind:'detail';value:string}|{kind:'recognition';value:RecognitionNavigation};
