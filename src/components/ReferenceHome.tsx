import {lazy,Suspense,useState} from 'react';
import {ArrowCounterClockwise,ArrowRight,ArrowUpRight,BookmarkSimple,Compass,Cube,GlobeHemisphereEast,Info,List,MapPin} from '@phosphor-icons/react';
import TibetScene from '../scene/TibetScene';
import type {RecognitionNavigation} from '../lib/recognitionRoute';
import './ReferenceHome.css';
const OverviewRoutePreview=lazy(()=>import('./OverviewRoutePreview'));

export type ReferenceHomeTheme = 'nature'|'history'|'connections'|'travel';
export interface ReferenceHomeProps {
 onStartEarth:()=>void;
 onContinue:()=>void;
 hasResume:boolean;
 onCity:(cityId:string)=>void;
 onTheme:(theme:ReferenceHomeTheme)=>void;
 onDirectory:()=>void;
 onModels:()=>void;
 onSaved:()=>void;
 onRecognitionNavigate?:(target:RecognitionNavigation)=>void;
}

const themes:{id:ReferenceHomeTheme;name:string;english:string;tag:string;description:string;topics:string;image:string}[]=[
 {id:'nature',name:'地球与自然',english:'EARTH & LANDSCAPE',tag:'从这里开始',description:'先看地球怎样运转，再读懂西藏。',topics:'位置与形成 · 山川地形 · 气候与水',image:'earth'},
 {id:'history',name:'历史与文化',english:'HISTORY & CULTURE',tag:'沿时间认识',description:'沿七市地的具体人物与事件，理解文化怎样形成。',topics:'文化传习 · 历次建设 · 跨地区交流',image:'material'},
 {id:'connections',name:'城市与联系',english:'PLACES & CONNECTIONS',tag:'放回地图',description:'从建设事件，看通行、服务和生活怎样改变。',topics:'铁路与航空 · 地方接续 · 发展与保护',image:'region'},
 {id:'travel',name:'旅行与观察',english:'TRAVEL & OBSERVATION',tag:'带着问题出发',description:'选一组地方，保存并编辑有目的的观察。',topics:'三地对照 · 观察目的 · 我的线路',image:'landscape'},
];

function RegionImage({kind}:{kind:string}){
 if(kind==='material')return <div className="reference-home-material"><img src="https://collectionapi.metmuseum.org/api/collection/v1/iiif/37610/2209706/main-image" alt="The Met 馆藏木经板，藏品号1987.407.6" loading="lazy"/><span>木经板 · The Met · 公共领域</span></div>;
 if(kind==='region')return <div className="reference-home-photo photo-lhasa"><img src="/assets/reference-home/lhasa-aster-2005.jpg" alt="2005年11月24日拉萨河谷，NASA利用ASTER立体观测制作的假彩色地形影像" loading="lazy"/><span>拉萨 · 假彩色 · NASA</span></div>;
 if(kind==='landscape')return <div className="reference-home-photo photo-lake"><img src="/assets/reference-home/ngangla-ringco-iss-2024.jpg" alt="2024年9月22日国际空间站宇航员拍摄的Ngangla Ringco湖，影像ISS071-E-714981" loading="lazy"/><span>高原湖泊 · NASA / ISS</span></div>;
 // Geographic overview from the existing NASA raster, not a destination photo.
 return <div className={`reference-home-raster raster-${kind}`}><img src="/assets/earth-blue-marble.jpg" alt="NASA合成影像中的高原与周边" loading="lazy"/><span>高原与周边 · NASA 影像</span></div>;
}

