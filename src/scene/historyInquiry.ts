import * as THREE from 'three';
import {label,line,mineralTexture} from './environment';
import {historyPeriods} from '../data/curriculum';
import type {TibetSceneProps} from './TibetScene';

type Runtime={renderer:{getSize:(target:THREE.Vector2)=>THREE.Vector2};camera:THREE.PerspectiveCamera};
type Caption={id:string;text:string;anchor:THREE.Vector3;sprite:THREE.Sprite;leader:THREE.Line;scene:number;priority:number};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const GOLD=0xe8c98d,TEAL=0x8bced2;

/** A material/inference model. No object is an archaeological facsimile or an ancient map. */
export function buildHistoryInquiryScene(runtime:Runtime){
 const group=new THREE.Group();group.name='history-material-inquiry';
 const texture=mineralTexture();texture.repeat.set(6,4);
 const stone=new THREE.MeshStandardMaterial({color:0x98998b,map:texture,roughness:.94});
 const wood=new THREE.MeshStandardMaterial({color:0x71604c,roughness:.87});
 const paper=new THREE.MeshStandardMaterial({color:0xd8cfb1,roughness:.92,side:THREE.DoubleSide});
 const teal=new THREE.MeshStandardMaterial({color:0x6eaaad,roughness:.65,metalness:.1});
 const brass=new THREE.MeshStandardMaterial({color:GOLD,roughness:.63,metalness:.2});
 const dark=new THREE.MeshStandardMaterial({color:0x36535c,roughness:.87});
 const frame=new THREE.MeshStandardMaterial({color:0x506c73,roughness:.8});
 const scenes=Array.from({length:4},(_,index)=>{const g=new THREE.Group();g.name=`history-inquiry-${index}`;group.add(g);return g;});
 const captions:Caption[]=[];
 function box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function subject(parent:THREE.Object3D,id:string,x:number,y:number,z:number,anchor=V(0,.8,0)){const g=new THREE.Group();g.userData.selectId=id;g.userData.guideId=id;g.userData.guideAnchor=anchor;g.position.set(x,y,z);parent.add(g);return g;}
 function caption(scene:number,id:string,text:string,anchor:THREE.Vector3,priority=1){const sprite=label(text,'#e6d7b5');sprite.onBeforeRender=()=>{};sprite.userData.selectId=id;sprite.userData.screenAnnotation=true;const leader=line([anchor,anchor],0x8db9bd,.5);scenes[scene].add(sprite,leader);captions.push({id,text,anchor,sprite,leader,scene,priority});return captions[captions.length-1];}
 function base(parent:THREE.Object3D){box(parent,19,.35,11,0,-.2,0,wood);box(parent,18.4,.06,10.4,0,.01,0,dark);}
 scenes.forEach(base);

 // H1: expose context before interpreting objects. The strata are deliberately unmeasured.
 const context=subject(scenes[0],'history-context',-3,0,0,V(0,1,0));
 const strata=[0x9b8362,0x7e715e,0xad9777].map((color,index)=>box(context,7,.68,5.4,0,.38+index*.68,0,new THREE.MeshStandardMaterial({color,roughness:1})));
 const contextCover=box(context,7.1,.1,5.5,0,2.15,0,stone);contextCover.name='history-context-cover';
 const tool=subject(scenes[0],'history-tool',-3,1.0,.9,V(0,.2,0));
 const toolMesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.47,0),stone);toolMesh.scale.set(.54,.31,1.4);tool.add(toolMesh);toolMesh.name='unmeasured-tool-token';
 const dating=subject(scenes[0],'history-dating',3.7,.1,-1.8,V(0,.7,0));box(dating,2.6,.13,1.8,0,.15,0,paper);
 // A neutral sample token moves from contextual layer to a record tray. It is
 // neither a Nwya Devu sample replica nor a simulated dating instrument/result.
 const sample=box(scenes[0],.35,.27,.35,-3,1,-.8,teal);sample.name='history-context-sample';sample.userData.guideId='history-sample';sample.userData.guideAnchor=V(0,.2,0);
 const inference=subject(scenes[0],'history-inference',3.6,.1,2.1,V(0,.4,0));
 const inferenceSlots=[-1.2,0,1.2].map((x,index)=>{const g=subject(inference,`history-proof-${index}`,x,0,0,V(0,.4,0));box(g,.85,.12,1.55,0,.1,0,index===0?brass:frame);
  if(index===0){[-.18,.18].forEach((v,n)=>{const foot=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.23,4,8),brass);foot.rotation.x=Math.PI/2;foot.position.set(v,.24,n*.22-.1);g.add(foot);});}
  if(index===1){box(g,.44,.32,.5,0,.3,0,paper);box(g,.53,.08,.58,0,.5,0,wood);}
  if(index===2){[-.22,0,.22].forEach(v=>{const head=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),frame);head.position.set(v,.43,0);g.add(head);});}
  return g;});
 caption(0,'history-context','发现位置与层位',V(-4,2.3,-1.4),0);caption(0,'history-tool','器物：示意，非出土原件',V(-3,1.25,.9),0);caption(0,'history-dating','样本、年代与研究记录',V(3.7,.8,-1.8));caption(0,'history-inference','活动 ≠ 全年定居 ≠ 现代族群',V(3.6,.5,2.1),0);

 // H2: ordered folders open into concurrent strands; spacing never encodes equal duration.
 const periods=subject(scenes[1],'history-periods',0,0,-2.4,V(0,.7,0));
 const folders=historyPeriods.map((period,index)=>{const g=new THREE.Group();g.position.set((index-4)*1.72,.14,0);g.userData.selectId=period.id;g.userData.guideAnchor=V(0,.5,0);periods.add(g);box(g,1.45,.13,2.5,0,.05,0,wood);const leaf=box(g,1.4,.045,2.4,0,.2,0,paper);leaf.name=`period-leaf-${period.id}`;const tag=label(period.label,'#c8d5cf',1.4);tag.position.set(0,.32,1.45);g.add(tag);tag.visible=false;return {g,leaf,tag,period};});
 const strandSubjects=[['history-politics','政治与组织'],['history-knowledge','知识与信仰'],['history-practice','生产与日常']].map(([id,text],index)=>{
  const g=subject(scenes[1],id,(index-1)*5.0,0,2.3,V(0,1,0));box(g,3.4,.22,2.2,0,.2,0,index===0?brass:index===1?teal:paper);
  const sheets=Array.from({length:3},(_,n)=>box(g,2.8,.045,1.6,0,.4+n*.14,0,paper));caption(1,id,text,V((index-1)*5,.9,2.3),0);return {g,sheets};
 });
 const periodCaption=caption(1,'history-periods','时期阅读夹 · 间距不代表历时',V(0,1.1,-2.4),0);

 // H3: a document/stone/copy chain, without counterfeit inscriptions or invented rubbing date.
 const events=subject(scenes[2],'history-event',-5.6,0,-.8,V(0,.7,0));
 const eventCards=[-1,1].map((z,index)=>{const g=new THREE.Group();g.position.set(0,.12,z);g.userData.guideId=`history-event-${821+index}`;g.userData.guideAnchor=V(0,.25,0);events.add(g);box(g,2.5,.09,1.5,0,0,0,paper);return {g,index};});
 const stele=subject(scenes[2],'history-stele-body',-.4,0,0,V(0,2.1,0));
 box(stele,2.45,.24,1.8,0,.15,0,stone);box(stele,1.8,.22,1.35,0,.38,0,stone);
 const steleBody=box(stele,1.05,3.35,.43,0,2.15,0,stone);steleBody.name='uninscribed-stone-carrier';
 const rubbing=subject(scenes[2],'history-rubbing',1.5,0,.6,V(0,2.1,0));
 const rubbingSheet=box(rubbing,.98,3.25,.024,0,2.15,0,paper);rubbingSheet.name='blank-copy-carrier';
 const reading=subject(scenes[2],'history-reading',5.5,0,-.4,V(0,.7,0));box(reading,2.8,.18,2.3,0,.3,0,wood);box(reading,2.5,.04,2,0,.42,0,paper);
 caption(2,'history-event','821 长安 · 822 拉萨',V(-5.6,.8,-.8),0);caption(2,'history-stele-body','823 立碑 · 无字载体示意',V(-.4,3.9,0),0);caption(2,'history-rubbing','拓本：复制日期另查',V(1.5,3.7,.6),0);caption(2,'history-reading','馆藏说明、原文与研究',V(5.5,.8,-.4));

 // H4: file nodes do not automatically change household objects or claim outcomes.
 const documents=subject(scenes[3],'history-document',-5.8,0,-.5,V(0,.7,0));
 const documentFolders=[1951,1959,1965].map((year,index)=>{const g=new THREE.Group();g.position.set(0,.15,index*1.9-1.9);documents.add(g);box(g,2.9,.13,1.6,0,.05,0,wood);const page=box(g,2.7,.04,1.45,0,.2,0,paper);g.name=`historical-document-${year}`;g.userData.selectId=`event-${year}`;g.userData.guideId=`history-document-${year}`;g.userData.guideAnchor=V(0,.65,0);return {g,page,year};});
 const institutions=subject(scenes[3],'history-institution',.2,0,-.8,V(0,1.7,0));
 const institutionalLayers=[brass,teal,paper].map((m,index)=>box(institutions,3.7,.22,2.8,0,.35+index*.35,0,m));
 const households=subject(scenes[3],'history-household',5.5,0,1,V(0,1.1,0));
 [-.85,.85].forEach(x=>{box(households,1.3,1.05,1.2,x,.65,0,paper);box(households,1.42,.15,1.35,x,1.24,0,wood);box(households,.3,.65,.03,x,.45,.62,dark);});
 const missing=subject(scenes[3],'history-inference',2.7,0,2.6,V(0,.5,0));
 const queryPanels=[-.55,.55].map(x=>box(missing,.75,.08,1.1,x,.2,0,frame));
 caption(3,'history-document','1951 / 1959 / 1965 · 不同材料',V(-5.8,.8,-.5),0);caption(3,'history-institution','制度 → 地方组织 → 实施',V(.2,1.9,-.8),0);caption(3,'history-household','生活经验：需要具体调查',V(5.5,1.4,1),0);caption(3,'history-inference','补充地方与时期证据',V(2.7,.6,2.6));

 const note=label('材料关系教学模型 · 不复原遗址、原碑文字或历史城市','#bcd0d0');note.onBeforeRender=()=>{};group.add(note);
 const size=new THREE.Vector2(),point=new THREE.Vector3(),screen=new THREE.Vector3();
 return {group,update:(p:TibetSceneProps)=>{
  const scene=Math.max(0,Math.min(3,p.step)),progress=THREE.MathUtils.clamp(p.progress,0,1),phase=progress<.32?0:progress<.68?1:2;
  scenes.forEach((g,index)=>g.visible=index===scene);group.userData.materialStage=phase;
  const unfold=THREE.MathUtils.smoothstep(progress,0,.62);
  const contextUnfold=THREE.MathUtils.smoothstep(progress,0,.3),sampleTransfer=THREE.MathUtils.smoothstep(progress,.3,.6);
  contextCover.position.y=2.15+contextUnfold*1.3;contextCover.position.x=-contextUnfold*1.7;
  strata.forEach((m,index)=>{m.position.x=index===2?-contextUnfold*.7:0;});
  tool.position.y=1+contextUnfold*1.5;dating.visible=progress>.18;inference.visible=phase===2;
  sample.visible=progress>.25;sample.position.copy(V(-3,1,-.8).lerp(V(3.15,.54,-1.8),sampleTransfer));sample.rotation.y=sampleTransfer*.35;
  group.userData.contextReading={contextUnfold,sampleTransfer,claim:p.layer==='identity'?'identity':p.layer==='settlement'?'settlement':'activity'};
  const claimIndex=p.layer==='settlement'?1:p.layer==='identity'?2:0;
  inferenceSlots.forEach((g,index)=>{g.position.y=index===claimIndex?.45:0;g.userData.supported=index===0;g.userData.questioned=index===claimIndex;});
  const selectedIndex=historyPeriods.findIndex(period=>period.id===p.selected),index=selectedIndex<0?1:selectedIndex;
  folders.forEach((folder,n)=>{const active=n===index;folder.leaf.rotation.x=active?-.65:0;folder.leaf.position.y=active?.65:.2;folder.tag.visible=active;folder.g.position.y=active?.4:.14;});
  const narrativeSpread=p.guide?.active&&p.guide.sceneProgress!==undefined?THREE.MathUtils.smoothstep(progress,0,.32):1;
  strandSubjects.forEach((strand,n)=>{strand.g.visible=true;const active=p.guide?.active&&p.guide.targets.includes(['history-politics','history-knowledge','history-practice'][n]),spread=p.layer==='overlap'?narrativeSpread:0;strand.sheets.forEach((sheet,j)=>{sheet.position.y=.4+j*(.14+spread*.26)+(active?.2:0);sheet.position.x=spread*(j-1)*.35;});strand.g.userData.strand=n;});
  periodCaption.sprite.userData.periodLabel=historyPeriods[index].label;
  eventCards.forEach(item=>item.g.position.y=p.layer===`event-${821+item.index}`?.4:.12);
  steleBody.position.y=2.15+unfold*.28;rubbing.position.x=.25+unfold*2.3;rubbing.position.z=.4+unfold*.65;rubbing.visible=progress>.2;
  rubbingSheet.rotation.y=-unfold*.13;reading.visible=phase===2;
  const year=p.layer==='event-1951'?1951:p.layer==='event-1965'?1965:1959;
  documentFolders.forEach(item=>{item.page.rotation.x=item.year===year?-.6:0;item.page.position.y=item.year===year?.6:.2;});
  institutionalLayers.forEach((m,n)=>m.position.y=.35+n*(.35+unfold*.65));
  missing.visible=phase===2;queryPanels.forEach(panel=>panel.visible=phase===2);
  // All houses are invariant across years; no fabricated social-impact animation.
  households.visible=true;
  group.updateMatrixWorld(true);runtime.camera.updateMatrixWorld();runtime.renderer.getSize(size);
  if(size.x<2||size.y<2)return;
  const compact=size.y<480,focal=size.y/(2*Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2))),height=size.x<600?21:25;
  const activeTargets=p.guide?.active?new Set(p.guide.targets):undefined;
  const relevant=(c:Caption)=>!!activeTargets?.has(c.id)||c.id==='history-dating'&&!!activeTargets?.has('history-sample')||c.id==='history-event'&&!![...(activeTargets??[])].some(id=>id.startsWith('history-event-'))||c.id==='history-document'&&!![...(activeTargets??[])].some(id=>id.startsWith('history-document-'));
  const occupied:{x:number;y:number;w:number}[]=[],top=compact?83:112,bottom=Math.max(top+height,size.y-(compact?100:245));let displayed=0;
  for(const c of [...captions].sort((a,b)=>Number(relevant(b))-Number(relevant(a))||a.priority-b.priority)){
   c.sprite.visible=c.leader.visible=c.scene===scene;
   if(c.id==='history-tool'&&scene===0)c.anchor.copy(tool.position).add(V(0,.25,0));
   if(c.id==='history-rubbing'&&scene===2)c.anchor.copy(rubbing.position).add(V(0,3.7,0));
   if(!c.sprite.visible)continue;
   if(compact&&displayed>=3||activeTargets&&!relevant(c)&&displayed>=2){c.sprite.visible=c.leader.visible=false;continue;}
   if((c.id==='history-inference'&&scene===0&&phase!==2)||(c.id==='history-dating'&&scene===0&&progress<=.18)||(c.id==='history-rubbing'&&scene===2&&progress<=.2)||(c.id==='history-reading'&&scene===2&&phase!==2)||(c.id==='history-inference'&&scene===3&&phase!==2)){c.sprite.visible=c.leader.visible=false;continue;}
   point.copy(c.anchor).project(runtime.camera);if(point.z>1||point.z< -1){c.sprite.visible=c.leader.visible=false;continue;}
   const ax=(point.x+1)*size.x/2,ay=(1-point.y)*size.y/2,w=Math.min(size.x-28,c.text.length*(size.x<600?9:10)+22),x=THREE.MathUtils.clamp(ax,w/2+12,size.x-w/2-12);
   let y=THREE.MathUtils.clamp(ay-28,top,bottom),found=false;
   for(const cy of [y,...Array.from({length:Math.max(1,Math.floor((bottom-top)/(height+7))+1)},(_,i)=>top+i*(height+7))]){if(!occupied.some(b=>Math.abs(x-b.x)<(w+b.w)/2+5&&Math.abs(cy-b.y)<height+6)){y=cy;found=true;break;}}
   if(!found){c.sprite.visible=c.leader.visible=false;continue;}occupied.push({x,y,w});displayed++;
   screen.set(x/size.x*2-1,1-y/size.y*2,point.z).unproject(runtime.camera);c.sprite.position.copy(screen);const h=height*screen.distanceTo(runtime.camera.position)/focal;c.sprite.scale.set(h*w/height,h,1);
   const a=c.leader.geometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,c.anchor.x,c.anchor.y,c.anchor.z);a.setXYZ(1,screen.x,screen.y,screen.z);a.needsUpdate=true;c.leader.geometry.computeBoundingSphere();
  }
  screen.set(0,1-(size.y-(compact?83:260))/size.y*2,.5).unproject(runtime.camera);note.position.copy(screen);const h=17*screen.distanceTo(runtime.camera.position)/focal;note.scale.set(h*Math.min(size.x-24,460)/17,h,1);
 }};
}
