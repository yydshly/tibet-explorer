import {overviewNarrationCues} from '../data/overviewNarration';
import type {NarrationTiming} from './narrationTiming';
import type {OverviewPresentation,OverviewSceneBeat} from './overviewScene';

type Stop={token:string;layer:string;targets:string[];title:string;explanation:string};
const plans:Record<string,Stop[]>={
 'OVERVIEW-position':[
  {token:'先从完整地球',layer:'globe',targets:['earth'],title:'完整地球：先保留海陆与空气',explanation:'从整体建立位置，不预先假定已经理解气候差异。'},
  {token:'镜头靠近亚洲',layer:'asia',targets:['asia'],title:'亚洲：洲的尺度',explanation:'先确认所在的洲，再进入国家和地区。'},
  {token:'再辨认中国',layer:'china',targets:['china'],title:'中国：国家的尺度',explanation:'西藏自治区位于中国西南，国家与自治区是不同层级。'},
  {token:'中国西南的西藏自治区',layer:'tibet',targets:['china','tibet'],title:'中国西南：西藏自治区',explanation:'逐层靠近时，海陆背景仍保留在同一地球上。'},
  {token:'青藏高原则是',layer:'plateau',targets:['tibet','plateau'],title:'行政范围与自然高地分别认识',explanation:'青藏高原跨越行政范围，自然过程与行政统计不可混用。'},
  {token:'位置确定以后',layer:'surroundings',targets:['tibet','indian-ocean','central-asia'],title:'位置明确，再问外界怎样影响这里',explanation:'下一章解释共同的热量和空气运行机制，再把来流带回高地。'},
 ],
 'OVERVIEW-formation-entry':[
  {token:'位置与全球来流',layer:'globe',targets:['earth'],title:'把全球来流重新接回目标',explanation:'前一章说明空气怎样输送热和水，现在回到已定位的高地。'},
  {token:'现在回到亚洲',layer:'asia',targets:['asia'],title:'亚洲：先找到高原的周围',explanation:'海洋、南侧低地与大陆内部共同构成来流背景。'},
  {token:'先把高原',layer:'surroundings',targets:['plateau','indian-ocean','himalaya'],title:'高地与周边低地、海洋同图',explanation:'先保留空间关系，再切换到形成原理的解释。'},
  {token:'再问这片高地怎样形成',layer:'plateau',targets:['plateau'],title:'从在哪里，转向为何形成',explanation:'下一画面改变表达尺度，概念剖面解释变形，不复原古代地表。'},
  {token:'看懂原理以后',layer:'plateau',targets:['plateau','himalaya'],title:'形成原理之后，再核对真实高程',explanation:'概念剖面与今日实测高程各自回答不同的问题。'},
 ],
};

export function overviewOrientationPresentation(beat:OverviewSceneBeat,raw:number,timing?:NarrationTiming):OverviewPresentation {
 const cue=overviewNarrationCues.find(item=>item.id===beat.recordingId),plan=plans[beat.recordingId];
 if(!cue||cue.narration!==beat.text||!plan)throw new Error(`总览定位录音与原文不一致：${beat.id}`);
 const textProgress=Math.max(0,Math.min(1,timing?.textProgress??raw)),position=textProgress*beat.text.length;
 let index=0;while(index+1<plan.length&&position>=beat.text.indexOf(plan[index+1].token))index++;
 const stop=plan[index],start=beat.text.indexOf(stop.token),next=plan[index+1],end=next?beat.text.indexOf(next.token):beat.text.length;
 const drawProgress=Math.max(0,Math.min(1,(position-start)/Math.max(1,end-start)));
 return {sceneIdentity:'journey:G2',props:{scene:'earth',viewKey:'G2',step:1,season:1,layer:stop.layer,selected:stop.targets[0],progress:drawProgress,cutaway:false,
  guide:{cueId:beat.recordingId,progress:raw,active:true,beatId:`${beat.recordingId}:${index}`,targets:[...stop.targets],drawProgress:Math.max(.06,drawProgress),relation:stop.targets.length>1?'compare':'focus',title:stop.title,explanation:stop.explanation,textProgress}},
  title:stop.title,explanation:stop.explanation,scale:'完整地球 → 亚洲 → 中国 → 西藏与自然高原',sourceScope:'NASA地表影像与Natural Earth概览参考范围；边线不是精密测绘，不代表地形或气候边界。'};
}
