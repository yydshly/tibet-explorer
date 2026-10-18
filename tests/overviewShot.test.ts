// @ts-expect-error Test-only filesystem access; the browser never imports Node.
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {overviewBeats} from '../src/data/overviewJourney';
import {overviewNarrationCues} from '../src/data/overviewNarration';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {cityAccessAudioSegments} from '../src/lib/cityAccessAudio';
import {atlasHotspots} from '../src/data/atlas';
import {regionalAnchors} from '../src/data/regionalStudy';
import {overviewShot,type OverviewShotBeat} from '../src/lib/overviewShot';
import {narrationTimingAt,type NarrationTiming,type NarrationTimeline} from '../src/lib/narrationTiming';

const candidates:OverviewShotBeat[]=[
  ...overviewBeats,
  ...overviewNarrationCues.map(cue=>({recordingId:cue.id,text:cue.narration,
    kind:cue.id==='OVERVIEW-position'||cue.id==='OVERVIEW-formation-entry'?'orientation' as const:'atlas' as const})),
  ...cityContinuityLessons.history.lhasa.map(cue=>({recordingId:cue.id,text:cue.narration,kind:'heritage' as const})),
  ...cityAccessAudioSegments.filter(cue=>cue.id.startsWith('ACCESS-lhasa-')).map(cue=>({recordingId:cue.id,text:cue.text,kind:'comparison' as const})),
];
const beats=[...new Map(candidates.map(beat=>[beat.recordingId,beat])).values()];
const get=(id:string)=>{const beat=beats.find(item=>item.recordingId===id);if(!beat)throw new Error(`Missing source ${id}`);return beat;};
const nativeText=(beat:OverviewShotBeat,position:number):NarrationTiming=>({
  caption:beat.text,spokenText:beat.text.slice(position,position+1),textStart:0,textEnd:beat.text.length,
  textProgress:position/beat.text.length,precision:'provider',timingLevel:'word',
  activeTextStart:position,activeTextEnd:position+1,
});
const at=(id:string,token:string,after=0)=>{
  const beat=get(id),position=beat.text.indexOf(token)+after;
  expect(beat.text.indexOf(token)).toBeGreaterThanOrEqual(0);
  return overviewShot(beat,.99,nativeText(beat,position));
};

