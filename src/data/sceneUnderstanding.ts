import type { SceneSettings } from '../lib/store';
import {climateUnderstanding} from './climateUnderstanding';
import {regionalUnderstanding} from './regionalStudy';
import {connectionUnderstanding,connectionSceneLayers} from './connectionUnderstanding';
import {travelUnderstanding} from './travelUnderstanding';
import {railwayUnderstanding} from './railwayUnderstanding';
import {localLandscapeUnderstanding} from './localLandscape';
import {palaceStudyUnderstanding} from './palaceStudy';
import {developmentUnderstanding} from './developmentUnderstanding';
import {livingUnderstanding} from './livingUnderstanding';
import {culturalUnderstanding} from './culturalUnderstanding';
import {historyUnderstanding} from './historyUnderstanding';
import {landformUnderstanding} from './landformUnderstanding';

export interface SceneObjectIntroduction { id: string; name: string; explanation: string }
export interface ProcessStop { label: string; progress: number }
export interface SceneUnderstanding {
  title: string;
  explanation: string;
  lookFor: string;
  provenance: string;
  objects: SceneObjectIntroduction[];
  processLabel: string;
  stops: ProcessStop[];
  allowsCutaway?: boolean;
  hasProgress?: boolean;
}

const formationObjects: SceneObjectIntroduction[] = [
  { id: 'formation-india', name: '印度板块一侧', explanation: '先辨认南侧板块的来向。模型中的物质标记随挤压靠近，说明水平缩短的关系；移动距离没有换算为真实速率或年代。' },
  { id: 'formation-eurasia', name: '欧亚板块一侧', explanation: '另一侧也参与汇聚和变形。大陆碰撞不是两块刚性积木简单相撞：变形会分布在不同地区，演示只提取其中的基本关系。' },
  { id: 'formation-crust', name: '变形与增厚的地壳', explanation: '对照弯曲层次、地表上隆和向下增厚的部分。地壳厚度、地表海拔与抬升历史是相关但不同的量，真实判断需要地球物理与岩石年代证据。' },
  { id: 'formation-surface', name: '地表起伏与侵蚀', explanation: '后段不同部位的山峰和沟谷分别变化。内部变形与地表侵蚀同时塑造地貌；沟谷不是把高原整体压低的一个统一过程。' },
];
const terrainObjects: SceneObjectIntroduction[] = [
  { id: 'terrain-himalaya', name: '南侧喜马拉雅山系', explanation: '先找到高原南缘的山系，再与南侧较低地区比较。高差和山系方向参与影响气流、降水及通行，怎样发生要继续看气候过程。' },
  { id: 'terrain-interior', name: '高原内部', explanation: '高原内部仍有山脊、盆地和谷地。区域的整体高度与局部起伏需要分别读；沿不同经度移动剖面，可以避免用一条切线概括整个高原。' },
  { id: 'terrain-yarlung', name: '雅鲁藏布江谷地参照', explanation: '谷地将山坡与较低处联系起来，也为理解水系和聚落提供背景。这个标记用于地形定位，不是完整河网或沿线道路；真实流域还需要水文资料。' },
  { id: 'terrain-southeast', name: '藏东南山地', explanation: '看东南侧高山与深切谷地的组合，再联系前面认识的南侧海洋来向。地形为外部输送提供路径与障碍，气流并不会在每一条谷地按同样方式通过。' },
];
const energyObjects: SceneObjectIntroduction[] = [
  { id: 'energy-sunlight', name: '进入与反射的阳光', explanation: '一部分太阳短波辐射被反射，其余可被地表或大气吸收。反射的能量没有先变成地表储存的热量；箭头只表示方向与过程。' },
  { id: 'energy-surface', name: '吸收与储存的地表', explanation: '吸收能量后，地表可以升温和储存热量，同时通过辐射、蒸发和与空气的热交换分配能量。表面色彩表示学习阶段，不提供实际地面温度。' },
  { id: 'energy-atmosphere', name: '参与交换的大气', explanation: '大气参与吸收和发射长波，也通过空气运动输送热量。向下的长波与地表向上的长波可以同时存在，不能把大气看成只阻挡一个方向的盖子。' },
  { id: 'energy-space', name: '向外散失的能量', explanation: '地球以辐射向太空散失能量。较长时期的净收支会影响系统储存的热量；认识地方温度还要加上云、地表状态、空气运动与观测。' },
];

