import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowSquareOut, ArrowUp, BookmarkSimple, Books,
  Check, CheckCircle, Compass, DownloadSimple, MagnifyingGlass, MapPin,
  Notebook, Plus, Trash,
} from '@phosphor-icons/react';
import {
  chapters, cultureTopics, historyPeriods, regions, sources, travelStops,
  type Chapter, type Source, type Step,
} from '../data/curriculum';
import { resolveHistoryPeriodIndex, resolveCultureTopicIndex, settingsForStep, writeExploration, type Exploration, type SceneSettings } from '../lib/store';
import { getPlaceProfile, type PlaceObject } from '../data/placeProfiles';
import {learningChapterIds,learningChapterNumber} from '../data/learningOrder';
import {travelPlanLessons} from '../data/travelPlanLessons';
import {orientationSources} from '../data/orientation';
import {plateauClimateSources} from '../data/plateauClimateJourney';
import {cityTravelOrigin} from '../lib/cityTravelOrigin';
import {cityContinuityTravelEvidence} from '../lib/cityContinuityTravel';
import TravelAccessSegments from './TravelAccessSegments';
import {travelAccessSegments} from '../data/travelAccessSegments';
import {travelAccessRecordMarkdown} from '../lib/travelAccessExport';
import type {CityAccessCityId} from '../lib/cityAccessState';

export type DrawerKind = 'contents' | 'detail' | 'sources' | 'explore' | 'saved' | 'travel' | 'complete';

interface DrawerContentProps {
  kind: DrawerKind;
  chapter: Chapter;
  step: Step;
  settings: SceneSettings;
  saved: Exploration;
  setSaved: Dispatch<SetStateAction<Exploration>>;
  navigate: (chapter: Chapter, step: Step) => void;
  open: (kind: DrawerKind | null) => void;
  notify: (text: string) => void;
  feedback: string;
}

const allSteps = chapters.flatMap((chapter) => chapter.steps.map((step) => ({ chapter, step })));
// Keep the exploration return position when the drawer closes to enter a shared lesson.
const exploreMemory: { query: string; placeId: string | null } = { query: '', placeId: null };

function sourceRecords(ids: string[]): Source[] {
  return [...new Set(ids)].flatMap((id) => {
    const item = sources.find((source) => source.id === id);
    return item ? [item] : [];
  });
}

function SourceList({ items }: { items: Source[] }) {
  return <ul className="drawer-source-list">
    {items.map((source) => <li key={source.id}>
      <a href={source.url} target="_blank" rel="noreferrer">
        <span>{source.title}</span><ArrowSquareOut size={17} aria-hidden="true" />
      </a>
      {source.note && <p>{source.note}</p>}
    </li>)}
  </ul>;
}

