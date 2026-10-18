import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const GOLD = 0xe8c77e;
export const TEAL = 0x71d8dc;
export const IVORY = 0xf1ecda;
export type Updater = (time: number, dt: number) => void;

export function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  root.clear();
}

export function label(text: string, color = '#f3ecda', width = 3.0, appearance: 'boxed'|'map' = 'boxed'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(240, text.length * 52 + 64); canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  if(appearance==='boxed'){
  ctx.fillStyle = 'rgba(5,23,33,.82)';
  ctx.beginPath(); ctx.roundRect(3, 5, canvas.width - 6, 86, 15); ctx.fill();
  ctx.strokeStyle = 'rgba(137,199,210,.25)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.font = '500 52px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  if(appearance==='map'){ctx.lineWidth=8;ctx.strokeStyle='rgba(5,13,9,.88)';ctx.lineJoin='round';ctx.strokeText(text,canvas.width/2,51,canvas.width-40);}
  ctx.fillText(text, canvas.width / 2, 51, canvas.width - 40);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(width, width * 96 / canvas.width, 1); sprite.renderOrder = 8;
  const viewport=new THREE.Vector2(),position=new THREE.Vector3(),parentScale=new THREE.Vector3();
  sprite.frustumCulled=false;
  sprite.onBeforeRender=(renderer,_scene,camera)=>{
    if(!(camera instanceof THREE.PerspectiveCamera))return;
    renderer.getSize(viewport);sprite.getWorldPosition(position);sprite.parent?.getWorldScale(parentScale);
    const distance=position.distanceTo(camera.position),focal=viewport.y/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    // Labels remain readable through map-scale zooms and close object observations.
    const pixelHeight=viewport.y<380?23:27,localHeight=pixelHeight*distance/focal/Math.max(.001,parentScale.y||1);
    sprite.scale.set(localHeight*canvas.width/96,localHeight,1);sprite.updateMatrixWorld();
  };
  return sprite;
}

export function line(points: THREE.Vector3[], color: number, opacity = 1, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: opacity < 1, opacity, dashSize: .17, gapSize: .1 })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const object = new THREE.Line(geometry, material);
  if (dashed) object.computeLineDistances();
  return object;
}

export function curvedLine(points: THREE.Vector3[], color = TEAL, thickness = .025) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, thickness, 5, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .86 }));
  return { curve, mesh };
}

export function latLon(latitude: number, longitude: number, radius: number) {
  const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon));
}

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}

/** Procedural material detail, not a map or observed terrain image. */
export function mineralTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const broad=noise(x/33,y/33),grain=hash(x,y),vein=Math.abs(noise(x/13+noise(x/65,y/65)*3,y/18)*2-1);
    const value=Math.max(80,Math.min(255,167+broad*58+grain*31-vein*24)),i=(y*512+x)*4;
    pixels.data[i]=value;pixels.data[i+1]=value;pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(9,7);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function terrainHeight(x: number, z: number) {
  let roughness = 0, amplitude = .56, frequency = .55;
  for (let i = 0; i < 5; i++) { roughness += amplitude * (1 - Math.abs(noise(x * frequency + 4, z * frequency + 5) * 2 - 1)); amplitude *= .49; frequency *= 2.15; }
  const chain = Math.exp(-Math.pow((z + 1.35 + .7 * Math.sin(x * .6)) / 2.05, 2));
  const peaks = 1.7 + 1.2 * Math.pow(Math.sin(x * .72 + 1.3), 2) + 1.1 * roughness;
  const plateau = .5 + .6 / (1 + Math.exp(z + 3));
  const valleyX = .7 + Math.sin(z * .55) * 1.5;
  const riverValley = Math.exp(-Math.pow((x - valleyX) / .95, 2));
  const lake = Math.exp(-((x + 4.4) ** 2 / 3 + (z - 3.4) ** 2 / 1.3));
  return Math.max(.16, plateau + roughness * .7 + chain * peaks * (1 - .68 * riverValley) - .4 * riverValley - .85 * lake);
}

export interface Terrain {
  group: THREE.Group;
  surface: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  sides: THREE.Group;
  trees: THREE.Group;
  river: THREE.Object3D;
  colors: Float32Array;
  heights: Float32Array;
  setSeason: (season: number, mode?: string) => void;
}

