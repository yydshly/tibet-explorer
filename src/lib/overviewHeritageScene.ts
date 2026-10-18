import {cityContinuityLessons} from '../data/cityContinuityLessons';
import {overviewNarrationCues,barkhorNarration,lhasaUrbanNarration} from '../data/overviewNarration';
import {cityContinuityAudioSegments} from './cityContinuityAudio';
import {cityContinuityPartState} from './cityContinuityState';
import {CITY_SCENE_END_MARGIN,cityNarrationSceneProgress} from './cityNarrationSceneProgress';
import type {NarrationTiming} from './narrationTiming';
import type {OverviewPresentation} from './overviewScene';

/** Three existing recordings read contemporary, acquired geography. The dated
 * uses are historical evidence; neither the OSM footprint nor its height is a
 * reconstruction of the seventh or seventeenth century. */
export const overviewHeritageLessons=cityContinuityLessons.history.lhasa;
export const overviewHeritageRecordingIds=overviewHeritageLessons.map(part=>part.id);

export interface OverviewHeritageBeat {
  id:string;
  title:string;
  recordingId:string;
  text:string;
  segmentId?:string;
}

const segments=cityContinuityAudioSegments('history');
const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

export function isOverviewHeritageRecording(recordingId:string):boolean {
  return overviewHeritageRecordingIds.includes(recordingId);
}

const readings=[
  {
    year:'7世纪',
    titles:['拉萨：从河谷与老城定位','大昭寺：定位现状轮廓','大昭寺：宗教活动用途','始建年代与现存形制分开'],
    explanations:[
      '先辨认河流、道路与老城，再读建筑所在的城市关系。',
      '真实OSM轮廓说明大昭寺在哪里；它不是7世纪的测绘。',
      'UNESCO记述大昭寺7世纪创建及宗教用途，年代与活动共同解释地方。',
      '始建年代不等于全部现存构件的年代，也不能据现状倒画古城。',
    ],
  },
  {
    year:'1645—1648年',
    titles:['同一座城市：转向布达拉宫','白宫：建设年代与主持者','礼仪、接见与居住的需要','用途组织空间，年代分别阅读'],
    explanations:[
      '保持拉萨河谷与公共路网，转到另一处历史对象。',
      '研究将五世达赖喇嘛主持的白宫建设置于1645—1648年。',
      '礼仪、接见与居住有不同空间需要；图上仍使用布宫整体轮廓。',
      '用有依据的活动理解空间，不从地形直接推出建筑史。',
    ],
  },
  {
    year:'1690—1694年',
    titles:['同一布宫轮廓：改读红宫','红宫：纪念与宗教活动','红宫：灵塔和宗教活动空间','回到今天：理解使用再谈抵达'],
    explanations:[
      '桑结嘉措主持1690—1694年红宫建设，时间与白宫分别阅读。',
      '年代、主持者与用途各有材料；不把现状轮廓拆成猜测的古代分区。',
      '灵塔和宗教活动说明纪念与信仰的空间需要，与白宫用途有别。',
      '交通说明怎样抵达，历史用途说明抵达以后应理解什么。',
    ],
  },
] as const;

/** Raw is solely the source recording fraction. Native words drive the
 * original history-part interval and its existing terrain-bound use reading.
 * No arbitrary media seek or independent animation clock is introduced. */
export function overviewHeritagePresentation(beat:OverviewHeritageBeat,raw:number,timing?:NarrationTiming):OverviewPresentation {
  if(beat.recordingId==='OVERVIEW-barkhor-life')return overviewBarkhorPresentation(beat,raw,timing);
  if(beat.recordingId==='OVERVIEW-lhasa-urban-change')return overviewUrbanPresentation(beat,raw,timing);
  const index=overviewHeritageLessons.findIndex(part=>part.id===beat.recordingId);
  const part=overviewHeritageLessons[index];
  const segment=segments.find(item=>item.id===(beat.segmentId??beat.recordingId));
  if(!part||!segment||segment.id!==beat.recordingId||part.narration!==beat.text||segment.text!==beat.text)
    throw new Error(`总览建筑用途录音与原段不一致：${beat.id}`);
  const fraction=clamp(raw);
  // Inclusive adjacent starts must not select the next lesson during this
  // recording's trailing pause, especially at the Lhasa/Ngari seam.
  const mapped=segment.start+(segment.end-segment.start)*Math.min(fraction,1-CITY_SCENE_END_MARGIN);
  const progress=cityNarrationSceneProgress(segments,mapped,{
    cue:{id:segment.id,text:segment.text},progress:fraction,timing,
  });
  const local=cityContinuityPartState(progress).partProgress;
  const phase=local<.44?0:local<.58?1:local<.86?2:3;
  const reading=readings[index];
  return {
    sceneIdentity:'atlas-comparison',
    props:{scene:'region',viewKey:'atlas',layer:'atlas-city-comparison',step:3,
      season:1,progress,selected:'city:lhasa',cutaway:false,
      comparisonRelief:true,cityLifeServices:true,cityAccessTransfer:true,cityBuiltLayer:false,
      overviewTopic:'culture',overviewYear:reading.year},
    title:reading.titles[phase],
    explanation:reading.explanations[phase],
    scale:'西藏整体地图 → 拉萨河谷 → 建筑用途',
    year:reading.year,
    sourceScope:'现状OSM河流、道路与建筑整体轮廓；年代和用途据UNESCO与署名建筑史研究。白宫、红宫不绘制未取得的内部分区，现状几何不随历史年代改变。',
  };
}

