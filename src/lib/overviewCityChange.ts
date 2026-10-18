import {overviewCityChange,type CityChangeState} from '../data/overviewCityChange';
import {overviewCityChangeCore} from '../data/overviewPacing';
import type {OverviewPresentation,OverviewSceneBeat} from './overviewScene';
import type {NarrationTiming} from './narrationTiming';
import {cityAccessPhaseProgress} from './cityAccessState';

const phases=[
 ['历史街区已有','context','已有地方，迎来新的连接','全域进入同一河谷，同时保留南岸站区、拉萨河和北岸城区。'],
 ['二〇〇六年','arrival','2006 · 到站与进城是两件事','铁路把区域抵达带到南岸；跨河与市内接续仍需分别理解。'],
 ['先拿掉柳梧大桥','missing','只拿掉这座桥，看看接续断在哪里','车辆停在归档跨河段的南端。其他现状地物保留；这不是2006年城市复原。'],
 ['二〇〇七年四月三十日','opening','2007 · 新桥把两岸直接接上','同一源几何桥面逐步接回，车辆才能越过拉萨河，继续进入城区。显现顺序不是工程施工顺序。'],
 ['设施怎样变成生活里的机会','organization','2019年采访 · 连通还要经过人的组织','洛桑赤列的具名采访：购车、村委会组织运输队、参与调度。现状道路上的车辆仅解释服务接续，不定位其真实业务线路。'],
 ['到已知路端停下','street','新联系进入已有历史用途','在源道路端点停止；街巷、广场和寺院用途在同一城市里接上。未知入口不补线。'],
 ['最后回到全域','return','从一座桥，回到各地区的变化','把事件、连接和参与分开判断；接着比较东南部铁路与西部航空。'],
] as const;
export function cityChangePresentation(beat:OverviewSceneBeat,raw:number,timing?:NarrationTiming):OverviewPresentation{
 const core=beat.recordingId===overviewCityChangeCore.id;
 if(beat.text!==(core?overviewCityChangeCore:overviewCityChange).narration)throw new Error('城市变化录音与原文不一致');
 const steps=phases.filter(p=>!core||p[1]!=='street').map((p,i)=>i===0&&core?['已有的场所',p[1],p[2],p[3]] as const:p);
 const pos=Math.max(0,Math.min(1,timing?.textProgress??raw))*beat.text.length;
 let i=0;while(i+1<steps.length&&pos>=beat.text.indexOf(steps[i+1][0]))i++;
 const [token,phase,title,explanation]=steps[i],start=beat.text.indexOf(token),end=i+1<steps.length?beat.text.indexOf(steps[i+1][0]):beat.text.length;
 const progress=Math.max(0,Math.min(1,(pos-start)/(end-start))),smooth=(v:number)=>v*v*(3-2*v);
 const between=(a:string,b:string)=>Math.max(0,Math.min(1,(pos-beat.text.indexOf(a))/(beat.text.indexOf(b)-beat.text.indexOf(a))));
 const state:CityChangeState={phase,progress,bridge:i<3?0:phase==='opening'?between('现在接回同一位置的桥面','车辆跨过拉萨河'):1,motion:i<2?0:phase==='missing'?between('先拿掉柳梧大桥','看车辆停在南岸的接桥位置'):phase==='opening'?between('车辆跨过拉萨河','改变的是站区'):phase==='organization'?progress:1};
 return {sceneIdentity:'atlas-local-context',props:{scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:4,season:1,progress:cityAccessPhaseProgress('lhasa','transfer')+.001,selected:'city:lhasa',cutaway:false,comparisonRelief:true,cityLifeServices:true,cityAccessTransfer:true,cityBuiltLayer:false,overviewLocalContext:true,overviewTopic:'connections',overviewReturnMix:phase==='context'?1-smooth(progress):phase==='return'?smooth(progress):0,overviewCityChange:state,
  overviewVisit:{phase:phase==='context'?'context':i<4?'crossing':phase==='organization'?'organization':phase==='street'?'street':'return',progress,motion:state.motion},overviewBarkhor:!core&&i>=5?{phase:'uses',progress,motion:progress}:undefined},
  title,explanation,scale:core?'西藏全域 → 拉萨河两岸 → 全域':'西藏全域 → 拉萨河两岸 → 历史街区 → 全域',year:i===1?'2006年7月1日':i===3?'2007年4月30日':i===4?'2019年采访':undefined,
  sourceScope:'事件依据：2007通车报道、2019具名采访。空间依据：现状OSM相连节点。移除/接回是新桥连接作用的对照，不是历史城市或施工复原；车辆不代表客流、速度或真实业务路线。'};
}
/** Arc length uses the same projected points as the displayed road. Missing
 * source evidence is an error, never an invented bridge midpoint. */
export function bridgeRouteRange(points:{distanceTo(other:any):number}[],ways:readonly string[]){
 const first=ways.indexOf('way/394728357'),last=ways.lastIndexOf('way/394728357');
 if(first<0||ways.length!==points.length-1)throw new Error('柳梧跨河段缺少相连源节点');
 const lengths=points.slice(1).map((p,i)=>p.distanceTo(points[i])),total=lengths.reduce((a,b)=>a+b,0);
 return {start:lengths.slice(0,first).reduce((a,b)=>a+b,0)/total,end:lengths.slice(0,last+1).reduce((a,b)=>a+b,0)/total,first,last};
}
export function cityChangeMotion(state:CityChangeState,range:{start:number;end:number}){
 if(state.phase==='context'||state.phase==='arrival')return 0;
 if(state.phase==='missing')return range.start*state.motion;
 if(state.phase==='opening')return range.start+(range.end-range.start)*state.motion;
 if(state.phase==='organization')return range.end+(1-range.end)*state.motion;
 return 1;
}
