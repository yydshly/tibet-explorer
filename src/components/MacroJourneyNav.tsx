interface Props {
 active:'earth'|'environment'|'cities'|'topics';
 onEarth:()=>void;onEnvironment:()=>void;onCities:()=>void;onTopics:()=>void;
}

export default function MacroJourneyNav({active,onEarth,onEnvironment,onCities,onTopics}:Props){
 const entries=[{id:'earth',title:'01 地球定位',action:onEarth},{id:'environment',title:'02 整体环境',action:onEnvironment},{id:'cities',title:'03 城市与地区',action:onCities},{id:'topics',title:'04 按问题深入',action:onTopics}];
 return <nav className="city-learning-path" aria-label="由整体进入地方的认识层次">{entries.map((item,index)=><span className="macro-nav-entry" key={item.id}>{index>0&&<i>›</i>}<button type="button" aria-current={active===item.id?'step':undefined} onClick={item.action}>{item.title}</button></span>)}<small>先认识地方，再解释原因</small></nav>;
}
