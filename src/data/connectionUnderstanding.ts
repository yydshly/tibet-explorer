import type { SceneSettings } from '../lib/store';
import type { SceneObjectIntroduction, SceneUnderstanding } from './sceneUnderstanding';

const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const phase=(p:number,from:number,to:number)=>{const t=clamp((p-from)/(to-from));return t*t*(3-2*t);};

export const connectionSourceIds={R1:['geography','water'],R2:['geography','met-exchange'],R3:['geography','water']} as const;

export const connectionCameraViews:Record<'R1'|'R2'|'R3',{position:readonly[number,number,number];target:readonly[number,number,number]}>= {
  R1:{position:[21,31,39],target:[0,3,1]},
  R2:{position:[18,15,23],target:[0,1.8,.5]},
  R3:{position:[22,31,-37],target:[0,3,1]},
} as const;

export const connectionSceneLayers={
  R1:[{id:'terrain',label:'地形与分水岭'},{id:'water',label:'汇流与干支流'},{id:'settlements',label:'上下游使用'}],
  R2:[{id:'terrain',label:'山口约束'},{id:'routes',label:'通过通口'},{id:'transport',label:'节点交接'}],
  R3:[{id:'water',label:'先看上游使用'},{id:'ecology',label:'生态与下游'},{id:'cooperation',label:'观测与对读'}],
};

/** Progress organizes a qualitative explanation. It has no date, flow, trade or policy-score meaning. */
export function connectionProcessState(step:number,progress:number){
  const index=Math.max(0,Math.min(2,Math.trunc(Number.isFinite(step)?step:0))),p=clamp(progress),stage=p<.32?0:p<.68?1:2;
  return {step:index,progress:p,stage,label:[
    ['降水进入同一山地','坡面与支流逐步汇合','干流联系上下游使用'],
    ['先抵达山口坡脚','通过有限通口','在另一侧节点转交'],
    ['坡面物料与上下游背景','坡料下移，接到河道','窄口实体与多点记录对读'],
  ][index][stage],
    rainfall:phase(p,.02,.24),runoff:phase(p,.18,.49),tributaries:phase(p,.25,.64),downstream:phase(p,.64,.84),using:phase(p,.84,1),
    foothill:phase(p,0,.32),passage:phase(p,.32,.68),handoff:phase(p,.68,1),
    widerView:phase(p,.32,.68),slopeMovement:phase(p,.32,.68),observation:phase(p,.68,.84),comparison:phase(p,.82,1),
  };
}

