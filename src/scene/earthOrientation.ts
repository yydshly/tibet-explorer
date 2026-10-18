import {buildRotationFlow,rotationFlowCamera} from './rotationFlow';
import * as THREE from 'three';
import { GOLD, TEAL, label, latLon, line } from './environment';
import type { TibetSceneProps } from './TibetScene';
import { buildEarthFoundations, isEarthFoundation } from './earthFoundations';

type Runtime = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  focus: (position: THREE.Vector3, target: THREE.Vector3) => void;
  focusRecorded?: (position:THREE.Vector3,target:THREE.Vector3)=>void;
  hasSavedView: (key: string) => boolean;
};
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
type ContextData = { china?: Geometry; tibet?: Geometry; plateau?: Geometry };
type Callout = {
  id: string; text: string; anchor: THREE.Vector3; sprite: THREE.Sprite;
  leader: THREE.Line; pin: THREE.Mesh; offset: [number, number]; layers: string[]; width: number;
  show?: (props: TibetSceneProps) => boolean;
  foundation?: boolean;
};
const RADIUS = 3.65;
const canonicalLayer = (value: string) => value === 'terrain' ? 'tibet' : value === 'grid' ? 'latitude' : value;

type SurfaceStroke = { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; points: THREE.Vector3[]; sides: THREE.Vector3[]; count: number; pixelWidth: number };
const sourceStrokes = new WeakMap<THREE.Object3D, SurfaceStroke>();
/** A screen-visible pen ribbon follows source vertices without smoothing or
 * shifting the geographic boundary. Width indicates attention, not map scale. */
function surfaceStroke(points: THREE.Vector3[], color: number, pixelWidth = 2.4): SurfaceStroke {
  const positions: number[] = [], indices: number[] = [], sides: THREE.Vector3[] = [];
  points.forEach((point, index) => {
    const tangent = points[Math.min(index + 1, points.length - 1)].clone().sub(points[Math.max(0, index - 1)]).normalize();
    const side = point.clone().normalize().cross(tangent).normalize(); sides.push(side);
    positions.push(...point.clone().addScaledVector(side, .008).toArray(), ...point.clone().addScaledVector(side, -.008).toArray());
    if (index) { const a = (index - 1) * 2, b = index * 2; indices.push(a, a + 1, b, b, a + 1, b + 1); }
  });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .96, side: THREE.DoubleSide, depthWrite: false }));
  mesh.userData.kind = 'narration-surface-stroke';
  return { mesh, points, sides, count: indices.length, pixelWidth };
}

/** Preserve the exact centreline while the camera approaches a country or
 * region. A world-space width would become an opaque stripe in close views. */
function fitStrokeWidth(stroke: SurfaceStroke, camera: THREE.PerspectiveCamera, focalLength: number) {
  const positions = stroke.mesh.geometry.attributes.position as THREE.BufferAttribute;
  const elements = camera.matrixWorldInverse.elements;
  stroke.points.forEach((point, index) => {
    const depth = Math.max(.01, -(elements[2] * point.x + elements[6] * point.y + elements[10] * point.z + elements[14]));
    const halfWidth = stroke.pixelWidth * depth / (2 * Math.max(1, focalLength)), side = stroke.sides[index];
    positions.setXYZ(index * 2, point.x + side.x * halfWidth, point.y + side.y * halfWidth, point.z + side.z * halfWidth);
    positions.setXYZ(index * 2 + 1, point.x - side.x * halfWidth, point.y - side.y * halfWidth, point.z - side.z * halfWidth);
  });
  positions.needsUpdate = true;
  stroke.mesh.geometry.computeBoundingSphere();
}

function revealStroke(stroke: SurfaceStroke, progress: number) {
  stroke.mesh.geometry.setDrawRange(0, Math.floor(THREE.MathUtils.clamp(progress, 0, 1) * (stroke.count / 6)) * 6);
}

