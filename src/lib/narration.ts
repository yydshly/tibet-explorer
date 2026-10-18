import {getNarrationTimeline,narrationTimingAt,refreshNarrationTimelines,type NarrationTimeline,type NarrationTiming} from './narrationTiming';
/** MiniMax audio playback. Synthesis and credentials remain on the local server. */
export interface NarrationCue { id: string; text: string; audioUrl?: string; metadata?: unknown }
export interface NarrationAsset { id: string; cueId?: string; text: string; url: string; duration: number; provider: 'MiniMax'; model: string; cached?: boolean;voice?:string;sha256?:string;subtitleUrl?:string;subtitleSha256?:string;subtitleStatus?:'provider'|'legacy-estimated' }
export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export interface NarrationState {
  status: NarrationStatus; cue: NarrationCue | null; cueIndex: number; cueCount: number;
  currentTime: number; duration: number; progress: number; error: string | null; provider: 'MiniMax';
  timing?:NarrationTiming;
}
export interface NarrationOptions {
  onCue?: (cue: NarrationCue, index: number) => void;
  onProgress?: (progress: number, state: NarrationState) => void;
  onEnded?: (state: NarrationState) => void;
}
let manifestPromise: Promise<NarrationAsset[]> | null = null;
const pendingAssets = new Map<string, Promise<NarrationAsset>>();
const resolvedAssets = new Map<string, NarrationAsset>();
const assetKey = (id: string, text: string) => `${id}\u0000${text.trim()}`;
function loadManifest(): Promise<NarrationAsset[]> {
  if (!manifestPromise) manifestPromise = fetch('/assets/audio/narration/cue-manifest.json', { cache: 'no-cache' })
    .then(response => response.ok ? response.json() : { clips: [] })
    .then((manifest: { clips?: NarrationAsset[] }) => Array.isArray(manifest.clips) ? manifest.clips : []).catch(() => []);
  return manifestPromise;
}
/** Read already-published recordings only. Reading saved progress must never
 * synthesize audio, start media, or silently attach timing to revised text. */
