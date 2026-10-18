import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowLeft,ArrowRight,ArrowCounterClockwise,BookOpenText,Check,Compass,DiamondsFour,GlobeHemisphereEast,Info,List,MapPin} from '@phosphor-icons/react';
import TibetScene from '../scene/TibetScene';
import {chapters} from '../data/curriculum';
import {atlasHotspots,atlasSources,getAtlasTheme,type AtlasThemeId} from '../data/atlas';
import {atlasHash,type AtlasLocation} from '../lib/spatialJourney';
import type {Exploration} from '../lib/store';
import SpatialJourneyNav from './SpatialJourneyNav';
import CityOverviewExperience from './CityOverviewExperience';
import {cityAtlasLocation,parseAtlasLocation} from '../lib/spatialJourney';
import {cityAccessCityRange} from '../lib/cityAccessState';
import RecognitionRoute from './RecognitionRoute';
import {saveCityComparisonEntry} from '../hooks/useCityComparisonDirector';
import RegionalJourneyExperience from './RegionalJourneyExperience';
import {getRegionalJourney} from '../data/regionalJourney';

export interface StoryAtlasProps {location:AtlasLocation;saved:Exploration;onSave?:Dispatch<SetStateAction<Exploration>>;onDetail:(id:string,origin:AtlasLocation)=>void;onEarth:(id:string)=>void;onDirectory:()=>void;onModels?:()=>void;onSaved:()=>void;onTravel:()=>void;onReturn?:()=>void;returnTitle?:string}

export default function StoryAtlasExperience(props:StoryAtlasProps){
 const cityId=props.location.cityId||atlasHotspots.find(point=>point.id===props.location.hotspotId)?.regionId;
 return props.location.view==='topics'?<TopicAtlasExperience {...props}/>:cityId&&getRegionalJourney(cityId)?<RegionalJourneyExperience key={cityId} {...props} location={{...props.location,cityId}}/>:<CityOverviewExperience {...props}/>;
}

