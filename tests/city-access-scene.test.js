import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildCityAccessChange, cityAccessChangeState, sampleCityAccessTerrain, cityAccessRailSection, CITY_ACCESS_IDS, cityAccessCaptionBox } from '../src/scene/cityAccessChange';
import { cityAccessCityRange, cityAccessPhases, cityAccessPhaseProgress, cityAccessState } from '../src/lib/cityAccessState';
import { verifiedPlaceReferences } from '../src/data/placeProvenance';
import { TERRAIN_READING_META, sampleTerrainMetres } from '../src/scene/terrainReading';
vi.mock('../src/scene/environment', async original => ({ ...await original(), label: text => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite; } }));
const bytes = readFileSync('public/assets/terrain/tibet-regional-dem.int16'), grid = Int16Array.from({ length: bytes.length / 2 }, (_, index) => bytes.readInt16LE(index * 2));
const read = (lon, lat) => lon >= TERRAIN_READING_META.west && lon <= TERRAIN_READING_META.east && lat >= TERRAIN_READING_META.south && lat <= TERRAIN_READING_META.north ? sampleTerrainMetres(grid, lon, lat) : undefined;
const find = (root, kind) => { const items = []; root.traverse(item => { if (item.userData.kind === kind) items.push(item); }); return items; };
const visible=object=>{let item=object;while(item){if(!item.visible)return false;item=item.parent;}return true;};
const settings = { layer: 'atlas-city-comparison', step: 4, progress: 1, cityLifeServices: true, cityAccessTransfer: true };
const atLocal = (city, local) => { const range = cityAccessCityRange(city); return range.start + local * (range.end - range.start); };
function scene(width = 1440, height = 960) {
  const camera = new THREE.PerspectiveCamera(43, width / height, .1, 300); camera.position.set(88, 65, 30); camera.lookAt(88, 0, -31); camera.updateMatrixWorld();
  const at = (lon, lat, offset = .055) => new THREE.Vector3(lon, Math.max(.025, (read(lon, lat) ?? 0) / 1800) + offset, -lat);
  return { model: buildCityAccessChange({ camera, at, metres: read }), at, size: new THREE.Vector2(width, height) };
}

