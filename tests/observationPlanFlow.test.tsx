import {beforeEach,afterEach,it,expect,vi} from 'vitest';
// Actual page callbacks and storage code; scheduling, location and localStorage
// are substitutes. This does not assert browser reload, rendering or navigation.
const hooks=vi.hoisted(()=>{
 let slots:any[]=[],cursor=0,effects:(()=>void)[]=[],dirty=false;
 return {
  reset(){slots=[];cursor=0;effects=[];dirty=false;},
  useState(initial:any){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,(next:any)=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
  useRef(value:any){return slots[cursor++]??={current:value};},
  useEffect(fn:()=>void,deps:any[]){const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i][j]))){slots[i]=deps;effects.push(fn);}},
  render(fn:()=>any){let tree,passes=0;do{cursor=0;effects=[];dirty=false;tree=fn();effects.forEach(f=>f());if(++passes>20)throw Error('page did not settle');}while(dirty);return tree;},
 };
});
vi.mock('react',async original=>({...await original<typeof import('react')>(),...hooks}));
vi.mock('../src/components/DrawerContent',()=>({default:()=>null}));
import ObservationPlanPage from '../src/components/ObservationPlanPage';
import {appendOverviewObservation} from '../src/lib/overviewObservation';
import {emptyExploration,readExploration,writeExploration} from '../src/lib/store';
import {overviewMainProgram} from '../src/data/overviewProgram';
const beat=overviewMainProgram.beats.find(b=>b.id==='OVERVIEW-valley-journey')!;
let memory:Map<string,string>;
function find(node:any,predicate:(n:any)=>boolean):any{if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}}
const render=()=>hooks.render(ObservationPlanPage);
const button=(tree:any,text:string)=>find(tree,n=>n.type==='button'&&n.props.children===text);
beforeEach(()=>{
 hooks.reset();memory=new Map();vi.stubGlobal('location',{hash:'#/observation-plan?stop=lhasa-river'});
 vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)});
 writeExploration(appendOverviewObservation(emptyExploration(),'lhasa-river',{programId:'main',beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw:.437,voice:false,title:beat.title,question:'河流和铁路怎样接续？',sources:[...beat.sources]}));
});
afterEach(()=>vi.unstubAllGlobals());
it('edits through the actual page, persists on remount and returns with the exact origin retained',()=>{
 const origin=readExploration().overviewObservations!['lhasa-river'];
 find(render(),n=>n.type==='textarea').props.onChange({target:{value:'核对车站到河流对岸的接续。'}});
 button(render(),'保存计划').props.onClick();
 hooks.reset();const refreshed=render();
 expect(find(refreshed,n=>n.type==='textarea').props.value).toBe('核对车站到河流对岸的接续。');
 button(refreshed,'保存并回到原讲述').props.onClick();
 expect(location.hash).toBe('/overview?returnStop=lhasa-river');
 expect(readExploration().overviewObservations!['lhasa-river']).toEqual(origin);
 expect(origin.raw).toBe(.437);expect(origin.voice).toBe(false);
});
it('keeps the page and reports an error if saving fails instead of navigating away',()=>{
 render();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:()=>{throw Error('quota');}});
 find(render(),n=>n.type==='textarea').props.onChange({target:{value:'尚未写入的笔记'}});
 button(render(),'保存并回到原讲述').props.onClick();
 expect(location.hash).toBe('#/observation-plan?stop=lhasa-river');
 expect(find(render(),n=>n.props?.role==='alert')).toBeDefined();
 expect(find(render(),n=>n.type==='textarea').props.value).toBe('尚未写入的笔记');
});
