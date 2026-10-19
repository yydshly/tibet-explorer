/** Three short recorded beats implement the one approved R07 shot. */
export const bomiPath='/routes/g318-east/tongmai-bomi';
export const bomiIdentity='g318-bomi-r07-v1';
export const bomiPositionKey='tibet-explorer.bomi-position.v1';
export const bomiCues=[
 {id:'ROUTE-G318-bomi-approach',title:'沿原路，进入波密河谷',chapterId:'bomi',stepId:'R07',sceneIdentity:bomiIdentity,
  narration:'接上通麦段的同一个道路节点，沿三一八国道向波密前进。真实弯道中，山林、河谷和道路相互参照。来到县城驻地扎木镇附近，先俯视帕隆藏布与来路，再斜看谷底和两侧山地。接下来进入街道记录。'},
 {id:'ROUTE-G318-bomi-place',title:'风景之中，也是通行与交往的地方',chapterId:'bomi',stepId:'R07',sceneIdentity:bomiIdentity,
  narration:'二零零八年的波密街景里，先看行人，再看车辆与临街建筑，共用通行和交往的空间。照片不是今日全貌。回到河谷，二零二三年镇级材料记录了农业、林下资源和旅游服务。波卓用山水和生产生活表达祝愿，是县域文化线索，不是这条街的活动现场。'},
 {id:'ROUTE-G318-bomi-return',title:'回到原路，再看地方与来路的联系',chapterId:'bomi',stepId:'R07',sceneIdentity:bomiIdentity,
  narration:'回到进入前的原路位置，再回看来路。风景与城镇生活，在同一条线上相连。'},
] as const;
export type BomiPhase='travel'|'valley'|'photo'|'life'|'culture'|'whole';
export type BomiView={phase:BomiPhase;progress:number;overhead:boolean;focus:'both'|'river'|'road'|'town'|'mountain';photoObject:0|1|2};
export const bomiPhaseNames:Record<BomiPhase,string>={travel:'沿真实弯道前进',valley:'进入扎木镇附近河谷',photo:'2008街道记录',life:'2023镇级生活材料',culture:'波卓 · 县域文字线索',whole:'回看通麦—波密来路'};
export const bomiReasons:Record<BomiPhase,string>={
 travel:'位置沿原始相邻道路节点变化；路线没有改成城市间直线。这是压缩地图行进。',
 valley:'同一位置俯视能辨认路河关系，斜看能辨认谷底与山体；改变的是视角，不是地形。',
 photo:'2008年完整街道记录可观察共同使用空间，不代表今日全貌，也不提供当前经营或交通结论。',
 life:'2023材料描述扎木镇的生活联系；乡镇范围与所见街道不同，照片不能证明产业规模。',
 culture:'县域文字记述波卓以山水和生产生活表达祝愿；这里没有对应街头活动影像或起源复原。',
 whole:'沿路进入地方，再回到同一来路。连接关系、地方实拍与文字资料各自有时间和范围。',
};
export const bomiPhotoObjects=[
 {title:'行人',question:'行人在哪里使用或穿过街道？与车辆的位置是什么关系？',reason:'画中有人步行或穿过街道；不能据一帧判断全天活动或交通安全。',box:[51.5,55,4,9]},
 {title:'车辆与通行空间',question:'车辆、停留和行人怎样出现在同一条街道里？',reason:'画中可见不同车辆与街道空间；不据此推算车流、通行时间或今日运力。',box:[39,52,29,17]},
 {title:'临街建筑',question:'临街建筑与道路上的停留、往来怎样联系？',reason:'可见临街立面和当时招牌；不能据此确认今日经营、每栋建筑用途或产业规模。',box:[21,31,18,24]},
] as const;
export function bomiFraction(text:string,phrase:string){const i=text.indexOf(phrase);if(i<0)throw Error(`Missing Bomi anchor: ${phrase}`);return i/text.length;}
const clamp=(p:number)=>Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;
export function bomiNarratedView(index:number,textProgress:number):BomiView{
 const p=clamp(textProgress),text=bomiCues[index].narration,f=(word:string)=>bomiFraction(text,word);
 if(index===0){const end=f('来到县城'),advance=clamp((p-f('沿三一八国道'))/(end-f('沿三一八国道')));return {phase:p<end?'travel':'valley',progress:advance,overhead:p>=end&&p<f('再斜看'),focus:p<end?'both':p<f('再斜看')?'river':'mountain',photoObject:0};}
 if(index===1){const phase=p<f('回到河谷')?'photo':p<f('波卓')?'life':'culture';return {phase,progress:1,overhead:false,focus:phase==='photo'?'town':'both',photoObject:p<f('车辆与临街建筑')?0:p<f('临街建筑')?1:2};}
 return {phase:p<f('再回看')?'valley':'whole',progress:1,overhead:false,focus:'both',photoObject:0};
}
