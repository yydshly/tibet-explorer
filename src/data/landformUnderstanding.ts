import type {SceneSettings} from '../lib/store';
import type {SceneUnderstanding} from './sceneUnderstanding';

export function landformUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined{
 if(stepId!=='P2')return undefined;
 const p=settings.progress,stage=p<.3?0:p<.7?1:2;
 const objects=[
  {id:'landform-slope',name:'坡面与汇水',explanation:'水沿高低关系汇集。坡度、地表与水量会影响实际过程；模型保持一个固定概念地形，没有定位某处真实山坡。'},
  {id:'landform-channel',name:'河道与下切',explanation:'过程推进时，谷地局部降低、物质进入河道。切下的深度没有对应真实米数或年份，不能用动画速度推算实际侵蚀速率。'},
  {id:'landform-sediment',name:'搬运的物质',explanation:'可见小块沿河道移动，帮助把水流与物质迁移分开。颗粒数量、大小和颜色不代表实测含沙量或岩性。'},
  {id:'landform-deposit',name:'较低处的堆积',explanation:'部分物质在条件变化的区域堆积，形成更平缓的表面示意。真实堆积位置和材料还取决于水动力、粒径与地质条件，不能仅凭外形判定某处成因。'},
 ];
 const selected=objects.find(o=>o.id===picked);
 return {title:selected?.name||['先读坡面、河道与低处','侵蚀与搬运同时改变地表','低处堆积：轮廓与材料一起变'][stage],explanation:selected?.explanation||[
  '先保留同一个坡面和河道，比较哪里较高、哪里较低。水流方向有了地形背景，再推进过程，才能看到它怎样与物质和地表变化相连。',
  '沿蓝色水路看小块物质进入河道并向下移动，同时比较河谷局部下切。运动的水、被搬运的物质和地形改变是三个相关但不同的对象。',
  '一部分物质到较低处堆积，出现更平缓的表面。这样的地方可能参与形成生活条件，但还要看水、材料、技术和社会组织；真实地点的成因需要地质与年代证据。',
 ][stage],lookFor:'回拖前后，对照同一河谷的轮廓和物质位置；地形、水和材料可分别显示。',provenance:'流水地貌概念模型 · 不对应具体峡谷、侵蚀米数、流量或年份',objects,processLabel:'汇水 → 侵蚀搬运 → 低处堆积',stops:[{label:'初始地形',progress:0},{label:'侵蚀与搬运',progress:.52},{label:'形成堆积',progress:1}],hasProgress:true,allowsCutaway:false};
}
