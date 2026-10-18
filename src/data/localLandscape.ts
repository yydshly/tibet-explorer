import metadata from './localTerrainMeta.json';
import type {SceneSettings} from '../lib/store';
import type {SceneUnderstanding} from './sceneUnderstanding';
export const localLandscapeMeta=metadata;
export const localLandscapeStage=(progress:number)=>progress<.3?0:progress<.68?1:2;
export function localLandscapeUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined{
 if(stepId!=='P1')return;const stage=localLandscapeStage(settings.progress);
 const objects=[
  {id:'local-overview',name:'西藏与周边的整体地形',explanation:'同一坐标系保留原有的地区高程概览。金色矩形指出新增局部数据的真实显示范围；没有把整个高原变成林芝一处的地形。'},
  {id:'local-window',name:'林芝周边的局部高程',explanation:'显示范围为93.75—95°E、29—30.3°N。更密的公开高程网格让山脊与低处的起伏更清楚；约0.4公里是显示抽样间距，不能当作测绘精度。'},
  {id:'local-town',name:'林芝城区参照',explanation:'城区参考点沿用已归档的Natural Earth记录。它帮助定位周围山地，不代表整个林芝地区、村址、河道中心或可访问入口。'},
  {id:'local-slope',name:'当前剖面的较高处',explanation:'标记由当前南北切线的网格样本计算，说明这一条线上哪里较高；没有把采样最高值称为某座山峰的真实峰顶高度。'},
  {id:'local-valley',name:'当前剖面的较低处',explanation:'较低处与两侧山体共同构成起伏关系。高程可以提出水与通行的问题，但没有提供河网、实时积水或可用道路。'},
  {id:'local-profile',name:'可移动的南北高程线',explanation:'切线向东西移动，沿同一方向比较不同高差。剖面延伸到海平面参考，不能据此判断地下地层和岩性。'},
 ];
 const choice=objects.find(item=>item.id===picked&&settings.selected===picked);
 return {title:choice?.name||['先在完整地形上找到范围','沿同一坐标靠近林芝山地','移动剖面，比较高低怎样组合'][stage],explanation:choice?.explanation||[
  '先把林芝放回西藏与周边的完整地形。金色框标出局部数据窗口；整体和局部具有同样的经纬位置、朝向与高度基准，镜头会沿这一来路靠近。',
  '同一地形中接入更密的林芝周边高程：山地、山脊与较低空间同时保留。颜色表示海拔，高度统一放大2倍以便阅读；地形没有编码植被、天气、河道或旅行路线。',
  '南北切线向东西移动，较高点和较低点随真实网格重新计算。固定观察方向比较不同高差组合，再把形成问题交给下一段的汇水、侵蚀与堆积原理。',
 ][stage],objects,lookFor:'先看金色数据窗口，再靠近局部；移切线时，核对高低标记与同一条剖面是否一起改变。',provenance:'Mapzen公开高程 · 局部显示约0.4 km · 高度×2 · 色彩为海拔，无实测河道与道路',processLabel:'区域位置 → 靠近林芝 → 移动高程剖面',stops:[{label:'整体定位',progress:.12},{label:'局部山地',progress:.5},{label:'剖面比较',progress:.86}],hasProgress:true,allowsCutaway:true};
}
