import type {PilotView} from './routePilot';

type Shot={at:string;pitch:number;bearing:number;height:number;zoom?:number;focus?:number;weight?:number;context?:number;elevation?:boolean};
/** Shot timing belongs to the existing narration, including pause/reverse seek.
 * No orbit timer, invented geography or new playback duration. */
export function pilotNarratedCamera(index:number,text:string,progress:number,high:number):Partial<PilotView>{
 const shots:Shot[][]=[
  [
   {at:'',pitch:57,bearing:-12,height:3500,zoom:1,focus:0,weight:0},
   {at:'从林芝城区附近',pitch:64,bearing:-8,height:3100,zoom:.36,focus:0,weight:1},
   {at:'青色线保留',pitch:56,bearing:8,height:3500,zoom:1,focus:0,weight:0,context:1},
   {at:'这段归档道路',pitch:63,bearing:-12,height:3500,zoom:1,focus:0,weight:0,context:1},
   {at:'先看起点周围',pitch:66,bearing:-12,height:3100,zoom:.34,focus:0,weight:1},
   {at:'再看道路怎样走向山地',pitch:32,bearing:20,height:3400,zoom:.56,focus:high*.55,weight:1,elevation:true},
   {at:'底图来自',pitch:53,bearing:5,height:3500,zoom:.85,focus:0,weight:.15},
   {at:'白色和阴影',pitch:61,bearing:5,height:3000,zoom:.36,focus:high,weight:1},
   {at:'不能当作全年景观',pitch:57,bearing:5,height:3500,zoom:1,focus:0,weight:0},
   {at:'现在沿道路前进',pitch:40,bearing:0,height:2500},
  ],
  [
   {at:'',pitch:40,bearing:0,height:2500,context:0},
   {at:'身边地面逐渐抬高',pitch:36,bearing:0,height:3000,context:.6,elevation:true},
   {at:'停在山地观察点',pitch:35,bearing:0,height:3000,context:0,elevation:true},
   {at:'向前的视野',pitch:35,bearing:0,height:3000,context:0,elevation:true},
   {at:'这里按沿线',pitch:35,bearing:0,height:3000,context:0,elevation:true},
   {at:'不是实测山口标高',pitch:42,bearing:0,height:3000,context:1,elevation:true},
   {at:'高处较开阔',pitch:35,bearing:0,height:3000,context:.25,elevation:true},
   {at:'继续向鲁朗',pitch:40,bearing:0,height:2800,context:1},
   {at:'道路进入另一侧谷地',pitch:42,bearing:0,height:3000,context:.6},
   {at:'地形、季节',pitch:45,bearing:0,height:3000,context:.18},
   {at:'接下来进入鲁朗',pitch:56,bearing:-20,height:3000,context:0},
  ],
  [
   {at:'',pitch:56,bearing:-20,height:3000},
   {at:'两侧地形',pitch:30,bearing:-38,height:3000,elevation:true},
   {at:'对照林海实拍',pitch:56,bearing:-20,height:2500},
   {at:'回到地图',pitch:67,bearing:0,height:2500},
   {at:'再看草地与放牧',pitch:56,bearing:0,height:2500},
   {at:'再回到刚才',pitch:48,bearing:0,height:3000},
  ],
  [
   {at:'',pitch:48,bearing:-12,height:3000,context:1,elevation:true},
   {at:'自然条件解释',pitch:32,bearing:-32,height:3000,elevation:true},
   {at:'建设、经营',pitch:63,bearing:-5,height:2500},
   {at:'继续解释地方怎样被使用',pitch:56,bearing:-5,height:2500},
   {at:'地图上的观察点',pitch:48,bearing:-12,height:3000,context:1},
   {at:'这一段到这里结束',pitch:57,bearing:-12,height:3500},
  ],
 ];
 const sequence=shots[index]??shots[3],position=Math.max(0,Math.min(1,progress))*text.length;
 const anchors=sequence.map(s=>({...s,offset:s.at?text.indexOf(s.at):0})).filter(s=>s.offset>=0);
 let current=0;while(current<anchors.length-1&&position>=anchors[current+1].offset)current++;
 const b=anchors[current],a=anchors[Math.max(0,current-1)],end=anchors[current+1]?.offset??text.length;
 // Complete the move early in each phrase, then leave time to read the place.
 const f=a===b?1:Math.max(0,Math.min(1,(position-b.offset)/Math.max(1,Math.min(12,(end-b.offset)*.42)))),t=f*f*(3-2*f);
 const mix=(x:number,y:number)=>x+(y-x)*t;
 return {height:mix(a.height,b.height),cameraPitch:mix(a.pitch,b.pitch),cameraBearing:mix(a.bearing,b.bearing),mapZoom:mix(a.zoom??1,b.zoom??1),mapFocus:mix(a.focus??0,b.focus??0),mapFocusWeight:mix(a.weight??0,b.weight??0),routeContext:mix(a.context??0,b.context??0),elevation:b.elevation===true};
}

export const pilotCameraPresets={
 overhead:{cameraPitch:78,cameraBearing:0,elevation:false},
 oblique:{cameraPitch:43,cameraBearing:-18,elevation:false},
 relief:{cameraPitch:28,cameraBearing:22,elevation:true},
} satisfies Record<string,Partial<PilotView>>;
