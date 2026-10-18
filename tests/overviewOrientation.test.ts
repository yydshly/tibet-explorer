// @ts-expect-error Test-only filesystem access; browser code never imports Node.
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {overviewBeats,overviewChapters} from '../src/data/overviewJourney';
import {overviewNarrationCues} from '../src/data/overviewNarration';
import {overviewPresentation,type OverviewSceneBeat} from '../src/lib/overviewScene';
import {overviewOrientationPresentation} from '../src/lib/overviewOrientation';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';

const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const beat=(id:string)=>{
  const source=overviewBeats.find(beat=>beat.recordingId===id)!;
  expect(source?.kind).toBe('orientation');return source;
};
const read=(source:OverviewSceneBeat)=>{
  const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===source.recordingId);
  expect(asset.text).toBe(source.text);
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(timeline.timingLevel).toBe('word');expect(timeline.words!.length).toBeGreaterThan(0);
  return timeline;
};
const sample=(source:OverviewSceneBeat,token:string)=>{
  const timeline=read(source),offset=source.text.indexOf(token);
  expect(offset,token).toBeGreaterThanOrEqual(0);
  const word=timeline.words!.find(word=>word.textEnd>offset)!;
  const seconds=word.start+(word.end-word.start)*.65;
  return {raw:seconds/timeline.duration,timing:narrationTimingAt(source.text,seconds,timeline.duration,timeline)};
};

describe('overview orientation introduces scales with its own exact source recordings',()=>{
  it('starts before any climate prerequisite, using a new recording rather than relabeling the former lesson',()=>{
    const source=beat('OVERVIEW-position'),script=overviewNarrationCues.find(cue=>cue.id===source.recordingId)!;
    expect(source.text).toBe(script.narration);
    expect(source.text).toMatch(/^先从完整地球找到西藏/);
    expect(source.text).not.toContain('现在知道地方差异');
    const start=overviewPresentation(source,0);
    expect(start.sceneIdentity).toBe('journey:G2');
    expect(start.props).toMatchObject({scene:'earth',viewKey:'G2',layer:'globe',step:1,selected:'earth',cutaway:false});
    expect(start.props.guide?.targets).toEqual(['earth']);
    expect(start.explanation).toContain('不预先假定已经理解气候差异');
    expect(read(source).audioSha256).toBeTruthy();
  });

  it('follows heard words from the whole globe to continent, country, region and natural plateau',()=>{
    const source=beat('OVERVIEW-position');
    const stops:[string,string,string[]][]=[
      ['先从完整地球','globe',['earth']],
      ['镜头靠近亚洲','asia',['asia']],
      ['再辨认中国','china',['china']],
      ['中国西南的西藏自治区','tibet',['china','tibet']],
      ['青藏高原则是','plateau',['tibet','plateau']],
      ['位置确定以后','surroundings',['tibet','indian-ocean','central-asia']],
    ];
    for(const [token,layer,targets]of stops){
      const actual=sample(source,token),view=overviewPresentation(source,actual.raw,actual.timing);
      expect(view.props).toMatchObject({scene:'earth',viewKey:'G2',layer,step:1,cutaway:false});
      expect(view.props.guide?.targets,token).toEqual(targets);
      expect(view.props.guide?.cueId).toBe(source.recordingId);
      expect(view.props.progress).toBeGreaterThanOrEqual(0);expect(view.props.progress).toBeLessThanOrEqual(1);
    }
  });

  it('returns from global circulation to Asian surroundings before entering the formation cross-section',()=>{
    const source=beat('OVERVIEW-formation-entry'),formation=overviewChapters.find(chapter=>chapter.id==='formation')!;
    expect(formation.beats[0]).toBe(source);expect(formation.beats[1].recordingId).toBe('G3-opening');
    const stops:[string,string,string[]][]=[
      ['位置与全球来流','globe',['earth']],
      ['现在回到亚洲','asia',['asia']],
      ['先把高原','surroundings',['plateau','indian-ocean','himalaya']],
      ['再问这片高地怎样形成','plateau',['plateau']],
      ['看懂原理以后','plateau',['plateau','himalaya']],
    ];
    for(const [token,layer,targets]of stops){
      const actual=sample(source,token),view=overviewPresentation(source,actual.raw,actual.timing);
      expect(view.sceneIdentity).toBe('journey:G2');
      expect(view.props.layer).toBe(layer);expect(view.props.guide?.targets).toEqual(targets);
    }
    expect(source.text).toContain('它不是古代地表的复原');
    expect(source.text).toContain('回到今天的真实高程');
  });

  it('uses the same original words for scale, labels and drawing even if raw points elsewhere',()=>{
    const source=beat('OVERVIEW-position'),actual=sample(source,'青藏高原则是');
    const early=overviewPresentation(source,.01,actual.timing),late=overviewPresentation(source,.99,actual.timing);
    expect(early.props.layer).toBe('plateau');expect(late.props.layer).toBe('plateau');
    expect(early.props.progress).toBe(late.props.progress);
    expect(early.props.guide?.targets).toEqual(late.props.guide?.targets);
    expect(early.props.guide?.drawProgress).toBe(late.props.guide?.drawProgress);
    expect(early.title).toBe(late.title);expect(early.explanation).toBe(late.explanation);
  });

  it('does not change scale before the next source word starts, including its preceding pause',()=>{
    const source=beat('OVERVIEW-position'),timeline=read(source),offset=source.text.indexOf('再辨认中国');
    const nextIndex=timeline.words!.findIndex(word=>word.textEnd>offset),next=timeline.words![nextIndex],previous=timeline.words![nextIndex-1];
    expect(previous).toBeDefined();
    const before=narrationTimingAt(source.text,Math.max(previous.start,next.start-1e-6),timeline.duration,timeline);
    const started=narrationTimingAt(source.text,next.start,timeline.duration,timeline);
    expect(overviewPresentation(source,.99,before).props.layer).toBe('asia');
    expect(overviewPresentation(source,.01,started).props.layer).toBe('china');
  });

  it('reconstructs scale and annotations during reverse native seeks without mutating either script',()=>{
    for(const id of ['OVERVIEW-position','OVERVIEW-formation-entry']){
      const source=beat(id),before=JSON.stringify(source),timeline=read(source),fractions=[0,.2,.5,.8,1];
      const at=(raw:number)=>overviewOrientationPresentation(source,raw,narrationTimingAt(source.text,raw*timeline.duration,timeline.duration,timeline));
      const forward=fractions.map(at);
      expect([...fractions].reverse().map(at).reverse()).toEqual(forward);
      expect(JSON.stringify(source)).toBe(before);
    }
  });

  it('rejects changed scripts and unrelated recordings instead of borrowing positioning word timings',()=>{
    const source=beat('OVERVIEW-position');
    expect(()=>overviewOrientationPresentation({...source,text:`${source.text}未经录制的新话。`},.5)).toThrow('原文不一致');
    const other=overviewNarrationCues.find(cue=>cue.id==='OVERVIEW-culture')!;
    expect(()=>overviewOrientationPresentation({...source,recordingId:other.id,text:other.narration},.5)).toThrow('原文不一致');
  });
});
