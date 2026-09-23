require('dotenv').config();
process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../dist-app/app');
const { prisma } = require('../dist-app/database/prisma');
const { redis } = require('../dist-app/database/redis');
const { hashPassword } = require('../dist-app/utils/password');

test('gerçek PostgreSQL/Redis: giriş, başvuru, profil, form, dosya, etkinlik ve organizasyon ayrımı', { timeout: 90000 }, async () => {
  const slug = `test-${randomUUID()}`;
  const ids = [];
  const app = createApp();
  const password = `Test!${randomUUID()}`;
  try {
    const passwordHash = await hashPassword(password);
    for (const suffix of ['', '-other']) {
      const org = await prisma.organization.create({ data: { name: 'Integration test', slug: slug + suffix } });
      ids.push(org.id);
      await prisma.user.create({ data: { orgId: org.id, email: 'integration@example.com', name: 'Test Yönetici', passwordHash, role: 'ADMIN', isVerified: true } });
    }
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ organizationSlug: slug, email: 'integration@example.com', password }).expect(200);
    const token = login.body.data.accessToken;
    const otherLogin = await request(app).post('/api/auth/login').send({ organizationSlug: slug + '-other', email: 'integration@example.com', password }).expect(200);
    const foreign = otherLogin.body.data.accessToken;
    const auth = { Authorization: `Bearer ${token}` }, other = { Authorization: `Bearer ${foreign}` };
    const me = await agent.get('/api/auth/me').set(auth).expect(200);
    assert.equal(me.body.data.orgId, ids[0]);
    // Account settings persist for every role and never accept a target user ID.
    const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
    const accountChanges = { name: 'Updated Account', email: 'updated@example.com', phone: '5551234567', jobTitle: 'Coordinator', about: 'About me', address: 'Istanbul', website: 'https://example.com', photo };
    await request(app).put('/api/account/profile').set(auth).send(accountChanges).expect(200);
    const account = await request(app).get('/api/account/profile').set(auth).expect(200);
    for (const [key, value] of Object.entries(accountChanges)) assert.equal(account.body.data[key], value);
    assert.equal(account.body.data.isVerified, false);
    assert.equal(account.body.data.passwordHash, undefined);
    const persisted = await prisma.user.findUniqueOrThrow({ where: { id: me.body.data.id } });
    assert.equal(persisted.about, accountChanges.about);
    assert.equal(persisted.photo, photo);
    const foreignAccount = await request(app).get('/api/account/profile').set(other).expect(200);
    assert.equal(foreignAccount.body.data.email, 'integration@example.com');
    await request(app).put('/api/account/profile').set(other).send({ ...accountChanges, id: me.body.data.id }).expect(422);
    const member = await prisma.user.create({ data: { orgId: ids[0], name: 'Member', email: 'member@example.com', passwordHash, role: 'VOLUNTEER', isVerified: true } });
    const memberLogin = await request(app).post('/api/auth/login').send({ organizationSlug: slug, email: member.email, password }).expect(200);
    const memberAuth = { Authorization: `Bearer ${memberLogin.body.data.accessToken}` };
    await request(app).put('/api/account/profile').set(memberAuth).send({ ...accountChanges, email: member.email, name: 'Updated Member' }).expect(200);
    await request(app).put('/api/account/profile').set(memberAuth).send(accountChanges).expect(409);
    const memberProfile = await request(app).get('/api/account/profile').set(memberAuth).expect(200);
    assert.equal(memberProfile.body.data.role, 'VOLUNTEER');
    assert.equal(memberProfile.body.data.name, 'Updated Member');
    await request(app).get('/api/volunteers').expect(401);
    await request(app).post('/api/applications').set(auth).send({ name: 'Invalid', age: -1 }).expect(422);
    await request(app).get('/api/volunteers?page=1.5').set(auth).expect(422);
    const person = { name: 'Test Gönüllü', city: 'İstanbul', gender: 'Kadın', age: 24, education: 'Üniversite', email: 'volunteer@example.com', interests: ['Eğitim'] };
    const created = await request(app).post('/api/applications').set(auth).send({ ...person, organizationId: ids[1] }).expect(201);
    const applicationId = created.body.data.id;
    await request(app).get(`/api/applications/${applicationId}`).set(other).expect(404);
    const grouped = await request(app).get('/api/volunteers/grouped').set(auth).expect(200);
    assert.equal(grouped.body.data.volunteers[0].key, `application_${applicationId}`);
    const accepted = await request(app).put(`/api/applications/${applicationId}/status`).set(auth).send({ status: 'Aktif Gönüllü' }).expect(200);
    const volunteerId = accepted.body.data.volunteerId;
    await request(app).put(`/api/applications/${applicationId}/status`).set(auth).send({ status: 'Aktif Gönüllü' }).expect(404);
    await request(app).put(`/api/volunteers/${volunteerId}/profile`).set(other).send({ managerNote: 'foreign' }).expect(404);
    await request(app).put(`/api/volunteers/${volunteerId}/profile`).set(auth).send({ managerNote: 'Kalıcı yönetici notu' }).expect(200);
    const profile = await request(app).get(`/api/volunteers/${volunteerId}/profile`).set(auth).expect(200);
    assert.equal(profile.body.data.managerNote, 'Kalıcı yönetici notu');
    assert.equal(profile.body.data.birthDate, null);
    const schema = { schemaVersion: 1, id: 'integration-form', title: 'Katılım Formu', description: '', sections: [{ id: 'section-1', title: '', fields: [
      { id: 'name', type: 'full_name', label: 'Ad Soyad', required: true },
      { id: 'cv', type: 'file', label: 'CV', required: true, fileSettings: { acceptedTypes: ['.pdf'], maxSizeMb: 10 } },
    ] }] };
    const draft = await request(app).put('/api/forms/draft').set(auth).send({ schema, expectedRevision: 0 }).expect(200);
    const formId = draft.body.data.formId;
    await request(app).put('/api/forms/draft').set(auth).send({ schema, expectedRevision: 0 }).expect(409);
    await request(app).post('/api/forms/publish').set(auth).send({ clientFormId: schema.id, expectedRevision: 1 }).expect(201);
    const published = await request(app).get('/api/forms/published').query({ organizationSlug: slug, clientFormId: schema.id }).expect(200);
    assert.equal(published.body.data.version, 1);
    await request(app).post(`/api/forms/${formId}/submissions`).send({ version: 1, answers: {} }).expect(422);
    const fileBytes = Buffer.from('%PDF-1.4\nIntegration fixture\n%%EOF');
    await request(app).post(`/api/forms/${formId}/submissions`).send({ version: 1, answers: { name: 'Katılımcı' }, files: [{ fieldId: 'cv', name: 'cv.pdf', base64: fileBytes.toString('base64') }] }).expect(201);
    await request(app).get(`/api/forms/${formId}/submissions`).set(other).expect(404);
    const responses = await request(app).get(`/api/forms/${formId}/submissions`).set(auth).expect(200);
    assert.equal(responses.body.data.total, 1);
    const response = responses.body.data.items[0];
    const downloadPath = `/api/forms/${formId}/submissions/${response.id}/files/${response.files[0].id}`;
    await request(app).get(downloadPath).set(other).expect(404);
    const download = await request(app).get(downloadPath).set(auth).expect(200);
    assert.deepEqual(download.body, fileBytes);
    const group = await request(app).post('/api/events/groups').set(auth).send({ name: 'Test Grubu', color: '#123456' }).expect(201);
    const event = await request(app).post('/api/events').set(auth).send({ name: 'Entegrasyon Etkinliği', slug: 'integration-event', type: 'ONLINE', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), groupIds: [group.body.data.id], registrationFormId: formId, capacity: 10 }).expect(201);
    await request(app).get(`/api/events/${event.body.data.id}`).set(other).expect(404);
    const events = await request(app).get('/api/events').set(auth).expect(200);
    assert.equal(events.body.data.items.length, 1);
    const stats = await request(app).get('/api/dashboard/stats').set(auth).expect(200);
    assert.equal(stats.body.data.activeVolunteers.total, 1);
    assert.equal(stats.body.data.completedEvents.target, 1);
    const range = await request(app).get('/api/dashboard/range').set(auth).expect(200);
    assert.equal(range.body.data.data.at(-1).total, 1);
    const otherStats = await request(app).get('/api/dashboard/stats').set(other).expect(200);
    assert.equal(otherStats.body.data.activeVolunteers.total, 0);
    const notification = await prisma.notification.create({ data: { organizationId: ids[0], userId: me.body.data.id, message: 'Test bildirimi' } });
    await request(app).put(`/api/notifications/${notification.id}/read`).set(other).expect(404);
    await request(app).put(`/api/notifications/${notification.id}/read`).set(auth).expect(200);
    const refreshed = await agent.post('/api/auth/refresh').expect(200);
    const csrfCookie = refreshed.headers['set-cookie'].find(cookie => cookie.startsWith('csrf_token='));
    const csrf = decodeURIComponent(csrfCookie.split(';')[0].slice('csrf_token='.length));
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf).expect(200);
    await agent.post('/api/auth/refresh').expect(401);
  } finally {
    for (const orgId of ids) {
      await prisma.notification.deleteMany({ where: { organizationId: orgId } });
      await prisma.application.deleteMany({ where: { organizationId: orgId } });
      await prisma.volunteer.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.delete({ where: { id: orgId } });
    }
    await prisma.$disconnect();
    await redis.quit();
  }
});
