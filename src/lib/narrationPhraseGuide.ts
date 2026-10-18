import type {SceneSettings} from './store';
import type {EarthNarrationTiming} from './earthNarrationState';
import type {NarrationScenePhrase} from './narrationScenePhrase';
import {deepLandscapePhrases} from '../data/deepLandscapePhrases';
import {deepNaturePhrases} from '../data/deepNaturePhrases';
import {deepCultureHistoryPhrases} from '../data/deepCultureHistoryPhrases';
import {deepConnectionsPhrases} from '../data/deepConnectionsPhrases';

/** Text anchors are literal UTF-16 ranges in the exact recording's script.
 * Scene ranges are existing qualitative model parameters, never time stamps,
 * measured weather or inferred word alignment. */
type Phrase=NarrationScenePhrase;
const p=(token:string,targets:string[],title:string,explanation:string,settings?:Partial<SceneSettings>,from?:number,to=from):Phrase=>({token,targets,title,explanation,settings,from,to});
const plateau={layer:'plateau',selected:'plateau'};
const terrain={layer:'terrain',selected:'',cutaway:false};
const rain={layer:'rain',cutaway:false};
const water={layer:'water',cutaway:true};
const bindings:Record<string,Phrase[]>={
 ...deepLandscapePhrases,
 ...deepNaturePhrases,
 ...deepCultureHistoryPhrases,
 ...deepConnectionsPhrases,
 'G2-opening':[
  p('现在知道',['earth'],'保留完整地球 · 带着环境找地方','海陆与空气仍是周围背景，先辨认整体再逐层靠近。',{layer:'globe',selected:''}),
  p('先找到亚洲这个洲',['asia'],'亚洲 · 洲的尺度','洲和国家是不同层级，亚洲位置以开放注意标记提示。',{layer:'asia',selected:'asia'}),
  p('再找到中国这个国家',['china'],'中国 · 国家的范围','沿真实概化国界找国家，边界不是实测地形或交通线。',{layer:'china',selected:'china'}),
  p('最后沿中国西南',['china','tibet'],'中国西南 · 找到西藏自治区','自治区属于中国；全国与自治区范围保留相对关系。',{layer:'tibet',selected:'tibet'}),
  p('拉萨只是其中一座城市',['lhasa','tibet'],'拉萨 · 只是自治区中的一座城市','城市定位点不能代表整个西藏，范围和点分别辨认。',{layer:'tibet',selected:'lhasa'}),
  p('逐层靠近时',['tibet','indian-ocean'],'目标仍有周边 · 海陆不会消失','保留西藏与海洋的方位联系，再问外部条件怎样影响这里。',{layer:'tibet',selected:'tibet'}),
 ],
 'G2-explain':[
  p('从西藏向南看',['himalaya','indian-ocean'],'先辨南侧 · 山系、陆地与海洋','这些对象在同一地球上有实际方位，注意引线不是交通路线。',{layer:'surroundings',selected:''}),
  p('海洋的水蒸发',['indian-ocean'],'海洋蒸发 · 水分进入空气','先认水汽来源，再看季节环流怎样参与输送。',{layer:'moisture',selected:''}),
  p('夏季环流',['indian-ocean'],'夏季南侧联系 · 部分水汽进入藏东南','蓝色路径只解释可能联系，不是某日风场或实测轨迹。',{layer:'moisture',selected:''}),
  p('西侧来流',['central-asia'],'西侧来流 · 也可能携带水汽','不能把西风统一称为干风，实际作用还要分季节和位置。',{layer:'moisture',selected:''}),
  p('途中山系',['himalaya','plateau'],'经过山地 · 抬升或绕行','山系改变空气经过的条件，并非一堵完全封闭的墙。',{layer:'moisture',selected:''}),
  p('所以',['tibet','indian-ocean'],'认识西藏 · 还要看边界以外','地方环境与外部海陆、来流和地形共同相连。',{layer:'surroundings',selected:''}),
 ],
 'G2-observe':[
  p('西藏在赤道以北',['earth-equator','tibet'],'北半球 · 先用赤道辨方向','纬度提供照射背景，不能据此直接判断地方气温。',{layer:'latitude',selected:''}),
  p('属于北温带',['earth-temperate','tibet'],'北温带 · 纬度范围不是气候类型','同属纬度带，不意味着处处温和或具有同样降水。',{layer:'zones',selected:''}),
  p('高地常比邻近低地冷',['plateau'],'加入海拔 · 对比邻近高低位置','纬度之外还要考虑高度，模型没有计算某地的实际温差。',plateau),
  p('现在把目光从纬线转向青藏高原',['himalaya','plateau'],'低地与高原 · 看相邻的空间','把高山、广阔高地和南侧低地分别辨认，再追问它们如何形成。',plateau),
 ],
 'G2-bridge':[
  p('青藏高原',['plateau','tibet'],'自然高地与行政区 · 两种范围','青藏高原跨越行政范围，不能与西藏自治区画上等号。',plateau),
  p('我们已经知道',['plateau','indian-ocean'],'高地处在海陆和空气来路中','在同一地球上保留外部联系，接下来再问高度的形成。',plateau),
  p('接下来追问',['himalaya','plateau'],'从位置走向成因 · 地面为什么高','形成原理和今天的真实高程是不同材料，之后要相互参照。',plateau),
 ],
 'G4-opening':[
  p('从形成过程回到今天',['terrain-interior'],'保留整片地形 · 回到今天','形成过程结束以后，眼前用公开高程辨认今天的地面。',terrain),
  p('南侧低地',['terrain-himalaya','terrain-interior'],'低地、山系、高原 · 连续的地面','山地北侧不是立刻回到低地，要在整体地形上比较。',terrain),
  p('接下来沿同一条南北线',['terrain-himalaya','terrain-interior'],'同一南北线 · 用共同基准比较','先固定剖面方向，再把低地、高点与内部高地放在海平面基准上。',terrain),
 ],
 'G4-explain':[
  p('从南侧低地开始',['terrain-probe'],'① 山前低地 · 约50米','先读89°E、26°N的源网格样点，不把样点当测绘城镇或山峰。',{layer:'relief',readingFraction:(26-25)/13}),
  p('沿同一条线向北',['terrain-probe'],'② 山地高点 · 约5300米','沿89°E同一剖面读所选山地高点，网格点不是峰顶测量。',{layer:'relief',readingFraction:(28.046875-25)/13}),
  p('继续走进高原内部',['terrain-probe'],'③ 高原内部 · 仍接近5000米','读到33°N时地面仍很高，广阔高地与一座高山并不是同一对象。',{layer:'relief',readingFraction:(33-25)/13}),
  p('读数来自',['terrain-probe'],'同一网格 · 数值与垂直夸张分开','读数来自源高程，立体显示夸张不改变所读取的实际米值。',{layer:'relief',readingFraction:(33-25)/13}),
 ],
 'G4-observe':[
  p('可以移动',['terrain-interior','terrain-himalaya'],'移动剖面 · 比较不同位置','手动拖动和转动帮助辨认地形关系，不应把剖面固定成唯一答案。'),
  p('展开剖切时',['terrain-probe'],'剖切显示高程 · 不表示地下岩层','当前切面是地形高度的读法，地下构造属于另一类证据。'),
  p('保留南侧海洋',['terrain-himalaya','terrain-interior'],'保留方向 · 追问空气遇到什么','真实高差为下段空气抬升与水分去向提供空间参照。'),
 ],
 'G4-bridge':[
  p('现在已经比较过',['terrain-himalaya','terrain-interior'],'保留真实高差 · 再追踪来流','低地、山系和高原内部保留在同一幅地形里。'),
  p('接下来保留地球与亚洲',['terrain-southeast'],'从整体背景 · 走近同一片山地','下一段用同一地球靠近亚洲，再看山地怎样参与空气运动。'),
  p('再比较林芝',['terrain-yarlung','terrain-southeast'],'地区条件 · 接到城市和生活','环境差异要继续与具体水源、土地和通行条件相联系。'),
 ],
 'C4-arrival':[
  p('地球上的空气循环',['circulation-ocean'],'完整地球 · 海陆与空气相连','先保留全球背景，再靠近亚洲海陆与同一片高原。',undefined,0,.3),
  p('保留印度洋和亚洲大陆',['circulation-south','circulation-west'],'靠近亚洲 · 先认空气来路','外部联系是方向示意，不能当作测量的风场。',undefined,.3,.68),
  p('夏季南侧水汽联系',['circulation-south'],'南侧水汽联系 · 夏季较突出','季节背景只提供部分解释，实际输送受高度和天气影响。',undefined,.68,.8),
  p('西侧系统也能携带水汽',['circulation-west'],'西侧系统 · 也能搬运水汽','保留西侧来向，不能由方向单独判定干湿。',undefined,.8,.9),
  p('先记住来路',['circulation-plateau'],'同一片真实地形 · 接着看怎样改变来流','高程与示意气流具有不同身份，但共享地理位置。',undefined,.9,1),
 ],
 'C4-uplift':[
  p('现在地球仍在脚下',['cloud-inflow'],'同一地球上的高差 · 先找空气','眼前起伏来自公开高程，气团是沿地形讲解的示意。',undefined,0,.1),
  p('跟随藏东南方向',['cloud-inflow'],'藏东南来流 · 靠近山坡','跟随同一示意气团，路径不代表所有真实空气来流。',undefined,.1,.3),
  p('沿高差上升',['cloud-lift'],'沿真实高差 · 空气上升','高差参与抬升，气团始终高于所用的源地形表面。',undefined,.3,.6),
  p('进入较低气压环境后',['cloud-lift'],'较低气压环境 · 膨胀冷却','保持同一气团，大小和颜色说明关系而不是实测体积或温度。',undefined,.6,1),
  p('实际空气也可能绕行',['cloud-lift'],'还可能绕行 · 不是唯一解释路径','保持地形和气团位置，不能把示意路径当成所有来流。',undefined,1,1),
 ],
 'C4-cloud':[
  p('山体不变',['cloud-inflow'],'固定山体 · 再看气态水','先保留地形，气团内部标记还不是已经形成的云滴。',undefined,0,.05),
  p('起初气团带着气态水',['cloud-inflow'],'水汽 · 仍是气态水','沿同一气团辨认携带的水分，尚未展开云和降水。',undefined,.05,.25),
  p('抬升冷却后',['cloud-lift'],'抬升与冷却 · 成云的条件','先看到抬升冷却，再谈是否满足凝结条件。',undefined,.25,.4),
  p('满足条件才凝结成云滴',['cloud-condense'],'条件满足 · 凝结成云滴','白色团簇在冷却后逐渐出现，成云不是已经降雨。',undefined,.4,.55),
  p('云滴继续增长',['cloud-condense'],'云滴增长 · 还需形成降水','保持同一气团中的云，继续区分增长与到达地面的降水。',undefined,.55,.62),
  p('才可能有降水到达地面',['cloud-precipitation'],'形成降水 · 落到真实地表','蓝色降水符号落向源高程表面，不给出虚构雨量。',undefined,.62,.86),
  p('随后水沿坡面',['cloud-runoff'],'到达地面 · 再沿坡向低处流动','坡面水的去向接续降水，不能把示意路径当实测河道。',undefined,.86,1),
  p('暂停并改成较少水汽',['cloud-lift'],'固定地形与进度 · 比较初始水汽','操作只改变初始水汽条件，不由讲解自动替用户切换。',undefined,1,1),
 ],
 'C4-regions':[
  p('把镜头拉回',['nyingchi'],'保留同一高原 · 比较地区位置','先保留整体，再分别读林芝、拉萨与阿里的条件。',{selected:'nyingchi'},0,0),
  p('林芝、',['nyingchi'],'林芝 · 藏东南的位置','城区参考点不代表整片行政区内所有坡面。',{selected:'nyingchi'},0,0),
  p('拉萨和',['lhasa'],'拉萨 · 南部河谷的位置','把河谷放回周围高地，不能让城市点代替整个地区。',{selected:'lhasa'},.5,.5),
  p('阿里的位置',['ngari'],'阿里 · 西部高原的位置','先定位西部地区，再看不同来流和地形条件。',{selected:'ngari'},1,1),
  p('藏东南的水汽联系',['nyingchi'],'藏东南 · 水汽、通道和较低河谷','地区差异来自条件组合，不只是一个干湿标签。',{selected:'nyingchi'},0,0),
  p('拉萨的河谷位置',['lhasa'],'拉萨河谷 · 不等于整个行政区','保留局部与地区的尺度差异，再与其他地方对照。',{selected:'lhasa'},.5,.5),
  p('阿里仍会受到',['ngari'],'阿里 · 季风与西侧系统共同影响','不能用单一风向，给整个地区判定全年干湿。',{selected:'ngari'},1,1),
 ],
 'C4-life':[
  p('现在保留',['circulation-plateau'],'保留城市位置 · 从环境接到生活','水源、土地与谷地通行都要放回地区地形中认识。',undefined,0,.5),
  p('这些条件并不自动决定',['circulation-plateau'],'自然提供条件 · 人还需要实践与组织','设施、历史与人的选择共同参与生活，不能由气候直接推出文化。',undefined,.5,1),
 ],
 'C5-opening':[
  p('上一步认识了',['cloud-inflow'],'来到山坡 · 先看携水汽的空气','从没有本次云雨的起点认识条件，不能把来流等同于下雨。'),
  p('湿润空气遇到地形时',['cloud-lift'],'地形可能抬升空气 · 不保证下雨','先认抬升条件，具体云雨还取决于水汽和空气状态。'),
  p('我们先从没有云雨的起点',['cloud-inflow'],'保持无云雨起点 · 逐步加入条件','下一段再依次展开冷却、凝结、增长与降落。'),
 ],
 'C5-explain':[
  p('金色轮廓',['cloud-lift'],'同一团空气 · 金色轮廓追踪','青点代表气态水，先认空气和水汽的不同身份。',rain,0,.2),
  p('现在沿坡上升',['cloud-lift'],'沿坡上升 · 进入较低气压环境','固定同一山体，追踪同一空气团沿解释路径上升。',rain,.2,.36),
  p('进入较低气压环境',['cloud-lift'],'气压降低 · 膨胀和冷却','空气体积与颜色用于解释关系，没有实际温度或气压读数。',rain,.36,.43),
  p('继续冷却到合适条件',['cloud-lift'],'继续冷却 · 等待凝结条件','先保留冷却状态，下一句才逐渐出现凝结云滴。',rain,.43,.43),
  p('部分水汽凝结成白色云滴',['cloud-condense'],'水汽凝结 · 白色云滴逐渐出现','凝结把部分气态水转为云滴，有云不等于已经下雨。',rain,.43,.6),
  p('成云以后还要增长',['cloud-condense'],'云滴继续增长 · 不能跳过中间条件','先保留已形成的云，再辨认小滴合并与变大。',rain,.6,.64),
  p('放大处能看到小滴合并',['cloud-condense'],'放大读取 · 小滴合并','这是增长机制示意，没有真实滴径或当地观测量。',rain,.64,.65),
  p('较大水滴才开始下落',['cloud-precipitation'],'较大水滴 · 开始下落','下落接在凝结和增长之后，蓝色符号不是测量雨量。',rain,.65,.82),
  p('水到地表以后',['cloud-runoff'],'水到地表 · 再沿坡汇流','地表过程接续降水，保留原山体并展开水的去向。',water,.82,.9),
  p('部分进入土壤',['cloud-runoff'],'土壤入渗 · 与坡面汇流分开认','剖面用于辨认部分入渗关系，不表示实测地下水或流量。',water,.9,1),
 ],
 'C5-observe':[
  p('现在保持同一山体',['cloud-lift'],'固定地形和进度 · 比较条件','保留同一山体，只由用户操作改变初始水汽。'),
  p('空气仍会抬升',['cloud-lift'],'仍然抬升 · 结果可以不同','本设定的较少水汽没有形成地面降水，不能推广到所有天气。'),
  p('可以回拖观察',['cloud-lift','cloud-condense'],'回拖条件链 · 来流、有云与降雨分开','操作回拖用于辨认先后，示意不代表真实时刻或当地实况。'),
 ],
 'C5-bridge':[
  p('这个过程说明',['cloud-lift','cloud-condense'],'山地参与云雨 · 原理不是实况','过程解释条件，没有报告某日某处的真实降水量。'),
  p('下一步保留同一山地',['cloud-precipitation'],'转向一次天气 · 阅读发生顺序','继续区分来流、云发展和降水前后，真实事件仍需要对应观测。'),
 ],
};
function compileNarrationPhraseBindings(cueId:string,text:string){return(bindings[cueId]??[]).flatMap((phrase,index)=>{const start=text.indexOf(phrase.token);return start<0?[]:[{...phrase,to:phrase.to??phrase.from,targets:[...phrase.targets],textStart:start,phraseId:`${cueId}:text-${index}`}];}).sort((a,b)=>a.textStart-b.textStart).map((phrase,index,all)=>({...phrase,textEnd:all[index+1]?.textStart??text.length,at:phrase.textStart/text.length,relation:phrase.targets.length>1?'compare' as const:'focus' as const}));}
type CompiledPhrase=ReturnType<typeof compileNarrationPhraseBindings>[number];
const compiledBindings=new Map<string,CompiledPhrase[]>();
const MAX_COMPILED_BINDINGS=192;
function cachedNarrationPhraseBindings(cueId:string,text:string):CompiledPhrase[]{
 // Complete source text is part of the identity: a legacy or edited recording
 // cannot borrow the current script's offsets. Retain only bounded pure data,
 // never progress, playback time, manual settings or a mutable guide result.
 if(!Object.hasOwn(bindings,cueId))return [];
 const key=JSON.stringify([cueId,text]),cached=compiledBindings.get(key);
 if(cached)return cached;
 const phrases=compileNarrationPhraseBindings(cueId,text);
 if(compiledBindings.size>=MAX_COMPILED_BINDINGS)compiledBindings.delete(compiledBindings.keys().next().value!);
 compiledBindings.set(key,phrases);return phrases;
}
export function narrationPhraseBindings(cueId:string,text:string){
 // Public readers may manipulate their copy without poisoning later playback.
 return cachedNarrationPhraseBindings(cueId,text).map(phrase=>({...phrase,targets:[...phrase.targets],...(phrase.settings?{settings:{...phrase.settings}}:{})}));
}
export function narrationPhraseGuide(cueId:string,text:string,progress:number,timing?:EarthNarrationTiming){
 const phrases=cachedNarrationPhraseBindings(cueId,text);if(!phrases.length)return;
 const textProgress=Math.max(0,Math.min(1,Number.isNaN(timing?.textProgress??progress)?0:timing?.textProgress??progress)),position=textProgress*text.length;let index=0;while(index+1<phrases.length&&position>=phrases[index+1].textStart)index++;
 const phrase=phrases[index],local=Math.max(0,Math.min(1,(position-phrase.textStart)/Math.max(1,phrase.textEnd-phrase.textStart)));
 return {cueId,progress,active:true,beatId:phrase.phraseId,phraseId:phrase.phraseId,targets:[...phrase.targets],title:phrase.title,explanation:phrase.explanation,relation:phrase.relation,actionProgress:local,drawProgress:Math.min(1,local/.65),textProgress,timingPrecision:timing?.precision??'estimated',textStart:phrase.textStart,textEnd:phrase.textEnd,sceneSettings:phrase.settings?{...phrase.settings}:phrase.from!==undefined?{}:undefined,sceneProgress:phrase.from===undefined?undefined:phrase.from+(phrase.to!-phrase.from)*local};
}
