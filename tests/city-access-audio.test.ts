import {describe,expect,it} from 'vitest';
import {cityAccessChanges} from '../src/data/cityAccessChange';
import {cityAccessAudioSegments,cityAccessNarrationCues} from '../src/lib/cityAccessAudio';
import {cityAccessCities,cityAccessCityRange,cityAccessPhases,cityAccessPhaseProgress,cityAccessState} from '../src/lib/cityAccessState';
import {cityLifeAudioToScene,cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';

describe('三城十二段实际配音与四环场景的边界',()=>{
  it('连续覆盖整个比较进度，每条实际录音唯一且直接使用该环的旁白',()=>{
    expect(cityAccessAudioSegments).toHaveLength(12);
    expect(new Set(cityAccessAudioSegments.map(segment=>segment.id)).size).toBe(12);
    expect(cityAccessAudioSegments[0].start).toBe(0);
    expect(cityAccessAudioSegments.at(-1)!.end).toBe(1);
    for(let i=0;i<cityAccessAudioSegments.length;i++){
      const segment=cityAccessAudioSegments[i],city=cityAccessCities[Math.floor(i/4)],phase=cityAccessPhases[i%4];
      expect(segment.id).toBe(`ACCESS-${city}-${phase.id}`);
      expect(segment.text).toBe(cityAccessChanges[city][phase.id].narration);
      expect(segment.end).toBeGreaterThan(segment.start);
      if(i<11)expect(segment.end).toBe(cityAccessAudioSegments[i+1].start);
      expect(cityAccessNarrationCues[i]).toMatchObject({id:segment.id,narration:segment.text,chapterId:'comparison',stepId:'COMPARE-development'});
    }
  });

  it('精确开通、接续、用途边界属于新环节，边界之前保留上一环；三城边界同样一致',()=>{
    for(const city of cityAccessCities){
      const range=cityAccessCityRange(city);
      for(const [index,phase] of cityAccessPhases.entries()){
        const progress=cityAccessPhaseProgress(city,phase.id);
        expect(progress).toBeCloseTo(range.start+(range.end-range.start)*phase.at,12);
        expect(cityAccessState(progress)).toMatchObject({cityId:city,phase:phase.id,index});
        expect(cityAccessState(progress).phaseProgress).toBeCloseTo(0,9);
        expect(cityLifeSceneToAudio(cityAccessAudioSegments,progress)!.segment.id).toBe(`ACCESS-${city}-${phase.id}`);
        if(index>0)expect(cityAccessState(progress-1e-7)).toMatchObject({cityId:city,phase:cityAccessPhases[index-1].id});
      }
    }
    expect(cityAccessState(.34-1e-7)).toMatchObject({cityId:'nyingchi',phase:'life'});
    expect(cityAccessState(.34)).toMatchObject({cityId:'lhasa',phase:'before'});
    expect(cityAccessState(.68-1e-7)).toMatchObject({cityId:'lhasa',phase:'life'});
    expect(cityAccessState(.68)).toMatchObject({cityId:'ngari',phase:'before'});
    expect(cityAccessState(1)).toMatchObject({cityId:'ngari',phase:'life',phaseProgress:1});
  });

  it('每条实际音频内部可逆，拖到任意环只保留其后真实队列，最后一帧不会重新回到开头',()=>{
    for(const [index,segment] of cityAccessAudioSegments.entries()){
      for(const fraction of [0,.25,.5,.99]){
        const progress=cityLifeAudioToScene(cityAccessAudioSegments,segment.id,fraction)!;
        const seek=cityLifeSceneToAudio(cityAccessAudioSegments,progress)!;
        expect(seek.segment.id).toBe(segment.id);
        expect(seek.fraction).toBeCloseTo(fraction,10);
        expect(seek.queue.map(cue=>cue.id)).toEqual(cityAccessAudioSegments.slice(index).map(cue=>cue.id));
        const state=cityAccessState(progress);
        expect(segment.id).toBe(`ACCESS-${state.cityId}-${state.phase}`);
        expect(state.phaseProgress).toBeCloseTo(fraction,9);
      }
    }
    expect(cityLifeSceneToAudio(cityAccessAudioSegments,1)).toMatchObject({index:11,fraction:1});
    expect(cityLifeAudioToScene(cityAccessAudioSegments,'COMPARE-development-1',1)).toBeUndefined();
    expect(cityLifeAudioToScene(cityAccessAudioSegments,'CITY-lhasa-life-1',1)).toBeUndefined();
  });
});
