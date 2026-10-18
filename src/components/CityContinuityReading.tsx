import {cityContinuityLessons} from '../data/cityContinuityLessons';
import {cityContinuityPartProgress,cityContinuityPartState,isCityContinuityLessonStage} from '../lib/cityContinuityState';
import type {useCityComparisonDirector} from '../hooks/useCityComparisonDirector';
import './CityContinuityReading.css';
import CityLocalContext from './CityLocalContext';
import NarrationCaption from './NarrationCaption';
import {cityContinuityAudioSegments} from '../lib/cityContinuityAudio';
import {cityReadingCaption,cityReadingInterruption} from '../lib/cityReadingCaption';

type Director=ReturnType<typeof useCityComparisonDirector>;
const controls={
 history:{legend:'地形与既有空间不变，人的使用改变什么？',off:'只看空间条件',on:'加入人的使用',help:'观察进入、操作与停留；用途依据材料，形制为示意。',feedback:'地形与既有空间仍在，本段的参与、学习或地方使用暂不推进。重新加入使用可继续。'},
 connections:{legend:'区域抵达还在，地方用途能接上吗？',off:'停在抵达端',on:'接到地方用途',help:'同一物品先抵达，再由地方车辆接到用途入口。',feedback:'物品停在到达端，地方车辆与用途入口还没有完成交接。恢复接续可继续。'},
 travel:{legend:'同一处空间，当前要观察哪一环？',off:'保留环境与既有用途',on:'聚焦当前观察环节',help:'改变观察焦点；核验条件与保存问题仍由本人完成。',feedback:'环境与既有用途保留，当前观察焦点暂时收起。重新聚焦可继续。'},
};

export function cityContinuityFeedback(director:Pick<Director,'stage'|'progress'|'services'|'playing'|'currentSentence'>&Partial<Pick<Director,'narrationTiming'|'audio'|'relief'|'built'|'transfer'>>){
 const stage=isCityContinuityLessonStage(director.stage)?director.stage:'history';
 const state=cityContinuityPartState(director.progress),part=cityContinuityLessons[stage][state.cityId][state.index];
 if(!director.services||stage==='connections'&&director.transfer===false)return {state,part,title:stage==='connections'?'已经抵达，地方交接尚未完成':stage==='travel'?'地方用途保留，观察焦点收起':'空间条件保留，人的使用暂未加入',text:controls[stage].feedback,narrated:false};
 const interruption=cityReadingInterruption(director);
 if(interruption)return {state,part,title:director.relief===false?'操作对照：暂时压平地形':'讲解需要恢复',text:interruption,narrated:false};
 const caption=cityReadingCaption(director,cityContinuityAudioSegments(stage));
 return {state,part,title:part.title,text:caption??part.text,narrated:caption!==undefined};
}

export default function CityContinuityReading({director}:{director:Director}){
 const stage=isCityContinuityLessonStage(director.stage)?director.stage:'history';
 const {state,title,text,narrated}=cityContinuityFeedback(director),parts=cityContinuityLessons[stage][state.cityId],control=controls[stage];
 return <div className="city-continuity-reading">
  <CityLocalContext stage={stage} progress={director.sceneProgress} onPause={director.pause}/>
  <nav className="city-continuity-parts" aria-label="当前地方的连续讲解">{parts.map((part,index)=><button type="button" key={part.id} aria-pressed={state.index===index} onClick={()=>director.setProgress(cityContinuityPartProgress(state.cityId,index))}><small>{index+1}</small><span>{part.title}</span></button>)}</nav>
  <fieldset className="city-life-maintenance"><legend>{control.legend}</legend><div><button type="button" aria-pressed={!director.services} onClick={()=>director.setServices(false)}>{control.off}</button><button type="button" aria-pressed={director.services} onClick={()=>director.setServices(true)}>{control.on}</button></div><p>{control.help}操作会暂停，播放恢复完整过程。</p></fieldset>
  <article className="city-life-current city-continuity-current" aria-live="polite"><p className="city-continuity-part-count">{state.index+1} / 3 · 当前地方</p><h2>{title}</h2><p><NarrationCaption text={text} timing={narrated?director.narrationTiming:undefined}/></p></article>
 </div>;
}
