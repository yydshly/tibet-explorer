import {journeyMotionProgress} from '../lib/journeyMotion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getJourneyStep } from '../data/journey';
import { NarrationController, type NarrationState } from '../lib/narration';
import {narrationTimingForPlayback} from '../lib/narrationTiming';
import {visualGuideForCue} from '../data/visualGuidance';
import type { SceneSettings } from '../lib/store';
import { preservePauseMode, detectObservation, cueEndAction } from '../lib/director-state';
import type { JourneyInteraction } from '../data/journey';

type Mode = 'idle' | 'running' | 'paused' | 'waiting';
type Position = { stepId: string; cueIndex: number; mode: Mode; progress: number; observed: boolean };
interface Options {
  stepId: string;
  home: boolean;
  voice: boolean;
  autoContinue: boolean;
  stopForObservation: boolean;
  blocked?:boolean;
  request: { stepId: string; serial: number } | null;
  apply: (patch: Partial<SceneSettings>) => void;
  finish: (continueJourney: boolean) => void;
}
const POSITION_KEY = 'tibet-explorer.journey-position.v1';
function readPosition(stepId: string): Position {
  let cueIndex = 0;
  try {
    const value = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}');
    if (value.stepId === stepId && Number.isInteger(value.cueIndex) && value.cueIndex >= 0 && value.cueIndex < getJourneyStep(stepId).cues.length) cueIndex = value.cueIndex;
  } catch { /* A broken saved position starts at the question. */ }
  return { stepId, cueIndex, mode: 'idle', progress: 0, observed: false };
}
const emptyAudio: NarrationState = { status: 'idle', cue: null, cueIndex: -1, cueCount: 0, currentTime: 0, duration: 0, progress: 0, error: null, provider: 'MiniMax' };

