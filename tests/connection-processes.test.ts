import * as THREE from 'three';
import {describe,expect,it,vi} from 'vitest';
import {buildConnectionProcessesScene,connectionBasinHeight,connectionPassHeight} from '../src/scene/connectionProcesses';
import {connectionCameraViews,connectionProcessState,connectionUnderstanding} from '../src/data/connectionUnderstanding';
import {defaultSettings} from '../src/lib/store';
import type {TibetSceneProps} from '../src/scene/TibetScene';

vi.mock('../src/scene/environment',async importOriginal=>{
  const original=await importOriginal<typeof import('../src/scene/environment')>();
  return {...original,label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),mineralTexture:()=>new THREE.Texture()};
});

function fixture(width=1280,height=800,step=0){
  const view=connectionCameraViews[(['R1','R2','R3'] as const)[step]],camera=new THREE.PerspectiveCamera(43,width/height,.1,180);
  camera.position.set(...view.position);camera.lookAt(...view.target);camera.updateMatrixWorld();
  const model=buildConnectionProcessesScene({camera,renderer:{getSize:(value:THREE.Vector2)=>value.set(width,height)}});
  const props:TibetSceneProps={scene:'connections',step,viewKey:`R${step+1}`,season:1,layer:step===1?'routes':'water',progress:0,playing:false,selected:'',cutaway:false,resetKey:0,onSelect:()=>{},onInteract:()=>{}};
  return {model,props,camera};
}
function shown(object:THREE.Object3D){for(let current:THREE.Object3D|null=object;current;current=current.parent)if(!current.visible)return false;return true;}
function snapshot(group:THREE.Group){const result:unknown[]=[];group.traverse(object=>{result.push([object.name,object.visible,...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()]);const mesh=object as THREE.Mesh;if(mesh.geometry){result.push([mesh.geometry.drawRange.start,mesh.geometry.drawRange.count]);if(object instanceof THREE.Line)result.push(Array.from(mesh.geometry.attributes.position.array));}});return result;}

