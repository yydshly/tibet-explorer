import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildCityGroundFunctions, cityGroundFunctionState, cityGroundCaseEvidence } from '../src/scene/cityGroundFunctions';
import { storyAtlasPosition, STORY_ATLAS_META } from '../src/scene/storyAtlas';
import { regionalAnchors } from '../src/data/regionalStudy';
import { cityContinuityPartProgress } from '../src/lib/cityContinuityState';
import { cityAccessCityRange } from '../src/lib/cityAccessState';
import { cityContinuityLessons } from '../src/data/cityContinuityLessons';
import { cityContinuityReferences } from '../src/data/cityContinuity';
import { TERRAIN_READING_META, sampleTerrainMetres } from '../src/scene/terrainReading';
vi.mock('../src/scene/environment', async original => ({ ...await original(), label: text => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite; } }));
const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16'), grid = Int16Array.from({ length: bytes.length / 2 }, (_, index) => bytes.readInt16LE(index * 2));
const read = (lon, lat) => lon >= TERRAIN_READING_META.west && lon <= TERRAIN_READING_META.east && lat >= TERRAIN_READING_META.south && lat <= TERRAIN_READING_META.north ? sampleTerrainMetres(grid, lon, lat) : undefined;
const find = (root, kind) => { const items = []; root.traverse(item => { if (item.userData.kind === kind) items.push(item); }); return items; };
const atLocal = (city, fraction) => { const range = cityAccessCityRange(city); return range.start + fraction * (range.end - range.start); };
function scene(width = 798, height = 380) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 300), metresPerUnit=(STORY_ATLAS_META.east-STORY_ATLAS_META.west)*111320*Math.cos(29.5*Math.PI/180)/STORY_ATLAS_META.width;
  const at = (lon, lat, offset = .055) => storyAtlasPosition(lon,lat,Math.max(.025,(read(lon,lat)??0)/metresPerUnit*32)+offset);
  const bounds=new THREE.Box3().setFromPoints(regionalAnchors.map(city=>at(city.longitude,city.latitude,.18)));bounds.min.x-=.8;bounds.max.x+=.8;bounds.min.z-=.7;bounds.max.z+=.7;bounds.min.y=0;bounds.max.y=Math.max(1.3,bounds.max.y);
  const centre=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(0,.82,1).normalize(),up=new THREE.Vector3(0,direction.z,-direction.y),inset=width>900?338:0,top=112,bottom=Math.max(top+80,height-120),middle=(top+bottom)/2,tanV=Math.tan(43*Math.PI/360),safeX=tanV*(width/height)*(Math.max(55,(width-inset-100)/2)/(width/2)),safeY=tanV*(Math.max(35,(bottom-top)/2)/(height/2));
  let distance=16;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const r=new THREE.Vector3(x,y,z).sub(centre),depth=r.dot(direction);distance=Math.max(distance,Math.abs(r.x)/safeX+depth,Math.abs(r.dot(up))/safeY+depth);}distance*=1.12;
  const target=centre.clone().addScaledVector(up,-(1-middle/height*2)*distance*tanV).addScaledVector(new THREE.Vector3(1,0,0),-inset/width*distance*tanV*(width/height));camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld();
  return { model: buildCityGroundFunctions({ camera, at, metres: read }), camera, at, size: new THREE.Vector2(width, height) };
}
const settings = { story: 'history', progress: .64, services: true };

