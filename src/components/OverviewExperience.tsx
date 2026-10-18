import type {RotationFlowState} from '../data/rotationFlow';
import {rotationManualState,rotationFeedback} from '../lib/rotationFlow';
import {rotationPresentation} from '../lib/overviewRotation';
import {advanceIrrigation,irrigationFeedback,type IrrigationState} from '../data/overviewIrrigation';
import {observationChoices} from '../data/overviewObservation';
import {appendOverviewObservation} from '../lib/overviewObservation';
import {readExploration,writeExploration,type Exploration} from '../lib/store';
import OverviewLearningGuide from './OverviewLearningGuide';
import OverviewUnderstanding from './OverviewUnderstanding';
import {editorialChanges} from '../data/overviewEditorial';
import type {PlaceActionState} from '../data/overviewPlaceActions';
import {overviewMechanismFeedback} from '../lib/overviewMechanisms';
import {overviewNextReason,overviewResumeAliases} from '../data/overviewLogic';
import type {OverviewMechanismState} from '../data/overviewMechanisms';
import OverviewGroundControls from './OverviewGroundControls';
import {groundFeedback,type GroundJourneyState,type GroundReading} from '../lib/groundJourney';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type SyntheticEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowCounterClockwise,BookOpenText,GlobeHemisphereEast,Pause,Play,SpeakerHigh,SpeakerSlash} from '@phosphor-icons/react';
import TibetScene from '../scene/TibetScene';
import {overviewMainProgram,overviewDepthPrograms,overviewPrograms,type OverviewProgram} from '../data/overviewProgram';
import {overviewPresentation} from '../lib/overviewScene';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import NarrationCaption from './NarrationCaption';
import OverviewHistoryLine from './OverviewHistoryLine';
import OverviewHeritageReading from './OverviewHeritageReading';
import {overviewHeritagePresentation as heritageEvidence} from '../data/overviewHeritageEvidence';
import {overviewShot} from '../lib/overviewShot';
import {isUrbanPixelView,urbanComparison,urbanComparisonYears,urbanPixelCounts,type UrbanComparisonYear} from '../lib/overviewUrbanComparison';
import OverviewInteractionControls from './OverviewInteractionControls';
import {climateLabLifeFocus,climateLabPlaces,type ClimateLabState} from '../data/climateLab';
import {overviewInteractionFeedback,overviewInteractionReason,overviewInteractionPatch} from '../lib/overviewInteraction';
import {currentClimateLabReading,type ClimateLabReading} from '../lib/climateLabProcess';
import './OverviewExperience.css';

const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;

interface Props {onHome:()=>void;onDetail:(stepId:string)=>void;onDirectory:()=>void;onMap:()=>void;onSavePlan?:(saved:Exploration)=>void}

/** One persistent stage and one recording clock for the complete introduction.
 * Chapters explain a single question before permitting optional detail. */
