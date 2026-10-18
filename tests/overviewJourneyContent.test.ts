import { describe, expect, it } from 'vitest';
// @ts-expect-error Test-only access to locally archived source data.
import {existsSync} from 'node:fs';
import { overviewBeats, overviewChapters } from '../src/data/overviewJourney';
import { overviewNarrationCues } from '../src/data/overviewNarration';
import { getJourneyStep } from '../src/data/journey';
import { cityAccessAudioSegments } from '../src/lib/cityAccessAudio';
import { atlasHotspots } from '../src/data/atlas';
import { cityOverviews } from '../src/data/cityOverview';
import {overviewHeritageLessons} from '../src/lib/overviewHeritageScene';
import {overviewPrograms} from '../src/data/overviewProgram';
import {climateLabNarrationCues} from '../src/data/climateLab';
import {climateObservationNarrationCues} from '../src/data/climateObservationNarration';

describe('the complete overview keeps one causal route and exact recording identities', () => {
  it('starts with the whole Earth and closes the explanation before offering detail', () => {
    expect(overviewChapters.map(chapter => chapter.id)).toEqual([
      'earth', 'position', 'engine', 'formation', 'terrain', 'airwater', 'regions', 'history', 'connections', 'observation',
    ]);
    expect(overviewBeats[0].recordingId).toBe('G1-opening');
    expect(overviewBeats.at(-1)?.recordingId).toBe('OVERVIEW-conclusion');
    expect(new Set(overviewBeats.map(beat => beat.id)).size).toBe(overviewBeats.length);
    for (const chapter of overviewChapters) {
      for (const field of ['question', 'premise', 'conclusion', 'nextQuestion'] as const) expect(chapter[field].length).toBeGreaterThan(6);
      expect(chapter.scale.length).toBeGreaterThan(0);
      expect(chapter.beats.every(beat => beat.chapterId === chapter.id)).toBe(true);
    }
  });

  it('never applies an old clip or its literal timing plan to rewritten text', () => {
    for (const beat of overviewBeats) {
      if (beat.kind === 'journey') {
        const cue = getJourneyStep(beat.stepId!).cues[beat.cueIndex!];
        expect(beat.recordingId).toBe(cue.id);
        expect(beat.text).toBe(cue.narration);
      } else if (beat.kind === 'comparison') {
        const cue = cityAccessAudioSegments.find(segment => segment.id === beat.segmentId)!;
        expect(beat.recordingId).toBe(cue.id);
        expect(beat.text).toBe(cue.text);
      } else if (beat.kind === 'heritage' && !['OVERVIEW-barkhor-life','OVERVIEW-lhasa-urban-change'].includes(beat.recordingId)) {
        const cue=overviewHeritageLessons.find(lesson=>lesson.id===beat.recordingId)!;
        expect(cue).toBeDefined();
        expect(beat.segmentId).toBe(cue.id);
        expect(beat.text).toBe(cue.narration);
      } else {
        const cue = overviewNarrationCues.find(recording => recording.id === beat.recordingId)!;
        expect(beat.text).toBe(cue.narration);
      }
    }
    const recordings=[...new Map([...overviewBeats,...overviewPrograms.flatMap(p=>p.beats)].map(beat=>[beat.recordingId,beat])).values()];
    const interactions=recordings.filter(b=>/^(LAB-|OBS-CLIMATE)/.test(b.recordingId));
    const cues=[...climateLabNarrationCues,...climateObservationNarrationCues];
    for(const beat of interactions)expect(cues.find(c=>c.id===beat.recordingId)?.narration).toBe(beat.text);
    expect(recordings.filter(beat => !interactions.includes(beat)&&(beat.kind === 'atlas'||beat.kind==='orientation'||['OVERVIEW-barkhor-life','OVERVIEW-lhasa-urban-change'].includes(beat.recordingId))).map(beat => beat.recordingId).sort())
      .toEqual(overviewNarrationCues.filter(cue=>cue.id!=='OVERVIEW-ground-rail').map(cue => cue.id).sort()); // Preserved archive, superseded by valley-journey.
  });

  it('uses ordered literal word anchors and already sourced geographic references', () => {
    const knownFocus = new Set([...atlasHotspots.map(point => point.id), ...cityOverviews.map(city => city.id)]);
    for (const beat of overviewBeats) {
      expect(beat.sources.length).toBeGreaterThan(0);
      for (const source of beat.sources) {
        if(source.url.startsWith('/data/'))expect(existsSync(`public${source.url}`)).toBe(true);
        else expect(source.url).toMatch(/^https:\/\//);
      }
      let previous = -1;
      for (const moment of beat.moments ?? []) {
        const offset = beat.text.indexOf(moment.token);
        expect(offset, `${beat.id}: ${moment.token}`).toBeGreaterThan(previous);
        expect(beat.text.indexOf(moment.token, offset + 1)).toBe(-1);
        previous = offset;
        if (moment.focus) expect(knownFocus.has(moment.focus), moment.focus).toBe(true);
      }
    }
  });

  it('retains all seven regions and a chronological history before the single access example', () => {
    const regionalText = overviewChapters.find(chapter => chapter.id === 'regions')!.beats.map(beat => beat.text).join('');
    for (const name of ['拉萨', '日喀则', '山南', '昌都', '林芝', '那曲', '阿里']) expect(regionalText).toContain(name);
    expect(overviewChapters.find(chapter => chapter.id === 'history')!.beats.map(beat => beat.recordingId)).toEqual([
      'OVERVIEW-history-entry','OVERVIEW-history-early', 'OVERVIEW-history-middle', 'OVERVIEW-history-modern', 'OVERVIEW-culture',
      'OVERVIEW-evidence-reading','OVERVIEW-heritage-entry',
      'CONT-history-lhasa-1','OVERVIEW-barkhor-life','CONT-history-lhasa-2','CONT-history-lhasa-3','OVERVIEW-lhasa-urban-change','OVERVIEW-heritage-return',
    ]);
    expect(overviewBeats.filter(beat => beat.kind === 'comparison').map(beat => beat.segmentId)).toEqual(['ACCESS-lhasa-access', 'ACCESS-lhasa-transfer','ACCESS-lhasa-life']);
    const transferIndex=overviewBeats.findIndex(beat=>beat.recordingId==='ACCESS-lhasa-transfer');
    expect(overviewBeats[transferIndex].text).toContain('拉萨西货场是另一处地点，下一环单独阅读');
    expect(overviewBeats[transferIndex+1].text).toContain('再单独读拉萨西货场');
    expect(overviewBeats[transferIndex+2].recordingId).toBe('OVERVIEW-protection');
    expect(overviewBeats[transferIndex+2].text).toContain('把镜头重新拉回全域');
  });

  it('explains changes of question and scale before returning to an earlier dated local example',()=>{
    const position=overviewChapters.find(chapter=>chapter.id==='position')!.beats;
    expect(position.map(beat=>beat.recordingId)).toEqual(['OVERVIEW-position']);
    expect(position[0].text).toMatch(/^先从完整地球找到西藏/);
    expect(position[0].text).not.toContain('现在知道地方差异');
    const formation=overviewChapters.find(chapter=>chapter.id==='formation')!.beats;
    expect(formation[0].recordingId).toBe('OVERVIEW-formation-entry');
    expect(formation[0].text).toContain('现在回到亚洲');
    expect(formation[0].text).toContain('看懂原理以后，我们会回到今天的真实高程');
    const history=overviewChapters.find(chapter=>chapter.id==='history')!.beats;
    expect(history[0].text).toContain('却不能直接解释一座城为何成为中心');
    const entry=history.find(beat=>beat.recordingId==='OVERVIEW-heritage-entry')!;
    expect(entry.text).toContain('现在暂时离开顺时排列');
    expect(entry.text).toContain('回到拉萨这一个地方');
    expect(history.at(-1)!.text).toContain('再回到西藏全域');
  });
});
