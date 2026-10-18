import {useEffect,useRef,useState,type SyntheticEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowCounterClockwise,BookOpenText,Compass,DiamondsFour,GlobeHemisphereEast,Info,MapPin,Pause,Play,SpeakerHigh,SpeakerSlash} from '@phosphor-icons/react';
import TibetScene from '../scene/TibetScene';
import {cityOverviews,cityOverviewContext,cityOverviewSources,getCityOverview} from '../data/cityOverview';
import {getPlaceProfile} from '../data/placeProfiles';
import {regionalJourneySources} from '../data/regionalJourney';
import {regionalJourneyAnnotations} from '../data/regionalJourneyAnnotations';
import {atlasHash,cityAtlasLocation,cityTopicLocation} from '../lib/spatialJourney';
import {regionalStageFacet,regionalStageLabels,regionalStageOrder} from '../lib/regionalJourneyState';
import {useRegionalJourneyDirector} from '../hooks/useRegionalJourneyDirector';
import type {StoryAtlasProps} from './StoryAtlasExperience';
import NarrationCaption from './NarrationCaption';
import './CityOverviewExperience.css';
import './RegionalJourneyExperience.css';
import RegionalJourneyLocator from './RegionalJourneyLocator';
import type {RegionalSpatialInfo} from '../scene/regionalSpatialTypes';
import {spatialHistoryYear} from '../lib/regionalSpatialState';

const actionLabels={rain:'水汽与抬升',valley:'高程与谷地',water:'坡面与水流',settlement:'生活空间',heritage:'历史材料与地点',rail:'铁路与地方接续',road:'区域入口与公路',observe:'带着原因观察'};
const processScopes={rain:'云雨为机制条件，非当日天气或测站雨量',valley:'真实格网剖面，非实际道路或城区平均',water:'沿真实坡面下降，非实测河渠和供水网',settlement:'相对低缓着色，非土地用途或历史城区',heritage:'有日期的材料与地点，非历史建筑或古城复原',rail:'架空弧与方块演示接续，非铁路测绘或班次',road:'节点接续原理，架空弧不是实测公路或航路',observe:'观察问题的顺序，非已核实的旅行行程'};
const orderedCities=cityOverviewContext.arrangements.flatMap(group=>group.ids.map(id=>getCityOverview(id)!));

