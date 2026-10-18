import {overviewMechanismCues,type OverviewMechanismState} from '../data/overviewMechanisms';
import type {NarrationTiming} from './narrationTiming';
const clamp=(x:number)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
export function waterTransfer(progress:number,connected=true){
 const p=clamp(progress),amount=p;
 return {source:1-amount*.45,stored:amount*.45,flowing:connected&&p>0&&p<1};
}
export function overviewMechanismFeedback(state:OverviewMechanismState){
 if(state.kind==='water')return !state.connected?'通道已关闭，停止补水；源端和储水端保持现有水量。':state.progress===0?'通道已打开；向前拖动，观察同一份水从源端转移到储水端。':state.progress<1?'源端水位下降，储水端上升。关口决定能否继续补水，已有的水保持。':'本次示意转移完成；水量不是实测数值，回拖可重新观察。';
 if(state.kind==='manuscript')return state.progress<.08?'护板与空白页分开，先看易损书页需要保护。':state.progress<.62?'书页正在整理叠放；现在还没有合上护板。':state.progress<1?'护板逐渐合拢，将书页夹护在中间。':'护板合拢，书页得到包护；这不复原文物原本配套的经书。';
 return state.progress<.32?'先辨认讲述、表演和观看的位置。':state.progress<.68?'学习者离开观看位置，靠近示范者。':'进入共同练习的空间；参与机会不能等同于已经学会。';
}
export function overviewMechanismState(id:string,text:string,raw:number,timing?:NarrationTiming):OverviewMechanismState|undefined{
 const cue=overviewMechanismCues.find(c=>c.id===id);if(!cue)return;
 if(cue.narration!==text)throw new Error(`功能演示与录音不一致：${id}`);
 const position=clamp(timing?.textProgress??raw)*text.length;
 const after=(s:string)=>position>=text.indexOf(s);
 const range=(a:string,b:string)=>clamp((position-text.indexOf(a))/(text.indexOf(b)-text.indexOf(a)));
 if(id==='OVERVIEW-culture-continuity'){
  if(after('把学习与实践放回全域'))return;
  return {kind:'practice',progress:after('再进入共同练习')?.68+.32*range('再进入共同练习','这里不复原具体演出'):after('学习者靠近示范者')?.32+.35*range('学习者靠近示范者','再进入共同练习'):0,connected:true,title:'延续需要学习与实践',reason:'同一学习者从观看转向练习机会；位置改变不代表已经掌握技艺。'};
 }
 if(id==='OVERVIEW-water-service'){
  if(after('回到三地'))return;
  const closed=after('关闭通道'),p=range('打开取水通道','关闭通道');
  return {kind:'water',progress:p,connected:after('打开取水通道')&&!closed,title:closed?'停止补水，已存的水仍然保留':after('打开取水通道')?'看同一份水从源端转移到储水端':'有水源 ≠ 已经能够使用',reason:closed?'关口落下，通道停止继续补水；储水保持。重新操作可比较同一条件下通道开闭。':'打开后比较源端下降与储水端上升；数量与设施均为功能示意。'};
 }
 if(after('把物件保存和人的参与放回全域'))return;
 if(after('再以藏戏为例'))return {kind:'practice',progress:after('再进入共同练习')?.68+.32*range('再进入共同练习','这里不复原具体演出'):after('学习者靠近示范者')?.32+.35*range('学习者靠近示范者','再进入共同练习'):0,connected:true,title:'从观看到参与，需要组织学习机会',reason:'同一位学习者由观看位置靠近示范者，再进入练习区域；移动表示参与机会，不表示掌握程度。'};
 return {kind:'manuscript',progress:after('最后合上两侧木板')?.62+.38*range('最后合上两侧木板','你可以展开和合拢'):after('再整理叠放')?.08+.52*range('再整理叠放','最后合上两侧木板'):0,connected:true,title:'书页与护板：保存也是具体行动',reason:'先辨认书页，再整理，最后合上护板。真实文物照片与功能示意分别标明；不编造经文和缺失原件。'};
}