const basinObjects:SceneObjectIntroduction[]=[
  {id:'connection-ridge',name:'山脊与分水岭参照',explanation:'山脊把坡面来水分向不同低处。参照沿这份概念地形的高处设置，没有计算真实西藏流域边界；行政区、河流流域与议题范围也不必相同。'},
  {id:'connection-rain',name:'进入山地的降水',explanation:'雨滴落向同一片坡面，帮助追问水从哪里进入系统。颗粒数、落速与颜色只表达过程，没有某次真实降水或雨量单位；冰雪、地下水与蒸发等还需具体流域材料。'},
  {id:'connection-runoff',name:'沿坡向低处的汇流',explanation:'水沿概念地形的下降方向到达沟道，再接上支流。模型仅提取地表汇流，没有把雨水全部换算成径流，也没有提供渗透率或流量。'},
  {id:'connection-tributary',name:'汇入干流的支流',explanation:'不同坡面的水在支沟中汇集，支流再进入共同的干流。流域联系需要同时读来源、季节和使用，水线方向不能单独决定下游影响大小。'},
  {id:'connection-confluence',name:'干支流汇合位置',explanation:'几条水路在同一低处连接，随后沿干流继续向下。汇合口是过程定位，不是某条真实河流的精确地名或边界，也不说明各支流占多少水量。'},
  {id:'connection-downstream',name:'继续向下的干流',explanation:'水沿有连续高差的干流向下移动，地方因此连到上下游。真实影响还要结合水量、时序、水质、生态与使用方式，模型不提供跨区域治理结论。'},
  {id:'connection-use',name:'上下游的取用与生活',explanation:'人物从河边把水带到生活空间，表示取用需要人的劳动、设施和到达条件。水不会自行流向高处；人物与房屋不是实际社区或人口资料。'},
];
const passageObjects:SceneObjectIntroduction[]=[
  {id:'connection-pass',name:'山口与两侧山地',explanation:'同一山脊中较低、较窄的通口约束通过的位置。这里是通用山口几何，没有对应真实古道、国界、海拔或可执行路线。'},
  {id:'connection-foothill',name:'抵达通口前的坡脚',explanation:'载体先到山脚，再沿坡面进入通口。抵达一个节点与通过整段地形是不同条件，实际出行还需道路状态、季节、技术与使用者资料。'},
  {id:'connection-corridor',name:'有限通口中的通行段',explanation:'脚下的实体通行构件把两侧接起来，示范人在地形约束中选择位置。构件不是历史遗迹或真实道路，连续几何也不保证现实可通行。'},
  {id:'connection-carrier',name:'人与运输载体',explanation:'人物、车辆和箱体沿同一坡面通过，表示移动依靠技术与劳动。箱体没有商品、贸易量或民族身份含义，也不还原特定历史商队。'},
  {id:'connection-transfer',name:'另一侧节点的交接',explanation:'箱体先到交接桌，再交到另一位参与者，说明空间连通之后还有接收、组织与交换。模型不给贸易价值、运输时间或实际运营状态。'},
  {id:'connection-organization',name:'交接与记录的组织条件',explanation:'接收者与空白记录桌把“能通过”接到“怎样交换”。谁组织、按什么规则、在何时使用，需要人物、文本和地方材料继续解释。'},
];
const issueObjects:SceneObjectIntroduction[]=[
  {id:'connection-slope',name:'沿现有坡面下移的物料',explanation:'料块从同一地形的高处沿下降路径移动，逐个接到河道。它只展示一种可能的坡面—河道关系，没有复原色东普崩塌体、轨迹、体积、速度或触发条件；并非所有崩塌都到达河道或造成堵塞。'},
  {id:'connection-obstruction',name:'进入河槽的堆积与窄口',explanation:'本设定的部分料块到达河槽，留下局部窄口实体，用来分开坡面变化、到达河道与阻塞判断。水面高度保持既有几何，没有计算壅水、流量、冲溃或洪水。现实是否堵江、堵到什么程度，需要影像、水位及其他同期记录核实。'},
  {id:'connection-upstream',name:'一个上游使用者',explanation:'先从一位参与者的取用看问题，只是一个观察视角。模型不测算取水量，也不能由它直接推断下游损益、国家关系或政策结果。'},
  {id:'connection-ecology',name:'共同流域中的生态对象',explanation:'河岸植物与水边空间把生态对象纳入同一议题。它们不是保护成效或生境面积，实际研究需要说明对象、范围、季节和观测方法。'},
  {id:'connection-downstream',name:'下游的使用与地方生活',explanation:'加入另一处取用与生活空间后，议题已经超过单个上游参与者。上下游相连并不自动说明何种影响已经发生，水量、时序和使用仍需资料。'},
  {id:'connection-observation',name:'不同位置的观测与采样',explanation:'尺杆、采样容器与观测者表示收集信息的条件，没有真实刻度读数、化验结果或监测站身份。测什么、在哪里测、何时测和用什么方法，都要明确。'},
  {id:'connection-records',name:'双方材料的同口径对读',explanation:'两块空白记录板并排展开，提示比较日期、位置、变量与方法。模型没有替参与者写入数据；对读信息是进一步合作研究的条件，不保证已达成政策共识。'},
  {id:'connection-ridge',name:'自然范围与议题范围',explanation:'共同流域提供空间背景，议题范围还随参与者、历史时期和资料而改变。这个上游下游例子帮助拆开尺度，不能概括西藏所有周边关系。'},
];

