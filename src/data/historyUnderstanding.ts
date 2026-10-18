import type {SceneSettings} from '../lib/store';
import {historyPeriods} from './curriculum';
import type {SceneUnderstanding,SceneObjectIntroduction} from './sceneUnderstanding';

export const historyObjects:Record<string,SceneObjectIntroduction[]>={
 H1:[
  {id:'history-context',name:'出土情境',explanation:'层位、位置和材料的关联帮助解释发现。这个剖面只讲证据怎样关联，不是尼阿底地层测绘，也没有给层厚和深度。'},
  {id:'history-tool',name:'器物与技术材料',explanation:'器物示意没有复刻某件出土石器。实际技术与年代判断请阅读具体研究中的样本、图版和方法；活动、居住与定居不能混成一个结论。'},
  {id:'history-dating',name:'年代与样本关联',explanation:'先问测定了什么样本、样本与活动材料怎样关联，再问年代范围。模型没有生成测年值，也不把地层垂直位置直接换算成年份。'},
  {id:'history-inference',name:'结论与证据范围',explanation:'可支持的结论由材料与研究范围决定。高海拔活动证据不自动证明全年定居、语言或现代族群起源；东北部农业研究也不能直接推广到全藏。'},
 ],
 H2:[
  {id:'history-periods',name:'九个时期阅读入口',explanation:'九个材料夹按前后排列，间距不表示历时相等。分期用于定位问题，今天的地图与这些材料夹都没有重建各时期疆域。'},
  {id:'history-politics',name:'政治组织与制度',explanation:'政治中心、制度和治理需要地点与文件等材料。一个政治节点不能说明同一时间所有地方的生产、信仰与日常同步变化。'},
  {id:'history-knowledge',name:'知识、信仰与交流',explanation:'学习、翻译与地方实践有自己的参与者和时间。把1042年交流材料与其他时期比较，是检查延续与变化，不能把文化变成政权更替的附注。'},
  {id:'history-practice',name:'生产与日常生活',explanation:'家庭、生产和地方经验需要考古、调查、文献等不同材料。年代索引不能代替具体社区的证据。'},
 ],
 H3:[
  {id:'history-event',name:'会盟事件',explanation:'821年长安会盟与822年拉萨会盟是事件时间。它们与823年立碑分开阅读；时间卡不是行军路线或领土图。'},
  {id:'history-stele-body',name:'立碑与保存',explanation:'碑使文字以物质形式保存。眼前无字碑体只解释材料载体，不复原原碑尺寸、刻文或装饰；原文和馆藏拓本请由资料入口核对。'},
  {id:'history-rubbing',name:'拓本与转录材料',explanation:'拓本是对碑刻文字的复制材料，其制作年代、保存状态和馆藏说明需要另查，不能把823年立碑自动当作现存拓本年代。'},
  {id:'history-reading',name:'今天的材料解读',explanation:'事件、碑刻和拓本形成传递链，也有不同的制作与保存情境。比较它们能说明怎样认识历史，不能仅凭一张空白复制板读出未经核对的原文。'},
 ],
 H4:[
  {id:'history-document',name:'文件与制度节点',explanation:'协议、机构调整与行政建制属于不同材料。1951、1959、1965的文件与事件分别核对；资料来源的身份和叙述立场同时保留。'},
  {id:'history-institution',name:'制度与组织层次',explanation:'国家制度、地方组织和社区实践不是同一尺度。知道一项制度发生变化，还需研究怎样实施、涉及哪些地区和人群。'},
  {id:'history-household',name:'地方与家庭经验',explanation:'家庭和社区体验需要有地点、日期与采集方法的材料。模型中的生活单元保持不变，不用房屋增减伪造某个时期的社会成效。'},
  {id:'history-inference',name:'由事件到影响的证据缺口',explanation:'制度节点可以建立时间方向，实际生活变化还要补充调查、统计和地方文献。连线表示需要核对的关系，不代表全部影响已经证实。'},
 ],
};

