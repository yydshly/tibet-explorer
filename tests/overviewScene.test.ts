// @ts-expect-error Test-only filesystem access; the browser has no Node dependency.
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {journeySteps} from '../src/data/journey';
import {overviewBeats} from '../src/data/overviewJourney';
import {overviewPresentation,type OverviewSceneBeat} from '../src/lib/overviewScene';
import {cityAccessAudioSegments} from '../src/lib/cityAccessAudio';
import {cityAccessState} from '../src/lib/cityAccessState';
import {narrationTimingAt,type NarrationTimeline,type NarrationTiming} from '../src/lib/narrationTiming';
import {buildEarthFoundations} from '../src/scene/earthFoundations';
import {buildStoryAtlasScene} from '../src/scene/storyAtlas';
import {cityContinuityPartState} from '../src/lib/cityContinuityState';
import {overviewShot} from '../src/lib/overviewShot';
import {disposeTree} from '../src/scene/environment';
import type {TibetSceneProps} from '../src/scene/sceneTypes';

vi.mock('../src/scene/environment',async original=>({
  ...await original<typeof import('../src/scene/environment')>(),
  label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),
}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
function journey(stepId:string,index:number):OverviewSceneBeat {
  const cue=journeySteps[stepId].cues[index];
  return {id:`overview-${cue.id}`,chapterId:'overview',title:cue.title,recordingId:cue.id,
    text:cue.narration,kind:'journey',stepId,cueIndex:index};
}
function recorded(beat:OverviewSceneBeat,token:string,part=.65) {
  const asset=manifest.clips.find((item:{cueId:string})=>item.cueId===beat.recordingId);
  expect(asset.text).toBe(beat.text);
  const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
  expect(timeline.timingLevel).toBe('word');
  const start=beat.text.indexOf(token);expect(start).toBeGreaterThanOrEqual(0);
  const word=timeline.words!.find(word=>word.textEnd>start)!;
  const time=word.start+(word.end-word.start)*part;
  return {raw:time/timeline.duration,timing:narrationTimingAt(beat.text,time,timeline.duration,timeline)};
}
function atlas():OverviewSceneBeat {
  return {id:'macro-regions',chapterId:'regions',title:'同一高原中的不同地方',
    recordingId:'macro-regions',text:'先看林芝的谷地。再看拉萨的河谷。最后来到阿里高地。',kind:'atlas',topic:'regions',
    moments:[
      {token:'先看林芝',title:'林芝 · 藏东南',explanation:'先读东南山地与谷地。',focus:'nyingchi'},
      {token:'再看拉萨',title:'拉萨 · 南部河谷',explanation:'同一高原上比较河谷位置。',focus:'lhasa'},
      {token:'最后来到',title:'阿里 · 西部高地',explanation:'保留整体，再看西部高地。',focus:'ngari'},
    ]};
}
function timingAtText(text:string,offset:number):NarrationTiming {
  return {caption:text,spokenText:text.slice(offset,offset+1),textStart:0,textEnd:text.length,
    textProgress:offset/text.length,precision:'provider',timingLevel:'word',activeTextStart:offset,activeTextEnd:offset+1};
}
function fullProps(props:ReturnType<typeof overviewPresentation>['props']):TibetSceneProps {
  return {...props,playing:false,resetKey:0,onInteract:()=>{},onSelect:()=>{}};
}

describe('one overview uses the original physical scene and recording clock',()=>{
  it('presents every authored overview beat at start, seek and end without changing its recording identity',()=>{
    expect(overviewBeats.length).toBeGreaterThan(20);
    for(const beat of overviewBeats){
      const original=JSON.stringify(beat);
      for(const raw of [0,.35,.82,1]){
        const view=overviewPresentation(beat,raw);
        expect(view.title.length).toBeGreaterThan(0);
        expect(Number.isFinite(view.props.progress)).toBe(true);
        expect(view.props.progress).toBeGreaterThanOrEqual(0);
        expect(view.props.progress).toBeLessThanOrEqual(1);
        expect(overviewPresentation(beat,raw)).toEqual(view);
      }
      expect(JSON.stringify(beat)).toBe(original);
    }
  });
  it('keeps clips inside their existing factory, and distinguishes model entry scales',()=>{
    expect(overviewPresentation(journey('G1',0),.2).sceneIdentity).toBe(overviewPresentation(journey('G1',2),.7).sceneIdentity);
    for(const [id,scene,step]of [['G1','earth',0],['G2','earth',1],['G3','tectonics',2],['G4','region',3],['C4','atmosphere',3]] as const){
      const p=overviewPresentation(journey(id,0),0);
      expect(p.props).toMatchObject({scene,viewKey:id,step});
      expect(p.sceneIdentity).toBe(`journey:${id}`);
    }
    expect(overviewPresentation(atlas(),0).sceneIdentity).toBe('atlas-overview');
  });

  it('uses real spoken words for country-region-city localization instead of the old raw keyframe',()=>{
    const beat=journey('G2',0),sample=recorded(beat,'拉萨只是其中一座城市');
    const view=overviewPresentation(beat,sample.raw,sample.timing);
    expect(view.props).toMatchObject({layer:'tibet',selected:'lhasa'});
    expect(view.props.guide?.targets).toEqual(['lhasa','tibet']);
    const early=overviewPresentation(beat,0);
    expect(early.props.layer).toBe('globe');
    expect(overviewPresentation(beat,sample.raw,sample.timing)).toEqual(view);
  });

  it('seeks the real DEM reading and the same ground-to-cloud process at their original phrases',()=>{
    const relief=journey('G4',1),sample=recorded(relief,'继续走进高原内部');
    expect(overviewPresentation(relief,sample.raw,sample.timing).props).toMatchObject({
      layer:'relief',readingFraction:(33-25)/13,cutaway:false,
    });
    const cloud=journey('C4',2),rain=recorded(cloud,'才可能有降水到达地面'),vapour=recorded(cloud,'起初气团带着气态水');
    const wet=overviewPresentation(cloud,rain.raw,rain.timing),dry=overviewPresentation(cloud,vapour.raw,vapour.timing);
    expect(wet.props.guide?.targets).toEqual(['cloud-precipitation']);
    expect(wet.props.progress).toBeGreaterThanOrEqual(.62);
    expect(dry.props.progress).toBeLessThan(.4);
    expect(wet.props.viewKey).toBe('C4');
  });

  it('actually expands, lifts and cools the Earth air material, then forms a physical cloud',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));
    const earthMaterial=new THREE.MeshStandardMaterial();
    const model=buildEarthFoundations(3.65,earthMaterial);
    await model.ready;
    const beat=journey('G1',2),find=(kind:string)=>{
      let match:THREE.Object3D|undefined;model.group.traverse(item=>{if(item.userData.kind===kind)match=item;});
      expect(match).toBeDefined();return match!;
    };
    const apply=(token:string)=>{
      const sample=recorded(beat,token),view=overviewPresentation(beat,sample.raw,sample.timing);
      model.update(fullProps(view.props));return view;
    };
    apply('随风移动');
    const air=find('earth-conceptual-moist-air') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
    const cloud=find('earth-conditional-cloud'),start={height:air.position.length(),size:air.scale.x,color:air.material.color.getHex()};
    expect(cloud.visible).toBe(false);
    apply('才可能成云');
    expect(air.position.length()).toBeGreaterThan(start.height);
    expect(air.scale.x).toBeGreaterThan(start.size);
    expect(air.material.color.getHex()).not.toBe(start.color);
    expect(cloud.visible).toBe(true);
    const atCloud={position:air.position.toArray(),color:air.material.color.getHex(),cloudScale:cloud.scale.x};
    apply('随风移动');apply('才可能成云');
    expect({position:air.position.toArray(),color:air.material.color.getHex(),cloudScale:cloud.scale.x}).toEqual(atCloud);
    model.dispose();disposeTree(model.group);earthMaterial.dispose();
  });

  it('maps the exact Lhasa access and bridge recording into its original interval, including end pauses',()=>{
    for(const id of ['ACCESS-lhasa-access','ACCESS-lhasa-transfer','ACCESS-lhasa-life']){
      const segment=cityAccessAudioSegments.find(segment=>segment.id===id)!;
      const beat:OverviewSceneBeat={id,chapterId:'connections',title:id,recordingId:id,text:segment.text,
        kind:'comparison',comparisonStage:'development',segmentId:id};
      for(const raw of [0,.5,1]){
        const view=overviewPresentation(beat,raw);
        expect(view.sceneIdentity).toBe('atlas-local-context');
        expect(view.props).toMatchObject({scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:4,selected:'city:lhasa',overviewLocalContext:true});
        expect(view.props.progress).toBeGreaterThanOrEqual(segment.start);
        expect(view.props.progress).toBeLessThan(segment.end);
        expect(cityAccessState(view.props.progress)).toMatchObject({cityId:'lhasa',phase:id.endsWith('transfer')?'transfer':id.endsWith('life')?'life':'access'});
      }
      if(id.endsWith('transfer')){
        const sample=recorded(beat,'跨河进城'),view=overviewPresentation(beat,sample.raw,sample.timing);
        expect(cityAccessState(view.props.progress).phaseProgress).toBeGreaterThanOrEqual(.15);
        expect(overviewPresentation(beat,sample.raw,sample.timing)).toEqual(view);
      }
    }
  });

  it('changes atlas focus on the heard literal word, returning reversible local display progress',()=>{
    const beat=atlas(),offset=beat.text.indexOf('再看拉萨'),raw=.04;
    const early=overviewPresentation(beat,raw),spoken=overviewPresentation(beat,raw,timingAtText(beat.text,offset+1));
    expect(early.props.selected).toBe('city:nyingchi');
    expect(spoken.props.selected).toBe('city:lhasa');
    expect(spoken.props.overviewFocus).toBe('lhasa');
    expect(spoken.props.progress).toBeGreaterThan(0);
    expect(spoken.props.progress).toBeLessThan(.2);
    expect(raw).toBe(.04);
    expect(overviewPresentation(beat,raw)).toEqual(early);
    const historical={...beat,topic:'history' as const,moments:[{token:'先看林芝',focus:'jokhang-temple',title:'有据地点',explanation:'只定位材料所指地方。',year:'7世纪'}]};
    expect(overviewPresentation(historical,.4).props).toMatchObject({selected:'point:jokhang-temple',overviewTopic:'history',overviewYear:'7世纪'});
    const later={...beat,moments:beat.moments!.slice(1)};
    expect(overviewPresentation(later,0).props.selected).toBe('');
    expect(overviewPresentation(later,0).props.overviewFocus).toBeUndefined();
  });

  it('rejects revised scripts borrowing source word plans and never mutates the source beat',()=>{
    const beat=journey('G2',0),before=JSON.stringify(beat);
    overviewPresentation(beat,.8);
    expect(JSON.stringify(beat)).toBe(before);
    expect(()=>overviewPresentation({...beat,text:`${beat.text}增加未录内容。`},.4)).toThrow('原课程不一致');
    expect(()=>overviewPresentation({...atlas(),moments:[{token:'原文没有',title:'无',explanation:'无'}]},.4)).toThrow('锚点与原文不一致');
  });

  it('keeps one loaded map identity through macro history, three true local readings, return and the complete transport example',async()=>{
    const ids=['OVERVIEW-history-entry','OVERVIEW-history-early','OVERVIEW-history-middle','OVERVIEW-history-modern',
      'OVERVIEW-culture','OVERVIEW-evidence-reading','OVERVIEW-heritage-entry',
      'CONT-history-lhasa-1','OVERVIEW-barkhor-life','CONT-history-lhasa-2','CONT-history-lhasa-3',
      'OVERVIEW-lhasa-urban-change','OVERVIEW-heritage-return','OVERVIEW-connections','ACCESS-lhasa-access','ACCESS-lhasa-transfer','ACCESS-lhasa-life','OVERVIEW-protection','OVERVIEW-lived-city','OVERVIEW-conclusion'];
    const sequence=ids.map(id=>overviewBeats.find(beat=>beat.recordingId===id)!);
    expect(sequence.every(Boolean)).toBe(true);
    const presentations=sequence.map(beat=>overviewPresentation(beat,.7));
    for(const view of presentations){
      // These are the public inputs that keep the ready identity and the
      // runtime's macro-with-local model variant on one loaded factory.
      expect(view.sceneIdentity).toBe('atlas-local-context');
      expect(view.props).toMatchObject({scene:'region',viewKey:'atlas',overviewLocalContext:true});
    }
    const requests:string[]=[];
    vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,loaded)=>{
      const texture=new THREE.Texture<HTMLImageElement>();loaded?.(texture);return texture;
    });
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
      requests.push(String(url));
      const bytes=readFileSync(`public${url}`);
      return {ok:true,json:async()=>JSON.parse(bytes.toString('utf8')),
        arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
    }));
    const camera=new THREE.PerspectiveCamera(43,950/490,.001,300),renderer={
      getSize:(value:THREE.Vector2)=>value.set(950,490),capabilities:{getMaxAnisotropy:()=>8},
    } as unknown as THREE.WebGLRenderer;
    const focusFrames:(string|undefined)[]=[];
    const model=buildStoryAtlasScene({camera,renderer,sun:new THREE.DirectionalLight(),hasSavedView:()=>false,
      focus:(position,target,framing)=>{focusFrames.push(framing);camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();}},
      {localDetails:true,macroOverviewLocal:true,requireElevation:true});
    try{
      const ready=model.ready,group=model.group;
      await ready;
      const objects=(kind:string)=>{const values:THREE.Object3D[]=[];group.traverse(object=>{if(object.userData.kind===kind)values.push(object);});return values;};
      const local=objects('actual-local-geography');
      expect(local.map(object=>object.userData.localityId)).toEqual(['lhasa']);
      expect(local[0].userData.sourceData.features.some((feature:{id:string})=>feature.id==='relation/2358701')).toBe(true);
      expect(local[0].userData.sourceData.features.some((feature:{id:string})=>feature.id==='way/31475419')).toBe(true);
      const regional=objects('sourced-dem')[0] as THREE.Mesh<THREE.BufferGeometry>,fine=objects('actual-local-dem')[0] as THREE.Mesh<THREE.BufferGeometry>;
      const batches=objects('actual-osm-geometry-batch');
      expect(batches.length).toBeGreaterThan(0);
      const acquiredRequests=requests.slice();
      for(let index=0;index<sequence.length;index++){
        const beat=sequence[index],view=presentations[index];
        model.update({...fullProps(view.props),overviewPresentation:true,overviewShot:overviewShot(beat,.7)});
        expect(model.group).toBe(group);expect(model.ready).toBe(ready);
        expect(objects('sourced-dem')[0]).toBe(regional);expect(objects('actual-local-dem')[0]).toBe(fine);
        expect(objects('actual-osm-geometry-batch')).toEqual(batches);
        if(beat.kind==='heritage'){
          expect(group.userData.locality).toBe('lhasa');
          expect(cityContinuityPartState(view.props.progress).cityId).toBe('lhasa');
        }
        const streetReading=objects('barkhor-source-spatial-process')[0];
        if(beat.id==='OVERVIEW-barkhor-life'){
          expect(streetReading.visible).toBe(true);
          expect(streetReading.userData.streetIds).toHaveLength(19);
          expect(objects('retail-context-buildings')).toHaveLength(1);
          expect(objects('acquired-jokhang-plaza')).toHaveLength(1);
          expect(objects('actual-local-feature-focus').every(object=>!object.visible)).toBe(true);
          expect(focusFrames.at(-1)).toBe('recorded');
          const props={...fullProps(view.props),overviewPresentation:true,overviewShot:overviewShot(beat,.7)};
          model.update({...props,overviewBarkhor:{phase:'streets',motion:.1,progress:.1}});
          const calls=focusFrames.length;
          const markers=streetReading.children.find(object=>object instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
          const before=Array.from(markers.instanceMatrix.array);
          model.update({...props,overviewBarkhor:{phase:'streets',motion:.8,progress:.8}});
          expect(focusFrames).toHaveLength(calls);
          expect(Array.from(markers.instanceMatrix.array)).not.toEqual(before);
        }else if(streetReading&&view.props.layer==='atlas-city-comparison'&&!view.props.overviewVisit)expect(streetReading.visible).toBe(false);
        if(beat.id==='OVERVIEW-lived-city'){
          const props={...fullProps(view.props),overviewPresentation:true,overviewShot:overviewShot(beat,.7)};
          const visit=local[0],cars:THREE.Group[]=[];visit.traverse(object=>{if(object.userData.scope==='真实OSM线上的放大交通符号，地表高程非实测轨面'&&object.visible)cars.push(object as THREE.Group);});
          expect(visit.userData.visit.routeId).toBe('lhasa-station-liuwu-jokhang-approach');
          expect(visit.userData.visit.sourceNodeIds.length).toBeGreaterThan(20);
          expect(streetReading.visible).toBe(true);
          const source=JSON.parse(readFileSync('public/data/local-places/transport-corridors.manifest.json','utf8')).routes.find((r:{id:string})=>r.id==='lhasa-station-liuwu-jokhang-approach');
          expect(visit.userData.visit.endpoint).toEqual(source.coordinates.at(-1));
          expect(visit.userData.visit.sourceNodeIds).toEqual(source.sourceNodeIds);
          const positions:number[][]=[];
          for(const motion of [.1,.8,.1]){
            model.update({...props,overviewReturnMix:0,overviewBarkhor:undefined,overviewVisit:{phase:'crossing',progress:motion,motion}});
            const active:THREE.Object3D[]=[];visit.traverse(object=>{if(object.visible&&object.userData.scope==='真实OSM线上的放大交通符号，地表高程非实测轨面')active.push(object);});
            expect(active).toHaveLength(1);positions.push(active[0].position.toArray());
            expect(streetReading.visible).toBe(false);
          }
          expect(positions[0]).not.toEqual(positions[1]);expect(positions[0]).toEqual(positions[2]);
          model.update(props);expect(streetReading.visible).toBe(true);
        }
        if(beat.id==='OVERVIEW-lhasa-urban-change'){
          const props={...fullProps(view.props),overviewPresentation:true,overviewShot:overviewShot(beat,.7)};
          model.update({...props,overviewUrban:{phase:'recent',year:2015,progress:.3,showChange:true}});
          const reading=objects('lhasa-observed-spatial-change')[0];expect(reading.visible).toBe(true);
          expect(reading.userData.visiblePixels).toBe(46420);expect(objects('lhasa-native-wsf-pixels')).toHaveLength(2);
          expect(batches.filter(b=>['road','building','railway','landuse'].includes(b.userData.featureClass)).every(b=>!b.visible)).toBe(true);
          const frame=focusFrames.length;
          const position=camera.position.clone(),windowGeometry=(objects('lhasa-observation-window')[0] as THREE.Line).geometry;
          for(const [year,count] of [[1985,20277],[2000,37403],[2015,46420]]){
            model.update({...props,overviewUrban:{phase:'recent',year,progress:.3,showChange:true}});
            expect(reading.userData.visiblePixels).toBe(count);
            expect(camera.position.equals(position)).toBe(true);expect(focusFrames).toHaveLength(frame);
            expect((objects('lhasa-observation-window')[0] as THREE.Line).geometry).toBe(windowGeometry);
          }
          model.update({...props,overviewUrban:{phase:'recent',year:2015,progress:.8,showChange:false}});
          expect(reading.userData.visiblePixels).toBe(20277);expect(focusFrames).toHaveLength(frame);
          model.update({...props,overviewUrban:{phase:'plaza',year:2005,progress:1,showChange:true}});
          expect(reading.visible).toBe(false);expect(batches.every(b=>b.visible)).toBe(true);
          expect(objects('actual-local-same-use-objects').every(object=>!object.visible)).toBe(true);
        }
        expect(requests).toEqual(acquiredRequests);
      }
      expect(group.userData.locality).toBeUndefined();
      expect(objects('actual-local-geography')).toEqual(local);
      expect(requests.filter(url=>/^\/data\/local-places\/(?:lulang|shiquanhe)\.geojson$/.test(url))).toEqual([]);
    }finally{model.dispose();disposeTree(model.group);}
  });
});
