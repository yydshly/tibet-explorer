import {ArrowCounterClockwise,PenNib} from '@phosphor-icons/react';
import type {VisualGuideState} from '../data/visualGuidance';

export default function NarrationGuide({guide,playing,interrupted,onReplay,manualTitle,manualExplanation}:{guide:VisualGuideState;playing:boolean;interrupted:boolean;onReplay:()=>void;manualTitle?:string;manualExplanation?:string}){
 return <section className={'narration-guide'+(guide.active?' active':'')} aria-label="讲述与画面引导">
  <header><span><PenNib size={14}/>{interrupted?'已转为自由观察':guide.active?playing?'讲述与画面同步':'暂停在这幅画面':'画面怎样帮助理解'}</span><button type="button" onClick={onReplay} aria-label="重播这一段并恢复画面引导"><ArrowCounterClockwise size={13}/>{interrupted?'恢复讲述':'重播本段'}</button></header>
  <strong>{(interrupted||!guide.active)&&manualTitle?manualTitle:guide.title}</strong><p>{(interrupted||!guide.active)&&manualExplanation?manualExplanation:guide.explanation}</p>
  <small>{interrupted?'重播可恢复这一段的讲述、画面与标注。':guide.active?'括线指出讲述对象；连线引导视线，地理范围另以资料边界表示。':'开始讲解后，描边、指向线和文字会随这一段讲述展开。'}</small>
 </section>;
}
