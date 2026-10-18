import type { SceneSettings } from '../lib/store';
import type { SceneObjectIntroduction, SceneUnderstanding } from './sceneUnderstanding';

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const phase = (p: number, from: number, to: number) => {
  const t = clamp((p - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** Author-controlled qualitative sequences; never historical dates or survey measurements. */
export function culturalProcessState(step: number, progress: number) {
  const index = Math.max(0, Math.min(3, Math.trunc(Number.isFinite(step) ? step : 0)));
  const p = clamp(progress), stage = p < .32 ? 0 : p < .68 ? 1 : 2;
  const labels = [
    ['先落基底与墙体', '接起梁柱与屋顶', '空间进入人的使用'],
    ['文本与教学来到工作空间', '译写、选择与地方学习', '知识进入空间实践'],
    ['辨认木护板与书页', '整理并叠放书页', '护板合拢，保护书页'],
    ['表演与观看怎样组织', '从观看走近示范', '给学习者留出实践位置'],
  ];
  return {
    step: index, progress: p, stage, label: labels[index][stage],
    wallCompletion: phase(p, 0, .28), frameCompletion: phase(p, .28, .52), roofCompletion: phase(p, .48, .68),
    incomingText: phase(p, 0, .32), localLearning: phase(p, .32, .68), practice: phase(p, .68, 1),
    passing: phase(p, 0, .32), cooperation: phase(p, .32, .68), maintenance: phase(p, .68, 1),
  };
}

const sharedObjects: SceneObjectIntroduction[] = [
  { id: 'courtyard', name: '院落与通行空间', explanation: '同一处院落把进入、停留与不同房间联系起来。模型保留这些空间关系，不对应某座真实建筑、仪式或社区；具体用途仍要结合使用者、年代与地方材料。' },
  { id: 'materials', name: '墙体、梁柱与连接', explanation: '先分清围合、支承与覆盖，再观察材料怎样组成空间。环境会影响材料获取和使用条件，工艺、用途、制度、信仰与后续改建也参与形成，不能只由气候推出建筑样式。' },
  { id: 'hall', name: '厅堂与使用背景', explanation: '厅堂是布局中的功能空间参照，模型没有给它指定真实寺院身份。空间用途需要人物、文本、遗产资料和相关时代说明；相似外观不保证相同功能。' },
];

const objects: SceneObjectIntroduction[][] = [
  [...sharedObjects,
    { id: 'culture-base', name: '基底与围合的起点', explanation: '先把基底落在场地上，再显出墙体围合。分段搭建用于辨认构造关系，并非任何真实建筑的施工记录；实际工程还需材料、结构和建设资料。' },
    { id: 'culture-use', name: '从入口到院落和厅堂', explanation: '后段人物在入口、院落与厅堂前停留，说明空间安排会影响行动可能。这些是通用使用情景，不复原宗教仪式，也不代表所有家庭或社区。' }],
  [...sharedObjects,
    { id: 'culture-text', name: '文本载体与工作桌', explanation: '空白纸张代表可以传递和整理的知识载体，模型没有仿造经文、书法或古代原作。真实人物、文本与年代，应回到已有的博物馆及研究材料。' },
    { id: 'culture-learning', name: '译写与地方学习', explanation: '同一桌面增加对照纸张和学习者，表示交流经过翻译、选择、学习和当地解释。画面不复原阿底峡的具体课堂，也不声称这些人物就是历史参与者。' }],
  [
    { id: 'culture-craft', name: '木护板与书页的保护关系', explanation: '大都会馆藏1987.407.6是约12世纪早期的西藏木经板；馆方解释成对木护板保护脆弱书页。眼前两块护板和空白书页只演示保护关系，不是该件文物原配书册、尺寸或图像的复原。' }],
  [
    { id: 'opera-space', name: '场地与观看关系', explanation: 'UNESCO介绍藏戏可在广场、寺院以及舞台演出。这里用开放与正面两种空间安排比较观看方向；人物数量、圆形排布和尺寸是教学设计，不代表固定传统或真实剧场。' },
    { id: 'opera-performance', name: '讲述与表演的配合', explanation: 'UNESCO说明主要戏剧由讲述者叙述，并有表演、歌舞等配合。金色与青色角色用来辨认分工；模型不模仿唱腔、舞步、服饰或某场真实演出。' },
    { id: 'opera-learning', name: '示范、观看与参与练习', explanation: '学习者从观看位置走近示范，再进入共同实践空间，说明传承需要参与机会。2009年评审决定提出年轻实践者培训等措施；这一机制演示不等于真实教学记录或已证实的培训效果。' }],
];

export function culturalUnderstanding(stepId: string, settings: SceneSettings, picked = ''): SceneUnderstanding | undefined {
  const index = ['K1', 'K2', 'K3', 'K4'].indexOf(stepId);
  if (index < 0) return;
  const state = culturalProcessState(index, settings.progress), stage = state.stage;
  const explanations = [
    [
      '先保留场地与基底，让墙体逐渐围出院落与房间。观察哪一部分围合、哪一部分仍可进入；这是构造关系的教学顺序，不是某座遗产的施工年表。',
      '立柱、梁与覆盖部位依次接入原有围合，屋顶落到支承之上。剖面可以拆开前墙和覆盖，帮助分清内部连接；材料获取是约束，用途、工艺和人的选择也参与形成。',
      '构造保持完整，人物从入口进入院落，再走向厅堂前。空间为通行和停留提供可能，具体用途与制度、信仰及改建史仍需地方资料，不能由气候直接推出。',
    ],
    [
      '同一院落中的工作桌先等待知识载体，空白纸张逐渐来到桌面。它表示文本或教学进入一个地方的可能过程，没有还原具体历史人物、路线或原文。',
      '桌面增加可以对照的纸张，学习者加入工作，笔与纸发生配合。交流需要翻译、选择和地方学习，不是把外来形式原样搬进一座建筑；真实藏印交流案例另由材料说明。',
      '整理后的载体与学习者从桌边走向厅堂前，原有院落仍在。知识通过使用者进入空间实践，但实践内容、人物与年代必须由真实文本和地方研究解释。',
    ],
    [
      '先辨认两块木护板与中间的空白书页。馆藏1987.407.6给出真实木经板案例，模型只拆开保护关系；没有给这件文物补造原配书页或另一块原板。',
      '分散的空白书页整理、对齐并叠放，下方护板承托。书页和木板各有作用，载体的制作与保护参与文本流传；这些空白页不代表未知经文或真实叶数。',
      '上方护板降下，书页收在两板之间。现在可以回拖看被遮住的书页与保护面；实物上的佛教图像及红色颜料痕迹要由馆藏记录核对，模型没有仿刻。',
    ],
    [
      '以藏戏为具体案例，先辨认讲述者、表演者与观看者。场地要容纳表演和观看，角色通过合作使内容被表达；模型只组织空间和分工，没有替真实表演编写动作。',
      '学习者离开观看位置，走近示范者，朝向共同的练习空间。物件可以被保存，实践还需要人学习；这是理解传承条件的关系演示，不能把走到场内当成已经学会。',
      '学习者进入共同实践的位置，示范者仍在场。2009年UNESCO评审提出培训、研究和出版等保护措施；有参与机会是可以观察的条件，掌握程度与长期效果仍需要教学和后续记录。',
    ],
  ];
  const result: SceneUnderstanding = {
    title: state.label, explanation: explanations[index][stage],
    lookFor: [
      '退回基底，再接起梁柱与覆盖；展开剖面，比较构造如何组织通行和停留。',
      '保持同一桌面与建筑，分别看载体到来、学习对照和进入使用，避免把传播当成直接复制。',
      '展开木护板、整理书页，再合拢；对照约12世纪早期的真实经板，分清用途、年代与模型。',
      '固定同一组角色和学习阶段，切换开放场地与正面舞台；再回拖，观察观看者怎样走向参与位置。',
    ][index],
    provenance: index===3?'UNESCO 藏戏资料 · 场地与学习关系示意 · 无寺院、真实剧场或编舞复原；人数不代表实际规模':'通用文化过程模型 · 无寺院或历史课堂复原 · 无原作文字、宗教符号或社区调查数据',
    objects: objects[index], processLabel: ['构造形成与使用', '载体、学习与实践', '木护板与书页 · 从展开到保护', '从观看到参与 · 不是能力评分'][index],
    stops: [
      { label: ['基底与墙体', '载体来到', '展开护板', '表演与观看'][index], progress: .18 },
      { label: ['梁柱与屋顶', '译写学习', '整理书页', '走近示范'][index], progress: .52 },
      { label: ['空间使用', '进入实践', '护板合拢', '参与练习'][index], progress: 1 },
    ], hasProgress: true, allowsCutaway: index < 2,
  };
  if(index===3)result.explanation+=settings.layer==='opera-stage'?' 当前是正面舞台关系：观看者面向同一侧，练习位置仍被保留。场地变化不自动表示内容或传统消失。':' 当前是开放场地关系：观看方向分布在场地周围。此圆形安排用于比较空间，不是所有藏戏的统一布局。';
  const object = result.objects.find(item => item.id === picked && settings.selected === picked);
  return object ? { ...result, title: object.name, explanation: object.explanation } : result;
}
