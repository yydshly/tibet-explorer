import { Compass } from '@phosphor-icons/react';
import type { SceneUnderstanding } from '../data/sceneUnderstanding';

export default function SceneExplanation({ understanding, selected, onSelect, showExplanation=true }: {
  understanding: SceneUnderstanding;
  selected: string;
  onSelect: (id: string) => void;
  showExplanation?: boolean;
}) {
  return <section className="scene-explanation" aria-label="画面与文字一起认识">
    {showExplanation?<><strong>{understanding.title}</strong><p>{understanding.explanation}</p></>:<span className="object-reading-label">画面对象 · 点击进一步认识</span>}
    {understanding.objects.length>0&&<div className="scene-object-index" aria-label="辨认画面对象">
      {understanding.objects.map(object => <button type="button" key={object.id}
        aria-pressed={selected === object.id} className={selected === object.id ? 'active' : ''}
        onClick={() => onSelect(object.id)}>{object.name}</button>)}
    </div>}
    <p className="explanation-look"><Compass size={14}/>{understanding.lookFor}</p>
    <small>{understanding.provenance}</small>
  </section>;
}
