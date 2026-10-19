import {useMemo} from 'react';
import {lulangLenses,type LulangServiceFilter} from '../data/lulangPlace';
import {lulangCultureReferences} from '../data/lulangCulture';
import {lulangLifePhase,lulangLifeRecord,lulangSelectedPhoto,lulangDisplayPhotos,type LulangPhotoId,lulangCookingState,lulangCookingSteps} from '../data/lulangLife';
import {selectedLulangFootage} from '../data/lulangFootage';
import {lulangCustomsSource,lulangTownSource} from '../data/lulangFieldMedia';
import type {PilotView} from '../data/routePilot';
import type {LulangPlaceData} from '../scene/lulangPlaceData';

type Props={view:PilotView;data?:LulangPlaceData;onChange:(p:Partial<PilotView>)=>void};
export default function LulangPlaceControls({view,data,onChange}:Props){
 const lens=view.placeLens??'life',probe=view.sectionProgress??.5,filter=view.serviceFilter??'all';
 const chart=useMemo(()=>{if(!data)return;const heights=data.section.map(p=>p.elevation),low=Math.floor(Math.min(...heights)/100)*100,high=Math.ceil(Math.max(...heights)/100)*100+100;return {low,high,path:data.section.map((p,i)=>`${i?'L':'M'}${20+p.distance/2600*270},${95-(p.elevation-low)/(high-low)*70}`).join(' ')};},[data]);
 const point=data?.section[Math.round(probe*64)],food=data?.services.filter(p=>p.kind==='food'),lodging=data?.services.filter(p=>p.kind==='lodging');
 const references=useMemo(()=>data?lulangCultureReferences(data.services,data.riverPoint):[],[data]);
 const phase=lulangLifePhase(view),record=lulangLifeRecord(view),referenceIndex=Math.min(references.length-1,Math.max(0,Math.trunc(view.cultureSample??0))),photo=view.placeMedia==='daily'||view.placeMedia==='town'||view.placeMedia==='map'&&view.placePhoto?lulangSelectedPhoto(view):undefined;
 const footage=view.placeMedia==='record'?selectedLulangFootage(view):undefined;
 const sample=(kind:'food'|'lodging')=>data?.services.filter(s=>s.kind===kind).sort((a,b)=>Math.hypot(a.coordinate[0]-data.riverPoint[0],a.coordinate[1]-data.riverPoint[1])-Math.hypot(b.coordinate[0]-data.riverPoint[0],b.coordinate[1]-data.riverPoint[1]))[0];
 const example=lens==='culture'&&filter!=='lodging'?references[referenceIndex]?.record:sample(filter==='lodging'?'lodging':'food');
 const filters=<div className="pilot-service-filters" aria-label="归档服务位置对照">{(['all','food','lodging'] as LulangServiceFilter[]).map((key,i)=><button key={key} aria-pressed={view.servicesVisible!==false&&filter===key} onClick={()=>onChange({serviceFilter:key,servicesVisible:true,placeMedia:'map'})}>{['共同看','餐饮记录','住宿记录'][i]}</button>)}</div>;
 const records=<><output>资料窗口：{food?.length??0}处餐饮记录 · {lodging?.length??0}处住宿记录</output><small>橙色为归档餐饮，淡蓝色为归档住宿。点位始终保留，不模拟开业停业。</small>{example&&<small>地图参照：<a href={`https://www.openstreetmap.org/${example.id}`} target="_blank" rel="noreferrer">{filter==='lodging'?'一处住宿归档记录':'所选餐饮归档记录'}</a>。不是2017年事件定位，营业与入口未独立核实。</small>}</>;
 return <section className="pilot-local-reading" aria-label="鲁朗风景生活与人文观察">
  <nav aria-label="鲁朗观察角度">{lulangLenses.map(l=><button key={l.id} aria-pressed={lens===l.id} onClick={()=>onChange({placeLens:l.id,connections:l.id!=='landscape',connectionProgress:l.id==='landscape'?0:1,serviceFilter:'all',servicesVisible:false,placeMedia:l.id==='landscape'?'map':l.id==='culture'?'daily':'town',placePhoto:l.id==='landscape'?undefined:l.id==='life'?'town':'daily',photoFocus:0,cultureProgress:0,cultureSupply:true,cultureSample:0,cookingProgress:0,lifePhase:'making'})}>{l.title}</button>)}</nav>
  {photo&&<section className="pilot-photo-tools" aria-label="实景局部观察"><label>实景资料<select aria-label="鲁朗实景资料" value={photo.id} onChange={e=>{const id=e.target.value as LulangPhotoId;onChange({placeMedia:id==='daily'?'daily':'town',placePhoto:id,placeLens:['customs','target'].includes(id)?'culture':['forest','meadow'].includes(id)?'landscape':'life',photoFocus:0,servicesVisible:false,elevation:false});}}>{lulangDisplayPhotos.map(p=><option key={p.id} value={p.id}>{p.title} · {p.date}</option>)}</select></label><div><button aria-pressed={!view.photoFocus} onClick={()=>onChange({photoFocus:0})}>看完整照片</button>{photo.features.map((f,i)=><button key={f.title} aria-pressed={view.photoFocus===i+1} onClick={()=>onChange({photoFocus:i+1})}>{f.title}</button>)}</div></section>}
  {footage?<div className="pilot-culture-record"><strong>{footage.title}</strong><span>{footage.publisher} · {footage.published}发布</span><p>{footage.scope}</p><a href={footage.source} target="_blank" rel="noreferrer">前往原发布页</a></div>:lens==='landscape'?<>
   <p>{photo?photo.scope:'沿蓝色鲁朗河记录看谷地，再沿白色剖面比较两侧起伏。绿色边线是一处归档林地范围。'}</p>
   {photo&&<><strong>{photo.title}</strong><small>{photo.date} · {photo.author} · {photo.license}</small><div><button onClick={()=>onChange({placeMedia:view.placeMedia==='map'?'town':'map'})}>{view.placeMedia==='map'?'回到这张实景':'在同一地形定位机位'}</button><button onClick={()=>onChange({placeMedia:'map',placePhoto:undefined,sectionProgress:.5})}>回到河谷剖面对照</button></div></>}
   {!photo&&chart&&data&&<><svg viewBox="0 0 310 120" role="img" aria-label="鲁朗河段东西向2.6公里地表剖面"><path d={chart.path} className="local-section"/><path d="M155 18V98" className="river-axis"/><path d={`M${20+probe*270} 18V98`} className="probe-axis"/><text x="20" y="13">{chart.high} m</text><text x="20" y="108">西侧</text><text x="155" y="116" textAnchor="middle">河段样本</text><text x="290" y="108" textAnchor="end">东侧</text><text x="20" y="94">{chart.low} m</text></svg><label>移动剖面观察点<input aria-label="鲁朗河谷剖面位置" type="range" min="0" max="1" step=".015625" value={probe} onChange={e=>onChange({sectionProgress:Number(e.target.value),placeMedia:'map',placePhoto:undefined})}/></label><output>{probe<.48?'西侧':probe>.52?'东侧':'河段位置'} · 地表约{Math.round((point?.elevation??0)/10)*10} m</output><small>同一DSM采样，非河床实测；剖面两轴比例不同。冬季影像不独立证明树种或全年水热。</small></>}
  </>:lens==='culture'?<>
   <div className="pilot-culture-controls">
    <strong>{view.placeMedia==='process'?`饮食选读 · ${phase==='making'?lulangCookingSteps[lulangCookingState(view).step].title:phase==='supply'?'供货条件':'经营与接待'}`:'从门前活动认识公共生活'}</strong>
    <p>看门面、门前活动和共同停留，辨认生活空间怎样被使用。当代旅游小镇还包含规划建设，不能把全部建筑当作古村。</p>
    <div className="pilot-culture-record"><span>资料延伸 · {lulangCustomsSource.date} · 非当前照片现场</span><p>报道记录了鲁朗扎西岗村的响箭体验和工布歌舞。工布风俗现场尚未展示，免费、无水印的对应影像仍待核实。</p><a href={lulangCustomsSource.url} target="_blank" rel="noreferrer">扎西岗活动记录</a> · <a href={lulangTownSource.url} target="_blank" rel="noreferrer">2016年小镇建设与试运营记录</a></div>
    <div><button onClick={()=>onChange({placeMedia:'daily',placePhoto:'daily',photoFocus:0})}>看街边日常</button></div>
    {photo&&<small>{photo.date} · {photo.author} · {photo.license}。{photo.kind==='video-still'?photo.scope:'真实照片保留其年代和拍摄范围，不代表所有居民或全年风俗。'}</small>}
    {view.placeMedia==='process'&&<div className="pilot-culture-record"><span>{record.date}</span><p>{record.text}</p><a href={record.url} target="_blank" rel="noreferrer">查看饮食专题材料</a></div>}
    <details><summary>饮食专题（选读，不进入自动讲述）</summary><p>此前制作与供货示意保留为选读，不作为认识鲁朗的主线。</p><button onClick={()=>onChange({placeMedia:'process',placePhoto:undefined,serviceFilter:'food',servicesVisible:true,lifePhase:'making',cookingProgress:0,cultureSupply:true})}>打开制作与经营示意</button></details>
   </div>
   <details className="pilot-culture-records"><summary>归档餐饮、住宿与地图记录</summary>{filters}{records}{references.length>0&&<div className="pilot-culture-reference"><span>地图参照 · {references[referenceIndex]?.label}</span><div><button disabled={referenceIndex<=0} onClick={()=>onChange({placeMedia:'map',cultureSample:referenceIndex-1})}>上一处</button><output>{referenceIndex+1} / {references.length}</output><button disabled={referenceIndex>=references.length-1} onClick={()=>onChange({placeMedia:'map',cultureSample:referenceIndex+1})}>下一处</button></div><small>地图参照点不是2017年参与者。</small></div>}</details>
  </>:<><p>{photo&&photo.id!=='town'?photo.scope:'先在实景中辨认河流、道路与房屋，再回到同一地图，看国道如何接进聚落。'}</p><div><button onClick={()=>onChange({placeMedia:'town',placePhoto:'town',photoFocus:0,servicesVisible:false})}>看河谷聚落实景</button><button onClick={()=>onChange({placeMedia:'map',placePhoto:undefined,connections:true,connectionProgress:1,servicesVisible:false})}>在地图看接续</button></div><details><summary>餐饮与住宿分布（选看）</summary>{filters}{records}</details></>}
 </section>;
}
