import type {GatewayRouteId} from './routeGateway';
export const gatewayNarrationIdentity='route-gateway-v1';
export const gatewayNarrationCue={id:'ROUTE-GATEWAY-introduction',title:'先辨来路，再进入地方',stepId:'route-gateway',chapterId:'route-gateway',narration:'先辨来路，再进入地方。川藏南线向西，经芒康、林芝到拉萨；川藏北线经昌都到那曲，再接向拉萨。青藏线从格尔木向南，进入高原腹地。经典新藏线由叶城进入阿里；滇藏线从云南到芒康，接向川藏南线。不同线路经过不同环境，也联系不同地方。这一版先研究三一八，只开放林芝到鲁朗约七十二公里。从林芝向东，先翻山入谷，再看鲁朗风景、村镇生活与工布文化。接下来，可以从起点有声开始，也可以继续上次观察。'};
export const gatewayNarrationCues=[gatewayNarrationCue];
const stages:readonly [string,GatewayRouteId][]=[['川藏南线向西','g318'],['川藏北线','g317'],['青藏线','g109'],['经典新藏线','g219'],['滇藏线','g214'],['这一版先研究','g318']];
export function gatewayNarratedRoute(progress:number):GatewayRouteId{
 const at=Math.max(0,Math.min(1,progress))*gatewayNarrationCue.narration.length;
 return stages.reduce<GatewayRouteId>((current,[token,next])=>at>=gatewayNarrationCue.narration.indexOf(token)?next:current,'g318');
}
