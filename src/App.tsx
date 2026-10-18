import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,ArrowCounterClockwise,ArrowsOutSimple,BookmarkSimple,BookOpenText,Check,Compass,DiamondsFour,GlobeHemisphereEast,Info,List,MapPin,Mountains,NotePencil,Pause,Play,SpeakerHigh,SpeakerSlash,X} from '@phosphor-icons/react';
import TibetScene from './scene/TibetScene';
import type {EntryAction} from './lib/entryAction';
import NarrationAlignmentNotice,{narrationAlignmentUnavailable} from './components/NarrationAlignmentNotice';
import {chapters,regions,historyPeriods,cultureTopics,travelStops,type Chapter,type Step} from './data/curriculum';
import {settingsForStep,resolveHistoryPeriodIndex,resolveCultureTopicIndex,parseRoute,readExploration,writeExploration,type SceneSettings} from './lib/store';
import {dayForSeason,solarAtLatitude} from './lib/science';
import {useJourneyDirector} from './hooks/useJourneyDirector';
import {getJourneyStep,journeySegments,chapterSummaries,type JourneyInteraction} from './data/journey';
import JourneyOverview,{journeyStops} from './components/JourneyOverview';
import TopicOutline from './components/TopicOutline';
import {earthOrientationLayers,orientationLayer,orientationObjects,geographicHierarchy} from './data/orientation';
import {atlasThemes,getAtlasTheme} from './data/atlas';
import {atlasHash,atlasLocationForStep,cityAtlasLocation,parseAtlasLocation,detailHash,detailOrigin,settingsFromAtlas,type AtlasLocation} from './lib/spatialJourney';
import {saveCityComparisonEntry} from './hooks/useCityComparisonDirector';
import ReferenceHome from './components/ReferenceHome';
import DetailSpatialContext from './components/DetailSpatialContext';
import EarthEnvironmentPrimer from './components/EarthEnvironmentPrimer';
import EarthFoundationReading from './components/EarthFoundationReading';
import TerrainContrast from './components/TerrainContrast';
import PlateauClimateReading from './components/PlateauClimateReading';
import {plateauClimateState} from './lib/plateauClimateState';
import {foundationIndex,foundationFeedback} from './lib/earthFoundationState';
import ClimateEvidence from './components/ClimateEvidence';
import NarrationGuide from './components/NarrationGuide';
import NarrationCaption from './components/NarrationCaption';
import ElevationReading from './components/ElevationReading';
import WaterProcessReading from './components/WaterProcessReading';
import HumanHistoryEvidence from './components/HumanHistoryEvidence';
import JourneyPlan from './components/JourneyPlan';
import ContemporaryCaseStudy from './components/ContemporaryCaseStudy';
import SpatialArrival from './components/SpatialArrival';
import PalaceStudyContext from './components/PalaceStudyContext';
import {spatialPresentationFor} from './data/spatialPresentation';
import {visualGuideForCue} from './data/visualGuidance';
import {guidedJourneyHash,isGuidedJourney,mainlineConnection} from './lib/guidedJourney';
import {isTopicJourney,isMainlineRoute,topicJourneyHash,captureExplorationOrigin,explorationReturnHash,topicNavigation,completionActionLabel,homeThemeDestination,recognitionEntrySettings,cityTopicOrigin,type ExplorationOrigin,type TopicGroup} from './lib/topicJourney';
import {learningStepIds,learningChapterNumber} from './data/learningOrder';
import SceneExplanation from './components/SceneExplanation';
import RegionComparison from './components/RegionComparison';
import RecognitionRoute from './components/RecognitionRoute';
import type {RecognitionNavigation} from './lib/recognitionRoute';
import {cityAccessCityRange} from './lib/cityAccessState';
import {regionPair} from './data/regionalStudy';
import {sceneUnderstanding,openingConnections,climateConnections,focusedSceneLayers} from './data/sceneUnderstanding';
import './app.css';
import './journey.css';
import './atlas.css';
import './guidance.css';
import './human-story.css';
import './contemporary-story.css';
import './scene-detail.css';
import './reference-experience.css';

// The scene shell keeps text/navigation available while WebGL loads. Atlas
// controls and drawers also download on first use.
const StoryAtlasExperience=lazy(()=>import('./components/StoryAtlasExperience'));
const OverviewExperience=lazy(()=>import('./components/OverviewExperience'));
const DrawerContent=lazy(()=>import('./components/DrawerContent'));
const ReferenceLibrary=lazy(()=>import('./components/ReferenceLibrary'));

type Drawer='models'|'start'|'contents'|'detail'|'sources'|'explore'|'saved'|'travel'|'complete'|null;
const seasons=['春分','夏至','秋分','冬至'];
const contemporaryLocations:Record<string,string>={R1:'雅鲁藏布江案例 · 汇流原理',R2:'阿底峡与托林 · 通行条件',R3:'色东普案例 · 观测与响应',M1:'青藏铁路案例 · 工程原理',M2:'彩门村与Pala材料 · 使用条件',M3:'拉萨遗产材料 · 保护与使用',T1:'真实候选地 · 问题与材料',T2:'候选顺序 · 完整到达链',T3:'我的计划 · 出处与条件'};
const laterConnections=[{id:'H4',label:'制度与地方'},{id:'R1',label:'上下游联系'},{id:'R2',label:'通道与交流'},{id:'M1',label:'工程与到达'},{id:'M3',label:'发展与保护'},{id:'T1',label:'带着问题旅行'}];
const humanConnections=[{id:'E3',label:'环境与选择'},{id:'P2',label:'地表过程'},{id:'P3',label:'生活与记忆'},{id:'K1',label:'建造与使用'},{id:'K2',label:'交流与学习'},{id:'H1',label:'历史证据'}];
const allSteps=chapters.flatMap(ch=>ch.steps.map(step=>({chapter:ch,step}))).sort((a,b)=>learningStepIds.indexOf(a.step.id)-learningStepIds.indexOf(b.step.id));
const sceneNames:Record<string,string>={earth:'地球 · 亚洲 · 中国 · 西藏',tectonics:'亚洲 · 地壳剖面',sun:'地球 · 阳光与季节',atmosphere:'高原 · 空气与能量',rain:'山地 · 迎风坡与河谷',climate:'高原 · 季节与能量变化',region:'西藏 · 地区环境',landscape:'地区 · 山川景观',history:'拉萨河谷 · 历史材料',culture:'地方 · 建筑与生活',connections:'高原 · 周边联系',modern:'地方 · 今天的变化',travel:'西藏 · 我的探索路线'};
const sceneLayers:Record<string,{id:string,label:string}[]>={earth:[{id:'latitude',label:'纬线'},{id:'zones',label:'五带'},{id:'terrain',label:'地表'}],sun:[{id:'solar',label:'太阳照射'},{id:'latitude',label:'纬度参照'}],atmosphere:[{id:'wind',label:'气流'},{id:'water',label:'水汽'},{id:'energy',label:'能量收支'},{id:'temperature',label:'高度'}],rain:[{id:'wind',label:'气流'},{id:'rain',label:'云雨'},{id:'water',label:'水循环'}],region:[{id:'water',label:'水系'},{id:'terrain',label:'地形'},{id:'settlements',label:'生活条件'}],landscape:[{id:'terrain',label:'地貌'},{id:'water',label:'水系'},{id:'settlements',label:'生活'},{id:'glacier',label:'冰川'}],climate:[{id:'glacier',label:'冰川范围'},{id:'snow',label:'积雪'},{id:'temperature',label:'热量背景'}],connections:[{id:'water',label:'流域联系'},{id:'routes',label:'通道联系'},{id:'transport',label:'交通'},{id:'culture',label:'文化交流'}],modern:[{id:'transport',label:'现代交通'},{id:'settlements',label:'公共服务'},{id:'ecology',label:'生态与保护'}]};
const unique=<T,>(values:T[])=>[...new Set(values)];
const readSceneOrigins=():Record<string,string>=>{try{const raw=JSON.parse(localStorage.getItem('tibet-explorer.scene-origins.v1')||'{}');return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}catch{return {};}};
function IconButton({label,children,onClick,active=false}:{label:string,children:ReactNode,onClick:()=>void,active?:boolean}){return <button type="button" className={'icon-button'+(active?' active':'')} title={label} aria-label={label} onClick={onClick}>{children}</button>}

