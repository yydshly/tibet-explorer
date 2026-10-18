import { useEffect, useRef } from 'react';
import { type Chapter, type Step } from '../data/curriculum';
import {recognitionSteps} from '../lib/topicJourney';
import './TopicOutline.css';

interface Props {
  chapter: Chapter;
  step: Step;
  onNavigate: (chapter: Chapter, step: Step) => void;
}

export default function TopicOutline({ chapter, step, onNavigate }: Props) {
  const strip = useRef<HTMLElement>(null);
  const activeButton = useRef<HTMLButtonElement>(null);
  const isRecognition=recognitionSteps.some(item=>item.step.id===step.id);
  const records=isRecognition?recognitionSteps:chapter.steps.map(st=>({chapter,step:st}));
  const position = records.findIndex(item => item.step.id === step.id) + 1;

  useEffect(() => {
    const viewport = strip.current;
    const active = activeButton.current;
    if (!viewport || !active) return;
    const outer = viewport.getBoundingClientRect();
    const inner = active.getBoundingClientRect();
    if (inner.left < outer.left) viewport.scrollLeft -= outer.left - inner.left + 4;
    else if (inner.right > outer.right) viewport.scrollLeft += inner.right - outer.right + 4;
  }, [chapter.id, step.id]);

  return <div className="topic-outline">
    <div className="topic-outline-heading">
      <span>{isRecognition?'地球 → 地方':chapter.shortTitle}</span>
      <small>{String(position).padStart(2, '0')} / {String(records.length).padStart(2, '0')}</small>
    </div>
      <nav ref={strip} className="topic-outline-strip" aria-label={isRecognition?'从地球到地方的认识主线':`${chapter.title}的全部内容`}>
        <ol>{records.map(({chapter:targetChapter,step:item}, index) => <li key={item.id}>
          <button
            ref={item.id === step.id ? activeButton : undefined}
            type="button"
            aria-current={item.id === step.id ? 'step' : undefined}
            onClick={() => onNavigate(targetChapter, item)}
          >
            <span className="topic-outline-item-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="topic-outline-item-title">{item.title}</span>
          </button>
        </li>)}</ol>
      </nav>
  </div>;
}