export function overviewBarkhorPresentation(beat:OverviewHeritageBeat,raw:number,timing?:NarrationTiming):OverviewPresentation {
  if(beat.text!==barkhorNarration)throw new Error('八廓街录音与原文不一致');
  const textProgress=clamp(timing?.textProgress??raw),position=textProgress*beat.text.length;
  const phases=[
    {token:'先留在',phase:'context',title:'从大昭寺看周围街区',explanation:'寺院、广场、步行街巷共同处在现状老城中；7世纪创建不等于这些地物同时建成。'},
    {token:'沿现状步行街巷移动',phase:'streets',title:'活动需要连续的通行空间',explanation:'移动标记沿已归档的真实街巷逐段行进；保留原线段断点，不补画古代转经路线。'},
    {token:'再看广场与周边商业用地',phase:'uses',title:'建筑之外，还有广场与街区生活',explanation:'青色是现状广场，赭色是现状商业用地内的建筑；用途需要空间，但不推断每栋建筑的店铺或年代。'},
    {token:'二〇〇〇年',phase:'designation',title:'2000年：大昭寺扩展列入世界遗产',explanation:'列入年份是保护史事件，不是建筑或周围街区的建成年份。保留同一现状地物，对照事件与空间。'},
    {token:'二〇二一年',phase:'protection',title:'2021年：保护也要照顾使用活动',explanation:'委员会要求广场照顾朝拜者的祈祷通行；画面呈现空间关系，不声称要求已落实。'},
    {token:'接下来，仍在拉萨',phase:'return',title:'留在同一座城市，转向布达拉宫',explanation:'先从街区拉回拉萨，再比较白宫与红宫的建设年代和用途。'},
  ] as const;
  let i=0;while(i+1<phases.length&&position>=beat.text.indexOf(phases[i+1].token))i++;
  const current=phases[i],start=beat.text.indexOf(current.token),end=i+1<phases.length?beat.text.indexOf(phases[i+1].token):beat.text.length;
  const progress=clamp((position-start)/(end-start));
  const first=overviewHeritageLessons[0],held=overviewHeritagePresentation({id:first.id,title:first.title,recordingId:first.id,text:first.narration},1);
  const year=i<3?'7世纪创建':i===3?'2000年列入':'2021年管理要求';
  return {...held,props:{...held.props,overviewBarkhor:{phase:current.phase,progress,motion:i<1?0:i===1?progress:1},overviewYear:year},title:current.title,explanation:current.explanation,year,scale:'西藏 → 拉萨 → 大昭寺周边街区 → 拉萨',sourceScope:'现状OSM广场、步行道路、商业用地与建筑；统一建筑高度为显示符号。活动标记不是人数、速度、古代线路或管理分区；2021年要求来自世界遗产委员会，未推断实施成效。'};
}

