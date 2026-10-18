import { describe, expect, it } from 'vitest';
import { chapters } from '../src/data/curriculum';
import { getJourneyStep, type JourneyCue } from '../src/data/journey';
import { cueEndAction, detectObservation, preservePauseMode, type DirectorMode } from '../src/lib/director-state';
import { settingsForStep } from '../src/lib/store';

function observation(stepId: string) {
  const step = chapters.flatMap(chapter => chapter.steps).find(value => value.id === stepId)!;
  const cue = getJourneyStep(stepId).cues.find(value => value.role === 'observe')!;
  return { cue, settings: { ...settingsForStep(step), ...cue.settings } };
}

describe('连续导演的暂停边界', () => {
  it('观察讲完后，转动场景、打开资料或保存成果仍停在观察，而不会重播任务', () => {
    let mode: DirectorMode = 'running';
    expect(cueEndAction('observe', true)).toBe('wait');
    mode = 'waiting';
    mode = preservePauseMode(mode); // Take over the camera.
    mode = preservePauseMode(mode); // Open a source.
    mode = preservePauseMode(mode); // Save the current note.
    expect(mode).toBe('waiting');
  });

  it('尚未启动的分段保持待开始，播放中的分段暂停后可以从原处继续', () => {
    expect(preservePauseMode('idle')).toBe('idle');
    const interrupted = preservePauseMode('running');
    expect(interrupted).toBe('paused');
    expect(preservePauseMode(interrupted)).toBe('paused');
  });
});

describe('只确认对应任务的用户观察', () => {
  it('冬至任务不能被转动镜头、换图层或仍停在夏至误完成', () => {
    const { cue, settings } = observation('C1');
    expect(detectObservation(cue, 'view', { ...settings, season: 3 })).toBe(false);
    expect(detectObservation(cue, 'layer', { ...settings, season: 3 })).toBe(false);
    expect(detectObservation(cue, 'season', settings)).toBe(false);
    expect(detectObservation(cue, 'season', { ...settings, season: 3 })).toBe(true);
  });

  it('云雨条件比较必须改变初始水汽，转动或推进进度不能替代它', () => {
    const { cue, settings } = observation('C5');
    expect(detectObservation(cue, 'view', { ...settings, progress: 1 })).toBe(false);
    expect(detectObservation(cue, 'progress', { ...settings, progress: .5 })).toBe(false);
    expect(detectObservation(cue, 'condition', settings)).toBe(false);
    expect(detectObservation(cue, 'condition', { ...settings, airMoisture: 'lower' })).toBe(true);
    expect(detectObservation(cue, 'progress', { ...settings, airMoisture: 'lower' })).toBe(false);
  });

  it('两地比较必须改变第二个地点，单点切换不能替代同域对照', () => {
    const {cue,settings}=observation('E2');
    expect(detectObservation(cue,'selection',{...settings,selected:'ngari'})).toBe(false);
    expect(detectObservation(cue,'comparison',{...settings,compareRegion:'ngari'})).toBe(true);
  });

  it('高原地区观察位于第四段，只有主动选择目标地区才完成', () => {
    const { cue, settings } = observation('C4');
    expect(cue.id).toBe('C4-regions');
    expect(detectObservation(cue, 'selection', settings)).toBe(false);
    expect(detectObservation(cue, 'view', { ...settings, selected: 'lhasa' })).toBe(false);
    expect(detectObservation(cue, 'selection', { ...settings, selected: 'lhasa' })).toBe(true);
    const cloud = getJourneyStep('C4').cues.find(value => value.id === 'C4-cloud')!;
    expect(detectObservation(cloud, 'condition', { ...settings, airMoisture: 'lower' })).toBe(false);
  });

  it('历史阶段必须同时对应时期身份和进度，避免保存状态互相矛盾', () => {
    const { cue, settings } = observation('H2');
    expect(detectObservation(cue, 'selection', { ...settings, selected: 'revival' })).toBe(false);
    expect(detectObservation(cue, 'selection', { ...settings, progress: .25 })).toBe(false);
    expect(detectObservation(cue, 'selection', { ...settings, selected: 'revival', progress: .25 })).toBe(true);
  });

  it('建筑任务需要开启剖面，点击另一个主题不能替代该操作', () => {
    const { cue, settings } = observation('K1');
    expect(detectObservation(cue, 'selection', { ...settings, selected: 'materials', cutaway: true })).toBe(false);
    expect(detectObservation(cue, 'cutaway', { ...settings, cutaway: false })).toBe(false);
    expect(detectObservation(cue, 'cutaway', { ...settings, cutaway: true })).toBe(true);
  });

  it('无参数目标的镜头、记录、路线任务只能由各自显式UI事件确认', () => {
    const view = observation('G2');
    const record = observation('T1');
    const route = observation('T2');
    expect(detectObservation(view.cue, 'view', view.settings)).toBe(true);
    expect(detectObservation(view.cue, 'record', view.settings)).toBe(false);
    expect(detectObservation(record.cue, 'view', record.settings)).toBe(false);
    expect(detectObservation(record.cue, 'record', record.settings)).toBe(true);
    expect(detectObservation(route.cue, 'selection', route.settings)).toBe(false);
    expect(detectObservation(route.cue, 'route', route.settings)).toBe(true);
  });

  it('开场与演示参数由导演推进，不能因为状态恰好命中就算用户完成观察', () => {
    const { cue, settings } = observation('C1');
    const opening: JourneyCue = { ...cue, role: 'opening' };
    const explain: JourneyCue = { ...cue, role: 'explain' };
    expect(detectObservation(opening, 'season', { ...settings, season: 3 })).toBe(false);
    expect(detectObservation(explain, 'season', { ...settings, season: 3 })).toBe(false);
    expect(detectObservation({ ...cue, interaction: undefined }, 'view', settings)).toBe(false);
  });

  it('缺失目标的参数任务不会被任意参数操作误确认', () => {
    const { cue, settings } = observation('C1');
    const withoutTarget: JourneyCue = { ...cue, interaction: { ...cue.interaction!, target: undefined } };
    expect(detectObservation(withoutTarget, 'season', { ...settings, season: 3 })).toBe(false);
  });
});