export function connectionUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined{
  const step=['R1','R2','R3'].indexOf(stepId);if(step<0)return;
  const state=connectionProcessState(step,settings.progress),stage=state.stage;
  const descriptions=[
    ['保留完整山地和主支沟，先看雨滴怎样进入坡面。山脊把不同坡面分开，降水还没有等同于可被使用的河水；分段展开只提取地表汇流过程。',
      '坡面水顺高差到达支沟，几条支流逐段变湿并向汇合口推进。来水不会穿越高脊直接跳到下游，干支流的连续关系因此可见；模型没有雨量或流量读数。',
      '水从汇合口继续进入下游干流，取用者把水搬到生活空间。流域连起不同位置，实际影响还需数量、时序、水质与使用资料；行政边界不能替代自然分水范围。'],
    ['两侧山地保持完整，载体先接近坡脚。山口位于较低且有限的通口，先认地形约束，再问人怎样抵达，不能把“看见谷地”直接等同于可通行。',
      '同一载体沿坡面通过窄口，脚下构件连接两侧。位置、通过方式和实际使用条件是不同问题；这里没有给出某条古道的形状或真实运输耗时。',
      '载体抵达另一侧节点，箱体从车上移到交接桌，再由接收者接续。自然可通行之外还需要技术、组织、规则与参与者；具体交往由对应人物和时代材料解释。'],
    ['先把高处坡料、河槽与上下游放在同一流域中。物料尚留在坡面，一个取用位置无法代表所有依赖关系；原理模型不复原色东普，也没有给出崩塌体积、速度或预报。',
      '同一批料块沿现有地形向低处移动，逐个接到河槽；生态与下游使用也进入议题。这个设定展示一种可能关系，并不表示每次坡面变化都会入江或堵塞。水面高度和原有水路保持不变，没有进行水动力计算。',
      '本设定的到河料块形成局部窄口，坡面参照、河道观测与空白记录板随后展开。现实需用同期影像、振动、水位等区分坡面变化、到达河道与是否阻塞，不能从单个信号推断全程；模型不预测水位、冲溃或地方损益。'],
  ];
  const layerNote=settings.layer==='terrain'?' 当前强调完整地形与通口或分水范围。':settings.layer==='cooperation'?' 当前关注观测条件与资料对读。':settings.layer==='ecology'?' 当前关注生态对象与下游使用。':settings.layer==='settlements'?' 当前关注取用者怎样连接生活地点。':'';
  const unit:SceneUnderstanding={title:state.label,explanation:descriptions[step][stage]+layerNote,
    lookFor:['沿同一高差退回雨水起点，再推进坡面、支流、汇合口与下游取用。','保持山口不变，比较抵达坡脚、通过窄口和在另一侧节点转交。','追踪同一批坡料，分清坡面变化、到达河槽与阻塞判断；再逐处核对观测和记录。水面不模拟响应，阶段没有真实历时。'][step],
    provenance:step===2?'原理模型 · 非色东普复原、实测体积或预测 · 无流量、水位响应、历时与评分':'通用联系过程模型 · 非真实流域、古道、监测站或政策成效 · 无流量、历时与评分',
    objects:[basinObjects,passageObjects,issueObjects][step],processLabel:['降水 → 汇流 → 上下游使用','抵达 → 通过 → 节点交接','坡料 → 到河窄口 → 多点记录核对'][step],
    stops:[{label:['山地来水','抵达坡脚','坡面与上下游'][step],progress:.18},{label:['干支汇合','通过通口','坡料下移与关联对象'][step],progress:.52},{label:['下游使用','节点交接','窄口与观测对读'][step],progress:1}],hasProgress:true,allowsCutaway:false};
  const object=unit.objects.find(item=>item.id===picked&&settings.selected===picked);return object?{...unit,title:object.name,explanation:object.explanation}:unit;
}
