import * as THREE from 'three';
import { GOLD, TEAL, latLon, line } from './environment';
import { loadElevationGrid, sampleElevationMetres, elevationDescriptors } from '../lib/elevationReading';
import type { TibetSceneProps } from './TibetScene';
import geography from '../../public/data/narrated-geography.json';

export const EARTH_FOUNDATION_LAYERS = ['earth-system', 'earth-heating', 'earth-circulation', 'earth-contrasts'] as const;
export const isEarthFoundation = (layer: string) => (EARTH_FOUNDATION_LAYERS as readonly string[]).includes(layer);
export const FOUNDATION_RELIEF_EXAGGERATION = 120;
const clamp = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
type FoundationLabel = {
  id: string; text: string; latitude: number; longitude: number; radius?: number;
  layers: string[]; offset: [number, number]; color?: string; selectable?: boolean;
  show?: (props: TibetSceneProps) => boolean;
};
export type CirculationCell = 'hadley' | 'ferrel' | 'polar';

/** Four visible phases of a zonal-mean circulation diagram. These are not
 * trajectories of individual parcels; the Ferrel cell is an indirect mean cell. */
export function foundationCellPoint(cell: CirculationCell, hemisphere: 1 | -1, progress: number, longitude = 55, radius = 3.65) {
  const rising = cell === 'hadley' ? 0 : 60, sinking = cell === 'polar' ? 86 : 30;
  const phase = Math.min(3, Math.floor(clamp(progress) * 4)), t = Math.min(1, clamp(progress) * 4 - phase);
  const lower = radius + .075, upper = radius + .64;
  let latitude = rising, distance = lower, lon = longitude;
  if (phase === 0) distance = THREE.MathUtils.lerp(lower, upper, t);
  if (phase === 1) { latitude = THREE.MathUtils.lerp(rising, sinking, t); distance = upper; }
  if (phase === 2) { latitude = sinking; distance = THREE.MathUtils.lerp(upper, lower, t); }
  if (phase === 3) {
    latitude = THREE.MathUtils.lerp(sinking, rising, t);
    // A schematic east/west bend distinguishes the return branch from a
    // non-rotating meridional loop. This is no integration of Coriolis dynamics.
    lon += (cell === 'ferrel' ? 1 : -1) * 11 * Math.sin(Math.PI * t);
  }
  return latLon(latitude * hemisphere, lon, distance);
}

/** Equal cross sections in a plane perpendicular to the sunlight direction.
 * Their intersections with the sphere spread farther at the higher latitude. */
export function sunlightIntersection(latitude: number, verticalOffset: number, lateralOffset: number, radius = 3.65, longitude = 55) {
  const north = radius * Math.sin(THREE.MathUtils.degToRad(latitude)) + verticalOffset;
  const radial = Math.sqrt(Math.max(0, radius * radius - north * north - lateralOffset * lateralOffset));
  const sunward = latLon(0, longitude, 1), east = latLon(0, longitude + 90, 1);
  return sunward.multiplyScalar(radial).addScaledVector(east, lateralOffset).add(new THREE.Vector3(0, north, 0));
}

