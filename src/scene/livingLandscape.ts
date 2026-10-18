import * as THREE from 'three';
import { disposeTree, label, line, mineralTexture } from './environment';
import { livingLandscapeState, type LivingSetting, type CommunitySupport } from '../data/livingUnderstanding';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: { getSize: (value: THREE.Vector2) => THREE.Vector2 }; camera: THREE.PerspectiveCamera };
type LivingProps = TibetSceneProps & { livingSetting?: LivingSetting; communitySupport?: CommunitySupport };
type Walkway = { mesh: THREE.Mesh<THREE.TubeGeometry>; curve: THREE.CatmullRomCurve3; support: CommunitySupport; user: number; steps: { object: THREE.Object3D; at: number }[] };
type Caption = { id: string; text: string; sprite: THREE.Sprite; leader: THREE.Line; anchor: THREE.Vector3; priority: number };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const smooth = (p: number, start: number, end: number) => THREE.MathUtils.smoothstep(p, start, end);
const GOLD = 0xe5c47f, TEAL = 0x7acbd2;

function channelX(z: number, setting: LivingSetting) { return (setting === 'upland' ? -4.3 : -2.1) + Math.sin(z * .37) * (setting === 'upland' ? .28 : .57); }
function channelBed(z: number, setting: LivingSetting) { return (setting === 'upland' ? 1.1 : .32) - z * .043; }

/** Author-defined relief, not surveyed elevation or a geographic claim about all uplands. */
export function livingTerrainHeight(x: number, z: number, setting: LivingSetting) {
  const channel = channelX(z, setting), bed = channelBed(z, setting);
  let height: number;
  if (setting === 'valley') {
    const west = 3.1 * Math.exp(-((x + 8.3) ** 2 / 15 + (z + .5) ** 2 / 115));
    const east = 2.2 * Math.exp(-((x - 10.1) ** 2 / 14 + (z + 3.5) ** 2 / 75));
    height = .62 - z * .025 + west + east + .10 * Math.sin(z * .55) * Math.exp(-x * x / 180);
    const flat = Math.exp(-((x - 3.7) ** 4 / 105 + (z - .1) ** 4 / 170));
    height = THREE.MathUtils.lerp(height, .64 - z * .025, flat * .96);
  } else {
    height = 1.85 - z * .028 + .37 * Math.sin(x * .48) * Math.cos(z * .36) + 1.5 * Math.exp(-((x + 8.3) ** 2 / 16 + (z + 2) ** 2 / 72));
    for (const [cx, cz] of [[2.25, -1.75], [5.4, 2.0]]) {
      const bench = Math.exp(-((x - cx) ** 4 / 5.6 + (z - cz) ** 4 / 7.4));
      height = THREE.MathUtils.lerp(height, 1.82 - cz * .028, bench * .97);
    }
  }
  const bank = THREE.MathUtils.smoothstep(Math.abs(x - channel), setting === 'upland' ? .22 : .38, setting === 'upland' ? 1.7 : 1.65);
  return THREE.MathUtils.lerp(bed, height, bank);
}

