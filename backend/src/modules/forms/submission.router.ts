import express, { Router } from 'express';
import { z } from 'zod';
import { extname, basename } from 'node:path';
import { prisma } from '../../database/prisma';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { globalRateLimit } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../shared/asyncHandler';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import { sendSuccess } from '../../shared/response';
import { formDefinitionSchema } from './form.schema';

export const submissionRouter = Router();
const payloadSchema = z.object({
  version: z.number().int().positive(),
  answers: z.record(z.string().max(10000)),
  files: z.array(z.object({ fieldId: z.string(), name: z.string().min(1).max(255), base64: z.string().max(14_000_000) })).max(10).default([]),
});

submissionRouter.post('/:id/submissions', globalRateLimit, express.json({ limit: '15mb' }), asyncHandler(async (req, res) => {
  const input = payloadSchema.parse(req.body);
  const form = await prisma.form.findFirst({ where: { id: String(req.params.id), publishedVersion: { gt: 0 }, organization: { isActive: true } } });
  if (!form) throw new NotFoundError('Form bulunamadı');
  if (input.version !== form.publishedVersion) throw new ConflictError('Form güncellendi. Sayfayı yenileyin.');
  const version = await prisma.formVersion.findUniqueOrThrow({ where: { formId_version: { formId: form.id, version: input.version } } });
  const fields = formDefinitionSchema.parse(version.schema).sections.flatMap(section => section.fields);
  const ids = new Set(fields.map(field => field.id));
  if (Object.keys(input.answers).some(id => !ids.has(id)) || input.files.some(file => !ids.has(file.fieldId))) throw new ValidationError('Tanımsız form alanı');
  const files: Array<{ fieldId: string; originalName: string; content: Buffer }> = [];
  let total = 0;
  for (const field of fields) {
    const answer = input.answers[field.id]?.trim() || '';
    const attached = input.files.filter(file => file.fieldId === field.id);
    if (field.type === 'file') {
      if (attached.length > 1 || (field.required && attached.length !== 1)) throw new ValidationError(`${field.label}: dosya gerekli`);
      if (!attached.length) continue;
      const file = attached[0];
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) throw new ValidationError('Geçersiz dosya');
      const content = Buffer.from(file.base64, 'base64');
      total += content.length;
      const extension = extname(file.name).toLowerCase();
      const signatures: Record<string, boolean> = {
        '.pdf': content.subarray(0, 5).toString() === '%PDF-',
        '.doc': content.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1',
        '.docx': content.subarray(0, 4).toString('hex') === '504b0304',
        '.png': content.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
        '.jpg': content.subarray(0, 3).toString('hex') === 'ffd8ff',
        '.jpeg': content.subarray(0, 3).toString('hex') === 'ffd8ff',
      };
      if (!signatures[extension] || !field.fileSettings?.acceptedTypes.some(type => type === extension)) throw new ValidationError(`${field.label}: dosya türü desteklenmiyor`);
      if (!content.length || content.length > Math.min(field.fileSettings.maxSizeMb, 10) * 1024 * 1024 || total > 10 * 1024 * 1024) throw new ValidationError('Toplam dosya boyutu en fazla 10 MB olabilir');
      files.push({ fieldId: field.id, originalName: basename(file.name).replace(/[\r\n]/g, ''), content });
    } else {
      if (attached.length || (field.required && !answer)) throw new ValidationError(`${field.label}: cevap gerekli`);
      if (answer && field.type === 'email' && !z.string().email().safeParse(answer).success) throw new ValidationError('Geçersiz e-posta');
      if (answer && field.type === 'date' && !z.string().date().safeParse(answer).success) throw new ValidationError('Geçersiz tarih');
      if (answer && field.type === 'multiple_choice' && !field.options?.includes(answer)) throw new ValidationError('Geçersiz seçenek');
    }
  }
  const saved = await prisma.formSubmission.create({ data: { formId: form.id, formVersion: input.version, answers: input.answers, files: { create: files } }, select: { id: true } });
  sendSuccess(res, saved, 201);
}));

submissionRouter.get('/:id/submissions', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const formId = String(req.params.id);
  if (!await prisma.form.count({ where: { id: formId, orgId: req.user!.orgId } })) throw new NotFoundError('Form bulunamadı');
  const page = z.coerce.number().int().positive().max(100000).parse(req.query.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.formSubmission.findMany({ where: { formId }, orderBy: { submittedAt: 'desc' }, skip: (page - 1) * 20, take: 20, include: { files: { select: { id: true, fieldId: true, originalName: true } } } }),
    prisma.formSubmission.count({ where: { formId } }),
  ]);
  sendSuccess(res, { items, page, total, totalPages: Math.ceil(total / 20) });
}));

submissionRouter.get('/:id/submissions/:submissionId/files/:fileId', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const file = await prisma.formSubmissionFile.findFirst({ where: { id: String(req.params.fileId), submissionId: String(req.params.submissionId), submission: { formId: String(req.params.id), form: { orgId: req.user!.orgId } } } });
  if (!file) throw new NotFoundError('Dosya bulunamadı');
  res.setHeader('Cache-Control', 'no-store');
  res.attachment(file.originalName).type('application/octet-stream').send(file.content);
}));
