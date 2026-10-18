import * as THREE from 'three';
import {label,line} from './environment';

export function subjectCallouts(group:THREE.Group,definitions:{id:string;text:string;anchor:THREE.Vector3;show?:()=>boolean}[]){
 const entries=definitions.map(def=>{const sprite=label(def.text,'#eadbb6'),leader=line([def.anchor.clone(),def.anchor.clone()],0xb5d0d0,.7);sprite.onBeforeRender=()=>{};sprite.userData.screenAnnotation=true;sprite.userData.selectId=def.id;group.add(sprite,leader);return {...def,sprite,leader};});
 const size=new THREE.Vector2();
 return {entries,setText:(id:string,text:string)=>{const entry=entries.find(item=>item.id===id);if(!entry||entry.text===text)return;const replacement=label(text,'#eadbb6');entry.sprite.material.map?.dispose();entry.sprite.material.dispose();entry.sprite.material=replacement.material;entry.text=text;},update:(camera:THREE.PerspectiveCamera,renderer:{getSize:(v:THREE.Vector2)=>THREE.Vector2},selected='',reservedBottom=270)=>{
  renderer.getSize(size);if(size.x<2||size.y<2)return;camera.updateMatrixWorld();
  const pixel=24,focal=size.y/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))),occupied:{x:number;y:number;w:number}[]=[90,132,174].map(y=>({x:size.x-35,y,w:65}));
  const top=118,bottom=Math.max(top+pixel,size.y-reservedBottom);
  for(const entry of [...entries].sort((a,b)=>Number(b.id===selected)-Number(a.id===selected))){
   entry.sprite.visible=entry.leader.visible=false;if(entry.show&&!entry.show())continue;
   const projected=entry.anchor.clone().project(camera);if(projected.z< -1||projected.z>1||Math.abs(projected.x)>1.1||Math.abs(projected.y)>1.1)continue;
   const w=Math.min(size.x-28,entry.text.length*(size.x<600?11:10.4)+22),x=THREE.MathUtils.clamp((projected.x+1)*size.x/2,w/2+12,size.x-w/2-12),initial=THREE.MathUtils.clamp((1-projected.y)*size.y/2-24,top,bottom);
   const y=[initial,...Array.from({length:Math.ceil((bottom-top)/(pixel+9))+1},(_,n)=>top+n*(pixel+9))].find(cy=>cy<=bottom&&!occupied.some(box=>Math.abs(box.x-x)<(box.w+w)/2+7&&Math.abs(box.y-cy)<pixel+8));if(y===undefined)continue;
   occupied.push({x,y,w});const position=new THREE.Vector3(x/size.x*2-1,1-y/size.y*2,projected.z).unproject(camera),height=pixel*position.distanceTo(camera.position)/focal;
   entry.sprite.position.copy(position);entry.sprite.scale.set(height*w/pixel,height,1);entry.sprite.visible=entry.leader.visible=true;
   const a=entry.leader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,...entry.anchor.toArray());a.setXYZ(1,...position.toArray());a.needsUpdate=true;entry.leader.geometry.computeBoundingSphere();
  }
 }};
}
