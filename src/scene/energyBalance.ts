import * as THREE from 'three';
import { label, line, mineralTexture } from './environment';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera };
type Layer = 'energy' | 'absorption' | 'exchange';
type Callout = {
  id: string; text: string; anchor: THREE.Vector3; sprite: THREE.Sprite; leader: THREE.Line;
  offset: [number, number]; show: (progress: number, layer: Layer) => boolean;
};
type Path = {
  group: THREE.Group; curve: THREE.CatmullRomCurve3; line: THREE.Line;
  tip: THREE.Mesh; particles: THREE.Points; positions: Float32Array;
  from: number; to: number; layers: Layer[];
};
const SUNLIGHT = 0xf0cf75, INFRARED = 0xeb926e, TRANSFER = 0x76d7d1;
const smooth = THREE.MathUtils.smoothstep;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const top = (x: number, z: number) => .83 + .48 * Math.exp(-((x + 1.8) ** 2 / 8 + (z + .4) ** 2 / 3)) +
  .27 * Math.exp(-((x - 2.1) ** 2 / 3 + (z + 1.1) ** 2 / 1.5)) + .1 * Math.sin(x * 1.7 + z * .8) ** 2;

export function energyPhase(progress: number) {
  if (progress < .28) return { id: 'incoming', title: '阳光进入，也有反射' };
  if (progress < .52) return { id: 'storage', title: '吸收后，地表储存能量' };
  if (progress < .78) return { id: 'exchange', title: '地表与空气交换能量' };
  return { id: 'outgoing', title: '长波向太空散失，也向地表发射' };
}

/** NASA's Earth energy budget explains pathways, rather than a local forecast.
 * https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/
 * Path widths, packet counts, reservoir levels and colours are qualitative.
 * The shared slider describes explanation stages; it is not elapsed solar time.
 */