describe('one continuous overview camera and reading plan',()=>{
  it('has valid literal anchors against every current source and reconstructs reverse seeks',()=>{
    for(const beat of beats){
      const original=JSON.stringify(beat);
      const positions=[0,.11,.35,.63,.84,1];
      const forward=positions.map(raw=>overviewShot(beat,raw));
      expect([...positions].reverse().map(raw=>overviewShot(beat,raw)).reverse()).toEqual(forward);
      expect(JSON.stringify(beat)).toBe(original);
      for(const shot of forward){
        expect(shot.amount).toBeGreaterThanOrEqual(0);
        expect(shot.amount).toBeLessThanOrEqual(.28);
        expect(shot.cameraMix).toBeGreaterThanOrEqual(0);
        expect(shot.cameraMix).toBeLessThanOrEqual(1);
        expect(shot.clock).toBe('recording-text');
        expect(shot.manualPolicy).toBe('pause-and-hold');
        expect(shot.title.length).toBeGreaterThan(0);
        expect(shot.purpose.length).toBeGreaterThan(0);
      }
    }
  });

  it('frames only existing source locations and supplies no historical geometry or new route',()=>{
    const known=new Set([...atlasHotspots,...regionalAnchors].map(item=>item.id));
    for(const beat of beats)for(let offset=0;offset<=beat.text.length;offset++){
      const shot=overviewShot(beat,0,nativeText(beat,offset));
      for(const camera of [shot.cameraFrom,shot.cameraTo])for(const focus of camera.focusIds)expect(known.has(focus),focus).toBe(true);
      expect(shot).not.toHaveProperty('coordinates');
      expect(shot).not.toHaveProperty('route');
      expect(shot).not.toHaveProperty('year');
    }
  });

  it('keeps existing globe, physical-process and true local cameras in source ownership',()=>{
    for(const beat of beats){
      if(beat.kind==='atlas')expect(overviewShot(beat,.5).cameraMode).toBe('atlas');
      else expect(overviewShot(beat,.5).cameraMode).toBe('source');
    }
    for(const id of ['CONT-history-lhasa-1','CONT-history-lhasa-2','CONT-history-lhasa-3','ACCESS-lhasa-access','ACCESS-lhasa-transfer','ACCESS-lhasa-life']){
      expect(overviewShot(get(id),.7).cameraMode).toBe('source');
    }
  });

  it('introduces new scales before the formation and local heritage examples',()=>{
    expect(at('OVERVIEW-formation-entry','现在回到亚洲').phase).toBe('context');
    expect(at('OVERVIEW-formation-entry','接下来的剖面').phase).toBe('evidence');
    expect(at('OVERVIEW-heritage-entry','先在全图确认它所在的河谷').cameraTo.focusIds).toEqual(['lhasa']);
    expect(at('OVERVIEW-heritage-entry','再沿今天的真实地图').cameraTo.focusIds).toEqual(['lhasa-buildings']);
    expect(at('OVERVIEW-heritage-return','再回到西藏全域').cameraTo).toEqual({focusIds:[],amount:0});
  });

  it('uses at most one evidence camera per macro historical recording, with a full-map exit',()=>{
    for(const id of ['OVERVIEW-history-early','OVERVIEW-history-middle','OVERVIEW-history-modern']){
      const beat=get(id),evidenceIds=new Set<string>();
      for(let offset=0;offset<beat.text.length;offset++){
        const shot=overviewShot(beat,0,nativeText(beat,offset));
        if(shot.phase==='evidence')evidenceIds.add(shot.id);
      }
      expect(evidenceIds.size).toBe(1);
      const ending=overviewShot(beat,1);
      expect(ending.phase).toBe('return');
      expect(ending.amount).toBe(0);
      expect(ending.cameraTo.focusIds).toEqual([]);
    }
    // Do not chase every political date. In particular a Beijing agreement
    // cannot acquire a Lhasa/Gyantse camera focus from the preceding event.
    for(const token of ['一九〇四年','一九五一年','一九五九年','一九六五年']){
      const shot=at('OVERVIEW-history-modern',token);
      expect(shot.cameraTo.focusIds).toEqual([]);
      expect(shot.amount).toBe(0);
    }
  });

  it('returns cultural transmission to the whole instead of leaving it pinned on Tholing',()=>{
    const learning=at('OVERVIEW-culture','学习与翻译');
    expect(learning.phase).toBe('evidence');
    expect(learning.cameraTo.focusIds).toEqual(['lhasa-buildings','tholing-culture']);
    const broad=at('OVERVIEW-culture','拉萨建筑、托林交流和地方传习');
    expect(broad.phase).toBe('return');
    expect(broad.cameraTo.focusIds).toEqual([]);
    expect(overviewShot(get('OVERVIEW-culture'),1).amount).toBe(0);
  });

  it('moves continuously from the previous frame using the original spoken interval',()=>{
    const beat=get('OVERVIEW-history-early'),position=beat.text.indexOf('唐蕃会盟碑');
    const before=overviewShot(beat,0,nativeText(beat,position-1e-7));
    const start=overviewShot(beat,0,nativeText(beat,position));
    expect(start.phase).toBe('evidence');
    expect(start.cameraMix).toBe(0);
    expect(start.cameraFrom).toEqual(before.cameraTo);
    expect(start.amount).toBeCloseTo(before.amount,7);
    const later=overviewShot(beat,0,nativeText(beat,position+5));
    expect(later.amount).toBeGreaterThan(start.amount);
    expect(overviewShot(beat,0,nativeText(beat,position+5))).toEqual(later);
  });

  it('follows actual MiniMax words even when raw fraction points somewhere else',()=>{
    const beat=get('OVERVIEW-history-middle');
    const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
    const asset=manifest.clips.find((clip:{cueId:string})=>clip.cueId===beat.recordingId);
    expect(asset.text).toBe(beat.text);
    const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
    const position=beat.text.indexOf('阿底峡在一〇四二年');
    const word=timeline.words!.find(item=>item.textEnd>position)!;
    const timing=narrationTimingAt(beat.text,word.start+(word.end-word.start)*.5,timeline.duration,timeline);
    const shot=overviewShot(beat,.99,timing);
    expect(shot.phase).toBe('evidence');
    expect(shot.cameraTo.focusIds).toEqual(['tholing-exchange']);
    expect(shot.timing).toBe('native-words');
    expect(overviewShot(beat,.01,timing)).toEqual(shot);
  });

  it('keeps provider gaps before the next literal token on the earlier shot',()=>{
    const beat=get('OVERVIEW-history-middle');
    const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
    const asset=manifest.clips.find((clip:{cueId:string})=>clip.cueId===beat.recordingId);
    const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
    const position=beat.text.indexOf('十三至十四世纪');
    const nextIndex=timeline.words!.findIndex(item=>item.textEnd>position),previous=timeline.words![nextIndex-1],next=timeline.words![nextIndex];
    expect(next.start).toBeGreaterThanOrEqual(previous.end);
    const timing=narrationTimingAt(beat.text,Math.max(previous.end,next.start-1e-7),timeline.duration,timeline);
    expect(overviewShot(beat,.99,timing).phase).toBe('evidence');
    const started=narrationTimingAt(beat.text,next.start,timeline.duration,timeline);
    expect(overviewShot(beat,.01,started).phase).toBe('return');
  });

  it('fails a changed or ambiguous authored recording rather than using a stale semantic plan',()=>{
    const beat=get('OVERVIEW-history-early');
    expect(()=>overviewShot({...beat,text:beat.text.replace('唐蕃会盟碑','碑刻')},.5)).toThrow('锚点与原录音不一致');
    expect(()=>overviewShot({...beat,text:`${beat.text}唐蕃会盟碑`},.5)).toThrow('锚点与原录音不一致');
  });

  it('keeps unknown recordings safely on the whole and sanitizes invalid fallback fractions',()=>{
    const beat:OverviewShotBeat={recordingId:'future-explicit-script',text:'先把全图留在眼前。',kind:'atlas'};
    const start=overviewShot(beat,0);
    expect(start.cameraTo).toEqual({focusIds:[],amount:0});
    expect(start.phase).toBe('whole');
    expect(overviewShot(beat,Number.NaN)).toEqual(start);
    expect(overviewShot(beat,-3)).toEqual(start);
    expect(overviewShot(beat,3).textProgress).toBe(1);
    expect(overviewShot(beat,.5,{...nativeText(beat,0),textProgress:Number.NaN}).textProgress).toBe(.5);
  });
});
