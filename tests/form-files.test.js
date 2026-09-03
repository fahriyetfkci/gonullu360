const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../dist/index').default;
const { config } = require('../dist/config');

let server;
let baseUrl;
let formId;
let token;
const email = process.env.TEST_MANAGER_EMAIL;
const password = process.env.TEST_MANAGER_PASSWORD;
const enabled = Boolean(email && password);

before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (formId && token) {
    await fetch(`${baseUrl}/forms/${formId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  await new Promise(resolve => server.close(resolve));
});

test('form dosyası saklanır ve yalnızca yönetici tarafından indirilebilir', { skip: !enabled && 'Test yöneticisi tanımlı değil' }, async () => {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationSlug: 'gonullu360', email, password }),
  });
  const loginData = await login.json();
  ({ token } = loginData);
  assert.equal(login.status, 200);
  const managerHeaders = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const schema = {
    schemaVersion: 1,
    id: `file_test_${Date.now()}`,
    title: 'Dosya Test Formu',
    description: 'Dosya entegrasyon testi',
    sections: [{ id: 'section', title: 'Dosyalar', fields: [
      { id: 'name', type: 'full_name', label: 'Ad Soyad', required: true },
      { id: 'cv', type: 'file', label: 'CV', required: true, fileSettings: { acceptedTypes: ['.pdf'], maxSizeMb: 2 } },
    ] }],
  };
  const create = await fetch(`${baseUrl}/forms`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ schema }) });
  const created = await create.json();
  formId = created.id;
  assert.equal(create.status, 201);
  const publish = await fetch(`${baseUrl}/forms/${formId}/publish`, {
    method: 'POST', headers: managerHeaders, body: JSON.stringify({ expectedRevision: created.revision }),
  });
  assert.equal(publish.status, 200);

  const invalidPayload = new FormData();
  invalidPayload.append('answers', JSON.stringify({ name: 'Test Kullanıcısı' }));
  invalidPayload.append('cv', new Blob(['not allowed'], { type: 'text/plain' }), 'cv.txt');
  const invalidUpload = await fetch(`${baseUrl}/forms/${formId}/submissions`, { method: 'POST', body: invalidPayload });
  assert.equal(invalidUpload.status, 415);

  const payload = new FormData();
  payload.append('answers', JSON.stringify({ name: 'Test Kullanıcısı' }));
  payload.append('cv', new Blob(['test-pdf-content'], { type: 'application/pdf' }), 'test-cv.pdf');
  const upload = await fetch(`${baseUrl}/forms/${formId}/submissions`, { method: 'POST', body: payload });
  const submitted = await upload.json();
  assert.equal(upload.status, 201);
  assert.equal(submitted.fileCount, 1);

  const list = await fetch(`${baseUrl}/forms/${formId}/submissions`, { headers: managerHeaders });
  const listed = await list.json();
  assert.equal(list.status, 200);
  assert.equal(listed.submissions[0].files[0].originalName, 'test-cv.pdf');
  const downloadUrl = listed.submissions[0].files[0].downloadUrl;
  assert.equal((await fetch(`${baseUrl}${downloadUrl}`)).status, 401);
  const otherOrganizationToken = jwt.sign({ id: 'other-user', email: 'other@test.local', role: loginData.user.role, organizationId: 'other-organization' }, config.jwtSecret, { expiresIn: '5m' });
  const otherOrganizationDownload = await fetch(`${baseUrl}${downloadUrl}`, { headers: { authorization: `Bearer ${otherOrganizationToken}` } });
  assert.equal(otherOrganizationDownload.status, 404);
  const download = await fetch(`${baseUrl}${downloadUrl}`, { headers: managerHeaders });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'test-pdf-content');

  const remove = await fetch(`${baseUrl}/forms/${formId}`, { method: 'DELETE', headers: managerHeaders });
  assert.equal(remove.status, 200);
  formId = undefined;
});
