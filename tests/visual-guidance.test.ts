import {journeyMotionProgress} from '../src/lib/journeyMotion';
// @ts-expect-error Vitest has Node filesystem access; the product does not add Node typings.
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { journeySteps } from '../src/data/journey';
import type {JourneyCue} from '../src/data/journey';
import {narrationPhraseBindings} from '../src/lib/narrationPhraseGuide';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import { visualGuideForCue, visualGuidePlans } from '../src/data/visualGuidance';
import { buildLivingLandscapeScene } from '../src/scene/livingLandscape';
import { buildLandformProcessScene } from '../src/scene/landformProcess';
import { buildCourtyardScene } from '../src/scene/culture';
import {buildPalaceStudyScene} from '../src/scene/palaceStudy';
import { buildHistoryInquiryScene } from '../src/scene/historyInquiry';
import { buildConnectionProcessesScene } from '../src/scene/connectionProcesses';
import { buildRailwayEngineeringScene } from '../src/scene/railwayEngineering';
import { buildDevelopmentSystemsScene } from '../src/scene/developmentSystems';
import { buildTravelUnderstandingScene } from '../src/scene/travelUnderstandingScene';
import { disposeTree } from '../src/scene/environment';
import { defaultSettings } from '../src/lib/store';
import type { SceneSettings } from '../src/lib/store';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});

const recordingManifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const recordings=new Map<string,NarrationTimeline>();
function recordedGuide(cue:JourneyCue,textFraction:number){
 let timeline=recordings.get(cue.id);
 if(!timeline){const asset=recordingManifest.clips.find((clip:{cueId:string;text:string})=>clip.cueId===cue.id);expect(asset.text).toBe(cue.narration);timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;expect(timeline.timingLevel).toBe('word');recordings.set(cue.id,timeline);}
 const position=Math.max(0,Math.min(1,textFraction))*cue.narration.length;
 const word=timeline.words!.find(word=>word.textEnd>position)??timeline.words!.at(-1)!;
 const part=Math.max(0,Math.min(1,(position-word.textStart)/(word.textEnd-word.textStart)));
 const preceding=timeline.words!.filter(candidate=>candidate.textEnd<=position).at(-1);
 // Omitted silent punctuation has no new spoken clock position. Sample the
 // actual following pause, retaining the preceding word, rather than jumping
 // forward to the next phrase solely to fill that text-only range.
 const seconds=textFraction>=1?timeline.duration:word.textStart>position&&preceding
  ?word.start>preceding.end?(word.start+preceding.end)/2:Math.max(preceding.start,preceding.end-1e-8)
  :word.start+(word.end-word.start)*part;
 const timing=narrationTimingAt(cue.narration,seconds,timeline.duration,timeline);
 return {guide:visualGuideForCue(cue.id,seconds/timeline.duration,true,timing)!,rawProgress:seconds/timeline.duration};
}
/** Replay the same cue-entry, once-per-phrase setting patches and actual
 * recording-clock progress used by useJourneyDirector. Earlier phrase patches
 * matter: a later phrase can retain a layer without redundantly authoring it. */
function semanticState(cue:JourneyCue,entry:SceneSettings,textFraction:number){
 let current={...entry,...cue.settings,...(cue.motion?{progress:cue.motion.from}:{})};
 const phrases=narrationPhraseBindings(cue.id,cue.narration);
 for(const [index,phrase]of phrases.entries()){
  if(phrase.at>textFraction)break;
  const end=phrases[index+1]?.at??1,at=textFraction<end?textFraction:Math.max(phrase.at,end-1e-10);
  const {guide,rawProgress}=recordedGuide(cue,at);
  if(guide.sceneProgress!==undefined)current.progress=guide.sceneProgress;
  else if(cue.motion)current.progress=journeyMotionProgress(cue.motion,rawProgress);
  if(guide.sceneSettings)current={...current,...guide.sceneSettings};
  else for(const frame of cue.keyframes??[])if(frame.at<=rawProgress)current={...current,...frame.settings};
 }
 const {guide}=recordedGuide(cue,textFraction);
 return {current,guide};
}
function visiblePhysical(object:THREE.Object3D){
 for(let parent:THREE.Object3D|null=object;parent;parent=parent.parent)if(!parent.visible||parent.userData.screenAnnotation||parent instanceof THREE.Sprite)return false;
 let physical=false;
 object.traverse(child=>{
  for(let parent:THREE.Object3D|null=child;parent&&parent!==object;parent=parent.parent)if(!parent.visible||parent.userData.screenAnnotation||parent instanceof THREE.Sprite)return;
  const rendered=child as THREE.Mesh;
  if(!rendered.geometry?.attributes.position?.count||rendered.geometry.drawRange.count===0||child instanceof THREE.Sprite)return;
  if(child instanceof THREE.InstancedMesh&&child.count===0)return;
  const materials=Array.isArray(rendered.material)?rendered.material:[rendered.material];
  if(materials.some(material=>material?.visible&&(!material.transparent||material.opacity>.015)))physical=true;
 });
 return physical;
}
const phrase=(cueId:string,token:string)=>visualGuidePlans[cueId].find(beat=>'token'in beat&&beat.token===token)!;

