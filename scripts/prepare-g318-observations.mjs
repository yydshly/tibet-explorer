// Source-node observations, not surveyed roadside stopping places.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../public/assets/routes/g318/',import.meta.url);
const read=n=>JSON.parse(readFileSync(new URL(n,root),'utf8'));
const meta=read('manifest.json'),route=read('route.json'),bytes=readFileSync(new URL('terrain.int16',root));
const [w,s,e,n]=meta.bbox,cols=meta.columns,rows=meta.rows;
const sample=([lon,lat])=>{
 const x=(lon-w)/(e-w)*(cols-1),y=(n-lat)/(n-s)*(rows-1),ix=Math.min(cols-2,Math.floor(x)),iy=Math.min(rows-2,Math.floor(y)),fx=x-ix,fy=y-iy;
 const at=(x,y)=>bytes.readInt16LE((y*cols+x)*2),a=at(ix,iy),b=at(ix+1,iy),c=at(ix+1,iy+1),d=at(ix,iy+1);
 return fx+fy<=1?a+(b-a)*fx+(d-a)*fy:c+(d-c)*(1-fx)+(b-c)*(1-fy);
};
const points=route.coordinates,mx=111320*Math.cos((s+n)/2*Math.PI/180),mz=111320;
const cumulative=[0];for(let i=1;i<points.length;i++)cumulative[i]=cumulative[i-1]+Math.hypot((points[i][0]-points[i-1][0])*mx,(points[i][1]-points[i-1][1])*mz);
let high=0;for(let i=1;i<points.length;i++)if(sample(points[i])>sample(points[high]))high=i;
const local=read('lulang.geojson'),tags=new Map(local.features.filter(f=>f.properties.featureClass==='road').map(f=>[f.id,f.properties.tags]));
let junction=points.length-1;while(junction>0){const t=tags.get(route.sourceWayIdsByEdge[junction-1]);if(!t||t.ref==='G318'||!['tertiary','service'].includes(t.highway))break;junction--;}
const point=(id,title,i,question)=>({id,title,sourceNodeIndex:i,sourceNodeId:route.sourceNodeIds[i],coordinate:points[i],distanceMetres:cumulative[i],progress:cumulative[i]/cumulative.at(-1),surfaceElevationMetres:sample(points[i]),question,scope:'资料阅读位置；未核实实地停靠、安全进入或开放条件'});
const data={id:meta.id,preparedAt:'2026-10-19',method:'原始道路顶点 + 渲染同一三角面高程插值；最高点仅为这条归档顶点链的最高DSM样本，不是色季拉山口实测定位/标高',sources:['/assets/routes/g318/route.json','/assets/routes/g318/manifest.json'],points:[
 point('origin','林芝附近·源道路起点',0,'道路怎样从建成区走向山地？'),
 point('mountain','色季拉山地·沿线高程样本',high,'固定位置向前/回望，山体遮挡与来路有何差异？'),
 point('lulang','鲁朗·源服务道路末端',points.length-1,'过境道路、地方接续与已记录的建成空间怎样相连？'),
 ],connection:{startSourceNodeIndex:junction,sourceNodeId:route.sourceNodeIds[junction],coordinate:points[junction],lengthMetres:cumulative.at(-1)-cumulative[junction],sourceWays:[...new Set(route.sourceWayIdsByEdge.slice(junction))].map(id=>({id,tags:tags.get(id)})),method:'从末端向前逐条核对原始way标签，遇到G318或不明属性即停止；仅指这条归档链的地方/服务道路接续，不代表公共访问许可'},history:[
 {date:'2016-10-01',event:'报道记载鲁朗小镇开始试运营',source:'https://www.linzhi.gov.cn/xwzx_406/dsdt/201812/t20181216_22625.html',scope:'不是2016年建筑轮廓或施工过程证据'},
 {date:'2017',event:'部门决算记录商街经营、地方产品展示、活动组织和沿线服务',source:'https://www.linzhi.gov.cn/linzhi/zwgk/201809/3262f7e1fea64f5bb86efe6da8abe370.shtml',scope:'不是当前经营、收入或开放状态；现状地图只解释空间接续'}
 ]};
writeFileSync(new URL('observations.json',root),JSON.stringify(data,null,2));
const file=new URL('observations.json',root);meta.observations='/assets/routes/g318/observations.json';meta.files['observations.json']={bytes:statSync(file).size,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
writeFileSync(new URL('manifest.json',root),JSON.stringify(meta,null,2));
console.log(JSON.stringify(data.points.map(p=>({id:p.id,km:p.distanceMetres/1000,metres:p.surfaceElevationMetres,node:p.sourceNodeId}))));
