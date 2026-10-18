import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Exercise the actual component callbacks. React scheduling and the already
// tested media director are doubles; comparison must never seek/select media.
const harness=vi.hoisted(()=>{
 let slots:any[]=[],cursor=0;
 return {
  begin(){cursor=0;},reset(){slots=[];cursor=0;},
  useState(initial:any){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
  useRef(value:any){return{current:value};},useMemo:(fn:any)=>fn(),useCallback:(fn:any)=>fn,useEffect:()=>{},useLayoutEffect:()=>{},
 };
});
const media=vi.hoisted(()=>({current:{} as any}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),...harness}));
vi.mock('../src/hooks/useOverviewDirector',()=>({useOverviewDirector:()=>media.current}));
vi.mock('../src/scene/TibetScene',()=>({default:()=>null}));
import OverviewExperience from '../src/components/OverviewExperience';
import {overviewMainProgram} from '../src/data/overviewProgram';

function find(node:any,predicate:(node:any)=>boolean):any {
 if(!node||typeof node!=='object')return;
 if(predicate(node))return node;
 for(const child of [node.props?.children].flat(Infinity)){const match=find(child,predicate);if(match)return match;}
}
const render=()=>{
 harness.begin();const shell=OverviewExperience({onHome:vi.fn(),onDetail:vi.fn(),onDirectory:vi.fn(),onMap:vi.fn()});
 return (shell.type as any)(shell.props);
};
const controls=(tree:any)=>find(tree,node=>typeof node.props?.onCity==='function').props;

beforeEach(()=>{
 harness.reset();vi.stubGlobal('location',{hash:'#/overview'});
 const beatIndex=overviewMainProgram.beats.findIndex(b=>b.id==='LAB-life-lhasa');
 const beat=overviewMainProgram.beats[beatIndex];
 media.current={beatIndex,raw:.43,timing:{textProgress:beat.text.indexOf('移动探针')/beat.text.length},voice:true,ready:true,wantsPlayback:true,playing:true,audio:{},
  pause:vi.fn(()=>{media.current.wantsPlayback=false;media.current.playing=false;}),select:vi.fn(),seek:vi.fn(),playPause:vi.fn(()=>{media.current.wantsPlayback=true;}),onSceneReady:vi.fn(),onSceneError:vi.fn()};
});
afterEach(()=>vi.unstubAllGlobals());
describe('regional comparison inside a paused main narration',()=>{
 it.each(['rotation','air','bridge'])('restores %s comparison to the original spoken state without selecting/seeking media',kind=>{
  const id=kind==='rotation'?'G1-observe':kind==='air'?'LAB-air-higher':'OVERVIEW-city-change';
  media.current.beatIndex=overviewMainProgram.beats.findIndex(b=>b.id===id);
  const beat=overviewMainProgram.beats[media.current.beatIndex];
  const token=kind==='rotation'?'来到更高纬度':kind==='air'?'云逐渐增多':'现在接回同一位置';
  expect(beat.text.indexOf(token)).toBeGreaterThanOrEqual(0);
  media.current.timing={textProgress:beat.text.indexOf(token)/beat.text.length};
  const scene=()=>find(render(),node=>typeof node.props?.onGroundJourneyReading==='function');
  const key=kind==='rotation'?'rotationFlow':kind==='air'?'climateLab':'overviewCityChange';
  const original=scene().props[key],raw=media.current.raw;
  if(kind==='air'){controls(render()).onChange({moisture:'lower'});expect(scene().props.climateLab.moisture).toBe('lower');}
  else {const title=kind==='rotation'?'去掉自转项':'拿掉这座桥';find(render(),node=>node.type==='button'&&node.props.children===title).props.onClick();}
  expect(scene().props[key]).not.toEqual(original);expect(media.current.pause).toHaveBeenCalled();
  expect(media.current.seek).not.toHaveBeenCalled();expect(media.current.select).not.toHaveBeenCalled();expect(media.current.raw).toBe(raw);
  const tree=render();
  if(kind==='rotation')find(tree,node=>node.type==='button'&&node.props.children==='恢复原条件，从暂停处继续').props.onClick();
  else find(tree,node=>node.props?.kind===kind&&typeof node.props?.onResume==='function').props.onResume();
  expect(scene().props[key]).toEqual(original);expect(media.current.playPause).toHaveBeenCalledOnce();
 });
 it('pauses and carries the current place, question, sources and original recording into the saved plan',()=>{
  const memory=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)});
  media.current.beatIndex=overviewMainProgram.beats.findIndex(b=>b.id==='OVERVIEW-shiquanhe-irrigation');
  const action=find(render(),n=>n.type==='button'&&n.props.children==='带入观察计划 · 编辑与保存');action.props.onClick();
  const saved=JSON.parse(memory.get('tibet-explorer.v1')!);
  expect(saved.route).toEqual(['shiquanhe-life']);expect(saved.overviewObservations['shiquanhe-life']).toMatchObject({beatId:'OVERVIEW-shiquanhe-irrigation',raw:.43});
  expect(saved.overviewObservations['shiquanhe-life'].sources.some((s:any)=>s.url.includes('48267'))).toBe(true);
  expect(location.hash).toBe('/observation-plan?stop=shiquanhe-life');expect(media.current.pause).toHaveBeenCalledOnce();expect(media.current.select).not.toHaveBeenCalled();
 });
 it('compares irrigation conditions without seeking, retains delivered water, and restores the spoken state',()=>{
  media.current.beatIndex=overviewMainProgram.beats.findIndex(b=>b.id==='OVERVIEW-shiquanhe-irrigation');
  const beat=overviewMainProgram.beats[media.current.beatIndex];
  media.current.timing={textProgress:beat.text.indexOf('先保留灌渠')/beat.text.length};
  const scene=()=>find(render(),node=>typeof node.props?.onGroundJourneyReading==='function');
  const original=scene().props.overviewIrrigation;
  const button=(text:string)=>find(render(),node=>node.type==='button'&&node.props.children===text);
  button('打开闸门').props.onClick();button('推进一次供水').props.onClick();
  expect(scene().props.overviewIrrigation.delivered).toBe(0);
  button('完成清渠').props.onClick();button('推进一次供水').props.onClick();
  expect(scene().props.overviewIrrigation).toMatchObject({delivered:.25,flowing:true});
  button('关闭闸门').props.onClick();button('推进一次供水').props.onClick();
  expect(scene().props.overviewIrrigation).toMatchObject({delivered:.25,flowing:false});
  expect(media.current.pause).toHaveBeenCalled();expect(media.current.seek).not.toHaveBeenCalled();expect(media.current.select).not.toHaveBeenCalled();
  const guide=find(render(),node=>node.props?.kind==='irrigation'&&typeof node.props?.onResume==='function');guide.props.onResume();
  expect(scene().props.overviewIrrigation).toEqual(original);expect(media.current.playPause).toHaveBeenCalledOnce();
 });
 it('compares regions without losing the original sentence, then restores its exact conditions',()=>{
  const original=controls(render()).state;
  controls(render()).onCity('ngari');
  let panel=controls(render());
  expect(panel.manual).toBe(true);expect(panel.state.city).toBe('ngari');expect(panel.state.zoom).toBe(true);
  expect(panel.resumeTitle).toContain('拉萨');
  panel.onChange({progress:.75,direction:'east-west'});
  panel=controls(render());expect(panel.state.progress).toBe(.75);
  panel.onCity('nyingchi');expect(controls(render()).state.city).toBe('nyingchi');
  expect(media.current.pause).toHaveBeenCalled();expect(media.current.select).not.toHaveBeenCalled();expect(media.current.seek).not.toHaveBeenCalled();expect(media.current.raw).toBe(.43);
  controls(render()).onResume();panel=controls(render());
  expect(panel.manual).toBe(false);expect(panel.state).toEqual(original);expect(media.current.playPause).toHaveBeenCalledOnce();
 });
 it('opens ground inspection inside the Lhasa sentence and restores the original recording without seeking',()=>{
  const original=controls(render()).state;
  const entry=find(render(),node=>node.type==='button'&&String(node.props.children).includes('进入拉萨河谷'));
  entry.props.onClick();
  const groundPanel=()=>find(render(),node=>node.props?.state?.height!==undefined&&typeof node.props?.onResume==='function').props;
  expect(groundPanel().manual).toBe(true);
  const scene=find(render(),node=>typeof node.props?.onGroundJourneyReading==='function');
  scene.props.onSelect('ground-rail:0.4');
  expect(groundPanel().state.progress).toBe(.4);
  expect(groundPanel().state.connectionMix).toBe(0);
  groundPanel().onChange({height:2,progress:.72,bearing:90});
  expect(groundPanel().state).toMatchObject({height:2,progress:.72,bearing:90,returnMix:0});
  expect(media.current.select).not.toHaveBeenCalled();expect(media.current.seek).not.toHaveBeenCalled();expect(media.current.raw).toBe(.43);
  groundPanel().onResume();expect(controls(render()).state).toEqual(original);
 });

});

