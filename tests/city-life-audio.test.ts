import {describe,expect,it} from 'vitest';
import {cityLifeJourneys,cityLifeNarrationSegments} from '../src/data/cityLifeJourney';
import {cityLifeAudioToScene,cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';

describe('城市讲解的真实分段音频与场景时钟',()=>{
  it('拖到50%从第二个真实clip的对应局部时间开始，队列保留后续第三段',()=>{
    const segments=cityLifeNarrationSegments('nyingchi','history');
    const position=cityLifeSceneToAudio(segments,.5)!;
    expect(position.index).toBe(1);
    expect(position.segment.id).toBe('CITY-nyingchi-history-2');
    expect(position.fraction).toBeCloseTo((.5-.34)/.34,10);
    expect(position.queue.map(cue=>cue.id)).toEqual(['CITY-nyingchi-history-2','CITY-nyingchi-history-3']);
    expect(position.queue.map(cue=>cue.text)).toEqual(segments.slice(1).map(segment=>segment.text));
    expect(cityLifeAudioToScene(segments,position.segment.id,position.fraction)).toBeCloseTo(.5,10);
  });

  it('片段边界归入下一段，终点1仍是第三段结尾而不回到第一段',()=>{
    const segments=cityLifeNarrationSegments('lhasa','environment');
    for(const [progress,index,fraction] of [[0,0,0],[.34,1,0],[.68,2,0],[1,2,1]]){
      const position=cityLifeSceneToAudio(segments,progress)!;
      expect(position.index).toBe(index);expect(position.fraction).toBe(fraction);
      expect(position.queue.length).toBe(3-index);
    }
    expect(cityLifeSceneToAudio(segments,.33999)?.index).toBe(0);
    expect(cityLifeSceneToAudio(segments,.67999)?.index).toBe(1);
  });

  it('从第三段回拖到第一段会重新建立包含全部后续clip的队列',()=>{
    const segments=cityLifeNarrationSegments('ngari','life');
    expect(cityLifeSceneToAudio(segments,.9)?.queue.map(cue=>cue.id)).toEqual(['CITY-ngari-life-3']);
    const rewound=cityLifeSceneToAudio(segments,.17)!;
    expect(rewound.fraction).toBe(.5);
    expect(rewound.queue.map(cue=>cue.id)).toEqual(['CITY-ngari-life-1','CITY-ngari-life-2','CITY-ngari-life-3']);
  });

  it('三地九段的映射可逆，当前句段不会提前越过其真实clip边界',()=>{
    for(const journey of cityLifeJourneys)for(const stage of journey.stages){
      const segments=cityLifeNarrationSegments(journey.cityId,stage.id);
      for(const progress of [0,.12,.33,.34,.5,.66,.68,.85,1]){
        const position=cityLifeSceneToAudio(segments,progress)!;
        expect(cityLifeAudioToScene(segments,position.segment.id,position.fraction)).toBeCloseTo(progress,10);
        expect(position.segment.text).toBe(segments[position.index].text);
      }
      expect(cityLifeSceneToAudio(segments,.66)?.segment.id).toBe(`CITY-${journey.cityId}-${stage.id}-2`);
    }
  });

  it('旧城市、旧阶段与无效cue事件不修改当前场景，非法手动进度归一化',()=>{
    const segments=cityLifeNarrationSegments('lhasa','history');
    expect(cityLifeAudioToScene(segments,'CITY-nyingchi-history-2',.8)).toBeUndefined();
    expect(cityLifeAudioToScene(segments,'CITY-lhasa-environment-2',.8)).toBeUndefined();
    expect(cityLifeAudioToScene(segments,'missing',1)).toBeUndefined();
    expect(cityLifeSceneToAudio([],0)).toBeUndefined();
    expect(cityLifeSceneToAudio(segments,NaN)?.fraction).toBe(0);
    expect(cityLifeSceneToAudio(segments,-.4)?.index).toBe(0);
    expect(cityLifeSceneToAudio(segments,1.4)?.fraction).toBe(1);
  });
});