describe('讲完这一段后去哪里', () => {
  it('高原五段在地区比较处停靠，成云解释之后仍有地区与生活衔接', () => {
    const cues = getJourneyStep('C4').cues;
    expect(observation('C4').cue.id).toBe('C4-regions');
    expect(cues.map(cue => cueEndAction(cue.role, true))).toEqual(['nextCue', 'nextCue', 'nextCue', 'wait', 'nextStep']);
    expect(cues.map(cue => cueEndAction(cue.role, true, false))).toEqual(['nextCue', 'nextCue', 'nextCue', 'nextCue', 'nextStep']);
    expect(cues.map(cue => cueEndAction(cue.role, false, false))).toEqual(['nextCue', 'nextCue', 'nextCue', 'nextCue', 'finishStep']);
  });

  it('选择停留观察时，保留操作停点，再讲衔接并进入下一问题', () => {
    const route = getJourneyStep('C5').cues.map(cue => cueEndAction(cue.role, true));
    expect(route).toEqual(['nextCue', 'nextCue', 'wait', 'nextStep']);
  });

  it('连续认识把观察内容也连续讲完，不要求操作确认后再接下一问题', () => {
    const route = getJourneyStep('C5').cues.map(cue => cueEndAction(cue.role, true, false));
    expect(route).toEqual(['nextCue', 'nextCue', 'nextCue', 'nextStep']);
  });

  it('连续讲完当前问题可以保留章末停留，而不强制进入下一问题', () => {
    expect(cueEndAction('observe', false, false)).toBe('nextCue');
    expect(cueEndAction('bridge', false, false)).toBe('finishStep');
  });

  it('关闭自动接续仍能完成当前问题，不会在开场或解释处提前停止', () => {
    const route = getJourneyStep('H3').cues.map(cue => cueEndAction(cue.role, false));
    expect(route).toEqual(['nextCue', 'nextCue', 'wait', 'finishStep']);
  });
});
