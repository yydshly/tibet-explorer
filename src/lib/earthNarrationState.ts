/** Native subtitle sentences identify text ranges; interpolation within a
 * sentence remains an estimate, never a claim of provider word timestamps. */
export interface EarthNarrationTiming{textProgress:number;spokenText?:string;textStart?:number;textEnd?:number;precision:'provider'|'estimated'}
type Beat={token:string;action:string;targets:string[];title:string;explanation:string;comparison?:string};
export interface EarthNarrationMoment{phraseId:string;action:string;progress:number;textProgress:number;timingPrecision:'provider'|'estimated';targets:string[];title:string;explanation:string;relation:'focus'|'sequence'|'compare';comparison?:string}
const b=(token:string,action:string,targets:string[],title:string,explanation:string,comparison?:string):Beat=>({token,action,targets,title,explanation,comparison});
const plans:Record<string,Beat[]>={
 'G1-opening':[
  b('先看整个地球','whole',['earth'],'完整地球 · 先认整体','海洋、陆地和包围地球的空气保留在同一个整体里。'),
  b('蓝色海洋','ocean',['earth-ocean'],'海洋 · 储存水和热','沿印度洋的参照标记辨认海洋，位置标记不是海洋边界。'),
  b('陆地上','land',['earth-land','earth-river'],'陆地 · 山地、平原与河流','沿非洲影像辨认陆地，青色尼罗河作为真实河流例子；河道为概览数据，地形高差将在后面展开。'),
  b('空气包围地表','atmosphere',['earth-air'],'大气 · 包围整个地表','浅蓝外层标出空气所在，显示厚度经过夸张。'),
  b('寒冷处','ice',['earth-ice'],'冰雪 · 寒冷处留下的水','南极位置帮助辨认冰雪，不表示实时积雪范围。'),
  b('适合的水热条件','vegetation',['earth-vegetation'],'植物 · 需要合适水热条件','刚果区域影像提供植被例子，标记不表示测量的森林边界。'),
  b('它们彼此相连','linked',['earth-ocean','earth-air'],'海陆和大气 · 彼此相连','保留地球整体，再跟随地表水分与空气的联系。'),
  b('水会蒸发','evaporation',['earth-ocean','earth-vapour'],'蒸发 · 水分进入空气','青色符号从地表升起，代表气态水，不是云滴或雨滴。'),
  b('空气又把热和水','transport',['earth-air','earth-vapour'],'空气运动 · 搬运热和水','空气方向符号和青色水汽同时移动，颜色不编码数量。'),
  b('先认清这些对象','whole-end',['earth'],'保留整体 · 再问怎样运行','先认清共同环境，再认识造成不同地方差异的过程。'),
 ],
 'G1-explain':[
  b('看两束','equal-beams',['heat-equator','heat-highlatitude'],'同样宽 · 先固定输入光束','两束光的横截面相同，接下来比较它们在球面的落点。'),
  b('照得较直','direct',['heat-equator'],'较直接收 · 落在较小面积','沿低纬光束看接收面，先辨认光束和落点的关系。'),
  b('照得斜','oblique',['heat-highlatitude'],'倾斜接收 · 同一束光铺得更开','高纬接收面更大，几何面积不是当地气温读数。'),
  b('全年平均看','latitude-energy',['heat-equator','heat-highlatitude'],'低纬和高纬 · 热量背景不同','比较太阳能背景，不把纬度直接等同于地方气温。'),
  b('但当地多热','heat-storage',['earth-ocean','earth-land'],'海陆储热 · 仍要共同考虑','冷暖还受海陆储热和交换影响，不能只从光斑推出。'),
  b('以及空气和水','heat-transport',['earth-air','earth-vapour'],'空气和水 · 继续搬运热','环境之间的输送把冷暖问题接到下一段空气运动。'),
 ],
 'G1-observe':[
  b('地表受热不均','heat-difference',['heat-equator','heat-highlatitude'],'受热不均 · 建立运动背景','先保留两束同宽光的接收差异，再看气压差推动空气。'),
  b('参与形成气压差','pressure',['circulation-pressure'],'气压差 · 推动空气流动','沿虚线参照辨认压力差方向，不把温度色直接换算为气压。'),
  b('看上升','rise',['circulation-rise'],'平均上升 · 先看这一支','方向标记解释大尺度平均上升，不追踪一次真实天气气团。'),
  b('向外输送','upper',['circulation-upper'],'高处输送 · 接到别处','同一平均环流示意里，上升与高处输送彼此相连。'),
  b('下沉','sink',['circulation-sink'],'平均下沉 · 回到低处','下沉与其他分支共同构成平均关系，不表示当地必然干旱。'),
  b('与返回','return',['circulation-return'],'近地面返回 · 连成循环','这里跟踪的是方向标记，而不是一颗真实空气粒子的全程。'),
  b('地球自转','deflection',['circulation-return'],'自转 · 运动方向会偏转','弯曲返回支说明偏转关系，实际流动还受地区条件影响。'),
  b('空气同时搬运','carry',['earth-air','earth-vapour'],'空气与水汽 · 两种角色分开认','金色标记表示空气方向，青色标记表示随空气携带的气态水。'),
  b('水从地表蒸发','evaporation',['earth-ocean','earth-vapour'],'蒸发 · 从地表进入空气','先看青色水汽离开地表，再看随空气搬运；没有雨滴。'),
  b('随风移动','vapour-transport',['earth-vapour'],'随空气输送 · 还没有成云','水汽是气态水，随风移动不等于已经有云或降水。'),
  b('湿空气上升冷却时','cool',['circulation-cooling'],'湿空气上升 · 膨胀冷却','同一概念样例上升并膨胀，先出现冷却条件，不先出现云。'),
  b('才可能成云','cloud',['circulation-cloud'],'条件合适 · 才可能成云','浅色云团在湿空气冷却之后出现，成云不等于降雨。'),
  b('这是大尺度平均关系','mean-context',['earth'],'保留整体 · 平均关系不是实况','环流、海陆和地形共同参与环境，示意没有给出当天风场。'),
 ],
 'G1-bridge':[
  b('先看赤道附近','equator',['compare-equator'],'刚果盆地 · 赤道附近低地','先在同一地球上辨认刚果位置，再看热量和水分条件。','compare-equator'),
  b('热与水共同','forest',['compare-equator'],'热量和水分 · 共同支持森林','森林环境来自多种条件组合，雨林也存在干湿季节。','compare-equator'),
  b('湿空气上升时','equator-cloud',['compare-equator'],'湿空气上升 · 冷却可能成云','在刚果参照处展开条件示意，不表示每天都有相同天气。','compare-equator'),
  b('再看撒哈拉','desert',['compare-desert'],'撒哈拉 · 阳光充足仍可能干旱','切换到同一地球上的北非位置，不能只看热量判断降水。','compare-desert'),
  b('这里阳光也充足','sunny-desert',['compare-desert'],'充足阳光 · 不能代替水分','保留干旱地区位置，继续观察空气运动这个条件。','compare-desert'),
  b('但副热带下沉空气','desert-sink',['compare-desert'],'下沉增温 · 不利于云雨','方向符号向下移动，解释平均条件，不提供实测雨量。','compare-desert'),
  b('最后看青藏高原','plateau',['compare-plateau'],'青藏高原 · 加入真实高度','同一地球上的真实高程保持来源，垂直显示夸张120倍。','compare-plateau'),
  b('它并不在极地','not-polar',['compare-plateau'],'并非极地 · 纬度不是全部原因','保留亚洲高地和地球整体，不能把寒冷只归因于纬度。','compare-plateau'),
  b('高海拔却使','altitude',['compare-plateau'],'高海拔 · 与邻近低地比较','源高程用来辨认高低，不从模型计算实际气温差。','compare-plateau'),
  b('山系还改变空气来路','terrain-air',['compare-plateau'],'山系排列 · 还会改变来流','高地与山系是不同尺度的条件，后续再展开抬升与绕行。','compare-plateau'),
  b('接下来','to-tibet',['compare-plateau'],'带着条件 · 到亚洲找到西藏','保留高地在完整地球上的位置，下一段继续洲、国家和地区定位。','compare-plateau'),
 ],
};
const normalized=(value:number)=>Number.isNaN(value)?0:Math.max(0,Math.min(1,value));
export function earthNarrationBeats(cueId:string,text:string){return (plans[cueId]??[]).flatMap(beat=>{const start=text.indexOf(beat.token);return start<0?[]:[{...beat,targets:[...beat.targets],at:start/text.length}];}).sort((a,b)=>a.at-b.at);}
export function earthNarrationMoment(cueId:string,text:string,progress:number,timing?:EarthNarrationTiming):EarthNarrationMoment|undefined{
 const beats=earthNarrationBeats(cueId,text);if(!beats.length)return;
 const value=normalized(timing?.textProgress??progress);let index=0;while(index+1<beats.length&&value>=beats[index+1].at)index++;
 const beat=beats[index],end=beats[index+1]?.at??1;
 return {phraseId:`${cueId}:${beat.action}`,action:beat.action,progress:normalized((value-beat.at)/Math.max(1e-9,end-beat.at)),textProgress:value,timingPrecision:timing?.precision??'estimated',targets:[...beat.targets],title:beat.title,explanation:beat.explanation,relation:beat.targets.length>1?'compare':'focus',comparison:beat.comparison};
}
