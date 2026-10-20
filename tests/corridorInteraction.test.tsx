import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
// @ts-expect-error Node belongs to Vitest.
import {readFileSync} from 'node:fs';
const harness=vi.hoisted(()=>{
 let slots:any[]=[],cursor=0,effects:any[]=[],dirty=false;
 const same=(a:any[],b:any[])=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 return {
  reset(){slots.forEach(s=>s?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
  useState(initial:any){const i=cursor++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,(next:any)=>{const v=typeof next==='function'?next(slots[i].value):next;if(!Object.is(v,slots[i].value)){slots[i].value=v;dirty=true;}}];},
  useRef(value:any){return slots[cursor++]??={current:value};},
  useMemo(fn:any,deps:any[]){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},
  useEffect(fn:any,deps:any[]){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){const old=slots[i];slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
  render(fn:any){let tree:any,n=0;do{dirty=false;cursor=0;effects=[];tree=fn();effects.forEach(f=>f());if(++n>30)throw Error('Corridor did not settle');}while(dirty);return tree;},
 };
});
const media=vi.hoisted(()=>({current:{} as any}));
const fields=vi.hoisted(()=>({ready:true,error:'',retry:()=>{}}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),...harness,useCallback:(fn:any,deps:any[])=>harness.useMemo(()=>fn,deps)}));
vi.mock('../src/hooks/useOverviewDirector',()=>({useOverviewDirector:()=>media.current}));
vi.mock('../src/hooks/usePilotFieldImages',()=>({usePilotFieldImages:()=>fields}));
vi.mock('../src/components/CorridorStage',()=>({default:()=>null}));
import CorridorExperience from '../src/components/CorridorExperience';
import {readCorridorNote} from '../src/lib/corridorStore';
import {corridorBeats,corridorPath} from '../src/data/corridorJourney';
import {corridorPlanMarkdown} from '../src/data/corridorObservation';
import {readTravelSession} from '../src/lib/travelObservationStore';
let values:Map<string,string>;
const find=(node:any,match:(n:any)=>boolean):any=>{if(!node||typeof node!=='object')return;if(match(node))return node;for(const c of [node.props?.children].flat(Infinity)){const found=find(c,match);if(found)return found;}};
const render=()=>harness.render(CorridorExperience),button=(name:string)=>find(render(),n=>n.type==='button'&&n.props.children===name).props;
const stage=()=>find(render(),n=>n.props?.className==='corridor-stage').props;
beforeEach(()=>{
 harness.reset();values=new Map([['tibet-explorer.overview-position.v1','freeze-six'],['tibet-explorer.route-pilot-position.v1','freeze-pilot']]);
 vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});vi.stubGlobal('location',{hash:'#'+corridorPath});
 vi.stubGlobal('Image',class{onload:()=>void=()=>{};set src(_:string){queueMicrotask(()=>this.onload());}decode(){return Promise.resolve();}});
 vi.stubGlobal('fetch',async()=>({ok:true,json:async()=>JSON.parse(readFileSync('public/assets/routes/g318-corridor/edit.json','utf8'))}));
 media.current={beatIndex:3,raw:.32,voice:true,playing:false,wantsPlayback:false,ready:true,timing:{textProgress:(corridorBeats[3].text.indexOf('看道路')+1)/corridorBeats[3].text.length},pause:vi.fn(()=>{media.current.wantsPlayback=false;}),select:vi.fn((i:number)=>{media.current.beatIndex=i;media.current.raw=0;media.current.timing={textProgress:0};media.current.wantsPlayback=false;}),seek:vi.fn((raw:number)=>media.current.raw=raw),setVoice:vi.fn(),playPause:vi.fn(()=>{media.current.wantsPlayback=!media.current.wantsPlayback;}),onSceneReady:vi.fn(),retryScene:vi.fn()};
});
afterEach(()=>{harness.reset();vi.useRealTimers();vi.unstubAllGlobals();});
describe('actual whole-corridor observation callbacks',()=>{
 it('keeps the R04 heading while native word timing rehydrates on resume',async()=>{
  media.current.raw=.555;media.current.timing={textProgress:.72};
  await vi.waitFor(()=>expect(find(render(),n=>n.props?.edit)).toBeDefined());
  expect(stage()['data-shot']).toBe('R04');
  media.current.timing=undefined;media.current.wantsPlayback=true;
  expect(stage()['data-shot']).toBe('R04');
  media.current.raw=.3;expect(stage()['data-shot']).toBe('R03');
 });
 it.each([false,true])('keeps the R04 word boundary after plan return (refresh=%s)',refresh=>{
  media.current.raw=.555;media.current.timing={textProgress:.72};
  expect(stage()['data-shot']).toBe('R04');
  const before=JSON.parse(stage()['data-view']);
  button('带当前对象进入观察计划').onClick();button('保存计划').onClick();
  if(refresh)harness.reset();
  button('保存并返回原画面原句').onClick();
  expect(media.current.select).not.toHaveBeenCalled();expect(media.current.seek).not.toHaveBeenCalled();
  expect(stage()['data-shot']).toBe('R04');expect(stage()['data-raw']).toBe(.555);
  expect(JSON.parse(stage()['data-view'])).toEqual(before);
 });
 it('pauses before a traveler visit, retains its origin across refresh, then returns without replay',()=>{
  media.current.beatIndex=2;media.current.raw=.37123;media.current.timing={textProgress:.4};
  const before=JSON.parse(stage()['data-view']);button('色季拉 · 沿路观察').onClick();
  expect(media.current.pause).toHaveBeenCalled();expect(readTravelSession()?.returnTo).toEqual({beatIndex:2,raw:.37123,view:before});
  harness.reset();const visit=find(render(),n=>n.props?.session?.place==='sejila');expect(visit).toBeDefined();
  visit.props.onReturn(false);
  expect(media.current.select).not.toHaveBeenCalled();expect(media.current.seek).not.toHaveBeenCalled();
  expect(stage()['data-raw']).toBe(.37123);expect(JSON.parse(stage()['data-view'])).toEqual(before);
  expect(readTravelSession()).toBeUndefined();expect(media.current.playPause).not.toHaveBeenCalled();
  expect(values.get('tibet-explorer.overview-position.v1')).toBe('freeze-six');
 });
 it('resumes the exact old sentence only after the old scene is ready again',async()=>{
  media.current.raw=.274;const before=JSON.parse(stage()['data-view']);button('鲁朗 · 地方体验').onClick();
  find(render(),n=>n.props?.session?.place==='lulang').props.onReturn(true);
  expect(media.current.raw).toBe(.274);expect(media.current.playPause).not.toHaveBeenCalled();
  await vi.waitFor(()=>expect(find(render(),n=>n.props?.edit)).toBeDefined());
  find(render(),n=>n.props?.edit).props.onReady(before.kind);render();
  expect(media.current.playPause).toHaveBeenCalledTimes(1);expect(readTravelSession()).toBeUndefined();
 });
 it('captures the actual river, saves, refreshes and restores the same raw/view; later notebook opening preserves evidence',async()=>{
  button('河流').onClick();const before=JSON.parse(stage()['data-view']);expect(before.value.photoFocus).toBe(1);
  button('带当前对象进入观察计划').onClick();expect(location.hash).toContain('plan=1');find(render(),n=>n.type==='textarea').props.onChange({target:{value:'保存河流、道路与房屋的关系。'}});button('保存计划').onClick();
  expect(readCorridorNote().observationView).toEqual(before);harness.reset();render();button('保存并返回原画面原句').onClick();
  expect(stage()['data-raw']).toBe(.32);expect(JSON.parse(stage()['data-view'])).toEqual(before);expect(readCorridorNote().returnPending).toBe(false);
  media.current.beatIndex=8;media.current.raw=.64;media.current.timing={textProgress:.5};harness.reset();render();expect(stage()['data-raw']).toBe(.64);
  const nav=find(render(),n=>n.type==='nav');find(nav,n=>n.type==='button'&&n.props['aria-label']?.startsWith('R08 ·')).props.onClick();button('我的观察计划').onClick();harness.reset();render();
  const note=readCorridorNote();expect(note.observationView).toEqual(before);expect(note.returnTo?.beatIndex).toBe(8);expect(note.returnTo?.view.kind).toBe('overview');
  const md=corridorPlanMarkdown(note);expect(md).toContain('2024-09-22');expect(md).toContain('河流');expect(md).toContain('CC BY-SA 4.0');expect(md).toContain('保存河流、道路与房屋的关系。');
  expect(values.get('tibet-explorer.overview-position.v1')).toBe('freeze-six');expect(values.get('tibet-explorer.route-pilot-position.v1')).toBe('freeze-pilot');
  await Promise.resolve();
 });
 it('an observation made after the ending returns to the ending without replay',()=>{
  media.current.beatIndex=8;media.current.raw=1;media.current.timing={textProgress:1};button('鲁朗 · 河流与聚落').onClick();
  button('返回结束画面').onClick();expect(media.current.playPause).not.toHaveBeenCalled();expect(stage()['data-raw']).toBe(1);expect(stage()['data-manual']).toBe(false);
 });
 it('schedules the editorial R06 cut from media time before a UI tick enters the omitted invitation',async()=>{
  await vi.waitFor(()=>expect(find(render(),n=>n.props?.edit?.tongmaiEnd)).toBeDefined());
  vi.useFakeTimers();media.current.beatIndex=5;media.current.raw=.91;media.current.wantsPlayback=true;media.current.playing=true;media.current.audio={currentTime:48.2};render();
  vi.advanceTimersByTime(132);expect(media.current.beatIndex).toBe(5);vi.advanceTimersByTime(2);expect(media.current.beatIndex).toBe(6);expect(media.current.wantsPlayback).toBe(true);
 });
});