describe('同图地面功能、事件和实际地方使用', () => {
  it('keeps source-sampled terrain geometry, fixed map axes, archived references and explicit authored-window limits', () => {
    const { model, size, at } = scene(); model.update(settings, size);
    const faces = find(model.group, 'terrain-following-functional-use-face'); expect(faces.length).toBeGreaterThanOrEqual(9);
    for (const face of faces) {
      expect(face.material.depthTest).toBe(true); expect(face.userData.samples.every(point => point.metres === read(point.lon, point.lat))).toBe(true);
      const p = face.geometry.attributes.position; expect([...p.array].every(Number.isFinite)).toBe(true);
      expect(face.userData.scope).toContain('不是实测');
    }
    const cases = find(model.group, 'ground-use-case').filter(item => item.visible); expect(cases.map(item => item.userData.city)).toContain('nyingchi'); expect(cases.map(item => item.userData.city)).toContain('lhasa'); expect(cases.map(item => item.userData.city)).toContain('ngari');
    for (const item of cases) { expect(item.quaternion.toArray()).toEqual([0,0,0,1]); const source = item.userData.sourceReference, ref = cityContinuityReferences[source.id]; expect(source.lon).toBe(ref.lon); expect(source.lat).toBe(ref.lat); expect(item.userData.groundAligned).toBe(true); }
    const pin = find(model.group, 'ground-use-archived-place-pin').find(item => item.userData.referenceId === 'lhasa'); expect(pin.position.distanceTo(at(cityContinuityReferences.lhasa.lon, cityContinuityReferences.lhasa.lat, .07))).toBeLessThan(.00001); model.dispose();
  });
  it('Lhasa retains earlier religious use while adding distinct reception/residence and commemorative use; the same-progress control changes participation', () => {
    const { model, size } = scene();
    model.update({ ...settings, progress: atLocal('lhasa', .1) }, size); const zones = find(model.group, 'ground-use-activity-zone').filter(item => item.userData.caseId === 'lhasa-history');
    expect(zones.map(item => item.userData.added)).toEqual([true, false, false]);
    model.update({ ...settings, progress: atLocal('lhasa', .5) }, size); expect(zones.map(item => item.userData.added)).toEqual([true, true, false]);
    model.update({ ...settings, progress: atLocal('lhasa', .9) }, size); expect(zones.map(item => item.userData.added)).toEqual([true, true, true]);
    expect(find(model.group, 'lhasa-distinct-purpose-space').map(item => item.userData.purpose)).toEqual(['宗教活动', '礼仪·接见·居住', '纪念·宗教用途']);
    const faces = find(model.group, 'terrain-following-functional-use-face').filter(item => item.userData.caseId === 'lhasa-history'), before = faces.map(item => [...item.geometry.attributes.position.array]), bright = faces.map(item => item.material.opacity);
    model.update({ ...settings, progress: atLocal('lhasa', .9), services: false }, size); expect(zones.every(item => item.userData.entryOpen === 0)).toBe(true); expect(faces.map(item => [...item.geometry.attributes.position.array])).toEqual(before); expect(faces.some((item, index) => item.material.opacity < bright[index])).toBe(true);
    model.update({ ...settings, progress: cityContinuityPartProgress('lhasa', 2), services: true }, size); expect(zones[2].userData.entryOpen).toBeGreaterThan(0); model.dispose();
  });
  it('Nyingchi performs blank-paper participation before turning to the separate Lulang service use', () => {
    const { model, size } = scene(); model.update({ ...settings, progress: atLocal('nyingchi', .37) }, size);
    const scissor = find(model.group, 'blank-paper-cutting-action').find(item => item.parent.userData.caseId === 'culture' && item.parent.userData.role === '讲解与剪纸实践'), rotation = scissor.children.map(item => item.rotation.y);
    model.update({ ...settings, progress: atLocal('nyingchi', .57) }, size); expect(scissor.children.map(item => item.rotation.y)).not.toEqual(rotation);
    model.update({ ...settings, progress: atLocal('nyingchi', .94) }, size); const current = find(model.group, 'ground-use-case').find(item => item.userData.current && item.userData.city === 'nyingchi'); expect(current.userData.caseId).toBe('lulang'); expect(current.userData.referenceId).toBe('lulang'); expect(current.userData.sourceRefs).toEqual(cityContinuityLessons.history.nyingchi[2].sourceIds);
    expect(find(model.group, 'reception-rest-and-luggage-use-space').length).toBeGreaterThan(0); model.dispose();
  });
  it('Tholing learning and Shiquanhe riverbank use remain different places, without an invented river channel, platform or pergola', () => {
    const { model, size } = scene(); model.update({ ...settings, progress: atLocal('ngari', .52) }, size);
    const study = find(model.group, 'ground-use-case').find(item => item.userData.caseId === 'tholing'); expect(study.userData.current).toBe(true); expect(study.userData.referenceId).toBe('tholing');
    model.update({ ...settings, progress: atLocal('ngari', .96) }, size); const river = find(model.group, 'ground-use-case').find(item => item.userData.caseId === 'ngari-river'); expect(river.userData.current).toBe(true); expect(river.userData.referenceId).toBe('ngari'); expect(study.visible).toBe(true);
    const riverside = find(river, 'riverside-walk-greening-use'); expect(riverside).toHaveLength(3); expect(find(river, 'source-height-use-baseline-not-built-platform')).toHaveLength(0); expect(find(river, 'open-shade-and-stay-use-principle').every(item => !item.visible)).toBe(true); model.dispose();
  });
  it('travel changes observation focus while retaining the existing physical use and its progress', () => {
    const { model, size } = scene(); const p = { story: 'travel', progress: atLocal('lhasa', .91), services: true }; model.update(p, size);
    const active = find(model.group, 'ground-use-case').find(item => item.userData.active), markers = active.children.flatMap(item => find(item, 'ground-use-activity-zone')), on = markers.map(item => item.userData.entryOpen);
    const actor = find(active, 'ground-continuous-learning-material')[0], pos = actor.position.clone(); expect(actor.visible).toBe(true);
    model.update({ ...p, services: false }, size); expect(actor.visible).toBe(true); expect(actor.position).toEqual(pos); expect(markers.map(item => item.userData.entryOpen)).toEqual(on); expect(active.userData.state.observation).toBe(false); model.dispose();
  });
  it('real shared progress is reversible for all three histories, with functional appearance independent of wall-clock time', () => {
    const { model, size } = scene(); for (const city of ['nyingchi', 'lhasa', 'ngari']) {
      const p = { ...settings, progress: atLocal(city, .56) }; model.update(p, size); const current = find(model.group, 'ground-use-case').find(item => item.userData.active), actor = find(current, 'ground-continuous-learning-material')[0], before = { p: actor.position.clone(), state: current.userData.state };
      model.update({ ...p, progress: 1 }, size); model.update(p, size); expect(actor.position).toEqual(before.p); expect(current.userData.state).toEqual(before.state); expect(cityGroundFunctionState(p, city).id).toBe(current.userData.caseId);
    } model.dispose(); expect(model.group.children).toHaveLength(0);
  });
  it('retained cultural and Tholing context keeps its own source evidence when attention turns to Lulang or Shiquanhe',()=>{
    const {model,size}=scene();
    for(const [city,id,target] of [['nyingchi','culture','lulang'],['ngari','tholing','ngari-river']]){
      model.update({...settings,progress:atLocal(city,.95)},size);const context=find(model.group,'ground-use-case').find(item=>item.userData.caseId===id),active=find(model.group,'ground-use-case').find(item=>item.userData.caseId===target);
      expect(context.visible).toBe(true);expect(context.userData.current).toBe(false);expect(context.userData.sourceRefs).toEqual(cityGroundCaseEvidence(id).sourceRefs);expect(context.userData.lessonId).toBeUndefined();expect(active.userData.sourceRefs).toEqual(cityGroundCaseEvidence(target).sourceRefs);
    }model.dispose();
  });
  it('the default 798px layout has an actually enlarged functional window, rather than a clamped 70px strip', () => {
    for (const [width, height] of [[798, 380], [390, 366], [1440, 960]]) {
      const { model, size, camera } = scene(width, height); model.update({ ...settings, progress: atLocal('nyingchi', .96) }, size); model.group.updateMatrixWorld(true);
      const current = find(model.group, 'ground-use-case').find(item => item.userData.active), points = [];
      for (const floor of find(current, 'terrain-following-functional-use-face')) { const p = floor.geometry.attributes.position; for (let index = 0; index < p.count; index++) { const q = new THREE.Vector3(p.getX(index), p.getY(index), p.getZ(index)).project(camera); points.push({ x: (q.x + 1) * width / 2, y: (1 - q.y) * height / 2 }); } }
      expect(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true); const extent = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)); expect(extent).toBeGreaterThan(width < 520 ? 100 : 145);
      const labels = find(model.group, 'ground-functional-short-label').filter(item => item.visible); for (const item of labels) { const b = item.userData.screenBox; expect(b.x - b.width / 2).toBeGreaterThanOrEqual(12); expect(b.x + b.width / 2).toBeLessThanOrEqual(width - 12); expect(b.y - b.height / 2).toBeGreaterThan(80); }
      model.dispose();
    }
  });
});
