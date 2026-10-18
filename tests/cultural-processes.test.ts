import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildCourtyardScene } from '../src/scene/culture';
import { culturalProcessState, culturalUnderstanding } from '../src/data/culturalUnderstanding';
import type { TibetSceneProps } from '../src/scene/TibetScene';
import { defaultSettings } from '../src/lib/store';

vi.mock('../src/scene/environment', async importOriginal => {
  const original = await importOriginal<typeof import('../src/scene/environment')>();
  return { ...original, label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() };
});

function fixture(width=1280,height=720) {
  const camera=new THREE.PerspectiveCamera(43,width/height,.1,180);
  camera.position.set(7.2,5.8,10.5);camera.lookAt(0,1.6,-1.3);camera.updateMatrixWorld();
  const renderer={getSize:(value:THREE.Vector2)=>value.set(width,height)};
  const model=buildCourtyardScene({renderer,camera});
  const props:TibetSceneProps={scene:'culture',step:0,season:1,layer:'architecture',progress:0,playing:false,selected:'courtyard',cutaway:false,resetKey:0,onSelect:()=>{},onInteract:()=>{}};
  return {model,props,camera};
}
function shown(object:THREE.Object3D) {
  for(let current:THREE.Object3D|null=object;current;current=current.parent)if(!current.visible)return false;
  return true;
}
function snapshot(group:THREE.Group) {
  const values:unknown[]=[];
  group.traverse(object=>{values.push([object.name,object.visible,...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()]);
    if(object instanceof THREE.Line)values.push(Array.from(object.geometry.attributes.position.array));
  });
  return values;
}

