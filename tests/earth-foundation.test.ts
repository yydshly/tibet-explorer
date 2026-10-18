import {describe,it,expect} from 'vitest';
import {foundationFeedback,foundationLayers,foundationChoices} from '../src/lib/earthFoundationState';
import {emptyExploration,defaultSettings,parseExploration} from '../src/lib/store';
import {getJourneyStep} from '../src/data/journey';
import {earthOrientationLayers} from '../src/data/orientation';

describe('Earth foundations remain synchronized with the existing journey',()=>{
 it('keeps every manually operable foundation stage in narration and persistence',()=>{
  const cues=getJourneyStep('G1').cues;
  expect(cues.map(cue=>cue.settings.layer)).toEqual([...foundationLayers]);
  expect(earthOrientationLayers.G1.map(layer=>layer.id)).toEqual([...foundationLayers]);
  for(const layer of foundationLayers)for(const choice of foundationChoices){
   const saved=emptyExploration();saved.scenes.G1={...defaultSettings(layer,choice.id),progress:.62};
   expect(parseExploration(JSON.stringify(saved)).scenes.G1).toEqual(saved.scenes.G1);
  }
 });
 it('manual progress changes the causal feedback and keeps comparisons distinct',()=>{
  const state=defaultSettings('earth-circulation');
  const texts=[0,.26,.51,.76].map(progress=>foundationFeedback({...state,progress}).text);
  expect(new Set(texts).size).toBe(4);
  const comparisons=foundationChoices.map(place=>foundationFeedback({...state,layer:'earth-contrasts',selected:place.id}));
  expect(new Set(comparisons.map(item=>item.text)).size).toBe(3);
  expect(comparisons[2].text).toContain('高度');
 });
});
