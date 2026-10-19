export const gatewaySources=[
 {id:'network',title:'西藏文旅厅：唐蕃古道与进藏公路通道',url:'https://wlt.xizang.gov.cn/xwzx_69/wlyw/wldt/202407/t20240725_427246.html',date:'2024-07-25'},
 {id:'south',title:'自治区政府驻成都办：318沿途山川与地方生活',url:'https://cdbsc.xizang.gov.cn/xwzx/tztg/201907/t20190725_88330.html',date:'页面日期2019-07-25'},
 {id:'north',title:'昌都市十四五规划：G317人文风情走廊',url:'https://sthj.changdu.gov.cn/hjbhj/c101255/202108/d5e72bb3f59b4a26918eea87fd865c4c.shtml',date:'2021年规划'},
 {id:'qinghai',title:'自治区政府：G109格尔木—那曲工程与沿途位置',url:'https://www.xizang.gov.cn/xwzx_406/bmkx/202506/t20250612_483771.html',date:'2025-06-12'},
 {id:'xinjiang',title:'西藏文旅厅：叶城至阿里的新藏公路',url:'https://wlt.xizang.gov.cn/ztzl_69/red_lvyou/202108/t20210831_257226.html',date:'2021-08-31'},
 {id:'yunnan',title:'自治区政府：G214红拉山与澜沧江河谷',url:'https://www.xizang.gov.cn/xwzx_406/qxxw/202606/t20260607_544168.html',date:'2026-06-07'},
] as const;
/** Editorial corridor diagram: positions below are layout units, NOT coordinates or road geometry. */
export const gatewayNodes:Record<string,{name:string;x:number;y:number}>={
 chengdu:{name:'成都',x:820,y:245},mangkam:{name:'芒康',x:660,y:345},nyingchi:{name:'林芝',x:515,y:335},lhasa:{name:'拉萨',x:370,y:320},
 chamdo:{name:'昌都',x:655,y:215},nagqu:{name:'那曲',x:410,y:200},golmud:{name:'格尔木',x:435,y:75},xining:{name:'西宁',x:625,y:40},
 yecheng:{name:'叶城',x:75,y:65},ngari:{name:'阿里',x:135,y:235},lhatse:{name:'拉孜',x:240,y:340},dali:{name:'大理',x:810,y:470},shangrila:{name:'香格里拉',x:745,y:410},
};
export const gatewayRoutes=[
 {id:'g318',name:'川藏南线',road:'G318',from:'从四川向西',color:'#e4bf77',nodes:['chengdu','mangkam','nyingchi','lhasa'],via:'成都 → 芒康 → 林芝 → 拉萨',signature:'高山峡谷与河谷聚落',environment:'从四川盆地边缘进入山地，跨越河谷与高差，在藏东南观察森林、河流和聚落的组合。',human:'沿路观察不同地方的民居、日常活动与文化表达，认识风景也是人生活的空间。',connection:'此处讨论G318的川藏南线常见旅行段，不是上海至樟木的整条国道。',question:'同一条路，为什么翻山前后看到的风景与生活不同？',sources:['network','south']},
 {id:'g317',name:'川藏北线',road:'G317',from:'从四川进入藏东北',color:'#a4bfa3',nodes:['chengdu','chamdo','nagqu'],via:'成都 → 昌都 → 那曲；赴拉萨接G109',signature:'山地、草地与康巴地方交流',environment:'在川西、藏东山地与藏北高原之间比较地形和聚落，而不是把“北线”理解为一种相同景观。',human:'昌都规划将G317作为人文风情走廊，关注茶马、唐蕃古道等交流记忆怎样留在地方。',connection:'导览示意至那曲；去拉萨需要继续接续。G317国道本身还向西延伸，不能与某一旅行行程画等号。',question:'道路怎样把不同高原城镇与交流历史联系起来？',sources:['network','north']},
 {id:'g109',name:'青藏线',road:'G109',from:'从青海向南',color:'#84c5d6',nodes:['xining','golmud','nagqu','lhasa'],via:'西宁 → 格尔木 → 那曲 → 拉萨',signature:'高原腹地与持续的高地环境',environment:'由格尔木向南，经昆仑山地、唐古拉一带进入藏北。与藏东南森林河谷相比，更适合观察高原腹地的尺度与开敞感。',human:'联系那曲与拉萨，观察运输通道如何支撑高原城镇之间的物资和日常往来。',connection:'这里以G109青藏公路讲述来路；公路、铁路、高速是不同线路，不能共用一条轨迹。',question:'持续处在高原，与不断翻山进谷，感受有什么不同？',sources:['network','qinghai']},
 {id:'g219',name:'经典新藏线',road:'G219相关段',from:'从新疆进入阿里',color:'#cead8e',nodes:['yecheng','ngari','lhatse'],via:'叶城 → 阿里 → 拉孜；赴拉萨再接续',signature:'昆仑山地与阿里高原',environment:'从新疆叶城翻越昆仑山地，进入阿里，再联系藏西南。观察山地屏障和高原腹地的空间尺度。',human:'把阿里城镇、历史文化与跨区域联系放在同一来路中理解，地区之间的路程关系是重要观察线索。',connection:'此处指经典叶城—阿里—拉孜走廊，不是今天G219全线；不能把阿里到拉萨的接续都标为G219。',question:'高原西部的城镇，怎样通过长距离通道彼此联系？',sources:['network','xinjiang']},
 {id:'g214',name:'滇藏线',road:'G214接G318',from:'从云南向北',color:'#c3b2dc',nodes:['dali','shangrila','mangkam'],via:'大理 → 香格里拉 → 芒康，接川藏南线',signature:'横断山河谷与滇藏交汇',environment:'由云南进入横断山地，沿红拉山、澜沧江河谷一带观察山体与道路的关系。',human:'在芒康理解云南、四川与西藏来路如何交汇，再把地方生活与跨区域往来联系起来。',connection:'导览表示G214来路在芒康接向G318，不是另造一条独立直达拉萨的路线。',question:'河谷与山口，怎样影响不同地区之间的往来？',sources:['network','yunnan']},
] as const;
export type GatewayRouteId=typeof gatewayRoutes[number]['id'];