describe('文化通过构造、学习与使用的三维过程解释',()=>{
  it('由基底搭起围合、梁柱与覆盖，最后让使用者进入同一院落',()=>{
    const {model,props}=fixture(),walls=model.group.getObjectByName('culture-walls')!,timber=model.group.getObjectByName('culture-timber')!,roofs=model.group.getObjectByName('culture-roofs')!,users=model.group.getObjectByName('culture-daily-use')!,neighbours=model.group.getObjectByName('culture-neighbouring-context')!;
    model.update(props);expect(shown(model.group.getObjectByName('culture-foundation')!)).toBe(true);expect(shown(walls)).toBe(false);expect(shown(timber)).toBe(false);expect(shown(users)).toBe(false);
    expect(shown(neighbours)).toBe(false);
    model.update({...props,progress:.18});expect(shown(walls)).toBe(true);expect(walls.scale.y).toBeLessThan(1);expect(shown(timber)).toBe(false);
    model.update({...props,progress:.55});expect(walls.scale.y).toBe(1);expect(timber.scale.y).toBe(1);expect(shown(roofs)).toBe(true);expect(roofs.position.y).toBeGreaterThan(0);expect(shown(neighbours)).toBe(false);
    model.update({...props,progress:1});expect(roofs.position.y).toBe(0);expect(shown(users)).toBe(true);expect(shown(neighbours)).toBe(true);
    model.update({...props,progress:1,cutaway:true});expect(shown(roofs)).toBe(false);expect(shown(timber)).toBe(true);model.dispose();
  });

  it('文本进入工作桌，形成对照与学习，再把载体和使用者带向厅堂',()=>{
    const {model,props}=fixture(),carrier=model.group.getObjectByName('culture-incoming-carrier')!,pages=model.group.getObjectByName('culture-compared-pages')!,learners=model.group.getObjectByName('culture-learning-work')!,practice=model.group.getObjectByName('culture-practice-carrier')!,learner=model.group.getObjectByName('culture-learner')!;
    model.update({...props,step:1,layer:'religion',progress:.12});expect(carrier.position.z).toBeGreaterThan(1);expect(shown(pages)).toBe(false);expect(shown(learners)).toBe(false);
    model.update({...props,step:1,layer:'religion',progress:.52});expect(carrier.position.z).toBe(0);expect(shown(pages)).toBe(true);expect(shown(learners)).toBe(true);const learnedAt=learner.position.clone();
    model.update({...props,step:1,layer:'religion',progress:1});expect(shown(carrier)).toBe(false);expect(shown(practice)).toBe(true);expect(practice.position.z).toBeLessThan(-2);expect(learner.position.z).toBeLessThan(learnedAt.z);model.dispose();
  });

  it('木护板保护书页，页片先整理、上板后合拢，倒退可再展开',()=>{
    const {model,props}=fixture(),upper=model.group.getObjectByName('manuscript-upper-cover')!,lower=model.group.getObjectByName('manuscript-lower-cover')!,leaf=model.group.getObjectByName('manuscript-blank-leaf-0')!;
    model.update({...props,step:2,layer:'art',progress:0});const apart=upper.position.clone(),spread=leaf.position.clone();
    expect(upper.position.y).toBeGreaterThan(3);expect(shown(leaf)).toBe(true);
    model.update({...props,step:2,layer:'art',progress:.6});expect(leaf.position.x).toBeCloseTo(0);expect(upper.position.y).toBe(apart.y);
    model.update({...props,step:2,layer:'art',progress:1});expect(upper.position.y).toBeCloseTo(1.4);expect(lower.position.y).toBe(.7);expect(leaf.position.y).toBeGreaterThan(lower.position.y);expect(leaf.position.y).toBeLessThan(upper.position.y);
    expect(shown(model.group.getObjectByName('culture-walls')!)).toBe(false);
    model.update({...props,step:2,layer:'art',progress:0});expect(upper.position).toEqual(apart);expect(leaf.position).toEqual(spread);model.dispose();
  });

  it('藏戏场地比较保留同一组角色与进度，改变观看方向和舞台承托',()=>{
    const {model,props}=fixture(),opera=model.group.getObjectByName('opera-practice-model')!,audience=model.group.getObjectByName('opera-audience')!;
    const cast=['opera-narrator','opera-performer-0','opera-performer-mentor','opera-learner'].map(name=>model.group.getObjectByName(name)!);
    const audienceIds=audience.children.map(actor=>actor.uuid),castIds=cast.map(actor=>actor.uuid);
    model.update({...props,step:3,layer:'life',progress:.6});
    const directions=audience.children.map(actor=>actor.quaternion.clone()),learnerPosition=cast[3].position.clone();
    expect(audienceIds.length).toBeGreaterThan(0);expect(shown(model.group.getObjectByName('opera-open-floor')!)).toBe(true);
    expect(shown(model.group.getObjectByName('opera-stage-platform')!)).toBe(false);
    model.update({...props,step:3,layer:'opera-stage',progress:.6});
    expect(audience.children.map(actor=>actor.uuid)).toEqual(audienceIds);expect(cast.map(actor=>actor.uuid)).toEqual(castIds);
    expect(audience.children.some((actor,i)=>actor.quaternion.angleTo(directions[i])>.5)).toBe(true);
    expect(cast[3].position).toEqual(learnerPosition);expect(opera.userData.operaState.progress).toBe(.6);
    expect(shown(model.group.getObjectByName('opera-open-floor')!)).toBe(false);expect(shown(model.group.getObjectByName('opera-stage-platform')!)).toBe(true);
    for(const actor of audience.children){
      const facing=new THREE.Vector3(0,0,1).applyQuaternion(actor.quaternion);
      const toward=new THREE.Vector3(-.8,actor.position.y,-.65).sub(actor.position).normalize();
      expect(facing.dot(toward)).toBeGreaterThan(.99);
    }
    model.dispose();
  });

  it.each(['life','opera-stage'])('在 %s 布局先走近观看，再进入同一练习区，标注随实际学习者移动',layer=>{
    const {model,props}=fixture(),learner=model.group.getObjectByName('opera-learner')!,practice=model.group.getObjectByName('opera-practice-area')!,learning=model.group.getObjectByName('opera-learning')!;
    const centre=practice.position.clone();centre.y=learner.position.y;
    model.update({...props,step:3,layer,progress:.18});const initial=learner.position.clone();expect(shown(practice)).toBe(false);
    model.update({...props,step:3,layer,progress:.6});const watching=learner.position.clone();expect(shown(practice)).toBe(true);
    expect(watching.distanceTo(centre)).toBeLessThan(initial.distanceTo(centre));expect(watching.distanceTo(centre)).toBeGreaterThan(.9);
    model.update({...props,step:3,layer,progress:1});expect(learner.position.distanceTo(centre)).toBeLessThan(.9);
    expect(learner.position.distanceTo(watching)).toBeGreaterThan(.5);expect(learning.userData.guideAnchor.x).toBe(learner.position.x);expect(learning.userData.guideAnchor.z).toBe(learner.position.z);
    expect(shown(model.group.getObjectByName('opera-performer-mentor')!)).toBe(true);
    model.dispose();
  });

  it('示范者离开正面舞台时由平台和侧阶承托，脚不会穿入实体',()=>{
    const {model,props}=fixture(),mentor=model.group.getObjectByName('opera-performer-mentor')!;
    model.update({...props,step:3,layer:'opera-stage',progress:0});
    const supports=['opera-stage-platform','opera-stage-side-step-upper','opera-stage-side-step-lower'].map(name=>new THREE.Box3().setFromObject(model.group.getObjectByName(name)!));
    const visited=new Set<number>();
    for(let index=0;index<=120;index++){
      model.update({...props,step:3,layer:'opera-stage',progress:index/200});
      const {x,y,z}=mentor.position;
      const containing=supports.map((bounds,i)=>({bounds,i})).filter(({bounds})=>x>=bounds.min.x&&x<=bounds.max.x&&z>=bounds.min.z&&z<=bounds.max.z);
      for(const {bounds,i} of containing){visited.add(i);expect(y+1e-6).toBeGreaterThanOrEqual(bounds.max.y);}
      expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThanOrEqual(supports[0].max.y+1e-6);
    }
    expect(visited.size).toBe(supports.length);expect(mentor.position.x).toBeGreaterThan(supports[2].max.x);model.dispose();
  });

  it('K4 只显示表演与学习空间，原院落、书页和修板过程均不混入',()=>{
    const {model,props}=fixture();
    for(const layer of ['life','opera-stage'])for(const progress of [0,.52,1]){
      model.update({...props,step:3,layer,progress});expect(shown(model.group.getObjectByName('opera-practice-model')!)).toBe(true);
      for(const name of ['culture-foundation','culture-walls','culture-hall','culture-timber','culture-roofs','culture-neighbouring-context','culture-workspace','culture-assembly','culture-daily-use','culture-maintenance-work']){
        const object=model.group.getObjectByName(name);expect(object?shown(object):false,name).toBe(false);
      }
    }
    const settings={...defaultSettings('opera-stage','opera-learning'),progress:.8},unit=culturalUnderstanding('K4',settings)!;
    expect(unit.objects.map(object=>object.id)).toEqual(['opera-space','opera-performance','opera-learning']);
    expect(unit.provenance).toContain('UNESCO');expect(unit.provenance).toContain('人数不代表实际规模');expect(unit.explanation).toContain('正面舞台');
    expect(culturalUnderstanding('K4',settings,'opera-learning')?.title).toBe(unit.objects[2].name);
    expect(culturalUnderstanding('K4',settings,'opera-learning')?.explanation).toContain('不等于真实教学记录');
    expect(culturalUnderstanding('K4',settings,'courtyard')?.title).toBe(unit.title);model.dispose();
  });

  it('正面舞台回退、暂停与布局往返完全恢复同一角色状态',()=>{
    const {model,props}=fixture();model.update({...props,step:3,layer:'opera-stage',progress:.46},0,0);const reference=snapshot(model.group);
    model.update({...props,step:3,layer:'opera-stage',progress:1},9999,20);
    model.update({...props,step:3,layer:'life',progress:.46},20000,20);
    model.update({...props,step:3,layer:'opera-stage',progress:.46},30000,20);expect(snapshot(model.group)).toEqual(reference);
    model.update({...props,step:3,layer:'opera-stage',progress:.46,playing:true},40000,20);expect(snapshot(model.group)).toEqual(reference);model.dispose();
  });

  it.each([0,1,2,3])('阶段 %s 暂停不漂移，倒退后完全恢复原状态',step=>{
    const {model,props}=fixture();model.update({...props,step,progress:.52},0,0);const reference=snapshot(model.group);
    model.update({...props,step,progress:.52,playing:true},9999,20);expect(snapshot(model.group)).toEqual(reference);
    model.update({...props,step,progress:1},20000,20);model.update({...props,step,progress:.52},30000,20);expect(snapshot(model.group)).toEqual(reference);model.dispose();
  });

  it.each([[1280,720],[690,620],[390,540]])('在 %s × %s 中标注保持有限且避开底部操作区', (width,height)=>{
    const {model,props,camera}=fixture(width,height);let visible=0;
    for(let step=0;step<4;step++)for(const progress of [.18,.52,1]){
      model.update({...props,step,progress});model.group.traverse(object=>{
        expect([...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        if(object instanceof THREE.Sprite&&object.userData.screenAnnotation&&shown(object)){
          visible++;const point=object.position.clone().project(camera),y=(1-point.y)*height/2;
          expect(y).toBeLessThanOrEqual(Math.max(Math.min(110,height*.21)+25,height-290)+.001);
          expect(Math.abs(point.x)).toBeLessThanOrEqual(1);
        }
      });
    }
    expect(visible).toBeGreaterThan(0);model.dispose();
  });

  it('模型来源文字位于底部操作区之上，并给阶段标签留出独立空间',()=>{
    const {model,props,camera}=fixture(690,620),note=model.group.getObjectByName('culture-source-note')!;
    model.update({...props,step:1,progress:.52});
    const notePoint=note.position.clone().project(camera),noteY=(1-notePoint.y)*620/2;
    expect(noteY).toBeCloseTo(620-285);
    model.group.traverse(object=>{if(object instanceof THREE.Sprite&&object.userData.screenAnnotation&&shown(object)){
      const point=object.position.clone().project(camera),y=(1-point.y)*620/2;
      expect(Math.abs(y-noteY)).toBeGreaterThanOrEqual(32);
    }});model.dispose();
  });

  it('文字解释随阶段变化，保留概念范围与对象选择，不提供虚构原作信息',()=>{
    const settings=defaultSettings('religion','culture-learning');
    expect(culturalProcessState(2,Infinity).progress).toBe(0);expect(culturalProcessState(99,.9).step).toBe(3);expect(culturalUnderstanding('H3',settings)).toBeUndefined();
    for(const [i,id] of ['K1','K2','K3','K4'].entries()){
      const first=culturalUnderstanding(id,{...settings,progress:.18})!,last=culturalUnderstanding(id,{...settings,progress:1})!;
      expect(first.hasProgress).toBe(true);expect(first.title).not.toBe(last.title);expect(first.explanation).not.toBe(last.explanation);expect(first.allowsCutaway).toBe(i<2);
      expect(first.provenance).toContain('无寺院');expect(first.stops).toHaveLength(3);
    }
    expect(culturalUnderstanding('K2',settings,'culture-learning')?.title).toBe('译写与地方学习');
  });

  it('更换题目或销毁后一次释放共享材质与纹理，不留下独立动画',()=>{
    const {model,props}=fixture();model.update({...props,step:2,progress:.52});
    const resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
    model.group.traverse(object=>{
      const mesh=object as THREE.Mesh;if(mesh.geometry)resources.add(mesh.geometry);
      if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        resources.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)resources.add(value);
      }
    });
    let releases=0;for(const resource of resources)resource.addEventListener('dispose',()=>releases++);
    model.dispose();model.dispose();expect(releases).toBe(resources.size);expect(model.group.children).toHaveLength(0);
    model.update({...props,step:3,progress:1},9999,20);expect(model.group.children).toHaveLength(0);
  });
});
