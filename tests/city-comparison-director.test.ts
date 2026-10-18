import {describe,expect,it,vi} from 'vitest';
import {cityComparisonNarrationCues,cityComparisonStages} from '../src/data/cityComparison';
import {cityComparisonAudioSegments,cityComparisonStorageKey,saveCityComparisonEntry,validateCityComparisonPosition} from '../src/hooks/useCityComparisonDirector';
import {cityLifeAudioToScene,cityLifeSceneToAudio} from '../src/lib/cityLifeAudio';
import {cityAccessAudioSegments} from '../src/lib/cityAccessAudio';
import {cityContinuityAudioSegments} from '../src/lib/cityContinuityAudio';
import {isCityContinuityLessonStage} from '../src/lib/cityContinuityState';

describe('同图比较的可恢复位置与真实片段时钟',()=>{
  it('显式入口从主题开头开始，同时保留静音偏好；普通返回不调用重置',()=>{
    let record=JSON.stringify({stage:'travel',progress:1,voice:false,services:false,relief:false,built:false});
    vi.stubGlobal('localStorage',{getItem:()=>record,setItem:(_key:string,value:string)=>{record=value;}});
    try{
      expect(saveCityComparisonEntry('climate')).toEqual({stage:'climate',progress:0,voice:false,services:true,relief:true,built:true,transfer:true});
      expect(JSON.parse(record)).toMatchObject({stage:'climate',progress:0});
      expect(saveCityComparisonEntry('development',.69)).toMatchObject({stage:'development',progress:.69,voice:false});
    }finally{vi.unstubAllGlobals();}
  });
  it('独立保存比较位置，不继承单城阅读记录或未定义阶段',()=>{
    expect(cityComparisonStorageKey).toBe('tibet-explorer.city-comparison.v1');
    expect(validateCityComparisonPosition({stage:'terrain',progress:.57,voice:false,relief:false})).toEqual({stage:'terrain',progress:.57,voice:false,relief:false,services:true,built:true,transfer:true});
    expect(validateCityComparisonPosition({stage:'removed-stage',progress:'broken',voice:'false',relief:0})).toEqual({stage:'climate',progress:0,voice:true,relief:true,services:true,built:true,transfer:true});
    expect(validateCityComparisonPosition({stage:'history',progress:.75,services:false})).toMatchObject({stage:'history',progress:.75,services:false});
    expect(validateCityComparisonPosition({stage:'life',progress:.5,services:false})).toEqual({stage:'mobility',progress:.5,voice:true,relief:true,services:false,built:true,transfer:true});
    expect(validateCityComparisonPosition(null)).toEqual({stage:'climate',progress:0,voice:true,relief:true,services:true,built:true,transfer:true});
    expect(validateCityComparisonPosition({stage:'development',progress:.5,transfer:false})).toMatchObject({transfer:false});
    expect(validateCityComparisonPosition({progress:10}).progress).toBe(1);
    expect(validateCityComparisonPosition({progress:-2}).progress).toBe(0);
  });

  it('九阶段保留城市顺序，现代发展十二片、后三主题九片，字幕严格同文',()=>{
    expect(cityComparisonStages.map(stage=>stage.id)).toEqual(['climate','terrain','mobility','water','settlement','history','development','connections','travel']);
    for(const stage of cityComparisonStages){
      const segments=cityComparisonAudioSegments(stage.id);
      if(stage.id==='development'){
        expect(segments).toEqual(cityAccessAudioSegments);
        expect(segments).toHaveLength(12);
        expect(segments[0].start).toBe(0);
        expect(segments.at(-1)!.end).toBe(1);
        for(let index=0;index<segments.length-1;index++)expect(segments[index].end).toBe(segments[index+1].start);
      }else if(isCityContinuityLessonStage(stage.id)){
        expect(segments).toEqual(cityContinuityAudioSegments(stage.id));expect(segments).toHaveLength(9);
        expect(segments[0].start).toBe(0);expect(segments.at(-1)!.end).toBe(1);
        for(let index=0;index<segments.length-1;index++)expect(segments[index].end).toBe(segments[index+1].start);
      }else expect(segments.map(segment=>[segment.start,segment.end])).toEqual([[0,.34],[.34,.68],[.68,1]]);
      expect(segments.map(segment=>segment.text).join('')).toBe(stage.narration);
      for(const segment of segments)expect(cityComparisonNarrationCues.find(cue=>cue.id===segment.id)?.narration).toBe(segment.text);
    }
  });

  it('50%定位第二段内部；跨片回拖会重建后续队列；终点不跳回第一段',()=>{
    const segments=cityComparisonAudioSegments('terrain');
    const middle=cityLifeSceneToAudio(segments,.5)!;
    expect(middle.segment.id).toBe('COMPARE-terrain-2');
    expect(middle.fraction).toBeCloseTo((.5-.34)/.34,10);
    expect(middle.queue.map(cue=>cue.id)).toEqual(['COMPARE-terrain-2','COMPARE-terrain-3']);
    expect(cityLifeSceneToAudio(segments,.9)?.queue.map(cue=>cue.id)).toEqual(['COMPARE-terrain-3']);
    expect(cityLifeSceneToAudio(segments,.17)?.queue.map(cue=>cue.id)).toEqual(['COMPARE-terrain-1','COMPARE-terrain-2','COMPARE-terrain-3']);
    expect(cityLifeSceneToAudio(segments,1)?.segment.id).toBe('COMPARE-terrain-3');
    expect(cityLifeSceneToAudio(segments,1)?.fraction).toBe(1);
  });

  it('每段实际音频时钟可逆且不接收其他阶段或单城的迟到事件',()=>{
    for(const stage of cityComparisonStages){
      const segments=cityComparisonAudioSegments(stage.id);
      for(const progress of [0,.17,.34,.5,.67,.68,.84,1]){
        const position=cityLifeSceneToAudio(segments,progress)!;
        expect(cityLifeAudioToScene(segments,position.segment.id,position.fraction)).toBeCloseTo(progress,10);
      }
      const other=cityComparisonStages.find(item=>item.id!==stage.id)!;
      expect(cityLifeAudioToScene(segments,`COMPARE-${other.id}-1`,1)).toBeUndefined();
      expect(cityLifeAudioToScene(segments,'CITY-lhasa-life-1',1)).toBeUndefined();
    }
  });
});
