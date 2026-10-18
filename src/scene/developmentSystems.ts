import * as THREE from 'three';
import { disposeTree, label, line, mineralTexture } from './environment';
import { developmentSystemState } from '../data/developmentUnderstanding';
import type { TibetSceneProps } from './TibetScene';

type Runtime = { renderer: { getSize: (target: THREE.Vector2) => THREE.Vector2 }; camera: THREE.PerspectiveCamera };
type Callout = { id: string; text: string; anchor: THREE.Vector3; sprite: THREE.Sprite; leader: THREE.Line; index: number; scene: number };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const GOLD = 0xeac885, TEAL = 0x77cdd3, MUTED = 0x586869;
const phase = (p: number, start: number, end: number) => THREE.MathUtils.smoothstep(p, start, end);

/** Generic physical condition models, deliberately independent from any real map. */
export function buildDevelopmentSystemsScene(runtime: Runtime) {
  const group = new THREE.Group(); group.name = 'development-conditions';
  const texture = mineralTexture(); texture.repeat.set(7, 5);
  const stone = new THREE.MeshStandardMaterial({ color: 0xa69c86, map: texture, bumpMap: texture, bumpScale: .035, roughness: .95 });
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x3e5557, roughness: .84, metalness: .08 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xd7d1bd, roughness: .89 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x596d77, roughness: .64, metalness: .17 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x79654b, roughness: .87 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc3d0cd, metalness: .62, roughness: .35 });
  const glow = new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: .12, roughness: .5 });
  const amber = new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: .12, roughness: .64 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263e43, roughness: .8 });
  const green = new THREE.MeshStandardMaterial({ color: 0x6f9480, roughness: 1 });
  const water = new THREE.MeshStandardMaterial({ color: 0x5eacbc, metalness: .15, roughness: .29 });

  function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function subject(parent: THREE.Object3D, id: string, x: number, z: number, anchor: THREE.Vector3) {
    const object = new THREE.Group(); object.userData.selectId = id; object.userData.guideId = id; object.userData.guideAnchor = anchor; object.position.set(x, 0, z); parent.add(object); return object;
  }
  function building(parent: THREE.Object3D, x: number, z: number, size = 1) {
    const object = new THREE.Group(); object.position.set(x, 0, z); parent.add(object);
    box(object, 1.35 * size, .12, 1.35 * size, 0, .08, 0, stone);
    box(object, 1.14 * size, 1.05 * size, 1.05 * size, 0, .65 * size, 0, wall);
    box(object, 1.4 * size, .16 * size, 1.34 * size, 0, 1.25 * size, 0, roof);
    box(object, .32 * size, .65 * size, .035, 0, .49 * size, .54 * size, dark);
    for (const side of [-1, 1]) box(object, .19 * size, .25 * size, .05, side * .35 * size, .85 * size, .55 * size, glow);
    return object;
  }
  function person(parent: THREE.Object3D, x: number, z: number, material = amber) {
    const object = new THREE.Group(); object.position.set(x, .16, z); parent.add(object);
    cylinder(object, .1, .34, 0, .22, 0, material);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.115, 14, 10), material); head.position.y = .5; object.add(head);
    return object;
  }
  function groundPath(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, material = stone, width = .65) {
    const midpoint = start.clone().lerp(end, .5), length = start.distanceTo(end);
    const mesh = box(parent, width, .10, length, midpoint.x, .055, midpoint.z, material);
    mesh.rotation.y = Math.atan2(end.x - start.x, end.z - start.z); return mesh;
  }
  function gate(parent: THREE.Object3D, x: number, z: number) {
    const object = new THREE.Group(); object.position.set(x, 0, z); parent.add(object);
    for (const side of [-1, 1]) cylinder(object, .08, .8, side * .48, .4, 0, metal);
    const arm = box(object, .95, .12, .12, 0, .72, 0, amber); arm.position.x = -.03;
    return { object, arm };
  }
  function tree(parent: THREE.Object3D, x: number, z: number) {
    cylinder(parent, .07, .66, x, .33, z, wood);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.44, 1.15, 7), green); crown.position.set(x, 1.1, z); crown.castShadow = true; parent.add(crown);
  }

  const shape = new THREE.Shape(), w = 9.2, d = 5.5, r = .8;
  shape.moveTo(-w + r, -d); shape.lineTo(w - r, -d); shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r); shape.quadraticCurveTo(w, d, w - r, d); shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r); shape.lineTo(-w, -d + r); shape.quadraticCurveTo(-w, -d, -w + r, -d);
  const platformGeometry = new THREE.ExtrudeGeometry(shape, { depth: .48, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .12, bevelThickness: .10, curveSegments: 16 });
  platformGeometry.rotateX(-Math.PI / 2);
  const platform = new THREE.Mesh(platformGeometry, baseMaterial); platform.position.y = -.60; platform.receiveShadow = true; group.add(platform);
  box(group, 17.1, .08, 9.7, 0, -.045, 0, stone);
  for (let n = -4; n <= 4; n++) {
    const engraving = line([V(-8.3, .003, n), V(8.3, .003, n)], 0x657b78, .15); group.add(engraving);
  }

  const scenes = [new THREE.Group(), new THREE.Group(), new THREE.Group()]; scenes.forEach(scene => group.add(scene));
  const callouts: Callout[] = [];
  function callout(scene: number, id: string, text: string, anchor: THREE.Vector3, index: number) {
    const sprite = label(text, '#e6e7d9'), leader = line([anchor.clone(), anchor.clone()], 0xc5d4ce, .55);
    sprite.userData.selectId = id; sprite.userData.screenAnnotation = true; sprite.onBeforeRender = () => {}; sprite.renderOrder = 30;
    leader.renderOrder = 29; group.add(sprite, leader); callouts.push({ scene, id, text, anchor, index, sprite, leader });
  }

  // M1: the main channel exists before operation and the last segment are added.
  const channel = subject(scenes[0], 'development-link', 0, 0, V(-3.0, .2, -1.8)); channel.name = 'development-main-channel';
  groundPath(channel, V(-6.7, 0, -1.8), V(1.45, 0, -1.8), dark, 1.2);
  for (let n = 0; n < 24; n++) box(channel, .18, .1, 1.0, -6.5 + n * .33, .13, -1.8, wood);
  for (const side of [-1, 1]) box(channel, 8.05, .10, .08, -2.65, .22, -1.8 + side * .31, metal);
  building(channel, -6.6, -3.3, .9);
  const operation = subject(scenes[0], 'development-service', .95, -1.8, V(0, 1.1, 0)); operation.name = 'development-operation';
  box(operation, 1.8, .20, 2.0, 0, .12, 0, wall);
  for (const x of [-.72, .72]) for (const z of [-.65, .65]) cylinder(operation, .09, 1.5, x, .9, z, metal);
  box(operation, 2.1, .2, 2.2, 0, 1.76, 0, roof);
  const operationGate = gate(operation, 0, .66);
  const serviceStaff = person(operation, -.45, -.36, glow); serviceStaff.name = 'development-operating-staff';
  const serviceLamp = box(operation, .5, .12, .12, 0, 1.36, 1.1, glow);
  const train = new THREE.Group(); train.name = 'development-service-vehicle'; channel.add(train);
  box(train, 1.1, .43, .58, 0, .53, 0, wall); box(train, .8, .25, .47, 0, .88, 0, roof);
  for (const x of [-.33, .33]) for (const z of [-.28, .28]) cylinder(train, .115, .11, x, .25, z, metal).rotation.z = Math.PI / 2;
  const access = subject(scenes[0], 'development-lastmile', 0, 0, V(3.7, .4, .0)); access.name = 'development-lastmile';
  const accessPaving = new THREE.Group(); access.add(accessPaving);
  groundPath(accessPaving, V(1.3, 0, -1.1), V(3.4, 0, .2)); groundPath(accessPaving, V(3.4, 0, .2), V(5.4, 0, 1.8));
  const accessGate = gate(access, 3.35, .16); accessGate.object.rotation.y = -.9;
  const destination = subject(scenes[0], 'development-community', 5.6, 2.0, V(0, 1, 0)); destination.name = 'development-transport-community';
  building(destination, 0, 0, 1.2); building(destination, 1.3, -.75, .7); tree(destination, -1.1, -.7);
  const traveler = person(scenes[0], -6.0, -1.4); traveler.name = 'development-final-user';
  callout(0, 'development-link', '通道：空间相连', V(-3.8, .4, -1.8), 0);
  callout(0, 'development-service', '服务：日期、班次与使用条件', V(.95, 1.6, -1.8), 1);
  callout(0, 'development-lastmile', '接驳：到达生活地点', V(4.3, .5, .7), 2);

  // M2: a facility, an operating service, and a usable approach are distinct.
  const facility = subject(scenes[1], 'development-facility', 0, -1.5, V(0, 1.8, 0)); facility.name = 'development-public-facility';
  box(facility, 3.8, .2, 2.8, 0, .12, 0, stone);
  box(facility, 3.2, 1.75, 2.1, 0, 1.1, 0, wall); box(facility, 3.7, .21, 2.6, 0, 2.13, 0, roof);
  for (const x of [-1.05, -.55, .55, 1.05]) box(facility, .30, .65, .06, x, 1.2, 1.08, glow);
  const doorway = box(facility, .72, 1.2, .08, 0, .8, 1.1, dark);
  const shutter = box(facility, .7, 1.18, .08, 0, .80, 1.16, roof); shutter.name = 'development-facility-shutter';
  const staffing = subject(scenes[1], 'development-staff', 0, -1.5, V(.75, .6, 1.4)); staffing.name = 'development-facility-staff';
  const staffPeople = new THREE.Group(); staffing.add(staffPeople); person(staffPeople, .75, 1.6, glow); person(staffPeople, -.75, 1.6, glow);
  box(staffing, .42, .15, .15, 0, 2.0, 1.2, glow);
  const serviceAccess = subject(scenes[1], 'development-lastmile', 0, 0, V(0, .35, 1.7)); serviceAccess.name = 'development-facility-approach';
  const approachPaving = new THREE.Group(); serviceAccess.add(approachPaving);
  groundPath(approachPaving, V(-5.5, 0, 2.3), V(0, 0, 1.2)); groundPath(approachPaving, V(5.5, 0, 2.3), V(0, 0, 1.2)); groundPath(approachPaving, V(0, 0, 1.2), V(0, 0, -.2));
  const approachGate = gate(serviceAccess, 0, 1.1);
  const households = subject(scenes[1], 'development-community', 0, 0, V(-5.5, .9, 2.3)); households.name = 'development-service-users';
  building(households, -5.5, 2.3, 1.1); building(households, 5.5, 2.3, 1.1);
  const userA = person(households, -4.7, 2.4), userB = person(households, 4.7, 2.4);
  userA.name = 'development-user-a'; userB.name = 'development-user-b';
  userA.userData.guideId='development-users';userA.userData.guideAnchor=V(0,.5,0);
  callout(1, 'development-facility', '设施：空间中有什么', V(0, 2.2, -1.5), 0);
  callout(1, 'development-staff', '运营：人员、开放与服务内容', V(.75, .75, -.05), 1);
  callout(1, 'development-lastmile', '使用：能否到达、能否使用', V(0, .3, 1.7), 2);

  // M3: the same generic shelter has a material function and enters sightlines.
  // One blank stone stands for a material object, not the three real stele positions.
  const activity = subject(scenes[2], 'development-activity', 0, 0, V(0, 1.3, 0)); activity.name = 'development-same-activity';
  activity.userData.modelScope='generic-shelter-not-jokhang-stele-layout-or-built-proposal';
  cylinder(activity, 1.55, .24, 0, .13, 0, roof); cylinder(activity, 1.12, .18, 0, .34, 0, wall);
  for (const x of [-.62, .62]) for (const z of [-.62, .62]) cylinder(activity, .07, 1.3, x, 1.0, z, metal);
  const shelterRoof=box(activity, 1.9, .18, 1.9, 0, 1.72, 0, roof);shelterRoof.name='development-generic-shelter-roof';
  const benefit = subject(scenes[2], 'development-benefit', -5, -.9, V(5, 1.1, .9)); benefit.name = 'development-benefit-question';
  const protectedStone=box(benefit,.48,.90,.20,5,.91,.90,stone);protectedStone.name='development-uninscribed-material';protectedStone.userData.reconstruction=false;
  box(benefit,.66,.10,.40,5,.49,.90,stone);
  cylinder(benefit, 1.75, .20, 0, .11, 0, stone); box(benefit, 1.7, .16, .8, 0, 1, 0, wood);
  for (const x of [-.65, .65]) box(benefit, .12, .8, .12, x, .55, 0, wood);
  box(benefit,.50,.18,.35,-.35,1.17,0,stone);box(benefit,.50,.035,.36,.35,1.10,0,wall);
  person(benefit, -.8, .75); person(benefit, .8, .75);
  const externalInputs=new THREE.Group();externalInputs.name='development-qualitative-exposure';activity.add(externalInputs);
  const exposureDrops=Array.from({length:9},(_,index)=>{const drop=cylinder(externalInputs,.025,.19,(index%3-1)*.48,3.05+Math.floor(index/3)*.25,(Math.floor(index/3)-1)*.48,water);drop.name='development-exposure-marker';return {drop,startY:drop.position.y};});
  const ecology = subject(scenes[2], 'development-ecology', 4.6, -2.0, V(0, 1.1, 0)); ecology.name = 'development-ecology-question';
  cylinder(ecology, 1.75, .20, 0, .11, 0, stone);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(.8, 48), water); pond.rotation.x = -Math.PI / 2; pond.position.set(-.35, .22, .25); ecology.add(pond);
  tree(ecology, .65, -.55); tree(ecology, -.7, -.6); tree(ecology, .85, .65);
  const viewScope=new THREE.Group();viewScope.name='development-setting-observation';ecology.add(viewScope);
  const viewer=person(viewScope,-1.2,-.95,amber);viewer.name='development-setting-viewer';viewer.scale.setScalar(1.8);
  const background=box(viewScope,1.25,2.30,.18,-7.6,1.36,3.55,wall);background.name='development-generic-setting-reference';
  const eye=V(3.4,1.08,-2.95),backgroundTarget=V(-3,2.25,1.55);
  const sightline=line([eye.clone(),eye.clone()],GOLD,.88);sightline.name='development-sightline-before-obstruction';sightline.userData.guideId='development-sightline';sightline.userData.guideAnchor=eye.clone();scenes[2].add(sightline);
  const hiddenSightline=line([eye.clone(),backgroundTarget.clone()],0x8c9b91,.35,true);hiddenSightline.name='development-sightline-behind-obstruction';scenes[2].add(hiddenSightline);
  const viewRay=new THREE.Raycaster(eye,backgroundTarget.clone().sub(eye).normalize(),0,eye.distanceTo(backgroundTarget));
  const community = subject(scenes[2], 'development-community', 1.3, 3.4, V(0, .9, 0)); community.name = 'development-community-question';
  cylinder(community, 1.75, .20, 0, .11, 0, stone); building(community, -.45, 0, .8);
  box(community, .9, .13, .38, .75, .45, .45, wood);
  const heritageUser=person(community,.8,1);heritageUser.name='development-heritage-user';
  const maintenanceWorker=person(community,1.4,.4);maintenanceWorker.name='development-maintenance-worker';
  const maintenanceTool=cylinder(maintenanceWorker,.025,.95,-.35,.85,0,wood);maintenanceTool.rotation.z=-Math.PI/3;
  const inquiryPaths = [
    { object: benefit, path: groundPath(scenes[2], V(-1.4, 0, -.25), V(-3.1, 0, -.6), amber, .32), since: 0 },
    { object: ecology, path: groundPath(scenes[2], V(1.2, 0, -.6), V(3.0, 0, -1.3), glow, .32), since: 1 },
    { object: community, path: groundPath(scenes[2], V(.5, 0, 1.3), V(.85, 0, 1.8), glow, .32), since: 2 },
  ];
  for (const item of inquiryPaths) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.82, .045, 8, 80), item.since === 0 ? amber : glow);
    ring.rotation.x = -Math.PI / 2; ring.position.y = .23; ring.name = 'development-included-question'; item.object.add(ring);
  }
  callout(2, 'development-activity', '同一遮护构造 · 通用几何', V(0, 2.05, 0), 0);
  callout(2, 'development-benefit', '材料：落线先遇屋面', V(0, 1.15, .1), 0);
  callout(2, 'development-ecology', '环境：同一构造也进入视线', V(.4, 1.65, -.8), 1);
  callout(2, 'development-community', '生活：使用与持续维护', V(1.3, 1.3, 3.4), 2);

  const surroundings = subject(group, 'development-ecology', -6.7, 4.0, V(0, .8, 0)); surroundings.name = 'development-environment-context';
  tree(surroundings, -.4, -.1); tree(surroundings, .45, .2);
  const focusRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, .055, 10, 80), glow); focusRing.name = 'development-attention-ring'; focusRing.rotation.x = -Math.PI / 2; group.add(focusRing);

  const note = label('教学条件模型 · 无真实位置、分值或成效数据', '#c4cec7'); note.onBeforeRender = () => {}; note.renderOrder = 31; group.add(note);
  const heritageNote=label('通用遮护与视线 · 非三碑/遗产复原、方案或保护成效','#c4cec7');heritageNote.name='development-heritage-scope-note';heritageNote.onBeforeRender=()=>{};heritageNote.renderOrder=31;group.add(heritageNote);
  const viewport = new THREE.Vector2(), screen = new THREE.Vector3(), projected = new THREE.Vector3();
  let disposed = false;
  return {
    group,
    update: (p: TibetSceneProps, _time = 0, _dt = 0) => {
      if (disposed) return;
      const state = developmentSystemState(p.step, p.progress), progress = state.progress;
      group.userData.conditionState = state;
      scenes.forEach((scene, index) => { scene.visible = index === state.step; });
      surroundings.visible = state.step !== 2;
      serviceStaff.visible = state.serviceEnabled; serviceLamp.visible = state.serviceEnabled;
      operationGate.arm.rotation.z = state.serviceEnabled ? -Math.PI / 2 : 0;
      accessPaving.visible = state.accessEnabled; accessGate.arm.rotation.z = state.accessEnabled ? -Math.PI / 2 : 0;
      train.position.set(THREE.MathUtils.lerp(-5.8, .65, phase(progress, .32, .67)), 0, -1.8);
      traveler.position.copy(state.accessEnabled ? V(1.4, .16, -1.1).lerp(V(5.1, .16, 1.6), phase(progress, .68, 1)) : V(state.serviceEnabled ? .8 : -6.0, .16, state.serviceEnabled ? -.7 : -1.3));
      staffing.visible = state.serviceEnabled; staffPeople.visible = state.serviceEnabled;
      shutter.scale.y = state.serviceEnabled ? .08 : 1; shutter.position.y = state.serviceEnabled ? 1.37 : .8;
      doorway.visible = true; approachPaving.visible = state.accessEnabled; approachGate.arm.rotation.z = state.accessEnabled ? -Math.PI / 2 : 0;
      const approach = phase(progress, .68, 1);
      userA.position.copy(V(-4.7, .16, 2.4).lerp(V(-.4, .16, .3), approach)); userB.position.copy(V(4.7, .16, 2.4).lerp(V(.4, .16, .3), approach));
      for (const item of inquiryPaths) {
        item.path.visible = state.stage >= item.since;
        // Objects stay in place at equal physical size; the ring marks inclusion, not impact.
        item.object.getObjectByName('development-included-question')!.visible = state.stage >= item.since;
      }
      group.updateMatrixWorld(true);
      // Same roof and material remain fixed. Added inquiry reveals a real geometric
      // tradeoff, not a building phase, rainfall record or UNESCO impact calculation.
      const exposure=phase(progress,0,.30);
      exposureDrops.forEach(({drop,startY})=>drop.position.y=THREE.MathUtils.lerp(startY,1.91,exposure));
      viewScope.visible=state.stage>=1;sightline.visible=state.stage>=1;hiddenSightline.visible=state.stage>=1;
      const hit=viewRay.intersectObject(shelterRoof,false)[0],blockingPoint=hit?.point??backgroundTarget;
      const reveal=phase(progress,.32,.68),visibleEnd=eye.clone().lerp(blockingPoint,reveal);
      (sightline.userData.guideAnchor as THREE.Vector3).copy(eye).lerp(visibleEnd,.6);
      const setLine=(object:THREE.Line,a:THREE.Vector3,b:THREE.Vector3)=>{const attr=object.geometry.attributes.position as THREE.BufferAttribute;attr.setXYZ(0,a.x,a.y,a.z);attr.setXYZ(1,b.x,b.y,b.z);attr.needsUpdate=true;object.geometry.computeBoundingSphere();};
      setLine(sightline,eye,visibleEnd);setLine(hiddenSightline,blockingPoint,backgroundTarget);hiddenSightline.computeLineDistances();hiddenSightline.visible&&=reveal>.65;
      ecology.userData.sightlineBlocked=Boolean(hit);ecology.userData.blockingSubject=hit?shelterRoof.name:null;
      const participation=phase(progress,.68,1);
      heritageUser.position.copy(V(.8,.16,1).lerp(V(-.5,.16,-1.5),participation));
      maintenanceWorker.position.copy(V(1.4,.16,.4).lerp(V(.5,.16,-2.6),participation));
      group.updateMatrixWorld(true);
      const layerTarget = state.step === 0
        ? p.layer === 'settlements' ? destination : p.layer === 'ecology' ? surroundings : operation
        : state.step === 1 ? p.layer === 'transport' ? serviceAccess : p.layer === 'ecology' ? surroundings : facility
        : p.layer === 'settlements' ? community : p.layer === 'transport' ? activity : ecology;
      let focused: THREE.Object3D = layerTarget;
      group.traverse(object => {
        if (object.userData.selectId !== p.selected || object.userData.screenAnnotation || !object.userData.guideAnchor) return;
        for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return;
        focused = object;
      });
      const anchor = focused.userData.guideAnchor as THREE.Vector3 | undefined;
      const focusPosition = anchor ? focused.localToWorld(anchor.clone()) : focused.getWorldPosition(new THREE.Vector3()); focusRing.position.set(focusPosition.x, .24, focusPosition.z);
      focusRing.visible = true; group.userData.focusId = focused.userData.selectId;
      runtime.renderer.getSize(viewport); runtime.camera.updateMatrixWorld();
      if (viewport.x < 2 || viewport.y < 2) return;
      const mobile = viewport.x < 600, compact=viewport.y<520,pixelHeight = mobile ? 22 : 25;
      const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
      const top = compact?80:Math.min(112, viewport.y * .21), bottom = Math.max(top + pixelHeight, viewport.y - (compact?105:295));
      const occupied: { x: number; y: number; width: number }[] = [84,125,166].map(y=>({x:viewport.x-35,y,width:58}));
      const priority=(id:string)=>p.guide?.active&&p.guide.targets.includes(id)?2:id===p.selected?1:0;let labelCount=0;
      for (const item of [...callouts].sort((a,b)=>priority(b.id)-priority(a.id))) {
        // Hidden labels must also restore deterministically after a backward seek.
        item.sprite.position.set(0,0,0);item.sprite.scale.set(1,1,1);item.sprite.material.color.setHex(0xffffff);
        const baseline=item.leader.geometry.attributes.position as THREE.BufferAttribute;
        baseline.setXYZ(0,item.anchor.x,item.anchor.y,item.anchor.z);baseline.setXYZ(1,item.anchor.x,item.anchor.y,item.anchor.z);baseline.needsUpdate=true;
        (item.leader.material as THREE.LineBasicMaterial).opacity=.55;
        item.sprite.visible = item.leader.visible = item.scene === state.step&&(!compact||labelCount<3)&&(item.index<=state.stage);
        if (!item.sprite.visible) continue;
        projected.copy(item.anchor).project(runtime.camera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1) { item.sprite.visible = item.leader.visible = false; continue; }
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        const width = Math.min(viewport.x - 26, item.text.length * (mobile ? 10 : 11) + 22);
        const initialX = THREE.MathUtils.clamp(ax, width / 2 + 12, viewport.x - width / 2 - 12);
        let x = initialX, y = THREE.MathUtils.clamp(ay - 24, top, bottom), found = false;
        for (const candidateY of [y, ...Array.from({ length: Math.max(1, Math.floor((bottom - top) / (pixelHeight + 8)) + 1) }, (_, n) => top + n * (pixelHeight + 8))]) {
          if (!occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 5 && Math.abs(candidateY - box.y) < pixelHeight + 7)) { y = candidateY; found = true; break; }
        }
        if (!found) { item.sprite.visible = item.leader.visible = false; continue; }
        occupied.push({ x, y, width });labelCount++;
        screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, projected.z).unproject(runtime.camera); item.sprite.position.copy(screen);
        const h = pixelHeight * screen.distanceTo(runtime.camera.position) / focal; item.sprite.scale.set(h * width / pixelHeight, h, 1);
        const emphasis = item.id === p.selected || item.index <= state.stage;
        item.sprite.material.color.setHex(emphasis ? 0xffffff : MUTED); (item.leader.material as THREE.LineBasicMaterial).opacity = emphasis ? .68 : .26;
        const attr = item.leader.geometry.attributes.position as THREE.BufferAttribute; attr.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z); attr.setXYZ(1, screen.x, screen.y, screen.z); attr.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      note.visible=!compact&&state.step!==2;heritageNote.visible=!compact&&state.step===2;const activeNote=state.step===2?heritageNote:note;
      screen.set(0, 1 - Math.max(36, viewport.y - 285) / viewport.y * 2, .55).unproject(runtime.camera); activeNote.position.copy(screen);
      const h = 21 * screen.distanceTo(runtime.camera.position) / focal; activeNote.scale.set(h * Math.min(viewport.x - 24, mobile ? 338 : 440) / 21, h, 1);
    },
    dispose: () => { if (disposed) return; disposed = true; disposeTree(group); },
  };
}
