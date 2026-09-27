import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';

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
  return res.json(serialize(event!));
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
  return res.json(serialize(event!));
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
