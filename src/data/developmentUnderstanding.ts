import type { SceneSettings } from '../lib/store';
import type { SceneObjectIntroduction, SceneUnderstanding } from './sceneUnderstanding';

export const developmentSourceIds = {
  M1: ['railway', 'statistics-2025', 'access-method'],
  M2: ['statistics-2025', 'society', 'service-readiness'],
  M3: ['unesco', 'tourism-plan', 'statistics-2025'],
} as const;

/** Author-defined qualitative conditions. These are neither observations nor a scoring model. */
export function developmentSystemState(step: number, progress: number) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const stage = p < .32 ? 0 : p < .68 ? 1 : 2;
  const index = Math.max(0, Math.min(2, Math.trunc(step)));
  const labels = [
    ['只有通道', '加入运营服务', '补上末端接驳'],
    ['设施存在', '加入人员与开放', '检查到达与使用'],
    ['先看材料保护与收益', '同时看生态与历史环境', '再把使用与维护放进来'],
  ][index];
  return { progress: p, step: index, stage, label: labels[stage], serviceEnabled: stage >= 1, accessEnabled: stage >= 2, ecologyIncluded: stage >= 1, communityIncluded: stage >= 2 };
}

const transportObjects: SceneObjectIntroduction[] = [
  { id: 'development-link', name: '通道与网络连接', explanation: '实体轨道只代表“具备一条通道”这个教学条件，没有复原青藏铁路或任何真实道路。开通事件可以核实，但实际到达还要继续检查服务与末端接驳。' },
  { id: 'development-service', name: '运营服务条件', explanation: '站房、闸口和车辆用于提问：是否有合适日期的服务、班次、费用与使用条件？模型打开闸口是作者设置的情景，不说明某一真实地区当前已经满足条件。' },
  { id: 'development-lastmile', name: '连接到生活地点的接驳', explanation: '从网络节点到最终目的地，还可能需要接驳、可通行道路与个人可使用的方式。补上模型中的接段，只是把此前遗漏的问题显示出来，没有计算真实旅行时间或保证实际可达。' },
  { id: 'development-community', name: '最终使用者与生活地点', explanation: '房屋与人物是使用目的的示意，不对应具体社区、人口或调查样本。判断交通影响应回到受益者、使用需求、承担成本者及其真实资料。' },
];
const serviceObjects: SceneObjectIntroduction[] = [
  { id: 'development-facility', name: '公共服务设施', explanation: '一栋建筑说明设施在空间中存在；它不能代替开放时间、服务内容、人员和使用记录。模型是通用设施，没有复原任何真实学校、医院或社区。' },
  { id: 'development-staff', name: '人员与开放条件', explanation: '亮起的门厅和出现的人员表示一个教学条件被加入。它引导检查现实中的人员、时间、内容与持续运营资料，不能由建筑外观推断真实服务水平。' },
  { id: 'development-lastmile', name: '到达与使用条件', explanation: '设施开放以后，还要看不同人是否能够到达和使用。模型补出的通行段不代表现实服务范围；地理距离、交通、费用、需求与个人条件应分别调查。' },
  { id: 'development-community', name: '不同人的实际经验', explanation: '两个相同大小的生活单元仅用于比较使用条件，没有人口或收入含义。地区总量与设施分布仍需和有地点、有日期的社区研究相互参照。' },
];
const valueObjects: SceneObjectIntroduction[] = [
  { id: 'development-activity', name: '同一项通用遮护活动', explanation: '同一屋面、支柱与单个无字石质载体解释遮护关系，没有排列真实三碑，也不复原大昭寺、保护棚或拟议整改方案。保持同一构造，再把材料收益、环境和地方生活三个问题共同放进来。' },
  { id: 'development-benefit', name: '材料保护与收益问题', explanation: '外来落线在屋面处停止，石质载体保留在下面，用几何关系说明遮护可能回应的材料需求。落线不是实测风雨或劣化记录，单个无字载体也不代表真实三碑的形制和位置；模型没有计算保护效果或经济收益。' },
  { id: 'development-ecology', name: '生态、视线与历史环境', explanation: '林木和水面仍提示一般生态对象；观察者、背景参照与被同一屋面截住的视线，另行解释构造怎样进入观看关系。背景没有复原遗产立面，虚线只表示需要核对的后方参照。UNESCO案例讨论的具体视线与历史环境需回原材料，不能由模型算出真实视域、生态损失或整改成效。' },
  { id: 'development-community', name: '地方生活、使用与持续维护', explanation: '使用者与维护者接近同一遮护活动，提示持续使用、照护责任与人的经验也应纳入。人物不扮演真实朝礼者、居民或工作人员。规划目标、项目状态和实际影响仍须材料核对，不能把三个对象合成一个总分。' },
];