function TopicAtlasExperience({location,saved,onDetail,onEarth,onDirectory,onModels,onSaved,onTravel,onReturn,returnTitle}:StoryAtlasProps){
 const theme=getAtlasTheme(location.themeId)!;
 const hotspot=theme.hotspots.find(item=>item.id===location.hotspotId)||theme.hotspots[0];
 const questions=hotspot.relatedQuestionIds.flatMap(id=>{const chapter=chapters.find(ch=>ch.steps.some(step=>step.id===id));const step=chapter?.steps.find(step=>step.id===id);return chapter&&step?[{chapter,step}]:[];});
 const question=questions.find(item=>item.step.id===location.questionId)||questions[0];
 const [resetKey,setResetKey]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[sceneKey,setSceneKey]=useState(0);
 const [showSources,setShowSources]=useState(false);
 const [showMaterial,setShowMaterial]=useState(false);
 const materialRef=useRef<HTMLElement>(null);
 const index=theme.hotspots.findIndex(item=>item.id===hotspot.id);
 const setLocation=(themeId:AtlasThemeId,hotspotId?:string,questionId?:string)=>{const next=getAtlasTheme(themeId)!;const point=next.hotspots.find(item=>item.id===hotspotId)||next.hotspots[0];window.location.hash=atlasHash({themeId,hotspotId:point.id,questionId:questionId||point.questionId,view:'topics'});};
 useEffect(()=>{setShowSources(false);setShowMaterial(false);window.scrollTo({top:0});try{localStorage.setItem('tibet-explorer.atlas-location.v1',JSON.stringify(location));}catch{/* Navigation remains available when local storage is unavailable. */}},[location.themeId,location.hotspotId,location.questionId]);
 useEffect(()=>{if(showMaterial)materialRef.current?.scrollIntoView({block:'start',behavior:'smooth'});},[showMaterial]);
 const select=(id:string)=>{if(!id.startsWith('atlas:'))return;const point=atlasHotspots.find(item=>item.id===id.slice(6));if(point)setLocation(point.themes.includes(theme.id)?theme.id:point.themes[0],point.id);};
 return <div className="app is-learning is-atlas reference-study reference-topic-atlas">
  <header className="reference-topbar"><a href="#/" className="reference-home-link"><ArrowLeft size={13}/>首页</a><button className="reference-current-topic" onClick={onDirectory}>{theme.title}</button><nav aria-label="探索方式"><button onClick={onDirectory}>专题导览</button><button onClick={()=>{window.location.hash=atlasHash(cityAtlasLocation(hotspot.regionId));}}>地图图鉴</button><button onClick={onModels||onDirectory}>原理模型</button></nav><button className="reference-saved" aria-label="我的探索" onClick={onSaved}><BookOpenText size={16}/></button></header>
  <main className="experience">
   <section className="scene-area atlas-scene" aria-label="西藏与周边的可操作整体地图">
    <div className="canvas-wrap"><TibetScene key={sceneKey} scene="region" viewKey="atlas" step={0} season={1} layer={`atlas-${theme.id}`} progress={0} playing={false} selected={hotspot.id} cutaway={false} resetKey={resetKey} onSelect={select} onInteract={()=>{}} onReady={()=>setReady(true)} onError={message=>{setError(message);setReady(true)}}/></div>
    {!ready&&<div className="scene-loading"><GlobeHemisphereEast size={36}/><p>正在展开整体地图…</p></div>}
    {error&&<div className="scene-error"><Info size={26}/><h2>整体地图暂时无法打开</h2><p>{error}</p><button className="gold-button" onClick={()=>{setError('');setReady(false);setSceneKey(value=>value+1)}}>重新展开地图</button></div>}
    <div className="atlas-map-heading"><div className="atlas-scale-path"><button onClick={()=>onEarth('G1')}>地球</button><span>›</span><button onClick={()=>onEarth('G1')}>亚洲 · 中国</button><span>›</span><strong>西藏与周边</strong></div><h2>{hotspot.title}</h2><p>{hotspot.period||theme.question}</p></div>
    <div className="atlas-map-tools"><button className="icon-button" aria-label="重置整体地图角度" onClick={()=>setResetKey(value=>value+1)}><ArrowCounterClockwise size={20}/></button><button className="icon-button" aria-label="回到地球上的位置" onClick={()=>onEarth('G1')}><GlobeHemisphereEast size={20}/></button></div>
    <div className="atlas-map-bottom"><div className="atlas-map-selection"><MapPin size={17}/><span>正在认识</span><strong>{hotspot.title}</strong><small>{hotspot.period||'从地图进入，带着认识返回'}</small></div><div className="atlas-map-hint"><Compass size={14}/><span>转动、缩放地图 · 选择地图标记或底部章节</span><span>{index+1} / {theme.hotspots.length}</span></div></div>
   </section>
   <aside className="narrative atlas-narrative" aria-label="地图引导与地方介绍">
    <div className="narrative-scroll" key={`${theme.id}:${hotspot.id}`}>
     <button type="button" className="detail-atlas-return" onClick={()=>{window.location.hash=atlasHash(cityAtlasLocation(hotspot.regionId));}}><Compass size={14}/>城市与地区总览</button>
     {onReturn&&<button type="button" className="detail-atlas-return" onClick={onReturn}><ArrowLeft size={14}/>回到原问题{returnTitle?`：${returnTitle}`:''}</button>}
     <p className="chapter-kicker">{theme.kicker} · 整体地图</p><h1>{theme.title}</h1><p className="question-line">{theme.question}</p><details className="atlas-theme-reading"><summary>这一程怎样连起来</summary><p className="atlas-theme-intro">{theme.summary}</p></details>
     <RecognitionRoute hash={atlasHash(location)} cityId={hotspot.regionId} onNavigate={target=>{if(target.kind==='return'&&onReturn){onReturn();return;}if(target.comparisonStage){const cityId=parseAtlasLocation(target.hash)?.cityId;saveCityComparisonEntry(target.comparisonStage,cityAccessCityRange(cityId==='lhasa'||cityId==='ngari'?cityId:'nyingchi').start);}window.location.hash=target.hash;}}/>
     {theme.id==='environment'&&<button className="atlas-earth-link" onClick={()=>onEarth('G2')}><GlobeHemisphereEast size={19}/><span><strong>先看地球的整体环境</strong><small>纬度、海陆、周边来流怎样影响这里</small></span><ArrowRight size={16}/></button>}
     <label className="atlas-place-select">在整体地图中选择地点<select value={hotspot.id} onChange={event=>setLocation(theme.id,event.target.value)}>{theme.hotspots.map((point,i)=><option key={point.id} value={point.id}>{String(i+1).padStart(2,'0')} · {point.title}</option>)}</select></label>
     <article className="atlas-place-story" aria-live="polite"><div className="atlas-place-kicker"><MapPin size={14}/><span>{hotspot.period||'把问题落到这片土地'}</span><small>{hotspot.locatorKind==='published-approximate-location'?'研究公布约位':'地区定位入口'}</small></div><h2>{hotspot.title}</h2><p>{hotspot.summary}</p><p className="atlas-location-note">位置参照：{hotspot.locatorName} · <a href={hotspot.coordinateSourceUrl} target="_blank" rel="noreferrer">定位来源</a></p><div className="atlas-why"><strong>为什么从这里进入</strong><p>{hotspot.whyHere}</p></div></article>
     {hotspot.detailParagraphs&&<section ref={materialRef} className="atlas-event-material"><details open={showMaterial} onToggle={event=>{if(!event.currentTarget.open)setShowMaterial(false);}}><summary>阅读具体事件与证据</summary>{hotspot.detailParagraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}<div>{hotspot.sources.map(id=>atlasSources.find(item=>item.id===id)).filter(item=>!!item).map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={12}/></a>)}</div></details></section>}
     <section className="atlas-question-list" aria-label="从当前地图地点深入"><h3>{hotspot.materialOnly?'延伸认识的专题背景':'由整体进入细节'}</h3>{questions.map(item=><button key={item.step.id} className={question.step.id===item.step.id?'active':''} aria-pressed={question.step.id===item.step.id} onClick={()=>setLocation(theme.id,hotspot.id,item.step.id)}><span>{item.chapter.shortTitle}</span><strong>{item.step.title}</strong>{saved.completed.includes(item.step.id)?<Check size={15}/>:<ArrowRight size={15}/>}</button>)}{hotspot.materialOnly&&<button className="atlas-background-detail" onClick={()=>onDetail(question.step.id,{themeId:theme.id,hotspotId:hotspot.id,questionId:question.step.id,view:'topics'})}>进入背景专题：{question.step.title}<ArrowRight size={15}/></button>}</section>
     <details className="atlas-other-places"><summary>本图的其他认识入口 · {theme.hotspots.length} 处</summary><nav className="atlas-place-list" aria-label={`${theme.title}的地图地点`}>{theme.hotspots.map((point,i)=><button type="button" key={point.id} aria-pressed={point.id===hotspot.id} className={point.id===hotspot.id?'active':''} onClick={()=>setLocation(theme.id,point.id)}><span>{String(i+1).padStart(2,'0')}</span><strong>{point.title}</strong>{saved.completed.includes(point.questionId)?<Check size={14}/>:<MapPin size={13}/>}</button>)}</nav></details>
     <div className="atlas-reading"><button onClick={()=>setShowSources(value=>!value)} aria-expanded={showSources}><Info size={15}/>这个地点的资料依据</button>{showSources&&<ul>{hotspot.sources.map(id=>{const source=atlasSources.find(item=>item.id===id);return source?<li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={12}/></a>{source.note&&<p className="atlas-location-note">{source.note}</p>}</li>:null;})}</ul>}</div>
     <details className="atlas-data-method"><summary>地图的数据、时期与定位口径</summary><p>底图是 NASA Blue Marble 2004 年 6 月合成影像；它用于海陆定位，不表示今日天气。虚线框内叠加 Mapzen 公开高程，垂直显示夸张 16 倍；框外没有补造地形。</p><p>Natural Earth 提供概览范围参照。图幅覆盖高原与南亚、中国西南等周边，部分全国轮廓在图幅边缘截断。行政范围、自然高原范围与材料入口点分别阅读。</p><p>{hotspot.locationNote}</p><p>聚居地参照来自 Natural Earth 与 GeoNames。GeoNames 数据采用 CC BY 4.0，保留原记录标识及版本；尼阿底位置使用论文公布的约位。</p><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/" target="_blank" rel="noreferrer">NASA 影像说明</a> · <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">公开高程来源</a> · <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a></details>
    </div>
    <div className="next-block atlas-next"><p className="atlas-detail-promise"><BookOpenText size={17}/><span>{hotspot.materialOnly?'以有出处的事件记录为入口，分清当时发生的行动与后来的解释。':question.step.question}</span></p><button className="gold-button next-step" onClick={()=>hotspot.materialOnly?setShowMaterial(true):onDetail(question.step.id,{themeId:theme.id,hotspotId:hotspot.id,questionId:question.step.id,view:'topics'})}>{hotspot.materialOnly?'阅读事件与材料':saved.completed.includes(question.step.id)?`重新查看：${question.step.title}`:`进入详细演示：${question.step.title}`}<ArrowRight size={17}/></button><small>{hotspot.materialOnly?'事件记录附原始出处；背景专题不复原这次事件。':'进入后可操作模型、阅读标注，并回到这处地图。'}</small></div>
   </aside>
  </main>
  <footer className="atlas-footer reference-atlas-strip"><button className="reference-atlas-back" onClick={onDirectory}><List size={18}/><span>专题导览</span></button><nav aria-label="本专题地图地点">{theme.hotspots.map((point,i)=><button key={point.id} aria-current={point.id===hotspot.id?'step':undefined} onClick={()=>setLocation(theme.id,point.id)}><small>{String(i+1).padStart(2,'0')}</small><span>{point.title}</span></button>)}</nav><button className="reference-atlas-back" onClick={onTravel}><Compass size={18}/><span>旅行观察</span></button></footer>
 </div>;
}
