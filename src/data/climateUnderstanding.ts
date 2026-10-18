import {plateauClimateState} from '../lib/plateauClimateState';
import {longTermEnergyState} from '../lib/longTermEnergyState';
import type { SceneSettings } from '../lib/store';
import type { SceneObjectIntroduction, SceneUnderstanding } from './sceneUnderstanding';

const heightObjects: SceneObjectIntroduction[] = [
  {id:'height-low',name:'较低处的地表',explanation:'先把同一片山坡的较低处作为空间参照。这里没有某个气象站的观测数值，比较的是高度关系，不能据此计算今天的气温。'},
  {id:'height-high',name:'较高处的山坡',explanation:'较高处通常对应较低气压，但海拔不是温度的唯一条件。坡向、地表、云量和天气仍需一起研究；山坡颜色是定性参照。'},
  {id:'height-parcel',name:'正在上升的空气团',explanation:'跟踪同一团空气：上升进入较低气压环境，能够膨胀并冷却。模型提取空气团原理，湿度、凝结和混合会影响真实过程。'},
  {id:'height-environment',name:'周围空气的高度参照',explanation:'周围空气的垂直温度分布，需要按地点与时刻观测。它是环境状态；上升空气团的变化是运动过程。两者比较后才能讨论稳定性，不能当成同一条温度曲线。'},
];
const circulationObjects: SceneObjectIntroduction[] = [
  {id:'circulation-ocean',name:'印度洋与海陆背景',explanation:'南侧海洋提供重要的水汽来源背景，海陆分布也参与组织环流。实际到达高原的水汽，还要经过季节、空气路径和地形条件。'},
  {id:'circulation-land',name:'亚洲大陆',explanation:'不同地表的受热与空气状态并不相同，压力差参与推动空气。地球自转、摩擦和地形共同改变运动，图中的示意不能单独算出真实风向与强度。'},
  {id:'circulation-plateau',name:'高原与山地',explanation:'高原既有高度与起伏，也会参与地表和空气的热量交换。先保留地形与季节，再研究空气从哪一侧、哪一高度经过；山地不是永远不可跨越的墙。'},
  {id:'circulation-south',name:'南侧联系来路',explanation:'藏东南的夏季水汽可与印度洋、孟加拉湾来路联系。画面帮助追踪相对方向；相关研究的夏季、地区和资料范围，不能推广为全西藏全年唯一的路径。'},
  {id:'circulation-west',name:'西侧来流背景',explanation:'西风背景也可能携带水汽，不能统一叫作干风。其路径、含水量和跨山过程，需要结合季节、高度和具体天气资料判断。'},
];
const cloudObjects: SceneObjectIntroduction[] = [
  {id:'cloud-inflow',name:'携带水汽的空气',explanation:'空气的移动和它携带的水汽是不同观察对象。这里可以在同一山体、同一进度下比较初始水汽条件；两档是定性情景，不是当地实测湿度。'},
  {id:'cloud-lift',name:'沿坡抬升与冷却',explanation:'空气遇地形可能被迫上升，外部气压降低时能够膨胀冷却。这个过程本身并不保证形成云；初始含水量、温度和空气状态还会影响凝结条件。'},
  {id:'cloud-condense',name:'满足条件后成云',explanation:'空气冷却到合适条件，水汽才会凝结成云滴或形成冰晶。图中的云滴被放大供观察；有云不意味着已经有降到地面的雨。'},
  {id:'cloud-precipitation',name:'增长与降水',explanation:'云滴或冰晶需继续增长并满足降落条件，才形成降水。低水汽情景在这一设定中没有地面降水，不代表任何真实地方永远不下雨。'},
  {id:'cloud-runoff',name:'降水后的地表去向',explanation:'到达地面的水可沿坡面汇流，也可入渗或暂存。蓝色路径表示汇流方向，没有提供真实河网、流量或洪水预测；进入具体流域还需水文资料。'},
];

