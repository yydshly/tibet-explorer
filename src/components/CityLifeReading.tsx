import {useId} from 'react';
import {ArrowCounterClockwise, ArrowRight, Pause, Play, SpeakerHigh, SpeakerSlash} from '@phosphor-icons/react';
import {cityLifeSources, getCityLifeJourney} from '../data/cityLifeJourney';
import type {CityLifeStageId} from '../data/cityLifeJourney';
import {cityLifeBeat, clampCityProgress} from '../lib/cityLifeState';
import './CityLifeReading.css';
import NarrationCaption from './NarrationCaption';
import NarrationAlignmentNotice from './NarrationAlignmentNotice';
import type {NarrationTiming} from '../lib/narrationTiming';

export type CityLifeReadingProps = {
  cityId: string;
  stage: CityLifeStageId;
  progress: number;
  sceneProgress?:number;
  maintained: boolean;
  playing: boolean;
  soundEnabled: boolean;
  narrationStatus?: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  currentSentence?: string;
  narrationTiming?:NarrationTiming;
  alignmentUnavailable?:boolean;
  onStage: (stage: CityLifeStageId) => void;
  onProgress: (progress: number) => void;
  onMaintained: (maintained: boolean) => void;
  onPlayPause: () => void;
  onReplay: () => void;
  onSoundChange: (enabled: boolean) => void;
  onContinue?: () => void;
  onExploreHistory?: () => void;
  compact?: boolean;
};

const stages: {id: CityLifeStageId; label: string; next: string}[] = [
  {id: 'environment', label: '环境条件', next: '继续看城市生活'},
  {id: 'life', label: '城市生活', next: '继续看文化与历史'},
  {id: 'history', label: '文化历史', next: '继续探索这个地方'},
];