function geographicOverlay(geometry: Geometry, color: number, opacity: number, id: string) {
  const group = new THREE.Group();
  group.userData.selectId = id;
  const polygons: number[][][][] = geometry.type === 'Polygon'
    ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  const vertices: number[] = [];
  const addTriangle = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, depth = 0) => {
    // Project small triangles back to the sphere, rather than letting long chords
    // cut through the globe and erase the interior of the geographic overlay.
    if (depth < 5 && Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) > 2.4) {
      const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
      addTriangle(a, ab, ca, depth + 1); addTriangle(ab, b, bc, depth + 1);
      addTriangle(ca, bc, c, depth + 1); addTriangle(ab, bc, ca, depth + 1);
      return;
    }
    for (const v of [a, b, c]) vertices.push(...latLon(v.y, v.x, RADIUS + .034).toArray());
  };
  for (const polygon of polygons) {
    const rings = polygon.map(ring => ring.slice(0, -1).map(([lon, lat]) => new THREE.Vector2(lon, lat))).filter(ring => ring.length >= 3);
    if (!rings.length) continue;
    const flattened = rings.flat();
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1))) addTriangle(flattened[a], flattened[b], flattened[c]);
    for (const ring of rings) {
      const positions: THREE.Vector3[] = [];
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], segments = Math.max(1, Math.ceil(a.distanceTo(b) / .7));
        for (let j = 0; j < segments; j++) {
          const p = a.clone().lerp(b, j / segments); positions.push(latLon(p.y, p.x, RADIUS + .052));
        }
      }
      positions.push(positions[0].clone()); group.add(line(positions, color, .96));
      const stroke = surfaceStroke(positions.map(point => point.clone().setLength(RADIUS + .071)), GOLD);
      stroke.mesh.userData.boundaryTarget = id;
      sourceStrokes.set(stroke.mesh, stroke);
      stroke.mesh.visible = false; group.add(stroke.mesh);
    }
  }
  if (vertices.length) {
    const meshGeometry = new THREE.BufferGeometry(); meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    group.add(new THREE.Mesh(meshGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })));
  }
  return group;
}