export function historyUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined{
 if(!historyObjects[stepId])return undefined;
 const p=Math.max(0,Math.min(1,settings.progress)),phase=p<.32?0:p<.68?1:2;
 let title='',explanation='',processLabel='材料关系 · 逐步拆开';
 let stops=[{label:'材料情境',progress:0},{label:'关联与传递',progress:.5},{label:'结论范围',progress:1}];
 if(stepId==='H1'){
  const claim=settings.layer==='settlement'?'全年定居':settings.layer==='identity'?'现代族群起源':'高海拔活动';
  title=['先看材料怎样进入地层','把器物、情境与年代关联','检查结论需要哪些证据'][phase];
  explanation=[
   '先保留地层与发现的位置，再展开材料。这里是考古证据关系模型，没有复原某处遗址剖面；不同来源的年代与地理范围需要分别阅读。',
   '打开情境，器物、样本与研究记录成为可对照的对象。器物的形态、技术和测年关联共同支持认识，不能从一块石头直接跳到一部人群历史。',
   claim==='高海拔活动'?'尼阿底研究支持早期人群曾在高海拔活动。若进一步问是否全年定居，需要其他生活与时间证据；结论不能自动跨到语言或现代族群来源。':`你正在问“${claim}”。活动材料本身不足以回答这个问题。请对照下方不同研究，检查需要补充的地点、时期和材料；灰色证据位表示仍需核对。`,
  ][phase];
  processLabel='从发现情境到结论边界';
 }else if(stepId==='H2'){
  const period=historyPeriods.find(item=>item.id===settings.selected)||historyPeriods[1];
  title=settings.layer==='overlap'?'政治、知识与生活的变化并不同步':`${period.label} · 把时期展开为问题`;
  explanation=settings.layer==='overlap'?'同一时间夹展开三种材料：政治组织、知识交流、生产与日常。它们有各自的证据和节奏；1042年的交流、1642年的政治节点与1645年的建筑活动，不能压成一条同年同时发生的变化。':`${period.title}：${period.summary} 九个材料夹的排列只表示前后；选择一个时期会展开对应问题，不代表古代疆域或城市复原。`;
  stops=[];
 }else if(stepId==='H3'){
  title=['先分开事件与载体日期','立碑保存，拓本再次复制','今天怎样从材料认识会盟'][phase];
  explanation=[
   '821年长安、822年拉萨的会盟，与823年立碑不是同一日期。先辨认事件、物质载体和后来的复制材料，避免把一张拓本直接当作事件现场。',
   '模型把无字碑体与复制纸分开，显示“事件记录—碑刻载体—拓本复制”的传递关系。它没有复制原碑文字，也没有给现存拓本补造制作年代。',
   '把馆藏拓本、原文研究和事件背景相互参照，才能判断材料支持什么。空白载体只解释保存与复制机制；实际表述由可核对的原文和研究支持。',
  ][phase];
  processLabel='事件 → 立碑 → 拓本与解读';
  stops=[{label:'事件与立碑',progress:0},{label:'展开复制关系',progress:.5},{label:'对照材料',progress:1}];
 }else{
  const year=settings.layer==='event-1951'?'1951':settings.layer==='event-1965'?'1965':'1959';
  title=[`${year} · 先确认文件与事件`,`制度节点涉及哪些层次`,`事件怎样接到地方生活`][phase];
  explanation=[
   `${year}年的材料先回答发生了什么、文件属于什么性质、地点在哪里。1951年的协议在北京签订，不能因为阅读入口在拉萨，就把文件签订地点搬到拉萨。`,
   '模型把制度、地方组织和家庭生活分成实体层次。制度文件能确认特定节点；怎样实施、经历什么冲突和变化，需要相应时代与地区的材料继续解释。',
   '生活单元没有随着年份自动变多或变好。实际影响需要有日期的调查、统计与地方记录。政府文件、学术研究与社区经验各有身份，彼此参照后再判断。',
  ][phase];
  processLabel='事件材料 → 制度层次 → 地方证据';
  stops=[{label:'文件节点',progress:0},{label:'制度与实施',progress:.5},{label:'地方生活证据',progress:1}];
 }
 const object=historyObjects[stepId].find(item=>item.id===picked);
 return {title:object?.name||title,explanation:object?.explanation||explanation,lookFor:'操作实体与材料，同时核对地点、日期、来源身份和结论范围。',provenance:'历史材料关系模型 · 无伪造原文、古代疆域、遗址层厚或社会成效',objects:historyObjects[stepId],processLabel,stops,hasProgress:stepId!=='H2',allowsCutaway:false};
}
