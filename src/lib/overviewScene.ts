import {placeActionPresentation} from './overviewPlaceActions';
import {overviewOriginsPresentation} from './overviewOrigins';
import {overviewMechanismState} from './overviewMechanisms';
import {groundJourneyState,valleyJourneyState} from './groundJourney';
import {overviewRiverState} from './overviewRiver';
import {narratedGeographyState} from './narratedGeography';
import {historySpacePresentation} from './historySpaceStory';
import {chapters} from '../data/curriculum';
import {journeySteps, type JourneyCue} from '../data/journey';
import {visualGuideForCue} from '../data/visualGuidance';
import {cityAccessAudioSegments} from './cityAccessAudio';
import {CITY_SCENE_END_MARGIN,cityNarrationSceneProgress} from './cityNarrationSceneProgress';
import {journeyMotionProgress} from './journeyMotion';
import {narrationPhraseBindings} from './narrationPhraseGuide';
import type {NarrationTiming} from './narrationTiming';
import {settingsForStep, type SceneSettings} from './store';
import type {TibetSceneProps} from '../scene/sceneTypes';
import {overviewHeritagePresentation,overviewHeritageReturnPresentation} from './overviewHeritageScene';
import {overviewOrientationPresentation} from './overviewOrientation';
import {cityChangePresentation} from './overviewCityChange';
import {overviewVisitPresentation} from './overviewVisit';
import {overviewInteractionState,overviewInteractionStation,overviewInteractionReason} from './overviewInteraction';
import {climateLabPlaces} from '../data/climateLab';

/** Structural input keeps the presentation independent of the edited outline. */
export interface OverviewSceneBeat {
  overviewScope?:'whole';
  id:string;
  chapterId:string;
  title:string;
  recordingId:string;
  text:string;
  kind:'journey'|'atlas'|'comparison'|'orientation'|'heritage';
  stepId?:string;
  cueIndex?:number;
  comparisonStage?:'development';
  segmentId?:string;
  topic?:'regions'|'life'|'history'|'culture'|'connections'|'observation';
  moments?:readonly {token:string;title:string;explanation:string;focus?:string;year?:string|number}[];
  sources?:readonly {title:string;url:string;note?:string}[];
  detailStepId?:string;
}

type SceneProps=Omit<TibetSceneProps,'playing'|'onReady'|'onError'|'onSelect'|'onInteract'|'resetKey'>;
export interface OverviewPresentation {
  sceneIdentity:string;
  props:SceneProps;
  title:string;
  explanation:string;
  scale:string;
  year?:string;
  sourceScope?:string;
}

const clamp=(value:number)=>Number.isNaN(value)?0:Math.max(0,Math.min(1,value));
const cityIds=new Set(['lhasa','shigatse','shannan','nyingchi','chamdo','nagqu','ngari']);
const steps=chapters.flatMap(chapter=>chapter.steps.map((step,index)=>({step,index})));

function recordedTiming(timing:NarrationTiming|undefined):NarrationTiming|undefined {
  return timing&&Number.isFinite(timing.textProgress)?timing:undefined;
}

/** A fresh seek rebuilds earlier phrase patches instead of relying on the
 * previous rendered frame. The source recording fraction is never mutated. */
function cueSettings(cue:JourneyCue,initial:SceneSettings,raw:number,timing?:NarrationTiming):SceneSettings {
  let settings={...initial,...cue.settings};
  if(cue.motion)settings.progress=journeyMotionProgress(cue.motion,raw);
  const guide=visualGuideForCue(cue.id,raw,true,timing);
  if(guide?.sceneSettings){
    const textProgress=clamp(timing?.textProgress??raw);
    for(const phrase of narrationPhraseBindings(cue.id,cue.narration)) {
      if(phrase.at>textProgress)break;
      if(phrase.settings)settings={...settings,...phrase.settings};
    }
    settings={...settings,...guide.sceneSettings};
  }else for(const frame of cue.keyframes??[])if(frame.at<=raw)settings={...settings,...frame.settings};
  if(guide?.sceneProgress!==undefined)settings.progress=guide.sceneProgress;
  return settings;
}

function activeMoment(beat:OverviewSceneBeat,progress:number) {
  const moments=(beat.moments??[]).map(moment=>({
    ...moment,start:beat.text.indexOf(moment.token),
  })).sort((a,b)=>a.start-b.start);
  if(moments.some(moment=>!moment.token||moment.start<0))throw new Error(`总览讲解锚点与原文不一致：${beat.id}`);
  if(!moments.length)return {moment:undefined,local:progress};
  const position=progress*beat.text.length;
  if(position<moments[0].start)return {moment:undefined,local:0};
  let index=0;
  while(index+1<moments.length&&position>=moments[index+1].start)index++;
  const moment=moments[index],end=moments[index+1]?.start??beat.text.length;
  return {moment,local:clamp((position-moment.start)/Math.max(1,end-moment.start))};
}

