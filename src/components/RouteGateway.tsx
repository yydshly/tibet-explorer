import {useEffect,useState,type CSSProperties} from 'react';
import {gatewayRoutes,gatewayNodes,gatewaySources,type GatewayRouteId} from '../data/routeGateway';
import {routePilotPath} from '../data/routePilot';
import {gatewayNarrationCue,gatewayNarrationIdentity,gatewayNarratedRoute} from '../data/routeGatewayNarration';
import {useOverviewDirector} from '../hooks/useOverviewDirector';
import {readPilotEntry,pilotStartPath} from '../lib/routePilotEntry';
import NarrationCaption from './NarrationCaption';
import './RouteGateway.css';
import {tongmaiPath} from '../data/tongmaiJourney';
import {bomiPath} from '../data/bomiJourney';

const gatewayBeats=[{id:gatewayNarrationCue.id,recordingId:gatewayNarrationCue.id,text:gatewayNarrationCue.narration,sceneIdentity:gatewayNarrationIdentity}];
export default function RouteGateway(){
 const director=useOverviewDirector({beats:gatewayBeats,storageKey:'tibet-explorer.route-gateway.voice.v1'});
 const [manual,setManual]=useState<GatewayRouteId>(),[resume]=useState(readPilotEntry);
 const selected=manual??gatewayNarratedRoute(director.timing?.textProgress??0);
 useEffect(()=>director.onSceneReady(gatewayNarrationIdentity),[director.onSceneReady]);
 const play=()=>{setManual(undefined);director.setVoice(true);director.playPause();};
 const replay=()=>{setManual(undefined);director.setVoice(true);director.replay();};
 const current=gatewayRoutes.find(r=>r.id===selected)!;
 const nodes=new Set<string>(current.nodes);
 const entryActions=<div className="gateway-entry-actions"><a className="gateway-start" href={`#${pilotStartPath}`}>从林芝起点有声开始 →</a>{resume&&<a className="gateway-resume" href={`#${routePilotPath}`}>继续上次观察 · {Math.round(resume.raw*100)}%<small>{resume.title}{resume.hasObservation?' · 保留观察条件':''}</small></a>}<small>从头开始保留笔记；继续观察会恢复原位置与条件。</small></div>;
 return <main className="route-gateway">
  <header><a href="#/overview">← 回到六章整体认识</a><span>线路体验 / 先辨来路，再进入地方</span></header>
  <div className="gateway-title"><div><p>认识西藏 · 下一种观察尺度</p><h1>同一片高原，<br/>不同的来路。</h1></div><div className="gateway-intro"><p>先比较五条经典公路通道的方位、环境与地方联系。<br/>先选 <strong>G318川藏南线</strong>：林芝—鲁朗已有可核实的道路、高程与实景，先把一段走完整。</p>{entryActions}</div></div>
  <section className="gateway-guide" aria-label="有声线路导览"><div><button onClick={play} disabled={!director.ready}>{director.playing?'暂停线路导览':manual?'接回有声导览':director.raw>=1?'重听线路导览':director.raw>0?'继续线路导览':'听线路导览'}</button>{director.raw>0&&<button className="gateway-replay" onClick={replay} disabled={!director.ready}>从头听导览</button>}<span>{manual?`已暂停 · 自选${current.name}`:director.playing?`正在介绍 · ${current.name}`:'声音与通道高亮同步 · 可随时自选对照'}</span></div>{director.error?<p role="alert">{director.error}</p>:manual?<p>当前对照：{current.via}。接回导览后，声音与线路一同继续。</p>:director.timing?.caption?<p><NarrationCaption text={director.timing.caption} timing={director.timing}/></p>:<p>从几条经典来路，听到为什么先研究G318，再选择从起点开始或继续观察。</p>}</section>
  <nav className="gateway-route-tabs" aria-label="比较进藏公路通道">{gatewayRoutes.map(r=><button key={r.id} aria-pressed={r.id===selected} onClick={()=>{director.pause();setManual(r.id);}} style={{'--route-color':r.color} as CSSProperties}><strong>{r.road}</strong><span>{r.name}</span><small>{r.id==='g318'?'本版先研究':'通道导览'}</small></button>)}</nav>
  <section className="gateway-comparison" aria-label="不同来路的环境与人文差异">
   <div className="gateway-diagram"><div className="gateway-map-heading"><span>来路与接续</span><small>通道关系示意 · 非道路轨迹、距离或高程</small></div>
    <svg viewBox="0 0 900 515" role="img" aria-label={`${current.name}：${current.via}；示意线不表示真实公路轨迹`}>
     <defs><radialGradient id="plateau-glow"><stop stopColor="#6f8d69" stopOpacity=".27"/><stop offset="1" stopColor="#172d26" stopOpacity="0"/></radialGradient></defs>
     <ellipse cx="410" cy="255" rx="350" ry="195" fill="url(#plateau-glow)"/>
     <text x="280" y="125" className="gateway-region">青 藏 高 原</text><text x="50" y="34" className="gateway-side">新疆方向</text><text x="650" y="33" className="gateway-side">青海方向</text><text x="750" y="170" className="gateway-side">四川方向</text><text x="710" y="510" className="gateway-side">云南方向</text>
     {gatewayRoutes.map(r=><polyline key={r.id} className={r.id===selected?'is-active':'is-context'} points={r.nodes.map(id=>`${gatewayNodes[id].x},${gatewayNodes[id].y}`).join(' ')} fill="none" stroke={r.color} strokeWidth={r.id===selected?5:1.5}/>) }
     {selected==='g317'&&<path d="M410 200L370 320" className="gateway-transfer"/>}{selected==='g219'&&<path d="M240 340L370 320" className="gateway-transfer"/>}{selected==='g214'&&<path d="M660 345L515 335L370 320" className="gateway-transfer"/>}
     {Object.entries(gatewayNodes).map(([id,n])=><g key={id} opacity={nodes.has(id)||id==='lhasa'?1:.33}><circle cx={n.x} cy={n.y} r={nodes.has(id)?6:3} fill={nodes.has(id)?current.color:'#b8c6b7'}/><text x={n.x} y={n.y+(id==='nyingchi'?26:-15)} textAnchor="middle">{n.name}</text></g>)}
     <g className="gateway-pilot-location"><path d="M515 335L535 285H665"/><text x="540" y="274">本版：林芝—鲁朗</text><circle cx="515" cy="335" r="14"/></g>
    </svg>
    <div className="gateway-map-foot"><span><i style={{background:current.color}}/> {current.name}</span><span>虚线：行程接续</span><span>节点间距经过排版，不代表里程</span></div>
   </div>
   <article className="gateway-route-reading" aria-live="polite"><span>{current.from}</span><h2>{current.name}<small>{current.road}</small></h2><p className="gateway-via">{current.via}</p><h3>{current.signature}</h3><dl><dt>环境怎么看</dt><dd>{current.environment}</dd><dt>人文看什么</dt><dd>{current.human}</dd><dt>与其他路怎样接</dt><dd>{current.connection}</dd></dl><p className="gateway-question">带着问题走：{current.question}</p><div className="gateway-inline-sources">依据：{gatewaySources.filter(s=>(current.sources as readonly string[]).includes(s.id)).map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.id==='network'?'通道资料':'沿途资料'} ↗</a>)}</div></article>
  </section>
  <section className="gateway-pilot"><img src="/assets/routes/g318/lulang-life/town-20240922.jpg" alt="2024年鲁朗河谷、道路与聚落航拍，Zhangmoon618，CC BY-SA 4.0"/><div><span>当前可体验 · G318的一段</span><h2>林芝 → 色季拉山地 → 鲁朗</h2><p>先用真实道路与高程看翻山入谷，再进入鲁朗的风景、村镇生活与工布文化观察，保留来路并返回。</p><ol><li>沿线前进</li><li>进入地方</li><li>交互观察与听讲解</li><li>保存并回原线</li></ol>{entryActions}<small>约72公里归档道路。此处从林芝向东进入鲁朗；与常见川藏南线由东向西的进藏顺序相反，可对照阅读。其余通道暂为导览。</small><a className="gateway-photo-credit" href="https://commons.wikimedia.org/wiki/File:Lulang_Town.jpg" target="_blank" rel="noreferrer">照片：Zhangmoon618 · 2024-09-22 · CC BY-SA 4.0 · 显示裁切</a></div></section>
  <section className="gateway-reason"><h2>继续沿G318 · 鲁朗 → 通麦</h2><p>从真实主路接续点进入峡谷，辨认两河汇合，看桥怎样跨河、隧道怎样穿山。2014旧桥记录与2015、2016通车节点分别阅读，观察后可返回鲁朗原线。</p><a className="gateway-start" href={`#${tongmaiPath}`}>进入已制作的接续段 →</a><p><small>整线分镜R05—R06；结尾可沿同一原路接到波密。原林芝—鲁朗首段保留。</small></p></section>
  <section className="gateway-reason"><h2>通麦 → 波密 · 风景进入城镇生活</h2><p>沿真实弯道进入扎木镇附近，看河流、道路与周围山林，再观察2008街道记录中的行人、车辆和临街建筑。资料年份分开，观察后返回进入前的原线原句。</p><a className="gateway-start" href={`#${bomiPath}`}>沿通麦来路进入波密 →</a><p><small>分镜R07；约49秒，完整整线回看仍待后续，不新增景点和模型。</small></p></section>
  <details className="gateway-reason"><summary>为什么先从G318开始？本版做到哪里？</summary><p>选择标准是能否把整体认识落到可核实的一段道路：本段已有归档道路、卫星影像、地表高程和有来源的地方实景，可在同一来路中比较山谷、坡面、聚落和生活。首段保留，新增鲁朗至通麦接续；不表示整条318或其他线路已完成。</p><p>五条是代表性经典公路通道，另有唐蕃古道、丙察察等不同通道与组合。这里的旅行段、国道编号与完整路网是不同概念；不提供实时路况、开放与停靠结论。</p></details>
  <details className="gateway-reason"><summary>资料依据与示意范围 · 核实于2026-10-19</summary>{gatewaySources.map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><small> {s.date}</small></p>)}<p>上图为编辑绘制的通道关系图，不是GIS道路测绘。进入已开放路段后，才使用有来源的实际道路、高程与卫星影像。</p></details>
 </main>;
}
