import * as THREE from 'three';
import { GOLD, TEAL, label, line, disposeTree } from './environment';
import type { LocalBBox, LocalPlaceId } from './cityLocalMap';
const clamp=THREE.MathUtils.clamp;

/** The overview is a second view of the SAME regional world, not a relocated
 * terrain tile. Its three geographic references remain visible while orbiting
 * real streets in the main camera. */
export function buildCityLocalLocator(at:(lon:number,lat:number,offset?:number)=>THREE.Vector3) {
  const group=new THREE.Group();group.visible=false;group.userData.kind='same-world-locality-overview';
  const camera=new THREE.OrthographicCamera(-10.2,10.2,5.9,-5.9,.01,100),centre=at(87.5,30.4,.02);camera.position.copy(centre).add(new THREE.Vector3(0,18,9));camera.lookAt(centre);camera.updateMatrixWorld();
  const names=[{id:'lulang',name:'林芝·鲁朗',lon:94.725,lat:29.735},{id:'lhasa',name:'拉萨',lon:91.09,lat:29.645},{id:'shiquanhe',name:'阿里·狮泉河',lon:80.1,lat:32.5}] as const;
  // The HUD is the single text layer. Drawing world sprites as well doubles the
  // names in the inset and, on phones, makes them obscure the regional terrain.
  const points=names.map(p=>{const pin=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshBasicMaterial({color:TEAL,depthTest:false}));group.add(pin);return {p,pin};});
  const frame=line(Array.from({length:5},()=>new THREE.Vector3()),GOLD,1);frame.userData.kind='actual-locality-magnification-bounds';(frame.material as THREE.LineBasicMaterial).depthTest=false;group.add(frame);
  const hud=new THREE.Scene(),hudCamera=new THREE.OrthographicCamera(0,1,1,0,-10,10),header=label('三地定位 · 地方参照','#e7e6cd'),scope=label('现状OSM · 地形×1.8','#d4ddca'),groundScope=label('卫星实景 · 地形1×','#d4ddca'),hint=label('返回全域：重置视角','#b6ccc0'),compactScope=label('金框：定位符号','#d4ddca');for(const s of [header,scope,groundScope,hint,compactScope]){s.onBeforeRender=()=>{};hud.add(s);}
  const hudPins=names.map(p=>{const pin=new THREE.Mesh(new THREE.CircleGeometry(3.2,16),new THREE.MeshBasicMaterial({color:TEAL,depthTest:false})),title=label(p.name,'#e4efdb');title.onBeforeRender=()=>{};pin.renderOrder=90;title.renderOrder=91;hud.add(pin,title);return {p,pin,title};}),hudFrame=line(Array.from({length:5},()=>new THREE.Vector3()),GOLD,1);hudFrame.renderOrder=95;(hudFrame.material as THREE.LineBasicMaterial).depthTest=false;hud.add(hudFrame);
  let active:LocalPlaceId|undefined,viewport=new THREE.Vector2(),rect={x:14,y:12,width:180,height:103};
  return {group,hud,camera,
    update(id:LocalPlaceId|undefined,bbox:LocalBBox|undefined,size:THREE.Vector2,overviewPresentation=false,groundView=false){active=id;viewport.copy(size);group.visible=false;const compact=size.x<520,width=overviewPresentation?160:compact?118:size.y<450?162:194,height=width*.57,top=overviewPresentation?62:size.y<450?94:166,right=overviewPresentation?20:60;rect={x:size.x-width-right,y:size.y-top-height,width,height};
      group.userData={...group.userData,activeLocalityId:id,rect,bbox,overviewPresentation,sourceScope:'同一地区总图；金框是数据窗口，不是城界'};
      for(const item of points){item.pin.position.copy(at(item.p.lon,item.p.lat,.025));item.pin.material.color.set(item.p.id===id?GOLD:TEAL);item.pin.scale.setScalar(item.p.id===id?1.5:1);}
      if(bbox){const [w,s,e,n]=bbox,corners=[[w,s],[e,s],[e,n],[w,n],[w,s]],attr=frame.geometry.attributes.position as THREE.BufferAttribute;corners.forEach(([lon,lat],i)=>{const p=at(lon,lat,.08);attr.setXYZ(i,p.x,p.y,p.z);});attr.needsUpdate=true;frame.geometry.computeBoundingSphere();frame.userData.bbox=bbox;}
      // The true 4–10 km window can be subpixel in the regional inset. A sourced
      // pin marks it; a readable 8px outline is explicitly a locator symbol.
      frame.visible=Boolean(id);if(id&&bbox){const anchor=at((bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2,.04),pixel=20.4/width;frame.scale.setScalar(Math.max(1,pixel*8/Math.max(.001,(bbox[2]-bbox[0])*36/47)));frame.position.copy(anchor).multiplyScalar(1-frame.scale.x);frame.userData.displayScope='真实窗口中心上的放大框符号，非城界';}
      hudCamera.left=0;hudCamera.right=size.x;hudCamera.top=size.y;hudCamera.bottom=0;hudCamera.updateProjectionMatrix();
      const fit=(sprite:THREE.Sprite)=>{const image=sprite.material.map?.image as {width?:number;height?:number}|undefined;return width*(image?.height??96)/(image?.width??760);};
      const headerHeight=fit(header),scopeHeight=fit(scope),hintHeight=fit(hint);
      header.position.set(rect.x+width/2,rect.y+height+headerHeight/2+3,0);header.scale.set(width,headerHeight,1);
      scope.position.set(rect.x+width/2,rect.y-scopeHeight/2-4,0);scope.scale.set(width,scopeHeight,1);
      hint.position.set(rect.x+width/2,rect.y-scopeHeight-hintHeight/2-8,0);hint.scale.set(width,hintHeight,1);
      groundScope.position.copy(scope.position);groundScope.scale.copy(scope.scale);groundScope.visible=!compact&&groundView;scope.visible=!compact&&!groundView;hint.visible=!compact&&!overviewPresentation;compactScope.visible=compact;compactScope.position.set(rect.x+width/2,rect.y-12,0);compactScope.scale.set(width,19,1);
      for(const item of hudPins){const projected=at(item.p.lon,item.p.lat,.04).project(camera),x=rect.x+(projected.x+1)*width/2,y=rect.y+(projected.y+1)*height/2,current=item.p.id===id;item.pin.position.set(x,y,1);item.pin.material.color.set(current?GOLD:TEAL);const textWidth=item.p.id==='shiquanhe'?82:item.p.id==='lulang'?66:35;
        // Three staggered rows retain all full place names in 118 CSS pixels.
        // Dimensions are renderer.getSize() units; setViewport applies DPR once.
        const titleY=compact?rect.y+(item.p.id==='shiquanhe'?height-10:item.p.id==='lulang'?height/2:11):y+(item.p.id==='lhasa'?-17:18);
        item.title.position.set(clamp(x+(item.p.id==='lulang'?4:item.p.id==='lhasa'?-11:0),rect.x+textWidth/2+2,rect.x+width-textWidth/2-2),titleY,2);item.title.scale.set(textWidth,22,1);if(current){const windowAnchor=bbox?at((bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2,.04):at(item.p.lon,item.p.lat,.04),windowProjected=windowAnchor.clone().project(camera),fx=rect.x+(windowProjected.x+1)*width/2,fy=rect.y+(windowProjected.y+1)*height/2;const a=hudFrame.geometry.attributes.position as THREE.BufferAttribute;[[-7,-6],[7,-6],[7,6],[-7,6],[-7,-6]].forEach(([dx,dy],i)=>a.setXYZ(i,fx+dx,fy+dy,3));a.needsUpdate=true;hudFrame.geometry.computeBoundingSphere();hudFrame.userData={kind:'projected-real-locality-locator-frame',localityId:id,worldAnchor:windowAnchor,screenBox:{x:fx,y:fy,width:14,height:12},scope:'真实坐标在同世界总览的投影；可读放大框符号，非城界'};}}
    },
    render(renderer:THREE.WebGLRenderer,world:THREE.Scene,hidden:THREE.Object3D[]){if(!active||!renderer.setScissor)return;
      const savedViewport=renderer.getViewport(new THREE.Vector4()),savedScissor=renderer.getScissor(new THREE.Vector4()),test=renderer.getScissorTest(),auto=renderer.autoClear,background=world.background,fog=world.fog,hiddenState=hidden.map(o=>[o,o.visible] as const),sprites:THREE.Sprite[]=[];world.traverse(o=>{if(o instanceof THREE.Sprite&&o.visible&&!group.getObjectById(o.id))sprites.push(o);});
      try{world.fog=null;hiddenState.forEach(([o])=>o.visible=false);sprites.forEach(o=>o.visible=false);group.visible=true;renderer.autoClear=false;renderer.setScissorTest(true);renderer.setViewport(rect.x,rect.y,rect.width,rect.height);renderer.setScissor(rect.x,rect.y,rect.width,rect.height);world.background=new THREE.Color(0x1b2c23);renderer.clear(true,true,true);renderer.render(world,camera);group.visible=false;
        renderer.setViewport(0,0,viewport.x,viewport.y);renderer.setScissor(0,0,viewport.x,viewport.y);renderer.clearDepth();renderer.render(hud,hudCamera);
      }finally{group.visible=false;hiddenState.forEach(([o,v])=>o.visible=v);sprites.forEach(o=>o.visible=true);world.background=background;world.fog=fog;renderer.autoClear=auto;renderer.setViewport(savedViewport);renderer.setScissor(savedScissor);renderer.setScissorTest(test);}
    },
    dispose(){disposeTree(group);disposeTree(hud);},
  };
}
