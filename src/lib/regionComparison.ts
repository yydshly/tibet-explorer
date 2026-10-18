import data from '../data/region-comparison.json';
import type {GeographyCity,GeographyReading} from './narratedGeography';
export function regionComparisonState(id?:GeographyCity):GeographyReading{
 const place=data.places.find(p=>p.id===id);
 return {kind:'regions',compareProfiles:true,cities:place?[place.id as GeographyCity]:data.places.map(p=>p.id as GeographyCity),rivers:true,progress:1,compareFocus:place?.id as GeographyCity|undefined,
 title:place?`${place.name} · 地形与聚居位置`:'七地同尺度对照',
 relation:place?`走近${place.name}周边，比较金色地形窗、聚居地参照点和资料河道。右侧剖面统一100公里、0—8000米；地图高差放大16倍，不能据此读街道、建筑或判断全域优劣。`:'回到同一张整体地图；七条剖面共用距离和海拔基准，参照点不是整个行政地区。'};
}
