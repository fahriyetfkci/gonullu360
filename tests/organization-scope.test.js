const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../dist/index').default;
const { config } = require('../dist/config');

let server;
let baseUrl;

before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => new Promise(resolve => server.close(resolve)));

test('başka organizasyon kimliği iş verilerini göremez', async () => {
  const token = jwt.sign({ id: 'isolation-user', email: 'isolation@test.local', role: 'ADMIN', organizationId: 'isolation-organization' }, config.jwtSecret, { expiresIn: '5m' });
  const headers = { authorization: `Bearer ${token}` };
  const paths = ['/volunteers?page=1&limit=10', '/volunteers/grouped?page=1&limit=10', '/applications?page=1&limit=10', '/applications/all?page=1&limit=10'];
  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.pagination.total, 0);
  }

  const dashboardResponse = await fetch(`${baseUrl}/dashboard/stats?year=2026`, { headers });
  const dashboard = await dashboardResponse.json();
  assert.equal(dashboardResponse.status, 200);
  assert.equal(dashboard.activeVolunteers.total, 0);
  assert.equal(dashboard.pagination.total, 0);
  assert.equal(dashboard.completedEvents.total, 0);
});
