import * as THREE from 'three';

const phase=(p:number,a:number,b:number)=>THREE.MathUtils.smoothstep(p,a,b);
/** Functional study of paired covers and loose leaves, following The Met's
 * explanation of 1987.407.6. No measurements, iconography, original text or
 * attribution of the hypothetical second cover/leaf stack to that object. */
export function manuscriptState(progress:number){
 const p=THREE.MathUtils.clamp(Number.isFinite(progress)?progress:0,0,1);
 return {progress:p,sorting:phase(p,.08,.6),closing:phase(p,.62,1)};
}
export function buildManuscriptStudy(wood:THREE.Material,paper:THREE.Material){
 const group=new THREE.Group();group.name='culture-assembly';group.userData.selectId='culture-craft';group.userData.guideAnchor=new THREE.Vector3(0,1.5,0);
 group.position.set(-.8,.22,.8);
 function board(name:string,w:number,h:number,d:number,material:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.name=name;m.userData.guideId=name;m.userData.guideAnchor=new THREE.Vector3(0,h/2,0);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
 const lower=board('manuscript-lower-cover',4.8,.22,1.9,wood);lower.position.y=.7;
 const upper=board('manuscript-upper-cover',4.8,.22,1.9,wood);
 const leaves=Array.from({length:12},(_,i)=>board(`manuscript-blank-leaf-${i}`,4.35,.035,1.52,paper));
 const leafGroup=new THREE.Group();leafGroup.name='manuscript-leaves';leafGroup.userData.guideId='manuscript-leaves';leafGroup.userData.guideAnchor=new THREE.Vector3();group.add(leafGroup);leaves.forEach(leaf=>leafGroup.add(leaf));
 // The outer rim identifies a protective surface without invented sacred imagery.
 const rimMaterial=new THREE.MeshStandardMaterial({color:0x876746,roughness:.8});
 for(const z of [-.81,.81]){const rim=new THREE.Mesh(new THREE.BoxGeometry(4.5,.04,.07),rimMaterial);rim.position.set(0,.13,z);upper.add(rim);}
 return {group,update(progress:number){
  const s=manuscriptState(progress);group.userData.manuscriptState=s;
  upper.position.set(0,THREE.MathUtils.lerp(3.8,1.40,s.closing),THREE.MathUtils.lerp(-.8,0,s.closing));
  upper.rotation.x=THREE.MathUtils.lerp(-.16,0,s.closing);
  leaves.forEach((leaf,i)=>{
   const restY=.85+i*.037;
   leaf.position.set((i-5.5)*.13*(1-s.sorting),THREE.MathUtils.lerp(1.2+i*.13,restY,s.sorting),.40*(1-s.sorting)*Math.sin(i*.7));
   leaf.rotation.y=(i-5.5)*.025*(1-s.sorting);
  });
  leafGroup.userData.guideAnchor.copy(leaves[6].position).add(new THREE.Vector3(0,.025,0));
 }};
}