export function createTerrain(immersive = false): Terrain {
  const group = new THREE.Group();
  // Local observations continue into a surrounding landscape. A section alone keeps exposed sides.
  const width=immersive?64:18,depth=immersive?56:14;
  const segments = immersive?230:160, geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3), heights = new Float32Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    const x=positions.getX(i),z=positions.getZ(i),base=terrainHeight(x,z);
    const y=immersive?THREE.MathUtils.lerp(base,-.35,THREE.MathUtils.smoothstep(z,9,13)):base;
    positions.setY(i, y); heights[i] = y;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const detail=mineralTexture();
  const surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, map:detail, bumpMap:detail, bumpScale:.075, roughness: .94, metalness: .01, side: THREE.DoubleSide }));
  surface.receiveShadow = true; surface.castShadow = true; group.add(surface);
  const sides = new THREE.Group();
  for (let side = 0; side < 4; side++) {
    for (let band = 0; band < 5; band++) {
      const vertices: number[] = [];
      for (let i = 0; i < 100; i++) {
        const t1 = i / 100, t2 = (i + 1) / 100;
        const coord = (t: number) => side === 0 ? [-9 + 18 * t, 7] : side === 1 ? [9, 7 - 14 * t] : side === 2 ? [9 - 18 * t, -7] : [-9, -7 + 14 * t];
        const [x1, z1] = coord(t1), [x2, z2] = coord(t2);
        const top1 = terrainHeight(x1, z1), top2 = terrainHeight(x2, z2);
        const y11 = -1.25 + (top1 + 1.25) * band / 5, y12 = -1.25 + (top1 + 1.25) * (band + 1) / 5;
        const y21 = -1.25 + (top2 + 1.25) * band / 5, y22 = -1.25 + (top2 + 1.25) * (band + 1) / 5;
        vertices.push(x1,y11,z1,x2,y21,z2,x2,y22,z2,x1,y11,z1,x2,y22,z2,x1,y12,z1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); g.computeVertexNormals();
      sides.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:[0x374349,0x5e5951,0x786b59,0x948574,0x5e6255][band],roughness:1,side:THREE.DoubleSide})));
    }
  }
  group.add(sides);
  const riverPoints: THREE.Vector3[] = [];
  for(let i=0;i<=180;i++){const z=immersive?-27+i/180*54:-6.8+i/180*13.6,x=.7+Math.sin(z*.55)*1.5;riverPoints.push(new THREE.Vector3(x,terrainHeight(x,z)+.04,z));}
  const river = curvedLine(riverPoints,0x71b8c6,.085).mesh; group.add(river);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshStandardMaterial({color:0x3c8d9e,roughness:.21,metalness:.33,transparent:true,opacity:.92}));
  lake.rotation.x=-Math.PI/2;lake.scale.set(1.6,.76,1);lake.position.set(-4.4,.33,3.4);group.add(lake);
  const trees = new THREE.Group();
  const boughs=[new THREE.ConeGeometry(.145,.36,8),new THREE.ConeGeometry(.11,.34,8),new THREE.ConeGeometry(.075,.3,8)];
  boughs[0].translate(0,-.12,0);boughs[1].translate(0,.055,0);boughs[2].translate(0,.225,0);
  const treeGeo = mergeGeometries(boughs), trunkGeo = new THREE.CylinderGeometry(.026,.04,.26,6);
  boughs.forEach(g=>g.dispose());
  const leaf = new THREE.MeshStandardMaterial({color:0x244c3a,roughness:1});
  const treeCount=immersive?950:470;
  const treesMesh = new THREE.InstancedMesh(treeGeo,leaf,treeCount), trunks = new THREE.InstancedMesh(trunkGeo,new THREE.MeshStandardMaterial({color:0x605342}),treeCount);
  const dummy=new THREE.Object3D();let count=0;
  for(let i=0;i<5000 && count<treeCount;i++){
    const x=hash(i,12)*(immersive?39:17)-(immersive?19.5:8.5),z=hash(i,31)*(immersive?29.8:11.8)-(immersive?13.8:5.8),y=terrainHeight(x,z);
    if(y>1.7||z<0||Math.abs(x-(.7+Math.sin(z*.55)*1.5))<.35||((x+4.4)**2/3+(z-3.4)**2/1.3)<1.3)continue;
    const s=.4+hash(i,7)*.65;dummy.position.set(x,y+.3*s,z);dummy.scale.setScalar(s);dummy.rotation.y=hash(i,5)*Math.PI;dummy.updateMatrix();treesMesh.setMatrixAt(count,dummy.matrix);
    dummy.position.y=y+.09*s;dummy.updateMatrix();trunks.setMatrixAt(count,dummy.matrix);count++;
  }
  treesMesh.count=count;trunks.count=count;treesMesh.castShadow=true;trees.add(treesMesh,trunks);group.add(trees);
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.1,0),new THREE.MeshStandardMaterial({color:0x8c8e85,roughness:1}),160);
  for(let i=0;i<160;i++){const x=hash(i,44)*17-8.5,z=hash(i,22)*12-6,y=terrainHeight(x,z);dummy.position.set(x,y+.035,z);dummy.scale.set(.5+hash(i,19),.4+hash(i,8),.5+hash(i,3));dummy.rotation.set(i,hash(i,6),i*.5);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}group.add(rocks);
  const c = new THREE.Color(), low = new THREE.Color(), middle=new THREE.Color(0x8b8b79), high=new THREE.Color(0xe5e9e6);
  function setSeason(season:number, mode=''){
    low.set(season===3?0x7f877c:season===2?0x8c8754:0x526d4d);
    for(let i=0;i<positions.count;i++){
      const h=heights[i],x=positions.getX(i),z=positions.getZ(i),n=noise(x*6,z*6);
      if(mode==='temperature'||mode==='温度')c.setHSL(.06+.55*Math.min(1,h/4.8),.36,.4+n*.13);
      else if(mode==='elevation'||mode==='高程')c.setHSL(.35-h*.065,.3,.3+h*.08);
      else {c.copy(low).lerp(middle,THREE.MathUtils.smoothstep(h,.8,3.2));const snowline=season===3?2.1:season===1?3.7:3.1;c.lerp(high,THREE.MathUtils.smoothstep(h+n*.35,snowline,snowline+.5));c.multiplyScalar(.87+n*.2);if(z < -3.5)c.lerp(new THREE.Color(0xa69577),.3);}
      c.toArray(colors,i*3);
    }
    geometry.attributes.color.needsUpdate=true;
    leaf.color.set(season===3?0x536456:season===2?0x747343:0x244c3a);
  }
  setSeason(1);
  return {group,surface,sides,trees,river,colors,heights,setSeason};
}

