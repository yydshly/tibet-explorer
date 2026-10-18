import { regions } from './curriculum';
import type { SceneSettings } from '../lib/store';
import type { SceneObjectIntroduction, SceneUnderstanding } from './sceneUnderstanding';

export const travelEvidenceSourceIds = {
  T1: ['geography', 'unesco', 'tourism-plan'],
  T2: ['tourism-plan', 'geography', 'met-exchange'],
  T3: ['tourism-plan', 'railway', 'weather'],
} as const;

/** One input entry represents one actual selected stop. Keep different stops in the same region. */
export function travelCandidateRegions(routeRegions?: readonly string[]) {
  return (routeRegions ?? []).filter(id => regions.some(region => region.id === id));
}
export function travelJourneyState(step: number, progress: number, routeRegions?: readonly string[]) {
  const index = Number.isFinite(step) ? Math.max(0, Math.min(2, Math.trunc(step))) : 0;
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const stage = p < .32 ? 0 : p < .68 ? 1 : 2;
  const candidates = travelCandidateRegions(routeRegions);
  return { step: index, progress: p, stage, candidates, candidateCount: candidates.length, isActualItineraryVerified: false as const,
    title: [
      ['先看同一个地方的外观', '沿地形与水理解环境联系', '把人的使用与材料放回来'],
      ['主通道只完成一段移动', '换乘与接驳还是独立条件', '走到入口，还要核实访问'],
      ['保留有出处的认识', '日期与动态条件单独核实', '留下个人记录与继续入口'],
    ][index][stage] };
}

const observationObjects: SceneObjectIntroduction[] = [
  { id: 'travel-landform', name: '连续山地与河谷', explanation: '先把坡面、谷地与周围联系一起观察，再进入局部。这里是教学地形，没有冒充某座真实山峰、测量高程或地貌现场；真实候选站的位置保留在整体地图与地点资料里。' },
  { id: 'travel-water', name: '水路与环境证据', explanation: '蓝色水路帮助读高低与来去方向，不表示真实河网、流量或当天雨情。带着气候章节的问题看地方，还要分开现场所见、季节状态与长期资料。' },
  { id: 'travel-settlement', name: '人居与地方使用', explanation: '人居不是自然颜色自动生成的结果。房屋和通行空间用来提问谁在使用、需要什么条件；对象没有复原某个真实社区，也没有人口或生活水平含义。' },
  { id: 'travel-heritage', name: '建筑、用途与历史材料', explanation: '展开屋顶后可看入口、庭院与内部空间。它提示建筑要连同使用和历史材料认识，没有复制真实遗产的尺度、刻文或布局；具体西藏案例由相应地点与材料卡支持。' },
  { id: 'travel-question', name: '带着问题观察与记录', explanation: '空白记录架提醒留下为什么关注、准备观察什么、来源支持什么。它不代替个人笔记，也不会替你编造已发生的现场观察。' },
];
const accessObjects: SceneObjectIntroduction[] = [
  { id: 'travel-corridor', name: '示例主通道', explanation: '实体路段与车辆只演示移动链条的第一段，不是西藏某条公路、铁路或已经可用的交通服务。模型中没有公里、时速、票价、当前班次或跨地区单日安排。' },
  { id: 'travel-transfer', name: '换乘与末端接驳', explanation: '主通道到站后，接驳车辆与候车空间是另一组条件。现实中是否有这类服务、何时开行、是否适用，需要按出行日期查证，不能由车辆开始运动推定。' },
  { id: 'travel-lastmile', name: '步行到达与访问入口', explanation: '从下车处到入口，仍可能需要步行、预约及符合访问条件。示例人物只走到入口外，闸口状态保持待核实；到达不等于已经获准进入。' },
  { id: 'travel-candidates', name: '自己实际选择的候选站', explanation: '候选计数只来自现有计划中每个有效站点输入，同一地区的不同站点分别保留。空计划显示零站；示例A、B不自动加入计划，也不冒充用户选定路线。' },
];
const recordObjects: SceneObjectIntroduction[] = [
  { id: 'travel-evidence', name: '认识与材料出处', explanation: '保存时把每站的观察目的和对应知识来源放在一起。柜中空白材料载体只是组织方法，不表示已经收藏某件实物、完成调查或证明全部认识。' },
  { id: 'travel-conditions', name: '日期、交通与开放状态', explanation: '空的状态位表示仍需核实，而不是通行通过。历史开通报道、规划方向和教学车辆都不能保证某日期道路、服务、预约或开放有效。' },
  { id: 'travel-record', name: '个人记录与继续探索', explanation: '笔记本展开表示可以补充原问题、新观察与待核实事项。实际内容与保存、导出由个人计划操作完成；动画不会自行把旅行标记为完成或把空白页变成真实游记。' },
  accessObjects[3],
];