describe('documented history comparison without replacing the narration clock',()=>{
 it('changes the same place, pauses, then restores the original state on resume',()=>{
  const beatIndex=overviewMainProgram.beats.findIndex(b=>b.id==='OVERVIEW-jokhang-protection');
  const beat=overviewMainProgram.beats[beatIndex];
  media.current.beatIndex=beatIndex;media.current.raw=.4;
  media.current.timing={textProgress:beat.text.indexOf('先看原有关系')/beat.text.length};
  const scene=()=>find(render(),node=>typeof node.props?.onGroundJourneyReading==='function');
  const original=scene().props.overviewPlaceAction;
  const slider=()=>find(render(),node=>node.props?.['aria-label']==='供灯空间对照');
  slider().props.onChange({target:{value:'1'}});
  expect(scene().props.overviewPlaceAction).toMatchObject({caseId:'jokhang',separation:1,activity:0});
  slider().props.onChange({target:{value:'0'}});
  expect(scene().props.overviewPlaceAction.separation).toBe(0);
  expect(media.current.pause).toHaveBeenCalled();expect(media.current.seek).not.toHaveBeenCalled();expect(media.current.select).not.toHaveBeenCalled();expect(media.current.raw).toBe(.4);
  const guide=find(render(),node=>node.props?.kind==='jokhang'&&typeof node.props?.onResume==='function');
  expect(guide.props.manual).toBe(true);guide.props.onResume();
  expect(scene().props.overviewPlaceAction).toEqual(original);
  expect(media.current.playPause).toHaveBeenCalledOnce();
 });
});
