import type {SceneSettings} from '../lib/store';
import type {SceneUnderstanding} from './sceneUnderstanding';

export const palaceStudySources=[
 {id:'potala-spatial',title:'UNESCO · 布达拉宫突出普遍价值与空间组成',url:'https://whc.unesco.org/en/list/707/',note:'说明红山、白宫、红宫及不同用途；不是测绘图或逐层平面。'},
 {id:'potala-1994-evaluation',title:'ICOMOS · 布达拉宫1994年评估文件',url:'https://whc.unesco.org/document/154063',note:'记述1645年重建、1648年以白宫为核心的建筑、桑结嘉措组织红宫建设及1694年完成；评估叙述与事件年代分别阅读。'},
];
export const palaceStudyEvents=[
 {date:'1645—1648',person:'五世达赖喇嘛',text:'评估文件记述1645年开始重建，三年后以白宫为核心的建筑群完成；五世达赖喇嘛迁入。'},
 {date:'1694',person:'桑结嘉措',text:'评估文件记述桑结嘉措组织红宫建设，1694年完成；红宫与纪念、灵塔和佛殿等功能相连。'},
];
export const palaceStudyStage=(progress:number)=>progress<.3?0:progress<.68?1:2;
export function palaceStudyUnderstanding(stepId:string,settings:SceneSettings,picked=''):SceneUnderstanding|undefined{
 if(stepId!=='K1'||settings.layer==='construction')return;const phase=palaceStudyStage(settings.progress);
 const objects=[
  {id:'palace-hill',name:'红山与台地',explanation:'遗产资料将建筑群放在拉萨河谷的红山上。山体、层叠台地与高低通行共同组织空间；这份特征体量图没有使用红山实测高程或工程剖面，不能据此读取坡度和基础尺寸。'},
  {id:'palace-white',name:'白宫：空间与使用',explanation:'UNESCO说明白宫包含主要仪典厅堂和上层居住、接见等空间。画面保留白色体量、窗洞与层叠关系，未还原内部房间、门窗数量或完整平面。'},
  {id:'palace-red',name:'红宫：更高与偏西的分区',explanation:'遗产资料把红宫放在白宫以西、山体较高处，并说明其纪念与宗教用途。模型的西侧红色体量帮助辨认这层关系；颜色不是全部功能，形体不能代替年代和用途材料。'},
  {id:'palace-terrace',name:'台地、阶梯与接近',explanation:'沿山势形成的高低平台，使建筑与进入空间相互关联。示意阶梯只用于看支承、转向与高差，没有标出真实游览线路、入口、坡道或开放条件。'},
  {id:'palace-history',name:'1645—1648与1694的累积',explanation:'ICOMOS评估记述了白宫重建与红宫完成的不同节点，以及五世达赖喇嘛、桑结嘉措的相关行动。进度控制改变关注对象，不把建筑块的出现当作当年的施工录像，也不把7世纪来历等同于全部现存形制。'},
 ];
 const choice=objects.find(object=>object.id===picked&&settings.selected===picked);
 return {title:choice?.name||['把布达拉宫放回红山','分清白宫与红宫的相对位置','现存建筑也有不同年代的来路'][phase],explanation:choice?.explanation||[
  '从拉萨的整体定位靠近红山，先看山体、层叠台地与建筑群的关系。山地提供空间约束，人们通过平台、墙体与进入空间作出安排；这不是一座匿名院落，也不是精确测绘模型。',
  '白宫与红宫既有位置区别，也有使用和时代区别。红宫位于白宫偏西、更高处；选择分区，文字与镜头一起靠近。窗洞、屋面和台地帮助辨认特征，不伪造室内、宗教图像或真实门窗数量。',
  '把今天同时看到的体量放回时间：1645年开始的重建、1648年以白宫为核心的建筑，以及1694年红宫完成，是不同节点。人物、纪念、用途和后续改变，让建筑成为累积的历史材料。',
 ][phase],objects,lookFor:'先看红山，再分别选择白宫与红宫；展开体量关系，最后把同一建筑群对照两组有出处的年代。',provenance:'依据UNESCO/ICOMOS的建筑特征与关系示意 · 非测绘、室内或施工复原 · 窗数、尺寸、阶梯非实测',processLabel:'山体与台地 → 白宫与红宫 → 人物、年代与用途',stops:[{label:'红山与建筑',progress:.12},{label:'空间分区',progress:.5},{label:'人物与年代',progress:1}],hasProgress:true,allowsCutaway:true};
}
