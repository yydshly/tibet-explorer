import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import * as THREE from 'three';
import { buildCityLocalMap } from '../src/scene/cityLocalMap';
import { buildTransportGeographicReferences } from '../src/scene/transportGeographicReferences';
import { buildStoryAtlasScene, storyAtlasPosition, STORY_ATLAS_META } from '../src/scene/storyAtlas';

vi.mock('../src/scene/environment', async original => ({
  ...await original(), label: () => new THREE.Sprite(new THREE.SpriteMaterial()),
}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const json = url => JSON.parse(readFileSync(`public${url}`, 'utf8'));
const bytes = url => { const data = readFileSync(`public${url}`); return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength); };
const localManifest = '/assets/terrain/local-places/manifest.json';
const corridors = '/data/local-places/transport-corridors.manifest.json';
const referenceManifest = '/data/local-places/transport-reference.json';
const camera = () => new THREE.PerspectiveCamera(43, 1440 / 900, .01, 300);
const localRuntime = regionalReady => ({ camera: camera(), project: storyAtlasPosition,
  metresPerUnit: 47 * 111320 * Math.cos(29.5 * Math.PI / 180) / STORY_ATLAS_META.width,
  focus: vi.fn(), regionalReady,
});
const referenceRuntime = () => ({ camera: camera(), at: (lon, lat, offset = 0) => new THREE.Vector3(lon, offset, -lat) });
const atlasRuntime = () => ({ camera: camera(), renderer: {
  getSize: target => target.set(1440, 900), capabilities: { getMaxAnisotropy: () => 8 },
}, sun: new THREE.DirectionalLight(), focus: vi.fn(), hasSavedView: () => false });
const immediateResponse = url => ({ ok: true, json: async () => json(url), arrayBuffer: async () => bytes(url) });

describe('map source lifetime follows the actual scene instance', () => {
  it('closes actual HTTP transfers when the local scene leaves before its six city bodies arrive', async () => {
    const nativeFetch = globalThis.fetch;
    let waiting = 0, disconnected = 0;
    const server = createServer((request, response) => {
      if ([localManifest, corridors].includes(request.url)) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(readFileSync(`public${request.url}`));
      } else {
        waiting++;
        response.on('close', () => { if (!response.writableEnded) disconnected++; });
        // Leave the actual GeoJSON/DEM HTTP bodies pending. A promise-only
        // mock cannot establish that native fetch stops the socket transfer.
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    vi.stubGlobal('fetch', vi.fn((url, options) => nativeFetch(`${origin}${url}`, options)));
    const model = buildCityLocalMap(localRuntime()), add = vi.spyOn(model.group, 'add');
    try {
      await vi.waitFor(() => expect(waiting).toBe(6));
      model.dispose(); await model.ready;
      await vi.waitFor(() => expect(disconnected).toBe(6));
      expect(add).not.toHaveBeenCalled(); expect(model.places.size).toBe(0);
    } finally {
      model.dispose(); server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  });

  it.each(['local', 'references'])('aborts %s HTTP requests and settles disposal without a false source failure', async kind => {
    const signals = [];
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => {
      signals.push(signal);
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    }));
    const model = kind === 'local' ? buildCityLocalMap(localRuntime()) : buildTransportGeographicReferences(referenceRuntime());
    const add = vi.spyOn(model.group, 'add');
    expect(signals).toHaveLength(kind === 'local' ? 2 : 1);
    expect(new Set(signals).size).toBe(1);
    model.dispose(); model.dispose();
    expect(signals.every(signal => signal.aborted)).toBe(true);
    await model.ready;
    expect(add).not.toHaveBeenCalled();
    expect(model.group.userData.failed).toBeUndefined();
    expect(model.group.children).toHaveLength(0);
  });

  it('does not parse late local manifest responses or start city requests after leaving', async () => {
    const responses = [], parse = vi.fn(async () => json(localManifest));
    vi.stubGlobal('fetch', vi.fn(() => { const response = deferred(); responses.push(response); return response.promise; }));
    const model = buildCityLocalMap(localRuntime());
    model.dispose();
    responses.forEach(response => response.resolve({ ok: true, json: parse }));
    await model.ready;
    expect(parse).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(model.places.size).toBe(0);
  });

  it.each(['local', 'references'])('does not fan out a %s manifest whose JSON parsing finished after disposal', async kind => {
    const parsed = deferred(), manifestUrl = kind === 'local' ? localManifest : referenceManifest;
    const parse = vi.fn(() => parsed.promise);
    vi.stubGlobal('fetch', vi.fn(async url => url === manifestUrl ? { ok: true, json: parse } : immediateResponse(url)));
    const model = kind === 'local' ? buildCityLocalMap(localRuntime()) : buildTransportGeographicReferences(referenceRuntime());
    await vi.waitFor(() => expect(parse).toHaveBeenCalledTimes(1));
    model.dispose(); parsed.resolve(json(manifestUrl));
    await model.ready;
    expect(fetch).toHaveBeenCalledTimes(kind === 'local' ? 2 : 1);
    expect(model.group.children).toHaveLength(0);
  });

  it('skips late GeoJSON and DEM body reads once local requests are no longer needed', async () => {
    const pending = [], parse = vi.fn(async () => ({})), readBuffer = vi.fn(async () => new ArrayBuffer(0));
    vi.stubGlobal('fetch', vi.fn(async url => {
      if ([localManifest, corridors].includes(url)) return immediateResponse(url);
      const response = deferred(); pending.push(response); return response.promise;
    }));
    const model = buildCityLocalMap(localRuntime()), add = vi.spyOn(model.group, 'add');
    await vi.waitFor(() => expect(pending).toHaveLength(6));
    model.dispose();
    pending.forEach(response => response.resolve({ ok: true, json: parse, arrayBuffer: readBuffer }));
    await model.ready;
    expect(parse).not.toHaveBeenCalled(); expect(readBuffer).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled(); expect(model.places.size).toBe(0);
  });

  it('does not decode DEMs or construct geometry when an already-reading body arrives after disposal', async () => {
    const pending = [], reading = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async url => url.endsWith('.int16') ? {
      ok: true, arrayBuffer: () => { reading(); const body = deferred(); pending.push({ body, url }); return body.promise; },
    } : immediateResponse(url)));
    const model = buildCityLocalMap(localRuntime()), add = vi.spyOn(model.group, 'add');
    await vi.waitFor(() => expect(reading).toHaveBeenCalledTimes(3));
    const decode = vi.spyOn(Int16Array, 'from');
    model.dispose(); pending.forEach(({ body, url }) => body.resolve(bytes(url)));
    await model.ready;
    expect(decode).not.toHaveBeenCalled(); expect(add).not.toHaveBeenCalled();
    expect(model.places.size).toBe(0);
  });

  it('does not build a late local mesh after waiting for the regional surface', async () => {
    const regional = deferred();
    vi.stubGlobal('fetch', vi.fn(async url => immediateResponse(url)));
    const decode = vi.spyOn(Int16Array, 'from');
    const model = buildCityLocalMap(localRuntime(regional.promise)), add = vi.spyOn(model.group, 'add');
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(3));
    model.dispose(); regional.resolve(); await model.ready;
    expect(add).not.toHaveBeenCalled(); expect(model.places.size).toBe(0);
  });

  it('does not add reference geometry or mutate group status after late airport JSON resolves', async () => {
    const pending = [];
    vi.stubGlobal('fetch', vi.fn(async url => url === referenceManifest ? immediateResponse(url) : {
      ok: true, json: () => { const parsed = deferred(); pending.push({ parsed, url }); return parsed.promise; },
    }));
    const model = buildTransportGeographicReferences(referenceRuntime()), add = vi.spyOn(model.group, 'add');
    await vi.waitFor(() => expect(pending).toHaveLength(3));
    const status = { ...model.group.userData };
    model.dispose(); pending.forEach(({ parsed, url }) => parsed.resolve(json(url))); await model.ready;
    expect(add).not.toHaveBeenCalled(); expect(model.references).toHaveLength(0);
    expect(model.group.userData).toEqual(status);
  });

  it.each(['response', 'body'])('aborts atlas boundaries/elevation at the %s boundary without late scene writes', async phase => {
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => { const texture = new THREE.Texture(); onLoad?.(texture); return texture; });
    const pending = [], signals = [], parse = vi.fn(), readBuffer = vi.fn();
    vi.stubGlobal('fetch', vi.fn((url, { signal }) => {
      signals.push(signal);
      const result = deferred(); pending.push({ result, url });
      if (phase === 'response') return result.promise;
      return Promise.resolve({ ok: true, json: () => { parse(); return result.promise; }, arrayBuffer: () => { readBuffer(); return result.promise; } });
    }));
    const model = buildStoryAtlasScene(atlasRuntime(), { localDetails: false }), add = vi.spyOn(model.group, 'add');
    if (phase === 'body') await vi.waitFor(() => expect(parse.mock.calls.length + readBuffer.mock.calls.length).toBe(2));
    expect(pending).toHaveLength(2); expect(new Set(signals).size).toBe(1);
    model.dispose();
    pending.forEach(({ result, url }) => result.resolve(phase === 'response' ? { ok: true, json: parse, arrayBuffer: readBuffer } : url === STORY_ATLAS_META.boundaries ? json(url) : bytes(url)));
    await model.ready;
    expect(signals.every(signal => signal.aborted)).toBe(true); expect(add).not.toHaveBeenCalled();
    if (phase === 'response') { expect(parse).not.toHaveBeenCalled(); expect(readBuffer).not.toHaveBeenCalled(); }
  });

  it('keeps a new entry independent and consumes original parsed sources without mutation', async () => {
    const values = new Map(), before = new Map(), signals = [];
    vi.stubGlobal('fetch', vi.fn(async (url, { signal }) => {
      signals.push(signal);
      return { ok: true, json: async () => {
        // Retain the actual returned parsed object to detect consumer mutation.
        const value = json(url); values.set(url, value); before.set(url, JSON.stringify(value)); return value;
      }, arrayBuffer: async () => bytes(url) };
    }));
    const oldLocal = buildCityLocalMap(localRuntime()), oldReferences = buildTransportGeographicReferences(referenceRuntime());
    oldLocal.dispose(); oldReferences.dispose(); await Promise.all([oldLocal.ready, oldReferences.ready]);
    const oldSignals = new Set(signals);
    const model = buildCityLocalMap(localRuntime()), references = buildTransportGeographicReferences(referenceRuntime());
    await Promise.all([model.ready, references.ready]);
    expect(model.places.size).toBe(3); expect(references.references).toHaveLength(3);
    expect(signals.filter(signal => !oldSignals.has(signal)).every(signal => !signal.aborted)).toBe(true);
    const viewport = new THREE.Vector2(1440, 900);
    for (const step of [3, 4, 5, 6]) for (const progress of [.29, .53, .91]) {
      const props = { layer: 'atlas-city-comparison', step, progress, selected: '', resetKey: 0,
        cityLifeServices: true, cityAccessTransfer: true };
      model.update(props, viewport); references.update(props, viewport);
    }
    for (const [url, value] of values) expect(JSON.stringify(value)).toBe(before.get(url));
    // The source audit also prevents a regression to the large, unnecessary
    // Lhasa collection for a freight-station reference that has its own file.
    expect(fetch.mock.calls.filter(([url]) => url === '/data/local-places/lhasa.geojson')).toHaveLength(1);
    expect(values.has('/data/local-places/lhasa-west-reference.geojson')).toBe(true);
    model.dispose(); references.dispose();
  });
});
