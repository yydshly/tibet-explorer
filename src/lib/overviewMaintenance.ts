import {placeActionPresentation} from './overviewPlaceActions';
import type {OverviewPresentation} from './overviewScene';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** Revisit the documented example within the existing closing sentence. This
 * does not add an event, recording, room reconstruction or a new model. */
export function maintenanceHeritagePresentation(text:string,textProgress:number):OverviewPresentation|undefined {
 const start=text.indexOf('拉萨遗产保护'),back=text.indexOf('理解周边和战略价值'),at=textProgress*text.length;
 if(start<0||back<=start||at<start)return;
 const returning=at>=back,progress=clamp((at-start)/(back-start));
 const held=placeActionPresentation(0,undefined,true);
 const separation=smooth((progress-.3)/.5);
 return {...held,title:returning?'把通道、上下游与地方使用放回整体':'回看前例：保护之后，供灯仍然继续',
  explanation:returning?'通道需要接续，河流连接上下游，遗产仍承载地方使用；三种联系需要不同的维护。':'2005年监测所见：多数供灯转至寺前，活动保留，火源与木构分开。这里回看前面的案例，不能推论全部遗产保护成效。',
  props:{...held.props,overviewPlaceAction:{caseId:'jokhang',phase:returning?'return':separation>0?'separate':'lamps',progress:1,separation:returning?1:separation,activity:0},
   overviewUrban:{phase:returning?'return':'barkhor',progress:1,year:2005,showChange:false},
   overviewReturnMix:returning?smooth((at-back)/(text.length-back)):1-smooth(progress/.3)},
  scale:returning?'拉萨局部 → 西藏全域':'全域 → 拉萨 → 大昭寺活动空间',year:'回看2005年监测记录'};
}
