const test = require('node:test');
const assert = require('node:assert/strict');

require('dotenv').config();
process.env.JWT_SECRET ||= 'test-jwt-secret-with-at-least-32-characters';
process.env.COOKIE_SECRET ||= 'test-cookie-secret-with-at-least-32-characters';
process.env.CSRF_SECRET ||= 'test-csrf-secret-with-at-least-32-characters';

const { generateCsrfToken, verifyCsrfToken } = require('../dist/security/csrf');
const { hashPassword, needsPasswordRehash, verifyPassword } = require('../dist/security/password');

test('Argon2id parolayı güvenli biçimde hashler ve doğrular', async () => {
  const hash = await hashPassword('StrongTest1!');
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(hash, 'StrongTest1!'), true);
  assert.equal(await verifyPassword(hash, 'wrong-password'), false);
  assert.equal(needsPasswordRehash(hash), false);
});

test('CSRF tokenı imzalıdır ve değiştirilmiş token reddedilir', () => {
  const token = generateCsrfToken();
  assert.equal(verifyCsrfToken(token), true);
  assert.equal(verifyCsrfToken(`${token}0`), false);
});