export default function CityLifeReading({cityId, stage, progress, sceneProgress, maintained, playing, soundEnabled, narrationStatus = 'idle', error, currentSentence, narrationTiming, alignmentUnavailable = false, onStage, onProgress, onMaintained, onPlayPause, onReplay, onSoundChange, onContinue, onExploreHistory, compact = false}: CityLifeReadingProps) {
  const progressId = useId();
  const journey = getCityLifeJourney(cityId);
  if (!journey) return null;
  const current = journey.stages.find(item => item.id === stage) ?? journey.stages[0];
  const stageIndex = Math.max(0, stages.findIndex(item => item.id === current.id));
  const clock = clampCityProgress(progress);
  const beat = cityLifeBeat(cityId, current.id, sceneProgress??clock) ?? current.beats[0];
  const beatIndex = Math.max(0, current.beats.indexOf(beat));
  const maintenanceFeedback = maintained ? journey.maintenanceFeedback.maintained : journey.maintenanceFeedback.unmaintained;
  const milestone = current.id === 'history' ? journey.historyMilestones[Math.min(beatIndex, journey.historyMilestones.length - 1)] : undefined;
  const sourceIds = [...new Set([...(milestone?.sourceIds ?? []), ...current.sourceIds])];
  const sources = sourceIds.flatMap(id => cityLifeSources.find(source => source.id === id) ?? []);
  const cityName = cityId === 'nyingchi' ? '林芝' : cityId === 'lhasa' ? '拉萨' : '阿里';

  if (compact) return <div className="city-life-stage-feedback" aria-live="off">
    <span>{cityName} · {stages[stageIndex].label}</span>
    <strong>{beat.title}</strong><p className="city-life-scene-caption">{current.id === 'life' && <em>{maintained ? '已加入取用与管护' : '对照：仅自然条件'} · </em>}<NarrationCaption text={currentSentence || beat.text} timing={narrationTiming}/></p>
  </div>;

  return <section className="city-life-reading" aria-label={`${journey.title}：从环境到城市生活与文化历史`}>
    <nav className="city-life-stages" aria-label="城市认识的三个相连问题">
      {stages.map((item, index) => <button type="button" key={item.id} aria-pressed={current.id === item.id} onClick={() => onStage(item.id)}><small>0{index + 1}</small><span>{item.label}</span></button>)}
    </nav>

    <div className="city-life-playback" aria-label="讲解播放控制">
      <button type="button" className="city-life-play" onClick={onPlayPause}>{playing ? <Pause size={14} weight="fill"/> : <Play size={14} weight="fill"/>}{playing ? '暂停讲解' : '播放讲解'}</button>
      <button type="button" aria-label="重播当前段" title="重播当前段" onClick={onReplay}><ArrowCounterClockwise size={16}/></button>
      <button type="button" aria-label={soundEnabled ? '关闭讲解声音' : '开启讲解声音'} aria-pressed={soundEnabled} onClick={() => onSoundChange(!soundEnabled)}>{soundEnabled ? <SpeakerHigh size={16}/> : <SpeakerSlash size={16}/>}<span>{soundEnabled ? '有声' : '静音'}</span></button>
    </div>
    {narrationStatus === 'loading' && soundEnabled && <p className="city-life-audio-status" role="status">正在准备本段讲解声音…</p>}
    {(narrationStatus === 'error' || error) && <p className="city-life-audio-status is-error" role="status">{error || '本段声音暂不可用，文字与场景仍可继续操作。'}</p>}

    <NarrationAlignmentNotice unavailable={alignmentUnavailable}/>
    <div className="city-life-progress">
      <label htmlFor={progressId}><span>沿同一地形看变化</span><output>{Math.round(clock * 100)}%</output></label>
      <input id={progressId} aria-label={`${stages[stageIndex].label}演示进度`} type="range" min="0" max="100" value={Math.round(clock * 100)} onChange={event => onProgress(Number(event.target.value) / 100)}/>
      <div><span>{current.beats[0].title}</span><span>{current.beats[current.beats.length - 1].title}</span></div>
    </div>

    {current.id === 'life' && <fieldset className="city-life-maintenance"><legend>保留自然条件，对照设施与管护</legend><div>
      <button type="button" aria-pressed={!maintained} onClick={() => onMaintained(false)}>只看自然条件</button>
      <button type="button" aria-pressed={maintained} onClick={() => onMaintained(true)}>加入取用与管护</button>
    </div><p>操作会暂停讲解；播放恢复本段示范条件。</p></fieldset>}

    <article className="city-life-current" aria-live="polite"><h2>{beat.title}</h2><p>{beat.text}</p></article>

    {current.id === 'life' && <div className="city-life-conditions"><nav className="city-life-processes" aria-label="直接观察同一地形上的生活条件">{['通行与高差','水源与取用','城市与空间'].map((item,index)=><button key={item} aria-pressed={beatIndex===index} onClick={()=>onProgress([.01,.35,.69][index])}>{item}</button>)}</nav><p aria-live="polite">{maintenanceFeedback}</p></div>}

    {milestone && <section className="city-life-material" aria-label="真实历史材料与年代">
      <span>材料与年代</span><p className="city-life-material-date">{milestone.date}</p><h3>{milestone.title}</h3><p>{milestone.text}</p>
      {sources[0] && <a href={sources[0].url} target="_blank" rel="noreferrer">{sources[0].title}<ArrowRight size={12}/></a>}
    </section>}

    <details className="city-life-transcript"><summary>讲解文字</summary><p><NarrationCaption text={currentSentence || current.narration} timing={narrationTiming}/></p></details>

    <div className="city-life-bridge"><p>{current.id==='history'?'历史留下了地方的用途与文化。保留这张地图，继续看铁路、航空和服务设施的具体建设怎样改变抵达与生活条件。':current.bridge}</p>{onContinue && <button type="button" onClick={onContinue}>{current.id === 'history' ? '继续同图看现代发展' : stages[stageIndex].next}<ArrowRight size={13}/></button>}{current.id==='history'&&onExploreHistory&&<button type="button" onClick={onExploreHistory}>{cityId==='lhasa'?'深入唐蕃会盟碑材料':cityId==='ngari'?'深入托林交流材料':'深入文化传习与交流'}<ArrowRight size={13}/></button>}</div>

    <p className="city-life-map-scope">地图保留真实高程和地点参照；试线、取用和空间读法不代表实测设施或城市边界。</p>
    <details className="city-life-sources"><summary>真实资料与演示范围 · {sources.length} 项</summary><p>{current.scope}</p>{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<small>{source.note}</small></a>)}</details>
  </section>;
}