export function buildEarthFoundations(radius: number, earthMaterial: THREE.MeshStandardMaterial) {
  const group = new THREE.Group(); group.userData.kind = 'earth-foundation-processes';
  const system = new THREE.Group(), heating = new THREE.Group(), circulation = new THREE.Group(), contrasts = new THREE.Group();
  group.add(system, heating, circulation, contrasts);
  system.userData.kind = 'earth-component-reference';
  const riverExample=new THREE.Group();system.add(riverExample);
  for(const feature of geography.rivers.filter(f=>f.properties.name==='Nile'))for(const coordinates of feature.geometry.coordinates){
   const course=line(coordinates.map(p=>latLon(p[1],p[0],radius+.016)),0x7ce9f0,1);riverExample.add(course);
  }
  riverExample.userData={kind:'sourced-globe-river-example',source:geography.metadata.riversSource,name:'Nile',scope:'尼罗河作为真实河流例子，线宽为阅读符号'};
  heating.userData.kind = 'parallel-light-geometric-projection';
  circulation.userData.kind = 'idealized-zonal-mean-circulation';
  contrasts.userData.kind = 'regional-conditions-comparison';
  const labels: FoundationLabel[] = [];
  const addLabel = (id: string, text: string, latitude: number, longitude: number, layer: string, offset: [number, number], options: Partial<FoundationLabel> = {}) =>
    labels.push({ id, text, latitude, longitude, layers: [layer], offset, ...options });
  const marker = (owner: THREE.Group, latitude: number, longitude: number, color: number, id: string, size = .17) => {
    const anchor = latLon(latitude, longitude, radius + .06);
    const ring = new THREE.Mesh(new THREE.RingGeometry(size * .76, size, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(anchor); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), anchor.clone().normalize());
    ring.userData.selectId = id; owner.add(ring); return ring;
  };

  // An exaggerated atmospheric shell locates the air around the entire Earth;
  // there is no invented global ocean mask or surveyed ice outline.
  const air = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.065, 72, 48), new THREE.ShaderMaterial({
    uniforms: { emphasis: { value: .3 } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform float emphasis;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(n,v)),2.);gl_FragColor=vec4(.39,.77,.86,(.025+rim*.62)*emphasis);}',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  air.userData.kind = 'exaggerated-atmosphere-reference'; system.add(air);
  const componentMarkers = [
    marker(system, -15, 77, 0x71d8dc, 'earth-ocean', .28),
    marker(system, 8, 22, 0xc6d8a1, 'earth-land', .25),
    marker(system, -71, 38, 0xe1f2f7, 'earth-ice', .2),
    marker(system, 0, 22, 0x8edba7, 'earth-vegetation', .22),
  ];
  addLabel('earth-ocean', '印度洋 · 海洋', -15, 77, 'earth-system', [55, 14], { color: '#a7e9ef', selectable: true });
  addLabel('earth-land', '非洲 · 陆地', 8, 22, 'earth-system', [-62, -13], { color: '#dce9bd', selectable: true });
  addLabel('earth-river','河流例子 · 尼罗河',21,31,'earth-system',[65,-24],{color:'#9de9ef'});
  addLabel('earth-air', '大气 · 厚度夸张', 32, 112, 'earth-system', [42, -30], { radius: radius * 1.065, color: '#a7e9ef', selectable: true });
  addLabel('earth-ice', '南极冰盖 · 冰冻圈', -71, 38, 'earth-system', [-45, 22], { color: '#e1f2f7', selectable: true });
  addLabel('earth-vegetation','刚果区域 · 植被例子',0,22,'earth-system',[-55,12],{color:'#b4e8bc',selectable:true});
  addLabel('earth-vapour','水汽 · 气态水',8,60,'earth-system',[55,-25],{radius:radius+.6,color:'#a2ecf0'});

  const sunlight = latLon(0, 55, 1), east = latLon(0, 145, 1), photon = new THREE.SphereGeometry(.045, 10, 8);
  const beams: { start: THREE.Vector3; end: THREE.Vector3; ray: THREE.Line; photon: THREE.Mesh;latitude:number }[] = [];
  const footprints: THREE.Mesh[] = [];
  for (const [latitude, color] of [[0, GOLD], [60, 0x9ddbd9]]) {
    const boundary: THREE.Vector3[] = [];
    const halfWidth = .23, halfHeight = .23;
    for (let i = 0; i <= 96; i++) {
      const edge = Math.min(3, Math.floor(i / 24)), t = i / 24 - edge;
      const x = edge === 0 ? THREE.MathUtils.lerp(-halfWidth, halfWidth, t) : edge === 1 ? halfWidth : edge === 2 ? THREE.MathUtils.lerp(halfWidth, -halfWidth, t) : -halfWidth;
      const y = edge === 0 ? -halfHeight : edge === 1 ? THREE.MathUtils.lerp(-halfHeight, halfHeight, t) : edge === 2 ? halfHeight : THREE.MathUtils.lerp(halfHeight, -halfHeight, t);
      boundary.push(sunlightIntersection(latitude, y, x, radius, 55).setLength(radius + .04));
    }
    const centre = sunlightIntersection(latitude, 0, 0, radius, 55).setLength(radius + .04), vertices: number[] = [];
    for (let i = 0; i < boundary.length - 1; i++) vertices.push(...centre.toArray(), ...boundary[i].toArray(), ...boundary[i + 1].toArray());
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const footprint = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }));
    footprint.userData.kind = latitude === 0 ? 'equal-beam-equatorial-footprint' : 'equal-beam-high-latitude-footprint';
    heating.add(footprint, line(boundary, color, .95)); footprints.push(footprint);
    // Same square incoming beam at both latitudes; the surface footprint is
    // computed from intersections, never stretched as a decorative ellipse.
    for (const verticalOffset of [-halfHeight, 0, halfHeight]) for (const lateralOffset of [-halfWidth, 0, halfWidth]) {
      const end = sunlightIntersection(latitude, verticalOffset, lateralOffset, radius, 55);
      const start = sunlight.clone().multiplyScalar(6.35).addScaledVector(east, lateralOffset).add(new THREE.Vector3(0, radius * Math.sin(THREE.MathUtils.degToRad(latitude)) + verticalOffset, 0));
      const ray = line([start, end], color, .54); ray.userData.kind = 'parallel-equal-width-solar-ray';
      const dot = new THREE.Mesh(photon, new THREE.MeshBasicMaterial({ color }));
      heating.add(ray, dot); beams.push({ start, end, ray, photon: dot,latitude });
    }
    const normal = centre.clone().normalize();
    heating.add(line([centre, centre.clone().addScaledVector(normal, .65)], 0xdae6dd, .5, true));
  }
  addLabel('heat-equator', '赤道附近 · 同一束光较集中', 0, 55, 'earth-heating', [-85, 31], { color: '#f5dfa3' });
  addLabel('heat-highlatitude', '60°N · 同宽光束铺得更开', 60, 55, 'earth-heating', [64, -32], { color: '#b6e5e1' });

  const cells: { cell: CirculationCell; hemisphere: 1 | -1; longitude: number; trace: THREE.Line; head: THREE.Mesh; trail: THREE.Points; primary: boolean }[] = [];
  const colors: Record<CirculationCell, number> = { hadley: GOLD, ferrel: TEAL, polar: 0xb6c9ed };
  for (const longitude of [55, -35, 145]) for (const hemisphere of [1, -1] as const) for (const cell of ['hadley', 'ferrel', 'polar'] as const) {
    const primary = longitude === 55;
    const points = Array.from({ length: 161 }, (_, i) => foundationCellPoint(cell, hemisphere, i / 160, longitude, radius));
    const reference = line(points, colors[cell], primary ? .12 : .045);
    const trace = line(points, colors[cell], primary ? .29 : .075); trace.geometry.setDrawRange(0, 1);
    const head = new THREE.Mesh(new THREE.ConeGeometry(primary ? .065 : .045, primary ? .2 : .14, 10), new THREE.MeshBasicMaterial({ color: colors[cell], transparent: true, opacity: primary ? 1 : .55 }));
    head.userData.kind = `circulation-${cell}-${hemisphere > 0 ? 'north' : 'south'}-head`;
    const trail = new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 7 }, () => points[0].clone())), new THREE.PointsMaterial({ color: colors[cell], size: primary ? .045 : .025, transparent: true, opacity: primary ? .9 : .4 }));
    circulation.add(reference, trace, head, trail); cells.push({ cell, hemisphere, longitude, trace, head, trail, primary });
  }
  for (const latitude of [-60, -30, 0, 30, 60]) {
    const points = Array.from({ length: 121 }, (_, i) => latLon(latitude, i * 3, radius + .025));
    circulation.add(line(points, latitude === 0 ? GOLD : 0xb5c7ca, latitude === 0 ? .24 : .07));
  }
  // One foreground loop provides a readable explanation. The other averaged
  // cells are context; rendering all of them with equal weight creates a cage.
  const phaseColors = [0xf4bd62, 0xd5dda1, 0x67d9ce, 0xa4dfb5];
  const foreground = new THREE.Group(); foreground.userData.kind = 'foreground-circulation-phases'; circulation.add(foreground);
  const phaseTubes = phaseColors.map((color, phase) => {
    const points = Array.from({ length: 61 }, (_, i) => foundationCellPoint('hadley', 1, (phase + i / 60) / 4, 55, radius));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, .047, 8, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false }));
    tube.userData.kind = ['mean-air-ascent', 'mean-upper-transport', 'mean-air-descent', 'mean-surface-return'][phase]; foreground.add(tube); return tube;
  });
  const phaseHeads = Array.from({ length: 3 }, (_, index) => {
    const head = new THREE.Mesh(new THREE.ConeGeometry(index === 2 ? .14 : .1, index === 2 ? .38 : .29, 12), new THREE.MeshBasicMaterial({ color: phaseColors[0] }));
    foreground.add(head); return head;
  });
  const airPackets = Array.from({ length: 5 }, (_, index) => {
    const packet = new THREE.Mesh(new THREE.SphereGeometry(.085 - index * .008, 12, 8), new THREE.MeshBasicMaterial({ color: phaseColors[0], transparent: true, opacity: .8 - index * .11, depthWrite: false }));
    packet.userData.kind = 'schematic-air-direction-marker'; foreground.add(packet); return packet;
  });
  addLabel('circulation-rise', '① 赤道附近 · 平均上升', 0, 55, 'earth-circulation', [-75, 18], { radius: radius + .35, show: p => p.progress < .28, color: '#f5dfa3' });
  addLabel('circulation-upper', '② 高处 · 向外输送', 17, 55, 'earth-circulation', [-76, -28], { radius: radius + .64, show: p => p.progress >= .25 && p.progress < .53 });
  addLabel('circulation-sink', '③ 副热带 · 平均下沉', 30, 55, 'earth-circulation', [-76, -28], { radius: radius + .35, show: p => p.progress >= .5 && p.progress < .78 });
  addLabel('circulation-return', '④ 近地面返回 · 路径有偏转', 15, 45, 'earth-circulation', [-65, 16], { radius: radius + .08, show: p => p.progress >= .75 });
  addLabel('circulation-midlatitude', '中纬度 · 间接环流示意', 47, 55, 'earth-circulation', [70, -25], { radius: radius + .6 });
  addLabel('circulation-polar', '极地 · 平均环流示意', -73, 55, 'earth-circulation', [45, 14], { radius: radius + .5 });

  const pressure=new THREE.Group();pressure.userData.kind='schematic-pressure-difference';circulation.add(pressure);
  const pressureFrom=latLon(14,70,radius+.12),pressureTo=latLon(0,55,radius+.12),pressureLine=line([pressureFrom,pressureTo],GOLD,.8,true);pressure.add(pressureLine);
  const pressureArrow=new THREE.Mesh(new THREE.ConeGeometry(.08,.24,10),new THREE.MeshBasicMaterial({color:GOLD}));pressure.add(pressureArrow);
  addLabel('circulation-pressure','气压差 · 推动空气',8,62,'earth-circulation',[55,-22],{radius:radius+.2});

  // A separate local moist-air example explains conditions. It is deliberately
  // not a parcel completing the entire zonal-mean circulation loop.
  const moisture=new THREE.Group();moisture.userData={kind:'earth-local-moist-air-example',scope:'局部湿空气条件示意；与平均环流图分层，非真实天气气团轨迹'};group.add(moisture);
  const airParcel=new THREE.Mesh(new THREE.SphereGeometry(.12,20,14),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:.45,depthWrite:false}));airParcel.userData.kind='earth-conceptual-moist-air';moisture.add(airParcel);
  const vapour=Array.from({length:4},(_,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.037,10,8),new THREE.MeshBasicMaterial({color:TEAL}));mesh.userData.kind='earth-gaseous-water-symbol';moisture.add(mesh);return mesh;});
  const evaporationStart=latLon(-5,72,radius+.06),evaporationEnd=latLon(-5,72,radius+.55),transportEnd=latLon(10,55,radius+.55),cooledEnd=latLon(10,55,radius+1.02);
  const moistureTrail=line([evaporationStart,evaporationStart],TEAL,.7);moisture.add(moistureTrail);
  const cloud=new THREE.Group();cloud.userData.kind='earth-conditional-cloud';for(const dx of [-.12,0,.12]){const puff=new THREE.Mesh(new THREE.SphereGeometry(.13,16,10),new THREE.MeshBasicMaterial({color:0xe0edef,transparent:true,opacity:.8,depthWrite:false}));puff.position.x=dx;puff.scale.set(1.1,.7,.9);cloud.add(puff);}moisture.add(cloud);
  addLabel('circulation-cooling','上升 · 膨胀冷却',10,55,'earth-circulation',[58,-25],{radius:radius+.9});
  addLabel('circulation-cloud','合适含湿条件 · 可能成云',10,55,'earth-circulation',[58,-25],{radius:radius+1.02});

  const comparisons = [
    { id: 'compare-equator', latitude: 0, longitude: 22, color: 0x83dfbc },
    { id: 'compare-desert', latitude: 23, longitude: 13, color: GOLD },
    { id: 'compare-plateau', latitude: 32, longitude: 89, color: 0xaccfe5 },
  ];
  const contrastMarkers = comparisons.map(place => marker(contrasts, place.latitude, place.longitude, place.color, place.id, .18));
  addLabel('compare-equator', '刚果盆地 · 赤道湿润低地', 0, 22, 'earth-contrasts', [-69, 25], { color: '#b1e9cc', selectable: true });
  addLabel('compare-desert', '撒哈拉 · 副热带干旱区', 23, 13, 'earth-contrasts', [-62, -27], { color: '#f5dfa3', selectable: true });
  addLabel('compare-plateau', '青藏高原 · 高度与山地作用', 32, 89, 'earth-contrasts', [65, -27], { color: '#c3dfef', selectable: true });
  // Two schematic vertical-air examples stay at their actual reference places.
  // They illustrate conditions conducive/inhibiting cloud formation, not weather.
  const localAir = comparisons.slice(0, 2).map(place => {
    const up = place.id === 'compare-equator', points = Array.from({ length: 61 }, (_, i) => latLon(place.latitude, place.longitude, radius + .1 + (up ? i / 60 : 1 - i / 60) * .62));
    const path = line(points, place.color, .7), head = new THREE.Mesh(new THREE.ConeGeometry(.075, .23, 10), new THREE.MeshBasicMaterial({ color: place.color }));
    const cloud = new THREE.Group(); cloud.position.copy(latLon(place.latitude, place.longitude, radius + .79));
    for (const offset of [-.1, 0, .1]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 10), new THREE.MeshBasicMaterial({ color: 0xd3e6e7, transparent: true, opacity: .75 }));
      puff.position.x = offset; puff.scale.set(1.2, .65, .85); cloud.add(puff);
    }
    const owner = new THREE.Group(); owner.add(path, head, cloud); contrasts.add(owner);
    return { ...place, owner, up, points, head, cloud };
  });
  addLabel('contrast-rising', '上升冷却 · 有利成云条件', 0, 22, 'earth-contrasts', [51, -39], { radius: radius + .79, show: p => p.selected === 'compare-equator' || !comparisons.some(item => item.id === p.selected) });
  addLabel('contrast-descending', '下沉增温 · 通常不利成云', 23, 13, 'earth-contrasts', [65, 23], { radius: radius + .68, show: p => p.selected === 'compare-desert' });

  // The highland is displaced from the same sourced regional elevation grid.
  // It remains on the globe; no generic mountain is presented as Tibetan terrain.
  const relief = new THREE.Group(); relief.userData.kind = 'sourced-regional-globe-relief'; relief.userData.verticalExaggeration = FOUNDATION_RELIEF_EXAGGERATION;
  contrasts.add(relief);
  const reliefMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, transparent: true, opacity: .98, side: THREE.DoubleSide });
  let alive = true, reliefReady = false;
  const ready = loadElevationGrid('regional').then(grid => {
    if (!alive) return;
    const meta = elevationDescriptors.regional, nx = 100, ny = 52, vertices: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
      const longitude = THREE.MathUtils.lerp(meta.west, meta.east, ix / nx), latitude = THREE.MathUtils.lerp(meta.south, meta.north, iy / ny);
      const metres = sampleElevationMetres(grid, meta, longitude, latitude);
      const distance = radius + .012 + Math.max(0, metres) / 6371000 * radius * FOUNDATION_RELIEF_EXAGGERATION;
      vertices.push(...latLon(latitude, longitude, distance).toArray()); uv.push((longitude + 180) / 360, (latitude + 90) / 180);
      if (ix < nx && iy < ny) { const a = iy * (nx + 1) + ix, b = a + nx + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, reliefMaterial); mesh.userData.selectId = 'compare-plateau'; relief.add(mesh); reliefReady = true;
  }).catch(() => { /* Globe imagery remains; no replacement terrain is invented. */ });
  addLabel('contrast-relief', '真实高程 · 垂直夸张 120×', 32, 89, 'earth-contrasts', [70, 31], { radius: radius + .42, show: p => p.selected === 'compare-plateau' && reliefReady });
  const upAxis = new THREE.Vector3(0, 1, 0), point = new THREE.Vector3(), tangent = new THREE.Vector3();

  return {
    group, labels, ready,
    anchor(id:string){return id==='earth-vapour'||id==='circulation-cooling'?airParcel.position:id==='circulation-cloud'?cloud.position:undefined;},
    dispose() { alive = false; if (!reliefReady) reliefMaterial.dispose(); },
    update(p: TibetSceneProps) {
      group.visible = isEarthFoundation(p.layer); if (!group.visible) return;
      system.visible = p.layer === 'earth-system'; heating.visible = p.layer === 'earth-heating'; circulation.visible = p.layer === 'earth-circulation'; contrasts.visible = p.layer === 'earth-contrasts';
      const guided=!!p.guide?.active&&!!p.guide.action,action=guided?p.guide!.action!:'',local=guided?clamp(p.guide!.actionProgress??0):clamp(p.progress),targets=new Set(guided?p.guide!.targets:[]);
      let progress=clamp(p.progress);const selected=guided?(p.guide!.comparison??p.guide!.targets[0]):p.selected;
      const branch=['rise','upper','sink','return','deflection'].indexOf(action);if(guided&&p.layer==='earth-circulation')progress=branch>=0?(Math.min(branch,3)+local)/4:action==='mean-context'?1:0;
      group.userData.narration={phraseId:p.guide?.phraseId,action,actionProgress:local,targets:[...targets],timingPrecision:p.guide?.timingPrecision};
      heating.visible=heating.visible||action==='heat-difference';
      system.visible=system.visible||['heat-storage','heat-transport','carry','evaporation','vapour-transport','cool','cloud','transport','linked'].includes(action);
      air.visible=!guided||targets.has('earth-air');air.material.uniforms.emphasis.value = selected === 'earth-air' ? .95 : .4;
      for (const ring of componentMarkers) { const active = ring.userData.selectId === selected;ring.visible=!guided||targets.has(ring.userData.selectId); ring.scale.setScalar(active ? 1.45 : 1); ring.material.opacity = active ? 1 : .3; }
      for (const beam of beams) {const active=!guided||action==='heat-difference'||action==='equal-beams'||action==='latitude-energy'||action==='direct'&&beam.latitude===0||action==='oblique'&&beam.latitude===60;const t=guided?action==='equal-beams'?local*.35:action==='direct'?beam.latitude===0?local:0:action==='oblique'?beam.latitude===60?local:1:1:progress;beam.photon.visible=active;beam.photon.position.copy(beam.start).lerp(beam.end,t); (beam.ray.material as THREE.LineBasicMaterial).opacity = active?.8:.15; }
      footprints.forEach((footprint,index)=>{const active=!guided||action==='equal-beams'||action==='latitude-energy'||action==='direct'&&index===0||action==='oblique'&&index===1;(footprint.material as THREE.MeshBasicMaterial).opacity=active?.2+.4*local:.12;});
      pressure.visible=p.layer==='earth-circulation'&&(!guided||action==='pressure');pressureArrow.position.copy(pressureFrom).lerp(pressureTo,local);pressureArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),pressureTo.clone().sub(pressureFrom).normalize());
      moisture.visible=guided&&['carry','evaporation','vapour-transport','cool','cloud','transport','heat-transport'].includes(action);
      let moistureAt=evaporationEnd.clone();if(action==='evaporation')moistureAt.lerpVectors(evaporationStart,evaporationEnd,local);else if(['carry','vapour-transport','transport','heat-transport'].includes(action))moistureAt.lerpVectors(evaporationEnd,transportEnd,local);else if(action==='cool')moistureAt.lerpVectors(transportEnd,cooledEnd,local);else if(action==='cloud')moistureAt.copy(cooledEnd);
      airParcel.position.copy(moistureAt);airParcel.visible=action!=='evaporation';airParcel.scale.setScalar(action==='cool'?1+local*.65:action==='cloud'?1.65:1);airParcel.material.color.set(GOLD).lerp(new THREE.Color(0x8ecfe3),action==='cool'?local:action==='cloud'?1:0);
      vapour.forEach((drop,index)=>{drop.position.copy(moistureAt).add(new THREE.Vector3((index%2-.5)*.1,Math.floor(index/2)*.07-.035,0));});const moisturePositions=moistureTrail.geometry.attributes.position as THREE.BufferAttribute;const origin=action==='evaporation'?evaporationStart:action==='cool'||action==='cloud'?transportEnd:evaporationEnd;moisturePositions.setXYZ(0,origin.x,origin.y,origin.z);moisturePositions.setXYZ(1,moistureAt.x,moistureAt.y,moistureAt.z);moisturePositions.needsUpdate=true;moistureTrail.geometry.computeBoundingSphere();cloud.position.copy(cooledEnd);cloud.visible=action==='cloud'&&local>.02;cloud.scale.setScalar(.2+.8*local);
      for (const item of cells) {
        item.trace.geometry.setDrawRange(0, Math.max(1, Math.floor(progress * 160) + 1));
        point.copy(foundationCellPoint(item.cell, item.hemisphere, progress, item.longitude, radius)); item.head.position.copy(point);
        tangent.copy(foundationCellPoint(item.cell, item.hemisphere, Math.min(.99999, progress + .001), item.longitude, radius)).sub(foundationCellPoint(item.cell, item.hemisphere, Math.max(0, progress - .001), item.longitude, radius)).normalize();
        item.head.quaternion.setFromUnitVectors(upAxis, tangent);
        const positions = item.trail.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i++) { point.copy(foundationCellPoint(item.cell, item.hemisphere, Math.max(0, progress - i * .015), item.longitude, radius)); positions.setXYZ(i, point.x, point.y, point.z); }
        positions.needsUpdate = true; item.trail.geometry.computeBoundingSphere();
        // Leave the explanatory foreground direction arrows uncontested.
        item.head.visible = !guided&&item.primary && item.cell !== 'hadley';
        item.trail.visible = false;
      }
      const phase = Math.min(3, Math.floor(progress * 4)), phaseProgress = Math.min(1, progress * 4 - phase);
      foreground.visible=!guided||branch>=0||action==='mean-context';
      phaseTubes.forEach((tube, index) => {
        tube.visible = index <= phase;
        tube.material.opacity = index === phase ? .97 : .17;
        tube.geometry.setDrawRange(0, index === phase ? Math.max(1, Math.floor(phaseProgress * 60)) * 8 * 6 : Infinity);
      });
      phaseHeads.forEach((head, index) => {
        const local = phaseProgress * [ .37, .7, 1 ][index];
        const at = Math.min(.9999, (phase + local) / 4);
        head.visible = index === 2 || phaseProgress > .18;
        head.position.copy(foundationCellPoint('hadley', 1, at, 55, radius));
        tangent.copy(foundationCellPoint('hadley', 1, Math.min(.99999, at + .001), 55, radius)).sub(foundationCellPoint('hadley', 1, Math.max(0, at - .001), 55, radius)).normalize();
        head.quaternion.setFromUnitVectors(upAxis, tangent); head.material.color.set(phaseColors[phase]);
      });
      airPackets.forEach((packet, index) => {
        const local = Math.max(0, phaseProgress - .055 - index * .05);
        packet.visible = phaseProgress > .08 + index * .05;
        packet.position.copy(foundationCellPoint('hadley', 1, (phase + local) / 4, 55, radius)); packet.material.color.set(phaseColors[phase]);
      });
      const activeComparison = comparisons.some(item => item.id === selected) ? selected : 'compare-equator';
      riverExample.visible=p.layer==='earth-system'&&(!guided||action==='land');
      for (const ring of contrastMarkers) { const active = ring.userData.selectId === activeComparison; ring.scale.setScalar(active ? 1.4 : 1); ring.material.opacity = active ? 1 : .65; }
      for (const item of localAir) {
        item.owner.visible = activeComparison === item.id;
        const regionalProgress=guided?['equator-cloud','desert-sink'].includes(action)?local:0:progress;
        const t = item.up ? regionalProgress : 1 - regionalProgress; item.head.position.copy(latLon(item.latitude, item.longitude, radius + .1 + t * .62));
        tangent.copy(item.head.position).normalize().multiplyScalar(item.up ? 1 : -1); item.head.quaternion.setFromUnitVectors(upAxis, tangent);
        const amount = guided?(item.up&&action==='equator-cloud'?THREE.MathUtils.smoothstep(local,0,1):0):item.up ? THREE.MathUtils.smoothstep(progress, .4, 1) : 1 - THREE.MathUtils.smoothstep(progress, 0, .7);
        item.cloud.scale.setScalar(.2 + .8 * amount); item.cloud.visible = amount > .02;
        item.cloud.children.forEach(child => { ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = amount * .75; });
      }
      relief.visible = activeComparison === 'compare-plateau' && reliefReady;
      if (reliefMaterial.map !== earthMaterial.map) { reliefMaterial.map = earthMaterial.map; reliefMaterial.needsUpdate = true; }
    },
  };
}
