const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../dist/index').default;
const prisma = require('../dist/db/prisma').default;

let server;
let baseUrl;
let temporaryFormId;
let managerToken;
let temporaryEventId;
let temporaryEventGroupId;
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
  if (temporaryEventId) await prisma.event.deleteMany({ where: { id: temporaryEventId } }).catch(() => undefined);
  if (temporaryEventGroupId) await prisma.eventGroup.deleteMany({ where: { id: temporaryEventGroupId } }).catch(() => undefined);
  await new Promise(resolve => server.close(resolve));
});

test('etkinlik yönetimi grup, CRUD, arama ve filtreleme akışını destekler', { skip: !hasTestManagerCredentials && 'TEST_MANAGER_EMAIL ve TEST_MANAGER_PASSWORD tanımlı değil' }, async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ organizationSlug: 'gonullu360', email: testManagerEmail, password: testManagerPassword }),
  });
  const { token } = await loginResponse.json();
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const suffix = Date.now();

  const groupResponse = await fetch(`${baseUrl}/events/groups`, { method: 'POST', headers, body: JSON.stringify({ name: `Test Grup ${suffix}`, color: '#00a99d' }) });
  const groupBody = await groupResponse.json();
  assert.equal(groupResponse.status, 201);
  temporaryEventGroupId = groupBody.data.id;

  const startsAt = '2026-12-10T09:00:00.000+03:00';
  const payload = { name: `Entegrasyon Etkinliği ${suffix}`, slug: `entegrasyon-etkinligi-${suffix}`, type: 'IN_PERSON', startsAt, endsAt: '2026-12-10T11:00:00.000+03:00', timezone: 'Europe/Istanbul', address: 'İstanbul', capacity: 25, registrationFormId: null, contactInfo: null, description: 'CRUD testi', posterUrl: null, posterStorageKey: null, groupIds: [temporaryEventGroupId] };
  const createResponse = await fetch(`${baseUrl}/events`, { method: 'POST', headers, body: JSON.stringify(payload) });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  temporaryEventId = created.data.id;

  const listResponse = await fetch(`${baseUrl}/events?page=1&limit=5&status=SCHEDULED&groupId=${temporaryEventGroupId}&search=${suffix}`, { headers });
  const listed = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listed.events, undefined);
  assert.equal(listed.data.pagination.total, 1);
  assert.equal(listed.data.items[0].id, temporaryEventId);
  assert.equal(listed.data.items[0].groups[0].id, temporaryEventGroupId);

  const overviewResponse = await fetch(`${baseUrl}/events/overview`, { headers });
  const overview = await overviewResponse.json();
  assert.equal(overviewResponse.status, 200);
  assert.equal(typeof overview.data.totalEvents, 'number');
  assert.equal(typeof overview.data.activeVolunteers, 'number');
  assert.equal(typeof overview.data.activeVolunteerParticipationRate, 'number');
  assert.equal(typeof overview.data.distribution.completed.percentage, 'number');
  assert.equal(typeof overview.data.distribution.scheduled.percentage, 'number');
  assert.equal(typeof overview.data.distribution.cancelled.percentage, 'number');
  assert.equal(typeof overview.data.participationDistribution.comparedToPreviousMonth.currentMonthParticipants, 'number');
  assert.equal(typeof overview.data.participationDistribution.comparedToPreviousMonth.previousMonthParticipants, 'number');

  const updateResponse = await fetch(`${baseUrl}/events/${temporaryEventId}`, { method: 'PUT', headers, body: JSON.stringify({ ...payload, name: `Güncel Etkinlik ${suffix}` }) });
  assert.equal(updateResponse.status, 200);

  const archiveResponse = await fetch(`${baseUrl}/events/${temporaryEventId}`, { method: 'DELETE', headers });
  assert.equal(archiveResponse.status, 200);
  const archivedList = await fetch(`${baseUrl}/events?status=ARCHIVED&search=${suffix}`, { headers });
  const archived = await archivedList.json();
  assert.ok(archived.data.items.some(item => item.id === temporaryEventId));

  const legacyResponse = await fetch(`${baseUrl}/events`, { method: 'POST', headers, body: JSON.stringify({ name: 'Eski biçim', date: '2026-12-10', time: '09:00' }) });
  assert.equal(legacyResponse.status, 422);

  await prisma.event.delete({ where: { id: temporaryEventId } });
  temporaryEventId = undefined;
  await prisma.eventGroup.delete({ where: { id: temporaryEventGroupId } });
  temporaryEventGroupId = undefined;
});

