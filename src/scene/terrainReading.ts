import * as THREE from 'three';
import { GOLD, TEAL, label, line } from './environment';
import {regionalTerrainMeta,terrainReferencePoints} from '../data/terrainMetadata';
import {elevationPose} from '../lib/elevationReading';
import {buildElevationProbe} from './elevationProbe';
import {buildMountainReading} from './narratedGeographyReading';
import {regionalAnchors,regionPair} from '../data/regionalStudy';
import type { TibetSceneProps } from './TibetScene';

type Runtime = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  focus: (position: THREE.Vector3, target: THREE.Vector3) => void;
  hasSavedView: (key: string) => boolean;
};

export const TERRAIN_READING_META=regionalTerrainMeta;
export const terrainReadingObjects=terrainReferencePoints;

const { west, east, south, north, columns, rows } = TERRAIN_READING_META;
const WIDTH = 30;
// A local equirectangular display at the centre latitude preserves an explicit
// common horizontal scale. Height is enlarged by 40 against this horizontal scale.
const METRES_PER_UNIT = (east - west) * 111320 * Math.cos(THREE.MathUtils.degToRad((south + north) / 2)) / WIDTH;
const DEPTH = (north - south) * 111320 / METRES_PER_UNIT;
const heightToScene = (metres: number) => metres / METRES_PER_UNIT * TERRAIN_READING_META.verticalExaggeration;
const project = (longitude: number, latitude: number) => new THREE.Vector3(
  (longitude - (west + east) / 2) / (east - west) * WIDTH, 0,
  ((north + south) / 2 - latitude) / (north - south) * DEPTH,
);

export function terrainProfileLongitude(progress: number) {
  return 80 + 18 * THREE.MathUtils.clamp(progress, 0, 1);
}

/** Bilinear reading of the shipped north-to-south, west-to-east metre grid. */
export function sampleTerrainMetres(grid: ArrayLike<number>, longitude: number, latitude: number) {
  if (grid.length !== columns * rows) throw new Error('Invalid regional elevation grid');
  const x = THREE.MathUtils.clamp((longitude - west) / (east - west) * (columns - 1), 0, columns - 1);
  const y = THREE.MathUtils.clamp((north - latitude) / (north - south) * (rows - 1), 0, rows - 1);
  const ix = Math.min(columns - 2, Math.floor(x)), iy = Math.min(rows - 2, Math.floor(y));
  const fx = x - ix, fy = y - iy;
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(grid[iy * columns + ix], grid[iy * columns + ix + 1], fx),
    THREE.MathUtils.lerp(grid[(iy + 1) * columns + ix], grid[(iy + 1) * columns + ix + 1], fx), fy,
  );
}

function legendSprite() {
  const canvas = document.createElement('canvas'); canvas.width = 560; canvas.height = 174;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(5,23,33,.9)'; context.beginPath(); context.roundRect(0, 0, 560, 174, 16); context.fill();
  context.fillStyle = '#d9e5df'; context.font = '28px "Microsoft YaHei",sans-serif'; context.fillText('海拔 m　·　高度 ×40', 22, 40);
  const gradient = context.createLinearGradient(24, 0, 536, 0);
  [[0, '#597d63'], [.3, '#8c9674'], [.55, '#bea982'], [.75, '#d4c9b0'], [1, '#f1f0e3']].forEach(([offset, color]) => gradient.addColorStop(offset as number, color as string));
  context.fillStyle = gradient; context.fillRect(24, 57, 512, 26);
  context.fillStyle = '#d9e5df'; context.font = '25px "Microsoft YaHei",sans-serif'; context.fillText('0', 24, 114); context.fillText('4000', 250, 114); context.fillText('8000', 467, 114);
  context.fillStyle = '#aac3c5'; context.font = '23px "Microsoft YaHei",sans-serif'; context.fillText('地区概览 · 网格约 5–6 km', 24, 151);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false })); sprite.renderOrder = 15;
  return sprite;
}

type Callout = { id: string; sprite: THREE.Sprite; leader: THREE.Line; pin: THREE.Mesh; anchor: THREE.Vector3; width: number; offset: [number, number] };

