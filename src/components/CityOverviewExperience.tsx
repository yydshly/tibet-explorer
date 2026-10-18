import {useEffect,useRef,useState,type SyntheticEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowCounterClockwise,BookOpenText,Compass,DiamondsFour,GlobeHemisphereEast,Info,MapPin,X} from '@phosphor-icons/react';
import TibetScene from '../scene/TibetScene';
import {chapters} from '../data/curriculum';
import {atlasHotspots} from '../data/atlas';
import {getPlaceProfile} from '../data/placeProfiles';
import {cityOverviews,cityOverviewContext,cityOverviewFacets,cityOverviewSources,getCityOverview,type CityOverviewFacetId} from '../data/cityOverview';
import {atlasHash,cityAtlasLocation,cityTopicLocation} from '../lib/spatialJourney';
import type {StoryAtlasProps} from './StoryAtlasExperience';
import './CityOverviewExperience.css';
import CityLifeReading from './CityLifeReading';
import {getCityLifeJourney} from '../data/cityLifeJourney';
import {cityLifeStageOrder,cityLifeStagePosition,validateCityLifePosition} from '../lib/cityLifeState';
import {useCityLifeDirector} from '../hooks/useCityLifeDirector';
import {useCityComparisonDirector} from '../hooks/useCityComparisonDirector';
import CityComparisonReading from './CityComparisonReading';
import {cityComparisonStages} from '../data/cityComparison';
import type {CityComparisonStageId} from '../data/cityComparison';
import CityContinuityTravelActions,{type CityTravelChoices} from './CityContinuityTravelActions';
import {captureCityTravelReview,type CityTravelReviewSnapshot,type CityTravelReviewTarget} from '../lib/cityTravelReview';
import {cityComparisonFocusProgress} from '../lib/cityComparisonContinuation';
import {cityAccessCities,cityAccessCityRange} from '../lib/cityAccessState';
import {cityContinuityPartProgress} from '../lib/cityContinuityState';
import {cityLocalObservationFeatureId,type CityLocalObservationPoint} from '../lib/cityLocalGeography';
import type {CityPlaceThreadStep,CityPlaceThreadFeature} from '../data/cityPlaceThreads';
import RecognitionRoute from './RecognitionRoute';
import type {RecognitionNavigation} from '../lib/recognitionRoute';
import {parseRoute} from '../lib/store';
import {useClimateObservationNarration} from '../hooks/useClimateObservationNarration';
import ClimateObservationPlayback from './ClimateObservationPlayback';
import NarrationCaption from './NarrationCaption';
import {narrationAlignmentUnavailable} from './NarrationAlignmentNotice';
import {parseAtlasLocation} from '../lib/spatialJourney';
import type {TravelAccessDrafts} from '../lib/travelAccessVerification';
import type {TravelAccessSegment} from '../data/travelAccessSegments';

const steps=chapters.flatMap(chapter=>chapter.steps);
const orderedCities=cityOverviewContext.arrangements.flatMap(group=>group.ids.map(id=>getCityOverview(id)!));
const facetLabels:Record<CityOverviewFacetId,string>={position:'位置',environment:'环境',history:'历史',today:'发展'};
const principleIds=['G3','G4','C4','C5','E3'];
const continuityMapTitles:Partial<Record<CityComparisonStageId,string>>={history:'人的行动，怎样留下地方历史',development:'铁路与航空，怎样进入城市生活',connections:'通道抵达之后，怎样接上地方使用',travel:'带着地形与历史，走向地方观察'};

