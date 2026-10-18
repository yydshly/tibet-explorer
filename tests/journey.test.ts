import { describe, expect, it } from 'vitest';
import { chapters } from '../src/data/curriculum';
import { chapterSummaries, getJourneyStep, journeySegments, journeySteps, matchesCueTarget } from '../src/data/journey';
import { learningStepIds } from '../src/data/learningOrder';
import { emptyExploration, parseExploration, settingsForStep, type SceneSettings } from '../src/lib/store';

const records = chapters.flatMap(chapter => chapter.steps.map(step => ({ chapter, step })));
const ordered = learningStepIds.map(id => records.find(({ step }) => step.id === id)!);
const learningChapters = [...new Set(ordered.map(({ chapter }) => chapter))];
const roles = ['opening', 'explain', 'observe', 'bridge'];

describe('贯穿认识的导演内容', () => {
  it('先认地球对象、运行与地方差异，再逐层定位西藏并进入地形背景', () => {
    const first = getJourneyStep('G1');
    const surroundings = getJourneyStep('G2');
    expect(first.cues.map(cue => cue.settings.layer)).toEqual(['earth-system', 'earth-heating', 'earth-circulation', 'earth-contrasts']);
    expect(surroundings.cues.map(cue => cue.settings.layer)).toEqual(['globe', 'surroundings', 'latitude', 'plateau']);
    expect(first.cues[0].narration).toContain('整个地球');
    for (const object of ['海洋', '陆地', '空气', '冰雪']) expect(first.cues[0].narration).toContain(object);
    expect(first.cues[0].narration).not.toMatch(/太阳|照射|回归线|极圈/);
    expect(first.cues[1].narration).toContain('同样宽的阳光');
    expect(first.cues[2].narration).toMatch(/气压差.*流动/);
    for (const place of ['刚果盆地', '撒哈拉', '青藏高原']) expect(first.cues[3].narration).toContain(place);
    expect(first.nextStepId).toBe('G2');
    expect(surroundings.cues[0].keyframes?.map(frame => frame.settings.layer)).toEqual(['asia', 'china', 'tibet']);
    expect(surroundings.cues[1].narration).toMatch(/印度洋.*西侧来流.*抬升或绕行/);
    expect(surroundings.cues[2].narration).toContain('北温带不代表处处温和');
    expect(surroundings.cues[3].narration).toContain('两者不能画上等号');
    expect(surroundings.nextStepId).toBe('G3');
    expect(getJourneyStep('G3').nextStepId).toBe('G4');
    expect(getJourneyStep('G4').nextStepId).toBe('C1');
    expect(getJourneyStep('C1').cues[0].narration).toContain('位置、外部联系与地形背景');
  });

  it('完整认识先环境再人文、历史与今天，原有36问题都能访问且只经过一次', () => {
    const expected = [
      ...Array.from({ length: 4 }, (_, i) => `G${i + 1}`),
      ...Array.from({ length: 9 }, (_, i) => `C${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `E${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `P${i + 1}`),
      ...Array.from({ length: 4 }, (_, i) => `K${i + 1}`),
      ...Array.from({ length: 4 }, (_, i) => `H${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `R${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `M${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `T${i + 1}`),
    ];
    expect(learningStepIds).toEqual(expected);
    expect(new Set(learningStepIds).size).toBe(36);
    expect([...learningStepIds].sort()).toEqual(records.map(({ step }) => step.id).sort());
    const visited: string[] = [];
    let current: string | null = 'G1';
    while (current && visited.length < 37) {
      visited.push(current);
      current = getJourneyStep(current).nextStepId;
    }
    expect(visited).toEqual(expected);
    expect(current).toBeNull();
  });

  it('环境进入文化、文化回看历史、历史展开周边的三处桥接与讲述一致', () => {
    const boundaries = [
      { from: 'P3', to: 'K1', chapter: 'landscapes', context: /建筑|文化/, opening: /河谷|聚落|生活需要/ },
      { from: 'K4', to: 'H1', chapter: 'culture', context: /考古|历史/, opening: /文化|信仰|艺术/ },
      { from: 'H4', to: 'R1', chapter: 'history', context: /水系|周边|上下游/, opening: /历史事件/ },
    ];
    for (const boundary of boundaries) {
      const previous = getJourneyStep(boundary.from);
      expect(previous.nextStepId).toBe(boundary.to);
      expect(chapterSummaries[boundary.chapter].nextStepId).toBe(boundary.to);
      expect(previous.cues[3].narration).toMatch(boundary.context);
      expect(getJourneyStep(boundary.to).cues[0].narration).toMatch(boundary.opening);
      expect(previous.transition?.toScale).toBe(getJourneyStep(boundary.to).scale);
    }
    expect(getJourneyStep('K1').cues[0].narration).not.toContain('上一章把建筑放回了历史');
    expect(getJourneyStep('G2').cues[0].keyframes?.some(frame => frame.settings.layer === 'china')).toBe(true);
  });

  it('所有36步有问题、解释、真实观察停靠与下一步桥接', () => {
    expect(Object.keys(journeySteps)).toEqual(ordered.map(({ step }) => step.id));
    const ids: string[] = [];
    for (const { chapter, step } of ordered) {
      const journey = getJourneyStep(step.id);
      expect(journey.chapterId, step.id).toBe(chapter.id);
      expect(journey.cues.map(cue => cue.role), step.id).toEqual(step.id === 'C4' ? ['opening', 'explain', 'explain', 'observe', 'bridge'] : roles);
      expect(journey.location.length, step.id).toBeGreaterThan(8);
      expect(journey.scale.length, step.id).toBeGreaterThanOrEqual(4);
      expect(journey.timeContext.length, step.id).toBeGreaterThanOrEqual(6);
      for (const cue of journey.cues) {
        ids.push(cue.id);
        expect(cue.narration.length, cue.id).toBeGreaterThanOrEqual(40);
        expect(cue.narration.length, cue.id).toBeLessThanOrEqual(180);
        expect(cue.title.length, cue.id).toBeGreaterThan(5);
      }
      const observation = journey.cues.find(cue => cue.role === 'observe')!;
      expect(observation.interaction, step.id).toBeDefined();
      expect(observation.interaction?.instruction.length, step.id).toBeGreaterThan(12);
      for (const cue of journey.cues.filter(cue => cue.role !== 'observe')) expect(cue.interaction, cue.id).toBeUndefined();
    }
    expect(new Set(ids).size).toBe(145);
    expect(new Set(ordered.flatMap(({ step }) => getJourneyStep(step.id).cues.map(cue => cue.narration))).size).toBe(145);
  });

  it('高原来流的五段按同一地形串起抬升、云雨、地区差异与生活', () => {
    const cues = getJourneyStep('C4').cues;
    expect(cues.map(cue => cue.id)).toEqual(['C4-arrival', 'C4-uplift', 'C4-cloud', 'C4-regions', 'C4-life']);
    expect(cues.map(cue => cue.settings.layer)).toEqual(['arrival', 'uplift', 'cloud', 'regions', 'life']);
    expect(cues.every(cue => cue.motion?.from === 0 && cue.motion.to === 1)).toBe(true);
    expect(cues[1].narration).toMatch(/较低气压.*膨胀.*冷却/);
    expect(cues[2].narration).toMatch(/凝结.*云滴.*增长.*降水/);
    expect(cues[3].keyframes?.map(frame => frame.settings.selected)).toEqual(['lhasa', 'ngari']);
    expect(cues[4].settings.selected).toBeUndefined();
    expect(cues[4].narration).toContain('设施、组织、历史与选择');
  });

  it('逐步衔接使用下一步真实尺度和时间，最终回到成果而非循环开头', () => {
    ordered.forEach(({ step }, index) => {
      const journey = getJourneyStep(step.id);
      const nextId = ordered[index + 1]?.step.id ?? null;
      expect(journey.nextStepId, step.id).toBe(nextId);
      if (nextId) {
        const next = getJourneyStep(nextId);
        expect(journey.transition, step.id).toEqual({
          fromScale: journey.scale, toScale: next.scale,
          fromTime: journey.timeContext, toTime: next.timeContext,
          reason: journey.cues.at(-1)!.narration,
        });
      } else expect(journey.transition).toBeNull();
    });
    expect(getJourneyStep('unknown').stepId).toBe('G1');
  });

  it('四段旅程连续覆盖九章，成果段有独立的保存与继续目标', () => {
    expect(journeySegments.map(segment => segment.chapterIds)).toEqual([
      ['position', 'climate', 'regions', 'landscapes'], ['culture', 'history'], ['connections', 'modern'], ['travel'],
    ]);
    expect(journeySegments.flatMap(segment => segment.chapterIds)).toEqual(learningChapters.map(chapter => chapter.id));
    journeySegments.forEach((segment, index) => {
      expect(segment.number).toBe(index + 1);
      const segmentSteps = ordered.filter(({ chapter }) => segment.chapterIds.includes(chapter.id));
      expect(segment.entryStepId).toBe(segmentSteps[0].step.id);
      expect(segment.exitStepId).toBe(segmentSteps.at(-1)?.step.id);
      segmentSteps.forEach(({ step }) => expect(getJourneyStep(step.id).segmentId).toBe(segment.id));
      expect(segment.introduction.length).toBeGreaterThan(45);
      expect(segment.summary.length).toBeGreaterThan(60);
      expect(segment.nextReason.length).toBeGreaterThan(30);
    });
  });

  it('九章总结都有可回看的知识步骤及通往下一章的理由', () => {
    expect(Object.keys(chapterSummaries)).toEqual(chapters.map(chapter => chapter.id));
    learningChapters.forEach((chapter, index) => {
      const summary = chapterSummaries[chapter.id];
      expect(summary.chapterId).toBe(chapter.id);
      expect(summary.learned).toHaveLength(3);
      expect(summary.sourceStepIds.every(id => chapter.steps.some(step => step.id === id))).toBe(true);
      expect(summary.nextStepId).toBe(learningChapters[index + 1]?.steps[0].id ?? null);
      expect(summary.narration.length).toBeGreaterThan(70);
      expect(summary.nextReason.length).toBeGreaterThan(15);
    });
  });

  it('每段场景参数都可通过保存契约恢复，没有无效图层、选择或数值', () => {
    for (const { step } of ordered) {
      let settings: SceneSettings = settingsForStep(step);
      for (const cue of getJourneyStep(step.id).cues) {
        settings = { ...settings, ...cue.settings };
        const data = emptyExploration();
        data.scenes[step.id] = settings;
        expect(parseExploration(JSON.stringify(data)).scenes[step.id], cue.id).toEqual(settings);
        if (cue.interaction?.target) {
          const after = { ...settings, ...cue.interaction.target };
          data.scenes[step.id] = after;
          expect(parseExploration(JSON.stringify(data)).scenes[step.id], `${cue.id} target`).toEqual(after);
        }
        if (cue.motion) {
          expect(cue.motion.field).toBe('progress');
          expect(cue.motion.from).toBeGreaterThanOrEqual(0);
          expect(cue.motion.to).toBeLessThanOrEqual(1);
          expect(cue.motion.to).toBeGreaterThan(cue.motion.from);
          // A moving relationship can be observed as well as explained; its
          // valid state range matters, rather than a fixed narration role.
          expect(cue.motion.durationMs).toBeGreaterThan(0);
        }
        let previousTime = -1;
        for (const frame of cue.keyframes || []) {
          expect(frame.at).toBeGreaterThan(previousTime);
          expect(frame.at).toBeGreaterThanOrEqual(0);
          expect(frame.at).toBeLessThanOrEqual(1);
          previousTime = frame.at;
          const after = { ...settings, ...frame.settings };
          data.scenes[step.id] = after;
          expect(parseExploration(JSON.stringify(data)).scenes[step.id], `${cue.id} event frame`).toEqual(after);
        }
      }
    }
  });

  it('有参数目标的观察必须真的改变初始状态，不会入场就被算作操作完成', () => {
    for (const { step } of ordered) {
      const cue = getJourneyStep(step.id).cues.find(value => value.role === 'observe')!;
      const before = { ...settingsForStep(step), ...cue.settings };
      expect(matchesCueTarget(cue, before), `${cue.id} before operation`).toBe(false);
      if (cue.interaction?.target) {
        expect(matchesCueTarget(cue, { ...before, ...cue.interaction.target }), `${cue.id} after operation`).toBe(true);
      }
    }
    const rain = getJourneyStep('C6').cues[2];
    expect(matchesCueTarget(rain, { ...settingsForStep(ordered.find(value => value.step.id === 'C6')!.step), ...rain.settings, progress: .94 })).toBe(true);
    expect(matchesCueTarget(rain, { ...settingsForStep(ordered.find(value => value.step.id === 'C6')!.step), ...rain.settings, progress: .7 })).toBe(false);
  });

  it('天气、季节、多年与历史事件的导演状态各自独立', () => {
    expect(getJourneyStep('C6').timeContext).toContain('短时');
    expect(getJourneyStep('C7').timeContext).toContain('一年');
    expect(getJourneyStep('C8').timeContext).toContain('多年');
    expect(getJourneyStep('C9').timeContext).toContain('1976年与2017年6月');
    expect(getJourneyStep('C7').cues.every(cue => cue.settings.layer === 'season')).toBe(true);
    expect(getJourneyStep('C8').cues.every(cue => cue.settings.layer === 'forcing')).toBe(true);
    expect(getJourneyStep('C9').cues.every(cue => cue.settings.layer === 'change')).toBe(true);
    const treaty=getJourneyStep('H3');
    expect(treaty.cues[0].settings.layer).toBe('event-821');
    expect(treaty.cues[1].motion).toMatchObject({from:0,to:1});
    expect(treaty.cues[1].keyframes?.map(frame=>frame.settings.layer)).toEqual(['event-822','event-823']);
    expect(treaty.cues[2].settings.layer).toBe('object');
    expect(treaty.cues.every(cue=>cue.settings.selected==='empire')).toBe(true);
    expect(getJourneyStep('K1').cues[2].interaction?.target).toEqual({ cutaway: true });
  });

  it('色林错比较只使用两期离散研究状态，不制造连续湖岸或虚构冰川年表', () => {
    const evidence = getJourneyStep('C9');
    expect(evidence.location).toContain('色林错');
    expect(evidence.cues.every(cue => !cue.motion)).toBe(true);
    const states = evidence.cues.flatMap(cue => [cue.settings.progress, ...(cue.keyframes || []).map(frame => frame.settings.progress)]);
    expect(states.every(progress => progress === 0 || progress === 1)).toBe(true);
    expect(evidence.cues[2].settings.progress).toBe(0);
    expect(evidence.cues[2].interaction?.target).toEqual({ progress: 1 });
    expect(evidence.cues.map(cue => cue.narration).join('')).not.toMatch(/时期甲|时期乙|两条冰川边界|滑块/);
    expect(evidence.cues[1].narration).toContain('已发表研究的汇总数值');
    expect(evidence.cues[2].narration).toContain('不能单独证明原因或预测未来');
    const question = chapters.flatMap(chapter => chapter.steps).find(step => step.id === 'C9')!;
    expect(question.kind).toBe('研究数据');
    expect(question.sources).toEqual(['siling-co-study', 'siling-co-cas-summary', 'siling-co-location-study']);
  });
});