export default function ReferenceHome({onStartEarth,onContinue,hasResume,onCity,onTheme,onDirectory,onModels,onSaved,onRecognitionNavigate}:ReferenceHomeProps){
 const [sceneKey,setSceneKey]=useState(0),[resetKey,setResetKey]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [routeOpen,setRouteOpen]=useState(false);
 return <main className="reference-home">
  <div className="reference-home-map" aria-label="西藏与周边可操作的三维地图">
   <TibetScene key={sceneKey} scene="region" viewKey="atlas-home" step={0} season={1} layer="atlas-home" progress={0} playing={false} selected="" cutaway={false} resetKey={resetKey} onSelect={id=>{if(id.startsWith('city:'))onCity(id.slice(5));}} onInteract={()=>{}} onReady={()=>setReady(true)} onError={message=>{setError(message);setReady(true);}}/>
  </div>
  <div className="reference-home-shade" aria-hidden="true"/>
  <header className="reference-home-header">
   <a href="#/" className="reference-home-brand"><i/>西藏地理与人文<span>互动图鉴</span></a>
   <nav aria-label="首页工具"><a className="project-review-entry" href="/project-review/index.html" title="最初思路、阶段验收与后续处理方案">项目说明</a><button type="button" onClick={onSaved}><BookmarkSimple size={15}/>我的探索</button><button type="button" onClick={onDirectory}><List size={16}/>全部专题</button></nav>
  </header>
  <section className="reference-home-intro" aria-labelledby="reference-home-title">
   <h1 id="reference-home-title">西藏<span>XIZANG</span></h1>
   <p className="reference-home-description">位于中国西南，青藏高原的重要部分。<br/>沿一条主线，从地球认识这片土地与人的生活。</p>
   <div className="reference-home-context"><div><span>地理位置</span><strong>中国西南</strong><small>亚洲 · 青藏高原</small></div><div><span>城市与地区</span><strong>六市一地区</strong><small>从全域认识不同地方</small></div></div>
   <div className="reference-home-start"><button type="button" onClick={onStartEarth}><GlobeHemisphereEast size={16}/>完整认识西藏<ArrowRight size={16}/></button>{hasResume&&<button type="button" className="reference-home-resume" onClick={onContinue}>继续上次<ArrowUpRight size={14}/></button>}</div>
  </section>
  <div className="reference-home-map-tools"><span>西藏自治区 · 区域总览</span><button type="button" aria-label="恢复西藏整体视野" onClick={()=>setResetKey(value=>value+1)}><ArrowCounterClockwise size={18}/></button></div>
  {!ready&&<div className="reference-home-scene-status" role="status"><GlobeHemisphereEast size={22}/><span>正在展开高原地形…</span></div>}
  {error&&<div className="reference-home-scene-status reference-home-scene-error" role="alert"><Info size={20}/><strong>地图暂时无法打开</strong><p>{error}</p><button type="button" onClick={()=>{setError('');setReady(false);setSceneKey(value=>value+1);}}>重新加载</button></div>}
  <div className="reference-home-map-caption"><Compass size={14}/><span>拖动旋转 · 滚轮缩放 · 点选城市</span></div>
  <section className="reference-home-explore" aria-label="主题图层与探索入口">
   <div className="reference-home-section-label"><h2>主题探索<span>THEMES</span></h2><button className="reference-home-route-toggle" type="button" aria-expanded={routeOpen} aria-controls="home-recognition-route" onClick={()=>setRouteOpen(value=>!value)}>六个问题：位置 → 环境 → 差异 → 生活 → 历史 → 今天<ArrowRight size={13}/></button><button type="button" onClick={onDirectory}>全部专题<ArrowRight size={13}/></button></div>
   {routeOpen&&<div id="home-recognition-route" className="reference-home-route-panel"><button className="reference-home-route-close" type="button" onClick={()=>setRouteOpen(false)}>收起认识路线</button><Suspense fallback={<p>正在展开六个核心问题…</p>}><OverviewRoutePreview onStart={()=>{setRouteOpen(false);onStartEarth();}}/></Suspense></div>}
   <div className="reference-home-entry-grid">
    {themes.map((theme,index)=><button className={`reference-home-theme theme-${theme.id}`} key={theme.id} type="button" onClick={()=>onTheme(theme.id)}>
     <div className="reference-home-thumbnail"><RegionImage kind={theme.image}/><div className="reference-home-thumb-label"><span>0{index+1}</span><span>{theme.tag}</span></div></div>
     <div className="reference-home-theme-copy"><h3>{theme.name}<ArrowUpRight size={17}/></h3><span className="reference-home-english">{theme.english}</span><p>{theme.description}</p><small>{theme.topics}</small></div>
    </button>)}
    <div className="reference-home-secondary-entries"><button type="button" onClick={()=>onCity('lhasa')}><MapPin size={23}/><span><strong>地图图鉴</strong><small>七市地：环境 → 生活 → 历史与联系</small></span><ArrowRight size={17}/></button><button type="button" onClick={onModels}><Cube size={23}/><span><strong>原理与模型</strong><small>深入一个具体问题</small></span><ArrowRight size={17}/></button></div>
   </div>
  </section>
  <footer className="reference-home-footer"><span>整体地图 · 主题讲解 · 地方图鉴</span><details><summary>地图与图片来源</summary><div><p>地图采用 NASA Blue Marble 合成影像、Mapzen 公开高程及 Natural Earth 概览范围。高程覆盖区垂直显示夸张 16 倍；城市点位为城区或驻地参照。</p><a href="https://www.xizang.gov.cn/rsxz/zrdl/202306/t20230607_359670.html" target="_blank" rel="noreferrer">西藏自治区人民政府 · 自然地理</a><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/" target="_blank" rel="noreferrer">NASA · Blue Marble</a><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Mapzen · 公开高程</a><a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth · 概览范围</a><a href="https://www.metmuseum.org/art/collection/search/37610" target="_blank" rel="noreferrer">The Met · 木经板 1987.407.6 · 公共领域</a><a href="https://science.nasa.gov/earth/earth-observatory/lhasa-tibet-40334/" target="_blank" rel="noreferrer">拉萨 · NASA Earth Observatory · 2005-11-24</a><p>Jesse Allen 制作；数据来自 NASA/GSFC/METI/ERSDAC/JAROS 与美日 ASTER 科学团队。假彩色影像叠加立体地形，植被呈红色；不表示今天的城市范围。</p><a href="https://science.nasa.gov/earth/earth-observatory/a-bejeweled-plateau-154026/" target="_blank" rel="noreferrer">Ngangla Ringco 湖 · NASA / ISS · 2024-09-22</a><p>国际空间站第71远征队宇航员摄影，ISS071-E-714981；NASA/JSC 提供。原发布图经过裁切、对比度调整与镜头瑕疵处理；此处仅作湖泊观察入口。</p><a href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noreferrer">NASA 图片使用指引 · 教育与信息用途</a></div></details></footer>
 </main>;
}
