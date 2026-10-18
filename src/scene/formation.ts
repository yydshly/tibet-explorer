import * as THREE from 'three';
import { GOLD, TEAL, label, line, mineralTexture } from './environment';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera };
type SectionPoint = { x: number; top: number; bottom: number; fold: number };
type Callout = {
  id: string; text: string; sprite: THREE.Sprite; leader: THREE.Line;
  anchor: THREE.Vector3; offset: [number, number]; layers: string[];
};
const WIDTH = 16, DEPTH = 5.8, NX = 128, NZ = 32;
const smooth = THREE.MathUtils.smoothstep;
const gaussian = (value: number, width: number) => Math.exp(-(value * value) / (width * width));
const channelU = (z: number) => -1.02 - (z + 2.55) * .82 + .12 * Math.sin(z * 1.4);

/** A relational section, not a restoration of a particular geological transect.
 * All deformation and transport use the shared process control. No metres,
 * ages, movement rates or synchronous whole-plateau uplift are inferred.
 */
function sectionPoint(u: number, z: number, progress: number): SectionPoint {
  const shortening = smooth(progress, .05, .8), later = smooth(progress, .35, .9);
  const firstRange = smooth(progress, .12, .56), erosion = smooth(progress, .44, 1);
  const x = u - shortening * 1.1 * Math.tanh(u / 3) - later * .24 * Math.tanh(u / 1.8);
  const earlyHighland = .62 * gaussian(u - 3.8, 3.3);
  const firstPeak = 2.4 * firstRange * gaussian(u + 1.25 + .35 * Math.sin(z * 1.05), 1.9);
  const laterHighland = 1.5 * later * gaussian(u - 2.9, 3.8);
  const ridges = (.17 + .48 * firstRange) * gaussian(u, 6.3) *
    (Math.sin(u * 2.1 + z * 1.35) ** 2 + .4 * Math.sin(z * 2.2 + u) ** 2);
  // Incision grows while the high ground continues to deform, rather than
  // appearing after all uplift has finished. Material destinations stay low.
  const valley = .58 * erosion * gaussian(u - channelU(z), .4);
  const top = .38 + earlyHighland + firstPeak + laterHighland + ridges - valley;
  const root = 2.8 * firstRange * gaussian(u + .2, 3.3) + 1.05 * later * gaussian(u - 3, 4);
  const bottom = -1.55 - root;
  const fold = .31 * shortening * gaussian(u, 4.8) * Math.sin(u * 2.45 + z * .3);
  return { x, top, bottom, fold };
}

function layerHeight(point: SectionPoint, fraction: number) {
  return THREE.MathUtils.lerp(point.bottom, point.top, fraction) +
    point.fold * Math.sin(fraction * Math.PI);
}

/** One closed, deformable band with a front cut and rear/end faces. */
function bandGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NX * 4 + NZ * 2) * 18), 3));
  return geometry;
}

function deformBand(geometry: THREE.BufferGeometry, low: number, high: number, progress: number) {
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  let index = 0;
  const write = (u: number, z: number, fraction: number) => {
    const point = sectionPoint(u, z, progress);
    positions.setXYZ(index++, point.x, layerHeight(point, fraction), z);
  };
  const quad = (u1: number, z1: number, f1: number, u2: number, z2: number, f2: number,
    u3: number, z3: number, f3: number, u4: number, z4: number, f4: number) => {
    write(u1, z1, f1); write(u2, z2, f2); write(u3, z3, f3);
    write(u1, z1, f1); write(u3, z3, f3); write(u4, z4, f4);
  };
  for (let i = 0; i < NX; i++) {
    const a = -WIDTH / 2 + i * WIDTH / NX, b = a + WIDTH / NX;
    quad(a, DEPTH / 2, low, b, DEPTH / 2, low, b, DEPTH / 2, high, a, DEPTH / 2, high);
    quad(b, -DEPTH / 2, low, a, -DEPTH / 2, low, a, -DEPTH / 2, high, b, -DEPTH / 2, high);
    quad(a, -DEPTH / 2, low, b, -DEPTH / 2, low, b, DEPTH / 2, low, a, DEPTH / 2, low);
    quad(a, DEPTH / 2, high, b, DEPTH / 2, high, b, -DEPTH / 2, high, a, -DEPTH / 2, high);
  }
  for (let j = 0; j < NZ; j++) {
    const a = -DEPTH / 2 + j * DEPTH / NZ, b = a + DEPTH / NZ;
    quad(-WIDTH / 2, a, low, -WIDTH / 2, b, low, -WIDTH / 2, b, high, -WIDTH / 2, a, high);
    quad(WIDTH / 2, b, low, WIDTH / 2, a, low, WIDTH / 2, a, high, WIDTH / 2, b, high);
  }
  positions.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
}

