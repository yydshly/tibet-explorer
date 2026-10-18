import {describe,it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {buildCityLocalLocator} from '../src/scene/cityLocalLocator';

vi.mock('../src/scene/environment',async original=>({...await original(),label:text=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.userData.text=text;return sprite;}}));

const at=(lon,lat,y=0)=>new THREE.Vector3((lon-91.5)/47*36,y,(29.5-lat)*.88);
const names=['林芝·鲁朗','拉萨','阿里·狮泉河'];

describe('phone same-world locality inset',()=>{
  it('keeps three full, non-overlapping names in one HUD layer within a compact CSS-pixel footprint',()=>{
    const model=buildCityLocalLocator(at);
    model.update('shiquanhe',[80.065,32.475,80.135,32.525],new THREE.Vector2(384,371));
    const rect=model.group.userData.rect;
    expect(rect.width).toBe(118);
    expect(rect.height).toBeLessThan(68);
    expect(rect.x+rect.width).toBe(324);
    const labels=model.hud.children.filter(o=>o instanceof THREE.Sprite&&names.includes(o.userData.text));
    expect(labels).toHaveLength(3);
    const rows=labels.map(o=>({x:o.position.x,y:o.position.y,w:o.scale.x,h:o.scale.y})).sort((a,b)=>a.y-b.y);
    for(const box of rows){expect(box.x-box.w/2).toBeGreaterThanOrEqual(rect.x);expect(box.x+box.w/2).toBeLessThanOrEqual(rect.x+rect.width);}
    expect(rows[1].y-rows[0].y).toBeGreaterThanOrEqual(22);
    expect(rows[2].y-rows[1].y).toBeGreaterThanOrEqual(22);
    expect(model.group.children.some(o=>o instanceof THREE.Sprite)).toBe(false);
    expect(model.hud.children.find(o=>o.userData.text==='返回全域：重置视角').visible).toBe(false);
    expect(model.hud.children.find(o=>o.userData.text==='金框：定位符号').visible).toBe(true);
    model.dispose();
  });
  it('places the overview inset in the top right above the caption and hides the inapplicable full-map reset instruction',()=>{
    const model=buildCityLocalLocator(at),size=new THREE.Vector2(950,490),bbox=[91.04,29.6,91.16,29.69];
    model.update('lhasa',bbox,size,true);const rect=model.group.userData.rect;
    expect(rect.width).toBe(160);expect(rect.x+rect.width).toBe(930);expect(size.y-rect.y-rect.height).toBeCloseTo(62,8);
    expect(rect.y-40).toBeGreaterThan(125);
    expect(model.hud.children.find(o=>o.userData.text==='返回全域：重置视角').visible).toBe(false);
    const labels=model.hud.children.filter(o=>o instanceof THREE.Sprite&&names.includes(o.userData.text));expect(labels).toHaveLength(3);
    for(const label of labels){expect(label.position.x-label.scale.x/2).toBeGreaterThanOrEqual(rect.x);expect(label.position.x+label.scale.x/2).toBeLessThanOrEqual(rect.x+rect.width);}
    const frame=model.hud.children.find(o=>o.userData.kind==='projected-real-locality-locator-frame');
    expect(frame.userData.localityId).toBe('lhasa');
    const expected=at((bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2,.04);
    expect(frame.userData.worldAnchor.distanceTo(expected)).toBeLessThan(1e-12);
    model.update('lhasa',bbox,size);expect(model.group.userData.rect.width).toBe(194);
    expect(model.hud.children.find(o=>o.userData.text==='返回全域：重置视角').visible).toBe(true);
    model.dispose();
  });
});
