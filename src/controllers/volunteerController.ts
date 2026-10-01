import { Router, Request } from 'express';
import prisma from '../db/prisma';
import { getVolunteerProfile, updateVolunteerProfile, VolunteerProfileUpdate } from '../db/volunteerProfileService';
import { authMiddleware, requireManager } from '../middleware/auth';
import { organizationContext, OrganizationRequest } from '../middleware/organization';
import { EDUCATION_INSTITUTION_PERIOD, educationInstitutionStats } from '../data/educationInstitutionStats';
import { syncEducationInstitutionStats } from '../services/educationStatsSync';
import { educationSyncResponseSchema, volunteerMapResponseSchema } from '../schemas/volunteerMap';
import { normalizeEducationLevel } from '../utils/education';

const router = Router();
router.use(organizationContext);

type StoredEducationStat = {
  city: string;
  studentCount: number;
  universities: number;
  middleSchools: number;
  highSchools: number;
  vocationalHighSchools: number;
  period: string;
  syncStatus: string;
  syncError: string | null;
  lastAttemptAt: Date | null;
  syncedAt: Date;
};
const educationStatReader = prisma.educationInstitutionStat as unknown as {
  findMany(args: { orderBy: { city: 'asc' } }): Promise<StoredEducationStat[]>;
};

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
  const rawEducation = String(req.query.education || '');
  const education = rawEducation ? normalizeEducationLevel(rawEducation) : '';
  const sortField = String(req.query.sortField || 'applicationDate');
  const sortColumn = sortField === 'fullName' ? 'name' : 'date';
  const sortDirection = String(req.query.sortDirection || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
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
    const searchParam = parameter(`${search}%`);
    const clauses = [`organization_id = ${parameter(req.organizationId!)}`, `(name ILIKE ${searchParam} OR education ILIKE ${searchParam} OR ${statusExpression} ILIKE ${searchParam})`];
    if (education) clauses.push(`education = ${parameter(education)}`);
    if (startDate) clauses.push(`created_at >= ${parameter(startDate)}`);
    if (endDate) clauses.push(`created_at <= ${parameter(endDate)}`);
    return clauses.join(' AND ');
  };
  const relevance = (statusExpression: string) => {
    if (!search) return '0';
    const prefixParam = parameter(`${search}%`);
    return `CASE
      WHEN name ILIKE ${prefixParam} THEN 0
      WHEN education ILIKE ${prefixParam} THEN 1
      WHEN ${statusExpression} ILIKE ${prefixParam} THEN 2
      ELSE 3
    END`;
  };

  const parts: string[] = [];
  if (includeVolunteers) {
    parts.push(`
      SELECT 'volunteer_' || id AS key, name, education, created_at AS date,
             'Aktif Gönüllü' AS status, ${relevance("'Aktif Gönüllü'")} AS relevance
      FROM volunteers
      WHERE ${conditions("'Aktif Gönüllü'")}`);
  }
  if (includeApplications) {
    let applicationConditions = conditions('status');
    if (status) applicationConditions += ` AND status = ${parameter(status)}`;
    parts.push(`
      SELECT 'application_' || id AS key, name, education, created_at AS date, status,
             ${relevance('status')} AS relevance
      FROM applications
      WHERE ${applicationConditions}`);
  }
  if (!parts.length) {
    return res.json({ volunteers: [], pagination: { total: 0, page, limit, totalPages: 0 } });
  }

  const union = parts.join(' UNION ALL ');
  const selectedOrder = sortColumn === 'name'
    ? `name ${sortDirection}, date ASC, education ASC, key ASC`
    : `date ${sortDirection}, name ASC, education ASC, key ASC`;
  const orderBy = search
    ? `relevance ASC, ${selectedOrder}`
    : selectedOrder;
  const rowsQuery = `SELECT key, name, education, date, status FROM (${union}) AS grouped ORDER BY ${orderBy} LIMIT ${parameter(limit)} OFFSET ${parameter(skip)}`;
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

