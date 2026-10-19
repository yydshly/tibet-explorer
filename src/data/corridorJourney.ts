import {routePilotCues,pilotNarratedView,type PilotView} from './routePilot';
import {tongmaiCues,tongmaiNarratedView,type TongmaiView} from './tongmaiJourney';
import {bomiCues,bomiNarratedView,type BomiView} from './bomiJourney';
export const corridorPath='/routes/g318-east/whole';
export const corridorPositionKey='tibet-explorer.corridor-position.v1';
export const corridorCues=[
 {id:'ROUTE-G318-corridor-opening',title:'先把整条来路放在一起',chapterId:'corridor',stepId:'R00',narration:'先把这条来路放在一起。从林芝城区附近向东，经过色季拉山地、鲁朗和通麦，到波密县城附近。沿真实道路看地形怎样变化，再进入地方，观察风景、生活与人文怎样相连。'},
 {id:'ROUTE-G318-corridor-closing',title:'五个位置，同一条来路',chapterId:'corridor',stepId:'R08',narration:'把五个位置放回同一条路。林芝看城市与河谷，色季拉山地比较高差，鲁朗看道路、河流和生活空间。通麦看跨河与穿山，波密看风景进入街道生活。风景、人文和交通在沿线相遇。选一个已经看过的对象，带着问题和出处保存到观察计划；返回时，继续原来的画面和原句。这是资料观察，不是已核实的出行行程。'},
] as const;
const clips=[corridorCues[0],routePilotCues[0],routePilotCues[1],routePilotCues[2],tongmaiCues[0],tongmaiCues[1],bomiCues[0],bomiCues[1],corridorCues[1]];
export const corridorBeats=clips.map((c,i)=>({id:`CORRIDOR-${i}`,recordingId:c.id,text:c.narration,sceneIdentity:`corridor-${i===0||i===8?'overview':i<4?'pilot':i<6?'tongmai':'bomi'}`}));
export type CorridorView={kind:'overview';focus:number;read:number;overhead:boolean}|{kind:'pilot';value:PilotView}|{kind:'tongmai';value:TongmaiView;object:0|1|2}|{kind:'bomi';value:BomiView};
export const corridorShots=[
 ['R00','先认整条来路','五个位置，沿路向东',0,20],['R01','林芝 · 城市河谷','先看城、河与路，再走向山地',1,35],['R02','色季拉山地 · 高差','山体遮挡与道路绕行改变视野',2,60],
 ['R03','鲁朗 · 谷地空间','河流、道路与房屋怎样相处',3,45],['R04','鲁朗 · 日常与人文','生活实拍与风俗文字分开阅读',3,65],
 ['R05','沿主路进入峡谷','地方接续回到真实国道节点',4,30],['R06','通麦 · 跨河穿山','桥隧改变连接，地形仍在',5,70],['R07','波密 · 街道生活','沿同一来路，进入另一处地方',6,50],['R08','回看整线 · 带走问题','可选保存，再回原画面与原句',8,35],
] as const;
export type CorridorEdit={version:1;durations:number[];tongmaiEnd:number;lulangCultureRaw:number;totalSeconds:number;shotSeconds:number[];markers:{name:string;role:string;coordinate:number[];sourceNode:number;index:number}[]};
const fraction=(text:string,phrase:string)=>{const i=text.indexOf(phrase);if(i<0)throw Error(`Missing corridor phrase ${phrase}`);return i/text.length;};
export function corridorShot(index:number,p:number){return index===0?0:index===1?1:index===2?2:index===3?(p<fraction(clips[3].narration,'认识人文')?3:4):index===4?5:index===5?6:index<8?7:8;}
export function corridorNarratedView(index:number,p:number,high=.5):CorridorView{
 if(index===0||index===8){const text=clips[index].narration,terms=index===0?['林芝','色季拉','鲁朗','通麦','波密']:['林芝','色季拉','鲁朗','通麦','波密'];let focus=-1;
  for(let i=0;i<5;i++)if(p>=fraction(text,terms[i]))focus=i;
  if(p>=fraction(text,index===0?'沿真实道路':'风景、人文'))focus=-1;
  return {kind:'overview',focus,read:index===8?1:Math.min(1,p/fraction(text,'沿真实道路')),overhead:false};
 }
 if(index<4)return {kind:'pilot',value:pilotNarratedView(index-1,clips[index].narration,p,high)};
 if(index<6)return {kind:'tongmai',value:tongmaiNarratedView(index-4,p),object:index===5?(p<fraction(clips[5].narration,'河流和可见')?0:p<fraction(clips[5].narration,'可见施工')?1:2):0};
 return {kind:'bomi',value:bomiNarratedView(index-6,p)};
}
export const corridorTransitions=[
 '先把整线定位，再进入起点的城市河谷。','城市周围的谷地，是接下来跨山比较的参照。','同一道路进入另一侧谷地，接着看鲁朗的水、路与居住。','谷地空间也被人使用，继续看日常与文化资料。','地方支路接回真实国道节点，沿主路继续走。','峡谷中的两条河，把问题带到跨河与穿山。','桥隧接续后，沿同一原路去往波密。','街道生活放回谷地，再把五处放回整条线路。','整线结束；观察计划是可选带走的问题，随时回到原句。',
];
