import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { body, person, profile, education } from './community.schema';
import { Router, Request } from 'express';
import { prisma } from '../../database/prisma';
import { getVolunteerProfile, updateVolunteerProfile, VolunteerProfileUpdate } from './profile.service';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import { organizationContext, OrganizationRequest } from './organization';

const sendCreated = (res: import("express").Response, data: unknown): void => sendSuccess(res, data, 201);
const router = Router();
router.use(organizationContext);
router.use(validate(z.object({ query: z.object({
  page: z.coerce.number().int().positive().max(1000000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  startDate: z.string().date().or(z.literal('')).optional(),
  endDate: z.string().date().or(z.literal('')).optional(),
}).passthrough() })));
router.param('id', (_req, _res, next, value) => {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  if (!parsed.success) return next(parsed.error);
  next();
});

function pageParams(req: Request, defaultLimit: number): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function volunteerDto(item: { id: number; name: string; city: string; gender: string; age: number; active: boolean; createdAt: Date }): { id: number; name: string; city: string; gender: string; age: number; active: number; date: Date } {
  return { id: item.id, name: item.name, city: item.city, gender: item.gender, age: item.age, active: item.active ? 1 : 0, date: item.createdAt };
}

router.get('/grouped', asyncHandler(async (req: OrganizationRequest, res) => {
  const { page, limit, skip } = pageParams(req, 50);
  const search = String(req.query.search || '');
  const status = String(req.query.status || '');
  const education = String(req.query.education || '');
  const startDate = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00Z`) : null;
  const endDate = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59Z`) : null;
  const includeVolunteers = !status || status === 'Aktif Gönüllü';
  const includeApplications = !status || status === 'İşlem Bekliyor' || status === 'Reddedildi';

  const values: unknown[] = [];
  const parameter = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };
  const conditions = (statusExpression: string): string => {
    const searchParam = parameter(`%${search}%`);
    const clauses = [`organization_id = ${parameter(req.organizationId!)}`, `(name ILIKE ${searchParam} OR education ILIKE ${searchParam} OR ${statusExpression} ILIKE ${searchParam})`];
    if (education) clauses.push(`education = ${parameter(education)}`);
    if (startDate) clauses.push(`created_at >= ${parameter(startDate)}`);
    if (endDate) clauses.push(`created_at <= ${parameter(endDate)}`);
    return clauses.join(' AND ');
  };

  const parts: string[] = [];
  if (includeVolunteers) {
    parts.push(`
      SELECT 'volunteer_' || id AS key, name, education, created_at AS date,
             'Aktif Gönüllü' AS status
      FROM volunteers
      WHERE active = true AND ${conditions("'Aktif Gönüllü'")}`);
  }
  if (includeApplications) {
    let applicationConditions = conditions('status');
    if (status) applicationConditions += ` AND status = ${parameter(status)}`;
    parts.push(`
      SELECT 'application_' || id AS key, name, education, created_at AS date, status
      FROM applications
      WHERE ${applicationConditions}`);
  }
  if (!parts.length) {
    return sendSuccess(res, { volunteers: [], pagination: { total: 0, page, limit, totalPages: 0 } });
  }

  const union = parts.join(' UNION ALL ');
  const rowsQuery = `SELECT * FROM (${union}) AS grouped ORDER BY date DESC LIMIT ${parameter(limit)} OFFSET ${parameter(skip)}`;
  const volunteers = await prisma.$queryRawUnsafe<Array<{ key: string; name: string; education: string; date: Date; status: string }>>(rowsQuery, ...values);

  // LIMIT ve OFFSET parametreleri sayım sorgusuna ait değildir.
  const countValues = values.slice(0, -2);
  const count = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
    `SELECT COUNT(*) AS total FROM (${union}) AS grouped`,
    ...countValues,
  );
  const total = Number(count[0]?.total ?? 0);
  return sendSuccess(res, { volunteers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}));

router.get('/', asyncHandler(async (req: OrganizationRequest, res) => {
  const { page, limit, skip } = pageParams(req, 10);
  const search = String(req.query.search || '');
  const city = String(req.query.city || '');
  const gender = String(req.query.gender || '');
  const ageRange = String(req.query.ageRange || '');

  let age: { gte?: number; lte?: number } | undefined;
  if (ageRange === '17-25') age = { gte: 17, lte: 25 };
  if (ageRange === '26-35') age = { gte: 26, lte: 35 };
  if (ageRange === '36-45') age = { gte: 36, lte: 45 };
  if (ageRange === '46+') age = { gte: 46 };

  const where = {
    organizationId: req.organizationId!,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(city ? { city } : {}),
    ...(gender ? { gender } : {}),
    ...(age ? { age } : {}),
  };
  const [items, total, cityRows] = await Promise.all([
    prisma.volunteer.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
    prisma.volunteer.count({ where }),
    prisma.volunteer.findMany({ where: { organizationId: req.organizationId!, city: { not: '' } }, distinct: ['city'], select: { city: true }, orderBy: { city: 'asc' } }),
  ]);
  return sendSuccess(res, {
    volunteers: items.map(volunteerDto),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    filterOptions: { cities: cityRows.map(item => item.city) },
  });
}));

