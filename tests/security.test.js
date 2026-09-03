const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateMfaSecret, generateTotp, verifyTotp } = require('../dist/security/totp');

test('MFA TOTP kodu üretilir ve doğrulanır', () => {
  const secret = generateMfaSecret();
  const now = Date.now();
  const code = generateTotp(secret, now);
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyTotp(secret, code, now), true);
  assert.equal(verifyTotp(secret, '000000', now) && code !== '000000', false);
});
