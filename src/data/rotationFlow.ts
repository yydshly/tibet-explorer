export const rotationFlowCue={
 id:'OVERVIEW-rotation-air',title:'自转怎样改变气流方向',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'受热差异参与形成气压差，推动空气。先看同一地球：各纬度转一圈的时间相同，低纬绕行的圈更大，地面向东速度更快。让空气向北移动，先去掉自转项，路径沿经线。加入自转，空气保留绕地轴的角动量；来到更高纬度，相对当地地面向东超前，路径向右偏。右是相对前进方向，向南时会向西偏。这里固定南北运动，忽略摩擦，不是实测风场。回到亚洲，西侧与南侧的来流受季节等条件影响，并不是这条试验轨迹。空气携带水汽遇到高原，还会绕行或抬升。接下来先看高原怎样形成，再沿真实高程观察抬升、冷却与云雨。',
};
export const rotationFlowSources=[
 {title:'NOAA · 风的动力与自转偏转',url:'https://www.noaa.gov/jetstream/synoptic/origin-of-wind',note:'气压梯度推动空气；科里奥利效应改变方向，北半球右偏、南半球左偏。'},
 {title:'NOAA · 纬度、自转与向极运动',url:'https://www.noaa.gov/jetstream/global/jet-stream',note:'各纬度角速度相同，地面向东线速度不同；向极运动的空气相对地面向东超前。'},
 {title:'MIT · 大气角动量守恒',url:'https://pog.mit.edu/src/GeneralCirculationNotes_withFigs.pdf',note:'第9节：M=(Ωa cosφ+u)a cosφ。本例指定南北运动，忽略东西向力矩，不求解全球天气。'},
 {title:'本例参数与证据边界',url:'/data/rotation-flow-evidence.json',note:'纬度、经度、历时均为教学选择；不是西藏来流观测或预测。'},
];
export type RotationPhase='pressure'|'latitude'|'baseline'|'rotation'|'direction'|'limits'|'arrival';
export interface RotationFlowState {phase:RotationPhase;progress:number;enabled:boolean;direction:'north'|'south';latitudeProgress:number;cameraMix:number;arrivalProgress:number;arrivalStage?:'asia'|'west'|'south'|'terrain';westProgress?:number;southProgress?:number;}
