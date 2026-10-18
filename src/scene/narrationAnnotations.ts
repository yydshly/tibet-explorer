import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { TibetSceneProps } from './TibetScene';
import type {SceneSettings} from '../lib/store';

/** Attention marks, never surveyed boundaries, physical trajectories or roads. */
export interface NarrationGuideState {
  cueId: string;
  progress: number;
  active: boolean;
  beatId: string;
  targets: string[];
  drawProgress: number;
  relation: 'focus' | 'sequence' | 'compare';
  title: string;
  explanation: string;
  phraseId?:string;action?:string;actionProgress?:number;textProgress?:number;timingPrecision?:'provider'|'estimated';comparison?:string;
  textStart?:number;textEnd?:number;sceneProgress?:number;sceneSettings?:Partial<SceneSettings>;
}

type GuideProps = TibetSceneProps & { guide?: NarrationGuideState };
type ViewportRenderer = { getSize: (value: THREE.Vector2) => THREE.Vector2 };
type Anchor = { id: string; center: THREE.Vector3; bounds: THREE.Box3 };
type Stroke = { line: Line2; geometry: LineGeometry; material: LineMaterial };
const GOLD = 0xffd58a, TEAL = 0x86e3e7;
const clamp = (value: number) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);

function visibleObject(object: THREE.Object3D) {
  for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
    if (!parent.visible || parent.userData.screenAnnotation || parent.userData.narrationAnnotation) return false;
  }
  return true;
}

function visibleMaterial(object: THREE.Object3D) {
  const material = (object as THREE.Mesh).material;
  return !material || (Array.isArray(material) ? material : [material]).some(value => value.visible && (!value.transparent || value.opacity > .015));
}

function vector(value: unknown) {
  if (value instanceof THREE.Vector3 && value.toArray().every(Number.isFinite)) return value.clone();
  if (Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)) return new THREE.Vector3(value[0], value[1], value[2]);
  return null;
}

function explicitBounds(object: THREE.Object3D) {
  const value = object.userData.guideBounds;
  if (value instanceof THREE.Box3 && !value.isEmpty()) return value.clone().applyMatrix4(object.matrixWorld);
  if (value && typeof value === 'object') {
    const min = vector(value.min), max = vector(value.max);
    if (min && max) return new THREE.Box3(min, max).applyMatrix4(object.matrixWorld);
  }
  return null;
}

/** Existing source objects define anchors; a label sprite alone is not evidence of an object. */
function findAnchor(model: THREE.Group, id: string): Anchor | null {
  const meshes = new THREE.Box3(), otherGeometry = new THREE.Box3();
  let explicit: Anchor | null = null;
  model.traverse(object => {
    if (explicit || (object.userData.selectId !== id && object.userData.guideId !== id) || !visibleObject(object) || !visibleMaterial(object)) return;
    const specified = vector(object.userData.guideAnchor), specifiedBounds = explicitBounds(object);
    if (specified || specifiedBounds) {
      const center = specified ? object.localToWorld(specified) : specifiedBounds!.getCenter(new THREE.Vector3());
      explicit = { id, center, bounds: specifiedBounds ?? new THREE.Box3(center.clone(), center.clone()) };
      return;
    }
    const visit = (child: THREE.Object3D) => {
      if (!visibleObject(child) || !visibleMaterial(child) || child instanceof THREE.Sprite) return;
      if (child !== object && child.userData.selectId && child.userData.selectId !== id) return;
      const geometry = (child as THREE.Mesh).geometry;
      if (geometry instanceof THREE.BufferGeometry) {
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        if (geometry.boundingBox && !geometry.boundingBox.isEmpty()) {
          const box = geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
          (child instanceof THREE.Mesh ? meshes : otherGeometry).union(box);
        }
      }
      for (const descendant of child.children) visit(descendant);
    };
    visit(object);
  });
  if (explicit) return explicit;
  const bounds = meshes.isEmpty() ? otherGeometry : meshes;
  if (bounds.isEmpty()) return null;
  const center = bounds.getCenter(new THREE.Vector3());
  return center.toArray().every(Number.isFinite) ? { id, center, bounds } : null;
}

