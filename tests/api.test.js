const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../dist/index').default;

let server;
let baseUrl;
let temporaryFormId;
let managerToken;
const testManagerEmail = process.env.TEST_MANAGER_EMAIL;
const testManagerPassword = process.env.TEST_MANAGER_PASSWORD;
const hasTestManagerCredentials = Boolean(testManagerEmail && testManagerPassword);

before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (temporaryFormId && managerToken) {
    await fetch(`${baseUrl}/forms/${temporaryFormId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${managerToken}` },
    }).catch(() => undefined);
  }
  await new Promise(resolve => server.close(resolve));
});

test('health endpoint veritabanı bağlantısını doğrular', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'postgresql');
});

test('OpenAPI belgesi yönetici API gruplarını içerir', async () => {
  const response = await fetch(`${baseUrl}/openapi.json`);
  const document = await response.json();
  assert.equal(response.status, 200);
  assert.equal(document.openapi, '3.0.3');
  for (const path of [
    '/auth/forgot-password', '/auth/reset-password', '/volunteers',
    '/applications', '/notifications', '/forms', '/forms/{id}/submissions',
  ]) {
    assert.ok(document.paths[path], `${path} OpenAPI belgesinde bulunmalıdır`);
  }
});

test('dashboard geçersiz yılı reddeder', async () => {
  const response = await fetch(`${baseUrl}/dashboard/stats?year=1800`);
  assert.equal(response.status, 400);
});

test('dashboard seçilen yıl aralığındaki her yıl için veri üretir', async () => {
  const response = await fetch(`${baseUrl}/dashboard/range?startYear=2010&endYear=2026`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 17);
  assert.equal(body.data[0].year, 2010);
  assert.equal(body.data[16].year, 2026);
  for (let index = 1; index < body.data.length; index += 1) {
    assert.ok(body.data[index].total >= body.data[index - 1].total);
  }
});

test('login hashlenmiş şifreyle token üretir', { skip: !hasTestManagerCredentials && 'TEST_MANAGER_EMAIL ve TEST_MANAGER_PASSWORD tanımlı değil' }, async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ organizationSlug: 'gonullu360', email: testManagerEmail, password: testManagerPassword }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.token);
  assert.equal(body.user.password, undefined);
});

test('korumalı silme endpointi tokensız isteği reddeder', async () => {
  const response = await fetch(`${baseUrl}/volunteers/1`, { method: 'DELETE' });
  assert.equal(response.status, 401);
});

test('form yönetimi tokensız isteği reddeder', async () => {
  const response = await fetch(`${baseUrl}/forms`);
  assert.equal(response.status, 401);
});

test('kayıtlı olmayan e-posta şifre yenileme kodu alamaz', async () => {
  const response = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `missing-${Date.now()}@test.local` }),
  });
  assert.equal(response.status, 404);
});

test('form taslağı oluşturulur, yayınlanır ve cevap kabul eder', { skip: !hasTestManagerCredentials && 'TEST_MANAGER_EMAIL ve TEST_MANAGER_PASSWORD tanımlı değil' }, async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ organizationSlug: 'gonullu360', email: testManagerEmail, password: testManagerPassword }),
  });
  const { token } = await loginResponse.json();
  managerToken = token;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const schema = {
    schemaVersion: 1,
    id: `test_form_${Date.now()}`,
    title: 'Test Başvuru Formu',
    description: 'Entegrasyon testi',
    sections: [{ id: 'section_1', title: 'Bilgiler', fields: [{ id: 'name', type: 'full_name', label: 'Ad Soyad', required: true }] }],
  };

  const createResponse = await fetch(`${baseUrl}/forms`, { method: 'POST', headers, body: JSON.stringify({ schema }) });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.ok(created.id);
  temporaryFormId = created.id;

  const publishResponse = await fetch(`${baseUrl}/forms/${created.id}/publish`, {
    method: 'POST', headers, body: JSON.stringify({ expectedRevision: created.revision }),
  });
  const published = await publishResponse.json();
  assert.equal(publishResponse.status, 200);
  assert.equal(published.version, 1);

  const invalidSubmissionResponse = await fetch(`${baseUrl}/forms/${created.id}/submissions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: {} }),
  });
  assert.equal(invalidSubmissionResponse.status, 400);

  const submissionResponse = await fetch(`${baseUrl}/forms/${created.id}/submissions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: { name: 'Test Kullanıcısı' } }),
  });
  assert.equal(submissionResponse.status, 201);

  const submissionsResponse = await fetch(`${baseUrl}/forms/${created.id}/submissions`, { headers });
  const submissions = await submissionsResponse.json();
  assert.equal(submissionsResponse.status, 200);
  assert.equal(submissions.submissions.length, 1);
  assert.equal(submissions.submissions[0].answers.name, 'Test Kullanıcısı');
  assert.equal(submissions.pagination.total, 1);
  assert.equal(submissions.pagination.page, 1);
  assert.equal(submissions.pagination.limit, 20);

  const deleteResponse = await fetch(`${baseUrl}/forms/${created.id}`, { method: 'DELETE', headers });
  assert.equal(deleteResponse.status, 200);
  temporaryFormId = undefined;
});

test('bilinmeyen endpoint standart 404 döndürür', async () => {
  const response = await fetch(`${baseUrl}/bilinmeyen`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error, 'Endpoint bulunamadı');
});