function downloadMarkdown(name: string, text: string) {
  const blob = new Blob(['\uFEFF', text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function knowledgeUrl(chapterId: string, stepId: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = `/learn/${chapterId}/${stepId}`;
  return url.toString();
}

function mapReturnUrl(hash:string):string {
  const url=new URL(window.location.href);
  url.search='';
  url.hash=hash;
  return url.toString();
}

export default function DrawerContent({
  kind, chapter, step, settings, saved, setSaved, navigate, open, notify, feedback,
}: DrawerContentProps) {
  const [detailTab, setDetailTab] = useState<'step' | 'chapter'>('step');
  const [query, setQuery] = useState(() => exploreMemory.query);
  const [placeId, setPlaceId] = useState<string | null>(() => exploreMemory.placeId);
  useEffect(() => { exploreMemory.query = query; exploreMemory.placeId = placeId; }, [query, placeId]);
  useEffect(() => { setDetailTab('step'); }, [step.id]);

  const visited = new Set(saved.visited.filter((id) => allSteps.some((item) => item.step.id === id)));
  const completed = new Set(saved.completed.filter((id) => allSteps.some((item) => item.step.id === id)));
  const bookmarks = allSteps.filter((item) => saved.bookmarks.includes(item.step.id));
  const selectedStops = [...new Set(saved.route)].flatMap((id) => {
    const stop = travelStops.find((item) => item.id === id);
    return stop ? [stop] : [];
  });
  const accessCities=(['nyingchi','lhasa','ngari'] as CityAccessCityId[]).filter(id=>
    selectedStops.some(stop=>id==='nyingchi'?stop.id==='nyingchi-lulang':id==='ngari'?stop.id==='shiquanhe-life':['lhasa-river','lhasa-buildings','lhasa-old-town'].includes(stop.id))||
    travelAccessSegments[id].some(segment=>saved.accessVerifications?.[segment.id]));
  const period = chapter.id === 'history'
    ? historyPeriods[resolveHistoryPeriodIndex(settings, step.id)]
    : undefined;
  const culture = chapter.id === 'culture'
    ? cultureTopics[resolveCultureTopicIndex(settings, step.id)]
    : undefined;
  const contextualMaterial = period ?? culture;
  const currentSources = sourceRecords([...step.sources, ...(contextualMaterial?.sourceIds ?? [])]);

  function go(targetChapter: Chapter, targetStep: Step) {
    navigate(targetChapter, targetStep);
    open(null);
  }

  function routeMarkdown(): string {
    return [
      '# 西藏主题探索计划', '',
      '> 这是带有观察目标的主题探索计划。道路、班次、开放、预约、天气及适用许可仍须按出行日期核验。站点顺序不代表已验证的道路或交通安排。', '',
      `计划日期：${saved.travelDate || '尚未确定'}`,
      `交通意向：${saved.transport || '尚未确定'}`, '',
      ...selectedStops.flatMap((stop, index) => {
        const region = regions.find((item) => item.id === stop.region || item.name === stop.region);
        const lesson=allSteps.find(item=>item.step.id===travelPlanLessons[stop.id]);
        const evidence=[...new Map([...(lesson?sourceRecords(lesson.step.sources):[]),...cityContinuityTravelEvidence(stop.id)].map(source=>[source.id,source])).values()];
        return [
        `## ${index + 1}. ${stop.name}`, '',
        `地区：${region?.name ?? stop.region} · 主题：${stop.theme}`, '',
        `想理解的问题：${stop.question}`, '', stop.description, '', `我的观察与待核实事项：${saved.stopNotes[stop.id]||'尚未记录。'}`, '',
        ...(cityTravelOrigin(saved.stopOrigins?.[stop.id])?[`[回到保存这站时的三地地图](${mapReturnUrl(cityTravelOrigin(saved.stopOrigins?.[stop.id])!)})`,'']:[]),
        lesson ? `知识入口：[${lesson.step.title}](${knowledgeUrl(lesson.chapter.id,lesson.step.id)})；地区观察目标：${region?.name??stop.region}，入口介绍相关原理或材料。`
          : `知识入口：${stop.region}地区介绍及相关专题`, '',
        ...evidence.flatMap(source=>[`- 材料：[${source.title}](${source.url})${source.note?`；${source.note}`:''}`]),'',
      ]; }),
      ...travelAccessRecordMarkdown(saved.accessVerifications),
      '## 出发前待核验', '',
      '- 逐段道路与交通方式、班次及可达性。',
      '- 景点开放、预约、费用及适用许可。',
      '- 当期天气、停留与住宿条件。',
      '- 旅行者自身情况及所需的专业健康信息。', '',
      '## 我的观察与问题', '', saved.note || '尚未记录。', '',
    ].join('\n');
  }

  function exportRecord() {
    const text = [
      '# 我的西藏探索', '',
      `已到达 ${visited.size} / ${allSteps.length} 个认识步骤。`,
      `已完成 ${completed.size} / ${allSteps.length} 个认识步骤。`, '',
      '## 继续认识', '',
      ...allSteps.filter((item) => item.step.id === saved.lastStep).map((item) =>
        `${item.chapter.title} → ${item.step.title}\n\n${item.step.question}`), '',
      '## 收藏的问题', '',
      ...(bookmarks.length ? bookmarks.flatMap(({ chapter: itemChapter, step: itemStep }) => [
        `### ${itemChapter.shortTitle} · ${itemStep.title}`, '', itemStep.question, '',
        itemStep.takeaway, '', `[返回这个问题](${knowledgeUrl(itemChapter.id, itemStep.id)})`, '',
        ...sourceRecords(itemStep.sources).map((source) => `- [${source.title}](${source.url})`), '',
      ]) : ['尚未收藏。', '']),
      '## 我的观察笔记', '', saved.note || '尚未记录。', '',
      ...(selectedStops.length ? ['---', '', routeMarkdown()] : []),
    ].join('\n');
    downloadMarkdown('我的西藏探索.md', text);
    notify('已生成探索记录下载文件。');
  }

  function addStop(id: string) {
    setSaved((previous) => previous.route.includes(id) ? previous : { ...previous, route: [...previous.route, id] });
    notify('已加入主题路线，可继续调整顺序。');
  }

  function moveStop(id: string, direction: -1 | 1) {
    setSaved((previous) => {
      const route = [...new Set(previous.route)].filter((routeId) => travelStops.some((item) => item.id === routeId));
      const index = route.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= route.length) return previous;
      [route[index], route[nextIndex]] = [route[nextIndex], route[index]];
      return { ...previous, route };
    });
  }

  const feedbackLine = feedback ? <aside className="drawer-notice"><strong>当前画面</strong><p>{feedback}</p></aside> : null;

  if (kind === 'contents') {
    return <div className="drawer-content">
      <p className="drawer-intro">沿一条主线认识西藏。你可以从地球开始，也可以选择一个问题；展开之后仍能回到原来的位置。</p>
      {learningChapterIds.map(id=>chapters.find(item=>item.id===id)!).map((item) => <section className="contents-chapter" key={item.id}>
        <p className="drawer-kicker">第 {String(learningChapterNumber(item.id)).padStart(2, '0')} 章 · {item.steps.length} 个步骤</p>
        <h3>{item.title}</h3><p>{item.intro}</p>
        <div className="contents-step-list">
          {item.steps.map((itemStep) => <button type="button"
            className={`contents-step${itemStep.id === step.id ? ' current' : ''}${completed.has(itemStep.id) ? ' done' : ''}`}
            aria-current={itemStep.id === step.id ? 'step' : undefined}
            onClick={() => go(item, itemStep)} key={itemStep.id}>
            <span>{itemStep.id}</span><strong>{itemStep.title}</strong>
            {completed.has(itemStep.id) ? <CheckCircle size={19} aria-label="已完成" /> : <ArrowRight size={18} aria-hidden="true" />}
          </button>)}
        </div>
        <p className="contents-bridge"><ArrowRight size={16} aria-hidden="true" />{item.bridge}</p>
      </section>)}
    </div>;
  }

  if (kind === 'detail') {
    return <div className="drawer-content">
      <div className="drawer-tabs" role="tablist" aria-label="介绍范围" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'step' : event.key === 'End' ? 'chapter' : detailTab === 'step' ? 'chapter' : 'step';
        setDetailTab(next);
        event.currentTarget.querySelector<HTMLButtonElement>(`#detail-${next}-tab`)?.focus();
      }}>
        <button type="button" id="detail-step-tab" role="tab" aria-selected={detailTab === 'step'} aria-controls="detail-reading"
          tabIndex={detailTab === 'step' ? 0 : -1} className={detailTab === 'step' ? 'active' : ''} onClick={() => setDetailTab('step')}>当前问题</button>
        <button type="button" id="detail-chapter-tab" role="tab" aria-selected={detailTab === 'chapter'} aria-controls="detail-reading"
          tabIndex={detailTab === 'chapter' ? 0 : -1} className={detailTab === 'chapter' ? 'active' : ''} onClick={() => setDetailTab('chapter')}>完整章节</button>
      </div>
      <article className="drawer-prose" id="detail-reading" role="tabpanel" aria-labelledby={`detail-${detailTab}-tab`}>
        {detailTab === 'step' ? <>
          <p className="drawer-kicker">{chapter.shortTitle} · {step.kind}</p>
          <h3>{step.question}</h3><p className="drawer-intro">{step.summary}</p>
          {step.explanation.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          {feedbackLine}
          <section className="drawer-section"><h4>在画面中观察</h4><p>{step.observe}</p><p>{step.action}</p></section>
          <aside className="drawer-notice"><strong>带走这个认识</strong><p>{step.takeaway}</p></aside>
        </> : <>
          <p className="drawer-kicker">第 {chapter.number} 章</p><h3>{chapter.title}</h3><p className="drawer-intro">{chapter.intro}</p>
          {chapter.details.map((section) => <section className="drawer-section" key={section.title}>
            <h4>{section.title}</h4>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>)}
          <p className="contents-bridge">{chapter.bridge}</p>
        </>}
        {contextualMaterial && <section className="drawer-section">
          <p className="drawer-kicker">当前选择 · {contextualMaterial.label}</p>
          <h4>{contextualMaterial.title}</h4><p>{contextualMaterial.summary}</p><p>{contextualMaterial.detail}</p>
          <SourceList items={sourceRecords(contextualMaterial.sourceIds)} />
        </section>}
      </article>
      <div className="drawer-actions"><button type="button" className="drawer-button" onClick={() => open('sources')}><Books size={18} aria-hidden="true" />查看依据</button>
        <button type="button" className="drawer-button primary" onClick={() => open(null)}>回到主场景<ArrowRight size={18} aria-hidden="true" /></button></div>
    </div>;
  }

  if (kind === 'sources') {
    return <div className="drawer-content">
      <p className="drawer-kicker">{step.title} · {step.kind}</p>
      <p className="drawer-intro">下面的材料支持当前介绍。每条材料都有适用的地点、时期与问题，打开后可进一步核对原文。</p>
      <SourceList items={currentSources} />
        {['G1','G2'].includes(step.id)&&<section className="drawer-section"><h3>地球基础与地区对照</h3><SourceList items={orientationSources.map((source,index)=>({...source,id:`orientation-${index}`}))}/></section>}
        {step.id==='C4'&&<section className="drawer-section"><h3>来流、地形与地方环境的资料</h3><SourceList items={plateauClimateSources}/></section>}
      <aside className="drawer-notice"><h3>怎样理解当前画面</h3>
        <p>场景中的地形、过程、建筑和联系用于解释知识关系。原理示意与程序绘制的对象不能当作实测地形、天气预报、精确历史复原或可通行道路。</p>
        <p>有来源的历史介绍与场景几何分别判断；图像、观测数值及访问条件需要各自的出处和日期。</p>
      </aside>
      <section className="drawer-section"><h3>地球纹理与太阳计算</h3>
        <p>地球使用 NASA Blue Marble 2004年6月合成影像；它表达历史地表外观，不表示实时天气或今日地表。太阳几何按近似公式计算，不输出当地气温。</p>
        <SourceList items={[
          { id: 'asset', title: 'NASA Earth Observatory / Reto Stöckli · Blue Marble影像', url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/', note: '原影像缩放后复用；球面纹理不等于全球高程。' },
          { id: 'solar', title: 'NOAA · 太阳位置近似计算', url: 'https://gml.noaa.gov/grad/solcalc/solareqns.PDF', note: '采用太阳中心和水平几何地平线，不计折射、地形遮挡或太阳视半径。' },
        ]} />
      </section>
    </div>;
  }

  if (kind === 'explore') {
    const cleanQuery = query.trim().toLocaleLowerCase();
    const selectedPlace = placeId ? getPlaceProfile(placeId) : undefined;
    const matches = regions.filter((region) => {
      const place = getPlaceProfile(region.id);
      const searchable = place ? `${place.lead} ${place.sections.flatMap(section => section.paragraphs).join(' ')} ${place.objects.map(object => `${object.name} ${object.question}`).join(' ')}` : '';
      return `${region.name} ${region.tag} ${region.description} ${region.question} ${searchable}`.toLocaleLowerCase().includes(cleanQuery);
    });
    function enterPlaceQuestion(object: PlaceObject) {
      const target = allSteps.find(item => item.step.id === object.stepId);
      if (!target) return;
      setSaved(previous => ({ ...previous, scenes: { ...previous.scenes, [target.step.id]: {
        ...settingsForStep(target.step), ...object.settings,
      } } }));
      go(target.chapter, target.step);
    }
    if (selectedPlace) return <div className="drawer-content">
      <button type="button" className="drawer-button" onClick={() => setPlaceId(null)}><ArrowLeft size={18} aria-hidden="true" />返回地区列表{query.trim() ? ` · ${query.trim()}` : ''}</button>
      <article className="drawer-prose">
        <p className="drawer-kicker"><MapPin size={16} aria-hidden="true" />先了解地方，再选择深入的问题</p>
        <h3>{selectedPlace.name}</h3><p className="drawer-intro">{selectedPlace.lead}</p>
        {selectedPlace.sections.map(section => <section className="drawer-section" key={section.title}>
          <h4>{section.title}</h4>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <p className="drawer-kicker">依据：{section.sourceIds.map((id, index) => {
            const source = selectedPlace.sources.find(item => item.id === id);
            return source ? <span key={id}>{index > 0 ? ' · ' : ''}<a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowSquareOut size={12} aria-hidden="true" /></a></span> : null;
          })}</p>
        </section>)}
      </article>
      <section className="drawer-section"><h3>沿地方进入认识主线</h3><p>下面进入对应原理或材料的认识步骤。三维模型用于解释关系，具体对象的介绍与真实资料保留在本页。</p>
        <div className="route-options">{selectedPlace.objects.map(object => <article className="region-card" key={object.name}>
          <p className="drawer-kicker">{object.stepId} · {allSteps.find(item => item.step.id === object.stepId)?.chapter.shortTitle}</p><h4>{object.name}</h4><p>{object.question}</p>
          <button type="button" className="drawer-button" onClick={() => enterPlaceQuestion(object)}>沿这个问题深入<ArrowRight size={18} aria-hidden="true" /></button>
        </article>)}</div>
      </section>
      <section className="drawer-section"><h3>把地方保留到探索计划</h3>
        <div className="route-options">{travelStops.filter(stop => stop.region === selectedPlace.id).map(stop => <article className="region-card" key={stop.id}>
          <h4>{stop.name}</h4><p>{stop.question}</p><button type="button" className="drawer-button" disabled={saved.route.includes(stop.id)} onClick={() => addStop(stop.id)}>{saved.route.includes(stop.id)?<><Check size={17}/>已加入</>:<><Plus size={17}/>加入主题路线</>}</button>
        </article>)}</div>
      </section>
      <details className="drawer-section"><summary>全部资料与适用范围</summary><SourceList items={selectedPlace.sources}/></details>
      <div className="drawer-actions"><button type="button" className="drawer-button" onClick={() => setPlaceId(null)}><ArrowLeft size={18}/>返回地区列表</button><button type="button" className="drawer-button primary" onClick={() => open(null)}>回到原来的主场景<ArrowRight size={18}/></button></div>
    </div>;
    return <div className="drawer-content">
      <p className="drawer-intro">先完整了解一个地方，再沿它的自然、历史与文化问题深入。地区列表支持搜索具体对象，例如“会盟碑”“鲁朗”“卡若”或“土林”。</p>
      <label className="drawer-search"><MagnifyingGlass size={20} aria-hidden="true" /><span className="sr-only">搜索地区或问题</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地区、河谷、历史或环境" type="search" /></label>
      <p className="drawer-kicker" role="status">找到 {matches.length} 个地域入口</p>
      <div className="region-grid">{matches.map((region) => <article className="region-card" key={region.id}>
        <p className="drawer-kicker"><MapPin size={16} aria-hidden="true" />{region.tag}</p><h3>{region.name}</h3>
        <p>{region.description}</p><p><strong>{region.question}</strong></p>
        <button type="button" className="drawer-button" onClick={() => setPlaceId(region.id)}>先了解{region.name}<ArrowRight size={18} aria-hidden="true" /></button>
      </article>)}</div>
      {!matches.length && <div className="drawer-empty"><Compass size={30} aria-hidden="true" /><p>没有匹配的地区。试试“拉萨”“河谷”或“文化”。</p>
        <button type="button" className="drawer-button" onClick={() => setQuery('')}>显示全部地区</button></div>}
    </div>;
  }

  if (kind === 'travel') {
    return <div className="drawer-content">
      <p className="drawer-intro">先选择想理解的问题，再把地点串起来。每一站保留观察目的，日期与交通意向帮助你继续完善计划。</p>
      <div className="drawer-form-row">
        <label className="drawer-field">计划出发日期<input type="date" value={saved.travelDate} onChange={(event) => setSaved((previous) => ({ ...previous, travelDate: event.target.value }))} /></label>
        <label className="drawer-field">交通意向<select value={saved.transport} onChange={(event) => setSaved((previous) => ({ ...previous, transport: event.target.value }))}>
          <option value="">尚未确定</option><option value="公共交通">公共交通</option><option value="包车或自驾">包车或自驾</option><option value="混合交通">混合交通</option>
        </select></label>
      </div>
      <section className="drawer-section"><h3>我的主题路线 · {selectedStops.length} 站</h3>
        {selectedStops.length ? <ol className="route-list">{selectedStops.map((stop, index) => <li className="route-stop" key={stop.id}>
          <span className="route-index">{index + 1}</span><div><p className="drawer-kicker">{regions.find((region) => region.id === stop.region)?.name ?? stop.region} · {stop.theme}</p><h4>{stop.name}</h4><p>{stop.question}</p><p>{stop.description}</p>{cityContinuityTravelEvidence(stop.id).length>0&&<details><summary>地方材料与适用年代</summary><SourceList items={cityContinuityTravelEvidence(stop.id)}/></details>}<label className="drawer-field">我的问题、观察与待核实事项<textarea rows={2} maxLength={1500} value={saved.stopNotes[stop.id]||''} onChange={event=>setSaved(previous=>({...previous,stopNotes:{...previous.stopNotes,[stop.id]:event.target.value}}))}/></label>
            <div className="route-controls">
              <button type="button" className="drawer-icon-button" aria-label={`将${stop.name}向前移动`} disabled={index === 0} onClick={() => moveStop(stop.id, -1)}><ArrowUp size={18} /></button>
              <button type="button" className="drawer-icon-button" aria-label={`将${stop.name}向后移动`} disabled={index === selectedStops.length - 1} onClick={() => moveStop(stop.id, 1)}><ArrowDown size={18} /></button>
              <button type="button" className="drawer-button danger" onClick={() => setSaved((previous) => ({ ...previous, route: previous.route.filter((id) => id !== stop.id) }))}><Trash size={17} aria-hidden="true" />移除</button>
              {cityTravelOrigin(saved.stopOrigins?.[stop.id])&&<a className="drawer-button" href={`#${cityTravelOrigin(saved.stopOrigins?.[stop.id])}`} onClick={()=>open(null)}><MapPin size={15} aria-hidden="true"/>回到三地地图</a>}
            </div>
          </div>
        </li>)}</ol> : <p className="drawer-empty">还没有选择站点。从下面挑选一个想了解的地方。</p>}
      </section>
      {accessCities.length>0&&<section className="drawer-section"><h3>道路接续与本人核验记录</h3><p className="fine-print">现状道路资料与本人记录分开；保留记录不会改动已选站点、顺序或原笔记。</p>{accessCities.map(id=><details key={id}><summary>{id==='nyingchi'?'米林—林芝—鲁朗':id==='lhasa'?'拉萨客站—跨河—历史城区':'昆莎—狮泉河—河岸街道'}</summary><TravelAccessSegments cityId={id} value={saved.accessVerifications} onChange={book=>setSaved(previous=>({...previous,accessVerifications:book}))}/></details>)}</section>}
      <section className="drawer-section"><h3>添加想去认识的地方</h3><div className="route-options">
        {travelStops.map((stop) => <article className="region-card" key={stop.id}><p className="drawer-kicker">{regions.find((region) => region.id === stop.region)?.name ?? stop.region} · {stop.theme}</p><h4>{stop.name}</h4><p>{stop.question}</p>
          <button type="button" className="drawer-button" disabled={saved.route.includes(stop.id)} onClick={() => addStop(stop.id)}>
            {saved.route.includes(stop.id) ? <><Check size={18} aria-hidden="true" />已加入</> : <><Plus size={18} aria-hidden="true" />加入主题路线</>}
          </button></article>)}
      </div></section>
      <aside className="drawer-notice"><strong>访问条件待核验</strong><p>这份主题计划尚未核验逐段道路、班次、开放、预约、天气及适用许可。当前不提供已确认的交通耗时、价格或预订。出发前应按日期补齐信息。</p></aside>
      <div className="drawer-actions"><button type="button" className="drawer-button" onClick={() => {
        const written = writeExploration(saved);
        notify(written ? '计划已保存到当前浏览器；访问条件仍待核验。' : '浏览器未能保存计划，请导出文件保留这次修改。');
      }}><CheckCircle size={18} aria-hidden="true" />保存计划</button>
        <button type="button" className="drawer-button primary" disabled={!selectedStops.length&&!Object.keys(saved.accessVerifications??{}).length} onClick={() => { downloadMarkdown('西藏主题探索计划.md', routeMarkdown()); notify('已生成主题计划下载文件。'); }}><DownloadSimple size={18} aria-hidden="true" />导出计划</button>
        <button type="button" className="drawer-button" onClick={()=>open(null)}><ArrowLeft size={17} aria-hidden="true"/>回到打开计划的位置</button></div>
    </div>;
  }

  return <div className="drawer-content">
    <p className="drawer-intro">{kind === 'complete' ? '认识可以告一段落，问题还可以继续。回顾经过的主题，保存观察，再选择下一处想了解的地方。' : '收藏关心的问题，留下自己的观察。记录保存在当前浏览器，也可以导出带走。'}</p>
    <div className="drawer-stat-grid">
      <div className="drawer-stat"><strong>{visited.size}<small> / {allSteps.length}</small></strong><span>到达的步骤</span></div>
      <div className="drawer-stat"><strong>{completed.size}</strong><span>完成的步骤</span></div>
      <div className="drawer-stat"><strong>{bookmarks.length}</strong><span>收藏的问题</span></div>
    </div>
    <progress className="drawer-progress" max={allSteps.length || 1} value={completed.size} aria-label="认识步骤完成进度" />
    <section className="drawer-section"><h3>收藏的问题</h3>
      {bookmarks.length ? <ul className="saved-list">{bookmarks.map((item) => <li className="saved-item" key={item.step.id}>
        <button type="button" className="drawer-button" onClick={() => go(item.chapter, item.step)}><BookmarkSimple size={18} weight="fill" aria-hidden="true" /><span><small>{item.chapter.shortTitle}</small><strong>{item.step.title}</strong></span><ArrowRight size={18} aria-hidden="true" /></button>
        <button type="button" className="drawer-icon-button" aria-label={`取消收藏${item.step.title}`} onClick={() => setSaved((previous) => ({ ...previous, bookmarks: previous.bookmarks.filter((id) => id !== item.step.id) }))}><Trash size={18} /></button>
      </li>)}</ul> : <p className="drawer-empty">遇到想继续理解的问题时，使用主场景的收藏按钮把它留在这里。</p>}
    </section>
    <section className="drawer-section"><label className="drawer-field"><span><Notebook size={19} aria-hidden="true" />我的观察与问题</span>
      <textarea value={saved.note} maxLength={10000} rows={7} placeholder="我注意到什么？它与前面的认识有什么联系？还想了解什么？" onChange={(event) => setSaved((previous) => ({ ...previous, note: event.target.value }))} />
      <small>{saved.note.length} / 10000 · 修改会随探索记录自动保存</small></label></section>
    <section className="drawer-section" aria-label="已经保存的地方观察路线"><h3>我的主题路线 · {selectedStops.length} 站</h3>{selectedStops.length?<><ol className="route-list">{selectedStops.map((stop,index)=><li className="route-stop" key={stop.id}><span className="route-index">{index+1}</span><div><h4>{stop.name}</h4><p>{stop.question}</p>{saved.stopNotes[stop.id]&&<p>{saved.stopNotes[stop.id]}</p>}{cityTravelOrigin(saved.stopOrigins?.[stop.id])&&<a className="drawer-button" href={`#${cityTravelOrigin(saved.stopOrigins?.[stop.id])}`} onClick={()=>open(null)}><MapPin size={15} aria-hidden="true"/>回到三地地图</a>}</div></li>)}</ol><button type="button" className="drawer-button" onClick={()=>open('travel')}>修改问题、顺序与候选站<ArrowRight size={15} aria-hidden="true"/></button></>:<p className="drawer-empty">还没有保存地方观察。在三地地图的旅行段选择一组地方，或打开旅行线路自行添加。</p>}</section>
    <div className="drawer-actions"><button type="button" className="drawer-button" onClick={() => open('explore')}><Compass size={18} aria-hidden="true" />继续探索地区</button>
      <button type="button" className="drawer-button" onClick={() => open('travel')}><MapPin size={18} aria-hidden="true" />整理旅行路线</button>
      <button type="button" className="drawer-button primary" onClick={exportRecord}><DownloadSimple size={18} aria-hidden="true" />导出探索记录</button></div>
  </div>;
}