export function buildLivingLandscapeScene(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'living-landscape-conditions';
  const texture = mineralTexture(); texture.repeat.set(12, 10);
  const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: texture, bumpMap: texture, bumpScale: .045, roughness: 1 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x5fa8b9, roughness: .29, metalness: .2 });
  const earth = new THREE.MeshStandardMaterial({ color: 0x9b8b68, roughness: 1 });
  const pasture = new THREE.MeshStandardMaterial({ color: 0x9baf84, transparent: true, opacity: .32, roughness: 1, depthWrite: false, side: THREE.DoubleSide });
  const wall = new THREE.MeshStandardMaterial({ color: 0xc9c5ad, roughness: .91 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x53666c, roughness: .78 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x79624a, roughness: .86 });
  const warm = new THREE.MeshStandardMaterial({ color: GOLD, roughness: .63 });
  const blue = new THREE.MeshStandardMaterial({ color: TEAL, roughness: .44, metalness: .06 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3b4a49, roughness: .95 });
  const crop = new THREE.MeshStandardMaterial({ color: 0x8a9c6d, roughness: 1 });
  const actorMaterial = new THREE.MeshStandardMaterial({ color: 0xd7b778, roughness: .81 });
  let setting: LivingSetting = 'valley', disposed = false;
  const H = (x: number, z: number) => livingTerrainHeight(x, z, setting);
  function box(parent: THREE.Object3D, width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material); object.position.set(x, y, z); object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, material: THREE.Material) {
    const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material); object.position.set(x, y, z); object.castShadow = true; parent.add(object); return object;
  }
  function subject(id: string, name: string, anchor: THREE.Vector3) {
    const object = new THREE.Group(); object.name = name; object.userData.selectId = id; object.userData.guideAnchor = anchor; group.add(object); return object;
  }
  // Rebuilding a condition changes geometry; common model materials stay alive.
  function clearGeometry(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    root.traverse(object => { const geometry = (object as THREE.Mesh).geometry; if (geometry) geometries.add(geometry); });
    geometries.forEach(geometry => geometry.dispose()); root.clear();
  }
  const slope = subject('living-slope', 'living-natural-relief', V(-8, 2.8, -1.5));
  const terrainGeometry = new THREE.PlaneGeometry(100, 78, 210, 164); terrainGeometry.rotateX(-Math.PI / 2);
  const terrainColor = new Float32Array(terrainGeometry.attributes.position.count * 3); terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColor, 3));
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial); terrain.name = 'living-terrain-surface'; terrain.receiveShadow = true; slope.add(terrain);
  const water = subject('living-water', 'living-natural-water', V(-2.1, .4, -1.8));
  const waterGeometry = new THREE.BufferGeometry(), waterVertices = new Float32Array(121 * 2 * 3), waterIndices: number[] = [];
  for (let n = 0; n < 120; n++) waterIndices.push(n * 2, n * 2 + 2, n * 2 + 1, n * 2 + 1, n * 2 + 2, n * 2 + 3);
  waterGeometry.setAttribute('position', new THREE.BufferAttribute(waterVertices, 3)); waterGeometry.setIndex(waterIndices);
  const river = new THREE.Mesh(waterGeometry, waterMaterial); river.name = 'living-water-ribbon'; water.add(river);
  const waterBeads = Array.from({ length: 10 }, () => { const bead = new THREE.Mesh(new THREE.SphereGeometry(.065, 10, 8), blue); water.add(bead); return bead; });
  const land = subject('living-land', 'living-usable-ground', V(3.3, .8, .5));
  const landPatches: THREE.Mesh<THREE.PlaneGeometry>[] = [];
  for (let n = 0; n < 2; n++) { const geometry = new THREE.PlaneGeometry(1, 1, 14, 14); geometry.rotateX(-Math.PI / 2); const patch = new THREE.Mesh(geometry, pasture); patch.name = `living-ground-patch-${n}`; land.add(patch); landPatches.push(patch); }
  const access = subject('living-access', 'living-using-paths', V(.4, .8, -.1));
  const privatePaths = new THREE.Group(), sharedPaths = new THREE.Group(); access.add(privatePaths, sharedPaths);
  const walkways: Walkway[] = [];
  const work = subject('living-work', 'living-working-space', V(3.5, .8, 1.1));
  const fields = new THREE.Group(); fields.name = 'living-working-plots'; work.add(fields);
  const grazing = new THREE.Group(); grazing.name = 'living-animal-use'; work.add(grazing);
  const livestockRoute = new THREE.Group(); livestockRoute.name = 'living-livestock-route'; grazing.add(livestockRoute);
  const animal = new THREE.Group(); animal.name = 'living-generic-livestock'; grazing.add(animal);
  box(animal, .60, .31, .25, 0, .40, 0, dark); box(animal, .19, .22, .19, .32, .56, 0, dark);
  for (const x of [-.2, .2]) for (const z of [-.09, .09]) cylinder(animal, .035, .28, x, .17, z, wood);
  const housing = subject('living-houses', 'living-households', V(3.5, 1.4, -.3));
  const homes: THREE.Group[] = [];
  for (let n = 0; n < 2; n++) {
    const home = new THREE.Group(); home.name = `living-home-${n}`; housing.add(home); homes.push(home);
    box(home, 1.7, .15, 1.4, 0, .08, 0, earth); box(home, 1.4, 1.1, 1.1, 0, .68, 0, wall);
    box(home, 1.7, .16, 1.4, 0, 1.3, 0, roof); box(home, .31, .72, .05, 0, .49, .57, dark);
    for (const x of [-.45, .45]) box(home, .21, .26, .05, x, .87, .57, blue);
    box(home, 1.7, .09, .11, 0, 1.13, .7, wood);
  }
  const separateStorage = new THREE.Group(); separateStorage.name = 'living-separate-storage'; housing.add(separateStorage);
  const shared = subject('living-shared', 'living-shared-facilities', V(3.6, .9, .1));
  const intake = new THREE.Group(); intake.name = 'living-common-water-point'; shared.add(intake);
  const court = new THREE.Group(); court.name = 'living-common-space'; shared.add(court);
  const memory = subject('living-memory', 'living-evidence-question', V(6.4, 1.1, 3.6));
  box(memory, 1.1, .10, .75, 0, .75, 0, wood); for (const x of [-.43, .43]) box(memory, .10, .7, .10, x, .38, 0, wood);
  box(memory, .57, .04, .43, 0, .82, 0, wall); box(memory, .035, .035, .40, 0, .85, 0, roof);
  const users = new THREE.Group(); users.name = 'living-water-carriers'; access.add(users);
  const carriers: THREE.Group[] = [],buckets:THREE.Mesh[]=[],heldLevels:THREE.Mesh[]=[],storedLevels:THREE.Mesh[]=[],carrierArms:THREE.Mesh[]=[];
  const pourTubes=Array.from({length:2},()=>{const tube=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,1,8),blue);tube.name='living-water-pour-stream';group.add(tube);return tube;});
  const pouring=Array.from({length:2},()=>{const stream=line([V(0,0,0),V(0,0,0)],TEAL,.9);stream.name='living-pouring-water';group.add(stream);return stream;});
  for (let n = 0; n < 2; n++) {
    const user = new THREE.Group(); user.name = `living-water-user-${n}`;if(n===0){user.userData.guideId='living-transfer';user.userData.guideAnchor=V(.1,.55,0);} users.add(user); carriers.push(user);
    cylinder(user, .11, .39, 0, .30, 0, actorMaterial);
    const arm=cylinder(user,.035,1,0,0,0,actorMaterial);carrierArms.push(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), actorMaterial); head.position.y = .62; user.add(head);
    for (const x of [-.07, .07]) cylinder(user, .035, .2, x, .09, 0, dark);
    const bucket = cylinder(user, .12, .22, .24, .20, 0, wood);bucket.geometry.dispose();bucket.geometry=new THREE.CylinderGeometry(.12,.12,.22,20,1,true);const bucketFloor=new THREE.Mesh(new THREE.CircleGeometry(.12,18),wood);bucketFloor.rotation.x=-Math.PI/2;bucketFloor.position.y=-.109;bucket.add(bucketFloor);buckets.push(bucket);bucket.name=`living-bucket-${n}`;
    const heldWater = new THREE.Mesh(new THREE.CircleGeometry(.095, 18), blue); heldWater.rotation.x = -Math.PI / 2; heldWater.position.set(0, .113, 0); bucket.add(heldWater);heldWater.name=`living-carried-water-${n}`;heldLevels.push(heldWater);
  }

  let homePoints = [V(2.2, 0, -1.7), V(5.4, 0, 2.1)], userCurves: Record<CommunitySupport, THREE.CatmullRomCurve3[]> = { individual: [], shared: [] };
  function path(parent: THREE.Group, control: THREE.Vector3[], support: CommunitySupport, user: number, radius: number) {
    const points: THREE.Vector3[] = [];
    const plan = new THREE.CatmullRomCurve3(control);
    for (let n = 0; n <= 60; n++) { const point = plan.getPoint(n / 60); point.y = H(point.x, point.z) + .13; points.push(point); }
    const curve = new THREE.CatmullRomCurve3(points), mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, radius, 7, false), support === 'shared' ? wood : earth);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
    const steps: Walkway['steps'] = [];
    for (let n = 0; n < 26; n++) {
      const at = (n + 1) / 27;
      if (support === 'shared' && user === 1 && at < .58) continue;
      const position = curve.getPoint(at), direction = curve.getTangent(at);
      const step = box(parent, support === 'shared' ? .59 : .30, support === 'shared' ? .09 : .055, support === 'shared' ? .23 : .22, position.x, position.y + .025, position.z, support === 'shared' ? wood : earth);
      step.rotation.y = Math.atan2(direction.x, direction.z); step.name = support === 'shared' ? 'living-common-walkway-board' : 'living-footway-stone';
      steps.push({ object: step, at });
    }
    walkways.push({ mesh, curve, support, user, steps }); return curve;
  }
  function storage(parent: THREE.Object3D, x: number, z: number) {
    const y = H(x, z), barrel = cylinder(parent, .22, .47, x, y + .235, z, wood);
    barrel.geometry.dispose();barrel.geometry=new THREE.CylinderGeometry(.22,.22,.47,20,1,true);
    const top = new THREE.Mesh(new THREE.CircleGeometry(.18, 20), waterMaterial); top.rotation.x = -Math.PI / 2; top.position.y = .242; barrel.add(top);top.name='living-stored-water-level';storedLevels.push(top);
    return barrel;
  }
  function rebuildNature(next: LivingSetting) {
    setting = next;
    const positions = terrainGeometry.attributes.position as THREE.BufferAttribute, color = new THREE.Color();
    for (let n = 0; n < positions.count; n++) {
      const x = positions.getX(n), z = positions.getZ(n), height = H(x, z);
      positions.setY(n, height);
      const bank = Math.exp(-((x - channelX(z, setting)) ** 2) / 2.5);
      color.set(setting === 'valley' ? 0x9e9b7e : 0xa79e86).lerp(new THREE.Color(0x879a7c), bank * .30).lerp(new THREE.Color(0xb6b1a0), Math.min(.7, height / 7));
      color.toArray(terrainColor, n * 3);
    }
    positions.needsUpdate = true; terrainGeometry.attributes.color.needsUpdate = true; terrainGeometry.computeVertexNormals(); terrainGeometry.computeBoundingSphere(); terrainGeometry.computeBoundingBox();
    slope.userData.guideAnchor = V(-8.1, H(-8.1, -1.5) + .1, -1.5);
    for (let n = 0; n <= 120; n++) {
      const z = -11 + n / 120 * 22, x = channelX(z, setting), width = setting === 'upland' ? .25 : .49;
      waterVertices.set([x - width, channelBed(z, setting) + .055, z, x + width, channelBed(z, setting) + .055, z], n * 6);
    }
    waterGeometry.attributes.position.needsUpdate = true; waterGeometry.computeVertexNormals(); waterGeometry.computeBoundingSphere(); waterGeometry.computeBoundingBox();
    water.userData.guideAnchor = V(channelX(-1.8, setting), channelBed(-1.8, setting) + .08, -1.8);
    homePoints = [V(2.2, 0, -1.7), V(5.4, 0, 2.1)];
    homes.forEach((home, n) => { const point = homePoints[n]; home.position.set(point.x, H(point.x, point.z) + .06, point.z); });
    housing.userData.guideAnchor = V(homePoints[0].x, H(homePoints[0].x, homePoints[0].z) + 1.0, homePoints[0].z);
    const patchCases = setting === 'valley' ? [[3.6, .2, 6.2, 4.8], [5.9, -3.7, 2.1, 1.6]] : [[2.25, -1.75, 2.7, 2.6], [5.4, 2.0, 2.9, 2.8]];
    landPatches.forEach((patch, n) => {
      const [cx, cz, width, depth] = patchCases[n], pos = patch.geometry.attributes.position as THREE.BufferAttribute;
      // Plane vertices are regenerated from their stable grid, avoiding accumulated transforms.
      for (let j = 0; j <= 14; j++) for (let i = 0; i <= 14; i++) { const x = cx + (i / 14 - .5) * width, z = cz + (j / 14 - .5) * depth; pos.setXYZ(j * 15 + i, x, H(x, z) + .025, z); }
      pos.needsUpdate = true; patch.geometry.computeVertexNormals(); patch.geometry.computeBoundingSphere();
    });
    land.userData.guideAnchor = V(patchCases[0][0], H(patchCases[0][0], patchCases[0][1]) + .05, patchCases[0][1]);
    clearGeometry(privatePaths); clearGeometry(sharedPaths); walkways.length = 0; userCurves = { individual: [], shared: [] };
    const hub = V(3.8, 0, .1), intakePoint = V(channelX(-2.0, setting) + .55, 0, -2.0);
    for (let n = 0; n < 2; n++) {
      const home = homePoints[n], source = V(channelX(n ? .6 : -3.6, setting) + .55, 0, n ? .6 : -3.6);
      userCurves.individual.push(path(privatePaths, [source, V(.2 + n * .4, 0, source.z + .55), home.clone().add(V(1.0, 0, 1.55))], 'individual', n, .075));
      userCurves.shared.push(path(sharedPaths, [intakePoint.clone().add(V(0, 0, n * .14)), V(.7, 0, -1), hub.clone(), home.clone().add(V(1.0, 0, 1.55))], 'shared', n, .11));
    }
    access.userData.guideAnchor = V(.4, H(.4, -.5) + .2, -.5);
    clearGeometry(fields);
    const plots = setting === 'valley' ? [[1.8, 1.2], [3.2, 1.3], [4.5, -.25]] : [[2.25, -.1], [5.3, 3.3], [4.9, .5]];
    for (const [x, z] of plots) {
      const plot = new THREE.Group(); plot.position.set(x, H(x, z) + .06, z); fields.add(plot);
      box(plot, 1.0, .06, .73, 0, 0, 0, earth);
      for (let row = 0; row < 4; row++) for (let stalk = 0; stalk < 5; stalk++) cylinder(plot, .022, .14, -.38 + stalk * .18, .10, -.26 + row * .17, crop);
    }
    work.userData.guideAnchor = V(plots[0][0], H(plots[0][0], plots[0][1]) + .2, plots[0][1]);
    clearGeometry(livestockRoute);
    const routeX = setting === 'valley' ? 7.0 : 7.7, routePoints: THREE.Vector3[] = [];
    for (let n = 0; n <= 30; n++) { const z = 3.8 - n / 30 * 2.7; routePoints.push(V(routeX, H(routeX, z) + .075, z)); }
    livestockRoute.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePoints), 50, .065, 6, false), earth));
    storedLevels.length=0;clearGeometry(separateStorage); homePoints.forEach(point => storage(separateStorage, point.x + 1.3, point.z + 1.1));
    clearGeometry(intake); intake.position.set(intakePoint.x, H(intakePoint.x, intakePoint.z) + .10, intakePoint.z);
    box(intake, 1.35, .12, 1.2, 0, .05, 0, wood);
    for (const x of [-.58, .58]) for (const z of [-.5, .5]) cylinder(intake, .045, .7, x, .34, z, wood);
    box(intake, 1.3, .07, .07, 0, .72, -.5, wood); box(intake, .07, .07, 1.1, -.58, .72, 0, wood);
    clearGeometry(court);
    box(court, 1.8, .09, 1.65, hub.x, H(hub.x, hub.z) + .045, hub.z, earth);

    box(court, 1.1, .11, .35, hub.x, H(hub.x, hub.z) + .42, hub.z + .5, wood);
    shared.userData.guideAnchor = intake.position.clone().add(V(0, .4, 0));
    memory.position.set(6.7, H(6.7, 3.8) + .05, 3.8); memory.userData.guideAnchor = V(0, 1, 0);
  }

  const captions: Caption[] = [];
  function caption(id: string, text: string, priority: number) {
    const sprite = label(text, '#e9e5d5'), leader = line([V(0, 0, 0), V(0, 0, 0)], 0xc3d2ca, .5);
    sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; sprite.onBeforeRender = () => {}; sprite.renderOrder = 31; leader.renderOrder = 30;
    group.add(sprite, leader); captions.push({ id, text, sprite, leader, anchor: V(0, 0, 0), priority });
  }
  caption('living-water', '水源与河道：条件示意', 0);
  caption('living-land', '缓地：可利用条件设定', 1);
  caption('living-access', '取水与到达：需要使用安排', 2);
  caption('living-houses', '生活空间：由人的安排组织', 3);
  caption('living-memory', '地方记忆：继续查具体材料', 4);
  const note = label('教学条件对照 · 非真实村落、产量或历史复原', '#c2cec4'); note.onBeforeRender = () => {}; note.renderOrder = 32; group.add(note);
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screen = new THREE.Vector3(), tangent = new THREE.Vector3();
  const groundFocus = new THREE.Mesh(new THREE.TorusGeometry(.72, .035, 8, 72), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .85 })); groundFocus.rotation.x = -Math.PI / 2; groundFocus.name = 'living-attention-ring'; group.add(groundFocus);
  let previousSetting = '';
  return {
    group,
    update: (p: LivingProps, _time = 0, _dt = 0) => {
      if (disposed) return;
      const state = livingLandscapeState(p); group.userData.livingState = state;
      if (state.setting !== previousSetting) { rebuildNature(state.setting); previousSetting = state.setting; }
      const use = smooth(state.progress, .28, .68), final = smooth(state.progress, .68, 1), isShared = state.support === 'shared';
      access.visible = work.visible = housing.visible = state.stage > 0;
      privatePaths.visible = !isShared; sharedPaths.visible = isShared; shared.visible = isShared && state.stage > 0;
      intake.visible = true; court.visible = state.stage === 2; separateStorage.visible = true;
      memory.visible = p.viewKey === 'P3' && state.stage === 2;
      walkways.forEach(item => { const total = item.mesh.geometry.index!.count; item.mesh.geometry.setDrawRange(0, Math.floor(total * use / 42) * 42); item.steps.forEach(step => { step.object.visible = step.at <= use; }); });
      carriers.forEach((carrier, index) => {
        const curve = userCurves[state.support][index]; curve.getPoint(state.carry, carrier.position); carrier.position.y += .045;
        curve.getTangent(state.carry, tangent); carrier.rotation.y = Math.atan2(tangent.x, tangent.z);
        buckets[index].position.y=.20+smooth(state.progress,.72,.76)*.5;
        buckets[index].rotation.z=-smooth(state.progress,.74,.86)*.65;
        const shoulder=V(.11,.42,0),hand=buckets[index].position.clone(),arm=carrierArms[index];arm.position.copy(shoulder).lerp(hand,.5);arm.scale.y=shoulder.distanceTo(hand);arm.quaternion.setFromUnitVectors(V(0,1,0),hand.sub(shoulder).normalize());
        heldLevels[index].visible=state.carriedWater>.001;heldLevels[index].position.y=-.09+state.carriedWater*.20;
        const level=storedLevels[index];level.visible=state.storedWater>.001;level.position.y=-.2+state.storedWater*.44;
        carrier.updateWorldMatrix(true,true);level.updateWorldMatrix(true,false);
        const from=buckets[index].getWorldPosition(V(0,.0,0)).add(V(0,.1,0)),to=level.getWorldPosition(V(0,0,0));
        const attr=pouring[index].geometry.attributes.position as THREE.BufferAttribute;
        attr.setXYZ(0,from.x,from.y,from.z);attr.setXYZ(1,to.x,to.y,to.z);attr.needsUpdate=true;pouring[index].geometry.computeBoundingSphere();
        pouring[index].visible=state.stage>0&&state.pour>.001&&state.pour<.999;
        const tube=pourTubes[index];tube.visible=pouring[index].visible;tube.position.copy(from).lerp(to,.5);tube.scale.y=from.distanceTo(to);tube.quaternion.setFromUnitVectors(V(0,1,0),to.clone().sub(from).normalize());
      });
      access.userData.guideAnchor=carriers[0].position.clone().add(V(.1,.55,0));
      const animalZ = 3.8 - final * 2.7, animalX = setting === 'valley' ? 7.0 : 7.7;
      animal.position.set(animalX, H(animalX, animalZ) + .05, animalZ); animal.rotation.y = Math.PI;
      waterBeads.forEach((bead, index) => { const z = -10 + ((index / waterBeads.length + state.progress * .3) % 1) * 20; bead.position.set(channelX(z, setting), channelBed(z, setting) + .13, z); });
      group.updateMatrixWorld(true);
      let focus: THREE.Object3D = p.layer === 'water' ? water : p.layer === 'terrain' || state.stage === 0 ? land : state.stage === 2 ? housing : access;
      group.traverse(object => {
        if (object.userData.selectId !== p.selected || object.userData.screenAnnotation || !object.userData.guideAnchor) return;
        for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return;
        focus = object;
      });
      const focusPoint = focus.localToWorld((focus.userData.guideAnchor as THREE.Vector3).clone()); groundFocus.position.set(focusPoint.x, H(focusPoint.x, focusPoint.z) + .12, focusPoint.z);
      group.userData.focusId = focus.userData.selectId;
      runtime.renderer.getSize(viewport); runtime.camera.updateMatrixWorld();
      if (viewport.x < 2 || viewport.y < 2) return;
      const mobile = viewport.x < 600, px = mobile ? 22 : 25, focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const top = mobile?83:Math.min(108, viewport.y * .21), bottom = Math.max(top + px, viewport.y - (mobile?100:269)), occupied: { x: number; y: number; width: number }[] = [];
      let count = 0;
      const ordered = [...captions].sort((a, b) => Number(!!p.guide?.active&&p.guide.targets.includes(b.id)) - Number(!!p.guide?.active&&p.guide.targets.includes(a.id)) || Number(b.id === p.selected) - Number(a.id === p.selected) || a.priority - b.priority);
      for (const item of ordered) {
        item.sprite.visible = item.leader.visible = false;
        const subject = [water, land, access, housing, memory].find(object => object.userData.selectId === item.id)!;
        if (!subject.visible || count >= (mobile ? 3 : 4) || (state.stage === 2 && item.id === 'living-land' && p.selected !== item.id)) continue;
        item.anchor.copy(subject.localToWorld((subject.userData.guideAnchor as THREE.Vector3).clone())); projected.copy(item.anchor).project(runtime.camera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1) continue;
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2, width = Math.min(viewport.x - 24, item.text.length * (mobile ? 10 : 11) + 22);
        const x = THREE.MathUtils.clamp(ax, width / 2 + 10, viewport.x - width / 2 - 10), preferredY = THREE.MathUtils.clamp(ay - 25, top, bottom);
        let y = preferredY, found = false;
        for (const candidate of [preferredY, ...Array.from({ length: Math.floor((bottom - top) / (px + 8)) + 1 }, (_, index) => top + index * (px + 8))]) {
          if (!occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 5 && Math.abs(candidate - box.y) < px + 7)) { y = candidate; found = true; break; }
        }
        if (!found) continue;
        occupied.push({ x, y, width }); count++; item.sprite.visible = item.leader.visible = true;
        screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera); item.sprite.position.copy(screen);
        const h = px * screen.distanceTo(runtime.camera.position) / focal; item.sprite.scale.set(h * width / px, h, 1);
        const attr = item.leader.geometry.attributes.position as THREE.BufferAttribute; attr.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z); attr.setXYZ(1, screen.x, screen.y, screen.z); attr.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      note.visible=!mobile||viewport.y>=500;
      screen.set(0, 1 - Math.max(36, viewport.y - 280) / viewport.y * 2, .55).unproject(runtime.camera); note.position.copy(screen);
      const noteHeight = 21 * screen.distanceTo(runtime.camera.position) / focal; note.scale.set(noteHeight * Math.min(viewport.x - 24, mobile ? 338 : 365) / 21, noteHeight, 1);
    },
    dispose: () => { if (disposed) return; disposed = true; disposeTree(group); },
  };
}
