const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const app = require('../dist/index').default;
const { config } = require('../dist/config');

const prisma = new PrismaClient();
let server;
let baseUrl;
let notificationId;

before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (notificationId) await prisma.notification.deleteMany({ where: { id: notificationId } });
  await prisma.$disconnect();
  await new Promise(resolve => server.close(resolve));
});

test('yöneticiler yalnızca kendi bildirimlerini görür ve günceller', async () => {
  const users = await prisma.user.findMany({ take: 2, orderBy: { id: 'asc' } });
  assert.equal(users.length, 2, 'Bildirim ayrımı testi için iki kullanıcı gereklidir');
  const [owner, other] = users;
  const notification = await prisma.notification.create({
    data: { organizationId: owner.organizationId, userId: owner.id, message: `Geçici test bildirimi ${Date.now()}` },
  });
  notificationId = notification.id;

  const tokenFor = user => jwt.sign(
    { id: user.id, email: user.email, role: 'ADMIN', organizationId: user.organizationId },
    config.jwtSecret,
    { expiresIn: '5m' },
  );
  const ownerHeaders = { authorization: `Bearer ${tokenFor(owner)}` };
  const otherHeaders = { authorization: `Bearer ${tokenFor(other)}` };

  const ownerResponse = await fetch(`${baseUrl}/notifications?page=1&limit=50`, { headers: ownerHeaders });
  const ownerBody = await ownerResponse.json();
  assert.equal(ownerResponse.status, 200);
  assert.ok(ownerBody.notifications.some(item => item.id === notification.id));
  assert.ok(ownerBody.pagination.total >= ownerBody.notifications.length);

  const otherResponse = await fetch(`${baseUrl}/notifications?page=1&limit=50`, { headers: otherHeaders });
  const otherBody = await otherResponse.json();
  assert.equal(otherResponse.status, 200);
  assert.equal(otherBody.notifications.some(item => item.id === notification.id), false);

  const forbiddenRead = await fetch(`${baseUrl}/notifications/${notification.id}/read`, { method: 'PUT', headers: otherHeaders });
  assert.equal(forbiddenRead.status, 404);

  const ownerRead = await fetch(`${baseUrl}/notifications/${notification.id}/read`, { method: 'PUT', headers: ownerHeaders });
  assert.equal(ownerRead.status, 200);
});
