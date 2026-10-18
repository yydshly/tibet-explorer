import { useState } from 'react';
import { ArrowRight, BookOpenText, Check, CloudRain, Compass, GlobeHemisphereEast, Mountains, Path, Stack, Wind } from '@phosphor-icons/react';
import { chapters } from '../data/curriculum';
import './ReferenceLibrary.css';

export type ReferenceLibraryGroup = 'nature' | 'history' | 'connections' | 'travel';
interface Props {
  mode: 'topics' | 'models';
  onOpen: (stepId: string) => void;
  onOverview: () => void;
  completed: string[];
  initialGroup?: ReferenceLibraryGroup;
}

const groups = [
  { id: 'nature', title: '自然地理', icon: Mountains, chapters: ['position', 'climate', 'regions', 'landscapes'], description: '从地球的整体环境与运行，认识高原、气候和地方差异。' },
  { id: 'history', title: '历史人文', icon: BookOpenText, chapters: ['history', 'culture'], description: '沿具体人物、事件与材料，认识历史和文化的形成。' },
  { id: 'connections', title: '周边与今天', icon: Compass, chapters: ['connections', 'modern'], description: '将流域、通道、地方生活与现代发展联系起来。' },
  { id: 'travel', title: '探索与旅行', icon: Path, chapters: ['travel'], description: '把感兴趣的地点与问题，整理为自己的探索路线。' },
] as const;

const models = [
  { id: 'G1', title: '地球怎样运转', icon: GlobeHemisphereEast, action: '认识海陆与空气 · 对照冷暖、环流和地方差异', description: '先认清地球上有什么，再看阳光、空气和水怎样联系；对比刚果、撒哈拉与青藏高原，理解不同地方的结果。', scope: '公开影像与整体过程示意' },
  { id: 'G3', title: '高原形成', icon: Stack, action: '拖动演示进度 · 观察挤压与增厚', description: '看相对运动、地壳增厚与地表起伏怎样联系，再对照地质研究的时间和范围。', scope: '构造过程原理示意' },
  { id: 'G4', title: '高程与剖面', icon: Mountains, action: '移动切线 · 对读三维地形和米制剖面', description: '在同一份公开高程中比较山地与低处，读取剖面位置和海拔。', scope: '公开高程 · 显示高度有夸张' },
  { id: 'C4', title: '大气环流', icon: Wind, action: '切换季节 · 观察来流与地形关系', description: '将地球尺度的环流、海陆和高原背景放在一起，认识西风与季节性来流。', scope: '环流关系示意' },
  { id: 'C5', title: '水汽与降雨', icon: CloudRain, action: '改变水汽条件 · 跟随空气抬升', description: '观察空气上升、凝结、云滴增长和降雨的接续，比较不同初始水汽条件。', scope: '定性原理演示' },
  { id: 'K3', title: '经板与书页', icon: BookOpenText, action: '展开保护结构 · 对照真实馆藏', description: '对读 The Met 馆藏木经板与可操作结构，认识封护、书页和使用关系。', scope: '馆藏材料与功能示意' },
] as const;

export default function ReferenceLibrary({ mode, onOpen, onOverview, completed, initialGroup = 'nature' }: Props) {
  const [groupId, setGroupId] = useState<ReferenceLibraryGroup>(initialGroup);
  const group = groups.find(item => item.id === groupId) || groups[0];
  const selectedChapters = group.chapters.flatMap(id => chapters.find(chapter => chapter.id === id) || []);
  const completedIds = new Set(completed);

  if (mode === 'models') return <section className="reference-library reference-model-library" aria-label="可操作模型工具">
    <div className="reference-library-intro"><p className="reference-library-kicker">MODELS · 认识工具</p><h3>用操作看清一个问题</h3><p>选择一个工具，进入已有的三维演示。讲解、文字标注与资料随演示一起展开。</p></div>
    <div className="reference-model-grid">{models.map(model => <button className="reference-model-card" type="button" key={model.id} onClick={() => onOpen(model.id)}>
      <div className="reference-model-heading"><model.icon size={31} weight="duotone" aria-hidden="true"/><span>{model.scope}</span>{completedIds.has(model.id) && <Check size={17} aria-label="已完成"/>}</div>
      <h4>{model.title}</h4><p>{model.description}</p><small>{model.action}</small><span className="reference-card-open">打开演示<ArrowRight size={16} aria-hidden="true"/></span>
    </button>)}</div>
  </section>;

  return <section className="reference-library" aria-label="主题图展与专题内容">
    <div className="reference-library-intro"><p className="reference-library-kicker">THEMES · 主题图展</p><h3>从感兴趣的主题进入西藏</h3><p>第一次认识，可先看地球上有什么、整体环境怎样运转，再走向西藏。也可以选择专题，每条线路都有自己的讲解与操作。</p></div>
    <button className="reference-earth-entry" type="button" onClick={onOverview}><GlobeHemisphereEast size={26} weight="duotone" aria-hidden="true"/><span><strong>完整认识西藏 · 十章总览</strong><small>地球 → 环境与高原 → 地方生活 → 文化历史 → 今天与观察</small></span><ArrowRight size={19} aria-hidden="true"/></button>
    <nav className="reference-library-groups" aria-label="主题分类">{groups.map(item => <button type="button" key={item.id} aria-pressed={item.id === groupId} onClick={() => setGroupId(item.id)}><item.icon size={17} aria-hidden="true"/>{item.title}</button>)}</nav>
    <p className="reference-group-description">{group.description}</p>
    <div className="reference-chapters">{selectedChapters.map(chapter => <section className="reference-chapter" key={chapter.id} aria-labelledby={`reference-chapter-${chapter.id}`}>
      <header><div><h4 id={`reference-chapter-${chapter.id}`}>{chapter.shortTitle}</h4><p>{chapter.question}</p></div><span>{chapter.steps.length} 节</span></header>
      <ol>{chapter.steps.map((step, index) => <li key={step.id}><button type="button" onClick={() => onOpen(step.id)}>
        <span className="reference-step-number">{String(index + 1).padStart(2, '0')}</span><span className="reference-step-copy"><strong>{step.title}</strong><small>{step.question}</small></span>{completedIds.has(step.id) ? <Check size={17} aria-label="已完成"/> : <ArrowRight size={16} aria-hidden="true"/>}
      </button></li>)}</ol>
    </section>)}</div>
  </section>;
}
