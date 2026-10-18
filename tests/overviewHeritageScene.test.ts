// @ts-expect-error Test-only filesystem access; the browser has no Node dependency.
import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {cityContinuityLessons} from '../src/data/cityContinuityLessons';
import {overviewNarrationCues} from '../src/data/overviewNarration';
import {cityContinuityAudioSegments} from '../src/lib/cityContinuityAudio';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {overviewHeritageLessons,overviewHeritageRecordingIds,isOverviewHeritageRecording,overviewHeritagePresentation,overviewHeritageReturnPresentation} from '../src/lib/overviewHeritageScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import {cityLocalUsageState} from '../src/scene/cityLocalContinuity';
import {buildCityLocalMap} from '../src/scene/cityLocalMap';
import {storyAtlasPosition,STORY_ATLAS_META} from '../src/scene/storyAtlas';

vi.mock('../src/scene/environment',async original=>({
  ...await original<typeof import('../src/scene/environment')>(),
  label:(text:string)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;},
}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const segments=cityContinuityAudioSegments('history');
const beat=(index:number)=>{
  const part=overviewHeritageLessons[index];
  return {id:`overview-${part.id}`,title:part.title,recordingId:part.id,text:part.narration};
};
function recorded(index:number,token:string){
  const source=beat(index),asset=manifest.clips.find((item:{cueId:string})=>item.cueId===source.recordingId);
  expect(asset.text).toBe(source.text);
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(timeline.timingLevel).toBe('word');
  const offset=source.text.indexOf(token);expect(offset).toBeGreaterThanOrEqual(0);
  const word=timeline.words!.find(item=>item.textEnd>offset)!;
  const time=word.start+(word.end-word.start)*.65;
  return {raw:time/timeline.duration,timing:narrationTimingAt(source.text,time,timeline.duration,timeline)};
}
function find(root:THREE.Object3D,kind:string){
  const found:THREE.Object3D[]=[];root.traverse(item=>{if(item.userData.kind===kind)found.push(item);});return found;
}
function returnBeat(){
  const cue=overviewNarrationCues.find(item=>item.id==='OVERVIEW-heritage-return')!;
  return {id:`overview-${cue.id}`,title:cue.title,recordingId:cue.id,text:cue.narration};
}
function returnSample(token:string){
  const source=returnBeat(),asset=manifest.clips.find((item:{cueId:string})=>item.cueId===source.recordingId);
  expect(asset.text).toBe(source.text);
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(timeline.timingLevel).toBe('word');
  const offset=source.text.indexOf(token);expect(offset).toBeGreaterThanOrEqual(0);
  const word=timeline.words!.find(item=>item.textEnd>offset)!;
  const time=word.start+(word.end-word.start)*.65;
  return {raw:time/timeline.duration,timing:narrationTimingAt(source.text,time,timeline.duration,timeline)};
}

describe('overview historical place example uses the same true map and exact existing recordings',()=>{
  it('exposes only the three Lhasa source clips with their unmodified scripts and dated sources',()=>{
    expect(overviewHeritageLessons).toBe(cityContinuityLessons.history.lhasa);
    expect(overviewHeritageRecordingIds).toEqual(['CONT-history-lhasa-1','CONT-history-lhasa-2','CONT-history-lhasa-3']);
    for(const id of overviewHeritageRecordingIds)expect(isOverviewHeritageRecording(id)).toBe(true);
    expect(isOverviewHeritageRecording('CONT-history-ngari-1')).toBe(false);
    expect(isOverviewHeritageRecording('OVERVIEW-culture')).toBe(false);
    for(const part of overviewHeritageLessons){
      expect(part.sourceIds).toContain('city-local-osm-2026');
      expect(part.sourceIds).toContain('city-life-lhasa-heritage');
      expect(manifest.clips.find((clip:{cueId:string})=>clip.cueId===part.id).text).toBe(part.narration);
    }
  });

  it('keeps start, end pause and reversible seeks within each original Lhasa history part',()=>{
    for(let index=0;index<3;index++){
      const source=beat(index),before=JSON.stringify(source),segment=segments.find(item=>item.id===source.recordingId)!;
      for(const raw of [0,.57,1,.12]){
        const presentation=overviewHeritagePresentation(source,raw),state=cityContinuityPartState(presentation.props.progress);
        expect(presentation.sceneIdentity).toBe('atlas-comparison');
        expect(presentation.props).toMatchObject({scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:3,selected:'city:lhasa',cityBuiltLayer:false});
        expect(state).toMatchObject({cityId:'lhasa',index});
        expect(presentation.props.progress).toBeGreaterThanOrEqual(segment.start);
        expect(presentation.props.progress).toBeLessThan(segment.end);
        expect(overviewHeritagePresentation(source,raw)).toEqual(presentation);
      }
      expect(JSON.stringify(source)).toBe(before);
    }
  });

  it('moves the actual local-use mechanism when the original literal words are heard',()=>{
    for(const [index,token]of [[0,'承担宗教用途'],[1,'礼仪、接见与居住'],[2,'包含灵塔和宗教活动空间']] as const){
      const sample=recorded(index,token),presentation=overviewHeritagePresentation(beat(index),sample.raw,sample.timing);
      const state=cityLocalUsageState(presentation.props,'lhasa');
      expect(state.useReading).toBe(true);
      expect(state.beat).toBe('use');
      expect(state.use).toBeGreaterThan(0);
      expect(presentation.explanation).toMatch(index===0?/宗教用途/:index===1?/礼仪、接见与居住/:/灵塔和宗教活动/);
      expect(presentation.year).toBe(['7世纪','1645—1648年','1690—1694年'][index]);
      expect(overviewHeritagePresentation(beat(index),sample.raw,sample.timing)).toEqual(presentation);
    }
  });

  it('rejects rewritten text or mismatched source segments instead of borrowing their native word plan',()=>{
    const original=beat(0);
    expect(()=>overviewHeritagePresentation({...original,text:`${original.text}新增未录的解释。`},.4)).toThrow('原段不一致');
    expect(()=>overviewHeritagePresentation({...original,segmentId:beat(1).recordingId},.4)).toThrow('原段不一致');
    expect(()=>overviewHeritagePresentation({...original,recordingId:'CONT-history-ngari-1'},.4)).toThrow('原段不一致');
  });

  it('returns along the new native words, holds the completed Red Palace reading and clears its former date',()=>{
    const source=returnBeat(),start=overviewHeritageReturnPresentation(source,0),middle=returnSample('拉萨河谷'),whole=returnSample('刚才看到');
    expect(start.props).toMatchObject({layer:'atlas-city-comparison',step:3,overviewReturnMix:0,selected:'city:lhasa',overviewTopic:'culture'});
    const inFlight=overviewHeritageReturnPresentation(source,.97,middle.timing);
    expect(inFlight.props.overviewReturnMix).toBeGreaterThan(0);expect(inFlight.props.overviewReturnMix).toBeLessThan(1);
    expect(inFlight.props.layer).toBe('atlas-city-comparison');
    expect(inFlight.props.progress).toBe(start.props.progress);
    expect(cityContinuityPartState(inFlight.props.progress)).toMatchObject({cityId:'lhasa',index:2});
    const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===beat(2).recordingId),timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
    const nativeEnd=overviewHeritagePresentation(beat(2),1,narrationTimingAt(beat(2).text,timeline.duration,timeline.duration,timeline));
    expect(inFlight.props.progress).toBeCloseTo(nativeEnd.props.progress,12);
    const arrived=overviewHeritageReturnPresentation(source,.02,whole.timing);
    expect(arrived.props).toMatchObject({layer:'atlas-overview',step:0,overviewReturnMix:1,selected:'',overviewTopic:'culture'});
    for(const presentation of [start,inFlight,arrived]){
      expect(presentation.year).toBeUndefined();expect(presentation.props.overviewYear).toBeUndefined();expect(presentation.props.overviewFocus).toBeUndefined();
      expect(presentation.sceneIdentity).toBe('atlas-comparison');
    }
    expect(overviewHeritageReturnPresentation(source,.97,middle.timing)).toEqual(inFlight);
    expect(overviewHeritageReturnPresentation(source,0)).toEqual(start);
    expect(()=>overviewHeritageReturnPresentation({...source,text:`${source.text}未录音的句子。`},0)).toThrow('原段不一致');
    expect(()=>overviewHeritageReturnPresentation({...source,recordingId:beat(2).recordingId},0)).toThrow('原段不一致');
  });

  it('activates the real acquired Jokhang and Potala footprints, keeps one Potala geometry for both uses, then releases the local view for the whole map',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
      try{const bytes=readFileSync(`public${url}`);return {ok:true,json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}
      catch{return {ok:false};}
    }));
    const camera=new THREE.PerspectiveCamera(43,950/490,.00001,300),size=new THREE.Vector2(950,490);
    let lastFocusPosition:THREE.Vector3|undefined,lastFocusTarget:THREE.Vector3|undefined;
    const model=buildCityLocalMap({camera,project:storyAtlasPosition,
      metresPerUnit:(STORY_ATLAS_META.east-STORY_ATLAS_META.west)*111320*Math.cos(29.5*Math.PI/180)/STORY_ATLAS_META.width,
      focus:(position,target)=>{lastFocusPosition=position;lastFocusTarget=target;camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();}});
    await model.ready;
    let potalaId:string|undefined,potalaGeometry:string|undefined;
    for(const [index,token]of [[0,'承担宗教用途'],[1,'礼仪、接见与居住'],[2,'包含灵塔和宗教活动空间']] as const){
      const sample=recorded(index,token),presentation=overviewHeritagePresentation(beat(index),sample.raw,sample.timing);
      model.update({...presentation.props,playing:false,overviewPresentation:true,resetKey:0,onInteract:()=>{},onSelect:()=>{}},size);
      const place=model.active()!;expect(place.id).toBe('lhasa');
      const frame=model.group.userData.cameraFrame;
      expect(frame.position.equals(lastFocusPosition!)).toBe(true);expect(frame.target.equals(lastFocusTarget!)).toBe(true);
      expect(frame.position).not.toBe(lastFocusPosition);expect(frame.target).not.toBe(lastFocusTarget);
      expect(frame.position.distanceTo(frame.target)).toBeCloseTo(frame.distance,12);
      expect(frame.screenArea).toEqual({left:0,right:950,top:60,bottom:365});expect(frame.bbox).toEqual(place.data.metadata.bbox);
      const use=find(place.group,'same-real-local-use-object').find(item=>item.visible)!;
      expect(use.userData.featureId).toBe(index===0?'relation/2358701':'way/31475419');
      expect(place.group.userData.event.historicalGeometryChanged).toBe(false);
      const geometry=(use.children[0] as THREE.Mesh).geometry.attributes.position.array;
      if(index===1){potalaId=use.uuid;potalaGeometry=JSON.stringify(Array.from(geometry));}
      if(index===2){expect(use.uuid).toBe(potalaId);expect(JSON.stringify(Array.from(geometry))).toBe(potalaGeometry);}
    }
    model.update({scene:'region',viewKey:'atlas',layer:'atlas-overview',step:0,season:1,progress:0,selected:'',cutaway:false,playing:false,overviewPresentation:true,resetKey:0,onInteract:()=>{},onSelect:()=>{}},size);
    expect(model.active()).toBeUndefined();
    expect(model.group.visible).toBe(false);
    model.dispose();
  });
});
