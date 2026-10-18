import NarrationCaption from './NarrationCaption';
import NarrationAlignmentNotice,{narrationAlignmentUnavailable} from './NarrationAlignmentNotice';
import {useId,type SyntheticEvent} from 'react';
import {ArrowCounterClockwise,ArrowRight,Pause,Play,SpeakerHigh,SpeakerSlash} from '@phosphor-icons/react';
import {cityComparisonStages,cityComparisonSources,cityComparisonNarrationCues,cityComparisonLabels as stageLabels} from '../data/cityComparison';
import {cityComparisonAudioSegments,type useCityComparisonDirector} from '../hooks/useCityComparisonDirector';
import './CityComparisonReading.css';
import CityAccessReading,{cityAccessFeedback} from './CityAccessReading';
import CityContinuityReading,{cityContinuityFeedback} from './CityContinuityReading';
import {isCityContinuityLessonStage} from '../lib/cityContinuityState';
import {cityContinuityBridge} from '../lib/cityContinuityBridge';
import {cityAccessCityRange} from '../lib/cityAccessState';
import CityPlaceThread from './CityPlaceThread';
import CityNarrativeContext from './CityNarrativeContext';
import {cityPlaceThreads,cityPlaceThreadReading,type CityPlaceThreadStep,type CityPlaceThreadFeature} from '../data/cityPlaceThreads';
import {resolveCityLocalGeography} from '../lib/cityLocalGeography';
import {cityLocalUsageState,cityLocalUsageCaption} from '../scene/cityLocalContinuity';
import {cityReadingCaption,cityReadingInterruption} from '../lib/cityReadingCaption';
import ClimateObservations,{type ClimateObservationsProps} from './ClimateObservations';
import {cityLifeSceneToAudio} from '../lib/cityLifeAudio';

type Director=ReturnType<typeof useCityComparisonDirector>;
type Props={director:Director;onFocus:(cityId:string)=>void;onCity:(cityId:string,history?:boolean)=>void;onNavigate?:()=>void;onPrepareObservation?:()=>void;onThreadNavigate?:(step:CityPlaceThreadStep)=>void;onInspectFeature?:(feature:CityPlaceThreadFeature)=>void;selectedEvidenceFeatureId?:string;climateObservation?:ClimateObservationsProps&{active:boolean};compact?:boolean};
const places=[{id:'nyingchi',name:'林芝',region:'藏东南'},{id:'lhasa',name:'拉萨',region:'中南部河谷'},{id:'ngari',name:'阿里',region:'西部高地'}] as const;

