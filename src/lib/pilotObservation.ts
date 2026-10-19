import {routePilotCues,routePilotSources,type PilotView} from '../data/routePilot';
import {lulangDisplayView,lulangSelectedPhoto} from '../data/lulangLife';
import type {PilotNote,PilotReturn} from './routePilotStore';

/** A saved reading of existing evidence, never a generated travel itinerary. */
export function pilotObservation(origin?:PilotReturn){
 if(!origin)return undefined;
 const view:PilotView=lulangDisplayView(origin.view),photo=view.mode==='place'&&['town','daily'].includes(view.placeMedia??'')?lulangSelectedPhoto(view):undefined;
 const focus=photo?.features[Math.max(0,Math.min(2,Math.trunc(view.photoFocus??0)-1))];
 const selected=photo&&(view.photoFocus??0)>0?focus:undefined;
 const questions:Record<string,string>={
  town:'河流、道路与房屋怎样分布？照片中能直接辨认哪些空间连接？',
  daily:'门面、门前活动和相邻空间怎样被共同使用？哪些是画面可见，哪些还需核实？',
  forest:'林地坡面和开敞地怎样交错？这张照片还不能解释哪些形成原因？',
  meadow:'溪流、草地和围栏怎样分布？哪些用途仍不能只凭照片判断？',
  grazing:'山林、草地与放牧活动怎样共处？如何区分拍摄当年的记录和今天的情况？',
 };
 return {
  title:photo?`${photo.title}${selected?` · ${selected.title}`:''}`:routePilotCues[origin.beatIndex].title,
  photo,selected,
  question:photo?questions[photo.id]??'这份资料能直接支持什么观察，哪些结论还需要核实？':view.mode==='place'?'谷底与两侧坡面有什么高低差异？国道怎样接向地方道路和聚落？':'沿同一道路，出发谷地、沿线高地和鲁朗谷地怎样接续？位置改变后视野怎样变化？',
  boundary:photo?photo.scope:'道路与高程为归档资料阅读，不是实时导航、实测山口标高或实地停靠建议。',
  sources:photo?[{title:`${photo.author} · ${photo.date} · 原始照片`,url:photo.source},{title:photo.license,url:photo.licenseUrl}]:routePilotSources.filter(s=>s.url.endsWith('/manifest.json')||s.url.endsWith('/observations.json')),
  returnDescription:`${routePilotCues[origin.beatIndex].title} · 原讲述${Math.round(origin.raw*100)}%`,
 };
}
export function appendPilotQuestion(note:string,question:string){
 if(note.includes(question))return note;
 const next=note+(note?'\n\n':'')+question;
 return next.length<=2000?next:note;
}
export function pilotPlanMarkdown(note:PilotNote){
 const observation=pilotObservation(note.observation??note.returnTo),lines=['# G318 林芝—鲁朗 · 我的资料观察计划','','这是资料观察与研读计划。实地交通、开放、许可及进入条件尚需按日期核实。',''];
 if(observation){
  lines.push('## 保存的观察',observation.title,'',`观察记录位置：${observation.returnDescription}`,'');
  if(observation.selected)lines.push(`当前对象：${observation.selected.title}`,`已有资料说明：${observation.selected.detail}`,'');
  lines.push('待观察问题：'+observation.question,'','资料边界：'+observation.boundary,'','## 出处与许可',...observation.sources.map(s=>s.url.startsWith('/')?`- ${s.title}（本项目归档：${s.url}）`:`- [${s.title}](${s.url})`),'');
 }
 lines.push('## 我的笔记',note.note||'（尚未填写）','','工布新年的活动记录是另行查阅的文献资料，不把街边日常照片当作节庆现场。');
 return lines.join('\n');
}