test('sahte görsel imzalı poster ve güvensiz profil alanları reddedilir', { skip: !hasTestManagerCredentials && 'TEST_MANAGER_EMAIL ve TEST_MANAGER_PASSWORD tanımlı değil' }, async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ organizationSlug: 'gonullu360', email: testManagerEmail, password: testManagerPassword }),
  });
  const { token } = await loginResponse.json();
  const authorization = { authorization: `Bearer ${token}` };

  const poster = new FormData();
  poster.append('poster', new Blob(['gerçek bir png değil'], { type: 'image/png' }), 'sahte.png');
  const posterResponse = await fetch(`${baseUrl}/events/poster`, { method: 'POST', headers: authorization, body: poster });
  assert.equal(posterResponse.status, 400);

  const unsafeWebsite = await fetch(`${baseUrl}/account/profile`, { method: 'PUT', headers: { ...authorization, 'content-type': 'application/json' }, body: JSON.stringify({ website: 'javascript:alert(1)' }) });
  assert.equal(unsafeWebsite.status, 422);

  const fakePhoto = await fetch(`${baseUrl}/account/profile`, { method: 'PUT', headers: { ...authorization, 'content-type': 'application/json' }, body: JSON.stringify({ photoUrl: 'data:image/png;base64,aGVsbG8gd29ybGQ=' }) });
  assert.equal(fakePhoto.status, 422);

  const forbiddenField = await fetch(`${baseUrl}/account/profile`, { method: 'PUT', headers: { ...authorization, 'content-type': 'application/json' }, body: JSON.stringify({ role: 'VOLUNTEER' }) });
  assert.equal(forbiddenField.status, 422);
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
    '/volunteers/map', '/volunteers/map/sync', '/applications', '/account/profile', '/account/users',
    '/events', '/events/poster', '/events/{id}', '/notifications', '/forms', '/forms/{id}/submissions',
  ]) {
    assert.ok(document.paths[path], `${path} OpenAPI belgesinde bulunmalıdır`);
  }
});

test('gönüllü haritası cevabı 81 il ve senkronizasyon durumuyla döner', async () => {
  const response = await fetch(`${baseUrl}/volunteers/map`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.cities.length, 81);
  assert.ok(body.cities.every(city => Number.isInteger(city.studentCount) && city.studentCount >= 0));
  assert.match(body.educationInstitutionPeriod, /^\d{4}-\d{4}$/);
  assert.ok(['success', 'running', 'failed', 'not_started'].includes(body.educationSyncStatus));
});

test('eğitim verisi manuel güncellemesi yönetici oturumu gerektirir', async () => {
  const response = await fetch(`${baseUrl}/volunteers/map/sync`, { method: 'POST' });
  assert.equal(response.status, 401);
});

test('dashboard geçersiz yılı reddeder', async () => {
  const response = await fetch(`${baseUrl}/dashboard/stats?year=1800`);
  assert.equal(response.status, 400);
});

test('gönüllü gruplama sıralamayı sayfalama öncesinde tüm kayıtlara uygular', async () => {
  const query = 'sortField=fullName&sortDirection=asc';
  const [pageResponse, expandedResponse] = await Promise.all([
    fetch(`${baseUrl}/volunteers/grouped?page=1&limit=10&${query}`),
    fetch(`${baseUrl}/volunteers/grouped?page=1&limit=100&${query}`),
  ]);
  const pageBody = await pageResponse.json();
  const expandedBody = await expandedResponse.json();
  assert.equal(pageResponse.status, 200);
  assert.equal(expandedResponse.status, 200);
  assert.deepEqual(
    pageBody.volunteers.map(item => item.key),
    expandedBody.volunteers.slice(0, 10).map(item => item.key),
  );
});

test('dashboard seçilen yıl aralığındaki her yılın yeni gönüllü sayısını üretir', async () => {
  const response = await fetch(`${baseUrl}/dashboard/range?startYear=2010&endYear=2026`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 17);
  assert.equal(body.data[0].year, 2010);
  assert.equal(body.data[16].year, 2026);
  for (const item of body.data) {
    assert.ok(item.total >= 0);
    assert.equal(Object.values(item.gender).reduce((sum, count) => sum + count, 0), item.total);
    assert.equal(Object.values(item.region).reduce((sum, count) => sum + count, 0), item.total);
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

test('hesap ayarları tokensız isteği reddeder', async () => {
  const response = await fetch(`${baseUrl}/account/profile`);
  assert.equal(response.status, 401);
});

test('etkinlik yönetimi tokensız isteği reddeder', async () => {
  const response = await fetch(`${baseUrl}/events`);
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
