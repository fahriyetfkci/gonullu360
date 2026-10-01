import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

const eventId = (value: string | string[]) => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const defaultTasks = [
  'Gönüllü bilgilendirmesi gerçekleştirildi',
  'Etkinlik alanı düzenlendi',
  'Yeni gönüllüler gruba eklendi',
  'Etkinlik gerçekleştirildi',
  'Etkinlik raporu yazıldı',
];

const reportSchema = z.object({
  summary: z.string().max(10000),
  achievements: z.string().max(10000),
  issues: z.string().max(10000),
  managerEvaluation: z.string().max(10000),
});

const managedEventSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  type: z.enum(['IN_PERSON', 'ONLINE']),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(64).default('Europe/Istanbul'),
  address: z.string().trim().max(500).nullable().optional(),
  capacity: z.number().int().positive().max(1_000_000).nullable().optional(),
  contactInfo: z.string().trim().max(250).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  posterUrl: z.string().max(1000).nullable().optional(),
  posterStorageKey: z.string().max(1000).nullable().optional(),
  registrationFormId: z.union([z.string(), z.number()]).nullable().optional(),
  groupIds: z.array(z.string().min(1).max(128)).min(1).max(50),
}).superRefine((event, context) => {
  if (new Date(event.endsAt) <= new Date(event.startsAt)) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır' });
  if (event.type === 'IN_PERSON' && !event.address?.trim()) context.addIssue({ code: 'custom', path: ['address'], message: 'Fiziksel etkinliklerde adres zorunludur' });
  if (new Set(event.groupIds).size !== event.groupIds.length) context.addIssue({ code: 'custom', path: ['groupIds'], message: 'Aynı grup birden fazla seçilemez' });
});

const managedData = (data: z.infer<typeof managedEventSchema>) => {
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  return {
    name: data.name, slug: data.slug, type: data.type,
    date: startsAt, time: startsAt.toLocaleTimeString('en-GB', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit' }),
    endTime: endsAt.toLocaleTimeString('en-GB', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit' }),
    startsAt, endsAt, timezone: data.timezone, address: data.type === 'ONLINE' ? null : data.address || null,
    capacity: data.capacity ?? null, contactInfo: data.contactInfo || null, description: data.description || null,
    imageUrl: data.posterUrl || null, posterStorageKey: data.posterStorageKey || null,
    registrationFormId: data.registrationFormId ? Number(data.registrationFormId) : null,
  };
};

async function validateManagedReferences(organizationId: string, data: z.infer<typeof managedEventSchema>) {
  const groupCount = await prisma.eventGroup.count({ where: { organizationId, id: { in: data.groupIds } } });
  if (groupCount !== data.groupIds.length) throw new z.ZodError([{ code: 'custom', path: ['groupIds'], message: 'Seçilen gruplardan biri bu organizasyona ait değil' }]);
  if (data.registrationFormId) {
    const form = await prisma.form.findFirst({ where: { id: Number(data.registrationFormId), organizationId, status: 'published' } });
    if (!form) throw new z.ZodError([{ code: 'custom', path: ['registrationFormId'], message: 'Seçilen kayıt formu bulunamadı veya yayımlanmamış' }]);
  }
}

export async function options(req: AuthRequest, res: Response) {
  const [groups, forms] = await Promise.all([
    prisma.eventGroup.findMany({ where: { organizationId: req.user!.organizationId }, orderBy: { createdAt: 'asc' } }),
    prisma.form.findMany({ where: { organizationId: req.user!.organizationId, status: 'published' }, select: { id: true, title: true, currentVersion: true }, orderBy: { title: 'asc' } }),
  ]);
  return res.json({ data: { groups, forms: forms.map(form => ({ ...form, publishedVersion: form.currentVersion })) } });
}

export async function createGroup(req: AuthRequest, res: Response) {
  const data = z.object({ name: z.string().trim().min(2).max(80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).parse(req.body);
  const group = await prisma.eventGroup.create({ data: { ...data, organizationId: req.user!.organizationId } });
  return res.status(201).json({ data: group });
}

export async function list(req: AuthRequest, res: Response) {
  const query = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED', 'ARCHIVED']).optional(),
    groupId: z.string().min(1).max(128).optional(),
    search: z.string().trim().max(160).optional(),
  }).parse(req.query);
  const where = {
    organizationId: req.user!.organizationId,
    ...(query.status ? { status: query.status } : { status: { not: 'ARCHIVED' as const } }),
    ...(query.groupId ? { groups: { some: { groupId: query.groupId } } } : {}),
    ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { slug: { contains: query.search, mode: 'insensitive' as const } }] } : {}),
  };
  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: { _count: { select: { participants: true } }, groups: { include: { group: true } }, registrationForm: { select: { id: true, title: true, currentVersion: true } } },
      orderBy: [{ startsAt: 'asc' }, { date: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.event.count({ where }),
  ]);
  const items = events.map(event => {
    const { _count, groups, registrationForm, ...record } = event;
    return { ...record, participantCount: _count.participants, groups: groups.map(item => item.group), registrationForm: registrationForm ? { ...registrationForm, publishedVersion: registrationForm.currentVersion } : null };
  });
  return res.json({ data: { items, pagination: { page: query.page, limit: query.limit, total } } });
}

