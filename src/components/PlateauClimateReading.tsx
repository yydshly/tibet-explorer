import {useId} from 'react';
import {plateauClimatePlaces, plateauClimateSources, plateauClimateStages} from '../data/plateauClimateJourney';
import {plateauClimateFeedback, plateauClimateIndex, plateauClimateState} from '../lib/plateauClimateState';
import type {SceneSettings} from '../lib/store';
import type {VisualGuideState} from '../data/visualGuidance';
import type {NarrationTiming} from '../lib/narrationTiming';
import NarrationCaption from './NarrationCaption';
import './PlateauClimateReading.css';

type PlateauClimateReadingProps = {
  settings: SceneSettings;
  onChange: (patch: Partial<SceneSettings>) => void;
  onStage: (index: number) => void;
  onCity: (cityId: string) => void;
  compact?: boolean;
  guide?:VisualGuideState;
  timing?:NarrationTiming;
  currentCaption?:string;
};

const stageLabels = ['来流进入亚洲', '地形改变气流', '从水汽到云雨', '为什么各地不同', '走向城市与生活'];
const placeLabel = (title: string) => title.split(' · ')[0];
const progressLabels = [
  ['海洋与大陆', '空气抵达山地'],
  ['来到山前', '抬升与绕行'],
  ['空气中的水汽', '云雨与地表水'],
  ['共同条件', '地区差异'],
  ['环境条件', '生活与选择'],
];

function sceneReading(state: ReturnType<typeof plateauClimateState>) {
  if (state.stage === 'arrival') {
    if (state.phase === 'earth') return {title: '海洋、陆地与空气彼此相连', text: '海洋提供水汽，流动的空气把热和水带到别处。先保留整个地球，再靠近亚洲。'};
    if (state.phase === 'asia') return state.season === 'winter'
      ? {title: '冬季背景：也要看西侧来流', text: '西风同样可能携带水汽。沿西侧来向，看空气怎样接近高原。'}
      : {title: '夏季背景：追踪南侧水汽联系', text: '从印度洋向北看，水汽随空气进入陆地；前方的山系将改变它经过的条件。'};
    return {title: '从亚洲整体走近高原', text: '海洋与大陆仍在周围。现在看同一片山地怎样让空气抬升或绕行。'};
  }
  if (state.stage === 'uplift') {
    if (state.phase === 'approach') return {title: '先认来向，再看迎风山地', text: `金色气团接近山地；蓝色标记表示它携带的水汽${state.moisture === 'lower' ? '较少' : '较多'}。`};
    if (state.phase === 'rise') return {title: '地面升高，部分空气被迫抬升', text: '上升气团膨胀并冷却。山地也会让空气绕行，并非所有空气都翻越山脊。'};
    return {title: '抬升冷却以后，还要看水汽', text: '地形和抬升路径相同，初始水汽不同，后面出现的云雨就可能不同。'};
  }
  if (state.stage === 'cloud') {
    if (state.phase === 'inflow') return {title: '蓝色是水汽标记，还没有成云', text: '先跟随空气来到山前，再看抬升冷却如何改变条件。'};
    if (state.phase === 'lift') return {title: '同一团空气沿山地上升', text: '随着抬升，气团膨胀并冷却；水汽充足时，后面才可能凝结成云。'};
    if (state.moisture === 'lower') return {title: '同样的山，出现不同的云雨结果', text: '这次只减少初始水汽，保留地形与路径；本次对照未达到同样的成云、降雨条件。'};
    if (state.phase === 'condense') return {title: '满足条件后，水汽凝结成云滴', text: '成云还不等于下雨。继续推进，看云滴增长以后发生什么。'};
    if (state.phase === 'rain') return {title: '云滴增长，降水才落向地面', text: '沿蓝色雨滴向下看：它们到达的仍是刚才那片山地。'};
    return {title: '水到地面，再接到地方生活', text: '降水进入坡面。汇集、储存和取用，把自然中的水接到人的生活需要。'};
  }
  if (state.stage === 'regions') {
    if (state.city === 'nyingchi') return {title: '林芝：南侧水汽遇上高山深谷', text: '水汽来路与复杂地形共同作用；相邻谷地和高山，也会形成不同环境。'};
    if (state.city === 'lhasa') return {title: '拉萨：高海拔背景中的河谷', text: '河谷较平缓，仍处在高地。高度、季节来流和周围山系要放在一起看。'};
    return {title: '阿里：西部高地的水热条件', text: '远近不同的水汽来路、海拔和环流共同作用，形成较干冷的地区背景。'};
  }
  if (state.city === 'nyingchi') return {title: '从林芝山水，走向土地与通行', text: '河谷、水系和森林构成生活环境；人怎样利用它们，还要看技术、组织与历史。'};
  if (state.city === 'lhasa') return {title: '从拉萨河谷，走向聚居与服务', text: '河流和平缓土地提供条件，供水、交通和公共服务还需要建设与维护。'};
  return {title: '从阿里高地，走向取水与生活', text: '有河水还要有引水、设施和持续管护，水才能服务具体地块与生活。'};
}

