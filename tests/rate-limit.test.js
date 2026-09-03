const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createRateLimiter } = require('../dist/middleware/operations');

test('rate limiter sınırı aşan isteği 429 ile reddeder', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(createRateLimiter(60_000, 2));
  app.get('/', (_req, res) => res.json({ ok: true }));
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(url)).status, 200);
    const limited = await fetch(url);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) >= 1);
    assert.equal((await limited.json()).code, 'RATE_LIMITED');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
