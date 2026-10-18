import {atlasLocationForStep} from '../lib/spatialJourney';
import {getAtlasTheme} from './atlas';
const stops=new Set(['G3','G4','C5','E1','E3','P1','P2','K1','K2','H1','H3','R1','R2','R3','M1','M3','T1']);
export function spatialPresentationFor(stepId:string){
 if(!stops.has(stepId))return;
 const origin=atlasLocationForStep(stepId);if(!origin)return;
 const point=getAtlasTheme(origin.themeId)?.hotspots.find(item=>item.id===origin.hotspotId);if(!point)return;
 const identity=stepId==='P1'?'沿同一坐标靠近公开高程':stepId==='G4'||stepId==='E1'?'进入公开高程与地区比较':stepId==='K1'?'进入建筑特征与有出处的来历':stepId.startsWith('H')?'地点参照与历史材料分别阅读':'进入原理演示，保留真实地方来路';
 const limit=stepId==='P1'?'整体与局部共享经纬位置；颜色为海拔。':['G4','E1'].includes(stepId)?'来自公开高程网格；颜色表示海拔，立体高度有显示夸张。':stepId==='K1'?'城区参照帮助定位；建筑特征图不当作测绘。':stepId.startsWith('H')?'现代底图用于定位，不重演古代边界或行动。':'地图入口用于定位；原理模型不冒充当地实测过程。';
 return {origin,point,identity,limit};
}
