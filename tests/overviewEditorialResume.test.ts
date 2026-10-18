import {afterEach,describe,it,expect,vi} from 'vitest';
import {readOverviewPosition} from '../src/hooks/useOverviewDirector';
import {overviewMainProgram} from '../src/data/overviewProgram';
import {overviewResumeAliases} from '../src/data/overviewLogic';
import {overviewPresentation} from '../src/lib/overviewScene';
afterEach(()=>vi.unstubAllGlobals());
describe('editorial moves preserve the chapter without reusing another audio clock',()=>{
 const beats=overviewMainProgram.beats.map(b=>({...b,sceneIdentity:overviewPresentation(b,0).sceneIdentity}));
 it('moves removed clips to the corresponding new explanation at its own beginning',()=>{
  for(const [old,replacement]of Object.entries(overviewResumeAliases)){
   vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({beatId:old,recordingId:old,text:'old words',raw:.8,voice:false})});
   expect(readOverviewPosition({beats,resumeAliases:overviewResumeAliases})).toMatchObject({beatId:replacement,raw:0,voice:false});
  }
 });
 it('keeps exact unchanged recordings at their actual saved point',()=>{
  const beat=beats.find(b=>b.id==='OVERVIEW-city-change')!;
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({beatId:beat.id,recordingId:beat.recordingId,text:beat.text,raw:.67,voice:true})});
  expect(readOverviewPosition({beats,resumeAliases:overviewResumeAliases})).toMatchObject({beatId:beat.id,raw:.67,voice:true});
 });
});
