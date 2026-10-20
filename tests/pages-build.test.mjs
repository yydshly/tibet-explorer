import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relocatePublicPaths } from '../scripts/build-pages.mjs';
test('project-site paths relocate without rewriting external links or doubling base', () => {
  const input = `fetch('/data/meta.json'); const a="/assets/a.jpg";const b=\`/assets/\${id}\`; url(/assets/a.png); href="/#/overview";href="/project-review/index.html"; const x="https://example.com/assets/a.jpg";const y="/tibet-explorer/assets/a.jpg";`;
  const result = relocatePublicPaths(input, '/tibet-explorer/');
  assert.ok(result.includes("fetch('/tibet-explorer/data/meta.json')"));
  assert.ok(result.includes('url(/tibet-explorer/assets/a.png)'));
  assert.ok(result.includes('"/tibet-explorer/#/overview"'));
  assert.ok(result.includes('https://example.com/assets/a.jpg'));
  assert.ok(!result.includes('/tibet-explorer/tibet-explorer/'));
  assert.equal(relocatePublicPaths(result, '/tibet-explorer/'), result);
});
