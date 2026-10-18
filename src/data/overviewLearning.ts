export interface ObservationTask {question:string;action:string;change:string;reason:string}
export const observationTasks:Record<string,ObservationTask>={
 air:{question:'地形相同，水汽不同，会怎样？',action:'先把气团停在同一位置，再切换较多 / 较少水汽。',change:'比较气团高度、云和降雨符号；地形保持不变。',reason:'地形抬升提供冷却条件，能否凝结还与水汽有关；符号解释原理，不预测雨量。'},
 evidence:{question:'夏季的差异能代表全年吗？',action:'切换7月和1月，比较同一组三站。',change:'柱形与数值同步变化，比例尺保持一致。',reason:'季节影响温度和降水；站点常年值不能代替整个地区，也不能单独证明地形因果。'},
 life:{question:'沿谷与跨山，面对的地面一样吗？',action:'保持同一地区，切换剖面方向并移动探针。',change:'比较高差与较缓地面的连续性。',reason:'地形改变通行与土地使用条件，实际城市仍需设施、劳动和组织；样本不是建设用地。'},
 practice:{question:'观看与获得学习机会，有什么差别？',action:'回拖到观看位置，再推进到共同练习。',change:'同一学习者的位置与参与关系改变。',reason:'文化延续需要有人学习和持续实践；进入练习只说明机会，不证明掌握程度。'},
 bridge:{question:'站区与城市之间，跨河连接起什么作用？',action:'在同一地图拿掉桥，再接回这座桥。',change:'看车辆停在南岸，再看它跨河进入现状道路。',reason:'桥改变这条接续的连通性；变成服务还需要车辆与组织，不代表此前无其他渡河方式。'},
 ground:{question:'铁路怎样同时面对山体、河流和城市？',action:'沿线路前后观察，比较跨河、隧道和站区。',change:'同一线路在地形中的位置改变，站区与城市仍同图。',reason:'通行需要穿山、跨河与城市接续。虚线只是隧道水平走向，影像和高程不提供地下深度。'},
 water:{question:'有水源就能持续取水吗？',action:'推进转移，再关闭通道。',change:'比较补水停止与已有储水仍保留。',reason:'资源需经过设施和维护进入使用；水位是守恒功能示意，不是当地流量。'},
 manuscript:{question:'护板怎样保护易损书页？',action:'展开、整理，再合拢护板。',change:'观察书页与两块板的相对关系。',reason:'功能示意解释包护，不能复原原件已失的配套经书。'},
 jokhang:{question:'保护改变了什么，又保留了什么？',action:'拖动对照条，或切换原有关系与供灯空间分开。',change:'建筑上多数灯光退去，寺前亮起；同一地物与供灯活动仍保留。',reason:'2005年报告记载多数供灯迁至寺前半地下供灯室：火源与木构分开，供灯活动继续。报告不提供迁移竣工日期、精确灯位或风险降幅。'},
 place:{question:'活动延续时，空间安排能改变吗？',action:'比较供灯原有关系、分开供灯和广场活动。',change:'看活动位置与公共空间使用，不把符号当作实际人数。',reason:'2005年报告支持用途调整；没有可靠的地下室、旧地块或搬迁路线测绘。'},
};
export const understandingChecks:Record<string,{prompt:string;points:string[];revisit:string}>={
 location:{prompt:'在地图上指出西藏，说明自治区与青藏高原有什么区别。',points:['西藏自治区位于中国西南；青藏高原是跨行政范围的自然高地。','位置还包括周围海陆与山地，不能只记一个点。'],revisit:'OVERVIEW-position'},
 environment:{prompt:'同一座山，为什么改变水汽后，云雨表现会不同？',points:['地形抬升、冷却与水汽共同影响凝结。','气团和云雨是原理示意；真实高程没有随操作改变。'],revisit:'LAB-air-higher'},
 differences:{prompt:'比较三个站点的冬夏资料：哪些差异不能概括成“越往西越干”？',points:['比较同一月份、同一指标和同一比例尺。','季节不同，比较结果可改变；站点不能代表全部市域。'],revisit:'OBS-CLIMATE-7'},
 living:{prompt:'选一地说明：地形提供了什么条件，人的行动又补上了什么？',points:['用起伏或地面连续性说明通行、土地使用的条件。','用具体地方的设施、维护或组织说明条件怎样进入生活。'],revisit:'LAB-life-ngari'},
 'human-history':{prompt:'大昭寺供灯调整改变了什么、保留了什么，为什么这样安排？地图上的什么不能当作历史实测？',points:['形成可由拉萨营建用途与托林交流解释；后来保护也会调整已有用途。','2005年报告记载多数供灯转至寺前半地下供灯室；火源与木构分开，供灯仍继续。','2005年是监测报告年份，不是竣工日期；现状地物和关系符号不能当作历史灯位或供灯室测绘。'],revisit:'OVERVIEW-jokhang-protection'},
 today:{prompt:'桥接通以后，什么改变了，什么仍需要人来完成？把这个问题带到一次地方观察。',points:['这条道路能够跨河接续，但交通服务仍需要车辆、组织与地方道路。','到地方观察地形、历史用途和今天生活；认识顺序不是可订旅行路线。'],revisit:'OVERVIEW-city-change'},
};