/** One director owns audio, subtitles, process progress and the next question. */
export function useJourneyDirector(options: Options) {
  const [position, setPosition] = useState(() => readPosition(options.stepId));
  const [audio, setAudio] = useState<NarrationState>(emptyAudio);
  const controller = useRef<NarrationController | null>(null);
  const latest = useRef(options); latest.current = options;
  const current = position.stepId === options.stepId ? position : readPosition(options.stepId);
  const currentRef = useRef(current); currentRef.current = current;
  const script = getJourneyStep(options.stepId);
  const cue = script.cues[current.cueIndex];
  const lastRequest = useRef(-1);
  const lastProgressAt = useRef(0);
  const lastAudioTick = useRef('');
  const hasPreparedCue = useRef('');
  const appliedKeyframe = useRef('');
  const advanceRef = useRef<() => void>(() => {});

  const applyCue = useCallback((index: number) => {
    appliedKeyframe.current = '';
    const item = getJourneyStep(latest.current.stepId).cues[index];
    if (!item) return;
    latest.current.apply({ ...item.settings, ...(item.motion ? { progress: item.motion.from } : {}) });
  }, []);

  const updateProgress = useCallback((progress: number,state?:NarrationState) => {
    if (currentRef.current.mode !== 'running'||latest.current.blocked) return;
    const item = getJourneyStep(latest.current.stepId).cues[currentRef.current.cueIndex];
    if(state?.cue&&state.cue.id!==item.id)return;
    const now = performance.now();
    if (progress < 1 && now - lastProgressAt.current < 110) return;
    lastProgressAt.current = now;
    setPosition(previous => previous.stepId === latest.current.stepId ? { ...previous, progress } : previous);
    const guide=visualGuideForCue(item.id,progress,true,state?.timing);
    const patch:Partial<SceneSettings>={};
    if(guide?.sceneProgress!==undefined)patch.progress=guide.sceneProgress;
    else if(item.motion)patch.progress=journeyMotionProgress(item.motion,progress);
    if(guide?.sceneSettings){
      const key=`${item.id}:${guide.phraseId}`;
      if(appliedKeyframe.current!==key){appliedKeyframe.current=key;Object.assign(patch,guide.sceneSettings);}
    }else{
      const frameIndex=item.keyframes?.reduce((last,frame,index)=>frame.at<=progress?index:last,-1)??-1;
      const key=`${item.id}:${frameIndex}`;
      if(frameIndex>=0&&appliedKeyframe.current!==key){appliedKeyframe.current=key;Object.assign(patch,item.keyframes![frameIndex].settings);}
    }
    if(Object.keys(patch).length)latest.current.apply(patch);
  }, []);

  const pause = useCallback((observed = false) => {
    controller.current?.pause();
    setPosition(previous => ({ ...previous, mode: preservePauseMode(previous.mode), observed: previous.observed || observed }));
  }, []);
  const noteInteraction = useCallback((kind: JourneyInteraction['kind'], settings: SceneSettings) => {
    const state = currentRef.current;
    const item = getJourneyStep(latest.current.stepId).cues[state.cueIndex];
    pause(detectObservation(item, kind, settings));
  }, [pause]);

  const start = useCallback(() => {
    const state = currentRef.current;
    if (state.mode === 'waiting') {
      controller.current?.stop();
      const next = Math.min(getJourneyStep(latest.current.stepId).cues.length-1, state.cueIndex + 1);
      applyCue(next);
      setPosition({ stepId: latest.current.stepId, cueIndex: next, mode: 'running', progress: 0, observed: true });
      return;
    }
    if (state.mode === 'idle' || state.progress >= 1) {
      controller.current?.stop();
      applyCue(state.cueIndex);
      setPosition({ ...state, stepId: latest.current.stepId, mode: 'running', progress: 0 });
    } else setPosition({ ...state, stepId: latest.current.stepId, mode: 'running' });
  }, [applyCue]);

  const selectCue = useCallback((index: number, run = false, applyScene = true) => {
    controller.current?.stop(); hasPreparedCue.current = '';
    const safe = Math.max(0, Math.min(getJourneyStep(latest.current.stepId).cues.length-1, index));
    if (applyScene) applyCue(safe);
    setPosition({ stepId: latest.current.stepId, cueIndex: safe, mode: run ? 'running' : applyScene ? 'paused' : 'idle', progress: 0, observed: false });
  }, [applyCue]);

  const finishCue = useCallback(() => {
    const state = currentRef.current;
    if (state.mode !== 'running' || latest.current.blocked) return;
    const item = getJourneyStep(latest.current.stepId).cues[state.cueIndex];
    const action = cueEndAction(item.role, latest.current.autoContinue, latest.current.stopForObservation);
    if (action === 'wait') {
      setPosition({ ...state, mode: 'waiting', progress: 1 });
    } else if (action === 'nextStep' || action === 'finishStep') {
      setPosition({ ...state, mode: 'paused', progress: 1 });
      latest.current.finish(latest.current.autoContinue);
    } else {
      applyCue(state.cueIndex + 1);
      setPosition({ ...state, cueIndex: state.cueIndex + 1, mode: 'running', progress: 0 });
    }
  }, [applyCue]);
  advanceRef.current = finishCue;

  useEffect(() => {
    const player = new NarrationController({ onProgress: updateProgress, onEnded: state => {
      const expected=getJourneyStep(latest.current.stepId).cues[currentRef.current.cueIndex];
      if(state.cue?.id===expected.id)advanceRef.current();
    } });
    controller.current = player;
    player.setVolume(latest.current.voice?1:0);
    const unsubscribe = player.subscribe(state => {
      const expected=getJourneyStep(latest.current.stepId).cues[currentRef.current.cueIndex];
      if(state.cue&&state.cue.id!==expected.id)return;
      const tick = `${state.status}:${Math.floor(state.currentTime * 5)}:${state.cue?.id}:${state.timing?.textStart}:${state.timing?.activeTextStart}:${state.timing?.activeTextEnd}:${state.error}`;
      if (tick !== lastAudioTick.current) { lastAudioTick.current = tick; setAudio(state); }
      if (state.status === 'error' || (state.status === 'paused' && state.error)) {
        setPosition(previous => previous.mode === 'running' ? { ...previous, mode: 'paused' } : previous);
      }
    });
    return () => { unsubscribe(); player.dispose(); controller.current = null; };
  }, [updateProgress]);

  useEffect(() => {
    controller.current?.stop(); hasPreparedCue.current = '';
    setPosition(readPosition(options.stepId));
  }, [options.stepId, options.home]);

  useEffect(() => {
    const request = options.request;
    if (!request || request.serial === lastRequest.current || request.stepId !== options.stepId || options.home) return;
    lastRequest.current = request.serial;
    controller.current?.stop(); hasPreparedCue.current = '';
    applyCue(0);
    setPosition({ stepId: options.stepId, cueIndex: 0, mode: 'running', progress: 0, observed: false });
  }, [options.request, options.stepId, options.home, applyCue]);

  useEffect(() => {
    const player = controller.current;
    if (!player) return;
    if (options.home) { player.stop(); hasPreparedCue.current = ''; return; }
    if(options.blocked){player.pause();return;}
    if (current.mode !== 'running') { player.pause(); return; }
    const key = `${options.stepId}:${cue.id}`;
    if (hasPreparedCue.current !== key || player.snapshot.status === 'idle' || player.snapshot.status === 'ended') {
      hasPreparedCue.current = key;
      void player.start([{ id: cue.id, text: cue.narration }]);
    } else if (player.snapshot.status === 'paused' || player.snapshot.status === 'error') void player.resume();
  }, [options.home, options.stepId, options.blocked, cue.id, cue.narration, current.mode]);

  // Muting changes volume only. The actual recording owns every visual clock.
  useEffect(()=>controller.current?.setVolume(options.voice?1:0),[options.voice]);

  useEffect(() => {
    if (options.home || position.stepId !== options.stepId) return;
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({ stepId: position.stepId, cueIndex: position.cueIndex })); } catch { /* The application's export path remains available. */ }
  }, [options.home, options.stepId, position.stepId, position.cueIndex]);

  const observeDone = useCallback(() => {
    selectCue(Math.min(getJourneyStep(latest.current.stepId).cues.length-1,currentRef.current.cueIndex+1), true);
  }, [selectCue]);
  const narrationTiming=narrationTimingForPlayback(cue.narration,current.progress,audio,cue.id);
  return { cue, cueIndex: current.cueIndex, progress: current.progress, mode: current.mode,narrationTiming,currentSentence:narrationTiming.caption,
    playing: current.mode === 'running' && !options.home&&!options.blocked,
    waiting: current.mode === 'waiting', observed: current.observed, audio,
    start, pause, noteInteraction, selectCue, observeDone,
    restore: (index: number, waiting = false) => {
      selectCue(index, false, false);
      if (waiting) setPosition(previous => ({ ...previous, mode: 'waiting', progress: 1 }));
    },
    replay: () => selectCue(current.cueIndex, true) };
}
