import { matchesCueTarget, type CueRole, type JourneyCue, type JourneyInteraction } from '../data/journey';
import type { SceneSettings } from './store';

export type DirectorMode = 'idle' | 'running' | 'paused' | 'waiting';
export type DirectorEndAction = 'nextCue' | 'wait' | 'nextStep' | 'finishStep';

/** Reading a source or taking over the scene must not lose an observation's waiting position. */
export function preservePauseMode(mode: DirectorMode): DirectorMode {
  return mode === 'running' ? 'paused' : mode;
}

/** Call with a deliberate UI event; narration-driven scene updates are not observation events. */
export function detectObservation(
  cue: JourneyCue,
  kind: JourneyInteraction['kind'],
  nextSettings: SceneSettings,
): boolean {
  const expected = cue.interaction;
  if (cue.role !== 'observe' || !expected || expected.kind !== kind) return false;
  if (expected.target && Object.keys(expected.target).length > 0) return matchesCueTarget(cue, nextSettings);
  // Camera movement and saved artifacts have their own UI events, not scene-setting targets.
  return kind === 'view' || kind === 'record' || kind === 'route';
}

/** A continuous explanation includes observation; stopping is an explicit viewing preference. */
export function cueEndAction(role: CueRole, autoContinue: boolean, stopForObservation = true): DirectorEndAction {
  if (role === 'observe' && stopForObservation) return 'wait';
  if (role === 'bridge') return autoContinue ? 'nextStep' : 'finishStep';
  return 'nextCue';
}
