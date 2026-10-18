import type {NarrationTiming} from './narrationTiming';

export interface GroundReading {longitude:number;latitude:number;distanceMetres:number;totalMetres:number;tunnel:boolean;height:number;bridge?:boolean;surfaceMetres?:number;stops?:{id:string;title:string;progress:number}[]}
export interface GroundJourneyState {progress:number;height:number;bearing:number;returnMix:number;railPhase?:'approach'|'river'|'mountain'|'crossing'|'tunnel'|'arrival';lookAt?:'river'|'station'|'crossing'|'tunnel';connectionMix?:number;stage?:'whole'|'valley'|'river'|'tunnel'|'station'|'city'|'return'}
export const valleyJourneyText='前面认识了高原环境、生活与历史，现在沿一段真实铁路，看这些条件怎样联系起来。从西藏全图拉近拉萨。这里观察青藏线进入拉萨站前的一段，不是拉林铁路全线；底图是有日期的卫星影像。沿线向前看，山体、河流与城市逐渐进入同一视野。停在跨河段，铁路跨过河流，桥梁接起两岸，但地表高程不等于桥面高度。继续往站区方向，山体开始遮挡视线。停在虚线段，这是地图记录的隧道水平走向，不能据此判断地下深度。再沿线到拉萨站，俯看站场和周围街区。铁路完成区域抵达，还需要道路把人和物接入生活目的地。转向柳梧大桥，看站区怎样通过跨河道路联系对岸城市。你可以点选线路，前后比较视野；继续播放时会回到原来的讲解。最后回到西藏全图：地形影响通行条件，交通工程增加联系，地方接续把抵达带进生活。接下来再看这些联系的共同维护。';
export function valleyJourneyState(text:string,timing?:NarrationTiming):GroundJourneyState {
 const at=(timing?.textProgress??0)*text.length,has=(word:string)=>at>=text.indexOf(word);
 const range=(a:string,b:string)=>Math.max(0,Math.min(1,(at-text.indexOf(a))/(text.indexOf(b)-text.indexOf(a))));
 const stage=has('最后回到')?'return':has('转向柳梧大桥')?'city':has('再沿线到')?'station':has('继续往站区')?'tunnel':has('停在跨河段')?'river':has('从西藏全图')?'valley':'whole';
 const railPhase=has('再沿线到')?'arrival':has('停在虚线段')?'tunnel':has('继续往站区')?'mountain':has('停在跨河段')?'crossing':'river';
 return {stage,railPhase,progress:railPhase==='river'?range('沿线向前看','停在跨河段'):railPhase==='mountain'?range('继续往站区方向','停在虚线段'):railPhase==='arrival'?range('再沿线到拉萨站','铁路完成区域抵达'):1,
  height:2000-900*range('沿线向前看','停在跨河段')-200*range('继续往站区方向','停在虚线段')+700*range('再沿线到拉萨站','铁路完成区域抵达'),bearing:0,
  returnMix:has('最后回到')?range('最后回到西藏全图','接下来再看'):1-range('从西藏全图拉近拉萨','沿线向前看'),connectionMix:range('转向柳梧大桥','你可以点选线路')};
}
export function groundFeedback(state:GroundJourneyState,reading?:GroundReading){
 return state.lookAt==='river'?'铁路抵达南岸；看柳梧大桥怎样跨河接入城市。':state.lookAt==='station'?'线路进入站区后，仍需要道路接续到生活目的地。':reading?.tunnel?'虚线是隧道水平投影；山体仍在，不能据此读取地下深度。':reading?.bridge?'这里是源数据标记的桥段；比较铁路与河流的交叉位置。':'沿真实线路前后比较：山体、河流和街区怎样改变视野？';
}
export const groundJourneyText='刚才比较了不同地区的交通联系，现在走进一段真实地形。这里选择青藏线进入拉萨站前的一小段，不代表拉林铁路全线。从全域拉近拉萨河谷，先俯看铁路、河流和两岸城市的位置。镜头降低，沿金色线路向车站移动，观察山体怎样挡住远处，视野怎样随着位置改变。虚线标出地图记录的隧道段，只显示水平走向，不能当成地面的轨道，也不能从地面高程读出隧道深度。暂停后，可以自己拖动沿线位置，改变观察高度和朝向。再升高俯看，铁路抵达站区，并不等于抵达每个生活目的地；还要通过道路和跨河联系接入城市。回到全域，继续理解通道的使用与维护。';
export function groundJourneyState(text:string,timing?:NarrationTiming):GroundJourneyState {
 const position=(timing?.textProgress??0)*text.length;
 const interval=(from:string,to:string)=>Math.max(0,Math.min(1,(position-text.indexOf(from))/(text.indexOf(to)-text.indexOf(from))));
 const descending=interval('镜头降低','虚线标出'),ascending=interval('再升高俯看','回到全域');
 const railPhase=position<text.indexOf('虚线标出')?'approach':position<text.indexOf('暂停后')?'tunnel':'arrival';
 return {railPhase,progress:railPhase==='approach'?interval('镜头降低','虚线标出'):railPhase==='tunnel'?1:interval('暂停后','再升高俯看'),height:1800+(120-1800)*descending+(1800-120)*ascending,bearing:0,
  connectionMix:interval('还要通过道路','接入城市'),
  returnMix:position<text.indexOf('镜头降低')?1-interval('这里选择青藏线','先俯看'):interval('回到全域','继续理解')};
}