export function travelUnderstanding(stepId: string, settings: SceneSettings, picked = '', routeRegions?: readonly string[]): SceneUnderstanding | undefined {
  const index = ['T1', 'T2', 'T3'].indexOf(stepId); if (index < 0) return undefined;
  const state = travelJourneyState(index, settings.progress, routeRegions);
  const countNote = state.candidateCount === 0 ? '目前没有已选候选站；示例A、B不会自动成为你的路线。' : state.candidateCount === 1 ? '当前只有1个候选站，还可继续寻找与问题相连的下一站。' : `当前有${state.candidateCount}个候选站；认识顺序与实际交通安排仍需分别检查。`;
  const paragraphs = [
    [
      '保留同一片山地河谷，先辨认水、坡地、人居与建筑。外观帮助找到对象，但解释还需要环境过程、使用者与有出处的材料。',
      '蓝色水路和沿坡参照展开，帮助将山坡高低、水的来去与谷地空间联系起来。画面是原理模型；进入真实西藏地点后，要继续核对具体地形、季节与观测。',
      '同一建筑屋顶打开，入口、庭院与记录架出现。环境认识接到人的使用，再由具体建筑、人物、事件与材料解释历史文化；不能只凭风景推断信仰与地方记忆。',
    ],
    [
      '示例A与B保持在同一河谷，主通道把车辆送到一个节点。它只解释出行链的第一段，没有说明最终地点已经可访问。',
      '主通道车辆停在节点，接驳车辆沿另一段继续。换乘、候车与末端接驳有各自的服务条件；现实安排需要日期、服务和地方资料。',
      '人物沿末段踏步走到入口外，闸口仍保留待核实状态。知识顺序可以形成候选路线，真实道路、开放和预约却不能靠一段动画确认。',
    ],
    [
      '有出处的认识被放到材料柜中：每站为什么去、观察什么，应能够回到对应章节与来源。先保留问题，再补实际安排。',
      '日期和服务状态桌展开，空的状态位仍未变成通过。把交通、开放、预约与天气的适用日期单独记录；规划目标和历史事件不等于当日可行。',
      '个人笔记和继续入口展开，把已知、未知和新观察放在不同位置。保存或导出真实计划后仍可修改，回来再把现场记录接回原问题；画面没有宣告已经出行或完成旅行。',
    ],
  ];
  const unit: SceneUnderstanding = {
    title: state.title, explanation: paragraphs[index][state.stage] + (index > 0 ? ` ${countNote}` : ''),
    lookFor: index === 0 ? '保留同一个地方，逐步展开自然条件、人的使用与材料；切主题时看关注对象怎样改变。' : index === 1 ? '从主通道追到接驳，再走到入口；回拖检查哪一段尚未连接，哪些状态仍待核实。' : '分别查看认识出处、动态条件和个人记录，不把保存动作当成条件已经通过。',
    provenance: '教学河谷与访问链 · 非真实道路、文物复原或即时出行资料 · 候选计数来自实际选择',
    objects: [observationObjects, accessObjects, recordObjects][index],
    processLabel: ['外观 → 环境关系 → 人的使用与材料', '主通道 → 换乘接驳 → 步行与访问', '认识出处 → 条件待核实 → 个人记录与继续'][index],
    stops: [
      { label: ['整体外观', '主通道', '认识出处'][index], progress: .12 },
      { label: ['环境联系', '换乘接驳', '日期与状态'][index], progress: .5 },
      { label: ['使用与材料', '步行与入口', '记录与继续'][index], progress: 1 },
    ], hasProgress: true, allowsCutaway: false,
  };
  const selected = unit.objects.find(object => object.id === picked && settings.selected === picked);
  return selected ? { ...unit, title: selected.name, explanation: selected.explanation } : unit;
}
