import {Children,isValidElement,type ReactElement,type ReactNode} from 'react';
import {describe,expect,it,vi} from 'vitest';
vi.mock('react',async()=>({...await vi.importActual('react'),useId:()=> 'reading-controls'}));
import CityPlaceThread from '../src/components/CityPlaceThread';
import CityComparisonReading from '../src/components/CityComparisonReading';
import CityAccessReading from '../src/components/CityAccessReading';
import {cityAccessPhaseProgress} from '../src/lib/cityAccessState';
import {cityPlaceThreads} from '../src/data/cityPlaceThreads';
import {cityComparisonAudioSegments,validateCityComparisonPosition,type useCityComparisonDirector} from '../src/hooks/useCityComparisonDirector';
import {cityComparisonContinuation} from '../src/lib/cityComparisonContinuation';

type EventProps={children?:ReactNode;onClick?:()=>void;onToggle?:(event:{currentTarget:{open:boolean}})=>void;'aria-label'?:string;className?:string;onPause?:()=>void;open?:boolean};
function elements(node:ReactNode):ReactElement<EventProps>[]{
 if(!isValidElement(node))return [];
 const element=node as ReactElement<EventProps>;
 return [element,...Children.toArray(element.props.children).flatMap(elements)];
}
const text=(node:ReactNode):string=>Array.isArray(node)?node.map(text).join(''):typeof node==='string'||typeof node==='number'?String(node):isValidElement<{children?:ReactNode}>(node)?Children.toArray(node.props.children).map(text).join(''):'';
function directorFor(){
 const position=validateCityComparisonPosition({stage:'development',progress:cityPlaceThreads.lhasa.steps[2].progress});
 return {...position,sceneProgress:cityPlaceThreads.lhasa.steps[2].sceneProgress!,playing:true,currentSentence:'',narrationTiming:undefined,
  audio:{status:'playing' as const,cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax' as const},
  continuation:cityComparisonContinuation(position.stage,position.progress,cityComparisonAudioSegments(position.stage)),continueReading:vi.fn(),getPosition:()=>position,getPresentation:vi.fn(),restorePosition:vi.fn(),selectStage:vi.fn(),setProgress:vi.fn(),pause:vi.fn(),playPause:vi.fn(),replay:vi.fn(),replaySegment:vi.fn(),setVoice:vi.fn(),setRelief:vi.fn(),setServices:vi.fn(),setBuilt:vi.fn(),setTransfer:vi.fn()} as unknown as ReturnType<typeof useCityComparisonDirector>;
}

describe('study controls keep the current place while the learner listens or reads',()=>{
 it('development cases open only by request, pause on opening and never pause automatically at the life phase',()=>{
  const director={...directorFor(),progress:cityAccessPhaseProgress('lhasa','life')+.001,services:false};
  const nodes=elements(CityAccessReading({director})),cases=nodes.filter(node=>node.type==='details'&&node.props.className==='city-access-case');
  expect(cases).toHaveLength(3);expect(director.pause).not.toHaveBeenCalled();
  cases.forEach(node=>{expect(node.props.open).toBeUndefined();node.props.onToggle!({currentTarget:{open:true}});});
  expect(director.pause).toHaveBeenCalledTimes(3);
  cases.forEach(node=>node.props.onToggle!({currentTarget:{open:false}}));expect(director.pause).toHaveBeenCalledTimes(3);
  expect(director.setProgress).not.toHaveBeenCalled();expect(director.playPause).not.toHaveBeenCalled();
 });
 it('opening the comparison or source material pauses; closing either never resumes',()=>{
  const director=directorFor();
  const nodes=elements(CityComparisonReading({director,onFocus:vi.fn(),onCity:vi.fn()}));
  const disclosures=nodes.filter(node=>node.type==='details'&&['city-continuity-city-notes','city-life-sources'].includes(node.props.className??''));
  expect(disclosures).toHaveLength(2);expect(director.pause).not.toHaveBeenCalled();
  disclosures.forEach(node=>node.props.onToggle!({currentTarget:{open:true}}));expect(director.pause).toHaveBeenCalledTimes(2);
  disclosures.forEach(node=>node.props.onToggle!({currentTarget:{open:false}}));expect(director.pause).toHaveBeenCalledTimes(2);
  expect(director.playPause).not.toHaveBeenCalled();expect(director.setProgress).not.toHaveBeenCalled();
 });
 it('distinguishes current-recording repetition from restarting the whole three-region topic',()=>{
  const director=directorFor(),onNavigate=vi.fn();
  const nodes=elements(CityComparisonReading({director,onFocus:vi.fn(),onCity:vi.fn(),onNavigate}));
  const repeat=nodes.find(node=>node.type==='button'&&text(node.props.children)==='重听当前段')!;
  const topic=nodes.find(node=>node.type==='button'&&node.props['aria-label']==='重播整个主题')!;
  expect(repeat).toBeDefined();expect(topic).toBeDefined();
  expect(director.replaySegment).not.toHaveBeenCalled();expect(director.replay).not.toHaveBeenCalled();
  repeat.props.onClick!();expect(director.replaySegment).toHaveBeenCalledOnce();expect(director.replay).not.toHaveBeenCalled();expect(onNavigate).toHaveBeenCalledOnce();
  topic.props.onClick!();expect(director.replay).toHaveBeenCalledOnce();expect(onNavigate).toHaveBeenCalledTimes(2);
 });
 it.each(['nyingchi','lhasa','ngari'] as const)('%s evidence disclosure pauses only on opening; closing never resumes or rewinds',cityId=>{
  const step=cityPlaceThreads[cityId].steps[2],onPause=vi.fn(),onNavigate=vi.fn();
  const nodes=elements(CityPlaceThread({cityId,stage:step.stage,progress:step.sceneProgress??step.progress,onPause,onNavigate}));
  const disclosure=nodes.find(node=>node.type==='details'&&node.props.onToggle)!;
  expect(disclosure).toBeDefined();expect(onPause).not.toHaveBeenCalled();
  disclosure.props.onToggle!({currentTarget:{open:true}});expect(onPause).toHaveBeenCalledOnce();
  disclosure.props.onToggle!({currentTarget:{open:false}});expect(onPause).toHaveBeenCalledOnce();
  const links=nodes.filter(node=>node.type==='a');expect(links.length).toBeGreaterThan(0);
  links[0].props.onClick!();expect(onPause).toHaveBeenCalledTimes(2);expect(onNavigate).not.toHaveBeenCalled();
  const exercise=nodes.find(node=>typeof node.type==='function'&&node.props.onPause===onPause);
  expect(exercise).toBeDefined();
 });
});