describe('跨地区联系由地形、物质与参与者的实体过程解释',()=>{
  it('每条坡面、支流和干流水路严格向低处下降，并贴合同一连续地表',()=>{
    const {model,props}=fixture();model.update({...props,progress:1});let count=0;
    model.group.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!object.name.startsWith('water-0-'))return;count++;
      const positions=object.geometry.attributes.position;let previous=Infinity;
      for(let i=0;i<positions.count;i+=2){
        const x=(positions.getX(i)+positions.getX(i+1))/2,y=(positions.getY(i)+positions.getY(i+1))/2,z=(positions.getZ(i)+positions.getZ(i+1))/2;
        expect(y).toBeLessThan(previous);previous=y;
        expect(y-connectionBasinHeight(x,z)).toBeCloseTo(object.name.endsWith('runoff')?.085:.08,4);
      }
    });expect(count).toBe(7);model.dispose();
  });

  it('先有降水，再展开坡面支流和下游，最后由人搬水到生活处',()=>{
    const {model,props}=fixture(),rain=model.group.getObjectByName('connection-rainfall')!,lower=model.group.getObjectByName('water-0-lower')!,use=model.group.getObjectByName('connection-basin-use')!,actor=model.group.getObjectByName('connection-water-user-0')!;
    model.update({...props,progress:.12});expect(shown(rain)).toBe(true);expect(shown(lower)).toBe(false);expect(shown(use)).toBe(false);
    model.update({...props,progress:.52});expect(shown(model.group.getObjectByName('water-0-runoff')!)).toBe(true);expect(shown(lower)).toBe(false);
    model.update({...props,progress:.72});expect(shown(lower)).toBe(true);expect(shown(model.group.getObjectByName('confluence-0')!)).toBe(true);expect(shown(use)).toBe(false);
    model.update({...props,progress:.84});const source=actor.position.clone();expect(shown(use)).toBe(true);
    model.update({...props,progress:1});expect(actor.position.x).toBeGreaterThan(source.x+3);expect(actor.position.y).toBeCloseTo(connectionBasinHeight(actor.position.x,actor.position.z)+.08);model.dispose();
  });

  it('同一山脊的有限低口约束移动，载体先到坡脚再通过，不穿过山体',()=>{
    const {model,props}=fixture(1280,800,1),carrier=model.group.getObjectByName('connection-transport-carrier')!;
    expect(connectionPassHeight(0,4)).toBeGreaterThan(connectionPassHeight(0,0)+2.5);
    model.update({...props,progress:0});expect(carrier.position.x).toBe(-10);
    model.update({...props,progress:.32});expect(carrier.position.x).toBeCloseTo(-4);expect(carrier.position.z).toBeCloseTo(.8);
    model.update({...props,progress:.5});expect(carrier.position.x).toBeCloseTo(0);expect(carrier.position.z).toBeCloseTo(0);
    expect(carrier.position.y).toBeCloseTo(connectionPassHeight(0,0)+.08);
    model.update({...props,progress:.68});expect(carrier.position.x).toBeCloseTo(4.6);expect(carrier.position.z).toBeCloseTo(1.15);model.dispose();
  });

  it('抵达另一侧后箱体离开车辆，经过有人搬运和交接桌，交到接收者',()=>{
    const {model,props}=fixture(1280,800,1),carrier=model.group.getObjectByName('connection-transport-carrier')!,cargo=model.group.getObjectByName('connection-transferred-cargo')!,porter=model.group.getObjectByName('connection-node-porter')!,receiver=model.group.getObjectByName('connection-receiving-user')!,organization=model.group.getObjectByName('connection-node-organization')!;
    model.update({...props,progress:.62});expect(shown(porter)).toBe(false);expect(shown(organization)).toBe(false);
    model.update({...props,progress:.76});expect(shown(porter)).toBe(true);expect(shown(organization)).toBe(true);expect(cargo.position.x).toBeGreaterThan(carrier.position.x);
    model.update({...props,progress:.9});expect(cargo.position.x).toBe(6);expect(cargo.position.z).toBe(1.5);const table=cargo.position.clone();
    model.update({...props,progress:1});expect(cargo.position.x).toBeCloseTo(receiver.position.x-.25);expect(cargo.position.z).toBeCloseTo(receiver.position.z);expect(cargo.position.distanceTo(table)).toBeGreaterThan(.5);expect(carrier.position.x).toBeCloseTo(4.6);model.dispose();
  });

  it('扩大参与者与议题范围时保留相同水面，不伪造损失、改善或总分',()=>{
    const {model,props}=fixture(1280,800,2),upstream=model.group.getObjectByName('connection-upstream-perspective')!,ecology=model.group.getObjectByName('connection-riverbank-ecology')!,downstream=model.group.getObjectByName('connection-downstream-perspective')!,observation=model.group.getObjectByName('connection-shared-observation')!,records=model.group.getObjectByName('connection-record-comparison')!,river=model.group.getObjectByName('water-2-lower') as THREE.Mesh;
    model.update({...props,progress:.18});const surface=Array.from(river.geometry.attributes.position.array);expect(shown(upstream)).toBe(true);expect(shown(ecology)).toBe(false);expect(shown(downstream)).toBe(false);expect(shown(observation)).toBe(false);
    model.update({...props,progress:.52});expect(shown(upstream)).toBe(true);expect(shown(ecology)).toBe(true);expect(shown(downstream)).toBe(true);expect(shown(records)).toBe(false);
    model.update({...props,progress:1});expect(shown(observation)).toBe(true);expect(shown(records)).toBe(true);expect(ecology.scale.toArray()).toEqual([1,1,1]);expect(downstream.scale.toArray()).toEqual([1,1,1]);expect(Array.from(river.geometry.attributes.position.array)).toEqual(surface);model.dispose();
  });

  it('同一批真实坡料沿完整地形下降，不穿山、不在河道额外生成物料',()=>{
    const {model,props}=fixture(1280,800,2),chunks:THREE.Mesh[]=[];
    model.group.traverse(object=>{if(object instanceof THREE.Mesh&&object.userData.authorDefinedFragment)chunks.push(object);});
    const moving=model.group.getObjectByName('connection-moving-material')!,deposit=model.group.getObjectByName('connection-channel-constriction')!;
    expect(chunks).toHaveLength(14);model.update({...props,progress:0});expect(moving.children).toHaveLength(14);expect(shown(deposit)).toBe(false);
    const previous=chunks.map(chunk=>chunk.position.clone());
    for(let n=1;n<=145;n++){
      const progress=.319+n/145*.362;model.update({...props,progress});
      expect(moving.children.length+deposit.children.length).toBe(chunks.length);
      chunks.forEach((chunk,index)=>{
        const prior=previous[index],changed=chunk.position.x-prior.x>1e-9;
        expect(chunk.position.x).toBeGreaterThanOrEqual(prior.x-1e-10);
        if(changed)expect(chunk.position.y,`fragment ${index} must descend @ ${progress}`).toBeLessThan(prior.y);
        // Inspect actual transformed mesh vertices, rather than a parallel path array.
        const vertices=chunk.geometry.attributes.position;
        for(let vertex=0;vertex<vertices.count;vertex++){
          const world=new THREE.Vector3().fromBufferAttribute(vertices,vertex).applyMatrix4(chunk.matrixWorld);
          expect(world.y-connectionBasinHeight(world.x,world.z),`fragment ${index} entered terrain @ ${progress}`).toBeGreaterThanOrEqual(-.00001);
        }
        previous[index].copy(chunk.position);
      });
    }
    expect(moving.children).toHaveLength(0);expect(deposit.children).toHaveLength(14);expect(new Set(deposit.children)).toEqual(new Set(chunks));model.dispose();
  });

  it('料块实际接到河槽并留下窄口，但不改变水位几何或预测阻塞结果',()=>{
    const {model,props}=fixture(1280,800,2),deposit=model.group.getObjectByName('connection-channel-constriction')!,water=model.group.getObjectByName('water-2-lower') as THREE.Mesh;
    model.update({...props,progress:.18});const baseline=Array.from(water.geometry.attributes.position.array);
    model.update({...props,progress:.52});expect(shown(deposit)).toBe(false);
    model.update({...props,progress:.65});expect(shown(deposit)).toBe(true);expect(deposit.children.length).toBeGreaterThan(0);expect(deposit.children.length).toBeLessThan(14);
    model.update({...props,progress:.68});expect(deposit.children).toHaveLength(14);
    const bounds=new THREE.Box3().setFromObject(deposit);
    // At this authored reach the river spans roughly x=-.43..+.11. The deposits
    // enter that bed from the west while leaving a visible opening on the east.
    expect(bounds.max.x).toBeGreaterThan(-.43);expect(bounds.max.x).toBeLessThan(.11);
    expect(bounds.min.z).toBeLessThan(3);expect(bounds.max.z).toBeGreaterThan(3.8);
    model.update({...props,progress:1});expect(Array.from(water.geometry.attributes.position.array)).toEqual(baseline);
    expect(shown(model.group.getObjectByName('connection-slope-reference')!)).toBe(true);
    const settings={...defaultSettings('water','connection-obstruction'),progress:1};
    const feedback=connectionUnderstanding('R3',settings,'connection-obstruction')!;
    expect(feedback.explanation).toContain('现实是否堵江');expect(feedback.explanation).toContain('没有计算');expect(feedback.provenance).toContain('非色东普复原');
    expect(connectionUnderstanding('R3',{...settings,selected:'connection-slope'},'connection-slope')?.explanation).toContain('并非所有崩塌');model.dispose();
  });

  it('已到河的同一批物料回退后逐个返回坡面，任意暂停均不漂移',()=>{
    const {model,props}=fixture(1280,800,2);
    for(const progress of [0,.52,.65,.675,1]){
      model.update({...props,progress});const expected=snapshot(model.group);
      model.update({...props,progress,playing:true},99999,10);expect(snapshot(model.group)).toEqual(expected);
      model.update({...props,progress:1});model.update({...props,progress:0});model.update({...props,progress});expect(snapshot(model.group)).toEqual(expected);
    }
    model.dispose();
  });

  it('观测容器与空白记录板真的移动、展开，并把信息带到双方材料旁',()=>{
    const {model,props}=fixture(1280,800,2),bottles:THREE.Object3D[]=[],tokens:THREE.Object3D[]=[];model.group.traverse(object=>{if(object.name==='connection-sampling-container')bottles.push(object);if(object.name==='connection-information-token')tokens.push(object);});
    const board=model.group.getObjectByName('connection-blank-record-0')!;
    model.update({...props,progress:.7});const before=bottles[0].position.y,opened=board.rotation.z;
    model.update({...props,progress:1});expect(bottles[0].position.y).toBeGreaterThan(before);expect(Math.abs(board.rotation.z)).toBeLessThan(Math.abs(opened));expect(board.rotation.z).toBe(0);
    for(let i=0;i<2;i++){const destination=model.group.getObjectByName(`connection-blank-record-${i}`)!.position.clone();expect(tokens[i].position.x).toBeCloseTo(destination.x);expect(tokens[i].position.z).toBeCloseTo(destination.z);}model.dispose();
  });

  it.each([0,1,2])('第 %s 个过程暂停不漂移，倒退后恢复全部实体和标注',step=>{
    const {model,props}=fixture(1280,800,step);model.update({...props,progress:.52});const initial=snapshot(model.group);
    model.update({...props,progress:.52,playing:true},10000,10);expect(snapshot(model.group)).toEqual(initial);
    model.update({...props,progress:1},20000,10);model.update({...props,progress:.52},30000,10);expect(snapshot(model.group)).toEqual(initial);model.dispose();
  });

  it.each([[1280,800],[690,620],[390,540]])('在 %s × %s 保留完整场景且文字避开操作区', (width,height)=>{
    const {model,props,camera}=fixture(width,height);let labels=0;
    for(let step=0;step<3;step++)for(const progress of [.18,.52,1]){
      model.update({...props,step,progress});model.group.traverse(object=>{
        expect([...object.position.toArray(),...object.scale.toArray(),...object.quaternion.toArray()].every(Number.isFinite)).toBe(true);
        if(object instanceof THREE.Sprite&&object.userData.screenAnnotation&&shown(object)){labels++;const projected=object.position.clone().project(camera),y=(1-projected.y)*height/2;expect(y).toBeGreaterThanOrEqual(112-.001);expect(y).toBeLessThanOrEqual(Math.max(137,height-295)+.001);expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);}
      });
    }expect(labels).toBeGreaterThan(0);model.dispose();
  });

  it('图层和对象反馈保留阶段原因，所有空间都明确为概念模型',()=>{
    const settings=defaultSettings('water','connection-observation');expect(connectionUnderstanding('M1',settings)).toBeUndefined();expect(connectionProcessState(NaN,Infinity).progress).toBe(0);
    for(const id of ['R1','R2','R3']){
      const first=connectionUnderstanding(id,{...settings,progress:.18})!,last=connectionUnderstanding(id,{...settings,progress:1})!;expect(first.title).not.toBe(last.title);expect(first.explanation).not.toBe(last.explanation);expect(last.hasProgress).toBe(true);expect(last.allowsCutaway).toBe(false);expect(last.provenance).toContain('无流量');
    }
    expect(connectionUnderstanding('R3',settings,'connection-observation')?.title).toBe('不同位置的观测与采样');
    const {model,props}=fixture(1280,800,2);model.update({...props,progress:1,selected:'connection-records'});expect(model.group.userData.focusId).toBe('connection-records');model.dispose();
  });

  it('切走场景时只释放一次共享资源，不留下后台动画',()=>{
    const {model,props}=fixture();model.update({...props,progress:1});const resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
    model.group.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)resources.add(mesh.geometry);if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){resources.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)resources.add(value);}});
    let count=0;for(const resource of resources)resource.addEventListener('dispose',()=>count++);model.dispose();model.dispose();expect(count).toBe(resources.size);model.update({...props,progress:.5},99999,10);expect(model.group.children).toHaveLength(0);
  });
});
