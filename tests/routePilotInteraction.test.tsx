import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const harness=vi.hoisted(()=>{
 let slots:any[]=[],cursor=0,effects:any[]=[],dirty=false;
 const same=(a:any[],b:any[])=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 return {
  reset(){slots=[];cursor=0;effects=[];dirty=false;},
  useState(initial:any){const i=cursor++;slots[i]??={value:typeof initial==='function'?initial():initial};return[slots[i].value,(next:any)=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
  useRef(value:any){return slots[cursor++]??={current:value};},
  useMemo(fn:any,deps:any[]){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},
  useCallback:(fn:any)=>fn,
  useEffect(fn:any,deps:any[]){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){slots[i]={deps};effects.push(fn);}},
  render(fn:any){let tree:any,n=0;do{dirty=false;cursor=0;effects=[];tree=fn();effects.forEach(fn=>fn());if(++n>20)throw Error('route did not settle');}while(dirty);return tree;}
 };
});
const media=vi.hoisted(()=>({current:{} as any}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),...harness}));
vi.mock('../src/hooks/useOverviewDirector',()=>({useOverviewDirector:()=>media.current}));
vi.mock('../src/scene/PilotRouteTerrain',()=>({default:()=>null}));
import RouteExperience from '../src/components/RouteExperience';
import {PILOT_NOTE_KEY,PILOT_POSITION_KEY,readPilotNote} from '../src/lib/routePilotStore';
import {routePilotPath,routePilotCues} from '../src/data/routePilot';
let saved:Map<string,string>;
const find=(node:any,test:(n:any)=>boolean):any=>{if(!node||typeof node!=='object')return;if(test(node))return node;for(const c of [node.props?.children].flat(Infinity)){const r=find(c,test);if(r)return r;}};
const render=()=>harness.render(()=>{const shell=RouteExperience();return (shell.type as any)(shell.props);});
const button=(label:string)=>find(render(),n=>n.type==='button'&&n.props.children===label).props;
const scene=()=>find(render(),n=>typeof n.props?.onReading==='function').props;
beforeEach(()=>{
 harness.reset();saved=new Map([['tibet-explorer.overview-position.v1','frozen-overview'],['tibet-explorer.exploration.v1','frozen-plan']]);
 vi.stubGlobal('localStorage',{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v)});
 vi.stubGlobal('location',{hash:'#'+routePilotPath});
 media.current={beatIndex:1,raw:.43,voice:true,ready:true,playing:false,wantsPlayback:false,timing:{textProgress:.3},
  pause:vi.fn(()=>{media.current.wantsPlayback=false;media.current.playing=false;}),select:vi.fn((i:number)=>{media.current.beatIndex=i;media.current.raw=0;media.current.timing={textProgress:0};media.current.wantsPlayback=false;}),
  seek:vi.fn((raw:number)=>{media.current.raw=raw;}),setVoice:vi.fn((v:boolean)=>{media.current.voice=v;}),playPause:vi.fn(()=>{media.current.wantsPlayback=!media.current.wantsPlayback;}),retryScene:vi.fn(),onSceneReady:vi.fn(),onSceneError:vi.fn()};
});
afterEach(()=>vi.unstubAllGlobals());
describe('actual route callbacks and independent persistence',()=>{
 it('links profile selection to the 3D position while keeping the original recording fraction',()=>{
  scene().onContext({profile:[{distance:0,elevation:2990,coordinate:[94.36,29.65]},{distance:72000,elevation:3385,coordinate:[94.72,29.73]}],total:72000,highestIndex:1,connectionStartIndex:1,connectionLength:1051});
  const profile=find(render(),n=>typeof n.props?.onSelect==='function'&&n.props.context);
  profile.props.onSelect(.67);expect(scene().view).toMatchObject({mode:'line',progress:.67});expect(media.current.raw).toBe(.43);expect(media.current.seek).not.toHaveBeenCalled();
  button('恢复原条件并继续').onClick();expect(scene().view.progress).not.toBe(.67);expect(media.current.raw).toBe(.43);
 });
 it('restores a partial local trace after note refresh without replaying or advancing media',()=>{
  media.current.beatIndex=2;
  find(render(),n=>n.props?.['aria-label']==='地方接续观察进度').props.onChange({target:{value:'.35'}});
  expect(scene().view).toMatchObject({connections:true,connectionProgress:.35});expect(media.current.raw).toBe(.43);
  button('保存观察问题').onClick();harness.reset();button('保存并返回原线').onClick();
  expect(scene().view).toMatchObject({mode:'place',connections:true,connectionProgress:.35});expect(media.current.raw).toBe(.43);
 });
 it('compares route views and local access, returns the exact line/sentence, and skips the completed local passage once',()=>{
  find(render(),n=>n.props?.['aria-label']==='G318沿线位置').props.onChange({target:{value:'.61'}});
  const original={...scene().view};expect(original).toMatchObject({mode:'line',progress:.61});expect(media.current.raw).toBe(.43);
  button('进入鲁朗 · 保留原路段').onClick();expect(scene().view.mode).toBe('place');
  button('展开地方接续').onClick();expect(scene().view.connections).toBe(true);
  button('只看过境道路').onClick();expect(scene().view.connections).toBe(false);
  button('返回进入前的原线原句').onClick();expect(media.current.beatIndex).toBe(1);expect(media.current.raw).toBe(.43);expect(scene().view).toEqual(original);
  expect(readPilotNote().skipPlaceOnce).toBe(true);
  button('恢复原条件并继续').onClick();expect(media.current.wantsPlayback).toBe(true);
  // Director naturally advances after the restored approach finishes.
  media.current.beatIndex=2;render();expect(media.current.beatIndex).toBe(3);expect(media.current.wantsPlayback).toBe(true);expect(readPilotNote().skipPlaceOnce).toBe(false);
 });
 it('persists note, original sentence and 6500m height across reload, then returns without touching old plans',()=>{
  find(render(),n=>n.props?.['aria-label']==='沿线观察高度').props.onChange({target:{value:'6500'}});
  const original={...scene().view};button('保存观察问题').onClick();expect(location.hash).toContain('?plan=1');
  find(render(),n=>n.type==='textarea').props.onChange({target:{value:'为什么绕行，服务道路怎样接到生活空间？'}});
  harness.reset();expect(find(render(),n=>n.type==='textarea').props.value).toContain('服务道路');
  button('保存并返回原线').onClick();expect(location.hash).toBe(routePilotPath);expect(media.current.raw).toBe(.43);expect(scene().view).toEqual(original);
  expect(readPilotNote().returnTo?.view.height).toBe(6500);
  find(render(),n=>n.type==='button'&&n.props.children?.[0]===1).props.onClick();expect(readPilotNote().returnTo).toBeUndefined();expect(scene().view.mode).toBe('whole');
  expect(saved.get('tibet-explorer.overview-position.v1')).toBe('frozen-overview');expect(saved.get('tibet-explorer.exploration.v1')).toBe('frozen-plan');expect(PILOT_POSITION_KEY).not.toContain('overview');
 });
 it('does not leave the current narration if saving the return snapshot fails',()=>{
  render();vi.stubGlobal('localStorage',{getItem:(k:string)=>saved.get(k)??null,setItem:()=>{throw Error('quota');}});
  button('保存观察问题').onClick();expect(location.hash).toBe('#'+routePilotPath);expect(find(render(),n=>n.props?.role==='alert')).toBeDefined();
 });
 it('sanitizes corrupt note snapshots and allows a fresh explicit local visit',()=>{
  saved.set(PILOT_NOTE_KEY,JSON.stringify({note:'test',skipPlaceOnce:true,returnTo:{beatIndex:99}}));
  expect(readPilotNote().returnTo).toBeUndefined();button('进入鲁朗 · 保留原路段').onClick();expect(scene().view.mode).toBe('place');expect(readPilotNote().skipPlaceOnce).toBe(false);
 });
});
