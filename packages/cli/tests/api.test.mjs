import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiClient, ExportDouError } from '../dist/api.js';
import { apiBaseUrl } from '../dist/config.js';
import { packageVersion } from '../dist/version.js';

test('retries a safe GET and sends the client credential only in a header', async (t) => {
  const previousUrl = process.env.EXPORTDOU_API_URL;
  process.env.EXPORTDOU_API_URL = 'https://synthetic.exportdou.test';
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls += 1;
    assert.equal(String(url), 'https://synthetic.exportdou.test/v1/account');
    assert.equal(init.headers.Authorization, 'Bearer ed_live_synthetic_secret');
    assert.equal(init.headers['X-ExportDou-Client-Version'], packageVersion());
    assert.equal(String(url).includes('ed_live_synthetic_secret'), false);
    if (calls === 1) return Response.json({ error: 'temporary' }, { status: 503 });
    return Response.json({ id: 'user-1' });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl == null) delete process.env.EXPORTDOU_API_URL;
    else process.env.EXPORTDOU_API_URL = previousUrl;
  });

  const response = await new ApiClient('ed_live_synthetic_secret')
    .request('/account');
  assert.deepEqual(response, { id: 'user-1' });
  assert.equal(calls, 2);
});

test('normalizes the production and local API base URLs without duplicating v1', (t) => {
  const previousUrl = process.env.EXPORTDOU_API_URL;
  t.after(() => {
    if (previousUrl == null) delete process.env.EXPORTDOU_API_URL;
    else process.env.EXPORTDOU_API_URL = previousUrl;
  });

  delete process.env.EXPORTDOU_API_URL;
  assert.equal(apiBaseUrl(), 'https://api.exportdou.cn/v1');
  process.env.EXPORTDOU_API_URL = 'https://api.exportdou.cn/v1/';
  assert.equal(apiBaseUrl(), 'https://api.exportdou.cn/v1');
  process.env.EXPORTDOU_API_URL = 'http://localhost:8787';
  assert.equal(apiBaseUrl(), 'http://localhost:8787/v1');
  process.env.EXPORTDOU_API_URL = 'https://example.test/api/v1';
  assert.equal(apiBaseUrl(), 'https://example.test/api/v1');
});

test('retries an idempotent create with the same request key', async (t) => {
  const originalFetch = globalThis.fetch;
  const observedKeys = [];
  globalThis.fetch = async (_url, init) => {
    observedKeys.push(init.headers['Idempotency-Key']);
    if (observedKeys.length === 1) return Response.json({}, { status: 502 });
    return Response.json({ id: 'task-1', status: 'queued' }, { status: 201 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await new ApiClient('ed_live_synthetic_secret').request(
    '/exports',
    {
      body: { input: 'synthetic' },
      idempotencyKey: 'request-1',
      method: 'POST',
    },
  );
  assert.deepEqual(response, { id: 'task-1', status: 'queued' });
  assert.deepEqual(observedKeys, ['request-1', 'request-1']);
});

test('calls the resume endpoint once with POST', async (t) => {
  const previousUrl = process.env.EXPORTDOU_API_URL;
  process.env.EXPORTDOU_API_URL = 'https://synthetic.exportdou.test/v1';
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ method: init.method, url: String(url) });
    return Response.json({
      dispatchDelayed: false,
      dispatchVersion: 2,
      id: '10000000-0000-4000-8000-000000000001',
      remainingCredits: 50,
      status: 'queued',
    }, { status: 202 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl == null) delete process.env.EXPORTDOU_API_URL;
    else process.env.EXPORTDOU_API_URL = previousUrl;
  });

  await new ApiClient('ed_live_synthetic_secret').request(
    '/exports/10000000-0000-4000-8000-000000000001/resume',
    { method: 'POST' },
  );
  assert.deepEqual(calls, [{
    method: 'POST',
    url: 'https://synthetic.exportdou.test/v1/exports/10000000-0000-4000-8000-000000000001/resume',
  }]);
});

test('fails locally before an authenticated request without a key', async (t) => {
  const previousEnvironmentKey = process.env.EXPORTDOU_API_KEY;
  const previousConfig = process.env.EXPORTDOU_CONFIG_PATH;
  delete process.env.EXPORTDOU_API_KEY;
  process.env.EXPORTDOU_CONFIG_PATH = '/tmp/exportdou-nonexistent-config-for-test';
  t.after(() => {
    if (previousEnvironmentKey == null) delete process.env.EXPORTDOU_API_KEY;
    else process.env.EXPORTDOU_API_KEY = previousEnvironmentKey;
    if (previousConfig == null) delete process.env.EXPORTDOU_CONFIG_PATH;
    else process.env.EXPORTDOU_CONFIG_PATH = previousConfig;
  });
  await assert.rejects(
    () => new ApiClient().request('/account'),
    (error) => error instanceof ExportDouError
      && error.code === 'authentication_required',
  );
});
