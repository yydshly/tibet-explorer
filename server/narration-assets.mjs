import fs from 'node:fs/promises';
import path from 'node:path';

/** Serve generated files directly: the dev server's startup public-file index
 * cannot see new files when audio-directory watching is intentionally disabled. */
export function narrationAssetsMiddleware(directory) {
  return async function serve(request, response, next) {
    const name = (request.url || '').split('?')[0].replace(/^\//, '');
    const isAudio = /^[a-f0-9]{64}\.mp3$/.test(name);
    const isSubtitle = /^[a-f0-9]{64}\.subtitles\.json$/.test(name);
    const isManifest = name === 'cue-manifest.json' || name === 'manifest.json';
    if (!isAudio && !isManifest&&!isSubtitle) {
      if (name.endsWith('.mp3')) { response.statusCode = 404; response.end(); }
      else next();
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.statusCode = 405; response.setHeader('Allow', 'GET, HEAD'); response.end(); return;
    }
    try {
      const file = path.join(directory, name), stat = await fs.stat(file);
      if (!stat.isFile()) { response.statusCode = 404; response.end(); return; }
      if(isSubtitle&&stat.size>262144){response.statusCode=413;response.end();return;}
      const bytes = request.method === 'HEAD' ? null : await fs.readFile(file);
      const size = bytes?.length ?? stat.size;
      response.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', isAudio||isSubtitle ? 'public, max-age=31536000, immutable' : 'no-cache');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      let start = 0, end = size - 1;
      if (isAudio) response.setHeader('Accept-Ranges', 'bytes');
      if (isAudio && request.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        let valid = !!match && !!(match[1] || match[2]);
        if (valid && match) {
          if (!match[1]) {
            const suffix = Number(match[2]); valid = Number.isSafeInteger(suffix) && suffix > 0;
            start = Math.max(0, size - suffix);
          } else {
            start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
            valid = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end;
          }
          valid = valid && start >= 0 && start < size;
        }
        if (!valid) {
          response.statusCode = 416; response.setHeader('Content-Range', `bytes */${size}`); response.end(); return;
        }
        response.statusCode = 206; response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      }
      response.setHeader('Content-Length', Math.max(0, end - start + 1));
      if (request.method === 'HEAD') response.end();
      else response.end(bytes.subarray(start, end + 1));
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      response.statusCode = error.code === 'ENOENT' ? 404 : 500; response.end();
    }
  };
}
