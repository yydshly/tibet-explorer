import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {deepNaturePhrases} from '../src/data/deepNaturePhrases';
import {journeySteps} from '../src/data/journey';
import {narrationPhraseBindings,narrationPhraseGuide} from '../src/lib/narrationPhraseGuide';
import {narrationTimingAt,validateNarrationTimeline} from '../src/lib/narrationTiming';
import {mountainCloudState} from '../src/lib/waterProcess';

const ids=['G3','C1','C2','C3','C6','C7','C8','C9'];
const cues=ids.flatMap(id=>journeySteps[id].cues);
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const sha=(text)=>createHash('sha256').update(text).digest('hex');
function recording(cueId){
 const cue=cues.find(item=>item.id===cueId),asset=manifest.clips.find((item)=>item.cueId===cueId);
 expect(asset.text).toBe(cue.narration);
 const bytes=readFileSync(`public${asset.subtitleUrl}`);
 expect(sha(bytes)).toBe(asset.subtitleSha256);
 const timeline=validateNarrationTimeline(JSON.parse(bytes.toString('utf8')),asset,sha(cue.narration));
 expect(timeline?.timingLevel).toBe('word');
 return {cue,timeline:timeline};
}
function nativeNatureGuide(cueId,token,part=.5){
 const {cue,timeline}=recording(cueId),phrases=narrationPhraseBindings(cueId,cue.narration),phrase=phrases.find(item=>item.token===token);
 expect(phrase,`${cueId}: ${token}`).toBeDefined();
 const position=phrase.textStart+(phrase.textEnd-phrase.textStart)*part;
 const word=timeline.words.filter(item=>item.textEnd>phrase.textStart&&item.textStart<phrase.textEnd)
  .sort((a,b)=>Math.abs((a.textStart+a.textEnd)/2-position)-Math.abs((b.textStart+b.textEnd)/2-position))[0];
 // The clock here is inside an actual provider word, not a hand-authored
 // timestamp or a recording-length percentage posing as text alignment.
 const seconds=(word.start+word.end)/2,timing=narrationTimingAt(cue.narration,seconds,timeline.duration,timeline);
 return narrationPhraseGuide(cueId,cue.narration,.01,timing);
}

describe('all deeper nature topics use the exact recorded phrases',()=>{
 it('covers all 32 actual cues from first character through the source text, with bounded named-object attention',()=>{
  expect(cues).toHaveLength(32);expect(Object.keys(deepNaturePhrases).sort()).toEqual(cues.map(item=>item.id).sort());
  for(const cue of cues){
   const authored=deepNaturePhrases[cue.id],bound=narrationPhraseBindings(cue.id,cue.narration);
   expect(bound.length,`${cue.id}: every literal anchor is present`).toBe(authored.length);
   expect(bound.length).toBeGreaterThanOrEqual(3);expect(bound[0].textStart).toBe(0);expect(bound.at(-1).textEnd).toBe(cue.narration.length);
   for(const [index,phrase]of bound.entries()){
    expect(cue.narration.slice(phrase.textStart).startsWith(phrase.token)).toBe(true);
    expect(phrase.textEnd).toBeGreaterThan(phrase.textStart);
    expect(phrase.targets.length).toBeGreaterThan(0);expect(phrase.targets.length).toBeLessThanOrEqual(2);
    if(index)expect(phrase.textStart).toBe(bound[index-1].textEnd);
    if(phrase.from!==undefined){expect(phrase.from).toBeGreaterThanOrEqual(0);expect(phrase.from).toBeLessThanOrEqual(1);expect(phrase.to).toBeGreaterThanOrEqual(0);expect(phrase.to).toBeLessThanOrEqual(1);}
   }
  }
 });
 it.each(cues.map(cue=>[cue.id]))('%s binds every phrase inside the validated native word sidecar',cueId=>{
  const {cue,timeline}=recording(cueId),bound=narrationPhraseBindings(cueId,cue.narration);
  for(const phrase of bound){
   const word=timeline.words.find(word=>word.textStart>=phrase.textStart&&word.textEnd<=phrase.textEnd);
   expect(word,`${cueId}: ${phrase.token}`).toBeDefined();
   const timing=narrationTimingAt(cue.narration,(word.start+word.end)/2,timeline.duration,timeline);
   const guide=narrationPhraseGuide(cueId,cue.narration,.99,timing);
   expect(guide.phraseId).toBe(phrase.phraseId);expect(guide.timingPrecision).toBe('provider');expect(guide.targets).toEqual(phrase.targets);
  }
 });
 it('C6 physically separates arrival, lifting, cloud, growth, ground rain and runoff, even when raw audio fraction is unchanged',()=>{
  const state=(token)=>mountainCloudState(nativeNatureGuide('C6-explain',token).sceneProgress);
  expect(state('先看携水汽的空气到达').lifting).toBe(0);
  const lift=state('再沿坡上升'),cool=state('空气膨胀冷却'),cloud=state('继续推进，满足凝结条件后'),rain=state('云滴增长以后才有降水'),ground=state('水到地表后再汇流或入渗');
  expect(lift.lifting).toBeGreaterThan(0);expect(lift.condensation).toBe(0);expect(cool.lifting).toBeGreaterThan(lift.lifting);expect(cool.condensation).toBe(0);
  expect(cloud.condensation).toBeGreaterThan(0);expect(cloud.precipitation).toBe(0);expect(rain.precipitation).toBeGreaterThan(0);expect(rain.runoff).toBe(0);expect(ground.runoff).toBeGreaterThan(0);
  expect(nativeNatureGuide('C6-explain','水到地表后再汇流或入渗').sceneSettings).toEqual({layer:'water',cutaway:true});
  expect(nativeNatureGuide('C6-explain','再沿坡上升').sceneSettings).toEqual({layer:'rain',cutaway:false});
 });
 it('seasons change only at actual seasonal phrases and two lake states never create intermediate years',()=>{
  expect(nativeNatureGuide('C1-explain','夏至时').sceneSettings.season).toBe(1);
  expect(nativeNatureGuide('C1-explain','冬至则相反').sceneSettings.season).toBe(3);
  expect(nativeNatureGuide('C7-explain','从夏至切到冬至').sceneSettings.season).toBe(1);
  expect(nativeNatureGuide('C7-explain','观察同一山地表面与照射背景的变化').sceneSettings.season).toBe(3);
  for(const cue of journeySteps.C9.cues)for(const phrase of deepNaturePhrases[cue.id])if(phrase.from!==undefined){expect([0,1]).toContain(phrase.from);expect(phrase.to).toBe(phrase.from);}
  expect(nativeNatureGuide('C9-opening','一九七六年湖面面积').sceneProgress).toBe(0);
  expect(nativeNatureGuide('C9-opening','二〇一七年为').sceneProgress).toBe(1);
 });
 it('same native word yields identical scene state across pause and backwards replay, without mutating author data',()=>{
  const after=nativeNatureGuide('C6-explain','水到地表后再汇流或入渗'),before=nativeNatureGuide('C6-explain','先看携水汽的空气到达');
  expect(nativeNatureGuide('C6-explain','水到地表后再汇流或入渗')).toEqual(after);
  expect(nativeNatureGuide('C6-explain','先看携水汽的空气到达')).toEqual(before);
  after.targets.push('invalid');after.sceneSettings.layer='invalid';
  expect(nativeNatureGuide('C6-explain','水到地表后再汇流或入渗').targets).toEqual(['cloud-runoff']);
  expect(nativeNatureGuide('C6-explain','水到地表后再汇流或入渗').sceneSettings.layer).toBe('water');
 });
});
