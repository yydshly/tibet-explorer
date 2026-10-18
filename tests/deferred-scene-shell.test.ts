import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {TibetSceneProps} from '../src/scene/sceneTypes';

// Deterministic hook/effect harness: exercises the actual shell's asynchronous
// ownership without creating a DOM, WebGL context, media or another clock.
const environment=vi.hoisted(()=>({current:null as any,importer:null as any}));
vi.mock('react',()=>({
 useRef:(initial:unknown)=>{const h=environment.current,index=h.cursor++;if(!h.slots[index])h.slots[index]={current:initial};return h.slots[index];},
 useState:(initial:unknown)=>{const h=environment.current,index=h.cursor++;if(!h.slots[index])h.slots[index]={value:typeof initial==='function'?initial():initial};return [h.slots[index].value,(next:unknown)=>{h.updates++;h.slots[index].value=typeof next==='function'?next(h.slots[index].value):next;}];},
 useEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{const h=environment.current,index=h.cursor++,old=h.slots[index];if(!old||deps.some((value,i)=>!Object.is(value,old.deps[i])))h.pending.push(()=>{old?.cleanup?.();h.slots[index]={deps,effect,cleanup:effect()};});},
}));
vi.mock('react/jsx-runtime',()=>({jsx:(type:unknown,props:unknown)=>({type,props}),jsxs:(type:unknown,props:unknown)=>({type,props}),Fragment:'fragment'}));
vi.mock('../src/lib/deferredModuleLoader',async original=>{
 const actual=await original<typeof import('../src/lib/deferredModuleLoader')>();
 return {createDeferredModuleLoader:()=>actual.createDeferredModuleLoader(()=>environment.importer())};
});

function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function harness(component:(props:TibetSceneProps)=>unknown){
 const h={slots:[] as any[],cursor:0,pending:[] as (()=>void)[],updates:0,output:undefined as any,
  render(props:TibetSceneProps){h.cursor=0;h.pending=[];environment.current=h;try{h.output=component(props);}finally{environment.current=null;}h.pending.forEach(effect=>effect());return h.output;},
  unmount(){h.slots.forEach(slot=>slot?.cleanup?.());},
  strictReplay(){h.slots.forEach(slot=>{if(slot?.effect){slot.cleanup?.();slot.cleanup=slot.effect();}});},
 };return h;
}
const props=(patch:Partial<TibetSceneProps>={}):TibetSceneProps=>({scene:'earth',viewKey:'G1',step:0,season:1,layer:'earth-system',progress:0,playing:false,selected:'earth-ocean',cutaway:false,resetKey:0,onSelect:vi.fn(),onInteract:vi.fn(),onReady:vi.fn(),onError:vi.fn(),...patch});
function button(element:any):any{if(!element||typeof element!=='object')return;return element.type==='button'?element:Array.isArray(element.props?.children)?element.props.children.map(button).find(Boolean):button(element.props?.children);}
beforeEach(()=>{vi.resetModules();environment.current=null;environment.importer=vi.fn();});
afterEach(()=>{environment.current=null;vi.unstubAllGlobals();});

