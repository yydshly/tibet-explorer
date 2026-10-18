import {observationTasks} from '../data/overviewLearning';
export default function OverviewLearningGuide({kind,manual,onPause,onResume}:{kind:string;manual:boolean;onPause:()=>void;onResume:()=>void}){
 const task=observationTasks[kind];if(!task)return null;
 return <section className="overview-learning-guide" aria-label="统一观察步骤">
  <ol><li>看问题</li><li aria-current={manual?'step':undefined}>操作比较</li><li>解释原因</li></ol>
  <strong>{task.question}</strong><p>{task.action}</p><small>看变化：{task.change}</small>
  <details onToggle={e=>{if(e.currentTarget.open)onPause();}}><summary>比较后，核对原因</summary><p>{task.reason}</p></details>
  {manual?<button className="overview-resume-comparison" onClick={onResume}>恢复原条件，从暂停处继续</button>:<small>操作会暂停讲解，并保留当前语句。</small>}
 </section>;
}