export function buildTerrainReadingScene(runtime: Runtime,options:{regional?:boolean}={}) {
  const objects=options.regional?regionalAnchors:terrainReadingObjects;
  const group = new THREE.Group();
  const readingProbes=[buildElevationProbe(group,'terrain-probe',runtime),buildElevationProbe(group,'terrain-reference-height',runtime)];readingProbes.forEach(probe=>probe.group.visible=false);
  const geometry = new THREE.PlaneGeometry(WIDTH, DEPTH, columns - 1, rows - 1); geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const originalIndices = (geometry.index!.array as Uint32Array).slice();
  const activeIndex = geometry.index!; activeIndex.setUsage(THREE.DynamicDrawUsage);
  const colours = new Float32Array(columns * rows * 3);
  const colourMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, side: THREE.DoubleSide });
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const surface = new THREE.Mesh(geometry, colourMaterial); surface.receiveShadow = true; surface.visible = false; group.add(surface);
  const base = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, .16, DEPTH), new THREE.MeshStandardMaterial({ color: 0x183743, roughness: 1 }));
  base.position.y = -.14; base.visible = false; group.add(base);
  const section = new THREE.Group(); section.visible = false; group.add(section);
  const profileGeometry = new THREE.BufferGeometry();
  const profilePositions = new Float32Array(rows * 2 * 3), profileIndices: number[] = [];
  for (let row = 0; row < rows - 1; row++) { const a = row * 2; profileIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  profileGeometry.setAttribute('position', new THREE.BufferAttribute(profilePositions, 3)); profileGeometry.setIndex(profileIndices);
  const wall = new THREE.Mesh(profileGeometry, new THREE.MeshBasicMaterial({ color: 0xa68560, side: THREE.DoubleSide, transparent: true, opacity: .9 })); section.add(wall);
  const profileLine = line(Array.from({ length: rows }, () => new THREE.Vector3()), GOLD, 1); section.add(profileLine);
  const groundLine = line([new THREE.Vector3(), new THREE.Vector3()], 0xc5dddf, .7); section.add(groundLine);
  const profileTitle = label('南北高程剖面', '#f0da9c', 3.5); profileTitle.onBeforeRender = () => {}; section.add(profileTitle);
  const referenceTitle = label('0 m · 海平面参考', '#c9d9d9', 3); referenceTitle.onBeforeRender = () => {}; section.add(referenceTitle);

  const northArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-WIDTH / 2 - .8, .3, -DEPTH / 2 + 2.8), 1.8, 0xe1ebe0, .38, .2); group.add(northArrow); northArrow.visible = false;
  const northLabel = label('北', '#e0e8df', .8); northLabel.position.set(-WIDTH / 2 - .8, .65, -DEPTH / 2 + .8); northLabel.visible = false; group.add(northLabel);
  northLabel.onBeforeRender = () => {}; const northAnchor = northLabel.position.clone();
  const scale = new THREE.Group(); scale.visible = false; group.add(scale);
  const scaleStart = new THREE.Vector3(-WIDTH / 2 + 1.3, .1, -DEPTH / 2 - .7), scaleEnd = scaleStart.clone().add(new THREE.Vector3(500000 / METRES_PER_UNIT, 0, 0));
  scale.add(line([scaleStart, scaleEnd], 0xdce8e2, .85));
  for (const point of [scaleStart, scaleEnd]) scale.add(line([point.clone().add(new THREE.Vector3(0, 0, -.17)), point.clone().add(new THREE.Vector3(0, 0, .17))], 0xdce8e2, .85));
  const scaleTitle = label('约 500 km', '#d9e6df', 1.8); scaleTitle.position.copy(scaleStart.clone().lerp(scaleEnd, .5)).add(new THREE.Vector3(0, .5, -.3)); scale.add(scaleTitle);
  scaleTitle.onBeforeRender = () => {}; const scaleAnchor = scaleTitle.position.clone();
  const legend = legendSprite(); legend.visible = false; group.add(legend);
  const source = label('Mapzen / USGS · 高度 ×40 · 网格约 5–6 km', '#b9d0d2', 7); source.onBeforeRender = () => {}; source.visible = false; group.add(source);
  const status = label('正在加载地区高程数据…', '#dce7e5', 6); status.onBeforeRender = () => {}; group.add(status);

  const callouts: Callout[] = objects.map((object, index) => {
    const anchor = project(object.longitude, object.latitude);
    const sprite = label(object.title, object.id === 'terrain-yarlung' ? '#aee7ed' : '#eee0b7', 2.5); sprite.userData.selectId = object.id; sprite.onBeforeRender = () => {};
    const leader = line([anchor.clone(), anchor.clone()], object.id === 'terrain-yarlung' ? TEAL : GOLD, .6); (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 10;
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.115, 14, 10), new THREE.MeshBasicMaterial({ color: object.id === 'terrain-yarlung' ? TEAL : GOLD })); pin.userData.selectId = object.id;
    sprite.visible = leader.visible = pin.visible = false; group.add(sprite, leader, pin);
    return { id: object.id, sprite, leader, pin, anchor, width: object.title.length * 11 + 28, offset: [[-30, 25], [-20, -30], [12, -30], [42, 28]][index%4] as [number, number] };
  });

  if(options.regional)for(const callout of callouts){const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.36,40),new THREE.MeshBasicMaterial({color:GOLD,side:THREE.DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=-.05;callout.pin.add(ring);}
  const valleyEmphasis = new THREE.Group(); group.add(valleyEmphasis); valleyEmphasis.visible = false;
  const valleyRings = (options.regional?[]:['terrain-yarlung', 'terrain-southeast']).map(id => {
    // A dashed locator identifies the surrounding valley position; it is not
    // a river centreline, watershed border or a measured body of water.
    const points = Array.from({ length: 81 }, (_, i) => new THREE.Vector3(Math.cos(i / 80 * Math.PI * 2) * .8, .07, Math.sin(i / 80 * Math.PI * 2) * .42));
    const ring = line(points, TEAL, .85, true); valleyEmphasis.add(ring); return { id, ring };
  });
  let alive = true, grid: Int16Array | null = null, dataError = false;
  const mountain=buildMountainReading((lon,lat,offset=0)=>{const p=project(lon,lat);p.y=grid?heightToScene(sampleTerrainMetres(grid,lon,lat))+offset:offset;return p;});group.add(mountain.group);
  let previousLayer = '', previousView = '', previousSelection = '', previousSection = '', previousPair='', clippedColumn = -1;
  const colour = new THREE.Color(), low = new THREE.Color(0x597d63), middle = new THREE.Color(0xbea982), high = new THREE.Color(0xf1f0e3);
  const ready=fetch(TERRAIN_READING_META.dataUrl).then(response => {
    if (!response.ok) throw new Error('DEM unavailable'); return response.arrayBuffer();
  }).then(buffer => {
    if (!alive) return;
    if (buffer.byteLength !== columns * rows * 2) throw new Error('DEM invalid size');
    const bytes = new DataView(buffer), decoded = new Int16Array(columns * rows);
    for (let i = 0; i < decoded.length; i++) decoded[i] = bytes.getInt16(i * 2, true);
    grid = decoded;
    for (let i = 0; i < grid.length; i++) {
      positions.setY(i, heightToScene(grid[i]));
      const ratio = THREE.MathUtils.clamp(grid[i] / 8000, 0, 1);
      colour.copy(ratio < .55 ? low : middle).lerp(ratio < .55 ? middle : high, ratio < .55 ? ratio / .55 : (ratio - .55) / .45); colour.toArray(colours, i * 3);
    }
    positions.needsUpdate = true; geometry.attributes.color.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    callouts.forEach((callout, index) => {
      const object = objects[index]; callout.anchor.y = heightToScene(sampleTerrainMetres(grid!, object.longitude, object.latitude)) + .16; callout.pin.position.copy(callout.anchor);
    });
    valleyRings.forEach(({ id, ring }) => ring.position.copy(callouts.find(callout => callout.id === id)!.anchor));
    surface.visible = base.visible = northArrow.visible = northLabel.visible = scale.visible = legend.visible = source.visible = true; status.visible = false;
    previousSection = '';
  }).catch(error => {
    if (!alive) return; dataError = true;
    const message = label('高程数据未能加载 · 请重试本节', '#f0c5a4', 7); message.onBeforeRender = () => {}; group.remove(status); status.material.dispose(); status.material.map?.dispose(); group.add(message); failureLabel = message;throw error;
  });
  let failureLabel: THREE.Sprite | null = null;
  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), screen = new THREE.Vector3();
  const screenSprite = (sprite: THREE.Sprite, x: number, y: number, width: number, height: number, depth = .6) => {
    screen.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, depth).unproject(runtime.camera); sprite.position.copy(screen);
    const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))), size = height * screen.distanceTo(runtime.camera.position) / focal;
    sprite.scale.set(size * width / height, size, 1);
  };
  const updateProfile = (longitude: number, cutaway: boolean) => {
    if (!grid) return;
    const x = project(longitude, 0).x;
    const path = profileLine.geometry.attributes.position as THREE.BufferAttribute;
    for (let row = 0; row < rows; row++) {
      const latitude = north - row / (rows - 1) * (north - south), z = project(longitude, latitude).z;
      const y = heightToScene(sampleTerrainMetres(grid, longitude, latitude));
      profilePositions.set([x, y, z], row * 6); profilePositions.set([x, 0, z], row * 6 + 3); path.setXYZ(row, x + .015, y + .045, z);
    }
    profileGeometry.attributes.position.needsUpdate = true; profileGeometry.computeBoundingSphere(); path.needsUpdate = true; profileLine.geometry.computeBoundingSphere();
    const ground = groundLine.geometry.attributes.position as THREE.BufferAttribute; ground.setXYZ(0, x + .03, .01, -DEPTH / 2); ground.setXYZ(1, x + .03, .01, DEPTH / 2); ground.needsUpdate = true; groundLine.geometry.computeBoundingSphere();
    const column = cutaway ? Math.max(1, Math.floor((longitude - west) / (east - west) * (columns - 1))) : columns - 1;
    if (column !== clippedColumn) {
      clippedColumn = column;
      const indices = activeIndex.array as Uint32Array;
      if (!cutaway) { indices.set(originalIndices); geometry.setDrawRange(0, originalIndices.length); }
      else {
        let offset = 0;
        for (let row = 0; row < rows - 1; row++) for (let c = 0; c < column; c++) {
          const a = row * columns + c, b = (row + 1) * columns + c;
          indices[offset++] = a; indices[offset++] = b; indices[offset++] = a + 1;
          indices[offset++] = b; indices[offset++] = b + 1; indices[offset++] = a + 1;
        }
        geometry.setDrawRange(0, offset);
      }
      activeIndex.needsUpdate = true;
    }
  };

  return {
    group,ready,
    dispose: () => {
      alive = false;
    },
    update: (p: TibetSceneProps, _time: number, _dt: number) => {
      const layer = ['terrain', 'water', 'relief'].includes(p.layer) ? p.layer : 'terrain';
      const view = p.viewKey ?? `${p.scene}:${p.step}`, restored = view !== previousView && runtime.hasSavedView(view);
      runtime.renderer.getSize(viewport);
      if (layer !== previousLayer || view !== previousView) {
        previousLayer = layer; previousView = view;
        if (!restored) {
          const target = new THREE.Vector3(0, 1.4, 0);
          runtime.focus(target.clone().add(new THREE.Vector3(layer === 'relief' ? 20 : 6, layer === 'relief' ? 12 : 25, layer === 'relief' ? 26 : 22)), target);
        }
      }
      runtime.sun.position.set(-12, 18, -9);
      screenSprite(status, viewport.x / 2, viewport.y / 2, Math.min(300, viewport.x - 32), 28);
      if (failureLabel) screenSprite(failureLabel, viewport.x / 2, viewport.y / 2, Math.min(330, viewport.x - 28), 28);
      if (!grid || dataError) return;
      mountain.update(p.narratedGeography?.kind==='mountain',p.narratedGeography?.progress??0,p.cutaway?terrainProfileLongitude(p.progress):undefined);
      // Regional comparisons read actual source points against one sea-level
      // reference. They are neither city means nor synthetic climate values.
      const reading=options.regional?{points:regionPair(p).flatMap(id=>{const item=objects.find(item=>item.id===id);return item?[{longitude:item.longitude,latitude:item.latitude}]:[];})}:elevationPose('G4',p,p.guide);
      readingProbes.forEach((probe,index)=>{const point=reading?.points[index];if(!point){probe.group.visible=false;return;}const position=project(point.longitude,point.latitude);position.y=heightToScene(sampleTerrainMetres(grid!,point.longitude,point.latitude))+.06;probe.update(position,true);probe.group.userData.sourceMetres=sampleTerrainMetres(grid!,point.longitude,point.latitude);probe.group.userData.coordinates=[point.longitude,point.latitude];});
      legend.visible = true; valleyEmphasis.visible = layer === 'water';
      const mobile = viewport.x < 550, legendWidth = mobile ? 150 : 180, legendHeight = legendWidth * 174 / 560;
      const legendY = viewport.y < 380 ? 74 : 105;
      screenSprite(legend, viewport.x - legendWidth / 2 - 68, legendY, legendWidth, legendHeight);
      screenSprite(source, viewport.x / 2, viewport.y - (viewport.y < 380 ? 118 : 154), Math.min(viewport.x - 32, 385), mobile ? 19 : 22);
      const showSection = !options.regional && (layer === 'relief' || p.cutaway), longitude = terrainProfileLongitude(p.progress);
      section.visible = showSection;
      const sectionKey = `${longitude.toFixed(3)}:${p.cutaway}`;
      if (sectionKey !== previousSection) { previousSection = sectionKey; updateProfile(longitude, options.regional?false:p.cutaway); }
      wall.visible = p.cutaway; groundLine.visible = p.cutaway; referenceTitle.visible = p.cutaway;
      const profileAnchor = project(longitude, south); profileAnchor.y = heightToScene(sampleTerrainMetres(grid, longitude, south)) + .5; projected.copy(profileAnchor).project(runtime.camera);
      screenSprite(profileTitle, THREE.MathUtils.clamp((projected.x + 1) * viewport.x / 2, 100, viewport.x - 100), THREE.MathUtils.clamp((1 - projected.y) * viewport.y / 2 + 26, 120, viewport.y - 216), 145, 25, projected.z);
      const zeroAnchor = project(longitude, south); projected.copy(zeroAnchor).project(runtime.camera);
      screenSprite(referenceTitle, THREE.MathUtils.clamp((projected.x + 1) * viewport.x / 2, 100, viewport.x - 100), THREE.MathUtils.clamp((1 - projected.y) * viewport.y / 2 + 54, 150, viewport.y - 185), 140, 23, projected.z);
      const chosen = objects.find(object => object.id === p.selected);
      if (p.selected !== previousSelection) {
        previousSelection = p.selected;
        if (chosen && !restored && !options.regional) {
          const target = project(chosen.longitude, chosen.latitude); target.y = heightToScene(sampleTerrainMetres(grid, chosen.longitude, chosen.latitude));
          runtime.focus(target.clone().add(new THREE.Vector3(7, 11, 14).normalize().multiplyScalar(17)), target);
        }
      }
      const occupied: { x: number; y: number; width: number }[] = [84,125,166].map(y=>({x:viewport.x-35,y,width:58}));
      for(const [sprite,anchor,width] of [[northLabel,northAnchor,28],[scaleTitle,scaleAnchor,82]] as const){
        projected.copy(anchor).project(runtime.camera);const x=(projected.x+1)*viewport.x/2,y=(1-projected.y)*viewport.y/2;
        sprite.visible=projected.z>=-1&&projected.z<=1&&x>14&&x<viewport.x-14&&y>85&&y<viewport.y-172;
        if(sprite.visible){screenSprite(sprite,x,y,width,20,projected.z);occupied.push({x,y,width});}
      }
      if(showSection)for(const sprite of [profileTitle,...(p.cutaway?[referenceTitle]:[])]){projected.copy(sprite.position).project(runtime.camera);occupied.push({x:(projected.x+1)*viewport.x/2,y:(1-projected.y)*viewport.y/2,width:150});}
      if (legend.visible) occupied.push({ x: viewport.x - legendWidth / 2 - 68, y: legendY, width: legendWidth });
      const comparison=options.regional?regionPair(p)[1]:'';
      if(options.regional&&`${p.selected}:${comparison}`!==previousPair){
        previousPair=`${p.selected}:${comparison}`;
        for(const callout of callouts){
          const object=objects.find(object=>object.id===callout.id)!;
          const prefix=callout.id===p.selected?'A · ':callout.id===comparison?'B · ':'';
          const text=prefix+object.title,old=callout.sprite;
          const sprite=label(text,callout.id===comparison?'#a8e6e8':'#eee0b7',2.5);sprite.onBeforeRender=()=>{};sprite.userData.selectId=callout.id;
          group.remove(old);old.material.map?.dispose();old.material.dispose();group.add(sprite);callout.sprite=sprite;callout.width=text.length*11+28;
        }
      }
      const priority=(id:string)=>id===p.selected?0:id===comparison?1:2;
      const ordered = [...callouts].sort((a,b)=>priority(a.id)-priority(b.id));
      for (const callout of ordered) {
        const object = objects.find(item => item.id === callout.id)!;
        const enabled = options.regional || !p.cutaway || object.longitude <= longitude + .15;
        callout.pin.visible = enabled; callout.sprite.visible = callout.leader.visible = false;
        if (!enabled) continue;
        if(options.regional){const material=callout.pin.material as THREE.MeshBasicMaterial;material.color.set(callout.id===p.selected?GOLD:callout.id===comparison?TEAL:0x769da9);const ring=callout.pin.children[0] as THREE.Mesh;if(ring){ring.visible=callout.id===p.selected||callout.id===comparison;(ring.material as THREE.MeshBasicMaterial).color.copy(material.color);}}
        callout.pin.scale.setScalar(callout.id === p.selected || callout.id===comparison ? 1.4 : layer === 'water' && callout.id === 'terrain-yarlung' ? 1.3 : 1);
        projected.copy(callout.anchor).project(runtime.camera);
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        if (projected.z > 1 || ax < -15 || ax > viewport.x + 15 || ay < -20 || ay > viewport.y + 20) continue;
        const width = callout.width * (mobile ? .9 : 1), minY = viewport.y < 380 ? 68 : 112, maxY = Math.max(minY, viewport.y - (showSection ? 205 : 190));
        const minX = width / 2 + 12, maxX = viewport.x - width / 2 - 12;
        const preferredX = THREE.MathUtils.clamp(ax + callout.offset[0], minX, maxX), preferredY = THREE.MathUtils.clamp(ay + callout.offset[1], minY, maxY);
        let candidate: { x: number; y: number; cost: number } | null = null;
        for (let y = minY; y <= maxY; y += 31) for (const x of [preferredX, minX, viewport.x / 2, maxX]) {
          if (occupied.some(box => Math.abs(box.x - x) < (box.width + width) / 2 + 7 && Math.abs(box.y - y) < 32)) continue;
          const cost = (x - preferredX) ** 2 + (y - preferredY) ** 2; if (!candidate || cost < candidate.cost) candidate = { x, y, cost };
        }
        if (!candidate) continue;
        callout.sprite.visible = callout.leader.visible = true; occupied.push({ x: candidate.x, y: candidate.y, width });
        screenSprite(callout.sprite, candidate.x, candidate.y, width, mobile ? 23 : 26, projected.z);
        const points = callout.leader.geometry.attributes.position as THREE.BufferAttribute; points.setXYZ(0, callout.anchor.x, callout.anchor.y, callout.anchor.z); points.setXYZ(1, callout.sprite.position.x, callout.sprite.position.y, callout.sprite.position.z); points.needsUpdate = true; callout.leader.geometry.computeBoundingSphere();
      }
    },
  };
}