const programFromHash=()=>{const params=new URLSearchParams(location.hash.split('?')[1]||'');const origin=readExploration().overviewObservations?.[params.get('returnStop')||''];return overviewPrograms.find(p=>p.id===(origin?.programId??params.get('topic')))??overviewMainProgram;};
export default function OverviewExperience(props:Props){
 const [program,setProgram]=useState(programFromHash);
 useEffect(()=>{const sync=()=>setProgram(programFromHash());window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
 return <OverviewPlayback key={program.id} {...props} program={program}/>;
}
function OverviewPlayback({onHome,onDetail,onDirectory,onMap,onSavePlan,program}:Props & {program:OverviewProgram}){
 const overviewBeats=program.beats,overviewChapters=program.chapters,isMain=program.id==='main';
 const [groundOverride,setGroundOverride]=useState<{id:string;state:GroundJourneyState}>();
 const playbackBeats=useMemo(()=>overviewBeats.map(beat=>({...beat,sceneIdentity:groundOverride?.id===beat.id?'atlas-local-context':overviewPresentation(beat,0).sceneIdentity})),[overviewBeats,groundOverride?.id]);
 const director=useOverviewDirector({beats:playbackBeats,resumeAliases:isMain?overviewResumeAliases:undefined,storageKey:`tibet-explorer.overview-six.v1.${program.id}`});
 const beat=overviewBeats[director.beatIndex],chapter=overviewChapters.find(item=>item.beats.some(b=>b.id===beat.id))!;
 const [planNotice,setPlanNotice]=useState('');
 const observations=observationChoices(beat);
 const [observationChoice,setObservationChoice]=useState('');
 const observation=observations.find(o=>o.stopId===observationChoice)??observations[0];
 const openObservation=()=>{
  director.pause();if(!observation)return;
  const next=appendOverviewObservation(readExploration(),observation.stopId,{programId:program.id,beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw:director.raw,voice:director.voice,title:beat.title,question:observation.question,sources:[...observation.sources]});
  if(!writeExploration(next)){setPlanNotice('观察计划未能保存，请检查浏览器存储后重试；讲述位置仍保留。');return;}
  onSavePlan?.(next);location.hash=`/observation-plan?stop=${observation.stopId}`;
 };
 const chapterIndex=overviewChapters.indexOf(chapter),localIndex=chapter.beats.findIndex(item=>item.id===beat.id);
 const currentStage=chapter.stages?.find(stage=>stage.beatIds.includes(beat.id));
 const beatWindowStart=chapter.beats.length>5?Math.max(0,Math.min(localIndex-1,chapter.beats.length-3)):0;
 const visibleBeats=chapter.beats.length>5?chapter.beats.slice(beatWindowStart,beatWindowStart+3):chapter.beats;
 const [groundSample,setGroundReading]=useState<GroundReading & {beatId:string}>();
 const groundReading=groundSample?.beatId===beat.id?groundSample:undefined;
 const onGroundReading=useCallback((reading:GroundReading)=>setGroundReading({...reading,beatId:beat.id}),[beat.id]);
 const [irrigationOverride,setIrrigationOverride]=useState<{id:string;state:IrrigationState}>();
 const [placeOverride,setPlaceOverride]=useState<{id:string;state:PlaceActionState}>();
 const [bridgeOverride,setBridgeOverride]=useState<{id:string;connected:boolean}>();
 const [urbanYear,setUrbanYear]=useState<UrbanComparisonYear>();
 const [interactionOverride,setInteractionOverride]=useState<{id:string;state:ClimateLabState}>();
 const [interactionSample,setInteractionReading]=useState<{beatId:string;reading:ClimateLabReading}>();
 const onInteractionReading=useCallback((value:ClimateLabReading)=>setInteractionReading({beatId:beat.id,reading:value}),[beat.id]);
 const [rotationOverride,setRotationOverride]=useState<{id:string;state:RotationFlowState}>();
 const recordedPresentation=overviewPresentation(beat,director.raw,director.timing);
 const rotationManual=rotationOverride?.id===beat.id;
 const rotation=rotationManual?rotationOverride.state:recordedPresentation.props.rotationFlow;
 const narratedPresentation=rotationManual&&rotation?rotationPresentation(rotation):recordedPresentation;
 const [mechanismOverride,setMechanismOverride]=useState<{id:string;state:OverviewMechanismState}>();
 const mechanismManual=mechanismOverride?.id===beat.id;
 const mechanism=mechanismManual?mechanismOverride.state:narratedPresentation.props.overviewMechanism;
 const bridgeManual=bridgeOverride?.id===beat.id;
 const change=narratedPresentation.props.overviewCityChange;
 const bridgeFeedback=bridgeOverride?.connected?'新桥接回：车辆已能越过拉萨河，进入北岸道路。连接仍需车辆和组织才能成为服务。':'只移除柳梧大桥：车辆停在南岸接桥处。其他现状地物保留；这不表示2007年前无其他过河方式。';
 const bridgePresentation=bridgeManual&&change?{...narratedPresentation,props:{...narratedPresentation.props,overviewReturnMix:0,overviewBarkhor:undefined,overviewVisit:{phase:'crossing' as const,progress:1,motion:1},overviewCityChange:{phase:bridgeOverride.connected?'opening' as const:'missing' as const,progress:1,motion:1,bridge:bridgeOverride.connected?1:0}}}:narratedPresentation;
 const placeManual=placeOverride?.id===beat.id;
 const placeAction=placeManual?placeOverride.state:narratedPresentation.props.overviewPlaceAction;
 const placeFeedback=placeAction?.phase==='public'?'现状广场中的行走与停留：活动只是公共使用的例子；报告中的搬迁住户未被定位到猜测的地块。':(placeAction?.separation??0)>=.99?'多数供灯转至寺前，供灯继续；火源与木构分开。寺前仅示方向。':(placeAction?.separation??0)>0?'同一张地图对照：建筑上多数灯光退去，寺前供灯示意亮起。':'对照活动原有关系：木构与供灯放在一起阅读，不表示这些符号就是历史灯位。';
 const placePresentation=placeManual&&placeAction?{...bridgePresentation,scale:placeAction.phase==='public'?'拉萨 · 布达拉宫与现状广场':'拉萨 · 大昭寺与寺前空间',props:{...bridgePresentation.props,overviewReturnMix:0,overviewPlaceAction:placeAction,overviewUrban:{phase:placeAction.phase==='public'?'plaza' as const:'barkhor' as const,progress:1,year:2005,showChange:false}}}:bridgePresentation;
 const irrigationManual=irrigationOverride?.id===beat.id;
 const irrigation=irrigationManual?irrigationOverride.state:narratedPresentation.props.overviewIrrigation;
 const irrigationView=irrigationManual?{...placePresentation,scale:'狮泉河 · 同一地图上的设施与管护',props:{...placePresentation.props,overviewReturnMix:0,overviewIrrigation:irrigation}}:placePresentation;
 const basePresentation=urbanComparison({...irrigationView,props:{...irrigationView.props,overviewMechanism:mechanism}},urbanYear);
 const interactionManual=interactionOverride?.id===beat.id;
 const interaction=interactionManual?interactionOverride.state:basePresentation.props.climateLab;
 const interactionReading=currentClimateLabReading(interaction,interactionSample?.beatId===beat.id?interactionSample.reading:undefined);
 const interactionPresentation=interaction?{...basePresentation,scale:interaction.stage==='air'&&(interaction.airFocus??0)>.15?'真实高程剖面与周边 · 云雨侧俯视':climateLabLifeFocus(interaction)>.15?`${climateLabPlaces[interaction.city].name}与周边 · 同一地图放大`:'西藏与周边 · 整体地图',props:{...basePresentation.props,climateLab:interaction,progress:interaction.progress,selected:interaction.stage==='life'?`city:${interaction.city}`:'',climateObservationMonth:interaction.stage==='evidence'?interaction.month:undefined,climateObservationStationId:interactionManual?undefined:basePresentation.props.climateObservationStationId}}:basePresentation;
 const groundManual=groundOverride?.id===beat.id;
 const ground=groundManual?groundOverride.state:interactionPresentation.props.groundJourney;
 const presentation=ground?{...interactionPresentation,sceneIdentity:'atlas-local-context',scale:ground.returnMix>.99?'西藏全域 · 拉萨定位':ground.returnMix>.05?ground.stage==='return'?'拉萨河谷 → 西藏全域':'西藏全域 → 拉萨河谷':`拉萨站前 · 地形高度1× · 观察高度${Math.round(ground.height)}米`,props:{...interactionPresentation.props,scene:'region' as const,viewKey:'atlas',layer:'atlas-overview',overviewLocalContext:true,climateLab:undefined,groundJourney:ground}}:interactionPresentation;
 const pixelView=isUrbanPixelView(presentation),urbanManual=pixelView&&urbanYear!==undefined;
 const pixelCounts=pixelView?urbanPixelCounts(presentation.props.overviewUrban!.year):undefined;
 const shot=overviewShot(beat,director.raw,director.timing);
 const evidence=heritageEvidence(beat.recordingId,beat.text,director.timing?.textProgress??director.raw);
 const phaseName=rotation?rotation.phase==='arrival'?'回到亚洲':rotationManual?'手动对照':'地球自转与气流':groundManual?'沿线观察':interaction?(interaction.zoom?'走近地区':interaction.stage==='life'&&(director.timing?.textProgress??0)*beat.text.length>=beat.text.indexOf('回到全域')?'回到整体':'整体对照'):beat.recordingId==='OVERVIEW-heritage-return'?'回到整体':beat.kind==='heritage'&&shot.phase==='whole'?'保留城市背景':{whole:'先看整体',context:'建立来路',evidence:'走近证据',return:'回到整体'}[shot.phase];
 const [engineRevision,setEngineRevision]=useState(0),[resetKey,setResetKey]=useState(0),[moisture,setMoisture]=useState<'higher'|'lower'>(),[cutaway,setCutaway]=useState<boolean>();
 const [showStreetUses,setShowStreetUses]=useState(true);
 const [durations,setDurations]=useState<Record<string,number>>({});
 const activeChapter=useRef<HTMLButtonElement|null>(null);
 const readingPanel=useRef<HTMLElement|null>(null);
 const readyToken=useMemo(()=>({active:true,frame:0}),[presentation.sceneIdentity,engineRevision]);
 useLayoutEffect(()=>{readyToken.active=true;return()=>{readyToken.active=false;if(readyToken.frame)cancelAnimationFrame(readyToken.frame);};},[readyToken]);
 const sceneReady=useCallback(()=>{if(!readyToken.active)return;if(readyToken.frame)cancelAnimationFrame(readyToken.frame);readyToken.frame=requestAnimationFrame(()=>{readyToken.frame=0;if(readyToken.active)director.onSceneReady(presentation.sceneIdentity);});},[readyToken,director.onSceneReady,presentation.sceneIdentity]);
 const sceneError=useCallback((message:string)=>{readyToken.active=false;if(readyToken.frame)cancelAnimationFrame(readyToken.frame);director.onSceneError(presentation.sceneIdentity,message);},[readyToken,director.onSceneError,presentation.sceneIdentity]);
 useEffect(()=>{
  const startFromEntry=()=>{
   const [route,query]=location.hash.split('?');if(route!=='#/overview')return;
   const params=new URLSearchParams(query||'');
   const returnStop=params.get('returnStop');
   if(returnStop){const origin=readExploration().overviewObservations?.[returnStop];const index=origin?overviewBeats.findIndex(b=>b.id===origin.beatId):-1;
    if(origin&&index>=0){const same=overviewBeats[index].recordingId===origin.recordingId&&overviewBeats[index].text===origin.text;const raw=same?origin.raw:0;if(index!==director.beatIndex){director.select(index);director.seek(raw);}else if(director.raw!==raw)director.seek(raw);director.setVoice(origin.voice);setPlanNotice(same?'已回到原讲述位置，点击继续演示。':'这一段讲解已更新，已回到新版段首。');}
    params.delete('returnStop');if(program.id!=='main')params.set('topic',program.id);history.replaceState(history.state,'',`${location.pathname}${location.search}#/overview${params.size?`?${params}`:''}`);return;
   }
   if(params.get('explore')==='climate'){director.select(overviewBeats.findIndex(b=>b.id==='LAB-air-higher'));params.delete('explore');history.replaceState(history.state,'',`${location.pathname}${location.search}#/overview`);return;}
   const chapterId=params.get('chapter');
   if(chapterId){const target=overviewChapters.find(c=>c.id===chapterId);if(target){director.select(overviewBeats.findIndex(b=>b.id===target.beats[0].id));params.delete('chapter');history.replaceState(history.state,'',`${location.pathname}${location.search}#/overview${params.size?`?${params}`:''}`);}return;}
   if(params.get('start')!=='1')return;
   director.select(0);params.delete('start');
   history.replaceState(history.state,'',`${location.pathname}${location.search}#/overview${params.size?`?${params}`:''}`);
  };
  startFromEntry();window.addEventListener('hashchange',startFromEntry);
  return()=>window.removeEventListener('hashchange',startFromEntry);
 },[director.select,overviewBeats,overviewChapters]);
 useEffect(()=>{
  const abort=new AbortController();
  void fetch('/assets/audio/narration/cue-manifest.json',{signal:abort.signal,cache:'no-cache'}).then(response=>response.ok?response.json():undefined).then(manifest=>{
   if(abort.signal.aborted||!Array.isArray(manifest?.clips))return;
   const result:Record<string,number>={};for(const item of overviewBeats){const clip=manifest.clips.find((clip:{cueId:string;text:string;duration:number})=>clip.cueId===item.recordingId&&clip.text===item.text);if(clip&&Number.isFinite(clip.duration))result[item.id]=clip.duration;}
   setDurations(result);
  }).catch(()=>{});return()=>abort.abort();
 },[overviewBeats]);
 // The scene publishes its first DEM reading during the same commit. Clearing
 // it afterwards loses the value until the probe moves to another sample.
 useEffect(()=>{setMoisture(undefined);setCutaway(undefined);setShowStreetUses(true);setMechanismOverride(undefined);setUrbanYear(undefined);},[beat.id]);
 useEffect(()=>{activeChapter.current?.scrollIntoView({block:'nearest',inline:'center'});},[chapter.id]);
 useEffect(()=>{readingPanel.current?.scrollTo({top:0});},[beat.id]);
 const total=useMemo(()=>overviewBeats.reduce((sum,item)=>sum+(durations[item.id]||0),0),[durations,overviewBeats]);
 const elapsed=overviewBeats.slice(0,director.beatIndex).reduce((sum,item)=>sum+(durations[item.id]||0),0)+(durations[beat.id]||0)*director.raw;
 const complete=director.beatIndex===overviewBeats.length-1&&director.raw>=1;
 const manual=rotationManual||irrigationManual||placeManual||bridgeManual||mechanismManual||groundManual||interactionManual||moisture!==undefined||cutaway!==undefined||!showStreetUses||urbanManual;
 const clearManual=()=>{setRotationOverride(undefined);setIrrigationOverride(undefined);setPlaceOverride(undefined);setBridgeOverride(undefined);setGroundOverride(undefined);setInteractionOverride(undefined);setMoisture(undefined);setCutaway(undefined);setShowStreetUses(true);setMechanismOverride(undefined);setUrbanYear(undefined);};
 const select=(index:number)=>{clearManual();if(index!==director.beatIndex||director.raw!==0)setGroundReading(undefined);director.select(index);};
 const play=()=>{clearManual();if((interaction||rotation)&&!director.wantsPlayback)setResetKey(v=>v+1);director.playPause();};
 const changeRotation=(patch:Partial<Pick<RotationFlowState,'enabled'|'direction'|'progress'>>)=>{if(!rotation)return;director.pause();setRotationOverride({id:beat.id,state:rotationManualState(rotation,patch)});};
 const changeGround=(patch:Partial<GroundJourneyState>)=>{director.pause();if(!ground)setGroundReading(undefined);setGroundOverride({id:beat.id,state:{height:1800,bearing:0,...ground,progress:groundReading?groundReading.distanceMetres/groundReading.totalMetres:.3,...patch,returnMix:0,railPhase:undefined,connectionMix:0,stage:undefined}});};
 const changeInteraction=(patch:Partial<ClimateLabState>)=>{if(!interaction)return;director.pause();setInteractionOverride({id:beat.id,state:overviewInteractionPatch(interaction,patch)});};
 // Comparing places is an observation within the paused sentence. Only the
 // chapter/beat navigation may change the recording or its saved position.
 const selectInteractionCity=(city:string)=>{if(interaction?.stage!=='life'||!Object.hasOwn(climateLabPlaces,city))return;changeInteraction({city:city as ClimateLabState['city'],zoom:true});};
 const selectMap=(id:string)=>{director.pause();if(ground&&id.startsWith('ground-rail:')){const progress=Number(id.slice('ground-rail:'.length));if(Number.isFinite(progress))changeGround({progress:Math.max(0,Math.min(1,progress)),lookAt:undefined});return;}if(!interaction)return;if(id.startsWith('lab-probe:'))changeInteraction({progress:Number(id.split(':')[1])});else if(interaction.stage==='life'){const city=id.replace(/^(city:|atlas:)/,'');if(city in climateLabPlaces)selectInteractionCity(city);}};
 const navigate=(action:()=>void)=>{director.pause();action();};
 const disclosure=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)director.pause();};
 const nextReason=isMain?overviewNextReason[beat.id]??chapter.nextQuestion:chapter.nextQuestion;
 const changeIrrigation=(patch:Partial<IrrigationState>|'advance'|'reset')=>{if(!irrigation)return;director.pause();const state=patch==='advance'?advanceIrrigation(irrigation):patch==='reset'?{...irrigation,phase:'closed' as const,gate:false,cleared:false,delivered:0,flowing:false}: {...irrigation,...patch,flowing:false};setIrrigationOverride({id:beat.id,state});};
 const taskKind=irrigation?'irrigation':ground?'ground':mechanism?.kind??(change?'bridge':placeAction?(placeAction.caseId==='jokhang'?'jokhang':'place'):interaction?.stage);
 const caption=director.timing?.caption||beat.text.split(/[。；]/u)[0]+'。';
 const pending=director.wantsPlayback&&!director.playing;
 return <main className={`overview-experience${ground?' overview-ground-mode':''}`}>
  <header className="overview-header"><button className="overview-brand" onClick={()=>navigate(onHome)}><GlobeHemisphereEast size={21}/><span>西藏探索</span></button><p>{isMain?"完整认识西藏":"延伸阅读"}<span>{isMain?"六个核心问题 · 从整体到地方":program.title}</span></p><nav aria-label="总览与深入"><button className="project-review-entry" onClick={()=>navigate(()=>{location.hash="/observation-plan";})}>观察计划</button><button className="project-review-entry" onClick={()=>navigate(()=>{location.assign("/project-review/index.html");})} title="最初思路、阶段验收与后续处理方案">项目说明</button><button className={!isMain?"overview-return":undefined} aria-current={isMain?"page":undefined} onClick={()=>navigate(()=>{location.hash="/overview";})}>{isMain?"完整演示":"返回认识主线"}</button><button onClick={()=>navigate(onMap)}>地图图鉴</button><button onClick={()=>navigate(onDirectory)}>全部专题</button><button onClick={()=>navigate(onHome)}>探索目录</button></nav></header>
  <div className="overview-body">
   <section className={`overview-stage${presentation.props.layer==='atlas-city-comparison'?' is-local-reading':''}`} aria-label="完整认识西藏的连续三维演示">
    <div className="overview-scene"><TibetScene key={engineRevision} {...presentation.props} cityLifeServices={presentation.props.overviewBarkhor?showStreetUses:presentation.props.cityLifeServices} overviewPresentation overviewShot={shot} overviewEvidenceWidth={(evidence?.presence??0)*240} playing={director.playing} resetKey={resetKey} airMoisture={moisture??presentation.props.airMoisture} cutaway={cutaway??presentation.props.cutaway} onGroundJourneyReading={onGroundReading} onClimateLabReading={onInteractionReading} onInteract={director.pause} onSelect={selectMap} onReady={sceneReady} onError={sceneError}/></div>
    <div className="overview-scale"><span>当前尺度</span><strong>{presentation.scale}</strong>{presentation.year&&<em>{presentation.year}</em>}</div>
    {rotation&&<div className="overview-interaction-key"><strong>{rotation.phase==='arrival'?'来流联系示意 · 不是刚才的试验轨迹':rotation.phase==='pressure'?'金色箭头：气压差推动方向 · 高低压位置为教学设定':rotation.phase==='latitude'?'同角速度：两圈光标转过相同角度':'地面参照 · 虚线为无自转路径，实线为当前对照'}</strong><small>{rotation.phase==='arrival'?'接着区分：水平偏转 → 地形绕行与抬升':rotation.phase==='latitude'?'两圈光标转过相同角度，低纬走过更长距离':'轨迹按简化角动量模型计算 · 非实测风场'}</small></div>}
    {interaction&&!ground&&<div className="overview-interaction-key"><strong>{interaction.stage==='air'?'金线：真实高程 · 青色气团与云雨：原理示意':interaction.stage==='evidence'?'1991—2020气象站标准值 · 三站同一柱高比例':'金线：真实高程剖面 · 青色：较低较缓样本'}</strong>{interactionReading&&interaction.stage==='air'&&<small>当前地面样本 ≈{Math.round(interactionReading.ground/10)*10}米 · 地形高度×16显示 · 气团大小为示意</small>}</div>}
    {interaction?.stage==='air'&&(interaction.airFocus??0)>.15&&!ground&&<div className="overview-interaction-locator"><span>全域定位 · 金点为当前气团</span><div/></div>}
    {interaction?.stage==='life'&&climateLabLifeFocus(interaction)>.15&&!ground&&<div className="overview-interaction-locator"><span>全域定位 · 金点为当前地区</span><div/><button onClick={()=>changeInteraction({zoom:false})}>回到整体地图</button></div>}

    {presentation.props.overviewVisit&&!change&&<div className="overview-street-key" data-visit-phase={presentation.props.overviewVisit.phase} data-visit-motion={presentation.props.overviewVisit.motion.toFixed(4)}><strong>{presentation.props.overviewBarkhor?'进入以后，还要理解怎样使用':'从站区到城市：接续仍在发生'}</strong><span>{presentation.props.overviewBarkhor?'青色 · 广场与街巷；金色 · 活动示意':'车辆沿归档相连道路前进'}</span><small>{presentation.props.overviewBarkhor?'车辆停在已知路端，未延伸到寺院入口。活动非实测客流。':'同一河谷里的道路与跨河位置；移动不是行程时长或当前公交。'}</small></div>}
    {beat.recordingId==='OVERVIEW-lhasa-urban-change'&&presentation.props.overviewUrban&&<div className="overview-street-key overview-urban-key" data-urban-phase={presentation.props.overviewUrban.phase} data-urban-year={presentation.props.overviewUrban.year} data-urban-manual={urbanManual}>
      {pixelView?<><strong>同一河谷 · 聚居地检出对照</strong><div className="overview-urban-years" role="group" aria-label="同一视角对照年份">{urbanComparisonYears.map(year=><button key={year} aria-pressed={presentation.props.overviewUrban!.year===year} onClick={()=>{director.pause();setUrbanYear(year);}}>{year}</button>)}</div><span className="urban-baseline">青色：1985年已检出</span><span className="urban-later">金色：1986年至所选年后续检出</span><small>虚线：资料观察窗，非城市边界<br/>DLR · 30米像元；地标仅作位置参照</small>{urbanManual&&<button onClick={()=>setUrbanYear(undefined)}>回到讲述画面（保持暂停）</button>}</>:<><strong>{presentation.props.overviewUrban.phase==='plaza'?'广场：公共使用与搬迁':presentation.props.overviewUrban.phase==='barkhor'?'八廓街：保护与居住改善':'历史地标与现代城市同图'}</strong><small>当前地物用于定位；报告年份不等于几何测绘年份</small></>}
    </div>}
    {!mechanism&&<OverviewHistoryLine year={presentation.year} topic={presentation.props.overviewTopic} compact={isMain}/>}
    <OverviewHeritageReading recordingId={beat.recordingId} text={beat.text} textProgress={director.timing?.textProgress??director.raw} onInspect={director.pause}/>
    <div className="overview-map-actions"><button aria-label="恢复本段观察角度" onClick={()=>{director.pause();setResetKey(value=>value+1);}}><ArrowCounterClockwise size={17}/></button><span>拖动旋转 · 滚动缩放 · 操作会暂停</span></div>
    {!director.ready&&!director.error&&<div className="overview-preparing" role="status"><GlobeHemisphereEast size={24}/><p>{pending?'正在准备下一段画面，讲解会在就绪后继续':'正在准备这一章的三维场景'}</p></div>}
    {director.error&&<div className="overview-error" role="alert"><h2>这一段暂时无法继续</h2><p>{director.error}</p><button onClick={()=>{director.retryScene();setEngineRevision(value=>value+1);}}>重新准备本段</button></div>}
    <div className="overview-caption" data-ground-active={Boolean(ground)} data-ground-progress={ground?.progress} data-ground-height={ground?.height} data-ground-manual={groundManual} data-interaction={interaction?.stage} data-interaction-zoom={interaction?.zoom} data-interaction-moisture={interaction?.moisture} data-interaction-manual={interactionManual} data-interaction-city={interaction?.city} data-rotation-phase={rotation?.phase} data-rotation-enabled={rotation?.enabled} data-rotation-progress={rotation?.progress} data-rotation-direction={rotation?.direction} data-overview-beat={beat.id} data-overview-scene={presentation.sceneIdentity} data-overview-shot={shot.id} data-shot-phase={shot.phase} data-scene-progress={presentation.props.progress.toFixed(4)}><div><span>{String(chapterIndex+1).padStart(2,'0')} / {overviewChapters.length} · {chapter.title} · {phaseName}</span><span>{manual?'手动观察，讲解已暂停':director.playing?'跟随讲述':pending?'准备接续':complete?(isMain?'完整演示结束':'专题结束'):'已暂停'}</span></div>{currentStage&&<div className="overview-learning-path" aria-label="本章因果顺序">{chapter.stages!.map((stage,index)=><span key={stage.title} aria-current={stage===currentStage?'step':undefined}>{index>0?'→ ':''}{stage.title}</span>)}<small>{currentStage.reason}</small></div>}<p>{rotationManual&&rotation?rotationFeedback(rotation):irrigationManual&&irrigation?irrigationFeedback(irrigation):placeManual?placeFeedback:bridgeManual?bridgeFeedback:mechanismManual&&mechanism?overviewMechanismFeedback(mechanism):groundManual?groundFeedback(ground!,groundReading):interactionManual&&interaction?overviewInteractionFeedback(interaction,interactionReading):urbanManual?`对照${urbanYear}年：${urbanYear===1985?"先记住青色基底，再切换年份看后续检出。":"看金色范围怎样分布在青色基底周围。"}继续播放将恢复讲述。`:<NarrationCaption text={caption} timing={director.timing}/>}</p></div>
   </section>
   <aside ref={readingPanel} className="overview-reading" aria-label="当前问题与讲述逻辑">
    <p className="overview-eyebrow">{String(chapterIndex+1).padStart(2,'0')} / {overviewChapters.length} · {chapter.title}</p>
    <h1>{chapter.question}</h1>
    {planNotice&&<p role="status">{planNotice}</p>}
    {observation&&<section className="overview-observation-handoff" aria-label="从主线生成观察任务"><strong>{beat.id==='OVERVIEW-conclusion'?'把这一程变成自己的观察计划':'带着这个问题继续观察'}</strong>{observations.length>1?<label>选择刚认识的地方<select aria-label="观察地点" value={observation.stopId} onChange={e=>{director.pause();setObservationChoice(e.target.value);}}>{observations.map(o=><option key={o.stopId} value={o.stopId}>{o.place}</option>)}</select></label>:<span>{observation.place}</span>}<p>{observation.question}</p><button onClick={openObservation}>带入观察计划 · 编辑与保存</button><small>携带本段位置与对应资料；保留已有笔记，返回时继续原讲述。</small></section>}
    {rotation&&<section className="overview-interaction rotation-controls" aria-label="自转与气流对照">
     <strong>同一地球，改变一个条件</strong>
     <p>保持起点、南北方向与进度，比较实线和原经线。操作会暂停语音。</p>
     <div role="group" aria-label="自转条件"><button aria-pressed={!rotation.enabled} onClick={()=>changeRotation({enabled:false})}>去掉自转项</button><button aria-pressed={rotation.enabled} onClick={()=>changeRotation({enabled:true})}>加入自转项</button></div>
     <div role="group" aria-label="气流南北方向"><button aria-pressed={rotation.direction==='north'} onClick={()=>changeRotation({direction:'north'})}>向北：20°N → 40°N</button><button aria-pressed={rotation.direction==='south'} onClick={()=>changeRotation({direction:'south'})}>向南：40°N → 20°N</button></div>
     <label>拖动空气，比较同一时刻<input aria-label="自转对照过程" type="range" min="0" max="1" step=".005" value={rotation.progress} onChange={e=>changeRotation({progress:Number(e.target.value)})}/></label>
     <p className="interaction-boundary">固定南北运动，忽略摩擦与东西向力矩；虚线是无自转参照，非天气预报。离地高度与符号大小为示意；底图随地面观察，纬圈光标表示自转方向。</p>
     {rotationManual?<><small role="status">原讲述位置已保留；切换条件不会跳段。</small><button className="interaction-resume" onClick={play}>恢复原条件，从暂停处继续</button></>:<small>讲解会依次演示无自转、向北右偏、向南右偏，再回到亚洲来流。</small>}
    </section>}
    {taskKind&&<OverviewLearningGuide key={`${beat.id}:${taskKind}`} kind={taskKind} manual={manual} onPause={director.pause} onResume={play}/>}
    {mechanism&&<div className="overview-mechanism-note" data-mechanism={mechanism.kind} data-mechanism-progress={mechanism.progress.toFixed(4)}>功能观察窗 · 非实地复原 · 地图保留地区背景</div>}
    {irrigation&&<div className="overview-street-key overview-change-controls" data-irrigation-delivered={irrigation.delivered} data-irrigation-flowing={irrigation.flowing}><strong>狮泉河 · 设施与持续管护</strong><span>2023年报道：伦珠挡水开闸 · 次仁桑卓清渠巡护</span><div role="group" aria-label="检验供水与管护"><button aria-pressed={irrigation.gate} onClick={()=>changeIrrigation({gate:!irrigation.gate})}>{irrigation.gate?'关闭闸门':'打开闸门'}</button><button aria-pressed={irrigation.cleared} onClick={()=>changeIrrigation({cleared:!irrigation.cleared})}>{irrigation.cleared?'对照未清渠':'完成清渠'}</button><button onClick={()=>changeIrrigation('advance')}>推进一次供水</button><button onClick={()=>changeIrrigation('reset')}>重新对照</button></div><p role="status">{irrigation.delivered===0?'尚未补水':irrigation.delivered>=1?'本次示意补水完成':'已完成部分补水'} · {irrigationFeedback(irrigation)}</p><small>蓝色沿真实渠线示意通水；林地色块为补水结果示意，不是实测水量或报道地块。未定位闸口、支渠或灌区；未清渠对照假设渠段不通，非报道故障。</small></div>}
    {placeAction&&<div className="overview-street-key overview-change-controls" data-place-action={placeAction.phase} data-place-separation={placeAction.separation}><strong>{placeAction.caseId==='jokhang'?'2005年监测记录 · 大昭寺供灯空间调整':'2005年监测记录 · 活动与公共空间'}</strong><span>{placeAction.caseId==='jokhang'?'现状地物定位；金色灯光为供灯关系示意':'现状地物定位；金色灯光与人物为关系示意'}</span><div role="group" aria-label="对照保护与公共使用">{[{title:'供灯原有关系',phase:'lamps',separation:0,activity:0},{title:'供灯空间分开',phase:'separate',separation:1,activity:0},{title:'广场行走与停留',phase:'public',separation:1,activity:1}].filter(option=>placeAction.caseId!=='jokhang'||option.phase!=='public').map(option=><button key={option.phase} aria-pressed={placeManual&&placeAction.phase===option.phase} onClick={()=>{director.pause();setPlaceOverride({id:beat.id,state:{...placeAction,phase:option.phase as PlaceActionState['phase'],progress:1,separation:option.separation,activity:option.activity}});}}>{option.title}</button>)}</div>{placeAction.caseId==='jokhang'&&<label>对照活动空间：原有关系 ↔ 报告记录的调整<input type="range" min="0" max="1" step="0.01" aria-label="供灯空间对照" value={placeAction.separation} onChange={e=>{director.pause();const separation=Number(e.target.value);setPlaceOverride({id:beat.id,state:{...placeAction,phase:separation===0?'lamps':'separate',progress:1,separation,activity:0}});}}/><small>拖动比较使用关系；不是施工进度或历史年份。</small></label>}<small>2005年是报告年份；现状地物定位，灯光非实际灯数，寺前符号非供灯室测绘。</small></div>}
    {change&&<div className="overview-street-key overview-change-controls" data-city-change={presentation.props.overviewCityChange?.phase} data-bridge-available={presentation.props.overviewCityChange?.bridge}><strong>站区 → 跨河 → 城区 → 服务</strong><span>桥面接续对照 · 现状地理底图</span><div role="group" aria-label="检验柳梧大桥的连接作用"><button aria-pressed={bridgeManual&&!bridgeOverride.connected} onClick={()=>{director.pause();setBridgeOverride({id:beat.id,connected:false});}}>拿掉这座桥</button><button aria-pressed={bridgeManual&&bridgeOverride.connected} onClick={()=>{director.pause();setBridgeOverride({id:beat.id,connected:true});}}>接回这座桥</button></div><small>金色为接续阅读带；车辆与桥面显现为教学示意，不是历史车流或施工过程。</small></div>}
    {presentation.props.overviewBarkhor&&!presentation.props.overviewVisit&&<div className="overview-street-key" data-barkhor-phase={presentation.props.overviewBarkhor.phase} data-barkhor-motion={presentation.props.overviewBarkhor.motion.toFixed(4)}><span>金色 · 寺院与活动标记</span><span>青色 · 广场与步行街巷</span><span>赭色 · 商业用地内建筑</span><small>现状地物；活动非人数，建筑高度为显示符号</small><button aria-pressed={showStreetUses} onClick={()=>{director.pause();setShowStreetUses(value=>!value);}}>{showStreetUses?'对照：只看地物':'恢复讲述用途'}</button>{!showStreetUses&&<p role="status">已隐藏通行与用途强调，保留现状地物。恢复后可对照街巷、广场与周边建筑。</p>}</div>}
    {ground&&<div className="overview-ground-key"><strong>{ground.returnMix>.05?'同一地图 · 从整体认识地方':'青藏线 → 拉萨站 → 城市接续'}</strong><span>{ground.returnMix>.05?ground.stage==='return'?'带回整体：地形、交通与生活的联系':'沿拉萨站前铁路，观察山谷、河流与城市':'点选线路换位置 · 金色已观察 / 青色前方'}</span><small>{ground.returnMix>.05?'局部影像窗口有范围，区域背景仍保留':'虚线为隧道投影 · 地表高程不是轨面高程'}</small></div>}
    {presentation.props.overviewRiver&&<div className="overview-ground-key" data-river-active={presentation.props.overviewRiver.emphasized} data-river-reveal={presentation.props.overviewRiver.reveal.toFixed(4)}><strong>雅鲁藏布江 · 沿干流认识上下游</strong><span>{presentation.props.overviewRiver.emphasized?'沿资料河道推进：上游过程 → 下游使用':'青色河道保留为地区联系背景'}</span><small>概览河道 · 金色为讲解进度，非流速或河宽</small></div>}
    {presentation.props.narratedGeography&&!ground&&<div className="overview-ground-key overview-geography-key" data-geography-mode={presentation.props.narratedGeography.kind} data-geography-cities={presentation.props.narratedGeography.cities.join(',')}><strong>{presentation.props.narratedGeography.title}</strong><span>{presentation.props.narratedGeography.kind==='rail'?'橙：现状轨道（含桥隧投影） · 青：概览河道':presentation.props.narratedGeography.kind==='mountain'?'浅金：山系概略范围 · 起伏：真实高程':presentation.props.narratedGeography.kind==='airport'?'跑道与城区分开定位 · 未绘制航路':'金色：真实地形观察窗 · 青色：资料河道'}</span><small>{presentation.props.narratedGeography.kind==='regions'||presentation.props.narratedGeography.kind==='history'?'地形窗不是城市边界 · 不复原古代道路':presentation.props.narratedGeography.kind==='mountain'?'山系范围为概略参照 · 不是精密地质边界':'强调变化跟随讲解，不表示流速或列车速度'}</small></div>}
    {mechanism&&<section className="overview-ground-controls" aria-label="当前功能演示的操作">
     <strong>{mechanism.kind==='water'?'亲手比较：有水源与能够取用':mechanism.kind==='manuscript'?'亲手观察：展开、整理与包护':'亲手观察：观看怎样接到参与'}</strong>
     {mechanism.kind==='manuscript'&&<img className="overview-mechanism-source" src="/assets/overview-heritage/met-manuscript-cover-37610.jpg" alt="Met馆藏1987.407.6真实木经板；三维空白书页不是原件复原"/>}
     <label>{mechanism.kind==='water'?'转移过程':mechanism.kind==='manuscript'?'书页整理与护板合拢':'观看 → 靠近 → 共同练习'}<input aria-label="功能演示进度" type="range" min="0" max="1" step=".01" value={mechanism.progress} disabled={mechanism.kind==='water'&&!mechanism.connected} onChange={event=>{director.pause();setMechanismOverride({id:beat.id,state:{...mechanism,progress:Number(event.target.value)}});}}/></label>
     {mechanism.kind==='water'?<button aria-pressed={mechanism.connected} onClick={()=>{director.pause();setMechanismOverride({id:beat.id,state:{...mechanism,connected:!mechanism.connected}});}}>{mechanism.connected?'关闭取水通道':'打开取水通道'}</button>:beat.id==='OVERVIEW-culture-continuity'?null:<div role="group" aria-label="文化行动对照">{(['manuscript','practice'] as const).map(kind=><button key={kind} aria-pressed={mechanism.kind===kind} onClick={()=>{director.pause();setMechanismOverride({id:beat.id,state:{...mechanism,kind,progress:0}});}}>{kind==='manuscript'?'物件怎样保存':'实践怎样接续'}</button>)}</div>}
     <p role="status">{mechanismManual?overviewMechanismFeedback(mechanism):mechanism.reason}</p>
     <small>{mechanism.kind==='water'?'量与设施为定性示意，不是当地管网；2023年报道只支持地方管护案例。':mechanism.kind==='manuscript'?'照片：Met真实文物；3D：成对护板与空白书页的功能说明。':'人物、数量与场地为学习关系示意；不是演出复原。'}</small>
     
    </section>}
    {ground&&<OverviewGroundControls state={ground} reading={groundReading} manual={groundManual} onChange={changeGround} onResume={play} sharedGuide/>}
    {!ground&&beat.id==='LAB-life-lhasa'&&<button className="overview-detail" onClick={()=>changeGround({})}>进入拉萨河谷 · 沿真实铁路观察</button>}
    {interaction&&!ground&&<OverviewInteractionControls state={interaction} reading={interactionReading} manual={interactionManual} station={presentation.props.climateObservationStationId} resumeTitle={beat.title} onChange={changeInteraction} onCity={selectInteractionCity} onResume={play} sharedGuide/>}

    <div className="overview-current"><span>{interactionManual?'正在比较 · 主线已保留暂停位置':'现在看什么'}</span><h2>{irrigationManual?'设施、清渠与实际补水':placeManual?'对照活动怎样使用空间':bridgeManual?bridgeOverride.connected?'新连接接通两岸':'这一条连接缺失时':mechanismManual&&mechanism?mechanism.kind==='water'?'源端、通道与储水端':mechanism.kind==='manuscript'?'书页整理与护板包护':'观看、靠近与共同练习':interactionManual&&interaction?.stage==='life'?`${climateLabPlaces[interaction.city].name}：${climateLabPlaces[interaction.city].question}`:presentation.title}</h2><p>{rotationManual&&rotation?rotationFeedback(rotation):irrigationManual&&irrigation?irrigationFeedback(irrigation):placeManual?placeFeedback:bridgeManual?bridgeFeedback:mechanismManual&&mechanism?overviewMechanismFeedback(mechanism):groundManual?groundFeedback(ground!,groundReading):interactionManual&&interaction?.stage==='air'?overviewInteractionFeedback(interaction,interactionReading):interactionManual&&interaction?.stage==='life'?climateLabPlaces[interaction.city].reason:presentation.explanation}</p></div>
    {pixelCounts&&<div className="overview-pixel-feedback" role="status"><span>仅此观察窗 · 截至{presentation.props.overviewUrban!.year}年</span><p>已检出 {pixelCounts.total.toLocaleString('zh-CN')} 个像元，其中1985年后首次检出 {pixelCounts.later.toLocaleString('zh-CN')} 个。</p><small>像元数不是建筑数或人口数；空白不等于没有聚居。继续观察广场与八廓街，需结合历史报告理解生活变化。</small></div>}
    <p className="overview-shot-reason"><span>{phaseName} · 镜头为什么这样接</span>{groundManual?'沿真实线路比较河流、山体与站区；返回主线时恢复原讲述位置和镜头。':interactionManual?`这是当前讲述中的同图对照。继续时恢复「${beat.title}」的暂停位置与画面，再按主线顺序前进。`:interaction?overviewInteractionReason(interaction):shot.purpose}</p>
    <nav className="overview-beats" aria-label="本章相邻讲述顺序">{visibleBeats.map((item,index)=><button key={item.id} aria-current={item.id===beat.id?'step':undefined} onClick={()=>select(overviewBeats.findIndex(candidate=>candidate.id===item.id))}><i>{beatWindowStart+index+1}</i><span>{item.title}</span></button>)}</nav>
    {chapter.beats.length>5&&<details className="overview-complete-order" onToggle={disclosure}><summary>本章完整顺序 · {chapter.beats.length} 段</summary><ol>{chapter.beats.map((item,index)=><li key={item.id}><button aria-current={item.id===beat.id?'step':undefined} onClick={()=>select(overviewBeats.findIndex(candidate=>candidate.id===item.id))}>{index+1}. {item.title}</button></li>)}</ol></details>}
    {beat.stepId==='C4'&&<div className="overview-conditions" role="group" aria-label="水汽条件对照"><span>暂停后比较</span><button aria-pressed={(moisture??'higher')==='higher'} onClick={()=>{director.pause();setMoisture('higher');}}>较多水汽</button><button aria-pressed={moisture==='lower'} onClick={()=>{director.pause();setMoisture('lower');}}>较少水汽</button></div>}
    {beat.stepId==='G4'&&<div className="overview-conditions"><button aria-pressed={cutaway??presentation.props.cutaway} onClick={()=>{director.pause();setCutaway(!(cutaway??presentation.props.cutaway));}}>展开 / 合回地形剖面</button></div>}
    <details className="overview-conclusion" onToggle={disclosure}><summary>这一章要建立的认识</summary><p>{chapter.premise}</p><p>{chapter.conclusion}</p></details>
    {isMain&&<OverviewUnderstanding key={chapter.id} chapterId={chapter.id} onPause={director.pause} onRevisit={id=>{const index=overviewBeats.findIndex(b=>b.id===id);if(index>=0){select(index);readingPanel.current?.scrollTo({top:0});}}}/>}
    <div className="overview-next-question"><span>{beat.id==='OVERVIEW-conclusion'?'把整条认识带走':'接下来追问'}</span><p>{nextReason}</p></div>
    <details className="overview-evidence" onToggle={disclosure}><summary><BookOpenText size={14}/>本段资料与讲解全文</summary><p>{beat.text}</p><small>{presentation.sourceScope}</small>{beat.sources.map((source,index)=><div key={`${source.url}:${index}`}><a href={source.url} target="_blank" rel="noreferrer" onClick={director.pause}>{source.title}</a>{source.note&&<small>{source.note}</small>}</div>)}</details>
    {isMain&&['history','culture'].includes(presentation.props.overviewTopic??'')&&<details className="overview-history-order" onToggle={disclosure}><summary>查看完整历史顺序</summary><OverviewHistoryLine inline year={presentation.year} topic={presentation.props.overviewTopic}/></details>}
    <details className="overview-depth" onToggle={disclosure}><summary>主线之外，选择延伸阅读</summary><p>先建立整体认识，再按需要进入具体案例。返回主线会保留位置并暂停。</p>{overviewDepthPrograms.map(item=><button key={item.id} aria-current={item.id===program.id?'page':undefined} onClick={()=>navigate(()=>{location.hash=`/overview?topic=${item.id}`;})}>{item.title}<ArrowRight size={13}/></button>)}{!isMain&&<button onClick={()=>navigate(()=>{location.hash='/overview';})}>返回六个问题的认识主线</button>}</details>
    {isMain&&<details className="overview-editorial" onToggle={disclosure}><summary>主线内容如何取舍</summary>{editorialChanges.map(item=><p key={item.content}><strong>{item.action} · {item.content}</strong><br/>{item.reason}<br/><small>{item.destination}</small></p>)}</details>}
    <button className="overview-detail" onClick={()=>navigate(()=>onDetail(beat.detailStepId))}>暂停后深入这个问题<ArrowRight size={13}/></button>
   </aside>
  </div>
  <footer className="overview-player">
   <div className="overview-transport"><button className="overview-play" onClick={play} aria-label={director.wantsPlayback?'暂停完整演示':complete?'重新播放完整演示':'播放完整演示'}>{director.wantsPlayback?<Pause size={18} weight="fill"/>:<Play size={18} weight="fill"/>}{director.wantsPlayback?'暂停演示':complete?'重新播放':director.beatIndex===0&&director.raw===0?(isMain?'开始完整演示':'开始本专题'):(isMain?'继续完整演示':'继续本专题')}</button><button aria-label="重听当前段" onClick={()=>{clearManual();director.replay();}}><ArrowCounterClockwise size={17}/></button><button aria-label={director.voice?'关闭讲解声音':'开启讲解声音'} aria-pressed={director.voice} onClick={()=>director.setVoice(!director.voice)}>{director.voice?<SpeakerHigh size={18}/>:<SpeakerSlash size={18}/>}</button><span className="overview-time">{total?`${clock(elapsed)} / ${clock(total)}`:`${overviewChapters.length}章 · 连续介绍`}<small>{complete?(isMain?'已完成整场演示':'专题已结束，可返回主线'):'自动衔接下一段'}</small></span><div className="overview-step-buttons"><button disabled={director.beatIndex===0} aria-label="上一段" onClick={()=>select(director.beatIndex-1)}><ArrowLeft size={16}/></button><button disabled={director.beatIndex===overviewBeats.length-1} aria-label="下一段" onClick={()=>select(Math.min(overviewBeats.length-1,director.beatIndex+1))}><ArrowRight size={16}/></button></div></div>
   <p className="overview-follow-question"><span>{chapterIndex<overviewChapters.length-1?'下一段为什么接在这里':'接下来怎样继续'}</span>{nextReason}</p>
   <label className="overview-seek">本段 {localIndex+1} / {chapter.beats.length}<input aria-label="当前讲述进度" type="range" min="0" max="1" step=".001" value={director.raw} onChange={event=>{clearManual();director.seek(Number(event.target.value));}}/><span>{Math.round(director.raw*100)}%</span></label>
   <nav className="overview-chapters" style={{gridTemplateColumns:`repeat(${overviewChapters.length},minmax(90px,1fr))`}} aria-label={isMain?"完整演示的六个核心问题":"深入专题顺序"}>{overviewChapters.map((item,index)=><button key={item.id} ref={index===chapterIndex?activeChapter:undefined} aria-current={index===chapterIndex?'step':undefined} onClick={()=>select(overviewBeats.findIndex(beat=>beat.id===item.beats[0].id))}><small>{String(index+1).padStart(2,'0')}</small><span>{item.title}</span></button>)}</nav>
   {director.raw>0&&director.timing?.precision!=='provider'&&<p className="overview-alignment" role="status">当前逐词对齐尚未就绪；画面暂按录音进度显示。</p>}
  </footer>
 </main>;
}