describe('讲述、文字与场景标记使用同一个可回退进度', () => {
  it('全部145段按原录音文字展开，短语范围有序完整且对象与解释明确', () => {
    const cues = Object.values(journeySteps).flatMap(step => step.cues);
    expect(cues).toHaveLength(145);
    expect(Object.keys(visualGuidePlans).sort()).toEqual(cues.map(cue => cue.id).sort());
    for (const cue of cues) {
      const beats = visualGuidePlans[cue.id];
      expect(beats.length).toBeGreaterThanOrEqual(2);
      const literals=narrationPhraseBindings(cue.id,cue.narration);
      if(literals.length){expect(beats).toHaveLength(literals.length);expect(literals[0].textStart).toBe(0);expect(literals.at(-1)!.textEnd).toBe(cue.narration.length);}
      expect(beats.length).toBeLessThanOrEqual(13);
      expect(beats[0].at).toBe(0);
      beats.forEach((beat, index) => {
        expect(beat.at).toBeLessThan(1);
        if (index) expect(beat.at).toBeGreaterThan(beats[index - 1].at);
        expect(beat.targets.length).toBeGreaterThan(0);
        expect(beat.title.length).toBeGreaterThan(3);
        expect(beat.explanation.length, `${cue.id}: ${beat.title}`).toBeGreaterThanOrEqual(10);
      });
    }
  });

  it('地球入口逐层定位；行政范围与自然范围明确使用不同对象', () => {
    const locate = visualGuidePlans['G2-opening'];
    expect(locate.slice(0,4).map(beat => beat.targets)).toEqual([['earth'], ['asia'], ['china'], ['china', 'tibet']]);
    expect(locate[3].relation).toBe('compare');
    const scope = visualGuidePlans['G2-bridge'];
    expect(scope[0]).toMatchObject({ targets: ['plateau', 'tibet'], relation: 'compare' });
    expect(visualGuidePlans['G2-explain'][0].targets).toContain('indian-ocean');
    expect(visualGuidePlans['G2-explain'].some(beat=>beat.targets.includes('central-asia'))).toBe(true);
    expect(visualGuidePlans['G1-opening'][0].targets).toEqual(['earth']);
    expect(new Set(visualGuidePlans['G1-opening'].flatMap(beat => beat.targets))).toEqual(new Set(['earth','earth-ocean','earth-land','earth-air','earth-ice','earth-vegetation','earth-vapour']));
    expect(new Set(visualGuidePlans['G1-bridge'].flatMap(beat => beat.targets))).toEqual(new Set(['compare-equator','compare-desert','compare-plateau']));
  });

  it('在片段边界切换文字与对象，并从起点重新画线', () => {
    const cue = 'C5-explain', beats = visualGuidePlans[cue],beat=beats.find(beat=>beat.targets.includes('cloud-condense'))!,boundary = beat.at;
    expect(visualGuideForCue(cue, boundary - .00001)?.targets).toEqual(['cloud-lift']);
    const next = visualGuideForCue(cue, boundary)!;
    expect(next.targets).toEqual(['cloud-condense']);
    expect(next.title).toBe(beat.title);
    expect(next.drawProgress).toBe(0);
    expect(visualGuideForCue(cue, .9)?.targets).toEqual(['cloud-runoff']);
  });

  it('画线前 65% 完成，后段保留完整标记供阅读', () => {
    const beats = visualGuidePlans['G3-explain'];
    const start = beats[1].at, end = beats[2].at;
    expect(visualGuideForCue('G3-explain', start + (end - start) * .325)?.drawProgress).toBeCloseTo(.5);
    expect(visualGuideForCue('G3-explain', start + (end - start) * .8)?.drawProgress).toBe(1);
  });

  it('暂停、重播、回退均可重复得到同一标注状态，不依赖墙钟', () => {
    const a = visualGuideForCue('C4-uplift', .57)!;
    visualGuideForCue('C4-uplift', .95);
    const repeated = visualGuideForCue('C4-uplift', .57)!;
    expect(repeated).toEqual(a);
    const paused = visualGuideForCue('C4-uplift', .57, false)!;
    expect(paused).toEqual({ ...a, active: false });
    expect(paused.title).toBeTruthy();
    expect(paused.explanation).toBeTruthy();
    const replay = visualGuideForCue('C4-uplift', 0)!;
    expect(replay.beatId).not.toBe(a.beatId);
    expect(replay.drawProgress).toBe(0);
  });

  it('非法或越界进度安全归一化，未知 cue 不误用别段的标记', () => {
    expect(visualGuideForCue('unknown-cue', .5)).toBeUndefined();
    expect(visualGuideForCue('G1-opening', -.4)?.progress).toBe(0);
    expect(visualGuideForCue('G1-opening', Number.NaN)?.progress).toBe(0);
    expect(visualGuideForCue('G1-opening', -Infinity)?.progress).toBe(0);
    expect(visualGuideForCue('G1-opening', Infinity)?.progress).toBe(1);
    expect(visualGuideForCue('G1-opening', 2)?.drawProgress).toBe(1);
  });

  it('物理、文化与现代段落连接真实已有部位或明确的概念条件对象', () => {
    expect(phrase('C2-explain','吸收以后').targets).toEqual(['energy-surface']);
    expect(phrase('C2-explain','空气热交换和蒸发').targets).toEqual(['energy-atmosphere']);
    expect(phrase('C2-explain','既向外，也向地表交换').targets).toEqual(['energy-space','energy-atmosphere']);
    expect(phrase('K1-explain','白宫的仪典').targets).toEqual(['palace-white']);
    expect(phrase('K1-explain','和偏西、更高处的红宫').targets).toEqual(['palace-red']);
    expect(phrase('M1-explain','块石保留空隙').targets).toEqual(['rail-rock']);
    expect(phrase('M1-explain','寒季外界比地基冷时').targets).toEqual(['rail-air']);
    expect(phrase('M3-explain','保护实物的作用').targets).toEqual(['development-benefit']);
    expect(phrase('M3-explain','与视线、历史环境的代价').targets).toEqual(['development-sightline','development-ecology']);
  });

  it('历史连线区分事件与材料；湖泊案例只定位研究区而不补造湖岸', () => {
    expect(visualGuidePlans['H3-opening'][0].targets).toEqual(['history-event']);
    expect(phrase('H3-opening','时间卡表示事件').targets).toEqual(['history-event','history-stele-body']);
    const lakeTargets = Object.entries(visualGuidePlans)
      .filter(([cue]) => cue.startsWith('C9-'))
      .flatMap(([, beats]) => beats.flatMap(beat => beat.targets));
    expect(new Set(lakeTargets)).toEqual(new Set(['atlas:siling-co-study']));
    const expected=visualGuideForCue('H3-opening', .8)!.targets;
    const state = visualGuideForCue('H3-opening', .8)!;
    state.targets.push('modified');
    expect(visualGuideForCue('H3-opening', .8)?.targets).toEqual(expected);
  });

  it('不会在未展开的过程或季节层强调隐藏的对象', () => {
    for (const [cue, beats] of Object.entries(visualGuidePlans)) {
      if (cue.startsWith('C7-')) expect(beats.flatMap(beat => beat.targets).every(target=>['climate-surface','terrain-snow','terrain-surface'].includes(target))).toBe(true);
      if (/^P1-/.test(cue)) expect(beats.flatMap(beat => beat.targets).every(target => target.startsWith('local-'))).toBe(true);
      if (/^P2-/.test(cue)) expect(beats.flatMap(beat => beat.targets).every(target => target.startsWith('landform-'))).toBe(true);
      if (/^P3-/.test(cue)) expect(beats.flatMap(beat => beat.targets).every(target => target.startsWith('living-'))).toBe(true);
    }
    expect(visualGuidePlans['C5-explain'].find(beat=>beat.targets.includes('cloud-condense'))!.textStart).toBe(journeySteps.C5.cues[1].narration.indexOf('部分水汽凝结成白色云滴'));
    expect(visualGuidePlans['C6-opening'].flatMap(beat => beat.targets)).not.toContain('cloud-condense');
    expect(visualGuidePlans['C6-opening'].flatMap(beat => beat.targets)).not.toContain('cloud-precipitation');
    expect(visualGuidePlans['C5-bridge'].flatMap(beat => beat.targets)).not.toContain('cloud-runoff');
    expect(visualGuidePlans['G4-observe'][1].targets).toEqual(['terrain-probe']);
    expect(phrase('M2-explain','先看设施存在').targets).toEqual(['development-facility']);
    expect(phrase('M2-explain','再加入人员与开放').targets).toEqual(['development-staff']);
    expect(phrase('M2-explain','最后接上使用者能够走到的路').targets).toEqual(['development-users','development-lastmile']);
    expect(visualGuidePlans['M2-opening'].flatMap(beat => beat.targets)).not.toContain('development-staff');
  });

  it('新的生活、文化与历史计划不再指向旧城市、地貌或碑体场景',()=>{
    for(const stepId of ['E3','P1','P2','P3','K1','K2','K3','K4','H1','H2','H3','H4']){
      const targets=journeySteps[stepId].cues.flatMap(cue=>visualGuidePlans[cue.id].flatMap(beat=>beat.targets));
      expect(targets).not.toContain('lhasa');expect(targets).not.toContain('nagqu');expect(targets).not.toContain('shannan');expect(targets).not.toContain('event-changan');
      expect(targets.some(id=>id.startsWith('context-'))).toBe(false);
    }
    expect(phrase('H3-explain','后来又可以产生拓本等复制材料').targets).toEqual(['history-rubbing','history-stele-body']);
    expect(phrase('H4-explain','房屋保持不变').targets).toEqual(['history-household']);
    expect(phrase('K2-explain','学习者参与译写、选择和理解').targets).toEqual(['culture-learning']);
    expect(phrase('K4-explain','他离开观看位置，走近示范者').targets).toEqual(['opera-learning']);
  });

  it.each(['E3','P2','P3','K1','K2','K3','K4','H1','H2','H3','H4'])('%s 的标记在对应配音阶段指向实际可见实体',stepId=>{
    const camera=new THREE.PerspectiveCamera(43,1.6,.1,180);camera.position.set(12,9,18);camera.lookAt(0,1,0);camera.updateMatrixWorld();
    const runtime={camera,renderer:{getSize:(value:THREE.Vector2)=>value.set(1280,800)}};
    const chapterStep=stepId.startsWith('K')||stepId.startsWith('H')?Number(stepId.slice(1))-1:0;
    const model=stepId==='E3'||stepId==='P3'?buildLivingLandscapeScene(runtime):stepId==='P2'?buildLandformProcessScene(runtime):stepId==='K1'?buildPalaceStudyScene(runtime):stepId.startsWith('K')?buildCourtyardScene(runtime):buildHistoryInquiryScene(runtime);
    let settings:SceneSettings=defaultSettings();
    const props:TibetSceneProps={scene:stepId.startsWith('K')?'culture':stepId.startsWith('H')?'history':'landscape',step:chapterStep,viewKey:stepId,season:1,layer:'terrain',progress:0,playing:false,selected:'',cutaway:false,resetKey:0,onSelect:()=>{},onInteract:()=>{}};
    for(const cue of journeySteps[stepId].cues){
      const beats=visualGuidePlans[cue.id];
      for(const [index,beat]of beats.entries()){
        const end=beats[index+1]?.at??1;
        // Keep the full phrase lifetime, including its first spoken instant.
        // Only move an infinitesimal amount inside to avoid a float boundary
        // selecting the previous provider word; do not skip hidden-body phases.
        for(const at of [beat.at+1e-9,(beat.at+end)/2,end-1e-9]){
          const {current,guide}=semanticState(cue,settings,at);
          model.update({...props,...current,guide});
          expect(guide.targets,`${cue.id}: native phrase identity`).toEqual(beat.targets);
          for(const target of beat.targets){
            let exists=false;model.group.traverse(object=>{if((object.userData.selectId===target||object.userData.guideId===target)&&visiblePhysical(object))exists=true;});
            expect(exists,`${cue.id} @ text ${at}, model ${current.progress}: ${target} must identify a visible physical subject`).toBe(true);
          }
        }
      }
      settings=semanticState(cue,settings,1).current;
    }
    if('dispose' in model&&typeof model.dispose==='function')model.dispose();else disposeTree(model.group);
  });

  it('后半主线使用各自过程实体，不再借旧城市点和空路线替代解释', () => {
    for (const stepId of ['R1','R2','R3','M1','M2','M3','T1','T2','T3']) {
      const targets = journeySteps[stepId].cues.flatMap(cue => visualGuidePlans[cue.id].flatMap(beat => beat.targets));
      const prefix = stepId.startsWith('R') ? 'connection-' : stepId === 'M1' ? 'rail-' : stepId.startsWith('M') ? 'development-' : 'travel-';
      expect(targets.every(target => target.startsWith(prefix))).toBe(true);
      expect(targets).not.toContain('travel-route');
    }
    // Opening thermal feedback must still point at the active structure. Later
    // observation instructions may ask the learner to enter the operating view;
    // the physical-lifetime test below checks that those targets really exist.
    expect(visualGuidePlans['M1-observe'][0].targets).toEqual(['rail-rock','rail-ice']);
    expect(phrase('T2-explain','主车先到节点').targets).toContain('travel-corridor');
    expect(new Set(visualGuidePlans['T3-explain'].flatMap(beat=>beat.targets))).toEqual(new Set(['travel-evidence','travel-conditions','travel-record']));
    expect(phrase('R3-explain','区分发生崩塌、到达河道与是否堵江').targets).toEqual(['connection-slope','connection-obstruction']);
  });

  it.each(['R1','R2','R3','M1','M2','M3','T1','T2','T3'])('%s 的完整注意力片段跨阶段和关键帧仍指向可见实体', stepId => {
    const camera = new THREE.PerspectiveCamera(43, 1.6, .1, 180);
    camera.position.set(18, 27, 34); camera.lookAt(0, 3, 1); camera.updateMatrixWorld();
    const runtime = { camera, renderer: { getSize: (value:THREE.Vector2) => value.set(1280, 800) } };
    const model = stepId.startsWith('R') ? buildConnectionProcessesScene(runtime)
      : stepId === 'M1' ? buildRailwayEngineeringScene(runtime)
      : stepId.startsWith('M') ? buildDevelopmentSystemsScene(runtime)
      : buildTravelUnderstandingScene(runtime);
    const props:TibetSceneProps = { scene: 'landscape', step: Number(stepId.slice(1)) - 1, viewKey: stepId,
      season: 1, layer: 'terrain', progress: 0, playing: false, selected: '', cutaway: false, resetKey: 0,
      onSelect: () => {}, onInteract: () => {} };
    let settings:SceneSettings = defaultSettings();
    try {
      for (const cue of journeySteps[stepId].cues) {
        const beats = visualGuidePlans[cue.id];
        beats.forEach((beat, index) => {
          const end = beats[index + 1]?.at ?? 1;
          // A subject may disappear partway through a beat. Check its full lifetime,
          // including both sides of model phase boundaries and layer keyframes.
          const boundaries = [...(cue.keyframes ?? []).map(frame => frame.at), .02, .18, .25, .3, .32, .64, .68, .84];
          const samples = [beat.at+1e-9, (beat.at + end) / 2, end - .000001,
            ...boundaries.flatMap(at => [at - .000001, at, at + .000001])]
            .filter(at => at >= beat.at && at < end);
          for (const at of samples) {
            const {current,guide}=semanticState(cue,settings,at);
            model.update({ ...props, ...current,guide });
            expect(guide.targets,`${cue.id}: native phrase identity`).toEqual(beat.targets);
            for (const target of beat.targets) {
              let exists = false;
              model.group.traverse(object => {
                if ((object.userData.selectId === target || object.userData.guideId === target) && visiblePhysical(object)) exists = true;
              });
              expect(exists, `${cue.id} @ text ${at}, model ${current.progress}: ${target} must remain a visible physical subject`).toBe(true);
            }
          }
        });
        settings=semanticState(cue,settings,1).current;
      }
    } finally { model.dispose(); }
  });
});
