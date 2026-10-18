import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {learningStepIds} from '../src/data/learningOrder';
import {recognitionStepIds} from '../src/lib/topicJourney';
import {atlasHash,cityAtlasLocation,detailHash} from '../src/lib/spatialJourney';
import {recognitionQuestions,recognitionQuestionTarget,resolveRecognitionRoute,sameRecognitionDestination} from '../src/lib/recognitionRoute';
import RecognitionRoute from '../src/components/RecognitionRoute';

describe('one recognition context for existing introduction, map and topics',()=>{
  it('accounts for every existing deep question exactly once without a new progress record',()=>{
    const ids=recognitionQuestions.flatMap(question=>[...question.stepIds]);
    expect(new Set(ids).size).toBe(learningStepIds.length);
    expect([...ids].sort()).toEqual([...learningStepIds].sort());
    expect(resolveRecognitionRoute({hash:'#/'})).not.toHaveProperty('completed');
    expect(resolveRecognitionRoute({hash:'#/'})).not.toHaveProperty('progress');
  });
  it('keeps the five-step introduction before entering the actual city comparison',()=>{
    for(let index=0;index<recognitionStepIds.length;index++){
      const id=recognitionStepIds[index];
      const state=resolveRecognitionRoute({hash:`#/learn/${id.startsWith('G')?'position':'climate'}/${id}/detail?journey=guided`});
      expect(state.mode).toBe('introduction');
      if(index<recognitionStepIds.length-1)expect(state.next!.hash).toContain(`/${recognitionStepIds[index+1]}`);
      else expect(state.next).toMatchObject({kind:'comparison',comparisonStage:'climate'});
    }
  });
  it('uses the actual director stage, never the shared G4 URL, to identify a city question',()=>{
    const hash=atlasHash(cityAtlasLocation('ngari','environment',true));
    const history=resolveRecognitionRoute({hash,comparisonStage:'history'});
    expect(history).toMatchObject({mode:'comparison',place:'阿里',question:{id:'history'},next:{comparisonStage:'development'}});
    expect(history.next!.hash).toContain('city=ngari');
    expect(resolveRecognitionRoute({hash,comparisonStage:'water'}).question!.id).toBe('life');
    expect(resolveRecognitionRoute({hash}).mode).toBe('city');
  });
  it('keeps the guided plateau opening on the mainline when it has a geographic detail origin',()=>{
    const state=resolveRecognitionRoute({hash:'#/learn/climate/C4/detail?from=environment/southeast-clouds/C4&journey=guided'});
    expect(state.mode).toBe('introduction');expect(state.returnTarget).toBeUndefined();
    expect(state.next).toMatchObject({kind:'comparison',comparisonStage:'climate'});
    expect(state.next!.label).toContain('三地同图');
  });
  it('uses the real regional origin provided by a topic-map host',()=>{
    const hash=atlasHash({themeId:'history',hotspotId:'tholing-exchange',questionId:'H2',view:'topics'});
    const state=resolveRecognitionRoute({hash,cityId:'ngari'});
    expect(state.mode).toBe('topic-map');
    expect(state.question!.id).toBe('history');
    expect(state.next).toMatchObject({kind:'comparison',comparisonStage:'history'});
    expect(state.next!.hash).toContain('city=ngari');
  });
  it('retains all nine map stages and gives each an explicit onward reason',()=>{
    const stages=['climate','terrain','mobility','water','settlement','history','development','connections','travel'] as const;
    for(let index=0;index<stages.length;index++){
      const state=resolveRecognitionRoute({hash:atlasHash(cityAtlasLocation('lhasa','environment',true)),comparisonStage:stages[index]});
      expect(state.nextReason.length).toBeGreaterThan(16);
      if(index<stages.length-1)expect(state.next!.comparisonStage).toBe(stages[index+1]);
    }
  });
  it('preserves the real city origin and gives snapshot restoration precedence',()=>{
    const origin=cityAtlasLocation('ngari','history',false);
    const hash=detailHash('culture','K2',origin);
    const state=resolveRecognitionRoute({hash});
    expect(state).toMatchObject({mode:'detail',place:'阿里',question:{id:'history'},returnTarget:{hash:atlasHash(origin),kind:'return'}});
    expect(state.next).toEqual(state.returnTarget);
    const returnContext={hash:'/atlas/environment/himalaya-relief/G4?view=cities&city=ngari&facet=environment&compare=1',label:'回到刚才的旅行观察',comparisonStage:'travel' as const};
    expect(resolveRecognitionRoute({hash,returnContext}).returnTarget).toEqual({...returnContext,kind:'return'});
    const terrain=resolveRecognitionRoute({hash:detailHash('position','G4',origin)});
    expect(terrain.mode).toBe('detail');
    expect(terrain.next!.hash).toBe(atlasHash(origin));
    expect(terrain.cityId).toBe('ngari');
    expect(resolveRecognitionRoute({hash:'/learn/position/G4/detail?journey=topic'}).mode).toBe('detail');
  });
  it('does not turn another region into a three-city case',()=>{
    const target=recognitionQuestionTarget('history','chamdo');
    expect(target.kind).toBe('map');
    expect(target.hash).toContain('city=chamdo');
    expect(target.hash).toContain('facet=history');
    expect(target.comparisonStage).toBeUndefined();
    const state=resolveRecognitionRoute({hash:atlasHash(cityAtlasLocation('chamdo','history',false)),comparisonStage:'history'});
    expect(state.mode).toBe('city');
    expect(state.next!.hash).toContain('city=chamdo');
    expect(recognitionQuestionTarget('climate','chamdo')).toMatchObject({kind:'map'});
    expect(recognitionQuestionTarget('climate','chamdo').hash).toContain('city=chamdo');
    expect(recognitionQuestionTarget('climate','ngari')).toMatchObject({kind:'comparison',comparisonStage:'climate'});
  });
  it('keeps a next-stage operation beside a snapshot return sharing the same map hash',()=>{
    const hash=atlasHash(cityAtlasLocation('ngari','environment',true));
    const returnContext={hash,label:'返回刚才的旅行观察'};
    const state=resolveRecognitionRoute({hash,comparisonStage:'history',returnContext});
    expect(state.next!.hash).toBe(state.returnTarget!.hash);
    expect(state.next!.comparisonStage).toBe('development');
    expect(sameRecognitionDestination(state.next,state.returnTarget)).toBe(false);
    expect(sameRecognitionDestination({...state.next!,comparisonStage:'connections'},state.next)).toBe(false);
    const html=renderToStaticMarkup(createElement(RecognitionRoute,{hash,comparisonStage:'history',returnContext,onNavigate:()=>{}}));
    expect(html).toContain('返回刚才的旅行观察');
    expect(html).toContain('recognition-route-next');
    expect(html).toContain('接下来为何继续');
    expect(html).not.toContain('回到整体继续');
  });
  it('does not duplicate a detailed-topic return that is also its next action',()=>{
    const hash=detailHash('history','H3',cityAtlasLocation('lhasa','history',false));
    const state=resolveRecognitionRoute({hash});
    expect(sameRecognitionDestination(state.next,state.returnTarget)).toBe(true);
    const html=renderToStaticMarkup(createElement(RecognitionRoute,{hash,onNavigate:()=>{}}));
    expect(html).toContain('recognition-route-return');
    expect(html).not.toContain('recognition-route-next');
    expect(html).toContain('回到整体继续');
  });
});