describe('deferred shell preserves current scene ownership',()=>{
 it('resolves into the latest props and stable component identity, while only the runtime may report scene ready',async()=>{
  const gate=deferred<{default:(p:TibetSceneProps)=>null}>();environment.importer.mockReturnValue(gate.promise);
  const {default:Shell}=await import('../src/scene/TibetScene'),h=harness(Shell),initial=props();
  expect(h.render(initial).props['aria-busy']).toBe(true);
  const current=props({scene:'climate',viewKey:'C4',layer:'cloud',progress:.73,selected:'lhasa',resetKey:7});h.render(current);
  const runtime={default:vi.fn((_p:TibetSceneProps)=>null)};gate.resolve(runtime);await settle();
  expect(initial.onReady).not.toHaveBeenCalled();expect(current.onReady).not.toHaveBeenCalled();
  const loaded=h.render(current);expect(loaded.type).toBe(runtime.default);expect(loaded.props).toEqual(current);
  const moved={...current,progress:.81};expect(h.render(moved).type).toBe(loaded.type);expect(environment.importer).toHaveBeenCalledOnce();
  loaded.props.onReady();expect(current.onReady).toHaveBeenCalledOnce();expect(initial.onReady).not.toHaveBeenCalled();
  h.unmount();const second=harness(Shell);expect(second.render(moved).type).toBe(runtime.default);expect(environment.importer).toHaveBeenCalledOnce();second.unmount();
 });
 it('deduplicates StrictMode effect replay and ignores the cancelled first subscription',async()=>{
  const gate=deferred<{default:()=>null}>();environment.importer.mockReturnValue(gate.promise);
  const {default:Shell}=await import('../src/scene/TibetScene'),h=harness(Shell),p=props();
  h.render(p);h.strictReplay();await settle();expect(environment.importer).toHaveBeenCalledOnce();
  const runtime={default:()=>null};gate.resolve(runtime);await settle();
  expect(h.updates).toBe(1);expect(h.render(p).type).toBe(runtime.default);expect(p.onReady).not.toHaveBeenCalled();h.unmount();
 });
 it('does not mount or notify an abandoned view after code arrives, while a live subscriber may use it',async()=>{
  const gate=deferred<{default:()=>null}>();environment.importer.mockReturnValue(gate.promise);
  const {default:Shell}=await import('../src/scene/TibetScene'),abandoned=harness(Shell),first=props();
  abandoned.render(first);abandoned.unmount();
  const active=harness(Shell),current=props({scene:'region',viewKey:'atlas',selected:'city:ngari'});active.render(current);
  const runtime={default:()=>null};gate.resolve(runtime);await settle();
  expect(abandoned.updates).toBe(0);expect(first.onError).not.toHaveBeenCalled();expect(first.onReady).not.toHaveBeenCalled();
  expect(active.render(current).type).toBe(runtime.default);expect(environment.importer).toHaveBeenCalledOnce();active.unmount();
 });
 it('reports rejection only to the latest live view, and a keyed remount can retry instead of inheriting a cached error',async()=>{
  const gate=deferred<{default:()=>null}>(),runtime={default:()=>null};environment.importer.mockReturnValueOnce(gate.promise).mockResolvedValueOnce(runtime);
  const {default:Shell}=await import('../src/scene/TibetScene'),abandoned=harness(Shell),old=props();abandoned.render(old);abandoned.unmount();
  const active=harness(Shell),earlier=props();active.render(earlier);const current=props({viewKey:'G4',scene:'region'});active.render(current);
  gate.reject(new Error('temporary failure'));await settle();
  expect(abandoned.updates).toBe(0);expect(old.onError).not.toHaveBeenCalled();expect(earlier.onError).not.toHaveBeenCalled();expect(current.onError).toHaveBeenCalledOnce();expect(current.onReady).not.toHaveBeenCalled();
  active.unmount();const retry=harness(Shell);retry.render(current);await settle();expect(retry.render(current).type).toBe(runtime.default);expect(environment.importer).toHaveBeenCalledTimes(2);retry.unmount();
 });
 it('provides a working local retry when no parent error handler exists',async()=>{
  const runtime={default:()=>null};environment.importer.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce(runtime);
  const {default:Shell}=await import('../src/scene/TibetScene'),h=harness(Shell),p=props({onError:undefined});
  h.render(p);await settle();const failed=h.render(p);expect(failed.props['aria-busy']).toBe(false);
  const retry=button(failed);expect(retry).toBeDefined();retry.props.onClick();expect(h.render(p).props['aria-busy']).toBe(true);
  await settle();expect(h.render(p).type).toBe(runtime.default);expect(environment.importer).toHaveBeenCalledTimes(2);expect(p.onReady).not.toHaveBeenCalled();h.unmount();
 });
});
