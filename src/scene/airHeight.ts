import * as THREE from 'three';
import { disposeTree, label, line, mineralTexture } from './environment';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera };
type Layer = 'temperature' | 'parcel' | 'wind';
type Callout = {
  id: string; text: string; anchor: THREE.Vector3; sprite: THREE.Sprite; leader: THREE.Line;
  offset: [number, number]; layers: Layer[]; show: (progress: number) => boolean;
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const WARM = 0xedbb7d, COOL = 0x81c8df, AIR = 0x98dce0;
const slope = (x: number, z: number) => .45 + 3.5 * THREE.MathUtils.smoothstep(x, -5.2, 5.2) +
  .16 * Math.sin(x * 1.3 + z * .8) ** 2 + .25 * Math.exp(-((x - 3.3) ** 2 / 3 + (z + 1.3) ** 2 / 2));
const parcelPoint = (progress: number) => {
  const x = -5.6 + 10.4 * progress;
  return V(x, slope(x, .7) + .83 + progress * .4, .7);
};

export function airHeightPhase(progress: number) {
  if (progress < .25) return { id: 'near-surface', title: '低处：先辨认空气团与周围空气' };
  if (progress < .7) return { id: 'ascending', title: '上升：外部气压降低，空气团膨胀冷却' };
  return { id: 'higher', title: '高处：空气团过程仍需与环境状态分开' };
}

/** Conceptual unsaturated parcel ascent, not a sounding or Tibet forecast.
 * NOAA: https://www.noaa.gov/jetstream/clouds/how-clouds-form
 * NOAA: https://www.noaa.gov/jetstream/upperair/parcel-theory
 * The prescribed slope motion stands for forced lifting, not free buoyancy.
 * Volume, colour, pressure-arrow length and the surrounding profile are
 * qualitative. Condensation, mixing and inversions need separate observations.
 */
export function buildAirHeightScene(runtime: Runtime) {
  const group = new THREE.Group();
  const texture = mineralTexture(); texture.repeat.set(6, 3);
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x9eaa88, map: texture, bumpMap: texture, bumpScale: .035, roughness: .97, side: THREE.DoubleSide });
  function groundPart(z: number) {
    const geometry = new THREE.PlaneGeometry(15.6, 3, 100, 22); geometry.rotateX(-Math.PI / 2); geometry.translate(0, 0, z);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setY(i, slope(positions.getX(i), positions.getZ(i)));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, terrainMaterial); mesh.receiveShadow = true; mesh.castShadow = true; group.add(mesh); return mesh;
  }
  groundPart(-1.5); const frontGround = groundPart(1.5);
  const sectionPositions: number[] = [];
  for (let i = 0; i < 100; i++) {
    const a = -7.8 + i / 100 * 15.6, b = -7.8 + (i + 1) / 100 * 15.6;
    sectionPositions.push(a, -.6, 0, b, -.6, 0, a, slope(a, 0), 0,
      b, -.6, 0, b, slope(b, 0), 0, a, slope(a, 0), 0);
  }
  const sectionGeometry = new THREE.BufferGeometry(); sectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sectionPositions, 3)); sectionGeometry.computeVertexNormals();
  const section = new THREE.Mesh(sectionGeometry, new THREE.MeshStandardMaterial({ color: 0xa18c6d, map: texture, roughness: .98, side: THREE.DoubleSide }));
  section.name = 'height-terrain-section'; group.add(section);
  const frontRim = line(Array.from({ length: 101 }, (_, i) => V(-7.8 + i / 100 * 15.6, slope(-7.8 + i / 100 * 15.6, 0) + .015, 0)), 0xc8c5a1, .75); group.add(frontRim);
  const baseOutline = line([V(-7.8, -.6, 0), V(7.8, -.6, 0)], 0xab9b7c, .5); group.add(baseOutline);

  const lowPoint = V(-5.6, slope(-5.6, 1.6) + .08, 1.6), highPoint = V(4.8, slope(4.8, 1.6) + .08, 1.6);
  const groundMarkers: THREE.Group[] = [];
  for (const [id, point, color] of [['height-low', lowPoint, WARM], ['height-high', highPoint, COOL]] as const) {
    const marker = new THREE.Group(); marker.userData.selectId = marker.userData.guideId = id; marker.userData.guideAnchor = V(0, .12, 0); marker.position.copy(point); group.add(marker);
    const halo = new THREE.Mesh(new THREE.RingGeometry(.27, .35, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: .85 })); halo.rotation.x = -Math.PI / 2; marker.add(halo);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), new THREE.MeshBasicMaterial({ color })); pin.position.y = .12; marker.add(pin); groundMarkers.push(marker);
  }
  const heightReference = new THREE.Group(); heightReference.name = 'height-fixed-environment'; heightReference.userData.selectId = 'height-environment'; group.add(heightReference);
  const referenceX = -7.15, referenceZ = -2.1;
  heightReference.userData.guideId = 'height-environment'; heightReference.userData.guideAnchor = V(referenceX, 4.3, referenceZ);
  const referenceLine = line([V(referenceX, .6, referenceZ), V(referenceX, 6.7, referenceZ)], AIR, .65); heightReference.add(referenceLine);
  const referenceColors = [0xe7b581, 0xadc8bc, 0x7bbbd5];
  const airSheets: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const y = 1.3 + i * 2.25;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.28, .04, 8, 32), new THREE.MeshBasicMaterial({ color: referenceColors[i] })); ring.position.set(referenceX, y, referenceZ); ring.rotation.x = Math.PI / 2; heightReference.add(ring);
    heightReference.add(line([V(referenceX - .3, y, referenceZ), V(referenceX + .55, y, referenceZ)], referenceColors[i], .8));
    const material = new THREE.MeshBasicMaterial({ color: referenceColors[i], transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 5.6), material); sheet.rotation.x = -Math.PI / 2; sheet.position.y = y; sheet.userData.selectId = 'height-environment'; group.add(sheet); airSheets.push(sheet);
    // Horizontal reference lines are clipped above the terrain, so a low
    // atmosphere level cannot be read as a buried geological layer.
    const linePoints: THREE.Vector3[] = [];
    for (let j = 0; j <= 100; j++) {
      const x = -7.6 + j / 100 * 15.2;
      if (slope(x, -2.8) < y) linePoints.push(V(x, y, -2.8));
    }
    if (linePoints.length > 1) heightReference.add(line(linePoints, referenceColors[i], .3, true));
  }

  const parcel = new THREE.Group(); parcel.name = 'height-moving-parcel'; parcel.userData.selectId = parcel.userData.guideId = 'height-parcel'; parcel.userData.guideAnchor = V(0, 0, 0); group.add(parcel);
  const parcelMaterial = new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: .2, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(.64, 36, 24), parcelMaterial); parcel.add(shell);
  const haloMaterial = new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: .83 });
  for (const rotation of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.66, .021, 8, 56), haloMaterial); ring.rotation.set(rotation[0], rotation[1], rotation[2]); parcel.add(ring);
  }
  const particles: THREE.Mesh[] = [];
  const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xf9e3bb, transparent: true, opacity: .85 });
  const particleGeometry = new THREE.SphereGeometry(.041, 8, 6);
  for (let i = 0; i < 24; i++) {
    const theta = i * 2.39996, radius = .44 * Math.cbrt((i + 1) / 24), y = 1 - 2 * ((i + .5) / 24);
    const particle = new THREE.Mesh(particleGeometry, particleMaterial); particle.position.set(radius * Math.sqrt(1 - y * y) * Math.cos(theta), radius * y, radius * Math.sqrt(1 - y * y) * Math.sin(theta)); parcel.add(particle); particles.push(particle);
  }
  const initialParcel = new THREE.Mesh(new THREE.SphereGeometry(.64, 24, 16), new THREE.MeshBasicMaterial({ color: WARM, wireframe: true, transparent: true, opacity: .18, depthWrite: false }));
  initialParcel.name = 'height-parcel-origin'; initialParcel.position.copy(parcelPoint(0)); initialParcel.userData.selectId = 'height-low'; group.add(initialParcel);
  const pressure = new THREE.Group(); pressure.name = 'height-surrounding-pressure'; pressure.userData.selectId = 'height-parcel'; group.add(pressure);
  const pressureArrows: { group: THREE.Group; direction: THREE.Vector3 }[] = [];
  const pressureMaterial = new THREE.MeshBasicMaterial({ color: 0xc8e0e2, transparent: true, opacity: .73 });
  for (const direction of [V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)]) {
    const arrow = new THREE.Group();
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 10), pressureMaterial); tip.quaternion.setFromUnitVectors(V(0, 1, 0), direction.clone().negate()); arrow.add(tip);
    const shaft = line([direction.clone().multiplyScalar(.1), direction.clone().multiplyScalar(.6)], 0xc8e0e2, .65); arrow.add(shaft); pressure.add(arrow); pressureArrows.push({ group: arrow, direction });
  }
  const route = new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, i) => parcelPoint(i / 20)));
  const wind = new THREE.Group(); wind.userData.selectId = 'height-parcel'; group.add(wind);
  const path = line(route.getPoints(100), AIR, .55, true); wind.add(path);
  const trail = line(route.getPoints(100), 0xdfc486, .88); wind.add(trail);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.13, .32, 12), new THREE.MeshBasicMaterial({ color: AIR })); wind.add(tip);
  const flowPositions = new Float32Array(12 * 3), flowGeometry = new THREE.BufferGeometry(); flowGeometry.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3));
  const flowDots = new THREE.Points(flowGeometry, new THREE.PointsMaterial({ color: AIR, size: .075, transparent: true, opacity: .82, depthWrite: false })); wind.add(flowDots);

  const callouts: Callout[] = [];
  function callout(id: string, text: string, anchor: THREE.Vector3, offset: [number, number], layers: Layer[], color = '#e2e8dc', show = (_progress: number) => true) {
    const sprite = label(text, color), leader = line([anchor.clone(), anchor.clone()], 0xb9c9ca, .48);
    sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; sprite.onBeforeRender = () => {}; sprite.renderOrder = 13; leader.renderOrder = 12;
    group.add(sprite, leader); const item = { id, text, anchor, offset, layers, show, sprite, leader }; callouts.push(item); return item;
  }
  callout('height-low', '较低处 · 高度参照', lowPoint, [-32, 28], ['temperature', 'wind'], '#efd0a1');
  callout('height-high', '较高处 · 高度参照', highPoint, [20, -26], ['temperature', 'wind'], '#b0dce9');
  callout('height-environment', '周围空气 · 独立状态参照', V(referenceX, 4.3, referenceZ), [-35, -25], ['temperature', 'parcel', 'wind'], '#c7dfdf');
  const initialCallout = callout('height-parcel', '同一空气团 · 抬升起点', parcelPoint(0), [35, -38], ['temperature', 'parcel', 'wind'], '#eacda7', progress => progress <= .01);
  const parcelCallout = callout('height-parcel', '同一空气团 · 沿坡上升', parcelPoint(0), [35, -38], ['temperature', 'wind'], '#eacda7', progress => progress > .01);
  const coolingCallout = callout('height-parcel', '空气团膨胀 · 定性冷却', parcelPoint(0), [28, -36], ['parcel'], '#b8dfea', progress => progress > .01);
  const pressureCallout = callout('height-parcel', '外部气压随高度降低', parcelPoint(0), [-45, 35], ['parcel'], '#c7dcdf');
  const legend = label('光轮：移动空气团　分层：周围空气参照', '#c9dcdb'); legend.onBeforeRender = () => {}; legend.renderOrder = 13; group.add(legend);
  const note = label('概念示意 · 颜色和体积不代表测量值', '#b8c8cb'); note.onBeforeRender = () => {}; note.renderOrder = 13; group.add(note);
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screen = new THREE.Vector3(), tangent = new THREE.Vector3(), point = new THREE.Vector3();
  const cool = new THREE.Color(COOL), up = V(0, 1, 0);

  return {
    group,
    update: (p: TibetSceneProps, _time: number, _dt: number) => {
      const progress = THREE.MathUtils.clamp(p.progress, 0, 1), layer: Layer = p.layer === 'parcel' || p.layer === 'wind' ? p.layer : 'temperature';
      const radiusScale = 1 + .55 * progress;
      parcel.position.copy(parcelPoint(progress)); parcel.scale.setScalar(radiusScale);
      parcelMaterial.color.set(WARM).lerp(cool, progress); haloMaterial.color.copy(parcelMaterial.color);
      parcelMaterial.opacity = p.selected === 'height-parcel' ? .34 : .19; haloMaterial.opacity = p.selected === 'height-parcel' ? 1 : .82;
      particleMaterial.color.set(0xf9e3bb).lerp(cool, progress * .8);
      initialParcel.visible = layer === 'parcel' && progress > .08;
      pressure.position.copy(parcel.position); pressure.visible = layer === 'parcel';
      pressureArrows.forEach(arrow => {
        arrow.group.position.copy(arrow.direction).multiplyScalar(.64 * radiusScale + .2);
        arrow.group.scale.setScalar(1 - progress * .6);
      });
      groundMarkers.forEach((marker, i) => marker.scale.setScalar(p.selected === (i ? 'height-high' : 'height-low') ? 1.3 : 1));
      frontGround.visible = !p.cutaway; section.visible = frontRim.visible = baseOutline.visible = p.cutaway;
      airSheets.forEach(sheet => { sheet.visible = !p.cutaway && layer === 'temperature'; });
      (referenceLine.material as THREE.LineBasicMaterial).opacity = p.selected === 'height-environment' ? 1 : .65;
      // Keep the stationary height reference beside the moving parcel in every
      // layer. Temperature sheets remain exclusive to the height/environment
      // layer; an airflow view therefore cannot erase the comparison subject.
      heightReference.visible = true;
      wind.visible = layer === 'wind' || layer === 'temperature';
      path.visible = layer === 'wind'; trail.geometry.setDrawRange(0, Math.max(2, Math.ceil(progress * 100) + 1));
      route.getPoint(Math.min(1, progress + .075), tip.position); route.getTangent(Math.min(1, progress + .075), tangent); tip.quaternion.setFromUnitVectors(up, tangent.normalize());
      tip.visible = layer === 'wind'; flowDots.visible = layer === 'wind';
      for (let i = 0; i < 12; i++) {
        route.getPoint(Math.max(0, progress - i / 12 * .36), point); flowPositions[i * 3] = point.x; flowPositions[i * 3 + 1] = point.y; flowPositions[i * 3 + 2] = point.z;
      }
      flowGeometry.attributes.position.needsUpdate = true; flowGeometry.computeBoundingSphere();
      initialCallout.anchor.copy(parcel.position); parcelCallout.anchor.copy(parcel.position); coolingCallout.anchor.copy(parcel.position); pressureCallout.anchor.copy(parcel.position).add(V(-.9 * radiusScale, -.1, .2));
      runtime.renderer.getSize(viewport); if (viewport.x < 1 || viewport.y < 1) return;
      const mobile = viewport.x < 550, pixelHeight = mobile ? 22 : 25;
      const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const occupied: { x: number; y: number; width: number }[] = [84, 125, 166].map(y => ({ x: viewport.x - 35, y, width: 58 }));
      if (!mobile) occupied.push({ x: 125, y: 112, width: 230 });
      const topBound = mobile ? 110 : Math.min(103, viewport.y * .2), bottomBound = Math.max(topBound + pixelHeight, viewport.y - (mobile ? 105 : 274));
      const sorted = [...callouts].sort((a, b) => Number(b.id === p.selected) - Number(a.id === p.selected));
      for (const item of sorted) {
        item.sprite.visible = item.leader.visible = item.layers.includes(layer) && item.show(progress) && (!p.guide?.active || p.guide.targets.includes(item.id));
        if (!item.sprite.visible) continue;
        projected.copy(item.anchor).project(runtime.camera);
        if (projected.z > 1 || projected.z < -1) { item.sprite.visible = item.leader.visible = false; continue; }
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        const width = Math.min(viewport.x - 30, item.text.length * (mobile ? 10 : 11) + 24);
        const initialX = THREE.MathUtils.clamp(ax + item.offset[0], width / 2 + 12, viewport.x - width / 2 - 12), initialY = THREE.MathUtils.clamp(ay + item.offset[1], topBound, bottomBound);
        const candidates: { x: number; y: number; cost: number }[] = [];
        for (const x of [initialX, viewport.x / 2, width / 2 + 12, viewport.x - width / 2 - 12]) {
          for (let y = topBound; y <= bottomBound; y += pixelHeight + 7) {
            if (!occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 6 && Math.abs(y - box.y) < pixelHeight + 6)) candidates.push({ x, y, cost: (x - initialX) ** 2 + (y - initialY) ** 2 });
          }
        }
        if (!candidates.length) { item.sprite.visible = item.leader.visible = false; continue; }
        candidates.sort((a, b) => a.cost - b.cost); const { x, y } = candidates[0]; occupied.push({ x, y, width });
        screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera); item.sprite.position.copy(screen);
        const h = pixelHeight * screen.distanceTo(runtime.camera.position) / focal; item.sprite.scale.set(h * width / pixelHeight, h, 1);
        const leaderPositions = item.leader.geometry.attributes.position as THREE.BufferAttribute; leaderPositions.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z); leaderPositions.setXYZ(1, screen.x, screen.y, screen.z); leaderPositions.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      for (const [sprite, offset, width] of [[legend, 244, mobile ? 335 : 365], [note, 217, mobile ? 300 : 330]] as const) {
        sprite.visible = !mobile;
        screen.set(0, 1 - Math.max(32, viewport.y - offset) / viewport.y * 2, .55).unproject(runtime.camera); sprite.position.copy(screen);
        const h = 22 * screen.distanceTo(runtime.camera.position) / focal; sprite.scale.set(h * Math.min(viewport.x - 24, width) / 22, h, 1);
      }
    },
    dispose: () => disposeTree(group),
  };
}
