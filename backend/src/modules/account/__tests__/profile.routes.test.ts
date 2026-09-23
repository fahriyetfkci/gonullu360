import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { profileRouter } from "../profile.router";
import { prisma } from "../../../database/prisma";
import { errorHandler } from "../../../middleware/errorHandler";
import { signAccessToken } from "../../../utils/token";

jest.mock("../../../database/prisma", () => ({ prisma: { user: { findFirst: jest.fn(), update: jest.fn() } } }));
const findUser = jest.mocked(prisma.user.findFirst);
const updateUser = jest.mocked(prisma.user.update);
const app = express();
app.use('/api/account', profileRouter);
app.use(errorHandler);
const input = { name: 'Test Kullanıcı', email: 'user@example.com', phone: '5551234567', jobTitle: 'Koordinatör', about: 'Hakkımda', address: 'İstanbul', website: 'https://example.com', photo: null };
const auth = (role: 'ADMIN' | 'VOLUNTEER' = 'VOLUNTEER'): string => `Bearer ${signAccessToken({ sub: 'self', orgId: 'org-1', role, email: input.email, sessionId: 'session-1' })}`;

beforeEach(() => {
  jest.resetAllMocks();
  findUser.mockResolvedValue({ id: 'self', orgId: 'org-1', ...input } as never);
  updateUser.mockResolvedValue({ id: 'self', orgId: 'org-1', ...input } as never);
});

test('requires authentication to read or update a profile', async () => {
  await request(app).get('/api/account/profile').expect(401);
  await request(app).put('/api/account/profile').send(input).expect(401);
  expect(findUser).not.toHaveBeenCalled();
});

test.each(['ADMIN', 'VOLUNTEER'] as const)('%s updates only the authenticated account', async role => {
  await request(app).put('/api/account/profile').set('Authorization', auth(role)).send(input).expect(200);
  expect(findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'self', orgId: 'org-1', isActive: true, organization: { isActive: true } } }));
  expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'self', orgId: 'org-1', isActive: true }, data: input }));
});

test.each([{ role: 'ADMIN' }, { id: 'another-user' }, { orgId: 'other-org' }, { website: 'javascript:alert(1)' }, { photo: 'data:image/svg+xml;base64,PHN2Zz4=' }, { photo: 'data:image/png;base64,aGVsbG8gd29ybGQ=' }])('rejects unsafe fields %j', async override => {
  await request(app).put('/api/account/profile').set('Authorization', auth()).send({ ...input, ...override }).expect(422);
  expect(updateUser).not.toHaveBeenCalled();
});

test('resets verification on email changes', async () => {
  await request(app).put('/api/account/profile').set('Authorization', auth()).send({ ...input, email: 'new@example.com' }).expect(200);
  expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'new@example.com', isVerified: false }) }));
});

test('returns a useful conflict for duplicate emails', async () => {
  updateUser.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0' }));
  await request(app).put('/api/account/profile').set('Authorization', auth()).send(input).expect(409);
});

test('does not update a missing or inactive account', async () => {
  findUser.mockResolvedValue(null);
  await request(app).put('/api/account/profile').set('Authorization', auth()).send(input).expect(404);
  expect(updateUser).not.toHaveBeenCalled();
});
