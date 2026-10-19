import type {PilotView} from './routePilot';

/** Existing evidence revisited by the recording's word clock, never a second timer. */
export function pilotClosing(text:string,progress:number,high=.5){
 const at=Math.max(0,Math.min(1,progress))*text.length;
 const part=(a:string,b:string)=>Math.max(0,Math.min(1,(at-text.indexOf(a))/Math.max(1,text.indexOf(b)-text.indexOf(a))));
 const common={progress:1,height:3000,connections:false,lookBack:false,servicesVisible:false};
 if(at<text.indexOf('自然条件解释')){
  const position=at<text.indexOf('沿途高差')?high*part('林芝附近的谷地','沿途高差'):high+(1-high)*part('沿途高差','属于同一段');
  return {phase:'corridor',title:'同一路径：谷地 → 高地 → 鲁朗谷地',scope:'金色为资料阅读进度，非行车实录；高程为地表样本。',view:{...common,mode:'line',progress:position,routeContext:1,elevation:true} satisfies PilotView};
 }
 if(at<text.indexOf('建设、经营'))return {phase:'relief',title:'同一河谷：谷底与两侧坡面',scope:'真实高程与源河段；不把自然条件当作生活方式的唯一原因。',view:{...common,mode:'place',placeMedia:'map',placeLens:'landscape',sectionProgress:.15+.7*part('自然条件解释','建设、经营'),elevation:true} satisfies PilotView};
 if(at<text.indexOf('继续解释地方怎样被使用'))return {phase:'access',title:'从国道接向现状聚落',scope:'依次读出已有地方道路与建筑轮廓，不是历史施工动画。',view:{...common,mode:'place',placeMedia:'map',placeLens:'life',connections:true,connectionProgress:part('建设、经营','继续解释地方怎样被使用')} satisfies PilotView};
 const mapAt=text.indexOf('地图上的观察点');
 if(at<mapAt){
  const reveal=part('继续解释地方怎样被使用','保存一个观察问题');
  return {phase:'life',title:'道路接续之后，看人怎样使用街边空间',scope:'2008年日常实拍；不能由照片推断经营成效或共同维护过程。',view:{...common,mode:'place',placeLens:'culture',connections:true,connectionProgress:1,placeMedia:'daily',placePhoto:'daily',photoOverlay:'daily',photoReveal:Math.min(1,reveal*3),photoFocus:at<text.indexOf('保存一个观察问题')?2:3} satisfies PilotView};
 }
 if(at<text.indexOf('这一段到这里结束')){
  const fade=Math.max(0,Math.min(1,(at-mapAt)/5)),reveal=1-fade*fade*(3-2*fade);
  const view:PilotView=fade<1?{...common,mode:'place',placeLens:'culture',connections:true,connectionProgress:1,placeMedia:'map',photoOverlay:'daily',photoReveal:reveal,photoFocus:3}:{...common,mode:'line',progress:part('地图上的观察点','这一段到这里结束'),routeContext:1};
  return {phase:'evidence',title:'这些是资料观察位置，不是实地停靠建议',scope:'源道路与高程样本可核对；停车、酒店入口和开放条件未核实。',view};
 }
 return {phase:'whole',title:'把地方放回整条来路',scope:'保留已有观察问题，也保留原路段和原句。',view:{...common,mode:'whole'} satisfies PilotView};
}
