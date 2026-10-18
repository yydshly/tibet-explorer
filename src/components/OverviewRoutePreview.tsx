import {overviewMainProgram} from '../data/overviewProgram';
const overviewChapters=overviewMainProgram.chapters;

export default function OverviewRoutePreview({onStart}:{onStart:()=>void}){
 return <div className="home-overview-preview"><p>沿六个核心问题建立整体认识。先定位，解释环境与地区差异，再理解生活、历史与今天；具体案例放在延伸阅读。</p><ol>{overviewChapters.map(chapter=><li key={chapter.id}><strong>{chapter.title}</strong><span>{chapter.question}</span></li>)}</ol><button onClick={onStart}>从地球开始完整认识 →</button></div>;
}
