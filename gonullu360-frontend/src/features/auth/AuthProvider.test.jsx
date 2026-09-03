import { describe, expect, test } from 'vitest';
import { isManager } from './AuthProvider';

describe('yönetici rol kontrolü', () => {
  test('Prisma ADMIN rolünü yönetici olarak kabul eder', () => {
    expect(isManager({ role: 'ADMIN' })).toBe(true);
  });

  test('gönüllü rolünü yönetici olarak kabul etmez', () => {
    expect(isManager({ role: 'VOLUNTEER' })).toBe(false);
  });
});
