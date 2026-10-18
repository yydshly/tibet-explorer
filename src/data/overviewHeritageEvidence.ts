import { overviewNarrationCues } from './overviewNarration';

/** Real collection photographs. Dates belong to the surviving objects, not to
 * the journeys or events in which the represented people participated. */
export interface OverviewHeritageObject {
  id: 'atisha' | 'manuscript-cover';
  title: string;
  date: string;
  material: string;
  accession: string;
  image: string;
  imageAlt: string;
  width: number;
  height: number;
  source: string;
  scope: string;
  supports: string;
  limit: string;
}

export const overviewHeritageObjects: readonly OverviewHeritageObject[] = [
  {
    id: 'atisha', title: '阿底峡画像', date: '12世纪前中期',
    material: '布上设色与金彩', accession: '1993.479',
    image: '/assets/overview-heritage/met-atisha-38006.jpg',
    imageAlt: 'Met馆藏阿底峡画像：画中人物戴黄帽，右手呈授课手势，左手持经书。',
    width: 452, height: 625,
    source: 'https://www.metmuseum.org/art/collection/search/38006',
    scope: '馆藏归属地区：西藏；未以这幅画确定具体制作地点。',
    supports: '肖像把教师身份、授课手势与文本放在同一画面，提供后来怎样纪念阿底峡的艺术材料。',
    limit: '1042年是阿底峡入藏的事件时间；这件12世纪画像不是当年行旅现场的纪实影像。',
  },
  {
    id: 'manuscript-cover', title: '释迦牟尼、文殊与金刚手经板', date: '约12世纪初',
    material: '木；残存红色颜料', accession: '1987.407.6',
    image: '/assets/overview-heritage/met-manuscript-cover-37610.jpg',
    imageAlt: 'Met馆藏横长木经板，中央释迦牟尼，两侧文殊和金刚手，板面有雕刻。',
    width: 600, height: 450,
    source: 'https://www.metmuseum.org/art/collection/search/37610',
    scope: '馆藏归属地区：西藏；未把制作地点钉到托林或其他寺院。',
    supports: '木板保护易损的长条经页，雕刻又承载宗教图像；知识保存、材料工艺与艺术用途由一件实物连在一起。',
    limit: '它是一件经书封板，不是正文页，不能从这张照片读出经文或确定所有经书的形制。',
  },
];

export interface OverviewHeritageMoment {
  recordingId: string;
  token: string;
  until: string;
  objectId: OverviewHeritageObject['id'];
  observation: string;
  /** Rectangle over visible features, normalized to the unchanged full photo.
   * These are reading aids, not archaeological measurements or expert tracings. */
  rectangles?: readonly (readonly [number, number, number, number])[];
  explanation: string;
}

export const overviewHeritageMoments: readonly OverviewHeritageMoment[] = [
  {
    recordingId: 'OVERVIEW-history-middle', token: '阿底峡', until: '教师、译者和文本', objectId: 'atisha',
    observation: '1042年行旅 ≠ 12世纪画像',
    explanation: '先分开人物到达的年代，与后人制作、保存肖像的年代。',
  },
  {
    recordingId: 'OVERVIEW-history-middle', token: '教师、译者和文本', until: '十三至十四世纪', objectId: 'atisha',
    observation: '观察框：右手授课手势', rectangles: [[.2, .33, .31, .22]],
    explanation: '馆方说明右手为授课手势；可由画像看教师如何被表现，具体译事仍需其他文本。',
  },
  {
    recordingId: 'OVERVIEW-evidence-reading', token: '眼前的阿底峡画像', until: '授课手势和手持经书', objectId: 'atisha',
    observation: '先读画像年代，再读人物事件',
    explanation: '12世纪前中期是这件存世画像的断代；1042年则属于人物行旅，不能把两种时间合并。',
  },
  {
    recordingId: 'OVERVIEW-evidence-reading', token: '授课手势和手持经书', until: '再看约十二世纪初的木经板', objectId: 'atisha',
    observation: '观察框：授课手势、手持经书', rectangles: [[.2, .33, .31, .22], [.69, .27, .26, .13]],
    explanation: '馆方分别解释右手的授课手势与左手的棕榈叶经书。二者把教师身份放在同一画面中。',
  },
  {
    recordingId: 'OVERVIEW-evidence-reading', token: '再看约十二世纪初的木经板', until: '保存、学习与工艺联系在一起', objectId: 'manuscript-cover',
    observation: '观察框：护经木板与雕刻', rectangles: [[.075, .31, .85, .38]],
    explanation: '长条木板既保护经页，也承载雕刻图像，把保存用途与工艺放到同一实物中看。',
  },
];

export interface OverviewHeritagePresentation {
  object: OverviewHeritageObject;
  moment: OverviewHeritageMoment;
  /** The same source-word position controls both picture opacity and map
   * allowance. Adjacent readings of one object share the continuous envelope. */
  presence: number;
}

/** Only the exact unchanged source script can activate an object. The same
 * textProgress used by captions/map selects a window; there is no extra clock.
 * Outside the short object window, the complete map gets the stage back. */
export function overviewHeritagePresentation(
  recordingId: string, text: string, textProgress: number,
): OverviewHeritagePresentation | undefined {
  const cue = overviewNarrationCues.find(item => item.id === recordingId);
  if (!cue || cue.narration !== text || !Number.isFinite(textProgress) || textProgress < 0 || textProgress > 1) return undefined;
  const position = textProgress * text.length;
  const windows = overviewHeritageMoments.filter(item => item.recordingId === recordingId)
    .map(moment => ({ moment, start: text.indexOf(moment.token), end: text.indexOf(moment.until) }))
    .filter(item => item.start >= 0 && item.end > item.start).sort((a, b) => a.start - b.start);
  const index = windows.findIndex(item => position >= item.start && position < item.end);
  if (index < 0) return undefined;
  const { moment } = windows[index];
  let first = index, last = index;
  while (first > 0 && windows[first - 1].moment.objectId === moment.objectId && windows[first - 1].end === windows[first].start) first--;
  while (last + 1 < windows.length && windows[last + 1].moment.objectId === moment.objectId && windows[last].end === windows[last + 1].start) last++;
  const smooth = (distance: number) => { const fraction = Math.max(0, Math.min(1, distance / 4)); return fraction * fraction * (3 - 2 * fraction); };
  const presence = Math.min(smooth(position - windows[first].start), smooth(windows[last].end - position));
  const object = overviewHeritageObjects.find(item => item.id === moment.objectId);
  return object ? { object, moment, presence } : undefined;
}