export function developmentUnderstanding(stepId: string, settings: SceneSettings, picked = ''): SceneUnderstanding | undefined {
  const step = ['M1', 'M2', 'M3'].indexOf(stepId);
  if (step < 0) return undefined;
  const state = developmentSystemState(step, settings.progress), stage = state.stage;
  const descriptions = [
    [
      '两端已有主通道，目的地仍未接到可使用的出行链条。先把“空间相连”与“实际能够使用”分开，再逐步加入运营服务和末端接驳。',
      '闸口开放，车辆沿教学轨道到达节点；终点生活单元仍隔着未补齐的接段。班次、费用、日期和使用条件应从现实资料核实，列车移动本身不是社会影响证据。',
      '接驳段连到生活单元，使用者才能在这个条件模型里继续前行。现在已经看全通道、运营和末端三个问题；现实可达性仍要核实日期、状态、费用与人的条件。',
    ],
    [
      '设施已经建在生活单元附近，但门厅尚未开放，人员与到达条件也未加入。看见建筑只能说明空间中有什么，不能据此判断服务已经覆盖所有人。',
      '人员和门厅加入同一设施，服务具备了新的条件；生活单元到设施的接段仍待核实。地区设施总量、开放状态和人的实际使用属于不同资料层次。',
      '到达接段加入，使用者在模型里走向同一设施。这个过程解释为什么需要把设施、运营与可使用条件合看；它没有提供真实覆盖率，也不说明不同人得到同样的服务。',
    ],
    [
      '保持同一通用遮护构造，先看外来落线在屋面处停止，石质载体留在下面。它解释一种材料保护关系，没有模拟真实风雨劣化或保护成效；单个无字载体也不是三碑位置与形制的还原。只看材料收益，还没有完整讨论环境和人的使用。',
      '加入生态与历史环境问题：林木、水面是一般对象提示，观察者到背景的视线则实际遇到同一屋面而中止。后方虚线是背景参照，不是通视保证；真实碑棚的视线代价需来源与实地评估，不能从模型计算。遮护构造与材料始终没有改变。',
      '使用者和维护者走向同一活动，把地方生活与持续照护放进讨论。材料保护、生态与历史环境、使用责任同时可见，仍不能合成总分；规划目标、项目状态、实际影响和长期维护都要分别核实，拟议调整也没有被动画变成完成。',
    ],
  ];
  const unit: SceneUnderstanding = {
    title: state.label,
    explanation: descriptions[step][stage],
    lookFor: (step === 2 ? '保留同一构造：先看落线被屋面截住，再沿观察者视线找实际遮挡，最后加入使用与维护。阶段表示提问范围，不是历史施工或整改进度。' : '回到第一阶段，再逐项补齐条件：哪一段已经具备，哪一段仍缺少？') + (settings.layer === 'ecology' ? ' 当前关注环境对象，未赋予影响数值。' : settings.layer === 'settlements' ? ' 当前圈出生活或服务空间。' : ' 当前圈出通道、使用接段或讨论中的活动。'),
    provenance: step===2?'教学条件模型 · 无真实设施或三碑位置、尺度 · 非遗产/保护棚复原或整改方案 · 阶段无成效分值':'教学条件模型 · 无真实设施、轨道或服务范围 · 阶段不对应日期、指标或成效',
    objects: [transportObjects, serviceObjects, valueObjects][step],
    processLabel: step === 2 ? '同一遮护 · 材料收益 → 环境视线 → 使用维护' : '同一问题 · 从条件不足到补齐条件',
    stops: [
      { label: ['只有通道', '设施存在', '收益问题'][step], progress: .12 },
      { label: ['运营服务', '人员与开放', '加入生态'][step], progress: .52 },
      { label: ['末端接驳', '到达与使用', '地方生活'][step], progress: 1 },
    ],
    hasProgress: true,
    allowsCutaway: false,
  };
  const object = unit.objects.find(item => item.id === picked && settings.selected === picked);
  return object ? { ...unit, title: object.name, explanation: object.explanation } : unit;
}