export default function CityOverviewExperience({location,saved,onSave,onDetail,onEarth,onDirectory,onModels,onSaved,onTravel,onReturn,returnTitle}:StoryAtlasProps){
 const regionId=location.cityId||atlasHotspots.find(point=>point.id===location.hotspotId)?.regionId||'lhasa';
 const city=getCityOverview(regionId)||cityOverviews[0];
 const facetId=location.facet||'position';
 const facetInfo=cityOverviewFacets.find(item=>item.id===facetId)!;
 const [resetKey,setResetKey]=useState(0),[sceneKey,setSceneKey]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [showModels,setShowModels]=useState(false);
 const [observationMonth,setObservationMonth]=useState(7),[inspectClimate,setInspectClimate]=useState(false);
 const [evidenceSelection,setEvidenceSelection]=useState<{feature:CityPlaceThreadFeature;stage:CityComparisonStageId;cityId:string}>();
 const readingRef=useRef<HTMLDivElement>(null),sceneRef=useRef<HTMLElement>(null),sceneHeadingRef=useRef<HTMLHeadingElement>(null),travelActionsRef=useRef<HTMLDivElement>(null);
 const [accessDrafts,setAccessDrafts]=useState<TravelAccessDrafts>({});
 const [travelChoices,setTravelChoices]=useState<CityTravelChoices>({}),[travelReview,setTravelReview]=useState<CityTravelReviewSnapshot|null>(null),[viewSerial,setViewSerial]=useState(0);
 const [localObservations,setLocalObservations]=useState<Record<string,CityLocalObservationPoint>>({}),[activeLocalObservation,setActiveLocalObservation]=useState<CityLocalObservationPoint>();
 const pendingSceneFocus=useRef(false),pendingTravelRestore=useRef<CityTravelReviewSnapshot|null>(null);
 const requestSceneFocus=()=>{pendingSceneFocus.current=true;setViewSerial(value=>value+1);};
 const setCity=(id:string,selectedFacet:CityOverviewFacetId=facetId,compare?:boolean)=>{director.pause();comparison.pause();window.location.hash=atlasHash(cityAtlasLocation(id,selectedFacet,compare));};
 const lifeJourney=getCityLifeJourney(city.id);
 const lifeActive=Boolean(lifeJourney)&&(facetId==='environment'||facetId==='history');
 const comparing=Boolean(lifeJourney)&&facetId==='environment'&&location.compare!==false;
 const comparison=useCityComparisonDirector({active:comparing,ready});
 const comparisonStage=cityComparisonStages.findIndex(stage=>stage.id===comparison.stage);
 const observingClimate=comparing&&comparison.stage==='climate'&&inspectClimate;
 const observationNarration=useClimateObservationNarration({month:observationMonth,active:observingClimate});
 useEffect(()=>{if(!comparing||comparison.stage!=='climate'||comparison.playing)setInspectClimate(false);},[comparing,comparison.stage,comparison.playing]);
 const comparisonSceneStep=comparisonStage<2?comparisonStage:comparisonStage<5?2:comparisonStage-2;
 const readingFacet:CityOverviewFacetId=comparing?(comparisonStage>=6?'today':comparisonStage===5?'history':'environment'):facetId;
 const comparisonFocus=comparison.stage==='water'?'water':comparison.stage==='settlement'?'settlement':'mobility';
 const comparisonCity=['nyingchi','lhasa','ngari'][comparison.progress>=.68?2:comparison.progress>=.34?1:0];
 const focusedCity=comparing?getCityOverview(comparisonCity)!:city;
 const selectedEvidenceFeature=!comparison.playing&&evidenceSelection?.stage===comparison.stage&&evidenceSelection.cityId===comparisonCity?evidenceSelection.feature:undefined;
 useEffect(()=>{if(comparison.playing)setEvidenceSelection(undefined);},[comparison.playing]);
 const profile=getPlaceProfile(focusedCity.id),facet=focusedCity.facets[readingFacet];
 const director=useCityLifeDirector({cityId:city.id,active:lifeActive&&!comparing,ready,facet:facetId,onStage:stage=>{
  const target=stage==='history'?'history':'environment';
  if(facetId!==target)window.location.hash=atlasHash(cityAtlasLocation(city.id,target,false));
 }});
 const focusComparison=(id:string)=>{observationNarration.pause();const target=cityAccessCities.find(cityId=>cityId===id);if(target){comparison.setProgress(cityComparisonFocusProgress(comparison.progress,target));requestSceneFocus();window.location.hash=atlasHash(cityAtlasLocation(id,'environment',true));}else setCity(id);};
 const startComparison=(stage:CityComparisonStageId,id=focusedCity.id)=>{
  observationNarration.pause();director.pause();const target=cityAccessCities.find(cityId=>cityId===id)??'nyingchi';
  comparison.selectStage(stage,false,cityAccessCityRange(target).start);
  requestSceneFocus();
  window.location.hash=atlasHash(cityAtlasLocation(id,'environment',true));
 };
 const reviewTravelAccess=(id:string)=>{
  setTravelReview({...captureCityTravelReview(comparison.getPosition(),travelChoices,{readingTop:readingRef.current?.scrollTop??0,pageTop:window.scrollY},undefined,{observations:localObservations,active:activeLocalObservation}),presentation:comparison.getPresentation()});
  startComparison('development',id);
 };
 const selectRecordedPlaceStep=(target:Pick<CityPlaceThreadStep,'stage'|'progress'|'sceneProgress'>)=>{
  director.pause();
  if(target.sceneProgress===undefined)comparison.selectStage(target.stage,false,target.progress);
  else comparison.restorePosition({...comparison.getPosition(),stage:target.stage,progress:target.progress,relief:true,services:true,built:true,transfer:true},{sceneProgress:target.sceneProgress});
  requestSceneFocus();
 };
 const reviewTravelProcess=(target:CityTravelReviewTarget)=>{
  setTravelReview({...captureCityTravelReview(comparison.getPosition(),travelChoices,{readingTop:readingRef.current?.scrollTop??0,pageTop:window.scrollY},target.key,{observations:localObservations,active:activeLocalObservation}),presentation:comparison.getPresentation()});
  selectRecordedPlaceStep(target);
  window.location.hash=atlasHash(cityAtlasLocation(target.cityId,'environment',true));
 };
 const inspectAccessSegment=(segment:TravelAccessSegment)=>{
  const target=segment.inspect;
  reviewTravelProcess({...target,label:segment.road,key:`access-segment-${segment.id}`});
  setEvidenceSelection(target.featureId?{feature:{id:target.featureId,label:segment.to,role:'arrival'},stage:target.stage,cityId:target.cityId}:undefined);
 };
 const followPlaceThread=(step:CityPlaceThreadStep)=>{
  setEvidenceSelection(undefined);
  const target=cityAccessCities.find(id=>id===comparisonCity)??'nyingchi';
  if(step.stage==='travel'&&travelReview?.cityId===target){restoreTravelObservation();return;}
  if(comparison.stage==='travel'&&step.stage!=='travel'){
   reviewTravelProcess({cityId:target,stage:step.stage,progress:step.progress,sceneProgress:step.sceneProgress,label:step.title,key:`place-thread-${target}-${step.id}`});
   return;
  }
  selectRecordedPlaceStep(step);
  window.location.hash=atlasHash(cityAtlasLocation(target,'environment',true));
 };
 const restoreTravelObservation=()=>{
  if(!travelReview)return;
  setEvidenceSelection(undefined);pendingSceneFocus.current=false;pendingTravelRestore.current=travelReview;
  comparison.restorePosition(travelReview.position,travelReview.presentation);setTravelChoices({...travelReview.choices});
  setLocalObservations({...travelReview.localObservations});setActiveLocalObservation(travelReview.activeLocalObservation);
  window.location.hash=atlasHash(cityAtlasLocation(travelReview.cityId,'environment',true));
  setTravelReview(null);setViewSerial(value=>value+1);
 };
 const selectFacet=(id:CityOverviewFacetId)=>{
  if(lifeJourney&&id==='today')startComparison('development');
  else if(comparing&&id!=='position')startComparison(id==='history'?'history':'climate');
  else setCity(focusedCity.id,id);
 };
 const openCityCase=(id:string,history=false)=>{
  comparison.pause();const stage=history?'history':'life';
  if(id===city.id){director.setVoice(comparison.voice);director.selectStage(stage);}
  else try{const key=`tibet-explorer.city-life.v1.${id}`;
   const previous=validateCityLifePosition(id,JSON.parse(localStorage.getItem(key)||'null'));
   localStorage.setItem(key,JSON.stringify({...cityLifeStagePosition(previous,stage,true),voice:comparison.voice}));
  }catch{/* The city remains readable when storage is unavailable. */}
  window.location.hash=atlasHash(cityAtlasLocation(id,history?'history':'environment',false));
 };
 const continueLife=()=>{const index=cityLifeStageOrder.indexOf(director.stage);
  if(index<2)director.selectStage(cityLifeStageOrder[index+1]);
  else startComparison('development',city.id);
 };
 const lifeProps={cityId:city.id,stage:director.stage,progress:director.progress,sceneProgress:director.sceneProgress,maintained:director.maintained,
  playing:director.playing,soundEnabled:director.voice,narrationStatus:director.audio.status==='loading'?'loading' as const:director.audio.error?'error' as const:'ready' as const,
  error:director.audio.error||undefined,currentSentence:director.playing?director.currentSentence:undefined,narrationTiming:director.narrationTiming,alignmentUnavailable:narrationAlignmentUnavailable(director.audio),
  onStage:director.selectStage,onProgress:director.setProgress,onMaintained:director.setMaintained,
  onPlayPause:director.playPause,onReplay:director.replay,onSoundChange:director.setVoice,onContinue:continueLife,
  onExploreHistory:()=>openTopic(city.id==='lhasa'?'H3':city.id==='ngari'?'K4':'K2')};
 const pauseAll=()=>{director.pause();comparison.pause();observationNarration.pause();};
 const pauseOnReading=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)pauseAll();};
 const inspectClimateMonth=(month:number)=>{pauseAll();setObservationMonth(month);setInspectClimate(true);};
 const climateObservation={month:observationMonth,active:observingClimate,onMonthChange:inspectClimateMonth,onInspect:()=>inspectClimateMonth(observationMonth),onReturnToMechanism:()=>setInspectClimate(false),activeStationId:observationNarration.activeStationId,playback:<ClimateObservationPlayback director={observationNarration} onPlay={()=>{director.pause();comparison.pause();observationNarration.playPause();}}/>};
 const navigateComparison=()=>{setInspectClimate(false);setEvidenceSelection(undefined);requestSceneFocus();};
 const inspectEvidenceFeature=(feature:CityPlaceThreadFeature)=>{pauseAll();setEvidenceSelection({feature,stage:comparison.stage,cityId:comparisonCity});};
 const selectLocalObservation=(stopId:string,point:CityLocalObservationPoint|undefined)=>{
  pauseAll();setLocalObservations(previous=>{const next={...previous};if(point)next[stopId]=point;else delete next[stopId];return next;});setActiveLocalObservation(point);
  if(!point)return;
  const target=point.localityId==='lulang'?'nyingchi':point.localityId==='lhasa'?'lhasa':'ngari';
  const part=stopId==='lhasa-buildings'||stopId==='lhasa-old-town'||point.localityId==='lulang'&&['building','landuse'].includes(point.featureClass)||point.localityId==='shiquanhe'&&['leisure','landuse','building'].includes(point.featureClass)?1:0;
  comparison.setProgress(cityContinuityPartProgress(target,part));requestSceneFocus();
 };
 const prepareObservation=()=>{
  pauseAll();const actions=travelActionsRef.current;if(!actions)return;
  if(window.matchMedia('(max-width:900px)').matches){
   // The overview remains sticky above the reading area. Keep the plan heading
   // below it instead of scrolling the destination underneath the 3D scene.
   const sceneHeight=sceneRef.current?.getBoundingClientRect().height??0;
   window.scrollTo({top:Math.max(0,window.scrollY+actions.getBoundingClientRect().top-sceneHeight-16),behavior:'auto'});
  }else actions.scrollIntoView({block:'start',behavior:'auto'});
  actions.querySelector<HTMLHeadingElement>('h3')?.focus({preventScroll:true});
 };
 const openPanel=(action:()=>void)=>{pauseAll();action();};
 const lastReadingView=useRef({cityId:city.id,facetId,stage:comparison.stage,comparing});
 useEffect(()=>{
  const previous=lastReadingView.current;
  const cityChanged=previous.cityId!==city.id||previous.facetId!==facetId;
  const stageChanged=previous.stage!==comparison.stage||previous.comparing!==comparing;
  lastReadingView.current={cityId:city.id,facetId,stage:comparison.stage,comparing};
  if(cityChanged||stageChanged)setShowModels(false);
  const restore=pendingTravelRestore.current;
  if(restore){
   if(!comparing||comparison.stage!=='travel'||city.id!==restore.cityId)return;
   pendingTravelRestore.current=null;pendingSceneFocus.current=false;
   readingRef.current?.scrollTo({top:restore.readingTop});window.scrollTo({top:restore.pageTop,behavior:'auto'});
   const selectedReview=restore.focusKey?readingRef.current?.querySelector<HTMLButtonElement>(`[data-review-key="${restore.focusKey}"]`):undefined;
   (selectedReview??travelActionsRef.current?.querySelector<HTMLButtonElement>('.city-continuity-review-access'))?.focus({preventScroll:true});
   return;
  }
  if(cityChanged||stageChanged)readingRef.current?.scrollTo({top:0});
  const explicitlyRequested=pendingSceneFocus.current;pendingSceneFocus.current=false;
  if(comparing&&(stageChanged||explicitlyRequested)){
   sceneHeadingRef.current?.focus({preventScroll:true});
   if(window.matchMedia('(max-width:900px)').matches)sceneRef.current?.scrollIntoView({block:'start',behavior:'auto'});
  }
 },[city.id,facetId,comparison.stage,comparing,viewSerial]);
 const select=(id:string)=>{if(id.startsWith('city:')&&getCityOverview(id.slice(5))){if(comparing)focusComparison(id.slice(5));else setCity(id.slice(5),facetId,false);}};
 const openTopic=(id:string)=>{
  pauseAll();
  onDetail(id,cityTopicLocation(id,focusedCity.id,facetId,comparing));
 };
 const navigateRecognition=(target:RecognitionNavigation)=>{
  if(target.kind==='return'&&travelReview){restoreTravelObservation();return;}
  if(target.kind==='return'&&onReturn){onReturn();return;}
  pauseAll();setInspectClimate(false);
  if(target.comparisonStage){
   const cityId=parseAtlasLocation(target.hash)?.cityId,targetCity=cityAccessCities.find(id=>id===cityId)??'nyingchi';
   comparison.selectStage(target.comparisonStage,false,cityAccessCityRange(targetCity).start);requestSceneFocus();
  }
  if(target.kind==='introduction'){onEarth(parseRoute(target.hash).step);return;}
  window.location.hash=target.hash;
 };
 const selectedSources=facet.sourceIds.flatMap(id=>cityOverviewSources.find(source=>source.id===id)||[]);
 const relatedTopics=facet.stepIds.flatMap(id=>steps.find(step=>step.id===id)||[]);
 return <div className={`app is-learning is-atlas is-city-overview city-reference-shell${lifeActive?' has-city-life':''}${comparing?' has-city-comparison':''}`}>
  <header className="city-topline">
   <a className="city-brand" href="#/" aria-label="西藏探索首页"><DiamondsFour size={20} weight="duotone"/><span>西藏探索</span></a>
   <nav className="city-primary-nav" aria-label="主要导航"><a href="#/"><ArrowLeft size={12}/>首页</a><button onClick={()=>openPanel(onDirectory)}>专题导览</button><button aria-current="page">地图图鉴</button><button aria-expanded={onModels?undefined:showModels} aria-controls={onModels?undefined:'city-model-menu'} onClick={()=>{pauseAll();if(onModels)onModels();else setShowModels(value=>!value);}}>原理模型</button></nav>
   <div className="city-personal-nav"><button onClick={()=>openPanel(onSaved)}>我的探索</button><button onClick={()=>openPanel(onTravel)}>旅行线路<ArrowRight size={12}/></button></div>
  </header>
  {showModels&&<nav id="city-model-menu" className="city-model-menu" aria-label="选择原理模型"><div><strong>从现象看原因</strong><button aria-label="关闭原理模型" onClick={()=>setShowModels(false)}><X size={16}/></button></div>{principleIds.map(id=>{const step=steps.find(item=>item.id===id);return step?<button key={id} onClick={()=>openTopic(id)}>{step.title}<ArrowRight size={13}/></button>:null;})}<p>进入后可以操作演示，并回到当前城市。</p></nav>}
  <main className="city-stage">
   <section ref={sceneRef} className="scene-area atlas-scene city-overview-scene" aria-label="七市地在西藏与周边的整体位置">
    <div className="canvas-wrap"><TibetScene key={sceneKey} scene="region" viewKey="atlas" step={comparing?comparisonSceneStep:lifeActive?cityLifeStageOrder.indexOf(director.stage):0} season={1} layer={comparing?'atlas-city-comparison':lifeActive?'atlas-city-life':'atlas-cities'} progress={comparing?comparison.sceneProgress:lifeActive?director.sceneProgress:0} playing={comparing?comparison.playing:lifeActive&&director.playing} selected={`city:${comparing?comparisonCity:city.id}`} comparisonRelief={comparison.relief} climateObservationMonth={observingClimate?observationMonth:undefined} climateObservationStationId={observationNarration.activeStationId} cityLifeFocus={comparisonFocus} cityLifeServices={comparison.services} cityAccessTransfer={comparison.transfer} cityLocalFeatureId={comparing?selectedEvidenceFeature?.id??cityLocalObservationFeatureId(comparison.stage,comparison.progress,activeLocalObservation):undefined} cityBuiltLayer={comparing?comparison.built:true} communitySupport={director.maintained?'shared':'individual'} cutaway={false} resetKey={resetKey} onSelect={select} onInteract={pauseAll} onReady={()=>setReady(true)} onError={message=>{setError(message);setReady(true);}}/></div>
    {!ready&&<div className="scene-loading"><GlobeHemisphereEast size={36}/><p>正在展开西藏全域…</p></div>}
    {error&&<div className="scene-error"><Info size={26}/><h2>整体地图暂时无法打开</h2><p>{error}</p><button onClick={()=>{setError('');setReady(false);setSceneKey(value=>value+1);}}>重新展开地图</button></div>}
    <div className="city-map-title"><p><button onClick={()=>onEarth('G1')}>地球</button><span> / 亚洲 / 中国 / 西藏自治区</span></p><h2 ref={sceneHeadingRef} tabIndex={-1} aria-label={comparing?`${cityComparisonStages[comparisonStage]?.title}，正在看${focusedCity.name}`:undefined}>{observingClimate?'三站气候，放在同一时期对照':comparing?(continuityMapTitles[comparison.stage]??'同一片高原，三种地方条件'):city.positionLabel}</h2></div>
    {comparing&&<p className="city-comparison-legend">{observingClimate?`1991—2020年 · ${observationMonth}月标准值 · 0—150毫米统一柱尺，非地形高度或当日天气`:comparisonStage>=5?comparison.stage==='history'?'现状地理与有日期的事件 · 用途读取':comparison.stage==='development'?'真实位置与道路 · 交通加入为原理演示':comparison.stage==='connections'?'区域入口 → 源道路接续 → 地方使用':'回到同一处地物 · 带着问题观察':comparisonStage===0?'固定初始水汽 · 云雨为机制示意，不表示实测雨量':comparisonStage===1?'同一海拔基准 · 定位点网格读数，非城市平均':comparison.stage==='mobility'?'白：直线参照 · 金：地形试线 · 非实际道路':comparison.stage==='water'?'青：坡面去向 · 取用为原理演示 · 非实测设施':comparison.built?'绿：相对低缓 · 赭：2021建成地表比例 · 非城界':'绿：窗口内相对低缓 · 非城市边界或用地规划'}</p>}
    <div className="city-map-tools"><button aria-label="回到七市地全景" onClick={()=>setResetKey(value=>value+1)}><ArrowCounterClockwise size={19}/></button><button aria-label="回到地球上的位置" onClick={()=>onEarth('G1')}><GlobeHemisphereEast size={19}/></button></div>
    <div className="city-map-key"><span><i/>城区与驻地参照</span><span>六市一地区 · 全域地图</span><small>圆点表示定位点；未显示市地行政界</small></div>
    <p className="city-map-hint"><Compass size={13}/>拖动旋转 · 滚动缩放 · 点选城市</p>
    {observingClimate?<div className="city-life-stage-feedback climate-observation-map-caption"><span>整体地图 · 三个气象站 · {observationMonth}月</span><strong>柱高比较月降水，刻度每50毫米</strong><p>{observationNarration.caption?<NarrationCaption text={observationNarration.caption} timing={observationNarration.timing}/>:<>1991—2020标准值；站点统计不代表整个市域。选择月份比较季节，再回到地形机制解释原因。</>}</p><button type="button" onClick={()=>setInspectClimate(false)}>回到气流与地形演示<ArrowRight size={13}/></button></div>:comparing?<CityComparisonReading director={comparison} onFocus={focusComparison} onCity={openCityCase} compact/>:lifeActive&&<CityLifeReading {...lifeProps} compact/>}
   </section>
   <aside className="city-dossier" aria-label="城市与所辖区域的综合介绍">
    <div className="city-reading" ref={readingRef}>
     {travelReview&&<p className="city-travel-return">刚才的地方、进度与未保存内容已暂存，可沿下方认识主线返回。</p>}
     <p className="city-eyebrow"><span>地图图鉴</span><span>{comparing?'三地环境与生活':city.administrativeType}</span></p>
     <div className="city-title"><h1>{comparing?'三地同图':city.name}</h1><span><MapPin size={12}/>{comparing?'林芝 · 拉萨 · 阿里':city.locatorName}</span></div>
     <p className="city-summary">{comparing?'保留林芝、拉萨与阿里的整体位置。从气候地形、通行用水，接到文化历史、现代联系，最后整理自己的地方观察。':city.summary}</p>
     <RecognitionRoute hash={atlasHash(location)} comparisonStage={comparing?comparison.stage:undefined} cityId={focusedCity.id} returnContext={travelReview?{hash:atlasHash(cityAtlasLocation(travelReview.cityId,'environment',true)),label:'返回刚才的旅行观察'}:undefined} onNavigate={navigateRecognition}/>
     <nav className="city-facets" aria-label="城市介绍维度">{cityOverviewFacets.map(item=><button key={item.id} type="button" aria-label={item.title} aria-pressed={readingFacet===item.id} className={readingFacet===item.id?'active':''} onClick={()=>selectFacet(item.id)}>{facetLabels[item.id]}</button>)}</nav>
     {lifeJourney&&<nav className="city-comparison-mode" aria-label="区域比较与地方深入"><button aria-pressed={comparing} onClick={()=>setCity(city.id,'environment',true)}>三地同图对照</button><button aria-pressed={!comparing} onClick={()=>setCity(focusedCity.id,readingFacet,false)}>深入{focusedCity.name}</button></nav>}
     {comparing?<CityComparisonReading director={comparison} onFocus={focusComparison} onCity={openCityCase} onNavigate={navigateComparison} climateObservation={climateObservation} onPrepareObservation={onSave?prepareObservation:undefined} onThreadNavigate={followPlaceThread} onInspectFeature={inspectEvidenceFeature} selectedEvidenceFeatureId={selectedEvidenceFeature?.id}/>:lifeActive?<CityLifeReading {...lifeProps}/>:<article className="city-facet-reading" aria-live="polite"><p className="city-facet-question">{facetInfo.question}</p><h2>{facet.title}</h2><p>{facet.paragraphs[0]}</p>{facet.paragraphs.length>1&&<details className="city-more-reading" onToggle={pauseOnReading} key={`${city.id}:${facetId}:more`}><summary>继续阅读</summary>{facet.paragraphs.slice(1).map(text=><p key={text}>{text}</p>)}</details>}</article>}
     {comparing&&comparison.stage==='travel'&&onSave&&<div ref={travelActionsRef}><CityContinuityTravelActions cityId={comparisonCity as 'nyingchi'|'lhasa'|'ngari'} saved={saved} onSave={onSave} onTravel={onTravel} onPause={pauseAll} onReviewAccess={reviewTravelAccess} onReviewProcess={reviewTravelProcess} choices={travelChoices} onChoicesChange={setTravelChoices} localObservations={localObservations} onLocalObservationChange={selectLocalObservation} accessDrafts={accessDrafts} onAccessDraftsChange={setAccessDrafts} onInspectAccess={inspectAccessSegment}/></div>}
     {!comparing&&lifeJourney&&facetId==='today'&&<button className="city-return" onClick={()=>startComparison('development',city.id)}>在整体地图演示现代发展<ArrowRight size={14}/></button>}
     {relatedTopics.length>0&&<section className="city-topic-links" aria-label="从当前城市深入认识"><h3>沿着这个问题看下去</h3>{relatedTopics.map(step=><button key={step.id} onClick={()=>openTopic(step.id)}><span>{step.title}</span><ArrowRight size={14}/></button>)}</section>}
     <section className="city-evidence"><h3><BookOpenText size={13}/>资料依据</h3>{selectedSources.slice(0,1).map(source=><a className="city-source-lead" key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={pauseAll}>{source.title}<ArrowRight size={12}/></a>)}<details className="city-sources" onToggle={pauseOnReading} key={`${city.id}:${facetId}:sources`}><summary>查看来源与材料说明 · {selectedSources.length} 项</summary>{selectedSources.map(source=><div key={source.id}><a href={source.url} target="_blank" rel="noreferrer" onClick={pauseAll}>{source.title}<ArrowRight size={12}/></a>{source.note&&<p>{source.note}</p>}</div>)}</details></section>
     {profile&&<details className="city-whole-context city-full-reading" onToggle={pauseOnReading} key={`${focusedCity.id}:reading`}><summary>完整地方介绍</summary>{profile.sections.map(section=><section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(text=><p key={text}>{text}</p>)}{section.sourceIds.map(id=>{const source=profile.sources.find(item=>item.id===id);return source?<a key={id} href={source.url} target="_blank" rel="noreferrer" onClick={pauseAll}>{source.title}</a>:null;})}</section>)}</details>}
     <details className="city-whole-context" onToggle={pauseOnReading}><summary>周围还有哪些联系</summary><p>{focusedCity.naturalSetting}</p>{focusedCity.connections.map(item=><p key={item}>{item}</p>)}<p>{cityOverviewContext.summary}</p><p>{cityOverviewContext.scaleNote}</p>{cityOverviewContext.sourceIds.map(id=>{const source=cityOverviewSources.find(item=>item.id===id);return source?<a key={id} href={source.url} target="_blank" rel="noreferrer" onClick={pauseAll}>{source.title}</a>:null;})}</details>
     <details className="city-data-method" onToggle={pauseOnReading}><summary>地图数据与比例</summary><p>整体地图采用 NASA Blue Marble 2004 年 6 月合成影像与 Mapzen 公开高程，区域高程垂直显示夸张{comparing?' 32 ':' 16 '}倍；不代表今日天气。{comparing&&'教学压平保留原始米值。鲁朗、拉萨与狮泉河的局部地图另用同窗高程，垂直显示×1.8，网格抽样约19—42米；抽样间隔不等于测绘精度。'}</p>{comparing&&<p>地方道路、河流与建筑轮廓来自2026年10月15日获取的 OpenStreetMap 记录。未提供高度的建筑采用统一显示符号；道路与河流线宽便于读图。现状几何不代表历史城界、工程边界或已核实的访问入口。</p>}<p>城市标记使用 Natural Earth / GeoNames 的城区或驻地参考点。本图显示国家与自治区概览范围，未绘制市地行政界；自然高原与行政范围分开理解，阿里为地区。</p><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer" onClick={pauseAll}>高程数据</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onClick={pauseAll}>OpenStreetMap（ODbL）</a> · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer" onClick={pauseAll}>Natural Earth</a> · <a href="https://www.geonames.org/" target="_blank" rel="noreferrer" onClick={pauseAll}>GeoNames（CC BY 4.0）</a></details>
     {onReturn&&<button type="button" className="city-return" onClick={onReturn}><ArrowLeft size={14}/>回到原问题{returnTitle?`：${returnTitle}`:''}</button>}
    </div>
   </aside>
  </main>
  <footer className="city-location-strip"><div className="city-strip-intro"><GlobeHemisphereEast size={20}/><div><strong>西藏 · 城市与地区</strong><span>选择地点，在全域中对照</span></div></div><nav className="city-place-list" aria-label="西藏六市一地区">{orderedCities.map((item,index)=><button key={item.id} type="button" onClick={()=>comparing?focusComparison(item.id):setCity(item.id)} aria-pressed={focusedCity.id===item.id} className={focusedCity.id===item.id?'active':''}><small>{String(index+1).padStart(2,'0')}</small><span><strong>{item.name}{item.administrativeType==='地区'&&'地区'}</strong><em>{item.positionLabel.split(' · ')[0]}</em></span></button>)}</nav></footer>
 </div>;
}