export function buildFormationScene(runtime: Runtime) {
  const group = new THREE.Group(), section = new THREE.Group(), topGroup = new THREE.Group();
  group.add(section, topGroup);
  const detail = mineralTexture(); detail.repeat.set(3, 1.6);
  const bandMaterials = [0x655044, 0x936249, 0xb18560, 0xcbb18a].map(color =>
    new THREE.MeshStandardMaterial({ color, map: detail, bumpMap: detail, bumpScale: .025,
      roughness: .96, side: THREE.DoubleSide }));
  const bands = bandMaterials.map((material, index) => {
    const mesh = new THREE.Mesh(bandGeometry(), material);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.selectId = mesh.userData.guideId = 'formation-crust';
    mesh.userData.guideAnchor = new THREE.Vector3();
    section.add(mesh); return { mesh, low: index / bandMaterials.length, high: (index + 1) / bandMaterials.length };
  });

  const surfaceGeometry = new THREE.PlaneGeometry(WIDTH, DEPTH, NX, NZ);
  surfaceGeometry.rotateX(-Math.PI / 2);
  const surfaceColors = new Float32Array(surfaceGeometry.attributes.position.count * 3);
  surfaceGeometry.setAttribute('color', new THREE.BufferAttribute(surfaceColors, 3));
  const topMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, bumpMap: detail,
    bumpScale: .035, roughness: .96, side: THREE.DoubleSide });
  const top = new THREE.Mesh(surfaceGeometry, topMaterial); top.castShadow = true; top.receiveShadow = true;
  top.userData.selectId = top.userData.guideId = 'formation-surface'; top.userData.guideAnchor = new THREE.Vector3(); topGroup.add(top);

  const basement = new THREE.Mesh(new THREE.PlaneGeometry(60, 38),
    new THREE.MeshStandardMaterial({ color: 0x102a34, roughness: 1, transparent: true, opacity: .72 }));
  basement.rotation.x = -Math.PI / 2; basement.position.y = -5.35; basement.receiveShadow = true; group.add(basement);
  const baseline = line([new THREE.Vector3(-8, -5.08, 3.4), new THREE.Vector3(8, -5.08, 3.4)], 0x829aa0, .44, true);
  group.add(baseline);

  const arrows = new THREE.Group(); group.add(arrows);
  const indiaArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-7, .9, 3.5), 2.2, GOLD, .48, .23);
  const eurasiaArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(7, 1.1, 3.5), 2.2, TEAL, .48, .23);
  indiaArrow.userData.selectId = 'formation-india'; eurasiaArrow.userData.selectId = 'formation-eurasia';
  // ArrowHelper rotates its local +Y onto the actual motion direction.
  // Store anchors in that local frame rather than reusing world X vectors.
  indiaArrow.userData.guideId = 'formation-india'; indiaArrow.userData.guideAnchor = new THREE.Vector3(0, 1, 0);
  eurasiaArrow.userData.guideId = 'formation-eurasia'; eurasiaArrow.userData.guideAnchor = new THREE.Vector3(0, 1, 0);
  arrows.add(indiaArrow, eurasiaArrow);
  const rootArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(.4, -.8, 3.18), 1.5, 0xd7ab79, .36, .19);
  rootArrow.userData.selectId = 'formation-crust'; group.add(rootArrow);

  const markers = new THREE.Group(); group.add(markers);
  const materialMarkers: { u: number; mesh: THREE.Mesh }[] = [];
  for (const u of [-7, -5, -3, -1, 1, 3, 5, 7]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 8),
      new THREE.MeshStandardMaterial({ color: u < 0 ? GOLD : TEAL, emissive: u < 0 ? GOLD : TEAL, emissiveIntensity: .28 }));
    mesh.userData.selectId = u < 0 ? 'formation-india' : 'formation-eurasia';
    markers.add(mesh); materialMarkers.push({ u, mesh });
  }
  const foldedLines: THREE.Line[] = [];
  for (const fraction of [.25, .5, .75]) {
    const boundary = line(Array.from({ length: NX + 1 }, () => new THREE.Vector3()), 0xf1cc92, .65);
    boundary.userData.selectId = 'formation-crust'; section.add(boundary); foldedLines.push(boundary);
  }
  const initialProfile = line(Array.from({ length: NX + 1 }, (_, index) => {
    const u = -8 + index / NX * 16, point = sectionPoint(u, DEPTH / 2, 0);
    return new THREE.Vector3(point.x, point.top, DEPTH / 2 + .05);
  }), 0xa5bdc4, .48, true); group.add(initialProfile);

  const surfaceProcesses = new THREE.Group(); group.add(surfaceProcesses);
  const riverLines: THREE.Line[] = [];
  for (let j = 0; j < 2; j++) {
    const river = line(Array.from({ length: 65 }, () => new THREE.Vector3()), 0x7fc9d7, .88);
    river.userData.selectId = 'formation-surface'; surfaceProcesses.add(river); riverLines.push(river);
  }
  const transported = new THREE.Points(new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0xf7d494, size: .075, transparent: true, opacity: .94 }));
  const sediment = new Float32Array(36 * 3);
  transported.geometry.setAttribute('position', new THREE.BufferAttribute(sediment, 3));
  transported.userData.selectId = 'formation-surface'; surfaceProcesses.add(transported);

  const callouts: Callout[] = [];
  function callout(id: string, text: string, layers: string[], offset: [number, number], color = '#e8e5d4') {
    const sprite = label(text, color); sprite.onBeforeRender = () => {};
    sprite.userData.selectId = id; sprite.userData.screenAnnotation = true;
    const leader = line([new THREE.Vector3(), new THREE.Vector3()], id === 'formation-india' ? GOLD : TEAL, .72);
    (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 10;
    group.add(sprite, leader);
    const result = { id, text, sprite, leader, anchor: new THREE.Vector3(), offset, layers };
    callouts.push(result); return result;
  }
  const indiaLabel = callout('formation-india', '印度板块一侧 · 相向运动', ['plates'], [-40, -30], '#f4d79d');
  const eurasiaLabel = callout('formation-eurasia', '欧亚板块一侧 · 原有高地', ['plates'], [40, -38], '#ace5e2');
  const crustLabel = callout('formation-crust', '缩短、变形与地壳增厚', ['crust', 'plates'], [22, 20], '#eac49c');
  const highLabel = callout('formation-surface', '地表起伏 · 各处变化不同', ['surface'], [0, -44]);
  const erosionLabel = callout('formation-surface', '侵蚀与物质搬运', ['surface'], [42, 30], '#ace1e7');
  const sectionNote = label('概念剖面 · 进度表示解释阶段', '#b4c9ce');
  sectionNote.onBeforeRender = () => {}; sectionNote.renderOrder = 11; group.add(sectionNote);

  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screenPosition = new THREE.Vector3();
  let previousProgress = -1;
  function updateGeometry(progress: number) {
    const positions = surfaceGeometry.attributes.position as THREE.BufferAttribute;
    const green = new THREE.Color(0x5d725a), rock = new THREE.Color(0xaba386), highRock = new THREE.Color(0xd5d0b6), color = new THREE.Color();
    for (let index = 0; index < positions.count; index++) {
      const col = index % (NX + 1), row = Math.floor(index / (NX + 1)), u = -8 + col / NX * 16, z = -DEPTH / 2 + row / NZ * DEPTH;
      const point = sectionPoint(u, z, progress);
      positions.setXYZ(index, point.x, point.top, z);
      color.copy(green).lerp(rock, smooth(point.top, .5, 2.1)).lerp(highRock, smooth(point.top, 2.7, 4));
      color.multiplyScalar(.91 + Math.sin(u * 7 + z * 6) * .045); color.toArray(surfaceColors, index * 3);
    }
    positions.needsUpdate = true; surfaceGeometry.attributes.color.needsUpdate = true;
    surfaceGeometry.computeVertexNormals(); surfaceGeometry.computeBoundingSphere();
    bands.forEach(({ mesh, low, high }) => {
      deformBand(mesh.geometry, low, high, progress);
      const anchor = sectionPoint(.2, DEPTH / 2, progress);
      mesh.userData.guideAnchor.set(anchor.x, layerHeight(anchor, (low + high) / 2), DEPTH / 2);
    });
    foldedLines.forEach((boundary, index) => {
      const points = boundary.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= NX; i++) {
        const u = -8 + i / NX * 16, point = sectionPoint(u, DEPTH / 2, progress);
        points.setXYZ(i, point.x, layerHeight(point, (index + 1) / 4), DEPTH / 2 + .016);
      }
      points.needsUpdate = true; boundary.geometry.computeBoundingSphere();
    });
    for (const marker of materialMarkers) {
      const point = sectionPoint(marker.u, 2.8, progress); marker.mesh.position.set(point.x, point.top + .08, 2.8);
    }
    const left = sectionPoint(-7, 0, progress), right = sectionPoint(7, 0, progress), center = sectionPoint(.2, 2.9, progress);
    indiaArrow.position.set(left.x, left.top + .38, 3.4); eurasiaArrow.position.set(right.x, right.top + .38, 3.4);
    rootArrow.position.set(center.x, center.top - 1.2, 3.09); rootArrow.setLength(Math.max(.6, Math.min(2.9, -center.bottom - .8)), .35, .2);
    indiaLabel.anchor.set(left.x + .8, left.top + .15, 2.8); eurasiaLabel.anchor.set(right.x - .8, right.top + .15, 2.8);
    crustLabel.anchor.set(center.x, layerHeight(center, .4), 3.02);
    const high = sectionPoint(-1.3, -.7, progress); highLabel.anchor.set(high.x, high.top + .07, -.7);
    top.userData.guideAnchor.copy(highLabel.anchor);
    const valley = sectionPoint(channelU(1.45), 1.45, progress); erosionLabel.anchor.set(valley.x, valley.top + .08, 1.45);
    riverLines.forEach((river, index) => {
      const points = river.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= 64; i++) {
        const t = i / 64, z = -2.55 + t * 5.2, u = channelU(z) + index * .18;
        const point = sectionPoint(u, z, progress); points.setXYZ(i, point.x, point.top + .038, z);
      }
      points.needsUpdate = true; river.geometry.computeBoundingSphere();
    });
    for (let i = 0; i < 36; i++) {
      const t = (i / 36 + smooth(progress, .44, 1) * .82) % 1;
      const z = -2.35 + t * 4.9, u = channelU(z) + (i % 3) * .06;
      const point = sectionPoint(u, z, progress); sediment.set([point.x, point.top + .075, z], i * 3);
    }
    transported.geometry.attributes.position.needsUpdate = true; transported.geometry.computeBoundingSphere();
  }
  updateGeometry(0);
  return {
    group,
    update: (p: TibetSceneProps, _time: number, _dt: number) => {
      const progress = THREE.MathUtils.clamp(p.progress, 0, 1), layer = ['crust', 'surface'].includes(p.layer) ? p.layer : 'plates';
      if (Math.abs(progress - previousProgress) > .0002) { previousProgress = progress; updateGeometry(progress); }
      const showSection = p.cutaway;
      section.visible = showSection; rootArrow.visible = showSection && layer === 'crust' && progress > .12;
      arrows.visible = layer === 'plates'; markers.visible = layer === 'plates' || layer === 'crust';
      initialProfile.visible = showSection && layer === 'crust' && progress > .02;
      surfaceProcesses.visible = layer === 'surface' && progress > .44;
      bandMaterials.forEach(material => { material.emissive.set(p.selected === 'formation-crust' ? 0x392313 : 0); material.emissiveIntensity = .22; });
      topMaterial.emissive.set(p.selected === 'formation-surface' ? 0x242417 : 0); topMaterial.emissiveIntensity = .25;
      materialMarkers.forEach(marker => marker.mesh.scale.setScalar(p.selected === marker.mesh.userData.selectId ? 1.4 : 1));

      runtime.renderer.getSize(viewport);
      const mobile = viewport.x < 550, h = mobile ? 23 : 26, focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const occupied: { x: number; y: number; w: number }[] = [84,125,166].map(y=>({x:viewport.x-35,y,w:58}));
      if(!mobile)occupied.push({x:125,y:112,w:230});
      const sorted = [...callouts].sort((a, b) => Number(b.id === p.selected) - Number(a.id === p.selected));
      for (const item of sorted) {
        const visible = (item.layers.includes(layer) || (item.id === p.selected && item !== erosionLabel)) && (!p.guide?.active || p.guide.targets.includes(item.id));
        item.sprite.visible = item.leader.visible = visible && (item !== erosionLabel || progress > .44);
        if (!item.sprite.visible) continue;
        projected.copy(item.anchor).project(runtime.camera);
        if (projected.z > 1 || projected.z < -1) { item.sprite.visible = item.leader.visible = false; continue; }
        const anchorX = (projected.x + 1) * viewport.x / 2, anchorY = (1 - projected.y) * viewport.y / 2;
        const width = Math.min(viewport.x - 34, item.text.length * (mobile ? 10 : 11) + 24);
        const topBound = mobile ? 110 : Math.min(112, viewport.y * .23), bottomBound = Math.max(topBound + h, viewport.y - (mobile ? 105 : 252));
        const initialX = THREE.MathUtils.clamp(anchorX + item.offset[0], width / 2 + 14, viewport.x - width / 2 - 14);
        const initialY = THREE.MathUtils.clamp(anchorY + item.offset[1], topBound, bottomBound);
        const candidates: { x: number; y: number; cost: number }[] = [];
        for (const x of [initialX, viewport.x / 2, width / 2 + 14, viewport.x - width / 2 - 14]) {
          for (let y = topBound; y <= bottomBound; y += h + 8) {
            if (!occupied.some(box => Math.abs(x - box.x) < (width + box.w) / 2 + 7 && Math.abs(y - box.y) < h + 7))
              candidates.push({ x, y, cost: (x - initialX) ** 2 + (y - initialY) ** 2 });
          }
        }
        if (!candidates.length) { item.sprite.visible = item.leader.visible = false; continue; }
        candidates.sort((a, b) => a.cost - b.cost); const { x, y } = candidates[0]; occupied.push({ x, y, w: width });
        screenPosition.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera);
        item.sprite.position.copy(screenPosition); const height = h * screenPosition.distanceTo(runtime.camera.position) / focal;
        item.sprite.scale.set(height * width / h, height, 1);
        const leader = item.leader.geometry.attributes.position as THREE.BufferAttribute;
        leader.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z); leader.setXYZ(1, screenPosition.x, screenPosition.y, screenPosition.z);
        leader.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      // The scientific status belongs to the scene, independently of narration.
      // Phone reading already carries this scope beside the sticky scene;
      // retain the scarce canvas space for the current actual objects.
      sectionNote.visible = !mobile;
      const noteY = Math.max(40, viewport.y - 215), noteWidth = Math.min(viewport.x - 32, mobile ? 235 : 250);
      screenPosition.set(0, 1 - noteY / viewport.y * 2, .55).unproject(runtime.camera);
      sectionNote.position.copy(screenPosition); const noteHeight = 23 * screenPosition.distanceTo(runtime.camera.position) / focal;
      sectionNote.scale.set(noteHeight * noteWidth / 23, noteHeight, 1);
    },
  };
}
