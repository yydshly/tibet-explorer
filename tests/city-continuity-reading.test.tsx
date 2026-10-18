import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import CityContinuityReading,{cityContinuityFeedback} from '../src/components/CityContinuityReading';
import CityComparisonReading from '../src/components/CityComparisonReading';
import {cityComparisonAudioSegments,validateCityComparisonPosition,type useCityComparisonDirector} from '../src/hooks/useCityComparisonDirector';
import {cityComparisonContinuation} from '../src/lib/cityComparisonContinuation';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {getCityComparisonStage,type CityComparisonStageId} from '../src/data/cityComparison';

type Director=ReturnType<typeof useCityComparisonDirector>;
function directorFor(stage:CityComparisonStageId,progress:number,services=true):Director{
 const position=validateCityComparisonPosition({stage,progress,services});
 return {...position,playing:false,currentSentence:'',audio:{status:'idle',cue:null,cueIndex:-1,cueCount:0,currentTime:0,duration:0,progress:0,error:null,provider:'MiniMax'},continuation:cityComparisonContinuation(stage,progress,cityComparisonAudioSegments(stage)),continueReading:vi.fn(),getPosition:()=>position,restorePosition:vi.fn(),selectStage:vi.fn(),setProgress:vi.fn(),pause:vi.fn(),playPause:vi.fn(),replay:vi.fn(),replaySegment:vi.fn(),setVoice:vi.fn(),setRelief:vi.fn(),setServices:vi.fn(),setBuilt:vi.fn(),setTransfer:vi.fn()};
}
function elements(node:ReactNode):ReactElement<{children?:ReactNode;onClick?:()=>void}>[]{
 if(!isValidElement(node))return [];
 const element=node as ReactElement<{children?:ReactNode;onClick?:()=>void}>;
 return [element,...Children.toArray(element.props.children).flatMap(elements)];
}

describe('后半主线的空间用途操作与连续阅读',()=>{
 it('历史可逆操作绑定同一services状态，环节选择仍使用真实配音边界',()=>{
  const director=directorFor('history',cityContinuityPartProgress('lhasa',1),false);
  const tree=CityContinuityReading({director});
  const buttons=elements(tree).filter(element=>element.type==='button');
  const addUse=buttons.find(element=>element.props.children==='加入人的使用')!;
  const keepSpace=buttons.find(element=>element.props.children==='只看空间条件')!;
  addUse.props.onClick?.();keepSpace.props.onClick?.();
  expect(director.setServices).toHaveBeenNthCalledWith(1,true);expect(director.setServices).toHaveBeenNthCalledWith(2,false);
  buttons[2].props.onClick?.();
  expect(director.setProgress).toHaveBeenCalledWith(cityContinuityPartProgress('lhasa',2));
  const feedback=cityContinuityFeedback(director);
  expect(feedback.state).toMatchObject({cityId:'lhasa',index:1});
  expect(feedback.part).toBe(cityContinuityLessons.history.lhasa[1]);
  expect(feedback.text).toContain('地形与既有空间仍在');
 });
 it.each(['history','connections','travel'] as const)('%s收起重复大卡但保留三地完整对照备注和当前材料',stage=>{
  const director=directorFor(stage,cityContinuityPartProgress('lhasa',1));
  const html=renderToStaticMarkup(createElement(CityComparisonReading,{director,onFocus:vi.fn(),onCity:vi.fn()}));
  expect(html).toContain('city-continuity-city-strip');expect(html).not.toContain('class="city-comparison-places"');
  expect(html).toContain('三地的不同用途与联系');
  for(const note of Object.values(getCityComparisonStage(stage).cityNotes))expect(html).toContain(note);
  expect(html).toContain(cityContinuityLessons[stage].lhasa[1].title);
  expect(html).toContain('接着要解释');
 });
 it('旅行末环给当前地方的具体观察入口，同时保留候选保存仍由本人点击',()=>{
  const onPrepareObservation=vi.fn(),director=directorFor('travel',.98);
  const html=renderToStaticMarkup(createElement(CityComparisonReading,{director,onFocus:vi.fn(),onCity:vi.fn(),onPrepareObservation}));
  expect(html).toContain('选择阿里的具体观察点');
  expect(html).toContain('先完成狮泉河的交通、河岸与生活问题');
  expect(html).toContain('如需托林历史，再另选跨县一站');
  expect(html).toContain('聚焦当前观察环节');expect(html).toContain('保留环境与既有用途');
  expect(onPrepareObservation).not.toHaveBeenCalled();expect(director.continueReading).not.toHaveBeenCalled();
 });
});
