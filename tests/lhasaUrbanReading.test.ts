// @ts-expect-error Node is test-only.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node is test-only.
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {createLhasaUrbanReading} from '../src/scene/lhasaUrbanReading';
import {overviewBeats} from '../src/data/overviewJourney';
import {overviewPresentation} from '../src/lib/overviewScene';
import {narrationTimingAt,type NarrationTimeline} from '../src/lib/narrationTiming';
import {disposeTree} from '../src/scene/environment';
import {urbanComparison,urbanPixelCounts} from '../src/lib/overviewUrbanComparison';

describe('Lhasa spatial change from original dated pixels',()=>{
  it('preserves source bytes, metadata counts, reverse seeks and baseline-only comparison',()=>{
    const manifest=JSON.parse(readFileSync('public/data/lhasa-evolution/manifest.json','utf8')),window=manifest.window;
    const bytes=readFileSync(`public${window.dataUrl}`),before=Array.from(bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(window.sha256);
    const confidence=readFileSync(`public${window.confidenceUrl}`);
    expect(createHash('sha256').update(confidence).digest('hex')).toBe(window.confidenceSha256);
    expect(confidence.length).toBe(window.confidenceBytes);
    const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    const reading=createLhasaUrbanReading(window,buffer,p=>new THREE.Vector3(p[0],Math.sin(p[0])*10,p[1]));
    const geometry=reading.group.children.map(c=>(c as THREE.Mesh).geometry);
    const outline=reading.group.children.find(c=>c.userData.kind==='lhasa-observation-window') as THREE.Line;
    expect(outline.userData.bounds).toEqual(window.bounds);
    const points=outline.geometry.getAttribute('position');
    expect(points.count).toBeGreaterThan(100);
    expect(points.getX(0)).toBeCloseTo(window.bounds.west,4);
    expect(points.getZ(0)).toBeCloseTo(window.bounds.north,4);
    expect(points.getX(points.count-1)).toBe(points.getX(0));
    for(const year of [1985,2000,2015,1985,2015]){
      reading.update(year);expect(reading.group.userData.visiblePixels).toBe(window.cumulativePixelCounts[String(year)]);
      expect(reading.group.children.map(c=>(c as THREE.Mesh).geometry)).toEqual(geometry);
    }
    reading.update(2015,false);expect(reading.group.userData.visiblePixels).toBe(window.cumulativePixelCounts['1985']);
    reading.update(undefined);expect(reading.group.visible).toBe(false);
    expect(Array.from(bytes)).toEqual(before);disposeTree(reading.group);
  });

  it('keeps manual comparison in the same native-word phase and restores the narration without seeking',()=>{
    const beat=overviewBeats.find(b=>b.id==='OVERVIEW-lhasa-urban-change')!;
    const original=overviewPresentation(beat,.36);
    for(const year of [1985,2000,2015] as const){
      const view=urbanComparison(original,year);
      expect(view.props.overviewUrban).toMatchObject({phase:original.props.overviewUrban!.phase,progress:original.props.overviewUrban!.progress,year});
      expect(view.sceneIdentity).toBe(original.sceneIdentity);
      expect(view.props.progress).toBe(original.props.progress);
      expect(view.year).toContain(String(year));
      expect(urbanPixelCounts(year).total).toBe({1985:20277,2000:37403,2015:46420}[year]);
    }
    expect(urbanComparison(original)).toBe(original);
    const local=overviewPresentation(beat,.65);
    expect(urbanComparison(local,1985)).toBe(local);
  });

  it('binds dates and return to native words of this exact new recording',()=>{
    const beat=overviewBeats.find(b=>b.id==='OVERVIEW-lhasa-urban-change')!;
    const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
    const asset=manifest.clips.find((c:{cueId:string})=>c.cueId===beat.id);
    expect(asset.text).toBe(beat.text);expect(asset.timingLevel).toBe('word');
    const timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8')) as NarrationTimeline;
    for(const [token,phase,year] of [['先看一九八五年','baseline',1985],['推进到二〇〇〇年','middle',2000],['再到二〇一五年','recent',2015],['再回到现状街区','plaza',2005],['大昭寺周围的八廓街','barkhor',2005],['拉回河谷','return',2015]] as const){
      const offset=beat.text.indexOf(token),word=timeline.words!.find(w=>w.textEnd>offset)!,time=word.start+(word.end-word.start)*.8;
      const view=overviewPresentation(beat,time/timeline.duration,narrationTimingAt(beat.text,time,timeline.duration,timeline));
      expect(view.props.overviewUrban).toMatchObject({phase,year});expect(view.sceneIdentity).toBe('atlas-local-context');
    }
    expect(()=>overviewPresentation({...beat,text:beat.text+'改写'},.5)).toThrow('原文不一致');
    const returning=overviewBeats.find(b=>b.recordingId==='OVERVIEW-heritage-return')!;
    expect(overviewPresentation(returning,0).props.overviewUrban).toMatchObject({phase:'return',progress:1});
  });
});
