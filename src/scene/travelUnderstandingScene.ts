import * as THREE from 'three';
import { disposeTree, label, line, mineralTexture } from './environment';
import { travelJourneyState } from '../data/travelUnderstanding';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: { getSize: (value: THREE.Vector2) => THREE.Vector2 }; camera: THREE.PerspectiveCamera };
type Caption = { id: string; text: string; sprite: THREE.Sprite; leader: THREE.Line; subject: THREE.Object3D; priority: number };
type Road = { group: THREE.Group; curve: THREE.CatmullRomCurve3; pieces: { mesh: THREE.Mesh; at: number }[] };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const phase = (p: number, from: number, to: number) => THREE.MathUtils.smoothstep(p, from, to);
const riverX = (z: number) => -2.5 + Math.sin(z * .37) * .6;
const riverY = (z: number) => .40 - z * .042;

/** This continuous relief is an author-defined teaching setting, not a real location or DEM. */
export function travelTerrainHeight(x: number, z: number) {
  const west = 3.5 * Math.exp(-((x + 9.6) ** 2 / 16 + (z + 1.2) ** 2 / 90));
  const east = 2.8 * Math.exp(-((x - 11.0) ** 2 / 15 + (z + 4.3) ** 2 / 75));
  const base = .83 - z * .025 + west + east + .055 * Math.sin(z * .7) * Math.exp(-x * x / 200);
  const bank = THREE.MathUtils.smoothstep(Math.abs(x - riverX(z)), .36, 1.7);
  return THREE.MathUtils.lerp(riverY(z), base, bank);
}

