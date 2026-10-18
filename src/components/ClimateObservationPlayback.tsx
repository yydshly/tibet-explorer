import {ArrowCounterClockwise,Pause,Play,SpeakerHigh,SpeakerSlash} from '@phosphor-icons/react';
import type {useClimateObservationNarration} from '../hooks/useClimateObservationNarration';
import NarrationCaption from './NarrationCaption';
import NarrationAlignmentNotice,{narrationAlignmentUnavailable} from './NarrationAlignmentNotice';

export default function ClimateObservationPlayback({director,onPlay}:{director:ReturnType<typeof useClimateObservationNarration>;onPlay:()=>void}){
 if(!director.supported)return <p className="climate-observation-audio-note">本月可查阅真实数据；1月与7月另有逐站同步讲解。</p>;
 return <div className="climate-observation-playback" aria-label="当前月份的观测讲解">
  <div className="city-life-playback"><button type="button" className="city-life-play" onClick={onPlay}>{director.playing?<Pause size={14}/>:<Play size={14} weight="fill"/>}{director.playing?'暂停观测讲解':'播放本月观测讲解'}</button><button type="button" aria-label="重播本月观测讲解" onClick={director.replay}><ArrowCounterClockwise size={15}/></button><button type="button" aria-label={director.voice?'关闭观测讲解声音':'开启观测讲解声音'} aria-pressed={director.voice} onClick={()=>director.setVoice(!director.voice)}>{director.voice?<SpeakerHigh size={15}/>:<SpeakerSlash size={15}/>}</button></div>
  {director.audio.status==='loading'&&<p role="status">正在准备本月观测讲解…</p>}
  {director.audio.error&&<p role="status" className="city-life-audio-status is-error">{director.audio.error}</p>}
  <NarrationAlignmentNotice unavailable={narrationAlignmentUnavailable(director.audio)}/>
  {director.caption&&<p className="climate-observation-recorded-caption"><NarrationCaption text={director.caption} timing={director.timing}/></p>}
 </div>;
}