function selectedFocus(focus?:string) {
  if(!focus)return '';
  if(focus.startsWith('city:')||focus.startsWith('point:'))return focus;
  return `${cityIds.has(focus)?'city':'point'}:${focus.replace(/^atlas:/,'')}`;
}

/** Display state only: callers save/seek raw, never props.progress. Native
 * words drive the actual existing models and are kept within their clip. */
function overviewBasePresentation(beat:OverviewSceneBeat,raw:number,timing?:NarrationTiming):OverviewPresentation {
  const fraction=clamp(raw),sourceTiming=recordedTiming(timing);
  const mechanism=overviewMechanismState(beat.recordingId,beat.text,fraction,sourceTiming);
  if(mechanism)return {sceneIdentity:'atlas-overview',props:{scene:'region',viewKey:'atlas',layer:'atlas-overview',step:0,season:1,progress:mechanism.progress,selected:'',cutaway:false,overviewTopic:mechanism.kind==='water'?'life':'culture',overviewMechanism:mechanism},title:mechanism.title,explanation:mechanism.reason,scale:'西藏全域背景 · 功能观察窗',sourceScope:'功能示意与真实地理分开显示；不定位未知设施，不复原文物缺失部分、具体演出或实测人数。'};
  if(beat.recordingId==='OVERVIEW-history-origins')return overviewOriginsPresentation(beat.text,fraction,sourceTiming);
  if(beat.recordingId==='OVERVIEW-place-actions')return placeActionPresentation(fraction,sourceTiming);
  if(beat.recordingId==='OVERVIEW-history-space')return historySpacePresentation(fraction,sourceTiming);
  if(['OVERVIEW-ground-rail','OVERVIEW-valley-journey'].includes(beat.recordingId))return {
    sceneIdentity:'atlas-local-context',
    props:{scene:'region',viewKey:'atlas',layer:'atlas-overview',step:0,season:1,progress:fraction,selected:'city:lhasa',cutaway:false,overviewLocalContext:true,overviewTopic:'connections',groundJourney:(beat.recordingId==='OVERVIEW-valley-journey'?valleyJourneyState:groundJourneyState)(beat.text,sourceTiming)},
    title:beat.title,explanation:'在同一地图中下降、沿真实相连铁路移动，再抬高看站区与河流、城市的关系。',
    scale:'全域 → 拉萨站前铁路 → 地形观察 → 全域',sourceScope:'2025-11-26 Sentinel-2真彩影像（源像元10米），Copernicus GLO-30地表高程（约30米），OSM现状铁路。高度1×；桥隧只释读水平走向，不提供轨面高度或街景。',
  };
  const interaction=overviewInteractionState(beat.id,beat.text,sourceTiming);
  if(interaction)return {
    sceneIdentity:'atlas-overview',
    props:{scene:'region',viewKey:'atlas',layer:'atlas-overview',step:0,season:1,progress:interaction.progress,
      selected:interaction.stage==='life'?`city:${interaction.city}`:'',cutaway:false,overviewTopic:'regions',climateLab:interaction,
      climateObservationMonth:interaction.stage==='evidence'?interaction.month:undefined,
      climateObservationStationId:overviewInteractionStation(interaction,beat.text,beat.recordingId,sourceTiming)},
    title:beat.title,explanation:overviewInteractionReason(interaction),
    scale:interaction.zoom?`${climateLabPlaces[interaction.city].name}与周边 · 同一地图放大`:'西藏与周边 · 整体地图',
    sourceScope:interaction.stage==='evidence'?'1991—2020气象站标准值；不是区域平均或预报。':'真实高程×16显示；金色为采样剖面，不是道路；气团云雨为原理示意，青色较缓样本不是建设用地。',
  };
  if(['OVERVIEW-city-change','OVERVIEW-city-change-core'].includes(beat.recordingId))return cityChangePresentation(beat,fraction,sourceTiming);
  if(beat.recordingId==='OVERVIEW-lived-city')return overviewVisitPresentation(beat,fraction,sourceTiming);
  if(beat.recordingId==='OVERVIEW-heritage-return')return overviewHeritageReturnPresentation(beat,fraction,sourceTiming);
  if(beat.kind==='orientation')return overviewOrientationPresentation(beat,fraction,sourceTiming);
  if(beat.kind==='heritage')return overviewHeritagePresentation(beat,fraction,sourceTiming);
  if(beat.kind==='journey') {
    const script=beat.stepId?journeySteps[beat.stepId]:undefined;
    const located=steps.find(item=>item.step.id===beat.stepId);
    const cueIndex=beat.cueIndex??script?.cues.findIndex(cue=>cue.id===beat.recordingId)??-1;
    const cue=script?.cues[cueIndex];
    if(!script||!located||!cue||cue.id!==beat.recordingId||cue.narration!==beat.text)
      throw new Error(`总览录音与原课程不一致：${beat.id}`);
    let settings=settingsForStep(located.step);
    for(const previous of script.cues.slice(0,cueIndex))settings=cueSettings(previous,settings,1);
    settings=cueSettings(cue,settings,fraction,sourceTiming);
    const guide=visualGuideForCue(cue.id,fraction,true,sourceTiming);
    return {
      sceneIdentity:`journey:${script.stepId}`,
      props:{...settings,scene:located.step.scene,viewKey:script.stepId,step:located.index,guide},
      title:guide?.title??beat.title,
      explanation:guide?.explanation??located.step.takeaway,
      scale:script.scale,
      sourceScope:script.timeContext,
    };
  }
  if(beat.kind==='comparison') {
    const segment=cityAccessAudioSegments.find(item=>item.id===(beat.segmentId??beat.recordingId));
    if(beat.comparisonStage!=='development'||!segment||segment.id!==beat.recordingId||segment.text!==beat.text)
      throw new Error(`总览交通录音与原段不一致：${beat.id}`);
    // raw=1 is this recording's end, not the following phase's start. The
    // original segment selector uses inclusive starts, so hold below the seam.
    const intervalFraction=Math.min(fraction,1-CITY_SCENE_END_MARGIN);
    const mapped=segment.start+(segment.end-segment.start)*intervalFraction;
    const progress=cityNarrationSceneProgress(cityAccessAudioSegments,mapped,{
      cue:{id:segment.id,text:segment.text},progress:fraction,timing:sourceTiming,
    });
    const {moment}=activeMoment(beat,clamp(sourceTiming?.textProgress??fraction));
    return {
      sceneIdentity:'atlas-comparison',
      props:{scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:4,
        season:1,progress,selected:'city:lhasa',cutaway:false,
        comparisonRelief:true,cityLifeServices:true,cityAccessTransfer:true,cityBuiltLayer:true},
      title:moment?.title??beat.title,
      explanation:moment?.explanation??'保留区域联系，核对抵达方式、真实地面接续与地方使用。',
      scale:'西藏整体地图 → 拉萨真实地面接续',
      ...(moment?.year!==undefined?{year:String(moment.year)}:{}),
      sourceScope:'有日期的开通与地方案例；现状道路不代表历史线路或当前班次。',
    };
  }
  const textProgress=clamp(sourceTiming?.textProgress??fraction);
  const {moment,local}=activeMoment(beat,textProgress);
  const focus=moment?.focus,year=moment?.year===undefined?undefined:String(moment.year);
  return {
    sceneIdentity:'atlas-overview',
    props:{scene:'region',viewKey:'atlas',layer:'atlas-overview',step:0,season:1,
      progress:local,selected:selectedFocus(focus),cutaway:false,
      overviewTopic:beat.topic??'regions',overviewFocus:focus,overviewTitle:moment?.title??beat.title,overviewYear:year,
      overviewRiver:overviewRiverState(beat.recordingId,beat.text,textProgress)},
    title:moment?.title??beat.title,
    explanation:moment?.explanation??'',
    scale:'西藏与周边 · 整体地图',year,
    sourceScope:'保留同一真实地形与现代定位；历史年代不重建古代疆域、旧城界或未知道路。',
  };
}

/** Historical whole-map readings and the real Lhasa examples share one loaded
 * model. The identity changes before loading, never after audio has started. */
export function overviewPresentation(beat:OverviewSceneBeat,raw:number,timing?:NarrationTiming):OverviewPresentation {
 const base=overviewBasePresentation(beat,raw,timing);
 const geography=narratedGeographyState(beat.recordingId,beat.text,timing);
 const presentation={...base,...(geography&&!base.props.overviewMechanism&&geography.kind!=='history'?{explanation:geography.relation}:{}),props:{...base.props,narratedGeography:geography}};
 if(beat.overviewScope!=='whole'&&['history','connections','observation'].includes(beat.chapterId))return {...presentation,sceneIdentity:'atlas-local-context',props:{...presentation.props,overviewLocalContext:true},sourceScope:`${presentation.sourceScope??''} 同一人文地图与地方窗口均以真实高程×1.8显示；当前地理不随历史年代改变。`};
 return presentation;
}
