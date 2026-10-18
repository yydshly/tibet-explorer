import {cityTravelOrigin} from './cityTravelOrigin';
import {sanitizeTravelAccessBook,type TravelAccessVerificationBook} from './travelAccessVerification';

export interface SceneSettings { season: number; layer: string; progress: number; selected: string; cutaway: boolean; readingFraction?:number; airMoisture?: 'higher'|'lower'; compareRegion?: string;livingSetting?:'valley'|'upland';communitySupport?:'individual'|'shared' }
export interface Exploration {
  version: 1; lastStep: string; visited: string[]; completed: string[]; bookmarks: string[];
  scenes: Record<string, SceneSettings>; route: string[]; note: string; travelDate: string; transport: string; stopNotes:Record<string,string>;stopOrigins?:Record<string,string>;accessVerifications?:TravelAccessVerificationBook;
}

export const STORAGE_KEY = 'tibet-explorer.v1';

// Persisted IDs are a versioned contract, checked against the curriculum in tests.
const STEP_GROUPS: Record<string, number> = { G: 4, C: 9, E: 3, P: 3, H: 4, K: 4, R: 3, M: 3, T: 3 };
const STEP_IDS = new Set(Object.entries(STEP_GROUPS).flatMap(([prefix, count]) =>
  Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`)));
const HISTORY_IDS = ['prehistoric', 'empire', 'revival', 'yuan', 'local', 'ganden', 'qing', 'early-modern', 'contemporary'];
const CULTURE_IDS = ['architecture', 'religion', 'art', 'life'];
const HISTORY_DEFAULTS: Record<string, number> = { H1: 0, H2: 1, H3: 1, H4: 8 };
const CULTURE_DEFAULTS: Record<string, number> = { K1: 0, K2: 1, K3: 2, K4: 3 };
const REGION_IDS = ['lhasa', 'shannan', 'shigatse', 'nyingchi', 'nagqu', 'ngari', 'chamdo'];
const ROUTE_IDS = new Set(['lhasa-old-town', 'lhasa-buildings', 'yarlung-valley', 'sakya', 'nyingchi-valley', 'changtang', 'tholing', 'chamdo-valleys','nyingchi-lulang','lhasa-river','shiquanhe-life']);
const LAYER_IDS = new Set(['arrival','uplift','cloud','regions','earth-system','earth-heating','earth-circulation','earth-contrasts','opera-stage','construction','cooperation','ground','activity','settlement','identity','chronology','overlap','sediment','event-1951','event-1959','event-1965','parcel', 'circulation', 'locations', 'globe', 'asia', 'china', 'tibet', 'surroundings', 'plateau', 'moisture', 'crust', 'surface', 'relief', 'absorption', 'exchange', 'event-821', 'event-822', 'event-823', 'object', 'terrain', 'latitude', 'zones', 'plates', 'elevation', 'solar', 'sunlight', 'energy', 'temperature', 'wind', 'water', 'rain', 'weather', 'season', 'forcing', 'change', 'glacier', 'snow', 'vegetation', 'settlements', 'routes', 'culture', 'section', 'transport', 'ecology', ...CULTURE_IDS]);
const SELECTION_IDS = new Set(['earth-ocean','earth-land','earth-air','earth-ice','compare-equator','compare-desert','compare-plateau','opera-space','opera-performance','opera-learning','palace-hill','palace-white','palace-red','palace-terrace','palace-history','local-overview','local-window','local-town','local-slope','local-valley','local-profile','connection-slope','connection-obstruction','connection-ridge','connection-rain','connection-runoff','connection-tributary','connection-confluence','connection-downstream','connection-use','connection-pass','connection-foothill','connection-corridor','connection-carrier','connection-transfer','connection-organization','connection-upstream','connection-ecology','connection-observation','connection-records','travel-landform','travel-water','travel-settlement','travel-heritage','travel-question','travel-corridor','travel-transfer','travel-lastmile','travel-evidence','travel-conditions','travel-record','travel-candidates','','rail-ground','rail-ice','rail-rock','rail-air','rail-track','rail-operation','rail-lastmile', 'living-slope','living-water','living-land','living-access','living-work','living-houses','living-shared','living-memory','culture-base','culture-text','culture-learning','culture-craft','culture-use','culture-maintenance','history-context','history-tool','history-dating','history-inference','history-periods','history-politics','history-knowledge','history-practice','history-event','history-stele-body','history-rubbing','history-reading','history-document','history-institution','history-household','landform-slope','landform-channel','landform-sediment','landform-deposit','development-link', 'development-service', 'development-lastmile', 'development-facility', 'development-staff', 'development-ecology', 'development-community', 'development-benefit', 'development-activity', ...REGION_IDS, ...HISTORY_IDS, ...CULTURE_IDS, 'height-low', 'height-high', 'height-parcel', 'height-environment', 'circulation-ocean', 'circulation-land', 'circulation-plateau', 'circulation-south', 'circulation-west', 'cloud-inflow', 'cloud-lift', 'cloud-condense', 'cloud-precipitation', 'cloud-runoff', 'southwest', 'earth-equator', 'earth-tropic', 'earth-temperate', 'earth-atmosphere', 'asia', 'china', 'tibet', 'plateau', 'indian-ocean', 'pacific-ocean', 'central-asia', 'east-asia', 'indian-subcontinent', 'himalaya', 'formation-india', 'formation-eurasia', 'formation-crust', 'formation-surface', 'terrain-himalaya', 'terrain-interior', 'terrain-yarlung', 'terrain-southeast', 'energy-sunlight', 'energy-surface', 'energy-atmosphere', 'energy-space', 'courtyard', 'hall', 'materials', 'stele']);
const TRANSPORTS = new Set(['', '公共交通', '包车或自驾', '混合交通']);
const CHAPTER_STEPS: Record<string, string> = { position: 'G', climate: 'C', regions: 'E', landscapes: 'P', history: 'H', culture: 'K', connections: 'R', modern: 'M', travel: 'T' };

export const emptyExploration = (): Exploration => ({
  version: 1, lastStep: 'G1', visited: [], completed: [], bookmarks: [], scenes: {}, route: [], note: '', travelDate: '', transport: '',stopNotes:{},stopOrigins:{},
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function knownStrings(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && allowed.has(item)))];
}

function validTravelDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export function defaultSettings(layer = 'terrain', selected = ''): SceneSettings {
  return { season: 1, layer, progress: .55, selected, cutaway: false };
}

export function resolveHistoryPeriodIndex(settings: SceneSettings, stepId: string): number {
  const explicit = HISTORY_IDS.indexOf(settings.selected);
  return explicit >= 0 ? explicit : Object.hasOwn(HISTORY_DEFAULTS, stepId) ? HISTORY_DEFAULTS[stepId] : 0;
}

export function resolveCultureTopicIndex(settings: SceneSettings, stepId: string): number {
  const layer = CULTURE_IDS.indexOf(settings.layer);
  if (layer >= 0) return layer;
  const explicit = CULTURE_IDS.indexOf(settings.selected);
  return explicit >= 0 ? explicit : Object.hasOwn(CULTURE_DEFAULTS, stepId) ? CULTURE_DEFAULTS[stepId] : 0;
}

export function settingsForStep(step: { id: string; layer: string; selected?: string; scene: string }): SceneSettings {
  const settings = defaultSettings(step.layer, step.selected);
  if(step.id==='G1')return {...settings,layer:'earth-system',progress:0,selected:'earth-ocean'};
  if(step.id==='G2')return {...settings,layer:'globe',progress:0,selected:''};
  if (['E3','P3'].includes(step.id)) return {...settings,progress:0,selected:'',livingSetting:'valley',communitySupport:'individual'};
  if (step.id==='P1') return {...settings,progress:.12,layer:'terrain',selected:''};
  if (step.id==='P2') return {...settings,progress:0,layer:'terrain',selected:''};
  if (['K1','K2','K3','K4'].includes(step.id)) return {...settings,progress:0,selected:'',layer:CULTURE_IDS[resolveCultureTopicIndex(settings,step.id)]};
  if(step.id==='M1')return {...settings,season:3,layer:'ground',progress:0,selected:''};
  if(['R1','R2','R3','T1','T2','T3'].includes(step.id))return {...settings,progress:0,selected:''};
  if (['M1','M2','M3'].includes(step.id)) return {...settings,progress:0,selected:''};
  if (step.id === 'C4') return {...settings,layer:'arrival',progress:0,selected:'nyingchi',airMoisture:'higher'};
  if (step.id === 'C3') return {...settings,progress:0};
  if (step.id === 'C5' || step.id === 'C6') return {...settings,airMoisture:'higher'};
  if (step.id === 'E1' || step.id === 'E2') return {...settings,compareRegion:step.selected==='nyingchi'?'nagqu':'nyingchi'};
  if (step.scene === 'tectonics') return { ...settings, cutaway: true };
  if (step.scene === 'history') {
    const period = resolveHistoryPeriodIndex(settings, step.id);
    return { ...settings, layer:step.id==='H1'?'activity':step.id==='H2'?'chronology':step.id==='H3'?'event-821':'event-1951', selected: HISTORY_IDS[period], progress:step.id==='H2'?period/(HISTORY_IDS.length-1):0 };
  }
  if (step.scene === 'culture') {
    return { ...settings, cutaway: false, layer: CULTURE_IDS[resolveCultureTopicIndex(settings, step.id)] };
  }
  return settings;
}

export function parseExploration(raw: string | null): Exploration {
  const fallback = emptyExploration();
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return fallback;
    const scenes: Record<string, SceneSettings> = {};
    if (isRecord(value.scenes)) {
      for (const [id, scene] of Object.entries(value.scenes)) {
        if (!STEP_IDS.has(id) || !isRecord(scene)) continue;
        scenes[id] = {
          season: typeof scene.season === 'number' && Number.isInteger(scene.season) ? Math.max(0, Math.min(3, scene.season)) : 1,
          layer: typeof scene.layer === 'string' && LAYER_IDS.has(scene.layer) ? scene.layer : 'terrain',
          progress: typeof scene.progress === 'number' && Number.isFinite(scene.progress) ? Math.max(0, Math.min(1, scene.progress)) : .55,
          selected: typeof scene.selected === 'string' && SELECTION_IDS.has(scene.selected) ? scene.selected : '',
          cutaway: scene.cutaway === true,
          ...(typeof scene.readingFraction==='number'&&Number.isFinite(scene.readingFraction)?{readingFraction:Math.max(0,Math.min(1,scene.readingFraction))}:{}),
          ...(scene.airMoisture === 'higher' || scene.airMoisture === 'lower' ? {airMoisture: scene.airMoisture} : {}),
          ...(typeof scene.compareRegion === 'string' && REGION_IDS.includes(scene.compareRegion) ? {compareRegion: scene.compareRegion} : {}),
          ...(scene.livingSetting==='valley'||scene.livingSetting==='upland'?{livingSetting:scene.livingSetting}:{}),
          ...(scene.communitySupport==='individual'||scene.communitySupport==='shared'?{communitySupport:scene.communitySupport}:{}),
        };
        // Older K4 saves used the courtyard repair model. Keep the user's stage,
        // while discarding a target that no longer exists in this question.
        if(id==='K4'){
          scenes[id].layer=scenes[id].layer==='opera-stage'?'opera-stage':'life';
          if(!['opera-space','opera-performance','opera-learning'].includes(scenes[id].selected))scenes[id].selected='';
        }
      }
    }
    const completed = knownStrings(value.completed, STEP_IDS);
    const visited = [...new Set([...knownStrings(value.visited, STEP_IDS), ...completed])];
    return {
      ...fallback,
      lastStep: typeof value.lastStep === 'string' && STEP_IDS.has(value.lastStep) ? value.lastStep : fallback.lastStep,
      visited,
      completed,
      bookmarks: knownStrings(value.bookmarks, STEP_IDS),
      route: knownStrings(value.route, ROUTE_IDS),
      scenes,
      note: typeof value.note === 'string' ? value.note.slice(0, 10000) : '',
      travelDate: validTravelDate(value.travelDate),
      transport: typeof value.transport === 'string' && TRANSPORTS.has(value.transport) ? value.transport : '',
      stopNotes:isRecord(value.stopNotes)?Object.fromEntries(Object.entries(value.stopNotes).filter(([id,note])=>ROUTE_IDS.has(id)&&typeof note==='string').map(([id,note])=>[id,(note as string).slice(0,1500)])):{},
      ...(value.accessVerifications?{accessVerifications:sanitizeTravelAccessBook(value.accessVerifications)}:{}),
      stopOrigins:isRecord(value.stopOrigins)?Object.fromEntries(Object.entries(value.stopOrigins).flatMap(([id,origin])=>{const hash=cityTravelOrigin(origin);return ROUTE_IDS.has(id)&&hash?[[id,hash]]:[]})):{},
    };
  } catch { return fallback; }
}

export function readExploration(): Exploration {
  try { return parseExploration(localStorage.getItem(STORAGE_KEY)); }
  catch { return emptyExploration(); }
}

export function writeExploration(data: Exploration): boolean {
  try {
    if (!data || data.version !== 1) return false;
    const normalized = parseExploration(JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch { return false; }
}

export function parseRoute(hash: string): { home: boolean; chapter: string; step: string } {
  const home = { home: true, chapter: 'position', step: 'G1' };
  const parts = hash.replace(/^#?\/?/, '').split('?')[0].split('/');
  if (parts[0] !== 'learn') return home;
  const chapter = Object.hasOwn(CHAPTER_STEPS, parts[1]) ? parts[1] : 'position';
  const prefix = CHAPTER_STEPS[chapter];
  const step = typeof parts[2] === 'string' && STEP_IDS.has(parts[2]) && parts[2].startsWith(prefix) ? parts[2] : `${prefix}1`;
  return { home: false, chapter, step };
}