export async function create(req: AuthRequest, res: Response) {
  const data = managedEventSchema.parse(req.body);
  await validateManagedReferences(req.user!.organizationId, data);
  const event = await prisma.event.create({ data: { ...managedData(data), organizationId: req.user!.organizationId, createdById: req.user!.id, groups: { create: data.groupIds.map(groupId => ({ groupId })) } }, include: { groups: { include: { group: true } }, registrationForm: { select: { id: true, title: true, currentVersion: true } } } });
  const { groups, ...record } = event;
  return res.status(201).json({ data: { ...record, groups: groups.map(item => item.group) } });
}

export async function update(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz etkinlik numarası' });
  const data = managedEventSchema.parse(req.body);
  await validateManagedReferences(req.user!.organizationId, data);
  const owned = await prisma.event.count({ where: { id, organizationId: req.user!.organizationId } });
  if (!owned) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  const event = await prisma.$transaction(async transaction => {
    await transaction.eventGroupAssignment.deleteMany({ where: { eventId: id } });
    return transaction.event.update({ where: { id }, data: { ...managedData(data), groups: { create: data.groupIds.map(groupId => ({ groupId })) } }, include: { groups: { include: { group: true } } } });
  });
  const { groups, ...record } = event;
  return res.json({ data: { ...record, groups: groups.map(item => item.group) } });
}

export async function remove(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz etkinlik numarası' });
  const result = await prisma.event.updateMany({ where: { id, organizationId: req.user!.organizationId }, data: { status: 'ARCHIVED' } });
  if (!result.count) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  return res.json({ data: await prisma.event.findUnique({ where: { id } }) });
}

