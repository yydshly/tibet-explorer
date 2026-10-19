/** R05/R06 only. These two recordings belong to a separate corridor extension;
 * the frozen four-cue Nyingchi–Lulang pilot is never rewritten. */
export const tongmaiPath='/routes/g318-east/lulang-tongmai';
export const tongmaiIdentity='g318-tongmai-r05-r06-v1';
export const tongmaiPositionKey='tibet-explorer.tongmai-position.v1';
export const tongmaiCues=[
 {id:'ROUTE-G318-tongmai-approach',title:'从鲁朗，沿原路进入峡谷',chapterId:'tongmai',stepId:'R05',sceneIdentity:tongmaiIdentity,
  narration:'从鲁朗的主路接续点，继续沿三一八国道前进。镜头沿归档道路压缩行进，不是实时驾车。先看道路怎样随山谷转向，再拉高视野，辨认山体与河流的相对位置。道路不是城市之间的直线，也不始终贴着同一条河。来到通麦附近，先看河谷全貌，再靠近跨河的位置：这里的问题，是人怎样把道路接过去。'},
 {id:'ROUTE-G318-tongmai-crossing',title:'通麦：跨河与穿山怎样接通来路',chapterId:'tongmai',stepId:'R06',sceneIdentity:tongmaiIdentity,
  narration:'先认清易贡藏布，再看它与帕隆藏布的汇合位置。通麦特大桥跨越的是易贡藏布。转为斜看，河谷仍在，桥把两岸的道路接起来。现在看二零一四年的旧桥照片：单车道桥、河流和可见施工背景，留下当时的记录，不是今天的新桥。回到有来源的现状地图，新桥在二零一五年十二月通车；二零一六年四月十三日，整段改建通车。这是两个不同节点。再看飞石崖隧道的平面位置：桥跨河，隧道穿山，改变的是道路连接方式。虚线只定位隧道，不表示洞内高程，也不复原旧路。拉回峡谷，山地和河流并没有消失，持续维护仍是往来的条件。看完这段，可以回到进入前的鲁朗原线。'},
] as const;
export type TongmaiPhase='travel'|'rivers'|'archive'|'bridge'|'tunnel'|'whole';
export type TongmaiView={phase:TongmaiPhase;progress:number;overhead:boolean;read:number;focus:'both'|'river'|'bridge'|'tunnel'};
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
export function tongmaiWordFraction(text:string,phrase:string){const at=text.indexOf(phrase);if(at<0)throw new Error(`Missing Tongmai word anchor: ${phrase}`);return at/text.length;}
export function tongmaiNarratedView(index:number,textProgress:number):TongmaiView{
 const text=tongmaiCues[index].narration,p=clamp(textProgress),f=(phrase:string)=>tongmaiWordFraction(text,phrase);
 if(index===0){const advance=clamp((p-f('镜头沿'))/(f('来到通麦附近')-f('镜头沿')));return {phase:p>=f('来到通麦附近')?'whole':'travel',progress:advance*.98,overhead:p>=f('再拉高视野'),read:advance,focus:'both'};}
 const common={progress:.98,overhead:false,read:1};
 if(p<f('现在看二零一四'))return {...common,phase:'rivers',overhead:p<f('转为斜看'),focus:p<f('通麦特大桥')?'river':'bridge'};
 if(p<f('回到有来源'))return {...common,phase:'archive',focus:'bridge'};
 if(p<f('再看飞石崖隧道'))return {...common,phase:'bridge',focus:'bridge'};
 if(p<f('拉回峡谷'))return {...common,phase:'tunnel',overhead:true,focus:'tunnel'};
 return {...common,phase:'whole',focus:'both'};
}
export const tongmaiReasons:Record<TongmaiPhase,string>={
 travel:'沿真实相邻道路节点前进；位置变化带来视野变化。这里是压缩地图行进。',
 rivers:'通麦桥跨易贡藏布；两条河在附近汇合。行进方向与水流方向分开辨认。',
 archive:'2014年的旧桥记录：可观察当时桥面、河谷和施工背景，不能当作现状新桥。',
 bridge:'跨河改变两岸道路的连接条件；桥线定位不提供实测桥面高程。',
 tunnel:'虚线标出飞石崖隧道的平面位置：穿山接续，不是沿地表翻越，也不表示洞内高程。',
 whole:'道路由桥隧接续，山地与河流仍在。现状几何与历史记录各自说明不同问题。',
};
