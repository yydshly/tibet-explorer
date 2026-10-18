import * as THREE from 'three';
import { label, line, mineralTexture } from './environment';
import type { TibetSceneProps } from './TibetScene';

import {mountainCloudState, type AirMoisture} from '../lib/waterProcess';
export {mountainCloudState,cloudPhase} from '../lib/waterProcess';
export type {AirMoisture} from '../lib/waterProcess';

type CloudProps = TibetSceneProps & { airMoisture?: AirMoisture };
type Runtime = { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera };
type CloudLayer = 'wind' | 'rain' | 'water';
type Annotation = {
  id: string; text: string; sprite: THREE.Sprite; leader: THREE.Line;
  anchor: THREE.Vector3; offset: [number, number]; visible: (state: CloudState, layer: CloudLayer) => boolean;
};
type CloudState = ReturnType<typeof mountainCloudState>;
const smooth = THREE.MathUtils.smoothstep, clamp = THREE.MathUtils.clamp;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const GOLD = 0xe8cd91, AIR = 0x78d7d6, WATER = 0x89cdf6;
const hash = (value: number) => { const n = Math.sin(value * 127.13 + 8.73) * 43758.5453; return n - Math.floor(n); };
const surfaceHeight = (x: number, z: number) => .34 +
  3.05 * Math.exp(-(((x - .65) / 2.12) ** 2)) * (.93 + .12 * Math.sin(z * 1.27 + .4) ** 2) +
  .72 * Math.exp(-(((x + 1.8) / 3.6) ** 2)) + .14 * Math.sin(x * 1.3 + z * 1.15) ** 2;

function slopeSurface(fromZ: number, toZ: number, texture: THREE.Texture) {
  const geometry = new THREE.PlaneGeometry(14, toZ - fromZ, 96, 24); geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i) + (fromZ + toZ) / 2;
    positions.setXYZ(i, x, surfaceHeight(x, z), z);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x9f9c79, map: texture, bumpMap: texture, bumpScale: .045, roughness: .98, side: THREE.DoubleSide }));
  mesh.receiveShadow = true; mesh.castShadow = true; return mesh;
}

function soilWall(z: number, texture: THREE.Texture) {
  const positions: number[] = [];
  for (let i = 0; i < 96; i++) {
    const a = -7 + i / 96 * 14, b = -7 + (i + 1) / 96 * 14;
    positions.push(a, -.8, z, b, -.8, z, a, surfaceHeight(a, z), z,
      b, -.8, z, b, surfaceHeight(b, z), z, a, surfaceHeight(a, z), z);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x8b7355, map: texture, roughness: 1, side: THREE.DoubleSide }));
}

function cloudTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 12, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(225,240,242,.9)'); gradient.addColorStop(.45, 'rgba(217,236,239,.7)'); gradient.addColorStop(1, 'rgba(218,238,242,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** Principle transect inspired by NWS/NOAA descriptions, not a mapped Tibet
 * valley or an atmosphere simulation. Only the shared progress drives motion.
 * Sources: https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm
 * https://www.gfdl.noaa.gov/clouds-and-convection/
 * https://www.noaa.gov/education/resource-collections/freshwater/water-cycle
 */
export function buildMountainCloudScene(runtime: Runtime) {
  const group = new THREE.Group(), ground = new THREE.Group(), section = new THREE.Group(); group.add(ground, section);
  group.name = 'mountain-cloud-process';
  const texture = mineralTexture(); texture.repeat.set(5, 3);
  const rearSurface = slopeSurface(-2.8, 0, texture), frontSurface = slopeSurface(0, 2.8, texture); rearSurface.name = 'fixed-mountain-rear'; frontSurface.name = 'fixed-mountain-front'; ground.add(rearSurface, frontSurface);
  const block = new THREE.Mesh(new THREE.BoxGeometry(14, 1.12, 5.6), new THREE.MeshStandardMaterial({ color: 0x615a43, map: texture, roughness: 1 }));
  block.position.y = -.3; ground.add(block);
  const frontWall = soilWall(2.8, texture), cutWall = soilWall(.012, texture); ground.add(frontWall); section.add(cutWall);
  const sectionFloor = new THREE.Mesh(new THREE.BoxGeometry(14, 1.12, 2.8), block.material); sectionFloor.position.set(0, -.3, -1.4); section.add(sectionFloor);
  section.userData.selectId = 'cloud-runoff';
  for (const y of [-.5, -.1, .25]) section.add(line([V(-7, y, .02), V(7, y, .02)], 0xb19b77, .35));

  // The parcel centre tracks an air path above the same fixed mountain in
  // both moisture comparisons. Its expansion and cooling are made visible.
  const airCurve = new THREE.CatmullRomCurve3([V(-7, 1.17, -.35), V(-4.4, 1.35, -.35), V(-2.8, 2.25, -.35), V(-1.1, 4.35, -.35), V(.4, 5.3, -.35), V(2.5, 4.88, -.35)]);
  const airPath = line(airCurve.getPoints(110), GOLD, .64); airPath.userData.selectId = 'cloud-lift'; group.add(airPath);
  const airGhost = line(airCurve.getPoints(110), 0x628184, .35, true); group.add(airGhost);
  const parcel = new THREE.Group(); parcel.name = 'rising-parcel'; parcel.userData.selectId = 'cloud-lift'; group.add(parcel);
  parcel.userData.guideId = 'cloud-lift'; parcel.userData.guideAnchor = V(0, 0, 0);
  const parcelMaterial = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .11, depthWrite: false });
  const parcelSphere = new THREE.Mesh(new THREE.SphereGeometry(.48, 28, 20), parcelMaterial); parcel.add(parcelSphere);
  const parcelWireMaterial = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: .72 });
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(.485, 12, 8)), parcelWireMaterial); parcel.add(wire);
  const vapourGeometry = new THREE.BufferGeometry(), vapourPositions = new Float32Array(32 * 3);
  for (let i = 0; i < 32; i++) {
    const radius = .35 * Math.cbrt(hash(i + 14)), theta = hash(i + 49) * Math.PI * 2, vertical = hash(i + 119) * 2 - 1, horizontal = Math.sqrt(1 - vertical * vertical);
    vapourPositions.set([radius * horizontal * Math.cos(theta), radius * vertical, radius * horizontal * Math.sin(theta)], i * 3);
  }
  vapourGeometry.setAttribute('position', new THREE.BufferAttribute(vapourPositions, 3));
  const vapour = new THREE.Points(vapourGeometry, new THREE.PointsMaterial({ color: AIR, size: .085, transparent: true, opacity: .85, depthWrite: false })); vapour.name = 'vapour-symbols'; parcel.add(vapour);
  const airTip = new THREE.Mesh(new THREE.ConeGeometry(.13, .4, 12), new THREE.MeshBasicMaterial({ color: GOLD })); airTip.userData.selectId = 'cloud-inflow'; group.add(airTip);
  airTip.userData.guideId = 'cloud-inflow'; airTip.userData.guideAnchor = V(0, 0, 0);
  const trailPositions = new Float32Array(18 * 3), trailGeometry = new THREE.BufferGeometry(); trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trail = new THREE.Points(trailGeometry, new THREE.PointsMaterial({ color: GOLD, size: .064, transparent: true, opacity: .67, depthWrite: false })); trail.userData.selectId = 'cloud-inflow'; group.add(trail);

  const cloudGroup = new THREE.Group(); cloudGroup.name = 'conditional-cloud'; cloudGroup.userData.selectId = 'cloud-condense'; group.add(cloudGroup);
  cloudGroup.userData.guideId = 'cloud-condense'; cloudGroup.userData.guideAnchor = V(-.9, 4.85, .3);
  const cloudMap = cloudTexture(), clouds: THREE.Sprite[] = [];
  for (let i = 0; i < 36; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, transparent: true, opacity: 0, depthWrite: false, depthTest: true }));
    sprite.position.set(-2.8 + hash(i + 40) * 4.15, 4.45 + hash(i + 86) * .96, -.9 + hash(i + 129) * 1.8);
    sprite.scale.setScalar(.78 + hash(i + 137) * 1.17); sprite.userData.selectId = 'cloud-condense'; cloudGroup.add(sprite); clouds.push(sprite);
  }
  const cloudDrops = new THREE.Group(); cloudDrops.userData.selectId = 'cloud-condense'; group.add(cloudDrops);
  const microGeometry = new THREE.SphereGeometry(.025, 8, 6), microMaterial = new THREE.MeshBasicMaterial({ color: 0xd5eef8, transparent: true, opacity: .85 });
  const microDrops: THREE.Mesh[] = [];
  for (let i = 0; i < 24; i++) {
    const drop = new THREE.Mesh(microGeometry, microMaterial); drop.position.set(-2.6 + hash(i + 172) * 3.8, 4.5 + hash(i + 222) * .7, .75 + hash(i + 266) * .7); cloudDrops.add(drop); microDrops.push(drop);
  }
  const growingGroup = new THREE.Group(); growingGroup.name = 'droplet-growth'; growingGroup.userData.selectId = 'cloud-precipitation'; growingGroup.position.set(-3.3, 3.75, 2.0); growingGroup.scale.setScalar(2.8); group.add(growingGroup);
  const growthMaterial = new THREE.MeshStandardMaterial({ color: WATER, roughness: .18, transparent: true, opacity: .85, emissive: 0x163451, emissiveIntensity: .35 });
  const largeDrop = new THREE.Mesh(new THREE.SphereGeometry(.095, 20, 16), growthMaterial); largeDrop.name = 'growing-droplet'; growingGroup.add(largeDrop);
  const joiningDrops: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) { const drop = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), growthMaterial); growingGroup.add(drop); joiningDrops.push(drop); }

  const rainPositions = new Float32Array(84 * 6), rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: WATER, transparent: true, opacity: .83 })); rain.name = 'conditional-precipitation'; rain.userData.selectId = 'cloud-precipitation'; group.add(rain);
  rain.userData.guideId = 'cloud-precipitation'; rain.userData.guideAnchor = V(0, 0, 0);
  const runoffGroup = new THREE.Group(); runoffGroup.name = 'added-surface-runoff'; runoffGroup.userData.selectId = 'cloud-runoff'; group.add(runoffGroup);
  runoffGroup.userData.guideId = 'cloud-runoff'; runoffGroup.userData.guideAnchor = V(-1.05, surfaceHeight(-1.05, -.7) + .06, -.7);
  const runoffPaths = [-.7, .2, 1.05].map((startZ, index) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, x = -1.05 - t * 5.65, z = startZ + t * (.7 + index * .1) + Math.sin(t * Math.PI) * .2; points.push(V(x, surfaceHeight(x, z) + .035, z)); }
    const curve = new THREE.CatmullRomCurve3(points), route = line(curve.getPoints(90), WATER, .87); runoffGroup.add(route);
    const base = line(curve.getPoints(90), 0x698a8e, .3, true); ground.add(base);
    const dots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3)), new THREE.PointsMaterial({ color: 0xb1e4ff, size: .095, transparent: true, opacity: .93, depthWrite: false })); runoffGroup.add(dots);
    return { curve, route, dots };
  });
  const infiltration = new THREE.Group(); infiltration.userData.selectId = 'cloud-runoff'; section.add(infiltration);
  const infiltrationLines = [-4.8, -3.25, -1.8].map(x => { const route = line([V(x, surfaceHeight(x, .04), .06), V(x + .12, -.55, .06)], WATER, .72, true); infiltration.add(route); return route; });
  const infiltrationArrows = infiltrationLines.map((route, index) => { const arrow = new THREE.ArrowHelper(V(0, -1, 0), V([-4.8, -3.25, -1.8][index], .4, .065), .65, WATER, .11, .065); infiltration.add(arrow); return arrow; });

  const annotations: Annotation[] = [];
  function annotate(id: string, text: string, anchor: THREE.Vector3, offset: [number, number], visible: Annotation['visible'], colour = '#d9ebe9') {
    const sprite = label(text, colour), leader = line([anchor.clone(), anchor.clone()], 0x9cbfc5, .58);
    sprite.onBeforeRender = () => {}; sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; sprite.renderOrder = 15; leader.renderOrder = 14;
    group.add(sprite, leader); annotations.push({ id, text, anchor, offset, visible, sprite, leader }); return annotations[annotations.length - 1];
  }
  annotate('cloud-inflow', '空气来向 · 水汽随行', V(-5.8, 1.38, -.35), [-40, 18], state => state.progress < .43, '#e8d19c');
  const parcelNote = annotate('cloud-lift', '空气抬升 → 膨胀冷却', V(-2.1, 3.2, -.35), [-45, -12], state => state.progress >= .2 && state.progress < .68, '#a1dfdc');
  annotate('cloud-condense', '冷却到凝结条件后成云', V(-.9, 4.85, .3), [25, -22], (state, layer) => state.condensation > .1 && layer !== 'wind' && state.progress < .82, '#dceef0');
  annotate('cloud-precipitation', '放大观察：小云滴合并增长', V(-3.3, 3.75, 2.0), [-55, 12], (state, layer) => state.growth > .25 && layer === 'rain' && state.progress < .84, '#a6d8f6');
  annotate('cloud-runoff', '雨水沿坡汇流 · 液态水', V(-4.4, surfaceHeight(-4.4, 1.2) + .1, 1.2), [-40, 27], (state, layer) => state.runoff > .05 && layer === 'water', '#9ad8ff');
  annotate('cloud-runoff', '一部分进入土壤', V(-3.25, .2, .06), [25, 10], (state, layer) => state.precipitation > .3 && layer === 'water', '#a3d5ec');
  const lowNote = annotate('cloud-condense', '本对照：少量云，无地面降水', V(.1, 4.6, .9), [12, 22], (state, layer) => state.airMoisture === 'lower' && state.progress >= .57 && layer !== 'wind', '#bdced6');
  annotate('cloud-lift', '同一山体 · 同一抬升路径', V(1.8, 2.8, -1.2), [40, -18], state => state.airMoisture === 'lower' && state.progress >= .2 && state.progress < .57, '#c8d6c9');
  const note = label('原理模型 · 山形、云滴与时序均为示意', '#b9c8c7'); note.onBeforeRender = () => {}; note.renderOrder = 15; group.add(note);
  const legend = label('金点：气态水汽示意　浅蓝：云滴/液态水', '#cdd7c9'); legend.onBeforeRender = () => {}; legend.renderOrder = 15; group.add(legend);
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screen = new THREE.Vector3(), temp = new THREE.Vector3(), tangent = new THREE.Vector3(), up = V(0, 1, 0);
  const warm = new THREE.Color(GOLD), cold = new THREE.Color(0x91d7ef);
  return {
    group,
    update: (props: CloudProps, _time: number, _dt: number) => {
      const state = mountainCloudState(props.progress, props.airMoisture), p = state.progress;
      const layer: CloudLayer = props.layer === 'wind' || props.layer === 'water' ? props.layer : 'rain';
      frontSurface.visible = frontWall.visible = block.visible = !props.cutaway; section.visible = props.cutaway;
      infiltration.visible = layer === 'water' && state.precipitation > .05;
      airCurve.getPoint(state.parcelPosition, parcel.position); parcel.scale.setScalar(state.parcelScale); parcelNote.anchor.copy(parcel.position);
      parcelMaterial.color.copy(warm).lerp(cold, state.cooling); parcelWireMaterial.color.copy(parcelMaterial.color);
      parcelMaterial.opacity = props.selected === 'cloud-lift' ? .2 : .105; parcelWireMaterial.opacity = props.selected === 'cloud-lift' ? .97 : .72;
      vapourGeometry.setDrawRange(0, props.airMoisture === 'lower' ? 9 : 32);
      vapour.material.opacity = .83 - state.condensation * .53; vapour.material.color.set(AIR).lerp(cold, state.condensation);
      const pathEnd = Math.max(.012, state.parcelPosition); airPath.geometry.setDrawRange(0, Math.round(pathEnd * 110) + 1);
      (airPath.material as THREE.LineBasicMaterial).opacity = layer === 'wind' ? .85 : .42;
      airCurve.getPoint(Math.max(0, state.parcelPosition - .055), airTip.position); airCurve.getTangent(Math.max(0, state.parcelPosition - .055), tangent); airTip.quaternion.setFromUnitVectors(up, tangent.normalize());
      airTip.visible = p < .68; airTip.scale.setScalar(props.selected === 'cloud-inflow' ? 1.3 : 1); trail.material.opacity = props.selected === 'cloud-inflow' ? .97 : .67;
      for (let i = 0; i < 18; i++) { airCurve.getPoint(Math.max(0, state.parcelPosition - .025 - i * .025), temp); trailPositions.set([temp.x, temp.y, temp.z], i * 3); }
      trailGeometry.attributes.position.needsUpdate = true; trailGeometry.computeBoundingSphere();
      cloudGroup.visible = cloudDrops.visible = layer !== 'wind' && state.condensation > .001;
      clouds.forEach((sprite, index) => { const activated = state.condensation * (props.airMoisture === 'lower' ? 2.3 : 1); sprite.visible = index < (props.airMoisture === 'lower' ? 6 : 36); sprite.material.opacity = activated * (.3 + hash(index + 190) * .24 + (props.selected === 'cloud-condense' ? .1 : 0)); });
      microDrops.forEach((drop, index) => { drop.visible = index < (props.airMoisture === 'lower' ? 4 : 24); drop.scale.setScalar(.35 + state.condensation * .85); });
      growingGroup.visible = layer === 'rain' && state.growth > .01 && p < .84;
      largeDrop.scale.setScalar(.5 + state.growth * 1.45);
      joiningDrops.forEach((drop, index) => { const angle = index / 5 * Math.PI * 2, radius = .37 * (1 - state.growth); drop.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -.03); drop.visible = state.growth < .95; });
      rain.visible = layer !== 'wind' && state.precipitation > .001;
      (rain.material as THREE.LineBasicMaterial).opacity = props.selected === 'cloud-precipitation' ? 1 : .83;
      rainGeometry.setDrawRange(0, Math.round(state.precipitation * 84) * 2);
      for (let i = 0; i < 84; i++) {
        const x = -2.55 + hash(i + 401) * 1.5, z = -.5 + hash(i + 510) * 1.85, groundY = surfaceHeight(x, z) + .035;
        const cloudY = 4.5 + hash(i + 620) * .5, fall = smooth(p, .65 + hash(i + 701) * .08, .83 + hash(i + 701) * .08);
        const y = THREE.MathUtils.lerp(cloudY, groundY, fall), length = .11 + state.precipitation * .13;
        rainPositions.set([x, y, z, x + .015, Math.max(groundY, y - length), z], i * 6);
      }
      rainGeometry.attributes.position.needsUpdate = true; rainGeometry.computeBoundingSphere();
      rain.userData.guideAnchor.fromArray(rainPositions, 0);
      runoffGroup.visible = layer === 'water' && state.runoff > .001;
      for (const route of runoffPaths) {
        (route.route.material as THREE.LineBasicMaterial).color.set(props.selected === 'cloud-runoff' ? 0xceefff : WATER);
        const fraction = state.runoff; route.route.geometry.setDrawRange(0, Math.round(fraction * 90) + 1);
        const positions = route.dots.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < 14; i++) { route.curve.getPoint(Math.max(0, fraction - i * .045), temp); positions.setXYZ(i, temp.x, temp.y + .025, temp.z); }
        positions.needsUpdate = true; route.dots.geometry.computeBoundingSphere();
      }
      runoffPaths[0].curve.getPoint(state.runoff, runoffGroup.userData.guideAnchor);
      for (let i = 0; i < infiltrationArrows.length; i++) { const x = [-4.8, -3.25, -1.8][i], depth = smooth(p, .79, 1); infiltrationArrows[i].position.set(x, THREE.MathUtils.lerp(surfaceHeight(x, .04), -.35, depth), .065); infiltrationArrows[i].setLength(.22, .08, .05); }

      runtime.renderer.getSize(viewport); if (viewport.x < 1 || viewport.y < 1) return;
      const mobile = viewport.x < 550, height = mobile ? 23 : 26, focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const occupied: { x: number; y: number; width: number }[] = [84, 125, 166].map(y => ({ x: viewport.x - 35, y, width: 58 }));
      if(!mobile)for(const y of [110,139,168])occupied.push({ x:177, y, width:298 });
      const topBound = mobile ? 110 : Math.min(104, viewport.y * .2), bottomBound = Math.max(topBound + height, viewport.y - (mobile ? 105 : 326));
      const sorted = [...annotations].sort((a, b) => Number(b.id === props.selected) - Number(a.id === props.selected) || Number(b === lowNote) - Number(a === lowNote));
      for (const annotation of sorted) {
        annotation.sprite.visible = annotation.leader.visible = annotation.visible(state, layer) && (annotation.text !== '一部分进入土壤' || props.cutaway) && (!props.guide?.active || props.guide.targets.includes(annotation.id));
        if (!annotation.sprite.visible) continue;
        projected.copy(annotation.anchor).project(runtime.camera);
        if (projected.z > 1 || projected.z < -1) { annotation.sprite.visible = annotation.leader.visible = false; continue; }
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        const width = Math.min(viewport.x - 26, annotation.text.length * (mobile ? 10 : 11) + 23);
        const initialX = clamp(ax + annotation.offset[0], width / 2 + 10, viewport.x - width / 2 - 10), initialY = clamp(ay + annotation.offset[1], topBound, bottomBound);
        const candidates: { x: number; y: number; cost: number }[] = [];
        for (const x of [initialX, viewport.x / 2, width / 2 + 10, viewport.x - width / 2 - 10]) for (let y = topBound; y <= bottomBound; y += height + 7) {
          if (!occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 7 && Math.abs(y - box.y) < height + 6)) candidates.push({ x, y, cost: (x - initialX) ** 2 + (y - initialY) ** 2 });
        }
        if (!candidates.length) { annotation.sprite.visible = annotation.leader.visible = false; continue; }
        candidates.sort((a, b) => a.cost - b.cost); const { x, y } = candidates[0]; occupied.push({ x, y, width });
        screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera);
        annotation.sprite.position.copy(screen); const h = height * screen.distanceTo(runtime.camera.position) / focal; annotation.sprite.scale.set(h * width / height, h, 1);
        const positions = annotation.leader.geometry.attributes.position as THREE.BufferAttribute; positions.setXYZ(0, annotation.anchor.x, annotation.anchor.y, annotation.anchor.z); positions.setXYZ(1, screen.x, screen.y, screen.z); positions.needsUpdate = true; annotation.leader.geometry.computeBoundingSphere();
      }
      for (const [sprite, offset, width] of [[legend, 302, mobile ? 306 : 340], [note, 276, mobile ? 295 : 320]] as const) {
        screen.set(0, 1 - Math.max(32, viewport.y - offset) / viewport.y * 2, .55).unproject(runtime.camera);
        sprite.visible = false; sprite.position.copy(screen); const h = 22 * screen.distanceTo(runtime.camera.position) / focal; sprite.scale.set(h * Math.min(viewport.x - 24, width) / 22, h, 1);
      }
    },
  };
}
