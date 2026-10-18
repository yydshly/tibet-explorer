export type FocusedProcessKind='exchange'|'runoff'|'stewardship';
export interface FocusedProcessState {kind:FocusedProcessKind;progress:number;enabled:boolean}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** One native word clock; manual comparison never advances or seeks it. */
export function focusedProcessState(recording:string,text:string,textProgress:number):FocusedProcessState|undefined{
 const pos=clamp(textProgress)*text.length;
 const between=(a:string,b:string)=>text.includes(a)&&text.includes(b)&&pos>=text.indexOf(a)&&pos<text.indexOf(b);
 const progress=(tokens:string[])=>{
  const anchors=tokens.map(t=>text.indexOf(t));
  if(anchors.some(n=>n<0))return 0;
  let i=anchors.findIndex(n=>pos<n)-1;if(i<0)i=pos<anchors[0]?0:anchors.length-2;
  return clamp((i+clamp((pos-anchors[i])/(anchors[i+1]-anchors[i])))/(anchors.length-1));
 };
 if(recording==='OVERVIEW-history-origins'&&between('再看西部托林','这些是营建'))return {kind:'exchange',enabled:true,progress:progress(['再看西部托林','降曲沃提出问题','阿底峡撰写','再与译师','画面把问题'])};
 if(recording==='OVERVIEW-protection'){
  if(between('雨落在坡面','羌塘的生态管护'))return {kind:'runoff',enabled:pos>=text.indexOf('下渗较多'),progress:progress(['雨落在坡面','未下渗的部分','再进入谷地','下渗较多'])};
  if(between('二〇二三年报道','拉萨遗产保护'))return {kind:'stewardship',enabled:true,progress:progress(['二〇二三年报道','先识别阻隔','再移除妨碍','让两侧活动空间','围栏与动物'])};
 }
 return undefined;
}
export const focusedProcessCopy={
 exchange:{title:'托林 · 从问题到共同翻译',steps:['人物与地方','汇集问题','撰写文本','共同翻译','文本跨越语言'],off:'暂不共同翻译',on:'共同翻译',scope:'据传记研究与The Met资料；书页和活动位置为功能放大示意，不复原手稿、房间、古道。',sources:[
  {title:'周拉、拉毛肖：11—12世纪“道次第”文本研究',url:'https://www.tibetology.ac.cn/2024-08/17/content_42896506.htm'},
  {title:'The Met：Tibet and India',url:'https://www.metmuseum.org/exhibitions/listings/2014/tibet-and-india'}]},
 runoff:{title:'雅鲁藏布江 · 坡面怎样汇水',steps:['同一场雨','下渗与地表分开','沿低处汇集','进入干流'],off:'下渗较少',on:'下渗较多',scope:'真实区域DEM与概览干流；12条坡向为教学计算。12份降水中4/8份下渗是对照设定，非观测比例、雨量或流量；不画正式流域边界。',sources:[
  {title:'USGS：地表径流与下渗',url:'https://www.usgs.gov/water-science-school/science/runoff-surface-and-overland-water-runoff'},
  {title:'USGS：流域与分水岭',url:'https://www.usgs.gov/water-science-school/science/watersheds-and-drainage-basins'},
  {title:'本地高程来源与分辨率',url:'/assets/terrain/tibet-regional-dem.source.json'}]},
 stewardship:{title:'羌塘 · 识别并移除迁徙阻隔',steps:['巡护与监测','识别阻隔','拆除阻隔段','恢复连通','不等于生态已恢复'],off:'保留阻隔段',on:'移除阻隔段',scope:'2023年黄晨巡护报道记录行动；以阿里作地区参照。围栏和动物为机制放大示意，不是实测位置、数量、路线或草地恢复结果。',sources:[
  {title:'西藏日报：全心全意守护“高原精灵”——记黄晨（2023-07-06）',url:'https://www.xzxw.com/al/2023-07/06/content_881465.html'}]},
} satisfies Record<FocusedProcessKind,{title:string;steps:string[];off:string;on:string;scope:string;sources:{title:string;url:string}[]}>;
export function focusedProcessFeedback(s:FocusedProcessState):string{
 if(s.kind==='exchange')return s.progress<.5?'先汇集问题，再形成文本；这些活动说明知识交流如何发生。':s.progress<.75?'正在形成文本：页上的笔画随讲述写入，随后才进入共同翻译。':s.enabled?'合译把已有文本转成另一语言的表达；输出文本出现，不等于已经证明所有人都学会。':'暂停合译：已有文本仍保留，另一语言的文本没有形成。缺的是转换与协作环节，而不是人物是否抵达。';
 if(s.kind==='runoff')return `同样12份示意降水，设定${s.enabled?8:4}份下渗、${s.enabled?4:8}份直接汇流。坡面不变，下渗越多，直接进入干流的部分越少；未模拟地下水的后续补给。`;
 return s.progress<.5?'巡护先识别哪里发生阻隔；保留原地形和两侧活动空间，随后比较是否移除阻隔段。':s.enabled&&s.progress<.75?'正在移除阻隔段；开口尚未完成，移动符号暂留原侧。':s.enabled?'阻隔段移除，移动符号可以穿过开口；改变的是连通条件，不表示植被或种群已经恢复。':'保留阻隔段，移动符号仍停在同一侧；其余地形与条件不变。这是通行机制对照。';
}