export function buildEnergyBalanceScene(runtime: Runtime) {
  const group = new THREE.Group(), ground = new THREE.Group(), section = new THREE.Group();
  group.add(ground, section);
  const texture = mineralTexture(); texture.repeat.set(5, 3);
  const terrainGeometry = new THREE.PlaneGeometry(12, 6, 80, 40); terrainGeometry.rotateX(-Math.PI / 2);
  const vertices = terrainGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) vertices.setY(i, top(vertices.getX(i), vertices.getZ(i)));
  terrainGeometry.computeVertexNormals();
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x9d987a, map: texture, bumpMap: texture, bumpScale: .035, roughness: .96, emissive: 0x8c3818, emissiveIntensity: 0 });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial); terrain.userData.selectId = 'energy-surface'; terrain.receiveShadow = true; ground.add(terrain);
  terrain.userData.guideId = 'energy-surface'; terrain.userData.guideAnchor = V(-2.4, top(-2.4, -.4), -.4);
  const base = new THREE.Mesh(new THREE.BoxGeometry(12, 1.45, 6), new THREE.MeshStandardMaterial({ color: 0x615a48, map: texture, roughness: .98 }));
  base.position.y = -.08; base.userData.selectId = 'energy-surface'; ground.add(base);
  const frontPositions: number[] = [];
  for (let i = 0; i < 80; i++) {
    const a = -6 + i / 80 * 12, b = -6 + (i + 1) / 80 * 12;
    frontPositions.push(a, -.8, 3.018, b, -.8, 3.018, a, top(a, 3), 3.018,
      b, -.8, 3.018, b, top(b, 3), 3.018, a, top(a, 3), 3.018);
  }
  const frontGeometry = new THREE.BufferGeometry(); frontGeometry.setAttribute('position', new THREE.Float32BufferAttribute(frontPositions, 3)); frontGeometry.computeVertexNormals();
  const frontMaterial = new THREE.MeshStandardMaterial({ color: 0x978367, roughness: .97, emissive: 0xba581e, emissiveIntensity: 0, side: THREE.DoubleSide });
  const front = new THREE.Mesh(frontGeometry, frontMaterial); front.userData.selectId = 'energy-surface'; section.add(front);
  for (const y of [-.37, .16, .57]) section.add(line([V(-6, y, 3.028), V(6, y, 3.028)], 0xb9aa8d, .32));
  // Reveal stored energy within a recognisable surface volume. The fill has no
  // numeric temperature or joule scale and never implies measured Tibet data.
  const stored = new THREE.Mesh(new THREE.BoxGeometry(11.85, .6, .05), new THREE.MeshBasicMaterial({ color: 0xde9a56, transparent: true, opacity: .55, depthWrite: false }));
  stored.position.set(0, -.48, 3.06); stored.userData.selectId = 'energy-surface'; section.add(stored);
  const storageLine = line([V(-5.8, -.66, 3.07), V(5.8, -.66, 3.07)], 0xf5c38b, .82); section.add(storageLine);

  const air = new THREE.Group(); air.userData.selectId = 'energy-atmosphere'; group.add(air);
  air.userData.guideId = 'energy-atmosphere'; air.userData.guideAnchor = V(.8, 4.45, .3);
  const airMaterial = new THREE.MeshBasicMaterial({ color: 0x68b6d0, transparent: true, opacity: .065, side: THREE.DoubleSide, depthWrite: false });
  const airVolume = new THREE.Mesh(new THREE.BoxGeometry(12.25, 4.55, 6.22), airMaterial); airVolume.position.y = 3.52; air.add(airVolume);
  const airBounds = new THREE.LineSegments(new THREE.EdgesGeometry(airVolume.geometry), new THREE.LineBasicMaterial({ color: 0x80bece, transparent: true, opacity: .23 })); airBounds.position.copy(airVolume.position); air.add(airBounds);
  const airCut = new THREE.Mesh(new THREE.PlaneGeometry(12.25, 4.55), new THREE.MeshBasicMaterial({ color: 0x75bfd0, transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false }));
  airCut.position.set(0, 3.52, 0); airCut.userData.selectId = 'energy-atmosphere'; air.add(airCut);
  const molecules: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const x = -4.8 + (i % 6) * 1.75, y = 2.5 + Math.floor(i / 6) * 1.1, z = Math.sin(i * 1.61) * 2;
    const material = new THREE.MeshBasicMaterial({ color: 0x82c9d5, transparent: true, opacity: .4 });
    const molecule = new THREE.Mesh(new THREE.SphereGeometry(.052, 10, 8), material); molecule.position.set(x, y, z); molecule.userData.selectId = 'energy-atmosphere'; air.add(molecule); molecules.push(molecule);
  }
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.38, 32, 24), new THREE.MeshBasicMaterial({ color: 0xf4d686 }));
  sun.position.set(-7.2, 8.15, -.4); sun.userData.selectId = 'energy-sunlight'; group.add(sun);
  const sunRing = new THREE.Mesh(new THREE.RingGeometry(.51, .54, 48), new THREE.MeshBasicMaterial({ color: 0xe8c77e, transparent: true, opacity: .65, side: THREE.DoubleSide })); sunRing.position.copy(sun.position); sunRing.rotation.x = -.3; group.add(sunRing);
  const space = new THREE.Mesh(new THREE.TorusGeometry(.48, .025, 8, 40), new THREE.MeshBasicMaterial({ color: 0xded8c3, transparent: true, opacity: .57 })); space.position.set(5.45, 8, -.2); space.userData.selectId = 'energy-space'; group.add(space);
  space.userData.guideId = 'energy-space'; space.userData.guideAnchor = V(0, 0, 0);
  const waterPatch = new THREE.Mesh(new THREE.CircleGeometry(.8, 48), new THREE.MeshStandardMaterial({ color: 0x428d99, roughness: .33, metalness: .13, transparent: true, opacity: .81 }));
  waterPatch.rotation.x = -Math.PI / 2; waterPatch.position.set(-3.5, top(-3.5, 1.8) + .025, 1.8); waterPatch.userData.selectId = 'energy-surface'; ground.add(waterPatch);

  const paths: Path[] = [];
  function path(points: THREE.Vector3[], colour: number, from: number, to: number, id: string, layers: Layer[]) {
    const pathGroup = new THREE.Group(); pathGroup.userData.selectId = pathGroup.userData.guideId = id; pathGroup.userData.guideAnchor = points[0].clone(); group.add(pathGroup);
    const curve = new THREE.CatmullRomCurve3(points), samples = curve.getPoints(90);
    const route = line(samples, colour, .86); route.geometry.setDrawRange(0, 0); pathGroup.add(route);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.13, .34, 10), new THREE.MeshBasicMaterial({ color: colour })); pathGroup.add(tip);
    const positions = new Float32Array(18 * 3), geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: colour, size: .085, transparent: true, opacity: .94, depthWrite: false })); pathGroup.add(particles);
    paths.push({ group: pathGroup, curve, line: route, tip, particles, positions, from, to, layers });
    return pathGroup;
  }
  const all: Layer[] = ['energy', 'absorption'];
  path([sun.position.clone(), V(-5, 5.65, -.4), V(-2.4, top(-2.4, -.4) + .03, -.4)], SUNLIGHT, 0, .3, 'energy-sunlight', all);
  path([V(-5.15, 5.85, -.5), V(-4.6, 6.9, -.8), V(-3, 8.3, -.7)], SUNLIGHT, .12, .38, 'energy-sunlight', all);
  path([V(-2.4, top(-2.4, -.4) + .07, -.2), V(-.8, 4.9, -.2), V(.1, 7.35, -.2)], SUNLIGHT, .29, .47, 'energy-sunlight', all);
  path([V(-6.65, 7.8, .2), V(-4.6, 5.7, .3), V(-3.7, 4.4, .3)], SUNLIGHT, .08, .33, 'energy-atmosphere', all);
  const exchange: Layer[] = ['energy', 'exchange'];
  path([V(-1, top(-1, .1) + .1, .1), V(-.2, 2.85, .25), V(.8, 4.45, .2)], INFRARED, .52, .75, 'energy-atmosphere', exchange);
  path([V(2.2, top(2.2, -.2) + .1, -.2), V(3.15, 4.9, -.35), space.position.clone()], INFRARED, .6, .99, 'energy-space', exchange);
  path([V(.8, 4.45, .3), V(2.8, 6.8, .25), V(5.2, 8, -.05)], INFRARED, .78, 1, 'energy-space', exchange);
  path([V(.8, 4.45, .65), V(2.4, 3.4, 1), V(3.4, top(3.4, 1) + .13, 1)], INFRARED, .78, .97, 'energy-atmosphere', exchange);
  path([waterPatch.position.clone().add(V(0, .08, 0)), V(-3.8, 2.05, 1.8), V(-2.7, 3.2, 1.75), V(-3.2, 4.2, 1.6)], TRANSFER, .57, .79, 'energy-atmosphere', exchange);
  path([V(4.2, top(4.2, 1.8) + .06, 1.8), V(4.7, 2.3, 1.5), V(4, 3.1, 1.8), V(4.6, 4.2, 1.5)], TRANSFER, .54, .78, 'energy-atmosphere', exchange);

  const callouts: Callout[] = [];
  function callout(id: string, text: string, anchor: THREE.Vector3, offset: [number, number], show: Callout['show'], colour = '#dce8e2') {
    const sprite = label(text, colour), leader = line([anchor.clone(), anchor.clone()], 0xafc5c8, .55);
    sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; sprite.onBeforeRender = () => {}; sprite.renderOrder = 13;
    leader.renderOrder = 12; group.add(leader, sprite); callouts.push({ id, text, anchor, offset, show, sprite, leader });
  }
  callout('energy-sunlight', '太阳短波进入', V(-5.8, 6.6, -.4), [-35, -30], (_p, layer) => layer !== 'exchange', '#f1d48a');
  callout('energy-sunlight', '一部分反射回太空', V(-3.9, 7.7, -.65), [30, -5], (p, layer) => p > .12 && layer !== 'exchange', '#f1d48a');
  callout('energy-surface', '吸收后储存在地表', V(-1.5, .12, 3.06), [0, 35], (p, layer) => p >= .28 && layer !== 'exchange', '#f2be8a');
  callout('energy-surface', '地表发出长波', V(-.5, 2.1, .2), [-55, 8], (p, layer) => p >= .52 && layer !== 'absorption', '#efaa8f');
  callout('energy-atmosphere', '空气吸收并再发射', V(.8, 4.45, .3), [35, -14], (p, layer) => p >= .64 && layer !== 'absorption', '#c1e0e7');
  callout('energy-atmosphere', '蒸发与对流也传递能量', V(-3.2, 3.6, 1.6), [-45, -5], (p, layer) => p >= .57 && layer === 'exchange', '#a3e3dd');
  callout('energy-space', '长波向太空散失', V(4.45, 7.05, -.2), [45, -16], (p, layer) => p >= .78 && layer !== 'absorption', '#edb7a1');
  callout('energy-atmosphere', '空气也向地表发射', V(2.8, 2.5, 1), [50, 30], (p, layer) => p >= .84 && layer !== 'absorption', '#edb7a1');
  callout('energy-surface', '地表体积 · 储存示意', V(4.3, -.15, 3.05), [18, 35], (p, layer) => p < .28 || (layer === 'exchange' && p < .52), '#bdb798');
  callout('energy-atmosphere', '空气层 · 尺度示意', V(4.9, 4.7, -2.9), [30, -20], (p, layer) => p < .64 && layer !== 'exchange', '#b2d8e3');
  const note = label('方向示意 · 颜色与宽度不表示数值', '#bdccd0'); note.onBeforeRender = () => {}; note.renderOrder = 13; group.add(note);
  const legend = label('金：短波　珊瑚：长波　青：空气/水传热', '#c9d4cb'); legend.onBeforeRender = () => {}; legend.renderOrder = 13; group.add(legend);
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screen = new THREE.Vector3(), temp = new THREE.Vector3(), tangent = new THREE.Vector3();
  const up = V(0, 1, 0), infraredColour = new THREE.Color(INFRARED);
  return {
    group,
    update: (p: TibetSceneProps, _time: number, _dt: number) => {
      const progress = THREE.MathUtils.clamp(p.progress, 0, 1), layer: Layer = p.layer === 'absorption' || p.layer === 'exchange' ? p.layer : 'energy';
      const absorbed = smooth(progress, .28, .52), redistributed = smooth(progress, .52, 1);
      const storage = Math.max(0, absorbed - redistributed * .42);
      terrainMaterial.emissiveIntensity = storage * .28 + (p.selected === 'energy-surface' ? .12 : 0);
      frontMaterial.emissiveIntensity = storage * .28;
      stored.scale.y = Math.max(.002, storage); stored.position.y = -.78 + .3 * storage;
      stored.material.opacity = .24 + storage * .41;
      section.visible = p.cutaway; base.visible = !p.cutaway;
      sun.scale.setScalar(p.selected === 'energy-sunlight' ? 1.18 : 1);
      space.scale.setScalar(p.selected === 'energy-space' ? 1.18 : 1);
      airVolume.visible = !p.cutaway; airCut.visible = p.cutaway;
      airMaterial.opacity = p.selected === 'energy-atmosphere' ? .14 : .05 + redistributed * .025;
      (airBounds.material as THREE.LineBasicMaterial).opacity = p.selected === 'energy-atmosphere' ? .6 : .24;
      molecules.forEach((molecule, index) => {
        const activation = smooth(progress, .16 + (index % 3) * .05, .7 + (index % 3) * .07);
        const material = molecule.material as THREE.MeshBasicMaterial;
        material.color.set(0x82c9d5).lerp(infraredColour, activation * .65);
        material.opacity = .18 + activation * .42; molecule.scale.setScalar(1 + activation * .5);
      });
      const stageProgress = layer === 'absorption' ? Math.min(progress, .52) : progress;
      for (const item of paths) {
        const phase = smooth(stageProgress, item.from, item.to);
        item.group.visible = phase > 0 && item.layers.includes(layer);
        if (!item.group.visible) continue;
        item.line.geometry.setDrawRange(0, Math.max(2, Math.ceil(phase * 90) + 1));
        item.curve.getPoint(phase, item.tip.position); item.curve.getTangent(phase, tangent); item.tip.quaternion.setFromUnitVectors(up, tangent.normalize());
        item.group.userData.guideAnchor.copy(item.tip.position);
        // Shared progress alone moves packets and their leading arrow. No time
        // accumulation remains after pause, scrubbing or a topic return.
        for (let i = 0; i < 18; i++) {
          const at = Math.max(0, phase - i / 18 * .48);
          item.curve.getPoint(at, temp); item.positions[i * 3] = temp.x; item.positions[i * 3 + 1] = temp.y; item.positions[i * 3 + 2] = temp.z;
        }
        item.particles.geometry.attributes.position.needsUpdate = true; item.particles.geometry.computeBoundingSphere();
      }
      runtime.renderer.getSize(viewport);
      if (viewport.x < 1 || viewport.y < 1) return;
      const mobile = viewport.x < 550, height = mobile ? 23 : 26;
      const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const occupied: { x: number; y: number; width: number }[] = [84,125,166].map(y=>({x:viewport.x-35,y,width:58}));
      if(!mobile)occupied.push({x:125,y:112,width:230});
      const topBound = mobile ? 110 : Math.min(103, viewport.y * .2), bottomBound = Math.max(topBound + height, viewport.y - (mobile ? 105 : 274));
      const sorted = [...callouts].sort((a, b) => Number(b.id === p.selected) - Number(a.id === p.selected));
      for (const item of sorted) {
        item.sprite.visible = item.leader.visible = item.show(progress, layer) && (!p.guide?.active || p.guide.targets.includes(item.id));
        if (!item.sprite.visible) continue;
        projected.copy(item.anchor).project(runtime.camera);
        if (projected.z > 1 || projected.z < -1) { item.sprite.visible = item.leader.visible = false; continue; }
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        const width = Math.min(viewport.x - 30, item.text.length * (mobile ? 10 : 11) + 25);
        const initialX = THREE.MathUtils.clamp(ax + item.offset[0], width / 2 + 12, viewport.x - width / 2 - 12), initialY = THREE.MathUtils.clamp(ay + item.offset[1], topBound, bottomBound);
        const candidates: { x: number; y: number; cost: number }[] = [];
        for (const x of [initialX, viewport.x / 2, width / 2 + 12, viewport.x - width / 2 - 12]) {
          for (let y = topBound; y <= bottomBound; y += height + 7) {
            if (!occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 6 && Math.abs(y - box.y) < height + 6))
              candidates.push({ x, y, cost: (x - initialX) ** 2 + (y - initialY) ** 2 });
          }
        }
        if (!candidates.length) { item.sprite.visible = item.leader.visible = false; continue; }
        candidates.sort((a, b) => a.cost - b.cost); const { x, y } = candidates[0]; occupied.push({ x, y, width });
        screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera);
        item.sprite.position.copy(screen); const h = height * screen.distanceTo(runtime.camera.position) / focal;
        item.sprite.scale.set(h * width / height, h, 1);
        const positions = item.leader.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z); positions.setXYZ(1, screen.x, screen.y, screen.z);
        positions.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      for (const [sprite, offset, width] of [[legend, 244, mobile ? 305 : 330], [note, 217, mobile ? 275 : 300]] as const) {
        sprite.visible = !mobile;
        screen.set(0, 1 - Math.max(32, viewport.y - offset) / viewport.y * 2, .55).unproject(runtime.camera);
        sprite.position.copy(screen); const h = 22 * screen.distanceTo(runtime.camera.position) / focal;
        sprite.scale.set(h * Math.min(viewport.x - 24, width) / 22, h, 1);
      }
    },
  };
}
