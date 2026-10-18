import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { narrationAssetsMiddleware } from '../server/narration-assets.mjs';

test('new narration files become playable after startup, without a watched-file index', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tibet-narration-assets-'));
  const middleware = narrationAssetsMiddleware(directory);
  const server = createServer((request, response) => void middleware(request, response, () => {
    response.setHeader('Content-Type', 'text/html'); response.end('app shell');
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const filename = `${'a'.repeat(64)}.mp3`, bytes = Buffer.from('ID3newly-generated-audio');
  const subtitleFilename=`${'a'.repeat(64)}.subtitles.json`;
  try {
    const missing = await fetch(`${origin}/${filename}`);
    assert.equal(missing.status, 404);
    await fs.writeFile(path.join(directory, filename), bytes);
    const head = await fetch(`${origin}/${filename}`, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(head.headers.get('content-type'), 'audio/mpeg');
    assert.equal(Number(head.headers.get('content-length')), bytes.length);
    const complete = await fetch(`${origin}/${filename}`);
    assert.deepEqual(Buffer.from(await complete.arrayBuffer()), bytes);
    const range = await fetch(`${origin}/${filename}`, { headers: { Range: 'bytes=3-8' } });
    assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), `bytes 3-8/${bytes.length}`);
    assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(3, 9));
    const suffix = await fetch(`${origin}/${filename}`, { headers: { Range: 'bytes=-5' } });
    assert.equal(suffix.status, 206); assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-5));
    const invalid = await fetch(`${origin}/${filename}`, { headers: { Range: 'bytes=999-1000' } });
    assert.equal(invalid.status, 416);
    await fs.writeFile(path.join(directory, 'cue-manifest.json'), JSON.stringify({ clips: [] }));
    const manifest = await fetch(`${origin}/cue-manifest.json`);
    assert.match(manifest.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await manifest.json(), { clips: [] });
    await fs.writeFile(path.join(directory,subtitleFilename),JSON.stringify({version:1,cues:[]}));
    const subtitle=await fetch(`${origin}/${subtitleFilename}`);
    assert.match(subtitle.headers.get('content-type'),/application\/json/);assert.match(subtitle.headers.get('cache-control'),/immutable/);
    assert.deepEqual(await subtitle.json(),{version:1,cues:[]});
    assert.equal((await fetch(`${origin}/${subtitleFilename}`,{method:'POST'})).status,405);
    await fs.writeFile(path.join(directory,subtitleFilename),'x'.repeat(262145));
    assert.equal((await fetch(`${origin}/${subtitleFilename}`)).status,413);
    assert.equal((await fetch(`${origin}/${filename}`, { method: 'POST' })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.unlink(path.join(directory, filename)).catch(() => {});
    await fs.unlink(path.join(directory, 'cue-manifest.json')).catch(() => {});
    await fs.unlink(path.join(directory,subtitleFilename)).catch(()=>{});
    await fs.rmdir(directory);
  }
});
