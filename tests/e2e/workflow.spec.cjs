const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
require('../../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const argon2 = require('../../backend/node_modules/argon2');
const prisma = new PrismaClient();
const password = `Browser!${randomUUID()}`;
let organization;

test.beforeAll(async () => {
  organization = await prisma.organization.create({ data: { name: 'Tarayıcı testi', slug: process.env.E2E_ORGANIZATION_SLUG } });
  await prisma.user.create({ data: { orgId: organization.id, email: 'browser@example.com', name: 'Test Yönetici', role: 'ADMIN', isVerified: true, passwordHash: await argon2.hash(password) } });
  await prisma.eventGroup.create({ data: { orgId: organization.id, name: 'Genel', color: '#665cf6' } });
});
test.afterAll(async () => {
  if (organization) {
    await prisma.notification.deleteMany({ where: { organizationId: organization.id } });
    await prisma.application.deleteMany({ where: { organizationId: organization.id } });
    await prisma.volunteer.deleteMany({ where: { organizationId: organization.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
  }
  await prisma.$disconnect();
});

test('yönetici gerçek arayüzden başvuru, form ve etkinlik oluşturur', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('E-posta adresi').fill('browser@example.com');
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await expect(page.getByRole('button', { name: /Veri Girişi/ })).toBeVisible();
  await page.getByRole('button', { name: /Veri Girişi/ }).click();
  await page.getByLabel('Ad Soyad').fill('Tarayıcı Gönüllüsü');
  await page.getByLabel('Şehir').fill('İstanbul');
  await page.getByLabel('Cinsiyet').fill('Kadın');
  await page.getByLabel('Yaş', { exact: true }).fill('24');
  await page.getByLabel('Eğitim Düzeyi').fill('Üniversite');
  await page.getByRole('button', { name: 'Başvuruyu Kaydet' }).click();
  await expect(page.getByRole('heading', { name: 'Başvuru Detayı' })).toBeVisible();
  await page.getByRole('button', { name: 'Kabul Et', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tarayıcı Gönüllüsü' })).toBeVisible();
  const volunteerId = Number(page.url().split('/').at(-1));
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page.getByPlaceholder('Yönetici notunu yazın...').fill('Tarayıcıdan kaydedilen not');
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Tarayıcıdan kaydedilen not', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Form Yönetimi/ }).click();
  await page.getByLabel('FORM ADI', { exact: true }).fill('Tarayıcı Katılım Formu');
  await page.getByRole('button', { name: /Ad Soyad/ }).click();
  await page.getByRole('button', { name: /Kaydet ve Yayınla/ }).click();
  await page.getByRole('button', { name: /Yayındaki Form/ }).click();
  const href = await page.getByRole('link', { name: 'Formu aç' }).getAttribute('href');
  const publicPage = await context.newPage();
  await publicPage.goto(`http://localhost:3000/${href}`);
  await publicPage.getByLabel('Ad Soyad', { exact: true }).fill('Form Katılımcısı');
  await publicPage.getByRole('button', { name: 'Formu Gönder' }).click();
  await expect(publicPage.getByRole('alert')).toContainText('Formunuz kaydedildi');
  await publicPage.close();
  const form = await prisma.form.findFirstOrThrow({ where: { orgId: organization.id } });
  expect(await prisma.formSubmission.count({ where: { formId: form.id } })).toBe(1);
  await page.getByRole('button', { name: /Etkinlik Yönetimi/ }).click();
  await page.getByLabel('Etkinlik Adı *', { exact: true }).fill('Tarayıcı Etkinliği');
  await page.getByLabel('Etkinlik Adresi *').fill('İstanbul');
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('başarıyla kaydedildi');
  await page.getByLabel('Tarayıcı Etkinliği durumu').selectOption('COMPLETED');
  await page.getByLabel('Gönüllü numarası').fill(String(volunteerId));
  await page.getByRole('button', { name: 'Katılım Ekle' }).click();
  await expect.poll(() => prisma.eventParticipant.count({ where: { volunteerId } })).toBe(1);
  await page.reload();
  await expect(page.getByLabel('Tarayıcı Etkinliği durumu')).toHaveValue('COMPLETED');
  await page.screenshot({ path: 'test-results/integrated-events.png', fullPage: true });
  await page.getByRole('button', { name: /Çıkış$/, exact: false }).click();
  await expect(page.getByRole('button', { name: 'Giriş Yap', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
