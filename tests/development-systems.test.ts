import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildDevelopmentSystemsScene } from '../src/scene/developmentSystems';
import { developmentUnderstanding, developmentSystemState, developmentSourceIds } from '../src/data/developmentUnderstanding';
import type { TibetSceneProps } from '../src/scene/TibetScene';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});

function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 180);
  camera.position.set(16, 13, 20); camera.lookAt(0, .8, 0); camera.updateMatrixWorld();
  const renderer = { getSize: (target: THREE.Vector2) => target.set(width, height) };
  const model = buildDevelopmentSystemsScene({ renderer, camera });
  const props: TibetSceneProps = { scene: 'modern', step: 0, viewKey: 'M1', season: 1, layer: 'transport', progress: .12, playing: false, selected: 'lhasa', cutaway: false, resetKey: 0, onSelect: () => {}, onInteract: () => {} };
  return { model, props };
}

function visibleInTree(object: THREE.Object3D) {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) if (!current.visible) return false;
  return true;
}

function snapshot(group: THREE.Group) {
  const values: unknown[] = [];
  group.traverse(object => {
    const mesh = object as THREE.Mesh;
    values.push([object.name, object.visible, ...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()]);
    if (mesh.geometry) values.push(Array.from(mesh.geometry.attributes.position.array));
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) values.push([material.opacity, (material as THREE.MeshBasicMaterial).color?.getHex()]);
  });
  return values;
}

