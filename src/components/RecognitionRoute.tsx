import {ArrowLeft,ArrowRight,CaretDown} from '@phosphor-icons/react';
import {recognitionQuestions,recognitionQuestionTarget,resolveRecognitionRoute,sameRecognitionDestination,type RecognitionNavigation,type RecognitionRouteInput} from '../lib/recognitionRoute';
import './RecognitionRoute.css';

export interface RecognitionRouteProps extends RecognitionRouteInput {
  onNavigate:(target:RecognitionNavigation)=>void;
  variant?:'overview'|'compact';
  className?:string;
}

/** This is orientation, not another course/progress tracker. Existing directors
 * retain audio, completion, comparison stage and exploration return ownership. */
export default function RecognitionRoute({variant='compact',className='',onNavigate,...input}:RecognitionRouteProps){
  const state=resolveRecognitionRoute(input);
  const nextReturns=sameRecognitionDestination(state.next,state.returnTarget);
  const outline=<nav className="recognition-route-questions" aria-label="从地球到地方的总认识问题">
    <ol>{recognitionQuestions.map(question=><li key={question.id}>
      <button type="button" aria-current={state.question?.id===question.id?'location':undefined} onClick={()=>onNavigate(recognitionQuestionTarget(question.id,state.cityId||input.cityId))}>
        <span>{question.label}</span><small>{question.question}</small>
      </button>
    </li>)}</ol>
  </nav>;
  return <section className={`recognition-route recognition-route--${variant} ${className}`} aria-label="当前问题在整体认识中的位置">
    <div className="recognition-route-heading"><span>{state.mode==='home'?'从整体到地方':'认识主线'}</span><small>{state.modeLabel}</small></div>
    {state.question&&<strong className="recognition-route-current">{state.question.question}</strong>}
    {variant==='overview'?<><p className="recognition-route-purpose">{state.focus}</p>{outline}<p className="recognition-route-role">{state.role}</p></>:<details className="recognition-route-outline"><summary>查看来路与衔接<CaretDown size={12}/></summary><p className="recognition-route-role">{state.role}</p><p className="recognition-route-role"><strong>{nextReturns?'回到整体继续':'接下来为何继续'}</strong><br/>{state.nextReason}</p>{outline}</details>}
    <div className="recognition-route-continuation">
      {state.returnTarget&&<button type="button" className="recognition-route-return" onClick={()=>onNavigate(state.returnTarget!)}><ArrowLeft size={12}/><span>{state.returnTarget.label}</span></button>}
      {variant==='overview'&&<p><span>{nextReturns?'回到整体继续':'接下来为何继续'}</span>{state.nextReason}</p>}
      {state.next&&!nextReturns&&<button type="button" className="recognition-route-next" onClick={()=>onNavigate(state.next!)}><span>{state.next.label}</span><ArrowRight size={13}/></button>}
    </div>
  </section>;
}
