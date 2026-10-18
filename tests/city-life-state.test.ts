import {describe,it,expect} from 'vitest';
import {cityLifeBeat,validateCityLifePosition,rememberCityLifePosition,cityLifeStagePosition,cityLifeFacetPosition} from '../src/lib/cityLifeState';

describe('城市生活讲解可恢复的认识位置',()=>{
 it('切换城市时不继承其他城市身份，合法阶段与手动进度可以恢复',()=>{
  const restored=validateCityLifePosition('lhasa',{cityId:'ngari',stage:'life',progress:.72,maintained:false,voice:false});
  expect(restored).toMatchObject({cityId:'lhasa',stage:'life',progress:.72,maintained:false,voice:false,lastEnvironmentStage:'life',stagePositions:{life:{progress:.72,maintained:false}}});
 });
 it('过期或损坏的记录不会产生越界阶段与NaN进度',()=>{
  expect(validateCityLifePosition('nyingchi',{stage:'old-rain',progress:'broken'},'history')).toMatchObject({cityId:'nyingchi',stage:'history',progress:0,maintained:true,voice:true});
  expect(validateCityLifePosition('ngari',{progress:10}).progress).toBe(1);
 });
 it('旁白与手动回拖采用同一历史材料边界，阿里不会滞留后一个年代',()=>{
  const first=cityLifeBeat('ngari','history',.1),second=cityLifeBeat('ngari','history',.5),last=cityLifeBeat('ngari','history',1);
  expect(first).toBeDefined();expect(second?.title).not.toBe(first?.title);expect(last?.title).not.toBe(second?.title);
  expect(cityLifeBeat('ngari','history',.1)).toEqual(first);
  expect(cityLifeBeat('unknown','history',.5)).toBeUndefined();
 });
 it('生活进入历史再返回环境维度恢复生活进度与管护条件，历史也有独立进度',()=>{
  let position=validateCityLifePosition('lhasa',{stage:'life',progress:.57,maintained:false,voice:false});
  position=cityLifeFacetPosition(position,'history');
  expect(position).toMatchObject({stage:'history',progress:0,maintained:true,lastEnvironmentStage:'life'});
  position=rememberCityLifePosition({...position,progress:.81});
  position=cityLifeFacetPosition(position,'environment');
  expect(position).toMatchObject({stage:'life',progress:.57,maintained:false,voice:false});
  expect(cityLifeFacetPosition(position,'history')).toMatchObject({stage:'history',progress:.81,maintained:true});
 });
 it('刷新后的历史记录仍能回到环境维度之前的生活位置',()=>{
  const original=validateCityLifePosition('ngari',{stage:'life',progress:.73,maintained:false});
  const history=cityLifeFacetPosition(original,'history');
  const restored=validateCityLifePosition('ngari',JSON.parse(JSON.stringify(history)),'history');
  expect(cityLifeFacetPosition(restored,'environment')).toMatchObject({stage:'life',progress:.73,maintained:false});
 });
 it('显式重播仅重置目标段，导航恢复其他段，损坏的分段数据被归一化',()=>{
  const position=validateCityLifePosition('nyingchi',{stage:'history',progress:.6,lastEnvironmentStage:'life',stagePositions:{environment:{progress:.3,maintained:true},life:{progress:9,maintained:false}}});
  expect(cityLifeFacetPosition(position,'environment')).toMatchObject({stage:'life',progress:1,maintained:false});
  const restarted=cityLifeStagePosition(position,'life',true);
  expect(restarted).toMatchObject({stage:'life',progress:0,maintained:true});
  expect(cityLifeStagePosition(restarted,'history')).toMatchObject({progress:.6});
  expect(cityLifeStagePosition(restarted,'environment')).toMatchObject({progress:.3});
 });
});