export function addMarker(parent:THREE.Group,id:string,text:string,x:number,y:number,z:number,color=GOLD){
  const marker=new THREE.Group();marker.position.set(x,y,z);marker.userData.selectId=id;
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.6,6),new THREE.MeshBasicMaterial({color}));stem.position.y=.3;marker.add(stem);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(.105,14,10),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.5}));orb.position.y=.64;marker.add(orb);
  const halo=new THREE.Mesh(new THREE.RingGeometry(.16,.19,28),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.65}));halo.rotation.x=-Math.PI/2;halo.position.y=.03;marker.add(halo);
  const title=label(text, color===GOLD?'#f0d89f':'#b7eff0',2.0);title.position.y=1.04;marker.add(title);
  parent.add(marker);return marker;
}

export function makeStars(){
  const positions=new Float32Array(1500*3),colors=new Float32Array(1500*3);
  for(let i=0;i<1500;i++){const theta=hash(i,1)*Math.PI*2,phi=Math.acos(hash(i,2)*2-1),r=65+hash(i,3)*60;positions.set([r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta)],i*3);const b=.35+hash(i,9)*.65;colors.set([b*.8,b*.9,b],i*3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));return new THREE.Points(g,new THREE.PointsMaterial({size:.09,vertexColors:true,transparent:true,opacity:.7,sizeAttenuation:true,depthWrite:false}));
}

/** Atmospheric depth and distant ridges surround a local, explicitly conceptual model. */
export function landscapeHorizon(){
  const group=new THREE.Group();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(110,48,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 p;void main(){float h=clamp((normalize(p).y+.08)*1.7,0.0,1.0);vec3 low=vec3(.40,.54,.62);vec3 high=vec3(.045,.12,.20);gl_FragColor=vec4(mix(low,high,pow(h,.7)),1.0);}'
  }));sky.renderOrder=-2;group.add(sky);
  for(let band=0;band<3;band++){
    const geometry=new THREE.PlaneGeometry(140,22,200,36);geometry.rotateX(-Math.PI/2);
    const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3),color=new THREE.Color();
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i),ridge=Math.exp(-z*z/46),peak=1.4+Math.abs(Math.sin(x*.12+band))*.95+noise(x*.28,band)*.75;
      const y=-.3+ridge*peak+.4*noise(x*2,z);positions.setY(i,y);
      color.set(0x748f99).lerp(new THREE.Color(0xc6d0ce),THREE.MathUtils.smoothstep(y,3.3,5.4)).lerp(new THREE.Color(0x54717f),band*.2);color.toArray(colors,i*3);
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
    const ridge=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));ridge.position.z=-28-band*14;group.add(ridge);
  }
  return group;
}

export const places=[
  {id:'lhasa',name:'拉萨',x:.4,z:3.2},
  {id:'nyingchi',name:'林芝',x:5.7,z:3.3},
  {id:'shannan',name:'山南',x:2.7,z:4.8},
  {id:'shigatse',name:'日喀则',x:-2.8,z:3.2},
  {id:'nagqu',name:'那曲',x:1.2,z:-3.8},
  {id:'ngari',name:'阿里',x:-6.8,z:-3.9},
  {id:'chamdo',name:'昌都',x:6.7,z:-2.8},
];