describe('铁路和航空前后：原有交通→新方式→地方接续→用途', () => {
  it('uses the same four authored clip boundaries and reverses without another timer', () => {
    for (const city of CITY_ACCESS_IDS) for (let index = 0; index < cityAccessPhases.length; index++) {
      const progress = cityAccessPhaseProgress(city, cityAccessPhases[index].id) + 1e-9, state = cityAccessChangeState({ ...settings, progress }, city);
      expect(state.beat).toBe(index); expect(cityAccessState(progress).index).toBe(index); expect(state.beatProgress).toBeCloseTo(0, 5);
    }
    const a = cityAccessChangeState({ ...settings, progress: .19 }, 'nyingchi'); cityAccessChangeState({ ...settings, progress: .32 }, 'nyingchi');
    expect(cityAccessChangeState({ ...settings, progress: .19 }, 'nyingchi')).toEqual(a);
  });
  it('keeps original DEM data at archived town references and never substitutes an invented road alignment', () => {
    for (const city of CITY_ACCESS_IDS) {
      const samples = sampleCityAccessTerrain(city, read), section = cityAccessRailSection(samples), ref = verifiedPlaceReferences[city];
      expect(samples).toHaveLength(121); expect(samples.every(point => point.metres === read(point.longitude, point.latitude))).toBe(true);
      expect(samples[60].longitude).toBeCloseTo(ref.longitude, 8); expect(samples[60].latitude).toBe(ref.latitude);
      expect(section.samples).toBe(samples); expect(section.natural).toHaveLength(121); expect(sampleCityAccessTerrain(city, () => undefined)).toEqual([]);
      expect(section.natural[section.tunnel.centre].y).toBeGreaterThan(section.rail[section.tunnel.centre].y);
      expect(section.rail[section.bridge.centre].y).toBeGreaterThan(section.natural[section.bridge.centre].y);
    }
  });
  it('retains all three regions, actual terrain heights, life ends and existing ground traffic when the new mode is disabled', () => {
    const { model, size, at } = scene(); model.update(settings, size);
    const profiles = find(model.group, 'access-real-dem-profile'), original = profiles.map(item => [...item.geometry.attributes.position.array]);
    expect(profiles).toHaveLength(3);
    model.update({ ...settings, cityLifeServices: false }, size);
    for (const panel of find(model.group, 'city-access-terrain-attached-cutaway')) { const ref = verifiedPlaceReferences[panel.userData.city]; expect(panel.visible).toBe(panel.userData.city === 'ngari'); expect(panel.userData.terrainAnchor.distanceTo(at(ref.longitude, ref.latitude, .14))).toBeLessThan(.00001); }
    expect(find(model.group, 'access-existing-ground-vehicle').every(item => item.visible)).toBe(true);
    expect(find(model.group, 'terrain-following-functional-use-face').filter(visible)).toHaveLength(0); expect(find(model.group,'city-access-terrain-attached-cutaway').filter(visible)).toHaveLength(1);
    expect(find(model.group, 'access-visible-train').every(item => !item.visible)).toBe(true);
    expect(find(model.group, 'access-visible-aircraft').every(item => !item.visible)).toBe(true);
    expect(find(model.group, 'access-same-journey-or-goods-marker').filter(visible).every(item => item.userData.holder === 'existing-ground')).toBe(true);
    expect(profiles.map(item => [...item.geometry.attributes.position.array])).toEqual(original); model.dispose(); expect(model.group.children).toHaveLength(0);
  });
  it('moves recognizable trains on the displayed level bridge and inside the sampled ridge bore', () => {
    const { model, size } = scene(); model.update(settings, size);
    for (const city of ['nyingchi', 'lhasa']) {
      const track = find(model.group, 'access-traversed-rail-principle').find(item => item.userData.city === city), { rail, natural, bridge, tunnel } = track.userData;
      const train = find(model.group, 'access-visible-train').find(item => item.userData.city === city); expect(train.children.length).toBeGreaterThanOrEqual(12);
      for (const span of [bridge, tunnel]) {
        const local = .25 + .27 * span.centre / (rail.length - 1); model.update({ ...settings, progress: atLocal(city, local) }, size);
        expect(train.position.x).toBeCloseTo(rail[span.centre].x, 7); expect(train.position.y - .045).toBeCloseTo(rail[span.centre].y, 7);
        if (span === bridge) expect(train.position.y - .045).toBeCloseTo(bridge.deckY, 7);
        else expect(train.position.y - .045).toBeLessThan(natural[span.centre].y);
      }
    }
    model.dispose();
  });
  it('hands the same object from mode to a local vehicle and use end; removing transfer leaves it at arrival', () => {
    const { model, size } = scene();
    for (const city of CITY_ACCESS_IDS) {
      const progress = atLocal(city, .6); model.update({ ...settings, progress }, size);
      const parcel = find(model.group, 'access-same-journey-or-goods-marker').find(item => item.userData.city === city), id = parcel.uuid;
      expect(parcel.userData.holder).toBe('local-vehicle');
      model.update({ ...settings, progress, cityAccessTransfer: false }, size); expect(parcel.userData.holder).toBe('arrival');
      const local = find(model.group, 'access-local-transfer-vehicle').find(item => item.userData.city === city); expect(local.visible).toBe(false);
      const arrival = find(model.group, 'access-arrival-platform-principle').find(item => item.userData.city === city); expect(parcel.position.x).toBeCloseTo(arrival.position.x, 7);
      model.update({ ...settings, progress: atLocal(city, .999) }, size); expect(parcel.uuid).toBe(id); expect(parcel.userData.holder).toBe('use-end');
      const end = find(model.group, 'access-use-carrier').find(item => item.userData.city === city); expect(end.userData.reached).toBe(true); expect(end.visible).toBe(true); expect(parcel.userData.groundUseCase).toBeUndefined(); expect(parcel.userData.destination).toBe('visible-local-transfer-end'); expect(parcel.position.x).toBeCloseTo(end.position.x,7); expect(parcel.userData.worldPosition).toBeInstanceOf(THREE.Vector3);
      model.update({ ...settings, progress: atLocal(city, .4) }, size); expect(parcel.uuid).toBe(id); expect(parcel.userData.holder).toBe('new-mode');
    }
    expect(find(model.group, 'access-same-journey-or-goods-marker')).toHaveLength(3); model.dispose();
  });
  it('finishes local transfer at the life cue and keeps the same object continuous at every mode handoff', () => {
    const { model, size } = scene();
    for (const city of CITY_ACCESS_IDS) {
      for (const boundary of [.25, .52, .555, .76, .8032]) {
        const before = atLocal(city, boundary - 1e-7), after = atLocal(city, boundary + 1e-7);
        model.update({ ...settings, progress: before }, size);
        const parcel = find(model.group, 'access-same-journey-or-goods-marker').find(item => item.userData.city === city), point = parcel.position.clone();
        model.update({ ...settings, progress: after }, size);
        expect(parcel.position.distanceTo(point)).toBeLessThan(.0001);
      }
      const progress = atLocal(city, .76 + 1e-8); model.update({ ...settings, progress }, size);
      const local = find(model.group, 'access-local-transfer-vehicle').find(item => item.userData.city === city), parcel = find(model.group, 'access-same-journey-or-goods-marker').find(item => item.userData.city === city), end = find(model.group, 'access-use-carrier').find(item => item.userData.city === city);
      expect(local.userData.progress).toBe(1); expect(parcel.userData.holder).toBe('use-end'); expect(parcel.position.x).toBeCloseTo(end.position.x, 4); expect(end.userData.reached).toBe(true);
      model.update({ ...settings, progress, cityAccessTransfer: false }, size); expect(parcel.userData.holder).toBe('arrival'); expect(end.userData.reached).toBe(false);
    }
    model.dispose();
  });
  it('makes aviation a visible aircraft and a distinct landing then ground journey, not a flight-direction bead', () => {
    const { model, size } = scene(); model.update({ ...settings, progress: atLocal('ngari', .4) }, size);
    const aircraft = find(model.group, 'access-visible-aircraft')[0]; expect(aircraft.visible).toBe(true); expect(aircraft.children.length).toBeGreaterThanOrEqual(5);
    expect(aircraft.children.some(item => item.geometry?.parameters.depth > .6)).toBe(true);
    expect(find(model.group, 'access-traversed-rail-principle').map(item => item.userData.city)).toEqual(['nyingchi', 'lhasa']);
    model.update({ ...settings, progress: 1, cityAccessTransfer: false }, size); const parcel = find(model.group, 'access-same-journey-or-goods-marker').find(item => item.userData.city === 'ngari'); expect(parcel.userData.holder).toBe('arrival');
    const scope = find(model.group, 'access-use-carrier').find(item => item.userData.city === 'ngari').userData.caseScope; expect(scope).toContain('另一处'); expect(scope).toContain('不声称机场导致收益'); model.dispose();
  });
  it('keeps enlarged, geographically linked mechanisms and caption rows readable at regional and phone scale', () => {
    for (const [width, height] of [[1440, 960], [390, 366]]) {
      const { model, size } = scene(width, height); model.update(settings, size);
      const panels = find(model.group, 'city-access-terrain-attached-cutaway'); expect(panels).toHaveLength(3);
      for (const panel of panels.filter(visible)) {
        expect(panel.userData.pixelWidth).toBeGreaterThanOrEqual(width < 520 ? panel.userData.state.active ? 155 : 50 : panel.userData.state.active ? 320 : 125);
        if (width >= 900 && !panel.userData.state.active) expect(panel.userData.pixelWidth).toBeLessThanOrEqual(145);
      }
      expect(find(model.group, 'access-map-anchor-leader')).toHaveLength(3); expect(model.occupied(settings, size)).toHaveLength(3);
      if (width >= 900) {
        const reading = find(model.group, 'access-dem-minimum-maximum-label'); expect(reading).toHaveLength(1);
        const profile = find(model.group, 'access-real-dem-profile').find(item => item.userData.city === 'ngari');
        expect(reading[0].userData.minimum).toBe(profile.userData.minimum); expect(reading[0].userData.maximum).toBe(profile.userData.maximum); expect(reading[0].userData.text).toContain('显示放大');
        expect(find(model.group, 'access-active-spatial-labels').filter(item => item.visible)).toHaveLength(1);
      }
      if (width < 520) {
        const boxes = CITY_ACCESS_IDS.map(city => cityAccessCaptionBox(city, width, height, 248));
        for (const box of boxes) { expect(box.x - box.width / 2).toBeGreaterThanOrEqual(12); expect(box.x + box.width / 2).toBeLessThanOrEqual(width - 12); }
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(Math.abs(boxes[i].y - boxes[j].y)).toBeGreaterThanOrEqual(28);
      }
      model.update({ ...settings, step: 3 }, size); expect(model.group.visible).toBe(false); model.dispose();
    }
  });
  it('phone focus has a readable 160px mechanism, one short object label, and finite geometry inside the map boundaries', () => {
    const { model, size } = scene(390, 366);
    const camera = new THREE.PerspectiveCamera(43, 390 / 366, .1, 300); camera.position.set(88, 65, 30); camera.lookAt(88, 0, -31); camera.updateMatrixWorld();
    for (const city of CITY_ACCESS_IDS) for (const local of [.1, .4, .62, .8, .999]) {
      model.update({ ...settings, progress: atLocal(city, local) }, size); model.group.updateMatrixWorld(true);
      const panel = find(model.group, 'city-access-terrain-attached-cutaway').find(item => item.userData.city === city); expect(panel.userData.pixelWidth).toBe(160);
      const annotations = find(model.group, 'access-active-spatial-labels').find(item => item.userData.city === city); expect(annotations.visible).toBe(true); expect(annotations.children.filter(item => item.isSprite)).toHaveLength(1); expect(find(model.group, 'access-dem-minimum-maximum-label')).toHaveLength(0);
      panel.traverse(object => {
        if (!object.isMesh) return; let ancestor = object; while (ancestor && ancestor !== model.group) { if (!ancestor.visible) return; ancestor = ancestor.parent; }
        object.geometry.computeBoundingBox(); const b = object.geometry.boundingBox;
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld).project(camera), screenX = (p.x + 1) * 390 / 2, screenY = (1 - p.y) * 366 / 2;
          expect(Number.isFinite(screenX) && Number.isFinite(screenY)).toBe(true); expect(screenX).toBeGreaterThanOrEqual(4); expect(screenX).toBeLessThanOrEqual(386); expect(screenY).toBeGreaterThanOrEqual(104); expect(screenY).toBeLessThan(190);
        }
      });
    }
    model.dispose();
  });
});
