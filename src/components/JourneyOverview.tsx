import { ArrowRight, Check, Compass, GlobeHemisphereEast, Mountains, SpeakerHigh } from '@phosphor-icons/react';
import { chapters } from '../data/curriculum';
import {journeySegments} from '../data/journey';
import {learningChapterIds} from '../data/learningOrder';

export const journeyStops = journeySegments.map(segment=>({id:segment.id,title:segment.title,entry:segment.entryStepId,chapters:segment.chapterIds,question:segment.question,result:segment.summary}));

interface Props { completed: string[]; onStart: (stepId: string, voice: boolean) => void; onExplore: () => void }
export default function JourneyOverview({ completed, onStart, onExplore }: Props) {
  return <div className="journey-overview">
    <p className="overview-lead">今天的西藏是怎样形成的，又怎样持续变化？</p>
    <p>先认识地球海陆，找到亚洲、中国西南与西藏，再观察高原、周边和外部联系。建立这些背景后，回到全域认识七个城市与地区，逐地阅读位置、环境、人文历史与今天。下方专题为进一步解释原因提供材料和演示，可按需要深入。</p>
    <div className="overview-actions"><button className="gold-button" onClick={() => onStart('G1', true)}>从地球开始认识<ArrowRight size={20}/></button><button className="text-button" onClick={() => onStart('G1', false)}>先静音观察</button><button className="text-button" onClick={onExplore}>从一个地方开始</button></div>
    <section className="topic-entrances" aria-label="九类认识专题"><h3>也可以从感兴趣的专题开始</h3><div>{learningChapterIds.map(id=>chapters.find(chapter=>chapter.id===id)!).map(chapter=><button key={chapter.id} onClick={()=>onStart(chapter.steps[0].id,true)}><strong>{chapter.shortTitle}</strong><span>{chapter.question}</span><ArrowRight size={15}/></button>)}</div></section>
    <div className="journey-overview-stops">{journeyStops.map((stop, index) => {
      const steps = chapters.filter(chapter => stop.chapters.includes(chapter.id)).flatMap(chapter => chapter.steps);
      const count = steps.filter(step => completed.includes(step.id)).length;
      return <section key={stop.id}>
        <div className="overview-stop-index">{count === steps.length ? <Check size={20}/> : String(index + 1).padStart(2, '0')}</div>
        <div><p className="overview-chapters">{stop.chapters.map(id=>chapters.find(chapter=>chapter.id===id)?.shortTitle).join(' → ')}</p>
          <h3>{stop.title}</h3><p>{stop.question}</p><small>{stop.result}</small>
          <button onClick={() => onStart(stop.entry, true)}>从这一段进入<ArrowRight size={16}/></button>
        </div>
      </section>;
    })}</div>
    <div className="overview-how"><SpeakerHigh size={21}/><p><strong>介绍跟随画面，探索有来路</strong><br/>讲解可以连续观看；想深入时，随时转动、选点、改条件或展开材料，画面会保留在当前状态。也可以选择在观察处停留，再继续认识。</p></div>
  </div>;
}
