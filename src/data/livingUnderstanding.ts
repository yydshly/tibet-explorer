import type { SceneSettings } from '../lib/store';
import type { SceneObjectIntroduction, SceneUnderstanding } from './sceneUnderstanding';

export type LivingSetting = 'valley' | 'upland';
export type CommunitySupport = 'individual' | 'shared';
export type LivingScenarioSettings = SceneSettings & { livingSetting?: LivingSetting; communitySupport?: CommunitySupport };

export const livingSourceIds = { E3: ['geography', 'society'], P3: ['geography', 'society', 'unesco'] } as const;

/** Controlled teaching cases, never a classification or reconstruction of real communities. */
export function livingLandscapeState(settings: Pick<LivingScenarioSettings, 'progress' | 'livingSetting' | 'communitySupport'>) {
  const progress = Math.max(0, Math.min(1, Number.isFinite(settings.progress) ? settings.progress : 0));
  const stage = progress < .28 ? 0 : progress < .68 ? 1 : 2;
  const setting: LivingSetting = settings.livingSetting === 'upland' ? 'upland' : 'valley';
  const support: CommunitySupport = settings.communitySupport === 'shared' ? 'shared' : 'individual';
  const smooth=(a:number,b:number)=>{const t=Math.max(0,Math.min(1,(progress-a)/(b-a)));return t*t*(3-2*t);};
  const fill=smooth(.28,.40),carry=smooth(.40,.72),pour=smooth(.74,.94);
  return { progress, stage, setting, support,fill,carry,pour,carriedWater:fill*(1-pour),storedWater:pour,waterStage:progress<.28?'source':progress<.4?'fill':progress<.74?'carry':'store', settingLabel: setting === 'valley' ? '河谷条件设定' : '高地条件设定', supportLabel: support === 'shared' ? '共同取水与通行' : '分别取水与通行' };
}

const livingObjects: SceneObjectIntroduction[] = [
  { id: 'living-slope', name: '山坡与起伏', explanation: '坡地改变行走和用地的空间条件。这里的山坡是作者建立的对照几何，没有真实坡度、海拔或地名；切换河谷与高地设定只比较条件组合，不从一种地貌推出固定的生活方式。' },
  { id: 'living-water', name: '水源与河道条件', explanation: '水源提供使用的前提，但看见水并不等于每个生活地点都能直接取用。模型中的水路与流动方向是条件示意，没有实测流量或全年供水保证；真实判断还需季节、水质、设施与使用资料。' },
  { id: 'living-land', name: '较缓的可利用地面', explanation: '在这组教学设定中，河谷情景给出较连贯的缓地，高地情景将缓地分为几处。它们不代表所有河谷或高地；缓地如何使用，还要看土壤、水热、技术、权利与人的选择。' },
  { id: 'living-access', name: '从水源到生活区的通行', explanation: '实体踏步和通行段连接取水点、工作地块与房屋。切换组织方式时，自然地形与水源保持不变，只改变共同或分别使用的设施；路径不是核实过的真实村道。' },
  { id: 'living-work', name: '生产与使用的空间', explanation: '种植行列、地块和牲畜通行只用来说明工作需要空间与到达条件，没有指定真实作物、经营类型、产量或收入。不同生计并不能由海拔或河谷位置自动决定。' },
  { id: 'living-houses', name: '房屋与生活空间', explanation: '相同环境仍可有不同的技术、安排与文化实践。房屋只表示生活目的，尺寸、屋顶与布局不复原某个藏族村落；继续进入建筑章节，需要把空间用途与真实调查材料联系起来。' },
  { id: 'living-shared', name: '共同使用与维护的构件', explanation: '共同取水点、通行段与集中的储水位置展示一种组织选择。设施不会自行带来协作，使用、维护和规则仍需安排；这不是对集体或分别使用方式作优劣评分。' },
  { id: 'living-memory', name: '从使用进入地方记忆', explanation: '工作与生活空间可以引出地名、故事、信仰和历史的问题，但模型没有替任何地方编造记忆。桌面上的空白记录材料提示下一步查找具体社区、时期与使用者的证据。' },
];

export function livingUnderstanding(stepId: string, settings: LivingScenarioSettings, picked = ''): SceneUnderstanding | undefined {
  if (stepId !== 'E3' && stepId !== 'P3') return undefined;
  const state = livingLandscapeState(settings), shared = state.support === 'shared', upland = state.setting === 'upland';
  const first = upland
    ? '在当前高地设定里，缓地分成几处，水路放在生活区的一侧。先比较坡地、缓地和取水位置；这是作者安排的条件组合，不表示高地一定缺水、必须采用某一种生计。'
    : '在当前河谷设定里，较连贯的缓地邻近一条水路。先找水、地面高低和可用空间；它们提供条件，却还没有决定房屋、生产或文化应该怎样安排。';
  const using = shared
    ? '保持自然地形不变，共同取水点、桥板与共用通行段被加入。容器先取水，人物再沿通行段把水带到用水处，最后倒入储水容器；水不会自行流向高处。设施把使用方式组织起来，使用与维护规则仍是需要人的行动来回答的问题。'
    : '保持自然地形不变，取水与通行联系分别落到生活单元。先取水、再沿路径携水、最后倒入用水处的容器；有水源与缓地，并不自动等于可以随处建设、直接用水或获得相同的使用条件。';
  const result = shared
    ? '房屋、工作地块与共用空间保持相接，携水经过通行段来到用水处。比较“分别”和“共同”两种组织，自然地形与水源没有改变，改变的是设施和使用联系；这个模型不给组织方式算分，也不代表真实社区已采用这些安排。'
    : '房屋、工作地块与分别使用的储水位置相接，携水经过通行段来到用水处。切到共同组织，比较哪些空间构件改变、哪些自然条件不变；不要把地形直接读成房屋式样、族群身份或一种必然的文化。';
  const culturalBridge = stepId === 'P3' && state.stage === 2
    ? ' 这些使用关系是进入建筑、日常与地方记忆的入口；地名、信仰和历史事件仍要由具体人的实践与材料解释。'
    : '';
  const unit: SceneUnderstanding = {
    title: [upland ? '先看高地设定中的水与缓地' : '先看河谷设定中的水与缓地', shared ? '共同设施怎样连接使用' : '从水源到使用地点，还要怎样到达', stepId === 'P3' ? '从生活空间提出文化与历史问题' : '同样环境，可以怎样组织生活'][state.stage],
    explanation: [first, using, result][state.stage] + culturalBridge,
    lookFor: '固定环境，切换分别／共同组织；再固定组织，比较河谷／高地条件。看改变的是自然条件，还是人的设施与安排。',
    provenance: '教学条件对照 · 非真实村落、气候分区或历史复原 · 无实测人口、产量、流量与文化归因',
    objects: livingObjects.filter(object => object.id !== 'living-memory' || stepId === 'P3'),
    processLabel: '自然条件 → 取用与到达 → 生活空间与组织',
    stops: [{ label: '水与地形条件', progress: .12 }, { label: '取用与到达', progress: .5 }, { label: '生活空间与组织', progress: 1 }],
    hasProgress: true,
    allowsCutaway: false,
  };
  const object = unit.objects.find(item => item.id === picked && settings.selected === picked);
  return object ? { ...unit, title: object.name, explanation: object.explanation } : unit;
}
