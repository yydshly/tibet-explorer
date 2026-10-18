import * as THREE from 'three';
import { GOLD, TEAL, label, line, disposeTree } from './environment';
import { cityAccessState } from '../lib/cityAccessState';
import { cityContinuityPartState } from '../lib/cityContinuityState';
import type { TibetSceneProps } from './TibetScene';

type Coordinate = [number, number];
type Feature = { id: string; geometry: { type: string; coordinates: unknown }; properties: { tags?: Record<string, string> } };
type Collection = { features: Feature[] };
type Reference = { id: string; city: 'nyingchi' | 'lhasa' | 'ngari'; name: string; anchor: Coordinate; featureIds: string[]; root: THREE.Group; pin: THREE.Mesh; title: THREE.Sprite; leader: THREE.Line };
type Runtime = { camera: THREE.PerspectiveCamera; at: (longitude: number, latitude: number, offset?: number) => THREE.Vector3 };
type ScreenBox={x:number;y:number;width:number;height:number};

/** A derived label anchor, never an official aerodrome reference point. */
export function transportFeatureAnchor(feature: Feature): Coordinate | undefined {
  if (feature.geometry.type === 'Point') return feature.geometry.coordinates as Coordinate;
  if (feature.geometry.type !== 'LineString') return undefined;
  const positions = feature.geometry.coordinates as Coordinate[];
  if (positions.length < 2) return undefined;
  return [(positions[0][0] + positions.at(-1)![0]) / 2, (positions[0][1] + positions.at(-1)![1]) / 2];
}

/** Actual reference positions accompany the enlarged regional transport
 * mechanism. They do not turn that mechanism into a surveyed airport, flight
 * path, freight yard or verified road connection. */