router.get('/map', async (req: OrganizationRequest, res) => {
  const organizationId = req.organizationId!;
  const [cityGroups, participationRows, storedEducationStats] = await Promise.all([
    prisma.volunteer.groupBy({
      by: ['city'],
      where: { organizationId, city: { not: '' } },
      _count: { _all: true },
      orderBy: { city: 'asc' },
    }),
    prisma.$queryRaw<Array<{ city: string; eventCount: bigint }>>`
      SELECT v.city, COUNT(DISTINCT ep.event_id) AS "eventCount"
      FROM volunteers v
      LEFT JOIN event_participants ep ON ep.volunteer_id = v.id
      WHERE v.organization_id = ${organizationId} AND v.city <> ''
      GROUP BY v.city`,
    educationStatReader.findMany({ orderBy: { city: 'asc' } }),
  ]);

  const availableEducationStats = storedEducationStats.length === 81
    ? Object.fromEntries(storedEducationStats.map(item => [item.city, {
      studentCount: item.studentCount,
      universities: item.universities,
      middleSchools: item.middleSchools,
      highSchools: item.highSchools,
      vocationalHighSchools: item.vocationalHighSchools,
    }]))
    : Object.fromEntries(Object.entries(educationInstitutionStats).map(([city, values]) => [city, { ...values, studentCount: 0 }]));
  const educationInstitutionPeriod = storedEducationStats[0]?.period ?? EDUCATION_INSTITUTION_PERIOD;
  const educationStatsSyncedAt = storedEducationStats.length ? storedEducationStats.reduce(
    (latest, item) => item.syncedAt > latest ? item.syncedAt : latest,
    storedEducationStats[0].syncedAt,
  ) : null;
  const educationSyncStatus = storedEducationStats[0]?.syncStatus ?? 'not_started';
  const educationSyncError = storedEducationStats[0]?.syncError ?? null;
  const educationSyncLastAttemptAt = storedEducationStats[0]?.lastAttemptAt ?? null;

  const cities = Object.entries(availableEducationStats).map(([city, educationInstitutions]) => {
    const group = cityGroups.find(item => item.city === city);
    const eventCount = Number(participationRows.find(item => item.city === city)?.eventCount ?? 0);
    return {
      city,
      volunteerCount: group?._count._all ?? 0,
      studentCount: educationInstitutions.studentCount,
      monthlyAverageEvents: Number((eventCount / 12).toFixed(1)),
      educationInstitutions: {
        universities: educationInstitutions.universities,
        middleSchools: educationInstitutions.middleSchools,
        highSchools: educationInstitutions.highSchools,
        vocationalHighSchools: educationInstitutions.vocationalHighSchools,
      },
    };
  });
  const responsePayload = volunteerMapResponseSchema.parse({
    cities,
    educationInstitutionPeriod,
    educationStatsSyncedAt,
    educationSyncStatus,
    educationSyncError,
    educationSyncLastAttemptAt,
    totalVolunteers: cities.reduce((sum, city) => sum + city.volunteerCount, 0),
  });
  return res.json(responsePayload);
});

router.post('/map/sync', authMiddleware, requireManager, async (_req, res) => {
  try {
    await syncEducationInstitutionStats();
    return res.json(educationSyncResponseSchema.parse({ message: 'Eğitim istatistikleri güncellendi.' }));
  } catch (error) {
    return res.status(502).json({
      error: 'Resmî eğitim istatistikleri şu anda güncellenemedi.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
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
  const education = await prisma.volunteerEducation.create({ data: { volunteerId, level: normalizeEducationLevel(level), school, department, startYear, endYear: current ? null : endYear, current: Boolean(current) } });
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
  const created = await prisma.volunteer.create({ data: { organizationId: req.organizationId!, name, city, gender, age: Number(age), education: normalizeEducationLevel(education) } });
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
      ...(education !== undefined ? { education: normalizeEducationLevel(education) } : {}),
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
