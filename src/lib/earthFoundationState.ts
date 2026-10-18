import type {SceneSettings} from './store';
type FoundationGuide={active:boolean;targets:string[];title:string;explanation:string};

export const foundationLayers=['earth-system','earth-heating','earth-circulation','earth-contrasts'] as const;
export const foundationChoices=[
 {id:'compare-equator',label:'刚果盆地',condition:'赤道附近 · 低地',effect:'热量与水分支持热带雨林',cause:'低纬有较充足的太阳能背景；上升、凝结与水循环参与维持湿润条件。'},
 {id:'compare-desert',label:'撒哈拉',condition:'副热带 · 北非',effect:'干燥限制植被与地表水',cause:'大尺度下沉空气不利于成云；环流、海陆位置和地区条件共同参与干燥。'},
 {id:'compare-plateau',label:'青藏高原',condition:'亚洲内部 · 广阔高地',effect:'纬度之外，还必须考虑高度',cause:'高度改变气压与热量环境，山系改变气流路径；内部的水热条件也不一致。'},
] as const;
export const foundationElements=[
 {id:'earth-ocean',label:'海洋',description:'储存大量热量与水，为空气中的水汽提供主要来源。'},
 {id:'earth-land',label:'陆地',description:'大陆、平原、山地与高原，改变水的流向和空气经过的条件。'},
 {id:'earth-air',label:'大气',description:'包围地球的空气，搬运热和水分；风、云、雨发生在其中。'},
 {id:'earth-ice',label:'冰雪',description:'储存淡水、反射阳光；融化与积累把它和水循环联系起来。'},
 {id:'earth-vegetation',label:'植物',description:'植物需要适合的热量与水分。刚果区域只是认识植被的例子，不表示实时或测绘的森林边界。'},
] as const;
export function foundationIndex(layer:string){return Math.max(0,foundationLayers.indexOf(layer as typeof foundationLayers[number]));}
export function foundationElement(settings:Pick<SceneSettings,'progress'|'selected'>,guide?:FoundationGuide){return foundationElements.find(item=>guide?.active&&guide.targets.includes(item.id))||foundationElements.find(item=>item.id===settings.selected)||foundationElements[Math.min(4,Math.floor(Math.max(0,settings.progress)*5))];}
export function foundationFeedback(settings:Pick<SceneSettings,'layer'|'progress'|'selected'>,guide?:FoundationGuide){
 if(guide?.active)return {title:guide.title,text:guide.explanation};
 const progress=Math.min(1,Math.max(0,settings.progress));
 if(settings.layer==='earth-system'){const element=foundationElement(settings);return {title:`${element.label}：它在地球环境中做什么`,text:element.description};}
 if(settings.layer==='earth-heating')return progress<.5
  ?{title:'同样一束光，照到不同纬度',text:'先看黄色平行光束：靠近赤道，光线更接近直射；向高纬，照射更倾斜。'}
  :{title:'光更斜，同一份能量铺得更开',text:'两束光宽度相同；高纬光斑覆盖的地面更大，单位面积获得的能量更少。这解释热量背景，不是当地气温读数。'};
 if(settings.layer==='earth-circulation'){
  const stages=[
   {title:'① 从低纬附近的上升看起',text:'受热差异参与建立气压差。近地面的空气汇入，上升空气把热量和水分带到更高处。'},
   {title:'② 空气在高处向外输送',text:'空气不会只向上走。高处的移动与别处的下沉、近地面回流相连，形成大尺度循环。'},
   {title:'③ 下沉与地面回流连成循环',text:'下沉空气受到压缩而增温，通常不利于凝结成云；近地面空气继续在压力差作用下移动。'},
   {title:'④ 自转让地面风向偏转',text:'地球自转使运动路径偏转。海陆、季节与地形还会打破图中的对称格局；风能携带水汽，但有风不等于下雨。'},
  ];return stages[Math.min(3,Math.floor(progress*4))];
 }
 const selected=foundationChoices.find(item=>item.id===settings.selected)||foundationChoices[0];
 return {title:`${selected.label}：${selected.effect}`,text:selected.cause};
}