export default function App({initialAction,initialOverviewReturn=false}:{initialAction?:EntryAction;initialOverviewReturn?:boolean}={}){
 const [locationHash,setLocationHash]=useState(()=>location.hash);
 const route=parseRoute(locationHash),atlasLocation=parseAtlasLocation(locationHash),topicMode=isTopicJourney(locationHash),mainline=isMainlineRoute(locationHash),overviewRoute=/^#?\/?overview(?:\?|$)/.test(locationHash);
 const [overviewReturn,setOverviewReturn]=useState(initialOverviewReturn);
 const [saved,setSaved]=useState(readExploration);
 const latestSaved=useRef(saved);latestSaved.current=saved;
 const [initialSceneOrigins]=useState(readSceneOrigins);
 const sceneOrigins=useRef(initialSceneOrigins);
 const lastVisit=useRef<string>('');
 useEffect(()=>{try{lastVisit.current=localStorage.getItem('tibet-explorer.last-visit.v1')||'';}catch{/* Local playback does not require storage. */}},[]);
 useEffect(()=>{if(overviewRoute||!route.home||atlasLocation){lastVisit.current=overviewRoute?'/overview':locationHash;try{localStorage.setItem('tibet-explorer.last-visit.v1',lastVisit.current);}catch{/* Keep the active route in memory. */}}},[locationHash,route.home,!!atlasLocation,overviewRoute]);
 const [drawer,setDrawer]=useState<Drawer>(null);
 const [libraryGroup,setLibraryGroup]=useState<'nature'|'history'|'connections'|'travel'>('nature');
 const [voice,setVoice]=useState(true),[readyFor,setReadyFor]=useState('');
 const seenArrivals=useRef(new Set<string>());
 const [,refreshArrivals]=useState(0);
 const [autoContinue,setAutoContinue]=useState(true);
 const [stopForObservation,setStopForObservation]=useState(false);
 const [guideRequest,setGuideRequest]=useState<{stepId:string,serial:number}|null>(null);
 const pauseRef=useRef<(observed?:boolean)=>void>(()=>{});
 const guideSerial=useRef(0);
 const cueIndexRef=useRef(0);
 const observationWaitingRef=useRef(false);
 const [exploreOrigin,setExploreOrigin]=useState<ExplorationOrigin|null>(null);
 const [returnCue,setReturnCue]=useState<{stepId:string,cueIndex:number,waiting:boolean,resetView?:boolean}|null>(null);
 const interactionRef=useRef<(kind:JourneyInteraction['kind'],settings:SceneSettings)=>void>(()=>{});
 const [sceneError,setSceneError]=useState(''),[sceneKey,setSceneKey]=useState(0),[resetKey,setResetKey]=useState(0);
 const [guideInterrupted,setGuideInterrupted]=useState(false);
 const [sceneControlsOpen,setSceneControlsOpen]=useState(false);
 const [toast,setToast]=useState(''),[picked,setPicked]=useState(''),[storageOk,setStorageOk]=useState(true);
 const narrativeRef=useRef<HTMLDivElement>(null);
 const dialogRef=useRef<HTMLDialogElement>(null),lastFocus=useRef<HTMLElement|null>(null);
 const current=allSteps.find(v=>v.chapter.id===route.chapter&&v.step.id===route.step)||allSteps.find(v=>v.chapter.id===route.chapter)||allSteps[0];
 const {chapter,step}=current;
 useEffect(()=>setSceneControlsOpen(false),[step.id]);
 const isFoundation=step.id==='G1',isPlateauClimate=step.id==='C4';
 const currentSceneKey=route.home?'home':`${step.id}:${sceneKey}`;
 const viewReady=readyFor===currentSceneKey;
 const showArrival=!route.home&&!atlasLocation&&!!spatialPresentationFor(step.id)&&!seenArrivals.current.has(step.id);
 const finishArrival=()=>{seenArrivals.current.add(step.id);refreshArrivals(value=>value+1);};
 useEffect(()=>{narrativeRef.current?.scrollTo({top:0});window.scrollTo({top:0});},[step.id,route.home,!!atlasLocation]);
 const currentIndex=allSteps.findIndex(v=>v.step.id===step.id),stepIndex=chapter.steps.findIndex(s=>s.id===step.id);
 const topicRoute=topicNavigation(chapter,step.id);
 const storedSettings=saved.scenes[step.id]||settingsForStep(step);
 const focusedLayers=focusedSceneLayers[step.id];
 const isLiving=['E3','P3'].includes(step.id),isCloud=['C5','C6'].includes(step.id),isRegional=['E1','E2'].includes(step.id),isEvidence=step.id==='C9';
 const isHumanStory=['E3','P1','P2','P3','K1','K2','K3','K4','H1','H2','H3','H4'].includes(step.id);
 const isContemporary=['R1','R2','R3','M1','M2','M3','T1','T2','T3'].includes(step.id);
 const contextConnections=isContemporary?laterConnections:isHumanStory?humanConnections:openingConnections.some(item=>item.id===step.id)?openingConnections.filter(item=>!['C1','C2'].includes(item.id)):['climate','regions'].includes(chapter.id)?climateConnections:[];
 const orientationLayers=earthOrientationLayers[step.id];
 const availableLayers=orientationLayers||focusedLayers;
 const settings=availableLayers&&!availableLayers.some(item=>item.id===storedSettings.layer)?(isFoundation||isPlateauClimate?settingsForStep(step):{...storedSettings,layer:availableLayers[0].id}):storedSettings;
 const preferredEvidenceId=step.id==='H4'?({'event-1951':'agreement-beijing-1951','event-1959':'institutional-change-1959','event-1965':'autonomous-region-1965'} as Record<string,string>)[settings.layer]:step.id==='H3'?(settings.layer==='event-823'?'stele-inscription-823':settings.layer==='object'?'rubbing-as-mediated-record':'alliance-event-821-822'):step.id==='H1'&&settings.layer==='settlement'?'northeast-agropastoral-settlement':step.id==='K4'?(settings.progress<.32?'tibetan-opera-practice':'opera-transmission-and-care'):step.id==='K3'?'wooden-manuscript-cover':step.id==='K1'?'potala-phases-and-use':undefined;
 const routeRegionIds=saved.route.flatMap(id=>{const stop=travelStops.find(stop=>stop.id===id);return stop?[stop.region]:[]});
 const earthContext=orientationLayer(step.id,settings.layer);
 const understanding=sceneUnderstanding(step.id,settings,picked,routeRegionIds);
  const resume=allSteps.find(v=>v.step.id===saved.lastStep)||allSteps[0];
 const pause=useCallback(()=>pauseRef.current(false),[]);
 const manualPause=useCallback(()=>interactionRef.current('view',latestSaved.current.scenes[step.id]||settingsForStep(step)),[step.id]);
 const navigate=useCallback((ch:Chapter,st:Step,guided=false,detail=false,origin?:AtlasLocation,followMainline=guided||(!detail&&isGuidedJourney(location.hash)))=>{pauseRef.current(false);setPicked('');setDrawer(null);const atlas=atlasLocationForStep(st.id);setGuideRequest(guided&&(!atlas||detail||followMainline)?{stepId:st.id,serial:++guideSerial.current}:null);location.hash=followMainline?guidedJourneyHash(ch.id,st.id,origin):atlas&&!detail?atlasHash({...atlas,view:'topics'}):detail?detailHash(ch.id,st.id,origin):`/learn/${ch.id}/${st.id}`;},[]);
 const restoreExploration=(origin:ExplorationOrigin)=>{const target=allSteps.find(item=>item.step.id===origin.stepId);if(!target)return;pause();setPicked('');setDrawer(null);setGuideRequest(null);setExploreOrigin(null);setReturnCue(origin);location.hash=explorationReturnHash(target.chapter.id,origin);};
 const goAtlas=(value:AtlasLocation)=>{if((mainline||topicMode)&&!route.home&&!atlasLocation){const origin=captureExplorationOrigin(locationHash,step.id,cueIndexRef.current,observationWaitingRef.current);setExploreOrigin(previous=>previous||origin);}pause();setDrawer(null);setGuideRequest(null);location.hash=atlasHash(value);};
 const openDetail=(id:string,origin:AtlasLocation)=>{const target=allSteps.find(item=>item.step.id===id);if(!target)return;if(exploreOrigin?.stepId===id&&(exploreOrigin.mainline||exploreOrigin.topicMode)){restoreExploration(exploreOrigin);return;}const next=settingsFromAtlas(target.step,latestSaved.current.scenes[id]||settingsForStep(target.step),origin,sceneOrigins.current[id]);setSaved(previous=>({...previous,scenes:{...previous.scenes,[id]:next}}));sceneOrigins.current[id]=origin.hotspotId;try{localStorage.setItem('tibet-explorer.scene-origins.v1',JSON.stringify(sceneOrigins.current));}catch{/* The scene and return route also work without persistence. */}navigate(target.chapter,target.step,false,true,origin);};
 const goToGuided=(id:string)=>{const target=allSteps.find(v=>v.step.id===id);if(target)navigate(target.chapter,target.step,true);};
 const goTo=(id:string)=>{const target=allSteps.find(v=>v.step.id===id);if(target)navigate(target.chapter,target.step);};
 const goRelated=useCallback((id:string,patch?:Partial<SceneSettings>)=>{const target=allSteps.find(item=>item.step.id===id);if(!target)return;const origin=captureExplorationOrigin(location.hash,step.id,cueIndexRef.current,observationWaitingRef.current);setExploreOrigin(previous=>previous||origin);if(patch)setSaved(previous=>({...previous,scenes:{...previous.scenes,[id]:{...settingsForStep(target.step),...previous.scenes[id],...patch}}}));navigate(target.chapter,target.step,false,false,undefined,false);},[step.id,navigate]);
 const updateSettings=useCallback((patch:Partial<SceneSettings>)=>{setGuideInterrupted(true);const next={...(latestSaved.current.scenes[step.id]||settingsForStep(step)),...patch};const kind:JourneyInteraction['kind']=patch.airMoisture!==undefined||patch.livingSetting!==undefined||patch.communitySupport!==undefined?'condition':patch.season!==undefined?'season':patch.layer!==undefined?'layer':patch.progress!==undefined||patch.readingFraction!==undefined?'progress':patch.cutaway!==undefined?'cutaway':patch.selected!==undefined&&patch.selected!==''?'selection':patch.compareRegion!==undefined?'comparison':patch.selected!==undefined?'selection':'view';interactionRef.current(kind,next);setSaved(prev=>({...prev,scenes:{...prev.scenes,[step.id]:{...(prev.scenes[step.id]||settingsForStep(step)),...patch}}}));},[step.id,step.layer,step.selected,manualPause]);
 const selectObject=useCallback((id:string)=>{setGuideInterrupted(true);pause();if(id.startsWith('layer:')&&step.scene==='earth'){setPicked('');updateSettings({layer:id.slice(6),selected:'lhasa'});return;}setPicked(id);if(['E1','E2'].includes(step.id)){const [primary,comparison]=regionPair(latestSaved.current.scenes[step.id]||settingsForStep(step));updateSettings({selected:id,compareRegion:id===comparison?primary:comparison});return;}if(step.id==='H2'){const index=historyPeriods.findIndex(period=>period.id===id);if(index>=0){setPicked('');updateSettings({selected:id,progress:index/(historyPeriods.length-1)});return;}}if(step.id==='H4'&&/^event-(1951|1959|1965)$/.test(id)){setPicked('');updateSettings({layer:id});return;}if(step.scene!=='history'){const reveal:Record<string,number>={'opera-learning':.52,'palace-white':.5,'palace-red':.5,'palace-history':1,'local-town':.5,'local-window':.5,'local-profile':.86,'local-slope':.86,'local-valley':.86,'development-staff':.52,'development-lastmile':1,'development-ecology':.52,'development-community':1,'connection-rain':.18,'connection-runoff':.4,'connection-tributary':.52,'connection-confluence':.85,'connection-downstream':step.id==='R3'?.52:.85,'connection-use':1,'connection-corridor':.52,'connection-carrier':.52,'connection-transfer':1,'connection-organization':1,'connection-ecology':.52,'connection-obstruction':1,'connection-observation':1,'connection-records':1,'rail-ice':.52,'rail-rock':.52,'rail-air':.52,'rail-operation':1,'rail-lastmile':1,'travel-water':.5,'travel-heritage':1,'travel-question':1,'travel-transfer':.5,'travel-lastmile':1,'travel-conditions':.5,'travel-record':1};const current=latestSaved.current.scenes[step.id]||settingsForStep(step);updateSettings({selected:id,...(id==='local-overview'?{progress:.12}:{}),...(reveal[id]!==undefined?{progress:id==='rail-air'?.52:Math.max(current.progress,reveal[id])}:{})});}},[updateSettings,step.id,step.scene,pause]);
 const openTopicStep=(id:string,run=false)=>{const target=allSteps.find(item=>item.step.id===id);if(!target)return;if(id==='C4'&&step.id==='G4'){setSaved(previous=>({...previous,scenes:{...previous.scenes,C4:settingsForStep(target.step)}}));if(!run)setReturnCue({stepId:'C4',cueIndex:0,waiting:false,resetView:true});}pause();setPicked('');setDrawer(null);setExploreOrigin(null);setGuideRequest(run?{stepId:id,serial:++guideSerial.current}:null);location.hash=topicJourneyHash(target.chapter.id,id);};
 const openLibrary=(group:'nature'|'history'|'connections'|'travel'='nature')=>{pause();setLibraryGroup(group);setDrawer('contents');};
 const openHomeTheme=(group:TopicGroup)=>{const target=homeThemeDestination(group);if(target.kind==='topic')openTopicStep(target.stepId);else{
  saveCityComparisonEntry(target.comparisonStage);
  goAtlas(target.location);
 }};
 const markAndNext=(guided=false)=>{
  const origin=detailOrigin(locationHash,step.id);
  const enterLocation=step.id==='G1'&&(topicMode||mainline||!origin);
  setSaved(prev=>({...prev,completed:unique([...prev.completed,step.id]),...(enterLocation?{scenes:{...prev.scenes,G2:settingsForStep(allSteps.find(item=>item.step.id==='G2')!.step)}}:{})}));
  if(enterLocation&&!guided)setReturnCue({stepId:'G2',cueIndex:0,waiting:false,resetView:true});
  // A city detour returns to that exact city/comparison before resuming its parent question.
  if(origin?.view==='cities'&&!mainline&&!topicMode){goAtlas(origin);return;}
  if(isPlateauClimate){saveCityComparisonEntry('climate');goAtlas(cityAtlasLocation(['nyingchi','lhasa','ngari'].includes(settings.selected)?settings.selected:'nyingchi','environment'));return;}
  if(topicRoute.recognition&&topicRoute.next){
   const next=allSteps.find(item=>item.step.id===topicRoute.next!.id)!;
   const initial=recognitionEntrySettings(next.step.id);
   if(initial)setSaved(previous=>({...previous,scenes:{...previous.scenes,[next.step.id]:initial}}));
   if(!guided)setReturnCue({stepId:next.step.id,cueIndex:0,waiting:false,resetView:true});
   if(mainline){
    if(step.id==='G4'){
     setSaved(previous=>({...previous,scenes:{...previous.scenes,C4:settingsForStep(next.step)}}));
     if(!guided)setReturnCue({stepId:'C4',cueIndex:0,waiting:false,resetView:true});
    }
    navigate(next.chapter,next.step,guided,false,undefined,true);
   }
   else openTopicStep(next.step.id,guided);
   return;
  }
  if(topicMode){if(topicRoute.next)openTopicStep(topicRoute.next.id,guided);else openLibrary(topicRoute.group);return;}
  if(origin&&!mainline){goAtlas(origin);return;}
  if(currentIndex===allSteps.length-1){pause();setDrawer('complete');}
  else {const next=allSteps[currentIndex+1];navigate(next.chapter,next.step,guided,false,undefined,mainline);}
 };
 const previous=()=>{
  const origin=detailOrigin(locationHash,step.id);
  if(origin?.view==='cities'&&!mainline&&!topicMode){goAtlas(origin);return;}
  if(topicRoute.recognition||topicMode){
   if(topicRoute.previous){
    const previous=allSteps.find(item=>item.step.id===topicRoute.previous!.id)!;
    if(mainline)navigate(previous.chapter,previous.step,false,false,undefined,true);
    else openTopicStep(previous.step.id);
   }else if(mainline)location.hash='/';else openLibrary(topicRoute.group);
   return;
  }
  if(currentIndex>0){const prev=allSteps[currentIndex-1];navigate(prev.chapter,prev.step);}else location.hash='/';
 };
 const bookmark=()=>{interactionRef.current('record',settings);const exists=saved.bookmarks.includes(step.id);setSaved(prev=>({...prev,bookmarks:exists?prev.bookmarks.filter(id=>id!==step.id):[...prev.bookmarks,step.id]}));setToast(exists?'已取消收藏':'已收藏这个问题，可在“我的探索”继续');};
 const open=useCallback((value:Drawer)=>{pause();if(value==='explore'&&!route.home){const origin=captureExplorationOrigin(locationHash,step.id,cueIndexRef.current,observationWaitingRef.current);setExploreOrigin(previous=>previous||origin);}setDrawer(value);},[pause,route.home,step.id,locationHash]);
 useEffect(()=>{const handle=()=>{setLocationHash(location.hash);setDrawer(null);pauseRef.current(false)};addEventListener('hashchange',handle);return()=>removeEventListener('hashchange',handle);},[]);
 useEffect(()=>{if(!route.home&&!atlasLocation)setSaved(prev=>({...prev,lastStep:step.id,visited:unique([...prev.visited,step.id])}));setPicked('');},[route.home,step.id,!!atlasLocation]);
 useEffect(()=>{const t=setTimeout(()=>setStorageOk(writeExploration(saved)),250);return()=>clearTimeout(t);},[saved]);
 useEffect(()=>{const flush=()=>writeExploration(latestSaved.current);const visibility=()=>{if(document.visibilityState==='hidden')flush()};addEventListener('pagehide',flush);document.addEventListener('visibilitychange',visibility);return()=>{removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility);flush()};},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3300);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>{const dialog=dialogRef.current;if(drawer){lastFocus.current=document.activeElement as HTMLElement;dialog?.showModal();pauseRef.current(false)}else {dialog?.close();lastFocus.current?.focus()}},[drawer]);
 const applyDirectedSettings=useCallback((patch:Partial<SceneSettings>)=>{if(patch.layer&&patch.layer!==(latestSaved.current.scenes[step.id]||settingsForStep(step)).layer)setPicked('');setSaved(prev=>({...prev,scenes:{...prev.scenes,[step.id]:{...(prev.scenes[step.id]||settingsForStep(step)),...patch}}}));},[step.id]);
 const director=useJourneyDirector({stepId:step.id,home:route.home||!!atlasLocation,blocked:showArrival||!viewReady,voice,autoContinue,stopForObservation,request:guideRequest,apply:applyDirectedSettings,finish:follow=>{if(follow)markAndNext(true);else setSaved(prev=>({...prev,completed:unique([...prev.completed,step.id])}));}});
 pauseRef.current=director.pause;
 interactionRef.current=director.noteInteraction;
 cueIndexRef.current=director.cueIndex;
 observationWaitingRef.current=director.waiting;
 useEffect(()=>{if(returnCue&&returnCue.stepId===step.id&&!route.home){director.restore(returnCue.cueIndex,returnCue.waiting);if(returnCue.resetView)setResetKey(value=>value+1);setReturnCue(null);}},[returnCue,step.id,route.home]);
 const recordSignature=JSON.stringify([saved.note,saved.stopNotes,saved.travelDate,saved.transport]);
 const savedArtifacts=useRef({note:recordSignature,route:saved.route.join('>')});
 useEffect(()=>{const previous=savedArtifacts.current;if(previous.note!==recordSignature)director.noteInteraction('record',settings);if(previous.route!==saved.route.join('>'))director.noteInteraction('route',settings);savedArtifacts.current={note:recordSignature,route:saved.route.join('>')};},[recordSignature,saved.route]);
 const playing=director.playing;
 const preparingNarration=director.mode==='running'&&(showArrival||!viewReady);
 const playbackActive=playing||preparingNarration;
 const visualGuide=visualGuideForCue(director.cue.id,director.progress,director.mode!=='idle'&&!guideInterrupted,director.narrationTiming);
 const connection=mainlineConnection(step.id);
 useEffect(()=>setGuideInterrupted(false),[director.cue.id,step.id]);
 const startNarration=()=>{setGuideInterrupted(false);if(isPlateauClimate&&['arrival','uplift','cloud','regions','life'].indexOf(settings.layer)!==director.cueIndex)director.selectCue(['arrival','uplift','cloud','regions','life'].indexOf(settings.layer),true);else if(isFoundation&&foundationIndex(settings.layer)!==director.cueIndex)director.selectCue(foundationIndex(settings.layer),true);else if(guideInterrupted)director.replay();else director.start();};
 const replayNarration=()=>{setGuideInterrupted(false);director.replay();};
 const currentCaption=director.currentSentence;
 const journey=getJourneyStep(step.id);
 const segmentIndex=journeyStops.findIndex(s=>s.chapters.includes(chapter.id));
 const segment=journeyStops[Math.max(0,segmentIndex)];
 const previousStep=topicRoute.recognition?topicRoute.previous:allSteps[currentIndex-1]?.step;
 const isChapterEnd=stepIndex===chapter.steps.length-1;
 const solar=useMemo(()=>solarAtLatitude(29.65,dayForSeason(settings.season)),[settings.season]);
 const period=historyPeriods[resolveHistoryPeriodIndex(settings,step.id)];
 const culture=cultureTopics[resolveCultureTopicIndex(settings,step.id)];
 const selectedRegion=regions.find(r=>r.id===settings.selected)||regions.find(r=>r.id===picked);
 const processPhase=settings.progress<.33?0:settings.progress<.66?1:2;
 let feedback=step.observe;
 if(isFoundation)feedback=foundationFeedback(settings).text;
 if(isPlateauClimate)feedback=plateauClimateState(settings).explanation;
 else if(earthContext)feedback=(picked&&settings.selected===picked?orientationObjects[picked]?.explanation:undefined)||earthContext.explanation;
 else if(step.scene==='sun')feedback=`${seasons[settings.season]}，拉萨纬度约 29.65°N：正午太阳高度约 ${solar.noonAltitude.toFixed(1)}°，日长约 ${solar.dayLength.toFixed(1)} 小时。这是理想地平线的太阳几何计算，不代表当地气温。`;
 else if(step.scene==='rain')feedback=(settings.layer==='water'?'降水到达地面后，一部分沿坡面汇入河流，一部分入渗或暂存于积雪与冰川。蓝色流动用于观察汇流方向，不代表实际流量。':settings.layer==='wind'?'先单独观察空气怎样沿山地抬升和绕行。气流并不等于水汽：空气含水量、温度和稳定程度共同影响能否形成云雨。':['水汽随气流到达山地。先观察来向和迎风坡；水汽的多少还受来源与环流影响。','气流沿山坡抬升，空气膨胀冷却。在合适条件下水汽凝结成云。','云滴或冰晶继续增长，满足条件后降落。并非有云就一定下雨，背风侧也不必然无雨。'][processPhase])+(settings.season===3?' 当前冬季示意强调西风背景。':settings.season===1?' 当前夏季示意强调南侧暖湿输送。':' 当前为过渡季节，实际水汽来源因地区和天气而异。');
 else if(step.scene==='tectonics')feedback=['先识别两侧板块和原有地壳。','挤压使地壳缩短、变形和增厚；不同区域经历并不同步。','高原与山系经历多阶段形成。抬升和侵蚀共同作用，图中进度不是地质年表。'][processPhase];
 else if(step.id==='C9')feedback='地图只提供色林错研究区的空间参照。两期湖面面积来自已发表研究，没有生成或插值当年的湖岸形状。';
 else if(step.id==='H3')feedback=({'event-821':'821年，唐蕃双方在长安会盟。先认识参与者、当时的交往与约定，再阅读材料怎样记录。','event-822':'822年，在拉萨举行会盟。事件经过与后来保存的文字材料，需要分开核对。','event-823':'823年立碑。碑成为认识会盟的重要材料；文字、年代与保存背景需要一起阅读。',object:'可以环绕观察碑体与台座的结构示意。这里没有复刻原碑文字，碑文与拓本请由资料入口阅读。'} as Record<string,string>)[settings.layer]||step.observe;
 else if(step.scene==='history'&&period)feedback=period.summary;
 else if(step.scene==='culture'&&culture)feedback=culture.summary;
 else if(selectedRegion&&['region','landscape'].includes(step.scene))feedback=`${selectedRegion.name}：${selectedRegion.description}`;
 if(step.scene==='culture'&&picked)feedback=({courtyard:'从院落观察进入、停留与转向的空间关系。围合方式和房间安排同时受用途、技术、社会组织与历史调整影响。',materials:'观察墙体、立柱、梁和屋顶如何连接。材料的选择与取得方式、工艺知识和建筑用途有关；图中构造用于理解关系。',hall:'从厅堂与院落的关系继续认识使用方式。信仰与知识的传播，需要结合人物、文本、仪式与社区的具体历史。'} as Record<string,string>)[picked]||feedback;
 if(selectedRegion&&step.scene==='culture')feedback=`从${selectedRegion.name}进入：${selectedRegion.description}`;
 if(step.scene==='atmosphere')feedback=({energy:'金色表示进入的太阳能量，暖色表示地表向外的能量交换。地面温度取决于收支、热量储存和输送，不能只由纬度推算。',temperature:'沿同一山坡比较高度。高度改变气压和空气状态，坡向、云量及地表也会影响温度；冷暖颜色只表达定性差异。',wind:'青色线表示空气运动的概念路径。风向与强度受气压差、地球自转和地形共同影响，图中线条不代表实测风场。',water:'金色粒子表示空气携带的水汽，青色表示气流路径。风向和含水量需要分别判断；水汽来到山地之后还要满足冷却与凝结条件。'} as Record<string,string>)[settings.layer]||feedback;
 if(step.id==='C7')feedback=`同一地点的${seasons[settings.season]}示意：${['积雪消融与生长季开始的时间随高度而变。','太阳几何条件与环流共同影响当地热量和水分。','热量条件转变，植被与地表状态也逐渐改变。','部分地区积雪增多，生长活动和水的储存方式改变。'][settings.season]}这是季节循环，不能据此判断多年气候趋势。`;
 if(step.scene==='modern')feedback=({transport:'观察交通节点与连线。线路相连只是起点；班次、费用、末端接驳和服务条件决定实际可达性。',settlements:'将观察转到聚落与公共服务。理解学校、医疗和生活条件的变化，需要结合不同地方与人群的具体资料。',ecology:'隐藏交通关系，沿山地、水系与植被继续观察。发展与保护需要同时讨论收益、环境影响及地方生活，不能靠单个指标概括。'} as Record<string,string>)[settings.layer]||feedback;
 if(step.scene==='connections')feedback=({water:'沿水的去向认识上下游：水文与生态过程跨越行政范围，共同的流域也带来保护与协作问题。',ecology:'从高原水源走向下游，将水文过程、生态环境与地区协作放在一起认识。',routes:'通道把地方连接起来，也受山地与季节条件限制。图中表示交往关系，具体古道与现代道路需要各自的证据。',transport:'观察交通通道如何联系地区。相连的节点不等于实际通行条件；不同运输方式、年代和政策需要分别阅读。',culture:'把视线放到人员、文本、技术和艺术的交流。文化传播包含翻译、选择与再创造，不能只用一条路线解释。'} as Record<string,string>)[settings.layer]||feedback;
 if(understanding)feedback=understanding.explanation;
 const selectedName=understanding?.objects.find(object=>object.id===picked)?.name||(step.scene==='earth'?orientationObjects[picked]?.name:undefined)||(!understanding?selectedRegion?.name:undefined)||({'tibet':'西藏 · 拉萨定位点','courtyard':'院落空间','materials':'材料与结构','hall':'建筑内部','stele':'碑刻观察'} as Record<string,string>)[picked];
 const showSeason=(!['G4','C2','C3','C5','C6','E1','E2','E3'].includes(step.id)&&['sun','atmosphere','rain','region'].includes(step.scene))||step.id==='C7',showProgress=!isEvidence&&((!!understanding&&understanding.hasProgress!==false)||(!understanding&&(['tectonics','rain'].includes(step.scene)||step.id==='C9'||(step.id==='G2'&&settings.layer==='moisture')))),showSection=(!!understanding&&understanding.allowsCutaway!==false)||(!understanding&&['tectonics','rain','landscape','culture'].includes(step.scene));
 const returnToOrigin=()=>{if(exploreOrigin)restoreExploration(exploreOrigin);};
 const navigateRecognition=(target:RecognitionNavigation)=>{
  if(target.kind==='return'&&exploreOrigin){returnToOrigin();return;}
  pause();setDrawer(null);setGuideRequest(null);setExploreOrigin(null);
  if(target.comparisonStage){const cityId=parseAtlasLocation(target.hash)?.cityId;saveCityComparisonEntry(target.comparisonStage,cityAccessCityRange(cityId==='lhasa'||cityId==='ngari'?cityId:'nyingchi').start);}
  if(target.kind==='introduction'){goToGuided(parseRoute(target.hash).step);return;}
  location.hash=target.hash;
 };
 const recognitionOrigin=exploreOrigin&&exploreOrigin.stepId!==step.id?allSteps.find(item=>item.step.id===exploreOrigin.stepId):undefined;
 const recognitionReturn=recognitionOrigin&&exploreOrigin?{hash:explorationReturnHash(recognitionOrigin.chapter.id,exploreOrigin),label:`回到原问题：${recognitionOrigin.step.title}`}:undefined;
 const drawerTitle={models:'原理与模型',start:'从一个问题，认识完整的西藏',contents:'专题导览',detail:step.title,sources:'资料与演示口径',explore:'从一个地方，开始探索',saved:'我的探索',travel:'把认识变成自己的路线',complete:'这一程结束，探索继续'};
 const spatialOrigin=detailOrigin(locationHash,step.id);
 const returnsToCity=spatialOrigin?.view==='cities'&&!mainline&&!topicMode;
 const completionLabel=returnsToCity?'返回城市与地区':step.id==='G4'?'继续：气流来到高原':isPlateauClimate?'同图对照林芝、拉萨与阿里':completionActionLabel(chapter,step.id,{topicMode,mainline,hasSpatialOrigin:!!spatialOrigin,lastQuestion:currentIndex===allSteps.length-1});
 const previousActionLabel=returnsToCity?'返回城市与地区':topicRoute.recognition&&topicRoute.previous?`上一步：${topicRoute.previous.title}`:'上一步';
 const openLibraryStep=(id:string)=>{if(overviewRoute)setOverviewReturn(true);const origin=cityTopicOrigin(id,atlasLocation||spatialOrigin);if(origin)openDetail(id,origin);else openTopicStep(id);};
 const playbackLabel=preparingNarration?'取消待播':playing?'暂停讲解':director.cue.role==='bridge'&&director.progress>=1?completionLabel:director.waiting?'继续认识':director.mode==='idle'?'开始讲解':'继续讲解';
 const drawerPanel=<dialog ref={dialogRef} className={'drawer '+(drawer==='contents'||drawer==='models'||drawer==='explore'?'wide':'')} onCancel={()=>setDrawer(null)} aria-labelledby="drawer-title"><div className="drawer-header"><div><p className="eyebrow">西藏探索</p><h2 id="drawer-title">{drawer?drawerTitle[drawer]:''}</h2></div><IconButton label="关闭面板，回到场景" onClick={()=>setDrawer(null)}><X size={23}/></IconButton></div><div className="drawer-body"><Suspense fallback={<p role="status">正在打开内容…</p>}>{drawer==='contents'||drawer==='models'?<ReferenceLibrary key={`${drawer}:${libraryGroup}`} mode={drawer==='models'?'models':'topics'} initialGroup={libraryGroup} completed={saved.completed} onOpen={openLibraryStep} onOverview={()=>{pauseRef.current(false);setDrawer(null);setOverviewReturn(false);location.hash='/overview';}}/>:drawer==='start'?<JourneyOverview completed={saved.completed} onStart={(id,withVoice)=>{setVoice(withVoice);goToGuided(id);}} onExplore={()=>open('explore')}/>:drawer&&<DrawerContent kind={drawer} chapter={chapter} step={step} settings={settings} saved={saved} setSaved={setSaved} navigate={navigate} open={open} notify={setToast} feedback={feedback}/>}</Suspense></div>{toast&&<div className="drawer-toast" role="status"><Check size={18}/>{toast}</div>}</dialog>;
 const entryConsumed=useRef(false);
 useEffect(()=>{
  if(entryConsumed.current||!initialAction)return;entryConsumed.current=true;
  if(initialAction.kind==='drawer')open(initialAction.value);
  else if(initialAction.kind==='theme')openHomeTheme(initialAction.value);
  else if(initialAction.kind==='city')goAtlas(cityAtlasLocation(initialAction.value));
  else if(initialAction.kind==='recognition')navigateRecognition(initialAction.value);
  else {const target=allSteps.find(item=>item.step.id===initialAction.value);if(target)navigate(target.chapter,target.step,false,true);}
 },[initialAction]);
 const overviewReturnControl=overviewReturn&&!overviewRoute&&(!route.home||atlasLocation)?<button className="overview-return-control" onClick={()=>{pauseRef.current(false);setOverviewReturn(false);location.hash='/overview';}}>← 回到完整演示</button>:null;
 if(overviewRoute)return <><Suspense fallback={<main className="app" aria-busy="true"><p role="status">正在准备完整认识主线…</p></main>}><OverviewExperience onHome={()=>{location.hash='/';}} onDetail={id=>{const target=allSteps.find(item=>item.step.id===id);if(target){setOverviewReturn(true);navigate(target.chapter,target.step,false,true);}}} onDirectory={()=>openLibrary()} onMap={()=>{setOverviewReturn(true);goAtlas(cityAtlasLocation('lhasa','environment',false));}}/></Suspense>{drawerPanel}</>;
 if(atlasLocation)return <>{overviewReturnControl}<Suspense fallback={<main className="app" aria-busy="true"><p role="status">正在展开地图…</p></main>}><StoryAtlasExperience location={atlasLocation} saved={saved} onSave={setSaved} onDetail={openDetail} onEarth={goTo} onDirectory={()=>openLibrary()} onModels={()=>open('models')} onSaved={()=>open('saved')} onTravel={()=>open('travel')} onReturn={exploreOrigin?returnToOrigin:undefined} returnTitle={allSteps.find(item=>item.step.id===exploreOrigin?.stepId)?.step.title}/></Suspense>{drawerPanel}{toast&&!drawer&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}</>;
 if(route.home)return <><ReferenceHome onRecognitionNavigate={navigateRecognition} onStartEarth={()=>{location.hash='/overview?start=1';}} onContinue={()=>{if(lastVisit.current)location.hash=lastVisit.current;else location.hash='/overview';}} hasResume={Boolean(saved.visited.length||lastVisit.current)} onCity={id=>goAtlas(cityAtlasLocation(id))} onTheme={openHomeTheme} onDirectory={()=>openLibrary()} onModels={()=>open('models')} onSaved={()=>open('saved')}/>{drawerPanel}</>;
 return <div className={'app '+(route.home?'is-home':'is-learning reference-study')+(isFoundation?' is-foundation':'')+(isPlateauClimate?' is-plateau-climate':'')+(earthContext&&!route.home?' is-orientation':'')+(understanding&&!route.home?' is-explanation':'')+(isCloud?' is-cloud':'')+(isRegional?' is-regional':'')+(isEvidence?' is-evidence':'')+(mainline?' is-mainline':'')+(['G4','P1'].includes(step.id)?' is-elevation':'')+(isLiving?' is-living':'')+(isContemporary?' is-contemporary':'')}>
  <header className="reference-topbar"><a href="#/" className="reference-home-link"><ArrowLeft size={13}/>首页</a><button className="reference-current-topic" onClick={()=>openLibrary()}>{chapter.shortTitle}<List size={12}/></button><nav aria-label="探索方式"><button onClick={()=>openLibrary()}>专题导览</button><button onClick={()=>goAtlas(spatialOrigin?.cityId?cityAtlasLocation(spatialOrigin.cityId,spatialOrigin.facet,spatialOrigin.compare):cityAtlasLocation())}>地图图鉴</button><button onClick={()=>open('models')}>原理模型</button></nav><button className="reference-saved" onClick={()=>open('saved')} aria-label="我的探索"><BookmarkSimple size={16}/></button></header>
  {overviewReturnControl}
  <main className="experience">
   <section className={'scene-area'+(sceneControlsOpen?' controls-open':'')} aria-label="可操作三维主场景">
    <div className="canvas-wrap"><TibetScene key={sceneKey} viewKey={route.home?'home':isEvidence?'climate-evidence':step.id} routeRegions={routeRegionIds} scene={route.home?'earth':isEvidence?'region':step.scene} step={stepIndex} season={route.home?1:settings.season} layer={route.home?'home':isEvidence?'atlas-environment':settings.layer} progress={route.home?0.55:settings.progress} playing={route.home?false:playing} guide={route.home?undefined:visualGuide} selected={route.home?'tibet':isEvidence?'siling-co-study':settings.selected} cutaway={!route.home&&settings.cutaway} readingFraction={settings.readingFraction} airMoisture={settings.airMoisture} compareRegion={settings.compareRegion} livingSetting={settings.livingSetting} communitySupport={settings.communitySupport} resetKey={resetKey} onSelect={isEvidence?()=>pause():selectObject} onInteract={manualPause} onReady={()=>setReadyFor(currentSceneKey)} onError={message=>{setSceneError(message);setReadyFor(currentSceneKey)}}/></div>
    {!viewReady&&!showArrival&&<div className="scene-loading"><GlobeHemisphereEast size={40}/><p>正在展开这片土地…</p></div>}
    {showArrival&&<SpatialArrival key={step.id} stepId={step.id} title={step.title} onComplete={finishArrival}/>}
    {sceneError&&<div className="scene-error"><Info size={28}/><h2>三维场景暂时无法打开</h2><p>{sceneError}</p><button className="gold-button" onClick={()=>{setSceneError('');setReadyFor('');setSceneKey(k=>k+1)}}>重新加载场景</button><button className="text-button" onClick={()=>open('detail')}>继续阅读本章</button></div>}
    {route.home?<>
     <div className="home-copy"><p className="eyebrow">地 球 上 的 西 藏 <span/></p><h1>从地球的位置，<br/>读懂西藏的来路</h1><p className="home-description">从亚洲、中国，找到西藏与周边。<br/>认识七市地的环境、历史与今天，再深入具体问题。</p><button className="gold-button start-button" onClick={()=>goToGuided('G1')}>从地球开始认识<ArrowRight size={25}/></button><div className="home-secondary"><button onClick={()=>goAtlas(cityAtlasLocation())}>认识城市与地区</button><span/><button onClick={()=>open('travel')}>规划旅行</button></div></div>
     <div className="home-scene-note"><Compass size={25}/><span>拖动旋转地球 · 滚轮缩放</span></div>
     <div className="home-path" aria-label="认识路线">{[{id:'G1',name:'地球与中国',icon:GlobeHemisphereEast},{id:'cities',name:'认识七市地',icon:MapPin},{id:'environment',name:'环境与生活',icon:Mountains},{id:'history',name:'历史与文化',icon:BookOpenText},{id:'today',name:'今天与周边',icon:Compass},{id:'travel',name:'带着理解旅行',icon:NotePencil}].map((item,i)=><div className="path-stop" key={item.id}><button onClick={()=>item.id==='G1'?goTo('G1'):item.id==='travel'?open('travel'):goAtlas(cityAtlasLocation('lhasa',item.id==='cities'?'position':item.id as 'environment'|'history'|'today'))}><span className="path-icon"><item.icon size={30} weight="duotone"/></span><span>{item.name}</span></button>{i<5&&<ArrowRight size={20} className="path-arrow"/>}</div>)}</div>
    </>:<>
     <div className="scene-breadcrumb"><button onClick={()=>spatialOrigin?goAtlas(spatialOrigin):goTo('G1')}>{spatialOrigin?'返回整体地图':'地球上的位置'}</button><span>/</span><span>{chapter.shortTitle}</span><span>/</span><strong>{step.title}</strong></div>
     <div className="scene-kind"><span className="status-dot"/>{step.kind}{!['earth','sun'].includes(step.scene)&&<span> · {isPlateauClimate?'真实高程与原理过程':isEvidence?'公开底图与高程':['G4','P1','E1','E2'].includes(step.id)?'公开高程地形':step.scene==='history'?'材料关系模型':isLiving?'生活条件对照':step.scene==='modern'?'条件模型 · 非实地复原':'三维示意'}</span>}</div>
     <div className="scene-location"><MapPin size={16}/>{contemporaryLocations[step.id]|| (step.id==='K4'?'藏戏资料 · 场地与学习':step.id==='K3'?'西藏木经板 · 载体与保存':step.id==='P1'?'林芝周边 · 真实高程 · 区域到局部':step.id==='K1'&&settings.layer!=='construction'?'拉萨 · 红山 · 布达拉宫特征':isEvidence?'藏北 · 色林错研究区参照':step.id==='G4'?'高原南侧 · 山系 · 内部':step.id==='C2'?'地表 · 大气 · 太空':step.id==='C3'?'山坡 · 空气团 · 环境高度':step.id==='C4'?'亚洲海陆 · 高原 · 来流':isCloud?'同一山体 · 空气 · 云雨':step.scene==='history'?'历史材料 · 时间与证据':sceneNames[step.scene])}</div>
     {exploreOrigin&&exploreOrigin.stepId!==step.id&&!earthContext&&!understanding&&<button className="return-to-mainline" onClick={returnToOrigin}><ArrowLeft size={13}/>回到原问题：{allSteps.find(item=>item.step.id===exploreOrigin.stepId)?.step.title}</button>}
     {!(isCloud||isLiving)&&<div className={'scene-readout'+(visualGuide?.active?' guided-readout':'')}>{visualGuide?.active?<><span className="guide-live-label">{playing?'跟随讲述 · 画面引导':'已暂停 · 标注保留'}</span><strong>{visualGuide.title}</strong></>:isEvidence?<><strong>色林错 · 研究区位置参照</strong><br/>1976年与2017年 · 湖面面积</>:earthContext?<><strong>{earthContext.title}</strong><br/>{earthContext.lookFor}</>:understanding?<strong>{step.id==='G4'?`南北剖面位置：约 ${(80+settings.progress*18).toFixed(1)}°E`:understanding.title}</strong>:<>观察尺度：{journey.scale}<br/>{journey.timeContext}</>}</div>}
     {(isCloud||isLiving)&&<WaterProcessReading compact stepId={step.id} settings={settings}/>}
     {isPlateauClimate&&<PlateauClimateReading compact guide={visualGuide} timing={director.narrationTiming} currentCaption={currentCaption} settings={settings} onChange={updateSettings} onStage={()=>{}} onCity={id=>goAtlas(cityAtlasLocation(id,'environment'))}/>} {isFoundation&&<EarthFoundationReading compact guide={visualGuide} currentCaption={currentCaption} timing={director.narrationTiming} settings={settings} onChange={updateSettings} onStage={()=>{}}/>}{['G4','P1'].includes(step.id)&&<ElevationReading compact stepId={step.id} settings={settings} guide={visualGuide} onChange={updateSettings}/>}
     {visualGuide?.active&&currentCaption&&!isFoundation&&!isPlateauClimate&&<div className="scene-caption" aria-live="off"><strong>{visualGuide.title}</strong><NarrationCaption text={currentCaption} timing={director.narrationTiming}/></div>}
     <button className="mobile-scene-controls" type="button" aria-expanded={sceneControlsOpen} aria-controls="scene-operation-controls" onClick={()=>{if(!sceneControlsOpen)pause();setSceneControlsOpen(value=>!value);}}>{sceneControlsOpen?'收起操作':'场景操作'}</button>
     <div className="scene-tools"><IconButton label="重置观察角度" onClick={()=>{pause();setResetKey(k=>k+1)}}><ArrowCounterClockwise size={19}/></IconButton><IconButton label="收藏当前问题" active={saved.bookmarks.includes(step.id)} onClick={bookmark}><BookmarkSimple size={19} weight={saved.bookmarks.includes(step.id)?'fill':'regular'}/></IconButton><IconButton label="全屏观察" onClick={()=>{const el=document.documentElement;if(document.fullscreenElement)void document.exitFullscreen();else if(el.requestFullscreen)void el.requestFullscreen().catch(()=>setToast('当前窗口不支持全屏，可扩大浏览器面板'));else setToast('当前窗口不支持全屏')}}><ArrowsOutSimple size={19}/></IconButton></div>
     {picked&&!earthContext&&<div className="picked-label"><MapPin size={16}/>{selectedName||'已选择场景对象'}<button aria-label="关闭对象提示" onClick={()=>setPicked('')}><X size={14}/></button></div>}
     <div className="scene-bottom" id="scene-operation-controls">
      {step.id==='M1'&&<div className="railway-conditions" aria-label="冻土工程季节条件"><span>同一剖面</span>{[{id:3,label:'冷季条件'},{id:1,label:'暖季条件'}].map(option=><button key={option.id} type="button" aria-pressed={settings.season===option.id} className={settings.season===option.id?'active':''} onClick={()=>{setPicked('');updateSettings({season:option.id});}}>{option.label}</button>)}<small>定性热交换 · 非地温实测</small></div>}
      {isLiving&&<div className="living-conditions" aria-label="环境与组织对照"><div><span>环境条件</span>{[{id:'valley' as const,label:'河谷设定'},{id:'upland' as const,label:'高地设定'}].map(option=><button type="button" key={option.id} className={(settings.livingSetting||'valley')===option.id?'active':''} aria-pressed={(settings.livingSetting||'valley')===option.id} onClick={()=>{setPicked('');updateSettings({livingSetting:option.id,selected:''})}}>{option.label}</button>)}</div><div><span>人的组织</span>{[{id:'individual' as const,label:'分别使用'},{id:'shared' as const,label:'共同组织'}].map(option=><button type="button" key={option.id} className={(settings.communitySupport||'individual')===option.id?'active':''} aria-pressed={(settings.communitySupport||'individual')===option.id} onClick={()=>{setPicked('');updateSettings({communitySupport:option.id,selected:''})}}>{option.label}</button>)}</div></div>}{isCloud&&<div className="condition-switch" aria-label="初始水汽条件"><span>同一山体 · 初始水汽</span>{[{id:'higher' as const,label:'较充足'},{id:'lower' as const,label:'较少'}].map(option=><button key={option.id} type="button" aria-pressed={(settings.airMoisture||'higher')===option.id} className={(settings.airMoisture||'higher')===option.id?'active':''} onClick={()=>{setPicked('');updateSettings({airMoisture:option.id,selected:''});}}>{option.label}</button>)}<small>定性情景</small></div>}
      {showProgress&&<div className="process-control"><label htmlFor="process">{understanding?.processLabel||(step.id==='G2'?'沿外部联系观察来向':step.scene==='climate'?'时期 A → 时期 B':step.scene==='tectonics'?'原理过程 · 挤压与增厚':'水汽输送 → 抬升冷却 → 云雨形成')}</label><input id="process" type="range" min="0" max="100" value={Math.round(settings.progress*100)} onChange={e=>updateSettings({progress:Number(e.target.value)/100})}/><span>{step.id==='G4'?`${(80+settings.progress*18).toFixed(1)}°E`:step.id==='P1'&&settings.progress>=.68?`${(93.86+Math.min(1,(settings.progress-.68)/.32)*1.02).toFixed(2)}°E`:understanding?step.scene==='modern'?understanding.title:`${Math.round(settings.progress*100)}% · 阶段示意`:step.id==='G2'?'联系示意':step.scene==='climate'?'比较示意':`${['起始条件','过程展开','观察结果'][processPhase]}`}</span></div>}
      {understanding&&understanding.stops.length>0&&<nav className="process-stops" aria-label="选择演示阶段">{understanding.stops.map(stop=><button key={stop.label} type="button" aria-pressed={Math.abs(settings.progress-stop.progress)<.12} className={Math.abs(settings.progress-stop.progress)<.12?'active':''} onClick={()=>{setPicked('');updateSettings({progress:stop.progress,selected:'',...(isCloud?{layer:stop.progress>=.82?'water':'rain',cutaway:stop.progress>=.82}:{})});}}>{stop.label}</button>)}</nav>}
      <div className="scene-control-row"><div className="layer-switch" aria-label="场景图层">{(isEvidence?[]:step.id==='C7'?[{id:'season',label:'同地四季'}]:step.id==='C8'?[{id:'forcing',label:'能量与反馈'}]:(focusedLayers||orientationLayers||sceneLayers[step.scene]||[])).map(l=><button key={l.id} aria-pressed={settings.layer===l.id||({weather:'rain',change:'glacier',elevation:'terrain',ecology:'water'} as Record<string,string>)[settings.layer]===l.id} className={settings.layer===l.id||({weather:'rain',change:'glacier',elevation:'terrain',ecology:'water'} as Record<string,string>)[settings.layer]===l.id?'active':''} onClick={()=>{if(isFoundation){setPicked('');setGuideInterrupted(false);director.selectCue(foundationIndex(l.id));return;}setPicked('');updateSettings({layer:l.id,...(orientationLayers?{selected:'lhasa'}:understanding?{selected:''}:{}),...(step.id==='G3'&&l.id==='crust'||step.id==='C2'&&l.id==='absorption'?{cutaway:true}:{}),...(step.id==='G3'&&l.id==='surface'||step.id==='K1'?{cutaway:false}:{})});}}>{l.label}</button>)}{showSection&&<button aria-pressed={settings.cutaway} className={settings.cutaway?'active':''} onClick={()=>updateSettings({cutaway:!settings.cutaway,...(step.id==='P1'&&!settings.cutaway?{progress:Math.max(settings.progress,.86)}:{})})}>{step.id==='K1'&&settings.layer!=='construction'?(settings.cutaway?'恢复体量位置':'展开体量关系'):step.id==='P1'?(settings.cutaway?'收起高程切面':'展开高程切面'):(settings.cutaway?'还原外观':'展开剖面')}</button>}</div>{showSeason&&step.id==='C4'?<div className="season-switch" aria-label="环流季节背景">{[{id:1,label:'夏季背景'},{id:3,label:'冬季背景'},{id:0,label:'过渡背景'}].map(option=><button key={option.id} aria-pressed={settings.season===option.id||(option.id===0&&settings.season===2)} className={settings.season===option.id||(option.id===0&&settings.season===2)?'active':''} onClick={()=>{setPicked('');updateSettings({season:option.id,selected:''});}}>{option.label}</button>)}</div>:showSeason&&<div className="season-switch" aria-label="季节">{seasons.map((s,i)=><button aria-pressed={settings.season===i} className={settings.season===i?'active':''} key={s} onClick={()=>updateSettings({season:i})}>{s}</button>)}</div>}</div>
      {step.scene==='history'&&step.id==='H2'&&<div className="history-periods" aria-label="历史时期">{historyPeriods.map((p,i)=><button className={period?.id===p.id?'active':''} key={p.id} onClick={()=>updateSettings({selected:p.id,progress:i/(historyPeriods.length-1)})}>{p.label}</button>)}</div>}
      {step.id==='H3'&&<div className="history-periods" aria-label="会盟事件与材料">{[{id:'event-821',label:'821 · 长安会盟'},{id:'event-822',label:'822 · 拉萨会盟'},{id:'event-823',label:'823 · 立碑'},{id:'object',label:'观察碑体'}].map(item=><button key={item.id} className={settings.layer===item.id?'active':''} onClick={()=>updateSettings({layer:item.id,selected:'empire',progress:item.id==='event-821'?0:item.id==='event-822'?.3:item.id==='event-823'?.6:1})}>{item.label}</button>)}<button onClick={()=>goTo('H2')}>全史索引</button></div>}{step.scene==='culture'&&step.id!=='K1'&&<div className="layer-switch culture-switch" aria-label="文化主题">{cultureTopics.map((t,i)=><button key={t.id} className={step.id===['K1','K2','K3','K4'][i]?'active':''} onClick={()=>goTo(['K1','K2','K3','K4'][i])}>{t.label}</button>)}</div>}
      {!['G4','P1','P2','P3','E3','E1','E2','M1','M2','M3','R1','R2','R3','T1','T2','T3'].includes(step.id)&&['region','landscape','modern','connections','travel'].includes(step.scene)&&<div className="region-switch" aria-label="选择地区">{regions.map(r=><button className={settings.selected===r.id?'active':''} key={r.id} onClick={()=>updateSettings({selected:r.id})}>{r.name}</button>)}</div>}
      <div className="scene-hint">{settings.layer==='temperature'&&<span>暖色较暖 · 冷色较冷 · 定性示意</span>}<span><Compass size={14}/>拖动旋转 · 滚轮缩放 · 点击标记观察</span><span>{playing?'演示正在运行':'可自由观察，点击标记了解对象'}</span></div>
     </div>
    </>}
   </section>
   {!route.home&&<aside className="narrative" aria-label="场景介绍">
    <div className="narrative-scroll" ref={narrativeRef}>
     {(earthContext||understanding)&&exploreOrigin&&exploreOrigin.stepId!==step.id&&<button className="orientation-return" onClick={returnToOrigin}><ArrowLeft size={14}/>回到原问题：{allSteps.find(item=>item.step.id===exploreOrigin.stepId)?.step.title}</button>}
     <div className="chapter-kicker">{String(topicRoute.position).padStart(2,'0')} / {String(topicRoute.total).padStart(2,'0')}<span>{topicRoute.recognition?'地球 → 地方':chapter.shortTitle}</span></div>
     <h1>{step.title}</h1>{spatialOrigin&&!isEvidence&&(!isPlateauClimate||returnsToCity)&&<DetailSpatialContext compact origin={spatialOrigin} onReturn={()=>goAtlas(spatialOrigin)}/>} {isEvidence&&spatialOrigin&&<button className="detail-atlas-return" onClick={()=>goAtlas(spatialOrigin)}><ArrowLeft size={14}/>返回藏北湖盆的整体地图</button>}
     <RecognitionRoute hash={locationHash} returnContext={recognitionReturn} onNavigate={navigateRecognition}/>
     <div className="journey-context"><span>{journey.location}</span><span>{journey.scale}</span><span>{journey.timeContext}</span></div>
     {director.cueIndex===0&&previousStep&&<p className="continuity-note"><span>理解这个问题的背景：</span>{previousStep.takeaway}</p>}
     <p className="question-line">{step.question}</p>{mainline&&<div className="mainline-context"><div><span>{topicRoute.recognition?'地球 → 地方 · '+topicRoute.position+' / '+topicRoute.total:'专题讲解 · '+(currentIndex+1)+' / '+allSteps.length}</span><button onClick={()=>goAtlas(atlasLocationForStep(step.id)||atlasLocationForStep('G3')!)}>整体地图<ArrowRight size={12}/></button></div><p>{connection.context}</p></div>}{isPlateauClimate&&<PlateauClimateReading guide={visualGuide} timing={director.narrationTiming} currentCaption={currentCaption} settings={settings} onChange={updateSettings} onStage={index=>{setPicked('');setGuideInterrupted(false);director.selectCue(index);}} onCity={id=>goAtlas(cityAtlasLocation(id,'environment'))}/>} {isFoundation&&<EarthFoundationReading guide={visualGuide} currentCaption={currentCaption} timing={director.narrationTiming} settings={settings} onChange={updateSettings} onStage={index=>{setPicked('');setGuideInterrupted(false);director.selectCue(index);}}/>}{step.id==='G4'&&<TerrainContrast settings={settings} onChange={updateSettings}/>} {['G4','P1'].includes(step.id)&&<ElevationReading key={`elevation-${step.id}`} stepId={step.id} settings={settings} guide={visualGuide} onChange={updateSettings}/>} {(isCloud||isLiving)&&<WaterProcessReading stepId={step.id} settings={settings}/>} {step.id==='K3'&&<figure className="manuscript-reference"><img src="https://collectionapi.metmuseum.org/api/collection/v1/iiif/37610/2209706/main-image" alt="大都会馆藏木经板1987.407.6，雕刻图像与红色颜料痕迹" loading="lazy"/><figcaption>真实对象：约12世纪早期，西藏木经板。图片：The Met，Public Domain。3D仅演示保护关系；托林为主题来路，不是经板出土地。</figcaption><a href="https://www.metmuseum.org/art/collection/search/37610" target="_blank" rel="noreferrer" onClick={pause}>核对馆藏记录 · 1987.407.6 ↗</a></figure>} {visualGuide&&!isFoundation&&!isPlateauClimate&&<NarrationGuide guide={visualGuide} playing={playing} interrupted={guideInterrupted} manualTitle={selectedName||understanding?.title||earthContext?.title||'当前画面里的认识'} manualExplanation={feedback} onReplay={replayNarration}/>} {step.id==='G2'&&<nav className="geographic-hierarchy" aria-label="地球上的地理层级">{geographicHierarchy.map((item,i)=><span key={item.id}><button type="button" title={item.detail} className={settings.layer===item.id?'active':''} onClick={()=>{setPicked('');updateSettings({layer:item.id==='southwest'?'china':item.id,selected:item.id==='southwest'?'southwest':''});}}>{item.name} · {item.kind}</button>{i<geographicHierarchy.length-1?' ›':''}</span>)}</nav>}{contextConnections.length>0&&<nav className="opening-connections" aria-label="从整体到原理的认识来路">{contextConnections.map(item=><button key={item.id} type="button" aria-current={step.id===item.id?'step':undefined} className={step.id===item.id?'active':''} onClick={()=>item.id==='E1'&&!isRegional?goRelated(item.id):goTo(item.id)}>{item.label}</button>)}</nav>}{chapter.id==='climate'&&!isPlateauClimate&&<button className="background-entry" onClick={()=>{const origin=captureExplorationOrigin(locationHash,step.id,director.cueIndex,director.waiting);setExploreOrigin(previous=>previous||origin);goToGuided('G1');}}><GlobeHemisphereEast size={17}/><span>先认识整体环境：地球上的位置与周边</span><ArrowRight size={14}/></button>}
     {earthContext&&!isFoundation&&<section className="live-feedback orientation-summary" aria-live="polite"><strong>{picked&&settings.selected===picked?orientationObjects[picked]?.name||earthContext.title:earthContext.title}</strong><p>{feedback}</p>{['plateau','tibet'].includes(settings.layer)&&<div className="scope-legend"><span><i className="scope-administrative"/>西藏行政范围参考</span><span><i className="scope-physical"/>高原地理范围示意</span></div>}<p className="orientation-look"><Compass size={13}/>{earthContext.lookFor}</p><small className="orientation-provenance">NASA 地球影像 · Natural Earth 范围参考；高原为地理范围示意</small></section>}
     {step.id==='G2'&&<EarthEnvironmentPrimer onChange={updateSettings} onMap={()=>goAtlas(atlasLocationForStep('C4')!)}/>}
     {isEvidence&&<ClimateEvidence progress={settings.progress} onSelect={value=>updateSettings({progress:value})}/>}
     {isContemporary&&<ContemporaryCaseStudy key={`case-${step.id}`} stepId={step.id} onInspect={()=>{pause();setGuideInterrupted(true);}} onDemonstrate={patch=>{setPicked('');updateSettings(patch);}}/>}
     {step.id==='K1'&&settings.layer!=='construction'&&<PalaceStudyContext/>}
     {understanding&&!isRegional&&!isPlateauClimate&&<SceneExplanation understanding={understanding} selected={picked} onSelect={selectObject} showExplanation={!(isCloud||isLiving)&&(!(isHumanStory||isContemporary)||!visualGuide||visualGuide.active&&!guideInterrupted)}/>}
     <HumanHistoryEvidence key={`evidence-${step.id}`} stepId={step.id} periodId={step.id==='H2'?settings.selected:undefined} preferredEvidenceId={preferredEvidenceId||(step.id==='K2'?(settings.progress<.32?'atisha-1042-place-sequence':settings.progress<.68?'translation-and-new-expression':'atisha-portrait-not-event-photo'):undefined)} onInspect={()=>{pause();setGuideInterrupted(true);}}/>{isRegional&&<RegionComparison settings={settings} onChange={patch=>{setPicked('');updateSettings(patch);}} onRelated={goRelated}/>}
     {['C3','C5','C6'].includes(step.id)&&<button className="related-region-entry" type="button" onClick={()=>goRelated('E1',{selected:'nyingchi',compareRegion:'nagqu',layer:'terrain'})}>把原理带回地区：比较林芝与那曲<ArrowRight size={14}/></button>}
     {step.scene==='travel'&&<JourneyPlan key={`plan-${step.id}`} stepId={step.id} saved={saved} setSaved={setSaved} onRead={goRelated} onPlanner={()=>open('travel')} onNotice={setToast}/>}
     <details className="narration-sections" key={step.id}><summary>本问题的讲解片段<span>{journey.cues.length} 段</span></summary><nav aria-label="讲解片段">{journey.cues.map((cue,i)=><button key={cue.id} aria-current={director.cueIndex===i?'step':undefined} className={director.cueIndex===i?'active':''} onClick={()=>{setGuideInterrupted(false);director.selectCue(i)}}>{cue.title}<ArrowRight size={13}/></button>)}</nav></details>
     <div className={'cue-heading'+(earthContext&&director.mode==='idle'?' orientation-idle':'')}><h2>{director.mode==='idle'&&director.cueIndex===0?'这个问题怎样认识':director.cue.title}</h2><small>{showArrival?'先定位，再进入详细演示':!viewReady?'正在准备场景':playing?(director.audio.status==='loading'?'讲述准备中':'正在讲解'):director.waiting?'停留观察中':director.mode==='idle'&&director.cueIndex>0?'已回到这一段，可从段首开始讲解':'可随时开始讲解'}</small></div>
     {understanding&&visualGuide?.active&&currentCaption&&<p className="current-spoken-line"><NarrationCaption text={currentCaption} timing={director.narrationTiming}/></p>}
     {earthContext||understanding?<details className="spoken-text"><summary>展开当前讲述全文</summary><p className="cue-copy">{director.mode==='idle'&&director.cueIndex===0?step.summary:director.cue.narration}</p></details>:<p className="cue-copy" aria-live="polite">{director.mode==='idle'&&director.cueIndex===0?step.summary:director.cue.narration}</p>}
     <div className="cue-clock" aria-hidden="true"><span style={{width:`${director.progress*100}%`}}/></div>
     <NarrationAlignmentNotice unavailable={narrationAlignmentUnavailable(director.audio)}/>
     {director.audio.error&&<div className="audio-error">{director.audio.error}<br/><button onClick={replayNarration}>重试本段讲解</button> · <button onClick={()=>{setVoice(false);startNarration()}}>静音重试本段</button></div>}
     {director.cue.role==='observe'&&director.mode!=='idle'&&<section className="observation-task"><header><Compass size={17}/>{director.observed?'你的操作正在改变画面':'可以试着观察'}</header><p>{director.cue.interaction?.instruction||step.action}</p><button className="text-button" onClick={()=>director.observeDone()}>继续认识<ArrowRight size={17}/></button></section>}
     {(!isEvidence&&!earthContext&&!understanding&&(!playing||director.cue.role==='observe'))&&<section className="live-feedback" aria-live="polite"><strong>当前画面里的认识</strong><p>{feedback}</p></section>}
     {director.cue.role==='bridge'&&<section className="chapter-memory"><h3>{isChapterEnd?'这一章带走的认识':'把认识连起来'}</h3>{isChapterEnd?<><p>{chapterSummaries[chapter.id].narration}</p><ul>{chapterSummaries[chapter.id].learned.map(item=><li key={item}>{item}</li>)}</ul></>:<p>{step.takeaway}</p>}</section>}
     <details className="inline-reading"><summary>展开完整文字介绍</summary><p>{step.summary}</p>{step.explanation.map((text,i)=><p key={i}>{text}</p>)}</details>

     {step.scene==='travel'&&<button className="route-entry" onClick={()=>open('travel')}><MapPin size={19}/>组织我的主题路线<ArrowRight size={17}/></button>}
    </div>
    <div className="next-block">
     <div className="reading-actions"><button onClick={()=>open('detail')}><BookOpenText size={18}/>本章与材料<ArrowRight size={14}/></button><button onClick={()=>open('sources')}><Info size={17}/>查看依据</button></div>
     <p>{returnsToCity?'把这一段原理带回刚才的城市与地区，保留同图对照或单城阅读的位置。':step.id==='G4'?'已有真实高差参照，接下来在同一个地球上追踪来流、抬升和云雨。':isPlateauClimate?'把林芝、拉萨、阿里留在同一张高程地图上，比较气候、地形与生活，再走向具体地方的文化与历史。':topicMode?(topicRoute.next?`继续本专题：${topicRoute.next.question}`:'这一专题已经展开，可回到专题导览选择下一条认识线路。'):mainline?connection.next:spatialOrigin?'把这一段认识带回原来的地点，再沿整体地图继续下一处或下一主题。':step.id==='G2'?'已经找到地球上的位置与外部联系。接下来展开西藏与周边的完整地图，再选择山地、气候或地方深入。':isChapterEnd?chapterSummaries[chapter.id].nextReason:journey.nextStepId?`带着这个认识，继续问：${allSteps[currentIndex+1].step.question}`:journeySegments[3].nextReason}</p>
     <details key={step.id} className={'viewing-controls'+(earthContext||understanding||isEvidence?' compact-controls':'')} open={!earthContext&&!understanding&&!isEvidence}><summary>观看方式与接续</summary><div className="viewing-preference" aria-label="观看方式"><button aria-pressed={!stopForObservation} className={!stopForObservation?'active':''} onClick={()=>setStopForObservation(false)}>连续认识</button><button aria-pressed={stopForObservation} className={stopForObservation?'active':''} onClick={()=>setStopForObservation(true)}>讲解后停留</button></div><p className="viewing-help">{stopForObservation?'到观察段后停留，可自由操作，再继续认识。':'讲解连续衔接。转动、选点或改条件时，暂停并保留当前画面。'}</p><details className="playback-options"><summary>接续设置</summary><label className="guide-toggle"><input type="checkbox" checked={autoContinue} onChange={e=>setAutoContinue(e.target.checked)}/>讲完当前问题后，自动进入下一问题</label></details></details>
     <button className="gold-button next-step" onClick={()=>markAndNext(playing)}>{returnsToCity||step.id==='G4'||isPlateauClimate?completionLabel:topicMode?completionLabel:mainline?(step.id==='G4'?'选择接下来要看的专题':currentIndex===allSteps.length-1?'整理这一程的认识':`继续认识：${allSteps[currentIndex+1].step.title}`):spatialOrigin?'完成这段认识，返回整体地图':step.id==='G2'?'展开西藏与周边的整体地图':currentIndex===allSteps.length-1?'整理这一程的认识':isChapterEnd?`进入下一章：${allSteps[currentIndex+1].chapter.shortTitle}`:`下一问题：${chapter.steps[stepIndex+1].title}`}<ArrowRight size={18}/></button>
    </div>
   </aside>}
  </main>
  {route.home?<footer className="home-footer"><span><Mountains size={24}/>随时暂停、深入，再回到主线</span><button onClick={()=>{if(lastVisit.current&&(parseAtlasLocation(lastVisit.current)||(parseRoute(lastVisit.current).step===resume.step.id&&isGuidedJourney(lastVisit.current))))location.hash=lastVisit.current;else navigate(resume.chapter,resume.step)}}>{saved.visited.length||lastVisit.current?'继续上次':'从第一章开始'}<ArrowRight size={21}/></button></footer>:<footer className="learning-footer"><div className="playback"><div><button className="play-button" aria-label={playbackLabel} onClick={()=>playbackActive?pause():director.cue.role==='bridge'&&director.progress>=1?markAndNext(true):startNarration()}>{playbackActive?<Pause size={21} weight="fill"/>:<Play size={21} weight="fill"/>}</button><button className="play-label" onClick={()=>playbackActive?pause():director.cue.role==='bridge'&&director.progress>=1?markAndNext(true):startNarration()}>{playbackLabel}</button><IconButton label={voice?'关闭讲解声音':'开启讲解声音'} active={voice} onClick={()=>setVoice(!voice)}>{voice?<SpeakerHigh size={19}/>:<SpeakerSlash size={19}/>}</IconButton><IconButton label={previousActionLabel} onClick={previous}><ArrowLeft size={21}/></IconButton></div><small>{topicRoute.recognition?'地球 → 地方':chapter.shortTitle} · {topicRoute.position} / {topicRoute.total}{voice&&<span className="voice-state"><i/>{preparingNarration?'场景就绪后开始':director.audio.status==='loading'?'正在准备声音':'自然语音讲述'}</span>}</small></div><TopicOutline chapter={chapter} step={step} onNavigate={(_ch,st)=>returnsToCity?openLibraryStep(st.id):openTopicStep(st.id)}/><button className="progress-link" onClick={()=>open('contents')}><List size={18}/><span>全部专题</span></button></footer>}
  {!storageOk&&<div className="storage-warning">此窗口无法保存记录。可在“我的探索”导出后留存。</div>}
  {toast&&!drawer&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}
  {drawerPanel}
 </div>
}