export function climateUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined {
  const p=Math.max(0,Math.min(1,settings.progress));
  let unit:SceneUnderstanding;
  if(stepId==='C3'){
    const phase=p<.25?0:p<.7?1:2;
    unit={title:['先辨认较低处与周围空气','跟踪同一团空气上升','空气团过程与环境状态分开读'][phase],
      explanation:[
        '山坡提供高度参照，空气团从较低处开始。保留同一团空气和同一山坡，再推进过程，观察它的位置、体积和状态怎样改变。',
        '空气团上升进入较低气压环境，体积增大，颜色表示定性冷却。外部压力与空气团过程相连，但图中没有当地实测气压或气温。',
        '上升空气团已经改变，周围空气的高度参照仍独立存在。运动过程与环境剖面需要比较，不能用一种颜色变化替代两类资料。',
      ][phase],lookFor:'回拖同一空气团，比较位置、体积与周围空气；再联系山坡高差。',
      provenance:'NOAA 空气团原理 · 定性高度与状态 · 无实测温度/气压',
      objects:heightObjects,processLabel:'同一空气团 · 从低处到高处',
      stops:[{label:'较低处',progress:0},{label:'沿坡上升',progress:.5},{label:'较高处',progress:1}]};
  }else if(stepId==='C4'){
    const state=plateauClimateState(settings);
    unit={title:state.title,explanation:state.explanation,lookFor:'在同一个地球上靠近真实高程，比较相同地形、不同水汽条件和地区位置。',provenance:'NASA影像 · Mapzen高程 · 高度×50 · 气流与云雨为定性原理',objects:[],processLabel:'来路 → 地形 → 云雨 → 地区 → 生活',stops:[],allowsCutaway:false,hasProgress:false};
  }else if(stepId==='C8'){
    const {phase}=longTermEnergyState(settings.progress),index=phase==='driver'?0:phase==='adjustment'?1:2;
    unit={
      title:['驱动：向外散失条件改变','收支调整：地表与大气一起看','响应参照：对象不必同时变化'][index],
      explanation:[
        '温室气体改变向外散失条件。保留进入路径，对照向外与返回地表的箭头；长度与透明度不代表通量。',
        '系统需要调整到新的收支状态。沿同一地表与大气读交换路径，颜色只提示关注，不是实测温度。',
        '冰雪、海洋与陆地响应时间不同。形态保持不变，只作对象参照；真实变化量、年份和原因仍需独立资料。',
      ][index],
      lookFor:'回拖比较向外与回返路径，再辨认响应对象；地形与冰雪几何保持不变。',
      provenance:'NASA能量收支原理 · 无通量或温度计算 · 非真实冰川变化、年份或地方预测',
      objects:[],processLabel:'驱动 → 收支调整 → 响应参照',
      stops:[{label:'驱动',progress:.1},{label:'收支调整',progress:.5},{label:'响应参照',progress:.8}],
      allowsCutaway:false,hasProgress:true,
    };
  }else if(stepId==='C5'||stepId==='C6'){
    const lower=settings.airMoisture==='lower';
    const phase=p<.2?0:p<.43?1:p<.62?2:p<.82?3:4;
    const titles=['先把空气带到山坡','沿坡抬升，膨胀冷却','初始条件影响能否成云','云滴增长，才可能形成降水','空气中的水来到地表以后'];
    const explanation=[
      '先辨认空气来向与山坡位置。水汽作为空气携带的成分进入，山体保持相同；此时没有把输送直接画成下雨。',
      '空气团沿坡上升，体积与颜色随过程改变。较低外部气压与膨胀冷却相连；在两种初始水汽条件下，这个抬升过程都可以发生。',
      lower?'初始水汽较少：相同抬升进度下，凝结较晚、云滴较少。这个对照保持其他设定相同，用来说明成云需要条件。':'初始水汽较充足：冷却后满足设定的凝结条件，云滴出现并增长。有云仍不是已经有地面降水。',
      lower?'较少水汽情景中可出现少量云滴，但本过程设定没有形成地面降水。比较另一档，辨认云与降水之间还缺少哪些增长条件。':'云滴继续增长，达到设定条件后出现降水。成云位置与降水位置是不同过程，放大的圆点和雨丝不表示真实滴径或雨量。',
      lower?'当前情景没有地面降水，也没有这次降水产生的坡面汇流。不能由此判断真实地区常年干湿；那需要有日期、范围与口径的资料。':'降水到达地表，部分水沿坡面向较低处汇流。水也会入渗或暂存；这里用路径读去向，不输出实际流量。',
    ][phase];
    const groundNote=phase===4&&!lower&&settings.layer!=='water'?'切到“地表去向”，查看降水后的汇流与入渗。':'';
    const layerNote=settings.layer==='wind'?'当前只看空气过程；切到云雨层查看成云与降水。':settings.layer==='water'?'当前突出地表去向；回到云雨层查看前面的成云与降水。':'';
    unit={title:lower&&phase>=3?'较少水汽对照：没有本次地面降水':stepId==='C6'?`短时过程阅读：${titles[phase]}`:titles[phase],explanation:explanation+(layerNote?' '+layerNote:'')+(groundNote?' '+groundNote:''),
      lookFor:'固定山体和进度，改变初始水汽条件；比较哪些过程相同，哪些不同。',
      provenance:'NOAA/NWS 云雨原理 · 初始水汽定性情景 · 非实况天气或雨量预测',
      objects:cloudObjects,processLabel:stepId==='C6'?'短时过程顺序 · 无观测钟点':'空气到来 → 抬升 → 成云 → 降水 → 地表去向',
      stops:[{label:'到来',progress:.1},{label:'抬升',progress:.33},{label:'成云',progress:.53},{label:'降水',progress:.74},{label:'地表去向',progress:1}]};
  }else return undefined;
  const object=unit.objects.find(object=>object.id===picked&&settings.selected===picked);
  return object?{...unit,title:object.name,explanation:object.explanation}:unit;
}