export default function CityComparisonReading({director,onFocus,onCity,onNavigate,onPrepareObservation,onThreadNavigate,onInspectFeature,selectedEvidenceFeatureId,climateObservation,compact=false}:Props){
 const progressId=useId();
 const pauseOnReading=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)director.pause();};
 const stageIndex=Math.max(0,cityComparisonStages.findIndex(item=>item.id===director.stage));
 const stage=cityComparisonStages[stageIndex];
 const currentRecording=cityLifeSceneToAudio(cityComparisonAudioSegments(stage.id),director.progress)?.segment;
 const recordingTitle=cityComparisonNarrationCues.find(cue=>cue.id===currentRecording?.id)?.title;
 const beatIndex=director.progress>=.68?2:director.progress>=.34?1:0;
 const beat=stage.beats[beatIndex],place=places[beatIndex];
 const sources=stage.sourceIds.flatMap(id=>cityComparisonSources.find(item=>item.id===id)??[]);
 const water=stage.id==='water';
 const continuity=stageIndex>=5;
 const development=stage.id==='development',accessReading=development?cityAccessFeedback(director):undefined;
 const continuityReading=isCityContinuityLessonStage(stage.id)?cityContinuityFeedback(director):undefined;
 const specialized=accessReading??continuityReading;
 // Evidence and physical use share word-derived display progress. Raw progress
 // below still owns the media slider, seeks, continuation and saved position.
 const localPlace=continuity?resolveCityLocalGeography(stage.id,director.sceneProgress)?.localityId:undefined;
 const localUsage=localPlace?cityLocalUsageState({step:development?4:stage.id==='history'?3:stage.id==='connections'?5:6,progress:director.sceneProgress,cityLifeServices:director.services,cityAccessTransfer:director.transfer},localPlace):undefined;
 const purposeBridge=cityContinuityBridge(stage.id,director.progress);
 const seekDirector={...director,setProgress:(value:number)=>{director.setProgress(value);onNavigate?.();},setServices:(value:boolean)=>{director.setServices(value);onNavigate?.();},setTransfer:(value:boolean)=>{director.setTransfer(value);onNavigate?.();}};
 const scope=continuity?stage.id==='history'?'保留现状地形与地物，按有日期的材料解释事件与用途；历史城界和未测建筑高度不作复原。完整材料可深入阅读。':stage.id==='development'?'设施位置与已取得道路按来源显示；桥隧、飞行和行李交接另作原理演示。现状地理与历史年份分别阅读。':stage.id==='connections'?'源道路保留实际连接与资料范围，区域抵达接到具体地方使用；当前接驳和允许访问的位置按日期核验。':'保留同一处地形、道路与用途来路，再选择要观察的环节；保存本人问题，实际行程逐段核验。':stage.id==='climate'?'相同初始水汽的地形对照；雨滴不是三地雨量排行，实际气候还受来路与季节影响。':stage.id==='terrain'?'高程为定位点网格采样，非城市平均；三地使用同一基准与倍率。':stage.id==='mobility'?'金色是基于地形的教学试线，白色连接相同端点作参照；均不是实际公路或工程选线。':water?'坡面去向与取供水分开演示；提升、闸控为原理，不是水井、地下水层或渠网测绘。':'绿色表示各采样窗口内相对低缓处；不是城市边界、建设适宜性或用地规划。';
 const caption=cityReadingCaption(director,cityComparisonAudioSegments(stage.id));
 const feedback=specialized?specialized.text:cityReadingInterruption(director)??(water&&!director.services?'只看自然水：沿坡面的下降仍在，取水提升与闸控输送暂不参与。比较有水源与能够按需用水的差别；这不表示当地实际停水。':stage.id==='settlement'&&!director.built?'已隐藏2021年建成地表。现在只看绿色的相对低缓空间；地形和地点保持不变。重新叠加观测，对照自然空间与已经被利用的地表。':caption??beat.text);
 const controlsComplete=director.relief&&director.services&&director.built&&director.transfer!==false&&!director.audio.error&&director.audio.status!=='error';
 const feedbackNarrated=specialized?specialized.narrated:caption!==undefined;
 const quietLocalText=localUsage?.corridorLeg==='mainling-s4'?'机场外部道路接到林芝，继续去鲁朗还需另一段越岭。':localUsage?.corridorLeg==='nyingchi-g318'?'从林芝沿G318经色季拉到鲁朗，抵达后再接上小镇服务。':cityPlaceThreads[place.id].summary;
 const localThread=continuity?cityPlaceThreadReading(place.id,stage.id,director.sceneProgress):undefined;
 const manualLocalFact=localThread?.evidence?.fact.split('。')[0];
 const manualLocalTitle=controlsComplete&&!caption&&localThread?.samePlace?localThread.current.title:undefined;
 const localLifeTitle=controlsComplete&&localThread?.samePlace&&localThread.active==='life'?localThread.current.title:undefined;
 const sceneFeedback=localPlace&&localUsage?`${cityLocalUsageCaption(localPlace,localUsage)}。${controlsComplete?caption??(manualLocalFact?`${manualLocalFact}。`:quietLocalText):feedback}`:feedback;
 const sceneNarrated=localPlace&&localUsage?controlsComplete&&caption!==undefined:feedbackNarrated;
 if(compact)return <div className="city-life-stage-feedback city-comparison-feedback" aria-live="off"><span>三地同图 · {stageLabels[stageIndex]} · 正在看{place.name}{accessReading?` · ${accessReading.state.index+1}/4`:continuityReading?` · ${continuityReading.state.index+1}/3`:''}</span><strong>{localLifeTitle??manualLocalTitle??specialized?.title??(director.relief?beat.title:'操作对照：暂时压平地形')}</strong><p className="city-life-scene-caption"><NarrationCaption text={sceneFeedback} timing={sceneNarrated?director.narrationTiming:undefined}/></p></div>;
 return <section className="city-comparison-reading" aria-label="林芝、拉萨、阿里同图对照">
  <p className="city-comparison-path">环境与生活 01—05 <span>→</span> 历史与今天 06—09</p>
  <nav className="city-life-stages city-comparison-stages" aria-label="三地对照的认识顺序">{cityComparisonStages.map((item,index)=><button key={item.id} aria-pressed={item.id===director.stage} onClick={()=>{director.selectStage(item.id);onNavigate?.();}}><small>0{index+1}</small><span>{stageLabels[index]}</span></button>)}</nav>
  {!(stage.id==='climate'&&climateObservation?.active)&&<><div className="city-life-playback" aria-label="三地对照播放控制"><button className="city-life-play" onClick={()=>{director.playPause();if(!director.playing)onNavigate?.();}}>{director.playing?<Pause size={14} weight="fill"/>:<Play size={14} weight="fill"/>}{director.playing?'暂停对照讲解':'播放对照讲解'}</button><button aria-label="重播整个主题" title="从林芝开始，重播当前主题的三地对照" onClick={()=>{director.replay();onNavigate?.();}}><ArrowCounterClockwise size={16}/></button><button aria-label={director.voice?'关闭对照声音':'开启对照声音'} aria-pressed={director.voice} onClick={()=>director.setVoice(!director.voice)}>{director.voice?<SpeakerHigh size={16}/>:<SpeakerSlash size={16}/>}</button></div><div className="city-comparison-repeat"><button type="button" onClick={()=>{director.replaySegment();onNavigate?.();}}><ArrowCounterClockwise size={12}/>重听当前段</button>{recordingTitle&&<span>{recordingTitle}</span>}</div></>}
  {director.audio.status==='loading'&&<p className="city-life-audio-status" role="status">正在准备对应的讲解片段…{!director.voice&&'静音演示也按录音进度同步。'}</p>}
  {director.audio.error&&<p className="city-life-audio-status is-error" role="status">{director.audio.error}</p>}
  {director.audio.status==='idle'&&director.narrationTiming?.precision==='provider'&&director.currentSentence&&<p className="city-life-audio-status">已恢复原录音位置；点击播放继续。</p>}
  <NarrationAlignmentNotice unavailable={narrationAlignmentUnavailable(director.audio)}/>
  {stage.id==='climate'&&climateObservation&&<ClimateObservations {...climateObservation}/>}
  <div hidden={stage.id==='climate'&&climateObservation?.active}><div className="city-life-progress"><label htmlFor={progressId}><span>三地始终同图，回拖查看变化</span><output>{Math.round(director.progress*100)}%</output></label><input id={progressId} aria-label={`${stageLabels[stageIndex]}对照进度`} type="range" min="0" max="100" value={Math.round(director.progress*100)} onChange={event=>director.setProgress(Number(event.target.value)/100)}/><div><span>林芝 · 东南</span><span>拉萨 · 河谷</span><span>阿里 · 西部</span></div></div>
  {continuity&&<CityNarrativeContext stage={director.stage} cityId={place.id} sceneProgress={director.sceneProgress} onPause={director.pause}/>}
  {continuity&&onThreadNavigate&&<CityPlaceThread cityId={place.id} stage={stage.id} progress={director.sceneProgress} onNavigate={onThreadNavigate} onInspectFeature={stage.id==='travel'?undefined:onInspectFeature} selectedFeatureId={selectedEvidenceFeatureId} onPause={director.pause}/>}
  {development&&<CityAccessReading director={seekDirector}/>}
  {continuityReading&&<CityContinuityReading director={seekDirector}/>}
  {!specialized&&<>
  {water?<fieldset className="city-life-maintenance"><legend>水源不变，取用与管护改变什么？</legend><div><button aria-pressed={!director.services} onClick={()=>director.setServices(false)}>只看自然水</button><button aria-pressed={director.services} onClick={()=>director.setServices(true)}>加入取用与管护</button></div><p>操作会暂停；地形和自然水源保留。播放恢复完整过程。</p></fieldset>:<fieldset className="city-life-maintenance"><legend>{stageIndex===0?'固定初始水汽，地形起什么作用？':stageIndex===1?'失去高差，还能看见河谷吗？':stage.id==='mobility'?'起终点不变，高差怎样约束通行？':'坡谷改变后，低缓空间怎样变化？'}</legend><div><button aria-pressed={director.relief} onClick={()=>director.setRelief(true)}>真实起伏</button><button aria-pressed={!director.relief} onClick={()=>director.setRelief(false)}>教学压平</button></div><p>操作会暂停；播放恢复真实起伏。高程读数仍取原始数据。</p></fieldset>}
  <article className="city-life-current" aria-live="polite"><h2>{director.relief?beat.title:'压平后的教学对照'}</h2><p><NarrationCaption text={feedback} timing={feedbackNarrated?director.narrationTiming:undefined}/></p></article>
  </>}
  {stage.id==='settlement'&&<fieldset className="city-life-maintenance city-built-control"><legend>地形条件与实际地表，对照看</legend><div><button aria-pressed={!director.built} onClick={()=>director.setBuilt(false)}>仅看地形空间</button><button aria-pressed={director.built} onClick={()=>director.setBuilt(true)}>叠加2021建成地表</button></div><p>绿色：窗口内相对低缓；赭色：约300米格内的建成地表比例。小点为屏幕定宽采样符号，亮度随比例变化；建成分类包括道路等人工地表，非建筑轮廓或今天的城区。</p><a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noreferrer" onClick={director.pause}>© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium · CC BY 4.0</a></fieldset>}
  {continuity?<><nav className="city-continuity-city-strip" aria-label="切换地方，对照当前同一环节">{places.map((item,index)=><button key={item.id} type="button" aria-pressed={beatIndex===index} onClick={()=>onFocus(item.id)}><strong>{item.name}</strong><small>{item.region}</small></button>)}</nav><details className="city-continuity-city-notes" onToggle={pauseOnReading}><summary>三地的不同用途与联系</summary><dl>{places.map(item=><div key={item.id}><dt>{item.name}</dt><dd>{stage.cityNotes[item.id]}</dd></div>)}</dl></details></>:<div className="city-comparison-places" aria-label="同图并列的三地环境与生活">{places.map((item,index)=><button key={item.id} className={beatIndex===index?'is-current':''} aria-pressed={beatIndex===index} onClick={()=>onFocus(item.id)}><span><strong>{item.name}</strong><small>{item.region}</small></span><p>{stage.cityNotes[item.id]}</p></button>)}</div>}
  </div>
  <div className="city-life-bridge">{purposeBridge?<p className="city-continuity-next-purpose"><span>{purposeBridge.atLocalEnd?'把这一处用途带到后面':'接着要解释'}</span>{purposeBridge.question}</p>:<p>{director.continuation.kind==='segment'?'沿当前主题继续读下一段；林芝、拉萨和阿里始终留在同一张地图上。':stage.bridge}</p>}{director.continuation.kind==='stage'&&<p className="city-comparison-next-entry">下一主题从林芝开始，再依次对照拉萨和阿里。</p>}{director.continuation.kind!=='complete'?<button onClick={()=>{director.continueReading();onNavigate?.();}}>{continuity?'按主题继续：':''}{continuity?director.continuation.label.replace(/^继续[：:]?/, ''):director.continuation.label}<ArrowRight size={13}/></button>:<p className="city-comparison-ending">选择下方具体观察点，将本人问题保存后继续删改、排序或补充。</p>}{stage.id==='travel'&&purposeBridge?.atLocalEnd&&onPrepareObservation&&<button type="button" className="city-comparison-observe" onClick={onPrepareObservation}>选择{place.name}的具体观察点<ArrowRight size={13}/></button>}{director.continuation.kind==='segment'&&stageIndex<cityComparisonStages.length-1&&<button className="city-comparison-skip" onClick={()=>{director.selectStage(cityComparisonStages[stageIndex+1].id,false,cityAccessCityRange(place.id).start);onNavigate?.();}}>先看{place.name}的{stageLabels[stageIndex+1]}（跳过余下对照）<ArrowRight size={12}/></button>}{stage.id==='history'&&<button onClick={()=>onCity(place.id,true)}>深入{place.name}的历史材料<ArrowRight size={13}/></button>}</div>
  <p className="city-comparison-map-scope">{scope}</p>
  <details className="city-life-sources" onToggle={pauseOnReading}><summary>资料与演示范围 · {sources.length}项</summary><p>{stage.scope}</p>{sources.map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={director.pause}>{source.title}<small>{source.note}</small></a>)}</details>
 </section>;
}
