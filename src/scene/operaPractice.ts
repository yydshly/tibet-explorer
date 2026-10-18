import * as THREE from 'three';
import { label } from './environment';

export type OperaLayout = 'circle' | 'stage';

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number, from: number, to: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** Authored observation/practice timing, not a skill score or historical sequence. */
export function operaPracticeState(progress: number) {
  const p = clamp(progress);
  return {
    progress: p,
    phase: p < .32 ? 'performance' as const : p < .68 ? 'watch' as const : 'practice' as const,
    readiness: ease(p, 0, .24),
    approach: ease(p, .32, .58),
    mentorMove: ease(p, .32, .55),
    join: ease(p, .68, .94),
  };
}

/**
 * A spatial relationship study for discussing performance and learning.
 * Neither layout reconstructs a venue, a dance, a ritual or an event. The small
 * cast is diagrammatic: its size is not a reported audience/performer count.
 * Both layouts retain the same cast and progress; all motion is reversible and
 * controlled only by update(). The owner disposes the returned tree.
 */
export function buildOperaPractice(): {
  group: THREE.Group;
  update: (progress: number, layout: OperaLayout) => void;
} {
  const group = new THREE.Group();
  group.name = 'opera-practice-model';

  const material = (color: number, roughness = .85) => new THREE.MeshStandardMaterial({ color, roughness });
  const groundMat = material(0x71817a);
  const paleStone = material(0xc4c4ad);
  const rimMat = material(0xa6ad99);
  const stageMat = material(0x95846b);
  const stageEdge = material(0x6a6658);
  const backdropMat = material(0x546761);
  const narratorMat = material(0xe4bd64, .66);
  const performerMat = material(0x4ca7a6, .68);
  const audienceMat = material(0x89999b);
  const learnerMat = material(0xda806d, .7);
  const skinNeutral = material(0xc1c8bc);
  const jointMat = material(0x4d5a59);
  const facingMat = material(0x273d43);

  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, name: string) => {
    const object = new THREE.Mesh(geometry, mat);
    object.name = name;
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (name: string, w: number, h: number, d: number, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const object = mesh(new THREE.BoxGeometry(w, h, d), mat, parent, name);
    object.position.set(x, y, z);
    return object;
  };
  const disc = (name: string, radius: number, height: number, mat: THREE.Material, parent: THREE.Object3D) =>
    mesh(new THREE.CylinderGeometry(radius, radius, height, 64), mat, parent, name);

  const space = new THREE.Group();
  space.name = 'opera-space';
  space.userData.selectId = 'opera-space';
  space.userData.guideAnchor = new THREE.Vector3(-.8, .14, 1.2);
  group.add(space);
  box('opera-ground', 9.8, .12, 7.5, groundMat, space, 0, -.09, 0);

  const openFloor = new THREE.Group();
  openFloor.name = 'opera-open-space';
  openFloor.position.set(-.65, 0, -.25);
  space.add(openFloor);
  const floor = disc('opera-open-floor', 2.85, .07, paleStone, openFloor);
  floor.position.y = .015;
  floor.scale.z = .79;
  const rim = mesh(new THREE.TorusGeometry(2.91, .035, 8, 96), rimMat, openFloor, 'opera-open-floor-rim');
  rim.rotation.x = -Math.PI / 2;
  rim.scale.y = .79;
  rim.position.y = .055;

  const stage = new THREE.Group();
  stage.name = 'opera-front-stage';
  space.add(stage);
  const platform = box('opera-stage-platform', 5.5, .36, 3.25, stageMat, stage, -.8, .15, -.95);
  box('opera-stage-front-edge', 5.56, .08, .1, stageEdge, stage, -.8, .32, .7);
  box('opera-stage-step-lower', 2.2, .12, .38, stageMat, stage, -.8, .03, 1.06);
  box('opera-stage-step-upper', 2.2, .24, .3, stageMat, stage, -.8, .09, .81);
  const sideUpper = box('opera-stage-side-step-upper', .3, .22, .85, stageMat, stage, 2.08, .08, -.8);
  const sideLower = box('opera-stage-side-step-lower', .3, .11, .85, stageMat, stage, 2.36, .025, -.8);
  const exitSupports = [platform, sideUpper, sideLower].map(object => new THREE.Box3().setFromObject(object));
  // A neutral framing plane shows one-facing spatial orientation, with no
  // architectural, costume, ritual or chronological attribution.
  box('opera-stage-backdrop', 5.2, 1.43, .08, backdropMat, stage, -.8, 1.045, -2.5);
  [-3.48, 1.88].forEach((x, i) => box(`opera-stage-frame-post-${i}`, .12, 1.65, .14, stageEdge, stage, x, 1.155, -2.5));
  box('opera-stage-frame-top', 5.48, .12, .16, stageEdge, stage, -.8, 1.92, -2.5);

  const performance = new THREE.Group();
  performance.name = 'opera-performance';
  performance.userData.selectId = 'opera-performance';
  performance.userData.guideAnchor = new THREE.Vector3(-1.5, .9, -.7);
  group.add(performance);
  const learning = new THREE.Group();
  learning.name = 'opera-learning';
  learning.userData.selectId = 'opera-learning';
  learning.userData.guideAnchor = new THREE.Vector3(3.45, .8, 1.1);
  group.add(learning);
  const audienceGroup = new THREE.Group();
  audienceGroup.name = 'opera-audience';
  audienceGroup.userData.selectId = 'opera-space';
  audienceGroup.userData.guideId = 'opera-audience';
  audienceGroup.userData.guideAnchor = new THREE.Vector3(0, .8, 2.4);
  group.add(audienceGroup);

  const person = (name: string, color: THREE.Material, parent: THREE.Object3D, seated = false) => {
    const actor = new THREE.Group();
    actor.name = name;
    parent.add(actor);
    const height = seated ? .67 : .96;
    const feet = disc(`${name}-base`, .22, .035, color, actor);
    feet.position.y = .018;
    if (seated) {
      const seat = disc(`${name}-seat`, .19, .17, stageEdge, actor);
      seat.position.y = .12;
      [-.08, .08].forEach((x, i) => box(`${name}-leg-${i}`, .075, .2, .09, jointMat, actor, x, .14, .13));
    } else {
      [-.075, .075].forEach((x, i) => box(`${name}-leg-${i}`, .085, .31, .11, jointMat, actor, x, .2, 0));
    }
    const torso = mesh(new THREE.CylinderGeometry(.115, .16, .38, 16), color, actor, `${name}-torso`);
    torso.position.y = height - .39;
    const head = mesh(new THREE.SphereGeometry(.13, 16, 12), skinNeutral, actor, `${name}-head`);
    head.position.y = height - .08;
    // One neutral directional mark makes facing readable; it is not a face or mask.
    const direction = mesh(new THREE.SphereGeometry(.034, 8, 6), facingMat, actor, `${name}-facing`);
    direction.scale.set(1, .55, .35);
    direction.position.set(0, height - .07, .126);
    [-1, 1].forEach((side, i) => {
      const arm = mesh(new THREE.CapsuleGeometry(.04, .23, 4, 8), color, actor, `${name}-arm-${i}`);
      arm.position.set(side * .175, height - .39, .025);
      arm.rotation.z = side * .08;
    });
    return actor;
  };

  const narrator = person('opera-narrator', narratorMat, performance);
  const partner = person('opera-performer-0', performerMat, performance);
  const mentor = person('opera-performer-mentor', performerMat, performance);
  const learner = person('opera-learner', learnerMat, learning);
  learner.userData.selectId = 'opera-learning';
  learner.userData.guideAnchor = new THREE.Vector3(0, .8, 0);

  // Counts and spacing are graphical choices, held fixed between both layouts.
  const audience = Array.from({ length: 12 }, (_, i) => person(`opera-audience-${i}`, audienceMat, audienceGroup, true));

  const practice = disc('opera-practice-area', .9, .045, rimMat, learning);
  practice.position.set(3.45, .012, .55);
  practice.scale.z = .9;
  const practiceEdge = mesh(new THREE.TorusGeometry(.92, .025, 8, 64), performerMat, learning, 'opera-practice-area-rim');
  practiceEdge.rotation.x = -Math.PI / 2;
  practiceEdge.scale.y = .9;
  practiceEdge.position.set(3.45, .043, .55);

  const makeLabel = (name: string, text: string, x: number, y: number, z: number, width: number, id: string, color = '#ece4cc') => {
    const textObject = label(text, color, width);
    textObject.name = name;
    textObject.userData.selectId = id;
    textObject.position.set(x, y, z);
    group.add(textObject);
    return textObject;
  };
  const openLabel = makeLabel('opera-open-label', '开放场地关系', -1.25, .3, 3.22, 2.2, 'opera-space');
  const stageLabel = makeLabel('opera-stage-label', '正面舞台关系', -1.25, .3, 3.22, 2.2, 'opera-space');
  makeLabel('opera-performance-label', '叙述角色与表演角色', -1.35, 1.84, -.65, 2.7, 'opera-performance');
  const observeLabel = makeLabel('opera-observe-label', '接近与观看', 3.2, 1.64, 1.1, 1.9, 'opera-learning', '#aee1db');
  const joinLabel = makeLabel('opera-practice-label', '一起练习的机会', 3.2, 1.64, 1.1, 2.25, 'opera-learning', '#aee1db');

  const face = (actor: THREE.Object3D, target: THREE.Vector3) => {
    actor.rotation.y = Math.atan2(target.x - actor.position.x, target.z - actor.position.z);
  };
  const openMentor = new THREE.Vector3(.05, .055, -.85);
  const stageMentor = new THREE.Vector3(.25, .33, -.8);
  const practiceMentor = new THREE.Vector3(3.1, .055, .12);
  const learnerStart = new THREE.Vector3(2.45, .055, 3.12);
  const learnerWatching = new THREE.Vector3(3.84, .055, 1.63);
  const learnerPracticing = new THREE.Vector3(3.77, .055, .8);
  const sharedPracticeCentre = new THREE.Vector3(3.45, .055, .48);
  const openCentre = new THREE.Vector3(-.65, .055, -.25);
  const stageFacing = new THREE.Vector3(-.8, .33, 3);
  const stageMentorPath = [stageMentor, new THREE.Vector3(1.87, .33, -.8), new THREE.Vector3(2.08, .19, -.8), new THREE.Vector3(2.36, .08, -.8), new THREE.Vector3(2.6, .055, -.6), practiceMentor];
  const mentorPathPosition = (amount: number) => {
    const segment = clamp(amount) * (stageMentorPath.length - 1);
    const index = Math.min(stageMentorPath.length - 2, Math.floor(segment));
    return stageMentorPath[index].clone().lerp(stageMentorPath[index + 1], segment - index);
  };

  const update = (progress: number, layout: OperaLayout) => {
    const state = operaPracticeState(progress);
    const isStage = layout === 'stage';
    group.userData.operaState = { ...state, layout: isStage ? 'stage' : 'circle' };
    stage.visible = isStage;
    openFloor.visible = !isStage;
    openLabel.visible = !isStage;
    stageLabel.visible = isStage;
    const floorY = isStage ? .33 : .055;
    narrator.position.set(-1.85, floorY, isStage ? -.75 : -.65);
    partner.position.set(-.75, floorY, isStage ? -1.25 : -.95);
    if (isStage) {
      mentor.position.copy(mentorPathPosition(state.mentorMove));
      // Keep the feet on the supporting tread until they cross its edge;
      // interpolating height early would move them through the solid platform.
      mentor.position.y = exitSupports.reduce((height, bounds) =>
        mentor.position.x >= bounds.min.x && mentor.position.x <= bounds.max.x &&
        mentor.position.z >= bounds.min.z && mentor.position.z <= bounds.max.z
          ? Math.max(height, bounds.max.y) : height, .055);
    } else mentor.position.copy(openMentor).lerp(practiceMentor, state.mentorMove);
    face(narrator, isStage ? stageFacing : new THREE.Vector3(-1.05, floorY, 1.5));
    face(partner, isStage ? stageFacing : new THREE.Vector3(-.35, floorY, 1.5));
    learner.position.copy(learnerStart).lerp(learnerWatching, state.approach).lerp(learnerPracticing, state.join);
    face(mentor, state.join > 0 ? sharedPracticeCentre : learner.position);
    face(learner, state.join > 0 ? sharedPracticeCentre : state.approach > 0 ? mentor.position : openCentre);
    audience.forEach((actor, i) => {
      if (isStage) {
        actor.position.set(-3.02 + (i % 6) * .82, .055, 2.05 + Math.floor(i / 6) * .9);
        face(actor, new THREE.Vector3(-.8, .33, -.65));
      } else {
        // Open at the right/front so the learning area and access remain legible.
        const angle = THREE.MathUtils.degToRad(134 + i * 26.6);
        actor.position.set(-.65 + Math.sin(angle) * 3.7, .055, -.25 - Math.cos(angle) * 2.9);
        face(actor, openCentre);
      }
    });
    audienceGroup.userData.guideAnchor.copy(audience[2].position).add(new THREE.Vector3(0,.65,0));
    practice.visible = state.progress >= .32;
    practiceEdge.visible = practice.visible;
    observeLabel.visible = state.phase === 'watch';
    joinLabel.visible = state.phase === 'practice';
    performance.userData.guideAnchor.copy(narrator.position).add(new THREE.Vector3(0, .75, 0));
    learning.userData.guideAnchor.copy(learner.position).add(new THREE.Vector3(0, .8, 0));
    space.userData.guideAnchor.set(-.8, isStage ? .36 : .1, .6);
    group.updateMatrixWorld(true);
  };
  update(0, 'circle');
  return { group, update };
}
