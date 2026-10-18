import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildTransportGeographicReferences, transportFeatureAnchor } from '../src/scene/transportGeographicReferences';
import { cityAccessPhaseProgress } from '../src/lib/cityAccessState';
vi.mock('../src/scene/environment', async original => ({ ...await original(), label: text => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.userData.text = text; return sprite; } }));
afterEach(() => vi.unstubAllGlobals());
const read = file => JSON.parse(readFileSync(`public/data/local-places/${file}`, 'utf8'));
const manifest = read('transport-reference.json');
const base = { layer: 'atlas-city-comparison', step: 4, progress: 0, cityLifeServices: true };

async function build() {
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, json: async () => JSON.parse(readFileSync(`public${url}`, 'utf8')) })));
  const camera = new THREE.PerspectiveCamera(43, 1280 / 720, .01, 300); camera.position.set(88, 40, 5); camera.lookAt(88, 0, -31); camera.updateMatrixWorld();
  let relief = 1; const at = (lon, lat, offset = 0) => new THREE.Vector3(lon, relief + offset, -lat);
  const model = buildTransportGeographicReferences({ camera, at }); await model.ready;
  return { model, at, size: new THREE.Vector2(1280, 720), changeRelief: value => { relief = value; } };
}
describe('real transport locations stay separate from enlarged mechanisms', () => {
  it('retains the two actual source runway lines and the original Lhasa West point', async () => {
    const { model } = await build(); expect(model.references).toHaveLength(3);
    for (const place of manifest.places) {
      const runway = read(place.file).features.find(feature => place.runwayFeatureIds.includes(feature.id));
      const reference = model.references.find(item => item.id === place.id);
      expect(reference.anchor).toEqual(transportFeatureAnchor(runway));
      expect(reference.featureIds).toEqual([runway.id]);
      expect(reference.root.children.find(item => item.userData.kind === 'actual-source-runway-centreline').userData.coordinates).toEqual(runway.geometry.coordinates);
    }
    expect(model.references.find(item => item.city === 'lhasa').anchor).toEqual([90.9655272, 29.6446837]); model.dispose();
  });
  it('never replaces the runway with a city point and keeps it with the same updated terrain', async () => {
    const { model, at, size, changeRelief } = await build();
    model.update({ ...base, progress: cityAccessPhaseProgress('ngari', 'access') }, size);
    const airport = model.references.find(item => item.city === 'ngari'); expect(airport.root.visible).toBe(true);
    expect(airport.anchor[1]).toBeLessThan(32.2); // Shiquanhe is in the separate 32.475–32.525° window.
    changeRelief(2); model.update({ ...base, progress: cityAccessPhaseProgress('ngari', 'transfer'), cityLifeServices: false }, size);
    expect(airport.root.visible).toBe(true); const runway = airport.root.children.find(item => item.userData.kind === 'actual-source-runway-centreline');
    expect(runway.geometry.attributes.position.getY(0)).toBeCloseTo(at(...runway.userData.coordinates[0], .025).y, 5); model.dispose();
  });
  it('shows the West station reference during its freight material, never as the passenger-station bridge site', async () => {
    const { model, size } = await build(), west = model.references.find(item => item.city === 'lhasa');
    model.update({ ...base, progress: cityAccessPhaseProgress('lhasa', 'transfer') }, size); expect(west.root.visible).toBe(false);
    model.update({ ...base, progress: cityAccessPhaseProgress('lhasa', 'life') }, size); expect(west.root.visible).toBe(true);
    model.update({ ...base, step: 3 }, size); expect(model.group.visible).toBe(false); model.dispose();
  });
  it('keeps an airport name clear of the moving road label and regional inset on a narrow scene',async()=>{
    const {model}=await build(),airport=model.references.find(item=>item.city==='ngari'),size=new THREE.Vector2(384,371);
    const props={...base,progress:cityAccessPhaseProgress('ngari','transfer')};model.update(props,size);
    const anchor=airport.pin.position.clone(),prior={...airport.root.userData.screenBox};
    const occupied=[{...prior,width:190,height:22},{x:256,y:132.76,width:146,height:122.52}];
    model.update(props,size,occupied);
    expect(airport.root.visible).toBe(true);expect(airport.title.visible).toBe(true);expect(airport.pin.position.equals(anchor)).toBe(true);
    const actual=airport.root.userData.screenBox;
    for(const box of occupied)expect(Math.abs(actual.x-box.x)>=(actual.width+box.width)/2+8||Math.abs(actual.y-box.y)>=(actual.height+box.height)/2+7).toBe(true);
    expect(actual.x-actual.width/2).toBeGreaterThanOrEqual(8);expect(actual.x+actual.width/2).toBeLessThanOrEqual(size.x-20);model.dispose();
  });
});
