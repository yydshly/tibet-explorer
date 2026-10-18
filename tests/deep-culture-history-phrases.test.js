import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { deepCultureHistoryPhrases } from "../src/data/deepCultureHistoryPhrases";
import { journeySteps } from "../src/data/journey";
import { narrationPhraseBindings, narrationPhraseGuide } from "../src/lib/narrationPhraseGuide";
import { narrationTimingAt, validateNarrationTimeline } from "../src/lib/narrationTiming";
import { buildHistoryInquiryScene } from "../src/scene/historyInquiry";
import { buildCourtyardScene } from "../src/scene/culture";
import { buildPalaceStudyScene } from "../src/scene/palaceStudy";
import { buildNarrationAnnotations } from "../src/scene/narrationAnnotations";
import { disposeTree } from "../src/scene/environment";
vi.mock("../src/scene/environment", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, label: (text) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
    sprite.userData.labelText = text;
    return sprite;
  }, mineralTexture: () => new THREE.Texture() };
});
const steps = ["K1", "K2", "K3", "K4", "H1", "H2", "H3", "H4"];
const cues = steps.flatMap((id) => journeySteps[id].cues);
const manifest = JSON.parse(readFileSync("public/assets/audio/narration/cue-manifest.json", "utf8"));
const props = { scene: "history", step: 0, season: 1, layer: "activity", progress: 0, selected: "prehistoric", cutaway: false, playing: false, resetKey: 0, onInteract: () => {
}, onSelect: () => {
} };
const sha = (text) => createHash("sha256").update(text).digest("hex");
function phrase(cueId, token, local = 0.5) {
  const cue = cues.find((cue2) => cue2.id === cueId), ranges = narrationPhraseBindings(cueId, cue.narration), range = ranges.find((range2) => range2.token === token);
  expect(range, `${cueId} ${token}`).toBeDefined();
  return narrationPhraseGuide(cueId, cue.narration, 0.013, { textProgress: (range.textStart + (range.textEnd - range.textStart) * local) / cue.narration.length, precision: "provider" });
}
function at(cueId, token, local = 0.5) {
  const cue = cues.find((cue2) => cue2.id === cueId), guide = phrase(cueId, token, local);
  return { ...props, ...cue.settings, ...guide.sceneSettings, progress: guide.sceneProgress ?? cue.settings.progress ?? 0, guide };
}
function fixture(width = 1280, height = 720) {
  const camera = new THREE.PerspectiveCamera(43, width / height, 0.1, 180);
  camera.position.set(16, 12, 20);
  camera.lookAt(0, 1.2, 0);
  camera.updateMatrixWorld();
  return { camera, renderer: { getSize: (v) => v.set(width, height) } };
}
function shown(object2) {
  for (let current = object2; current; current = current.parent) if (!current.visible) return false;
  return true;
}
function object(root, id) {
  let result;
  root.traverse((child) => {
    if (!result && !(child instanceof THREE.Sprite) && (child.userData.selectId === id || child.userData.guideId === id)) result = child;
  });
  return result;
}
function positions(root) {
  const values = [];
  root.traverse((item) => {
    if (shown(item)) values.push([item.name, ...item.position.toArray(), ...item.scale.toArray(), ...item.quaternion.toArray()]);
  });
  return values;
}
describe("recording-bound cultural and historical deep scenes", () => {
  it("covers all 32 unchanged real scripts with contiguous literal phrase ranges and concise labels", () => {
    expect(cues).toHaveLength(32);
    expect(Object.keys(deepCultureHistoryPhrases)).toHaveLength(32);
    for (const cue of cues) {
      const bindings = narrationPhraseBindings(cue.id, cue.narration);
      expect(bindings.length, cue.id).toBe(deepCultureHistoryPhrases[cue.id].length);
      expect(bindings[0].textStart, cue.id).toBe(0);
      expect(bindings.at(-1).textEnd).toBe(cue.narration.length);
      for (const [index, binding] of bindings.entries()) {
        expect(cue.narration.slice(binding.textStart).startsWith(binding.token), `${cue.id} ${binding.token}`).toBe(true);
        expect(binding.textEnd).toBeGreaterThan(binding.textStart);
        if (index) expect(binding.textStart).toBe(bindings[index - 1].textEnd);
        expect(binding.targets.length).toBeGreaterThan(0);
        expect(binding.targets.length).toBeLessThanOrEqual(2);
        expect(binding.title.length).toBeLessThan(34);
        if (binding.from !== void 0) {
          expect(binding.from).toBeGreaterThanOrEqual(0);
          expect(binding.to).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it("resolves phrase states through each exact MiniMax word sidecar, not an equal audio fraction", () => {
    for (const cue of cues) {
      const asset = manifest.clips.find((clip) => clip.cueId === cue.id);
      expect(asset.text).toBe(cue.narration);
      const raw = readFileSync(`public${asset.subtitleUrl}`, "utf8"), timeline = validateNarrationTimeline(JSON.parse(raw), asset, sha(cue.narration));
      expect(timeline, cue.id).toBeDefined();
      expect(timeline.timingLevel).toBe("word");
      expect(sha(raw)).toBe(asset.subtitleSha256);
      for (const binding of narrationPhraseBindings(cue.id, cue.narration)) {
        const word = timeline.words.find((word2) => word2.textStart >= binding.textStart && word2.textEnd <= binding.textEnd && /[\p{L}\p{N}]/u.test(word2.text));
        expect(word, `${cue.id} ${binding.token}`).toBeDefined();
        const timing = narrationTimingAt(cue.narration, word.start + (word.end - word.start) * 0.5, timeline.duration, timeline), guide = narrationPhraseGuide(cue.id, cue.narration, 0.013, timing);
        expect(guide.phraseId).toBe(binding.phraseId);
        expect(guide.title).toBe(binding.title);
        expect(guide.textProgress).toBe(timing.textProgress);
        expect(guide.progress).toBe(0.013);
      }
    }
  });
  it("keeps every narrated target attached to a visible model object rather than a caption-only identifier", () => {
    const runtime=fixture(),palace=buildPalaceStudyScene(runtime),culture=buildCourtyardScene(runtime),history=buildHistoryInquiryScene(runtime);
    for(const stepId of steps){
      const model=stepId==='K1'?palace:stepId.startsWith('K')?culture:history;
      const step=Number(stepId.slice(1))-1;
      for(const cue of journeySteps[stepId].cues){
        let settings={...props,...cue.settings,step,scene:stepId.startsWith('K')?'culture':'history'};
        for(const binding of deepCultureHistoryPhrases[cue.id]){
          const guide=phrase(cue.id,binding.token);
          settings={...settings,...guide.sceneSettings,progress:guide.sceneProgress??settings.progress,guide};
          model.update(settings);model.group.updateWorldMatrix(true,true);
          for(const id of guide.targets){let found=false;model.group.traverse(child=>{if(!(child instanceof THREE.Sprite)&&shown(child)&&(child.userData.selectId===id||child.userData.guideId===id))found=true;});expect(found,`${cue.id} ${binding.token}: ${id}`).toBe(true);}
        }
      }
    }
    palace.dispose();culture.dispose();disposeTree(history.group);
  });
  it("leaves every observe cue under manual layer, selection and progress control", () => {
    for (const cue of cues.filter((cue2) => cue2.id.endsWith("-observe"))) for (const binding of deepCultureHistoryPhrases[cue.id]) {
      expect(binding.settings).toBeUndefined();
      expect(binding.from).toBeUndefined();
      expect(binding.to).toBeUndefined();
      const guide = phrase(cue.id, binding.token);
      expect(guide.sceneSettings).toBeUndefined();
      expect(guide.sceneProgress).toBeUndefined();
    }
  });
  it("H1 opens context, transfers one sample, then distinguishes supported activity and open questions reversibly", () => {
    const model = buildHistoryInquiryScene(fixture()), sample = model.group.getObjectByName("history-context-sample"), tool = object(model.group, "history-tool");
    model.update(at("H1-explain", "\u6253\u5F00\u60C5\u5883", 0.15));
    const lowTool = tool.position.y;
    expect(shown(sample)).toBe(false);
    model.update(at("H1-explain", "\u518D\u628A\u5668\u7269\u4E0E\u7814\u7A76\u8BB0\u5F55\u5173\u8054", 0.15));
    const start = sample.position.clone();
    expect(shown(sample)).toBe(true);
    expect(tool.position.y).toBeGreaterThan(lowTool);
    const halfway = at("H1-explain", "\u518D\u628A\u5668\u7269\u4E0E\u7814\u7A76\u8BB0\u5F55\u5173\u8054", 0.6);
    model.update(halfway);
    const reference = positions(model.group);
    expect(sample.position.x).toBeGreaterThan(start.x);
    model.update(at("H1-explain", "\u5C3C\u963F\u5E95\u4E8C\u96F6\u4E00\u516B\u5E74\u7814\u7A76\u652F\u6301"));
    expect(shown(object(model.group, "history-inference"))).toBe(true);
    expect(object(model.group, "history-proof-0").position.y).toBe(0.45);
    model.update(at("H1-explain", "\u6D3B\u52A8\u4E0D\u81EA\u52A8\u7B49\u4E8E\u5168\u5E74\u5B9A\u5C45"));
    expect(object(model.group, "history-proof-1").position.y).toBe(0.45);
    expect(object(model.group, "history-proof-1").userData.supported).toBe(false);
    model.update(at("H1-explain", "\u5730\u57DF\u3001\u6837\u672C\u548C\u7ED3\u8BBA\u4E0D\u80FD\u6DF7\u5728\u4E00\u8D77"));
    expect(object(model.group, "history-proof-2").position.y).toBe(0.45);
    expect(object(model.group, "history-proof-2").userData.supported).toBe(false);
    model.update(halfway);
    expect(positions(model.group)).toEqual(reference);
    model.update({ ...halfway, playing: true });
    expect(positions(model.group)).toEqual(reference);
    disposeTree(model.group);
  });
  it("H2 separates actual material stacks and changes the correct period only at its sourced phrase", () => {
    const model = buildHistoryInquiryScene(fixture()), politics = object(model.group, "history-politics"), knowledge = object(model.group, "history-knowledge");
    const first = { ...at("H2-explain", "\u628A\u540C\u4E00\u65F6\u671F\u7684\u6750\u6599\u5C55\u5F00\u4E3A\u4E09\u6761\u7EBF\u7D22", 0.1), step: 1 }, later = { ...at("H2-explain", "\u628A\u540C\u4E00\u65F6\u671F\u7684\u6750\u6599\u5C55\u5F00\u4E3A\u4E09\u6761\u7EBF\u7D22", 0.9), step: 1 };
    model.update(first);
    const start = knowledge.children[3].position.clone();
    model.update(later);
    expect(knowledge.children[3].position.distanceTo(start)).toBeGreaterThan(0.1);
    model.update({ ...at("H2-explain", "\u4EBA\u7269\u548C\u6587\u672C\u7684\u4EA4\u6D41"), step: 1 });
    const focus = positions(knowledge);
    model.update({ ...at("H2-explain", "\u653F\u6CBB\u7EC4\u7EC7\u7684\u91CD\u7EC4"), step: 1 });
    expect(positions(knowledge)).not.toEqual(focus);
    expect(politics.children[1].position.y).toBeGreaterThan(0.4);
    model.update({ ...at("H2-explain", "\u6BD4\u5982\u4E00\u516D\u56DB\u4E8C\u5E74\u7684\u653F\u6CBB\u8282\u70B9"), step: 1 });
    expect(model.group.getObjectByName("period-leaf-ganden").position.y).toBeGreaterThan(0.5);
    model.update({ ...at("H2-explain", "\u4EBA\u7269\u548C\u6587\u672C\u7684\u4EA4\u6D41"), step: 1 });
    expect(positions(knowledge)).toEqual(focus);
    disposeTree(model.group);
  });
  it("H3 copies only after the stone phrase and reveals reading after copying, with distinct event anchors", () => {
    const model = buildHistoryInquiryScene(fixture()), copy = object(model.group, "history-rubbing"), reading = object(model.group, "history-reading");
    model.update({ ...at("H3-explain", "\u7891\u523B\u4EE5\u7269\u8D28\u5F62\u5F0F\u4FDD\u5B58"), step: 2 });
    expect(shown(copy)).toBe(false);
    expect(shown(reading)).toBe(false);
    const copying = { ...at("H3-explain", "\u540E\u6765\u53C8\u53EF\u4EE5\u4EA7\u751F\u62D3\u672C\u7B49\u590D\u5236\u6750\u6599"), step: 2 };
    model.update(copying);
    const pos = copy.position.clone();
    expect(shown(copy)).toBe(true);
    expect(shown(reading)).toBe(false);
    model.update({ ...at("H3-explain", "\u6A21\u578B\u628A\u8F7D\u4F53\u9010\u6B65\u5C55\u5F00"), step: 2 });
    expect(shown(reading)).toBe(true);
    expect(copy.position.x).toBeGreaterThan(pos.x);
    model.update(copying);
    expect(copy.position).toEqual(pos);
    expect(object(model.group, "history-event-821")).toBeDefined();
    expect(object(model.group, "history-event-822")).toBeDefined();
    disposeTree(model.group);
  });
  it("H4 changes dated file and institution geometry while household geometry remains invariant", () => {
    const model = buildHistoryInquiryScene(fixture()), houses = object(model.group, "history-household"), institutions = object(model.group, "history-institution");
    model.update({ ...at("H4-explain", "\u6A21\u578B\u628A\u5236\u5EA6\u3001\u5730\u65B9\u7EC4\u7EC7\u548C\u5BB6\u5EAD\u751F\u6D3B\u5206\u6210\u4E0D\u540C\u5C42\u6B21", 0.1), step: 3 });
    const homes = positions(houses), start = positions(institutions);
    model.update({ ...at("H4-explain", "\u600E\u6837\u5B9E\u65BD\u3001\u54EA\u4E9B\u5730\u65B9\u548C\u4EBA\u7FA4\u7ECF\u5386\u4E86\u4EC0\u4E48"), step: 3 });
    expect(positions(houses)).toEqual(homes);
    expect(positions(institutions)).not.toEqual(start);
    expect(shown(object(model.group.getObjectByName("history-inquiry-3"), "history-inference"))).toBe(true);
    for (const year of [1951, 1959, 1965]) {
      model.update({ ...props, step: 3, layer: `event-${year}`, progress: 1 });
      expect(positions(houses)).toEqual(homes);
      expect(model.group.getObjectByName(`historical-document-${year}`).children[1].position.y).toBeGreaterThan(0.5);
      expect(object(model.group, `history-document-${year}`)).toBeDefined();
    }
    disposeTree(model.group);
  });
  it("K2 follows the actual arriving carrier, comparison work and later carried use, including rewind", () => {
    const model = buildCourtyardScene(fixture()), incoming = model.group.getObjectByName("culture-incoming-carrier"), carrier = model.group.getObjectByName("culture-practice-carrier"), learner = model.group.getObjectByName("culture-learner");
    model.update({ ...at("K2-opening", "\u73B0\u5728\u8BA9\u7A7A\u767D\u6587\u672C\u8F7D\u4F53\u6765\u5230\u5DE5\u4F5C\u684C", 0.1), step: 1, scene: "culture" });
    const incomingStart = incoming.position.clone();
    model.update({ ...at("K2-opening", "\u73B0\u5728\u8BA9\u7A7A\u767D\u6587\u672C\u8F7D\u4F53\u6765\u5230\u5DE5\u4F5C\u684C", 0.9), step: 1, scene: "culture" });
    expect(incoming.position.z).toBeLessThan(incomingStart.z);
    const learning = { ...at("K2-explain", "\u5B66\u4E60\u8005\u53C2\u4E0E\u8BD1\u5199\u3001\u9009\u62E9\u548C\u7406\u89E3"), step: 1, scene: "culture" };
    model.update(learning);
    const reference = positions(model.group), learningAt = learner.position.clone();
    expect(shown(model.group.getObjectByName("culture-compared-pages"))).toBe(true);
    model.update({ ...at("K2-explain", "\u518D\u628A\u6574\u7406\u540E\u7684\u8F7D\u4F53\u5E26\u5411\u5385\u5802\u524D", 0.9), step: 1, scene: "culture" });
    expect(shown(carrier)).toBe(true);
    expect(carrier.position.z).toBeLessThan(-1.8);
    expect(learner.position.z).toBeLessThan(learningAt.z);
    expect(model.group.getObjectByName("culture-learning-work").userData.guideAnchor.z).toBe(learner.position.z);
    model.update(learning);
    expect(positions(model.group)).toEqual(reference);
    model.dispose();
  });
  it("K3 sorts real leaf meshes before closing the real upper board, and anchors follow their surfaces", () => {
    const model = buildCourtyardScene(fixture()), upper = model.group.getObjectByName("manuscript-upper-cover"), leaf = model.group.getObjectByName("manuscript-blank-leaf-0");
    model.update({ ...at("K3-explain", "\u5148\u8FA8\u8BA4\u4E0B\u65B9\u62A4\u677F\u4E0E\u6563\u5F00\u7684\u4E66\u9875"), step: 2 });
    const top = upper.position.y, spread = leaf.position.x;
    const sorted = { ...at("K3-explain", "\u62A4\u677F\u627F\u6258\u4E66\u9875"), step: 2 };
    model.update(sorted);
    expect(upper.position.y).toBe(top);
    expect(Math.abs(leaf.position.x)).toBeLessThan(Math.abs(spread));
    const reference = positions(model.group);
    model.update({ ...at("K3-explain", "\u4E0A\u65B9\u62A4\u677F\u968F\u540E\u964D\u4E0B", 0.9), step: 2 });
    expect(upper.position.y).toBeLessThan(top - 1);
    expect(upper.userData.guideId).toBe("manuscript-upper-cover");
    expect(object(model.group, "manuscript-leaves").userData.guideAnchor.y).toBeGreaterThan(0.85);
    model.update(sorted);
    expect(positions(model.group)).toEqual(reference);
    model.dispose();
  });
  it("K4 moves the same learner only when approach and participation are actually spoken", () => {
    const model = buildCourtyardScene(fixture()), learner = model.group.getObjectByName("opera-learner");
    model.update({ ...at("K4-explain", "\u73B0\u5728\u6CE8\u610F\u73CA\u745A\u8272\u7684\u5B66\u4E60\u8005"), step: 3 });
    const start = learner.position.clone();
    const approach = { ...at("K4-explain", "\u4ED6\u79BB\u5F00\u89C2\u770B\u4F4D\u7F6E\uFF0C\u8D70\u8FD1\u793A\u8303\u8005"), step: 3 };
    model.update(approach);
    const watching = learner.position.clone();
    expect(watching.distanceTo(start)).toBeGreaterThan(0.5);
    model.update({ ...at("K4-explain", "\u518D\u8FDB\u5165\u5171\u540C\u7684\u7EC3\u4E60\u7A7A\u95F4", 0.9), step: 3 });
    expect(learner.position.distanceTo(watching)).toBeGreaterThan(0.4);
    model.update(approach);
    expect(learner.position).toEqual(watching);
    model.dispose();
  });
  it("K1 focuses unchanged source-based volumes and shows the matching dated annotation, without fake construction", () => {
    const model = buildPalaceStudyScene(fixture()), white = object(model.group, "palace-white"), red = object(model.group, "palace-red");
    model.update(at("K1-explain", "\u8BC4\u4F30\u6587\u4EF6\u8BB0\u8FF0\u4E00\u516D\u56DB\u4E94\u5E74"));
    const shape = positions(white);
    const labels = () => {
      const texts = [];
      model.group.traverse((child) => {
        if (child instanceof THREE.Sprite && shown(child)) texts.push(child.userData.labelText);
      });
      return texts;
    };
    expect(labels().some((text) => text?.includes("1645\u20141648"))).toBe(true);
    expect(labels().some((text) => text?.includes("1694"))).toBe(false);
    model.update(at("K1-explain", "\u6851\u7ED3\u5609\u63AA\u7EC4\u7EC7\u7EA2\u5BAB\u5EFA\u8BBE"));
    expect(labels().some((text) => text?.includes("1694"))).toBe(true);
    expect(labels().some((text) => text?.includes("1645\u20141648"))).toBe(false);
    expect(white.position.toArray()).toEqual([0, 0, 0]);
    expect(red.position.toArray()).toEqual([0, 0, 0]);
    model.update(at("K1-explain", "\u8BC4\u4F30\u6587\u4EF6\u8BB0\u8FF0\u4E00\u516D\u56DB\u4E94\u5E74"));
    expect(positions(white)).toEqual(shape);
    model.dispose();
  });
  it.each([[1280, 720], [390, 360]])("resolves actual moving-object attention and bounded readable labels at %s\xD7%s", (width, height) => {
    const runtime = fixture(width, height), history = buildHistoryInquiryScene(runtime), culture = buildCourtyardScene(runtime);
    for (const [model, settings] of [[history, at("H1-explain", "\u518D\u628A\u5668\u7269\u4E0E\u7814\u7A76\u8BB0\u5F55\u5173\u8054")], [culture, { ...at("K3-explain", "\u4E0A\u65B9\u62A4\u677F\u968F\u540E\u964D\u4E0B"), step: 2 }]]) {
      model.update(settings);
      const guide = buildNarrationAnnotations(model.group, runtime.camera, runtime.renderer);
      guide.update(settings);
      expect(guide.group.children.filter((child) => child.visible).length).toBeGreaterThan(4);
      let labels = 0;
      model.group.traverse((child) => {
        if (child instanceof THREE.Sprite && shown(child) && child.userData.screenAnnotation) {
          labels++;
          const pos = child.position.clone().project(runtime.camera), y = (1 - pos.y) * height / 2;
          expect(y).toBeGreaterThanOrEqual(height < 480 ? 82 : 100);
          expect(y).toBeLessThan(height - 80);
        }
      });
      if (height < 480) expect(labels).toBeLessThanOrEqual(3);
      expect(labels).toBeGreaterThan(0);
      guide.dispose();
    }
    disposeTree(history.group);
    culture.dispose();
  });
});
