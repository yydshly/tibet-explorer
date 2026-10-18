import {describe,expect,it} from 'vitest';
import {NARRATION_SENTENCE_MAX_CHARS,narrationSentence,splitNarrationSentences} from '../src/lib/narrationSentence';
import {cityLifeSceneToAudio,type CityLifeAudioSegment} from '../src/lib/cityLifeAudio';
import {cityComparisonAudioSegments} from '../src/hooks/useCityComparisonDirector';
import {cityComparisonStages} from '../src/data/cityComparison';
import {cityLifeNarrationSegments} from '../src/data/cityLifeJourney';

describe('同一录音进度中的短句字幕估算',()=>{
 it('空文本、越界和非数值进度都有稳定结果',()=>{
  expect(splitNarrationSentences(' \n ')).toEqual([]);
  expect(narrationSentence('',.5)).toBe('');
  expect(narrationSentence('只有一句。',0)).toBe('只有一句。');
  expect(narrationSentence('甲。乙。',-1)).toBe('甲。');
  expect(narrationSentence('甲。乙。',2)).toBe('乙。');
  expect(narrationSentence('甲。乙。',Number.NaN)).toBe('甲。');
 });
 it('按非空白字符权重分配进度，准确边界属于下一短句，终点保留末句',()=>{
  const text='甲甲。乙乙乙乙！丙？';
  expect(splitNarrationSentences(text)).toEqual(['甲甲。','乙乙乙乙！','丙？']);
  expect(narrationSentence(text,0)).toBe('甲甲。');
  expect(narrationSentence(text,.2999)).toBe('甲甲。');
  expect(narrationSentence(text,.3)).toBe('乙乙乙乙！');
  expect(narrationSentence(text,.7999)).toBe('乙乙乙乙！');
  expect(narrationSentence(text,.8)).toBe('丙？');
  expect(narrationSentence(text,1)).toBe('丙？');
  expect(narrationSentence('甲甲。\n 乙乙乙乙！ 丙？',.3)).toBe('乙乙乙乙！');
 });
 it('中文停顿与闭引号保留，小数、英文缩写不被句点拆断',()=>{
  expect(splitNarrationSentences('先经过，后停留；他说：“继续。”再提问？')).toEqual(['先经过，','后停留；','他说：“继续。”','再提问？']);
  expect(splitNarrationSentences('海拔3.5千米；参考 U.S. data and Dr. Li. Next sentence!')).toEqual(['海拔3.5千米；','参考 U.S. data and Dr. Li.','Next sentence!']);
 });
 it('没有标点的长段也有有界字幕，Unicode字符不被切成半个代理项',()=>{
  const text='地'.repeat(90)+'🌍'.repeat(8),parts=splitNarrationSentences(text);
  expect(parts.join('')).toBe(text);
  expect(parts.every(part=>Array.from(part).length<=NARRATION_SENTENCE_MAX_CHARS)).toBe(true);
  expect(parts.at(-1)).toContain('🌍');
  expect(splitNarrationSentences('This deliberately long English clause uses word boundaries to remain readable while it is shown.').every(part=>Array.from(part).length<=NARRATION_SENTENCE_MAX_CHARS)).toBe(true);
 });
 it('历史事件长列举保留年份与事件，不留下孤立的年字字幕',()=>{
  const text='二十世纪又经历一九〇四年英国军事行动、一九五一年协议、一九五九年冲突及改革、一九六五年自治区成立。';
  const parts=splitNarrationSentences(text);
  expect(parts.join('')).toBe(text);
  expect(parts.every(part=>Array.from(part).length<=NARRATION_SENTENCE_MAX_CHARS)).toBe(true);
  expect(parts.some(part=>part.includes('一九六五年自治区成立。'))).toBe(true);
  expect(parts.some(part=>part.startsWith('年'))).toBe(false);
 });
 it('手动前跳、回拖、重播与跨clip定位不带上一段字幕，也不改音频原文',()=>{
  const segments:CityLifeAudioSegment[]=[{id:'first',text:'甲前。甲后。',start:0,end:.5},{id:'second',text:'乙前。乙后。',start:.5,end:1}];
  const original=structuredClone(segments);
  const caption=(progress:number)=>{const position=cityLifeSceneToAudio(segments,progress)!;return narrationSentence(position.segment.text,position.fraction);};
  expect([0,.4999,.5,.75,1,.6,.2,0].map(caption)).toEqual(['甲前。','甲后。','乙前。','乙后。','乙后。','乙前。','甲前。','甲前。']);
  expect(segments).toEqual(original);
 });
 it('现有三地对照与单城录音可逐段生成短字幕，queue仍保存整段配音文本',()=>{
  const segments=[...cityComparisonStages.flatMap(stage=>cityComparisonAudioSegments(stage.id)),...(['nyingchi','lhasa','ngari'] as const).flatMap(city=>(['environment','life','history'] as const).flatMap(stage=>cityLifeNarrationSegments(city,stage)))];
  for(const segment of segments){
   const original=segment.text,parts=splitNarrationSentences(original);
   expect(parts.length,segment.id).toBeGreaterThan(0);
   expect(parts.every(part=>Array.from(part).length<=NARRATION_SENTENCE_MAX_CHARS),segment.id).toBe(true);
   if(Array.from(original).length>NARRATION_SENTENCE_MAX_CHARS)expect(parts.length,segment.id).toBeGreaterThan(1);
   for(const fraction of [0,.25,.5,.75,1])expect(parts,segment.id).toContain(narrationSentence(original,fraction));
   expect(cityLifeSceneToAudio([segment],segment.start)?.queue[0].text).toBe(original);
   expect(segment.text).toBe(original);
  }
 });
});