/** Four additional regions continue on the existing seven-city geographic map. */
export default function RegionalJourneyExperience({location,onEarth,onDirectory,onModels,onSaved,onTravel,onDetail,onReturn,returnTitle}:StoryAtlasProps){
 const city=getCityOverview(location.cityId!)!;
 const profile=getPlaceProfile(city.id);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[resetKey,setResetKey]=useState(0),[sceneKey,setSceneKey]=useState(0),[closeView,setCloseView]=useState(false);
 const reading=useRef<HTMLDivElement>(null);
 const [spatialInfo,setSpatialInfo]=useState<RegionalSpatialInfo>(),[manualYear,setManualYear]=useState<number|undefined>(),[transfer,setTransfer]=useState(true);
 const director=useRegionalJourneyDirector({cityId:city.id,facet:location.facet||'environment',ready,onStage:stage=>{
  const facet=regionalStageFacet(stage);if(location.facet!==facet)window.location.hash=atlasHash(cityAtlasLocation(city.id,facet,false));
 }});
 const stageIndex=regionalStageOrder.indexOf(director.stage.id),cueIndex=director.stage.cues.indexOf(director.cue);
 const sources=director.cue.sourceIds.flatMap(id=>regionalJourneySources.find(source=>source.id===id)||[]);
 const points=director.cue.pointIds.flatMap(id=>director.journey.points.find(point=>point.id===id)||[]);
 const pause=director.pause;
 const spatialYear=director.stage.id==='history'&&(cueIndex===3||manualYear!==undefined)?spatialHistoryYear(director.cue.text,director.timing?.textProgress??director.raw,manualYear):undefined;
 const spatialCaption=director.stage.id==='history'&&manualYear!==undefined?`手动比较：截至${manualYear}年已检出的聚居像元。原讲述已暂停；检出年不是建筑建造年。`:undefined;
 useEffect(()=>{if(location.facet!=='history')setManualYear(undefined);},[location.facet]);
 const sourceSpaceReady=ready&&(stageIndex<2||spatialInfo?.status==='ready');
 const chooseStage=(id:typeof director.stage.id)=>{setManualYear(undefined);setTransfer(true);director.select(id);};
 const chooseYear=(year:number)=>{director.pause();if(director.stage.id!=='history'||cueIndex!==3)director.select('history',3);setManualYear(year);setCloseView(true);};
 const play=()=>{setManualYear(undefined);setTransfer(true);if(!director.playing)setCloseView(true);director.playPause();};
 const navigate=(action:()=>void)=>{pause();action();};
 const changeCity=(id:string)=>navigate(()=>{window.location.hash=atlasHash(cityAtlasLocation(id,'environment',false));});
 const openDisclosure=(event:SyntheticEvent<HTMLDetailsElement>)=>{if(event.currentTarget.open)pause();};
 const nextCityId=orderedCities[(orderedCities.findIndex(item=>item.id===city.id)+1)%orderedCities.length].id;
 const continueJourney=()=>{if(stageIndex<3){director.next();reading.current?.scrollTo({top:0});}else changeCity(nextCityId);};
 const progress=(cueIndex+director.raw)/director.stage.cues.length;
 return <div className="app is-learning is-atlas is-city-overview city-reference-shell has-regional-journey">
  <header className="city-topline">
   <a href="#/" className="city-brand" onClick={pause}><DiamondsFour size={20}/><span>西藏探索</span></a>
   <nav className="city-primary-nav" aria-label="主要导航"><a href="#/" onClick={pause}><ArrowLeft size={12}/>首页</a><button onClick={()=>navigate(onDirectory)}>专题导览</button><button aria-current="page">地图图鉴</button><button onClick={()=>navigate(onModels||onDirectory)}>原理模型</button></nav>
   <div className="city-personal-nav"><button onClick={()=>navigate(onSaved)}>我的探索</button><button onClick={()=>navigate(onTravel)}>旅行线路<ArrowRight size={12}/></button></div>
  </header>
  <main className="city-stage">
   <section className="scene-area atlas-scene city-overview-scene" aria-label={`七市地在西藏与周边的整体位置 · ${city.name}同步演示`}>
    <div className="canvas-wrap"><TibetScene key={sceneKey} scene="region" layer="atlas-regional-journey" viewKey="atlas" selected={`city:${city.id}`} step={stageIndex} regionalCue={cueIndex} regionalGuide={regionalJourneyAnnotations[director.cue.id]} regionalProcess={director.process} regionalCloseView={closeView} regionalFlowDirection={director.flowDirection} regionalSpatialYear={spatialYear} regionalAccessTransfer={transfer} onRegionalSpatialInfo={setSpatialInfo} progress={director.sceneProgress} playing={director.playing} season={director.season} cutaway={false} resetKey={resetKey} onSelect={id=>{if(id.startsWith('city:')&&cityOverviews.some(city=>city.id===id.slice(5)))changeCity(id.slice(5));}} onInteract={pause} onReady={()=>setReady(true)} onError={message=>{setError(message);setReady(true);}}/></div>
    {!ready&&<div className="scene-loading"><GlobeHemisphereEast size={36}/><p>正在展开真实高程与区域地图…</p></div>}
    {error&&<div className="scene-error"><Info size={26}/><h2>整体地图暂时无法打开</h2><p>{error}</p><button onClick={()=>{setError('');setReady(false);setSceneKey(value=>value+1);}}>重新展开</button></div>}
    <div className="city-map-title"><p><button onClick={()=>navigate(()=>onEarth('G1'))}>地球</button><span> / 亚洲 / 中国 / 西藏自治区</span></p><h2>{city.name} · {director.stage.title}</h2></div>
    <p className="regional-map-scope">{spatialInfo?.active?spatialYear!==undefined?`原始30米聚居检出 · 截至${spatialYear}年 · 地形×1.8，现况路网仅作参照`:(city.id==='chamdo'&&stageIndex===3&&cueIndex<2?'邦达机场—城区源道路 · 城区细高程，外围约5—6公里区域高程×1.8':'真实OSM街路、建筑与细高程×1.8 · 非历史城界、实测建筑高度或公交导航'):`整体地图 ×16高程 · ${stageIndex>=2?'先在全域定位，靠近后读取真实地物与年代证据':processScopes[director.cue.action]}`}</p>
    <div className="city-map-tools"><button aria-label="回到七市地全景" onClick={()=>{pause();setCloseView(false);setResetKey(value=>value+1);}}><ArrowCounterClockwise size={19}/></button><button aria-label="回到地球上的位置" onClick={()=>navigate(()=>onEarth('G1'))}><GlobeHemisphereEast size={19}/></button></div>
    <button className="regional-view-toggle" aria-pressed={closeView} onClick={()=>{pause();setCloseView(value=>!value);}}>{closeView?'返回全域定位':'靠近当前区域'}<Compass size={14}/></button>
    {closeView&&<RegionalJourneyLocator cityId={city.id} onSelect={changeCity}/>}
    <div className="regional-map-caption" data-regional-cue={director.cue.id} data-regional-action={director.cue.action} data-scene-progress={director.sceneProgress.toFixed(4)}>
     <div><span>{String(stageIndex+1).padStart(2,'0')} / 04 · {regionalStageLabels[stageIndex]}</span><span>{cueIndex+1} / {director.stage.cues.length} · {director.playing?'随讲述演示':director.process?'已暂停，可拖动观察':'过程已隐藏'}</span></div>
     <p><NarrationCaption text={spatialCaption??director.caption} timing={spatialCaption?undefined:director.timing}/></p>
     {cueIndex===director.stage.cues.length-1&&director.raw>=1&&<button onClick={()=>{setManualYear(undefined);setTransfer(true);continueJourney();}}>{stageIndex<3?`继续：${regionalStageLabels[stageIndex+1]}`:`对照${getCityOverview(nextCityId)!.name}`}<ArrowRight size={13}/></button>}
     <small>拖动旋转 · 滚动缩放 · 点选城市 · 手动操作会暂停讲述</small>
    </div>
   </section>
   <aside className="city-dossier" aria-label={`${city.name}连续认识主线`}><div className="city-reading" ref={reading}>
    <p className="city-eyebrow"><span>认识主线 · 区域深入</span><span>同一张高原地图</span></p>
    <div className="city-title"><h1>{city.name}</h1><span><MapPin size={12}/>{city.locatorName}</span></div>
    <p className="city-summary">{director.journey.lead}</p>
    <nav className="regional-stage-nav" aria-label={`${city.name}四段认识主线`}>{director.journey.stages.map((stage,index)=><button key={stage.id} aria-current={director.stage.id===stage.id?'step':undefined} onClick={()=>chooseStage(stage.id)}><small>{index+1}</small>{regionalStageLabels[index]}{index<3&&<ArrowRight size={10}/>}</button>)}</nav>
    <article className="regional-current-reading">
     <p className="city-facet-question">{director.stage.question}</p><h2>{director.stage.title}</h2>
     <p>{director.stage.summary}</p>
     <nav className="regional-cue-list" aria-label="逐段演示选择">{director.stage.cues.map((cue,index)=><button key={cue.id} aria-pressed={cueIndex===index} onClick={()=>{setManualYear(undefined);setTransfer(true);director.select(director.stage.id,index);}}><span>{index+1}</span><strong>{regionalJourneyAnnotations[cue.id]?.title||actionLabels[cue.action]}</strong><small>{regionalJourneyAnnotations[cue.id]?.effect||cue.text.split(/[。；]/u)[0]}</small></button>)}</nav>
     <div className="regional-playback"><button className="regional-play" disabled={!sourceSpaceReady} onClick={play}>{director.playing?<Pause size={17} weight="fill"/>:<Play size={17} weight="fill"/>}{director.audio.status==='loading'?'准备讲述…':director.playing?'暂停讲解':'播放当前段'}</button><button aria-label="重播当前段" disabled={!sourceSpaceReady} onClick={()=>{setCloseView(true);setManualYear(undefined);setTransfer(true);director.replay();}}><ArrowCounterClockwise size={16}/></button><button aria-label={director.voice?'关闭讲述声音':'开启讲述声音'} aria-pressed={director.voice} onClick={()=>director.setVoice(!director.voice)}>{director.voice?<SpeakerHigh size={17}/>:<SpeakerSlash size={17}/>}</button></div>
     <label className="regional-seek">当前录音进度 · {Math.round(director.raw*100)}%<input aria-label="当前录音进度" type="range" min="0" max="1" step=".001" value={director.raw} onChange={event=>{setManualYear(undefined);director.seek(Number(event.target.value));}}/></label>
     {director.audio.error&&<p className="regional-status" role="alert">{director.audio.error} 再次播放可重试。</p>}
     {director.raw>0&&director.timing?.precision!=='provider'&&<p className="regional-status">逐词对齐正在读取；当前过程暂按录音进度显示。</p>}
     <label className="regional-process"><input type="checkbox" checked={director.process} onChange={director.toggleProcess}/>显示{spatialYear!==undefined?'聚居检出层':`${actionLabels[director.cue.action]}过程`}<small>切换保留地形、日期与资料；不表示真实设施停运。</small></label>
     {(stageIndex<2&&(director.cue.action==='rain'||director.cue.action==='settlement'))&&<div className="regional-season" role="group" aria-label="水热教学条件"><button aria-pressed={director.season===1} onClick={()=>director.changeSeason(1)}>暖季条件</button><button aria-pressed={director.season===3} onClick={()=>director.changeSeason(3)}>冷季对照</button><small>改变机制显示，不改变地形；非某月实测或植被分布。播放恢复讲解条件。</small></div>}
     {city.id==='chamdo'&&director.cue.action==='rain'&&<div className="regional-season" role="group" aria-label="来流方向教学对照"><button aria-pressed={director.flowDirection==='along-valley'} onClick={()=>director.changeFlowDirection('along-valley')}>南北沿谷来流</button><button aria-pressed={director.flowDirection==='across-ridge'} onClick={()=>director.changeFlowDirection('across-ridge')}>东西横跨地形</button><small>在同一真实高程上比较两条教学路径；不定位实际谷轴或当天风场。</small></div>}
     {stageIndex===2&&<div className="regional-space-controls" role="group" aria-label="真实聚居检出年份对照"><strong>同一窗口的空间变化</strong><div>{[1985,2005,2015].map(year=><button key={year} aria-pressed={spatialYear===year} onClick={()=>chooseYear(year)}>{year}</button>)}</div><small>青：1985年已检出；金：其后首次检出。1985档含更早聚居，IDC未评分；不能用少检出推断古城大小。</small></div>}
     {stageIndex===3&&<label className="regional-process"><input type="checkbox" checked={transfer} onChange={()=>{pause();setTransfer(value=>!value);setCloseView(true);}}/>地方接续条件对照<small>关闭时标志回到道路起点，录音进度保留；播放恢复接续条件。</small></label>}
     {stageIndex>=2&&<div className="regional-spatial-readout" role="status">{spatialInfo?.status==='error'?<><p>{spatialInfo.error}</p><button onClick={()=>{pause();setReady(false);setSpatialInfo(undefined);setSceneKey(value=>value+1);}}>重读真实空间资料</button></>:spatialInfo?.active?<><strong>{spatialInfo.routeTitle||spatialInfo.featureName||'原始遥感检出窗口'}</strong>{spatialInfo.routeTitle&&<p>{spatialInfo.routeKind==='railway'?'源轨道链':'源道路链'}约{((spatialInfo.routeMetres??0)/1000).toFixed(2)}公里 · 端点尚距参照约{Math.round(spatialInfo.startGap??0)}/{Math.round(spatialInfo.endGap??0)}米，未补线</p>}<p>{spatialInfo.phase} · {spatialInfo.roadCount}条道路要素 / {spatialInfo.buildingCount}个已绘建筑轮廓</p></>:<p>先在全域定位。播放或靠近后，在同一张地形上查看街路、河流、建筑与空间变化。</p>}</div>}
     <details className="regional-script" onToggle={openDisclosure} key={director.cue.id}><summary>本段讲解全文</summary><p>{director.cue.text}</p></details>
    </article>
    <section className="regional-place-context"><h3>现在看哪里</h3>{points.map(point=><div key={point.id}><strong>{point.name}</strong><p>{point.scopeNote}</p></div>)}</section>
    <section className="city-evidence"><h3><BookOpenText size={13}/>本段资料依据 · {sources.length}</h3>{sources.slice(0,1).map(source=><a className="city-source-lead" key={source.id} href={source.url} target="_blank" rel="noreferrer" onClick={pause}>{source.title}<ArrowRight size={12}/></a>)}<details className="city-sources" key={director.cue.id} onToggle={openDisclosure}><summary>查看证据和适用范围</summary>{sources.map(source=><div key={source.id}><a href={source.url} target="_blank" rel="noreferrer" onClick={pause}>{source.title}</a><p>{source.publisher}{source.date?` · ${source.date}`:''}</p><p>{source.supports}</p></div>)}</details></section>
    <details className="city-data-method" onToggle={openDisclosure}><summary>高程与演示的边界</summary><p>{director.journey.terrainNote}</p><p>449×257区域高程网格，间隔约5—6公里；读数是定位点网格插值，不是城区平均或建筑场地测量。高程显示×16；地形剖面不是道路，低缓着色不是土地利用或市界。气流、水滴、历史材料与交通脉冲用于解释机制。</p><p>四地街路、河流、铁路、寺院与建筑来自2026-10-16归档的OSM现况要素。建筑缺少高度时统一8米显示。只沿原始相连节点使用道路，保留端点至参照点的缺段；它不是公交逐站轨迹或访问许可。</p><p>地方细高程取自Mapzen源瓦片，显示网格间距约25—81米，不等于测绘精度；机场及长接续路段在细高程窗口外仍用约5—6公里区域网格，不能读取路面坡度。DLR WSF Evolution保留原始30米像元与IDC资料条件层，1985年一档也包含更早聚居；零值不证明过去没有城市。现况建筑与历史检出各自标期，不把当今轮廓倒推为古代城界。</p><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer" onClick={pause}>Mapzen 高程来源</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onClick={pause}>© OpenStreetMap contributors（ODbL）</a> · <a href="https://geoservice.dlr.de/web/maps/eoc:wsfevolution" target="_blank" rel="noreferrer" onClick={pause}>© DLR/EOC · WSF Evolution（CC BY 4.0）</a></details>
    <details className="city-whole-context city-full-reading" onToggle={openDisclosure}><summary>位置、环境与地方背景</summary><p>{city.summary}</p><p>{city.naturalSetting}</p>{Object.values(city.facets).map(facet=><section key={facet.title}><h3>{facet.title}</h3>{facet.paragraphs.map(text=><p key={text}>{text}</p>)}{facet.sourceIds.map(id=>{const source=cityOverviewSources.find(item=>item.id===id);return source?<a key={id} href={source.url} target="_blank" rel="noreferrer" onClick={pause}>{source.title}</a>:null;})}</section>)}</details>
    {profile&&<details className="city-whole-context city-full-reading" onToggle={openDisclosure}><summary>完整地方介绍与延伸材料</summary>{profile.sections.map(section=><section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(text=><p key={text}>{text}</p>)}{section.sourceIds.map(id=>{const source=profile.sources.find(item=>item.id===id);return source?<a key={id} href={source.url} target="_blank" rel="noreferrer" onClick={pause}>{source.title}</a>:null;})}</section>)}</details>}
    <div className="regional-next"><progress value={progress} max="1" aria-label="当前章节进度"/><p>{stageIndex===0?'看到了高差和水热，接着追问：人怎样使用这些条件？':stageIndex===1?'生活受环境约束；文化还要从有年代的实践和材料认识。':stageIndex===2?'历史中心留在地图上，继续看现代交通怎样接入地方生活。':'把地形、生活、历史与交通放在一起，实地观察时核对具体地点和当天接续。'}</p><button onClick={()=>{setManualYear(undefined);setTransfer(true);continueJourney();}}>{stageIndex<3?`继续：${regionalStageLabels[stageIndex+1]}`:`对照${getCityOverview(nextCityId)!.name}`}<ArrowRight size={14}/></button></div>
    <button className="city-return" onClick={()=>{const facet=regionalStageFacet(director.stage.id),id=city.facets[facet].stepIds[0]||'G4';navigate(()=>onDetail(id,cityTopicLocation(id,city.id,facet,false)));}}>延伸阅读：相关专题的背景原理<ArrowRight size={14}/></button>
    {onReturn&&<button type="button" className="city-return" onClick={()=>navigate(onReturn)}><ArrowLeft size={14}/>回到原问题{returnTitle?`：${returnTitle}`:''}</button>}
   </div></aside>
  </main>
  <footer className="city-location-strip"><div className="city-strip-intro"><Compass size={20}/><div><strong>同一高原 · 七市地</strong><span>环境 → 生活 → 历史 → 联系</span></div></div><nav className="city-place-list" aria-label="西藏六市一地区">{orderedCities.map((item,index)=><button key={item.id} aria-pressed={item.id===city.id} className={item.id===city.id?'active':''} onClick={()=>changeCity(item.id)}><small>{String(index+1).padStart(2,'0')}</small><span><strong>{item.name}{item.administrativeType==='地区'?'地区':''}</strong><em>{item.positionLabel.split(' · ')[0]}</em></span></button>)}</nav></footer>
 </div>;
}
