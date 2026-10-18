import {historyOriginsCue} from '../data/overviewEditorial';
import {overviewHeritageLessons,overviewHeritagePresentation} from './overviewHeritageScene';
import {cityContinuityPartProgress} from './cityContinuityState';
import type {NarrationTiming} from './narrationTiming';
import type {OverviewPresentation} from './overviewScene';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const v=clamp(n);return v*v*(3-2*v);};
/** Reuse the acquired Lhasa footprints and their existing use reading. A word
 * changes the observation, never creates a historical building or boundary. */
export function overviewOriginsPresentation(text:string,raw:number,timing?:NarrationTiming):OverviewPresentation{
 if(text!==historyOriginsCue.narration)throw Error('形成段与原录音不一致');
 const pos=clamp(timing?.textProgress??raw)*text.length;
 const at=(token:string)=>text.indexOf(token);
 const range=(a:string,b:string)=>clamp((pos-at(a))/(at(b)-at(a)));
 const palace=pos>=at('布达拉宫'),west=pos>=at('再看西部托林'),returning=pos>=at('这些是营建');
 const local=pos>=at('地方的用途')&&!west;
 const index=palace?1:0,lesson=overviewHeritageLessons[index];
 const held=overviewHeritagePresentation({id:lesson.id,recordingId:lesson.id,title:lesson.title,text:lesson.narration},1);
 const reading=palace?range('布达拉宫','怎样组织空间'):range('七世纪创建的大昭寺','布达拉宫');
 const partStart=cityContinuityPartProgress('lhasa',index),partEnd=cityContinuityPartProgress('lhasa',index+1);
 const returnMix=west?1:Math.max(1-smooth(range('地方的用途','七世纪创建的大昭寺')),smooth(range('怎样组织空间','再看西部托林')));
 return {...held,sceneIdentity:'atlas-local-context',props:{...held.props,progress:partStart+(partEnd-partStart)*(.44+.4*reading),overviewLocalContext:true,overviewReturnMix:returnMix,layer:local?'atlas-city-comparison':'atlas-overview',selected:west&&!returning?'atlas:tholing-exchange':'city:lhasa',overviewTopic:'history',overviewFocus:west&&!returning?'tholing-exchange':undefined,overviewYear:undefined},
  title:returning?'形成以后，怎样持续进入生活？':west?'1042 · 托林：人物与知识交流':local?palace?'布达拉宫：礼仪、接见与居住':'大昭寺：营建承载宗教活动':'从生活条件转向人的历史行动',
  explanation:returning?'营建与交流解释形成，下面观察学习与实践怎样延续文化。':west?'托林在西部札达；不把狮泉河当作人物目的地，也不复原未经核实的古道。':local?'光带沿现状整体轮廓读取用途；活动说明空间为何被需要，不是古代施工或内部布局复原。':'先保留整体地图，再定位拉萨的已有场所；地形不能直接推出文化。',
  scale:local?'全域 → 拉萨河谷 · 现状地物读取历史用途':'西藏与周边 · 整体地图',year:west&&!returning?'1042年':local&&!palace?'7世纪创建':undefined,
  sourceScope:'沿用UNESCO用途资料、The Met交流资料及已归档OSM整体轮廓。光带表示用途阅读，不是古代施工、室内分区或实际人流。'};
}