export function buildTransportGeographicReferences(runtime: Runtime,options:{enabled?:boolean}={}) {
  const group = new THREE.Group(); group.name = 'actual-transport-reference-positions'; group.visible = false;
  const sourceAbort = new AbortController();
  const references: Reference[] = []; let alive = true;
  const read = async (file: string) => {
    const response = await fetch(`/data/local-places/${file}`, { signal: sourceAbort.signal });
    if (!alive) throw new Error('Transport references disposed');
    if (!response.ok) throw new Error(`Missing transport reference ${file}`);
    return response.json();
  };
  function add(id: string, city: Reference['city'], name: string, feature: Feature, anchor: Coordinate) {
    const root = new THREE.Group(), pin = new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: TEAL, depthTest: false })), title = label(name, '#d6e6d9'), leader = line([new THREE.Vector3(), new THREE.Vector3()], TEAL, .75);
    title.onBeforeRender = () => {}; title.renderOrder = 72; pin.renderOrder = 71; leader.renderOrder = 70; (leader.material as THREE.LineBasicMaterial).depthTest = false;
    root.add(pin, title, leader); root.userData = { kind: 'actual-transport-geographic-reference', referenceId: id, sourceFeatureId: feature.id, coordinates: anchor, anchorScope: feature.geometry.type === 'Point' ? '原始OSM站位参考点；非货场作业台' : '真实跑道端点的展示中点；非官方机场ARP', sourceUrl: `https://www.openstreetmap.org/${feature.id}`, scope: '现状位置与开通年份分开；不提供地面接驳路线、飞行航路或工程尺寸' };
    if (feature.geometry.type === 'LineString') {
      const source = feature.geometry.coordinates as Coordinate[], runway = line(source.map(([lon, lat]) => runtime.at(lon, lat, .025)), GOLD, .9);
      runway.userData = { kind: 'actual-source-runway-centreline', sourceFeatureId: feature.id, coordinates: source, scope: '原始OSM中心线，未放大长度；区域图上以位置符号辅助阅读' }; root.add(runway);
    }
    references.push({ id, city, name, anchor, featureIds: [feature.id], root, pin, title, leader }); group.add(root);
  }
  const ready = options.enabled===false?Promise.resolve():read('transport-reference.json').then(async manifest => {
    if (!alive) return;
    const jobs = manifest.places.map(async (place: { id: string; file: string; runwayFeatureIds: string[] }) => {
      const data: Collection = await read(place.file);
      if (!alive) return;
      const runway = data.features.find(feature => place.runwayFeatureIds.includes(feature.id));
      const anchor = runway && transportFeatureAnchor(runway); if (!runway || !anchor) return;
      add(place.id, place.id === 'mainling-airport' ? 'nyingchi' : 'ngari', place.id === 'mainling-airport' ? '米林机场 · 现状位置' : '昆莎机场 · 现状位置', runway, anchor);
    });
    jobs.push((async () => {
      const entry = manifest.references.find((item: { id: string }) => item.id === 'lhasa-west-reference');
      if (!entry) return;
      const data: Collection = await read(entry.file);
      if (!alive) return;
      const feature = data.features.find(item => item.id === entry.featureId), anchor = feature && transportFeatureAnchor(feature);
      if (feature && anchor) add(entry.id, 'lhasa', '拉萨西站参考 · 货场另释读', feature, anchor);
    })());
    await Promise.allSettled(jobs);
    if (!alive) return;
    group.userData = { kind: 'actual-transport-reference-positions', loadedIds: references.map(item => item.id), scope: '真实入口定位；现状几何不随历史日期消失，不定位装卸台或虚构接续路线' };
  }).catch(() => { if (alive) group.userData.failed = true; });
  return { group, ready, references,
    update(props: TibetSceneProps, viewport: THREE.Vector2,occupied:readonly ScreenBox[]=[]) {
      if(options.enabled===false){group.visible=false;return;}
      const active = props.layer === 'atlas-city-comparison' && (props.step === 4 || props.step === 5);
      group.visible = active; if (!active || viewport.x < 1 || viewport.y < 1) return;
      const state = props.step === 4 ? cityAccessState(props.progress) : cityContinuityPartState(props.progress), focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const boxes=[...occupied];
      for (const reference of references) {
        reference.root.visible = reference.city === state.cityId && (reference.city !== 'lhasa' || props.step === 4 && state.index === 3);
        if (!reference.root.visible) continue;
        const anchor = runtime.at(...reference.anchor, .075), projected = anchor.clone().project(runtime.camera), x = (projected.x + 1) * viewport.x / 2, y = (1 - projected.y) * viewport.y / 2;
        if (projected.z < -1 || projected.z > 1) { reference.root.visible = false; continue; }
        const width = Math.min(viewport.x < 520 ? 167 : 215, reference.name.length * 12 + 22), left = viewport.x > 900 ? 348 : 8, bottom = Math.max(155,viewport.y - (viewport.y < 450 ? 132 : 215));
        const minX=left+width/2,maxX=Math.max(minX,viewport.x-width/2-20),desiredX=THREE.MathUtils.clamp(x,minX,maxX),desiredY=THREE.MathUtils.clamp(y+48,155,bottom);
        const candidates:ScreenBox[]=[{x:desiredX,y:desiredY,width,height:23}];
        for(let py=155;py<=bottom;py+=31)for(const px of [desiredX,minX,maxX])candidates.push({x:px,y:py,width,height:23});
        const placement=candidates.filter(candidate=>!boxes.some(box=>Math.abs(candidate.x-box.x)<(candidate.width+box.width)/2+8&&Math.abs(candidate.y-box.y)<(candidate.height+box.height)/2+7)).sort((a,b)=>(a.x-desiredX)**2+(a.y-desiredY)**2-((b.x-desiredX)**2+(b.y-desiredY)**2))[0];
        reference.title.visible=reference.leader.visible=Boolean(placement);reference.root.userData.screenBox=placement;
        if(placement)boxes.push(placement);const px=placement?.x??desiredX,py=placement?.y??desiredY;
        const target = new THREE.Vector3(px / viewport.x * 2 - 1, 1 - py / viewport.y * 2, projected.z).unproject(runtime.camera), unit = anchor.distanceTo(runtime.camera.position) / focal;
        reference.pin.position.copy(anchor); reference.pin.scale.setScalar(unit * 4); reference.title.position.copy(target); reference.title.scale.set(width * unit, 23 * unit, 1);
        for (const child of reference.root.children) if (child.userData.kind === 'actual-source-runway-centreline') {
          const source = child.userData.coordinates as Coordinate[], positions = (child as THREE.Line).geometry.attributes.position as THREE.BufferAttribute;
          source.forEach(([lon, lat], index) => { const point = runtime.at(lon, lat, .025); positions.setXYZ(index, point.x, point.y, point.z); }); positions.needsUpdate = true; (child as THREE.Line).geometry.computeBoundingSphere();
        }
        const positions = reference.leader.geometry.attributes.position as THREE.BufferAttribute; positions.setXYZ(0, anchor.x, anchor.y, anchor.z); positions.setXYZ(1, target.x, target.y, target.z); positions.needsUpdate = true; reference.leader.geometry.computeBoundingSphere();
        reference.root.userData.phase = state.index;
      }
    },
    dispose() { if (!alive) return; alive = false; sourceAbort.abort(); disposeTree(group); references.length = 0; },
  };
}
