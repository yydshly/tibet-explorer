import type {useRoadRide} from '../hooks/useRoadRide';
import type {PilotTerrainContext} from '../scene/routePilotTerrainData';
type Ride=ReturnType<typeof useRoadRide>;
export default function RoadRideControls({ride,context,onPhoto,onCancel}:{ride:Ride;context:PilotTerrainContext;onPhoto:()=>void;onCancel:()=>void}){
 const s=ride.segment!,samples=context.profile.filter(p=>p.distance>=s.start&&p.distance<=s.end);
 const low=Math.min(...samples.map(p=>p.elevation)),high=Math.max(...samples.map(p=>p.elevation));
 const x=(d:number)=>12+(d-s.start)/s.length*276,y=(h:number)=>61-(h-low)/Math.max(20,high-low)*44;
 const here=ride.sample!.here;
 return <div className="road-ride-controls" aria-label="沿路观察控制">
  <div className="road-ride-metrics"><strong>距离实拍机位附近 {((s.end-ride.distance)/1000).toFixed(2)} km</strong><span>地表约 {Math.round(here.elevation/10)*10} m · 较起点 {Math.round((here.elevation-s.startHeight)/10)*10} m</span></div>
  <svg viewBox="0 0 300 72" role="img" aria-label="这一段道路的地表高程剖面，亮点为当前位置"><path d={samples.map((p,i)=>(i?'L':'M')+x(p.distance)+' '+y(p.elevation)).join(' ')}/><line x1={x(ride.distance)} x2={x(ride.distance)} y1="6" y2="66"/><circle cx={x(ride.distance)} cy={y(here.elevation)} r="5"/></svg>
  <label>沿路位置<input aria-label="乘行观察沿路位置" type="range" min={0} max={s.length} step="1" value={ride.distance-s.start} onChange={e=>ride.seek(s.start+Number(e.target.value))}/></label>
  <div className="travel-actions">{([['forward','向前'],['left','向左看'],['right','向右看'],['back','回望'],['overview','升高看道路']] as const).map(([id,label])=><button key={id} aria-pressed={ride.look===id} onClick={()=>ride.setLook(id)}>{label}</button>)}</div>
  <div className="travel-actions"><button onClick={()=>ride.setRunning(!ride.running)}>{ride.running?'暂停前进':'继续前进'}</button><button disabled={ride.distance<s.end-1} onClick={onPhoto}>在此观察实拍</button><button onClick={onCancel}>回到进入前的讲述</button></div>
  <small>1.8 km 加速空间观察，非实际车速。视点抬高约12 m，升高观察约500 m；道路走向有来源，8 m宽路面为示意；近处地形着色，不是高清实景。实拍机位为附近定位。</small>
 </div>;
}
