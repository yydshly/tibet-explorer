import manifest from '../../public/data/lhasa-evolution/manifest.json';
import type {OverviewPresentation} from './overviewScene';

export const urbanComparisonYears=[1985,2000,2015] as const;
export type UrbanComparisonYear=typeof urbanComparisonYears[number];

export function isUrbanPixelView(view:OverviewPresentation){
  return !!view.props.overviewUrban&&['baseline','middle','recent'].includes(view.props.overviewUrban.phase);
}

/** Manual inspection changes only the evidence year, never the recording clock,
 * native-word phase or fixed comparison camera. Counts describe this window. */
export function urbanComparison(view:OverviewPresentation,year?:UrbanComparisonYear):OverviewPresentation{
  if(year===undefined||!isUrbanPixelView(view))return view;
  return {...view,year:`${year}年检出 · 手动对照`,
    title:`同一河谷，比较截至${year}年的检出范围`,
    explanation:year===1985?'先记住青色基底的位置，再切到2000或2015年看金色范围。1985是资料序列起点，不是城市建立的年份。':'地形、观察范围与视角保持不变；看金色范围与青色基底、河流和两个历史地标的位置关系。空间差异本身不能证明铁路造成了这些变化。',
    props:{...view.props,overviewYear:`${year}年检出`,overviewUrban:{...view.props.overviewUrban!,year,showChange:true}}};
}

export function urbanPixelCounts(year:number){
  const index=Math.max(0,Math.min(30,Math.floor(year)-1985));
  const baseline=manifest.window.firstDetectionYearCounts[0];
  const total=manifest.window.firstDetectionYearCounts.slice(0,index+1).reduce((sum,n)=>sum+n,0);
  return {baseline,later:total-baseline,total};
}
