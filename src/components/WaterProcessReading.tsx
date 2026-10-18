import {waterProcessReading} from '../lib/waterProcess';
import {livingLandscapeState} from '../data/livingUnderstanding';
import type {SceneSettings} from '../lib/store';
import './water-process.css';

export default function WaterProcessReading({stepId,settings,compact=false}:{stepId:string;settings:SceneSettings;compact?:boolean}){
 const cloud=['C5','C6'].includes(stepId),living=['E3','P3'].includes(stepId);
 if(!cloud&&!living)return null;
 const water=waterProcessReading(settings.progress,settings.airMoisture),use=livingLandscapeState(settings);
 const useTitle={source:'有水源，尚未取用',fill:'在取水处装水',carry:'人沿坡面携水到用水处',store:'倒入容器，形成可取用的储水'}[use.waterStage as 'source'|'fill'|'carry'|'store'];
 const lines=cloud?[water.air,water.cloud,water.rain]:[
  '山坡和水源保持原设定',use.carriedWater===0?'携水容器此刻为空':use.pour>0?'携带的水逐渐转入储水容器':'水在容器里随人移动',use.storedWater===0?'用水处尚无这次运来的储水':'储水来自人的搬运与倒入'];
 return <section className={compact?'water-state-hud':'water-state-reading'} aria-label={compact?'当前三维水过程状态':cloud?'空气与水的当前状态':'水怎样接到生活'}>
  <strong>{cloud?'跟踪同一团空气与水':useTitle}</strong>
  {compact?<p>{cloud?(settings.progress<.62?water.cloud:water.rain):lines[1]}</p>:<ol>{lines.map(text=><li key={text}>{text}</li>)}</ol>}
  <small>{cloud?(compact?'金线：气流 · 青点：水汽符号 · 白滴：云水':water.comparison):compact?'取水 → 携水 → 倒入 · 定性原理':`${use.settingLabel} · ${use.supportLabel}；没有测算供水量或组织优劣。`}</small>
 </section>;
}
