import {foundationChoices,foundationElements,foundationElement,foundationFeedback,foundationIndex} from '../lib/earthFoundationState';
import {orientationSources} from '../data/orientation';
import type {SceneSettings} from '../lib/store';
import type {VisualGuideState} from '../data/visualGuidance';
import './EarthFoundationReading.css';
import NarrationCaption from './NarrationCaption';
import type {NarrationTiming} from '../lib/narrationTiming';

export default function EarthFoundationReading({settings,onChange,onStage,compact=false,guide,currentCaption,timing}:{settings:SceneSettings;onChange:(patch:Partial<SceneSettings>)=>void;onStage:(index:number)=>void;compact?:boolean;guide?:VisualGuideState;currentCaption?:string;timing?:NarrationTiming}){
 const index=foundationIndex(settings.layer),feedback=foundationFeedback(settings,guide);
 if(compact)return <div className="foundation-stage-feedback"><span>看见原因 · {index+1} / 4</span><strong>{feedback.title}</strong><p>{guide?.active&&currentCaption?<NarrationCaption text={currentCaption} timing={timing}/>:feedback.text}</p></div>;
 return <section className="earth-foundation-reading" aria-label="认识地球的四个问题">
  <nav aria-label="地球入门顺序">{['地球上有什么','为什么有冷暖','空气怎样流动','各地有什么不同'].map((label,i)=><button type="button" key={label} aria-pressed={i===index} onClick={()=>onStage(i)}><span>0{i+1}</span>{label}</button>)}</nav>
  {index===0&&<div className="foundation-options" aria-label="认识地球的组成">{foundationElements.map(element=><button type="button" key={element.id} aria-pressed={guide?.active?guide.targets.includes(element.id):foundationElement(settings).id===element.id} onClick={()=>onChange({selected:element.id})}>{element.label}</button>)}</div>}
  {index===3&&<div className="foundation-places" aria-label="比较地球上的不同环境">{foundationChoices.map(place=><button type="button" key={place.id} aria-pressed={(guide?.active&&guide.comparison?guide.comparison:settings.selected)===place.id} onClick={()=>onChange({selected:place.id,progress:.85})}><strong>{place.label}</strong><small>{place.condition}</small></button>)}</div>}
  <article className="foundation-current" aria-live="polite"><h2>{feedback.title}</h2><p>{feedback.text}</p></article>
  {guide?.active&&currentCaption&&<p className="foundation-spoken">当前句：<NarrationCaption text={currentCaption} timing={timing}/></p>}
  {index===3&&<p className="foundation-prompt">用同一组问题看三个地方：在哪里？空气怎样经过？地面有多高？下一节再把这些条件带到西藏。</p>}
  <div className="foundation-manual"><label htmlFor="foundation-progress">{index===0?'逐层认识地球':index===1?'比较同宽光束的落点':index===2?'跟踪一次完整循环':'观察所选地区的条件与结果'}<output>{Math.round(settings.progress*100)}%</output></label><input id="foundation-progress" aria-label="地球入门演示进度" type="range" min="0" max="100" value={Math.round(settings.progress*100)} onChange={event=>onChange({progress:Number(event.target.value)/100,selected:index===0?'':settings.selected})}/><div className="foundation-progress-labels"><span>{index===0?'海洋':index===1?'看光束':index===2?'上升':'起始条件'}</span><span>{index===0?'陆地 · 大气':index===1?'看入射角':index===2?'高处输送 · 下沉':'过程展开'}</span><span>{index===0?'冰雪':index===1?'比较光斑':index===2?'地面回流':'观察结果'}</span></div></div>
  <p className="foundation-scope">NASA 合成地表影像；光束、环流与大气厚度为原理示意。地区比较说明环境类型，未展示实测气温或降雨量。</p>
  <details className="foundation-sources"><summary>依据与进一步阅读</summary>{orientationSources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<small>{source.note}</small></a>)}</details>
 </section>;
}