describe('development conditions in three dimensions', () => {
  it('keeps the main transport channel while adding operation, then the last segment', () => {
    const { model, props } = fixture();
    const channel = model.group.getObjectByName('development-main-channel')!;
    const staff = model.group.getObjectByName('development-operating-staff')!;
    const access = model.group.getObjectByName('development-lastmile')!;
    const traveler = model.group.getObjectByName('development-final-user')!;
    model.update(props); const initialUser = traveler.position.clone();
    expect(visibleInTree(channel)).toBe(true); expect(visibleInTree(staff)).toBe(false); expect(access.children[0].visible).toBe(false);
    model.update({ ...props, progress: .56 }); const intermediateUser = traveler.position.clone();
    expect(visibleInTree(staff)).toBe(true); expect(access.children[0].visible).toBe(false); expect(intermediateUser.x).toBeGreaterThan(initialUser.x);
    model.update({ ...props, progress: 1 });
    expect(access.children[0].visible).toBe(true); expect(traveler.position.x).toBeGreaterThan(intermediateUser.x); expect(traveler.position.z).toBeGreaterThan(intermediateUser.z);
    expect(visibleInTree(channel)).toBe(true);
    model.dispose();
  });

  it('separates a visible facility from staffing/opening and the users approach', () => {
    const { model, props } = fixture();
    const facility = model.group.getObjectByName('development-public-facility')!;
    const staff = model.group.getObjectByName('development-facility-staff')!;
    const shutter = model.group.getObjectByName('development-facility-shutter')!;
    const approach = model.group.getObjectByName('development-facility-approach')!;
    const user = model.group.getObjectByName('development-user-a')!;
    model.update({ ...props, step: 1 }); const start = user.position.clone();
    expect(visibleInTree(facility)).toBe(true); expect(visibleInTree(staff)).toBe(false); expect(shutter.scale.y).toBe(1); expect(approach.children[0].visible).toBe(false);
    model.update({ ...props, step: 1, progress: .52 });
    expect(visibleInTree(staff)).toBe(true); expect(shutter.scale.y).toBeLessThan(.1); expect(user.position).toEqual(start); expect(approach.children[0].visible).toBe(false);
    model.update({ ...props, step: 1, progress: 1 });
    expect(approach.children[0].visible).toBe(true); expect(user.position.x).toBeGreaterThan(start.x); expect(user.position.z).toBeLessThan(start.z);
    model.dispose();
  });

  it('adds ecological and community questions without scoring or scaling the same activity', () => {
    const { model, props } = fixture();
    const activity = model.group.getObjectByName('development-same-activity')!;
    const fields = ['development-benefit-question', 'development-ecology-question', 'development-community-question'].map(name => model.group.getObjectByName(name)!);
    const physicalState = fields.map(object => [...object.position.toArray(), ...object.scale.toArray()]);
    for (const [progress, count] of [[.12, 1], [.52, 2], [1, 3]]) {
      model.update({ ...props, step: 2, progress });
      expect(visibleInTree(activity)).toBe(true); expect(activity.scale.toArray()).toEqual([1, 1, 1]);
      expect(fields.every(visibleInTree)).toBe(true);
      expect(fields.filter(object => object.getObjectByName('development-included-question')!.visible)).toHaveLength(count);
      expect(fields.map(object => [...object.position.toArray(), ...object.scale.toArray()])).toEqual(physicalState);
    }
    model.dispose();
  });

  it('places a single uninscribed material under the same shelter and stops exposure markers at its roof',()=>{
    const {model,props}=fixture(),shelter=model.group.getObjectByName('development-generic-shelter-roof')!,material=model.group.getObjectByName('development-uninscribed-material')!,markers:THREE.Object3D[]=[];
    model.group.traverse(object=>{if(object.name==='development-exposure-marker')markers.push(object);});
    model.update({...props,step:2,progress:0});const initial=markers.map(object=>object.position.y),roofBounds=new THREE.Box3().setFromObject(shelter),stoneBounds=new THREE.Box3().setFromObject(material);
    expect(stoneBounds.min.x).toBeGreaterThan(roofBounds.min.x);expect(stoneBounds.max.x).toBeLessThan(roofBounds.max.x);expect(stoneBounds.max.y).toBeLessThan(roofBounds.min.y);
    const ray=new THREE.Raycaster(new THREE.Vector3(0,4,0),new THREE.Vector3(0,-1,0));
    expect(ray.intersectObjects([shelter,material])[0].object).toBe(shelter);
    const fixed=[...shelter.matrixWorld.elements,...material.matrixWorld.elements];
    for(const progress of [.12,.30,.52,1]){
      model.update({...props,step:2,progress});expect([...shelter.matrixWorld.elements,...material.matrixWorld.elements]).toEqual(fixed);
      markers.forEach((marker,index)=>{expect(marker.position.y).toBeLessThan(initial[index]);expect(new THREE.Box3().setFromObject(marker).min.y).toBeGreaterThanOrEqual(roofBounds.max.y);});
    }
    expect(material.userData.reconstruction).toBe(false);model.dispose();
  });

  it('the same shelter physically intersects the observer-to-background line, rather than merely labeling an impact',()=>{
    const {model,props}=fixture(),scope=model.group.getObjectByName('development-setting-observation')!,roof=model.group.getObjectByName('development-generic-shelter-roof')!,background=model.group.getObjectByName('development-generic-setting-reference')!,line=model.group.getObjectByName('development-sightline-before-obstruction') as THREE.Line,behind=model.group.getObjectByName('development-sightline-behind-obstruction') as THREE.Line;
    model.update({...props,step:2,progress:.12});expect(visibleInTree(scope)).toBe(false);expect(visibleInTree(line)).toBe(false);
    model.update({...props,step:2,progress:.52});expect(visibleInTree(scope)).toBe(true);expect(visibleInTree(line)).toBe(true);
    model.update({...props,step:2,progress:1});
    const eye=new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position,0),end=new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position,1),target=new THREE.Vector3().fromBufferAttribute(behind.geometry.attributes.position,1);
    const ray=new THREE.Raycaster(eye,target.clone().sub(eye).normalize(),0,eye.distanceTo(target)),hits=ray.intersectObjects([roof,background]);
    expect(hits[0].object).toBe(roof);expect(end.distanceTo(hits[0].point)).toBeLessThan(.00001);expect(end.distanceTo(eye)).toBeLessThan(target.distanceTo(eye));
    expect(new THREE.Vector3().fromBufferAttribute(behind.geometry.attributes.position,0).distanceTo(end)).toBeLessThan(.00001);
    expect(model.group.getObjectByName('development-ecology-question')!.userData.sightlineBlocked).toBe(true);model.dispose();
  });

  it('includes actual user and maintenance movement without turning inquiry stages into a completed proposal',()=>{
    const {model,props}=fixture(),user=model.group.getObjectByName('development-heritage-user')!,worker=model.group.getObjectByName('development-maintenance-worker')!;
    model.update({...props,step:2,progress:.68});const userStart=user.getWorldPosition(new THREE.Vector3()),workerStart=worker.getWorldPosition(new THREE.Vector3());
    model.update({...props,step:2,progress:1});const userEnd=user.getWorldPosition(new THREE.Vector3()),workerEnd=worker.getWorldPosition(new THREE.Vector3());
    expect(userEnd.distanceTo(userStart)).toBeGreaterThan(2);expect(workerEnd.distanceTo(workerStart)).toBeGreaterThan(2);
    expect(Math.hypot(userEnd.x,userEnd.z)).toBeGreaterThan(1.55);expect(Math.hypot(workerEnd.x,workerEnd.z)).toBeGreaterThan(1.55);
    const explanation=developmentUnderstanding('M3',{season:1,layer:'ecology',progress:1,selected:'',cutaway:false})!;
    expect(explanation.explanation).toContain('拟议调整');expect(explanation.provenance).toContain('非遗产/保护棚复原');expect(explanation.objects.find(object=>object.id==='development-activity')!.explanation).toContain('没有排列真实三碑');model.dispose();
  });

  it('makes layer and object selection move the attention mark to the actual subject', () => {
    const { model, props } = fixture();
    const ring = model.group.getObjectByName('development-attention-ring')!;
    model.update({ ...props, layer: 'transport' }); const transport = ring.position.clone();
    model.update({ ...props, layer: 'settlements' }); const settlement = ring.position.clone();
    model.update({ ...props, layer: 'ecology' });
    expect(settlement.distanceTo(transport)).toBeGreaterThan(2); expect(ring.position.distanceTo(settlement)).toBeGreaterThan(2);
    expect(model.group.userData.focusId).toBe('development-ecology');
    model.update({ ...props, selected: 'development-lastmile' });
    expect(model.group.userData.focusId).toBe('development-lastmile'); expect(ring.position.x).toBe(3.7);
    model.dispose();
  });

  it.each([0, 1, 2])('freezes and exactly restores stage %s when progress is replayed', step => {
    const { model, props } = fixture();
    model.update({ ...props, step, progress: .52 }, 0, 0); const reference = snapshot(model.group);
    model.update({ ...props, step, progress: .52, playing: true }, 12345, 100); expect(snapshot(model.group)).toEqual(reference);
    model.update({ ...props, step, progress: 1 }, 12345, 100);
    model.update({ ...props, step, progress: .52 }, 12345, 100); expect(snapshot(model.group)).toEqual(reference);
    model.dispose();
  });

  it.each([[1280, 720], [627, 620], [390, 540]])('keeps finite labels and geometry on %s × %s views', (width, height) => {
    const { model, props } = fixture(width, height);
    for (const step of [0, 1, 2]) for (const progress of [.12, .52, 1, .12]) {
      model.update({ ...props, step, progress });
      model.group.traverse(object => {
        expect([...object.position.toArray(), ...object.scale.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        const geometry = (object as THREE.Mesh).geometry;
        if (geometry) expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      });
    }
    model.dispose();
  });

  it('exposes physical selection targets and releases shared resources only once', () => {
    const { model, props } = fixture(); model.update(props);
    for (const id of ['development-link', 'development-service', 'development-lastmile', 'development-facility', 'development-staff', 'development-activity', 'development-benefit', 'development-ecology', 'development-community']) {
      const objects: THREE.Object3D[] = []; model.group.traverse(object => { if (object.userData.selectId === id && !object.userData.screenAnnotation) objects.push(object); });
      expect(objects.length).toBeGreaterThan(0); expect(objects[0].userData.guideAnchor).toBeInstanceOf(THREE.Vector3);
    }
    const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
    model.group.traverse(object => {
      const mesh = object as THREE.Mesh; if (mesh.geometry) resources.add(mesh.geometry);
      if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        resources.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.add(value);
      }
    });
    let disposed = 0; for (const resource of resources) resource.addEventListener('dispose', () => disposed++);
    model.dispose(); model.dispose();
    expect(disposed).toBe(resources.size); expect(model.group.children).toHaveLength(0);
  });
});