export function buildEarthOrientation(runtime: Runtime) {
  const group = new THREE.Group(), earthMaterial = new THREE.MeshStandardMaterial({ color: 0x84b3bb, roughness: .95, metalness: 0 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 112, 80), earthMaterial); earth.userData.blocksSelection = true; group.add(earth);
  const foundations = buildEarthFoundations(RADIUS, earthMaterial); group.add(foundations.group);
  const rotationFlow=buildRotationFlow(RADIUS);group.add(rotationFlow.group);
  let alive = true;
  const textureReady=new Promise<void>(resolve=>new THREE.TextureLoader().load('/assets/earth-blue-marble.jpg', texture => {
    if (!alive) { texture.dispose();resolve(); return; }
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, runtime.renderer.capabilities.getMaxAnisotropy());
    earthMaterial.map = texture; earthMaterial.color.set(0xffffff); earthMaterial.needsUpdate = true;resolve();
  },undefined,()=>resolve()));
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.028, 72, 48), new THREE.ShaderMaterial({
    uniforms: { glow: { value: new THREE.Color(0x64bed2) } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 glow; varying vec3 n; varying vec3 v; void main(){float a=pow(1.0-max(dot(n,v),0.0),3.0);gl_FragColor=vec4(glow,a*.42);}',
    transparent: true, depthWrite: false,
  })); group.add(atmosphere);
  const grid = new THREE.Group(), zones = new THREE.Group(); group.add(grid, zones);
  grid.userData.kind = 'latitude-grid'; zones.userData.kind = 'astronomical-latitude-zones';
  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const points: THREE.Vector3[] = []; for (let longitude = -180; longitude <= 180; longitude += 3) points.push(latLon(latitude, longitude, RADIUS + .018));
    grid.add(line(points, latitude === 0 ? GOLD : 0x90c2cc, latitude === 0 ? .85 : .3));
  }
  for (let longitude = -180; longitude < 180; longitude += 30) {
    const points: THREE.Vector3[] = []; for (let latitude = -90; latitude <= 90; latitude += 2) points.push(latLon(latitude, longitude, RADIUS + .018)); grid.add(line(points, 0x90c2cc, .25));
  }
  for (const [latitude, id] of [[23.44, 'earth-tropic'], [66.56, 'earth-temperate']] as const) {
    const points: THREE.Vector3[] = [];
    for (let longitude = -180; longitude <= 180; longitude += 2) points.push(latLon(latitude, longitude, RADIUS + .032));
    const reference = line(points, latitude === 23.44 ? GOLD : 0xaccbe7, .8);
    reference.userData.selectId = id; grid.add(reference);
  }
  for (const [low, high, color] of [[-90, -66.56, 0x8ba7c9], [-66.56, -23.44, 0x70b9a2], [-23.44, 23.44, 0xddb869], [23.44, 66.56, 0x70b9a2], [66.56, 90, 0x8ba7c9]]) {
    zones.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS + .025, 72, 16, 0, Math.PI * 2, THREE.MathUtils.degToRad(90 - high), THREE.MathUtils.degToRad(high - low)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .18, depthWrite: false })));
  }

  const china = new THREE.Group(), tibet = new THREE.Group(), plateau = new THREE.Group(); group.add(china, tibet, plateau);
  china.userData.kind = 'china-reference'; tibet.userData.kind = 'tibet-reference'; plateau.userData.kind = 'physical-plateau-reference';
  // This is cartographic source geometry, loaded locally. Natural Earth outlines
  // are generalized reference data, not surveyed boundaries or a terrain model.
  const boundariesReady=fetch('/assets/earth-context.json').then(response => { if (!response.ok) throw new Error('Reference geometry unavailable'); return response.json() as Promise<ContextData>; }).then(data => {
    if (!alive) return;
    if (data.china) china.add(geographicOverlay(data.china, 0x82ccd2, .14, 'china'));
    if (data.tibet) tibet.add(geographicOverlay(data.tibet, GOLD, .22, 'tibet'));
    if (data.plateau) plateau.add(geographicOverlay(data.plateau, TEAL, .16, 'plateau'));
  }).catch(() => { /* The located point and photographic globe remain usable. */ });

  const callouts: Callout[] = [];
  const addCallout = (id: string, text: string, latitude: number, longitude: number, layers: string[], offset: [number, number], color = '#d9ebeb', options: {radius?:number;selectable?:boolean;show?:(p:TibetSceneProps)=>boolean;foundation?:boolean} = {}) => {
    const anchor = latLon(latitude, longitude, options.radius ?? RADIUS + .06), sprite = label(text, color, 2), leader = line([anchor, anchor.clone()], id === 'tibet' ? GOLD : 0x8fc8ce, .8);
    if(options.selectable!==false)sprite.userData.selectId = id; sprite.renderOrder = 12;
    sprite.userData.screenAnnotation = true;
    (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 10;
    // Annotation scale and position are computed in screen space, so camera
    // rotation and zoom retain readable, separated object-linked text.
    sprite.onBeforeRender = () => {};
    group.add(sprite, leader);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(id === 'tibet' ? .055 : .023, 16, 12), new THREE.MeshBasicMaterial({ color: id === 'tibet' ? GOLD : 0xb7e3e2 }));
    pin.position.copy(anchor); if(options.selectable!==false)pin.userData.selectId = id; group.add(pin);
    callouts.push({ id, text, anchor, sprite, leader, pin, offset, layers, width: Math.max(74, text.length * (options.foundation ? 12 : 15) + 22), show: options.show, foundation: options.foundation });
  };
  for(const item of foundations.labels)addCallout(item.id,item.text,item.latitude,item.longitude,item.layers,item.offset,item.color,{radius:item.radius,selectable:item.selectable===true,show:item.show,foundation:true});
  for(const item of rotationFlow.labels)addCallout(item.id,item.text,item.latitude,item.longitude,['earth-circulation'],item.offset,'#bce8ef',{radius:RADIUS+.13,foundation:true,show:p=>!!p.rotationFlow});
  addCallout('tibet', '西藏自治区', 31.1, 88.6, ['home', 'globe', 'asia', 'china', 'tibet', 'surroundings', 'plateau', 'moisture'], [-36, -20], '#f8dba1');
  addCallout('asia', '亚洲 · 洲', 46, 98, ['globe', 'asia'], [20, -24]);
  addCallout('china', '中国 · 国家', 35.5, 112, ['asia', 'china', 'tibet'], [35, -12]);
  addCallout('southwest', '中国西南 · 方位', 29, 96, ['china'], [44, 50]);
  addCallout('earth-atmosphere', '大气 · 外缘示意', 54, 138, ['globe'], [42, -18], '#a9e3f2');
  addCallout('indian-ocean', '印度洋', -9, 75, ['globe', 'asia', 'surroundings', 'moisture'], [-22, 20], '#9fdce6');
  addCallout('pacific-ocean', '太平洋', 3, 151, ['globe', 'asia'], [0, 15], '#9fdce6');
  addCallout('indian-subcontinent', '印度次大陆', 19, 78, ['asia', 'surroundings'], [-36, 24]);
  addCallout('central-asia', '中亚 · 大陆内部', 43, 67, ['surroundings'], [-34, -25]);
  addCallout('east-asia', '东亚 · 海陆相接', 36, 120, ['surroundings'], [32, -12]);
  addCallout('plateau', '青藏高原 · 自然范围', 36, 92, ['plateau', 'tibet'], [24, -48], '#98e3df');
  addCallout('himalaya', '喜马拉雅山系', 28.6, 86.6, ['tibet', 'plateau', 'surroundings', 'moisture'], [-40, 42]);
  addCallout('lhasa', '拉萨 · 城市', 29.65, 91.1, ['china', 'tibet'], [58, 10], '#f3dfa7');
  addCallout('tibet', '西藏 · 约27°—37°N', 31.1, 88.6, ['latitude', 'zones'], [-28, -20], '#f8dba1');
  addCallout('earth-equator', '赤道 · 0°', 0, 85, ['latitude', 'zones'], [-34, 26], '#f1d8a1');
  addCallout('earth-tropic', '北回归线 · 23.44°N', 23.44, 117, ['latitude', 'zones'], [48, 25], '#f1d8a1');
  addCallout('earth-temperate', '北温带 · 纬度背景', 48, 106, ['zones'], [24, -25], '#b5e2cc');

  const relationshipFlows = new THREE.Group(); group.add(relationshipFlows);
  const flows: { curve: THREE.CatmullRomCurve3; particles: THREE.Mesh[]; color: number; id: string; ink: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> }[] = [];
  const addFlow = (locations: [number, number][], color: number, id: string) => {
    const points = locations.map(([latitude, longitude], index) => latLon(latitude, longitude, RADIUS + .08 + Math.sin(index / (locations.length - 1) * Math.PI) * .22));
    const curve = new THREE.CatmullRomCurve3(points), flow = new THREE.Group(); flow.userData.selectId = id;
    flow.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .026, 5, false), new THREE.MeshBasicMaterial({ color: 0x09202c, transparent: true, opacity: .8 })));
    const ink = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .019, 5, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .88 }));
    ink.userData.kind = 'narration-relationship-stroke'; ink.userData.guideTarget = id; flow.add(ink);
    const particles: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const particle = new THREE.Mesh(new THREE.ConeGeometry(.04, .13, 8), new THREE.MeshBasicMaterial({ color })); particle.userData.selectId = id; particles.push(particle); flow.add(particle);
    }
    relationshipFlows.add(flow); flows.push({ curve, particles, color, id, ink });
  };
  // Schematic transport relationships establish outside context. They are not
  // fixed winds, weather forecasts, measured trajectories or runoff pathways.
  addFlow([[-6, 77], [5, 82], [16, 88], [25, 94], [30, 95]], 0x7edce9, 'indian-ocean');
  addFlow([[35, 60], [34, 70], [33, 80], [32, 89]], 0xf0d09a, 'central-asia');
  addCallout('indian-ocean', '南侧水汽联系 · 示意', 16, 88, ['moisture'], [45, 22], '#9fe4ec');
  addCallout('central-asia', '西侧环流联系 · 示意', 35, 69, ['moisture'], [-35, -18], '#f1d8a1');

  // These marks are presentation guides attached to visible geography. Only
  // China, Tibet and the natural plateau use actual source boundary geometry.
  // An open bracket around Asia or an ocean deliberately claims no boundary.
  const attention = new THREE.Group(); attention.userData.kind = 'narration-attention-guide'; group.add(attention);
  const globeOutline = new THREE.Mesh(new THREE.RingGeometry(RADIUS + .09, RADIUS + .135, 160), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .86, side: THREE.DoubleSide, depthWrite: false }));
  globeOutline.userData.kind = 'narration-globe-outline'; group.add(globeOutline);
  const penTip = new THREE.Mesh(new THREE.SphereGeometry(.047, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffecc0 }));
  penTip.userData.kind = 'narration-pen-tip'; group.add(penTip);
  let attentionKey = '', attentionStrokes: SurfaceStroke[] = [];
  const aliases: Record<string, string[]> = {
    globe: ['earth'], atmosphere: ['earth-atmosphere'], ocean: ['indian-ocean', 'pacific-ocean'],
    latitude: ['earth-equator', 'earth-tropic', 'tibet'], zones: ['earth-tropic', 'earth-temperate', 'tibet'],
  };
  const guideTargets = (ids: string[]) => [...new Set(ids.flatMap(id => aliases[id] ?? [id]))];
  const attentionAnchor = (id: string) => callouts.find(callout => callout.id === id)?.anchor;
  const rebuildAttention = (ids: string[], connect: boolean) => {
    attention.children.forEach(child => {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      mesh.geometry.dispose(); mesh.material.dispose();
    });
    attention.clear(); attentionStrokes = [];
    const anchors = ids.map(id => attentionAnchor(id)).filter((value): value is THREE.Vector3 => !!value);
    for (const anchor of anchors) {
      const normal = anchor.clone().normalize(), east = new THREE.Vector3(0, 1, 0).cross(normal).normalize(), north = normal.clone().cross(east).normalize();
      for (let corner = 0; corner < 4; corner++) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 14; i++) {
          const angle = corner * Math.PI / 2 + .15 + i / 14 * .58;
          points.push(anchor.clone().addScaledVector(east, Math.cos(angle) * .28).addScaledVector(north, Math.sin(angle) * .28).setLength(RADIUS + .085));
        }
        const stroke = surfaceStroke(points, GOLD, 1.8); stroke.mesh.userData.kind = 'narration-focus-bracket'; attention.add(stroke.mesh); attentionStrokes.push(stroke);
      }
    }
    if (connect) for (let index = 1; index < anchors.length; index++) {
      const a = anchors[index - 1].clone().normalize(), b = anchors[index].clone().normalize(), angle = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
      if (angle < .015) continue;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 90; i++) {
        const fraction = i / 90, denominator = Math.sin(angle);
        const point = a.clone().multiplyScalar(Math.sin((1 - fraction) * angle) / denominator).addScaledVector(b, Math.sin(fraction * angle) / denominator);
        points.push(point.setLength(RADIUS + .09));
      }
      const stroke = surfaceStroke(points, TEAL, 2); stroke.mesh.userData.kind = 'narration-attention-link'; stroke.mesh.userData.scope = 'presentation-guide-not-route'; attention.add(stroke.mesh); attentionStrokes.push(stroke);
    }
  };

  const ring = new THREE.Mesh(new THREE.RingGeometry(.10, .12, 44), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide }));
  ring.position.copy(latLon(31.1, 88.6, RADIUS + .067)); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.position.clone().normalize()); group.add(ring);
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), cameraDirection = new THREE.Vector3(), worldPoint = new THREE.Vector3(), screenPosition = new THREE.Vector3();
  let previousLayer = '', previousView = '',rotationCameraKey='';
  const focusLayer = (layer: string) => {
    const view: Record<string, [number, number, number]> = {
      globe: [17, 104, 12.7], asia: [25, 100, 10.5], china: [34, 103, 8.4], tibet: [32, 91, 6.9],
      'earth-system': [4, 55, 14.5], 'earth-heating': [17, 103, 16.6], 'earth-circulation': [10, 102, 15.7], 'earth-contrasts': [13, 52, 14.5],
      surroundings: [20, 89, 10.7], plateau: [34, 89, 6.9], moisture: [19, 84, 9.6], latitude: [25, 100, 11], zones: [20, 100, 12.3],
    };
    const target = view[layer]; if (target) runtime.focus(latLon(target[0], target[1], target[2]), new THREE.Vector3());
  };
  return {
    group,ready:Promise.all([textureReady,boundariesReady,foundations.ready]),
    dispose: () => { alive = false; foundations.dispose(); },
    update: (p: TibetSceneProps, _time: number, _dt: number) => {
      const layer = canonicalLayer(p.layer);
      const foundation = isEarthFoundation(layer); foundations.update(p);
      rotationFlow.update(p.rotationFlow);if(p.rotationFlow)foundations.group.visible=false;
      if(foundation)for(const callout of callouts){const anchor=rotationFlow.anchor(callout.id)??foundations.anchor(callout.id);if(anchor){callout.anchor.copy(anchor);callout.pin.position.copy(anchor);}}
      const guide = p.guide, guided = !!guide?.active;
      const targets = guided ? guideTargets(guide.targets) : [], targetSet = new Set(targets);
      const inkProgress = guided ? THREE.MathUtils.clamp(guide.drawProgress, 0, 1) : 0;
      // Moving air/water examples use a leader attached to their actual body;
      // a surface bracket must not project them back down onto the globe.
      const attentionTargets=targets.filter(id=>!id.startsWith('rotation-')&&!['earth-vapour','circulation-cooling','circulation-cloud'].includes(id));
      const nextAttentionKey = `${attentionTargets.join('|')}:${guide?.relation ?? 'focus'}`;
      if (nextAttentionKey !== attentionKey) { attentionKey = nextAttentionKey; rebuildAttention(attentionTargets, guide?.relation === 'sequence'); }
      attention.visible = guided;
      attentionStrokes.forEach(stroke => revealStroke(stroke, inkProgress));
      globeOutline.visible = guided && targetSet.has('earth');
      globeOutline.quaternion.copy(runtime.camera.quaternion);
      globeOutline.geometry.setDrawRange(0, Math.floor(160 * inkProgress) * 6);
      penTip.visible = false;
      for (const [id, boundary] of [['china', china], ['tibet', tibet], ['plateau', plateau]] as const) {
        const strokes: SurfaceStroke[] = [];
        boundary.traverse(child => { const stroke = sourceStrokes.get(child); if (stroke) strokes.push(stroke); });
        const total = strokes.reduce((sum, stroke) => sum + stroke.count, 0);
        let start = 0;
        for (const stroke of strokes) {
          const fraction = (inkProgress * total - start) / stroke.count;
          stroke.mesh.visible = guided && targetSet.has(id);
          revealStroke(stroke, fraction);
          if (stroke.mesh.visible && fraction > 0 && fraction <= 1) {
            const sample = fraction * (stroke.points.length - 1), index = Math.min(stroke.points.length - 2, Math.floor(sample));
            penTip.position.copy(stroke.points[index]).lerp(stroke.points[index + 1], sample - index); penTip.visible = true;
          }
          start += stroke.count;
        }
      }
      const view = p.viewKey ?? `${p.scene}:${p.step}`;
      const restoringView = view !== previousView && runtime.hasSavedView(view);
      // The old G1 cache may contain a close Tibet camera. Foundation entries
      // establish a whole-Earth frame before any subsequent manual exploration.
      if (layer !== previousLayer) { previousLayer = layer; if (!p.rotationFlow&&(foundation || !restoringView)) focusLayer(layer); }
      previousView = view;
      if(p.rotationFlow){
        const state=p.rotationFlow,key=JSON.stringify([state.cameraMix,state.arrivalProgress,p.resetKey,runtime.camera.aspect]);
        if(key!==rotationCameraKey){
          rotationCameraKey=key;
          const pose=rotationFlowCamera(state);
          (runtime.focusRecorded??runtime.focus)(pose.position,pose.target);
        }
      }else rotationCameraKey='';
      china.visible = !foundation && (targetSet.has('china') || ['asia', 'china', 'tibet', 'latitude', 'zones'].includes(layer)); tibet.visible = !foundation && (targetSet.has('tibet') || !['home', 'globe'].includes(layer));
      plateau.visible = !foundation && (targetSet.has('plateau') || ['plateau', 'tibet'].includes(layer)); grid.visible = layer === 'latitude' || layer === 'zones'; zones.visible = layer === 'zones';
      relationshipFlows.visible = layer === 'moisture'; runtime.sun.position.set(-4, 8, -11);
      if(foundation)runtime.sun.position.copy(latLon(18,54,15));
      for (const flow of flows) {
        const emphasized = guided && targetSet.has(flow.id), segments = emphasized ? Math.floor(80 * inkProgress) : 80;
        flow.ink.geometry.setDrawRange(0, segments * 5 * 6);
        flow.ink.material.opacity = guided ? (emphasized ? 1 : .18) : .88;
        flow.particles.forEach((particle, index) => {
          // Both narration and manual silent playback have a single explicit
          // progress clock. Pausing never leaves a wall-clock particle running.
          const fraction = emphasized ? (inkProgress * (index + 1) / flow.particles.length) : (p.progress * 1.8 + index / flow.particles.length) % 1;
          particle.visible = !guided || emphasized && inkProgress > .02;
          particle.position.copy(flow.curve.getPointAt(fraction)); particle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), flow.curve.getTangentAt(fraction).normalize());
        });
      }
      ring.scale.setScalar(targetSet.has('tibet') ? 1.3 : 1); ring.visible = layer !== 'home' && !foundation;
      runtime.renderer.getSize(viewport); cameraDirection.copy(runtime.camera.position).normalize();
      const focalLength = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      runtime.camera.updateMatrixWorld();
      if (guided) {
        attentionStrokes.forEach(stroke => fitStrokeWidth(stroke, runtime.camera, focalLength));
        for (const boundary of [china, tibet, plateau]) boundary.traverse(child => {
          const stroke = sourceStrokes.get(child); if (stroke?.mesh.visible) fitStrokeWidth(stroke, runtime.camera, focalLength);
        });
        if (penTip.visible) {
          const depth = Math.max(.01, -penTip.position.clone().applyMatrix4(runtime.camera.matrixWorldInverse).z);
          penTip.scale.setScalar(2.2 * depth / (Math.max(1, focalLength) * .047));
        }
      }
      const occupied: { x: number; y: number; w: number; h: number }[] = [];
      const mobile = viewport.x < 550, labelHeight = mobile ? 24 : 27;
      // The two outside relationships are the explanation target in this view;
      // give them layout space before secondary geographic labels.
      const guidedCallouts = new Map(targets.map(id => [id, callouts.find(callout => callout.id === id && callout.layers.includes(layer)) ?? callouts.find(callout => callout.id === id)]));
      const priority=(callout:Callout)=>guidedCallouts.get(callout.id)===callout?-2:callout.id==='tibet'?0:callout.id===p.selected?1:callout.text.startsWith('西侧环流')?2:callout.text.startsWith('南侧水汽')?3:callout.id==='china'?4:callout.id==='himalaya'?5:6;
      const visibleCallouts=[...callouts].sort((a,b)=>priority(a)-priority(b));
      for (const callout of visibleCallouts) {
        const facing = callout.anchor.clone().normalize().dot(cameraDirection);
        const emphasized = guidedCallouts.get(callout.id) === callout;
        const enabled = (!callout.id.startsWith('rotation-')||!!p.rotationFlow) && (callout.layers.includes(layer) || emphasized) && facing > (callout.foundation ? .07 : .3) && (emphasized||!callout.show || callout.show(p)) && (!foundation || callout.foundation===true)&&(!foundation||!guided||emphasized);
        callout.sprite.visible = enabled; callout.leader.visible = enabled;
        callout.pin.visible = enabled;
        callout.pin.scale.setScalar(emphasized ? 2.1 : callout.id === p.selected ? 1.45 : 1);
        (callout.pin.material as THREE.MeshBasicMaterial).color.set(emphasized || callout.id === 'tibet' ? GOLD : 0xb7e3e2);
        (callout.sprite.material as THREE.SpriteMaterial).color.set(emphasized ? 0xffe0a0 : 0xffffff);
        (callout.sprite.material as THREE.SpriteMaterial).opacity = guided && !emphasized ? .7 : 1;
        const leaderMaterial = callout.leader.material as THREE.LineBasicMaterial;
        leaderMaterial.color.set(emphasized ? GOLD : callout.id === 'tibet' ? GOLD : 0x8fc8ce);
        leaderMaterial.opacity = guided ? (emphasized ? 1 : .3) : .8;
        if (!enabled) continue;
        projected.copy(callout.anchor).project(runtime.camera);
        const anchorX = (projected.x + 1) * viewport.x / 2, anchorY = (1 - projected.y) * viewport.y / 2;
        if (projected.z > 1 || anchorX < -15 || anchorX > viewport.x + 15 || anchorY < -15 || anchorY > viewport.y + 15) { callout.sprite.visible = callout.leader.visible = false; continue; }
        const width = callout.width * (mobile ? .88 : 1), padding = 18, minimumY = layer === 'home' ? 45 : 112;
        const bottomReserve = foundation ? (mobile ? 210 : 235) : layer === 'moisture' ? (mobile ? 214 : 194) : (mobile ? 182 : 140);
        const maximumY=Math.max(minimumY,viewport.y-bottomReserve),minimumX=width/2+padding,maximumX=viewport.x-width/2-padding;
        const preferredX=THREE.MathUtils.clamp(anchorX+callout.offset[0],minimumX,maximumX),preferredY=THREE.MathUtils.clamp(anchorY+callout.offset[1],minimumY,maximumY);
        const candidates:{x:number;y:number;cost:number}[]=[];
        const addCandidate=(x:number,y:number)=>{if(occupied.some(box=>Math.abs(x-box.x)<(width+box.w)/2+8&&Math.abs(y-box.y)<(labelHeight+box.h)/2+6))return;candidates.push({x,y,cost:(x-preferredX)**2+(y-preferredY)**2});};
        addCandidate(preferredX,preferredY);
        for(let y=minimumY;y<=maximumY;y+=labelHeight+8)for(const x of [preferredX,minimumX,viewport.x/2,maximumX])addCandidate(x,y);
        if(!candidates.length){callout.sprite.visible=callout.leader.visible=false;continue;}
        candidates.sort((a,b)=>a.cost-b.cost);const {x,y}=candidates[0];
        occupied.push({ x, y, w: width, h: labelHeight });
        screenPosition.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera);
        callout.sprite.position.copy(screenPosition);
        const distance = screenPosition.distanceTo(runtime.camera.position), height = labelHeight * distance / focalLength;
        callout.sprite.scale.set(height * width / labelHeight, height, 1);
        worldPoint.copy(callout.anchor);
        const positions = callout.leader.geometry.attributes.position as THREE.BufferAttribute;
        if (emphasized) screenPosition.copy(worldPoint).lerp(screenPosition, Math.min(1, inkProgress * 2));
        positions.setXYZ(0, worldPoint.x, worldPoint.y, worldPoint.z); positions.setXYZ(1, screenPosition.x, screenPosition.y, screenPosition.z); positions.needsUpdate = true;
        callout.leader.geometry.computeBoundingSphere();
      }
    },
  };
}