export default function PlateauClimateReading({settings, onChange, onStage, onCity, compact = false,guide,timing,currentCaption}: PlateauClimateReadingProps) {
  const progressId = useId();
  const index = plateauClimateIndex(settings.layer);
  const stage = plateauClimateStages[index];
  const state = plateauClimateState(settings);
  const feedback = plateauClimateFeedback(settings);
  const sceneFeedback = guide?.active?{title:guide.title,text:guide.explanation}:sceneReading(state);
  const place = plateauClimatePlaces.find(item => item.id === state.city) ?? plateauClimatePlaces[0];
  const progress = Math.round(Math.max(0, Math.min(1, Number.isFinite(settings.progress) ? settings.progress : 0)) * 100);
  const isRegional = index >= 3;
  const sourceIds = new Set([...stage.sourceIds, ...(isRegional ? place.sourceIds : [])]);
  const sources = plateauClimateSources.filter(source => sourceIds.has(source.id));

  if (compact) return <div className="plateau-climate-stage-feedback" aria-live="off">
    <span>从全球运行到地方环境 · {index + 1} / {stageLabels.length}</span>
    <strong>{sceneFeedback.title}</strong><p><NarrationCaption text={guide?.active&&currentCaption?currentCaption:sceneFeedback.text} timing={timing}/></p>
  </div>;

  return <section className="plateau-climate-reading" aria-label="从来流到地方生活的连续认识">
    <nav className="plateau-climate-stages" aria-label="气候与地方的五个问题">
      {stageLabels.map((label, stageIndex) => <button type="button" key={label} aria-pressed={index === stageIndex} onClick={() => onStage(stageIndex)}><span>{String(stageIndex + 1).padStart(2, '0')}</span>{label}</button>)}
    </nav>

    {index === 0 && <fieldset className="plateau-climate-condition"><legend>保持地形，比较季节来路</legend><div>
      <button type="button" aria-pressed={settings.season === 1} onClick={() => onChange({season: 1})}>夏季背景</button>
      <button type="button" aria-pressed={settings.season === 3} onClick={() => onChange({season: 3})}>冬季背景</button>
    </div></fieldset>}

    {(index === 1 || index === 2) && <fieldset className="plateau-climate-condition"><legend>保持地形，改变初始水汽</legend><div>
      <button type="button" aria-pressed={settings.airMoisture !== 'lower'} onClick={() => onChange({airMoisture: 'higher'})}>水汽较多</button>
      <button type="button" aria-pressed={settings.airMoisture === 'lower'} onClick={() => onChange({airMoisture: 'lower'})}>水汽较少</button>
    </div></fieldset>}

    {isRegional && <div className="plateau-climate-places" aria-label="在同一地图中比较地区">
      {plateauClimatePlaces.map(item => <button type="button" key={item.id} aria-pressed={place.id === item.id} onClick={() => onChange({selected: item.id})}>{placeLabel(item.title)}</button>)}
    </div>}

    {state.stage !== 'regions' && <div className="plateau-climate-manual">
      <label htmlFor={progressId}><span>回拖查看过程怎样发生</span><output>{progress}%</output></label>
      <input id={progressId} aria-label={`${stageLabels[index]}演示进度`} type="range" min="0" max="100" value={progress} onChange={event => onChange({progress: Number(event.target.value) / 100})}/>
      <div className="plateau-climate-progress-labels"><span>{progressLabels[index][0]}</span><span>{progressLabels[index][1]}</span></div>
    </div>}

    <article className="plateau-climate-current" aria-live="polite"><h2>{guide?.active?guide.title:feedback.title}</h2><p>{guide?.active?guide.explanation:feedback.text}</p></article>
    {guide?.active&&currentCaption&&<p className="plateau-climate-look">当前句：<NarrationCaption text={currentCaption} timing={timing}/></p>}

    <p className="plateau-climate-look"><span>留意画面</span>{stage.lookFor}</p>

    {isRegional && <div className="plateau-climate-place-context"><span>{place.title} · {index === 4 ? '从环境走向生活' : '同一整体中的地方条件'}</span><p>{index === 4 ? place.lifeConnection : place.climateExplanation}</p>
      {index === 4 && <><p>把林芝、拉萨、阿里保留在同一张高程地图上，比较气候、地形与生活条件，再进入各地文化与历史。</p><button type="button" className="plateau-climate-city-entry" onClick={() => onCity(place.id)}>同图对照林芝、拉萨与阿里<span aria-hidden="true">↗</span></button></>}
    </div>}

    <p className="plateau-climate-data-key">真实高程 · 高差显示×50 · 气流云雨为原理演示</p>
    <details className="plateau-climate-sources"><summary>资料依据与演示范围</summary><p>{stage.scope}</p>{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<small>{source.note}</small></a>)}</details>
  </section>;
}