router.get('/:id/profile', asyncHandler(async (req: OrganizationRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Geçersiz gönüllü numarası' });
  const profile = await getVolunteerProfile(id, req.organizationId!);
  if (!profile) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  return sendSuccess(res, profile);
}));

router.put('/:id/profile', validate(body(profile)), asyncHandler(async (req: OrganizationRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Geçersiz gönüllü numarası' });
  const fields: (keyof VolunteerProfileUpdate)[] = ['birthDate', 'department', 'phone', 'email', 'address', 'photoUrl', 'managerNote', 'coverLetter', 'interests'];
  const input = Object.fromEntries(
    fields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field)).map(field => [field, req.body[field]]),
  ) as VolunteerProfileUpdate;
  if (input.interests !== undefined && (!Array.isArray(input.interests) || input.interests.some(item => typeof item !== 'string'))) {
    return res.status(400).json({ error: 'interests bir metin dizisi olmalıdır' });
  }
  const profile = await updateVolunteerProfile(id, req.organizationId!, input, req.user?.id);
  if (!profile) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  return sendSuccess(res, profile);
}));

router.get('/:id/educations', asyncHandler(async (req: OrganizationRequest, res) => {
  const volunteerId = Number(req.params.id);
  if (!await prisma.volunteer.count({ where: { id: volunteerId, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  const educations = await prisma.volunteerEducation.findMany({ where: { volunteerId }, orderBy: [{ current: 'desc' }, { startYear: 'desc' }] });
  return sendSuccess(res, { educations });
}));

router.post('/:id/educations', validate(body(education)), asyncHandler(async (req: OrganizationRequest, res) => {
  const volunteerId = Number(req.params.id);
  const { level, school, department = null, startYear = null, endYear = null, current = false } = req.body;
  if (!await prisma.volunteer.count({ where: { id: volunteerId, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  if (!level || !school) return res.status(400).json({ error: 'level ve school zorunludur' });
  const education = await prisma.volunteerEducation.create({ data: { volunteerId, level, school, department, startYear, endYear: current ? null : endYear, current: Boolean(current) } });
  return sendCreated(res, education);
}));

router.delete('/:id/educations/:educationId', asyncHandler(async (req: OrganizationRequest, res) => {
  if (!await prisma.volunteer.count({ where: { id: Number(req.params.id), organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  const deleted = await prisma.volunteerEducation.deleteMany({ where: { id: Number(req.params.educationId), volunteerId: Number(req.params.id) } });
  if (!deleted.count) return res.status(404).json({ error: 'Eğitim kaydı bulunamadı' });
  return sendSuccess(res, { message: 'Eğitim kaydı silindi' });
}));

router.get('/:id', asyncHandler(async (req: OrganizationRequest, res) => {
  const item = await prisma.volunteer.findFirst({ where: { id: Number(req.params.id), organizationId: req.organizationId! } });
  if (!item) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  return sendSuccess(res, volunteerDto(item));
}));

router.post('/', validate(body(person)), asyncHandler(async (req: OrganizationRequest, res) => {
  const { name, city, gender, age, education } = req.body;
  if (!name || !city || !gender || !age) return res.status(400).json({ error: 'Tüm alanlar zorunludur: name, city, gender, age' });
  const created = await prisma.volunteer.create({ data: { organizationId: req.organizationId!, name, city, gender, age: Number(age), education: education || 'Üniversite' } });
  return sendCreated(res, volunteerDto(created));
}));

router.put('/:id', validate(body(person.partial().extend({ active: z.boolean().optional() }))), asyncHandler(async (req: OrganizationRequest, res) => {
  const id = Number(req.params.id);
  if (!await prisma.volunteer.count({ where: { id, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  const { name, city, gender, age, active, education } = req.body;
  const updated = await prisma.volunteer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(age !== undefined ? { age: Number(age) } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
      ...(education !== undefined ? { education } : {}),
    },
  });
  return sendSuccess(res, volunteerDto(updated));
}));

router.delete('/:id', asyncHandler(async (req: OrganizationRequest, res) => {
  const id = Number(req.params.id);
  if (!await prisma.volunteer.count({ where: { id, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  await prisma.volunteer.delete({ where: { id } });
  return sendSuccess(res, { message: 'Gönüllü silindi' });
}));

export default router;