/** State explanations stay readable without the narration clock or an audio connection. */
export function sceneUnderstanding(stepId: string, settings: SceneSettings, picked = '',routeRegions?:readonly string[]): SceneUnderstanding | undefined {
  if(stepId==='P1')return localLandscapeUnderstanding(stepId,settings,picked);
  if(stepId==='K1'&&settings.layer!=='construction')return palaceStudyUnderstanding(stepId,settings,picked);
  const progress = Math.max(0, Math.min(1, settings.progress));
  let result: SceneUnderstanding;
  if (stepId === 'G3') {
    const phase = progress < .32 ? 0 : progress < .7 ? 1 : 2;
    result = {
      title: ['从相向运动读起', '水平缩短，地壳也在增厚', '不同部位的起伏与侵蚀'][phase],
      explanation: [
        '两侧物质标记开始靠近。先认板块来向与原有地壳，再推进过程，看水平汇聚如何与内部变形联系起来。',
        '物质标记间距缩小，层次弯曲，地壳向下增厚；不同部位的地表起伏逐渐增强。沿剖面同时比较水平与垂直变化。',
        '局部山峰与沟谷分别发展，地表作用与内部变形并行。高原形成包含多阶段、多区域过程，不能读作全高原同时升高的时间线。',
      ][phase],
      lookFor: settings.cutaway ? '沿弯曲层次看地壳增厚，再比较地表起伏。' : '先看表面起伏，再展开剖面认识内部变形。',
      provenance: '概念造山剖面 · 阶段进度不对应年代、厚度或真实地层',
      objects: formationObjects, processLabel: '形成过程 · 可回拖比较',
      stops: [{ label: '汇聚起点', progress: 0 }, { label: '缩短与增厚', progress: .55 }, { label: '起伏与侵蚀', progress: 1 }],
    };
  } else if (stepId === 'G4'||stepId==='P1') {
    const longitude = 80 + progress * 18;
    result = {
      title: settings.cutaway || settings.layer === 'relief' ? `沿约 ${longitude.toFixed(1)}°E 读南北高差` : settings.layer === 'water' ? '把谷地位置放回整片地形' : '整体很高，内部仍有山脊与谷地',
      explanation: settings.cutaway || settings.layer === 'relief' ? '从南侧低地越过山系，进入高原内部。移动切线比较不同位置；切线上的高度变化来自高程网格，垂直显示作了夸张，不能直接用画面斜率判断山坡陡缓。' : settings.layer === 'water' ? '先找到雅鲁藏布江谷地与藏东南，再比较周边高低。谷地定位帮助理解水与地形的关系，图中没有提供完整水文河网或流量。' : '先保留北向与南侧山系，再用斜视观察内部起伏。海拔配色用于读高程，图中的山地比水平方向夸张，真实地势与显示效果需要一起看。',
      lookFor: '拖动剖面位置，再转动视野：南侧山系、河谷与高原内部怎样相连？',
      provenance: '公开高程网格 · 地区概览抽样 · 海拔米制 · 垂直显示夸张 40 倍',
      objects: terrainObjects, processLabel: '移动南北剖面 · 选择经度', stops: [],
    };
  } else if (stepId === 'C2') {
    const phase = progress < .28 ? 0 : progress < .52 ? 1 : progress < .78 ? 2 : 3;
    result = {
      title: ['阳光进入，也有一部分被反射', '吸收后，地表储存与分配能量', '地表与空气之间持续交换', '向外散失，也有向下交换'][phase],
      explanation: [
        '沿金色路径看太阳短波来到地表与空气，再分辨被反射回去的部分。进入地球的阳光，并非全部用于加热同一片地面。',
        '地表吸收能量，储存状态随过程改变。太阳照射提供输入，但温度还取决于热量的储存、输出与输送，不能只看照射强弱。',
        '地表发出长波，并通过空气热交换与蒸发分配能量。大气参与吸收、发射和输送；请把不同路径与相应物体联系起来。',
        '地表与大气向外发射长波，大气也向地表发射长波。长时期的净收支影响热量储存；这里的分段展开是解释顺序，真实过程会同时进行。',
      ][phase],
      lookFor: '沿箭头辨认来源、经过的对象与去向；回拖对照各阶段。',
      provenance: 'NASA 能量收支原理 · 箭头宽度不表示通量 · 色彩不表示实测温度',
      objects: energyObjects, processLabel: '能量过程 · 逐层展开',
      stops: [{ label: '进入与反射', progress: .18 }, { label: '吸收与储存', progress: .43 }, { label: '地表与空气', progress: .69 }, { label: '向外与向下', progress: 1 }],
    };
  } else return climateUnderstanding(stepId,settings,picked)||regionalUnderstanding(stepId,settings)||connectionUnderstanding(stepId,settings,picked)||travelUnderstanding(stepId,settings,picked,routeRegions)||railwayUnderstanding(stepId,settings,picked)||developmentUnderstanding(stepId,settings,picked)||livingUnderstanding(stepId,settings,picked)||culturalUnderstanding(stepId,settings,picked)||historyUnderstanding(stepId,settings,picked)||landformUnderstanding(stepId,settings,picked);
  const object = result.objects.find(item => item.id === picked && settings.selected === picked);
  return object ? { ...result, title: object.name, explanation: object.explanation } : result;
}