export async function getExistingNarrationAsset(cueId:string,text:string):Promise<NarrationAsset|undefined>{
  const normalized=text.trim();
  return (await loadManifest()).find(clip=>(clip.cueId===cueId||clip.id===cueId)&&clip.text.trim()===normalized);
}
/** Text must match exactly: an old recording cannot silently narrate revised content. */
export async function getNarrationAsset(cueId: string, text: string): Promise<NarrationAsset> {
  const normalized = text.trim(), key = assetKey(cueId, normalized);
  if (resolvedAssets.has(key)) return resolvedAssets.get(key)!;
  if (pendingAssets.has(key)) return pendingAssets.get(key)!;
  const pending = (async () => {
    const existing = await getExistingNarrationAsset(cueId,normalized);
    if (existing) return existing;
    const response = await fetch('/api/narration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cueId, text: normalized }) });
    const asset = await response.json().catch(() => ({ error: '讲述服务未返回音频，请稍后重试。' }));
    if (!response.ok || !asset.url) throw new Error(asset.error || '讲述准备失败，请稍后重试。');
    if (asset.text !== normalized) throw new Error('讲述音频与当前文字不一致，请重新准备。');
    return asset as NarrationAsset;
  })();
  pendingAssets.set(key, pending);
  try { const asset = await pending; resolvedAssets.set(key, asset); return asset; } finally { pendingAssets.delete(key); }
}
export async function getNarrationUrl(cueId: string, text: string): Promise<string> { return (await getNarrationAsset(cueId, text)).url; }
export function refreshNarrationManifest(): void { manifestPromise = null; resolvedAssets.clear();refreshNarrationTimelines(); }
const initialState = (): NarrationState => ({ status: 'idle', cue: null, cueIndex: -1, cueCount: 0, currentTime: 0, duration: 0, progress: 0, error: null, provider: 'MiniMax' });

export class NarrationController {
  private audio: HTMLAudioElement;
  private options: NarrationOptions;
  private listeners = new Set<(state: NarrationState) => void>();
  private cues: NarrationCue[] = [];
  private state: NarrationState = initialState();
  private generation = 0;
  private wantsPlayback = false;
  private disposed = false;
  private preparingGeneration: number | null = null;
  private frame: number | null = null;
  private timeline?:NarrationTimeline;
  constructor(options: NarrationOptions = {}) {
    this.options = options; this.audio = new Audio(); this.audio.preload = 'auto';
    this.audio.addEventListener('loadedmetadata', this.updateTime); this.audio.addEventListener('timeupdate', this.updateTime);
    this.audio.addEventListener('ended', this.handleEnded); this.audio.addEventListener('error', this.handleError);
  }
  get snapshot(): NarrationState { return { ...this.state }; }
  subscribe(listener: (state: NarrationState) => void): () => void { this.listeners.add(listener); listener(this.snapshot); return () => this.listeners.delete(listener); }
  private emit(patch: Partial<NarrationState>): void { this.state = { ...this.state, ...patch }; for (const listener of this.listeners) listener(this.snapshot); }
  private updateTime = (): void => {
    if (!this.state.cue||this.preparingGeneration!==null) return;
    const duration = Number.isFinite(this.audio.duration) && this.audio.duration > 0 ? this.audio.duration : this.state.duration;
    const currentTime = this.audio.currentTime || 0, progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    this.emit({ currentTime, duration, progress,timing:narrationTimingAt(this.state.cue.text,currentTime,duration,this.timeline) }); this.options.onProgress?.(progress, this.snapshot);
  };
  private animate = (): void => { this.frame = null; if (this.state.status !== 'playing' || this.disposed) return; this.updateTime(); this.frame = requestAnimationFrame(this.animate); };
  private clearFrame(): void { if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null; }
  private handleEnded = (): void => {
    if (!this.wantsPlayback || this.disposed || this.state.status !== 'playing') return;
    this.clearFrame(); const next = this.state.cueIndex + 1;
    if (next < this.cues.length) void this.loadCue(next, this.generation);
    else { this.wantsPlayback = false; this.emit({ status: 'ended', currentTime: this.state.duration, progress: 1,timing:this.state.cue?narrationTimingAt(this.state.cue.text,this.state.duration,this.state.duration,this.timeline):undefined }); this.options.onProgress?.(1, this.snapshot); this.options.onEnded?.(this.snapshot); }
  };
  private handleError = (): void => { if (this.disposed || this.preparingGeneration!==null || this.state.status === 'idle' || this.state.status === 'ended') return; this.fail('这段讲述暂时无法播放，请重试。'); };
  private fail(message: string): void { this.wantsPlayback = false; this.audio.pause(); this.clearFrame(); this.emit({ status: 'error', error: message }); }
  private async playAudio(generation: number): Promise<void> {
    if (generation !== this.generation || !this.wantsPlayback || this.disposed) return;
    try {
      await this.audio.play();
      // A late play() promise from the previous cue must not pause a newer cue.
      if (generation !== this.generation || this.disposed) return;
      if (!this.wantsPlayback) { this.audio.pause(); return; }
      this.emit({ status: 'playing', error: null }); this.clearFrame(); this.frame = requestAnimationFrame(this.animate);
    } catch (error) {
      if (generation !== this.generation || this.disposed) return;
      this.wantsPlayback = false;
      if (error instanceof DOMException && error.name === 'NotAllowedError') this.emit({ status: 'paused', error: '讲述已准备好，点击继续播放。' });
      else this.fail('讲述暂时无法播放，请重试。');
    }
  }
  private async loadCue(index: number, generation: number): Promise<void> {
    const cue = this.cues[index]; if (!cue || generation !== this.generation || this.disposed) return;
    this.audio.pause(); this.clearFrame();this.timeline=undefined; this.preparingGeneration = generation; this.emit({ status: 'loading', cue, cueIndex: index, cueCount: this.cues.length, currentTime: 0, duration: 0, progress: 0, error: null,timing:undefined }); this.options.onCue?.(cue, index);
    try {
      const asset = cue.audioUrl ? { url: cue.audioUrl, duration: 0,text:cue.text,model:'external' } : await getNarrationAsset(cue.id, cue.text);
      const timeline=await getNarrationTimeline(asset);
      if (generation !== this.generation || this.disposed) return;
      this.timeline=timeline;this.audio.src = asset.url; this.audio.load(); this.preparingGeneration = null; this.emit({ duration: asset.duration, status: this.wantsPlayback ? 'loading' : 'paused',timing:narrationTimingAt(cue.text,0,asset.duration,timeline) }); await this.playAudio(generation);
    } catch (error) { if (generation !== this.generation || this.disposed) return; this.preparingGeneration = null; this.fail(error instanceof Error ? error.message : '讲述准备失败，请稍后重试。'); }
  }
  async start(cues: NarrationCue[]): Promise<void> { this.stop(); if (this.disposed || !cues.length) return; this.cues = cues.map(cue => ({ ...cue })); this.wantsPlayback = true; await this.loadCue(0, this.generation); }
  pause(): void { this.wantsPlayback = false; this.audio.pause(); this.clearFrame(); if (this.state.status === 'loading' || this.state.status === 'playing') this.emit({ status: 'paused' }); }
  async resume(): Promise<void> {
    if (this.disposed || !this.state.cue) return; this.wantsPlayback = true;
    if (this.preparingGeneration === this.generation) { this.emit({ status: 'loading', error: null }); return; }
    if (this.state.status === 'ended') this.audio.currentTime = 0;
    if (this.state.status === 'error') await this.loadCue(this.state.cueIndex, this.generation); else await this.playAudio(this.generation);
  }
  seek(seconds: number): void { if (!Number.isFinite(seconds) || this.state.duration <= 0) return; this.audio.currentTime = Math.min(this.state.duration, Math.max(0, seconds)); this.updateTime(); }
  setVolume(volume: number): void { this.audio.volume = Math.min(1, Math.max(0, volume)); }
  stop(): void { this.generation++; this.preparingGeneration = null; this.wantsPlayback = false; this.audio.pause(); this.clearFrame();this.timeline=undefined; this.cues = []; this.emit(initialState()); this.audio.removeAttribute('src'); this.audio.load(); }
  dispose(): void {
    this.stop(); this.disposed = true;
    this.audio.removeEventListener('loadedmetadata', this.updateTime); this.audio.removeEventListener('timeupdate', this.updateTime);
    this.audio.removeEventListener('ended', this.handleEnded); this.audio.removeEventListener('error', this.handleError); this.listeners.clear();
  }
}
