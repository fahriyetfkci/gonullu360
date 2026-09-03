import { Router, Request } from 'express';
import prisma from '../db/prisma';
import { getVolunteerProfile, updateVolunteerProfile, VolunteerProfileUpdate } from '../db/volunteerProfileService';
import { authMiddleware, requireManager } from '../middleware/auth';
import { organizationContext, OrganizationRequest } from '../middleware/organization';

const router = Router();
router.use(organizationContext);

function pageParams(req: Request, defaultLimit: number) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function volunteerDto(item: { id: number; name: string; city: string; gender: string; age: number; active: boolean; createdAt: Date }) {
  return { id: item.id, name: item.name, city: item.city, gender: item.gender, age: item.age, active: item.active ? 1 : 0, date: item.createdAt };
}

router.get('/grouped', async (req: OrganizationRequest, res) => {
  const { page, limit, skip } = pageParams(req, 50);
  const search = String(req.query.search || '');
  const status = String(req.query.status || '');
  const education = String(req.query.education || '');
  const startDate = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00Z`) : null;
  const endDate = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59Z`) : null;
  const includeVolunteers = !status || status === 'Aktif Gönüllü';
  const includeApplications = !status || status === 'İşlem Bekliyor' || status === 'Reddedildi';

  const values: unknown[] = [];
  const parameter = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const conditions = (statusExpression: string) => {
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
      WHERE ${conditions("'Aktif Gönüllü'")}`);
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
    return res.json({ volunteers: [], pagination: { total: 0, page, limit, totalPages: 0 } });
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
  return res.json({ volunteers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get('/', async (req: OrganizationRequest, res) => {
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
  return res.json({
    volunteers: items.map(volunteerDto),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    filterOptions: { cities: cityRows.map(item => item.city) },
  });
});

router.get('/:id/profile', async (req: OrganizationRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Geçersiz gönüllü numarası' });
  const profile = await getVolunteerProfile(id, req.organizationId!);
  if (!profile) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  return res.json(profile);
});

router.put('/:id/profile', authMiddleware, requireManager, async (req: OrganizationRequest, res) => {
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
  return res.json(profile);
});

router.get('/:id/educations', async (req: OrganizationRequest, res) => {
  const volunteerId = Number(req.params.id);
  if (!await prisma.volunteer.count({ where: { id: volunteerId, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  const educations = await prisma.volunteerEducation.findMany({ where: { volunteerId }, orderBy: [{ current: 'desc' }, { startYear: 'desc' }] });
  return res.json({ educations });
});

router.post('/:id/educations', authMiddleware, requireManager, async (req: OrganizationRequest, res) => {
  const volunteerId = Number(req.params.id);
  const { level, school, department = null, startYear = null, endYear = null, current = false } = req.body;
  if (!await prisma.volunteer.count({ where: { id: volunteerId, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  if (!level || !school) return res.status(400).json({ error: 'level ve school zorunludur' });
  const education = await prisma.volunteerEducation.create({ data: { volunteerId, level, school, department, startYear, endYear: current ? null : endYear, current: Boolean(current) } });
  return res.status(201).json(education);
});

router.delete('/:id/educations/:educationId', authMiddleware, requireManager, async (req: OrganizationRequest, res) => {
  if (!await prisma.volunteer.count({ where: { id: Number(req.params.id), organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  const deleted = await prisma.volunteerEducation.deleteMany({ where: { id: Number(req.params.educationId), volunteerId: Number(req.params.id) } });
  if (!deleted.count) return res.status(404).json({ error: 'Eğitim kaydı bulunamadı' });
  return res.json({ message: 'Eğitim kaydı silindi' });
});

router.get('/:id', async (req: OrganizationRequest, res) => {
  const item = await prisma.volunteer.findFirst({ where: { id: Number(req.params.id), organizationId: req.organizationId! } });
  if (!item) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  return res.json(volunteerDto(item));
});

router.post('/', authMiddleware, requireManager, async (req: OrganizationRequest, res) => {
  const { name, city, gender, age, education } = req.body;
  if (!name || !city || !gender || !age) return res.status(400).json({ error: 'Tüm alanlar zorunludur: name, city, gender, age' });
  const created = await prisma.volunteer.create({ data: { organizationId: req.organizationId!, name, city, gender, age: Number(age), education: education || 'Üniversite' } });
  return res.status(201).json(volunteerDto(created));
});

router.put('/:id', authMiddleware, requireManager, async (req: OrganizationRequest, res) => {
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
  return res.json(volunteerDto(updated));
});

router.delete('/:id', authMiddleware, requireManager, async (req: OrganizationRequest, res) => {
  const id = Number(req.params.id);
  if (!await prisma.volunteer.count({ where: { id, organizationId: req.organizationId! } })) return res.status(404).json({ error: 'Gönüllü bulunamadı' });
  await prisma.volunteer.delete({ where: { id } });
  return res.json({ message: 'Gönüllü silindi' });
});

export default router;
