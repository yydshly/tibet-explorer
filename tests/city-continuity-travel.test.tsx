import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import CityContinuityTravelActions,{cityTravelQuestionInPlan} from '../src/components/CityContinuityTravelActions';
import DrawerContent from '../src/components/DrawerContent';
import JourneyPlan from '../src/components/JourneyPlan';
import {chapters,travelStops} from '../src/data/curriculum';
import {cityContinuityTravelStops} from '../src/data/cityContinuity';
import {cityAccessChanges,cityAccessSources} from '../src/data/cityAccessChange';
import {travelPlanLessons} from '../src/data/travelPlanLessons';
import {appendCityContinuityTravel,appendCityContinuityTravelStop,appendCityContinuityTravelQuestion,cityContinuityTravelQuestions,cityContinuityTravelCheck,cityContinuityTravelContext,cityTravelObservationNote,cityTravelObservationSaved,cityContinuityTravelEvidence,cityContinuityTravelPlan} from '../src/lib/cityContinuityTravel';
import {cityTravelOrigin,cityTravelOriginFor} from '../src/lib/cityTravelOrigin';
import {emptyExploration,parseExploration,settingsForStep} from '../src/lib/store';

describe('同图三地观察进入原有可编辑计划',()=>{
 it('每套候选只属于选中的地方，不默认把三地拼成行程',()=>{
  for(const cityId of ['nyingchi','lhasa','ngari'] as const){
   const plan=cityContinuityTravelPlan(cityId);
   expect(plan.stops.length).toBeGreaterThanOrEqual(2);
   expect(new Set(plan.stops.map(stop=>stop.region))).toEqual(new Set([cityId]));
   expect(plan.stops.map(stop=>stop.id)).toEqual([...plan.stopIds]);
   for(const stop of plan.stops)expect(chapters.some(chapter=>chapter.steps.some(step=>step.id===travelPlanLessons[stop.id]))).toBe(true);
  }
  expect(cityContinuityTravelPlan('ngari').scope).toContain('不同地方');
  expect(cityContinuityTravelPlan('ngari').scope).toContain('跨县');
  expect(cityContinuityTravelPlan('nyingchi').scope).toContain('色季拉山');
 });

 it('追加候选保留原顺序、已编辑和有意清空的问题及日期交通，不假完成学习或旅行',()=>{
  const before={...emptyExploration(),route:['tholing','lhasa-buildings'],stopNotes:{tholing:'我的原问题','lhasa-buildings':''},travelDate:'2027-04-01',transport:'混合交通'};
  const after=appendCityContinuityTravel(before,'lhasa');
  expect(after.route).toEqual(['tholing','lhasa-buildings','lhasa-river','lhasa-old-town']);
  expect(after.stopNotes.tholing).toBe('我的原问题');
  expect(after.stopNotes['lhasa-buildings']).toBe('');
  expect(after.stopNotes['lhasa-river']).toBe(cityContinuityTravelStops.find(stop=>stop.id==='lhasa-river')!.observationNote);
  expect(after.travelDate).toBe(before.travelDate);expect(after.transport).toBe(before.transport);
  expect(after.completed).toEqual([]);expect(after.visited).toEqual([]);
  expect(before.route).toEqual(['tholing','lhasa-buildings']);
  expect(appendCityContinuityTravel(after,'lhasa')).toBe(after);
 });

 it('新站在现有解析、笔记和地图入口中实际持久化，不被白名单丢弃',()=>{
  let saved=emptyExploration();
  for(const cityId of ['nyingchi','lhasa','ngari'] as const)saved=appendCityContinuityTravel(saved,cityId,cityTravelOriginFor(cityId));
  expect(parseExploration(JSON.stringify(saved))).toEqual(saved);
  for(const stop of cityContinuityTravelStops){
   expect(saved.route).toContain(stop.id);expect(saved.stopNotes[stop.id]).toBe(stop.observationNote);
   expect(saved.stopOrigins?.[stop.id]).toBe(cityTravelOriginFor(stop.cityId));
   expect(travelStops.filter(item=>item.id===stop.id)).toHaveLength(1);
   const sources=cityContinuityTravelEvidence(stop.id);
   expect(sources.length).toBeGreaterThanOrEqual(stop.sourceIds.length);
   expect(new Set(sources.map(source=>source.url)).size).toBe(sources.length);
   for(const sourceId of cityAccessChanges[stop.cityId].sourceIds)expect(sources).toContainEqual(cityAccessSources.find(source=>source.id===sourceId));
  }
 });

 it('返回入口只接受已知本地同图城市hash，忽略外部、脚本、额外参数和未知站',()=>{
  const origin=cityTravelOriginFor('ngari');
  expect(cityTravelOrigin('#'+origin)).toBe(origin);
  for(const value of ['javascript:alert(1)','https://example.com/'+origin,origin+'&next=https://example.com',origin.replace('city=ngari','city=unknown'),origin.replace('compare=1','compare=0'),origin.replace('view=cities','view=topics'),null,12])expect(cityTravelOrigin(value)).toBeUndefined();
  const restored=parseExploration(JSON.stringify({version:1,stopOrigins:{'shiquanhe-life':'#'+origin,'not-a-stop':origin,tholing:'javascript:alert(1)'}}));
  expect(restored.stopOrigins).toEqual({'shiquanhe-life':origin});
 });

 it('已有站点的原入口不会被新的观察组覆盖',()=>{
  const saved=appendCityContinuityTravel(emptyExploration(),'lhasa',cityTravelOriginFor('ngari'));
  expect(appendCityContinuityTravel(saved,'lhasa',cityTravelOriginFor('lhasa')).stopOrigins).toEqual(saved.stopOrigins);
 });

 it('可只选一个真实地方，并把某一环问题显式追加为候选笔记，不替换用户工作',()=>{
  const before={...emptyExploration(),route:['lhasa-buildings'],stopNotes:{'lhasa-buildings':'我已写下的建筑问题',tholing:''}};
  const onlyStop=appendCityContinuityTravelStop(before,'ngari','tholing');
  expect(onlyStop.route).toEqual(['lhasa-buildings','tholing']);
  expect(onlyStop.stopNotes.tholing).toBe('');
  expect(onlyStop.route).not.toContain('shiquanhe-life');
  const question=cityContinuityTravelQuestions('tholing').find(item=>item.id==='access')!;
  expect(question.question).toContain('2006');expect(question.question).toContain('2010');
  const after=appendCityContinuityTravelQuestion(onlyStop,'ngari','tholing','access');
  expect(after.stopNotes.tholing).toBe(cityTravelObservationNote(question));
  expect(after.stopNotes['lhasa-buildings']).toBe(before.stopNotes['lhasa-buildings']);
  expect(after.route).toEqual(onlyStop.route);
  expect(after.completed).toEqual([]);expect(after.visited).toEqual([]);
  expect(parseExploration(JSON.stringify(after))).toEqual(after);
  expect(appendCityContinuityTravelQuestion(after,'ngari','tholing','access')).toBe(after);
 });

 it('逐站问题保留编辑、顺序和返回位置；重复选择不重复写入，超长笔记不被截断',()=>{
  const before={...emptyExploration(),route:['lhasa-buildings','nyingchi-valley'],stopNotes:{'nyingchi-valley':'我自己的原问题\n'},stopOrigins:{'nyingchi-valley':cityTravelOriginFor('lhasa')}};
  const question=cityContinuityTravelQuestions('nyingchi-valley').find(item=>item.id==='transfer')!;
  const after=appendCityContinuityTravelQuestion(before,'nyingchi','nyingchi-valley','transfer',cityTravelOriginFor('nyingchi'));
  expect(after.stopNotes['nyingchi-valley']).toBe(before.stopNotes['nyingchi-valley']+'\n'+cityTravelObservationNote(question));
  expect(after.route).toEqual(before.route);expect(after.stopOrigins).toEqual(before.stopOrigins);
  expect(cityTravelObservationSaved(after.stopNotes['nyingchi-valley'],question)).toBe(true);
  expect(appendCityContinuityTravelQuestion(after,'nyingchi','nyingchi-valley','transfer')).toBe(after);
  const full={...before,stopNotes:{'nyingchi-valley':'我的笔记'.repeat(374)}};
  expect(appendCityContinuityTravelQuestion(full,'nyingchi','nyingchi-valley','transfer')).toBe(full);
  expect(appendCityContinuityTravelQuestion(before,'ngari','nyingchi-valley','transfer')).toBe(before);
  expect(appendCityContinuityTravelStop(before,'ngari','unknown')).toBe(before);
 });

 it('移除站点而保留笔记后，同一问题仍可恢复该站，不重复文字或改变原笔记',()=>{
  const saved=appendCityContinuityTravelQuestion(emptyExploration(),'nyingchi','nyingchi-valley','transfer');
  const question=cityContinuityTravelQuestions('nyingchi-valley').find(item=>item.id==='transfer')!;
  expect(cityTravelQuestionInPlan(saved,'nyingchi-valley',question)).toBe(true);
  const removed={...saved,route:saved.route.filter(id=>id!=='nyingchi-valley')};
  expect(removed.stopNotes).toBe(saved.stopNotes);
  expect(cityTravelObservationSaved(removed.stopNotes['nyingchi-valley'],question)).toBe(true);
  // The same predicate drives the action label and disabled state. Retained
  // draft text must not disable the explicit re-add action for a removed stop.
  expect(cityTravelQuestionInPlan(removed,'nyingchi-valley',question)).toBe(false);
  const recovered=appendCityContinuityTravelQuestion(removed,'nyingchi','nyingchi-valley','transfer');
  expect(recovered.route).toEqual(['nyingchi-valley']);
  expect(recovered.stopNotes).toEqual(saved.stopNotes);
  expect(recovered.stopOrigins).toEqual(saved.stopOrigins);
  expect(recovered.route).not.toContain('nyingchi-lulang');
  expect(cityTravelQuestionInPlan(recovered,'nyingchi-valley',question)).toBe(true);
  expect(recovered.completed).toEqual([]);expect(recovered.visited).toEqual([]);
  expect(appendCityContinuityTravelQuestion(recovered,'nyingchi','nyingchi-valley','transfer')).toBe(recovered);
 });

 it('七站都有四环追问、对应共享交通证据与待核验项，整组添加不会默认保存所选问题',()=>{
  for(const cityId of ['nyingchi','lhasa','ngari'] as const){
   const plan=cityContinuityTravelPlan(cityId);
   const saved=appendCityContinuityTravel(emptyExploration(),cityId);
   for(const stop of plan.stops){
    const questions=cityContinuityTravelQuestions(stop.id);
    expect(questions.map(question=>question.id)).toEqual(['before','access','transfer','life']);
    for(const question of questions){expect(cityAccessChanges[cityId][question.id].text.length).toBeGreaterThan(20);expect(saved.stopNotes[stop.id]).not.toContain(cityTravelObservationNote(question));}
    expect(cityContinuityTravelCheck(stop.id).length).toBeGreaterThan(20);
    const sourceIds=cityContinuityTravelEvidence(stop.id).map(source=>source.id);
    expect(sourceIds).toEqual(expect.arrayContaining(cityAccessChanges[cityId].sourceIds));
   }
  }
 });

 it('未保存不会显示成功，保存后显示同组全部已加入并禁用重复添加',()=>{
  const props={cityId:'nyingchi' as const,saved:emptyExploration(),onSave:vi.fn(),onTravel:vi.fn(),onPause:vi.fn()};
  const html=renderToStaticMarkup(createElement(CityContinuityTravelActions,props));
  expect(html).toContain('本组已加入 0 / 2 站');expect(html).toContain('加入这组地方观察');
  expect(html).not.toContain('已在我的计划中');
  expect(html).toContain('只加入此站，稍后补问题');expect(html).toContain('到访前待核验');
  expect(html).toContain('地形与原有通行');expect(html).toContain('到站或落地以后');
  expect(html).not.toContain('checked=""');expect(html).not.toContain('这条问题已在本站笔记中');
  const saved=appendCityContinuityTravel(props.saved,'nyingchi');
  const filled=renderToStaticMarkup(createElement(CityContinuityTravelActions,{...props,saved}));
  expect(filled).toContain('本组已加入 2 / 2 站');expect(filled).toContain('disabled=""');
  expect(filled).toContain('这组观察已加入');expect(filled).toContain('查看并调整已选路线');
  expect(filled).toContain('核对地方资料');
  const oldPlan={...saved,stopOrigins:{}};
  const oldMarkup=renderToStaticMarkup(createElement(CityContinuityTravelActions,{...props,saved:oldPlan}));
  expect(oldMarkup).toContain('保留这组地图入口');expect(oldMarkup).not.toContain('disabled=""');
  expect(appendCityContinuityTravel(oldPlan,'nyingchi').route).toEqual(saved.route);
  for(const action of [props.onSave,props.onTravel,props.onPause])expect(action).not.toHaveBeenCalled();
  const withReview=renderToStaticMarkup(createElement(CityContinuityTravelActions,{...props,onReviewAccess:vi.fn()}));
  expect(withReview).toContain('回看这组交通变化');
 });

 it('从回看恢复受控选择时，第二站问题仍展开可见且未自动保存；地方材料按该站用途显示',()=>{
  const onSave=vi.fn(),onChoicesChange=vi.fn(),choices={'lhasa-buildings':'life' as const};
  const html=renderToStaticMarkup(createElement(CityContinuityTravelActions,{cityId:'lhasa',saved:emptyExploration(),choices,onChoicesChange,onSave,onTravel:vi.fn(),onReviewAccess:vi.fn()}));
  expect(html).toContain('name="city-travel-question-lhasa-buildings" checked="" value="life"');
  expect(html.match(/<details class="city-continuity-observation" open="">/g)).toHaveLength(2);
  const material=cityContinuityTravelContext('lhasa-buildings','life');
  expect(html).toContain('前面对应的地方材料 · '+material.title);expect(html).toContain(material.text);
  expect(html).not.toContain(cityAccessChanges.lhasa.life.text);
  expect(html).toContain('加入此站并保存所选问题');expect(html).not.toContain('这条问题已在本站笔记中');
  expect(html).toContain('本组已加入 0 / 3 站');
  expect(onSave).not.toHaveBeenCalled();expect(onChoicesChange).not.toHaveBeenCalled();
 });

 it('历史用途问题提供白宫与红宫的实际回看入口，渲染或选择本身不保存计划',()=>{
  const onSave=vi.fn(),onReviewProcess=vi.fn();
  const html=renderToStaticMarkup(createElement(CityContinuityTravelActions,{cityId:'lhasa',saved:emptyExploration(),choices:{'lhasa-buildings':'life'},onSave,onTravel:vi.fn(),onReviewProcess}));
  expect(html).toContain('回看白宫礼仪与居住');expect(html).toContain('回看红宫纪念与宗教用途');
  expect(html).toContain('data-review-key="lhasa-buildings-life-history-1"');
  expect(html).toContain('data-review-key="lhasa-buildings-life-history-2"');
  expect(html).toContain('本组已加入 0 / 3 站');expect(onSave).not.toHaveBeenCalled();expect(onReviewProcess).not.toHaveBeenCalled();
 });

 it('旅行编辑与我的探索都显示实际保存站点、问题和地图返回，不显示未选城市',()=>{
  const saved=appendCityContinuityTravel(emptyExploration(),'ngari');
  saved.stopNotes['shiquanhe-life']='先观察水与管护，再对读县域资料';
  const chapter=chapters[0],step=chapter.steps[0];
  for(const kind of ['travel','saved'] as const){
   const html=renderToStaticMarkup(createElement(DrawerContent,{kind,chapter,step,settings:settingsForStep(step),saved,setSaved:vi.fn(),navigate:vi.fn(),open:vi.fn(),notify:vi.fn(),feedback:''}));
   expect(html).toContain('我的主题路线 · 2 站');expect(html).toContain('狮泉河的道路、河岸与公共生活');
   expect(html).toContain('先观察水与管护，再对读县域资料');expect(html).toContain('回到三地地图');
   expect(html).toContain('href="#'+cityTravelOriginFor('ngari').replaceAll('&','&amp;')+'"');
   if(kind==='saved'){expect(html).not.toContain('鲁朗越岭与地方服务');expect(html).toContain('修改问题、顺序与候选站');}
   else {expect(html).toContain('向前移动');expect(html).toContain('向后移动');expect(html).toContain('移除');expect(html).toContain('回到打开计划的位置');expect(html).toContain('地方材料与适用年代');}
  }
 });

 it('旧旅行正文也能从已保存站回地图，保留原有逐站修改与排序',()=>{
  const saved=appendCityContinuityTravel(emptyExploration(),'lhasa');
  const html=renderToStaticMarkup(createElement(JourneyPlan,{stepId:'T2',saved,setSaved:vi.fn(),onRead:vi.fn(),onPlanner:vi.fn(),onNotice:vi.fn()}));
  expect(html).toContain('我的候选顺序 · 3站');expect(html).toContain('回到三地地图');
  expect(html).toContain('将拉萨河谷与城市用水向后移动');expect(html).toContain('移除拉萨河谷与城市用水');
 });
});