export const openingConnections = [
  { id: 'G1', label: '地球怎样运转' }, { id: 'G2', label: '找到西藏与来路' },
  { id: 'G3', label: '高原形成' }, { id: 'G4', label: '今天地形' },
  { id: 'C1', label: '照射季节' }, { id: 'C2', label: '能量收支' },
];

export const climateConnections=[{id:'C2',label:'能量收支'},{id:'C3',label:'空气与高度'},{id:'C4',label:'环流来路'},{id:'C5',label:'山地云雨'},{id:'C6',label:'一次天气'},{id:'E1',label:'地区差异'}];
export const focusedSceneLayers:Record<string,{id:string;label:string}[]>={
  K4:[{id:'life',label:'开放场地关系'},{id:'opera-stage',label:'正面舞台关系'}],
  G3:[{id:'plates',label:'板块汇聚'},{id:'crust',label:'地壳增厚'},{id:'surface',label:'起伏与侵蚀'}],
  G4:[{id:'terrain',label:'整体地形'},{id:'water',label:'谷地定位'},{id:'relief',label:'南北剖面'}],
  C2:[{id:'energy',label:'全过程'},{id:'absorption',label:'吸收与储存'},{id:'exchange',label:'地表与空气'}],
  C3:[{id:'temperature',label:'高度与周围'},{id:'parcel',label:'空气团过程'},{id:'wind',label:'沿坡运动'}],
  C4:[{id:'arrival',label:'从地球靠近'},{id:'uplift',label:'地形与抬升'},{id:'cloud',label:'水汽与云雨'},{id:'regions',label:'地区差异'},{id:'life',label:'城市与生活'}],
  C5:[{id:'rain',label:'云雨过程'},{id:'wind',label:'空气抬升'},{id:'water',label:'地表去向'}],
  C6:[{id:'rain',label:'前后状态'},{id:'wind',label:'空气过程'},{id:'water',label:'地表去向'}],
  E1:[{id:'terrain',label:'同域地形'},{id:'locations',label:'地区定位'}],
  E2:[{id:'terrain',label:'同域地形'},{id:'locations',label:'两地定位'}],
  E3:[{id:'terrain',label:'自然条件'},{id:'water',label:'取用与到达'},{id:'settlements',label:'生活组织'}],
  P1:[{id:'terrain',label:'真实高程'}],
  K1:[{id:'architecture',label:'布达拉宫 · 特征与来历'},{id:'construction',label:'院落 · 构造原理'}],
  P2:[{id:'terrain',label:'地表轮廓'},{id:'water',label:'水路'},{id:'sediment',label:'水与物质'}],
  P3:[{id:'terrain',label:'水土条件'},{id:'water',label:'使用联系'},{id:'settlements',label:'生活与记忆'}],
  H1:[{id:'activity',label:'活动证据'},{id:'settlement',label:'全年定居？'},{id:'identity',label:'族群来源？'}],
  H2:[{id:'chronology',label:'时期来路'},{id:'overlap',label:'并行变化'}],
  ...connectionSceneLayers,
  T1:[{id:'terrain',label:'环境关系'},{id:'culture',label:'使用与材料'}],
  T2:[{id:'routes',label:'认识顺序'},{id:'transport',label:'实际到达链'}],
  T3:[{id:'culture',label:'认识与出处'},{id:'transport',label:'条件与记录'}],
  M1:[{id:'ground',label:'冻土与工程'},{id:'transport',label:'通道与运营'}],
  H4:[{id:'event-1951',label:'1951文件'},{id:'event-1959',label:'1959变化'},{id:'event-1965',label:'1965建制'}],
};