export function buildTravelUnderstandingScene(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'travel-understanding-landscape';
  group.userData.modelScope = '教学河谷与访问链；非实测道路、文物复原或当前交通状态';
  let disposed = false;
  const mineral = mineralTexture(); mineral.repeat.set(13, 10);
  const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: mineral, bumpMap: mineral, bumpScale: .05, roughness: 1 });
  const earth = new THREE.MeshStandardMaterial({ color: 0x9b8e73, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xc7c3ad, roughness: .94 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x435357, roughness: .85 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x78614c, roughness: .88 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x586b70, roughness: .8 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xe3dcc3, roughness: .9 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x72c4cd, roughness: .4, metalness: .12 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xdfc17c, roughness: .63 });
  const pending = new THREE.MeshStandardMaterial({ color: 0xbca582, roughness: .8 });
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x697273, roughness: .96 });
  function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, name = '') {
    const object = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); object.name = name; object.position.set(x, y, z); object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  }
  function cylinder(parent: THREE.Object3D, radius: number, h: number, x: number, y: number, z: number, material: THREE.Material) {
    const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 20), material); object.position.set(x, y, z); object.castShadow = true; parent.add(object); return object;
  }
  function subject(id: string, name: string, anchor: THREE.Vector3) {
    const object = new THREE.Group(); object.name = name; object.userData.selectId = id; object.userData.guideId = id; object.userData.guideAnchor = anchor; group.add(object); return object;
  }
  const landform = subject('travel-landform', 'travel-continuous-relief', V(-7.5, 2.9, -2.5));
  const groundGeometry = new THREE.PlaneGeometry(100, 78, 210, 164); groundGeometry.rotateX(-Math.PI / 2);
  const groundPositions = groundGeometry.attributes.position, colors = new Float32Array(groundPositions.count * 3), color = new THREE.Color();
  for (let n = 0; n < groundPositions.count; n++) {
    const x = groundPositions.getX(n), z = groundPositions.getZ(n), y = travelTerrainHeight(x, z); groundPositions.setY(n, y);
    color.set(0x9e9b80).lerp(new THREE.Color(0x789783), Math.exp(-((x - riverX(z)) ** 2) / 5) * .27).lerp(new THREE.Color(0xb7b3a2), Math.min(.7, Math.max(0, y) / 7)); color.toArray(colors, n * 3);
  }
  groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, terrainMaterial); ground.name = 'travel-terrain-surface'; ground.receiveShadow = true; landform.add(ground);
  const water = subject('travel-water', 'travel-water-evidence', V(riverX(-1), riverY(-1) + .1, -1));
  const waterVertices: number[] = [], waterIndices: number[] = [];
  for (let n = 0; n <= 140; n++) { const z = -14 + n / 140 * 28, x = riverX(z); waterVertices.push(x - .39, riverY(z) + .045, z, x + .39, riverY(z) + .045, z); if (n < 140) waterIndices.push(n * 2, n * 2 + 2, n * 2 + 1, n * 2 + 1, n * 2 + 2, n * 2 + 3); }
  const waterGeometry = new THREE.BufferGeometry(); waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterVertices, 3)); waterGeometry.setIndex(waterIndices); waterGeometry.computeVertexNormals();
  const river = new THREE.Mesh(waterGeometry, new THREE.MeshStandardMaterial({ color: 0x60a8b9, roughness: .24, metalness: .22 })); river.name = 'travel-water-ribbon'; water.add(river);
  const beads = Array.from({ length: 9 }, () => { const bead = new THREE.Mesh(new THREE.SphereGeometry(.065, 10, 8), blue); water.add(bead); return bead; });
  const environmentAid = new THREE.Group(); environmentAid.name = 'travel-environment-transect'; water.add(environmentAid);
  for (let n = 0; n < 10; n++) {
    const x = -7.4 + n * .61, z = -2.6, y = travelTerrainHeight(x, z), post = cylinder(environmentAid, .035, .47, x, y + .235, z, gold);
    box(post, .20, .04, .10, 0, .23, 0, gold);
  }
  const settlement = subject('travel-settlement', 'travel-local-use', V(1.2, 1.8, -2));
  for (const [x, z, angle] of [[.2, -2.3, -.12], [1.9, -2.6, .06], [.9, -4.2, -.1]]) {
    const home = new THREE.Group(); home.position.set(x, travelTerrainHeight(x, z) + .03, z); home.rotation.y = angle; settlement.add(home);
    box(home, 1.3, .13, 1.1, 0, .065, 0, earth); box(home, 1.06, .83, .86, 0, .54, 0, stone);
    box(home, 1.25, .13, 1.03, 0, 1.02, 0, roofMaterial); box(home, .24, .49, .045, 0, .38, .45, dark);
    for (const dx of [-.33, .33]) box(home, .16, .20, .04, dx, .71, .45, blue);
  }
  const heritage = subject('travel-heritage', 'travel-generic-building', V(0, 1.5, 0)); heritage.position.set(5.7, travelTerrainHeight(5.7, -3.2) + .03, -3.2);
  heritage.userData.reconstruction = false;
  box(heritage, 3.25, .20, 3.25, 0, .1, 0, earth);
  box(heritage, .43, 1.35, 2.8, -1.26, .86, 0, stone); box(heritage, .43, 1.35, 2.8, 1.26, .86, 0, stone);
  box(heritage, 2.2, 1.35, .55, 0, .86, -1.14, stone);
  box(heritage, .85, 1.35, .40, -.84, .86, 1.22, stone); box(heritage, .85, 1.35, .40, .84, .86, 1.22, stone);
  const courtyard = box(heritage, 1.95, .035, 1.55, 0, .222, .10, paper, 'travel-building-courtyard');
  const heritageRoof = new THREE.Group(); heritageRoof.name = 'travel-building-roof'; heritage.add(heritageRoof);
  box(heritageRoof, 3.10, .18, 3.08, 0, 0, 0, roofMaterial); box(heritageRoof, 3.13, .07, .15, 0, -.13, 1.48, wood);
  for (const x of [-.74, .74]) box(heritage, .065, 1.15, .065, x, .79, .53, wood);
  const question = subject('travel-question', 'travel-observation-record', V(0, 1.1, 0)); question.position.set(8.2, travelTerrainHeight(8.2, -.3) + .05, -.3);
  box(question, 1.1, .09, .73, 0, .86, 0, wood); for (const x of [-.43, .43]) box(question, .08, .82, .08, x, .41, 0, wood);
  const sourceHolder=box(question, .60, .025, .43, 0, .925, 0, paper,'travel-unwritten-source-holder');
  sourceHolder.userData.guideId='travel-source-holder';sourceHolder.userData.guideAnchor=V(0,.03,0);sourceHolder.userData.reconstruction=false;
  box(question, .025, .025, .38, .22, .95, 0, dark);
  // All transport geometry belongs to this teaching valley, never the saved geographic itinerary.
  const corridor = subject('travel-corridor', 'travel-main-corridor', V(-3.1, 1.25, 3.65));
  const transfer = subject('travel-transfer', 'travel-transfer-conditions', V(1.6, 1.4, 2.2));
  const lastmile = subject('travel-lastmile', 'travel-walk-and-access', V(5.6, 1.5, -1.25));
  function makeRoad(parent: THREE.Group, name: string, controls: number[][], width: number, material: THREE.Material, clearance: number, count = 52): Road {
    const points = controls.map(([x, z]) => V(x, travelTerrainHeight(x, z) + clearance, z)), curve = new THREE.CatmullRomCurve3(points), roadGroup = new THREE.Group(); roadGroup.name = name; parent.add(roadGroup);
    const pieces: Road['pieces'] = [];
    for (let n = 0; n < count; n++) {
      const at = (n + .5) / count, a = curve.getPoint(n / count), b = curve.getPoint((n + 1) / count), position = curve.getPoint(at), direction = b.clone().sub(a);
      const mesh = box(roadGroup, width, .105, direction.length() * 1.03, position.x, position.y, position.z, material, `${name}-segment`); mesh.rotation.y = Math.atan2(direction.x, direction.z); mesh.rotation.x = -Math.atan2(direction.y, Math.hypot(direction.x, direction.z)); pieces.push({ mesh, at });
    }
    return { group: roadGroup, curve, pieces };
  }
  const mainRoad = makeRoad(corridor, 'travel-main-road', [[-8.3, 5], [-5.5, 4.65], [-2.2, 3.75], [1.25, 2.65]], .86, roadMaterial, .38);
  const feederRoad = makeRoad(transfer, 'travel-feeder-road', [[1.25, 2.65], [2.7, 1.55], [4.25, -.15]], .57, earth, .18, 34);
  const footway = makeRoad(lastmile, 'travel-final-footway', [[4.25, -.15], [4.85, -.64], [5.7, -1.26]], .42, stone, .12, 15);
  const hub = new THREE.Group(); hub.name = 'travel-transfer-shelter'; hub.position.set(1.25, travelTerrainHeight(1.25, 2.65), 2.65); transfer.add(hub);
  box(hub, 1.7, .14, .8, 0, .08, -.72, stone);
  for (const x of [-.67, .67]) box(hub, .065, 1.14, .065, x, .68, -.88, wood);
  box(hub, 1.65, .1, .85, 0, 1.28, -.72, roofMaterial); box(hub, 1.2, .11, .27, 0, .48, -.95, wood);
  const bridge = new THREE.Group(); bridge.name = 'travel-teaching-bridge'; corridor.add(bridge);
  const crossing = Array.from({ length: 101 }, (_, n) => mainRoad.curve.getPoint(n / 100)).sort((a, b) => Math.abs(a.x - riverX(a.z)) - Math.abs(b.x - riverX(b.z)))[0];
  for (const dz of [-.44, .44]) {
    const beam = box(bridge, 2.2, .07, .07, crossing.x, crossing.y + .43, crossing.z + dz, wood); beam.rotation.y = -.30;
    for (const dx of [-.72, .72]) cylinder(bridge, .035, .46, crossing.x + dx, crossing.y + .22, crossing.z + dz, wood);
  }
  function vehicle(parent: THREE.Group, name: string, small: boolean) {
    const object = new THREE.Group(); object.name = name; parent.add(object);
    const length = small ? .82 : 1.33, width = small ? .42 : .55;
    box(object, width, .35, length, 0, .37, 0, small ? gold : blue); box(object, width * .89, .25, length * .73, 0, .66, -.04, dark);
    for (const dx of [-width * .52, width * .52]) for (const dz of [-length * .31, length * .31]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .07, 14), dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(dx, .18, dz); object.add(wheel); }
    return object;
  }
  const mainVehicle = vehicle(corridor, 'travel-main-vehicle', false), feederVehicle = vehicle(transfer, 'travel-feeder-vehicle', true);
  for(const object of [mainVehicle,feederVehicle]){object.userData.guideId=object.name;object.userData.guideAnchor=V(0,.6,0);}
  const person = new THREE.Group(); person.name = 'travel-arriving-person'; lastmile.add(person);
  person.userData.guideId='travel-walker';person.userData.guideAnchor=V(0,.55,0);
  cylinder(person, .105, .32, 0, .38, 0, gold);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), stone); head.position.y = .69; person.add(head);
  for (const dx of [-.065, .065]) cylinder(person, .027, .22, dx, .14, 0, dark);
  const gate = new THREE.Group(); gate.name = 'travel-access-pending-gate'; gate.userData.status = 'unverified'; gate.position.set(5.7, travelTerrainHeight(5.7, -1.64) + .04, -1.64); lastmile.add(gate);
  for (const dx of [-.45, .45]) cylinder(gate, .045, .86, dx, .43, 0, wood);
  box(gate, .92, .065, .08, 0, .56, 0, pending); box(gate, .26, .25, .05, 0, .78, .025, pending);
  const sampleA = cylinder(corridor, .38, .13, -7.9, travelTerrainHeight(-7.9, 4.25) + .08, 4.25, gold); sampleA.name = 'travel-example-A';
  const sampleB = cylinder(lastmile, .32, .13, 6.5, travelTerrainHeight(6.5, -1.4) + .08, -1.4, gold); sampleB.name = 'travel-example-B';
  // Three tangible work surfaces keep evidence, dynamic conditions and personal records separate.
  function desk(id: string, name: string, x: number, z: number) {
    const deskGroup = subject(id, name, V(0, 1.6, 0)); deskGroup.position.set(x, travelTerrainHeight(x, z) + .03, z);
    box(deskGroup, 2.25, .16, 1.36, 0, 1.05, 0, wood); for (const dx of [-.91, .91]) for (const dz of [-.48, .48]) box(deskGroup, .13, 1.0, .13, dx, .5, dz, wood);
    return deskGroup;
  }
  const evidence = desk('travel-evidence', 'travel-evidence-desk', -4.5, 3.4), conditions = desk('travel-conditions', 'travel-conditions-desk', -.2, 4), record = desk('travel-record', 'travel-personal-record-desk', 4.2, 3.7);
  const evidenceDrawer = new THREE.Group(); evidenceDrawer.name = 'travel-source-drawer'; evidence.add(evidenceDrawer);
  box(evidenceDrawer, 1.8, .12, 1.03, 0, 1.2, 0, stone); box(evidenceDrawer, 1.9, .16, .09, 0, 1.28, .50, wood);
  for (let n = 0; n < 3; n++) { const folio = box(evidenceDrawer, 1.05, .045, .68, -.18 + n * .15, 1.3 + n * .055, -.08, paper); folio.rotation.y = -.1 + n * .11; }
  const materialSample = box(evidenceDrawer, .42, .18, .30, .59, 1.39, .17, earth); materialSample.userData.authenticArtifact = false;
  const conditionsPanel = new THREE.Group(); conditionsPanel.name = 'travel-date-status-panel'; conditions.add(conditionsPanel);
  box(conditionsPanel, 1.8, .72, .11, 0, .4, 0, stone);
  for (let n = 0; n < 3; n++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.115, .025, 8, 28), pending); ring.name = 'travel-unverified-status-slot'; ring.userData.verified = false; ring.position.set(-.55 + n * .55, .45, .075); conditionsPanel.add(ring);
    box(conditionsPanel, .29, .025, .02, -.55 + n * .55, .18, .075, wood);
  }
  const calendar = box(conditions, .66, .025, .48, -.42, 1.18, .20, paper); calendar.name = 'travel-undated-calendar'; calendar.userData.date = null;
  const notebook = new THREE.Group(); notebook.name = 'travel-unwritten-notebook'; notebook.userData.saved = false; notebook.userData.travelCompleted = false; notebook.position.set(0, 1.17, .02); record.add(notebook);
  box(notebook, .92, .07, .84, .46, 0, 0, paper); box(notebook, .035, .10, .88, 0, 0, 0, wood);
  const notebookCover = new THREE.Group(); notebookCover.name = 'travel-notebook-cover'; notebook.add(notebookCover); box(notebookCover, .94, .04, .88, .47, .075, 0, roofMaterial);
  const pencil = box(record, .035, .035, .75, .88, 1.2, -.1, gold); pencil.rotation.y = -.23;
  const candidates = subject('travel-candidates', 'travel-actual-candidate-tray', V(0, .9, 0)); candidates.position.set(6.8, travelTerrainHeight(6.8, 3.2) + .06, 3.2);
  box(candidates, 2.2, .12, 1.18, 0, .53, 0, wood); for (const dx of [-.91, .91]) box(candidates, .09, .5, .09, dx, .25, 0, wood);
  const tokens = new THREE.Group(); tokens.name = 'travel-actual-candidate-tokens'; candidates.add(tokens); let oldCount = -1;
  const captions: Caption[] = [];
  function addCaption(subjectObject: THREE.Object3D, text: string, priority: number) {
    const id = subjectObject.userData.selectId as string, sprite = label(text, '#ece7d9'), leader = line([V(0, 0, 0), V(0, 0, 0)], 0xc6d4cd, .5);
    sprite.onBeforeRender = () => {}; sprite.renderOrder = 31; sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; leader.renderOrder = 30; group.add(sprite, leader);
    const item = { id, text, sprite, leader, subject: subjectObject, priority }; captions.push(item); return item;
  }
  addCaption(landform, '同一河谷：先看整体', 2); addCaption(water, '地形与水：环境线索', 1); addCaption(settlement, '人居：继续问谁在使用', 3); addCaption(heritage, '建筑与材料：不能只看外观', 0); addCaption(question, '保留观察问题', 4);
  addCaption(corridor, '示例A → 主通道节点', 0); addCaption(transfer, '接驳：另一段服务条件', 1); addCaption(lastmile, '示例B入口外 · 访问待核实', 2);
  addCaption(evidence, '认识：保留对应出处', 0); addCaption(conditions, '日期／交通／开放：待核实', 1); addCaption(record, '个人记录：仍可补充与修改', 2);
  const candidateCaption = addCaption(candidates, '实际候选：0站', 3);
  const note = label('教学河谷 · 非真实道路、遗产复原或即时出行资料', '#ccd1c6'); note.onBeforeRender = () => {}; note.renderOrder = 32; group.add(note);
  const focus = new THREE.Mesh(new THREE.TorusGeometry(.67, .035, 8, 64), new THREE.MeshBasicMaterial({ color: 0xe5c47f, transparent: true, opacity: .88 })); focus.name = 'travel-attention-ring'; focus.rotation.x = -Math.PI / 2; group.add(focus);
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), anchor = new THREE.Vector3(), screen = new THREE.Vector3(), tangent = new THREE.Vector3();
  function moveAlong(object: THREE.Object3D, curve: THREE.CatmullRomCurve3, at: number, lift = .07) { curve.getPoint(at, object.position); object.position.y += lift; curve.getTangent(at, tangent); object.rotation.y = Math.atan2(tangent.x, tangent.z); }
  function visible(object: THREE.Object3D) { for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false; return true; }
  function replaceCount(count: number) {
    // Only geometries are rebuilt; materials are shared with the rest of this scene.
    tokens.traverse(object => { (object as THREE.Mesh).geometry?.dispose(); }); tokens.clear();
    for (let n = 0; n < count; n++) { const token = box(tokens, .30, .08, .42, -.76 + n % 4 * .49, .64 + Math.floor(n / 4) * .14, .03, gold, 'travel-actual-candidate-token'); token.userData.stopIndex = n; }
    const replacement = label(`实际候选：${count}站`, '#ece7d9');
    candidateCaption.sprite.material.map?.dispose(); candidateCaption.sprite.material.dispose(); candidateCaption.sprite.material = replacement.material;
    candidateCaption.text = `实际候选：${count}站`; candidateCaption.sprite.userData.labelText = candidateCaption.text; oldCount = count;
  }
  return {
    group,
    update: (p: TibetSceneProps, _time = 0, _dt = 0) => {
      if (disposed) return;
      const state = travelJourneyState(p.step, p.progress, p.routeRegions); group.userData.travelState = state;
      const environment = phase(state.progress, .27, .67), use = phase(state.progress, .66, 1), main = phase(state.progress, 0, .32), feeder = phase(state.progress, .32, .68), walk = phase(state.progress, .68, 1);
      environmentAid.visible = state.step === 0 && state.stage > 0;
      environmentAid.children.forEach((post, index) => { post.visible = index / environmentAid.children.length <= environment; });
      beads.forEach((bead, index) => { const z = -13 + ((index / beads.length + state.progress * .28) % 1) * 26; bead.position.set(riverX(z), riverY(z) + .12, z); });
      heritageRoof.position.y = 1.66 + (state.step === 0 ? use * 1.32 : 0); heritageRoof.rotation.z = state.step === 0 ? -.12 * use : 0;
      courtyard.visible = state.step === 0 && state.stage === 2; question.visible = state.step === 0 && state.stage === 2;
      // A blank material-reading carrier joins only at the actual material phrase;
      // it contains no invented historic document or personal observation.
      const material=phase(state.progress,.95,1);sourceHolder.visible=state.step===0&&state.progress>=.95;
      sourceHolder.position.set(0,.925+(1-material)*.3,(1-material)*.8);
      corridor.visible = state.step === 1; transfer.visible = state.step === 1 && state.stage > 0; lastmile.visible = state.step === 1 && state.stage === 2;
      mainRoad.pieces.forEach(piece => { piece.mesh.visible = piece.at <= main; }); feederRoad.pieces.forEach(piece => { piece.mesh.visible = piece.at <= feeder; }); footway.pieces.forEach(piece => { piece.mesh.visible = piece.at <= walk; });
      bridge.visible = main > .5; moveAlong(mainVehicle, mainRoad.curve, main); moveAlong(feederVehicle, feederRoad.curve, feeder); moveAlong(person, footway.curve, walk, .07);
      // The gate never opens through progress alone; the actor ends outside it.
      gate.userData.status = 'unverified';
      evidence.visible = state.step === 2; conditions.visible = state.step === 2 && state.stage > 0; record.visible = state.step === 2 && state.stage === 2;
      evidenceDrawer.position.z = .42 * main; conditionsPanel.position.set(0, 1.14, -.30); conditionsPanel.rotation.x = -.10 - (1 - feeder) * 1.20; notebookCover.rotation.z = use * Math.PI * .94;
      candidates.visible = state.step > 0; if (state.candidateCount !== oldCount) replaceCount(state.candidateCount);
      group.updateMatrixWorld(true);
      let target: THREE.Object3D = state.step === 0 ? state.stage === 0 ? landform : state.stage === 1 ? water : heritage : state.step === 1 ? state.stage === 0 ? corridor : state.stage === 1 ? transfer : lastmile : state.stage === 0 ? evidence : state.stage === 1 ? conditions : record;
      if (state.step === 0) target = p.layer === 'water' ? water : p.layer === 'settlements' ? settlement : p.layer === 'culture' && state.stage === 2 ? heritage : p.layer === 'terrain' ? landform : target;
      for (const item of [landform, water, settlement, heritage, question, corridor, transfer, lastmile, evidence, conditions, record, candidates]) if (item.userData.selectId === p.selected && visible(item)) target = item;
      anchor.copy(target.localToWorld((target.userData.guideAnchor as THREE.Vector3).clone())); focus.position.set(anchor.x, travelTerrainHeight(anchor.x, anchor.z) + .14, anchor.z); group.userData.focusId = target.userData.selectId;
      runtime.renderer.getSize(viewport); runtime.camera.updateMatrixWorld(); if (viewport.x < 2 || viewport.y < 2) return;
      const mobile = viewport.x < 600, compact=viewport.y<520,pixelHeight = mobile ? 21 : 24, focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const top = compact?80:Math.min(118, viewport.y * .23), bottom = Math.max(top + pixelHeight, viewport.y - (compact?105:294)), occupied: { x: number; y: number; width: number }[] = [];
      let count = 0;
      const allowed = state.step === 0 ? ['travel-landform', 'travel-water', 'travel-settlement', 'travel-heritage', 'travel-question'] : state.step === 1 ? ['travel-corridor', 'travel-transfer', 'travel-lastmile', 'travel-candidates'] : ['travel-evidence', 'travel-conditions', 'travel-record', 'travel-candidates'];
      const priority=(id:string)=>p.guide?.active&&p.guide.targets.includes(id)?2:id===target.userData.selectId?1:0;
      for (const item of [...captions].sort((a, b) => priority(b.id)-priority(a.id) || a.priority - b.priority)) {
        item.sprite.position.set(0,0,0);item.sprite.scale.set(1,1,1);const baseline=item.leader.geometry.attributes.position as THREE.BufferAttribute;baseline.array.fill(0);baseline.needsUpdate=true;
        item.sprite.visible = item.leader.visible = false;
        if (!allowed.includes(item.id) || !visible(item.subject) || count >= (mobile ? 3 : 4)) continue;
        if (state.step === 0 && state.stage === 0 && !['travel-landform', 'travel-water', 'travel-heritage'].includes(item.id)) continue;
        item.subject.localToWorld(anchor.copy(item.subject.userData.guideAnchor as THREE.Vector3)); projected.copy(anchor).project(runtime.camera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1) continue;
        const width = Math.min(viewport.x - 28, item.text.length * (mobile ? 10 : 11) + 22), ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        let x = THREE.MathUtils.clamp(ax, width / 2 + 12, viewport.x - width / 2 - 12), y = THREE.MathUtils.clamp(ay - 28, top, bottom), found = false;
        for (const candidate of [y, ...Array.from({ length: Math.max(1, Math.floor((bottom - top) / (pixelHeight + 9)) + 1) }, (_, index) => top + index * (pixelHeight + 9))]) {
          // Keep the right-hand tool column free, in addition to the top and bottom controls.
          if (viewport.x > 600 && x + width / 2 > viewport.x - 76 && candidate < 305) x = viewport.x - 88 - width / 2;
          if (!occupied.some(other => Math.abs(x - other.x) < (width + other.width) / 2 + 5 && Math.abs(candidate - other.y) < pixelHeight + 8)) { y = candidate; found = true; break; }
        }
        if (!found) continue;
        occupied.push({ x, y, width }); count++; item.sprite.visible = item.leader.visible = true;
        screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera); item.sprite.position.copy(screen);
        const height = pixelHeight * screen.distanceTo(runtime.camera.position) / focal; item.sprite.scale.set(height * width / pixelHeight, height, 1);
        const attr = item.leader.geometry.attributes.position as THREE.BufferAttribute; attr.setXYZ(0, anchor.x, anchor.y, anchor.z); attr.setXYZ(1, screen.x, screen.y, screen.z); attr.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      note.visible=!compact;screen.set(0, 1 - Math.max(36, viewport.y - 263) / viewport.y * 2, .55).unproject(runtime.camera); note.position.copy(screen);
      const height = 20 * screen.distanceTo(runtime.camera.position) / focal; note.scale.set(height * Math.min(viewport.x - 24, mobile ? 355 : 495) / 20, height, 1);
    },
    dispose: () => { if (disposed) return; disposed = true; disposeTree(group); },
  };
}