describe('development explanations and source scope', () => {
  it('keeps real sources separate from author-defined conditions and their stages', () => {
    expect(developmentSourceIds.M1).toContain('railway'); expect(developmentSourceIds.M2).toContain('society'); expect(developmentSourceIds.M3).toContain('unesco');
    for (const stepId of ['M1', 'M2', 'M3']) for (const progress of [.12, .52, 1]) {
      const explanation = developmentUnderstanding(stepId, { season: 1, layer: 'transport', progress, selected: 'lhasa', cutaway: false })!;
      expect(explanation.hasProgress).toBe(true); expect(explanation.allowsCutaway).toBe(false); expect(explanation.stops).toHaveLength(3);
      expect(explanation.provenance).toContain('教学条件模型'); expect(explanation.provenance).toContain('无真实设施');
    }
    expect(developmentSystemState(0, .12).serviceEnabled).toBe(false); expect(developmentSystemState(0, .52).accessEnabled).toBe(false); expect(developmentSystemState(0, 1).accessEnabled).toBe(true);
    expect(developmentUnderstanding('G1', { season: 1, layer: 'transport', progress: .5, selected: '', cutaway: false })).toBeUndefined();
  });

  it('allows an object explanation without losing the current process stops or evidence scope', () => {
    const explanation = developmentUnderstanding('M1', { season: 1, layer: 'transport', progress: 1, selected: 'development-lastmile', cutaway: false }, 'development-lastmile')!;
    expect(explanation.title).toContain('接驳'); expect(explanation.explanation).toContain('没有计算真实旅行时间'); expect(explanation.stops[2].progress).toBe(1);
    const final = developmentUnderstanding('M3', { season: 1, layer: 'ecology', progress: 1, selected: '', cutaway: false })!;
    expect(final.explanation).toContain('总分'); expect(final.explanation).toContain('实际影响');
  });
});
