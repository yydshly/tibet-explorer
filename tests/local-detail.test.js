import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildLocalLandscapeScene, localLandscapePosition, sampleLocalLandscape } from "../src/scene/localLandscape";
import { buildPalaceStudyScene } from "../src/scene/palaceStudy";
import { localLandscapeMeta as meta } from "../src/data/localLandscape";
import { palaceStudySources } from "../src/data/palaceStudy";
import { spatialPresentationFor } from "../src/data/spatialPresentation";
import { visualGuidePlans,visualGuideForCue } from "../src/data/visualGuidance";
import {narrationPhraseBindings} from '../src/lib/narrationPhraseGuide';
import {narrationTimingAt} from '../src/lib/narrationTiming';
import { getJourneyStep } from "../src/data/journey";
vi.mock("../src/scene/environment", async (original) => ({ ...await original(), label: () => new THREE.Sprite(new THREE.SpriteMaterial()), mineralTexture: () => new THREE.Texture() }));
const localBytes = readFileSync("public/assets/terrain/nyingchi-local-dem.int16");
const grid = new Int16Array(localBytes.buffer, localBytes.byteOffset, localBytes.byteLength / 2);
const runtime = () => {
  const camera = new THREE.PerspectiveCamera(43, 1.6, 0.1, 400);
  camera.position.set(20, 15, 27);
  camera.lookAt(0, 4, 0);
  camera.updateMatrixWorld();
  return { camera, renderer: { getSize: (v) => v.set(1280, 800) }, focus: vi.fn(), hasSavedView: () => false };
};
const props = (id) => ({ scene: id === "P1" ? "landscape" : "culture", viewKey: id, step: 0, season: 1, layer: id === "P1" ? "terrain" : "architecture", progress: 0.12, playing: false, selected: "", cutaway: false, resetKey: 0, onSelect: () => {
}, onInteract: () => {
} });
afterEach(() => vi.unstubAllGlobals());
const mockTerrain = () => vi.stubGlobal("fetch", vi.fn(async (url) => {
  const bytes = readFileSync(`public${url}`);
  return { ok: true, json: async () => JSON.parse(bytes.toString("utf8")), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
}));
describe("有出处的局部3D与整体来路", () => {
  it("局部发布数据与25张归档瓦片记录一致，方向和采样端点正确", () => {
    expect(createHash("sha256").update(localBytes).digest("hex")).toBe(meta.sha256);
    expect(meta.tiles).toHaveLength(25);
    expect(grid.length).toBe(meta.rows * meta.columns);
    expect(sampleLocalLandscape(grid, meta.boundsDegrees.west, meta.boundsDegrees.north)).toBe(grid[0]);
    expect(sampleLocalLandscape(grid, meta.boundsDegrees.east, meta.boundsDegrees.south)).toBe(grid.at(-1));
    expect(localLandscapePosition(95, 30).x).toBeGreaterThan(localLandscapePosition(94, 30).x);
    expect(localLandscapePosition(94, 30).z).toBeLessThan(localLandscapePosition(94, 29).z);
  });
  it("同一坐标系拼接整体与局部，移动切面重新取实际高低样本", async () => {
    mockTerrain();
    const rt = runtime(), model = buildLocalLandscapeScene(rt);
    await model.ready;
    const meshes = [];
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name.endsWith("grid")) meshes.push(o);
    });
    expect(meshes.map((m) => m.name).sort()).toEqual(["nyingchi-local-grid", "regional-context-grid"]);
    const local = meshes.find((m) => m.name === "nyingchi-local-grid"), a = local.geometry.attributes.position, p = localLandscapePosition(meta.boundsDegrees.west, meta.boundsDegrees.north, grid[0]);
    expect(a.getX(0)).toBeCloseTo(p.x, 5);
    expect(a.getY(0)).toBeCloseTo(p.y, 5);
    expect(a.getZ(0)).toBeCloseTo(p.z, 5);
    model.update({ ...props("P1"), progress: 0.8, cutaway: true });
    const before = { ...model.group.userData.profile };
    model.update({ ...props("P1"), progress: 1, cutaway: true });
    const after = model.group.userData.profile;
    expect(after.longitude).toBeGreaterThan(before.longitude);
    expect([after.minimum, after.maximum]).not.toEqual([before.minimum, before.maximum]);
    expect(after.maximum).toBeGreaterThan(after.minimum);
    expect(local.geometry.drawRange.count).toBeLessThan(local.geometry.index.count);
    model.update({ ...props("P1"), progress: 1, cutaway: false });
    expect(local.geometry.drawRange.count).toBe(local.geometry.index.count);
    const samples = Array.from({ length: meta.rows }, (_, row) => sampleLocalLandscape(grid, after.longitude, meta.boundsDegrees.north - row * (meta.boundsDegrees.north - meta.boundsDegrees.south) / (meta.rows - 1)));
    expect(after.minimum).toBe(Math.round(Math.min(...samples)));
    expect(after.maximum).toBe(Math.round(Math.max(...samples)));
    model.dispose();
  });
  it("全部林芝讲述阶段的指向落在已经就绪的可见实体上", async () => {
    mockTerrain();
    const model = buildLocalLandscapeScene(runtime());
    await model.ready;
    let state = props("P1");
    const manifest=JSON.parse(readFileSync('public/assets/audio/narration/cue-manifest.json','utf8'));
    for (const cue of getJourneyStep("P1").cues) {
      const asset=manifest.clips.find(clip=>clip.cueId===cue.id),timeline=JSON.parse(readFileSync(`public${asset.subtitleUrl}`,'utf8'));
      expect(asset.text).toBe(cue.narration);expect(timeline.timingLevel).toBe('word');
      const phrases=narrationPhraseBindings(cue.id,cue.narration),guideAt=at=>{
        const position=at*cue.narration.length,word=timeline.words.find(word=>word.textEnd>position)??timeline.words.at(-1),previous=timeline.words.filter(word=>word.textEnd<=position).at(-1),part=Math.max(0,Math.min(1,(position-word.textStart)/(word.textEnd-word.textStart)));
        const time=at>=1?timeline.duration:word.textStart>position&&previous?(word.start+previous.end)/2:word.start+(word.end-word.start)*part;
        return visualGuideForCue(cue.id,time/timeline.duration,true,narrationTimingAt(cue.narration,time,timeline.duration,timeline));
      },atState=at=>{
        let current={...state,...cue.settings,...(cue.motion?{progress:cue.motion.from}:{})};
        for(const [index,phrase]of phrases.entries()){
          if(phrase.at>at)break;
          const end=phrases[index+1]?.at??1,guide=guideAt(at<end?at:end-1e-10);
          if(guide.sceneProgress!==undefined)current.progress=guide.sceneProgress;
          if(guide.sceneSettings)current={...current,...guide.sceneSettings};
        }
        return {...current,guide:guideAt(at)};
      };
      for (const [index,beat] of visualGuidePlans[cue.id].entries()) {
        const end=visualGuidePlans[cue.id][index+1]?.at??1;
        for(const at of [beat.at+1e-9,(beat.at+end)/2,end-1e-9]){
          const current=atState(at);model.update(current);expect(current.guide.targets).toEqual(beat.targets);
          for (const target of beat.targets) {
            let found = false;
            model.group.traverse((o) => {
              if ((o.userData.selectId !== target&&o.userData.guideId!==target) || o.userData.screenAnnotation || o instanceof THREE.Sprite) return;
              let shown = true;
              for (let ancestor = o; ancestor; ancestor = ancestor.parent) shown &&= ancestor.visible;
              let physical=false;
              o.traverse(child=>{
                for(let ancestor=child;ancestor&&ancestor!==o;ancestor=ancestor.parent)if(!ancestor.visible||ancestor.userData.screenAnnotation||ancestor instanceof THREE.Sprite)return;
                if(!child.geometry?.attributes.position?.count||child.geometry.drawRange.count===0||child instanceof THREE.Sprite)return;
                const materials=Array.isArray(child.material)?child.material:[child.material];
                if(materials.some(material=>material?.visible&&(!material.transparent||material.opacity>.015)))physical=true;
              });
              found ||= shown&&physical;
            });
            expect(found, `${cue.id}: ${target}, model ${current.progress}`).toBe(true);
          }
        }
      }
      state=atState(1);
    }
    model.dispose();
  });
  it("读取失败向页面报告，退出时取消请求，不留下半个地形", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    const model = buildLocalLandscapeScene(runtime());
    await expect(model.ready).rejects.toThrow();
    expect(model.group.userData.dataError).toBe(true);
    model.dispose();
    expect(model.group.children).toHaveLength(0);
  });
  it("建筑体量确实表达红宫更高偏西，展开后部位移动且可以还原", () => {
    const model = buildPalaceStudyScene(runtime());
    model.update({ ...props("K1"), progress: 0.5 });
    const physical = (id) => model.group.children.find((o) => o.userData.selectId === id && !o.userData.screenAnnotation);
    const white = physical("palace-white"), red = physical("palace-red"), wbox = new THREE.Box3().setFromObject(white), rbox = new THREE.Box3().setFromObject(red);
    expect(rbox.getCenter(new THREE.Vector3()).x).toBeLessThan(wbox.getCenter(new THREE.Vector3()).x);
    expect(rbox.max.y).toBeGreaterThan(wbox.max.y);
    const start = red.position.clone();
    model.update({ ...props("K1"), progress: 0.5, cutaway: true });
    expect(red.position.y).toBeGreaterThan(start.y);
    model.update({ ...props("K1"), cutaway: false });
    expect(red.position.equals(start)).toBe(true);
    expect(model.group.userData.measuredReconstruction).toBe(false);
    model.dispose();
  });
  it("地图入口使用已有地理参照，人物与年代都可追溯遗产原始材料", () => {
    for (const id of ["P1", "K1", "H3", "R2", "M1", "T1"]) {
      const arrival = spatialPresentationFor(id);
      expect(arrival.point.coordinateSourceUrl).toMatch(/^https:/);
      expect(arrival.limit.length).toBeGreaterThan(10);
    }
    expect(palaceStudySources.map((s) => s.url)).toContain("https://whc.unesco.org/document/154063");
    expect(palaceStudySources.map((s) => s.url)).toContain("https://whc.unesco.org/en/list/707/");
  });
});
