// @ts-expect-error Test-only filesystem access.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {barkhorStreetFeatures,createBarkhorSpatialReading} from '../src/scene/barkhorSpatialReading';
import {overviewBarkhorPresentation} from '../src/lib/overviewHeritageScene';
import {barkhorNarration} from '../src/data/overviewNarration';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import {localBuildingsWithinFeature} from '../src/scene/cityLocalMap';

const data=JSON.parse(readFileSync('public/data/local-places/lhasa.geojson','utf8'));
const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
const clip=manifest.clips.find((clip:{cueId:string})=>clip.cueId==='OVERVIEW-barkhor-life');
const timeline=JSON.parse(readFileSync(`public${clip.subtitleUrl}`,'utf8'));
const beat={id:clip.cueId,recordingId:clip.cueId,title:clip.title,text:barkhorNarration};
describe('Barkhor uses real city objects and the new recording clock',()=>{
  it('distinguishes listing from the later management request at actual spoken words',()=>{
    expect(clip.text).toBe(barkhorNarration);expect(timeline.timingLevel).toBe('word');
    for(const [token,phase] of [['沿现状','streets'],['再看广场','uses'],['二〇〇〇年','designation'],['二〇二一年','protection'],['接下来','return']]){
      const offset=barkhorNarration.indexOf(token);const word=timeline.words.find((word:{textEnd:number})=>word.textEnd>offset);
      const time=word.start+(word.end-word.start)*.75;
      const p=overviewBarkhorPresentation(beat,.01,narrationTimingAt(beat.text,time,timeline.duration,timeline));
      expect(p.props.overviewBarkhor?.phase).toBe(phase);
      expect(p).toEqual(overviewBarkhorPresentation(beat,.99,narrationTimingAt(beat.text,time,timeline.duration,timeline)));
      if(phase==='designation')expect(p.year).toBe('2000年列入');
    }
    expect(()=>overviewBarkhorPresentation({...beat,text:beat.text+'改写'},0)).toThrow();
  });
  it('retains each original footway, avoids invented joins and never changes source geometry',()=>{
    const before=JSON.stringify(data);const roads=barkhorStreetFeatures(data);expect(roads.length).toBeGreaterThan(8);
    for(const feature of roads){expect(data.features.includes(feature)).toBe(true);expect((feature.geometry.coordinates as unknown[]).length).toBeGreaterThan(1);}
    const reading=createBarkhorSpatialReading(data,([x,y],h=0)=>new THREE.Vector3(x,h,y),()=>new THREE.BoxGeometry(1,12,1),f=>localBuildingsWithinFeature(data,f),.00001);
    expect(reading.group.userData.streetIds).toEqual(roads.map(f=>f.id));expect(reading.group.userData.buildingIds.length).toBeGreaterThan(10);
    expect(reading.group.userData.buildingIds).not.toContain('relation/2358701');
    const markers=reading.group.children.find(object=>object instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    const state={phase:'streets' as const,progress:.3,motion:.3};reading.update(state,.00001);const first=Array.from(markers.instanceMatrix.array),firstSurface=reading.group.userData.visibleStreetVertices;
    reading.update({...state,progress:.8,motion:.8},.00001);expect(Array.from(markers.instanceMatrix.array)).not.toEqual(first);
    expect(reading.group.userData.visibleStreetVertices).toBeGreaterThan(firstSurface);
    reading.update(state,.00001);expect(Array.from(markers.instanceMatrix.array)).toEqual(first);
    expect(reading.group.userData.visibleStreetVertices).toBe(firstSurface);
    reading.update(undefined,.00001);expect(reading.group.visible).toBe(false);expect(JSON.stringify(data)).toBe(before);
  });
});
