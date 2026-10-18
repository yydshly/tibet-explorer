import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Exercise the hook's effects and navigation ordering without mounting a canvas
// or adding a DOM dependency. Updates render only after the effect batch ends.
const hooks=vi.hoisted(()=>{
  let slots=[],cursor=0,effects=[],dirty=false;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
  return {
    useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};
      return [slots[index].value,next=>{const value=typeof next==='function'?next(slots[index].value):next;if(!Object.is(value,slots[index].value)){slots[index].value=value;dirty=true;}}];},
    useRef(value){const index=cursor++;return (slots[index]??={current:value});},
    useMemo(factory,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:factory(),deps};return slots[index].value;},
    useEffect(effect,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){const previous=slots[index];slots[index]={deps,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});}},
    render(hook,options){let output,passes=0;do{dirty=false;cursor=0;effects=[];output=hook(options);effects.forEach(effect=>effect());if(++passes>20)throw new Error('Hook did not settle');}while(dirty);return output;},
    reset(){slots.forEach(slot=>slot?.cleanup?.());slots=[];cursor=0;effects=[];dirty=false;},
  };
});
vi.mock('react',()=>({...hooks,useCallback:(callback,deps)=>hooks.useMemo(()=>callback,deps)}));
vi.mock('../src/lib/narration',()=>({NarrationController:class{
  snapshot={status:'idle',cue:null,duration:0,progress:0,error:null};listeners=new Set();
  subscribe(listener){this.listeners.add(listener);listener(this.snapshot);return()=>this.listeners.delete(listener);}
  pause(){}stop(){this.snapshot={status:'idle',cue:null,duration:0,progress:0,error:null};this.listeners.forEach(listener=>listener(this.snapshot));}
  dispose(){this.stop();}seek(){}start(){}resume(){}setVolume(){}
}}));
import {useCityLifeDirector} from '../src/hooks/useCityLifeDirector';

const key=id=>`tibet-explorer.city-life.v1.${id}`;
const options=(patch={})=>({cityId:'lhasa',active:true,ready:true,facet:'environment',onStage:vi.fn(),...patch});
let saved;
beforeEach(()=>{
  saved=new Map();
  vi.stubGlobal('localStorage',{getItem:id=>saved.get(id)??null,setItem:(id,value)=>saved.set(id,value)});
});
afterEach(()=>{hooks.reset();vi.unstubAllGlobals();});

describe('单城讲解的导航与持久化边界',()=>{
  it('生活中途进入历史，再经浏览器返回环境恢复原进度与管护，前进也恢复历史',()=>{
    saved.set(key('lhasa'),JSON.stringify({stage:'life',progress:.57,maintained:false,voice:false}));
    const env=options(),history={...env,facet:'history'};
    let director=hooks.render(useCityLifeDirector,env);
    expect(director).toMatchObject({stage:'life',progress:.57,maintained:false});
    director=hooks.render(useCityLifeDirector,history);expect(director.stage).toBe('history');
    director.setProgress(.81);hooks.render(useCityLifeDirector,history);
    director=hooks.render(useCityLifeDirector,env);
    expect(director).toMatchObject({stage:'life',progress:.57,maintained:false,voice:false});
    expect(hooks.render(useCityLifeDirector,history)).toMatchObject({stage:'history',progress:.81});
  });
  it('比较模式的 inactive hook 不覆盖父组件刚写入的跨城深入目标',()=>{
    const inactive=options({active:false});hooks.render(useCityLifeDirector,inactive);
    const entry={cityId:'ngari',stage:'history',progress:.48,maintained:false,voice:false};
    saved.set(key('ngari'),JSON.stringify(entry));
    hooks.render(useCityLifeDirector,{...inactive,cityId:'ngari',facet:'history'});
    expect(JSON.parse(saved.get(key('ngari')))).toEqual(entry);
    const active={...inactive,cityId:'ngari',facet:'history',active:true};
    expect(hooks.render(useCityLifeDirector,active)).toMatchObject(entry);
  });
  it('同城从比较进入时读取新记录，不能把 inactive 内存中的旧段重新写回',()=>{
    saved.set(key('lhasa'),JSON.stringify({stage:'environment',progress:.2}));
    const inactive=options({active:false});hooks.render(useCityLifeDirector,inactive);
    saved.set(key('lhasa'),JSON.stringify({stage:'life',progress:.68,maintained:false}));
    expect(hooks.render(useCityLifeDirector,{...inactive,active:true})).toMatchObject({stage:'life',progress:.68,maintained:false});
    expect(JSON.parse(saved.get(key('lhasa')))).toMatchObject({stage:'life',progress:.68});
  });
  it('显式选择历史到 hashchange 之间不被旧 environment facet 重置',()=>{
    const env=options();let director=hooks.render(useCityLifeDirector,env);
    director.selectStage('history');director=hooks.render(useCityLifeDirector,env);
    expect(director).toMatchObject({stage:'history',progress:0});
    director.setProgress(.42);hooks.render(useCityLifeDirector,env);
    expect(hooks.render(useCityLifeDirector,{...env,facet:'history'})).toMatchObject({stage:'history',progress:.42});
    expect(env.onStage).toHaveBeenCalledExactlyOnceWith('history');
  });
  it('同城 inactive 显式进入生活保留选择，激活时不恢复旧历史',()=>{
    saved.set(key('lhasa'),JSON.stringify({stage:'history',progress:.8}));
    const inactive=options({active:false});let director=hooks.render(useCityLifeDirector,inactive);
    director.selectStage('life');director=hooks.render(useCityLifeDirector,inactive);
    expect(director).toMatchObject({stage:'life',progress:0});
    expect(hooks.render(useCityLifeDirector,{...inactive,active:true})).toMatchObject({stage:'life',progress:0});
  });
});
