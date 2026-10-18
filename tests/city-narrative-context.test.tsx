import {Children,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {cityNarrativeContextFor} from '../src/data/cityNarrativeContext';
import CityNarrativeContext from '../src/components/CityNarrativeContext';
import {cityComparisonSources} from '../src/data/cityComparison';
import {cityPlaceEvidenceSources} from '../src/data/cityPlaceEvidence';
import {regionalPlaceSources} from '../src/data/regionalPlaceSources';
import {cityContinuityAudioSegments} from '../src/lib/cityContinuityAudio';
import {cityAccessAudioSegments} from '../src/lib/cityAccessAudio';
import {cityAccessState} from '../src/lib/cityAccessState';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';

const historyProgress=(cityId:'nyingchi'|'lhasa'|'ngari',index:number)=>cityContinuityPartProgress(cityId,index)+.002;

describe('地方、材料年代与转场性质的短导引',()=>{
 it('保护、课堂和小镇建设有不同时间及空间，明确说明回看而非倒演',()=>{
  const protection=cityNarrativeContextFor('history','nyingchi',historyProgress('nyingchi',0))!;
  const learning=cityNarrativeContextFor('history','nyingchi',historyProgress('nyingchi',1))!;
  const town=cityNarrativeContextFor('history','nyingchi',historyProgress('nyingchi',2))!;
  expect(protection.period).toContain('2006');expect(learning.period).toContain('2026');expect(town.period).toContain('2016');
  expect(protection.referenceId).toBe('nyingchi');expect(learning.referenceId).toBe('nyingchi');expect(town.referenceId).toBe('lulang');
  expect(town.relation).toBe('different-place');expect(town.orientation).toContain('不是时间倒演或同一现场');
  expect(learning.orientation).toContain('没有课堂的实际场地定位');
  expect(town.sourceIds).toContain('event-lulang-services-2017');
 });

 it('托林交流、狮泉河公共空间与新的建城阅读不互相替代',()=>{
  const exchange=cityNarrativeContextFor('history','ngari',historyProgress('ngari',0))!;
  const city=cityNarrativeContextFor('history','ngari',historyProgress('ngari',2))!;
  expect(exchange.referenceId).toBe('tholing');expect(exchange.period).toContain('1042');
  expect(city.referenceId).toBe('ngari');expect(city.period).toContain('2017');
  expect(city.relationLabel).toContain('离开托林');
  expect(city.reading?.title).toContain('扩展阅读');
  expect(city.reading?.sourceIds).toContain('regional-shiquanhe-city-making-2021');
  expect(city.reading?.scope).toContain('不在当前录音');expect(city.reading?.scope).toContain('不重建旧城');
  expect(city.cueId).toBe('CONT-history-ngari-3');
 });

 it('所有导引依附真实原cue与可追溯来源，不在城市不匹配时露出上一处材料',()=>{
  const sources=[...cityComparisonSources,...cityPlaceEvidenceSources,...regionalPlaceSources];
  for(const stage of ['history','development','connections','travel'] as const){
   const segments=stage==='development'?cityAccessAudioSegments:cityContinuityAudioSegments(stage);
   for(const segment of segments){
    const progress=(segment.start+segment.end)/2,cityId=cityAccessState(progress).cityId;
    const context=cityNarrativeContextFor(stage,cityId,progress)!;
    expect(context.cueId).toBe(segment.id);
    for(const id of [...context.sourceIds,...(context.reading?.sourceIds??[])])expect(sources.find(source=>source.id===id),id).toBeDefined();
    const wrongCity=cityId==='ngari'?'nyingchi':'ngari';
    expect(cityNarrativeContextFor(stage,wrongCity,progress)).toBeUndefined();
   }
  }
  expect(cityNarrativeContextFor('climate','nyingchi',.1)).toBeUndefined();
 });

 it('客运跨河、另一处货场，以及观察问题重排有不同导引',()=>{
  const transfer=cityAccessAudioSegments.find(segment=>segment.id==='ACCESS-lhasa-transfer')!;
  const freight=cityAccessAudioSegments.find(segment=>segment.id==='ACCESS-lhasa-life')!;
  const passenger=cityNarrativeContextFor('development','lhasa',(transfer.start+transfer.end)/2)!;
  const cargo=cityNarrativeContextFor('development','lhasa',(freight.start+freight.end)/2)!;
  expect(passenger.place).toContain('客站');expect(cargo.place).toContain('拉萨西');
  expect(cargo.relation).toBe('different-place');expect(cargo.orientation).toContain('没有货场几何');
  const travel=cityNarrativeContextFor('travel','ngari',historyProgress('ngari',1))!;
  expect(travel.relation).toBe('observation');expect(travel.relationLabel).toContain('不是历史年表或已核验行程');
 });

 it('补读入口始终可见，展开暂停而不将新资料写入录音/时钟',()=>{
  const onPause=vi.fn();
  const tree=CityNarrativeContext({stage:'history',cityId:'ngari',sceneProgress:historyProgress('ngari',0),onPause})!;
  const html=renderToStaticMarkup(tree);
  expect(html).toContain('扩展阅读：1965—1966年的狮泉河建城');expect(html).toContain('不在当前录音');
  type Props={children?:ReactNode;className?:string;onToggle?:(event:{currentTarget:{open:boolean}})=>void};
  const all=(node:ReactNode):ReactElement<Props>[]=>{if(!isValidElement(node))return [];const element=node as ReactElement<Props>;return [element,...Children.toArray(element.props.children).flatMap(all)];};
  const reading=all(tree).find(element=>element.type==='details'&&element.props.className==='city-narrative-context-reading')!;
  expect(reading).toBeDefined();expect(onPause).not.toHaveBeenCalled();
  reading.props.onToggle?.({currentTarget:{open:true}});expect(onPause).toHaveBeenCalledTimes(1);
  reading.props.onToggle?.({currentTarget:{open:false}});expect(onPause).toHaveBeenCalledTimes(1);
 });
});
