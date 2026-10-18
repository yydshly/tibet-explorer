import * as THREE from 'three';

export interface RegionalNetworkSourceFeature {
  featureId:unknown;
  collectionId:unknown;
  featureClass:unknown;
  restricted:unknown;
  /** Buffer vertices, not scalar offsets in the position array. */
  vertexStart:number;
  vertexCount:number;
  segmentStart:number;
  segmentCount:number;
  sourceVertexCount:number;
}

type NetworkLine=THREE.Line<THREE.BufferGeometry,THREE.LineBasicMaterial>;
type Bucket={parent:THREE.Object3D;lines:NetworkLine[]};
type Candidate={line:NetworkLine;key:string};

function candidate(object:THREE.Object3D):Candidate|undefined {
  if(!(object instanceof THREE.Line)||object instanceof THREE.LineSegments||object instanceof THREE.LineLoop||
     object.userData.kind!=='acquired-network-line'||Array.isArray(object.material)||
     !(object.material instanceof THREE.LineBasicMaterial))return;
  const line=object as NetworkLine,{geometry,material}=line;
  if(!geometry.attributes.position||geometry.attributes.position.itemSize!==3||
     geometry.groups.length||Object.keys(geometry.morphAttributes).length||
     geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||
     material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||
     material.customProgramCacheKey!==THREE.Material.prototype.customProgramCacheKey||
     object.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||
     object.onAfterRender!==THREE.Object3D.prototype.onAfterRender)return;
  // toJSON includes line colour/width/caps, opacity, blending, depth/fog flags,
  // dash/gap/scale and texture identities. Plane state is deliberately added:
  // it is runtime material state and is not exported by Material.toJSON.
  const serialized=material.toJSON() as unknown as Record<string,unknown>;
  delete serialized.uuid;delete serialized.metadata;
  const schema=Object.keys(geometry.attributes).sort().map(name=>[name,geometry.attributes[name].itemSize]);
  const key=JSON.stringify({material:serialized,clippingPlanes:material.clippingPlanes,
    clipIntersection:material.clipIntersection,clipShadows:material.clipShadows,
    shadowSide:material.shadowSide,forceSinglePass:material.forceSinglePass,
    schema,restricted:object.userData.restricted,
    visible:object.visible,renderOrder:object.renderOrder,layers:object.layers.mask,
    frustumCulled:object.frustumCulled,castShadow:object.castShadow,receiveShadow:object.receiveShadow});
  return {line,key};
}

/** Merge only static acquired network lines, within each original parent.
 * Every adjacent source pair becomes its own segment: no bridge is generated
 * between ways. Current footprint meshes, highlighted areas and dynamic route
 * lines have different kinds and remain untouched. Call after source build.
 */
export function batchRegionalNetwork(group:THREE.Group){
  const parents=new Map<THREE.Object3D,Map<string,Bucket>>();
  group.traverse(object=>{const item=candidate(object);if(!item||!object.parent)return;
    let buckets=parents.get(object.parent);if(!buckets){buckets=new Map();parents.set(object.parent,buckets);}
    let bucket=buckets.get(item.key);if(!bucket){bucket={parent:object.parent,lines:[]};buckets.set(item.key,bucket);}bucket.lines.push(item.line);
  });
  let ownershipRoot:THREE.Object3D=group;while(ownershipRoot.parent)ownershipRoot=ownershipRoot.parent;
  ownershipRoot.updateMatrixWorld(true);
  const obsoleteGeometries=new Set<THREE.BufferGeometry>(),obsoleteMaterials=new Set<THREE.Material>();
  const scratch=new THREE.Vector3();let batches=0,sourceLines=0,segments=0;
  for(const buckets of parents.values())for(const {parent,lines} of buckets.values()){
    if(lines.length<2)continue;
    const first=lines[0],attributes=Object.keys(first.geometry.attributes).sort();
    const values=new Map(attributes.map(name=>[name,[] as number[]])),sources:RegionalNetworkSourceFeature[]=[];
    const inverseParent=new THREE.Matrix4().copy(parent.matrixWorld).invert();
    let vertexOffset=0;
    for(const source of lines){
      const {geometry}=source,position=geometry.attributes.position,count=geometry.index?.count??position.count;
      const transform=new THREE.Matrix4().multiplyMatrices(inverseParent,source.matrixWorld),start=vertexOffset;
      const indexAt=(ordinal:number)=>geometry.index?geometry.index.getX(ordinal):ordinal;
      for(let i=1;i<count;i++)for(const ordinal of [i-1,i]){
        const index=indexAt(ordinal);
        for(const name of attributes){const attribute=geometry.attributes[name],output=values.get(name)!;
          if(name==='position'){scratch.fromBufferAttribute(position,index).applyMatrix4(transform);output.push(scratch.x,scratch.y,scratch.z);}
          else for(let component=0;component<attribute.itemSize;component++)output.push(attribute.getComponent(index,component));
        }
        vertexOffset++;
      }
      sources.push({featureId:source.userData.featureId,collectionId:source.userData.collectionId,
        featureClass:source.userData.featureClass,restricted:source.userData.restricted,
        vertexStart:start,vertexCount:vertexOffset-start,segmentStart:start/2,
        segmentCount:Math.max(0,count-1),sourceVertexCount:count});
      obsoleteGeometries.add(geometry);obsoleteMaterials.add(source.material);parent.remove(source);
    }
    const geometry=new THREE.BufferGeometry();
    for(const name of attributes)geometry.setAttribute(name,new THREE.Float32BufferAttribute(values.get(name)!,first.geometry.attributes[name].itemSize));
    geometry.computeBoundingSphere();
    // Retain the first material itself; no shared textures are cloned/disposed.
    const batch=new THREE.LineSegments(geometry,first.material);batch.name='regional-acquired-network-batch';
    batch.visible=first.visible;batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
    batch.frustumCulled=first.frustumCulled;batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
    batch.userData={kind:'acquired-network-batch',restricted:first.userData.restricted,
      scope:'Independent adjacent source-node pairs; no segment joins distinct source ways',sourceFeatures:sources};
    parent.add(batch);batches++;sourceLines+=lines.length;segments+=vertexOffset/2;
  }
  // Shared resources still used anywhere in the attached object tree survive.
  // Dispose orphaned source geometry/material only; textures may be shared by
  // equivalent materials, so their lifetime stays with the renderer's owner.
  ownershipRoot.traverse(object=>{
    const renderable=object as THREE.Mesh;
    if(renderable.geometry)obsoleteGeometries.delete(renderable.geometry);
    if(renderable.material)for(const material of Array.isArray(renderable.material)?renderable.material:[renderable.material])obsoleteMaterials.delete(material);
  });
  obsoleteGeometries.forEach(geometry=>geometry.dispose());obsoleteMaterials.forEach(material=>material.dispose());
  return {batches,sourceLines,segments};
}