function partialPath(points: THREE.Vector3[], progress: number) {
  const p = clamp(progress);
  if (points.length < 2 || p <= 0) return [];
  if (p >= 1) return points;
  const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]));
  let remaining = lengths.reduce((total, length) => total + length, 0) * p;
  const result = [points[0]];
  for (let index = 0; index < lengths.length; index++) {
    if (remaining >= lengths[index]) { result.push(points[index + 1]); remaining -= lengths[index]; }
    else { result.push(points[index].clone().lerp(points[index + 1], lengths[index] > 0 ? remaining / lengths[index] : 0)); break; }
  }
  return result;
}

export function buildNarrationAnnotations(modelGroup: THREE.Group, camera: THREE.PerspectiveCamera, renderer: ViewportRenderer) {
  const group = new THREE.Group();
  group.name = 'narration-attention-guides';
  group.userData.narrationAnnotation = true;
  group.visible = false;
  const strokes: Stroke[] = [];
  const viewport = new THREE.Vector2();
  let disposed = false;

  function stroke(color: number, width = 2.1, opacity = .94): Stroke {
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, .001, 0, 0]);
    const material = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false });
    const line = new Line2(geometry, material); line.renderOrder = 90; line.frustumCulled = false; line.visible = false;
    line.userData.narrationAnnotation = true;
    // Attention overlays must never intercept the scene's own object selection.
    line.raycast = () => {};
    group.add(line);
    const result = { line, geometry, material }; strokes.push(result); return result;
  }

  const targets = Array.from({ length: 4 }, (_, index) => {
    const color = index % 2 ? TEAL : GOLD;
    return { corners: Array.from({ length: 4 }, () => stroke(color)), dot: stroke(color, 3.6), center: new THREE.Vector3(), projected: new THREE.Vector3(), usable: false };
  });
  const connections = Array.from({ length: 3 }, () => ({ path: stroke(GOLD, 1.9, .86), tip: stroke(GOLD, 2.2) }));

  function setPath(item: Stroke, points: THREE.Vector3[], progress = 1) {
    const partial = partialPath(points, progress);
    item.line.visible = partial.length > 1;
    if (!item.line.visible) return;
    item.geometry.setPositions(partial.flatMap(point => point.toArray()));
    item.material.resolution.copy(viewport);
  }

  function update(props: GuideProps) {
    if (disposed) return;
    for (const item of strokes) item.line.visible = false;
    const guide = props.guide;
    group.visible = !!guide?.active;
    if (!guide?.active) return;
    renderer.getSize(viewport);
    if (viewport.x < 2 || viewport.y < 2) { group.visible = false; return; }
    modelGroup.updateWorldMatrix(true, true); camera.updateMatrixWorld();
    const draw = clamp(guide.drawProgress), ids = [...new Set(guide.targets)].slice(0, targets.length);
    group.userData.beatId = guide.beatId;
    group.userData.cueId = guide.cueId;
    group.userData.drawProgress = draw;
    group.userData.targetIds = ids;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const worldAt = (center: THREE.Vector3, x: number, y: number, units: number) => center.clone().addScaledVector(right, x * units).addScaledVector(up, y * units);
    const unitsAt = (center: THREE.Vector3) => {
      const depth = -center.clone().applyMatrix4(camera.matrixWorldInverse).z;
      return 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / viewport.y;
    };

    targets.forEach((target, index) => {
      target.usable = false;
      const anchor = ids[index] ? findAnchor(modelGroup, ids[index]) : null;
      if (!anchor) return;
      target.center.copy(anchor.center); target.projected.copy(anchor.center).project(camera);
      const projected = target.projected;
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .97 || Math.abs(projected.y) > .97) return;
      const units = unitsAt(anchor.center);
      if (!Number.isFinite(units) || units <= 0) return;
      target.usable = true;
      const reveal = clamp((draw - (guide.relation === 'sequence' ? index * .12 : 0)) / .44);
      const size = anchor.bounds.getSize(new THREE.Vector3());
      // A broad terrain/sheet is never wrapped in a huge screen-filling frame.
      const halfWidth = THREE.MathUtils.clamp(size.length() / units * .25 + 10, 20, viewport.x < 600 ? 34 : 43);
      const halfHeight = Math.min(halfWidth * .72, 30), corner = 11;
      const corners = [
        [[-halfWidth, -halfHeight + corner], [-halfWidth, -halfHeight], [-halfWidth + corner, -halfHeight]],
        [[halfWidth - corner, -halfHeight], [halfWidth, -halfHeight], [halfWidth, -halfHeight + corner]],
        [[halfWidth, halfHeight - corner], [halfWidth, halfHeight], [halfWidth - corner, halfHeight]],
        [[-halfWidth + corner, halfHeight], [-halfWidth, halfHeight], [-halfWidth, halfHeight - corner]],
      ];
      target.corners.forEach((item, cornerIndex) => {
        item.material.color.setHex(guide.relation === 'compare' && index % 2 ? TEAL : GOLD);
        setPath(item, corners[cornerIndex].map(([x, y]) => worldAt(anchor.center, x, y, units)), clamp(reveal * 4 - cornerIndex));
      });
      target.dot.material.color.setHex(guide.relation === 'compare' && index % 2 ? TEAL : GOLD);
      const dot = Array.from({ length: 19 }, (_, n) => worldAt(anchor.center, Math.cos(n / 18 * Math.PI * 2) * 3.3, Math.sin(n / 18 * Math.PI * 2) * 3.3, units));
      setPath(target.dot, dot, clamp(reveal * 2));
    });

    if (guide.relation === 'focus') return;
    connections.forEach((connection, index) => {
      const from = targets[index], to = targets[index + 1];
      if (!from.usable || !to.usable) return;
      const progress = clamp((draw - .30 - index * .12) / .40);
      if (progress <= 0) return;
      const start = from.center, end = to.center, distancePx = Math.hypot((from.projected.x - to.projected.x) * viewport.x / 2, (from.projected.y - to.projected.y) * viewport.y / 2);
      if (distancePx < 40) return;
      const midpoint = start.clone().lerp(end, .5), units = unitsAt(midpoint);
      const curve = new THREE.QuadraticBezierCurve3(start, midpoint.clone().addScaledVector(up, Math.min(30, distancePx * .10) * units), end);
      // Offset the endpoints from the pinpoint, making this clearly a reading guide.
      const points = Array.from({ length: 37 }, (_, n) => curve.getPoint(.06 + .88 * n / 36));
      connection.path.material.color.setHex(guide.relation === 'compare' ? TEAL : GOLD);
      setPath(connection.path, points, progress);
      if (guide.relation !== 'sequence') return;
      const t = .06 + .88 * progress, tip = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
      const viewDirection = camera.getWorldDirection(new THREE.Vector3()), perpendicular = new THREE.Vector3().crossVectors(tangent, viewDirection).normalize();
      const arrowSize = unitsAt(tip) * 8;
      setPath(connection.tip, [tip.clone().addScaledVector(tangent, -arrowSize).addScaledVector(perpendicular, arrowSize * .47), tip, tip.clone().addScaledVector(tangent, -arrowSize).addScaledVector(perpendicular, -arrowSize * .47)]);
    });
  }

  return { group, update, dispose: () => {
    if (disposed) return;
    disposed = true; group.visible = false;
    for (const item of strokes) { item.geometry.dispose(); item.material.dispose(); }
    group.clear(); group.removeFromParent();
  } };
}