export async function uploadPoster(req: AuthRequest, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'Afiş dosyası zorunludur' });
  const signature = req.file.mimetype === 'image/png' ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] : [0xff, 0xd8, 0xff];
  if (!signature.every((byte, index) => req.file!.buffer[index] === byte)) {
    return res.status(400).json({ error: 'Yalnızca geçerli PNG veya JPEG afişleri yüklenebilir' });
  }
  const extension = req.file.mimetype === 'image/png' ? '.png' : '.jpg';
  const storedName = `${req.user!.organizationId}-${crypto.randomUUID()}${extension}`;
  const directory = path.resolve(process.cwd(), 'uploads', 'event-posters');
  const destination = path.resolve(directory, storedName);
  if (!destination.startsWith(`${directory}${path.sep}`)) return res.status(400).json({ error: 'Geçersiz afiş yolu' });
  await mkdir(directory, { recursive: true });
  await writeFile(destination, req.file.buffer, { flag: 'wx' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/event-posters/${storedName}`;
  return res.status(201).json({ data: { posterUrl: imageUrl, posterStorageKey: `event-posters/${storedName}` } });
}

async function findOwnedEvent(id: number, organizationId: string) {
  return prisma.event.findFirst({
    where: { id, organizationId },
    include: {
      tasks: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      participants: {
        where: { volunteer: { active: true } },
        orderBy: { id: 'desc' },
        include: { volunteer: { select: { id: true, name: true, createdAt: true, profile: { select: { volunteerCode: true } } } } },
      },
    },
  });
}

function serialize(event: NonNullable<Awaited<ReturnType<typeof findOwnedEvent>>>) {
  const applications = event.participants.map(item => ({
    id: item.id,
    volunteerId: item.volunteer.id,
    volunteerCode: item.volunteer.profile?.volunteerCode || `#${String(item.volunteer.id).padStart(5, '0')}`,
    name: item.volunteer.name,
    appliedAt: item.volunteer.createdAt,
  }));
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    time: event.time || '13:00',
    groupName: event.groupName || 'Genel',
    imageUrl: event.imageUrl,
    notes: event.notes || '',
    slug: event.slug,
    endTime: event.endTime,
    type: event.type,
    address: event.address,
    capacity: event.capacity,
    contactInfo: event.contactInfo,
    description: event.description,
    completed: event.completed,
    target: event.target,
    activeApplications: applications.length,
    firstApplications: applications.filter(item => item.appliedAt.getTime() === Math.min(...applications.map(row => row.appliedAt.getTime()))).length,
    applications,
    tasks: event.tasks,
  };
}

export async function latest(req: AuthRequest, res: Response) {
  const row = await prisma.event.findFirst({ where: { organizationId: req.user!.organizationId }, orderBy: [{ date: 'desc' }, { id: 'desc' }] });
  if (!row) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  let event = await findOwnedEvent(row.id, req.user!.organizationId);
  if (!event!.tasks.length) {
    await prisma.eventTask.createMany({ data: defaultTasks.map((title, position) => ({ eventId: row.id, title, position })) });
    event = await findOwnedEvent(row.id, req.user!.organizationId);
  }
  return res.json({ data: serialize(event!) });
}

export async function detail(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz etkinlik numarası' });
  let event = await findOwnedEvent(id, req.user!.organizationId);
  if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  if (!event.tasks.length) {
    await prisma.eventTask.createMany({ data: defaultTasks.map((title, position) => ({ eventId: id, title, position })) });
    event = await findOwnedEvent(id, req.user!.organizationId);
  }
  return res.json({ data: serialize(event!) });
}

export async function updateNotes(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz etkinlik numarası' });
  const { notes } = z.object({ notes: z.string().max(5000) }).parse(req.body);
  const result = await prisma.event.updateMany({ where: { id, organizationId: req.user!.organizationId }, data: { notes } });
  if (!result.count) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  return res.json({ notes });
}

export async function updateTask(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  const taskId = eventId(req.params.taskId);
  if (!id || !taskId) return res.status(400).json({ error: 'Geçersiz etkinlik veya görev numarası' });
  const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
  const task = await prisma.eventTask.findFirst({ where: { id: taskId, eventId: id, event: { organizationId: req.user!.organizationId } } });
  if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });
  return res.json(await prisma.eventTask.update({ where: { id: taskId }, data: { completed } }));
}

export async function getReport(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz etkinlik numarası' });
  const event = await prisma.event.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    select: {
      id: true, name: true, date: true, target: true, completed: true,
      _count: { select: { participants: true } }, report: true,
    },
  });
  if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  return res.json({
    event: { id: event.id, name: event.name, date: event.date, target: event.target, completed: event.completed, participantCount: event._count.participants },
    report: event.report || { summary: '', achievements: '', issues: '', managerEvaluation: '', updatedAt: null },
  });
}

export async function saveReport(req: AuthRequest, res: Response) {
  const id = eventId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Geçersiz etkinlik numarası' });
  const data = reportSchema.parse(req.body);
  const owned = await prisma.event.count({ where: { id, organizationId: req.user!.organizationId } });
  if (!owned) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  const report = await prisma.eventReport.upsert({ where: { eventId: id }, create: { eventId: id, ...data }, update: data });
  return res.json(report);
}