export function overviewUrbanPresentation(beat:OverviewHeritageBeat,raw:number,timing?:NarrationTiming):OverviewPresentation {
  if(beat.text!==lhasaUrbanNarration)throw new Error('拉萨空间变化录音与原文不一致');
  const position=clamp(timing?.textProgress??raw)*beat.text.length;
  const phases=[
    {token:'把布达拉宫',phase:'context',year:1985,title:'两个历史地标，放回同一座城市',reason:'从布宫退到河谷，让大昭寺、八廓街与周围城市同时进入视野。'},
    {token:'先看一九八五年',phase:'baseline',year:1985,title:'1985：资料起点，不是城市起点',reason:'青色是1985年已检出的聚居地像元；真实营建可能早得多。'},
    {token:'推进到二〇〇〇年',phase:'middle',year:2000,title:'2000：保留基底，再看后续检出',reason:'同一观察窗、同一尺度；金色仅表示1986—2000年首次检出，空白不是无人居住的证明。'},
    {token:'再到二〇一五年',phase:'recent',year:2015,title:'2015：看城市空间，而非单栋建筑',reason:'原始30米像元随年份展开；估计的首次检出时间不等于建筑年份，也不能单独证明交通的因果作用。'},
    {token:'再回到现状街区',phase:'plaza',year:2005,title:'2005年报告：广场、搬迁与公共使用',reason:'报告记录广场扩展与住户、机构搬迁；这里定位现状广场，不编造搬迁前的住宅位置或安置去向。'},
    {token:'大昭寺周围的八廓街',phase:'barkhor',year:2005,title:'八廓街：居住改善与历史保护同在',reason:'2005年报告记载供排水和街面改善；没有取得管线测绘，画面保留真实街区，不绘制虚构地下管网。'},
    {token:'拉回河谷',phase:'return',year:2015,title:'把使用、空间变化和现代接续接起来',reason:'回到同一河谷，再接全域交通与跨河进城；历史遗产不是现代生活之外的孤岛。'},
  ] as const;
  let i=0;while(i+1<phases.length&&position>=beat.text.indexOf(phases[i+1].token))i++;
  const part=phases[i],start=beat.text.indexOf(part.token),end=i+1<phases.length?beat.text.indexOf(phases[i+1].token):beat.text.length;
  const progress=clamp((position-start)/(end-start));
  const last=overviewHeritageLessons[2],held=overviewHeritagePresentation({id:last.id,title:last.title,recordingId:last.id,text:last.narration},1);
  const isPixels=['baseline','middle','recent'].includes(part.phase);
  return {...held,props:{...held.props,overviewUrban:{phase:part.phase,year:part.year,progress,showChange:true},overviewYear:isPixels?`${part.year}年检出`:part.phase==='plaza'||part.phase==='barkhor'?'2005年报告':undefined},title:part.title,explanation:part.reason,year:isPixels?`${part.year}年检出`:part.phase==='plaza'||part.phase==='barkhor'?'2005年报告':undefined,scale:'拉萨历史地标 → 河谷变化 → 街区生活 → 河谷',sourceScope:'DLR WSF Evolution原始30米像元（1985—2015），不插值、不补空洞；1985为序列起点，非城市起源。现状OSM仅定位，2005年UNESCO报告支持公共空间及生活改善；没有历史建筑轮廓、真实搬迁路径或管线资料。'};
}

export interface OverviewHeritageReturnPresentation extends Omit<OverviewPresentation,'props'> {
  props:OverviewPresentation['props']&{overviewReturnMix:number};
}

/** The returning camera uses the new recording's source words, while the
 * acquired local geography holds the completed Red Palace reading. Mixing
 * display poses never seeks or rewrites either source recording. */
export function overviewHeritageReturnPresentation(beat:OverviewHeritageBeat,raw:number,timing?:NarrationTiming):OverviewHeritageReturnPresentation {
  const cue=overviewNarrationCues.find(item=>item.id==='OVERVIEW-heritage-return');
  if(!cue||beat.recordingId!==cue.id||beat.text!==cue.narration||beat.segmentId&&beat.segmentId!==cue.id)
    throw new Error(`总览建筑回全域录音与原段不一致：${beat.id}`);
  const last=overviewHeritageLessons[2];
  const held=overviewHeritagePresentation({id:last.id,title:last.title,recordingId:last.id,text:last.narration},1);
  const end=cue.narration.indexOf('刚才看到');
  if(end<=0)throw new Error('总览回全域讲解缺少原文锚点');
  const sourceProgress=clamp(timing?.textProgress??raw),amount=clamp(sourceProgress*cue.narration.length/end),
    mix=amount*amount*(3-2*amount),whole=mix>=1;
  return {
    sceneIdentity:held.sceneIdentity,
    props:{...held.props,overviewUrban:whole?undefined:{phase:'return',progress:1,year:2015,showChange:true},overviewReturnMix:mix,
      layer:whole?'atlas-overview':'atlas-city-comparison',step:whole?0:3,
      selected:whole?'':'city:lhasa',overviewTopic:'culture',overviewYear:undefined,overviewFocus:undefined,
      overviewTitle:whole?'从已有城市继续问现代联系':'从建筑回到河谷与全域'},
    title:whole?'从已有城市继续问现代联系':'从建筑回到河谷与全域',
    explanation:whole?'位置、年代和用途已经联系起来，再看现代通道怎样接上已有城市。':'保留刚才的真实建筑与河谷，沿同一张地图拉回全域。',
    scale:'拉萨建筑 → 河谷 → 西藏整体地图',
    year:undefined,
    sourceScope:held.sourceScope,
  };
}
